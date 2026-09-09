const expiredCookie = (name: string) =>
  `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export default async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json(
      { ok: false, error: "method_not_allowed" },
      { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
    );
  }

  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  });
  headers.append("Set-Cookie", expiredCookie("atelier_admin_gate"));
  headers.append("Set-Cookie", expiredCookie("atelier_gate"));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};

export const config = { path: "/api/atelier-logout" };
