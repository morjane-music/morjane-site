const crypto = require("crypto");

function safeEqual(a, b) {
  const aBuffer = Buffer.from(a || "", "utf8");
  const bBuffer = Buffer.from(b || "", "utf8");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function normalizePass(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .trim();
}

function signToken(payload, secret) {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
    };
  }

  const expectedPassword = process.env.ATELIER_PASSWORD;
  const cookieSecret = process.env.ATELIER_COOKIE_SECRET;

  if (!expectedPassword || !cookieSecret) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_env" }),
    };
  }

  let pass = "";
  try {
    const parsed = JSON.parse(event.body || "{}");
    pass = parsed.pass || "";
  } catch (_) {
    pass = "";
  }

  const normalizedPass = normalizePass(pass);
  const normalizedExpected = normalizePass(expectedPassword);
  const isMainMatch = safeEqual(normalizedPass, normalizedExpected);
  if (!isMainMatch) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "wrong_password" }),
    };
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const token = signToken({ exp: expiresAt, v: 1 }, cookieSecret);
  const cookie = [
    `atelier_gate=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${7 * 24 * 60 * 60}`,
  ].join("; ");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ ok: true }),
  };
};
