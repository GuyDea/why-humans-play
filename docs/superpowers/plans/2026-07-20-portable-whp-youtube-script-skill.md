# Portable WHP YouTube Script Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and validate one portable Agent Skills package that reliably produces story-led, source-audited, visually annotated Why Humans Play YouTube scripts in Codex, Claude Code, and other compatible agent clients.

**Architecture:** Keep the only editable skill package under `.agents/skills/writing-whp-youtube-scripts/` and expose it to Claude Code through a relative directory symlink under `.claude/skills/`. Put the concise orchestration in `SKILL.md`, move judgment-heavy methods into focused references, provide one worked annotated-script asset, and enforce only deterministic structural rules with a dependency-free Python validator. Validate both the program and the instructions with red/green tests: unit tests for structure and isolated agent evaluations for behavior.

**Tech Stack:** Agent Skills `SKILL.md`, Markdown references/assets, Python 3 standard library (`argparse`, `dataclasses`, `pathlib`, `re`, `unittest`), Git relative symlink, skill-creator `quick_validate.py`.

---

## File map

| Path | Responsibility |
|---|---|
| `.agents/skills/writing-whp-youtube-scripts/SKILL.md` | Portable trigger metadata, mandatory workflow, resource routing, and completion rules. |
| `.agents/skills/writing-whp-youtube-scripts/agents/openai.yaml` | Optional OpenAI UI metadata only; never required by the workflow. |
| `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md` | Worked, source-linked example showing the exact deliverable shape. |
| `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md` | Complete field-by-field annotated script contract and readiness rules. |
| `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md` | Scored editorial review and release gates. |
| `.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md` | Claim verification, confidence wording, visual provenance, and rights workflow. |
| `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md` | Opening selection, story integration, narrative spine, and animation-purpose method. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py` | Deterministic Markdown structure validator and CLI. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py` | Standard-library unit tests for validator behavior. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py` | Static package, portability, resource-link, and discovery-link tests. |
| `.claude/skills/writing-whp-youtube-scripts` | Relative symlink to the canonical package. |
| `docs/superpowers/evidence/2026-07-20-whp-youtube-script-skill-baseline.md` | Preserved RED-phase failure evidence from generation without the skill. |
| `docs/superpowers/evidence/2026-07-20-whp-youtube-script-skill-evaluation.md` | Forward-test scenarios, results, observed gaps, refinements, and final comparison. |

### Task 1: Preserve the RED-phase behavioral baseline

**Files:**

- Create: `docs/superpowers/evidence/2026-07-20-whp-youtube-script-skill-baseline.md`

- [ ] **Step 1: Record the exact baseline assignment and evaluation frame**

Create the evidence file with these sections and facts:

```markdown
# WHP YouTube Script Skill — Baseline Evidence

- Date: 2026-07-20
- Condition: fresh agent without the proposed skill
- Purpose: RED-phase observation, not a production script

## Assignment

Create an approximately 80-second Why Humans Play script excerpt about the
evolutionary paradox of animal play. Open with the South American fur-seal
observation, include inline visual and animation notes, cite evidence, and preserve
the paper's exact meaning.

## Observed output

The output was engaging and organized, but it changed the mortality observation
from “26 pups were taken; 22 had been playing immediately before the attack” into
wording that made “22” sound like a separate subset that died after a different
event sequence. It supplied general evidence links without precise claim locators,
described visuals as concepts such as “licensed archival footage” without actual
asset-page links or rights bases, and suggested attractive motion without always
stating what relationship the motion explained.

## Failing behaviors

1. Narrative compression changed the meaning of a statistic.
2. Evidence links lacked precise page, table, figure, or timestamp locators.
3. Visual concepts were not tied to candidate asset pages.
4. “Licensed” was used as a conclusion without a recorded license or permission.
5. Animation was sometimes decorative rather than explanatory.

## Required improvement

Forward tests pass only if claim wording preserves denominators and event order,
evidence and asset records remain separate, visual candidates have provenance and
rights statuses, uncertain material is qualified in narration, animation states its
explanatory purpose, and the completed script ends with both evidence and visual
source ledgers.
```

- [ ] **Step 2: Check the evidence file for accidental readiness claims**

Run:

```bash
rg -n "production-ready|record-ready|rights cleared|factually verified" docs/superpowers/evidence/2026-07-20-whp-youtube-script-skill-baseline.md
```

Expected: no matches. The file records observed failures and does not certify the
baseline output.

- [ ] **Step 3: Commit the RED evidence**

```bash
git add docs/superpowers/evidence/2026-07-20-whp-youtube-script-skill-baseline.md
git commit -m "test: record YouTube script skill baseline"
```

Expected: one commit containing only the baseline evidence file.

### Task 2: Specify the annotated-script validator with failing tests

**Files:**

- Create: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`
- Test later: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`

- [ ] **Step 1: Initialize the canonical package with the required generator**

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/init_skill.py writing-whp-youtube-scripts --path .agents/skills --resources scripts,references,assets --interface 'display_name=WHP YouTube Script Writer' --interface 'short_description=Write rigorous, production-annotated WHP scripts' --interface 'default_prompt=Use $writing-whp-youtube-scripts to develop a story-led, source-audited Why Humans Play episode script.'
```

Expected: the generator creates the canonical directory, `SKILL.md`,
`agents/openai.yaml`, and the three resource directories. Keep the generated
entrypoint uncommitted until Task 6 replaces its scaffold text; do not treat it as an
implemented skill.

- [ ] **Step 2: Write the unit-test module before the validator exists**

Use a self-contained valid document fixture and mutations so the expected contract is
visible in the tests. The module must import the future validator through its sibling
directory and include these test cases:

```python
from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from validate_annotated_script import validate_document


VALID_DOCUMENT = """# Why Bees Roll Balls

- **Status:** RESEARCH-DRAFT
- **Version:** 0.1
- **Target runtime:** 00:45
- **Word count:** 97
- **Audience:** Curious adults
- **Episode mode:** Why We Play
- **Title:** The Bee That Chose a Toy
- **Thumbnail promise:** A bee rolling a wooden ball
- **Viewer promise:** See why one tiny detour changed the case for animal play.
- **Central question:** Can an insect play without a reward?
- **Thesis:** The behavior meets established play criteria, with interpretive limits.
- **Payoff:** Play-like behavior does not require a mammalian brain.
- **Evidence review:** Primary paper checked; interpretation remains bounded.
- **Rights review:** Candidate paper figure usable under CC BY 4.0; video unresolved.

## Beat 01 — The detour
_Time: 00:00–00:20 · Target: ~45 words_

### Narration
> A bumblebee can walk straight to food. In a 2022 experiment, some turned aside,
> gripped wooden balls, and rolled them repeatedly without a food reward. The
> researchers argued that the behavior met their criteria for play. That does not
> tell us what a bee feels—but it makes the detour hard to dismiss.

### Story function
Turns a laboratory choice into the episode's central question without inventing a
bee's motives.

### Claims
- `F-001` — Repeated unrewarded ball rolling met the study's play criteria (`VERIFIED`).

### Visual
- Use the paper's experimental-layout figure as `A-001`.
- Fallback: recreate the arena as a labeled diagram using only reported dimensions.

### Motion / edit
- Trace the direct route to food, then reveal the bee's detour toward the balls.
- **Animation purpose:** Make the unnecessary detour and repeated choice spatially clear.

### On-screen text
- “Galpayage Dona et al., 2022 · Fig. 1”

### Audio / accessibility
- Let the music pause at the detour.
- Descriptive transcript: the bee leaves the direct food path and approaches a ball.

### Assets
- `A-001` — Experimental-layout figure (`CC-BY-4.0`).

## References and source materials

### Evidence references

#### F-001 — Unrewarded ball rolling
- **Exact claim:** Ball rolling was repeated, unrewarded, and fulfilled the authors' operational criteria for animal play.
- **Original URL:** https://doi.org/10.1016/j.anbehav.2022.08.013
- **Source / author:** Galpayage Dona et al., Animal Behaviour 194
- **Date:** 2022-12
- **Locator:** Abstract; Methods, experiment 1; Discussion, criteria 1–5
- **Accessed:** 2026-07-20
- **Scope:** Laboratory study of Bombus terrestris; the conclusion concerns operational play criteria, not proof of subjective enjoyment.
- **Cross-checks:** https://www.qmul.ac.uk/news/latest-news/2022/se/first-ever-study-shows-bumble-bees-play.html
- **Contradictions:** No direct contradiction located; alternative functional explanations are discussed by the paper.
- **Status:** VERIFIED
- **Caveat:** Do not turn behavioral criteria into a claim about conscious emotion.
- **Approved wording:** In a 2022 experiment, bumblebees repeatedly rolled wooden balls without a food reward, meeting the authors' behavioral criteria for play.

### Visual and archival sources

#### A-001 — Experimental layout
- **Original asset page:** https://doi.org/10.1016/j.anbehav.2022.08.013
- **Direct production file:** https://oulurepo.oulu.fi/bitstream/handle/10024/43665/nbnfi-fe2023062057117.pdf
- **Creator / rightsholder:** Galpayage Dona et al.
- **Rights basis:** Article published open access under Creative Commons Attribution 4.0.
- **License and version:** CC BY 4.0
- **Commercial use / adaptation:** Allowed with attribution; mark adaptations.
- **Planned changes:** Crop Figure 1 and animate a separately drawn route overlay.
- **Required attribution:** Galpayage Dona et al. (2022), CC BY 4.0, DOI on screen and in description.
- **Intended beat:** Beat 01
- **Accessed:** 2026-07-20
- **Status:** CC-BY-4.0

### Unverified or disputed material

- None used in this excerpt.

### Attribution copy

- `A-001` — “Figure adapted from Galpayage Dona et al. (2022), CC BY 4.0, https://doi.org/10.1016/j.anbehav.2022.08.013.”
"""


class ValidatorTests(unittest.TestCase):
    def assert_error(self, text: str, fragment: str) -> None:
        errors = validate_document(text)
        self.assertTrue(
            any(fragment in error for error in errors),
            f"Expected {fragment!r} in {errors!r}",
        )

    def test_valid_research_draft_passes(self) -> None:
        self.assertEqual(validate_document(VALID_DOCUMENT), [])

    def test_required_header_field_is_reported(self) -> None:
        self.assert_error(
            VALID_DOCUMENT.replace("- **Viewer promise:**", "- **Removed:**", 1),
            "Viewer promise",
        )

    def test_duplicate_beat_id_is_reported(self) -> None:
        duplicate = VALID_DOCUMENT.replace(
            "## References and source materials",
            "## Beat 01 — Duplicate\n\n### Narration\n> Copy.\n\n"
            "### Story function\nDuplicate.\n\n### Claims\n- None.\n\n"
            "### Visual\n- None.\n\n### Motion / edit\n"
            "- No animation — a still is sufficient.\n\n"
            "## References and source materials",
        )
        self.assert_error(duplicate, "Duplicate beat ID")

    def test_missing_fact_record_is_reported(self) -> None:
        self.assert_error(
            VALID_DOCUMENT.replace("`F-001`", "`F-002`", 1),
            "F-002",
        )

    def test_missing_asset_record_is_reported(self) -> None:
        self.assert_error(
            VALID_DOCUMENT.replace("`A-001`", "`A-002`", 1),
            "A-002",
        )

    def test_invalid_claim_status_is_reported(self) -> None:
        self.assert_error(
            VALID_DOCUMENT.replace("- **Status:** VERIFIED", "- **Status:** PROBABLY", 1),
            "PROBABLY",
        )

    def test_motion_requires_explanatory_purpose_or_explicit_none(self) -> None:
        self.assert_error(
            VALID_DOCUMENT.replace(
                "- **Animation purpose:** Make the unnecessary detour and repeated choice spatially clear.",
                "- Add a cool zoom.",
            ),
            "animation purpose",
        )

    def test_urls_must_be_web_urls(self) -> None:
        self.assert_error(
            VALID_DOCUMENT.replace(
                "https://doi.org/10.1016/j.anbehav.2022.08.013",
                "doi:10.1016/j.anbehav.2022.08.013",
                1,
            ),
            "http:// or https://",
        )

    def test_record_ready_rejects_blocked_asset(self) -> None:
        blocked = VALID_DOCUMENT.replace("RESEARCH-DRAFT", "RECORD-READY", 1).replace(
            "- **Status:** CC-BY-4.0",
            "- **Status:** UNKNOWN-BLOCKED",
            1,
        )
        self.assert_error(blocked, "RECORD-READY")

    def test_cli_states_its_limits(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "script.md"
            path.write_text(VALID_DOCUMENT, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT_DIR / "validate_annotated_script.py"), str(path)],
                check=False,
                capture_output=True,
                text=True,
            )
        self.assertEqual(result.returncode, 0)
        self.assertIn("does not verify factual truth", result.stdout)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py -v
```

Expected: ERROR with `ModuleNotFoundError: No module named 'validate_annotated_script'`.
This proves the tests execute before the validator exists.

- [ ] **Step 4: Commit the failing specification**

```bash
git add .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py
git commit -m "test: specify annotated script validation"
```

Expected: the test commit is intentionally red until Task 3.

### Task 3: Implement the dependency-free validator

**Files:**

- Create: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`
- Test: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`

- [ ] **Step 1: Implement the validator around explicit constants and small parsers**

The public interface and CLI contract must be:

```python
def validate_document(text: str) -> list[str]:
    """Return human-readable structural errors; an empty list means structurally valid."""


def main(argv: list[str] | None = None) -> int:
    """Print every error and return 0 for valid, 1 for invalid, 2 for unreadable input."""
```

Define these exact vocabularies:

```python
READINESS_STATES = {
    "RESEARCH-DRAFT",
    "EDITORIAL-DRAFT",
    "RECORD-READY",
    "PICTURE-LOCKED",
}

CLAIM_STATUSES = {
    "VERIFIED",
    "CORROBORATED",
    "REPORTED",
    "UNVERIFIED-EXAMPLE",
    "DISPUTED",
    "REJECTED",
}

FIXED_ASSET_STATUSES = {
    "OWNED",
    "CC0",
    "PERMISSION-ON-FILE",
    "COMMERCIAL-LICENSE",
    "FAIR-USE-CANDIDATE-NOT-CLEARED",
    "REFERENCE-ONLY-RIGHTS-UNVERIFIED",
    "UNKNOWN-BLOCKED",
}

HEADER_FIELDS = (
    "Status",
    "Version",
    "Target runtime",
    "Word count",
    "Audience",
    "Episode mode",
    "Title",
    "Thumbnail promise",
    "Viewer promise",
    "Central question",
    "Thesis",
    "Payoff",
    "Evidence review",
    "Rights review",
)

BEAT_SECTIONS = (
    "Narration",
    "Story function",
    "Claims",
    "Visual",
    "Motion / edit",
    "On-screen text",
    "Audio / accessibility",
    "Assets",
)

EVIDENCE_FIELDS = (
    "Exact claim",
    "Original URL",
    "Source / author",
    "Date",
    "Locator",
    "Accessed",
    "Scope",
    "Cross-checks",
    "Contradictions",
    "Status",
    "Caveat",
    "Approved wording",
)

ASSET_FIELDS = (
    "Original asset page",
    "Direct production file",
    "Creator / rightsholder",
    "Rights basis",
    "License and version",
    "Commercial use / adaptation",
    "Planned changes",
    "Required attribution",
    "Intended beat",
    "Accessed",
    "Status",
)
```

Implement the following deterministic rules without making network requests:

1. Parse header fields only above the first beat.
2. Split beats on `^## Beat (\d{2})` and require IDs to be unique and ascending.
3. Require every `BEAT_SECTIONS` heading in each beat.
4. Accept motion when it contains a non-empty `**Animation purpose:**` field or an
   explicit `No animation —` sentence.
5. Treat backticked `F-###` and `A-###` tokens above the references heading as
   references; treat `#### F-###` and `#### A-###` headings below it as records.
6. Require exactly one matching record per referenced ID and flag orphan records.
7. Require every evidence and asset record field listed above.
8. Require the `Original URL`, `Original asset page`, and any non-empty direct file
   value to begin with `http://` or `https://`.
9. Accept asset statuses in `FIXED_ASSET_STATUSES`, exact `PUBLIC-DOMAIN` when the
   rights-basis field states a basis and jurisdiction, or a concrete `CC-*` license
   containing a version.
10. For `RECORD-READY`, reject `REJECTED` claims and referenced assets whose status is
    `UNKNOWN-BLOCKED`, `REFERENCE-ONLY-RIGHTS-UNVERIFIED`, or
    `FAIR-USE-CANDIDATE-NOT-CLEARED`.
11. Require all four end headings: `Evidence references`,
    `Visual and archival sources`, `Unverified or disputed material`, and
    `Attribution copy`.
12. Always print: `Structural validation only: this does not verify factual truth,
    source trustworthiness, copyright ownership, fair use, or editorial quality.`

- [ ] **Step 2: Run the focused unit tests and verify GREEN**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py -v
```

Expected: 10 tests run and all pass.

- [ ] **Step 3: Exercise the invalid CLI path**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py docs/superpowers/specs/2026-07-20-whp-youtube-script-skill-design.md
```

Expected: exit status 1, a list of missing contract fields, and the structural-only
limitation sentence. The command must not report the design document as valid.

- [ ] **Step 4: Commit the green validator**

```bash
git add .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py
git commit -m "feat: validate annotated YouTube scripts"
```

### Task 4: Create the worked annotated-script asset and full format contract

**Files:**

- Create: `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`
- Create: `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`
- Test: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`

- [ ] **Step 1: Write the worked asset from the valid bee fixture**

Copy the complete `VALID_DOCUMENT` Markdown body from the unit test into
`assets/annotated-script-template.md`, then add this note immediately below its H1:

```markdown
> This is a worked one-beat example, not a reusable factual conclusion. Copy its
> structure, replace its assignment-specific content, and independently recheck every
> live source, locator, license, and claim before production.
```

Keep the primary DOI, Queen Mary cross-check, Oulu repository PDF, CC BY 4.0 rights
basis, fact ID, asset ID, fallback diagram, explanatory route animation, and full end
records. This is the concrete “script with notes inside it” requested by the user.

- [ ] **Step 2: Write the format reference as a normative schema**

The reference must define, in this order:

1. Header fields and what each one means.
2. The exact beat block shown in the accepted design.
3. Stable ID rules: three digits, never reuse an ID, and preserve IDs during revision.
4. Required evidence-record and asset-record fields.
5. The four end-reference sections.
6. The four readiness states and who may promote a document.
7. Narration-only extraction: concatenate blockquotes under `### Narration`; never
   include notes in a teleprompter export.
8. A reminder that the validator proves structure only and cannot make an output
   `RECORD-READY` by itself.

Include this exact readiness gate:

```markdown
`RECORD-READY` requires human editorial approval plus complete evidence and rights
review. A passing validator is necessary but never sufficient. Do not self-promote a
draft merely because its structure passes.
```

- [ ] **Step 3: Validate the worked example**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md
```

Expected: `PASS: annotated script is structurally valid`, followed by the
structural-only limitation sentence, with exit status 0.

- [ ] **Step 4: Commit the output contract**

```bash
git add .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md .agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md
git commit -m "docs: define annotated YouTube script format"
```

### Task 5: Encode the research, rights, story, and quality methods

**Files:**

- Create: `.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md`
- Create: `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Create: `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`

- [ ] **Step 1: Write `research-and-rights.md` around two separate ledgers**

Include these mandatory sections and rules:

```markdown
# Research and Rights

## Claim workflow

1. Write the smallest exact claim the script needs.
2. Trace search results and reposts to the earliest practical originating source.
3. Record author, publisher, date, context, and a precise locator.
4. Seek an independent corroborating or contradicting source.
5. Compare retellings for changed denominators, species, dates, causality, or scope.
6. Assign one confidence status before drafting narration.
7. Use only the approved wording or a weaker formulation.

## Confidence-to-wording ladder

| Status | Use | Narration stance |
|---|---|---|
| `VERIFIED` | Primary source or authoritative record supports the exact wording. | “The experiment found…” |
| `CORROBORATED` | Independent credible sources agree. | “Multiple investigations found…” |
| `REPORTED` | One identifiable plausible source. | “According to a 2019 report…” |
| `UNVERIFIED-EXAMPLE` | Provenance or corroboration remains incomplete. | “There is an unconfirmed account that…” |
| `DISPUTED` | Credible sources conflict. | “Researchers disagree about…” |
| `REJECTED` | Fabricated, contradicted, or materially misleading. | Omit from narration. |

Not obviously fake is not the same as verified. An online anecdote may survive only
as an attributed example when the caveat is audible and the example carries no
argument that requires it to be true.

## Search and reverse-check protocol

Treat Google, image search, social feeds, and aggregators as discovery layers. Open
the originating page, compare publication dates, search distinctive phrases, inspect
edits or cropping, and use reverse-image or earliest-upload checks when identity,
date, location, or authorship matters. Record what was checked and what remains
unknown.

## Claim card versus asset card

Evidence that supports a sentence and permission to publish a picture are separate
questions. Never copy a paper's evidence status into an image's rights status. Never
infer permission from credit, public availability, a search-result thumbnail, or the
words “free” and “royalty-free.”

## Rights statuses

Use only `OWNED`, an exact versioned `CC-*` license, `CC0`, `PUBLIC-DOMAIN` with basis
and jurisdiction, `PERMISSION-ON-FILE`, `COMMERCIAL-LICENSE`,
`FAIR-USE-CANDIDATE-NOT-CLEARED`, `REFERENCE-ONLY-RIGHTS-UNVERIFIED`, or
`UNKNOWN-BLOCKED`.

## Production rule

Unknown-rights material may remain linked for research or visual reference, but it
is not cleared for the final cut. Supply an ownable fallback: original footage,
licensed stock, a diagram built from facts, a reenactment, restrained text, or no
added visual.
```

End with compact CC TASL guidance (title, author, source, license), Wikimedia file-page
inspection, and the explicit statement that fair use is a legal doctrine, not a
validator status.

- [ ] **Step 2: Write `story-and-hook-method.md` as a selection method, not a formula**

Include:

- three opening candidates per assignment;
- a 0–2 score for promise relevance, surprise, stakes, visuality, evidence strength,
  and payoff connection;
- the scene sequence `situation → action → disruption → factual reveal → driving
  question`;
- a prohibition on invented dialogue, weather, motives, feelings, chronology, and
  sensory detail;
- permission to choose a direct demonstration or explanation when it scores better;
- a narrative spine built from changes in viewer understanding;
- specific open loops with explicit payoff beats;
- spoken-language and read-aloud checks; and
- the animation rule below.

```markdown
Animate only when motion clarifies temporal change, causality, spatial
transformation, scale, comparison, or an evidence trail. Write the explanatory
purpose before the movement. If a still communicates the relationship as well, use
the still.
```

- [ ] **Step 3: Write `quality-rubric.md` with scored dimensions and hard gates**

Score each dimension 0–2:

1. title/thumbnail/opening/payoff alignment;
2. factual precision and status-matched wording;
3. story momentum without invented details;
4. conversational spoken quality and credible runtime;
5. useful visual treatment and concrete asset candidates;
6. explanatory animation purpose;
7. evidence-reference completeness;
8. visual provenance and rights honesty;
9. accessibility of essential visual information; and
10. WHP brand fidelity.

Define `0` as missing or misleading, `1` as usable with revision, and `2` as clear and
production-useful. Require at least 16/20 for `EDITORIAL-DRAFT`, no zero in dimensions
1, 2, 7, or 8, and human review plus all format readiness rules for `RECORD-READY`.
State that a total score cannot override a hard gate.

- [ ] **Step 4: Commit the editorial methods**

```bash
git add .agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md .agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md .agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md
git commit -m "docs: encode WHP script research and story methods"
```

### Task 6: Add failing portability tests, then the portable entrypoint and Claude discovery link

**Files:**

- Create: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Regenerate: `.agents/skills/writing-whp-youtube-scripts/agents/openai.yaml`
- Create symlink: `.claude/skills/writing-whp-youtube-scripts`

- [ ] **Step 1: Write the package test before the entrypoint and symlink exist**

```python
from __future__ import annotations

import re
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]
SKILL_MD = SKILL_ROOT / "SKILL.md"
CLAUDE_LINK = REPO_ROOT / ".claude" / "skills" / SKILL_ROOT.name


class SkillPackageTests(unittest.TestCase):
    def test_required_package_files_exist(self) -> None:
        required = {
            "SKILL.md",
            "agents/openai.yaml",
            "assets/annotated-script-template.md",
            "references/annotated-script-format.md",
            "references/quality-rubric.md",
            "references/research-and-rights.md",
            "references/story-and-hook-method.md",
            "scripts/validate_annotated_script.py",
        }
        missing = sorted(path for path in required if not (SKILL_ROOT / path).is_file())
        self.assertEqual(missing, [])

    def test_frontmatter_is_portable_and_description_is_trigger_only(self) -> None:
        text = SKILL_MD.read_text(encoding="utf-8")
        match = re.match(r"\A---\n(.*?)\n---\n", text, re.DOTALL)
        self.assertIsNotNone(match)
        keys = {
            line.split(":", 1)[0].strip()
            for line in match.group(1).splitlines()
            if ":" in line and not line.startswith(" ")
        }
        self.assertEqual(keys, {"name", "description"})
        self.assertIn("name: writing-whp-youtube-scripts", match.group(1))
        self.assertRegex(match.group(1), r"description: ['\"]?Use when ")

    def test_core_has_no_required_vendor_specific_syntax_or_local_paths(self) -> None:
        text = SKILL_MD.read_text(encoding="utf-8")
        forbidden = (
            "/home/",
            ".codex/",
            "functions.",
            "mcp__",
            "${CLAUDE_SKILL_DIR}",
            "allowed-tools:",
            "context: fork",
        )
        self.assertEqual([token for token in forbidden if token in text], [])

    def test_relative_markdown_resources_exist(self) -> None:
        text = SKILL_MD.read_text(encoding="utf-8")
        targets = re.findall(r"\[[^]]+\]\(([^)]+)\)", text)
        local = [target for target in targets if "://" not in target and not target.startswith("#")]
        self.assertGreaterEqual(len(local), 5)
        self.assertEqual(
            [target for target in local if not (SKILL_ROOT / target).is_file()],
            [],
        )

    def test_skill_entrypoint_stays_below_progressive_disclosure_limit(self) -> None:
        self.assertLessEqual(len(SKILL_MD.read_text(encoding="utf-8").splitlines()), 500)

    def test_claude_discovery_is_one_relative_symlink_to_the_canonical_package(self) -> None:
        self.assertTrue(CLAUDE_LINK.is_symlink())
        self.assertFalse(CLAUDE_LINK.readlink().is_absolute())
        self.assertEqual(CLAUDE_LINK.resolve(), SKILL_ROOT.resolve())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the package tests and verify RED**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py -v
```

Expected: failures because the generated entrypoint still contains scaffold text,
does not route to the five resources, and has no Claude discovery symlink.

- [ ] **Step 3: Write the portable `SKILL.md`**

Use only these frontmatter fields:

```yaml
---
name: writing-whp-youtube-scripts
description: "Use when creating or substantially revising a long-form Why Humans Play YouTube episode script, especially when the assignment involves researched facts, a story-led opening, inline production notes, visual sourcing, animation direction, confidence caveats, or end references."
---
```

The body must stay concise and contain:

1. **Overview:** one portable source of truth; viewer promise and honest inquiry come
   before retention tricks.
2. **Required project context:** locate the repository root, read `BRAND.md` first,
   then `whp-youtube/STEERING.md`; report a missing file instead of inventing policy.
3. **Workflow:** assignment contract, evidence packet, three opening candidates,
   narrative spine, spoken draft, adjacent production treatment, audit, validator.
4. **Non-negotiable rules:** no invented factual scene detail; confidence controls
   narration; evidence and rights are separate; every important fact receives a
   visual decision; every animation states its explanatory purpose; all sources end
   in the two ledgers plus uncertainty and attribution sections.
5. **Resource routing:**
   - read `[references/story-and-hook-method.md](references/story-and-hook-method.md)`
     before choosing an opening or restructuring a story;
   - read `[references/research-and-rights.md](references/research-and-rights.md)`
     before web research, claim approval, visual sourcing, or rights labeling;
   - read `[references/annotated-script-format.md](references/annotated-script-format.md)`
     before drafting the deliverable;
   - use `[assets/annotated-script-template.md](assets/annotated-script-template.md)`
     as the worked shape, never as pre-verified episode content;
   - read `[references/quality-rubric.md](references/quality-rubric.md)` during the
     final editorial pass.
6. **Validation command:** resolve the skill directory from the loaded `SKILL.md`,
   then run `python3 scripts/validate_annotated_script.py <script-path>` from that
   directory. Do not hardcode a vendor's environment variable or an absolute path.
7. **Completion:** report readiness honestly, list unresolved fact and rights work,
   and never infer `RECORD-READY` from the validator alone.

- [ ] **Step 4: Regenerate optional OpenAI metadata deterministically**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py .agents/skills/writing-whp-youtube-scripts --interface 'display_name=WHP YouTube Script Writer' --interface 'short_description=Write rigorous, production-annotated WHP scripts' --interface 'default_prompt=Use $writing-whp-youtube-scripts to develop a story-led, source-audited Why Humans Play episode script.'
```

Confirm `agents/openai.yaml` contains no dependency declaration and has this content:

```yaml
interface:
  display_name: "WHP YouTube Script Writer"
  short_description: "Write rigorous, production-annotated WHP scripts"
  default_prompt: "Use $writing-whp-youtube-scripts to develop a story-led, source-audited Why Humans Play episode script."
```

- [ ] **Step 5: Add Claude Code discovery without duplicating the package**

```bash
mkdir -p .claude/skills
ln -s ../../.agents/skills/writing-whp-youtube-scripts .claude/skills/writing-whp-youtube-scripts
```

Expected:

```bash
readlink .claude/skills/writing-whp-youtube-scripts
# ../../.agents/skills/writing-whp-youtube-scripts
```

- [ ] **Step 6: Run static tests and schema validation**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py -v
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/writing-whp-youtube-scripts
```

Expected: 6 package tests pass and `Skill is valid!`.

Also confirm the generator's scaffold markers have all been removed:

```bash
rg -n "\[REPLACE|Example resource|Write clear instructions" .agents/skills/writing-whp-youtube-scripts
```

Expected: no matches.

- [ ] **Step 7: Commit the portable package entrypoint**

```bash
git add .agents/skills/writing-whp-youtube-scripts/SKILL.md .agents/skills/writing-whp-youtube-scripts/agents/openai.yaml .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py .claude/skills/writing-whp-youtube-scripts
git commit -m "feat: expose portable WHP script skill"
```

### Task 7: Run behavioral forward tests and close observed gaps

**Files:**

- Create: `docs/superpowers/evidence/2026-07-20-whp-youtube-script-skill-evaluation.md`
- Modify only if a forward test exposes a concrete gap:
  `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify only if a forward test exposes a concrete gap:
  `.agents/skills/writing-whp-youtube-scripts/references/*.md`

- [ ] **Step 1: Prepare six isolated evaluation prompts**

Use fresh agents with the skill available and prevent them from reading other agents'
outputs. Store generated scripts under `/tmp/whp-script-skill-evals/`; do not commit the
bulk outputs. Use these assignments:

```text
E1 — Hidden Game:
Develop a 90-second WHP Hidden Game script about why checking a phone can start to
feel like pulling a slot-machine lever. Open with a grounded real event or observable
scene only if it is the strongest opening. Include production notes and references.

E2 — Contested science:
Develop a 90-second Why We Play script about juvenile rat play and prefrontal-cortex
development. Separate what the rat experiments show from what they imply for humans.

E3 — Existing draft revision:
Audit and revise the opening and first science beat of
whp-youtube/drafts/evolutionary-paradox-of-play.md. Preserve the exact “26 taken; 22
playing immediately beforehand” relationship and add usable source and asset records.

E4 — Unverified online account:
A single personal blog says a town restored recess and violence fell by 70%, but no
school record or independent report can be found. Decide whether and how it may
appear in a WHP script, then annotate it.

E5 — Unclear visual rights:
Image search finds the perfect historical photograph on an unattributed repost. The
original photographer and license are unknown. Add a visual plan that remains useful
without treating the repost as cleared.

E6 — Negative trigger:
Write three paid-social ad headlines for an unrelated accounting application.
```

- [ ] **Step 2: Score every applicable output before reading the others**

Use the 20-point rubric plus these binary gates:

- every factual scene detail is sourced or removed;
- ratios, denominators, species, dates, and chronology retain source meaning;
- `UNVERIFIED-EXAMPLE` and `DISPUTED` material is audibly qualified;
- every important fact has a visual decision;
- every proposed external asset has an asset-page URL and rights status;
- every animation note states an explanatory purpose or explicitly chooses a still;
- all four end-reference sections exist; and
- E6 does not implicitly activate the skill.

Expected: E1–E5 score at least 16/20 with no hard-gate failure. E6 should be handled as
ordinary copywriting without loading or claiming this skill.

- [ ] **Step 3: Compare E3 directly with the RED baseline**

The evaluation record must explicitly state whether E3 corrected all five baseline
failures. Include the exact generated seal wording, source locator, asset URL, rights
status, and animation-purpose note in the evidence document so the comparison is
auditable without retaining the full generated draft.

- [ ] **Step 4: Refactor only against observed failures and rerun the failed prompt**

For each failure, record the observed wording, the violated rule, and the smallest
instruction change. Place workflow-level fixes in `SKILL.md`, research or rights fixes
in `research-and-rights.md`, narrative fixes in `story-and-hook-method.md`, format
fixes in `annotated-script-format.md`, and scoring fixes in `quality-rubric.md`. Rerun
the same isolated prompt after each change until it passes; do not add speculative
rules unrelated to an observed failure.

- [ ] **Step 5: Write the evaluation report**

Use this structure:

```markdown
# WHP YouTube Script Skill — Forward Evaluation

## Environment

List client, model, date, skill commit, web availability, and whether the run was
static-only or end to end. Mark unavailable clients as untested.

## Results matrix

Record E1–E6, rubric score, each binary gate, validator result, and pass/fail.

## Baseline comparison

Record the five before/after behaviors and the exact E3 excerpts that prove them.

## Refinements

For each iteration, record observed failure, smallest instruction change, and rerun
result. If there were no refinements, state that no new failure was observed.

## Remaining limits

State that model behavior can vary, links and licenses can change, factual truth and
copyright were not established by the validator, and any client not run end to end
remains untested.
```

- [ ] **Step 6: Re-run all deterministic tests after behavioral refactoring**

```bash
python3 -m unittest discover -s .agents/skills/writing-whp-youtube-scripts/scripts -p 'test_*.py' -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md
```

Expected: all unit tests pass and the worked asset passes.

- [ ] **Step 7: Commit behavioral evidence and any minimal refinements**

```bash
git add docs/superpowers/evidence/2026-07-20-whp-youtube-script-skill-evaluation.md .agents/skills/writing-whp-youtube-scripts
git commit -m "test: verify WHP script skill behavior"
```

### Task 8: Verify portability, review the branch, and prepare handoff

**Files:**

- Verify all files changed since `main`

- [ ] **Step 1: Run the complete deterministic verification suite**

```bash
python3 -m unittest discover -s .agents/skills/writing-whp-youtube-scripts/scripts -p 'test_*.py' -v
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/writing-whp-youtube-scripts
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md
test -L .claude/skills/writing-whp-youtube-scripts
test "$(realpath .claude/skills/writing-whp-youtube-scripts)" = "$(realpath .agents/skills/writing-whp-youtube-scripts)"
git diff --check main...HEAD
```

Expected: every command exits 0; unit test count matches the two test modules;
`Skill is valid!`; the worked asset passes; and the symlink resolves to the canonical
package.

- [ ] **Step 2: Run focused content scans**

```bash
rg -n "/home/|\.codex/|functions\.|mcp__|\$\{CLAUDE_SKILL_DIR\}|allowed-tools:|context: fork" .agents/skills/writing-whp-youtube-scripts/SKILL.md
rg -n "from Google|rights cleared|royalty-free|just a fact|cool animation" .agents/skills/writing-whp-youtube-scripts
rg -n "REJECTED|UNVERIFIED-EXAMPLE|REFERENCE-ONLY-RIGHTS-UNVERIFIED|UNKNOWN-BLOCKED" .agents/skills/writing-whp-youtube-scripts
```

Expected: the vendor-syntax scan has no matches. The vague-language scan has matches
only where the references explicitly forbid those phrases. Status matches occur in
the validator, tests, format guidance, and worked `RESEARCH-DRAFT`, never as a claim
that unresolved material is cleared.

- [ ] **Step 3: Check optional Claude Code end-to-end availability honestly**

```bash
command -v claude
claude --version
```

If Claude Code 2.1.203 or later is installed and usable, start a clean non-interactive
run from the repository root with E3 and record discovery plus output results in the
evaluation report. If it is absent, older, unauthenticated, or cannot run in the
environment, record exactly that condition as `Claude Code end-to-end: untested`;
the static standard and symlink tests remain valid but do not substitute for model
behavior evidence.

- [ ] **Step 4: Review every branch change against the accepted design**

```bash
git diff --stat main...HEAD
git diff --name-status main...HEAD
git log --oneline main..HEAD
git status --short
```

Expected: only the design/plan/evidence documents, canonical skill package, and
Claude discovery symlink appear; worktree status is clean.

- [ ] **Step 5: Request an independent code and instruction review**

Ask the reviewer to check:

- accepted-design coverage;
- validator correctness and scope honesty;
- evidence/asset separation;
- confidence-to-wording behavior;
- narrative fact preservation;
- visual and animation usefulness;
- Agent Skills portability and Claude symlink correctness;
- test quality and behavioral evidence; and
- accidental changes outside the task.

Resolve all Critical and Important findings, rerun Step 1, and commit fixes with a
message describing the concrete issue.

- [ ] **Step 6: Finish with branch integration choices**

Use `superpowers:finishing-a-development-branch` after all checks pass. Present the
verified branch name, commits, test evidence, Claude end-to-end status, and the
original main-checkout preservation status before offering merge, pull request,
keep-branch, or cleanup choices.
