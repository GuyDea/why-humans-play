import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentStore } from '../../src/documents/store.js';
import {
  encodeVariantPickedDisposition,
} from '../../src/learning/decisions.js';
import {
  LearningService,
  type LearningOperationService,
} from '../../src/learning/service.js';
import { LearningStore } from '../../src/learning/store.js';
import { TopicStore } from '../../src/topics/store.js';

const roots: string[] = [];
const documents: DocumentStore[] = [];
const learning: LearningStore[] = [];
const topics: TopicStore[] = [];

function setup(options: {
  operationService?: LearningOperationService;
  idFactory?: () => string;
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'learning-service-'));
  roots.push(root);
  const dbFile = join(root, 'state.sqlite3');
  const documentStore = new DocumentStore(dbFile);
  const learningStore = new LearningStore(dbFile);
  const topicStore = new TopicStore(dbFile);
  documents.push(documentStore);
  learning.push(learningStore);
  topics.push(topicStore);
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
    idFactory: options.idFactory ?? (() => `learning-${++id}`),
    now: () => '2026-07-24T09:00:00.000Z',
    operationEvidence: () => null,
    operationService: options.operationService,
  });
  return { documentStore, learningStore, topicStore, service };
}

afterEach(() => {
  for (const store of topics.splice(0)) store.close();
  for (const store of learning.splice(0)) store.close();
  for (const store of documents.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('LearningService', () => {
  it('captures only mapped explicit revisions and replays idempotently', () => {
    const { documentStore, service } = setup();
    const excluded = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: 'Autosaved' },
        content: [],
      },
      updatedAt: '2026-07-24T08:01:00.000Z',
      revision: {
        id: 'revision-autosave',
        opId: null,
        disposition: 'autosave',
        createdAt: '2026-07-24T08:01:00.000Z',
      },
    }).revision;
    const picked = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: 'Picked' },
        content: [],
      },
      updatedAt: '2026-07-24T08:02:00.000Z',
      revision: {
        id: 'revision-pick',
        opId: null,
        disposition: encodeVariantPickedDisposition('set-1', 'option-2'),
        createdAt: '2026-07-24T08:02:00.000Z',
      },
    }).revision;

    expect(service.captureRevision(excluded)).toBeNull();
    const first = service.captureRevision(picked);
    const replay = service.captureRevision(picked);

    expect(first).toMatchObject({
      kind: 'variant-picked',
      sourceType: 'revision',
      sourceId: 'revision-pick',
    });
    expect(replay).toEqual(first);
    expect(service.list('draft-1', { limit: 10 }).decisions).toHaveLength(1);
  });

  it('captures reject and reroll separately with exact optional notes and successor', () => {
    const { documentStore, service } = setup();
    documentStore.createNarrationProposal({
      draftId: 'draft-1',
      operationId: 'operation-reject',
      state: 'pending',
      createdAt: '2026-07-24T08:01:00.000Z',
      resolvedAt: null,
      reasonNote: null,
      successorOperationId: null,
    });
    documentStore.createNarrationProposal({
      draftId: 'draft-1',
      operationId: 'operation-reroll',
      state: 'pending',
      createdAt: '2026-07-24T08:02:00.000Z',
      resolvedAt: null,
      reasonNote: null,
      successorOperationId: null,
    });

    const rejected = service.captureProposalDisposition({
      draftId: 'draft-1',
      operationId: 'operation-reject',
      decision: 'rejected',
      reason: '  Too abstract.  ',
      successorOperationId: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    const rerolled = service.captureProposalDisposition({
      draftId: 'draft-1',
      operationId: 'operation-reroll',
      decision: 'rerolled',
      reason: null,
      successorOperationId: 'operation-child',
      resolvedAt: '2026-07-24T08:04:00.000Z',
    });

    expect(rejected).toMatchObject({
      kind: 'proposal-rejected',
      disposition: 'rejected',
      note: '  Too abstract.  ',
    });
    expect(rerolled).toMatchObject({
      kind: 'proposal-rerolled',
      disposition: 'rerolled',
      note: null,
    });
    expect(documentStore.getNarrationProposal(
      'draft-1',
      'operation-reroll',
    )).toMatchObject({
      state: 'rerolled',
      successorOperationId: 'operation-child',
    });
  });

  it('records an architecture rejection without inventing a content revision', () => {
    const { documentStore, service } = setup();

    const decision = service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });

    expect(decision).toMatchObject({
      kind: 'proposal-rejected',
      sourceType: 'architecture-proposal',
      sourceId: 'architecture-operation',
    });
    expect(documentStore.listRevisions('draft-1')).toEqual([]);
  });

  it('creates a validator-fix decision only for fail, persisted edit, new hash, then pass', () => {
    const { documentStore, service } = setup();
    expect(service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-a',
      ok: false,
      diagnostics: [{ code: 'bad-structure' }],
      createdAt: '2026-07-24T08:01:00.000Z',
    }).decision).toBeNull();
    expect(service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-a',
      ok: true,
      diagnostics: [],
      createdAt: '2026-07-24T08:02:00.000Z',
    }).decision).toBeNull();
    documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: 'Manual fix' },
        content: [],
      },
      updatedAt: '2026-07-24T08:03:00.000Z',
      revision: {
        id: 'revision-fix',
        opId: null,
        disposition: 'manual-save',
        createdAt: '2026-07-24T08:03:00.000Z',
      },
    });
    const passed = service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-b',
      ok: true,
      diagnostics: [],
      createdAt: '2026-07-24T08:04:00.000Z',
    });

    expect(passed.decision).toMatchObject({
      kind: 'validator-fix-cycle-accepted',
      disposition: 'validator-fix-cycle',
    });
    expect(service.list('draft-1', { limit: 10 }).decisions).toHaveLength(1);
  });

  it('paginates stably and edits notes without interpreting their text', () => {
    const { service } = setup();
    for (const [operationId, time] of [
      ['op-1', '2026-07-24T08:01:00.000Z'],
      ['op-2', '2026-07-24T08:02:00.000Z'],
      ['op-3', '2026-07-24T08:03:00.000Z'],
    ] as const) {
      service.captureArchitectureRejection({
        draftId: 'draft-1',
        operationId,
        reason: null,
        resolvedAt: time,
      });
    }

    const first = service.list('draft-1', { limit: 2 });
    const second = service.list('draft-1', {
      after: first.nextCursor!,
      limit: 2,
    });
    const annotated = service.setNote(
      'draft-1',
      first.decisions[0]!.id,
      '  verbatim \t note  ',
    );

    expect(first.decisions.map(({ context }) => context.source.id))
      .toEqual(['op-1', 'op-2']);
    expect(first.nextCursor).toBe(2);
    expect(second.decisions.map(({ context }) => context.source.id))
      .toEqual(['op-3']);
    expect(second.nextCursor).toBeNull();
    expect(annotated.note).toBe('  verbatim \t note  ');
  });

  it('freezes exact on-demand inputs and ingests a valid result only once', () => {
    const submissions: unknown[] = [];
    let result: ReturnType<LearningOperationService['result']> = {
      kind: 'pending',
    };
    const operations: LearningOperationService = {
      submit(operation, inputs) {
        expect(operation).toBe('distill');
        submissions.push(inputs);
        return 'operation-distill-1';
      },
      get: () => ({
        operation: 'distill',
        state: result.kind === 'pending' ? 'running' : 'completed',
      }),
      result: () => result,
    };
    const { service, learningStore } = setup({
      operationService: operations,
    });
    const decision = service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: 'Too abstract.',
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });

    const started = service.startDistillation('draft-1', 'on-demand');

    expect(started).toMatchObject({
      draftId: 'draft-1',
      trigger: 'on-demand',
      state: 'queued',
      operationId: 'operation-distill-1',
      resumeKey: expect.any(String),
    });
    expect(submissions).toEqual([{
      session: {
        id: started.sessionId,
        draft_id: 'draft-1',
        trigger: 'on-demand',
        decisions: [{
          ...service.list('draft-1').decisions[0],
          id: decision.id,
        }],
      },
      existing_lessons: [],
    }]);

    result = {
      kind: 'schema',
      guardrail: null,
      value: {
        status: 'complete',
        lessons: [{
          classification: 'episode-local',
          lesson_markdown: '  Keep this episode concrete.  ',
          rationale_markdown: '  Martin rejected abstraction.  ',
          evidence: [decision.id],
          proposed_target: null,
          supersedes_lesson_id: null,
        }],
        guardrail_markdown: null,
      },
    };
    const ingested = service.reconcileDistillation(started.id);
    const replay = service.reconcileDistillation(started.id);

    expect(ingested.state).toBe('ingested');
    expect(replay).toEqual(ingested);
    expect(learningStore.listLessons('draft-1')).toEqual([
      expect.objectContaining({
        classification: 'episode-local',
        state: 'proposed',
        proposedMarkdown: '  Keep this episode concrete.  ',
        reviewedMarkdown: '  Keep this episode concrete.  ',
        rationaleMarkdown: '  Martin rejected abstraction.  ',
      }),
    ]);
    expect(learningStore.listLessonEvidence(
      learningStore.listLessons('draft-1')[0]!.id,
    )).toEqual([decision.id]);
  });

  it('closes only session-end windows and returns a typed no-op for empties', () => {
    const submissions: unknown[] = [];
    const operations: LearningOperationService = {
      submit(_operation, inputs) {
        submissions.push(inputs);
        return `operation-${submissions.length}`;
      },
      get: () => ({ operation: 'distill', state: 'running' }),
      result: () => ({ kind: 'pending' }),
    };
    const { service } = setup({ operationService: operations });

    const empty = service.startDistillation('draft-1', 'on-demand');
    expect(empty).toMatchObject({
      state: 'no-op',
      operationId: null,
      decisions: [],
    });
    expect(submissions).toEqual([]);

    service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'first',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    const onDemand = service.startDistillation('draft-1', 'on-demand');
    expect(service.listSessions('draft-1')).toEqual([
      expect.objectContaining({
        id: onDemand.sessionId,
        endCursor: null,
        closedAt: null,
      }),
    ]);
    service.reconcileDistillation(onDemand.id);

    const ended = service.startDistillation('draft-1', 'session-end');
    expect(ended.sessionId).toBe(onDemand.sessionId);
    expect(service.listSessions('draft-1')[0]).toMatchObject({
      endCursor: 1,
      closedAt: expect.any(String),
    });

    service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'second',
      reason: null,
      resolvedAt: '2026-07-24T08:04:00.000Z',
    });
    const sessions = service.listSessions('draft-1');
    expect(sessions).toHaveLength(2);
    expect(sessions[1]).toMatchObject({
      startCursor: 1,
      endCursor: null,
    });
  });

  it('rejects malformed evidence without creating lessons', () => {
    let result: ReturnType<LearningOperationService['result']> = {
      kind: 'pending',
    };
    const operations: LearningOperationService = {
      submit: () => 'operation-distill-1',
      get: () => ({ operation: 'distill', state: 'completed' }),
      result: () => result,
    };
    const { service, learningStore } = setup({
      operationService: operations,
    });
    service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    const started = service.startDistillation('draft-1', 'on-demand');
    result = {
      kind: 'schema',
      guardrail: null,
      value: {
        status: 'complete',
        lessons: [{
          classification: 'durable',
          lesson_markdown: 'Prefer concrete openings.',
          rationale_markdown: 'The choice repeated.',
          evidence: ['not-frozen'],
          proposed_target: 'writing skill',
          supersedes_lesson_id: null,
        }],
        guardrail_markdown: null,
      },
    };

    expect(service.reconcileDistillation(started.id)).toMatchObject({
      state: 'failed',
      error: expect.stringMatching(/frozen decision/i),
    });
    expect(learningStore.listLessons('draft-1')).toEqual([]);
  });

  it('returns resolved evidence and preserves proposal text through review', () => {
    const { service, learningStore } = setup();
    const captured = service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: 'Too abstract.',
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    learningStore.createLesson({
      id: 'lesson-local',
      draftId: 'draft-1',
      distillationRunId: null,
      classification: 'episode-local',
      state: 'proposed',
      proposedMarkdown: 'Original agent proposal.',
      reviewedMarkdown: 'Original agent proposal.',
      rationaleMarkdown: 'The explicit rejection named abstraction.',
      proposedTarget: null,
      supersedesLessonId: null,
      version: 1,
      repositoryCommit: null,
      repositoryPath: null,
      repositoryAnchor: null,
      repositoryContentHash: null,
      createdAt: '2026-07-24T08:05:00.000Z',
      updatedAt: '2026-07-24T08:05:00.000Z',
    }, [captured.id]);

    const detail = service.getLesson('draft-1', 'lesson-local');
    expect(detail).toMatchObject({
      proposedMarkdown: 'Original agent proposal.',
      reviewedMarkdown: 'Original agent proposal.',
      evidenceIds: [captured.id],
      evidence: [{
        id: captured.id,
        status: 'resolved',
        decision: expect.objectContaining({ id: captured.id }),
      }],
      reconciliation: null,
    });

    const edited = service.editLesson('draft-1', 'lesson-local', {
      expectedVersion: 1,
      reviewedMarkdown: '  Martin reviewed this exact prose.  ',
    });
    expect(edited).toMatchObject({
      state: 'proposed',
      proposedMarkdown: 'Original agent proposal.',
      reviewedMarkdown: '  Martin reviewed this exact prose.  ',
      version: 2,
    });
    expect(service.approveLesson('draft-1', 'lesson-local', {
      expectedVersion: 2,
    })).toMatchObject({
      state: 'approved',
      reviewedMarkdown: '  Martin reviewed this exact prose.  ',
    });
    expect(service.retireLesson('draft-1', 'lesson-local', {
      expectedVersion: 3,
    })).toMatchObject({ state: 'retired' });
  });

  it('prepares durable reconciliation as a proposal and persists awaiting state', () => {
    const { service, learningStore } = setup();
    const captured = service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    learningStore.createLesson({
      id: 'lesson-durable',
      draftId: 'draft-1',
      distillationRunId: null,
      classification: 'durable',
      state: 'proposed',
      proposedMarkdown: 'Prefer concrete stakes.',
      reviewedMarkdown: 'Prefer concrete stakes over abstractions.',
      rationaleMarkdown: 'Martin explicitly rejected an abstract treatment.',
      proposedTarget: 'writing skill',
      supersedesLessonId: null,
      version: 1,
      repositoryCommit: null,
      repositoryPath: null,
      repositoryAnchor: null,
      repositoryContentHash: null,
      createdAt: '2026-07-24T08:05:00.000Z',
      updatedAt: '2026-07-24T08:05:00.000Z',
    }, [captured.id]);

    const approved = service.approveLesson(
      'draft-1',
      'lesson-durable',
      { expectedVersion: 1 },
    );

    expect(approved).toMatchObject({
      state: 'approved-pending-reconcile',
      reconciliation: {
        state: 'prepared',
        resumeKey: expect.any(String),
        preparedMarkdown: expect.stringContaining(
          'Prefer concrete stakes over abstractions.',
        ),
      },
    });
    expect(approved.reconciliation?.preparedMarkdown).toContain(
      '$reconcile-whp',
    );
    expect(approved.reconciliation?.preparedMarkdown).toContain(
      captured.id,
    );
    expect(approved.reconciliation?.preparedMarkdown).toContain(
      'Script Creator has not edited or committed doctrine',
    );
    const awaiting = service.markReconciliationAwaiting(
      approved.reconciliation!.resumeKey,
    );
    expect(awaiting).toMatchObject({
      state: 'awaiting-reconciliation',
      resumeKey: approved.reconciliation!.resumeKey,
    });

    const retry = service.approveLesson(
      'draft-1',
      'lesson-durable',
      { expectedVersion: 1 },
    );
    expect(retry.reconciliation?.id).toBe(approved.reconciliation?.id);
  });

  it('supplies only ordered active episode lessons and records the exact operation snapshot', () => {
    const { service, learningStore } = setup();
    const captured = service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    for (const [id, state, classification, text, createdAt] of [
      ['local-a', 'approved', 'episode-local', '  First exact lesson.  ', '2026-07-24T08:05:00.000Z'],
      ['local-b', 'approved', 'episode-local', 'Second exact lesson.', '2026-07-24T08:06:00.000Z'],
      ['local-retired', 'retired', 'episode-local', 'Retired.', '2026-07-24T08:07:00.000Z'],
      ['durable-applied', 'applied', 'durable', null, '2026-07-24T08:08:00.000Z'],
    ] as const) {
      learningStore.createLesson({
        id,
        draftId: 'draft-1',
        distillationRunId: null,
        classification,
        state,
        proposedMarkdown: text,
        reviewedMarkdown: text,
        rationaleMarkdown: 'Evidence.',
        proposedTarget: classification === 'durable' ? 'skill' : null,
        supersedesLessonId: null,
        version: 3,
        repositoryCommit: classification === 'durable' ? 'abc123' : null,
        repositoryPath: classification === 'durable'
          ? 'whp-youtube/STEERING.md'
          : null,
        repositoryAnchor: classification === 'durable' ? 'lines:1-1' : null,
        repositoryContentHash: classification === 'durable'
          ? 'sha256:stored'
          : null,
        createdAt,
        updatedAt: createdAt,
      }, [captured.id]);
    }

    const active = service.activeEpisodeLessons('draft-1');
    expect(active).toEqual([
      {
        id: 'local-a',
        version: 3,
        markdown: '  First exact lesson.  ',
        contentHash: expect.stringMatching(/^sha256:/u),
      },
      {
        id: 'local-b',
        version: 3,
        markdown: 'Second exact lesson.',
        contentHash: expect.stringMatching(/^sha256:/u),
      },
    ]);

    service.recordOperationLessons('operation-1', active);
    service.recordOperationLessons('operation-1', active);
    expect(service.operationLessons('operation-1')).toEqual([
      expect.objectContaining({
        operationId: 'operation-1',
        lessonId: 'local-a',
        lessonVersion: 3,
        contentHash: active[0]!.contentHash,
      }),
      expect.objectContaining({
        operationId: 'operation-1',
        lessonId: 'local-b',
        lessonVersion: 3,
        contentHash: active[1]!.contentHash,
      }),
    ]);

    expect(service.recoverOperationLessons('operation-recovered', {
      selection: 'Persisted envelope.',
      approved_lessons: active.map(({ markdown }) => markdown),
    })).toHaveLength(2);
    expect(service.recoverOperationLessons('operation-recovered', {
      approved_lessons: ['Forged or stale lesson.'],
    })).toHaveLength(2);
  });
});
