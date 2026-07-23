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
import { EditorState } from '@whp/script-creator-editor-core/node_modules/prosemirror-state';
import { EditorView } from '@whp/script-creator-editor-core/node_modules/prosemirror-view';
import type {
  DraftRecord,
  RevisionRecord,
  SaveDraftInput,
  SavedDraft,
} from '../api/client';
import {
  computeMetrics,
  type DocumentJson,
} from '../metrics';

export interface DraftSaver {
  save(id: string, input: SaveDraftInput): Promise<SavedDraft>;
}

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
      background: #e7e4df;
      color: #323232;
      text-transform: uppercase;
    }

    .word-count,
    .beat-timing,
    .ratio-label {
      color: #66615d;
      font-size: 0.8rem;
    }

    .unsaved-badge {
      margin-inline-start: auto;
      background: #fff0c9;
      color: #6b4a00;
    }

    .unsaved-badge.save-failed {
      background: #f6dada;
      color: #7c0c0c;
    }

    .editor {
      min-height: 24rem;
      border: 1px solid #d7d2cc;
      border-radius: 0.4rem;
      background: #fff;
      padding: 1.5rem;
    }

    .editor :where(.ProseMirror) {
      min-height: 21rem;
      outline: none;
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
      color: #323232;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .pacing-track {
      display: block;
      height: 0.45rem;
      overflow: hidden;
      border-radius: 999px;
      background: #e7e4df;
    }

    .pacing-fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: #4b7562;
    }

    .over-target .pacing-fill {
      background: #aa0a0a;
    }
  `,
})
export class EditorHost implements AfterViewInit, OnChanges, OnDestroy {
  readonly draft = input.required<DraftRecord>();
  readonly client = input.required<DraftSaver>();
  readonly wpm = input(150);

  readonly doc = signal<DocumentJson | null>(null);
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

  private editorView: EditorView | null = null;
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
    if (!mount) return;

    this.autosave.flush();
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
    this.draftEpoch += 1;
    this.editVersion = 0;
    this.doc.set(documentNode.toJSON() as DocumentJson);
    this.currentDirty.set(false);
    if (this.queuedAutosaves() === 0) this.saveError.set(null);
    this.revisions.set([]);
    this.latestRevision.set(null);

    this.editorView = new EditorView(mount, {
      state,
      nodeViews: variantNodeViews,
      dispatchTransaction: (transaction) => {
        const view = this.editorView;
        if (!view) return;
        const nextState = view.state.apply(transaction);
        view.updateState(nextState);
        const doc = nextState.doc.toJSON() as DocumentJson;
        this.doc.set(doc);
        if (transaction.docChanged) this.scheduleAutosave(doc);
      },
    });
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
}

function saveErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'save failed';
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
