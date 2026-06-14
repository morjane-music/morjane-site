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
const memberPendingHelp = document.getElementById("memberPendingHelp");
const adminPanel = document.getElementById("adminPanel");
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
const refreshInboxBtn = document.getElementById("refreshInboxBtn");
const markInboxReadBtn = document.getElementById("markInboxReadBtn");
const adminInboxSearch = document.getElementById("adminInboxSearch");
const toggleUnreadOnlyBtn = document.getElementById("toggleUnreadOnlyBtn");
const exportInboxCsvBtn = document.getElementById("exportInboxCsvBtn");
const adminVotesSummary = document.getElementById("adminVotesSummary");
const adminTrackCockpit = document.getElementById("adminTrackCockpit");
const adminSignalBoard = document.getElementById("adminSignalBoard");
const adminStatusPanel = document.getElementById("adminStatusPanel");
const adminAuditLog = document.getElementById("adminAuditLog");
const adminLiveListeners = document.getElementById("adminLiveListeners");
const adminTodayCards = document.getElementById("adminTodayCards");
const adminDensityToggle = document.getElementById("adminDensityToggle");
const adminSearchInput = document.getElementById("adminSearchInput");
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
const voteStatus = document.getElementById("voteStatus");
const messageStatus = document.getElementById("messageStatus");
const privateMessage = document.getElementById("privateMessage");
const memberReplies = document.getElementById("memberReplies");

const magicLinkForm = document.getElementById("magicLinkForm");
const emailInput = document.getElementById("emailInput");
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
let watermarkTimer = null;
let adminMembersCache = [];
let adminInboxCache = [];
let adminLastSeenIso = null;
let adminInboxUnreadOnly = false;
let adminViewMode = "pending";
let magicLinkCooldownTimer = null;
let voteCooldownUntil = 0;
let adminUnlocked = false;
let presenceHeartbeatTimer = null;
let adminLiveRefreshTimer = null;
const adminTodayState = {
  liveNow: 0,
  pendingMessages: 0,
  playsToday: 0,
  activeMembers7d: 0,
};
const ADMIN_DENSITY_STORAGE_KEY = "atelier_admin_compact_density";
const ADMIN_MEMBER_STATUS_LABELS = {
  new: "nouveau",
  waiting: "a relancer",
  approved: "valide",
  vip: "VIP / founder",
  refused: "refuse",
  archived: "archive",
};
const ADMIN_MEMBER_SEGMENT_LABELS = {
  listener: "auditeur",
  pro: "pro",
  press: "presse",
  creator: "createur",
  friend: "proche",
  team: "equipe",
};

const WAVE_PUBLIC_NOTES = {
  proches: "Vague proches : ecoute instinctive, sans posture. Ce que tu ressens en premier compte.",
  pros: "Vague pros : aide-moi a voir ce qui tient artistiquement, en scene et en sortie.",
  presse: "Vague presse : fragments confidentiels pour comprendre la direction avant l'annonce publique.",
  fans: "Vague fans fideles : ton role est de dire ce qui reste apres l'ecoute.",
};

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
    return `Maquette ${num} - Morjane`;
  }

  return title;
}

function getDecisionStatusLabel(status) {
  return ({
    testing: "En test",
    kept: "Retenue",
    rework: "A retravailler",
    paused: "En pause",
    released: "Sortie",
    archived: "Archivee",
  }[status] || "En test");
}

function getFeedbackTagLabel(tag) {
  return ({
    emotion: "Emotion",
    text: "Texte",
    melody: "Melodie",
    arrangement: "Arrangement",
    scene: "Scene",
    doubt: "Doute",
  }[tag] || tag || "Retour");
}

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

function setGateStatus(text) {
  gateStatus.textContent = text;
}

function isMember(status) {
  return status === "member" || status === "founder";
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
  if (status === "member" || status === "founder") {
    return "dans le cercle prive";
  }
  return "sur le seuil de l'Atelier";
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
      <p class="admin-weekly-label">Messages non traites</p>
      <p class="admin-weekly-value">${Number(adminTodayState.pendingMessages || 0)}</p>
    </article>
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Ecoutes aujourd'hui</p>
      <p class="admin-weekly-value">${Number(adminTodayState.playsToday || 0)}</p>
    </article>
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Membres actifs 7j</p>
      <p class="admin-weekly-value">${Number(adminTodayState.activeMembers7d || 0)}</p>
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
      <p class="admin-weekly-label">Ecoutes qualifiees</p>
      <p class="admin-weekly-value">${plays}</p>
    </article>
    <article class="admin-weekly-card">
      <p class="admin-weekly-label">Messages recus</p>
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
    revokeBtn.title = "Impossible de retirer votre propre acces admin.";
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
  if (member.member_status === "founder" || member.role === "founder") {
    return "vip";
  }
  if (member.member_status === "member" || member.role === "admin") {
    return "approved";
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

function createMemberAction(label, action, userId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost";
  button.textContent = label;
  button.addEventListener("click", () => {
    const confirmations = {
      refuse: "Confirmer le refus de cette demande ?",
      archive: "Archiver ce profil ?",
      revoke: "Retirer l'acces de ce membre ?",
    };
    if (confirmations[action] && !window.confirm(confirmations[action])) {
      return;
    }
    updateMemberStatus(userId, action);
  });
  return button;
}

function appendAdminMemberDetails(content, member, fields, note, saveMeta) {
  const details = document.createElement("details");
  details.className = "admin-details";
  const summary = document.createElement("summary");
  summary.textContent = "Details";
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
  const segment = member.audience_segment ? (ADMIN_MEMBER_SEGMENT_LABELS[member.audience_segment] || member.audience_segment) : "segment non defini";
  const source = member.access_source || "source inconnue";
  const wave = member.access_wave || "hors vague";
  meta.textContent = `${member.member_status} / ${member.role} | ${segment} | ${source} | ${wave}`;
  content.appendChild(meta);

  const fields = document.createElement("div");
  fields.className = "admin-member-fields";
  const queueStatus = createSelect([
    ["new", "Nouveau"],
    ["waiting", "A relancer"],
    ["approved", "Valide"],
    ["vip", "VIP / founder"],
    ["refused", "Refuse"],
    ["archived", "Archive"],
  ], getQueueStatus(member), "Statut de file");
  const segmentSelect = createSelect([
    ["", "Segment"],
    ["listener", "Auditeur"],
    ["pro", "Pro"],
    ["press", "Presse"],
    ["creator", "Createur"],
    ["friend", "Proche"],
    ["team", "Equipe"],
  ], member.audience_segment || "", "Segment");
  const sourceInput = document.createElement("input");
  sourceInput.type = "text";
  sourceInput.placeholder = "Source";
  sourceInput.value = member.access_source || "";
  const waveInput = document.createElement("input");
  waveInput.type = "text";
  waveInput.placeholder = "Vague";
  waveInput.value = member.access_wave || "";
  fields.appendChild(queueStatus);
  fields.appendChild(segmentSelect);
  fields.appendChild(sourceInput);
  fields.appendChild(waveInput);

  const note = document.createElement("textarea");
  note.className = "admin-note-input";
  note.rows = 2;
  note.placeholder = "Note interne equipe";
  note.value = member.admin_note || "";

  const actions = document.createElement("div");
  actions.className = "admin-member-actions";
  actions.appendChild(createMemberAction("Valider", "approve", member.id));
  actions.appendChild(createMemberAction("Envoyer acces", "send_access_email", member.id));

  const secondary = document.createElement("details");
  secondary.className = "admin-action-menu";
  const secondarySummary = document.createElement("summary");
  secondarySummary.textContent = "Plus";
  secondary.appendChild(secondarySummary);
  secondary.appendChild(createMemberAction("VIP", "vip", member.id));
  secondary.appendChild(createMemberAction("Refuser", "refuse", member.id));
  secondary.appendChild(createMemberAction("Archiver", "archive", member.id));
  const revokeBtn = createMemberAction("Retirer", "revoke", member.id);
  if (member.id && member.id === profile?.id) {
    revokeBtn.disabled = true;
    revokeBtn.title = "Impossible de retirer votre propre acces admin.";
  }
  secondary.appendChild(revokeBtn);
  actions.appendChild(secondary);

  const saveMeta = document.createElement("button");
  saveMeta.type = "button";
  saveMeta.className = "ghost";
  saveMeta.textContent = "Sauver note";
  saveMeta.addEventListener("click", () => updateMemberMeta(member.id, {
    audience_status: queueStatus.value,
    audience_segment: segmentSelect.value,
    access_source: sourceInput.value,
    access_wave: waveInput.value,
    admin_note: note.value,
  }));
  content.appendChild(actions);
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
      <span>VIP ${counts.vip || 0}</span>
      <span>Refuses ${counts.refused || 0}</span>
    `;
  }
  const term = String(adminSearchInput?.value || "").trim().toLowerCase();
  const filtered = adminMembersCache.filter((member) => {
    const queueStatus = getQueueStatus(member);
    const pendingStatuses = ["new", "waiting", "refused", "archived"];
    const statusOk = adminViewMode === "pending"
      ? member.member_status === "none" || pendingStatuses.includes(queueStatus)
      : member.member_status !== "none" || member.role === "admin" || queueStatus === "approved" || queueStatus === "vip";
    const haystack = [
      member.email,
      member.audience_status,
      member.audience_segment,
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
  const availableTracks = tracks.length;
  const traces = Number(stats.messages || 0);
  const plays = Number(stats.plays || 0);
  const likes = Number(stats.likes || 0);
  memberPersonalStats.innerHTML = `
    <article>
      <span>Chapitre</span>
      <strong>Saison 01</strong>
    </article>
    <article>
      <span>Fragments</span>
      <strong>${availableTracks}</strong>
    </article>
    <article>
      <span>Derniere ecoute</span>
      <strong>${formatShortDate(stats.last_play_at)}</strong>
    </article>
    <article>
      <span>Traces</span>
      <strong>${traces}</strong>
    </article>
    <article>
      <span>Ecoutes</span>
      <strong>${plays}</strong>
    </article>
    <article>
      <span>Coeurs</span>
      <strong>${likes}</strong>
    </article>
  `;
  show(memberPersonalStats);
}

async function loadMemberPersonalStats() {
  if (!session?.access_token || !memberPersonalStats) {
    return;
  }
  try {
    const res = await fetch("/.netlify/functions/member-stats", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      renderMemberPersonalStats({});
      return;
    }
    renderMemberPersonalStats(data.stats || {});
  } catch (_) {
    renderMemberPersonalStats({});
  }
}

function populateInboxFilters() {
  if (!adminInboxTrackFilter || !adminInboxSenderFilter) {
    return;
  }

  const tracks = [...new Set(adminInboxCache.map((item) => item.track_title).filter(Boolean))].sort();
  const senders = [...new Set(adminInboxCache.map((item) => item.sender_email).filter(Boolean))].sort();

  const currentTrack = adminInboxTrackFilter.value;
  const currentSender = adminInboxSenderFilter.value;

  adminInboxTrackFilter.innerHTML = "<option value=\"\">Toutes les maquettes</option>";
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
    ["date", "email", "maquette", "axe", "message", "note_admin", "reponse_morjane", "statut"],
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
    recurringDoubt.textContent = `Doute recurrent : ${doubt ? doubt.content : "aucun signal fort"}`;
    const weakSignalText = document.createElement("p");
    weakSignalText.className = "admin-status-meta";
    weakSignalText.textContent = `Signaux faibles : ${weakSignals.length ? weakSignals.map(([word, count]) => `${word} (${count})`).join(", ") : "pas assez de recurrence"}`;
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

function renderWaveNote() {
  if (!memberWaveNote) {
    return;
  }
  const wave = String(profile?.access_wave || "").trim().toLowerCase();
  const note = WAVE_PUBLIC_NOTES[wave] || (wave ? `Vague ${wave} : ton ecoute aide a choisir ce qui continue.` : "");
  if (!note) {
    hide(memberWaveNote);
    return;
  }
  memberWaveNote.innerHTML = "";
  const title = document.createElement("p");
  title.className = "season-note__title";
  title.textContent = "Note de vague";
  const body = document.createElement("p");
  body.textContent = note;
  memberWaveNote.appendChild(title);
  memberWaveNote.appendChild(body);
  show(memberWaveNote);
}

function renderTrackTimeline(status) {
  if (!trackTimeline) {
    return;
  }
  const steps = [
    ["testing", "fragment"],
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
      replyInput.placeholder = "Reponse courte au membre";
      replyInput.value = item.admin_reply || "";

      const actions = document.createElement("div");
      actions.className = "admin-inbox-actions";
      const quickActions = document.createElement("div");
      quickActions.className = "admin-inbox-actions admin-inbox-actions--quick";
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "ghost";
      actionBtn.textContent = item.admin_status === "processed" ? "Remettre non traite" : "Marquer traite";
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
      saveReplyBtn.textContent = "Enregistrer reponse";
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
    adminInboxList.innerHTML = "<p class=\"muted\">Erreur reseau.</p>";
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
    meta.textContent = `Total votes : ${row.total} | A garder : ${row.keep} | A retravailler : ${row.revise} | A ecarter : ${row.discard}`;
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

function renderAdminTrackCockpit(tracks = []) {
  if (!adminTrackCockpit) {
    return;
  }
  if (!tracks.length) {
    adminTrackCockpit.innerHTML = "<p class=\"muted\">Aucune maquette trouvee.</p>";
    return;
  }

  adminTrackCockpit.innerHTML = "";
  tracks.forEach((track) => {
    const card = document.createElement("article");
    card.className = "admin-track-item";
    const head = document.createElement("div");
    head.className = "admin-track-head";
    const headContent = document.createElement("div");
    const title = document.createElement("p");
    title.className = "admin-status-title";
    title.textContent = formatTrackTitle(track.title);
    const stats = document.createElement("p");
    stats.className = "admin-status-meta";
    stats.textContent = `${getDecisionStatusLabel(track.decision_status)} | ${track.plays || 0} ecoutes | ${track.likes || 0} likes | ${track.messages || 0} messages`;
    const votes = document.createElement("p");
    votes.className = "admin-status-meta";
    votes.textContent = `Votes: garder ${track.votes?.develop || 0} | retravailler ${track.votes?.revise || 0} | ecarter ${track.votes?.leave || 0}`;
    headContent.appendChild(title);
    headContent.appendChild(stats);
    headContent.appendChild(votes);
    head.appendChild(headContent);

    const statusLabel = document.createElement("label");
    statusLabel.textContent = "Statut artistique";
    const status = document.createElement("select");
    [
      ["testing", "En test"],
      ["kept", "Retenue"],
      ["rework", "A retravailler"],
      ["paused", "En pause"],
      ["released", "Sortie"],
      ["archived", "Archivee"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      status.appendChild(option);
    });

    const intentLabel = document.createElement("label");
    intentLabel.textContent = "Note de Morjane";
    const intent = document.createElement("textarea");
    intent.rows = 3;
    intent.placeholder = "Ce que tu cherches avec cette maquette...";

    const questionLabel = document.createElement("label");
    questionLabel.textContent = "Question posee au cercle";
    const question = document.createElement("textarea");
    question.rows = 2;
    question.placeholder = "Ex: Est-ce que le refrain tient ?";

    const save = document.createElement("button");
    save.type = "button";
    save.className = "ghost";
    save.textContent = "Enregistrer";

    status.value = track.decision_status || "testing";
    intent.value = track.intent_note || "";
    question.value = track.feedback_question || "";
    save.addEventListener("click", async () => {
      await updateTrackCockpit(track.id, {
        decision_status: status.value,
        intent_note: intent.value,
        feedback_question: question.value,
      });
    });
    card.appendChild(head);
    card.appendChild(statusLabel);
    card.appendChild(status);
    card.appendChild(intentLabel);
    card.appendChild(intent);
    card.appendChild(questionLabel);
    card.appendChild(question);
    card.appendChild(save);
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
    renderAdminTrackCockpit(Array.isArray(data.tracks) ? data.tracks : []);
  } catch (_) {
    adminTrackCockpit.innerHTML = "<p class=\"muted\">Erreur reseau.</p>";
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
      return;
    }
    await loadAdminTrackCockpit();
    await loadTracks();
    await loadAdminAuditLog();
  } catch (_) {
    // no-op
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
  memberReplies.innerHTML = "<p class=\"member-replies-title\">Mot de Morjane</p>";
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
  const functions = Array.isArray(data?.functions) ? data.functions.slice(0, 6) : [];
  adminTodayState.pendingMessages = pending;
  adminTodayState.playsToday = Number(today.playsToday || 0);
  adminTodayState.activeMembers7d = Number(today.activeMembers7d || 0);
  adminTodayState.liveNow = Number(today.liveNow || adminTodayState.liveNow || 0);
  renderAdminTodayCards();

  adminStatusPanel.innerHTML = "";
  const top = document.createElement("article");
  top.className = "admin-status-item";
  [
    ["admin-status-title", "Synthese"],
    ["admin-status-meta", `Echecs fonctions 24h : ${uptime.errors24h || 0}/${uptime.total24h || 0} (${Math.round((uptime.failureRate24h || 0) * 100)}%)`],
    ["admin-status-meta", `Liens magiques (7 jours) : ${magic.sent || 0} envoyes, ${magic.error || 0} en erreur`],
    ["admin-status-meta", `Messages non traites : ${pending}`],
  ].forEach(([className, text]) => {
    const line = document.createElement("p");
    line.className = className;
    line.textContent = text;
    top.appendChild(line);
  });
  adminStatusPanel.appendChild(top);

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
    adminLiveListeners.innerHTML = "<p class=\"muted\">Personne n'ecoute en ce moment.</p>";
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
    adminLiveListeners.innerHTML = "<p class=\"muted\">Erreur reseau.</p>";
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
    message_replied: "Reponse message",
    track_cockpit_updated: "Maquette mise a jour",
    member_approve: "Membre valide",
    member_revoke: "Acces retire",
    member_vip: "VIP / proche",
    member_refuse: "Demande refusee",
    member_archive: "Profil archive",
    member_set_meta: "Fiche membre mise a jour",
    member_access_email_sent: "Email d'acces envoye",
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
    if (!res.ok) {
      return;
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

if (player) {
  player.controlsList = "nodownload noplaybackrate";
  player.disablePictureInPicture = true;
  player.addEventListener("contextmenu", (event) => event.preventDefault());
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
  document.body.classList.remove("is-listening");
  document.body.classList.remove("atelier-listening");
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

  let { data, error } = await supabase
    .from("atelier_profiles")
    .select("id, email, role, member_status, access_wave")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error && /access_wave/i.test(String(error.message || ""))) {
    const fallback = await supabase
      .from("atelier_profiles")
      .select("id, email, role, member_status")
      .eq("id", session.user.id)
      .maybeSingle();
    data = fallback.data;
  }

  return data || null;
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
    stopPresenceHeartbeat();
    stopAdminLiveRefresh();
    show(authView);
    hide(memberView);
    hide(trackView);
    if (memberPendingHelp) {
      hide(memberPendingHelp);
    }
    if (adminPanel) {
      hide(adminPanel);
    }
    authStatus.textContent = "Connectez-vous pour entrer dans le chapitre ouvert.";
    return;
  }

  profile = await ensureAtelierProfile();

  if (!profile || !isMember(profile.member_status)) {
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
    memberMeta.textContent = "Ta demande est recue. L'Atelier ouvre par vagues.";
    trackList.innerHTML = "";
    emptyTracks.classList.add("hidden");
    return;
  }

  await loadTracks();
}

async function loadTracks() {
  let { data, error } = await supabase
    .from("atelier_tracks")
    .select("id, title, status, season_id, intent_note, feedback_question, decision_status")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(3);

  if (error && /intent_note|feedback_question|decision_status/i.test(String(error.message || ""))) {
    const fallback = await supabase
      .from("atelier_tracks")
      .select("id, title, status, season_id")
      .eq("status", "active")
      .order("id", { ascending: false })
      .limit(3);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    memberMeta.textContent = "Impossible de charger les titres.";
    return;
  }

  tracks = data || [];
  trackPlayCounts = await loadTrackPlayCounts(tracks.map((track) => track.id));
  trackLikeCounts = await loadTrackLikeCounts(tracks.map((track) => track.id));
  userLikedTrackIds = await loadUserLikes(tracks.map((track) => track.id));
  hide(authView);
  show(memberView);
  hide(trackView);
  if (memberPendingHelp) {
    hide(memberPendingHelp);
  }
  renderTrackList();

  memberMeta.textContent = `Bienvenue, ${getMemberDisplayName()} - ${getAudienceStatusLabel(profile.member_status)}`;
  renderWaveNote();
  await loadMemberPersonalStats();

  if (tracks.length === 0) {
    emptyTracks.classList.remove("hidden");
  } else {
    emptyTracks.classList.add("hidden");
  }

  if (canManageMembers()) {
    if (adminPanel) {
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

async function loadTrackPlayCounts(trackIds) {
  const counts = new Map();
  if (!trackIds || trackIds.length === 0) {
    return counts;
  }

  const { data, error } = await supabase
    .from("atelier_track_play_counts")
    .select("track_id, play_count")
    .in("track_id", trackIds);

  if (error || !data) {
    return counts;
  }

  data.forEach((row) => {
    counts.set(row.track_id, Number(row.play_count || 0));
  });

  return counts;
}

async function loadTrackLikeCounts(trackIds) {
  const counts = new Map();
  if (!trackIds || trackIds.length === 0) {
    return counts;
  }

  const { data, error } = await supabase
    .from("atelier_track_like_counts")
    .select("track_id, like_count")
    .in("track_id", trackIds);

  if (error || !data) {
    return counts;
  }

  data.forEach((row) => {
    counts.set(row.track_id, Number(row.like_count || 0));
  });

  return counts;
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
  trackLikeBtn.textContent = isLiked ? "♥ Trace coeur laissee" : "♡ Laisser une trace coeur";
  if (trackLikeCount) {
    trackLikeCount.textContent = `Traces coeur du cercle : ${getTrackLikeCount(selectedTrack.id)}`;
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

function renderTrackList() {
  trackList.innerHTML = "";
  tracks.forEach((track) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "track-card atelier-card atelier-track-card";
    btn.addEventListener("click", () => selectTrack(track.id));

    const fragmentLabel = document.createElement("span");
    fragmentLabel.className = "track-card__fragment-label";
    fragmentLabel.textContent = "fragment en test";

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
    meta.textContent = `Écoutes du cercle : ${getTrackPlayCount(track.id)} · Traces coeur : ${getTrackLikeCount(track.id)}`;

    const hint = document.createElement("span");
    hint.className = "track-card__hint";
    hint.textContent = track.feedback_question || track.intent_note || "Entrer dans cette version et laisser une trace";

    const cta = document.createElement("span");
    cta.className = "track-card__cta";
    cta.textContent = "Écouter le fragment";

    btn.appendChild(fragmentLabel);
    top.appendChild(title);
    top.appendChild(status);
    btn.appendChild(top);
    btn.appendChild(meta);
    btn.appendChild(hint);
    btn.appendChild(cta);
    li.appendChild(btn);
    trackList.appendChild(li);
  });
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
  const hasIntent = Boolean(selectedTrack.intent_note || selectedTrack.feedback_question);
  if (trackIntentPanel && trackIntentNote && trackFeedbackQuestion) {
    if (hasIntent) {
      trackIntentNote.textContent = selectedTrack.intent_note || "Je vous laisse ecouter librement cette version, sans chercher la bonne reponse.";
      trackFeedbackQuestion.textContent = selectedTrack.feedback_question || "Qu'est-ce que cette maquette garde en vous apres l'ecoute ?";
      show(trackIntentPanel);
    } else {
      hide(trackIntentPanel);
    }
  }
  if (trackPlayCount) {
    trackPlayCount.textContent = `Écoutes du cercle : ${getTrackPlayCount(selectedTrack.id)}`;
  }
  renderTrackLikeState();
  voteStatus.textContent = "Chargement de l'audio...";
  messageStatus.textContent = "";
  renderMemberReplies([]);
  privateMessage.value = "";
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
      voteStatus.textContent = "Audio indisponible.";
      return;
    }

    player.src = data.url;
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
    voteStatus.textContent = "Choisissez d'abord une maquette du chapitre.";
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
  voteStatus.textContent = error ? `Geste refuse. ${error.message || ""}`.trim() : "Geste garde. Merci d'avoir ecoute jusqu'a l'endroit juste.";
}

async function submitMessage(content, tag = "emotion") {
  if (!selectedTrack || !profile) {
    messageStatus.textContent = "Choisissez d'abord une maquette avant de laisser une trace.";
    return;
  }

  if (!session?.access_token) {
    messageStatus.textContent = "Votre session a expire. Reconnectez-vous pour laisser une trace.";
    return;
  }

  if (content.length < 2) {
    messageStatus.textContent = "Trace trop courte. Quelques mots suffisent.";
    return;
  }

  if (content.length > 1200) {
    messageStatus.textContent = "Trace trop longue. Garde-la sous 1200 caracteres.";
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
      messageStatus.textContent = "Votre session a expire. Reconnectez-vous pour laisser une trace.";
    } else if (data.error === "forbidden") {
      messageStatus.textContent = "Votre acces au cercle n'est pas encore ouvert pour laisser une trace.";
    } else if (data.error === "invalid_message") {
      messageStatus.textContent = "Trace trop courte ou trop longue.";
    } else {
      messageStatus.textContent = "Trace refusee. Reessaie dans un instant.";
    }
    return;
  }

  messageStatus.textContent = "Trace recue. Elle reste entre vous et Morjane.";
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

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/atelier/`,
    },
  });

  if (error) {
    const raw = String(error.message || "");
    const lower = raw.toLowerCase();
    fetch("/.netlify/functions/log-magic-link-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, result: "error", error_code: lower.slice(0, 120) }),
    }).catch(() => {});
    if (lower.includes("rate limit")) {
      authStatus.textContent = "Trop de tentatives. Réessayez dans 60 secondes.";
      startMagicLinkCooldown(60);
    } else if (lower.includes("invalid")) {
      authStatus.textContent = "Email invalide. Vérifiez l'adresse puis réessayez.";
    } else {
      authStatus.textContent = `Impossible d'envoyer le lien. (${raw})`;
    }
    return;
  }
  authStatus.textContent = "Lien envoyé. Vérifie ta boîte mail.";
  fetch("/.netlify/functions/log-magic-link-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, result: "sent" }),
  }).catch(() => {});
  startMagicLinkCooldown(60);
});

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
  player.removeAttribute("src");
  player.load();
  await loadSessionAndProfile();
});

backBtn.addEventListener("click", () => {
  sendPresenceHeartbeat(false);
  stopPresenceHeartbeat();
  player.pause();
  stopWatermark();
  player.removeAttribute("src");
  player.load();
  hide(trackView);
  show(memberView);
  if (canManageMembers() && adminPanel) {
    show(adminPanel);
  }
});

if (player) {
  player.addEventListener("play", () => {
    if (player.currentTime < 2) {
      playLoggedForCurrentTrack = false;
    }
    startPresenceHeartbeat();
    startWatermark();
  });
  player.addEventListener("pause", () => {
    sendPresenceHeartbeat(false);
    stopPresenceHeartbeat();
    stopWatermark();
  });
  player.addEventListener("ended", () => {
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
  player.addEventListener("timeupdate", logQualifiedPlay);
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

if (copyAtelierLinkBtn) {
  copyAtelierLinkBtn.addEventListener("click", async () => {
    const atelierUrl = `${window.location.origin}/atelier/`;
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

async function boot() {
  initAdminDensityMode();
  initScrollReveals();
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




