const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");
const { canAccessTrack } = require("./_lib/atelier-access");

function getBearerToken(authHeader) {
  if (!authHeader) return "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return "";
  return token;
}

function hasMissingAccessColumns(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return text.includes("allowed_audience_segments") || text.includes("allowed_member_statuses");
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

  let trackId = null;
  try {
    const parsed = JSON.parse(event.body || "{}");
    trackId = parsed.trackId;
  } catch (_) {
    trackId = null;
  }

  if (!trackId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_track_id" }),
    };
  }

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

  const { data: profile } = await adminClient
    .from("atelier_profiles")
    .select("member_status, audience_segment")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !["member", "founder", "priority"].includes(profile.member_status)) {
    await trackFunctionEvent(adminClient, {
      function_name: "log-track-play",
      status: "error",
      error_code: "forbidden",
      latency_ms: Date.now() - startedAt,
      meta: { track_id: trackId },
    });
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "forbidden" }),
    };
  }

  let trackRes = await adminClient
    .from("atelier_tracks")
    .select("id, status, allowed_audience_segments, allowed_member_statuses, atelier_seasons(id, slug, title, status)")
    .eq("id", trackId)
    .maybeSingle();

  if (trackRes.error && hasMissingAccessColumns(trackRes.error)) {
    trackRes = await adminClient
      .from("atelier_tracks")
      .select("id, status, atelier_seasons(id, slug, title, status)")
      .eq("id", trackId)
      .maybeSingle();
  }

  if (trackRes.error || !trackRes.data || !canAccessTrack(profile, trackRes.data)) {
    await trackFunctionEvent(adminClient, {
      function_name: "log-track-play",
      status: "error",
      error_code: "track_not_found",
      latency_ms: Date.now() - startedAt,
      meta: { track_id: trackId },
    });
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "track_not_found" }),
    };
  }

  const recent = await adminClient
    .from("atelier_track_plays")
    .select("id, created_at")
    .eq("track_id", trackId)
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (recent.error) {
    await trackFunctionEvent(adminClient, {
      function_name: "log-track-play",
      status: "error",
      error_code: "query_failed",
      latency_ms: Date.now() - startedAt,
      meta: { track_id: trackId },
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "query_failed" }),
    };
  }

  if ((recent.data || []).length > 0) {
    await trackFunctionEvent(adminClient, {
      function_name: "log-track-play",
      status: "ok",
      latency_ms: Date.now() - startedAt,
      meta: { track_id: trackId, dedup: true },
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, counted: false, dedup_minutes: 30 }),
    };
  }

  const insertResult = await adminClient.from("atelier_track_plays").insert({
    track_id: trackId,
    user_id: userId,
  });

  if (insertResult.error) {
    await trackFunctionEvent(adminClient, {
      function_name: "log-track-play",
      status: "error",
      error_code: "insert_failed",
      latency_ms: Date.now() - startedAt,
      meta: { track_id: trackId },
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "insert_failed" }),
    };
  }

  await trackFunctionEvent(adminClient, {
    function_name: "log-track-play",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { track_id: trackId, counted: true },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: true, counted: true }),
  };
};
