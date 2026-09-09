import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createPrivateAccessCookie, createPrivateAccessToken } from "./_shared/private-access-session.mjs";
import { privateAccessIdentifier } from "./_shared/private-access-password.mjs";

const env = (name: string) => globalThis.Netlify?.env?.get?.(name) || process.env[name] || "";
const json = (status: number, body: unknown, cookies: string[] = []) => { const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" }); cookies.forEach(cookie => headers.append("Set-Cookie", cookie)); return new Response(JSON.stringify(body), { status, headers }); };
const bearer = (request: Request) => { const [scheme, token] = String(request.headers.get("authorization") || "").split(" "); return scheme === "Bearer" ? token || "" : ""; };

export default async (request: Request, context: any) => {
  if (request.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });
  const supabaseUrl = env("SUPABASE_URL"), anonKey = env("SUPABASE_ANON_KEY"), serviceKey = env("SUPABASE_SERVICE_ROLE_KEY"), signer = env("MORJANE_PRIVATE_ACCESS_COOKIE_SECRET");
  if (!supabaseUrl || !anonKey || !serviceKey || !signer) return json(503, { ok: false, error: "unavailable" });
  let body: any = {}; try { body = await request.json(); } catch { return json(400, { ok: false, error: "invalid_activation" }); }
  const rawToken = String(body.token || "").slice(0, 256), accessToken = bearer(request);
  if (!rawToken || !accessToken) return json(403, { ok: false, error: "invalid_activation" });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const fingerprint = privateAccessIdentifier("activation", `${context.ip || "unknown"}:${createHash("sha256").update(rawToken).digest("hex")}`, signer);
  const rate = await admin.rpc("private_access_register_attempt", { requested_scope: "activation", requested_identifier_hash: fingerprint });
  if (rate.error || rate.data !== true) return json(403, { ok: false, error: "invalid_activation" });
  const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const userResult = await auth.auth.getUser(accessToken), user = userResult.data?.user;
  if (userResult.error || !user?.email) return json(403, { ok: false, error: "invalid_activation" });
  const activated = await admin.rpc("private_access_activate_invitation", { requested_token_hash: createHash("sha256").update(rawToken).digest("hex"), requested_user_id: user.id, requested_email: user.email.toLowerCase() });
  if (activated.error || !Array.isArray(activated.data) || !activated.data.length) return json(403, { ok: false, error: "invalid_activation" });
  const secure = !["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
  const cookies: string[] = [], destinations: string[] = [];
  for (const grant of activated.data) {
    const token = await createPrivateAccessToken(grant.scope, Number(grant.session_version), signer, Date.now(), grant.grant_id);
    cookies.push(createPrivateAccessCookie(grant.scope, token, secure)); destinations.push(grant.scope === "set" ? "/set" : "/acte1");
  }
  return json(200, { ok: true, destinations }, cookies);
};

export const config = { path: "/api/private-access-activate", method: "POST" };
