const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

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
      function_name: "admin-inbox",
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

  const adminUser = await createClient(supabaseUrl, anonKey)
    .auth
    .getUser(getBearerToken(event.headers.authorization || event.headers.Authorization));

  if (event.httpMethod === "POST") {
    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (_) {
      payload = {};
    }

    const messageId = payload.messageId;
    const action = payload.action;
    if (!messageId || !["mark_processed", "mark_new"].includes(action)) {
      await trackFunctionEvent(auth.adminClient, {
        function_name: "admin-inbox",
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

    const isProcessed = action === "mark_processed";
    const adminId = adminUser?.data?.user?.id || null;

    const updatePayload = isProcessed
      ? { admin_status: "processed", processed_at: new Date().toISOString(), processed_by: adminId }
      : { admin_status: "new", processed_at: null, processed_by: null };

    const updateResult = await auth.adminClient
      .from("atelier_messages")
      .update(updatePayload)
      .eq("id", messageId)
      .select("id")
      .maybeSingle();

    if (updateResult.error || !updateResult.data) {
      await trackFunctionEvent(auth.adminClient, {
        function_name: "admin-inbox",
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

    if (adminId) {
      await auth.adminClient.from("atelier_admin_audit_logs").insert({
        admin_user_id: adminId,
        action: isProcessed ? "message_processed" : "message_reopened",
        target_type: "atelier_message",
        target_id: messageId,
        details: { action },
      });
    }

    await trackFunctionEvent(auth.adminClient, {
      function_name: "admin-inbox",
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

  if (event.httpMethod !== "GET") {
    await trackFunctionEvent(auth.adminClient, {
      function_name: "admin-inbox",
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
  }

  const messagesResult = await auth.adminClient
    .from("atelier_messages")
    .select("id, created_at, content, user_id, track_id, admin_status, processed_at, processed_by")
    .order("created_at", { ascending: false })
    .limit(200);

  if (messagesResult.error) {
    await trackFunctionEvent(auth.adminClient, {
      function_name: "admin-inbox",
      status: "error",
      error_code: "query_failed_messages",
      latency_ms: Date.now() - startedAt,
      meta: { method: "GET" },
    });
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
  let adminById = new Map();

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

  const processedByIds = [...new Set(messages.map((m) => m.processed_by).filter(Boolean))];
  if (processedByIds.length > 0) {
    const adminsResult = await auth.adminClient
      .from("atelier_profiles")
      .select("id, email")
      .in("id", processedByIds);
    if (!adminsResult.error) {
      adminById = new Map((adminsResult.data || []).map((p) => [p.id, p]));
    }
  }

  await trackFunctionEvent(auth.adminClient, {
    function_name: "admin-inbox",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { method: "GET", count: messages.length },
  });

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
        admin_status: row.admin_status || "new",
        processed_at: row.processed_at || null,
        processed_by_email: adminById.get(row.processed_by)?.email || null,
      })),
    }),
  };
};
