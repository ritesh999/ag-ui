import type { TechniqueDefinition } from "./types";
import { audienceAndConstraintsParts, formatAndCriteriaParts, joinParts, numberedList, roleLine, section } from "./shared";

export const REASONING_STYLES = [
  "Step by step",
  "Decompose into sub-problems",
  "Work backwards from the goal",
] as const;
export type ReasoningStyle = (typeof REASONING_STYLES)[number];

const REASONING_STYLE_PHRASE: Record<ReasoningStyle, string> = {
  "Step by step": "step by step",
  "Decompose into sub-problems": "by decomposing it into sub-problems",
  "Work backwards from the goal": "by working backwards from the goal",
};

export interface ChainOfThoughtExtra {
  reasoningStyle: ReasoningStyle;
  showReasoning: boolean;
  steps: string[];
}

function reasoningInstructions(extra: ChainOfThoughtExtra): string {
  const lines: string[] = [`Think through this ${REASONING_STYLE_PHRASE[extra.reasoningStyle]}. Do not skip steps.`];

  const steps = numberedList(extra.steps);
  if (steps) {
    lines.push("Work through these stages in order:", steps);
  }

  lines.push(
    extra.showReasoning
      ? 'Show your full reasoning under a heading "Reasoning", then give your final answer under a heading "Answer".'
      : "Reason internally. Output only the final answer — do not show your working.",
  );

  return lines.join("\n");
}

const chainOfThought: TechniqueDefinition<ChainOfThoughtExtra> = {
  id: "chain-of-thought",
  name: "Chain of Thought",
  description: "Ask the model to reason step by step before answering.",
  bestFor: "Multi-step reasoning, math, and analysis",
  usesCommonFields: true,
  fields: [
    {
      key: "reasoningStyle",
      label: "Reasoning style",
      type: "select",
      options: REASONING_STYLES,
    },
    {
      key: "showReasoning",
      label: "Show reasoning in output",
      type: "toggle",
    },
    {
      key: "steps",
      label: "Named reasoning steps (optional scaffold)",
      type: "repeatable-text",
      placeholder: "e.g. Identify the key variables",
      helpText: "Leave empty to let the model choose its own steps.",
    },
  ],
  createDefaultExtra: () => ({
    reasoningStyle: "Step by step",
    showReasoning: true,
    steps: [],
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

export default chainOfThought;
