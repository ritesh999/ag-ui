/**
 * A localStorage wrapper that never throws. If localStorage is unavailable
 * (disabled, private mode, quota exceeded) it transparently falls back to an
 * in-memory Map so the app keeps working for the current session, and
 * notifies subscribers once so the UI can show a dismissible notice.
 */
class SafeStorage {
  private memory = new Map<string, string>();
  private available = true;
  private warned = false;
  private listeners = new Set<() => void>();

  constructor() {
    this.available = SafeStorage.probe();
  }

  private static probe(): boolean {
    try {
      const testKey = "__promptforge_probe__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private markUnavailable() {
    if (this.available) {
      this.available = false;
    }
    if (!this.warned) {
      this.warned = true;
      this.listeners.forEach((cb) => cb());
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  onUnavailable(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getItem(key: string): string | null {
    if (this.available) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        this.markUnavailable();
      }
    }
    return this.memory.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.available) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        this.markUnavailable();
      }
    }
    this.memory.set(key, value);
  }

  removeItem(key: string): void {
    if (this.available) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        this.markUnavailable();
      }
    }
    this.memory.delete(key);
  }
}

export const safeStorage = new SafeStorage();

export function readJSON<T>(key: string, fallback: T): T {
  const raw = safeStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    safeStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Guarded read/write per spec: swallow serialization errors too.
  }
}
