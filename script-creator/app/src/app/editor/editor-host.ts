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
  signal,
} from '@angular/core';
import {
  corePlugins,
  schema,
  variantNodeViews,
} from '@whp/script-creator-editor-core';
import { EditorState, EditorView } from '@whp/script-creator-editor-core';
import {
  type DaemonClient,
  type DraftDocument,
  type DraftRecord,
  type RevisionRecord,
} from '../api/client';
import {
  computeMetrics,
  type DocumentJson,
} from '../metrics';
import { FindingsPanel } from '../panels/findings-panel';
import { preserveDraftDocument } from './draft-document';
import type { FindingLayer } from './proposal-bridge';
import {
  composeStudio,
  type StudioComposition,
} from './studio-composition';

export class DebouncedAutosave<T> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: T | undefined;
  private hasPending = false;
  private queue: Promise<void> = Promise.resolve();
  private queuedSnapshots = 0;

  constructor(
    private readonly save: (snapshot: T) => Promise<void>,
    private readonly delayMs = 1_000,
    private readonly retryDelayMs = 1_000,
    private readonly onQueueSizeChange: (size: number) => void = () => undefined,
  ) {}

  schedule(snapshot: T): void {
    this.pending = snapshot;
    this.hasPending = true;
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.delayMs);
  }

  flush(): Promise<void> | null {
    this.clearTimer();
    if (!this.hasPending) return null;

    const snapshot = this.pending as T;
    this.pending = undefined;
    this.hasPending = false;
    this.queuedSnapshots += 1;
    this.onQueueSizeChange(this.queuedSnapshots);
    this.queue = this.queue
      .then(() => this.saveUntilSuccessful(snapshot))
      .finally(() => {
        this.queuedSnapshots -= 1;
        this.onQueueSizeChange(this.queuedSnapshots);
      });
    return this.queue;
  }

  async whenIdle(): Promise<void> {
    await this.queue;
  }

  private async saveUntilSuccessful(snapshot: T): Promise<void> {
    for (;;) {
      try {
        await this.save(snapshot);
        return;
      } catch {
        await delay(this.retryDelayMs);
      }
    }
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}

interface AutosaveSnapshot {
  draftId: string;
  doc: DocumentJson;
  version: number;
  epoch: number;
}

@Component({
  selector: 'app-editor-host',
  standalone: true,
  imports: [FindingsPanel],
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

      <div #editorMount class="editor" data-testid="editor"></div>

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

      @if (findings().length > 0) {
        <app-findings-panel [findings]="findings()" />
      }

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

    .operation-error {
      margin: 0;
      border-left: 3px solid var(--whp-accent);
      background: var(--whp-accent-tint);
      padding: 0.7rem 0.8rem;
      color: var(--whp-accent);
      font-size: 0.78rem;
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
  readonly wpm = input(150);

  readonly doc = signal<DocumentJson | null>(null);
  readonly findings = signal<readonly FindingLayer[]>([]);
  readonly operationError = signal<string | null>(null);
  private readonly currentDirty = signal(false);
  private readonly queuedAutosaves = signal(0);
  readonly unsaved = computed(
    () => this.currentDirty() || this.queuedAutosaves() > 0,
  );
  readonly saving = computed(() => this.queuedAutosaves() > 0);
  readonly saveError = signal<string | null>(null);
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
  private studioComposition: StudioComposition | null = null;
  private selectionContextDocument: DraftDocument | null = null;
  private activeDraftId: string | null = null;
  private draftEpoch = 0;
  private editVersion = 0;
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
    }
  }

  ngOnDestroy(): void {
    this.autosave.flush();
    this.draftEpoch += 1;
    this.studioComposition?.destroy();
    this.studioComposition = null;
    this.editorView?.destroy();
    this.editorView = null;
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

  private mountDraft(draft: DraftRecord): void {
    const mount = this.editorMount?.nativeElement;
    const failures = this.failureMount?.nativeElement;
    const guardrails = this.guardrailMount?.nativeElement;
    const consolePanel = this.consoleMount?.nativeElement;
    if (!mount || !failures || !guardrails || !consolePanel) return;

    this.autosave.flush();
    this.studioComposition?.destroy();
    this.studioComposition = null;
    this.editorView?.destroy();
    this.editorView = null;
    mount.replaceChildren();

    const documentNode = schema.nodeFromJSON(draft.doc);
    documentNode.check();
    const state = EditorState.create({
      doc: documentNode,
      plugins: corePlugins(),
    });

    this.activeDraftId = draft.id;
    this.selectionContextDocument = draft.doc;
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
      dispatchTransaction: (transaction) => {
        if (this.editorView !== mountedView || mountedView === null) return;
        const nextState = mountedView.state.apply(transaction);
        mountedView.updateState(nextState);
        const doc = this.persistedDocument(
          nextState.doc.toJSON() as DocumentJson,
        );
        this.doc.set(doc);
        if (transaction.docChanged) this.scheduleAutosave(doc);
        this.studioComposition?.handleEditorDispatch();
      },
    });
    this.editorView = mountedView;
    this.studioComposition = composeStudio(
      mountedView,
      this.client(),
      {
        editor: mount,
        failures,
        guardrails,
        console: consolePanel,
        draftDocument: () => this.selectionContextDocument ?? draft.doc,
        onFindings: (findings) => this.findings.set(findings),
        onLaunch: () => this.operationError.set(null),
        onError: (error) => {
          this.operationError.set(operationErrorMessage(error));
        },
      },
    );
  }

  private scheduleAutosave(doc: DocumentJson): void {
    const draftId = this.activeDraftId;
    if (!draftId) return;

    const version = ++this.editVersion;
    const epoch = this.draftEpoch;
    this.currentDirty.set(true);
    this.autosave.schedule({ draftId, doc, version, epoch });
  }

  private async saveSnapshot(snapshot: AutosaveSnapshot): Promise<void> {
    const { draftId, doc, version, epoch } = snapshot;
    try {
      const saved = await this.client().save(draftId, {
        doc,
        disposition: 'autosave',
      });
      this.saveError.set(null);
      if (this.isCurrentDraft(draftId, epoch)) {
        this.revisions.update((revisions) => [...revisions, saved.revision]);
        this.latestRevision.set(saved.revision);
        if (version === this.editVersion) this.currentDirty.set(false);
      }
    } catch (error) {
      this.saveError.set(saveErrorMessage(error));
      throw error;
    }
  }

  private isCurrentDraft(draftId: string, epoch: number): boolean {
    return this.activeDraftId === draftId && this.draftEpoch === epoch;
  }

  private persistedDocument(document: DocumentJson): DocumentJson {
    const source = this.selectionContextDocument;
    if (!source) return document;
    const persisted = preserveDraftDocument(document, source);
    this.selectionContextDocument = persisted;
    return persisted;
  }
}

function saveErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'save failed';
}

function operationErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'operation failed';
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
