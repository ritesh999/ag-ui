"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_EXTENSIONS: Record<string, "pdf" | "docx" | "xlsx"> = {
  pdf: "pdf",
  docx: "docx",
  xlsx: "xlsx",
};

export async function uploadDocument(_prevState: { error?: string } | undefined, formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fileType = ALLOWED_EXTENSIONS[extension];
  if (!fileType) {
    return { error: "Only PDF, DOCX, and XLSX files are accepted." };
  }

  const supabase = await createClient();
  const storagePath = `${organizationId}/${projectId}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("project-documents").upload(storagePath, file);
  if (uploadError) return { error: uploadError.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: dbError } = await supabase.from("project_documents").insert({
    organization_id: organizationId,
    project_id: projectId,
    category_id: categoryId,
    file_name: file.name,
    file_type: fileType,
    size_bytes: file.size,
    storage_path: storagePath,
    status: "ready", // no async processing exists yet (that's the AI classification step, step 8)
    uploaded_by: user?.id ?? null,
  });

  if (dbError) {
    // Clean up the orphaned storage object rather than leaving a file
    // with no matching row.
    await supabase.storage.from("project-documents").remove([storagePath]);
    return { error: dbError.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function deleteDocument(documentId: string, storagePath: string, projectId: string) {
  const supabase = await createClient();
  await supabase.storage.from("project-documents").remove([storagePath]);
  await supabase.from("project_documents").delete().eq("id", documentId);
  revalidatePath(`/projects/${projectId}`);
}

export async function getDownloadUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("project-documents").createSignedUrl(storagePath, 60);
  if (error) return null;
  return data.signedUrl;
}
