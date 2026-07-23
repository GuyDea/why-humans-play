# Script Creator — Plan 5 Topic Studio: Evidence

**Date:** 2026-07-23
**Plan:** [2026-07-23-script-creator-plan5-topics.md](../plans/2026-07-23-script-creator-plan5-topics.md)
**Deterministic suites at verdict:** server 37 files / 259 tests; app 24 files /
153 tests — green on the host; typecheck and `ng build` clean (after fix wave 1,
below).

## Browser verification (real Chrome, daemon + fake codex, three phases)

- **Catch/Open/Decide:** idea captured to the inbox; ideate produced angle cards
  appended as ideate-sourced ideas; per-idea gate-check rendered the six-gate result
  block with verdict badge and persisted to the idea (`latestCheck`), surviving
  reloads.
- **Full run:** launch → the mandated checklist rendered live with the skill's
  verbatim texts advancing to done → completion produced the report and a
  **33-row sortable candidate board** (11 sort controls), winner card, package
  directions with survival highlighting. *(Originally twelve rows under
  `WHP_PROGRESS/1`; re-verified at thirteen rows under the skill-owned
  `WHP_PROGRESS/2` manifest after fix wave 1.)*
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

## Final review fix wave 1 (browser re-verified)

The whole-branch final review returned seven findings
(`.superpowers/sdd/p5-final-review-report.md`); all were fixed and the affected
flows re-verified in real Chrome against the daemon + fake codex:

- **WHP_PROGRESS/2:** the live checklist rendered all **thirteen** manifest rows
  (including the new `06-proof-cases`) with the skill's verbatim texts, heading
  derived from the manifest count ("13-step checklist", 13/13 done). A server sync
  test parses `SKILL.md` plus the transport manifest, so future checklist drift
  fails the suite. The summary now enforces cross-invariants (seven score/grade
  pairs per shortlist row, exactly three package directions per top-three
  finalist, winner drawn from the finalists) — the rendered board showed nine
  package rows across three finalists.
- **Idempotent handoff saga:** confirm created the draft in phase `architecture`,
  wrote the brief, upserted the pipeline row, promoted the idea; a second confirm
  from the reopened durable run navigated to the **same draft id** — still one
  draft, one pipeline row.
- **Gate-check lifecycle:** the launch button stayed disabled ("Checking…")
  through completion *and persistence*, six distinct gates rendered (enum-cycled
  PASS/FAIL/UNKNOWN), and the persisted check survived reload.
- **Pipeline navigation:** a draft-less card deep-linked to
  `/topics?topic=<slug>&ref=<ref>` and the page rendered the repository brief
  content on arrival.
- **Pipeline diagnostics:** a deliberately malformed `PIPELINE.md` produced
  row-numbered diagnostics on the board ("Row 5: … three-cell …", "Row 6:
  Duplicate … slug", "Row 7: … empty required cell") while valid rows stayed
  visible; ENOENT still reads as "no pipeline".
- **Central migrations:** one shared registry owns the state-database version
  sequence (documents v1–v2, topics v3, gate-check v4, architecture reserved v5)
  with upgrade tests from v2/v3/v4 shapes.

## Verdict

**FR-1 is complete in the running app.** Idea capture, ideation, gate checks, the full
selection protocol with its checklist live on screen, a sortable evidence board,
package stress-testing, and a one-click handoff that lands a correctly-phased draft, a
repo brief, and a pipeline card — all verified in the browser against deterministic
fixtures, with the live-skill path proven by real gate-check and ideate operations.
The architecture phase from the accepted amendment is already flowing through handoff
and the pipeline ladder, ready for Plan 6's implementation block.
