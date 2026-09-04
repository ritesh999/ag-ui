"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { FileStack, Plus } from "lucide-react";
import { Submittal, SubmittalStatus } from "@/lib/types";
import { Badge } from "./Badge";
import { EmptyState } from "./SectionCard";
import { submittalStatusTone, labelize } from "@/lib/status";
import { formatDate, daysUntil } from "@/lib/format";
import { useAppData } from "@/lib/store";
import { NewSubmittalForm } from "./forms/NewSubmittalForm";

const statusOptions: (SubmittalStatus | "all")[] = [
  "all",
  "draft",
  "in-review",
  "approved",
  "approved-as-noted",
  "revise-resubmit",
  "rejected",
];

export function SubmittalExplorer({ projectId, submittals }: { projectId: string; submittals: Submittal[] }) {
  const { updateSubmittalStatus } = useAppData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SubmittalStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(submittals[0]?.id ?? null);
  const [formOpen, setFormOpen] = useState(false);

  // Jump to a newly created submittal (added to the front of the list).
  useEffect(() => {
    setSelectedId(submittals[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittals[0]?.id]);

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
        <span className="text-xs text-gray-500">{filtered.length} of {submittals.length} submittals</span>
        <button
          onClick={() => setFormOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          New Submittal
        </button>
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

              <div className="mb-4 flex items-start gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
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

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Review Decision</p>
                <div className="flex flex-wrap gap-2">
                  {selected.status === "draft" ? (
                    <button
                      onClick={() => updateSubmittalStatus(selected.id, "in-review")}
                      className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Submit for Review
                    </button>
                  ) : null}
                  {selected.status === "in-review" || selected.status === "revise-resubmit" ? (
                    <>
                      <button
                        onClick={() => updateSubmittalStatus(selected.id, "approved")}
                        className="rounded-lg bg-green-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateSubmittalStatus(selected.id, "approved-as-noted")}
                        className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Approve as Noted
                      </button>
                      <button
                        onClick={() => updateSubmittalStatus(selected.id, "revise-resubmit")}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
                      >
                        Revise &amp; Resubmit
                      </button>
                      <button
                        onClick={() => updateSubmittalStatus(selected.id, "rejected")}
                        className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  {["approved", "approved-as-noted", "rejected"].includes(selected.status) ? (
                    <button
                      onClick={() => updateSubmittalStatus(selected.id, "in-review")}
                      className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Reopen for Review
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <NewSubmittalForm projectId={projectId} open={formOpen} onClose={() => setFormOpen(false)} />
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
