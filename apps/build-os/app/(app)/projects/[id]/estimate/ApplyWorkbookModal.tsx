"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, FormField } from "@/components/ui";
import { applyWorkbookToProject } from "./actions";
import type { WorkbookTemplateOption } from "./EstimateExplorer";

export function ApplyWorkbookModal({
  organizationId,
  projectId,
  workbookTemplates,
  open,
  onClose,
}: {
  organizationId: string;
  projectId: string;
  workbookTemplates: WorkbookTemplateOption[];
  open: boolean;
  onClose: () => void;
}) {
  const [templateId, setTemplateId] = useState(workbookTemplates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleApply() {
    if (!templateId) return;
    setPending(true);
    setError(null);
    const result = await applyWorkbookToProject(templateId, projectId, organizationId);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Apply Workbook">
      <div className="space-y-4">
        <p className="text-sm text-mid-gray">
          Generates a new pricing schedule section from this workbook&apos;s rows. The workbook is re-evaluated fresh
          at apply time.
        </p>
        {workbookTemplates.length === 0 ? (
          <p className="text-sm text-mid-gray">
            No workbook templates exist yet — create one under Workbook Templates first.
          </p>
        ) : (
          <FormField label="Workbook Template">
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
            >
              {workbookTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </FormField>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button onClick={handleApply} disabled={pending || !templateId} className="w-full">
          {pending ? "Applying…" : "Apply to Project"}
        </Button>
      </div>
    </Modal>
  );
}
