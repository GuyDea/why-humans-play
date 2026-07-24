import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/http/app.js';
import {
  UNUSED_DOCUMENT_SERVICE,
  UNUSED_VALIDATOR_SERVICE,
} from './stubs.js';

const NONCE = 'lessons-test-nonce';
const AUTH = { 'x-sc-nonce': NONCE };

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
});
