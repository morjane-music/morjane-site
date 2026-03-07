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
      function_name: "admin-status",
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

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = auth.adminClient;

  const [events24hRes, events7dRes, magicRes, pendingRes, playsTodayRes, activeMembers7dRes, liveNowRes] = await Promise.all([
    supabase
      .from("atelier_function_events")
      .select("function_name, status", { count: "exact" })
      .gte("created_at", since24h)
      .limit(3000),
    supabase
      .from("atelier_function_events")
      .select("function_name, status", { count: "exact" })
      .gte("created_at", since7d)
      .limit(7000),
    supabase
      .from("atelier_magic_link_events")
      .select("result", { count: "exact" })
      .gte("created_at", since7d)
      .limit(3000),
    supabase
      .from("atelier_messages")
      .select("id", { count: "exact", head: true })
      .eq("admin_status", "new"),
    supabase
      .from("atelier_track_plays")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    supabase
      .from("atelier_track_plays")
      .select("user_id")
      .gte("created_at", since7d)
      .limit(5000),
    supabase
      .from("atelier_presence")
      .select("user_id", { count: "exact", head: true })
      .eq("is_listening", true)
      .gte("last_seen_at", new Date(Date.now() - 30 * 1000).toISOString()),
  ]);

  if (events24hRes.error || events7dRes.error || magicRes.error || pendingRes.error || playsTodayRes.error || activeMembers7dRes.error) {
    await trackFunctionEvent(supabase, {
      function_name: "admin-status",
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

  const events24h = events24hRes.data || [];
  const events7d = events7dRes.data || [];
  const magicEvents = magicRes.data || [];

  const byFunction = new Map();
  for (const row of events24h) {
    if (!byFunction.has(row.function_name)) {
      byFunction.set(row.function_name, { function_name: row.function_name, ok: 0, error: 0, total: 0 });
    }
    const agg = byFunction.get(row.function_name);
    agg.total += 1;
    if (row.status === "error") agg.error += 1;
    else agg.ok += 1;
  }

  const summaryByFunction = [...byFunction.values()]
    .map((row) => ({ ...row, error_rate: row.total > 0 ? Number((row.error / row.total).toFixed(3)) : 0 }))
    .sort((a, b) => b.total - a.total);

  const total24h = events24h.length;
  const errors24h = events24h.filter((e) => e.status === "error").length;
  const total7d = events7d.length;
  const errors7d = events7d.filter((e) => e.status === "error").length;
  const linksSent7d = magicEvents.filter((e) => e.result === "sent").length;
  const linksError7d = magicEvents.filter((e) => e.result === "error").length;
  const playsToday = playsTodayRes.count || 0;
  const activeMembers7d = new Set((activeMembers7dRes.data || []).map((row) => row.user_id).filter(Boolean)).size;
  const liveNow = liveNowRes.error ? 0 : (liveNowRes.count || 0);

  await trackFunctionEvent(supabase, {
    function_name: "admin-status",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { total24h, total7d },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      ok: true,
      uptime: {
        since24h,
        total24h,
        errors24h,
        failureRate24h: total24h > 0 ? Number((errors24h / total24h).toFixed(3)) : 0,
        total7d,
        errors7d,
        failureRate7d: total7d > 0 ? Number((errors7d / total7d).toFixed(3)) : 0,
      },
      magicLinks: {
        since7d,
        sent: linksSent7d,
        error: linksError7d,
      },
      today: {
        playsToday,
        activeMembers7d,
        liveNow,
      },
      pendingMessages: pendingRes.count || 0,
      functions: summaryByFunction,
    }),
  };
};
