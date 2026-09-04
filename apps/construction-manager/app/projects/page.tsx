"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { PageHeader } from "@/components/SectionCard";
import { Badge } from "@/components/Badge";
import { projects, openRfiCount, openPunchCount, projectTotals } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";
import { projectStatusTone, labelize } from "@/lib/status";
import { ProjectStatus } from "@/lib/types";

const statusFilters: (ProjectStatus | "all")[] = ["all", "active", "on-hold", "closeout", "complete"];

export default function ProjectsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesStatus = status === "all" || p.status === status;
      const matchesQuery =
        query.trim() === "" ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.client.toLowerCase().includes(query.toLowerCase()) ||
        p.jobNumber.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [query, status]);

  return (
    <div>
      <PageHeader
        title="Projects"
        description={`${projects.length} projects across the portfolio`}
        action={
          <button className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" />
            New Project
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, client, or job #"
          className="w-72 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex gap-1.5">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                status === s
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "All" : labelize(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => {
          const totals = projectTotals(p.id);
          const used = totals.budgeted > 0 ? Math.round((totals.spent / totals.budgeted) * 100) : 0;
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-card transition-shadow hover:shadow-md"
            >
              <div className="mb-3 h-1.5 w-full rounded-full" style={{ backgroundColor: `${p.accentColor}22` }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${p.percentComplete}%`, backgroundColor: p.accentColor }}
                />
              </div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700">{p.name}</h3>
                <Badge label={labelize(p.status)} tone={projectStatusTone[p.status]} />
              </div>
              <p className="mb-3 flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {p.address}, {p.city}
              </p>
              <p className="mb-4 text-xs text-gray-500">{p.jobNumber} &middot; {p.client}</p>

              <div className="mt-auto grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs">
                <div>
                  <p className="text-gray-400">Contract Value</p>
                  <p className="font-medium text-gray-900">{formatCurrency(p.contractValue, { compact: true })}</p>
                </div>
                <div>
                  <p className="text-gray-400">Budget Used</p>
                  <p className="font-medium text-gray-900">{used}%</p>
                </div>
                <div>
                  <p className="text-gray-400">Target Completion</p>
                  <p className="font-medium text-gray-900">{formatDate(p.targetCompletion)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Open Items</p>
                  <p className="font-medium text-gray-900">
                    {openRfiCount(p.id)} RFIs &middot; {openPunchCount(p.id)} punch
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-gray-500">No projects match your search.</p>
        ) : null}
      </div>
    </div>
  );
}
