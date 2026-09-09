import { createPrivateAccessStore } from "./private-access-store.mjs";
import { privateAccessIdentifier, verifyPrivatePassword } from "./private-access-password.mjs";
import { createPrivateAccessCookie, createPrivateAccessToken, PRIVATE_ACCESS_SCOPES } from "./private-access-session.mjs";
import { createSetSessionToken, isConfiguredSetPassword, passwordsMatch } from "./set-auth.mjs";
import { acte1PasswordsMatch, createActe1SessionToken, isConfiguredActe1Password } from "./acte1-auth.mjs";

function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || "";
}

function redirect(location, cookie) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Location": location,
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive"
  });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

function legacyHelpers(scope) {
  return scope === "set"
    ? { configured: isConfiguredSetPassword, matches: passwordsMatch, token: createSetSessionToken }
    : { configured: isConfiguredActe1Password, matches: acte1PasswordsMatch, token: createActe1SessionToken };
}

export function createPrivateAccessLoginHandler(scope, dependencies = {}) {
  const definition = PRIVATE_ACCESS_SCOPES[scope];
  if (!definition) throw new Error("invalid_private_access_scope");
  return async function privateAccessLogin(request, context = {}) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { "Allow": "POST", "Cache-Control": "no-store" } });
    const requestUrl = new URL(request.url);
    const origin = request.headers.get("origin");
    if (origin && origin !== requestUrl.origin) return new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });

    let submittedPassword = "";
    try {
      const formData = await request.formData();
      submittedPassword = String(formData.get("password") || "").slice(0, 512);
    } catch {
      return redirect(`${definition.accessPage}?error=invalid`);
    }

    const signer = dependencies.cookieSecret ?? env("MORJANE_PRIVATE_ACCESS_COOKIE_SECRET");
    const serviceRoleKey = dependencies.serviceRoleKey ?? env("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = dependencies.supabaseUrl ?? env("SUPABASE_URL");
    if (!signer || !serviceRoleKey || !supabaseUrl) return redirect(`${definition.accessPage}?error=invalid`);

    let store;
    try {
      store = dependencies.store || createPrivateAccessStore({ supabaseUrl, serviceRoleKey });
    } catch {
      return redirect(`${definition.accessPage}?error=invalid`);
    }
    const ip = context.ip || request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const identifier = privateAccessIdentifier(scope, ip, signer);
    if (!(await store.registerAttempt(scope, identifier))) return redirect(`${definition.accessPage}?error=invalid`);

    const result = await store.getCredential(scope);
    if (result.status === "error") return redirect(`${definition.accessPage}?error=invalid`);

    let accepted = false;
    let token = "";
    if (result.status === "configured") {
      const credential = result.credential;
      if (credential.enabled) accepted = await verifyPrivatePassword(submittedPassword, credential.password_hash);
      if (accepted) token = await createPrivateAccessToken(scope, Number(credential.session_version), signer);
    } else if (result.status === "missing") {
      const legacyPassword = dependencies.legacyPassword ?? env(definition.legacyPasswordEnv);
      const legacy = legacyHelpers(scope);
      if (legacy.configured(legacyPassword)) accepted = await legacy.matches(submittedPassword, legacyPassword);
      if (accepted) token = await legacy.token(legacyPassword);
    }

    if (!accepted) return redirect(`${definition.accessPage}?error=invalid`);
    await store.clearAttempts(scope, identifier);
    const secure = !["localhost", "127.0.0.1"].includes(requestUrl.hostname);
    return redirect(definition.destination, createPrivateAccessCookie(scope, token, secure));
  };
}
