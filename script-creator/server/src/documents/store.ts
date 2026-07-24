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
  approvedNarrationMd?: string | null;
  approvedNarrationAt?: string | null;
  approvedNarrationRevisionSeq?: number | null;
  narrationArtifactHash?: string | null;
}

export interface CreateDraftRecord extends DraftSummary {
  doc: DraftDocument;
  architecture?: DraftArchitecture;
  architectureArtifactHash?: string | null;
  narrationReconciliationRequired?: boolean;
  approvedNarrationMd?: string | null;
  approvedNarrationAt?: string | null;
  approvedNarrationRevisionSeq?: number | null;
  narrationArtifactHash?: string | null;
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

export type PromotionState =
  | 'running'
  | 'output-ready'
  | 'validation-required'
  | 'complete'
  | 'failed';

export interface PromotionRecord {
  draftId: string;
  operationId: string;
  state: PromotionState;
  targetPath: string;
  targetHash: string | null;
  importRevisionId: string;
  validationHash: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApproveNarrationRecord {
  expectedRevisionSeq: number;
  approvedNarrationMd: string;
  approvedNarrationAt: string;
  narrationArtifactHash: string | null;
  doc: DraftDocument;
  updatedAt: string;
  revision: {
    id: string;
    createdAt: string;
  };
}

export interface NarrationSettledExportRecord {
  token: string;
  draftId: string;
  revisionSeq: number;
  narrationMd: string;
  createdAt: string;
}

export type NarrationProposalState =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'rerolled'
  | 'dismissed';

export interface NarrationProposalRecord {
  draftId: string;
  operationId: string;
  state: NarrationProposalState;
  createdAt: string;
  resolvedAt: string | null;
  reasonNote?: string | null;
  successorOperationId?: string | null;
  acceptedRevisionId?: string | null;
}

export interface ArchitectureProposalRecord {
  draftId: string;
  operationId: string;
  state: 'pending' | 'accepted' | 'rejected';
  revisionId: string | null;
  reasonNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ImportPromotionRecord {
  doc: DraftDocument;
  format: DraftFormat;
  updatedAt: string;
  revision: {
    id: string;
    opId: string;
    createdAt: string;
  };
}

export class DraftWriteReservationError extends Error {
  readonly code = 'draft-write-reserved';
  readonly reservation = 'architecture-saga';
  readonly recoverable = true;

  constructor(
    readonly draftId: string,
    readonly sagaKind: ArchitectureSagaAction,
  ) {
    super(
      'draft write refused: an architecture saga is paused; resume or resolve it first',
    );
    this.name = 'DraftWriteReservationError';
  }
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
  approved_narration_md: string | null;
  approved_narration_at: string | null;
  approved_narration_revision_seq: number | null;
  narration_artifact_hash: string | null;
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

interface PromotionRow {
  draft_id: string;
  operation_id: string;
  state: PromotionState;
  target_path: string;
  target_hash: string | null;
  import_revision_id: string;
  validation_hash: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface NarrationSettledExportRow {
  token: string;
  draft_id: string;
  revision_seq: number;
  narration_md: string;
  created_at: string;
}

interface ArchitectureProposalRow {
  draft_id: string;
  operation_id: string;
  state: ArchitectureProposalRecord['state'];
  revision_id: string | null;
  reason_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface NarrationProposalRow {
  draft_id: string;
  operation_id: string;
  state: NarrationProposalState;
  created_at: string;
  resolved_at: string | null;
  reason_note: string | null;
  successor_operation_id: string | null;
  accepted_revision_id: string | null;
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
    approvedNarrationMd: row.approved_narration_md,
    approvedNarrationAt: row.approved_narration_at,
    approvedNarrationRevisionSeq: row.approved_narration_revision_seq,
    narrationArtifactHash: row.narration_artifact_hash,
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

function promotionFrom(row: PromotionRow): PromotionRecord {
  return {
    draftId: row.draft_id,
    operationId: row.operation_id,
    state: row.state,
    targetPath: row.target_path,
    targetHash: row.target_hash,
    importRevisionId: row.import_revision_id,
    validationHash: row.validation_hash,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function narrationSettledExportFrom(
  row: NarrationSettledExportRow,
): NarrationSettledExportRecord {
  return {
    token: row.token,
    draftId: row.draft_id,
    revisionSeq: row.revision_seq,
    narrationMd: row.narration_md,
    createdAt: row.created_at,
  };
}

function narrationProposalFrom(
  row: NarrationProposalRow,
): NarrationProposalRecord {
  return {
    draftId: row.draft_id,
    operationId: row.operation_id,
    state: row.state,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    reasonNote: row.reason_note,
    successorOperationId: row.successor_operation_id,
    acceptedRevisionId: row.accepted_revision_id,
  };
}

function architectureProposalFrom(
  row: ArchitectureProposalRow,
): ArchitectureProposalRecord {
  return {
    draftId: row.draft_id,
    operationId: row.operation_id,
    state: row.state,
    revisionId: row.revision_id,
    reasonNote: row.reason_note,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
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
        narration_reconciliation_required, approved_narration_md,
        approved_narration_at, approved_narration_revision_seq,
        narration_artifact_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      draft.approvedNarrationMd ?? null,
      draft.approvedNarrationAt ?? null,
      draft.approvedNarrationRevisionSeq ?? null,
      draft.narrationArtifactHash ?? null,
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
      const current = this.getDraft(id);
      if (!current) throw new Error(`draft not found: ${id}`);
      this.assertDraftWriteAvailable(id);
      const doc = preserveWorkflowMetadata(update.doc, current.doc);
      const result = this.db.prepare(
        `UPDATE drafts
         SET title = ?, format = ?, doc_json = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        update.title,
        update.format,
        JSON.stringify(doc),
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
        JSON.stringify(doc),
        update.revision.createdAt,
        update.revision.kind ?? 'narration',
      );
      if (
        update.revision.opId
        && update.revision.disposition.startsWith('variant-picked/')
        && this.getNarrationProposal(id, update.revision.opId)?.state
          === 'pending'
      ) {
        this.resolveNarrationProposal(
          id,
          update.revision.opId,
          'dismissed',
          update.revision.createdAt,
        );
      }

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

  approveNarration(
    id: string,
    update: ApproveNarrationRecord,
  ): { draft: DraftRecord; revision: RevisionRecord } | null {
    return this.db.transaction(() => {
      if (!this.getDraft(id)) throw new Error(`draft not found: ${id}`);
      this.assertDraftWriteAvailable(id);
      const currentSeq = this.currentRevisionSeq(id);
      if (currentSeq !== update.expectedRevisionSeq) return null;
      const nextSeq = currentSeq + 1;
      this.db.prepare(
        `UPDATE drafts
         SET doc_json = ?, approved_narration_md = ?,
             approved_narration_at = ?,
             approved_narration_revision_seq = ?,
             narration_artifact_hash = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        JSON.stringify(update.doc),
        update.approvedNarrationMd,
        update.approvedNarrationAt,
        nextSeq,
        update.narrationArtifactHash,
        update.updatedAt,
        id,
      );
      this.db.prepare(
        `INSERT INTO revisions (
          id, draft_id, seq, op_id, disposition, doc_json, created_at, kind
        ) VALUES (?, ?, ?, NULL, 'narration-approved', ?, ?, 'narration')`,
      ).run(
        update.revision.id,
        id,
        nextSeq,
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

  createNarrationSettledExport(
    record: NarrationSettledExportRecord,
  ): NarrationSettledExportRecord {
    this.db.prepare(
      `INSERT INTO narration_settled_exports (
        token, draft_id, revision_seq, narration_md, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      record.token,
      record.draftId,
      record.revisionSeq,
      record.narrationMd,
      record.createdAt,
    );
    return this.getNarrationSettledExport(record.token)!;
  }

  getNarrationSettledExport(
    token: string,
  ): NarrationSettledExportRecord | null {
    const row = this.db.prepare<[string], NarrationSettledExportRow>(
      'SELECT * FROM narration_settled_exports WHERE token = ?',
    ).get(token);
    return row ? narrationSettledExportFrom(row) : null;
  }

  deleteNarrationSettledExports(draftId: string): void {
    this.db.prepare(
      'DELETE FROM narration_settled_exports WHERE draft_id = ?',
    ).run(draftId);
  }

  createNarrationProposal(
    record: NarrationProposalRecord,
  ): NarrationProposalRecord {
    this.db.prepare(
      `INSERT INTO narration_proposals (
        draft_id, operation_id, state, created_at, resolved_at,
        reason_note, successor_operation_id, accepted_revision_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (draft_id, operation_id) DO NOTHING`,
    ).run(
      record.draftId,
      record.operationId,
      record.state,
      record.createdAt,
      record.resolvedAt,
      record.reasonNote ?? null,
      record.successorOperationId ?? null,
      record.acceptedRevisionId ?? null,
    );
    return this.getNarrationProposal(
      record.draftId,
      record.operationId,
    )!;
  }

  createArchitectureProposal(
    record: ArchitectureProposalRecord,
  ): ArchitectureProposalRecord {
    this.db.prepare(
      `INSERT INTO architecture_proposals (
        draft_id, operation_id, state, revision_id, reason_note,
        created_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (draft_id, operation_id) DO NOTHING`,
    ).run(
      record.draftId,
      record.operationId,
      record.state,
      record.revisionId,
      record.reasonNote,
      record.createdAt,
      record.resolvedAt,
    );
    return this.getArchitectureProposal(
      record.draftId,
      record.operationId,
    )!;
  }

  getArchitectureProposal(
    draftId: string,
    operationId: string,
  ): ArchitectureProposalRecord | null {
    const row = this.db.prepare<
      [string, string],
      ArchitectureProposalRow
    >(
      `SELECT * FROM architecture_proposals
       WHERE draft_id = ? AND operation_id = ?`,
    ).get(draftId, operationId);
    return row ? architectureProposalFrom(row) : null;
  }

  resolveArchitectureProposal(
    draftId: string,
    operationId: string,
    input: {
      state: 'accepted' | 'rejected';
      revisionId: string | null;
      reasonNote: string | null;
      resolvedAt: string;
    },
  ): ArchitectureProposalRecord {
    const result = this.db.prepare(
      `UPDATE architecture_proposals
       SET state = ?, revision_id = ?, reason_note = ?, resolved_at = ?
       WHERE draft_id = ? AND operation_id = ? AND state = 'pending'`,
    ).run(
      input.state,
      input.revisionId,
      input.reasonNote,
      input.resolvedAt,
      draftId,
      operationId,
    );
    const current = this.getArchitectureProposal(draftId, operationId);
    if (!current) {
      throw new Error(`architecture proposal not found: ${operationId}`);
    }
    if (
      result.changes === 0
      && (
        current.state !== input.state
        || current.revisionId !== input.revisionId
        || current.reasonNote !== input.reasonNote
      )
    ) {
      throw new Error(
        `architecture proposal disposition conflict: ${operationId}`,
      );
    }
    return current;
  }

  getNarrationProposal(
    draftId: string,
    operationId: string,
  ): NarrationProposalRecord | null {
    const row = this.db.prepare<
      [string, string],
      NarrationProposalRow
    >(
      `SELECT * FROM narration_proposals
       WHERE draft_id = ? AND operation_id = ?`,
    ).get(draftId, operationId);
    return row ? narrationProposalFrom(row) : null;
  }

  listPendingNarrationProposals(
    draftId: string,
  ): NarrationProposalRecord[] {
    return this.db.prepare<[string], NarrationProposalRow>(
      `SELECT * FROM narration_proposals
       WHERE draft_id = ? AND state = 'pending'
       ORDER BY created_at, operation_id`,
    ).all(draftId).map(narrationProposalFrom);
  }

  resolveNarrationProposal(
    draftId: string,
    operationId: string,
    state: Exclude<NarrationProposalState, 'pending'>,
    resolvedAt: string,
    options: {
      reasonNote?: string | null;
      successorOperationId?: string | null;
      acceptedRevisionId?: string | null;
    } = {},
  ): NarrationProposalRecord {
    const result = this.db.prepare(
      `UPDATE narration_proposals
       SET state = ?, resolved_at = ?, reason_note = ?,
           successor_operation_id = ?, accepted_revision_id = ?
       WHERE draft_id = ? AND operation_id = ? AND state = 'pending'`,
    ).run(
      state,
      resolvedAt,
      options.reasonNote ?? null,
      options.successorOperationId ?? null,
      options.acceptedRevisionId ?? null,
      draftId,
      operationId,
    );
    const current = this.getNarrationProposal(draftId, operationId);
    if (!current) {
      throw new Error(`narration proposal not found: ${operationId}`);
    }
    if (result.changes === 0 && current.state === 'pending') {
      throw new Error(`narration proposal could not be resolved: ${operationId}`);
    }
    return current;
  }

  hasRevisionForOperation(draftId: string, operationId: string): boolean {
    return this.db.prepare<[string, string], { present: number }>(
      `SELECT 1 AS present FROM revisions
       WHERE draft_id = ? AND op_id = ?
       LIMIT 1`,
    ).get(draftId, operationId)?.present === 1;
  }

  getRevisionForOperation(
    draftId: string,
    operationId: string,
  ): RevisionRecord | null {
    const row = this.db.prepare<[string, string], RevisionRow>(
      `SELECT * FROM revisions
       WHERE draft_id = ? AND op_id = ?
       ORDER BY seq DESC
       LIMIT 1`,
    ).get(draftId, operationId);
    return row ? revisionFrom(row) : null;
  }

  replaceNarrationArtifactHash(
    id: string,
    hash: string,
  ): DraftRecord {
    const result = this.db.prepare(
      `UPDATE drafts
       SET narration_artifact_hash = ?
       WHERE id = ?`,
    ).run(hash, id);
    if (result.changes === 0) throw new Error(`draft not found: ${id}`);
    return this.getDraft(id)!;
  }

  importPromotion(
    id: string,
    update: ImportPromotionRecord,
  ): { draft: DraftRecord; revision: RevisionRecord } {
    return this.db.transaction(() => {
      const existing = this.getRevision(update.revision.id);
      if (existing) {
        return { draft: this.getDraft(id)!, revision: existing };
      }
      const current = this.getDraft(id);
      if (!current) throw new Error(`draft not found: ${id}`);
      this.assertDraftWriteAvailable(id, {
        allowProductionSynchronization: true,
      });
      const doc = preserveWorkflowMetadata(update.doc, current.doc);
      const nextSeq = this.currentRevisionSeq(id) + 1;
      this.db.prepare(
        `UPDATE drafts
         SET format = ?, doc_json = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        update.format,
        JSON.stringify(doc),
        update.updatedAt,
        id,
      );
      this.db.prepare(
        `INSERT INTO revisions (
          id, draft_id, seq, op_id, disposition, doc_json, created_at, kind
        ) VALUES (?, ?, ?, ?, 'production-import', ?, ?, 'narration')`,
      ).run(
        update.revision.id,
        id,
        nextSeq,
        update.revision.opId,
        JSON.stringify(doc),
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
      this.assertDraftWriteAvailable(id, {
        allowArchitectureSaga: true,
      });
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

  setNarrationReconciliationRequired(
    id: string,
    required: boolean,
    updatedAt: string,
  ): DraftRecord {
    const result = this.db.prepare(
      `UPDATE drafts
       SET narration_reconciliation_required = ?, updated_at = ?
       WHERE id = ?`,
    ).run(required ? 1 : 0, updatedAt, id);
    if (result.changes === 0) throw new Error(`draft not found: ${id}`);
    return this.getDraft(id)!;
  }

  markNarrationReconciled(
    id: string,
    input: {
      expectedRevisionSeq: number;
      revisionId: string;
      updatedAt: string;
    },
  ): { draft: DraftRecord; revision: RevisionRecord } | null {
    return this.db.transaction(() => {
      const current = this.getDraft(id);
      if (!current) throw new Error(`draft not found: ${id}`);
      this.assertDraftWriteAvailable(id);
      const currentSeq = this.currentRevisionSeq(id);
      if (currentSeq !== input.expectedRevisionSeq) return null;
      const nextSeq = currentSeq + 1;
      this.db.prepare(
        `UPDATE drafts
         SET narration_reconciliation_required = 0, updated_at = ?
         WHERE id = ?`,
      ).run(input.updatedAt, id);
      this.db.prepare(
        `INSERT INTO revisions (
          id, draft_id, seq, op_id, disposition, doc_json, created_at, kind
        ) VALUES (
          ?, ?, ?, NULL, 'narration-reconciled', ?, ?, 'narration'
        )`,
      ).run(
        input.revisionId,
        id,
        nextSeq,
        JSON.stringify(current.doc),
        input.updatedAt,
      );
      return {
        draft: this.getDraft(id)!,
        revision: revisionFrom(
          this.db.prepare<[string], RevisionRow>(
            'SELECT * FROM revisions WHERE id = ?',
          ).get(input.revisionId)!,
        ),
      };
    })();
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

  getPendingArchitectureSaga(
    draftId: string,
  ): ArchitectureSagaRecord | null {
    const row = this.db.prepare<
      [string],
      ArchitectureSagaRow
    >(
      `SELECT * FROM architecture_sagas
       WHERE draft_id = ? AND draft_updated = 0
       ORDER BY updated_at DESC, expected_revision_seq DESC, rowid DESC
       LIMIT 1`,
    ).get(draftId);
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

  createPromotion(record: PromotionRecord): PromotionRecord {
    this.db.prepare(
      `INSERT INTO promotions (
        draft_id, operation_id, state, target_path, target_hash,
        import_revision_id, validation_hash, error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.draftId,
      record.operationId,
      record.state,
      record.targetPath,
      record.targetHash,
      record.importRevisionId,
      record.validationHash,
      record.error,
      record.createdAt,
      record.updatedAt,
    );
    return this.getPromotionByOperation(record.operationId)!;
  }

  getPromotionByOperation(operationId: string): PromotionRecord | null {
    const row = this.db.prepare<[string], PromotionRow>(
      'SELECT * FROM promotions WHERE operation_id = ?',
    ).get(operationId);
    return row ? promotionFrom(row) : null;
  }

  getLatestPromotion(draftId: string): PromotionRecord | null {
    const row = this.db.prepare<[string], PromotionRow>(
      `SELECT * FROM promotions
       WHERE draft_id = ?
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`,
    ).get(draftId);
    return row ? promotionFrom(row) : null;
  }

  updatePromotion(record: PromotionRecord): PromotionRecord {
    const result = this.db.prepare(
      `UPDATE promotions
       SET state = ?, target_hash = ?, validation_hash = ?, error = ?,
           updated_at = ?
       WHERE operation_id = ? AND draft_id = ?`,
    ).run(
      record.state,
      record.targetHash,
      record.validationHash,
      record.error,
      record.updatedAt,
      record.operationId,
      record.draftId,
    );
    if (result.changes === 0) {
      throw new Error(`promotion not found: ${record.operationId}`);
    }
    return this.getPromotionByOperation(record.operationId)!;
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

  private assertDraftWriteAvailable(
    id: string,
    options: {
      allowArchitectureSaga?: boolean;
      allowProductionSynchronization?: boolean;
    } = {},
  ): void {
    const pendingArchitectureSaga = this.getPendingArchitectureSaga(id);
    if (
      options.allowArchitectureSaga !== true
      && pendingArchitectureSaga
    ) {
      throw new DraftWriteReservationError(
        id,
        pendingArchitectureSaga.action,
      );
    }
    const draft = this.getDraft(id)!;
    const phase = draftCreativePhase(draft.doc);
    if (
      phase === 'rapid-prototype'
      && draft.approvedNarrationMd
      && draft.approvedNarrationAt
      && draft.approvedNarrationRevisionSeq === this.currentRevisionSeq(id)
    ) {
      throw new Error(
        'draft write deferred: narration approval is in progress',
      );
    }
    if (
      options.allowProductionSynchronization !== true
      && this.getLatestPromotion(id)?.state === 'output-ready'
    ) {
      throw new Error(
        'draft write deferred: production synchronization is in progress',
      );
    }
  }
}

function draftCreativePhase(doc: DraftDocument): string | null {
  const metadata = objectValue(doc['metadata']);
  const creativeStatus = objectValue(metadata?.['creativeStatus']);
  const phase = creativeStatus?.['phase'];
  return typeof phase === 'string' ? phase : null;
}

function objectValue(
  value: unknown,
): Record<string, unknown> | null {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function preserveWorkflowMetadata(
  incoming: DraftDocument,
  stored: DraftDocument,
): DraftDocument {
  const incomingMetadata = objectValue(incoming['metadata']);
  const storedMetadata = objectValue(stored['metadata']);
  if (!incomingMetadata && !storedMetadata) return incoming;
  const metadata = {
    ...(incomingMetadata ?? {}),
  };
  for (const field of ['creativeStatus', 'directionApproved']) {
    if (
      storedMetadata
      && Object.prototype.hasOwnProperty.call(storedMetadata, field)
    ) {
      metadata[field] = storedMetadata[field];
    } else {
      delete metadata[field];
    }
  }
  return {
    ...incoming,
    metadata,
  };
}

function emptyArchitecture(): DraftArchitecture {
  return {
    sections: [],
    approvedMd: null,
    approvedAt: null,
  };
}
