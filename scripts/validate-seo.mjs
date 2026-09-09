import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const checkedPages = [
  "index.html",
  "epk.html",
  "set.html",
  "set-access.html",
  "confidentialite.html",
  "cookies.html",
  "mentions-legales.html",
  "presse/index.html",
  "musique/flamboyante/index.html",
  "musique/que-le-silence-seffondre/index.html",
  "musique/sororite/index.html"
];

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) errors.push(message); };
const cleanRouteAliases = new Map([
  ["/", "index.html"],
  ["/epk", "epk.html"],
  ["/set", "set.html"],
  ["/set-access", "set-access.html"],
  ["/acte1", "acte1.html"],
  ["/fissure", "acte1.html"],
  ["/confidentialite", "confidentialite.html"],
  ["/cookies", "cookies.html"],
  ["/mentions-legales", "mentions-legales.html"],
  ["/mentions-legales/", "mentions-legales.html"]
]);

function internalRouteExists(route) {
  if (cleanRouteAliases.has(route)) return fs.existsSync(path.join(root, cleanRouteAliases.get(route)));
  const relative = route.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!relative) return true;
  return fs.existsSync(path.join(root, relative)) || fs.existsSync(path.join(root, relative, "index.html"));
}

for (const page of checkedPages) {
  const html = read(page);
  assert(/<title>[^<]+<\/title>/i.test(html), `${page}: title manquant`);
  assert(/<meta\s+name="description"\s+content="[^"]+"/i.test(html), `${page}: meta description manquante`);
  assert(/<link\s+rel="canonical"\s+href="https:\/\/morjane\.re\/[^\"]*"/i.test(html), `${page}: canonical absolue manquante`);

  for (const match of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch (error) { errors.push(`${page}: JSON-LD invalide (${error.message})`); }
  }

  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/gi)) {
    const reference = match[1].split("?")[0];
    if (!reference || /^(?:https?:|mailto:|tel:|data:)/i.test(reference)) continue;
    if (reference.startsWith("/")) {
      if (!/\.[a-z0-9]+$/i.test(reference)) continue;
      assert(fs.existsSync(path.join(root, reference.slice(1))), `${page}: asset absent ${reference}`);
      continue;
    }
    if (!/\.[a-z0-9]+$/i.test(reference)) continue;
    assert(fs.existsSync(path.resolve(path.dirname(path.join(root, page)), reference)), `${page}: asset absent ${reference}`);
  }

  for (const match of html.matchAll(/href="(\/[^"#]*)/gi)) {
    const route = match[1].split("?")[0].replace(/\/$/, "") || "/";
    if (/\.[a-z0-9]+$/i.test(route)) continue;
    assert(internalRouteExists(route), `${page}: route interne absente ${route}`);
  }
}

const repositoryHtml = fs.readdirSync(root, { recursive: true })
  .filter((entry) => typeof entry === "string" && entry.endsWith(".html") && !entry.startsWith("node_modules"))
  .map((entry) => read(entry))
  .join("\n");
const analyticsPattern = new RegExp(["google", "tagmanager|google-analytics|G-8J28", "XF5EQL|\\bgtag\\s*\\("].join(""), "i");
const incorrectMusicPlatformPattern = new RegExp(["i", "heart"].join(""), "i");
const removedPressAssetPattern = new RegExp(["presse", "-shannker|press-lightbox|data-press-lightbox"].join(""), "i");
assert(!analyticsPattern.test(repositoryHtml), "confidentialité: Google Analytics encore présent dans le HTML");
assert(!/fonts\.(?:googleapis|gstatic)\.com/i.test(repositoryHtml), "confidentialité: Google Fonts runtime encore présent");
assert(!/<iframe[^>]+youtube(?:-nocookie)?\.com\/embed/i.test(repositoryHtml), "confidentialité: iframe YouTube chargée dans le HTML initial");

for (const scriptFile of ["script.js", "editorial.js", "set.js", "privacy-video.js", "atelier/app.js"]) {
  const source = read(scriptFile);
  assert(!analyticsPattern.test(source), `${scriptFile}: Google Analytics encore présent`);
}
assert(!incorrectMusicPlatformPattern.test(repositoryHtml + read("data/works.json") + read("data/knowledge-graph.json")), "données: association de plateforme erronée encore présente");
assert(!removedPressAssetPattern.test(repositoryHtml + read("data/press.json") + read("data/knowledge-graph.json") + read("editorial.js")), "presse: reproduction Télémag+ encore référencée");

const indexHtml = read("index.html");
assert(indexHtml.includes('"@type": "Person"'), "index.html: entité Person manquante");
assert(!indexHtml.includes('"@type": "MusicGroup",\n      "@id": "https://morjane.re/#artist"'), "index.html: l’artiste solo est encore déclaré MusicGroup");
assert(indexHtml.includes('"alternateName": ["Morjane", "Morgane Payet"]'), "index.html: lien nom de scène / nom civil manquant");
assert(!/interpr\?te|R\?union|Sororit\?|Collectif S\?r/.test(indexHtml), "index.html: caractères corrompus dans les données structurées");

for (const dataFile of ["data/artist.json", "data/works.json", "data/press.json", "data/press.schema.json", "data/knowledge-graph.json"]) {
  try { JSON.parse(read(dataFile)); } catch (error) { errors.push(`${dataFile}: JSON invalide (${error.message})`); }
}

const graph = JSON.parse(read("data/knowledge-graph.json"));
const requiredNodeFields = ["id", "type", "name", "url", "relation", "source", "verified", "status"];
const graphIds = new Set(graph.nodes.map((node) => node.id));
for (const [index, node] of graph.nodes.entries()) {
  for (const field of requiredNodeFields) assert(Object.hasOwn(node, field), `knowledge-graph node ${index}: champ ${field} manquant`);
  for (const relation of node.relation) {
    assert(graphIds.has(relation.target), `knowledge-graph ${node.id}: cible absente ${relation.target}`);
    assert(typeof relation.source === "string" && relation.source.length > 0, `knowledge-graph ${node.id}: relation ${relation.type} sans source`);
    if (/historical/i.test(relation.type)) assert(relation.temporalStatus === "historical", `knowledge-graph ${node.id}: relation historique sans temporalStatus`);
  }
}
assert(graphIds.size === graph.nodes.length, "knowledge-graph: identifiants dupliqués");
assert(graph.visibility === "internal", "knowledge-graph: visibilité interne non déclarée");
for (const historicalId of ["work-5-etoiles", "collaborator-antwane", "partner-la-ravinerie"]) {
  const node = graph.nodes.find((candidate) => candidate.id === historicalId);
  assert(Boolean(node), `knowledge-graph: nœud historique absent ${historicalId}`);
  assert(node?.visibility === "internal", `knowledge-graph: nœud historique public ${historicalId}`);
  assert(node?.status.startsWith("historical"), `knowledge-graph: statut historique absent ${historicalId}`);
}

const press = JSON.parse(read("data/press.json"));
const pressFields = ["id", "media", "title", "date", "url", "type", "relatedWork", "description", "source", "verified", "status"];
assert(press.items.length > 0, "data/press.json: aucune source vérifiée");
for (const [index, item] of press.items.entries()) {
  for (const field of pressFields) assert(Object.hasOwn(item, field), `press item ${index}: champ ${field} manquant`);
  assert(item.verified === true, `press item ${item.id}: source non vérifiée publiée`);
  assert(item.url === item.source, `press item ${item.id}: source et URL divergent`);
}

const sitemap = read("sitemap.xml");
const expectedSitemapUrls = [
  "https://morjane.re/",
  "https://morjane.re/epk",
  "https://morjane.re/musique/flamboyante",
  "https://morjane.re/musique/que-le-silence-seffondre",
  "https://morjane.re/musique/sororite",
  "https://morjane.re/presse",
  "https://morjane.re/confidentialite",
  "https://morjane.re/cookies",
  "https://morjane.re/mentions-legales/"
];
for (const url of expectedSitemapUrls) assert(sitemap.includes(`<loc>${url}</loc>`), `sitemap.xml: URL absente ${url}`);
const actualSitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(actualSitemapUrls.length === expectedSitemapUrls.length, `sitemap.xml: ${actualSitemapUrls.length} URLs au lieu de ${expectedSitemapUrls.length}`);
for (const url of actualSitemapUrls) assert(expectedSitemapUrls.includes(url), `sitemap.xml: URL publique inattendue ${url}`);
for (const privateRoute of ["/set", "/set-access", "/acte1", "/acte1-access", "/fissure", "/atelier"]) {
  assert(!actualSitemapUrls.some((url) => new URL(url).pathname === privateRoute), `sitemap.xml: route privée publiée ${privateRoute}`);
}

for (const [page, canonical] of [
  ["confidentialite.html", "https://morjane.re/confidentialite"],
  ["cookies.html", "https://morjane.re/cookies"],
  ["mentions-legales.html", "https://morjane.re/mentions-legales/"]
]) {
  const html = read(page);
  assert(html.includes('name="robots" content="index,follow"'), `${page}: indexation juridique incorrecte`);
  assert(html.includes(`<link rel="canonical" href="${canonical}">`), `${page}: canonical juridique incorrecte`);
}

const robots = read("robots.txt");
for (const privateRoute of ["/set", "/acte1", "/fissure", "/atelier"]) {
  assert(robots.includes(`Disallow: ${privateRoute}`), `robots.txt: route privée non exclue ${privateRoute}`);
}
for (const publicRoute of ["/confidentialite", "/cookies", "/mentions-legales/"]) {
  assert(!robots.includes(`Disallow: ${publicRoute}`), `robots.txt: page juridique publique bloquée ${publicRoute}`);
}

const epkHtml = read("epk.html");
assert(epkHtml.includes('name="robots" content="index,follow,max-image-preview:large"'), "epk.html: indexation attendue");
assert(epkHtml.includes('<link rel="canonical" href="https://morjane.re/epk">'), "epk.html: canonical incorrecte");
assert(/"@type"\s*:\s*"ProfilePage"/.test(epkHtml) && /"@type"\s*:\s*"Person"/.test(epkHtml), "epk.html: données structurées incomplètes");
assert(epkHtml.includes('/assets/epk/Morjane-EPK-web.pdf'), "epk.html: lien PDF web manquant");
assert(indexHtml.includes('href="/epk"'), "index.html: lien public vers /epk manquant");
assert(read("presse/index.html").includes('name="robots" content="index,follow,max-image-preview:large"'), "presse/index.html: indexation attendue");
assert(read("set.html").includes('name="robots" content="noindex,nofollow,noarchive"'), "set.html: noindex privé manquant");
assert(read("set-access.html").includes('name="robots" content="noindex,nofollow,noarchive"'), "set-access.html: noindex manquant");
assert(!sitemap.includes("<loc>https://morjane.re/set</loc>"), "sitemap.xml: /set ne doit pas être publié");
assert(!indexHtml.includes('href="/set"'), "index.html: lien public vers /set encore présent");

const publicHtml = checkedPages.filter((page) => !["set.html", "set-access.html"].includes(page)).map(read).join("\n");
assert(!/Antwane|La Ravinerie/i.test(publicHtml), "pages publiques: historique interne exposé");
const redirects = read("_redirects");
assert(redirects.includes("/data/knowledge-graph.json /404.html 404!"), "_redirects: knowledge graph interne exposé");
for (const protectionFile of [
  "netlify/functions/_shared/set-auth.mjs",
  "netlify/functions/set-auth.mts",
  "netlify/functions/set-logout.mts",
  "netlify/edge-functions/protect-set.ts",
  "SET-PROTECTION.md"
]) assert(fs.existsSync(path.join(root, protectionFile)), `protection /set: fichier absent ${protectionFile}`);
const setAuthSource = read("netlify/functions/set-auth.mts");
const setEdgeSource = read("netlify/edge-functions/protect-set.ts");
const setSharedSource = read("netlify/functions/_shared/set-auth.mjs");
const privateAccessHandlerSource = read("netlify/functions/_shared/private-access-handler.mjs");
const privateAccessSessionSource = read("netlify/functions/_shared/private-access-session.mjs");
assert(setAuthSource.includes('createPrivateAccessLoginHandler("set"'), "protection /set: gestionnaire serveur absent");
assert(privateAccessHandlerSource.includes('MORJANE_PRIVATE_ACCESS_COOKIE_SECRET') && privateAccessHandlerSource.includes('legacyPasswordEnv'), "protection /set: secret indépendant ou fallback transitoire absent");
assert(setEdgeSource.includes('"/set.html"') && setEdgeSource.includes('"/assets/images/set/*"'), "protection /set: routes sensibles incomplètes");
assert(setSharedSource.includes('"HttpOnly"') && setSharedSource.includes('"Secure"'), "protection /set: cookie insuffisamment protégé");

assert(privateAccessSessionSource.includes('"HttpOnly"') && privateAccessSessionSource.includes('"Secure"') && privateAccessSessionSource.includes('"SameSite=Strict"'), "protection /set: nouveau cookie insuffisamment protégé");

const silencePage = read("musique/que-le-silence-seffondre/index.html");
assert(/"@type"\s*:\s*"MusicRecording"/.test(silencePage), "Que le silence s'effondre: MusicRecording manquant");
assert(!/"@type"\s*:\s*"MusicAlbum"/.test(silencePage), "Que le silence s'effondre: MusicAlbum injustifié");
assert(silencePage.includes('/assets/images/cover-quelesilenceseffondre.webp'), "Que le silence s'effondre: dérivée WebP non servie");
assert(fs.existsSync(path.join(root, "assets/images/cover-quelesilenceseffondre.webp")), "Que le silence s'effondre: dérivée WebP absente");
const sororitePage = read("musique/sororite/index.html");
assert(sororitePage.includes("<title>Sororité — Collectif Sèr avec MORJANE</title>"), "Sororité: title incorrect");
for (const nodeId of ["event-festival-kartye-pesher", "event-tremplin-des-voix", "event-art-gadiamb", "event-kerveguen"]) {
  assert(graphIds.has(nodeId), `knowledge-graph: jalon absent ${nodeId}`);
}
for (const rule of [
  "/presse /presse/index.html 200!",
  "/musique/flamboyante /musique/flamboyante/index.html 200!",
  "/musique/que-le-silence-seffondre /musique/que-le-silence-seffondre/index.html 200!",
  "/musique/sororite /musique/sororite/index.html 200!",
  "/mentions-legales/ /mentions-legales.html 200!"
]) assert(redirects.includes(rule), `_redirects: règle forcée absente ${rule}`);
assert(indexHtml.includes("https://music.amazon.com/artists/B0CWLDWHKV/morjane"), "index.html: profil Amazon Music absent du sameAs");
assert(read("404.html").includes('name="robots" content="noindex,nofollow"'), "404.html: noindex manquant");

if (errors.length) {
  console.error(`SEO validation failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`SEO validation passed: ${checkedPages.length} pages, ${graph.nodes.length} knowledge graph nodes.`);
