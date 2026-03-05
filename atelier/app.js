import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const gateStatus = document.getElementById("gateStatus");
const authView = document.getElementById("authView");
const memberView = document.getElementById("memberView");
const trackView = document.getElementById("trackView");
const authStatus = document.getElementById("authStatus");
const memberMeta = document.getElementById("memberMeta");
const circleCount = document.getElementById("circleCount");
const trackList = document.getElementById("trackList");
const emptyTracks = document.getElementById("emptyTracks");
const adminPanel = document.getElementById("adminPanel");
const adminMembersList = document.getElementById("adminMembersList");
const copyAtelierLinkBtn = document.getElementById("copyAtelierLinkBtn");
const adminSearchInput = document.getElementById("adminSearchInput");
const tabPendingBtn = document.getElementById("tabPendingBtn");
const tabMembersBtn = document.getElementById("tabMembersBtn");
const trackTitle = document.getElementById("trackTitle");
const player = document.getElementById("player");
const trackWatermark = document.getElementById("trackWatermark");
const voteStatus = document.getElementById("voteStatus");
const messageStatus = document.getElementById("messageStatus");
const privateMessage = document.getElementById("privateMessage");

const magicLinkForm = document.getElementById("magicLinkForm");
const emailInput = document.getElementById("emailInput");
const magicLinkSubmitBtn = magicLinkForm ? magicLinkForm.querySelector("button[type='submit']") : null;
const messageForm = document.getElementById("messageForm");
const logoutBtn = document.getElementById("logoutBtn");
const backBtn = document.getElementById("backBtn");

let supabase = null;
let session = null;
let profile = null;
let tracks = [];
let selectedTrack = null;
let watermarkTimer = null;
let adminMembersCache = [];
let adminViewMode = "pending";
let magicLinkCooldownTimer = null;

function formatTrackTitle(rawTitle) {
  const title = String(rawTitle || "").trim();
  if (title === "Track test 01") {
    return "Maquette 01 - En bas - Morjane";
  }

  const genericMatch = title.match(/^(?:track(?:\s*test)?|tracktest|track)\s*0*(\d{1,2})$/i);
  if (genericMatch) {
    const num = genericMatch[1].padStart(2, "0");
    return `Maquette ${num} - Morjane`;
  }

  return title;
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
    return "membre du cercle privé";
  }
  return "accès limité";
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

function createAdminMemberRow(member) {
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
  revokeBtn.addEventListener("click", () => updateMemberStatus(member.id, "revoke"));
  row.appendChild(revokeBtn);

  return row;
}

async function loadAdminMembers() {
  if (!canManageMembers() || !session?.access_token || !adminPanel || !adminMembersList) {
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
  const term = String(adminSearchInput?.value || "").trim().toLowerCase();
  const wanted = adminViewMode === "pending"
    ? ["none"]
    : ["member", "founder", "admin"];

  const filtered = adminMembersCache.filter((member) => {
    const statusOk = wanted.includes(member.member_status) || (adminViewMode === "members" && member.role === "admin");
    const searchOk = !term || String(member.email || "").toLowerCase().includes(term);
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

  const { data } = await supabase
    .from("atelier_profiles")
    .select("id, email, role, member_status")
    .eq("id", session.user.id)
    .maybeSingle();

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

async function checkGate() {
  const res = await fetch("/.netlify/functions/check-atelier-gate", { method: "GET" });
  return res.ok;
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
  const gateOk = await checkGate();
  if (gateOk) {
    setGateStatus("Accès confirmé.");
    return true;
  }

  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.data.session) {
    setGateStatus("Accès membre confirmé.");
    return true;
  }

  window.location.href = "/";
  return false;
}

async function loadSessionAndProfile() {
  const sessionResult = await supabase.auth.getSession();
  session = sessionResult.data.session || null;

  if (!session) {
    show(authView);
    hide(memberView);
    hide(trackView);
    if (adminPanel) {
      hide(adminPanel);
    }
    authStatus.textContent = "Connectez-vous pour accéder aux titres.";
    return;
  }

  profile = await ensureAtelierProfile();

  if (!profile || !isMember(profile.member_status)) {
    hide(authView);
    show(memberView);
    hide(trackView);
    if (adminPanel) {
      hide(adminPanel);
    }
    memberMeta.textContent = "Compte connecté mais sans accès membre. Contactez l'admin.";
    trackList.innerHTML = "";
    emptyTracks.classList.remove("hidden");
    return;
  }

  await loadTracks();
}

async function loadTracks() {
  const { data, error } = await supabase
    .from("atelier_tracks")
    .select("id, title, status, season_id")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(3);

  if (error) {
    memberMeta.textContent = "Impossible de charger les titres.";
    return;
  }

  tracks = data || [];
  hide(authView);
  show(memberView);
  hide(trackView);
  trackList.innerHTML = "";

  memberMeta.textContent = `${profile.email} - ${getAudienceStatusLabel(profile.member_status)}`;

  if (tracks.length === 0) {
    emptyTracks.classList.remove("hidden");
  } else {
    emptyTracks.classList.add("hidden");
  }

  tracks.forEach((track) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = formatTrackTitle(track.title);
    btn.addEventListener("click", () => selectTrack(track.id));
    li.appendChild(btn);
    trackList.appendChild(li);
  });

  if (canManageMembers()) {
    await loadAdminMembers();
  } else if (adminPanel) {
    hide(adminPanel);
  }
}

async function selectTrack(trackId) {
  selectedTrack = tracks.find((track) => track.id === trackId) || null;
  if (!selectedTrack) {
    return;
  }

  trackTitle.textContent = formatTrackTitle(selectedTrack.title);
  voteStatus.textContent = "";
  messageStatus.textContent = "";
  privateMessage.value = "";

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
    show(trackView);
    hide(memberView);
    stopWatermark();
  } catch (_) {
    voteStatus.textContent = "Erreur réseau.";
  }
}

async function submitVote(choice) {
  if (!selectedTrack || !profile) {
    voteStatus.textContent = "Sélectionne un titre avant de voter.";
    return;
  }

  const payload = {
    track_id: selectedTrack.id,
    user_id: profile.id,
    choice,
  };

  const { error } = await supabase.from("atelier_votes").upsert(payload, { onConflict: "track_id,user_id" });
  voteStatus.textContent = error ? `Vote refusé. ${error.message || ""}`.trim() : "Vote enregistré.";
}

async function submitMessage(content) {
  if (!selectedTrack || !profile) {
    messageStatus.textContent = "Sélectionne un titre avant d'envoyer un message.";
    return;
  }

  const { error } = await supabase.from("atelier_messages").insert({
    track_id: selectedTrack.id,
    user_id: profile.id,
    content,
  });

  if (error) {
    messageStatus.textContent = `Message refusé. ${error.message || ""}`.trim();
    return;
  }

  messageStatus.textContent = "Message envoyé à l'admin.";
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
      emailRedirectTo: `${window.location.origin}/atelier`,
    },
  });

  if (error) {
    authStatus.textContent = `Impossible d'envoyer le lien. (${error.message})`;
    if (String(error.message || "").toLowerCase().includes("rate limit")) {
      startMagicLinkCooldown(60);
    }
    return;
  }
  authStatus.textContent = "Lien envoyé. Vérifie ta boîte mail.";
  startMagicLinkCooldown(60);
});

document.querySelectorAll("[data-vote]").forEach((btn) => {
  btn.addEventListener("click", () => submitVote(btn.dataset.vote));
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = privateMessage.value.trim();
  if (!content) {
    messageStatus.textContent = "Message vide.";
    return;
  }
  await submitMessage(content);
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  session = null;
  profile = null;
  selectedTrack = null;
  stopWatermark();
  player.removeAttribute("src");
  player.load();
  await loadSessionAndProfile();
});

backBtn.addEventListener("click", () => {
  player.pause();
  stopWatermark();
  player.removeAttribute("src");
  player.load();
  hide(trackView);
  show(memberView);
});

if (player) {
  player.addEventListener("play", startWatermark);
  player.addEventListener("pause", stopWatermark);
  player.addEventListener("ended", stopWatermark);
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
    const atelierUrl = `${window.location.origin}/atelier`;
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

async function boot() {
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
