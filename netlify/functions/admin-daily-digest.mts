import { createClient } from "@supabase/supabase-js";

async function countQuery(query: PromiseLike<{ count: number | null; error: { message?: string } | null }>) {
  const result = await query;
  if (result.error) throw result.error;
  return result.count || 0;
}

function digestText(payload: Record<string, string | number>) {
  return [
    "Atelier Morjane - digest quotidien", "",
    `Demandes 24h : ${payload.access_requests_24h}`,
    `Accès en attente : ${payload.pending_access}`,
    `Messages 24h : ${payload.messages_24h}`,
    `Écoutes 24h : ${payload.plays_24h}`,
    `Cœurs 24h : ${payload.likes_24h}`,
    `Auditeurs actifs 24h : ${payload.active_listeners_24h}`,
    `Live maintenant : ${payload.live_now}`, "",
    `Depuis : ${payload.since}`
  ].join("\n");
}

async function deliver(payload: Record<string, string | number>) {
  const apiKey = Netlify.env.get("RESEND_API_KEY") || "";
  const to = Netlify.env.get("ATELIER_ADMIN_EMAIL") || "";
  let emailDelivered = false;
  if (apiKey && to) {
    const from = Netlify.env.get("ATELIER_DIGEST_FROM_EMAIL") || "Atelier Morjane <atelier@morjane.re>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `Atelier Morjane - ${payload.messages_24h} messages, ${payload.plays_24h} écoutes`,
        text: digestText(payload)
      })
    });
    if (!response.ok) throw new Error(`resend_${response.status}`);
    emailDelivered = true;
  }

  const webhookUrl = Netlify.env.get("ATELIER_ADMIN_DIGEST_WEBHOOK_URL") || "";
  let webhookDelivered = false;
  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`webhook_${response.status}`);
    webhookDelivered = true;
  }
  return { emailDelivered, webhookDelivered };
}

export default async () => {
  const supabaseUrl = Netlify.env.get("SUPABASE_URL");
  const serviceRoleKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return new Response("Missing environment", { status: 500 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [accessRequests, pendingAccess, newMessages, plays, likes, activeListeners, liveNow] = await Promise.all([
    countQuery(supabase.from("atelier_profiles").select("id", { count: "exact", head: true }).gte("created_at", since)),
    countQuery(supabase.from("atelier_profiles").select("id", { count: "exact", head: true }).in("member_status", ["none", "pending"])),
    countQuery(supabase.from("atelier_messages").select("id", { count: "exact", head: true }).gte("created_at", since)),
    countQuery(supabase.from("atelier_track_plays").select("id", { count: "exact", head: true }).gte("created_at", since)),
    countQuery(supabase.from("atelier_track_likes").select("id", { count: "exact", head: true }).gte("created_at", since)),
    supabase.from("atelier_track_plays").select("user_id").gte("created_at", since).limit(2000),
    countQuery(supabase.from("atelier_presence").select("user_id", { count: "exact", head: true }).eq("is_listening", true).gte("last_seen_at", new Date(Date.now() - 30_000).toISOString()))
  ]);
  if (activeListeners.error) throw activeListeners.error;

  const payload = {
    since,
    access_requests_24h: accessRequests,
    pending_access: pendingAccess,
    messages_24h: newMessages,
    plays_24h: plays,
    likes_24h: likes,
    active_listeners_24h: new Set((activeListeners.data || []).map((row: { user_id?: string }) => row.user_id).filter(Boolean)).size,
    live_now: liveNow
  };
  const delivery = await deliver(payload);
  await supabase.from("atelier_function_events").insert({
    function_name: "admin-daily-digest",
    status: "ok",
    meta: { ...delivery, ...payload }
  });
  return new Response("Digest processed", { status: 200 });
};

export const config = { schedule: "0 7 * * *" };
