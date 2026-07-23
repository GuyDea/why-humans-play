import {
  appendFileSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  pumpOperationEvents,
  type SseSink,
} from '../../src/http/sse.js';
import type { OperationRecord } from '../../src/operations/service.js';
import { jobPaths } from '../../src/runner-status.js';
import type { CodexEvent, JobState } from '../../src/types.js';

function record(state: JobState): OperationRecord {
  return { state } as OperationRecord;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('operation SSE pump', () => {
  it('waits for stream backpressure before writing the next event', async () => {
    const events: CodexEvent[] = [
      { seq: 1, raw: '{"type":"turn.started"}' },
      { seq: 2, raw: '{"type":"turn.completed"}' },
    ];
    let releaseDrain!: () => void;
    const drain = new Promise<void>((resolve) => {
      releaseDrain = resolve;
    });
    const chunks: string[] = [];
    const source = {
      events: (_id: string, fromSeq = 0) =>
        events.filter((event) => event.seq > fromSeq),
      get: () => record('completed'),
    };
    const sink = {
      write: (chunk: string) => {
        chunks.push(chunk);
        return chunks.length !== 1;
      },
      waitForDrain: () => drain,
    } as SseSink & { waitForDrain(): Promise<void> };

    const pumping = pumpOperationEvents(source, 'job-1', 0, sink);
    await Promise.resolve();
    const chunksBeforeDrain = chunks.length;
    releaseDrain();
    await pumping;

    expect(chunksBeforeDrain).toBe(1);
    expect(chunks).toHaveLength(3);
    expect(chunks.at(-1)).toBe('event: done\ndata: {}\n\n');
  });

  it('polls the operation journal no more than once per 250 milliseconds', async () => {
    vi.useFakeTimers();
    let state: JobState = 'running';
    let eventReads = 0;
    const source = {
      events: () => {
        eventReads += 1;
        return [];
      },
      get: () => record(state),
    };
    const pumping = pumpOperationEvents(source, 'job-1', 0, {
      write: () => true,
    });

    await vi.advanceTimersByTimeAsync(249);
    const readsBeforeNextInterval = eventReads;
    state = 'completed';
    await vi.advanceTimersByTimeAsync(1);
    await pumping;

    expect(readsBeforeNextInterval).toBe(1);
  });

  it('tails the event file without rereading it through the service', async () => {
    vi.useFakeTimers();
    const jobDir = mkdtempSync(join(tmpdir(), 'operation-sse-cursor-'));
    const eventsFile = jobPaths(jobDir).eventsFile;
    writeFileSync(
      eventsFile,
      '{"type":"thread.started"}\n{"type":"turn.started"}\n',
    );
    let state: JobState = 'running';
    let recordReads = 0;
    let serviceEventReads = 0;
    const source = {
      events: () => {
        serviceEventReads += 1;
        return [];
      },
      get: () => {
        recordReads += 1;
        return { ...record(state), jobDir };
      },
      state: () => state,
    };
    const chunks: string[] = [];

    const pumping = pumpOperationEvents(source, 'job-1', 1, {
      write: (chunk) => {
        chunks.push(chunk);
        return true;
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    appendFileSync(eventsFile, '{"type":"item.completed"}\n');
    await vi.advanceTimersByTimeAsync(250);
    state = 'completed';
    await vi.advanceTimersByTimeAsync(250);
    await pumping;

    expect(recordReads).toBe(1);
    expect(serviceEventReads).toBe(0);
    expect(chunks.filter((chunk) => chunk.includes('event: codex')))
      .toEqual([
        'id: 2\nevent: codex\ndata: {"type":"turn.started"}\n\n',
        'id: 3\nevent: codex\ndata: {"type":"item.completed"}\n\n',
      ]);
    expect(chunks.at(-1)).toBe('event: done\ndata: {}\n\n');
    rmSync(jobDir, { recursive: true, force: true });
  });
});
