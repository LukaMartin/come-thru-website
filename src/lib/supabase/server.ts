import { createClient } from "@supabase/supabase-js";
import { assertAuthEnv, assertServerEnv, requireEnv } from "@/lib/env";

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

export function createAuthClient() {
  assertAuthEnv();

  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_AUTH_ANON_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
