// ---------------------------------------------------------------------------
// storage.ts
// Saving data in the browser with localStorage, so your vocabulary, history
// and settings are still there when you come back.
//
// localStorage only stores text, so we convert objects to JSON and back.
// Every access is wrapped in try/catch: localStorage can fail (private mode,
// full storage), and the app should keep working anyway.
// ---------------------------------------------------------------------------
import type { NewWord, Settings, VocabWord } from "../types";

export const KEYS = {
  settings: "max.settings",
  vocabulary: "max.vocabulary",
  summaries: "max.summaries",
  session: "max.session",
  faceSession: "max.faceSession",
} as const;

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked: ignore, the app still works in memory.
  }
}

export const DEFAULT_SETTINGS: Settings = {
  level: "intermediate",
  rate: 0.95,
  voiceURI: "",
  autoSpeak: true,
  corrections: true,
  theme: "system",
};

/** A short random id for messages and saved items. */
export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * Adds new words to the notebook, skipping words that are already saved
 * (comparing without upper/lower case differences).
 */
export function mergeWords(existing: VocabWord[], incoming: NewWord[]): VocabWord[] {
  const known = new Set(existing.map((w) => w.word.trim().toLowerCase()));
  const added: VocabWord[] = [];
  for (const w of incoming) {
    const key = w.word.trim().toLowerCase();
    if (!key || known.has(key)) continue;
    known.add(key);
    added.push({ ...w, id: newId(), addedAt: new Date().toISOString(), score: 0 });
  }
  return added.length ? [...added, ...existing] : existing;
}
