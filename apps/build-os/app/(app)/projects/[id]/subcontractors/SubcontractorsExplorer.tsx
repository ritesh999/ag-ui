"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import {
  DELIVERY_METHOD_LABELS,
  PROCUREMENT_STATUSES,
  PROCUREMENT_STATUS_LABELS,
  PROCUREMENT_STATUS_TONE,
  type WbsSectionRow,
  type WbsPackageRow,
  type PricingSectionOption,
  type ProcurementStatus,
} from "./types";
import { deleteWbsSection, deleteWbsPackage, updateProcurementStatus } from "./actions";
import { AddSectionModal } from "./AddSectionModal";
import { PackageModal } from "./PackageModal";

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SubcontractorsExplorer({
  organizationId,
  projectId,
  sections,
  packages,
  pricingSections,
  totalBySection,
}: {
  organizationId: string;
  projectId: string;
  sections: WbsSectionRow[];
  packages: WbsPackageRow[];
  pricingSections: PricingSectionOption[];
  totalBySection: Record<string, number>;
}) {
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<WbsPackageRow | null>(null);
  const [defaultSectionId, setDefaultSectionId] = useState<string | undefined>(undefined);

  const packagesBySection = useMemo(() => {
    const map = new Map<string, WbsPackageRow[]>();
    for (const pkg of packages) {
      if (!map.has(pkg.section_id)) map.set(pkg.section_id, []);
      map.get(pkg.section_id)!.push(pkg);
    }
    for (const group of map.values()) group.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [packages]);

  function openAddPackage(sectionId?: string) {
    setEditingPackage(null);
    setDefaultSectionId(sectionId);
    setPackageModalOpen(true);
  }

  function openEditPackage(pkg: WbsPackageRow) {
    setEditingPackage(pkg);
    setDefaultSectionId(undefined);
    setPackageModalOpen(true);
  }

  async function handleDeleteSection(section: WbsSectionRow) {
    const count = packagesBySection.get(section.id)?.length ?? 0;
    if (!confirm(`Delete section "${section.name}"?${count > 0 ? ` Its ${count} package(s) will be deleted too.` : ""}`)) {
      return;
    }
    await deleteWbsSection(section.id, projectId);
  }

  async function handleDeletePackage(pkg: WbsPackageRow) {
    if (!confirm(`Delete package "${pkg.package_code} — ${pkg.name}"?`)) return;
    await deleteWbsPackage(pkg.id, projectId);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setAddSectionOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Section
        </Button>
        <Button onClick={() => openAddPackage()} disabled={sections.length === 0}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Package
        </Button>
      </div>

      {sections.length === 0 ? (
        <Card className="py-12 text-center text-sm text-mid-gray">
          No WBS sections yet — add one to start building the procurement plan.
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const sectionPackages = packagesBySection.get(section.id) ?? [];
            return (
              <Card key={section.id} padded={false} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
                  <h3 className="text-sm font-semibold text-ink">{section.name}</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openAddPackage(section.id)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      + Add Package
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section)}
                      className="text-mid-gray hover:text-destructive"
                      aria-label="Delete section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {sectionPackages.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-mid-gray">No packages in this section yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-mid-gray">
                      <tr>
                        <th className="px-4 py-2">Code</th>
                        <th className="px-4 py-2">Package</th>
                        <th className="px-4 py-2">Delivery</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Total</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {sectionPackages.map((pkg) => (
                        <tr key={pkg.id} className="hover:bg-canvas">
                          <td className="px-4 py-2 font-medium text-ink">{pkg.package_code}</td>
                          <td className="px-4 py-2">
                            <div className="text-ink">{pkg.name}</div>
                            {pkg.description ? (
                              <div className="truncate text-xs text-mid-gray">{pkg.description}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-2 text-mid-gray">{DELIVERY_METHOD_LABELS[pkg.delivery_method]}</td>
                          <td className="px-4 py-2">
                            <StatusSelect
                              packageId={pkg.id}
                              projectId={projectId}
                              organizationId={organizationId}
                              status={pkg.procurement_status}
                            />
                          </td>
                          <td className="px-4 py-2 text-mid-gray">
                            {pkg.pricing_section_id ? formatMoney(totalBySection[pkg.pricing_section_id] ?? 0) : "—"}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditPackage(pkg)}
                                className="text-mid-gray hover:text-ink"
                                aria-label="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePackage(pkg)}
                                className="text-mid-gray hover:text-destructive"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AddSectionModal
        organizationId={organizationId}
        projectId={projectId}
        open={addSectionOpen}
        onClose={() => setAddSectionOpen(false)}
      />
      <PackageModal
        key={editingPackage?.id ?? `new-${defaultSectionId ?? "none"}`}
        organizationId={organizationId}
        projectId={projectId}
        sections={sections}
        pricingSections={pricingSections}
        defaultSectionId={defaultSectionId}
        editingPackage={editingPackage}
        open={packageModalOpen}
        onClose={() => setPackageModalOpen(false)}
      />
    </div>
  );
}

function StatusSelect({
  packageId,
  projectId,
  organizationId,
  status,
}: {
  packageId: string;
  projectId: string;
  organizationId: string;
  status: ProcurementStatus;
}) {
  const [value, setValue] = useState(status);

  async function handleChange(newStatus: ProcurementStatus) {
    setValue(newStatus);
    await updateProcurementStatus(packageId, projectId, organizationId, newStatus);
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Badge tone={PROCUREMENT_STATUS_TONE[value]}>{PROCUREMENT_STATUS_LABELS[value]}</Badge>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value as ProcurementStatus)}
        className="h-7 rounded-[var(--radius-inputs)] border border-hairline bg-paper px-1.5 text-xs text-mid-gray"
        aria-label="Change procurement status"
      >
        {PROCUREMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PROCUREMENT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
