# Spoken Readability Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent WHP narration from being delivered with sentences that are too long or
too difficult to understand after one hearing.

**Architecture:** Add a small standard-library checker that extracts spoken blockquote
narration, removes non-spoken evidence links, and splits it into sentences. Classify
sentence length mechanically, then combine a character-based readability score with
relationship markers such as colons, dashes, contrasts, and subordinate clauses so a short
but structurally dense sentence can also fail. Keep first-hearing meaning as a documented
human gate because no formula can reliably detect every unclear actor, comparison, or
abstraction.

**Tech Stack:** Python 3 standard library, `unittest`, Markdown skill guidance.

---

### Task 1: Build the deterministic sentence gate

**Files:**
- Create:
  `.agents/skills/writing-whp-youtube-scripts/scripts/check_spoken_readability.py`
- Create:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_check_spoken_readability.py`

- [ ] **Step 1: Write the failing extraction and threshold tests**

Cover these behaviors with `unittest`:

```python
def test_extracts_only_spoken_narration_and_removes_evidence_links():
    markdown = """
# Title
> A short factual sentence. [F-001](https://example.com/source)
## Appendix
> This appendix sentence must not count.
"""
    sentences = extract_spoken_sentences(markdown)
    self.assertEqual([item.text for item in sentences], ["A short factual sentence."])

def test_twenty_six_words_is_a_failure():
    sentence = " ".join(f"word{index}" for index in range(26)) + "."
    finding = analyze_markdown(f"> {sentence}")[0]
    self.assertEqual(finding.level, "fail")

def test_twenty_one_through_twenty_five_words_require_review():
    sentence = " ".join(f"word{index}" for index in range(21)) + "."
    finding = analyze_markdown(f"> {sentence}")[0]
    self.assertEqual(finding.level, "review")

def test_twenty_words_pass_the_mechanical_gate():
    sentence = " ".join(f"word{index}" for index in range(20)) + "."
    finding = analyze_markdown(f"> {sentence}")[0]
    self.assertEqual(finding.level, "pass")

def test_short_structurally_dense_sentence_is_a_failure():
    sentence = (
        "Those assistants often shifted their answers toward users' stated beliefs—"
        "even when those beliefs were wrong."
    )
    finding = analyze_markdown(f"> {sentence}")[0]
    self.assertEqual(finding.level, "fail")
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_check_spoken_readability.py
```

Expected: `ModuleNotFoundError` because the checker does not exist.

- [ ] **Step 3: Implement the minimal checker**

Implement:

```python
HARD_MAX_WORDS = 25
REVIEW_MIN_WORDS = 21
STRUCTURAL_GRADE_FLOOR = 12.0

@dataclass(frozen=True)
class SpokenSentence:
    line: int
    text: str
    word_count: int
    level: str
    reason: str

def extract_spoken_sentences(markdown: str) -> list[SpokenSentence]:
    """Extract blockquoted narration before Appendix and strip review annotations."""

def analyze_markdown(markdown: str) -> list[SpokenSentence]:
    """Classify length and short-but-dense sentence structure."""

def main(argv: Sequence[str] | None = None) -> int:
    """Print sentence diagnostics and fail while any hard failure or uncleared review remains."""
```

Use the Automated Readability Index as the dependency-free vocabulary signal. Do not fail
on that score alone: combine a high score with at least one relationship boundary so a
short sentence that merely introduces a necessary technical name is not rejected. Treat a
colon, semicolon, em dash, contrast, condition, or subordinate clause as a relationship
boundary.

The CLI accepts one Markdown path. It exits `1` for any 26+ sentence and for any shorter
sentence that crosses the structural-difficulty rule. It also exits `1` for 21–25-word
review items unless `--reviewed` is supplied after the first-hearing review. It exits `0`
only when no unresolved mechanical item remains.

- [ ] **Step 4: Run the checker tests and verify GREEN**

Run the Task 1 test command again.

Expected: all readability-checker tests pass.

- [ ] **Step 5: Commit the checker**

Commit:

```text
feat(skill): add spoken readability checker
```

### Task 2: Make the hard gate part of the scripting workflow

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Add a failing distributed-contract test**

Require the core guidance to state:

```text
Readability is a delivery gate, not a post-draft editorial audit.
A sentence above 25 spoken words fails and must be rewritten before delivery.
Every sentence from 21 through 25 spoken words requires a first-hearing review.
A shorter sentence also fails when difficult vocabulary and multiple relationships make
it hard to process.
A sentence of any length fails when a first-hearing listener cannot identify who did
what, what changed, and why it matters.
```

Require the skill to name the checker command and the rubric to score the same gate.

- [ ] **Step 2: Run the skill-package suite and verify RED**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
```

Expected: the new readability contract test fails because the guidance is incomplete.

- [ ] **Step 3: Add the minimal workflow guidance**

State that the gate runs before narration is shown, unlike later timing and retention
audits. Require agents to:

1. run the checker on the target script;
2. rewrite every 26+ sentence;
3. rewrite every shorter sentence the structural-difficulty check rejects;
4. review every 21–25 sentence for one relationship, explicit actors and references, and
   first-hearing causal clarity;
5. reject confusing sentences even when they contain 20 words or fewer;
6. split sentences without deleting evidence boundaries, connective tissue, humor, or
   personality;
7. rerun the checker before delivery.

- [ ] **Step 4: Run the skill-package suite and quick validation**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/writing-whp-youtube-scripts
```

Expected: all tests pass and the skill reports `Skill is valid!`.

- [ ] **Step 5: Commit the skill contract**

Commit:

```text
feat(skill): enforce narration readability gate
```

### Task 3: Bring Episode 1 through the new gate

**Files:**
- Modify:
  `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`

- [ ] **Step 1: Run the checker and capture the expected failures**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/check_spoken_readability.py \
  whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md
```

Expected: current 26+ sentences fail and current 21–25 sentences require review.

- [ ] **Step 2: Rewrite every hard failure**

Split at causal or rhetorical boundaries. Preserve factual claims, adjacent source markers,
the approved message, the best-friend voice, and the joke's setup.

- [ ] **Step 3: Clear every review-range sentence**

For each 21–25-word sentence, confirm that a listener can identify the actor, action,
comparison, result, and consequence after one hearing. Rewrite any sentence that cannot.

- [ ] **Step 4: Rerun the gate**

Run the checker without `--reviewed` if all sentences are 20 words or fewer. Otherwise
conduct the documented first-hearing review and rerun with `--reviewed`.

Expected: exit `0` with no unresolved readability items.

- [ ] **Step 5: Commit the revised narration**

Commit:

```text
content(youtube): pass episode one readability gate
```

### Task 4: Verify the completed branch

**Files:**
- Verify all task-owned files above.

- [ ] **Step 1: Run both checker and skill suites**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_check_spoken_readability.py
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/writing-whp-youtube-scripts
python3 .agents/skills/writing-whp-youtube-scripts/scripts/check_spoken_readability.py \
  whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 2: Review the complete diff and branch status**

Confirm that no historical or concurrent Script Creator artifact changed, the current
worktree is clean, and the commits remain limited to this feature branch.
