# Script Creator — Plan 7 Learning Loop: Evidence

**Date:** 2026-07-24
**Plan:** [2026-07-24-script-creator-plan7-learning.md](../plans/2026-07-24-script-creator-plan7-learning.md)

## Deterministic suites (host, two consecutive runs each)

- Server: 49 files / 505 tests, twice; `tsc --noEmit` clean.
- App: 28 files / 215 tests, twice; `tsc --noEmit` clean; `ng build` completes
  (pre-existing budget warnings only).
- editor-core: 11 files / 44 tests; clean.
- `git diff --check` clean; working tree clean at evidence time.

## Browser sweeps (binding)

- **`npm run e2e:plan7` — VERIFIED.** The full learning loop in real Chromium
  against the daemon + fake codex in an isolated clone: captured decisions from
  real dispositions (reject with why-note, re-roll with why-note then accepted
  successor, variant pick, gate actions, PI integration, validator-fix cycle) →
  explicit Distill (frozen inputs) → proposals on `/lessons` with decision
  provenance → edit-before-approve an episode-local lesson → the next
  draft-scoped operation envelope carries **exactly** the reviewed text
  (verified byte-for-byte in the agent console's immutable inputs, with lesson
  ID provenance) → retire removes it from the following envelope → a durable
  candidate produces a prepared reconcile-whp handoff (no repository write, no
  commit) → wrong-commit verification returns the structured mechanical refusal
  → genuine reconciliation commit verifies and the app stores only repository
  provenance → daemon restart preserves the awaiting-reconciliation state
  without duplication. No commit exists before the explicit milestone action.
- **`npm run e2e:plan6` — VERIFIED** (Plan 6 lifecycle unbroken).

### Defects the sweep caught (fixed and committed on this branch)

1. **Alternatives ledger leak:** variant sets did not settle a proposal-ledger
   row, silently blocking narration approval. Alternatives are now variant-set
   insertions that create no proposal row; picks carry operation provenance;
   approval refusals name every unresolved operation mechanically.
2. **Resumed-successor tagging:** a re-rolled proposal's accepted successor
   save was tagged with the predecessor's operation, leaving the successor's
   ledger row pending; `OpTracker.resume` now records successor metadata.
   Settlement failures surface through the operation-error alert instead of a
   silent no-op.
3. **Verification 500s:** verifying a reconciliation commit that lacked the
   doctrine change returned a raw 500; unknown commits, doctrine-free commits,
   and missing anchors now return structured recoverable refusals naming what
   was checked.

## Real-codex spot operation (binding): `RUN_REAL_CODEX=1 npm run e2e:plan7-real` — VERIFIED

One real Distill over provenance-pure frozen inputs returned a strict
six-field result; no approval, repository write, or commit occurred and
HEAD/status were proven unchanged.

## Verdict

FR-8 is complete in the running app: decisions are retained automatically with
optional why-notes, distilled into evidence-linked proposals by the skill,
applied only after Martin's approval — episode-local lessons as
server-authoritative envelope context, durable doctrine only through the
repository's reconcile-whp flow — with no shadow doctrine anywhere in the app.
The whole-branch final review is the remaining gate before merge.
