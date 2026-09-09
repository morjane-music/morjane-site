import { PRIVATE_ACCESS_SCOPES, readPrivateAccessCookie, readPrivateAccessTokenPayload, verifyPrivateAccessToken } from "../../functions/_shared/private-access-session.mjs";
import { isConfiguredSetPassword, verifySetSessionToken } from "../../functions/_shared/set-auth.mjs";
import { isConfiguredActe1Password, verifyActe1SessionToken } from "../../functions/_shared/acte1-auth.mjs";

const env = (name) => globalThis.Netlify?.env?.get?.(name) || "";

function privateResponse(message, status) {
  return new Response(message, { status, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
}

async function callRpc(url, anonKey, name, body) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("private_access_state_unavailable");
  return response.json();
}

export function createPrivateAccessProtector({ scope, pagePaths, dependencies = {} }) {
  const definition = PRIVATE_ACCESS_SCOPES[scope];
  return async (request, context) => {
    const isPage = pagePaths.has(new URL(request.url).pathname);
    const unavailable = () => isPage ? privateResponse("Cet accès privé est temporairement indisponible.", 503) : privateResponse("Not Found", 404);
    try {
      const supabaseUrl = dependencies.supabaseUrl ?? env("SUPABASE_URL");
      const anonKey = dependencies.anonKey ?? env("SUPABASE_ANON_KEY");
      if (!supabaseUrl || !anonKey) return unavailable();
      const rpc = dependencies.rpc || callRpc;
      const rows = await rpc(supabaseUrl, anonKey, "private_access_get_state", { requested_scope: scope });
      const state = Array.isArray(rows) ? rows[0] : rows;
      const token = readPrivateAccessCookie(request.headers.get("cookie"), definition.cookie);
      let valid = false;
      const signer = dependencies.cookieSecret ?? env("MORJANE_PRIVATE_ACCESS_COOKIE_SECRET");
      const payload = readPrivateAccessTokenPayload(token);
      if (payload?.gid) {
          if (!signer) return unavailable();
          const grantRows = await rpc(supabaseUrl, anonKey, "private_access_get_grant_state", { requested_grant_id: payload.gid, requested_scope: scope });
          const grant = Array.isArray(grantRows) ? grantRows[0] : grantRows;
          valid = Boolean(grant?.active) && await verifyPrivateAccessToken(token, scope, Number(grant.session_version), signer);
      } else if (state?.configured) {
        if (!signer) return unavailable();
        if (state.enabled) valid = await verifyPrivateAccessToken(token, scope, Number(state.session_version), signer);
      } else if (state && state.configured === false) {
        const legacyPassword = dependencies.legacyPassword ?? env(definition.legacyPasswordEnv);
        if (scope === "set" && isConfiguredSetPassword(legacyPassword)) valid = await verifySetSessionToken(token, legacyPassword);
        if (scope === "acte1" && isConfiguredActe1Password(legacyPassword)) valid = await verifyActe1SessionToken(token, legacyPassword);
      } else return unavailable();
      if (!valid) return isPage ? Response.redirect(new URL(definition.accessPage, request.url), 303) : privateResponse("Not Found", 404);
      const response = await context.next();
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "private, no-store"); headers.set("X-Robots-Tag", "noindex, nofollow, noarchive"); headers.set("Vary", "Cookie");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch { return unavailable(); }
  };
}
