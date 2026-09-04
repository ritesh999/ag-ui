"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Project } from "@/lib/types";
import { Badge } from "./Badge";
import { projectStatusTone, labelize } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";

const tabs = [
  { href: "", label: "Overview" },
  { href: "/rfis", label: "RFIs" },
  { href: "/submittals", label: "Submittals" },
  { href: "/daily-logs", label: "Daily Logs" },
  { href: "/tasks", label: "Tasks" },
  { href: "/documents", label: "Documents" },
  { href: "/budget", label: "Budget" },
];

export function ProjectHeader({ project }: { project: Project }) {
  const pathname = usePathname();
  const base = `/projects/${project.id}`;

  return (
    <div className="mb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.accentColor }}
            />
            <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
            <Badge label={labelize(project.status)} tone={projectStatusTone[project.status]} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {project.jobNumber} &middot; {project.client} &middot; {project.address}, {project.city}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Contract Value</p>
            <p className="font-medium text-gray-900">{formatCurrency(project.contractValue, { compact: true })}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Complete</p>
            <p className="font-medium text-gray-900">{project.percentComplete}%</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Target Completion</p>
            <p className="font-medium text-gray-900">{formatDate(project.targetCompletion)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Superintendent</p>
            <p className="font-medium text-gray-900">{project.superintendent}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-5 overflow-x-auto">
          {tabs.map((tab) => {
            const href = `${base}${tab.href}`;
            const active = pathname === href;
            return (
              <Link
                key={tab.href}
                href={href}
                className={clsx(
                  "whitespace-nowrap border-b-2 px-1 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
