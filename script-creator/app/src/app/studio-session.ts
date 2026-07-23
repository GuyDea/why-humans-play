import {
  computed,
  InjectionToken,
  signal,
  type Signal,
} from '@angular/core';
import { DaemonClient } from './api/client';
import { extractNonce } from './api/nonce';
import type { TrackedOperation } from './ops/tracker';
import type {
  AgentConsoleTracker,
  StudioConsoleEntry,
} from './panels/agent-console';

type StudioTrackedOperation =
  TrackedOperation<unknown, StudioConsoleEntry>;

export interface StudioRuntimeHandle {
  readonly tracker: AgentConsoleTracker<unknown>;
  cancel(id: string): Promise<void>;
  canReroll(id: string): boolean;
  reroll(id: string): { tracked: StudioTrackedOperation };
}

export class StudioSession implements AgentConsoleTracker<unknown> {
  private readonly trackersState =
    signal<readonly AgentConsoleTracker<unknown>[]>([]);
  private readonly runtimeByTracker =
    new Map<AgentConsoleTracker<unknown>, StudioRuntimeHandle>();

  readonly history: Signal<readonly StudioTrackedOperation[]> = computed(
    () => this.trackersState().flatMap((tracker) => tracker.history()),
  );

  constructor(readonly client: DaemonClient) {}

  attachRuntime(runtime: StudioRuntimeHandle): () => void {
    if (!this.trackersState().includes(runtime.tracker)) {
      this.trackersState.update((trackers) => [...trackers, runtime.tracker]);
    }
    this.runtimeByTracker.set(runtime.tracker, runtime);

    return () => {
      if (this.runtimeByTracker.get(runtime.tracker) === runtime) {
        this.runtimeByTracker.delete(runtime.tracker);
      }
    };
  }

  cancel(id: string): Promise<void> {
    return this.ownerOf(id).cancel(id);
  }

  canResume(id: string): boolean {
    const tracker = this.findOwner(id);
    if (!tracker) return false;
    const runtime = this.runtimeByTracker.get(tracker);
    return runtime?.canReroll(id) ?? false;
  }

  resume(id: string): StudioTrackedOperation {
    const tracker = this.ownerOf(id);
    const runtime = this.runtimeByTracker.get(tracker);
    if (runtime?.canReroll(id)) return runtime.reroll(id).tracked;
    throw new Error(`operation ${id} has no live owning editor runtime`);
  }

  private ownerOf(id: string): AgentConsoleTracker<unknown> {
    const tracker = this.findOwner(id);
    if (!tracker) throw new Error(`unknown tracked operation: ${id}`);
    return tracker;
  }

  private findOwner(
    id: string,
  ): AgentConsoleTracker<unknown> | undefined {
    return this.trackersState().find((candidate) =>
      candidate.history().some((operation) => operation.id() === id));
  }
}

export const STUDIO_SESSION = new InjectionToken<StudioSession>(
  'Script Creator Studio session',
  {
    providedIn: 'root',
    factory: () => {
      const nonce = extractNonce(globalThis.location);
      return new StudioSession(new DaemonClient(
        globalThis.location.origin,
        () => nonce,
      ));
    },
  },
);
