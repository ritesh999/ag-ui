import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  FileCheck2,
  ListChecks,
  Wallet,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import {
  projects,
  rfis,
  submittals,
  openRfiCount,
  overdueRfiCount,
  openPunchCount,
  pendingSubmittalCount,
  portfolioTotals,
  projectTotals,
} from "@/lib/data";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import { projectStatusTone, rfiStatusTone, priorityTone, labelize } from "@/lib/status";

export default function DashboardPage() {
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totals = portfolioTotals();
  const spentPct = totals.budgeted > 0 ? Math.round((totals.spent / totals.budgeted) * 100) : 0;

  const attentionRfis = rfis
    .filter((r) => r.status === "overdue" || r.status === "open")
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
    .slice(0, 5);

  const upcomingSubmittals = submittals
    .filter((s) => s.status === "in-review" || s.status === "draft")
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Portfolio Dashboard"
        description="Across all active jobs — Vantage Construction"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Active Projects" value={String(activeProjects)} icon={Building2} />
        <StatCard
          label="Open RFIs"
          value={String(openRfiCount())}
          icon={ClipboardList}
          tone="amber"
          hint={`${overdueRfiCount()} overdue`}
        />
        <StatCard
          label="Pending Submittals"
          value={String(pendingSubmittalCount())}
          icon={FileCheck2}
          tone="default"
        />
        <StatCard
          label="Open Punch Items"
          value={String(openPunchCount())}
          icon={ListChecks}
          tone="green"
        />
        <StatCard
          label="Portfolio Spend"
          value={`${spentPct}%`}
          icon={Wallet}
          hint={`${formatCurrency(totals.spent, { compact: true })} of ${formatCurrency(totals.budgeted, { compact: true })}`}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Needs Attention — RFIs" className="lg:col-span-2" padded={false}>
          <ul className="divide-y divide-gray-100">
            {attentionRfis.map((rfi) => {
              const project = projects.find((p) => p.id === rfi.projectId);
              const days = daysUntil(rfi.dueDate);
              return (
                <li key={rfi.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/projects/${rfi.projectId}/rfis`}
                        className="truncate text-sm font-medium text-gray-900 hover:text-brand-700"
                      >
                        {rfi.number} — {rfi.subject}
                      </Link>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {project?.name} &middot; Assigned to {rfi.assignedTo}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge label={rfi.priority} tone={priorityTone[rfi.priority]} />
                    <Badge label={labelize(rfi.status)} tone={rfiStatusTone[rfi.status]} />
                    <span className={`w-20 text-right text-xs ${days < 0 ? "font-medium text-red-600" : "text-gray-500"}`}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : `due in ${days}d`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <SectionCard title="Submittals Due" padded={false}>
          <ul className="divide-y divide-gray-100">
            {upcomingSubmittals.map((s) => {
              const project = projects.find((p) => p.id === s.projectId);
              return (
                <li key={s.id} className="px-5 py-3">
                  <Link
                    href={`/projects/${s.projectId}/submittals`}
                    className="block truncate text-sm font-medium text-gray-900 hover:text-brand-700"
                  >
                    {s.title}
                  </Link>
                  <p className="mt-0.5 flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate">{project?.name}</span>
                    <span className="shrink-0">{formatDate(s.dueDate)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Projects" padded={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Complete</th>
                <th className="px-5 py-3 font-medium">Contract Value</th>
                <th className="px-5 py-3 font-medium">Budget Used</th>
                <th className="px-5 py-3 font-medium">Open RFIs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p) => {
                const t = projectTotals(p.id);
                const used = t.budgeted > 0 ? Math.round((t.spent / t.budgeted) * 100) : 0;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/projects/${p.id}`} className="flex items-center gap-2.5 font-medium text-gray-900 hover:text-brand-700">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.accentColor }} />
                        {p.name}
                      </Link>
                      <p className="mt-0.5 pl-4 text-xs text-gray-500">{p.jobNumber} &middot; {p.city}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge label={labelize(p.status)} tone={projectStatusTone[p.status]} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.stage}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${p.percentComplete}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{p.percentComplete}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-900">{formatCurrency(p.contractValue, { compact: true })}</td>
                    <td className="px-5 py-3 text-gray-600">{used}%</td>
                    <td className="px-5 py-3">
                      <span className={openRfiCount(p.id) > 0 ? "font-medium text-gray-900" : "text-gray-400"}>
                        {openRfiCount(p.id)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
