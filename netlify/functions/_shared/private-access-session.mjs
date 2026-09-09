const encoder = new TextEncoder();

export const PRIVATE_ACCESS_TTL_SECONDS = 4 * 60 * 60;
export const PRIVATE_ACCESS_SCOPES = Object.freeze({
  set: { cookie: "morjane_set_session", legacyPasswordEnv: "MORJANE_SET_PASSWORD", destination: "/set", accessPage: "/set-access" },
  acte1: { cookie: "morjane_acte1_session", legacyPasswordEnv: "MORJANE_ACTE1_PASSWORD", destination: "/acte1", accessPage: "/acte1-access" }
});

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`morjane-private-access:v2:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function readPrivateAccessCookie(cookieHeader, name) {
  for (const part of String(cookieHeader || "").split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return "";
}

export async function createPrivateAccessToken(scope, sessionVersion, secret, now = Date.now(), grantId = "") {
  if (!PRIVATE_ACCESS_SCOPES[scope] || !Number.isInteger(sessionVersion) || sessionVersion < 1 || !secret) throw new Error("invalid_private_access_session");
  const payload = { v: 2, scope, sv: sessionVersion, exp: Math.floor(now / 1000) + PRIVATE_ACCESS_TTL_SECONDS, ...(grantId ? { gid: grantId } : {}) };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${encodedPayload}.${toBase64Url(await hmac(encodedPayload, secret))}`;
}

export function readPrivateAccessTokenPayload(token) {
  try {
    const encodedPayload = String(token || "").split(".")[0];
    return JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload)));
  } catch {
    return null;
  }
}

export async function verifyPrivateAccessToken(token, scope, sessionVersion, secret, now = Date.now()) {
  try {
    const [encodedPayload, encodedSignature, extra] = String(token || "").split(".");
    if (!encodedPayload || !encodedSignature || extra || !secret) return false;
    if (!safeEqual(fromBase64Url(encodedSignature), await hmac(encodedPayload, secret))) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload)));
    return payload?.v === 2 && payload.scope === scope && payload.sv === sessionVersion
      && Number.isInteger(payload.exp) && payload.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export function createPrivateAccessCookie(scope, token, secure = true) {
  const definition = PRIVATE_ACCESS_SCOPES[scope];
  if (!definition) throw new Error("invalid_private_access_scope");
  return [
    `${definition.cookie}=${token}`,
    "Path=/",
    "HttpOnly",
    ...(secure ? ["Secure"] : []),
    "SameSite=Strict",
    `Max-Age=${PRIVATE_ACCESS_TTL_SECONDS}`
  ].join("; ");
}
