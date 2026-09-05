"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeResourceType, isValidUnit, type ResourceType } from "@/lib/resource-constants";

export interface ResourceInsertRow {
  organization_id: string;
  resource_type: ResourceType;
  description: string;
  unit: string | null;
  rate_or_value: number;
  comments: string | null;
}

export async function addResource(_prevState: { error?: string } | undefined, formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const resourceType = normalizeResourceType(String(formData.get("resource_type") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const rateOrValue = Number(formData.get("rate_or_value") ?? 0);
  const comments = String(formData.get("comments") ?? "").trim();

  if (!organizationId || !resourceType || !description) {
    return { error: "Type and description are required." };
  }
  if (unit && !isValidUnit(unit)) {
    return { error: `"${unit}" is not one of the allowed units.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("resources").insert({
    organization_id: organizationId,
    resource_type: resourceType,
    description,
    unit: unit || null,
    rate_or_value: Number.isFinite(rateOrValue) ? rateOrValue : 0,
    comments: comments || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/resources");
  return {};
}

export async function deleteResources(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("resources").delete().in("id", ids);
  revalidatePath("/resources");
}

// Bulk insert for the CSV import flow. Rows have already been parsed and
// validated client-side (CsvImportModal) — this just persists whatever
// it's handed, which is why it re-validates type/unit again rather than
// trusting the client completely (a request could bypass the UI).
export async function importResourcesCsv(rows: ResourceInsertRow[]) {
  if (rows.length === 0) return { imported: 0, error: "No rows to import." };

  for (const row of rows) {
    if (!normalizeResourceType(row.resource_type)) {
      return { imported: 0, error: `Invalid resource type in submitted data: "${row.resource_type}".` };
    }
    if (row.unit && !isValidUnit(row.unit)) {
      return { imported: 0, error: `Invalid unit in submitted data: "${row.unit}".` };
    }
  }

  const supabase = await createClient();
  const { error, count } = await supabase.from("resources").insert(rows, { count: "exact" });

  if (error) return { imported: 0, error: error.message };

  revalidatePath("/resources");
  return { imported: count ?? rows.length };
}

export async function addAssembly(_prevState: { error?: string } | undefined, formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const comments = String(formData.get("comments") ?? "").trim();

  if (!organizationId || !name) {
    return { error: "Name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("assemblies").insert({
    organization_id: organizationId,
    name,
    unit: unit || null,
    comments: comments || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/resources");
  return {};
}

export async function deleteAssembly(id: string) {
  const supabase = await createClient();
  await supabase.from("assemblies").delete().eq("id", id);
  revalidatePath("/resources");
}

// Adds a component to an assembly and recomputes its derived_rate.
// quantity_or_formula is stored as-is (a formula string may be entered
// here even though it isn't evaluated yet — see the note on
// recomputeAssemblyRate below), but only a plain number actually
// contributes to derived_rate until step 7's formula evaluator exists.
export async function addAssemblyComponent(_prevState: { error?: string } | undefined, formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const assemblyId = String(formData.get("assembly_id") ?? "");
  const componentResourceId = String(formData.get("component_resource_id") ?? "");
  const quantityOrFormula = String(formData.get("quantity_or_formula") ?? "").trim();

  if (!organizationId || !assemblyId || !componentResourceId || !quantityOrFormula) {
    return { error: "All fields are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("assembly_components").insert({
    organization_id: organizationId,
    assembly_id: assemblyId,
    component_resource_id: componentResourceId,
    quantity_or_formula: quantityOrFormula,
  });

  if (error) return { error: error.message };

  await recomputeAssemblyRate(assemblyId);
  revalidatePath("/resources");
  return {};
}

export async function removeAssemblyComponent(componentId: string, assemblyId: string) {
  const supabase = await createClient();
  await supabase.from("assembly_components").delete().eq("id", componentId);
  await recomputeAssemblyRate(assemblyId);
  revalidatePath("/resources");
}

// NOTE: only sums components whose quantity_or_formula parses as a plain
// number times its resource's rate_or_value. A component holding an
// actual formula (e.g. "Concrete Volume * Reinforcement Ratio") is
// skipped here and picked up once step 7's evaluator lands — this
// function will be the thing that calls it instead of doing the naive
// sum below.
async function recomputeAssemblyRate(assemblyId: string) {
  const supabase = await createClient();
  const { data: components } = await supabase
    .from("assembly_components")
    .select("quantity_or_formula, component_resource_id")
    .eq("assembly_id", assemblyId);

  if (!components) return;

  const resourceIds = components.map((c) => c.component_resource_id);
  const { data: resources } = await supabase.from("resources").select("id, rate_or_value").in("id", resourceIds);
  const rateById = new Map((resources ?? []).map((r) => [r.id, r.rate_or_value]));

  let total = 0;
  for (const c of components) {
    const qty = Number(c.quantity_or_formula);
    const rate = rateById.get(c.component_resource_id) ?? 0;
    if (Number.isFinite(qty)) total += qty * rate;
  }

  await supabase.from("assemblies").update({ derived_rate: total }).eq("id", assemblyId);
}
