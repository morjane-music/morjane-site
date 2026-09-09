const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", "Allow": "GET", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
    };
  }
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
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
    body: JSON.stringify({ ok: true, members: query.count || 0 }),
  };
};
