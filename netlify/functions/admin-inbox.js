const { createClient } = require("@supabase/supabase-js");

function getBearerToken(header) {
  if (!header) {
    return "";
  }
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return "";
  }
  return token;
}

async function authenticateAdmin(event, supabaseUrl, anonKey, serviceRoleKey) {
  const token = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!token) {
    return { ok: false, statusCode: 401, error: "missing_token" };
  }

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

  return { ok: true, adminClient };
}

exports.handler = async (event) => {
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

  const auth = await authenticateAdmin(event, supabaseUrl, anonKey, serviceRoleKey);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: auth.error }),
    };
  }

  const messagesResult = await auth.adminClient
    .from("atelier_messages")
    .select("id, created_at, content, user_id, track_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (messagesResult.error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "query_failed_messages" }),
    };
  }

  const messages = messagesResult.data || [];
  const userIds = [...new Set(messages.map((m) => m.user_id).filter(Boolean))];
  const trackIds = [...new Set(messages.map((m) => m.track_id).filter(Boolean))];

  let profileById = new Map();
  let trackById = new Map();

  if (userIds.length > 0) {
    const profilesResult = await auth.adminClient
      .from("atelier_profiles")
      .select("id, email")
      .in("id", userIds);
    if (!profilesResult.error) {
      profileById = new Map((profilesResult.data || []).map((p) => [p.id, p]));
    }
  }

  if (trackIds.length > 0) {
    const tracksResult = await auth.adminClient
      .from("atelier_tracks")
      .select("id, title")
      .in("id", trackIds);
    if (!tracksResult.error) {
      trackById = new Map((tracksResult.data || []).map((t) => [t.id, t]));
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      ok: true,
      messages: messages.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        content: row.content,
        sender_email: profileById.get(row.user_id)?.email || "Email inconnu",
        track_title: trackById.get(row.track_id)?.title || "Maquette",
      })),
    }),
  };
};
