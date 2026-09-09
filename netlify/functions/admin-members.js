const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");
const { hasValidAdminGate } = require("./_lib/admin-gate");
const { canRecoverProfile } = require("./_lib/atelier-access");

function getBearerToken(header) {
  if (!header) {
    return "";
  }
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return "";
  }
  return token;
}

async function authenticateAdmin(event, supabaseUrl, anonKey, serviceRoleKey) {
  const token = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!token) {
    return { ok: false, statusCode: 401, error: "missing_token" };
  }

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

const QUEUE_FIELDS = [
  "audience_status",
  "audience_segment",
  "source",
  "access_source",
  "access_wave",
  "admin_note",
  "last_admin_action_at",
  "adult_confirmed_at",
];

function hasMissingQueueColumns(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return QUEUE_FIELDS.some((field) => text.includes(field));
}

function cleanText(value, maxLength = 240) {
  if (typeof value !== "string") {
    return null;
  }
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanPageNumber(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(max, parsed)) : fallback;
}

function cleanSearch(value) {
  return String(value || "")
    .trim()
    .replace(/[(),%_]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function applyProfileFilters(query, { view, search, segment }) {
  let next = query;
  if (view === "decision") {
    next = next
      .in("member_status", ["none", "pending"])
      .or("audience_status.is.null,audience_status.in.(new,waiting)");
  } else if (view === "members") {
    next = next.or("role.eq.admin,member_status.in.(member,founder,priority)");
  } else if (view === "history") {
    next = next.or("member_status.in.(blocked,archived),audience_status.in.(refused,archived)");
  }
  if (segment) {
    next = next.eq("audience_segment", segment);
  }
  if (search) {
    const pattern = `*${search}*`;
    next = next.or(`email.ilike.${pattern},source.ilike.${pattern},access_source.ilike.${pattern},access_wave.ilike.${pattern}`);
  }
  return next;
}

async function wasAccessEmailSentRecently(supabase, userId, seconds = 60) {
  const since = new Date(Date.now() - seconds * 1000).toISOString();
  const result = await supabase
    .from("atelier_admin_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("target_type", "atelier_profile")
    .eq("target_id", userId)
    .eq("action", "member_access_email_sent")
    .gte("created_at", since);
  return !result.error && Number(result.count || 0) > 0;
}

function getUpdateForAction(action) {
  if (action === "approve" || action === "approve_and_send_access_email") {
    return { member_status: "member", role: "member", audience_status: "approved" };
  }
  if (action === "vip") {
    return { member_status: "priority", role: "member", audience_status: "vip" };
  }
  if (action === "refuse") {
    return { member_status: "blocked", role: "member", audience_status: "refused" };
  }
  if (action === "archive") {
    return { member_status: "archived", audience_status: "archived" };
  }
  if (action === "revoke") {
    return { member_status: "pending", role: "member", audience_status: "waiting" };
  }
  return null;
}

async function sendAccessEmail(supabase, userId) {
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) {
    return { ok: false, error: "missing_resend_key" };
  }
  const profile = await supabase
    .from("atelier_profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const to = profile.data?.email || "";
  if (profile.error || !to) {
    return { ok: false, error: "missing_email" };
  }
  let link = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: to,
    options: { redirectTo: "https://morjane.re/atelier/" },
  });
  if (link.error) {
    link = await supabase.auth.admin.generateLink({
      type: "invite",
      email: to,
      options: { redirectTo: "https://morjane.re/atelier/" },
    });
  }
  const actionLink = link.data?.properties?.action_link || "";
  const emailOtp = link.data?.properties?.email_otp || "";
  if (link.error || !actionLink) {
    return { ok: false, error: "access_link_failed" };
  }
  const from = process.env.ATELIER_FROM_EMAIL
    || process.env.ATELIER_DIGEST_FROM_EMAIL
    || process.env.RESEND_FROM_EMAIL
    || "Atelier Morjane <atelier@morjane.re>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Ton accès à l'Atelier Morjane est ouvert",
      text: `Ton accès à l'Atelier est ouvert.\n\nEntre ici : ${actionLink}${emailOtp ? `\n\nCode de secours : ${emailOtp}` : ""}\n\nCe lien est personnel.`,
      html: `<p>Ton accès à l'Atelier est ouvert.</p><p><a href="${actionLink}">Entrer dans l'Atelier</a></p>${emailOtp ? `<p>Code de secours : <strong>${emailOtp}</strong></p>` : ""}<p>Ce lien est personnel.</p>`,
    }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    if (res.status === 403) {
      return { ok: false, error: "resend_forbidden_sender", detail: detail.message || detail.error || "" };
    }
    return { ok: false, error: `resend_${res.status}`, detail: detail.message || detail.error || "" };
  }
  return { ok: true, email: to };
}

async function getTargetProfile(supabase, userId) {
  const result = await supabase
    .from("atelier_profiles")
    .select("id, email, role, member_status, audience_status, audience_segment, source, access_source, access_wave")
    .eq("id", userId)
    .maybeSingle();
  if (result.error || !result.data) {
    return null;
  }
  return result.data;
}

function getProfileState(profile) {
  if (!profile) {
    return null;
  }
  return {
    role: profile.role || null,
    member_status: profile.member_status || null,
    audience_status: profile.audience_status || null,
    audience_segment: profile.audience_segment || null,
    source: profile.source || profile.access_source || null,
    access_source: profile.access_source || null,
    access_wave: profile.access_wave || null,
  };
}

exports.handler = async (event) => {
  const startedAt = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_env" }),
    };
  }

  const auth = await authenticateAdmin(event, supabaseUrl, anonKey, serviceRoleKey);
  if (!auth.ok) {
    await trackFunctionEvent(createClient(supabaseUrl, serviceRoleKey), {
      function_name: "admin-members",
      status: "error",
      error_code: auth.error,
      latency_ms: Date.now() - startedAt,
      meta: { method: event.httpMethod },
    });
    return {
      statusCode: auth.statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: auth.error }),
    };
  }

  const supabase = auth.adminClient;
  const adminUserId = auth.adminUserId || null;

  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters || {};
    const page = cleanPageNumber(params.page, 1, 100000);
    const perPage = cleanPageNumber(params.per_page, 25, 50);
    const view = ["decision", "members", "history", "all"].includes(params.view) ? params.view : "decision";
    const search = cleanSearch(params.search);
    const segment = ["public", "proche", "artiste", "pro"].includes(params.segment) ? params.segment : "";
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    let queueColumnsAvailable = true;
    let query = supabase
      .from("atelier_profiles")
      .select("id, email, role, member_status, audience_status, audience_segment, source, access_source, access_wave, admin_note, last_admin_action_at, adult_confirmed_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false });
    query = applyProfileFilters(query, { view, search, segment });
    let result = await query.range(from, to);

    if (result.error && hasMissingQueueColumns(result.error)) {
      queueColumnsAvailable = false;
      let fallback = supabase
        .from("atelier_profiles")
        .select("id, email, role, member_status, created_at", { count: "exact" })
        .order("created_at", { ascending: false });
      if (view === "decision") fallback = fallback.in("member_status", ["none", "pending"]);
      if (view === "members") fallback = fallback.or("role.eq.admin,member_status.in.(member,founder,priority)");
      if (view === "history") fallback = fallback.in("member_status", ["blocked", "archived"]);
      if (search) fallback = fallback.ilike("email", `*${search}*`);
      result = await fallback.range(from, to);
    }

    if (result.error) {
      await trackFunctionEvent(supabase, {
        function_name: "admin-members",
        status: "error",
        error_code: "query_failed",
        latency_ms: Date.now() - startedAt,
        meta: { method: "GET" },
      });
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "query_failed" }),
      };
    }

    await trackFunctionEvent(supabase, {
      function_name: "admin-members",
      status: "ok",
      latency_ms: Date.now() - startedAt,
      meta: { method: "GET", count: (result.data || []).length, queueColumnsAvailable },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({
        ok: true,
        members: result.data || [],
        queueColumnsAvailable,
        pagination: {
          page,
          per_page: perPage,
          total: Number(result.count || 0),
          total_pages: Math.max(1, Math.ceil(Number(result.count || 0) / perPage)),
        },
        filters: { view, search, segment },
      }),
    };
  }

  if (event.httpMethod === "POST") {
    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (_) {
      payload = {};
    }

    const userId = payload.userId;
    const action = payload.action;
    const allowedActions = ["approve", "approve_and_send_access_email", "revoke", "vip", "refuse", "archive", "set_meta", "send_access_email"];
    if (!userId || !allowedActions.includes(action)) {
      await trackFunctionEvent(supabase, {
        function_name: "admin-members",
        status: "error",
        error_code: "bad_request",
        latency_ms: Date.now() - startedAt,
        meta: { method: "POST" },
      });
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "bad_request" }),
      };
    }

    const targetBefore = await getTargetProfile(supabase, userId);
    if (!targetBefore) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "profile_not_found" }),
      };
    }
    const roleChangingActions = ["approve", "approve_and_send_access_email", "revoke", "vip", "refuse", "archive"];
    if (targetBefore?.role === "admin" && roleChangingActions.includes(action)) {
      await trackFunctionEvent(supabase, {
        function_name: "admin-members",
        status: "error",
        error_code: "admin_role_change_blocked",
        latency_ms: Date.now() - startedAt,
        meta: { method: "POST" },
      });
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "admin_role_change_blocked" }),
      };
    }

    if (action === "send_access_email") {
      if (!canRecoverProfile(targetBefore)) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ok: false, error: "access_not_open" }),
        };
      }
      if (await wasAccessEmailSentRecently(supabase, userId)) {
        return {
          statusCode: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
          body: JSON.stringify({ ok: false, error: "access_email_rate_limited" }),
        };
      }
      const sent = await sendAccessEmail(supabase, userId);
      if (!sent.ok) {
        await trackFunctionEvent(supabase, {
          function_name: "admin-members",
          status: "error",
          error_code: sent.error,
          latency_ms: Date.now() - startedAt,
          meta: { method: "POST", action },
        });
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ok: false, error: sent.error }),
        };
      }
      if (adminUserId) {
        await supabase.from("atelier_admin_audit_logs").insert({
          admin_user_id: adminUserId,
          action: "member_access_email_sent",
          target_type: "atelier_profile",
          target_id: userId,
          details: {
            action,
            target_email: sent.email || targetBefore?.email || null,
            before: getProfileState(targetBefore),
          },
        });
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ ok: true }),
      };
    }

    let update = null;
    if (action === "set_meta") {
      const fields = payload.fields && typeof payload.fields === "object" ? payload.fields : {};
      const allowedStatuses = ["new", "waiting", "approved", "vip", "refused", "archived"];
      const allowedSegments = ["public", "proche", "artiste", "pro"];
      const allowedSources = ["site", "concert", "instagram", "email", "invitation", "bouche_a_oreille", "autre"];
      const allowedAccessSources = ["site", "qr", "concert", "instagram", "email", "invitation", "bouche_a_oreille", "direct", "autre"];
      const source = allowedSources.includes(fields.source) ? fields.source : (allowedSources.includes(fields.access_source) ? fields.access_source : "site");
      const accessSource = allowedAccessSources.includes(fields.access_source) ? fields.access_source : source;
      const accessWave = cleanText(fields.access_wave, 80);
      update = {
        audience_status: allowedStatuses.includes(fields.audience_status) ? fields.audience_status : "new",
        audience_segment: allowedSegments.includes(fields.audience_segment) ? fields.audience_segment : null,
        source,
        access_source: accessSource,
        access_wave: accessWave,
        admin_note: cleanText(fields.admin_note, 1200),
      };
    } else {
      update = getUpdateForAction(action);
    }
    update.last_admin_action_at = new Date().toISOString();

    let result = await supabase
      .from("atelier_profiles")
      .update(update)
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (result.error && hasMissingQueueColumns(result.error) && action !== "set_meta") {
      const fallback = { ...update };
      QUEUE_FIELDS.forEach((field) => {
        delete fallback[field];
      });
      if (Object.keys(fallback).length) {
        result = await supabase
          .from("atelier_profiles")
          .update(fallback)
          .eq("id", userId)
          .select("id")
          .maybeSingle();
      } else {
        result = { data: { id: userId }, error: null };
      }
    }

    if (result.error) {
      await trackFunctionEvent(supabase, {
        function_name: "admin-members",
        status: "error",
        error_code: "update_failed",
        latency_ms: Date.now() - startedAt,
        meta: { method: "POST", action },
      });
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "update_failed" }),
      };
    }

    let accessEmail = null;
    if (action === "approve_and_send_access_email") {
      const recentlySent = await wasAccessEmailSentRecently(supabase, userId);
      accessEmail = recentlySent
        ? { ok: false, error: "access_email_rate_limited" }
        : await sendAccessEmail(supabase, userId);
      if (!accessEmail.ok) {
        await trackFunctionEvent(supabase, {
          function_name: "admin-members",
          status: "error",
          error_code: accessEmail.error,
          latency_ms: Date.now() - startedAt,
          meta: { method: "POST", action, approved: true },
        });
      }
      if (accessEmail.ok && adminUserId) {
        await supabase.from("atelier_admin_audit_logs").insert({
          admin_user_id: adminUserId,
          action: "member_access_email_sent",
          target_type: "atelier_profile",
          target_id: userId,
          details: { action, target_email: targetBefore.email || null },
        });
      }
    }

    const adminId = adminUserId;
    if (adminId) {
      const targetAfter = await getTargetProfile(supabase, userId);
      await supabase.from("atelier_admin_audit_logs").insert({
        admin_user_id: adminId,
        action: `member_${action}`,
        target_type: "atelier_profile",
        target_id: userId,
        details: {
          action,
          target_email: targetAfter?.email || targetBefore?.email || null,
          before: getProfileState(targetBefore),
          after: getProfileState(targetAfter),
          fields: action === "set_meta" ? Object.keys(payload.fields || {}) : undefined,
          email_sent: accessEmail ? Boolean(accessEmail.ok) : undefined,
          email_error: accessEmail && !accessEmail.ok ? accessEmail.error : undefined,
        },
      });
    }

    await trackFunctionEvent(supabase, {
      function_name: "admin-members",
      status: "ok",
      latency_ms: Date.now() - startedAt,
      meta: { method: "POST", action },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({
        ok: true,
        email_sent: accessEmail ? Boolean(accessEmail.ok) : undefined,
        email_error: accessEmail && !accessEmail.ok ? accessEmail.error : undefined,
      }),
    };
  }

  await trackFunctionEvent(supabase, {
    function_name: "admin-members",
    status: "error",
    error_code: "method_not_allowed",
    latency_ms: Date.now() - startedAt,
    meta: { method: event.httpMethod },
  });

  return {
    statusCode: 405,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
  };
};
