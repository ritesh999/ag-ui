import type { TechniqueDefinition } from "./types";
import { commonTailParts, joinParts, roleLine, section } from "./shared";

export type ZeroShotExtra = Record<string, never>;

const zeroShot: TechniqueDefinition<ZeroShotExtra> = {
  id: "zero-shot",
  name: "Zero-shot",
  description: "A direct instruction with no examples — the model relies on the task alone.",
  bestFor: "Simple, well-defined tasks",
  usesCommonFields: true,
  fields: [],
  createDefaultExtra: () => ({}),
  assemble: (common) =>
    joinParts([roleLine(common), section("Task", common.task), section("Context", common.context), ...commonTailParts(common)]),
};

export default zeroShot;
