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
    architecture: {
      sections: [],
      approvedMd: null,
      approvedAt: null,
    },
    architectureArtifactHash: null,
    narrationReconciliationRequired: false,
    approvedNarrationMd: null,
    approvedNarrationAt: null,
    approvedNarrationRevisionSeq: null,
    narrationArtifactHash: null,
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
  it('migrates a v1 state database through the shared v9 registry', () => {
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

    expect(version).toBe(9);
    expect(drafts).toEqual([
      'id',
      'episode_slug',
      'title',
      'format',
      'doc_json',
      'updated_at',
      'architecture_json',
      'architecture_artifact_hash',
      'narration_reconciliation_required',
      'approved_narration_md',
      'approved_narration_at',
      'approved_narration_revision_seq',
      'narration_artifact_hash',
    ]);
    expect(revisions).toEqual([
      'id',
      'draft_id',
      'seq',
      'op_id',
      'disposition',
      'doc_json',
      'created_at',
      'kind',
    ]);
  });

  it('persists drafts and returns null for a missing draft', () => {
    const store = openStore();
    const created = store.createDraft(draft());

    expect(created).toEqual(draft());
    expect(store.getDraft('draft-1')).toEqual(draft());
    expect(store.getDraft('missing')).toBeNull();
  });

  it('persists architecture sibling state, its CAS hash, and reconciliation flag', () => {
    const store = openStore();
    const record = draft({
      architecture: {
        sections: [{
          key: 'core-answer',
          title: 'Core answer',
          md: '### Core answer\n\nA mechanism.\n',
        }],
        approvedMd: '### Core answer\n\nA mechanism.\n',
        approvedAt: '2026-07-24T09:00:00.000Z',
      },
      architectureArtifactHash: 'sha256:architecture',
      narrationReconciliationRequired: true,
    });

    store.createDraft(record);

    expect(store.getDraft(record.id)).toEqual(record);
  });

  it('updates only the narration reconciliation flag and draft timestamp', () => {
    const store = openStore();
    store.createDraft(draft({
      narrationReconciliationRequired: true,
    }));

    const updated = store.setNarrationReconciliationRequired(
      'draft-1',
      false,
      '2026-07-24T10:00:00.000Z',
    );

    expect(updated).toMatchObject({
      narrationReconciliationRequired: false,
      updatedAt: '2026-07-24T10:00:00.000Z',
    });
    expect(updated.doc).toEqual(draft().doc);
    expect(updated.architecture).toEqual(draft().architecture);
  });

  it('returns an empty draft summary list', () => {
    const store = openStore();

    expect(store.listDrafts()).toEqual([]);
  });

  it('lists body-free draft summaries newest-updated first', () => {
    const store = openStore();
    store.createDraft(draft({
      id: 'draft-older',
      episodeSlug: 'older',
      title: 'Older draft',
      updatedAt: '2026-07-23T08:00:00.000Z',
    }));
    store.createDraft(draft({
      id: 'draft-newer',
      episodeSlug: 'newer',
      title: 'Newer draft',
      format: 'annotated',
      updatedAt: '2026-07-23T09:00:00.000Z',
    }));

    expect(store.listDrafts()).toEqual([
      {
        id: 'draft-newer',
        episodeSlug: 'newer',
        title: 'Newer draft',
        format: 'annotated',
        updatedAt: '2026-07-23T09:00:00.000Z',
      },
      {
        id: 'draft-older',
        episodeSlug: 'older',
        title: 'Older draft',
        format: 'narration',
        updatedAt: '2026-07-23T08:00:00.000Z',
      },
    ]);
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
    expect(first.revision.kind).toBe('narration');
    expect(second.revision.seq).toBe(2);
    expect(second.revision.kind).toBe('narration');
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
        kind: 'narration',
        doc: firstDoc,
        createdAt: '2026-07-23T08:01:00.000Z',
      },
      {
        id: 'revision-2',
        draftId: 'draft-1',
        seq: 2,
        opId: 'operation-7',
        disposition: 'accepted',
        kind: 'narration',
        doc: secondDoc,
        createdAt: '2026-07-23T08:02:00.000Z',
      },
    ]);
  });

  it('preserves server-owned workflow metadata across production imports', () => {
    const store = openStore();
    store.createDraft(draft({
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: '' },
        metadata: {
          topic: 'Stored topic',
          creativeStatus: {
            phase: 'rapid-prototype',
            readiness: 'EDITORIAL-DRAFT',
          },
          directionApproved: false,
        },
        content: [],
      },
    }));

    const imported = store.importPromotion('draft-1', {
      format: 'annotated',
      doc: {
        type: 'doc',
        attrs: { format: 'annotated', preamble: '' },
        metadata: {
          topic: 'Imported topic',
          creativeStatus: {
            phase: 'architecture',
            readiness: 'forged',
          },
          directionApproved: true,
        },
        content: [],
      },
      updatedAt: '2026-07-24T10:00:00.000Z',
      revision: {
        id: 'production-import-1',
        opId: 'promote-1',
        createdAt: '2026-07-24T10:00:00.000Z',
      },
    });

    expect(imported.draft.doc).toMatchObject({
      metadata: {
        topic: 'Imported topic',
        creativeStatus: {
          phase: 'rapid-prototype',
          readiness: 'EDITORIAL-DRAFT',
        },
        directionApproved: false,
      },
    });
    expect(imported.revision.doc).toEqual(imported.draft.doc);
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
