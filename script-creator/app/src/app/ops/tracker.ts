import {
  computed,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  type DaemonClient,
  type OperationName,
  type OperationRecord,
  type OperationResult,
  type OperationState,
  type SseFrame,
} from '../api/client';

const MAX_RESUME_HOPS = 3;

export type OperationPhase =
  | 'submitting'
  | 'streaming'
  | 'done'
  | 'failed'
  | 'guardrail'
  | 'cancelled';

export interface OperationTelemetry {
  tokens: number | null;
  elapsed: number | null;
}

export type MapConsoleEvents<ConsoleEntry> = (
  events: readonly SseFrame[],
) => readonly ConsoleEntry[];

export interface OpTrackerOptions {
  statusPollMs?: number;
  onChange?: () => void;
}

export interface TrackedOperation<Meta = unknown, ConsoleEntry = unknown> {
  readonly operation: OperationName;
  readonly completion: Promise<void>;
  readonly id: Signal<string | null>;
  readonly phase: Signal<OperationPhase>;
  readonly state: Signal<OperationState | null>;
  readonly errorMessage: Signal<string | null>;
  readonly events: Signal<readonly SseFrame[]>;
  readonly consoleEntries: Signal<readonly ConsoleEntry[]>;
  readonly result: Signal<OperationResult | null>;
  readonly telemetry: Signal<OperationTelemetry>;
  readonly stallFlag: Signal<boolean>;
  readonly remainingHops: Signal<number>;
  readonly canResume: Signal<boolean>;
  readonly meta: Meta;
}

interface MutableTrackedOperation<Meta, ConsoleEntry>
  extends TrackedOperation<Meta, ConsoleEntry> {
  readonly resolveCompletion: () => void;
  readonly id: WritableSignal<string | null>;
  readonly phase: WritableSignal<OperationPhase>;
  readonly state: WritableSignal<OperationState | null>;
  readonly errorMessage: WritableSignal<string | null>;
  readonly events: WritableSignal<readonly SseFrame[]>;
  readonly consoleEntries: WritableSignal<readonly ConsoleEntry[]>;
  readonly result: WritableSignal<OperationResult | null>;
  readonly telemetry: WritableSignal<OperationTelemetry>;
  readonly stallFlag: WritableSignal<boolean>;
  readonly remainingHops: WritableSignal<number>;
  readonly operation: OperationName;
  readonly inputs: unknown;
}

export class OpTracker<Meta = unknown, ConsoleEntry = unknown> {
  private readonly historyState =
    signal<readonly TrackedOperation<Meta, ConsoleEntry>[]>([]);
  private readonly recordsById =
    new Map<string, MutableTrackedOperation<Meta, ConsoleEntry>>();
  private readonly statusPollMs: number;
  private readonly onChange: () => void;

  readonly history = this.historyState.asReadonly();

  constructor(
    private readonly client: DaemonClient,
    private readonly mapConsoleEvents: MapConsoleEvents<ConsoleEntry>,
    options: OpTrackerOptions = {},
  ) {
    this.statusPollMs = options.statusPollMs ?? 5_000;
    this.onChange = options.onChange ?? (() => undefined);
  }

  launch(
    operation: OperationName,
    inputs: unknown,
    meta: Meta,
  ): TrackedOperation<Meta, ConsoleEntry> {
    const tracked = this.createTrackedOperation(
      operation,
      inputs,
      meta,
      remainingHopsFrom(meta),
    );
    this.appendToHistory(tracked);
    this.run(tracked, () => this.client.submitOp(operation, inputs));
    return tracked;
  }

  resume(
    id: string,
    meta?: Meta,
  ): TrackedOperation<Meta, ConsoleEntry> {
    const parent = this.requireRecord(id);
    if (!parent.canResume()) {
      throw new Error(`resume limit exhausted for operation ${id}`);
    }

    const tracked = this.createTrackedOperation(
      parent.operation,
      parent.inputs,
      meta ?? parent.meta,
      parent.remainingHops() - 1,
    );
    this.appendToHistory(tracked);
    this.run(tracked, () => this.client.resume(id, parent.inputs));
    return tracked;
  }

  async cancel(id: string): Promise<void> {
    const tracked = this.requireRecord(id);
    await this.client.cancel(id);
    tracked.state.set('cancelled');
    tracked.phase.set('cancelled');
    this.onChange();
  }

  private createTrackedOperation(
    operation: OperationName,
    inputs: unknown,
    meta: Meta,
    remainingHops: number,
  ): MutableTrackedOperation<Meta, ConsoleEntry> {
    const id = signal<string | null>(null);
    const phase = signal<OperationPhase>('submitting');
    const remaining = signal(remainingHops);
    let resolveCompletion!: () => void;
    const completion = new Promise<void>((resolve) => {
      resolveCompletion = resolve;
    });

    return {
      completion,
      resolveCompletion,
      id,
      phase,
      state: signal<OperationState | null>(null),
      errorMessage: signal<string | null>(null),
      events: signal<readonly SseFrame[]>([]),
      consoleEntries: signal<readonly ConsoleEntry[]>([]),
      result: signal<OperationResult | null>(null),
      telemetry: signal<OperationTelemetry>({
        tokens: null,
        elapsed: null,
      }),
      stallFlag: signal(false),
      remainingHops: remaining,
      canResume: computed(
        () => id() !== null
          && remaining() > 0
          && (phase() === 'done' || phase() === 'guardrail'),
      ),
      meta,
      operation,
      inputs,
    };
  }

  private appendToHistory(
    tracked: MutableTrackedOperation<Meta, ConsoleEntry>,
  ): void {
    this.historyState.update((history) => [...history, tracked]);
    this.onChange();
  }

  private run(
    tracked: MutableTrackedOperation<Meta, ConsoleEntry>,
    acquireId: () => Promise<{ id: string }>,
  ): void {
    void this.runLifecycle(tracked, acquireId);
  }

  private async runLifecycle(
    tracked: MutableTrackedOperation<Meta, ConsoleEntry>,
    acquireId: () => Promise<{ id: string }>,
  ): Promise<void> {
    let statusTimer:
      | ReturnType<typeof globalThis.setInterval>
      | undefined;

    try {
      const { id } = await acquireId();
      tracked.id.set(id);
      this.recordsById.set(id, tracked);
      tracked.phase.set('streaming');
      this.onChange();
      statusTimer = globalThis.setInterval(() => {
        void this.refreshStatus(id, tracked);
      }, this.statusPollMs);

      await this.client.streamEvents(id, {
        onEvent: (event) => {
          tracked.events.update((events) => [...events, event]);
          tracked.consoleEntries.set([
            ...this.mapConsoleEvents(tracked.events()),
          ]);
          this.onChange();
        },
        onDone: () => undefined,
        onError: () => undefined,
      });
      globalThis.clearInterval(statusTimer);
      statusTimer = undefined;

      const [operation, result] = await Promise.all([
        this.client.getOp(id),
        this.client.getResult(id),
      ]);
      tracked.state.set(operation.state);
      tracked.errorMessage.set(operation.error);
      tracked.result.set(result);
      tracked.stallFlag.set(operation.stalled);
      tracked.telemetry.set(operationTelemetry(operation));

      if (tracked.phase() === 'cancelled' || operation.state === 'cancelled') {
        tracked.phase.set('cancelled');
      } else if (isGuardrailResult(result)) {
        tracked.phase.set('guardrail');
      } else if (
        operation.state === 'completed'
        && (result.kind === 'schema' || result.kind === 'raw')
      ) {
        tracked.phase.set('done');
      } else {
        tracked.phase.set('failed');
      }
      this.onChange();
    } catch (error) {
      if (tracked.phase() === 'cancelled') return;
      tracked.result.set({
        kind: 'failed',
        error: errorMessage(error),
      });
      tracked.state.set('failed');
      tracked.errorMessage.set(errorMessage(error));
      tracked.phase.set('failed');
      this.onChange();
    } finally {
      if (statusTimer !== undefined) {
        globalThis.clearInterval(statusTimer);
      }
      tracked.resolveCompletion();
    }
  }

  private async refreshStatus(
    id: string,
    tracked: MutableTrackedOperation<Meta, ConsoleEntry>,
  ): Promise<void> {
    try {
      const operation = await this.client.getOp(id);
      if (tracked.phase() !== 'streaming') return;
      tracked.state.set(operation.state);
      tracked.errorMessage.set(operation.error);
      tracked.stallFlag.set(operation.stalled);
      tracked.telemetry.set(operationTelemetry(operation));
      this.onChange();
    } catch {
      // SSE reconnects independently; a status refresh can try again next tick.
    }
  }

  private requireRecord(
    id: string,
  ): MutableTrackedOperation<Meta, ConsoleEntry> {
    const tracked = this.recordsById.get(id);
    if (!tracked) throw new Error(`unknown tracked operation: ${id}`);
    return tracked;
  }
}

function remainingHopsFrom(meta: unknown): number {
  if (!meta || typeof meta !== 'object') return MAX_RESUME_HOPS;
  const candidate = (meta as Record<string, unknown>)['remainingHops'];
  return typeof candidate === 'number'
      && Number.isInteger(candidate)
      && candidate >= 0
    ? Math.min(candidate, MAX_RESUME_HOPS)
    : MAX_RESUME_HOPS;
}

function operationTelemetry(
  operation: OperationRecord,
): OperationTelemetry {
  const tokens = operation.usageAvailable === 1
    ? (operation.inputTokens ?? 0) + (operation.outputTokens ?? 0)
    : null;
  const startedAt = operation.startedAt
    ? Date.parse(operation.startedAt)
    : Number.NaN;
  const finishedAt = operation.finishedAt
    ? Date.parse(operation.finishedAt)
    : Number.NaN;
  const elapsed = Number.isFinite(startedAt) && Number.isFinite(finishedAt)
    ? Math.max(0, finishedAt - startedAt)
    : null;

  return { tokens, elapsed };
}

function isGuardrailResult(result: OperationResult): boolean {
  if (result.kind !== 'schema' || !result.value) return false;
  if (typeof result.value !== 'object') return false;
  const status = (result.value as Record<string, unknown>)['status'];
  return status === 'declined' || status === 'narrowed';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'operation failed';
}
