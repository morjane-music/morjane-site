const OPEN_MEMBER_STATUSES = new Set(["member", "founder", "priority"]);
const LEGACY_SEGMENTS = {
  listener: "public",
  friend: "proche",
  creator: "artiste",
  press: "pro",
  team: "pro",
};

function normalizeAudienceSegment(value) {
  const raw = String(value || "").trim().toLowerCase();
  return LEGACY_SEGMENTS[raw] || raw || "public";
}

function normalizeList(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function canAccessTrack(profile, track) {
  if (!profile || !track || track.status !== "active") {
    return false;
  }
  const status = String(profile.member_status || "");
  if (!OPEN_MEMBER_STATUSES.has(status)) {
    return false;
  }
  const allowedStatuses = normalizeList(track.allowed_member_statuses);
  if (allowedStatuses.length && !allowedStatuses.includes(status)) {
    return false;
  }
  const allowedSegments = normalizeList(track.allowed_audience_segments);
  if (allowedSegments.length && !allowedSegments.includes(normalizeAudienceSegment(profile.audience_segment))) {
    return false;
  }
  return true;
}

module.exports = {
  OPEN_MEMBER_STATUSES,
  canAccessTrack,
  normalizeAudienceSegment,
};
