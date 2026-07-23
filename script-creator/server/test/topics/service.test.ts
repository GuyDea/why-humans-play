import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { DocumentHttpService } from '../../src/http/app.js';
import type { OperationRecord } from '../../src/operations/service.js';
import type { OperationName } from '../../src/operations/registry.js';
import {
  extractTopicSummary,
  TopicService,
  type TopicSummary,
} from '../../src/topics/service.js';
import { TopicStore } from '../../src/topics/store.js';
import type { CodexEvent, OperationState } from '../../src/types.js';

const roots: string[] = [];
const stores: TopicStore[] = [];

const VALID_SUMMARY: TopicSummary = {
  candidates: [{
    subject: 'Sudoku',
    angle_markdown: 'What its rules reveal about puzzle hunger.',
    gates: [
      {
        gate: 'game_play_centrality',
        verdict: 'pass',
        reason_markdown: 'The game is the subject.',
      },
      {
        gate: 'human_revelation',
        verdict: 'pass',
        reason_markdown: 'It exposes puzzle hunger.',
      },
      {
        gate: 'recognized_payoff',
        verdict: 'pass',
        reason_markdown: 'The viewer understands the design.',
      },
      {
        gate: 'evidence_path',
        verdict: 'pass',
        reason_markdown: 'The history is documented.',
      },
      {
        gate: 'production_reality',
        verdict: 'pass',
        reason_markdown: 'The board is filmable.',
      },
      {
        gate: 'portfolio_fit',
        verdict: 'pass',
        reason_markdown: 'It is not duplicated.',
      },
    ],
    disposition: 'deep-research finalist',
  }],
  shortlist: [{
    rank: 1,
    subject: 'Sudoku',
    angle_markdown: 'What its rules reveal about puzzle hunger.',
    scores: {
      demand: { score: 19, grade: 'B' },
      opening: { score: 11, grade: 'B' },
      package: { score: 15, grade: 'B' },
      satisfaction: { score: 11, grade: 'A' },
      whp: { score: 10, grade: 'A' },
      evidence: { score: 8, grade: 'B' },
      feasibility: { score: 5, grade: 'A' },
    },
    total: 79,
    confidence: 'medium',
    decisive_risk_markdown: 'Audience transfer remains indirect.',
  }],
  packages: [{
    finalist: 'Sudoku',
    direction: 'The perfect puzzle',
    working_title: 'The Puzzle That Conquered the World',
    intended_viewer: 'People who enjoy everyday puzzles',
    familiar_markdown: 'The familiar grid.',
    surprise_markdown: 'Its rules are unusually portable.',
    visual_promise_markdown: 'A grid spreading across a map.',
    delivered_payoff_markdown: 'Why simple constraints travel.',
    survives_honestly: true,
    reason_markdown: 'The episode can deliver the promise.',
  }],
  winner: {
    decision_status: 'winner-selected',
    subject: 'Sudoku',
    angle_markdown: 'What its rules reveal about puzzle hunger.',
    confidence: 'medium',
    why_now_markdown: 'It is an evergreen entry point.',
    strongest_package_markdown: 'The Puzzle That Conquered the World.',
  },
};

function report(summary: unknown = VALID_SUMMARY): string {
  return [
    '# Topic report',
    '',
    'Research narrative.',
    '',
    '```whp-summary',
    JSON.stringify(summary),
    '```',
  ].join('\n');
}

function progressEvent(): CodexEvent {
  const parsed = {
    type: 'item.completed',
    item: {
      type: 'agent_message',
      text: 'WHP_PROGRESS/1 02-mode active :: Comparing evidence modes.',
    },
  };
  return { seq: 1, raw: JSON.stringify(parsed), parsed };
}

interface OperationStub {
  state: OperationState;
  operation: OperationName;
  events: CodexEvent[];
  markdown: string;
  resultCalls: number;
  get(id: string): OperationRecord;
  result(id: string):
    | { kind: 'raw'; markdown: string }
    | { kind: 'pending' };
}

function operationStub(): OperationStub {
  return {
    state: 'running',
    operation: 'full-topic-run',
    events: [progressEvent()],
    markdown: report(),
    resultCalls: 0,
    get(id) {
      if (id !== 'op-1') throw new Error(`operation not found: ${id}`);
      return {
        id,
        state: this.state,
        operation: this.operation,
      } as OperationRecord;
    },
    result(id) {
      this.get(id);
      this.resultCalls += 1;
      return this.state === 'completed'
        ? { kind: 'raw', markdown: this.markdown }
        : { kind: 'pending' };
    },
  };
}

function makeService(
  operationService = operationStub(),
  documentService: Pick<DocumentHttpService, 'listDrafts' | 'getDraft'> = {
    listDrafts: () => [],
    getDraft: () => {
      throw new Error('draft not found');
    },
  },
) {
  const root = mkdtempSync(join(tmpdir(), 'topic-service-'));
  roots.push(root);
  const store = new TopicStore(join(root, 'state.sqlite3'));
  stores.push(store);
  const ids = ['idea-1', 'run-1'];
  const service = new TopicService({
    store,
    operationService: {
      get: operationService.get.bind(operationService),
      events: () => operationService.events,
      result: operationService.result.bind(operationService),
    },
    documentService,
    repoRoot: root,
    idFactory: () => ids.shift() ?? 'unexpected-id',
    now: () => '2026-07-23T10:00:00.000Z',
  });
  return { root, store, service, operationService };
}

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('extractTopicSummary', () => {
  it('extracts a valid terminal fenced summary', () => {
    expect(extractTopicSummary(report())).toEqual({
      summary: VALID_SUMMARY,
      summaryError: null,
    });
  });

  it('extracts a valid fenced summary when Markdown ends with a newline', () => {
    expect(extractTopicSummary(`${report()}\n`)).toEqual({
      summary: VALID_SUMMARY,
      summaryError: null,
    });
  });

  it('reports an absent summary without throwing', () => {
    expect(extractTopicSummary('# Topic report\n\nNo sidecar.')).toEqual({
      summary: null,
      summaryError: 'whp-summary block is missing',
    });
  });

  it('reports malformed JSON without throwing', () => {
    expect(extractTopicSummary([
      '# Topic report',
      '',
      '```whp-summary',
      '{"candidates":',
      '```',
    ].join('\n'))).toEqual({
      summary: null,
      summaryError: expect.stringMatching(
        /^whp-summary block contains malformed JSON:/,
      ),
    });
  });

  it('reports a strict-schema violation without throwing', () => {
    expect(extractTopicSummary(report({
      ...VALID_SUMMARY,
      unowned_editorial_judgment: 'never accept this',
    }))).toEqual({
      summary: null,
      summaryError: expect.stringMatching(
        /^whp-summary block violates schema:/,
      ),
    });
  });

  it('rejects candidate rows that repeat one gate instead of all six', () => {
    const firstGate = VALID_SUMMARY.candidates[0]!.gates[0]!;
    expect(extractTopicSummary(report({
      ...VALID_SUMMARY,
      candidates: [{
        ...VALID_SUMMARY.candidates[0]!,
        gates: Array.from({ length: 6 }, (_, index) => ({
          ...firstGate,
          reason_markdown: `Duplicate ${index + 1}`,
        })),
      }],
    }))).toEqual({
      summary: null,
      summaryError: expect.stringMatching(
        /^whp-summary block violates schema:.*each of the six gates/i,
      ),
    });
  });

  it('rejects criterion scores above their rubric weight', () => {
    expect(extractTopicSummary(report({
      ...VALID_SUMMARY,
      shortlist: [{
        ...VALID_SUMMARY.shortlist[0]!,
        scores: {
          ...VALID_SUMMARY.shortlist[0]!.scores,
          feasibility: { score: 6, grade: 'A' },
        },
      }],
    }))).toEqual({
      summary: null,
      summaryError: expect.stringMatching(
        /^whp-summary block violates schema:/,
      ),
    });
  });
});

describe('TopicService', () => {
  it('validates and updates ideas through the complete CRUD lifecycle', () => {
    const { service } = makeService();

    const created = service.createIdea({
      text: '  Why voluntary difficulty feels good  ',
      source: 'inbox',
    });
    expect(created).toEqual({
      id: 'idea-1',
      text: 'Why voluntary difficulty feels good',
      source: 'inbox',
      status: 'open',
      createdAt: '2026-07-23T10:00:00.000Z',
    });

    expect(service.getIdea(created.id)).toEqual(created);
    expect(service.updateIdea(created.id, {
      source: 'ideate',
      status: 'promoted',
    })).toMatchObject({
      source: 'ideate',
      status: 'promoted',
    });
    expect(service.listIdeas()).toHaveLength(1);
    service.deleteIdea(created.id);
    expect(service.listIdeas()).toEqual([]);
    expect(() => service.getIdea(created.id)).toThrow(/idea not found/i);
  });

  it('registers a run idempotently by op id and extracts its terminal result once', () => {
    const fixture = makeService();
    const registered = fixture.service.registerRun('op-1');

    expect(fixture.service.registerRun('op-1')).toEqual(registered);
    expect(fixture.service.getRun(registered.id)).toEqual({
      state: 'running',
      progress: [{
        id: '02-mode',
        status: 'active',
        text: 'Comparing evidence modes.',
      }],
    });

    fixture.operationService.state = 'completed';
    const completed = fixture.service.getRun(registered.id);
    expect(completed).toEqual({
      state: 'completed',
      progress: [{
        id: '02-mode',
        status: 'active',
        text: 'Comparing evidence modes.',
      }],
      summary: VALID_SUMMARY,
      reportMd: report(),
    });
    expect(fixture.operationService.resultCalls).toBe(1);

    fixture.operationService.markdown = '# changed after extraction';
    expect(fixture.service.getRun(registered.id)).toEqual(completed);
    expect(fixture.operationService.resultCalls).toBe(1);
  });

  it('rejects registration for an operation that is not a full topic run', () => {
    const operationService = operationStub();
    operationService.operation = 'review';
    const fixture = makeService(operationService);

    expect(() => fixture.service.registerRun('op-1'))
      .toThrow(/not a full-topic-run/i);
    expect(fixture.store.listRuns()).toEqual([]);
  });

  it('merges repository pipeline rows with local draft creative phases', async () => {
    const documentService = {
      listDrafts: () => [
        {
          id: 'draft-1',
          episodeSlug: 'why-sudoku-spread',
          title: 'Why Sudoku Spread',
          format: 'narration' as const,
          updatedAt: '2026-07-23T09:00:00.000Z',
        },
        {
          id: 'draft-2',
          episodeSlug: 'voluntary-difficulty',
          title: 'Voluntary Difficulty',
          format: 'narration' as const,
          updatedAt: '2026-07-23T08:00:00.000Z',
        },
      ],
      getDraft: (id: string) => ({
        id,
        episodeSlug: id === 'draft-1'
          ? 'why-sudoku-spread'
          : 'voluntary-difficulty',
        title: id === 'draft-1' ? 'Why Sudoku Spread' : 'Voluntary Difficulty',
        format: 'narration' as const,
        updatedAt: '2026-07-23T09:00:00.000Z',
        doc: {
          metadata: {
            creativeStatus: {
              phase: id === 'draft-1'
                ? 'creative-approved'
                : 'rapid-prototype',
            },
          },
        },
      }),
    };
    const fixture = makeService(operationStub(), documentService);
    mkdirSync(join(fixture.root, 'whp-youtube'), { recursive: true });
    writeFileSync(join(fixture.root, 'whp-youtube', 'PIPELINE.md'), [
      '# Production pipeline',
      '',
      '| Episode | Milestone | Ref |',
      '| --- | --- | --- |',
      '| why-sudoku-spread | selected | whp-youtube/topics/sudoku.md |',
      '| published-episode | published | whp-youtube/episodes/published.md |',
      '',
    ].join('\n'));

    expect(await fixture.service.pipeline()).toEqual([
      {
        episodeSlug: 'published-episode',
        state: 'published',
        milestone: 'published',
        ref: 'whp-youtube/episodes/published.md',
        draftId: null,
        title: null,
        creativePhase: null,
      },
      {
        episodeSlug: 'voluntary-difficulty',
        state: 'prototyping',
        milestone: null,
        ref: null,
        draftId: 'draft-2',
        title: 'Voluntary Difficulty',
        creativePhase: 'rapid-prototype',
      },
      {
        episodeSlug: 'why-sudoku-spread',
        state: 'creative-approved',
        milestone: 'selected',
        ref: 'whp-youtube/topics/sudoku.md',
        draftId: 'draft-1',
        title: 'Why Sudoku Spread',
        creativePhase: 'creative-approved',
      },
    ]);
  });

  it('uses the newest draft consistently when an episode slug is duplicated', async () => {
    const documentService = {
      listDrafts: () => [
        {
          id: 'draft-newest',
          episodeSlug: 'duplicate',
          title: 'Newest title',
          format: 'narration' as const,
          updatedAt: '2026-07-23T10:00:00.000Z',
        },
        {
          id: 'draft-older',
          episodeSlug: 'duplicate',
          title: 'Older title',
          format: 'narration' as const,
          updatedAt: '2026-07-23T09:00:00.000Z',
        },
      ],
      getDraft: (id: string) => ({
        id,
        episodeSlug: 'duplicate',
        title: id === 'draft-newest' ? 'Newest title' : 'Older title',
        format: 'narration' as const,
        updatedAt: id === 'draft-newest'
          ? '2026-07-23T10:00:00.000Z'
          : '2026-07-23T09:00:00.000Z',
        doc: {
          metadata: {
            creativeStatus: {
              phase: id === 'draft-newest'
                ? 'creative-approved'
                : 'rapid-prototype',
            },
          },
        },
      }),
    };
    const fixture = makeService(operationStub(), documentService);

    expect(await fixture.service.pipeline()).toEqual([{
      episodeSlug: 'duplicate',
      state: 'creative-approved',
      milestone: null,
      ref: null,
      draftId: 'draft-newest',
      title: 'Newest title',
      creativePhase: 'creative-approved',
    }]);
  });
});
