import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const project = new URL("../", import.meta.url);

for (const name of ["Cosmos.mp3", "En_bas.mp3", "Verite_coupee.mp3"]) {
  assert.equal(existsSync(new URL(`../assets/${name}`, import.meta.url)), false, `${name} must not remain public`);
  assert.equal(existsSync(new URL(`../assets/set-private/${name}`, import.meta.url)), true, `${name} must exist in the protected set directory`);
}

const allMarkup = `${read("../set.html")}\n${read("../acte1.html")}`;
assert.doesNotMatch(allMarkup, /assets\/(Cosmos|En_bas|Verite_coupee)\.mp3/);
assert.doesNotMatch(read("../acte1.html"), /<audio\b/i);
assert.equal(existsSync(new URL("../netlify/functions/log-magic-link-event.js", import.meta.url)), false);
assert.equal(existsSync(new URL("../netlify/functions/check-atelier-password.js", import.meta.url)), false);
assert.equal(existsSync(new URL("../netlify/functions/check-atelier-gate.js", import.meta.url)), false);
assert.equal(existsSync(new URL("../assets/vendor/supabase-js-2.98.0.js", import.meta.url)), true);
assert.doesNotMatch(read("../atelier/app.js"), /esm\.sh/);
assert.match(read("../atelier/index.html"), /supabase-js-2\.98\.0\.js/);
assert.match(read("../atelier/app.js"), /\/api\/atelier-logout/);

const atelierLogout = await import(new URL("../netlify/functions/atelier-logout.mts", import.meta.url));
const logoutResponse = await atelierLogout.default(new Request("https://morjane.re/api/atelier-logout", { method: "POST" }));
assert.equal(logoutResponse.status, 200);
const logoutCookies = logoutResponse.headers.getSetCookie
  ? logoutResponse.headers.getSetCookie()
  : [logoutResponse.headers.get("set-cookie") || ""];
assert.ok(logoutCookies.join("\n").includes("atelier_admin_gate="));
assert.ok(logoutCookies.join("\n").includes("atelier_gate="));
assert.ok(logoutCookies.join("\n").includes("Max-Age=0"));

const statsModule = await import(new URL("../netlify/functions/get-atelier-stats.js", import.meta.url));
const statsPost = await statsModule.handler({ httpMethod: "POST" });
assert.equal(statsPost.statusCode, 405);

const limiter = await import(new URL("../netlify/edge-functions/rate-limit-sensitive.ts", import.meta.url));
assert.equal(limiter.config.rateLimit.windowLimit, 12);
assert.ok(limiter.config.path.includes("/.netlify/functions/unlock-admin"));
assert.ok(limiter.config.path.includes("/.netlify/functions/request-atelier-access"));
assert.ok(limiter.config.path.includes("/.netlify/functions/validate-atelier-key"));
assert.ok(limiter.config.path.includes("/api/set-auth"));
assert.ok(limiter.config.path.includes("/api/acte1-auth"));
assert.ok(!limiter.config.path.includes("/.netlify/functions/check-atelier-password"));

const digest = await import(new URL("../netlify/functions/admin-daily-digest.mts", import.meta.url));
assert.equal(digest.config.schedule, "0 7 * * *");
const maintenance = await import(new URL("../netlify/functions/atelier-privacy-maintenance.mts", import.meta.url));
assert.equal(maintenance.config.schedule, "0 * * * *");

const config = read("../netlify.toml");
assert.match(config, /Content-Security-Policy/);
assert.match(config, /X-Content-Type-Options/);
assert.match(config, /Strict-Transport-Security/);
assert.doesNotMatch(config, /esm\.sh/);

const sql = read("../supabase/atelier-privacy-hardening.sql");
assert.match(sql, /atelier_track_likes_select_own_or_admin/);
assert.match(sql, /atelier_track_plays_select_own_or_admin/);
assert.match(sql, /interval '90 days'/);
assert.match(sql, /interval '5 minutes'/);
assert.match(sql, /interval '3 months'/);
assert.match(sql, /delete from public\.atelier_function_events where created_at < now\(\) - interval '3 months'/);
assert.match(sql, /delete from public\.atelier_admin_audit_logs where created_at < now\(\) - interval '12 months'/);
assert.match(sql, /interval '24 months'/);
assert.match(sql, /atelier_scrub_account_references/);
assert.match(sql, /last_activity_at/);
assert.match(sql, /atelier_touch_member_activity/);

console.log("Privacy hardening validation passed: private MP3 paths, protected routes, scheduled-only jobs, rate limit, RLS migration and security headers.");
