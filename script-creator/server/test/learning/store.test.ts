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
  it('creates the complete v12 learning schema from every store constructor', () => {
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

    expect(version).toBe(12);
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
      preparedHead: 'prepared-head',
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
      preparedHead: 'prepared-head',
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

  it('edits, approves, retires, and supersedes episode-local lessons with CAS', () => {
    const dbFile = databaseFile();
    seedDraft(dbFile);
    const store = openLearningStore(dbFile);
    store.captureDecision(decision());
    store.createLesson(lesson({
      id: 'local-1',
      classification: 'episode-local',
      state: 'proposed',
      version: 1,
      proposedMarkdown: 'Original proposal.',
      reviewedMarkdown: 'Original proposal.',
    }), ['decision-1']);
    store.createLesson(lesson({
      id: 'local-2',
      classification: 'episode-local',
      state: 'proposed',
      version: 1,
      proposedMarkdown: 'Replacement proposal.',
      reviewedMarkdown: 'Replacement proposal.',
      supersedesLessonId: 'local-1',
    }), ['decision-1']);

    const edited = store.editLesson('local-1', {
      expectedVersion: 1,
      reviewedMarkdown: '  Martin exact edit.  ',
      updatedAt: '2026-07-24T08:30:00.000Z',
    });
    expect(edited).toMatchObject({
      state: 'proposed',
      proposedMarkdown: 'Original proposal.',
      reviewedMarkdown: '  Martin exact edit.  ',
      version: 2,
    });
    expect(() => store.editLesson('local-1', {
      expectedVersion: 1,
      reviewedMarkdown: 'stale',
      updatedAt: '2026-07-24T08:31:00.000Z',
    })).toThrow(/lesson version conflict/i);

    expect(store.approveEpisodeLesson('local-1', {
      expectedVersion: 2,
      updatedAt: '2026-07-24T08:32:00.000Z',
    })).toMatchObject({ state: 'approved', version: 3 });
    expect(store.approveEpisodeLesson('local-2', {
      expectedVersion: 1,
      updatedAt: '2026-07-24T08:33:00.000Z',
    })).toMatchObject({ state: 'approved', version: 2 });
    expect(store.getLesson('local-1')).toMatchObject({
      state: 'superseded',
      version: 4,
    });
    expect(store.retireEpisodeLesson('local-2', {
      expectedVersion: 2,
      updatedAt: '2026-07-24T08:34:00.000Z',
    })).toMatchObject({ state: 'retired', version: 3 });
  });

  it('persists durable reconciliation transitions without changing repository files', () => {
    const dbFile = databaseFile();
    seedDraft(dbFile);
    const store = openLearningStore(dbFile);
    store.captureDecision(decision());
    store.createLesson(lesson({
      state: 'proposed',
      version: 1,
    }), ['decision-1']);

    const prepared = store.approveDurableLesson('lesson-1', {
      expectedVersion: 1,
      reconciliation: {
        id: 'reconcile-1',
        lessonId: 'lesson-1',
        kind: 'apply',
        state: 'prepared',
        resumeKey: 'opaque-1',
        preparedMarkdown: 'Candidate handoff.',
        preparedHead: 'prepared-head',
        repositoryCommit: null,
        paths: [],
        anchors: [],
        contentHashes: [],
        createdAt: '2026-07-24T08:30:00.000Z',
        updatedAt: '2026-07-24T08:30:00.000Z',
        verifiedAt: null,
      },
      updatedAt: '2026-07-24T08:30:00.000Z',
    });

    expect(prepared.lesson).toMatchObject({
      state: 'approved-pending-reconcile',
      version: 2,
    });
    expect(prepared.reconciliation).toMatchObject({
      state: 'prepared',
      resumeKey: 'opaque-1',
    });
    expect(store.markReconciliationAwaiting(
      'opaque-1',
      '2026-07-24T08:31:00.000Z',
    )).toMatchObject({ state: 'awaiting-reconciliation' });
    store.createDistillationRun({
      id: 'run-with-shadow',
      draftId: 'draft-1',
      sessionId: 'session-with-shadow',
      trigger: 'on-demand',
      state: 'ingested',
      operationId: 'distill-operation',
      resumeKey: 'distill-resume',
      guardrailMarkdown: null,
      error: null,
      createdAt: '2026-07-24T08:31:30.000Z',
      updatedAt: '2026-07-24T08:31:30.000Z',
      decisions: [],
      lessons: [{
        lessonId: 'lesson-1',
        snapshot: {
          id: 'lesson-1',
          classification: 'durable',
          state: 'approved-pending-reconcile',
          lesson_markdown: 'Candidate handoff.',
        },
      }],
    });

    const verified = store.verifyReconciliation('opaque-1', {
      repositoryCommit: 'verified-commit',
      reconciliationTokens: ['opaque-1'],
      paths: ['DECISIONS.md', 'whp-youtube/STEERING.md'],
      anchors: ['lines:4-4'],
      contentHashes: ['sha256:verified'],
      repositoryPath: 'whp-youtube/STEERING.md',
      repositoryAnchor: 'lines:4-4',
      repositoryContentHash: 'sha256:verified',
      updatedAt: '2026-07-24T08:32:00.000Z',
    });

    expect(verified.lesson).toMatchObject({
      state: 'applied',
      proposedMarkdown: null,
      reviewedMarkdown: null,
    });
    expect(verified.reconciliation).toMatchObject({
      state: 'verified',
      preparedMarkdown: '',
      preparedHead: 'prepared-head',
    });
    expect(store.getDistillationRun('run-with-shadow')?.lessons).toEqual([{
      lessonId: 'lesson-1',
      snapshot: expect.objectContaining({
        repository_provenance: {
          status: 'resolved',
          commit: 'verified-commit',
          path: 'whp-youtube/STEERING.md',
          anchor: 'lines:4-4',
          content_hash: 'sha256:verified',
        },
      }),
    }]);
    expect(
      store.getDistillationRun('run-with-shadow')?.lessons[0]?.snapshot,
    ).not.toHaveProperty('lesson_markdown');

    expect(() => store.verifyReconciliation('opaque-1', {
      repositoryCommit: 'different-commit',
      reconciliationTokens: ['opaque-1'],
      paths: ['DECISIONS.md', 'whp-youtube/STEERING.md'],
      anchors: ['lines:4-4'],
      contentHashes: ['sha256:verified'],
      repositoryPath: 'whp-youtube/STEERING.md',
      repositoryAnchor: 'lines:4-4',
      repositoryContentHash: 'sha256:verified',
      updatedAt: '2026-07-24T08:33:00.000Z',
    })).toThrow(/verification conflict/iu);
  });

  it('refuses a claimed reconciliation commit unless it carries every lesson token', () => {
    const dbFile = databaseFile();
    seedDraft(dbFile);
    const store = openLearningStore(dbFile);
    store.captureDecision(decision());
    for (const [id, resumeKey] of [
      ['lesson-a', 'token-a'],
      ['lesson-b', 'token-b'],
    ] as const) {
      store.createLesson(lesson({
        id,
        state: 'approved-pending-reconcile',
      }), ['decision-1']);
      store.createReconciliation({
        id: `reconcile-${id}`,
        lessonId: id,
        kind: 'apply',
        state: 'awaiting-reconciliation',
        resumeKey,
        preparedMarkdown: `Reconciliation: ${resumeKey}`,
        preparedHead: 'prepared-head',
        repositoryCommit: null,
        paths: [],
        anchors: [],
        contentHashes: [],
        createdAt: '2026-07-24T08:30:00.000Z',
        updatedAt: '2026-07-24T08:30:00.000Z',
        verifiedAt: null,
      });
    }
    const verification = {
      repositoryCommit: 'shared-commit',
      paths: ['DECISIONS.md', 'whp-youtube/STEERING.md'],
      anchors: ['lines:4-4'],
      contentHashes: ['sha256:verified'],
      repositoryPath: 'whp-youtube/STEERING.md',
      repositoryAnchor: 'lines:4-4',
      repositoryContentHash: 'sha256:verified',
      updatedAt: '2026-07-24T08:32:00.000Z',
    };

    expect(store.verifyReconciliation('token-a', {
      ...verification,
      reconciliationTokens: ['token-a'],
    }).reconciliation.state).toBe('verified');
    expect(() => store.verifyReconciliation('token-b', {
      ...verification,
      reconciliationTokens: ['token-b'],
    })).toThrow(/already claimed.+token-a/iu);
    expect(store.verifyReconciliation('token-b', {
      ...verification,
      reconciliationTokens: ['token-a', 'token-b'],
    }).reconciliation.state).toBe('verified');
  });
});
