const encoder = new TextEncoder();
const SESSION_VERSION = 1;
export const ACTE1_SESSION_COOKIE = "morjane_acte1_session";
export const ACTE1_SESSION_TTL_SECONDS = 4 * 60 * 60;

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function safeEqualBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function normalizedPassword(value) {
  return String(value || "").normalize("NFKC");
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`morjane-acte1-session:v1:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function isConfiguredActe1Password(value) {
  return typeof value === "string" && value.length >= 16;
}

export async function acte1PasswordsMatch(submitted, expected) {
  const [submittedDigest, expectedDigest] = await Promise.all([
    digest(normalizedPassword(submitted)),
    digest(normalizedPassword(expected))
  ]);
  return safeEqualBytes(submittedDigest, expectedDigest);
}

export async function createActe1SessionToken(secret, now = Date.now()) {
  const payload = { v: SESSION_VERSION, exp: Math.floor(now / 1000) + ACTE1_SESSION_TTL_SECONDS };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = toBase64Url(await hmac(encodedPayload, secret));
  return `${encodedPayload}.${signature}`;
}

export async function verifyActe1SessionToken(token, secret, now = Date.now()) {
  try {
    const [encodedPayload, encodedSignature, extra] = String(token || "").split(".");
    if (!encodedPayload || !encodedSignature || extra) return false;
    const suppliedSignature = fromBase64Url(encodedSignature);
    const expectedSignature = await hmac(encodedPayload, secret);
    if (!safeEqualBytes(suppliedSignature, expectedSignature)) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload)));
    return payload?.v === SESSION_VERSION && Number.isInteger(payload.exp) && payload.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export function readActe1Cookie(cookieHeader, name) {
  for (const part of String(cookieHeader || "").split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return "";
}

export function createActe1Cookie(token) {
  return [`${ACTE1_SESSION_COOKIE}=${token}`, "Path=/", "HttpOnly", "Secure", "SameSite=Strict", `Max-Age=${ACTE1_SESSION_TTL_SECONDS}`].join("; ");
}

export function clearActe1Cookie() {
  return [`${ACTE1_SESSION_COOKIE}=`, "Path=/", "HttpOnly", "Secure", "SameSite=Strict", "Max-Age=0"].join("; ");
}
