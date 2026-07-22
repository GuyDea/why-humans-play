import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EventLog } from './event-log.js';
import type { JobStore } from './job-store.js';
import { jobPaths, readStatus } from './runner-status.js';
import { validateAgainstSchema } from './schema-validate.js';
import type { CodexEvent, JobEnvelope, JobRecord } from './types.js';

const RUNNER = join(import.meta.dirname, 'runner.ts');

function isPidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
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
  private readonly timer: ReturnType<typeof setInterval>;
  private stopped = false;

  constructor(opts: {
    store: JobStore;
    jobsRoot: string;
    pollMs?: number;
    startupGraceMs?: number;
    env?: Record<string, string>;
  }) {
    this.store = opts.store;
    this.jobsRoot = opts.jobsRoot;
    this.pollMs = opts.pollMs ?? 500;
    this.startupGraceMs = opts.startupGraceMs ?? 10_000;
    this.extraEnv = opts.env ?? {};
    mkdirSync(this.jobsRoot, { recursive: true });
    this.timer = setInterval(() => this.tick(), this.pollMs);
    this.timer.unref?.();
  }

  enqueue(env: Omit<JobEnvelope, 'jobId'> & { jobId?: string }): string {
    const jobId = env.jobId ?? randomUUID();
    const jobDir = join(this.jobsRoot, jobId);
    mkdirSync(jobDir, { recursive: true });
    const full: JobEnvelope = { ...env, jobId };
    writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(full));
    this.store.create(full, jobDir);
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
    for (const job of this.store.runningJobs()) {
      const status = readStatus(jobPaths(job.jobDir).statusFile);
      if (!status) {
        if (Date.now() - Date.parse(job.createdAt) > this.startupGraceMs) {
          this.store.setState(job.id, 'interrupted', 'no status file');
        }
        continue;
      }
      if (status.state !== 'running') continue; // next tick reconciles terminal states
      if (!isPidAlive(status.pid)) this.store.setState(job.id, 'interrupted', 'runner died');
      // alive → periodic tick keeps tailing; nothing else to do
    }
  }
  cancel(jobId: string): void {
    const job = this.store.get(jobId);
    if (!job || !['running', 'queued'].includes(job.state)) return;
    if (job.state === 'queued') { this.store.setState(jobId, 'cancelled', 'cancelled before start'); return; }
    const status = readStatus(jobPaths(job.jobDir).statusFile);
    if (!status) { this.store.setState(jobId, 'cancelled', 'no runner status'); return; }
    this.store.setState(jobId, 'cancelling');
    const env = JSON.parse(job.envelopeJson) as JobEnvelope;
    const grace = (env.graceMs ?? 5000) * 2;
    try { process.kill(-status.pgid, 'SIGINT'); } catch { /* group already gone */ }
    setTimeout(() => {
      if (this.stopped) return;
      const rec = this.store.get(jobId);
      if (rec && rec.state === 'cancelling') {
        try { process.kill(-status.pgid, 'SIGKILL'); } catch { /* gone */ }
        this.store.setState(jobId, 'cancelled', 'escalated to SIGKILL');
      }
    }, grace).unref?.();
  }
  resume(_interruptedJobId: string): string { throw new Error('not implemented'); }

  stop(): void {
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
    const child = spawn(process.execPath, ['--import', 'tsx', RUNNER, next.jobDir], {
      detached: true, stdio: 'ignore',
      env: { ...process.env, ...this.extraEnv },
    });
    child.unref();
    this.store.setState(next.id, 'running');
  }

  private reconcileRunning(): void {
    for (const job of this.store.runningJobs()) {
      const status = readStatus(jobPaths(job.jobDir).statusFile);
      if (!status) {
        if (Date.now() - Date.parse(job.createdAt) > this.startupGraceMs) {
          this.store.setState(job.id, 'interrupted', 'no status file');
        }
        continue;
      }
      if (status.threadId && !job.threadId) this.store.setThreadId(job.id, status.threadId);
      if (status.state === 'running') {
        if (!isPidAlive(status.pid)) this.store.setState(job.id, 'interrupted', 'runner died');
        continue;
      }
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

  private retryFresh(job: JobRecord): void {
    const env = JSON.parse(job.envelopeJson) as JobEnvelope;
    const retryId = randomUUID();
    const jobDir = join(this.jobsRoot, retryId);
    mkdirSync(jobDir, { recursive: true });
    const fresh: JobEnvelope = { ...env, jobId: retryId, resumeThreadId: undefined };
    writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(fresh));
    this.store.create(fresh, jobDir, { retryOf: job.id });
  }
}
