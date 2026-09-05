import { createClient } from "@/lib/supabase/server";
import { EstimateExplorer } from "./EstimateExplorer";

export default async function EstimatePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, organization_id")
    .eq("id", params.id)
    .single();

  if (!project) return null;

  const [sectionsRes, linesRes, markupRes, resourcesRes, assembliesRes, workbookTemplatesRes] = await Promise.all([
    supabase
      .from("pricing_sections")
      .select("id, name, sort_order")
      .eq("project_id", params.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("pricing_lines")
      .select(
        "id, section_id, cost_type, item_code, description, quantity, unit, rate, line_total, absorbed_indirect, sell_price, sort_order",
      )
      .eq("project_id", params.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("markup_settings")
      .select("id, margin_pct, risk_pct, corporate_overheads_pct, formula_mode")
      .eq("project_id", params.id)
      .maybeSingle(),
    supabase
      .from("project_resources")
      .select("id, resource_type, description, unit, rate_or_value, comments")
      .eq("project_id", params.id)
      .is("deleted_at", null)
      .order("description"),
    supabase
      .from("project_assemblies")
      .select("id, name, unit, derived_rate")
      .eq("project_id", params.id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("workbook_templates")
      .select("id, name")
      .eq("organization_id", project.organization_id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  return (
    <EstimateExplorer
      organizationId={project.organization_id}
      projectId={project.id}
      sections={sectionsRes.data ?? []}
      lines={linesRes.data ?? []}
      markup={markupRes.data ?? null}
      resources={resourcesRes.data ?? []}
      assemblies={assembliesRes.data ?? []}
      workbookTemplates={workbookTemplatesRes.data ?? []}
    />
  );
}
