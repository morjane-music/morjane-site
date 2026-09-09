import { createClient } from "@supabase/supabase-js";
import { privateAccessIdentifier } from "./_shared/private-access-password.mjs";

const env = (name: string) => globalThis.Netlify?.env?.get?.(name) || process.env[name] || "";
const generic = () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default async (request: Request, context: any) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const supabaseUrl = env("SUPABASE_URL"), serviceKey = env("SUPABASE_SERVICE_ROLE_KEY"), signer = env("MORJANE_PRIVATE_ACCESS_COOKIE_SECRET"), resendKey = env("RESEND_API_KEY");
  if (!supabaseUrl || !serviceKey || !signer || !resendKey) return generic();
  let body: any = {}; try { body = await request.json(); } catch { return generic(); }
  const email = String(body.email || "").trim().toLowerCase(), scope = String(body.scope || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["set", "acte1"].includes(scope)) return generic();
  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const fingerprint = privateAccessIdentifier("session_link", `${context.ip || "unknown"}:${email}:${scope}`, signer);
  const rate = await client.rpc("private_access_register_attempt", { requested_scope: "session_link", requested_identifier_hash: fingerprint });
  if (rate.error || rate.data !== true) return generic();
  const grantResult = await client.from("private_access_grants").select("id,user_id,email,status,expires_at").eq("email", email).eq("scope", scope).maybeSingle();
  const grant = grantResult.data;
  if (grantResult.error || !grant || grant.status !== "active" || (grant.expires_at && Date.parse(grant.expires_at) <= Date.now())) return generic();
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/private-access?scope=${scope}`;
  const link = await client.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
  const actionLink = link.data?.properties?.action_link || "";
  if (link.error || !actionLink) return generic();
  const label = scope === "set" ? "SET" : "ACTE I";
  await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({
    from: env("ATELIER_FROM_EMAIL") || env("RESEND_FROM_EMAIL") || "Atelier MORJANE <atelier@auth.morjane.re>", to: email,
    subject: `Retrouver votre accès MORJANE — ${label}`,
    text: `Ouvrez ce lien personnel pour retrouver votre accès à ${label} :\n${actionLink}`,
    html: `<div style="font-family:Arial,sans-serif;background:#090706;color:#f4efe7;padding:24px"><p>Retrouvez votre accès à ${label}.</p><p><a href="${escapeHtml(actionLink)}" style="color:#f4efe7">Ouvrir mon accès</a></p></div>`
  }) });
  return generic();
};

export const config = { path: "/api/private-access-request-link", method: "POST" };
