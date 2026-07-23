import Database from 'better-sqlite3';
import { MIGRATION_V2 } from '../documents/store.js';
import type { OperationState } from '../types.js';

export type IdeaSource = 'inbox' | 'ideate';
export type IdeaStatus = 'open' | 'promoted' | 'discarded';
export type TopicGateName =
  | 'game_play_centrality'
  | 'human_revelation'
  | 'recognized_payoff'
  | 'evidence_path'
  | 'production_reality'
  | 'portfolio_fit';
export type GateVerdict = 'pass' | 'fail' | 'unknown';

export interface GateCheckResult {
  verdict: GateVerdict;
  gates: Array<{
    gate: TopicGateName;
    verdict: GateVerdict;
    reasonMarkdown: string;
  }>;
}

export interface IdeaRecord {
  id: string;
  text: string;
  source: IdeaSource;
  status: IdeaStatus;
  latestCheck: GateCheckResult | null;
  createdAt: string;
}

export interface PackageDirection {
  working_title: string;
  intended_viewer: string;
  familiar_markdown: string;
  surprise_markdown: string;
  visual_promise_markdown: string;
  delivered_payoff_markdown: string;
  survives_honestly: boolean;
  reason_markdown: string;
}

export interface PackageTestRecord {
  id: string;
  ideaId: string;
  opId: string;
  directions: PackageDirection[];
  createdAt: string;
}

export interface TopicRunRecord {
  id: string;
  opId: string;
  state: OperationState;
  reportMd: string | null;
  summary: unknown | null;
  summaryError: string | null;
  resultExtracted: boolean;
  createdAt: string;
}

interface IdeaRow {
  id: string;
  text: string;
  source: IdeaSource;
  status: IdeaStatus;
  created_at: string;
  latest_check_json: string | null;
}

interface TopicRunRow {
  id: string;
  op_id: string;
  state: OperationState;
  report_md: string | null;
  summary_json: string | null;
  summary_error: string | null;
  result_extracted: 0 | 1;
  created_at: string;
}

interface PackageTestRow {
  id: string;
  idea_id: string;
  op_id: string;
  directions_json: string;
  created_at: string;
}

const SCHEMA_VERSION = 4;
const MIGRATION_V3 = `
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
`;
const MIGRATION_V4 = `
ALTER TABLE ideas ADD COLUMN latest_check_json TEXT;
`;

function ideaFrom(row: IdeaRow): IdeaRecord {
  return {
    id: row.id,
    text: row.text,
    source: row.source,
    status: row.status,
    latestCheck: row.latest_check_json === null
      ? null
      : JSON.parse(row.latest_check_json) as GateCheckResult,
    createdAt: row.created_at,
  };
}

function runFrom(row: TopicRunRow): TopicRunRecord {
  return {
    id: row.id,
    opId: row.op_id,
    state: row.state,
    reportMd: row.report_md,
    summary: row.summary_json === null
      ? null
      : JSON.parse(row.summary_json) as unknown,
    summaryError: row.summary_error,
    resultExtracted: row.result_extracted === 1,
    createdAt: row.created_at,
  };
}

function packageTestFrom(row: PackageTestRow): PackageTestRecord {
  return {
    id: row.id,
    ideaId: row.idea_id,
    opId: row.op_id,
    directions: JSON.parse(row.directions_json) as PackageDirection[],
    createdAt: row.created_at,
  };
}

export class TopicStore {
  private readonly db: Database.Database;

  constructor(dbFile: string) {
    this.db = new Database(dbFile);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  createIdea(record: IdeaRecord): IdeaRecord {
    this.db.prepare(
      `INSERT INTO ideas (
        id, text, source, status, latest_check_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.text,
      record.source,
      record.status,
      record.latestCheck === null
        ? null
        : JSON.stringify(record.latestCheck),
      record.createdAt,
    );
    return this.getIdea(record.id)!;
  }

  getIdea(id: string): IdeaRecord | null {
    const row = this.db.prepare<[string], IdeaRow>(
      'SELECT * FROM ideas WHERE id = ?',
    ).get(id);
    return row ? ideaFrom(row) : null;
  }

  listIdeas(): IdeaRecord[] {
    return this.db.prepare<[], IdeaRow>(
      `SELECT * FROM ideas
       ORDER BY created_at DESC, rowid DESC`,
    ).all().map(ideaFrom);
  }

  updateIdea(record: IdeaRecord): IdeaRecord {
    const result = this.db.prepare(
      `UPDATE ideas
       SET text = ?, source = ?, status = ?, latest_check_json = ?
       WHERE id = ?`,
    ).run(
      record.text,
      record.source,
      record.status,
      record.latestCheck === null
        ? null
        : JSON.stringify(record.latestCheck),
      record.id,
    );
    if (result.changes === 0) {
      throw new Error(`idea not found: ${record.id}`);
    }
    return this.getIdea(record.id)!;
  }

  deleteIdea(id: string): boolean {
    return this.db.prepare('DELETE FROM ideas WHERE id = ?').run(id)
      .changes > 0;
  }

  createPackageTest(record: PackageTestRecord): PackageTestRecord {
    this.db.prepare(
      `INSERT INTO package_tests (
        id, idea_id, op_id, directions_json, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.ideaId,
      record.opId,
      JSON.stringify(record.directions),
      record.createdAt,
    );
    const saved = this.db.prepare<[string], PackageTestRow>(
      'SELECT * FROM package_tests WHERE id = ?',
    ).get(record.id)!;
    return packageTestFrom(saved);
  }

  listPackageTests(ideaId: string): PackageTestRecord[] {
    return this.db.prepare<[string], PackageTestRow>(
      `SELECT * FROM package_tests
       WHERE idea_id = ?
       ORDER BY created_at DESC, rowid DESC`,
    ).all(ideaId).map(packageTestFrom);
  }

  createRun(record: TopicRunRecord): TopicRunRecord {
    this.db.prepare(
      `INSERT INTO topic_runs (
        id, op_id, state, report_md, summary_json, summary_error,
        result_extracted, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.opId,
      record.state,
      record.reportMd,
      record.summary === null ? null : JSON.stringify(record.summary),
      record.summaryError,
      record.resultExtracted ? 1 : 0,
      record.createdAt,
    );
    return this.getRun(record.id)!;
  }

  getRun(id: string): TopicRunRecord | null {
    const row = this.db.prepare<[string], TopicRunRow>(
      'SELECT * FROM topic_runs WHERE id = ?',
    ).get(id);
    return row ? runFrom(row) : null;
  }

  getRunByOpId(opId: string): TopicRunRecord | null {
    const row = this.db.prepare<[string], TopicRunRow>(
      'SELECT * FROM topic_runs WHERE op_id = ?',
    ).get(opId);
    return row ? runFrom(row) : null;
  }

  listRuns(): TopicRunRecord[] {
    return this.db.prepare<[], TopicRunRow>(
      `SELECT * FROM topic_runs
       ORDER BY created_at DESC, rowid DESC`,
    ).all().map(runFrom);
  }

  updateRun(record: TopicRunRecord): TopicRunRecord {
    const result = this.db.prepare(
      `UPDATE topic_runs
       SET state = ?, report_md = ?, summary_json = ?,
         summary_error = ?, result_extracted = ?
       WHERE id = ?`,
    ).run(
      record.state,
      record.reportMd,
      record.summary === null ? null : JSON.stringify(record.summary),
      record.summaryError,
      record.resultExtracted ? 1 : 0,
      record.id,
    );
    if (result.changes === 0) {
      throw new Error(`topic run not found: ${record.id}`);
    }
    return this.getRun(record.id)!;
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    const version = this.db.pragma('user_version', { simple: true }) as number;
    if (version > SCHEMA_VERSION) {
      throw new Error(
        `state database schema version ${version} is newer than supported version ${SCHEMA_VERSION}`,
      );
    }
    this.db.transaction(() => {
      if (version < 2) this.db.exec(MIGRATION_V2);
      this.db.exec(MIGRATION_V3);
      if (version < 4) this.db.exec(MIGRATION_V4);
      if (version < SCHEMA_VERSION) {
        this.db.pragma(`user_version = ${SCHEMA_VERSION}`);
      }
    })();
  }
}
