import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const require = createRequire(import.meta.url);
const { canAccessTrack, canRecoverProfile, normalizeAccessMode } = require("../netlify/functions/_lib/atelier-access.js");

const html = read("../atelier/index.html");
const client = read("../atelier/app.js");
const request = read("../netlify/functions/request-atelier-access.js");
const validateKey = read("../netlify/functions/validate-atelier-key.js");
const adminMembers = read("../netlify/functions/admin-members.js");
const adminInvite = read("../netlify/functions/admin-invite-member.js");
const adminKeys = read("../netlify/functions/admin-create-invite-key.js");
const adminTracks = read("../netlify/functions/admin-track-cockpit.js");
const adminGate = read("../netlify/functions/_lib/admin-gate.js");
const unlockAdmin = read("../netlify/functions/unlock-admin.js");
const getMemberTracks = read("../netlify/functions/get-member-tracks.js");
const logout = read("../netlify/functions/atelier-logout.mts");
const rateLimit = read("../netlify/edge-functions/rate-limit-sensitive.ts");
const sql = read("../supabase/atelier-access-simplification.sql");
const redirects = read("../_redirects");
const netlifyConfig = read("../netlify.toml");

for (const mode of ["invitation", "request", "recovery"]) {
  assert.match(html, new RegExp(`data-auth-mode=["']${mode}["']`));
}
assert.match(html, /id="tabPendingBtn"[^>]*>À décider</);
assert.match(html, /id="tabHistoryBtn"/);
assert.match(html, /id="adminMembersPrevBtn"/);
assert.match(html, /id="adminMembersNextBtn"/);
assert.match(html, /id="adminMemberSegmentFilter"/);
assert.match(html, /id="adminKeyExpiresAt"/);
assert.match(html, /id="adminKeyList"/);
assert.match(html, /class="admin-utility-drawer"/);
assert.match(html, /id="adminInboxStatusFilters"/);
assert.match(html, /id="adminAuditSearch"/);
assert.match(html, /id="adminAuditTypeFilter"/);
assert.match(html, /id="adminAuditDateFilter"/);
assert.doesNotMatch(html, /data-auth-mode=["'](?:key|access)["']/);
assert.match(html, /id="showOtpCodeBtn"[^>]*hidden/);
assert.match(client, /authEntryMode !== "request"/);
assert.match(client, /mode: authEntryMode/);
assert.match(client, /supabase\.auth\.getSession\(\)/);
assert.match(client, /profile\.role !== "admin"/);
assert.match(client, /IS_ADMIN_ROUTE/);
assert.match(client, /await loadAdminConsole\(\{ dedicated: true \}\)/);
assert.match(client, /profile\.role !== "admin"/);
assert.match(html, /id="adminLogoutBtn"/);
assert.match(client, /removeKeyFromCurrentUrl\(\)/);
assert.match(client, /ATELIER_ENTRY_CONTEXT_TTL_MS = 6 \* 60 \* 60 \* 1000/);
assert.doesNotMatch(client, /Tu as trouve la fissure/i);
assert.doesNotMatch(
  client,
  /if \(adminPanel && !shouldPreserveTrackView\) \{\s*setAdminPanelCollapsed\(true\);/,
  "session/data refreshes must not collapse an already-open admin console",
);
assert.match(client, /async function loadAdminConsole/);
assert.match(client, /if \(dedicated\) \{\s*setAdminPanelCollapsed\(false\);/);
assert.match(client, /else if \(!preservePanelState && isFirstAdminPanelReveal\) \{\s*setAdminPanelCollapsed\(true\);/);
const backHandler = client.match(/backBtn\.addEventListener\("click", \(\) => \{[\s\S]*?\n\}\);/)?.[0] || "";
assert.ok(backHandler, "the track back handler should exist");
assert.doesNotMatch(
  backHandler,
  /setAdminPanelCollapsed\(true\)/,
  "returning from a track must preserve the admin console state",
);
assert.equal(
  [...client.matchAll(/setAdminPanelCollapsed\(true\)/g)].length,
  1,
  "only the first admin-console reveal may collapse it implicitly",
);
assert.match(redirects, /^\/fissure \/acte1\.html 200$/m);
assert.match(redirects, /^\/atelier\/admin \/atelier\/index\.html 200!$/m);
assert.match(netlifyConfig, /from = "\/atelier\/admin"[\s\S]*?to = "\/atelier\/index\.html"[\s\S]*?status = 200[\s\S]*?force = true/);
assert.match(netlifyConfig, /for = "\/atelier\*"[\s\S]*?X-Robots-Tag = "noindex, nofollow, noarchive"/);

assert.match(request, /mode === "request"/);
assert.match(request, /outcome: "request_received"/);
assert.match(request, /adult_confirmed_at: adultConfirmed \? new Date\(\)\.toISOString\(\) : undefined/);
assert.match(request, /mode === "recovery"/);
assert.match(request, /outcome: "recovery_requested"/);
assert.match(request, /mode === "recovery"[\s\S]*?\{ ok: true, profile: existingProfile \}/);
assert.match(request, /auth\.admin\.generateLink/);
assert.match(request, /sendRecoveryEmail/);
assert.match(request, /RESEND_API_KEY/);
assert.match(request, /mode === "invitation"/);
assert.match(request, /atelier_consume_invitation_claim/);
assert.match(validateKey, /atelier_claim_invitation_key/);
assert.match(adminMembers, /auth\.admin\.generateLink/);
assert.match(adminMembers, /targetBefore\?\.role === "admin"/);
assert.match(adminMembers, /admin_role_change_blocked/);
assert.match(adminInvite, /member_status: memberStatus/);
assert.match(adminInvite, /auth\.admin\.generateLink/);
assert.match(client, /member_approve_and_send_access_email: "Membre validé et accès envoyé"/);
assert.match(client, /adminRoleProtected = member\.role === "admin"/);
assert.match(client, /createDecisionRequestRow/);
assert.match(client, /18\+ confirmé lors de la demande/);
assert.match(client, /view: adminViewMode === "pending" \? "decision" : adminViewMode/);
assert.match(client, /loadAdminKeys/);
assert.match(client, /admin-inbox-workspace/);
assert.doesNotMatch(client, /columnsWrap\.className = "admin-inbox-columns"/);
assert.match(client, /admin-track-switcher/);
assert.match(client, /Système opérationnel/);
assert.match(client, /adminAuditVisibleCount \+= 25/);
assert.match(client, /window\.confirm\(`Révoquer la clé/);
assert.match(client, /Renvoyer l'accès/);
assert.match(client, /Le renvoi est disponible uniquement pour un profil déjà autorisé/);
assert.match(client, /deviendra \$\{visibilityCopy\}.*Confirmer \?/s);
assert.match(adminMembers, /select\([^\n]+\{ count: "exact" \}\)/);
assert.match(adminMembers, /\.range\(from, to\)/);
assert.match(adminMembers, /view === "decision"/);
assert.match(adminMembers, /audience_status\.is\.null,audience_status\.in\.\(new,waiting\)/);
assert.match(adminMembers, /adult_confirmed_at/);
assert.match(adminMembers, /access_not_open/);
assert.match(adminMembers, /access_email_rate_limited/);
assert.match(adminMembers, /member_access_email_sent/);
assert.match(adminKeys, /event\.httpMethod === "GET"/);
assert.match(adminKeys, /state = !key\.is_active \? "revoked" : expired \? "expired" : exhausted \? "consumed" : "active"/);
assert.match(adminKeys, /payload\.action === "revoke"/);
assert.match(adminKeys, /claim_token_hash: null/);
assert.match(adminKeys, /invitation_key_revoked/);
assert.match(adminKeys, /maxUses = Math\.max\(1, Math\.min\(50/);
assert.match(adminTracks, /profileResult\.data\.role !== "admin"/);
assert.match(getMemberTracks, /if \(!token\)/);
assert.match(getMemberTracks, /return json\(401, \{ ok: false, error: "missing_token" \}\)/);
assert.match(unlockAdmin, /profileResult\.data\.role !== "admin"/);
assert.match(unlockAdmin, /createAdminGateCookie/);
assert.match(adminGate, /60 \* 60 \* 12/);
assert.match(logout, /expiredCookie\("atelier_admin_gate"\)/);
assert.match(client, /supabase\.auth\.signOut\(\)/);
assert.match(rateLimit, /"\/\.netlify\/functions\/validate-atelier-key"/);
assert.match(rateLimit, /"\/\.netlify\/functions\/request-atelier-access"/);
assert.match(rateLimit, /"\/\.netlify\/functions\/unlock-admin"/);

assert.match(sql, /for update;/i);
assert.match(sql, /uses_count = uses_count \+ 1/);
assert.match(sql, /audience_segment = coalesce\(excluded\.audience_segment, atelier_profiles\.audience_segment\)/);
assert.match(sql, /access_source = excluded\.access_source/);
assert.match(sql, /access_wave = excluded\.access_wave/);
assert.match(sql, /add column if not exists adult_confirmed_at timestamptz/);
assert.match(sql, /grant execute on function public\.atelier_claim_invitation_key/);
assert.match(sql, /grant execute on function public\.atelier_consume_invitation_claim/);

const activeTrack = {
  status: "active",
  allowed_member_statuses: [],
  allowed_audience_segments: [],
  atelier_seasons: { slug: "acte-i", status: "active" },
};
assert.equal(canAccessTrack({ role: "member", member_status: "member", audience_segment: "public" }, activeTrack), true);
assert.equal(canAccessTrack({ role: "member", member_status: "pending", audience_segment: "public" }, activeTrack), false);
assert.equal(canAccessTrack({ role: "admin", member_status: "pending", audience_segment: "public" }, activeTrack), true);
assert.equal(normalizeAccessMode("request"), "request");
assert.equal(normalizeAccessMode("recovery"), "recovery");
assert.equal(normalizeAccessMode("invitation"), "invitation");
assert.equal(normalizeAccessMode("legacy"), "request");
assert.equal(canRecoverProfile({ role: "member", member_status: "member" }), true);
assert.equal(canRecoverProfile({ role: "admin", member_status: "pending" }), true);
assert.equal(canRecoverProfile({ role: "member", member_status: "pending" }), false);

console.log("Atelier access validation passed: three clear intents, pending requests, recovery-only email auth, atomic MOR claims, admin access and Fissure separation.");
