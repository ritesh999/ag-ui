"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { deleteWorkbookRow, moveWorkbookRow } from "./actions";
import { RowModal } from "./RowModal";
import type { WorkbookRowRecord } from "./types";

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function WorkbookEditor({
  organizationId,
  templateId,
  rows,
}: {
  organizationId: string;
  templateId: string;
  rows: WorkbookRowRecord[];
}) {
  const [rowModalOpen, setRowModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<WorkbookRowRecord | null>(null);

  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);

  function openAdd() {
    setEditingRow(null);
    setRowModalOpen(true);
  }
  function openEdit(row: WorkbookRowRecord) {
    setEditingRow(row);
    setRowModalOpen(true);
  }

  async function handleDelete(row: WorkbookRowRecord) {
    if (!confirm(`Delete row "${row.description || "(untitled)"}"?`)) return;
    await deleteWorkbookRow(row.id, templateId, organizationId);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Row
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="py-12 text-center text-sm text-mid-gray">No rows yet — add one to start building this sheet.</Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-mid-gray">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Unit</th>
                <th className="px-4 py-2">Rate</th>
                <th className="px-4 py-2">Quantity / Formula</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {sorted.map((row, i) => {
                if (row.row_type === "heading") {
                  return (
                    <tr key={row.id} className="bg-canvas">
                      <td colSpan={5} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink">
                        {row.description}
                      </td>
                      <td className="px-4 py-2">
                        <RowActions
                          row={row}
                          index={i}
                          siblings={sorted}
                          templateId={templateId}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                        />
                      </td>
                    </tr>
                  );
                }

                const hasProblem = Boolean(row.qty_formula) && row.computed_total === null;

                return (
                  <tr key={row.id} className="hover:bg-canvas">
                    <td className="px-4 py-2 font-medium text-ink">
                      <div className="flex items-center gap-1.5">
                        {row.description || <span className="italic text-mid-gray">(untitled)</span>}
                        {hasProblem ? (
                          <AlertTriangle
                            className="h-3.5 w-3.5 text-destructive"
                            aria-label="This row's formula could not be resolved"
                          />
                        ) : null}
                      </div>
                      {row.notes ? <div className="text-xs text-mid-gray">{row.notes}</div> : null}
                    </td>
                    <td className="px-4 py-2 text-mid-gray">{row.unit ?? "—"}</td>
                    <td className="px-4 py-2 text-mid-gray">{row.rate ?? "—"}</td>
                    <td className="px-4 py-2 text-mid-gray">{row.qty_formula ?? "—"}</td>
                    <td className="px-4 py-2 text-ink">{formatMoney(row.computed_total)}</td>
                    <td className="px-4 py-2">
                      <RowActions
                        row={row}
                        index={i}
                        siblings={sorted}
                        templateId={templateId}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <RowModal
        key={editingRow?.id ?? "new-row"}
        organizationId={organizationId}
        templateId={templateId}
        editingRow={editingRow}
        open={rowModalOpen}
        onClose={() => setRowModalOpen(false)}
      />
    </div>
  );
}

function RowActions({
  row,
  index,
  siblings,
  templateId,
  onEdit,
  onDelete,
}: {
  row: WorkbookRowRecord;
  index: number;
  siblings: WorkbookRowRecord[];
  templateId: string;
  onEdit: (row: WorkbookRowRecord) => void;
  onDelete: (row: WorkbookRowRecord) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={index === 0}
        onClick={() => moveWorkbookRow(row.id, siblings[index - 1].id, templateId)}
        className="text-mid-gray hover:text-ink disabled:opacity-30"
        aria-label="Move up"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        disabled={index === siblings.length - 1}
        onClick={() => moveWorkbookRow(row.id, siblings[index + 1].id, templateId)}
        className="text-mid-gray hover:text-ink disabled:opacity-30"
        aria-label="Move down"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onEdit(row)} className="text-mid-gray hover:text-ink" aria-label="Edit">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onDelete(row)} className="text-mid-gray hover:text-destructive" aria-label="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
