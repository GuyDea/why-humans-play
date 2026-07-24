import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentStore } from '../../src/documents/store.js';
import { buildApp } from '../../src/http/app.js';
import { LearningService } from '../../src/learning/service.js';
import { LearningStore } from '../../src/learning/store.js';
import { TopicStore } from '../../src/topics/store.js';
import {
  UNUSED_DOCUMENT_SERVICE,
  UNUSED_VALIDATOR_SERVICE,
} from './stubs.js';

const NONCE = 'lessons-test-nonce';
const AUTH = { 'x-sc-nonce': NONCE };
const roots: string[] = [];
const documentStores: DocumentStore[] = [];
const learningStores: LearningStore[] = [];
const topicStores: TopicStore[] = [];

afterEach(() => {
  for (const store of topicStores.splice(0)) store.close();
  for (const store of learningStores.splice(0)) store.close();
  for (const store of documentStores.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function appWithLearning(learningService: Record<string, unknown>) {
  return buildApp({
    nonce: NONCE,
    operationService: {
      submit: vi.fn(),
      list: () => [],
      get: vi.fn(),
      events: () => [],
      cancel: vi.fn(),
      result: vi.fn(),
    },
    documentService: UNUSED_DOCUMENT_SERVICE,
    artifactService: {},
    validatorService: UNUSED_VALIDATOR_SERVICE,
    learningService: learningService as never,
  });
}

describe('lesson distillation HTTP API', () => {
  it.each([
    ['on-demand', '/api/drafts/draft-1/distill'],
    ['session-end', '/api/drafts/draft-1/distill/end-session'],
  ] as const)('starts the %s trigger explicitly', async (trigger, url) => {
    const startDistillation = vi.fn().mockReturnValue({
      id: 'run-1',
      draftId: 'draft-1',
      trigger,
      state: 'queued',
      resumeKey: 'opaque-run-key',
    });
    const app = appWithLearning({
      list: vi.fn(),
      setNote: vi.fn(),
      recordValidatorAttempt: vi.fn(),
      startDistillation,
      listSessions: vi.fn(),
      getDistillationRun: vi.fn(),
      reconcileDistillation: vi.fn(),
      listLessons: vi.fn(),
    });

    const response = await app.inject({
      method: 'POST',
      url,
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(startDistillation).toHaveBeenCalledWith('draft-1', trigger);
    expect(response.json()).toMatchObject({
      state: 'queued',
      resumeKey: 'opaque-run-key',
    });
    await app.close();
  });

  it('returns persisted sessions and reconciles a run without another launch', async () => {
    const listSessions = vi.fn().mockReturnValue([{ id: 'session-1' }]);
    const reconcileDistillation = vi.fn().mockReturnValue({
      id: 'run-1',
      state: 'ingested',
    });
    const app = appWithLearning({
      list: vi.fn(),
      setNote: vi.fn(),
      recordValidatorAttempt: vi.fn(),
      startDistillation: vi.fn(),
      listSessions,
      getDistillationRun: vi.fn(),
      reconcileDistillation,
      listLessons: vi.fn(),
    });

    const sessions = await app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1/learning-sessions',
      headers: AUTH,
    });
    const run = await app.inject({
      method: 'POST',
      url: '/api/distillations/run-1/reconcile',
      headers: AUTH,
    });

    expect(sessions.statusCode).toBe(200);
    expect(sessions.json()).toEqual({ sessions: [{ id: 'session-1' }] });
    expect(run.statusCode).toBe(200);
    expect(reconcileDistillation).toHaveBeenCalledWith('run-1');
    await app.close();
  });
});

describe('lesson review HTTP API', () => {
  it('lists/details lessons and exposes explicit optimistic actions', async () => {
    const lesson = {
      id: 'lesson-1',
      draftId: 'draft-1',
      state: 'proposed',
      version: 1,
    };
    const learning = {
      list: vi.fn(),
      setNote: vi.fn(),
      recordValidatorAttempt: vi.fn(),
      listLessons: vi.fn().mockReturnValue([lesson]),
      getLesson: vi.fn().mockReturnValue(lesson),
      editLesson: vi.fn().mockReturnValue({ ...lesson, version: 2 }),
      approveLesson: vi.fn().mockReturnValue({
        ...lesson,
        state: 'approved',
        version: 2,
      }),
      rejectLesson: vi.fn().mockReturnValue({
        ...lesson,
        state: 'rejected',
        version: 2,
      }),
      retireLesson: vi.fn().mockReturnValue({
        ...lesson,
        state: 'retired',
        version: 2,
      }),
      supersedeLesson: vi.fn().mockReturnValue({
        ...lesson,
        state: 'approved',
        version: 2,
      }),
    };
    const app = appWithLearning(learning);

    const listed = await app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1/lessons',
      headers: AUTH,
    });
    const detailed = await app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1/lessons/lesson-1',
      headers: AUTH,
    });
    const edited = await app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1/lessons/lesson-1',
      headers: AUTH,
      payload: {
        expectedVersion: 1,
        reviewedMarkdown: 'Exact edit.',
      },
    });
    const approved = await app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/lessons/lesson-1/approve',
      headers: AUTH,
      payload: { expectedVersion: 1 },
    });

    expect(listed.json()).toEqual({ lessons: [lesson] });
    expect(detailed.json()).toEqual(lesson);
    expect(edited.statusCode).toBe(200);
    expect(approved.statusCode).toBe(200);
    expect(learning.editLesson).toHaveBeenCalledWith(
      'draft-1',
      'lesson-1',
      { expectedVersion: 1, reviewedMarkdown: 'Exact edit.' },
    );
    expect(learning.approveLesson).toHaveBeenCalledWith(
      'draft-1',
      'lesson-1',
      { expectedVersion: 1 },
    );
    await app.close();
  });

  it('advances and verifies reconciliation only through explicit actions', async () => {
    const markReconciliationAwaiting = vi.fn().mockReturnValue({
      resumeKey: 'opaque-1',
      state: 'awaiting-reconciliation',
    });
    const verifyReconciliation = vi.fn().mockReturnValue({
      id: 'lesson-1',
      state: 'applied',
    });
    const app = appWithLearning({
      list: vi.fn(),
      setNote: vi.fn(),
      recordValidatorAttempt: vi.fn(),
      markReconciliationAwaiting,
      verifyReconciliation,
    });

    const awaiting = await app.inject({
      method: 'POST',
      url: '/api/lesson-reconciliations/opaque-1/awaiting',
      headers: AUTH,
    });
    const verified = await app.inject({
      method: 'POST',
      url: '/api/lesson-reconciliations/opaque-1/verify',
      headers: AUTH,
      payload: { commit: 'abc123' },
    });

    expect(awaiting.statusCode).toBe(200);
    expect(verified.statusCode).toBe(200);
    expect(markReconciliationAwaiting).toHaveBeenCalledWith('opaque-1');
    expect(verifyReconciliation).toHaveBeenCalledWith(
      'opaque-1',
      'abc123',
    );
    await app.close();
  });

  it('accepts explicit existing-doctrine provenance for a reconcile no-op', async () => {
    const verifyExistingDoctrine = vi.fn().mockReturnValue({
      id: 'lesson-1',
      state: 'applied',
    });
    const app = appWithLearning({
      list: vi.fn(),
      setNote: vi.fn(),
      recordValidatorAttempt: vi.fn(),
      verifyExistingDoctrine,
    });
    const payload = {
      commit: 'abc123',
      path: 'whp-youtube/STEERING.md',
      anchor: 'lines:10-12',
      contentHash: 'sha256:doctrine',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/lesson-reconciliations/opaque-1/verify-existing',
      headers: AUTH,
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(verifyExistingDoctrine).toHaveBeenCalledWith(
      'opaque-1',
      payload,
    );
    await app.close();
  });

  it('refuses a reachable HEAD that did not reconcile doctrine and allows retry', async () => {
    const fixture = realReconciliationFixture();
    const head = git(fixture.repoRoot, ['rev-parse', 'HEAD']);

    const response = await verifyCommit(fixture, head);

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: expect.stringMatching(
        /reconciliation commit.+checked.+predates this lesson handoff/iu,
      ),
      code: 'reconciliation-verification-refused',
      recoverable: true,
      checked: {
        commit: head,
        repositoryRoot: fixture.repoRoot,
        changedPaths: ['episode.md'],
      },
    });
    expect(
      fixture.learningStore.getLesson('lesson-durable'),
    ).toMatchObject({ state: 'approved-pending-reconcile' });
    await fixture.app.close();
  });

  it('refuses a fabricated reconciliation commit as recoverable', async () => {
    const fixture = realReconciliationFixture();
    const fabricated = 'f'.repeat(40);

    const response = await verifyCommit(fixture, fabricated);

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: expect.stringMatching(
        /reconciliation commit.+checked.+does not exist/iu,
      ),
      code: 'reconciliation-verification-refused',
      recoverable: true,
      checked: {
        commit: fabricated,
        repositoryRoot: fixture.repoRoot,
        changedPaths: null,
      },
    });
    await fixture.app.close();
  });

  it('keeps an invalid repository HEAD on the unexpected-fault path', async () => {
    const fixture = realReconciliationFixture();
    const commit = git(fixture.repoRoot, ['rev-parse', 'HEAD']);
    git(fixture.repoRoot, [
      'symbolic-ref',
      'HEAD',
      'refs/heads/missing-head',
    ]);

    const response = await verifyCommit(fixture, commit);

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'internal server error' });
    await fixture.app.close();
  });

  it('refuses a reconciliation commit with no resolvable doctrine anchor', async () => {
    const fixture = realReconciliationFixture();
    writeFileSync(
      join(fixture.repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n- Retain the concrete reveal rule.\n'
        + 'Reconciliation: reconcile-resume-key\n',
    );
    rmSync(join(fixture.repoRoot, 'whp-youtube', 'STEERING.md'));
    git(fixture.repoRoot, [
      'add',
      '--',
      'DECISIONS.md',
      'whp-youtube/STEERING.md',
    ]);
    git(fixture.repoRoot, ['commit', '-m', 'delete doctrine without replacement']);
    const commit = git(fixture.repoRoot, ['rev-parse', 'HEAD']);

    const response = await verifyCommit(fixture, commit);

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: expect.stringMatching(
        /reconciliation commit.+reviewed candidate anchor.+not found/iu,
      ),
      code: 'reconciliation-verification-refused',
      recoverable: true,
      checked: {
        commit,
        repositoryRoot: fixture.repoRoot,
        changedPaths: [
          'DECISIONS.md',
          'whp-youtube/STEERING.md',
        ],
      },
    });
    await fixture.app.close();
  });

  it('verifies a real reconciliation commit that changes anchored doctrine', async () => {
    const fixture = realReconciliationFixture();
    writeFileSync(
      join(fixture.repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n- Keep every reveal concrete.\n'
        + 'Reconciliation: reconcile-resume-key\n',
    );
    writeFileSync(
      join(fixture.repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n\n## Reveals\n\nKeep every reveal concrete.\n',
    );
    git(fixture.repoRoot, [
      'add',
      '--',
      'DECISIONS.md',
      'whp-youtube/STEERING.md',
    ]);
    git(fixture.repoRoot, ['commit', '-m', 'reconcile durable lesson']);
    const commit = git(fixture.repoRoot, ['rev-parse', 'HEAD']);

    const response = await verifyCommit(fixture, commit);

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({
      id: 'lesson-durable',
      state: 'applied',
      reviewedMarkdown: null,
      repositoryCommit: commit,
      repositoryPath: 'whp-youtube/STEERING.md',
      repositoryAnchor: expect.stringMatching(/^lines:\d+-\d+$/u),
      reconciliation: {
        state: 'verified',
        repositoryCommit: commit,
        preparedMarkdown: '',
      },
      reconciliationHistory: [
        expect.objectContaining({
          state: 'verified',
          repositoryCommit: commit,
          preparedMarkdown: '',
        }),
      ],
    });
    await fixture.app.close();
  });
});

function realReconciliationFixture() {
  const root = mkdtempSync(join(tmpdir(), 'lessons-http-reconcile-'));
  roots.push(root);
  const repoRoot = join(root, 'repo');
  mkdirSync(join(repoRoot, 'whp-youtube'), { recursive: true });
  git(repoRoot, ['init', '--initial-branch=main']);
  git(repoRoot, ['config', 'user.name', 'Script Creator Tests']);
  git(repoRoot, [
    'config',
    'user.email',
    'script-creator-tests@example.invalid',
  ]);
  writeFileSync(join(repoRoot, 'episode.md'), 'Episode draft.\n');
  writeFileSync(join(repoRoot, 'DECISIONS.md'), '# Decisions\n');
  writeFileSync(
    join(repoRoot, 'whp-youtube', 'STEERING.md'),
    '# Steering\n',
  );
  git(repoRoot, ['add', '--', '.']);
  git(repoRoot, ['commit', '-m', 'seed repository']);
  writeFileSync(join(repoRoot, 'episode.md'), 'Current episode worktree HEAD.\n');
  git(repoRoot, ['add', '--', 'episode.md']);
  git(repoRoot, ['commit', '-m', 'episode work']);

  const dbFile = join(root, 'state.sqlite3');
  const documentStore = new DocumentStore(dbFile);
  const learningStore = new LearningStore(dbFile);
  const topicStore = new TopicStore(dbFile);
  documentStores.push(documentStore);
  learningStores.push(learningStore);
  topicStores.push(topicStore);
  documentStore.createDraft({
    id: 'draft-1',
    episodeSlug: 'episode-one',
    title: 'Episode One',
    format: 'narration',
    doc: {
      type: 'doc',
      attrs: { format: 'narration', preamble: 'Base' },
      content: [],
    },
    updatedAt: '2026-07-24T08:00:00.000Z',
  });
  let id = 0;
  const service = new LearningService({
    store: learningStore,
    documentStore,
    topicStore,
    operationEvidence: (operationId) => operationId === 'architecture-operation'
      ? {
          operationId,
          draftId: 'draft-1',
          operation: 'generate-architecture',
          state: 'completed',
          envelope: { inputs: { topic_brief: 'Brief.' } },
          result: { kind: 'raw', markdown: '# Architecture proposal\n' },
        }
      : null,
    repositoryRootForDraft: () => repoRoot,
    idFactory: () => `learning-${++id}`,
    resumeKeyFactory: () => 'reconcile-resume-key',
    now: () => '2026-07-24T09:00:00.000Z',
  });
  documentStore.createArchitectureProposal({
    draftId: 'draft-1',
    operationId: 'architecture-operation',
    state: 'pending',
    revisionId: null,
    reasonNote: null,
    createdAt: '2026-07-24T08:02:00.000Z',
    resolvedAt: null,
  });
  const decision = service.captureArchitectureRejection({
    draftId: 'draft-1',
    operationId: 'architecture-operation',
    reason: 'Too abstract.',
    resolvedAt: '2026-07-24T08:03:00.000Z',
  });
  learningStore.createLesson({
    id: 'lesson-durable',
    draftId: 'draft-1',
    distillationRunId: null,
    classification: 'durable',
    state: 'proposed',
    proposedMarkdown: 'Keep every reveal concrete.',
    reviewedMarkdown: 'Keep every reveal concrete.',
    rationaleMarkdown: 'The explicit rejection identified abstraction.',
    proposedTarget: 'whp-youtube/STEERING.md',
    supersedesLessonId: null,
    version: 1,
    repositoryCommit: null,
    repositoryPath: null,
    repositoryAnchor: null,
    repositoryContentHash: null,
    createdAt: '2026-07-24T08:05:00.000Z',
    updatedAt: '2026-07-24T08:05:00.000Z',
  }, [decision.id]);
  const lesson = service.approveLesson(
    'draft-1',
    'lesson-durable',
    { expectedVersion: 1 },
  );
  const resumeKey = lesson.reconciliation?.resumeKey;
  if (!resumeKey) throw new Error('reconciliation fixture was not prepared');
  service.markReconciliationAwaiting(resumeKey);
  const app = appWithLearning(
    service as unknown as Record<string, unknown>,
  );
  return { app, learningStore, repoRoot, resumeKey };
}

function git(repoRoot: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function verifyCommit(
  fixture: ReturnType<typeof realReconciliationFixture>,
  commit: string,
) {
  return fixture.app.inject({
    method: 'POST',
    url: `/api/lesson-reconciliations/${
      encodeURIComponent(fixture.resumeKey)
    }/verify`,
    headers: AUTH,
    payload: { commit },
  });
}
