const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");
const { canAccessTrack } = require("./_lib/atelier-access");

function getBearerToken(header) {
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : "";
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function cleanTrackIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .map((item) => String(item || "").trim())
    .filter((item) => /^[0-9a-f-]{32,36}$/i.test(item))))
    .slice(0, 80);
}

function countByTrack(rows = []) {
  const counts = new Map();
  rows.forEach((row) => {
    if (!row.track_id) return;
    counts.set(row.track_id, Number(counts.get(row.track_id) || 0) + 1);
  });
  return counts;
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
  const requestedTrackIds = cleanTrackIds(payload.trackIds);
  if (!requestedTrackIds.length) {
    return json(200, { ok: true, counts: {} });
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const userResult = await authClient.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return json(401, { ok: false, error: "invalid_token" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const userId = userResult.data.user.id;
  const profileRes = await supabase
    .from("atelier_profiles")
    .select("role, member_status, audience_segment")
    .eq("id", userId)
    .maybeSingle();

  if (profileRes.error || !profileRes.data) {
    return json(403, { ok: false, error: "forbidden" });
  }

  const tracksRes = await supabase
    .from("atelier_tracks")
    .select("id, status, allowed_audience_segments, allowed_member_statuses, atelier_seasons(id, slug, title, status)")
    .in("id", requestedTrackIds);

  if (tracksRes.error) {
    await trackFunctionEvent(supabase, {
      function_name: "get-track-counts",
      status: "error",
      error_code: "tracks_query_failed",
      latency_ms: Date.now() - startedAt,
      meta: { user_id: userId },
    });
    return json(500, { ok: false, error: "query_failed" });
  }

  const allowedTrackIds = (tracksRes.data || [])
    .filter((track) => canAccessTrack(profileRes.data, track))
    .map((track) => track.id);

  if (!allowedTrackIds.length) {
    return json(200, { ok: true, counts: {} });
  }

  const [playsRes, likesRes] = await Promise.all([
    supabase.from("atelier_track_plays").select("track_id").in("track_id", allowedTrackIds),
    supabase.from("atelier_track_likes").select("track_id").in("track_id", allowedTrackIds),
  ]);

  if (playsRes.error || likesRes.error) {
    await trackFunctionEvent(supabase, {
      function_name: "get-track-counts",
      status: "error",
      error_code: "counts_query_failed",
      latency_ms: Date.now() - startedAt,
      meta: { user_id: userId },
    });
    return json(500, { ok: false, error: "query_failed" });
  }

  const playCounts = countByTrack(playsRes.data || []);
  const likeCounts = countByTrack(likesRes.data || []);
  const counts = {};
  allowedTrackIds.forEach((trackId) => {
    counts[trackId] = {
      play_count: Number(playCounts.get(trackId) || 0),
      like_count: Number(likeCounts.get(trackId) || 0),
    };
  });

  await trackFunctionEvent(supabase, {
    function_name: "get-track-counts",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { user_id: userId, count: allowedTrackIds.length },
  });

  return json(200, { ok: true, counts });
};
