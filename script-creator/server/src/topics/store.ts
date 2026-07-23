import Database from 'better-sqlite3';
import { MIGRATION_V2 } from '../documents/store.js';
import type { OperationState } from '../types.js';

export type IdeaSource = 'inbox' | 'ideate';
export type IdeaStatus = 'open' | 'promoted' | 'discarded';

export interface IdeaRecord {
  id: string;
  text: string;
  source: IdeaSource;
  status: IdeaStatus;
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

const SCHEMA_VERSION = 3;
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
`;

function ideaFrom(row: IdeaRow): IdeaRecord {
  return {
    id: row.id,
    text: row.text,
    source: row.source,
    status: row.status,
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

export class TopicStore {
  private readonly db: Database.Database;

  constructor(dbFile: string) {
    this.db = new Database(dbFile);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');
    this.migrate();
  }

  createIdea(record: IdeaRecord): IdeaRecord {
    this.db.prepare(
      `INSERT INTO ideas (id, text, source, status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.text,
      record.source,
      record.status,
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
       SET text = ?, source = ?, status = ?
       WHERE id = ?`,
    ).run(record.text, record.source, record.status, record.id);
    if (result.changes === 0) {
      throw new Error(`idea not found: ${record.id}`);
    }
    return this.getIdea(record.id)!;
  }

  deleteIdea(id: string): boolean {
    return this.db.prepare('DELETE FROM ideas WHERE id = ?').run(id)
      .changes > 0;
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
    if (version < SCHEMA_VERSION) {
      this.db.transaction(() => {
        if (version < 2) this.db.exec(MIGRATION_V2);
        this.db.exec(MIGRATION_V3);
        this.db.pragma(`user_version = ${SCHEMA_VERSION}`);
      })();
    }
  }
}
