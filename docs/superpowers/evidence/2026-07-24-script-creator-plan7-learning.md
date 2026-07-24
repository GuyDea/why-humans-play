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

## Fix-wave refinement — live variant-pick decision capture

The Plan 7 browser flow exposed an autosave-boundary regression after normative
decision hardening. Editor-core correctly serialized the generated alternative
as an inline `inlineVariantSet` whose attrs contained `variantId`,
`originOperationId`, `activeIndex`, `settled`, and the complete `options` array.
Its real pick transition removed that node and inserted the active option's text.
However, `DebouncedAutosave` allowed the immediate pick snapshot to supersede the
still-pending variant-insertion snapshot, so the server received no
variant-bearing predecessor and correctly refused to mint the decision.

The editor now begins draining the variant-bearing snapshot before dispatching
the pick. The server proof also requires a completed `generate-alternatives`
operation and replays editor-core's real pick against the predecessor; only an
exact resulting editor document qualifies. A mounted production regression
asserts the two real serialized saves in order. Server regressions derive the
before/after documents from editor-core's actual inline insertion and pick,
confirm the genuine decision is idempotently captured, and confirm both
defect-era null-origin data and a forged arbitrary-removal transition remain
excluded.

Focused red/green evidence: before the editor fix, the mounted production test
reported `expected [...] to have a length of 2 but got 1`; after the fix it
passed. The browser sweep itself could not be rerun in this restricted sandbox
because its daemon failed before the flow at `listen EPERM ... 127.0.0.1`; that
environmental refusal is not counted as verification.

### Requested single-run server verification

`npx vitest run`:

```text
Test Files  49 passed (49)
     Tests  522 passed (522)
```

`npx tsc --noEmit`: exit 0 with no TypeScript compiler output.

## Fix-wave refinement — genuine validator fix-cycle revisions

The live Plan 7 sweep exposed a validator-fix omission after the proof was
hardened to reject incidental revisions. Plan 6's corrected-target path does
not produce a generic accepted fixture: `DocumentService.syncPromotionOutput`
appends the exact target as a narration revision with the real disposition
`production-import`. The draft-scoped validate route recorded the passing
attempt before that synchronization, so the decision projector could not see
the genuine fix revision. A synchronous import and attempt can also share one
millisecond.

The route now validates and reads the stable target, re-imports it, and only
then appends the validator attempt. The interposed-revision boundary includes a
qualifying revision stamped at the same instant as the pass, and resolved
evidence uses the same boundary. The regression obtains its corrected revision
through Plan 6's real `syncPromotionOutput` path and asserts the resulting
`production-import` shape; a second pass at the same fixed hash remains
deduplicated by failure-attempt ID plus fixed hash. A real `DocumentService`
manual save also qualifies, while real autosave and restore dispositions plus
an `ArchitectureService` architecture revision remain refused.

Focused RED evidence: route order was `record attempt → re-import`
(`expected 3 to be less than 2`), and the equal-millisecond corrected import
returned no decision (`expected null to match object`). Both regressions passed
after the ordering and inclusive-boundary fixes.

### Requested single-run server verification

`npx vitest run`:

```text
Test Files  49 passed (49)
     Tests  523 passed (523)
```

`npx tsc --noEmit`: exit 0 with no TypeScript compiler diagnostics; npm emitted
only its existing `node-linker` user-config warning.

## Fix-wave calibration — content-changing validator revisions

The preceding validator-fix refinement's categorical autosave exclusion was
incorrect for the live editor flow. Martin's manual narration edit is persisted
as an ordinary `autosave`; there is no separate manual-edit disposition. The
projector now qualifies an interposed revision by proof instead of label: it
must be a narration revision, must differ from the preceding narration
revision, and must not be a restore. This admits content-changing autosaves,
manual saves, accepted proposal revisions, and production re-imports while
still refusing architecture revisions and content-unchanged saves.

The live regression derives the fix through a real `DocumentService` autosave
between a failed exact-hash attempt and a passing attempt at a new hash, then
resolves that autosave in the captured evidence. Separate regressions refuse a
new pass hash with no draft edit and a content-unchanged autosave even when an
architecture revision is interposed. The existing failure-attempt-ID plus
fixed-hash dedup identity remains unchanged.

Re-validation's mechanical boundary is covered separately: production
synchronization exports the current draft before the validator rerun, and an
out-of-band target hash causes a synchronization conflict before a second
validator call. The external target therefore cannot manufacture a passing
cycle without a qualifying draft revision.

Focused RED evidence: the real autosave cycle initially returned
`expected null to match object`; after autosaves were admitted, the strengthened
no-op case with an interposed architecture revision initially returned a
`validator-fix-cycle-accepted` decision instead of `null`. Comparing against the
previous narration revision made the full focused calibration set pass:
6 passed, 42 skipped.

### Requested single-run server verification

`npx vitest run`:

```text
 Test Files  49 passed (49)
      Tests  526 passed (526)
```

`npx tsc --noEmit`: exit 0 with no TypeScript compiler diagnostics; npm emitted
only its existing `node-linker` user-config warning.
