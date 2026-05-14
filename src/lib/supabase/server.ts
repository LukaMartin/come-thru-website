import { createClient } from "@supabase/supabase-js";
import { assertServerEnv, requireEnv } from "@/lib/env";

export function createServiceClient() {
  assertServerEnv();

  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
