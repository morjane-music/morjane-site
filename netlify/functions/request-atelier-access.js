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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function cleanToken(value) {
  return String(value || "").trim().slice(0, 160);
}

function isOpenStatus(status) {
  return ["member", "priority", "founder"].includes(String(status || ""));
}

async function getKeyGrantFromToken(supabase, token) {
  const cleaned = cleanToken(token);
  if (!cleaned) {
    return { grant: null, error: null };
  }

  const tokenHash = hashValue(cleaned);
  const result = await supabase
    .from("atelier_invitation_keys")
    .select("id, label, member_status, audience_segment, max_uses, uses_count, is_active, expires_at, claim_token_expires_at")
    .eq("claim_token_hash", tokenHash)
    .maybeSingle();

  if (result.error) {
    return { grant: null, error: "key_lookup_failed", detail: result.error.message || "" };
  }

  const key = result.data;
  const expired = key?.expires_at && new Date(key.expires_at).getTime() <= Date.now();
  const claimExpired = key?.claim_token_expires_at && new Date(key.claim_token_expires_at).getTime() <= Date.now();
  const exhausted = key && Number(key.uses_count || 0) >= Number(key.max_uses || 1);
  if (!key || !key.is_active || expired || claimExpired || exhausted) {
    return { grant: null, error: "key_unavailable" };
  }

  return { grant: key, error: null };
}
function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanChoice(value, allowed, fallback = null) {
  const text = String(value || "").trim().toLowerCase();
  return allowed.includes(text) ? text : fallback;
}

function cleanWave(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
}

function cleanEntry(rawEntry) {
  const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
  return {
    source: cleanChoice(entry.source, ["site", "qr", "concert", "instagram", "email", "invitation", "bouche_a_oreille", "direct", "autre"], "site"),
    door: cleanWave(entry.door) || "direct",
    segment: cleanChoice(entry.segment, ["public", "proche", "artiste", "pro"], null),
  };
}

function getProfileSource(entry) {
  if (["concert", "instagram", "email", "invitation", "bouche_a_oreille", "autre"].includes(entry.source)) {
    return entry.source;
  }
  if (["concert", "instagram", "invitation"].includes(entry.door)) {
    return entry.door;
  }
  return "site";
}

function getRedirectTo(value) {
  const fallback = "https://morjane.re/atelier/";
  try {
    const url = new URL(String(value || fallback));
    const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
    const isMorjane = url.hostname === "morjane.re" || url.hostname === "www.morjane.re";
    if ((isLocal || isMorjane) && url.pathname.startsWith("/atelier")) {
      return url.toString();
    }
  } catch (_) {
    // Use production fallback.
  }
  return fallback;
}

async function findAuthUserByEmail(supabase, email) {
  for (let page = 1; page <= 5; page += 1) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) {
      return { user: null, error: result.error.message || "user_lookup_failed" };
    }
    const users = result.data?.users || [];
    const found = users.find((user) => String(user.email || "").toLowerCase() === email);
    if (found || users.length < 1000) {
      return { user: found || null, error: null };
    }
  }
  return { user: null, error: null };
}

async function getOrCreateAuthUser(supabase, email) {
  const found = await findAuthUserByEmail(supabase, email);
  if (found.error) {
    return { user: null, error: found.error };
  }
  if (found.user) {
    return { user: found.user, created: false, error: null };
  }

  const created = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      atelier_requested_at: new Date().toISOString(),
    },
  });

  if (!created.error && created.data?.user) {
    return { user: created.data.user, created: true, error: null };
  }

  const retry = await findAuthUserByEmail(supabase, email);
  if (retry.user) {
    return { user: retry.user, created: false, error: null };
  }
  return { user: null, error: created.error?.message || retry.error || "user_create_failed" };
}

async function prepareProfile(supabase, user, email, entry, keyGrant = null) {
  const existing = await supabase
    .from("atelier_profiles")
    .select("id, role, member_status, audience_status, audience_segment, source, access_source, access_wave")
    .eq("id", user.id)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: "profile_lookup_failed", detail: existing.error.message || "" };
  }

  const current = existing.data || {};
  const keyStatus = keyGrant?.member_status === "priority" ? "priority" : "member";
  const shouldOpenWithKey = keyGrant && !isOpenStatus(current.member_status);
  const payload = {
    id: user.id,
    email,
    role: current.role || "member",
    member_status: shouldOpenWithKey ? keyStatus : (current.member_status || "pending"),
    audience_status: shouldOpenWithKey ? (keyStatus === "priority" ? "vip" : "approved") : (current.audience_status || "new"),
    audience_segment: current.audience_segment || keyGrant?.audience_segment || entry.segment || null,
    source: current.source || (keyGrant ? "invitation" : getProfileSource(entry)),
    access_source: current.access_source || (keyGrant ? "invitation" : entry.source || "site"),
    access_wave: current.access_wave || (keyGrant ? `key:${keyGrant.label || keyGrant.id}` : entry.door || "direct"),
  };

  const saved = await supabase
    .from("atelier_profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, member_status")
    .maybeSingle();

  if (saved.error) {
    return { ok: false, error: "profile_upsert_failed", detail: saved.error.message || "" };
  }

  return { ok: true, profile: saved.data };
}

async function sendMagicLink(supabaseUrl, anonKey, email, redirectTo) {
  const authClient = createClient(supabaseUrl, anonKey);
  const result = await authClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });
  if (result.error) {
    return { ok: false, error: result.error.message || "magic_link_failed" };
  }
  return { ok: true };
}

async function logMagicLink(supabase, email, result, errorCode = null) {
  const saved = await supabase.from("atelier_magic_link_events").insert({
    email,
    result,
    error_code: errorCode,
  });
  return !saved.error;
}

async function sendAdminNotification(email, entry = {}) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const to = process.env.ATELIER_ADMIN_EMAIL || "";
  if (!apiKey || !to || !email) {
    return false;
  }

  const from = process.env.ATELIER_FROM_EMAIL
    || process.env.ATELIER_DIGEST_FROM_EMAIL
    || process.env.RESEND_FROM_EMAIL
    || "Atelier Morjane <atelier@morjane.re>";
  const atelierUrl = "https://morjane.re/atelier/";
  const entryText = [entry.source, entry.door].filter(Boolean).join(" / ");
  const safeEntryText = escapeHtml(entryText);
  const safeEmail = escapeHtml(email);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Nouvelle demande Atelier Morjane",
      text: [
        "Nouvelle demande d'acces a l'Atelier Morjane.",
        "",
        `Email : ${email}`,
        entryText ? `Entree : ${entryText}` : "",
        `Admin : ${atelierUrl}`,
      ].filter(Boolean).join("\n"),
      html: `<p>Nouvelle demande d'acces a l'Atelier Morjane.</p><p><strong>${safeEmail}</strong></p>${safeEntryText ? `<p>Entree : ${safeEntryText}</p>` : ""}<p><a href="${atelierUrl}">Ouvrir l'Atelier</a></p>`,
    }),
  });

  return res.ok;
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

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    payload = {};
  }

  const email = cleanEmail(payload.email);
  const entry = cleanEntry(payload.entry);
  const redirectTo = getRedirectTo(payload.redirectTo);
  const keyToken = cleanToken(payload.keyToken);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (!isValidEmail(email)) {
    await trackFunctionEvent(supabase, {
      function_name: "request-atelier-access",
      status: "error",
      error_code: "invalid_email",
      latency_ms: Date.now() - startedAt,
      meta: { entry_source: entry.source, entry_door: entry.door },
    });
    return json(400, { ok: false, error: "invalid_email" });
  }

  const keyGrantResult = await getKeyGrantFromToken(supabase, keyToken);
  if (keyGrantResult.error) {
    await trackFunctionEvent(supabase, {
      function_name: "request-atelier-access",
      status: "error",
      error_code: keyGrantResult.error,
      latency_ms: Date.now() - startedAt,
      meta: { entry_source: entry.source, entry_door: entry.door, detail: keyGrantResult.detail || null },
    });
    return json(403, { ok: false, error: keyGrantResult.error });
  }
  const keyGrant = keyGrantResult.grant;

  const authUser = await getOrCreateAuthUser(supabase, email);
  if (!authUser.user) {
    await trackFunctionEvent(supabase, {
      function_name: "request-atelier-access",
      status: "error",
      error_code: "user_prepare_failed",
      latency_ms: Date.now() - startedAt,
      meta: { message: authUser.error || null },
    });
    await logMagicLink(supabase, email, "error", "user_prepare_failed");
    return json(500, { ok: false, error: "request_failed" });
  }

  const prepared = await prepareProfile(supabase, authUser.user, email, entry, keyGrant);
  if (!prepared.ok) {
    await trackFunctionEvent(supabase, {
      function_name: "request-atelier-access",
      status: "error",
      error_code: prepared.error,
      latency_ms: Date.now() - startedAt,
      meta: { message: prepared.detail || null },
    });
    await logMagicLink(supabase, email, "error", prepared.error);
    return json(500, { ok: false, error: "profile_prepare_failed" });
  }

  const magic = await sendMagicLink(supabaseUrl, anonKey, email, redirectTo);
  if (!magic.ok) {
    const lower = String(magic.error || "").toLowerCase();
    const errorCode = lower.includes("rate limit") ? "rate_limited" : "magic_link_failed";
    await logMagicLink(supabase, email, "error", errorCode);
    await trackFunctionEvent(supabase, {
      function_name: "request-atelier-access",
      status: "error",
      error_code: errorCode,
      latency_ms: Date.now() - startedAt,
      meta: { message: magic.error || null, profile_prepared: true },
    });
    return json(errorCode === "rate_limited" ? 429 : 500, { ok: false, error: errorCode });
  }

  await logMagicLink(supabase, email, "sent");

  if (keyGrant) {
    await supabase
      .from("atelier_invitation_keys")
      .update({
        uses_count: Number(keyGrant.uses_count || 0) + 1,
        claimed_by: authUser.user.id,
        claimed_email: email,
        claimed_at: new Date().toISOString(),
        claim_token_hash: null,
        claim_token_expires_at: null,
      })
      .eq("id", keyGrant.id);
  }

  const alreadyInside = ["member", "priority", "founder"].includes(prepared.profile?.member_status);
  const notified = alreadyInside ? false : await sendAdminNotification(email, entry);

  await trackFunctionEvent(supabase, {
    function_name: "request-atelier-access",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: {
      notified,
      already_inside: alreadyInside,
      auth_user_created: Boolean(authUser.created),
      entry_source: entry.source,
      entry_door: entry.door,
      entry_segment: entry.segment,
      key_grant: Boolean(keyGrant),
    },
  });

  return json(200, { ok: true });
};
