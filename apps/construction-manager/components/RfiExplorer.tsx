"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { AlertCircle, CalendarClock, CircleDollarSign, Timer } from "lucide-react";
import { Rfi, RfiStatus } from "@/lib/types";
import { Badge } from "./Badge";
import { EmptyState } from "./SectionCard";
import { rfiStatusTone, priorityTone, labelize } from "@/lib/status";
import { formatDate, daysUntil } from "@/lib/format";

const statusOptions: (RfiStatus | "all")[] = ["all", "open", "pending-response", "overdue", "closed"];

export function RfiExplorer({ rfis }: { rfis: Rfi[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RfiStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(rfis[0]?.id ?? null);

  const filtered = useMemo(() => {
    return rfis.filter((r) => {
      const matchesStatus = status === "all" || r.status === status;
      const matchesQuery =
        query.trim() === "" ||
        r.subject.toLowerCase().includes(query.toLowerCase()) ||
        r.number.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [rfis, query, status]);

  const selected = rfis.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search RFIs..."
          className="w-64 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                status === s ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {s === "all" ? "All" : labelize(s)}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-500">{filtered.length} of {rfis.length} RFIs</span>
      </div>

      {rfis.length === 0 ? (
        <EmptyState message="No RFIs have been submitted on this project yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.15fr]">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
            <ul className="max-h-[640px] divide-y divide-gray-100 overflow-y-auto">
              {filtered.map((r) => {
                const days = daysUntil(r.dueDate);
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelectedId(r.id)}
                      className={clsx(
                        "w-full px-4 py-3 text-left transition-colors",
                        selected?.id === r.id ? "bg-brand-50" : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{r.number}</span>
                        <Badge label={labelize(r.status)} tone={rfiStatusTone[r.status]} />
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-gray-700">{r.subject}</p>
                      <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
                        <span>{r.assignedTo}</span>
                        <span className={days < 0 && r.status !== "closed" ? "font-medium text-red-600" : ""}>
                          {r.status === "closed" ? formatDate(r.dueDate) : days < 0 ? `${Math.abs(days)}d overdue` : `due ${formatDate(r.dueDate)}`}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-gray-400">No RFIs match your filters.</li>
              ) : null}
            </ul>
          </div>

          {selected ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{selected.number}</p>
                  <h3 className="mt-1 text-base font-semibold text-gray-900">{selected.subject}</h3>
                </div>
                <Badge label={labelize(selected.status)} tone={rfiStatusTone[selected.status]} />
              </div>

              <div className="mb-5 flex flex-wrap gap-2">
                <Badge label={`${labelize(selected.priority)} priority`} tone={priorityTone[selected.priority]} />
                {selected.specSection ? <Badge label={`Spec ${selected.specSection}`} tone="gray" /> : null}
                {selected.costImpact ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                    <CircleDollarSign className="h-3 w-3" /> Cost Impact
                  </span>
                ) : null}
                {selected.scheduleImpact ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                    <Timer className="h-3 w-3" /> Schedule Impact
                  </span>
                ) : null}
              </div>

              <div className="mb-5 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-4">
                <Meta label="Submitted By" value={selected.submittedBy} />
                <Meta label="Assigned To" value={selected.assignedTo} />
                <Meta label="Created" value={formatDate(selected.createdAt)} />
                <Meta label="Due" value={formatDate(selected.dueDate)} />
              </div>

              <div className="mb-5">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Question</p>
                <p className="text-sm leading-relaxed text-gray-800">{selected.question}</p>
              </div>

              {selected.answer ? (
                <div className="mb-2 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-green-700">
                    <AlertCircle className="h-3.5 w-3.5" /> Response
                  </p>
                  <p className="text-sm leading-relaxed text-green-900">{selected.answer}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  <CalendarClock className="h-4 w-4" />
                  Awaiting response from {selected.assignedTo}.
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 font-medium text-gray-900">{value}</p>
    </div>
  );
}
