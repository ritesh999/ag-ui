import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { CheckCircle2, Circle } from "lucide-react";
import { DocumentsTable } from "./DocumentsTable";

export default async function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, organization_id, client, industry, location, project_size")
    .eq("id", params.id)
    .single();

  if (!project) return null;

  const { data: categories } = await supabase
    .from("document_categories")
    .select("id, code, label, sort_order")
    .order("sort_order");

  const { data: documents } = await supabase
    .from("project_documents")
    .select("id, category_id, file_name, file_type, size_bytes, storage_path, status, status_error, uploaded_at")
    .eq("project_id", params.id)
    .order("uploaded_at", { ascending: false });

  const countByCategory = new Map<string, number>();
  for (const doc of documents ?? []) {
    if (doc.category_id) countByCategory.set(doc.category_id, (countByCategory.get(doc.category_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-1 text-sm font-semibold text-ink">Project Details</h2>
        <p className="mb-4 text-xs text-mid-gray">Overview of project details</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-mid-gray">Client</p>
            <p className="font-medium text-ink">{project.client ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-mid-gray">Industry</p>
            <p className="font-medium text-ink">{project.industry ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-mid-gray">Location</p>
            <p className="font-medium text-ink">{project.location ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-mid-gray">Project Size</p>
            <p className="font-medium text-ink capitalize">{project.project_size ?? "—"}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold text-ink">Project Information Identified</h2>
        <p className="mb-4 text-xs text-mid-gray">
          Documents are matched to a category when uploaded below; the analysis will run on these documents.
        </p>
        <ul className="space-y-2">
          {(categories ?? []).map((c) => {
            const count = countByCategory.get(c.id) ?? 0;
            return (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                {count > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-hairline" />
                )}
                <span className={count > 0 ? "text-ink" : "text-mid-gray"}>
                  {c.label} {count > 0 ? `(${count} document${count === 1 ? "" : "s"})` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-hairline p-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Project Docs</h2>
            <p className="text-xs text-mid-gray">Manage all project documents including tender documents and drawings</p>
          </div>
        </div>
        <DocumentsTable
          organizationId={project.organization_id}
          projectId={project.id}
          categories={categories ?? []}
          documents={documents ?? []}
        />
      </Card>
    </div>
  );
}
