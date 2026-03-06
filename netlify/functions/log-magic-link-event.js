const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

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

  await trackFunctionEvent(supabase, {
    function_name: "log-magic-link-event",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { result },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: true }),
  };
};

