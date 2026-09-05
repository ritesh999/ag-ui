import { createClient } from "@/lib/supabase/server";
import { resolveCurrentOrgId } from "@/lib/current-org";
import { ProjectsList } from "./ProjectsList";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const currentOrgId = await resolveCurrentOrgId();
  if (!currentOrgId) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client, location, industry, is_sample, status")
    .eq("organization_id", currentOrgId);

  return <ProjectsList organizationId={currentOrgId} projects={projects ?? []} />;
}
