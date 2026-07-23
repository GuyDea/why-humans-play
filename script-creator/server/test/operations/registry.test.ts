import { describe, expect, it } from 'vitest';
import { OPERATIONS } from '../../src/operations/registry.js';

const OPERATION_NAMES = [
  'generate-scoped',
  'generate-episode',
  'review',
  'rewrite-selection',
  'generate-alternatives',
  'promote',
  'ideate',
  'quick-gate-check',
  'package-test',
  'full-topic-run',
  'handoff-preview',
  'distill',
] as const;

describe('operation registry', () => {
  it('contains exactly the twelve supported operations', () => {
    expect(Object.keys(OPERATIONS)).toEqual(OPERATION_NAMES);
    for (const name of OPERATION_NAMES) {
      expect(OPERATIONS[name].name).toBe(name);
    }
  });

  it('assigns sandbox and timeout classes from the design', () => {
    expect(Object.fromEntries(
      Object.entries(OPERATIONS).map(([name, operation]) => [
        name,
        [operation.sandbox, operation.timeoutClass],
      ]),
    )).toEqual({
      'generate-scoped': ['read-only', 'scoped'],
      'generate-episode': ['read-only', 'episode'],
      review: ['read-only', 'scoped'],
      'rewrite-selection': ['read-only', 'scoped'],
      'generate-alternatives': ['read-only', 'scoped'],
      promote: ['workspace-write', 'long'],
      ideate: ['read-only', 'scoped'],
      'quick-gate-check': ['read-only', 'scoped'],
      'package-test': ['read-only', 'scoped'],
      'full-topic-run': ['workspace-write', 'long'],
      'handoff-preview': ['read-only', 'episode'],
      distill: ['read-only', 'scoped'],
    });
  });

  it('allows resume only for scoped script operations', () => {
    const resumable = Object.values(OPERATIONS)
      .filter((operation) => operation.resumable)
      .map((operation) => operation.name);

    expect(resumable).toEqual([
      'generate-scoped',
      'review',
      'rewrite-selection',
      'generate-alternatives',
    ]);
  });

  it('uses schemas for structured operations and raw output for long-form artifacts', () => {
    const raw = Object.values(OPERATIONS)
      .filter((operation) => operation.result.kind === 'raw')
      .map((operation) => operation.name);

    expect(raw).toEqual([
      'generate-episode',
      'promote',
      'full-topic-run',
      'handoff-preview',
    ]);
  });
});
