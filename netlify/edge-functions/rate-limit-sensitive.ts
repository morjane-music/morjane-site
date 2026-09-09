export default async (_request: Request, context: { next: () => Promise<Response> }) => context.next();

export const config = {
  path: [
    "/api/set-auth",
    "/api/acte1-auth",
    "/api/private-access-activate",
    "/api/private-access-session",
    "/api/private-access-request-link",
    "/.netlify/functions/unlock-admin",
    "/.netlify/functions/validate-atelier-key",
    "/.netlify/functions/request-atelier-access"
  ],
  rateLimit: {
    windowLimit: 12,
    windowSize: 60,
    aggregateBy: ["domain", "ip"]
  },
  onError: "fail"
};
