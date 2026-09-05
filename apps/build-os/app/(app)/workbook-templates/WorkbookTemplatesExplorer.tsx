"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, FileSpreadsheet } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { AddTemplateModal } from "./AddTemplateModal";
import { deleteWorkbookTemplate } from "./actions";

export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
}

export function WorkbookTemplatesExplorer({
  organizationId,
  templates,
}: {
  organizationId: string;
  templates: TemplateRow[];
}) {
  const [addOpen, setAddOpen] = useState(false);

  async function handleDelete(template: TemplateRow) {
    if (!confirm(`Delete workbook template "${template.name}"?`)) return;
    await deleteWorkbookTemplate(template.id);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-heading-sm font-semibold tracking-tight text-ink">Workbook Templates</h1>
          <p className="text-sm text-mid-gray">
            Reusable estimation sheets with formulas — apply one to a project to generate pricing schedule lines.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-mid-gray">No workbook templates yet.</p>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                  <Link href={`/workbook-templates/${template.id}`} className="font-medium text-ink hover:underline">
                    {template.name}
                  </Link>
                </div>
                <button
                  onClick={() => handleDelete(template)}
                  className="text-mid-gray hover:text-destructive"
                  aria-label="Delete template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {template.description ? <p className="text-xs text-mid-gray">{template.description}</p> : null}
            </Card>
          ))}
        </div>
      )}

      <AddTemplateModal organizationId={organizationId} open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
