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
import { buildApp } from '../../src/http/app.js';
import { UNUSED_VALIDATOR_SERVICE } from './stubs.js';

const NONCE = 'task-12-document-nonce';
const AUTH = { 'x-sc-nonce': NONCE };

interface Fixture {
  root: string;
  store: DocumentStore;
  app: ReturnType<typeof buildApp>;
}

const fixtures: Fixture[] = [];

function makeFixture(ids: string[]): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'document-http-'));
  const store = new DocumentStore(join(root, 'state.sqlite3'));
  const remainingIds = [...ids];
  const documentService = new DocumentService({
    store,
    idFactory: () => {
      const id = remainingIds.shift();
      if (!id) throw new Error('test id factory exhausted');
      return id;
    },
    now: () => '2026-07-23T10:00:00.000Z',
  });
  const app = buildApp({
    nonce: NONCE,
    operationService: {
      submit: () => 'operation-1',
      get: () => {
        throw new Error('operation not found: operation-1');
      },
      events: () => [],
      cancel: () => {},
      result: () => ({ kind: 'pending' }),
    },
    documentService,
    artifactService: {},
    validatorService: UNUSED_VALIDATOR_SERVICE,
  });
  const fixture = { root, store, app };
  fixtures.push(fixture);
  return fixture;
}

afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    await fixture.app.close();
    fixture.store.close();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

describe('drafts HTTP API', () => {
  it('lists no drafts from an empty store', async () => {
    const fixture = makeFixture([]);

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('lists body-free draft summaries newest-updated first', async () => {
    const fixture = makeFixture([]);
    const doc = parseMarkdown('## 1. Opening\n\n> A first line.').toJSON();
    fixture.store.createDraft({
      id: 'draft-older',
      episodeSlug: 'older',
      title: 'Older draft',
      format: 'narration',
      doc,
      updatedAt: '2026-07-23T08:00:00.000Z',
    });
    fixture.store.createDraft({
      id: 'draft-newer',
      episodeSlug: 'newer',
      title: 'Newer draft',
      format: 'annotated',
      doc: {
        ...doc,
        attrs: { ...doc.attrs, format: 'annotated' },
      },
      updatedAt: '2026-07-23T09:00:00.000Z',
    });

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: 'draft-newer',
        episodeSlug: 'newer',
        title: 'Newer draft',
        format: 'annotated',
        updatedAt: '2026-07-23T09:00:00.000Z',
      },
      {
        id: 'draft-older',
        episodeSlug: 'older',
        title: 'Older draft',
        format: 'narration',
        updatedAt: '2026-07-23T08:00:00.000Z',
      },
    ]);
  });

  it('requires the nonce to list drafts', async () => {
    const fixture = makeFixture([]);

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'invalid nonce' });
  });

  it('creates and gets a draft', async () => {
    const fixture = makeFixture(['draft-1']);
    const doc = parseMarkdown('## 1. Opening\n\n> A first line.').toJSON();

    const created = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts',
      headers: AUTH,
      payload: {
        episodeSlug: 'opening',
        title: 'Opening',
        format: 'narration',
        doc,
      },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      id: 'draft-1',
      episodeSlug: 'opening',
      title: 'Opening',
      format: 'narration',
      doc,
    });

    const fetched = await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1',
      headers: AUTH,
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json()).toEqual(created.json());
  });

  it('saves each head as a monotonic revision and lists the history', async () => {
    const fixture = makeFixture(['draft-1', 'revision-1', 'revision-2']);
    const original = parseMarkdown('## 1. Opening\n\n> Original.').toJSON();
    const first = parseMarkdown('## 1. Opening\n\n> First revision.').toJSON();
    const second = parseMarkdown('## 1. Opening\n\n> Second revision.').toJSON();
    await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts',
      headers: AUTH,
      payload: {
        episodeSlug: 'opening',
        title: 'Opening',
        format: 'narration',
        doc: original,
      },
    });

    const firstSave = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: first,
        opId: null,
        disposition: 'manual-save',
      },
    });
    const secondSave = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        title: 'A better opening',
        format: 'narration',
        doc: second,
        opId: 'operation-2',
        disposition: 'accepted',
      },
    });

    expect(firstSave.statusCode).toBe(200);
    expect(firstSave.json()).toMatchObject({
      draft: { doc: first },
      revision: { id: 'revision-1', seq: 1, doc: first },
    });
    expect(secondSave.statusCode).toBe(200);
    expect(secondSave.json()).toMatchObject({
      draft: { title: 'A better opening', doc: second },
      revision: {
        id: 'revision-2',
        seq: 2,
        opId: 'operation-2',
        disposition: 'accepted',
        doc: second,
      },
    });

    const revisions = await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1/revisions',
      headers: AUTH,
    });
    expect(revisions.statusCode).toBe(200);
    expect(revisions.json()).toMatchObject([
      { id: 'revision-1', seq: 1 },
      { id: 'revision-2', seq: 2 },
    ]);
  });

  it('round-trips narration Markdown through import and export routes', async () => {
    const fixture = makeFixture(['draft-imported']);
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

    const imported = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/import',
      headers: AUTH,
      payload: { markdown },
    });

    expect(imported.statusCode).toBe(201);
    expect(imported.json()).toMatchObject({
      id: 'draft-imported',
      episodeSlug: 'an-episode',
      title: 'An episode',
      format: 'narration',
    });
    const exported = await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts/draft-imported/export',
      headers: AUTH,
    });
    expect(exported.statusCode).toBe(200);
    expect(exported.json()).toEqual({
      markdown: [
        '# An episode',
        '',
        '## 1. The hook',
        '',
        '> First line joined across wraps.',
        '',
        '> Second paragraph.',
      ].join('\n'),
    });
  });

  it('returns 409 with all editor-core reasons when export is blocked', async () => {
    const fixture = makeFixture(['draft-blocked']);
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
    ]).toJSON();
    await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts',
      headers: AUTH,
      payload: {
        episodeSlug: 'blocked',
        title: 'Blocked',
        format: 'annotated',
        doc,
      },
    });

    const response = await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts/draft-blocked/export',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: 'draft export blocked',
      reasons: ['variant variant-1 unsettled'],
    });
  });

  it('maps missing drafts to 404 and invalid request bodies to 400', async () => {
    const fixture = makeFixture([]);
    const missing = await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts/missing',
      headers: AUTH,
    });
    const invalid = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/import',
      headers: AUTH,
      payload: { markdown: '' },
    });

    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'draft not found: missing' });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({ error: 'markdown is required' });
  });
});
