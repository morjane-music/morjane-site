const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");
const { hasValidAdminGate } = require("./_lib/admin-gate");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function getBearerToken(header) {
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : "";
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function normalizeKey(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function generateRawKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chars = Array.from(crypto.randomBytes(12), (byte) => alphabet[byte % alphabet.length]);
  return `MOR-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

async function authenticateAdmin(event, supabaseUrl, anonKey, serviceRoleKey) {
  const token = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!token) return { ok: false, statusCode: 401, error: "missing_token" };

  const authClient = createClient(supabaseUrl, anonKey);
  const userResult = await authClient.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return { ok: false, statusCode: 401, error: "invalid_token" };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const profileResult = await adminClient
    .from("atelier_profiles")
    .select("id, role")
    .eq("id", userResult.data.user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data || profileResult.data.role !== "admin") {
    return { ok: false, statusCode: 403, error: "forbidden" };
  }

  const cookieSecret = process.env.ATELIER_COOKIE_SECRET || "";
  if (!cookieSecret || !hasValidAdminGate(event, cookieSecret, userResult.data.user.id)) {
    return { ok: false, statusCode: 401, error: "admin_gate_required" };
  }

  return { ok: true, adminClient, adminUserId: userResult.data.user.id };
}

exports.handler = async (event) => {
  const startedAt = Date.now();
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { ok: false, error: "missing_env" });
  }

  const auth = await authenticateAdmin(event, supabaseUrl, anonKey, serviceRoleKey);
  if (!auth.ok) {
    await trackFunctionEvent(createClient(supabaseUrl, serviceRoleKey), {
      function_name: "admin-create-invite-key",
      status: "error",
      error_code: auth.error,
      latency_ms: Date.now() - startedAt,
    });
    return json(auth.statusCode, { ok: false, error: auth.error });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    payload = {};
  }

  const allowedSegments = ["public", "proche", "artiste", "pro"];
  const allowedStatuses = ["member", "priority"];
  const audienceSegment = allowedSegments.includes(payload.audience_segment) ? payload.audience_segment : "public";
  const memberStatus = allowedStatuses.includes(payload.member_status) ? payload.member_status : "member";
  const label = String(payload.label || "Cle Atelier").trim().slice(0, 120) || "Cle Atelier";
  const maxUses = Math.max(1, Math.min(50, Number.parseInt(payload.max_uses, 10) || 1));
  const adminNote = String(payload.admin_note || "").trim().slice(0, 1200) || null;
  const expiresAt = payload.expires_at ? new Date(payload.expires_at) : null;
  const safeExpiresAt = expiresAt && Number.isFinite(expiresAt.getTime()) ? expiresAt.toISOString() : null;

  const supabase = auth.adminClient;
  let rawKey = "";
  let insert = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    rawKey = generateRawKey();
    const normalized = normalizeKey(rawKey);
    insert = await supabase
      .from("atelier_invitation_keys")
      .insert({
        key_hash: hashValue(normalized),
        label,
        member_status: memberStatus,
        audience_segment: audienceSegment,
        source: "invitation",
        access_wave: "key",
        max_uses: maxUses,
        expires_at: safeExpiresAt,
        created_by: auth.adminUserId,
        admin_note: adminNote,
      })
      .select("id")
      .maybeSingle();
    if (!insert.error) break;
    if (!String(insert.error.message || "").toLowerCase().includes("duplicate")) break;
  }

  if (insert?.error || !insert?.data?.id) {
    await trackFunctionEvent(supabase, {
      function_name: "admin-create-invite-key",
      status: "error",
      error_code: "insert_failed",
      latency_ms: Date.now() - startedAt,
      meta: { message: insert?.error?.message || null },
    });
    return json(500, { ok: false, error: "key_create_failed" });
  }

  const url = new URL("https://morjane.re/atelier/");
  url.searchParams.set("source", "invitation");
  url.searchParams.set("door", "key");
  url.searchParams.set("key", rawKey);

  await trackFunctionEvent(supabase, {
    function_name: "admin-create-invite-key",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { key_id: insert.data.id, audience_segment: audienceSegment, member_status: memberStatus, max_uses: maxUses },
  });

  return json(200, {
    ok: true,
    key: rawKey,
    url: url.toString(),
    id: insert.data.id,
  });
};