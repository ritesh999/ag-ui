"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { Button, FormField, Input } from "@/components/ui";
import { addWbsPackage, updateWbsPackage } from "./actions";
import {
  DELIVERY_METHOD_LABELS,
  PROCUREMENT_STATUSES,
  PROCUREMENT_STATUS_LABELS,
  type WbsPackageRow,
  type WbsSectionRow,
  type PricingSectionOption,
} from "./types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function PackageModal({
  organizationId,
  projectId,
  sections,
  pricingSections,
  defaultSectionId,
  editingPackage,
  open,
  onClose,
}: {
  organizationId: string;
  projectId: string;
  sections: WbsSectionRow[];
  pricingSections: PricingSectionOption[];
  defaultSectionId?: string;
  editingPackage: WbsPackageRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const isEdit = Boolean(editingPackage);
  const [state, formAction] = useFormState(isEdit ? updateWbsPackage : addWbsPackage, undefined);

  useEffect(() => {
    if (state && !state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Package" : "Add Package"}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="project_id" value={projectId} />
        {editingPackage ? <input type="hidden" name="id" value={editingPackage.id} /> : null}

        <FormField label="Section">
          <select
            name="section_id"
            required
            defaultValue={editingPackage?.section_id ?? defaultSectionId ?? ""}
            className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
          >
            <option value="" disabled>
              Choose a section
            </option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Package Code">
            <Input name="package_code" required defaultValue={editingPackage?.package_code} placeholder="e.g. 220" />
          </FormField>
          <FormField label="Name">
            <Input name="name" required defaultValue={editingPackage?.name} placeholder="e.g. Site Facilities" />
          </FormField>
        </div>

        <FormField label="Description">
          <Input name="description" defaultValue={editingPackage?.description ?? ""} placeholder="Optional" />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Delivery Method">
            <select
              name="delivery_method"
              defaultValue={editingPackage?.delivery_method ?? "subcontract"}
              className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
            >
              {Object.entries(DELIVERY_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Procurement Status">
            <select
              name="procurement_status"
              defaultValue={editingPackage?.procurement_status ?? "draft"}
              className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
            >
              {PROCUREMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROCUREMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Linked Pricing Section (for reading the package total off the estimate)">
          <select
            name="pricing_section_id"
            defaultValue={editingPackage?.pricing_section_id ?? ""}
            className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
          >
            <option value="">Not linked</option>
            {pricingSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>

        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton label={isEdit ? "Save Changes" : "Add Package"} />
      </form>
    </Modal>
  );
}
