"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, FormField } from "@/components/ui";
import { suggestPricingLinesFromDocument } from "./actions";
import type { ProjectDocumentOption } from "./EstimateExplorer";

export function SuggestPricingLinesModal({
  organizationId,
  projectId,
  documents,
  open,
  onClose,
}: {
  organizationId: string;
  projectId: string;
  documents: ProjectDocumentOption[];
  open: boolean;
  onClose: () => void;
}) {
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSuggest() {
    if (!documentId) return;
    setPending(true);
    setError(null);
    const result = await suggestPricingLinesFromDocument(documentId, projectId, organizationId);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Suggest Pricing Lines from a Document">
      <div className="space-y-4">
        <p className="text-sm text-mid-gray">
          Claude reads the document and proposes pricing lines under an &quot;AI Suggestions&quot; section. Every
          suggestion is flagged and excluded from all totals until you confirm it individually — nothing here
          affects your estimate until you say so.
        </p>
        {documents.length === 0 ? (
          <p className="text-sm text-mid-gray">
            No documents are ready to analyze yet — upload one on the Overview tab first.
          </p>
        ) : (
          <FormField label="Document">
            <select
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.file_name}
                  {d.file_type !== "pdf" ? " (text extraction not supported for this file type)" : ""}
                </option>
              ))}
            </select>
          </FormField>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button onClick={handleSuggest} disabled={pending || !documentId} className="w-full">
          {pending ? "Analyzing…" : "Suggest Pricing Lines"}
        </Button>
      </div>
    </Modal>
  );
}
