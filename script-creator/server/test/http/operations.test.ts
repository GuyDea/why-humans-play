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
  operation = 'rewrite-selection',
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

function sseEventSequences(body: string): number[] {
  return [...body.matchAll(/^id: (\d+)$/gm)].map((match) => Number(match[1]));
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
    fixture.supervisor.stop();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

describe('operations HTTP API', () => {
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
      operation: 'rewrite-selection',
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
      value: {
        status: 'complete',
        replacement_markdown: 'Rewritten passage.',
        guardrail_markdown: null,
      },
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

  it('resumes an operation with fresh inputs over HTTP', async () => {
    const fixture = makeFixture('operation-schema');
    const originalId = await submit(fixture);
    await waitForTerminal(fixture, originalId);

    const response = await fixture.app.inject({
      method: 'POST',
      url: `/api/ops/${originalId}/resume`,
      headers: AUTH,
      payload: { inputs: { selection: 'Fresh passage.' } },
    });

    expect(response.statusCode).toBe(200);
    const { id } = response.json<{ id: string }>();
    fixture.ids.push(id);
    expect(id).not.toBe(originalId);
    expect((await waitForTerminal(fixture, id)).resumedFrom).toBe(originalId);
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
        events: () => [],
        get: () => ({ state }) as JobRecord & {
          operation: 'rewrite-selection';
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
        operation: 'rewrite-selection',
        inputs: { selection: 'Original passage.' },
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'internal server error' });
    expect(response.body).not.toContain('database');
    await app.close();
  });
});
