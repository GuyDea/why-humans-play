import { describe, expect, it, vi } from 'vitest';
import { DaemonClientError, type LessonDetail } from '../api/client';
import { LessonsModel, type LessonsClient } from './model';

function lesson(
  overrides: Partial<LessonDetail> = {},
): LessonDetail {
  return {
    id: 'lesson-1',
    draftId: 'draft-1',
    distillationRunId: 'run-1',
    classification: 'episode-local',
    state: 'proposed',
    proposedMarkdown: 'Proposed lesson.',
    reviewedMarkdown: 'Proposed lesson.',
    rationaleMarkdown: 'The accepted rewrite exposed a repeatable choice.',
    proposedTarget: null,
    supersedesLessonId: null,
    version: 1,
    repositoryCommit: null,
    repositoryPath: null,
    repositoryAnchor: null,
    repositoryContentHash: null,
    createdAt: '2026-07-24T10:00:00.000Z',
    updatedAt: '2026-07-24T10:00:00.000Z',
    evidenceIds: ['decision-1'],
    evidence: [{
      id: 'decision-1',
      status: 'resolved',
      decision: {
        id: 'decision-1',
        draftId: 'draft-1',
        seq: 1,
        kind: 'proposal-accepted',
        disposition: 'accepted',
        sourceTimestamp: '2026-07-24T09:00:00.000Z',
        createdAt: '2026-07-24T09:00:00.000Z',
        note: null,
        context: {
          source: {
            type: 'revision',
            id: 'revision-1',
            disposition: 'accepted',
          },
        },
      },
    }],
    reconciliation: null,
    reconciliationHistory: [],
    currentMarkdown: 'Proposed lesson.',
    repositoryProvenance: null,
    ...overrides,
  };
}

function clientFixture(initial = lesson()): LessonsClient {
  return {
    list: vi.fn(async () => [{
      id: 'draft-1',
      episodeSlug: 'episode',
      title: 'Episode',
      format: 'narration',
      updatedAt: '2026-07-24T10:00:00.000Z',
    }]),
    listLearningSessions: vi.fn(async () => ({ sessions: [] })),
    listDecisions: vi.fn(async () => ({
      decisions: [],
      nextCursor: null,
    })),
    listLessons: vi.fn(async () => ({ lessons: [initial] })),
    distill: vi.fn(async (_draftId, trigger) => ({
      id: 'run-1',
      draftId: 'draft-1',
      sessionId: 'session-1',
      trigger,
      state: 'queued',
      operationId: 'op-1',
      resumeKey: 'opaque-key',
      guardrailMarkdown: null,
      error: null,
      createdAt: '2026-07-24T10:00:00.000Z',
      updatedAt: '2026-07-24T10:00:00.000Z',
      decisions: [],
      lessons: [],
    })),
    reconcileDistillation: vi.fn(),
    editLesson: vi.fn(async (_draftId, _lessonId, _version, markdown) =>
      lesson({ reviewedMarkdown: markdown, version: 2 })),
    approveLesson: vi.fn(async () =>
      lesson({ reviewedMarkdown: 'Reviewed lesson.', state: 'approved' })),
    rejectLesson: vi.fn(async () => lesson({ state: 'rejected' })),
    retireLesson: vi.fn(async () => lesson({ state: 'retired' })),
    supersedeLesson: vi.fn(async () =>
      lesson({ classification: 'durable', state: 'approved-pending-reconcile' })),
    markLessonReconciliationAwaiting: vi.fn(),
    verifyLessonReconciliation: vi.fn(),
  };
}

describe('LessonsModel', () => {
  it('loads a selected draft without launching distillation', async () => {
    const client = clientFixture();
    const model = new LessonsModel(client);

    await model.initialize();

    expect(model.selectedDraftId()).toBe('draft-1');
    expect(model.lessons()).toHaveLength(1);
    expect(client.distill).not.toHaveBeenCalled();
  });

  it('preserves proposal state when Martin edits before approval', async () => {
    const client = clientFixture();
    const model = new LessonsModel(client);
    await model.initialize();

    await model.editLesson(model.lessons()[0]!, 'Reviewed lesson.');

    expect(model.lessons()[0]).toMatchObject({
      proposedMarkdown: 'Proposed lesson.',
      reviewedMarkdown: 'Reviewed lesson.',
      state: 'proposed',
      version: 2,
    });
    expect(client.approveLesson).not.toHaveBeenCalled();
  });

  it('reloads authoritative lessons after an optimistic conflict', async () => {
    const current = lesson({ version: 3, reviewedMarkdown: 'Someone else edited.' });
    const client = clientFixture();
    vi.mocked(client.editLesson).mockRejectedValueOnce(
      new DaemonClientError(409, { error: 'lesson edit conflict: lesson-1' }),
    );
    vi.mocked(client.listLessons).mockResolvedValueOnce({
      lessons: [lesson()],
    }).mockResolvedValueOnce({ lessons: [current] });
    const model = new LessonsModel(client);
    await model.initialize();

    await model.editLesson(model.lessons()[0]!, 'My stale edit.');

    expect(model.lessons()[0]).toEqual(current);
    expect(model.error()).toContain('changed elsewhere');
  });

  it('starts only the explicitly requested decision window', async () => {
    const client = clientFixture();
    const model = new LessonsModel(client);
    await model.initialize();

    await model.distill('session-end');

    expect(client.distill).toHaveBeenCalledWith('draft-1', 'session-end');
    expect(model.distillation()?.operationId).toBe('op-1');
    expect(model.distillationStatus()).toContain('queued');
  });
});
