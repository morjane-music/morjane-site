const { createClient } = require("@supabase/supabase-js");
const { trackFunctionEvent } = require("./_lib/atelier-observability");

function getBearerToken(authHeader) {
  if (!authHeader) {
    return "";
  }
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return "";
  }
  return token;
}

exports.handler = async (event) => {
  const startedAt = Date.now();
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
    };
  }

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

  const accessToken = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!accessToken) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_token" }),
    };
  }

  let trackId = null;
  try {
    const parsed = JSON.parse(event.body || "{}");
    trackId = parsed.trackId;
  } catch (_) {
    trackId = null;
  }

  if (!trackId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_track_id" }),
    };
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const userResult = await authClient.auth.getUser(accessToken);
  if (userResult.error || !userResult.data.user) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "invalid_token" }),
    };
  }

  const userId = userResult.data.user.id;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error: profileError } = await adminClient
    .from("atelier_profiles")
    .select("member_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile || !["member", "founder", "priority"].includes(profile.member_status)) {
    await trackFunctionEvent(adminClient, {
      function_name: "get-audio-url",
      status: "error",
      error_code: "forbidden",
      latency_ms: Date.now() - startedAt,
      meta: { track_id: trackId },
    });
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "forbidden" }),
    };
  }

  const { data: track, error: trackError } = await adminClient
    .from("atelier_tracks")
    .select("id, storage_path, status")
    .eq("id", trackId)
    .maybeSingle();

  if (trackError || !track || track.status !== "active") {
    await trackFunctionEvent(adminClient, {
      function_name: "get-audio-url",
      status: "error",
      error_code: "track_not_found",
      latency_ms: Date.now() - startedAt,
      meta: { track_id: trackId },
    });
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "track_not_found" }),
    };
  }

  const signed = await adminClient.storage.from("atelier-audio").createSignedUrl(track.storage_path, 3600);
  if (signed.error || !signed.data?.signedUrl) {
    await trackFunctionEvent(adminClient, {
      function_name: "get-audio-url",
      status: "error",
      error_code: "signed_url_failed",
      latency_ms: Date.now() - startedAt,
      meta: { track_id: trackId },
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "signed_url_failed" }),
    };
  }

  await trackFunctionEvent(adminClient, {
    function_name: "get-audio-url",
    status: "ok",
    latency_ms: Date.now() - startedAt,
    meta: { track_id: trackId },
  });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ ok: true, url: signed.data.signedUrl }),
  };
};
