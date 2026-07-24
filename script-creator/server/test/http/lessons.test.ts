import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentStore } from '../../src/documents/store.js';
import { buildApp } from '../../src/http/app.js';
import { JobStore } from '../../src/job-store.js';
import { LearningService } from '../../src/learning/service.js';
import { LearningStore } from '../../src/learning/store.js';
import { OperationService } from '../../src/operations/service.js';
import { verifyReconciliationCommit } from '../../src/repo/git.js';
import type { JobSupervisor } from '../../src/supervisor.js';
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
const jobStores: JobStore[] = [];
const operationServices: OperationService[] = [];

afterEach(() => {
  for (const service of operationServices.splice(0)) service.dispose();
  for (const store of jobStores.splice(0)) store.close();
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

  it.each([
    {
      label: 'unedited',
      proposed: 'Keep every verified reveal concrete.',
      reviewed: 'Keep every verified reveal concrete.',
    },
    {
      label: 'edited',
      proposed: 'Keep every proposed reveal concrete.',
      reviewed: 'Keep every reviewed reveal concrete.',
    },
  ])(
    'removes all $label durable-candidate bytes from app storage after verification',
    async ({ proposed, reviewed }) => {
      const fixture = storedCandidateReconciliationFixture({
        proposed,
        reviewed,
      });
      writeFileSync(
        join(fixture.repoRoot, 'DECISIONS.md'),
        '# Decisions\n\n'
          + `- ${reviewed}\n`
          + `Reconciliation: ${fixture.resumeKey}\n`,
      );
      writeFileSync(
        join(fixture.repoRoot, 'whp-youtube', 'STEERING.md'),
        `# Steering\n\n## Reveals\n\n${reviewed}\n`,
      );
      git(fixture.repoRoot, [
        'add',
        '--',
        'DECISIONS.md',
        'whp-youtube/STEERING.md',
      ]);
      git(fixture.repoRoot, ['commit', '-m', 'reconcile stored candidate']);
      const commit = git(fixture.repoRoot, ['rev-parse', 'HEAD']);

      const verified = await fixture.app.inject({
        method: 'POST',
        url: `/api/lesson-reconciliations/${
          encodeURIComponent(fixture.resumeKey)
        }/verify`,
        headers: AUTH,
        payload: { commit },
      });

      expect(verified.statusCode, verified.body).toBe(200);
      const run = fixture.learningStore.getDistillationRun('run-1');
      const lesson = fixture.learningStore.getLesson('lesson-durable');
      const reconciliations =
        fixture.learningStore.listLessonReconciliations('lesson-durable');
      const databaseTables = readDatabaseTables(fixture.dbFile);
      const artifactFiles = fixture.jobDirs.flatMap((jobDir) =>
        readdirSync(jobDir)
          .map((name) => readFileSync(join(jobDir, name), 'utf8'))
      );
      const apiUrls = [
        '/api/distillations/run-1',
        '/api/distillations/run-later',
        '/api/drafts/draft-1/learning-sessions',
        '/api/drafts/draft-1/decisions',
        '/api/ops',
        '/api/ops/distill-operation',
        '/api/ops/distill-operation/result',
        '/api/ops/later-distill-operation',
        '/api/ops/later-distill-operation/result',
      ];
      const apiResponses = await Promise.all(apiUrls.map((url) =>
        fixture.app.inject({
          method: 'GET',
          url,
          headers: AUTH,
        })));
      for (const response of apiResponses) {
        expect(response.statusCode, response.body).toBe(200);
      }
      const result = apiResponses[6]!;
      const appStorage = JSON.stringify({
        run,
        lesson,
        reconciliations,
        databaseTables,
        artifactFiles,
        apiSurfaces: apiResponses.map((response) => response.json()),
      });
      for (const doctrineBytes of new Set([proposed, reviewed])) {
        expect(appStorage).not.toContain(doctrineBytes);
      }
      expect(result.json()).toMatchObject({
        kind: 'schema',
        value: {
          lessons: [{
            lesson_markdown: {
              kind: 'repository-reference',
              lesson_id: 'lesson-durable',
              repository_provenance: {
                commit,
                path: 'whp-youtube/STEERING.md',
                anchor: expect.stringMatching(/^lines:\d+-\d+$/u),
                content_hash: expect.stringMatching(/^sha256:/u),
              },
              source_provenance: {
                distillation_run_id: 'run-1',
                operation_id: 'distill-operation',
              },
            },
          }],
        },
      });
      await fixture.app.close();
    },
  );

  it('resumes a persisted verified redaction after service restart', async () => {
    const candidate = 'Keep every restarted reveal concrete.';
    const fixture = storedCandidateReconciliationFixture({
      proposed: candidate,
      reviewed: candidate,
    });
    persistVerifiedCandidateWithoutRedaction(
      fixture,
      candidate,
      'persist pending redaction',
    );

    expect(fixture.learningStore.getLesson('lesson-durable')).toMatchObject({
      state: 'applied',
      proposedMarkdown: null,
      reviewedMarkdown: null,
    });
    expect(fixture.learningStore.getReconciliationByResumeKey(
      fixture.resumeKey,
    )).toMatchObject({
      state: 'verified',
      redaction: {
        state: 'pending',
        targets: [
          {
            runId: 'run-1',
            operationId: 'distill-operation',
          },
          {
            runId: 'run-later',
            operationId: 'later-distill-operation',
          },
        ],
      },
    });
    expect(JSON.stringify(operationArtifactSnapshot(fixture))).toContain(
      candidate,
    );

    const restarted = fixture.recreateLearningService();
    restarted.service.recoverPendingRedactions();

    expect(restarted.learningStore.getReconciliationByResumeKey(
      fixture.resumeKey,
    )).toMatchObject({
      state: 'verified',
      redaction: {
        state: 'done',
        targets: [
          {
            runId: 'run-1',
            operationId: 'distill-operation',
          },
          {
            runId: 'run-later',
            operationId: 'later-distill-operation',
          },
        ],
      },
    });
    const storage = JSON.stringify({
      databaseTables: readDatabaseTables(fixture.dbFile),
      artifacts: operationArtifactSnapshot({
        jobDirs: fixture.jobDirs,
        jobStore: restarted.jobStore,
      }),
    });
    expect(storage).not.toContain(candidate);
    await fixture.app.close();
  });

  it('resumes a persisted pending redaction on verification retry', async () => {
    const candidate = 'Keep every retried reveal concrete.';
    const fixture = storedCandidateReconciliationFixture({
      proposed: candidate,
      reviewed: candidate,
    });
    const commit = persistVerifiedCandidateWithoutRedaction(
      fixture,
      candidate,
      'retry pending redaction',
    );

    const retried = await verifyCommit(fixture, commit);

    expect(retried.statusCode, retried.body).toBe(200);
    expect(retried.json()).toMatchObject({
      state: 'applied',
      reconciliation: {
        state: 'verified',
        redaction: {
          state: 'done',
          targets: [
            {
              runId: 'run-1',
              operationId: 'distill-operation',
            },
            {
              runId: 'run-later',
              operationId: 'later-distill-operation',
            },
          ],
        },
      },
    });
    const storage = JSON.stringify({
      databaseTables: readDatabaseTables(fixture.dbFile),
      artifacts: operationArtifactSnapshot(fixture),
    });
    expect(storage).not.toContain(candidate);
    await fixture.app.close();
  });

  it('refuses a valid commit while prepared without touching operation artifacts', async () => {
    const candidate = 'Keep every prepared reveal concrete.';
    const fixture = storedCandidateReconciliationFixture({
      proposed: candidate,
      reviewed: candidate,
      markAwaiting: false,
    });
    const before = operationArtifactSnapshot(fixture);
    writeFileSync(
      join(fixture.repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n'
        + `- ${candidate}\n`
        + `Reconciliation: ${fixture.resumeKey}\n`,
    );
    writeFileSync(
      join(fixture.repoRoot, 'whp-youtube', 'STEERING.md'),
      `# Steering\n\n## Reveals\n\n${candidate}\n`,
    );
    git(fixture.repoRoot, [
      'add',
      '--',
      'DECISIONS.md',
      'whp-youtube/STEERING.md',
    ]);
    git(fixture.repoRoot, ['commit', '-m', 'prepare premature verification']);
    const commit = git(fixture.repoRoot, ['rev-parse', 'HEAD']);

    const response = await verifyCommit(fixture, commit);

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toMatch(
      /reconciliation verification conflict/iu,
    );
    expect(operationArtifactSnapshot(fixture)).toEqual(before);
    expect(fixture.learningStore.getLesson('lesson-durable')).toMatchObject({
      state: 'approved-pending-reconcile',
      proposedMarkdown: candidate,
      reviewedMarkdown: candidate,
    });
    expect(fixture.learningStore.getReconciliationByResumeKey(
      fixture.resumeKey,
    )).toMatchObject({ state: 'prepared' });
    await fixture.app.close();
  });

  it('reverts the learning transition when artifact redaction fails afterward', async () => {
    const candidate = 'Keep every rollback reveal concrete.';
    const fixture = storedCandidateReconciliationFixture({
      proposed: candidate,
      reviewed: candidate,
      failRedactionAfterTransition: true,
    });
    const before = operationArtifactSnapshot(fixture);
    writeFileSync(
      join(fixture.repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n'
        + `- ${candidate}\n`
        + `Reconciliation: ${fixture.resumeKey}\n`,
    );
    writeFileSync(
      join(fixture.repoRoot, 'whp-youtube', 'STEERING.md'),
      `# Steering\n\n## Reveals\n\n${candidate}\n`,
    );
    git(fixture.repoRoot, [
      'add',
      '--',
      'DECISIONS.md',
      'whp-youtube/STEERING.md',
    ]);
    git(fixture.repoRoot, ['commit', '-m', 'force redaction rollback']);
    const commit = git(fixture.repoRoot, ['rev-parse', 'HEAD']);

    const response = await verifyCommit(fixture, commit);

    expect(response.statusCode).toBe(500);
    expect(fixture.redactionStateObserved()).toEqual({
      lessonState: 'applied',
      reconciliationState: 'verified',
    });
    expect(operationArtifactSnapshot(fixture)).toEqual(before);
    expect(fixture.learningStore.getLesson('lesson-durable')).toMatchObject({
      state: 'approved-pending-reconcile',
      proposedMarkdown: candidate,
      reviewedMarkdown: candidate,
      repositoryCommit: null,
    });
    expect(fixture.learningStore.getReconciliationByResumeKey(
      fixture.resumeKey,
    )).toMatchObject({
      state: 'awaiting-reconciliation',
      preparedMarkdown: expect.stringContaining(candidate),
      repositoryCommit: null,
      verifiedAt: null,
    });
    expect(JSON.stringify(
      fixture.learningStore.getDistillationRun('run-1'),
    )).toContain(candidate);
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

function storedCandidateReconciliationFixture(input: {
  proposed: string;
  reviewed: string;
  markAwaiting?: boolean;
  failRedactionAfterTransition?: boolean;
}) {
  const root = mkdtempSync(join(tmpdir(), 'lessons-stored-candidate-'));
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
  const jobStore = new JobStore(dbFile);
  jobStores.push(jobStore);
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

  const jobDir = join(root, 'jobs', 'distill-job');
  mkdirSync(jobDir, { recursive: true });
  const prompt = `$writing-whp-youtube-scripts\nOperation: Distill session lessons\nInputs: ${
    JSON.stringify({
      session: {
        id: 'session-1',
        draft_id: 'draft-1',
        decisions: [{
          id: 'decision-1',
          lesson_markdown: input.proposed,
          reviewed_candidate: input.reviewed,
        }],
      },
      existing_lessons: [],
    })
  }`;
  const envelope = {
    jobId: 'distill-job',
    prompt,
    cwd: repoRoot,
    sandbox: 'read-only' as const,
  };
  const result = {
    status: 'complete',
    lessons: [{
      classification: 'durable',
      lesson_markdown: input.proposed,
      rationale_markdown:
        `The reviewed candidate was ${input.reviewed}`,
      evidence: ['decision-1'],
      proposed_target: 'whp-youtube/STEERING.md',
      supersedes_lesson_id: null,
    }],
    guardrail_markdown:
      `Guardrail repeats ${input.proposed} and ${input.reviewed}`,
  };
  writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(envelope));
  writeFileSync(join(jobDir, 'final-message.txt'), JSON.stringify(result));
  writeFileSync(
    join(jobDir, 'events.jsonl'),
    JSON.stringify({
      type: 'item.completed',
      item: { type: 'agent_message', text: JSON.stringify(result) },
    }),
  );
  writeFileSync(
    join(jobDir, 'result-storage.json'),
    JSON.stringify({ proposed: input.proposed, reviewed: input.reviewed }),
  );
  jobStore.createOperationWithJob({
    id: 'distill-operation',
    name: 'distill',
    draftId: 'draft-1',
    deadlineAt: '2026-07-24T10:00:00.000Z',
    createdAt: '2026-07-24T08:01:00.000Z',
  }, envelope, jobDir);
  jobStore.setState('distill-job', 'completed');
  const operationService = new OperationService({
    supervisor: {
      events: () => [],
      cancel: () => undefined,
    } as unknown as JobSupervisor,
    store: jobStore,
  });
  operationServices.push(operationService);

  learningStore.captureDecision({
    id: 'decision-1',
    draftId: 'draft-1',
    seq: 1,
    kind: 'proposal-rejected',
    sourceType: 'architecture-proposal',
    sourceId: 'architecture-operation',
    disposition: 'rejected',
    sourceTimestamp: '2026-07-24T08:00:30.000Z',
    createdAt: '2026-07-24T08:00:30.000Z',
    note: null,
  });
  learningStore.createDistillationRun({
    id: 'run-1',
    draftId: 'draft-1',
    sessionId: 'session-1',
    trigger: 'on-demand',
    state: 'completed',
    operationId: 'distill-operation',
    resumeKey: 'distill-resume',
    guardrailMarkdown: result.guardrail_markdown,
    error: null,
    createdAt: '2026-07-24T08:01:00.000Z',
    updatedAt: '2026-07-24T08:02:00.000Z',
    decisions: [{
      decisionId: 'decision-1',
      snapshot: {
        id: 'decision-1',
        rationale:
          `Frozen decision repeats ${input.proposed} and ${input.reviewed}`,
      },
    }],
    lessons: [],
  });
  learningStore.ingestDistillationRun('run-1', [{
    record: {
      id: 'lesson-durable',
      draftId: 'draft-1',
      distillationRunId: 'run-1',
      classification: 'durable',
      state: 'proposed',
      proposedMarkdown: input.proposed,
      reviewedMarkdown: input.proposed,
      rationaleMarkdown:
        `The source operation proposed ${input.proposed} and review kept ${
          input.reviewed
        }.`,
      proposedTarget: 'whp-youtube/STEERING.md',
      supersedesLessonId: null,
      version: 1,
      repositoryCommit: null,
      repositoryPath: null,
      repositoryAnchor: null,
      repositoryContentHash: null,
      createdAt: '2026-07-24T08:02:00.000Z',
      updatedAt: '2026-07-24T08:02:00.000Z',
    },
    evidenceIds: [],
  }], result.guardrail_markdown, '2026-07-24T08:02:00.000Z');
  const snapshots = new Database(dbFile);
  snapshots.prepare(
    `INSERT INTO distillation_run_lessons (
      run_id, lesson_id, ordinal, snapshot_json
    ) VALUES (?, ?, ?, ?)`,
  ).run(
    'run-1',
    'lesson-durable',
    0,
    JSON.stringify({
      id: 'lesson-durable',
      classification: 'durable',
      state: 'proposed',
      lesson_markdown: input.proposed,
    }),
  );
  snapshots.close();

  const laterJobDir = join(root, 'jobs', 'later-distill-job');
  mkdirSync(laterJobDir, { recursive: true });
  const laterPrompt =
    `$writing-whp-youtube-scripts\nOperation: Distill session lessons\nInputs: ${
      JSON.stringify({
        session: {
          id: 'session-1',
          draft_id: 'draft-1',
          decisions: [{
            id: 'decision-1',
            candidate_echo: input.reviewed,
          }],
        },
        existing_lessons: [{
          id: 'lesson-durable',
          classification: 'durable',
          state: 'proposed',
          lesson_markdown: input.reviewed,
          rationale_markdown: `Later frozen rationale repeats ${input.reviewed}`,
        }],
      })
    }`;
  const laterEnvelope = {
    jobId: 'later-distill-job',
    prompt: laterPrompt,
    cwd: repoRoot,
    sandbox: 'read-only' as const,
  };
  const laterResult = {
    status: 'complete',
    lessons: [],
    guardrail_markdown: `Later guardrail repeats ${input.reviewed}`,
  };
  writeFileSync(
    join(laterJobDir, 'envelope.json'),
    JSON.stringify(laterEnvelope),
  );
  writeFileSync(
    join(laterJobDir, 'final-message.txt'),
    JSON.stringify(laterResult),
  );
  writeFileSync(
    join(laterJobDir, 'events.jsonl'),
    JSON.stringify({
      type: 'item.completed',
      item: { type: 'agent_message', text: JSON.stringify(laterResult) },
    }),
  );
  writeFileSync(
    join(laterJobDir, 'result-storage.json'),
    JSON.stringify({ laterCandidate: input.reviewed }),
  );
  jobStore.createOperationWithJob({
    id: 'later-distill-operation',
    name: 'distill',
    draftId: 'draft-1',
    deadlineAt: '2026-07-24T10:30:00.000Z',
    createdAt: '2026-07-24T08:03:00.000Z',
  }, laterEnvelope, laterJobDir);
  jobStore.setState('later-distill-job', 'completed');
  learningStore.createDistillationRun({
    id: 'run-later',
    draftId: 'draft-1',
    sessionId: 'session-1',
    trigger: 'on-demand',
    state: 'completed',
    operationId: 'later-distill-operation',
    resumeKey: 'later-distill-resume',
    guardrailMarkdown: laterResult.guardrail_markdown,
    error: null,
    createdAt: '2026-07-24T08:03:00.000Z',
    updatedAt: '2026-07-24T08:04:00.000Z',
    decisions: [{
      decisionId: 'decision-1',
      snapshot: {
        id: 'decision-1',
        candidateEcho: input.reviewed,
      },
    }],
    lessons: [{
      lessonId: 'lesson-durable',
      snapshot: {
        id: 'lesson-durable',
        classification: 'durable',
        state: 'proposed',
        lesson_markdown: input.reviewed,
        rationale_markdown:
          `Later frozen lesson repeats ${input.reviewed}`,
      },
    }],
  });

  const service = new LearningService({
    store: learningStore,
    documentStore,
    topicStore,
    operationService,
    operationEvidence: (operationId) => {
      if (
        operationId !== 'distill-operation'
        && operationId !== 'later-distill-operation'
      ) return null;
      const operation = operationService.get(operationId);
      return {
        operationId,
        draftId: operation.draftId,
        operation: operation.operation,
        state: operation.state,
        envelope: jobStore.operationEnvelope(operationId),
        inputs: operationService.inputs(operationId),
        result: operationService.result(operationId),
      };
    },
    repositoryRootForDraft: () => repoRoot,
    idFactory: () => 'reconcile-1',
    resumeKeyFactory: () => 'stored-candidate-resume-key',
    now: () => '2026-07-24T09:00:00.000Z',
  });
  let redactionStateObserved: {
    lessonState: string | undefined;
    reconciliationState: string | undefined;
  } | null = null;
  if (input.failRedactionAfterTransition === true) {
    vi.spyOn(operationService, 'redactAppliedDurableLesson')
      .mockImplementation(() => {
        redactionStateObserved = {
          lessonState:
            learningStore.getLesson('lesson-durable')?.state,
          reconciliationState:
            learningStore.getReconciliationByResumeKey(
              'stored-candidate-resume-key',
            )?.state,
        };
        throw new Error('forced artifact redaction failure');
      });
  }
  if (input.reviewed !== input.proposed) {
    service.editLesson('draft-1', 'lesson-durable', {
      expectedVersion: 1,
      reviewedMarkdown: input.reviewed,
    });
  }
  const approved = service.approveLesson('draft-1', 'lesson-durable', {
    expectedVersion: input.reviewed === input.proposed ? 1 : 2,
  });
  const resumeKey = approved.reconciliation?.resumeKey;
  if (!resumeKey) throw new Error('reconciliation fixture was not prepared');
  if (input.markAwaiting !== false) {
    service.markReconciliationAwaiting(resumeKey);
  }
  const app = buildApp({
    nonce: NONCE,
    operationService,
    documentService: UNUSED_DOCUMENT_SERVICE,
    artifactService: {},
    validatorService: UNUSED_VALIDATOR_SERVICE,
    learningService: service,
  });
  return {
    app,
    dbFile,
    jobDirs: [jobDir, laterJobDir],
    jobStore,
    learningStore,
    repoRoot,
    recreateLearningService: () => {
      const restartedJobStore = new JobStore(dbFile);
      const restartedDocumentStore = new DocumentStore(dbFile);
      const restartedLearningStore = new LearningStore(dbFile);
      const restartedTopicStore = new TopicStore(dbFile);
      jobStores.push(restartedJobStore);
      documentStores.push(restartedDocumentStore);
      learningStores.push(restartedLearningStore);
      topicStores.push(restartedTopicStore);
      const restartedOperationService = new OperationService({
        supervisor: {
          events: () => [],
          cancel: () => undefined,
        } as unknown as JobSupervisor,
        store: restartedJobStore,
      });
      operationServices.push(restartedOperationService);
      return {
        jobStore: restartedJobStore,
        learningStore: restartedLearningStore,
        service: new LearningService({
          store: restartedLearningStore,
          documentStore: restartedDocumentStore,
          topicStore: restartedTopicStore,
          operationService: restartedOperationService,
          operationEvidence: (operationId) => {
            const operation = restartedOperationService.get(operationId);
            return {
              operationId,
              draftId: operation.draftId,
              operation: operation.operation,
              state: operation.state,
              envelope: restartedJobStore.operationEnvelope(operationId),
              inputs: restartedOperationService.inputs(operationId),
              result: restartedOperationService.result(operationId),
            };
          },
          repositoryRootForDraft: () => repoRoot,
          now: () => '2026-07-24T09:02:00.000Z',
        }),
      };
    },
    redactionStateObserved: () => redactionStateObserved,
    resumeKey,
  };
}

function operationArtifactSnapshot(
  fixture: Pick<
    ReturnType<typeof storedCandidateReconciliationFixture>,
    'jobDirs' | 'jobStore'
  >,
) {
  return {
    envelopes: fixture.jobStore.operationAttempts('distill-operation')
      .concat(fixture.jobStore.operationAttempts('later-distill-operation'))
      .map(({ envelopeJson }) => envelopeJson),
    files: fixture.jobDirs.flatMap((jobDir) =>
      readdirSync(jobDir)
        .sort()
        .map((name) => ({
          name,
          content: readFileSync(join(jobDir, name), 'utf8'),
        }))
    ),
  };
}

function readDatabaseTables(dbFile: string): Record<string, unknown[]> {
  const database = new Database(dbFile, { readonly: true });
  try {
    const tables = database.prepare<[], { name: string }>(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    ).all();
    return Object.fromEntries(tables.map(({ name }) => [
      name,
      database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all(),
    ]));
  } finally {
    database.close();
  }
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

function persistVerifiedCandidateWithoutRedaction(
  fixture: ReturnType<typeof storedCandidateReconciliationFixture>,
  candidate: string,
  message: string,
): string {
  writeFileSync(
    join(fixture.repoRoot, 'DECISIONS.md'),
    '# Decisions\n\n'
      + `- ${candidate}\n`
      + `Reconciliation: ${fixture.resumeKey}\n`,
  );
  writeFileSync(
    join(fixture.repoRoot, 'whp-youtube', 'STEERING.md'),
    `# Steering\n\n## Reveals\n\n${candidate}\n`,
  );
  git(fixture.repoRoot, [
    'add',
    '--',
    'DECISIONS.md',
    'whp-youtube/STEERING.md',
  ]);
  git(fixture.repoRoot, ['commit', '-m', message]);
  const commit = git(fixture.repoRoot, ['rev-parse', 'HEAD']);
  const verified = verifyReconciliationCommit(fixture.repoRoot, commit);
  const pointer = verified.doctrinePointers[0]!;
  fixture.learningStore.verifyReconciliation(fixture.resumeKey, {
    repositoryCommit: verified.commit,
    reconciliationTokens: verified.reconciliationTokens,
    paths: verified.changedPaths,
    anchors: [pointer.anchor],
    contentHashes: [pointer.contentHash],
    repositoryPath: pointer.path,
    repositoryAnchor: pointer.anchor,
    repositoryContentHash: pointer.contentHash,
    updatedAt: '2026-07-24T09:01:00.000Z',
  });
  return commit;
}
