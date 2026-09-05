import { createClient } from "@/lib/supabase/server";
import { resolveCurrentOrgId } from "@/lib/current-org";
import { WorkbookTemplatesExplorer } from "./WorkbookTemplatesExplorer";

export default async function WorkbookTemplatesPage() {
  const organizationId = await resolveCurrentOrgId();
  if (!organizationId) return null;

  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("workbook_templates")
    .select("id, name, description")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");

  return <WorkbookTemplatesExplorer organizationId={organizationId} templates={templates ?? []} />;
}
