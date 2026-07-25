import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type OnDestroy,
  type OnInit,
  signal,
  type Signal,
} from '@angular/core';
import type {
  OperationListResponse,
  OperationRecord,
  OperationState,
  OperationSummary,
  SseFrame,
} from '../api/client';
import type { TrackedOperation } from '../ops/tracker';
import { HelpTargetDirective } from '../help/help-target.directive';

export type StudioConsoleKind =
  | 'thread'
  | 'turn'
  | 'message'
  | 'tool'
  | 'warning'
  | 'failure'
  | 'other';

export interface StudioConsoleEntry {
  seq: number;
  kind: StudioConsoleKind;
  text: string;
}

export interface AgentConsoleTracker<Meta = unknown> {
  readonly history: Signal<
    readonly TrackedOperation<Meta, StudioConsoleEntry>[]
  >;
  cancel(id: string): Promise<void>;
  resume(id: string): TrackedOperation<Meta, StudioConsoleEntry>;
  canResume?(id: string): boolean;
}

export interface AgentConsoleClient {
  listOps(): Promise<OperationListResponse>;
  getOp?(id: string): Promise<OperationRecord>;
  cancel(id: string): Promise<unknown>;
}

interface SuppliedLessonRow {
  markdown: string;
  lessonId: string | null;
  lessonVersion: number | null;
  contentHash: string | null;
}

export class AgentConsoleModel<Meta = unknown> {
  readonly operations: Signal<
    readonly TrackedOperation<Meta, StudioConsoleEntry>[]
  >;
  private readonly selectedState =
    signal<TrackedOperation<Meta, StudioConsoleEntry> | null>(null);
  readonly selected = computed(() =>
    this.selectedState()
      ?? this.operations().at(-1)
      ?? null);

  constructor(
    private readonly tracker: AgentConsoleTracker<Meta>,
  ) {
    this.operations = tracker.history;
  }

  selectOperation(
    operation: TrackedOperation<Meta, StudioConsoleEntry>,
  ): void {
    this.selectedState.set(operation);
  }

  canCancel(
    operation: TrackedOperation<Meta, StudioConsoleEntry> | null =
      this.selected(),
  ): boolean {
    if (!operation?.id()) return false;
    return operation.phase() === 'submitting'
      || operation.phase() === 'streaming';
  }

  async cancelSelected(): Promise<boolean> {
    const operation = this.selected();
    const id = operation?.id();
    if (!operation || !id || !this.canCancel(operation)) return false;
    await this.tracker.cancel(id);
    return true;
  }

  canResume(
    operation: TrackedOperation<Meta, StudioConsoleEntry> | null =
      this.selected(),
  ): boolean {
    const id = operation?.id();
    if (!operation || !id || !operation.canResume()) return false;
    return this.tracker.canResume?.(id) ?? true;
  }

  resumeSelected(): TrackedOperation<Meta, StudioConsoleEntry> | null {
    const operation = this.selected();
    const id = operation?.id();
    if (!operation || !id || !this.canResume(operation)) return null;
    const resumed = this.tracker.resume(id);
    this.selectOperation(resumed);
    return resumed;
  }
}

export function mapStudioConsoleEvents(
  events: readonly SseFrame[],
): StudioConsoleEntry[] {
  return events.map((event, index) => {
    const payload = eventPayload(event);
    const type = stringValue(payload?.['type']) || event.event;
    const item = record(payload?.['item']);
    const itemType = stringValue(item?.['type']);
    const message = stringValue(
      item?.['text']
      ?? item?.['message']
      ?? payload?.['message']
      ?? payload?.['error'],
    );

    return {
      seq: sequenceNumber(event.id, index),
      kind: consoleKind(type, itemType),
      text: message || consoleFallback(type, itemType, event.data),
    };
  });
}

export function formatTokens(tokens: number | null): string {
  return tokens === null ? 'unavailable' : tokens.toLocaleString('en-US');
}

export function formatElapsed(milliseconds: number | null): string {
  if (milliseconds === null) return 'unavailable';
  const seconds = Math.round(milliseconds / 1_000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0
    ? `${minutes}m ${remainder}s`
    : `${remainder}s`;
}

function consoleKind(
  type: string,
  itemType: string,
): StudioConsoleKind {
  if (type === 'thread.started') return 'thread';
  if (type.startsWith('turn.')) {
    return type.includes('failed') || type.includes('error')
      ? 'failure'
      : 'turn';
  }
  if (itemType === 'agent_message') return 'message';
  if (
    itemType.includes('tool')
    || itemType.includes('command')
    || itemType === 'web_search'
  ) {
    return 'tool';
  }
  if (
    type.includes('failed')
    || type.includes('error')
    || itemType.includes('error')
  ) {
    return 'failure';
  }
  if (type.includes('warning')) return 'warning';
  return 'other';
}

function consoleFallback(
  type: string,
  itemType: string,
  raw: string,
): string {
  if (itemType !== '') return `${type} · ${itemType}`;
  if (type !== '') return type;
  return raw;
}

function eventPayload(
  event: SseFrame,
): Record<string, unknown> | null {
  try {
    return record(JSON.parse(event.data));
  } catch {
    return null;
  }
}

function sequenceNumber(value: string, index: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : index + 1;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

@Component({
  selector: 'app-agent-console',
  standalone: true,
  imports: [HelpTargetDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel studio-panel" aria-labelledby="agent-console-heading">
      <header>
        <div>
          <p class="eyebrow">Operations</p>
          <h2 id="agent-console-heading">Agent console</h2>
        </div>
        <span class="count">{{ operations().length }}</span>
      </header>

      @if (loadError()) {
        <p class="load-error" role="alert">{{ loadError() }}</p>
      }

      <div class="console-layout">
        <nav aria-label="Operation history" appHelpTarget="console.list">
          @for (
            operation of operations();
            track operation.id
          ) {
            <button
              type="button"
              [class.active]="isSelected(operation)"
              (click)="selectOperation(operation)"
            >
              <strong>{{ operation.operation }}</strong>
              <span>{{ operation.id }}</span>
              <small [attr.data-state]="operation.state">
                {{ operation.state }}
              </small>
            </button>
          } @empty {
            <p class="empty">No durable operations recorded yet.</p>
          }
        </nav>

        @if (selected(); as operation) {
          <div class="stream" appHelpTarget="console.detail">
            <div class="telemetry" aria-label="Operation telemetry">
              <span>
                Input
                <strong>{{ tokenLabel(operation.inputTokens) }}</strong>
              </span>
              <span>
                Cached input
                <strong>{{ tokenLabel(operation.cachedInputTokens) }}</strong>
              </span>
              <span>
                Output
                <strong>{{ tokenLabel(operation.outputTokens) }}</strong>
              </span>
              <span>
                Reasoning
                <strong>{{ tokenLabel(operation.reasoningOutputTokens) }}</strong>
              </span>
              <span>
                Usage
                <strong>
                  {{ operation.usageAvailable ? 'reported' : 'unavailable' }}
                </strong>
              </span>
              @if (operation.stalled) {
                <span class="stalled" role="status">Stalled</span>
              }
            </div>

            <section
              class="supplied-lessons"
              aria-labelledby="supplied-lessons-heading"
            >
              <header>
                <div>
                  <p class="eyebrow">Immutable envelope context</p>
                  <h3 id="supplied-lessons-heading">Supplied lessons</h3>
                </div>
              </header>
              @if (detailLoading()) {
                <p role="status">Loading immutable operation inputs…</p>
              } @else {
                <ol>
                  @for (row of suppliedLessonRows(); track $index) {
                    <li>
                      <p>{{ row.markdown }}</p>
                      @if (row.lessonId) {
                        <a [href]="'/lessons#lesson-' + row.lessonId">
                          {{ row.lessonId }} · version {{ row.lessonVersion }}
                        </a>
                        <code>{{ row.contentHash }}</code>
                      } @else {
                        <span role="alert">
                          Applied lesson provenance link unavailable
                        </span>
                      }
                    </li>
                  } @empty {
                    <li><strong>None</strong></li>
                  }
                </ol>
                <p class="doctrine-note">
                  Durable doctrine is repository-native through the loaded skill;
                  it is not supplied as episode-local envelope context.
                </p>
              }
            </section>

            @if (liveOperation(operation); as live) {
              <ol aria-label="Console entries" aria-live="polite">
                @for (
                  entry of live.consoleEntries();
                  track entry.seq + '-' + $index
                ) {
                  <li [attr.data-kind]="entry.kind">
                    <span>{{ entry.kind }}</span>
                    <pre>{{ entry.text }}</pre>
                  </li>
                } @empty {
                  <li class="empty">Waiting for the first console event…</li>
                }
              </ol>
            } @else {
              <ol aria-label="Console entries">
                <li class="empty">
                  Live stream detail is unavailable; this durable summary remains
                  available.
                </li>
              </ol>
            }

            <div class="actions" appHelpTarget="console.recovery">
              <button
                type="button"
                [disabled]="!canCancel(operation)"
                (click)="cancel(operation)"
              >
                Cancel
              </button>
              <button
                type="button"
                [disabled]="!canReroll(operation)"
                (click)="reroll(operation)"
              >
                Re-roll
              </button>
            </div>
          </div>
        } @else {
          <p class="empty stream-empty">Select an operation to inspect its stream.</p>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .panel {
      border: var(--whp-panel-border);
      background: var(--whp-panel-background);
    }

    header,
    .telemetry,
    .actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    header {
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--whp-line);
    }

    h2,
    p,
    pre {
      margin: 0;
    }

    h2 {
      color: var(--whp-ink);
      font-size: 1rem;
    }

    .eyebrow {
      color: var(--whp-muted-soft);
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .count,
    .telemetry span,
    nav small {
      color: var(--whp-muted);
      font-size: 0.7rem;
    }

    .load-error {
      border-bottom: 1px solid var(--whp-line);
      padding: 0.75rem 1rem;
      color: var(--whp-accent);
      font-size: 0.75rem;
    }

    .console-layout {
      display: grid;
      grid-template-columns: minmax(11rem, 15rem) minmax(0, 1fr);
      min-height: 20rem;
    }

    nav {
      display: grid;
      align-content: start;
      border-right: 1px solid var(--whp-line);
      background: var(--whp-panel);
    }

    nav button {
      display: grid;
      gap: 0.18rem;
      border: 0;
      border-left: 3px solid transparent;
      background: transparent;
      padding: 0.7rem;
      color: var(--whp-ink);
      cursor: pointer;
      font: inherit;
      text-align: left;
    }

    nav button.active {
      border-left-color: var(--whp-accent);
      background: var(--whp-surface);
    }

    nav span {
      overflow: hidden;
      color: var(--whp-muted);
      font-family: var(--whp-font-mono);
      font-size: 0.65rem;
      text-overflow: ellipsis;
    }

    .stream {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      min-width: 0;
    }

    .telemetry,
    .actions {
      padding: 0.75rem 1rem;
    }

    .telemetry {
      flex-wrap: wrap;
      border-bottom: 1px solid var(--whp-line);
    }

    .telemetry span {
      display: grid;
      gap: 0.1rem;
    }

    .telemetry strong {
      color: var(--whp-ink);
    }

    .telemetry .stalled {
      margin-inline-start: auto;
      color: var(--whp-accent);
      font-weight: 800;
    }

    .supplied-lessons {
      display: grid;
      gap: .55rem;
      border-bottom: 1px solid var(--whp-line);
      padding: .75rem 1rem;
      background: var(--whp-panel);
    }

    .supplied-lessons header { padding: 0; border: 0; }
    .supplied-lessons h3 { margin: .12rem 0 0; font-size: .82rem; }
    .supplied-lessons ol {
      max-height: none;
      border: 1px solid var(--whp-line);
    }
    .supplied-lessons li {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      font-size: .7rem;
    }
    .supplied-lessons li p { font-family: var(--whp-font-editor); line-height: 1.45; }
    .supplied-lessons li a { color: var(--whp-ink); font-weight: 800; }
    .supplied-lessons li code {
      grid-column: 2;
      color: var(--whp-muted);
      font-size: .6rem;
    }
    .doctrine-note { color: var(--whp-muted); font-size: .68rem; line-height: 1.4; }

    ol {
      display: grid;
      align-content: start;
      gap: 0;
      max-height: 28rem;
      overflow: auto;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: grid;
      grid-template-columns: 4.5rem minmax(0, 1fr);
      gap: 0.65rem;
      padding: 0.6rem 1rem;
      border-bottom: 1px solid var(--whp-line-soft);
    }

    li > span {
      color: var(--whp-muted-soft);
      font-size: 0.62rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    li[data-kind='failure'],
    li[data-kind='warning'] {
      border-left: 3px solid var(--whp-accent);
    }

    pre {
      overflow-wrap: anywhere;
      color: var(--whp-ink);
      font-family: var(--whp-font-mono);
      font-size: 0.72rem;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    .actions {
      border-top: 1px solid var(--whp-line);
    }

    .actions button {
      border: 1px solid var(--whp-line-strong);
      background: var(--whp-surface);
      padding: 0.42rem 0.65rem;
      color: var(--whp-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .actions button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .empty {
      padding: 1rem;
      color: var(--whp-muted);
      font-size: 0.75rem;
    }

    .stream-empty {
      align-self: center;
      justify-self: center;
    }

    @media (max-width: 48rem) {
      .console-layout {
        grid-template-columns: 1fr;
      }

      nav {
        border-right: 0;
        border-bottom: 1px solid var(--whp-line);
      }
    }
  `,
})
export class AgentConsole implements OnInit, OnDestroy {
  readonly model = input.required<AgentConsoleModel<unknown>>();
  readonly client = input.required<AgentConsoleClient>();
  protected readonly operations =
    signal<readonly OperationSummary[]>([]);
  protected readonly loadError = signal<string | null>(null);
  private readonly selectedId = signal<string | null>(null);
  protected readonly selectedRecord = signal<OperationRecord | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly suppliedLessonRows = computed<SuppliedLessonRow[]>(() => {
    const record = this.selectedRecord();
    const inputs = recordValue(record?.inputs);
    const supplied = inputs?.['approved_lessons'];
    if (!Array.isArray(supplied)) return [];
    const links = record?.operationLessons ?? [];
    return supplied.filter((value): value is string =>
      typeof value === 'string').map((markdown, index) => {
      const link = links[index] ?? null;
      return {
        markdown,
        lessonId: link?.lessonId ?? null,
        lessonVersion: link?.lessonVersion ?? null,
        contentHash: link?.contentHash ?? null,
      };
    });
  });
  protected readonly selected = computed(() => {
    const operations = this.operations();
    const id = this.selectedId();
    return operations.find((operation) => operation.id === id)
      ?? operations[0]
      ?? null;
  });
  private refreshTimer: ReturnType<typeof globalThis.setInterval> | null =
    null;
  private refreshGeneration = 0;
  private detailGeneration = 0;
  private destroyed = false;

  ngOnInit(): void {
    void this.refresh();
    this.refreshTimer = globalThis.setInterval(
      () => void this.refresh(),
      5_000,
    );
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.refreshTimer !== null) {
      globalThis.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  protected selectOperation(operation: OperationSummary): void {
    this.selectedId.set(operation.id);
    void this.loadOperation(operation.id);
    const live = this.liveOperation(operation);
    if (live) this.model().selectOperation(live);
  }

  protected isSelected(operation: OperationSummary): boolean {
    return this.selected()?.id === operation.id;
  }

  protected liveOperation(
    operation: OperationSummary,
  ): TrackedOperation<unknown, StudioConsoleEntry> | null {
    return this.model().operations().find(
      (candidate) => candidate.id() === operation.id,
    ) ?? null;
  }

  protected canCancel(operation: OperationSummary): boolean {
    return ['queued', 'running', 'cancelling'].includes(operation.state);
  }

  protected canReroll(operation: OperationSummary): boolean {
    return this.model().canResume(this.liveOperation(operation));
  }

  protected tokenLabel(tokens: number | null): string {
    return formatTokens(tokens);
  }

  protected cancel(operation: OperationSummary): void {
    if (!this.canCancel(operation)) return;
    void this.cancelAndRefresh(operation.id);
  }

  protected reroll(operation: OperationSummary): void {
    const live = this.liveOperation(operation);
    if (!live || !this.model().canResume(live)) return;
    this.model().selectOperation(live);
    this.model().resumeSelected();
  }

  private async cancelAndRefresh(id: string): Promise<void> {
    try {
      await this.client().cancel(id);
      await this.refresh();
    } catch (error) {
      this.loadError.set(errorMessage(error));
    }
  }

  private async refresh(): Promise<void> {
    const generation = ++this.refreshGeneration;
    try {
      const { operations } = await this.client().listOps();
      if (this.destroyed || generation !== this.refreshGeneration) return;
      this.operations.set(operations);
      this.loadError.set(null);
      const selected = this.selected();
      if (selected) {
        const detail = this.selectedRecord();
        if (detail?.id !== selected.id) {
          void this.loadOperation(selected.id);
        } else if (!isTerminalOperationState(detail.state)) {
          // Keep the selected operation's detail (state + usage) live while it
          // is still running. The poll that first observes completion performs
          // one final refetch; once the detail is terminal the condition stops
          // re-polling it. No re-selection or reload is required.
          void this.loadOperation(selected.id, { silent: true });
        }
      }
    } catch (error) {
      if (!this.destroyed && generation === this.refreshGeneration) {
        this.loadError.set(errorMessage(error));
      }
    }
  }

  private async loadOperation(
    id: string,
    opts: { silent?: boolean } = {},
  ): Promise<void> {
    const getOp = this.client().getOp;
    if (!getOp) {
      this.selectedRecord.set(null);
      return;
    }
    const generation = ++this.detailGeneration;
    // Silent poll-driven refreshes update the record in place without flashing
    // the detail loading state; only an on-select (id change) load shows it.
    if (!opts.silent) this.detailLoading.set(true);
    try {
      const record = await getOp.call(this.client(), id);
      if (
        !this.destroyed
        && generation === this.detailGeneration
        && this.selected()?.id === id
      ) {
        this.selectedRecord.set(record);
      }
    } catch (error) {
      if (!this.destroyed && generation === this.detailGeneration) {
        this.loadError.set(errorMessage(error));
      }
    } finally {
      if (generation === this.detailGeneration) {
        this.detailLoading.set(false);
      }
    }
  }
}

function isTerminalOperationState(state: OperationState): boolean {
  return !['queued', 'running', 'cancelling'].includes(state);
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to load durable operations.';
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
