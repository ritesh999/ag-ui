"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CloudRain, Sun, Cloud, Wind, Snowflake, Users, ShieldAlert, Plus } from "lucide-react";
import { DailyLog } from "@/lib/types";
import { EmptyState } from "./SectionCard";
import { formatDate } from "@/lib/format";
import { NewDailyLogForm } from "./forms/NewDailyLogForm";

const conditionIcon: Record<DailyLog["conditions"], typeof Sun> = {
  clear: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: Snowflake,
  wind: Wind,
};

export function DailyLogExplorer({ projectId, logs }: { projectId: string; logs: DailyLog[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(logs[0]?.id ?? null);
  const [formOpen, setFormOpen] = useState(false);
  const selected = logs.find((l) => l.id === selectedId) ?? logs[0] ?? null;

  // Jump to the newest log when one is added at the top of the (date-sorted) list.
  useEffect(() => {
    setSelectedId(logs[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs[0]?.id]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          New Daily Log
        </button>
      </div>

      {logs.length === 0 ? (
        <EmptyState message="No daily logs have been recorded on this project yet." />
      ) : (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        <ul className="max-h-[640px] divide-y divide-gray-100 overflow-y-auto">
          {logs.map((log) => {
            const Icon = conditionIcon[log.conditions];
            return (
              <li key={log.id}>
                <button
                  onClick={() => setSelectedId(log.id)}
                  className={clsx(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    selected?.id === log.id ? "bg-brand-50" : "hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{formatDate(log.date)}</p>
                    <p className="truncate text-xs text-gray-500">{log.crewCount} crew &middot; {log.tempHighF}°/{log.tempLowF}°F</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selected ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-card">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{formatDate(selected.date)}</h3>
              <p className="mt-1 text-sm text-gray-500">Logged by {selected.author}</p>
            </div>
            {selected.safetyIncidents > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                <ShieldAlert className="h-3.5 w-3.5" />
                {selected.safetyIncidents} safety incident{selected.safetyIncidents > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                <ShieldAlert className="h-3.5 w-3.5" />
                No safety incidents
              </span>
            )}
          </div>

          <div className="mb-5 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-4">
            <Meta label="Weather" value={selected.weather} />
            <Meta label="High / Low" value={`${selected.tempHighF}°F / ${selected.tempLowF}°F`} />
            <Meta label="Crew on Site" value={String(selected.crewCount)} />
            <Meta label="Visitors" value={String(selected.visitors.length)} />
          </div>

          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Work Performed</p>
            <ul className="space-y-1.5">
              {selected.workPerformed.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  {w}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-5">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Delays</p>
            <p className="text-sm text-gray-700">{selected.delays}</p>
          </div>

          {selected.visitors.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Users className="h-3.5 w-3.5" /> Visitors on Site
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                {selected.visitors.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
      )}

      <NewDailyLogForm projectId={projectId} open={formOpen} onClose={() => setFormOpen(false)} />
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
