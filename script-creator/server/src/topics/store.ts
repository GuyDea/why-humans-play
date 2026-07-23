import Database from 'better-sqlite3';
import { migrateStateDatabase } from '../state-migrations.js';
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

export interface TopicHandoffSagaRecord {
  runId: string;
  winnerSubject: string;
  input: unknown;
  draftId: string;
  draftCreated: boolean;
  artifactWritten: boolean;
  pipelineUpserted: boolean;
  ideaPromoted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IdeaRow {
  id: string;
  text: string;
  source: IdeaSource;
  status: IdeaStatus;
  created_at: string;
  latest_check_json: string | null;
}

interface StoredGateCheck {
  opId: string;
  result: GateCheckResult | null;
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

interface TopicHandoffSagaRow {
  run_id: string;
  winner_subject: string;
  input_json: string;
  draft_id: string;
  draft_created: 0 | 1;
  artifact_written: 0 | 1;
  pipeline_upserted: 0 | 1;
  idea_promoted: 0 | 1;
  created_at: string;
  updated_at: string;
}

function ideaFrom(row: IdeaRow): IdeaRecord {
  return {
    id: row.id,
    text: row.text,
    source: row.source,
    status: row.status,
    latestCheck: gateCheckFromJson(row.latest_check_json),
    createdAt: row.created_at,
  };
}

function gateCheckFromJson(value: string | null): GateCheckResult | null {
  if (value === null) return null;
  const parsed = JSON.parse(value) as GateCheckResult | StoredGateCheck;
  return isStoredGateCheck(parsed) ? parsed.result : parsed;
}

function isStoredGateCheck(
  value: GateCheckResult | StoredGateCheck,
): value is StoredGateCheck {
  return typeof value === 'object'
    && value !== null
    && 'opId' in value
    && 'result' in value;
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

function handoffSagaFrom(
  row: TopicHandoffSagaRow,
): TopicHandoffSagaRecord {
  return {
    runId: row.run_id,
    winnerSubject: row.winner_subject,
    input: JSON.parse(row.input_json) as unknown,
    draftId: row.draft_id,
    draftCreated: row.draft_created === 1,
    artifactWritten: row.artifact_written === 1,
    pipelineUpserted: row.pipeline_upserted === 1,
    ideaPromoted: row.idea_promoted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

  updateIdea(
    record: IdeaRecord,
    options: {
      preserveLatestCheck?: boolean;
      latestCheckOpId?: string;
    } = {},
  ): IdeaRecord {
    const latestCheckJson = options.preserveLatestCheck
      ? this.db.prepare<[string], { latest_check_json: string | null }>(
        'SELECT latest_check_json FROM ideas WHERE id = ?',
      ).get(record.id)?.latest_check_json ?? null
      : options.latestCheckOpId === undefined
        ? record.latestCheck === null
          ? null
          : JSON.stringify(record.latestCheck)
        : JSON.stringify({
          opId: options.latestCheckOpId,
          result: record.latestCheck,
        } satisfies StoredGateCheck);
    const result = this.db.prepare(
      `UPDATE ideas
       SET text = ?, source = ?, status = ?, latest_check_json = ?
       WHERE id = ?`,
    ).run(
      record.text,
      record.source,
      record.status,
      latestCheckJson,
      record.id,
    );
    if (result.changes === 0) {
      throw new Error(`idea not found: ${record.id}`);
    }
    return this.getIdea(record.id)!;
  }

  getIdeaLatestCheckOpId(id: string): string | null {
    const row = this.db.prepare<[string], { latest_check_json: string | null }>(
      'SELECT latest_check_json FROM ideas WHERE id = ?',
    ).get(id);
    if (!row?.latest_check_json) return null;
    const parsed = JSON.parse(row.latest_check_json) as
      | GateCheckResult
      | StoredGateCheck;
    return isStoredGateCheck(parsed) ? parsed.opId : null;
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

  createHandoffSaga(
    record: TopicHandoffSagaRecord,
  ): TopicHandoffSagaRecord {
    this.db.prepare(
      `INSERT INTO topic_handoff_sagas (
        run_id, winner_subject, input_json, draft_id, draft_created,
        artifact_written, pipeline_upserted, idea_promoted, created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.runId,
      record.winnerSubject,
      JSON.stringify(record.input),
      record.draftId,
      record.draftCreated ? 1 : 0,
      record.artifactWritten ? 1 : 0,
      record.pipelineUpserted ? 1 : 0,
      record.ideaPromoted ? 1 : 0,
      record.createdAt,
      record.updatedAt,
    );
    return this.getHandoffSaga(record.runId, record.winnerSubject)!;
  }

  getHandoffSaga(
    runId: string,
    winnerSubject: string,
  ): TopicHandoffSagaRecord | null {
    const row = this.db.prepare<
      [string, string],
      TopicHandoffSagaRow
    >(
      `SELECT * FROM topic_handoff_sagas
       WHERE run_id = ? AND winner_subject = ?`,
    ).get(runId, winnerSubject);
    return row ? handoffSagaFrom(row) : null;
  }

  updateHandoffSaga(
    record: TopicHandoffSagaRecord,
  ): TopicHandoffSagaRecord {
    const result = this.db.prepare(
      `UPDATE topic_handoff_sagas
       SET input_json = ?, draft_id = ?, draft_created = ?,
         artifact_written = ?, pipeline_upserted = ?, idea_promoted = ?,
         updated_at = ?
       WHERE run_id = ? AND winner_subject = ?`,
    ).run(
      JSON.stringify(record.input),
      record.draftId,
      record.draftCreated ? 1 : 0,
      record.artifactWritten ? 1 : 0,
      record.pipelineUpserted ? 1 : 0,
      record.ideaPromoted ? 1 : 0,
      record.updatedAt,
      record.runId,
      record.winnerSubject,
    );
    if (result.changes === 0) {
      throw new Error(
        `topic handoff saga not found: ${record.runId}/${record.winnerSubject}`,
      );
    }
    return this.getHandoffSaga(record.runId, record.winnerSubject)!;
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    migrateStateDatabase(this.db);
  }
}
