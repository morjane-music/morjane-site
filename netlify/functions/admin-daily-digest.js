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

function buildDigestText(payload) {
  return [
    "Atelier Morjane - digest quotidien",
    "",
    `Demandes 24h : ${payload.access_requests_24h}`,
    `Acces en attente : ${payload.pending_access}`,
    `Messages 24h : ${payload.messages_24h}`,
    `Ecoutes 24h : ${payload.plays_24h}`,
    `Coeurs 24h : ${payload.likes_24h}`,
    `Auditeurs actifs 24h : ${payload.active_listeners_24h}`,
    `Live maintenant : ${payload.live_now}`,
    "",
    `Depuis : ${payload.since}`,
  ].join("\n");
}

function buildDigestHtml(payload) {
  const rows = [
    ["Demandes 24h", payload.access_requests_24h],
    ["Acces en attente", payload.pending_access],
    ["Messages 24h", payload.messages_24h],
    ["Ecoutes 24h", payload.plays_24h],
    ["Coeurs 24h", payload.likes_24h],
    ["Auditeurs actifs 24h", payload.active_listeners_24h],
    ["Live maintenant", payload.live_now],
  ];
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#090706;color:#f4efe7;padding:24px">
      <h1 style="font-size:20px;margin:0 0 16px">Atelier Morjane</h1>
      <p style="color:#c99852;margin:0 0 18px">Digest quotidien</p>
      <table style="width:100%;border-collapse:collapse">
        ${rows.map(([label, value]) => `
          <tr>
            <td style="padding:10px;border-bottom:1px solid rgba(201,152,82,.25);color:#c8bcae">${label}</td>
            <td style="padding:10px;border-bottom:1px solid rgba(201,152,82,.25);text-align:right;font-weight:700">${value}</td>
          </tr>
        `).join("")}
      </table>
      <p style="color:#9d9183;font-size:12px;margin-top:18px">Depuis ${payload.since}</p>
    </div>
  `;
}

async function sendDigestEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const to = process.env.ATELIER_ADMIN_EMAIL || "";
  if (!apiKey || !to) {
    return false;
  }

  const from = process.env.ATELIER_DIGEST_FROM_EMAIL || "Atelier Morjane <atelier@morjane.re>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Atelier Morjane - ${payload.messages_24h} messages, ${payload.plays_24h} ecoutes`,
      text: buildDigestText(payload),
      html: buildDigestHtml(payload),
    }),
  });

  if (!res.ok) {
    throw new Error(`resend_${res.status}`);
  }
  return true;
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
      countQuery(supabase.from("atelier_profiles").select("id", { count: "exact", head: true }).in("member_status", ["none", "pending"])),
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
    let delivered = await sendDigestEmail(payload);
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
