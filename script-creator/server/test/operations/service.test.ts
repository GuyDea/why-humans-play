import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobStore } from '../../src/job-store.js';
import {
  OperationService,
  type OperationClock,
} from '../../src/operations/service.js';
import { REWRITE_SCHEMA } from '../../src/operations/schemas.js';
import { jobPaths, readStatus } from '../../src/runner-status.js';
import { JobSupervisor } from '../../src/supervisor.js';
import type { JobRecord } from '../../src/types.js';
import { waitFor } from '../helpers.js';

const FAKE_CODEX = join(import.meta.dirname, '..', 'fake-codex.mjs');
const REPO_ROOT = resolve(import.meta.dirname, '../../../..');
const SCOPED_TIMEOUT_MS = 15 * 60 * 1000;

class ManualClock implements OperationClock {
  private time: number;
  private nextId = 1;
  private readonly timers: Array<{
    id: number;
    at: number;
    callback: () => void;
  }> = [];

  constructor(start = Date.now()) {
    this.time = start;
  }

  now(): number {
    return this.time;
  }

  setTimeout(callback: () => void, delayMs: number): number {
    const id = this.nextId++;
    this.timers.push({ id, at: this.time + delayMs, callback });
    return id;
  }

  clearTimeout(id: unknown): void {
    const timer = this.timers.find((candidate) => candidate.id === id);
    if (timer) this.timers.splice(this.timers.indexOf(timer), 1);
  }

  advance(ms: number): void {
    this.time += ms;
    for (;;) {
      const next = this.timers
        .filter((timer) => timer.at <= this.time)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!next) return;
      this.timers.splice(this.timers.indexOf(next), 1);
      next.callback();
    }
  }

  pendingDelays(): number[] {
    return this.timers
      .map((timer) => timer.at - this.time)
      .sort((a, b) => a - b);
  }
}

interface Fixture {
  root: string;
  service: OperationService;
  supervisor: JobSupervisor;
  store: JobStore;
  clock: ManualClock;
  ids: string[];
  closed?: boolean;
}

const fixtures: Fixture[] = [];

function makeFixture(
  mode: string,
  extraEnv: Record<string, string> = {},
  codexBin?: string,
): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'operation-service-'));
  const binDir = join(root, 'bin');
  mkdirSync(binDir);
  symlinkSync(FAKE_CODEX, join(binDir, 'codex'));
  const store = new JobStore(join(root, 'state.sqlite3'));
  const supervisor = new JobSupervisor({
    store,
    jobsRoot: join(root, 'jobs'),
    pollMs: 20,
    env: {
      ...extraEnv,
      FAKE_CODEX_MODE: mode,
      FAKE_CODEX_ATTEMPT_FILE: join(root, 'attempt.marker'),
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
    },
  });
  const clock = new ManualClock();
  const service = new OperationService({
    supervisor,
    store,
    clock,
    codexBin,
  });
  const fixture = { root, service, supervisor, store, clock, ids: [] };
  fixtures.push(fixture);
  return fixture;
}

function submit(
  fixture: Fixture,
  ...args: Parameters<OperationService['submit']>
): string {
  const id = fixture.service.submit(...args);
  fixture.ids.push(id);
  return id;
}

async function terminal(fixture: Fixture, id: string): Promise<JobRecord> {
  return fixture.supervisor.waitForTerminal(id, 20_000);
}

async function operationTerminal(
  fixture: Fixture,
  id: string,
): Promise<JobRecord> {
  return waitFor(() => {
    const active = fixture.store.activeAttempt(id);
    return active
      && !['queued', 'running', 'cancelling'].includes(active.state)
      ? active
      : undefined;
  }, 20_000);
}

afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    if (fixture.closed) continue;
    for (const id of fixture.ids) {
      const state = fixture.store.get(id)?.state;
      if (state === 'queued' || state === 'running') fixture.supervisor.cancel(id);
    }
    for (const id of fixture.ids) {
      const state = fixture.store.get(id)?.state;
      if (state && ['queued', 'running', 'cancelling'].includes(state)) {
        await fixture.supervisor.waitForTerminal(id, 5_000).catch(() => undefined);
      }
    }
    fixture.service.dispose();
    fixture.supervisor.stop();
  }
});

describe('OperationService', () => {
  it('runs a happy schema operation with registry transport settings', async () => {
    const fixture = makeFixture('operation-schema');
    const inputs = { selection: 'Original passage.' };
    const id = submit(fixture, 'rewrite-selection', inputs);

    await terminal(fixture, id);

    expect(fixture.service.result(id)).toEqual({
      kind: 'schema',
      value: {
        status: 'complete',
        replacement_markdown: 'Rewritten passage.',
        guardrail_markdown: null,
      },
      guardrail: null,
    });
    const job = fixture.store.get(id)!;
    const envelope = JSON.parse(job.envelopeJson);
    expect(envelope.prompt).toBe(
      `$writing-whp-youtube-scripts\nOperation: Rewrite selection\nInputs: ${JSON.stringify(inputs)}`,
    );
    expect(envelope.cwd).toBe(REPO_ROOT);
    expect(envelope.sandbox).toBe('read-only');
    expect(envelope.outputSchema).toEqual(REWRITE_SCHEMA);
    expect(envelope).not.toHaveProperty('codexBin');
    expect(JSON.parse(readFileSync(jobPaths(job.jobDir).schemaFile, 'utf8')))
      .toEqual(REWRITE_SCHEMA);
    expect(fixture.service.events(id, 1).every((event) => event.seq > 1)).toBe(true);
  });

  it('puts the configured codex binary override in submitted envelopes', async () => {
    const codexBin = `${process.execPath} ${FAKE_CODEX}`;
    const fixture = makeFixture('operation-schema', {}, codexBin);
    const id = submit(
      fixture,
      'rewrite-selection',
      { selection: 'Original passage.' },
    );

    await terminal(fixture, id);

    const envelope = JSON.parse(fixture.store.get(id)!.envelopeJson);
    expect(envelope.codexBin).toBe(codexBin);
  });

  it('returns the final Markdown for a raw operation', async () => {
    const fixture = makeFixture('happy');
    const id = submit(fixture, 'generate-episode', { brief: 'A small test.' });

    await terminal(fixture, id);

    expect(fixture.service.result(id)).toEqual({ kind: 'raw', markdown: 'OK' });
    const envelope = JSON.parse(fixture.store.get(id)!.envelopeJson);
    expect(envelope.cwd).toBe(REPO_ROOT);
    expect(envelope.sandbox).toBe('read-only');
    expect(envelope.outputSchema).toBeUndefined();
  });

  it('routes a draft-scoped operation through its recorded workspace cwd', async () => {
    const fixture = makeFixture('happy');
    const workspace = mkdtempSync(join(tmpdir(), 'operation-workspace-'));
    const id = submit(
      fixture,
      'generate-episode',
      { brief: 'A workspace-routed test.' },
      { cwd: workspace },
    );

    await terminal(fixture, id);

    const envelope = JSON.parse(fixture.store.get(id)!.envelopeJson);
    expect(envelope.cwd).toBe(workspace);
  });

  it('dispatches Generate Architecture to the complete raw Markdown fixture', async () => {
    const fixture = makeFixture('plan6-flow');
    const id = submit(fixture, 'generate-architecture', {
      topic_brief: 'A selected topic.',
      approved_lessons: [],
      user_constraints: '',
    });

    await terminal(fixture, id);

    const result = fixture.service.result(id);
    expect(result.kind).toBe('raw');
    if (result.kind !== 'raw') throw new Error('expected raw result');
    expect(result.markdown).toContain('### Package and audience');
    expect(result.markdown).toContain('### Scope boundary');
    expect(result.markdown).toContain('### Fixture-only production note');
  });

  it('dispatches Review Architecture through strict enum-cycling schema output', async () => {
    const fixture = makeFixture('plan6-flow');
    const id = submit(fixture, 'review-architecture', {
      architecture_md: '### Core answer\n\nA mechanism.',
      topic_brief: 'A selected topic.',
    });

    expect((await terminal(fixture, id)).state).toBe('completed');

    const result = fixture.service.result(id);
    expect(result.kind).toBe('schema');
    if (result.kind !== 'schema') throw new Error('expected schema result');
    const value = result.value as {
      findings: Array<{ section_key: string; severity: string }>;
    };
    expect(value.findings).toHaveLength(11);
    expect(value.findings.slice(0, 4)).toMatchObject([
      { section_key: 'package-and-audience', severity: 'blocking' },
      { section_key: 'central-question', severity: 'important' },
      { section_key: 'core-answer', severity: 'optional' },
      { section_key: 'viewer-belief-shift', severity: 'blocking' },
    ]);
  });

  it.each(['declined', 'narrowed'] as const)(
    'passes through a %s guardrail as a schema result, not an error',
    async (status) => {
      const fixture = makeFixture('operation-guardrail', {
        FAKE_OPERATION_STATUS: status,
      });
      const id = submit(fixture, 'rewrite-selection', { selection: 'Out of scope.' });

      expect((await terminal(fixture, id)).state).toBe('completed');

      const result = fixture.service.result(id);
      expect(result.kind).toBe('schema');
      if (result.kind !== 'schema') throw new Error('expected schema result');
      expect(result.value).toMatchObject({ status });
      expect(result.guardrail).toBe('This request crosses the approved scope.');
    },
  );

  it.each(['declined', 'narrowed'] as const)(
    'keeps a Plan 6 architecture %s guardrail as a schema result',
    async (status) => {
      const fixture = makeFixture('plan6-flow', {
        FAKE_OPERATION_STATUS: status,
      });
      const id = submit(fixture, 'review-architecture', {
        architecture_md: '### Core answer\n\nA mechanism.',
        topic_brief: 'A selected topic.',
      });

      expect((await terminal(fixture, id)).state).toBe('completed');
      expect(fixture.service.result(id)).toMatchObject({
        kind: 'schema',
        value: {
          status,
          guardrail_markdown: 'This request crosses the approved scope.',
        },
        guardrail: 'This request crosses the approved scope.',
      });
    },
  );

  it('cancels an operation at its timeout-class hard limit', async () => {
    const fixture = makeFixture('hang');
    const id = submit(fixture, 'rewrite-selection', { selection: 'Slow passage.' });
    await waitFor(() => fixture.service.events(id).length >= 2);
    await waitFor(() => fixture.store.get(id)?.state === 'running');

    fixture.clock.advance(SCOPED_TIMEOUT_MS - 1);
    expect(fixture.store.get(id)!.state).toBe('running');
    fixture.clock.advance(1);

    expect((await terminal(fixture, id)).state).toBe('cancelled');
  });

  it('re-arms the original persisted deadline after recreation and lets the operation complete', async () => {
    const fixture = makeFixture('slow-operation-schema');
    const id = submit(fixture, 'rewrite-selection', {
      selection: 'Finish before the durable deadline.',
    });
    await waitFor(() => fixture.store.get(id)?.state === 'running');
    fixture.clock.advance(1_000);

    const restartedClock = new ManualClock(fixture.clock.now());
    const restarted = new OperationService({
      supervisor: fixture.supervisor,
      store: fixture.store,
      clock: restartedClock,
    });

    expect(restartedClock.pendingDelays()).toEqual([
      SCOPED_TIMEOUT_MS - 1_000,
    ]);
    await terminal(fixture, id);
    expect(restarted.result(id).kind).toBe('schema');
    restartedClock.advance(SCOPED_TIMEOUT_MS);
    expect(restarted.get(id).state).toBe('completed');
  });

  it('fires an overdue persisted deadline immediately after recreation', async () => {
    const fixture = makeFixture('hang');
    const id = submit(fixture, 'rewrite-selection', {
      selection: 'Still running when the daemon restarts.',
    });
    await waitFor(() => fixture.service.events(id).length >= 2);
    await waitFor(() => fixture.store.get(id)?.state === 'running');

    const restartedClock = new ManualClock(
      fixture.clock.now() + SCOPED_TIMEOUT_MS + 1,
    );
    const restarted = new OperationService({
      supervisor: fixture.supervisor,
      store: fixture.store,
      clock: restartedClock,
    });
    restarted.enforceDeadlinesAtBoot(restartedClock.now());
    fixture.supervisor.reattach();
    restarted.reconcileTimedOutAttempts();

    expect((await terminal(fixture, id)).state).toBe('cancelled');
    expect(restarted.get(id).state).toBe('timed-out');
    expect(restarted.result(id)).toEqual({
      kind: 'failed',
      error: expect.stringMatching(/timed out/i),
    });
  });

  it('keeps a late runner completion timed out when boot enforcement precedes reattach', async () => {
    const fixture = makeFixture('slow-operation-schema');
    fixture.clock.advance(-SCOPED_TIMEOUT_MS + 100);
    const id = submit(fixture, 'rewrite-selection', {
      selection: 'Complete while the daemon is down.',
    });
    await waitFor(() => fixture.store.get(id)?.state === 'running');
    const attempt = fixture.store.get(id)!;

    fixture.service.dispose();
    fixture.supervisor.stop();
    fixture.closed = true;
    await waitFor(
      () => readStatus(jobPaths(attempt.jobDir).statusFile)?.state === 'completed',
      10_000,
    );

    const store = new JobStore(join(fixture.root, 'state.sqlite3'));
    const supervisor = new JobSupervisor({
      store,
      jobsRoot: join(fixture.root, 'jobs'),
      pollMs: 20,
    });
    const clock = new ManualClock(Date.now());
    const service = new OperationService({ supervisor, store, clock });
    Object.assign(fixture, {
      service,
      supervisor,
      store,
      clock,
      closed: false,
    });

    service.enforceDeadlinesAtBoot(clock.now());
    supervisor.reattach();
    service.reconcileTimedOutAttempts();
    await operationTerminal(fixture, id);

    expect(service.get(id).state).toBe('timed-out');
    expect(service.result(id)).toEqual({
      kind: 'failed',
      error: expect.stringMatching(/timed out/i),
    });
    expect(store.activeAttempt(id)?.state).toBe('cancelled');
  }, 20_000);

  it('atomically persists timeout cancellation before driving the runner', async () => {
    const fixture = makeFixture('hang');
    const id = submit(fixture, 'rewrite-selection', {
      selection: 'Persist cancellation before signalling.',
    });
    await waitFor(() => fixture.store.get(id)?.state === 'running');
    const reconcile = vi.spyOn(
      fixture.supervisor,
      'reconcilePersistedCancellation',
    ).mockImplementation(() => {
      throw new Error('simulated daemon crash after the transaction');
    });

    expect(() => fixture.clock.advance(SCOPED_TIMEOUT_MS)).toThrow(
      /simulated daemon crash/,
    );
    expect(fixture.store.getOperation(id)?.state).toBe('timed-out');
    expect(fixture.store.activeAttempt(id)).toMatchObject({
      state: 'cancelling',
    });
    expect(fixture.store.getCancellation(id)).toEqual({
      requestedAt: expect.any(String),
      deadlineAt: expect.any(String),
    });

    reconcile.mockRestore();
    fixture.service.reconcileTimedOutAttempts();
    expect((await terminal(fixture, id)).state).toBe('cancelled');
    expect(fixture.service.get(id).state).toBe('timed-out');
  });

  it('keeps a schema retry on the original operation deadline', async () => {
    const fixture = makeFixture('invalid-schema-then-hang');
    const id = submit(fixture, 'rewrite-selection', {
      selection: 'The retry must not receive a fresh timeout window.',
    });
    const retry = await waitFor(() => {
      const attempts = fixture.store.operationAttempts(id);
      const latest = attempts.at(-1);
      return attempts.length === 2 && latest?.state === 'running'
        ? latest
        : undefined;
    });

    expect(retry.retryOf).toBe(id);
    expect(retry.operationId).toBe(id);
    fixture.clock.advance(SCOPED_TIMEOUT_MS);
    await fixture.supervisor.waitForTerminal(retry.id, 5_000);

    expect(fixture.service.get(id).state).toBe('timed-out');
    expect(fixture.service.result(id)).toEqual({
      kind: 'failed',
      error: expect.stringMatching(/timed out/i),
    });
  });

  it('never launches a queued retry after its operation times out', async () => {
    const fixture = makeFixture('invalid-schema-then-hang');
    const id = submit(fixture, 'rewrite-selection', {
      selection: 'The retry must remain queued behind the blocker.',
    });
    const blockerId = submit(fixture, 'rewrite-selection', {
      selection: 'Occupy the runner after the first attempt finishes.',
    });
    const retry = await waitFor(() => {
      const attempts = fixture.store.operationAttempts(id);
      const active = attempts.at(-1);
      return attempts.length === 2
        && active?.state === 'queued'
        && fixture.store.get(blockerId)?.state === 'running'
        ? active
        : undefined;
    });

    fixture.clock.advance(SCOPED_TIMEOUT_MS);
    await operationTerminal(fixture, id);
    await operationTerminal(fixture, blockerId);

    expect(retry.id).not.toBe(id);
    expect(fixture.store.get(retry.id)?.state).toBe('cancelled');
    expect(existsSync(join(retry.jobDir, 'launch.json'))).toBe(false);
    expect(fixture.service.get(id).state).toBe('timed-out');
  });

  it('flags a running operation after 120 seconds without a new event', async () => {
    const fixture = makeFixture('hang');
    const id = submit(fixture, 'rewrite-selection', { selection: 'Slow passage.' });
    await waitFor(() => fixture.service.events(id).length >= 2);
    await waitFor(() => fixture.store.get(id)?.state === 'running');
    expect(fixture.service.get(id).stalled).toBe(false);

    fixture.clock.advance(120_000 - 1);
    expect(fixture.service.get(id).stalled).toBe(false);
    fixture.clock.advance(1);
    expect(fixture.service.get(id).stalled).toBe(true);

    fixture.service.cancel(id);
    expect((await terminal(fixture, id)).state).toBe('cancelled');
  });

  it('keeps the last event time across service recreation', async () => {
    const fixture = makeFixture('hang');
    const id = submit(fixture, 'rewrite-selection', { selection: 'Slow passage.' });
    await waitFor(() => fixture.service.events(id).length >= 2);
    await waitFor(() => fixture.store.get(id)?.state === 'running');
    const eventsFile = jobPaths(fixture.store.get(id)!.jobDir).eventsFile;
    const staleAt = new Date(fixture.clock.now() - 120_001);
    utimesSync(eventsFile, staleAt, staleAt);

    const recreated = new OperationService({
      supervisor: fixture.supervisor,
      store: fixture.store,
      clock: fixture.clock,
    });

    expect(recreated.get(id).stalled).toBe(true);
    recreated.cancel(id);
    expect((await terminal(fixture, id)).state).toBe('cancelled');
  });

  it('allows at most three persisted resume hops with fresh inputs', async () => {
    const fixture = makeFixture('operation-schema');
    let id = submit(fixture, 'rewrite-selection', { selection: 'Original.' });
    await terminal(fixture, id);

    for (let hop = 1; hop <= 3; hop += 1) {
      const parent = fixture.store.get(id)!;
      const inputs = { selection: `Fresh input ${hop}.` };
      const resumedId = submit(
        fixture,
        'rewrite-selection',
        inputs,
        { resumeOf: id },
      );
      const resumed = await terminal(fixture, resumedId);
      expect(resumed.resumedFrom).toBe(id);
      const envelope = JSON.parse(resumed.envelopeJson);
      expect(envelope.resumeThreadId).toBe(parent.threadId);
      expect(envelope.prompt).toContain(`Inputs: ${JSON.stringify(inputs)}`);
      id = resumedId;
    }

    expect(() => fixture.service.submit(
      'rewrite-selection',
      { selection: 'A fourth continuation.' },
      { resumeOf: id },
    )).toThrow(/maximum.*3/i);
    expect(() => fixture.service.submit(
      'rewrite-selection',
      undefined,
      { resumeOf: id },
    )).toThrow(/inputs/i);
  });

  it('keeps the same rewrite target when Plan 6 resumes with fresh inputs', async () => {
    const fixture = makeFixture('plan6-flow');
    const original = submit(fixture, 'rewrite-architecture-section', {
      section_key: 'earned-reframe',
      section_markdown: '### Earned reframe\n\nOriginal.',
      architecture_md: '### Earned reframe\n\nOriginal.',
      topic_brief: 'A selected topic.',
      user_instruction: 'Make it clearer.',
    });
    await terminal(fixture, original);

    const resumed = submit(
      fixture,
      'rewrite-architecture-section',
      {
        section_key: 'earned-reframe',
        section_markdown: '### Earned reframe\n\nOriginal.',
        architecture_md: '### Earned reframe\n\nOriginal.',
        topic_brief: 'A selected topic.',
        user_instruction: 'Now make it shorter.',
      },
      { resumeOf: original },
    );
    await terminal(fixture, resumed);

    expect(fixture.service.result(original)).toMatchObject({
      kind: 'schema',
      value: {
        replacement_markdown:
          '### Earned reframe\n\nFake rewrite for earned-reframe.\n',
      },
    });
    expect(fixture.service.result(resumed)).toMatchObject({
      kind: 'schema',
      value: {
        replacement_markdown:
          '### Earned reframe\n\nFake rewrite for earned-reframe.\n',
      },
    });
  });

  it('keeps persisted resume depth across a schema retry', async () => {
    const fixture = makeFixture('invalid-schema-once');
    let id = submit(fixture, 'rewrite-selection', { selection: 'Original.' });
    await operationTerminal(fixture, id);

    rmSync(join(fixture.root, 'attempt.marker'));
    const firstResume = submit(
      fixture,
      'rewrite-selection',
      { selection: 'First continuation with a schema retry.' },
      { resumeOf: id },
    );
    await operationTerminal(fixture, firstResume);
    const retry = fixture.store.activeAttempt(firstResume)!;
    expect(retry.retryOf).not.toBeNull();
    expect(retry.resumedFrom).toBe(fixture.store.activeAttempt(id)!.id);
    id = firstResume;

    for (let hop = 2; hop <= 3; hop += 1) {
      id = submit(
        fixture,
        'rewrite-selection',
        { selection: `Continuation ${hop}.` },
        { resumeOf: id },
      );
      await operationTerminal(fixture, id);
    }

    expect(() => fixture.service.submit(
      'rewrite-selection',
      { selection: 'A fourth continuation.' },
      { resumeOf: id },
    )).toThrow(/maximum.*3/i);
  });

  it('disposes deadline timers before the store closes', () => {
    const fixture = makeFixture('hang');
    submit(fixture, 'rewrite-selection', { selection: 'Close before timeout.' });
    expect(fixture.clock.pendingDelays()).toEqual([SCOPED_TIMEOUT_MS]);

    fixture.service.dispose();
    fixture.supervisor.stop();
    fixture.closed = true;

    expect(fixture.clock.pendingDelays()).toEqual([]);
    expect(() => fixture.clock.advance(SCOPED_TIMEOUT_MS)).not.toThrow();
  });

  it('clears a deadline timer when an operation becomes terminal', async () => {
    const fixture = makeFixture('operation-schema');
    const id = submit(fixture, 'rewrite-selection', { selection: 'Finish.' });
    expect(fixture.clock.pendingDelays()).toEqual([SCOPED_TIMEOUT_MS]);

    await terminal(fixture, id);

    expect(fixture.clock.pendingDelays()).toEqual([]);
  });

  it('refuses to resume a non-resumable operation', async () => {
    const fixture = makeFixture('happy');
    const id = submit(fixture, 'generate-episode', { brief: 'A small test.' });
    await terminal(fixture, id);

    expect(() => fixture.service.submit(
      'generate-episode',
      { brief: 'Fresh full inputs.' },
      { resumeOf: id },
    )).toThrow(/not resumable/i);
  });
});
