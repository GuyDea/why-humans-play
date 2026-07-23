import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { DaemonClient } from './api/client';
import type { TrackedOperation } from './ops/tracker';
import {
  AgentConsoleModel,
  type StudioConsoleEntry,
} from './panels/agent-console';
import {
  StudioSession,
  type StudioRuntimeHandle,
} from './studio-session';

function trackedOperation(
  id = 'op-shared',
  options: {
    phase?: 'streaming' | 'done';
    canResume?: boolean;
  } = {},
): TrackedOperation<unknown, StudioConsoleEntry> {
  return {
    operation: 'review',
    id: signal<string | null>(id),
    phase: signal(options.phase ?? 'streaming'),
    state: signal('running'),
    errorMessage: signal(null),
    events: signal([]),
    consoleEntries: signal([
      { seq: 1, kind: 'message', text: 'Reviewing the selected passage.' },
    ]),
    result: signal(null),
    telemetry: signal({ tokens: null, elapsed: null }),
    stallFlag: signal(false),
    remainingHops: signal(2),
    canResume: signal(options.canResume ?? false),
    meta: { operation: 'review' },
  };
}

describe('StudioSession', () => {
  it('keeps the runtime tracker history available to the routed console', async () => {
    const operation = trackedOperation();
    const cancel = vi.fn(async () => undefined);
    const tracker = {
      history: signal([operation] as readonly typeof operation[]),
      cancel,
      resume: vi.fn(),
    };
    const runtime: StudioRuntimeHandle = {
      tracker,
      cancel,
      canReroll: vi.fn(() => false),
      reroll: vi.fn(),
    };
    const session = new StudioSession({} as DaemonClient);
    const detach = session.attachRuntime(runtime);
    const consoleModel = new AgentConsoleModel(session);

    expect(consoleModel.operations()).toEqual([operation]);
    expect(consoleModel.selected()?.consoleEntries()[0]?.text).toBe(
      'Reviewing the selected passage.',
    );
    await expect(consoleModel.cancelSelected()).resolves.toBe(true);
    expect(cancel).toHaveBeenCalledWith('op-shared');

    detach();
    expect(consoleModel.operations()).toEqual([operation]);
  });

  it('routes console Re-roll through the live selection runtime', () => {
    const operation = trackedOperation('op-shared', {
      phase: 'done',
      canResume: true,
    });
    const rerolled = trackedOperation('op-rerolled');
    const tracker = {
      history: signal([operation] as readonly typeof operation[]),
      cancel: vi.fn(async () => undefined),
      resume: vi.fn(),
    };
    const reroll = vi.fn(() => ({ tracked: rerolled }));
    const runtime: StudioRuntimeHandle = {
      tracker,
      cancel: tracker.cancel,
      canReroll: vi.fn(() => true),
      reroll,
    };
    const session = new StudioSession({} as DaemonClient);
    session.attachRuntime(runtime);
    const consoleModel = new AgentConsoleModel(session);

    expect(consoleModel.resumeSelected()).toBe(rerolled);
    expect(reroll).toHaveBeenCalledWith('op-shared');
    expect(tracker.resume).not.toHaveBeenCalled();
  });

  it('disables console Re-roll as soon as the owning runtime detaches', () => {
    const operation = trackedOperation('op-detached', {
      phase: 'done',
      canResume: true,
    });
    const tracker = {
      history: signal([operation] as readonly typeof operation[]),
      cancel: vi.fn(async () => undefined),
      resume: vi.fn(),
    };
    const runtime: StudioRuntimeHandle = {
      tracker,
      cancel: tracker.cancel,
      canReroll: vi.fn(() => true),
      reroll: vi.fn(),
    };
    const session = new StudioSession({} as DaemonClient);
    const detach = session.attachRuntime(runtime);
    const consoleModel = new AgentConsoleModel(session);

    expect(consoleModel.canResume(operation)).toBe(true);
    detach();
    expect(consoleModel.canResume(operation)).toBe(false);
    expect(consoleModel.resumeSelected()).toBeNull();
    expect(tracker.resume).not.toHaveBeenCalled();
  });
});
