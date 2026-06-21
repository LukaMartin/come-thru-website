"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { IconType } from "react-icons";
import { FiCalendar, FiMusic, FiShoppingBag, FiTag } from "react-icons/fi";
import {
  AdminEventOrders,
  type AdminEventOrder,
} from "@/components/AdminEventOrders";

type DashboardTabId = "details" | "artists" | "tickets" | "orders";

type AdminEventDashboardProps = {
  status: string;
  isCurrent: boolean;
  slug: string;
  ticketTypeCount: number;
  artistCount: number;
  orders: AdminEventOrder[];
  publishAction?: ReactNode;
  eventDetails: ReactNode;
  artists: ReactNode;
  ticketTypes: ReactNode;
};

type DashboardTab = {
  id: DashboardTabId;
  label: string;
  eyebrow: string;
  description: string;
  icon: IconType;
  count?: number;
};

const tabs: DashboardTab[] = [
  {
    id: "details",
    label: "Event details",
    eyebrow: "Core setup",
    description: "Name, venue, date, status and hero image.",
    icon: FiCalendar,
  },
  {
    id: "tickets",
    label: "Ticket types",
    eyebrow: "Tickets",
    description: "Pricing, capacity, sale windows and new ticket types.",
    icon: FiTag,
  },
  {
    id: "artists",
    label: "Artists",
    eyebrow: "Lineup",
    description: "Manage the artists shown on the ticket page.",
    icon: FiMusic,
  },
  {
    id: "orders",
    label: "Orders",
    eyebrow: "Sales",
    description: "Review orders, ticket quantities, status and refunds.",
    icon: FiShoppingBag,
  },
];

export function AdminEventDashboard({
  status,
  isCurrent,
  slug,
  ticketTypeCount,
  artistCount,
  orders,
  publishAction,
  eventDetails,
  artists,
  ticketTypes,
}: AdminEventDashboardProps) {
  const [activeTabId, setActiveTabId] = useState<DashboardTabId>("details");
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  const panelByTab: Record<DashboardTabId, ReactNode> = {
    details: eventDetails,
    artists,
    tickets: ticketTypes,
    orders: <AdminEventOrders orders={orders} />,
  };

  const countByTab: Partial<Record<DashboardTabId, number>> = {
    artists: artistCount,
    tickets: ticketTypeCount,
    orders: orders.length,
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
      <aside className="border border-[#f3eadb]/12 bg-[radial-gradient(circle_at_18%_0%,rgba(181,72,47,0.08),transparent_34%),linear-gradient(180deg,rgba(14,12,10,0.98),rgba(8,7,6,0.98))] p-4 shadow-2xl shadow-black/35 lg:sticky lg:top-6">
        <div className="grid grid-cols-3 gap-2 border-b border-[#f3eadb]/10 pb-4 text-center lg:grid-cols-1 lg:text-left">
          <div className="border border-[#f3eadb]/10 bg-[#f3eadb]/[0.035] p-3">
            <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
              Status
            </p>
            <p className="mt-1 truncate text-sm font-semibold uppercase text-[#f8f0e3]/92">
              {status}
            </p>
          </div>
          <div className="border border-[#f3eadb]/10 bg-[#f3eadb]/[0.035] p-3">
            <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
              Current
            </p>
            <p className="mt-1 text-sm font-semibold uppercase text-[#f8f0e3]/92">
              {isCurrent ? "Yes" : "No"}
            </p>
          </div>
          <div className="border border-[#f3eadb]/10 bg-[#f3eadb]/[0.035] p-3">
            <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
              Slug
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[#f8f0e3]/92">
              {slug}
            </p>
          </div>
        </div>

        {publishAction ? (
          <div className="mt-4 border border-[#f3eadb]/10 bg-[#f3eadb]/[0.035] p-3">
            <p className="mb-3 text-[0.6rem] uppercase tracking-[0.24em] text-[#d7c7ad]/70">
              Publishing
            </p>
            {publishAction}
          </div>
        ) : null}

        {!isCurrent && <div className="mt-4 border-t border-[#f3eadb]/10" />}

        <nav
          aria-label="Event admin sections"
          className="mt-4 flex gap-3 overflow-x-auto lg:grid lg:overflow-visible"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;
            const count = countByTab[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={[
                  "group relative min-w-64 overflow-hidden border p-4 text-left transition duration-300 lg:min-w-0",
                  isActive
                    ? "border-[#d7c7ad]/30 bg-[linear-gradient(135deg,rgba(215,199,173,0.08),rgba(181,72,47,0.045)_48%,rgba(8,7,6,0.94))] text-[#f8f0e3] shadow-lg shadow-black/20"
                    : "border-[#f3eadb]/10 bg-black/20 text-[#f8f0e3] hover:border-[#d7c7ad]/28 hover:bg-[#f3eadb]/5.5",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive ? (
                  <span className="absolute inset-y-0 left-0 w-1 bg-[#d7c7ad]" />
                ) : null}
                <span className="flex items-start gap-3">
                  <span
                    className={[
                      "grid size-10 shrink-0 place-items-center border",
                      isActive
                        ? "border-[#d7c7ad]/28 bg-[#f8f0e3]/12 text-[#f8f0e3]"
                        : "border-[#f3eadb]/12 bg-[#f3eadb]/4.5 text-[#d7c7ad]/78 group-hover:text-[#f8f0e3]",
                    ].join(" ")}
                  >
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={[
                        "block text-[0.62rem] font-semibold uppercase tracking-[0.24em]",
                        isActive ? "text-[#d7c7ad]" : "text-[#d7c7ad]/70",
                      ].join(" ")}
                    >
                      {tab.eyebrow}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-sm font-black uppercase tracking-[-0.02em]">
                      {tab.label}
                      {typeof count === "number" ? (
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[0.64rem] tracking-normal",
                            isActive
                              ? "bg-[#f8f0e3]/12 text-[#f3eadb]/72"
                              : "bg-[#f3eadb]/10 text-[#f3eadb]/58",
                          ].join(" ")}
                        >
                          {count}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={[
                        "mt-2 block text-xs leading-5",
                        isActive ? "text-[#f3eadb]/68" : "text-[#f3eadb]/48",
                      ].join(" ")}
                    >
                      {tab.description}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 border border-[#f3eadb]/12 bg-[linear-gradient(180deg,rgba(11,10,8,0.99),rgba(8,7,6,0.99))] p-5 shadow-2xl shadow-black/35 md:p-7">
        <div className="mb-6 border-b border-[#f3eadb]/10 pb-5">
          <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
            {activeTab.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-tighter text-[#f8f0e3]">
            {activeTab.label}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f3eadb]/62">
            {activeTab.description}
          </p>
        </div>

        {panelByTab[activeTabId]}
      </div>
    </section>
  );
}
