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
import {
  exportMarkdown,
  parseMarkdown,
  schema,
} from '@whp/script-creator-editor-core';
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
  RevisionRecord,
  SavedDraft,
  StreamEventsOptions,
} from '../api/client';
import {
  ARCHITECTURE_SECTIONS,
  joinArchitecture,
} from '../architecture/model';
import { ArchitecturePanel } from '../architecture/architecture-panel';
import { NarrationActions } from '../narration/narration-actions';
import { ProductionPanel } from '../production/production-panel';
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

interface ControlledPromotion {
  draftId: string;
  operationId: string;
  state:
    | 'running'
    | 'output-ready'
    | 'validation-required'
    | 'complete'
    | 'failed';
  targetPath: string;
  targetHash: string | null;
  validationHash: string | null;
  error: string | null;
}

class ControllableDaemonClient {
  private sequence = 0;
  private revisionSequence = 0;
  private readonly revisionHistory: RevisionRecord[] = [];
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
  readonly narrationApprovals: Array<{
    draftId: string;
    expectedRevisionSeq: number;
    settledExportToken: string;
  }> = [];
  readonly narrationSettledExports: Array<{
    draftId: string;
    expectedRevisionSeq: number;
    expectedNarrationMd: string;
  }> = [];
  readonly productionSyncs: Array<{
    draftId: string;
    expectedRevisionSeq: number;
  }> = [];
  readonly narrationProposalResolutions: Array<{
    draftId: string;
    operationId: string;
    decision: 'accepted' | 'rejected';
  }> = [];
  pendingNarrationProposals: Array<{
    draftId: string;
    operationId: string;
    state: 'pending';
    createdAt: string;
    resolvedAt: null;
    acceptedRevisionPresent: boolean;
  }> = [];
  promotion: ControlledPromotion | null = null;
  validatorResults: Array<{
    ok: boolean;
    errors: Array<{ message: string; line: number | null }>;
    path: string;
    hash: string;
  }> = [];
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
  readonly listRevisions = vi.fn(async () =>
    this.revisionHistory.map((revision) => ({ ...revision })));
  readonly create = vi.fn(async () => this.storedDraft);
  readonly import = vi.fn(async () => this.storedDraft);
  readonly export = vi.fn(async () => ({ markdown: '# Exported' }));
  readonly writeArtifact = vi.fn(async () => ({
    conflict: false as const,
    hash: 'artifact-hash',
  }));
  readonly validate = vi.fn(async () => ({ ok: true, errors: [] }));
  readonly prepareNarrationApproval = vi.fn(async (
    draftId: string,
    input: {
      expectedRevisionSeq: number;
      expectedNarrationMd: string;
    },
  ) => {
    this.narrationSettledExports.push({ draftId, ...input });
    if (input.expectedNarrationMd !== this.currentMarkdown()) {
      throw new Error('editor export mismatch');
    }
    return { settledExportToken: 'settled-export-token' };
  });
  readonly approveNarration = vi.fn(async (
    draftId: string,
    input: {
      expectedRevisionSeq: number;
      settledExportToken: string;
    },
  ) => {
    this.narrationApprovals.push({ draftId, ...input });
    const markdown = this.currentMarkdown();
    if (input.settledExportToken !== 'settled-export-token') {
      throw new Error('settled export token mismatch');
    }
    const record = this.storedDraft as DraftRecord & {
      approvedNarrationMd?: string | null;
      approvedNarrationAt?: string | null;
      approvedNarrationRevisionSeq?: number | null;
      narrationArtifactHash?: string | null;
    };
    record.approvedNarrationMd = markdown;
    record.approvedNarrationAt = '2026-07-24T13:00:00.000Z';
    const revision = this.appendRevision(
      'narration-approved',
      this.storedDraft.doc,
    );
    record.approvedNarrationRevisionSeq = revision.seq;
    record.narrationArtifactHash = 'narration-hash';
    setDraftPhase(this.storedDraft, 'creative-approved');
    return this.storedDraft;
  });
  readonly resolveNarrationProposal = vi.fn(async (
    draftId: string,
    operationId: string,
    decision: 'accepted' | 'rejected',
  ) => {
    this.narrationProposalResolutions.push({
      draftId,
      operationId,
      decision,
    });
    this.pendingNarrationProposals =
      this.pendingNarrationProposals.filter(
        (proposal) => proposal.operationId !== operationId,
      );
    return {
      draftId,
      operationId,
      state: decision,
    };
  });
  readonly listNarrationProposals = vi.fn(async () => ({
    proposals: this.pendingNarrationProposals.map(
      (proposal) => ({ ...proposal }),
    ),
  }));
  readonly getPromotion = vi.fn(async () => ({
    promotion: this.promotion,
  }));
  readonly syncProduction = vi.fn(async (
    draftId: string,
    input: {
      expectedRevisionSeq: number;
    },
  ) => {
    this.productionSyncs.push({ draftId, ...input });
    if (!this.promotion) throw new Error('promotion missing');
    this.promotion = {
      ...this.promotion,
      state: 'validation-required',
      targetHash: 'production-hash',
      validationHash: null,
    };
    return this.promotion;
  });
  readonly validateDraft = vi.fn(async () =>
    this.validatorResults.shift() ?? {
      ok: true,
      errors: [],
      path: 'whp-youtube/episodes/01-composition-net.md',
      hash: 'production-hash',
    });
  readonly completePromote = vi.fn(async () => {
    if (!this.promotion) throw new Error('promotion missing');
    this.promotion = {
      ...this.promotion,
      state: 'complete',
      validationHash: 'production-hash',
    };
    setDraftPhase(this.storedDraft, 'production');
    this.pipelineMilestones.push('production');
    return this.promotion;
  });

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
    const revision = this.appendRevision(
      input.disposition ?? 'edit',
      input.doc,
    );
    return {
      draft: this.storedDraft,
      revision,
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
    if (operation === 'promote') {
      const targetPath = (
        inputs as Record<string, unknown>
      )['target_path'] as string;
      this.promotion = {
        draftId,
        operationId: result.id,
        state: 'running',
        targetPath,
        targetHash: null,
        validationHash: null,
        error: null,
      };
    }
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
    if (submission.operation === 'promote' && result.kind === 'raw') {
      const currentMetadata = this.storedDraft.doc['metadata'];
      this.storedDraft.doc = {
        ...parseProductionFixture(),
        metadata: currentMetadata,
      };
      this.promotion = this.promotion
        ? {
            ...this.promotion,
            state: 'validation-required',
            targetHash: 'production-hash',
          }
        : null;
      this.appendRevision(
        'production-import',
        this.storedDraft.doc,
        submission.id,
      );
    }
    finish();
  }

  private currentMarkdown(): string {
    const result = exportMarkdown(schema.nodeFromJSON(this.storedDraft.doc));
    if (!result.ok) throw new Error('fixture export is unsettled');
    return result.markdown;
  }

  private appendRevision(
    disposition: string,
    doc: DraftDocument,
    opId: string | null = null,
  ): RevisionRecord {
    const seq = ++this.revisionSequence;
    const revision = {
      id: `revision-${seq}`,
      draftId: this.storedDraft.id,
      seq,
      opId,
      disposition,
      doc: structuredClone(doc),
      createdAt:
        `2026-07-23T12:00:${String(seq).padStart(2, '0')}.000Z`,
    };
    this.revisionHistory.push(revision);
    return revision;
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
  it('keeps complete-narration approval disabled while an editor save is pending', async () => {
    const studio = await mountStudio(productionDraft());
    const panel = studio.root.querySelector('app-production-panel')!;

    await replaceRenderedText(
      studio,
      'Opening narration.',
      'Unsaved opening narration.',
    );
    studio.tick();

    expect(findButton(panel, 'Approve complete narration').disabled).toBe(true);
    expect(studio.client.approveNarration).not.toHaveBeenCalled();
  });

  it('resumes an interrupted narration approval reservation from the routed controls', async () => {
    const draft = productionDraft();
    setDraftPhase(draft, 'rapid-prototype');
    const markdown = exportMarkdown(schema.nodeFromJSON(draft.doc));
    if (!markdown.ok) throw new Error('fixture export is unsettled');
    draft.approvedNarrationMd = markdown.markdown;
    draft.approvedNarrationAt = '2026-07-24T13:00:00.000Z';
    draft.approvedNarrationRevisionSeq = 0;
    const studio = await mountStudio(draft);
    const panel = studio.root.querySelector('app-production-panel')!;

    expect(findButton(panel, 'Approve complete narration').disabled)
      .toBe(false);
    findButton(panel, 'Approve complete narration').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.approveNarration).toHaveBeenCalledOnce();
      expect(readDraftPhase(studio.client.storedDraft))
        .toBe('creative-approved');
    });
  });

  it('automatically resumes persisted production synchronization and completion reservations', async () => {
    const targetPath =
      'whp-youtube/episodes/01-composition-net.md';
    const synchronization = await mountStudio(
      productionDraft(),
      (client) => {
        client.promotion = {
          draftId: client.storedDraft.id,
          operationId: 'promote-sync',
          state: 'output-ready',
          targetPath,
          targetHash: 'production-hash',
          validationHash: null,
          error: 'production synchronization in progress',
        };
      },
    );
    await vi.waitFor(() => {
      synchronization.tick();
      expect(synchronization.client.syncProduction).toHaveBeenCalledOnce();
      expect(synchronization.client.validateDraft).toHaveBeenCalledOnce();
    });
    synchronization.destroy();
    mounted.splice(mounted.indexOf(synchronization), 1);

    const completion = await mountStudio(
      productionDraft(),
      (client) => {
        client.promotion = {
          draftId: client.storedDraft.id,
          operationId: 'promote-complete',
          state: 'output-ready',
          targetPath,
          targetHash: 'production-hash',
          validationHash: 'production-hash',
          error: 'promotion completion in progress',
        };
      },
    );
    await vi.waitFor(() => {
      completion.tick();
      expect(completion.client.completePromote).toHaveBeenCalledOnce();
      expect(readDraftPhase(completion.client.storedDraft))
        .toBe('production');
    });
  });

  it('surfaces a durable pending proposal after reload and lets Martin retry settlement', async () => {
    const studio = await mountStudio(studioDraft(), (client) => {
      client.pendingNarrationProposals = [{
        draftId: 'draft-1',
        operationId: 'orphaned-proposal-op',
        state: 'pending',
        createdAt: '2026-07-24T13:00:00.000Z',
        resolvedAt: null,
        acceptedRevisionPresent: false,
      }];
    });
    const panel = studio.root.querySelector('app-production-panel');
    const editorElement = studio.root.querySelector('app-editor-host');
    const editor = editorElement
      ? getDebugNode(editorElement)?.componentInstance as EditorHost
      : null;
    expect(editor).not.toBeNull();
    const clearSettlementError = vi.spyOn(
      editor!,
      'clearProposalSettlementError',
    );
    const recovery = await waitForElement(
      studio,
      '[data-testid="proposal-recovery"]',
    );
    expect(recovery.textContent).toContain('orphaned-proposal-op');

    findButton(panel, 'Reject durable proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'orphaned-proposal-op',
        decision: 'rejected',
      });
      expect(clearSettlementError).toHaveBeenCalledOnce();
      expect(studio.root.querySelector(
        '[data-testid="proposal-recovery"]',
      )).toBeNull();
    });
  });

  it('gates Promote completion on pinned exact-hash validator diagnostics', async () => {
    const studio = await mountStudio(productionDraft());
    const panel = studio.root.querySelector('app-production-panel')!;
    studio.client.validatorResults.push(
      {
        ok: false,
        errors: [{
          message: 'Personal input must be completed.',
          line: 24,
        }],
        path: 'whp-youtube/episodes/01-composition-net.md',
        hash: 'production-hash',
      },
      {
        ok: true,
        errors: [],
        path: 'whp-youtube/episodes/01-composition-net.md',
        hash: 'production-hash',
      },
    );

    findButton(panel, 'Approve complete narration').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.approveNarration).toHaveBeenCalledOnce();
      expect(readDraftPhase(studio.client.storedDraft)).toBe(
        'creative-approved',
      );
    });
    const target = panel.querySelector<HTMLInputElement>(
      'input[aria-label="Production target"]',
    )!;
    target.value = 'whp-youtube/episodes/01-composition-net.md';
    target.dispatchEvent(new Event('input', { bubbles: true }));
    studio.tick();
    findButton(panel, 'Promote to Phase 2').click();
    await expectDraftSubmission(studio, 'promote', 1);
    studio.client.resolve('op-1', {
      kind: 'raw',
      markdown: 'Promotion output written.',
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain('validation-required');
      expect(readDraftPhase(studio.client.storedDraft))
        .toBe('creative-approved');
    });

    findButton(panel, 'Run validator').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain('FAIL');
      expect(panel.textContent).toContain('1 diagnostic');
      expect(panel.textContent).toContain('Line 24');
      expect(panel.textContent).toContain(
        'Personal input must be completed.',
      );
    });
    expect(readDraftReadiness(studio.client.storedDraft))
      .toBe('EDITORIAL-DRAFT');
    expect(findButton(panel, 'Complete Promote').disabled).toBe(true);

    const metadata = studio.client.storedDraft.doc['metadata'];
    studio.client.storedDraft.doc = {
      ...parseProductionFixture(true),
      metadata,
    };
    findButton(panel, 'Re-run validator').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain('PASS');
      expect(panel.textContent).toContain('COMPLETED');
      expect(findButton(panel, 'Complete Promote').disabled).toBe(false);
    });
    expect(readDraftPhase(studio.client.storedDraft))
      .toBe('creative-approved');
    expect(readDraftReadiness(studio.client.storedDraft))
      .toBe('EDITORIAL-DRAFT');

    await replaceRenderedText(
      studio,
      'Opening narration.',
      'Edited after validator pass.',
    );
    studio.tick();
    expect(panel.textContent).toContain('STALE');
    expect(findButton(panel, 'Complete Promote').disabled).toBe(true);
    findButton(panel, 'Re-run validator').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain('PASS');
      expect(findButton(panel, 'Complete Promote').disabled).toBe(false);
    });

    findButton(panel, 'Complete Promote').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain('complete');
      expect(readDraftPhase(studio.client.storedDraft)).toBe('production');
      expect(studio.client.pipelineMilestones).toContain('production');
    });
    expect(readDraftReadiness(studio.client.storedDraft))
      .toBe('EDITORIAL-DRAFT');
    expect(studio.client.productionSyncs).toHaveLength(3);
    expect(studio.client.productionSyncs.map(
      ({ expectedRevisionSeq }) => expectedRevisionSeq,
    )).toEqual([2, 2, 3]);
  });

  it('integrates Phase-2 cards, clean narration, and PI proposals on the routed draft page', async () => {
    const studio = await mountStudio(productionDraft());
    const panel = studio.root.querySelector('app-production-panel');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('Script metadata');
    expect(panel?.textContent).toContain('Beat 01 — Opening');
    expect(panel?.textContent).toContain('Unrecognized production note');

    const cards = panel!.querySelectorAll<HTMLDetailsElement>(
      '[data-testid="production-card"]',
    );
    expect(cards.length).toBeGreaterThan(2);
    cards[1]!.open = false;
    cards[1]!.dispatchEvent(new Event('toggle'));
    studio.tick();
    expect(cards[1]!.open).toBe(false);
    cards[1]!.open = true;
    cards[1]!.dispatchEvent(new Event('toggle'));
    studio.tick();
    expect(cards[1]!.open).toBe(true);

    const editorElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    )!;
    const editor = getDebugNode(editorElement)?.componentInstance as EditorHost;
    const beforeToggle = editor.currentMarkdown();
    const cleanToggle = panel!.querySelector<HTMLInputElement>(
      'input[aria-label="Clean narration"]',
    )!;
    cleanToggle.click();
    studio.tick();
    expect(editorElement.querySelector('.editor')?.classList)
      .toContain('clean-narration');
    cleanToggle.click();
    studio.tick();
    expect(editor.currentMarkdown()).toBe(beforeToggle);

    const response = panel!.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Response for PI-001"]',
    )!;
    response.value = 'I noticed it while teaching a friend.';
    response.dispatchEvent(new Event('input', { bubbles: true }));
    studio.tick();
    findButton(panel, 'Integrate supplied response').click();
    await expectDraftSubmission(studio, 'rewrite-selection', 1);
    expect(studio.client.draftSubmissions.at(-1)?.inputs).toEqual({
      topic_brief: {
        topic: 'Why constraints create play',
        factual_anchors: ['Players accept the rule.'],
        unknowns: ['Which example survives?'],
      },
      approved_lessons: ['Keep it concrete.'],
      selection: '<!-- PI-001: Martin input -->',
      surrounding_context: {
        before: 'Opening narration.',
        after: 'Closing narration.',
      },
      beat_title: '1. Opening',
      narrative_job: '',
      creative_status: {
        phase: 'creative-approved',
        readiness: 'EDITORIAL-DRAFT',
      },
      requested_scope: {
        kind: 'personal-input',
        personal_input_id: 'PI-001',
      },
      supplied_personal_input: 'I noticed it while teaching a friend.',
      personal_input_block: expect.stringContaining(
        '- **Decision:** INPUT-REQUESTED',
      ),
    });
    studio.client.resolve('op-1', rewriteResult(
      'Martin supplied first paragraph.\n\n'
        + 'Martin supplied **exact** second paragraph.',
    ));
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain(
        'Martin supplied first paragraph.',
      );
    });
    findButton(panel, 'Reject proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-1',
        decision: 'rejected',
      });
    });
    expect(editor.currentMarkdown()).toContain(
      '<!-- PI-001: Martin input -->',
    );
    expect(editor.currentMarkdown()).toContain(
      '- **Decision:** INPUT-REQUESTED',
    );

    findButton(panel, 'Integrate supplied response').click();
    await expectDraftSubmission(studio, 'rewrite-selection', 2);
    studio.client.resolve('op-2', rewriteResult(
      'Martin supplied first paragraph.\n\n'
        + 'Martin supplied **exact** second paragraph.',
    ));
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain(
        'Martin supplied first paragraph.',
      );
    });
    findButton(panel, 'Accept proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editor.currentMarkdown()).toContain(
        '> Opening narration. Martin supplied first paragraph.\n\n'
          + '> Martin supplied **exact** second paragraph. Closing narration.',
      );
      expect(editor.currentMarkdown()).not.toContain(
        '<!-- PI-001: Martin input -->',
      );
      expect(editor.currentMarkdown()).toContain(
        '- **Decision:** COMPLETED',
      );
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-2',
        decision: 'accepted',
      });
    });
    expect(editor.undoPersonalInputAcceptance()).toBe(true);
    studio.tick();
    expect(editor.currentMarkdown()).toContain(
      '<!-- PI-001: Martin input -->',
    );
    expect(editor.currentMarkdown()).toContain(
      '- **Decision:** INPUT-REQUESTED',
    );
  });

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
    await vi.waitFor(() => {
      studio.tick();
      expect(findButton(narrationActions, 'Generate episode').disabled)
        .toBe(false);
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-4',
        decision: 'rejected',
      });
    });
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
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-5',
        decision: 'accepted',
      });
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
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-1',
        decision: 'accepted',
      });
    });

    await selectText(studio, 'failure target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-2.');
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
    await expectEmbeddedConsole(studio, 'Working on op-3.');
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
    await expectEmbeddedConsole(studio, 'Working on op-4.');
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
    await expectEmbeddedConsole(studio, 'Working on op-5.');
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

    expect(
      Array.from(
        studio.root.querySelectorAll<HTMLButtonElement>(
          'app-brief-panel button',
        ),
      ).some((button) => button.textContent?.trim() === 'Promote'),
    ).toBe(false);

    await selectText(studio, 'reroll target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-6.');
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
    await expectEmbeddedConsole(studio, 'Working on op-1.');
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
  configureClient: (client: ControllableDaemonClient) => void =
    () => {},
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
    hydrateSignalInputs(ProductionPanel, [
      'draft',
      'client',
      'editor',
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
  configureClient(client);
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
    expect(Array.from(studio.root.querySelectorAll(
      '[data-testid="console-operation"]',
    )).some((entry) => entry.textContent?.includes(text))).toBe(true);
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

function productionDraft(): DraftRecord {
  const draft = studioDraft();
  draft.format = 'narration';
  draft.doc = {
    ...parseProductionFixture(),
    metadata: {
      topic: 'Why constraints create play',
      anchors: ['Players accept the rule.'],
      unknowns: ['Which example survives?'],
      approvedLessons: ['Keep it concrete.'],
      creativeStatus: {
        phase: 'creative-approved',
        readiness: 'EDITORIAL-DRAFT',
      },
      directionApproved: false,
    },
  };
  return draft;
}

function parseProductionFixture(
  personalInputCompleted = false,
): DraftDocument {
  const markdown = [
    '# Production fixture',
    '',
    '## 1. Opening',
    '',
    '> Opening narration.',
    ...(personalInputCompleted
      ? ['> Martin supplied exact narration.']
      : ['> <!-- PI-001: Martin input -->']),
    '> Closing narration.',
    '',
    '## Appendix',
    '',
    '### Script metadata',
    '',
    '- **Status:** RESEARCH-DRAFT',
    '- **Title:** Production fixture',
    '',
    '### Beat 01 — Opening',
    '',
    '- **Time:** 00:00–00:30',
    '',
    '#### Story function',
    '',
    'Open the question.',
    '',
    '#### Personal input',
    '',
    '- **ID:** PI-001',
    `- **Decision:** ${
      personalInputCompleted ? 'COMPLETED' : 'INPUT-REQUESTED'
    }`,
    '- **Story purpose:** Ground the question in a truthful moment.',
    '- **Primary prompt:** What exact moment changed your view?',
    '- **Follow-up prompts:** What did you see; what did you assume?',
    '- **Bridge in:** Exact stored bridge in.',
    '- **Bridge out:** Exact stored bridge out.',
    '- **Personal visuals:** Exact stored visual note.',
    '- **Omit when:** Exact stored omit condition.',
    '',
    '#### Viewer application',
    '',
    '- **Insight:** A bounded insight.',
    '',
    '### Editorial audit',
    '',
    '- Exact audit text.',
    '',
    '### References and source materials',
    '',
    '#### Evidence references',
    '',
    '##### F-001 — Source',
    '',
    '- **Status:** VERIFIED',
    '',
    '### Unrecognized production note',
    '',
    'Preserve this unknown section exactly.',
  ].join('\n');
  return parseMarkdown(markdown).toJSON() as DraftDocument;
}

function setDraftPhase(draft: DraftRecord, phase: string): void {
  const metadata = draft.doc['metadata'] as Record<string, unknown>;
  metadata['creativeStatus'] = {
    ...metadata['creativeStatus'] as Record<string, unknown>,
    phase,
  };
}

function readDraftPhase(draft: DraftRecord): unknown {
  return ((draft.doc['metadata'] as Record<string, unknown>)
    ['creativeStatus'] as Record<string, unknown>)['phase'];
}

function readDraftReadiness(draft: DraftRecord): unknown {
  return ((draft.doc['metadata'] as Record<string, unknown>)
    ['creativeStatus'] as Record<string, unknown>)['readiness'];
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
