import "server-only";
import type { createClient } from "@/lib/supabase/server";

// Spec 6: "Soft deletes plus an audit log capturing user, timestamp,
// field, old value, new value on every pricing change." Deliberately a
// small helper called explicitly from the write paths that matter
// (pricing_lines.rate/quantity, markup_settings.*,
// wbs_packages.procurement_status — see db/SCHEMA_REVIEW.md and
// 0008_audit_log.sql's own header), not a blanket row-diffing trigger —
// that would log every sort_order drag-reorder as loudly as an actual
// rate change and can't express "field" as anything more specific than a
// whole-row jsonb blob.

type Client = Awaited<ReturnType<typeof createClient>>;

export async function logFieldChange(
  supabase: Client,
  params: {
    organizationId: string;
    tableName: string;
    recordId: string;
    fieldName: string;
    oldValue: unknown;
    newValue: unknown;
  },
) {
  if (params.oldValue === params.newValue) return; // no-op edits aren't audit events

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // nothing to attribute the change to

  await supabase.from("audit_log").insert({
    organization_id: params.organizationId,
    actor_user_id: user.id,
    table_name: params.tableName,
    record_id: params.recordId,
    action: "update",
    field_name: params.fieldName,
    old_value: params.oldValue,
    new_value: params.newValue,
  });
}

// Whole-row insert/delete: field_name stays NULL, old/new_value hold the
// full row (0008_audit_log.sql's own documented shape for this case).
export async function logRowEvent(
  supabase: Client,
  params: {
    organizationId: string;
    tableName: string;
    recordId: string;
    action: "insert" | "delete";
    row: Record<string, unknown>;
  },
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_log").insert({
    organization_id: params.organizationId,
    actor_user_id: user.id,
    table_name: params.tableName,
    record_id: params.recordId,
    action: params.action,
    field_name: null,
    old_value: params.action === "delete" ? params.row : null,
    new_value: params.action === "insert" ? params.row : null,
  });
}

// Logs one row per changed field, skipping fields that didn't actually
// change — the common case for a form that resubmits every field
// regardless of whether the user touched it.
export async function logFieldChanges(
  supabase: Client,
  organizationId: string,
  tableName: string,
  recordId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  for (const fieldName of Object.keys(after)) {
    if (!(fieldName in before)) continue;
    if (before[fieldName] === after[fieldName]) continue;
    await logFieldChange(supabase, {
      organizationId,
      tableName,
      recordId,
      fieldName,
      oldValue: before[fieldName] ?? null,
      newValue: after[fieldName] ?? null,
    });
  }
}
