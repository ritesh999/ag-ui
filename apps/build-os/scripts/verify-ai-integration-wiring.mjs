#!/usr/bin/env node
// Verifies what CAN be checked about the AI integration without a real
// ANTHROPIC_API_KEY or a live Supabase project (neither exists in this
// environment): extractDocumentText's file-type fallback behavior, and
// that calling the API without a key fails fast with a clear message
// rather than a confusing network error. This does NOT exercise a real
// Claude API call — see README for what remains genuinely untested.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const appRoot = join(__dirname, "..");

const buildDir = mkdtempSync(join(appRoot, ".ai-wiring-build-"));

// "server-only" isn't a real resolvable package outside Next.js's own
// webpack build (it lives at next/dist/compiled/server-only, aliased by
// Next's bundler) — it's a no-op side-effect import everywhere it's used
// in this codebase, so a local stub is all a plain Node run needs.
mkdirSync(join(buildDir, "node_modules", "server-only"), { recursive: true });
writeFileSync(join(buildDir, "node_modules", "server-only", "package.json"), JSON.stringify({ name: "server-only", main: "index.js" }));
writeFileSync(join(buildDir, "node_modules", "server-only", "index.js"), "");
writeFileSync(join(buildDir, "package.json"), JSON.stringify({ type: "module" }));
execFileSync(
  "npx",
  [
    "tsc",
    join(appRoot, "lib/ai/extract-text.ts"),
    join(appRoot, "lib/ai/client.ts"),
    "--outDir",
    buildDir,
    "--module",
    "esnext",
    "--target",
    "es2020",
    "--moduleResolution",
    "bundler",
    "--esModuleInterop",
    "--skipLibCheck",
  ],
  { encoding: "utf8", cwd: appRoot },
);

let failures = 0;
function check(name, cond) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`OK   ${name}`);
  }
}

const { extractDocumentText } = await import(join(buildDir, "extract-text.js"));

// DOCX/XLSX: no extraction wired up, must return null rather than throw
// or pretend to have read something.
check("docx returns null (no parser wired up)", (await extractDocumentText(new ArrayBuffer(10), "docx")) === null);
check("xlsx returns null (no parser wired up)", (await extractDocumentText(new ArrayBuffer(10), "xlsx")) === null);

// PDF: pdf-parse actually runs against a real (minimal, hand-built)
// single-page PDF containing the text "Hello AI" — this exercises the
// real parsing library, not a stub.
const minimalPdf = buildMinimalPdf("Hello AI");
const text = await extractDocumentText(minimalPdf, "pdf");
check("pdf extraction runs pdf-parse and returns the embedded text", typeof text === "string" && text.includes("Hello AI"));

delete process.env.ANTHROPIC_API_KEY;
const { getAnthropicClient } = await import(join(buildDir, "client.js"));
let threw = false;
let message = "";
try {
  getAnthropicClient();
} catch (err) {
  threw = true;
  message = err.message;
}
check("getAnthropicClient() fails fast with no API key set", threw && message.includes("ANTHROPIC_API_KEY"));

rmSync(buildDir, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
} else {
  console.log("\nAll checkable wiring passes. The actual Claude API call itself was NOT exercised — no ANTHROPIC_API_KEY in this environment.");
}

// A minimal, valid single-page PDF with one text-drawing operation —
// enough for pdf.js (pdf-parse's dependency) to parse and extract text
// from, without needing a real-world sample file on disk.
function buildMinimalPdf(text) {
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  const stream = `BT /F1 24 Tf 10 100 Td (${text}) Tj ET`;
  objects.push(`5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "latin1").buffer;
}
