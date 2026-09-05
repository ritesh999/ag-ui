"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, FormField, Input } from "@/components/ui";
import { recomputeProjectPricing, grandTotal } from "@/lib/pricing-engine";
import type { PricingLineRow, MarkupSettingsRow } from "./types";
import { updateMarkupSettings } from "./actions";
import { formatMoney } from "./format";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="outline">
      {pending ? "Saving…" : "Save Markup"}
    </Button>
  );
}

export function MarkupPanel({
  organizationId,
  projectId,
  lines,
  markup,
}: {
  organizationId: string;
  projectId: string;
  lines: PricingLineRow[];
  markup: MarkupSettingsRow | null;
}) {
  const [state, formAction] = useFormState(updateMarkupSettings, undefined);

  // Local, not-yet-saved values drive an instant preview (spec: "recomputed
  // reactively ... with no page reload") via the client-side pricing-engine
  // mirror. The server action + trigger remain the source of truth for
  // every PERSISTED number — this only affects what's shown before Save.
  const [margin, setMargin] = useState(markup?.margin_pct ?? 0);
  const [risk, setRisk] = useState(markup?.risk_pct ?? 0);
  const [overheads, setOverheads] = useState(markup?.corporate_overheads_pct ?? 0);
  const [formulaMode, setFormulaMode] = useState<"compounding" | "additive">(markup?.formula_mode ?? "compounding");

  useEffect(() => {
    setMargin(markup?.margin_pct ?? 0);
    setRisk(markup?.risk_pct ?? 0);
    setOverheads(markup?.corporate_overheads_pct ?? 0);
    setFormulaMode(markup?.formula_mode ?? "compounding");
  }, [markup]);

  const previewTotal = useMemo(() => {
    const computed = recomputeProjectPricing(
      lines.map((l) => ({ id: l.id, cost_type: l.cost_type, quantity: l.quantity, rate: l.rate })),
      { margin_pct: margin, risk_pct: risk, corporate_overheads_pct: overheads, formula_mode: formulaMode },
    );
    return grandTotal(computed);
  }, [lines, margin, risk, overheads, formulaMode]);

  const savedTotal = useMemo(
    () => lines.filter((l) => l.cost_type === "direct").reduce((sum, l) => sum + (l.sell_price ?? 0), 0),
    [lines],
  );

  const dirty = Math.abs(previewTotal - savedTotal) > 0.005;

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-ink">Markup</h2>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="project_id" value={projectId} />
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Margin %">
            <Input
              name="margin_pct"
              type="number"
              step="any"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
            />
          </FormField>
          <FormField label="Risk %">
            <Input
              name="risk_pct"
              type="number"
              step="any"
              value={risk}
              onChange={(e) => setRisk(Number(e.target.value))}
            />
          </FormField>
          <FormField label="Overheads %">
            <Input
              name="corporate_overheads_pct"
              type="number"
              step="any"
              value={overheads}
              onChange={(e) => setOverheads(Number(e.target.value))}
            />
          </FormField>
        </div>
        <FormField label="Formula">
          <select
            name="formula_mode"
            value={formulaMode}
            onChange={(e) => setFormulaMode(e.target.value as "compounding" | "additive")}
            className="h-9 w-full rounded-[var(--radius-inputs)] bg-canvas px-3 text-sm"
          >
            <option value="compounding">Compounding — (1+margin)×(1+risk)×(1+overheads)</option>
            <option value="additive">Additive — 1+margin+risk+overheads</option>
          </select>
        </FormField>

        <div className="flex items-center justify-between rounded-[var(--radius-nested)] bg-canvas px-4 py-3">
          <span className="text-xs text-mid-gray">{dirty ? "Preview (unsaved)" : "Grand Total"}</span>
          <span className="text-base font-semibold text-ink">{formatMoney(previewTotal)}</span>
        </div>

        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton />
      </form>
    </Card>
  );
}
