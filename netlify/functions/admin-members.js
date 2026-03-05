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

  const supabase = auth.adminClient;

  if (event.httpMethod === "GET") {
    const result = await supabase
      .from("atelier_profiles")
      .select("id, email, role, member_status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (result.error) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "query_failed" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, members: result.data || [] }),
    };
  }

  if (event.httpMethod === "POST") {
    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (_) {
      payload = {};
    }

    const userId = payload.userId;
    const action = payload.action;
    if (!userId || !["approve", "revoke"].includes(action)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "bad_request" }),
      };
    }

    const update = action === "approve"
      ? { member_status: "member", role: "member" }
      : { member_status: "none", role: "member" };

    const result = await supabase
      .from("atelier_profiles")
      .update(update)
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (result.error) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "update_failed" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true }),
    };
  }

  return {
    statusCode: 405,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
  };
};
