import { useEffect, useState } from "react";
import { safeStorage } from "../lib/storage";

/** True once localStorage has proven unavailable, so the UI can show a dismissible notice. */
export function useStorageNotice(): [boolean, () => void] {
  const [unavailable, setUnavailable] = useState(!safeStorage.isAvailable());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => safeStorage.onUnavailable(() => setUnavailable(true)), []);

  return [unavailable && !dismissed, () => setDismissed(true)];
}
