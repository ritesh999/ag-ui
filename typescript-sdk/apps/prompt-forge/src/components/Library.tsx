import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Pencil, Trash2, Upload, X } from "lucide-react";
import type { SavedPrompt } from "../types";
import type { TechniqueDefinition } from "../techniques/types";
import { deleteSavedPrompt, duplicateSavedPrompt, loadLibrary, renameSavedPrompt } from "../lib/library";
import { inputClass, primaryButtonClass, ghostButtonClass } from "../lib/ui";

interface LibraryProps {
  open: boolean;
  onClose: () => void;
  techniques: TechniqueDefinition<never>[];
  onLoad: (entry: SavedPrompt) => void;
  refreshKey: number;
}

export default function Library({ open, onClose, techniques, onLoad, refreshKey }: LibraryProps) {
  const [entries, setEntries] = useState<SavedPrompt[]>([]);
  const [search, setSearch] = useState("");
  const [filterTechnique, setFilterTechnique] = useState("all");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setEntries(loadLibrary());
  }, [open, refreshKey]);

  const techniqueName = useMemo(() => {
    const map = new Map(techniques.map((t) => [t.id, t.name]));
    return (id: string) => map.get(id) ?? id;
  }, [techniques]);

  const filtered = entries.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesTechnique = filterTechnique === "all" || e.technique === filterTechnique;
    return matchesSearch && matchesTechnique;
  });

  function refresh() {
    setEntries(loadLibrary());
  }

  function startRename(entry: SavedPrompt) {
    setRenamingId(entry.id);
    setRenameValue(entry.name);
  }

  function confirmRename() {
    if (renamingId && renameValue.trim()) {
      renameSavedPrompt(renamingId, renameValue.trim());
      refresh();
    }
    setRenamingId(null);
  }

  async function handleCopy(entry: SavedPrompt) {
    try {
      await navigator.clipboard.writeText(entry.generatedPrompt);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore, the entry can still be loaded.
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Close library" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-label="Prompt library" className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Library</h2>
          <button type="button" className={`${ghostButtonClass} px-1.5`} aria-label="Close library" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="mb-3 space-y-2">
          <input
            type="text"
            className={inputClass}
            placeholder="Search by name…"
            aria-label="Search saved prompts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={inputClass}
            aria-label="Filter by technique"
            value={filterTechnique}
            onChange={(e) => setFilterTechnique(e.target.value)}
          >
            <option value="all">All techniques</option>
            {techniques.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-2 overflow-auto">
          {filtered.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-500">No saved prompts yet.</p>}
          {filtered.map((entry) => (
            <div key={entry.id} className="rounded-sm border border-neutral-200 p-2.5 dark:border-neutral-800">
              {renamingId === entry.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className={inputClass}
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmRename()}
                  />
                  <button type="button" className={primaryButtonClass} onClick={confirmRename}>
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{entry.name}</span>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {techniqueName(entry.technique)}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-500">
                    {new Date(entry.updatedAt).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className={`${ghostButtonClass} px-2 py-1 text-xs`} onClick={() => onLoad(entry)}>
                      <Upload size={12} /> Load
                    </button>
                    <button
                      type="button"
                      className={`${ghostButtonClass} px-2 py-1 text-xs`}
                      onClick={() => {
                        duplicateSavedPrompt(entry.id);
                        refresh();
                      }}
                    >
                      Duplicate
                    </button>
                    <button type="button" className={`${ghostButtonClass} px-2 py-1 text-xs`} onClick={() => startRename(entry)}>
                      <Pencil size={12} /> Rename
                    </button>
                    <button type="button" className={`${ghostButtonClass} px-2 py-1 text-xs`} onClick={() => handleCopy(entry)}>
                      {copiedId === entry.id ? <Check size={12} /> : <Copy size={12} />} Copy
                    </button>
                    <button
                      type="button"
                      className={`${ghostButtonClass} px-2 py-1 text-xs text-red-600 dark:text-red-400`}
                      onClick={() => {
                        deleteSavedPrompt(entry.id);
                        refresh();
                      }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
