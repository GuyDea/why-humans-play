import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JobStore } from '../job-store.js';
import { jobPaths } from '../runner-status.js';
import type { JobSupervisor } from '../supervisor.js';
import type {
  CodexEvent,
  JobRecord,
  OperationState,
  StoredOperation,
} from '../types.js';
import { buildEnvelopePrompt } from './envelope.js';
import {
  OPERATIONS,
  type OperationDefinition,
  type OperationName,
  type OperationTimeoutClass,
} from './registry.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');
const STALL_MS = 120_000;
const TIMEOUT_MS: Record<OperationTimeoutClass, number> = {
  scoped: 15 * 60 * 1000,
  episode: 30 * 60 * 1000,
  long: 120 * 60 * 1000,
};

const SYSTEM_CLOCK: OperationClock = {
  now: () => Date.now(),
  setTimeout: (callback, delayMs) => {
    const timer = globalThis.setTimeout(callback, delayMs);
    timer.unref?.();
    return timer;
  },
  clearTimeout: (timer) => globalThis.clearTimeout(
    timer as ReturnType<typeof globalThis.setTimeout>,
  ),
};

interface Activity {
  lastSeq: number;
  lastEventAt: number;
}

export interface OperationClock {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(timer: unknown): void;
}

export interface OperationRecord
  extends Omit<JobRecord, 'id' | 'operationId' | 'state'> {
  id: string;
  operation: OperationName;
  draftId: string | null;
  state: OperationState;
  stalled: boolean;
}

export interface OperationListRecord {
  id: string;
  operation: OperationName;
  draftId: string | null;
  state: OperationState;
  createdAt: string;
  finishedAt: string | null;
  stalled: boolean;
  usageAvailable: 0 | 1;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningOutputTokens: number | null;
}

export type OperationServiceResult =
  | { kind: 'schema'; value: unknown; guardrail: string | null }
  | { kind: 'raw'; markdown: string }
  | { kind: 'failed'; error: string }
  | { kind: 'pending' };

export class DraftScopedResumeRequiredError extends Error {
  readonly code = 'draft-scoped-resume-required';
  readonly recoverable = true;

  constructor(readonly draftId: string) {
    super(
      `operation resume refused: use the draft-scoped resume route for draft ${draftId}`,
    );
    this.name = 'DraftScopedResumeRequiredError';
  }
}

export class OperationService {
  private readonly supervisor: JobSupervisor;
  private readonly store: JobStore;
  private readonly clock: OperationClock;
  private readonly codexBin: string | undefined;
  private readonly activity = new Map<string, Activity>();
  private readonly deadlineTimers = new Map<string, unknown>();
  private readonly unsubscribeTerminal: () => void;
  private disposed = false;

  constructor(opts: {
    supervisor: JobSupervisor;
    store: JobStore;
    clock?: OperationClock;
    codexBin?: string;
  }) {
    this.supervisor = opts.supervisor;
    this.store = opts.store;
    this.clock = opts.clock ?? SYSTEM_CLOCK;
    this.codexBin = opts.codexBin;
    this.unsubscribeTerminal = this.store.onOperationTerminal(
      (id) => this.clearDeadline(id),
    );
    this.rearmDeadlines();
  }

  submit(
    opName: OperationName,
    inputs: unknown,
    opts: { resumeOf?: string; cwd?: string } = {},
  ): string {
    return this.submitPrepared(opName, inputs, null, opts);
  }

  submitDraftScoped(
    opName: OperationName,
    inputs: unknown,
    approvedLessons: string[],
    opts: { draftId: string; resumeOf?: string; cwd?: string },
  ): string {
    if (!approvedLessons.every((lesson) => typeof lesson === 'string')) {
      throw new Error('authoritative approved lessons must be strings');
    }
    return this.submitPrepared(
      opName,
      inputs,
      [...approvedLessons],
      opts,
    );
  }

  inputs(id: string): unknown {
    const operation = this.requireOperation(id);
    const attempt = this.store.operationAttempts(operation.id)[0];
    if (!attempt) {
      throw new Error(`operation ${id} has no persisted attempt`);
    }
    const envelope = JSON.parse(attempt.envelopeJson) as { prompt?: unknown };
    if (typeof envelope.prompt !== 'string') {
      throw new Error(`operation ${id} has no persisted prompt`);
    }
    const marker = '\nInputs: ';
    const index = envelope.prompt.indexOf(marker);
    if (index < 0) throw new Error(`operation ${id} has invalid inputs`);
    return JSON.parse(envelope.prompt.slice(index + marker.length)) as unknown;
  }

  private submitPrepared(
    opName: OperationName,
    inputs: unknown,
    approvedLessons: string[] | null,
    opts: { draftId?: string; resumeOf?: string; cwd?: string },
  ): string {
    const definition = this.definition(opName);
    if (inputs === undefined) throw new Error('full inputs are required');
    const authoritativeInputs = authoritativeOperationInputs(
      definition,
      inputs,
      approvedLessons,
    );

    let resumedFrom: string | undefined;
    let resumeThreadId: string | undefined;
    if (opts.resumeOf !== undefined) {
      const parentOperation = this.requireOperation(opts.resumeOf);
      if (parentOperation.draftId !== (opts.draftId ?? null)) {
        throw new Error(
          'operation resume refused: parent draft ownership does not match',
        );
      }
      const parent = this.activeAttempt(parentOperation.id);
      if (parentOperation.name !== definition.name) {
        throw new Error(
          `cannot resume ${parentOperation.name} as ${definition.name}`,
        );
      }
      if (!definition.resumable) {
        throw new Error(`operation ${definition.name} is not resumable`);
      }
      if (this.resumeDepth(parent) >= 3) {
        throw new Error('maximum resume chain length is 3');
      }
      if (!parent.threadId) {
        throw new Error('operation cannot be resumed without a thread id');
      }
      resumedFrom = parent.id;
      resumeThreadId = parent.threadId;
    }

    const id = randomUUID();
    const createdAtMs = this.clock.now();
    const createdAt = new Date(createdAtMs).toISOString();
    const deadlineAt = new Date(
      createdAtMs + TIMEOUT_MS[definition.timeoutClass],
    ).toISOString();
    this.supervisor.enqueue({
      jobId: id,
      prompt: buildEnvelopePrompt(definition, authoritativeInputs),
      cwd: resolve(opts.cwd ?? REPO_ROOT),
      sandbox: definition.sandbox,
      outputSchema: definition.result.kind === 'schema'
        ? definition.result.schema
        : undefined,
      resumeThreadId,
      codexBin: this.codexBin,
    }, {
      resumedFrom,
      operation: {
        id,
        name: definition.name,
        ...(opts.draftId ? { draftId: opts.draftId } : {}),
        deadlineAt,
        createdAt,
      },
    });
    this.activity.set(id, { lastSeq: 0, lastEventAt: createdAtMs });
    this.armDeadline(id, Date.parse(deadlineAt));
    if (isTerminalState(this.requireOperation(id).state)) {
      this.clearDeadline(id);
    }
    return id;
  }

  get(id: string): OperationRecord {
    const operation = this.requireOperation(id);
    const job = this.activeAttempt(id);
    const events = this.events(id);
    this.observeEvents(id, job, events);
    const activity = this.activityFor(id, job);
    return {
      ...job,
      id: operation.id,
      operation: operation.name as OperationName,
      draftId: operation.draftId,
      state: operation.state === 'timed-out'
        ? 'timed-out'
        : job.state,
      stalled: job.state === 'running'
        && this.clock.now() - activity.lastEventAt >= STALL_MS,
    };
  }

  list(): OperationListRecord[] {
    return this.store.recentOperations().map((operation) => {
      const record = this.get(operation.id);
      return {
        id: record.id,
        operation: record.operation,
        draftId: record.draftId,
        state: record.state,
        createdAt: operation.createdAt,
        finishedAt: record.finishedAt,
        stalled: record.stalled,
        usageAvailable: record.usageAvailable,
        inputTokens: record.inputTokens,
        cachedInputTokens: record.cachedInputTokens,
        outputTokens: record.outputTokens,
        reasoningOutputTokens: record.reasoningOutputTokens,
      };
    });
  }

  /**
   * Public sequence numbers concatenate each attempt's persisted sequence
   * space. Attempt N starts after the final sequence emitted by attempt N-1.
   */
  events(id: string, fromSeq = 0): CodexEvent[] {
    this.requireOperation(id);
    const publicEvents: CodexEvent[] = [];
    let offset = 0;
    for (const attempt of this.store.operationAttempts(id)) {
      const attemptEvents = this.supervisor.events(attempt.id);
      for (const event of attemptEvents) {
        const publicEvent = { ...event, seq: offset + event.seq };
        if (publicEvent.seq > fromSeq) publicEvents.push(publicEvent);
      }
      offset += attemptEvents.at(-1)?.seq ?? 0;
    }
    const active = this.activeAttempt(id);
    this.observeEvents(id, active, publicEvents);
    return publicEvents;
  }

  eventFiles(id: string): string[] {
    this.requireOperation(id);
    return this.store.operationAttempts(id).map(
      (attempt) => jobPaths(attempt.jobDir).eventsFile,
    );
  }

  state(id: string): OperationState {
    return this.get(id).state;
  }

  isTerminal(id: string): boolean {
    const operation = this.requireOperation(id);
    const active = this.activeAttempt(id);
    return isTerminalState(operation.state) && isTerminalState(active.state);
  }

  cancel(id: string): void {
    this.requireOperation(id);
    this.supervisor.cancel(this.activeAttempt(id).id);
  }

  enforceDeadlinesAtBoot(now = this.clock.now()): void {
    for (const operation of this.store.nonTerminalOperations()) {
      const deadline = Date.parse(operation.deadlineAt);
      if (deadline <= now) this.timeout(operation.id, now);
      else this.armDeadline(operation.id, deadline);
    }
  }

  reconcileTimedOutAttempts(): void {
    for (const operation of this.store.timedOutOperations()) {
      const attempt = this.store.activeAttempt(operation.id);
      if (
        attempt
        && ['queued', 'running', 'cancelling'].includes(attempt.state)
      ) {
        this.timeout(operation.id, this.clock.now());
      }
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const timer of this.deadlineTimers.values()) {
      this.clock.clearTimeout(timer);
    }
    this.deadlineTimers.clear();
    this.activity.clear();
    this.unsubscribeTerminal();
  }

  result(id: string): OperationServiceResult {
    const operation = this.requireOperation(id);
    const job = this.activeAttempt(id);
    const definition = this.definition(operation.name);
    if (operation.state === 'timed-out') {
      return {
        kind: 'failed',
        error: `operation timed out at its ${operation.deadlineAt} deadline`,
      };
    }
    if (['queued', 'running', 'cancelling'].includes(job.state)) {
      return { kind: 'pending' };
    }
    if (job.state !== 'completed') {
      return {
        kind: 'failed',
        error: job.error ?? this.defaultError(job.state),
      };
    }

    const finalMessageFile = jobPaths(job.jobDir).finalMessageFile;
    if (!existsSync(finalMessageFile)) {
      return { kind: 'failed', error: 'operation produced no final result' };
    }
    const markdown = readFileSync(finalMessageFile, 'utf8');
    if (definition.result.kind === 'raw') {
      return { kind: 'raw', markdown };
    }
    try {
      const value = JSON.parse(markdown) as unknown;
      const guardrail = this.guardrailFrom(value);
      return { kind: 'schema', value, guardrail };
    } catch (error) {
      return {
        kind: 'failed',
        error: error instanceof Error
          ? error.message
          : 'invalid structured result',
      };
    }
  }

  private requireOperation(id: string): StoredOperation {
    const operation = this.store.getOperation(id);
    if (!operation) throw new Error(`operation not found: ${id}`);
    return operation;
  }

  private activeAttempt(operationId: string): JobRecord {
    const job = this.store.activeAttempt(operationId);
    if (!job) {
      throw new Error(`operation ${operationId} has no persisted attempt`);
    }
    return job;
  }

  private requireJob(id: string): JobRecord {
    const job = this.store.get(id);
    if (!job) throw new Error(`operation attempt not found: ${id}`);
    return job;
  }

  private definition(name: string): OperationDefinition {
    const operation = (OPERATIONS as Record<string, OperationDefinition>)[name];
    if (!operation) throw new Error(`unknown operation: ${name}`);
    return operation;
  }

  private resumeDepth(parent: JobRecord): number {
    let depth = 0;
    let current = parent;
    const seen = new Set<string>();
    while (current.resumedFrom !== null) {
      if (seen.has(current.id)) throw new Error('resume chain contains a cycle');
      seen.add(current.id);
      depth += 1;
      current = this.requireJob(current.resumedFrom);
    }
    return depth;
  }

  private rearmDeadlines(): void {
    for (const operation of this.store.nonTerminalOperations()) {
      const deadline = Date.parse(operation.deadlineAt);
      if (deadline > this.clock.now()) {
        this.armDeadline(operation.id, deadline);
      }
    }
  }

  private armDeadline(id: string, deadline: number): void {
    if (this.disposed) return;
    this.clearDeadline(id);
    const delay = deadline - this.clock.now();
    if (delay <= 0) return;
    const timer = this.clock.setTimeout(() => {
      this.deadlineTimers.delete(id);
      this.timeout(id, this.clock.now());
    }, delay);
    this.deadlineTimers.set(id, timer);
  }

  private clearDeadline(id: string): void {
    const timer = this.deadlineTimers.get(id);
    if (timer === undefined) return;
    this.clock.clearTimeout(timer);
    this.deadlineTimers.delete(id);
  }

  private timeout(id: string, now: number): void {
    if (this.disposed) return;
    const operation = this.store.getOperation(id);
    if (
      !operation
      || (
        operation.state !== 'timed-out'
        && isTerminalState(operation.state)
      )
    ) {
      return;
    }
    const job = this.store.activeAttempt(id);
    const graceMs = job
      ? (JSON.parse(job.envelopeJson) as { graceMs?: number }).graceMs ?? 5_000
      : 5_000;
    const attempt = this.store.timeoutOperationAndRequestCancellation(
      id,
      new Date(now).toISOString(),
      new Date(now + graceMs * 2).toISOString(),
    );
    if (attempt) {
      this.supervisor.reconcilePersistedCancellation(attempt.id);
    }
  }

  private observeEvents(
    operationId: string,
    job: JobRecord,
    events: CodexEvent[],
  ): void {
    const lastSeq = events.at(-1)?.seq;
    if (lastSeq === undefined) return;
    const activity = this.activity.get(operationId);
    if (!activity || lastSeq > activity.lastSeq) {
      this.activity.set(operationId, {
        lastSeq,
        lastEventAt: this.lastEventTime(job),
      });
    }
  }

  private lastEventTime(job: JobRecord): number {
    try {
      const modifiedAt = statSync(jobPaths(job.jobDir).eventsFile).mtimeMs;
      return Math.min(modifiedAt, this.clock.now());
    } catch {
      return this.clock.now();
    }
  }

  private activityFor(operationId: string, job: JobRecord): Activity {
    const existing = this.activity.get(operationId);
    if (existing) return existing;
    const persistedStart = Date.parse(job.startedAt ?? job.createdAt);
    const activity = {
      lastSeq: 0,
      lastEventAt: Number.isFinite(persistedStart)
        ? persistedStart
        : this.clock.now(),
    };
    this.activity.set(operationId, activity);
    return activity;
  }

  private guardrailFrom(value: unknown): string | null {
    if (!value || typeof value !== 'object') return null;
    const guardrail = (value as Record<string, unknown>).guardrail_markdown;
    return typeof guardrail === 'string' ? guardrail : null;
  }

  private defaultError(state: OperationState): string {
    if (state === 'cancelled') return 'operation cancelled';
    if (state === 'interrupted') return 'operation interrupted';
    if (state === 'invalid-output') {
      return 'operation returned invalid output';
    }
    return 'operation failed';
  }
}

function isTerminalState(state: OperationState): boolean {
  return !['queued', 'running', 'cancelling'].includes(state);
}

function authoritativeOperationInputs(
  definition: OperationDefinition,
  inputs: unknown,
  approvedLessons: string[] | null,
): unknown {
  if (
    definition.skill !== 'writing-whp-youtube-scripts'
    || definition.name === 'distill'
  ) {
    return inputs;
  }
  if (typeof inputs !== 'object' || inputs === null || Array.isArray(inputs)) {
    return inputs;
  }
  const result = { ...(inputs as Record<string, unknown>) };
  delete result['approved_lessons'];
  if (approvedLessons !== null) {
    result['approved_lessons'] = approvedLessons;
  }
  return result;
}
