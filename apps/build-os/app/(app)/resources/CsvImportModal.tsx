"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Modal } from "@/components/Modal";
import { Badge, Button } from "@/components/ui";
import { normalizeResourceType, isValidUnit } from "@/lib/resource-constants";
import { importResourcesCsv, type ResourceInsertRow } from "./actions";

interface ParsedRow {
  raw: Record<string, string>;
  valid: boolean;
  errors: string[];
  insert?: ResourceInsertRow;
}

function validateRow(raw: Record<string, string>, organizationId: string): ParsedRow {
  const errors: string[] = [];

  const description = (raw.description ?? "").trim();
  const typeRaw = (raw.resource_type ?? "").trim();
  const unit = (raw.unit ?? "").trim();
  const rateRaw = (raw.rate_or_value ?? "").trim();
  const comments = (raw.comments ?? "").trim();

  if (!description) errors.push("description is required");

  const resourceType = normalizeResourceType(typeRaw);
  if (!typeRaw) errors.push("resource_type is required");
  else if (!resourceType) errors.push(`"${typeRaw}" is not a valid resource type`);

  if (unit && !isValidUnit(unit)) errors.push(`"${unit}" is not an allowed unit`);

  const rate = rateRaw === "" ? 0 : Number(rateRaw);
  if (rateRaw !== "" && !Number.isFinite(rate)) errors.push(`"${rateRaw}" is not a valid number`);

  if (errors.length > 0 || !resourceType) {
    return { raw, valid: false, errors };
  }

  return {
    raw,
    valid: true,
    errors: [],
    insert: {
      organization_id: organizationId,
      resource_type: resourceType,
      description,
      unit: unit || null,
      rate_or_value: rate,
      comments: comments || null,
    },
  };
}

export function CsvImportModal({
  organizationId,
  open,
  onClose,
}: {
  organizationId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; error?: string } | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setRows(results.data.map((raw) => validateRow(raw, organizationId)));
      },
    });
  }

  async function handleCommit() {
    const validRows = rows.filter((r) => r.valid && r.insert).map((r) => r.insert!);
    if (validRows.length === 0) return;

    setImporting(true);
    const res = await importResourcesCsv(validRows);
    setImporting(false);
    setResult(res);
    if (!res.error) {
      setTimeout(() => {
        handleClose();
      }, 1200);
    }
  }

  function handleClose() {
    setRows([]);
    setFileName(null);
    setResult(null);
    onClose();
  }

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <Modal open={open} onClose={handleClose} title="Import Resources from CSV">
      {rows.length === 0 ? (
        <div>
          <p className="mb-4 text-sm text-mid-gray">
            Columns: <code className="text-xs">description, resource_type, unit, rate_or_value, comments</code>.
            Download the template from the Resources page if you need a starting point.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block w-full text-sm"
          />
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-mid-gray">{fileName}</p>
            <div className="flex gap-2">
              <Badge tone="soft">{validCount} valid</Badge>
              {invalidCount > 0 ? <Badge tone="outline">{invalidCount} error{invalidCount === 1 ? "" : "s"}</Badge> : null}
            </div>
          </div>

          <div className="mb-4 max-h-80 overflow-y-auto rounded-[var(--radius-nested)] border border-hairline">
            <table className="w-full text-xs">
              <thead className="bg-canvas text-left uppercase tracking-wide text-mid-gray">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((row, i) => (
                  <tr key={i} className={row.valid ? "" : "bg-destructive/5"}>
                    <td className="px-3 py-2">
                      {row.valid ? (
                        <Badge tone="soft">OK</Badge>
                      ) : (
                        <span className="text-destructive" title={row.errors.join("; ")}>
                          {row.errors[0]}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{row.raw.description}</td>
                    <td className="px-3 py-2">{row.raw.resource_type}</td>
                    <td className="px-3 py-2">{row.raw.unit}</td>
                    <td className="px-3 py-2">{row.raw.rate_or_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result?.error ? <p className="mb-3 text-sm text-destructive">{result.error}</p> : null}
          {result && !result.error ? (
            <p className="mb-3 text-sm text-mid-gray">Imported {result.imported} resource(s).</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleCommit} disabled={validCount === 0 || importing}>
              {importing ? "Importing…" : `Import ${validCount} valid row${validCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
