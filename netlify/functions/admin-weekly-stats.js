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
      function_name: "admin-weekly-stats",
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

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = auth.adminClient;

  const [membersRes, playsRes, messagesRes] = await Promise.all([
    supabase
      .from("atelier_profiles")
      .select("id", { count: "exact", head: true })
      .in("member_status", ["member", "founder", "priority"])
      .gte("created_at", since),
    supabase
      .from("atelier_track_plays")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    supabase
      .from("atelier_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
  ]);

  if (membersRes.error || playsRes.error || messagesRes.error) {
    await trackFunctionEvent(supabase, {
      function_name: "admin-weekly-stats",
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

  await trackFunctionEvent(supabase, {
    function_name: "admin-weekly-stats",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { members: membersRes.count || 0, plays: playsRes.count || 0, messages: messagesRes.count || 0 },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      ok: true,
      new_members: membersRes.count || 0,
      plays: playsRes.count || 0,
      messages: messagesRes.count || 0,
      since,
    }),
  };
};
