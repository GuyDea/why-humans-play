# Script Creator — Plan 7 Learning Loop: Evidence

**Date:** 2026-07-24 (rewritten after fix waves 1–2; supersedes the pre-review
version, whose totals and claims were stale)
**Plan:** [2026-07-24-script-creator-plan7-learning.md](../plans/2026-07-24-script-creator-plan7-learning.md)

## Deterministic suites (host, two consecutive runs each, post-wave-2)

- Server: 49 files / 550 tests, twice; `tsc --noEmit` clean.
- editor-core: 12 files / 45 tests, twice; clean.
- App: 28 files / 215 tests, twice; `tsc --noEmit` clean; `ng build` completes
  (pre-existing budget warnings only).
- `git diff --check` clean.

## Contract sync and migrations

- The distillation skill contract is bound by a source-sync test that parses
  `SKILL.md` routing and `references/lesson-distillation.md` (classification
  enum `episode-local | durable`; six lesson fields; durable application
  assigned to reconcile-whp) — skill drift fails the server suite.
- Migrations v10 (learning store + provable-decision backfill + seeded first
  session), v11 (open-session cursor repair; closed-session repair; shadow-text
  scrub), v12 (snapshot provenance) run once-per-version through the central
  registry with populated-upgrade regressions (fresh v9; buggy-v10 open; v10
  closed-session).

## Decision capture: counted vs excluded (normative table enforced)

Counted, each with its full server-side proof (operation + result + settled
disposition + content correspondence replayed via the real editor-core
transforms): proposal accepted / rejected (with optional why-note) /
re-rolled (successor-tagged), variant picked (origin-bound options from the
operation result; atomic pick transition), gate actions (completed
sagas/approvals only), package picked, winner handed off (completed saga),
personal-input integrated (atomic marker replacement + Decision flip),
validator-fix cycle (deduped by failure-attempt + fixed hash; only
content-changing fix revisions qualify). Excluded with refusal tests: forged
disposition strings on unchanged or arbitrary saves, defect-era null-origin
variant sets, arbitrary rejection IDs, validator reruns without edits,
autosaves/restores as decisions, agent outcomes without explicit human
disposition. The v10 backfill applies the same proofs — unprovable revisions
are skipped, not converted.

## FR-8.5 no-shadow-doctrine boundary

After a durable lesson verifies, no app storage retains doctrine text — the
lesson candidate columns, reconciliation `prepared_markdown`, frozen
distillation snapshots, and the original proposing operation's artifacts
(`jobs.envelope_json`, job-dir files, result storage, operation APIs) are all
scrubbed or redacted to structured repository-reference placeholders, verified
by all-storage scan regressions for both edited and unedited candidates. Later
Distill envelopes carry only frozen repository references (commit, path,
anchor, content hash); the skill reads the doctrine file itself at run time. Verification requires
the commit to be a strict descendant of the recorded pre-handoff HEAD, to add
this handoff's unique reconciliation token, and to contain the lesson-specific
content (candidate added / predecessor removed). Each reconciliation claims
exactly one verified commit; a deliberate multi-lesson commit may be claimed by
several reconciliations, each strictly through its own token — a lesson whose
token the commit does not add can never claim it.

## Browser sweeps (binding, post-wave-2): both VERIFIED

- `npm run e2e:plan7` (independent script over the shared harness): full
  lifecycle — captured decisions from real dispositions → explicit Distill over
  frozen inputs → `/lessons` review with provenance → edit-before-approve →
  envelope carries exactly the reviewed text (byte-compared, with lesson-ID
  provenance) → retire removes it → durable candidate → prepared handoff (no
  repo write/commit) → wrong-commit refusal → genuine reconciliation commit
  verifies → daemon restart preserves state. No commit before the explicit
  milestone action.
- `npm run e2e:plan6`: Plan 6 lifecycle unbroken.

The sweeps drove the review loop's proof calibrations: every capture proof was
re-derived from the real product transforms (opaque forward-compat sections,
first-narration-revision baseline, parsed-markdown + preserved-metadata episode
acceptance, the atomic PI transaction, content-changing autosave fixes) after
the initial hardening refused genuine flows — with all forgery refusals kept.

## Real-codex spot flow (binding): `RUN_REAL_CODEX=1 npm run e2e:plan7-real` — VERIFIED

Fully genuine end-to-end against real codex (temp XDG; repository HEAD, branch,
and porcelain status proven unchanged): create draft → explicit current-branch
workspace → real `rewrite-selection` (strict schema result) → durable rejection
with why-note → exactly one genuine `proposal-rejected` decision minted under
the hardened proofs → real Distill via the draft-scoped route over the
server-frozen decision → strict six-field result frame. The generic submit
route's refusal of distill (`draft-scoped-submission-required`) was itself
exercised by this script's earlier version — the closure works.

## Verdict

FR-8 is implemented and proven in the running app under the hardened contracts:
automatic decision retention with optional why-notes, skill-owned distillation
over frozen evidence, Martin-gated application — episode-local lessons as
server-authoritative envelope context; durable doctrine only through
reconcile-whp with causally-bound verification — and no doctrine text stored
app-side after application. Remaining gate: the confirmation review of fix
wave 3.
