import { clearActe1Cookie } from "./_shared/acte1-auth.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { "Allow": "POST", "Cache-Control": "no-store" } });
  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "no-store",
      "Location": "/acte1-access?status=disconnected",
      "Set-Cookie": clearActe1Cookie(),
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  });
};

export const config = { path: "/api/acte1-logout", method: "POST" };
