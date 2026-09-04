import { useMemo, useState } from "react";
import { Eye, X } from "lucide-react";
import { techniques, getTechnique } from "./techniques";
import { createDefaultCommonFields, type CommonFields, type SavedPrompt } from "./types";
import Header from "./components/Header";
import TechniquePicker from "./components/TechniquePicker";
import PromptForm from "./components/PromptForm";
import PromptPreview from "./components/PromptPreview";
import Library from "./components/Library";
import StorageNotice from "./components/StorageNotice";
import { useTheme } from "./hooks/useTheme";
import { useStorageNotice } from "./hooks/useStorageNotice";
import { addSavedPrompt } from "./lib/library";
import { primaryButtonClass, ghostButtonClass } from "./lib/ui";

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [storageWarning, dismissStorageWarning] = useStorageNotice();

  const [techniqueId, setTechniqueId] = useState(techniques[0].id);
  const [common, setCommon] = useState<CommonFields>(createDefaultCommonFields);
  const [extraByTechnique, setExtraByTechnique] = useState<Record<string, Record<string, unknown>>>({});

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const technique = getTechnique(techniqueId);

  const extra = useMemo(
    () => extraByTechnique[techniqueId] ?? technique.createDefaultExtra(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [techniqueId, extraByTechnique],
  );

  function setExtra(updater: (prev: Record<string, unknown>) => Record<string, unknown>) {
    setExtraByTechnique((prev) => ({
      ...prev,
      [techniqueId]: updater(prev[techniqueId] ?? technique.createDefaultExtra()),
    }));
  }

  function handleSelectTechnique(id: string) {
    setTechniqueId(id);
    setExtraByTechnique((prev) => (prev[id] ? prev : { ...prev, [id]: getTechnique(id).createDefaultExtra() }));
  }

  const generatedPrompt = useMemo(() => technique.assemble(common, extra as never), [technique, common, extra]);

  function handleReset() {
    setCommon(createDefaultCommonFields());
    setExtraByTechnique((prev) => ({ ...prev, [techniqueId]: technique.createDefaultExtra() }));
  }

  function handleSave(name: string) {
    addSavedPrompt({ name, technique: techniqueId, common, extra, generatedPrompt });
    setLibraryRefreshKey((k) => k + 1);
  }

  function handleLoad(entry: SavedPrompt) {
    setTechniqueId(entry.technique);
    setCommon(entry.common);
    setExtraByTechnique((prev) => ({ ...prev, [entry.technique]: entry.extra }));
    setLibraryOpen(false);
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Header theme={theme} onToggleTheme={toggleTheme} onOpenLibrary={() => setLibraryOpen(true)} />
      {storageWarning && <StorageNotice onDismiss={dismissStorageWarning} />}

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:pb-6">
        <section className="mb-6">
          <h1 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Step 1 · Choose technique</h1>
          <TechniquePicker techniques={techniques} selectedId={techniqueId} onSelect={handleSelectTechnique} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Step 2 · Fill the form</h2>
            <PromptForm
              technique={technique}
              common={common}
              setCommon={setCommon}
              extra={extra}
              setExtra={setExtra}
              onSwitchTechnique={handleSelectTechnique}
            />
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-16">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Step 3 · Generated prompt</h2>
              <PromptPreview prompt={generatedPrompt} techniqueName={technique.name} onSave={handleSave} onReset={handleReset} />
            </div>
          </div>
        </section>
      </main>

      {/* Mobile: sticky bottom button reveals the preview */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950 lg:hidden">
        <button type="button" className={`${primaryButtonClass} w-full`} onClick={() => setMobilePreviewOpen(true)}>
          <Eye size={14} /> View prompt
        </button>
      </div>

      {mobilePreviewOpen && (
        <div role="dialog" aria-label="Generated prompt" className="fixed inset-0 z-40 flex flex-col bg-neutral-50 p-4 dark:bg-neutral-950 lg:hidden">
          <div className="mb-2 flex items-center justify-end">
            <button type="button" className={`${ghostButtonClass} px-1.5`} aria-label="Close preview" onClick={() => setMobilePreviewOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <PromptPreview prompt={generatedPrompt} techniqueName={technique.name} onSave={handleSave} onReset={handleReset} />
          </div>
        </div>
      )}

      <Library open={libraryOpen} onClose={() => setLibraryOpen(false)} techniques={techniques} onLoad={handleLoad} refreshKey={libraryRefreshKey} />
    </div>
  );
}
