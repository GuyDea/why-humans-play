# Script Creator — Plan 4: Script Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The first thing Martin can open in a browser and write in: an Angular app served by the daemon that embeds the proven editor core, wires the selection popup to real operations (Review / Rewrite / Alternatives / custom), renders proposals, variants, findings, and guardrails through the Spike 2 machinery, and manages drafts with autosave, revisions, the factual-boundary brief, the creative approval gate, and an agent console.

**Architecture:** `script-creator/app/` — Angular (current major, standalone components + signals), embedding `@whp/script-creator-editor-core`'s ProseMirror EditorView directly in a host component. All server interaction through a typed daemon client (nonce from the launch URL fragment, SSE with Last-Event-ID reconnect). The daemon gains static serving of the built app and a `SC_CODEX_BIN` override so the full UI runs deterministically against the fake codex for E2E.

**Recorded deviation from the technical design (reconciled with this plan):** the design named TipTap 3 as the editor wrapper. Spike 2 produced a complete, framework-agnostic ProseMirror core — plugins, NodeViews, selection toolbar — with nothing left for TipTap to provide; wrapping it now would add a conversion layer and risk without a feature. The Studio embeds editor-core's ProseMirror directly. (Design doc updated; ledger entry recorded.)

**Testing calibration:** pure-TS logic (daemon client, envelope-context builder, op tracking store, metrics) is vitest-tested with verbatim contracts; Angular components stay thin and are proven by the controller's browser-driven E2E against the running daemon (fake codex), plus one real-codex pass. No Karma/TestBed.

## Global Constraints

- Branch `script-creator-plan4-studio`; commit per task, scope `script-creator`.
- App code in `script-creator/app/`; server changes only where a task authorizes them; nothing outside `script-creator/` except the reconcile edits committed with this plan.
- Envelope inputs are built ONLY from explicit editor/draft state (selection text, surrounding paragraphs, beat title+narrative job, topic-brief fields, creative status, approved lessons list, requested scope) — zero app-authored editorial instruction; the envelope-context builder test proves field-for-field provenance.
- Every agent edit lands through editor-core's proposal machinery (requestProposal at submit, receiveProposal on result, accept/reject) — never a direct document mutation from a network handler.
- Guardrail results (`declined`/`narrowed` + `guardrail_markdown`) render as first-class callouts, never error toasts.
- Re-roll uses the daemon resume API and inherits its ≤3 limit; the UI disables re-roll when exhausted.
- Nonce comes from `#nonce=<hex>` in the launch URL, held in memory (sessionStorage fallback), stripped from the visible URL; every client call sends it.
- Autosave: 1 s debounced PUT of the serialized doc; a failed save shows a persistent unsaved badge, never a modal.
- `npx vitest run` + `npx tsc --noEmit` in `script-creator/app/` and an `ng build` completing without errors are the binding green for Sol tasks; browser verification is the controller's.

## File Structure (under `script-creator/app/` unless noted)

```text
src/app/api/client.ts          — DaemonClient: ops submit/get/result/cancel/resume, SSE
                                  (Last-Event-ID reconnect), drafts CRUD/import/export, validate
src/app/api/nonce.ts           — fragment extraction, memory+sessionStorage, URL scrub
src/app/ops/context.ts         — buildOperationInputs(selectionCtx, draftMeta, opKind, extra)
src/app/ops/tracker.ts         — OpTracker (signals): submit→stream→result lifecycle, telemetry
src/app/editor/editor-host.ts  — component mounting editor-core EditorView; doc⇄JSON wiring
src/app/editor/selection-toolbar.ts — floating toolbar; preset + custom instruction actions
src/app/editor/proposal-bridge.ts   — requestProposal/receiveProposal wiring per operation
src/app/panels/…               — brief/boundary, parking-lot, findings, revisions, console
src/app/drafts/…               — draft list/create/import/export UI
src/app/metrics.ts             — word counts, runtime estimate, per-beat pacing model
src/styles.scss                — WHP-adjacent styling (charcoal/off-white, single red accent)
server (authorized in Tasks 2): static serving of app/dist, launch URL print with #nonce,
                                SC_CODEX_BIN env override into JobEnvelope.codexBin
```

---

### Task 1 (controller): Angular workspace scaffold

- [ ] `npx @angular/cli@latest new app` (standalone, SCSS, no SSR, skip git) inside `script-creator/`; add `"@whp/script-creator-editor-core": "file:../editor-core"`; add vitest + tsx devDeps and a `"test": "vitest run"` script with a vitest config covering `src/**/*.spec.ts` (jsdom); `ng build` green; commit `feat(script-creator): scaffold angular studio workspace`.

### Task 2: daemon serves the app + deterministic codex override

**Files:** `script-creator/server/src/http/app.ts`, `src/daemon.ts`, `src/operations/service.ts` (+tests) — authorized server edits.
**Contract:** `buildApp` gains `staticRoot?: string`; when set, GET requests without `/api/` prefix serve files from it (index.html fallback for extensionless paths), same nonce exemption: static assets are served WITHOUT nonce (they are public shell), while ALL `/api/` routes keep the guard; daemon startup log prints `http://127.0.0.1:<port>/#nonce=<nonce>` and passes `app/dist/<name>/browser` when it exists. `SC_CODEX_BIN` env (read at daemon construction, threaded to OperationService) sets `JobEnvelope.codexBin` for every submitted attempt — test proves the envelope carries it and that it is absent by default. Inject tests for static serving (200 index, asset, api still 401 without nonce).

### Task 3: nonce + daemon client

**Files:** `src/app/api/nonce.ts`, `src/app/api/client.ts` + specs.
**Contract:** `extractNonce(location)` reads `#nonce=`, stores, scrubs fragment via history.replaceState, falls back to sessionStorage; `DaemonClient` (constructor takes baseUrl+nonce provider) implements: `submitOp(operation, inputs)`, `getOp(id)`, `getResult(id)`, `cancel(id)`, `resume(id, inputs)`, `streamEvents(id, {lastEventId, onEvent, onDone, onError})` using fetch-ReadableStream SSE parsing (the Plan 3 E2E parser, productized: id/event/data frames, auto-reconnect with stored Last-Event-ID and exponential backoff capped 5 s, stops on `done`), drafts `list/create/get/save/import/export`, `validate(path)`. Verbatim spec: SSE parser fed a chunked fixture (split mid-frame) yields exact frames and resumes with the right header after a simulated drop. All requests carry `x-sc-nonce`.

### Task 4: envelope context builder

**Files:** `src/app/ops/context.ts` + spec.
**Contract:** `buildOperationInputs(ctx, op)` where `ctx = {selection, before, after, beatTitle, narrativeJob, brief: {topic, factual_anchors, unknowns}, creativeStatus, approvedLessons, requestedScope}` → the exact inputs object per operation kind (rewrite-selection / review / generate-alternatives with count) matching Plan 3's registry field names. Verbatim provenance test: every produced field equals the corresponding ctx field verbatim; no extra keys (deep `Object.keys` assertions); `approved_lessons` passthrough; alternatives carries `{count, instruction}` scope.

### Task 5: op tracker

**Files:** `src/app/ops/tracker.ts` + spec.
**Contract:** `OpTracker` (plain class over DaemonClient, Angular-free): `launch(operation, inputs, meta)` → signal-backed record {id, phase: submitting|streaming|done|failed|guardrail|cancelled, events[], consoleEntries (via a mapConsoleEvents port), result, telemetry {tokens, elapsed}, stallFlag}; resume(id) guarded by remaining-hops from the op record; cancel. Spec with a mocked client: full lifecycle, guardrail phase on `declined`, stall flag propagation, resume-limit disable.

### Task 6: editor host + autosave + metrics

**Files:** `src/app/editor/editor-host.ts`, `src/app/metrics.ts` + metrics spec.
**Contract:** component mounts editor-core (`corePlugins()`, `variantNodeViews`) from a draft's doc JSON, dispatch loop syncs a signal; 1 s debounced autosave via client.save with revision append; retryable failures use capped exponential backoff, permanent failures yield to the newest snapshot, and draft replacement or component teardown cancels retry activity without clearing the persistent unsaved badge; format badge from doc.attrs.format. `metrics.ts` (pure): `computeMetrics(docJson, wpm=150)` → total words, per-beat {words, estimatedMs, targetMs, ratio} — verbatim spec with a fixture doc. Pacing bar renders ratio per beat (component thin).

### Task 7: selection toolbar + operation launch + proposal bridge

**Files:** `src/app/editor/selection-toolbar.ts`, `src/app/editor/proposal-bridge.ts` (+ pure-logic spec for the bridge decision table).
**Contract:** toolbar appears on non-empty selection (plain DOM positioning like the Spike 2 demo); actions: Review, Rewrite, Alternatives (count 2–3), Custom instruction, Lock, Annotate, Flag-for-evidence (annotation kind evidenceFlag). Presets contribute structural daemon-defined scope only, while editorial scope and creative phase come from explicit user-entered or stored draft state; launch fails visibly when the draft has no phase. Launch flow per the bridge decision table (spec'd verbatim as a pure function): rewrite → editor-core `requestProposal` at submit + `receiveProposal` on schema result (replacement_markdown) → ProposalLayer accept/reject; re-roll → daemon resume + a fresh receiveProposal on the SAME target (previous proposal rejected first); alternatives and review acquire editor-core-managed anchors at submit, resolve their mapped ranges at result time, and apply variants/findings only through mapped editor-core commands; guardrail → callout only, document untouched. Conflicted proposals surface labeled base/current/proposed values verbatim, with Accept disabled. Console re-roll is enabled only while the operation has a live owning editor runtime and remains within the daemon's three-hop limit. The composition spec mounts the real Angular Studio and routed Console surfaces with a stub client and drives production controls through pending, proposal acceptance, failures, guardrails, variants, findings, conflicts, approval, and console rendering.

### Task 8: draft manager + revisions

**Files:** `src/app/drafts/…` + revision diff pure spec.
**Contract:** list/create (blank narration-format doc with one beat)/open; import: paste-or-pick a repo-relative path → client.import; export: client.export → on 409 render blocked reasons; on success, offer artifact write via a path field (topics/drafts whitelist mirrored client-side) surfacing CAS conflicts. Revision timeline: list, select-two diff (pure text diff of extracted narration, spec'd), restore (save-as-new-revision).

### Task 9: brief panel + approval gate + console

**Files:** `src/app/panels/…`.
**Contract:** brief/boundary panel edits draft metadata (topic, anchors[], unknowns[], approvedLessons[], creativeStatus phase) persisted with the draft and fed to every envelope; approval gate: explicit "Approve premise/voice/hook/story direction" toggle (stored; enables Promote button — Promote launches the op and shows its console stream; no further Phase 2 UI in this plan); agent console page: durable daemon operation history is the source of truth, refreshed while the page is mounted, with live tracker events retained as supplemental in-flight detail; rows render state and telemetry and allow cancellation while non-terminal; parking-lot panel (from editor-core `getParkingLot`); findings panel with orphan indicators.

### Task 10: styling pass

**Contract:** one coherent pass: WHP-adjacent identity (charcoal `#323232` text, off-white `#f8f8f8` ground, single red `#aa0a0a` accent for primary actions and the locked-passage tint), readable editor typography (~68ch measure), consistent panel chrome. No component library.

### Task 11 (controller): deterministic UI E2E + one real pass

- [ ] Build app; run daemon with `SC_CODEX_BIN` → fake codex and staticRoot; drive the browser end-to-end: create draft → type → select → Rewrite → pending indicator → proposal diff → accept → verify text + revision appended; Alternatives → variant set → pick → parking lot; Review → findings pins; lock a passage → rewrite overlapping it → conflict surfaced; export blocked → settle → export; console shows telemetry. Then ONE real-codex rewrite through the UI (unset override). Record everything for evidence.

### Task 12: evidence + close-out

- [ ] `docs/superpowers/evidence/2026-07-23-script-creator-plan4-studio.md` from real outputs; final whole-branch review (fresh reviewer); fix loops to PASS/APPROVED.

## Plan sequence reminder

Plan 5 (Topic Studio + pipeline board + full-run progress UI), Plan 6 (gates/Promote depth, validator UI, milestone git flow UI), Plan 7 (learning loop) follow.
