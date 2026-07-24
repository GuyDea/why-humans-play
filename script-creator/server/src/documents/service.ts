import {
  exportMarkdown as encodeMarkdown,
  parseMarkdown,
  schema,
} from '@whp/script-creator-editor-core';
import { randomUUID } from 'node:crypto';
import type {
  DocumentStore,
  DraftDocument,
  DraftFormat,
  DraftRecord,
  DraftSummary,
  RevisionRecord,
  PromotionRecord,
} from './store.js';
import type {
  ArtifactReadResult,
} from '../repo/artifacts.js';
import type { ValidatorResult } from '../repo/validator.js';
import type {
  MilestoneKind,
  PendingMilestone,
} from '../repo/milestones.js';

export interface CreateDraftInput {
  episodeSlug: string;
  title: string;
  format: DraftFormat;
  doc: DraftDocument;
}

export interface SaveDraftInput {
  title?: string;
  format?: DraftFormat;
  doc: DraftDocument;
  opId?: string | null;
  disposition?: string;
}

export interface SavedDraft {
  draft: DraftRecord;
  revision: RevisionRecord;
}

export class ExportBlockedError extends Error {
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super('draft export blocked');
    this.name = 'ExportBlockedError';
    this.reasons = reasons;
  }
}

interface DocumentMilestoneService {
  recordPending(input: {
    draftId: string;
    kind: MilestoneKind;
    files: string[];
    reconciliationRequired: boolean;
  }): Promise<PendingMilestone | void>;
}

interface DocumentLearningService {
  captureRevision(revision: RevisionRecord): unknown;
  capturePromotionCompletion(promotion: PromotionRecord): unknown;
}

export class DocumentService {
  private readonly store: DocumentStore;
  private readonly milestoneService: DocumentMilestoneService | null;
  private readonly learningService: DocumentLearningService | null;
  private readonly idFactory: () => string;
  private readonly now: () => string;

  constructor(opts: {
    store: DocumentStore;
    milestoneService?: DocumentMilestoneService;
    learningService?: DocumentLearningService;
    idFactory?: () => string;
    now?: () => string;
  }) {
    this.store = opts.store;
    this.milestoneService = opts.milestoneService ?? null;
    this.learningService = opts.learningService ?? null;
    this.idFactory = opts.idFactory ?? randomUUID;
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  createDraft(input: CreateDraftInput): DraftRecord {
    return this.createDraftWithId(this.idFactory(), input);
  }

  createDraftWithId(id: string, input: CreateDraftInput): DraftRecord {
    requireNonEmpty(id, 'draftId');
    requireNonEmpty(input.episodeSlug, 'episodeSlug');
    requireNonEmpty(input.title, 'title');
    const format = documentFormat(input.doc);
    if (input.format !== format) {
      throw new Error(
        `draft format ${input.format} does not match document format ${format}`,
      );
    }

    const existing = this.store.getDraft(id);
    if (existing) {
      if (
        existing.episodeSlug === input.episodeSlug
        && existing.title === input.title
        && existing.format === format
        && JSON.stringify(existing.doc) === JSON.stringify(input.doc)
      ) {
        return existing;
      }
      throw new Error(`draft idempotency conflict: ${id}`);
    }

    return this.store.createDraft({
      id,
      episodeSlug: input.episodeSlug,
      title: input.title,
      format,
      doc: input.doc,
      architecture: {
        sections: [],
        approvedMd: null,
        approvedAt: null,
      },
      architectureArtifactHash: null,
      narrationReconciliationRequired: false,
      approvedNarrationMd: null,
      approvedNarrationAt: null,
      approvedNarrationRevisionSeq: null,
      narrationArtifactHash: null,
      updatedAt: this.now(),
    });
  }

  getDraft(id: string): DraftRecord {
    const draft = this.store.getDraft(id);
    if (!draft) throw new Error(`draft not found: ${id}`);
    return draft;
  }

  listDrafts(): DraftSummary[] {
    return this.store.listDrafts();
  }

  saveDraft(id: string, input: SaveDraftInput): SavedDraft {
    const current = this.getDraft(id);
    const format = documentFormat(input.doc);
    if (input.format !== undefined && input.format !== format) {
      throw new Error(
        `draft format ${input.format} does not match document format ${format}`,
      );
    }
    const title = input.title ?? current.title;
    requireNonEmpty(title, 'title');
    if (
      input.opId !== undefined
      && input.opId !== null
      && typeof input.opId !== 'string'
    ) {
      throw new Error('opId must be a string or null');
    }
    const disposition = input.disposition ?? 'manual-save';
    requireNonEmpty(disposition, 'disposition');
    const timestamp = this.now();

    const saved = this.store.saveDraft(id, {
      title,
      format,
      doc: input.doc,
      updatedAt: timestamp,
      revision: {
        id: this.idFactory(),
        opId: input.opId ?? null,
        disposition,
        kind: 'narration',
        createdAt: timestamp,
      },
    });
    this.learningService?.captureRevision(saved.revision);
    return saved;
  }

  listRevisions(draftId: string): RevisionRecord[] {
    this.getDraft(draftId);
    return this.store.listRevisions(draftId);
  }

  importMarkdown(markdown: string): DraftRecord {
    if (typeof markdown !== 'string' || markdown.trim() === '') {
      throw new Error('markdown is required');
    }
    const node = parseMarkdown(markdown);
    const title = markdown.match(/^# ([^\r\n]+)$/m)?.[1]?.trim()
      || firstBeatTitle(node.toJSON())
      || 'Untitled draft';

    return this.createDraft({
      episodeSlug: slugify(title),
      title,
      format: node.attrs.format === 'narration' ? 'narration' : 'annotated',
      doc: node.toJSON() as DraftDocument,
    });
  }

  exportMarkdown(draftId: string): string {
    const draft = this.getDraft(draftId);
    return exportDocumentMarkdown(draft.doc);
  }

  syncPromotionOutput(
    draftId: string,
    output: ArtifactReadResult,
  ): PromotionRecord {
    const draft = this.getDraft(draftId);
    const promotion = this.store.getLatestPromotion(draftId);
    if (!promotion || promotion.state !== 'validation-required') {
      throw new Error(
        'promote validation refused: validation-required promotion is required',
      );
    }
    if (promotion.targetPath !== output.path) {
      throw new Error('promote validation refused: target path changed');
    }
    const currentMarkdown = exportDocumentMarkdown(draft.doc);
    if (
      promotion.targetHash === output.hash
      && currentMarkdown !== output.content
    ) {
      throw new Error(
        'promote validation refused: imported document differs from target',
      );
    }
    const timestamp = this.now();
    if (currentMarkdown !== output.content) {
      const imported = importProductionMarkdown(output.content, draft.doc);
      this.store.importPromotion(draftId, {
        doc: imported.doc,
        format: imported.format,
        updatedAt: timestamp,
        revision: {
          id: this.idFactory(),
          opId: promotion.operationId,
          createdAt: timestamp,
        },
      });
    }
    if (
      exportDocumentMarkdown(this.getDraft(draftId).doc)
        !== output.content
    ) {
      throw new Error(
        'promote validation refused: imported document differs from target',
      );
    }
    if (promotion.targetHash === output.hash) return promotion;
    const completed = this.store.updatePromotion({
      ...promotion,
      targetHash: output.hash,
      validationHash: null,
      updatedAt: timestamp,
    });
    return completed;
  }

  recordPromotionValidation(
    draftId: string,
    validation: ValidatorResult,
  ): PromotionRecord {
    const promotion = this.store.getLatestPromotion(draftId);
    if (!promotion || promotion.state !== 'validation-required') {
      throw new Error(
        'promote validation refused: validation-required promotion is required',
      );
    }
    if (
      validation.path !== promotion.targetPath
      || validation.hash !== promotion.targetHash
    ) {
      throw new Error(
        'promote validation refused: validator result is stale',
      );
    }
    return this.store.updatePromotion({
      ...promotion,
      validationHash: validation.hash,
      updatedAt: this.now(),
    });
  }

  reservePromotionCompletion(
    draftId: string,
    validation: ValidatorResult,
  ): PromotionRecord {
    const promotion = this.store.getLatestPromotion(draftId);
    if (!promotion || promotion.state !== 'validation-required') {
      throw new Error(
        'promote completion refused: validation-required promotion is required',
      );
    }
    if (
      !validation.ok
      || validation.path !== promotion.targetPath
      || validation.hash !== promotion.targetHash
      || validation.hash !== promotion.validationHash
    ) {
      throw new Error(
        'promote completion refused: validator result is stale',
      );
    }
    return this.store.updatePromotion({
      ...promotion,
      state: 'output-ready',
      error: 'promotion completion in progress',
      updatedAt: this.now(),
    });
  }

  releasePromotionCompletion(draftId: string): PromotionRecord | null {
    const promotion = this.store.getLatestPromotion(draftId);
    if (!promotion || promotion.state !== 'output-ready') return promotion;
    return this.store.updatePromotion({
      ...promotion,
      state: 'validation-required',
      error: null,
      updatedAt: this.now(),
    });
  }

  markPromotionRollbackRequired(draftId: string): PromotionRecord {
    const promotion = this.store.getLatestPromotion(draftId);
    if (!promotion || promotion.state !== 'output-ready') {
      throw new Error(
        'promote completion refused: reserved promotion is required',
      );
    }
    return this.store.updatePromotion({
      ...promotion,
      error: 'production pipeline rollback required',
      updatedAt: this.now(),
    });
  }

  async completePromotion(
    draftId: string,
    validation: ValidatorResult,
  ): Promise<PromotionRecord> {
    const draft = this.getDraft(draftId);
    const promotion = this.store.getLatestPromotion(draftId);
    if (
      !promotion
      || promotion.state !== 'output-ready'
      || promotion.error !== 'promotion completion in progress'
    ) {
      throw new Error(
        'promote completion refused: reserved promotion is required',
      );
    }
    if (!validation.ok) {
      throw new Error('promote completion refused: validator failed');
    }
    if (
      validation.path !== promotion.targetPath
      || validation.hash !== promotion.targetHash
    ) {
      throw new Error(
        'promote completion refused: validator result is stale',
      );
    }
    if (this.milestoneService) {
      await this.milestoneService.recordPending({
        draftId,
        kind: 'production-promotion',
        files: [promotion.targetPath, 'whp-youtube/PIPELINE.md'],
        reconciliationRequired: true,
      });
    }
    this.store.replaceDraftWorkflowState(draftId, {
      doc: withCreativePhase(draft.doc, 'production'),
      architecture: draft.architecture ?? {
        sections: [],
        approvedMd: null,
        approvedAt: null,
      },
      architectureArtifactHash: draft.architectureArtifactHash ?? null,
      narrationReconciliationRequired:
        draft.narrationReconciliationRequired === true,
      updatedAt: this.now(),
    });
    const completed = this.store.updatePromotion({
      ...promotion,
      state: 'complete',
      validationHash: validation.hash,
      error: null,
      updatedAt: this.now(),
    });
    this.learningService?.capturePromotionCompletion(completed);
    return completed;
  }
}

export function exportDocumentMarkdown(
  doc: DraftDocument,
  pendingProposals: string[] = [],
): string {
  const result = encodeMarkdown(
    schema.nodeFromJSON(doc),
    pendingProposals,
  );
  if (!result.ok) throw new ExportBlockedError(result.blocked);
  return result.markdown;
}

export function importProductionMarkdown(
  markdown: string,
  source: DraftDocument,
): { doc: DraftDocument; format: DraftFormat } {
  if (typeof markdown !== 'string' || markdown.trim() === '') {
    throw new Error('production Markdown is required');
  }
  const parsed = parseMarkdown(markdown).toJSON() as DraftDocument;
  const parsedAttrs = recordValue(parsed['attrs']) ?? {};
  const sourceAttrs = recordValue(source['attrs']) ?? {};
  const preserved = Object.fromEntries(
    Object.entries(source).filter(([key]) =>
      key !== 'type' && key !== 'attrs' && key !== 'content'),
  );
  const doc: DraftDocument = {
    ...preserved,
    ...parsed,
    attrs: {
      ...sourceAttrs,
      ...parsedAttrs,
    },
  };
  return {
    doc,
    format: parsedAttrs['format'] === 'annotated'
      ? 'annotated'
      : 'narration',
  };
}

export function readCreativeStatus(
  doc: DraftDocument,
): Record<string, unknown> | null {
  const metadata = recordValue(doc['metadata']);
  const creativeStatus = recordValue(metadata?.['creativeStatus']);
  return creativeStatus ? { ...creativeStatus } : null;
}

export function readCreativePhase(doc: DraftDocument): string | null {
  const phase = readCreativeStatus(doc)?.['phase'];
  return typeof phase === 'string' && phase.trim() !== ''
    ? phase
    : null;
}

export function hasNarration(doc: DraftDocument): boolean {
  return containsNarrationText(doc['content']);
}

export function hasCompleteNarrationApproval(
  doc: DraftDocument,
): boolean {
  const metadata = recordValue(doc['metadata']);
  return metadata?.['directionApproved'] === true;
}

export function withCreativePhase(
  doc: DraftDocument,
  phase: string,
): DraftDocument {
  const metadata = recordValue(doc['metadata']) ?? {};
  const creativeStatus = recordValue(metadata['creativeStatus']) ?? {};
  return {
    ...doc,
    metadata: {
      ...metadata,
      creativeStatus: {
        ...creativeStatus,
        phase,
      },
    },
  };
}

function containsNarrationText(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((node) => {
    const record = recordValue(node);
    if (!record) return false;
    if (
      record['type'] === 'text'
      && typeof record['text'] === 'string'
      && record['text'].trim() !== ''
    ) {
      return true;
    }
    return containsNarrationText(record['content']);
  });
}

function recordValue(
  value: unknown,
): Record<string, unknown> | undefined {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function documentFormat(doc: DraftDocument): DraftFormat {
  let node;
  try {
    node = schema.nodeFromJSON(doc);
    node.check();
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'invalid document';
    throw new Error(`invalid draft document: ${detail}`);
  }
  const format = node.attrs.format;
  if (format !== 'annotated' && format !== 'narration') {
    throw new Error(`invalid draft document format: ${String(format)}`);
  }
  return format;
}

function firstBeatTitle(doc: DraftDocument): string | null {
  const content = doc.content;
  if (!Array.isArray(content)) return null;
  const first = content[0];
  if (!first || typeof first !== 'object') return null;
  const attrs = (first as Record<string, unknown>).attrs;
  if (!attrs || typeof attrs !== 'object') return null;
  const title = (attrs as Record<string, unknown>).title;
  return typeof title === 'string' && title.trim() !== ''
    ? title.trim()
    : null;
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'untitled-draft';
}

function requireNonEmpty(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} is required`);
  }
}
