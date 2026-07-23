import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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
});

describe('shared state migration registry', () => {
  it('owns one documented global sequence through the architecture reservation', () => {
    expect(STATE_MIGRATIONS.map(({ version, owner, name }) => ({
      version,
      owner,
      name,
    }))).toEqual([
      { version: 1, owner: 'documents', name: 'legacy-state-baseline' },
      { version: 2, owner: 'documents', name: 'drafts-and-revisions' },
      { version: 3, owner: 'topics', name: 'topic-workbench' },
      { version: 4, owner: 'topics', name: 'gate-check-persistence' },
      { version: 5, owner: 'architecture', name: 'reserved-placeholder' },
    ]);
    expect(LATEST_STATE_SCHEMA_VERSION).toBe(5);
  });

  it.each([2, 3, 4] as const)(
    'reopens and upgrades a simulated v%s database through the shared registry',
    (version) => {
      const dbFile = simulatedDatabase(version);

      documentStores.push(new DocumentStore(dbFile));
      topicStores.push(new TopicStore(dbFile));

      const inspected = new Database(dbFile, { readonly: true });
      const userVersion = inspected.pragma('user_version', { simple: true });
      const ideaColumns = columns(inspected, 'ideas');
      const handoffColumns = columns(inspected, 'topic_handoff_sagas');
      inspected.close();

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
      format TEXT NOT NULL,
      doc_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE revisions (
      id TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      op_id TEXT,
      disposition TEXT NOT NULL,
      doc_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  if (version >= 3) {
    db.exec(`
      CREATE TABLE ideas (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE topic_runs (
        id TEXT PRIMARY KEY,
        op_id TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL,
        report_md TEXT,
        summary_json TEXT,
        summary_error TEXT,
        result_extracted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE package_tests (
        id TEXT PRIMARY KEY,
        idea_id TEXT NOT NULL,
        op_id TEXT NOT NULL,
        directions_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }
  if (version >= 4) {
    db.exec('ALTER TABLE ideas ADD COLUMN latest_check_json TEXT');
  }
  db.pragma(`user_version = ${version}`);
  db.close();
  return dbFile;
}

function columns(db: Database.Database, table: string): string[] {
  return db.prepare<[], { name: string }>(`PRAGMA table_info(${table})`)
    .all()
    .map(({ name }) => name);
}
