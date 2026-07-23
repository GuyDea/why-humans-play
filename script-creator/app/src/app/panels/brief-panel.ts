import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type {
  DraftDocument,
  DraftRecord,
  OperationName,
  SaveDraftInput,
  SavedDraft,
} from '../api/client';
import type { TrackedOperation } from '../ops/tracker';
import type { StudioConsoleEntry } from './agent-console';

export interface CreativeStatus {
  phase: string;
  [key: string]: unknown;
}

export interface ScriptDraftMetadata {
  topic: string;
  anchors: string[];
  unknowns: string[];
  approvedLessons: string[];
  creativeStatus: CreativeStatus;
  directionApproved: boolean;
}

export interface DraftEnvelopeContext<RequestedScope = unknown> {
  selection: string;
  before: string;
  after: string;
  beatTitle: string;
  narrativeJob: string;
  requestedScope: RequestedScope;
}

export interface DraftEnvelopeInputs<RequestedScope = unknown> {
  topic_brief: {
    topic: string;
    factual_anchors: string[];
    unknowns: string[];
  };
  approved_lessons: string[];
  selection: string;
  surrounding_context: {
    before: string;
    after: string;
  };
  beat_title: string;
  narrative_job: string;
  creative_status: CreativeStatus;
  requested_scope: RequestedScope;
}

export interface BriefPanelSaver {
  save(id: string, input: SaveDraftInput): Promise<SavedDraft>;
}

export interface PromotionMeta {
  operation: 'promote';
  draftId: string;
}

export interface PromotionLauncher {
  launch(
    operation: OperationName,
    inputs: unknown,
    meta: PromotionMeta,
  ): TrackedOperation<PromotionMeta, StudioConsoleEntry>;
}

export interface ApprovalGateOptions {
  onLaunch?: (
    operation: TrackedOperation<PromotionMeta, StudioConsoleEntry>,
  ) => void;
}

const DEFAULT_CREATIVE_PHASE = 'rapid-prototype';

export function readDraftMetadata(
  document: DraftDocument,
): ScriptDraftMetadata {
  const raw = asRecord(document['metadata']);
  const creativeStatus = asRecord(raw?.['creativeStatus']);
  const phase = nonEmptyString(creativeStatus?.['phase'])
    ?? DEFAULT_CREATIVE_PHASE;

  return {
    topic: typeof raw?.['topic'] === 'string' ? raw['topic'] : '',
    anchors: stringItems(raw?.['anchors']),
    unknowns: stringItems(raw?.['unknowns']),
    approvedLessons: stringItems(raw?.['approvedLessons']),
    creativeStatus: {
      ...(creativeStatus ?? {}),
      phase,
    },
    directionApproved: raw?.['directionApproved'] === true,
  };
}

export function withDraftMetadata(
  document: DraftDocument,
  metadata: ScriptDraftMetadata,
): DraftDocument {
  return {
    ...document,
    metadata: cloneMetadata(metadata),
  };
}

export function buildDraftEnvelopeInputs<RequestedScope>(
  context: DraftEnvelopeContext<RequestedScope>,
  metadata: ScriptDraftMetadata,
): DraftEnvelopeInputs<RequestedScope> {
  return {
    topic_brief: {
      topic: metadata.topic,
      factual_anchors: metadata.anchors,
      unknowns: metadata.unknowns,
    },
    approved_lessons: metadata.approvedLessons,
    selection: context.selection,
    surrounding_context: {
      before: context.before,
      after: context.after,
    },
    beat_title: context.beatTitle,
    narrative_job: context.narrativeJob,
    creative_status: metadata.creativeStatus,
    requested_scope: context.requestedScope,
  };
}

export class BriefPanelModel {
  readonly draft: WritableSignal<DraftRecord>;
  readonly metadata: WritableSignal<ScriptDraftMetadata>;
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly canPromote = computed(
    () => this.metadata().directionApproved
      && !this.saving()
      && this.saveError() === null,
  );

  private saveQueue: Promise<void> = Promise.resolve();
  private pendingSaves = 0;

  constructor(
    initialDraft: DraftRecord,
    private readonly saver: BriefPanelSaver,
  ) {
    this.draft = signal<DraftRecord>(initialDraft);
    this.metadata = signal<ScriptDraftMetadata>(
      readDraftMetadata(initialDraft.doc),
    );
  }

  update(
    patch: Partial<ScriptDraftMetadata>,
  ): Promise<void> {
    const next = cloneMetadata({
      ...this.metadata(),
      ...patch,
      creativeStatus: patch.creativeStatus
        ? { ...patch.creativeStatus }
        : this.metadata().creativeStatus,
    });
    this.metadata.set(next);
    this.saveError.set(null);
    const draftId = this.draft().id;
    return this.enqueueSave(draftId, () => ({
      doc: this.draft().doc,
      disposition: 'brief-metadata',
    })).then(
      () => undefined,
      () => undefined,
    );
  }

  setDirectionApproved(approved: boolean): Promise<void> {
    return this.update({ directionApproved: approved });
  }

  save(id: string, input: SaveDraftInput): Promise<SavedDraft> {
    return this.enqueueSave(id, () => input);
  }

  envelopeInputs<RequestedScope>(
    context: DraftEnvelopeContext<RequestedScope>,
  ): DraftEnvelopeInputs<RequestedScope> {
    return buildDraftEnvelopeInputs(context, this.metadata());
  }

  private enqueueSave(
    id: string,
    input: () => SaveDraftInput,
  ): Promise<SavedDraft> {
    this.pendingSaves += 1;
    this.saving.set(true);

    const save = this.saveQueue.then(async () => {
      try {
        const requested = input();
        const saved = await this.saver.save(id, {
          ...requested,
          doc: withDraftMetadata(requested.doc, this.metadata()),
        });
        if (saved.draft.id === this.draft().id) {
          this.draft.set(saved.draft);
        }
        this.saveError.set(null);
        return saved;
      } catch (error) {
        this.saveError.set(errorMessage(error));
        throw error;
      } finally {
        this.pendingSaves -= 1;
        this.saving.set(this.pendingSaves > 0);
      }
    });
    this.saveQueue = save.then(
      () => undefined,
      () => undefined,
    );
    return save;
  }
}

export class ApprovalGate {
  private readonly activeOperationState = signal<
    TrackedOperation<PromotionMeta, StudioConsoleEntry> | null
  >(null);
  readonly activeOperation: Signal<
    TrackedOperation<PromotionMeta, StudioConsoleEntry> | null
  > = this.activeOperationState.asReadonly();
  readonly canPromote = computed(() => {
    if (!this.brief.canPromote()) return false;
    const phase = this.activeOperationState()?.phase();
    return phase !== 'submitting' && phase !== 'streaming';
  });

  private readonly onLaunch: (
    operation: TrackedOperation<PromotionMeta, StudioConsoleEntry>,
  ) => void;

  constructor(
    private readonly brief: BriefPanelModel,
    private readonly launcher: PromotionLauncher,
    private readonly context: () => DraftEnvelopeContext,
    options: ApprovalGateOptions = {},
  ) {
    this.onLaunch = options.onLaunch ?? (() => undefined);
  }

  promote(): TrackedOperation<PromotionMeta, StudioConsoleEntry> | null {
    if (!this.canPromote()) return null;
    const operation = this.launcher.launch(
      'promote',
      this.brief.envelopeInputs(this.context()),
      {
        operation: 'promote',
        draftId: this.brief.draft().id,
      },
    );
    this.activeOperationState.set(operation);
    this.onLaunch(operation);
    return operation;
  }
}

@Component({
  selector: 'app-brief-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" aria-labelledby="brief-heading">
      <header>
        <div>
          <p class="eyebrow">Factual boundary</p>
          <h2 id="brief-heading">Episode brief</h2>
        </div>
        <span [attr.data-phase]="model().metadata().creativeStatus.phase">
          {{ model().metadata().creativeStatus.phase }}
        </span>
      </header>

      <label>
        Topic
        <textarea
          rows="2"
          [value]="model().metadata().topic"
          (change)="setTopic($event)"
        ></textarea>
      </label>

      <label>
        Factual anchors
        <span class="hint">One supplied fact or source link per line.</span>
        <textarea
          rows="5"
          [value]="lines(model().metadata().anchors)"
          (change)="setLines('anchors', $event)"
        ></textarea>
      </label>

      <label>
        Open unknowns
        <span class="hint">Claims the draft must not invent.</span>
        <textarea
          rows="4"
          [value]="lines(model().metadata().unknowns)"
          (change)="setLines('unknowns', $event)"
        ></textarea>
      </label>

      <label>
        Approved lessons
        <span class="hint">Only episode-local lessons already approved.</span>
        <textarea
          rows="4"
          [value]="lines(model().metadata().approvedLessons)"
          (change)="setLines('approvedLessons', $event)"
        ></textarea>
      </label>

      <label>
        Creative phase
        <input
          type="text"
          [value]="model().metadata().creativeStatus.phase"
          (change)="setPhase($event)"
        />
      </label>

      <div class="approval">
        <label class="approval-toggle">
          <input
            type="checkbox"
            [checked]="model().metadata().directionApproved"
            (change)="setApproved($event)"
          />
          <span>Approve premise/voice/hook/story direction</span>
        </label>
        <p>
          Passage approval does not approve the episode direction.
        </p>
      </div>

      @if (model().saving()) {
        <p class="save-status" aria-live="polite">Saving brief…</p>
      } @else if (model().saveError()) {
        <p class="save-error" role="alert">
          Brief not saved — {{ model().saveError() }}
        </p>
      }

      <button
        type="button"
        class="promote"
        [disabled]="!gate().canPromote()"
        (click)="gate().promote()"
      >
        Promote
      </button>

      @if (gate().activeOperation(); as operation) {
        <section class="promote-stream" aria-labelledby="promote-stream-heading">
          <div class="stream-heading">
            <strong id="promote-stream-heading">Promotion console</strong>
            <span>{{ operation.phase() }}</span>
          </div>
          <ol aria-live="polite">
            @for (
              entry of operation.consoleEntries();
              track entry.seq + '-' + $index
            ) {
              <li>
                <span>{{ entry.kind }}</span>
                <pre>{{ entry.text }}</pre>
              </li>
            } @empty {
              <li class="empty">Waiting for the first console event…</li>
            }
          </ol>
        </section>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .panel {
      display: grid;
      gap: 1rem;
      border: 1px solid #d8d2cc;
      background: #f8f8f8;
      padding: 1rem;
    }

    header,
    .stream-heading {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 1rem;
    }

    h2,
    p,
    pre {
      margin: 0;
    }

    h2 {
      color: #323232;
      font-size: 1rem;
    }

    .eyebrow {
      color: #817a74;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    header > span,
    .stream-heading > span {
      color: #706963;
      font-size: 0.68rem;
    }

    label {
      display: grid;
      gap: 0.32rem;
      color: #4e4945;
      font-size: 0.74rem;
      font-weight: 750;
    }

    textarea,
    input[type='text'] {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid #c9c2bb;
      background: #fff;
      padding: 0.55rem;
      color: #323232;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 400;
      line-height: 1.45;
    }

    textarea {
      resize: vertical;
    }

    .hint,
    .approval p,
    .save-status,
    .save-error {
      color: #706963;
      font-size: 0.68rem;
      font-weight: 400;
    }

    .approval {
      display: grid;
      gap: 0.4rem;
      padding: 0.8rem;
      border-left: 3px solid #aa0a0a;
      background: #fff;
    }

    .approval-toggle {
      grid-template-columns: auto minmax(0, 1fr);
      align-items: start;
    }

    .approval-toggle input {
      margin: 0.15rem 0 0;
    }

    .save-error {
      color: #8a1010;
      font-weight: 700;
    }

    .promote {
      justify-self: start;
      border: 1px solid #aa0a0a;
      background: #aa0a0a;
      padding: 0.5rem 0.8rem;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-size: 0.75rem;
      font-weight: 800;
    }

    .promote:disabled {
      cursor: not-allowed;
      opacity: 0.42;
    }

    .promote-stream {
      border: 1px solid #d8d2cc;
      background: #fff;
    }

    .stream-heading {
      padding: 0.65rem;
      border-bottom: 1px solid #d8d2cc;
      font-size: 0.72rem;
    }

    ol {
      max-height: 14rem;
      overflow: auto;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: grid;
      grid-template-columns: 4rem minmax(0, 1fr);
      gap: 0.5rem;
      padding: 0.5rem 0.65rem;
      border-bottom: 1px solid #ece8e4;
    }

    li > span {
      color: #817a74;
      font-size: 0.6rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    pre {
      overflow-wrap: anywhere;
      color: #323232;
      font-family: ui-monospace, monospace;
      font-size: 0.68rem;
      white-space: pre-wrap;
    }

    li.empty {
      display: block;
      color: #706963;
      font-size: 0.7rem;
    }
  `,
})
export class BriefPanel {
  readonly model = input.required<BriefPanelModel>();
  readonly gate = input.required<ApprovalGate>();

  protected lines(values: readonly string[]): string {
    return values.join('\n');
  }

  protected setTopic(event: Event): void {
    const value = controlValue(event);
    if (value !== null) void this.model().update({ topic: value });
  }

  protected setLines(
    field: 'anchors' | 'unknowns' | 'approvedLessons',
    event: Event,
  ): void {
    const value = controlValue(event);
    if (value === null) return;
    void this.model().update({ [field]: splitLines(value) });
  }

  protected setPhase(event: Event): void {
    const phase = controlValue(event)?.trim();
    if (!phase) return;
    void this.model().update({
      creativeStatus: {
        ...this.model().metadata().creativeStatus,
        phase,
      },
    });
  }

  protected setApproved(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    void this.model().setDirectionApproved(target.checked);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function stringItems(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function cloneMetadata(
  metadata: ScriptDraftMetadata,
): ScriptDraftMetadata {
  return {
    topic: metadata.topic,
    anchors: [...metadata.anchors],
    unknowns: [...metadata.unknowns],
    approvedLessons: [...metadata.approvedLessons],
    creativeStatus: { ...metadata.creativeStatus },
    directionApproved: metadata.directionApproved,
  };
}

function controlValue(event: Event): string | null {
  const target = event.target;
  return target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
    ? target.value
    : null;
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'The daemon request failed.';
}
