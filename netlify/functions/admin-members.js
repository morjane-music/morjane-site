const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");
const { hasValidAdminGate } = require("./_lib/admin-gate");

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

  const cookieSecret = process.env.ATELIER_COOKIE_SECRET || "";
  if (!cookieSecret || !hasValidAdminGate(event, cookieSecret, userResult.data.user.id)) {
    return { ok: false, statusCode: 401, error: "admin_gate_required" };
  }

  return { ok: true, adminClient, adminUserId: userResult.data.user.id };
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
      function_name: "admin-members",
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
  const adminUserId = auth.adminUserId || null;

  if (event.httpMethod === "GET") {
    const result = await supabase
      .from("atelier_profiles")
      .select("id, email, role, member_status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (result.error) {
      await trackFunctionEvent(supabase, {
        function_name: "admin-members",
        status: "error",
        error_code: "query_failed",
        latency_ms: Date.now() - startedAt,
        meta: { method: "GET" },
      });
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "query_failed" }),
      };
    }

    await trackFunctionEvent(supabase, {
      function_name: "admin-members",
      status: "ok",
      latency_ms: Date.now() - startedAt,
      meta: { method: "GET", count: (result.data || []).length },
    });

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
      await trackFunctionEvent(supabase, {
        function_name: "admin-members",
        status: "error",
        error_code: "bad_request",
        latency_ms: Date.now() - startedAt,
        meta: { method: "POST" },
      });
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
      await trackFunctionEvent(supabase, {
        function_name: "admin-members",
        status: "error",
        error_code: "update_failed",
        latency_ms: Date.now() - startedAt,
        meta: { method: "POST", action },
      });
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "update_failed" }),
      };
    }

    const adminId = adminUserId;
    if (adminId) {
      await supabase.from("atelier_admin_audit_logs").insert({
        admin_user_id: adminId,
        action: action === "approve" ? "member_approved" : "member_revoked",
        target_type: "atelier_profile",
        target_id: userId,
        details: { action },
      });
    }

    await trackFunctionEvent(supabase, {
      function_name: "admin-members",
      status: "ok",
      latency_ms: Date.now() - startedAt,
      meta: { method: "POST", action },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true }),
    };
  }

  await trackFunctionEvent(supabase, {
    function_name: "admin-members",
    status: "error",
    error_code: "method_not_allowed",
    latency_ms: Date.now() - startedAt,
    meta: { method: event.httpMethod },
  });

  return {
    statusCode: 405,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
  };
};
