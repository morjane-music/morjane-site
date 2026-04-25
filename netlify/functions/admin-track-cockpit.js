const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");
const { hasValidAdminGate } = require("./_lib/admin-gate");

function getBearerToken(header) {
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return "";
  return token;
}

async function authenticateAdmin(event, supabaseUrl, anonKey, serviceRoleKey) {
  const token = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!token) return { ok: false, statusCode: 401, error: "missing_token" };

  const authClient = createClient(supabaseUrl, anonKey);
  const userResult = await authClient.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return { ok: false, statusCode: 401, error: "invalid_token" };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const profileResult = await adminClient
    .from("atelier_profiles")
    .select("id, role")
    .eq("id", userResult.data.user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data || profileResult.data.role !== "admin") {
    return { ok: false, statusCode: 403, error: "forbidden" };
  }

  const cookieSecret = process.env.ATELIER_COOKIE_SECRET || "";
  if (!cookieSecret || !hasValidAdminGate(event, cookieSecret, userResult.data.user.id)) {
    return { ok: false, statusCode: 401, error: "admin_gate_required" };
  }

  return { ok: true, adminClient, adminUserId: userResult.data.user.id };
}

function increment(map, key, field = null) {
  if (!key) return;
  if (field) {
    const current = map.get(key) || { develop: 0, revise: 0, leave: 0 };
    current[field] = Number(current[field] || 0) + 1;
    map.set(key, current);
    return;
  }
  map.set(key, Number(map.get(key) || 0) + 1);
}

exports.handler = async (event) => {
  const startedAt = Date.now();
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

  const auth = await authenticateAdmin(event, supabaseUrl, anonKey, serviceRoleKey);
  if (!auth.ok) {
    await trackFunctionEvent(createClient(supabaseUrl, serviceRoleKey), {
      function_name: "admin-track-cockpit",
      status: "error",
      error_code: auth.error,
      latency_ms: Date.now() - startedAt,
      meta: { method: event.httpMethod },
    });
    return {
      statusCode: auth.statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: auth.error }),
    };
  }

  const supabase = auth.adminClient;

  if (event.httpMethod === "POST") {
    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (_) {
      payload = {};
    }

    const trackId = payload.trackId;
    const decisionStatus = payload.decision_status || "testing";
    if (!trackId || !["testing", "kept", "rework", "paused", "released", "archived"].includes(decisionStatus)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "bad_request" }),
      };
    }

    const update = {
      decision_status: decisionStatus,
      intent_note: typeof payload.intent_note === "string" ? payload.intent_note.slice(0, 2000) : null,
      feedback_question: typeof payload.feedback_question === "string" ? payload.feedback_question.slice(0, 1000) : null,
    };

    const result = await supabase
      .from("atelier_tracks")
      .update(update)
      .eq("id", trackId)
      .select("id")
      .maybeSingle();

    if (result.error || !result.data) {
      await trackFunctionEvent(supabase, {
        function_name: "admin-track-cockpit",
        status: "error",
        error_code: "update_failed",
        latency_ms: Date.now() - startedAt,
        meta: { track_id: trackId, message: result.error?.message || null },
      });
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "update_failed" }),
      };
    }

    await supabase.from("atelier_admin_audit_logs").insert({
      admin_user_id: auth.adminUserId,
      action: "track_cockpit_updated",
      target_type: "atelier_track",
      target_id: trackId,
      details: { decision_status: decisionStatus },
    });

    await trackFunctionEvent(supabase, {
      function_name: "admin-track-cockpit",
      status: "ok",
      latency_ms: Date.now() - startedAt,
      meta: { method: "POST" },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true }),
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
    };
  }

  const [tracksRes, votesRes, playsRes, likesRes, messagesRes] = await Promise.all([
    supabase
      .from("atelier_tracks")
      .select("id, title, status, intent_note, feedback_question, decision_status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("atelier_votes").select("track_id, choice").limit(5000),
    supabase.from("atelier_track_plays").select("track_id").limit(5000),
    supabase.from("atelier_track_likes").select("track_id").limit(5000),
    supabase.from("atelier_messages").select("track_id").limit(5000),
  ]);

  if (tracksRes.error || votesRes.error || playsRes.error || likesRes.error || messagesRes.error) {
    await trackFunctionEvent(supabase, {
      function_name: "admin-track-cockpit",
      status: "error",
      error_code: "query_failed",
      latency_ms: Date.now() - startedAt,
      meta: {
        tracks: tracksRes.error?.message || null,
        votes: votesRes.error?.message || null,
        plays: playsRes.error?.message || null,
        likes: likesRes.error?.message || null,
        messages: messagesRes.error?.message || null,
      },
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "query_failed" }),
    };
  }

  const votesByTrack = new Map();
  const playsByTrack = new Map();
  const likesByTrack = new Map();
  const messagesByTrack = new Map();

  for (const vote of votesRes.data || []) {
    if (["develop", "revise", "leave"].includes(vote.choice)) {
      increment(votesByTrack, vote.track_id, vote.choice);
    }
  }
  for (const play of playsRes.data || []) increment(playsByTrack, play.track_id);
  for (const like of likesRes.data || []) increment(likesByTrack, like.track_id);
  for (const message of messagesRes.data || []) increment(messagesByTrack, message.track_id);

  const tracks = (tracksRes.data || []).map((track) => ({
    id: track.id,
    title: track.title,
    status: track.status,
    intent_note: track.intent_note || "",
    feedback_question: track.feedback_question || "",
    decision_status: track.decision_status || "testing",
    votes: votesByTrack.get(track.id) || { develop: 0, revise: 0, leave: 0 },
    plays: playsByTrack.get(track.id) || 0,
    likes: likesByTrack.get(track.id) || 0,
    messages: messagesByTrack.get(track.id) || 0,
  }));

  await trackFunctionEvent(supabase, {
    function_name: "admin-track-cockpit",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { method: "GET", tracks: tracks.length },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: true, tracks }),
  };
};
