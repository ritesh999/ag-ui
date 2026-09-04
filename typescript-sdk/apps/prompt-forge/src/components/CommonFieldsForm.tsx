import { Plus, Trash2 } from "lucide-react";
import type { CommonFields } from "../types";
import { OUTPUT_FORMAT_OPTIONS, TONE_OPTIONS } from "../types";
import { inputClass, labelClass, secondaryButtonClass, ghostButtonClass } from "../lib/ui";

interface CommonFieldsFormProps {
  value: CommonFields;
  onChange: (updater: (prev: CommonFields) => CommonFields) => void;
}

export default function CommonFieldsForm({ value, onChange }: CommonFieldsFormProps) {
  function set<K extends keyof CommonFields>(key: K, v: CommonFields[K]) {
    onChange((prev) => ({ ...prev, [key]: v }));
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="cf-role" className={labelClass}>
          Role / Persona
        </label>
        <input
          id="cf-role"
          type="text"
          className={inputClass}
          placeholder="e.g. senior data analyst"
          value={value.role}
          onChange={(e) => set("role", e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="cf-task" className={labelClass}>
          Task <span className="text-accent">*</span>
        </label>
        <textarea
          id="cf-task"
          required
          className={`${inputClass} min-h-[88px] resize-y`}
          placeholder="The core instruction — what should the model do?"
          value={value.task}
          onChange={(e) => set("task", e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="cf-context" className={labelClass}>
          Context / Background
        </label>
        <textarea
          id="cf-context"
          className={`${inputClass} min-h-[72px] resize-y`}
          value={value.context}
          onChange={(e) => set("context", e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="cf-audience" className={labelClass}>
          Audience
        </label>
        <input id="cf-audience" type="text" className={inputClass} value={value.audience} onChange={(e) => set("audience", e.target.value)} />
      </div>

      <div>
        <label htmlFor="cf-tone" className={labelClass}>
          Tone
        </label>
        <select id="cf-tone" className={inputClass} value={value.tone} onChange={(e) => set("tone", e.target.value as CommonFields["tone"])}>
          <option value="">—</option>
          {TONE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="cf-format" className={labelClass}>
          Output format
        </label>
        <select
          id="cf-format"
          className={inputClass}
          value={value.outputFormat}
          onChange={(e) => set("outputFormat", e.target.value as CommonFields["outputFormat"])}
        >
          <option value="">—</option>
          {OUTPUT_FORMAT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        {value.outputFormat === "Custom" && (
          <input
            type="text"
            className={`${inputClass} mt-2`}
            placeholder="Describe the custom format"
            value={value.customFormat}
            onChange={(e) => set("customFormat", e.target.value)}
          />
        )}
      </div>

      <div>
        <div className={labelClass}>Constraints</div>
        <div className="space-y-2">
          {value.constraints.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                className={inputClass}
                aria-label={`Constraint ${i + 1}`}
                value={c}
                onChange={(e) => {
                  const next = [...value.constraints];
                  next[i] = e.target.value;
                  set("constraints", next);
                }}
              />
              <button
                type="button"
                className={`${ghostButtonClass} px-1.5`}
                aria-label={`Remove constraint ${i + 1}`}
                onClick={() => set("constraints", value.constraints.filter((_, idx) => idx !== i))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => set("constraints", [...value.constraints, ""])}>
          <Plus size={14} /> Add constraint
        </button>
      </div>

      <div>
        <label htmlFor="cf-criteria" className={labelClass}>
          Success criteria
        </label>
        <textarea
          id="cf-criteria"
          className={`${inputClass} min-h-[72px] resize-y`}
          placeholder="What does a good answer look like?"
          value={value.successCriteria}
          onChange={(e) => set("successCriteria", e.target.value)}
        />
      </div>
    </div>
  );
}
