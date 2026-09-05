"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createProject(_prevState: { error?: string } | undefined, formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const client = String(formData.get("client") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const projectSize = String(formData.get("project_size") ?? "").trim();

  if (!organizationId || !name) {
    return { error: "Project name is required." };
  }

  const supabase = await createClient();
  const { data: projectId, error } = await supabase.rpc("create_project", {
    p_organization_id: organizationId,
    p_name: name,
    p_client: client || undefined,
    p_industry: industry || undefined,
    p_location: location || undefined,
    p_project_size: projectSize || undefined,
  });

  if (error) return { error: error.message };

  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}
