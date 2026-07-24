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

  it.each([
    [
      'generate-architecture',
      'Generate architecture',
      {
        topic_brief: '# Brief',
        approved_lessons: ['Keep the causal chain explicit.'],
        user_constraints: null,
      },
    ],
    [
      'review-architecture',
      'Review architecture',
      {
        architecture_md: '### Core answer\n\nA mechanism.',
        topic_brief: '# Brief',
      },
    ],
    [
      'rewrite-architecture-section',
      'Rewrite architecture section',
      {
        section_key: 'core-answer',
        section_markdown: '### Core answer\n\nA mechanism.',
        architecture_md: '### Core answer\n\nA mechanism.',
        topic_brief: '# Brief',
        user_instruction: 'Make the mechanism more specific.',
      },
    ],
  ] as const)(
    'keeps the %s prompt provenance-pure',
    (name, operationLabel, inputs) => {
      const prompt = buildEnvelopePrompt(OPERATIONS[name], inputs);

      expect(prompt).toBe(
        `$writing-whp-youtube-scripts\nOperation: ${operationLabel}\nInputs: ${JSON.stringify(inputs)}`,
      );
    },
  );
});
