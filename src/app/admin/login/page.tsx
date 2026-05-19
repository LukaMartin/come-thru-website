import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login | Come Thru",
};

const errorMessages: Record<string, string> = {
  "missing-session-cookie": "Admin session cookies were not sent.",
  "missing-access-token-cookie": "Admin access token cookie was not sent.",
  "missing-refresh-token-cookie": "Admin refresh token cookie was not sent.",
  "supabase-set-session-failed": "Supabase rejected the stored admin session.",
  "supabase-get-user-failed": "Supabase could not load the admin user.",
  "not-authorized": "This account is not authorized for admin access.",
};

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error ? errorMessages[error] : null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-10">
        <div className="relative overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.34),transparent_36%),radial-gradient(circle_at_78%_76%,rgba(215,199,173,0.18),transparent_32%),#0d0908] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#b5482f]/26 blur-3xl" />
          <div className="relative">
            <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
              Admin
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em]">
              Sign in
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#f3eadb]/68">
              Use your approved admin account. MFA is required before event
              management unlocks.
            </p>
            {errorMessage ? (
              <p className="mt-4 border border-red-300/25 bg-red-950/30 p-3 text-sm text-red-200">
                {errorMessage}
                <span className="mt-2 block font-mono text-xs text-red-100/70">
                  {error}
                </span>
              </p>
            ) : null}
            <AdminLoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
