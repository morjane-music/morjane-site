const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function getBearerToken(header) {
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : "";
}

function cleanChoice(value, allowed, fallback = "") {
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

exports.handler = async (event) => {
  const startedAt = Date.now();
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { ok: false, error: "missing_env" });
  }

  const token = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!token) {
    return json(401, { ok: false, error: "missing_token" });
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const userResult = await authClient.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return json(401, { ok: false, error: "invalid_token" });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    payload = {};
  }

  const allowedSources = ["site", "concert", "instagram", "email", "invitation", "bouche_a_oreille", "autre"];
  const allowedAccessSources = ["site", "qr", "concert", "instagram", "email", "invitation", "bouche_a_oreille", "direct", "autre"];
  const allowedSegments = ["public", "proche", "artiste", "pro"];
  const source = cleanChoice(payload.source, allowedSources, "site");
  const accessSource = cleanChoice(payload.access_source, allowedAccessSources, "direct");
  const accessWave = cleanWave(payload.access_wave) || "direct";
  const audienceSegment = cleanChoice(payload.audience_segment, allowedSegments, "");

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const user = userResult.data.user;
  const existing = await supabase
    .from("atelier_profiles")
    .select("id, email, member_status, audience_segment, source, access_source, access_wave")
    .eq("id", user.id)
    .maybeSingle();

  if (existing.error) {
    await trackFunctionEvent(supabase, {
      function_name: "record-atelier-entry",
      status: "error",
      error_code: "profile_lookup_failed",
      latency_ms: Date.now() - startedAt,
    });
    return json(500, { ok: false, error: "profile_lookup_failed" });
  }

  const current = existing.data || {};
  const hasKnownOrigin = Boolean(current.source || current.access_source || current.access_wave);
  const update = {
    id: user.id,
    email: current.email || user.email || null,
  };

  if (!hasKnownOrigin && !current.source) {
    update.source = source;
  }
  if (!hasKnownOrigin && !current.access_source) {
    update.access_source = accessSource;
  }
  if (!hasKnownOrigin && !current.access_wave) {
    update.access_wave = accessWave;
  }
  if (!current.audience_segment && audienceSegment) {
    update.audience_segment = audienceSegment;
  }

  const saved = await supabase
    .from("atelier_profiles")
    .upsert(update, { onConflict: "id" })
    .select("id")
    .maybeSingle();

  if (saved.error) {
    await trackFunctionEvent(supabase, {
      function_name: "record-atelier-entry",
      status: "error",
      error_code: "profile_upsert_failed",
      latency_ms: Date.now() - startedAt,
      meta: { message: saved.error.message || null },
    });
    return json(500, { ok: false, error: "profile_upsert_failed" });
  }

  await trackFunctionEvent(supabase, {
    function_name: "record-atelier-entry",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { source, access_source: accessSource, access_wave: accessWave, audience_segment: audienceSegment || null },
  });

  return json(200, { ok: true });
};
