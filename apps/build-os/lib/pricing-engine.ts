// Client-side mirror of db/migrations/0013_pricing_engine.sql's
// recompute_project_pricing(). Exists ONLY to render an instant live
// preview while the user edits a quantity/rate/markup field before the
// server round-trip lands — it is never the source of truth. Every
// persisted number in pricing_lines is written by the Postgres function;
// this must compute the exact same numbers for the same inputs (verified
// by scripts/verify-pricing-engine-parity.mjs against a real Postgres
// instance), or the UI would visibly "jump" when the server value arrives.
//
// Rounding: pricing_lines.line_total/absorbed_indirect/sell_price are
// NUMERIC(18,6) columns, so Postgres rounds each of those three values to
// 6 decimal places independently when the engine writes them — the
// intermediate `share` is never rounded (it's not stored). This mirror
// does the same: full-precision arithmetic throughout, round only at the
// three output fields. Rounding further to 2dp for display is a UI
// concern, not this module's.

export type CostType = "direct" | "indirect";
export type FormulaMode = "compounding" | "additive";

export interface PricingLineInput {
  id: string;
  cost_type: CostType;
  quantity: number;
  rate: number;
}

export interface MarkupSettingsInput {
  margin_pct: number;
  risk_pct: number;
  corporate_overheads_pct: number;
  formula_mode: FormulaMode;
}

export interface PricingLineComputed {
  id: string;
  line_total: number;
  absorbed_indirect: number;
  sell_price: number | null;
}

const DEFAULT_MARKUP: MarkupSettingsInput = {
  margin_pct: 0,
  risk_pct: 0,
  corporate_overheads_pct: 0,
  formula_mode: "compounding",
};

// Matches Postgres NUMERIC(18,6)'s round-half-away-from-zero on cast.
function roundTo6(value: number): number {
  const factor = 1e6;
  return Math.sign(value) * Math.round(Math.abs(value) * factor) / factor;
}

export function recomputeProjectPricing(
  lines: PricingLineInput[],
  markup: MarkupSettingsInput | null | undefined,
): PricingLineComputed[] {
  const { margin_pct, risk_pct, corporate_overheads_pct, formula_mode } = markup ?? DEFAULT_MARKUP;

  const directLines = lines.filter((l) => l.cost_type === "direct");
  const indirectLines = lines.filter((l) => l.cost_type === "indirect");

  const directTotal = directLines.reduce((sum, l) => sum + l.quantity * l.rate, 0);
  const indirectTotal = indirectLines.reduce((sum, l) => sum + l.quantity * l.rate, 0);

  const margin = margin_pct / 100;
  const risk = risk_pct / 100;
  const overheads = corporate_overheads_pct / 100;

  const directResults: PricingLineComputed[] = directLines.map((line) => {
    const lineTotal = line.quantity * line.rate;
    const share = directTotal === 0 ? 0 : lineTotal / directTotal;
    const absorbedIndirect = share * indirectTotal;
    const costWithIndirect = lineTotal + absorbedIndirect;

    const sellPrice =
      formula_mode === "compounding"
        ? costWithIndirect * (1 + margin) * (1 + risk) * (1 + overheads)
        : costWithIndirect * (1 + margin + risk + overheads);

    return {
      id: line.id,
      line_total: roundTo6(lineTotal),
      absorbed_indirect: roundTo6(absorbedIndirect),
      sell_price: roundTo6(sellPrice),
    };
  });

  const indirectResults: PricingLineComputed[] = indirectLines.map((line) => ({
    id: line.id,
    line_total: roundTo6(line.quantity * line.rate),
    absorbed_indirect: 0,
    sell_price: null,
  }));

  return [...directResults, ...indirectResults];
}

export function grandTotal(computed: PricingLineComputed[]): number {
  // Direct lines only — indirect cost is already redistributed into direct
  // lines via absorbed_indirect, so summing indirect sell price too (it's
  // null anyway) would double-count it.
  return roundTo6(computed.reduce((sum, l) => sum + (l.sell_price ?? 0), 0));
}
