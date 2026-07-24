import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ARCHITECTURE_SECTIONS,
  joinArchitecture,
  type ArchitectureSection,
} from '../../src/architecture/codec.js';
import {
  ArchitectureGateError,
  ArchitectureRevisionConflictError,
  ArchitectureService,
} from '../../src/architecture/service.js';
import { exportDocumentMarkdown } from '../../src/documents/service.js';
import { DocumentStore } from '../../src/documents/store.js';
import type { OperationName } from '../../src/operations/registry.js';

interface SubmittedOperation {
  operation: OperationName;
  inputs: unknown;
  options: { resumeOf?: string; cwd?: string };
}

const roots: string[] = [];
const stores: DocumentStore[] = [];

function completeSections(): ArchitectureSection[] {
  return ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
    key,
    title,
    md: `### ${title}\n\n${key} body.\n\n`,
  }));
}

function narrationDoc(input: {
  phase: string;
  narration?: string;
  preamble?: string;
  directionApproved?: boolean;
}) {
  return {
    type: 'doc',
    attrs: { format: 'narration', preamble: input.preamble ?? '' },
    metadata: {
      creativeStatus: { phase: input.phase },
      directionApproved: input.directionApproved ?? false,
    },
    content: [{
      type: 'beat',
      attrs: {
        beatId: 'beat_architecture_test',
        title: 'Opening',
        timeTargetMs: 30_000,
      },
      content: [{
        type: 'paragraph',
        content: input.narration
          ? [{ type: 'text', text: input.narration }]
          : [],
      }],
    }],
  };
}

function makeFixture(input: {
  phase?: string;
  narration?: string;
  preamble?: string;
  directionApproved?: boolean;
  approved?: boolean;
  reconciliationRequired?: boolean;
  sections?: ArchitectureSection[];
  workspacePath?: string;
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'architecture-service-'));
  roots.push(root);
  const store = new DocumentStore(join(root, 'state.sqlite3'));
  stores.push(store);
  const sections = input.sections ?? completeSections();
  const approvedMd = input.approved === false ? null : joinArchitecture(sections);
  store.createDraft({
    id: 'draft-1',
    episodeSlug: 'voluntary-obstacles',
    title: 'Voluntary Obstacles',
    format: 'narration',
    doc: narrationDoc({
      phase: input.phase ?? 'rapid-prototype',
      narration: input.narration,
      preamble: input.preamble,
      directionApproved: input.directionApproved,
    }),
    architecture: {
      sections,
      approvedMd,
      approvedAt: approvedMd === null ? null : '2026-07-24T09:00:00.000Z',
    },
    narrationReconciliationRequired:
      input.reconciliationRequired ?? false,
    updatedAt: '2026-07-24T09:00:00.000Z',
  });
  const submitted: SubmittedOperation[] = [];
  const operationService = {
    submit: vi.fn((
      operation: OperationName,
      inputs: unknown,
      options: { resumeOf?: string; cwd?: string } = {},
    ) => {
      submitted.push({ operation, inputs, options });
      return `operation-${submitted.length}`;
    }),
    get: vi.fn((): { operation: OperationName } => ({
      operation: 'rewrite-selection',
    })),
    result: vi.fn(() => ({
      kind: 'raw' as const,
      markdown: '# Generated narration\n',
    })),
  };
  let revision = 0;
  const service = new ArchitectureService({
    store,
    operationService,
    workspaceService: input.workspacePath
      ? {
          workspacePath: vi.fn(() => input.workspacePath!),
          recordPending: vi.fn(),
        }
      : undefined,
    idFactory: () => `architecture-revision-${++revision}`,
    now: () => '2026-07-24T10:00:00.000Z',
  });
  return { store, service, submitted, operationService };
}

function appendAcceptedNarrationRevision(
  fixture: ReturnType<typeof makeFixture>,
  operationId: string,
): void {
  const draft = fixture.store.getDraft('draft-1')!;
  fixture.store.saveDraft('draft-1', {
    title: draft.title,
    format: draft.format,
    doc: draft.doc,
    updatedAt: '2026-07-24T10:00:00.000Z',
    revision: {
      id: `narration-revision-${operationId}`,
      opId: operationId,
      disposition: 'episode-generation-accepted',
      createdAt: '2026-07-24T10:00:00.000Z',
    },
  });
}

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('ArchitectureService revisions', () => {
  it('reads architecture state and appends one revision-checked architecture save', () => {
    const fixture = makeFixture({ approved: false });
    const sections = completeSections().map((section, index) =>
      index === 2
        ? { ...section, md: `${section.md}A stronger mechanism.\n` }
        : section);

    expect(fixture.service.get('draft-1')).toMatchObject({
      revisionSeq: 0,
      sections: completeSections(),
      approvedMd: null,
      approvedAt: null,
      narrationReconciliationRequired: false,
    });

    const saved = fixture.service.save('draft-1', {
      expectedRevisionSeq: 0,
      sections,
      opId: 'operation-rewrite',
      disposition: 'accepted',
    });

    expect(saved.state).toMatchObject({
      revisionSeq: 1,
      sections,
      approvedMd: null,
      approvedAt: null,
    });
    expect(saved.revision).toMatchObject({
      id: 'architecture-revision-1',
      seq: 1,
      kind: 'architecture',
      opId: 'operation-rewrite',
      disposition: 'accepted',
      doc: {
        sections,
        approvedMd: null,
        approvedAt: null,
      },
    });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);
  });

  it('returns the current state without mutating when the expected revision is stale', () => {
    const fixture = makeFixture({ approved: false });
    fixture.service.save('draft-1', {
      expectedRevisionSeq: 0,
      sections: completeSections(),
      opId: null,
      disposition: 'manual-save',
    });

    try {
      fixture.service.save('draft-1', {
        expectedRevisionSeq: 0,
        sections: completeSections().slice(0, -1),
        opId: null,
        disposition: 'stale-save',
      });
      throw new Error('expected a revision conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ArchitectureRevisionConflictError);
      expect((error as ArchitectureRevisionConflictError).current)
        .toMatchObject({ revisionSeq: 1, sections: completeSections() });
    }
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(1);
  });

  it('refuses changed architecture sections while approval exists', () => {
    const fixture = makeFixture();
    const changed = completeSections().map((section, index) =>
      index === 2
        ? { ...section, md: `${section.md}Changed after approval.\n` }
        : section);

    expect(() => fixture.service.save('draft-1', {
      expectedRevisionSeq: 0,
      sections: changed,
      opId: null,
      disposition: 'manual-save',
    })).toThrow(/reopen architecture/i);

    expect(fixture.service.get('draft-1')).toMatchObject({
      revisionSeq: 0,
      sections: completeSections(),
      approvedMd: joinArchitecture(completeSections()),
    });
    expect(fixture.store.listRevisions('draft-1')).toEqual([]);
  });
});

describe('ArchitectureService draft-scoped operation policy', () => {
  it('ignores forged client phase and approval inputs', () => {
    const fixture = makeFixture({
      phase: 'architecture',
      approved: false,
    });

    expect(() => fixture.service.submitOperation(
      'draft-1',
      'generate-episode',
      {
        draftId: 'forged-draft',
        creative_status: { phase: 'rapid-prototype' },
        approved_architecture_md: 'forged approval',
      },
    )).toThrow(ArchitectureGateError);
    expect(fixture.submitted).toEqual([]);
  });

  it('injects the exact stored approved architecture and keeps draftId HTTP-only', () => {
    const fixture = makeFixture({
      phase: 'rapid-prototype',
      reconciliationRequired: true,
    });
    const state = fixture.service.get('draft-1');

    const id = fixture.service.submitOperation(
      'draft-1',
      'generate-episode',
      {
        draftId: 'forged-draft',
        topic_brief: 'Stored by the caller.',
        creative_status: { phase: 'architecture' },
        approved_architecture_md: 'forged approval',
      },
    );

    expect(id).toBe('operation-1');
    expect(fixture.submitted).toEqual([{
      operation: 'generate-episode',
      inputs: {
        topic_brief: 'Stored by the caller.',
        creative_status: { phase: 'rapid-prototype' },
        approved_architecture_md: state.approvedMd,
      },
      options: {},
    }]);
  });

  it('routes draft-scoped codex submissions and resumptions through the recorded workspace', () => {
    const workspacePath = join(tmpdir(), 'episode-workspace');
    const fixture = makeFixture({
      phase: 'architecture',
      approved: false,
      narration: 'An imported line.',
      workspacePath,
    });

    fixture.service.submitOperation(
      'draft-1',
      'review',
      { selection: 'An imported line.' },
    );
    fixture.service.resumeOperation(
      'draft-1',
      'parent-operation',
      { selection: 'An imported line.' },
    );

    expect(fixture.submitted.map(({ options }) => options)).toEqual([
      { cwd: workspacePath },
      { resumeOf: 'parent-operation', cwd: workspacePath },
    ]);
  });

  it('allows scoped narration work in architecture phase only with real narration', () => {
    const imported = makeFixture({
      phase: 'architecture',
      approved: false,
      narration: 'An imported line.',
    });
    const empty = makeFixture({
      phase: 'architecture',
      approved: false,
      preamble: '# Imported title only\n\n',
    });

    expect(imported.service.submitOperation(
      'draft-1',
      'review',
      { selection: 'An imported line.' },
    )).toBe('operation-1');
    expect(() => empty.service.submitOperation(
      'draft-1',
      'generate-alternatives',
      { selection: '' },
    )).toThrow(/requires existing narration/i);
  });

  it.each([
    {
      label: 'architecture phase',
      input: { phase: 'architecture', directionApproved: true },
      error: /architecture is not approved/i,
    },
    {
      label: 'absent approval',
      input: { approved: false, directionApproved: true },
      error: /architecture approval is required/i,
    },
    {
      label: 'stale approval',
      input: {
        directionApproved: true,
        sections: completeSections().map((section, index) =>
          index === 0 ? { ...section, md: `${section.md}Edited.\n` } : section),
      },
      mutate: (fixture: ReturnType<typeof makeFixture>) => {
        const draft = fixture.store.getDraft('draft-1')!;
        fixture.store.replaceArchitectureState('draft-1', {
          ...draft.architecture!,
          approvedMd: 'stale architecture',
        }, draft.architectureArtifactHash ?? null);
      },
      error: /architecture approval is stale/i,
    },
    {
      label: 'reconciliation required',
      input: {
        directionApproved: true,
        reconciliationRequired: true,
      },
      error: /narration reconciliation is required/i,
    },
    {
      label: 'complete narration approval absent',
      input: { directionApproved: false },
      error: /complete narration approval is required/i,
    },
  ])('refuses Promote when $label', ({ input, mutate, error }) => {
    const fixture = makeFixture(input);
    mutate?.(fixture);

    expect(() => fixture.service.submitOperation(
      'draft-1',
      'promote',
      {
        creative_status: { phase: 'creative-approved' },
        approved_architecture_md: 'forged approval',
      },
    )).toThrow(error);
    expect(fixture.submitted).toEqual([]);
  });

  it('refuses whole narration generation after architecture is reopened', () => {
    const fixture = makeFixture({
      phase: 'architecture',
      approved: false,
      narration: 'Preserved narration.',
    });

    expect(() => fixture.service.submitOperation(
      'draft-1',
      'generate-episode',
      { topic_brief: 'Brief.' },
    )).toThrow(/architecture is not approved/i);
  });

  it('passes resumptions through the unchanged operation-service resume chain', () => {
    const fixture = makeFixture({
      phase: 'architecture',
      approved: false,
      narration: 'An imported line.',
    });

    fixture.service.resumeOperation(
      'draft-1',
      'parent-operation',
      { selection: 'Complete current input.' },
    );

    expect(fixture.operationService.get)
      .toHaveBeenCalledWith('parent-operation');
    expect(fixture.submitted[0]).toEqual({
      operation: 'rewrite-selection',
      inputs: {
        selection: 'Complete current input.',
        creative_status: { phase: 'architecture' },
      },
      options: { resumeOf: 'parent-operation' },
    });
  });
});

describe('ArchitectureService narration proposal reconciliation', () => {
  it('clears reconciliation after accepting a generate-episode proposal registered under the current approval', () => {
    const fixture = makeFixture({ reconciliationRequired: true });
    fixture.operationService.get.mockReturnValue({
      operation: 'generate-episode',
    });
    const operationId = fixture.service.submitOperation(
      'draft-1',
      'generate-episode',
      { topic_brief: 'Brief.' },
    );
    appendAcceptedNarrationRevision(fixture, operationId);

    expect(fixture.service.resolveNarrationProposal(
      'draft-1',
      operationId,
      'accepted',
    )).toMatchObject({ state: 'accepted' });

    expect(fixture.service.get('draft-1'))
      .toMatchObject({ narrationReconciliationRequired: false });
    expect(fixture.store.getDraft('draft-1')).toMatchObject({
      narrationReconciliationRequired: false,
      updatedAt: '2026-07-24T10:00:00.000Z',
    });
  });

  it('keeps reconciliation required when the accepted proposal predates the current approval', () => {
    const fixture = makeFixture({ reconciliationRequired: true });
    fixture.operationService.get.mockReturnValue({
      operation: 'generate-episode',
    });
    fixture.store.createNarrationProposal({
      draftId: 'draft-1',
      operationId: 'operation-before-approval',
      state: 'pending',
      createdAt: '2026-07-24T08:59:59.999Z',
      resolvedAt: null,
    });
    appendAcceptedNarrationRevision(fixture, 'operation-before-approval');

    expect(fixture.service.resolveNarrationProposal(
      'draft-1',
      'operation-before-approval',
      'accepted',
    )).toMatchObject({ state: 'accepted' });

    expect(fixture.service.get('draft-1'))
      .toMatchObject({ narrationReconciliationRequired: true });
  });

  it('never clears reconciliation when a generate-episode proposal is rejected', () => {
    const fixture = makeFixture({ reconciliationRequired: true });
    fixture.operationService.get.mockReturnValue({
      operation: 'generate-episode',
    });
    const operationId = fixture.service.submitOperation(
      'draft-1',
      'generate-episode',
      { topic_brief: 'Brief.' },
    );

    expect(fixture.service.resolveNarrationProposal(
      'draft-1',
      operationId,
      'rejected',
    )).toMatchObject({ state: 'rejected' });

    expect(fixture.service.get('draft-1'))
      .toMatchObject({ narrationReconciliationRequired: true });
  });

  it('converges an already accepted current-approval proposal on replay', () => {
    const fixture = makeFixture({ reconciliationRequired: true });
    fixture.operationService.get.mockReturnValue({
      operation: 'generate-episode',
    });
    fixture.store.createNarrationProposal({
      draftId: 'draft-1',
      operationId: 'operation-accepted-before-clear',
      state: 'accepted',
      createdAt: '2026-07-24T10:00:00.000Z',
      resolvedAt: '2026-07-24T10:00:00.000Z',
    });
    appendAcceptedNarrationRevision(
      fixture,
      'operation-accepted-before-clear',
    );

    expect(fixture.service.resolveNarrationProposal(
      'draft-1',
      'operation-accepted-before-clear',
      'accepted',
    )).toMatchObject({ state: 'accepted' });

    expect(fixture.service.get('draft-1'))
      .toMatchObject({ narrationReconciliationRequired: false });
  });

  it('auto-settles a recovered accepted revision and clears eligible reconciliation', () => {
    const fixture = makeFixture({
      narration: 'Replacement narration saved before resolution.',
      reconciliationRequired: true,
    });
    fixture.operationService.get.mockReturnValue({
      operation: 'generate-episode',
    });
    const operationId = fixture.service.submitOperation(
      'draft-1',
      'generate-episode',
      { topic_brief: 'Brief.' },
    );
    appendAcceptedNarrationRevision(fixture, operationId);
    const current = fixture.store.getDraft('draft-1')!;

    expect(fixture.service.prepareNarrationApproval('draft-1', {
      expectedRevisionSeq: 1,
      expectedNarrationMd: exportDocumentMarkdown(current.doc),
    })).toEqual({
      settledExportToken: expect.any(String),
    });

    expect(fixture.store.getNarrationProposal('draft-1', operationId))
      .toMatchObject({ state: 'accepted' });
    expect(fixture.service.get('draft-1'))
      .toMatchObject({ narrationReconciliationRequired: false });
  });
});
