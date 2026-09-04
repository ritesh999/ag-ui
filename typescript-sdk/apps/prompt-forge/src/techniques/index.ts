import zeroShot from "./zeroShot";
import fewShot from "./fewShot";
import chainOfThought from "./chainOfThought";
import chainOfDraft from "./chainOfDraft";
import picco from "./picco";
import type { TechniqueDefinition } from "./types";

/**
 * Registry of every prompting technique. To add a sixth technique:
 *   1. Create `src/techniques/myTechnique.ts` exporting a TechniqueDefinition
 *      (field schema + a pure `assemble` function).
 *   2. Import it and add it to this array.
 * No UI component needs to change — the form and preview are driven by the schema.
 */
export const techniques: TechniqueDefinition<never>[] = [
  zeroShot,
  fewShot,
  chainOfThought,
  chainOfDraft,
  picco,
] as unknown as TechniqueDefinition<never>[];

export function getTechnique(id: string): TechniqueDefinition<never> {
  const found = techniques.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown technique: ${id}`);
  return found;
}

export { zeroShot, fewShot, chainOfThought, chainOfDraft, picco };
export type { TechniqueDefinition } from "./types";
