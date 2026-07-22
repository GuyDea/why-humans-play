# WHP Episode 1 Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encode the approved informational-tidbit rule and rebuild Episode 1 as a sourced, production-annotated three-minute script that preserves the approved voice.

**Architecture:** Keep the editorial rule in the existing rapid-prototyping reference and its deterministic package test. Keep the episode's clean narration and production notes in the existing single Markdown source of truth, with stable evidence IDs and original-only visual fallbacks.

**Tech Stack:** Markdown, Python `unittest`, the repository's annotated-script validator, Git.

---

### Task 1: Add the informational-tidbit contract

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`

- [x] **Step 1: Write the failing test**

Add a test that normalizes the rapid reference and requires these behaviors:

```python
def test_rapid_adds_useful_informational_tidbits_without_trivia(self) -> None:
    rapid = " ".join(
        (SKILL_ROOT / "references/rapid-prototyping.md")
        .read_text(encoding="utf-8")
        .split()
    )
    for contract in (
        "When a compact verified fact can deepen a concept without slowing the story, add one short informational tidbit.",
        "Use the tidbit to reveal an origin, scale, reversal, or consequence.",
        "Do not add decorative trivia that merely interrupts the story.",
    ):
        self.assertIn(contract, rapid)
```

- [x] **Step 2: Run the focused test to verify RED**

Run: `python3 -m unittest .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py -k informational_tidbits`

Expected: `FAIL` because the three contracts are absent.

- [x] **Step 3: Add the minimal rapid-method instruction**

Add a short section after concept naming that requires a verified origin, scale, reversal, or consequence fact only when it deepens the idea without slowing the story; explicitly reject decorative trivia.

- [x] **Step 4: Verify GREEN and regressions**

Run: `python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

Expected: all package tests pass.

- [x] **Step 5: Commit the skill behavior**

```bash
git add .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py .agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md
git commit -m "feat(skill): add useful informational tidbits"
```

### Task 2: Verify the episode evidence packet

**Files:**
- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`

- [x] **Step 1: Reopen the primary block-stacking paper and dependent DeepMind explanation**

Confirm the year, team attribution, simulated task, observed flip, received reward, unfinished stack, and bottom-face description. Preserve the dependence between the paper and DeepMind explanation.

- [x] **Step 2: Locate the primary Goodhart source and an authoritative historical cross-check**

Confirm the original policy context and distinguish Goodhart's original formulation from the later popular paraphrase. Use only wording supported by the checked sources.

- [x] **Step 3: Build the bounded claim records**

Retain stable IDs `F-001` and `F-002` for their existing claims. Assign `F-006` to the new Goodhart-history claim; never recycle deleted IDs `F-003`–`F-005`.

- [x] **Step 4: Reverse-audit all factual narration**

Map every factual sentence or separable clause to an adjacent beat-level claim entry, and leave jokes, opinions, and clearly signaled hypotheticals unmapped.

### Task 3: Rebuild the three-minute annotated script

**Files:**
- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`

- [x] **Step 1: Preserve the approved voice baseline**

Use the approved question-first opening, block-flip joke, literal four-question promise, brutal mechanism-derived examples, professional-email application, flipped-brick callback, and final question.

- [x] **Step 2: Fit the narration to approximately three minutes**

Keep the narration around 450–500 spoken words, with the first two sentences plain and the mechanism explanation outside them.

- [x] **Step 3: Complete the production annotations**

Give each beat all eight required subsections, choose exactly one story-specific personal-input decision, voice all five viewer-application elements, use original WHP visual treatments, and finish all four end-reference sections.

- [x] **Step 4: Set an honest readiness state**

Keep the script at `RESEARCH-DRAFT` until Martin approves this final narration. Do not infer `EDITORIAL-DRAFT` or `RECORD-READY` from completeness or validation.

### Task 4: Validate and review

**Files:**
- Modify if needed: `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify if needed: `whp-youtube/episodes/01-why-ai-cheats.md`

- [x] **Step 1: Run the skill and validator suites**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py
```

Expected: all tests pass.

- [x] **Step 2: Run the episode validator**

Run from `.agents/skills/writing-whp-youtube-scripts` with the resolved absolute episode path:

```bash
python3 scripts/validate_annotated_script.py -- "/tmp/why-humans-play-episode-1-finalization/whp-youtube/episodes/01-why-ai-cheats.md"
```

Expected: `PASS`, with the structural-validation limitation preserved.

- [x] **Step 3: Run skill-package validation and repository checks**

Run the available `quick_validate.py` against the skill package, then run `git diff --check`, narration word-count extraction, and `git status --short`.

- [x] **Step 4: Perform an independent forward review**

Give a fresh reviewer only the updated skill and episode artifact. Fix any Critical or Important issue, then rerun the relevant tests.

- [x] **Step 5: Commit the final episode**

```bash
git add docs/superpowers/plans/2026-07-22-whp-episode-1-finalization.md whp-youtube/episodes/01-why-ai-cheats.md
git commit -m "feat(script): finalize three-minute AI pilot"
```
