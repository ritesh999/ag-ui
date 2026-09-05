// Allowed-value lists for resource CSV import/export (spec section 3:
// "CSV import must validate types and units against the allowed lists").
// The type list is exhaustive (it's the DB enum). The unit list is
// illustrative, built from the exact unit examples the brief gives per
// resource type (spec 2.3) plus a few obvious extensions — extend this
// list rather than loosening the validation if a legitimate unit gets
// rejected.

export const RESOURCE_TYPES = [
  "labour",
  "material",
  "plant",
  "subcontractor",
  "overheads",
  "productivity",
  "quantity",
  "pricing_item",
  "variable",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  labour: "Labour",
  material: "Material",
  plant: "Plant",
  subcontractor: "Subcontractor",
  overheads: "Overheads",
  productivity: "Productivity",
  quantity: "Quantity",
  pricing_item: "Pricing Item",
  variable: "Variable",
};

export const ALLOWED_UNITS = [
  "mhr",
  "/m3",
  "/day",
  "/week",
  "/m2",
  "LS",
  "/each",
  "/t",
  "/hr",
  "m2/hr",
  "m3/hr",
  "t/hr",
  "m2",
  "m3",
  "t",
  "no",
  "%",
] as const;

export function isValidResourceType(value: string): value is ResourceType {
  return (RESOURCE_TYPES as readonly string[]).includes(value.toLowerCase());
}

export function normalizeResourceType(value: string): ResourceType | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return isValidResourceType(normalized) ? (normalized as ResourceType) : null;
}

export function isValidUnit(value: string): boolean {
  if (value.trim() === "") return true; // unit is optional
  return (ALLOWED_UNITS as readonly string[]).some((u) => u.toLowerCase() === value.trim().toLowerCase());
}
