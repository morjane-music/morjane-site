import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const gateStatus = document.getElementById("gateStatus");
const authView = document.getElementById("authView");
const memberView = document.getElementById("memberView");
const trackView = document.getElementById("trackView");
const authStatus = document.getElementById("authStatus");
const memberMeta = document.getElementById("memberMeta");
const trackList = document.getElementById("trackList");
const emptyTracks = document.getElementById("emptyTracks");
const trackTitle = document.getElementById("trackTitle");
const player = document.getElementById("player");
const trackWatermark = document.getElementById("trackWatermark");
const voteStatus = document.getElementById("voteStatus");
const messageStatus = document.getElementById("messageStatus");
const privateMessage = document.getElementById("privateMessage");

const magicLinkForm = document.getElementById("magicLinkForm");
const emailInput = document.getElementById("emailInput");
const messageForm = document.getElementById("messageForm");
const logoutBtn = document.getElementById("logoutBtn");
const backBtn = document.getElementById("backBtn");

let supabase = null;
let session = null;
let profile = null;
let tracks = [];
let selectedTrack = null;
let watermarkTimer = null;

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

function getAudienceStatusLabel(status) {
  if (status === "member" || status === "founder") {
    return "membre du cercle privé";
  }
  return "accès limité";
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
  const x = Math.round(10 + Math.random() * 65);
  const y = Math.round(18 + Math.random() * 45);
  trackWatermark.style.transform = `translate(${x}%, ${y}%)`;
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
  if (!res.ok) {
    window.location.href = "/";
    return false;
  }
  setGateStatus("Accès confirmé.");
  return true;
}

async function loadSessionAndProfile() {
  const sessionResult = await supabase.auth.getSession();
  session = sessionResult.data.session || null;

  if (!session) {
    show(authView);
    hide(memberView);
    hide(trackView);
    authStatus.textContent = "Connectez-vous pour accéder aux titres.";
    return;
  }

  profile = await ensureAtelierProfile();

  if (!profile || !isMember(profile.member_status)) {
    hide(authView);
    show(memberView);
    hide(trackView);
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
    return;
  }
  emptyTracks.classList.add("hidden");

  tracks.forEach((track) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = track.title;
    btn.addEventListener("click", () => selectTrack(track.id));
    li.appendChild(btn);
    trackList.appendChild(li);
  });
}

async function selectTrack(trackId) {
  selectedTrack = tracks.find((track) => track.id === trackId) || null;
  if (!selectedTrack) {
    return;
  }

  trackTitle.textContent = selectedTrack.title;
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

  authStatus.textContent = error ? "Impossible d'envoyer le lien." : "Lien envoyé. Vérifie ta boîte mail.";
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

async function boot() {
  setTimeout(() => {
    document.body.classList.add("ritual-ready");
  }, 120);

  const gateOk = await checkGate();
  if (!gateOk) {
    return;
  }

  const { supabaseUrl, supabaseAnonKey } = await fetchPublicConfig();
  supabase = createClient(supabaseUrl, supabaseAnonKey);

  await loadSessionAndProfile();
  supabase.auth.onAuthStateChange(async () => {
    await loadSessionAndProfile();
  });
}

boot().catch(() => {
  setGateStatus("Erreur de configuration Atelier.");
});
