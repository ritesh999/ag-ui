"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { Button, FormField, Input } from "@/components/ui";
import { addWorkbookTemplate } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating…" : "Create Template"}
    </Button>
  );
}

export function AddTemplateModal({
  organizationId,
  open,
  onClose,
}: {
  organizationId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(addWorkbookTemplate, undefined);

  useEffect(() => {
    if (state && !state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title="New Workbook Template">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <FormField label="Name">
          <Input name="name" required placeholder="e.g. Pricing Workbook: Estimation Sheet" />
        </FormField>
        <FormField label="Description">
          <Input name="description" placeholder="Optional" />
        </FormField>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton />
      </form>
    </Modal>
  );
}
