"use client";

import { useState } from "react";
import clsx from "clsx";
import type { PricingLineRow, PricingSectionRow, MarkupSettingsRow } from "./types";
import { PricingScheduleTab } from "./PricingScheduleTab";
import { ProjectResourcesTab } from "./ProjectResourcesTab";

export interface ProjectResourceRow {
  id: string;
  resource_type: string;
  description: string;
  unit: string | null;
  rate_or_value: number;
  comments: string | null;
}

export interface ProjectAssemblyRow {
  id: string;
  name: string;
  unit: string | null;
  derived_rate: number | null;
}

export function EstimateExplorer({
  organizationId,
  projectId,
  sections,
  lines,
  markup,
  resources,
  assemblies,
}: {
  organizationId: string;
  projectId: string;
  sections: PricingSectionRow[];
  lines: PricingLineRow[];
  markup: MarkupSettingsRow | null;
  resources: ProjectResourceRow[];
  assemblies: ProjectAssemblyRow[];
}) {
  const [tab, setTab] = useState<"schedule" | "resources">("schedule");

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-hairline">
        {(["schedule", "resources"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "border-b-2 px-3 py-2 text-sm font-medium",
              tab === t ? "border-primary text-primary" : "border-transparent text-mid-gray hover:text-ink",
            )}
          >
            {t === "schedule" ? "Pricing Schedule" : "Project Resources"}
          </button>
        ))}
      </div>

      {tab === "schedule" ? (
        <PricingScheduleTab
          organizationId={organizationId}
          projectId={projectId}
          sections={sections}
          lines={lines}
          markup={markup}
        />
      ) : (
        <ProjectResourcesTab projectId={projectId} resources={resources} assemblies={assemblies} />
      )}
    </div>
  );
}
