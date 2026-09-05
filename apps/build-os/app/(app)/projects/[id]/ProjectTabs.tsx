"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Project Overview" },
    { href: `${base}/subcontractors`, label: "Subcontractors" },
    { href: `${base}/estimate`, label: "Estimate" },
  ];

  return (
    <div className="mb-6 flex gap-1 border-b border-hairline">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              "border-b-2 px-3 py-2 text-sm font-medium",
              active ? "border-primary text-primary" : "border-transparent text-mid-gray hover:text-ink"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
