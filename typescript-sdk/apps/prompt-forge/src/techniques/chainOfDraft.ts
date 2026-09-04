import type { TechniqueDefinition } from "./types";
import { audienceAndConstraintsParts, formatAndCriteriaParts, joinParts, roleLine, section } from "./shared";

export interface ChainOfDraftExtra {
  maxWords: number;
  separator: string;
  showDrafts: boolean;
}

export const MIN_MAX_WORDS = 3;
export const MAX_MAX_WORDS = 15;
export const DEFAULT_MAX_WORDS = 5;
export const DEFAULT_SEPARATOR = "####";

function reasoningInstructions(extra: ChainOfDraftExtra): string {
  const maxWords = extra.maxWords;
  const separator = extra.separator.trim() || DEFAULT_SEPARATOR;

  if (!extra.showDrafts) {
    return [
      `Think step by step internally, but write only a minimal draft for each step —`,
      `no more than ${maxWords} words per step. Be terse. No full sentences,`,
      `no explanations, no restating the question.`,
      `Do not show your draft steps in the output.`,
      `After reasoning, write the separator ${separator} on its own line, then give the complete final answer.`,
    ].join("\n");
  }

  return [
    `Think step by step, but write only a minimal draft for each step —`,
    `no more than ${maxWords} words per step. Be terse. No full sentences,`,
    `no explanations, no restating the question.`,
    `Write each draft step on its own line.`,
    `After the final draft step, write the separator ${separator} on its own line,`,
    `then give the complete final answer.`,
    ``,
    `Example of the required shape:`,
    `first key figure`,
    `compare against target`,
    `gap identified`,
    separator,
    `{Full final answer here.}`,
  ].join("\n");
}

const chainOfDraft: TechniqueDefinition<ChainOfDraftExtra> = {
  id: "chain-of-draft",
  name: "Chain of Draft",
  description: "Compact chain-of-thought: minimal drafts instead of verbose reasoning, at a fraction of the tokens.",
  bestFor: "Reasoning tasks where token cost matters",
  usesCommonFields: true,
  infoTooltip:
    "Chain of Draft trades verbose reasoning for a handful of terse words per step. It cuts token use significantly while keeping most of the accuracy benefit of chain-of-thought prompting.",
  fields: [
    {
      key: "maxWords",
      label: "Max words per draft step",
      type: "number",
      min: MIN_MAX_WORDS,
      max: MAX_MAX_WORDS,
      step: 1,
    },
    {
      key: "separator",
      label: "Draft separator",
      type: "text",
      placeholder: DEFAULT_SEPARATOR,
    },
    {
      key: "showDrafts",
      label: "Show drafts in output",
      type: "toggle",
    },
  ],
  createDefaultExtra: () => ({
    maxWords: DEFAULT_MAX_WORDS,
    separator: DEFAULT_SEPARATOR,
    showDrafts: true,
  }),
  assemble: (common, extra) =>
    joinParts([
      roleLine(common),
      section("Task", common.task),
      section("Context", common.context),
      ...audienceAndConstraintsParts(common),
      `## Reasoning instructions\n${reasoningInstructions(extra)}`,
      ...formatAndCriteriaParts(common),
    ]),
};

export default chainOfDraft;
