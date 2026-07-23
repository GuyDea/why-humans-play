import { describe, expect, it, vi } from 'vitest';
import {
  type DaemonClient,
  type OperationRecord,
  type OperationResult,
  type SseFrame,
  type StreamEventsOptions,
} from '../api/client';
import { OpTracker } from './tracker';

interface ConsoleEntry {
  seq: number;
  text: string;
}

function operationRecord(
  overrides: Partial<OperationRecord> = {},
): OperationRecord {
  return {
    id: 'op-1',
    operation: 'rewrite-selection',
    state: 'completed',
    stalled: false,
    envelopeJson: '{}',
    jobDir: '/tmp/op-1',
    threadId: 'thread-1',
    retryOf: null,
    resumedFrom: null,
    createdAt: '2026-07-23T10:00:00.000Z',
    startedAt: '2026-07-23T10:00:01.000Z',
    finishedAt: '2026-07-23T10:00:03.500Z',
    inputTokens: 100,
    cachedInputTokens: 40,
    outputTokens: 50,
    reasoningOutputTokens: 20,
    usageAvailable: 1,
    error: null,
    ...overrides,
  };
}

function schemaResult(
  status: 'complete' | 'narrowed' | 'declined' = 'complete',
): OperationResult {
  return {
    kind: 'schema',
    value: {
      status,
      replacement_markdown: 'A tighter passage.',
      guardrail_markdown: status === 'complete'
        ? null
        : 'The requested change crosses the approved scope.',
    },
    guardrail: status === 'complete'
      ? null
      : 'The requested change crosses the approved scope.',
  };
}

function mockClient(overrides: Partial<DaemonClient> = {}): DaemonClient {
  return {
    submitOp: vi.fn(async () => ({ id: 'op-1' })),
    streamEvents: vi.fn(async (
      _id: string,
      options: StreamEventsOptions,
    ) => {
      await options.onDone();
    }),
    getOp: vi.fn(async () => operationRecord()),
    getResult: vi.fn(async () => schemaResult()),
    cancel: vi.fn(async (id: string) => ({ id })),
    resume: vi.fn(async () => ({ id: 'op-2' })),
    ...overrides,
  } as unknown as DaemonClient;
}

const inputs = { selection: 'The original passage.' };
const meta = { target: 'selection-1' };
const firstFrame: SseFrame = {
  id: '1',
  event: 'codex',
  data: '{"type":"turn.started"}',
};
const secondFrame: SseFrame = {
  id: '2',
  event: 'codex',
  data: '{"type":"item.completed","item":{"type":"agent_message","text":"Done."}}',
};

function mapConsoleEvents(
  events: readonly SseFrame[],
): ConsoleEntry[] {
  return events.map((event) => ({
    seq: Number(event.id),
    text: (JSON.parse(event.data) as { type: string }).type,
  }));
}

describe('OpTracker', () => {
  it('tracks the full submit, stream, result, and telemetry lifecycle', async () => {
    const mapper = vi.fn(mapConsoleEvents);
    const client = mockClient({
      streamEvents: vi.fn(async (
        _id: string,
        options: StreamEventsOptions,
      ) => {
        await options.onEvent(firstFrame);
        await options.onEvent(secondFrame);
        await options.onDone();
      }),
    });
    const tracker = new OpTracker(client, mapper);

    const tracked = tracker.launch('rewrite-selection', inputs, meta);

    expect(tracked.id()).toBeNull();
    expect(tracked.phase()).toBe('submitting');
    expect(tracker.history()).toEqual([tracked]);

    await vi.waitFor(() => expect(tracked.phase()).toBe('done'));

    expect(tracked.id()).toBe('op-1');
    expect(tracked.events()).toEqual([firstFrame, secondFrame]);
    expect(tracked.consoleEntries()).toEqual([
      { seq: 1, text: 'turn.started' },
      { seq: 2, text: 'item.completed' },
    ]);
    expect(tracked.result()).toEqual(schemaResult());
    expect(tracked.state()).toBe('completed');
    expect(tracked.errorMessage()).toBeNull();
    expect(tracked.telemetry()).toEqual({
      tokens: 150,
      elapsed: 2_500,
    });
    expect(tracked.stallFlag()).toBe(false);
    expect(tracked.meta).toBe(meta);
    expect(tracked.remainingHops()).toBe(3);
    expect(tracked.canResume()).toBe(true);
    expect(mapper).toHaveBeenLastCalledWith([firstFrame, secondFrame]);
    expect(client.submitOp).toHaveBeenCalledWith(
      'rewrite-selection',
      inputs,
    );
    expect(client.streamEvents).toHaveBeenCalledWith(
      'op-1',
      expect.objectContaining({
        onEvent: expect.any(Function),
        onDone: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it('exposes completion only after terminal result signals are settled', async () => {
    const result = schemaResult();
    const tracker = new OpTracker(mockClient({
      getResult: vi.fn(async () => result),
    }), mapConsoleEvents);

    const tracked = tracker.launch('rewrite-selection', inputs, meta);
    await tracked.completion;

    expect(tracked.phase()).toBe('done');
    expect(tracked.state()).toBe('completed');
    expect(tracked.result()).toBe(result);
  });

  it('treats a declined schema result as a first-class guardrail', async () => {
    const result = schemaResult('declined');
    const tracker = new OpTracker(mockClient({
      getResult: vi.fn(async () => result),
    }), mapConsoleEvents);

    const tracked = tracker.launch('rewrite-selection', inputs, meta);
    await vi.waitFor(() => expect(tracked.phase()).toBe('guardrail'));

    expect(tracked.result()).toBe(result);
  });

  it('propagates and clears the daemon stall flag while streaming', async () => {
    let finishStream!: () => void;
    let completed = false;
    const tracker = new OpTracker(mockClient({
      streamEvents: vi.fn(async (
        _id: string,
        options: StreamEventsOptions,
      ) => {
        await new Promise<void>((resolve) => {
          finishStream = resolve;
        });
        await options.onDone();
      }),
      getOp: vi.fn(async () => completed
        ? operationRecord()
        : operationRecord({
            state: 'running',
            stalled: true,
            finishedAt: null,
          })),
    }), mapConsoleEvents, { statusPollMs: 1 });

    const tracked = tracker.launch('rewrite-selection', inputs, meta);
    await vi.waitFor(() => expect(tracked.stallFlag()).toBe(true));

    completed = true;
    finishStream();
    await vi.waitFor(() => expect(tracked.phase()).toBe('done'));

    expect(tracked.stallFlag()).toBe(false);
  });

  it('carries a three-hop resume budget and disables a fourth resume', async () => {
    let nextId = 1;
    const client = mockClient({
      submitOp: vi.fn(async () => ({ id: `op-${nextId++}` })),
      resume: vi.fn(async () => ({ id: `op-${nextId++}` })),
      getOp: vi.fn(async (id: string) => operationRecord({ id })),
    });
    const tracker = new OpTracker(client, mapConsoleEvents);
    let tracked = tracker.launch('rewrite-selection', inputs, meta);
    await vi.waitFor(() => expect(tracked.phase()).toBe('done'));

    for (const remaining of [2, 1, 0]) {
      const parentId = tracked.id()!;
      tracked = tracker.resume(parentId);
      await vi.waitFor(() => expect(tracked.phase()).toBe('done'));
      expect(tracked.remainingHops()).toBe(remaining);
      expect(client.resume).toHaveBeenLastCalledWith(parentId, inputs);
    }

    expect(tracked.canResume()).toBe(false);
    expect(() => tracker.resume(tracked.id()!))
      .toThrow(/resume limit exhausted/i);
    expect(client.resume).toHaveBeenCalledTimes(3);
  });

  it('cancels the active operation without a later result overwriting it', async () => {
    let finishStream!: () => void;
    const client = mockClient({
      streamEvents: vi.fn(async (
        _id: string,
        options: StreamEventsOptions,
      ) => {
        await new Promise<void>((resolve) => {
          finishStream = resolve;
        });
        await options.onDone();
      }),
      getOp: vi.fn(async () => operationRecord({ state: 'cancelled' })),
    });
    const tracker = new OpTracker(client, mapConsoleEvents);
    const tracked = tracker.launch('rewrite-selection', inputs, meta);
    await vi.waitFor(() => expect(tracked.phase()).toBe('streaming'));

    await tracker.cancel('op-1');
    expect(tracked.phase()).toBe('cancelled');
    expect(client.cancel).toHaveBeenCalledWith('op-1');

    finishStream();
    await vi.waitFor(() => expect(client.getResult).toHaveBeenCalled());
    expect(tracked.phase()).toBe('cancelled');
  });

  it('records submission failures as failed results', async () => {
    const tracker = new OpTracker(mockClient({
      submitOp: vi.fn(async () => {
        throw new Error('daemon unavailable');
      }),
    }), mapConsoleEvents);

    const tracked = tracker.launch('review', inputs, meta);
    await vi.waitFor(() => expect(tracked.phase()).toBe('failed'));

    expect(tracked.id()).toBeNull();
    expect(tracked.result()).toEqual({
      kind: 'failed',
      error: 'daemon unavailable',
    });
    expect(tracked.state()).toBe('failed');
    expect(tracked.errorMessage()).toBe('daemon unavailable');
  });

  it('preserves the exact daemon terminal state and error message', async () => {
    const tracker = new OpTracker(mockClient({
      getOp: vi.fn(async () => operationRecord({
        state: 'invalid-output',
        error: 'response failed schema validation',
      })),
      getResult: vi.fn(async () => ({
        kind: 'failed',
        error: 'invalid operation result',
      })),
    }), mapConsoleEvents);

    const tracked = tracker.launch('review', inputs, meta);
    await vi.waitFor(() => expect(tracked.phase()).toBe('failed'));

    expect(tracked.state()).toBe('invalid-output');
    expect(tracked.errorMessage())
      .toBe('response failed schema validation');
  });
});
