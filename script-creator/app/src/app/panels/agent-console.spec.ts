import '@angular/compiler';
import {
  createComponent,
  provideZonelessChangeDetection,
  signal,
  ɵSIGNAL,
  type ɵInputSignalNode,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import type {
  OperationListResponse,
  OperationRecord,
} from '../api/client';
import type { TrackedOperation } from '../ops/tracker';
import {
  AgentConsole,
  AgentConsoleModel,
  formatElapsed,
  formatTokens,
  type AgentConsoleTracker,
  type StudioConsoleEntry,
} from './agent-console';

interface Meta {
  operation: string;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
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

  it('renders durable records with live detail and daemon-backed Cancel', async () => {
    const operation = tracked('op-running', {
      phase: 'streaming',
      entries: [{ seq: 1, kind: 'message', text: 'Checking the hook.' }],
    });
    const trackerCancel = vi.fn(async () => undefined);
    const tracker: AgentConsoleTracker<Meta> = {
      history: signal([operation]),
      cancel: trackerCancel,
      resume: vi.fn(),
    };
    const model = new AgentConsoleModel(tracker);
    const listOps = vi.fn(async () => ({
      operations: [
        {
          id: 'op-running',
          operation: 'review',
          state: 'running',
          createdAt: '2026-07-23T11:00:00.000Z',
          finishedAt: null,
          stalled: false,
          usageAvailable: 1 as const,
          inputTokens: 120,
          cachedInputTokens: 40,
          outputTokens: 30,
          reasoningOutputTokens: 12,
        },
        {
          id: 'op-completed',
          operation: 'rewrite-selection',
          state: 'completed',
          createdAt: '2026-07-23T10:00:00.000Z',
          finishedAt: '2026-07-23T10:00:05.000Z',
          stalled: false,
          usageAvailable: 0 as const,
          inputTokens: null,
          cachedInputTokens: null,
          outputTokens: null,
          reasoningOutputTokens: null,
        },
      ],
    }));
    const cancel = vi.fn(async () => ({ id: 'op-running' }));
    const getOp = vi.fn(async (id: string) => ({
      id,
      operation: 'review',
      state: 'running',
      stalled: false,
      envelopeJson: '{}',
      jobDir: '/tmp/op-running',
      threadId: 'thread-running',
      retryOf: null,
      resumedFrom: null,
      createdAt: '2026-07-23T11:00:00.000Z',
      startedAt: '2026-07-23T11:00:00.000Z',
      finishedAt: null,
      inputTokens: 120,
      cachedInputTokens: 40,
      outputTokens: 30,
      reasoningOutputTokens: 12,
      usageAvailable: 1 as const,
      error: null,
      inputs: {
        approved_lessons: ['Keep the reveal concrete.'],
      },
      operationLessons: [{
        operationId: id,
        lessonId: 'lesson-1',
        lessonVersion: 3,
        contentHash: 'hash-lesson-1-v3',
        createdAt: '2026-07-23T11:00:00.000Z',
      }],
    } satisfies OperationRecord));
    const client = { listOps, getOp, cancel };
    const application = await createApplication({
      providers: [provideZonelessChangeDetection()],
    });
    const host = document.createElement('app-agent-console');
    document.body.append(host);
    const component = createComponent(AgentConsole, {
      environmentInjector: application.injector,
      hostElement: host,
    });
    const modelNode = component.instance.model[ɵSIGNAL] as
      ɵInputSignalNode<AgentConsoleModel<unknown>, AgentConsoleModel<unknown>>;
    modelNode.applyValueToInputSignal(modelNode, model);

    try {
      const clientInput = (
        component.instance as AgentConsole & {
          client?: {
            [ɵSIGNAL]: ɵInputSignalNode<typeof client, typeof client>;
          };
        }
      ).client;
      expect(clientInput).toBeDefined();
      if (!clientInput) return;
      const clientNode = clientInput[ɵSIGNAL];
      clientNode.applyValueToInputSignal(clientNode, client);
      application.attachView(component.hostView);
      component.changeDetectorRef.detectChanges();
      await vi.waitFor(() => expect(listOps).toHaveBeenCalledOnce());
      component.changeDetectorRef.detectChanges();

      expect(host.textContent).toContain('Checking the hook.');
      await vi.waitFor(() => expect(getOp).toHaveBeenCalledWith('op-running'));
      component.changeDetectorRef.detectChanges();
      expect(host.textContent).toContain('Supplied lessons');
      expect(host.textContent).toContain('Keep the reveal concrete.');
      expect(host.textContent).toContain('lesson-1 · version 3');
      expect(host.textContent).toContain('repository-native');
      expect(host.querySelector<HTMLAnchorElement>(
        'a[href="/lessons#lesson-lesson-1"]',
      )).not.toBeNull();
      expect(host.textContent).toContain('op-running');
      expect(host.textContent).toContain('op-completed');
      expect(host.textContent).toContain('running');
      expect(host.textContent).toContain('completed');
      const operationButtons = Array.from(
        host.querySelectorAll<HTMLButtonElement>('nav button'),
      );
      operationButtons[1]!.click();
      component.changeDetectorRef.detectChanges();
      const controls = Array.from(
        host.querySelectorAll<HTMLButtonElement>('.actions button'),
      );
      expect(controls.map(({ textContent }) => textContent?.trim())).toEqual([
        'Cancel',
        'Re-roll',
      ]);
      expect(controls[0]?.disabled).toBe(true);
      operationButtons[0]!.click();
      component.changeDetectorRef.detectChanges();
      expect(controls[0]?.disabled).toBe(false);
      controls[0]!.click();
      await vi.waitFor(() => expect(cancel).toHaveBeenCalledWith('op-running'));
      expect(trackerCancel).not.toHaveBeenCalled();
    } finally {
      application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      host.remove();
    }
  });

  it('refreshes durable operations every five seconds only while mounted', async () => {
    const tracker: AgentConsoleTracker<Meta> = {
      history: signal([]),
      cancel: vi.fn(),
      resume: vi.fn(),
    };
    const model = new AgentConsoleModel(tracker);
    const listOps = vi.fn(async () => ({ operations: [] }));
    const client = {
      listOps,
      cancel: vi.fn(async (id: string) => ({ id })),
    };
    const application = await createApplication({
      providers: [provideZonelessChangeDetection()],
    });
    const host = document.createElement('app-agent-console');
    document.body.append(host);
    const component = createComponent(AgentConsole, {
      environmentInjector: application.injector,
      hostElement: host,
    });
    const modelNode = component.instance.model[ɵSIGNAL] as
      ɵInputSignalNode<AgentConsoleModel<unknown>, AgentConsoleModel<unknown>>;
    modelNode.applyValueToInputSignal(modelNode, model);
    let attached = false;

    try {
      const clientInput = (
        component.instance as AgentConsole & {
          client?: {
            [ɵSIGNAL]: ɵInputSignalNode<typeof client, typeof client>;
          };
        }
      ).client;
      expect(clientInput).toBeDefined();
      if (!clientInput) return;
      const clientNode = clientInput[ɵSIGNAL];
      clientNode.applyValueToInputSignal(clientNode, client);
      vi.useFakeTimers();
      application.attachView(component.hostView);
      attached = true;
      component.changeDetectorRef.detectChanges();
      await vi.advanceTimersByTimeAsync(0);

      expect(listOps).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(listOps).toHaveBeenCalledTimes(2);

      application.detachView(component.hostView);
      attached = false;
      component.destroy();
      await vi.advanceTimersByTimeAsync(5_000);
      expect(listOps).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      if (attached) application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      host.remove();
    }
  });

  it('ignores an older operation snapshot that resolves after a newer poll', async () => {
    const tracker: AgentConsoleTracker<Meta> = {
      history: signal([]),
      cancel: vi.fn(),
      resume: vi.fn(),
    };
    const model = new AgentConsoleModel(tracker);
    const older = deferred<OperationListResponse>();
    const newer = deferred<OperationListResponse>();
    const listOps = vi.fn()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const client = {
      listOps,
      cancel: vi.fn(async (id: string) => ({ id })),
    };
    const application = await createApplication({
      providers: [provideZonelessChangeDetection()],
    });
    const host = document.createElement('app-agent-console');
    document.body.append(host);
    const component = createComponent(AgentConsole, {
      environmentInjector: application.injector,
      hostElement: host,
    });
    const modelNode = component.instance.model[ɵSIGNAL] as
      ɵInputSignalNode<AgentConsoleModel<unknown>, AgentConsoleModel<unknown>>;
    modelNode.applyValueToInputSignal(modelNode, model);
    const clientNode = component.instance.client[ɵSIGNAL] as
      ɵInputSignalNode<typeof client, typeof client>;
    clientNode.applyValueToInputSignal(clientNode, client);
    let attached = false;

    try {
      vi.useFakeTimers();
      application.attachView(component.hostView);
      attached = true;
      component.changeDetectorRef.detectChanges();
      expect(listOps).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5_000);
      expect(listOps).toHaveBeenCalledTimes(2);
      newer.resolve({
        operations: [{
          id: 'op-race',
          operation: 'review',
          state: 'completed',
          createdAt: '2026-07-23T11:00:00.000Z',
          finishedAt: '2026-07-23T11:00:05.000Z',
          stalled: false,
          usageAvailable: 1,
          inputTokens: 120,
          cachedInputTokens: 40,
          outputTokens: 30,
          reasoningOutputTokens: 12,
        }],
      });
      await vi.advanceTimersByTimeAsync(0);
      component.changeDetectorRef.detectChanges();
      expect(host.querySelector('nav small')?.textContent?.trim())
        .toBe('completed');

      older.resolve({
        operations: [{
          id: 'op-race',
          operation: 'review',
          state: 'running',
          createdAt: '2026-07-23T11:00:00.000Z',
          finishedAt: null,
          stalled: false,
          usageAvailable: 0,
          inputTokens: null,
          cachedInputTokens: null,
          outputTokens: null,
          reasoningOutputTokens: null,
        }],
      });
      await vi.advanceTimersByTimeAsync(0);
      component.changeDetectorRef.detectChanges();

      expect(host.querySelector('nav small')?.textContent?.trim())
        .toBe('completed');
      expect(
        host.querySelector<HTMLButtonElement>('.actions button')?.disabled,
      ).toBe(true);
    } finally {
      vi.useRealTimers();
      if (attached) application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      host.remove();
    }
  });

  it('refreshes a selected operation to completed with usage on the next poll '
    + 'without re-selection, then stops re-polling its detail', async () => {
    const tracker: AgentConsoleTracker<Meta> = {
      history: signal([tracked('op-1', { phase: 'streaming' })]),
      cancel: vi.fn(),
      resume: vi.fn(),
    };
    const model = new AgentConsoleModel(tracker);

    let completed = false;
    const runningSummary = {
      id: 'op-1',
      operation: 'review' as const,
      state: 'running' as const,
      createdAt: '2026-07-23T11:00:00.000Z',
      finishedAt: null,
      stalled: false,
      usageAvailable: 0 as const,
      inputTokens: null,
      cachedInputTokens: null,
      outputTokens: null,
      reasoningOutputTokens: null,
    };
    const completedSummary = {
      id: 'op-1',
      operation: 'review' as const,
      state: 'completed' as const,
      createdAt: '2026-07-23T11:00:00.000Z',
      finishedAt: '2026-07-23T11:00:05.000Z',
      stalled: false,
      usageAvailable: 1 as const,
      inputTokens: 1_234,
      cachedInputTokens: 40,
      outputTokens: 30,
      reasoningOutputTokens: 12,
    };
    const listOps = vi.fn(async () => ({
      operations: [completed ? completedSummary : runningSummary],
    }));
    const getOp = vi.fn(async (id: string): Promise<OperationRecord> => ({
      id,
      operation: 'review',
      state: completed ? 'completed' : 'running',
      stalled: false,
      envelopeJson: '{}',
      jobDir: '/tmp/op-1',
      threadId: 'thread-1',
      retryOf: null,
      resumedFrom: null,
      createdAt: '2026-07-23T11:00:00.000Z',
      startedAt: '2026-07-23T11:00:00.000Z',
      finishedAt: completed ? '2026-07-23T11:00:05.000Z' : null,
      inputTokens: completed ? 1_234 : null,
      cachedInputTokens: completed ? 40 : null,
      outputTokens: completed ? 30 : null,
      reasoningOutputTokens: completed ? 12 : null,
      usageAvailable: completed ? 1 : 0,
      error: null,
      inputs: {},
      operationLessons: [],
    }));
    const client = {
      listOps,
      getOp,
      cancel: vi.fn(async (id: string) => ({ id })),
    };
    const application = await createApplication({
      providers: [provideZonelessChangeDetection()],
    });
    const host = document.createElement('app-agent-console');
    document.body.append(host);
    const component = createComponent(AgentConsole, {
      environmentInjector: application.injector,
      hostElement: host,
    });
    const modelNode = component.instance.model[ɵSIGNAL] as
      ɵInputSignalNode<AgentConsoleModel<unknown>, AgentConsoleModel<unknown>>;
    modelNode.applyValueToInputSignal(modelNode, model);
    const clientNode = component.instance.client[ɵSIGNAL] as
      ɵInputSignalNode<typeof client, typeof client>;
    clientNode.applyValueToInputSignal(clientNode, client);
    let attached = false;

    try {
      vi.useFakeTimers();
      application.attachView(component.hostView);
      attached = true;
      component.changeDetectorRef.detectChanges();
      await vi.advanceTimersByTimeAsync(0);
      component.changeDetectorRef.detectChanges();

      // Initial selection: running with no reported usage.
      expect(host.querySelector('nav small')?.textContent?.trim())
        .toBe('running');
      expect(host.querySelector('.telemetry')?.textContent)
        .toContain('unavailable');
      expect(getOp).toHaveBeenCalledTimes(1);

      // The operation completes server-side; the next poll must surface the
      // terminal state and reported usage without any re-selection or reload.
      completed = true;
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.advanceTimersByTimeAsync(0);
      component.changeDetectorRef.detectChanges();

      expect(host.querySelector('nav small')?.textContent?.trim())
        .toBe('completed');
      const telemetry = host.querySelector('.telemetry')?.textContent ?? '';
      expect(telemetry).toContain('1,234');
      expect(telemetry).toContain('reported');
      // The poll that observed completion performed one final detail refetch.
      expect(getOp).toHaveBeenCalledTimes(2);

      // Once terminal, the detail is no longer re-polled on subsequent ticks.
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.advanceTimersByTimeAsync(0);
      component.changeDetectorRef.detectChanges();
      expect(getOp).toHaveBeenCalledTimes(2);
      expect(listOps.mock.calls.length).toBeGreaterThanOrEqual(3);
    } finally {
      vi.useRealTimers();
      if (attached) application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      host.remove();
    }
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
