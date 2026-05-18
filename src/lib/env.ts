const requiredServerEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_AUTH_ANON_KEY",
  "STRIPE_SECRET_KEY",
] as const;

const requiredAuthEnv = ["SUPABASE_URL", "SUPABASE_AUTH_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_AUTH_ANON_KEY,
  );
}

export function assertServerEnv() {
  const missing = requiredServerEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

export function assertAuthEnv() {
  const missing = requiredAuthEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

export function requireEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }

  return value;
}
