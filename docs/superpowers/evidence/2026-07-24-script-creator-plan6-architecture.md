# Script Creator — Plan 6 Architecture, Production, and Milestones: Evidence

**Date:** 2026-07-24
**Plan:** [2026-07-24-script-creator-plan6-architecture.md](../plans/2026-07-24-script-creator-plan6-architecture.md)

## Deterministic suites (host, two consecutive runs each)

- Server: 44 files / 395 tests, twice; `tsc --noEmit` clean.
- App: 27 files / 184 tests, twice; `tsc --noEmit` clean; `ng build` completes
  (pre-existing initial-bundle and Topics component-style budget warnings only).
- editor-core: 11 files / 44 tests; `tsc --noEmit` clean.
- Python validator: `python3 -m unittest test_validate_annotated_script.py` OK.
- `git diff --check` clean; working tree clean at evidence time.

## Contract corrections made while planning

The accepted amendment said "nine fixed sections" but the skill reference's
"Architecture artifact" has **eleven** (`Viewer belief shift` naming and
`Scope boundary` were missing). The amendment was corrected to mirror the
reference exactly, and a server source-sync test now parses
`references/script-architecture.md` so any future skill drift fails the suite —
same doctrine as the `WHP_PROGRESS/2` sync test.

## Browser sweep (binding): `npm run e2e:plan6` — VERIFIED

Playwright/Chromium drives the built routed app against the real daemon with
`SC_CODEX_BIN=fake`, in a temporary `git clone` with isolated XDG homes (the
developer checkout is never written). One scripted pass covers: seeded durable
topic run → handoff (blocked until the recommended-branch workspace choice, then
resumed from the durable saga) → architecture generate → per-section proposals
(reject one, accept rest) → review finding pinned → one section refined and
accepted → approve (canonical `whp-youtube/architectures/<slug>.md` written in
the episode worktree; pipeline `architecture → prototyping`) → episode
generation proposal accepted → reopen (confirm dialog; ribbon `reopened`;
reconciliation callout; narration preserved) → re-approve → fresh accepted
generation clears reconciliation server-side → typed narration edit →
complete-narration approval (canonical draft written; pipeline
`creative-approved`) → staged fake Promote to
`whp-youtube/episodes/01-the-queue-game.md` (stops at `validation-required`) →
production sections rendered → PI response integrated by proposal → validator
fail → corrected → exact-hash pass → Complete Promote (phase/pipeline
`production`) → pending milestone visible → **no commit exists anywhere before
the explicit Commit milestone action** → explicit commit succeeds.

### Defects the sweep caught (all fixed and committed on this branch)

1. **Stale architecture revision state** — narration edits bump the shared
   revision sequence; the panel's approve/reopen used a cached seq and 409ed.
   Gate actions now re-read authoritative state first (`model.ts`), with the
   server revision check still guarding real races.
2. **Reconciliation flag never cleared server-side** — accepting an episode
   proposal generated under the current approval flipped the flag only in
   client memory; the authoritative store stayed `true` and would refuse
   narration approval. `resolveNarrationProposal` now clears it iff the
   proposal was registered at-or-after the current `approvedAt`; the UI reflects
   server state instead of an optimistic flip.
3. **Autosave clobbered workflow state** — the editor's autosave wrote its
   stale `metadata.creativeStatus` back, regressing phase
   `rapid-prototype → architecture` after approval. Generic draft saves now
   preserve the stored workflow metadata; only dedicated gate actions change
   phase.
4. Panel re-render gap: the architecture panel tracked only its internal view
   version; external model refreshes now propagate via a bound version input.

## Real-codex spot operations (binding): `RUN_REAL_CODEX=1 npm run e2e:plan6-real` — VERIFIED

Against the real repository (temp XDG state; HEAD and porcelain status proven
unchanged): a forged draft-less `generate-episode` submission with
`creative_status`/`approved_architecture_md` in the inputs is refused (HTTP 400,
no operation created) — the approved-context anti-forgery gate holds against the
real CLI path. Real `generate-architecture` returned non-empty heading-structured
raw Markdown; real `review-architecture` and `rewrite-architecture-section`
returned strict-schema frames. No approval, repository write, Promote, or commit
was performed.

## Final review loop (Task 14)

The fresh whole-branch review returned FAIL with five lifecycle-integrity
findings concentrated in the approve/reopen/reconcile state machine
(`.superpowers/sdd/p6-final-review-report.md`). Four fix waves, each gated by a
fresh confirmation review, closed them:

1. **Wave 1:** Reopen gate before content changes; recovery-path settlement
   clears reconciliation with the same eligibility rule; explicit
   revision-checked Mark-narration-reconciled action; approval sagas pause with
   a durable resume key instead of presenting as approved; stale uncommitted
   same-kind milestones supersede (migration v9) instead of deadlocking.
2. **Wave 2:** generic narration writes (autosave, proposal replacement,
   import) refuse with a recoverable 409 while an approval saga is paused; the
   editor blocks with a callout.
3. **Wave 3:** the saga machinery generalized to one contract — any pending
   architecture saga kind (approve *and* reopen) reserves writes, exposes its
   kind + opaque resume key, resumes through one route, and pause responses
   carry current state; cancelled accepted-proposal saves keep operation
   provenance for post-resume settlement.
4. **Wave 4:** a centralized conflict-routing helper wired into every routed
   write consumer, so a stale client adopts another client's pending saga and
   shows the correct Resume without reload.

Each wave was re-proven by the extended browser sweep (VERIFIED), which now
also drives paused-saga resume across reload, approved-state control lockout,
the reconcile confirmation, and the blocked-editor reservation live.
**Confirmation review 4: Spec compliance PASS / Code quality APPROVED.**
Final totals: server 44 files / 411 tests ×2, app 27 files / 203 tests ×2,
editor-core 11 / 44, typechecks and `ng build` clean, sweep VERIFIED.

## Verdict

Blocks A–C of Plan 6 are implemented, committed task-by-task, and proven in the
running app end to end: FR-2.1/FR-2.2 architecture stage with explicit approval
gating episode narration, FR-5.1–5.3 staged Promote behind the exact-hash
Python validator, FR-6.1/6.3/6.4 production surface, and FR-7.3 explicit
milestone commits from managed episode worktrees. The whole-branch final review
is the remaining Task 14 gate before merge.
