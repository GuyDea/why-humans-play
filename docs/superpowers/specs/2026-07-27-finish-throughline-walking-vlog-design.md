# Finish Supporting-Throughline and Walking-Vlog Work

**Date:** 2026-07-27
**Branch:** `fix/finish-throughline-walking-vlog`
**Status:** Approved for implementation

## Goal

Turn the existing mixed worktree into finished, reviewable work without reintroducing the
story-guidance ownership drift fixed on `main`. Deliver:

1. an optional supporting-narrative-throughline feature;
2. a memory-first delivery gate for explicitly requested walking-vlog pre-drafts; and
3. the Episode 1 medical-sidecar artifact committed explicitly as a pre-draft.

## Non-goals

- Do not promote the Episode 1 artifact to a production script.
- Do not change the approved architecture → Story Progression Plan → beats/narration gate.
- Do not invent medical facts, personal chronology, obstacles, or counterfactual outcomes.
- Do not commit broad formatting churn or duplicate detailed guidance across consumers.

## Ownership design

### Supporting narrative throughline

`references/story-and-hook-method.md` is the sole detailed structural owner. It defines
candidate selection, the sidecar relationship to the argument, recurrence jobs, evidence
boundaries, rejection conditions, and payoff.

Other files consume that owner:

- `SKILL.md` keeps only the concise invariant and route.
- `references/rapid-prototyping.md` owns draft-time realization of approved returns.
- `whp-youtube/STEERING.md` keeps a short permanent channel invariant and owner links.
- the annotated format and template persist the compact audit;
- the rubric scores the result without penalizing an earned `NONE`.

### Memory-first walking-vlog delivery

`references/rapid-prototyping.md` is the sole detailed execution owner. It defines the
human judgment applied to claim-carrying versus texture numbers, compact trust anchors,
verbatim versus paraphrased quotations, and natural spoken wording.

Other files keep only their own responsibility:

- `SKILL.md` owns the explicit Phase 0 trigger and route to rapid guidance.
- `whp-youtube/STEERING.md` owns a concise permanent delivery invariant and route.
- `references/quality-rubric.md` owns outcome-based scoring, not a copied procedure.
- `references/story-and-hook-method.md` links to rapid guidance when delivery is in scope.
- `scripts/check_spoken_readability.py` deterministically raises human-review findings for
  exact participant counts and substantial quotations.

Package tests will enforce these ownership boundaries instead of requiring verbatim copies
of the detailed memory-first procedure in five files.

## Canonical steering and decisions

Remove the uncommitted detailed “Design the storytelling engine” block because the
committed concise story invariant already routes to the structural and drafting owners.
Restore the committed workflow wording so whole-plan approval appears once and both beat
ordering and narration remain gated.

Keep concise supporting-throughline and memory-first steering invariants. Update
`DECISIONS.md` so the story-progression entry describes the implemented state rather than
future work. Preserve separate decision entries for the throughline and walking-vlog gate.

## Skill entrypoint cleanup

Retain the substantive Phase 0 memory-first trigger while restoring the committed paragraph
wrapping elsewhere in `SKILL.md`. The final diff must show behavior changes, not a
whole-file formatting rewrite, and the entrypoint must remain below its 480-line limit.

## Episode 1 pre-draft

Commit
`whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md` with
`PRE-DRAFT` status unchanged. The approved Episode 1 argument remains the spine; the Swiss
medical case remains a supporting sidecar.

Before commit:

- verify medical-case claims against the cited primary case report;
- preserve the source boundaries of the canonical Episode 1 evidence;
- run the readability checker;
- explicitly review both flagged quotations;
- record why each flagged quotation is retained or paraphrased in the delivery audit; and
- keep the artifact out of the production-ready path.

## Test-first reconciliation

Add or strengthen deterministic tests before changing the guidance:

1. steering contains only the concise story invariant and one approval route;
2. the throughline structural detail exists only in its owner;
3. the memory-first procedure exists only in rapid guidance while every consumer routes to
   it and states only its local invariant;
4. the decision ledger no longer describes completed work as future;
5. the format and template retain `FOUND` / `NONE` throughline records; and
6. exact participant counts and substantial quotations still generate review findings.

The current mixed worktree should fail the new ownership and stale-state checks. The
reconciled implementation should make them pass without weakening existing contracts.

## Commit structure

After this design commit, use three cohesive implementation commits:

1. `feat(skill): add optional supporting narrative throughlines`
2. `fix(skill): enforce memory-first walking predrafts`
3. `content(youtube): add Episode 1 medical-sidecar predraft`

Each commit stages only its owned hunks and includes proportional tests. The final branch
must also pass the complete package suite, full test discovery, skill validation, diff
checks, and an independent review.

## Completion criteria

- No detailed story or memory-first procedure is mirrored across consumers.
- Canonical steering contains one progression gate with no duplicate approval language.
- `SKILL.md` contains no unrelated reflow.
- The decision ledger describes the current implemented state.
- The pre-draft’s two semantic review findings are explicitly resolved and documented.
- All tests and validation pass from both the live worktree and clean committed `HEAD`.
- The index and branch history contain no unrelated files or mixed-purpose commit.
