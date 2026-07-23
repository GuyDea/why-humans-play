import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JobStore } from '../job-store.js';
import { jobPaths } from '../runner-status.js';
import type { JobSupervisor } from '../supervisor.js';
import type {
  CodexEvent,
  JobEnvelope,
  JobRecord,
  JobState,
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
};

interface Activity {
  lastSeq: number;
  lastEventAt: number;
}

export interface OperationClock {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
}

export interface OperationRecord extends JobRecord {
  operation: OperationName;
  stalled: boolean;
}

export type OperationServiceResult =
  | { kind: 'schema'; value: unknown; guardrail: string | null }
  | { kind: 'raw'; markdown: string }
  | { kind: 'failed'; error: string }
  | { kind: 'pending' };

export class OperationService {
  private readonly supervisor: JobSupervisor;
  private readonly store: JobStore;
  private readonly clock: OperationClock;
  private readonly activity = new Map<string, Activity>();

  constructor(opts: {
    supervisor: JobSupervisor;
    store: JobStore;
    clock?: OperationClock;
  }) {
    this.supervisor = opts.supervisor;
    this.store = opts.store;
    this.clock = opts.clock ?? SYSTEM_CLOCK;
  }

  submit(
    opName: OperationName,
    inputs: unknown,
    opts: { resumeOf?: string } = {},
  ): string {
    const operation = (OPERATIONS as Record<string, OperationDefinition>)[opName];
    if (!operation) throw new Error(`unknown operation: ${opName}`);
    if (inputs === undefined) throw new Error('full inputs are required');

    let resumedFrom: string | undefined;
    let resumeThreadId: string | undefined;
    if (opts.resumeOf !== undefined) {
      const parent = this.requireJob(opts.resumeOf);
      const parentOperation = this.operationFor(parent);
      if (parentOperation.name !== operation.name) {
        throw new Error(
          `cannot resume ${parentOperation.name} as ${operation.name}`,
        );
      }
      if (!operation.resumable) {
        throw new Error(`operation ${operation.name} is not resumable`);
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

    const id = this.supervisor.enqueue({
      prompt: buildEnvelopePrompt(operation, inputs),
      cwd: REPO_ROOT,
      sandbox: operation.sandbox,
      outputSchema: operation.result.kind === 'schema'
        ? operation.result.schema
        : undefined,
      resumeThreadId,
    }, { resumedFrom });
    this.activity.set(id, { lastSeq: 0, lastEventAt: this.clock.now() });
    this.clock.setTimeout(() => this.timeout(id), TIMEOUT_MS[operation.timeoutClass]);
    return id;
  }

  get(id: string): OperationRecord {
    const job = this.requireJob(id);
    const operation = this.operationFor(job);
    this.observeEvents(job, this.supervisor.events(id));
    const activity = this.activityFor(job);
    return {
      ...job,
      operation: operation.name as OperationName,
      stalled: job.state === 'running'
        && this.clock.now() - activity.lastEventAt >= STALL_MS,
    };
  }

  events(id: string, fromSeq = 0): CodexEvent[] {
    const job = this.requireJob(id);
    const events = this.supervisor.events(id, fromSeq);
    this.observeEvents(job, events);
    return events;
  }

  state(id: string): JobState {
    return this.requireJob(id).state;
  }

  cancel(id: string): void {
    this.requireJob(id);
    this.supervisor.cancel(id);
  }

  result(id: string): OperationServiceResult {
    const job = this.requireJob(id);
    const operation = this.operationFor(job);
    if (['queued', 'running', 'cancelling'].includes(job.state)) {
      return { kind: 'pending' };
    }
    if (job.state !== 'completed') {
      return {
        kind: 'failed',
        error: job.error ?? this.defaultError(job),
      };
    }

    const finalMessageFile = jobPaths(job.jobDir).finalMessageFile;
    if (!existsSync(finalMessageFile)) {
      return { kind: 'failed', error: 'operation produced no final result' };
    }
    const markdown = readFileSync(finalMessageFile, 'utf8');
    if (operation.result.kind === 'raw') {
      return { kind: 'raw', markdown };
    }
    try {
      const value = JSON.parse(markdown) as unknown;
      const guardrail = this.guardrailFrom(value);
      return { kind: 'schema', value, guardrail };
    } catch (error) {
      return {
        kind: 'failed',
        error: error instanceof Error ? error.message : 'invalid structured result',
      };
    }
  }

  private requireJob(id: string): JobRecord {
    const job = this.store.get(id);
    if (!job) throw new Error(`operation not found: ${id}`);
    return job;
  }

  private operationFor(job: JobRecord): OperationDefinition {
    let prompt: string;
    try {
      prompt = (JSON.parse(job.envelopeJson) as JobEnvelope).prompt;
    } catch {
      throw new Error(`operation ${job.id} has an invalid persisted envelope`);
    }
    const operation = Object.values(OPERATIONS).find((candidate) =>
      prompt.startsWith(
        `$${candidate.skill}\nOperation: ${candidate.operationLabel}\nInputs: `,
      ));
    if (!operation) {
      throw new Error(`operation ${job.id} has an unknown persisted envelope`);
    }
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

  private timeout(id: string): void {
    const job = this.store.get(id);
    if (job && (job.state === 'queued' || job.state === 'running')) {
      this.supervisor.cancel(id);
    }
  }

  private observeEvents(job: JobRecord, events: CodexEvent[]): void {
    const lastSeq = events.at(-1)?.seq;
    if (lastSeq === undefined) return;
    const activity = this.activity.get(job.id);
    if (!activity || lastSeq > activity.lastSeq) {
      this.activity.set(job.id, {
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

  private activityFor(job: JobRecord): Activity {
    const existing = this.activity.get(job.id);
    if (existing) return existing;
    const persistedStart = Date.parse(job.startedAt ?? job.createdAt);
    const activity = {
      lastSeq: 0,
      lastEventAt: Number.isFinite(persistedStart)
        ? persistedStart
        : this.clock.now(),
    };
    this.activity.set(job.id, activity);
    return activity;
  }

  private guardrailFrom(value: unknown): string | null {
    if (!value || typeof value !== 'object') return null;
    const guardrail = (value as Record<string, unknown>).guardrail_markdown;
    return typeof guardrail === 'string' ? guardrail : null;
  }

  private defaultError(job: JobRecord): string {
    if (job.state === 'cancelled') return 'operation cancelled';
    if (job.state === 'interrupted') return 'operation interrupted';
    if (job.state === 'invalid-output') return 'operation returned invalid output';
    return 'operation failed';
  }
}
