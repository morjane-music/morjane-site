import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function bearer(request) {
  const [scheme, token] = String(request.headers.get("authorization") || "").split(" ");
  return scheme === "Bearer" ? token || "" : "";
}

function gateValid(cookieHeader, secret, userId) {
  const token = String(cookieHeader || "").split(";").map(v => v.trim()).find(v => v.startsWith("atelier_admin_gate="))?.slice(19) || "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(signature); const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.uid === userId && Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

export async function authenticatePrivateAccessAdmin(request, config, dependencies = {}) {
  const token = bearer(request);
  if (!token) return { ok: false, status: 401, error: "missing_token" };
  const authClient = dependencies.authClient || createClient(config.supabaseUrl, config.anonKey, { auth: { persistSession: false } });
  const userResult = await authClient.auth.getUser(token);
  const user = userResult.data?.user;
  if (userResult.error || !user) return { ok: false, status: 401, error: "invalid_token" };
  const adminClient = dependencies.adminClient || createClient(config.supabaseUrl, config.serviceRoleKey, { auth: { persistSession: false } });
  const profile = await adminClient.from("atelier_profiles").select("id,role").eq("id", user.id).maybeSingle();
  if (profile.error || profile.data?.role !== "admin") return { ok: false, status: 403, error: "forbidden" };
  if (!gateValid(request.headers.get("cookie"), config.adminCookieSecret, user.id)) return { ok: false, status: 401, error: "admin_gate_required" };
  return { ok: true, user, adminClient };
}
