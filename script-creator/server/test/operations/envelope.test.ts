import { describe, expect, it } from 'vitest';
import { buildEnvelopePrompt } from '../../src/operations/envelope.js';
import { OPERATIONS } from '../../src/operations/registry.js';

describe('operation envelope', () => {
  it('contains only the skill reference, operation label, and verbatim inputs', () => {
    const op = OPERATIONS['rewrite-selection']!;
    const inputs = { topic_brief: null, approved_lessons: ['Keep hooks short.'], selection: 'x', surrounding_context: { before: 'a', after: 'b' }, narrative_job: 'j', creative_status: { phase: 'rapid-prototype' }, requested_scope: 'replace only' };
    const prompt = buildEnvelopePrompt(op, inputs);
    expect(prompt).toBe(`$writing-whp-youtube-scripts\nOperation: Rewrite selection\nInputs: ${JSON.stringify(inputs)}`);
  });
});
