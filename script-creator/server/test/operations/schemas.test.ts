import { describe, expect, it } from 'vitest';
import { OPERATIONS } from '../../src/operations/registry.js';

function assertStrict(schema: Record<string, unknown>, path: string): void {
  if (schema.type === 'object' || schema.properties) {
    const props = Object.keys((schema.properties ?? {}) as Record<string, unknown>);
    const required = (schema.required ?? []) as string[];
    expect(schema.additionalProperties, `${path}.additionalProperties`).toBe(false);
    for (const p of props) expect(required, `${path}.required must include ${p}`).toContain(p);
    for (const p of props) assertStrict((schema.properties as Record<string, Record<string, unknown>>)[p]!, `${path}.${p}`);
  }
  if (schema.items) assertStrict(schema.items as Record<string, unknown>, `${path}[]`);
}

describe('operation schemas', () => {
  it('every schema operation is strict-mode compatible', () => {
    for (const op of Object.values(OPERATIONS)) {
      if (op.result.kind === 'schema') assertStrict(op.result.schema as Record<string, unknown>, op.name);
    }
  });

  it('every schema shares the status/guardrail frame', () => {
    for (const op of Object.values(OPERATIONS)) {
      if (op.result.kind !== 'schema') continue;
      const props = (op.result.schema as { properties: Record<string, unknown> }).properties;
      expect(Object.keys(props), op.name).toEqual(expect.arrayContaining(['status', 'guardrail_markdown']));
    }
  });
});

describe('operation schema payloads', () => {
  it.each([
    ['generate-scoped', ['status', 'replacement_markdown', 'guardrail_markdown']],
    ['review', ['status', 'findings', 'guardrail_markdown']],
    ['rewrite-selection', ['status', 'replacement_markdown', 'guardrail_markdown']],
    ['generate-alternatives', ['status', 'options', 'guardrail_markdown']],
    ['ideate', ['status', 'cards', 'guardrail_markdown']],
    ['quick-gate-check', ['status', 'verdict', 'gates', 'guardrail_markdown']],
    ['package-test', ['status', 'directions', 'guardrail_markdown']],
    ['distill', ['status', 'lessons', 'guardrail_markdown']],
  ] as const)('%s exposes its normative top-level fields', (name, fields) => {
    const operation = OPERATIONS[name];
    expect(operation.result.kind).toBe('schema');
    if (operation.result.kind !== 'schema') return;

    const properties = (operation.result.schema as {
      properties: Record<string, unknown>;
    }).properties;
    expect(Object.keys(properties)).toEqual(fields);
  });

  it.each([
    ['review', 'findings', ['anchor', 'severity', 'finding_markdown', 'optional_direction_markdown']],
    ['generate-alternatives', 'options', ['label', 'markdown']],
    ['ideate', 'cards', ['subject', 'angle_markdown', 'seed']],
    ['quick-gate-check', 'gates', ['gate', 'verdict', 'reason_markdown']],
    ['package-test', 'directions', [
      'working_title',
      'intended_viewer',
      'familiar_markdown',
      'surprise_markdown',
      'visual_promise_markdown',
      'delivered_payoff_markdown',
      'survives_honestly',
      'reason_markdown',
    ]],
    ['distill', 'lessons', [
      'classification',
      'lesson_markdown',
      'evidence',
      'proposed_target',
    ]],
  ] as const)('%s exposes the normative %s item fields', (name, payload, fields) => {
    const operation = OPERATIONS[name];
    expect(operation.result.kind).toBe('schema');
    if (operation.result.kind !== 'schema') return;

    const schema = operation.result.schema as {
      properties: Record<string, Record<string, unknown>>;
    };
    const items = schema.properties[payload]!.items as {
      properties: Record<string, unknown>;
    };
    expect(Object.keys(items.properties)).toEqual(fields);
  });
});
