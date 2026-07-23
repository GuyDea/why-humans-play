# Script Creator — Plan 5 Topic Studio: Evidence

**Date:** 2026-07-23
**Plan:** [2026-07-23-script-creator-plan5-topics.md](../plans/2026-07-23-script-creator-plan5-topics.md)
**Deterministic suites at verdict:** server 34 files / 242 tests; app 24 files — green
on the host; typecheck and `ng build` clean.

## Browser verification (real Chrome, daemon + fake codex, three phases)

- **Catch/Open/Decide:** idea captured to the inbox; ideate produced angle cards
  appended as ideate-sourced ideas; per-idea gate-check rendered the six-gate result
  block with verdict badge and persisted to the idea (`latestCheck`), surviving
  reloads.
- **Full run:** launch → the twelve-row mandated checklist rendered live with the
  skill's verbatim texts advancing to done → completion produced the report and a
  **33-row sortable candidate board** (11 sort controls), winner card, package
  directions with survival highlighting.
- **Durable runs:** after a daemon restart and reload, the completed run appeared in
  the run history, reopened to the full board from the persisted summary, and package
  testing + handoff operated on the durable data.
- **Handoff:** preview → confirm created the studio draft **in phase `architecture`**
  (per the accepted architecture amendment), wrote `whp-youtube/topics/<slug>.md` via
  the CAS artifact path, upserted the pipeline row, marked the idea promoted, and
  navigated to the draft.
- **Pipeline board:** kanban rendered the full ladder — Idea, Candidate, Selected,
  **Architecture, Architecture approved**, Prototyping, Creative approved, Production,
  Record ready, Recorded — with the handoff card placed correctly.

**Real-codex passes (full run deliberately excluded — 30–120 min class, recorded):**
a real quick-gate-check returned verdict `pass` with six genuine editorial gates
("The queue is a genuine hidden game: people choose whether to join, stay, leave, or
switch…") rendered as chips; a real ideate returned **12 angle cards** ("UNO began as
a house-rule fix", …) appended to the inbox.

## Findings (fixed during Task 8, committed)

- **F1 — session-crash recovery:** the coordinating window died mid-fix; the ledger +
  git recovered state exactly, and the interrupted implementer resumed over its own
  partial tree. The durable-progress discipline paid for itself.
- **F2 — gate-check delivery chain (three-stage fix):** the rendered button initially
  bypassed the tracked lifecycle; then results weren't persisted to ideas; then the
  fake's synthesizer emitted six copies of the *same* gate (first-enum-value bias) and
  the page's honest six-distinct-gates validation rejected it — the failure callout
  reported precisely that, once actually read. Fake now cycles enum values per array
  item.
- **F3 — schema-version skew (real defect):** the topics store bumped the shared
  SQLite `user_version` to 4 while DocumentStore capped support at 3 — a daemon could
  create a state database it refused to reopen. Found live, fixed with a unified cap
  and a context-reopen regression the suites had been missing.
- **F4 — durable runs UI:** completed runs vanished from the page on reload despite
  durable server rows (the Plan 4 console class, second instance). The run history now
  reads the durable list and reopens boards from persisted summaries.

## Verdict

**FR-1 is complete in the running app.** Idea capture, ideation, gate checks, the full
selection protocol with its checklist live on screen, a sortable evidence board,
package stress-testing, and a one-click handoff that lands a correctly-phased draft, a
repo brief, and a pipeline card — all verified in the browser against deterministic
fixtures, with the live-skill path proven by real gate-check and ideate operations.
The architecture phase from the accepted amendment is already flowing through handoff
and the pipeline ladder, ready for Plan 6's implementation block.
