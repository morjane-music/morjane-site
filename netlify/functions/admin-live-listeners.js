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
      function_name: "admin-live-listeners",
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

  const cutoff = new Date(Date.now() - 30 * 1000).toISOString();
  const presenceRes = await auth.adminClient
    .from("atelier_presence")
    .select("user_id, track_id, is_listening, last_seen_at")
    .eq("is_listening", true)
    .gte("last_seen_at", cutoff)
    .order("last_seen_at", { ascending: false })
    .limit(100);

  if (presenceRes.error) {
    await trackFunctionEvent(auth.adminClient, {
      function_name: "admin-live-listeners",
      status: "error",
      error_code: "query_failed_presence",
      latency_ms: Date.now() - startedAt,
      meta: {},
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "query_failed_presence" }),
    };
  }

  const rows = presenceRes.data || [];
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const trackIds = [...new Set(rows.map((r) => r.track_id).filter(Boolean))];

  let profileById = new Map();
  let trackById = new Map();

  if (userIds.length > 0) {
    const profilesRes = await auth.adminClient
      .from("atelier_profiles")
      .select("id, email")
      .in("id", userIds);
    if (!profilesRes.error) {
      profileById = new Map((profilesRes.data || []).map((p) => [p.id, p]));
    }
  }

  if (trackIds.length > 0) {
    const tracksRes = await auth.adminClient
      .from("atelier_tracks")
      .select("id, title")
      .in("id", trackIds);
    if (!tracksRes.error) {
      trackById = new Map((tracksRes.data || []).map((t) => [t.id, t]));
    }
  }

  const listeners = rows.map((row) => ({
    email: profileById.get(row.user_id)?.email || "Email inconnu",
    track_title: trackById.get(row.track_id)?.title || "Maquette",
    last_seen_at: row.last_seen_at,
  }));

  await trackFunctionEvent(auth.adminClient, {
    function_name: "admin-live-listeners",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { count: listeners.length },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: true, listeners }),
  };
};

