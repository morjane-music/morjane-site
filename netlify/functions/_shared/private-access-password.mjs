import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

export function normalizePrivatePassword(value) {
  return String(value || "").normalize("NFKC");
}

export function validatePrivatePassword(value) {
  const normalized = normalizePrivatePassword(value);
  if (normalized.length < 12) return { ok: false, error: "Le mot de passe doit contenir au moins 12 caractères." };
  if (normalized.length > 128) return { ok: false, error: "Le mot de passe est trop long." };
  return { ok: true, password: normalized };
}

export async function hashPrivatePassword(value) {
  const validation = validatePrivatePassword(value);
  if (!validation.ok) throw new Error("invalid_private_access_password");
  const salt = randomBytes(16);
  const derived = await scrypt(validation.password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyPrivatePassword(value, encodedHash) {
  try {
    const [algorithm, n, r, p, saltValue, hashValue, extra] = String(encodedHash || "").split("$");
    if (algorithm !== "scrypt" || extra) return false;
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
    const actual = Buffer.from(await scrypt(normalizePrivatePassword(value), salt, expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024
    }));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function privateAccessIdentifier(scope, ip, secret) {
  return createHmac("sha256", secret).update(`${scope}:${ip || "unknown"}`).digest("hex");
}
