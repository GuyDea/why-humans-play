# Persistent Tab State + Traceable AI-Processing Indicator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Studio tab switches from destroying page state, and make every AI operation visibly "In Processing" from anywhere, click-through to its Console trace, and correct after a browser reload.

**Architecture:** Two independent frontend features. **Part A** adds a keep-alive `RouteReuseStrategy` so route components are detached/reattached instead of destroyed. **Part B** adds a root-scoped `ActiveOperationsService` that merges the in-memory op trackers with server truth (`GET /api/ops`, filtered to non-terminal states) and adopts running ops so they replay after reload; a single reusable `ProcessingChip` renders from it in the masthead and inline on launch surfaces; the Console gains an `?op=<id>` deep-link. No server or DB changes — operations and their traces are already durable.

**Tech Stack:** Angular 20 (standalone components, signals, zoneless), TypeScript, Vitest + jsdom + `@angular/core/testing`. Backend untouched (Fastify + better-sqlite3 daemon).

## Global Constraints

- **No server/schema/DB changes.** Read-only use of existing endpoints: `GET /api/ops` (list), `GET /api/ops/:id` (detail), `GET /api/ops/:id/events?fromSeq=` (resumable SSE). Source: design doc `docs/superpowers/specs/2026-07-25-tab-state-and-processing-indicator-design.md`.
- **Non-terminal operation states** = `queued | running | cancelling`. Everything else (`completed | failed | interrupted | invalid-output | timed-out | cancelled`) is terminal. Copy this set verbatim wherever "active" is computed.
- **Active phases** (in-memory tracker) = `submitting | streaming`. All other `OperationPhase` values are settled.
- **Standalone + OnPush + signals** for every new component; match the `MastheadModelSelector` shape (`app/src/app/masthead-model-selector.ts`).
- **Tests:** Vitest. Component tests use `TestBed.configureTestingModule({ imports:[...], providers:[provideZonelessChangeDetection()] })`, `createComponent`, `detectChanges`; mock `DaemonClient` with `vi.fn`. Run the **local** vitest binary, not `npx`, from `script-creator/app`: `node_modules/.bin/vitest run <path>` (per repo memory on JIT/worker gotchas).
- **Commit** after each task on branch `feat/tab-state-processing-indicator`. Co-author trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- All paths below are relative to `script-creator/app/` unless noted.

---

## Part A — Keep-alive tab state

### Task A1: `StudioRouteReuseStrategy` + `OnReattach` hook

**Files:**
- Create: `src/app/routing/studio-route-reuse-strategy.ts`
- Test: `src/app/routing/studio-route-reuse-strategy.spec.ts`

**Interfaces:**
- Produces: `class StudioRouteReuseStrategy implements RouteReuseStrategy`; `interface OnReattach { onReattach(): void }`; helper `storeKeyForTest(route)` not exported — tests drive through public strategy methods with fake `ActivatedRouteSnapshot` objects.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/routing/studio-route-reuse-strategy.spec.ts
import { describe, expect, it, vi } from 'vitest';
import type {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
} from '@angular/router';
import {
  StudioRouteReuseStrategy,
  type OnReattach,
} from './studio-route-reuse-strategy';

function snapshot(
  path: string,
  keepAlive: boolean,
  draft: string | null = null,
): ActivatedRouteSnapshot {
  return {
    routeConfig: { path },
    data: keepAlive ? { keepAlive: true } : {},
    queryParamMap: { get: (k: string) => (k === 'draft' ? draft : null) },
  } as unknown as ActivatedRouteSnapshot;
}

function handleWith(instance: unknown): DetachedRouteHandle {
  return { componentRef: { instance } } as unknown as DetachedRouteHandle;
}

describe('StudioRouteReuseStrategy', () => {
  it('detaches keep-alive routes and not others', () => {
    const s = new StudioRouteReuseStrategy();
    expect(s.shouldDetach(snapshot('discover', true))).toBe(true);
    expect(s.shouldDetach(snapshot('welcome', false))).toBe(false);
  });

  it('stores and retrieves a handle by path', () => {
    const s = new StudioRouteReuseStrategy();
    const handle = handleWith({});
    s.store(snapshot('discover', true), handle);
    expect(s.shouldAttach(snapshot('discover', true))).toBe(true);
    expect(s.retrieve(snapshot('discover', true))).toBe(handle);
  });

  it('keys the Studio route by its draft query param', () => {
    const s = new StudioRouteReuseStrategy();
    const handleA = handleWith({});
    s.store(snapshot('', true, 'draft-A'), handleA);
    // A different draft on the same path must NOT retrieve draft-A's instance.
    expect(s.shouldAttach(snapshot('', true, 'draft-B'))).toBe(false);
    expect(s.retrieve(snapshot('', true, 'draft-B'))).toBeNull();
    expect(s.retrieve(snapshot('', true, 'draft-A'))).toBe(handleA);
  });

  it('clearing a stored handle removes it', () => {
    const s = new StudioRouteReuseStrategy();
    s.store(snapshot('topics', true), handleWith({}));
    s.store(snapshot('topics', true), null);
    expect(s.shouldAttach(snapshot('topics', true))).toBe(false);
  });

  it('calls onReattach on the reattached component instance', () => {
    const s = new StudioRouteReuseStrategy();
    const onReattach = vi.fn();
    const instance: OnReattach = { onReattach };
    s.store(snapshot('topics', true), handleWith(instance));
    s.retrieve(snapshot('topics', true));
    expect(onReattach).toHaveBeenCalledTimes(1);
  });

  it('reuses a route only when the routeConfig matches', () => {
    const s = new StudioRouteReuseStrategy();
    const a = snapshot('discover', true);
    const b = snapshot('topics', true);
    expect(s.shouldReuseRoute(a, a)).toBe(true);
    expect(s.shouldReuseRoute(a, b)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/app/routing/studio-route-reuse-strategy.spec.ts`
Expected: FAIL — module `./studio-route-reuse-strategy` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/routing/studio-route-reuse-strategy.ts
import { Injectable } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type DetachedRouteHandle,
  type RouteReuseStrategy,
} from '@angular/router';

/**
 * Implemented by a routed page component that must re-sync server-derived
 * state when the keep-alive strategy reattaches it (its `ngOnInit` does not
 * run again on reattach). Optional: pages whose timers keep running while
 * detached, or whose state is purely local, do not implement it.
 */
export interface OnReattach {
  onReattach(): void;
}

function keepAlive(route: ActivatedRouteSnapshot): boolean {
  return route.data?.['keepAlive'] === true;
}

function storeKey(route: ActivatedRouteSnapshot): string | null {
  if (!keepAlive(route)) return null;
  const path = route.routeConfig?.path ?? '';
  const draft = route.queryParamMap.get('draft');
  return draft ? `${path}?draft=${draft}` : path;
}

function componentInstance(handle: DetachedRouteHandle): unknown {
  // DetachedRouteHandle is opaque public-API but is internally a
  // `{ componentRef: ComponentRef<unknown> }`. Read defensively.
  const ref = (handle as { componentRef?: { instance?: unknown } })
    .componentRef;
  return ref?.instance ?? null;
}

function notifyReattach(handle: DetachedRouteHandle): void {
  const instance = componentInstance(handle);
  const candidate = instance as Partial<OnReattach> | null;
  if (candidate && typeof candidate.onReattach === 'function') {
    candidate.onReattach();
  }
}

/**
 * Keeps routes flagged `data: { keepAlive: true }` alive across navigation:
 * their component subtree is detached and stored on leave, then reattached on
 * return instead of destroyed and rebuilt. The Studio route is keyed by its
 * `?draft=` param so opening a different draft yields a different instance.
 */
@Injectable()
export class StudioRouteReuseStrategy implements RouteReuseStrategy {
  private readonly store = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return keepAlive(route);
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const key = storeKey(route);
    if (!key) return;
    if (handle) this.store.set(key, handle);
    else this.store.delete(key);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = storeKey(route);
    return key !== null && this.store.has(key);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = storeKey(route);
    if (!key) return null;
    const handle = this.store.get(key) ?? null;
    if (handle) notifyReattach(handle);
    return handle;
  }

  shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot,
  ): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/app/routing/studio-route-reuse-strategy.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/routing/studio-route-reuse-strategy.ts src/app/routing/studio-route-reuse-strategy.spec.ts
git commit -m "feat(script-creator): keep-alive RouteReuseStrategy for Studio tabs"
```

---

### Task A2: Wire the strategy and flag keep-alive routes

**Files:**
- Modify: `src/app/app.config.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/app.routes.spec.ts` (exists — extend it)

**Interfaces:**
- Consumes: `StudioRouteReuseStrategy` (Task A1).
- Produces: routes carrying `data: { keepAlive: true }` for `''`, `console`, `topics`, `pipeline`, `lessons`, `discover`; `RouteReuseStrategy` provided app-wide.

- [ ] **Step 1: Write the failing test** (append to `src/app/app.routes.spec.ts`)

```ts
import { routes } from './app.routes';

describe('keep-alive route flags', () => {
  const keepAlivePaths = ['', 'console', 'topics', 'pipeline', 'lessons', 'discover'];

  it('flags the working tabs keepAlive and excludes welcome and the wildcard', () => {
    for (const path of keepAlivePaths) {
      const route = routes.find((r) => r.path === path);
      expect(route, `route ${path}`).toBeTruthy();
      expect(route?.data?.['keepAlive'], `keepAlive on ${path}`).toBe(true);
    }
    expect(routes.find((r) => r.path === 'welcome')?.data?.['keepAlive'])
      .toBeUndefined();
    expect(routes.find((r) => r.path === '**')?.data?.['keepAlive'])
      .toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/app/app.routes.spec.ts`
Expected: FAIL — `keepAlive` is undefined on the working-tab routes.

- [ ] **Step 3: Add the route flags**

Edit `src/app/app.routes.ts` — add `data: { keepAlive: true }` to the six working-tab routes (leave `welcome` and `**` unflagged):

```ts
  { path: '', pathMatch: 'full', component: StudioPage, data: { keepAlive: true } },
  { path: 'console', component: AgentConsolePage, data: { keepAlive: true } },
  { path: 'topics', component: TopicsPage, data: { keepAlive: true } },
  { path: 'pipeline', component: PipelinePage, data: { keepAlive: true } },
  { path: 'lessons', component: LessonsPage, data: { keepAlive: true } },
  { path: 'discover', component: DiscoverPage, data: { keepAlive: true } },
  { path: 'welcome', component: WelcomePage },
  { path: '**', redirectTo: '' },
```

- [ ] **Step 4: Provide the strategy** in `src/app/app.config.ts`:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouteReuseStrategy } from '@angular/router';
import { routes } from './app.routes';
import { StudioRouteReuseStrategy } from './routing/studio-route-reuse-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: RouteReuseStrategy, useClass: StudioRouteReuseStrategy },
  ],
};
```

- [ ] **Step 5: Run tests**

Run: `node_modules/.bin/vitest run src/app/app.routes.spec.ts`
Expected: PASS.

- [ ] **Step 6: Manual browser verification** (record result in the task notes)

Launch the app (`npm start` from `script-creator/`), then: on Discover press "Suggest ideas" and let cards render → navigate to Topics → back to Discover. The idea cards and typed constraints must still be present (previously they reset). Repeat Studio → Topics → Studio with a draft open: the editor scroll position and open draft persist.

- [ ] **Step 7: Commit**

```bash
git add src/app/app.config.ts src/app/app.routes.ts src/app/app.routes.spec.ts
git commit -m "feat(script-creator): enable keep-alive on Studio working tabs"
```

---

## Part B — Traceable AI-processing indicator

### Task B1: Extract `runStreaming` and add `OpTracker.adopt()`

Adopting an existing server operation lets a running op's trace be replayed and rendered after a browser reload, and lets the shared store surface ops launched by page-local trackers.

**Files:**
- Modify: `src/app/ops/tracker.ts`
- Test: `src/app/ops/tracker.spec.ts` (exists — extend it)

**Interfaces:**
- Produces on `OpTracker<Meta, ConsoleEntry>`: `adopt(operation: OperationName, id: string, meta: Meta): TrackedOperation<Meta, ConsoleEntry>` — registers a streaming-only tracked op bound to `id` (no submit), returns the existing record if `id` is already tracked.

- [ ] **Step 1: Write the failing test** (append to `src/app/ops/tracker.spec.ts`, reusing its existing `mockClient`, `firstFrame`, `secondFrame`, `mapConsoleEvents`)

```ts
describe('OpTracker.adopt', () => {
  it('streams and settles an existing operation without submitting', async () => {
    const client = mockClient({
      streamEvents: vi.fn(async (_id: string, options: StreamEventsOptions) => {
        await options.onEvent(firstFrame);
        await options.onDone();
      }),
    });
    const tracker = new OpTracker(client, mapConsoleEvents);

    const tracked = tracker.adopt('ideate', 'op-7', {});
    expect(tracked.id()).toBe('op-7');
    expect(tracked.phase()).toBe('streaming');
    expect(client.submitOp).not.toHaveBeenCalled();
    expect(tracker.history()).toHaveLength(1);

    await tracked.completion;
    expect(client.streamEvents).toHaveBeenCalledWith('op-7', expect.anything());
    expect(tracked.phase()).toBe('done');
    expect(tracked.consoleEntries()).toHaveLength(1);
  });

  it('returns the existing record when the id is already tracked', async () => {
    const client = mockClient();
    const tracker = new OpTracker(client, mapConsoleEvents);
    const first = tracker.adopt('ideate', 'op-7', {});
    const second = tracker.adopt('ideate', 'op-7', {});
    expect(second).toBe(first);
    expect(tracker.history()).toHaveLength(1);
    await first.completion;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/app/ops/tracker.spec.ts`
Expected: FAIL — `tracker.adopt is not a function`.

- [ ] **Step 3: Refactor `runLifecycle` and add `adopt`.** In `src/app/ops/tracker.ts`, replace the current `runLifecycle` method (the block that starts `private async runLifecycle(` and runs through its closing brace) with the split below, and add `adopt` as a public method next to `resume`.

Add `adopt` (public, after `resume`):

```ts
  adopt(
    operation: OperationName,
    id: string,
    meta: Meta,
  ): TrackedOperation<Meta, ConsoleEntry> {
    const existing = this.recordsById.get(id);
    if (existing) return existing;
    const tracked = this.createTrackedOperation(operation, null, meta, 0);
    tracked.id.set(id);
    tracked.phase.set('streaming');
    this.recordsById.set(id, tracked);
    this.appendToHistory(tracked);
    void this.runStreaming(tracked, id);
    return tracked;
  }
```

Replace `runLifecycle` with:

```ts
  private async runLifecycle(
    tracked: MutableTrackedOperation<Meta, ConsoleEntry>,
    acquireId: () => Promise<{ id: string }>,
  ): Promise<void> {
    let id: string;
    try {
      ({ id } = await acquireId());
    } catch (error) {
      if (tracked.phase() !== 'cancelled') {
        tracked.result.set({ kind: 'failed', error: errorMessage(error) });
        tracked.state.set('failed');
        tracked.errorMessage.set(errorMessage(error));
        tracked.phase.set('failed');
        this.onChange();
      }
      tracked.resolveCompletion();
      return;
    }
    tracked.id.set(id);
    this.recordsById.set(id, tracked);
    tracked.phase.set('streaming');
    this.onChange();
    await this.runStreaming(tracked, id);
  }

  private async runStreaming(
    tracked: MutableTrackedOperation<Meta, ConsoleEntry>,
    id: string,
  ): Promise<void> {
    let statusTimer: ReturnType<typeof globalThis.setInterval> | undefined;
    try {
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
      tracked.result.set({ kind: 'failed', error: errorMessage(error) });
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
```

Note: `createTrackedOperation` already accepts `inputs: unknown`; pass `null` for adopted ops (they are never resumed — `remainingHops` 0 makes `canResume` false).

- [ ] **Step 4: Run the whole tracker suite** (guards the refactor)

Run: `node_modules/.bin/vitest run src/app/ops/tracker.spec.ts`
Expected: PASS — all pre-existing lifecycle tests plus the two new `adopt` tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/ops/tracker.ts src/app/ops/tracker.spec.ts
git commit -m "feat(script-creator): OpTracker.adopt to stream an existing operation"
```

---

### Task B2: `ActiveOperationsService`

**Files:**
- Create: `src/app/ops/active-operations.service.ts`
- Test: `src/app/ops/active-operations.service.spec.ts`

**Interfaces:**
- Consumes: `STUDIO_SESSION` (`studio-session.ts`), `OpTracker.adopt` (B1), `mapStudioConsoleEvents` (`panels/agent-console.ts`).
- Produces:
  - `interface ActiveOp { id: string | null; name: OperationName; state: OperationState | null; stalled: boolean }`
  - `@Injectable({ providedIn: 'root' }) class ActiveOperationsService` with:
    - `readonly activeOperations: Signal<readonly ActiveOp[]>`
    - `ensureStarted(): void` (idempotent — starts the 5s poll)
    - `pollOnce(): Promise<void>` (adopts newly-discovered non-terminal server ops)
    - `stop(): void` (clears the interval; for tests)

- [ ] **Step 1: Write the failing test**

```ts
// src/app/ops/active-operations.service.spec.ts
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import type {
  DaemonClient,
  OperationListResponse,
  StreamEventsOptions,
} from '../api/client';
import { StudioSession, STUDIO_SESSION } from '../studio-session';
import { ActiveOperationsService } from './active-operations.service';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch { /* re-init across workers is fine */ }
});

function client(list: OperationListResponse): DaemonClient {
  return {
    listOps: vi.fn(async () => list),
    // Never resolves: keeps an adopted op in the 'streaming' (active) phase for
    // the duration of the assertions instead of letting it settle.
    streamEvents: vi.fn((_id: string, _o: StreamEventsOptions) =>
      new Promise<void>(() => undefined)),
    getOp: vi.fn(async () => ({ state: 'running', error: null, stalled: false })),
    getResult: vi.fn(async () => ({ kind: 'pending' })),
    cancel: vi.fn(async (id: string) => ({ id })),
  } as unknown as DaemonClient;
}

function setup(list: OperationListResponse): ActiveOperationsService {
  const session = new StudioSession(client(list));
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: STUDIO_SESSION, useValue: session },
      ActiveOperationsService,
    ],
  });
  return TestBed.inject(ActiveOperationsService);
}

describe('ActiveOperationsService', () => {
  it('adopts non-terminal server ops and omits terminal ones', async () => {
    const service = setup({
      operations: [
        { id: 'a', operation: 'ideate', state: 'running', stalled: false,
          createdAt: '', finishedAt: null, usageAvailable: 0,
          inputTokens: null, cachedInputTokens: null, outputTokens: null,
          reasoningOutputTokens: null },
        { id: 'b', operation: 'review', state: 'completed', stalled: false,
          createdAt: '', finishedAt: null, usageAvailable: 0,
          inputTokens: null, cachedInputTokens: null, outputTokens: null,
          reasoningOutputTokens: null },
      ],
    });
    await service.pollOnce();
    const active = service.activeOperations();
    expect(active.map((o) => o.id)).toEqual(['a']);
    expect(active[0].name).toBe('ideate');
  });

  it('does not adopt the same id twice across polls', async () => {
    const service = setup({
      operations: [
        { id: 'a', operation: 'ideate', state: 'running', stalled: false,
          createdAt: '', finishedAt: null, usageAvailable: 0,
          inputTokens: null, cachedInputTokens: null, outputTokens: null,
          reasoningOutputTokens: null },
      ],
    });
    await service.pollOnce();
    await service.pollOnce();
    expect(service.activeOperations().filter((o) => o.id === 'a')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/app/ops/active-operations.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/ops/active-operations.service.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/app/ops/active-operations.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/ops/active-operations.service.ts src/app/ops/active-operations.service.spec.ts
git commit -m "feat(script-creator): ActiveOperationsService merging live + durable ops"
```

---

### Task B3: `ProcessingChip` reusable component

One component for both the masthead (no filter → all active ops) and inline surfaces (`[operations]` filter → the subset launched there). Links to the Console trace when the op has an id.

**Files:**
- Create: `src/app/ops/processing-chip.ts`
- Test: `src/app/ops/processing-chip.spec.ts`

**Interfaces:**
- Consumes: `ActiveOperationsService.activeOperations()` + `ensureStarted()` (B2).
- Produces: `@Component selector 'sc-processing-chip'`, `input operations: readonly OperationName[] | null` (default `null` = all).

- [ ] **Step 1: Write the failing test**

```ts
// src/app/ops/processing-chip.spec.ts
import { beforeAll, describe, expect, it } from 'vitest';
import { provideZonelessChangeDetection, signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { ActiveOperationsService, type ActiveOp } from './active-operations.service';
import { ProcessingChip } from './processing-chip';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch { /* re-init across workers is fine */ }
});

class StubService {
  readonly active = signal<readonly ActiveOp[]>([]);
  readonly activeOperations: Signal<readonly ActiveOp[]> = this.active;
  ensureStarted(): void { /* no-op in tests */ }
}

function setup(active: readonly ActiveOp[], operations?: string[]) {
  const stub = new StubService();
  stub.active.set(active);
  TestBed.configureTestingModule({
    imports: [ProcessingChip],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ActiveOperationsService, useValue: stub },
    ],
  });
  const fixture = TestBed.createComponent(ProcessingChip);
  if (operations) fixture.componentRef.setInput('operations', operations);
  fixture.detectChanges();
  return fixture;
}

const runningIdeate: ActiveOp =
  { id: 'op-9', name: 'ideate', state: 'running', stalled: false };

describe('ProcessingChip', () => {
  it('is empty when nothing matches', () => {
    const fixture = setup([]);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('shows "In Processing" and links to the Console trace', () => {
    const fixture = setup([runningIdeate]);
    const link = fixture.nativeElement.querySelector('a');
    expect(fixture.nativeElement.textContent).toContain('In Processing');
    expect(link.getAttribute('href')).toContain('/console');
    expect(link.getAttribute('href')).toContain('op=op-9');
  });

  it('honours the operations filter', () => {
    const fixture = setup([runningIdeate], ['review']);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/app/ops/processing-chip.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/ops/processing-chip.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { OperationName } from '../api/client';
import { ActiveOperationsService, type ActiveOp } from './active-operations.service';

@Component({
  selector: 'sc-processing-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (primary(); as op) {
      @if (op.id; as id) {
        <a
          class="processing-chip"
          data-testid="processing-chip"
          [routerLink]="['/console']"
          [queryParams]="{ op: id }"
          [class.stalled]="op.stalled"
          [attr.title]="'Open the ' + op.name + ' trace in the Console'"
        >
          <span class="pulse" aria-hidden="true"></span>
          <span>In Processing</span>
        </a>
      } @else {
        <span class="processing-chip pending" data-testid="processing-chip">
          <span class="pulse" aria-hidden="true"></span>
          <span>In Processing</span>
        </span>
      }
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; }
    .processing-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      border: 1px solid var(--whp-accent);
      border-radius: 999px;
      padding: 0.22rem 0.6rem;
      color: var(--whp-accent);
      background: var(--whp-accent-tint);
      font-size: 0.62rem;
      font-weight: 850;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-decoration: none;
    }
    .processing-chip.pending { opacity: 0.7; cursor: default; }
    .processing-chip.stalled { border-style: dashed; }
    .pulse {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--whp-accent);
      animation: sc-pulse 1.2s ease-in-out infinite;
    }
    @keyframes sc-pulse { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
  `,
})
export class ProcessingChip {
  private readonly active = inject(ActiveOperationsService);
  readonly operations = input<readonly OperationName[] | null>(null);

  constructor() {
    // Any placement of the chip boots the shared poll (masthead is always
    // mounted, so this starts at app load and after every reload).
    this.active.ensureStarted();
  }

  protected readonly primary = computed<ActiveOp | null>(() => {
    const filter = this.operations();
    const ops = this.active.activeOperations();
    const matches = filter
      ? ops.filter((op) => filter.includes(op.name))
      : ops;
    // Prefer one that already has an id (clickable) and is running.
    return matches.find((op) => op.id && op.state === 'running')
      ?? matches.find((op) => op.id)
      ?? matches.at(-1)
      ?? null;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/app/ops/processing-chip.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/ops/processing-chip.ts src/app/ops/processing-chip.spec.ts
git commit -m "feat(script-creator): reusable ProcessingChip linking to Console trace"
```

---

### Task B4: Masthead processing chip

**Files:**
- Modify: `src/app/app.ts` (add `ProcessingChip` to `imports`)
- Modify: `src/app/app.html` (place the chip in `.masthead-tools`)
- Test: `src/app/app.spec.ts` if present; otherwise create `src/app/masthead-processing.spec.ts`

**Interfaces:**
- Consumes: `ProcessingChip` (B3).

- [ ] **Step 1: Write the failing test** — verify the masthead renders the chip and boots the service. Create `src/app/masthead-processing.spec.ts`:

```ts
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import type { DaemonClient, StreamEventsOptions } from './api/client';
import { StudioSession, STUDIO_SESSION } from './studio-session';
import { ActiveOperationsService } from './ops/active-operations.service';
import { App } from './app';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch { /* re-init across workers is fine */ }
});

function daemon(): DaemonClient {
  return {
    listOps: vi.fn(async () => ({
      operations: [{
        id: 'op-3', operation: 'ideate', state: 'running', stalled: false,
        createdAt: '', finishedAt: null, usageAvailable: 0, inputTokens: null,
        cachedInputTokens: null, outputTokens: null, reasoningOutputTokens: null,
      }],
    })),
    streamEvents: vi.fn((_id: string, _o: StreamEventsOptions) =>
      new Promise<void>(() => undefined)),
    getOp: vi.fn(async () => ({ state: 'running', error: null, stalled: false })),
    getResult: vi.fn(async () => ({ kind: 'pending' })),
    cancel: vi.fn(async (id: string) => ({ id })),
  } as unknown as DaemonClient;
}

describe('App masthead processing chip', () => {
  it('renders the chip in the masthead and reflects an active op', async () => {
    const session = new StudioSession(daemon());
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: STUDIO_SESSION, useValue: session },
      ],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(ActiveOperationsService).pollOnce();
    fixture.detectChanges();

    const tools = fixture.nativeElement.querySelector('.masthead-tools');
    expect(tools.querySelector('sc-processing-chip')).toBeTruthy();
    expect(tools.textContent).toContain('In Processing');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/app/masthead-processing.spec.ts`
Expected: FAIL — no `sc-processing-chip` in the masthead.

- [ ] **Step 3: Add the chip.** In `src/app/app.ts`, import and add `ProcessingChip` to the component `imports` array:

```ts
import { ProcessingChip } from './ops/processing-chip';
// ...
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    HelpDrawer,
    HelpPopover,
    HelpTargetDirective,
    MastheadModelSelector,
    ProcessingChip,
  ],
```

In `src/app/app.html`, place the chip inside `.masthead-tools` before the model selector:

```html
  <div class="masthead-tools" appHelpTarget="masthead.model">
    <sc-processing-chip />
    <app-masthead-model-selector />
  </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/app/masthead-processing.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/app.ts src/app/app.html src/app/masthead-processing.spec.ts
git commit -m "feat(script-creator): global In Processing chip in the masthead"
```

---

### Task B5: Console `?op=<id>` deep-link

**Files:**
- Modify: `src/app/panels/agent-console.ts` (`AgentConsole` gains a `focusOperationId` input + selection effect)
- Modify: `src/app/studio-pages.ts` (`AgentConsolePage` reads the `op` query param and binds it)
- Test: `src/app/panels/agent-console.spec.ts` (exists — extend it)

**Interfaces:**
- Consumes: existing `AgentConsole` selection machinery (`selectedId`, `loadOperation`, `liveOperation`).
- Produces on `AgentConsole`: `readonly focusOperationId = input<string | null>(null)`.

- [ ] **Step 1: Write the failing test** — setting `focusOperationId` makes the console load that operation's detail. This asserts on the observable behavior (`getOp` called with the focused id), avoiding reliance on the console's private selection state. Append to `src/app/panels/agent-console.spec.ts`, de-duplicating any imports/helpers the file already declares:

```ts
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import type { DaemonClient } from '../api/client';
import { StudioSession } from '../studio-session';
import { AgentConsole, AgentConsoleModel } from './agent-console';

function opSummary(id: string) {
  return {
    id, operation: 'review', state: 'running', createdAt: '',
    finishedAt: null, stalled: false, usageAvailable: 0, inputTokens: null,
    cachedInputTokens: null, outputTokens: null, reasoningOutputTokens: null,
  };
}

describe('AgentConsole focusOperationId', () => {
  it('loads the operation named by focusOperationId', async () => {
    try {
      TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch { /* already initialised in this worker */ }

    const getOp = vi.fn(async (id: string) => ({
      id, operation: 'review', state: 'running', stalled: false,
      envelopeJson: '{}', jobDir: '', threadId: null, retryOf: null,
      resumedFrom: null, createdAt: '', startedAt: null, finishedAt: null,
      inputTokens: null, cachedInputTokens: null, outputTokens: null,
      reasoningOutputTokens: null, usageAvailable: 0, error: null,
      inputs: {}, operationLessons: [],
    }));
    const client = {
      listOps: vi.fn(async () => ({ operations: [opSummary('op-1'), opSummary('op-2')] })),
      getOp,
      cancel: vi.fn(async (id: string) => ({ id })),
    };
    const session = new StudioSession(client as unknown as DaemonClient);

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(AgentConsole);
    fixture.componentRef.setInput('client', client);
    fixture.componentRef.setInput('model', new AgentConsoleModel(session));
    fixture.componentRef.setInput('focusOperationId', 'op-2');
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();

    expect(getOp).toHaveBeenCalledWith('op-2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/app/panels/agent-console.spec.ts`
Expected: FAIL — `focusOperationId` unknown input / op-2 not auto-selected.

- [ ] **Step 3: Add the input + effect to `AgentConsole`.** In `src/app/panels/agent-console.ts`, add `effect` and `input` are already importable from `@angular/core` (`input` is imported; add `effect`). Add the field and a constructor:

```ts
  readonly focusOperationId = input<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.focusOperationId();
      if (!id) return;
      this.selectedId.set(id);
      void this.loadOperation(id);
      const live = this.model().operations().find((op) => op.id() === id);
      if (live) this.model().selectOperation(live);
    });
  }
```

(`selectedId`, `loadOperation`, `model` already exist. The existing 5s `refresh()` fills `operations()`, after which `selected()` resolves to the focused id.)

- [ ] **Step 4: Bind the query param in `AgentConsolePage`.** In `src/app/studio-pages.ts`:

```ts
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
// ...
@Component({
  // ...
  template: `
    <main class="console-page">
      <header>
        <p>Durable operation history</p>
        <h1>Agent console</h1>
      </header>
      <app-agent-console
        [client]="session.client"
        [model]="model"
        [focusOperationId]="focusOperationId()"
      />
    </main>
  `,
  // ...
})
export class AgentConsolePage {
  private readonly route = inject(ActivatedRoute);
  protected readonly session = inject(STUDIO_SESSION);
  protected readonly model = new AgentConsoleModel(this.session);
  protected readonly focusOperationId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('op'))),
    { initialValue: this.route.snapshot.queryParamMap.get('op') },
  );
}
```

- [ ] **Step 5: Run tests**

Run: `node_modules/.bin/vitest run src/app/panels/agent-console.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/panels/agent-console.ts src/app/studio-pages.ts src/app/panels/agent-console.spec.ts
git commit -m "feat(script-creator): deep-link Console to an operation via ?op="
```

---

### Task B6: Inline chip on Discover

**Files:**
- Modify: `src/app/discover/discover-page.ts` (add `ProcessingChip` import + one template placement)
- Test: `src/app/discover/discover-page.spec.ts` (exists — extend it)

**Interfaces:**
- Consumes: `ProcessingChip` (B3), filtered to `['ideate']`.

- [ ] **Step 1: Write the failing test** — the Discover launcher renders a processing chip while an `ideate` op runs. `DiscoverPage` injects the root `STUDIO_SESSION` and `ModelPreferenceService` (both fine with their default factories; the page makes no network call at construction and has no `ngOnInit`), so the only override needed is a stub `ActiveOperationsService`. Append to `src/app/discover/discover-page.spec.ts`, de-duplicating imports the file already has:

```ts
import { provideZonelessChangeDetection, signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { DiscoverPage } from './discover-page';
import {
  ActiveOperationsService,
  type ActiveOp,
} from '../ops/active-operations.service';

class ActiveOpsStub {
  readonly active = signal<readonly ActiveOp[]>([]);
  readonly activeOperations: Signal<readonly ActiveOp[]> = this.active;
  ensureStarted(): void { /* no-op */ }
}

describe('Discover inline processing chip', () => {
  it('renders the chip in the launcher while an ideate op runs', () => {
    try {
      TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch { /* already initialised in this worker */ }

    const stub = new ActiveOpsStub();
    stub.active.set([{ id: 'op-5', name: 'ideate', state: 'running', stalled: false }]);
    TestBed.configureTestingModule({
      imports: [DiscoverPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActiveOperationsService, useValue: stub },
      ],
    });
    const fixture = TestBed.createComponent(DiscoverPage);
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector(
      '.suggest-launcher sc-processing-chip [data-testid="processing-chip"]',
    );
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain('In Processing');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/app/discover/discover-page.spec.ts`
Expected: FAIL — no chip in the launcher.

- [ ] **Step 3: Add the chip.** In `src/app/discover/discover-page.ts`, import it and add to `imports`:

```ts
import { ProcessingChip } from '../ops/processing-chip';
// ...
  imports: [FullRunPanel, HelpTargetDirective, ProcessingChip],
```

Place it in the `.launcher-actions` row (after the primary button), passing the `ideate` filter:

```html
            <div class="launcher-actions">
              <span>No seed needed — this is the cold-start door.</span>
              <sc-processing-chip [operations]="['ideate']" />
              <button
                class="primary-action"
                type="button"
                data-testid="suggest-ideas"
                [disabled]="ideateBusy()"
                (click)="suggestIdeas()"
              >
                {{ ideateBusy() ? 'Suggesting…' : 'Suggest ideas' }}
              </button>
            </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/app/discover/discover-page.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/discover/discover-page.ts src/app/discover/discover-page.spec.ts
git commit -m "feat(script-creator): inline processing chip on Discover"
```

---

### Task B7: Inline chip on Topics

**Files:**
- Modify: `src/app/topics/topics-page.ts` (add `ProcessingChip` import + one template placement in the hero)
- Test: `src/app/topics/topics-composition.spec.ts` or `topics-page`'s existing spec — extend whichever mounts `TopicsPage`.

**Interfaces:**
- Consumes: `ProcessingChip` (B3), filtered to the topic-skill op names.

- [ ] **Step 1: Write the failing test.** `TopicsPage.ngOnInit` calls `listIdeas()` and mounts `FullRunPanel`, so do **not** hand-roll a mount — reuse the existing `topics-composition.spec.ts` harness that already stands `TopicsPage` up. Add a stub `ActiveOperationsService` to that harness's `TestBed.configureTestingModule({ providers: [...] })` and a new test. The stub mirrors B6's `ActiveOpsStub`; seed it with a running `quick-gate-check`:

```ts
import { signal, type Signal } from '@angular/core';
import {
  ActiveOperationsService,
  type ActiveOp,
} from '../ops/active-operations.service';

class ActiveOpsStub {
  readonly active = signal<readonly ActiveOp[]>([]);
  readonly activeOperations: Signal<readonly ActiveOp[]> = this.active;
  ensureStarted(): void { /* no-op */ }
}

// In the existing harness's providers array add:
//   { provide: ActiveOperationsService, useValue: activeOpsStub },
// where `const activeOpsStub = new ActiveOpsStub();` is created in the test and
// seeded before detectChanges():

it('shows an inline processing chip in the hero while a topic op runs', () => {
  activeOpsStub.active.set([
    { id: 'op-8', name: 'quick-gate-check', state: 'running', stalled: false },
  ]);
  const fixture = mountTopicsPage(); // the file's existing mount helper
  fixture.detectChanges();

  const chip = fixture.nativeElement.querySelector(
    '.topics-hero sc-processing-chip [data-testid="processing-chip"]',
  );
  expect(chip).toBeTruthy();
  expect(chip.textContent).toContain('In Processing');
});
```

If `topics-composition.spec.ts` has no reusable mount helper, factor its inline TestBed setup into a small `mountTopicsPage()` in that file first (pure refactor, no behavior change), then add the provider and test above.

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/app/topics/topics-composition.spec.ts`
Expected: FAIL — no chip in the hero.

- [ ] **Step 3: Add the chip.** In `src/app/topics/topics-page.ts`, import and add to `imports`:

```ts
import { ProcessingChip } from '../ops/processing-chip';
// ...
  imports: [FullRunPanel, HelpTargetDirective, ProcessingChip],
```

Place it in the `.topics-hero` header:

```html
      <header class="topics-hero">
        <div>
          <p class="eyebrow">Topic studio</p>
          <h1>Work the question before the script.</h1>
        </div>
        <p class="hero-copy">
          Catch a hunch, open it into angles, then test whether the strongest
          idea belongs on Why Humans Play.
        </p>
        <sc-processing-chip
          [operations]="[
            'ideate', 'quick-gate-check', 'package-test',
            'full-topic-run', 'handoff-preview'
          ]"
        />
      </header>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/app/topics/topics-composition.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/topics/topics-page.ts src/app/topics/topics-composition.spec.ts
git commit -m "feat(script-creator): inline processing chip on Topics"
```

---

### Task B8: Full-suite verification + reload/manual check

**Files:** none (verification only).

- [ ] **Step 1: Run the whole app test suite**

Run (from `script-creator/app`): `node_modules/.bin/vitest run`
Expected: PASS, no regressions.

- [ ] **Step 2: Typecheck / build**

Run (from `script-creator/app`): `npm run build` (or the project's `ng build`).
Expected: builds clean, no TS errors.

- [ ] **Step 3: Manual reload verification** (record results)

With the app running and the daemon reachable: launch a real AI op (e.g. Discover → Suggest ideas). Confirm: (a) the inline chip and masthead chip both read "In Processing"; (b) clicking either opens `/console?op=<id>` focused on that op's live trace; (c) **reload the browser mid-run** — the masthead chip reappears within ~5s (server re-discovery), clicking it still opens the correct trace, and the Console shows the replayed conversation; (d) switch tabs during the run and back — no state loss, op still tracked.

- [ ] **Step 4: Commit** (if any verification-driven fixes were needed; otherwise skip)

---

## Notes & scope decisions (flagged for review)

- **Pipeline is not an inline surface.** `pipeline/pipeline-page.ts` launches no AI operations (no `OpTracker`), so the design doc's mention of a Pipeline inline chip is dropped. The masthead chip still covers any future Pipeline ops.
- **Editor/Studio inline chip is the masthead.** The selection toolbar is a framework-agnostic plain-DOM class (`editor/selection-toolbar.ts`), not an Angular template, so an Angular chip cannot drop into it. Editor ops are session-attached and therefore appear in the masthead chip **instantly**; the editor already renders rich inline proposal/streaming UI. If a dedicated in-editor chip is later wanted, it belongs in the Studio Angular shell (`drafts/draft-manager.component.ts`), not the toolbar — out of scope here.
- **`OnReattach` is a tested, available hook with no consumer yet.** Detached components keep their timers and local state, and the Console polls continuously, so no page currently needs a reattach refresh. The interface + strategy invocation are covered by A1's test so a future list-once page can adopt it in one line.
- **Masthead-latency for page-local trackers.** Discover uses a page-local `OpTracker` (not session-attached), so its op appears in the masthead within one poll (~5s); the inline Discover chip covers the instant case. Session-attached surfaces (editor, Topics) appear in the masthead immediately.
- **Detached-handle growth.** The Studio route stores one handle per distinct `?draft=`; handles accumulate across drafts visited in a session (bounded, single-user localhost). Eviction/destroy is a possible follow-up, not V1.
```
