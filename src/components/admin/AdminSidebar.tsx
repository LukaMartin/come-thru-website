"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FiCalendar,
  FiImage,
  FiLifeBuoy,
  FiLogOut,
  FiPlusCircle,
} from "react-icons/fi";
import { logoutAdminAction } from "@/lib/auth-actions";

type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  icon: IconType;
  match: (pathname: string) => boolean;
};

const navItems: AdminNavItem[] = [
  {
    href: "/admin/events",
    label: "Events",
    description: "Manage live and draft events",
    icon: FiCalendar,
    match: (pathname) =>
      pathname === "/admin/events" ||
      (pathname.startsWith("/admin/events/") &&
        pathname !== "/admin/events/new"),
  },
  {
    href: "/admin/events/new",
    label: "New event",
    description: "Create a draft event",
    icon: FiPlusCircle,
    match: (pathname) => pathname === "/admin/events/new",
  },
  {
    href: "/admin/support",
    label: "Support",
    description: "Reply to customer threads",
    icon: FiLifeBuoy,
    match: (pathname) => pathname.startsWith("/admin/support"),
  },
  {
    href: "/admin/gallery",
    label: "Gallery",
    description: "Curate homepage imagery",
    icon: FiImage,
    match: (pathname) => pathname.startsWith("/admin/gallery"),
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-72 shrink-0 flex-col border-r border-admin-border bg-admin-sidebar px-4 py-5">
      <div className="border-b border-admin-border px-2 pb-[67px] pt-[9px]">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-admin-subtle">
          Come Thru
        </p>
        <h1 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-admin-text">
          Admin Console
        </h1>
      </div>

      <nav aria-label="Admin navigation" className="mt-5 grid gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.match(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "group grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-xl border px-3 py-3 transition",
                isActive
                  ? "border-admin-border-strong bg-admin-surface-elevated text-admin-text shadow-sm shadow-black/20"
                  : "border-transparent text-admin-muted hover:border-admin-border hover:bg-admin-surface hover:text-admin-text",
              ].join(" ")}
            >
              <span
                className={[
                  "grid size-10 place-items-center rounded-lg border transition",
                  isActive
                    ? "border-admin-border-strong bg-admin-primary text-admin-primary-text"
                    : "border-admin-border bg-black/20 text-admin-subtle group-hover:text-admin-accent",
                ].join(" ")}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="mt-0.5 block truncate text-xs text-admin-subtle">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-admin-border pt-4">
        <form action={logoutAdminAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left text-sm font-medium text-admin-muted transition hover:border-red-400/20 hover:bg-red-400/10 hover:text-red-100"
          >
            <span className="grid size-10 place-items-center rounded-lg border border-admin-border bg-black/20 text-admin-subtle">
              <FiLogOut aria-hidden className="size-4" />
            </span>
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
