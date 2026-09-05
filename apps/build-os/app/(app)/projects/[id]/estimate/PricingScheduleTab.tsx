"use client";

import { Fragment, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, FileSpreadsheet } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { PricingLineRow, PricingSectionRow, MarkupSettingsRow } from "./types";
import { deletePricingSection, deletePricingLine, movePricingLine } from "./actions";
import { AddSectionModal } from "./AddSectionModal";
import { LineModal } from "./LineModal";
import { MarkupPanel } from "./MarkupPanel";
import { ApplyWorkbookModal } from "./ApplyWorkbookModal";
import { formatMoney } from "./format";
import type { WorkbookTemplateOption } from "./EstimateExplorer";

export function PricingScheduleTab({
  organizationId,
  projectId,
  sections,
  lines,
  markup,
  workbookTemplates,
}: {
  organizationId: string;
  projectId: string;
  sections: PricingSectionRow[];
  lines: PricingLineRow[];
  markup: MarkupSettingsRow | null;
  workbookTemplates: WorkbookTemplateOption[];
}) {
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<PricingLineRow | null>(null);
  const [applyWorkbookOpen, setApplyWorkbookOpen] = useState(false);

  const directLinesBySection = useMemo(() => {
    const map = new Map<string, PricingLineRow[]>();
    for (const line of lines) {
      if (line.cost_type !== "direct") continue;
      const key = line.section_id ?? "__unsectioned__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(line);
    }
    for (const group of map.values()) group.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [lines]);

  const indirectLines = useMemo(
    () => lines.filter((l) => l.cost_type === "indirect").sort((a, b) => a.sort_order - b.sort_order),
    [lines],
  );

  const grandTotal = useMemo(
    () => lines.filter((l) => l.cost_type === "direct").reduce((sum, l) => sum + (l.sell_price ?? 0), 0),
    [lines],
  );

  function openAddLine() {
    setEditingLine(null);
    setLineModalOpen(true);
  }

  function openEditLine(line: PricingLineRow) {
    setEditingLine(line);
    setLineModalOpen(true);
  }

  async function handleDeleteSection(section: PricingSectionRow) {
    if (!confirm(`Delete section "${section.name}"? Its lines will become unsectioned, not deleted.`)) return;
    await deletePricingSection(section.id, projectId);
  }

  async function handleDeleteLine(line: PricingLineRow) {
    if (!confirm(`Delete line "${line.item_code}"?`)) return;
    await deletePricingLine(line.id, projectId);
  }

  function renderLineRow(line: PricingLineRow, siblings: PricingLineRow[], index: number) {
    return (
      <tr key={line.id} className="hover:bg-canvas">
        <td className="px-4 py-2 font-medium text-ink">{line.item_code}</td>
        <td className="px-4 py-2 text-mid-gray">{line.description || "—"}</td>
        <td className="px-4 py-2 text-mid-gray">{line.quantity}</td>
        <td className="px-4 py-2 text-mid-gray">{line.unit ?? "—"}</td>
        <td className="px-4 py-2 text-mid-gray">{formatMoney(line.rate)}</td>
        <td className="px-4 py-2 text-mid-gray">{formatMoney(line.line_total)}</td>
        <td className="px-4 py-2 font-medium text-ink">
          {line.cost_type === "indirect" ? "—" : formatMoney(line.sell_price)}
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              disabled={index === 0}
              onClick={() => movePricingLine(line.id, siblings[index - 1].id, projectId)}
              className="text-mid-gray hover:text-ink disabled:opacity-30"
              aria-label="Move up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              disabled={index === siblings.length - 1}
              onClick={() => movePricingLine(line.id, siblings[index + 1].id, projectId)}
              className="text-mid-gray hover:text-ink disabled:opacity-30"
              aria-label="Move down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => openEditLine(line)} className="text-mid-gray hover:text-ink" aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDeleteLine(line)}
              className="text-mid-gray hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAddSectionOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Section
          </Button>
          <Button onClick={openAddLine}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Line
          </Button>
          <Button variant="outline" onClick={() => setApplyWorkbookOpen(true)}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Apply Workbook
          </Button>
        </div>

        <Card padded={false} className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-mid-gray">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Qty</th>
                <th className="px-4 py-2">Unit</th>
                <th className="px-4 py-2">Rate</th>
                <th className="px-4 py-2">Cost</th>
                <th className="px-4 py-2">Sell Price</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              <tr>
                <td colSpan={8} className="bg-canvas px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-mid-gray">
                  Direct Costs
                </td>
              </tr>
              {sections.length === 0 && !directLinesBySection.has("__unsectioned__") ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-mid-gray">
                    No direct cost lines yet.
                  </td>
                </tr>
              ) : null}
              {sections.map((section) => {
                const sectionLines = directLinesBySection.get(section.id) ?? [];
                return (
                  <Fragment key={section.id}>
                    <tr className="border-t border-hairline bg-paper">
                      <td colSpan={7} className="px-4 py-1.5 text-xs font-semibold text-ink">
                        {section.name}
                      </td>
                      <td className="px-4 py-1.5 text-right">
                        <button
                          onClick={() => handleDeleteSection(section)}
                          className="text-mid-gray hover:text-destructive"
                          aria-label="Delete section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    {sectionLines.map((line, i) => renderLineRow(line, sectionLines, i))}
                  </Fragment>
                );
              })}
              {directLinesBySection.has("__unsectioned__")
                ? (() => {
                    const unsectioned = directLinesBySection.get("__unsectioned__")!;
                    return (
                      <>
                        <tr className="border-t border-hairline bg-paper">
                          <td colSpan={8} className="px-4 py-1.5 text-xs font-semibold text-ink">
                            Unsectioned
                          </td>
                        </tr>
                        {unsectioned.map((line, i) => renderLineRow(line, unsectioned, i))}
                      </>
                    );
                  })()
                : null}

              <tr>
                <td colSpan={8} className="border-t border-hairline bg-canvas px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-mid-gray">
                  Indirect Costs
                </td>
              </tr>
              {indirectLines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-mid-gray">
                    No indirect cost lines yet.
                  </td>
                </tr>
              ) : (
                indirectLines.map((line, i) => renderLineRow(line, indirectLines, i))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-hairline">
                <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold text-ink">
                  Grand Total
                </td>
                <td colSpan={2} className="px-4 py-3 text-base font-semibold text-ink">
                  {formatMoney(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>

      <MarkupPanel organizationId={organizationId} projectId={projectId} lines={lines} markup={markup} />

      <AddSectionModal
        organizationId={organizationId}
        projectId={projectId}
        open={addSectionOpen}
        onClose={() => setAddSectionOpen(false)}
      />
      <LineModal
        key={editingLine?.id ?? "new-line"}
        organizationId={organizationId}
        projectId={projectId}
        sections={sections}
        editingLine={editingLine}
        open={lineModalOpen}
        onClose={() => setLineModalOpen(false)}
      />
      <ApplyWorkbookModal
        organizationId={organizationId}
        projectId={projectId}
        workbookTemplates={workbookTemplates}
        open={applyWorkbookOpen}
        onClose={() => setApplyWorkbookOpen(false)}
      />
    </div>
  );
}
