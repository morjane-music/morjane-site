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

function normalizeSeasonSlug(track) {
  const season = track?.atelier_seasons || track?.season || {};
  const raw = String(season.slug || season.title || "").trim().toLowerCase();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (["acte-0", "acte-zero", "acte0"].includes(normalized)) return "acte-0";
  if (["hors-acte", "horsacte"].includes(normalized)) return "hors-acte";
  return normalized;
}

function canAccessReservedSeason(profile, track) {
  const slug = normalizeSeasonSlug(track);
  if (slug !== "acte-0" && slug !== "hors-acte") {
    return true;
  }

  const status = String(profile?.member_status || "");
  const segment = normalizeAudienceSegment(profile?.audience_segment);
  return segment === "proche" || status === "priority" || status === "founder";
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
  if (!canAccessReservedSeason(profile, track)) {
    return false;
  }
  return true;
}

module.exports = {
  OPEN_MEMBER_STATUSES,
  canAccessReservedSeason,
  canAccessTrack,
  normalizeAudienceSegment,
  normalizeSeasonSlug,
};
