import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ARCHITECTURE_SECTIONS,
  joinArchitecture,
  type ArchitectureSection,
} from '../../src/architecture/codec.js';
import { ArchitectureService } from '../../src/architecture/service.js';
import { DocumentService } from '../../src/documents/service.js';
import { DocumentStore } from '../../src/documents/store.js';
import { buildApp } from '../../src/http/app.js';
import {
  upsertPipelineRow,
  writeArtifact,
  type ArtifactWriteResult,
  type PipelineRow,
} from '../../src/repo/artifacts.js';
import { MilestoneConflictError } from '../../src/repo/milestones.js';
import { UNUSED_VALIDATOR_SERVICE } from './stubs.js';

const NONCE = 'architecture-action-nonce';
const AUTH = { 'x-sc-nonce': NONCE };

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function sections(): ArchitectureSection[] {
  return ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
    key,
    title,
    md: `### ${title}\n\n${key} body.\n\n`,
  }));
}

function doc(narration = '') {
  return {
    type: 'doc',
    attrs: { format: 'narration', preamble: '' },
    metadata: {
      creativeStatus: { phase: 'architecture' },
      directionApproved: false,
    },
    content: [{
      type: 'beat',
      attrs: {
        beatId: 'beat_architecture_http',
        title: 'Opening',
        timeTargetMs: 30_000,
      },
      content: [{
        type: 'paragraph',
        content: narration
          ? [{ type: 'text', text: narration }]
          : [],
      }],
    }],
  };
}

interface Fixture {
  root: string;
  store: DocumentStore;
  documentService: DocumentService;
  architectureService: ArchitectureService;
  app: ReturnType<typeof buildApp>;
  write: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  nextId: number;
  milestoneFailure: Error | undefined;
}

const fixtures: Fixture[] = [];

function makeFixture(input: {
  architectureSections?: ArchitectureSection[];
  narration?: string;
  milestoneFailure?: Error;
} = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'architecture-http-'));
  const store = new DocumentStore(join(root, 'state.sqlite3'));
  const documentService = new DocumentService({ store });
  store.createDraft({
    id: 'draft-1',
    episodeSlug: 'voluntary-obstacles',
    title: 'Voluntary Obstacles',
    format: 'narration',
    doc: doc(input.narration),
    architecture: {
      sections: input.architectureSections ?? sections(),
      approvedMd: null,
      approvedAt: null,
    },
    updatedAt: '2026-07-24T08:00:00.000Z',
  });
  const write = vi.fn((
    path: string,
    content: string,
    expectedState: Parameters<typeof writeArtifact>[3],
  ) => writeArtifact(root, path, content, expectedState));
  const upsert = vi.fn(
    (row: PipelineRow) => upsertPipelineRow(root, row),
  );
  const fixture = {
    root,
    store,
    documentService,
    architectureService: undefined as unknown as ArchitectureService,
    app: undefined as unknown as ReturnType<typeof buildApp>,
    write,
    upsert,
    nextId: 1,
    milestoneFailure: input.milestoneFailure,
  };
  rebuild(fixture);
  fixtures.push(fixture);
  return fixture;
}

function rebuild(fixture: Fixture): void {
  fixture.architectureService = new ArchitectureService({
    store: fixture.store,
    operationService: {
      submit: () => 'unused-operation',
      get: () => ({ operation: 'rewrite-selection', draftId: 'draft-1' }),
    },
    artifactService: {
      write: fixture.write,
      upsertPipelineRow: fixture.upsert,
    },
    workspaceService: fixture.milestoneFailure
      ? {
          workspacePath: () => fixture.root,
          recordPending: async () => {
            throw fixture.milestoneFailure;
          },
        }
      : undefined,
    idFactory: () => `architecture-action-revision-${fixture.nextId++}`,
    now: () => '2026-07-24T10:30:00.000Z',
  });
  fixture.app = buildApp({
    nonce: NONCE,
    operationService: {
      submit: () => 'unused-operation',
      list: () => [],
      get: () => {
        throw new Error('operation not found: unused-operation');
      },
      events: () => [],
      cancel: () => {},
      result: () => ({ kind: 'pending' }),
    },
    documentService: fixture.documentService,
    architectureService: fixture.architectureService,
    artifactService: {},
    validatorService: UNUSED_VALIDATOR_SERVICE,
  });
}

afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    await fixture.app.close();
    fixture.store.close();
    rmSync(fixture.root, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

function approve(fixture: Fixture, expectedRevisionSeq: number) {
  return fixture.app.inject({
    method: 'POST',
    url: '/api/drafts/draft-1/architecture/approve',
    headers: AUTH,
    payload: { expectedRevisionSeq },
  });
}

function resumeArchitectureSaga(fixture: Fixture, resumeKey: string) {
  return fixture.app.inject({
    method: 'POST',
    url: '/api/drafts/draft-1/architecture/resume',
    headers: AUTH,
    payload: { resumeKey },
  });
}

function reopen(
  fixture: Fixture,
  expectedRevisionSeq: number,
  confirmed = true,
) {
  return fixture.app.inject({
    method: 'POST',
    url: '/api/drafts/draft-1/architecture/reopen',
    headers: AUTH,
    payload: { expectedRevisionSeq, confirmed },
  });
}

async function saveChangedArchitecture(
  fixture: Fixture,
  expectedRevisionSeq: number,
) {
  const changed = sections().map((section, index) =>
    index === 2
      ? { ...section, md: `${section.md}A revised mechanism.\n` }
      : section);
  const response = await fixture.app.inject({
    method: 'PUT',
    url: '/api/drafts/draft-1/architecture',
    headers: AUTH,
    payload: {
      expectedRevisionSeq,
      sections: changed,
      opId: null,
      disposition: 'manual-save',
    },
  });
  expect(response.statusCode).toBe(200);
  return changed;
}

describe('architecture approval and Reopen HTTP API', () => {
  it('approves all fixed sections, writes the canonical artifact, and advances the phase and pipeline', async () => {
    const fixture = makeFixture();
    const approvedMd = joinArchitecture(sections());

    const response = await approve(fixture, 0);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      complete: true,
      steps: {
        revisionAppended: 'completed',
        artifactWritten: 'completed',
        pipelineUpserted: 'completed',
        draftUpdated: 'completed',
      },
      state: {
        revisionSeq: 1,
        approvedMd,
        approvedAt: '2026-07-24T10:30:00.000Z',
      },
    });
    const canonicalPath = join(
      fixture.root,
      'whp-youtube',
      'architectures',
      'voluntary-obstacles.md',
    );
    expect(readFileSync(canonicalPath, 'utf8')).toBe([
      '# Voluntary Obstacles',
      '',
      '- **Approval date:** 2026-07-24',
      '- **Status:** approved',
      '',
      approvedMd,
    ].join('\n'));
    expect(readFileSync(
      join(fixture.root, 'whp-youtube', 'PIPELINE.md'),
      'utf8',
    )).toContain(
      '| voluntary-obstacles | prototyping | whp-youtube/architectures/voluntary-obstacles.md |',
    );
    expect(fixture.store.getDraft('draft-1')?.doc).toMatchObject({
      metadata: { creativeStatus: { phase: 'rapid-prototype' } },
    });
    expect(fixture.store.listRevisions('draft-1')).toMatchObject([
      { kind: 'architecture', disposition: 'architecture-approved' },
    ]);
  });

  it('keeps dedicated workflow phases authoritative across stale narration saves', async () => {
    const fixture = makeFixture();
    expect((await approve(fixture, 0)).statusCode).toBe(200);
    const approved = fixture.store.getDraft('draft-1')!;

    const saved = fixture.documentService.saveDraft('draft-1', {
      doc: {
        ...approved.doc,
        metadata: {
          ...approved.doc['metadata'] as Record<string, unknown>,
          creativeStatus: {
            phase: 'architecture',
            clientOnlyStatus: 'stale',
          },
          directionApproved: true,
        },
      },
      disposition: 'autosave',
    });

    expect(saved.draft.doc).toMatchObject({
      metadata: {
        creativeStatus: { phase: 'rapid-prototype' },
        directionApproved: false,
      },
    });
    expect(saved.draft.doc['metadata']).not.toMatchObject({
      creativeStatus: { clientOnlyStatus: 'stale' },
    });
    expect(saved.revision.doc).toEqual(saved.draft.doc);

    expect((await reopen(fixture, 2)).statusCode).toBe(200);
    expect(fixture.store.getDraft('draft-1')?.doc).toMatchObject({
      metadata: {
        creativeStatus: { phase: 'architecture' },
        directionApproved: false,
      },
    });
  });

  it('refuses approve A, save B, approve B without Reopen', async () => {
    const fixture = makeFixture();
    const approvedMd = joinArchitecture(sections());
    expect((await approve(fixture, 0)).statusCode).toBe(200);
    const changed = sections().map((section, index) =>
      index === 2
        ? { ...section, md: `${section.md}Changed without Reopen.\n` }
        : section);

    const save = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1/architecture',
      headers: AUTH,
      payload: {
        expectedRevisionSeq: 1,
        sections: changed,
        opId: null,
        disposition: 'manual-save',
      },
    });
    const reapproval = await approve(fixture, 2);

    expect(save.statusCode).toBe(409);
    expect(save.json().error).toMatch(/reopen architecture/i);
    expect(reapproval.statusCode).toBe(409);
    expect(reapproval.json()).toMatchObject({
      error: 'architecture revision conflict',
      current: {
        revisionSeq: 1,
        sections: sections(),
        approvedMd,
      },
    });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);
  });

  it('returns the completed approval idempotently for unchanged content', async () => {
    const fixture = makeFixture();
    expect((await approve(fixture, 0)).statusCode).toBe(200);

    const response = await approve(fixture, 1);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      complete: true,
      state: {
        revisionSeq: 1,
        approvedMd: joinArchitecture(sections()),
      },
    });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);
    expect(fixture.write).toHaveBeenCalledOnce();
    expect(fixture.upsert).toHaveBeenCalledOnce();
  });

  it.each([
    {
      label: 'missing fixed section',
      architectureSections: sections().slice(0, -1),
    },
    {
      label: 'duplicated fixed section',
      architectureSections: [
        ...sections(),
        {
          key: 'opaque-duplicate',
          title: 'Core answer',
          md: '### Core answer\n\nA duplicate.\n',
        },
      ],
    },
  ])('refuses approval with a $label without inspecting bodies', async ({
    architectureSections,
  }) => {
    const fixture = makeFixture({ architectureSections });

    const response = await approve(fixture, 0);

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toMatch(
      /exactly one.*fixed architecture section/i,
    );
    expect(fixture.store.listRevisions('draft-1')).toEqual([]);
    expect(fixture.write).not.toHaveBeenCalled();
  });

  it('re-approves through the recorded architecture hash and never clears reconciliation', async () => {
    const fixture = makeFixture({ narration: 'Preserved narration.' });
    expect((await approve(fixture, 0)).statusCode).toBe(200);
    expect((await reopen(fixture, 1)).statusCode).toBe(200);
    const changed = await saveChangedArchitecture(fixture, 2);

    const response = await approve(fixture, 3);

    expect(response.statusCode).toBe(200);
    expect(fixture.write).toHaveBeenLastCalledWith(
      'whp-youtube/architectures/voluntary-obstacles.md',
      expect.stringContaining(joinArchitecture(changed)),
      { expectedHash: expect.any(String) },
    );
    expect(fixture.store.getDraft('draft-1'))
      .toMatchObject({ narrationReconciliationRequired: true });
  });

  it('surfaces an external-edit CAS conflict before pipeline or phase advancement', async () => {
    const fixture = makeFixture();
    expect((await approve(fixture, 0)).statusCode).toBe(200);
    expect((await reopen(fixture, 1)).statusCode).toBe(200);
    await saveChangedArchitecture(fixture, 2);
    const target = join(
      fixture.root,
      'whp-youtube',
      'architectures',
      'voluntary-obstacles.md',
    );
    writeFileSync(target, 'external architecture edit\n');
    fixture.upsert.mockClear();

    const response = await approve(fixture, 3);

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: 'architecture artifact conflict',
      currentHash: sha256('external architecture edit\n'),
      steps: {
        revisionAppended: 'completed',
        artifactWritten: 'pending',
        pipelineUpserted: 'pending',
        draftUpdated: 'pending',
      },
    });
    expect(fixture.upsert).not.toHaveBeenCalled();
    expect(fixture.store.getDraft('draft-1')?.doc).toMatchObject({
      metadata: { creativeStatus: { phase: 'architecture' } },
    });
  });

  it('exposes a paused approval across reload and resumes it by durable key', async () => {
    const fixture = makeFixture();
    const target = join(
      fixture.root,
      'whp-youtube',
      'architectures',
      'voluntary-obstacles.md',
    );
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'pre-planted approval conflict\n');

    const paused = await approve(fixture, 0);

    expect(paused.statusCode).toBe(409);
    expect(paused.json()).toMatchObject({
      error: 'architecture artifact conflict',
      state: {
        approvedAt: '2026-07-24T10:30:00.000Z',
        revisionSeq: 1,
        pendingSaga: {
          kind: 'approve',
          resumeKey: expect.any(String),
          steps: {
            revisionAppended: 'completed',
            artifactWritten: 'pending',
            pipelineUpserted: 'pending',
            draftUpdated: 'pending',
          },
        },
      },
    });
    expect(fixture.store.getDraft('draft-1')?.doc).toMatchObject({
      metadata: { creativeStatus: { phase: 'architecture' } },
    });
    const resumeKey = paused.json().state.pendingSaga.resumeKey as string;

    await fixture.app.close();
    rebuild(fixture);
    const reloaded = await fixture.app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1/architecture',
      headers: AUTH,
    });
    expect(reloaded.statusCode).toBe(200);
    expect(reloaded.json()).toMatchObject({
      pendingSaga: { kind: 'approve', resumeKey },
    });

    unlinkSync(target);
    const resumed = await resumeArchitectureSaga(fixture, resumeKey);

    expect(resumed.statusCode).toBe(200);
    expect(resumed.json()).toMatchObject({
      complete: true,
      state: {
        pendingSaga: null,
        revisionSeq: 1,
      },
    });
    expect(fixture.store.getDraft('draft-1')?.doc).toMatchObject({
      metadata: { creativeStatus: { phase: 'rapid-prototype' } },
    });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);
    expect(readFileSync(
      join(fixture.root, 'whp-youtube', 'PIPELINE.md'),
      'utf8',
    )).toContain(
      '| voluntary-obstacles | prototyping | whp-youtube/architectures/voluntary-obstacles.md |',
    );
  });

  it('refuses autosave during a paused approval and resumes afterward', async () => {
    const fixture = makeFixture();
    fixture.write.mockResolvedValueOnce({
      conflict: true,
      currentHash: 'external-hash',
    });
    const paused = await approve(fixture, 0);
    expect(paused.statusCode).toBe(409);
    const resumeKey = paused.json().state.pendingSaga.resumeKey as string;
    const currentDoc = fixture.store.getDraft('draft-1')!.doc;
    const save = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: currentDoc,
        disposition: 'autosave',
      },
    });

    expect(save.statusCode).toBe(409);
    expect(save.json()).toEqual({
      error:
        'draft write refused: an architecture saga is paused; resume or resolve it first',
      code: 'draft-write-reserved',
      reservation: 'architecture-saga',
      sagaKind: 'approve',
      recoverable: true,
      state: expect.objectContaining({
        pendingSaga: expect.objectContaining({
          kind: 'approve',
          resumeKey,
        }),
      }),
    });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);

    const resumed = await resumeArchitectureSaga(fixture, resumeKey);

    expect(resumed.statusCode).toBe(200);
    expect(resumed.json()).toMatchObject({
      complete: true,
      state: {
        pendingSaga: null,
        revisionSeq: 1,
      },
    });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);
    const released = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: fixture.store.getDraft('draft-1')!.doc,
        disposition: 'post-resume-autosave',
      },
    });
    expect(released.statusCode).toBe(200);
    expect(released.json()).toMatchObject({
      revision: {
        seq: 2,
        disposition: 'post-resume-autosave',
      },
    });
  });

  it('refuses a proposal-acceptance replacement save while approval is paused', async () => {
    const fixture = makeFixture();
    fixture.write.mockResolvedValueOnce({
      conflict: true,
      currentHash: 'external-hash',
    });
    expect((await approve(fixture, 0)).statusCode).toBe(409);

    const response = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: fixture.store.getDraft('draft-1')!.doc,
        opId: 'generate-episode-1',
        disposition: 'episode-generation-accepted',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      code: 'draft-write-reserved',
      reservation: 'architecture-saga',
      sagaKind: 'approve',
      recoverable: true,
    });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);
  });

  it('resumes after the architecture write boundary without duplicating a revision', async () => {
    const fixture = makeFixture();
    fixture.write.mockImplementationOnce(async (
      path: string,
      content: string,
      expectedState: Parameters<typeof writeArtifact>[3],
    ) => {
      await writeArtifact(fixture.root, path, content, expectedState);
      throw new Error('injected architecture write boundary fault');
    });

    const failed = await approve(fixture, 0);
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toMatchObject({
      error: 'internal server error',
      state: {
        pendingSaga: {
          kind: 'approve',
          resumeKey: expect.any(String),
        },
      },
    });
    const blocked = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: fixture.store.getDraft('draft-1')!.doc,
        disposition: 'autosave-during-failure',
      },
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toMatchObject({
      reservation: 'architecture-saga',
      sagaKind: 'approve',
    });
    const resumeKey =
      failed.json().state.pendingSaga.resumeKey as string;
    await fixture.app.close();
    rebuild(fixture);
    const retried = await resumeArchitectureSaga(fixture, resumeKey);

    expect(retried.statusCode).toBe(200);
    expect(retried.json()).toMatchObject({ complete: true });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);
    const released = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: fixture.store.getDraft('draft-1')!.doc,
        disposition: 'post-approval-failure-resume',
      },
    });
    expect(released.statusCode).toBe(200);
    expect(fixture.store.listRevisions('draft-1').filter(
      ({ kind }) => kind === 'architecture',
    )).toHaveLength(1);
  });

  it('resumes after the pipeline write boundary without duplicating work', async () => {
    const fixture = makeFixture();
    fixture.upsert.mockImplementationOnce(async (row: PipelineRow) => {
      await upsertPipelineRow(fixture.root, row);
      throw new Error('injected pipeline boundary fault');
    });

    const failed = await approve(fixture, 0);
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toMatchObject({
      error: 'internal server error',
      state: {
        pendingSaga: {
          kind: 'approve',
          resumeKey: expect.any(String),
        },
      },
    });
    const resumeKey =
      failed.json().state.pendingSaga.resumeKey as string;
    await fixture.app.close();
    rebuild(fixture);
    const retried = await resumeArchitectureSaga(fixture, resumeKey);

    expect(retried.statusCode).toBe(200);
    expect(retried.json()).toMatchObject({ complete: true });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);
    expect(readFileSync(
      join(fixture.root, 'whp-youtube', 'PIPELINE.md'),
      'utf8',
    ).split('\n').filter((line) =>
      line.startsWith('| voluntary-obstacles |')
    )).toHaveLength(1);
  });

  it('serializes simultaneous approvals into one durable saga', async () => {
    const fixture = makeFixture();

    const [first, second] = await Promise.all([
      approve(fixture, 0),
      approve(fixture, 0),
    ]);

    expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
    expect(fixture.write).toHaveBeenCalledOnce();
    expect(fixture.upsert).toHaveBeenCalledOnce();
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);
  });

  it.each([
    { narration: '', reconciliationRequired: false },
    { narration: 'Preserved narration.', reconciliationRequired: true },
  ])('reopens while preserving narration and sets reconciliation=$reconciliationRequired', async ({
    narration,
    reconciliationRequired,
  }) => {
    const fixture = makeFixture({ narration });
    expect((await approve(fixture, 0)).statusCode).toBe(200);
    const beforeContent = fixture.store.getDraft('draft-1')?.doc['content'];

    const response = await reopen(fixture, 1);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      complete: true,
      state: {
        revisionSeq: 2,
        approvedMd: null,
        approvedAt: null,
        narrationReconciliationRequired: reconciliationRequired,
      },
    });
    expect(fixture.store.getDraft('draft-1')?.doc).toMatchObject({
      metadata: { creativeStatus: { phase: 'architecture' } },
      content: beforeContent,
    });
    expect(fixture.upsert).toHaveBeenLastCalledWith({
      episodeSlug: 'voluntary-obstacles',
      milestone: 'architecture',
      ref: 'whp-youtube/topics/voluntary-obstacles.md',
    });
    const released = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: fixture.store.getDraft('draft-1')!.doc,
        disposition: 'post-reopen-completion-autosave',
      },
    });
    expect(released.statusCode).toBe(200);
  });

  it('refuses narration while a Reopen pipeline conflict is paused and resumes the same saga', async () => {
    const fixture = makeFixture({ narration: 'Preserved narration.' });
    expect((await approve(fixture, 0)).statusCode).toBe(200);
    fixture.upsert.mockResolvedValueOnce({
      conflict: true,
      currentHash: 'pipeline-conflict-hash',
    });

    const paused = await reopen(fixture, 1);

    expect(paused.statusCode).toBe(409);
    expect(paused.json()).toMatchObject({
      error: 'architecture pipeline conflict',
      state: {
        revisionSeq: 2,
        approvedMd: null,
        approvedAt: null,
        pendingSaga: {
          kind: 'reopen',
          resumeKey: expect.any(String),
          steps: {
            revisionAppended: 'completed',
            artifactWritten: 'completed',
            pipelineUpserted: 'pending',
            draftUpdated: 'pending',
          },
        },
      },
    });
    const resumeKey =
      paused.json().state.pendingSaga.resumeKey as string;
    const revisionCount = fixture.store.listRevisions('draft-1').length;

    const refused = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: fixture.store.getDraft('draft-1')!.doc,
        disposition: 'autosave-during-paused-reopen',
      },
    });

    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toEqual({
      error:
        'draft write refused: an architecture saga is paused; resume or resolve it first',
      code: 'draft-write-reserved',
      reservation: 'architecture-saga',
      sagaKind: 'reopen',
      recoverable: true,
      state: expect.objectContaining({
        pendingSaga: expect.objectContaining({
          kind: 'reopen',
          resumeKey,
        }),
      }),
    });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(revisionCount);

    const resumed = await resumeArchitectureSaga(fixture, resumeKey);

    expect(resumed.statusCode).toBe(200);
    expect(resumed.json()).toMatchObject({
      complete: true,
      state: {
        revisionSeq: 2,
        approvedMd: null,
        approvedAt: null,
        narrationReconciliationRequired: true,
        pendingSaga: null,
      },
    });
    expect(fixture.store.getDraft('draft-1')?.doc).toMatchObject({
      metadata: { creativeStatus: { phase: 'architecture' } },
    });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(revisionCount);

    const released = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: fixture.store.getDraft('draft-1')!.doc,
        disposition: 'post-reopen-resume-autosave',
      },
    });
    expect(released.statusCode).toBe(200);
    expect(released.json()).toMatchObject({
      revision: {
        seq: 3,
        disposition: 'post-reopen-resume-autosave',
      },
    });
  });

  it('keeps and then releases the Reopen reservation across an unexpected pipeline failure', async () => {
    const fixture = makeFixture({ narration: 'Preserved narration.' });
    expect((await approve(fixture, 0)).statusCode).toBe(200);
    fixture.upsert.mockImplementationOnce(async (row: PipelineRow) => {
      await upsertPipelineRow(fixture.root, row);
      throw new Error('injected Reopen pipeline boundary fault');
    });

    const failed = await reopen(fixture, 1);

    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toMatchObject({
      error: 'internal server error',
      state: {
        pendingSaga: {
          kind: 'reopen',
          resumeKey: expect.any(String),
        },
      },
    });
    const blocked = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: fixture.store.getDraft('draft-1')!.doc,
        disposition: 'autosave-during-reopen-failure',
      },
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toMatchObject({
      reservation: 'architecture-saga',
      sagaKind: 'reopen',
    });
    const resumeKey =
      failed.json().state.pendingSaga.resumeKey as string;

    await fixture.app.close();
    rebuild(fixture);
    const resumed = await resumeArchitectureSaga(fixture, resumeKey);

    expect(resumed.statusCode).toBe(200);
    expect(resumed.json()).toMatchObject({
      complete: true,
      state: { pendingSaga: null, revisionSeq: 2 },
    });
    const released = await fixture.app.inject({
      method: 'PUT',
      url: '/api/drafts/draft-1',
      headers: AUTH,
      payload: {
        doc: fixture.store.getDraft('draft-1')!.doc,
        disposition: 'post-reopen-failure-resume',
      },
    });
    expect(released.statusCode).toBe(200);
  });

  it('requires explicit Reopen confirmation', async () => {
    const fixture = makeFixture();
    expect((await approve(fixture, 0)).statusCode).toBe(200);

    const response = await reopen(fixture, 1, false);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'confirmed must be true',
    });
    expect(fixture.store.getDraft('draft-1')?.architecture?.approvedMd)
      .not.toBeNull();
  });

  it('surfaces parked paths from a bounded CAS race', async () => {
    const fixture = makeFixture();
    fixture.write.mockResolvedValueOnce({
      conflict: true,
      currentHash: 'external-hash',
      parked: [
        'whp-youtube/architectures/voluntary-obstacles.md.sc-conflict-1',
        'whp-youtube/architectures/voluntary-obstacles.md.sc-displaced-1',
      ],
    } satisfies ArtifactWriteResult);

    const response = await approve(fixture, 0);

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      currentHash: 'external-hash',
      parked: [
        expect.stringContaining('.sc-conflict-'),
        expect.stringContaining('.sc-displaced-'),
      ],
    });
  });

  it('maps a nested milestone conflict to a recoverable response', async () => {
    const fixture = makeFixture({
      milestoneFailure: new MilestoneConflictError(
        'pending milestone source conflict for architecture-approval',
      ),
    });

    const response = await approve(fixture, 0);

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: 'pending milestone source conflict for architecture-approval',
      recoverable: true,
      state: expect.objectContaining({
        pendingSaga: expect.objectContaining({
          kind: 'approve',
          resumeKey: expect.any(String),
        }),
      }),
    });
  });
});
