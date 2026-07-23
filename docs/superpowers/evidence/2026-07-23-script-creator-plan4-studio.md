# Script Creator — Plan 4 Script Studio: Evidence

**Date:** 2026-07-23
**Package:** `script-creator/app/` (Angular 20, embedding editor-core's ProseMirror
directly per the reconciled deviation) + authorized server additions.
**Plan:** [2026-07-23-script-creator-plan4-studio.md](../plans/2026-07-23-script-creator-plan4-studio.md)
**Deterministic suites at verdict:** app 21 files / 108 tests; server 30 files; editor-core
11 files / 44 — all green on the host; `tsc --noEmit` clean in both TS packages;
`ng build` clean. (Angular 22 requires Node ≥ 24.15; the workspace pins Angular 20,
which accepts the installed Node 24.10.)

## Browser verification (real Chrome via Playwright, daemon + fake codex)

The full studio loop was driven live against the running daemon
(`SC_CODEX_BIN` → fake codex in `operation-schema` mode, schema-aware synthesis):

1. Launch URL `#nonce` consumed, stored, and scrubbed; a stale stored nonce no longer
   outranks a fresh fragment (fixed during verification).
2. Draft created; typing autosaves — four autosave revisions listed with checkboxes for
   diff selection; drafts and revisions survive daemon restarts (durable XDG SQLite).
3. Native selection summons the floating toolbar (Review / Rewrite / Alternatives /
   Custom instruction / Lock / Annotate / Flag for evidence).
4. Rewrite: submit → streaming console entries (9 for the fake run) → inline proposal
   diff with Accept / Reject / Re-roll → Accept applied exactly at the re-anchored
   target.
5. Alternatives: result inserted an in-document variant set at the live selection.
6. Export while the variant was unsettled: blocked with the precise reason
   (`variant bridge-2 unsettled`, from the daemon 409). Pick active settled the
   document; export then produced clean narration markdown.
7. Approval gate: "Approve premise/voice/hook/story direction" (with the doctrine
   microcopy "Passage approval does not approve the episode direction") enables the
   Promote button; disabled otherwise.
8. Agent console (`/console` route): durable operation history served by the new
   `GET /api/ops` — four operations across daemon restarts including a historical
   `invalid-output`, per-operation verbatim telemetry, cancel/re-roll disabled on
   terminal records.

**Real-codex pass:** with the override removed, one Rewrite through the UI returned a
schema-valid replacement from the actual `$writing-whp-youtube-scripts` skill —
"humans can turn almost any pleasure into a performance review." — rendered as a
proposal and accepted into the document.

## Findings (all fixed during Task 11, committed on the branch)

- **F1 — missing `GET /api/drafts`.** The client called a list endpoint Plan 3 never
  registered (contract said "CRUD"; only per-id routes existed). Cross-plan contract
  gap; fixed with an inject-tested list route.
- **F2 — stored nonce outranked the launch fragment,** breaking daemon relaunches until
  storage was cleared. Fragment now always wins and overwrites storage.
- **F3 — the composition disease (three instances).** `SelectionToolbar`, then
  `SelectionRuntime` (tracker + proposal bridge), then all four Task 9 panels plus
  routing existed only in their own files and specs — nothing mounted them. Root cause:
  task-scoped implementation with unit tests, no composition step and no integration
  net. Fixed by composing the full surface AND adding `studio-composition.spec.ts` — a
  framework-free jsdom test mounting the composed editor surface with a stubbed client,
  asserting pending indicator, rendered proposal, failure callout, console entries,
  variant settling, findings, and the approval gate. **Plan 5+ rule: every plan with UI
  gets a composition task and a composition spec from day one.**
- **F4 — silent operation failures.** A failed/invalid/timed-out operation rendered
  nothing; now a failure callout + console entry (guardrails keep their distinct
  callout).
- **F5 — fake codex synthesized only the rewrite shape.** It now reads the
  `--output-schema` file and synthesizes a minimal conforming instance for any
  operation, keeping UI E2E deterministic across all operations.
- **F6 — in-memory console died on route change.** The console now reads the daemon's
  durable operations via the new `GET /api/ops` (missing-list-endpoint class, second
  instance), refreshing while mounted.

## Post-review hardening

The final whole-branch review (fresh reviewer) returned FAIL with seven findings and
correctly caught two controller-verification lapses: the composition net tested
`composeStudio` directly instead of the production components that must call it, and
this evidence document had transcribed the implementer's overstated claim about it —
both now corrected. The fix wave resolved: provenance-pure envelopes (the preset
sentence and the `rapid-prototype` fallback removed; creative phase is explicit stored
draft state, edited in the brief panel, with launches refusing and instructing when it
is missing; an end-to-end provenance spec starts from stored draft + concrete user
action and proves every submitted key's origin); live editor-core anchors for
Alternatives and Review with concurrent-edit regressions (no more stale coordinates);
a real-component composition net mounting the production surface; the labeled
Base/Current/Proposed conflict widget with Accept disabled; runtime-owned re-roll
eligibility (no headless resumes from the routed console); editor-core `Decoration`
re-exports replacing the second deep-import regression; and a bounded, superseding,
destroy-cancelled autosave retry queue (the head-blocking data-safety issue, fixed
before merge as ruled). Suites after the wave: app 21 files green three consecutive
runs, editor-core 11 green, typecheck and `ng build` clean.

The two browser flows the review found unevidenced were then executed and recorded
live: a Review operation produced an anchored, severity-labeled finding in the findings
panel; a rewrite over a locked range produced the conflicted proposal rendering
`Base: "into a performance"` / `Current: "into a performance"` /
`Proposed: "Rewritten passage."` verbatim with Accept disabled. (The in-editor pin
decoration for findings is panel-verified; its visual treatment in the editor gutter is
styling-level and tracked for Plan 5 polish.)

## Verdict

**The Script Studio is real and usable.** Martin can open a browser page served by the
daemon, write narration with autosave and revisions, select any passage and run Review /
Rewrite / Alternatives against the actual editorial skills, watch the stream, accept
proposals that land exactly on the re-anchored target, settle variants, respect the
approval gate, export clean markdown, and audit every operation with verbatim telemetry
in a durable console. Remaining for later plans: Topic Studio (Plan 5), Promote/Phase 2
depth and milestone git UI (Plan 6), learning loop (Plan 7).
