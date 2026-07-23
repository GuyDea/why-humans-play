import Database from 'better-sqlite3';
import { migrateStateDatabase } from '../state-migrations.js';
import type { ArchitectureSection } from '../architecture/codec.js';

export type DraftFormat = 'annotated' | 'narration';
export type DraftDocument = Record<string, unknown>;
export type RevisionKind = 'narration' | 'architecture';

export interface DraftArchitecture {
  sections: ArchitectureSection[];
  approvedMd: string | null;
  approvedAt: string | null;
}

export interface DraftSummary {
  id: string;
  episodeSlug: string;
  title: string;
  format: DraftFormat;
  updatedAt: string;
}

export interface DraftRecord extends DraftSummary {
  doc: DraftDocument;
  architecture?: DraftArchitecture;
  architectureArtifactHash?: string | null;
  narrationReconciliationRequired?: boolean;
}

export interface CreateDraftRecord extends DraftSummary {
  doc: DraftDocument;
  architecture?: DraftArchitecture;
  architectureArtifactHash?: string | null;
  narrationReconciliationRequired?: boolean;
}

export interface RevisionRecord {
  id: string;
  draftId: string;
  seq: number;
  opId: string | null;
  disposition: string;
  kind: RevisionKind;
  doc: DraftDocument;
  createdAt: string;
}

export interface SaveDraftRecord {
  title: string;
  format: DraftFormat;
  doc: DraftDocument;
  updatedAt: string;
  revision: {
    id: string;
    opId: string | null;
    disposition: string;
    kind?: RevisionKind;
    createdAt: string;
  };
}

export interface SaveArchitectureRecord {
  expectedRevisionSeq: number;
  architecture: DraftArchitecture;
  updatedAt: string;
  revision: {
    idFactory: () => string;
    opId: string | null;
    disposition: string;
    createdAt: string;
  };
}

export type ArchitectureSagaAction = 'approve' | 'reopen';

export interface ArchitectureSagaRecord {
  draftId: string;
  action: ArchitectureSagaAction;
  expectedRevisionSeq: number;
  input: unknown;
  revisionAppended: boolean;
  artifactWritten: boolean;
  pipelineUpserted: boolean;
  draftUpdated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReplaceDraftWorkflowState {
  doc: DraftDocument;
  architecture: DraftArchitecture;
  architectureArtifactHash: string | null;
  narrationReconciliationRequired: boolean;
  updatedAt: string;
}

interface DraftRow {
  id: string;
  episode_slug: string;
  title: string;
  format: DraftFormat;
  doc_json: string;
  updated_at: string;
  architecture_json: string;
  architecture_artifact_hash: string | null;
  narration_reconciliation_required: number;
}

type DraftSummaryRow = Omit<DraftRow, 'doc_json'>;

interface RevisionRow {
  id: string;
  draft_id: string;
  seq: number;
  op_id: string | null;
  disposition: string;
  doc_json: string;
  created_at: string;
  kind: RevisionKind;
}

interface NextSequenceRow {
  seq: number;
}

interface ArchitectureSagaRow {
  draft_id: string;
  action: ArchitectureSagaAction;
  expected_revision_seq: number;
  input_json: string;
  revision_appended: 0 | 1;
  artifact_written: 0 | 1;
  pipeline_upserted: 0 | 1;
  draft_updated: 0 | 1;
  created_at: string;
  updated_at: string;
}

function draftFrom(row: DraftRow): DraftRecord {
  return {
    id: row.id,
    episodeSlug: row.episode_slug,
    title: row.title,
    format: row.format,
    doc: JSON.parse(row.doc_json) as DraftDocument,
    architecture: JSON.parse(row.architecture_json) as DraftArchitecture,
    architectureArtifactHash: row.architecture_artifact_hash,
    narrationReconciliationRequired:
      row.narration_reconciliation_required === 1,
    updatedAt: row.updated_at,
  };
}

function draftSummaryFrom(row: DraftSummaryRow): DraftSummary {
  return {
    id: row.id,
    episodeSlug: row.episode_slug,
    title: row.title,
    format: row.format,
    updatedAt: row.updated_at,
  };
}

function revisionFrom(row: RevisionRow): RevisionRecord {
  return {
    id: row.id,
    draftId: row.draft_id,
    seq: row.seq,
    opId: row.op_id,
    disposition: row.disposition,
    kind: row.kind,
    doc: JSON.parse(row.doc_json) as DraftDocument,
    createdAt: row.created_at,
  };
}

function architectureSagaFrom(
  row: ArchitectureSagaRow,
): ArchitectureSagaRecord {
  return {
    draftId: row.draft_id,
    action: row.action,
    expectedRevisionSeq: row.expected_revision_seq,
    input: JSON.parse(row.input_json) as unknown,
    revisionAppended: row.revision_appended === 1,
    artifactWritten: row.artifact_written === 1,
    pipelineUpserted: row.pipeline_upserted === 1,
    draftUpdated: row.draft_updated === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DocumentStore {
  private readonly db: Database.Database;

  constructor(dbFile: string) {
    this.db = new Database(dbFile);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  createDraft(draft: CreateDraftRecord): DraftRecord {
    const architecture = draft.architecture ?? emptyArchitecture();
    this.db.prepare(
      `INSERT INTO drafts (
        id, episode_slug, title, format, doc_json, updated_at,
        architecture_json, architecture_artifact_hash,
        narration_reconciliation_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      draft.id,
      draft.episodeSlug,
      draft.title,
      draft.format,
      JSON.stringify(draft.doc),
      draft.updatedAt,
      JSON.stringify(architecture),
      draft.architectureArtifactHash ?? null,
      draft.narrationReconciliationRequired === true ? 1 : 0,
    );
    return this.getDraft(draft.id)!;
  }

  getDraft(id: string): DraftRecord | null {
    const row = this.db.prepare<[string], DraftRow>(
      'SELECT * FROM drafts WHERE id = ?',
    ).get(id);
    return row ? draftFrom(row) : null;
  }

  listDrafts(): DraftSummary[] {
    return this.db.prepare<[], DraftSummaryRow>(
      `SELECT id, episode_slug, title, format, updated_at
       FROM drafts
       ORDER BY updated_at DESC`,
    ).all().map(draftSummaryFrom);
  }

  saveDraft(
    id: string,
    update: SaveDraftRecord,
  ): { draft: DraftRecord; revision: RevisionRecord } {
    return this.db.transaction(() => {
      const result = this.db.prepare(
        `UPDATE drafts
         SET title = ?, format = ?, doc_json = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        update.title,
        update.format,
        JSON.stringify(update.doc),
        update.updatedAt,
        id,
      );
      if (result.changes === 0) throw new Error(`draft not found: ${id}`);

      const next = this.db.prepare<[string], NextSequenceRow>(
        `SELECT COALESCE(MAX(seq), 0) + 1 AS seq
         FROM revisions
         WHERE draft_id = ?`,
      ).get(id)!;
      this.db.prepare(
        `INSERT INTO revisions (
          id, draft_id, seq, op_id, disposition, doc_json, created_at, kind
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        update.revision.id,
        id,
        next.seq,
        update.revision.opId,
        update.revision.disposition,
        JSON.stringify(update.doc),
        update.revision.createdAt,
        update.revision.kind ?? 'narration',
      );

      return {
        draft: this.getDraft(id)!,
        revision: revisionFrom(
          this.db.prepare<[string], RevisionRow>(
            'SELECT * FROM revisions WHERE id = ?',
          ).get(update.revision.id)!,
        ),
      };
    })();
  }

  currentRevisionSeq(draftId: string): number {
    return this.db.prepare<[string], NextSequenceRow>(
      `SELECT COALESCE(MAX(seq), 0) AS seq
       FROM revisions
       WHERE draft_id = ?`,
    ).get(draftId)!.seq;
  }

  saveArchitecture(
    id: string,
    update: SaveArchitectureRecord,
  ): { draft: DraftRecord; revision: RevisionRecord } | null {
    return this.db.transaction(() => {
      if (!this.getDraft(id)) throw new Error(`draft not found: ${id}`);
      const currentSeq = this.currentRevisionSeq(id);
      if (currentSeq !== update.expectedRevisionSeq) return null;

      this.db.prepare(
        `UPDATE drafts
         SET architecture_json = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        JSON.stringify(update.architecture),
        update.updatedAt,
        id,
      );
      const nextSeq = currentSeq + 1;
      const revisionId = update.revision.idFactory();
      this.db.prepare(
        `INSERT INTO revisions (
          id, draft_id, seq, op_id, disposition, doc_json, created_at, kind
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'architecture')`,
      ).run(
        revisionId,
        id,
        nextSeq,
        update.revision.opId,
        update.revision.disposition,
        JSON.stringify(update.architecture),
        update.revision.createdAt,
      );

      return {
        draft: this.getDraft(id)!,
        revision: revisionFrom(
          this.db.prepare<[string], RevisionRow>(
            'SELECT * FROM revisions WHERE id = ?',
          ).get(revisionId)!,
        ),
      };
    })();
  }

  replaceArchitectureState(
    id: string,
    architecture: DraftArchitecture,
    architectureArtifactHash: string | null,
  ): DraftRecord {
    const result = this.db.prepare(
      `UPDATE drafts
       SET architecture_json = ?, architecture_artifact_hash = ?
       WHERE id = ?`,
    ).run(
      JSON.stringify(architecture),
      architectureArtifactHash,
      id,
    );
    if (result.changes === 0) throw new Error(`draft not found: ${id}`);
    return this.getDraft(id)!;
  }

  replaceDraftWorkflowState(
    id: string,
    state: ReplaceDraftWorkflowState,
  ): DraftRecord {
    const result = this.db.prepare(
      `UPDATE drafts
       SET doc_json = ?, architecture_json = ?,
           architecture_artifact_hash = ?,
           narration_reconciliation_required = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      JSON.stringify(state.doc),
      JSON.stringify(state.architecture),
      state.architectureArtifactHash,
      state.narrationReconciliationRequired ? 1 : 0,
      state.updatedAt,
      id,
    );
    if (result.changes === 0) throw new Error(`draft not found: ${id}`);
    return this.getDraft(id)!;
  }

  getRevision(id: string): RevisionRecord | null {
    const row = this.db.prepare<[string], RevisionRow>(
      'SELECT * FROM revisions WHERE id = ?',
    ).get(id);
    return row ? revisionFrom(row) : null;
  }

  getArchitectureSaga(
    draftId: string,
    action: ArchitectureSagaAction,
    expectedRevisionSeq: number,
  ): ArchitectureSagaRecord | null {
    const row = this.db.prepare<
      [string, ArchitectureSagaAction, number],
      ArchitectureSagaRow
    >(
      `SELECT * FROM architecture_sagas
       WHERE draft_id = ? AND action = ? AND expected_revision_seq = ?`,
    ).get(draftId, action, expectedRevisionSeq);
    return row ? architectureSagaFrom(row) : null;
  }

  createArchitectureSaga(
    saga: ArchitectureSagaRecord,
  ): ArchitectureSagaRecord {
    this.db.prepare(
      `INSERT OR IGNORE INTO architecture_sagas (
        draft_id, action, expected_revision_seq, input_json,
        revision_appended, artifact_written, pipeline_upserted,
        draft_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      saga.draftId,
      saga.action,
      saga.expectedRevisionSeq,
      JSON.stringify(saga.input),
      saga.revisionAppended ? 1 : 0,
      saga.artifactWritten ? 1 : 0,
      saga.pipelineUpserted ? 1 : 0,
      saga.draftUpdated ? 1 : 0,
      saga.createdAt,
      saga.updatedAt,
    );
    return this.getArchitectureSaga(
      saga.draftId,
      saga.action,
      saga.expectedRevisionSeq,
    )!;
  }

  updateArchitectureSaga(
    saga: ArchitectureSagaRecord,
  ): ArchitectureSagaRecord {
    const result = this.db.prepare(
      `UPDATE architecture_sagas
       SET input_json = ?, revision_appended = ?, artifact_written = ?,
           pipeline_upserted = ?, draft_updated = ?, updated_at = ?
       WHERE draft_id = ? AND action = ? AND expected_revision_seq = ?`,
    ).run(
      JSON.stringify(saga.input),
      saga.revisionAppended ? 1 : 0,
      saga.artifactWritten ? 1 : 0,
      saga.pipelineUpserted ? 1 : 0,
      saga.draftUpdated ? 1 : 0,
      saga.updatedAt,
      saga.draftId,
      saga.action,
      saga.expectedRevisionSeq,
    );
    if (result.changes === 0) {
      throw new Error(
        `architecture saga not found: ${saga.draftId}/${saga.action}/${saga.expectedRevisionSeq}`,
      );
    }
    return this.getArchitectureSaga(
      saga.draftId,
      saga.action,
      saga.expectedRevisionSeq,
    )!;
  }

  listRevisions(draftId: string): RevisionRecord[] {
    return this.db.prepare<[string], RevisionRow>(
      `SELECT * FROM revisions
       WHERE draft_id = ?
       ORDER BY seq`,
    ).all(draftId).map(revisionFrom);
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    migrateStateDatabase(this.db);
  }
}

function emptyArchitecture(): DraftArchitecture {
  return {
    sections: [],
    approvedMd: null,
    approvedAt: null,
  };
}
