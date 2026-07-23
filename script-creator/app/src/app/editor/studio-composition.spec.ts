import '@angular/compiler';
import {
  createComponent,
  getDebugNode,
  provideZonelessChangeDetection,
  ɵgetComponentDef,
  ɵresolveComponentResources,
  ɵɵviewQuerySignal,
  type ApplicationRef,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import {
  provideRouter,
  Router,
} from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DaemonClientError } from '../api/client';
import type {
  ArchitectureActionResult,
  ArchitectureSection,
  ArchitectureState,
  DaemonClient,
  DraftDocument,
  DraftRecord,
  OperationName,
  OperationRecord,
  OperationResult,
  OperationSummary,
  SavedDraft,
  StreamEventsOptions,
} from '../api/client';
import {
  ARCHITECTURE_SECTIONS,
  joinArchitecture,
} from '../architecture/model';
import { ArchitecturePanel } from '../architecture/architecture-panel';
import { NarrationActions } from '../narration/narration-actions';
import { App } from '../app';
import { routes } from '../app.routes';
import appTemplate from '../app.html?raw';
import appStyles from '../app.scss?raw';
import {
  DebouncedAutosave,
  EditorHost,
} from './editor-host';
import { DraftManagerComponent } from '../drafts/draft-manager.component';
import { BriefPanel } from '../panels/brief-panel';
import { FindingsPanel } from '../panels/findings-panel';
import { ParkingLot } from '../panels/parking-lot';
import { RevisionTimeline } from '../drafts/revision-timeline';
import { DraftTransfer } from '../drafts/draft-transfer';
import { AgentConsole } from '../panels/agent-console';
import {
  STUDIO_SESSION,
  StudioSession,
} from '../studio-session';

interface ControlledOutcome {
  operation: OperationRecord;
  result: OperationResult;
}

class ControllableDaemonClient {
  private sequence = 0;
  private revisionSequence = 0;
  private readonly finishes = new Map<string, () => void>();
  private readonly outcomes = new Map<string, ControlledOutcome>();
  readonly submissions: Array<{
    id: string;
    operation: OperationName;
    inputs: unknown;
  }> = [];
  readonly draftSubmissions: Array<{
    draftId: string;
    id: string;
    operation: OperationName;
    inputs: unknown;
    approvedArchitectureMd: string | null;
  }> = [];
  readonly canonicalArchitectureWrites: string[] = [];
  readonly pipelineMilestones: string[] = [];
  architectureState: ArchitectureState = {
    sections: [],
    approvedMd: null,
    approvedAt: null,
    revisionSeq: 0,
    narrationReconciliationRequired: false,
  };

  constructor(readonly storedDraft: DraftRecord) {}

  readonly list = vi.fn(async () => [draftSummary(this.storedDraft)]);
  readonly get = vi.fn(async (_id: string) => this.storedDraft);
  readonly listRevisions = vi.fn(async () => []);
  readonly create = vi.fn(async () => this.storedDraft);
  readonly import = vi.fn(async () => this.storedDraft);
  readonly export = vi.fn(async () => ({ markdown: '# Exported' }));
  readonly writeArtifact = vi.fn(async () => ({
    conflict: false as const,
    hash: 'artifact-hash',
  }));
  readonly validate = vi.fn(async () => ({ ok: true, errors: [] }));

  readonly save = vi.fn(async (
    _id: string,
    input: { doc: DraftDocument; disposition?: string },
  ): Promise<SavedDraft> => {
    this.storedDraft.doc = input.doc;
    if (input.disposition === 'episode-generation-accepted') {
      this.architectureState = {
        ...this.architectureState,
        narrationReconciliationRequired: false,
      };
    }
    const seq = ++this.revisionSequence;
    return {
      draft: this.storedDraft,
      revision: {
        id: `revision-${seq}`,
        draftId: this.storedDraft.id,
        seq,
        opId: null,
        disposition: input.disposition ?? 'edit',
        doc: input.doc,
        createdAt: `2026-07-23T12:00:${String(seq).padStart(2, '0')}.000Z`,
      },
    };
  });

  readonly getArchitecture = vi.fn(async () =>
    cloneArchitectureState(this.architectureState));
  readonly saveArchitecture = vi.fn(async (
    _id: string,
    input: {
      expectedRevisionSeq: number;
      sections: ArchitectureSection[];
      opId: string | null;
      disposition: string;
    },
  ) => {
    if (input.expectedRevisionSeq !== this.architectureState.revisionSeq) {
      throw new DaemonClientError(409, {
        error: 'architecture revision conflict',
        current: cloneArchitectureState(this.architectureState),
      });
    }
    this.architectureState = {
      ...this.architectureState,
      sections: input.sections.map((section) => ({ ...section })),
      revisionSeq: this.architectureState.revisionSeq + 1,
    };
    return {
      state: cloneArchitectureState(this.architectureState),
      revision: {
        id: `architecture-revision-${this.architectureState.revisionSeq}`,
        draftId: this.storedDraft.id,
        seq: this.architectureState.revisionSeq,
        opId: input.opId,
        disposition: input.disposition,
        doc: {},
        createdAt: '2026-07-24T12:00:00.000Z',
      },
    };
  });
  readonly approveArchitecture = vi.fn(async (
    _id: string,
    input: { expectedRevisionSeq: number },
  ): Promise<ArchitectureActionResult> => {
    if (input.expectedRevisionSeq !== this.architectureState.revisionSeq) {
      throw new DaemonClientError(409, {
        error: 'architecture revision conflict',
        current: cloneArchitectureState(this.architectureState),
      });
    }
    this.architectureState = {
      ...this.architectureState,
      approvedMd: joinArchitecture(this.architectureState.sections),
      approvedAt: '2026-07-24T12:00:00.000Z',
      revisionSeq: this.architectureState.revisionSeq + 1,
    };
    setDraftPhase(this.storedDraft, 'rapid-prototype');
    this.canonicalArchitectureWrites.push(
      `whp-youtube/architectures/${this.storedDraft.episodeSlug}.md`,
    );
    this.pipelineMilestones.push('prototyping');
    return completedArchitectureAction(this.architectureState);
  });
  readonly reopenArchitecture = vi.fn(async (
    _id: string,
    input: { expectedRevisionSeq: number; confirmed: true },
  ): Promise<ArchitectureActionResult> => {
    if (
      input.confirmed !== true
      || input.expectedRevisionSeq !== this.architectureState.revisionSeq
    ) {
      throw new DaemonClientError(409, {
        error: 'architecture revision conflict',
        current: cloneArchitectureState(this.architectureState),
      });
    }
    this.architectureState = {
      ...this.architectureState,
      approvedMd: null,
      approvedAt: null,
      revisionSeq: this.architectureState.revisionSeq + 1,
      narrationReconciliationRequired: true,
    };
    setDraftPhase(this.storedDraft, 'architecture');
    this.pipelineMilestones.push('architecture');
    return completedArchitectureAction(this.architectureState);
  });

  readonly submitOp = vi.fn(async (
    operation: OperationName,
    inputs: unknown,
  ) => {
    const id = `op-${++this.sequence}`;
    this.submissions.push({ id, operation, inputs });
    return { id };
  });
  readonly submitDraftOp = vi.fn(async (
    draftId: string,
    operation: OperationName,
    inputs: unknown,
  ) => {
    const result = await this.submitOp(operation, inputs);
    this.draftSubmissions.push({
      draftId,
      id: result.id,
      operation,
      inputs,
      approvedArchitectureMd: this.architectureState.approvedMd,
    });
    return result;
  });
  readonly resumeDraftOp = vi.fn(async (
    draftId: string,
    operationId: string,
    inputs: unknown,
  ) => this.submitDraftOp(
    draftId,
    this.submissions.find(({ id }) => id === operationId)?.operation
      ?? 'review-architecture',
    inputs,
  ));

  readonly streamEvents = vi.fn(async (
    id: string,
    options: StreamEventsOptions,
  ) => {
    await options.onEvent({
      id: '1',
      event: 'codex',
      data: JSON.stringify({
        type: 'item.completed',
        item: {
          type: 'agent_message',
          text: `Working on ${id}.`,
        },
      }),
    });
    await new Promise<void>((resolve) => {
      this.finishes.set(id, resolve);
    });
    await options.onDone();
  });

  readonly getOp = vi.fn(async (id: string) => {
    const outcome = this.outcomes.get(id);
    if (!outcome) throw new Error(`operation ${id} has not resolved`);
    return outcome.operation;
  });

  readonly getResult = vi.fn(async (id: string) => {
    const outcome = this.outcomes.get(id);
    if (!outcome) throw new Error(`operation ${id} has not resolved`);
    return outcome.result;
  });

  readonly cancel = vi.fn(async (id: string) => ({ id }));
  readonly resume = vi.fn(async () => ({ id: `op-${++this.sequence}` }));
  readonly listOps = vi.fn(async () => ({
    operations: this.submissions
      .map(({ id, operation }) =>
        operationSummary(
          this.outcomes.get(id)?.operation
          ?? completedOperation(id, {
            operation,
            state: 'running',
            finishedAt: null,
          }),
        ))
      .reverse(),
  }));

  resolve(
    id: string,
    result: OperationResult,
    overrides: Partial<OperationRecord> = {},
  ): void {
    const submission = this.submissions.find((item) => item.id === id);
    const finish = this.finishes.get(id);
    if (!submission || !finish) {
      throw new Error(`operation ${id} is not streaming`);
    }
    this.outcomes.set(id, {
      operation: completedOperation(id, {
        operation: submission.operation,
        ...overrides,
      }),
      result,
    });
    finish();
  }
}

interface MountedStudio {
  application: ApplicationRef;
  component: ComponentRef<App>;
  root: HTMLElement;
  router: Router;
  client: ControllableDaemonClient;
  session: StudioSession;
  tick(): void;
  destroy(): void;
}

const mounted: MountedStudio[] = [];
let appResourcesResolved = false;
let signalInputsHydrated = false;

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => domRectList();
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => domRect();
}
globalThis.scrollBy = () => undefined;

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.destroy();
  document.body.replaceChildren();
  globalThis.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('mounted Script Studio composition', () => {
  it('drives architecture approval, reopen, and episode reconciliation through production controls', async () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal('confirm', confirm);
    const studio = await mountStudio(architectureDraft());

    const architecturePanel = studio.root.querySelector(
      'app-architecture-panel',
    );
    const narrationActions = studio.root.querySelector(
      'app-narration-actions',
    );
    const editorHost = studio.root.querySelector('app-editor-host');
    expect(architecturePanel).not.toBeNull();
    expect(narrationActions).not.toBeNull();
    expect(editorHost).not.toBeNull();
    expect(
      architecturePanel!.compareDocumentPosition(editorHost!)
        & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(studio.root.querySelector('app-brief-panel')).not.toBeNull();

    findButton(architecturePanel, 'Generate architecture').click();
    await expectDraftSubmission(studio, 'generate-architecture', 1);
    studio.client.resolve('op-1', {
      kind: 'raw',
      markdown: generatedArchitectureMarkdown(),
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelectorAll(
        '[data-testid="architecture-proposal"]',
      )).toHaveLength(12);
    });
    const unsafeProposal = Array.from(studio.root.querySelectorAll(
      '[data-testid="architecture-proposal"]',
    )).find((element) => element.textContent?.includes('Optional comparison'));
    expect(unsafeProposal).not.toBeNull();
    expect(unsafeProposal?.querySelector('img')).toBeNull();
    expect(unsafeProposal?.innerHTML).not.toContain('onerror=');
    findButton(unsafeProposal ?? null, 'Reject proposal').click();
    studio.tick();
    findButton(architecturePanel, 'Accept all proposals').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.saveArchitecture).toHaveBeenCalledOnce();
      expect(studio.root.querySelectorAll(
        '[data-testid="architecture-proposal"]',
      )).toHaveLength(0);
      expect(studio.client.architectureState.sections).toHaveLength(11);
    });

    const coreAnswer = studio.root.querySelector<HTMLElement>(
      '[data-section-key="core-answer"]',
    )!;
    setInputValue(
      coreAnswer.querySelector('input[aria-label="Refine Core answer"]'),
      'Make the causal step explicit.',
    );
    studio.tick();
    findButton(coreAnswer, 'Refine section').click();
    await expectDraftSubmission(
      studio,
      'rewrite-architecture-section',
      1,
    );
    studio.client.resolve('op-2', {
      kind: 'schema',
      value: {
        status: 'complete',
        replacement_markdown:
          '### Core answer\n\nThe refined causal answer.\n',
        guardrail_markdown: null,
      },
      guardrail: null,
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(coreAnswer.textContent).toContain('The refined causal answer.');
    });
    findButton(coreAnswer, 'Accept proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.architectureState.sections.find(
        ({ key }) => key === 'core-answer',
      )?.md).toContain('The refined causal answer.');
      expect(findButton(architecturePanel, 'Review architecture').disabled)
        .toBe(false);
    });

    findButton(architecturePanel, 'Review architecture').click();
    await expectDraftSubmission(studio, 'review-architecture', 1);
    studio.client.resolve('op-3', {
      kind: 'schema',
      value: {
        status: 'complete',
        findings: [{
          section_key: 'core-answer',
          severity: 'important',
          finding_markdown: 'Pin this finding to the core answer.',
        }],
        guardrail_markdown: null,
      },
      guardrail: null,
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(coreAnswer.textContent).toContain(
        'Pin this finding to the core answer.',
      );
    });

    findButton(architecturePanel, 'Approve architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(architecturePanel.textContent).toContain('Approved Jul 24, 2026');
      expect(studio.client.canonicalArchitectureWrites).toEqual([
        'whp-youtube/architectures/composition-net.md',
      ]);
      expect(studio.client.pipelineMilestones).toEqual(['prototyping']);
    });
    const narrationComponent = getDebugNode(narrationActions!)
      ?.componentInstance as NarrationActions | undefined;
    const generateEpisode = findButton(narrationActions, 'Generate episode');
    expect(
      generateEpisode.disabled,
      `narration actions: ${narrationActions?.textContent}; state: ${
        JSON.stringify(narrationComponent?.model().state)
      }`,
    ).toBe(false);

    const narrationBeforeReopen = editorText(studio);
    findButton(architecturePanel, 'Reopen architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(confirm).toHaveBeenCalledWith(
        'Reopen architecture? Existing narration is preserved but must be reconciled.',
      );
      expect(architecturePanel.textContent).toContain(
        'Reopened — narration reconciliation required',
      );
      expect(editorText(studio)).toBe(narrationBeforeReopen);
      expect(findButton(narrationActions, 'Generate episode').disabled)
        .toBe(true);
      expect(findButton(narrationActions, 'Promote').disabled).toBe(true);
    });

    findButton(architecturePanel, 'Approve architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(findButton(narrationActions, 'Generate episode').disabled)
        .toBe(false);
      expect(narrationActions.textContent).toContain(
        'Narration reconciliation is required before Promote.',
      );
    });

    findButton(narrationActions, 'Generate episode').click();
    await expectDraftSubmission(studio, 'generate-episode', 1);
    const approvedAtGeneration =
      studio.client.draftSubmissions.at(-1)?.approvedArchitectureMd;
    expect(approvedAtGeneration).toBe(
      studio.client.architectureState.approvedMd,
    );
    expect(studio.client.draftSubmissions.at(-1)?.inputs).not.toHaveProperty(
      'approved_architecture_md',
    );
    studio.client.resolve('op-4', {
      kind: 'raw',
      markdown: generatedNarrationMarkdown('Rejected fresh narration.'),
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(narrationActions.textContent).toContain(
        'Rejected fresh narration.',
      );
    });
    findButton(narrationActions, 'Reject episode proposal').click();
    studio.tick();
    expect(editorText(studio)).toBe(narrationBeforeReopen);

    findButton(narrationActions, 'Generate episode').click();
    await expectDraftSubmission(studio, 'generate-episode', 2);
    studio.client.resolve('op-5', {
      kind: 'raw',
      markdown: generatedNarrationMarkdown('Accepted fresh narration.'),
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(narrationActions.textContent).toContain(
        'Accepted fresh narration.',
      );
    });
    findButton(narrationActions, 'Accept episode proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorText(studio)).toContain('Accepted fresh narration.');
      expect(editorText(studio)).not.toContain('rewrite target');
      expect(studio.client.save).toHaveBeenCalledWith(
        'draft-1',
        expect.objectContaining({
          opId: 'op-5',
          disposition: 'episode-generation-accepted',
        }),
      );
      expect(studio.client.architectureState
        .narrationReconciliationRequired).toBe(false);
      expect(narrationActions.textContent).not.toContain(
        'Narration reconciliation is required before Promote.',
      );
    });
  });

  it('drives the full production Studio and routed Console surface', async () => {
    const cancelAutosave = vi.spyOn(
      DebouncedAutosave.prototype,
      'cancel',
    );
    const studio = await mountStudio();

    expect(studio.root.querySelector('app-studio-page')).not.toBeNull();
    expect(studio.root.querySelector('app-draft-manager')).not.toBeNull();
    expect(studio.root.querySelector('app-editor-host')).not.toBeNull();
    expect(studio.root.querySelector('app-brief-panel')).not.toBeNull();
    expect(studio.root.querySelector('app-findings-panel')).not.toBeNull();
    expect(studio.root.querySelector('app-parking-lot')).not.toBeNull();

    const editorHost = studio.root.querySelector('app-editor-host');
    expect(
      editorHost?.querySelector('.selection-toolbar'),
      'EditorHost must invoke composeStudio and mount its runtime toolbar',
    ).not.toBeNull();
    expect(
      editorHost?.querySelector('.agent-console-panel'),
      'EditorHost must retain the runtime-created console host',
    ).not.toBeNull();

    await selectText(studio, 'rewrite target');
    expect(toolbar(studio).hidden).toBe(false);
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-1.');

    studio.client.resolve('op-1', rewriteResult('rewritten target'));
    let readyProposal: Element | null = null;
    await vi.waitFor(() => {
      studio.tick();
      readyProposal = studio.root.querySelector('.proposal-diff');
      expect(readyProposal?.textContent).toContain('rewritten target');
    });
    findButton(readyProposal, 'Accept').click();
    studio.tick();
    await vi.waitFor(() => {
      expect(editorText(studio)).toContain('rewritten target');
      expect(editorText(studio)).not.toContain('rewrite target');
    });

    await selectText(studio, 'failure target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    studio.client.resolve('op-2', {
      kind: 'failed',
      error: 'invalid operation result',
    }, {
      state: 'invalid-output',
      error: 'response failed schema validation',
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector(
        '[data-testid="operation-failure"]',
      )?.textContent).toContain('invalid operation result');
    });

    await selectText(studio, 'guardrail target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    studio.client.resolve('op-3', {
      kind: 'schema',
      value: {
        status: 'declined',
        replacement_markdown: '',
        guardrail_markdown: 'The request crosses the approved scope.',
      },
      guardrail: 'The request crosses the approved scope.',
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector(
        '[data-testid="operation-guardrail"]',
      )?.textContent).toContain('crosses the approved scope');
    });

    await selectText(studio, 'alternatives target');
    clickToolbar(studio, 'alternatives');
    await expectPending(studio, true);
    expect(studio.root.querySelector('.proposal-diff')).toBeNull();
    studio.client.resolve('op-4', {
      kind: 'schema',
      value: {
        status: 'complete',
        options: [
          { label: 'Direct', markdown: 'State the rule plainly.' },
          { label: 'Playful', markdown: 'Turn the rule into a toy.' },
        ],
        guardrail_markdown: null,
      },
      guardrail: null,
    });
    const unsettled = await waitForElement(
      studio,
      '[data-testid="unsettled-variant"]',
    );
    expect(unsettled.textContent).toContain('Direct');
    expect(unsettled.textContent).toContain('Playful');
    findButton(unsettled, 'Playful').click();
    studio.tick();
    findButton(
      studio.root.querySelector('[data-testid="unsettled-variant"]'),
      'Pick active',
    ).click();
    studio.tick();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector(
        '[data-testid="unsettled-variant"]',
      )).toBeNull();
      expect(studio.root.querySelector(
        'ol[aria-label="Parked variants"]',
      )?.textContent).toContain('State the rule plainly.');
    });

    await selectText(studio, 'review target');
    clickToolbar(studio, 'review');
    await expectPending(studio, true);
    studio.client.resolve('op-5', {
      kind: 'schema',
      value: {
        status: 'complete',
        findings: [{
          anchor: 'review target',
          severity: 'important',
          finding_markdown: 'Ground this claim in the supplied anchor.',
          optional_direction_markdown: 'Name the concrete rule.',
        }],
        guardrail_markdown: null,
      },
      guardrail: null,
    });
    await vi.waitFor(() => {
      studio.tick();
      const findings = studio.root.querySelector('app-findings-panel');
      expect(findings?.textContent).toContain(
        'Ground this claim in the supplied anchor.',
      );
      expect(findings?.textContent).toContain('Anchored');
    });

    const promote = findButton(
      studio.root.querySelector('app-brief-panel'),
      'Promote',
    );
    expect(promote.disabled).toBe(true);
    const approval = studio.root.querySelector<HTMLInputElement>(
      'app-brief-panel input[type="checkbox"]',
    )!;
    approval.checked = true;
    approval.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => {
      studio.tick();
      expect(promote.disabled).toBe(false);
    });

    await selectText(studio, 'reroll target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    studio.client.resolve('op-6', rewriteResult('rerolled target'));
    await waitForElement(studio, '.proposal-diff');
    await vi.waitFor(() => {
      studio.tick();
      const studioReroll = findButton(
        Array.from(studio.root.querySelectorAll(
          '[data-testid="console-operation"]',
        )).at(-1) ?? null,
        'Re-roll',
      );
      expect(studioReroll.disabled).toBe(false);
    });

    const cancelsBeforeDetach = cancelAutosave.mock.calls.length;
    await studio.router.navigateByUrl('/console');
    studio.tick();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector('app-agent-console-page')).not.toBeNull();
      expect(studio.root.textContent).toContain('op-6');
      expect(studio.root.textContent).toContain('Working on op-6.');
    });
    const routedReroll = findButton(
      studio.root.querySelector('app-agent-console .actions'),
      'Re-roll',
    );
    expect(routedReroll.disabled).toBe(true);
    expect(cancelAutosave.mock.calls.length)
      .toBeGreaterThan(cancelsBeforeDetach);
    expect(studio.client.resume).not.toHaveBeenCalled();
    expect(studio.root.querySelectorAll(
      'app-agent-console nav button',
    ).length).toBeGreaterThanOrEqual(6);
  });

  it('renders verbatim Base, Current, and Proposed for an intervening-edit conflict', async () => {
    const studio = await mountStudio();
    await selectText(studio, 'conflict target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);

    await replaceRenderedText(
      studio,
      'conflict target',
      'current edited target',
    );
    studio.client.resolve('op-1', rewriteResult('proposed target'));

    let conflict: Element | null = null;
    await vi.waitFor(() => {
      studio.tick();
      conflict = studio.root.querySelector('.proposal-diff.is-conflicted');
      expect(labeledConflictValues(conflict!)).toEqual({
        Base: 'conflict target',
        Current: 'current edited target',
        Proposed: 'proposed target',
      });
    });
    expect(labeledConflictValues(conflict)).toEqual({
      Base: 'conflict target',
      Current: 'current edited target',
      Proposed: 'proposed target',
    });
    expect(findButton(conflict, 'Accept').disabled).toBe(true);
  });

  it('renders the same three-way conflict when a lock overlaps the proposal', async () => {
    const studio = await mountStudio();
    await selectText(studio, 'lock target');
    clickToolbar(studio, 'lock');
    await selectText(studio, 'lock target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    studio.client.resolve('op-1', rewriteResult('locked proposal'));

    const conflict = await waitForElement(
      studio,
      '.proposal-diff.is-conflicted',
    );
    expect(labeledConflictValues(conflict)).toEqual({
      Base: 'lock target',
      Current: 'lock target',
      Proposed: 'locked proposal',
    });
    expect(findButton(conflict, 'Accept').disabled).toBe(true);
  });

  it('shows a launch callout when an opened draft has no stored phase', async () => {
    const draft = studioDraft();
    draft.doc['metadata'] = {
      ...(draft.doc['metadata'] as Record<string, unknown>),
      creativeStatus: {},
    };
    const studio = await mountStudio(draft);
    await selectText(studio, 'rewrite target');
    clickToolbar(studio, 'rewrite');

    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector('[role="alert"]')?.textContent)
        .toContain(
          'Set the creative phase in Episode brief before launching an operation.',
        );
    });
    expect(studio.client.submitOp).not.toHaveBeenCalled();
  });

  it('clears the unsaved badge only after a superseding retry persists', async () => {
    const studio = await mountStudio();
    vi.useFakeTimers();
    const persist = studio.client.save.getMockImplementation();
    if (!persist) throw new Error('the controllable save implementation is unavailable');
    const attempts: string[] = [];
    let persistNewestRetry!: () => void;
    studio.client.save.mockImplementation(async (id, input) => {
      const serialized = JSON.stringify(input.doc);
      const snapshot = serialized.includes('newest autosave target')
        ? 'newest'
        : 'first';
      attempts.push(snapshot);
      if (attempts.length <= 2) {
        throw new DaemonClientError(503, { error: 'daemon unavailable' });
      }
      await new Promise<void>((resolve) => {
        persistNewestRetry = resolve;
      });
      return persist(id, input);
    });

    await replaceRenderedText(
      studio,
      'rewrite target',
      'first autosave target',
    );
    studio.tick();
    const hostElement = studio.root.querySelector<HTMLElement>('app-editor-host');
    if (!hostElement) throw new Error('EditorHost was not mounted');
    const host = getDebugNode(hostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!host) throw new Error('EditorHost instance was not discoverable');
    expect(host.unsaved()).toBe(true);
    expect(hostElement.querySelector('[data-testid="unsaved-badge"]')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(1_000);
    studio.tick();
    expect(attempts).toEqual(['first']);
    expect(host.saving()).toBe(true);
    expect(host.unsaved()).toBe(true);

    await replaceRenderedText(
      studio,
      'first autosave target',
      'newest autosave target',
    );
    await vi.advanceTimersByTimeAsync(0);
    studio.tick();
    expect(attempts).toEqual(['first', 'newest']);
    expect(host.saving()).toBe(true);
    expect(host.unsaved()).toBe(true);
    expect(hostElement.querySelector('[data-testid="unsaved-badge"]')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(1_000);
    studio.tick();
    expect(attempts).toEqual(['first', 'newest', 'newest']);
    expect(host.saving()).toBe(true);
    expect(host.unsaved()).toBe(true);
    expect(hostElement.querySelector('[data-testid="unsaved-badge"]')).not.toBeNull();

    persistNewestRetry();
    await vi.waitFor(() => {
      studio.tick();
      expect(host.saving()).toBe(false);
      expect(host.unsaved()).toBe(false);
      expect(hostElement.querySelector('[data-testid="unsaved-badge"]')).toBeNull();
    });
  });
});

async function mountStudio(
  draft = studioDraft(),
): Promise<MountedStudio> {
  if (!appResourcesResolved) {
    await ɵresolveComponentResources(async (url) =>
      url.endsWith('app.html') ? appTemplate : appStyles);
    appResourcesResolved = true;
  }
  if (!signalInputsHydrated) {
    // Vitest transpiles TypeScript without Angular's AOT input transform. Hydrate
    // only the signal-input metadata so the real production component tree can
    // bind and run under JIT in jsdom.
    hydrateSignalInputs(BriefPanel, ['model', 'gate', 'showPromote']);
    hydrateSignalInputs(FindingsPanel, ['findings']);
    hydrateSignalInputs(ParkingLot, ['model']);
    hydrateSignalInputs(RevisionTimeline, ['manager']);
    hydrateSignalInputs(DraftTransfer, ['manager']);
    hydrateSignalInputs(EditorHost, ['draft', 'client', 'session', 'wpm']);
    hydrateSignalInputs(AgentConsole, ['model', 'client']);
    hydrateSignalInputs(ArchitecturePanel, ['model', 'draft']);
    hydrateSignalInputs(NarrationActions, [
      'model',
      'draft',
      'client',
      'editor',
      'version',
    ]);
    hydrateSignalOutputs(ArchitecturePanel, ['changed']);
    hydrateSignalOutputs(NarrationActions, ['changed']);
    hydrateSignalInputs(DraftManagerComponent, ['client', 'session']);
    const draftManagerDefinition = ɵgetComponentDef(DraftManagerComponent);
    if (!draftManagerDefinition) {
      throw new Error('DraftManager component definition is unavailable');
    }
    draftManagerDefinition.viewQuery = (
      renderFlags: number,
      instance: DraftManagerComponent,
    ) => {
      if (renderFlags & 1) {
        ɵɵviewQuerySignal(instance.editorHost, EditorHost, 5);
      }
    };
    signalInputsHydrated = true;
  }
  globalThis.history.replaceState(null, '', '/');
  const client = new ControllableDaemonClient(draft);
  const session = new StudioSession(client as unknown as DaemonClient);
  const application = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      { provide: STUDIO_SESSION, useValue: session },
    ],
  });
  const root = document.createElement('app-root');
  document.body.append(root);
  const component = createComponent(App, {
    environmentInjector: application.injector,
    hostElement: root,
  });
  application.attachView(component.hostView);
  const router = application.injector.get(Router);
  const studio: MountedStudio = {
    application,
    component,
    root,
    router,
    client,
    session,
    tick: () => {
      application.tick();
      component.changeDetectorRef.detectChanges();
    },
    destroy: () => {
      application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      root.remove();
    },
  };
  mounted.push(studio);
  await router.navigateByUrl('/');
  studio.tick();
  await vi.waitFor(() => {
    studio.tick();
    expect(client.list).toHaveBeenCalled();
    expect(root.querySelector('.draft-card')).not.toBeNull();
  });
  root.querySelector<HTMLButtonElement>('.draft-card')!.click();
  await vi.waitFor(() => {
    studio.tick();
    expect(client.get).toHaveBeenCalledWith(draft.id);
    expect(root.querySelector('app-editor-host .ProseMirror')).not.toBeNull();
    expect(root.querySelector('app-architecture-panel')).not.toBeNull();
    expect(root.querySelector('app-narration-actions')).not.toBeNull();
    expect(root.querySelector('app-brief-panel')).not.toBeNull();
    expect(root.querySelector('app-findings-panel')).not.toBeNull();
    expect(root.querySelector('app-parking-lot')).not.toBeNull();
  });
  return studio;
}

function hydrateSignalInputs(
  component: object,
  names: string[],
): void {
  const definition = ɵgetComponentDef(component as never);
  if (!definition) throw new Error('Angular component definition is unavailable');
  const inputs = { ...definition.inputs };
  const declaredInputs = { ...definition.declaredInputs };
  for (const name of names) {
    inputs[name] = [name, 1, null];
    declaredInputs[name] = name;
  }
  definition.inputs = inputs;
  definition.declaredInputs = declaredInputs;
}

function hydrateSignalOutputs(
  component: object,
  names: string[],
): void {
  const definition = ɵgetComponentDef(component as never);
  if (!definition) throw new Error('Angular component definition is unavailable');
  const outputs = { ...definition.outputs };
  for (const name of names) outputs[name] = name;
  definition.outputs = outputs;
}

async function selectText(
  studio: MountedStudio,
  text: string,
): Promise<void> {
  const editor = studio.root.querySelector<HTMLElement>('.ProseMirror');
  if (!editor) throw new Error('the production ProseMirror surface was not mounted');
  const match = findTextNode(editor, text);
  if (!match) throw new Error(`text "${text}" was not found in the editor`);
  const range = document.createRange();
  range.setStart(match.node, match.offset);
  range.setEnd(match.node, match.offset + text.length);
  editor.focus();
  const selection = globalThis.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
  editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

  await vi.waitFor(() => {
    studio.tick();
    expect(toolbar(studio).hidden).toBe(false);
  });
}

async function replaceRenderedText(
  studio: MountedStudio,
  current: string,
  replacement: string,
): Promise<void> {
  const editor = studio.root.querySelector<HTMLElement>('.ProseMirror')!;
  const match = findTextNode(editor, current);
  if (!match) throw new Error(`text "${current}" was not found in the editor`);
  match.node.data = [
    match.node.data.slice(0, match.offset),
    replacement,
    match.node.data.slice(match.offset + current.length),
  ].join('');
  editor.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: replacement,
  }));
  await vi.waitFor(() => {
    studio.tick();
    expect(editorText(studio)).toContain(replacement);
    expect(editorText(studio)).not.toContain(current);
  });
}

function toolbar(studio: MountedStudio): HTMLDivElement {
  const element = studio.root.querySelector<HTMLDivElement>(
    'app-editor-host .selection-toolbar',
  );
  if (!element) throw new Error('composeStudio did not mount the selection toolbar');
  return element;
}

function clickToolbar(
  studio: MountedStudio,
  action: string,
): void {
  const button = toolbar(studio).querySelector<HTMLButtonElement>(
    `button[data-action="${action}"]`,
  );
  if (!button) throw new Error(`toolbar action ${action} was not rendered`);
  button.click();
  studio.tick();
}

async function expectPending(
  studio: MountedStudio,
  expected: boolean,
): Promise<void> {
  await vi.waitFor(() => {
    studio.tick();
    expect(Boolean(studio.root.querySelector(
      '[data-testid="selection-operation-pending"]',
    ))).toBe(expected);
  });
}

async function expectEmbeddedConsole(
  studio: MountedStudio,
  text: string,
): Promise<void> {
  await vi.waitFor(() => {
    studio.tick();
    expect(studio.root.querySelector(
      '[data-testid="console-operation"]',
    )?.textContent).toContain(text);
  });
}

async function waitForElement(
  studio: MountedStudio,
  selector: string,
): Promise<Element> {
  let element: Element | null = null;
  await vi.waitFor(() => {
    studio.tick();
    element = studio.root.querySelector(selector);
    expect(element).not.toBeNull();
  });
  return element!;
}

function findTextNode(
  root: Node,
  text: string,
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (
    let node = walker.nextNode();
    node !== null;
    node = walker.nextNode()
  ) {
    const offset = node.textContent?.indexOf(text) ?? -1;
    if (node instanceof Text && offset >= 0) return { node, offset };
  }
  return null;
}

function findButton(
  element: Element | null,
  label: string,
): HTMLButtonElement {
  const button = Array.from(
    element?.querySelectorAll<HTMLButtonElement>('button') ?? [],
  ).find((candidate) =>
    candidate.textContent?.replace(/\s+/gu, ' ').trim().startsWith(label));
  if (!button) throw new Error(`button ${label} was not rendered`);
  return button;
}

function labeledConflictValues(
  conflict: Element,
): Record<string, string> {
  return Object.fromEntries(
    Array.from(conflict.querySelectorAll<HTMLElement>('[data-conflict-value]'))
      .map((element) => [
        element.dataset['conflictValue'] ?? '',
        element.textContent ?? '',
      ]),
  );
}

function editorText(studio: MountedStudio): string {
  return studio.root.querySelector('.ProseMirror')?.textContent ?? '';
}

function rewriteResult(replacement: string): OperationResult {
  return {
    kind: 'schema',
    value: {
      status: 'complete',
      replacement_markdown: replacement,
      guardrail_markdown: null,
    },
    guardrail: null,
  };
}

function studioDraft(): DraftRecord {
  return {
    id: 'draft-1',
    episodeSlug: 'composition-net',
    title: 'Composition net',
    format: 'narration',
    updatedAt: '2026-07-23T12:00:00.000Z',
    doc: {
      type: 'doc',
      attrs: { format: 'narration', preamble: '' },
      metadata: {
        topic: 'Why constraints create play',
        anchors: ['Players accept the rule.'],
        unknowns: ['Which example survives review?'],
        approvedLessons: ['Keep the language concrete.'],
        creativeStatus: { phase: 'rapid-prototype' },
        directionApproved: false,
      },
      content: [{
        type: 'beat',
        attrs: {
          beatId: 'beat-1',
          title: 'The test beat',
          timeTargetMs: 30_000,
          narrativeJob: 'Turn the example into the larger question.',
        },
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: [
              'rewrite target',
              'failure target',
              'guardrail target',
              'alternatives target',
              'review target',
              'reroll target',
              'conflict target',
              'lock target',
            ].join('. ') + '.',
          }],
        }],
      }],
    },
  };
}

function draftSummary(draft: DraftRecord): Omit<DraftRecord, 'doc'> {
  const { doc: _doc, ...summary } = draft;
  return summary;
}

function completedOperation(
  id: string,
  overrides: Partial<OperationRecord> = {},
): OperationRecord {
  return {
    id,
    operation: 'rewrite-selection',
    state: 'completed',
    stalled: false,
    envelopeJson: '{}',
    jobDir: `/tmp/${id}`,
    threadId: `thread-${id}`,
    retryOf: null,
    resumedFrom: null,
    createdAt: '2026-07-23T12:00:00.000Z',
    startedAt: '2026-07-23T12:00:00.000Z',
    finishedAt: '2026-07-23T12:00:01.000Z',
    inputTokens: 10,
    cachedInputTokens: 0,
    outputTokens: 5,
    reasoningOutputTokens: 0,
    usageAvailable: 1,
    error: null,
    ...overrides,
  };
}

function operationSummary(operation: OperationRecord): OperationSummary {
  return {
    id: operation.id,
    operation: operation.operation,
    state: operation.state,
    createdAt: operation.createdAt,
    finishedAt: operation.finishedAt,
    stalled: operation.stalled,
    usageAvailable: operation.usageAvailable,
    inputTokens: operation.inputTokens,
    cachedInputTokens: operation.cachedInputTokens,
    outputTokens: operation.outputTokens,
    reasoningOutputTokens: operation.reasoningOutputTokens,
  };
}

function generatedArchitectureMarkdown(): string {
  return [
    ...ARCHITECTURE_SECTIONS.map(({ key, title }) =>
      `### ${title}\n\nGenerated ${key}.\n`),
    [
      '### Optional comparison',
      '',
      '<img src=x onerror="globalThis.__unsafe = true">',
      '',
    ].join('\n'),
  ].join('');
}

function generatedNarrationMarkdown(narration: string): string {
  return [
    '# Generated episode',
    '',
    '## 1. Opening',
    '',
    `> ${narration}`,
    '',
  ].join('\n');
}

function architectureDraft(): DraftRecord {
  const draft = studioDraft();
  setDraftPhase(draft, 'architecture');
  return draft;
}

function setDraftPhase(draft: DraftRecord, phase: string): void {
  const metadata = draft.doc['metadata'] as Record<string, unknown>;
  metadata['creativeStatus'] = {
    ...metadata['creativeStatus'] as Record<string, unknown>,
    phase,
  };
}

function cloneArchitectureState(
  state: ArchitectureState,
): ArchitectureState {
  return {
    ...state,
    sections: state.sections.map((section) => ({ ...section })),
  };
}

function completedArchitectureAction(
  state: ArchitectureState,
): ArchitectureActionResult {
  return {
    complete: true,
    steps: {
      revisionAppended: 'completed',
      artifactWritten: 'completed',
      pipelineUpserted: 'completed',
      draftUpdated: 'completed',
    },
    state: cloneArchitectureState(state),
  };
}

async function expectDraftSubmission(
  studio: MountedStudio,
  operation: OperationName,
  count: number,
): Promise<void> {
  await vi.waitFor(() => {
    studio.tick();
    expect(
      studio.client.draftSubmissions.filter(
        (submission) => submission.operation === operation,
      ),
      `${operation} draft submissions; panel text: ${
        studio.root.querySelector('app-architecture-panel')?.textContent
      }`,
    ).toHaveLength(count);
  });
}

function setInputValue(
  element: Element | null,
  value: string,
): void {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error('input was not rendered');
  }
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function domRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    top: 0,
    right: 1,
    bottom: 1,
    left: 0,
    toJSON: () => ({}),
  };
}

function domRectList(): DOMRectList {
  const rect = domRect();
  return {
    0: rect,
    length: 1,
    item: (index: number) => index === 0 ? rect : null,
    [Symbol.iterator]: function* () {
      yield rect;
    },
  };
}
