import { describe, expect, it } from 'vitest';
import {
  buildOperationInputs,
  type OperationContext,
  type OperationInputRequest,
  type OperationInputs,
} from './context';

const context: OperationContext = {
  selection: 'The selected passage.',
  before: 'The paragraph before.',
  after: 'The paragraph after.',
  beatTitle: '3. The voluntary obstacle',
  narrativeJob: 'Turn the example into the larger question.',
  brief: {
    topic: 'Why humans make simple things harder on purpose',
    factual_anchors: ['Golf has artificial constraints.', 'Players voluntarily accept them.'],
    unknowns: ['Which historical example will survive evidence review?'],
  },
  creativeStatus: {
    phase: 'rapid-prototype',
    locked_surrounding_text: true,
  },
  approvedLessons: ['Keep the question concrete.'],
  requestedScope: 'Change only the selected passage.',
};

const INPUT_KEYS = [
  'topic_brief',
  'approved_lessons',
  'selection',
  'surrounding_context',
  'beat_title',
  'narrative_job',
  'creative_status',
  'requested_scope',
];

function expectVerbatimContext(
  inputs: OperationInputs,
): void {
  expect(Object.keys(inputs)).toEqual(INPUT_KEYS);
  expect(inputs.topic_brief).toBe(context.brief);
  expect(Object.keys(inputs.topic_brief)).toEqual([
    'topic',
    'factual_anchors',
    'unknowns',
  ]);
  expect(inputs.topic_brief.topic).toBe(context.brief.topic);
  expect(inputs.topic_brief.factual_anchors).toBe(context.brief.factual_anchors);
  expect(inputs.topic_brief.unknowns).toBe(context.brief.unknowns);
  expect(inputs.approved_lessons).toBe(context.approvedLessons);
  expect(inputs.selection).toBe(context.selection);
  expect(Object.keys(inputs.surrounding_context)).toEqual(['before', 'after']);
  expect(inputs.surrounding_context.before).toBe(context.before);
  expect(inputs.surrounding_context.after).toBe(context.after);
  expect(inputs.beat_title).toBe(context.beatTitle);
  expect(inputs.narrative_job).toBe(context.narrativeJob);
  expect(inputs.creative_status).toBe(context.creativeStatus);
}

describe('buildOperationInputs', () => {
  it('accepts the exported operation request union', () => {
    const buildFromRequest = (operation: OperationInputRequest) =>
      buildOperationInputs(context, operation);

    expect(buildFromRequest('review').requested_scope)
      .toBe(context.requestedScope);
  });

  it.each(['rewrite-selection', 'review'] as const)(
    'maps %s inputs from explicit context with no extra keys',
    (operation) => {
      const inputs = buildOperationInputs(context, operation);

      expectVerbatimContext(inputs);
      expect(inputs.requested_scope).toBe(context.requestedScope);
    },
  );

  it('maps alternative count and instruction into the requested scope', () => {
    const inputs = buildOperationInputs(context, {
      kind: 'generate-alternatives',
      count: 3,
    });

    expectVerbatimContext(inputs);
    expect(Object.keys(inputs.requested_scope)).toEqual([
      'count',
      'instruction',
    ]);
    expect(inputs.requested_scope.count).toBe(3);
    expect(inputs.requested_scope.instruction).toBe(context.requestedScope);
  });
});
