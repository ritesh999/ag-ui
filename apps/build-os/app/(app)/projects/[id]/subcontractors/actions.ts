"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logFieldChanges } from "@/lib/audit-log";
import type { DeliveryMethod, ProcurementStatus } from "./types";

type FormState = { error?: string } | undefined;

export async function addWbsSection(_prevState: FormState, formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!organizationId || !projectId || !name) {
    return { error: "Section name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("wbs_sections").insert({ organization_id: organizationId, project_id: projectId, name });

  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}/subcontractors`);
  return {};
}

export async function deleteWbsSection(sectionId: string, projectId: string) {
  const supabase = await createClient();
  // wbs_packages.section_id has no ON DELETE SET NULL (0005: it's `not
  // null references wbs_sections ... on delete cascade`) — deleting a
  // section deletes its packages too, unlike a pricing_section deletion.
  await supabase.from("wbs_sections").delete().eq("id", sectionId);
  revalidatePath(`/projects/${projectId}/subcontractors`);
}

export interface WbsPackageFormValues {
  organization_id: string;
  project_id: string;
  section_id: string;
  name: string;
  description: string | null;
  package_code: string;
  delivery_method: DeliveryMethod;
  procurement_status: ProcurementStatus;
  pricing_section_id: string | null;
}

function parsePackageForm(formData: FormData): { values: WbsPackageFormValues | null; error?: string } {
  const organizationId = String(formData.get("organization_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const packageCode = String(formData.get("package_code") ?? "").trim();
  const deliveryMethod = String(formData.get("delivery_method") ?? "subcontract");
  const procurementStatus = String(formData.get("procurement_status") ?? "draft");
  const pricingSectionId = String(formData.get("pricing_section_id") ?? "") || null;

  if (!organizationId || !projectId || !sectionId || !name || !packageCode) {
    return { values: null, error: "Section, name, and package code are required." };
  }
  if (deliveryMethod !== "self_perform" && deliveryMethod !== "subcontract") {
    return { values: null, error: "Invalid delivery method." };
  }

  return {
    values: {
      organization_id: organizationId,
      project_id: projectId,
      section_id: sectionId,
      name,
      description: description || null,
      package_code: packageCode,
      delivery_method: deliveryMethod,
      procurement_status: procurementStatus as ProcurementStatus,
      pricing_section_id: pricingSectionId,
    },
  };
}

export async function addWbsPackage(_prevState: FormState, formData: FormData) {
  const { values, error } = parsePackageForm(formData);
  if (!values) return { error };

  const supabase = await createClient();
  const { error: dbError } = await supabase.from("wbs_packages").insert(values);

  if (dbError) {
    // wbs_packages_code_unique_per_project (0005): package codes are
    // user-editable but must be unique within a project.
    if (dbError.code === "23505") return { error: `Package code "${values.package_code}" is already in use.` };
    return { error: dbError.message };
  }

  revalidatePath(`/projects/${values.project_id}/subcontractors`);
  return {};
}

export async function updateWbsPackage(_prevState: FormState, formData: FormData) {
  const packageId = String(formData.get("id") ?? "");
  const { values, error } = parsePackageForm(formData);
  if (!packageId) return { error: "Missing package id." };
  if (!values) return { error };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("wbs_packages")
    .update({
      section_id: values.section_id,
      name: values.name,
      description: values.description,
      package_code: values.package_code,
      delivery_method: values.delivery_method,
      procurement_status: values.procurement_status,
      pricing_section_id: values.pricing_section_id,
    })
    .eq("id", packageId);

  if (dbError) {
    if (dbError.code === "23505") return { error: `Package code "${values.package_code}" is already in use.` };
    return { error: dbError.message };
  }

  revalidatePath(`/projects/${values.project_id}/subcontractors`);
  return {};
}

export async function deleteWbsPackage(packageId: string, projectId: string) {
  const supabase = await createClient();
  await supabase.from("wbs_packages").delete().eq("id", packageId);
  revalidatePath(`/projects/${projectId}/subcontractors`);
}

// Spec 6 / db/SCHEMA_REVIEW.md call out wbs_packages.procurement_status
// by name as needing an audit trail, same as pricing_lines.rate/quantity
// and markup_settings.* — a status change is the one field on this table
// worth auditing on its own (everything else here is descriptive, not a
// procurement-process transition).
export async function updateProcurementStatus(
  packageId: string,
  projectId: string,
  organizationId: string,
  newStatus: ProcurementStatus,
) {
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("wbs_packages")
    .select("procurement_status")
    .eq("id", packageId)
    .single();

  const { error } = await supabase.from("wbs_packages").update({ procurement_status: newStatus }).eq("id", packageId);
  if (error) return { error: error.message };

  if (before) {
    await logFieldChanges(supabase, organizationId, "wbs_packages", packageId, before, {
      procurement_status: newStatus,
    });
  }

  revalidatePath(`/projects/${projectId}/subcontractors`);
  return {};
}
