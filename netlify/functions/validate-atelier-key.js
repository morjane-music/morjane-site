const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 80);
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function cleanPublicKeyRow(row) {
  return {
    label: row.label || "Cle Atelier",
    member_status: row.member_status || "member",
    audience_segment: row.audience_segment || "public",
  };
}

exports.handler = async (event) => {
  const startedAt = Date.now();
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { ok: false, error: "missing_env" });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    payload = {};
  }

  const normalizedKey = normalizeKey(payload.key);
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  if (normalizedKey.length < 8) {
    await trackFunctionEvent(supabase, {
      function_name: "validate-atelier-key",
      status: "error",
      error_code: "invalid_key",
      latency_ms: Date.now() - startedAt,
    });
    return json(400, { ok: false, error: "invalid_key" });
  }

  const keyHash = hashValue(normalizedKey);
  const claimToken = crypto.randomBytes(24).toString("base64url");
  const claimTokenHash = hashValue(claimToken);
  const claimExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const update = await supabase.rpc("atelier_claim_invitation_key", {
    target_key_hash: keyHash,
    target_claim_token_hash: claimTokenHash,
    target_claim_expires_at: claimExpiresAt,
  });

  if (update.error) {
    await trackFunctionEvent(supabase, {
      function_name: "validate-atelier-key",
      status: "error",
      error_code: "claim_prepare_failed",
      latency_ms: Date.now() - startedAt,
      meta: { message: update.error.message || null },
    });
    return json(500, { ok: false, error: "claim_prepare_failed" });
  }
  const key = update.data && typeof update.data === "object" ? update.data : null;
  if (!key?.ok) {
    await trackFunctionEvent(supabase, {
      function_name: "validate-atelier-key",
      status: "error",
      error_code: "key_unavailable",
      latency_ms: Date.now() - startedAt,
    });
    return json(403, { ok: false, error: "key_unavailable" });
  }

  await trackFunctionEvent(supabase, {
    function_name: "validate-atelier-key",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { key_id: key.id, segment: key.audience_segment, member_status: key.member_status },
  });

  return json(200, {
    ok: true,
    claimToken,
    expiresIn: 900,
    key: cleanPublicKeyRow(key),
  });
};
