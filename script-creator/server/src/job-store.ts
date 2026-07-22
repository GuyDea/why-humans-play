import Database from 'better-sqlite3';
import type { JobEnvelope, JobRecord, JobState, RunnerUsage } from './types.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  envelope_json TEXT NOT NULL,
  job_dir TEXT NOT NULL,
  thread_id TEXT,
  retry_of TEXT,
  resumed_from TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT,
  input_tokens INTEGER,
  cached_input_tokens INTEGER,
  output_tokens INTEGER,
  reasoning_output_tokens INTEGER,
  usage_available INTEGER NOT NULL DEFAULT 0,
  error TEXT
);`;

function toRecord(row: Record<string, unknown>): JobRecord {
  return {
    id: row.id as string,
    state: row.state as JobState,
    envelopeJson: row.envelope_json as string,
    jobDir: row.job_dir as string,
    threadId: (row.thread_id as string) ?? null,
    retryOf: (row.retry_of as string) ?? null,
    resumedFrom: (row.resumed_from as string) ?? null,
    createdAt: row.created_at as string,
    finishedAt: (row.finished_at as string) ?? null,
    inputTokens: (row.input_tokens as number) ?? null,
    cachedInputTokens: (row.cached_input_tokens as number) ?? null,
    outputTokens: (row.output_tokens as number) ?? null,
    reasoningOutputTokens: (row.reasoning_output_tokens as number) ?? null,
    usageAvailable: (row.usage_available as 0 | 1) ?? 0,
    error: (row.error as string) ?? null,
  };
}

export class JobStore {
  private readonly db: Database.Database;

  constructor(dbFile: string) {
    this.db = new Database(dbFile);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');
    this.db.exec(SCHEMA);
  }

  create(env: JobEnvelope, jobDir: string, opts: { retryOf?: string; resumedFrom?: string } = {}): JobRecord {
    this.db.prepare(
      `INSERT INTO jobs (id, state, envelope_json, job_dir, retry_of, resumed_from, created_at)
       VALUES (?, 'queued', ?, ?, ?, ?, ?)`,
    ).run(env.jobId, JSON.stringify(env), jobDir, opts.retryOf ?? null, opts.resumedFrom ?? null, new Date().toISOString());
    return this.get(env.jobId)!;
  }

  get(id: string): JobRecord | null {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? toRecord(row) : null;
  }

  setState(id: string, state: JobState, error?: string): void {
    const finished = ['completed', 'failed', 'cancelled', 'invalid-output', 'interrupted'].includes(state);
    this.db.prepare('UPDATE jobs SET state = ?, error = COALESCE(?, error), finished_at = COALESCE(?, finished_at) WHERE id = ?')
      .run(state, error ?? null, finished ? new Date().toISOString() : null, id);
  }

  setThreadId(id: string, threadId: string): void {
    this.db.prepare('UPDATE jobs SET thread_id = ? WHERE id = ?').run(threadId, id);
  }

  recordUsage(id: string, usage: RunnerUsage | undefined): void {
    if (!usage) {
      this.db.prepare('UPDATE jobs SET usage_available = 0 WHERE id = ?').run(id);
      return;
    }
    this.db.prepare(
      `UPDATE jobs SET usage_available = 1, input_tokens = ?, cached_input_tokens = ?,
       output_tokens = ?, reasoning_output_tokens = ? WHERE id = ?`,
    ).run(usage.input_tokens, usage.cached_input_tokens, usage.output_tokens, usage.reasoning_output_tokens ?? null, id);
  }

  nextQueued(): JobRecord | null {
    const row = this.db.prepare("SELECT * FROM jobs WHERE state = 'queued' ORDER BY created_at, id LIMIT 1")
      .get() as Record<string, unknown> | undefined;
    return row ? toRecord(row) : null;
  }

  runningJobs(): JobRecord[] {
    return (this.db.prepare("SELECT * FROM jobs WHERE state IN ('running','cancelling') ORDER BY created_at")
      .all() as Record<string, unknown>[]).map(toRecord);
  }

  jobsRetriedFrom(id: string): JobRecord[] {
    return (this.db.prepare('SELECT * FROM jobs WHERE retry_of = ?').all(id) as Record<string, unknown>[]).map(toRecord);
  }

  close(): void {
    this.db.close();
  }
}
