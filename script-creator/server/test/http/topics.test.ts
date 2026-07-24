import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentService } from '../../src/documents/service.js';
import { DocumentStore } from '../../src/documents/store.js';
import { buildApp } from '../../src/http/app.js';
import type { OperationRecord } from '../../src/operations/service.js';
import {
  TopicService,
  type TopicSummary,
} from '../../src/topics/service.js';
import { TopicStore } from '../../src/topics/store.js';
import type { CodexEvent, OperationState } from '../../src/types.js';
import {
  UNUSED_DOCUMENT_SERVICE,
  UNUSED_VALIDATOR_SERVICE,
} from './stubs.js';

const NONCE = 'task-1-topics-nonce';
const AUTH = { 'x-sc-nonce': NONCE };
const GATE_CHECK = {
  verdict: 'pass',
  gates: [
    'game_play_centrality',
    'human_revelation',
    'recognized_payoff',
    'evidence_path',
    'production_reality',
    'portfolio_fit',
  ].map((gate) => ({
    gate,
    verdict: 'pass',
    reasonMarkdown: `${gate} has a clear path.`,
  })),
};

const SUMMARY: TopicSummary = {
  candidates: [],
  shortlist: [],
  packages: [],
  winner: {
    decision_status: 'incomplete',
    subject: null,
    angle_markdown: null,
    confidence: 'low',
    why_now_markdown: 'More evidence is required.',
    strongest_package_markdown: null,
  },
};

interface Fixture {
  root: string;
  app: ReturnType<typeof buildApp>;
  topicStore: TopicStore;
  documentStore: DocumentStore;
  operation: {
    state: OperationState;
    events: CodexEvent[];
  };
}

const fixtures: Fixture[] = [];

function makeFixture(topicIds = ['idea-1', 'run-1']): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'topics-http-'));
  const dbFile = join(root, 'state.sqlite3');
  const documentStore = new DocumentStore(dbFile);
  const topicStore = new TopicStore(dbFile);
  const documentService = new DocumentService({
    store: documentStore,
    idFactory: () => 'draft-1',
    now: () => '2026-07-23T10:00:00.000Z',
  });
  const operation = {
    state: 'running' as OperationState,
    events: [] as CodexEvent[],
  };
  const getOperation = (id: string) => {
    if (id !== 'op-1') throw new Error(`operation not found: ${id}`);
    return {
      id,
      state: operation.state,
      operation: 'full-topic-run',
    } as OperationRecord;
  };
  const remainingTopicIds = [...topicIds];
  const topicService = new TopicService({
    store: topicStore,
    operationService: {
      get: getOperation,
      events: () => operation.events,
      result: () => operation.state === 'completed'
        ? {
            kind: 'raw',
            markdown: [
              '# Report',
              '',
              '```whp-summary',
              JSON.stringify(SUMMARY),
              '```',
            ].join('\n'),
          }
        : { kind: 'pending' },
    },
    documentService,
    repoRoot: root,
    idFactory: () => remainingTopicIds.shift() ?? 'unexpected-id',
    now: () => '2026-07-23T10:00:00.000Z',
  });
  const app = buildApp({
    nonce: NONCE,
    operationService: {
      submit: () => 'op-1',
      list: () => [],
      get: getOperation,
      events: () => [],
      cancel: () => {},
      result: () => ({ kind: 'pending' }),
    },
    documentService,
    topicService,
    artifactService: {},
    validatorService: UNUSED_VALIDATOR_SERVICE,
  });
  const fixture = { root, app, topicStore, documentStore, operation };
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

describe('topics HTTP API', () => {
  it('creates, lists, reads, updates, and deletes ideas', async () => {
    const fixture = makeFixture();

    const created = await fixture.app.inject({
      method: 'POST',
      url: '/api/ideas',
      headers: AUTH,
      payload: {
        text: '  Why games make effort feel voluntary  ',
        source: 'inbox',
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      id: 'idea-1',
      text: 'Why games make effort feel voluntary',
      source: 'inbox',
      status: 'open',
      latestCheck: null,
    });

    const listed = await fixture.app.inject({
      method: 'GET',
      url: '/api/ideas',
      headers: AUTH,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([created.json()]);

    const read = await fixture.app.inject({
      method: 'GET',
      url: '/api/ideas/idea-1',
      headers: AUTH,
    });
    expect(read.json()).toEqual(created.json());

    const updated = await fixture.app.inject({
      method: 'PATCH',
      url: '/api/ideas/idea-1',
      headers: AUTH,
      payload: {
        status: 'discarded',
        latestCheckOpId: 'op-gate-1',
        latestCheck: GATE_CHECK,
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      status: 'discarded',
      latestCheck: GATE_CHECK,
    });

    const reloaded = await fixture.app.inject({
      method: 'GET',
      url: '/api/ideas',
      headers: AUTH,
    });
    expect(reloaded.json()[0]).toMatchObject({
      id: 'idea-1',
      latestCheck: GATE_CHECK,
    });

    const deleted = await fixture.app.inject({
      method: 'DELETE',
      url: '/api/ideas/idea-1',
      headers: AUTH,
    });
    expect(deleted.statusCode).toBe(204);
    expect((await fixture.app.inject({
      method: 'GET',
      url: '/api/ideas/idea-1',
      headers: AUTH,
    })).statusCode).toBe(404);
  });

  it('registers, lists, and returns topic-run progress and terminal output', async () => {
    const fixture = makeFixture(['run-1']);
    const parsed = {
      type: 'item.completed',
      item: {
        type: 'agent_message',
        text: 'WHP_PROGRESS/3 01-frame done :: Decision frame recorded.',
      },
    };
    fixture.operation.events = [{
      seq: 1,
      raw: JSON.stringify(parsed),
      parsed,
    }];

    const registered = await fixture.app.inject({
      method: 'POST',
      url: '/api/topic-runs',
      headers: AUTH,
      payload: { opId: 'op-1' },
    });
    expect(registered.statusCode).toBe(201);
    expect(registered.json()).toMatchObject({
      id: 'run-1',
      opId: 'op-1',
      state: 'running',
    });

    const listed = await fixture.app.inject({
      method: 'GET',
      url: '/api/topic-runs',
      headers: AUTH,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([registered.json()]);

    fixture.operation.state = 'completed';
    const completed = await fixture.app.inject({
      method: 'GET',
      url: '/api/topic-runs/run-1',
      headers: AUTH,
    });
    expect(completed.statusCode).toBe(200);
    expect(completed.json()).toEqual({
      state: 'completed',
      progress: [{
        id: '01-frame',
        status: 'done',
        text: 'Decision frame recorded.',
      }],
      summary: SUMMARY,
      reportMd: expect.stringContaining('# Report'),
    });
  });

  it('creates and lists package-test history for an idea', async () => {
    const fixture = makeFixture(['idea-1', 'package-test-1']);
    await fixture.app.inject({
      method: 'POST',
      url: '/api/ideas',
      headers: AUTH,
      payload: {
        text: 'Why games make effort feel voluntary',
        source: 'inbox',
      },
    });
    const directions = [{
      working_title: 'Why We Make Games Harder',
      intended_viewer: 'Players who choose harder rules',
      familiar_markdown: 'A no-hit run.',
      surprise_markdown: 'Constraint can create meaning.',
      visual_promise_markdown: 'One level under two rule sets.',
      delivered_payoff_markdown: 'Why chosen difficulty changes effort.',
      survives_honestly: true,
      reason_markdown: 'The episode can deliver the promise.',
    }];

    const created = await fixture.app.inject({
      method: 'POST',
      url: '/api/ideas/idea-1/package-tests',
      headers: AUTH,
      payload: { opId: 'op-package-1', directions },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      id: 'package-test-1',
      ideaId: 'idea-1',
      opId: 'op-package-1',
      directions,
    });

    const listed = await fixture.app.inject({
      method: 'GET',
      url: '/api/ideas/idea-1/package-tests',
      headers: AUTH,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([created.json()]);
  });

  it('returns pipeline rows merged with local draft creative state', async () => {
    const fixture = makeFixture();
    fixture.documentStore.createDraft({
      id: 'draft-1',
      episodeSlug: 'sudoku',
      title: 'Sudoku',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: '' },
        metadata: { creativeStatus: { phase: 'rapid-prototype' } },
        content: [],
      },
      updatedAt: '2026-07-23T10:00:00.000Z',
    });
    mkdirSync(join(fixture.root, 'whp-youtube'), { recursive: true });
    writeFileSync(join(fixture.root, 'whp-youtube', 'PIPELINE.md'), [
      '| Episode | Milestone | Ref |',
      '| --- | --- | --- |',
      '| sudoku | selected | whp-youtube/topics/sudoku.md |',
      '',
    ].join('\n'));

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/pipeline',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      diagnostics: [],
      rows: [{
        episodeSlug: 'sudoku',
        state: 'prototyping',
        milestone: 'selected',
        ref: 'whp-youtube/topics/sudoku.md',
        draftId: 'draft-1',
        title: 'Sudoku',
        creativePhase: 'rapid-prototype',
      }],
    });
  });

  it('returns pipeline parse diagnostics with row numbers', async () => {
    const fixture = makeFixture();
    mkdirSync(join(fixture.root, 'whp-youtube'), { recursive: true });
    writeFileSync(join(fixture.root, 'whp-youtube', 'PIPELINE.md'), [
      '| Episode | Milestone | Ref |',
      '| --- | --- | --- |',
      '| sudoku | | whp-youtube/topics/sudoku.md |',
      '',
    ].join('\n'));

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/pipeline',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      rows: [],
      diagnostics: [{
        code: 'empty-required-cell',
        line: 3,
        message: 'Pipeline row has an empty required cell.',
      }],
    });
  });

  it('returns a repository topic brief selected by pipeline ref', async () => {
    const fixture = makeFixture();
    mkdirSync(
      join(fixture.root, 'whp-youtube', 'topics'),
      { recursive: true },
    );
    writeFileSync(
      join(
        fixture.root,
        'whp-youtube',
        'topics',
        'the-queue-game.md',
      ),
      '# The Queue Game\n\nRepository topic brief.',
    );

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/topic-brief?ref=whp-youtube%2Ftopics%2Fthe-queue-game.md',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ref: 'whp-youtube/topics/the-queue-game.md',
      markdown: '# The Queue Game\n\nRepository topic brief.',
    });
  });

  it('hides internal failures from idea and topic-run list responses', async () => {
    const fail = (): never => {
      throw new Error('database disk image is malformed');
    };
    const app = buildApp({
      nonce: NONCE,
      operationService: {
        submit: fail,
        list: fail,
        get: fail,
        events: fail,
        cancel: fail,
        result: fail,
      },
      documentService: UNUSED_DOCUMENT_SERVICE,
      topicService: {
        createIdea: fail,
        getIdea: fail,
        listIdeas: fail,
        updateIdea: fail,
        deleteIdea: fail,
        createPackageTest: fail,
        listPackageTests: fail,
        registerRun: fail,
        listRuns: fail,
        getRun: fail,
        handoff: fail,
        pipeline: fail,
        topicBrief: fail,
      },
      artifactService: {},
      validatorService: UNUSED_VALIDATOR_SERVICE,
    });

    try {
      for (const url of ['/api/ideas', '/api/topic-runs']) {
        const response = await app.inject({
          method: 'GET',
          url,
          headers: AUTH,
        });
        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
          error: 'internal server error',
        });
        expect(response.body).not.toContain('database');
      }
    } finally {
      await app.close();
    }
  });

  it.each([
    ['GET', '/api/ideas'],
    ['POST', '/api/ideas'],
    ['GET', '/api/ideas/idea-1'],
    ['PATCH', '/api/ideas/idea-1'],
    ['DELETE', '/api/ideas/idea-1'],
    ['GET', '/api/ideas/idea-1/package-tests'],
    ['POST', '/api/ideas/idea-1/package-tests'],
    ['GET', '/api/topic-runs'],
    ['POST', '/api/topic-runs'],
    ['GET', '/api/topic-runs/run-1'],
    ['GET', '/api/pipeline'],
    ['GET', '/api/topic-brief?ref=whp-youtube%2Ftopics%2Ftopic.md'],
  ] as const)('rejects %s %s without the nonce', async (method, url) => {
    const fixture = makeFixture();

    const response = await fixture.app.inject({ method, url });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'invalid nonce' });
  });
});
