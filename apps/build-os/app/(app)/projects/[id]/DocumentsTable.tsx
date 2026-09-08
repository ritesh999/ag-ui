"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Upload, Download, Trash2, FileText, RotateCw } from "lucide-react";
import { Badge, Button, FormField } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { uploadDocument, deleteDocument, getDownloadUrl, retryClassification } from "./actions";

interface Category {
  id: string;
  code: string;
  label: string;
  sort_order: number;
}

interface DocumentRow {
  id: string;
  category_id: string | null;
  file_name: string;
  file_type: "pdf" | "docx" | "xlsx";
  size_bytes: number;
  storage_path: string;
  status: "processing" | "ready" | "failed";
  status_error: string | null;
  uploaded_at: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_TONE = { ready: "soft", processing: "outline", failed: "outline" } as const;

export function DocumentsTable({
  organizationId,
  projectId,
  categories,
  documents,
}: {
  organizationId: string;
  projectId: string;
  categories: Category[];
  documents: DocumentRow[];
}) {
  const [uploadOpen, setUploadOpen] = useState(false);

  async function handleDownload(storagePath: string) {
    const url = await getDownloadUrl(storagePath);
    if (!url) {
      alert("Could not generate a download link.");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  async function handleDelete(doc: DocumentRow) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    await deleteDocument(doc.id, doc.storage_path, projectId);
  }

  async function handleRetry(doc: DocumentRow) {
    await retryClassification(doc.id, projectId);
  }

  return (
    <div>
      <div className="flex justify-end p-4">
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-1.5 h-4 w-4" />
          Upload Documents
        </Button>
      </div>

      {documents.length === 0 ? (
        <p className="px-5 pb-8 text-center text-sm text-mid-gray">No documents uploaded yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-mid-gray">
            <tr>
              <th className="px-5 py-2">Document Name</th>
              <th className="px-5 py-2">Type</th>
              <th className="px-5 py-2">Size</th>
              <th className="px-5 py-2">Upload Date</th>
              <th className="px-5 py-2">Status</th>
              <th className="px-5 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td className="flex items-center gap-2 px-5 py-2.5 font-medium text-ink">
                  <FileText className="h-4 w-4 text-mid-gray" />
                  {doc.file_name}
                </td>
                <td className="px-5 py-2.5 text-mid-gray uppercase">{doc.file_type}</td>
                <td className="px-5 py-2.5 text-mid-gray">{formatBytes(doc.size_bytes)}</td>
                <td className="px-5 py-2.5 text-mid-gray">{new Date(doc.uploaded_at).toLocaleString()}</td>
                <td className="px-5 py-2.5">
                  <span title={doc.status === "failed" ? doc.status_error ?? undefined : undefined}>
                    <Badge tone={STATUS_TONE[doc.status]}>{doc.status}</Badge>
                  </span>
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex gap-3">
                    {doc.status === "failed" ? (
                      <button
                        onClick={() => handleRetry(doc)}
                        className="text-mid-gray hover:text-ink"
                        aria-label="Retry AI classification"
                        title="Retry AI classification"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleDownload(doc.storage_path)}
                      className="text-mid-gray hover:text-ink"
                      aria-label="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(doc)} className="text-mid-gray hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <UploadModal
        organizationId={organizationId}
        projectId={projectId}
        categories={categories}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Uploading…" : "Upload"}
    </Button>
  );
}

function UploadModal({
  organizationId,
  projectId,
  categories,
  open,
  onClose,
}: {
  organizationId: string;
  projectId: string;
  categories: Category[];
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(uploadDocument, undefined);

  useEffect(() => {
    if (state && !state.error) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title="Upload Documents">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="project_id" value={projectId} />
        <FormField label="Category">
          <select name="category_id" className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm">
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="File (PDF, DOCX, or XLSX)">
          <input type="file" name="file" accept=".pdf,.docx,.xlsx" required className="block w-full text-sm" />
        </FormField>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton />
      </form>
    </Modal>
  );
}
