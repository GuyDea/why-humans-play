import { computed, inject, Injectable, type Signal } from '@angular/core';
import type {
  OperationName,
  OperationState,
} from '../api/client';
import { mapStudioConsoleEvents } from '../panels/agent-console';
import { STUDIO_SESSION } from '../studio-session';
import { OpTracker } from './tracker';

export interface ActiveOp {
  id: string | null;
  name: OperationName;
  state: OperationState | null;
  stalled: boolean;
}

const NON_TERMINAL: readonly OperationState[] = ['queued', 'running', 'cancelling'];

function isActivePhase(phase: string): boolean {
  return phase === 'submitting' || phase === 'streaming';
}

/**
 * Single source of truth for "what AI work is running right now", resilient to
 * both tab navigation and browser reload. It merges the in-memory op trackers
 * already registered on the Studio session with server truth (`GET /api/ops`
 * filtered to non-terminal states), adopting any running server op not already
 * tracked so its trace replays after a reload and it appears in the Console.
 */
@Injectable({ providedIn: 'root' })
export class ActiveOperationsService {
  private readonly session = inject(STUDIO_SESSION);
  private readonly hydration = new OpTracker(
    this.session.client,
    mapStudioConsoleEvents,
  );
  private timer: ReturnType<typeof globalThis.setInterval> | null = null;

  constructor() {
    // Adopted server ops become part of the session history (and the Console),
    // and are cancellable from the Console via the hydration tracker.
    this.session.attachRuntime({
      tracker: this.hydration,
      cancel: (id) => this.hydration.cancel(id),
      canReroll: () => false,
      reroll: () => {
        throw new Error('adopted operations cannot be re-rolled');
      },
    });
  }

  readonly activeOperations: Signal<readonly ActiveOp[]> = computed(() => {
    const byId = new Map<string, ActiveOp>();
    const anon: ActiveOp[] = [];
    for (const op of this.session.history()) {
      if (!isActivePhase(op.phase())) continue;
      const entry: ActiveOp = {
        id: op.id(),
        name: op.operation,
        state: op.state(),
        stalled: op.stallFlag(),
      };
      if (entry.id) byId.set(entry.id, entry);
      else anon.push(entry);
    }
    return [...anon, ...byId.values()];
  });

  ensureStarted(): void {
    if (this.timer !== null) return;
    void this.pollOnce();
    this.timer = globalThis.setInterval(() => void this.pollOnce(), 5_000);
  }

  stop(): void {
    if (this.timer !== null) {
      globalThis.clearInterval(this.timer);
      this.timer = null;
    }
  }

  async pollOnce(): Promise<void> {
    let operations;
    try {
      ({ operations } = await this.session.client.listOps());
    } catch {
      return; // transient; next tick retries
    }
    const known = new Set(
      this.session.history()
        .map((op) => op.id())
        .filter((id): id is string => id !== null),
    );
    for (const summary of operations) {
      if (!NON_TERMINAL.includes(summary.state)) continue;
      if (known.has(summary.id)) continue;
      this.hydration.adopt(summary.operation, summary.id, {});
      known.add(summary.id);
    }
  }
}
