import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const gateStatus = document.getElementById("gateStatus");
const authView = document.getElementById("authView");
const memberView = document.getElementById("memberView");
const trackView = document.getElementById("trackView");
const authStatus = document.getElementById("authStatus");
const memberMeta = document.getElementById("memberMeta");
const memberPersonalStats = document.getElementById("memberPersonalStats");
const memberWaveNote = document.getElementById("memberWaveNote");
const circleCount = document.getElementById("circleCount");
const trackList = document.getElementById("trackList");
const emptyTracks = document.getElementById("emptyTracks");
const acteChooser = document.getElementById("acteChooser");
const memberPendingHelp = document.getElementById("memberPendingHelp");
const atelierMovements = document.getElementById("atelierMovements");
const adminPanel = document.getElementById("adminPanel");
const adminPanelToggle = document.getElementById("adminPanelToggle");
const adminUnlockForm = document.getElementById("adminUnlockForm");
const adminPinInput = document.getElementById("adminPinInput");
const adminUnlockStatus = document.getElementById("adminUnlockStatus");
const adminSecureContent = document.getElementById("adminSecureContent");
const adminMembersSummary = document.getElementById("adminMembersSummary");
const adminMembersList = document.getElementById("adminMembersList");
const adminWeeklyStats = document.getElementById("adminWeeklyStats");
const adminInboxList = document.getElementById("adminInboxList");
const adminInboxUnread = document.getElementById("adminInboxUnread");
const adminInboxTrackFilter = document.getElementById("adminInboxTrackFilter");
const adminInboxSenderFilter = document.getElementById("adminInboxSenderFilter");
const copyAtelierLinkBtn = document.getElementById("copyAtelierLinkBtn");
const copyMorjanePhoneLinkBtn = document.getElementById("copyMorjanePhoneLinkBtn");
const refreshInboxBtn = document.getElementById("refreshInboxBtn");
const markInboxReadBtn = document.getElementById("markInboxReadBtn");
const adminInboxSearch = document.getElementById("adminInboxSearch");
const toggleUnreadOnlyBtn = document.getElementById("toggleUnreadOnlyBtn");
const exportInboxCsvBtn = document.getElementById("exportInboxCsvBtn");
const adminVotesSummary = document.getElementById("adminVotesSummary");
const adminTrackCockpit = document.getElementById("adminTrackCockpit");
const adminTrackCreateForm = document.getElementById("adminTrackCreateForm");
const adminTrackTitleInput = document.getElementById("adminTrackTitleInput");
const adminTrackSeasonSelect = document.getElementById("adminTrackSeasonSelect");
const adminTrackPathInput = document.getElementById("adminTrackPathInput");
const adminTrackAudioSelect = document.getElementById("adminTrackAudioSelect");
const adminTrackOrderInput = document.getElementById("adminTrackOrderInput");
const adminTrackCreateStatus = document.getElementById("adminTrackCreateStatus");
const adminPreviewSegment = document.getElementById("adminPreviewSegment");
const adminPreviewStatus = document.getElementById("adminPreviewStatus");
const adminPreviewList = document.getElementById("adminPreviewList");
const adminAnnouncementText = document.getElementById("adminAnnouncementText");
const copyAdminAnnouncementBtn = document.getElementById("copyAdminAnnouncementBtn");
const adminSignalBoard = document.getElementById("adminSignalBoard");
const exportSignalCsvBtn = document.getElementById("exportSignalCsvBtn");
const adminStatusPanel = document.getElementById("adminStatusPanel");
const adminAuditLog = document.getElementById("adminAuditLog");
const adminLiveListeners = document.getElementById("adminLiveListeners");
const adminTodayCards = document.getElementById("adminTodayCards");
const adminDensityToggle = document.getElementById("adminDensityToggle");
const adminSearchInput = document.getElementById("adminSearchInput");
const adminInviteForm = document.getElementById("adminInviteForm");
const adminInviteEmail = document.getElementById("adminInviteEmail");
const adminInviteSegment = document.getElementById("adminInviteSegment");
const adminInviteStatus = document.getElementById("adminInviteStatus");
const adminInviteNote = document.getElementById("adminInviteNote");
const adminInviteStatusText = document.getElementById("adminInviteStatusText");
const adminCreateInviteLinkBtn = document.getElementById("adminCreateInviteLinkBtn");
const adminEntryLinks = document.getElementById("adminEntryLinks");
const tabPendingBtn = document.getElementById("tabPendingBtn");
const tabMembersBtn = document.getElementById("tabMembersBtn");
const trackTitle = document.getElementById("trackTitle");
const trackDecisionStatus = document.getElementById("trackDecisionStatus");
const trackTimeline = document.getElementById("trackTimeline");
const trackIntentPanel = document.getElementById("trackIntentPanel");
const trackIntentNote = document.getElementById("trackIntentNote");
const trackFeedbackQuestion = document.getElementById("trackFeedbackQuestion");
const trackPlayCount = document.getElementById("trackPlayCount");
const trackLikeCount = document.getElementById("trackLikeCount");
const trackLikeBtn = document.getElementById("trackLikeBtn");
const player = document.getElementById("player");
const trackWatermark = document.getElementById("trackWatermark");
const listeningChamber = document.getElementById("listeningChamber");
const listeningChamberText = document.getElementById("listeningChamberText");
const traceRevealBtn = document.getElementById("traceRevealBtn");
const voteStatus = document.getElementById("voteStatus");
const messageStatus = document.getElementById("messageStatus");
const privateMessage = document.getElementById("privateMessage");
const memberReplies = document.getElementById("memberReplies");

const magicLinkForm = document.getElementById("magicLinkForm");
const emailInput = document.getElementById("emailInput");
const otpCodeForm = document.getElementById("otpCodeForm");
const otpCodeInput = document.getElementById("otpCodeInput");
const showOtpCodeBtn = document.getElementById("showOtpCodeBtn");
const authMobileHelp = document.getElementById("authMobileHelp");
const authDoorNote = document.getElementById("authDoorNote");
const magicLinkSubmitBtn = magicLinkForm ? magicLinkForm.querySelector("button[type='submit']") : null;
const messageForm = document.getElementById("messageForm");
const feedbackTag = document.getElementById("feedbackTag");
const logoutBtn = document.getElementById("logoutBtn");
const backBtn = document.getElementById("backBtn");
const voteButtons = Array.from(document.querySelectorAll("[data-vote]"));

let supabase = null;
let session = null;
let profile = null;
let tracks = [];
let selectedTrack = null;
let trackPlayCounts = new Map();
let trackLikeCounts = new Map();
let userLikedTrackIds = new Set();
let playLoggedForCurrentTrack = false;
let listeningQuestionShown = false;
let watermarkTimer = null;
let adminMembersCache = [];
let adminInboxCache = [];
let adminTrackCache = [];
let adminAudioFilesCache = [];
let adminLastSeenIso = null;
let adminInboxUnreadOnly = false;
let adminViewMode = "pending";
let magicLinkCooldownTimer = null;
let voteCooldownUntil = 0;
let adminUnlocked = false;
let presenceHeartbeatTimer = null;
let adminLiveRefreshTimer = null;
let selectedActeSlug = "acte-i";
const adminTodayState = {
  liveNow: 0,
  pendingMessages: 0,
  playsToday: 0,
  activeMembers7d: 0,
  pendingMembers: 0,
  brokenAudioCount: 0,
};
const ADMIN_DENSITY_STORAGE_KEY = "atelier_admin_compact_density";
const ATELIER_LAST_VISIT_STORAGE_KEY = "atelier_last_visit_at";
const ATELIER_SEEN_MOVEMENTS_STORAGE_KEY = "atelier_seen_movement_track_ids";
const ATELIER_NEW_TRACK_WINDOW_DAYS = 14;
const ATELIER_ENTRY_CONTEXT_STORAGE_KEY = "atelier_entry_context";
const ADMIN_MEMBER_STATUS_LABELS = {
  new: "nouveau",
  waiting: "à relancer",
  approved: "validé",
  vip: "prioritaire",
  refused: "refusé",
  archived: "archivé",
};
const ADMIN_MEMBER_SEGMENT_LABELS = {
  public: "public",
  proche: "proche",
  artiste: "artiste",
  pro: "pro",
};
const LEGACY_AUDIENCE_SEGMENTS = {
  listener: "public",
  friend: "proche",
  creator: "artiste",
  press: "pro",
  team: "pro",
};
const AUDIENCE_SEGMENT_COPY = {
  public: {
    label: "public",
    welcome: "Bienvenue dans l'Atelier. Ici vivent les chansons avant leur sortie.",
    question: "Quel morceau aurais-tu envie de réécouter ?",
  },
  proche: {
    label: "proche",
    welcome: "Tu connais déjà une partie de l'histoire. Je cherche ce qui reste.",
    question: "Qu'est-ce qui reste en toi après l'écoute ?",
  },
  artiste: {
    label: "artiste",
    welcome: "Tu connais la fabrication. Tu connais les choix et les doutes.",
    question: "Qu'entends-tu dans la matière artistique ?",
  },
  pro: {
    label: "pro",
    welcome: "Tu n'es pas ici pour me faire plaisir. Regarde ce qui tient.",
    question: "Qu'est-ce qui te semble le plus solide aujourd'hui ?",
  },
};
const SOURCE_LABELS = {
  site: "site",
  concert: "concert",
  instagram: "Instagram",
  email: "email",
  invitation: "invitation",
  bouche_a_oreille: "bouche à oreille",
  autre: "autre",
};
const ENTRY_SOURCE_LABELS = {
  site: "Site",
  qr: "QR",
  concert: "Concert",
  instagram: "Instagram",
  email: "Email",
  invitation: "Invitation",
  bouche_a_oreille: "Bouche à oreille",
  direct: "Direct",
  autre: "Autre",
};
const ENTRY_DOOR_LABELS = {
  home: "Home cachée",
  menu: "Menu mobile",
  footer: "Footer",
  direct: "Accès direct",
  morjane: "Morjane téléphone",
  phone: "QR téléphone",
  pro: "QR pro",
  concert: "Concert",
  instagram: "Instagram",
  invitation: "Invitation",
};
const ADMIN_ENTRY_LINKS = [
  { label: "Atelier direct", source: "direct", door: "direct", audience: "Lien neutre", note: "Pour tester ou envoyer l'entrée simple de l'Atelier." },
  { label: "Morjane téléphone", source: "direct", door: "morjane", audience: "Admin / fondatrice", note: "Pour ouvrir ta session sur ton téléphone avec ton email fondateur." },
  { label: "Porte home", source: "site", door: "home", audience: "Curieux du site", note: "La porte cachée du site public. Demande d'accès seulement." },
  { label: "Porte footer", source: "site", door: "footer", audience: "Personnes qui cherchent", note: "Entrée discrète et claire depuis le bas du site." },
  { label: "QR téléphone", source: "qr", door: "phone", audience: "Rencontre réelle", note: "Pour fond d'écran, affiche, carte ou moment spontané." },
  { label: "QR pro", source: "qr", door: "pro", segment: "pro", audience: "Pros", note: "Préclasse la demande en profil pro sans ouvrir les chansons." },
  { label: "QR concert", source: "concert", door: "concert", audience: "Après concert", note: "Pour garder le lien après une rencontre ou une date." },
  { label: "Lien Instagram", source: "instagram", door: "instagram", audience: "Réseaux", note: "Pour transformer une curiosité Instagram en demande suivable." },
];
const ATELIER_ACTES = [
  {
    slug: "acte-i",
    title: "ACTE I",
    description: "Ce qui ouvre la faille.",
    sort_order: 10,
  },
  {
    slug: "acte-ii",
    title: "ACTE II",
    description: "Ce qui avance encore dans l'ombre.",
    sort_order: 20,
  },
  {
    slug: "acte-0",
    title: "ACTE 0",
    description: "Les premières formes, avant le seuil.",
    sort_order: 30,
    restricted: true,
  },
  {
    slug: "hors-acte",
    title: "HORS ACTE",
    description: "Ce qui gravite autour sans demander sa place.",
    sort_order: 40,
    restricted: true,
  },
];

function applyAdminDensityMode(isCompact) {
  document.body.classList.toggle("admin-compact", Boolean(isCompact));
  if (adminDensityToggle) {
    adminDensityToggle.textContent = `Mode compact : ${isCompact ? "on" : "off"}`;
    adminDensityToggle.setAttribute("aria-pressed", isCompact ? "true" : "false");
  }
}

function initAdminDensityMode() {
  let compact = false;
  try {
    compact = localStorage.getItem(ADMIN_DENSITY_STORAGE_KEY) === "1";
  } catch (_) {
    compact = false;
  }
  applyAdminDensityMode(compact);
}

function initScrollReveals() {
  const revealEls = Array.from(document.querySelectorAll("[data-ritual]"));
  if (!revealEls.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  revealEls.forEach((el) => observer.observe(el));
}

function formatTrackTitle(rawTitle) {
  const title = String(rawTitle || "").trim();
  if (title === "Track test 01") {
    return "En bas";
  }

  const genericMatch = title.match(/^(?:track(?:\s*test)?|tracktest|track)\s*0*(\d{1,2})$/i);
  if (genericMatch) {
    const num = genericMatch[1].padStart(2, "0");
    return `Version ${num} - Morjane`;
  }

  return title;
}

function updateMediaSession(track) {
  if (!("mediaSession" in navigator) || !track) {
    return;
  }

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: formatTrackTitle(track.title),
      artist: "Morjane",
      album: "Atelier",
    });

    navigator.mediaSession.setActionHandler("play", async () => {
      await player?.play();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      player?.pause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (player) player.currentTime = Math.max(0, player.currentTime - 10);
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (player) player.currentTime = Math.min(player.duration || player.currentTime + 10, player.currentTime + 10);
    });
  } catch (_) {
    // Some browsers expose Media Session only partially.
  }
}

function clearMediaSession() {
  if (!("mediaSession" in navigator)) {
    return;
  }
  try {
    navigator.mediaSession.metadata = null;
  } catch (_) {
    // no-op
  }
}

function getDecisionStatusLabel(status) {
  return ({
    testing: "En test",
    kept: "Retenue",
    rework: "À retravailler",
    paused: "En pause",
    released: "Sortie",
    archived: "Archivée",
  }[status] || "En test");
}

function getTrackDecisionCue(track) {
  if (!track?.audio_ok) {
    return "À corriger : audio indisponible";
  }
  const messages = Number(track.messages || 0);
  const plays = Number(track.plays || 0);
  const keepVotes = Number(track.votes?.develop || 0);
  const reviseVotes = Number(track.votes?.revise || 0);
  const leaveVotes = Number(track.votes?.leave || 0);
  if (track.decision_status === "kept") {
    return "Décision prise : à garder";
  }
  if (track.decision_status === "rework") {
    return "À retravailler";
  }
  if (track.decision_status === "paused") {
    return "À relancer plus tard";
  }
  if (messages < 2 || plays < 5) {
    return "À écouter encore";
  }
  if (reviseVotes > keepVotes || leaveVotes > keepVotes) {
    return "Décision à prendre";
  }
  return "Signal favorable";
}

function getSeasonFallbackTitle(seasonId) {
  if (!seasonId) {
    return "Versions";
  }
  if (Number(seasonId) === 1) return "ACTE I";
  if (Number(seasonId) === 2) return "ACTE II";
  return `Acte ${String(seasonId).padStart(2, "0")}`;
}

function normalizeActeSlug(season) {
  const slug = String(season?.slug || "").trim().toLowerCase();
  const title = String(season?.title || "").trim().toLowerCase();
  const id = Number(season?.id || 0);
  if (slug === "acte-0" || slug === "acte-zero" || title === "acte 0" || title === "acte zéro" || title === "acte zero") {
    return "acte-0";
  }
  if (slug === "acte-i" || slug === "acte-1" || title === "acte i" || title === "acte 1" || id === 1) {
    return "acte-i";
  }
  if (slug === "acte-ii" || slug === "acte-2" || title === "acte ii" || title === "acte 2" || id === 2) {
    return "acte-ii";
  }
  if (slug === "hors-acte" || slug === "horsacte" || title === "hors acte") {
    return "hors-acte";
  }
  return slug || `season-${id || "unknown"}`;
}

function getActeDefinition(slug) {
  return ATELIER_ACTES.find((acte) => acte.slug === slug) || null;
}

function canSeeActe(acte) {
  if (!acte?.restricted) {
    return true;
  }
  const segment = normalizeAudienceSegment(profile?.audience_segment);
  const status = String(profile?.member_status || "");
  return profile?.role === "admin" || segment === "proche" || status === "priority" || status === "founder";
}

function formatSeasonTitle(season) {
  const knownActe = getActeDefinition(normalizeActeSlug(season));
  if (knownActe) {
    return knownActe.title;
  }

  const title = String(season?.title || "").trim();
  if (title) {
    return title;
  }

  const slug = String(season?.slug || "").trim();
  if (slug === "acte-i") return "ACTE I";
  if (slug === "acte-ii") return "ACTE II";
  if (slug) {
    return slug.replace(/-/g, " ").toUpperCase();
  }

  return getSeasonFallbackTitle(season?.id);
}

function getTrackSeason(track) {
  const nestedSeason = track?.atelier_seasons || track?.season || null;
  const rawSeason = {
    id: nestedSeason?.id || track?.season_id || 0,
    slug: nestedSeason?.slug || track?.season_slug || "",
    title: nestedSeason?.title || track?.season_title || "",
    description: nestedSeason?.description || "",
    sort_order: Number(nestedSeason?.sort_order || track?.season_id || 0),
  };
  const knownActe = getActeDefinition(normalizeActeSlug(rawSeason));
  if (knownActe) {
    return {
      ...rawSeason,
      slug: knownActe.slug,
      title: knownActe.title,
      description: rawSeason.description || knownActe.description,
      sort_order: knownActe.sort_order,
    };
  }

  return {
    ...rawSeason,
    slug: normalizeActeSlug(rawSeason),
  };
}

function groupTracksBySeason(trackRows) {
  const groups = new Map();
  (trackRows || []).forEach((track) => {
    const season = getTrackSeason(track);
    const key = String(season.id || season.slug || "default");
    if (!groups.has(key)) {
      groups.set(key, { season, tracks: [] });
    }
    groups.get(key).tracks.push(track);
  });

  return Array.from(groups.values())
    .sort((a, b) => Number(a.season.sort_order || 0) - Number(b.season.sort_order || 0))
    .map((group) => ({
      ...group,
      tracks: group.tracks.sort((a, b) => {
        const orderDiff = Number(a.sort_order || 0) - Number(b.sort_order || 0);
        if (orderDiff !== 0) return orderDiff;
        return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      }),
    }));
}

function getVisibleActeGroups() {
  const groupedBySlug = new Map();
  groupTracksBySeason(tracks).forEach((group) => {
    groupedBySlug.set(normalizeActeSlug(group.season), group);
  });

  return ATELIER_ACTES.filter(canSeeActe).map((acte) => {
    const existing = groupedBySlug.get(acte.slug);
    if (existing) {
      return existing;
    }
    return {
      season: {
        id: 0,
        slug: acte.slug,
        title: acte.title,
        description: acte.description,
        sort_order: acte.sort_order,
      },
      tracks: [],
    };
  });
}

function getFeedbackTagLabel(tag) {
  return ({
    emotion: "Emotion",
    text: "Texte",
    melody: "Mélodie",
    arrangement: "Arrangement",
    scene: "Scène",
    doubt: "Doute",
  }[tag] || tag || "Retour");
}

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

function setAdminPanelCollapsed(collapsed) {
  if (!adminPanel) {
    return;
  }
  adminPanel.classList.toggle("is-collapsed", collapsed);
  if (adminPanelToggle) {
    adminPanelToggle.textContent = collapsed ? "Ouvrir la console" : "Refermer la console";
    adminPanelToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }
}
function setGateStatus(text) {
  gateStatus.textContent = text;
}

function isMember(status) {
  return status === "member" || status === "founder" || status === "priority";
}

async function loadCircleCount() {
  if (!circleCount) {
    return;
  }
  try {
    const res = await fetch("/.netlify/functions/get-atelier-stats", { method: "GET" });
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    if (typeof data.members === "number") {
      circleCount.textContent = `Membres du cercle : ${data.members}`;
    }
  } catch (_) {
    // Keep default label if request fails.
  }
}

function getAudienceStatusLabel(status) {
  if (isMember(status)) {
    return status === "priority" || status === "founder" ? "accès prioritaire" : "dans le cercle privé";
  }
  return "sur le seuil de l'Atelier";
}

function normalizeAudienceSegment(value) {
  const raw = String(value || "").trim().toLowerCase();
  return AUDIENCE_SEGMENT_COPY[raw] ? raw : (LEGACY_AUDIENCE_SEGMENTS[raw] || "public");
}

function getAudienceSegmentCopy(value) {
  return AUDIENCE_SEGMENT_COPY[normalizeAudienceSegment(value)] || AUDIENCE_SEGMENT_COPY.public;
}

function getLastVisitDate() {
  try {
    const previous = localStorage.getItem(ATELIER_LAST_VISIT_STORAGE_KEY);
    if (!previous) return null;
    const date = new Date(previous);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch (_) {
    return null;
  }
}

function getSeenMovementIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ATELIER_SEEN_MOVEMENTS_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch (_) {
    return new Set();
  }
}

function rememberSeenMovementIds(ids = []) {
  try {
    const current = getSeenMovementIds();
    ids.forEach((id) => current.add(String(id)));
    localStorage.setItem(ATELIER_SEEN_MOVEMENTS_STORAGE_KEY, JSON.stringify(Array.from(current).slice(-200)));
  } catch (_) {
    // ignore storage errors
  }
}

function isTrackAnnouncementVisible(track) {
  return track?.announcement_enabled !== false;
}

function getTrackAnnouncementLine(track, season) {
  const custom = String(track?.announcement_text || "").trim();
  if (custom) {
    return custom;
  }
  return `${formatTrackTitle(track.title)} est ouvert dans ${formatSeasonTitle(season)}.`;
}

function isTrackNewSinceLastVisit(track) {
  const created = new Date(track?.created_at || "");
  if (Number.isNaN(created.getTime())) return false;
  const previous = getLastVisitDate();
  if (previous) {
    return created > previous;
  }
  return Date.now() - created.getTime() <= ATELIER_NEW_TRACK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function getNewTracksForGroup(group) {
  const seen = getSeenMovementIds();
  return (group?.tracks || [])
    .filter(isTrackAnnouncementVisible)
    .filter(isTrackNewSinceLastVisit)
    .filter((track) => !seen.has(String(track.id)));
}

function getLastVisitMemoryLine() {
  try {
    const previous = localStorage.getItem(ATELIER_LAST_VISIT_STORAGE_KEY);
    if (!previous) return "";
    const previousDate = new Date(previous);
    if (Number.isNaN(previousDate.getTime())) return "";
    const days = Math.floor((Date.now() - previousDate.getTime()) / (24 * 60 * 60 * 1000));
    if (days < 1) return "";
    return days === 1 ? "Tu étais déjà passé ici hier." : `Tu étais déjà passé ici il y a ${days} jours.`;
  } catch (_) {
    return "";
  }
}

function rememberAtelierVisit() {
  try {
    localStorage.setItem(ATELIER_LAST_VISIT_STORAGE_KEY, new Date().toISOString());
  } catch (_) {
    // ignore storage errors
  }
}

function getMemberSource(member) {
  return String(member?.source || member?.access_source || "").trim();
}

function getSourceLabel(value) {
  const key = String(value || "").trim();
  return SOURCE_LABELS[key] || key || "source inconnue";
}

function normalizeEntrySource(value) {
  const key = String(value || "").trim().toLowerCase();
  const aliases = {
    qr_code: "qr",
    qrcode: "qr",
    phone_qr: "qr",
    insta: "instagram",
    bouche: "bouche_a_oreille",
    word: "bouche_a_oreille",
  };
  const normalized = aliases[key] || key;
  return Object.keys(ENTRY_SOURCE_LABELS).includes(normalized) ? normalized : "";
}

function normalizeEntryDoor(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
}

function normalizeEntrySegment(value) {
  const segment = normalizeAudienceSegment(value);
  return ["public", "proche", "artiste", "pro"].includes(segment) ? segment : "";
}

function getEntryDoorLabel(value) {
  const key = normalizeEntryDoor(value);
  return ENTRY_DOOR_LABELS[key] || key || "porte inconnue";
}

function getEntryContextFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const source = normalizeEntrySource(params.get("source") || params.get("src"));
  const door = normalizeEntryDoor(params.get("door") || params.get("porte") || params.get("wave"));
  const segment = normalizeEntrySegment(params.get("segment") || params.get("profil"));
  if (!source && !door && !segment) {
    return null;
  }
  return {
    source: source || "direct",
    door: door || "direct",
    segment: segment || "",
    captured_at: new Date().toISOString(),
  };
}

function getStoredEntryContext() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ATELIER_ENTRY_CONTEXT_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      source: normalizeEntrySource(parsed.source) || "direct",
      door: normalizeEntryDoor(parsed.door) || "direct",
      segment: normalizeEntrySegment(parsed.segment),
      captured_at: parsed.captured_at || new Date().toISOString(),
    };
  } catch (_) {
    return null;
  }
}

function storeEntryContext(context) {
  if (!context) {
    return;
  }
  localStorage.setItem(ATELIER_ENTRY_CONTEXT_STORAGE_KEY, JSON.stringify(context));
}

function getCurrentEntryContext() {
  const fromUrl = getEntryContextFromUrl();
  if (fromUrl) {
    storeEntryContext(fromUrl);
    return fromUrl;
  }
  return getStoredEntryContext();
}

function getSupabaseSourceForEntry(context) {
  const source = normalizeEntrySource(context?.source);
  if (["concert", "instagram", "email", "invitation", "bouche_a_oreille", "autre"].includes(source)) {
    return source;
  }
  return "site";
}

function buildAtelierEntryUrl(entry = {}) {
  const url = new URL("/atelier/", window.location.origin);
  if (entry.source) url.searchParams.set("source", entry.source);
  if (entry.door) url.searchParams.set("door", entry.door);
  if (entry.segment) url.searchParams.set("segment", entry.segment);
  return url.toString();
}

function getEntryAdminLabel(member) {
  const accessSource = String(member?.access_source || "").trim();
  const accessWave = String(member?.access_wave || "").trim();
  if (accessSource || accessWave) {
    const source = ENTRY_SOURCE_LABELS[normalizeEntrySource(accessSource)] || getSourceLabel(accessSource);
    const door = accessWave ? getEntryDoorLabel(accessWave) : "";
    return [source, door].filter(Boolean).join(" / ");
  }
  return getSourceLabel(getMemberSource(member));
}

function applyEntryContextToAuthView() {
  if (!authDoorNote) {
    return;
  }
  const context = getCurrentEntryContext();
  if (!context || (!context.source && !context.door)) {
    hide(authDoorNote);
    return;
  }

  const source = normalizeEntrySource(context.source);
  const door = normalizeEntryDoor(context.door);
  const lines = {
    phone: "Tu es devant l'Atelier. Laisse ton email, Morjane ouvrira si c'est le bon moment.",
    pro: "Porte pro. Laisse ton email pour demander un accès d'écoute adapté.",
    concert: "Tu arrives par une rencontre. Laisse ton email pour garder le fil.",
    instagram: "Tu viens d'Instagram. Laisse ton email pour demander l'accès.",
    home: "Tu as trouvé la fissure. Laisse ton email pour demander l'accès.",
    footer: "L'Atelier n'est pas public. Laisse ton email pour demander l'accès.",
    menu: "L'Atelier n'est pas public. Laisse ton email pour demander l'accès.",
    morjane: "Connexion Morjane. Utilise ton email admin/fondateur pour ouvrir ta session sur ce téléphone.",
  };
  authDoorNote.textContent = lines[door] || (source === "qr"
    ? "Cette porte ouvre une demande, pas les chansons directement. Laisse ton email pour être reconnu."
    : "Laisse ton email pour demander l'accès à l'Atelier.");
  show(authDoorNote);
}

function getAccessLabel(member) {
  const status = String(member?.member_status || "pending");
  return ({
    pending: "en attente",
    member: "membre",
    priority: "prioritaire",
    blocked: "bloqué",
    archived: "archivé",
    founder: "fondateur",
    none: "en attente",
  }[status] || status);
}

function getInvitationText(member) {
  const name = member?.email ? ` pour ${member.email}` : "";
  return [
    `Je t'ouvre un accès à l'Atelier Morjane${name}.`,
    "",
    "Tu pourras écouter des versions avant leur sortie et me laisser un retour privé.",
    "",
    "Demande ton accès ici : https://morjane.re/atelier/?source=invitation&door=invitation",
    "",
    "Utilise le même email pour que je retrouve ta demande.",
  ].join("\n");
}

function startMagicLinkCooldown(seconds = 60) {
  if (!magicLinkSubmitBtn) {
    return;
  }
  if (magicLinkCooldownTimer) {
    clearInterval(magicLinkCooldownTimer);
    magicLinkCooldownTimer = null;
  }

  let remaining = seconds;
  magicLinkSubmitBtn.disabled = true;
  magicLinkSubmitBtn.textContent = `Réessayer dans ${remaining}s`;

  magicLinkCooldownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(magicLinkCooldownTimer);
      magicLinkCooldownTimer = null;
      magicLinkSubmitBtn.disabled = false;
      magicLinkSubmitBtn.textContent = "Recevoir le lien";
      return;
    }
    magicLinkSubmitBtn.textContent = `Réessayer dans ${remaining}s`;
  }, 1000);
}

function getAtelierEmailRedirectUrl() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${window.location.origin}/atelier/`;
  }
  return "https://morjane.re/atelier/";
}

function canManageMembers() {
  return profile?.role === "admin";
}

function renderAdminLockState() {
  if (!canManageMembers() || !adminUnlockForm || !adminSecureContent) {
    return;
  }
  if (adminUnlocked) {
    hide(adminUnlockForm);
    show(adminSecureContent);
  } else {
    show(adminUnlockForm);
    hide(adminSecureContent);
  }
}

async function checkAdminGate() {
  if (!canManageMembers() || !session?.access_token) {
    return false;
  }
  try {
    const res = await fetch("/.netlify/functions/check-admin-gate", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function unlockAdminWithPin(pin) {
  if (!canManageMembers() || !session?.access_token) {
    return false;
  }
  try {
    const res = await fetch("/.netlify/functions/unlock-admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ pin }),
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

function getInboxLastSeenStorageKey() {
  const id = profile?.id || "anon";
  return `atelier_inbox_last_seen_${id}`;
}

function loadInboxLastSeen() {
  try {
    adminLastSeenIso = localStorage.getItem(getInboxLastSeenStorageKey());
  } catch (_) {
    adminLastSeenIso = null;
  }
}

function saveInboxLastSeen(iso) {
  adminLastSeenIso = iso;
  try {
    localStorage.setItem(getInboxLastSeenStorageKey(), iso);
  } catch (_) {
    // ignore storage errors
  }
}

function isInboxMessageNew(createdAt) {
  if (!createdAt) {
    return false;
  }
  if (!adminLastSeenIso) {
    return true;
  }
  return Date.parse(createdAt) > Date.parse(adminLastSeenIso);
}

function renderAdminTodayCards() {
  if (!adminTodayCards) {
    return;
  }
  adminTodayCards.innerHTML = `
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Live maintenant</p>
      <p class="admin-weekly-value">${Number(adminTodayState.liveNow || 0)}</p>
    </article>
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Messages non traités</p>
      <p class="admin-weekly-value">${Number(adminTodayState.pendingMessages || 0)}</p>
    </article>
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Écoutes aujourd'hui</p>
      <p class="admin-weekly-value">${Number(adminTodayState.playsToday || 0)}</p>
    </article>
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Membres actifs 7j</p>
      <p class="admin-weekly-value">${Number(adminTodayState.activeMembers7d || 0)}</p>
    </article>
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Demandes à traiter</p>
      <p class="admin-weekly-value">${Number(adminTodayState.pendingMembers || 0)}</p>
    </article>
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Audios à corriger</p>
      <p class="admin-weekly-value">${Number(adminTodayState.brokenAudioCount || 0)}</p>
    </article>
  `;
}

function renderAdminWeeklyStats(data) {
  if (!adminWeeklyStats) {
    return;
  }
  const members = Number(data?.new_members || 0);
  const plays = Number(data?.plays || 0);
  const messages = Number(data?.messages || 0);
  adminWeeklyStats.innerHTML = `
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Nouveaux membres</p>
      <p class="admin-weekly-value">${members}</p>
    </article>
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Écoutes qualifiées</p>
      <p class="admin-weekly-value">${plays}</p>
    </article>
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Messages reçus</p>
      <p class="admin-weekly-value">${messages}</p>
    </article>
  `;
}

async function loadAdminWeeklyStats() {
  if (!canManageMembers() || !session?.access_token || !adminWeeklyStats || !adminUnlocked) {
    return;
  }
  adminWeeklyStats.innerHTML = "<p class=\"muted\">Chargement des indicateurs...</p>";
  try {
    const res = await fetch("/.netlify/functions/admin-weekly-stats", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      adminWeeklyStats.innerHTML = `<p class="muted">Impossible de charger les indicateurs (${data.error || res.status}).</p>`;
      return;
    }
    renderAdminWeeklyStats(data);
  } catch (_) {
    adminWeeklyStats.innerHTML = "<p class=\"muted\">Erreur réseau.</p>";
  }
}

function createBasicAdminMemberRow(member) {
  const row = document.createElement("div");
  row.className = "admin-member-item";

  const meta = document.createElement("div");
  meta.className = "admin-member-meta";
  meta.textContent = `${member.email || "email inconnu"} — ${member.member_status}`;
  row.appendChild(meta);

  const approveBtn = document.createElement("button");
  approveBtn.type = "button";
  approveBtn.textContent = "Valider";
  approveBtn.addEventListener("click", () => updateMemberStatus(member.id, "approve"));
  row.appendChild(approveBtn);

  const revokeBtn = document.createElement("button");
  revokeBtn.type = "button";
  revokeBtn.textContent = "Retirer";
  const isSelf = member.id && member.id === profile?.id;
  if (isSelf) {
    revokeBtn.disabled = true;
    revokeBtn.title = "Impossible de retirer votre propre accès admin.";
  } else {
    revokeBtn.addEventListener("click", () => updateMemberStatus(member.id, "revoke"));
  }
  row.appendChild(revokeBtn);

  return row;
}

function getQueueStatus(member) {
  if (member.audience_status) {
    return member.audience_status;
  }
  if (member.member_status === "priority" || member.member_status === "founder" || member.role === "founder") {
    return "vip";
  }
  if (member.member_status === "member" || member.role === "admin") {
    return "approved";
  }
  if (member.member_status === "blocked") {
    return "refused";
  }
  if (member.member_status === "archived") {
    return "archived";
  }
  return "new";
}

function getQueueLabel(member) {
  const status = getQueueStatus(member);
  return ADMIN_MEMBER_STATUS_LABELS[status] || status;
}

function createSelect(options, value, label) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", label);
  options.forEach(([optionValue, optionLabel]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    select.appendChild(option);
  });
  select.value = value || "";
  return select;
}

function createAdminTextField(label, value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.setAttribute("aria-label", label);
  input.placeholder = label;
  input.value = value || "";
  return input;
}

function createCheckboxGroup(titleText, options, selectedValues = []) {
  const selected = new Set(Array.isArray(selectedValues) ? selectedValues : []);
  const fieldset = document.createElement("fieldset");
  fieldset.className = "admin-check-group";
  const legend = document.createElement("legend");
  legend.textContent = titleText;
  fieldset.appendChild(legend);
  options.forEach(([value, label]) => {
    const item = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = value;
    checkbox.checked = selected.has(value);
    const text = document.createElement("span");
    text.textContent = label;
    item.appendChild(checkbox);
    item.appendChild(text);
    fieldset.appendChild(item);
  });
  fieldset.getSelectedValues = () => Array.from(fieldset.querySelectorAll("input:checked")).map((input) => input.value);
  return fieldset;
}

function createMemberAction(label, action, userId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost";
  button.textContent = label;
  button.addEventListener("click", () => {
    const confirmations = {
      refuse: "Confirmer le refus de cette demande ?",
      archive: "Archiver ce profil ?",
      revoke: "Retirer l'accès de ce membre ?",
    };
    if (confirmations[action] && !window.confirm(confirmations[action])) {
      return;
    }
    updateMemberStatus(userId, action);
  });
  return button;
}

function createCopyInvitationAction(member) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost";
  button.textContent = "Copier texte";
  button.addEventListener("click", async () => {
    const text = getInvitationText(member);
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Invitation copiée";
    } catch (_) {
      button.textContent = "Copie impossible";
    }
    setTimeout(() => {
      button.textContent = "Copier texte";
    }, 1400);
  });
  return button;
}

function createPersonalLinkAction(member) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost";
  button.textContent = "Créer lien";
  button.addEventListener("click", async () => {
    if (!member?.email || !session?.access_token) {
      button.textContent = "Email manquant";
      return;
    }
    button.disabled = true;
    button.textContent = "Création...";
    try {
      const res = await fetch("/.netlify/functions/admin-invite-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: member.email,
          audience_segment: normalizeAudienceSegment(member.audience_segment) || "public",
          member_status: member.member_status === "priority" ? "priority" : "member",
          admin_note: member.admin_note || "",
          delivery: "link",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.actionLink) {
        button.textContent = "Lien impossible";
      } else {
        await navigator.clipboard.writeText(data.actionLink);
        button.textContent = "Lien copié";
        await loadAdminAuditLog();
      }
    } catch (_) {
      button.textContent = "Copie impossible";
    } finally {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = "Créer lien";
      }, 1600);
    }
  });
  return button;
}

function renderAdminEntryLinks() {
  if (!adminEntryLinks) {
    return;
  }
  adminEntryLinks.innerHTML = "";
  ADMIN_ENTRY_LINKS.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "admin-entry-link";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "ghost";
    copy.textContent = "Copier";
    const url = buildAtelierEntryUrl(entry);
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        copy.textContent = "Copié";
      } catch (_) {
        copy.textContent = "Copie impossible";
      }
      setTimeout(() => {
        copy.textContent = "Copier";
      }, 1400);
    });

    const title = document.createElement("p");
    title.className = "admin-entry-link__title";
    title.textContent = entry.label;

    const meta = document.createElement("p");
    meta.className = "admin-entry-link__meta";
    meta.textContent = `${ENTRY_SOURCE_LABELS[entry.source] || entry.source} · ${getEntryDoorLabel(entry.door)}`;

    const audience = document.createElement("p");
    audience.className = "admin-entry-link__audience";
    audience.textContent = entry.audience || "Entrée Atelier";

    const note = document.createElement("p");
    note.className = "admin-entry-link__note";
    note.textContent = entry.note || "Demande d'accès seulement.";

    const guard = document.createElement("p");
    guard.className = "admin-entry-link__guard";
    guard.textContent = "Validation requise avant écoute";

    item.appendChild(copy);
    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(audience);
    item.appendChild(note);
    item.appendChild(guard);
    adminEntryLinks.appendChild(item);
  });
}

function appendAdminMemberDetails(content, member, fields, note, saveMeta) {
  const details = document.createElement("details");
  details.className = "admin-details";
  const summary = document.createElement("summary");
  summary.textContent = "Détails profil";
  details.appendChild(summary);
  details.appendChild(fields);
  details.appendChild(note);
  details.appendChild(saveMeta);
  content.appendChild(details);
}

function createAdminMemberRow(member) {
  const row = document.createElement("div");
  row.className = "admin-member-item";

  const content = document.createElement("div");
  content.className = "admin-member-content";

  const head = document.createElement("div");
  head.className = "admin-member-head";
  const email = document.createElement("p");
  email.className = "admin-member-email";
  email.textContent = member.email || "email inconnu";
  const badge = document.createElement("span");
  badge.className = `admin-member-badge is-${getQueueStatus(member)}`;
  badge.textContent = getQueueLabel(member);
  head.appendChild(email);
  head.appendChild(badge);
  content.appendChild(head);

  const meta = document.createElement("p");
  meta.className = "admin-member-meta";
  const segmentKey = normalizeAudienceSegment(member.audience_segment);
  const segment = ADMIN_MEMBER_SEGMENT_LABELS[segmentKey] || segmentKey;
  const entry = getEntryAdminLabel(member);
  meta.textContent = `Accès réel : ${getAccessLabel(member)} | Suivi : ${getQueueLabel(member)} | Profil : ${segment} | Entrée : ${entry}`;
  content.appendChild(meta);

  const fields = document.createElement("div");
  fields.className = "admin-member-fields";
  const queueStatus = createSelect([
    ["new", "Nouveau"],
    ["waiting", "À relancer"],
    ["approved", "Validé"],
    ["vip", "Prioritaire"],
    ["refused", "Refusé"],
    ["archived", "Archivé"],
  ], getQueueStatus(member), "Suivi interne");
  const segmentSelect = createSelect([
    ["public", "Public"],
    ["proche", "Proche"],
    ["artiste", "Artiste"],
    ["pro", "Pro"],
  ], segmentKey, "Profil d'écoute");
  const sourceSelect = createSelect([
    ["site", "Site"],
    ["concert", "Concert"],
    ["instagram", "Instagram"],
    ["email", "Email"],
    ["invitation", "Invitation"],
    ["bouche_a_oreille", "Bouche à oreille"],
    ["autre", "Autre"],
  ], member.source || "site", "Provenance");
  const accessSourceSelect = createSelect([
    ["site", "Site"],
    ["qr", "QR"],
    ["concert", "Concert"],
    ["instagram", "Instagram"],
    ["email", "Email"],
    ["invitation", "Invitation"],
    ["bouche_a_oreille", "Bouche à oreille"],
    ["direct", "Direct"],
    ["autre", "Autre"],
  ], member.access_source || getMemberSource(member) || "site", "Entrée précise");
  const accessWaveInput = createAdminTextField("Porte / vague", member.access_wave || "");
  fields.appendChild(queueStatus);
  fields.appendChild(segmentSelect);
  fields.appendChild(sourceSelect);
  fields.appendChild(accessSourceSelect);
  fields.appendChild(accessWaveInput);

  const accessHelp = document.createElement("p");
  accessHelp.className = "admin-field-help";
  accessHelp.textContent = "Le suivi classe le profil. L'accès réel se change avec Valider, Prioritaire, Refuser, Archiver ou Retirer.";

  const note = document.createElement("textarea");
  note.className = "admin-note-input";
  note.rows = 2;
  note.placeholder = "Note interne équipe";
  note.value = member.admin_note || "";

  const actions = document.createElement("div");
  actions.className = "admin-member-actions";
  actions.appendChild(createMemberAction("Valider + envoyer", "approve_and_send_access_email", member.id));
  actions.appendChild(createMemberAction("Valider", "approve", member.id));
  actions.appendChild(createMemberAction("Envoyer accès", "send_access_email", member.id));
  actions.appendChild(createCopyInvitationAction(member));
  actions.appendChild(createPersonalLinkAction(member));

  const secondary = document.createElement("details");
  secondary.className = "admin-action-menu";
  const secondarySummary = document.createElement("summary");
  secondarySummary.textContent = "Plus";
  secondary.appendChild(secondarySummary);
  secondary.appendChild(createMemberAction("Prioritaire", "vip", member.id));
  secondary.appendChild(createMemberAction("Refuser", "refuse", member.id));
  secondary.appendChild(createMemberAction("Archiver", "archive", member.id));
  const revokeBtn = createMemberAction("Retirer", "revoke", member.id);
  if (member.id && member.id === profile?.id) {
    revokeBtn.disabled = true;
    revokeBtn.title = "Impossible de retirer votre propre accès admin.";
  }
  secondary.appendChild(revokeBtn);
  actions.appendChild(secondary);

  const saveMeta = document.createElement("button");
  saveMeta.type = "button";
  saveMeta.className = "ghost";
  saveMeta.textContent = "Sauver profil";
  saveMeta.addEventListener("click", () => updateMemberMeta(member.id, {
    audience_status: queueStatus.value,
    audience_segment: segmentSelect.value,
    source: sourceSelect.value,
    access_source: accessSourceSelect.value,
    access_wave: accessWaveInput.value,
    admin_note: note.value,
  }));
  content.appendChild(actions);
  fields.appendChild(accessHelp);
  appendAdminMemberDetails(content, member, fields, note, saveMeta);

  row.appendChild(content);

  return row;
}

async function loadAdminMembers() {
  if (!canManageMembers() || !session?.access_token || !adminPanel || !adminMembersList || !adminUnlocked) {
    return;
  }

  show(adminPanel);
  adminMembersList.innerHTML = "<p class=\"muted\">Chargement...</p>";

  try {
    const res = await fetch("/.netlify/functions/admin-members", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      adminMembersList.innerHTML = `<p class="muted">Impossible de charger la liste (${data.error || res.status}).</p>`;
      return;
    }

    adminMembersCache = (data.members || []).filter((member) => member.email);
    renderAdminMembers();
  } catch (_) {
    adminMembersList.innerHTML = "<p class=\"muted\">Erreur réseau.</p>";
  }
}

function renderAdminMembers() {
  if (!adminMembersList) {
    return;
  }
  if (adminMembersSummary) {
    const counts = adminMembersCache.reduce((acc, member) => {
      const status = getQueueStatus(member);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    adminMembersSummary.innerHTML = `
      <span>Nouveaux ${counts.new || 0}</span>
      <span>A relancer ${counts.waiting || 0}</span>
      <span>Valides ${counts.approved || 0}</span>
      <span>Prioritaires ${counts.vip || 0}</span>
      <span>Refuses ${counts.refused || 0}</span>
    `;
  }
  const term = String(adminSearchInput?.value || "").trim().toLowerCase();
  const filtered = adminMembersCache.filter((member) => {
    const queueStatus = getQueueStatus(member);
    const pendingStatuses = ["new", "waiting", "refused", "archived"];
    const statusOk = adminViewMode === "pending"
      ? !isMember(member.member_status) || pendingStatuses.includes(queueStatus)
      : isMember(member.member_status) || member.role === "admin" || queueStatus === "approved" || queueStatus === "vip";
    const haystack = [
      member.email,
      member.audience_status,
      member.audience_segment,
      member.source,
      member.access_source,
      member.access_wave,
      member.admin_note,
    ].join(" ").toLowerCase();
    const searchOk = !term || haystack.includes(term);
    return statusOk && searchOk;
  });

  adminMembersList.innerHTML = "";
  if (filtered.length === 0) {
    adminMembersList.innerHTML = "<p class=\"muted\">Aucun profil dans cette vue.</p>";
    return;
  }

  filtered.forEach((member) => {
    adminMembersList.appendChild(createAdminMemberRow(member));
  });
}

function formatInboxDate(iso) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return iso || "-";
  }
}

function getMemberDisplayName() {
  const email = profile?.email || session?.user?.email || "";
  if (!email) {
    return "toi";
  }
  return email.split("@")[0].replace(/[._-]+/g, " ");
}

function formatShortDate(iso) {
  if (!iso) {
    return "pas encore";
  }
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  } catch (_) {
    return "pas encore";
  }
}

function renderMemberPersonalStats(stats = {}) {
  if (!memberPersonalStats) {
    return;
  }
  memberPersonalStats.innerHTML = "";
  hide(memberPersonalStats);
}

async function loadMemberPersonalStats() {
  renderMemberPersonalStats({});
}

function populateInboxFilters() {
  if (!adminInboxTrackFilter || !adminInboxSenderFilter) {
    return;
  }

  const tracks = [...new Set(adminInboxCache.map((item) => item.track_title).filter(Boolean))].sort();
  const senders = [...new Set(adminInboxCache.map((item) => item.sender_email).filter(Boolean))].sort();

  const currentTrack = adminInboxTrackFilter.value;
  const currentSender = adminInboxSenderFilter.value;

  adminInboxTrackFilter.innerHTML = "<option value=\"\">Tous les morceaux</option>";
  tracks.forEach((title) => {
    const option = document.createElement("option");
    option.value = title;
    option.textContent = formatTrackTitle(title);
    adminInboxTrackFilter.appendChild(option);
  });

  adminInboxSenderFilter.innerHTML = "<option value=\"\">Tous les expéditeurs</option>";
  senders.forEach((email) => {
    const option = document.createElement("option");
    option.value = email;
    option.textContent = email;
    adminInboxSenderFilter.appendChild(option);
  });

  if (tracks.includes(currentTrack)) {
    adminInboxTrackFilter.value = currentTrack;
  }
  if (senders.includes(currentSender)) {
    adminInboxSenderFilter.value = currentSender;
  }
}

function formatProcessedState(item) {
  if (item.admin_status !== "processed") {
    return "Statut : non traité";
  }
  const who = item.processed_by_email ? ` par ${item.processed_by_email}` : "";
  const when = item.processed_at ? ` le ${formatInboxDate(item.processed_at)}` : "";
  return `Statut : traité${who}${when}`;
}

function formatMessageTags(tags = []) {
  const list = Array.isArray(tags) ? tags : [];
  return list.map(getFeedbackTagLabel).filter(Boolean).join(", ");
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportInboxCsv() {
  if (!adminInboxCache.length) {
    return;
  }
  const rows = [
    ["date", "email", "morceau", "axe", "message", "note_admin", "reponse_morjane", "statut"],
    ...adminInboxCache.map((item) => [
      item.created_at,
      item.sender_email,
      item.track_title,
      formatMessageTags(item.feedback_tags || []),
      item.content,
      item.admin_note,
      item.admin_reply,
      item.admin_status,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `atelier-retours-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const SIGNAL_STOPWORDS = new Set([
  "avec", "alors", "apres", "avant", "avoir", "dans", "donc", "elle", "elles", "encore",
  "etre", "faire", "mais", "meme", "moins", "nous", "pour", "quand", "sans", "sont",
  "tout", "tres", "plus", "cest", "comme", "cette", "celui", "cela", "peut", "peu",
  "quoi", "bien", "juste", "vraiment", "morceau", "maquette", "titre", "refrain",
]);

function getRecurringTerms(messages = []) {
  const counts = new Map();
  messages.forEach((item) => {
    String(item.content || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/i)
      .filter((word) => word.length > 3 && !SIGNAL_STOPWORDS.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
}

function renderAdminSignalBoard() {
  if (!adminSignalBoard) {
    return;
  }
  const byTrack = new Map();
  adminInboxCache.forEach((item) => {
    const title = item.track_title || "Maquette";
    if (!byTrack.has(title)) {
      byTrack.set(title, { title, tags: new Map(), messages: [] });
    }
    const bucket = byTrack.get(title);
    (item.feedback_tags || []).forEach((tag) => {
      bucket.tags.set(tag, (bucket.tags.get(tag) || 0) + 1);
    });
    if (item.content) {
      bucket.messages.push(item);
    }
  });

  const tracks = [...byTrack.values()];
  if (!tracks.length) {
    adminSignalBoard.innerHTML = "<p class=\"muted\">Aucun signal pour le moment.</p>";
    return;
  }

  adminSignalBoard.innerHTML = "";
  tracks.forEach((track) => {
    const topTag = [...track.tags.entries()].sort((a, b) => b[1] - a[1])[0];
    const best = [...track.messages].sort((a, b) => String(b.content || "").length - String(a.content || "").length)[0];
    const doubt = track.messages.find((item) => (item.feedback_tags || []).includes("doubt") || (item.feedback_tags || []).includes("weak"));
    const weakSignals = getRecurringTerms(track.messages);
    const card = document.createElement("article");
    card.className = "admin-signal-item";
    const title = document.createElement("p");
    title.className = "admin-status-title";
    title.textContent = formatTrackTitle(track.title);
    const dominant = document.createElement("p");
    dominant.className = "admin-status-meta";
    dominant.textContent = `Signal dominant : ${topTag ? `${getFeedbackTagLabel(topTag[0])} (${topTag[1]})` : "pas encore"}`;
    const recurringDoubt = document.createElement("p");
    recurringDoubt.className = "admin-status-meta";
    recurringDoubt.textContent = `Doute récurrent : ${doubt ? doubt.content : "aucun signal fort"}`;
    const weakSignalText = document.createElement("p");
    weakSignalText.className = "admin-status-meta";
    weakSignalText.textContent = `Signaux faibles : ${weakSignals.length ? weakSignals.map(([word, count]) => `${word} (${count})`).join(", ") : "pas assez de récurrence"}`;
    const bestFeedback = document.createElement("p");
    bestFeedback.className = "admin-status-meta";
    bestFeedback.textContent = `Meilleur retour : ${best ? best.content : "aucun message"}`;
    card.appendChild(title);
    card.appendChild(dominant);
    card.appendChild(recurringDoubt);
    card.appendChild(weakSignalText);
    card.appendChild(bestFeedback);
    adminSignalBoard.appendChild(card);
  });
}

function exportSignalCsv() {
  const rows = [["morceau", "signal_dominant", "signaux_faibles", "meilleur_retour", "doute"]];
  const byTrack = new Map();
  adminInboxCache.forEach((item) => {
    const title = item.track_title || "Maquette";
    if (!byTrack.has(title)) {
      byTrack.set(title, { title, tags: new Map(), messages: [] });
    }
    const bucket = byTrack.get(title);
    (item.feedback_tags || []).forEach((tag) => bucket.tags.set(tag, (bucket.tags.get(tag) || 0) + 1));
    if (item.content) bucket.messages.push(item);
  });

  [...byTrack.values()].forEach((track) => {
    const topTag = [...track.tags.entries()].sort((a, b) => b[1] - a[1])[0];
    const best = [...track.messages].sort((a, b) => String(b.content || "").length - String(a.content || "").length)[0];
    const doubt = track.messages.find((item) => (item.feedback_tags || []).includes("doubt") || (item.feedback_tags || []).includes("weak"));
    const weakSignals = getRecurringTerms(track.messages).map(([word, count]) => `${word} (${count})`).join(", ");
    rows.push([
      formatTrackTitle(track.title),
      topTag ? `${getFeedbackTagLabel(topTag[0])} (${topTag[1]})` : "",
      weakSignals,
      best?.content || "",
      doubt?.content || "",
    ]);
  });

  const csv = rows.map((row) => row.map((value) => `"${String(value || "").replace(/"/g, "\"\"")}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `atelier-signaux-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderWaveNote() {
  if (!memberWaveNote) {
    return;
  }
  const segment = getAudienceSegmentCopy(profile?.audience_segment);
  memberWaveNote.innerHTML = "";
  const title = document.createElement("p");
  title.className = "season-note__title";
  title.textContent = "Avant la sortie";
  const body = document.createElement("p");
  body.textContent = `${segment.welcome} Ton écoute aide à voir ce qui tient, ce qui manque et ce qui reste.`;
  memberWaveNote.appendChild(title);
  memberWaveNote.appendChild(body);
  const memoryLine = getLastVisitMemoryLine();
  if (memoryLine) {
    const memory = document.createElement("p");
    memory.className = "season-note__memory";
    memory.textContent = memoryLine;
    memberWaveNote.appendChild(memory);
  }
  show(memberWaveNote);
}

function renderTrackTimeline(status) {
  if (!trackTimeline) {
    return;
  }
  const steps = [
    ["testing", "en mouvement"],
    ["rework", "reecriture"],
    ["kept", "retenu"],
  ];
  const activeIndex = Math.max(0, steps.findIndex(([value]) => value === status));
  trackTimeline.innerHTML = "";
  steps.forEach(([, label], index) => {
    if (index > 0) {
      const arrow = document.createElement("b");
      arrow.textContent = "->";
      trackTimeline.appendChild(arrow);
    }
    const step = document.createElement("span");
    if (index <= activeIndex) {
      step.className = "is-active";
    }
    step.textContent = label;
    trackTimeline.appendChild(step);
  });
}

function showAdminSection(name) {
  const memberTabs = document.querySelector(".admin-tabs");
  if (memberTabs) {
    memberTabs.classList.toggle("hidden", name !== "requests");
  }
  document.querySelectorAll("[data-admin-panel-section]").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.adminPanelSection !== name);
  });
  document.querySelectorAll("[data-admin-section]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminSection === name);
  });
}

function renderAdminInbox() {
  if (!adminInboxList) {
    return;
  }

  const term = String(adminInboxSearch?.value || "").trim().toLowerCase();
  const selectedTrack = String(adminInboxTrackFilter?.value || "");
  const selectedSender = String(adminInboxSenderFilter?.value || "");
  adminInboxList.innerHTML = "";
  let unreadCount = 0;
  if (!adminInboxCache.length) {
    adminInboxList.innerHTML = "<p class=\"muted\">Aucun message pour le moment.</p>";
    if (adminInboxUnread) {
      adminInboxUnread.textContent = "Nouveaux messages : 0";
    }
    return;
  }

  const filteredMessages = adminInboxCache.filter((item) => {
    const unread = isInboxMessageNew(item.created_at);
    const content = `${item.sender_email || ""} ${item.track_title || ""} ${item.content || ""}`.toLowerCase();
    const matchSearch = !term || content.includes(term);
    const matchUnread = !adminInboxUnreadOnly || unread;
    const matchTrack = !selectedTrack || item.track_title === selectedTrack;
    const matchSender = !selectedSender || item.sender_email === selectedSender;
    return matchSearch && matchUnread && matchTrack && matchSender;
  });

  if (filteredMessages.length === 0) {
    adminInboxList.innerHTML = "<p class=\"muted\">Aucun message dans ce filtre.</p>";
  }

  const buckets = { new: [], todo: [], done: [] };
  filteredMessages.forEach((item) => {
    if (item.admin_status === "processed") {
      buckets.done.push(item);
    } else if (isInboxMessageNew(item.created_at)) {
      buckets.new.push(item);
    } else {
      buckets.todo.push(item);
    }
  });

  const columnsWrap = document.createElement("div");
  columnsWrap.className = "admin-inbox-columns";
  const columns = [
    { key: "new", label: "Nouveau" },
    { key: "todo", label: "A traiter" },
    { key: "done", label: "Traite" },
  ];

  columns.forEach(({ key, label }) => {
    const col = document.createElement("section");
    col.className = "admin-inbox-column";
    col.innerHTML = `
      <header class="admin-inbox-column-head">
        <h4>${label}</h4>
        <span>${buckets[key].length}</span>
      </header>
      <div class="admin-inbox-column-list"></div>
    `;
    const list = col.querySelector(".admin-inbox-column-list");

    if (buckets[key].length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Aucun message";
      list.appendChild(empty);
      columnsWrap.appendChild(col);
      return;
    }

    buckets[key].forEach((item) => {
      const card = document.createElement("article");
      card.className = "admin-inbox-item";

      const head = document.createElement("div");
      head.className = "admin-inbox-head";
      const sender = document.createElement("strong");
      sender.textContent = item.sender_email || "Email inconnu";
      head.appendChild(sender);

      const meta = document.createElement("span");
      meta.className = "admin-inbox-meta";
      meta.textContent = `${formatTrackTitle(item.track_title || "Maquette")} - ${formatInboxDate(item.created_at)}`;
      head.appendChild(meta);

      if (isInboxMessageNew(item.created_at)) {
        unreadCount += 1;
        const badge = document.createElement("span");
        badge.className = "admin-inbox-badge";
        badge.textContent = "Nouveau";
        head.appendChild(badge);
      }

      const body = document.createElement("p");
      body.className = "admin-inbox-body";
      body.textContent = item.content || "";

      const tags = document.createElement("p");
      tags.className = "admin-inbox-tags";
      tags.textContent = formatMessageTags(item.feedback_tags || []);

      const state = document.createElement("p");
      state.className = "admin-inbox-state";
      state.textContent = formatProcessedState(item);

      const noteInput = document.createElement("textarea");
      noteInput.className = "admin-note-input";
      noteInput.rows = 2;
      noteInput.placeholder = "Note admin privee";
      noteInput.value = item.admin_note || "";

      const replyInput = document.createElement("textarea");
      replyInput.className = "admin-note-input";
      replyInput.rows = 2;
      replyInput.placeholder = "Réponse courte au membre";
      replyInput.value = item.admin_reply || "";

      const actions = document.createElement("div");
      actions.className = "admin-inbox-actions";
      const quickActions = document.createElement("div");
      quickActions.className = "admin-inbox-actions admin-inbox-actions--quick";
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "ghost";
      actionBtn.textContent = item.admin_status === "processed" ? "Remettre non traité" : "Marquer traité";
      actionBtn.addEventListener("click", async () => {
        await updateMessageStatus(item.id, item.admin_status === "processed" ? "mark_new" : "mark_processed");
      });
      quickActions.appendChild(actionBtn);

      const saveNoteBtn = document.createElement("button");
      saveNoteBtn.type = "button";
      saveNoteBtn.className = "ghost";
      saveNoteBtn.textContent = "Enregistrer note";
      saveNoteBtn.addEventListener("click", async () => {
        await updateMessageStatus(item.id, "set_note", noteInput.value || "");
      });
      actions.appendChild(saveNoteBtn);

      const saveReplyBtn = document.createElement("button");
      saveReplyBtn.type = "button";
      saveReplyBtn.className = "ghost";
      saveReplyBtn.textContent = "Enregistrer réponse";
      saveReplyBtn.addEventListener("click", async () => {
        await updateMessageStatus(item.id, "set_reply", replyInput.value || "");
      });
      actions.appendChild(saveReplyBtn);

      const details = document.createElement("details");
      details.className = "admin-details";
      const summary = document.createElement("summary");
      summary.textContent = "Traiter";
      details.appendChild(summary);
      details.appendChild(noteInput);
      details.appendChild(replyInput);
      details.appendChild(actions);

      card.appendChild(head);
      card.appendChild(body);
      if (tags.textContent) {
        card.appendChild(tags);
      }
      card.appendChild(state);
      card.appendChild(quickActions);
      card.appendChild(details);
      list.appendChild(card);
    });

    columnsWrap.appendChild(col);
  });

  if (filteredMessages.length > 0) {
    adminInboxList.appendChild(columnsWrap);
  }

  if (adminInboxUnread) {
    adminInboxUnread.textContent = `Nouveaux messages : ${unreadCount}`;
  }
}

async function updateMessageStatus(messageId, action, note = "") {
  if (!canManageMembers() || !session?.access_token || !messageId) {
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/admin-inbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messageId, action, note }),
    });
    if (!res.ok) {
      return;
    }
    await loadAdminInbox();
    await loadAdminAuditLog();
    await loadAdminStatus();
  } catch (_) {
    // no-op
  }
}

async function loadAdminInbox() {
  if (!canManageMembers() || !session?.access_token || !adminInboxList || !adminUnlocked) {
    return;
  }

  adminInboxList.innerHTML = "<p class=\"muted\">Chargement des messages...</p>";
  try {
    const res = await fetch("/.netlify/functions/admin-inbox", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      adminInboxList.innerHTML = `<p class="muted">Impossible de charger les messages (${data.error || res.status}).</p>`;
      return;
    }

    adminInboxCache = Array.isArray(data.messages) ? data.messages : [];
    adminTodayState.pendingMessages = adminInboxCache.filter((item) => item.admin_status !== "processed").length;
    renderAdminTodayCards();
    populateInboxFilters();
    renderAdminInbox();
    renderAdminSignalBoard();
  } catch (_) {
    adminInboxList.innerHTML = "<p class=\"muted\">Erreur réseau.</p>";
  }
}

function renderAdminVotesSummary(summary = []) {
  if (!adminVotesSummary) {
    return;
  }
  if (!summary.length) {
    adminVotesSummary.innerHTML = "<p class=\"muted\">Aucun vote pour le moment.</p>";
    return;
  }

  adminVotesSummary.innerHTML = "";
  summary.forEach((row) => {
    const card = document.createElement("article");
    card.className = "admin-vote-item";
    const title = document.createElement("p");
    title.className = "admin-vote-title";
    title.textContent = formatTrackTitle(row.track_title);
    const meta = document.createElement("p");
    meta.className = "admin-vote-meta";
    meta.textContent = `Total votes : ${row.total} | À garder : ${row.keep} | À retravailler : ${row.revise} | À écarter : ${row.discard}`;
    card.appendChild(title);
    card.appendChild(meta);
    adminVotesSummary.appendChild(card);
  });
}

async function loadAdminVotesSummary() {
  if (!canManageMembers() || !session?.access_token || !adminVotesSummary || !adminUnlocked) {
    return;
  }
  adminVotesSummary.innerHTML = "<p class=\"muted\">Chargement des votes...</p>";
  try {
    const res = await fetch("/.netlify/functions/admin-votes-summary", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      adminVotesSummary.innerHTML = `<p class="muted">Impossible de charger (${data.error || res.status}).</p>`;
      return;
    }
    renderAdminVotesSummary(Array.isArray(data.summary) ? data.summary : []);
  } catch (_) {
    adminVotesSummary.innerHTML = "<p class=\"muted\">Erreur réseau.</p>";
  }
}

function renderAdminTrackCreateForm(seasons = []) {
  if (!adminTrackSeasonSelect) {
    return;
  }
  const current = adminTrackSeasonSelect.value;
  adminTrackSeasonSelect.innerHTML = "";
  seasons.forEach((season) => {
    const option = document.createElement("option");
    option.value = season.slug || "";
    option.textContent = season.title || season.slug || "Acte";
    adminTrackSeasonSelect.appendChild(option);
  });
  if (current && Array.from(adminTrackSeasonSelect.options).some((option) => option.value === current)) {
    adminTrackSeasonSelect.value = current;
  }
  renderAdminAudioSelect(adminTrackAudioSelect, adminTrackPathInput?.value || "");
}

function createTrackInput(labelText, value, type = "text") {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = type;
  input.value = value || "";
  label.appendChild(input);
  label.input = input;
  return label;
}

function createSeasonSelect(seasons, value) {
  const label = document.createElement("label");
  label.textContent = "Acte";
  const select = document.createElement("select");
  seasons.forEach((season) => {
    const option = document.createElement("option");
    option.value = season.slug || "";
    option.textContent = season.title || season.slug || "Acte";
    select.appendChild(option);
  });
  select.value = value || seasons[0]?.slug || "";
  label.appendChild(select);
  label.select = select;
  return label;
}

function renderAdminAudioSelect(select, selectedPath = "") {
  if (!select) {
    return;
  }
  const current = selectedPath || select.value || "";
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Choisir un fichier audio";
  select.appendChild(empty);
  adminAudioFilesCache.forEach((file) => {
    const option = document.createElement("option");
    option.value = file.path;
    option.textContent = file.path;
    select.appendChild(option);
  });
  if (current && Array.from(select.options).some((option) => option.value === current)) {
    select.value = current;
  }
}

function createAudioFileSelect(value) {
  const label = document.createElement("label");
  label.textContent = "Fichier Storage";
  const select = document.createElement("select");
  renderAdminAudioSelect(select, value);
  label.appendChild(select);
  label.select = select;
  return label;
}

function getSeasonFolderFromSlug(slug) {
  return ({
    "acte-i": "Acte I",
    "acte-ii": "Acte II",
    "acte-0": "Acte 0",
    "hors-acte": "Hors acte",
  }[slug] || "Acte I");
}

function buildExpectedTrackPath(title, seasonSlug, currentPath = "") {
  const existingExtension = String(currentPath || "").match(/\.(m4a|mp3|wav|aac)$/i)?.[0] || ".mp3";
  const safeTitle = String(title || "Nouveau morceau").trim().replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ");
  return `${getSeasonFolderFromSlug(seasonSlug)}/${safeTitle}${existingExtension}`;
}

function formatAdminShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function getTrackSimpleState(track) {
  if (track.status === "archived") return { label: "Archivé", className: "is-hidden" };
  if (track.status === "draft") return { label: "Préparé", className: "is-hidden" };
  if (!track.audio_ok) return { label: "Audio à corriger", className: "is-warning" };
  if ((track.allowed_audience_segments || []).length || (track.allowed_member_statuses || []).length || ["acte-0", "hors-acte"].includes(track.season_slug)) {
    return { label: "Réservé", className: "is-reserved" };
  }
  return { label: "Ouvert", className: "is-open" };
}

function getTrackAccessSummary(track) {
  if (track.status === "archived") return "Archivé : invisible pour le cercle.";
  if (track.status === "draft") return "Préparé mais caché : visible seulement en admin.";
  const segmentLabels = {
    public: "public",
    proche: "proches",
    artiste: "artistes",
    pro: "pros",
  };
  const statusLabels = {
    member: "membres",
    priority: "prioritaires",
    founder: "fondateurs",
  };
  const segments = (track.allowed_audience_segments || []).map((item) => segmentLabels[item] || item);
  const statuses = (track.allowed_member_statuses || []).map((item) => statusLabels[item] || item);
  const parts = [];
  if (segments.length) parts.push(`Profils : ${segments.join(", ")}`);
  if (statuses.length) parts.push(`Accès : ${statuses.join(", ")}`);
  if (!parts.length && ["acte-0", "hors-acte"].includes(track.season_slug)) {
    return "Réservé par acte : proches, prioritaires et fondateurs.";
  }
  return parts.length ? parts.join(" | ") : "Visible pour tous les membres validés.";
}

function getTrackOpeningChecklist(track) {
  const items = [
    ["Titre", Boolean(String(track.title || "").trim())],
    ["Audio", Boolean(track.audio_ok)],
    ["Acte", Boolean(track.season_slug || track.season_id)],
    ["Question", Boolean(String(track.feedback_question || "").trim())],
    ["Visibilité", track.status === "active"],
  ];
  return {
    items,
    ready: items.every(([, ok]) => ok),
  };
}

function canPreviewAccessTrack(track, segment, status) {
  if (track.status !== "active" || !track.audio_ok) {
    return false;
  }
  const allowedSegments = track.allowed_audience_segments || [];
  const allowedStatuses = track.allowed_member_statuses || [];
  if (allowedSegments.length && !allowedSegments.includes(segment)) {
    return false;
  }
  if (allowedStatuses.length && !allowedStatuses.includes(status)) {
    return false;
  }
  if (["acte-0", "hors-acte"].includes(track.season_slug)) {
    return segment === "proche" || status === "priority" || status === "founder";
  }
  return true;
}

function renderAdminProfilePreview() {
  if (!adminPreviewList) {
    return;
  }
  const segment = adminPreviewSegment?.value || "public";
  const status = adminPreviewStatus?.value || "member";
  const visibleTracks = adminTrackCache.filter((track) => canPreviewAccessTrack(track, segment, status));
  adminPreviewList.innerHTML = "";
  if (!visibleTracks.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Aucun morceau visible pour ce profil.";
    adminPreviewList.appendChild(empty);
    return;
  }
  groupTracksBySeason(visibleTracks).forEach((group) => {
    const line = document.createElement("p");
    line.className = "admin-preview-line";
    const titles = group.tracks.map((track) => formatTrackTitle(track.title)).join(", ");
    line.textContent = `${formatSeasonTitle(group.season)} : ${titles}`;
    adminPreviewList.appendChild(line);
  });
}

async function copyTextToClipboard(text, button, restoredLabel) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copié";
  } catch (_) {
    button.textContent = "Copie impossible";
  }
  setTimeout(() => {
    button.textContent = restoredLabel;
  }, 1400);
}

function buildAdminAnnouncementText() {
  const visibleTracks = (adminTrackCache || [])
    .filter((track) => track.status === "active" && track.audio_ok && track.announcement_enabled !== false)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const latest = visibleTracks[0];
  if (!latest) {
    return "L'Atelier est ouvert, mais aucune nouvelle version n'est prête à annoncer pour le moment.";
  }

  const season = formatSeasonTitle(getTrackSeason(latest));
  return [
    "L'Atelier a bougé.",
    "",
    latest.announcement_text || `${formatTrackTitle(latest.title)} est maintenant ouvert dans ${season}.`,
    "",
    "Si tu as un moment, ton écoute peut encore aider la chanson à trouver sa forme définitive.",
    "",
    "Entrer dans l'Atelier : https://morjane.re/atelier/",
  ].join("\n");
}

function renderAdminAnnouncement() {
  if (!adminAnnouncementText) {
    return;
  }
  adminAnnouncementText.value = buildAdminAnnouncementText();
}

function renderAdminTrackCockpit(tracks = [], seasons = []) {
  if (!adminTrackCockpit) {
    return;
  }
  adminTrackCache = Array.isArray(tracks) ? tracks : [];
  renderAdminTrackCreateForm(seasons);
  renderAdminProfilePreview();
  renderAdminAnnouncement();
  if (!tracks.length) {
    adminTrackCockpit.innerHTML = "<p class=\"muted\">Aucun morceau trouvé.</p>";
    return;
  }

  adminTrackCockpit.innerHTML = "";
  const missingAudioCount = tracks.filter((track) => !track.audio_ok).length;
  const summary = document.createElement("p");
  summary.className = "admin-field-help";
  summary.textContent = `${tracks.length} morceaux | ${missingAudioCount} audio à vérifier`;
  adminTrackCockpit.appendChild(summary);
  tracks.forEach((track) => {
    const card = document.createElement("article");
    card.className = "admin-track-item";
    const head = document.createElement("div");
    head.className = "admin-track-head";
    const headContent = document.createElement("div");
    const title = document.createElement("p");
    title.className = "admin-status-title";
    title.textContent = formatTrackTitle(track.title);
    const cue = document.createElement("p");
    cue.className = "admin-decision-cue";
    cue.textContent = getTrackDecisionCue(track);
    const stats = document.createElement("p");
    stats.className = "admin-status-meta";
    stats.textContent = `${getDecisionStatusLabel(track.decision_status)} | ${track.plays || 0} écoutes | ${track.likes || 0} likes | ${track.messages || 0} messages`;
    const votes = document.createElement("p");
    votes.className = "admin-status-meta";
    votes.textContent = `Votes : garder ${track.votes?.develop || 0} | retravailler ${track.votes?.revise || 0} | écarter ${track.votes?.leave || 0}`;
    const audioStatus = document.createElement("p");
    audioStatus.className = "admin-status-meta";
    audioStatus.textContent = track.audio_ok
      ? `Audio OK : ${track.storage_path || "chemin non renseigné"}`
      : `Audio à vérifier : ${track.storage_path || "chemin non renseigné"}`;
    const visibilitySummary = document.createElement("p");
    visibilitySummary.className = "admin-status-meta";
    visibilitySummary.textContent = getTrackAccessSummary(track);
    const history = document.createElement("p");
    history.className = "admin-track-history";
    const created = formatAdminShortDate(track.created_at);
    const changed = formatAdminShortDate(track.last_admin_action_at);
    history.textContent = [
      created ? `Créé le ${created}` : "",
      track.last_admin_action && changed ? `Dernière action : ${track.last_admin_action} (${changed})` : "",
    ].filter(Boolean).join(" | ") || "Historique léger en attente.";
    headContent.appendChild(title);
    headContent.appendChild(cue);
    headContent.appendChild(stats);
    headContent.appendChild(votes);
    headContent.appendChild(audioStatus);
    headContent.appendChild(visibilitySummary);
    headContent.appendChild(history);
    head.appendChild(headContent);
    const simpleState = getTrackSimpleState(track);
    const stateBadge = document.createElement("span");
    stateBadge.className = `admin-track-state ${simpleState.className}`;
    stateBadge.textContent = simpleState.label;
    head.appendChild(stateBadge);

    const checklistData = getTrackOpeningChecklist(track);
    const checklist = document.createElement("div");
    checklist.className = "admin-open-checklist";
    const checklistTitle = document.createElement("p");
    checklistTitle.className = `admin-open-checklist__title ${checklistData.ready ? "is-ready" : ""}`;
    checklistTitle.textContent = checklistData.ready ? "Prêt à ouvrir" : "À compléter avant ouverture";
    checklist.appendChild(checklistTitle);
    checklistData.items.forEach(([label, ok]) => {
      const item = document.createElement("span");
      item.className = ok ? "is-ok" : "is-missing";
      item.textContent = `${ok ? "OK" : "À faire"} · ${label}`;
      checklist.appendChild(item);
    });

    const fields = document.createElement("div");
    fields.className = "admin-track-fields";
    const titleField = createTrackInput("Titre", track.title);
    const seasonField = createSeasonSelect(seasons, track.season_slug);
    const pathField = createTrackInput("Chemin audio", track.storage_path);
    const audioField = createAudioFileSelect(track.storage_path);
    audioField.select.addEventListener("change", () => {
      if (audioField.select.value) {
        pathField.input.value = audioField.select.value;
      }
    });
    const orderField = createTrackInput("Ordre", track.sort_order, "number");
    fields.appendChild(titleField);
    fields.appendChild(seasonField);
    fields.appendChild(pathField);
    fields.appendChild(audioField);
    fields.appendChild(orderField);

    const pathActions = document.createElement("div");
    pathActions.className = "admin-track-actions";
    const testAudio = document.createElement("button");
    testAudio.type = "button";
    testAudio.className = "ghost";
    testAudio.textContent = "Tester audio";
    testAudio.disabled = !track.audio_preview_url;
    testAudio.addEventListener("click", () => {
      if (track.audio_preview_url) {
        window.open(track.audio_preview_url, "_blank", "noopener,noreferrer");
      }
    });
    const copyPath = document.createElement("button");
    copyPath.type = "button";
    copyPath.className = "ghost";
    copyPath.textContent = "Copier chemin";
    copyPath.addEventListener("click", async () => {
      const expectedPath = pathField.input.value.trim() || buildExpectedTrackPath(titleField.input.value, seasonField.select.value, track.storage_path);
      await copyTextToClipboard(expectedPath, copyPath, "Copier chemin");
    });
    pathActions.appendChild(testAudio);
    pathActions.appendChild(copyPath);

    const statusLabel = document.createElement("label");
    statusLabel.textContent = "Statut artistique";
    const status = document.createElement("select");
    [
      ["testing", "En test"],
      ["kept", "Retenue"],
      ["rework", "À retravailler"],
      ["paused", "En pause"],
      ["released", "Sortie"],
      ["archived", "Archivée"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      status.appendChild(option);
    });

    const visibilityLabel = document.createElement("label");
    visibilityLabel.textContent = "État public";
    const visibility = document.createElement("select");
    [
      ["active", "Visible au cercle"],
      ["draft", "Préparé mais caché"],
      ["archived", "Archivé"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      visibility.appendChild(option);
    });

    const intentLabel = document.createElement("label");
    intentLabel.textContent = "Intention courte";
    const intent = document.createElement("textarea");
    intent.rows = 3;
    intent.placeholder = "Une ligne pour situer ce morceau sans trop l'expliquer.";

    const questionLabel = document.createElement("label");
    questionLabel.textContent = "Question posée au cercle";
    const question = document.createElement("textarea");
    question.rows = 2;
    question.placeholder = "Ex: Est-ce que le refrain tient ?";
    const announcementToggle = document.createElement("label");
    announcementToggle.className = "admin-toggle-line";
    const announcementCheckbox = document.createElement("input");
    announcementCheckbox.type = "checkbox";
    announcementCheckbox.checked = track.announcement_enabled !== false;
    const announcementToggleText = document.createElement("span");
    announcementToggleText.textContent = "Annoncer ce morceau dans les mouvements";
    announcementToggle.appendChild(announcementCheckbox);
    announcementToggle.appendChild(announcementToggleText);

    const announcementLabel = document.createElement("label");
    announcementLabel.textContent = "Texte d’annonce";
    const announcementText = document.createElement("textarea");
    announcementText.rows = 2;
    announcementText.placeholder = "Ex: Vérité coupée est entrée dans l’Atelier. Elle cherche encore son point de rupture.";

    const segmentAccess = createCheckboxGroup("Visible pour profils", [
      ["public", "Public"],
      ["proche", "Proche"],
      ["artiste", "Artiste"],
      ["pro", "Pro"],
    ], track.allowed_audience_segments || []);

    const statusAccess = createCheckboxGroup("Visible pour accès", [
      ["member", "Membres"],
      ["priority", "Prioritaires"],
      ["founder", "Fondateurs"],
    ], track.allowed_member_statuses || []);

    const accessHint = document.createElement("p");
    accessHint.className = "admin-field-help";
    accessHint.textContent = "Aucune case cochée = visible pour tous les membres validés.";

    const accessTitle = document.createElement("p");
    accessTitle.className = "admin-access-title";
    accessTitle.textContent = "Qui peut voir ce morceau ?";

    const accessWrap = document.createElement("div");
    accessWrap.className = "admin-track-access";
    accessWrap.appendChild(segmentAccess);
    accessWrap.appendChild(statusAccess);

    const save = document.createElement("button");
    save.type = "button";
    save.className = "ghost";
    save.textContent = "Enregistrer";

    status.value = track.decision_status || "testing";
    visibility.value = track.status || "active";
    intent.value = track.intent_note || "";
    question.value = track.feedback_question || "";
    announcementText.value = track.announcement_text || "";
    save.addEventListener("click", async () => {
      await updateTrackCockpit(track.id, {
        title: titleField.input.value,
        season_slug: seasonField.select.value,
        storage_path: pathField.input.value,
        sort_order: orderField.input.value,
        status: visibility.value,
        decision_status: status.value,
        intent_note: intent.value,
        feedback_question: question.value,
        announcement_enabled: announcementCheckbox.checked,
        announcement_text: announcementText.value,
        allowed_audience_segments: segmentAccess.getSelectedValues(),
        allowed_member_statuses: statusAccess.getSelectedValues(),
      });
    });
    const settings = document.createElement("details");
    settings.className = "admin-track-settings";
    const settingsSummary = document.createElement("summary");
    settingsSummary.textContent = "Réglages";
    settings.appendChild(settingsSummary);
    settings.appendChild(fields);
    settings.appendChild(pathActions);
    settings.appendChild(visibilityLabel);
    settings.appendChild(visibility);
    settings.appendChild(statusLabel);
    settings.appendChild(status);
    settings.appendChild(accessTitle);
    settings.appendChild(accessWrap);
    settings.appendChild(accessHint);
    settings.appendChild(intentLabel);
    settings.appendChild(intent);
    settings.appendChild(questionLabel);
    settings.appendChild(question);
    settings.appendChild(announcementToggle);
    settings.appendChild(announcementLabel);
    settings.appendChild(announcementText);
    settings.appendChild(save);
    card.appendChild(head);
    card.appendChild(checklist);
    card.appendChild(settings);
    adminTrackCockpit.appendChild(card);
  });
}

async function loadAdminTrackCockpit() {
  if (!canManageMembers() || !session?.access_token || !adminTrackCockpit || !adminUnlocked) {
    return;
  }
  adminTrackCockpit.innerHTML = "<p class=\"muted\">Chargement du cockpit...</p>";
  try {
    const res = await fetch("/.netlify/functions/admin-track-cockpit", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      adminTrackCockpit.innerHTML = `<p class="muted">Impossible de charger (${data.error || res.status}).</p>`;
      return;
    }
    adminAudioFilesCache = Array.isArray(data.audioFiles) ? data.audioFiles : [];
    renderAdminTrackCockpit(
      Array.isArray(data.tracks) ? data.tracks : [],
      Array.isArray(data.seasons) ? data.seasons : []
    );
  } catch (_) {
    adminTrackCockpit.innerHTML = "<p class=\"muted\">Erreur réseau.</p>";
  }
}

async function updateTrackCockpit(trackId, payload) {
  if (!canManageMembers() || !session?.access_token || !trackId) {
    return;
  }
  try {
    const res = await fetch("/.netlify/functions/admin-track-cockpit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ trackId, ...payload }),
    });
    if (!res.ok) {
      if (adminTrackCreateStatus) adminTrackCreateStatus.textContent = "Mise à jour impossible.";
      return;
    }
    if (adminTrackCreateStatus) adminTrackCreateStatus.textContent = "Morceau mis à jour.";
    await loadAdminTrackCockpit();
    await loadTracks({ preserveTrackView: true });
    await loadAdminAuditLog();
  } catch (_) {
    if (adminTrackCreateStatus) adminTrackCreateStatus.textContent = "Erreur réseau.";
  }
}

async function createAdminTrack() {
  if (!canManageMembers() || !session?.access_token) {
    return;
  }
  const title = adminTrackTitleInput?.value.trim() || "";
  const storagePath = adminTrackPathInput?.value.trim() || "";
  const seasonSlug = adminTrackSeasonSelect?.value || "";
  if (!title || !storagePath || !seasonSlug) {
    if (adminTrackCreateStatus) adminTrackCreateStatus.textContent = "Titre, acte et chemin audio sont requis.";
    return;
  }
  if (adminTrackCreateStatus) adminTrackCreateStatus.textContent = "Ajout du morceau...";
  try {
    const res = await fetch("/.netlify/functions/admin-track-cockpit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: "create",
        title,
        storage_path: storagePath,
        season_slug: seasonSlug,
        sort_order: adminTrackOrderInput?.value || 0,
        status: "draft",
        decision_status: "testing",
        announcement_enabled: true,
        announcement_text: "",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (adminTrackCreateStatus) adminTrackCreateStatus.textContent = `Ajout impossible (${data.error || res.status}).`;
      return;
    }
    if (adminTrackCreateStatus) adminTrackCreateStatus.textContent = "Morceau préparé, encore caché.";
    if (adminTrackTitleInput) adminTrackTitleInput.value = "";
    if (adminTrackPathInput) adminTrackPathInput.value = "";
    if (adminTrackOrderInput) adminTrackOrderInput.value = "";
    await loadAdminTrackCockpit();
    await loadTracks({ preserveTrackView: true });
    await loadAdminAuditLog();
  } catch (_) {
    if (adminTrackCreateStatus) adminTrackCreateStatus.textContent = "Erreur réseau.";
  }
}

function renderMemberReplies(replies = []) {
  if (!memberReplies) {
    return;
  }
  if (!replies.length) {
    memberReplies.innerHTML = "";
    hide(memberReplies);
    return;
  }
  memberReplies.innerHTML = "<p class=\"member-replies-title\">Morjane a laissé un mot</p>";
  replies.forEach((reply) => {
    const item = document.createElement("p");
    item.className = "member-reply-item";
    item.textContent = reply.admin_reply || "";
    memberReplies.appendChild(item);
  });
  show(memberReplies);
}

async function loadMemberReplies() {
  if (!selectedTrack?.id || !session?.access_token || !memberReplies) {
    return;
  }
  try {
    const res = await fetch("/.netlify/functions/member-message-replies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ trackId: selectedTrack.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      renderMemberReplies([]);
      return;
    }
    renderMemberReplies(Array.isArray(data.replies) ? data.replies : []);
  } catch (_) {
    renderMemberReplies([]);
  }
}

function renderAdminStatus(data) {
  if (!adminStatusPanel) {
    return;
  }
  const uptime = data?.uptime || {};
  const magic = data?.magicLinks || {};
  const pending = Number(data?.pendingMessages || 0);
  const today = data?.today || {};
  const health = data?.health || {};
  const functions = Array.isArray(data?.functions) ? data.functions.slice(0, 6) : [];
  adminTodayState.pendingMessages = pending;
  adminTodayState.playsToday = Number(today.playsToday || 0);
  adminTodayState.activeMembers7d = Number(today.activeMembers7d || 0);
  adminTodayState.liveNow = Number(today.liveNow || adminTodayState.liveNow || 0);
  adminTodayState.pendingMembers = Number(health.pendingMembers || 0);
  adminTodayState.brokenAudioCount = Number(health.brokenAudioCount || 0);
  renderAdminTodayCards();

  adminStatusPanel.innerHTML = "";
  const top = document.createElement("article");
  top.className = "admin-status-item";
  [
    ["admin-status-title", "Synthese"],
    ["admin-status-meta", `Echecs fonctions 24h : ${uptime.errors24h || 0}/${uptime.total24h || 0} (${Math.round((uptime.failureRate24h || 0) * 100)}%)`],
    ["admin-status-meta", `Liens magiques (7 jours) : ${magic.sent || 0} envoyés, ${magic.error || 0} en erreur`],
    ["admin-status-meta", `Messages non traités : ${pending}`],
    ["admin-status-meta", `Demandes en attente : ${health.pendingMembers || 0}`],
    ["admin-status-meta", `Audios actifs à corriger : ${health.brokenAudioCount || 0}/${health.tracksChecked || 0}`],
  ].forEach(([className, text]) => {
    const line = document.createElement("p");
    line.className = className;
    line.textContent = text;
    top.appendChild(line);
  });
  adminStatusPanel.appendChild(top);

  (health.brokenAudio || []).forEach((track) => {
    const card = document.createElement("article");
    card.className = "admin-status-item";
    const title = document.createElement("p");
    title.className = "admin-status-title";
    title.textContent = `Audio à corriger : ${formatTrackTitle(track.title)}`;
    const meta = document.createElement("p");
    meta.className = "admin-status-meta";
    meta.textContent = track.storage_path || "chemin absent";
    card.appendChild(title);
    card.appendChild(meta);
    adminStatusPanel.appendChild(card);
  });

  functions.forEach((fn) => {
    const card = document.createElement("article");
    card.className = "admin-status-item";
    const title = document.createElement("p");
    title.className = "admin-status-title";
    title.textContent = fn.function_name || "Function";
    const meta = document.createElement("p");
    meta.className = "admin-status-meta";
    meta.textContent = `OK: ${fn.ok} | Erreurs: ${fn.error} | Taux echec: ${Math.round((fn.error_rate || 0) * 100)}%`;
    card.appendChild(title);
    card.appendChild(meta);
    adminStatusPanel.appendChild(card);
  });
}

async function loadAdminStatus() {
  if (!canManageMembers() || !session?.access_token || !adminStatusPanel || !adminUnlocked) {
    return;
  }
  adminStatusPanel.innerHTML = "<p class=\"muted\">Chargement du statut...</p>";
  try {
    const res = await fetch("/.netlify/functions/admin-status", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      adminStatusPanel.innerHTML = `<p class="muted">Impossible de charger (${data.error || res.status}).</p>`;
      return;
    }
    renderAdminStatus(data);
  } catch (_) {
    adminStatusPanel.innerHTML = "<p class=\"muted\">Erreur réseau.</p>";
  }
}

function renderAdminLiveListeners(listeners = []) {
  if (!adminLiveListeners) {
    return;
  }
  if (!listeners.length) {
    adminTodayState.liveNow = 0;
    renderAdminTodayCards();
    adminLiveListeners.innerHTML = "<p class=\"muted\">Personne n'écoute en ce moment.</p>";
    return;
  }

  adminTodayState.liveNow = listeners.length;
  renderAdminTodayCards();
  adminLiveListeners.innerHTML = "";
  listeners.forEach((row) => {
    const email = row.email || "Email inconnu";
    const initial = email.slice(0, 1).toUpperCase();
    const secondsAgo = Math.max(
      0,
      Math.floor((Date.now() - new Date(row.last_seen_at || Date.now()).getTime()) / 1000)
    );
    const statusLabel = secondsAgo <= 20 ? "En lecture" : `Inactif ${secondsAgo}s`;
    const statusClass = secondsAgo <= 20 ? "is-live" : "is-idle";
    const card = document.createElement("article");
    card.className = "admin-live-item";
    const seen = row.last_seen_at ? formatInboxDate(row.last_seen_at) : "-";
    const avatar = document.createElement("div");
    avatar.className = "admin-live-avatar";
    avatar.textContent = initial;
    const content = document.createElement("div");
    content.className = "admin-live-content";
    const title = document.createElement("p");
    title.className = "admin-status-title";
    title.textContent = email;
    const track = document.createElement("p");
    track.className = "admin-status-meta";
    track.textContent = formatTrackTitle(row.track_title || "Maquette");
    const activity = document.createElement("p");
    activity.className = "admin-status-meta";
    activity.textContent = `Derniere activite : ${seen}`;
    const pill = document.createElement("span");
    pill.className = `admin-live-pill ${statusClass}`;
    pill.textContent = statusLabel;
    content.appendChild(title);
    content.appendChild(track);
    content.appendChild(activity);
    card.appendChild(avatar);
    card.appendChild(content);
    card.appendChild(pill);
    adminLiveListeners.appendChild(card);
  });
}

async function loadAdminLiveListeners() {
  if (!canManageMembers() || !session?.access_token || !adminLiveListeners || !adminUnlocked) {
    return;
  }
  try {
    const res = await fetch("/.netlify/functions/admin-live-listeners", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data.detail ? ` - ${data.detail}` : "";
      adminLiveListeners.innerHTML = `<p class="muted">Impossible de charger le live (${data.error || res.status})${detail}.</p>`;
      return;
    }
    if (data.setup_required) {
      adminTodayState.liveNow = 0;
      renderAdminTodayCards();
      adminLiveListeners.innerHTML = "<p class=\"muted\">Live en écoute non configuré sur cette base (table atelier_presence manquante).</p>";
      return;
    }
    renderAdminLiveListeners(Array.isArray(data.listeners) ? data.listeners : []);
  } catch (_) {
    adminTodayState.liveNow = 0;
    renderAdminTodayCards();
    adminLiveListeners.innerHTML = "<p class=\"muted\">Erreur réseau.</p>";
  }
}

function stopAdminLiveRefresh() {
  if (adminLiveRefreshTimer) {
    clearInterval(adminLiveRefreshTimer);
    adminLiveRefreshTimer = null;
  }
}

function startAdminLiveRefresh() {
  if (!canManageMembers() || !adminUnlocked) {
    stopAdminLiveRefresh();
    return;
  }
  stopAdminLiveRefresh();
  loadAdminLiveListeners();
  adminLiveRefreshTimer = setInterval(() => {
    loadAdminLiveListeners();
  }, 5000);
}

function renderAdminAuditLog(logs = []) {
  if (!adminAuditLog) {
    return;
  }
  if (!logs.length) {
    adminAuditLog.innerHTML = "<p class=\"muted\">Aucune action récente.</p>";
    return;
  }

  adminAuditLog.innerHTML = "";
  const actionLabel = (action) => ({
    member_approved: "Membre validé",
    member_revoked: "Accès retiré",
    message_processed: "Message marqué traité",
    message_reopened: "Message rouvert",
    message_replied: "Réponse message",
    track_cockpit_updated: "Morceau mis à jour",
    member_invited: "Invitation envoyée",
    member_invite_link_created: "Lien d'invitation créé",
    member_approve: "Membre validé",
    member_revoke: "Accès retiré",
    member_vip: "Prioritaire",
    member_refuse: "Demande refusée",
    member_archive: "Profil archivé",
    member_set_meta: "Fiche membre mise à jour",
    member_access_email_sent: "Email d'accès envoyé",
  }[action] || action);

  logs.slice(0, 25).forEach((row) => {
    const card = document.createElement("article");
    card.className = "admin-audit-item";
    const title = document.createElement("p");
    title.className = "admin-audit-title";
    title.textContent = actionLabel(row.action);
    const meta = document.createElement("p");
    meta.className = "admin-audit-meta";
    meta.textContent = `${formatInboxDate(row.created_at)} - ${row.admin_email}`;
    const target = document.createElement("p");
    target.className = "admin-audit-meta";
    target.textContent = `Cible: ${row.target_type}${row.target_id ? ` (${row.target_id})` : ""}`;
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(target);
    if (row.details?.target_email) {
      const profile = document.createElement("p");
      profile.className = "admin-audit-meta";
      profile.textContent = `Profil: ${row.details.target_email}`;
      card.appendChild(profile);
    }
    if (row.details?.before || row.details?.after) {
      const before = row.details.before || {};
      const after = row.details.after || {};
      const beforeText = [before.member_status, before.audience_status].filter(Boolean).join(" / ") || "-";
      const afterText = [after.member_status, after.audience_status].filter(Boolean).join(" / ") || "-";
      const change = document.createElement("p");
      change.className = "admin-audit-meta";
      change.textContent = `Etat: ${beforeText} -> ${afterText}`;
      card.appendChild(change);
    }
    adminAuditLog.appendChild(card);
  });
}

async function loadAdminAuditLog() {
  if (!canManageMembers() || !session?.access_token || !adminAuditLog || !adminUnlocked) {
    return;
  }
  adminAuditLog.innerHTML = "<p class=\"muted\">Chargement du journal...</p>";
  try {
    const res = await fetch("/.netlify/functions/admin-audit-log", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      adminAuditLog.innerHTML = `<p class="muted">Impossible de charger (${data.error || res.status}).</p>`;
      return;
    }
    renderAdminAuditLog(Array.isArray(data.logs) ? data.logs : []);
  } catch (_) {
    adminAuditLog.innerHTML = "<p class=\"muted\">Erreur réseau.</p>";
  }
}

function markInboxAsRead() {
  const latestIso = adminInboxCache.length > 0
    ? adminInboxCache[0].created_at
    : new Date().toISOString();
  saveInboxLastSeen(latestIso);
  renderAdminInbox();
}

async function sendPresenceHeartbeat(isListening) {
  if (!session?.access_token || !profile?.id) {
    return;
  }
  try {
    await fetch("/.netlify/functions/presence-heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        isListening: Boolean(isListening && selectedTrack?.id),
        trackId: selectedTrack?.id || null,
      }),
    });
  } catch (_) {
    // no-op
  }
}

function stopPresenceHeartbeat() {
  if (presenceHeartbeatTimer) {
    clearInterval(presenceHeartbeatTimer);
    presenceHeartbeatTimer = null;
  }
}

function startPresenceHeartbeat() {
  if (!selectedTrack?.id || !session?.access_token) {
    return;
  }
  stopPresenceHeartbeat();
  sendPresenceHeartbeat(true);
  presenceHeartbeatTimer = setInterval(() => {
    sendPresenceHeartbeat(true);
  }, 15000);
}

async function updateMemberStatus(userId, action) {
  if (!canManageMembers() || !session?.access_token) {
    return;
  }
  try {
    const res = await fetch("/.netlify/functions/admin-members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (adminInviteStatusText) {
        adminInviteStatusText.textContent = `Action impossible (${data.error || res.status}).`;
      }
      return;
    }
    if (adminInviteStatusText && action === "approve_and_send_access_email") {
      adminInviteStatusText.textContent = data.email_error
        ? "Accès validé, mais email non envoyé."
        : "Accès validé et email envoyé.";
    }
    await loadAdminMembers();
    await loadCircleCount();
    await loadAdminAuditLog();
    await loadAdminStatus();
  } catch (_) {
    // no-op
  }
}

async function updateMemberMeta(userId, fields) {
  if (!canManageMembers() || !session?.access_token) {
    return;
  }
  try {
    const res = await fetch("/.netlify/functions/admin-members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, action: "set_meta", fields }),
    });
    if (!res.ok) {
      return;
    }
    await loadAdminMembers();
    await loadAdminAuditLog();
  } catch (_) {
    // no-op
  }
}

async function sendAdminInvite(delivery = "email") {
  if (!canManageMembers() || !session?.access_token || !adminInviteEmail) {
    return;
  }

  const email = adminInviteEmail.value.trim().toLowerCase();
  if (!email) {
    if (adminInviteStatusText) adminInviteStatusText.textContent = "Email requis.";
    return;
  }

  if (adminInviteStatusText) {
    adminInviteStatusText.textContent = delivery === "link" ? "Création du lien..." : "Invitation en cours...";
  }
  try {
    const res = await fetch("/.netlify/functions/admin-invite-member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email,
        audience_segment: adminInviteSegment?.value || "public",
        member_status: adminInviteStatus?.value || "member",
        admin_note: adminInviteNote?.value || "",
        delivery,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const labels = {
        invalid_email: "Email invalide.",
        missing_resend_key: "Clé Resend manquante côté Netlify.",
        link_failed: "Lien d'invitation impossible à générer.",
        missing_link: "Lien d'invitation impossible à générer.",
        profile_upsert_failed: "Profil impossible à préparer.",
        admin_gate_required: "Déverrouille d'abord l'admin.",
        resend_forbidden_sender: "Resend refuse l'expéditeur. Vérifie ATELIER_FROM_EMAIL dans Netlify.",
        resend_sender_not_verified: "L'expéditeur Resend n'est pas vérifié.",
      };
      if (adminInviteStatusText) {
        adminInviteStatusText.textContent = labels[data.error] || `Invitation impossible (${data.error || res.status}).`;
      }
      return;
    }

    if (delivery === "link" && data.actionLink) {
      try {
        await navigator.clipboard.writeText(data.actionLink);
        if (adminInviteStatusText) adminInviteStatusText.textContent = `Lien personnel copié pour ${data.email || email}.`;
      } catch (_) {
        if (adminInviteStatusText) adminInviteStatusText.textContent = `Lien créé pour ${data.email || email}, mais copie impossible.`;
      }
    } else if (adminInviteStatusText) {
      adminInviteStatusText.textContent = `Invitation envoyée à ${data.email || email}.`;
    }
    adminInviteEmail.value = "";
    if (adminInviteNote) adminInviteNote.value = "";
    await loadAdminMembers();
    await loadCircleCount();
    await loadAdminAuditLog();
    await loadAdminStatus();
  } catch (_) {
    if (adminInviteStatusText) adminInviteStatusText.textContent = "Erreur réseau.";
  }
}

if (player) {
  player.controlsList = "nodownload noplaybackrate";
  player.disablePictureInPicture = true;
  player.addEventListener("contextmenu", (event) => event.preventDefault());
}

function resetListeningChamber() {
  listeningQuestionShown = false;
  document.body.classList.remove("is-question-ready");
  if (listeningChamber) {
    listeningChamber.dataset.state = "listening";
  }
  if (listeningChamberText) {
    listeningChamberText.textContent = "Écoute.";
  }
  if (traceRevealBtn) {
    hide(traceRevealBtn);
  }
}

function updateListeningChamber() {
  if (!player || !listeningChamberText || listeningQuestionShown || player.currentTime < 45) {
    return;
  }

  listeningQuestionShown = true;
  listeningChamberText.textContent = "Qu'est-ce qui reste ?";
  document.body.classList.add("is-question-ready");
  if (listeningChamber) {
    listeningChamber.dataset.state = "question";
  }
  if (traceRevealBtn) {
    show(traceRevealBtn);
  }
}

function leaveListeningChamber() {
  document.body.classList.remove("is-listening");
  document.body.classList.remove("atelier-listening");
  resetListeningChamber();
}

function formatWatermarkDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function moveWatermark() {
  if (!trackWatermark) {
    return;
  }
  const trackPanel = document.getElementById("trackView");
  if (!trackPanel) {
    return;
  }

  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const horizontalPadding = 14;
  const minTop = isMobile ? 220 : 150;
  const maxTop = Math.max(minTop, trackPanel.clientHeight - 70);
  const maxLeft = Math.max(horizontalPadding, trackPanel.clientWidth - trackWatermark.offsetWidth - horizontalPadding);

  const randomBetween = (min, max) => Math.round(min + Math.random() * Math.max(0, max - min));
  const left = randomBetween(horizontalPadding, maxLeft);
  const top = randomBetween(minTop, maxTop);

  trackWatermark.style.left = `${left}px`;
  trackWatermark.style.top = `${top}px`;
  trackWatermark.style.transform = "none";
}

function refreshWatermarkText() {
  if (!trackWatermark || !profile?.email) {
    return;
  }
  trackWatermark.textContent = `${profile.email}  •  ${formatWatermarkDate(new Date())}`;
}

function stopWatermark() {
  if (watermarkTimer) {
    clearInterval(watermarkTimer);
    watermarkTimer = null;
  }
  if (trackWatermark) {
    trackWatermark.classList.remove("is-active");
    hide(trackWatermark);
  }
  leaveListeningChamber();
}

function startWatermark() {
  if (!trackWatermark || !profile?.email) {
    return;
  }
  show(trackWatermark);
  trackWatermark.classList.add("is-active");
  refreshWatermarkText();
  moveWatermark();
  if (watermarkTimer) {
    clearInterval(watermarkTimer);
  }
  document.body.classList.add("is-listening");
  document.body.classList.add("atelier-listening");
  watermarkTimer = setInterval(() => {
    refreshWatermarkText();
    moveWatermark();
  }, 5000);
}

async function ensureAtelierProfile() {
  if (!session?.user) {
    return null;
  }

  await supabase.from("atelier_profiles").upsert(
    {
      id: session.user.id,
      email: session.user.email || null,
    },
    { onConflict: "id" }
  );

  await recordEntryContext();

  let { data, error } = await supabase
    .from("atelier_profiles")
    .select("id, email, role, member_status, audience_segment, source, access_source, access_wave")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error && /(audience_segment|source|access_source|access_wave)/i.test(String(error.message || ""))) {
    const fallback = await supabase
      .from("atelier_profiles")
      .select("id, email, role, member_status")
      .eq("id", session.user.id)
      .maybeSingle();
    data = fallback.data;
  }

  return data || null;
}

async function recordEntryContext() {
  const context = getCurrentEntryContext();
  if (!context || !session?.access_token) {
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/record-atelier-entry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        source: getSupabaseSourceForEntry(context),
        access_source: normalizeEntrySource(context.source) || "direct",
        access_wave: normalizeEntryDoor(context.door) || "direct",
        audience_segment: normalizeEntrySegment(context.segment),
      }),
    });
    if (res.ok) {
      localStorage.removeItem(ATELIER_ENTRY_CONTEXT_STORAGE_KEY);
    }
  } catch (_) {
    // Keep the context in localStorage; it can be recorded after the next login.
  }
}

async function fetchPublicConfig() {
  const res = await fetch("/.netlify/functions/get-public-config");
  if (!res.ok) {
    throw new Error("public_config_failed");
  }
  const data = await res.json();
  if (!data.supabaseUrl || !data.supabaseAnonKey) {
    throw new Error("missing_supabase_public_keys");
  }
  return data;
}

async function hydrateSessionFromUrl() {
  const currentUrl = new URL(window.location.href);
  const hasCode = currentUrl.searchParams.get("code");

  if (hasCode) {
    await supabase.auth.exchangeCodeForSession(hasCode);
    currentUrl.searchParams.delete("code");
    currentUrl.searchParams.delete("type");
    currentUrl.searchParams.delete("error");
    currentUrl.searchParams.delete("error_code");
    currentUrl.searchParams.delete("error_description");
    const next = `${currentUrl.pathname}${currentUrl.search ? `?${currentUrl.searchParams.toString()}` : ""}`;
    window.history.replaceState({}, "", next);
    return;
  }

  if (window.location.hash.includes("access_token=")) {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}`);
    }
  }
}

async function ensureAtelierAccess() {
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.data.session) {
    setGateStatus("Tu fais partie du cercle.");
    return true;
  }

  setGateStatus("Atelier privé.");
  return true;
}

async function loadSessionAndProfile() {
  const sessionResult = await supabase.auth.getSession();
  session = sessionResult.data.session || null;

  if (!session) {
    document.body.classList.remove("atelier-member-ready");
    stopPresenceHeartbeat();
    stopAdminLiveRefresh();
    applyEntryContextToAuthView();
    show(authView);
    hide(memberView);
    hide(trackView);
    if (memberPendingHelp) {
      hide(memberPendingHelp);
    }
    if (adminPanel) {
      hide(adminPanel);
    }
    authStatus.textContent = "Connectez-vous pour entrer dans l'acte ouvert.";
    return;
  }

  profile = await ensureAtelierProfile();

  if (!profile || !isMember(profile.member_status)) {
    document.body.classList.remove("atelier-member-ready");
    hide(authView);
    show(memberView);
    hide(trackView);
    if (memberPendingHelp) {
      show(memberPendingHelp);
    }
    if (memberPersonalStats) {
      hide(memberPersonalStats);
    }
    if (adminPanel) {
      hide(adminPanel);
    }
    memberMeta.textContent = "Sur le seuil de l'Atelier.";
    trackList.innerHTML = "";
    if (acteChooser) {
      acteChooser.innerHTML = "";
    }
    emptyTracks.classList.add("hidden");
    return;
  }

  document.body.classList.add("atelier-member-ready");
  await loadTracks({ preserveTrackView: true });
}

async function loadTracks(options = {}) {
  const shouldPreserveTrackView = Boolean(
    options.preserveTrackView &&
    selectedTrack &&
    trackView &&
    !trackView.classList.contains("hidden")
  );
  const selectedTrackId = selectedTrack?.id || null;

  let data = [];
  try {
    const res = await fetch("/.netlify/functions/get-member-tracks", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.error || "tracks_failed");
    }
    data = payload.tracks || [];
  } catch (_) {
    memberMeta.textContent = "Impossible de charger les titres.";
    return;
  }

  tracks = data || [];
  if (selectedTrackId) {
    selectedTrack = tracks.find((track) => track.id === selectedTrackId) || selectedTrack;
  }
  await loadTrackCounts(tracks.map((track) => track.id));
  userLikedTrackIds = await loadUserLikes(tracks.map((track) => track.id));
  hide(authView);
  if (shouldPreserveTrackView && tracks.some((track) => track.id === selectedTrackId)) {
    hide(memberView);
    show(trackView);
  } else {
    show(memberView);
    hide(trackView);
  }
  if (memberPendingHelp) {
    hide(memberPendingHelp);
  }
  renderTrackList();

  memberMeta.textContent = `Bienvenue, ${getMemberDisplayName()} - ${getAudienceStatusLabel(profile.member_status)}`;
  renderWaveNote();
  rememberAtelierVisit();
  await loadMemberPersonalStats();

  if (tracks.length === 0) {
    emptyTracks.classList.remove("hidden");
  } else {
    emptyTracks.classList.add("hidden");
  }

  if (canManageMembers()) {
    if (adminPanel && !shouldPreserveTrackView) {
      setAdminPanelCollapsed(true);
      show(adminPanel);
    }
    renderAdminTodayCards();
    loadInboxLastSeen();
    adminUnlocked = await checkAdminGate();
    renderAdminLockState();
    if (adminUnlocked) {
      await loadAdminMembers();
      await loadAdminWeeklyStats();
      await loadAdminInbox();
      await loadAdminVotesSummary();
      await loadAdminTrackCockpit();
      await loadAdminStatus();
      await loadAdminAuditLog();
      await loadAdminLiveListeners();
      startAdminLiveRefresh();
    } else {
      stopAdminLiveRefresh();
    }
  } else if (adminPanel) {
    stopAdminLiveRefresh();
    hide(adminPanel);
  }
}

async function loadTrackCounts(trackIds) {
  trackPlayCounts = new Map();
  trackLikeCounts = new Map();
  if (!session?.access_token || !trackIds || trackIds.length === 0) {
    return;
  }

  let res = null;
  let payload = {};
  try {
    res = await fetch("/.netlify/functions/get-track-counts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ trackIds }),
    });
    payload = await res.json().catch(() => ({}));
  } catch (_) {
    return;
  }

  if (!res.ok || !payload.ok || !payload.counts) {
    return;
  }

  Object.entries(payload.counts).forEach(([trackId, counts]) => {
    trackPlayCounts.set(trackId, Number(counts.play_count || 0));
    trackLikeCounts.set(trackId, Number(counts.like_count || 0));
  });
}
async function loadUserLikes(trackIds) {
  const likes = new Set();
  if (!profile?.id || !trackIds || trackIds.length === 0) {
    return likes;
  }

  const { data, error } = await supabase
    .from("atelier_track_likes")
    .select("track_id")
    .eq("user_id", profile.id)
    .in("track_id", trackIds);

  if (error || !data) {
    return likes;
  }

  data.forEach((row) => {
    if (row.track_id) {
      likes.add(row.track_id);
    }
  });

  return likes;
}

function getTrackPlayCount(trackId) {
  return Number(trackPlayCounts.get(trackId) || 0);
}

function getTrackLikeCount(trackId) {
  return Number(trackLikeCounts.get(trackId) || 0);
}

function renderTrackLikeState() {
  if (!selectedTrack || !trackLikeBtn) {
    return;
  }
  const isLiked = userLikedTrackIds.has(selectedTrack.id);
  trackLikeBtn.classList.toggle("is-active", isLiked);
  trackLikeBtn.textContent = isLiked ? "♥ Marque laissée" : "♡ Marquer ce morceau";
  if (trackLikeCount) {
    trackLikeCount.textContent = `Marques du cercle : ${getTrackLikeCount(selectedTrack.id)}`;
  }
}

function pulseLikeButton() {
  if (!trackLikeBtn) {
    return;
  }
  trackLikeBtn.classList.remove("is-pulsing");
  // Force reflow so animation can restart reliably.
  void trackLikeBtn.offsetWidth;
  trackLikeBtn.classList.add("is-pulsing");
  setTimeout(() => {
    trackLikeBtn.classList.remove("is-pulsing");
  }, 700);
}

function createTrackCard(track) {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "track-card atelier-card atelier-track-card";
  btn.addEventListener("click", () => selectTrack(track.id));

  const fragmentLabel = document.createElement("span");
  fragmentLabel.className = "track-card__fragment-label";
  fragmentLabel.textContent = isTrackNewSinceLastVisit(track) ? "Nouveau mouvement" : "Version ouverte";

  const top = document.createElement("span");
  top.className = "track-card__top";

  const title = document.createElement("span");
  title.className = "track-list__title";
  title.textContent = formatTrackTitle(track.title);

  const status = document.createElement("span");
  status.className = "track-card__status";
  status.textContent = getDecisionStatusLabel(track.decision_status);

  const meta = document.createElement("span");
  meta.className = "track-list__meta";
  meta.textContent = `Écoutes du cercle : ${getTrackPlayCount(track.id)} · Marques : ${getTrackLikeCount(track.id)}`;

  const cta = document.createElement("span");
  cta.className = "track-card__cta";
  cta.textContent = "Écouter la version";

  btn.appendChild(fragmentLabel);
  top.appendChild(title);
  top.appendChild(status);
  btn.appendChild(top);
  btn.appendChild(meta);
  btn.appendChild(cta);
  li.appendChild(btn);
  return li;
}

function renderAtelierMovements(groups) {
  if (!atelierMovements) {
    return;
  }
  const newTracks = (groups || []).flatMap((group) => getNewTracksForGroup(group)
    .map((track) => ({ track, season: group.season })));
  atelierMovements.innerHTML = "";

  if (!newTracks.length) {
    hide(atelierMovements);
    return;
  }

  const title = document.createElement("p");
  title.className = "atelier-movements__title";
  title.textContent = newTracks.length === 1
    ? "Depuis ton dernier passage, une version a bougé."
    : `Depuis ton dernier passage, ${newTracks.length} versions ont bougé.`;

  const list = document.createElement("ul");
  newTracks.slice(0, 4).forEach(({ track, season }) => {
    const item = document.createElement("li");
    item.textContent = getTrackAnnouncementLine(track, season);
    list.appendChild(item);
  });

  const seenButton = document.createElement("button");
  seenButton.type = "button";
  seenButton.className = "atelier-movements__seen";
  seenButton.textContent = "Marquer comme vu";
  seenButton.addEventListener("click", () => {
    rememberSeenMovementIds(newTracks.map(({ track }) => track.id));
    hide(atelierMovements);
    renderTrackList();
  });

  atelierMovements.appendChild(title);
  atelierMovements.appendChild(list);
  atelierMovements.appendChild(seenButton);
  show(atelierMovements);
}
function renderActeChooser(groups) {
  if (!acteChooser) {
    return;
  }
  acteChooser.innerHTML = "";
  groups.forEach((group) => {
    const slug = normalizeActeSlug(group.season);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "acte-chooser__button";
    button.classList.toggle("is-active", slug === selectedActeSlug);
    button.setAttribute("aria-pressed", slug === selectedActeSlug ? "true" : "false");

    const label = document.createElement("span");
    label.textContent = formatSeasonTitle(group.season);

    const count = document.createElement("small");
    const newCount = getNewTracksForGroup(group).length;
    const isClosedPresence = slug === "hors-acte" && group.tracks.length === 0 && newCount === 0;
    button.classList.toggle("is-closed-presence", isClosedPresence);
    count.textContent = isClosedPresence
      ? "présence fermée"
      : newCount
        ? `${newCount} nouveau${newCount > 1 ? "x" : ""}`
        : `${group.tracks.length} version${group.tracks.length > 1 ? "s" : ""}`;
    count.classList.toggle("has-news", newCount > 0);
    button.appendChild(label);
    button.appendChild(count);
    button.addEventListener("click", () => {
      selectedActeSlug = slug;
      renderTrackList();
    });
    acteChooser.appendChild(button);
  });
}

function renderTrackList() {
  trackList.innerHTML = "";
  const groups = getVisibleActeGroups();
  if (!groups.some((group) => normalizeActeSlug(group.season) === selectedActeSlug)) {
    selectedActeSlug = "acte-i";
  }
  renderActeChooser(groups);
  renderAtelierMovements(groups);

  const group = groups.find((item) => normalizeActeSlug(item.season) === selectedActeSlug) || groups[0];
  if (!group) {
    return;
  }

  const seasonItem = document.createElement("li");
  seasonItem.className = "track-season";

  const heading = document.createElement("div");
  heading.className = "track-season__head";

  const title = document.createElement("h3");
  title.textContent = formatSeasonTitle(group.season);
  heading.appendChild(title);

  if (group.season.description) {
    const description = document.createElement("p");
    description.textContent = group.season.description;
    heading.appendChild(description);
  }

  seasonItem.appendChild(heading);

  if (group.tracks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "track-season__empty";
    empty.textContent = normalizeActeSlug(group.season) === "hors-acte"
      ? "Présence fermée. Rien ne s'ouvre ici pour l'instant."
      : "Aucune version ouverte dans cet acte pour le moment.";
    seasonItem.appendChild(empty);
    trackList.appendChild(seasonItem);
    return;
  }

  const innerList = document.createElement("ul");
  innerList.className = "track-season__tracks";
  group.tracks.forEach((track) => {
    innerList.appendChild(createTrackCard(track));
  });

  seasonItem.appendChild(innerList);
  trackList.appendChild(seasonItem);
}

async function selectTrack(trackId) {
  selectedTrack = tracks.find((track) => track.id === trackId) || null;
  if (!selectedTrack) {
    return;
  }

  trackTitle.textContent = formatTrackTitle(selectedTrack.title);
  if (trackDecisionStatus) {
    trackDecisionStatus.textContent = getDecisionStatusLabel(selectedTrack.decision_status);
  }
  renderTrackTimeline(selectedTrack.decision_status || "testing");
  if (trackIntentPanel && trackIntentNote && trackFeedbackQuestion) {
    const segment = getAudienceSegmentCopy(profile?.audience_segment);
    trackIntentNote.textContent = selectedTrack.intent_note || "Tu entends cette chanson dans son état actuel, avant sa forme définitive.";
    trackFeedbackQuestion.textContent = selectedTrack.feedback_question || segment.question;
    show(trackIntentPanel);
  }
  if (trackPlayCount) {
    trackPlayCount.textContent = `Écoutes du cercle : ${getTrackPlayCount(selectedTrack.id)}`;
  }
  renderTrackLikeState();
  voteStatus.textContent = "Chargement de l'audio...";
  messageStatus.textContent = "";
  renderMemberReplies([]);
  privateMessage.value = "";
  resetListeningChamber();
  playLoggedForCurrentTrack = false;
  player.pause();
  player.removeAttribute("src");
  player.load();
  show(trackView);
  hide(memberView);
  if (adminPanel) {
    hide(adminPanel);
  }
  stopWatermark();

  try {
    const res = await fetch("/.netlify/functions/get-audio-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ trackId: selectedTrack.id }),
    });
    const data = await res.json();

    if (!res.ok || !data.url) {
      voteStatus.textContent = "Cette version n'est pas disponible pour le moment.";
      return;
    }

    player.src = data.url;
    player.preload = "auto";
    updateMediaSession(selectedTrack);
    voteStatus.textContent = "";
    await loadMemberReplies();
  } catch (_) {
    voteStatus.textContent = "Erreur réseau.";
  }
}

async function logQualifiedPlay() {
  if (!selectedTrack || !profile || playLoggedForCurrentTrack || !player || player.currentTime < 30) {
    return;
  }

  playLoggedForCurrentTrack = true;

  let res = null;
  let data = null;
  try {
    res = await fetch("/.netlify/functions/log-track-play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ trackId: selectedTrack.id }),
    });
    data = await res.json().catch(() => ({}));
  } catch (_) {
    playLoggedForCurrentTrack = false;
    return;
  }

  if (!res?.ok) {
    playLoggedForCurrentTrack = false;
    return;
  }

  if (!data?.counted) {
    return;
  }

  const next = getTrackPlayCount(selectedTrack.id) + 1;
  trackPlayCounts.set(selectedTrack.id, next);
  if (trackPlayCount) {
    trackPlayCount.textContent = `Écoutes du cercle : ${next}`;
  }
  renderTrackList();
}

async function toggleTrackLike() {
  if (!selectedTrack || !profile) {
    return;
  }

  const isLiked = userLikedTrackIds.has(selectedTrack.id);
  if (isLiked) {
    const { error } = await supabase
      .from("atelier_track_likes")
      .delete()
      .eq("track_id", selectedTrack.id)
      .eq("user_id", profile.id);
    if (error) {
      return;
    }
    userLikedTrackIds.delete(selectedTrack.id);
    trackLikeCounts.set(selectedTrack.id, Math.max(0, getTrackLikeCount(selectedTrack.id) - 1));
  } else {
    const { error } = await supabase.from("atelier_track_likes").insert({
      track_id: selectedTrack.id,
      user_id: profile.id,
    });
    if (error) {
      return;
    }
    userLikedTrackIds.add(selectedTrack.id);
    trackLikeCounts.set(selectedTrack.id, getTrackLikeCount(selectedTrack.id) + 1);
    pulseLikeButton();
  }

  renderTrackLikeState();
  renderTrackList();
}

async function submitVote(choice) {
  if (!selectedTrack || !profile) {
    voteStatus.textContent = "Choisissez d'abord une chanson dans l'acte.";
    return;
  }

  const now = Date.now();
  if (now < voteCooldownUntil) {
    const remaining = Math.ceil((voteCooldownUntil - now) / 1000);
    voteStatus.textContent = `Patiente ${remaining}s avant de changer ce geste.`;
    return;
  }

  voteCooldownUntil = now + 2500;
  voteButtons.forEach((button) => {
    button.disabled = true;
  });
  setTimeout(() => {
    voteButtons.forEach((button) => {
      button.disabled = false;
    });
  }, 2500);

  const payload = {
    track_id: selectedTrack.id,
    user_id: profile.id,
    choice,
  };

  const { error } = await supabase.from("atelier_votes").upsert(payload, { onConflict: "track_id,user_id" });
  voteStatus.textContent = error ? `Geste refusé. ${error.message || ""}`.trim() : "Geste gardé. Merci d'avoir écouté jusqu'à l'endroit juste.";
}

function revealOtpCodeForm({ focus = true, showMobileHelp = false } = {}) {
  if (otpCodeForm) {
    show(otpCodeForm);
  }
  if (authMobileHelp) {
    if (showMobileHelp) {
      show(authMobileHelp);
    } else {
      hide(authMobileHelp);
    }
  }
  if (focus) {
    otpCodeInput?.focus();
  }
}
function normalizeOtpCode(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

async function verifyEmailCode() {
  const email = emailInput?.value.trim().toLowerCase() || "";
  const token = normalizeOtpCode(otpCodeInput?.value || "");

  if (!email) {
    authStatus.textContent = "Entre le même email que celui utilisé pour recevoir le code.";
    emailInput?.focus();
    return;
  }

  if (token.length < 6) {
    authStatus.textContent = "Code incomplet. Vérifie le mail reçu.";
    otpCodeInput?.focus();
    return;
  }

  authStatus.textContent = "Vérification du code...";
  let result = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (result.error) {
    result = await supabase.auth.verifyOtp({ email, token, type: "magiclink" });
  }
  if (result.error) {
    result = await supabase.auth.verifyOtp({ email, token, type: "invite" });
  }

  if (result.error) {
    const message = String(result.error.message || "").toLowerCase();
    authStatus.textContent = message.includes("expired") || message.includes("invalid")
      ? "Code expiré ou incorrect. Demande un nouveau mail si besoin."
      : "Code impossible à vérifier pour le moment.";
    return;
  }

  authStatus.textContent = "Connexion ouverte.";
  if (otpCodeInput) {
    otpCodeInput.value = "";
  }
  await loadSessionAndProfile();
}
async function submitMessage(content, tag = "emotion") {
  if (!selectedTrack || !profile) {
    messageStatus.textContent = "Choisissez d'abord une chanson avant de laisser une trace.";
    return;
  }

  if (!session?.access_token) {
    messageStatus.textContent = "Votre session a expiré. Reconnectez-vous pour laisser une trace.";
    return;
  }

  if (content.length < 2) {
    messageStatus.textContent = "Trace trop courte. Quelques mots suffisent.";
    return;
  }

  if (content.length > 1200) {
    messageStatus.textContent = "Trace trop longue. Garde-la sous 1200 caractères.";
    return;
  }

  let res = null;
  let data = {};
  try {
    res = await fetch("/.netlify/functions/submit-member-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        trackId: selectedTrack.id,
        content,
        tag,
      }),
    });
    data = await res.json().catch(() => ({}));
  } catch (_) {
    messageStatus.textContent = "Trace impossible pour le moment. Reessaie dans un instant.";
    return;
  }

  if (!res.ok) {
    if (data.error === "rate_limited") {
      messageStatus.textContent = "Patiente un instant avant de laisser une nouvelle trace.";
    } else if (data.error === "missing_token" || data.error === "invalid_token") {
      messageStatus.textContent = "Votre session a expiré. Reconnectez-vous pour laisser une trace.";
    } else if (data.error === "forbidden") {
      messageStatus.textContent = "Votre accès au cercle n'est pas encore ouvert pour laisser une trace.";
    } else if (data.error === "invalid_message") {
      messageStatus.textContent = "Trace trop courte ou trop longue.";
    } else {
      messageStatus.textContent = "Trace refusée. Réessaie dans un instant.";
    }
    return;
  }

  messageStatus.textContent = "Trace reçue. Elle reste entre vous et Morjane.";
  privateMessage.value = "";
}

magicLinkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (magicLinkSubmitBtn?.disabled) {
    return;
  }
  authStatus.textContent = "Envoi du lien...";

  const email = emailInput.value.trim();
  if (!email) {
    authStatus.textContent = "Email requis.";
    return;
  }
  const entryContext = getCurrentEntryContext();

  let response = null;
  let data = {};
  try {
    response = await fetch("/.netlify/functions/request-atelier-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        entry: entryContext,
        redirectTo: getAtelierEmailRedirectUrl(),
      }),
    });
    data = await response.json().catch(() => ({}));
  } catch (_) {
    authStatus.textContent = "Connexion instable. Réessaie dans un instant.";
    return;
  }

  if (!response.ok || !data.ok) {
    if (response.status === 429 || data.error === "rate_limited") {
      authStatus.textContent = "Trop de tentatives. Réessayez dans 60 secondes.";
      startMagicLinkCooldown(60);
    } else if (data.error === "invalid_email") {
      authStatus.textContent = "Email invalide. Vérifiez l'adresse puis réessayez.";
    } else {
      authStatus.textContent = "Impossible d'envoyer le lien pour le moment.";
    }
    return;
  }

  authStatus.textContent = "Mail envoyé. Ouvre le lien dans ton navigateur, ou entre le code reçu ici.";
  revealOtpCodeForm({ focus: true, showMobileHelp: true });
  startMagicLinkCooldown(60);
});

if (showOtpCodeBtn) {
  showOtpCodeBtn.addEventListener("click", () => {
    revealOtpCodeForm({ focus: true, showMobileHelp: false });
  });
}

if (otpCodeForm) {
  otpCodeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await verifyEmailCode();
  });
}

voteButtons.forEach((btn) => {
  btn.addEventListener("click", () => submitVote(btn.dataset.vote));
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = privateMessage.value.trim();
  if (!content) {
    messageStatus.textContent = "Message vide.";
    return;
  }
  await submitMessage(content, feedbackTag?.value || "emotion");
});

if (adminPanelToggle && adminPanel) {
  adminPanelToggle.addEventListener("click", () => {
    setAdminPanelCollapsed(!adminPanel.classList.contains("is-collapsed"));
  });
}

logoutBtn.addEventListener("click", async () => {
  await sendPresenceHeartbeat(false);
  stopPresenceHeartbeat();
  stopAdminLiveRefresh();
  await supabase.auth.signOut();
  session = null;
  profile = null;
  selectedTrack = null;
  adminUnlocked = false;
  stopWatermark();
  clearMediaSession();
  player.removeAttribute("src");
  player.load();
  await loadSessionAndProfile();
});

backBtn.addEventListener("click", () => {
  sendPresenceHeartbeat(false);
  stopPresenceHeartbeat();
  player.pause();
  stopWatermark();
  clearMediaSession();
  player.removeAttribute("src");
  player.load();
  hide(trackView);
  show(memberView);
  if (canManageMembers() && adminPanel) {
    setAdminPanelCollapsed(true);
    show(adminPanel);
  }
});

if (player) {
  player.addEventListener("play", () => {
    if (player.currentTime < 2) {
      playLoggedForCurrentTrack = false;
    }
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "playing";
    }
    startPresenceHeartbeat();
    startWatermark();
  });
  player.addEventListener("pause", () => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
    sendPresenceHeartbeat(false);
    stopPresenceHeartbeat();
    stopWatermark();
  });
  player.addEventListener("ended", () => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
    }
    sendPresenceHeartbeat(false);
    stopPresenceHeartbeat();
    stopWatermark();
    playLoggedForCurrentTrack = false;
  });
  player.addEventListener("seeked", () => {
    if (player.currentTime < 2) {
      playLoggedForCurrentTrack = false;
    }
  });
  player.addEventListener("timeupdate", () => {
    logQualifiedPlay();
    updateListeningChamber();
  });
}

if (tabPendingBtn && tabMembersBtn) {
  tabPendingBtn.addEventListener("click", () => {
    adminViewMode = "pending";
    tabPendingBtn.classList.add("is-active");
    tabMembersBtn.classList.remove("is-active");
    renderAdminMembers();
  });
  tabMembersBtn.addEventListener("click", () => {
    adminViewMode = "members";
    tabMembersBtn.classList.add("is-active");
    tabPendingBtn.classList.remove("is-active");
    renderAdminMembers();
  });
}

if (adminSearchInput) {
  adminSearchInput.addEventListener("input", () => {
    renderAdminMembers();
  });
}

if (adminInviteForm) {
  adminInviteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendAdminInvite("email");
  });
}

if (adminCreateInviteLinkBtn) {
  adminCreateInviteLinkBtn.addEventListener("click", async () => {
    await sendAdminInvite("link");
  });
}

if (adminTrackCreateForm) {
  adminTrackCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createAdminTrack();
  });
}

if (adminTrackAudioSelect) {
  adminTrackAudioSelect.addEventListener("change", () => {
    if (adminTrackAudioSelect.value && adminTrackPathInput) {
      adminTrackPathInput.value = adminTrackAudioSelect.value;
    }
    if (adminTrackAudioSelect.value && adminTrackTitleInput && !adminTrackTitleInput.value.trim()) {
      const fileName = adminTrackAudioSelect.value.split("/").pop() || "";
      adminTrackTitleInput.value = fileName.replace(/\.(m4a|mp3|wav|aac)$/i, "").replace(/\s+/g, " ").trim();
    }
  });
}

if (copyAdminAnnouncementBtn) {
  copyAdminAnnouncementBtn.addEventListener("click", async () => {
    const text = adminAnnouncementText?.value || buildAdminAnnouncementText();
    try {
      await navigator.clipboard.writeText(text);
      copyAdminAnnouncementBtn.textContent = "Annonce copiée";
    } catch (_) {
      copyAdminAnnouncementBtn.textContent = "Copie impossible";
    }
    setTimeout(() => {
      copyAdminAnnouncementBtn.textContent = "Copier l'annonce";
    }, 1400);
  });
}
if (adminPreviewSegment) {
  adminPreviewSegment.addEventListener("change", renderAdminProfilePreview);
}

if (adminPreviewStatus) {
  adminPreviewStatus.addEventListener("change", renderAdminProfilePreview);
}

if (copyAtelierLinkBtn) {
  copyAtelierLinkBtn.addEventListener("click", async () => {
    const atelierUrl = buildAtelierEntryUrl({ source: "direct", door: "direct" });
    try {
      await navigator.clipboard.writeText(atelierUrl);
      copyAtelierLinkBtn.textContent = "Lien copié";
      setTimeout(() => {
        copyAtelierLinkBtn.textContent = "Copier le lien Atelier";
      }, 1400);
    } catch (_) {
      copyAtelierLinkBtn.textContent = "Copie impossible";
      setTimeout(() => {
        copyAtelierLinkBtn.textContent = "Copier le lien Atelier";
      }, 1400);
    }
  });
}

if (copyMorjanePhoneLinkBtn) {
  copyMorjanePhoneLinkBtn.addEventListener("click", async () => {
    const atelierUrl = buildAtelierEntryUrl({ source: "direct", door: "morjane" });
    try {
      await navigator.clipboard.writeText(atelierUrl);
      copyMorjanePhoneLinkBtn.textContent = "Lien Morjane copié";
      setTimeout(() => {
        copyMorjanePhoneLinkBtn.textContent = "Lien Morjane téléphone";
      }, 1400);
    } catch (_) {
      copyMorjanePhoneLinkBtn.textContent = "Copie impossible";
      setTimeout(() => {
        copyMorjanePhoneLinkBtn.textContent = "Lien Morjane téléphone";
      }, 1400);
    }
  });
}
if (adminDensityToggle) {
  adminDensityToggle.addEventListener("click", () => {
    const next = !document.body.classList.contains("admin-compact");
    applyAdminDensityMode(next);
    try {
      localStorage.setItem(ADMIN_DENSITY_STORAGE_KEY, next ? "1" : "0");
    } catch (_) {
      // ignore storage errors
    }
  });
}

if (refreshInboxBtn) {
  refreshInboxBtn.addEventListener("click", async () => {
    await loadAdminInbox();
    await loadAdminStatus();
  });
}

if (markInboxReadBtn) {
  markInboxReadBtn.addEventListener("click", () => {
    markInboxAsRead();
  });
}

if (adminInboxSearch) {
  adminInboxSearch.addEventListener("input", () => {
    renderAdminInbox();
  });
}

if (adminInboxTrackFilter) {
  adminInboxTrackFilter.addEventListener("change", () => {
    renderAdminInbox();
  });
}

if (adminInboxSenderFilter) {
  adminInboxSenderFilter.addEventListener("change", () => {
    renderAdminInbox();
  });
}

if (toggleUnreadOnlyBtn) {
  toggleUnreadOnlyBtn.addEventListener("click", () => {
    adminInboxUnreadOnly = !adminInboxUnreadOnly;
    toggleUnreadOnlyBtn.textContent = adminInboxUnreadOnly ? "Tous les messages" : "Non lus seulement";
    toggleUnreadOnlyBtn.classList.toggle("is-active", adminInboxUnreadOnly);
    renderAdminInbox();
  });
}

document.querySelectorAll("[data-admin-section]").forEach((button) => {
  button.addEventListener("click", () => {
    showAdminSection(button.dataset.adminSection || "requests");
  });
});

if (exportInboxCsvBtn) {
  exportInboxCsvBtn.addEventListener("click", exportInboxCsv);
}

if (exportSignalCsvBtn) {
  exportSignalCsvBtn.addEventListener("click", exportSignalCsv);
}

if (adminUnlockForm) {
  adminUnlockForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!adminPinInput?.value) {
      if (adminUnlockStatus) adminUnlockStatus.textContent = "Code requis.";
      return;
    }

    if (adminUnlockStatus) adminUnlockStatus.textContent = "Vérification...";
    const ok = await unlockAdminWithPin(adminPinInput.value.trim());
    if (!ok) {
      if (adminUnlockStatus) adminUnlockStatus.textContent = "Code invalide.";
      return;
    }

    adminUnlocked = true;
    if (adminUnlockStatus) adminUnlockStatus.textContent = "Admin déverrouillé.";
    if (adminPinInput) adminPinInput.value = "";
    renderAdminLockState();
    await loadAdminMembers();
    await loadAdminWeeklyStats();
    await loadAdminInbox();
    await loadAdminVotesSummary();
    await loadAdminTrackCockpit();
    await loadAdminStatus();
    await loadAdminAuditLog();
    await loadAdminLiveListeners();
    startAdminLiveRefresh();
  });
}

if (trackLikeBtn) {
  trackLikeBtn.addEventListener("click", async () => {
    await toggleTrackLike();
  });
}

if (traceRevealBtn && messageForm) {
  traceRevealBtn.addEventListener("click", () => {
    messageForm.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

document.querySelectorAll("[data-support-context]").forEach((link) => {
  link.addEventListener("click", () => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "support_click", {
        context: link.dataset.supportContext || "unknown",
      });
    }
  });
});

async function boot() {
  initAdminDensityMode();
  initScrollReveals();
  getCurrentEntryContext();
  applyEntryContextToAuthView();
  renderAdminEntryLinks();
  setTimeout(() => {
    document.body.classList.add("ritual-ready");
  }, 120);

  await loadCircleCount();

  const { supabaseUrl, supabaseAnonKey } = await fetchPublicConfig();
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  await hydrateSessionFromUrl();

  const canEnter = await ensureAtelierAccess();
  if (!canEnter) {
    return;
  }

  await loadSessionAndProfile();
  supabase.auth.onAuthStateChange(async () => {
    await loadSessionAndProfile();
  });
}

boot().catch(() => {
  setGateStatus("Erreur de configuration Atelier.");
});




