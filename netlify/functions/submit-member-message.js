const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

const MAX_MESSAGE_LENGTH = 1200;
const MIN_MESSAGE_SECONDS = 45;
const ALLOWED_TAGS = new Set([
  "emotion",
  "text",
  "melody",
  "arrangement",
  "scene",
  "replay",
  "share",
  "weak",
  "doubt",
]);

function getBearerToken(header) {
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return "";
  return token;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
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

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    payload = {};
  }

  const trackId = typeof payload.trackId === "string" ? payload.trackId : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";
  const tag = ALLOWED_TAGS.has(payload.tag) ? payload.tag : "emotion";
  if (!trackId || content.length < 2 || content.length > MAX_MESSAGE_LENGTH) {
    return json(400, { ok: false, error: "invalid_message", maxLength: MAX_MESSAGE_LENGTH });
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const userResult = await authClient.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return json(401, { ok: false, error: "invalid_token" });
  }

  const userId = userResult.data.user.id;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const profileRes = await supabase
    .from("atelier_profiles")
    .select("member_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileRes.error || !profileRes.data || !["member", "founder"].includes(profileRes.data.member_status)) {
    await trackFunctionEvent(supabase, {
      function_name: "submit-member-message",
      status: "error",
      error_code: "forbidden",
      latency_ms: Date.now() - startedAt,
      meta: { track_id: trackId },
    });
    return json(403, { ok: false, error: "forbidden" });
  }

  const trackRes = await supabase
    .from("atelier_tracks")
    .select("id, status")
    .eq("id", trackId)
    .maybeSingle();

  if (trackRes.error || !trackRes.data || trackRes.data.status !== "active") {
    return json(404, { ok: false, error: "track_not_found" });
  }

  const recentRes = await supabase
    .from("atelier_messages")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - MIN_MESSAGE_SECONDS * 1000).toISOString())
    .limit(1);

  if (recentRes.error) {
    return json(500, { ok: false, error: "query_failed" });
  }
  if ((recentRes.data || []).length > 0) {
    return json(429, { ok: false, error: "rate_limited", retrySeconds: MIN_MESSAGE_SECONDS });
  }

  let insertRes = await supabase.from("atelier_messages").insert({
    track_id: trackId,
    user_id: userId,
    content,
    feedback_tags: [tag],
  });

  if (insertRes.error && String(insertRes.error.message || "").includes("feedback_tags")) {
    insertRes = await supabase.from("atelier_messages").insert({
      track_id: trackId,
      user_id: userId,
      content,
    });
  }

  if (insertRes.error) {
    await trackFunctionEvent(supabase, {
      function_name: "submit-member-message",
      status: "error",
      error_code: "insert_failed",
      latency_ms: Date.now() - startedAt,
      meta: { track_id: trackId },
    });
    return json(500, { ok: false, error: "insert_failed" });
  }

  await trackFunctionEvent(supabase, {
    function_name: "submit-member-message",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { track_id: trackId, tag },
  });

  return json(200, { ok: true });
};
