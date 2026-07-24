import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentStore } from '../../src/documents/store.js';
import {
  DecisionProjector,
  decisionKindForRevisionDisposition,
  decodeVariantPickedDisposition,
  encodeVariantPickedDisposition,
} from '../../src/learning/decisions.js';
import { LearningStore } from '../../src/learning/store.js';
import { TopicStore } from '../../src/topics/store.js';

const roots: string[] = [];
const documents: DocumentStore[] = [];
const learning: LearningStore[] = [];
const topics: TopicStore[] = [];

function databaseFile(): string {
  const root = mkdtempSync(join(tmpdir(), 'learning-decisions-'));
  roots.push(root);
  return join(root, 'state.sqlite3');
}

function stores() {
  const dbFile = databaseFile();
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
  return { documentStore, learningStore, topicStore };
}

afterEach(() => {
  for (const store of topics.splice(0)) store.close();
  for (const store of learning.splice(0)) store.close();
  for (const store of documents.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('mechanical decision projection', () => {
  it.each([
    ['episode-generation-accepted', 'proposal-accepted'],
    ['architecture-proposal-accepted', 'proposal-accepted'],
    ['architecture-proposals-accepted', 'proposal-accepted'],
    ['selection-proposal-accepted', 'proposal-accepted'],
    ['personal-input-proposal-accepted', 'personal-input-integrated'],
    ['architecture-approved', 'gate-action'],
    ['architecture-reopened', 'gate-action'],
    ['narration-reconciled', 'gate-action'],
    ['narration-approved', 'gate-action'],
  ] as const)('counts %s as %s', (disposition, kind) => {
    expect(decisionKindForRevisionDisposition(disposition)).toBe(kind);
  });

  it.each([
    'manual-save',
    'autosave',
    'restore',
    'operation-completed',
    'operation-cancelled',
    'validator-passed',
    'milestone-committed',
    'proposal-previewed',
    'proposal-panel-closed',
    'fresh-unrelated-operation',
    'variant-previewed',
    'variant-compared',
    'parking-lot-opened',
    'agent-praised',
    'survives-honestly',
    'package-directions-generated',
    'provisional-winner-named',
    'personal-input-submitted',
    'personal-input-previewed',
    'fix-proposal-rejected',
    'unknown-future-disposition',
  ])('refuses the excluded %s disposition', (disposition) => {
    expect(decisionKindForRevisionDisposition(disposition)).toBeNull();
  });

  it('uses a reversible fixed codec for variant picks', () => {
    const disposition = encodeVariantPickedDisposition(
      'opening set/α',
      'alternative:2',
    );

    expect(disposition).toBe(
      'variant-picked/opening%20set%2F%CE%B1/alternative%3A2',
    );
    expect(decodeVariantPickedDisposition(disposition)).toEqual({
      variantSetId: 'opening set/α',
      alternativeId: 'alternative:2',
    });
    expect(decisionKindForRevisionDisposition(disposition))
      .toBe('variant-picked');
  });

  it('resolves exact operation, revision, and before/after context without local transport paths', () => {
    const { documentStore, learningStore, topicStore } = stores();
    documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: 'Before' },
        content: [{
          type: 'beat',
          attrs: {
            beatId: 'opening',
            title: 'Opening',
            timeTargetMs: 30_000,
          },
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Before' }],
          }],
        }],
      },
      updatedAt: '2026-07-24T08:01:00.000Z',
      revision: {
        id: 'revision-before',
        opId: null,
        disposition: 'manual-save',
        createdAt: '2026-07-24T08:01:00.000Z',
      },
    });
    const accepted = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: 'After' },
        content: [{
          type: 'beat',
          attrs: {
            beatId: 'opening',
            title: 'Opening',
            timeTargetMs: 30_000,
          },
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'After' }],
          }],
        }],
      },
      updatedAt: '2026-07-24T08:02:00.000Z',
      revision: {
        id: 'revision-accepted',
        opId: 'operation-1',
        disposition: 'selection-proposal-accepted',
        createdAt: '2026-07-24T08:02:00.000Z',
      },
    }).revision;
    learningStore.captureDecision({
      id: 'decision-1',
      draftId: 'draft-1',
      seq: 1,
      kind: 'proposal-accepted',
      sourceType: 'revision',
      sourceId: accepted.id,
      disposition: accepted.disposition,
      sourceTimestamp: accepted.createdAt,
      createdAt: accepted.createdAt,
      note: null,
    });
    learningStore.setDecisionNote(
      'decision-1',
      'Keep the concrete image.',
      '2026-07-24T08:03:00.000Z',
    );
    const projector = new DecisionProjector({
      learningStore,
      documentStore,
      topicStore,
      operationEvidence: (operationId) => ({
        operationId,
        draftId: 'draft-1',
        operation: 'rewrite-selection',
        state: 'completed',
        envelope: {
          jobId: operationId,
          prompt: '$writing-whp-youtube-scripts\nOperation: Rewrite selection\nInputs: {"selection":"Before"}',
          cwd: '/tmp/private-worktree',
          sandbox: 'workspace-write',
          codexBin: '/tmp/fake-codex',
          nonce: 'secret',
          model: 'gpt-5.6-sol',
          effort: 'xhigh',
        },
        result: {
          kind: 'schema',
          value: { replacement_markdown: 'After' },
          guardrail: null,
        },
      }),
    });

    expect(projector.resolve('decision-1')).toEqual(expect.objectContaining({
      id: 'decision-1',
      note: 'Keep the concrete image.',
      context: expect.objectContaining({
        source: {
          type: 'revision',
          id: 'revision-accepted',
          disposition: 'selection-proposal-accepted',
        },
        operation: {
          operationId: 'operation-1',
          draftId: 'draft-1',
          operation: 'rewrite-selection',
          state: 'completed',
          envelope: {
            jobId: 'operation-1',
            prompt: '$writing-whp-youtube-scripts\nOperation: Rewrite selection\nInputs: {"selection":"Before"}',
            sandbox: 'workspace-write',
            model: 'gpt-5.6-sol',
            effort: 'xhigh',
          },
          result: {
            kind: 'schema',
            value: { replacement_markdown: 'After' },
            guardrail: null,
          },
        },
        beforeRevision: expect.objectContaining({
          id: 'revision-before',
        }),
        revision: expect.objectContaining({
          id: 'revision-accepted',
        }),
        diff: {
          before: expect.objectContaining({
            attrs: expect.objectContaining({ preamble: 'Base' }),
            content: expect.arrayContaining([
              expect.objectContaining({
                content: expect.arrayContaining([
                  expect.objectContaining({
                    content: [
                      expect.objectContaining({ text: 'Before' }),
                    ],
                  }),
                ]),
              }),
            ]),
          }),
          after: expect.objectContaining({
            attrs: expect.objectContaining({ preamble: 'Base' }),
            content: expect.arrayContaining([
              expect.objectContaining({
                content: expect.arrayContaining([
                  expect.objectContaining({
                    content: [
                      expect.objectContaining({ text: 'After' }),
                    ],
                  }),
                ]),
              }),
            ]),
          }),
        },
      }),
    }));
  });

  it('keeps missing operation results explicit instead of inventing context', () => {
    const { documentStore, learningStore, topicStore } = stores();
    learningStore.captureDecision({
      id: 'decision-missing',
      draftId: 'draft-1',
      seq: 1,
      kind: 'proposal-rejected',
      sourceType: 'architecture-proposal',
      sourceId: 'operation-missing',
      disposition: 'rejected',
      sourceTimestamp: '2026-07-24T08:02:00.000Z',
      createdAt: '2026-07-24T08:02:00.000Z',
      note: null,
    });
    const projector = new DecisionProjector({
      learningStore,
      documentStore,
      topicStore,
      operationEvidence: () => null,
    });

    expect(projector.resolve('decision-missing').context.operation).toEqual({
      operationId: 'operation-missing',
      missing: true,
    });
  });

  it('resolves package picks and completed winner handoffs from durable source rows', () => {
    const { documentStore, learningStore, topicStore } = stores();
    topicStore.createIdea({
      id: 'idea-1',
      text: 'Sudoku',
      source: 'inbox',
      status: 'promoted',
      latestCheck: null,
      createdAt: '2026-07-24T08:00:00.000Z',
    });
    topicStore.createPackageTest({
      id: 'package-1',
      ideaId: 'idea-1',
      opId: 'package-operation',
      directions: [{
        working_title: 'The chosen package',
        intended_viewer: 'Puzzle players',
        familiar_markdown: 'A grid.',
        surprise_markdown: 'A portable rule system.',
        visual_promise_markdown: 'A spreading grid.',
        delivered_payoff_markdown: 'Why it travelled.',
        survives_honestly: true,
        reason_markdown: 'The episode can deliver.',
      }],
      createdAt: '2026-07-24T08:01:00.000Z',
    });
    topicStore.selectPackageDirection(
      'package-1',
      0,
      '2026-07-24T08:02:00.000Z',
    );
    topicStore.createRun({
      id: 'run-1',
      opId: 'topic-operation',
      state: 'completed',
      reportMd: '# Report',
      summary: { winner: { subject: 'Sudoku' } },
      summaryError: null,
      resultExtracted: true,
      createdAt: '2026-07-24T08:00:00.000Z',
    });
    topicStore.createHandoffSaga({
      runId: 'run-1',
      winnerSubject: 'Sudoku',
      input: {
        ideaId: 'idea-1',
        briefMarkdown: '# Accepted brief',
      },
      draftId: 'draft-1',
      draftCreated: true,
      artifactWritten: true,
      pipelineUpserted: true,
      ideaPromoted: true,
      createdAt: '2026-07-24T08:03:00.000Z',
      updatedAt: '2026-07-24T08:04:00.000Z',
    });
    learningStore.captureDecision({
      id: 'decision-package',
      draftId: 'draft-1',
      seq: 1,
      kind: 'package-picked',
      sourceType: 'package-test',
      sourceId: 'package-1',
      disposition: 'package-picked:0',
      sourceTimestamp: '2026-07-24T08:02:00.000Z',
      createdAt: '2026-07-24T08:02:00.000Z',
      note: null,
    });
    learningStore.captureDecision({
      id: 'decision-winner',
      draftId: 'draft-1',
      seq: 2,
      kind: 'winner-handed-off',
      sourceType: 'topic-handoff',
      sourceId: 'run-1:Sudoku',
      disposition: 'winner-handed-off',
      sourceTimestamp: '2026-07-24T08:04:00.000Z',
      createdAt: '2026-07-24T08:04:00.000Z',
      note: null,
    });
    const projector = new DecisionProjector({
      learningStore,
      documentStore,
      topicStore,
      operationEvidence: () => null,
    });

    expect(projector.resolve('decision-package').context.packageTest)
      .toMatchObject({
        id: 'package-1',
        selectedDirectionIndex: 0,
      });
    expect(projector.resolve('decision-package').context.operation).toEqual({
      operationId: 'package-operation',
      missing: true,
    });
    expect(projector.resolve('decision-winner').context.topicHandoff)
      .toMatchObject({
        runId: 'run-1',
        winnerSubject: 'Sudoku',
        input: {
          briefMarkdown: '# Accepted brief',
        },
        run: {
          summary: { winner: { subject: 'Sudoku' } },
        },
        chosenPackage: {
          id: 'package-1',
          selectedDirectionIndex: 0,
          selectedDirection: {
            working_title: 'The chosen package',
          },
        },
        resultingDraft: {
          id: 'draft-1',
        },
      });
  });
});
