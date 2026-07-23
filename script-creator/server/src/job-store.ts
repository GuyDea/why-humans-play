import Database from 'better-sqlite3';
import type { JobEnvelope, JobRecord, JobState, RunnerUsage } from './types.js';

interface JobRow {
  id: string;
  state: JobState;
  envelope_json: string;
  job_dir: string;
  thread_id: string | null;
  retry_of: string | null;
  resumed_from: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  output_tokens: number | null;
  reasoning_output_tokens: number | null;
  usage_available: 0 | 1;
  error: string | null;
}

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
  started_at TEXT,
  finished_at TEXT,
  input_tokens INTEGER,
  cached_input_tokens INTEGER,
  output_tokens INTEGER,
  reasoning_output_tokens INTEGER,
  usage_available INTEGER NOT NULL DEFAULT 0,
  error TEXT
);`;

function toRecord(row: JobRow): JobRecord {
  return {
    id: row.id,
    state: row.state,
    envelopeJson: row.envelope_json,
    jobDir: row.job_dir,
    threadId: row.thread_id,
    retryOf: row.retry_of,
    resumedFrom: row.resumed_from,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    inputTokens: row.input_tokens,
    cachedInputTokens: row.cached_input_tokens,
    outputTokens: row.output_tokens,
    reasoningOutputTokens: row.reasoning_output_tokens,
    usageAvailable: row.usage_available,
    error: row.error,
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
    const row = this.db.prepare<[string], JobRow>('SELECT * FROM jobs WHERE id = ?').get(id);
    return row ? toRecord(row) : null;
  }

  setState(id: string, state: JobState, error?: string): void {
    const finished = ['completed', 'failed', 'cancelled', 'invalid-output', 'interrupted'].includes(state);
    const now = new Date().toISOString();
    this.db.prepare(
      `UPDATE jobs SET state = ?, error = COALESCE(?, error),
       started_at = CASE WHEN ? = 'running' THEN COALESCE(started_at, ?) ELSE started_at END,
       finished_at = COALESCE(?, finished_at) WHERE id = ?`,
    ).run(state, error ?? null, state, now, finished ? now : null, id);
  }

  setThreadId(id: string, threadId: string): void {
    this.db.prepare('UPDATE jobs SET thread_id = ? WHERE id = ?').run(threadId, id);
  }

  recordUsage(id: string, usage: RunnerUsage | undefined): void {
    if (!usage) {
      this.db.prepare(
        `UPDATE jobs SET usage_available = 0, input_tokens = NULL, cached_input_tokens = NULL,
         output_tokens = NULL, reasoning_output_tokens = NULL WHERE id = ?`,
      ).run(id);
      return;
    }
    this.db.prepare(
      `UPDATE jobs SET usage_available = 1, input_tokens = ?, cached_input_tokens = ?,
       output_tokens = ?, reasoning_output_tokens = ? WHERE id = ?`,
    ).run(usage.input_tokens, usage.cached_input_tokens, usage.output_tokens, usage.reasoning_output_tokens, id);
  }

  nextQueued(): JobRecord | null {
    const row = this.db.prepare<[], JobRow>("SELECT * FROM jobs WHERE state = 'queued' ORDER BY rowid LIMIT 1")
      .get();
    return row ? toRecord(row) : null;
  }

  runningJobs(): JobRecord[] {
    return this.db.prepare<[], JobRow>("SELECT * FROM jobs WHERE state IN ('running','cancelling') ORDER BY created_at")
      .all().map(toRecord);
  }

  jobsRetriedFrom(id: string): JobRecord[] {
    return this.db.prepare<[string], JobRow>('SELECT * FROM jobs WHERE retry_of = ?').all(id).map(toRecord);
  }

  close(): void {
    this.db.close();
  }
}
