import type { Metadata } from "next";
import { AdminMfaForm } from "@/components/admin/AdminMfaForm";
import { createSessionAuthClient, requireAdminForMfa } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin MFA | Come Thru",
};

export default async function AdminMfaPage() {
  await requireAdminForMfa();

  const { supabase } = await createSessionAuthClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const initialFactorId =
    data?.totp.find((factor) => factor.status === "verified")?.id ?? null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070605] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-10">
        <div className="relative overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.34),transparent_36%),radial-gradient(circle_at_78%_76%,rgba(215,199,173,0.18),transparent_32%),#0d0908] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#b5482f]/26 blur-3xl" />
          <div className="relative">
            <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
              Two-factor auth
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em]">
              Verify access
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#f3eadb]/68">
              Admin actions require an authenticator app challenge for every
              elevated session. Create a TOTP factor, scan the QR code with your
              authenticator app, then verify the first code.
            </p>
            <AdminMfaForm initialFactorId={initialFactorId} />
          </div>
        </div>
      </section>
    </main>
  );
}
