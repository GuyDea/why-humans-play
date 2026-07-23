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
  }));
  readonly reopenArchitecture = vi.fn(async () => actionResult({
    ...this.state,
    approvedMd: null,
    approvedAt: null,
    revisionSeq: this.state.revisionSeq + 1,
    narrationReconciliationRequired: true,
  }));
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

    expect(model.proposals).toHaveLength(13);
    expect(model.proposals.slice(1, 12).map(({ key }) => key))
      .toEqual(ARCHITECTURE_SECTIONS.map(({ key }) => key));
    expect(model.proposals[0]?.key).toMatch(/^opaque-/u);
    expect(model.proposals[12]?.key).toMatch(/^opaque-/u);
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

  it('accepts one, rejects one without mutation, then accepts all remaining in one revision', async () => {
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
    model.reject(opaque!.id);
    expect(model.state).toEqual(afterOne);
    expect(client.saveArchitecture).toHaveBeenCalledTimes(1);

    await model.acceptAll();

    expect(client.saveArchitecture).toHaveBeenCalledTimes(2);
    expect(model.state?.sections).toHaveLength(11);
    expect(model.proposals).toEqual([]);
    expect(client.saveArchitecture.mock.calls[1]?.[1]).toMatchObject({
      expectedRevisionSeq: 4,
      disposition: 'architecture-proposals-accepted',
    });
  });

  it('preserves Base, Current, and Proposed when a refine acceptance is stale', async () => {
    const client = new ArchitectureClientStub();
    const model = new ArchitectureModel('draft-1', client);
    await model.load();
    client.nextResult = {
      kind: 'schema',
      value: {
        status: 'complete',
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
