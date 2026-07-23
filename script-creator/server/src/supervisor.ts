import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EventLog } from './event-log.js';
import type { JobStore } from './job-store.js';
import { jobPaths, readLaunch, readStatus, writeLaunch } from './runner-status.js';
import { validateAgainstSchema } from './schema-validate.js';
import type { CodexEvent, JobEnvelope, JobRecord } from './types.js';

const RUNNER = join(import.meta.dirname, 'runner.ts');

function isPidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function isProcessGroupAlive(pgid: number): boolean {
  try { process.kill(-pgid, 0); return true; } catch { return false; }
}

function signalProcessGroup(pgid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pgid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
      console.error(`failed to send ${signal} to process group ${pgid}:`, error);
    }
  }
}

function readFinalMessage(jobDir: string): string {
  const f = jobPaths(jobDir).finalMessageFile;
  return existsSync(f) ? readFileSync(f, 'utf8') : '';
}

export class JobSupervisor {
  readonly store: JobStore;
  private readonly jobsRoot: string;
  private readonly pollMs: number;
  private readonly startupGraceMs: number;
  private readonly extraEnv: Record<string, string>;
  private readonly runnerBin: string;
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly spawnedPids = new Map<string, number>();
  private readonly cancellationSignals = new Set<string>();
  private readonly cancellationEscalations = new Set<string>();
  private stopped = false;

  constructor(opts: {
    store: JobStore;
    jobsRoot: string;
    pollMs?: number;
    startupGraceMs?: number;
    env?: Record<string, string>;
    runnerBin?: string;
  }) {
    this.store = opts.store;
    this.jobsRoot = opts.jobsRoot;
    this.pollMs = opts.pollMs ?? 500;
    this.startupGraceMs = opts.startupGraceMs ?? 10_000;
    this.extraEnv = opts.env ?? {};
    this.runnerBin = opts.runnerBin ?? process.execPath;
    mkdirSync(this.jobsRoot, { recursive: true });
    this.timer = setInterval(() => this.tick(), this.pollMs);
    this.timer.unref?.();
  }

  enqueue(
    env: Omit<JobEnvelope, 'jobId'> & { jobId?: string },
    opts: {
      resumedFrom?: string;
      operation?: {
        id: string;
        name: string;
        deadlineAt: string;
        createdAt: string;
      };
    } = {},
  ): string {
    const jobId = env.jobId ?? randomUUID();
    const jobDir = join(this.jobsRoot, jobId);
    mkdirSync(jobDir, { recursive: true });
    const full: JobEnvelope = { ...env, jobId };
    writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(full));
    if (opts.operation) {
      this.store.createOperationWithJob(
        opts.operation,
        full,
        jobDir,
        { resumedFrom: opts.resumedFrom },
      );
    } else {
      this.store.create(full, jobDir, { resumedFrom: opts.resumedFrom });
    }
    this.tick();
    return jobId;
  }

  events(jobId: string, fromSeq = 0): CodexEvent[] {
    const rec = this.store.get(jobId);
    if (!rec) return [];
    return new EventLog(jobPaths(rec.jobDir).eventsFile).read(fromSeq);
  }

  async waitForTerminal(jobId: string, timeoutMs = 20000): Promise<JobRecord> {
    const end = Date.now() + timeoutMs;
    for (;;) {
      const rec = this.store.get(jobId);
      if (rec && !['queued', 'running', 'cancelling'].includes(rec.state)) return rec;
      if (Date.now() > end) throw new Error(`timeout waiting for ${jobId}`);
      await new Promise((r) => setTimeout(r, this.pollMs));
    }
  }

  reattach(): void {
    this.reconcileRunning();
  }

  cancel(jobId: string): void {
    const job = this.store.get(jobId);
    if (!job || !['running', 'queued'].includes(job.state)) return;
    if (job.state === 'queued') { this.store.setState(jobId, 'cancelled', 'cancelled before start'); return; }
    const status = readStatus(jobPaths(job.jobDir).statusFile);
    const env = JSON.parse(job.envelopeJson) as JobEnvelope;
    const requestedAt = Date.now();
    const deadlineAt = requestedAt + (env.graceMs ?? 5000) * 2;
    this.store.requestCancellation(
      jobId,
      new Date(requestedAt).toISOString(),
      new Date(deadlineAt).toISOString(),
    );
    const pgid = status?.pgid ?? this.preStatusPid(job);
    this.ensureCancellation(job, pgid);
  }
  resume(interruptedJobId: string): string {
    const job = this.store.get(interruptedJobId);
    if (!job || job.state !== 'interrupted') throw new Error('only interrupted jobs can be resumed');
    if (!job.threadId) throw new Error('interrupted job has no thread id; relaunch fresh instead');
    const env = JSON.parse(job.envelopeJson) as JobEnvelope;
    const resumedId = randomUUID();
    const jobDir = join(this.jobsRoot, resumedId);
    mkdirSync(jobDir, { recursive: true });
    const resumedEnv: JobEnvelope = { ...env, jobId: resumedId, resumeThreadId: job.threadId };
    writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(resumedEnv));
    this.store.create(resumedEnv, jobDir, { resumedFrom: job.id });
    this.tick();
    return resumedId;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    clearInterval(this.timer);
    this.store.close();
  }

  private tick(): void {
    this.reconcileRunning();
    if (this.store.runningJobs().length === 0) this.launchNext();
  }

  private launchNext(): void {
    const next = this.store.nextQueued();
    if (!next) return;
    const child = spawn(this.runnerBin, ['--import', 'tsx', RUNNER, next.jobDir], {
      detached: true, stdio: 'ignore',
      env: { ...process.env, ...this.extraEnv },
    });
    if (child.pid !== undefined) {
      writeLaunch(next.jobDir, { pid: child.pid, launchedAt: new Date().toISOString() });
      this.spawnedPids.set(next.id, child.pid);
    }
    child.on('error', (error) => {
      if (this.stopped) return;
      this.spawnedPids.delete(next.id);
      this.cancellationSignals.delete(next.id);
      this.cancellationEscalations.delete(next.id);
      const current = this.store.get(next.id);
      if (current && ['running', 'cancelling'].includes(current.state)) {
        this.store.setState(next.id, 'failed', error.message);
      }
    });
    child.unref();
    this.store.setState(next.id, 'running');
  }

  private reconcileRunning(): void {
    for (const job of this.store.runningJobs()) {
      const status = readStatus(jobPaths(job.jobDir).statusFile);
      if (!status) {
        const pid = this.preStatusPid(job);
        if (job.state === 'cancelling') {
          if (pid !== undefined) {
            if (isProcessGroupAlive(pid)) this.ensureCancellation(job, pid);
            else this.finishCancellation(job.id);
          } else if (this.startupGraceExpired(job)) {
            this.finishCancellation(job.id);
          }
        } else if (pid !== undefined) {
          if (!isPidAlive(pid)) {
            this.spawnedPids.delete(job.id);
            this.store.setState(job.id, 'interrupted', 'runner died before writing status');
          }
        } else if (this.startupGraceExpired(job)) {
          this.store.setState(job.id, 'interrupted', 'no status file');
        }
        continue;
      }
      if (status.threadId && !job.threadId) this.store.setThreadId(job.id, status.threadId);

      if (job.state === 'cancelling') {
        if (status.state !== 'running') this.store.recordUsage(job.id, status.usage);
        if (isProcessGroupAlive(status.pgid)) this.ensureCancellation(job, status.pgid);
        else this.finishCancellation(job.id);
        continue;
      }

      if (status.state === 'running') {
        if (!isPidAlive(status.pid)) {
          this.spawnedPids.delete(job.id);
          this.store.setState(job.id, 'interrupted', 'runner died');
        }
        continue;
      }
      this.spawnedPids.delete(job.id);
      this.store.recordUsage(job.id, status.usage);
      if (status.state === 'completed') {
        const env = JSON.parse(job.envelopeJson) as JobEnvelope;
        if (env.outputSchema) {
          const text = readFinalMessage(job.jobDir);
          const result = validateAgainstSchema(env.outputSchema, text);
          if (!result.ok) {
            this.store.setState(job.id, 'invalid-output', result.reason);
            if (!job.retryOf) this.retryFresh(job);
            continue;
          }
        }
        this.store.setState(job.id, 'completed');
      }
      else if (status.state === 'cancelled') this.store.setState(job.id, 'cancelled');
      else this.store.setState(job.id, 'failed', status.errorMessage);
    }
  }

  private startupGraceExpired(job: JobRecord): boolean {
    return Date.now() - Date.parse(job.startedAt ?? job.createdAt) > this.startupGraceMs;
  }

  private preStatusPid(job: JobRecord): number | undefined {
    return this.spawnedPids.get(job.id) ?? readLaunch(job.jobDir)?.pid;
  }

  private ensureCancellation(job: JobRecord, pgid: number | undefined): void {
    if (pgid === undefined) return;
    this.signalCancellation(job.id, pgid);
    if (this.cancellationEscalations.has(job.id)) return;
    this.cancellationEscalations.add(job.id);
    const persistedDeadline = this.store.getCancellation(job.id)?.deadlineAt;
    const deadline = persistedDeadline === null || persistedDeadline === undefined
      ? Date.now()
      : Date.parse(persistedDeadline);
    const delay = Math.max(0, deadline - Date.now());
    setTimeout(() => {
      if (this.stopped) return;
      const current = this.store.get(job.id);
      if (!current || current.state !== 'cancelling') return;
      const status = readStatus(jobPaths(current.jobDir).statusFile);
      const currentPgid = status?.pgid ?? this.preStatusPid(current);
      if (currentPgid !== undefined) signalProcessGroup(currentPgid, 'SIGKILL');
    }, delay).unref?.();
  }

  private signalCancellation(jobId: string, pgid: number | undefined): void {
    if (pgid === undefined || this.cancellationSignals.has(jobId)) return;
    this.cancellationSignals.add(jobId);
    signalProcessGroup(pgid, 'SIGINT');
  }

  private finishCancellation(jobId: string): void {
    this.spawnedPids.delete(jobId);
    this.cancellationSignals.delete(jobId);
    this.cancellationEscalations.delete(jobId);
    this.store.setState(jobId, 'cancelled');
  }

  private retryFresh(job: JobRecord): void {
    const env = JSON.parse(job.envelopeJson) as JobEnvelope;
    const retryId = randomUUID();
    const jobDir = join(this.jobsRoot, retryId);
    mkdirSync(jobDir, { recursive: true });
    const fresh: JobEnvelope = { ...env, jobId: retryId, resumeThreadId: undefined };
    writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(fresh));
    this.store.create(fresh, jobDir, {
      retryOf: job.id,
      operationId: job.operationId ?? undefined,
    });
  }
}
