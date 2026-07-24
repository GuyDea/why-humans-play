import { describe, expect, it } from 'vitest';
import { OPERATIONS } from '../../src/operations/registry.js';

const OPERATION_NAMES = [
  'generate-scoped',
  'generate-episode',
  'generate-architecture',
  'review',
  'review-architecture',
  'rewrite-selection',
  'rewrite-architecture-section',
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
  it('contains exactly the fifteen supported operations', () => {
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
      'generate-architecture': ['read-only', 'episode'],
      review: ['read-only', 'scoped'],
      'review-architecture': ['read-only', 'scoped'],
      'rewrite-selection': ['read-only', 'scoped'],
      'rewrite-architecture-section': ['read-only', 'scoped'],
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
      'review-architecture',
      'rewrite-selection',
      'rewrite-architecture-section',
      'generate-alternatives',
    ]);
  });

  it('uses schemas for structured operations and raw output for long-form artifacts', () => {
    const raw = Object.values(OPERATIONS)
      .filter((operation) => operation.result.kind === 'raw')
      .map((operation) => operation.name);

    expect(raw).toEqual([
      'generate-episode',
      'generate-architecture',
      'promote',
      'full-topic-run',
      'handoff-preview',
    ]);
  });

  it('registers the architecture operations with their exact result and resume contracts', () => {
    expect(OPERATIONS['generate-architecture']).toMatchObject({
      skill: 'writing-whp-youtube-scripts',
      operationLabel: 'Generate architecture',
      sandbox: 'read-only',
      timeoutClass: 'episode',
      result: { kind: 'raw' },
      resumable: false,
    });
    expect(OPERATIONS['review-architecture']).toMatchObject({
      skill: 'writing-whp-youtube-scripts',
      operationLabel: 'Review architecture',
      sandbox: 'read-only',
      timeoutClass: 'scoped',
      result: { kind: 'schema' },
      resumable: true,
    });
    expect(OPERATIONS['rewrite-architecture-section']).toMatchObject({
      skill: 'writing-whp-youtube-scripts',
      operationLabel: 'Rewrite architecture section',
      sandbox: 'read-only',
      timeoutClass: 'scoped',
      result: { kind: 'schema' },
      resumable: true,
    });
  });

  it('activates Distill as a fresh-only scoped read-only script operation', () => {
    expect(OPERATIONS.distill).toMatchObject({
      name: 'distill',
      skill: 'writing-whp-youtube-scripts',
      operationLabel: 'Distill session lessons',
      sandbox: 'read-only',
      timeoutClass: 'scoped',
      result: { kind: 'schema' },
      resumable: false,
    });
  });
});
