export const TONE_OPTIONS = [
  "Neutral",
  "Formal",
  "Casual",
  "Technical",
  "Persuasive",
] as const;
export type Tone = (typeof TONE_OPTIONS)[number];

export const OUTPUT_FORMAT_OPTIONS = [
  "Plain text",
  "Markdown",
  "JSON",
  "Bulleted list",
  "Table",
  "Custom",
] as const;
export type OutputFormatOption = (typeof OUTPUT_FORMAT_OPTIONS)[number];

/** Fields shown for every technique (PICCO replaces these with its own five sections). */
export interface CommonFields {
  role: string;
  task: string;
  context: string;
  audience: string;
  tone: Tone | "";
  outputFormat: OutputFormatOption | "";
  customFormat: string;
  constraints: string[];
  successCriteria: string;
}

export function createDefaultCommonFields(): CommonFields {
  return {
    role: "",
    task: "",
    context: "",
    audience: "",
    tone: "",
    outputFormat: "",
    customFormat: "",
    constraints: [],
    successCriteria: "",
  };
}

/** A saved prompt entry in the library. */
export interface SavedPrompt {
  id: string;
  name: string;
  technique: string;
  common: CommonFields;
  extra: Record<string, unknown>;
  generatedPrompt: string;
  createdAt: string;
  updatedAt: string;
}

/** Whole editor state, keyed by technique so switching techniques doesn't lose work. */
export interface EditorState {
  techniqueId: string;
  common: CommonFields;
  extraByTechnique: Record<string, Record<string, unknown>>;
}
