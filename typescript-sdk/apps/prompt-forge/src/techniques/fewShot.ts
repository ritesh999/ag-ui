import type { TechniqueDefinition } from "./types";
import { commonTailParts, joinParts, roleLine, section } from "./shared";

/** first = Input, second = Output — generic pair keys so the ExtraFieldsForm
 * renderer stays reusable across any repeatable-pair field. */
export interface ExamplePair {
  first: string;
  second: string;
}

export interface FewShotExtra {
  examples: ExamplePair[];
  showDelimiter: boolean;
}

export const MIN_EXAMPLES = 1;
export const MAX_EXAMPLES = 8;
export const RECOMMENDED_EXAMPLES = 3;

function hasContent(ex: ExamplePair): boolean {
  return ex.first.trim().length > 0 || ex.second.trim().length > 0;
}

function buildExamplesBlock(examples: ExamplePair[], showDelimiter: boolean): string {
  const filled = examples.filter(hasContent);
  if (filled.length === 0) return "";
  const separator = showDelimiter ? "\n---\n" : "\n\n";
  const rendered = filled.map((ex) => `Input: ${ex.first.trim()}\nOutput: ${ex.second.trim()}`).join(separator);
  return `${rendered}\n\nNow apply the same pattern to the input below.`;
}

const fewShot: TechniqueDefinition<FewShotExtra> = {
  id: "few-shot",
  name: "Few-shot",
  description: "Teach the pattern with worked examples before the model tackles the real input.",
  bestFor: "Tasks with a specific output pattern to imitate",
  usesCommonFields: true,
  fields: [
    {
      key: "examples",
      label: "Example pairs",
      type: "repeatable-pair",
      pairLabels: ["Input", "Output"],
      minItems: MIN_EXAMPLES,
      maxItems: MAX_EXAMPLES,
      helpText: `Add ${RECOMMENDED_EXAMPLES} or so for best results (max ${MAX_EXAMPLES}).`,
    },
    {
      key: "showDelimiter",
      label: "Show a delimiter between examples",
      type: "toggle",
    },
  ],
  createDefaultExtra: () => ({
    examples: [{ first: "", second: "" }],
    showDelimiter: true,
  }),
  assemble: (common, extra) => {
    const examplesBlock = buildExamplesBlock(extra.examples, extra.showDelimiter);
    return joinParts([
      roleLine(common),
      section("Task", common.task),
      section("Context", common.context),
      examplesBlock ? `## Examples\n${examplesBlock}` : "",
      ...commonTailParts(common),
    ]);
  },
  validate: (_common, extra) => {
    const filled = extra.examples.filter(hasContent);
    if (filled.length === 0) {
      return {
        message: "Few-shot needs at least one example — otherwise this is a zero-shot prompt.",
        suggestSwitchTo: "zero-shot",
      };
    }
    return null;
  },
};

export default fewShot;
