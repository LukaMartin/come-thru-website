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
  const overviewItems = [
    { label: "Status", value: status, valueClassName: "capitalize" },
    { label: "Current", value: isCurrent ? "Yes" : "No" },
    { label: "Slug", value: slug },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-admin-border bg-admin-surface shadow-sm shadow-black/20 -mt-1">
      <div className="flex items-center justify-between gap-4 border-b border-admin-border bg-admin-surface-elevated/35 px-4 py-3.5">
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {overviewItems.map((item) => (
              <span
                key={item.label}
                className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-admin-border bg-black/15 px-2.5 py-1 text-xs"
              >
                <span className="text-admin-subtle">{item.label}</span>
                <span
                  className={[
                    "truncate font-medium text-admin-text",
                    item.valueClassName,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {item.value}
                </span>
              </span>
            ))}
          </div>
        </div>

        {publishAction ? (
          <div className="w-48 shrink-0">{publishAction}</div>
        ) : null}
      </div>

      <nav
        aria-label="Event admin sections"
        className="grid grid-cols-4 gap-1.5 border-b border-admin-border bg-black/10 py-3 px-4"
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
                "group relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition duration-200",
                isActive
                  ? "border-admin-border-strong bg-admin-surface-elevated text-admin-text shadow-sm shadow-black/20"
                  : "border-transparent text-admin-muted hover:border-admin-border hover:bg-admin-surface/70 hover:text-admin-text",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={[
                  "grid size-8 shrink-0 place-items-center rounded-lg border transition",
                  isActive
                    ? "border-admin-border-strong bg-admin-primary text-admin-primary-text"
                    : "border-admin-border bg-black/20 text-admin-subtle group-hover:text-admin-accent",
                ].join(" ")}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {tab.label}
                  </span>
                  {typeof count === "number" ? (
                    <span
                      className={[
                        "shrink-0 rounded-full px-2 py-0.5 text-xs",
                        isActive
                          ? "bg-black/20 text-admin-muted"
                          : "bg-admin-surface-elevated text-admin-subtle",
                      ].join(" ")}
                    >
                      {count}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-admin-subtle">
                  {tab.eyebrow}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-4">{panelByTab[activeTabId]}</div>
    </section>
  );
}
