import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentStore } from '../../src/documents/store.js';
import {
  TopicStore,
  type IdeaRecord,
  type TopicRunRecord,
} from '../../src/topics/store.js';

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

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  for (const store of documentStores.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('TopicStore', () => {
  it('migrates a v2 state database to the v3 ideas and topic-runs schema', () => {
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
    inspected.close();

    expect(version).toBe(3);
    expect(ideas).toEqual([
      'id',
      'text',
      'source',
      'status',
      'created_at',
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
});
