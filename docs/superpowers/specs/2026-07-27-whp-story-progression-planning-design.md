# WHP Story Progression Planning Design

**Date:** 2026-07-27
**Status:** Approved design
**Branch:** `episode-1-narrative-throughline`

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

For new episodes, thesis-level rethinks, and episode-scale story-structure ideation, the
writer must return the Story Progression Plan and stop for explicit approval. This gate
applies in pre-draft, rapid-prototype, and production workflows. Scoped work on existing
narration does not rebuild the plan unless the requested change alters the central
progression.

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
- Remove detailed-rule duplication and reduce `SKILL.md` below 500 lines.
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

### 2. Build the Story Progression Plan

Inspect the approved architecture and available factual material for story moves that the
episode genuinely earns. Plan the progression before writing beat prose, hooks, jokes, or
transitions.

Return one visible Story Progression Plan and stop.

### 3. Approve the complete story progression

Positive feedback on one obstacle, transition, case, technique, or loop does not approve the
whole plan. Explicit approval freezes the progression as the story baseline.

When Martin requests alternatives, return distinct complete progression options without
choosing or approving one. After a choice, return the resulting complete plan for approval.

### 4. Draft from the approved progression

Order beats and draft narration only after story-progression approval. Preserve the
approved story engine, causal chain, selected moves, evidence boundaries, loops, and
payoffs.

Later evidence may narrow a claim. If new evidence breaks a load-bearing obstacle,
reversal, proof handoff, or causal link, surface the conflict and return a revised plan for
approval instead of silently restructuring the episode.

### 5. Preserve and audit the plan

Phase 2 stores the approved plan in the production appendix. The final story audit compares
the narration with that approved baseline while still allowing natural prose development.

## Story Progression Plan artifact

Use these sections in this order.

### Story engine

State in one sentence how the episode moves from its opening tension to its final payoff.
This is the causal and emotional route, not another statement of the thesis.

### Story-material inventory

Inventory the available material before selecting techniques.

| Material | Factual status | Story opportunity | Boundary or risk |
|---|---|---|---|
| Case, result, contradiction, consequence, human goal, or unknown | `SUPPLIED`, `PROJECT-KNOWN`, `NEEDS-VERIFICATION`, or `HYPOTHETICAL` | The obstacle, reversal, question, proof job, callback, or payoff it could support | What it cannot establish or what must remain provisional |

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
| Named move | `SELECTED` or `REJECTED` | Exact inventory item | What it changes for the viewer | Opening, beat, bridge, callback, or payoff | Why it remains honest, or why it is not earned |

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

The inventory is broad; the selected set stays minimal. Record `NONE` when a candidate move
or throughline is not earned.

### Beat-progression map

| Beat | Starting question or expectation | Event or evidence | BUT: complication | THEREFORE: consequence or required next step | Selected technique | Loop or payoff | Proof job and evidence boundary |
|---|---|---|---|---|---|---|---|
| Descriptive beat name | What the viewer currently expects or needs answered | What enters the story | What blocks, reverses, narrows, or complicates the current route | What the complication causes the narrator, argument, or viewer to need next | The move doing the work | Loop opened, partially paid, transferred, or closed | What this beat establishes and what it does not |

But and Therefore are structural fields, not required spoken words. A necessary setup,
orientation, synthesis, or payoff may use `NOT APPLICABLE` only when its logical job is
stated. Empty fields or decorative connective words do not create causality.

### Full causal read

Compress the episode into a short sequence using `BUT` and `THEREFORE` as diagnostic labels.
Identify any surviving “and then” transition. Give it a necessary proof or orientation job,
reorder it, or cut it.

The causal read tests structure; the final narration uses natural spoken language.

### Retention map

For each major handoff, state the live reason to continue:

- a specific unresolved question;
- a real obstacle;
- an apparent contradiction;
- a promised test;
- an anticipated consequence;
- a partially paid loop;
- an outcome whose meaning has not yet been revealed.

Do not use vague promises such as “it gets stranger.”

### Natural bridge seeds

Provide short, non-final spoken seeds only for the most important transitions. Examples of
form include:

- “But that seemed impossible, because…”
- “That left me with one problem…”
- “Which meant I needed a study that…”
- “So the first case answered X. It left Y wide open.”

Every seed must describe a real logical or research event. Do not invent “I almost gave
up,” surprise, frustration, a failed hypothesis, or chronology that Martin did not
experience.

### Loop and payoff check

Map each important loop to its opening beat, any partial payoff, and its final resolution.
Confirm that the ending answers the question and useful promise created by the packaging and
opening.

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

### `.agents/skills/writing-whp-youtube-scripts/SKILL.md`

Own:

- when the story-progression gate applies;
- the requirement to return the visible plan and stop;
- explicit approval and baseline-preservation behavior;
- scoped-work exemption;
- mandatory resource routing.

Remove the duplicated detailed story-construction method. Keep only concise invariants that
must be visible whenever the skill loads. End below the existing 500-line maximum.

### `references/script-architecture.md`

Change the post-approval handoff from beat ordering or narration to the Story Progression
Plan. Preserve architecture as the intellectual payload and do not add story prose to the
architecture artifact.

### `references/story-and-hook-method.md`

Own the complete Story Progression Plan workflow, artifact schema, technique catalog,
But / Therefore diagnostic, natural bridge seeds, approval rules, and anti-shoehorn
guardrails. Consolidate existing detailed story-construction rules here.

### `references/rapid-prototyping.md`

Own how Phase 1 consumes the approved progression:

- require the approved plan before episode-scale beats or narration;
- preserve it as the drafting baseline;
- reopen the gate only when a requested change alters central progression;
- apply spoken voice and rapid factual boundaries while drafting.

Replace detailed copies of the story method with concise references to the detailed owner.

### `references/annotated-script-format.md`

Define how the approved plan is stored in the production appendix. Preserve the story
engine, full causal read, technique and beat map, loop/payoff map, throughline decision,
evidence dependencies, and approval metadata.

### `assets/annotated-script-template.md`

Provide empty, structurally valid fields for the approved plan. The template is shape only,
never preverified episode content.

### `references/quality-rubric.md`

Audit outcomes rather than repeat planning instructions. A top story score requires:

- narration that follows the approved causal progression;
- genuine, resolved obstacles and contradictions;
- explicit proof handoffs;
- loops and payoffs that resolve as planned;
- no manufactured drama or technique quota;
- surfaced tradeoffs when evidence forced a plan change.

### `whp-youtube/STEERING.md`

Retain the concise permanent operating rule already reconciled. Do not copy the complete
artifact schema into channel doctrine.

### `scripts/test_skill_package.py`

Replace tests that demand identical detailed prose across multiple files with tests for:

- one detailed owner;
- correct gate order and mandatory routing;
- complete artifact schema;
- handoff and consumption contracts;
- persistence and audit contracts;
- the 500-line core-skill ceiling.

## Failure and boundary handling

- **No approved architecture:** return only the architecture.
- **No approved progression:** return only the Story Progression Plan or its requested
  revision.
- **No genuine technique opportunity:** record `NONE`; use direct explanation.
- **Unverified material:** keep the move provisional and name the evidence dependency.
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
2. Episode-scale Phase 0 and Phase 1 work cannot bypass the gate.
3. The detailed story method contains every required artifact section and field.
4. But / Therefore is a causal diagnostic, not a literal-word quota.
5. `NONE`, `NOT APPLICABLE`, provisional evidence, and scoped-work behavior are defined.
6. Architecture hands off to story planning rather than narration.
7. Rapid prototyping consumes and preserves the approved plan.
8. The annotated format and template preserve the approved plan.
9. The rubric audits adherence and manufactured-drama failures.
10. The detailed planning contract has one owner rather than verbatim mirrors.

Run the focused tests and confirm they fail because the new gate and artifact do not yet
exist.

Subagent pressure testing is intentionally omitted because the active workspace instruction
forbids delegation unless the user explicitly asks for it. The current user-reported
failure—story techniques being noticed after structure instead of shaping it—provides the
behavioral regression, while deterministic package tests provide repeatable enforcement.

### GREEN

Make the smallest documentation and template changes that satisfy each contract. Run the
focused package tests after every cohesive change.

### REFACTOR

Remove detailed duplication from the core and rapid guidance while keeping tests green.
Keep `SKILL.md` below 500 lines and preserve unrelated walking-vlog changes.

### Final validation

Run:

```bash
python3 -m unittest \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
```

Then run all skill-package tests:

```bash
python3 -m unittest discover \
  -s .agents/skills/writing-whp-youtube-scripts/scripts \
  -p 'test_*.py'
```

Validate the skill folder:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/writing-whp-youtube-scripts
```

Finally run `git diff --check`, inspect the complete task-owned diff, and confirm the
Episode 1 pre-draft, walking-vlog checker implementation, historical artifacts, and
unrelated worktrees remain unchanged by this refinement.

## Success criteria

- Story technique selection happens before beat ordering or narration by default.
- The visible plan is separately approved.
- The artifact makes the episode's causal and retention progression reviewable.
- Real obstacles and contradictions can shape the story without invented drama.
- But / Therefore exposes weak “and then” sequencing without becoming formulaic prose.
- The approved plan survives into rapid drafting and production auditing.
- Detailed story guidance has one owner.
- `SKILL.md` is below 500 lines.
- Deterministic tests fail before implementation and pass afterward.
- Existing walking-vlog and throughline work remains intact.
