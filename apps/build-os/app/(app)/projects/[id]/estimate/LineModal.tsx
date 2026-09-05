"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { Button, FormField, Input } from "@/components/ui";
import { addPricingLine, updatePricingLine } from "./actions";
import type { PricingLineRow, PricingSectionRow } from "./types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function LineModal({
  organizationId,
  projectId,
  sections,
  editingLine,
  open,
  onClose,
}: {
  organizationId: string;
  projectId: string;
  sections: PricingSectionRow[];
  editingLine: PricingLineRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const isEdit = Boolean(editingLine);
  const [state, formAction] = useFormState(isEdit ? updatePricingLine : addPricingLine, undefined);
  const [costType, setCostType] = useState<"direct" | "indirect">(editingLine?.cost_type ?? "direct");

  useEffect(() => {
    if (state && !state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    setCostType(editingLine?.cost_type ?? "direct");
  }, [editingLine]);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Line" : "Add Line"}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="project_id" value={projectId} />
        {editingLine ? <input type="hidden" name="id" value={editingLine.id} /> : null}

        <FormField label="Cost Type">
          <select
            name="cost_type"
            value={costType}
            onChange={(e) => setCostType(e.target.value as "direct" | "indirect")}
            className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
          >
            <option value="direct">Direct</option>
            <option value="indirect">Indirect</option>
          </select>
        </FormField>

        {costType === "direct" ? (
          <FormField label="Section">
            <select
              name="section_id"
              defaultValue={editingLine?.section_id ?? ""}
              className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
            >
              <option value="">Unsectioned</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Item Code">
            <Input name="item_code" required defaultValue={editingLine?.item_code} placeholder="e.g. 2.1" />
          </FormField>
          <FormField label="Unit">
            <Input name="unit" defaultValue={editingLine?.unit ?? ""} placeholder="e.g. m3" />
          </FormField>
        </div>
        <FormField label="Description">
          <Input name="description" defaultValue={editingLine?.description ?? ""} placeholder="e.g. Site clearance" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quantity">
            <Input name="quantity" type="number" step="any" defaultValue={editingLine?.quantity ?? 0} />
          </FormField>
          <FormField label="Rate">
            <Input name="rate" type="number" step="any" defaultValue={editingLine?.rate ?? 0} />
          </FormField>
        </div>

        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton label={isEdit ? "Save Changes" : "Add Line"} />
      </form>
    </Modal>
  );
}
