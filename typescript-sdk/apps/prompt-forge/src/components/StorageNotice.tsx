import { AlertTriangle, X } from "lucide-react";
import { ghostButtonClass } from "../lib/ui";

interface StorageNoticeProps {
  onDismiss: () => void;
}

export default function StorageNotice({ onDismiss }: StorageNoticeProps) {
  return (
    <div role="status" className="flex items-center justify-between gap-2 border-b border-amber-400/40 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      <span className="flex items-center gap-2">
        <AlertTriangle size={14} className="shrink-0" />
        localStorage is unavailable — Prompt Forge still works, but your library won't survive a refresh.
      </span>
      <button type="button" className={`${ghostButtonClass} px-1.5`} aria-label="Dismiss notice" onClick={onDismiss}>
        <X size={14} />
      </button>
    </div>
  );
}
