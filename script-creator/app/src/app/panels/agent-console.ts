import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  type Signal,
} from '@angular/core';
import type { TrackedOperation } from '../ops/tracker';

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

  resumeSelected(): TrackedOperation<Meta, StudioConsoleEntry> | null {
    const operation = this.selected();
    const id = operation?.id();
    if (!operation || !id || !operation.canResume()) return null;
    const resumed = this.tracker.resume(id);
    this.selectOperation(resumed);
    return resumed;
  }
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

@Component({
  selector: 'app-agent-console',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel studio-panel" aria-labelledby="agent-console-heading">
      <header>
        <div>
          <p class="eyebrow">Operations</p>
          <h2 id="agent-console-heading">Agent console</h2>
        </div>
        <span class="count">{{ model().operations().length }}</span>
      </header>

      <div class="console-layout">
        <nav aria-label="Operation history">
          @for (
            operation of model().operations();
            track operation.id() ?? $index
          ) {
            <button
              type="button"
              [class.active]="model().selected() === operation"
              (click)="model().selectOperation(operation)"
            >
              <strong>{{ operationLabel(operation.meta) }}</strong>
              <span>{{ operation.id() ?? 'Submitting…' }}</span>
              <small [attr.data-phase]="operation.phase()">
                {{ operation.phase() }}
              </small>
            </button>
          } @empty {
            <p class="empty">Operations will appear here when an agent starts.</p>
          }
        </nav>

        @if (model().selected(); as operation) {
          <div class="stream">
            <div class="telemetry" aria-label="Operation telemetry">
              <span>
                Tokens
                <strong>{{ tokenLabel(operation.telemetry().tokens) }}</strong>
              </span>
              <span>
                Elapsed
                <strong>{{ elapsedLabel(operation.telemetry().elapsed) }}</strong>
              </span>
              <span>
                Resume hops
                <strong>{{ operation.remainingHops() }}</strong>
              </span>
              @if (operation.stallFlag()) {
                <span class="stalled" role="status">Stalled</span>
              }
            </div>

            <ol aria-label="Console entries" aria-live="polite">
              @for (
                entry of operation.consoleEntries();
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

            <div class="actions">
              <button
                type="button"
                [disabled]="!model().canCancel(operation)"
                (click)="cancel()"
              >
                Cancel
              </button>
              <button
                type="button"
                [disabled]="!operation.canResume()"
                (click)="model().resumeSelected()"
              >
                Resume
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
      grid-template-rows: auto minmax(0, 1fr) auto;
      min-width: 0;
    }

    .telemetry,
    .actions {
      padding: 0.75rem 1rem;
    }

    .telemetry {
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
export class AgentConsole {
  readonly model = input.required<AgentConsoleModel<unknown>>();

  protected operationLabel(meta: unknown): string {
    if (!meta || typeof meta !== 'object') return 'Operation';
    const operation = (meta as Record<string, unknown>)['operation'];
    return typeof operation === 'string' ? operation : 'Operation';
  }

  protected tokenLabel(tokens: number | null): string {
    return formatTokens(tokens);
  }

  protected elapsedLabel(milliseconds: number | null): string {
    return formatElapsed(milliseconds);
  }

  protected cancel(): void {
    void this.model().cancelSelected();
  }
}
