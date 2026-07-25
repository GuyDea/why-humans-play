# Script Creator — Persistent Tab State + Traceable AI-Processing Indicator

**Date:** 2026-07-25
**Status:** Accepted (design approved; implementation pending)
**Scope:** Two Script Creator Studio (Angular) UX features. No server schema or storage
changes. Builds on the existing durable daemon (SQLite + on-disk job trace) and the
`GET /api/ops` / SSE contract already in place.

## Problem

1. **Tab switches reset state.** The Studio shell uses a plain Angular `<router-outlet>`
   with no reuse strategy, so every tab's component is destroyed on navigation-away and
   rebuilt on return (`app/src/app/app.config.ts:10`, `app.html:48`). Work-in-progress —
   the open draft's editor scroll/selection, Discover idea cards, Topics/Pipeline results,
   in-flight operations — is lost on every switch.
2. **AI processing is invisible and untraceable across navigation/reload.** When an
   operation is running there is no persistent, global indicator; and after a browser
   reload the frontend discards its in-memory tracker and never re-discovers the
   still-running operation, so the Console live pane shows "Live stream detail is
   unavailable" even though the daemon is still working and the full trace is on disk.

## Key finding: the conversation is already persisted

No new persistence is required. The daemon is a detached Fastify + `better-sqlite3`
service. Every operation has a durable UUID and `state`
(`queued|running|cancelling|cancelled|completed|failed|interrupted|invalid-output|timed-out`),
and the full trace — prompt envelope, streamed JSONL events, final message — is journaled
to disk (`jobs/<jobId>/{envelope.json,events.jsonl,final-message.txt}`) and replayable by
id from an arbitrary cursor via `GET /api/ops/:id/events?fromSeq=` (SSE, resumable with
`Last-Event-ID`). Work survives a browser reload and even a daemon restart
(`supervisor.reattach` → `reconcileRunning`). The gap is entirely in the **frontend**: it
does not surface active work globally, does not re-discover it after reload, and offers no
deep-link from "an operation is running" to "that operation's trace."

## Decision

Ship two independent, frontend-only features on branch
`feat/tab-state-processing-indicator`:

- **Feature A — Keep-alive tabs:** a custom `RouteReuseStrategy` that detaches a tab's
  component on navigation-away and reattaches it on return instead of destroying it.
- **Feature B — Traceable processing indicator:** a root-scoped active-operations store
  that hydrates from the server (so it survives reload), driving a global masthead chip
  and reusable inline chips, each deep-linking to the operation's Console trace.

Optional server work is limited to at most one convenience route and is explicitly
**out of scope** for V1 — the frontend filters `GET /api/ops` client-side.

## Feature A — Keep-alive tab state

### Mechanism
A `StudioRouteReuseStrategy implements RouteReuseStrategy`, provided in
`app.config.ts`, that stores detached component subtrees keyed by a stable route key and
returns them on return so the router reattaches the live DOM + component instance rather
than reconstructing it.

- **Kept alive:** `/` (Studio), `/console`, `/topics`, `/pipeline`, `/lessons`,
  `/discover`.
- **Not kept alive:** `/welcome` (transient), and the `**` redirect.
- Selection is by an explicit per-route flag (route `data: { keepAlive: true }`) so the
  set is declarative and easy to audit, not hard-coded in the strategy.

### Correctness details the strategy must handle
1. **Param-keyed storage.** The Studio route reads `?draft=<id>`
   (`drafts/draft-manager.component.ts:525-534`). The stored-instance key must include the
   draft id so navigating to a *different* draft yields a different (fresh) instance rather
   than reusing the wrong document. Key = route path + `keepAlive`-relevant params.
2. **Reattach-refresh hook.** Because a reused component does **not** re-run `ngOnInit`,
   server-derived lists would go stale. Define an optional interface
   `OnReattach { onReattach(): void }`; the strategy (or a small router-events listener)
   calls `onReattach()` when a stored component is reattached. Pages that poll/list server
   state implement it to re-sync (Console ops list, Topics runs, Pipeline cards, Lessons);
   pages with purely local state (Discover) need not.
3. **Lifecycle expectations that now change — and are desirable.** With keep-alive,
   `ngOnDestroy` no longer fires on a tab switch, only on real teardown. This means editor
   runtimes stay attached (`editor/editor-host.ts` attach/detach), and per-page
   in-flight-op cancellation in `ngOnDestroy` (e.g. `discover/discover-page.ts:538-547`) no
   longer aborts an operation just because the user changed tabs — exactly the behavior
   Feature B assumes (operations keep running in the background).

### Consequences
Memory grows with the set of visited kept-alive tabs. Acceptable: this is a single-user
localhost workbench with a bounded, small route set. Background timers on kept-alive pages
(e.g. the Console's 5s poll) keep running; the reattach-refresh hook plus the shared store
(Feature B) make this a feature, not a leak, and a page may pause its own timer on
detach if desired.

## Feature B — Traceable AI-processing indicator

### B1. Shared store — `ActiveOperationsService` (`providedIn: 'root'`)
The single source of truth for "what is processing right now," resilient to both
navigation and reload.

- Exposes `activeOperations(): Signal<ActiveOp[]>` where an `ActiveOp` carries at least
  `{ id, name, state, stalled, draftId }`.
- **Live layer:** merges the in-memory live trackers already present in
  `STUDIO_SESSION.history()` (rich `consoleEntries`, immediate phase transitions —
  `tracker.ts:20-26`, `studio-session.ts:31-33`). With Feature A these now survive tab
  switches on their own.
- **Server layer (reload survival):** on construction and on a 5s poll, calls
  `client.listOps()` and filters to non-terminal states
  (`queued|running|cancelling`) — the same query the Console already uses
  (`agent-console.ts:719-744`). For any running op **not** already covered by a live
  tracker, it re-attaches `client.streamEvents(id)` with `Last-Event-ID`, so after a reload
  the Console live pane is repopulated from the durable trace.
- **Dedupe by operation `id`** so a live tracker and its server record never double-count.
- Poll cadence and lifecycle mirror the Console's existing 5s pattern; the service owns one
  interval for the whole app instead of each page owning its own.

### B2. Global masthead chip
A standalone `OnPush` component in `.masthead-tools`, beside the model selector
(`app.html:43-45`), modeled on `MastheadModelSelector`
(`masthead-model-selector.ts:79-96`). Always mounted (the masthead never unmounts).

- Visible only when `activeOperations()` is non-empty. V1 runs one codex job at a time, so
  it typically reflects a single op; if others are queued it shows `+N`.
- Label: "In Processing" with a small activity affordance (spinner/pulse), plus the op name
  when space allows.
- Click → navigate to `/console?op=<id>` for the primary (running, else newest) active op.

### B3. Reusable inline chip
One component `<sc-processing-chip [op]="op">` (or `[opId]`) rendering the same label and
the same click-through, dropped into the primary launch surfaces so processing is visible
where it was started:

- Studio selection toolbar (`editor/selection-toolbar.ts`)
- Discover (`discover/discover-page.ts`)
- Topics (`topics/topics-page.ts`)
- Pipeline (`pipeline/pipeline-page.ts`)

Each surface binds the chip to its own active op (matched from the shared store by the op
it launched — e.g. by tracked id, or by `name`/`draftId` after reload). The masthead chip
is the guaranteed always-visible/reload-safe indicator; the inline chip is the
convenience-at-origin indicator.

### B4. Console deep-link
Add a `?op=<id>` query param to the `/console` route. `AgentConsole` reads it on load (and
on param change) and calls its existing `selectOperation(id)` path
(`agent-console.ts:638-644,746-777`), so the trace for that exact operation opens
directly. This is reload-safe because the operation record and its trace are durable
server-side; the Console already re-discovers ops via `listOps()`/`getOp()`.

## Persistence

None added. Feature B reads existing endpoints:
`GET /api/ops` (list, filtered client-side to non-terminal states),
`GET /api/ops/:id` (detail), `GET /api/ops/:id/events?fromSeq=` (resumable SSE trace).
Note `EventSource` cannot set the `x-sc-nonce` header, so any `EventSource`-based reconnect
must use the daemon's supported query-string nonce (`http/sse.ts:28-38`); the existing
`client.streamEvents` fetch-based reader already carries the nonce header and is the
preferred path.

**Explicitly deferred:** a dedicated `GET /api/ops?active=1` route wrapping
`JobStore.nonTerminalOperations()` (`job-store.ts:262-268`). Client-side filtering of the
100-item `listOps()` payload is sufficient for V1; add the route only if payload size or
poll cost later warrants it.

## Testing

Follows the app's existing vitest setup.

- **`StudioRouteReuseStrategy`:** unit tests for `shouldReuseRoute`, `shouldDetach`,
  `shouldAttach`, `store`, `retrieve`, and the param-keyed store key (same path, different
  `?draft=` → different stored instance). Integration test: navigate Discover → Topics →
  Discover and assert the idea cards / typed constraints are retained.
- **`OnReattach` wiring:** a page implementing `onReattach()` has it invoked on reattach
  but not on first construction.
- **`ActiveOperationsService`:** merge/dedupe of live + server ops by id; non-terminal
  filtering; reload hydration (empty live history + a server `running` op ⇒ one active op
  and a re-attached stream).
- **Masthead chip:** hidden when idle, visible + correct `/console?op=<id>` link when
  active; `+N` when multiple.
- **Inline chip:** renders for the surface's active op; same link.
- **Console:** `?op=<id>` auto-selects that operation on load.

## Risks

- **Keep-alive staleness/memory** — bounded route set; reattach-refresh hook re-syncs
  server lists; single-user localhost. Mitigated.
- **Double-tracking an op** (live tracker + server hydration) — dedupe on operation `id`.
- **Masthead recently changed** (`main` now includes "make masthead sticky on scroll") —
  the chip must slot into the current sticky masthead layout and its
  `--sc-masthead-height` publication (`app.ts:60-72`) without breaking sticky behavior.
- **Origin attribution for the inline chip after reload** — server op records expose
  `name` and optional `draftId`; if reliable per-surface attribution proves fiddly, the
  inline chip degrades gracefully to "live only" while the masthead chip remains the
  authoritative reload-safe indicator.

## Rejected alternatives

- **Lift each page's state into root services (no keep-alive).** More surgical but
  piecemeal, and still loses transient view state (exact scroll/selection); rejected in
  favor of one generic mechanism per the approved direction.
- **New DB tables / "conversation" store.** Unnecessary — operations and their full traces
  are already durable and replayable by id.
- **New server "active ops" endpoint as a prerequisite.** Deferred; client-side filtering
  of `listOps()` is sufficient for V1.
