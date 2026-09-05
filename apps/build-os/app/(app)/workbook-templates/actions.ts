"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type FormState = { error?: string } | undefined;

export async function addWorkbookTemplate(_prevState: FormState, formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!organizationId || !name) {
    return { error: "Template name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workbook_templates")
    .insert({ organization_id: organizationId, name, description: description || null });

  if (error) return { error: error.message };

  revalidatePath("/workbook-templates");
  return {};
}

export async function deleteWorkbookTemplate(templateId: string) {
  const supabase = await createClient();
  await supabase.from("workbook_templates").delete().eq("id", templateId);
  revalidatePath("/workbook-templates");
}
