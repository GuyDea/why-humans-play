# WHP Intro-First Pre-Draft Gate — RED/GREEN Record

> **Status:** Historical verification record, not active doctrine. The current owner is
> `.agents/skills/writing-whp-youtube-scripts/references/predraft-intro-workflow.md`.
> The independent-AI gate described below was retired later on 2026-07-28; it remains here
> only as a record of the earlier implementation.

- **Date:** 2026-07-28
- **Branch:** `episode1-story-rebuild`
- **Independent reviewer:** local Claude Code `2.1.214`, `--model opus`
- **Scenario:** The complete architecture and Story Progression Plan are approved; Martin
  says, “create the pre-draft.”

## Baseline RED

Before the update, the scripting skill permitted narration in
`whp-youtube/predrafts/`, STEERING directed the writer to create one complete narration
prototype, and no independent intro review was required.

Claude Opus independently concluded that two reasonable agents could follow the current
documents and produce materially different artifacts: one complete body narration and one
intro-first checkpoint. It identified the root cause as a location/status definition for
“pre-draft” with no fixed artifact shape or review gate.

## Implemented contract

The update establishes one detailed owner and makes every active workflow route to it:

- Phase 0 contains a polished spoken intro, a bullet-only body logic map, and a reconciled
  independent-review record.
- Intro structure is selected before prose from every applicable evidence-earned
  technique; techniques are not quotas.
- Every opening promise, question, and loop maps to a named body payoff.
- The reviewer is the strongest callable local model independent of the drafting model;
  failed access produces `REVIEW-BLOCKED`, never self-certified alignment.
- Complete body narration begins under `whp-youtube/drafts/` only after explicit approval
  of both the intro and body map.

Regression tests in `scripts/test_skill_package.py` lock the artifact shape, single-owner
route, reviewer gate, and promise-to-payoff boundary.

## Independent review and reconciliation

The first full Opus review returned a narrow RED:

1. The active Episode 1 plan told an agent to create the new pre-draft at
   `predrafts/ep1_v2.md` while also saying the full narration already there must be
   preserved.
2. The legacy file lacked its own migration-pending banner.
3. The Episode 1 plan did not explicitly separate the intro's E-02 teaser from SP02's
   developed case.
4. The Episode 1 plan repeated the detailed reviewer procedure instead of routing to its
   owner.

Reconciliation preserved and labeled the legacy narration, assigned the new Phase 0
artifact to `predrafts/ep1_v2-intro-first.md`, clarified E-02 ownership, and replaced the
duplicated review procedure with an owner link plus episode-specific inputs.

The follow-up Opus review returned **GREEN**, marked all four findings resolved, and found
no remaining must-fix issue. It judged that the legacy file cannot reasonably be mistaken
for a compliant ready pre-draft because both its own header and every active workflow mark
it as preserved migration-pending material.

## Deterministic GREEN

The final verification passed:

- skill package validation;
- 92 scripting-skill regression tests;
- 21 spoken-readability tests;
- 106 annotated-script validator tests;
- Markdown resource-link checks inside the skill suite;
- whitespace validation; and
- a stale-doctrine scan for the former full-narration pre-draft instructions.

No commit was created as part of this update.

## Later natural-package correction

Later on 2026-07-28, the Episode 1 intro training pass exposed a second drift: active
guidance reserved most mini-hooks for the body and imposed fixed mini-hook and loop
cadences even though the strongest version of the intro used a mini-hook as a natural
transition. A new regression test was written first. Its RED run reported 25 failures:
the line-level and structural owners were absent, consumers did not route to them, the
intro mini-hook restriction remained, and fixed cadence language still existed across the
rapid guide, story guide, quality rubric, and STEERING.

The correction gives line-level natural-package, hook, and mini-hook execution one owner
in `references/rapid-prototyping.md`. It gives loop selection, clarity, tracking, and
payoff one owner in `references/story-and-hook-method.md`. Mini-hooks are permitted in the
intro or body when they naturally connect the current thought to content delivered
immediately. Longer loops have no fixed count or timing quota, may not withhold prerequisite
clarity, and require exact mapped payoffs. Routing documents link to those owners instead
of restating their detailed rules.

The deterministic GREEN run passed:

- 94 scripting-skill regression tests;
- skill package validation;
- the Episode 1 intro spoken-readability gate, covering 30 spoken sentences with no
  unresolved items; and
- targeted guards against the retired intro-placement and fixed-cadence rules.

No independent model review was run because the mandatory reviewer step had already been
retired. No commit was created as part of this correction.

## Later episode-first Script Blueprint migration

Later on 2026-07-28, the former intro-first pre-draft was migrated without rewriting its
spoken narration into the Episode 1 Script Blueprint pair:

- `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md` is the source
  of truth for spoken wording and storytelling markup; and
- `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.extended.md` mirrors
  that script with grouped purpose annotations and the Blueprint appendix.

The former loose V2 narration and throughline experiment moved to the same episode's
`archive/` directory. The RED/GREEN and independent-review record above remains
historical evidence of the earlier workflow; it does not define current stage names or
active paths.
