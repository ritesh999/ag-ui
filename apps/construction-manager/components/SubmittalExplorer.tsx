"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { FileStack } from "lucide-react";
import { Submittal, SubmittalStatus } from "@/lib/types";
import { Badge } from "./Badge";
import { EmptyState } from "./SectionCard";
import { submittalStatusTone, labelize } from "@/lib/status";
import { formatDate, daysUntil } from "@/lib/format";

const statusOptions: (SubmittalStatus | "all")[] = [
  "all",
  "draft",
  "in-review",
  "approved",
  "approved-as-noted",
  "revise-resubmit",
  "rejected",
];

export function SubmittalExplorer({ submittals }: { submittals: Submittal[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SubmittalStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(submittals[0]?.id ?? null);

  const filtered = useMemo(() => {
    return submittals.filter((s) => {
      const matchesStatus = status === "all" || s.status === status;
      const matchesQuery =
        query.trim() === "" ||
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.number.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [submittals, query, status]);

  const selected = submittals.find((s) => s.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search submittals..."
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
        <span className="ml-auto text-xs text-gray-500">{filtered.length} of {submittals.length} submittals</span>
      </div>

      {submittals.length === 0 ? (
        <EmptyState message="No submittals have been logged on this project yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.15fr]">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
            <ul className="max-h-[640px] divide-y divide-gray-100 overflow-y-auto">
              {filtered.map((s) => {
                const days = daysUntil(s.dueDate);
                const isOverdue = days < 0 && !["approved", "approved-as-noted", "rejected"].includes(s.status);
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className={clsx(
                        "w-full px-4 py-3 text-left transition-colors",
                        selected?.id === s.id ? "bg-brand-50" : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{s.number}</span>
                        <Badge label={labelize(s.status)} tone={submittalStatusTone[s.status]} />
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-gray-700">{s.title}</p>
                      <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
                        <span>{s.type}</span>
                        <span className={isOverdue ? "font-medium text-red-600" : ""}>
                          {isOverdue ? `${Math.abs(days)}d overdue` : `due ${formatDate(s.dueDate)}`}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-gray-400">No submittals match your filters.</li>
              ) : null}
            </ul>
          </div>

          {selected ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{selected.number} &middot; Rev {selected.revision}</p>
                  <h3 className="mt-1 text-base font-semibold text-gray-900">{selected.title}</h3>
                </div>
                <Badge label={labelize(selected.status)} tone={submittalStatusTone[selected.status]} />
              </div>

              <div className="mb-5 flex flex-wrap gap-2">
                <Badge label={selected.type} tone="gray" />
                <Badge label={`Spec ${selected.specSection}`} tone="gray" />
              </div>

              <div className="mb-5 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-4">
                <Meta label="Submitted By" value={selected.submittedBy} />
                <Meta label="Reviewer" value={selected.reviewer} />
                <Meta label="Submitted" value={formatDate(selected.submittedDate)} />
                <Meta label="Due" value={formatDate(selected.dueDate)} />
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                <FileStack className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {selected.status === "in-review" || selected.status === "draft"
                    ? `Awaiting review from ${selected.reviewer}.`
                    : selected.status === "revise-resubmit"
                    ? `${selected.reviewer} requested revisions — resubmit with corrections noted.`
                    : selected.status === "rejected"
                    ? `Rejected by ${selected.reviewer}. See project documents for review comments.`
                    : `Reviewed and closed out by ${selected.reviewer}.`}
                </p>
              </div>
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
