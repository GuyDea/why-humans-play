import Database from 'better-sqlite3';
import { migrateStateDatabase } from '../state-migrations.js';

export type DecisionKind =
  | 'proposal-accepted'
  | 'proposal-rejected'
  | 'proposal-rerolled'
  | 'variant-picked'
  | 'gate-action'
  | 'package-picked'
  | 'winner-handed-off'
  | 'personal-input-integrated'
  | 'validator-fix-cycle-accepted';

export interface DecisionEventRecord {
  id: string;
  draftId: string;
  seq: number;
  kind: DecisionKind;
  sourceType: string;
  sourceId: string;
  disposition: string;
  sourceTimestamp: string;
  createdAt: string;
  note: string | null;
}

export type LessonClassification = 'episode-local' | 'durable';
export type LessonState =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'retired'
  | 'superseded'
  | 'approved-pending-reconcile'
  | 'applied'
  | 'retirement-pending'
  | 'supersession-pending';

export interface LessonRecord {
  id: string;
  draftId: string;
  distillationRunId: string | null;
  classification: LessonClassification;
  state: LessonState;
  proposedMarkdown: string | null;
  reviewedMarkdown: string | null;
  rationaleMarkdown: string;
  proposedTarget: string | null;
  supersedesLessonId: string | null;
  version: number;
  repositoryCommit: string | null;
  repositoryPath: string | null;
  repositoryAnchor: string | null;
  repositoryContentHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearningSessionRecord {
  id: string;
  draftId: string;
  startCursor: number;
  endCursor: number | null;
  createdAt: string;
  closedAt: string | null;
}

export type DistillationTrigger = 'on-demand' | 'session-end';
export type DistillationRunState =
  | 'frozen'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted'
  | 'ingested'
  | 'no-op';

export interface FrozenDecisionSnapshot {
  decisionId: string;
  snapshot: unknown;
}

export interface FrozenLessonSnapshot {
  lessonId: string;
  snapshot: unknown;
}

export interface DistillationRunRecord {
  id: string;
  draftId: string;
  sessionId: string;
  trigger: DistillationTrigger;
  state: DistillationRunState;
  operationId: string | null;
  resumeKey: string;
  guardrailMarkdown: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  decisions: FrozenDecisionSnapshot[];
  lessons: FrozenLessonSnapshot[];
}

export type ReconciliationKind = 'apply' | 'retire' | 'supersede';
export type ReconciliationState =
  | 'prepared'
  | 'awaiting-reconciliation'
  | 'verified';

export interface LessonReconciliationRecord {
  id: string;
  lessonId: string;
  kind: ReconciliationKind;
  state: ReconciliationState;
  resumeKey: string;
  preparedMarkdown: string;
  repositoryCommit: string | null;
  paths: string[];
  anchors: string[];
  contentHashes: string[];
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
}

export interface ValidatorAttemptRecord {
  id: string;
  draftId: string;
  path: string;
  contentHash: string;
  ok: boolean;
  diagnostics: unknown;
  createdAt: string;
}

export interface OperationLessonRecord {
  operationId: string;
  lessonId: string;
  lessonVersion: number;
  contentHash: string;
  createdAt: string;
}

interface DecisionRow {
  id: string;
  draft_id: string;
  seq: number;
  kind: DecisionKind;
  source_type: string;
  source_id: string;
  disposition: string;
  source_timestamp: string;
  created_at: string;
  note: string | null;
}

interface LessonRow {
  id: string;
  draft_id: string;
  distillation_run_id: string | null;
  classification: LessonClassification;
  state: LessonState;
  proposed_markdown: string | null;
  reviewed_markdown: string | null;
  rationale_markdown: string;
  proposed_target: string | null;
  supersedes_lesson_id: string | null;
  version: number;
  repository_commit: string | null;
  repository_path: string | null;
  repository_anchor: string | null;
  repository_content_hash: string | null;
  created_at: string;
  updated_at: string;
}

interface SessionRow {
  id: string;
  draft_id: string;
  start_cursor: number;
  end_cursor: number | null;
  created_at: string;
  closed_at: string | null;
}

interface DistillationRunRow {
  id: string;
  draft_id: string;
  session_id: string;
  trigger: DistillationTrigger;
  state: DistillationRunState;
  operation_id: string | null;
  resume_key: string;
  guardrail_markdown: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface SnapshotRow {
  source_id: string;
  snapshot_json: string;
}

interface ReconciliationRow {
  id: string;
  lesson_id: string;
  kind: ReconciliationKind;
  state: ReconciliationState;
  resume_key: string;
  prepared_markdown: string;
  repository_commit: string | null;
  paths_json: string;
  anchors_json: string;
  content_hashes_json: string;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
}

interface ValidatorAttemptRow {
  id: string;
  draft_id: string;
  path: string;
  content_hash: string;
  ok: 0 | 1;
  diagnostics_json: string;
  created_at: string;
}

interface OperationLessonRow {
  operation_id: string;
  lesson_id: string;
  lesson_version: number;
  content_hash: string;
  created_at: string;
}

export class LearningStore {
  private readonly db: Database.Database;

  constructor(dbFile: string) {
    this.db = new Database(dbFile);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');
    this.db.pragma('foreign_keys = ON');
    migrateStateDatabase(this.db);
  }

  captureDecision(record: DecisionEventRecord): DecisionEventRecord {
    this.db.prepare(
      `INSERT INTO decision_events (
        id, draft_id, seq, kind, source_type, source_id, disposition,
        source_timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (source_type, source_id, disposition) DO NOTHING`,
    ).run(
      record.id,
      record.draftId,
      record.seq,
      record.kind,
      record.sourceType,
      record.sourceId,
      record.disposition,
      record.sourceTimestamp,
      record.createdAt,
    );
    return this.getDecisionBySource(
      record.sourceType,
      record.sourceId,
      record.disposition,
    )!;
  }

  nextDecisionSeq(draftId: string): number {
    return this.db.prepare<[string], { seq: number }>(
      `SELECT COALESCE(MAX(seq), 0) + 1 AS seq
       FROM decision_events
       WHERE draft_id = ?`,
    ).get(draftId)!.seq;
  }

  getDecision(id: string): DecisionEventRecord | null {
    const row = this.db.prepare<[string], DecisionRow>(
      `SELECT events.*, notes.note
       FROM decision_events AS events
       LEFT JOIN decision_notes AS notes ON notes.decision_id = events.id
       WHERE events.id = ?`,
    ).get(id);
    return row ? decisionFrom(row) : null;
  }

  getDecisionBySource(
    sourceType: string,
    sourceId: string,
    disposition: string,
  ): DecisionEventRecord | null {
    const row = this.db.prepare<[string, string, string], DecisionRow>(
      `SELECT events.*, notes.note
       FROM decision_events AS events
       LEFT JOIN decision_notes AS notes ON notes.decision_id = events.id
       WHERE source_type = ? AND source_id = ? AND disposition = ?`,
    ).get(sourceType, sourceId, disposition);
    return row ? decisionFrom(row) : null;
  }

  listDecisions(
    draftId: string,
    options: { afterSeq?: number; limit?: number } = {},
  ): DecisionEventRecord[] {
    const afterSeq = options.afterSeq ?? 0;
    const limit = options.limit ?? 100;
    return this.db.prepare<[string, number, number], DecisionRow>(
      `SELECT events.*, notes.note
       FROM decision_events AS events
       LEFT JOIN decision_notes AS notes ON notes.decision_id = events.id
       WHERE draft_id = ? AND seq > ?
       ORDER BY seq
       LIMIT ?`,
    ).all(draftId, afterSeq, limit).map(decisionFrom);
  }

  setDecisionNote(
    decisionId: string,
    note: string | null,
    updatedAt: string,
  ): DecisionEventRecord {
    if (!this.getDecision(decisionId)) {
      throw new Error(`decision not found: ${decisionId}`);
    }
    if (note === null) {
      this.db.prepare(
        'DELETE FROM decision_notes WHERE decision_id = ?',
      ).run(decisionId);
    } else {
      this.db.prepare(
        `INSERT INTO decision_notes (decision_id, note, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT (decision_id) DO UPDATE
         SET note = excluded.note, updated_at = excluded.updated_at`,
      ).run(decisionId, note, updatedAt);
    }
    return this.getDecision(decisionId)!;
  }

  openSession(record: LearningSessionRecord): LearningSessionRecord {
    this.db.prepare(
      `INSERT INTO learning_sessions (
        id, draft_id, start_cursor, end_cursor, created_at, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING`,
    ).run(
      record.id,
      record.draftId,
      record.startCursor,
      record.endCursor,
      record.createdAt,
      record.closedAt,
    );
    return this.getSession(record.id)!;
  }

  getSession(id: string): LearningSessionRecord | null {
    const row = this.db.prepare<[string], SessionRow>(
      'SELECT * FROM learning_sessions WHERE id = ?',
    ).get(id);
    return row ? sessionFrom(row) : null;
  }

  createDistillationRun(
    record: DistillationRunRecord,
  ): DistillationRunRecord {
    return this.db.transaction(() => {
      if (!this.getSession(record.sessionId)) {
        this.openSession({
          id: record.sessionId,
          draftId: record.draftId,
          startCursor: 0,
          endCursor: null,
          createdAt: record.createdAt,
          closedAt: null,
        });
      }
      this.db.prepare(
        `INSERT INTO distillation_runs (
          id, draft_id, session_id, trigger, state, operation_id, resume_key,
          guardrail_markdown, error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        record.id,
        record.draftId,
        record.sessionId,
        record.trigger,
        record.state,
        record.operationId,
        record.resumeKey,
        record.guardrailMarkdown,
        record.error,
        record.createdAt,
        record.updatedAt,
      );
      const insertDecision = this.db.prepare(
        `INSERT INTO distillation_run_decisions (
          run_id, decision_id, ordinal, snapshot_json
        ) VALUES (?, ?, ?, ?)`,
      );
      record.decisions.forEach((item, ordinal) => {
        insertDecision.run(
          record.id,
          item.decisionId,
          ordinal,
          JSON.stringify(item.snapshot),
        );
      });
      const insertLesson = this.db.prepare(
        `INSERT INTO distillation_run_lessons (
          run_id, lesson_id, ordinal, snapshot_json
        ) VALUES (?, ?, ?, ?)`,
      );
      record.lessons.forEach((item, ordinal) => {
        insertLesson.run(
          record.id,
          item.lessonId,
          ordinal,
          JSON.stringify(item.snapshot),
        );
      });
      return this.getDistillationRun(record.id)!;
    })();
  }

  getDistillationRun(id: string): DistillationRunRecord | null {
    const row = this.db.prepare<[string], DistillationRunRow>(
      'SELECT * FROM distillation_runs WHERE id = ?',
    ).get(id);
    if (!row) return null;
    const decisions = this.db.prepare<[string], SnapshotRow>(
      `SELECT decision_id AS source_id, snapshot_json
       FROM distillation_run_decisions
       WHERE run_id = ?
       ORDER BY ordinal`,
    ).all(id).map((item) => ({
      decisionId: item.source_id,
      snapshot: JSON.parse(item.snapshot_json) as unknown,
    }));
    const lessons = this.db.prepare<[string], SnapshotRow>(
      `SELECT lesson_id AS source_id, snapshot_json
       FROM distillation_run_lessons
       WHERE run_id = ?
       ORDER BY ordinal`,
    ).all(id).map((item) => ({
      lessonId: item.source_id,
      snapshot: JSON.parse(item.snapshot_json) as unknown,
    }));
    return {
      id: row.id,
      draftId: row.draft_id,
      sessionId: row.session_id,
      trigger: row.trigger,
      state: row.state,
      operationId: row.operation_id,
      resumeKey: row.resume_key,
      guardrailMarkdown: row.guardrail_markdown,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      decisions,
      lessons,
    };
  }

  createLesson(
    record: LessonRecord,
    evidenceIds: string[],
  ): LessonRecord {
    return this.db.transaction(() => {
      this.db.prepare(
        `INSERT INTO lessons (
          id, draft_id, distillation_run_id, classification, state,
          proposed_markdown, reviewed_markdown, rationale_markdown,
          proposed_target, supersedes_lesson_id, version,
          repository_commit, repository_path, repository_anchor,
          repository_content_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        record.id,
        record.draftId,
        record.distillationRunId,
        record.classification,
        record.state,
        record.proposedMarkdown,
        record.reviewedMarkdown,
        record.rationaleMarkdown,
        record.proposedTarget,
        record.supersedesLessonId,
        record.version,
        record.repositoryCommit,
        record.repositoryPath,
        record.repositoryAnchor,
        record.repositoryContentHash,
        record.createdAt,
        record.updatedAt,
      );
      const insertEvidence = this.db.prepare(
        `INSERT INTO lesson_evidence (lesson_id, decision_id)
         VALUES (?, ?)`,
      );
      for (const decisionId of evidenceIds) {
        insertEvidence.run(record.id, decisionId);
      }
      return this.getLesson(record.id)!;
    })();
  }

  getLesson(id: string): LessonRecord | null {
    const row = this.db.prepare<[string], LessonRow>(
      'SELECT * FROM lessons WHERE id = ?',
    ).get(id);
    return row ? lessonFrom(row) : null;
  }

  listLessonEvidence(lessonId: string): string[] {
    return this.db.prepare<[string], { decision_id: string }>(
      `SELECT decision_id FROM lesson_evidence
       WHERE lesson_id = ?
       ORDER BY rowid`,
    ).all(lessonId).map(({ decision_id }) => decision_id);
  }

  verifyDurableLessonApplication(
    lessonId: string,
    input: {
      expectedVersion: number;
      repositoryCommit: string;
      repositoryPath: string;
      repositoryAnchor: string;
      repositoryContentHash: string;
      updatedAt: string;
    },
  ): LessonRecord {
    const result = this.db.prepare(
      `UPDATE lessons
       SET state = 'applied',
           proposed_markdown = NULL,
           reviewed_markdown = NULL,
           repository_commit = ?,
           repository_path = ?,
           repository_anchor = ?,
           repository_content_hash = ?,
           version = version + 1,
           updated_at = ?
       WHERE id = ?
         AND classification = 'durable'
         AND state = 'approved-pending-reconcile'
         AND version = ?`,
    ).run(
      input.repositoryCommit,
      input.repositoryPath,
      input.repositoryAnchor,
      input.repositoryContentHash,
      input.updatedAt,
      lessonId,
      input.expectedVersion,
    );
    if (result.changes === 0) {
      throw new Error(
        `durable lesson application conflict: ${lessonId}`,
      );
    }
    return this.getLesson(lessonId)!;
  }

  createReconciliation(
    record: LessonReconciliationRecord,
  ): LessonReconciliationRecord {
    this.db.prepare(
      `INSERT INTO lesson_reconciliations (
        id, lesson_id, kind, state, resume_key, prepared_markdown,
        repository_commit, paths_json, anchors_json, content_hashes_json,
        created_at, updated_at, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.lessonId,
      record.kind,
      record.state,
      record.resumeKey,
      record.preparedMarkdown,
      record.repositoryCommit,
      JSON.stringify(record.paths),
      JSON.stringify(record.anchors),
      JSON.stringify(record.contentHashes),
      record.createdAt,
      record.updatedAt,
      record.verifiedAt,
    );
    return this.getReconciliation(record.id)!;
  }

  getReconciliation(id: string): LessonReconciliationRecord | null {
    const row = this.db.prepare<[string], ReconciliationRow>(
      'SELECT * FROM lesson_reconciliations WHERE id = ?',
    ).get(id);
    return row ? reconciliationFrom(row) : null;
  }

  recordValidatorAttempt(
    record: ValidatorAttemptRecord,
  ): ValidatorAttemptRecord {
    this.db.prepare(
      `INSERT INTO validator_attempts (
        id, draft_id, path, content_hash, ok, diagnostics_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.draftId,
      record.path,
      record.contentHash,
      record.ok ? 1 : 0,
      JSON.stringify(record.diagnostics),
      record.createdAt,
    );
    return this.getValidatorAttempt(record.id)!;
  }

  getValidatorAttempt(id: string): ValidatorAttemptRecord | null {
    const row = this.db.prepare<[string], ValidatorAttemptRow>(
      'SELECT * FROM validator_attempts WHERE id = ?',
    ).get(id);
    return row ? validatorAttemptFrom(row) : null;
  }

  listValidatorAttempts(draftId: string): ValidatorAttemptRecord[] {
    return this.db.prepare<[string], ValidatorAttemptRow>(
      `SELECT * FROM validator_attempts
       WHERE draft_id = ?
       ORDER BY created_at, id`,
    ).all(draftId).map(validatorAttemptFrom);
  }

  recordOperationLesson(
    record: OperationLessonRecord,
  ): OperationLessonRecord {
    this.db.prepare(
      `INSERT INTO operation_lessons (
        operation_id, lesson_id, lesson_version, content_hash, created_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (operation_id, lesson_id) DO NOTHING`,
    ).run(
      record.operationId,
      record.lessonId,
      record.lessonVersion,
      record.contentHash,
      record.createdAt,
    );
    const row = this.db.prepare<
      [string, string],
      OperationLessonRow
    >(
      `SELECT * FROM operation_lessons
       WHERE operation_id = ? AND lesson_id = ?`,
    ).get(record.operationId, record.lessonId)!;
    return operationLessonFrom(row);
  }

  close(): void {
    this.db.close();
  }
}

function decisionFrom(row: DecisionRow): DecisionEventRecord {
  return {
    id: row.id,
    draftId: row.draft_id,
    seq: row.seq,
    kind: row.kind,
    sourceType: row.source_type,
    sourceId: row.source_id,
    disposition: row.disposition,
    sourceTimestamp: row.source_timestamp,
    createdAt: row.created_at,
    note: row.note,
  };
}

function lessonFrom(row: LessonRow): LessonRecord {
  return {
    id: row.id,
    draftId: row.draft_id,
    distillationRunId: row.distillation_run_id,
    classification: row.classification,
    state: row.state,
    proposedMarkdown: row.proposed_markdown,
    reviewedMarkdown: row.reviewed_markdown,
    rationaleMarkdown: row.rationale_markdown,
    proposedTarget: row.proposed_target,
    supersedesLessonId: row.supersedes_lesson_id,
    version: row.version,
    repositoryCommit: row.repository_commit,
    repositoryPath: row.repository_path,
    repositoryAnchor: row.repository_anchor,
    repositoryContentHash: row.repository_content_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sessionFrom(row: SessionRow): LearningSessionRecord {
  return {
    id: row.id,
    draftId: row.draft_id,
    startCursor: row.start_cursor,
    endCursor: row.end_cursor,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  };
}

function reconciliationFrom(
  row: ReconciliationRow,
): LessonReconciliationRecord {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    kind: row.kind,
    state: row.state,
    resumeKey: row.resume_key,
    preparedMarkdown: row.prepared_markdown,
    repositoryCommit: row.repository_commit,
    paths: JSON.parse(row.paths_json) as string[],
    anchors: JSON.parse(row.anchors_json) as string[],
    contentHashes: JSON.parse(row.content_hashes_json) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    verifiedAt: row.verified_at,
  };
}

function validatorAttemptFrom(
  row: ValidatorAttemptRow,
): ValidatorAttemptRecord {
  return {
    id: row.id,
    draftId: row.draft_id,
    path: row.path,
    contentHash: row.content_hash,
    ok: row.ok === 1,
    diagnostics: JSON.parse(row.diagnostics_json) as unknown,
    createdAt: row.created_at,
  };
}

function operationLessonFrom(
  row: OperationLessonRow,
): OperationLessonRecord {
  return {
    operationId: row.operation_id,
    lessonId: row.lesson_id,
    lessonVersion: row.lesson_version,
    contentHash: row.content_hash,
    createdAt: row.created_at,
  };
}
