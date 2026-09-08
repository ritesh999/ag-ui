"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractDocumentText } from "@/lib/ai/extract-text";
import { classifyDocument } from "@/lib/ai/classify-document";

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
  const fileBytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from("project-documents").upload(storagePath, file);
  if (uploadError) return { error: uploadError.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only classify when the user didn't already pick a category —
  // AI classification (spec 5) is meant to help when someone skips that
  // step, never to second-guess an explicit human choice.
  const shouldClassify = categoryId === null;

  const { data: inserted, error: dbError } = await supabase
    .from("project_documents")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      category_id: categoryId,
      file_name: file.name,
      file_type: fileType,
      size_bytes: file.size,
      storage_path: storagePath,
      status: shouldClassify ? "processing" : "ready",
      uploaded_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (dbError) {
    // Clean up the orphaned storage object rather than leaving a file
    // with no matching row.
    await supabase.storage.from("project-documents").remove([storagePath]);
    return { error: dbError.message };
  }

  if (shouldClassify) {
    // Runs synchronously in this request (no background job queue in the
    // approved stack) — acceptable latency for a single-document upload.
    // Never fails the upload itself: the file and its row already exist;
    // only the classification sub-step can end up "failed".
    try {
      const text = await extractDocumentText(fileBytes, fileType);
      const { data: categories } = await supabase.from("document_categories").select("id, code, label").order("sort_order");

      const result = await classifyDocument(text, file.name, categories ?? []);
      const matched = (categories ?? []).find((c) => c.code === result.categoryCode);

      await supabase
        .from("project_documents")
        .update({ status: "ready", category_id: matched?.id ?? null })
        .eq("id", inserted.id);
    } catch (err) {
      await supabase
        .from("project_documents")
        .update({ status: "failed", status_error: err instanceof Error ? err.message : "AI classification failed" })
        .eq("id", inserted.id);
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return {};
}

// Retries classification for a document whose first attempt failed (e.g.
// a transient API error) — downloads the file from storage rather than
// needing the original upload's in-memory bytes, since this runs long
// after that request ended.
export async function retryClassification(documentId: string, projectId: string) {
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("project_documents")
    .select("file_name, file_type, storage_path")
    .eq("id", documentId)
    .single();
  if (!doc) return;

  await supabase.from("project_documents").update({ status: "processing", status_error: null }).eq("id", documentId);
  revalidatePath(`/projects/${projectId}`);

  try {
    const { data: blob, error: downloadError } = await supabase.storage.from("project-documents").download(doc.storage_path);
    if (downloadError || !blob) throw new Error(downloadError?.message ?? "Could not download the file from storage.");

    const fileBytes = await blob.arrayBuffer();
    const text = await extractDocumentText(fileBytes, doc.file_type);
    const { data: categories } = await supabase.from("document_categories").select("id, code, label").order("sort_order");

    const result = await classifyDocument(text, doc.file_name, categories ?? []);
    const matched = (categories ?? []).find((c) => c.code === result.categoryCode);

    await supabase
      .from("project_documents")
      .update({ status: "ready", category_id: matched?.id ?? null })
      .eq("id", documentId);
  } catch (err) {
    await supabase
      .from("project_documents")
      .update({ status: "failed", status_error: err instanceof Error ? err.message : "AI classification failed" })
      .eq("id", documentId);
  }

  revalidatePath(`/projects/${projectId}`);
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
