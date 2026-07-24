import { describe, expect, it } from 'vitest';
import {
  buildGenerateArchitectureInputs,
  buildReviewArchitectureInputs,
  buildRewriteArchitectureInputs,
} from './inputs';

const topicBrief = {
  topic: 'Why constraints create play',
  factual_anchors: ['Players voluntarily accept the rule.'],
  unknowns: ['Which opening example survives review?'],
};
const approvedLessons = ['Keep the language concrete.'];
const userConstraints = {
  notes: 'Keep the episode visually demonstrable.',
};
const architectureMd = [
  '### Package and audience',
  '',
  'A supplied package.',
  '',
].join('\n');

describe('architecture operation inputs', () => {
  it('maps Generate fields verbatim with no extra keys', () => {
    const inputs = buildGenerateArchitectureInputs({
      topicBrief,
      approvedLessons,
      userConstraints,
    });

    expect(Object.keys(inputs)).toEqual([
      'topic_brief',
      'approved_lessons',
      'user_constraints',
    ]);
    expect(inputs.topic_brief).toBe(topicBrief);
    expect(inputs.approved_lessons).toBe(approvedLessons);
    expect(inputs.user_constraints).toBe(userConstraints);
  });

  it('maps Review fields verbatim with no extra keys', () => {
    const inputs = buildReviewArchitectureInputs({
      architectureMd,
      topicBrief,
    });

    expect(Object.keys(inputs)).toEqual([
      'architecture_md',
      'topic_brief',
    ]);
    expect(inputs.architecture_md).toBe(architectureMd);
    expect(inputs.topic_brief).toBe(topicBrief);
  });

  it('maps Rewrite fields verbatim with no extra keys', () => {
    const sectionMarkdown = '### Core answer\n\nA supplied answer.\n';
    const userInstruction = 'Make the causal step explicit.';
    const inputs = buildRewriteArchitectureInputs({
      sectionKey: 'core-answer',
      sectionMarkdown,
      architectureMd,
      topicBrief,
      userInstruction,
    });

    expect(Object.keys(inputs)).toEqual([
      'section_key',
      'section_markdown',
      'architecture_md',
      'topic_brief',
      'user_instruction',
    ]);
    expect(inputs.section_key).toBe('core-answer');
    expect(inputs.section_markdown).toBe(sectionMarkdown);
    expect(inputs.architecture_md).toBe(architectureMd);
    expect(inputs.topic_brief).toBe(topicBrief);
    expect(inputs.user_instruction).toBe(userInstruction);
  });
});
