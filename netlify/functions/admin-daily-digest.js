const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

exports.config = {
  schedule: "0 7 * * *",
};

async function countQuery(query) {
  const result = await query;
  if (result.error) throw result.error;
  return result.count || 0;
}

exports.handler = async () => {
  const startedAt = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_env" }),
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const [
      accessRequests,
      pendingAccess,
      newMessages,
      plays,
      likes,
      activeListeners,
      liveNow,
    ] = await Promise.all([
      countQuery(supabase.from("atelier_profiles").select("id", { count: "exact", head: true }).gte("created_at", since)),
      countQuery(supabase.from("atelier_profiles").select("id", { count: "exact", head: true }).eq("member_status", "none")),
      countQuery(supabase.from("atelier_messages").select("id", { count: "exact", head: true }).gte("created_at", since)),
      countQuery(supabase.from("atelier_track_plays").select("id", { count: "exact", head: true }).gte("created_at", since)),
      countQuery(supabase.from("atelier_track_likes").select("id", { count: "exact", head: true }).gte("created_at", since)),
      supabase
        .from("atelier_track_plays")
        .select("user_id")
        .gte("created_at", since)
        .limit(2000),
      countQuery(
        supabase
          .from("atelier_presence")
          .select("user_id", { count: "exact", head: true })
          .eq("is_listening", true)
          .gte("last_seen_at", new Date(Date.now() - 30 * 1000).toISOString())
      ),
    ]);

    if (activeListeners.error) throw activeListeners.error;
    const payload = {
      title: "Atelier Morjane - digest quotidien",
      since,
      access_requests_24h: accessRequests,
      pending_access: pendingAccess,
      messages_24h: newMessages,
      plays_24h: plays,
      likes_24h: likes,
      active_listeners_24h: new Set((activeListeners.data || []).map((row) => row.user_id).filter(Boolean)).size,
      live_now: liveNow,
    };

    const webhookUrl = process.env.ATELIER_ADMIN_DIGEST_WEBHOOK_URL || "";
    let delivered = false;
    if (webhookUrl) {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      delivered = res.ok;
      if (!res.ok) {
        throw new Error(`webhook_${res.status}`);
      }
    }

    await trackFunctionEvent(supabase, {
      function_name: "admin-daily-digest",
      status: "ok",
      latency_ms: Date.now() - startedAt,
      meta: { delivered, ...payload },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, delivered, digest: payload }),
    };
  } catch (error) {
    await trackFunctionEvent(supabase, {
      function_name: "admin-daily-digest",
      status: "error",
      error_code: "digest_failed",
      latency_ms: Date.now() - startedAt,
      meta: { message: error.message || "unknown" },
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "digest_failed" }),
    };
  }
};
