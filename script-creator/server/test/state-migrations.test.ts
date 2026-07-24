import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentStore } from '../src/documents/store.js';
import {
  LATEST_STATE_SCHEMA_VERSION,
  STATE_MIGRATIONS,
} from '../src/state-migrations.js';
import { TopicStore } from '../src/topics/store.js';

const roots: string[] = [];
const documentStores: DocumentStore[] = [];
const topicStores: TopicStore[] = [];

afterEach(() => {
  for (const store of topicStores.splice(0)) store.close();
  for (const store of documentStores.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

describe('shared state migration registry', () => {
  it('owns one documented global sequence through milestone workspaces', () => {
    expect(STATE_MIGRATIONS.map(({ version, owner, name }) => ({
      version,
      owner,
      name,
    }))).toEqual([
      { version: 1, owner: 'documents', name: 'legacy-state-baseline' },
      { version: 2, owner: 'documents', name: 'drafts-and-revisions' },
      { version: 3, owner: 'topics', name: 'topic-workbench' },
      { version: 4, owner: 'topics', name: 'gate-check-persistence' },
      { version: 5, owner: 'topics', name: 'topic-handoff-saga' },
      { version: 6, owner: 'architecture', name: 'architecture-stage' },
      { version: 7, owner: 'architecture', name: 'staged-promotion' },
      { version: 8, owner: 'milestones', name: 'episode-milestones' },
    ]);
    expect(LATEST_STATE_SCHEMA_VERSION).toBe(8);
  });

  it('migrates a populated v5 database without changing document JSON bytes', () => {
    const dbFile = simulatedV5Database();
    const before = new Database(dbFile);
    const docJson = '{\n  "type": "doc", "attrs": {"format":"narration"}\n}';
    before.prepare(
      `INSERT INTO drafts (
        id, episode_slug, title, format, doc_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'draft-v5',
      'draft-v5',
      'Draft V5',
      'narration',
      docJson,
      '2026-07-24T08:00:00.000Z',
    );
    before.prepare(
      `INSERT INTO revisions (
        id, draft_id, seq, op_id, disposition, doc_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'revision-v5',
      'draft-v5',
      1,
      null,
      'manual-save',
      docJson,
      '2026-07-24T08:01:00.000Z',
    );
    before.close();

    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    const migratedDraft = inspected.prepare<[string], {
      doc_json: string;
      architecture_json: string;
      architecture_artifact_hash: string | null;
      narration_reconciliation_required: number;
    }>(
      `SELECT doc_json, architecture_json, architecture_artifact_hash,
              narration_reconciliation_required
       FROM drafts WHERE id = ?`,
    ).get('draft-v5')!;
    const migratedRevision = inspected.prepare<[string], {
      doc_json: string;
      kind: string;
    }>(
      'SELECT doc_json, kind FROM revisions WHERE id = ?',
    ).get('revision-v5')!;
    inspected.close();

    expect(migratedDraft).toEqual({
      doc_json: docJson,
      architecture_json: JSON.stringify({
        sections: [],
        approvedMd: null,
        approvedAt: null,
      }),
      architecture_artifact_hash: null,
      narration_reconciliation_required: 0,
    });
    expect(migratedRevision).toEqual({
      doc_json: docJson,
      kind: 'narration',
    });
  });

  it('creates the complete v8 schema for a fresh database', () => {
    const dbFile = join(
      roots[roots.push(mkdtempSync(join(tmpdir(), 'state-fresh-'))) - 1]!,
      'state.sqlite3',
    );
    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    expect(columns(inspected, 'drafts')).toEqual([
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
    expect(columns(inspected, 'revisions')).toEqual([
      'id',
      'draft_id',
      'seq',
      'op_id',
      'disposition',
      'doc_json',
      'created_at',
      'kind',
    ]);
    expect(columns(inspected, 'architecture_sagas')).toEqual([
      'draft_id',
      'action',
      'expected_revision_seq',
      'input_json',
      'revision_appended',
      'artifact_written',
      'pipeline_upserted',
      'draft_updated',
      'created_at',
      'updated_at',
    ]);
    expect(columns(inspected, 'promotions')).toEqual([
      'draft_id',
      'operation_id',
      'state',
      'target_path',
      'target_hash',
      'import_revision_id',
      'validation_hash',
      'error',
      'created_at',
      'updated_at',
    ]);
    expect(columns(inspected, 'narration_settled_exports')).toEqual([
      'token',
      'draft_id',
      'revision_seq',
      'narration_md',
      'created_at',
    ]);
    expect(columns(inspected, 'narration_proposals')).toEqual([
      'draft_id',
      'operation_id',
      'state',
      'created_at',
      'resolved_at',
    ]);
    expect(columns(inspected, 'episode_workspaces')).toEqual([
      'draft_id',
      'episode_slug',
      'choice',
      'branch_name',
      'worktree_path',
      'base_branch',
      'created_at',
      'updated_at',
    ]);
    expect(columns(inspected, 'pending_milestones')).toEqual([
      'id',
      'draft_id',
      'episode_slug',
      'kind',
      'files_json',
      'commit_message',
      'source_hashes_json',
      'base_commit_hash',
      'reconciliation_required',
      'state',
      'resulting_commit_hash',
      'created_at',
      'updated_at',
    ]);
    inspected.close();
  });

  it('does not reapply migration v6 to an already-v6 database', () => {
    const dbFile = simulatedV5Database();
    documentStores.push(new DocumentStore(dbFile));
    documentStores.pop()!.close();

    const db = new Database(dbFile);
    db.prepare(
      `INSERT INTO drafts (
        id, episode_slug, title, format, doc_json, updated_at,
        architecture_json, architecture_artifact_hash,
        narration_reconciliation_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'draft-v6',
      'draft-v6',
      'Draft V6',
      'narration',
      '{}',
      '2026-07-24T08:00:00.000Z',
      '{"sections":[{"key":"x","title":"X","md":"### X"}],"approvedMd":null,"approvedAt":null}',
      'sha256:last-known',
      1,
    );
    db.close();

    const migration = STATE_MIGRATIONS.find(({ version }) => version === 6)!;
    const apply = vi.spyOn(migration, 'apply');
    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    const row = inspected.prepare<[], {
      architecture_json: string;
      architecture_artifact_hash: string;
      narration_reconciliation_required: number;
    }>(
      `SELECT architecture_json, architecture_artifact_hash,
              narration_reconciliation_required
       FROM drafts WHERE id = 'draft-v6'`,
    ).get()!;
    inspected.close();

    expect(apply).not.toHaveBeenCalled();
    expect(row).toEqual({
      architecture_json: '{"sections":[{"key":"x","title":"X","md":"### X"}],"approvedMd":null,"approvedAt":null}',
      architecture_artifact_hash: 'sha256:last-known',
      narration_reconciliation_required: 1,
    });
  });

  it('applies migration v7 once without changing existing document JSON bytes', () => {
    const dbFile = simulatedV5Database();
    const first = new DocumentStore(dbFile);
    first.close();
    const db = new Database(dbFile);
    const docJson = '{"type":"doc","attrs":{"format":"narration"},"content":[]}';
    db.prepare(
      `INSERT INTO drafts (
        id, episode_slug, title, format, doc_json, updated_at,
        architecture_json, architecture_artifact_hash,
        narration_reconciliation_required, approved_narration_md,
        approved_narration_at, approved_narration_revision_seq,
        narration_artifact_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'draft-v7',
      'draft-v7',
      'Draft V7',
      'narration',
      docJson,
      '2026-07-24T08:00:00.000Z',
      '{"sections":[],"approvedMd":null,"approvedAt":null}',
      null,
      0,
      'approved bytes',
      '2026-07-24T08:01:00.000Z',
      3,
      'draft-hash',
    );
    db.close();

    const migration = STATE_MIGRATIONS.find(({ version }) => version === 7)!;
    const apply = vi.spyOn(migration, 'apply');
    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    const row = inspected.prepare<[], {
      doc_json: string;
      approved_narration_md: string;
      approved_narration_revision_seq: number;
      narration_artifact_hash: string;
    }>(
      `SELECT doc_json, approved_narration_md,
              approved_narration_revision_seq, narration_artifact_hash
       FROM drafts WHERE id = 'draft-v7'`,
    ).get()!;
    inspected.close();

    expect(apply).not.toHaveBeenCalled();
    expect(row).toEqual({
      doc_json: docJson,
      approved_narration_md: 'approved bytes',
      approved_narration_revision_seq: 3,
      narration_artifact_hash: 'draft-hash',
    });
  });

  it('applies migration v8 exactly once without storing editorial content', () => {
    const dbFile = simulatedV7Database();
    const migration = STATE_MIGRATIONS.find(({ version }) => version === 8)!;
    const apply = vi.spyOn(migration, 'apply');
    documentStores.push(new DocumentStore(dbFile));
    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    const workspaceSql = inspected.prepare<[string], { sql: string }>(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`,
    ).get('episode_workspaces')!.sql;
    const milestoneSql = inspected.prepare<[string], { sql: string }>(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`,
    ).get('pending_milestones')!.sql;
    inspected.close();

    expect(apply).toHaveBeenCalledOnce();
    expect(`${workspaceSql}\n${milestoneSql}`).not.toMatch(
      /(?:markdown|content|doc_json|approved_md)/i,
    );
  });

  it.each([2, 3, 4] as const)(
    'applies only pending migrations to a genuine v%s database exactly once',
    (version) => {
      const dbFile = simulatedDatabase(version);
      const before = new Database(dbFile, { readonly: true });
      expect(before.pragma('user_version', { simple: true })).toBe(version);
      expect(tableExists(before, 'topic_handoff_sagas')).toBe(false);
      before.close();

      const applications: Array<{
        version: number;
        previousVersion: number;
      }> = [];
      for (const migration of STATE_MIGRATIONS) {
        const apply = migration.apply;
        vi.spyOn(migration, 'apply').mockImplementation((db) => {
          applications.push({
            version: migration.version,
            previousVersion: db.pragma(
              'user_version',
              { simple: true },
            ) as number,
          });
          apply(db);
        });
      }

      documentStores.push(new DocumentStore(dbFile));
      topicStores.push(new TopicStore(dbFile));
      documentStores.push(new DocumentStore(dbFile));
      topicStores.push(new TopicStore(dbFile));

      const inspected = new Database(dbFile, { readonly: true });
      const userVersion = inspected.pragma('user_version', { simple: true });
      const ideaColumns = columns(inspected, 'ideas');
      const handoffColumns = columns(inspected, 'topic_handoff_sagas');
      inspected.close();

      expect(applications).toEqual(
        Array.from(
          { length: LATEST_STATE_SCHEMA_VERSION - version },
          (_, index) => ({
            version: version + index + 1,
            previousVersion: version + index,
          }),
        ),
      );
      expect(userVersion).toBe(LATEST_STATE_SCHEMA_VERSION);
      expect(ideaColumns).toContain('latest_check_json');
      expect(handoffColumns).toEqual([
        'run_id',
        'winner_subject',
        'input_json',
        'draft_id',
        'draft_created',
        'artifact_written',
        'pipeline_upserted',
        'idea_promoted',
        'created_at',
        'updated_at',
      ]);
    },
  );
});

function simulatedDatabase(version: 2 | 3 | 4): string {
  const root = mkdtempSync(join(tmpdir(), `state-v${version}-`));
  roots.push(root);
  const dbFile = join(root, 'state.sqlite3');
  const db = new Database(dbFile);
  db.exec(`
    CREATE TABLE drafts (
      id TEXT PRIMARY KEY,
      episode_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      format TEXT NOT NULL CHECK (format IN ('annotated', 'narration')),
      doc_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE revisions (
      id TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
      seq INTEGER NOT NULL,
      op_id TEXT,
      disposition TEXT NOT NULL,
      doc_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (draft_id, seq)
    );
    CREATE INDEX revisions_draft_seq ON revisions (draft_id, seq);
  `);
  if (version >= 3) {
    db.exec(`
      CREATE TABLE ideas (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('inbox', 'ideate')),
        status TEXT NOT NULL CHECK (status IN ('open', 'promoted', 'discarded')),
        created_at TEXT NOT NULL
      );
      CREATE TABLE topic_runs (
        id TEXT PRIMARY KEY,
        op_id TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL,
        report_md TEXT,
        summary_json TEXT,
        summary_error TEXT,
        result_extracted INTEGER NOT NULL DEFAULT 0
          CHECK (result_extracted IN (0, 1)),
        created_at TEXT NOT NULL
      );
      CREATE INDEX topic_runs_created_at ON topic_runs (created_at);
      CREATE TABLE package_tests (
        id TEXT PRIMARY KEY,
        idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
        op_id TEXT NOT NULL,
        directions_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX package_tests_idea_created
        ON package_tests (idea_id, created_at DESC);
    `);
  }
  if (version >= 4) {
    db.exec('ALTER TABLE ideas ADD COLUMN latest_check_json TEXT');
  }
  db.pragma(`user_version = ${version}`);
  db.close();
  return dbFile;
}

function simulatedV5Database(): string {
  const root = mkdtempSync(join(tmpdir(), 'state-v5-'));
  roots.push(root);
  const dbFile = join(root, 'state.sqlite3');
  const db = new Database(dbFile);
  for (const migration of STATE_MIGRATIONS) {
    if (migration.version > 5) break;
    migration.apply(db);
    db.pragma(`user_version = ${migration.version}`);
  }
  db.close();
  return dbFile;
}

function simulatedV7Database(): string {
  const root = mkdtempSync(join(tmpdir(), 'state-v7-'));
  roots.push(root);
  const dbFile = join(root, 'state.sqlite3');
  const db = new Database(dbFile);
  for (const migration of STATE_MIGRATIONS) {
    if (migration.version > 7) break;
    migration.apply(db);
    db.pragma(`user_version = ${migration.version}`);
  }
  db.close();
  return dbFile;
}

function columns(db: Database.Database, table: string): string[] {
  return db.prepare<[], { name: string }>(`PRAGMA table_info(${table})`)
    .all()
    .map(({ name }) => name);
}

function tableExists(db: Database.Database, table: string): boolean {
  return db.prepare<[string], { count: number }>(
    `SELECT COUNT(*) AS count
     FROM sqlite_master
     WHERE type = 'table' AND name = ?`,
  ).get(table)!.count === 1;
}
