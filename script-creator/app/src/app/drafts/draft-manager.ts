import { computed, signal } from '@angular/core';
import type {
  ArtifactExpectedState,
  ArtifactWriteResult,
  CreateDraftInput,
  DraftDocument,
  DraftRecord,
  RevisionRecord,
  SaveDraftInput,
  SavedDraft,
} from '../api/client';
import {
  diffNarration,
  type NarrationDiffSegment,
} from './revision-diff';

export interface DraftManagerClient {
  list(): Promise<DraftRecord[]>;
  create(input: CreateDraftInput): Promise<DraftRecord>;
  get(id: string): Promise<DraftRecord>;
  save(id: string, input: SaveDraftInput): Promise<SavedDraft>;
  listRevisions(id: string): Promise<RevisionRecord[]>;
  import(markdown: string): Promise<DraftRecord>;
  export(id: string): Promise<{ markdown: string }>;
  writeArtifact(
    path: string,
    content: string,
    expectedState: ArtifactExpectedState,
  ): Promise<ArtifactWriteResult>;
}

export interface ArtifactConflict {
  currentHash: string | 'absent';
  parked: string[];
}

export interface DraftManagerOptions {
  nextBeatId?: () => string;
}

export class DraftManager {
  readonly drafts = signal<DraftRecord[]>([]);
  readonly activeDraft = signal<DraftRecord | null>(null);
  readonly revisions = signal<RevisionRecord[]>([]);
  readonly selectedRevisionIds = signal<string[]>([]);
  readonly selectedRevisions = computed(() => {
    const selected = new Set(this.selectedRevisionIds());
    return this.revisions().filter(({ id }) => selected.has(id));
  });
  readonly revisionDiff = computed<NarrationDiffSegment[]>(() => {
    const selected = this.selectedRevisions();
    return selected.length === 2
      ? diffNarration(selected[0]!.doc, selected[1]!.doc)
      : [];
  });

  readonly loading = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly exportedMarkdown = signal<string | null>(null);
  readonly exportBlockedReasons = signal<string[]>([]);
  readonly exportError = signal<string | null>(null);
  readonly artifactError = signal<string | null>(null);
  readonly artifactConflict = signal<ArtifactConflict | null>(null);
  readonly artifactHash = signal<string | null>(null);

  private readonly nextBeatId: () => string;
  private readonly artifactHashes = new Map<string, string>();

  constructor(
    private readonly client: DraftManagerClient,
    options: DraftManagerOptions = {},
  ) {
    this.nextBeatId = options.nextBeatId ?? createBeatId;
  }

  async loadDrafts(): Promise<void> {
    this.loading.set(true);
    this.actionError.set(null);
    try {
      this.drafts.set(sortDrafts(await this.client.list()));
    } catch (error) {
      this.actionError.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async createDraft(title: string, episodeSlug?: string): Promise<void> {
    const cleanTitle = title.trim();
    if (cleanTitle === '') {
      this.actionError.set('Give the draft a title.');
      return;
    }
    const cleanSlug = (episodeSlug ?? '').trim() || slugify(cleanTitle);
    this.actionError.set(null);

    try {
      const created = await this.client.create({
        episodeSlug: cleanSlug,
        title: cleanTitle,
        format: 'narration',
        doc: createBlankNarrationDocument(this.nextBeatId()),
      });
      this.upsertDraft(created, true);
      await this.activate(created);
    } catch (error) {
      this.actionError.set(errorMessage(error));
    }
  }

  async openDraft(id: string): Promise<void> {
    this.actionError.set(null);
    try {
      const opened = await this.client.get(id);
      this.upsertDraft(opened);
      await this.activate(opened);
    } catch (error) {
      this.actionError.set(errorMessage(error));
    }
  }

  async importMarkdown(markdown: string): Promise<void> {
    if (markdown.trim() === '') {
      this.actionError.set('Paste narration Markdown or choose a Markdown file.');
      return;
    }
    this.actionError.set(null);
    try {
      const imported = await this.client.import(markdown);
      this.upsertDraft(imported, true);
      await this.activate(imported);
    } catch (error) {
      this.actionError.set(errorMessage(error));
    }
  }

  async refreshRevisions(): Promise<void> {
    const draft = this.activeDraft();
    if (!draft) return;

    try {
      const revisions = await this.client.listRevisions(draft.id);
      this.revisions.set(revisions);
      this.selectedRevisionIds.set(
        revisions.slice(-2).map(({ id }) => id),
      );
    } catch (error) {
      this.revisions.set([]);
      this.selectedRevisionIds.set([]);
      this.actionError.set(errorMessage(error));
    }
  }

  selectRevisions(ids: string[]): void {
    const requested = new Set(ids);
    this.selectedRevisionIds.set(
      this.revisions()
        .filter(({ id }) => requested.has(id))
        .slice(-2)
        .map(({ id }) => id),
    );
  }

  toggleRevision(id: string, selected: boolean): void {
    const ids = this.selectedRevisionIds();
    if (!selected) {
      this.selectRevisions(ids.filter((candidate) => candidate !== id));
      return;
    }
    if (ids.includes(id) || ids.length >= 2) return;
    this.selectRevisions([...ids, id]);
  }

  async restoreRevision(id: string): Promise<void> {
    const draft = this.activeDraft();
    const revision = this.revisions().find((candidate) => candidate.id === id);
    if (!draft || !revision) {
      this.actionError.set('Choose a revision to restore.');
      return;
    }

    this.actionError.set(null);
    try {
      const saved = await this.client.save(draft.id, {
        doc: revision.doc,
        disposition: `restore-${revision.id}`,
      });
      this.activeDraft.set(saved.draft);
      this.upsertDraft(saved.draft, true);
      this.revisions.update((revisions) => [
        ...revisions.filter(({ id }) => id !== saved.revision.id),
        saved.revision,
      ]);
      this.selectRevisions([revision.id, saved.revision.id]);
      this.resetExport();
    } catch (error) {
      this.actionError.set(errorMessage(error));
    }
  }

  async exportDraft(): Promise<void> {
    const draft = this.activeDraft();
    this.resetExport();
    if (!draft) {
      this.exportError.set('Open a draft before exporting.');
      return;
    }

    try {
      const exported = await this.client.export(draft.id);
      this.exportedMarkdown.set(exported.markdown);
    } catch (error) {
      const blockers = exportBlockers(error);
      if (blockers) {
        this.exportBlockedReasons.set(blockers);
      } else {
        this.exportError.set(errorMessage(error));
      }
    }
  }

  async writeExportArtifact(path: string): Promise<void> {
    this.artifactError.set(null);
    this.artifactConflict.set(null);
    const markdown = this.exportedMarkdown();
    if (markdown === null) {
      this.artifactError.set('Export the active draft before writing it.');
      return;
    }

    const cleanPath = path.trim();
    if (!isDraftArtifactPath(cleanPath)) {
      this.artifactError.set(
        'Choose a path under whp-youtube/topics/ or whp-youtube/drafts/.',
      );
      return;
    }

    const knownHash = this.artifactHashes.get(cleanPath);
    const expectedState: ArtifactExpectedState = knownHash
      ? { expectedHash: knownHash }
      : { expectNew: true };

    try {
      const result = await this.client.writeArtifact(
        cleanPath,
        markdown,
        expectedState,
      );
      this.applyArtifactResult(cleanPath, result);
    } catch (error) {
      const conflict = artifactConflict(error);
      if (conflict) {
        this.artifactConflict.set(conflict);
      } else {
        this.artifactError.set(errorMessage(error));
      }
    }
  }

  private async activate(draft: DraftRecord): Promise<void> {
    this.activeDraft.set(draft);
    this.resetExport();
    await this.refreshRevisions();
  }

  private upsertDraft(draft: DraftRecord, moveFirst = false): void {
    this.drafts.update((drafts) => {
      const without = drafts.filter(({ id }) => id !== draft.id);
      return moveFirst
        ? [draft, ...without]
        : sortDrafts([...without, draft]);
    });
  }

  private applyArtifactResult(
    path: string,
    result: ArtifactWriteResult,
  ): void {
    if (result.conflict) {
      this.artifactHash.set(null);
      this.artifactConflict.set({
        currentHash: result.currentHash,
        parked: result.parked ?? [],
      });
      return;
    }

    this.artifactHashes.set(path, result.hash);
    this.artifactHash.set(result.hash);
    this.artifactConflict.set(null);
  }

  private resetExport(): void {
    this.exportedMarkdown.set(null);
    this.exportBlockedReasons.set([]);
    this.exportError.set(null);
    this.artifactError.set(null);
    this.artifactConflict.set(null);
    this.artifactHash.set(null);
  }
}

export function createBlankNarrationDocument(beatId: string): DraftDocument {
  return {
    type: 'doc',
    attrs: { format: 'narration', preamble: '' },
    content: [
      {
        type: 'beat',
        attrs: {
          beatId,
          title: 'Opening',
          timeTargetMs: 30_000,
        },
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      },
    ],
  };
}

export function isDraftArtifactPath(path: string): boolean {
  if (
    path === ''
    || path.startsWith('/')
    || path.includes('\\')
    || path.includes('\0')
    || path.split('/').some((part) => part === '..')
  ) {
    return false;
  }

  return [
    'whp-youtube/topics/',
    'whp-youtube/drafts/',
  ].some((prefix) => path.startsWith(prefix) && path.length > prefix.length);
}

function createBeatId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  return `beat_${Array.from(
    bytes,
    (value) => alphabet[value % alphabet.length],
  ).join('')}`;
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    || 'untitled-draft';
}

function sortDrafts(drafts: DraftRecord[]): DraftRecord[] {
  return [...drafts].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt));
}

function exportBlockers(error: unknown): string[] | null {
  if (errorStatus(error) !== 409) return null;
  const body = errorBody(error);
  if (body && Array.isArray(body['reasons'])) {
    const reasons = body['reasons'].filter(
      (reason): reason is string => typeof reason === 'string',
    );
    if (reasons.length > 0) return reasons;
  }
  return [errorMessage(error)];
}

function artifactConflict(error: unknown): ArtifactConflict | null {
  if (errorStatus(error) !== 409) return null;
  const body = errorBody(error);
  const currentHash = body?.['currentHash'];
  if (typeof currentHash !== 'string') return null;
  const parked = Array.isArray(body?.['parked'])
    ? body['parked'].filter(
      (path): path is string => typeof path === 'string',
    )
    : [];
  return { currentHash, parked };
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as Record<string, unknown>)['status'];
  return typeof status === 'number' ? status : null;
}

function errorBody(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== 'object') return null;
  const body = (error as Record<string, unknown>)['body'];
  return body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'The daemon request failed.';
}
