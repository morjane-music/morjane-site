const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");
const { canAccessTrack } = require("./_lib/atelier-access");

function getBearerToken(header) {
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return "";
  return token;
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
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_env" }),
    };
  }

  const accessToken = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!accessToken) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_token" }),
    };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    payload = {};
  }

  const isListening = Boolean(payload.isListening);
  const trackId = payload.trackId || null;

  const authClient = createClient(supabaseUrl, anonKey);
  const userResult = await authClient.auth.getUser(accessToken);
  if (userResult.error || !userResult.data.user) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "invalid_token" }),
    };
  }

  const userId = userResult.data.user.id;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const profileRes = await adminClient
    .from("atelier_profiles")
    .select("member_status, audience_segment")
    .eq("id", userId)
    .maybeSingle();

  if (profileRes.error || !profileRes.data || !["member", "founder", "priority"].includes(profileRes.data.member_status)) {
    await trackFunctionEvent(adminClient, {
      function_name: "presence-heartbeat",
      status: "error",
      error_code: "forbidden",
      latency_ms: Date.now() - startedAt,
      meta: {},
    });
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "forbidden" }),
    };
  }

  if (isListening && trackId) {
    const trackRes = await adminClient
      .from("atelier_tracks")
      .select("id, status, allowed_audience_segments, allowed_member_statuses, atelier_seasons(id, slug, title, status)")
      .eq("id", trackId)
      .maybeSingle();
    if (trackRes.error || !trackRes.data || !canAccessTrack(profileRes.data, trackRes.data)) {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "forbidden" }),
      };
    }
  }

  const upsertPayload = {
    user_id: userId,
    track_id: isListening ? trackId : null,
    is_listening: isListening,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const write = await adminClient
    .from("atelier_presence")
    .upsert(upsertPayload, { onConflict: "user_id" });

  if (write.error) {
    await trackFunctionEvent(adminClient, {
      function_name: "presence-heartbeat",
      status: "error",
      error_code: "upsert_failed",
      latency_ms: Date.now() - startedAt,
      meta: { isListening: isListening ? 1 : 0 },
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "upsert_failed" }),
    };
  }

  await trackFunctionEvent(adminClient, {
    function_name: "presence-heartbeat",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { isListening: isListening ? 1 : 0 },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: true }),
  };
};
