import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div
      data-admin-theme
      className="min-h-dvh min-w-[1180px] bg-admin-bg text-admin-text"
    >
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
