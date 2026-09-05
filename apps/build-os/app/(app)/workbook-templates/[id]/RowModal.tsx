"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { Button, FormField, Input } from "@/components/ui";
import { addWorkbookRow, updateWorkbookRow } from "./actions";
import type { WorkbookRowRecord } from "./types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function RowModal({
  organizationId,
  templateId,
  editingRow,
  open,
  onClose,
}: {
  organizationId: string;
  templateId: string;
  editingRow: WorkbookRowRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const isEdit = Boolean(editingRow);
  const [state, formAction] = useFormState(isEdit ? updateWorkbookRow : addWorkbookRow, undefined);
  const [rowType, setRowType] = useState<"heading" | "resource">(editingRow?.row_type ?? "resource");

  useEffect(() => {
    if (state && !state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    setRowType(editingRow?.row_type ?? "resource");
  }, [editingRow]);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Row" : "Add Row"}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="workbook_template_id" value={templateId} />
        {editingRow ? <input type="hidden" name="id" value={editingRow.id} /> : null}

        <FormField label="Row Type">
          <select
            name="row_type"
            value={rowType}
            onChange={(e) => setRowType(e.target.value as "heading" | "resource")}
            className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
          >
            <option value="resource">Resource / Line Item</option>
            <option value="heading">Heading</option>
          </select>
        </FormField>

        <FormField label={rowType === "heading" ? "Heading Text" : "Name (referenceable in other formulas)"}>
          <Input
            name="description"
            required
            defaultValue={editingRow?.description}
            placeholder={rowType === "heading" ? "e.g. Concrete Works" : "e.g. Concrete Volume"}
          />
        </FormField>

        {rowType === "resource" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Unit">
                <Input name="unit" defaultValue={editingRow?.unit ?? ""} placeholder="e.g. m3" />
              </FormField>
              <FormField label="Rate">
                <Input name="rate" type="number" step="any" defaultValue={editingRow?.rate ?? ""} placeholder="Optional" />
              </FormField>
            </div>
            <FormField label="Quantity (a number, or a formula referencing other row/resource names)">
              <Input
                name="qty_formula"
                defaultValue={editingRow?.qty_formula ?? ""}
                placeholder="e.g. Concrete Volume * Reinforcement Ratio"
              />
            </FormField>
            <FormField label="Notes">
              <Input name="notes" defaultValue={editingRow?.notes ?? ""} placeholder="Optional" />
            </FormField>
          </>
        ) : null}

        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton label={isEdit ? "Save Changes" : "Add Row"} />
      </form>
    </Modal>
  );
}
