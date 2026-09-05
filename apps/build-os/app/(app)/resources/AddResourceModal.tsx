"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { Button, FormField, Input } from "@/components/ui";
import { RESOURCE_TYPES, RESOURCE_TYPE_LABELS } from "@/lib/resource-constants";
import { addResource } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Adding…" : "Add Resource"}
    </Button>
  );
}

export function AddResourceModal({
  organizationId,
  open,
  onClose,
}: {
  organizationId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(addResource, undefined);

  // Closes the modal after a successful submit (state becomes {} with no
  // error) but stays open to show the message when there's a validation
  // error to fix.
  useEffect(() => {
    if (state && !state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title="Add Resource">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <FormField label="Type">
          <select name="resource_type" required className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm">
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {RESOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Description">
          <Input name="description" required placeholder="e.g. Concrete Labour" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Unit">
            <Input name="unit" placeholder="e.g. mhr" />
          </FormField>
          <FormField label="Rate / Value">
            <Input name="rate_or_value" type="number" step="any" placeholder="0" />
          </FormField>
        </div>
        <FormField label="Comments">
          <Input name="comments" placeholder="Optional" />
        </FormField>

        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <SubmitButton />
      </form>
    </Modal>
  );
}
