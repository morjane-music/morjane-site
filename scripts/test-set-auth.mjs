import assert from "node:assert/strict";
import { createSetSessionToken, isConfiguredSetPassword, passwordsMatch, verifySetSessionToken } from "../netlify/functions/_shared/set-auth.mjs";

const testPassword = "local-test-password-only";
const now = Date.parse("2026-08-31T10:00:00Z");
assert.equal(isConfiguredSetPassword("short"), false);
assert.equal(isConfiguredSetPassword(testPassword), true);
assert.equal(await passwordsMatch(testPassword, testPassword), true);
assert.equal(await passwordsMatch("incorrect", testPassword), false);
const token = await createSetSessionToken(testPassword, now);
assert.equal(await verifySetSessionToken(token, testPassword, now), true);
assert.equal(await verifySetSessionToken(token, "another-test-password", now), false);
assert.equal(await verifySetSessionToken(`${token}x`, testPassword, now), false);
assert.equal(await verifySetSessionToken(token, testPassword, now + (4 * 60 * 60 + 1) * 1000), false);

let configuredPassword = testPassword;
const { createSetAuthHandler } = await import("../netlify/functions/set-auth.mts");
const { default: logout } = await import("../netlify/functions/set-logout.mts");
const { createSetProtector } = await import("../netlify/edge-functions/protect-set.ts");
const store = { registerAttempt: async () => true, clearAttempts: async () => {}, getCredential: async () => ({ status: "missing" }) };
const makeHandler = () => createSetAuthHandler({ cookieSecret: "independent-test-cookie-secret", serviceRoleKey: "test-role", supabaseUrl: "https://test.supabase.co", legacyPassword: configuredPassword, store });
const protectSet = createSetProtector({ supabaseUrl: "https://test.supabase.co", anonKey: "anon", legacyPassword: testPassword, rpc: async () => [{ configured: false, enabled: false, session_version: 0 }] });

function loginRequest(password) {
  return new Request("https://morjane.re/api/set-auth", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Origin": "https://morjane.re" },
    body: new URLSearchParams({ password })
  });
}

configuredPassword = undefined;
let response = await makeHandler()(loginRequest(testPassword));
assert.equal(response.status, 303);
assert.equal(response.headers.get("location"), "/set-access?error=invalid");

configuredPassword = testPassword;
response = await makeHandler()(loginRequest("incorrect"));
assert.equal(response.status, 303);
assert.equal(response.headers.get("location"), "/set-access?error=invalid");

response = await makeHandler()(loginRequest(testPassword));
assert.equal(response.status, 303);
assert.equal(response.headers.get("location"), "/set");
const sessionCookie = response.headers.get("set-cookie");
assert.match(sessionCookie, /morjane_set_session=/);
assert.match(sessionCookie, /HttpOnly/);
assert.match(sessionCookie, /Secure/);
assert.match(sessionCookie, /SameSite=Strict/);

response = await protectSet(new Request("https://morjane.re/set"), { next: async () => new Response("private") });
assert.equal(response.status, 303);
assert.equal(response.headers.get("location"), "https://morjane.re/set-access");

response = await protectSet(new Request("https://morjane.re/assets/images/set/hero-set.png"), { next: async () => new Response("private") });
assert.equal(response.status, 404);

response = await protectSet(new Request("https://morjane.re/assets/set-private/Cosmos.mp3"), { next: async () => new Response("private") });
assert.equal(response.status, 404);
response = await protectSet(new Request("https://morjane.re/set.js"), { next: async () => new Response("private") });
assert.equal(response.status, 404);

response = await protectSet(new Request("https://morjane.re/set", { headers: { Cookie: sessionCookie.split(";")[0] } }), { next: async () => new Response("private") });
assert.equal(response.status, 200);
assert.equal(response.headers.get("cache-control"), "private, no-store");

response = await protectSet(new Request("https://morjane.re/assets/set-private/Cosmos.mp3", { headers: { Cookie: sessionCookie.split(";")[0] } }), { next: async () => new Response("private audio") });
assert.equal(response.status, 200);
response = await protectSet(new Request("https://morjane.re/set.js", { headers: { Cookie: sessionCookie.split(";")[0] } }), { next: async () => new Response("private script") });
assert.equal(response.status, 200);

response = await logout(new Request("https://morjane.re/api/set-logout", { method: "POST" }));
assert.equal(response.status, 303);
assert.match(response.headers.get("set-cookie"), /Max-Age=0/);

console.log("Set auth validation passed: password, cookie, redirects, protected assets, tampering, expiration and logout.");
