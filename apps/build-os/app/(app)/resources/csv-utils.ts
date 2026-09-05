"use client";

import Papa from "papaparse";
import { ALLOWED_UNITS, RESOURCE_TYPES } from "@/lib/resource-constants";
import type { ResourceRow } from "./ResourcesExplorer";

export const CSV_HEADERS = ["description", "resource_type", "unit", "rate_or_value", "comments"] as const;

export const TEMPLATE_CSV = Papa.unparse({
  fields: [...CSV_HEADERS],
  data: [
    ["Concrete Labour", "labour", "mhr", "65", "General concrete crew"],
    ["Ready-Mix Concrete", "material", "/m3", "220", "32 MPa"],
  ],
});

export function resourcesToCsv(resources: ResourceRow[]) {
  return Papa.unparse({
    fields: [...CSV_HEADERS],
    data: resources.map((r) => [r.description, r.resource_type, r.unit ?? "", r.rate_or_value, r.comments ?? ""]),
  });
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Re-exported so the CSV modal doesn't need a second import line for
// constants it also needs.
export { ALLOWED_UNITS, RESOURCE_TYPES };
