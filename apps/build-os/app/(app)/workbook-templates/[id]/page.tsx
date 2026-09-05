import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WorkbookEditor } from "./WorkbookEditor";

export default async function WorkbookTemplateDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("workbook_templates")
    .select("id, organization_id, name, description")
    .eq("id", params.id)
    .single();

  if (!template) notFound();

  const { data: rows } = await supabase
    .from("workbook_rows")
    .select("id, row_type, description, unit, rate, qty_formula, computed_total, notes, sort_order")
    .eq("workbook_template_id", params.id)
    .is("deleted_at", null)
    .order("sort_order");

  return (
    <div>
      <Link
        href="/workbook-templates"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-mid-gray hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Workbook Templates
      </Link>

      <div className="mb-6">
        <h1 className="text-heading-sm font-semibold tracking-tight text-ink">{template.name}</h1>
        {template.description ? <p className="text-sm text-mid-gray">{template.description}</p> : null}
      </div>

      <WorkbookEditor organizationId={template.organization_id} templateId={template.id} rows={rows ?? []} />
    </div>
  );
}
