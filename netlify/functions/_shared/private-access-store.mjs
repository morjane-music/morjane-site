import { createClient } from "@supabase/supabase-js";

export function createPrivateAccessStore({ supabaseUrl, serviceRoleKey }) {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("private_access_store_not_configured");
  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async getCredential(scope) {
      const result = await client.from("private_access_credentials")
        .select("scope,password_hash,session_version,enabled,updated_at")
        .eq("scope", scope).maybeSingle();
      if (result.error) return { status: "error" };
      if (!result.data) return { status: "missing" };
      return { status: "configured", credential: result.data };
    },
    async registerAttempt(scope, identifierHash) {
      const result = await client.rpc("private_access_register_attempt", {
        requested_scope: scope,
        requested_identifier_hash: identifierHash
      });
      return !result.error && result.data === true;
    },
    async clearAttempts(scope, identifierHash) {
      await client.rpc("private_access_clear_attempts", { requested_scope: scope, requested_identifier_hash: identifierHash });
    }
  };
}
