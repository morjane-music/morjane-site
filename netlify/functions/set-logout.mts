import { clearSetCookie } from "./_shared/set-auth.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { "Allow": "POST", "Cache-Control": "no-store" } });
  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "no-store",
      "Location": "/set-access?status=disconnected",
      "Set-Cookie": clearSetCookie(),
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  });
};

export const config = { path: "/api/set-logout", method: "POST" };
