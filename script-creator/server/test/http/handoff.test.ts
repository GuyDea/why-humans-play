import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentService } from '../../src/documents/service.js';
import { DocumentStore } from '../../src/documents/store.js';
import { buildApp } from '../../src/http/app.js';
import type { OperationRecord } from '../../src/operations/service.js';
import type {
  ArtifactWriteResult,
  PipelineRow,
} from '../../src/repo/artifacts.js';
import {
  TopicService,
  type TopicSummary,
} from '../../src/topics/service.js';
import { TopicStore } from '../../src/topics/store.js';
import {
  UNUSED_VALIDATOR_SERVICE,
} from './stubs.js';

const NONCE = 'handoff-saga-nonce';
const AUTH = { 'x-sc-nonce': NONCE };
const BRIEF_MARKDOWN = [
  '# Selected topic brief',
  '',
  '**Topic:** Voluntary Obstacles',
  '',
  '## Factual anchors',
  '',
  '- Players voluntarily accept harder rules.',
  '',
  '## Important unknowns',
  '',
  '- Which opening proof case is strongest?',
].join('\n');
const DRAFT_DOC = {
  type: 'doc',
  attrs: { format: 'narration', preamble: '' },
  metadata: {
    topic: 'Voluntary Obstacles',
    anchors: ['Players voluntarily accept harder rules.'],
    unknowns: ['Which opening proof case is strongest?'],
    approvedLessons: [],
    creativeStatus: { phase: 'architecture' },
    directionApproved: false,
  },
  content: [{
    type: 'beat',
    attrs: {
      beatId: 'beat_topic_handoff',
      title: 'Opening',
      timeTargetMs: 30_000,
    },
    content: [{ type: 'paragraph', content: [] }],
  }],
};
const SUMMARY: TopicSummary = {
  candidates: [],
  shortlist: [{
    rank: 1,
    subject: 'Voluntary Obstacles',
    angle_markdown: 'Why chosen constraints can make effort meaningful.',
    scores: {
      demand: { score: 20, grade: 'A' },
      opening: { score: 13, grade: 'A' },
      package: { score: 17, grade: 'B' },
      satisfaction: { score: 13, grade: 'A' },
      whp: { score: 9, grade: 'A' },
      evidence: { score: 8, grade: 'B' },
      feasibility: { score: 5, grade: 'A' },
    },
    total: 85,
    confidence: 'high',
    decisive_risk_markdown: 'The proof case still needs validation.',
  }],
  packages: Array.from({ length: 3 }, (_, index) => ({
    finalist: 'Voluntary Obstacles',
    direction: `Direction ${index + 1}`,
    working_title: `Why We Choose Hard Mode ${index + 1}`,
    intended_viewer: 'Players who choose harder rules',
    familiar_markdown: 'A no-hit run.',
    surprise_markdown: 'Constraint can create meaning.',
    visual_promise_markdown: 'One level under two rule sets.',
    delivered_payoff_markdown: 'Why chosen difficulty changes effort.',
    survives_honestly: true,
    reason_markdown: 'The episode can deliver the promise.',
  })),
  winner: {
    decision_status: 'winner-selected',
    subject: 'Voluntary Obstacles',
    angle_markdown: 'Why chosen constraints can make effort meaningful.',
    confidence: 'high',
    why_now_markdown: 'The behavior is recognizable and filmable.',
    strongest_package_markdown: 'Why We Choose Hard Mode.',
  },
};
const HANDOFF_PAYLOAD = {
  ideaId: 'idea-1',
  episodeSlug: 'voluntary-obstacles',
  title: 'Voluntary Obstacles',
  briefMarkdown: BRIEF_MARKDOWN,
  draft: {
    format: 'narration',
    doc: DRAFT_DOC,
  },
};

interface Fixture {
  root: string;
  dbFile: string;
  documentStore: DocumentStore;
  topicStore: TopicStore;
  documentService: DocumentService;
  topicService: TopicService;
  app: ReturnType<typeof buildApp>;
  write: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
}

const fixtures: Fixture[] = [];

function createFixture(
  writeResults: ArtifactWriteResult[] = [{
    conflict: false,
    hash: 'brief-hash',
  }],
): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'handoff-http-'));
  const dbFile = join(root, 'state.sqlite3');
  const documentStore = new DocumentStore(dbFile);
  const topicStore = new TopicStore(dbFile);
  const documentService = new DocumentService({ store: documentStore });
  const ids = ['idea-1', 'run-1', 'draft-handoff-1'];
  const write = vi.fn(async () =>
    writeResults.shift() ?? { conflict: false, hash: 'brief-hash' });
  const upsert = vi.fn(async (_row: PipelineRow) => ({
    conflict: false as const,
    hash: 'pipeline-hash',
  }));
  const operationService = {
    get: (id: string) => ({
      id,
      state: 'completed',
      operation: 'full-topic-run',
      createdAt: '2026-07-23T10:00:00.000Z',
    } as OperationRecord),
    events: () => [],
    result: () => ({
      kind: 'raw' as const,
      markdown: [
        '# Topic report',
        '',
        '```whp-summary',
        JSON.stringify(SUMMARY),
        '```',
      ].join('\n'),
    }),
  };
  const topicService = new TopicService({
    store: topicStore,
    operationService,
    documentService,
    repoRoot: root,
    idFactory: () => ids.shift() ?? 'unexpected-id',
    now: () => '2026-07-23T10:00:00.000Z',
    artifactService: {
      write,
      upsertPipelineRow: upsert,
    },
  } as ConstructorParameters<typeof TopicService>[0]);
  topicService.createIdea({
    text: 'Voluntary Obstacles\n\nWhy chosen constraints can make effort meaningful.',
    source: 'ideate',
  });
  const run = topicService.registerRun('op-1');
  topicService.getRun(run.id);
  const app = buildApp({
    nonce: NONCE,
    operationService: {
      submit: () => 'op-1',
      list: () => [],
      get: operationService.get,
      events: () => [],
      cancel: () => {},
      result: operationService.result,
    },
    documentService,
    topicService,
    artifactService: {},
    validatorService: UNUSED_VALIDATOR_SERVICE,
  });
  const fixture = {
    root,
    dbFile,
    documentStore,
    topicStore,
    documentService,
    topicService,
    app,
    write,
    upsert,
  };
  fixtures.push(fixture);
  return fixture;
}

afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    await fixture.app.close();
    fixture.topicStore.close();
    fixture.documentStore.close();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

describe('topic handoff saga HTTP API', () => {
  it('completes all four handoff steps and returns the durable draft id', async () => {
    const fixture = createFixture();

    const response = await handoff(fixture.app);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      draftId: 'draft-handoff-1',
      complete: true,
      steps: {
        draftCreated: 'completed',
        artifactWritten: 'completed',
        pipelineUpserted: 'completed',
        ideaPromoted: 'completed',
      },
      error: null,
    });
    expect(fixture.documentStore.listDrafts()).toHaveLength(1);
    expect(fixture.topicStore.getIdea('idea-1')?.status).toBe('promoted');
  });

  it('pauses on an artifact conflict and resumes from the persisted draft step', async () => {
    const contentHash = createHash('sha256')
      .update(BRIEF_MARKDOWN)
      .digest('hex');
    const fixture = createFixture([
      { conflict: true, currentHash: 'external-content-hash' },
      { conflict: true, currentHash: contentHash },
    ]);

    const paused = await handoff(fixture.app);
    expect(paused.statusCode).toBe(200);
    expect(paused.json()).toMatchObject({
      draftId: 'draft-handoff-1',
      complete: false,
      steps: {
        draftCreated: 'completed',
        artifactWritten: 'pending',
        pipelineUpserted: 'pending',
        ideaPromoted: 'pending',
      },
      error: expect.stringContaining('external-content-hash'),
    });

    const resumed = await handoff(fixture.app);
    expect(resumed.json()).toMatchObject({
      draftId: 'draft-handoff-1',
      complete: true,
      steps: {
        draftCreated: 'completed',
        artifactWritten: 'completed',
        pipelineUpserted: 'completed',
        ideaPromoted: 'completed',
      },
    });
    expect(fixture.documentStore.listDrafts()).toHaveLength(1);
    expect(fixture.write).toHaveBeenCalledTimes(2);
    expect(fixture.upsert).toHaveBeenCalledOnce();
  });

  it('reloads the server command before retry without creating a second draft', async () => {
    const fixture = createFixture([
      { conflict: true, currentHash: 'external-content-hash' },
      { conflict: false, hash: 'brief-hash' },
    ]);
    expect((await handoff(fixture.app)).json()).toMatchObject({
      complete: false,
      draftId: 'draft-handoff-1',
    });

    await fixture.app.close();
    fixture.app = buildApp({
      nonce: NONCE,
      operationService: {
        submit: () => 'op-1',
        list: () => [],
        get: () => ({ id: 'op-1' }) as OperationRecord,
        events: () => [],
        cancel: () => {},
        result: () => ({ kind: 'pending' }),
      },
      documentService: fixture.documentService,
      topicService: fixture.topicService,
      artifactService: {},
      validatorService: UNUSED_VALIDATOR_SERVICE,
    });

    const retried = await handoff(fixture.app);
    expect(retried.json()).toMatchObject({
      complete: true,
      draftId: 'draft-handoff-1',
    });
    expect(fixture.documentStore.listDrafts()).toHaveLength(1);
  });
});

function handoff(app: ReturnType<typeof buildApp>) {
  return app.inject({
    method: 'POST',
    url: '/api/topic-runs/run-1/handoff',
    headers: AUTH,
    payload: HANDOFF_PAYLOAD,
  });
}
