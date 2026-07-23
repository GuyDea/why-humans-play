import type Database from 'better-sqlite3';

export interface StateMigration {
  version: number;
  owner: 'documents' | 'topics' | 'architecture';
  name: string;
  apply(db: Database.Database): void;
}

const DOCUMENTS_V2 = `
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  episode_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('annotated', 'narration')),
  doc_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  op_id TEXT,
  disposition TEXT NOT NULL,
  doc_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (draft_id, seq)
);

CREATE INDEX IF NOT EXISTS revisions_draft_seq
  ON revisions (draft_id, seq);
`;

const TOPICS_V3 = `
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('inbox', 'ideate')),
  status TEXT NOT NULL CHECK (status IN ('open', 'promoted', 'discarded')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topic_runs (
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

CREATE INDEX IF NOT EXISTS topic_runs_created_at
  ON topic_runs (created_at);

CREATE TABLE IF NOT EXISTS package_tests (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  op_id TEXT NOT NULL,
  directions_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS package_tests_idea_created
  ON package_tests (idea_id, created_at DESC);

CREATE TABLE IF NOT EXISTS topic_handoff_sagas (
  run_id TEXT NOT NULL,
  winner_subject TEXT NOT NULL,
  input_json TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  draft_created INTEGER NOT NULL DEFAULT 0
    CHECK (draft_created IN (0, 1)),
  artifact_written INTEGER NOT NULL DEFAULT 0
    CHECK (artifact_written IN (0, 1)),
  pipeline_upserted INTEGER NOT NULL DEFAULT 0
    CHECK (pipeline_upserted IN (0, 1)),
  idea_promoted INTEGER NOT NULL DEFAULT 0
    CHECK (idea_promoted IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (run_id, winner_subject)
);
`;

export const STATE_MIGRATIONS: readonly StateMigration[] = [
  {
    version: 1,
    owner: 'documents',
    name: 'legacy-state-baseline',
    apply: () => {},
  },
  {
    version: 2,
    owner: 'documents',
    name: 'drafts-and-revisions',
    apply: (db) => db.exec(DOCUMENTS_V2),
  },
  {
    version: 3,
    owner: 'topics',
    name: 'topic-workbench',
    apply: (db) => db.exec(TOPICS_V3),
  },
  {
    version: 4,
    owner: 'topics',
    name: 'gate-check-persistence',
    apply: (db) => ensureColumn(
      db,
      'ideas',
      'latest_check_json',
      'ALTER TABLE ideas ADD COLUMN latest_check_json TEXT',
    ),
  },
  {
    version: 5,
    owner: 'architecture',
    name: 'reserved-placeholder',
    apply: () => {},
  },
];

export const LATEST_STATE_SCHEMA_VERSION =
  STATE_MIGRATIONS.at(-1)!.version;

export function migrateStateDatabase(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number;
  if (version > LATEST_STATE_SCHEMA_VERSION) {
    throw new Error(
      `state database schema version ${version} is newer than supported version ${LATEST_STATE_SCHEMA_VERSION}`,
    );
  }

  db.transaction(() => {
    for (const migration of STATE_MIGRATIONS) migration.apply(db);
    if (version < LATEST_STATE_SCHEMA_VERSION) {
      db.pragma(`user_version = ${LATEST_STATE_SCHEMA_VERSION}`);
    }
  })();
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  sql: string,
): void {
  const columns = new Set(
    db.prepare<[], { name: string }>(`PRAGMA table_info(${table})`)
      .all()
      .map(({ name }) => name),
  );
  if (!columns.has(column)) db.exec(sql);
}
