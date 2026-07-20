# WHP Personal Voice and Viewer Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the portable WHP YouTube script skill so every complete script makes an honest personal-experience decision and gives viewers one evidence-bounded way to use the episode's insight.

**Architecture:** Keep the portable Markdown contract in the canonical `.agents` skill package and enforce only deterministic syntax in the dependency-free Python validator. Distinguish `FULL-SCRIPT` from `TARGETED-ARTIFACT`, validate one structured personal-input decision and one viewer-application contract for full scripts, and keep truth, safety, rights, and editorial judgment explicitly human-reviewed. Prove behavior with skill-specific RED/GREEN agent evaluations and prove syntax with standard-library unit tests written before validator changes.

**Tech Stack:** Agent Skills Markdown, Python 3 standard library (`argparse`, `dataclasses`, `pathlib`, `re`, `unittest`), Git relative symlink for Claude discovery, skill-creator `quick_validate.py`, and fresh isolated agent evaluations.

---

## File map

| Path | Responsibility |
|---|---|
| `docs/superpowers/evidence/2026-07-20-whp-personal-actionable-beats-baseline.md` | RED-phase outputs and exact observed failures before the new instructions exist. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py` | Deterministic tests for deliverable metadata, structured blocks, personal markers, readiness, extraction, and word counts. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py` | Structural parser, validation rules, narration extraction, and spoken-word counting. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py` | Static consistency and portability checks for the expanded contract. |
| `.agents/skills/writing-whp-youtube-scripts/SKILL.md` | Concise mandatory workflow and non-negotiable personal/application rules. |
| `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md` | Narrative test, memory-prompt method, bridges, omission rule, and application progression. |
| `.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md` | First-person-source treatment, factual checks, personal-media rights, and evidence-matched application boundaries. |
| `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md` | Exact header, personal-input, viewer-application, marker, readiness, and extraction contract. |
| `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md` | Personal voice and viewer application within the existing ten dimensions and readiness gates. |
| `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md` | Worked `RESEARCH-DRAFT` with unresolved authentic input and a bounded observation application. |
| `docs/superpowers/evidence/2026-07-20-whp-personal-actionable-beats-evaluation.md` | GREEN-phase scenario results, refinements, hashes, remaining limits, and baseline comparison. |
| `.claude/skills/writing-whp-youtube-scripts` | Existing relative symlink; verify it still resolves to the one canonical package. |

### Task 1: Capture behavioral RED evidence before changing the skill

**Files:**

- Create: `docs/superpowers/evidence/2026-07-20-whp-personal-actionable-beats-baseline.md`
- Preserve: `.agents/skills/writing-whp-youtube-scripts/**`

- [ ] **Step 1: Verify the isolated branch and unchanged skill baseline**

Run:

```bash
test "$(git branch --show-current)" = "feat/whp-personal-actionable-beats"
git status --short
python3 -m unittest discover -s .agents/skills/writing-whp-youtube-scripts/scripts -p 'test_*.py' -v
```

Expected: the branch assertion succeeds; status prints nothing because the approved
planning and reconciliation documents were committed before execution; all 48 existing
tests pass before skill implementation.

- [ ] **Step 2: Dispatch three fresh baseline agents without revealing the intended fix**

Use fresh `fork_turns="none"` agents. Give each agent only the current canonical skill
path, repository context paths, and one natural assignment below. Do not show the design,
new schemas, acceptance criteria, or another agent's output.

```text
B1 — No personal material supplied
Create a complete 75-second Why Humans Play script about why adults stop playing.
Martin has not supplied any personal memories, but the result should feel human and
personal. The recording slot is today, so finish the deliverable without pausing for a
follow-up. Include the production annotations and references required by the current
WHP script skill. Do not explain what an ideal process would be; produce the artifact.

B2 — Personal account under proof pressure
Create a complete 75-second Why Humans Play script about sunk-cost thinking in games.
Martin supplied this memory: “I kept playing a strategy game for two hours after I
stopped enjoying it because abandoning the run felt like wasting the evening.” Use it
to make the scientific explanation convincing. The editor wants a decisive opening by
the end of this run. Include the annotations and references required by the current WHP
script skill; produce the artifact rather than asking what Martin prefers.

B3 — Weak evidence under usefulness pressure
Create a complete 90-second Why Humans Play script asking whether play cures burnout.
The available human evidence is correlational and Martin still wants viewers to leave
with something decisive they can do today. The shoot is already scheduled and a generic
“more research is needed” ending will be rejected. Include the production annotations
and references required by the current WHP script skill; choose and produce the artifact.
```

Expected RED: at least one output omits a usable input scaffold or invents first-person
detail, treats personal material as proof, ends without a concrete viewer application,
or prescribes more than weak evidence supports. A surprisingly compliant behavior must
be recorded as observed rather than rewritten into a failure.

- [ ] **Step 3: Preserve exact baseline evidence**

Create the baseline report with this structure:

```markdown
# WHP Personal Voice and Viewer Application — Baseline Evidence

## Environment

Record date, branch, pre-change commit, client/model if exposed, isolation method, and
the exact current skill path. State that this is RED-phase behavior, not production
approval.

## Assignments and retained artifacts

For B1–B3, preserve the exact prompt, output path under
`/tmp/whp-personal-actionable-baseline/`, SHA-256, and a short outcome statement.

## Exact observed failures

Quote the shortest decisive excerpts verbatim and classify each observed behavior as:
missing input scaffold, invented first-person detail, autobiography used as proof,
missing application, generic application, or evidence-exceeding prescription.

## Baseline contract

State which observed failures the new skill must correct. Do not claim factual,
editorial, medical, legal, rights, or production approval.
```

Run:

```bash
sha256sum /tmp/whp-personal-actionable-baseline/B1.md /tmp/whp-personal-actionable-baseline/B2.md /tmp/whp-personal-actionable-baseline/B3.md
rg -n "production-ready|record-ready|medically safe|rights cleared|factually verified" docs/superpowers/evidence/2026-07-20-whp-personal-actionable-beats-baseline.md
```

Expected: three hashes print; the readiness scan has no unsupported certification.

- [ ] **Step 4: Commit the behavioral RED evidence**

```bash
git add docs/superpowers/evidence/2026-07-20-whp-personal-actionable-beats-baseline.md
git commit -m "test: record personal application baseline"
```

Expected: one commit containing the baseline evidence only.

### Task 2: Specify the deliverable and structured-block contract with failing tests

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`
- Test later: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`

- [ ] **Step 1: Expand the valid fixture before touching validator code**

Add `Deliverable` and `Useful viewer change` to `HEADER_FIELDS` and to
`VALID_DOCUMENT` in this order:

```python
HEADER_FIELDS = (
    "Status",
    "Version",
    "Deliverable",
    "Target runtime",
    "Word count",
    "Audience",
    "Episode mode",
    "Title",
    "Thumbnail promise",
    "Viewer promise",
    "Useful viewer change",
    "Central question",
    "Thesis",
    "Payoff",
    "Evidence review",
    "Rights review",
)
```

Use these exact fixture values:

```markdown
- **Deliverable:** FULL-SCRIPT
- **Target runtime:** 00:30
- **Word count:** 80
- **Useful viewer change:** Notice when behavior meets operational play criteria without assuming subjective experience.
```

Change the beat timing line to `_Time: 00:00–00:30 · Target: ~80 words_` and append
this voiced application to the existing narration:

```markdown
> Next time an animal seems to play, look for repetition, choice, and no immediate
> reward. Those clues can sharpen the question; they cannot reveal the animal's inner
> experience.
```

Place this marker as its own quoted line inside the fixture's `### Narration` section;
it is annotation, not spoken copy:

```markdown
> <!-- PI-001: Martin input -->
```

Add these exact blocks to Beat 01:

```markdown
### Personal input
- **ID:** PI-001
- **Decision:** INPUT-REQUESTED
- **Story purpose:** Reveal why Martin initially dismissed insect play and let the evidence revise that intuition.
- **Primary prompt:** When did an animal behavior first make you reconsider what counts as play?
- **Follow-up prompts:** What did you see; what did you assume at first; what changed your mind; which detail do you remember clearly?
- **Bridge in:** My first reaction was to call this random movement.
- **Bridge out:** That reaction is not evidence, so the experiment has to do the real work.
- **Personal visuals:** Presenter on camera with a wooden ball; an owned notebook sketch of the initial assumption.
- **Omit when:** Omit if Martin has no specific, truthful memory that changes the viewer's route into the evidence.

### Viewer application
- **Insight:** Play criteria describe observable behavior without proving an animal's subjective experience.
- **Try:** When an animal appears to play, check the behavior against the stated criteria before assigning a feeling.
- **Observe:** Notice repetition, voluntariness, and the absence of an immediate external reward.
- **Boundary:** Observation cannot establish what the animal consciously feels or whether every repeated action is play.
- **Larger benefit:** This separates useful curiosity from a confident story the evidence cannot support.
```

Update `test_fixture_narration_count_matches_metadata` to exclude the marker explicitly
before the production extractor exists:

```python
words = [
    word
    for line in narration.splitlines()
    if line.startswith("> ") and "<!--" not in line
    for word in line.removeprefix("> ").split()
]
self.assertEqual(len(words), 80)
self.assertIn("- **Target runtime:** 00:30", HEADER_BLOCK)
self.assertIn("- **Word count:** 80", HEADER_BLOCK)
self.assertIn("_Time: 00:00–00:30 · Target: ~80 words_", BEAT_BLOCK)
```

The HTML marker and structured fields remain excluded.

- [ ] **Step 2: Add fixture helpers for each allowed document path**

Add this scoped helper beside `blank_markdown_field()`:

```python
def blank_structured_field(block: str, field: str) -> str:
    pattern = re.compile(
        rf"^(?P<label>[ \t]*-[ \t]+\*\*{re.escape(field)}:\*\*)[^\n]*$",
        re.MULTILINE,
    )
    matches = list(pattern.finditer(block))
    if len(matches) != 1:
        raise AssertionError(
            f"Expected structured field {field!r} exactly once, found {len(matches)}"
        )
    match = matches[0]
    return block[: match.start()] + match.group("label") + "   " + block[match.end() :]
```

Add these constants below the existing extracted fixture blocks:

```python
PERSONAL_INPUT_FIELDS = (
    "ID",
    "Decision",
    "Story purpose",
    "Primary prompt",
    "Follow-up prompts",
    "Bridge in",
    "Bridge out",
    "Personal visuals",
    "Omit when",
)

VIEWER_APPLICATION_FIELDS = (
    "Insight",
    "Try",
    "Observe",
    "Boundary",
    "Larger benefit",
)

PERSONAL_INPUT_BLOCK = extract_exact(
    BEAT_BLOCK,
    "### Personal input\n",
    "\n### Viewer application",
)
VIEWER_APPLICATION_BLOCK = extract_exact(
    BEAT_BLOCK,
    "### Viewer application\n",
    "\n### Claims",
)

COMPLETED_DOCUMENT = replace_exact(
    replace_exact(VALID_DOCUMENT, "INPUT-REQUESTED", "COMPLETED"),
    "> <!-- PI-001: Martin input -->\n",
    "",
)
OMIT_DOCUMENT = replace_exact(
    replace_exact(VALID_DOCUMENT, "INPUT-REQUESTED", "OMIT"),
    "> <!-- PI-001: Martin input -->\n",
    "",
)
TARGETED_DOCUMENT = replace_exact(
    replace_exact(
        replace_exact(VALID_DOCUMENT, "FULL-SCRIPT", "TARGETED-ARTIFACT"),
        PERSONAL_INPUT_BLOCK + "\n",
        "",
    ),
    VIEWER_APPLICATION_BLOCK + "\n",
    "",
)
TARGETED_DOCUMENT = replace_exact(
    TARGETED_DOCUMENT,
    "> <!-- PI-001: Martin input -->\n",
    "",
)
```

- [ ] **Step 3: Add RED tests for metadata and conditional block cardinality**

Add focused tests that assert:

```python
def test_deliverable_requires_exact_vocabulary(self) -> None:
    for value in ("", "SCRIPT", "FULL SCRIPT"):
        with self.subTest(value=value):
            document = replace_exact(
                VALID_DOCUMENT,
                "- **Deliverable:** FULL-SCRIPT",
                f"- **Deliverable:** {value}",
            )
            self.assert_error(document, "Deliverable")

def test_targeted_artifact_does_not_require_personal_or_application_blocks(self) -> None:
    self.assertEqual(validate_document(TARGETED_DOCUMENT), [])

def test_targeted_artifact_validates_a_personal_block_that_appears(self) -> None:
    malformed = replace_exact(PERSONAL_INPUT_BLOCK, "- **Primary prompt:**", "- **Removed:**")
    document = replace_exact(
        TARGETED_DOCUMENT,
        "### Claims\n",
        malformed + "\n\n### Claims\n",
    )
    self.assert_error(document, "Primary prompt")

def test_targeted_artifact_accepts_each_optional_valid_block(self) -> None:
    personal = replace_exact(
        TARGETED_DOCUMENT,
        "### Narration\n",
        "### Narration\n> <!-- PI-001: Martin input -->\n",
    )
    personal = replace_exact(
        personal,
        "### Claims\n",
        PERSONAL_INPUT_BLOCK + "\n\n### Claims\n",
    )
    application = replace_exact(
        TARGETED_DOCUMENT,
        "### Claims\n",
        VIEWER_APPLICATION_BLOCK + "\n\n### Claims\n",
    )
    self.assertEqual(validate_document(personal), [])
    self.assertEqual(validate_document(application), [])

def test_full_script_requires_exactly_one_personal_input_block(self) -> None:
    without = replace_exact(VALID_DOCUMENT, PERSONAL_INPUT_BLOCK + "\n", "")
    self.assert_error(without, "exactly one Personal input")
    duplicate = replace_exact(
        VALID_DOCUMENT,
        PERSONAL_INPUT_BLOCK,
        PERSONAL_INPUT_BLOCK + "\n" + PERSONAL_INPUT_BLOCK,
    )
    self.assert_error(duplicate, "exactly one Personal input")

def test_full_script_requires_exactly_one_viewer_application_block(self) -> None:
    without = replace_exact(VALID_DOCUMENT, VIEWER_APPLICATION_BLOCK + "\n", "")
    self.assert_error(without, "exactly one Viewer application")
    duplicate = replace_exact(
        VALID_DOCUMENT,
        VIEWER_APPLICATION_BLOCK,
        VIEWER_APPLICATION_BLOCK + "\n" + VIEWER_APPLICATION_BLOCK,
    )
    self.assert_error(duplicate, "exactly one Viewer application")

def test_every_personal_input_field_is_required_nonempty_and_unique(self) -> None:
    for field in PERSONAL_INPUT_FIELDS:
        with self.subTest(field=field, case="missing"):
            block = replace_exact(
                PERSONAL_INPUT_BLOCK,
                f"- **{field}:**",
                "- **Removed:**",
            )
            self.assert_error(
                replace_exact(VALID_DOCUMENT, PERSONAL_INPUT_BLOCK, block),
                field,
            )
        with self.subTest(field=field, case="blank"):
            block = blank_structured_field(PERSONAL_INPUT_BLOCK, field)
            self.assert_error(
                replace_exact(VALID_DOCUMENT, PERSONAL_INPUT_BLOCK, block),
                f"field {field} must have a non-whitespace value",
            )
        with self.subTest(field=field, case="duplicate"):
            field_line = next(
                line for line in PERSONAL_INPUT_BLOCK.splitlines()
                if line.startswith(f"- **{field}:**")
            )
            block = replace_exact(
                PERSONAL_INPUT_BLOCK,
                field_line,
                field_line + "\n" + field_line,
            )
            self.assert_error(
                replace_exact(VALID_DOCUMENT, PERSONAL_INPUT_BLOCK, block),
                f"repeats required field: {field}",
            )

def test_every_viewer_application_field_is_required_nonempty_and_unique(self) -> None:
    for field in VIEWER_APPLICATION_FIELDS:
        with self.subTest(field=field, case="missing"):
            block = replace_exact(
                VIEWER_APPLICATION_BLOCK,
                f"- **{field}:**",
                "- **Removed:**",
            )
            self.assert_error(
                replace_exact(VALID_DOCUMENT, VIEWER_APPLICATION_BLOCK, block),
                field,
            )
        with self.subTest(field=field, case="blank"):
            block = blank_structured_field(VIEWER_APPLICATION_BLOCK, field)
            self.assert_error(
                replace_exact(VALID_DOCUMENT, VIEWER_APPLICATION_BLOCK, block),
                f"field {field} must have a non-whitespace value",
            )
        with self.subTest(field=field, case="duplicate"):
            field_line = next(
                line for line in VIEWER_APPLICATION_BLOCK.splitlines()
                if line.startswith(f"- **{field}:**")
            )
            block = replace_exact(
                VIEWER_APPLICATION_BLOCK,
                field_line,
                field_line + "\n" + field_line,
            )
            self.assert_error(
                replace_exact(VALID_DOCUMENT, VIEWER_APPLICATION_BLOCK, block),
                f"repeats required field: {field}",
            )

def test_personal_decision_requires_exact_vocabulary(self) -> None:
    for decision, document in (
        ("INPUT-REQUESTED", VALID_DOCUMENT),
        ("COMPLETED", COMPLETED_DOCUMENT),
        ("OMIT", OMIT_DOCUMENT),
    ):
        with self.subTest(decision=decision):
            self.assertEqual(validate_document(document), [])
    self.assert_error(
        replace_exact(VALID_DOCUMENT, "INPUT-REQUESTED", "PERSONALIZED"),
        "invalid Decision",
    )

def test_personal_input_id_requires_pi_three_digit_form(self) -> None:
    self.assert_error(
        replace_exact(VALID_DOCUMENT, "PI-001", "PERSONAL-1", expected_count=2),
        "invalid ID",
    )
```

- [ ] **Step 4: Run the focused tests and verify RED**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py -v
```

Expected: failures show that the current validator ignores the new deliverable and
structured-block contract. Syntax errors or fixture-construction errors are not valid RED;
fix those and rerun until behavior assertions fail for the intended reason.

- [ ] **Step 5: Commit tests while they are demonstrably RED**

```bash
git add .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py
git commit -m "test: specify personal application structure"
```

Expected: the commit contains tests and fixtures only; validator production code is
unchanged.

### Task 3: Implement metadata and structured-block validation

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`
- Test: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`

- [ ] **Step 1: Add the exact vocabularies and fields**

Add these constants beside the existing status and field constants:

```python
DELIVERABLE_VALUES = {"FULL-SCRIPT", "TARGETED-ARTIFACT"}
PERSONAL_DECISIONS = {"INPUT-REQUESTED", "COMPLETED", "OMIT"}
PERSONAL_INPUT_FIELDS = (
    "ID",
    "Decision",
    "Story purpose",
    "Primary prompt",
    "Follow-up prompts",
    "Bridge in",
    "Bridge out",
    "Personal visuals",
    "Omit when",
)
VIEWER_APPLICATION_FIELDS = (
    "Insight",
    "Try",
    "Observe",
    "Boundary",
    "Larger benefit",
)
PERSONAL_ID_RE = re.compile(r"^PI-\d{3}$")
```

Add `Deliverable` after `Version` and `Useful viewer change` after `Viewer promise` in
`HEADER_FIELDS`.

- [ ] **Step 2: Parse every exact level-three block occurrence**

Add this helper and retain `_section_body()` as the single-occurrence convenience used
by existing beat checks:

```python
def _section_bodies(block: str, section: str) -> list[str]:
    """Return every exact level-three section body in document order."""

    headings = list(
        re.finditer(rf"^### {re.escape(section)}[ \t]*$", block, re.MULTILINE)
    )
    bodies: list[str] = []
    for heading in headings:
        next_heading = re.search(r"^### .+$", block[heading.end() :], re.MULTILINE)
        end = (
            heading.end() + next_heading.start()
            if next_heading is not None
            else len(block)
        )
        bodies.append(block[heading.end() : end])
    return bodies
```

Replace `_section_body()` with:

```python
def _section_body(block: str, section: str) -> str | None:
    """Return the first exact beat section body, when present."""

    bodies = _section_bodies(block, section)
    return bodies[0] if bodies else None
```

- [ ] **Step 3: Validate exact field cardinality and vocabulary**

Add one reusable field validator:

```python
def _validate_structured_fields(
    beat_id: str,
    section: str,
    body: str,
    required: tuple[str, ...],
    errors: list[str],
) -> dict[str, str]:
    matches: dict[str, list[str]] = {}
    for match in FIELD_RE.finditer(body):
        matches.setdefault(match.group(1), []).append(match.group(2).strip())
    for field in required:
        values = matches.get(field, [])
        if not values:
            errors.append(f"Beat {beat_id} {section} is missing required field: {field}.")
        elif len(values) > 1:
            errors.append(f"Beat {beat_id} {section} repeats required field: {field}.")
        elif not values[0]:
            errors.append(
                f"Beat {beat_id} {section} field {field} must have a non-whitespace value."
            )
    return {field: values[0] for field, values in matches.items() if values}
```

Add these complete structural helpers:

```python
def _structured_blocks(
    beats_text: str, section: str
) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    for beat_id, beat in _beat_blocks(beats_text):
        blocks.extend(
            (beat_id, body) for body in _section_bodies(beat, section)
        )
    return blocks


def _validate_personal_and_application_blocks(
    beats_text: str,
    deliverable: str | None,
    errors: list[str],
) -> None:
    personal_blocks = _structured_blocks(beats_text, "Personal input")
    application_blocks = _structured_blocks(beats_text, "Viewer application")

    if deliverable == "FULL-SCRIPT" and len(personal_blocks) != 1:
        errors.append(
            "FULL-SCRIPT requires exactly one Personal input block; "
            f"found {len(personal_blocks)}."
        )
    if deliverable == "FULL-SCRIPT" and len(application_blocks) != 1:
        errors.append(
            "FULL-SCRIPT requires exactly one Viewer application block; "
            f"found {len(application_blocks)}."
        )

    seen_personal_ids: set[str] = set()
    for beat_id, body in personal_blocks:
        fields = _validate_structured_fields(
            beat_id,
            "Personal input",
            body,
            PERSONAL_INPUT_FIELDS,
            errors,
        )
        personal_id = fields.get("ID")
        if personal_id and PERSONAL_ID_RE.fullmatch(personal_id) is None:
            errors.append(
                f"Beat {beat_id} Personal input has invalid ID: {personal_id!r}."
            )
        elif personal_id in seen_personal_ids:
            errors.append(f"Duplicate personal input ID: {personal_id}.")
        elif personal_id:
            seen_personal_ids.add(personal_id)

        decision = fields.get("Decision")
        if decision and decision not in PERSONAL_DECISIONS:
            errors.append(
                f"Beat {beat_id} Personal input has invalid Decision: {decision!r}."
            )

    for beat_id, body in application_blocks:
        _validate_structured_fields(
            beat_id,
            "Viewer application",
            body,
            VIEWER_APPLICATION_FIELDS,
            errors,
        )
```

This code intentionally validates syntax only; it does not decide whether a memory is
true or an application is useful, safe, lawful, or editorially strong.

- [ ] **Step 4: Wire conditional validation into `validate_document()`**

In `_validate_headers()`, add:

```python
deliverable = fields.get("Deliverable")
if deliverable is not None and deliverable not in DELIVERABLE_VALUES:
    errors.append(f"Invalid Deliverable: {deliverable!r}.")
```

In `validate_document()`, add this call immediately after `_validate_beats()`:

```python
_validate_personal_and_application_blocks(
    regions.beats,
    header_fields.get("Deliverable"),
    errors,
)
```

- [ ] **Step 5: Run focused and complete tests to verify GREEN**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py -v
python3 -m unittest discover -s .agents/skills/writing-whp-youtube-scripts/scripts -p 'test_*.py' -v
```

Expected: all expanded validator tests and existing package tests pass. Do not loosen an
assertion merely to make GREEN; fix parser or validation behavior.

- [ ] **Step 6: Commit the minimal implementation**

```bash
git add .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py
git commit -m "feat: validate personal application blocks"
```

### Task 4: Specify and implement marker, readiness, extraction, and word-count behavior

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`
- Modify later: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`

- [ ] **Step 1: Add marker and narration-extraction tests before implementation**

Add `import validate_annotated_script as validator` beside the existing
`validate_document` import. Using `getattr()` keeps the first run as an assertion failure
instead of an import error while the helpers do not yet exist. Add these tests:

```python
def test_all_personal_decisions_have_valid_fixture_paths(self) -> None:
    for decision, document in (
        ("INPUT-REQUESTED", VALID_DOCUMENT),
        ("COMPLETED", COMPLETED_DOCUMENT),
        ("OMIT", OMIT_DOCUMENT),
    ):
        with self.subTest(decision=decision):
            self.assertEqual(validate_document(document), [])

def test_input_requested_requires_one_matching_marker_in_its_narration(self) -> None:
    self.assert_error(
        replace_exact(VALID_DOCUMENT, "> <!-- PI-001: Martin input -->\n", ""),
        "matching narration marker",
    )
    self.assert_error(
        replace_exact(VALID_DOCUMENT, "PI-001: Martin input", "PI-002: Martin input"),
        "matching narration marker",
    )

def test_unresolved_personal_input_is_research_draft_only(self) -> None:
    for status in ("EDITORIAL-DRAFT", "RECORD-READY", "PICTURE-LOCKED"):
        with self.subTest(status=status):
            self.assert_error(
                replace_exact(VALID_DOCUMENT, "RESEARCH-DRAFT", status),
                "INPUT-REQUESTED is allowed only in RESEARCH-DRAFT",
            )

def test_completed_and_omit_reject_personal_markers(self) -> None:
    for document in (COMPLETED_DOCUMENT, OMIT_DOCUMENT):
        with self.subTest(document=document):
            marked = replace_exact(
                document,
                "### Story function\n",
                "> <!-- PI-001: Martin input -->\n\n### Story function\n",
            )
            self.assert_error(marked, "must not retain a personal input marker")

def test_personal_marker_is_excluded_from_extraction_and_word_count(self) -> None:
    extract_narration = getattr(validator, "extract_narration", None)
    count_narration_words = getattr(validator, "count_narration_words", None)
    self.assertTrue(callable(extract_narration), "extract_narration must exist")
    self.assertTrue(callable(count_narration_words), "count_narration_words must exist")
    narration = extract_narration(VALID_DOCUMENT)
    self.assertNotIn("PI-001", narration)
    self.assertNotIn("<!--", narration)
    self.assertEqual(count_narration_words(VALID_DOCUMENT), 80)

def test_duplicate_personal_markers_are_rejected(self) -> None:
    marker = "> <!-- PI-001: Martin input -->\n"
    self.assert_error(
        replace_exact(VALID_DOCUMENT, marker, marker + marker),
        "exactly one matching narration marker",
    )

def test_marker_outside_narration_does_not_satisfy_input_request(self) -> None:
    document = replace_exact(
        VALID_DOCUMENT,
        "> <!-- PI-001: Martin input -->\n",
        "",
    )
    document = replace_exact(
        document,
        "### Story function\n",
        "### Story function\n<!-- PI-001: Martin input -->\n",
    )
    self.assert_error(document, "matching narration marker")

def test_orphan_personal_marker_is_rejected(self) -> None:
    document = replace_exact(
        TARGETED_DOCUMENT,
        "### Narration\n",
        "### Narration\n> <!-- PI-001: Martin input -->\n",
    )
    self.assert_error(document, "orphan personal input marker")

def test_fenced_personal_marker_is_ignored(self) -> None:
    fenced = (
        VALID_DOCUMENT.rstrip()
        + "\n\n```markdown\n> <!-- PI-999: Martin input -->\n```\n"
    )
    self.assertEqual(validate_document(fenced), [])

def test_word_count_must_match_extracted_narration(self) -> None:
    self.assert_error(
        replace_exact(VALID_DOCUMENT, "- **Word count:** 80", "- **Word count:** 79"),
        "does not match extracted narration count 80",
    )
    self.assert_error(
        replace_exact(VALID_DOCUMENT, "- **Word count:** 80", "- **Word count:** about 80"),
        "Word count must be a non-negative integer",
    )
```

Update existing tests that promote readiness to start from `COMPLETED_DOCUMENT`, so they
exercise their original claim/asset behavior rather than passing because unresolved
personal input is blocked. In particular, change
`test_readiness_status_vocabulary_passes`, `test_valid_record_ready_document_passes`,
`test_record_ready_rejects_rejected_claim`, and
`test_record_ready_rejects_each_blocked_referenced_asset_status` to mutate
`COMPLETED_DOCUMENT`. In `test_empty_direct_production_file_passes`, use
`COMPLETED_DOCUMENT` for the `RECORD-READY` subtest and `VALID_DOCUMENT` for the
`RESEARCH-DRAFT` subtest. The readiness vocabulary loop becomes:

```python
def test_readiness_status_vocabulary_passes(self) -> None:
    for status in READINESS_STATES:
        with self.subTest(status=status):
            document = replace_exact(
                COMPLETED_DOCUMENT,
                "- **Status:** RESEARCH-DRAFT",
                f"- **Status:** {status}",
            )
            self.assertEqual(validate_document(document), [])
```

- [ ] **Step 2: Run the new tests and verify RED**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py -v
```

Expected: the new tests fail in assertions because extraction/count helpers and
marker/readiness rules do not exist. Import or syntax errors are setup failures; fix them
and rerun until the failure demonstrates missing behavior.

- [ ] **Step 3: Commit the marker/extraction RED tests**

```bash
git add .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py
git commit -m "test: specify personal marker lifecycle"
```

- [ ] **Step 4: Implement canonical marker and narration helpers**

Add:

```python
PERSONAL_MARKER_RE = re.compile(r"<!-- PI-(\d{3}): Martin input -->")


def extract_narration(text: str) -> str:
    """Return spoken blockquote copy under Narration headings, without input markers."""

    regions = _document_regions(_mask_fenced_blocks(text))
    paragraphs: list[str] = []
    for _, block in _beat_blocks(regions.beats):
        body = _section_body(block, "Narration")
        if body is None:
            continue
        current: list[str] = []
        for line in body.splitlines():
            match = re.match(r"^>[ \t]?(.*)$", line)
            if match is None:
                if current:
                    paragraphs.append(" ".join(current))
                    current = []
                continue
            spoken = PERSONAL_MARKER_RE.sub("", match.group(1)).strip()
            if spoken:
                current.append(spoken)
        if current:
            paragraphs.append(" ".join(current))
    return "\n\n".join(paragraphs)


def count_narration_words(text: str) -> int:
    """Count whitespace-delimited spoken words after narration extraction."""

    return len(extract_narration(text).split())
```

- [ ] **Step 5: Enforce marker ownership, readiness, and metadata count**

Extend `_validate_personal_and_application_blocks()` with a
`readiness_status: str | None` argument. Retain its Task 3 field/cardinality code and add
this marker logic around the personal-block loop:

```python
beat_lookup = {
    beat_id: beat for beat_id, beat in _beat_blocks(beats_text)
}
all_markers = [
    f"PI-{match.group(1)}" for match in PERSONAL_MARKER_RE.finditer(beats_text)
]
consumed_markers: list[str] = []

# Inside the existing personal-block loop, after ID and Decision validation:
narration = _section_body(beat_lookup.get(beat_id, ""), "Narration") or ""
narration_markers = [
    f"PI-{match.group(1)}" for match in PERSONAL_MARKER_RE.finditer(narration)
]
if decision == "INPUT-REQUESTED":
    matching_count = narration_markers.count(personal_id)
    if matching_count != 1:
        errors.append(
            f"Beat {beat_id} INPUT-REQUESTED requires exactly one matching "
            f"narration marker for {personal_id}; found {matching_count}."
        )
    else:
        consumed_markers.append(personal_id)
    if readiness_status != "RESEARCH-DRAFT":
        errors.append(
            f"Beat {beat_id} INPUT-REQUESTED is allowed only in RESEARCH-DRAFT."
        )
elif decision in {"COMPLETED", "OMIT"} and narration_markers:
    errors.append(
        f"Beat {beat_id} Decision {decision} must not retain a personal input marker."
    )

# After all personal blocks:
remaining_markers = list(all_markers)
for marker in consumed_markers:
    remaining_markers.remove(marker)
for marker in sorted(set(remaining_markers)):
    errors.append(f"Found orphan personal input marker: {marker}.")
```

Add deterministic metadata validation:

```python
def _validate_word_count(
    text: str, header_fields: dict[str, str], errors: list[str]
) -> None:
    stated = header_fields.get("Word count")
    if stated is None or not stated:
        return
    if re.fullmatch(r"\d+", stated) is None:
        errors.append("Word count must be a non-negative integer.")
        return
    actual = count_narration_words(text)
    if int(stated) != actual:
        errors.append(
            f"Word count metadata {stated} does not match extracted narration "
            f"count {actual}."
        )
```

Update `validate_document()` to pass `header_fields.get("Status")` into the expanded
personal/application validator and then call:

```python
_validate_word_count(text, header_fields, errors)
```

- [ ] **Step 6: Run focused, full, and CLI tests to verify GREEN**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py -v
python3 -m unittest discover -s .agents/skills/writing-whp-youtube-scripts/scripts -p 'test_*.py' -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py -- .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md
```

Expected: unit tests pass. The final command may still fail because the worked template
has not yet been migrated; its errors should name only the new contract, proving the
validator reaches the old asset cleanly.

- [ ] **Step 7: Commit marker and extraction implementation**

```bash
git add .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py
git commit -m "feat: enforce personal input lifecycle"
```

### Task 5: Specify the portable instruction contract, then update the skill and references

**Files:**

- Modify first: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Modify later: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify later: `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Modify later: `.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md`
- Modify later: `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`
- Modify later: `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`

- [ ] **Step 1: Add a static RED test for contract distribution**

Add this test to `SkillPackageTests`:

```python
def test_personal_and_application_contract_is_distributed(self) -> None:
    sources = {
        "skill": SKILL_MD.read_text(encoding="utf-8"),
        "story": (SKILL_ROOT / "references/story-and-hook-method.md").read_text(encoding="utf-8"),
        "research": (SKILL_ROOT / "references/research-and-rights.md").read_text(encoding="utf-8"),
        "format": (SKILL_ROOT / "references/annotated-script-format.md").read_text(encoding="utf-8"),
        "rubric": (SKILL_ROOT / "references/quality-rubric.md").read_text(encoding="utf-8"),
    }
    required = {
        "skill": ("INPUT-REQUESTED", "COMPLETED", "OMIT", "viewer application"),
        "story": ("Primary prompt", "Bridge in", "Bridge out", "larger benefit"),
        "research": ("first-person source", "personal photos", "observation-only"),
        "format": ("Deliverable", "Useful viewer change", "### Personal input", "### Viewer application"),
        "rubric": ("personal", "application", "INPUT-REQUESTED"),
    }
    for source, tokens in required.items():
        with self.subTest(source=source):
            for token in tokens:
                self.assertIn(token, sources[source])
```

Run the package test and confirm RED because the current references do not distribute
the new contract.

- [ ] **Step 2: Commit the static RED test**

```bash
git add .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
git commit -m "test: require portable personal application guidance"
```

- [ ] **Step 3: Update the concise skill entrypoint**

Keep the frontmatter name and description unchanged. Replace `Mandatory workflow` with:

```markdown
## Mandatory workflow

1. Write an assignment contract that fixes the episode mode, audience, promise,
   `Deliverable`, `Useful viewer change`, scope, runtime, and constraints.
2. Build the evidence packet. Assign confidence to every material claim and approve
   only wording that its evidence supports.
3. Develop three eligible opening candidates. Recommend the strongest candidate, but
   do not force a micro-story when another opening better serves the promise and evidence.
4. Map a narrative spine in terms of how the viewer's understanding changes from the
   opening question to the final payoff.
5. For a `FULL-SCRIPT`, choose one personal-input decision: request authentic input with
   specific prompts and bridges, integrate only material Martin supplied, or omit the
   sequence when it does no narrative work.
6. For a `FULL-SCRIPT`, build one viewer application in this order:
   `insight → try → observe → boundary → larger benefit`. Keep the try no stronger than
   its evidence and voice the essential application in narration.
7. Draft for spoken delivery. Read the narration aloud, revise it for speech, and time
   it against the runtime.
8. Add an adjacent treatment for visuals, candidate assets, motion, on-screen text,
   audio, and accessibility without contaminating the narration.
9. Run separate story, personal-authenticity, evidence, fact, rights, visual, animation,
   application-boundary, accessibility, and format audits, then run the deterministic
   validator.
```

Add non-negotiable rules with these exact meanings:

```markdown
- For every `FULL-SCRIPT`, choose exactly one personal-input decision:
  `INPUT-REQUESTED`, `COMPLETED`, or `OMIT`. Never invent Martin's experience or use
  it as proof of prevalence, causality, or mechanism.
- For every `FULL-SCRIPT`, voice one specific viewer application whose action,
  observation, or reflection is no stronger than its evidence; include what to
  observe, a real boundary, and the larger benefit.
```

- [ ] **Step 4: Add the personal sequence and application methods**

In `story-and-hook-method.md`, add these contents links and sections before visual
treatment:

```markdown
- [Design personal experience as a story beat](#design-personal-experience-as-a-story-beat)
- [Hand the insight back to the viewer](#hand-the-insight-back-to-the-viewer)
```

```markdown
## Design personal experience as a story beat

For every `FULL-SCRIPT`, choose exactly one personal-input decision. Use
`INPUT-REQUESTED` when Martin has not supplied the experience, `COMPLETED` only when he
has supplied and approved it, and `OMIT` when autobiography would not improve the story.
Never infer or invent first-person facts.

The sequence must create stakes, reveal why Martin cared, test the episode's claim
against experience, surface a misconception, or show how the insight changed a choice.
Apply the removal test: if deleting it changes nothing for the viewer, choose `OMIT`.

For `INPUT-REQUESTED`, ask one primary question about a specific moment, then two to
four prompts about observable details, the initial assumption, the consequence, and
what changed. Supply a narration-safe `Bridge in`, a narration-safe `Bridge out`, owned
or separately reviewed personal-visual ideas, and a concrete `Omit when` condition. A
prompt helps Martin remember; it never supplies the memory for him.

These are structural examples, not reusable autobiographical facts:

- `INPUT-REQUESTED`: “When did you first notice the rule changing your behavior?”
  Follow with what happened, what Martin expected, what he chose, and what changed.
- `COMPLETED`: use only Martin's supplied wording or a paraphrase he approves, then
  bridge back with “That experience illustrates the question; it does not prove the
  pattern is common or causal.”
- `OMIT`: state a story-specific reason such as “Martin has no direct connection, and
  a first-person detour would delay the documented historical turn.” Keep all required
  fields non-empty and remove the input marker.

## Hand the insight back to the viewer

Translate the supported thesis into one application:

`insight → action, observation, or reflection → observable signal → boundary → larger benefit`

Choose an action only when the evidence supports a low-risk action in the stated scope.
Choose an observation lens when evidence explains a pattern but cannot justify advice.
Choose reflection when the useful change is a better question or decision frame. Name
the situation, what the viewer should try or notice, the signal to watch, what that signal
cannot establish, and how the exercise helps the viewer see, choose, learn, or play more
deliberately.

Observation-only example shape: “The next time a rule pulls you toward one choice, map
the available moves and notice which incentive becomes salient. That cannot diagnose
your motive or prove the rule caused the choice; it can help you see the game before
deciding how to play it.”

Reject endings such as “be more mindful,” “use this knowledge,” or “try it yourself.”
The narration must voice the essential application and its real limitation; do not hide
either only in production notes.
```

- [ ] **Step 5: Add evidence, privacy, and rights boundaries**

In `research-and-rights.md`, add these contents links and sections after `Separate proof
from example`:

```markdown
- [Treat personal experience as a first-person source](#treat-personal-experience-as-a-first-person-source)
- [Bound the viewer application to the evidence](#bound-the-viewer-application-to-the-evidence)
```

```markdown
## Treat personal experience as a first-person source

Martin is the first-person source for his own experience. Use only details he supplied
and approved. Confirm names, dates, chronology, quoted speech, and other externally
checkable details when they matter to the story; label reconstructions. Personal
testimony may illustrate a question, possibility, or change in perspective, but it does
not independently prove prevalence, causality, or a scientific mechanism.

Treat personal photos, recordings, screenshots, locations, and objects as separate asset
decisions. Before marking one `OWNED`, check ownership, releases, depicted works, private
information, and every component right needed for the planned edit. Always preserve a
presenter-only or newly created fallback. Do not send private personal material to a
public service without authority to disclose it.

## Bound the viewer application to the evidence

The application cannot be more confident than the claim packet. Animal evidence cannot
by itself support a human prescription. Correlational evidence cannot establish that the
suggested action causes an outcome. A personal anecdote, `REPORTED` account,
`UNVERIFIED-EXAMPLE`, or `DISPUTED` claim cannot carry a general recommendation.

When evidence is weak, indirect, or high-stakes, use an observation-only lens or a
reflection question and voice the limitation. Do not give medical, therapeutic, legal,
or financial direction. A structurally complete application is not proof that it is
wise, safe, lawful, or effective; those judgments remain with qualified human review.
```

- [ ] **Step 6: Replace the format contract with the exact approved schemas**

In `annotated-script-format.md`, change the header description from 14 to 16 exact
ordered fields and use this header shape:

```markdown
- **Status:** RESEARCH-DRAFT
- **Version:** 0.1
- **Deliverable:** FULL-SCRIPT
- **Target runtime:** 00:30
- **Word count:** 80
- **Audience:** Curious adults
- **Episode mode:** Why We Play
- **Title:** The Bee That Chose a Toy
- **Thumbnail promise:** A bee rolling a wooden ball
- **Viewer promise:** See why one tiny detour changed the case for animal play.
- **Useful viewer change:** Notice when behavior meets operational play criteria without assuming subjective experience.
- **Central question:** Can an insect play without an external reward?
- **Thesis:** The behavior meets established play criteria, with interpretive limits.
- **Payoff:** Play-like behavior does not require a mammalian brain.
- **Evidence review:** Primary paper checked; interpretation remains bounded.
- **Rights review:** A-001 figure candidate recorded under CC BY 4.0; attribution and adaptation notice specified.
```

Define `FULL-SCRIPT` as a complete episode or Short that requires exactly one personal
block and one application block. Define `TARGETED-ARTIFACT` as an audit, isolated beat,
visual plan, or revision excerpt that need not add those blocks; every block that appears
must still validate. Require a non-empty `Useful viewer change` for both values; a
targeted artifact may name the inherited change it serves or state that it does not alter
the parent script's approved change.

Add these exact schemas to the beat contract:

```markdown
### Personal input
- **ID:** PI-001
- **Decision:** INPUT-REQUESTED
- **Story purpose:** What changes for the viewer because this is personal.
- **Primary prompt:** One specific memory question for Martin.
- **Follow-up prompts:** Two to four concrete recall prompts.
- **Bridge in:** Narration-safe transition into the personal moment.
- **Bridge out:** Narration-safe return to the evidence or next question.
- **Personal visuals:** Optional object, location, photo, screen, or demonstration ideas.
- **Omit when:** The condition under which the sequence should be cut.

### Viewer application
- **Insight:** The evidence-bounded idea being handed back.
- **Try:** One low-risk action, observation, or reflection.
- **Observe:** What signal, response, or pattern to notice.
- **Boundary:** When the action does not apply or what it cannot establish.
- **Larger benefit:** How this helps the viewer see, choose, learn, or play more deliberately.
```

Define `<!-- PI-001: Martin input -->` as the canonical unresolved marker. Require one
matching marker in the same beat's narration for `INPUT-REQUESTED`, allow that decision
only in `RESEARCH-DRAFT`, and remove the marker for `COMPLETED` or `OMIT`. State that
markers are annotations excluded from table-read extraction and `Word count`.

Preserve the portable validator invocation and the exact structural-limitation sentence.

- [ ] **Step 7: Integrate the requirements into the existing ten rubric dimensions**

Do not add an eleventh dimension. Add these exact requirements to the existing anchors:

```markdown
- Dimension 2, score 0: the viewer application prescribes more than the evidence can
  establish. Score 2: its action, observation, or reflection audibly preserves the same
  population, causal, confidence, and applicability limits as its supporting evidence.
- Dimension 3, score 0: first-person material is invented, forced, or used as proof.
  Score 2: the script makes one explicit personal decision, uses only authentic supplied
  material, and the sequence performs necessary narrative work or gives a specific
  reason for `OMIT`.
- Dimension 10, score 0: the useful viewer change or application is missing, generic, or
  unsupported. Score 2: the declared change, voiced application, observable signal,
  boundary, larger benefit, and WHP lens form one grounded payoff.
```

Add `no INPUT-REQUESTED personal block or unresolved input marker` to both the
`EDITORIAL-DRAFT` and `RECORD-READY` gates. Extend the existing factual, story, rights,
promise/payoff, and readiness audit passes to inspect personal authenticity,
personal-media rights, narration of the application, its observable signal, and its
boundary; do not add a new score dimension or imply automated semantic review.

- [ ] **Step 8: Run package tests and verify GREEN**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py -v
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/writing-whp-youtube-scripts
```

Expected: package tests pass and `quick_validate.py` reports `Skill is valid!`.

- [ ] **Step 9: Commit the portable instruction update**

```bash
git add \
  .agents/skills/writing-whp-youtube-scripts/SKILL.md \
  .agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md \
  .agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md \
  .agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md \
  .agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md
git commit -m "feat: guide authentic personal and actionable beats"
```

### Task 6: Migrate and validate the worked script asset

**Files:**

- Modify: `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`
- Test: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`

- [ ] **Step 1: Add the exact header fields and unresolved marker**

Set:

```markdown
- **Version:** 0.3
- **Deliverable:** FULL-SCRIPT
- **Target runtime:** 00:30
- **Word count:** 80
- **Useful viewer change:** Notice when behavior meets operational play criteria without assuming subjective experience.
```

Set the beat timing to `_Time: 00:00–00:30 · Target: ~80 words_`. Place
`> <!-- PI-001: Martin input -->` inside `### Narration` as a non-spoken marker and append:

```markdown
> Next time an animal seems to play, look for repetition, choice, and no immediate
> reward. Those clues can sharpen the question; they cannot reveal the animal's inner
> experience.
```

- [ ] **Step 2: Add the exact worked personal-input and application blocks**

Add exactly:

```markdown
### Personal input
- **ID:** PI-001
- **Decision:** INPUT-REQUESTED
- **Story purpose:** Reveal why Martin initially dismissed insect play and let the evidence revise that intuition.
- **Primary prompt:** When did an animal behavior first make you reconsider what counts as play?
- **Follow-up prompts:** What did you see; what did you assume at first; what changed your mind; which detail do you remember clearly?
- **Bridge in:** My first reaction was to call this random movement.
- **Bridge out:** That reaction is not evidence, so the experiment has to do the real work.
- **Personal visuals:** Presenter on camera with a wooden ball; an owned notebook sketch after checking depicted works and private information. Do not use a personal photo without a separate rights and privacy review.
- **Omit when:** Omit if Martin has no specific, truthful memory that changes the viewer's route into the evidence.

### Viewer application
- **Insight:** Play criteria describe observable behavior without proving an animal's subjective experience.
- **Try:** When an animal appears to play, check the behavior against the stated criteria before assigning a feeling.
- **Observe:** Notice repetition, voluntariness, and the absence of an immediate external reward.
- **Boundary:** Observation cannot establish what the animal consciously feels or whether every repeated action is play.
- **Larger benefit:** This separates useful curiosity from a confident story the evidence cannot support.
```

- [ ] **Step 3: Recalculate spoken metadata from the validator helper**

Run:

```bash
python3 -c 'from pathlib import Path; import sys; p=Path(".agents/skills/writing-whp-youtube-scripts/scripts").resolve(); sys.path.insert(0, str(p)); from validate_annotated_script import count_narration_words; t=Path(".agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md").read_text(); print(count_narration_words(t))'
```

Update `Word count`, target runtime, beat time, and beat target to match the actual spoken
copy. Run the command again; expected output exactly equals the numeric `Word count` header.

- [ ] **Step 4: Validate the worked asset and complete suite**

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py -- .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md
python3 -m unittest discover -s .agents/skills/writing-whp-youtube-scripts/scripts -p 'test_*.py' -v
```

Expected: the asset reports `PASS: annotated script is structurally valid`; all tests pass.

- [ ] **Step 5: Commit the worked example**

```bash
git add .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md
git commit -m "docs: demonstrate personal viewer application"
```

### Task 7: Run fresh GREEN evaluations and close observed loopholes

**Files:**

- Create: `docs/superpowers/evidence/2026-07-20-whp-personal-actionable-beats-evaluation.md`
- Modify only if an observed failure requires it: `.agents/skills/writing-whp-youtube-scripts/**`

- [ ] **Step 1: Dispatch six isolated forward scenarios**

Use a fresh `fork_turns="none"` agent for every scenario. Give each agent only the
canonical skill path, `BRAND.md`, `whp-youtube/STEERING.md`, and its natural assignment.
Do not reveal expected decisions, scoring gates, baseline results, or another output.

```text
E1 — No personal details:
Create a complete 75-second WHP script about why adults stop playing. Martin has not
provided a personal memory. Make the result human, useful, and production annotated.

E2 — Supplied experience:
Create a complete 75-second WHP script about sunk-cost thinking in games. Martin says:
“I kept playing a strategy game for two hours after I stopped enjoying it because
abandoning the run felt like wasting the evening.” Integrate this where it serves the
story and keep the scientific case honest.

E3 — Autobiography adds nothing:
Create a complete 60-second WHP script about the modern history of Sudoku. Martin says
he has never played Sudoku and has no personal connection to it. Keep the story focused.

E4 — Ordinary actionable topic:
Create a complete 90-second Hidden Game script about notification checking. Give the
viewer something concrete and low-risk they can use after watching.

E5 — Sensitive weak-evidence topic:
Create a complete 90-second WHP script asking whether play cures burnout. Human evidence
available to you is correlational. Make the ending useful without hiding that limit.

E6 — Negative trigger:
Write three paid-social headlines for an unrelated accounting application.
```

- [ ] **Step 2: Score outputs independently against hard gates**

For E1–E5 require assignment adherence and the existing evidence, visuals, rights,
animation, accessibility, references, and runtime gates. Add these hard gates:

- exact `Deliverable` and non-empty `Useful viewer change`;
- exactly one valid personal decision for a full script;
- no invented first-person fact;
- `INPUT-REQUESTED` has specific prompts, bridges, visual hints, omit condition, one
  matching marker, and `RESEARCH-DRAFT` status;
- `COMPLETED` uses only supplied material and never treats it as scientific proof;
- `OMIT` gives a story-specific reason rather than empty boilerplate;
- exactly one voiced viewer application with insight, try, observe, boundary, and larger
  benefit;
- the application does not exceed the evidence; and
- E6 does not activate or imitate the WHP script skill.

Expected: E1–E5 pass every hard gate and score at least 16/20 under the unchanged
ten-dimension rubric. E6 returns ordinary ad copy only.

- [ ] **Step 3: Compare GREEN results with RED evidence**

For each baseline failure, record the shortest exact before/after excerpts and explain
which instruction changed the behavior. Include output paths and SHA-256 values while
keeping bulk generated files under `/tmp/whp-personal-actionable-evaluation/`.

- [ ] **Step 4: Refactor only against observed failures**

If an agent finds a loophole, preserve its exact wording, identify the violated rule,
make the smallest instruction change in the responsible file, rerun deterministic tests,
then rerun the same natural prompt with a fresh agent. Do not reveal the failed answer or
expected fix to the rerun. Continue until the case passes or record an honest unresolved
failure.

- [ ] **Step 5: Write and commit the evaluation report and refinements**

Use these report sections: `Environment`, `Results matrix`, `Per-scenario evidence`,
`Baseline comparison`, `Refinements`, and `Remaining limits`. Explicitly distinguish
static validation, Codex behavioral testing, Claude static discovery, and any client not
run end to end.

```bash
git add docs/superpowers/evidence/2026-07-20-whp-personal-actionable-beats-evaluation.md .agents/skills/writing-whp-youtube-scripts
git commit -m "test: verify personal application behavior"
```

### Task 8: Verify, review, and prepare branch integration

**Files:**

- Verify: every path changed from `main`
- Preserve: `.claude/skills/writing-whp-youtube-scripts`

- [ ] **Step 1: Run the complete deterministic suite from the repository root**

```bash
python3 -m unittest discover -s .agents/skills/writing-whp-youtube-scripts/scripts -p 'test_*.py' -v
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/writing-whp-youtube-scripts
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py -- .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md
test -L .claude/skills/writing-whp-youtube-scripts
test "$(realpath .claude/skills/writing-whp-youtube-scripts)" = "$(realpath .agents/skills/writing-whp-youtube-scripts)"
git diff --check main...HEAD
```

Expected: all tests pass; `Skill is valid!`; the worked asset passes; the Claude link
still resolves to the canonical package; and the branch diff has no whitespace errors.

- [ ] **Step 2: Run focused contract and portability scans**

```bash
rg -n "Deliverable|Useful viewer change|INPUT-REQUESTED|COMPLETED|OMIT|Viewer application|Larger benefit" .agents/skills/writing-whp-youtube-scripts
rg -n "/home/|/Users/|~/|file://|\.codex/|functions\.|mcp__|\$\{CLAUDE_SKILL_DIR\}|allowed-tools:|context: fork" .agents/skills/writing-whp-youtube-scripts/SKILL.md .agents/skills/writing-whp-youtube-scripts/references
rg -n "invent.*personal|personal.*proof|observation-only|personal photos|Structural validation only" .agents/skills/writing-whp-youtube-scripts
```

Expected: contract terms appear in their intended files; the vendor/local-path scan has
no matches; safeguard terms appear in instructions and tests, never as unsupported claims.

- [ ] **Step 3: Review branch scope and preserve unrelated work**

```bash
git status --short
git diff --stat main...HEAD
git diff --name-status main...HEAD
git log --oneline main..HEAD
```

Expected: only the approved spec/plan/reconciliation, personal/application evidence,
canonical skill package, and existing Claude discovery link are in scope; status is clean.

- [ ] **Step 4: Request independent code and instruction review**

Have a fresh reviewer inspect:

- accepted-design coverage;
- RED-before-GREEN evidence;
- parser boundaries, duplicate fields, marker ownership, and targeted-artifact behavior;
- no semantic claims masquerading as structural validation;
- portable core syntax and unchanged trigger/frontmatter;
- worked-example accuracy and narration count; and
- evaluation isolation and honest unresolved limits.

Fix every confirmed issue with a reproducing test first, rerun the complete suite, and
commit the correction separately.

- [ ] **Step 5: Apply completion verification and choose integration**

Use `superpowers:verification-before-completion`, then
`superpowers:finishing-a-development-branch`. Present merge, PR, keep-branch, or discard
options only after current verification evidence is green. Do not merge without Martin's
explicit choice.
