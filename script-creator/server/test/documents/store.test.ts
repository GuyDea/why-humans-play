import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DocumentStore,
  type DraftRecord,
} from '../../src/documents/store.js';

const roots: string[] = [];
const stores: DocumentStore[] = [];

function databaseFile(): string {
  const root = mkdtempSync(join(tmpdir(), 'document-store-'));
  roots.push(root);
  return join(root, 'state.sqlite3');
}

function openStore(dbFile = databaseFile()): DocumentStore {
  const store = new DocumentStore(dbFile);
  stores.push(store);
  return store;
}

function draft(
  overrides: Partial<DraftRecord> = {},
): DraftRecord {
  return {
    id: 'draft-1',
    episodeSlug: 'episode-one',
    title: 'Episode One',
    format: 'narration',
    doc: {
      type: 'doc',
      attrs: { format: 'narration', preamble: '' },
      content: [],
    },
    updatedAt: '2026-07-23T08:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('DocumentStore', () => {
  it('migrates a v1 state database to the v2 drafts and revisions schema', () => {
    const dbFile = databaseFile();
    const before = new Database(dbFile);
    before.exec(`
      CREATE TABLE jobs (id TEXT PRIMARY KEY);
      PRAGMA user_version = 1;
    `);
    before.close();

    openStore(dbFile);

    const inspected = new Database(dbFile, { readonly: true });
    const version = inspected.pragma('user_version', { simple: true });
    const drafts = inspected
      .prepare<[], { name: string }>('PRAGMA table_info(drafts)')
      .all()
      .map((column) => column.name);
    const revisions = inspected
      .prepare<[], { name: string }>('PRAGMA table_info(revisions)')
      .all()
      .map((column) => column.name);
    inspected.close();

    expect(version).toBe(2);
    expect(drafts).toEqual([
      'id',
      'episode_slug',
      'title',
      'format',
      'doc_json',
      'updated_at',
    ]);
    expect(revisions).toEqual([
      'id',
      'draft_id',
      'seq',
      'op_id',
      'disposition',
      'doc_json',
      'created_at',
    ]);
  });

  it('persists drafts and returns null for a missing draft', () => {
    const store = openStore();
    const created = store.createDraft(draft());

    expect(created).toEqual(draft());
    expect(store.getDraft('draft-1')).toEqual(draft());
    expect(store.getDraft('missing')).toBeNull();
  });

  it('updates the draft and appends immutable revisions with monotonic sequence numbers', () => {
    const store = openStore();
    store.createDraft(draft());
    const firstDoc = {
      type: 'doc',
      attrs: { format: 'narration', preamble: '# Revised\n\n' },
      content: [],
    };
    const secondDoc = {
      type: 'doc',
      attrs: { format: 'annotated', preamble: '# Final\n\n' },
      content: [],
    };

    const first = store.saveDraft('draft-1', {
      title: 'Revised',
      format: 'narration',
      doc: firstDoc,
      updatedAt: '2026-07-23T08:01:00.000Z',
      revision: {
        id: 'revision-1',
        opId: null,
        disposition: 'manual-save',
        createdAt: '2026-07-23T08:01:00.000Z',
      },
    });
    const second = store.saveDraft('draft-1', {
      title: 'Final',
      format: 'annotated',
      doc: secondDoc,
      updatedAt: '2026-07-23T08:02:00.000Z',
      revision: {
        id: 'revision-2',
        opId: 'operation-7',
        disposition: 'accepted',
        createdAt: '2026-07-23T08:02:00.000Z',
      },
    });

    expect(first.revision.seq).toBe(1);
    expect(second.revision.seq).toBe(2);
    expect(store.getDraft('draft-1')).toMatchObject({
      title: 'Final',
      format: 'annotated',
      doc: secondDoc,
      updatedAt: '2026-07-23T08:02:00.000Z',
    });
    expect(store.listRevisions('draft-1')).toEqual([
      {
        id: 'revision-1',
        draftId: 'draft-1',
        seq: 1,
        opId: null,
        disposition: 'manual-save',
        doc: firstDoc,
        createdAt: '2026-07-23T08:01:00.000Z',
      },
      {
        id: 'revision-2',
        draftId: 'draft-1',
        seq: 2,
        opId: 'operation-7',
        disposition: 'accepted',
        doc: secondDoc,
        createdAt: '2026-07-23T08:02:00.000Z',
      },
    ]);
  });

  it('does not append a revision when the draft does not exist', () => {
    const store = openStore();

    expect(() => store.saveDraft('missing', {
      title: 'Missing',
      format: 'narration',
      doc: draft().doc,
      updatedAt: '2026-07-23T08:01:00.000Z',
      revision: {
        id: 'revision-missing',
        opId: null,
        disposition: 'manual-save',
        createdAt: '2026-07-23T08:01:00.000Z',
      },
    })).toThrow(/draft not found: missing/i);
    expect(store.listRevisions('missing')).toEqual([]);
  });
});
