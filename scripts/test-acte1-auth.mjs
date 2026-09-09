import assert from "node:assert/strict";
import {
  acte1PasswordsMatch,
  createActe1SessionToken,
  isConfiguredActe1Password,
  verifyActe1SessionToken
} from "../netlify/functions/_shared/acte1-auth.mjs";

const testPassword = "local-acte1-test-password";
const now = Date.parse("2026-09-06T10:00:00Z");
assert.equal(isConfiguredActe1Password("short"), false);
assert.equal(isConfiguredActe1Password(testPassword), true);
assert.equal(await acte1PasswordsMatch(testPassword, testPassword), true);
assert.equal(await acte1PasswordsMatch("incorrect", testPassword), false);
const token = await createActe1SessionToken(testPassword, now);
assert.equal(await verifyActe1SessionToken(token, testPassword, now), true);
assert.equal(await verifyActe1SessionToken(token, "another-password-value", now), false);
assert.equal(await verifyActe1SessionToken(`${token}x`, testPassword, now), false);
assert.equal(await verifyActe1SessionToken(token, testPassword, now + (4 * 60 * 60 + 1) * 1000), false);

let configuredPassword = testPassword;
const { createActe1AuthHandler } = await import("../netlify/functions/acte1-auth.mts");
const { createActe1Protector } = await import("../netlify/edge-functions/protect-acte1.ts");
const store = { registerAttempt: async () => true, clearAttempts: async () => {}, getCredential: async () => ({ status: "missing" }) };
const makeHandler = () => createActe1AuthHandler({ cookieSecret: "independent-test-cookie-secret", serviceRoleKey: "test-role", supabaseUrl: "https://test.supabase.co", legacyPassword: configuredPassword, store });
const protectActe1 = createActe1Protector({ supabaseUrl: "https://test.supabase.co", anonKey: "anon", legacyPassword: testPassword, rpc: async () => [{ configured: false, enabled: false, session_version: 0 }] });

function loginRequest(password) {
  return new Request("https://morjane.re/api/acte1-auth", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Origin": "https://morjane.re" },
    body: new URLSearchParams({ password })
  });
}

configuredPassword = undefined;
let response = await makeHandler()(loginRequest(testPassword));
assert.equal(response.status, 303);
assert.equal(response.headers.get("location"), "/acte1-access?error=invalid");

configuredPassword = testPassword;
response = await makeHandler()(loginRequest("incorrect"));
assert.equal(response.status, 303);
assert.equal(response.headers.get("location"), "/acte1-access?error=invalid");

response = await makeHandler()(loginRequest(testPassword));
assert.equal(response.status, 303);
assert.equal(response.headers.get("location"), "/acte1");
const sessionCookie = response.headers.get("set-cookie");
assert.match(sessionCookie, /morjane_acte1_session=/);
assert.match(sessionCookie, /HttpOnly/);
assert.match(sessionCookie, /Secure/);
assert.match(sessionCookie, /SameSite=Strict/);

response = await protectActe1(new Request("https://morjane.re/acte1"), { next: async () => new Response("private") });
assert.equal(response.status, 303);
assert.equal(response.headers.get("location"), "https://morjane.re/acte1-access");

response = await protectActe1(new Request("https://morjane.re/fissure"), { next: async () => new Response("private") });
assert.equal(response.status, 303);

response = await protectActe1(new Request("https://morjane.re/assets/photo-hero-acte1.png"), { next: async () => new Response("private") });
assert.equal(response.status, 404);
response = await protectActe1(new Request("https://morjane.re/acte1.css"), { next: async () => new Response("private") });
assert.equal(response.status, 404);

response = await protectActe1(new Request("https://morjane.re/acte1", { headers: { Cookie: sessionCookie.split(";")[0] } }), { next: async () => new Response("private") });
assert.equal(response.status, 200);
assert.equal(response.headers.get("cache-control"), "private, no-store");
response = await protectActe1(new Request("https://morjane.re/acte1.css", { headers: { Cookie: sessionCookie.split(";")[0] } }), { next: async () => new Response("private style") });
assert.equal(response.status, 200);

console.log("Acte I auth validation passed: password, cookie, redirects, aliases, protected asset, tampering and expiration.");
