import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  type AfterViewInit,
  type OnChanges,
  type OnDestroy,
  type SimpleChanges,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  corePlugins,
  exportMarkdown,
  pendingProposalIds,
  parseMarkdown,
  schema,
  variantNodeViews,
} from '@whp/script-creator-editor-core';
import { EditorState, EditorView } from '@whp/script-creator-editor-core';
import {
  DaemonClientError,
  type DaemonClient,
  type DraftDocument,
  type DraftRecord,
  type RevisionRecord,
} from '../api/client';
import {
  ArchitectureModel,
  captureRoutedArchitectureConflict,
} from '../architecture/model';
import {
  computeMetrics,
  type DocumentJson,
} from '../metrics';
import {
  ApprovalGate,
  BriefPanelModel,
  type DraftEnvelopeContext,
  type PromotionLauncher,
} from '../panels/brief-panel';
import { ParkingLotModel } from '../panels/parking-lot';
import {
  type StudioRuntimeHandle,
  type StudioSession,
} from '../studio-session';
import { preserveDraftDocument } from './draft-document';
import type { FindingLayer } from './proposal-bridge';
import {
  composeStudio,
  type StudioComposition,
} from './studio-composition';

export class DebouncedAutosave<T> {
  private timer: {
    generation: number;
    handle: ReturnType<typeof setTimeout>;
  } | null = null;
  private pending: {
    generation: number;
    snapshot: T;
  } | null = null;
  private generation = 0;
  private activeGeneration: number | null = null;
  private activePromise: Promise<void> | null = null;
  private retryWait: {
    generation: number;
    timer: ReturnType<typeof setTimeout>;
    resolve: (elapsed: boolean) => void;
  } | null = null;
  private readonly idleResolvers = new Set<() => void>();

  constructor(
    private readonly save: (snapshot: T) => Promise<void>,
    private readonly delayMs = 1_000,
    private readonly initialRetryDelayMs = 1_000,
    private readonly onQueueSizeChange: (size: number) => void = () => undefined,
    private readonly maxRetryDelayMs = 8_000,
    private readonly shouldRetry: (error: unknown) => boolean =
      isRetryableAutosaveError,
  ) {}

  schedule(snapshot: T): void {
    const generation = this.generation + 1;
    this.generation = generation;
    this.pending = { generation, snapshot };
    this.clearTimer();
    const retryGeneration = this.retryWait?.generation;
    if (
      retryGeneration !== undefined
      && retryGeneration !== generation
    ) {
      this.wakeRetry(retryGeneration, false);
    }
    const handle = setTimeout(() => {
      this.flushGeneration(generation, handle);
    }, this.delayMs);
    this.timer = { generation, handle };
  }

  flush(): Promise<void> | null {
    const pending = this.pending;
    if (!pending) return this.activePromise;
    return this.flushGeneration(pending.generation);
  }

  async whenIdle(): Promise<void> {
    if (this.isIdle()) return;
    await new Promise<void>((resolve) => {
      this.idleResolvers.add(resolve);
    });
  }

  cancel(): void {
    this.generation += 1;
    this.clearTimer();
    this.pending = null;
    const retryGeneration = this.retryWait?.generation;
    if (retryGeneration !== undefined) {
      this.wakeRetry(retryGeneration, false);
    }
    this.activeGeneration = null;
    this.activePromise = null;
    this.onQueueSizeChange(0);
    this.resolveIdle();
  }

  private flushGeneration(
    generation: number,
    handle?: ReturnType<typeof setTimeout>,
  ): Promise<void> | null {
    if (
      generation !== this.generation
      || this.pending?.generation !== generation
      || (
        handle !== undefined
        && (
          this.timer?.generation !== generation
          || this.timer.handle !== handle
        )
      )
    ) {
      return this.activePromise;
    }
    this.clearTimer(generation);
    return this.ensureDrain();
  }

  private ensureDrain(): Promise<void> | null {
    if (this.activeGeneration !== null) return this.activePromise;
    const pending = this.pending;
    if (!pending || pending.generation !== this.generation) return null;

    this.pending = null;
    this.clearTimer(pending.generation);
    const { generation, snapshot } = pending;
    this.activeGeneration = generation;
    this.onQueueSizeChange(1);
    const active = this.saveWithRetries(snapshot, generation).finally(() => {
      if (this.activeGeneration !== generation) return;
      this.activeGeneration = null;
      this.activePromise = null;
      if (this.pending) {
        this.ensureDrain();
        return;
      }
      this.onQueueSizeChange(0);
      this.resolveIdle();
    });
    this.activePromise = active;
    return active;
  }

  private async saveWithRetries(
    snapshot: T,
    generation: number,
  ): Promise<void> {
    let retryDelayMs = this.initialRetryDelayMs;
    while (generation === this.generation) {
      try {
        await this.save(snapshot);
        return;
      } catch (error) {
        if (
          generation !== this.generation
          || !this.shouldRetry(error)
        ) {
          return;
        }
        const elapsed = await this.waitForRetry(
          retryDelayMs,
          generation,
        );
        if (!elapsed) return;
        retryDelayMs = Math.min(
          retryDelayMs * 2,
          this.maxRetryDelayMs,
        );
      }
    }
  }

  private waitForRetry(
    milliseconds: number,
    generation: number,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (
          generation !== this.generation
          || this.retryWait?.generation !== generation
          || this.retryWait.timer !== timer
        ) {
          resolve(false);
          return;
        }
        this.retryWait = null;
        resolve(true);
      }, milliseconds);
      this.retryWait = { generation, timer, resolve };
    });
  }

  private wakeRetry(generation: number, elapsed: boolean): void {
    const wait = this.retryWait;
    if (!wait || wait.generation !== generation) return;
    clearTimeout(wait.timer);
    this.retryWait = null;
    wait.resolve(elapsed);
  }

  private clearTimer(generation?: number): void {
    const timer = this.timer;
    if (
      timer === null
      || (
        generation !== undefined
        && timer.generation !== generation
      )
    ) {
      return;
    }
    clearTimeout(timer.handle);
    this.timer = null;
  }

  private isIdle(): boolean {
    return this.timer === null
      && this.pending === null
      && this.activeGeneration === null
      && this.retryWait === null;
  }

  private resolveIdle(): void {
    if (!this.isIdle()) return;
    for (const resolve of this.idleResolvers) resolve();
    this.idleResolvers.clear();
  }
}

export function isRetryableAutosaveError(error: unknown): boolean {
  const status = error instanceof DaemonClientError
    ? error.status
    : error !== null
        && typeof error === 'object'
        && typeof (error as Record<string, unknown>)['status'] === 'number'
      ? (error as Record<string, number>)['status']!
      : null;
  if (status === null) return true;
  return status === 408
    || status === 425
    || status === 429
    || status >= 500;
}

interface AutosaveSnapshot {
  draftId: string;
  doc: DocumentJson;
  version: number;
  epoch: number;
  brief: BriefPanelModel;
  opId: string | null;
  disposition: string;
}

interface SaveProvenance {
  opId: string | null;
  disposition: string;
}

@Component({
  selector: 'app-editor-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="editor-shell">
      <header class="editor-status">
        <span class="format-badge" data-testid="format-badge">{{ format() }}</span>
        <span class="word-count">{{ metrics().totalWords }} words</span>
        @if (unsaved()) {
          <span
            class="unsaved-badge"
            data-testid="unsaved-badge"
            [class.save-failed]="saveError()"
            aria-live="polite"
          >
            @if (saveError()) {
              Unsaved — {{ saveError() }}
            } @else if (saving()) {
              Saving…
            } @else {
              Unsaved
            }
          </span>
        }
      </header>

      @if (narrationBlocked()) {
        <aside
          class="editor-blocked-callout"
          data-testid="editor-blocked-callout"
          role="status"
        >
          <strong>Architecture action paused — resume or resolve first.</strong>
          <span>Narration editing and autosave are blocked.</span>
        </aside>
      }

      <div
        #editorMount
        class="editor"
        data-testid="editor"
        [class.clean-narration]="productionHidden()"
        [class.editor-blocked]="narrationBlocked()"
        [attr.aria-readonly]="narrationBlocked()"
      ></div>

      @if (operationError()) {
        <p class="operation-error" role="alert">
          Selection action failed — {{ operationError() }}
        </p>
      }

      <aside
        #failureMount
        class="operation-failure-callouts"
        aria-label="Operation failures"
      ></aside>

      <aside
        #guardrailMount
        class="guardrail-callouts"
        aria-label="Guardrail callouts"
      ></aside>

      <div #consoleMount class="operation-console-host"></div>

      <aside class="pacing" aria-label="Pacing by beat">
        @for (beat of metrics().beats; track $index; let index = $index) {
          <div
            class="pacing-row"
            [class.over-target]="beat.ratio > 1"
            [attr.data-ratio]="beat.ratio"
          >
            <span class="beat-label">Beat {{ index + 1 }}</span>
            <span class="beat-timing">
              {{ beat.words }} words · {{ durationLabel(beat.estimatedMs) }} /
              {{ durationLabel(beat.targetMs) }}
            </span>
            <span class="pacing-track" aria-hidden="true">
              <span
                class="pacing-fill"
                [style.width.%]="pacingPercent(beat.ratio)"
              ></span>
            </span>
            <span class="ratio-label">{{ ratioLabel(beat.ratio) }}</span>
          </div>
        }
      </aside>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .editor-shell {
      display: grid;
      gap: 0.75rem;
    }

    .editor-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 1.75rem;
    }

    .format-badge,
    .unsaved-badge {
      border-radius: 999px;
      padding: 0.2rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .format-badge {
      background: var(--whp-line-soft);
      color: var(--whp-ink);
      text-transform: uppercase;
    }

    .word-count,
    .beat-timing,
    .ratio-label {
      color: var(--whp-muted);
      font-size: 0.8rem;
    }

    .unsaved-badge {
      margin-inline-start: auto;
      background: var(--whp-warning-tint);
      color: var(--whp-warning);
    }

    .unsaved-badge.save-failed {
      background: var(--whp-accent-tint);
      color: var(--whp-accent);
    }

    .editor {
      position: relative;
      min-height: 24rem;
      border: 1px solid var(--whp-line);
      border-radius: 0.18rem;
      background: var(--whp-surface);
      padding: clamp(1.15rem, 3vw, 2rem);
      box-shadow:
        inset 0 1px 0 var(--whp-ground),
        0 0.3rem 1.1rem color-mix(in srgb, var(--whp-ink) 5%, transparent);
    }

    .editor :where(.ProseMirror) {
      min-height: 21rem;
      outline: none;
    }

    .editor.clean-narration :where(.opaque-section) {
      display: none;
    }

    .operation-error {
      margin: 0;
      border-left: 3px solid var(--whp-accent);
      background: var(--whp-accent-tint);
      padding: 0.7rem 0.8rem;
      color: var(--whp-accent);
      font-size: 0.78rem;
    }

    .editor-blocked-callout {
      display: grid;
      gap: 0.2rem;
      border-left: 3px solid var(--whp-warning);
      background: var(--whp-warning-tint);
      padding: 0.7rem 0.8rem;
      color: var(--whp-warning);
      font-size: 0.78rem;
    }

    .editor.editor-blocked {
      background: var(--whp-panel);
      opacity: 0.78;
    }

    .pacing {
      display: grid;
      gap: 0.5rem;
    }

    .pacing-row {
      display: grid;
      grid-template-columns: minmax(4.5rem, auto) minmax(10rem, 1fr) minmax(7rem, 2fr) 3rem;
      align-items: center;
      gap: 0.65rem;
    }

    .beat-label {
      color: var(--whp-ink);
      font-size: 0.8rem;
      font-weight: 700;
    }

    .pacing-track {
      display: block;
      height: 0.45rem;
      overflow: hidden;
      border-radius: 999px;
      background: var(--whp-line-soft);
    }

    .pacing-fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--whp-ink);
    }

    .over-target .pacing-fill {
      background: var(--whp-accent);
    }

    @media (max-width: 40rem) {
      .pacing-row {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 0.35rem 0.65rem;
      }

      .pacing-track {
        grid-column: 1 / -1;
        grid-row: 2;
      }

      .beat-timing {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ratio-label {
        grid-column: 2;
        grid-row: 1;
      }
    }
  `,
})
export class EditorHost implements AfterViewInit, OnChanges, OnDestroy {
  readonly draft = input.required<DraftRecord>();
  readonly client = input.required<DaemonClient>();
  readonly session = input.required<StudioSession>();
  readonly wpm = input(150);
  readonly narrationBlocked = input(false);
  readonly architectureModel = input<ArchitectureModel | null>(null);
  readonly architectureConflict = output<unknown>();

  readonly doc = signal<DocumentJson | null>(null);
  readonly editorState = signal<EditorState | null>(null);
  readonly findings = signal<readonly FindingLayer[]>([]);
  readonly brief = signal<BriefPanelModel | null>(null);
  readonly approvalGate = signal<ApprovalGate | null>(null);
  readonly parkingLot = new ParkingLotModel(
    this.editorState,
    (transaction) => {
      if (!this.editorView || this.narrationBlocked()) {
        this.editorView?.dispatch(transaction);
        return;
      }
      const before = this.parkingLot.unsettled();
      const remaining = new Set<string>();
      transaction.doc.descendants((node) => {
        if (
          node.type.name === 'variantSet'
          || node.type.name === 'inlineVariantSet'
        ) {
          remaining.add(String(node.attrs['variantId'] ?? ''));
        }
        return true;
      });
      const picked = before.find(
        ({ variantId }) => !remaining.has(variantId),
      );
      if (picked) {
        this.nextSaveProvenance = {
          opId: picked.originOperationId,
          disposition: variantPickedDisposition(
            picked.variantId,
            `alternative:${picked.activeIndex}`,
          ),
        };
      }
      this.editorView?.dispatch(transaction);
    },
  );
  readonly operationError = signal<string | null>(null);
  private readonly currentDirty = signal(false);
  private readonly queuedAutosaves = signal(0);
  readonly unsaved = computed(
    () => this.currentDirty() || this.queuedAutosaves() > 0,
  );
  readonly saving = computed(() => this.queuedAutosaves() > 0);
  readonly saveError = signal<string | null>(null);
  readonly productionHidden = signal(false);
  readonly revisions = signal<RevisionRecord[]>([]);
  readonly latestRevision = signal<RevisionRecord | null>(null);

  readonly format = computed(() => {
    const format = this.doc()?.attrs?.['format'];
    return typeof format === 'string' ? format : 'unknown';
  });
  readonly metrics = computed(() => {
    const doc = this.doc();
    return doc ? computeMetrics(doc, this.wpm()) : { totalWords: 0, beats: [] };
  });

  @ViewChild('editorMount', { static: true })
  private editorMount?: ElementRef<HTMLDivElement>;
  @ViewChild('failureMount', { static: true })
  private failureMount?: ElementRef<HTMLElement>;
  @ViewChild('guardrailMount', { static: true })
  private guardrailMount?: ElementRef<HTMLElement>;
  @ViewChild('consoleMount', { static: true })
  private consoleMount?: ElementRef<HTMLElement>;

  private editorView: EditorView | null = null;
  private applyingAcceptedNarration = false;
  private studioComposition: StudioComposition | null = null;
  private detachRuntime: (() => void) | null = null;
  private selectionContextDocument: DraftDocument | null = null;
  private activeDraftId: string | null = null;
  private draftEpoch = 0;
  private editVersion = 0;
  private applyingPersonalInputChange = false;
  private personalInputUndo: (() => boolean) | null = null;
  private nextSaveProvenance: SaveProvenance | null = null;
  private pendingDirtyProvenances: SaveProvenance[] = [];
  private readonly proposalSettlements = new Set<Promise<void>>();
  private readonly proposalSettlementsByOperation =
    new Map<string, Promise<void>>();
  private readonly pendingAcceptedSettlements = new Set<string>();
  private proposalSettlementError: string | null = null;
  private pendingRerollReason: string | null | undefined;
  private readonly autosave = new DebouncedAutosave<AutosaveSnapshot>(
    (snapshot) => this.saveSnapshot(snapshot),
    1_000,
    1_000,
    (size) => this.queuedAutosaves.set(size),
  );

  ngAfterViewInit(): void {
    this.mountDraft(this.draft());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.editorMount
      && changes['draft']
      && !changes['draft'].firstChange
    ) {
      this.mountDraft(this.draft());
      return;
    }
    if (
      this.editorMount
      && changes['narrationBlocked']
      && !changes['narrationBlocked'].firstChange
    ) {
      this.updateNarrationAvailability();
    }
  }

  ngOnDestroy(): void {
    this.autosave.cancel();
    this.draftEpoch += 1;
    this.detachRuntime?.();
    this.detachRuntime = null;
    this.studioComposition?.destroy();
    this.studioComposition = null;
    this.editorView?.destroy();
    this.editorView = null;
    this.personalInputUndo = null;
    this.editorState.set(null);
  }

  protected pacingPercent(ratio: number): number {
    return Math.min(Math.max(ratio * 100, 0), 100);
  }

  protected ratioLabel(ratio: number): string {
    return `${Math.round(ratio * 100)}%`;
  }

  protected durationLabel(milliseconds: number): string {
    const seconds = Math.round(milliseconds / 1_000);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes > 0
      ? `${minutes}:${remainder.toString().padStart(2, '0')}`
      : `${remainder}s`;
  }

  async replaceNarrationFromMarkdown(
    markdown: string,
    opId: string,
  ): Promise<void> {
    this.requireNarrationWriteAvailable();
    const view = this.editorView;
    const draftId = this.activeDraftId;
    const brief = this.brief();
    if (!view || !draftId || !brief) {
      throw new Error('The narration editor is not ready.');
    }
    const parsed = parseMarkdown(markdown);
    const source = brief.draft().doc;
    const stateBeforeReplacement = view.state;
    const dirtyBeforeReplacement = this.currentDirty();
    const saveErrorBeforeReplacement = this.saveError();
    const preserved = preserveDraftDocument(
      parsed.toJSON() as DocumentJson,
      source,
    );
    const documentNode = schema.nodeFromJSON(preserved);
    documentNode.check();
    let transaction = view.state.tr.replaceWith(
      0,
      view.state.doc.content.size,
      documentNode.content,
    );
    for (const [key, value] of Object.entries(documentNode.attrs)) {
      transaction = transaction.setDocAttribute(key, value);
    }

    this.autosave.cancel();
    this.applyingAcceptedNarration = true;
    try {
      view.dispatch(transaction);
    } finally {
      this.applyingAcceptedNarration = false;
    }
    view.setProps({ editable: () => false });
    try {
      const document = this.doc();
      if (!document) throw new Error('Generated narration could not be parsed.');
      const saved = await brief.save(draftId, {
        doc: document,
        opId,
        disposition: 'episode-generation-accepted',
      });
      this.selectionContextDocument = saved.draft.doc;
      this.doc.set(saved.draft.doc as DocumentJson);
      this.currentDirty.set(false);
      this.saveError.set(null);
      this.revisions.update((revisions) => [...revisions, saved.revision]);
      this.latestRevision.set(saved.revision);
    } catch (error) {
      this.captureArchitectureConflict(error);
      if (this.editorView === view && this.activeDraftId === draftId) {
        this.autosave.cancel();
        view.updateState(stateBeforeReplacement);
        this.editorState.set(stateBeforeReplacement);
        this.selectionContextDocument = source;
        brief.syncDocument(source);
        this.doc.set(source as DocumentJson);
        this.currentDirty.set(dirtyBeforeReplacement);
        this.saveError.set(saveErrorBeforeReplacement);
        if (dirtyBeforeReplacement && !this.narrationBlocked()) {
          this.scheduleAutosave(source as DocumentJson);
        }
      }
      throw error;
    } finally {
      if (this.editorView === view) {
        view.setProps({
          editable: () => !this.narrationBlocked(),
        });
      }
    }
  }

  setCleanNarration(clean: boolean): void {
    this.productionHidden.set(clean);
  }

  refreshFromServer(draft: DraftRecord): void {
    this.mountDraft(draft);
  }

  refreshWorkflowMetadata(draft: DraftRecord): void {
    if (draft.id !== this.activeDraftId) return;
    this.brief()?.refreshWorkflowMetadata(draft);
    const document = this.brief()?.draft().doc;
    if (document) {
      this.selectionContextDocument = document;
      this.doc.set(document as DocumentJson);
    }
  }

  currentMarkdown(): string {
    const view = this.editorView;
    if (!view) return '';
    const result = exportMarkdown(view.state);
    if (!result.ok) {
      throw new Error(`draft export blocked: ${result.blocked.join('; ')}`);
    }
    return result.markdown;
  }

  unresolvedProposalIds(): string[] {
    return this.editorView
      ? pendingProposalIds(this.editorView.state)
      : [];
  }

  clearProposalSettlementError(): void {
    this.proposalSettlementError = null;
    if (this.operationError()?.startsWith('Proposal settlement failed:')) {
      this.operationError.set(null);
    }
  }

  async flushPendingChanges(): Promise<void> {
    await this.autosave.flush();
    await this.autosave.whenIdle();
    await Promise.all(Array.from(this.proposalSettlements));
    if (this.proposalSettlementError) {
      throw new Error(this.proposalSettlementError);
    }
    if (this.unsaved()) {
      throw new Error(
        this.saveError()
          ? `Draft save failed: ${this.saveError()}`
          : 'Draft still has unsaved changes.',
      );
    }
  }

  async freezeForGateAction(): Promise<() => void> {
    const view = this.editorView;
    if (!view) throw new Error('The narration editor is not ready.');
    const previousEditable = view.props.editable;
    view.setProps({ editable: () => false });
    const release = () => {
      if (this.editorView === view) {
        view.setProps({ editable: previousEditable });
      }
    };
    try {
      await this.flushPendingChanges();
      return release;
    } catch (error) {
      release();
      throw error;
    }
  }

  applyPersonalInputProposal(input: {
    opId: string;
    marker: string;
    bodyMd: string;
    replacement: string;
  }): boolean {
    if (this.narrationBlocked()) return false;
    const view = this.editorView;
    if (!view) return false;
    let markerCount = 0;
    let markerParagraphCount = 0;
    let markerParagraphPosition: number | null = null;
    let markerParagraphSize: number | null = null;
    let markerParagraphText: string | null = null;
    let bodyCount = 0;
    let bodyPosition: number | null = null;
    let bodyNode: ReturnType<typeof schema.nodeFromJSON> | null = null;
    view.state.doc.descendants((node, position) => {
      if (node.isText) {
        let from = 0;
        const text = node.text ?? '';
        for (;;) {
          const offset = text.indexOf(input.marker, from);
          if (offset < 0) break;
          markerCount += 1;
          from = offset + input.marker.length;
        }
      }
      if (
        node.type.name === 'paragraph'
        && node.childCount === 1
        && node.firstChild?.isText === true
        && node.textContent.includes(input.marker)
      ) {
        markerParagraphCount += 1;
        markerParagraphPosition = position;
        markerParagraphSize = node.nodeSize;
        markerParagraphText = node.textContent;
      }
      if (
        node.type.name === 'opaqueSection'
        && String(node.attrs.md).trimEnd() === input.bodyMd.trimEnd()
      ) {
        bodyCount += 1;
        bodyPosition = position;
        bodyNode = node;
      }
      return true;
    });
    if (
      markerCount !== 1
      || markerParagraphCount !== 1
      || markerParagraphPosition === null
      || markerParagraphSize === null
      || bodyCount !== 1
      || bodyPosition === null
      || bodyNode === null
    ) {
      return false;
    }
    const replacementTexts = narrationReplacementParagraphs(
      input.replacement,
    );
    if (replacementTexts.length === 0 || markerParagraphText === null) {
      return false;
    }
    const matchedMarkerText =
      markerParagraphText as unknown as string;
    const markerOffset = matchedMarkerText.indexOf(input.marker);
    const beforeMarker = matchedMarkerText.slice(0, markerOffset);
    const afterMarker = matchedMarkerText.slice(
      markerOffset + input.marker.length,
    );
    const replacementParagraphs = replacementTexts.map((text, index) =>
      schema.node(
        'paragraph',
        null,
        schema.text(
          `${index === 0 ? beforeMarker : ''}${text}${
            index === replacementTexts.length - 1 ? afterMarker : ''
          }`,
        ),
      ));
    const bodyAttrs = (
      bodyNode as unknown as { attrs: Record<string, unknown> }
    ).attrs;
    const currentBody = String(bodyAttrs['md']);
    const completedBody = currentBody.replace(
      /^(- \*\*Decision:\*\* )INPUT-REQUESTED$/mu,
      '$1COMPLETED',
    );
    if (completedBody === currentBody) return false;

    let transaction = view.state.tr.replaceWith(
      markerParagraphPosition,
      markerParagraphPosition + markerParagraphSize,
      replacementParagraphs,
    );
    const mappedBodyPosition = transaction.mapping.map(bodyPosition);
    transaction = transaction.setNodeMarkup(
      mappedBodyPosition,
      undefined,
      {
        ...bodyAttrs,
        md: completedBody,
      },
    );
    const inverseSteps = transaction.steps
      .map((step, index) => step.invert(transaction.docs[index]!))
      .reverse();
    this.nextSaveProvenance = {
      opId: input.opId,
      disposition: 'personal-input-proposal-accepted',
    };
    this.applyingPersonalInputChange = true;
    try {
      view.dispatch(transaction);
    } finally {
      this.applyingPersonalInputChange = false;
    }
    this.personalInputUndo = () => {
      if (this.editorView !== view) return false;
      try {
        let inverse = view.state.tr;
        for (const step of inverseSteps) inverse = inverse.step(step);
        this.applyingPersonalInputChange = true;
        try {
          view.dispatch(inverse);
        } finally {
          this.applyingPersonalInputChange = false;
        }
        this.personalInputUndo = null;
        return true;
      } catch {
        this.personalInputUndo = null;
        return false;
      }
    };
    this.settleNarrationProposal(input.opId, 'accepted', true);
    return true;
  }

  undoPersonalInputAcceptance(): boolean {
    return this.personalInputUndo?.() ?? false;
  }

  private mountDraft(draft: DraftRecord): void {
    const mount = this.editorMount?.nativeElement;
    const failures = this.failureMount?.nativeElement;
    const guardrails = this.guardrailMount?.nativeElement;
    const consolePanel = this.consoleMount?.nativeElement;
    if (!mount || !failures || !guardrails || !consolePanel) return;

    this.autosave.cancel();
    this.detachRuntime?.();
    this.detachRuntime = null;
    this.studioComposition?.destroy();
    this.studioComposition = null;
    this.editorView?.destroy();
    this.editorView = null;
    this.personalInputUndo = null;
    this.nextSaveProvenance = null;
    this.pendingDirtyProvenances = [];
    this.pendingAcceptedSettlements.clear();
    this.proposalSettlementError = null;
    this.editorState.set(null);
    mount.replaceChildren();

    const documentNode = schema.nodeFromJSON(draft.doc);
    documentNode.check();
    const state = EditorState.create({
      doc: documentNode,
      plugins: corePlugins(),
    });

    this.activeDraftId = draft.id;
    this.selectionContextDocument = draft.doc;
    const brief = new BriefPanelModel(draft, this.client(), {
      onSaveError: (error) => this.captureArchitectureConflict(error),
    });
    this.brief.set(brief);
    this.approvalGate.set(null);
    this.draftEpoch += 1;
    this.editVersion = 0;
    this.doc.set(this.persistedDocument(documentNode.toJSON() as DocumentJson));
    this.findings.set([]);
    this.operationError.set(null);
    this.currentDirty.set(false);
    if (this.queuedAutosaves() === 0) this.saveError.set(null);
    this.revisions.set([]);
    this.latestRevision.set(null);

    let mountedView: EditorView | null = null;
    mountedView = new EditorView(mount, {
      state,
      nodeViews: variantNodeViews,
      editable: () => !this.narrationBlocked(),
      dispatchTransaction: (transaction) => {
        if (this.editorView !== mountedView || mountedView === null) return;
        if (transaction.docChanged && this.narrationBlocked()) return;
        const nextState = mountedView.state.apply(transaction);
        mountedView.updateState(nextState);
        this.editorState.set(nextState);
        const doc = this.persistedDocument(
          nextState.doc.toJSON() as DocumentJson,
        );
        this.doc.set(doc);
        if (transaction.docChanged && !this.applyingAcceptedNarration) {
          if (!this.applyingPersonalInputChange) {
            this.personalInputUndo = null;
          }
          this.scheduleAutosave(doc);
        }
        this.studioComposition?.handleEditorDispatch();
      },
    });
    this.editorView = mountedView;
    this.updateNarrationAvailability();
    this.editorState.set(mountedView.state);
    const composition = composeStudio(
      mountedView,
      draftScopedClient(
        this.client(),
        draft.id,
        () => {
          const reason = this.pendingRerollReason;
          this.pendingRerollReason = undefined;
          return reason;
        },
      ),
      {
        editor: mount,
        failures,
        guardrails,
        console: consolePanel,
        draftDocument: () =>
          this.brief()?.draft().doc
          ?? this.selectionContextDocument
          ?? draft.doc,
        onFindings: (findings) => this.findings.set(findings),
        onLaunch: () => this.operationError.set(null),
        onError: (error) => {
          this.operationError.set(operationErrorMessage(error));
        },
      },
    );
    this.bindNarrationProposalSettlements(composition, draft.id);
    this.studioComposition = composition;
    this.detachRuntime = this.session().attachRuntime(
      composition.runtime as unknown as StudioRuntimeHandle,
    );
    this.approvalGate.set(new ApprovalGate(
      brief,
      promotionLauncher(composition),
      () => this.promotionContext(),
    ));
  }

  private scheduleAutosave(doc: DocumentJson): void {
    if (this.narrationBlocked()) return;
    const draftId = this.activeDraftId;
    if (!draftId) return;

    const version = ++this.editVersion;
    const epoch = this.draftEpoch;
    const brief = this.brief();
    if (!brief) return;
    if (
      this.nextSaveProvenance
      && !this.pendingDirtyProvenances.some(
        ({ opId, disposition }) =>
          opId === this.nextSaveProvenance?.opId
          && disposition === this.nextSaveProvenance?.disposition,
      )
    ) {
      this.pendingDirtyProvenances.push(this.nextSaveProvenance);
    }
    const provenance = this.pendingDirtyProvenances[0] ?? null;
    this.nextSaveProvenance = null;
    this.currentDirty.set(true);
    this.autosave.schedule({
      draftId,
      doc,
      version,
      epoch,
      brief,
      opId: provenance?.opId ?? null,
      disposition: provenance?.disposition ?? 'autosave',
    });
  }

  private async saveSnapshot(snapshot: AutosaveSnapshot): Promise<void> {
    const {
      draftId,
      doc,
      version,
      epoch,
      brief,
      opId,
      disposition,
    } = snapshot;
    try {
      const saved = await brief.save(draftId, {
        doc,
        opId,
        disposition,
      });
      if (this.isCurrentDraft(draftId, epoch)) {
        let provenanceAdvanced = false;
        this.saveError.set(null);
        this.revisions.update((revisions) => [...revisions, saved.revision]);
        this.latestRevision.set(saved.revision);
        if (version === this.editVersion) this.currentDirty.set(false);
        if (
          this.pendingDirtyProvenances[0]?.opId === opId
          && this.pendingDirtyProvenances[0].disposition === disposition
        ) {
          this.pendingDirtyProvenances.shift();
          provenanceAdvanced = true;
        }
        if (
          provenanceAdvanced
          && (
            this.pendingDirtyProvenances.length > 0
            || version !== this.editVersion
          )
        ) {
          const currentDocument = this.doc();
          if (currentDocument) this.scheduleAutosave(currentDocument);
        }
      }
      if (
        opId
        && isAcceptedProposalDisposition(disposition)
        && this.pendingAcceptedSettlements.has(opId)
        && !this.proposalSettlementsByOperation.has(opId)
      ) {
        void this.settleNarrationProposal(
          opId,
          'accepted',
          false,
          draftId,
        );
      }
    } catch (error) {
      if (this.isCurrentDraft(draftId, epoch)) {
        this.captureArchitectureConflict(error);
        this.saveError.set(saveErrorMessage(error));
      }
      throw error;
    }
  }

  private captureArchitectureConflict(error: unknown): void {
    if (
      captureRoutedArchitectureConflict(this.architectureModel(), error)
    ) {
      this.architectureConflict.emit(error);
    }
  }

  private bindNarrationProposalSettlements(
    composition: StudioComposition,
    draftId: string,
  ): void {
    const runtime = composition.runtime;
    const accept = runtime.acceptProposal.bind(runtime);
    runtime.acceptProposal = (proposalId: string) => {
      if (this.narrationBlocked()) {
        this.operationError.set(
          'Architecture action paused — resume or resolve first.',
        );
        return false;
      }
      const operationId = this.operationIdForProposal(
        composition,
        proposalId,
      );
      if (operationId) {
        this.nextSaveProvenance = {
          opId: operationId,
          disposition: 'selection-proposal-accepted',
        };
      }
      const accepted = accept(proposalId);
      if (!accepted) {
        this.nextSaveProvenance = null;
        return false;
      }
      if (operationId) {
        this.settleNarrationProposal(
          operationId,
          'accepted',
          true,
          draftId,
        );
      }
      return true;
    };

    const reject = runtime.rejectProposal.bind(runtime);
    runtime.rejectProposal = (proposalId: string) => {
      const operationId = this.operationIdForProposal(
        composition,
        proposalId,
      );
      if (operationId) {
        const reason = optionalWhy();
        const settlement = this.settleNarrationProposal(
          operationId,
          'rejected',
          false,
          draftId,
          reason,
        );
        void settlement.then(
          () => {
            if (this.studioComposition === composition) {
              reject(proposalId);
            }
          },
        ).catch((error: unknown) => {
          this.surfaceProposalSettlementFailure(error);
        });
        return true;
      }
      const rejected = reject(proposalId);
      return rejected;
    };

    const rerollProposal = runtime.rerollProposal.bind(runtime);
    runtime.rerollProposal = (proposalId: string) => {
      this.pendingRerollReason = optionalWhy();
      try {
        return rerollProposal(proposalId);
      } finally {
        this.pendingRerollReason = undefined;
      }
    };

    const reroll = runtime.reroll.bind(runtime);
    runtime.reroll = (operationId: string) => {
      this.pendingRerollReason = optionalWhy();
      try {
        return reroll(operationId);
      } finally {
        this.pendingRerollReason = undefined;
      }
    };
  }

  private updateNarrationAvailability(): void {
    const view = this.editorView;
    if (!view) return;
    view.setProps({ editable: () => !this.narrationBlocked() });
    if (this.narrationBlocked()) {
      this.autosave.cancel();
      return;
    }
    const document = this.doc();
    if (this.currentDirty() && document) this.scheduleAutosave(document);
  }

  private requireNarrationWriteAvailable(): void {
    if (this.narrationBlocked()) {
      throw new Error(
        'Architecture action paused — resume or resolve first.',
      );
    }
  }

  private operationIdForProposal(
    composition: StudioComposition,
    proposalId: string,
  ): string | null {
    for (const operation of composition.runtime.tracker.history()) {
      const meta = operation.meta as {
        proposalId?: unknown;
      };
      if (meta.proposalId === proposalId) return operation.id();
    }
    return null;
  }

  private settleNarrationProposal(
    operationId: string,
    decision: 'accepted' | 'rejected',
    waitForSave: boolean,
    draftId = this.activeDraftId,
    reason?: string | null,
  ): Promise<void> {
    if (!draftId) return Promise.resolve();
    if (decision === 'accepted') {
      this.pendingAcceptedSettlements.add(operationId);
    }
    const existing = this.proposalSettlementsByOperation.get(operationId);
    if (existing) return existing;
    const settlement = (async () => {
      if (waitForSave) {
        await this.autosave.flush();
        await this.autosave.whenIdle();
      }
      await this.client().resolveNarrationProposal(
        draftId,
        operationId,
        decision,
        ...(reason === undefined ? [] : [reason]),
      );
      if (decision === 'accepted') {
        this.pendingAcceptedSettlements.delete(operationId);
      }
      this.proposalSettlementError = null;
      if (this.operationError()?.startsWith('Proposal settlement failed:')) {
        this.operationError.set(null);
      }
    })();
    this.proposalSettlements.add(settlement);
    this.proposalSettlementsByOperation.set(operationId, settlement);
    void settlement.catch((error: unknown) => {
      this.surfaceProposalSettlementFailure(error);
    }).finally(() => {
      this.proposalSettlements.delete(settlement);
      if (this.proposalSettlementsByOperation.get(operationId) === settlement) {
        this.proposalSettlementsByOperation.delete(operationId);
      }
    });
    return settlement;
  }

  private surfaceProposalSettlementFailure(error: unknown): void {
    this.proposalSettlementError =
      `Proposal settlement failed: ${operationErrorMessage(error)}`;
    this.operationError.set(this.proposalSettlementError);
  }

  private isCurrentDraft(draftId: string, epoch: number): boolean {
    return this.activeDraftId === draftId && this.draftEpoch === epoch;
  }

  private persistedDocument(document: DocumentJson): DocumentJson {
    const source = this.brief()?.draft().doc
      ?? this.selectionContextDocument;
    if (!source) return document;
    const persisted = preserveDraftDocument(document, source);
    this.selectionContextDocument = persisted;
    this.brief()?.syncDocument(persisted);
    return persisted;
  }

  private promotionContext(): DraftEnvelopeContext<{ kind: 'full-draft' }> {
    const view = this.editorView;
    const draft = this.brief()?.draft() ?? this.draft();
    return {
      selection: view
        ? view.state.doc.textBetween(
            0,
            view.state.doc.content.size,
            '\n\n',
          )
        : '',
      before: '',
      after: '',
      beatTitle: draft.title,
      narrativeJob: '',
      requestedScope: { kind: 'full-draft' },
    };
  }
}

function narrationReplacementParagraphs(markdown: string): string[] {
  const blocks = markdown
    .replace(/\r\n?/gu, '\n')
    .trim()
    .split(/\n\s*\n/gu)
    .filter((block) => block.trim() !== '');
  return blocks.flatMap((block) => {
    const lines = block.split('\n');
    const quoted = lines.every((line) =>
      line === '>' || line.startsWith('> '));
    const text = lines
      .map((line) => quoted ? line.replace(/^> ?/u, '') : line)
      .join(' ')
      .trim();
    return text === '' ? [] : [text];
  });
}

function promotionLauncher(
  composition: StudioComposition,
): PromotionLauncher {
  return {
    launch: (operation, inputs, meta) =>
      composition.runtime.tracker.launch(
        operation,
        inputs,
        meta as never,
      ) as unknown as ReturnType<PromotionLauncher['launch']>,
  };
}

function saveErrorMessage(error: unknown): string {
  if (isArchitectureSagaReservation(error)) {
    return 'Architecture action paused — resume or resolve first. Narration remains unsaved.';
  }
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'save failed';
}

function isArchitectureSagaReservation(error: unknown): boolean {
  if (!(error instanceof DaemonClientError) || error.status !== 409) {
    return false;
  }
  const body = error.body;
  return body !== null
    && typeof body === 'object'
    && (body as Record<string, unknown>)['code'] === 'draft-write-reserved'
    && (body as Record<string, unknown>)['reservation']
      === 'architecture-saga'
    && (body as Record<string, unknown>)['recoverable'] === true;
}

function isAcceptedProposalDisposition(disposition: string): boolean {
  return disposition === 'selection-proposal-accepted'
    || disposition === 'personal-input-proposal-accepted';
}

function operationErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'operation failed';
}

function draftScopedClient(
  client: DaemonClient,
  draftId: string,
  takeRerollReason: () => string | null | undefined,
): DaemonClient {
  return new Proxy(client, {
    get(target, property) {
      if (property === 'submitOp') {
        return (
          operation: Parameters<DaemonClient['submitOp']>[0],
          inputs: unknown,
        ) => target.submitDraftOp(draftId, operation, inputs);
      }
      if (property === 'resume') {
        return (operationId: string, inputs: unknown) => {
          const reason = takeRerollReason();
          return reason === undefined
            ? target.resumeDraftOp(draftId, operationId, inputs)
            : target.resumeDraftOp(draftId, operationId, inputs, reason);
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function'
        ? value.bind(target)
        : value;
    },
  });
}

export function variantPickedDisposition(
  variantSetId: string,
  alternativeId: string,
): string {
  return `variant-picked/${encodeURIComponent(variantSetId)}/${
    encodeURIComponent(alternativeId)
  }`;
}

function optionalWhy(): string | null {
  try {
    const reason = globalThis.prompt('Why? (optional)', '');
    return reason === null || reason === '' ? null : reason;
  } catch {
    return null;
  }
}
