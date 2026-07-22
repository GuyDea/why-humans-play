# WHP Rapid Script Prototyping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the WHP YouTube script skill default to fast, funny, scoped creative prototyping while preserving an explicit approval gate and the existing evidence-backed production workflow.

**Architecture:** Keep `SKILL.md` as the compact phase and operation router. Put Phase 1 craft guidance and the selected-topic handoff in one new `references/rapid-prototyping.md`; retain the current evidence, rights, format, template, rubric, and validator resources for Phase 2. Lock the behavioral boundary with static package tests, then forward-test five fresh agents and record the raw outputs and verdicts.

**Tech Stack:** Agent Skills Markdown, YAML interface metadata, Python 3 standard-library `unittest`, the existing deterministic annotated-script validator, skill-creator `quick_validate.py`, Git, and fresh Codex subagents for skill evaluation.

---

## File map

| Path | Responsibility |
|---|---|
| `.agents/skills/writing-whp-youtube-scripts/SKILL.md` | Route requests by operation and phase; keep rapid work direct and Phase 2 rigorous. |
| `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md` | Define topic-brief handoff, scoped operations, hook stack, humor, examples, spoken rhythm, and the rapid quality check. |
| `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md` | Keep the detailed three-opening comparison, but make it Phase 2 or explicitly requested work. |
| `.agents/skills/writing-whp-youtube-scripts/agents/openai.yaml` | Advertise both rapid prototyping and evidence-backed finalization. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py` | Lock the phase router, operation boundaries, selected-topic handoff, hook contract, resource routing, and UI metadata. |
| `docs/superpowers/evidence/2026-07-22-whp-rapid-script-prototyping-evaluation.md` | Preserve the three observed baselines, five forward-test prompts and raw outputs, acceptance judgments, refinements, and limitations. |
| `docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md` | Change status from implementation pending to implemented only after all verification and evaluation gates pass. |

The existing validator, annotated format, production template, research method, quality rubric, topic-selection skill, steering documents, episode draft, and future app surface are not implementation targets.

### Task 1: Add the failing package contracts

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Add a rapid-resource and metadata expectation**

Extend `test_required_package_files_exist` so `required` also contains:

```python
"references/rapid-prototyping.md",
```

Replace `expected_openai` with:

```python
expected_openai = (
    b"interface:\n"
    b'  display_name: "WHP YouTube Script Writer"\n'
    b'  short_description: "Prototype and finalize compelling WHP scripts"\n'
    b'  default_prompt: "Use $writing-whp-youtube-scripts to rapidly '
    b'prototype, refine, or production-finalize a Why Humans Play episode '
    b'script."\n'
)
```

- [ ] **Step 2: Add phase-router and factual-safety tests**

Add these methods to `SkillPackageTests`:

```python
def test_rapid_mode_is_the_default_and_skips_production_overhead(self) -> None:
    skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
    contracts = (
        "Default to Phase 1 for ideas, openings, hooks, rough drafts, short "
        "narration, humor or voice passes, and scoped refinement.",
        "Return the requested artifact directly.",
        "Do not perform web research, write an assignment contract or evidence "
        "packet, force three opening candidates, create annotated-script "
        "scaffolding, plan visuals or rights, run the production rubric, or invoke "
        "the validator unless Martin explicitly asks for that work.",
    )
    for contract in contracts:
        with self.subTest(contract=contract):
            self.assertIn(contract, skill)

def test_rapid_mode_defers_verification_without_permitting_fabrication(self) -> None:
    rapid_path = SKILL_ROOT / "references/rapid-prototyping.md"
    self.assertTrue(rapid_path.is_file())
    rapid = " ".join(rapid_path.read_text(encoding="utf-8").split())
    self.assertIn("Deferred verification permits speed, never fabrication.", rapid)
    for factual_atom in (
        "date",
        "person",
        "experiment",
        "quotation",
        "chronology",
        "motive",
        "mechanism",
    ):
        with self.subTest(factual_atom=factual_atom):
            self.assertIn(factual_atom, rapid)
    self.assertIn(
        "Omit unavailable specificity or write around it; do not fill the gap.",
        rapid,
    )
```

- [ ] **Step 3: Add independently invocable operation tests**

Add:

```python
def test_rapid_operations_are_independent_and_selection_scoped(self) -> None:
    rapid = " ".join(
        (SKILL_ROOT / "references/rapid-prototyping.md")
        .read_text(encoding="utf-8")
        .split()
    )
    for heading in (
        "### Generate",
        "### Review",
        "### Rewrite selection",
        "### Generate alternatives",
        "### Promote",
    ):
        with self.subTest(heading=heading):
            self.assertIn(heading, rapid)
    contracts = (
        "Return findings only; do not rewrite the supplied text.",
        "Return only the replacement for the supplied selection unless Martin "
        "requests commentary.",
        "Keep the source selection unchanged and return clearly separated, "
        "genuinely distinct choices for the same narrative job.",
        "Do not depend on hidden conversational state.",
    )
    for contract in contracts:
        with self.subTest(contract=contract):
            self.assertIn(contract, rapid)

def test_selected_topic_brief_is_consumed_without_rerunning_ideation(self) -> None:
    rapid = " ".join(
        (SKILL_ROOT / "references/rapid-prototyping.md")
        .read_text(encoding="utf-8")
        .split()
    )
    self.assertIn(
        "Treat a supplied selected topic brief as the handoff from topic "
        "selection; do not rerun topic ideation unless Martin explicitly asks.",
        rapid,
    )
    for field in (
        "topic and angle",
        "audience",
        "title and thumbnail promise",
        "core tension or open question",
        "by-end viewer promise",
        "intended payoff",
        "factual anchors",
        "important unknowns",
    ):
        with self.subTest(field=field):
            self.assertIn(field, rapid)
```

- [ ] **Step 4: Add the complete-hook and approval-gate tests**

Add:

```python
def test_rapid_hook_contract_includes_question_relevance_and_promise(self) -> None:
    rapid = " ".join(
        (SKILL_ROOT / "references/rapid-prototyping.md")
        .read_text(encoding="utf-8")
        .split()
    )
    hook = (
        "event → joke → paradox → meaning → consequential question → viewer "
        "relevance → by-end promise"
    )
    self.assertIn(hook, rapid)
    for contract in (
        "Open with a concrete event",
        "State the big question",
        "Connect the problem to the viewer",
        "Promise what the viewer will understand, recognize, identify, or be able "
        "to do by the end",
        "Follow every non-obvious abstraction with a concrete example, image, or "
        "consequence",
        "Demonstrate the pattern before naming the concept",
        "Push mechanism-derived humor to the stronger second or third beat",
    ):
        with self.subTest(contract=contract):
            self.assertIn(contract, rapid)

def test_creative_approval_gate_precedes_production(self) -> None:
    skill = " ".join(SKILL_MD.read_text(encoding="utf-8").split())
    gate = (
        "Remain in Phase 1 until Martin explicitly approves the premise, voice, "
        "hook, and story direction or directly requests evidence-backed "
        "finalization."
    )
    preserve = (
        "Preserve the approved prototype as the voice baseline; research may narrow "
        "claims but must not silently replace its structure or personality."
    )
    self.assertIn(gate, skill)
    self.assertIn(preserve, skill)
    self.assertLess(skill.index(gate), skill.index("## Phase 2 — Evidence and production"))
```

- [ ] **Step 5: Lock production routing and opening-comparison scope**

Add:

```python
def test_phase_two_keeps_existing_production_resources(self) -> None:
    skill = SKILL_MD.read_text(encoding="utf-8")
    for resource in (
        "references/story-and-hook-method.md",
        "references/research-and-rights.md",
        "references/annotated-script-format.md",
        "assets/annotated-script-template.md",
        "references/quality-rubric.md",
        "scripts/validate_annotated_script.py",
    ):
        with self.subTest(resource=resource):
            self.assertIn(resource, skill)

    story = " ".join(
        (SKILL_ROOT / "references/story-and-hook-method.md")
        .read_text(encoding="utf-8")
        .split()
    )
    self.assertIn(
        "Use this three-candidate comparison only in Phase 2 or when Martin "
        "explicitly requests opening options or a scored comparison.",
        story,
    )
    self.assertIn(
        "In Phase 1, generate the single requested opening unless Martin asks for "
        "alternatives.",
        story,
    )
```

- [ ] **Step 6: Update the relative-resource order test**

Change `expected` in `test_relative_markdown_resources_exist` to:

```python
expected = [
    "references/rapid-prototyping.md",
    "references/story-and-hook-method.md",
    "references/research-and-rights.md",
    "references/annotated-script-format.md",
    "assets/annotated-script-template.md",
    "references/quality-rubric.md",
]
```

- [ ] **Step 7: Run the package suite and verify RED**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py -v
```

Expected: failures identify the absent rapid reference, old production-first router, old metadata, and unscoped three-candidate rule. Confirm the failures are requirement failures rather than syntax or import errors. Do not commit the red state.

### Task 2: Implement the two-phase skill

**Files:**

- Create: `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/agents/openai.yaml`
- Test: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Write the rapid-prototyping reference**

Create `references/rapid-prototyping.md` with these sections in this order:

```markdown
# Rapid Script Prototyping

## Inputs and selected topic handoff
## Choose the requested operation
### Generate
### Review
### Rewrite selection
### Generate alternatives
### Promote
## Draft for discovery
## Build the complete hook
## Explain through examples
## Make humor carry meaning
## Write for speech and momentum
## Compact worked example
## Rapid quality check
## Common mistakes
```

The reference must implement these exact behavioral rules:

```markdown
Treat a supplied selected topic brief as the handoff from topic selection; do not rerun topic ideation unless Martin explicitly asks.

Carry forward any supplied topic and angle, audience, title and thumbnail promise, core tension or open question, by-end viewer promise, intended payoff, factual anchors, and important unknowns. Missing nonessential fields do not block a useful prototype. Ask only when a missing choice would materially change the requested artifact.

Do not depend on hidden conversational state. Work from the supplied topic brief, artifact or selection, surrounding context, requested operation, and creative status. In ordinary chat, use the visible conversation; a future local workbench may provide the same inputs explicitly.

Deferred verification permits speed, never fabrication. Use facts Martin supplies or facts already present in current project material. Never invent a date, person, experiment, quotation, chronology, motive, or mechanism. Omit unavailable specificity or write around it; do not fill the gap.
```

Define each operation with the exact contracts asserted in Task 1. For `Generate`, return one artifact at the requested scope rather than a menu. For `Promote`, require explicit creative approval and preserve the approved text as the voice baseline.

Define the hook spine exactly as:

```text
event → joke → paradox → meaning → consequential question → viewer relevance → by-end promise
```

Explain each beat with concise imperatives. Include all seven hook, example, terminology, and humor phrases asserted in Task 1. State that humor may be sharp or brutal toward mechanisms, incentives, institutions, and absurd consequences, but must stay legible and must not become cruelty toward vulnerable people.

Use one compact, explicitly conditional example whose header says the factual spine comes from a supplied brief. The example may use this supplied spine:

```text
In 2018, researchers ran an AI block-stacking experiment. The AI flipped a block instead of completing the intended stack and still received reward.
```

Demonstrate a fast event, mechanism-derived joke, paradox, viewer consequence, and by-end promise without adding researchers' names, lab details, dialogue, motives, or mechanism details not present in that supplied spine.

End with the ten checks from the approved design and tell the agent to keep the audit internal unless Martin asks to see it.

- [ ] **Step 2: Rewrite `SKILL.md` as a concise router**

Use this frontmatter:

```yaml
---
name: writing-whp-youtube-scripts
description: "Use when ideating, drafting, reviewing, or revising Why Humans Play YouTube scripts and openings, or when turning an approved prototype into an evidence-backed, production-annotated episode."
---
```

Keep the body under 500 lines and use this section order:

```markdown
# Write Why Humans Play YouTube Scripts
## Overview
## Required project context
## Choose the operation
## Phase 1 — Rapid prototype
## Creative approval gate
## Phase 2 — Evidence and production
## Production non-negotiables
## Resource routing
## Validation and completion
```

The `Overview` must say one skill supports two phases and that rapid work is the default. The context section must still require `BRAND.md` and `whp-youtube/STEERING.md`, but must consume a selected topic brief rather than rerun topic selection and must not require a visible assignment contract in Phase 1.

Under `Choose the operation`, summarize the five independently invocable operations and preserve selection scope. Under `Phase 1`, include all three exact rapid-mode contracts asserted in Task 1 and route directly to `[the rapid prototyping method](references/rapid-prototyping.md)`.

At the creative gate, include the two exact approval and voice-preservation sentences asserted in Task 1.

Under Phase 2, retain the current assignment contract, evidence packet, narrative spine, personal-input decision, viewer application, spoken delivery, production treatment, audits, and validation workflow. Preserve the exact personal-input and spoken-application sentences already asserted by existing tests. Do not weaken any factual, rights, readiness, or `RECORD-READY` constraint.

Route resources in this exact link order:

```markdown
1. [the rapid prototyping method](references/rapid-prototyping.md)
2. [the story and hook method](references/story-and-hook-method.md)
3. [the research and rights method](references/research-and-rights.md)
4. [the annotated script format](references/annotated-script-format.md)
5. [the annotated script template](assets/annotated-script-template.md)
6. [the quality rubric](references/quality-rubric.md)
```

Keep the existing portable validator command and path-resolution wording byte-for-byte where tests require it.

- [ ] **Step 3: Scope the three-opening comparison**

In `references/story-and-hook-method.md`:

1. Rename the contents link and section heading from `Generate and score three opening candidates` to `Compare and score three opening candidates`.
2. Add these two sentences before the existing candidate-card method:

```markdown
Use this three-candidate comparison only in Phase 2 or when Martin explicitly requests opening options or a scored comparison. In Phase 1, generate the single requested opening unless Martin asks for alternatives.
```

3. Keep the existing card, scoring table, disqualification rules, story method, production guidance, and research basis unchanged.

- [ ] **Step 4: Update `agents/openai.yaml`**

Write exactly:

```yaml
interface:
  display_name: "WHP YouTube Script Writer"
  short_description: "Prototype and finalize compelling WHP scripts"
  default_prompt: "Use $writing-whp-youtube-scripts to rapidly prototype, refine, or production-finalize a Why Humans Play episode script."
```

- [ ] **Step 5: Run focused and full tests to verify GREEN**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py -v
```

Expected: every package and validator test passes with no warning or error output.

- [ ] **Step 6: Validate package structure and worked production asset**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/writing-whp-youtube-scripts
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py -- "$(pwd)/.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md"
```

Expected: `Skill is valid!` and `PASS: annotated script is structurally valid` with the validator's stated limitations.

- [ ] **Step 7: Review and commit the green checkpoint**

Run:

```bash
git diff --check
git status --short
git diff -- .agents/skills/writing-whp-youtube-scripts
git add .agents/skills/writing-whp-youtube-scripts/SKILL.md .agents/skills/writing-whp-youtube-scripts/agents/openai.yaml .agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md .agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
git diff --cached --check
git diff --cached
git commit -m "feat(skill): add rapid WHP script prototyping"
```

Expected: one focused commit containing the tests and the smallest implementation that makes them pass.

### Task 3: Forward-test the skill and close observed gaps

**Files:**

- Create: `docs/superpowers/evidence/2026-07-22-whp-rapid-script-prototyping-evaluation.md`
- Modify only if a tested gap appears: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify only if a tested gap appears: `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify only if a tested gap appears: `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Modify first when closing any gap: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Preserve the three no-skill baselines**

Create the evaluation document and record the complete outputs from the already-run baseline agents `baseline_rapid_draft`, `baseline_refinement`, and `baseline_transition`. Preserve exact text rather than paraphrasing it. Record these observed failures without adding new claims:

- the rapid draft found voice, humor, examples, and a strong callback, but supplied factual details were not sufficiently bounded;
- the refinement invented a year and overgeneralized with “every time you talk to AI, your words become that signal”; and
- the transition correctly froze the voice baseline and proposed an evidence audit, showing which production behavior should remain.

- [ ] **Step 2: Dispatch five fresh skill-enabled scenarios**

Give each fresh agent the canonical skill path and tell it to perform a real, read-only editorial task without changing repository files. Do not reveal the intended answer or the design diagnosis.

Scenario A — rapid three-minute narration:

```text
Use $writing-whp-youtube-scripts at .agents/skills/writing-whp-youtube-scripts. Write one funny three-minute WHP narration now; return the narration only, with no research, verification, audit, outline, or production notes. The supplied factual spine is: In 2018, researchers ran an AI block-stacking experiment; the AI flipped a block instead of completing the intended stack and still received reward. Connect that incident quickly to ordinary human incentives and present-day AI conversations. The opening must ask the big question and promise what the viewer will be able to recognize by the end. Do not add factual details beyond this spine.
```

Scenario B — scoped opening rewrite:

```text
Use $writing-whp-youtube-scripts at .agents/skills/writing-whp-youtube-scripts. Rewrite only the selected opening below. Return replacement copy only and preserve its factual spine; do not research, outline, or rewrite the rest of the script.

Surrounding job: establish the real event, earn a joke, expose the paradox, connect it to the viewer, and make a by-end promise.

Selected opening: “In 2018, researchers ran an AI block-stacking experiment. The AI flipped a block instead of completing the intended stack and still received reward. This showed a problem with the metric.”

Make it sharper, funnier, and more consequential without adding names, lab details, dialogue, motives, or mechanism details.
```

Scenario C — approved prototype promotion:

```text
Use $writing-whp-youtube-scripts at .agents/skills/writing-whp-youtube-scripts. The premise, voice, hook, and story direction of the supplied prototype are explicitly approved. Begin promoting it toward an evidence-backed eight-minute production script. Preserve its language as the voice baseline, identify the material claims that now require evidence, state how unsupported wording would be narrowed rather than silently replacing the personality, and enter the existing assignment, evidence, annotated-production, rights, rubric, and validation workflow. Do not call it record-ready and do not invent sources.

Approved prototype: “The AI flipped the brick like some AIs just want to see the world burn, reported that everything was good and dandy, and waited for its reward. Funny—until you realize it did exactly what the score rewarded. So how often does an AI solve the sentence you typed while quietly losing the thing you meant? By the end, you’ll know how to spot that gap before a polished answer hides it.”
```

Scenario D — review only:

```text
Use $writing-whp-youtube-scripts at .agents/skills/writing-whp-youtube-scripts. Review the selected passage in its surrounding context. Return findings only. Do not rewrite any sentence.

Before: “The shortcut is funny because the failure is visible.”
Selection: “This problem is everywhere. Schools count tests. Companies count calls. AI counts rewards.”
After: “When the proxy becomes the goal, the real goal can quietly rot.”

Assess hook value, clarity, overclaiming, example quality, humor opportunity, and how well the selection performs its bridge into Goodhart's law.
```

Scenario E — alternatives only:

```text
Use $writing-whp-youtube-scripts at .agents/skills/writing-whp-youtube-scripts. Generate four clearly labeled replacement choices for only the selected punchline. Keep the source selection unchanged, make the choices genuinely different, and do not choose a winner or rewrite surrounding text.

Before: “The support agent completed every call in record time.”
Selection: “Customers: mysteriously furious.”
After: “The number improved because the thing it was supposed to represent got worse.”

Narrative job: a brutal but clear mechanism-derived joke showing how completed-call metrics can reward ending calls before solving the customer's problem.
```

- [ ] **Step 3: Judge each output against fixed acceptance checks**

Record `pass`, `partial`, or `fail`, with exact supporting excerpts:

| Scenario | Acceptance checks |
|---|---|
| A | one narration; roughly three spoken minutes; concrete event; mechanism-derived humor; consequential question; early AI–human relevance; explicit by-end promise; concrete examples after abstractions; no added factual atoms; no production overhead |
| B | replacement copy only; factual spine intact; stronger hook; no added factual atoms; no unrelated script rewrite |
| C | explicit gate recognized; approved voice preserved; material claims extracted; unsupported claims narrowed; all existing Phase 2 resources entered; no invented source or readiness claim |
| D | findings only; no replacement prose; selection and surrounding job both considered; overclaiming and humor opportunity addressed |
| E | four labeled choices; distinct comic approaches; same narrative job; original selection not mutated; no winner chosen; no surrounding rewrite |

- [ ] **Step 4: Close only observed gaps with a new RED–GREEN cycle**

For every failed or partial contract:

1. Add the smallest package test that reproduces the missing instruction.
2. Run that test and observe the expected failure.
3. Make the smallest skill or reference edit that addresses the exact behavior.
4. Re-run the focused package suite.
5. Re-run only the affected fresh scenario with a new agent.
6. Record the refinement, raw rerun, and verdict.

Do not add generic rules for hypothetical failures and do not alter the production validator unless a genuine validator regression is independently demonstrated.

- [ ] **Step 5: Commit the evaluation checkpoint**

Run the full package and validator suites, then:

```bash
git diff --check
git add docs/superpowers/evidence/2026-07-22-whp-rapid-script-prototyping-evaluation.md
git add .agents/skills/writing-whp-youtube-scripts/SKILL.md .agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md .agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
git diff --cached --check
git diff --cached
git commit -m "test(skill): record rapid script workflow evaluation"
```

Stage only files that actually changed. Expected: the evidence record plus any test-first refinements justified by observed behavior.

### Task 4: Verify, review, and mark the design implemented

**Files:**

- Modify: `docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md`

- [ ] **Step 1: Run final deterministic verification**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py -v
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/writing-whp-youtube-scripts
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/writing-whp-youtube-scripts
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py -- "$(pwd)/.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md"
git diff --check
```

Expected: all tests pass; both canonical and discovery-link validation report `Skill is valid!`; the worked asset passes structural validation; and the diff check is silent.

- [ ] **Step 2: Confirm the implementation stayed inside scope**

Run:

```bash
git diff --name-only 42077d8..HEAD
git status --short
```

Confirm no application framework, app directory, persistent data contract, topic-selection implementation, validator behavior, brand doctrine, or unrelated user artifact changed.

- [ ] **Step 3: Request an independent code and skill-package review**

Give a fresh reviewer:

- base SHA `42077d8`;
- current `HEAD`;
- the approved design path;
- the implementation plan path; and
- the instruction to review requirement coverage, TDD evidence, phase routing, preservation of Phase 2 rigor, portability, overfitted static tests, and future-workbench boundaries.

Fix every Critical or Important issue with a new failing test where behavior changes. Re-run all verification after any fix.

- [ ] **Step 4: Mark the design status accurately**

Only after deterministic checks, five forward scenarios, and independent review pass, change:

```markdown
**Status:** Approved design; implementation pending
```

to:

```markdown
**Status:** Implemented and verified
```

Append a short `## Implementation evidence` section linking the implementation plan and evaluation record and listing the final test count and validation results. Do not describe semantic forward evaluations as deterministic proof.

- [ ] **Step 5: Review and commit the status checkpoint**

Run:

```bash
git diff --check
git add docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md
git diff --cached --check
git diff --cached
git commit -m "docs(spec): mark rapid script workflow implemented"
git status --short --branch
```

Expected: the status commit contains only the design evidence update and the final worktree is clean on `main`.

## Plan self-review

- Every approved design requirement maps to a static contract, an implementation step, a forward scenario, or an explicit preserved Phase 2 resource.
- The future app boundary is represented only through operation-shaped skill behavior and explicit inputs; no protocol, framework, persistence, UI, or placeholder app code is introduced.
- The red tests precede behavioral skill edits, and any forward-test refinement repeats RED–GREEN before editing instructions.
- Existing production requirements and validator behavior remain regression-covered rather than rewritten.
- The plan contains no unresolved placeholder or undefined function/type contract.
