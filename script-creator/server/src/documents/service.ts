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
} from './store.js';

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

export class DocumentService {
  private readonly store: DocumentStore;
  private readonly idFactory: () => string;
  private readonly now: () => string;

  constructor(opts: {
    store: DocumentStore;
    idFactory?: () => string;
    now?: () => string;
  }) {
    this.store = opts.store;
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

    return this.store.saveDraft(id, {
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
    const result = encodeMarkdown(schema.nodeFromJSON(draft.doc));
    if (!result.ok) throw new ExportBlockedError(result.blocked);
    return result.markdown;
  }
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
