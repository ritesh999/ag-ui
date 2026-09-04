export function downloadText(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTxt(filename: string, contents: string): void {
  downloadText(filename, contents, "text/plain;charset=utf-8");
}

export function downloadMd(filename: string, contents: string): void {
  downloadText(filename, contents, "text/markdown;charset=utf-8");
}

export function estimateTokens(text: string): number {
  return Math.round(text.length / 4);
}

export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "prompt";
}
