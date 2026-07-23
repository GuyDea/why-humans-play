import type {
  EditorState,
  EditorView,
  Proposal,
} from '@whp/script-creator-editor-core';
import type {
  DaemonClient,
  DraftDocument,
} from '../api/client';
import type { OperationContext } from '../ops/context';
import {
  operationFailurePresentation,
  type OperationFailurePresentation,
} from '../ops/failure-presentation';
import {
  OpTracker,
  type TrackedOperation,
} from '../ops/tracker';
import {
  mapStudioConsoleEvents,
  type StudioConsoleEntry,
} from '../panels/agent-console';
import {
  MISSING_CREATIVE_PHASE_MESSAGE,
  readDraftMetadata,
} from '../panels/brief-panel';
import {
  ProposalBridge,
  type BridgeLaunch,
  type FindingLayer,
  type GuardrailCallout,
  type ProposalLaunchMeta,
  type SelectionTarget,
} from './proposal-bridge';
import { SelectionToolbar } from './selection-toolbar';

export interface SelectionSnapshot {
  visible: boolean;
  target: SelectionTarget | null;
  context: OperationContext | null;
}

export function selectionSnapshot(
  state: EditorState,
  draftDocument: DraftDocument,
): SelectionSnapshot {
  const { empty, from, to } = state.selection;
  if (empty || from >= to) {
    return {
      visible: false,
      target: null,
      context: null,
    };
  }

  const target = { from, to };
  const beat = selectedBeat(state, target);
  const metadata = readDraftMetadata(draftDocument);
  if (metadata.creativeStatus.phase.trim() === '') {
    throw new Error(MISSING_CREATIVE_PHASE_MESSAGE);
  }
  return {
    visible: true,
    target,
    context: {
      selection: state.doc.textBetween(from, to, '\n\n'),
      before: state.doc.textBetween(beat.from, from, '\n\n'),
      after: state.doc.textBetween(to, beat.to, '\n\n'),
      beatTitle: beat.title,
      narrativeJob: draftNarrativeJob(
        draftDocument,
        beat.id,
        beat.title,
      ),
      brief: {
        topic: metadata.topic,
        factual_anchors: metadata.anchors,
        unknowns: metadata.unknowns,
      },
      creativeStatus: metadata.creativeStatus,
      approvedLessons: metadata.approvedLessons,
    },
  };
}

export interface SelectionRuntimeOutcomes {
  findings: readonly FindingLayer[];
  guardrails: readonly GuardrailCallout[];
  failures: readonly OperationFailurePresentation[];
}

export type SelectionRuntimeRecord = TrackedOperation<
  ProposalLaunchMeta,
  StudioConsoleEntry
>;

export interface SelectionRuntimeOptions {
  view: EditorView;
  container: HTMLElement;
  client: DaemonClient;
  draftDocument(): DraftDocument;
  onOutcomes?: (outcomes: SelectionRuntimeOutcomes) => void;
  onRecords?: (
    records: readonly SelectionRuntimeRecord[],
  ) => void;
  onLaunch?: () => void;
  onError?: (error: unknown) => void;
}

export class SelectionRuntime {
  readonly toolbar: SelectionToolbar;
  readonly tracker: OpTracker<ProposalLaunchMeta, StudioConsoleEntry>;

  private readonly bridge: ProposalBridge;
  private readonly onOutcomes:
    (outcomes: SelectionRuntimeOutcomes) => void;
  private readonly onRecords:
    (records: readonly SelectionRuntimeRecord[]) => void;
  private readonly onLaunch: () => void;
  private readonly onError: (error: unknown) => void;
  private readonly launches = new Set<BridgeLaunch>();
  private failures: readonly OperationFailurePresentation[] = [];
  private destroyed = false;

  constructor(options: SelectionRuntimeOptions) {
    this.onOutcomes = options.onOutcomes ?? (() => undefined);
    this.onRecords = options.onRecords ?? (() => undefined);
    this.onLaunch = options.onLaunch ?? (() => undefined);
    this.onError = options.onError ?? (() => undefined);
    this.tracker = new OpTracker<
      ProposalLaunchMeta,
      StudioConsoleEntry
    >(
      options.client,
      mapStudioConsoleEvents,
      { onChange: () => this.emitRecords() },
    );
    this.bridge = new ProposalBridge(options.view, this.tracker, {
      isActive: () => !this.destroyed,
    });
    this.toolbar = new SelectionToolbar({
      view: options.view,
      container: options.container,
      bridge: this.bridge,
      contextForSelection: (target) => {
        const snapshot = selectionSnapshot(
          options.view.state,
          options.draftDocument(),
        );
        if (
          !snapshot.context
          || !snapshot.target
          || snapshot.target.from !== target.from
          || snapshot.target.to !== target.to
        ) {
          throw new Error('the editor selection is no longer available');
        }
        return snapshot.context;
      },
      onLaunch: (launch) => this.monitor(launch),
      onError: this.onError,
    });
    this.emitOutcomes();
    this.emitRecords();
  }

  handleEditorDispatch(): void {
    this.toolbar.update();
    this.emitOutcomes();
  }

  destroy(): void {
    this.destroyed = true;
    this.toolbar.destroy();
  }

  acceptProposal(proposalId: string): boolean {
    return this.bridge.accept(proposalId);
  }

  rejectProposal(proposalId: string): boolean {
    return this.bridge.reject(proposalId);
  }

  proposals(): Proposal[] {
    return this.bridge.proposals();
  }

  canReroll(operationId: string): boolean {
    const launch = this.launchForOperation(operationId);
    return launch ? this.canRerollLaunch(launch) : false;
  }

  reroll(operationId: string): BridgeLaunch {
    const launch = this.launchForOperation(operationId);
    if (!launch || !this.canRerollLaunch(launch)) {
      throw new Error(`operation ${operationId} cannot be re-rolled`);
    }
    return this.monitor(this.bridge.reroll(launch));
  }

  canRerollProposal(proposalId: string): boolean {
    const launch = this.launchForProposal(proposalId);
    return launch ? this.canRerollLaunch(launch) : false;
  }

  rerollProposal(proposalId: string): BridgeLaunch {
    const launch = this.launchForProposal(proposalId);
    if (!launch || !this.canRerollLaunch(launch)) {
      throw new Error(`proposal ${proposalId} cannot be re-rolled`);
    }
    return this.monitor(this.bridge.reroll(launch));
  }

  cancel(operationId: string): Promise<void> {
    return this.tracker.cancel(operationId);
  }

  private monitor(value: unknown): BridgeLaunch {
    this.onLaunch();
    if (!isBridgeLaunch(value)) {
      throw new Error('selection operation did not return a bridge launch');
    }
    this.launches.add(value);
    void value.settled.then(
      (settlement) => {
        if (this.destroyed) return;
        if (settlement.status === 'failed') {
          const result = value.tracked.result();
          const failure = operationFailurePresentation({
            operation: value.tracked.operation,
            phase: value.tracked.phase(),
            state: value.tracked.state(),
            reason: result?.kind === 'failed' ? result.error : null,
            errorMessage: value.tracked.errorMessage(),
          });
          if (failure) {
            this.failures = [...this.failures, failure];
          } else {
            this.onError(new Error(settlement.error));
          }
        }
        this.emitOutcomes();
      },
      (error: unknown) => {
        if (!this.destroyed) this.onError(error);
      },
    );
    return value;
  }

  private emitOutcomes(): void {
    if (this.destroyed) return;
    this.onOutcomes({
      findings: this.bridge.findingLayers(),
      guardrails: this.bridge.guardrails(),
      failures: this.failures,
    });
  }

  private emitRecords(): void {
    if (this.destroyed) return;
    this.onRecords(this.tracker.history());
  }

  private launchForOperation(
    operationId: string,
  ): BridgeLaunch | undefined {
    return Array.from(this.launches).find(
      ({ tracked }) => tracked.id() === operationId,
    );
  }

  private launchForProposal(
    proposalId: string,
  ): BridgeLaunch | undefined {
    return Array.from(this.launches).find(
      (launch) => launch.proposalId === proposalId,
    );
  }

  private canRerollLaunch(launch: BridgeLaunch): boolean {
    return Boolean(
      launch.proposalId
      && launch.tracked.canResume()
      && this.bridge.proposalLayers().some(
        ({ id }) => id === launch.proposalId,
      ),
    );
  }
}

interface SelectedBeat {
  from: number;
  to: number;
  id: string;
  title: string;
}

function selectedBeat(
  state: EditorState,
  target: SelectionTarget,
): SelectedBeat {
  const $from = state.doc.resolve(target.from);
  const $to = state.doc.resolve(target.to);
  for (
    let depth = Math.min($from.depth, $to.depth);
    depth > 0;
    depth -= 1
  ) {
    const node = $from.node(depth);
    if (
      node.type.name !== 'beat'
      || node !== $to.node(depth)
    ) {
      continue;
    }
    return {
      from: $from.start(depth),
      to: $from.end(depth),
      id: stringValue(node.attrs['beatId']),
      title: stringValue(node.attrs['title']),
    };
  }
  return {
    from: 0,
    to: state.doc.content.size,
    id: '',
    title: '',
  };
}

function draftNarrativeJob(
  document: DraftDocument,
  beatId: string,
  beatTitle: string,
): string {
  const content = document['content'];
  const beats = Array.isArray(content)
    ? content
      .map(record)
      .filter((beat): beat is Record<string, unknown> =>
        beat?.['type'] === 'beat')
    : [];
  const metadata = record(document['metadata']);
  const narrativeJobs = record(metadata?.['narrativeJobs']);
  if (beatId !== '') {
    const exact = beats.find((beat) =>
      stringValue(record(beat['attrs'])?.['beatId']) === beatId);
    const direct = beatNarrativeJob(exact);
    return direct !== '' ? direct : stringValue(narrativeJobs?.[beatId]);
  }
  if (beatTitle === '') return '';
  const titleMatches = beats.filter((beat) =>
    stringValue(record(beat['attrs'])?.['title']) === beatTitle);
  return titleMatches.length === 1
    ? beatNarrativeJob(titleMatches[0])
    : '';
}

function beatNarrativeJob(
  beat: Record<string, unknown> | undefined,
): string {
  const attrs = record(beat?.['attrs']);
  return stringValue(
    attrs?.['narrativeJob'] ?? attrs?.['narrative_job'],
  );
}

function isBridgeLaunch(value: unknown): value is BridgeLaunch {
  const launch = record(value);
  return launch?.['settled'] instanceof Promise;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
