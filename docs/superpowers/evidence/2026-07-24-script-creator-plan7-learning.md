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

## Fix wave 2 ledger note

Confirmation-review wave 2 binds each reconciliation to its exact handoff
token and recorded prepared HEAD, removes later durable-doctrine snapshot
shadows, validates complete accepted-result transitions before persistence,
closes generic submit/resume bypasses, and repairs closed v10 backfill
sessions through once-per-version schema v12. The browser sweep now uses a
shared harness with separate Plan 6 and Plan 7 scripts; the Plan 7 external
commit simulation adds the prepared reconciliation token.

Final single-run totals:

```text
Server:
 Test Files  49 passed (49)
      Tests  543 passed (543)

editor-core:
 Test Files  11 passed (11)
      Tests  44 passed (44)

App:
 Test Files  28 passed (28)
      Tests  215 passed (215)
```

All three `npx tsc --noEmit` checks exited 0. `npm run build` exited 0 with
`Application bundle generation complete. [3.683 seconds]` and the existing
budget warnings. Both browser scripts compiled and completed clone/build, but
this sandbox refused each daemon before interaction with `listen EPERM:
operation not permitted 127.0.0.1`; the localhost-enabled controller remains
the authority for the two browser passes.

## Fix wave 2 calibration — opaque architecture acceptance

The sequential-accept regression was a parser-identity mismatch. The browser
and server deliberately preserve the same opaque raw slice but derive different
local `opaque-*` keys for it. Acceptance proof now keeps strict identity for
fixed sections and treats opaque keys as parser-local aliases only when the
section title and raw Markdown both match the completed operation result
exactly. Content absent from that result remains refused.

The regression obtains the fake Codex executable's real Generate Architecture
Markdown, submits all thirteen fixed sections followed by its
`Fixture-only production note` browser proposal, and proves all fourteen
sequential accepts. The forged-extra-section refusal remains covered.

Focused RED evidence: the first thirteen accepts completed, then the final
opaque save threw `architecture acceptance proof refused: revision contains
changes outside the accepted operation proposal`. The focused green run
reported 2 passed, including the forged-extra refusal.

### Requested single-run server verification

`npx vitest run`:

```text
 Test Files  49 passed (49)
      Tests  543 passed (543)
```

`npx tsc --noEmit`: exit 0 with no TypeScript compiler diagnostics; npm emitted
only its existing `node-linker` user-config warning.

## Fix wave 2 calibration — whole-episode acceptance correspondence

The live 500 was another parser-identity mismatch. Editor-core creates fresh
random beat IDs on every `parseMarkdown` call, while the product accepts a
whole-episode proposal by parsing it in the editor and merging the parsed
document with stored draft context. The server then parsed the same raw
Markdown again and compared complete ProseMirror nodes, so equal two-beat
narration had different beat IDs and failed `Node.eq()`.

The draft-preservation transform now lives in editor-core and is shared by the
app and server. Whole-episode acceptance replays the fake's exact raw Markdown
through real `parseMarkdown` plus `preserveDraftDocument`, then compares only
ordered narration content: beat titles and their complete narration blocks.
Stored topic, anchors, creative status, schema metadata, preamble, beat IDs,
time targets, and other preserved attributes do not participate. Every
acceptance-proof failure is a typed recoverable `409` with
`code: acceptance-proof-refused`; forged narration is refused before either a
revision or proposal disposition is persisted.

The regression obtains the fake Codex executable's exact two-beat episode
Markdown and derives the accepted document through the shared editor transform.
It proves the fresh HTTP save-plus-ledger-resolution path and the
post-Reopen settled-export auto-resolution path, and separately proves forged
content returns the structured refusal while its proposal remains pending.

Focused RED evidence: the fresh path returned `500` instead of `200`, the
post-Reopen path threw `narration acceptance proof refused`, and the forged
path returned `500` instead of `409`. The focused green run reported 3 passed,
28 skipped. The app preservation spec, editor-core public API check, and both
package type checks also passed.

### Server verification

The full `npx vitest run` command was run once:

```text
 Test Files  49 passed (49)
      Tests  546 passed (546)
```

The first `npx tsc --noEmit` invocation caught only that the new test's compact
operation fake was narrower than the broad HTTP-service type. After a type-only
fixture cast, the corrective `npx tsc --noEmit` run exited 0 with no TypeScript
compiler diagnostics; npm emitted only its existing `node-linker` user-config
warning. No implementation code changed after the full Vitest run.

## Fix wave 2 calibration — first narration acceptance baseline

The live refusal came from requiring an earlier narration-kind revision before
whole-episode acceptance proof could run. A fresh topic-handoff draft has only
architecture-kind revisions before its first episode acceptance, so the valid
save returned `narration acceptance proof refused: saved revision does not
equal the operation proposal`.

Pre-save acceptance proof now uses the draft's effective stored document as the
first-narration baseline for both change detection and
`preserveDraftDocument` replay. The validated save atomically binds its
revision to the still-pending narration proposal through the existing
`accepted_revision_id`, allowing restart-safe settlement to mint the decision
without requiring a nonexistent earlier narration revision. Repeated
settlement remains idempotent. The no-op guard compares narration content, so
an unprotected metadata-only difference cannot disguise unchanged narration.

The regression saves a genuine fake whole-episode result as the first
narration revision after an architecture-only handoff revision, resolves it,
and proves exactly one `proposal-accepted` decision is minted. Its paired
regression starts from identical narration, changes only topic metadata, and
proves the save remains a structured `409` with no new revision or decision.
Existing later-narration and post-Reopen cases remain covered.

Focused RED evidence: the first-narration save returned `409` instead of
`200`. The metadata-only no-op refinement independently returned `200` instead
of `409`. The focused green run reported 2 passed, 31 skipped.

### Requested server verification

The full `npx vitest run` command was run once:

```text
 Test Files  49 passed (49)
      Tests  548 passed (548)
```

The requested `npx tsc --noEmit` invocation reported:

```text
src/learning/service.ts(1796,27): error TS2304: Cannot find name 'DraftDocument'.
```

After adding that missing type-only import, the necessary corrective
`npx tsc --noEmit` run exited 0 with no TypeScript compiler diagnostics; npm
emitted only its existing `node-linker` user-config warning. No runtime code
changed after the full Vitest run.

## Fix wave 2 calibration — atomic personal-input acceptance

The live refusal came from replaying only a partial representation of the Plan 6
Task 9 editor transaction. The operation evidence retains the complete
`#### Personal input` subsection, while the editor mechanically changes its body
`opaqueSection`; comparing that full subsection directly with one opaque node
prevented the matcher from locating the PI block. The editor and proof also
maintained separate copies of the transaction logic, whose single-text-child
marker condition could not preserve marked inline evidence content.

The PI transaction now lives in editor-core and is shared by the routed editor
and server proof. It requires one exact PI marker and one exact PI body, replaces
only the marker with the returned narration, flips only that body's
`Decision: INPUT-REQUESTED` to `COMPLETED`, and preserves surrounding inline
nodes and marks. The server mechanically extracts the one ID-matched body from
the operation's complete PI subsection, validates that the scoped PI ID implies
the exact marker, replays the shared transaction, and compares the complete
resulting document. Any additional narration or appendix change remains
refused.

The regression reads the real
`.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`
used by fake Promote, runs `importProductionMarkdown`, and derives the accepted
document through the shared production PI transform. It proves the atomic save
and `personal-input-integrated` decision while retaining all five inline
`[F-001](...)` indicators. Its paired forgery derives from that accepted
document, adds narration absent from the operation, and remains refused without
persisting a revision or settling the proposal. A focused editor-core case
applies a mark to an evidence indicator in the same real template and proves
the transform preserves it.

Focused RED evidence: the genuine save threw `narration acceptance proof
refused: saved revision does not equal the operation proposal`, while the
forged-extra case was already refused. The marked-inline characterization also
returned no transaction under the old single-child rule. The focused green
runs reported 2 passed for the server pair and 1 passed for the editor-core
inline-preservation case; the routed production composition characterization
remained 1 passed.

### Requested single-run server verification

`npx vitest run`:

```text
 Test Files  49 passed (49)
      Tests  550 passed (550)
```

`npx tsc --noEmit`: exit 0 with no TypeScript compiler diagnostics; npm emitted
only its existing `node-linker` user-config warning.
