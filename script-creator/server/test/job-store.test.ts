import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobStore } from '../src/job-store.js';
import type { JobEnvelope } from '../src/types.js';

const env: JobEnvelope = { jobId: 'j1', prompt: 'p', cwd: '/r', sandbox: 'read-only' };

function freshStore(): JobStore {
  return new JobStore(join(mkdtempSync(join(tmpdir(), 'db-')), 'state.sqlite3'));
}

afterEach(() => vi.useRealTimers());

describe('JobStore', () => {
  it('returns the immutable first envelope for decision evidence', () => {
    const root = mkdtempSync(join(tmpdir(), 'job-envelope-'));
    const store = new JobStore(join(root, 'state.sqlite3'));
    store.createOperationWithJob(
      {
        id: 'operation-1',
        name: 'rewrite-selection',
        deadlineAt: '2026-07-24T09:00:00.000Z',
        createdAt: '2026-07-24T08:00:00.000Z',
      },
      {
        jobId: 'job-1',
        prompt: 'original prompt',
        cwd: root,
        sandbox: 'read-only',
      },
      join(root, 'job-1'),
    );
    store.create(
      {
        jobId: 'job-retry',
        prompt: 'retry prompt',
        cwd: root,
        sandbox: 'read-only',
      },
      join(root, 'job-retry'),
      {
        operationId: 'operation-1',
        retryOf: 'job-1',
      },
    );

    expect(store.operationEnvelope('operation-1')).toMatchObject({
      jobId: 'job-1',
      prompt: 'original prompt',
    });
    expect(store.operationEnvelope('missing')).toBeNull();
    store.close();
  });

  it('creates, transitions, and records verbatim usage', () => {
    const s = freshStore();
    const rec = s.create(env, '/jobs/j1');
    expect(rec.state).toBe('queued');
    expect(rec.startedAt).toBeNull();
    s.setState('j1', 'running');
    expect(s.get('j1')!.startedAt).not.toBeNull();
    s.setThreadId('j1', 'tid-1');
    s.recordUsage('j1', { input_tokens: 10, cached_input_tokens: 5, output_tokens: 3, reasoning_output_tokens: 2 });
    s.setState('j1', 'completed');
    const done = s.get('j1')!;
    expect(done.threadId).toBe('tid-1');
    expect(done.inputTokens).toBe(10);
    expect(done.reasoningOutputTokens).toBe(2);
    expect(done.usageAvailable).toBe(1);
  });

  it('records unavailable usage as nulls, never estimates', () => {
    const s = freshStore();
    s.create(env, '/jobs/j1');
    s.recordUsage('j1', {
      input_tokens: 10,
      cached_input_tokens: 5,
      output_tokens: 3,
      reasoning_output_tokens: 2,
    });
    s.recordUsage('j1', undefined);
    const rec = s.get('j1')!;
    expect(rec.usageAvailable).toBe(0);
    expect(rec.inputTokens).toBeNull();
    expect(rec.cachedInputTokens).toBeNull();
    expect(rec.outputTokens).toBeNull();
    expect(rec.reasoningOutputTokens).toBeNull();
  });

  it('serves queued jobs in insertion order when timestamps and ids disagree', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T12:00:00.000Z'));
    const s = freshStore();
    s.create({ ...env, jobId: 'z-first' }, '/jobs/z-first');
    s.create({ ...env, jobId: 'a-second' }, '/jobs/a-second');
    expect(s.nextQueued()!.id).toBe('z-first');
    s.setState('z-first', 'running');
    expect(s.nextQueued()!.id).toBe('a-second');
    expect(s.runningJobs().map((j) => j.id)).toEqual(['z-first']);
  });

  it('links retries and resumes', () => {
    const s = freshStore();
    s.create(env, '/jobs/j1');
    const retry = s.create({ ...env, jobId: 'j2' }, '/jobs/j2', { retryOf: 'j1' });
    const resumed = s.create({ ...env, jobId: 'j3' }, '/jobs/j3', { resumedFrom: 'j1' });
    expect(retry.retryOf).toBe('j1');
    expect(resumed.resumedFrom).toBe('j1');
  });

  it('atomically marks an operation timed out and persists active cancellation intent', () => {
    const s = freshStore();
    s.createOperationWithJob(
      {
        id: 'op-1',
        name: 'rewrite-selection',
        createdAt: '2026-07-23T10:00:00.000Z',
        deadlineAt: '2026-07-23T10:15:00.000Z',
      },
      env,
      '/jobs/j1',
    );
    s.setState('j1', 'running');

    const attempt = s.timeoutOperationAndRequestCancellation(
      'op-1',
      '2026-07-23T10:15:00.000Z',
      '2026-07-23T10:15:10.000Z',
    );

    expect(s.getOperation('op-1')?.state).toBe('timed-out');
    expect(attempt).toMatchObject({ id: 'j1', state: 'cancelling' });
    expect(s.getCancellation('j1')).toEqual({
      requestedAt: '2026-07-23T10:15:00.000Z',
      deadlineAt: '2026-07-23T10:15:10.000Z',
    });
  });

  it('turns a queued retry into persisted cancellation before it can launch', () => {
    const s = freshStore();
    s.createOperationWithJob(
      {
        id: 'op-1',
        name: 'rewrite-selection',
        createdAt: '2026-07-23T10:00:00.000Z',
        deadlineAt: '2026-07-23T10:15:00.000Z',
      },
      env,
      '/jobs/j1',
    );
    s.setState('j1', 'invalid-output');
    s.create(
      { ...env, jobId: 'j2' },
      '/jobs/j2',
      { operationId: 'op-1', retryOf: 'j1' },
    );

    s.timeoutOperationAndRequestCancellation(
      'op-1',
      '2026-07-23T10:15:00.000Z',
      '2026-07-23T10:15:10.000Z',
    );

    expect(s.activeAttempt('op-1')).toMatchObject({
      id: 'j2',
      state: 'cancelling',
    });
    expect(s.nextQueued()).toBeNull();
  });
});
