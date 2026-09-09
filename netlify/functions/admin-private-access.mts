import { createHash, randomBytes } from "node:crypto";
import { hashPrivatePassword, privateAccessIdentifier, validatePrivatePassword } from "./_shared/private-access-password.mjs";
import { authenticatePrivateAccessAdmin } from "./_shared/private-access-admin.mjs";

const SCOPES = new Set(["set", "acte1"]);
const env = (name: string) => globalThis.Netlify?.env?.get?.(name) || process.env[name] || "";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
const cleanEmail = (value: unknown) => String(value || "").trim().toLowerCase();
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function getRuntimeConfig() {
  return {
    supabaseUrl: env("SUPABASE_URL"), anonKey: env("SUPABASE_ANON_KEY"), serviceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY"),
    adminCookieSecret: env("ATELIER_COOKIE_SECRET"), cookieSecret: env("MORJANE_PRIVATE_ACCESS_COOKIE_SECRET"),
    resendKey: env("RESEND_API_KEY"), from: env("ATELIER_FROM_EMAIL") || env("RESEND_FROM_EMAIL") || "Atelier MORJANE <atelier@auth.morjane.re>"
  };
}

function safeOrigin(request: Request) {
  const url = new URL(request.url);
  return ["localhost", "127.0.0.1", "morjane.re", "www.morjane.re"].includes(url.hostname) ? url.origin : "https://morjane.re";
}

async function generateAuthLink(client: any, email: string, redirectTo: string) {
  let result = await client.auth.admin.generateLink({ type: "invite", email, options: { redirectTo } });
  if (result.error) result = await client.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
  const actionLink = result.data?.properties?.action_link || "";
  return result.error || !actionLink ? { ok: false } : { ok: true, actionLink };
}

async function sendInvite(configValue: ReturnType<typeof getRuntimeConfig>, email: string, actionLink: string, scopes: string[], expiresAt: string | null, message: string) {
  if (!configValue.resendKey) return false;
  const scopeLabel = scopes.length === 2 ? "SET et ACTE I" : scopes[0] === "set" ? "SET" : "ACTE I";
  const expiry = expiresAt ? `Cet accès est valable jusqu'au ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Indian/Reunion" }).format(new Date(expiresAt))}.` : "Cet accès n'a pas de date de fin programmée.";
  const personalText = message ? `\nMessage de MORJANE :\n${message}\n` : "";
  const personalHtml = message ? `<p style="white-space:pre-line;color:#f4efe7">${escapeHtml(message)}</p>` : "";
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${configValue.resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({
    from: configValue.from, to: email, subject: `Votre accès professionnel MORJANE — ${scopeLabel}`,
    text: `MORJANE vous ouvre un accès professionnel à ${scopeLabel}.\n${expiry}${personalText}\nActivez votre accès personnel :\n${actionLink}\n\nCe lien est personnel, temporaire et à usage unique.`,
    html: `<div style="font-family:Arial,sans-serif;background:#090706;color:#f4efe7;padding:24px"><p style="color:#c99852;letter-spacing:.12em">ACCÈS PROFESSIONNEL MORJANE</p><h1 style="font-size:22px">${scopeLabel}</h1><p>${escapeHtml(expiry)}</p>${personalHtml}<p style="margin:24px 0"><a href="${escapeHtml(actionLink)}" style="border:1px solid #c99852;color:#f4efe7;padding:12px 16px;text-decoration:none">Activer mon accès</a></p><p style="color:#9d9183;font-size:13px">Lien personnel, temporaire et à usage unique.</p></div>`
  }) });
  return response.ok;
}

async function listData(client: any) {
  const [credentials, invitations, grants] = await Promise.all([
    client.from("private_access_credentials").select("scope,enabled,updated_at").order("scope"),
    client.from("private_access_invitations").select("id,email,scopes,status,sent_at,expires_at,activated_at,revoked_at,resend_count").order("sent_at", { ascending: false }).limit(100),
    client.from("private_access_grants").select("id,email,scope,status,expires_at,activated_at,last_session_at,invitation_id").eq("status", "active").or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order("activated_at", { ascending: false }).limit(100)
  ]);
  if (credentials.error || invitations.error || grants.error) throw new Error("private_access_list_failed");
  return { credentials: credentials.data || [], invitations: invitations.data || [], grants: grants.data || [] };
}

export function createAdminPrivateAccessHandler(dependencies: any = {}) {
  return async (request: Request) => {
    const cfg = { ...getRuntimeConfig(), ...(dependencies.config || {}) };
    if (!cfg.supabaseUrl || !cfg.anonKey || !cfg.serviceRoleKey || !cfg.adminCookieSecret || !cfg.cookieSecret) return json(500, { ok: false, error: "missing_env" });
    const auth = await authenticatePrivateAccessAdmin(request, cfg, dependencies);
    if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });
    const client = auth.adminClient;
    if (request.method === "GET") {
      try { return json(200, { ok: true, ...(await listData(client)) }); } catch { return json(503, { ok: false, error: "unavailable" }); }
    }
    if (request.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });
    let body: any = {};
    try { body = await request.json(); } catch { return json(400, { ok: false, error: "invalid_request" }); }
    const scope = String(body.scope || "");
    try {
      if (body.action === "set_password") {
        if (!SCOPES.has(scope) || body.password !== body.confirmation) return json(400, { ok: false, error: "invalid_password" });
        const validation = validatePrivatePassword(body.password);
        if (!validation.ok) return json(400, { ok: false, error: "invalid_password", message: validation.error });
        const hash = await hashPrivatePassword(validation.password);
        const result = await client.rpc("private_access_set_password", { requested_scope: scope, requested_password_hash: hash, requested_admin_user_id: auth.user.id });
        if (result.error) throw result.error;
      } else if (body.action === "revoke_shared") {
        if (!SCOPES.has(scope)) return json(400, { ok: false, error: "invalid_scope" });
        const result = await client.rpc("private_access_revoke_sessions", { requested_scope: scope, requested_admin_user_id: auth.user.id });
        if (result.error) throw result.error;
      } else if (body.action === "invite") {
        const email = cleanEmail(body.email);
        const scopes = [...new Set(Array.isArray(body.scopes) ? body.scopes.map(String) : [])].filter(value => SCOPES.has(value));
        const message = String(body.message || "").trim().slice(0, 500);
        const expiresTimestamp = body.expires_at ? Date.parse(body.expires_at) : NaN;
        const expiresAt = body.expires_at && Number.isFinite(expiresTimestamp) ? new Date(expiresTimestamp).toISOString() : null;
        if (!validEmail(email) || !scopes.length || (body.expires_at && !expiresAt) || (expiresAt && Date.parse(expiresAt) <= Date.now())) return json(400, { ok: false, error: "invalid_invitation" });
        const limiter = privateAccessIdentifier("admin_invite", `${auth.user.id}:${email}`, cfg.cookieSecret);
        const allowed = await client.rpc("private_access_register_attempt", { requested_scope: "admin_invite", requested_identifier_hash: limiter });
        if (allowed.error || allowed.data !== true) return json(429, { ok: false, error: "rate_limited" });
        const rawToken = randomBytes(32).toString("base64url");
        const inserted = await client.from("private_access_invitations").insert({ email, scopes, token_hash: tokenHash(rawToken), expires_at: expiresAt, created_by: auth.user.id }).select("id").single();
        if (inserted.error) throw inserted.error;
        const redirectTo = `${safeOrigin(request)}/private-access?token=${encodeURIComponent(rawToken)}`;
        const link = await generateAuthLink(client, email, redirectTo);
        const sent = link.ok && await sendInvite(cfg, email, link.actionLink, scopes, expiresAt, message);
        if (!sent) {
          await client.from("private_access_invitations").update({ status: "revoked", revoked_at: new Date().toISOString(), token_hash: tokenHash(randomBytes(32).toString("base64url")) }).eq("id", inserted.data.id);
          return json(502, { ok: false, error: "delivery_failed" });
        }
        await client.from("atelier_admin_audit_logs").insert({ admin_user_id: auth.user.id, action: "private_access_invitation_sent", target_type: "private_access_invitation", target_id: inserted.data.id, details: { scopes, has_expiration: Boolean(expiresAt), has_personal_message: Boolean(message) } });
      } else if (body.action === "resend") {
        const invitation = await client.from("private_access_invitations").select("id,email,scopes,expires_at,status,resend_count").eq("id", body.id).maybeSingle();
        if (invitation.error || !invitation.data || invitation.data.status === "activated") return json(400, { ok: false, error: "invalid_invitation" });
        const limiter = privateAccessIdentifier("admin_invite", `${auth.user.id}:${invitation.data.email}`, cfg.cookieSecret);
        const allowed = await client.rpc("private_access_register_attempt", { requested_scope: "admin_invite", requested_identifier_hash: limiter });
        if (allowed.error || allowed.data !== true) return json(429, { ok: false, error: "rate_limited" });
        const rawToken = randomBytes(32).toString("base64url");
        const redirectTo = `${safeOrigin(request)}/private-access?token=${encodeURIComponent(rawToken)}`;
        const link = await generateAuthLink(client, invitation.data.email, redirectTo);
        const sent = link.ok && await sendInvite(cfg, invitation.data.email, link.actionLink, invitation.data.scopes, invitation.data.expires_at, "");
        if (!sent) return json(502, { ok: false, error: "delivery_failed" });
        const update = await client.from("private_access_invitations").update({ token_hash: tokenHash(rawToken), status: "sent", revoked_at: null, sent_at: new Date().toISOString(), resend_count: Number(invitation.data.resend_count || 0) + 1, updated_at: new Date().toISOString() }).eq("id", invitation.data.id);
        if (update.error) throw update.error;
        await client.from("atelier_admin_audit_logs").insert({ admin_user_id: auth.user.id, action: "private_access_invitation_resent", target_type: "private_access_invitation", target_id: invitation.data.id, details: { scopes: invitation.data.scopes } });
      } else if (body.action === "revoke_invitation") {
        const result = await client.rpc("private_access_revoke_invitation", { requested_invitation_id: body.id, requested_admin_user_id: auth.user.id });
        if (result.error) throw result.error;
      } else if (body.action === "extend") {
        const expiresTimestamp = body.expires_at ? Date.parse(body.expires_at) : NaN;
        const expiresAt = body.expires_at && Number.isFinite(expiresTimestamp) ? new Date(expiresTimestamp).toISOString() : null;
        if ((body.expires_at && !expiresAt) || (expiresAt && Date.parse(expiresAt) <= Date.now())) return json(400, { ok: false, error: "invalid_expiration" });
        const result = await client.rpc("private_access_extend_invitation", { requested_invitation_id: body.id, requested_expires_at: expiresAt, requested_admin_user_id: auth.user.id });
        if (result.error) throw result.error;
      } else if (body.action === "revoke_grant") {
        const result = await client.rpc("private_access_revoke_grant", { requested_grant_id: body.id, requested_admin_user_id: auth.user.id });
        if (result.error) throw result.error;
      } else return json(400, { ok: false, error: "unknown_action" });
      return json(200, { ok: true, ...(await listData(client)) });
    } catch { return json(503, { ok: false, error: "unavailable" }); }
  };
}

export default createAdminPrivateAccessHandler();
export const config = { path: "/api/admin-private-access", method: ["GET", "POST"] };
