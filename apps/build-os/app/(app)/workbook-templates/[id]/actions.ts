"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { evaluateWorkbookTemplate, type WorkbookRowInput } from "@/lib/formula-evaluator";

type FormState = { error?: string } | undefined;
type Client = Awaited<ReturnType<typeof createClient>>;

// Recomputes every row's computed_total (spec 4: "resolve in dependency
// order and detect circular references") and persists the result. Called
// after every mutation to this template's rows — see
// lib/formula-evaluator.ts's own header for why this lives in a Server
// Action rather than a Postgres trigger like the pricing engine (0013):
// workbook_rows has exactly one write path today (this file), so there's
// no future caller to protect against forgetting to recompute.
async function recomputeAndPersist(supabase: Client, templateId: string, organizationId: string) {
  const { data: rows } = await supabase
    .from("workbook_rows")
    .select("id, description, row_type, rate, qty_formula")
    .eq("workbook_template_id", templateId)
    .is("deleted_at", null)
    .order("sort_order");

  const { data: resources } = await supabase
    .from("resources")
    .select("description, rate_or_value")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  const input: WorkbookRowInput[] = (rows ?? []).map((r) => ({
    id: r.id,
    description: r.description,
    row_type: r.row_type,
    rate: r.rate,
    qty_formula: r.qty_formula,
  }));

  const results = evaluateWorkbookTemplate(input, resources ?? []);

  await Promise.all(
    results.map((r) => supabase.from("workbook_rows").update({ computed_total: r.computed_total }).eq("id", r.id)),
  );

  return results;
}

export async function addWorkbookRow(_prevState: FormState, formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const templateId = String(formData.get("workbook_template_id") ?? "");
  const rowType = String(formData.get("row_type") ?? "resource");
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const rateRaw = String(formData.get("rate") ?? "").trim();
  const qtyFormula = String(formData.get("qty_formula") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!organizationId || !templateId) return { error: "Missing template." };
  if (rowType !== "heading" && rowType !== "resource") return { error: "Invalid row type." };

  const supabase = await createClient();
  const { data: siblings } = await supabase
    .from("workbook_rows")
    .select("sort_order")
    .eq("workbook_template_id", templateId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSortOrder = (siblings?.[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("workbook_rows").insert({
    organization_id: organizationId,
    workbook_template_id: templateId,
    row_type: rowType,
    description,
    unit: unit || null,
    rate: rateRaw === "" ? null : Number(rateRaw),
    qty_formula: rowType === "heading" ? null : qtyFormula || null,
    notes: notes || null,
    sort_order: nextSortOrder,
  });

  if (error) return { error: error.message };

  await recomputeAndPersist(supabase, templateId, organizationId);
  revalidatePath(`/workbook-templates/${templateId}`);
  return {};
}

export async function updateWorkbookRow(_prevState: FormState, formData: FormData) {
  const rowId = String(formData.get("id") ?? "");
  const organizationId = String(formData.get("organization_id") ?? "");
  const templateId = String(formData.get("workbook_template_id") ?? "");
  const rowType = String(formData.get("row_type") ?? "resource");
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const rateRaw = String(formData.get("rate") ?? "").trim();
  const qtyFormula = String(formData.get("qty_formula") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!rowId || !organizationId || !templateId) return { error: "Missing row or template." };
  if (rowType !== "heading" && rowType !== "resource") return { error: "Invalid row type." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workbook_rows")
    .update({
      row_type: rowType,
      description,
      unit: unit || null,
      rate: rateRaw === "" ? null : Number(rateRaw),
      qty_formula: rowType === "heading" ? null : qtyFormula || null,
      notes: notes || null,
    })
    .eq("id", rowId);

  if (error) return { error: error.message };

  const results = await recomputeAndPersist(supabase, templateId, organizationId);
  revalidatePath(`/workbook-templates/${templateId}`);

  const ownError = results.find((r) => r.id === rowId)?.error;
  return ownError ? { error: `Saved, but this row's formula has a problem: ${ownError}` } : {};
}

export async function deleteWorkbookRow(rowId: string, templateId: string, organizationId: string) {
  const supabase = await createClient();
  await supabase.from("workbook_rows").delete().eq("id", rowId);
  await recomputeAndPersist(supabase, templateId, organizationId);
  revalidatePath(`/workbook-templates/${templateId}`);
}

export async function moveWorkbookRow(rowId: string, siblingId: string, templateId: string) {
  const supabase = await createClient();
  const { data: rowsData } = await supabase
    .from("workbook_rows")
    .select("id, sort_order")
    .in("id", [rowId, siblingId]);
  if (!rowsData || rowsData.length !== 2) return;

  const [a, b] = rowsData;
  await supabase.from("workbook_rows").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabase.from("workbook_rows").update({ sort_order: a.sort_order }).eq("id", b.id);

  revalidatePath(`/workbook-templates/${templateId}`);
}
