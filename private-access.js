const status = document.getElementById("private-access-status");
const destinations = document.getElementById("private-access-destinations");

async function start() {
  try {
    const cfg = await fetch("/.netlify/functions/get-public-config").then(response => response.ok ? response.json() : Promise.reject());
    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    const url = new URL(location.href);
    if (url.searchParams.get("code")) await client.auth.exchangeCodeForSession(url.searchParams.get("code"));
    if (location.hash.includes("access_token=")) {
      const hash = new URLSearchParams(location.hash.slice(1));
      await client.auth.setSession({ access_token: hash.get("access_token"), refresh_token: hash.get("refresh_token") });
    }
    const session = (await client.auth.getSession()).data.session;
    if (!session) throw new Error("missing_session");
    const invitationToken = url.searchParams.get("token");
    const scope = url.searchParams.get("scope");
    const endpoint = invitationToken ? "/api/private-access-activate" : "/api/private-access-session";
    const payload = invitationToken ? { token: invitationToken } : { scope };
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    history.replaceState({}, "", "/private-access");
    if (!response.ok) throw new Error("access_refused");
    const links = result.destinations || (result.destination ? [result.destination] : []);
    if (links.length === 1) return location.replace(links[0]);
    status.textContent = "Votre accès est activé.";
    for (const href of links) { const link = document.createElement("a"); link.href = href; link.textContent = href === "/set" ? "Ouvrir le SET" : "Ouvrir ACTE I"; link.className = "content-cta"; destinations.append(link); }
  } catch {
    history.replaceState({}, "", "/private-access");
    status.textContent = "Ce lien n'est plus utilisable. Demandez un nouvel accès à MORJANE.";
  }
}
start();
