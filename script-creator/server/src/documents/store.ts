import Database from 'better-sqlite3';

export type DraftFormat = 'annotated' | 'narration';
export type DraftDocument = Record<string, unknown>;

export interface DraftSummary {
  id: string;
  episodeSlug: string;
  title: string;
  format: DraftFormat;
  updatedAt: string;
}

export interface DraftRecord extends DraftSummary {
  doc: DraftDocument;
}

export interface RevisionRecord {
  id: string;
  draftId: string;
  seq: number;
  opId: string | null;
  disposition: string;
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
}

interface NextSequenceRow {
  seq: number;
}

const SCHEMA_VERSION = 2;
const MAX_SUPPORTED_SCHEMA_VERSION = 4;
export const MIGRATION_V2 = `
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

function draftFrom(row: DraftRow): DraftRecord {
  return {
    id: row.id,
    episodeSlug: row.episode_slug,
    title: row.title,
    format: row.format,
    doc: JSON.parse(row.doc_json) as DraftDocument,
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

  createDraft(draft: DraftRecord): DraftRecord {
    this.db.prepare(
      `INSERT INTO drafts (
        id, episode_slug, title, format, doc_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      draft.id,
      draft.episodeSlug,
      draft.title,
      draft.format,
      JSON.stringify(draft.doc),
      draft.updatedAt,
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
          id, draft_id, seq, op_id, disposition, doc_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        update.revision.id,
        id,
        next.seq,
        update.revision.opId,
        update.revision.disposition,
        JSON.stringify(update.doc),
        update.revision.createdAt,
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
    const version = this.db.pragma('user_version', { simple: true }) as number;
    if (version > MAX_SUPPORTED_SCHEMA_VERSION) {
      throw new Error(
        `state database schema version ${version} is newer than supported version ${MAX_SUPPORTED_SCHEMA_VERSION}`,
      );
    }
    if (version < SCHEMA_VERSION) {
      this.db.transaction(() => {
        this.db.exec(MIGRATION_V2);
        this.db.pragma(`user_version = ${SCHEMA_VERSION}`);
      })();
    }
  }
}
