"use client";

import { useId, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import type { AdminMutationState } from "@/lib/admin-events-actions";
import type { Database } from "@/lib/database.types";
import { AdminTicketTypeForm } from "@/components/admin/AdminTicketTypeForm";

type TicketTypeRow =
  Database["public"]["Tables"]["ticketing_ticket_types"]["Row"];

type AdminTicketTypeCardProps = {
  action: (
    state: AdminMutationState,
    formData: FormData,
  ) => Promise<AdminMutationState>;
  ticketType: TicketTypeRow;
};

export function AdminTicketTypeCard({
  action,
  ticketType,
}: AdminTicketTypeCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <article
      className={`rounded-2xl border transition-colors duration-300 ${
        isOpen
          ? "border-admin-border-strong bg-admin-surface-elevated"
          : "border-admin-border bg-black/10"
      }`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-4 p-5 text-left outline-none transition-colors duration-300 hover:bg-admin-surface-elevated focus-visible:bg-admin-surface-elevated rounded-2xl"
      >
        <div>
          <h3 className="text-base font-semibold tracking-[-0.03em] text-admin-text">
            {ticketType.name}
          </h3>
          <p className="mt-1 text-sm text-admin-muted">
            {ticketType.active ? "Active" : "Inactive"} / capacity{" "}
            {ticketType.capacity}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-admin-border p-2 text-xs font-medium text-admin-muted transition duration-300 hover:border-admin-border-strong hover:text-admin-text">
            <FiChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform duration-300 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </div>
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-admin-border p-5">
            <AdminTicketTypeForm action={action} ticketType={ticketType} />
          </div>
        </div>
      </div>
    </article>
  );
}
