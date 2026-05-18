import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login | Come Thru",
};

export default function AdminLoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050505] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-10">
        <div className="relative overflow-hidden border border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.2),transparent_36%),radial-gradient(circle_at_78%_76%,rgba(215,199,173,0.1),transparent_32%),#080706] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#b5482f]/16 blur-3xl" />
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
            <AdminLoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
