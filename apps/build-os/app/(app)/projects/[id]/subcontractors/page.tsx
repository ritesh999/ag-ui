import { createClient } from "@/lib/supabase/server";
import { SubcontractorsExplorer } from "./SubcontractorsExplorer";

export default async function SubcontractorsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, organization_id")
    .eq("id", params.id)
    .single();

  if (!project) return null;

  const [sectionsRes, packagesRes, pricingSectionsRes, pricingLinesRes] = await Promise.all([
    supabase
      .from("wbs_sections")
      .select("id, name, sort_order")
      .eq("project_id", params.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("wbs_packages")
      .select(
        "id, section_id, name, description, package_code, delivery_method, procurement_status, pricing_section_id, sort_order",
      )
      .eq("project_id", params.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("pricing_sections")
      .select("id, name")
      .eq("project_id", params.id)
      .is("deleted_at", null)
      .order("sort_order"),
    // Package totals are read off the estimate (spec 2.2), not stored —
    // sum each linked pricing_section's direct-line sell_price here
    // rather than duplicating the pricing engine's math.
    supabase
      .from("pricing_lines")
      .select("section_id, sell_price")
      .eq("project_id", params.id)
      .eq("cost_type", "direct")
      .is("deleted_at", null),
  ]);

  const totalBySection = new Map<string, number>();
  for (const line of pricingLinesRes.data ?? []) {
    if (!line.section_id) continue;
    totalBySection.set(line.section_id, (totalBySection.get(line.section_id) ?? 0) + (line.sell_price ?? 0));
  }

  return (
    <SubcontractorsExplorer
      organizationId={project.organization_id}
      projectId={project.id}
      sections={sectionsRes.data ?? []}
      packages={packagesRes.data ?? []}
      pricingSections={pricingSectionsRes.data ?? []}
      totalBySection={Object.fromEntries(totalBySection)}
    />
  );
}
