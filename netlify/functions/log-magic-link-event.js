const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanChoice(value, allowed, fallback = null) {
  const text = String(value || "").trim().toLowerCase();
  return allowed.includes(text) ? text : fallback;
}

function cleanWave(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
}

function getProfileSource(entry) {
  const source = cleanChoice(entry.source, ["site", "concert", "instagram", "email", "invitation", "bouche_a_oreille", "autre"], "");
  if (source) {
    return source;
  }
  return cleanChoice(entry.door, ["concert", "instagram", "invitation"], "site");
}

function getAccessSource(entry) {
  return cleanChoice(entry.source, ["site", "qr", "concert", "instagram", "email", "invitation", "bouche_a_oreille", "direct", "autre"], "direct");
}

function getAudienceSegment(entry) {
  return cleanChoice(entry.segment, ["public", "proche", "artiste", "pro"], null);
}

async function findAuthUserByEmail(supabase, email) {
  if (!email) {
    return null;
  }
  for (let page = 1; page <= 5; page += 1) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) {
      return null;
    }
    const found = (result.data?.users || []).find((user) => String(user.email || "").toLowerCase() === email);
    if (found || (result.data?.users || []).length < 1000) {
      return found || null;
    }
  }
  return null;
}

async function preparePendingProfile(supabase, email, entry) {
  const user = await findAuthUserByEmail(supabase, email);
  if (!user?.id) {
    return { ok: false, reason: "auth_user_not_found" };
  }

  const payload = {
    id: user.id,
    email,
    role: "member",
    member_status: "pending",
    audience_status: "new",
    source: getProfileSource(entry),
    access_source: getAccessSource(entry),
    access_wave: cleanWave(entry.door) || "direct",
  };

  const segment = getAudienceSegment(entry);
  if (segment) {
    payload.audience_segment = segment;
  }

  const existing = await supabase
    .from("atelier_profiles")
    .select("id, role, member_status, audience_status, audience_segment, source, access_source, access_wave")
    .eq("id", user.id)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, reason: "profile_lookup_failed", error: existing.error.message || "" };
  }

  const current = existing.data || {};
  const upsertPayload = {
    id: payload.id,
    email: payload.email,
    role: current.role || payload.role,
    member_status: current.member_status || payload.member_status,
    audience_status: current.audience_status || payload.audience_status,
    audience_segment: current.audience_segment || payload.audience_segment || null,
    source: current.source || payload.source,
    access_source: current.access_source || payload.access_source,
    access_wave: current.access_wave || payload.access_wave,
  };

  const saved = await supabase
    .from("atelier_profiles")
    .upsert(upsertPayload, { onConflict: "id" })
    .select("id, member_status")
    .maybeSingle();

  if (saved.error) {
    return { ok: false, reason: "profile_upsert_failed", error: saved.error.message || "" };
  }

  return { ok: true, profile: saved.data };
}
async function sendAccessRequestEmail(email, entry = {}) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const to = process.env.ATELIER_ADMIN_EMAIL || "";
  if (!apiKey || !to || !email) {
    return false;
  }

  const from = process.env.ATELIER_FROM_EMAIL
    || process.env.ATELIER_DIGEST_FROM_EMAIL
    || process.env.RESEND_FROM_EMAIL
    || "Atelier Morjane <atelier@morjane.re>";
  const atelierUrl = "https://morjane.re/atelier/";
  const entryText = [entry.source, entry.door].filter(Boolean).join(" / ");
  const safeEntryText = escapeHtml(entryText);
  const safeEmail = escapeHtml(email);
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
        entryText ? `Entree : ${entryText}` : "",
        `Admin : ${atelierUrl}`,
      ].filter(Boolean).join("\n"),
      html: `<p>Nouvelle demande d'acces a l'Atelier Morjane.</p><p><strong>${safeEmail}</strong></p>${safeEntryText ? `<p>Entree : ${safeEntryText}</p>` : ""}<p><a href="${atelierUrl}">Ouvrir l'Atelier</a></p>`,
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
  const rawEntry = payload.entry && typeof payload.entry === "object" ? payload.entry : {};
  const entry = {
    source: typeof rawEntry.source === "string" ? rawEntry.source.slice(0, 40) : null,
    door: typeof rawEntry.door === "string" ? rawEntry.door.slice(0, 40) : null,
    segment: typeof rawEntry.segment === "string" ? rawEntry.segment.slice(0, 40) : null,
  };

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
  let profilePrepared = false;
  let profilePrepareError = null;
  if (result === "sent") {
    const prepared = email
      ? await preparePendingProfile(supabase, email, entry)
      : { ok: false, reason: "missing_email" };
    profilePrepared = Boolean(prepared.ok);
    profilePrepareError = prepared.ok ? null : prepared.reason;

    const existingProfile = email
      ? await supabase
          .from("atelier_profiles")
          .select("member_status")
          .eq("email", email)
          .maybeSingle()
      : { data: null, error: null };
    const alreadyInside = ["member", "priority", "founder"].includes(existingProfile.data?.member_status);
    if (!alreadyInside) {
      notified = await sendAccessRequestEmail(email, entry);
    }
  }

  await trackFunctionEvent(supabase, {
    function_name: "log-magic-link-event",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: {
      result,
      notified,
      profile_prepared: profilePrepared,
      profile_prepare_error: profilePrepareError,
      entry_source: entry.source,
      entry_door: entry.door,
      entry_segment: entry.segment,
    },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: true }),
  };
};
