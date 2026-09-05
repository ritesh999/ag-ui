#!/usr/bin/env node
// Unit tests for lib/formula-evaluator.ts against hand-calculated
// expected values. No DB involved (unlike the pricing engine, this
// evaluator has no separate SQL implementation to cross-check against —
// see lib/formula-evaluator.ts's own header for why). Run manually:
//
//   node scripts/verify-formula-evaluator.mjs

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const appRoot = join(__dirname, "..");

const buildDir = mkdtempSync(join(tmpdir(), "formula-evaluator-build-"));
execFileSync("npx", [
  "tsc",
  join(appRoot, "lib/formula-evaluator.ts"),
  "--outDir",
  buildDir,
  "--module",
  "esnext",
  "--target",
  "es2020",
  "--moduleResolution",
  "bundler",
  "--strict",
], { encoding: "utf8" });

const { evaluateWorkbookTemplate } = await import(join(buildDir, "formula-evaluator.js"));

let failures = 0;
function check(name, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) {
    failures++;
    console.error(`FAIL ${name}`);
    console.error("  expected:", JSON.stringify(expected));
    console.error("  actual:  ", JSON.stringify(actual));
  } else {
    console.log(`OK   ${name}`);
  }
}

// --- 1. Named row references, multi-word names, constant-via-rate ------
{
  const rows = [
    { id: "1", description: "Concrete Volume", row_type: "resource", rate: null, qty_formula: "10" },
    { id: "2", description: "Reinforcement Ratio", row_type: "resource", rate: 0.02, qty_formula: null },
    { id: "3", description: "Rebar Weight", row_type: "resource", rate: 7850, qty_formula: "Concrete Volume * Reinforcement Ratio" },
  ];
  const result = evaluateWorkbookTemplate(rows, []);
  check("1a: plain-number row = qty (no rate)", result.find((r) => r.id === "1").computed_total, 10);
  check("1b: no-formula row = rate itself (constant)", result.find((r) => r.id === "2").computed_total, 0.02);
  // 0.2 (qty) * 7850 (rate) = 1570
  check("1c: multi-word cross-row reference", result.find((r) => r.id === "3").computed_total, 1570);
  check("1e: quantity exposed separately from total (0.2, not 1570)", result.find((r) => r.id === "3").quantity, 0.2);
  check("1d: no errors", result.every((r) => r.error === null), true);
}

// --- 2. Resource fallback when no row has that name ---------------------
{
  const rows = [{ id: "1", description: "Rebar Weight", row_type: "resource", rate: 1, qty_formula: "Steel Density * 2" }];
  const resources = [{ description: "Steel Density", rate_or_value: 7850 }];
  const result = evaluateWorkbookTemplate(rows, resources);
  check("2: resource-by-name fallback", result[0].computed_total, 15700);
}

// --- 3. Circular reference: caught, no crash, no infinite loop ---------
{
  const rows = [
    { id: "a", description: "A", row_type: "resource", rate: 1, qty_formula: "B + 1" },
    { id: "b", description: "B", row_type: "resource", rate: 1, qty_formula: "A + 1" },
  ];
  const result = evaluateWorkbookTemplate(rows, []);
  check("3: circular reference -> both null with an error, no crash", result.every((r) => r.computed_total === null && r.error), true);
}

// --- 4. Unknown reference surfaces a per-row error, doesn't crash others ---
{
  const rows = [
    { id: "1", description: "Good Row", row_type: "resource", rate: 1, qty_formula: "5" },
    { id: "2", description: "Bad Row", row_type: "resource", rate: 1, qty_formula: "NonExistentName * 2" },
  ];
  const result = evaluateWorkbookTemplate(rows, []);
  check("4a: unrelated row still computes", result.find((r) => r.id === "1").computed_total, 5);
  check("4b: unknown reference -> null + error", result.find((r) => r.id === "2").computed_total === null && !!result.find((r) => r.id === "2").error, true);
}

// --- 5. Heading rows pass through untouched ------------------------------
{
  const rows = [{ id: "1", description: "Concrete Works", row_type: "heading", rate: null, qty_formula: null }];
  const result = evaluateWorkbookTemplate(rows, []);
  check("5: heading row stays null, no error", result[0], { id: "1", quantity: null, computed_total: null, error: null });
}

// --- 6. Operator precedence, parentheses, unary minus --------------------
{
  const rows = [{ id: "1", description: "Calc", row_type: "resource", rate: null, qty_formula: "(2+3)*-2" }];
  const result = evaluateWorkbookTemplate(rows, []);
  check("6: precedence/parens/unary minus", result[0].computed_total, -10);
}

// --- 7. A 3-level dependency chain resolves in the right order -----------
{
  const rows = [
    { id: "1", description: "Base", row_type: "resource", rate: null, qty_formula: "4" },
    { id: "2", description: "Doubled", row_type: "resource", rate: null, qty_formula: "Base * 2" },
    { id: "3", description: "Tripled", row_type: "resource", rate: null, qty_formula: "Doubled * 3" },
  ];
  const result = evaluateWorkbookTemplate(rows, []);
  check("7: transitive dependency chain (4 -> 8 -> 24)", result.find((r) => r.id === "3").computed_total, 24);
}

rmSync(buildDir, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
} else {
  console.log("\nAll formula evaluator checks pass.");
}
