const { createClient } = require("@supabase/supabase-js");

exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "missing_env" }),
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const query = await supabase
    .from("atelier_profiles")
    .select("id", { count: "exact", head: true })
    .in("member_status", ["member", "founder", "priority"]);

  if (query.error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "query_failed" }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ ok: true, members: query.count || 0 }),
  };
};
