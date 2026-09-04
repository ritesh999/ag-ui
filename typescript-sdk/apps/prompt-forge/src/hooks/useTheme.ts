import { useCallback, useEffect, useState } from "react";
import { safeStorage } from "../lib/storage";

export type Theme = "dark" | "light";

const THEME_KEY = "promptforge:theme";

function getInitialTheme(): Theme {
  const stored = safeStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "dark";
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    safeStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return [theme, toggle];
}
