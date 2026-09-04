import { useState } from "react";
import { Check, Copy, Download, RotateCcw, Save } from "lucide-react";
import { downloadMd, downloadTxt, estimateTokens, slugify } from "../lib/download";
import { primaryButtonClass, secondaryButtonClass, ghostButtonClass, inputClass } from "../lib/ui";

interface PromptPreviewProps {
  prompt: string;
  techniqueName: string;
  onSave: (name: string) => void;
  onReset: () => void;
}

export default function PromptPreview({ prompt, techniqueName, onSave, onReset }: PromptPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const chars = prompt.length;
  const tokens = estimateTokens(prompt);
  const isEmpty = prompt.trim().length === 0;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Fallback for environments without clipboard API access.
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openSave() {
    setName(`${techniqueName} prompt — ${new Date().toLocaleDateString()}`);
    setSaving(true);
  }

  function confirmSave() {
    if (!name.trim()) return;
    onSave(name.trim());
    setSaving(false);
  }

  const filenameBase = slugify(techniqueName);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Generated prompt</h2>
        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-500">
          {chars.toLocaleString()} chars · ~{tokens.toLocaleString()} tokens
        </span>
      </div>

      <div className="min-h-[16rem] flex-1 overflow-auto whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-3.5 font-mono text-[13px] leading-relaxed text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
        {isEmpty ? (
          <span className="text-neutral-400 dark:text-neutral-600">Fill in the form to see your prompt take shape…</span>
        ) : (
          prompt
        )}
      </div>

      <div aria-live="polite" className="sr-only">
        {copied ? "Prompt copied to clipboard" : ""}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={primaryButtonClass} onClick={handleCopy} disabled={isEmpty}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button type="button" className={secondaryButtonClass} onClick={() => downloadTxt(`${filenameBase}.txt`, prompt)} disabled={isEmpty}>
          <Download size={14} /> .txt
        </button>
        <button type="button" className={secondaryButtonClass} onClick={() => downloadMd(`${filenameBase}.md`, prompt)} disabled={isEmpty}>
          <Download size={14} /> .md
        </button>
        <button type="button" className={secondaryButtonClass} onClick={openSave} disabled={isEmpty}>
          <Save size={14} /> Save to library
        </button>
        <button type="button" className={ghostButtonClass} onClick={onReset}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {saving && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-sm border border-neutral-200 p-2.5 dark:border-neutral-800">
          <label htmlFor="save-name" className="sr-only">
            Prompt name
          </label>
          <input
            id="save-name"
            type="text"
            className={`${inputClass} flex-1`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmSave()}
            autoFocus
          />
          <button type="button" className={primaryButtonClass} onClick={confirmSave} disabled={!name.trim()}>
            Save
          </button>
          <button type="button" className={ghostButtonClass} onClick={() => setSaving(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
