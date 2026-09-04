"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ClipboardList, FileCheck2, ListChecks, Wallet } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { SectionCard } from "@/components/SectionCard";
import { Badge } from "@/components/Badge";
import {
  getProject,
  getRfisForProject,
  getSubmittalsForProject,
  getDailyLogsForProject,
  openRfiCount,
  openPunchCount,
  pendingSubmittalCount,
  projectTotals,
  team,
} from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";
import { rfiStatusTone, submittalStatusTone, labelize } from "@/lib/status";
import { useAppData } from "@/lib/store";

export default function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  const { rfis: allRfis, submittals: allSubmittals, dailyLogs: allLogs, punchItems } = useAppData();
  if (!project) notFound();

  const rfis = getRfisForProject(allRfis, project.id).slice(0, 4);
  const submittals = getSubmittalsForProject(allSubmittals, project.id).slice(0, 4);
  const logs = getDailyLogsForProject(allLogs, project.id).slice(0, 3);
  const totals = projectTotals(project.id);
  const usedPct = totals.budgeted > 0 ? Math.round((totals.spent / totals.budgeted) * 100) : 0;
  const committedPct = totals.budgeted > 0 ? Math.round((totals.committed / totals.budgeted) * 100) : 0;

  const projectTeam = team.filter((t) =>
    [project.projectManager, project.superintendent].includes(t.name) || t.company !== "Vantage Construction"
  ).slice(0, 6);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Open RFIs" value={String(openRfiCount(allRfis, project.id))} icon={ClipboardList} tone="amber" />
        <StatCard label="Pending Submittals" value={String(pendingSubmittalCount(allSubmittals, project.id))} icon={FileCheck2} />
        <StatCard label="Open Punch Items" value={String(openPunchCount(punchItems, project.id))} icon={ListChecks} tone="green" />
        <StatCard
          label="Budget Used"
          value={`${usedPct}%`}
          icon={Wallet}
          hint={formatCurrency(totals.spent, { compact: true })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Recent RFIs" action={<Link href={`/projects/${project.id}/rfis`} className="text-xs font-medium text-brand-600 hover:text-brand-700">View all</Link>} padded={false} className="lg:col-span-1">
          <ul className="divide-y divide-gray-100">
            {rfis.map((r) => (
              <li key={r.id} className="px-5 py-3">
                <p className="truncate text-sm font-medium text-gray-900">{r.number}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">{r.subject}</p>
                <div className="mt-1.5"><Badge label={labelize(r.status)} tone={rfiStatusTone[r.status]} /></div>
              </li>
            ))}
            {rfis.length === 0 ? <li className="px-5 py-6 text-center text-sm text-gray-400">No RFIs yet</li> : null}
          </ul>
        </SectionCard>

        <SectionCard title="Recent Submittals" action={<Link href={`/projects/${project.id}/submittals`} className="text-xs font-medium text-brand-600 hover:text-brand-700">View all</Link>} padded={false} className="lg:col-span-1">
          <ul className="divide-y divide-gray-100">
            {submittals.map((s) => (
              <li key={s.id} className="px-5 py-3">
                <p className="truncate text-sm font-medium text-gray-900">{s.number}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">{s.title}</p>
                <div className="mt-1.5"><Badge label={labelize(s.status)} tone={submittalStatusTone[s.status]} /></div>
              </li>
            ))}
            {submittals.length === 0 ? <li className="px-5 py-6 text-center text-sm text-gray-400">No submittals yet</li> : null}
          </ul>
        </SectionCard>

        <SectionCard title="Project Team" action={<Link href="/directory" className="text-xs font-medium text-brand-600 hover:text-brand-700">Directory</Link>} padded={false} className="lg:col-span-1">
          <ul className="divide-y divide-gray-100">
            <li className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {project.projectManager.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{project.projectManager}</p>
                <p className="text-xs text-gray-500">Project Manager</p>
              </div>
            </li>
            <li className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {project.superintendent.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{project.superintendent}</p>
                <p className="text-xs text-gray-500">Superintendent</p>
              </div>
            </li>
            {projectTeam.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="truncate text-xs text-gray-500">{t.role} &middot; {t.company}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Budget Snapshot" className="lg:col-span-1">
          <div className="space-y-3">
            <Row label="Contract / Budgeted" value={formatCurrency(totals.budgeted)} />
            <Row label="Committed" value={formatCurrency(totals.committed)} />
            <Row label="Spent to Date" value={formatCurrency(totals.spent)} />
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gray-300" style={{ width: `${Math.min(committedPct, 100)}%` }} />
              <div className="-mt-2 h-full rounded-full bg-brand-500" style={{ width: `${Math.min(usedPct, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500">{usedPct}% spent &middot; {committedPct}% committed</p>
            <Link href={`/projects/${project.id}/budget`} className="inline-block text-xs font-medium text-brand-600 hover:text-brand-700">
              View full budget →
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Latest Daily Logs"
          action={<Link href={`/projects/${project.id}/daily-logs`} className="text-xs font-medium text-brand-600 hover:text-brand-700">View all</Link>}
          padded={false}
          className="lg:col-span-2"
        >
          <ul className="divide-y divide-gray-100">
            {logs.map((log) => (
              <li key={log.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{formatDate(log.date)}</p>
                  <p className="text-xs text-gray-500">{log.weather} &middot; {log.tempHighF}°/{log.tempLowF}°F &middot; {log.crewCount} on site</p>
                </div>
                <p className="mt-1 truncate text-xs text-gray-500">{log.workPerformed.join(" • ")}</p>
              </li>
            ))}
            {logs.length === 0 ? <li className="px-5 py-6 text-center text-sm text-gray-400">No daily logs yet</li> : null}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
