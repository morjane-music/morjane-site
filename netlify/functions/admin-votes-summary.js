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
      function_name: "admin-votes-summary",
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

  const [tracksRes, votesRes] = await Promise.all([
    auth.adminClient.from("atelier_tracks").select("id, title").order("created_at", { ascending: false }).limit(20),
    auth.adminClient.from("atelier_votes").select("track_id, choice"),
  ]);

  if (tracksRes.error || votesRes.error) {
    await trackFunctionEvent(auth.adminClient, {
      function_name: "admin-votes-summary",
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

  const byTrack = new Map();
  for (const track of tracksRes.data || []) {
    byTrack.set(track.id, {
      track_id: track.id,
      track_title: track.title || "Maquette",
      total: 0,
      keep: 0,
      revise: 0,
      discard: 0,
    });
  }

  for (const vote of votesRes.data || []) {
    if (!byTrack.has(vote.track_id)) continue;
    const row = byTrack.get(vote.track_id);
    row.total += 1;
    if (vote.choice === "develop") row.keep += 1;
    if (vote.choice === "revise") row.revise += 1;
    if (vote.choice === "leave") row.discard += 1;
  }

  const summary = [...byTrack.values()].sort((a, b) => b.total - a.total);

  await trackFunctionEvent(auth.adminClient, {
    function_name: "admin-votes-summary",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { tracks: summary.length },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ ok: true, summary }),
  };
};
