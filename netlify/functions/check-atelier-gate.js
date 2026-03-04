const crypto = require("crypto");

function parseCookies(headerValue) {
  const output = {};
  (headerValue || "").split(";").forEach((entry) => {
    const [key, ...rest] = entry.trim().split("=");
    if (!key) {
      return;
    }
    output[key] = rest.join("=");
  });
  return output;
}

function verifyToken(token, secret) {
  const [payloadB64, signature] = (token || "").split(".");
  if (!payloadB64 || !signature) {
    return false;
  }

  const expectedSignature = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch (_) {
    return false;
  }

  if (!payload || typeof payload.exp !== "number") {
    return false;
  }
  return payload.exp > Math.floor(Date.now() / 1000);
}

exports.handler = async (event) => {
  const cookieSecret = process.env.ATELIER_COOKIE_SECRET;
  if (!cookieSecret) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_env" }),
    };
  }

  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie || "");
  const valid = verifyToken(cookies.atelier_gate, cookieSecret);

  return {
    statusCode: valid ? 200 : 401,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ ok: valid }),
  };
};
