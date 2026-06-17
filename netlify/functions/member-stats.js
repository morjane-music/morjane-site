const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

function getBearerToken(header) {
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return "";
  return token;
}

exports.handler = async (event) => {
  const startedAt = Date.now();
  if (event.httpMethod !== "GET") {
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

  const token = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!token) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_token" }),
    };
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const userResult = await authClient.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "invalid_token" }),
    };
  }

  const userId = userResult.data.user.id;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const profileRes = await supabase
    .from("atelier_profiles")
    .select("member_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileRes.error || !profileRes.data || !["member", "founder", "priority"].includes(profileRes.data.member_status)) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "forbidden" }),
    };
  }

  const [playsRes, messagesRes, likesRes, lastPlayRes] = await Promise.all([
    supabase.from("atelier_track_plays").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("atelier_messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("atelier_track_likes").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("atelier_track_plays")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (playsRes.error || messagesRes.error || likesRes.error || lastPlayRes.error) {
    await trackFunctionEvent(supabase, {
      function_name: "member-stats",
      status: "error",
      error_code: "query_failed",
      latency_ms: Date.now() - startedAt,
      meta: { user_id: userId },
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "query_failed" }),
    };
  }

  await trackFunctionEvent(supabase, {
    function_name: "member-stats",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { user_id: userId },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      ok: true,
      stats: {
        plays: playsRes.count || 0,
        messages: messagesRes.count || 0,
        likes: likesRes.count || 0,
        last_play_at: lastPlayRes.data?.[0]?.created_at || null,
      },
    }),
  };
};
