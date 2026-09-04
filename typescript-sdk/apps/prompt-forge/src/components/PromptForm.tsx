import { AlertTriangle } from "lucide-react";
import type { CommonFields } from "../types";
import type { TechniqueDefinition } from "../techniques/types";
import CommonFieldsForm from "./CommonFieldsForm";
import ExtraFieldsForm from "./ExtraFieldsForm";
import { ghostButtonClass } from "../lib/ui";

interface PromptFormProps {
  technique: TechniqueDefinition<never>;
  common: CommonFields;
  setCommon: (updater: (prev: CommonFields) => CommonFields) => void;
  extra: Record<string, unknown>;
  setExtra: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
  onSwitchTechnique: (id: string) => void;
}

export default function PromptForm({ technique, common, setCommon, extra, setExtra, onSwitchTechnique }: PromptFormProps) {
  const warning = technique.validate?.(common, extra as never) ?? null;
  const CustomForm = technique.CustomFormComponent;

  return (
    <div className="space-y-6">
      {warning && (
        <div role="alert" className="flex items-start gap-2 rounded-sm border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p>{warning.message}</p>
            {warning.suggestSwitchTo && (
              <button type="button" className={`${ghostButtonClass} mt-1 px-0 underline`} onClick={() => onSwitchTechnique(warning.suggestSwitchTo!)}>
                Switch to Zero-shot
              </button>
            )}
          </div>
        </div>
      )}

      {CustomForm ? (
        <CustomForm common={common} setCommon={setCommon} extra={extra as never} setExtra={setExtra as never} />
      ) : (
        <>
          {technique.usesCommonFields && <CommonFieldsForm value={common} onChange={setCommon} />}
          {technique.fields.length > 0 && (
            <div className={technique.usesCommonFields ? "border-t border-neutral-200 pt-5 dark:border-neutral-800" : ""}>
              {technique.usesCommonFields && (
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {technique.name} options
                </h3>
              )}
              <ExtraFieldsForm fields={technique.fields} values={extra} onChange={(key, value) => setExtra((prev) => ({ ...prev, [key]: value }))} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
