import type { TechniqueDefinition } from "./types";
import { joinParts, section } from "./shared";
import PiccoForm from "../components/PiccoForm";

export interface PiccoLabels {
  persona: string;
  instruction: string;
  context: string;
  constraints: string;
  output: string;
}

export interface PiccoExtra {
  persona: string;
  instruction: string;
  context: string;
  constraints: string;
  output: string;
  labels: PiccoLabels;
}

export const DEFAULT_PICCO_LABELS: PiccoLabels = {
  persona: "Persona",
  instruction: "Instruction",
  context: "Context",
  constraints: "Constraints",
  output: "Output",
};

export const PICCO_FIELD_ORDER: Array<keyof PiccoLabels> = [
  "persona",
  "instruction",
  "context",
  "constraints",
  "output",
];

export const PICCO_PLACEHOLDERS: PiccoLabels = {
  persona: "Who the model should be, including expertise level.",
  instruction: "The single, specific action to perform.",
  context: "Background, data, prior decisions, environment.",
  constraints: "Limits: length, scope, what to avoid, tone, sources.",
  output: "The exact shape of the deliverable.",
};

const picco: TechniqueDefinition<PiccoExtra> = {
  id: "picco",
  name: "PICCO",
  description: "Persona, Instruction, Context, Constraints, Output — five required, clearly-labelled sections.",
  bestFor: "High-stakes prompts that need every angle spelled out",
  usesCommonFields: false,
  showCompletenessMeter: true,
  fields: PICCO_FIELD_ORDER.map((key) => ({
    key,
    label: DEFAULT_PICCO_LABELS[key],
    type: "textarea" as const,
    required: true,
    placeholder: PICCO_PLACEHOLDERS[key],
  })),
  createDefaultExtra: () => ({
    persona: "",
    instruction: "",
    context: "",
    constraints: "",
    output: "",
    labels: { ...DEFAULT_PICCO_LABELS },
  }),
  assemble: (_common, extra) =>
    joinParts(
      PICCO_FIELD_ORDER.map((key) => section(extra.labels[key].toUpperCase(), extra[key], "#")),
    ),
  completeness: (_common, extra) => {
    const missing = PICCO_FIELD_ORDER.filter((key) => !extra[key].trim()).map((key) => extra.labels[key]);
    const filled = PICCO_FIELD_ORDER.length - missing.length;
    return { percent: Math.round((filled / PICCO_FIELD_ORDER.length) * 100), missing };
  },
  CustomFormComponent: PiccoForm,
};

export default picco;
