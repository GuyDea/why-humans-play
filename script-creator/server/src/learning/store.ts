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
  preparedHead: string | null;
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
  prepared_head: string | null;
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

  latestDecisionSeq(draftId: string): number {
    return this.db.prepare<[string], { seq: number }>(
      `SELECT COALESCE(MAX(seq), 0) AS seq
       FROM decision_events
       WHERE draft_id = ?`,
    ).get(draftId)!.seq;
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

  getOpenSession(draftId: string): LearningSessionRecord | null {
    const row = this.db.prepare<[string], SessionRow>(
      `SELECT * FROM learning_sessions
       WHERE draft_id = ? AND closed_at IS NULL`,
    ).get(draftId);
    return row ? sessionFrom(row) : null;
  }

  listSessions(draftId: string): LearningSessionRecord[] {
    return this.db.prepare<[string], SessionRow>(
      `SELECT * FROM learning_sessions
       WHERE draft_id = ?
       ORDER BY rowid`,
    ).all(draftId).map(sessionFrom);
  }

  closeSession(
    id: string,
    endCursor: number,
    closedAt: string,
  ): LearningSessionRecord {
    const result = this.db.prepare(
      `UPDATE learning_sessions
       SET end_cursor = ?, closed_at = ?
       WHERE id = ? AND closed_at IS NULL`,
    ).run(endCursor, closedAt, id);
    if (result.changes === 0) {
      const current = this.getSession(id);
      if (
        current?.endCursor !== endCursor
        || current.closedAt !== closedAt
      ) {
        throw new Error(`learning session close conflict: ${id}`);
      }
    }
    return this.getSession(id)!;
  }

  createDistillationRun(
    record: DistillationRunRecord,
    options: { closeSessionAt?: number } = {},
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
      if (options.closeSessionAt !== undefined) {
        this.closeSession(
          record.sessionId,
          options.closeSessionAt,
          record.updatedAt,
        );
      }
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

  getActiveDistillationRun(
    draftId: string,
    trigger: DistillationTrigger,
  ): DistillationRunRecord | null {
    const row = this.db.prepare<
      [string, DistillationTrigger],
      DistillationRunRow
    >(
      `SELECT * FROM distillation_runs
       WHERE draft_id = ?
         AND trigger = ?
         AND state IN ('frozen', 'queued', 'running', 'completed')
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`,
    ).get(draftId, trigger);
    return row ? this.getDistillationRun(row.id) : null;
  }

  listRecoverableDistillationRuns(): DistillationRunRecord[] {
    return this.db.prepare<[], DistillationRunRow>(
      `SELECT * FROM distillation_runs
       WHERE state IN ('frozen', 'queued', 'running', 'completed')
       ORDER BY created_at, rowid`,
    ).all().map((row) => this.getDistillationRun(row.id)!);
  }

  updateDistillationRun(
    id: string,
    update: {
      state: DistillationRunState;
      operationId?: string | null;
      guardrailMarkdown?: string | null;
      error?: string | null;
      updatedAt: string;
    },
  ): DistillationRunRecord {
    const current = this.getDistillationRun(id);
    if (!current) throw new Error(`distillation run not found: ${id}`);
    this.db.prepare(
      `UPDATE distillation_runs
       SET state = ?,
           operation_id = ?,
           guardrail_markdown = ?,
           error = ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(
      update.state,
      update.operationId === undefined
        ? current.operationId
        : update.operationId,
      update.guardrailMarkdown === undefined
        ? current.guardrailMarkdown
        : update.guardrailMarkdown,
      update.error === undefined ? current.error : update.error,
      update.updatedAt,
      id,
    );
    return this.getDistillationRun(id)!;
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

  listLessons(draftId: string): LessonRecord[] {
    return this.db.prepare<[string], LessonRow>(
      `SELECT * FROM lessons
       WHERE draft_id = ?
       ORDER BY created_at, rowid`,
    ).all(draftId).map(lessonFrom);
  }

  listActiveEpisodeLessons(draftId: string): LessonRecord[] {
    return this.db.prepare<[string], LessonRow>(
      `SELECT * FROM lessons
       WHERE draft_id = ?
         AND classification = 'episode-local'
         AND state = 'approved'
         AND reviewed_markdown IS NOT NULL
       ORDER BY created_at, rowid`,
    ).all(draftId).map(lessonFrom);
  }

  editLesson(
    lessonId: string,
    input: {
      expectedVersion: number;
      reviewedMarkdown: string;
      updatedAt: string;
    },
  ): LessonRecord {
    const result = this.db.prepare(
      `UPDATE lessons
       SET reviewed_markdown = ?,
           version = version + 1,
           updated_at = ?
       WHERE id = ? AND state = 'proposed' AND version = ?`,
    ).run(
      input.reviewedMarkdown,
      input.updatedAt,
      lessonId,
      input.expectedVersion,
    );
    if (result.changes === 0) {
      throw new Error(`lesson version conflict: ${lessonId}`);
    }
    return this.getLesson(lessonId)!;
  }

  rejectLesson(
    lessonId: string,
    input: {
      expectedVersion: number;
      updatedAt: string;
    },
  ): LessonRecord {
    return this.db.transaction(() => {
      const lesson = this.getLesson(lessonId);
      if (!lesson) throw new Error(`lesson not found: ${lessonId}`);
      if (
        lesson.version !== input.expectedVersion
        && lesson.state !== 'rejected'
      ) {
        throw new Error(`lesson version conflict: ${lessonId}`);
      }
      if (lesson.state === 'rejected') return lesson;
      if (
        lesson.state !== 'proposed'
        && lesson.state !== 'approved-pending-reconcile'
      ) {
        throw new Error(`lesson rejection conflict: ${lessonId}`);
      }
      this.db.prepare(
        `UPDATE lessons
         SET state = 'rejected',
             version = version + 1,
             updated_at = ?
         WHERE id = ?`,
      ).run(input.updatedAt, lessonId);
      const active = this.getActiveReconciliationForLesson(lessonId);
      if (active) {
        this.db.prepare(
          `UPDATE lesson_reconciliations
           SET state = 'verified', updated_at = ?, verified_at = ?
           WHERE id = ?`,
        ).run(input.updatedAt, input.updatedAt, active.id);
      }
      if (lesson.supersedesLessonId) {
        const predecessor = this.getLesson(lesson.supersedesLessonId);
        if (predecessor?.state === 'supersession-pending') {
          this.db.prepare(
            `UPDATE lessons
             SET state = 'applied',
                 version = version + 1,
                 updated_at = ?
             WHERE id = ?`,
          ).run(input.updatedAt, predecessor.id);
        }
      }
      return this.getLesson(lessonId)!;
    })();
  }

  setLessonSupersedes(
    lessonId: string,
    input: {
      expectedVersion: number;
      predecessorLessonId: string;
      updatedAt: string;
    },
  ): LessonRecord {
    return this.db.transaction(() => {
      const lesson = this.getLesson(lessonId);
      const predecessor = this.getLesson(input.predecessorLessonId);
      if (!lesson || lesson.state !== 'proposed') {
        throw new Error(`lesson supersession conflict: ${lessonId}`);
      }
      if (
        lesson.version !== input.expectedVersion
        || !predecessor
        || predecessor.id === lesson.id
        || predecessor.draftId !== lesson.draftId
        || predecessor.classification !== lesson.classification
        || (
          lesson.classification === 'episode-local'
            ? predecessor.state !== 'approved'
            : predecessor.state !== 'applied'
        )
      ) {
        throw new Error(`lesson supersession conflict: ${lessonId}`);
      }
      this.db.prepare(
        `UPDATE lessons
         SET supersedes_lesson_id = ?,
             version = version + 1,
             updated_at = ?
         WHERE id = ?`,
      ).run(input.predecessorLessonId, input.updatedAt, lessonId);
      return this.getLesson(lessonId)!;
    })();
  }

  approveEpisodeLesson(
    lessonId: string,
    input: {
      expectedVersion: number;
      updatedAt: string;
    },
  ): LessonRecord {
    return this.db.transaction(() => {
      const lesson = this.getLesson(lessonId);
      if (!lesson) throw new Error(`lesson not found: ${lessonId}`);
      if (
        lesson.classification !== 'episode-local'
        || lesson.state !== 'proposed'
        || lesson.version !== input.expectedVersion
        || lesson.reviewedMarkdown === null
      ) {
        throw new Error(`lesson approval conflict: ${lessonId}`);
      }
      const predecessorId = lesson.supersedesLessonId;
      if (predecessorId !== null) {
        if (predecessorId === lessonId) {
          throw new Error(`lesson supersession cycle: ${lessonId}`);
        }
        const predecessor = this.getLesson(predecessorId);
        if (
          !predecessor
          || predecessor.draftId !== lesson.draftId
          || predecessor.classification !== 'episode-local'
          || predecessor.state !== 'approved'
        ) {
          throw new Error(
            `lesson supersession conflict: ${predecessorId}`,
          );
        }
        let current: LessonRecord | null = predecessor;
        const seen = new Set<string>();
        while (current?.supersedesLessonId) {
          if (
            current.supersedesLessonId === lessonId
            || seen.has(current.supersedesLessonId)
          ) {
            throw new Error(`lesson supersession cycle: ${lessonId}`);
          }
          seen.add(current.supersedesLessonId);
          current = this.getLesson(current.supersedesLessonId);
        }
        this.db.prepare(
          `UPDATE lessons
           SET state = 'superseded',
               version = version + 1,
               updated_at = ?
           WHERE id = ?`,
        ).run(input.updatedAt, predecessorId);
      }
      this.db.prepare(
        `UPDATE lessons
         SET state = 'approved',
             version = version + 1,
             updated_at = ?
         WHERE id = ?`,
      ).run(input.updatedAt, lessonId);
      return this.getLesson(lessonId)!;
    })();
  }

  retireEpisodeLesson(
    lessonId: string,
    input: {
      expectedVersion: number;
      updatedAt: string;
    },
  ): LessonRecord {
    const result = this.db.prepare(
      `UPDATE lessons
       SET state = 'retired',
           version = version + 1,
           updated_at = ?
       WHERE id = ?
         AND classification = 'episode-local'
         AND state = 'approved'
         AND version = ?`,
    ).run(input.updatedAt, lessonId, input.expectedVersion);
    if (result.changes === 0) {
      throw new Error(`lesson retirement conflict: ${lessonId}`);
    }
    return this.getLesson(lessonId)!;
  }

  approveDurableLesson(
    lessonId: string,
    input: {
      expectedVersion: number;
      reconciliation: LessonReconciliationRecord;
      updatedAt: string;
    },
  ): {
    lesson: LessonRecord;
    reconciliation: LessonReconciliationRecord;
  } {
    return this.db.transaction(() => {
      const lesson = this.getLesson(lessonId);
      if (!lesson) throw new Error(`lesson not found: ${lessonId}`);
      if (
        lesson.classification === 'durable'
        && lesson.state === 'approved-pending-reconcile'
      ) {
        const existing = this.getActiveReconciliationForLesson(lessonId);
        if (!existing) {
          throw new Error(`lesson reconciliation conflict: ${lessonId}`);
        }
        return { lesson, reconciliation: existing };
      }
      if (
        lesson.classification !== 'durable'
        || lesson.state !== 'proposed'
        || lesson.version !== input.expectedVersion
        || lesson.reviewedMarkdown === null
      ) {
        throw new Error(`lesson approval conflict: ${lessonId}`);
      }
      this.db.prepare(
        `UPDATE lessons
         SET state = 'approved-pending-reconcile',
             version = version + 1,
             updated_at = ?
         WHERE id = ?`,
      ).run(input.updatedAt, lessonId);
      if (lesson.supersedesLessonId) {
        const predecessor = this.getLesson(lesson.supersedesLessonId);
        if (
          !predecessor
          || predecessor.draftId !== lesson.draftId
          || predecessor.classification !== 'durable'
          || predecessor.state !== 'applied'
        ) {
          throw new Error(
            `lesson supersession conflict: ${lesson.supersedesLessonId}`,
          );
        }
        this.db.prepare(
          `UPDATE lessons
           SET state = 'supersession-pending',
               version = version + 1,
               updated_at = ?
           WHERE id = ?`,
        ).run(input.updatedAt, predecessor.id);
      }
      const reconciliation = this.createReconciliation(
        input.reconciliation,
      );
      return {
        lesson: this.getLesson(lessonId)!,
        reconciliation,
      };
    })();
  }

  prepareDurableRetirement(
    lessonId: string,
    input: {
      expectedVersion: number;
      reconciliation: LessonReconciliationRecord;
      updatedAt: string;
    },
  ): {
    lesson: LessonRecord;
    reconciliation: LessonReconciliationRecord;
  } {
    return this.db.transaction(() => {
      const lesson = this.getLesson(lessonId);
      if (!lesson) throw new Error(`lesson not found: ${lessonId}`);
      if (
        lesson.classification === 'durable'
        && lesson.state === 'retirement-pending'
      ) {
        const existing = this.getActiveReconciliationForLesson(lessonId);
        if (!existing) {
          throw new Error(`lesson reconciliation conflict: ${lessonId}`);
        }
        return { lesson, reconciliation: existing };
      }
      if (
        lesson.classification !== 'durable'
        || lesson.state !== 'applied'
        || lesson.version !== input.expectedVersion
      ) {
        throw new Error(`lesson retirement conflict: ${lessonId}`);
      }
      this.db.prepare(
        `UPDATE lessons
         SET state = 'retirement-pending',
             version = version + 1,
             updated_at = ?
         WHERE id = ?`,
      ).run(input.updatedAt, lessonId);
      return {
        lesson: this.getLesson(lessonId)!,
        reconciliation: this.createReconciliation(
          input.reconciliation,
        ),
      };
    })();
  }

  listLessonEvidence(lessonId: string): string[] {
    return this.db.prepare<[string], { decision_id: string }>(
      `SELECT decision_id FROM lesson_evidence
       WHERE lesson_id = ?
       ORDER BY rowid`,
    ).all(lessonId).map(({ decision_id }) => decision_id);
  }

  ingestDistillationRun(
    runId: string,
    lessons: Array<{
      record: LessonRecord;
      evidenceIds: string[];
    }>,
    guardrailMarkdown: string | null,
    updatedAt: string,
  ): DistillationRunRecord {
    return this.db.transaction(() => {
      const run = this.getDistillationRun(runId);
      if (!run) throw new Error(`distillation run not found: ${runId}`);
      if (run.state === 'ingested') return run;
      for (const lesson of lessons) {
        this.createLesson(lesson.record, lesson.evidenceIds);
      }
      return this.updateDistillationRun(runId, {
        state: 'ingested',
        guardrailMarkdown,
        error: null,
        updatedAt,
      });
    })();
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
        prepared_head, repository_commit, paths_json, anchors_json,
        content_hashes_json, created_at, updated_at, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.lessonId,
      record.kind,
      record.state,
      record.resumeKey,
      record.preparedMarkdown,
      record.preparedHead,
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

  getReconciliationByResumeKey(
    resumeKey: string,
  ): LessonReconciliationRecord | null {
    const row = this.db.prepare<[string], ReconciliationRow>(
      'SELECT * FROM lesson_reconciliations WHERE resume_key = ?',
    ).get(resumeKey);
    return row ? reconciliationFrom(row) : null;
  }

  getActiveReconciliationForLesson(
    lessonId: string,
  ): LessonReconciliationRecord | null {
    const row = this.db.prepare<[string], ReconciliationRow>(
      `SELECT * FROM lesson_reconciliations
       WHERE lesson_id = ? AND state != 'verified'
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`,
    ).get(lessonId);
    return row ? reconciliationFrom(row) : null;
  }

  listLessonReconciliations(
    lessonId: string,
  ): LessonReconciliationRecord[] {
    return this.db.prepare<[string], ReconciliationRow>(
      `SELECT * FROM lesson_reconciliations
       WHERE lesson_id = ?
       ORDER BY created_at, rowid`,
    ).all(lessonId).map(reconciliationFrom);
  }

  markReconciliationAwaiting(
    resumeKey: string,
    updatedAt: string,
  ): LessonReconciliationRecord {
    const current = this.getReconciliationByResumeKey(resumeKey);
    if (!current) {
      throw new Error(`lesson reconciliation not found: ${resumeKey}`);
    }
    if (current.state === 'awaiting-reconciliation') return current;
    if (current.state !== 'prepared') {
      throw new Error(
        `lesson reconciliation transition conflict: ${resumeKey}`,
      );
    }
    this.db.prepare(
      `UPDATE lesson_reconciliations
       SET state = 'awaiting-reconciliation', updated_at = ?
       WHERE id = ?`,
    ).run(updatedAt, current.id);
    return this.getReconciliation(current.id)!;
  }

  verifyReconciliation(
    resumeKey: string,
    input: {
      repositoryCommit: string;
      paths: string[];
      anchors: string[];
      contentHashes: string[];
      repositoryPath: string | null;
      repositoryAnchor: string | null;
      repositoryContentHash: string | null;
      updatedAt: string;
    },
  ): {
    lesson: LessonRecord;
    reconciliation: LessonReconciliationRecord;
  } {
    return this.db.transaction(() => {
      const reconciliation = this.getReconciliationByResumeKey(resumeKey);
      if (!reconciliation) {
        throw new Error(`lesson reconciliation not found: ${resumeKey}`);
      }
      const lesson = this.getLesson(reconciliation.lessonId);
      if (!lesson) {
        throw new Error(`lesson not found: ${reconciliation.lessonId}`);
      }
      if (reconciliation.state === 'verified') {
        return { lesson, reconciliation };
      }
      if (reconciliation.state !== 'awaiting-reconciliation') {
        throw new Error(
          `lesson reconciliation verification conflict: ${resumeKey}`,
        );
      }
      if (reconciliation.kind === 'retire') {
        if (lesson.state !== 'retirement-pending') {
          throw new Error(`lesson retirement conflict: ${lesson.id}`);
        }
        this.db.prepare(
          `UPDATE lessons
           SET state = 'retired',
               repository_commit = ?,
               repository_path = NULL,
               repository_anchor = NULL,
               repository_content_hash = NULL,
               version = version + 1,
               updated_at = ?
           WHERE id = ?`,
        ).run(input.repositoryCommit, input.updatedAt, lesson.id);
      } else {
        if (lesson.state !== 'approved-pending-reconcile') {
          throw new Error(`lesson application conflict: ${lesson.id}`);
        }
        if (
          !input.repositoryPath
          || !input.repositoryAnchor
          || !input.repositoryContentHash
        ) {
          throw new Error(
            `lesson application provenance is incomplete: ${lesson.id}`,
          );
        }
        this.db.prepare(
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
           WHERE id = ?`,
        ).run(
          input.repositoryCommit,
          input.repositoryPath,
          input.repositoryAnchor,
          input.repositoryContentHash,
          input.updatedAt,
          lesson.id,
        );
        if (
          reconciliation.kind === 'supersede'
          && lesson.supersedesLessonId
        ) {
          this.db.prepare(
            `UPDATE lessons
             SET state = 'superseded',
                 repository_commit = ?,
                 version = version + 1,
                 updated_at = ?
             WHERE id = ? AND state = 'supersession-pending'`,
          ).run(
            input.repositoryCommit,
            input.updatedAt,
            lesson.supersedesLessonId,
          );
        }
      }
      this.db.prepare(
        `UPDATE lesson_reconciliations
         SET state = 'verified',
             prepared_markdown = '',
             repository_commit = ?,
             paths_json = ?,
             anchors_json = ?,
             content_hashes_json = ?,
             updated_at = ?,
             verified_at = ?
         WHERE id = ?`,
      ).run(
        input.repositoryCommit,
        JSON.stringify(input.paths),
        JSON.stringify(input.anchors),
        JSON.stringify(input.contentHashes),
        input.updatedAt,
        input.updatedAt,
        reconciliation.id,
      );
      this.scrubVerifiedDurableLessonSnapshots(lesson.id, {
        commit: input.repositoryCommit,
        path: input.repositoryPath,
        anchor: input.repositoryAnchor,
        contentHash: input.repositoryContentHash,
      });
      return {
        lesson: this.getLesson(lesson.id)!,
        reconciliation: this.getReconciliation(reconciliation.id)!,
      };
    })();
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

  private scrubVerifiedDurableLessonSnapshots(
    lessonId: string,
    provenance: {
      commit: string;
      path: string | null;
      anchor: string | null;
      contentHash: string | null;
    },
  ): void {
    const rows = this.db.prepare<[string], {
      run_id: string;
      snapshot_json: string;
    }>(
      `SELECT run_id, snapshot_json
       FROM distillation_run_lessons
       WHERE lesson_id = ?`,
    ).all(lessonId);
    const update = this.db.prepare(
      `UPDATE distillation_run_lessons
       SET snapshot_json = ?
       WHERE run_id = ? AND lesson_id = ?`,
    );
    for (const row of rows) {
      const snapshot = JSON.parse(row.snapshot_json) as unknown;
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        continue;
      }
      update.run(JSON.stringify({
        ...(snapshot as Record<string, unknown>),
        lesson_markdown: null,
        repository_provenance: {
          commit: provenance.commit,
          path: provenance.path,
          anchor: provenance.anchor,
          content_hash: provenance.contentHash,
        },
      }), row.run_id, lessonId);
    }
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

  recordOperationLessons(
    records: OperationLessonRecord[],
  ): OperationLessonRecord[] {
    return this.db.transaction(() => {
      for (const record of records) {
        const existing = this.db.prepare<
          [string, string],
          OperationLessonRow
        >(
          `SELECT * FROM operation_lessons
           WHERE operation_id = ? AND lesson_id = ?`,
        ).get(record.operationId, record.lessonId);
        if (
          existing
          && (
            existing.lesson_version !== record.lessonVersion
            || existing.content_hash !== record.contentHash
          )
        ) {
          throw new Error(
            `operation lesson snapshot conflict: ${record.operationId}`,
          );
        }
        this.recordOperationLesson(record);
      }
      return this.listOperationLessons(records[0]?.operationId ?? '');
    })();
  }

  listOperationLessons(operationId: string): OperationLessonRecord[] {
    return this.db.prepare<[string], OperationLessonRow>(
      `SELECT * FROM operation_lessons
       WHERE operation_id = ?
       ORDER BY created_at, rowid`,
    ).all(operationId).map(operationLessonFrom);
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
    preparedHead: row.prepared_head,
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
