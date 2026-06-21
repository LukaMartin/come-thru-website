"use client";

import { useId, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import type { AdminMutationState } from "@/lib/admin-events-actions";
import type { Database } from "@/lib/database.types";
import { AdminTicketTypeForm } from "@/components/AdminTicketTypeForm";

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
      className={`border bg-black/20 transition-colors duration-300 ${
        isOpen ? "border-[#f3eadb]/28 bg-black/30" : "border-[#f3eadb]/14"
      }`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-4 p-5 text-left outline-none transition-colors duration-300 hover:bg-[#f3eadb]/[0.035] focus-visible:bg-[#f3eadb]/4.5 md:p-6"
      >
        <div>
          <h3 className="text-xl font-black uppercase tracking-[-0.03em]">
            {ticketType.name}
          </h3>
          <p className="mt-1 text-sm text-[#f3eadb]/58">
            {ticketType.active ? "Active" : "Inactive"} / capacity{" "}
            {ticketType.capacity}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#f3eadb]/14 p-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f3eadb]/64 transition duration-300 hover:border-[#f3eadb]/28 hover:text-[#f8f0e3]">
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
          <div className="border-t border-[#f3eadb]/10 p-5 md:p-6">
            <AdminTicketTypeForm action={action} ticketType={ticketType} />
          </div>
        </div>
      </div>
    </article>
  );
}
