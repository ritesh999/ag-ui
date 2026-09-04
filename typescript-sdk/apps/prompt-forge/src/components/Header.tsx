import { Hammer, Library, Moon, Sun } from "lucide-react";
import type { Theme } from "../hooks/useTheme";
import { ghostButtonClass, secondaryButtonClass } from "../lib/ui";

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  onOpenLibrary: () => void;
}

export default function Header({ theme, onToggleTheme, onOpenLibrary }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-2.5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="flex items-center gap-2">
        <Hammer size={18} className="text-accent" aria-hidden />
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">Prompt Forge</span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onOpenLibrary}>
          <Library size={14} /> Library
        </button>
        <button
          type="button"
          className={`${ghostButtonClass} px-1.5`}
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
