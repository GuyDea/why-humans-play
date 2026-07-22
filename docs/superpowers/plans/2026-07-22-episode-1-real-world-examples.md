# Episode 1 Real-World Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate funny Goodhart and Campbell examples with explicit human consequences into Episode 1, make its four-question promise directly usable with AI, close on a declarative lesson, and encode the reusable editorial rule in the WHP script skill.

**Architecture:** Preserve the narration-first episode format and revise the human bridge as one escalation: hypothetical Goodhart distortions first, documented Campbell corruption cases second, then return to conversational AI. Keep reusable editorial behavior in the rapid and story references, with deterministic contract tests and a before/after semantic forward test. Extend the existing appendix rather than creating a second script artifact.

**Tech Stack:** Markdown skills and scripts; Python `unittest` package checks; the existing annotated-script validator; Git.

---

### Task 1: Strengthen the script-skill contract

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Modify: `docs/superpowers/evidence/2026-07-22-whp-rapid-script-prototyping-evaluation.md`

- [x] **Step 1: Add failing contract tests**

Assert that the skill prefers documented real-world examples, requires the chain `goal → measure or target → changed behavior → improved number → damaged goal and human cost`, separates the joke from the negative implication, closes complete narration with a declarative lesson, and phrases the compact promise as questions the viewer can ask AI.

- [x] **Step 2: Verify the focused tests fail for the missing contract**

Run: `python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

Expected: FAIL because the new contract language is absent from the unmodified skill.

- [x] **Step 3: Implement the minimum reusable guidance**

Strengthen the main skill router and the two relevant references without duplicating detailed instructions. Preserve the factual boundary: rapid drafts may use supplied or project-available facts, while Phase 2 must source every factual case.

- [x] **Step 4: Verify the package tests pass**

Run: `python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

Expected: PASS with all skill-package tests green.

- [x] **Step 5: Record the semantic baseline and commit**

Add the unmodified-skill output and diagnosed gap to the evaluation record. Stage only the five task-owned files and commit with `feat(script-skill): require real-world consequence chains`.

### Task 2: Rewrite the complete Episode 1 narration and appendix

**Files:**
- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`

- [x] **Step 1: Replace the human bridge with one causal escalation**

Use school and customer-service examples for Goodhart's law, then Atlanta schools and Wells Fargo for Campbell's law. For every example, state the intended goal, the number that improved, the behavior, and the concrete cost.

- [x] **Step 2: Make the AI application conversational**

Change the opening promise and payoff to four questions viewers can ask AI. Rewrite the four questions as direct prompts and preserve the limitation that the AI's response is not proof of correctness, intent, or internal reasoning.

- [x] **Step 3: Clarify the flipped-brick callback and close decisively**

Replace the opaque “flipped brick with better grammar” line with the concrete callback “The sentences are stacked. Your actual problem is still on the floor.” End on the lesson that winning the instruction-created game must mean solving the viewer's real problem.

- [x] **Step 4: Keep narration and appendix synchronized**

Update beat titles and matching appendix entries, metadata, assignment contract, story functions, claim mappings, original-only visual treatments, evidence records for Campbell's law, Atlanta, and Wells Fargo, and the exact extracted narration word count. Leave timing and editorial audits pending until Martin reviews the complete narration.

- [x] **Step 5: Validate and commit the episode**

Run the annotated-script validator against the absolute episode path. Expected: structural PASS with the standard limitation that it does not verify factual truth, rights, or editorial quality. Commit with `feat(script): add Goodhart and Campbell consequence stories`.

### Task 3: Forward-test and verify the branch

**Files:**
- Modify if needed: `docs/superpowers/evidence/2026-07-22-whp-rapid-script-prototyping-evaluation.md`

- [x] **Step 1: Repeat the neutral semantic scenario with the revised skill**

Use the same request as the baseline: explain Goodhart's law through funny school and customer-service examples without explicitly requesting impacts. Confirm the output now seeks or flags real-world grounding and states the damaged goal and affected person rather than stopping at the joke.

- [x] **Step 2: Run full deterministic verification**

Run the full skill-package tests, all annotated-script validator tests, the skill-creator validator, the Episode 1 structural validator, `git diff --check`, and a stale-language search for the old promise, opaque callback, and question-only ending.

- [x] **Step 3: Review and commit any evaluation update**

Inspect the full task diff, preserve unrelated files, and commit the semantic result separately if the evidence record changed.
