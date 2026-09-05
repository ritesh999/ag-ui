"use client";

import { useMemo, useState } from "react";
import { Plus, Upload, Download, FileDown, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card } from "@/components/ui";
import { RESOURCE_TYPE_LABELS, type ResourceType } from "@/lib/resource-constants";
import { deleteResources } from "./actions";
import { AddResourceModal } from "./AddResourceModal";
import { CsvImportModal } from "./CsvImportModal";
import { AssembliesTab } from "./AssembliesTab";
import { downloadCsv, resourcesToCsv, TEMPLATE_CSV } from "./csv-utils";

export interface ResourceRow {
  id: string;
  resource_type: ResourceType;
  description: string;
  unit: string | null;
  rate_or_value: number;
  comments: string | null;
}

export interface AssemblyRow {
  id: string;
  name: string;
  unit: string | null;
  comments: string | null;
  derived_rate: number | null;
}

export interface AssemblyComponentRow {
  id: string;
  assembly_id: string;
  component_resource_id: string;
  quantity_or_formula: string;
  sort_order: number;
}

type SortKey = "description" | "resource_type";

export function ResourcesExplorer({
  organizationId,
  resources,
  assemblies,
  components,
}: {
  organizationId: string;
  resources: ResourceRow[];
  assemblies: AssemblyRow[];
  components: AssemblyComponentRow[];
}) {
  const [tab, setTab] = useState<"base" | "assemblies">("base");
  const [sortKey, setSortKey] = useState<SortKey>("description");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...resources];
    copy.sort((a, b) => {
      const cmp = a[sortKey].localeCompare(b[sortKey]);
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [resources, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} resource(s)?`)) return;
    await deleteResources(Array.from(selected));
    setSelected(new Set());
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-heading-sm font-semibold tracking-tight text-ink">Resources</h1>
          <p className="text-sm text-mid-gray">Manage your standard resource rates for projects.</p>
        </div>
        {tab === "base" ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => downloadCsv("resource-import-template.csv", TEMPLATE_CSV)}>
              <FileDown className="mr-1.5 h-4 w-4" />
              Download Template
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              Import CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadCsv("resources-export.csv", resourcesToCsv(resources))}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Resource
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex gap-1 border-b border-hairline">
        {(["base", "assemblies"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "border-b-2 px-3 py-2 text-sm font-medium",
              tab === t ? "border-primary text-primary" : "border-transparent text-mid-gray hover:text-ink"
            )}
          >
            {t === "base" ? "Base Resources" : "Assemblies"}
          </button>
        ))}
      </div>

      {tab === "base" ? (
        resources.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-mid-gray">No resources found</p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Resource
            </Button>
          </Card>
        ) : (
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
              <span className="text-xs text-mid-gray">{selected.size} selected</span>
              {selected.size > 0 ? (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete selected
                </button>
              ) : null}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-mid-gray">
                <tr>
                  <th className="w-10 px-4 py-2" />
                  <th className="cursor-pointer px-4 py-2" onClick={() => toggleSort("description")}>
                    Description {sortKey === "description" ? (sortAsc ? "↑" : "↓") : ""}
                  </th>
                  <th className="cursor-pointer px-4 py-2" onClick={() => toggleSort("resource_type")}>
                    Type {sortKey === "resource_type" ? (sortAsc ? "↑" : "↓") : ""}
                  </th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2">Rate/Value</th>
                  <th className="px-4 py-2">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {sorted.map((r) => (
                  <tr key={r.id} className="hover:bg-canvas">
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                    </td>
                    <td className="px-4 py-2 font-medium text-ink">{r.description}</td>
                    <td className="px-4 py-2">
                      <Badge tone="soft">{RESOURCE_TYPE_LABELS[r.resource_type]}</Badge>
                    </td>
                    <td className="px-4 py-2 text-mid-gray">{r.unit ?? "—"}</td>
                    <td className="px-4 py-2 text-mid-gray">{r.rate_or_value}</td>
                    <td className="px-4 py-2 text-mid-gray">{r.comments ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      ) : (
        <AssembliesTab
          organizationId={organizationId}
          assemblies={assemblies}
          components={components}
          resources={resources}
        />
      )}

      <AddResourceModal organizationId={organizationId} open={addOpen} onClose={() => setAddOpen(false)} />
      <CsvImportModal organizationId={organizationId} open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
