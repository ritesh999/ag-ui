"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { Badge, Card, Input } from "@/components/ui";
import { RESOURCE_TYPE_LABELS, type ResourceType } from "@/lib/resource-constants";
import { updateProjectResourceRate } from "./actions";
import type { ProjectResourceRow, ProjectAssemblyRow } from "./EstimateExplorer";
import { formatMoney } from "./format";

// Read-mostly: this is the project's own COPY of the org resource library
// (copied by value at project creation, 0012) — editing a rate here only
// affects this project's copy, never the org library it was copied from.
// No add/delete here; the copy is meant to mirror what create_project()
// snapshotted, not grow independently (that's what the org-level Resources
// page under /resources is for).
export function ProjectResourcesTab({
  projectId,
  resources,
  assemblies,
}: {
  projectId: string;
  resources: ProjectResourceRow[];
  assemblies: ProjectAssemblyRow[];
}) {
  const [subTab, setSubTab] = useState<"resources" | "assemblies">("resources");

  return (
    <div>
      <div className="mb-4 flex gap-1">
        {(["resources", "assemblies"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={clsx(
              "rounded-[var(--radius-buttons)] px-3 py-1.5 text-sm font-medium",
              subTab === t ? "bg-canvas text-ink" : "text-mid-gray hover:text-ink",
            )}
          >
            {t === "resources" ? "Resources" : "Assemblies"}
          </button>
        ))}
      </div>

      {subTab === "resources" ? (
        resources.length === 0 ? (
          <Card className="py-12 text-center text-sm text-mid-gray">
            No resources were copied into this project.
          </Card>
        ) : (
          <Card padded={false} className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-mid-gray">
                <tr>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2">Rate / Value</th>
                  <th className="px-4 py-2">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {resources.map((r) => (
                  <ResourceRateRow key={r.id} resource={r} projectId={projectId} />
                ))}
              </tbody>
            </table>
          </Card>
        )
      ) : assemblies.length === 0 ? (
        <Card className="py-12 text-center text-sm text-mid-gray">
          No assemblies were copied into this project.
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-mid-gray">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Unit</th>
                <th className="px-4 py-2">Derived Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {assemblies.map((a) => (
                <tr key={a.id} className="hover:bg-canvas">
                  <td className="px-4 py-2 font-medium text-ink">{a.name}</td>
                  <td className="px-4 py-2 text-mid-gray">{a.unit ?? "—"}</td>
                  <td className="px-4 py-2 text-mid-gray">{formatMoney(a.derived_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ResourceRateRow({ resource, projectId }: { resource: ProjectResourceRow; projectId: string }) {
  const [value, setValue] = useState(String(resource.rate_or_value));
  const dirty = Number(value) !== resource.rate_or_value && value !== "" && Number.isFinite(Number(value));

  async function save() {
    await updateProjectResourceRate(resource.id, projectId, Number(value));
  }

  return (
    <tr className="hover:bg-canvas">
      <td className="px-4 py-2 font-medium text-ink">{resource.description}</td>
      <td className="px-4 py-2">
        <Badge tone="soft">{RESOURCE_TYPE_LABELS[resource.resource_type as ResourceType]}</Badge>
      </td>
      <td className="px-4 py-2 text-mid-gray">{resource.unit ?? "—"}</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 w-28"
          />
          {dirty ? (
            <button onClick={save} className="text-primary hover:text-primary-hover" aria-label="Save rate">
              <Check className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-2 text-mid-gray">{resource.comments ?? "—"}</td>
    </tr>
  );
}
