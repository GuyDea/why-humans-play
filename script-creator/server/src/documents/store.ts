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
