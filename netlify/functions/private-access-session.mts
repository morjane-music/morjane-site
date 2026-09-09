import { createClient } from "@supabase/supabase-js";
import { createPrivateAccessCookie, createPrivateAccessToken } from "./_shared/private-access-session.mjs";

const env = (name: string) => globalThis.Netlify?.env?.get?.(name) || process.env[name] || "";
const respond = (status: number, body: unknown, cookie = "") => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", ...(cookie ? { "Set-Cookie": cookie } : {}) } });

export default async (request: Request) => {
  if (request.method !== "POST") return respond(405, { ok: false });
  const supabaseUrl = env("SUPABASE_URL"), anonKey = env("SUPABASE_ANON_KEY"), serviceKey = env("SUPABASE_SERVICE_ROLE_KEY"), signer = env("MORJANE_PRIVATE_ACCESS_COOKIE_SECRET");
  if (!supabaseUrl || !anonKey || !serviceKey || !signer) return respond(503, { ok: false });
  const [scheme, accessToken] = String(request.headers.get("authorization") || "").split(" ");
  let body: any = {}; try { body = await request.json(); } catch { return respond(400, { ok: false }); }
  const scope = String(body.scope || "");
  if (scheme !== "Bearer" || !accessToken || !["set", "acte1"].includes(scope)) return respond(403, { ok: false });
  const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const userResult = await auth.auth.getUser(accessToken), user = userResult.data?.user;
  if (userResult.error || !user) return respond(403, { ok: false });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const grantResult = await admin.from("private_access_grants").select("id,scope,session_version,status,expires_at").eq("user_id", user.id).eq("scope", scope).maybeSingle();
  const grant = grantResult.data;
  if (grantResult.error || !grant || grant.status !== "active" || (grant.expires_at && Date.parse(grant.expires_at) <= Date.now())) return respond(403, { ok: false });
  const token = await createPrivateAccessToken(scope, Number(grant.session_version), signer, Date.now(), grant.id);
  await admin.from("private_access_grants").update({ last_session_at: new Date().toISOString() }).eq("id", grant.id);
  const secure = !["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
  return respond(200, { ok: true, destination: scope === "set" ? "/set" : "/acte1" }, createPrivateAccessCookie(scope, token, secure));
};

export const config = { path: "/api/private-access-session", method: "POST" };
