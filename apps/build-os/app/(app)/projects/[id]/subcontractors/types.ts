export type DeliveryMethod = "self_perform" | "subcontract";
export type ProcurementStatus = "not_applicable" | "draft" | "issued" | "quotes_received" | "preferred" | "awarded";

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  self_perform: "Self-Perform",
  subcontract: "Subcontract",
};

export const PROCUREMENT_STATUSES: ProcurementStatus[] = [
  "not_applicable",
  "draft",
  "issued",
  "quotes_received",
  "preferred",
  "awarded",
];

export const PROCUREMENT_STATUS_LABELS: Record<ProcurementStatus, string> = {
  not_applicable: "N/A",
  draft: "Draft",
  issued: "Issued",
  quotes_received: "Quotes Received",
  preferred: "Preferred",
  awarded: "Awarded",
};

// solid = a settled state (nothing left to do), soft = neutral/early,
// outline = in progress — matches the Badge component's existing tones.
export const PROCUREMENT_STATUS_TONE: Record<ProcurementStatus, "solid" | "soft" | "outline"> = {
  not_applicable: "soft",
  draft: "soft",
  issued: "outline",
  quotes_received: "outline",
  preferred: "outline",
  awarded: "solid",
};

export interface WbsSectionRow {
  id: string;
  name: string;
  sort_order: number;
}

export interface WbsPackageRow {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  package_code: string;
  delivery_method: DeliveryMethod;
  procurement_status: ProcurementStatus;
  pricing_section_id: string | null;
  sort_order: number;
}

export interface PricingSectionOption {
  id: string;
  name: string;
}
