# WHP Painpoint and Learning/Action Gates — Implementation Plan

> **Design:** [`2026-07-23-whp-painpoint-action-gates-design.md`](../specs/2026-07-23-whp-painpoint-action-gates-design.md)
>
> **Branch:** `skill/painpoint-action-gates`

**Goal:** Make problem-led topic selection painpoint-first and make a non-obvious learning
plus concrete viewer response mandatory before a script architecture can be approved.

**Architecture:** Preserve the existing topic funnel, six eligibility gates, scorecard,
and script production workflow. Strengthen candidate construction and report provenance
inside the topic skill. Add a distributed learning-and-action contract across the script
skill's architecture, rapid-prototype, and review references.

**Implementation medium:** Markdown skill packages with Python `unittest` contract tests.

---

## Task 1: Guard the topic painpoint contract

**Files:**

- Modify: `.agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py`
- Test: `.agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py`

1. Add one package test that normalizes `SKILL.md`, `references/research-method.md`, and
   `references/output-contract.md`.
2. Require the problem-led painpoint-first rule, the widest-specific boundary, the exact
   candidate fields, evidence dimensions, the non-problem-led boundary, and visible
   candidate/winner output fields.
3. Run:

   ```bash
   python3 .agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py
   ```

4. Confirm the new test fails because the distributed contract is absent.

## Task 2: Implement the topic painpoint contract

**Files:**

- Modify: `.agents/skills/choosing-whp-video-topic/SKILL.md`
- Modify: `.agents/skills/choosing-whp-video-topic/references/research-method.md`
- Modify: `.agents/skills/choosing-whp-video-topic/references/output-contract.md`

1. Add a checklist item and generation-stage rule requiring painpoint comparison before
   mechanism choice for problem-led candidates.
2. Define the candidate record: target viewer, lived moment, cost, evidence of reach or
   recurrence, surface explanation, hidden mechanism, new understanding, and usable
   response.
3. Compare reach, recognition, frequency, consequence, and unresolvedness without
   inventing a market-size formula.
4. Preserve wonder-, history-, and explicit-game-led candidates through an explicit
   shared-mystery/desire/tension boundary.
5. Expose the audience pain or shared tension in candidate-landscape and winner-brief
   records.
6. Re-run the topic package test and confirm it passes.

## Task 3: Guard the learning-and-action architecture

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Test: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

1. Add one package test that normalizes `SKILL.md`,
   `references/script-architecture.md`, `references/rapid-prototyping.md`, and
   `references/quality-rubric.md`.
2. Require a `### Learning and action contract` artifact with new understanding, prior
   model, concrete response, decision rule or sequence, observable result, boundary, and
   transfer.
3. Require the `Before / Now / Next time / Observe` acceptance test and the explicit
   rejection of vague advice or a loose checklist.
4. Require rapid narration and quality review to preserve the approved contract.
5. Run:

   ```bash
   python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
   ```

6. Confirm the new test fails because the distributed contract is absent.

## Task 4: Implement the learning-and-action architecture

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`

1. Add the double-payoff gate to the core workflow and non-negotiables.
2. Add the complete architecture artifact and acceptance test.
3. Fail architecture approval when either the non-obvious insight or the concrete,
   observable response is absent.
4. Make rapid openings, narration, application, and endings carry the approved contract
   without turning the by-end promise into a joke or generic tease.
5. Make quality review reject vague advice and non-observable checklists.
6. Re-run the script package test and confirm it passes.

## Task 5: Verify, regenerate, and commit

**Files:**

- Verify all modified files.
- No episode file changes.

1. Run both package suites:

   ```bash
   python3 .agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py
   python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
   ```

2. Run any repository-provided package validator discovered for these skill directories.
3. Run `git diff --check`, inspect the complete diff, and verify the original checkout
   remains untouched.
4. Regenerate the current AI/human-interaction candidate architecture in chat using the
   updated artifact. Label it as a candidate architecture rather than the winner of a
   fresh topic-selection run.
5. Commit all skill and plan changes on `skill/painpoint-action-gates`.
