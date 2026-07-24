import { describe, expect, it } from 'vitest';
import { ARCHITECTURE_SECTION_KEYS } from '../../src/architecture/codec.js';
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

  it('registers a strict summary sidecar schema for the raw full topic run', () => {
    const result = OPERATIONS['full-topic-run'].result as {
      kind: 'raw';
      summarySchema?: Record<string, unknown>;
    };

    expect(result.kind).toBe('raw');
    expect(result.summarySchema).toBeDefined();
    assertStrict(result.summarySchema!, 'full-topic-run.summary');
  });

  it('every schema shares the status/guardrail frame', () => {
    for (const op of Object.values(OPERATIONS)) {
      if (op.result.kind !== 'schema') continue;
      const props = (op.result.schema as { properties: Record<string, unknown> }).properties;
      expect(Object.keys(props), op.name).toEqual(expect.arrayContaining(['status', 'guardrail_markdown']));
    }
  });

  it('requires exactly the six fixed quick-gate-check gates', () => {
    const operation = OPERATIONS['quick-gate-check'];
    expect(operation.result.kind).toBe('schema');
    if (operation.result.kind !== 'schema') return;

    const gates = (operation.result.schema as {
      properties: Record<string, Record<string, unknown>>;
    }).properties['gates'];
    expect(gates).toMatchObject({
      type: 'array',
      minItems: 6,
      maxItems: 6,
    });
  });

  it('requires the fixed architecture section-key enum in every review finding', () => {
    const operation = OPERATIONS['review-architecture'];
    expect(operation.result.kind).toBe('schema');
    if (operation.result.kind !== 'schema') return;

    const schema = operation.result.schema as {
      properties: {
        findings: {
          items: {
            properties: {
              section_key: { enum: readonly string[] };
            };
          };
        };
      };
    };
    expect(schema.properties.findings.items.properties.section_key.enum)
      .toEqual(ARCHITECTURE_SECTION_KEYS);
  });

  it('requires the fixed architecture section-key enum in rewrite results', () => {
    const operation = OPERATIONS['rewrite-architecture-section'];
    expect(operation.result.kind).toBe('schema');
    if (operation.result.kind !== 'schema') return;

    const schema = operation.result.schema as {
      properties: {
        section_key: { enum: readonly string[] };
      };
    };
    expect(schema.properties.section_key.enum)
      .toEqual(ARCHITECTURE_SECTION_KEYS);
  });
});

describe('operation schema payloads', () => {
  it.each([
    ['generate-scoped', ['status', 'replacement_markdown', 'guardrail_markdown']],
    ['review', ['status', 'findings', 'guardrail_markdown']],
    [
      'review-architecture',
      ['status', 'findings', 'guardrail_markdown'],
    ],
    ['rewrite-selection', ['status', 'replacement_markdown', 'guardrail_markdown']],
    [
      'rewrite-architecture-section',
      [
        'status',
        'section_key',
        'replacement_markdown',
        'guardrail_markdown',
      ],
    ],
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
    [
      'review-architecture',
      'findings',
      ['section_key', 'severity', 'finding_markdown'],
    ],
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
