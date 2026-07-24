import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentStore } from '../../src/documents/store.js';
import {
  encodeVariantPickedDisposition,
} from '../../src/learning/decisions.js';
import { LearningService } from '../../src/learning/service.js';
import { LearningStore } from '../../src/learning/store.js';
import { TopicStore } from '../../src/topics/store.js';

const roots: string[] = [];
const documents: DocumentStore[] = [];
const learning: LearningStore[] = [];
const topics: TopicStore[] = [];

function setup() {
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
    idFactory: () => `learning-${++id}`,
    now: () => '2026-07-24T09:00:00.000Z',
    operationEvidence: () => null,
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
});
