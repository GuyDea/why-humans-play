import { describe, expect, it } from 'vitest';
import {
  mapConsoleEvents,
  parseWhpProgress,
} from '../../src/operations/progress.js';
import type { CodexEvent } from '../../src/types.js';

function event(
  seq: number,
  parsed: CodexEvent['parsed'],
  raw = JSON.stringify(parsed),
): CodexEvent {
  return { seq, raw, parsed };
}

describe('parseWhpProgress', () => {
  it('accepts only verbatim WHP_PROGRESS/2 grammar lines', () => {
    const events = [
      event(1, {
        type: 'item.completed',
        item: {
          type: 'agent_message',
          text: [
            'Progress update:',
            'WHP_PROGRESS/2 02-mode active :: Comparing audience-fit modes.',
            'WHP_PROGRESS/2 extra-step unknown :: Skill-authored fallback text.',
            'WHP_PROGRESS/1 03-signals done :: Retired protocol.',
            'WHP_PROGRESS/2 04-pool blocked :: Wrong status.',
            'WHP_PROGRESS/2 05-angles done:: Missing delimiter spaces.',
          ].join('\n'),
        },
      }),
    ];

    expect(parseWhpProgress(events)).toEqual([
      {
        id: '02-mode',
        status: 'active',
        text: 'Comparing audience-fit modes.',
      },
      {
        id: 'extra-step',
        status: 'unknown',
        text: 'Skill-authored fallback text.',
      },
    ]);
  });

  it('keeps canonical order, appends unknown ids, and lets later lines win', () => {
    const events = [
      event(1, { type: 'thread.started', thread_id: 'thread-1' }),
      event(2, {
        type: 'item.completed',
        item: {
          type: 'agent_message',
          text: [
            'WHP_PROGRESS/2 extra-b pending :: Waiting for a custom check.',
            'WHP_PROGRESS/2 11-packages active :: Testing package directions.',
            'WHP_PROGRESS/2 02-mode pending :: Mode not started.',
          ].join('\n'),
        },
      }),
      event(3, {
        type: 'item.completed',
        item: { type: 'command_execution', command: 'collect-signals' },
      }),
      event(4, {
        type: 'item.completed',
        item: {
          type: 'agent_message',
          text: [
            'WHP_PROGRESS/2 extra-a active :: Running another custom check.',
            'WHP_PROGRESS/2 02-mode done :: Mode selected.',
            'WHP_PROGRESS/2 extra-b unknown :: Custom check became indeterminate.',
          ].join('\n'),
        },
      }),
    ];

    expect(parseWhpProgress(events)).toEqual([
      { id: '02-mode', status: 'done', text: 'Mode selected.' },
      {
        id: '11-packages',
        status: 'active',
        text: 'Testing package directions.',
      },
      {
        id: 'extra-b',
        status: 'unknown',
        text: 'Custom check became indeterminate.',
      },
      {
        id: 'extra-a',
        status: 'active',
        text: 'Running another custom check.',
      },
    ]);
  });
});

describe('mapConsoleEvents', () => {
  it('maps known events, separates warnings from failures, and preserves other raw lines', () => {
    const unknownRaw = '{"type":"future.event","payload":{"value":1}}';
    const malformedRaw = '{not-json';
    const events = [
      event(1, { type: 'thread.started', thread_id: 'thread-1' }),
      event(2, { type: 'turn.started' }),
      event(3, {
        type: 'item.completed',
        item: { type: 'agent_message', text: 'Drafting the candidate pool.' },
      }),
      event(4, {
        type: 'item.started',
        item: {
          type: 'command_execution',
          command: 'python3 collect_signals.py',
        },
      }),
      event(5, {
        type: 'item.completed',
        item: {
          type: 'error',
          message: 'Skill descriptions were shortened.',
        },
      }),
      event(6, {
        type: 'error',
        message: 'A recoverable transport warning occurred.',
      }),
      event(7, {
        type: 'turn.failed',
        error: { message: 'invalid_json_schema' },
      }),
      event(8, { type: 'turn.completed' }),
      event(9, { type: 'future.event', payload: { value: 1 } }, unknownRaw),
      { seq: 10, raw: malformedRaw },
      event(11, {
        type: 'item.completed',
        item: { type: 'reasoning', text: 'Hidden chain of thought.' },
      }),
    ];

    expect(mapConsoleEvents(events)).toEqual([
      { seq: 1, kind: 'thread', text: 'thread-1' },
      { seq: 2, kind: 'turn', text: 'turn.started' },
      { seq: 3, kind: 'message', text: 'Drafting the candidate pool.' },
      { seq: 4, kind: 'tool', text: 'python3 collect_signals.py' },
      { seq: 5, kind: 'warning', text: 'Skill descriptions were shortened.' },
      {
        seq: 6,
        kind: 'warning',
        text: 'A recoverable transport warning occurred.',
      },
      { seq: 7, kind: 'failure', text: 'invalid_json_schema' },
      { seq: 8, kind: 'turn', text: 'turn.completed' },
      { seq: 9, kind: 'other', text: unknownRaw },
      { seq: 10, kind: 'other', text: malformedRaw },
    ]);
  });

  it('falls back without losing known-event context when optional text is absent', () => {
    const events = [
      event(20, { type: 'thread.started' }),
      event(21, { type: 'turn.failed', error: {} }),
      event(22, {
        type: 'item.completed',
        item: { type: 'command_execution' },
      }),
    ];

    expect(mapConsoleEvents(events)).toEqual([
      { seq: 20, kind: 'thread', text: 'thread.started' },
      { seq: 21, kind: 'failure', text: 'turn.failed' },
      { seq: 22, kind: 'tool', text: 'command_execution' },
    ]);
  });
});
