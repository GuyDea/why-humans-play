# WHP Story Progression Planning Design

**Date:** 2026-07-27
**Status:** Approved design
**Branch:** `episode-1-narrative-throughline`
**Review:** Reconciled after an independent read-only Claude Opus 5 package review

## Context

The WHP scripting skill already contains useful storytelling techniques: expectation
reversals, evidence handoffs, investigation challenges, open loops, callbacks,
mechanism-mapped humor, and an optional supporting narrative throughline. The current
workflow can still treat those techniques as drafting or revision tools after the episode's
intellectual architecture is approved.

That ordering is too late. A compelling progression depends on choosing genuine obstacles,
reversals, contradictions, consequences, loops, and payoffs before beats or narration are
written. Adding those moves afterward risks cosmetic retention language, weak causality,
manufactured drama, and an “and then” sequence of facts.

The package also repeats detailed story rules across `SKILL.md`,
`references/rapid-prototyping.md`, `references/story-and-hook-method.md`, channel steering,
and deterministic tests. `SKILL.md` is exactly at its 500-line limit. Tests currently pin
some duplicated paragraphs in several files, making the duplication deliberate and
increasing maintenance drift.

## Decision

Add a default, visible **Story Progression Plan** gate between intellectual architecture
approval and beat ordering or narration:

`approved intellectual architecture → approved story progression → beats and narration`

Use one effect-based trigger across all phases: **central-progression work** means a request
that would set or materially change the causal route from the opening tension, through the
insight ladder, to the final payoff.

For a new episode, a thesis-level rethink, or other central-progression work, the writer must
return the Story Progression Plan and stop for explicit approval. This gate applies in
pre-draft, rapid-prototype, and production workflows. Scoped work on existing narration
returns directly and does not rebuild the plan unless it crosses the same central-progression
trigger.

Make `references/story-and-hook-method.md` the single detailed owner of the planning method.
Keep concise routing, consumption, persistence, and audit contracts in the files that need
them. Do not mirror the detailed method across the package.

## Goals

- Make storytelling-technique selection the first story-structure activity.
- Shape the progression around genuine narrative opportunities in the material.
- Use But / Therefore to test causal movement between major beats.
- Plan retention through real questions, obstacles, consequences, and payoffs.
- Keep evidence boundaries visible while planning.
- Prevent manufactured roadblocks, emotions, chronology, or research events.
- Preserve the approved progression as a baseline through narration and production.
- Remove detailed-rule duplication and leave `SKILL.md` with a real safety margin: target at
  most 480 lines while preserving the hard 500-line ceiling.
- Replace prose-synchronization tests with ownership and behavior contracts.

## Non-goals

- Do not replace the intellectual architecture or its approval gate.
- Do not draft polished narration inside the Story Progression Plan.
- Do not require every available storytelling technique in every episode.
- Do not require the literal words “but” or “therefore.”
- Do not force a human throughline, investigation challenge, joke, or open loop.
- Do not change the Episode 1 pre-draft as part of this skill refinement.
- Do not change the walking-vlog readability checker or absorb its separate regression plan.
- Do not rewrite historical specifications, plans, evidence reports, or published scripts.

## Workflow

### 1. Approve the intellectual architecture

The existing architecture gate remains first. It establishes the episode's concept
inventory, package and audience, central question, core answer, belief shift, insight
ladder, phenomenon map, earned reframe, evidence map, learning-and-action contract,
practical payoff, final lesson, and scope.

Architecture approval authorizes story planning, not beats or narration.

If story planning exposes a flat insight ladder, a missing proof job, or another
load-bearing architecture defect, surface it and return to this gate. Do not compensate for a
weak payload with stronger-sounding story technique.

### 2. Build the Story Progression Plan

Inspect the approved architecture and available factual material for story moves that the
episode genuinely earns. Plan the progression before writing beat prose, hooks, jokes, or
final transitions. The short, non-final **Natural bridge seeds** defined in the artifact are
the only transition fragments allowed at this stage.

Return one visible Story Progression Plan and stop.

### 3. Approve the complete story progression

Positive feedback on one obstacle, transition, case, technique, or loop does not approve the
whole plan. Explicit approval—or a direct instruction to draft from the displayed complete
plan—freezes the progression as the story baseline.

When Martin requests alternatives, return compact options containing only the Story engine,
technique deltas, and Beat-progression blocks. Do not choose or approve one. After a choice,
expand the selected option into the complete plan for approval.

When Martin requests a targeted revision, change only the addressed beat or field. Name every
downstream causal consequence that the change creates instead of silently rewriting later
beats. Return the resulting complete plan so approval scope remains visible.

### 4. Draft from the approved progression

Order beats and draft narration only after story-progression approval. Preserve the
approved story engine, causal chain, selected moves, evidence boundaries, loops, and
payoffs.

Later evidence may narrow a claim. If new evidence breaks a load-bearing obstacle,
reversal, proof handoff, or causal link, surface the conflict and return a revised plan for
approval instead of silently restructuring the episode.

### 5. Preserve and audit the plan

In Phase 0 and Phase 1, treat the approved plan like the approved architecture: it must remain
a visible supplied input in the current conversation or subsequent request. Do not make
drafting depend on invisible chat history or create planning-notes scaffolding merely to
store it. If no visible approved plan is supplied, treat the progression as unapproved.

Phase 2 stores a compact approved-plan record in the production appendix. The final story
audit compares the narration with that approved baseline while still allowing natural prose
development.

Story-progression approval precedes and does not replace creative approval. The complete
sequence is:

`architecture → progression → narration prototype → creative approval → Phase 2`

### Phase behavior

- **Phase 0:** A new episode, thesis-level rethink, or other central-progression request
  stops first at architecture and then at progression. Scoped pre-draft iteration still
  returns directly. An approved progression is a creative baseline, not a definite WHP
  doctrine decision; promotion is when the pre-draft is reconciled.
- **Phase 1:** Require the approved progression before episode-scale beats or narration.
  Scoped work remains exempt until it crosses the central-progression trigger.
- **Phase 2:** Consume the approved progression as the production story baseline. Reopen it
  only when evidence or a requested change breaks a load-bearing causal choice.

## Story Progression Plan artifact

Use these sections in this order.

### Story engine

State in one sentence how the episode moves from its opening tension to its final payoff.
This is the causal and emotional route, not another statement of the thesis.

### Story-material inventory

Inventory the available material before selecting techniques.

| Material or architecture evidence-row ID | Inherited factual status | Story opportunity | Boundary or risk |
|---|---|---|---|
| Architecture row reference, case, result, contradiction, consequence, human goal, or unknown | Reuse `SUPPLIED`, `PROJECT-KNOWN`, `NEEDS-VERIFICATION`, or `HYPOTHETICAL` from architecture | The obstacle, reversal, question, proof job, callback, or payoff it could support | What it cannot establish or what must remain provisional |

Reference existing architecture evidence-map rows and inherit their status instead of
re-entering the same evidence record. The plan may add non-load-bearing story texture that
was not relevant to the evidence map. If new material becomes load-bearing, add it to the
architecture evidence map and return that artifact for approval. Any status disagreement
also reopens architecture.

Include genuine:

- expectations that can be reversed;
- human or institutional goals and obstacles;
- apparent contradictions;
- investigation roadblocks and missing evidence;
- causal consequences and human costs;
- demonstrations and recognition analogies;
- possible loops, callbacks, humor, informational rewards, and throughlines.

Do not select a technique during inventory merely because the material resembles one.

### Technique selection

| Technique | Decision | Material basis | Narrative job | Planned placement | Boundary or rejection reason |
|---|---|---|---|---|---|
| Named move | `SELECTED`, notable `REJECTED`, or `NONE` | Exact inventory item | What it changes for the viewer | Opening, beat, bridge, callback, or payoff | Why it remains honest, or why an expected move is not earned |

Consider at least:

- question-first or event-first entry;
- expectation → reversal;
- ordinary goal → obstacle → consequential choice → outcome;
- investigation challenge;
- apparent contradiction and scoped resolution;
- case → takeaway → remaining question → next evidence;
- open loop, partial payoff, and final payoff;
- demonstration;
- term → evidence → recognition analogy → application;
- informational reward;
- mechanism-mapped punchline;
- callback;
- optional supporting narrative throughline;
- viewer application and final declarative resolution.

The list above is a consideration checklist, not a requirement to create fourteen table
rows. Record rows only for selected moves and notable rejections a reviewer would reasonably
expect. If no move is earned, record one `NONE` row and use direct explanation. The selected
set stays minimal.

### Beat-progression blocks

Use one addressable block per major beat so sentence-length causal fields remain readable and
targeted revisions can identify the exact unit:

```markdown
#### Progression beat SP01 — Descriptive name

- **Starting question or expectation:** What the viewer currently expects or needs answered.
- **Event or evidence:** What enters the story.
- **BUT — complication:** What blocks, reverses, narrows, or complicates the current route.
- **THEREFORE — consequence or required next step:** What the complication causes the
  narrator, argument, or viewer to need next.
- **Selected technique:** The move doing the work, or `NONE`.
- **Loop or payoff:** What opens, partially pays, transfers, or closes.
- **Proof job and evidence boundary:** What this beat establishes and what it does not.
```

But and Therefore are structural fields, not required spoken words. A necessary setup,
orientation, synthesis, or payoff may use `NOT APPLICABLE` only when its logical job is
stated. Empty fields or decorative connective words do not create causality.

### Full causal read

Compress the episode into a short sequence using `BUT` and `THEREFORE` as diagnostic labels.
Identify any surviving “and then” transition. Give it a necessary proof or orientation job,
reorder it, or cut it.

The causal read tests end-to-end chain coherence that row-local beat checks can miss; it does
not duplicate each beat block. The final narration uses natural spoken language.

### Retention map

For each major handoff, reference the relevant `SP` beat IDs and state the live reason to
continue without re-entering the beat fields. A **major handoff** is a boundary between
insight-ladder steps or an equivalent change in viewer understanding. Valid reasons include:

- a specific unresolved question;
- a real obstacle;
- an apparent contradiction;
- a promised test;
- an anticipated consequence;
- a partially paid loop;
- an outcome whose meaning has not yet been revealed.

Do not use vague promises such as “it gets stranger.”

### Natural bridge seeds

Provide at most one short, non-final spoken seed for each major handoff that needs one. Cite
the source inventory item or architecture row that makes the bridge true. Examples of form
include:

- “But that seemed impossible, because…”
- “That left me with one problem…”
- “Which meant I needed a study that…”
- “So the first case answered X. It left Y wide open.”

Every seed must describe a real logical or research event. Do not invent “I almost gave
up,” surprise, frustration, a failed hypothesis, or chronology that Martin did not
experience.

### Loop and payoff check

Check only global closure here: reference the `SP` beat IDs where each important opening loop
begins, partially pays if necessary, and finally resolves. Do not re-enter the per-beat loop
state. Confirm that the ending answers the question and useful promise created by the
packaging and opening.

### Throughline decision

Select the supporting narrative throughline only when it earns its sidecar role. Otherwise
record `NONE` and the concrete reason. If selected, map every return to new information,
changed meaning, raised stakes, mechanism demonstration, tool application, or loop payoff.

### Anti-shoehorn check

Reject:

- manufactured obstacles or contradictions;
- invented emotions, motives, memories, chronology, or research events;
- a challenge phrase attached to an evidence handoff with no real gap;
- repetitive But / Therefore phrasing;
- an “and then” sequence with no necessary logical job;
- a technique selected only to fill a quota;
- a throughline or callback that competes with the thesis;
- retention language whose promised content is not delivered.

### Approval

Record:

- **Status:** `AWAITING-APPROVAL` or `APPROVED`;
- **Approved by:** Martin or `PENDING`;
- **Approval scope:** complete progression, not an isolated move;
- **Open evidence dependencies:** every load-bearing `NEEDS-VERIFICATION` item.

The writer never self-approves the artifact.

## Responsibility boundaries and drift repair

### Ownership partition

- `SKILL.md` owns concise phase, gate, routing, and always-loaded invariants.
- `story-and-hook-method.md` owns the detailed progression-planning method and artifact
  schema.
- `rapid-prototyping.md` owns draft-time spoken delivery, case narration, hook, humor, and
  rapid factual-boundary application.
- `script-architecture.md` owns intellectual payload and evidence mapping.
- `STEERING.md` owns concise permanent channel doctrine, not the detailed method.

A detailed rule may appear outside its owner only when that file must enforce it while
drafting in its phase. Mark that copy as derived from a linked owner section. Otherwise use a
routing pointer. This draft-time-enforcement test replaces the vague exception “where
operationally required.”

### `.agents/skills/writing-whp-youtube-scripts/SKILL.md`

Own:

- the single central-progression trigger and its Phase 0, Phase 1, and Phase 2 behavior;
- the requirement to return the visible plan and stop;
- explicit approval, direct-drafting override, and visible-baseline behavior;
- scoped-work exemption;
- mandatory routing to `story-and-hook-method.md` before building the plan;
- the complete gate order through creative approval.

Remove the detailed material under `### Apply story construction across the script —
optional supporting narrative throughline` that belongs to the detailed owner, retaining
only concise always-loaded invariants and derived draft-time rules that pass the ownership
test above. Target at most 480 lines and never exceed the existing 500-line ceiling.

### `references/script-architecture.md`

Change the post-approval handoff from beat ordering or narration to the Story Progression
Plan. Preserve architecture as the intellectual payload and do not add story prose to the
architecture artifact. A load-bearing evidence item first discovered during planning returns
to the evidence map here.

### `references/story-and-hook-method.md`

Own the complete Story Progression Plan workflow, artifact schema, technique catalog,
But / Therefore diagnostic, natural bridge seeds, approval rules, and anti-shoehorn
guardrails. Consolidate existing detailed story-construction rules here. Treat the approved
progression as the narrative-spine baseline consumed by Phase 2, not as a competing second
spine.

### `references/rapid-prototyping.md`

Own how Phase 1 consumes the approved progression:

- require the approved plan before episode-scale beats or narration;
- preserve it as the drafting baseline;
- reopen the gate only when a requested change alters central progression;
- apply spoken voice and rapid factual boundaries while drafting.

Replace detailed copies of the story method with concise references to the detailed owner.
Planning creates no third research exception beyond the bounded architecture concept scan
and targeted viewer-vulnerability proof lookup already allowed in Phase 1.

### Superseded handoffs

Update every existing architecture-to-narration shortcut, not only the architecture reference:

- `SKILL.md`: Overview; the Phase 1 post-architecture paragraph; Architecture approval gate;
  the Phase 2 narrative-spine step; and Resource routing.
- `references/script-architecture.md`: Route episode-scale work; Approve the architecture;
  and the corresponding Common mistakes entry.
- `references/rapid-prototyping.md`: Inputs and selected topic handoff; Draft from the
  approved architecture heading and opening paragraphs; and the Rapid quality check.
- `scripts/test_skill_package.py`:
  `test_episode_scale_generation_requires_approved_architecture`.

All of these must express the same chain:

`architecture → progression → narration prototype → creative approval → Phase 2`

### `references/annotated-script-format.md`

Define how a compact approved-plan record is stored in the production appendix. Preserve the
Story engine, Full causal read, selected techniques, Beat-progression blocks, global
loop/payoff closure, Throughline decision, evidence dependencies, approval metadata, and a
Plan-change tradeoffs field that uses `NONE` when evidence did not force a change. Populate
the existing Narrative throughline audit from the plan's Throughline decision rather than
asking Phase 2 to invent a second answer.

### `assets/annotated-script-template.md`

Provide empty, structurally valid fields for the approved plan. The template is shape only,
never preverified episode content.

### `references/quality-rubric.md`

Audit outcomes rather than repeat planning instructions. A top story score requires:

- narration that follows the approved causal progression when the appendix contains one;
- genuine, resolved obstacles and contradictions;
- explicit proof handoffs;
- loops and payoffs that resolve as planned;
- no manufactured drama or technique quota;
- surfaced tradeoffs when evidence forced a plan change.

For a legacy script, scoped `TARGETED-ARTIFACT`, or other artifact with no approved plan in
scope, score intrinsic causal movement and do not penalize the absent plan. Name any surfaced
tradeoff in the production appendix so the rubric audits a document rather than hidden
process.

### `scripts/validate_annotated_script.py`

Keep validator scope unchanged in this refinement. The existing Narrative throughline audit
is owned by the format and template and tested by the package suite without validator
enforcement; use the same precedent for the compact approved-plan record. Validator
enforcement may be considered as a separate follow-up rather than silently widening this
change into a new structural-validation contract.

### `whp-youtube/STEERING.md`

Retain the concise permanent operating rule already reconciled. Do not copy the complete
artifact schema into channel doctrine.

### `scripts/test_skill_package.py`

Replace tests that demand identical detailed prose across multiple files with tests for:

- one detailed planning owner inside `SKILL_ROOT`;
- correct gate order and mandatory routing;
- complete artifact schema;
- handoff and consumption contracts;
- persistence and audit contracts;
- the 480-line task target and 500-line hard core-skill ceiling.

The single-owner assertion is positive and scoped: planning-method anchors and the artifact
schema exist in `story-and-hook-method.md`; `SKILL.md` and `rapid-prototyping.md` link to that
owner and do not mirror the schema. It does not assert that all storytelling doctrine appears
once across the repository, and it does not treat concise channel steering as a second
detailed owner.

Before editing the skill package, audit and rewrite the known distribution-test set below.
Each rewritten test must target the declared owner or a phase consumer explicitly marked as
derived; no test may require byte-identical paragraphs in every file:

- `test_investigation_challenge_bridge_is_real_and_reserved`
- `test_observable_resistance_can_disarm_the_immunity_defense`
- `test_opening_proof_case_is_clear_on_first_hearing`
- `test_enduring_failure_uses_an_early_case_and_current_echo`
- `test_examples_follow_a_real_world_consequence_chain`
- `test_adjacent_cases_require_an_explicit_inference_bridge`
- `test_proof_handoffs_lead_with_the_positive_takeaway`
- `test_punchlines_stay_short_and_separate_from_explanation`
- `test_narration_uses_the_friendly_conversation_format`
- `test_voice_keeps_factual_precision_without_emotional_sterilization`
- `test_source_label_studies_keep_the_item_source_and_outcome_visible`
- `test_story_uses_the_fewest_elements_that_preserve_causal_truth`
- `test_story_compression_preserves_trust_clarity_and_magnetism`
- `test_story_compression_preserves_causal_completeness`
- `test_story_uses_causal_minimum_and_locked_vocabulary`
- `test_story_rule_contract_is_distributed_across_core_guidance`
- `test_worldwide_patterns_use_novel_cases_then_a_global_montage`
- `test_unfamiliar_names_are_prepared_and_introduced`
- `test_supporting_narrative_throughline_contract_is_distributed`

## Failure and boundary handling

- **No approved architecture:** return only the architecture.
- **No approved progression:** return only the Story Progression Plan or its requested
  revision.
- **Planning exposes a flat or defective architecture:** surface the exact defect and return
  to architecture approval; do not manufacture story tension around a weak insight ladder.
- **No genuine technique opportunity:** record `NONE`; use direct explanation.
- **Unverified material:** keep the move provisional and name the evidence dependency.
- **New load-bearing material appears:** add it to the architecture evidence map before using
  it as a story hinge.
- **Planning suggests more research:** retain the existing Phase 1 research limits; the plan
  creates no new lookup exception.
- **Load-bearing evidence fails later:** narrow the claim or reopen story approval.
- **Scoped rewrite changes central progression:** stop treating it as scoped work and reopen
  the plan.
- **A setup or payoff has no But / Therefore relation:** mark `NOT APPLICABLE` and state its
  necessary job.
- **A connective sounds dramatic but has no factual basis:** remove it.

## Test strategy

Follow RED-GREEN-REFACTOR for the skill documentation.

### RED

Add focused package tests before editing the skill guidance:

1. The core workflow orders architecture approval before a default visible Story
   Progression Plan and orders progression approval before beats or narration.
2. New, thesis-level, and other central-progression work in Phase 0 and Phase 1 cannot bypass
   the gate, while truly scoped pre-draft work remains direct.
3. The detailed story method contains every required artifact section and field.
4. But / Therefore is a causal diagnostic, not a literal-word quota.
5. `NONE`, `NOT APPLICABLE`, provisional evidence, and scoped-work behavior are defined.
6. Architecture hands off to story planning rather than narration.
7. Rapid prototyping consumes and preserves the approved plan.
8. The annotated format and template preserve the approved plan.
9. The rubric audits adherence and manufactured-drama failures.
10. The detailed planning contract has one owner inside `SKILL_ROOT` rather than verbatim
    schema mirrors.
11. The direct-drafting override, visible-baseline rule, targeted-revision behavior, and
    complete gate chain are explicit.
12. The format, template, and package suite enforce the compact production record.

Run the focused tests and confirm they fail because the new gate and artifact do not yet
exist. Anchor new tests on stable headings, field labels, sentinel values
(`AWAITING-APPROVAL`, `NONE`, and `NOT APPLICABLE`), and gate order rather than long copied
paragraphs.

An independent read-only Claude Opus 5 review pressure-tested this design against the live
package. The current user-reported failure—story techniques being noticed after structure
instead of shaping it—provides the behavioral regression, while deterministic package tests
provide repeatable enforcement.

### GREEN

Make the smallest documentation and template changes that satisfy each contract. Run the
focused package tests after every cohesive change.

### REFACTOR

Remove detailed duplication from the core and rapid guidance while keeping tests green.
Keep `SKILL.md` at or below the 480-line target and preserve unrelated walking-vlog changes.
Because the known distribution-test audit exceeds twelve tests, keep the work revertible in
at least two cohesive commits on the same branch: land the gate and additive contracts first,
then land ownership cleanup and test rewrites.

### Final validation

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
```

Then run all skill-package tests:

```bash
python3 -m unittest discover \
  -s .agents/skills/writing-whp-youtube-scripts/scripts \
  -p 'test_*.py'
```

Validate the skill folder:

```bash
python3 "<resolved-skill-creator-root>/scripts/quick_validate.py" \
  .agents/skills/writing-whp-youtube-scripts
```

Resolve `<resolved-skill-creator-root>` from the loaded `skill-creator` skill rather than
hardcoding a machine-specific path.

Run one representative dry run against a historical or synthetic approved architecture.
Store its review evidence under `docs/superpowers/`, never in `whp-youtube/`, and confirm the
gate produces an honest causal progression without technique quotas or invented drama.

Finally run `git diff --check`, inspect the complete task-owned diff, and confirm the Episode
1 pre-draft, walking-vlog checker implementation, historical artifacts, and unrelated
worktrees remain unchanged by this refinement.

## Success criteria

- Story technique selection happens before beat ordering or narration by default.
- The visible plan is separately approved.
- The artifact makes the episode's causal and retention progression reviewable.
- Real obstacles and contradictions can shape the story without invented drama.
- But / Therefore exposes weak “and then” sequencing without becoming formulaic prose.
- The approved plan survives into rapid drafting and production auditing.
- Detailed story guidance has one owner.
- `SKILL.md` is at most 480 lines and remains below the hard 500-line ceiling.
- Deterministic tests fail before implementation and pass afterward.
- A representative dry run demonstrates the gate on an approved architecture.
- Existing walking-vlog and throughline work remains intact.
