import { Injectable, signal } from '@angular/core';

// A stored preference sets at least one of model/effort; each maps to an
// independent codex flag, so model-only and effort-only choices are valid.
export interface ModelChoice {
  model?: string;
  effort?: string;
}

/** Read-only view used by launch-time preference resolution. */
export interface ModelPreferenceReader {
  get(operation: string): ModelChoice | null;
}

/** Read/write view used by the toolbar dropdown. */
export interface ModelPreferenceStore extends ModelPreferenceReader {
  set(operation: string, choice: ModelChoice | null): void;
}

export const MODEL_PREFERENCE_STORAGE_KEY = 'sc.model-preference.v1';
const DEFAULT_KEY = 'default';

type PreferenceMap = Record<string, ModelChoice>;

function normalizeChoice(value: unknown): ModelChoice | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record['model'] !== undefined && typeof record['model'] !== 'string') {
    return null;
  }
  if (record['effort'] !== undefined && typeof record['effort'] !== 'string') {
    return null;
  }
  const choice: ModelChoice = {};
  if (typeof record['model'] === 'string') choice.model = record['model'];
  if (typeof record['effort'] === 'string') choice.effort = record['effort'];
  return choice.model === undefined && choice.effort === undefined
    ? null
    : choice;
}

function readStored(): PreferenceMap {
  try {
    const raw = localStorage.getItem(MODEL_PREFERENCE_STORAGE_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    const result: PreferenceMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      const choice = normalizeChoice(value);
      if (choice) result[key] = choice;
    }
    return result;
  } catch {
    // Corrupt or unavailable storage falls back to no preferences.
    return {};
  }
}

function writeStored(map: PreferenceMap): void {
  try {
    localStorage.setItem(MODEL_PREFERENCE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // A failed write leaves the in-memory signal as the session's source.
  }
}

/**
 * A signal-backed store for per-operation model/effort preferences, persisted
 * to localStorage. `get` falls back to the shared 'default' key so a single
 * toolbar choice applies across every operation kind.
 */
@Injectable({ providedIn: 'root' })
export class ModelPreferenceService implements ModelPreferenceReader {
  private readonly preferences = signal<PreferenceMap>(readStored());

  get(operation: string): ModelChoice | null {
    const map = this.preferences();
    return map[operation] ?? map[DEFAULT_KEY] ?? null;
  }

  set(operation: string, choice: ModelChoice | null): void {
    this.preferences.update((current) => {
      const next = { ...current };
      const normalized = choice === null ? null : normalizeChoice(choice);
      if (normalized === null) {
        delete next[operation];
      } else {
        next[operation] = normalized;
      }
      writeStored(next);
      return next;
    });
  }
}
