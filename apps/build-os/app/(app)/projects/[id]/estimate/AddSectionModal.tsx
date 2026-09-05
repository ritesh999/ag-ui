"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { Button, FormField, Input } from "@/components/ui";
import { addPricingSection } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Adding…" : "Add Section"}
    </Button>
  );
}

export function AddSectionModal({
  organizationId,
  projectId,
  open,
  onClose,
}: {
  organizationId: string;
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(addPricingSection, undefined);

  useEffect(() => {
    if (state && !state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title="Add Section">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="project_id" value={projectId} />
        <FormField label="Section Name">
          <Input name="name" required placeholder="e.g. Earthworks" />
        </FormField>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton />
      </form>
    </Modal>
  );
}
