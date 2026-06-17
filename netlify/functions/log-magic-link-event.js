const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

async function sendAccessRequestEmail(email) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const to = process.env.ATELIER_ADMIN_EMAIL || "";
  if (!apiKey || !to || !email) {
    return false;
  }

  const from = process.env.ATELIER_DIGEST_FROM_EMAIL || "Atelier Morjane <atelier@morjane.re>";
  const atelierUrl = "https://morjane.re/atelier/";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Nouvelle demande Atelier Morjane",
      text: [
        "Nouvelle demande d'acces a l'Atelier Morjane.",
        "",
        `Email : ${email}`,
        `Admin : ${atelierUrl}`,
      ].join("\n"),
      html: `<p>Nouvelle demande d'acces a l'Atelier Morjane.</p><p><strong>${email}</strong></p><p><a href="${atelierUrl}">Ouvrir l'Atelier</a></p>`,
    }),
  });

  return res.ok;
}

exports.handler = async (event) => {
  const startedAt = Date.now();
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_env" }),
    };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    payload = {};
  }

  const result = payload.result === "sent" ? "sent" : "error";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
  const errorCode = typeof payload.error_code === "string" ? payload.error_code.slice(0, 120) : null;

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const insert = await supabase.from("atelier_magic_link_events").insert({
    email: email || null,
    result,
    error_code: errorCode,
  });

  if (insert.error) {
    await trackFunctionEvent(supabase, {
      function_name: "log-magic-link-event",
      status: "error",
      error_code: "insert_failed",
      latency_ms: Date.now() - startedAt,
      meta: { result },
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "insert_failed" }),
    };
  }

  let notified = false;
  if (result === "sent") {
    const existingProfile = email
      ? await supabase
          .from("atelier_profiles")
          .select("member_status")
          .eq("email", email)
          .maybeSingle()
      : { data: null, error: null };
    const alreadyInside = ["member", "priority", "founder"].includes(existingProfile.data?.member_status);
    if (!alreadyInside) {
      notified = await sendAccessRequestEmail(email);
    }
  }

  await trackFunctionEvent(supabase, {
    function_name: "log-magic-link-event",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { result, notified },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: true }),
  };
};
