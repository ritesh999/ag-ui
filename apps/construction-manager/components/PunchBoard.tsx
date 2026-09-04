"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { MapPin, Plus } from "lucide-react";
import { PunchItem, TaskStatus } from "@/lib/types";
import { Badge } from "./Badge";
import { EmptyState } from "./SectionCard";
import { priorityTone, labelize } from "@/lib/status";
import { formatDate, daysUntil } from "@/lib/format";
import { useAppData } from "@/lib/store";
import { NewPunchItemForm } from "./forms/NewPunchItemForm";

const columns: { status: TaskStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "in-progress", label: "In Progress" },
  { status: "in-review", label: "In Review" },
  { status: "closed", label: "Closed" },
];

export function PunchBoard({ projectId, items }: { projectId: string; items: PunchItem[] }) {
  const { updatePunchStatus } = useAppData();
  const trades = useMemo(() => Array.from(new Set(items.map((i) => i.trade))).sort(), [items]);
  const [trade, setTrade] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);

  const filtered = trade === "all" ? items : items.filter((i) => i.trade === trade);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setTrade("all")}
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            trade === "all" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          All Trades
        </button>
        {trades.map((t) => (
          <button
            key={t}
            onClick={() => setTrade(t)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              trade === t ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {t}
          </button>
        ))}
        <span className="text-xs text-gray-500">{filtered.length} of {items.length} items</span>
        <button
          onClick={() => setFormOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState message="No punch list items or tasks have been created on this project yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const colItems = filtered.filter((i) => i.status === col.status);
            return (
              <div key={col.status} className="rounded-xl bg-gray-100/70 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{col.label}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500 shadow-card">
                    {colItems.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {colItems.map((item) => {
                    const days = daysUntil(item.dueDate);
                    const isOverdue = days < 0 && item.status !== "closed";
                    return (
                      <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3.5 shadow-card">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug text-gray-900">{item.title}</p>
                          <Badge label={labelize(item.priority)} tone={priorityTone[item.priority]} />
                        </div>
                        <p className="mb-2.5 line-clamp-2 text-xs text-gray-500">{item.description}</p>
                        <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {item.location}
                        </p>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-gray-600">{item.assignedTo}</span>
                          <span className={isOverdue ? "font-medium text-red-600" : "text-gray-500"}>
                            {isOverdue ? `${Math.abs(days)}d overdue` : formatDate(item.dueDate)}
                          </span>
                        </div>
                        <select
                          value={item.status}
                          onChange={(e) => updatePunchStatus(item.id, e.target.value as TaskStatus)}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        >
                          {columns.map((c) => (
                            <option key={c.status} value={c.status}>
                              Move to: {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                  {colItems.length === 0 ? (
                    <p className="py-6 text-center text-xs text-gray-400">Nothing here</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewPunchItemForm projectId={projectId} open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
