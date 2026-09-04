import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { FieldSchema } from "../techniques/types";
import { inputClass, labelClass, secondaryButtonClass, ghostButtonClass } from "../lib/ui";

interface ExtraFieldsFormProps {
  fields: FieldSchema[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

/**
 * Renders form controls purely from a technique's declarative field schema.
 * Adding a new technique with standard field types requires no changes here.
 */
export default function ExtraFieldsForm({ fields, values, onChange }: ExtraFieldsFormProps) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-5">
      {fields.map((field) => (
        <FieldRenderer key={field.key} field={field} value={values[field.key]} onChange={(v) => onChange(field.key, v)} />
      ))}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = `field-${field.key}`;

  switch (field.type) {
    case "text":
      return (
        <div>
          <label htmlFor={id} className={labelClass}>
            {field.label}
            {field.required && <span className="text-accent"> *</span>}
          </label>
          <input
            id={id}
            type="text"
            className={inputClass}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.helpText && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{field.helpText}</p>}
        </div>
      );

    case "textarea":
      return (
        <div>
          <label htmlFor={id} className={labelClass}>
            {field.label}
            {field.required && <span className="text-accent"> *</span>}
          </label>
          <textarea
            id={id}
            className={`${inputClass} min-h-[88px] resize-y`}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.helpText && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{field.helpText}</p>}
        </div>
      );

    case "number":
      return (
        <div>
          <label htmlFor={id} className={labelClass}>
            {field.label}
          </label>
          <input
            id={id}
            type="number"
            className={`${inputClass} max-w-[8rem]`}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={(value as number) ?? field.min ?? 0}
            onChange={(e) => {
              const n = Number(e.target.value);
              const clamped = Math.min(field.max ?? Infinity, Math.max(field.min ?? -Infinity, Number.isNaN(n) ? 0 : n));
              onChange(clamped);
            }}
          />
          {field.helpText && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{field.helpText}</p>}
        </div>
      );

    case "select":
      return (
        <div>
          <label htmlFor={id} className={labelClass}>
            {field.label}
          </label>
          <select id={id} className={inputClass} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case "toggle":
      return (
        <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3">
          <span className={`${labelClass} mb-0`}>{field.label}</span>
          <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
            <input
              id={id}
              type="checkbox"
              className="peer sr-only"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="absolute inset-0 rounded-full bg-neutral-300 transition peer-checked:bg-accent dark:bg-neutral-700" />
            <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
          </span>
        </label>
      );

    case "repeatable-text":
      return (
        <RepeatableTextField field={field} value={(value as string[]) ?? []} onChange={onChange} />
      );

    case "repeatable-pair":
      return (
        <RepeatablePairField field={field} value={(value as { first: string; second: string }[]) ?? []} onChange={onChange} />
      );

    default:
      return null;
  }
}

function RepeatableTextField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const min = field.minItems ?? 0;
  const max = field.maxItems ?? Infinity;

  return (
    <div>
      <div className={labelClass}>{field.label}</div>
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              className={inputClass}
              placeholder={field.placeholder}
              value={item}
              aria-label={`${field.label} ${i + 1}`}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              className={`${ghostButtonClass} px-1.5`}
              aria-label={`Remove ${field.label} ${i + 1}`}
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              disabled={value.length <= min}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      {field.helpText && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{field.helpText}</p>}
      <button
        type="button"
        className={`${secondaryButtonClass} mt-2`}
        onClick={() => onChange([...value, ""])}
        disabled={value.length >= max}
      >
        <Plus size={14} /> Add
      </button>
    </div>
  );
}

function RepeatablePairField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: { first: string; second: string }[];
  onChange: (value: { first: string; second: string }[]) => void;
}) {
  const [firstLabel, secondLabel] = field.pairLabels ?? ["First", "Second"];
  const min = field.minItems ?? 0;
  const max = field.maxItems ?? Infinity;

  function update(i: number, key: "first" | "second", v: string) {
    const next = value.map((pair, idx) => (idx === i ? { ...pair, [key]: v } : pair));
    onChange(next);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      <div className={labelClass}>{field.label}</div>
      <div className="space-y-3">
        {value.map((pair, i) => (
          <div key={i} className="rounded-sm border border-neutral-200 p-2.5 dark:border-neutral-800">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">#{i + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`${ghostButtonClass} px-1`}
                  aria-label={`Move ${field.label} ${i + 1} up`}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className={`${ghostButtonClass} px-1`}
                  aria-label={`Move ${field.label} ${i + 1} down`}
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className={`${ghostButtonClass} px-1.5`}
                  aria-label={`Remove ${field.label} ${i + 1}`}
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                  disabled={value.length <= min}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label htmlFor={`${field.key}-${i}-first`} className="mb-1 block text-xs text-neutral-500">
                  {firstLabel}
                </label>
                <textarea
                  id={`${field.key}-${i}-first`}
                  className={`${inputClass} min-h-[64px] resize-y`}
                  value={pair.first}
                  onChange={(e) => update(i, "first", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor={`${field.key}-${i}-second`} className="mb-1 block text-xs text-neutral-500">
                  {secondLabel}
                </label>
                <textarea
                  id={`${field.key}-${i}-second`}
                  className={`${inputClass} min-h-[64px] resize-y`}
                  value={pair.second}
                  onChange={(e) => update(i, "second", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {field.helpText && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{field.helpText}</p>}
      <button
        type="button"
        className={`${secondaryButtonClass} mt-2`}
        onClick={() => onChange([...value, { first: "", second: "" }])}
        disabled={value.length >= max}
      >
        <Plus size={14} /> Add {field.pairLabels ? `${field.pairLabels[0]}/${field.pairLabels[1]}` : "pair"}
      </button>
    </div>
  );
}
