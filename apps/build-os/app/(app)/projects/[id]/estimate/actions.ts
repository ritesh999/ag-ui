"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logFieldChanges, logRowEvent } from "@/lib/audit-log";
import { evaluateWorkbookTemplate, type WorkbookRowInput } from "@/lib/formula-evaluator";

type FormState = { error?: string } | undefined;

// Every write below touches pricing_lines or markup_settings, which
// db/migrations/0013_pricing_engine.sql triggers reactively recompute
// server-side (line_total/absorbed_indirect/sell_price) — no explicit
// recompute call needed here, and none should be added (the whole point
// of the trigger design is that every write path gets this for free).

export async function addPricingSection(_prevState: FormState, formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!organizationId || !projectId || !name) {
    return { error: "Section name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pricing_sections").insert({
    organization_id: organizationId,
    project_id: projectId,
    cost_type: "direct",
    name,
  });

  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}/estimate`);
  return {};
}

export async function deletePricingSection(sectionId: string, projectId: string) {
  const supabase = await createClient();
  // Lines in this section become sectionless (section_id references
  // pricing_sections ON DELETE SET NULL, 0004) rather than being deleted
  // themselves — a section is an organizational heading, not a container
  // whose removal should destroy priced work.
  await supabase.from("pricing_sections").delete().eq("id", sectionId);
  revalidatePath(`/projects/${projectId}/estimate`);
}

export interface PricingLineFormValues {
  organization_id: string;
  project_id: string;
  section_id: string | null;
  cost_type: "direct" | "indirect";
  item_code: string;
  description: string;
  quantity: number;
  unit: string | null;
  rate: number;
}

function parseLineForm(formData: FormData): { values: PricingLineFormValues | null; error?: string } {
  const organizationId = String(formData.get("organization_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "") || null;
  const costType = String(formData.get("cost_type") ?? "direct");
  const itemCode = String(formData.get("item_code") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const unit = String(formData.get("unit") ?? "").trim();
  const rate = Number(formData.get("rate") ?? 0);

  if (!organizationId || !projectId || !itemCode) {
    return { values: null, error: "Item code is required." };
  }
  if (costType !== "direct" && costType !== "indirect") {
    return { values: null, error: "Invalid cost type." };
  }
  if (!Number.isFinite(quantity) || !Number.isFinite(rate)) {
    return { values: null, error: "Quantity and rate must be numbers." };
  }

  return {
    values: {
      organization_id: organizationId,
      project_id: projectId,
      section_id: costType === "direct" ? sectionId : null, // indirect lines have no section, per 0004
      cost_type: costType,
      item_code: itemCode,
      description,
      quantity,
      unit: unit || null,
      rate,
    },
  };
}

export async function addPricingLine(_prevState: FormState, formData: FormData) {
  const { values, error } = parseLineForm(formData);
  if (!values) return { error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // New lines go to the end of their grouping (the same section for direct
  // lines, or the whole indirect band) rather than defaulting to 0 for
  // every line — otherwise "reorder" would have nothing meaningful to swap
  // against until sort_order values happened to diverge.
  let query = supabase
    .from("pricing_lines")
    .select("sort_order")
    .eq("project_id", values.project_id)
    .eq("cost_type", values.cost_type)
    .is("deleted_at", null);
  query =
    values.cost_type === "direct" && values.section_id
      ? query.eq("section_id", values.section_id)
      : query.is("section_id", null);
  const { data: siblings } = await query.order("sort_order", { ascending: false }).limit(1);
  const nextSortOrder = (siblings?.[0]?.sort_order ?? -1) + 1;

  const { error: dbError } = await supabase
    .from("pricing_lines")
    .insert({ ...values, sort_order: nextSortOrder, created_by: user?.id ?? null });
  if (dbError) return { error: dbError.message };

  revalidatePath(`/projects/${values.project_id}/estimate`);
  return {};
}

export async function updatePricingLine(_prevState: FormState, formData: FormData) {
  const lineId = String(formData.get("id") ?? "");
  const { values, error } = parseLineForm(formData);
  if (!lineId) return { error: "Missing line id." };
  if (!values) return { error };

  const supabase = await createClient();

  // Spec 6 calls out pricing_lines.rate/quantity by name as needing an
  // audit trail — fetch the pre-edit values so the log records what
  // actually changed, not just that a write happened.
  const { data: before } = await supabase.from("pricing_lines").select("quantity, rate").eq("id", lineId).single();

  const { error: dbError } = await supabase
    .from("pricing_lines")
    .update({
      section_id: values.section_id,
      cost_type: values.cost_type,
      item_code: values.item_code,
      description: values.description,
      quantity: values.quantity,
      unit: values.unit,
      rate: values.rate,
    })
    .eq("id", lineId);

  if (dbError) return { error: dbError.message };

  if (before) {
    await logFieldChanges(supabase, values.organization_id, "pricing_lines", lineId, before, {
      quantity: values.quantity,
      rate: values.rate,
    });
  }

  revalidatePath(`/projects/${values.project_id}/estimate`);
  return {};
}

export async function deletePricingLine(lineId: string, projectId: string) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("pricing_lines")
    .select("organization_id, project_id, item_code, description, quantity, rate, cost_type")
    .eq("id", lineId)
    .single();

  await supabase.from("pricing_lines").delete().eq("id", lineId);

  if (row) {
    await logRowEvent(supabase, {
      organizationId: row.organization_id,
      tableName: "pricing_lines",
      recordId: lineId,
      action: "delete",
      row,
    });
  }

  revalidatePath(`/projects/${projectId}/estimate`);
}

// Swaps sort_order with the sibling immediately before/after this line
// within the same grouping (its section for direct lines, or the whole
// indirect band). Two updates rather than a single-statement swap because
// sort_order has no uniqueness constraint to fight — a transient duplicate
// mid-swap is harmless.
export async function movePricingLine(lineId: string, siblingId: string, projectId: string) {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("pricing_lines").select("id, sort_order").in("id", [lineId, siblingId]);
  if (!rows || rows.length !== 2) return;

  const [a, b] = rows;
  await supabase.from("pricing_lines").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabase.from("pricing_lines").update({ sort_order: a.sort_order }).eq("id", b.id);

  revalidatePath(`/projects/${projectId}/estimate`);
}

export async function updateMarkupSettings(_prevState: FormState, formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const marginPct = Number(formData.get("margin_pct") ?? 0);
  const riskPct = Number(formData.get("risk_pct") ?? 0);
  const overheadsPct = Number(formData.get("corporate_overheads_pct") ?? 0);
  const formulaMode = String(formData.get("formula_mode") ?? "compounding");

  if (!organizationId || !projectId) return { error: "Missing project." };
  if (![marginPct, riskPct, overheadsPct].every(Number.isFinite)) {
    return { error: "Percentages must be numbers." };
  }
  if (formulaMode !== "compounding" && formulaMode !== "additive") {
    return { error: "Invalid formula mode." };
  }

  const supabase = await createClient();

  const { data: before } = await supabase
    .from("markup_settings")
    .select("id, margin_pct, risk_pct, corporate_overheads_pct, formula_mode")
    .eq("project_id", projectId)
    .maybeSingle();

  const { data: after, error } = await supabase
    .from("markup_settings")
    .upsert(
      {
        organization_id: organizationId,
        project_id: projectId,
        margin_pct: marginPct,
        risk_pct: riskPct,
        corporate_overheads_pct: overheadsPct,
        formula_mode: formulaMode,
      },
      { onConflict: "project_id" },
    )
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (before) {
    await logFieldChanges(supabase, organizationId, "markup_settings", after.id, before, {
      margin_pct: marginPct,
      risk_pct: riskPct,
      corporate_overheads_pct: overheadsPct,
      formula_mode: formulaMode,
    });
  }

  revalidatePath(`/projects/${projectId}/estimate`);
  return {};
}

export async function updateProjectResourceRate(resourceId: string, projectId: string, rateOrValue: number) {
  if (!Number.isFinite(rateOrValue)) return;
  const supabase = await createClient();
  await supabase.from("project_resources").update({ rate_or_value: rateOrValue }).eq("id", resourceId);
  revalidatePath(`/projects/${projectId}/estimate`);
}

// Spec 4: "A completed workbook can be applied to a project to generate
// pricing schedule lines." Per db/SCHEMA_REVIEW.md's own note, this is a
// service-layer operation (read workbook_rows, write pricing_lines), not
// a new persisted "application" entity — there's no workbook_applications
// table.
//
// The workbook is re-evaluated fresh here rather than trusting whatever
// computed_total the template's own page last persisted, since that could
// be stale if the template (or a resource it references) changed since.
// If ANY row errors (an unresolved reference, a circular reference), the
// whole apply is refused rather than silently applying the rows that did
// resolve — a partially-applied estimate with silently-missing lines
// would be worse than making the user fix the template first.
export async function applyWorkbookToProject(templateId: string, projectId: string, organizationId: string) {
  const supabase = await createClient();

  const { data: template } = await supabase.from("workbook_templates").select("name").eq("id", templateId).single();
  if (!template) return { error: "Workbook template not found." };

  const { data: rows } = await supabase
    .from("workbook_rows")
    .select("id, description, row_type, unit, rate, qty_formula, sort_order")
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

  const evaluated = evaluateWorkbookTemplate(input, resources ?? []);
  const errors = evaluated.filter((r) => r.error);
  if (errors.length > 0) {
    const byId = new Map((rows ?? []).map((r) => [r.id, r]));
    const names = errors.map((e) => byId.get(e.id)?.description || "row").join(", ");
    return { error: `This workbook has unresolved formulas (${names}) — fix them before applying it to a project.` };
  }

  // Only rows with both a quantity and a rate become a priced line —
  // a row with no rate (a pure input constant that only exists to be
  // referenced by other formulas, e.g. a ratio) has nothing to price.
  const applicable = (rows ?? []).filter((r) => {
    if (r.row_type !== "resource") return false;
    const result = evaluated.find((e) => e.id === r.id);
    return result && result.quantity !== null && r.rate !== null;
  });

  if (applicable.length === 0) {
    return { error: "This workbook has no priced line items (rows with both a quantity and a rate) to apply." };
  }

  const { data: section, error: sectionError } = await supabase
    .from("pricing_sections")
    .insert({ organization_id: organizationId, project_id: projectId, cost_type: "direct", name: template.name })
    .select("id")
    .single();

  if (sectionError) return { error: sectionError.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const newLines = applicable.map((r, i) => {
    const result = evaluated.find((e) => e.id === r.id)!;
    return {
      organization_id: organizationId,
      project_id: projectId,
      section_id: section.id,
      cost_type: "direct" as const,
      item_code: `WB.${i + 1}`,
      description: r.description,
      quantity: result.quantity!,
      unit: r.unit,
      rate: r.rate!,
      created_by: user?.id ?? null,
    };
  });

  const { error: linesError } = await supabase.from("pricing_lines").insert(newLines);
  if (linesError) return { error: linesError.message };

  revalidatePath(`/projects/${projectId}/estimate`);
  return {};
}
