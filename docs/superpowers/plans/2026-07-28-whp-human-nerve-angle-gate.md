# WHP Human-Nerve Angle Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Make raw-topic ideation find and verify a specific human nerve before choosing a
mechanism or package, with one detailed owner and drift-resistant consumers.

**Architecture:** `references/research-method.md#subject-to-angle-development` becomes the
single detailed owner. The topic skill triggers and routes to it; the script skill invokes
the bounded topic-angle operation for raw subjects; steering and output surfaces retain
only their own doctrine or schema responsibilities.

**Tech Stack:** Markdown skill packages, Python `unittest` contract tests, Git.

---

### Task 1: Add failing ownership and behavior contracts

**Files:**

- Modify: `.agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Test: both modified `test_skill_package.py` files

- [ ] **Step 1: Add the topic-package RED test**

Add repository and consumer paths plus a test that requires:

```python
owner_anchors = (
    "A subject is search territory, not an angle.",
    "### Find the specific human nerve",
    "Run the `Choose what?` test.",
    "### Prove mechanism and promise fit",
    "### Worked example: Popularity",
)
```

Require every owner anchor in `references/research-method.md` and forbid it in
`SKILL.md`, `references/output-contract.md`, `whp-youtube/STEERING.md`,
`docs/steering/whp-video-topic-skill.md`, and the script package. Require consumer links to
target `#subject-to-angle-development`.

- [ ] **Step 2: Add the script-package RED test**

Require `SKILL.md` to distinguish a raw subject from a selected topic brief and to invoke
the bounded `choosing-whp-video-topic` `Ideate subjects/angles` operation before
architecture. Require it to preserve an already selected angle without rerunning
selection.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
python3 .agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
```

Expected: each new test fails because the detailed owner and raw-subject routing do not yet
exist; pre-existing tests remain green.

### Task 2: Implement the single detailed owner

**Files:**

- Modify: `.agents/skills/choosing-whp-video-topic/references/research-method.md`
- Modify: `.agents/skills/choosing-whp-video-topic/SKILL.md`
- Modify: `.agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py`
- Test: `.agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py`

- [ ] **Step 1: Expand the canonical subject-to-angle owner**

Inside `## Subject-to-angle development`, add:

```text
audience-language scan
→ materially different candidate nerves
→ concrete first-person concern or dilemma
→ lived-moment and primal-stake specificity tests
→ evidence-supported nerve selection
→ mechanism fit
→ honest title/opening promise
→ evidence-bounded payoff and handoff
```

Define a human nerve broadly enough to include fear, desire, dilemma, identity stake, and
fascination. Keep pain optional for wonder-, history-, and explicit-game-led work.

- [ ] **Step 2: Add specificity and honesty gates**

Require:

```text
In [specific moment], I fear/want/wonder [specific concern], because [human stake].
```

Use `Choose what?`, recognizable-moment, personal-stake, evidence-breadth,
mechanism-fit, and title-to-payoff tests. Require perception language such as `feel` or
`seem` when the evidence explains an appearance rather than an objective condition.

- [ ] **Step 3: Add one worked regression example**

Contrast the vague `Popularity` route with:

```text
nerve: Am I less wanted than everyone around me?
title: Why Does It Feel Like Everyone Has More Friends Than You?
mechanism: highly connected people are overrepresented in comparison sets
payoff: popular people appear in more people's worlds
```

Mark the example as a method illustration whose claims still require verification in a
real topic run.

- [ ] **Step 4: Thin the topic skill to routing**

Make `Ideate subjects/angles` run the bounded audience-language and subject-to-angle scan.
Replace the duplicated painpoint checklist in `SKILL.md` with a direct link to
`references/research-method.md#subject-to-angle-development`. Keep operation triggers and
the full-run checklist in `SKILL.md`.

- [ ] **Step 5: Refactor the old distributed-contract test**

Make the existing painpoint test validate the complete fields and comparison dimensions in
the detailed owner only. Keep output-shape assertions in `references/output-contract.md`.
Add negative assertions that prevent owner-only anchors from returning to consumers.

- [ ] **Step 6: Run the topic package test and verify GREEN**

Run:

```bash
python3 .agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py
```

Expected: all topic package tests pass.

### Task 3: Route raw scripting subjects through the angle owner

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Test: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Add the raw-subject handoff**

In required project context, state:

```text
A raw subject alone is not a selected topic brief.
```

For a new episode supplied only as a raw subject, require the
`choosing-whp-video-topic` `Ideate subjects/angles` operation and return the exact angle
proposal before architecture. Preserve a supplied or approved angle without reopening
selection.

- [ ] **Step 2: Keep the consumer thin**

Link to the canonical topic method and forbid the script skill from copying its candidate
fields, specificity tests, worked example, or research sequence. Script architecture and
story progression remain unchanged.

- [ ] **Step 3: Run the script package test and verify GREEN**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
```

Expected: all script package tests pass.

### Task 4: Validate behavior and absence of drift

**Files:**

- Create: `docs/superpowers/evidence/2026-07-28-whp-human-nerve-angle-gate.md`
- Verify: all modified skill and steering files

- [ ] **Step 1: Forward-test unfamiliar subjects**

Run fresh, context-isolated evaluations for at least one problem-led subject and one
wonder- or explicit-game-led subject. Give evaluators only the updated skill and raw topic;
do not disclose target answers or the `Popularity` success case.

- [ ] **Step 2: Record baseline and forward results**

Preserve the untouched-skill `Popularity` output, its failure analysis, the new evaluation
prompts and outputs, and a criterion-by-criterion verdict. Do not promote any evaluation
topic into the episode backlog.

- [ ] **Step 3: Run deterministic validation**

Run:

```bash
python3 .agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/choosing-whp-video-topic
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/writing-whp-youtube-scripts
git diff --check
```

Expected: both suites pass, both skill packages validate, and the diff check is clean.

- [ ] **Step 4: Audit single ownership**

Search active doctrine and both skill packages for every owner-only anchor. Confirm each
appears once in `research-method.md` and nowhere else. Confirm every consumer link targets
an existing heading.

- [ ] **Step 5: Review and commit**

Inspect the complete diff, stage only task-owned files, rerun staged diff checks, and commit
with:

```bash
git commit -m "feat(skill): require a specific human nerve"
```
