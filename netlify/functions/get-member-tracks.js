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

function hasMissingAccessColumns(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return text.includes("allowed_audience_segments") || text.includes("allowed_member_statuses");
}

function hasMissingAnnouncementColumns(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return text.includes("announcement_enabled") || text.includes("announcement_text");
}

exports.handler = async (event) => {
  const startedAt = Date.now();
  if (event.httpMethod !== "GET") {
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

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const userId = userResult.data.user.id;
  const profileRes = await supabase
    .from("atelier_profiles")
    .select("id, role, member_status, audience_segment")
    .eq("id", userId)
    .maybeSingle();

  if (profileRes.error || !profileRes.data) {
    return json(403, { ok: false, error: "forbidden" });
  }

  let tracksRes = await supabase
    .from("atelier_tracks")
    .select("id, title, status, storage_path, season_id, intent_note, feedback_question, announcement_enabled, announcement_text, decision_status, sort_order, created_at, allowed_audience_segments, allowed_member_statuses, atelier_seasons(id, slug, title, description, sort_order, status)")
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (tracksRes.error && hasMissingAnnouncementColumns(tracksRes.error)) {
    tracksRes = await supabase
      .from("atelier_tracks")
      .select("id, title, status, storage_path, season_id, intent_note, feedback_question, decision_status, sort_order, created_at, allowed_audience_segments, allowed_member_statuses, atelier_seasons(id, slug, title, description, sort_order, status)")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
  }

  if (tracksRes.error && hasMissingAccessColumns(tracksRes.error)) {
    tracksRes = await supabase
      .from("atelier_tracks")
      .select("id, title, status, storage_path, season_id, intent_note, feedback_question, decision_status, sort_order, created_at, atelier_seasons(id, slug, title, description, sort_order, status)")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
  }

  if (tracksRes.error) {
    await trackFunctionEvent(supabase, {
      function_name: "get-member-tracks",
      status: "error",
      error_code: "query_failed",
      latency_ms: Date.now() - startedAt,
      meta: { message: tracksRes.error.message || null },
    });
    return json(500, { ok: false, error: "query_failed" });
  }

  const accessibleTracks = (tracksRes.data || [])
    .filter((track) => track.atelier_seasons?.status !== "archived")
    .filter((track) => canAccessTrack(profileRes.data, track));

  const checkedTracks = await Promise.all(accessibleTracks.map(async (track) => {
    if (!track.storage_path) {
      return { track, audioOk: false };
    }
    const signed = await supabase.storage.from("atelier-audio").createSignedUrl(track.storage_path, 60);
    return { track, audioOk: Boolean(signed.data?.signedUrl && !signed.error) };
  }));
  const tracks = checkedTracks.filter((item) => item.audioOk).map((item) => {
    const { storage_path, ...safeTrack } = item.track;
    return safeTrack;
  });
  const hiddenBrokenAudio = checkedTracks.length - tracks.length;

  await trackFunctionEvent(supabase, {
    function_name: "get-member-tracks",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { count: tracks.length, hidden_broken_audio: hiddenBrokenAudio },
  });

  return json(200, { ok: true, tracks });
};
