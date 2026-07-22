import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EventLog } from './event-log.js';
import type { JobStore } from './job-store.js';
import { jobPaths, readStatus } from './runner-status.js';
import type { CodexEvent, JobEnvelope, JobRecord } from './types.js';

const TSX = join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx');
const RUNNER = join(import.meta.dirname, 'runner.ts');

export class JobSupervisor {
  readonly store: JobStore;
  private readonly jobsRoot: string;
  private readonly pollMs: number;
  private readonly extraEnv: Record<string, string>;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(opts: { store: JobStore; jobsRoot: string; pollMs?: number; env?: Record<string, string> }) {
    this.store = opts.store;
    this.jobsRoot = opts.jobsRoot;
    this.pollMs = opts.pollMs ?? 500;
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

  reattach(): void { throw new Error('not implemented'); }
  cancel(_jobId: string): void { throw new Error('not implemented'); }
  resume(_interruptedJobId: string): string { throw new Error('not implemented'); }

  stop(): void {
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
    const child = spawn(TSX, [RUNNER, next.jobDir], {
      detached: true, stdio: 'ignore',
      env: { ...process.env, ...this.extraEnv },
    });
    child.unref();
    this.store.setState(next.id, 'running');
  }

  private reconcileRunning(): void {
    for (const job of this.store.runningJobs()) {
      const status = readStatus(jobPaths(job.jobDir).statusFile);
      if (!status) continue;
      if (status.threadId && !job.threadId) this.store.setThreadId(job.id, status.threadId);
      if (status.state === 'running') continue;
      this.store.recordUsage(job.id, status.usage);
      if (status.state === 'completed') this.store.setState(job.id, 'completed');
      else if (status.state === 'cancelled') this.store.setState(job.id, 'cancelled');
      else this.store.setState(job.id, 'failed', status.errorMessage);
    }
  }
}
