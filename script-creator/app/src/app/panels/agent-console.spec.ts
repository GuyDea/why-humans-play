import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { TrackedOperation } from '../ops/tracker';
import {
  AgentConsoleModel,
  formatElapsed,
  formatTokens,
  type AgentConsoleTracker,
  type StudioConsoleEntry,
} from './agent-console';

interface Meta {
  operation: string;
}

function tracked(
  id: string,
  overrides: Partial<{
    phase: 'streaming' | 'done';
    canResume: boolean;
    entries: StudioConsoleEntry[];
    tokens: number | null;
    elapsed: number | null;
  }> = {},
): TrackedOperation<Meta, StudioConsoleEntry> {
  return {
    id: signal<string | null>(id),
    phase: signal(overrides.phase ?? 'done'),
    events: signal([]),
    consoleEntries: signal(overrides.entries ?? []),
    result: signal(null),
    telemetry: signal({
      tokens: overrides.tokens ?? null,
      elapsed: overrides.elapsed ?? null,
    }),
    stallFlag: signal(false),
    remainingHops: signal(overrides.canResume ? 1 : 0),
    canResume: signal(overrides.canResume ?? false),
    meta: { operation: 'review' },
  };
}

describe('AgentConsoleModel', () => {
  it('lists tracker history and defaults to the newest operation stream', () => {
    const first = tracked('op-1');
    const latest = tracked('op-2', {
      phase: 'streaming',
      entries: [{ seq: 1, kind: 'message', text: 'Working on the hook.' }],
      tokens: 84,
      elapsed: 1_250,
    });
    const history = signal([first, latest] as const);
    const tracker: AgentConsoleTracker<Meta> = {
      history,
      cancel: vi.fn(),
      resume: vi.fn(),
    };

    const model = new AgentConsoleModel(tracker);

    expect(model.operations()).toEqual([first, latest]);
    expect(model.selected()).toBe(latest);
    expect(model.selected()?.consoleEntries()).toEqual([
      { seq: 1, kind: 'message', text: 'Working on the hook.' },
    ]);
  });

  it('cancels the selected streaming operation through the tracker', async () => {
    const operation = tracked('op-1', { phase: 'streaming' });
    const cancel = vi.fn(async () => undefined);
    const tracker: AgentConsoleTracker<Meta> = {
      history: signal([operation]),
      cancel,
      resume: vi.fn(),
    };
    const model = new AgentConsoleModel(tracker);

    await expect(model.cancelSelected()).resolves.toBe(true);
    expect(cancel).toHaveBeenCalledWith('op-1');
  });

  it('resumes an eligible operation and selects the new stream', () => {
    const operation = tracked('op-1', { canResume: true });
    const resumed = tracked('op-2', { phase: 'streaming' });
    const resume = vi.fn(() => resumed);
    const tracker: AgentConsoleTracker<Meta> = {
      history: signal([operation]),
      cancel: vi.fn(),
      resume,
    };
    const model = new AgentConsoleModel(tracker);

    expect(model.resumeSelected()).toBe(resumed);
    expect(resume).toHaveBeenCalledWith('op-1');
    expect(model.selected()).toBe(resumed);
  });
});

describe('console telemetry labels', () => {
  it('uses unavailable instead of estimating absent usage', () => {
    expect(formatTokens(null)).toBe('unavailable');
    expect(formatElapsed(null)).toBe('unavailable');
  });

  it('formats reported token usage and elapsed time', () => {
    expect(formatTokens(12_450)).toBe('12,450');
    expect(formatElapsed(65_400)).toBe('1m 5s');
  });
});
