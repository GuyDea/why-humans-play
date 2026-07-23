import {
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  acceptProposal,
  addAnnotation,
  getAnnotations,
  getProposals,
  insertBlockVariantSet,
  insertInlineVariantSet,
  receiveProposal,
  rejectProposal,
  requestProposal,
  type EditorView,
  type ProposalStatus,
} from '@whp/script-creator-editor-core';
import type {
  OperationName,
  OperationResult,
} from '../api/client';
import type {
  TrackedOperation,
} from '../ops/tracker';

export type BridgeOperation =
  | 'rewrite'
  | 'reroll'
  | 'alternatives'
  | 'review';

export type BridgeEffect =
  | 'requestProposal'
  | 'launchOperation'
  | 'rejectProposal'
  | 'resumeOperation'
  | 'receiveProposal'
  | 'insertVariantSet'
  | 'addAnnotations'
  | 'showGuardrail';

export type BridgeResultKind = 'schema' | 'guardrail';

export interface BridgeDecisionInput {
  operation: BridgeOperation;
  stage: 'submit' | 'result';
  result?: BridgeResultKind;
}

export function bridgeDecision(
  input: BridgeDecisionInput,
): BridgeEffect[] {
  if (input.stage === 'result' && input.result === 'guardrail') {
    return ['showGuardrail'];
  }

  if (input.stage === 'submit') {
    switch (input.operation) {
      case 'rewrite':
        return ['requestProposal', 'launchOperation'];
      case 'reroll':
        return [
          'rejectProposal',
          'requestProposal',
          'resumeOperation',
        ];
      case 'alternatives':
      case 'review':
        return ['launchOperation'];
    }
  }

  if (input.result !== 'schema') return [];
  switch (input.operation) {
    case 'rewrite':
    case 'reroll':
      return ['receiveProposal'];
    case 'alternatives':
      return ['insertVariantSet'];
    case 'review':
      return ['addAnnotations'];
  }
}

export interface SelectionTarget {
  from: number;
  to: number;
}

export interface ProposalLaunchMeta {
  operation: BridgeOperation;
  target: SelectionTarget;
  proposalId?: string;
  count?: 2 | 3;
}

export interface OperationLauncher {
  launch(
    operation: OperationName,
    inputs: unknown,
    meta: ProposalLaunchMeta,
  ): TrackedOperation<ProposalLaunchMeta>;
  resume(id: string): TrackedOperation<ProposalLaunchMeta>;
}

export interface ProposalLayer {
  id: string;
  from: number;
  to: number;
  status: ProposalStatus;
  base: string;
  current: string | undefined;
  proposed: string | undefined;
}

export type ReviewSeverity = 'blocking' | 'important' | 'optional';

export interface ReviewFinding {
  annotationId: string;
  anchor: string;
  severity: ReviewSeverity;
  findingMarkdown: string;
  optionalDirectionMarkdown: string | null;
  from: number;
  to: number;
}

export interface FindingLayer extends ReviewFinding {
  orphaned: boolean;
}

export interface GuardrailCallout {
  operationId: string | null;
  operation: BridgeOperation;
  markdown: string;
}

export type BridgeSettlement =
  | { status: 'applied' }
  | { status: 'guardrail'; markdown: string }
  | { status: 'failed'; error: string };

interface PendingBridgeLaunch {
  operation: BridgeOperation;
  target: SelectionTarget;
  proposalId?: string;
  tracked: TrackedOperation<ProposalLaunchMeta>;
}

export interface BridgeLaunch extends PendingBridgeLaunch {
  settled: Promise<BridgeSettlement>;
}

export interface ProposalBridgeOptions {
  nextId?: () => string;
  pollMs?: number;
  isActive?: () => boolean;
}

interface AlternativeOption {
  label: string;
  markdown: string;
}

interface ReviewFindingResult {
  anchor: string;
  severity: ReviewSeverity;
  finding_markdown: string;
  optional_direction_markdown: string | null;
}

const TERMINAL_PHASES = new Set([
  'done',
  'failed',
  'guardrail',
  'cancelled',
]);

export class ProposalBridge {
  private idSequence = 0;
  private readonly nextId: () => string;
  private readonly pollMs: number;
  private readonly isActive: () => boolean;
  private readonly findingsState: WritableSignal<readonly ReviewFinding[]> =
    signal([]);
  private readonly guardrailsState:
    WritableSignal<readonly GuardrailCallout[]> = signal([]);

  readonly findings: Signal<readonly ReviewFinding[]> =
    this.findingsState.asReadonly();
  readonly guardrails: Signal<readonly GuardrailCallout[]> =
    this.guardrailsState.asReadonly();

  constructor(
    private readonly view: EditorView,
    private readonly launcher: OperationLauncher,
    options: ProposalBridgeOptions = {},
  ) {
    this.nextId = options.nextId ?? (() => `bridge-${++this.idSequence}`);
    this.pollMs = options.pollMs ?? 10;
    this.isActive = options.isActive ?? (() => true);
  }

  launchRewrite(
    inputs: unknown,
    target: SelectionTarget,
  ): BridgeLaunch {
    const proposalId = this.nextId();
    if (!requestProposal(
      this.view.state,
      (transaction) => this.view.dispatch(transaction),
      { id: proposalId, ...target },
    )) {
      throw new Error('could not request a proposal for the selection');
    }

    let tracked: TrackedOperation<ProposalLaunchMeta>;
    try {
      tracked = this.launcher.launch(
        'rewrite-selection',
        inputs,
        { operation: 'rewrite', target, proposalId },
      );
    } catch (error) {
      rejectProposal(
        this.view.state,
        (transaction) => this.view.dispatch(transaction),
        proposalId,
      );
      throw error;
    }

    return this.bridgeLaunch({
      operation: 'rewrite',
      target,
      proposalId,
      tracked,
    });
  }

  reroll(previous: BridgeLaunch): BridgeLaunch {
    const operationId = previous.tracked.id();
    if (!operationId) {
      throw new Error('cannot reroll before the operation has an id');
    }
    if (!previous.tracked.canResume()) {
      throw new Error(`resume limit exhausted for operation ${operationId}`);
    }
    if (!previous.proposalId) {
      throw new Error('only proposal-backed operations can be rerolled');
    }

    const previousProposal = getProposals(this.view.state)
      .find((proposal) => proposal.id === previous.proposalId);
    if (!previousProposal) {
      throw new Error(`proposal ${previous.proposalId} is no longer active`);
    }
    const target = {
      from: previousProposal.from,
      to: previousProposal.to,
    };
    const proposalId = this.nextId();

    if (!rejectProposal(
      this.view.state,
      (transaction) => this.view.dispatch(transaction),
      previous.proposalId,
    )) {
      throw new Error(`could not reject proposal ${previous.proposalId}`);
    }
    if (!requestProposal(
      this.view.state,
      (transaction) => this.view.dispatch(transaction),
      { id: proposalId, ...target },
    )) {
      throw new Error('could not request a rerolled proposal');
    }

    let tracked: TrackedOperation<ProposalLaunchMeta>;
    try {
      tracked = this.launcher.resume(operationId);
    } catch (error) {
      rejectProposal(
        this.view.state,
        (transaction) => this.view.dispatch(transaction),
        proposalId,
      );
      throw error;
    }

    return this.bridgeLaunch({
      operation: 'reroll',
      target,
      proposalId,
      tracked,
    });
  }

  launchAlternatives(
    inputs: unknown,
    target: SelectionTarget,
    count: 2 | 3,
  ): BridgeLaunch {
    if (count !== 2 && count !== 3) {
      throw new RangeError('alternative count must be 2 or 3');
    }
    const tracked = this.launcher.launch(
      'generate-alternatives',
      inputs,
      { operation: 'alternatives', target, count },
    );
    return this.bridgeLaunch({
      operation: 'alternatives',
      target,
      tracked,
    });
  }

  launchReview(
    inputs: unknown,
    target: SelectionTarget,
  ): BridgeLaunch {
    const tracked = this.launcher.launch(
      'review',
      inputs,
      { operation: 'review', target },
    );
    return this.bridgeLaunch({
      operation: 'review',
      target,
      tracked,
    });
  }

  accept(proposalId: string): boolean {
    return acceptProposal(
      this.view.state,
      (transaction) => this.view.dispatch(transaction),
      proposalId,
    );
  }

  reject(proposalId: string): boolean {
    return rejectProposal(
      this.view.state,
      (transaction) => this.view.dispatch(transaction),
      proposalId,
    );
  }

  proposalLayers(): ProposalLayer[] {
    return getProposals(this.view.state).map((proposal) => ({
      id: proposal.id,
      from: proposal.from,
      to: proposal.to,
      status: proposal.status,
      base: proposal.fingerprint,
      current: proposal.current,
      proposed: proposal.replacement,
    }));
  }

  findingLayers(): FindingLayer[] {
    const annotations = new Map(
      getAnnotations(this.view.state).map((annotation) => [
        annotation.id,
        annotation,
      ]),
    );
    return this.findingsState().map((finding) => {
      const annotation = annotations.get(finding.annotationId);
      return {
        ...finding,
        from: annotation?.from ?? finding.from,
        to: annotation?.to ?? finding.to,
        orphaned: annotation?.orphaned ?? true,
      };
    });
  }

  private bridgeLaunch(
    launch: PendingBridgeLaunch,
  ): BridgeLaunch {
    return {
      ...launch,
      settled: this.settle(launch),
    };
  }

  private async settle(
    launch: PendingBridgeLaunch,
  ): Promise<BridgeSettlement> {
    await this.waitForTerminalPhase(launch.tracked);

    if (!this.isActive()) {
      return {
        status: 'failed',
        error: 'proposal bridge is no longer active',
      };
    }

    if (launch.tracked.phase() === 'guardrail') {
      return this.applyGuardrail(launch);
    }
    if (launch.tracked.phase() !== 'done') {
      this.rejectPendingProposal(launch.proposalId);
      return {
        status: 'failed',
        error: operationError(launch.tracked.result()),
      };
    }

    const result = launch.tracked.result();
    if (result?.kind !== 'schema' || !isRecord(result.value)) {
      this.rejectPendingProposal(launch.proposalId);
      return {
        status: 'failed',
        error: 'operation did not return a schema result',
      };
    }

    switch (launch.operation) {
      case 'rewrite':
      case 'reroll':
        return this.receiveRewrite(launch, result.value);
      case 'alternatives':
        return this.insertAlternatives(launch, result.value);
      case 'review':
        return this.addReviewFindings(launch, result.value);
    }
  }

  private async waitForTerminalPhase(
    tracked: TrackedOperation<ProposalLaunchMeta>,
  ): Promise<void> {
    while (
      this.isActive()
      && !TERMINAL_PHASES.has(tracked.phase())
    ) {
      await delay(this.pollMs);
    }
  }

  private applyGuardrail(
    launch: PendingBridgeLaunch,
  ): BridgeSettlement {
    this.rejectPendingProposal(launch.proposalId);
    const result = launch.tracked.result();
    const markdown = result?.kind === 'schema'
      ? result.guardrail ?? schemaGuardrail(result.value)
      : null;
    if (!markdown) {
      return {
        status: 'failed',
        error: 'guardrail result did not contain guardrail markdown',
      };
    }

    this.guardrailsState.update((guardrails) => [
      ...guardrails,
      {
        operationId: launch.tracked.id(),
        operation: launch.operation,
        markdown,
      },
    ]);
    return { status: 'guardrail', markdown };
  }

  private receiveRewrite(
    launch: PendingBridgeLaunch,
    value: Record<string, unknown>,
  ): BridgeSettlement {
    const replacement = value['replacement_markdown'];
    if (!launch.proposalId || typeof replacement !== 'string') {
      this.rejectPendingProposal(launch.proposalId);
      return {
        status: 'failed',
        error: 'rewrite result did not contain replacement_markdown',
      };
    }

    const received = receiveProposal(
      this.view.state,
      (transaction) => this.view.dispatch(transaction),
      { id: launch.proposalId, replacement },
    );
    return received
      ? { status: 'applied' }
      : {
          status: 'failed',
          error: `proposal ${launch.proposalId} is no longer active`,
        };
  }

  private insertAlternatives(
    launch: PendingBridgeLaunch,
    value: Record<string, unknown>,
  ): BridgeSettlement {
    const options = alternativeOptions(value['options']);
    if (!options || options.length === 0) {
      return {
        status: 'failed',
        error: 'alternatives result did not contain labeled options',
      };
    }

    const inserted = this.insertVariantSet(
      launch.target,
      this.nextId(),
      options,
    );
    return inserted
      ? { status: 'applied' }
      : {
          status: 'failed',
          error: 'could not insert alternatives at the selection',
        };
  }

  private insertVariantSet(
    target: SelectionTarget,
    variantId: string,
    options: AlternativeOption[],
  ): boolean {
    const { doc } = this.view.state;
    if (
      target.from < 0
      || target.from >= target.to
      || target.to > doc.content.size
    ) {
      return false;
    }

    const $from = doc.resolve(target.from);
    const $to = doc.resolve(target.to);
    if ($from.sameParent($to) && $from.parent.isTextblock) {
      return insertInlineVariantSet(
        this.view.state,
        (transaction) => this.view.dispatch(transaction),
        {
          variantId,
          at: target.from,
          options: options.map((option) => ({
            label: option.label,
            text: markdownToPlainText(option.markdown),
          })),
        },
      );
    }

    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const at = $from.after(depth);
      const inserted = insertBlockVariantSet(
        this.view.state,
        (transaction) => this.view.dispatch(transaction),
        {
          variantId,
          at,
          options: options.map((option) => ({
            label: option.label,
            paragraphs: markdownParagraphs(option.markdown),
          })),
        },
      );
      if (inserted) return true;
    }
    return false;
  }

  private addReviewFindings(
    launch: PendingBridgeLaunch,
    value: Record<string, unknown>,
  ): BridgeSettlement {
    const findings = reviewFindings(value['findings']);
    if (!findings) {
      return {
        status: 'failed',
        error: 'review result did not contain findings',
      };
    }

    const added: ReviewFinding[] = [];
    for (const finding of findings) {
      const annotationId = this.nextId();
      const range = locateAnchor(
        this.view,
        launch.target,
        finding.anchor,
      ) ?? launch.target;
      if (addAnnotation(
        this.view.state,
        (transaction) => this.view.dispatch(transaction),
        {
          id: annotationId,
          kind: 'reviewFinding',
          ...range,
          message: finding.finding_markdown,
        },
      )) {
        added.push({
          annotationId,
          anchor: finding.anchor,
          severity: finding.severity,
          findingMarkdown: finding.finding_markdown,
          optionalDirectionMarkdown:
            finding.optional_direction_markdown,
          ...range,
        });
      }
    }
    this.findingsState.update((current) => [...current, ...added]);
    return { status: 'applied' };
  }

  private rejectPendingProposal(proposalId: string | undefined): void {
    if (!proposalId) return;
    rejectProposal(
      this.view.state,
      (transaction) => this.view.dispatch(transaction),
      proposalId,
    );
  }
}

function locateAnchor(
  view: EditorView,
  target: SelectionTarget,
  anchor: string,
): SelectionTarget | undefined {
  if (anchor === '') return undefined;

  let text = '';
  const positions: number[] = [];
  view.state.doc.nodesBetween(target.from, target.to, (node, pos) => {
    if (!node.isText || !node.text) return;
    const segmentFrom = Math.max(target.from, pos);
    const segmentTo = Math.min(target.to, pos + node.nodeSize);
    for (
      let documentPosition = segmentFrom;
      documentPosition < segmentTo;
      documentPosition += 1
    ) {
      const offset = documentPosition - pos;
      text += node.text[offset] ?? '';
      positions.push(documentPosition);
    }
  });

  const index = text.indexOf(anchor);
  const lastPosition = positions[index + anchor.length - 1];
  if (index < 0 || lastPosition === undefined) return undefined;
  return {
    from: positions[index]!,
    to: lastPosition + 1,
  };
}

function alternativeOptions(
  value: unknown,
): AlternativeOption[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const options: AlternativeOption[] = [];
  for (const option of value) {
    if (
      !isRecord(option)
      || typeof option['label'] !== 'string'
      || typeof option['markdown'] !== 'string'
    ) {
      return undefined;
    }
    options.push({
      label: option['label'],
      markdown: option['markdown'],
    });
  }
  return options;
}

function reviewFindings(
  value: unknown,
): ReviewFindingResult[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const findings: ReviewFindingResult[] = [];
  for (const finding of value) {
    if (
      !isRecord(finding)
      || typeof finding['anchor'] !== 'string'
      || !isReviewSeverity(finding['severity'])
      || typeof finding['finding_markdown'] !== 'string'
      || (
        finding['optional_direction_markdown'] !== null
        && typeof finding['optional_direction_markdown'] !== 'string'
      )
    ) {
      return undefined;
    }
    findings.push({
      anchor: finding['anchor'],
      severity: finding['severity'],
      finding_markdown: finding['finding_markdown'],
      optional_direction_markdown:
        finding['optional_direction_markdown'],
    });
  }
  return findings;
}

function markdownParagraphs(markdown: string): string[] {
  const paragraphs = markdown
    .split(/\r?\n\s*\r?\n/)
    .map(markdownToPlainText)
    .filter((paragraph) => paragraph !== '');
  return paragraphs.length > 0 ? paragraphs : [''];
}

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^(?:#{1,6}\s+|>\s?|[-+*]\s+|\d+\.\s+)/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s*\r?\n\s*/g, ' ')
    .trim();
}

function schemaGuardrail(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const markdown = value['guardrail_markdown'];
  return typeof markdown === 'string' ? markdown : null;
}

function operationError(result: OperationResult | null): string {
  return result?.kind === 'failed'
    ? result.error
    : 'operation did not complete';
}

function isReviewSeverity(value: unknown): value is ReviewSeverity {
  return value === 'blocking'
    || value === 'important'
    || value === 'optional';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
