import type {
  EditorState,
  EditorView,
} from '@whp/script-creator-editor-core';
import type {
  DaemonClient,
  DraftDocument,
} from '../api/client';
import type { OperationContext } from '../ops/context';
import { OpTracker } from '../ops/tracker';
import { readDraftMetadata } from '../panels/brief-panel';
import {
  ProposalBridge,
  type BridgeLaunch,
  type FindingLayer,
  type GuardrailCallout,
  type ProposalLaunchMeta,
  type SelectionTarget,
} from './proposal-bridge';
import { SelectionToolbar } from './selection-toolbar';

const DEFAULT_REQUESTED_SCOPE = 'Change only the selected passage.';

export interface SelectionSnapshot {
  visible: boolean;
  target: SelectionTarget | null;
  context: OperationContext | null;
}

export function selectionSnapshot(
  state: EditorState,
  draftDocument: DraftDocument,
  requestedScope = DEFAULT_REQUESTED_SCOPE,
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
      requestedScope,
    },
  };
}

export interface SelectionRuntimeOutcomes {
  findings: readonly FindingLayer[];
  guardrails: readonly GuardrailCallout[];
}

export interface SelectionRuntimeOptions {
  view: EditorView;
  container: HTMLElement;
  client: DaemonClient;
  draftDocument(): DraftDocument;
  onOutcomes?: (outcomes: SelectionRuntimeOutcomes) => void;
  onLaunch?: () => void;
  onError?: (error: unknown) => void;
}

export class SelectionRuntime {
  readonly toolbar: SelectionToolbar;

  private readonly bridge: ProposalBridge;
  private readonly onOutcomes:
    (outcomes: SelectionRuntimeOutcomes) => void;
  private readonly onLaunch: () => void;
  private readonly onError: (error: unknown) => void;
  private destroyed = false;

  constructor(options: SelectionRuntimeOptions) {
    this.onOutcomes = options.onOutcomes ?? (() => undefined);
    this.onLaunch = options.onLaunch ?? (() => undefined);
    this.onError = options.onError ?? (() => undefined);
    const tracker = new OpTracker<ProposalLaunchMeta, unknown>(
      options.client,
      () => [],
    );
    this.bridge = new ProposalBridge(options.view, tracker, {
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
  }

  handleEditorDispatch(): void {
    this.toolbar.update();
    this.emitOutcomes();
  }

  destroy(): void {
    this.destroyed = true;
    this.toolbar.destroy();
  }

  private monitor(value: unknown): void {
    this.onLaunch();
    if (!isBridgeLaunch(value)) return;
    void value.settled.then(
      (settlement) => {
        if (this.destroyed) return;
        this.emitOutcomes();
        if (settlement.status === 'failed') {
          this.onError(new Error(settlement.error));
        }
      },
      (error: unknown) => {
        if (!this.destroyed) this.onError(error);
      },
    );
  }

  private emitOutcomes(): void {
    this.onOutcomes({
      findings: this.bridge.findingLayers(),
      guardrails: this.bridge.guardrails(),
    });
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
