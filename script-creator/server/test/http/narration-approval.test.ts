import {
  parseMarkdown,
  schema,
} from '@whp/script-creator-editor-core';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ArchitectureService,
} from '../../src/architecture/service.js';
import { ARCHITECTURE_SECTIONS } from '../../src/architecture/codec.js';
import { DocumentService } from '../../src/documents/service.js';
import { DocumentStore } from '../../src/documents/store.js';
import { buildApp } from '../../src/http/app.js';
import { UNUSED_VALIDATOR_SERVICE } from './stubs.js';

const NONCE = 'narration-approval-nonce';
const AUTH = { 'x-sc-nonce': NONCE };
const fixtures: Array<{
  root: string;
  store: DocumentStore;
  app: ReturnType<typeof buildApp>;
}> = [];

afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    await fixture.app.close();
    fixture.store.close();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

describe('complete narration approval HTTP API', () => {
  it('freezes the exact export, writes the canonical baseline, and advances only to creative-approved', async () => {
    const fixture = makeFixture();
    const response = await requestApproval(fixture);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      approvedNarrationMd: approvedNarration(),
      approvedNarrationAt: '2026-07-24T13:00:00.000Z',
      approvedNarrationRevisionSeq: 1,
    });
    expect(fixture.artifacts.write).toHaveBeenCalledWith(
      'whp-youtube/drafts/composition-net.md',
      approvedNarration(),
      { expectNew: true },
    );
    expect(fixture.artifacts.upsertPipelineRow).toHaveBeenCalledWith({
      episodeSlug: 'composition-net',
      milestone: 'creative-approved',
      ref: 'whp-youtube/drafts/composition-net.md',
    });
    expect(readPhase(response.json().doc)).toBe('creative-approved');
    expect(response.json().doc.metadata.readiness).toBe('EDITORIAL-DRAFT');
  });

  it.each([
    {
      name: 'stale revision',
      body: {
        expectedRevisionSeq: 9,
        expectedNarrationMd: approvedNarration(),
      },
      error: 'narration revision conflict',
    },
  ])('refuses $name without repository writes', async ({ body, error }) => {
    const fixture = makeFixture();
    const response = await prepareApproval(fixture, body);

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error });
    expect(fixture.artifacts.write).not.toHaveBeenCalled();
    expect(fixture.artifacts.upsertPipelineRow).not.toHaveBeenCalled();
  });

  it('refuses reconciliation, missing architecture approval, and unsettled variants', async () => {
    const reconciliation = makeFixture({ reconciliationRequired: true });
    const missingArchitecture = makeFixture({ approvedArchitecture: false });
    const unsettled = makeFixture({ unsettledVariant: true });

    for (const [fixture, error] of [
      [reconciliation, 'narration approval refused: narration reconciliation is required'],
      [missingArchitecture, 'narration approval refused: architecture approval is required'],
      [unsettled, 'narration approval refused: unsettled export'],
    ] as const) {
      const response = await requestApproval(fixture);
      expect(response.statusCode).toBe(409);
      expect(response.json().error).toContain(error);
    }
  });

  it('refuses an editor export that does not exactly match the stored revision', async () => {
    const fixture = makeFixture();
    const response = await prepareApproval(fixture, {
        expectedRevisionSeq: 0,
        expectedNarrationMd: '## 1. Opening\n\n> Stale editor narration.',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error:
        'narration approval refused: editor export does not match the stored revision',
    });
    expect(fixture.artifacts.write).not.toHaveBeenCalled();
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(0);
  });

  it('requires a server-registered proposal decision before issuing a settled export', async () => {
    const fixture = makeFixture();
    const submitted = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/ops',
      headers: AUTH,
      payload: {
        operation: 'rewrite-selection',
        inputs: {
          topic_brief: {},
          approved_lessons: [],
          creative_status: {},
          selection: 'Approved complete narration.',
          before: '',
          after: '',
          beat_title: '1. Opening',
          narrative_job: 'open',
          requested_scope: 'rewrite',
        },
      },
    });
    expect(submitted.statusCode).toBe(200);

    const response = await prepareApproval(fixture, {
      expectedRevisionSeq: 0,
      expectedNarrationMd: approvedNarration(),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: 'narration approval refused: unresolved proposals',
    });
    const pending = await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1/narration/proposals',
      headers: AUTH,
    });
    expect(pending.statusCode).toBe(200);
    expect(pending.json()).toEqual({
      proposals: [expect.objectContaining({
        operationId: 'operation-1',
        state: 'pending',
        acceptedRevisionPresent: false,
      })],
    });

    const falseAcceptance = await fixture.app.inject({
      method: 'POST',
      url:
        '/api/drafts/draft-1/narration/proposals/operation-1/resolve',
      headers: AUTH,
      payload: { decision: 'accepted' },
    });
    expect(falseAcceptance.statusCode).toBe(409);
    expect(falseAcceptance.json()).toEqual({
      error:
        'narration proposal resolution refused: accepted proposal revision is missing',
    });

    const resolved = await fixture.app.inject({
      method: 'POST',
      url:
        '/api/drafts/draft-1/narration/proposals/operation-1/resolve',
      headers: AUTH,
      payload: { decision: 'rejected' },
    });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json()).toMatchObject({
      draftId: 'draft-1',
      operationId: 'operation-1',
      state: 'rejected',
    });
    expect((await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1/narration/proposals',
      headers: AUTH,
    })).json()).toEqual({ proposals: [] });
    expect((await prepareApproval(fixture)).statusCode).toBe(200);
  });

  it('accepts a registered proposal only after its operation revision is durable', async () => {
    const fixture = makeFixture();
    await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/ops',
      headers: AUTH,
      payload: {
        operation: 'rewrite-selection',
        inputs: {
          topic_brief: {},
          approved_lessons: [],
          creative_status: {},
          selection: 'Approved complete narration.',
          before: '',
          after: '',
          beat_title: '1. Opening',
          narrative_job: 'open',
          requested_scope: 'rewrite',
        },
      },
    });
    const saved = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: approvedDocument(),
        opId: 'operation-1',
        disposition: 'selection-proposal-accepted',
      },
    });
    expect(saved.statusCode).toBe(200);

    const resolved = await fixture.app.inject({
      method: 'POST',
      url:
        '/api/drafts/draft-1/narration/proposals/operation-1/resolve',
      headers: AUTH,
      payload: { decision: 'accepted' },
    });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json()).toMatchObject({ state: 'accepted' });
    expect((await prepareApproval(fixture, {
      expectedRevisionSeq: 1,
      expectedNarrationMd: approvedNarration(),
    })).statusCode).toBe(200);
  });

  it('durably rejects the predecessor before a proposal reroll is submitted', async () => {
    const fixture = makeFixture();
    await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/ops',
      headers: AUTH,
      payload: {
        operation: 'rewrite-selection',
        inputs: { selection: 'Approved complete narration.' },
      },
    });

    const rerolled = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/ops/operation-1/resume',
      headers: AUTH,
      payload: {
        inputs: { selection: 'Approved complete narration.' },
      },
    });

    expect(rerolled.statusCode).toBe(200);
    expect(rerolled.json()).toEqual({ id: 'operation-2' });
    expect(fixture.store.getNarrationProposal(
      'draft-1',
      'operation-1',
    )?.state).toBe('rejected');
    expect(fixture.store.getNarrationProposal(
      'draft-1',
      'operation-2',
    )?.state).toBe('pending');
  });

  it('blocks a concurrent draft save after approval reservation and before repository writes finish', async () => {
    let releaseWrite = () => {};
    let markWriteStarted = () => {};
    const writeStarted = new Promise<void>((resolve) => {
      markWriteStarted = resolve;
    });
    const writeBarrier = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const fixture = makeFixture({
      write: async () => {
        markWriteStarted();
        await writeBarrier;
        return {
          conflict: false as const,
          hash: 'narration-hash',
        };
      },
    });
    const prepared = await prepareApproval(fixture);
    expect(prepared.statusCode).toBe(200);
    const approval = fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/narration/approve',
      headers: AUTH,
      payload: {
        expectedRevisionSeq: 0,
        settledExportToken: prepared.json().settledExportToken,
      },
    });
    await writeStarted;

    const concurrentDoc = structuredClone(
      fixture.store.getDraft('draft-1')!.doc,
    );
    replaceFirstText(concurrentDoc, 'Concurrent edit.');
    const save = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: concurrentDoc,
        disposition: 'autosave',
      },
    });

    expect(save.statusCode).toBe(425);
    expect(save.json().error).toContain(
      'draft write deferred: narration approval is in progress',
    );
    releaseWrite();
    const approved = await approval;
    expect(approved.statusCode).toBe(200);
    expect(approved.json().approvedNarrationMd).toBe(approvedNarration());
    expect(readPhase(approved.json().doc)).toBe('creative-approved');
  });

  it('refuses approval without a server-issued settled export token', async () => {
    const fixture = makeFixture();
    const response = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/narration/approve',
      headers: AUTH,
      payload: {
        expectedRevisionSeq: 0,
        settledExportToken: 'forged-token',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error:
        'narration approval refused: settled export token is stale or invalid',
    });
    expect(fixture.artifacts.write).not.toHaveBeenCalled();
  });
});

function prepareApproval(
  fixture: ReturnType<typeof makeFixture>,
  payload: {
    expectedRevisionSeq: number;
    expectedNarrationMd: string;
  } = {
    expectedRevisionSeq: 0,
    expectedNarrationMd: approvedNarration(),
  },
) {
  return fixture.app.inject({
    method: 'POST',
    url: '/api/drafts/draft-1/narration/settled-export',
    headers: AUTH,
    payload,
  });
}

async function requestApproval(
  fixture: ReturnType<typeof makeFixture>,
) {
  const prepared = await prepareApproval(fixture);
  if (prepared.statusCode !== 200) return prepared;
  return fixture.app.inject({
    method: 'POST',
    url: '/api/drafts/draft-1/narration/approve',
    headers: AUTH,
    payload: {
      expectedRevisionSeq: 0,
      settledExportToken: prepared.json().settledExportToken,
    },
  });
}

function makeFixture(options: {
  reconciliationRequired?: boolean;
  approvedArchitecture?: boolean;
  unsettledVariant?: boolean;
  write?: () => Promise<{
    conflict: false;
    hash: string;
  }>;
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'narration-approval-'));
  const store = new DocumentStore(join(root, 'state.sqlite3'));
  const now = () => '2026-07-24T13:00:00.000Z';
  const documentService = new DocumentService({
    store,
    idFactory: () => 'unused-id',
    now,
  });
  const doc = options.unsettledVariant
    ? unsettledDocument()
    : approvedDocument();
  const sections = ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
    key,
    title,
    md: `### ${title}\n\nApproved ${key}.\n`,
  }));
  const approvedMd = options.approvedArchitecture === false
    ? null
    : sections.map(({ md }) => md).join('');
  store.createDraft({
    id: 'draft-1',
    episodeSlug: 'composition-net',
    title: 'Composition net',
    format: 'narration',
    doc,
    architecture: {
      sections,
      approvedMd,
      approvedAt: approvedMd ? now() : null,
    },
    architectureArtifactHash: 'architecture-hash',
    narrationReconciliationRequired:
      options.reconciliationRequired === true,
    updatedAt: now(),
  });
  const artifacts = {
    write: vi.fn(options.write ?? (async () => ({
      conflict: false as const,
      hash: 'narration-hash',
    }))),
    upsertPipelineRow: vi.fn(async () => ({
      conflict: false as const,
      hash: 'pipeline-hash',
    })),
    read: vi.fn(),
  };
  let operationSequence = 0;
  const architectureService = new ArchitectureService({
    store,
    operationService: {
      submit: () => `operation-${++operationSequence}`,
      get: () => ({ operation: 'rewrite-selection' as const }),
      result: () => ({
        kind: 'schema',
        value: { replacement_markdown: '> Proposed narration.' },
        guardrail: null,
      }),
    },
    artifactService: artifacts,
    idFactory: () => 'approval-revision-1',
    now,
  });
  const app = buildApp({
    nonce: NONCE,
    operationService: {
      submit: () => 'operation-1',
      list: () => [],
      get: () => {
        throw new Error('operation not found: operation-1');
      },
      events: () => [],
      cancel: () => {},
      result: () => ({ kind: 'pending' }),
    },
    documentService,
    architectureService,
    artifactService: artifacts,
    validatorService: UNUSED_VALIDATOR_SERVICE,
  });
  const fixture = { root, store, app, artifacts };
  fixtures.push(fixture);
  return fixture;
}

function approvedDocument() {
  const doc = parseMarkdown(approvedNarration()).toJSON() as Record<string, unknown>;
  doc['metadata'] = {
    creativeStatus: { phase: 'rapid-prototype' },
    readiness: 'EDITORIAL-DRAFT',
  };
  return doc;
}

function unsettledDocument() {
  const option = schema.node('variantOption', { label: 'A' }, [
    schema.node('paragraph', null, [schema.text('Maybe this.')]),
  ]);
  const doc = schema.node('doc', { format: 'narration', preamble: '' }, [
    schema.node('beat', {
      beatId: 'beat_abcdefghij',
      title: '1. Opening',
      timeTargetMs: 30_000,
    }, [
      schema.node('variantSet', {
        variantId: 'variant-1',
        activeIndex: 0,
        settled: false,
      }, [option]),
    ]),
  ]).toJSON() as Record<string, unknown>;
  doc['metadata'] = {
    creativeStatus: { phase: 'rapid-prototype' },
    readiness: 'EDITORIAL-DRAFT',
  };
  return doc;
}

function approvedNarration(): string {
  return '## 1. Opening\n\n> Approved complete narration.';
}

function readPhase(doc: Record<string, unknown>): unknown {
  return ((doc.metadata as Record<string, unknown>)
    .creativeStatus as Record<string, unknown>).phase;
}

function replaceFirstText(
  value: unknown,
  replacement: string,
): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => replaceFirstText(item, replacement));
  }
  if (value === null || typeof value !== 'object') return false;
  const object = value as Record<string, unknown>;
  if (object['type'] === 'text' && typeof object['text'] === 'string') {
    object['text'] = replacement;
    return true;
  }
  return Object.values(object).some((item) =>
    replaceFirstText(item, replacement));
}
