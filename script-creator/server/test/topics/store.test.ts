import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentStore } from '../../src/documents/store.js';
import {
  TopicStore,
  type GateCheckResult,
  type IdeaRecord,
  type PackageTestRecord,
  type TopicRunRecord,
} from '../../src/topics/store.js';

const GATE_CHECK: GateCheckResult = {
  verdict: 'pass' as const,
  gates: ([
    'game_play_centrality',
    'human_revelation',
    'recognized_payoff',
    'evidence_path',
    'production_reality',
    'portfolio_fit',
  ] as const).map((gate) => ({
    gate,
    verdict: 'pass' as const,
    reasonMarkdown: `${gate} has a clear path.`,
  })),
};

const roots: string[] = [];
const stores: TopicStore[] = [];
const documentStores: DocumentStore[] = [];

function databaseFile(): string {
  const root = mkdtempSync(join(tmpdir(), 'topic-store-'));
  roots.push(root);
  return join(root, 'state.sqlite3');
}

function openStore(dbFile = databaseFile()): TopicStore {
  const store = new TopicStore(dbFile);
  stores.push(store);
  return store;
}

function idea(overrides: Partial<IdeaRecord> = {}): IdeaRecord {
  return {
    id: 'idea-1',
    text: 'Why games make hard work feel voluntary',
    source: 'inbox',
    status: 'open',
    latestCheck: null,
    createdAt: '2026-07-23T08:00:00.000Z',
    ...overrides,
  };
}

function run(overrides: Partial<TopicRunRecord> = {}): TopicRunRecord {
  return {
    id: 'run-1',
    opId: 'op-1',
    state: 'running',
    reportMd: null,
    summary: null,
    summaryError: null,
    resultExtracted: false,
    createdAt: '2026-07-23T08:00:00.000Z',
    ...overrides,
  };
}

function packageTest(
  overrides: Partial<PackageTestRecord> = {},
): PackageTestRecord {
  return {
    id: 'package-test-1',
    ideaId: 'idea-1',
    opId: 'op-package-1',
    directions: [{
      working_title: 'Why We Make Games Harder',
      intended_viewer: 'Players who choose harder rules',
      familiar_markdown: 'A no-hit run.',
      surprise_markdown: 'Constraint can create meaning.',
      visual_promise_markdown: 'One level under two rule sets.',
      delivered_payoff_markdown: 'Why chosen difficulty changes effort.',
      survives_honestly: true,
      reason_markdown: 'The episode can deliver the promise.',
    }],
    createdAt: '2026-07-23T10:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  for (const store of documentStores.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('TopicStore', () => {
  it('migrates a v2 state database through the shared v13 registry', () => {
    const dbFile = databaseFile();
    const documents = new DocumentStore(dbFile);
    documentStores.push(documents);

    openStore(dbFile);

    const inspected = new Database(dbFile, { readonly: true });
    const version = inspected.pragma('user_version', { simple: true });
    const ideas = inspected
      .prepare<[], { name: string }>('PRAGMA table_info(ideas)')
      .all()
      .map((column) => column.name);
    const runs = inspected
      .prepare<[], { name: string }>('PRAGMA table_info(topic_runs)')
      .all()
      .map((column) => column.name);
    const packageTests = inspected
      .prepare<[], { name: string }>('PRAGMA table_info(package_tests)')
      .all()
      .map((column) => column.name);
    inspected.close();

    expect(version).toBe(13);
    expect(ideas).toEqual([
      'id',
      'text',
      'source',
      'status',
      'created_at',
      'latest_check_json',
    ]);
    expect(runs).toEqual([
      'id',
      'op_id',
      'state',
      'report_md',
      'summary_json',
      'summary_error',
      'result_extracted',
      'created_at',
    ]);
    expect(packageTests).toEqual([
      'id',
      'idea_id',
      'op_id',
      'directions_json',
      'created_at',
      'selected_direction_index',
      'selected_at',
    ]);
  });

  it('persists idea create, read, update, list, and delete operations', () => {
    const store = openStore();
    store.createIdea(idea());
    store.createIdea(idea({
      id: 'idea-2',
      text: 'Sudoku as cultural technology',
      source: 'ideate',
      status: 'discarded',
      createdAt: '2026-07-23T09:00:00.000Z',
    }));

    expect(store.getIdea('idea-1')).toEqual(idea());
    expect(store.listIdeas().map((record) => record.id))
      .toEqual(['idea-2', 'idea-1']);

    const promoted = idea({
      text: 'Why games turn effort into desire',
      status: 'promoted',
      latestCheck: GATE_CHECK,
    });
    expect(store.updateIdea(promoted)).toEqual(promoted);
    expect(store.deleteIdea('idea-2')).toBe(true);
    expect(store.deleteIdea('missing')).toBe(false);
    expect(store.getIdea('idea-2')).toBeNull();
  });

  it('registers runs uniquely by operation id and persists extracted results', () => {
    const store = openStore();
    store.createRun(run());

    expect(() => store.createRun(run({ id: 'run-2' })))
      .toThrow(/unique/i);
    expect(store.getRunByOpId('op-1')).toEqual(run());

    const completed = run({
      state: 'completed',
      reportMd: '# Topic report',
      summary: { candidates: [] },
      resultExtracted: true,
    });
    expect(store.updateRun(completed)).toEqual(completed);
    expect(store.listRuns()).toEqual([completed]);
  });

  it('keeps ordered package-test history per idea', () => {
    const store = openStore();
    store.createIdea(idea());
    const first = packageTest();
    const second = packageTest({
      id: 'package-test-2',
      opId: 'op-package-2',
      createdAt: '2026-07-23T11:00:00.000Z',
    });

    expect(store.createPackageTest(first)).toEqual(first);
    expect(store.createPackageTest(second)).toEqual(second);
    expect(store.listPackageTests('idea-1')).toEqual([second, first]);
    expect(() => store.createPackageTest(packageTest({
      id: 'package-test-missing',
      ideaId: 'missing',
    }))).toThrow(/foreign key/i);
  });
});
