const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

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

  return { ok: true, adminClient };
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

  const auth = await authenticateAdmin(event, supabaseUrl, anonKey, serviceRoleKey);
  if (!auth.ok) {
    await trackFunctionEvent(createClient(supabaseUrl, serviceRoleKey), {
      function_name: "admin-audit-log",
      status: "error",
      error_code: auth.error,
      latency_ms: Date.now() - startedAt,
      meta: {},
    });
    return {
      statusCode: auth.statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: auth.error }),
    };
  }

  const logsRes = await auth.adminClient
    .from("atelier_admin_audit_logs")
    .select("id, action, target_type, target_id, details, created_at, admin_user_id")
    .order("created_at", { ascending: false })
    .limit(100);

  if (logsRes.error) {
    await trackFunctionEvent(auth.adminClient, {
      function_name: "admin-audit-log",
      status: "error",
      error_code: "query_failed",
      latency_ms: Date.now() - startedAt,
      meta: {},
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "query_failed" }),
    };
  }

  const adminIds = [...new Set((logsRes.data || []).map((row) => row.admin_user_id).filter(Boolean))];
  let profileById = new Map();

  if (adminIds.length > 0) {
    const profilesRes = await auth.adminClient
      .from("atelier_profiles")
      .select("id, email")
      .in("id", adminIds);
    if (!profilesRes.error) {
      profileById = new Map((profilesRes.data || []).map((p) => [p.id, p]));
    }
  }

  await trackFunctionEvent(auth.adminClient, {
    function_name: "admin-audit-log",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { count: (logsRes.data || []).length },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      ok: true,
      logs: (logsRes.data || []).map((row) => ({
        id: row.id,
        action: row.action,
        target_type: row.target_type,
        target_id: row.target_id,
        details: row.details || {},
        created_at: row.created_at,
        admin_email: profileById.get(row.admin_user_id)?.email || "admin",
      })),
    }),
  };
};

