import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentStore } from '../../src/documents/store.js';
import {
  LearningStore,
  type DecisionEventRecord,
  type LessonRecord,
} from '../../src/learning/store.js';

const roots: string[] = [];
const documentStores: DocumentStore[] = [];
const learningStores: LearningStore[] = [];

function databaseFile(): string {
  const root = mkdtempSync(join(tmpdir(), 'learning-store-'));
  roots.push(root);
  return join(root, 'state.sqlite3');
}

function openLearningStore(dbFile = databaseFile()): LearningStore {
  const store = new LearningStore(dbFile);
  learningStores.push(store);
  return store;
}

function seedDraft(dbFile: string, id = 'draft-1'): void {
  const store = new DocumentStore(dbFile);
  documentStores.push(store);
  store.createDraft({
    id,
    episodeSlug: id,
    title: id,
    format: 'narration',
    doc: {
      type: 'doc',
      attrs: { format: 'narration', preamble: '' },
      content: [],
    },
    updatedAt: '2026-07-24T08:00:00.000Z',
  });
}

function decision(
  overrides: Partial<DecisionEventRecord> = {},
): DecisionEventRecord {
  return {
    id: 'decision-1',
    draftId: 'draft-1',
    seq: 1,
    kind: 'proposal-accepted',
    sourceType: 'narration-proposal',
    sourceId: 'operation-1',
    disposition: 'accepted',
    sourceTimestamp: '2026-07-24T08:10:00.000Z',
    createdAt: '2026-07-24T08:10:00.000Z',
    note: null,
    ...overrides,
  };
}

function lesson(
  overrides: Partial<LessonRecord> = {},
): LessonRecord {
  return {
    id: 'lesson-1',
    draftId: 'draft-1',
    distillationRunId: null,
    classification: 'durable',
    state: 'approved-pending-reconcile',
    proposedMarkdown: 'Prefer concrete stakes.',
    reviewedMarkdown: 'Prefer concrete stakes over abstractions.',
    rationaleMarkdown: 'Two explicit choices favored concrete stakes.',
    proposedTarget: 'writing skill',
    supersedesLessonId: null,
    version: 2,
    repositoryCommit: null,
    repositoryPath: null,
    repositoryAnchor: null,
    repositoryContentHash: null,
    createdAt: '2026-07-24T08:20:00.000Z',
    updatedAt: '2026-07-24T08:21:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  for (const store of learningStores.splice(0)) store.close();
  for (const store of documentStores.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('LearningStore', () => {
  it('creates the complete v10 learning schema from every store constructor', () => {
    const dbFile = databaseFile();
    seedDraft(dbFile);
    openLearningStore(dbFile);

    const inspected = new Database(dbFile, { readonly: true });
    const tables = inspected.prepare<[], { name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    ).all().map(({ name }) => name);
    const version = inspected.pragma('user_version', { simple: true });
    inspected.close();

    expect(version).toBe(10);
    expect(tables).toEqual(expect.arrayContaining([
      'decision_events',
      'decision_notes',
      'distillation_run_decisions',
      'distillation_run_lessons',
      'distillation_runs',
      'learning_sessions',
      'lesson_evidence',
      'lesson_reconciliations',
      'lessons',
      'operation_lessons',
      'validator_attempts',
    ]));
  });

  it('captures pointer-only decisions idempotently and keeps notes separate', () => {
    const dbFile = databaseFile();
    seedDraft(dbFile);
    const store = openLearningStore(dbFile);

    expect(store.captureDecision(decision())).toEqual(decision());
    expect(store.captureDecision(decision({
      id: 'ignored-duplicate-id',
      seq: 99,
    }))).toEqual(decision());
    expect(store.setDecisionNote(
      'decision-1',
      '  The slower beat felt honest.  ',
      '2026-07-24T08:11:00.000Z',
    )).toMatchObject({
      id: 'decision-1',
      note: '  The slower beat felt honest.  ',
    });
    expect(store.listDecisions('draft-1')).toHaveLength(1);
  });

  it('freezes ordered decision and prior-lesson snapshots with a run', () => {
    const dbFile = databaseFile();
    seedDraft(dbFile);
    const store = openLearningStore(dbFile);
    store.captureDecision(decision());
    store.createLesson(lesson({
      state: 'proposed',
      version: 1,
    }), ['decision-1']);

    const run = store.createDistillationRun({
      id: 'run-1',
      draftId: 'draft-1',
      sessionId: 'session-1',
      trigger: 'on-demand',
      state: 'frozen',
      operationId: null,
      resumeKey: 'resume-1',
      guardrailMarkdown: null,
      error: null,
      createdAt: '2026-07-24T08:30:00.000Z',
      updatedAt: '2026-07-24T08:30:00.000Z',
      decisions: [{
        decisionId: 'decision-1',
        snapshot: { id: 'decision-1', kind: 'proposal-accepted' },
      }],
      lessons: [{
        lessonId: 'lesson-1',
        snapshot: { id: 'lesson-1', state: 'proposed' },
      }],
    });

    expect(run.decisions).toEqual([{
      decisionId: 'decision-1',
      snapshot: { id: 'decision-1', kind: 'proposal-accepted' },
    }]);
    expect(run.lessons).toEqual([{
      lessonId: 'lesson-1',
      snapshot: { id: 'lesson-1', state: 'proposed' },
    }]);
  });

  it('clears durable candidate prose only when verified provenance replaces it', () => {
    const dbFile = databaseFile();
    seedDraft(dbFile);
    const store = openLearningStore(dbFile);
    store.captureDecision(decision());
    store.createLesson(lesson(), ['decision-1']);

    const applied = store.verifyDurableLessonApplication('lesson-1', {
      expectedVersion: 2,
      repositoryCommit: 'abc123',
      repositoryPath: 'whp-youtube/STEERING.md',
      repositoryAnchor: '## Openings',
      repositoryContentHash: 'sha256:doctrine',
      updatedAt: '2026-07-24T08:40:00.000Z',
    });

    expect(applied).toMatchObject({
      state: 'applied',
      proposedMarkdown: null,
      reviewedMarkdown: null,
      rationaleMarkdown: lesson().rationaleMarkdown,
      repositoryCommit: 'abc123',
      repositoryPath: 'whp-youtube/STEERING.md',
      repositoryAnchor: '## Openings',
      repositoryContentHash: 'sha256:doctrine',
      version: 3,
    });
  });

  it('enforces evidence, operation application, and active reconciliation uniqueness', () => {
    const dbFile = databaseFile();
    seedDraft(dbFile);
    const store = openLearningStore(dbFile);
    store.captureDecision(decision());
    store.createLesson(lesson(), ['decision-1']);

    expect(() => store.createLesson(lesson({
      id: 'lesson-2',
    }), ['decision-1', 'decision-1'])).toThrow(/unique/i);
    store.createReconciliation({
      id: 'reconcile-1',
      lessonId: 'lesson-1',
      kind: 'apply',
      state: 'prepared',
      resumeKey: 'opaque-1',
      preparedMarkdown: 'Run $reconcile-whp.',
      repositoryCommit: null,
      paths: [],
      anchors: [],
      contentHashes: [],
      createdAt: '2026-07-24T08:30:00.000Z',
      updatedAt: '2026-07-24T08:30:00.000Z',
      verifiedAt: null,
    });
    expect(() => store.createReconciliation({
      id: 'reconcile-2',
      lessonId: 'lesson-1',
      kind: 'retire',
      state: 'prepared',
      resumeKey: 'opaque-2',
      preparedMarkdown: 'Run $reconcile-whp.',
      repositoryCommit: null,
      paths: [],
      anchors: [],
      contentHashes: [],
      createdAt: '2026-07-24T08:31:00.000Z',
      updatedAt: '2026-07-24T08:31:00.000Z',
      verifiedAt: null,
    })).toThrow(/unique/i);
    const application = {
      operationId: 'jobs:operation-1',
      lessonId: 'lesson-1',
      lessonVersion: 2,
      contentHash: 'sha256:applied-lesson',
      createdAt: '2026-07-24T08:32:00.000Z',
    };
    expect(store.recordOperationLesson(application)).toEqual(application);
    expect(store.recordOperationLesson({
      ...application,
      contentHash: 'sha256:must-not-overwrite',
    })).toEqual(application);
  });
});
