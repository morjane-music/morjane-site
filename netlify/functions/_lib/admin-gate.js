const crypto = require("crypto");

function parseCookies(cookieHeader = "") {
  const out = {};
  cookieHeader.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (!k) return;
    out[k] = rest.join("=");
  });
  return out;
}

function signPayload(payload, secret) {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

function verifyToken(token, secret) {
  const [payloadB64, sig] = String(token || "").split(".");
  if (!payloadB64 || !sig) return { ok: false };

  const expectedSig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false };

  let payload = null;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch (_) {
    return { ok: false };
  }

  if (!payload?.exp || typeof payload.exp !== "number") return { ok: false };
  if (Math.floor(Date.now() / 1000) > payload.exp) return { ok: false };
  return { ok: true, payload };
}

function createAdminGateCookie(secret, userId, maxAgeSeconds = 60 * 60 * 12) {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const token = signPayload({ v: 1, uid: userId, exp }, secret);
  return [
    `atelier_admin_gate=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

function hasValidAdminGate(event, secret, userId) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies.atelier_admin_gate;
  const result = verifyToken(token, secret);
  if (!result.ok) return false;
  return result.payload.uid === userId;
}

module.exports = {
  createAdminGateCookie,
  hasValidAdminGate,
};

