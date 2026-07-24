import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/http/app.js';
import { JobStore } from '../../src/job-store.js';
import { OperationService } from '../../src/operations/service.js';
import { JobSupervisor } from '../../src/supervisor.js';
import type { JobRecord, JobState } from '../../src/types.js';
import { waitFor } from '../helpers.js';
import {
  UNUSED_DOCUMENT_SERVICE,
  UNUSED_VALIDATOR_SERVICE,
} from './stubs.js';

const NONCE = 'task-11-test-nonce';
const AUTH = { 'x-sc-nonce': NONCE };
const FAKE_CODEX = join(import.meta.dirname, '..', 'fake-codex.mjs');

interface Fixture {
  root: string;
  app: ReturnType<typeof buildApp>;
  service: OperationService;
  supervisor: JobSupervisor;
  store: JobStore;
  ids: string[];
}

const fixtures: Fixture[] = [];

function makeFixture(mode: string): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'operations-http-'));
  const binDir = join(root, 'bin');
  mkdirSync(binDir);
  symlinkSync(FAKE_CODEX, join(binDir, 'codex'));
  const store = new JobStore(join(root, 'state.sqlite3'));
  const supervisor = new JobSupervisor({
    store,
    jobsRoot: join(root, 'jobs'),
    pollMs: 20,
    env: {
      FAKE_CODEX_MODE: mode,
      FAKE_CODEX_ATTEMPT_FILE: join(root, 'attempt.marker'),
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
    },
  });
  const service = new OperationService({ supervisor, store });
  const app = buildApp({
    nonce: NONCE,
    operationService: service,
    documentService: UNUSED_DOCUMENT_SERVICE,
    artifactService: {},
    validatorService: UNUSED_VALIDATOR_SERVICE,
  });
  const fixture = { root, app, service, supervisor, store, ids: [] };
  fixtures.push(fixture);
  return fixture;
}

async function submit(
  fixture: Fixture,
  operation = 'quick-gate-check',
  inputs: unknown = { selection: 'Original passage.' },
): Promise<string> {
  const response = await fixture.app.inject({
    method: 'POST',
    url: '/api/ops',
    headers: AUTH,
    payload: { operation, inputs },
  });
  expect(response.statusCode).toBe(200);
  const body = response.json<{ id: string }>();
  expect(body).toEqual({ id: expect.any(String) });
  fixture.ids.push(body.id);
  return body.id;
}

function persistOperation(
  fixture: Fixture,
  input: {
    id: string;
    operation: 'review' | 'rewrite-selection' | 'generate-alternatives';
    state: 'completed' | 'failed' | 'cancelled';
    createdAt: string;
    usage?: {
      input_tokens: number;
      cached_input_tokens: number;
      output_tokens: number;
      reasoning_output_tokens: number;
    };
  },
): void {
  fixture.store.createOperationWithJob(
    {
      id: input.id,
      name: input.operation,
      createdAt: input.createdAt,
      deadlineAt: '2026-07-23T12:00:00.000Z',
    },
    {
      jobId: input.id,
      prompt: 'persisted operation fixture',
      cwd: fixture.root,
      sandbox: 'read-only',
    },
    join(fixture.root, 'jobs', input.id),
  );
  fixture.store.recordUsage(input.id, input.usage);
  fixture.store.setState(input.id, input.state);
  fixture.ids.push(input.id);
}

function sseEventSequences(body: string): number[] {
  return [...body.matchAll(/^id: (\d+)$/gm)].map((match) => Number(match[1]));
}

function rawSseFrames(body: string): Array<{
  id?: number;
  event: string;
  data: string;
}> {
  return body.split('\n\n').flatMap((chunk) => {
    if (chunk.length === 0 || chunk.startsWith(':')) return [];
    let id: number | undefined;
    let event = 'message';
    const data: string[] = [];
    for (const line of chunk.split('\n')) {
      if (line.startsWith('id:')) id = Number(line.slice(3).trim());
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) data.push(line.slice(5).trim());
    }
    return [{ id, event, data: data.join('\n') }];
  });
}

async function waitForTerminal(
  fixture: Fixture,
  id: string,
): Promise<JobRecord> {
  return fixture.supervisor.waitForTerminal(id, 20_000);
}

afterEach(async () => {
  vi.useRealTimers();
  for (const fixture of fixtures.splice(0)) {
    for (const id of fixture.ids) {
      const state = fixture.store.get(id)?.state;
      if (state && ['queued', 'running'].includes(state)) {
        fixture.service.cancel(id);
      }
    }
    for (const id of fixture.ids) {
      const state = fixture.store.get(id)?.state;
      if (state && ['queued', 'running', 'cancelling'].includes(state)) {
        await fixture.supervisor.waitForTerminal(id, 5_000).catch(() => undefined);
      }
    }
    await fixture.app.close();
    fixture.service.dispose();
    fixture.supervisor.stop();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

describe('operations HTTP API', () => {
  it('returns immutable inputs and applied lesson links with an operation record', async () => {
    const fixture = makeFixture('operation-schema');
    const id = await submit(fixture, 'quick-gate-check', {
      selection: 'Original passage.',
      approved_lessons: ['Keep the reveal concrete.'],
    });

    const response = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}`,
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id,
      inputs: {
        selection: 'Original passage.',
      },
      operationLessons: [],
    });
  });

  it('lists no operations when durable history is empty', async () => {
    const fixture = makeFixture('operation-schema');

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/ops',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ operations: [] });
  });

  it('lists durable operations newest-first with mixed states and telemetry', async () => {
    const fixture = makeFixture('operation-schema');
    persistOperation(fixture, {
      id: 'op-completed',
      operation: 'review',
      state: 'completed',
      createdAt: '2026-07-23T09:00:00.000Z',
      usage: {
        input_tokens: 120,
        cached_input_tokens: 40,
        output_tokens: 30,
        reasoning_output_tokens: 12,
      },
    });
    persistOperation(fixture, {
      id: 'op-failed',
      operation: 'rewrite-selection',
      state: 'failed',
      createdAt: '2026-07-23T10:00:00.000Z',
    });
    persistOperation(fixture, {
      id: 'op-cancelled',
      operation: 'generate-alternatives',
      state: 'cancelled',
      createdAt: '2026-07-23T11:00:00.000Z',
      usage: {
        input_tokens: 90,
        cached_input_tokens: 20,
        output_tokens: 10,
        reasoning_output_tokens: 4,
      },
    });

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/ops',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      operations: [
        {
          id: 'op-cancelled',
          operation: 'generate-alternatives',
          draftId: null,
          state: 'cancelled',
          createdAt: '2026-07-23T11:00:00.000Z',
          finishedAt: expect.any(String),
          stalled: false,
          usageAvailable: 1,
          inputTokens: 90,
          cachedInputTokens: 20,
          outputTokens: 10,
          reasoningOutputTokens: 4,
        },
        {
          id: 'op-failed',
          operation: 'rewrite-selection',
          draftId: null,
          state: 'failed',
          createdAt: '2026-07-23T10:00:00.000Z',
          finishedAt: expect.any(String),
          stalled: false,
          usageAvailable: 0,
          inputTokens: null,
          cachedInputTokens: null,
          outputTokens: null,
          reasoningOutputTokens: null,
        },
        {
          id: 'op-completed',
          operation: 'review',
          draftId: null,
          state: 'completed',
          createdAt: '2026-07-23T09:00:00.000Z',
          finishedAt: expect.any(String),
          stalled: false,
          usageAvailable: 1,
          inputTokens: 120,
          cachedInputTokens: 40,
          outputTokens: 30,
          reasoningOutputTokens: 12,
        },
      ],
    });
  });

  it('caps durable operation history at the newest 100 rows', async () => {
    const fixture = makeFixture('operation-schema');
    for (let index = 0; index < 101; index += 1) {
      persistOperation(fixture, {
        id: `op-${String(index).padStart(3, '0')}`,
        operation: 'review',
        state: 'completed',
        createdAt: new Date(
          Date.parse('2026-07-23T00:00:00.000Z') + index * 1_000,
        ).toISOString(),
      });
    }

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/ops',
      headers: AUTH,
    });
    const body = response.json<{ operations: Array<{ id: string }> }>();

    expect(response.statusCode).toBe(200);
    expect(body.operations).toHaveLength(100);
    expect(body.operations[0]?.id).toBe('op-100');
    expect(body.operations.at(-1)?.id).toBe('op-001');
  });

  it('rejects operation-list reads without the nonce', async () => {
    const fixture = makeFixture('operation-schema');

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/ops',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'invalid nonce' });
  });

  it('submits, streams, and exposes a terminal operation with telemetry and result', async () => {
    const fixture = makeFixture('operation-schema');
    const id = await submit(fixture);

    const stream = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}/events`,
      headers: AUTH,
    });

    expect(stream.statusCode).toBe(200);
    expect(stream.headers['content-type']).toContain('text/event-stream');
    const events = fixture.service.events(id);
    expect(sseEventSequences(stream.body)).toEqual(events.map((event) => event.seq));
    for (const event of events) {
      expect(stream.body).toContain(
        `id: ${event.seq}\nevent: codex\ndata: ${event.raw}\n\n`,
      );
    }
    expect(stream.body).toMatch(/event: done\ndata: \{\}\n\n$/);

    const recordResponse = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}`,
      headers: AUTH,
    });
    expect(recordResponse.statusCode).toBe(200);
    expect(recordResponse.json()).toMatchObject({
      id,
      state: 'completed',
      operation: 'quick-gate-check',
      stalled: false,
      usageAvailable: 1,
      inputTokens: 37_290,
      cachedInputTokens: 17_152,
      outputTokens: 407,
      reasoningOutputTokens: 219,
    });

    const resultResponse = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}/result`,
      headers: AUTH,
    });
    expect(resultResponse.statusCode).toBe(200);
    expect(resultResponse.json()).toEqual({
      kind: 'schema',
      value: expect.objectContaining({ status: 'complete' }),
      guardrail: null,
    });
  });

  it('reconnects from Last-Event-ID or fromSeq with only the event tail', async () => {
    const fixture = makeFixture('operation-schema');
    const id = await submit(fixture);
    await waitForTerminal(fixture, id);
    const allEvents = fixture.service.events(id);
    const midpoint = allEvents[Math.floor(allEvents.length / 2)]!.seq;
    const expectedTail = allEvents
      .filter((event) => event.seq > midpoint)
      .map((event) => event.seq);

    const headerReconnect = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}/events`,
      headers: { ...AUTH, 'last-event-id': String(midpoint) },
    });
    const queryReconnect = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}/events?fromSeq=${midpoint}`,
      headers: AUTH,
    });

    expect(headerReconnect.statusCode).toBe(200);
    expect(sseEventSequences(headerReconnect.body)).toEqual(expectedTail);
    expect(queryReconnect.statusCode).toBe(200);
    expect(sseEventSequences(queryReconnect.body)).toEqual(expectedTail);
    expect(headerReconnect.body).toMatch(/event: done/);
    expect(queryReconnect.body).toMatch(/event: done/);
  });

  it('keeps one public id and one final done across a schema retry', async () => {
    const fixture = makeFixture('invalid-schema-once');
    const id = await submit(fixture);

    const stream = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}/events`,
      headers: AUTH,
    });

    const attempts = fixture.store.operationAttempts(id);
    expect(attempts).toHaveLength(2);
    expect(attempts.map((attempt) => attempt.operationId))
      .toEqual([id, id]);
    expect(attempts[1]!.retryOf).toBe(attempts[0]!.id);
    const frames = rawSseFrames(stream.body);
    const codexFrames = frames.filter((frame) => frame.event === 'codex');
    const ids = codexFrames.map((frame) => frame.id);
    expect(ids.every((value): value is number => value !== undefined)).toBe(true);
    expect(ids.every(
      (value, index) => index === 0 || value! > ids[index - 1]!,
    )).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(frames.filter((frame) => frame.event === 'done')).toHaveLength(1);
    expect(codexFrames.some((frame) => frame.data.includes('unexpected')))
      .toBe(true);
    expect(codexFrames.some((frame) =>
      frame.data.includes('game_play_centrality')))
      .toBe(true);

    const record = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}`,
      headers: AUTH,
    });
    expect(record.json()).toMatchObject({ id, state: 'completed' });

    const result = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}/result`,
      headers: AUTH,
    });
    expect(result.json()).toMatchObject({
      kind: 'schema',
      value: { status: 'complete' },
    });
  });

  it('cancels the active retry attempt with one public done event', async () => {
    const fixture = makeFixture('invalid-schema-then-hang');
    const id = await submit(fixture);
    const retry = await waitFor(() => {
      const attempts = fixture.store.operationAttempts(id);
      const active = attempts.at(-1);
      return attempts.length === 2 && active?.state === 'running'
        ? active
        : undefined;
    });

    const cancelResponse = await fixture.app.inject({
      method: 'POST',
      url: `/api/ops/${id}/cancel`,
      headers: AUTH,
    });
    expect(cancelResponse.statusCode).toBe(200);

    const stream = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}/events`,
      headers: AUTH,
    });
    const attempts = fixture.store.operationAttempts(id);
    expect(attempts[0]).toMatchObject({ state: 'invalid-output' });
    expect(attempts[1]).toMatchObject({
      id: retry.id,
      state: 'cancelled',
    });
    expect(fixture.store.activeAttempt(id)?.id).toBe(retry.id);
    expect(rawSseFrames(stream.body).filter(
      (frame) => frame.event === 'done',
    )).toHaveLength(1);

    const record = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}`,
      headers: AUTH,
    });
    expect(record.json()).toMatchObject({ id, state: 'cancelled' });
  });

  it('refuses to resume a generic non-resumable operation', async () => {
    const fixture = makeFixture('operation-schema');
    const originalId = await submit(fixture);
    await waitForTerminal(fixture, originalId);

    const response = await fixture.app.inject({
      method: 'POST',
      url: `/api/ops/${originalId}/resume`,
      headers: AUTH,
      payload: { inputs: { selection: 'Fresh passage.' } },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'operation quick-gate-check is not resumable',
    });
  });

  it('refuses draft-scoped operations on the generic resume route with a structured redirect', async () => {
    const fixture = makeFixture('raw-success');
    const id = fixture.service.submitDraftScoped(
      'rewrite-selection',
      { selection: 'Original passage.' },
      ['Keep the exact lesson.'],
      { draftId: 'draft-1', cwd: fixture.root },
    );
    fixture.ids.push(id);

    const response = await fixture.app.inject({
      method: 'POST',
      url: `/api/ops/${id}/resume`,
      headers: AUTH,
      payload: { inputs: { selection: 'Try again.' } },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error:
        'operation resume refused: rewrite-selection must use /api/drafts/:id/ops/:operationId/resume',
      code: 'draft-scoped-resume-required',
      recoverable: true,
      operation: 'rewrite-selection',
      draftId: 'draft-1',
      route: '/api/drafts/:id/ops/:operationId/resume',
    });
    expect(fixture.store.recentOperations()).toHaveLength(1);
  });

  it('refuses a historical draft-writing resume even when draft_id is null', async () => {
    const fixture = makeFixture('operation-schema');
    persistOperation(fixture, {
      id: 'historical-null-draft',
      operation: 'rewrite-selection',
      state: 'completed',
      createdAt: '2026-07-23T09:00:00.000Z',
    });

    const response = await fixture.app.inject({
      method: 'POST',
      url: '/api/ops/historical-null-draft/resume',
      headers: AUTH,
      payload: { inputs: { selection: 'Try again.' } },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error:
        'operation resume refused: rewrite-selection must use /api/drafts/:id/ops/:operationId/resume',
      code: 'draft-scoped-resume-required',
      recoverable: true,
      operation: 'rewrite-selection',
      draftId: null,
      route: '/api/drafts/:id/ops/:operationId/resume',
    });
    expect(fixture.store.recentOperations()).toHaveLength(1);
  });

  it('cancels a running operation over HTTP and closes its event stream', async () => {
    const fixture = makeFixture('hang');
    const id = await submit(fixture);
    await waitFor(() => fixture.service.events(id).length >= 2);
    await waitFor(() => fixture.store.get(id)?.state === 'running');

    const cancelResponse = await fixture.app.inject({
      method: 'POST',
      url: `/api/ops/${id}/cancel`,
      headers: AUTH,
    });
    expect(cancelResponse.statusCode).toBe(200);
    expect(cancelResponse.json()).toEqual({ id });

    const stream = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}/events`,
      headers: AUTH,
    });
    expect(stream.body).toMatch(/event: done\ndata: \{\}\n\n$/);

    const record = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}`,
      headers: AUTH,
    });
    expect(record.json()).toMatchObject({ id, state: 'cancelled' });
  });

  it('emits a heartbeat comment after 15 seconds without an event', async () => {
    vi.useFakeTimers();
    let state: JobState = 'running';
    const app = buildApp({
      nonce: NONCE,
      operationService: {
        submit: () => 'job-heartbeat',
        list: () => [],
        events: () => [],
        get: () => ({ state }) as JobRecord & {
          operation: 'rewrite-selection';
          draftId: null;
          stalled: boolean;
        },
        cancel: () => {},
        result: () => ({ kind: 'pending' }),
      },
      documentService: UNUSED_DOCUMENT_SERVICE,
      artifactService: {},
      validatorService: UNUSED_VALIDATOR_SERVICE,
    });

    const responsePromise = app.inject({
      method: 'GET',
      url: '/api/ops/job-heartbeat/events',
      headers: AUTH,
    });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(15_000);
    state = 'completed';
    await vi.advanceTimersByTimeAsync(250);
    const response = await responsePromise;

    expect(response.statusCode).toBe(200);
    expect(response.body.match(/^: heartbeat$/gm)).toHaveLength(1);
    expect(response.body).toMatch(/event: done\ndata: \{\}\n\n$/);
    await app.close();
  });

  it('returns a generic 500 for unexpected operation-service failures', async () => {
    const app = buildApp({
      nonce: NONCE,
      operationService: {
        submit: () => {
          throw new Error('database disk image is malformed');
        },
        list: () => [],
        events: () => [],
        get: () => {
          throw new Error('database disk image is malformed');
        },
        cancel: () => {},
        result: () => ({ kind: 'pending' }),
      },
      documentService: UNUSED_DOCUMENT_SERVICE,
      artifactService: {},
      validatorService: UNUSED_VALIDATOR_SERVICE,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/ops',
      headers: AUTH,
      payload: {
        operation: 'quick-gate-check',
        inputs: { selection: 'Original passage.' },
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'internal server error' });
    expect(response.body).not.toContain('database');
    await app.close();
  });

  it('submits and resumes draft-scoped operations without putting draftId in inputs', async () => {
    const submitOperation = vi.fn(() => 'draft-operation-1');
    const resumeOperation = vi.fn(() => 'draft-operation-2');
    const app = buildApp({
      nonce: NONCE,
      operationService: {
        submit: () => 'unused',
        list: () => [],
        events: () => [],
        get: () => {
          throw new Error('operation not found: unused');
        },
        cancel: () => {},
        result: () => ({ kind: 'pending' }),
      },
      documentService: UNUSED_DOCUMENT_SERVICE,
      architectureService: {
        get: () => {
          throw new Error('unused');
        },
        save: () => {
          throw new Error('unused');
        },
        submitOperation,
        resumeOperation,
      },
      artifactService: {},
      validatorService: UNUSED_VALIDATOR_SERVICE,
    });

    const submitted = await app.inject({
      method: 'POST',
      url: '/api/drafts/draft-7/ops',
      headers: AUTH,
      payload: {
        operation: 'review-architecture',
        inputs: {
          draftId: 'forged',
          architecture_md: '### Core answer\n\nA mechanism.',
        },
      },
    });
    const resumed = await app.inject({
      method: 'POST',
      url: '/api/drafts/draft-7/ops/draft-operation-1/resume',
      headers: AUTH,
      payload: {
        inputs: {
          draftId: 'forged',
          architecture_md: '### Core answer\n\nA revised mechanism.',
        },
      },
    });

    expect(submitted.statusCode).toBe(200);
    expect(submitted.json()).toEqual({ id: 'draft-operation-1' });
    expect(submitOperation).toHaveBeenCalledWith(
      'draft-7',
      'review-architecture',
      {
        draftId: 'forged',
        architecture_md: '### Core answer\n\nA mechanism.',
      },
    );
    expect(resumed.statusCode).toBe(200);
    expect(resumed.json()).toEqual({ id: 'draft-operation-2' });
    expect(resumeOperation).toHaveBeenCalledWith(
      'draft-7',
      'draft-operation-1',
      {
        draftId: 'forged',
        architecture_md: '### Core answer\n\nA revised mechanism.',
      },
    );
    await app.close();
  });

  it('passes re-roll and rejection reasons verbatim through typed durable actions', async () => {
    const resumeOperation = vi.fn(() => 'operation-child');
    const resolveNarrationProposal = vi.fn(() => ({
      draftId: 'draft-1',
      operationId: 'operation-reject',
      state: 'rejected' as const,
      createdAt: '2026-07-24T08:00:00.000Z',
      resolvedAt: '2026-07-24T08:01:00.000Z',
      reasonNote: '  Keep the original rhythm.  ',
      successorOperationId: null,
    }));
    const rejectArchitectureProposal = vi.fn();
    const app = buildApp({
      nonce: NONCE,
      operationService: {
        submit: () => 'unused',
        list: () => [],
        events: () => [],
        get: () => {
          throw new Error('operation not found: unused');
        },
        cancel: () => {},
        result: () => ({ kind: 'pending' }),
      },
      documentService: UNUSED_DOCUMENT_SERVICE,
      architectureService: {
        get: () => {
          throw new Error('unused');
        },
        save: () => {
          throw new Error('unused');
        },
        submitOperation: () => 'unused',
        resumeOperation,
        resolveNarrationProposal,
        rejectArchitectureProposal,
      },
      artifactService: {},
      validatorService: UNUSED_VALIDATOR_SERVICE,
    });

    const rerolled = await app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/ops/operation-parent/resume',
      headers: AUTH,
      payload: {
        inputs: { selection: 'Try again.' },
        reason: '  The first version over-explained.  ',
      },
    });
    const rejected = await app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/narration/proposals/operation-reject/resolve',
      headers: AUTH,
      payload: {
        decision: 'rejected',
        reason: '  Keep the original rhythm.  ',
      },
    });
    const architectureRejected = await app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/architecture/proposals/architecture-op/reject',
      headers: AUTH,
      payload: { reason: null },
    });

    expect(rerolled.statusCode).toBe(200);
    expect(resumeOperation).toHaveBeenCalledWith(
      'draft-1',
      'operation-parent',
      { selection: 'Try again.' },
      '  The first version over-explained.  ',
    );
    expect(rejected.statusCode).toBe(200);
    expect(resolveNarrationProposal).toHaveBeenCalledWith(
      'draft-1',
      'operation-reject',
      'rejected',
      '  Keep the original rhythm.  ',
    );
    expect(architectureRejected.statusCode).toBe(200);
    expect(rejectArchitectureProposal).toHaveBeenCalledWith(
      'draft-1',
      'architecture-op',
      null,
    );
    await app.close();
  });

  it('lists cursor-paginated decisions and stores optional notes verbatim', async () => {
    const list = vi.fn(() => ({
      decisions: [{
        id: 'decision-1',
        draftId: 'draft-1',
        seq: 1,
        kind: 'proposal-rejected' as const,
        disposition: 'rejected',
        sourceTimestamp: '2026-07-24T08:00:00.000Z',
        createdAt: '2026-07-24T08:00:00.000Z',
        note: null,
        context: {
          source: {
            type: 'architecture-proposal',
            id: 'operation-1',
            disposition: 'rejected',
          },
        },
      }],
      nextCursor: null,
    }));
    const setNote = vi.fn(() => ({
      id: 'decision-1',
      draftId: 'draft-1',
      seq: 1,
      kind: 'proposal-rejected' as const,
      disposition: 'rejected',
      sourceTimestamp: '2026-07-24T08:00:00.000Z',
      createdAt: '2026-07-24T08:00:00.000Z',
      note: '  exact note  ',
      context: {
        source: {
          type: 'architecture-proposal',
          id: 'operation-1',
          disposition: 'rejected',
        },
      },
    }));
    const app = buildApp({
      nonce: NONCE,
      operationService: {
        submit: () => 'unused',
        list: () => [],
        events: () => [],
        get: () => {
          throw new Error('operation not found: unused');
        },
        cancel: () => {},
        result: () => ({ kind: 'pending' }),
      },
      documentService: UNUSED_DOCUMENT_SERVICE,
      learningService: {
        list,
        setNote,
        recordValidatorAttempt: vi.fn(),
      },
      artifactService: {},
      validatorService: UNUSED_VALIDATOR_SERVICE,
    });

    const listed = await app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1/decisions?after=4&limit=20',
      headers: AUTH,
    });
    const noted = await app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1/decisions/decision-1/note',
      headers: AUTH,
      payload: { note: '  exact note  ' },
    });

    expect(listed.statusCode).toBe(200);
    expect(list).toHaveBeenCalledWith('draft-1', {
      after: 4,
      limit: 20,
    });
    expect(noted.statusCode).toBe(200);
    expect(setNote).toHaveBeenCalledWith(
      'draft-1',
      'decision-1',
      '  exact note  ',
    );
    await app.close();
  });

  it.each([
    'generate-scoped',
    'generate-episode',
    'generate-architecture',
    'review',
    'review-architecture',
    'rewrite-selection',
    'rewrite-architecture-section',
    'generate-alternatives',
    'promote',
  ])(
    'requires %s to use the draft-scoped submission route',
    async (operation) => {
      const fixture = makeFixture('happy');

      const response = await fixture.app.inject({
        method: 'POST',
        url: '/api/ops',
        headers: AUTH,
        payload: {
          operation,
          inputs: {
            creative_status: { phase: 'creative-approved' },
            approved_architecture_md: 'forged approval',
          },
        },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: `operation submit refused: ${operation} must use /api/drafts/:id/ops`,
        code: 'draft-scoped-submission-required',
        recoverable: true,
        operation,
        route: '/api/drafts/:id/ops',
      });
      expect(fixture.store.recentOperations()).toEqual([]);
    },
  );

  it('routes Distill exclusively through the learning-service endpoint', async () => {
    const fixture = makeFixture('operation-schema');
    for (const url of ['/api/ops', '/api/drafts/draft-1/ops']) {
      const response = await fixture.app.inject({
        method: 'POST',
        url,
        headers: AUTH,
        payload: {
          operation: 'distill',
          inputs: { session: {}, existing_lessons: [] },
        },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error:
          'operation submit refused: distill must use /api/drafts/:id/distill',
        code: 'draft-scoped-submission-required',
        recoverable: true,
        operation: 'distill',
        route: '/api/drafts/:id/distill',
      });
    }
    expect(fixture.store.recentOperations()).toEqual([]);
  });

  it('serves a verified durable candidate only through its redacted repository reference', async () => {
    const fixture = makeFixture('distill-complete');
    const id = fixture.service.submit('distill', {
      session: {
        id: 'session-1',
        draft_id: 'draft-1',
        trigger: 'on-demand',
        decisions: [{ id: 'decision-1', kind: 'proposal-rejected' }],
      },
      existing_lessons: [],
    }, { cwd: fixture.root });
    fixture.ids.push(id);
    await waitForTerminal(fixture, id);
    const doctrine =
      'When a causal claim is accepted, preserve the visible choice that demonstrates it.';
    expect(JSON.stringify(fixture.service.result(id))).toContain(doctrine);

    fixture.service.redactAppliedDurableLesson(id, {
      lessonId: 'lesson-durable',
      candidates: [doctrine],
      repositoryProvenance: {
        commit: 'commit-1',
        path: 'whp-youtube/STEERING.md',
        anchor: 'lines:4-4',
        contentHash: 'sha256:doctrine',
      },
      sourceProvenance: {
        distillationRunId: 'run-1',
      },
    });

    const operation = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}`,
      headers: AUTH,
    });
    const result = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${id}/result`,
      headers: AUTH,
    });
    expect(operation.statusCode).toBe(200);
    expect(result.statusCode).toBe(200);
    expect(`${operation.body}\n${result.body}`).not.toContain(doctrine);
    const responseResult = result.json<{
      kind: string;
      value: {
        lessons: Array<{
          classification: string;
          lesson_markdown: unknown;
        }>;
      };
    }>();
    expect(responseResult.kind).toBe('schema');
    expect(
      responseResult.value.lessons.find(
        ({ classification }) => classification === 'durable',
      )?.lesson_markdown,
    ).toEqual({
      kind: 'repository-reference',
      lesson_id: 'lesson-durable',
      repository_provenance: {
        commit: 'commit-1',
        path: 'whp-youtube/STEERING.md',
        anchor: 'lines:4-4',
        content_hash: 'sha256:doctrine',
      },
      source_provenance: {
        distillation_run_id: 'run-1',
        operation_id: id,
      },
    });
  });

  it('runs the Plan 6 dispatcher for raw and strict architecture operations over HTTP', async () => {
    const fixture = makeFixture('plan6-flow');
    const generatedId = fixture.service.submitDraftScoped(
      'generate-architecture',
      {
        topic_brief: 'A selected topic.',
        approved_lessons: [],
        user_constraints: '',
      },
      [],
      { draftId: 'draft-1', cwd: fixture.root },
    );
    const reviewedId = fixture.service.submitDraftScoped(
      'review-architecture',
      {
        architecture_md: '### Core answer\n\nA mechanism.',
        topic_brief: 'A selected topic.',
      },
      [],
      { draftId: 'draft-1', cwd: fixture.root },
    );
    fixture.ids.push(generatedId, reviewedId);
    await waitForTerminal(fixture, generatedId);
    await waitForTerminal(fixture, reviewedId);

    const generated = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${generatedId}/result`,
      headers: AUTH,
    });
    const reviewed = await fixture.app.inject({
      method: 'GET',
      url: `/api/ops/${reviewedId}/result`,
      headers: AUTH,
    });

    expect(generated.statusCode).toBe(200);
    expect(generated.json()).toMatchObject({
      kind: 'raw',
      markdown: expect.stringContaining('### Scope boundary'),
    });
    expect(reviewed.statusCode).toBe(200);
    expect(reviewed.json()).toMatchObject({
      kind: 'schema',
      value: {
        status: 'complete',
        findings: expect.arrayContaining([
          {
            section_key: 'concept-inventory',
            severity: 'blocking',
            finding_markdown: 'Fake finding_markdown.',
          },
          {
            section_key: 'package-and-audience',
            severity: 'important',
            finding_markdown: 'Fake finding_markdown.',
          },
        ]),
        guardrail_markdown: null,
      },
      guardrail: null,
    });
  });
});
