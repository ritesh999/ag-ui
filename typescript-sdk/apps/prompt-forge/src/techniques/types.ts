import type { ComponentType } from "react";
import type { CommonFields } from "../types";

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "toggle"
  | "number"
  | "repeatable-text"
  | "repeatable-pair";

/** Declarative description of one extra field a technique needs. The generic
 * form renderer (ExtraFieldsForm) turns this into UI without any per-technique
 * component code, so a new technique needs no changes to the UI layer. */
export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: readonly string[];
  min?: number;
  max?: number;
  step?: number;
  /** Labels for a repeatable-pair's two sides, e.g. ["Input", "Output"]. */
  pairLabels?: [string, string];
  minItems?: number;
  maxItems?: number;
}

export interface ValidationWarning {
  message: string;
  suggestSwitchTo?: string;
}

export interface CompletenessResult {
  percent: number;
  missing: string[];
}

/** Props passed to a technique-supplied custom form component (used only by
 * techniques whose editor can't be expressed as a flat field schema, e.g. PICCO). */
export interface TechniqueFormProps<TExtra = Record<string, unknown>> {
  common: CommonFields;
  setCommon: (updater: (prev: CommonFields) => CommonFields) => void;
  extra: TExtra;
  setExtra: (updater: (prev: TExtra) => TExtra) => void;
}

export interface TechniqueDefinition<TExtra = Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  /** False for techniques (e.g. PICCO) that replace the common fields with their own. */
  usesCommonFields: boolean;
  fields: FieldSchema[];
  createDefaultExtra: () => TExtra;
  assemble: (common: CommonFields, extra: TExtra) => string;
  validate?: (common: CommonFields, extra: TExtra) => ValidationWarning | null;
  infoTooltip?: string;
  showCompletenessMeter?: boolean;
  completeness?: (common: CommonFields, extra: TExtra) => CompletenessResult;
  /** Optional full replacement for the generic schema-driven form. */
  CustomFormComponent?: ComponentType<TechniqueFormProps<TExtra>>;
}
