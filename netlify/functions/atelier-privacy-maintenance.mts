import { createClient } from "@supabase/supabase-js";

export default async () => {
  const supabaseUrl = Netlify.env.get("SUPABASE_URL");
  const serviceRoleKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return new Response("Missing environment", { status: 500 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const result = await supabase.rpc("atelier_apply_privacy_retention");
  if (result.error) return new Response("Privacy maintenance failed", { status: 500 });
  return Response.json({ ok: true, result: result.data }, { headers: { "Cache-Control": "no-store" } });
};

export const config = { schedule: "0 * * * *" };
