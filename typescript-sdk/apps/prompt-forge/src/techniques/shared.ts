import type { CommonFields } from "../types";

/** "You are {role}." — omitted entirely when role is blank. */
export function roleLine(common: CommonFields): string {
  const role = common.role.trim();
  return role ? `You are ${role}.` : "";
}

/** Renders a "## Title" section, or "" (never a dangling header) when body is empty. */
export function section(title: string, body: string | null | undefined, level = "##"): string {
  if (!body || !body.trim()) return "";
  return `${level} ${title}\n${body.trim()}`;
}

export function bulletList(items: string[]): string {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

export function numberedList(items: string[]): string {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, i) => `${i + 1}. ${item}`)
    .join("\n");
}

export function resolveOutputFormat(common: CommonFields): string {
  if (common.outputFormat === "Custom") return common.customFormat.trim();
  return common.outputFormat.trim();
}

/** Joins non-empty parts with a blank line between sections. */
export function joinParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Audience + Constraints — the sections that sit right after Context. */
export function audienceAndConstraintsParts(common: CommonFields): string[] {
  return [section("Audience", common.audience), section("Constraints", bulletList(common.constraints))];
}

/** Output format + Success criteria — the sections that close every template. */
export function formatAndCriteriaParts(common: CommonFields): string[] {
  return [section("Output format", resolveOutputFormat(common)), section("Success criteria", common.successCriteria)];
}

/** Full common trailing block: Audience, Constraints, Output format, Success criteria. */
export function commonTailParts(common: CommonFields): string[] {
  return [...audienceAndConstraintsParts(common), ...formatAndCriteriaParts(common)];
}
