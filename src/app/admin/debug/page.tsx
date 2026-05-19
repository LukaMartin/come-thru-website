import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import {
  adminAccessTokenCookie,
  adminRefreshTokenCookie,
} from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Debug | Come Thru",
};

export default async function AdminDebugPage() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const hasAccessToken = Boolean(cookieStore.get(adminAccessTokenCookie)?.value);
  const hasRefreshToken = Boolean(
    cookieStore.get(adminRefreshTokenCookie)?.value,
  );
  const hasDebugCookie = Boolean(cookieStore.get("admin_debug_cookie")?.value);

  return (
    <main className="min-h-dvh bg-[#070605] p-6 text-[#f8f0e3]">
      <section className="mx-auto grid max-w-2xl gap-4 border border-[#f3eadb]/14 bg-[#080706] p-5">
        <h1 className="text-2xl font-black uppercase tracking-[-0.04em]">
          Admin cookie debug
        </h1>
        <div className="grid gap-2 font-mono text-sm">
          <p>access cookie: {hasAccessToken ? "present" : "missing"}</p>
          <p>refresh cookie: {hasRefreshToken ? "present" : "missing"}</p>
          <p>debug cookie: {hasDebugCookie ? "present" : "missing"}</p>
          <p>host: {headerStore.get("host") ?? "unknown"}</p>
          <p>protocol: {headerStore.get("x-forwarded-proto") ?? "unknown"}</p>
          <p>path: /admin/debug</p>
        </div>
        <Link
          href="/admin/debug/set-cookie"
          className="w-fit rounded-full border border-[#f3eadb]/18 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f8f0e3]"
        >
          Set debug cookie
        </Link>
      </section>
    </main>
  );
}
