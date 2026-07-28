import { describe, expect, it } from 'vitest';
import {
  buildTopicOperationInputs,
  type TopicOperationContext,
} from './inputs';

const context: TopicOperationContext = {
  ideaText: 'Why do people make games harder than they need to be?',
  userConstraints: {
    market: 'English-speaking adults',
    production_window: 'Two weeks',
  },
  runArtifacts: {
    ideate_cards: [
      {
        subject: 'Voluntary obstacles',
        angle_markdown: 'Why constraints can make effort feel meaningful.',
      },
    ],
    gate_checks: ['game_play_centrality: pass'],
  },
  selectedWinner: {
    subject: 'Voluntary obstacles',
    angle_markdown: 'Why constraints can make effort feel meaningful.',
    confidence: 'medium',
  },
};

describe('buildTopicOperationInputs', () => {
  it('maps ideate inputs verbatim from explicit state with no extra keys', () => {
    const inputs = buildTopicOperationInputs(context, 'ideate');

    expect(Object.keys(inputs)).toEqual(['idea_text', 'user_constraints']);
    expect(inputs.idea_text).toBe(context.ideaText);
    expect(inputs.user_constraints).toBe(context.userConstraints);
  });

  it('maps quick gate-check inputs verbatim from explicit state with no extra keys', () => {
    const inputs = buildTopicOperationInputs(context, 'quick-gate-check');

    expect(Object.keys(inputs)).toEqual(['idea_text', 'user_constraints']);
    expect(inputs.idea_text).toBe(context.ideaText);
    expect(inputs.user_constraints).toBe(context.userConstraints);
  });

  it('maps package-test inputs verbatim from explicit state with no extra keys', () => {
    const inputs = buildTopicOperationInputs(context, 'package-test');

    expect(Object.keys(inputs)).toEqual([
      'idea_text',
      'user_constraints',
      'run_artifacts',
    ]);
    expect(inputs.idea_text).toBe(context.ideaText);
    expect(inputs.user_constraints).toBe(context.userConstraints);
    expect(inputs.run_artifacts).toBe(context.runArtifacts);
  });

  it('adds only structural transport contracts to full-run explicit state', () => {
    const inputs = buildTopicOperationInputs(context, 'full-topic-run');

    expect(Object.keys(inputs)).toEqual([
      'idea_text',
      'user_constraints',
      'progress_transport',
      'summary_transport',
    ]);
    expect(inputs.idea_text).toBe(context.ideaText);
    expect(inputs.user_constraints).toBe(context.userConstraints);
    expect(inputs.progress_transport).toBe('WHP_PROGRESS/4');
    expect(inputs.summary_transport).toBe('fenced-whp-summary');
  });

  it('maps handoff inputs verbatim from the selected winner and run artifacts only', () => {
    const inputs = buildTopicOperationInputs(context, 'handoff-preview');

    expect(Object.keys(inputs)).toEqual([
      'selected_winner',
      'run_artifacts',
    ]);
    expect(inputs.selected_winner).toBe(context.selectedWinner);
    expect(inputs.run_artifacts).toBe(context.runArtifacts);
  });
});
