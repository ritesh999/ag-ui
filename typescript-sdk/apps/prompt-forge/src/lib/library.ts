import type { CommonFields, SavedPrompt } from "../types";
import { readJSON, writeJSON } from "./storage";

const LIBRARY_KEY = "promptforge:library";

export function loadLibrary(): SavedPrompt[] {
  return readJSON<SavedPrompt[]>(LIBRARY_KEY, []);
}

function saveLibrary(entries: SavedPrompt[]): void {
  writeJSON(LIBRARY_KEY, entries);
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function addSavedPrompt(entry: {
  name: string;
  technique: string;
  common: CommonFields;
  extra: Record<string, unknown>;
  generatedPrompt: string;
}): SavedPrompt {
  const now = new Date().toISOString();
  const saved: SavedPrompt = {
    id: makeId(),
    name: entry.name,
    technique: entry.technique,
    common: entry.common,
    extra: entry.extra,
    generatedPrompt: entry.generatedPrompt,
    createdAt: now,
    updatedAt: now,
  };
  const entries = loadLibrary();
  entries.unshift(saved);
  saveLibrary(entries);
  return saved;
}

export function duplicateSavedPrompt(id: string): SavedPrompt | null {
  const entries = loadLibrary();
  const original = entries.find((e) => e.id === id);
  if (!original) return null;
  const now = new Date().toISOString();
  const copy: SavedPrompt = {
    ...original,
    id: makeId(),
    name: `${original.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
  entries.unshift(copy);
  saveLibrary(entries);
  return copy;
}

export function renameSavedPrompt(id: string, name: string): void {
  const entries = loadLibrary();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return;
  entries[index] = { ...entries[index], name, updatedAt: new Date().toISOString() };
  saveLibrary(entries);
}

export function deleteSavedPrompt(id: string): void {
  saveLibrary(loadLibrary().filter((e) => e.id !== id));
}
