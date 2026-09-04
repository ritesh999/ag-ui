import { Info } from "lucide-react";
import type { TechniqueDefinition } from "../techniques/types";
import { inputClass, cardClass } from "../lib/ui";

interface TechniquePickerProps {
  techniques: TechniqueDefinition<never>[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function TechniquePicker({ techniques, selectedId, onSelect }: TechniquePickerProps) {
  return (
    <div>
      {/* Mobile: collapses to a dropdown */}
      <div className="mb-4 sm:hidden">
        <label htmlFor="technique-select" className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Technique
        </label>
        <select id="technique-select" className={inputClass} value={selectedId} onChange={(e) => onSelect(e.target.value)}>
          {techniques.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop / tablet: card grid */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {techniques.map((t) => {
          const selected = t.id === selectedId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-pressed={selected}
              className={`${cardClass} relative flex flex-col items-start gap-2 p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                selected ? "border-accent ring-1 ring-accent" : "hover:border-neutral-300 dark:hover:border-neutral-700"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{t.name}</span>
                {t.infoTooltip && (
                  <span className="group relative inline-flex">
                    <Info size={14} className="text-neutral-400" aria-hidden />
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute right-0 top-5 z-10 hidden w-56 rounded-sm border border-neutral-200 bg-white p-2 text-xs font-normal normal-case text-neutral-600 shadow-lg group-hover:block group-focus-within:block dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      {t.infoTooltip}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.description}</p>
              <span className="mt-auto inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {t.bestFor}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
