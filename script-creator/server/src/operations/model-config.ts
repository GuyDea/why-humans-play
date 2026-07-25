// Single source of truth for per-operation model/effort validation.
// Reused by the HTTP guards, the operation service, and daemon env fallbacks.

export const EFFORT_VALUES = [
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
] as const;

export type CodexEffort = (typeof EFFORT_VALUES)[number];

export const MODEL_REGEX = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function isValidEffort(value: string): value is CodexEffort {
  return (EFFORT_VALUES as readonly string[]).includes(value);
}

export function isValidModel(value: string): boolean {
  return MODEL_REGEX.test(value);
}

export const EFFORT_ERROR = `effort must be one of ${EFFORT_VALUES.join(', ')}`;
export const MODEL_ERROR =
  'model must be 1-64 characters of letters, digits, dot, underscore, or hyphen';

/** Validate a required string value, throwing a client-facing message. */
export function validateModel(value: string): string {
  if (!isValidModel(value)) throw new Error(MODEL_ERROR);
  return value;
}

export function validateEffort(value: string): string {
  if (!isValidEffort(value)) throw new Error(EFFORT_ERROR);
  return value;
}
