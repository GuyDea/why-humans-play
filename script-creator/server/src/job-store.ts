import Database from 'better-sqlite3';
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type {
  JobEnvelope,
  JobRecord,
  JobState,
  OperationState,
  RunnerUsage,
  StoredOperation,
} from './types.js';

interface JobRow {
  id: string;
  operation_id: string | null;
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

interface OperationRow {
  id: string;
  name: string;
  draft_id: string | null;
  deadline_at: string;
  created_at: string;
  state: OperationState;
}

interface CancellationRow {
  cancel_requested_at: string | null;
  cancel_deadline_at: string | null;
}

export interface CancellationRequest {
  requestedAt: string | null;
  deadlineAt: string | null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  draft_id TEXT,
  deadline_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  state TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  operation_id TEXT,
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
  error TEXT,
  cancel_requested_at TEXT,
  cancel_deadline_at TEXT
);`;

function ensureJobColumns(db: Database.Database): void {
  const columns = new Set(
    db.prepare<[], { name: string }>('PRAGMA table_info(jobs)').all().map((column) => column.name),
  );
  if (!columns.has('operation_id')) {
    db.exec('ALTER TABLE jobs ADD COLUMN operation_id TEXT');
  }
  if (!columns.has('cancel_requested_at')) {
    db.exec('ALTER TABLE jobs ADD COLUMN cancel_requested_at TEXT');
  }
  if (!columns.has('cancel_deadline_at')) {
    db.exec('ALTER TABLE jobs ADD COLUMN cancel_deadline_at TEXT');
  }
}

function ensureOperationColumns(db: Database.Database): void {
  const columns = new Set(
    db.prepare<[], { name: string }>('PRAGMA table_info(operations)')
      .all()
      .map((column) => column.name),
  );
  if (!columns.has('draft_id')) {
    db.exec('ALTER TABLE operations ADD COLUMN draft_id TEXT');
  }
}

function toRecord(row: JobRow): JobRecord {
  return {
    id: row.id,
    operationId: row.operation_id,
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

function toOperation(row: OperationRow): StoredOperation {
  return {
    id: row.id,
    name: row.name,
    draftId: row.draft_id,
    deadlineAt: row.deadline_at,
    createdAt: row.created_at,
    state: row.state,
  };
}

interface CreateJobOptions {
  retryOf?: string;
  resumedFrom?: string;
  operationId?: string;
  createdAt?: string;
}

interface CreateOperationInput {
  id: string;
  name: string;
  draftId?: string;
  deadlineAt: string;
  createdAt: string;
}

export class JobStore {
  private readonly db: Database.Database;
  private readonly operationTerminalListeners = new Set<(id: string) => void>();

  constructor(dbFile: string) {
    this.db = new Database(dbFile);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');
    this.db.exec(SCHEMA);
    ensureJobColumns(this.db);
    ensureOperationColumns(this.db);
    this.db.exec(
      'CREATE INDEX IF NOT EXISTS jobs_operation_id_idx ON jobs(operation_id)',
    );
  }

  create(
    env: JobEnvelope,
    jobDir: string,
    opts: CreateJobOptions = {},
  ): JobRecord {
    this.insertJob(env, jobDir, opts);
    if (opts.operationId !== undefined) {
      this.updateOperationFromActiveAttempt(opts.operationId);
    }
    return this.get(env.jobId)!;
  }

  createOperationWithJob(
    operation: CreateOperationInput,
    env: JobEnvelope,
    jobDir: string,
    opts: Pick<CreateJobOptions, 'resumedFrom'> = {},
  ): JobRecord {
    this.db.transaction(() => {
      this.db.prepare(
        `INSERT INTO operations (
           id, name, draft_id, deadline_at, created_at, state
         ) VALUES (?, ?, ?, ?, ?, 'queued')`,
      ).run(
        operation.id,
        operation.name,
        operation.draftId ?? null,
        operation.deadlineAt,
        operation.createdAt,
      );
      this.insertJob(env, jobDir, {
        ...opts,
        operationId: operation.id,
        createdAt: operation.createdAt,
      });
    })();
    return this.get(env.jobId)!;
  }

  private insertJob(
    env: JobEnvelope,
    jobDir: string,
    opts: CreateJobOptions,
  ): void {
    this.db.prepare(
      `INSERT INTO jobs (
         id, operation_id, state, envelope_json, job_dir, retry_of,
         resumed_from, created_at
       )
       VALUES (?, ?, 'queued', ?, ?, ?, ?, ?)`,
    ).run(
      env.jobId,
      opts.operationId ?? null,
      JSON.stringify(env),
      jobDir,
      opts.retryOf ?? null,
      opts.resumedFrom ?? null,
      opts.createdAt ?? new Date().toISOString(),
    );
  }

  get(id: string): JobRecord | null {
    const row = this.db.prepare<[string], JobRow>('SELECT * FROM jobs WHERE id = ?').get(id);
    return row ? toRecord(row) : null;
  }

  getOperation(id: string): StoredOperation | null {
    const row = this.db.prepare<[string], OperationRow>(
      'SELECT * FROM operations WHERE id = ?',
    ).get(id);
    return row ? toOperation(row) : null;
  }

  recentOperations(): StoredOperation[] {
    return this.db.prepare<[], OperationRow>(
      `SELECT * FROM operations
       ORDER BY created_at DESC, rowid DESC
       LIMIT 100`,
    ).all().map(toOperation);
  }

  nonTerminalOperations(): StoredOperation[] {
    return this.db.prepare<[], OperationRow>(
      `SELECT * FROM operations
       WHERE state IN ('queued', 'running', 'cancelling')
       ORDER BY created_at`,
    ).all().map(toOperation);
  }

  timedOutOperations(): StoredOperation[] {
    return this.db.prepare<[], OperationRow>(
      `SELECT * FROM operations
       WHERE state = 'timed-out'
       ORDER BY created_at`,
    ).all().map(toOperation);
  }

  operationAttempts(operationId: string): JobRecord[] {
    return this.db.prepare<[string], JobRow>(
      'SELECT * FROM jobs WHERE operation_id = ? ORDER BY rowid',
    ).all(operationId).map(toRecord);
  }

  activeAttempt(operationId: string): JobRecord | null {
    const row = this.db.prepare<[string], JobRow>(
      `SELECT * FROM jobs
       WHERE operation_id = ?
       ORDER BY rowid DESC
       LIMIT 1`,
    ).get(operationId);
    return row ? toRecord(row) : null;
  }

  operationEnvelope(operationId: string): JobEnvelope | null {
    const attempt = this.operationAttempts(operationId)[0];
    return attempt
      ? JSON.parse(attempt.envelopeJson) as JobEnvelope
      : null;
  }

  redactOperationLesson(
    operationId: string,
    input: {
      candidates: string[];
      replacement: unknown;
    },
  ): void {
    const attempts = this.operationAttempts(operationId);
    if (attempts.length === 0) {
      throw new Error(
        `operation ${operationId} has no persisted attempt to redact`,
      );
    }
    const candidates = [...new Set(
      input.candidates.filter((candidate) => candidate !== ''),
    )].sort((left, right) =>
      right.length - left.length || left.localeCompare(right));
    if (candidates.length === 0) return;
    const envelopeUpdates = attempts.map((attempt) => ({
      id: attempt.id,
      envelopeJson: redactSerializedText(
        attempt.envelopeJson,
        candidates,
        input.replacement,
      ),
    }));
    const fileUpdates: Array<{
      path: string;
      temporaryPath: string;
      original: string;
      renamed: boolean;
    }> = [];
    try {
      for (const attempt of attempts) {
        if (!existsSync(attempt.jobDir)) continue;
        for (const name of readdirSync(attempt.jobDir)) {
          const path = join(attempt.jobDir, name);
          if (!statSync(path).isFile()) continue;
          const original = readFileSync(path, 'utf8');
          const redacted = redactSerializedText(
            original,
            candidates,
            input.replacement,
          );
          if (redacted === original) continue;
          const temporaryPath = `${path}.redaction.tmp`;
          writeFileSync(temporaryPath, redacted);
          fileUpdates.push({
            path,
            temporaryPath,
            original,
            renamed: false,
          });
        }
      }

      this.db.transaction(() => {
        const update = this.db.prepare(
          'UPDATE jobs SET envelope_json = ? WHERE id = ?',
        );
        for (const envelope of envelopeUpdates) {
          update.run(envelope.envelopeJson, envelope.id);
        }
        for (const file of fileUpdates) {
          renameSync(file.temporaryPath, file.path);
          file.renamed = true;
        }
      })();
    } catch (error) {
      const recoveryErrors: unknown[] = [];
      for (const file of fileUpdates.filter(({ renamed }) => renamed)) {
        const recoveryPath = `${file.temporaryPath}.restore`;
        try {
          writeFileSync(recoveryPath, file.original);
          renameSync(recoveryPath, file.path);
        } catch (recoveryError) {
          recoveryErrors.push(recoveryError);
        } finally {
          if (existsSync(recoveryPath)) unlinkSync(recoveryPath);
        }
      }
      if (recoveryErrors.length > 0) {
        throw new AggregateError(
          [error, ...recoveryErrors],
          `operation ${operationId} redaction rollback failed`,
        );
      }
      throw error;
    } finally {
      for (const file of fileUpdates) {
        if (existsSync(file.temporaryPath)) unlinkSync(file.temporaryPath);
      }
    }
  }

  setState(id: string, state: JobState, error?: string): void {
    const operationId = this.db.transaction(() => {
      const finished = [
        'completed',
        'failed',
        'cancelled',
        'invalid-output',
        'interrupted',
      ].includes(state);
      const now = new Date().toISOString();
      this.db.prepare(
        `UPDATE jobs SET state = ?, error = COALESCE(?, error),
         started_at = CASE WHEN ? = 'running' THEN COALESCE(started_at, ?) ELSE started_at END,
         finished_at = COALESCE(?, finished_at) WHERE id = ?`,
      ).run(state, error ?? null, state, now, finished ? now : null, id);
      const operationId = this.get(id)?.operationId;
      if (operationId !== null && operationId !== undefined) {
        this.updateOperationFromActiveAttempt(operationId);
      }
      return operationId;
    })();
    if (operationId !== null && operationId !== undefined) {
      this.notifyOperationTerminal(operationId);
    }
  }

  timeoutOperationAndRequestCancellation(
    operationId: string,
    requestedAt: string,
    deadlineAt: string,
  ): JobRecord | null {
    const attemptId = this.db.transaction(() => {
      const operation = this.getOperation(operationId);
      if (
        !operation
        || ![
          'queued',
          'running',
          'cancelling',
          'timed-out',
        ].includes(operation.state)
      ) {
        return null;
      }
      const attempt = this.activeAttempt(operationId);
      this.db.prepare(
        "UPDATE operations SET state = 'timed-out' WHERE id = ?",
      ).run(operationId);
      if (
        attempt
        && ['queued', 'running', 'cancelling'].includes(attempt.state)
      ) {
        this.db.prepare(
          `UPDATE jobs
           SET state = 'cancelling',
             cancel_requested_at = COALESCE(cancel_requested_at, ?),
             cancel_deadline_at = COALESCE(cancel_deadline_at, ?)
           WHERE id = ?`,
        ).run(requestedAt, deadlineAt, attempt.id);
        return attempt.id;
      }
      return null;
    })();
    this.notifyOperationTerminal(operationId);
    return attemptId === null ? null : this.get(attemptId);
  }

  onOperationTerminal(listener: (id: string) => void): () => void {
    this.operationTerminalListeners.add(listener);
    return () => this.operationTerminalListeners.delete(listener);
  }

  setThreadId(id: string, threadId: string): void {
    this.db.prepare('UPDATE jobs SET thread_id = ? WHERE id = ?').run(threadId, id);
  }

  requestCancellation(id: string, requestedAt: string, deadlineAt: string): void {
    this.db.prepare(
      `UPDATE jobs
       SET state = 'cancelling', cancel_requested_at = ?, cancel_deadline_at = ?
       WHERE id = ?`,
    ).run(requestedAt, deadlineAt, id);
  }

  getCancellation(id: string): CancellationRequest | null {
    const row = this.db.prepare<[string], CancellationRow>(
      'SELECT cancel_requested_at, cancel_deadline_at FROM jobs WHERE id = ?',
    ).get(id);
    return row
      ? { requestedAt: row.cancel_requested_at, deadlineAt: row.cancel_deadline_at }
      : null;
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

  private updateOperationFromActiveAttempt(operationId: string): void {
    const operation = this.getOperation(operationId);
    // A runner completion observed after its deadline may finish the attempt,
    // but it must never change the public operation back from timed-out.
    if (!operation || operation.state === 'timed-out') return;
    const active = this.activeAttempt(operationId);
    if (!active) return;
    this.db.prepare(
      'UPDATE operations SET state = ? WHERE id = ?',
    ).run(active.state, operationId);
  }

  private notifyOperationTerminal(operationId: string): void {
    const operation = this.getOperation(operationId);
    if (!operation || !isTerminalState(operation.state)) return;
    for (const listener of this.operationTerminalListeners) {
      listener(operationId);
    }
  }

  close(): void {
    this.operationTerminalListeners.clear();
    this.db.close();
  }
}

function isTerminalState(state: OperationState): boolean {
  return !['queued', 'running', 'cancelling'].includes(state);
}

function redactSerializedText(
  text: string,
  candidates: string[],
  replacement: unknown,
): string {
  try {
    return JSON.stringify(
      redactStructuredValue(JSON.parse(text) as unknown, candidates, replacement),
    );
  } catch {
    return candidates.reduce(
      (redacted, candidate) =>
        redacted.replaceAll(candidate, JSON.stringify(replacement)),
      text,
    );
  }
}

function redactStructuredValue(
  value: unknown,
  candidates: string[],
  replacement: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      redactStructuredValue(item, candidates, replacement));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        redactStructuredValue(nested, candidates, replacement),
      ]),
    );
  }
  if (typeof value !== 'string') return value;
  if (candidates.includes(value)) return replacement;
  if (!candidates.some((candidate) => value.includes(candidate))) {
    return value;
  }
  try {
    return JSON.stringify(
      redactStructuredValue(JSON.parse(value) as unknown, candidates, replacement),
    );
  } catch {
    const inputsMarker = '\nInputs: ';
    const inputsIndex = value.indexOf(inputsMarker);
    if (inputsIndex !== -1) {
      const prefix = value.slice(0, inputsIndex + inputsMarker.length);
      const serializedInputs = value.slice(inputsIndex + inputsMarker.length);
      try {
        return prefix + JSON.stringify(
          redactStructuredValue(
            JSON.parse(serializedInputs) as unknown,
            candidates,
            replacement,
          ),
        );
      } catch {
        // Fall through for non-envelope strings that merely contain the marker.
      }
    }
    return candidates.reduce(
      (redacted, candidate) =>
        redacted.replaceAll(candidate, JSON.stringify(replacement)),
      value,
    );
  }
}
