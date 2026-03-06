async function trackFunctionEvent(adminClient, payload) {
  if (!adminClient || !payload?.function_name) {
    return;
  }

  const eventPayload = {
    function_name: payload.function_name,
    status: payload.status === "error" ? "error" : "ok",
    error_code: payload.error_code || null,
    latency_ms: Number.isFinite(payload.latency_ms) ? payload.latency_ms : null,
    meta: payload.meta || {},
  };

  try {
    await adminClient.from("atelier_function_events").insert(eventPayload);
  } catch (_) {
    // Monitoring must never break user-facing behavior.
  }
}

module.exports = {
  trackFunctionEvent,
};

