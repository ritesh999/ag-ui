export interface PricingSectionRow {
  id: string;
  name: string;
  sort_order: number;
}

export interface PricingLineRow {
  id: string;
  section_id: string | null;
  cost_type: "direct" | "indirect";
  item_code: string;
  description: string;
  quantity: number;
  unit: string | null;
  rate: number;
  line_total: number;
  absorbed_indirect: number;
  sell_price: number | null;
  sort_order: number;
  is_ai_generated: boolean;
  ai_confirmed_at: string | null;
}

export interface MarkupSettingsRow {
  id: string;
  margin_pct: number;
  risk_pct: number;
  corporate_overheads_pct: number;
  formula_mode: "compounding" | "additive";
}
