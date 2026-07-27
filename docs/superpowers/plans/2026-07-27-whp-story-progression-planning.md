# WHP Story Progression Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make honest storytelling-technique selection a separately approved planning gate
between WHP intellectual architecture and beat ordering or narration, while removing
test-pinned documentation drift.

**Architecture:** Keep `SKILL.md` as the concise phase router and
`references/story-and-hook-method.md` as the single detailed owner of the Story Progression
Plan. Route architecture into that owner, make rapid drafting consume the approved plan,
persist a compact record in production scripts, and audit outcomes in the rubric. Split the
work into an additive gate/schema commit and a separate ownership-cleanup commit so the
large existing distribution-test refactor remains independently reviewable.

**Tech Stack:** Markdown skill guidance, Python 3 standard library, `unittest`, and the
existing skill-package validator.

---

## Working-tree contract

Implement against the **current working files** on
`episode-1-narrative-throughline`, not against `HEAD`. The worktree already contains
approved supporting-throughline and walking-vlog work in the same files.

Baseline verified on 2026-07-27:

```text
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
Ran 73 tests — OK

python3 -m unittest discover \
  -s .agents/skills/writing-whp-youtube-scripts/scripts \
  -p 'test_*.py'
Ran 196 tests — OK

python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/writing-whp-youtube-scripts
Skill is valid!
```

Protect these existing changes:

- walking-vlog guidance and checker work in `SKILL.md`, rapid guidance, rubric, checker,
  checker tests, package tests, steering, and the untracked regression plan;
- supporting-narrative-throughline guidance already present in the skill package;
- `whp-youtube/predrafts/`;
- the Episode 1 canonical script and every historical artifact;
- `scripts/validate_annotated_script.py` and its tests, whose scope deliberately stays
  unchanged.

Before every commit, stage only task-owned hunks with `git add -p`, inspect
`git diff --cached`, and stop if a task hunk cannot be separated safely from existing work.
Never stage `check_spoken_readability.py`, `test_check_spoken_readability.py`, Episode 1,
the walking-vlog plan, or pre-drafts as part of this implementation.

## File responsibility map

| File | Responsibility in this change |
|---|---|
| `.agents/skills/writing-whp-youtube-scripts/SKILL.md` | Cross-phase trigger, architecture and progression gates, visible-baseline rule, creative-gate order, and resource routing. |
| `.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md` | Hand approved architecture to story planning; reopen architecture for load-bearing defects. |
| `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md` | Detailed Story Progression Plan method, schema, structural techniques, approval, and revision rules. |
| `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md` | Consume the approved progression and own line-level rapid drafting guidance. |
| `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md` | Define the compact production record and derive the throughline audit from the approved plan. |
| `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md` | Demonstrate a structurally valid compact plan record without inventing episode truth. |
| `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md` | Audit plan adherence when a plan is in scope and intrinsic causality otherwise. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py` | Gate order, schema, ownership, routing, persistence, audit, and anti-duplication contracts. |
| `docs/superpowers/evidence/2026-07-27-whp-story-progression-gate.md` | Synthetic dry-run evidence; never episode content. |

### Task 1: Encode the new gate and artifact contracts

**Files:**
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Add reusable paths for the new contract tests**

Add these constants beside `ARCHITECTURE_MD`:

```python
STORY_METHOD_MD = SKILL_ROOT / "references/story-and-hook-method.md"
RAPID_MD = SKILL_ROOT / "references/rapid-prototyping.md"
FORMAT_MD = SKILL_ROOT / "references/annotated-script-format.md"
RUBRIC_MD = SKILL_ROOT / "references/quality-rubric.md"
TEMPLATE_MD = SKILL_ROOT / "assets/annotated-script-template.md"
```

- [ ] **Step 2: Add the failing phase and gate-order test**

Add this method to `SkillPackageTests`:

```python
def test_story_progression_gate_is_phase_aware_and_ordered(self) -> None:
    skill = SKILL_MD.read_text(encoding="utf-8")
    normalized = " ".join(skill.split())

    required = (
        "central-progression work",
        "Phase 0 stops first at architecture and then at the Story Progression Plan",
        "Scoped pre-draft work returns directly until it crosses that same trigger",
        "return one visible Story Progression Plan and stop",
        "directly instructs you to draft from that displayed complete plan",
        "If no visible approved plan is supplied, treat the progression as unapproved",
        "Story-progression approval precedes and does not replace creative approval",
    )
    for contract in required:
        with self.subTest(contract=contract):
            self.assertIn(contract, normalized)

    self.assertLess(
        skill.index("## Architecture approval gate"),
        skill.index("## Story progression approval gate"),
    )
    self.assertLess(
        skill.index("## Story progression approval gate"),
        skill.index("## Creative approval gate"),
    )
```

- [ ] **Step 3: Add the failing detailed-owner schema test**

```python
def test_story_progression_method_owns_the_complete_plan_schema(self) -> None:
    story = STORY_METHOD_MD.read_text(encoding="utf-8")
    consumers = {
        "skill": SKILL_MD.read_text(encoding="utf-8"),
        "rapid": RAPID_MD.read_text(encoding="utf-8"),
    }

    headings = (
        "## Plan story progression before beats",
        "### Story engine",
        "### Story-material inventory",
        "### Technique selection",
        "### Beat-progression blocks",
        "### Full causal read",
        "### Retention map",
        "### Natural bridge seeds",
        "### Loop and payoff check",
        "### Throughline decision",
        "### Anti-shoehorn check",
        "### Approval",
    )
    for heading in headings:
        with self.subTest(heading=heading):
            self.assertIn(heading, story)
        for consumer_name, consumer in consumers.items():
            with self.subTest(consumer=consumer_name, forbidden_schema=heading):
                self.assertNotIn(heading, consumer)

    for field in (
        "#### Progression beat SP01 — Descriptive name",
        "**Starting question or expectation:**",
        "**Event or evidence:**",
        "**BUT — complication:**",
        "**THEREFORE — consequence or required next step:**",
        "**Selected technique:**",
        "**Loop or payoff:**",
        "**Proof job and evidence boundary:**",
        "`AWAITING-APPROVAL`",
        "`NONE`",
        "`NOT APPLICABLE`",
    ):
        with self.subTest(field=field):
            self.assertIn(field, story)
```

- [ ] **Step 4: Add failing handoff, persistence, and audit tests**

```python
def test_story_progression_handoffs_route_through_the_owner(self) -> None:
    sources = {
        "skill": SKILL_MD.read_text(encoding="utf-8"),
        "architecture": ARCHITECTURE_MD.read_text(encoding="utf-8"),
        "rapid": RAPID_MD.read_text(encoding="utf-8"),
    }

    self.assertIn(
        "[the story and hook method](references/story-and-hook-method.md)",
        sources["skill"],
    )
    self.assertIn(
        "Architecture approval authorizes story planning, not beat ordering or narration.",
        sources["architecture"],
    )
    self.assertIn(
        "## Draft from the approved architecture and story progression",
        sources["rapid"],
    )
    self.assertIn(
        "[story-progression method](story-and-hook-method.md#plan-story-progression-before-beats)",
        sources["rapid"],
    )
    self.assertIn(
        "Planning creates no additional Phase 1 research exception.",
        sources["rapid"],
    )


def test_story_progression_record_and_rubric_are_scope_aware(self) -> None:
    format_text = FORMAT_MD.read_text(encoding="utf-8")
    template = TEMPLATE_MD.read_text(encoding="utf-8")
    rubric = RUBRIC_MD.read_text(encoding="utf-8")
    normalized_format = " ".join(format_text.split())
    normalized_rubric = " ".join(rubric.split())

    record_fields = (
        "### Approved story progression",
        "**Status:** APPROVED",
        "**Approved by:** Martin",
        "**Story engine:**",
        "**Full causal read:**",
        "**Selected techniques:**",
        "**Global loop / payoff closure:**",
        "**Throughline decision:**",
        "**Open evidence dependencies:**",
        "**Plan-change tradeoffs:**",
    )
    for source_name, source in (("format", format_text), ("template", template)):
        for field in record_fields:
            with self.subTest(source=source_name, field=field):
                self.assertIn(field, source)

    self.assertIn(
        "Populate the Narrative throughline audit from the approved plan's "
        "Throughline decision",
        normalized_format,
    )
    self.assertIn(
        "Do not fabricate or backfill a plan for a legacy script",
        normalized_format,
    )
    self.assertIn(
        "When no approved progression is in scope, score intrinsic causal movement",
        normalized_rubric,
    )
    self.assertIn(
        "Do not penalize a legacy script or scoped `TARGETED-ARTIFACT` for the "
        "absence of a plan it was never required to contain.",
        normalized_rubric,
    )
```

- [ ] **Step 5: Add the failing anti-shoehorn and revision test**

```python
def test_story_progression_method_preserves_honesty_and_targeted_revision(self) -> None:
    story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())
    contracts = (
        "But and Therefore are structural fields, not required spoken words.",
        "Record rows only for selected moves and notable rejections",
        "Every Natural bridge seed must cite the inventory item or architecture row "
        "that makes it true.",
        "Do not invent “I almost gave up,” surprise, frustration, a failed "
        "hypothesis, or chronology",
        "change only the addressed progression beat or field",
        "Name every downstream causal consequence instead of silently rewriting "
        "later beats.",
        "If planning exposes a flat insight ladder, missing proof job, or other "
        "load-bearing architecture defect, return to architecture approval.",
    )
    for contract in contracts:
        with self.subTest(contract=contract):
            self.assertIn(contract, story)
```

- [ ] **Step 6: Run the focused RED tests**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k story_progression -v
```

Expected: the five new tests fail because the gate, owner schema, handoffs, production
record, and scope-aware rubric do not yet exist. Existing non-story-progression tests are
not part of this focused run.

### Task 2: Implement the additive gate, owner schema, and phase consumers

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`
- Test:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Make `SKILL.md` route all three approval gates**

Replace the Overview opening with:

```markdown
Use one skill for rapid creative development and evidence-backed production. For
episode-scale work, approve the intellectual architecture, then approve the story
progression, then draft and approve the complete narration. Enter production only after
that separate creative approval. Put the viewer promise and honest inquiry before
retention tricks.
```

Define the trigger once near `Choose the operation`:

```markdown
**Central-progression work** means a request that would set or materially change the causal
route from the opening tension, through the insight ladder, to the final payoff. Use this
same trigger in every phase.
```

Add this exact Phase 0 contract without disturbing the walking-vlog override:

```markdown
For a new episode, thesis-level rethink, or other central-progression work, Phase 0 stops
first at architecture and then at the Story Progression Plan. Scoped pre-draft work returns
directly until it crosses that same trigger. A pre-draft plan is a visible creative
baseline, not a definite WHP decision; promotion remains the reconcilable decision.
```

Replace the Phase 1 post-architecture handoff with:

```markdown
Once Martin approves the architecture, return one visible Story Progression Plan and stop.
Do not order beats or draft narration until Martin explicitly approves the complete plan or
directly instructs you to draft from that displayed complete plan. Preserve the approved
architecture as the intellectual baseline and the approved progression as the story
baseline. Scoped work on existing narration does not rebuild either artifact unless it
changes the central message or crosses the central-progression trigger.
```

Keep `## Architecture approval gate`, but change its handoff sentence to:

```markdown
Architecture approval authorizes story planning, not beat ordering or narration. Preserve
the approved architecture as the intellectual baseline while planning.
```

Insert this section immediately before `## Creative approval gate`:

```markdown
## Story progression approval gate

For central-progression work with an approved architecture but no approved progression,
return only the complete Story Progression Plan and wait. Positive feedback on one
obstacle, transition, case, technique, or loop does not approve the whole artifact.

Explicit approval—or a direct instruction to draft from that displayed complete
plan—authorizes beat ordering and narration prototyping. When Martin requests a targeted
revision, change only the addressed progression beat or field and name every downstream
causal consequence instead of silently rewriting later beats.

Keep the approved plan visible as supplied context. If no visible approved plan is
supplied, treat the progression as unapproved. Story-progression approval precedes and does
not replace creative approval of the complete narration and direction.
```

In Phase 2, change the narrative-spine step to:

```markdown
Confirm the approved story progression as the narrative-spine baseline. Evidence may
narrow wording; if it breaks a load-bearing obstacle, reversal, proof handoff, or causal
link, surface the conflict and reopen progression approval.
```

Change Resource routing so `story-and-hook-method.md` is required before building or
revising a Story Progression Plan, not only in Phase 2:

```markdown
- Before building or revising a Story Progression Plan, and for Phase 2 story or opening
  work, read [the story and hook method](references/story-and-hook-method.md).
```

Keep this first commit inside the existing hard 500-line entrypoint ceiling by replacing
the old handoff paragraphs rather than appending parallel ones. Reflow only the newly
replaced Overview and approval-gate prose if a few physical lines must be recovered; do
not reflow or delete unrelated walking-vlog, readability, factual-boundary, or production
contracts. Task 4 creates the permanent 480-line margin.

- [ ] **Step 2: Route architecture approval into story planning**

In `script-architecture.md`, replace the approved-architecture handoff with:

```markdown
When an approved architecture is visible in the supplied context, use it as the
intellectual baseline for the Story Progression Plan. Architecture approval authorizes
story planning, not beat ordering or narration. Preserve its central question, core
answer, belief shift, insight ladder, earned reframe, boundaries, payoff, final lesson,
and learning-and-action contract.
```

Replace the approval exit with:

```markdown
After presenting or revising the complete architecture, stop and wait. Proceed to the
Story Progression Plan only after Martin explicitly approves the architecture or directly
instructs you to plan from that displayed version. Beat ordering, hook writing, and
narration still require the separate story-progression approval.
```

Add these Common mistakes:

```markdown
- Proceeding from architecture approval directly to beats or narration without the Story
  Progression Plan.
- Repairing a flat insight ladder with manufactured story tension instead of reopening
  architecture.
```

- [ ] **Step 3: Add the complete detailed method to the story owner**

Add `Plan story progression before beats` to the Contents and insert this section before
`Start with the promise and payoff`:

```markdown
## Plan story progression before beats

Use this gate for a new episode, thesis-level rethink, or any request that would set or
materially change the causal route from opening tension through the insight ladder to the
final payoff. The approved intellectual architecture comes first. Return the complete
Story Progression Plan and stop; beats, hooks, jokes, final transitions, and narration come
only after approval.

If planning exposes a flat insight ladder, missing proof job, or other load-bearing
architecture defect, return to architecture approval. Do not manufacture story tension
around a weak payload. Planning creates no new Phase 1 research exception.

When Martin asks for alternatives, return compact options containing only Story engine,
technique deltas, and Beat-progression blocks. After he chooses, expand the selected option
into the complete artifact below. When he targets a revision, change only the addressed
progression beat or field. Name every downstream causal consequence instead of silently
rewriting later beats.

### Story engine

State in one sentence how the episode moves from its opening tension to its final payoff.
This is the causal and emotional route, not another thesis statement.

### Story-material inventory

Reference the approved architecture's evidence-row IDs and inherit their factual statuses.
For each case, result, contradiction, consequence, human goal, or unknown, state its honest
story opportunity and its boundary or risk. Do not re-enter an existing evidence record.
Non-load-bearing texture may be added here; new load-bearing material returns to the
architecture evidence map for approval.

Use only `SUPPLIED`, `PROJECT-KNOWN`, `NEEDS-VERIFICATION`, or `HYPOTHETICAL`. Inventory
expectations, goals and obstacles, apparent contradictions, investigation gaps, causal
consequences, demonstrations, recognition analogies, loops, callbacks, humor,
informational rewards, and possible supporting throughlines. Inventory is not selection.

### Technique selection

Use a compact table with these fields:

| Technique | Decision | Material basis | Narrative job | Planned placement | Boundary or rejection reason |
|---|---|---|---|---|---|
| Named move | `SELECTED`, notable `REJECTED`, or `NONE` | Exact inventory item | What changes for the viewer | Opening, beat, bridge, callback, or payoff | Why it is honest or not earned |

Consider question-first or event-first entry; expectation and reversal; ordinary goal,
obstacle, consequential choice, and outcome; investigation challenge; apparent
contradiction and scoped resolution; proof handoff; open loop and payoff; demonstration;
term, evidence, recognition analogy, and application; informational reward;
mechanism-mapped punchline; callback; optional supporting narrative throughline; viewer
application; and final declarative resolution.

The catalog is a consideration checklist, not a fourteen-row quota. Record rows only for
selected moves and notable rejections. If no move is earned, record one `NONE` row and use
direct explanation.

### Beat-progression blocks

Use one addressable block per major beat:

#### Progression beat SP01 — Descriptive name

- **Starting question or expectation:** What the viewer expects or needs answered.
- **Event or evidence:** What enters the story.
- **BUT — complication:** What blocks, reverses, narrows, or complicates the route.
- **THEREFORE — consequence or required next step:** What the complication causes the
  narrator, argument, or viewer to need next.
- **Selected technique:** The move doing the work, or `NONE`.
- **Loop or payoff:** What opens, partially pays, transfers, or closes.
- **Proof job and evidence boundary:** What this beat establishes and does not establish.

But and Therefore are structural fields, not required spoken words. A setup, orientation,
synthesis, or payoff may use `NOT APPLICABLE` only when it states its necessary logical
job. Decorative conjunctions do not create causality.

### Full causal read

Compress the episode into a short end-to-end sequence using `BUT` and `THEREFORE` as
diagnostic labels. This catches chain-level drift that individual beat blocks can miss.
Any surviving “and then” transition needs a necessary proof or orientation job, reordering,
or removal. Final narration uses natural spoken language.

### Retention map

A major handoff is a boundary between insight-ladder steps or an equivalent change in
viewer understanding. Reference the relevant `SP` IDs and name the live reason to continue:
a specific unresolved question, real obstacle, apparent contradiction, promised test,
anticipated consequence, partial payoff, or outcome whose meaning remains unresolved. Do
not re-enter the beat fields or use vague promises such as “it gets stranger.”

### Natural bridge seeds

Provide at most one short, non-final seed for a major handoff that needs one. Every Natural
bridge seed must cite the inventory item or architecture row that makes it true. Natural
forms include “But that seemed impossible, because…”, “That left me with one problem…”,
“Which meant I needed a study that…”, and “The first case answered X. It left Y wide open.”

Do not invent “I almost gave up,” surprise, frustration, a failed hypothesis, or chronology
Martin did not experience. A logical gap may be voiced without pretending it was a personal
event.

### Loop and payoff check

Reference the `SP` IDs where every important opening loop begins, partially pays when
necessary, and finally resolves. This section checks global opening-to-ending closure; it
does not duplicate per-beat loop state.

### Throughline decision

Use a supporting narrative throughline only when it earns the sidecar role. Otherwise
record `NONE` and the concrete reason. If selected, map every return to new information,
changed meaning, raised stakes, mechanism demonstration, tool application, or loop payoff.
The argument remains the spine, and the throughline never substitutes for mechanism
evidence.

### Anti-shoehorn check

Reject manufactured obstacles or contradictions; invented emotion, motive, memory,
chronology, or research events; challenge language with no real gap; repetitive
But / Therefore phrasing; “and then” sequencing with no necessary job; quota-driven
techniques; a sidecar that competes with the thesis; and promises the episode does not pay.

### Approval

- **Status:** `AWAITING-APPROVAL` or `APPROVED`
- **Approved by:** Martin or `PENDING`
- **Approval scope:** Complete progression, not an isolated move
- **Open evidence dependencies:** Every load-bearing `NEEDS-VERIFICATION` item

The writer never self-approves the artifact. Positive feedback on one move is not complete
approval. Explicit approval—or a direct instruction to draft from the displayed complete
plan—makes it the visible story baseline.
```

- [ ] **Step 4: Make rapid mode consume the approved plan**

In `Inputs and selected topic handoff`, replace the old architecture-to-narration shortcut
with:

```markdown
Route a new episode through the script architecture method and then the
story-progression method before narration.
```

Rename `Draft from the approved architecture` to:

```markdown
## Draft from the approved architecture and story progression
```

Replace its opening with:

```markdown
For a new episode or thesis-level rethink, use the approved architecture as the
intellectual baseline, then follow the
[story-progression method](story-and-hook-method.md#plan-story-progression-before-beats).
Return that plan and stop. Draft only when both complete artifacts are visibly approved.

Preserve the Story engine, causal chain, selected moves, evidence boundaries, loops, and
payoffs while finding natural spoken phrasing. If a requested change crosses the
central-progression trigger, reopen the plan instead of silently restructuring the draft.
Planning creates no additional Phase 1 research exception.
```

Add this question to `Rapid quality check` immediately after the architecture question:

```markdown
- Was the complete Story Progression Plan visibly approved before any beat outline or
  narration, and does this draft preserve its causal chain?
```

- [ ] **Step 5: Add the compact production record**

In `annotated-script-format.md`, insert this record after Script metadata and before the
Narrative throughline audit:

Add `Approved story progression` to the Contents list as part of the same edit.

```markdown
### Approved story progression

- **Status:** APPROVED
- **Approved by:** Martin
- **Story engine:** One sentence describing the opening-to-payoff route.
- **Full causal read:** A compact end-to-end `BUT` / `THEREFORE` diagnostic.
- **Selected techniques:** The chosen moves and their `SP` beat IDs.
- **Global loop / payoff closure:** Opening and final `SP` IDs for every important loop.
- **Throughline decision:** `NONE` with a reason, or the selected sidecar and its job.
- **Open evidence dependencies:** `NONE`, or every load-bearing provisional item.
- **Plan-change tradeoffs:** `NONE`, or the evidence-driven change and preserved cost.

#### Progression beat SP01 — Descriptive name
- **Starting question or expectation:** The viewer's starting state.
- **Event or evidence:** The material entering the story.
- **BUT — complication:** `NOT APPLICABLE` — orientation beat with a stated job.
- **THEREFORE — consequence or required next step:** The next logical need.
- **Selected technique:** `NONE` when direct explanation is strongest.
- **Loop or payoff:** The loop state.
- **Proof job and evidence boundary:** What the beat proves and where it stops.
```

State:

```markdown
Populate the Narrative throughline audit from the approved plan's Throughline decision;
do not make Phase 2 choose a second throughline. A `TARGETED-ARTIFACT` includes or updates
the progression record only when its assigned scope sets or changes central progression.
Require the record for a `FULL-SCRIPT` entering Phase 2 through the new gate. Do not
fabricate or backfill a plan for a legacy script unless its central progression is being
set or changed; the rubric evaluates intrinsic causality when no plan is in scope.
The format, template, and package tests own this record in this refinement; structural
validator scope is unchanged.
```

Add the same headings and fields to the worked template. Use this truthful one-beat
example:

```markdown
### Approved story progression

- **Status:** APPROVED
- **Approved by:** Martin
- **Story engine:** A bee's unrewarded detour raises the play question, BUT subjective experience remains unknowable, THEREFORE the episode pays off with observable criteria and an explicit boundary.
- **Full causal read:** The direct route predicts reward-seeking, BUT some bees repeatedly detour to roll balls without food, THEREFORE the behavior is tested against operational play criteria, BUT behavior cannot reveal inner experience, THEREFORE the viewer gets a bounded observation method.
- **Selected techniques:** SP01 — expectation → reversal; SP01 — evidence → bounded viewer application.
- **Global loop / payoff closure:** SP01 opens and closes the question of whether this behavior meets observable play criteria.
- **Throughline decision:** NONE — one beat cannot support three distinct sidecar returns.
- **Open evidence dependencies:** NONE in this worked shape; independently recheck every copied source.
- **Plan-change tradeoffs:** NONE.

#### Progression beat SP01 — The detour
- **Starting question or expectation:** An animal takes the unobstructed route to food.
- **Event or evidence:** Some bees detour and repeatedly roll wooden balls without food reward.
- **BUT — complication:** The behavior can meet operational play criteria without revealing subjective experience.
- **THEREFORE — consequence or required next step:** Give the viewer observable criteria and state the interpretive boundary.
- **Selected technique:** Expectation → reversal, followed by bounded application.
- **Loop or payoff:** The opening question closes inside the same beat.
- **Proof job and evidence boundary:** The experiment supports the reported behavior and criteria; it does not establish what a bee feels.
```

- [ ] **Step 6: Make the rubric scope-aware**

At the end of `Story momentum without invented details`, add:

```markdown
When the appendix contains an approved Story Progression Plan, a top score also requires
the narration to preserve its causal chain, selected honest moves, proof handoffs, and
global loop/payoff closure. Penalize manufactured drama, quota-driven technique use, an
unreported load-bearing deviation, or a bridge that promises content the narration never
delivers.

When no approved progression is in scope, score intrinsic causal movement. Do not penalize
a legacy script or scoped `TARGETED-ARTIFACT` for the absence of a plan it was never
required to contain. Audit only visible document state; record any evidence-driven
plan-change tradeoff in the production appendix.
```

- [ ] **Step 7: Run focused and complete GREEN checks**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k story_progression -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
```

Expected: all five new tests pass and the full focused package suite remains green. If the
500-line ceiling fails, reduce wording inside the touched gate paragraphs only; do not begin
the package-wide ownership cleanup before Task 3 records its RED state.

- [ ] **Step 8: Commit the additive gate and schema**

Stage only Tasks 1–2 hunks:

```bash
git add -p -- \
  .agents/skills/writing-whp-youtube-scripts/SKILL.md \
  .agents/skills/writing-whp-youtube-scripts/references/script-architecture.md \
  .agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md \
  .agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md \
  .agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md \
  .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md \
  .agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
git diff --cached --check
git diff --cached
git commit -m "feat(skill): gate narration on story progression"
```

The staged diff must exclude pre-existing walking-vlog, checker, and Episode 1 changes.

### Task 3: Replace distribution pins with owner-and-consumer tests

**Files:**
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Reassign every known distribution test to one declared owner**

Keep each test's existing contract strings unless the row below explicitly says to replace
them. Remove loops that require identical strings in `skill`, `rapid`, `story`, and
`steering`.

| Existing test | Detailed owner after refactor | Consumer check |
|---|---|---|
| `test_investigation_challenge_bridge_is_real_and_reserved` | `story` | Skill and rapid link to story owner. |
| `test_observable_resistance_can_disarm_the_immunity_defense` | `rapid` | Core keeps only the factual/invention invariant. |
| `test_opening_proof_case_is_clear_on_first_hearing` | `rapid` | Story links to rapid drafting guidance. |
| `test_enduring_failure_uses_an_early_case_and_current_echo` | `story` | Rapid follows approved selected moves. |
| `test_examples_follow_a_real_world_consequence_chain` | `story` | Rapid has a derived drafting pointer. |
| `test_adjacent_cases_require_an_explicit_inference_bridge` | `story` | Architecture retains its distinct evidence-map handoff. |
| `test_proof_handoffs_lead_with_the_positive_takeaway` | `story` | Rapid has a derived drafting pointer. |
| `test_punchlines_stay_short_and_separate_from_explanation` | `rapid` | Story points to rapid for line-level humor. |
| `test_narration_uses_the_friendly_conversation_format` | `rapid` | Core keeps only the concise voice invariant. |
| `test_voice_keeps_factual_precision_without_emotional_sterilization` | `rapid` | `BRAND.md` and steering remain canonical; do not require a four-file copy inside `SKILL_ROOT`. |
| `test_source_label_studies_keep_the_item_source_and_outcome_visible` | `rapid` | Story points to rapid case narration. |
| `test_story_uses_the_fewest_elements_that_preserve_causal_truth` | `rapid` | Story points to rapid case narration. |
| `test_story_compression_preserves_trust_clarity_and_magnetism` | `rapid` | Story points to rapid case narration. |
| `test_story_compression_preserves_causal_completeness` | `rapid` | Story points to rapid case narration. |
| `test_story_uses_causal_minimum_and_locked_vocabulary` | `rapid` | Story points to rapid case narration. |
| `test_story_rule_contract_is_distributed_across_core_guidance` | Rename to `test_structural_story_contract_lives_in_story_owner` and check `story` only. | Skill and rapid route to owner. |
| `test_worldwide_patterns_use_novel_cases_then_a_global_montage` | `rapid` | No core copy. |
| `test_unfamiliar_names_are_prepared_and_introduced` | `rapid` | No core copy. |
| `test_supporting_narrative_throughline_contract_is_distributed` | `story` | Format and template consume the plan's decision with their own field-level tests. |

- [ ] **Step 2: Add the failing anti-mirroring test**

```python
def test_detailed_story_rules_are_not_verbatim_mirrors(self) -> None:
    skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
    rapid = " ".join(RAPID_MD.read_text(encoding="utf-8").split())
    story = " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split())

    structural_owner_anchors = (
        "Before a surprising result, state the outcome the viewer should reasonably expect",
        "case → exact takeaway → why it matters here → remaining question → next evidence",
        "The challenge must be epistemically real, never manufactured drama",
    )
    drafting_owner_anchors = (
        "Tell the smallest story that preserves trust, causal clarity, and surprise.",
        "Compression removes clutter, never connective tissue.",
        "Preserve the causal minimum, not the procedural maximum.",
    )

    for anchor in structural_owner_anchors:
        with self.subTest(owner="story", anchor=anchor):
            self.assertIn(anchor, story)
            self.assertNotIn(anchor, skill)
            self.assertNotIn(anchor, rapid)

    for anchor in drafting_owner_anchors:
        with self.subTest(owner="rapid", anchor=anchor):
            self.assertIn(anchor, rapid)
            self.assertNotIn(anchor, skill)
            self.assertNotIn(anchor, story)

    self.assertIn(
        "Derived from the structural story owner",
        rapid,
    )
    self.assertIn(
        "For line-level case narration, spoken compression, and humor, read",
        story,
    )
```

- [ ] **Step 3: Tighten the entrypoint target**

Change the existing line-count assertion to the approved task target:

```python
def test_skill_entrypoint_stays_below_progressive_disclosure_limit(self) -> None:
    self.assertLessEqual(len(SKILL_MD.read_text(encoding="utf-8").splitlines()), 480)
```

- [ ] **Step 4: Run the ownership tests and verify RED**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k detailed_story_rules -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k skill_entrypoint_stays_below -v
```

Expected: both runs fail because the current core, rapid, and story guidance still mirror
detailed structural and drafting paragraphs and `SKILL.md` has not yet gained its permanent
480-line margin.

### Task 4: Consolidate detailed guidance and restore GREEN

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Replace the long core story block with concise invariants**

In `SKILL.md`, replace everything from
`### Apply story construction across the script — optional supporting narrative throughline`
up to but not including `### Mark locked lines for memory delivery` with:

```markdown
### Preserve the approved progression while drafting

For central-progression work, read the detailed story owner before planning. After approval,
preserve the Story engine, causal chain, selected moves, proof jobs, evidence boundaries,
loops, payoff, and Throughline decision. Reopen the gate instead of silently changing a
load-bearing choice.

Always-loaded invariants:

- Use only story moves the real material earns. Never invent a roadblock, contradiction,
  emotion, motive, chronology, failed hypothesis, research event, or near-surrender.
- But / Therefore diagnoses causal movement; it is not a literal-word or per-beat quota.
- Keep adjacent proof jobs distinct and make the remaining question create the next
  evidence need.
- The argument remains the spine. A supporting narrative throughline is optional and never
  substitutes for mechanism evidence.
- Apply selected humor, callbacks, loops, and payoffs without turning the approved plan into
  formulaic phrasing.

For Phase 1 line-level case narration, spoken compression, hook, humor, and factual-boundary
application, follow the rapid method. For the detailed progression schema and structural
story rules, follow the story and hook method.
```

- [ ] **Step 2: Make the story owner structural rather than a second line editor**

Update the Contents entry from `Build a narrative spine from changed understanding` to
`Draft from the approved progression`.

In `story-and-hook-method.md`, replace `## Build every story across the complete script`
through the heading before `## Score the opening candidates` with:

```markdown
## Build every story across the complete script

Apply the approved structural moves to every developed beat, not only the opening. Before a
surprising result, state the outcome the viewer should reasonably expect when that
expectation is necessary to understand the reversal. Reveal the result in direct contrast.
Give consecutive cases distinct proof jobs before synthesis.

Connect adjacent evidence as
`case → exact takeaway → why it matters here → remaining question → next evidence`.
Lead with the positive proof job, then state the boundary and let the unresolved part create
the need for the next evidence. A scope boundary is not a transition.

An investigation challenge is allowed only when the remaining question is a real evidence
gap or scoped contradiction. The challenge must be epistemically real, never manufactured
drama or an invented personal event. Resolve apparent contradiction inside the evidence
scopes rather than sailing past it.

Use the approved expectation reversal, obstacle, consequence, proof handoff, loop, callback,
demonstration, informational reward, humor placement, and Throughline decision as the
structural baseline. Do not add an unplanned move merely because it sounds dramatic in
prose.

For line-level case narration, spoken compression, and humor, read
[the rapid drafting method](rapid-prototyping.md#apply-the-approved-progression-while-drafting).
That file owns trust anchors, causal completeness, stable spoken nouns, first-hearing setup,
source-label narration, punchline length, friendly voice, and geographic/name treatment.
```

Replace `## Build a narrative spine from changed understanding` with:

```markdown
## Draft from the approved progression

The approved Story engine and `SP` blocks are the narrative-spine baseline; do not build a
second spine after planning. Convert each block into a beat that changes viewer
understanding, preserves its proof boundary, and creates the recorded next question or
consequence. Spoken phrasing may develop naturally, but the causal route, loop state, and
payoff stay stable.

If prose reveals that one `BUT`, `THEREFORE`, proof job, or payoff cannot work honestly,
surface the defect and return to the targeted progression revision rule. Do not hide the
change inside a smoother transition.
```

At the start of `Add a supporting narrative throughline`, add:

```markdown
Populate this section from the approved plan's Throughline decision. Planning chooses the
sidecar; drafting realizes its mapped returns.
```

- [ ] **Step 3: Keep only draft-time rules in rapid guidance**

Rename the rapid story section to:

```markdown
## Apply the approved progression while drafting
```

Replace the structural prefix—from that heading through the paragraph immediately before
`Tell the smallest story that preserves trust, causal clarity, and surprise`—with:

```markdown
> Derived from the structural story owner:
> [Plan story progression before beats](story-and-hook-method.md#plan-story-progression-before-beats)
> and
> [Build every story across the complete script](story-and-hook-method.md#build-every-story-across-the-complete-script).

Require a visible approved progression before episode-scale narration. Preserve its `SP`
sequence, selected techniques, proof jobs, loops, and payoff. This section owns how those
decisions become concise, spoken, first-hearing-clear prose; it does not choose a second
structure.
```

Keep the current rapid-owned material beginning with `Tell the smallest story...`, including
causal completeness, locked vocabulary, source-label narration, friendly voice, proper-name
preparation, and humor constraints.

- [ ] **Step 4: Enforce the 480-line task target**

Run:

```bash
wc -l .agents/skills/writing-whp-youtube-scripts/SKILL.md
```

Expected: no more than `480` lines. Do not remove the Phase 0 walking-vlog override, spoken
readability gate, factual boundary, production non-negotiables, or dynamic validation
command to reach the target.

- [ ] **Step 5: Run ownership and complete package checks**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k story_progression -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k detailed_story_rules -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
python3 -m unittest discover \
  -s .agents/skills/writing-whp-youtube-scripts/scripts \
  -p 'test_*.py'
```

Expected: the targeted ownership tests pass, the focused package suite passes, and all
skill-package tests pass. The distribution-test count may decrease because redundant
per-file assertions are consolidated; zero failures is the invariant.

- [ ] **Step 6: Commit ownership cleanup separately**

```bash
git add -p -- \
  .agents/skills/writing-whp-youtube-scripts/SKILL.md \
  .agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md \
  .agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
git diff --cached --check
git diff --cached
git commit -m "refactor(skill): give story planning one detailed owner"
```

Confirm the staged diff contains the ownership cleanup and rewritten tests only.

### Task 5: Pressure-test the gate without touching Episode 1

**Files:**
- Create:
  `docs/superpowers/evidence/2026-07-27-whp-story-progression-gate.md`

- [ ] **Step 1: Create a synthetic approved-architecture fixture**

Use this test-only architecture:

```markdown
## Synthetic approved architecture

- **Status:** TEST FIXTURE — APPROVED INPUT, NOT A WHP CONTENT DECISION
- **Package:** Why a broken streak makes restarting feel harder than beginning.
- **Central question:** How can a progress counter support practice without becoming the goal?
- **Core answer:** A counter can lower restart friction by making continuity visible, but
  it becomes harmful when protecting the number replaces the practice.
- **Insight ladder:**
  1. Visible continuity can make the next repetition easier to begin.
  2. A missed day reverses the same signal: the counter now displays loss.
  3. Treating repair as part of the rule preserves practice without pretending the miss
     never happened.
- **Evidence map:**
  - `E-01` — The learner wants to keep practicing — `HYPOTHETICAL`.
  - `E-02` — The streak breaks after a missed day — `HYPOTHETICAL`.
  - `E-03` — Protecting the number competes with honest practice — `HYPOTHETICAL`.
  - `E-04` — A bounded repair rule changes the next choice — `HYPOTHETICAL`.
- **Learning and action contract:** Notice whether the next action serves the practice or
  only repairs the score; use one explicit restart rule and observe whether practice resumes.
- **Final lesson:** A useful score points back to the practice; it never becomes the practice.
```

- [ ] **Step 2: Run the implemented method against the fixture**

The evidence file must contain the returned Story Progression Plan with:

- Story engine: continuity promises momentum, `BUT` a missed day turns the score into loss,
  `THEREFORE` a bounded restart rule becomes the payoff.
- Inventory rows referencing `E-01` through `E-04`; no new factual claims.
- Selected moves: expectation → reversal, ordinary goal → obstacle → choice → outcome, open
  loop → final payoff, and viewer application.
- One notable rejection: investigation challenge is `REJECTED` because no real research
  obstacle occurred.
- Three addressable blocks `SP01` through `SP03`.
- One `NOT APPLICABLE` setup field with its orientation job stated.
- Throughline decision `NONE` because the hypothetical learner would add no distinct proof
  or meaning across three returns.
- Approval status `AWAITING-APPROVAL`, approved by `PENDING`; never impersonate Martin.
- No hook prose beyond one evidence-bound Natural bridge seed and no narration draft.

- [ ] **Step 3: Record the dry-run verdict**

End the evidence file with:

```markdown
## Verdict

- **Gate order:** PASS — approved architecture precedes the returned plan; no beats or
  narration follow it.
- **Causal movement:** PASS — each major transition has a real `BUT`, `THEREFORE`, or an
  explicitly justified `NOT APPLICABLE` job.
- **Technique selection:** PASS — selected moves shape the route; investigation challenge
  and supporting throughline are rejected rather than forced.
- **Evidence boundary:** PASS — every material item points to `E-01`–`E-04`; no research or
  real-world claim was invented.
- **Natural language:** PASS — bridge seed reflects the logical reversal without fake
  first-person chronology or near-surrender.
- **Approval behavior:** PASS — status remains `AWAITING-APPROVAL`; the dry run stops.
```

- [ ] **Step 4: Commit dry-run evidence**

```bash
git add -- docs/superpowers/evidence/2026-07-27-whp-story-progression-gate.md
git diff --cached --check
git diff --cached
git commit -m "test(skill): dry-run story progression gate"
```

### Task 6: Verify the complete implementation and protected scope

**Files:**
- Test:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Test: all files under
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_*.py`
- Validate:
  `.agents/skills/writing-whp-youtube-scripts/`

- [ ] **Step 1: Run focused and full automated verification**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
python3 -m unittest discover \
  -s .agents/skills/writing-whp-youtube-scripts/scripts \
  -p 'test_*.py'
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/writing-whp-youtube-scripts
```

Expected: zero test failures and `Skill is valid!`.

- [ ] **Step 2: Run static contract checks**

```bash
wc -l .agents/skills/writing-whp-youtube-scripts/SKILL.md
rg -n \
  'Architecture approval authorizes beat ordering|use it as the content baseline for the first narration prototype|Proceed to beat ordering, hook writing, and narration only after Martin explicitly approves the architecture' \
  .agents/skills/writing-whp-youtube-scripts
git diff --check
```

Expected:

- `SKILL.md` has at most 480 lines;
- the stale architecture-to-narration search returns no matches;
- `git diff --check` reports no whitespace errors.

- [ ] **Step 3: Inspect ownership and protected files**

```bash
git status --short
git log --oneline -5
git diff -- \
  .agents/skills/writing-whp-youtube-scripts \
  docs/superpowers/evidence/2026-07-27-whp-story-progression-gate.md
```

Confirm:

- detailed progression schema appears only in `story-and-hook-method.md`;
- rapid guidance retains its draft-time rules and links to the structural owner;
- the core contains gates and concise invariants only;
- the compact production record appears in format and template;
- `validate_annotated_script.py` and its tests are unchanged;
- Episode 1, `whp-youtube/predrafts/`, the walking-vlog checker and plan, historical
  artifacts, and unrelated worktrees contain no task-owned edits;
- the three implementation commits remain separable and no unrelated dirty hunk was swept
  into them.

- [ ] **Step 4: Report exact verification evidence**

Report the focused and total test counts shown by the fresh commands, validator result,
final `SKILL.md` line count, commit hashes, protected dirty files left untouched, and any
remaining unresolved issue. Do not claim completion from earlier baseline results.
