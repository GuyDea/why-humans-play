import { describe, expect, it } from 'vitest';
import {
  ClaudeBackend,
  CodexBackend,
  isClaudeModel,
  selectBackend,
} from '../../src/backends/index.js';

describe('isClaudeModel', () => {
  it('matches claude-* ids and the short aliases, case-insensitively', () => {
    for (const model of [
      'claude-opus-4-8', 'claude-fable-5', 'CLAUDE-X',
      'opus', 'fable', 'sonnet', 'haiku', 'HAIKU',
    ]) {
      expect(isClaudeModel(model), model).toBe(true);
    }
  });

  it('treats gpt models, unknown ids, and the Default (undefined) as codex', () => {
    for (const model of ['gpt-5.6-sol', 'gpt-5', 'something', '']) {
      expect(isClaudeModel(model), model).toBe(false);
    }
    expect(isClaudeModel(undefined)).toBe(false);
  });
});

describe('selectBackend', () => {
  it('instantiates the claude backend for backend="claude"', () => {
    expect(selectBackend('claude')).toBeInstanceOf(ClaudeBackend);
  });

  it('defaults to the codex backend for "codex" and undefined', () => {
    expect(selectBackend('codex')).toBeInstanceOf(CodexBackend);
    expect(selectBackend(undefined)).toBeInstanceOf(CodexBackend);
  });
});
