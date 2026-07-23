import {
  parseMarkdown,
  schema,
} from '@whp/script-creator-editor-core';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentService } from '../../src/documents/service.js';
import { DocumentStore } from '../../src/documents/store.js';

interface Fixture {
  root: string;
  store: DocumentStore;
  service: DocumentService;
}

const fixtures: Fixture[] = [];

function makeFixture(ids = ['draft-1', 'revision-1']): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'document-service-'));
  const store = new DocumentStore(join(root, 'state.sqlite3'));
  const remainingIds = [...ids];
  const service = new DocumentService({
    store,
    idFactory: () => {
      const id = remainingIds.shift();
      if (!id) throw new Error('test id factory exhausted');
      return id;
    },
    now: () => '2026-07-23T09:00:00.000Z',
  });
  const fixture = { root, store, service };
  fixtures.push(fixture);
  return fixture;
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    fixture.store.close();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

describe('DocumentService', () => {
  it('creates and retrieves a validated draft document', () => {
    const fixture = makeFixture();
    const doc = parseMarkdown('## 1. Opening\n\n> A first line.').toJSON();

    const created = fixture.service.createDraft({
      episodeSlug: 'opening',
      title: 'Opening',
      format: 'narration',
      doc,
    });

    expect(created).toEqual({
      id: 'draft-1',
      episodeSlug: 'opening',
      title: 'Opening',
      format: 'narration',
      doc,
      updatedAt: '2026-07-23T09:00:00.000Z',
    });
    expect(fixture.service.getDraft(created.id)).toEqual(created);
    expect(fixture.service.listRevisions(created.id)).toEqual([]);
  });

  it('saves a new head and exposes its revision metadata', () => {
    const fixture = makeFixture();
    const initial = parseMarkdown('## 1. Opening\n\n> A first line.').toJSON();
    const revised = parseMarkdown('## 1. Opening\n\n> A stronger line.').toJSON();
    const created = fixture.service.createDraft({
      episodeSlug: 'opening',
      title: 'Opening',
      format: 'narration',
      doc: initial,
    });

    const saved = fixture.service.saveDraft(created.id, {
      doc: revised,
      opId: 'operation-1',
      disposition: 'accepted',
    });

    expect(saved.draft.doc).toEqual(revised);
    expect(saved.revision).toMatchObject({
      id: 'revision-1',
      draftId: created.id,
      seq: 1,
      opId: 'operation-1',
      disposition: 'accepted',
      doc: revised,
    });
    expect(fixture.service.listRevisions(created.id)).toEqual([
      saved.revision,
    ]);
  });

  it('imports and exports narration Markdown through the real editor-core codec', () => {
    const fixture = makeFixture();
    const markdown = [
      '# An episode',
      '',
      '## 1. The hook',
      '',
      '> First line joined',
      '> across wraps.',
      '>',
      '> Second paragraph.',
    ].join('\n');

    const imported = fixture.service.importMarkdown(markdown);

    expect(imported).toMatchObject({
      id: 'draft-1',
      episodeSlug: 'an-episode',
      title: 'An episode',
      format: 'narration',
    });
    expect(fixture.service.exportMarkdown(imported.id)).toBe([
      '# An episode',
      '',
      '## 1. The hook',
      '',
      '> First line joined across wraps.',
      '',
      '> Second paragraph.',
    ].join('\n'));
  });

  it('surfaces editor-core export blockers with the complete reasons list', () => {
    const fixture = makeFixture();
    const option = schema.node('variantOption', { label: 'A' }, [
      schema.node('paragraph', null, [schema.text('Maybe this.')]),
    ]);
    const unsettled = schema.node('variantSet', {
      variantId: 'variant-1',
      activeIndex: 0,
      settled: false,
    }, [option]);
    const doc = schema.node('doc', null, [
      schema.node('beat', {
        beatId: 'beat_abcdefghij',
        title: 'Hook',
        timeTargetMs: 30_000,
      }, [unsettled]),
    ]);
    const created = fixture.service.createDraft({
      episodeSlug: 'blocked',
      title: 'Blocked',
      format: 'annotated',
      doc: doc.toJSON(),
    });

    expect(() => fixture.service.exportMarkdown(created.id)).toThrowError(
      expect.objectContaining({
        message: 'draft export blocked',
        reasons: ['variant variant-1 unsettled'],
      }),
    );
  });

  it('rejects mismatched formats and reports missing drafts', () => {
    const fixture = makeFixture();
    const doc = parseMarkdown('## 1. Opening\n\n> A first line.').toJSON();

    expect(() => fixture.service.createDraft({
      episodeSlug: 'opening',
      title: 'Opening',
      format: 'annotated',
      doc,
    })).toThrow(/format.*narration/i);
    expect(() => fixture.service.getDraft('missing'))
      .toThrow(/draft not found: missing/i);
    expect(() => fixture.service.listRevisions('missing'))
      .toThrow(/draft not found: missing/i);
    expect(() => fixture.service.exportMarkdown('missing'))
      .toThrow(/draft not found: missing/i);
  });
});
