import "server-only";

// Real text extraction is wired up for PDF only (pdf-parse — a single,
// well-established dependency). DOCX/XLSX extraction would need at least
// two more parsing libraries (e.g. mammoth, a spreadsheet reader); adding
// those wasn't part of what was scoped when the user approved "real
// Anthropic API integration" for this step, so classification/suggestion
// for those file types falls back to the filename alone rather than
// silently pretending to read content that isn't actually being read.
// Known limitation, not a fake capability — see README.
export async function extractDocumentText(
  fileBytes: ArrayBuffer,
  fileType: "pdf" | "docx" | "xlsx",
): Promise<string | null> {
  if (fileType !== "pdf") return null;

  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(Buffer.from(fileBytes));
  return result.text;
}
