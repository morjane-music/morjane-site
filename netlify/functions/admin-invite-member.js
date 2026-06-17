const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");
const { hasValidAdminGate } = require("./_lib/admin-gate");

function getBearerToken(header) {
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : "";
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

async function generateInviteLink(supabase, email, redirectTo, existingProfile) {
  const preferredType = existingProfile?.id ? "magiclink" : "invite";
  const fallbackType = preferredType === "invite" ? "magiclink" : "invite";

  let result = await supabase.auth.admin.generateLink({
    type: preferredType,
    email,
    options: { redirectTo },
  });

  if (result.error) {
    result = await supabase.auth.admin.generateLink({
      type: fallbackType,
      email,
      options: { redirectTo },
    });
  }

  if (result.error) {
    return { ok: false, error: result.error.message || "link_failed" };
  }

  const actionLink = result.data?.properties?.action_link || "";
  const userId = result.data?.user?.id || existingProfile?.id || "";
  if (!actionLink || !userId) {
    return { ok: false, error: "missing_link" };
  }

  return { ok: true, actionLink, userId };
}

async function sendInvitationEmail(email, actionLink, status, segment) {
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) {
    return { ok: false, error: "missing_resend_key" };
  }

  const from = process.env.ATELIER_FROM_EMAIL
    || process.env.ATELIER_DIGEST_FROM_EMAIL
    || process.env.RESEND_FROM_EMAIL
    || "Atelier Morjane <atelier@morjane.re>";
  const subject = "Morjane t'ouvre l'Atelier";
  const statusLine = status === "priority" ? "Ton acces prioritaire est pret." : "Ton acces est pret.";
  const text = [
    "Morjane t'ouvre l'Atelier.",
    "",
    statusLine,
    "Tu peux entrer avec ce lien :",
    actionLink,
    "",
    `Profil d'ecoute : ${segment}`,
    "",
    "Le lien reste personnel. Ne le transfere pas.",
  ].join("\n");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#090706;color:#f4efe7;padding:24px">
      <p style="color:#c99852;letter-spacing:.12em;text-transform:uppercase;margin:0 0 16px">Atelier Morjane</p>
      <h1 style="font-size:22px;margin:0 0 14px">Morjane t'ouvre l'Atelier.</h1>
      <p style="color:#c8bcae;line-height:1.6">${statusLine}</p>
      <p style="margin:24px 0">
        <a href="${actionLink}" style="display:inline-block;border:1px solid #c99852;color:#f4efe7;text-decoration:none;padding:12px 16px;border-radius:999px">Entrer dans l'Atelier</a>
      </p>
      <p style="color:#9d9183;font-size:13px;line-height:1.6">Profil d'ecoute : ${segment}. Le lien reste personnel. Ne le transfere pas.</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: email, subject, text, html }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const message = String(detail.message || detail.error || "").toLowerCase();
    if (res.status === 403) {
      return {
        ok: false,
        error: "resend_forbidden_sender",
        detail: detail.message || detail.error || "",
      };
    }
    if (message.includes("domain") || message.includes("from")) {
      return {
        ok: false,
        error: "resend_sender_not_verified",
        detail: detail.message || detail.error || "",
      };
    }
    return { ok: false, error: `resend_${res.status}`, detail: detail.message || detail.error || "" };
  }
  return { ok: true };
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
      function_name: "admin-invite-member",
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

  const email = cleanEmail(payload.email);
  const allowedSegments = ["public", "proche", "artiste", "pro"];
  const allowedStatuses = ["member", "priority"];
  const audienceSegment = allowedSegments.includes(payload.audience_segment) ? payload.audience_segment : "public";
  const memberStatus = allowedStatuses.includes(payload.member_status) ? payload.member_status : "member";
  const note = typeof payload.admin_note === "string" ? payload.admin_note.trim().slice(0, 1200) : "";

  if (!isValidEmail(email)) {
    return json(400, { ok: false, error: "invalid_email" });
  }

  const supabase = auth.adminClient;
  const redirectTo = "https://morjane.re/atelier/";
  const existingProfile = await supabase
    .from("atelier_profiles")
    .select("id, email, member_status, audience_segment")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile.error) {
    return json(500, { ok: false, error: "profile_lookup_failed" });
  }

  const link = await generateInviteLink(supabase, email, redirectTo, existingProfile.data);
  if (!link.ok) {
    await trackFunctionEvent(supabase, {
      function_name: "admin-invite-member",
      status: "error",
      error_code: link.error,
      latency_ms: Date.now() - startedAt,
      meta: { email },
    });
    return json(500, { ok: false, error: "link_failed" });
  }

  const profilePayload = {
    id: link.userId,
    email,
    role: "member",
    member_status: memberStatus,
    audience_status: memberStatus === "priority" ? "vip" : "approved",
    audience_segment: audienceSegment,
    source: "invitation",
    access_source: "invitation",
    admin_note: note || existingProfile.data?.admin_note || null,
    last_admin_action_at: new Date().toISOString(),
  };

  const upsert = await supabase
    .from("atelier_profiles")
    .upsert(profilePayload, { onConflict: "id" })
    .select("id")
    .maybeSingle();

  if (upsert.error) {
    await trackFunctionEvent(supabase, {
      function_name: "admin-invite-member",
      status: "error",
      error_code: "profile_upsert_failed",
      latency_ms: Date.now() - startedAt,
      meta: { email, message: upsert.error.message || null },
    });
    return json(500, { ok: false, error: "profile_upsert_failed" });
  }

  const sent = await sendInvitationEmail(email, link.actionLink, memberStatus, audienceSegment);
  if (!sent.ok) {
    return json(500, { ok: false, error: sent.error });
  }

  await supabase.from("atelier_admin_audit_logs").insert({
    admin_user_id: auth.adminUserId,
    action: "member_invited",
    target_type: "atelier_profile",
    target_id: link.userId,
    details: {
      target_email: email,
      member_status: memberStatus,
      audience_segment: audienceSegment,
      source: "invitation",
    },
  });

  await trackFunctionEvent(supabase, {
    function_name: "admin-invite-member",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { email, member_status: memberStatus, audience_segment: audienceSegment },
  });

  return json(200, { ok: true, email, userId: link.userId });
};
