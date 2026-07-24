import { describe, expect, it, vi } from 'vitest';
import { DaemonClientError } from '../api/client';
import type {
  ArchitectureActionResult,
  ArchitectureOperationName,
  ArchitectureSection,
  ArchitectureState,
  OperationResult,
  StreamEventsOptions,
} from '../api/client';
import {
  ARCHITECTURE_SECTIONS,
  ArchitectureModel,
  joinArchitecture,
} from './model';

const initialState = (
  sections: ArchitectureSection[] = fixedSections('stored'),
): ArchitectureState => ({
  sections,
  approvedMd: null,
  approvedAt: null,
  revisionSeq: 3,
  narrationReconciliationRequired: false,
  pendingSaga: null,
});

class ArchitectureClientStub {
  state = initialState();
  nextResult: OperationResult = { kind: 'pending' };
  private sequence = 0;

  readonly getArchitecture = vi.fn(async () => cloneState(this.state));
  readonly saveArchitecture = vi.fn(async (
    _draftId: string,
    input: {
      expectedRevisionSeq: number;
      sections: ArchitectureSection[];
      opId: string | null;
      disposition: string;
    },
  ) => {
    this.state = {
      ...this.state,
      sections: input.sections.map((section) => ({ ...section })),
      revisionSeq: this.state.revisionSeq + 1,
    };
    return {
      state: cloneState(this.state),
      revision: {
        id: `revision-${this.state.revisionSeq}`,
        draftId: 'draft-1',
        seq: this.state.revisionSeq,
        opId: input.opId,
        disposition: input.disposition,
        doc: {},
        createdAt: '2026-07-24T10:00:00.000Z',
      },
    };
  });
  readonly approveArchitecture = vi.fn(async () => actionResult({
    ...this.state,
    approvedMd: joinArchitecture(this.state.sections),
    approvedAt: '2026-07-24T10:00:00.000Z',
    revisionSeq: this.state.revisionSeq + 1,
    pendingSaga: null,
  }));
  readonly resumeArchitectureSaga = vi.fn(async (
    _draftId: string,
    input: { resumeKey: string },
  ) => {
    if (input.resumeKey !== this.state.pendingSaga?.resumeKey) {
      throw new Error('architecture saga resume key mismatch');
    }
    this.state = {
      ...this.state,
      pendingSaga: null,
    };
    return actionResult(this.state);
  });
  readonly reopenArchitecture = vi.fn(async () => actionResult({
    ...this.state,
    approvedMd: null,
    approvedAt: null,
    revisionSeq: this.state.revisionSeq + 1,
    narrationReconciliationRequired: true,
    pendingSaga: null,
  }));
  readonly rejectArchitectureProposal = vi.fn(async (
    _draftId: string,
    _operationId: string,
    _reason: string | null,
  ) => ({ rejected: true as const }));
  readonly submitDraftOp = vi.fn(async (
    _draftId: string,
    _operation: ArchitectureOperationName,
    _inputs: unknown,
  ) => ({ id: `op-${++this.sequence}` }));
  readonly streamEvents = vi.fn(async (
    _id: string,
    options: StreamEventsOptions,
  ) => {
    await options.onDone();
  });
  readonly getOp = vi.fn(async (id: string) => ({
    id,
    operation: 'generate-architecture' as const,
    state: 'completed' as const,
    stalled: false,
    envelopeJson: '{}',
    jobDir: `/tmp/${id}`,
    threadId: `thread-${id}`,
    retryOf: null,
    resumedFrom: null,
    createdAt: '2026-07-24T10:00:00.000Z',
    startedAt: '2026-07-24T10:00:00.000Z',
    finishedAt: '2026-07-24T10:00:01.000Z',
    inputTokens: 10,
    cachedInputTokens: 0,
    outputTokens: 5,
    reasoningOutputTokens: 0,
    usageAvailable: 1 as const,
    error: null,
  }));
  readonly getResult = vi.fn(async () => this.nextResult);
}

describe('ArchitectureModel', () => {
  it('loads architecture state without changing it', async () => {
    const client = new ArchitectureClientStub();
    const model = new ArchitectureModel('draft-1', client);

    await model.load();

    expect(model.state).toEqual(client.state);
    expect(client.getArchitecture).toHaveBeenCalledWith('draft-1');
    expect(model.proposals).toEqual([]);
  });

  it('refreshes the reconciliation flag from the latest server state', async () => {
    const client = new ArchitectureClientStub();
    client.state = {
      ...initialState(),
      narrationReconciliationRequired: true,
    };
    const model = new ArchitectureModel('draft-1', client);
    await model.load();
    expect(model.state?.narrationReconciliationRequired).toBe(true);

    client.state = {
      ...client.state,
      narrationReconciliationRequired: false,
    };
    await model.load();

    expect(model.state?.narrationReconciliationRequired).toBe(false);
    expect(client.getArchitecture).toHaveBeenCalledTimes(2);
  });

  it('turns fixed and opaque generated slices into per-section proposals', async () => {
    const client = new ArchitectureClientStub();
    client.state = initialState([]);
    client.nextResult = {
      kind: 'raw',
      markdown: [
        'A preamble retained opaquely.\n\n',
        fixedSections('generated').map(({ md }) => md).join(''),
        '### Extra comparison\n\nOpaque generated detail.\n',
      ].join(''),
    };
    const model = new ArchitectureModel('draft-1', client);
    await model.load();

    await model.generate({
      topicBrief: { topic: 'Supplied topic' },
      approvedLessons: ['Supplied lesson'],
      userConstraints: { notes: 'Supplied constraint' },
    });

    expect(model.proposals).toHaveLength(15);
    expect(model.proposals.slice(1, 14).map(({ key }) => key))
      .toEqual(ARCHITECTURE_SECTIONS.map(({ key }) => key));
    expect(model.proposals[0]?.key).toMatch(/^opaque-/u);
    expect(model.proposals[14]?.key).toMatch(/^opaque-/u);
    expect(client.submitDraftOp).toHaveBeenCalledWith(
      'draft-1',
      'generate-architecture',
      {
        topic_brief: { topic: 'Supplied topic' },
        approved_lessons: ['Supplied lesson'],
        user_constraints: { notes: 'Supplied constraint' },
      },
    );
  });

  it('accepts one, durably rejects one, then accepts all remaining in one revision', async () => {
    const client = new ArchitectureClientStub();
    client.state = initialState([]);
    client.nextResult = {
      kind: 'raw',
      markdown: [
        fixedSections('generated').map(({ md }) => md).join(''),
        '### Optional appendix\n\nDo not accept this.\n',
      ].join(''),
    };
    const model = new ArchitectureModel('draft-1', client);
    await model.load();
    await model.generate({
      topicBrief: {},
      approvedLessons: [],
      userConstraints: {},
    });

    await model.accept('package-and-audience');
    const afterOne = cloneState(model.state!);
    const opaque = model.proposals.find(({ key }) => key.startsWith('opaque-'));
    expect(opaque).toBeDefined();
    await model.reject(opaque!.id, 'The appendix repeats the core answer.');
    expect(model.state).toEqual(afterOne);
    expect(client.rejectArchitectureProposal).toHaveBeenCalledWith(
      'draft-1',
      opaque!.sourceOpId,
      'The appendix repeats the core answer.',
    );
    expect(client.saveArchitecture).toHaveBeenCalledTimes(1);

    await model.acceptAll();

    expect(client.saveArchitecture).toHaveBeenCalledTimes(2);
    expect(model.state?.sections).toHaveLength(13);
    expect(model.proposals).toEqual([]);
    expect(client.saveArchitecture.mock.calls[1]?.[1]).toMatchObject({
      expectedRevisionSeq: 4,
      disposition: 'architecture-proposals-accepted',
    });
  });

  it('keeps an architecture proposal visible when durable rejection fails', async () => {
    const client = new ArchitectureClientStub();
    client.state = initialState([]);
    client.nextResult = {
      kind: 'raw',
      markdown: fixedSections('generated').map(({ md }) => md).join(''),
    };
    client.rejectArchitectureProposal.mockRejectedValueOnce(
      new Error('learning store unavailable'),
    );
    const model = new ArchitectureModel('draft-1', client);
    await model.load();
    await model.generate({
      topicBrief: {},
      approvedLessons: [],
      userConstraints: {},
    });
    const proposal = model.proposals[0]!;

    await model.reject(proposal.id, null);

    expect(model.proposals).toContainEqual(proposal);
    expect(model.failure).toBe('learning store unavailable');
  });

  it('preserves Base, Current, and Proposed when a refine acceptance is stale', async () => {
    const client = new ArchitectureClientStub();
    const model = new ArchitectureModel('draft-1', client);
    await model.load();
    client.nextResult = {
      kind: 'schema',
      value: {
        status: 'complete',
        section_key: 'core-answer',
        replacement_markdown:
          '### Core answer\n\nA proposed refined answer.\n',
        guardrail_markdown: null,
      },
      guardrail: null,
    };
    await model.refine('core-answer', {
      topicBrief: { topic: 'Supplied topic' },
      userInstruction: 'Make the causal step explicit.',
    });
    const proposal = model.proposals[0]!;
    const current = {
      ...client.state,
      sections: client.state.sections.map((section) =>
        section.key === 'core-answer'
          ? { ...section, md: '### Core answer\n\nA concurrent answer.\n' }
          : section),
      revisionSeq: 4,
    };
    client.saveArchitecture.mockRejectedValueOnce(new DaemonClientError(
      409,
      { error: 'architecture revision conflict', current },
    ));

    await model.accept(proposal.id);

    expect(model.failure).toBeNull();
    expect(model.proposals[0]?.conflict).toEqual({
      base: '### Core answer\n\nstored core-answer.\n',
      current: '### Core answer\n\nA concurrent answer.\n',
      proposed: '### Core answer\n\nA proposed refined answer.\n',
    });
    expect(model.state).toEqual(current);
  });

  it('pins review findings to their supplied section keys', async () => {
    const client = new ArchitectureClientStub();
    const model = new ArchitectureModel('draft-1', client);
    await model.load();
    client.nextResult = {
      kind: 'schema',
      value: {
        status: 'complete',
        findings: [{
          section_key: 'core-answer',
          severity: 'important',
          finding_markdown: 'The causal bridge is not explicit yet.',
        }],
        guardrail_markdown: null,
      },
      guardrail: null,
    };

    await model.review({ topicBrief: { topic: 'Supplied topic' } });

    expect(model.findingsFor('core-answer')).toEqual([{
      sectionKey: 'core-answer',
      severity: 'important',
      findingMarkdown: 'The causal bridge is not explicit yet.',
    }]);
  });

  it('surfaces guardrails and operation failures without proposals', async () => {
    const client = new ArchitectureClientStub();
    const model = new ArchitectureModel('draft-1', client);
    await model.load();
    client.nextResult = {
      kind: 'schema',
      value: {
        status: 'declined',
        findings: [],
        guardrail_markdown: 'The request crosses the supplied scope.',
      },
      guardrail: 'The request crosses the supplied scope.',
    };

    await model.review({ topicBrief: {} });
    expect(model.guardrails).toEqual([
      'The request crosses the supplied scope.',
    ]);

    client.nextResult = {
      kind: 'failed',
      error: 'operation output was invalid',
    };
    await model.generate({
      topicBrief: {},
      approvedLessons: [],
      userConstraints: {},
    });
    expect(model.failure).toBe('operation output was invalid');
    expect(model.proposals).toEqual([]);
  });

  it('surfaces approval conflicts and waits for the server state before changing approval', async () => {
    const client = new ArchitectureClientStub();
    const model = new ArchitectureModel('draft-1', client);
    await model.load();
    let rejectApproval!: (error: unknown) => void;
    client.approveArchitecture.mockImplementationOnce(() =>
      new Promise((_resolve, reject) => {
        rejectApproval = reject;
      }));

    const approval = model.approve();
    expect(model.state?.approvedAt).toBeNull();
    await vi.waitFor(() => {
      if (!rejectApproval) throw new Error('approval call still pending');
    });
    rejectApproval(new DaemonClientError(409, {
      error: 'architecture artifact conflict',
      currentHash: 'external-hash',
      steps: {
        revisionAppended: 'completed',
        artifactWritten: 'pending',
        pipelineUpserted: 'pending',
        draftUpdated: 'pending',
      },
      state: client.state,
    }));
    await approval;

    expect(model.failure).toBeNull();
    expect(model.state?.approvedAt).toBeNull();
    expect(model.actionConflict).toMatchObject({
      error: 'architecture artifact conflict',
      currentHash: 'external-hash',
    });
  });

  it.each(['approve', 'reopen'] as const)(
    'adopts a paused %s saga distinctly and resumes it with the shared surface',
    async (kind) => {
    const client = new ArchitectureClientStub();
    const model = new ArchitectureModel('draft-1', client);
    await model.load();
    const paused = {
      ...client.state,
      approvedMd: joinArchitecture(client.state.sections),
      approvedAt: '2026-07-24T10:00:00.000Z',
      revisionSeq: 4,
      pendingSaga: {
        kind,
        resumeKey: `${kind}-resume-key`,
        steps: {
          revisionAppended: 'completed' as const,
          artifactWritten: 'pending' as const,
          pipelineUpserted: 'pending' as const,
          draftUpdated: 'pending' as const,
        },
        createdAt: '2026-07-24T10:00:00.000Z',
        updatedAt: '2026-07-24T10:00:00.000Z',
      },
    };
    const action = kind === 'approve'
      ? () => model.approve()
      : () => model.reopen(true);
    const actionClient = kind === 'approve'
      ? client.approveArchitecture
      : client.reopenArchitecture;
    actionClient.mockRejectedValueOnce(new DaemonClientError(
      409,
      {
        error: 'architecture artifact conflict',
        state: paused,
      },
    ));

    await action();

    expect(model.state).toEqual(paused);
    expect(model.state?.pendingSaga).toMatchObject({
      kind,
      resumeKey: `${kind}-resume-key`,
    });

    client.state = cloneState(paused);
    await model.resumeSaga();

    expect(client.resumeArchitectureSaga).toHaveBeenCalledWith(
      'draft-1',
      { resumeKey: `${kind}-resume-key` },
    );
    expect(model.state?.pendingSaga).toBeNull();
    expect(model.actionConflict).toBeNull();
    },
  );

  it('adopts pending saga state from an unexpected post-saga failure', async () => {
    const client = new ArchitectureClientStub();
    const model = new ArchitectureModel('draft-1', client);
    await model.load();
    const paused = {
      ...client.state,
      approvedMd: null,
      approvedAt: null,
      revisionSeq: 4,
      pendingSaga: {
        kind: 'reopen' as const,
        resumeKey: 'reopen-resume-key',
        steps: {
          revisionAppended: 'completed' as const,
          artifactWritten: 'completed' as const,
          pipelineUpserted: 'pending' as const,
          draftUpdated: 'pending' as const,
        },
        createdAt: '2026-07-24T10:00:00.000Z',
        updatedAt: '2026-07-24T10:00:00.000Z',
      },
    };
    client.reopenArchitecture.mockRejectedValueOnce(new DaemonClientError(
      500,
      { error: 'internal server error', state: paused },
    ));

    await model.reopen(true);

    expect(model.state).toEqual(paused);
    expect(model.failure).toBeNull();
    expect(model.actionConflict).toMatchObject({
      error: 'internal server error',
      state: { pendingSaga: { kind: 'reopen' } },
    });
  });

  it('requires explicit reopen confirmation and applies only the returned state', async () => {
    const client = new ArchitectureClientStub();
    client.state = {
      ...initialState(),
      approvedMd: joinArchitecture(initialState().sections),
      approvedAt: '2026-07-24T10:00:00.000Z',
    };
    const model = new ArchitectureModel('draft-1', client);
    await model.load();

    await model.reopen(false);
    expect(client.reopenArchitecture).not.toHaveBeenCalled();
    expect(model.state?.approvedAt).toBe('2026-07-24T10:00:00.000Z');

    await model.reopen(true);
    expect(client.reopenArchitecture).toHaveBeenCalledWith('draft-1', {
      expectedRevisionSeq: 3,
      confirmed: true,
    });
    expect(model.state).toMatchObject({
      approvedAt: null,
      narrationReconciliationRequired: true,
      revisionSeq: 4,
    });
  });
});

function fixedSections(label: string): ArchitectureSection[] {
  return ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
    key,
    title,
    md: `### ${title}\n\n${label} ${key}.\n`,
  }));
}

function cloneState(state: ArchitectureState): ArchitectureState {
  return {
    ...state,
    sections: state.sections.map((section) => ({ ...section })),
    pendingSaga: state.pendingSaga
      ? {
          ...state.pendingSaga,
          steps: { ...state.pendingSaga.steps },
        }
      : null,
  };
}

function actionResult(state: ArchitectureState): ArchitectureActionResult {
  return {
    complete: true,
    steps: {
      revisionAppended: 'completed',
      artifactWritten: 'completed',
      pipelineUpserted: 'completed',
      draftUpdated: 'completed',
    },
    state,
  };
}
