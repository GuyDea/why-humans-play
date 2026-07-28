# WHP Paired Script Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace loose single-file scripts with validated raw/extended pairs inside one
episode-first `epNNN-name/` folder across blueprint, draft, and final stages.

**Architecture:** `script.raw.md` owns spoken wording and storytelling markup.
`script.extended.md` mirrors that narration exactly, adds grouped square-bracket purpose
annotations, and owns the stage appendix. A new Python pair validator enforces episode
paths, raw purity, exact narration/format synchronization, markup semantics, annotation
mapping, and stage appendices; existing readability and final-production validation remain
focused tools behind it.

**Tech Stack:** Markdown workflow documentation, Python 3 standard library and
`unittest`, existing annotated-script validator, Git.

---

## Scope and working-state constraints

Implement the approved design at
`docs/superpowers/specs/2026-07-28-whp-paired-script-artifacts-design.md`.

The branch already contains uncommitted Episode 1 and scripting-skill work. Preserve it.
Stage only the exact files named by each checkpoint; never use broad staging.

The parked `whp-youtube/drafts/evolutionary-paradox-of-play.md` is an unnumbered historical
candidate protected by an earlier preservation decision. Do not assign it a launch number
or move it in this implementation. The episode-first contract applies to active numbered
episodes and all future episode work. Script Creator UI/data-model integration is also out
of scope; do not change `script-creator/` without a separate design that introduces a
stable numeric episode ID there.

Episode 1 intentionally has a current V2 `blueprint/` pair and a canonical
evidence-backed `final/` pair after this migration. Do not create a `draft/` pair: the V2
rebuild has not received complete-narration approval, and the older full prototype is
legacy material rather than a valid V2 draft snapshot.

## File responsibility map

**Create**

- `.agents/skills/writing-whp-youtube-scripts/references/script-artifact-pair.md` — sole
  detailed owner of episode folders, raw/extended pairing, storytelling markup,
  annotations, stage appendices, validation order, and promotion.
- `.agents/skills/writing-whp-youtube-scripts/references/script-blueprint-workflow.md` —
  blueprint-specific polished-intro plus body-map gate.
- `.agents/skills/writing-whp-youtube-scripts/scripts/validate_script_pair.py` —
  deterministic pair validator and CLI.
- `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_script_pair.py` —
  pair path, extraction, markup, annotation, and appendix tests.
- `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md` — canonical
  spoken V2 intro.
- `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.extended.md` —
  annotated V2 intro plus blueprint appendix.
- `whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.raw.md` — clean narration
  extracted from the currently canonical Episode 1.
- `whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.extended.md` — annotated
  canonical Episode 1 plus its existing production appendix.
- `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/` files — preserved legacy
  throughline, full-prototype, and pre-workflow V2 artifacts.

**Rename by add/delete**

- `.agents/skills/writing-whp-youtube-scripts/references/predraft-intro-workflow.md` →
  `.agents/skills/writing-whp-youtube-scripts/references/script-blueprint-workflow.md`.

**Modify**

- `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`
- `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`
- `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`
- `.agents/skills/writing-whp-youtube-scripts/scripts/check_spoken_readability.py`
- `.agents/skills/writing-whp-youtube-scripts/scripts/test_check_spoken_readability.py`
- `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- `.agents/skills/reconcile-whp/SKILL.md`
- `whp-youtube/STEERING.md`
- `docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`
- `docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`
- `docs/superpowers/evidence/2026-07-28-whp-intro-first-predraft-gate.md`
- `DECISIONS.md`

**Remove after content-preserving migration**

- `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`
- `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`
- `whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md`
- `whp-youtube/predrafts/ep1_v2-intro-first.md`
- `whp-youtube/predrafts/ep1_v2.md`

### Task 1: Lock the active vocabulary, owner routes, and path contract

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Create: `.agents/skills/writing-whp-youtube-scripts/references/script-artifact-pair.md`
- Create: `.agents/skills/writing-whp-youtube-scripts/references/script-blueprint-workflow.md`
- Delete: `.agents/skills/writing-whp-youtube-scripts/references/predraft-intro-workflow.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`
- Modify: `.agents/skills/reconcile-whp/SKILL.md`
- Modify: `whp-youtube/STEERING.md`

- [ ] **Step 1: Write the failing single-owner and vocabulary tests**

Add constants beside the existing skill-package paths:

```python
PAIR_METHOD_MD = SKILL_ROOT / "references/script-artifact-pair.md"
BLUEPRINT_WORKFLOW_MD = SKILL_ROOT / "references/script-blueprint-workflow.md"
```

Replace `PREDRAFT_WORKFLOW_MD` consumers with `BLUEPRINT_WORKFLOW_MD`, then add:

```python
def test_script_artifact_pair_is_the_single_detailed_owner(self) -> None:
    sources = {
        "pair": " ".join(PAIR_METHOD_MD.read_text(encoding="utf-8").split()),
        "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
        "blueprint": " ".join(
            BLUEPRINT_WORKFLOW_MD.read_text(encoding="utf-8").split()
        ),
        "rapid": " ".join(RAPID_MD.read_text(encoding="utf-8").split()),
        "story": " ".join(STORY_METHOD_MD.read_text(encoding="utf-8").split()),
        "rubric": " ".join(RUBRIC_MD.read_text(encoding="utf-8").split()),
        "steering": " ".join(STEERING_MD.read_text(encoding="utf-8").split()),
    }
    owner_contracts = (
        "## Episode-first directory contract",
        "## Raw script contract",
        "## Extended script contract",
        "## Storytelling markup",
        "## Stage appendices",
        "## Validate the pair before review or promotion",
        "`script.raw.md` is the source of truth",
        "Do not underline a mini-hook.",
    )
    for contract in owner_contracts:
        self.assertIn(contract, sources["pair"])
        for consumer in sources.keys() - {"pair"}:
            self.assertNotIn(contract, sources[consumer])

    owner_link = "(references/script-artifact-pair.md)"
    self.assertIn(owner_link, sources["skill"])
    self.assertIn("(script-artifact-pair.md)", sources["blueprint"])


def test_active_workflow_uses_blueprint_not_predraft(self) -> None:
    active = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (
            SKILL_MD,
            BLUEPRINT_WORKFLOW_MD,
            RAPID_MD,
            STORY_METHOD_MD,
            RUBRIC_MD,
        )
    )
    steering_active = STEERING_MD.read_text(encoding="utf-8").split(
        "\n# PART 2",
        1,
    )[0]
    active = (active + "\n" + steering_active).lower()
    self.assertNotIn("predraft-intro-workflow.md", active)
    self.assertNotIn("whp-youtube/predrafts/", active)
    self.assertNotIn("pre-draft", active)
    self.assertIn("script blueprint", active)
    self.assertIn("blueprint/script.raw.md", active)
    self.assertIn("blueprint/script.extended.md", active)
```

Update `test_relative_markdown_resources_exist` only by adding the two new owner paths and
removing the retired pre-draft owner path; retain its exact-order and file-existence
checks.

- [ ] **Step 2: Run the targeted tests and verify RED**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  SkillPackageTests.test_script_artifact_pair_is_the_single_detailed_owner \
  SkillPackageTests.test_active_workflow_uses_blueprint_not_predraft
```

Expected: FAIL because the pair owner and blueprint owner do not yet exist and active
documents still use `pre-draft`.

- [ ] **Step 3: Create the pair owner with the approved exact contract**

Create `references/script-artifact-pair.md` with these sections and no competing workflow:

```markdown
# Script Artifact Pair

## Episode-first directory contract

Use `whp-youtube/episodes/epNNN-stable-name/{blueprint,draft,final}/`. Create only reached
stages. Every reached stage contains exactly `script.raw.md` and `script.extended.md`.

## Raw script contract

`script.raw.md` is the source of truth for spoken words, beat order, and storytelling
markup. Permit only the H1 title, beat headings, blockquoted narration, blank lines,
`<u>...</u>`, `*...*`, and `**...**`. Put no purpose annotations, evidence indicators,
metadata, body map, production notes, or appendix in raw.

## Extended script contract

Mirror raw exactly. Add grouped standalone `[TAG — episode-specific purpose]` annotations,
stage-required evidence indicators, and one final appendix. Edit spoken words in raw
first. Allow only `MAIN HOOK`, `LOOP OPEN L-##`, `LOOP PAYOFF L-##`, `OBSTACLE`,
`MINI-HOOK`, `DEFENSE`, `DISARM`, `PROMISE`, `TRANSITION`, `REVERSAL`, `AHA`,
`APPLICATION`, `FINAL PAYOFF`, and `LOCKED WORDING`. Group adjacent sentences only when
they perform the same job, and require every annotation to explain the specific following
passage.

## Storytelling markup

- `<u>...</u>` — main hook, major loop open/payoff, or genuine central obstacle only.
- `*...*` — supporting device such as a mini-hook, local teaser, or small reversal.
- `**...**` — locked wording; may combine with either tier.

Underline and italics are mutually exclusive. Do not underline a mini-hook.

## Stage appendices

- `BLUEPRINT` — baselines, factual boundary, intro design, bullet-only body map,
  promise/loop destinations, approval.
- `DRAFT` — baselines, progression/payoff audit, evidence boundaries, readability,
  personal-input decision, approval.
- `final/` — the complete final extended appendix owned by the annotated-script format.

## Validate the pair before review or promotion

Run `python3 scripts/validate_script_pair.py -- "<stage-or-pair-path>"`, then run
readability on raw. For final, run the annotated validator on extended after pair
validation.

## Promote without overwriting

Blueprint approval creates draft; complete-narration approval permits final production.
Copy accepted raw narration forward and build a new stage-specific extended appendix.
Keep earlier pairs as snapshots.
```

- [ ] **Step 4: Replace the old workflow owner with the Script Blueprint owner**

Create `references/script-blueprint-workflow.md` from the current intro-first workflow,
changing only the stage contract:

```markdown
# Script Blueprint Workflow

## Purpose and ownership

This file owns the exact Script Blueprint contents and approval gate. The paired-file,
markup, annotation, path, and promotion contract lives in
[the script artifact pair owner](script-artifact-pair.md).

## Build the exact blueprint pair

Raw contains the polished spoken intro only. Extended mirrors that intro, adds grouped
purpose annotations, and places the intro design record plus bullet-only body logic map in
its appendix. Do not draft body narration in a blueprint.
```

Preserve the current intro jobs, natural-package routing, promise-to-payoff mapping,
readability gate, human approval boundary, and no-mandatory-AI-review rule. Delete the old
`predraft-intro-workflow.md` only after every unique contract is present in the new file.

- [ ] **Step 5: Route active consumers without duplicating the pair contract**

Make these concise changes:

- `SKILL.md`: rename Phase 0 to `Script Blueprint`; route to both new owners; change
  blueprint, draft, and final paths to the episode-first pair; make raw the readability
  target and extended the annotation/appendix target.
- `rapid-prototyping.md`: consume `blueprint/script.raw.md` and
  `blueprint/script.extended.md`; keep line-level storytelling in the rapid owner.
- `story-and-hook-method.md`: say the body logic map lives in the blueprint extended
  appendix; do not redefine pair markup.
- `quality-rubric.md`: run narration reads against raw and structural/production audits
  against extended.
- `reconcile-whp/SKILL.md`: treat blueprint edits as exploratory and reconcile only the
  validated promotion into draft.
- `STEERING.md`: record `blueprint → draft → final`, the episode-first folder, and links to
  the two detailed owners.

- [ ] **Step 6: Run the focused and full skill tests**

Run the targeted command from Step 2, then:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
```

Expected: both new tests PASS and the full skill-package suite reports `OK`.

- [ ] **Step 7: Commit the vocabulary and ownership checkpoint**

```bash
git add -- \
  .agents/skills/writing-whp-youtube-scripts/SKILL.md \
  .agents/skills/writing-whp-youtube-scripts/references/script-artifact-pair.md \
  .agents/skills/writing-whp-youtube-scripts/references/script-blueprint-workflow.md \
  .agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md \
  .agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md \
  .agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  .agents/skills/reconcile-whp/SKILL.md \
  whp-youtube/STEERING.md
git diff --cached --check
git commit -m "feat(skill): introduce script blueprint artifact pairs"
```

### Task 2: Implement pair resolution and exact narration synchronization

**Files:**

- Create: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_script_pair.py`
- Create: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_script_pair.py`

- [ ] **Step 1: Write failing path, missing-pair, and drift tests**

Create the test module with a real temporary episode folder:

```python
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from validate_script_pair import resolve_pair, validate_pair


RAW = """# Episode

## 1. Opening

> <u>**Could this happen to you?**</u>

> *But the next result changed the question.*
"""

EXTENDED = """# Episode

## 1. Opening

[MAIN HOOK | LOCKED WORDING — Opens the central personal-risk question.]

> <u>**Could this happen to you?**</u>

[MINI-HOOK — Turns the opening into the next evidence need.]

> *But the next result changed the question.*

## Appendix

### Blueprint metadata

- **Status:** BLUEPRINT

### Factual boundary and unresolved dependencies

- No unresolved dependency changes the opening promise.

### Intro design record

The opening asks the central question.

### Body logic map

- Beat 02 develops the evidence.

### Promise and loop payoff map

- L-01 pays in Beat 02.

### Approval state

- Awaiting blueprint approval.
"""


class ScriptPairTests(unittest.TestCase):
    def make_pair(
        self,
        raw: str = RAW,
        extended: str = EXTENDED,
        *,
        stage: str = "blueprint",
    ) -> Path:
        root = Path(self.tempdir.name)
        stage_dir = (
            root / "whp-youtube" / "episodes"
            / "ep001-example" / stage
        )
        stage_dir.mkdir(parents=True)
        (stage_dir / "script.raw.md").write_text(raw, encoding="utf-8")
        (stage_dir / "script.extended.md").write_text(
            extended,
            encoding="utf-8",
        )
        return stage_dir

    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_resolves_either_file_or_stage_directory(self) -> None:
        stage_dir = self.make_pair()
        for target in (
            stage_dir,
            stage_dir / "script.raw.md",
            stage_dir / "script.extended.md",
        ):
            with self.subTest(target=target):
                pair = resolve_pair(target)
                self.assertEqual(pair.stage, "blueprint")
                self.assertEqual(pair.episode_id, "ep001-example")

    def test_rejects_invalid_episode_stage_and_filename(self) -> None:
        invalid = (
            "episode-1-example/blueprint",
            "ep001-example/predraft",
            "ep001-example/blueprint/other.md",
        )
        for suffix in invalid:
            with self.subTest(suffix=suffix):
                with self.assertRaises(ValueError):
                    resolve_pair(Path(self.tempdir.name) / suffix)

    def test_reports_a_missing_pair_half(self) -> None:
        stage_dir = self.make_pair()
        (stage_dir / "script.extended.md").unlink()
        with self.assertRaises(FileNotFoundError):
            resolve_pair(stage_dir)

    def test_rejects_extra_files_in_an_active_stage(self) -> None:
        stage_dir = self.make_pair()
        (stage_dir / "notes.md").write_text("No sidecars.", encoding="utf-8")
        with self.assertRaises(ValueError):
            resolve_pair(stage_dir)

    def test_accepts_annotations_and_evidence_without_narration_drift(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace(
                "Could this happen to you?",
                "Could this happen to you? [F-001](https://example.com)",
            )
        )
        self.assertEqual(validate_pair(resolve_pair(stage_dir)), [])

    def test_reports_spoken_or_formatting_drift(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace("next result", "later result")
        )
        self.assertIn(
            "extended narration does not exactly match raw",
            validate_pair(resolve_pair(stage_dir)),
        )

    def test_reports_paragraph_spacing_drift(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace(
                "> *But the next result",
                "\n> *But the next result",
            )
        )
        self.assertIn(
            "extended narration does not exactly match raw",
            validate_pair(resolve_pair(stage_dir)),
        )
```

- [ ] **Step 2: Run the new test module and verify RED**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
python3 -m unittest -v test_validate_script_pair.py
```

Expected: ERROR because `validate_script_pair` does not exist.

- [ ] **Step 3: Implement pair resolution and the exact synchronization surface**

Create `validate_script_pair.py` with these public types and functions:

```python
#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
from pathlib import Path
import re

EPISODE_RE = re.compile(r"^ep\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$")
STAGES = {"blueprint", "draft", "final"}
RAW_NAME = "script.raw.md"
EXTENDED_NAME = "script.extended.md"
APPENDIX_RE = re.compile(r"^## Appendix[ \t]*$")
APPENDIX_SPLIT_RE = re.compile(
    r"\r?\n## Appendix[ \t]*(?:\r?\n|$)"
)
PURPOSE_RE = re.compile(
    r"^\[(?P<tags>[A-Z0-9 |.-]+) — (?P<explanation>[^\]]+)\]$"
)
EVIDENCE_RE = re.compile(r"[ \t]*\[F-\d{3}\]\([^)]+\)")


@dataclass(frozen=True)
class PairPaths:
    stage_dir: Path
    raw: Path
    extended: Path
    episode_id: str
    stage: str


def resolve_pair(target: Path) -> PairPaths:
    target = target.resolve()
    if target.is_file() or target.name in {RAW_NAME, EXTENDED_NAME}:
        if target.name not in {RAW_NAME, EXTENDED_NAME}:
            raise ValueError(f"invalid pair filename: {target.name}")
        stage_dir = target.parent
    else:
        stage_dir = target
    stage = stage_dir.name
    episode_id = stage_dir.parent.name
    if stage not in STAGES:
        raise ValueError(f"invalid script stage: {stage}")
    if EPISODE_RE.fullmatch(episode_id) is None:
        raise ValueError(f"invalid episode folder: {episode_id}")
    raw = stage_dir / RAW_NAME
    extended = stage_dir / EXTENDED_NAME
    missing = [str(path) for path in (raw, extended) if not path.is_file()]
    if missing:
        raise FileNotFoundError("missing pair file: " + ", ".join(missing))
    unexpected = sorted(
        child.name
        for child in stage_dir.iterdir()
        if child.name not in {RAW_NAME, EXTENDED_NAME}
    )
    if unexpected:
        raise ValueError(
            "unexpected active-stage entries: " + ", ".join(unexpected)
        )
    return PairPaths(stage_dir, raw, extended, episode_id, stage)


def _before_appendix(markdown: str) -> str:
    lines: list[str] = []
    for line in markdown.splitlines():
        if APPENDIX_RE.fullmatch(line):
            break
        lines.append(line)
    return "\n".join(lines)


def _extended_sync_surface(markdown: str) -> str:
    appendix_match = APPENDIX_SPLIT_RE.search(markdown)
    body = (
        markdown[:appendix_match.start()]
        if appendix_match is not None
        else markdown
    )

    projected: list[str] = []
    skip_annotation_separator = False
    for line in body.splitlines(keepends=True):
        if PURPOSE_RE.fullmatch(line.rstrip("\r\n")):
            skip_annotation_separator = True
            continue
        if skip_annotation_separator and line.strip() == "":
            skip_annotation_separator = False
            continue
        skip_annotation_separator = False
        projected.append(EVIDENCE_RE.sub("", line))
    return "".join(projected)


def validate_pair(pair: PairPaths) -> list[str]:
    raw = pair.raw.read_bytes().decode("utf-8")
    extended = pair.extended.read_bytes().decode("utf-8")
    errors: list[str] = []
    if raw != _extended_sync_surface(extended):
        errors.append("extended narration does not exactly match raw")
    return errors
```

Add a CLI accepting a stage directory or either pair file, `--json`, and `--` using the
same exit contract as the existing annotated validator: `0` valid, `1` validation errors,
`2` unreadable input.

The synchronization extractor removes only a valid standalone purpose line and its one
formatting separator, inline evidence indicators, and the one final appendix. It does not
trim lines, collapse whitespace, normalize line endings, or reconstruct Markdown. In Task
3, broaden its annotation-line check from `PURPOSE_RE` to `PURPOSE_CANDIDATE_RE` so an
invalid annotation is still removed from the sync surface and reported by the annotation
validator rather than disguised as narration drift.

- [ ] **Step 4: Run the pair tests and verify GREEN**

Run the command from Step 2.

Expected: all path and synchronization tests PASS.

- [ ] **Step 5: Commit the pair validator core**

```bash
git add -- \
  .agents/skills/writing-whp-youtube-scripts/scripts/validate_script_pair.py \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_script_pair.py
git diff --cached --check
git commit -m "feat(skill): validate raw and extended script pairs"
```

### Task 3: Enforce raw purity and storytelling annotation semantics

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_script_pair.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_script_pair.py`

- [ ] **Step 1: Add failing raw-purity and markup tests**

Add table-driven tests:

```python
def test_raw_rejects_non_spoken_material(self) -> None:
    forbidden = (
        (
            "[MAIN HOOK — annotation]\n",
            "raw script cannot contain purpose annotations",
        ),
        (
            "> Fact. [F-001](https://example.com)\n",
            "raw script cannot contain evidence indicators",
        ),
        (
            "## Appendix\n\nMetadata.\n",
            "raw script cannot contain an Appendix",
        ),
        (
            "- **Status:** BLUEPRINT\n",
            "raw script allows only title, beat headings, and blockquoted narration",
        ),
    )
    for insertion, expected in forbidden:
        with self.subTest(insertion=insertion):
            stage_dir = self.make_pair(
                raw=RAW + "\n" + insertion,
                extended=EXTENDED,
            )
            self.assertIn(
                expected,
                validate_pair(resolve_pair(stage_dir)),
            )


def test_raw_requires_exactly_one_h1(self) -> None:
    for raw in (
        RAW.replace("# Episode\n\n", ""),
        RAW + "\n# A second title\n",
    ):
        with self.subTest(raw=raw):
            stage_dir = self.make_pair(raw=raw)
            self.assertIn(
                "raw script requires exactly one H1 title",
                validate_pair(resolve_pair(stage_dir)),
            )


def test_underlined_passages_require_main_tags(self) -> None:
    invalid = EXTENDED.replace(
        "MAIN HOOK | LOCKED WORDING",
        "MINI-HOOK | LOCKED WORDING",
    )
    stage_dir = self.make_pair(extended=invalid)
    errors = validate_pair(resolve_pair(stage_dir))
    self.assertIn("underlined passage requires a main-story tag", errors)
    self.assertIn("MINI-HOOK passage must be italic and not underlined", errors)


def test_main_tags_require_underlining(self) -> None:
    invalid = EXTENDED.replace("<u>**", "**").replace("**</u>", "**")
    stage_dir = self.make_pair(extended=invalid)
    self.assertIn(
        "main-story tag requires an underlined passage",
        validate_pair(resolve_pair(stage_dir)),
    )


def test_mini_hooks_are_italic_not_underlined(self) -> None:
    self.assertEqual(validate_pair(resolve_pair(self.make_pair())), [])


def test_every_italic_passage_requires_a_supporting_tag(self) -> None:
    invalid = EXTENDED.replace(
        "[MINI-HOOK — Turns the opening into the next evidence need.]",
        "[DEFENSE — Names the viewer's anticipated objection.]",
    )
    stage_dir = self.make_pair(extended=invalid)
    self.assertIn(
        "italic passage requires a supporting-story tag",
        validate_pair(resolve_pair(stage_dir)),
    )


def test_locked_wording_requires_its_tag(self) -> None:
    stage_dir = self.make_pair(
        extended=EXTENDED.replace(" | LOCKED WORDING", "")
    )
    self.assertIn(
        "bold passage requires LOCKED WORDING",
        validate_pair(resolve_pair(stage_dir)),
    )


def test_locked_wording_tag_requires_bold(self) -> None:
    invalid = EXTENDED.replace("<u>**", "<u>").replace("**</u>", "</u>")
    stage_dir = self.make_pair(extended=invalid)
    self.assertIn(
        "LOCKED WORDING requires a bold passage",
        validate_pair(resolve_pair(stage_dir)),
    )


def test_rejects_orphan_or_empty_purpose_annotations(self) -> None:
    invalid = EXTENDED.replace(
        "[MINI-HOOK — Turns the opening into the next evidence need.]",
        "[MINI-HOOK — ]",
    )
    stage_dir = self.make_pair(extended=invalid)
    self.assertIn(
        "invalid or empty purpose annotation",
        validate_pair(resolve_pair(stage_dir)),
    )


def test_rejects_unknown_purpose_tags(self) -> None:
    invalid = EXTENDED.replace("MINI-HOOK", "SURPRISE")
    stage_dir = self.make_pair(extended=invalid)
    self.assertIn(
        "unknown purpose tag: SURPRISE",
        validate_pair(resolve_pair(stage_dir)),
    )
```

- [ ] **Step 2: Run the markup tests and verify RED**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
python3 -m unittest -v \
  test_validate_script_pair.ScriptPairTests.test_raw_rejects_non_spoken_material \
  test_validate_script_pair.ScriptPairTests.test_raw_requires_exactly_one_h1 \
  test_validate_script_pair.ScriptPairTests.test_underlined_passages_require_main_tags \
  test_validate_script_pair.ScriptPairTests.test_main_tags_require_underlining \
  test_validate_script_pair.ScriptPairTests.test_every_italic_passage_requires_a_supporting_tag \
  test_validate_script_pair.ScriptPairTests.test_locked_wording_requires_its_tag \
  test_validate_script_pair.ScriptPairTests.test_locked_wording_tag_requires_bold \
  test_validate_script_pair.ScriptPairTests.test_rejects_orphan_or_empty_purpose_annotations \
  test_validate_script_pair.ScriptPairTests.test_rejects_unknown_purpose_tags
```

Expected: FAIL because the validator currently compares narration only.

- [ ] **Step 3: Implement passage parsing and semantic checks**

Add:

```python
MAIN_TAG_RE = re.compile(
    r"^(?:MAIN HOOK|OBSTACLE|LOOP (?:OPEN|PAYOFF) L-\d{2})$"
)
ALLOWED_STATIC_TAGS = {
    "MAIN HOOK",
    "OBSTACLE",
    "MINI-HOOK",
    "DEFENSE",
    "DISARM",
    "PROMISE",
    "TRANSITION",
    "REVERSAL",
    "AHA",
    "APPLICATION",
    "FINAL PAYOFF",
    "LOCKED WORDING",
}
SUPPORTING_TAGS = {"MINI-HOOK", "TRANSITION", "REVERSAL", "AHA"}
MINI_HOOK = "MINI-HOOK"
LOCKED = "LOCKED WORDING"
PURPOSE_CANDIDATE_RE = re.compile(r"^\[.*\]$")
UNDERLINE_RE = re.compile(r"<u>.+?</u>", re.DOTALL)
TRIPLE_RE = re.compile(r"\*\*\*(?=\S).+?(?<=\S)\*\*\*", re.DOTALL)
BOLD_RE = re.compile(
    r"(?<!\*)\*\*(?!\*)(?=\S).+?(?<=\S)\*\*(?!\*)",
    re.DOTALL,
)
ITALIC_RE = re.compile(
    r"(?<!\*)\*(?!\*)(?=\S).+?(?<=\S)\*(?!\*)",
    re.DOTALL,
)


@dataclass(frozen=True)
class Purpose:
    tags: tuple[str, ...]
    explanation: str
    line: int


@dataclass(frozen=True)
class Passage:
    purpose: Purpose | None
    spoken: str
    line: int


def _parse_purpose(line: str, line_number: int) -> Purpose:
    match = PURPOSE_RE.fullmatch(line)
    if match is None:
        raise ValueError("invalid or empty purpose annotation")
    tags = tuple(part.strip() for part in match.group("tags").split("|"))
    explanation = match.group("explanation").strip()
    if not tags or any(not tag for tag in tags) or not explanation:
        raise ValueError("invalid or empty purpose annotation")
    for tag in tags:
        if tag not in ALLOWED_STATIC_TAGS and MAIN_TAG_RE.fullmatch(tag) is None:
            raise ValueError(f"unknown purpose tag: {tag}")
    return Purpose(tags, explanation, line_number)


def _passages(markdown: str) -> tuple[list[Passage], list[str]]:
    passages: list[Passage] = []
    errors: list[str] = []
    pending: Purpose | None = None
    current: list[str] = []
    current_line = 0

    def flush() -> None:
        nonlocal pending, current, current_line
        if current:
            passages.append(
                Passage(
                    pending,
                    " ".join(part.strip() for part in current),
                    current_line,
                )
            )
            pending = None
            current = []
            current_line = 0

    for line_number, line in enumerate(
        _before_appendix(markdown).splitlines(),
        start=1,
    ):
        if PURPOSE_CANDIDATE_RE.fullmatch(line):
            flush()
            if pending is not None:
                errors.append("purpose annotation has no following passage")
            pending = None
            try:
                pending = _parse_purpose(line, line_number)
            except ValueError as exc:
                errors.append(str(exc))
            continue
        if line.startswith(">"):
            if not current:
                current_line = line_number
            current.append(EVIDENCE_RE.sub("", line[1:].lstrip()))
            continue
        if line.strip() == "":
            flush()
            continue
        flush()
    flush()
    if pending is not None:
        errors.append("purpose annotation has no following passage")
    return passages, errors
```

Add helpers that detect full-passage markup after stripping inline evidence:

```python
def _markup(spoken: str) -> tuple[bool, bool, bool]:
    underlined = UNDERLINE_RE.search(spoken) is not None
    triple = TRIPLE_RE.search(spoken) is not None
    italic = triple or ITALIC_RE.search(spoken) is not None
    bold = triple or BOLD_RE.search(spoken) is not None
    return underlined, italic, bold
```

In `validate_pair`, validate the raw structure before comparing projections:

- require exactly one H1 and reject any raw purpose line, evidence link, appendix,
  metadata bullet, or non-heading non-blockquote prose;
- treat any standalone bracketed annotation candidate as an annotation even when its
  grammar is invalid, so an empty explanation produces the specific grammar error rather
  than disappearing from projection;
- accept only the approved static tags and `LOOP OPEN/PAYOFF L-##`;
- require each underlined extended passage to have at least one `MAIN_TAG_RE` tag;
- require every `MAIN_TAG_RE` tag to map to an underlined passage;
- reject underline plus italics on the same passage;
- require `MINI-HOOK` to map to italics and never underline;
- require every italic passage to map to at least one `SUPPORTING_TAGS` value;
- require bold to map to `LOCKED WORDING` and `LOCKED WORDING` to map to bold;
- report annotations with no following passage;
- retain exact narration/format projection comparison.

- [ ] **Step 4: Run the full pair test module and verify GREEN**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
python3 -m unittest -v test_validate_script_pair.py
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the storytelling markup gate**

```bash
git add -- \
  .agents/skills/writing-whp-youtube-scripts/scripts/validate_script_pair.py \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_script_pair.py
git diff --cached --check
git commit -m "feat(skill): enforce storytelling markup semantics"
```

### Task 4: Enforce blueprint, draft, and final appendices

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_script_pair.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_script_pair.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Add failing stage-appendix tests**

Add:

```python
def test_blueprint_requires_all_blueprint_appendix_sections(self) -> None:
    for missing in (
        "### Blueprint metadata",
        "### Factual boundary and unresolved dependencies",
        "### Intro design record",
        "### Body logic map",
        "### Promise and loop payoff map",
        "### Approval state",
    ):
        with self.subTest(missing=missing):
            stage_dir = self.make_pair(
                extended=EXTENDED.replace(missing, f"### Missing {missing}")
            )
            self.assertIn(
                f"blueprint appendix requires {missing}",
                validate_pair(resolve_pair(stage_dir)),
            )


def test_draft_requires_draft_status_and_review_sections(self) -> None:
    draft_extended = EXTENDED.replace(
        "- **Status:** BLUEPRINT",
        "- **Status:** DRAFT",
    ).replace(
        "### Blueprint metadata",
        "### Draft metadata",
    ).replace(
        "### Factual boundary and unresolved dependencies",
        "### Evidence boundaries",
    ).replace(
        "### Intro design record",
        "### Story progression and payoff audit",
    ).replace(
        "### Body logic map",
        "### Spoken-readability result",
    ).replace(
        "### Promise and loop payoff map",
        "### Personal-input decision",
    ).replace(
        "### Approval state",
        "### Creative-approval state",
    )
    stage_dir = self.make_pair(
        extended=draft_extended,
        stage="draft",
    )
    self.assertEqual(validate_pair(resolve_pair(stage_dir)), [])


def test_final_delegates_to_the_annotated_validator(self) -> None:
    stage_dir = self.make_pair(stage="final")
    errors = validate_pair(resolve_pair(stage_dir))
    self.assertTrue(
        any(error.startswith("final appendix:") for error in errors)
    )
```

- [ ] **Step 2: Run the three tests and verify RED**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
python3 -m unittest -v \
  test_validate_script_pair.ScriptPairTests.test_blueprint_requires_all_blueprint_appendix_sections \
  test_validate_script_pair.ScriptPairTests.test_draft_requires_draft_status_and_review_sections \
  test_validate_script_pair.ScriptPairTests.test_final_delegates_to_the_annotated_validator
```

Expected: FAIL because stage appendices are not validated.

- [ ] **Step 3: Implement stage-specific appendix validation**

Add exact requirements:

```python
STAGE_REQUIREMENTS = {
    "blueprint": (
        "- **Status:** BLUEPRINT",
        "### Blueprint metadata",
        "### Factual boundary and unresolved dependencies",
        "### Intro design record",
        "### Body logic map",
        "### Promise and loop payoff map",
        "### Approval state",
    ),
    "draft": (
        "- **Status:** DRAFT",
        "### Draft metadata",
        "### Story progression and payoff audit",
        "### Evidence boundaries",
        "### Spoken-readability result",
        "### Personal-input decision",
        "### Creative-approval state",
    ),
}


def _appendix(markdown: str) -> str | None:
    parts = re.split(
        r"^## Appendix[ \t]*\r?$",
        markdown,
        flags=re.MULTILINE,
    )
    return parts[1] if len(parts) == 2 else None


def _validate_appendix(stage: str, extended: str) -> list[str]:
    appendix = _appendix(extended)
    if appendix is None:
        return ["extended script requires exactly one Appendix"]
    if stage in STAGE_REQUIREMENTS:
        return [
            f"{stage} appendix requires {required}"
            for required in STAGE_REQUIREMENTS[stage]
            if required not in appendix
        ]
    without_purpose = "\n".join(
        line
        for line in extended.splitlines()
        if PURPOSE_RE.fullmatch(line) is None
    )
    from validate_annotated_script import validate_document
    return [
        f"final appendix: {error}"
        for error in validate_document(without_purpose)
    ]
```

Call `_validate_appendix` from `validate_pair`. Reject any raw appendix before projection.

- [ ] **Step 4: Make the final-format owner explicitly extended-only**

At the top of `annotated-script-format.md`, link to `script-artifact-pair.md` and replace
the old “one Markdown source of truth” statement with:

```markdown
This reference owns the final extended appendix. The paired raw file owns narration.
Validate the pair first; then validate `final/script.extended.md` here.
```

Keep its complete appendix schema and evidence/rights rules. Update
`annotated-script-template.md` into a worked `final/script.extended.md` shape by adding
grouped purpose annotations before its narration passages while preserving the existing
appendix.

Add a skill-package regression that the template:

- contains at least one `[MAIN HOOK`;
- contains `## Appendix`;
- is described as final extended rather than a single source of truth; and
- links to the pair owner.

- [ ] **Step 5: Run pair, package, and annotated-validator tests**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
python3 -m unittest -v test_validate_script_pair.py
python3 -m unittest -v test_validate_annotated_script.py
cd ..
python3 scripts/test_skill_package.py
```

Expected: all three suites PASS.

- [ ] **Step 6: Commit the stage appendix checkpoint**

```bash
git add -- \
  .agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md \
  .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md \
  .agents/skills/writing-whp-youtube-scripts/scripts/validate_script_pair.py \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_script_pair.py \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
git diff --cached --check
git commit -m "feat(skill): validate stage-specific script appendices"
```

### Task 5: Make spoken-readability extraction understand storytelling markup

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_check_spoken_readability.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/check_spoken_readability.py`

- [ ] **Step 1: Add a failing extraction test**

```python
def test_storytelling_markup_is_not_spoken(self) -> None:
    sentences = extract_spoken_sentences(
        "> <u>**This main hook stays locked.**</u>\n"
        ">\n"
        "> ***But this mini-hook is also locked.***\n"
    )
    self.assertEqual(
        [sentence.text for sentence in sentences],
        [
            "This main hook stays locked.",
            "But this mini-hook is also locked.",
        ],
    )
```

- [ ] **Step 2: Run it and verify RED**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
python3 -m unittest -v \
  test_check_spoken_readability.SpokenReadabilityTests.test_storytelling_markup_is_not_spoken
```

Expected: FAIL because `<u>` remains in extracted text.

- [ ] **Step 3: Strip only approved visual markup**

Replace `LOCKED_LINE_BOLD_RE` with:

```python
STORY_MARKUP_RE = re.compile(r"</?u>|\*{1,3}")
```

In `_strip_non_spoken_annotations`, apply `STORY_MARKUP_RE.sub("", text)` after link and
URL removal. Do not strip arbitrary HTML.

- [ ] **Step 4: Run the full readability suite**

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
python3 -m unittest -v test_check_spoken_readability.py
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the readability checkpoint**

```bash
git add -- \
  .agents/skills/writing-whp-youtube-scripts/scripts/check_spoken_readability.py \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_check_spoken_readability.py
git diff --cached --check
git commit -m "fix(skill): exclude storytelling markup from narration"
```

### Task 6: Migrate the active Episode 1 blueprint pair

**Files:**

- Create: `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md`
- Create: `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.extended.md`
- Delete: `whp-youtube/predrafts/ep1_v2-intro-first.md`

- [ ] **Step 1: Add a failing real-artifact package test**

In `test_skill_package.py`, add `import hashlib` and a narration-preservation helper:

```python
PAIR_EVIDENCE_RE = re.compile(r"\s*\[F-\d{3}\]\([^)]+\)")
PAIR_STORY_MARKUP_RE = re.compile(r"</?u>|\*{1,3}")


def spoken_digest(path: Path) -> str:
    spoken = " ".join(
        line[1:].lstrip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.startswith(">")
    )
    spoken = PAIR_EVIDENCE_RE.sub("", spoken)
    spoken = PAIR_STORY_MARKUP_RE.sub("", spoken)
    normalized = " ".join(spoken.split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
```

Then add:

```python
def test_episode_one_blueprint_pair_is_valid(self) -> None:
    stage = (
        REPO_ROOT / "whp-youtube" / "episodes"
        / "ep001-ai-dangerous-advice" / "blueprint"
    )
    self.assertTrue((stage / "script.raw.md").is_file())
    self.assertTrue((stage / "script.extended.md").is_file())
    self.assertEqual(validate_pair(resolve_pair(stage)), [])
    self.assertEqual(
        spoken_digest(stage / "script.raw.md"),
        "f24eb7531093f73fd9779d05b05f4a0a5c54ac54acadc7a46f7b12e898fc2a7c",
    )
```

Add `from validate_script_pair import resolve_pair, validate_pair` beside the existing
test-module imports.

Run that single test and confirm RED because the pair does not exist.

- [ ] **Step 2: Build the raw blueprint from the current polished intro**

Create raw with:

- the current H1 title;
- `## Intro`;
- only the spoken blockquotes from `## Polished spoken intro`;
- no status, design record, body map, citations, or appendix.

Apply markup at the smallest complete passages:

- `<u>**...**</u>` on the opening title question as `MAIN HOOK`, `LOOP OPEN L-01`, and
  `LOCKED WORDING`;
- leave the narrator's “surely I would notice” position unstyled as `DEFENSE`, then use
  `<u>...</u>` on the Swiss case turn as the central `OBSTACLE`;
- `<u>...</u>` on “How can an answer sound responsible and still support a dangerous
  choice?” as `LOOP OPEN L-02`;
- `**...**` on the four-move explanation promise and four-question remedy promise;
- `*...*` on “And here is why this case stuck with me” as `MINI-HOOK`;
- `*...*` on the warning-plus-reassurance turn as `REVERSAL`;
- `<u>...</u>` on the radiologist result that defeats distrust as the second central
  `OBSTACLE`;
- `*...*` on the suspicion-versus-checking paradox and the future-model stakes escalation
  as supporting `AHA` passages; and
- `<u>**...**</u>` on the final “what exactly failed?” question as the SP02 handoff and
  `LOOP OPEN L-03`.

Do not rewrite or reorder narration in this formatting task.

- [ ] **Step 3: Build the extended blueprint and move planning material into its appendix**

Mirror raw exactly and add grouped annotations using this mapping:

```text
opening question → MAIN HOOK | LOOP OPEN L-01 | LOCKED WORDING
narrator immunity position → DEFENSE
Swiss case contradiction → OBSTACLE | DISARM
dangerous-choice question → LOOP OPEN L-02
four moves / four questions → PROMISE | LOCKED WORDING
why the case stuck → MINI-HOOK
warning plus reassurance → REVERSAL
radiologist distrust result → OBSTACLE | DISARM
suspicion versus checking → AHA
future-model consequence → AHA
final study handoff → LOOP OPEN L-03 | LOCKED WORDING
```

Create one `## Appendix` containing:

- `### Blueprint metadata` with `Status: BLUEPRINT`, approved architecture and story
  baselines, factual boundary, dependencies, and approval state;
- `### Intro design record` using the current record;
- `### Body logic map` using SP02–SP08 unchanged; and
- `### Promise and loop payoff map` naming L-01, L-02, L-03 and their body destinations.

After both files contain all current material, delete the loose
`predrafts/ep1_v2-intro-first.md`.

- [ ] **Step 4: Validate the real blueprint pair and raw readability**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts
python3 scripts/validate_script_pair.py -- \
  "$(pwd)/../../../whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint"
python3 scripts/check_spoken_readability.py -- \
  "$(pwd)/../../../whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md"
```

Expected: pair validation PASS; readability reports no unresolved failures.

- [ ] **Step 5: Run the package test and commit the blueprint migration**

Run the new real-artifact test, then:

```bash
git add -- \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md \
  whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.extended.md
git diff --cached --check
git commit -m "feat(youtube): create Episode 1 script blueprint pair"
```

### Task 7: Convert the canonical Episode 1 into a final pair

**Files:**

- Create: `whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.raw.md`
- Create: `whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.extended.md`
- Delete: `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Add a failing real final-pair test**

```python
def test_episode_one_final_pair_is_valid_and_old_path_is_retired(self) -> None:
    final = (
        REPO_ROOT / "whp-youtube" / "episodes"
        / "ep001-ai-dangerous-advice" / "final"
    )
    self.assertTrue((final / "script.raw.md").is_file())
    self.assertTrue((final / "script.extended.md").is_file())
    self.assertFalse(
        (
            REPO_ROOT / "whp-youtube" / "episodes"
            / "01-why-ai-makes-bad-advice-feel-right.md"
        ).exists()
    )
    self.assertEqual(validate_pair(resolve_pair(final)), [])
    self.assertEqual(
        spoken_digest(final / "script.raw.md"),
        "1b43ac65b2c6255aa646a79e0be8cc9d01500a07f3000f8bd98d6d2cd95a2917",
    )
```

Run it and confirm RED.

- [ ] **Step 2: Extract the raw final without changing spoken words**

From the canonical episode:

- keep the H1, numbered beat headings, and all narration blockquotes before Appendix;
- remove every inline `[F-###](URL)` indicator;
- retain existing locked-line bolding;
- omit the complete appendix;
- add underlining only to the opening main hook, the major open/payoff loop passages,
  and explicit central obstacles;
- add italics to existing mini-hooks and local teasers;
- do not change the spoken characters after stripping formatting.

Use this beat-level map:

```text
Beat 01: MAIN HOOK; immunity DEFENSE; radiologist OBSTACLE/DISARM;
         explanation/remedy PROMISE; real-AI LOOP OPEN.
Beat 02: move-one section hook; framing AHA; move-two LOOP OPEN.
Beat 03: real-AI LOOP PAYOFF; investigation OBSTACLE; training AHA;
         move-three LOOP OPEN.
Beat 04: fluency AHA; apparent study contradiction OBSTACLE;
         scoped resolution LOOP PAYOFF; move-four LOOP OPEN.
Beat 05: downstream-feedback LOOP PAYOFF; application need LOOP OPEN.
Beat 06: Second-Opinion Test APPLICATION; opening promise LOOP PAYOFF.
Beat 07: title question and counterfeit-second-opinion FINAL PAYOFF.
```

Underline only the named main hook/loop/obstacle passages. Italicize the local connective
mini-hooks inside those beats. Keep every existing bold lock.

- [ ] **Step 3: Build the extended final around the exact raw narration**

Start from the same canonical file:

- preserve all evidence indicators and the complete existing appendix;
- copy the raw storytelling markup exactly;
- add grouped purpose annotations from the beat-level map;
- include `LOCKED WORDING` on every annotation whose passage contains bold;
- distinguish the opening and payoff IDs (`L-01`, `L-02`, and so on) consistently between
  annotations and appendix story-function entries.

Delete the loose canonical file only after the new extended file contains its complete
appendix and the new raw file contains all narration.

- [ ] **Step 4: Run all three final-stage validators**

```bash
cd .agents/skills/writing-whp-youtube-scripts
python3 scripts/validate_script_pair.py -- \
  "$(pwd)/../../../whp-youtube/episodes/ep001-ai-dangerous-advice/final"
python3 scripts/check_spoken_readability.py --reviewed -- \
  "$(pwd)/../../../whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.raw.md"
python3 scripts/validate_annotated_script.py -- \
  "$(pwd)/../../../whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.extended.md"
```

Expected: pair PASS; readability has no failures after explicit review of any 21–25-word
items; annotated final PASS.

- [ ] **Step 5: Commit the canonical final migration**

```bash
git add -- \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.raw.md \
  whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.extended.md \
  whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md
git diff --cached --check
git commit -m "refactor(youtube): split Episode 1 final into paired artifacts"
```

### Task 8: Consolidate Episode 1 legacy material under archive

**Files:**

- Create:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/throughline-experiment.md`
- Create:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/full-prototype.md`
- Create:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/v2-preworkflow-narration.md`
- Delete: `whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md`
- Delete: `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`
- Delete: `whp-youtube/predrafts/ep1_v2.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Add a failing archive-preservation test**

Reuse the `hashlib` import added in Task 6. Lock the original files' SHA-256 digests in
the test before moving them:

```python
def test_episode_one_legacy_artifacts_are_archived_byte_for_byte(self) -> None:
    archive = (
        REPO_ROOT / "whp-youtube" / "episodes"
        / "ep001-ai-dangerous-advice" / "archive"
    )
    expected = {
        "throughline-experiment.md": (
            "c203c1bca16707a4ebd331d612d02fddaa38ec7ec2c1d0baa9580b96453c89b3"
        ),
        "full-prototype.md": (
            "4a8761e823173ee391240205b0580b5a94096a29fa7226d6ead0b675a65c08ed"
        ),
        "v2-preworkflow-narration.md": (
            "dd2e7074bc321673077dae213caf350e5698c25dd3bfce52b3153ee0c2bbf5d1"
        ),
    }
    for name, digest in expected.items():
        with self.subTest(name=name):
            self.assertEqual(
                hashlib.sha256((archive / name).read_bytes()).hexdigest(),
                digest,
            )
```

The literal values above are the output of:

```bash
sha256sum \
  whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md \
  whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md \
  whp-youtube/predrafts/ep1_v2.md
```

Run the test and confirm RED because archive paths do not exist.

- [ ] **Step 2: Move each file byte-for-byte**

Use `apply_patch` move hunks without changing content. Do not add new prose, repair links,
or modernize headings during the move. The existing caution/status labels remain the
archive boundary.

- [ ] **Step 3: Run the archive test and verify GREEN**

Expected: all three recorded digests match.

- [ ] **Step 4: Commit the archive move**

```bash
git add -- \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  whp-youtube/episodes/ep001-ai-dangerous-advice/archive \
  whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md \
  whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md
git diff --cached --check
git commit -m "refactor(youtube): archive Episode 1 legacy scripts"
```

### Task 9: Update active Episode 1 paths and record the superseding decision

**Files:**

- Modify: `whp-youtube/STEERING.md`
- Modify: `docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`
- Modify: `docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`
- Modify: `docs/superpowers/evidence/2026-07-28-whp-intro-first-predraft-gate.md`
- Modify: `DECISIONS.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Add a failing stale-active-path regression**

Add a test that reads only current doctrine and active Episode 1 files, excluding dated
historical decisions/specs except the two active Episode 1 baselines:

```python
def test_active_episode_one_routes_only_to_episode_first_pairs(self) -> None:
    active = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (
            STEERING_MD,
            REPO_ROOT / "docs/superpowers/specs/"
            "2026-07-27-episode-1-story-rebuild-design.md",
            REPO_ROOT / "docs/superpowers/plans/"
            "2026-07-27-episode-1-v2-story-progression.md",
        )
    )
    for retired in (
        "whp-youtube/predrafts/",
        "whp-youtube/drafts/ep1_v2.md",
        "episodes/01-why-ai-makes-bad-advice-feel-right.md",
    ):
        self.assertNotIn(retired, active)
    self.assertIn(
        "episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md",
        active,
    )
    self.assertIn(
        "episodes/ep001-ai-dangerous-advice/final/script.extended.md",
        active,
    )
```

Run and confirm RED.

- [ ] **Step 2: Update only active path and stage language**

- `STEERING.md`: point current Episode 1 state to the blueprint pair, final canonical pair,
  and archive; replace the active pre-draft law with Script Blueprint.
- Episode 1 design and progression plan: replace target and preservation paths with
  episode-first paths; keep their approved thesis and causal plan unchanged.
- Evidence record: append a later note that the former pre-draft was migrated into a
  Script Blueprint pair; retain its historical RED/GREEN record.

- [ ] **Step 3: Append one superseding decision**

Add to `DECISIONS.md`:

```markdown
## 2026-07-28 — Use episode-first raw/extended script pairs

**Decision:** Every active numbered episode lives under
`whp-youtube/episodes/epNNN-name/` with reached `blueprint/`, `draft/`, and `final/`
stages. Raw owns spoken wording; extended mirrors it with grouped purpose annotations and
the stage appendix. Underline marks main hooks, major loops, and central obstacles;
italics mark supporting devices such as mini-hooks; bold remains locked wording.

This supersedes active `pre-draft` terminology and loose single-file script paths without
rewriting historical decision records.
```

Include the owner, validators, Episode 1 pair/archive, active baselines, and evidence record
in `Documents`.

- [ ] **Step 4: Run the stale-path and full package tests**

Expected: both PASS.

- [ ] **Step 5: Commit paths and decision**

```bash
git add -- \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  whp-youtube/STEERING.md \
  docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md \
  docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md \
  docs/superpowers/evidence/2026-07-28-whp-intro-first-predraft-gate.md \
  DECISIONS.md
git diff --cached --check
git commit -m "docs(youtube): route Episode 1 through paired artifacts"
```

### Task 10: Verify the complete migration and package

**Files:**

- No planned file changes. A failure returns to the exact owner file and relevant test
  from Tasks 1–9; do not make a catch-all verification edit.

- [ ] **Step 1: Run all Python suites**

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
python3 -m unittest -v test_validate_script_pair.py
python3 -m unittest -v test_check_spoken_readability.py
python3 -m unittest -v test_validate_annotated_script.py
python3 test_skill_package.py
```

Expected: all suites PASS with zero errors or failures.

- [ ] **Step 2: Validate the skill package**

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  /home/martin/work/projects/why-humans-play/why-humans-play_sources/.agents/skills/writing-whp-youtube-scripts
```

Expected: `Skill is valid!`

- [ ] **Step 3: Validate both Episode 1 pairs and delivery surfaces**

```bash
cd /home/martin/work/projects/why-humans-play/why-humans-play_sources/.agents/skills/writing-whp-youtube-scripts
python3 scripts/validate_script_pair.py -- \
  /home/martin/work/projects/why-humans-play/why-humans-play_sources/whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint
python3 scripts/validate_script_pair.py -- \
  /home/martin/work/projects/why-humans-play/why-humans-play_sources/whp-youtube/episodes/ep001-ai-dangerous-advice/final
python3 scripts/check_spoken_readability.py -- \
  /home/martin/work/projects/why-humans-play/why-humans-play_sources/whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md
python3 scripts/check_spoken_readability.py --reviewed -- \
  /home/martin/work/projects/why-humans-play/why-humans-play_sources/whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.raw.md
python3 scripts/validate_annotated_script.py -- \
  /home/martin/work/projects/why-humans-play/why-humans-play_sources/whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.extended.md
```

Expected: both pairs PASS, both raw files have no unresolved readability failures, and
the final extended document passes production validation.

- [ ] **Step 4: Run stale-doctrine and loose-Episode-1 scans**

```bash
! rg -n -i \
  'predraft-intro-workflow|whp-youtube/predrafts/|whp-youtube/drafts/ep1_v2|episodes/01-why-ai-makes-bad-advice-feel-right' \
  .agents/skills/writing-whp-youtube-scripts \
  .agents/skills/reconcile-whp/SKILL.md \
  whp-youtube/STEERING.md \
  docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md \
  docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md

find whp-youtube/predrafts whp-youtube/drafts -maxdepth 1 -type f \
  \( -iname '*ai*makes*bad*advice*' -o -iname 'ep1_v2*' \)
```

Expected: the active-doctrine scan prints nothing. The loose Episode 1 scan prints
nothing. Historical dated records may still describe the retired paths.

- [ ] **Step 5: Review repository state and whitespace**

```bash
git diff --check
git status --short
git log --oneline -10
```

Expected: no whitespace errors; only intentionally uncommitted work that predates this
plan remains; the paired-artifact commits are visible as focused checkpoints.

- [ ] **Step 6: Commit any verification-only correction**

Skip this step when no correction was required. Otherwise stage only the corrected
task-owned files, rerun the exact failed check plus the full relevant suite, inspect the
staged diff, then:

```bash
git commit -m "fix(skill): close paired-script verification gap"
```

## Completion criteria

- Every reached Episode 1 stage has a validated raw/extended pair under
  `whp-youtube/episodes/ep001-ai-dangerous-advice/`.
- The Script Blueprint contains a polished raw intro and annotated extended intro plus
  bullet-only body map.
- Raw files contain no annotations, citations, metadata, or appendix.
- Extended narration and formatting exactly match raw after approved annotation removal.
- Underline is limited to main hooks, major loops, and central obstacles.
- Mini-hooks and other supporting devices use italics, never underline.
- Bold continues to mean locked wording.
- The canonical final extended appendix still passes the existing production validator.
- Legacy Episode 1 artifacts remain byte-for-byte preserved under `archive/`.
- Active skill and channel doctrine use Blueprint and episode-first pair paths.
- Historical records remain historical rather than being silently rewritten.
