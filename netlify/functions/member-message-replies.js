const { createClient } = require("@supabase/supabase-js");

function getBearerToken(header) {
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return "";
  return token;
}

exports.handler = async (event) => {
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

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    payload = {};
  }
  if (!payload.trackId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_track_id" }),
    };
  }

  const accessToken = getBearerToken(event.headers.authorization || event.headers.Authorization);
  const authClient = createClient(supabaseUrl, anonKey);
  const userResult = await authClient.auth.getUser(accessToken);
  if (userResult.error || !userResult.data.user) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "invalid_token" }),
    };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const userId = userResult.data.user.id;
  const profileRes = await adminClient
    .from("atelier_profiles")
    .select("member_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileRes.error || !profileRes.data || !["member", "founder"].includes(profileRes.data.member_status)) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "forbidden" }),
    };
  }

  const repliesRes = await adminClient
    .from("atelier_messages")
    .select("id, admin_reply, created_at")
    .eq("user_id", userId)
    .eq("track_id", payload.trackId)
    .not("admin_reply", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (repliesRes.error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "query_failed" }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      ok: true,
      replies: (repliesRes.data || []).filter((row) => row.admin_reply),
    }),
  };
};
