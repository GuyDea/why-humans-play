import { describe, expect, it, vi } from 'vitest';
import {
  DaemonClientError,
  type ArtifactWriteResult,
  type DraftDocument,
  type DraftRecord,
  type RevisionRecord,
} from '../api/client';
import {
  DraftManager,
  createBlankNarrationDocument,
  isDraftArtifactPath,
  type DraftManagerClient,
} from './draft-manager';

const firstDoc = narrationDoc('Play looks unnecessary.');
const secondDoc = narrationDoc('Play looks essential.');

function narrationDoc(text: string): DraftDocument {
  return {
    type: 'doc',
    attrs: { format: 'narration', preamble: '' },
    content: [
      {
        type: 'beat',
        attrs: {
          beatId: 'beat_aaaaaaaaaa',
          title: 'Opening',
          timeTargetMs: 30_000,
        },
        content: [
          {
            type: 'paragraph',
            content: text
              ? [{ type: 'text', text }]
              : [],
          },
        ],
      },
    ],
  };
}

function draft(
  id: string,
  doc: DraftDocument = firstDoc,
): DraftRecord {
  return {
    id,
    episodeSlug: id,
    title: `Draft ${id}`,
    format: 'narration',
    doc,
    updatedAt: '2026-07-23T10:00:00.000Z',
  };
}

function revision(
  id: string,
  seq: number,
  doc: DraftDocument,
): RevisionRecord {
  return {
    id,
    draftId: 'draft-1',
    seq,
    opId: null,
    disposition: 'autosave',
    doc,
    createdAt: `2026-07-23T10:0${seq}:00.000Z`,
  };
}

function clientFixture(overrides: Partial<DraftManagerClient> = {}): {
  client: DraftManagerClient;
  create: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  listRevisions: ReturnType<typeof vi.fn>;
  importDraft: ReturnType<typeof vi.fn>;
  exportDraft: ReturnType<typeof vi.fn>;
  writeArtifact: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async () => draft('created'));
  const get = vi.fn(async (id: string) => draft(id));
  const save = vi.fn(async (id: string, input: { doc: DraftDocument }) => ({
    draft: draft(id, input.doc),
    revision: revision('revision-saved', 3, input.doc),
  }));
  const list = vi.fn(async () => [draft('draft-1')]);
  const listRevisions = vi.fn(async () => []);
  const importDraft = vi.fn(async () => draft('imported'));
  const exportDraft = vi.fn(async () => ({ markdown: '# Exported' }));
  const writeArtifact = vi.fn(
    async (): Promise<ArtifactWriteResult> => ({
      conflict: false,
      hash: 'hash-1',
    }),
  );

  return {
    create,
    get,
    save,
    list,
    listRevisions,
    importDraft,
    exportDraft,
    writeArtifact,
    client: {
      create,
      get,
      save,
      list,
      listRevisions,
      import: importDraft,
      export: exportDraft,
      writeArtifact,
      ...overrides,
    },
  };
}

describe('DraftManager', () => {
  it('creates and opens a blank narration draft with one beat', async () => {
    const fixture = clientFixture();
    const manager = new DraftManager(fixture.client, {
      nextBeatId: () => 'beat_abcdefghij',
    });

    await manager.createDraft('The hidden work of play', 'hidden-work');

    expect(fixture.create).toHaveBeenCalledWith({
      episodeSlug: 'hidden-work',
      title: 'The hidden work of play',
      format: 'narration',
      doc: createBlankNarrationDocument('beat_abcdefghij'),
    });
    expect(createBlankNarrationDocument('beat_abcdefghij')['metadata']).toEqual({
      creativeStatus: { phase: 'rapid-prototype' },
    });
    expect(manager.activeDraft()?.id).toBe('created');
    expect(manager.drafts().map(({ id }) => id)).toEqual(['created']);
    expect(fixture.listRevisions).toHaveBeenCalledWith('created');
  });

  it('lists, opens, and imports drafts through the client', async () => {
    const imported = draft('imported');
    const fixture = clientFixture({
      import: vi.fn(async () => imported),
    });
    const manager = new DraftManager(fixture.client);

    await manager.loadDrafts();
    await manager.openDraft('draft-1');
    await manager.importMarkdown('# Imported\n\n## 1. Opening\n\n> Hello.');

    expect(manager.drafts().map(({ id }) => id)).toEqual([
      'imported',
      'draft-1',
    ]);
    expect(fixture.get).toHaveBeenCalledWith('draft-1');
    expect(fixture.client.import).toHaveBeenCalledWith(
      '# Imported\n\n## 1. Opening\n\n> Hello.',
    );
    expect(manager.activeDraft()).toEqual(imported);
  });

  it('keeps export blockers and artifact conflicts visible without clobbering', async () => {
    const writeArtifact = vi.fn()
      .mockResolvedValueOnce({
        conflict: true,
        currentHash: 'someone-elses-hash',
      })
      .mockResolvedValueOnce({ conflict: false, hash: 'our-hash' })
      .mockResolvedValueOnce({ conflict: false, hash: 'next-hash' });
    const fixture = clientFixture({
      export: vi.fn()
        .mockRejectedValueOnce(new DaemonClientError(409, {
          error: 'draft export blocked',
          reasons: ['Unsettled variant variant-1', 'Pending proposal proposal-2'],
        }))
        .mockResolvedValue({ markdown: '# Ready' }),
      writeArtifact,
    });
    const manager = new DraftManager(fixture.client);
    await manager.openDraft('draft-1');

    await manager.exportDraft();
    expect(manager.exportBlockedReasons()).toEqual([
      'Unsettled variant variant-1',
      'Pending proposal proposal-2',
    ]);
    expect(manager.exportedMarkdown()).toBeNull();

    await manager.exportDraft();
    expect(manager.exportBlockedReasons()).toEqual([]);
    expect(manager.exportedMarkdown()).toBe('# Ready');

    await manager.writeExportArtifact('../outside.md');
    expect(manager.artifactError()).toBe(
      'Choose a path under whp-youtube/topics/ or whp-youtube/drafts/.',
    );
    expect(writeArtifact).not.toHaveBeenCalled();

    const path = 'whp-youtube/drafts/ready.md';
    await manager.writeExportArtifact(path);
    expect(manager.artifactConflict()).toEqual({
      currentHash: 'someone-elses-hash',
      parked: [],
    });
    expect(writeArtifact).toHaveBeenLastCalledWith(
      path,
      '# Ready',
      { expectNew: true },
    );

    await manager.writeExportArtifact(path);
    expect(manager.artifactHash()).toBe('our-hash');
    expect(manager.artifactConflict()).toBeNull();

    await manager.writeExportArtifact(path);
    expect(writeArtifact).toHaveBeenLastCalledWith(
      path,
      '# Ready',
      { expectedHash: 'our-hash' },
    );
    expect(manager.artifactHash()).toBe('next-hash');
  });

  it('diffs two selected revisions and restores one as a new revision', async () => {
    const revisions = [
      revision('revision-1', 1, firstDoc),
      revision('revision-2', 2, secondDoc),
    ];
    const fixture = clientFixture({
      listRevisions: vi.fn(async () => revisions),
    });
    const manager = new DraftManager(fixture.client);
    await manager.openDraft('draft-1');

    manager.selectRevisions(['revision-2', 'revision-1']);
    expect(manager.selectedRevisions().map(({ id }) => id)).toEqual([
      'revision-1',
      'revision-2',
    ]);
    expect(manager.revisionDiff()).toEqual([
      { kind: 'equal', text: 'Play looks ' },
      { kind: 'delete', text: 'unnecessary.' },
      { kind: 'insert', text: 'essential.' },
    ]);

    await manager.restoreRevision('revision-1');

    expect(fixture.save).toHaveBeenCalledWith('draft-1', {
      doc: firstDoc,
      disposition: 'restore-revision-1',
    });
    expect(manager.activeDraft()?.doc).toBe(firstDoc);
    expect(manager.revisions().map(({ id }) => id)).toEqual([
      'revision-1',
      'revision-2',
      'revision-saved',
    ]);
  });
});

describe('draft artifact path guard', () => {
  it.each([
    'whp-youtube/topics/play.md',
    'whp-youtube/drafts/season/play.md',
  ])('allows %s', (path) => {
    expect(isDraftArtifactPath(path)).toBe(true);
  });

  it.each([
    '',
    '/whp-youtube/drafts/play.md',
    'whp-youtube/topic-runs/play.md',
    'whp-youtube/drafts/',
    'whp-youtube/drafts/../STEERING.md',
    'whp-youtube\\drafts\\play.md',
  ])('rejects %s', (path) => {
    expect(isDraftArtifactPath(path)).toBe(false);
  });
});
