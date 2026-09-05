import { createClient } from "@/lib/supabase/server";
import { resolveCurrentOrgId } from "@/lib/current-org";
import { ResourcesExplorer } from "./ResourcesExplorer";

export default async function ResourcesPage() {
  const supabase = await createClient();
  const organizationId = await resolveCurrentOrgId();
  if (!organizationId) return null;

  const { data: resources } = await supabase
    .from("resources")
    .select("id, resource_type, description, unit, rate_or_value, comments")
    .eq("organization_id", organizationId)
    .order("description");

  const { data: assemblies } = await supabase
    .from("assemblies")
    .select("id, name, unit, comments, derived_rate")
    .eq("organization_id", organizationId)
    .order("name");

  const assemblyIds = (assemblies ?? []).map((a) => a.id);
  const { data: components } =
    assemblyIds.length > 0
      ? await supabase
          .from("assembly_components")
          .select("id, assembly_id, component_resource_id, quantity_or_formula, sort_order")
          .in("assembly_id", assemblyIds)
          .order("sort_order")
      : { data: [] };

  return (
    <ResourcesExplorer
      organizationId={organizationId}
      resources={resources ?? []}
      assemblies={assemblies ?? []}
      components={components ?? []}
    />
  );
}
