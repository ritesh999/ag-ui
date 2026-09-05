"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { Button, FormField, Input } from "@/components/ui";
import { createProject } from "./actions";

const PROJECT_SIZES = [
  { value: "", label: "Select…" },
  { value: "small", label: "Small (<$1M)" },
  { value: "medium", label: "Medium ($1M–$10M)" },
  { value: "large", label: "Large ($10M–$50M)" },
  { value: "major", label: "Major (>$50M)" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating…" : "Create Project"}
    </Button>
  );
}

export function CreateProjectModal({
  organizationId,
  open,
  onClose,
}: {
  organizationId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(createProject, undefined);

  return (
    <Modal open={open} onClose={onClose} title="Create Project">
      <p className="mb-4 text-sm text-mid-gray">Enter project details. You can change these later.</p>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <FormField label="Project Name">
          <Input name="name" required placeholder="e.g. Commercial Construction Project" />
        </FormField>
        <FormField label="Client">
          <Input name="client" placeholder="e.g. ABC Developer" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Industry">
            <Input name="industry" placeholder="e.g. Commercial" />
          </FormField>
          <FormField label="Project Size">
            <select name="project_size" className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm">
              {PROJECT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="Location">
          <Input name="location" placeholder="e.g. Melbourne, Australia" />
        </FormField>

        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton />
        </div>
      </form>
    </Modal>
  );
}
