export interface WorkbookRowRecord {
  id: string;
  row_type: "heading" | "resource";
  description: string;
  unit: string | null;
  rate: number | null;
  qty_formula: string | null;
  computed_total: number | null;
  notes: string | null;
  sort_order: number;
}
