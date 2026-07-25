import { ClaudeBackend } from './claude.js';
import { CodexBackend } from './codex.js';
import type { RunnerBackend } from './backend.js';

export type { ParsedLine, RunnerBackend } from './backend.js';
export { CodexBackend, validCodexUsage } from './codex.js';
export {
  ClaudeBackend,
  CLAUDE_EFFORTS,
  mapClaudeSandbox,
  mapClaudeUsage,
  transformClaudePrompt,
} from './claude.js';

export type BackendName = 'codex' | 'claude';

/** Instantiate the backend named on the envelope (default 'codex'). */
export function selectBackend(backend: BackendName | undefined): RunnerBackend {
  return backend === 'claude' ? new ClaudeBackend() : new CodexBackend();
}

const CLAUDE_MODEL_ALIASES = new Set(['opus', 'fable', 'sonnet', 'haiku']);

/**
 * Decide whether a model id selects the Claude backend: any `claude*` id, or
 * one of the short Claude aliases. Undefined (the Default option) is codex.
 */
export function isClaudeModel(model: string | undefined): boolean {
  if (!model) return false;
  return /^claude/i.test(model) || CLAUDE_MODEL_ALIASES.has(model.toLowerCase());
}
