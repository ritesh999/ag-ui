import { useState } from "react";
import { Settings2 } from "lucide-react";
import type { TechniqueFormProps } from "../techniques/types";
import { PICCO_FIELD_ORDER, PICCO_PLACEHOLDERS, type PiccoExtra } from "../techniques/picco";
import { inputClass, labelClass, ghostButtonClass, secondaryButtonClass, cardClass } from "../lib/ui";

export default function PiccoForm({ extra, setExtra }: TechniqueFormProps<PiccoExtra>) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const filledCount = PICCO_FIELD_ORDER.filter((key) => extra[key].trim()).length;
  const percent = Math.round((filledCount / PICCO_FIELD_ORDER.length) * 100);
  const missing = PICCO_FIELD_ORDER.filter((key) => !extra[key].trim()).map((key) => extra.labels[key]);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Completeness</span>
          <span className="font-mono text-neutral-600 dark:text-neutral-300">{percent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="PICCO completeness"
          />
        </div>
        {missing.length > 0 && (
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-500">Missing: {missing.join(", ")}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button type="button" className={ghostButtonClass} onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen}>
          <Settings2 size={14} /> {settingsOpen ? "Hide" : "Edit"} section labels
        </button>
      </div>

      {settingsOpen && (
        <div className={`${cardClass} space-y-3 p-3`}>
          {PICCO_FIELD_ORDER.map((key) => (
            <div key={key}>
              <label htmlFor={`picco-label-${key}`} className={labelClass}>
                Label for "{key}"
              </label>
              <input
                id={`picco-label-${key}`}
                type="text"
                className={inputClass}
                value={extra.labels[key]}
                onChange={(e) =>
                  setExtra((prev) => ({ ...prev, labels: { ...prev.labels, [key]: e.target.value } }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {PICCO_FIELD_ORDER.map((key) => (
        <div key={key}>
          <label htmlFor={`picco-${key}`} className={labelClass}>
            {extra.labels[key]} <span className="text-accent">*</span>
          </label>
          <textarea
            id={`picco-${key}`}
            required
            className={`${inputClass} min-h-[88px] resize-y`}
            placeholder={PICCO_PLACEHOLDERS[key]}
            value={extra[key]}
            onChange={(e) => setExtra((prev) => ({ ...prev, [key]: e.target.value }))}
          />
        </div>
      ))}

      <button
        type="button"
        className={secondaryButtonClass}
        onClick={() =>
          setExtra((prev) => ({
            persona: "",
            instruction: "",
            context: "",
            constraints: "",
            output: "",
            labels: prev.labels,
          }))
        }
      >
        Clear sections
      </button>
    </div>
  );
}
