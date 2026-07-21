from __future__ import annotations

import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import validate_annotated_script as validator
from validate_annotated_script import validate_document


LIMITATION_SENTENCE = (
    "Structural validation only: this does not verify factual truth, source "
    "trustworthiness, copyright ownership, fair use, or editorial quality."
)

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

END_HEADINGS = (
    "Evidence references",
    "Visual and archival sources",
    "Unverified or disputed material",
    "Attribution copy",
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

READINESS_STATES = (
    "RESEARCH-DRAFT",
    "EDITORIAL-DRAFT",
    "RECORD-READY",
    "PICTURE-LOCKED",
)

CLAIM_STATUSES = (
    "VERIFIED",
    "CORROBORATED",
    "REPORTED",
    "UNVERIFIED-EXAMPLE",
    "DISPUTED",
    "REJECTED",
)

FIXED_ASSET_STATUSES = (
    "OWNED",
    "CC0",
    "PERMISSION-ON-FILE",
    "COMMERCIAL-LICENSE",
    "FAIR-USE-CANDIDATE-NOT-CLEARED",
    "REFERENCE-ONLY-RIGHTS-UNVERIFIED",
    "UNKNOWN-BLOCKED",
)

BLOCKED_ASSET_STATUSES = (
    "UNKNOWN-BLOCKED",
    "REFERENCE-ONLY-RIGHTS-UNVERIFIED",
    "FAIR-USE-CANDIDATE-NOT-CLEARED",
)


def replace_exact(
    text: str,
    old: str,
    new: str,
    *,
    expected_count: int = 1,
) -> str:
    actual_count = text.count(old)
    if actual_count != expected_count:
        raise AssertionError(
            f"Expected {old!r} exactly {expected_count} time(s), found {actual_count}"
        )
    return text.replace(old, new, expected_count)


def extract_exact(text: str, start: str, end: str) -> str:
    if text.count(start) != 1 or text.count(end) != 1:
        raise AssertionError(f"Expected unique boundaries {start!r} and {end!r}")
    return text[text.index(start) : text.index(end)]


def blank_markdown_field(text: str, field: str) -> str:
    pattern = re.compile(
        rf"^(?P<label>[ \t]*-[ \t]+\*\*{re.escape(field)}:\*\*)[^\n]*$",
        re.MULTILINE,
    )
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise AssertionError(
            f"Expected field {field!r} exactly once, found {len(matches)}"
        )
    match = matches[0]
    return text[: match.start()] + match.group("label") + "   " + text[match.end() :]


def blank_structured_field(block: str, field: str) -> str:
    return blank_markdown_field(block, field)


def blank_beat_section(block: str, section: str) -> str:
    heading = f"### {section}\n"
    if block.count(heading) != 1:
        raise AssertionError(
            f"Expected beat section {section!r} exactly once, found {block.count(heading)}"
        )
    body_start = block.index(heading) + len(heading)
    next_heading = block.find("\n### ", body_start)
    body_end = len(block) if next_heading == -1 else next_heading + 1
    return block[:body_start] + "   \n" + block[body_end:]


VALID_DOCUMENT = """# Why Bees Roll Balls

- **Status:** RESEARCH-DRAFT
- **Version:** 0.2
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

## Beat 01 — The detour
_Time: 00:00–00:30 · Target: ~80 words_

### Narration
> In a 2022 experiment, bumblebees had an unobstructed path to food. Some detoured
> into an object area, contacted wooden balls, and rolled them repeatedly without a
> food reward. The researchers said this met their operational play criteria. That
> does not tell us what a bee feels—but makes the detour hard to dismiss.
> <!-- PI-001: Martin input -->
> Next time an animal seems to play, look for repetition, choice, and no immediate
> reward. Those clues can sharpen the question; they cannot reveal the animal's inner
> experience.

### Story function
Turns a laboratory choice into the episode's central question without inventing a
bee's motives.

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

### Claims
- `F-001` — Ball rolling without a food reward met the study's play criteria (`VERIFIED`).

### Visual
- Use the paper's experimental-layout figure as `A-001`.
- Fallback: recreate the arena as a labeled diagram using only reported dimensions.

### Motion / edit
- Label the route overlay “schematic”; trace the unobstructed path to food, reveal the
  detour into the object area, then use repeated path pulses to show repetition.
- **Animation purpose:** Make the food path, detour, and repeated choice spatially clear
  without presenting the overlay as a recorded trajectory.

### On-screen text
- “Adapted from Galpayage Dona et al. (2022) · CC BY 4.0”

### Audio / accessibility
- Let the music pause at the detour.
- Descriptive transcript: a schematic route leaves the unobstructed food path, enters
  the object area, and pulses repeatedly as a bee contacts and rolls a ball.

### Assets
- `A-001` — Experimental-layout figure (`CC-BY-4.0`).

## References and source materials

### Evidence references

#### F-001 — Ball rolling without a food reward
- **Exact claim:** In experiment 1, bumblebees had an unobstructed path to food; some detoured into the object area, contacted and rolled wooden balls, and repeated the action without receiving a food reward for ball rolling. The authors concluded that the behavior fulfilled their operational criteria for animal play.
- **Original URL:** https://doi.org/10.1016/j.anbehav.2022.08.013
- **Source / author:** Galpayage Dona et al., Animal Behaviour 194
- **Date:** 2022-12
- **Locator:** Abstract; Methods, experiment 1; Discussion, criteria 1–5
- **Accessed:** 2026-07-20
- **Scope:** Laboratory study of Bombus terrestris; the conclusion concerns operational play criteria, not proof of subjective enjoyment.
- **Cross-checks:** No independent corroborating source located; institutional study summary: https://www.qmul.ac.uk/news/latest-news/2022/se/first-ever-study-shows-bumble-bees-play.html
- **Contradictions:** No direct contradiction located; alternative functional explanations are discussed by the paper.
- **Status:** VERIFIED
- **Caveat:** Do not turn behavioral criteria into a claim about conscious emotion.
- **Approved wording:** In a 2022 experiment, bumblebees had an unobstructed path to food; some detoured into the object area, contacted wooden balls, and rolled them repeatedly without receiving a food reward for ball rolling. The authors concluded that the behavior fulfilled their operational criteria for animal play.

### Visual and archival sources

#### A-001 — Experimental layout
- **Original asset page:** https://doi.org/10.1016/j.anbehav.2022.08.013
- **Direct production file:** https://oulurepo.oulu.fi/bitstream/handle/10024/43665/nbnfi-fe2023062057117.pdf
- **Creator / rightsholder:** Galpayage Dona et al.
- **Rights basis:** Article published open access under Creative Commons Attribution 4.0.
- **License and version:** CC BY 4.0
- **Commercial use / adaptation:** Allowed with attribution; mark adaptations.
- **Planned changes:** Crop Figure 1 and animate a separately drawn, labeled schematic route with repeated path pulses.
- **Required attribution:** Show compact creator, year, and license on screen. In the description, provide full TASL: creator, title, year, DOI, CC BY 4.0 license link, and a notice that the figure was cropped and overlaid with a labeled schematic route.
- **Intended beat:** Beat 01
- **Accessed:** 2026-07-20
- **Status:** CC-BY-4.0

### Unverified or disputed material

- None used in this excerpt.

### Attribution copy

- `A-001` — “Figure 1 adapted from Galpayage Dona et al., ‘Do bumble bees play?’ (2022), https://doi.org/10.1016/j.anbehav.2022.08.013. Licensed under CC BY 4.0: https://creativecommons.org/licenses/by/4.0/. Adapted by Why Humans Play: cropped and overlaid with a labeled schematic route.”
"""

HEADER_BLOCK = extract_exact(
    VALID_DOCUMENT,
    "- **Status:** RESEARCH-DRAFT",
    "\n## Beat 01",
)
BEAT_BLOCK = extract_exact(
    VALID_DOCUMENT,
    "## Beat 01",
    "## References and source materials",
)
EVIDENCE_RECORD = extract_exact(
    VALID_DOCUMENT,
    "#### F-001",
    "### Visual and archival sources",
)
ASSET_RECORD = extract_exact(
    VALID_DOCUMENT,
    "#### A-001",
    "### Unverified or disputed material",
)

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

SECOND_PERSONAL_INPUT_BLOCK = replace_exact(
    replace_exact(
        PERSONAL_INPUT_BLOCK,
        "- **ID:** PI-001",
        "- **ID:** PI-002",
    ),
    "- **Decision:** INPUT-REQUESTED",
    "- **Decision:** COMPLETED",
)
SECOND_BEAT = replace_exact(
    BEAT_BLOCK,
    "## Beat 01 — The detour",
    "## Beat 02 — The detour",
)
SECOND_BEAT = replace_exact(
    SECOND_BEAT,
    "_Time: 00:00–00:30 · Target: ~80 words_",
    "_Time: 00:30–01:00 · Target: ~80 words_",
)
SECOND_BEAT = replace_exact(SECOND_BEAT, PERSONAL_INPUT_BLOCK + "\n", "")
SECOND_BEAT = replace_exact(SECOND_BEAT, VIEWER_APPLICATION_BLOCK + "\n", "")
SECOND_BEAT = replace_exact(
    SECOND_BEAT,
    "> <!-- PI-001: Martin input -->\n",
    "",
)
TWO_BEAT_DOCUMENT = replace_exact(
    VALID_DOCUMENT,
    BEAT_BLOCK,
    BEAT_BLOCK + SECOND_BEAT,
)
TWO_BEAT_DOCUMENT = replace_exact(
    TWO_BEAT_DOCUMENT,
    "- **Target runtime:** 00:30",
    "- **Target runtime:** 01:00",
)
TWO_BEAT_DOCUMENT = replace_exact(
    TWO_BEAT_DOCUMENT,
    "- **Word count:** 80",
    "- **Word count:** 160",
)


class ValidatorTests(unittest.TestCase):
    def assert_error(self, text: str, fragment: str) -> None:
        errors = validate_document(text)
        self.assertTrue(
            any(fragment in error for error in errors),
            f"Expected {fragment!r} in {errors!r}",
        )

    def run_cli(self, path: Path, cwd: Path) -> subprocess.CompletedProcess[str]:
        self.assertNotEqual(cwd.resolve(), SCRIPT_DIR.resolve())
        return subprocess.run(
            [sys.executable, str(SCRIPT_DIR / "validate_annotated_script.py"), str(path)],
            cwd=cwd,
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )

    def assert_cli_result(
        self,
        result: subprocess.CompletedProcess[str],
        returncode: int,
    ) -> None:
        self.assertEqual(result.returncode, returncode, result.stderr)
        self.assertIn(LIMITATION_SENTENCE, result.stdout)

    def test_fixture_narration_count_matches_metadata(self) -> None:
        narration = extract_exact(BEAT_BLOCK, "### Narration\n", "\n### Story function")
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

    def test_valid_research_draft_passes(self) -> None:
        self.assertEqual(validate_document(VALID_DOCUMENT), [])

    def test_full_script_contract_is_document_wide_across_beats(self) -> None:
        self.assertEqual(validate_document(TWO_BEAT_DOCUMENT), [])

    def test_deliverable_requires_exact_vocabulary(self) -> None:
        for value in ("", "SCRIPT", "FULL SCRIPT"):
            with self.subTest(value=value):
                document = replace_exact(
                    VALID_DOCUMENT,
                    "- **Deliverable:** FULL-SCRIPT",
                    f"- **Deliverable:** {value}",
                )
                self.assert_error(document, "Deliverable")

    def test_targeted_artifact_does_not_require_personal_or_application_blocks(
        self,
    ) -> None:
        self.assertEqual(validate_document(TARGETED_DOCUMENT), [])

    def test_targeted_artifact_validates_a_personal_block_that_appears(self) -> None:
        malformed = replace_exact(
            PERSONAL_INPUT_BLOCK,
            "- **Primary prompt:**",
            "- **Removed:**",
        )
        document = replace_exact(
            TARGETED_DOCUMENT,
            "### Claims\n",
            malformed + "\n\n### Claims\n",
        )
        self.assert_error(document, "Primary prompt")

    def test_targeted_artifact_validates_an_application_block_that_appears(self) -> None:
        malformed = replace_exact(
            VIEWER_APPLICATION_BLOCK,
            "- **Try:**",
            "- **Removed:**",
        )
        document = replace_exact(
            TARGETED_DOCUMENT,
            "### Claims\n",
            malformed + "\n\n### Claims\n",
        )
        self.assert_error(document, "Try")

    def test_targeted_artifact_accepts_each_optional_block_combination(self) -> None:
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
        both = replace_exact(
            personal,
            "### Claims\n",
            VIEWER_APPLICATION_BLOCK + "\n\n### Claims\n",
        )
        for blocks, document in (
            ("personal", personal),
            ("application", application),
            ("personal-and-application", both),
        ):
            with self.subTest(blocks=blocks):
                self.assertEqual(validate_document(document), [])

    def test_full_script_requires_exactly_one_personal_input_block(self) -> None:
        without = replace_exact(VALID_DOCUMENT, PERSONAL_INPUT_BLOCK + "\n", "")
        duplicate = replace_exact(
            VALID_DOCUMENT,
            PERSONAL_INPUT_BLOCK,
            PERSONAL_INPUT_BLOCK + "\n" + PERSONAL_INPUT_BLOCK,
        )
        for case, document in (("missing", without), ("duplicate", duplicate)):
            with self.subTest(case=case):
                self.assert_error(document, "exactly one Personal input")

    def test_full_script_requires_exactly_one_viewer_application_block(self) -> None:
        without = replace_exact(VALID_DOCUMENT, VIEWER_APPLICATION_BLOCK + "\n", "")
        duplicate = replace_exact(
            VALID_DOCUMENT,
            VIEWER_APPLICATION_BLOCK,
            VIEWER_APPLICATION_BLOCK + "\n" + VIEWER_APPLICATION_BLOCK,
        )
        for case, document in (("missing", without), ("duplicate", duplicate)):
            with self.subTest(case=case):
                self.assert_error(document, "exactly one Viewer application")

    def test_full_script_rejects_a_personal_input_duplicate_across_beats(self) -> None:
        second_beat = replace_exact(
            SECOND_BEAT,
            "### Claims\n",
            SECOND_PERSONAL_INPUT_BLOCK + "\n\n### Claims\n",
        )
        document = replace_exact(TWO_BEAT_DOCUMENT, SECOND_BEAT, second_beat)
        self.assert_error(document, "exactly one Personal input")

    def test_full_script_rejects_an_application_duplicate_across_beats(self) -> None:
        second_beat = replace_exact(
            SECOND_BEAT,
            "### Claims\n",
            VIEWER_APPLICATION_BLOCK + "\n\n### Claims\n",
        )
        document = replace_exact(TWO_BEAT_DOCUMENT, SECOND_BEAT, second_beat)
        self.assert_error(document, "exactly one Viewer application")

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
                    line
                    for line in PERSONAL_INPUT_BLOCK.splitlines()
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

    def test_every_viewer_application_field_is_required_nonempty_and_unique(
        self,
    ) -> None:
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
                    line
                    for line in VIEWER_APPLICATION_BLOCK.splitlines()
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

    def test_all_personal_decisions_have_valid_fixture_paths(self) -> None:
        for decision, document in (
            ("INPUT-REQUESTED", VALID_DOCUMENT),
            ("COMPLETED", COMPLETED_DOCUMENT),
            ("OMIT", OMIT_DOCUMENT),
        ):
            with self.subTest(decision=decision):
                self.assertEqual(validate_document(document), [])

    def test_input_requested_requires_one_matching_marker_in_its_narration(
        self,
    ) -> None:
        self.assert_error(
            replace_exact(VALID_DOCUMENT, "> <!-- PI-001: Martin input -->\n", ""),
            "matching narration marker",
        )
        self.assert_error(
            replace_exact(
                VALID_DOCUMENT,
                "PI-001: Martin input",
                "PI-002: Martin input",
            ),
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
                self.assert_error(
                    marked,
                    "must not retain a personal input marker",
                )

    def test_personal_marker_is_excluded_from_extraction_and_word_count(
        self,
    ) -> None:
        extract_narration = getattr(validator, "extract_narration", None)
        count_narration_words = getattr(validator, "count_narration_words", None)
        self.assertTrue(callable(extract_narration), "extract_narration must exist")
        self.assertTrue(
            callable(count_narration_words),
            "count_narration_words must exist",
        )
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
            replace_exact(
                VALID_DOCUMENT,
                "- **Word count:** 80",
                "- **Word count:** 79",
            ),
            "does not match extracted narration count 80",
        )
        self.assert_error(
            replace_exact(
                VALID_DOCUMENT,
                "- **Word count:** 80",
                "- **Word count:** about 80",
            ),
            "Word count must be a non-negative integer",
        )

    def test_personal_input_id_requires_pi_three_digit_form(self) -> None:
        self.assertEqual(validate_document(COMPLETED_DOCUMENT), [])
        for invalid_id in (
            "PI-01",
            "PI-0001",
            "pi-001",
            "PI-001-extra",
            "PERSONAL-1",
        ):
            with self.subTest(invalid_id=invalid_id):
                document = replace_exact(
                    COMPLETED_DOCUMENT,
                    "- **ID:** PI-001",
                    f"- **ID:** {invalid_id}",
                )
                self.assert_error(document, "invalid ID")

    def test_all_required_header_fields_are_reported(self) -> None:
        for field in HEADER_FIELDS:
            with self.subTest(field=field):
                header = replace_exact(
                    HEADER_BLOCK,
                    f"- **{field}:**",
                    "- **Removed:**",
                )
                self.assert_error(
                    replace_exact(VALID_DOCUMENT, HEADER_BLOCK, header),
                    field,
                )

    def test_all_required_header_fields_reject_whitespace_only_values(self) -> None:
        for readiness in ("RESEARCH-DRAFT", "RECORD-READY"):
            for field in HEADER_FIELDS:
                with self.subTest(readiness=readiness, field=field):
                    header = replace_exact(
                        HEADER_BLOCK,
                        "- **Status:** RESEARCH-DRAFT",
                        f"- **Status:** {readiness}",
                    )
                    document = replace_exact(VALID_DOCUMENT, HEADER_BLOCK, header)
                    self.assert_error(
                        replace_exact(
                            document, header, blank_markdown_field(header, field)
                        ),
                        f"header field {field} must have a non-whitespace value",
                    )

    def test_duplicate_beat_id_is_reported_from_complete_beats(self) -> None:
        duplicate = replace_exact(
            VALID_DOCUMENT,
            BEAT_BLOCK,
            BEAT_BLOCK + BEAT_BLOCK,
        )
        self.assert_error(duplicate, "Duplicate beat ID")

    def test_beat_ids_must_be_ascending(self) -> None:
        beat_02 = replace_exact(BEAT_BLOCK, "## Beat 01", "## Beat 02")
        out_of_order = replace_exact(
            VALID_DOCUMENT,
            BEAT_BLOCK,
            beat_02 + BEAT_BLOCK,
        )
        self.assert_error(out_of_order, "ascending")

    def test_complete_beat_after_references_is_reported(self) -> None:
        trailing_beat = replace_exact(BEAT_BLOCK, "## Beat 01", "## Beat 02")
        trailing_beat = replace_exact(trailing_beat, "`F-001`", "`F-999`")
        trailing_beat = replace_exact(
            trailing_beat,
            "`A-001`",
            "`A-999`",
            expected_count=2,
        )
        self.assert_error(
            VALID_DOCUMENT.rstrip() + "\n\n" + trailing_beat,
            "after the references heading",
        )

    def test_beat_id_requires_a_boundary_after_two_digits(self) -> None:
        for malformed_heading in (
            "## Beat 010 — The detour",
            "## Beat 01junk — The detour",
        ):
            with self.subTest(heading=malformed_heading):
                malformed_beat = replace_exact(
                    BEAT_BLOCK,
                    "## Beat 01 — The detour",
                    malformed_heading,
                )
                document = replace_exact(
                    VALID_DOCUMENT,
                    BEAT_BLOCK,
                    BEAT_BLOCK + malformed_beat,
                )
                self.assert_error(document, "Malformed beat heading")

    def test_all_required_beat_sections_are_reported(self) -> None:
        for section in BEAT_SECTIONS:
            with self.subTest(section=section):
                beat = replace_exact(
                    BEAT_BLOCK,
                    f"### {section}\n",
                    f"### Removed {section}\n",
                )
                self.assert_error(
                    replace_exact(VALID_DOCUMENT, BEAT_BLOCK, beat),
                    section,
                )

    def test_all_required_beat_sections_reject_whitespace_only_bodies(self) -> None:
        for readiness in ("RESEARCH-DRAFT", "RECORD-READY"):
            for section in BEAT_SECTIONS:
                with self.subTest(readiness=readiness, section=section):
                    document = replace_exact(
                        VALID_DOCUMENT,
                        "- **Status:** RESEARCH-DRAFT",
                        f"- **Status:** {readiness}",
                    )
                    beat = blank_beat_section(BEAT_BLOCK, section)
                    document = replace_exact(document, BEAT_BLOCK, beat)
                    self.assert_error(
                        document,
                        f"Beat 01 section {section} must have non-whitespace content",
                    )

    def test_all_required_end_headings_are_reported(self) -> None:
        for heading in END_HEADINGS:
            with self.subTest(heading=heading):
                self.assert_error(
                    replace_exact(
                        VALID_DOCUMENT,
                        f"### {heading}\n",
                        f"### Removed {heading}\n",
                    ),
                    heading,
                )

    def test_required_end_headings_must_appear_in_exact_order(self) -> None:
        document = replace_exact(
            VALID_DOCUMENT,
            "### Unverified or disputed material",
            "### Temporary ledger heading",
        )
        document = replace_exact(
            document,
            "### Attribution copy",
            "### Unverified or disputed material",
        )
        document = replace_exact(
            document,
            "### Temporary ledger heading",
            "### Attribution copy",
        )
        self.assert_error(document, "exact order")

    def test_evidence_and_asset_records_must_use_their_exact_ledgers(self) -> None:
        document = replace_exact(VALID_DOCUMENT, EVIDENCE_RECORD, "__EVIDENCE__")
        document = replace_exact(document, ASSET_RECORD, EVIDENCE_RECORD)
        document = replace_exact(document, "__EVIDENCE__", ASSET_RECORD)
        errors = validate_document(document)
        self.assertTrue(
            any(
                "Record F-001 must be under Evidence references" in error
                for error in errors
            ),
            errors,
        )
        self.assertTrue(
            any(
                "Record A-001 must be under Visual and archival sources" in error
                for error in errors
            ),
            errors,
        )

    def test_fenced_fields_and_headings_do_not_satisfy_requirements(self) -> None:
        for fence in ("```", "~~~"):
            with self.subTest(fence=fence):
                document = replace_exact(
                    VALID_DOCUMENT,
                    "- **Version:** 0.2",
                    "- **Removed:** 0.2",
                )
                document = replace_exact(
                    document,
                    "### Story function\n",
                    "### Removed Story function\n",
                )
                document = replace_exact(
                    document,
                    "\n## Beat 01 — The detour",
                    f"\n{fence}markdown\n- **Version:** 0.2\n{fence}\n\n"
                    "## Beat 01 — The detour",
                )
                document = replace_exact(
                    document,
                    "_Time: 00:00–00:30 · Target: ~80 words_\n\n### Narration",
                    "_Time: 00:00–00:30 · Target: ~80 words_\n\n"
                    f"{fence}markdown\n### Story function\n{fence}\n\n"
                    "### Narration",
                )
                errors = validate_document(document)
                self.assertTrue(any("Version" in error for error in errors), errors)
                self.assertTrue(
                    any("Story function" in error for error in errors), errors
                )

    def test_fenced_beats_and_records_do_not_create_structural_errors(self) -> None:
        for fence in ("```", "~~~"):
            with self.subTest(fence=fence):
                fenced_example = (
                    f"\n{fence}markdown\n"
                    "## Beat 00 — Example only\n"
                    "#### F-999 — Example evidence\n"
                    "#### A-999 — Example asset\n"
                    f"{fence}\n"
                )
                self.assertEqual(
                    validate_document(VALID_DOCUMENT.rstrip() + fenced_example),
                    [],
                )

    def test_motion_requires_explanatory_purpose_or_explicit_none(self) -> None:
        self.assert_error(
            replace_exact(
                VALID_DOCUMENT,
                "- **Animation purpose:** Make the food path, detour, and repeated choice "
                "spatially clear\n"
                "  without presenting the overlay as a recorded trajectory.",
                "- Add a cool zoom.",
            ),
            "animation purpose",
        )

    def test_explicit_no_animation_path_passes(self) -> None:
        without_animation = replace_exact(
            VALID_DOCUMENT,
            "- Label the route overlay “schematic”; trace the unobstructed path to food, "
            "reveal the\n"
            "  detour into the object area, then use repeated path pulses to show "
            "repetition.\n"
            "- **Animation purpose:** Make the food path, detour, and repeated choice "
            "spatially clear\n"
            "  without presenting the overlay as a recorded trajectory.",
            "- No animation — a still frame preserves the spatial comparison.",
        )
        self.assertEqual(validate_document(without_animation), [])

    def test_missing_referenced_records_are_reported(self) -> None:
        for record_id, record in (
            ("F-001", EVIDENCE_RECORD),
            ("A-001", ASSET_RECORD),
        ):
            with self.subTest(record_id=record_id):
                self.assert_error(
                    replace_exact(VALID_DOCUMENT, record, ""),
                    record_id,
                )

    def test_duplicate_records_are_reported(self) -> None:
        for record_id, record in (
            ("F-001", EVIDENCE_RECORD),
            ("A-001", ASSET_RECORD),
        ):
            with self.subTest(record_id=record_id):
                self.assert_error(
                    replace_exact(VALID_DOCUMENT, record, record + record),
                    record_id,
                )

    def test_orphan_records_are_reported(self) -> None:
        for record, heading, orphan_heading, record_id in (
            (EVIDENCE_RECORD, "#### F-001", "#### F-999", "F-999"),
            (ASSET_RECORD, "#### A-001", "#### A-999", "A-999"),
        ):
            with self.subTest(record_id=record_id):
                orphan = replace_exact(record, heading, orphan_heading)
                self.assert_error(
                    replace_exact(VALID_DOCUMENT, record, record + orphan),
                    record_id,
                )

    def test_all_required_evidence_fields_are_reported(self) -> None:
        for field in EVIDENCE_FIELDS:
            with self.subTest(field=field):
                record = replace_exact(
                    EVIDENCE_RECORD,
                    f"- **{field}:**",
                    "- **Removed:**",
                )
                self.assert_error(
                    replace_exact(VALID_DOCUMENT, EVIDENCE_RECORD, record),
                    field,
                )

    def test_required_evidence_fields_reject_whitespace_only_values(self) -> None:
        for readiness in ("RESEARCH-DRAFT", "RECORD-READY"):
            for field in EVIDENCE_FIELDS:
                with self.subTest(readiness=readiness, field=field):
                    document = replace_exact(
                        VALID_DOCUMENT,
                        "- **Status:** RESEARCH-DRAFT",
                        f"- **Status:** {readiness}",
                    )
                    record = blank_markdown_field(EVIDENCE_RECORD, field)
                    document = replace_exact(document, EVIDENCE_RECORD, record)
                    self.assert_error(
                        document,
                        f"Record F-001 field {field} must have a non-whitespace value",
                    )

    def test_all_required_asset_fields_are_reported(self) -> None:
        for field in ASSET_FIELDS:
            with self.subTest(field=field):
                record = replace_exact(
                    ASSET_RECORD,
                    f"- **{field}:**",
                    "- **Removed:**",
                )
                self.assert_error(
                    replace_exact(VALID_DOCUMENT, ASSET_RECORD, record),
                    field,
                )

    def test_required_asset_fields_reject_whitespace_only_values(self) -> None:
        required_values = tuple(
            field for field in ASSET_FIELDS if field != "Direct production file"
        )
        for readiness in ("RESEARCH-DRAFT", "RECORD-READY"):
            for field in required_values:
                with self.subTest(readiness=readiness, field=field):
                    document = replace_exact(
                        VALID_DOCUMENT,
                        "- **Status:** RESEARCH-DRAFT",
                        f"- **Status:** {readiness}",
                    )
                    record = blank_markdown_field(ASSET_RECORD, field)
                    document = replace_exact(document, ASSET_RECORD, record)
                    self.assert_error(
                        document,
                        f"Record A-001 field {field} must have a non-whitespace value",
                    )

    def test_source_url_fields_require_web_urls(self) -> None:
        cases = (
            (
                EVIDENCE_RECORD,
                "https://doi.org/10.1016/j.anbehav.2022.08.013",
                "doi:10.1016/j.anbehav.2022.08.013",
                "Original URL",
            ),
            (
                ASSET_RECORD,
                "- **Original asset page:** https://doi.org/10.1016/j.anbehav.2022.08.013",
                "- **Original asset page:** doi:10.1016/j.anbehav.2022.08.013",
                "Original asset page",
            ),
            (
                ASSET_RECORD,
                "- **Direct production file:** https://oulurepo.oulu.fi/bitstream/handle/10024/43665/nbnfi-fe2023062057117.pdf",
                "- **Direct production file:** file:///tmp/figure.pdf",
                "Direct production file",
            ),
        )
        for record, old, new, field in cases:
            with self.subTest(field=field):
                mutated_record = replace_exact(record, old, new)
                self.assert_error(
                    replace_exact(VALID_DOCUMENT, record, mutated_record),
                    "http:// or https://",
                )

    def test_empty_direct_production_file_passes(self) -> None:
        for readiness in ("RESEARCH-DRAFT", "RECORD-READY"):
            with self.subTest(readiness=readiness):
                base_document = (
                    COMPLETED_DOCUMENT
                    if readiness == "RECORD-READY"
                    else VALID_DOCUMENT
                )
                document = replace_exact(
                    base_document,
                    "- **Status:** RESEARCH-DRAFT",
                    f"- **Status:** {readiness}",
                )
                record = blank_markdown_field(ASSET_RECORD, "Direct production file")
                self.assertEqual(
                    validate_document(replace_exact(document, ASSET_RECORD, record)),
                    [],
                )

    def test_readiness_status_vocabulary_passes(self) -> None:
        for status in READINESS_STATES:
            with self.subTest(status=status):
                document = replace_exact(
                    COMPLETED_DOCUMENT,
                    "- **Status:** RESEARCH-DRAFT",
                    f"- **Status:** {status}",
                )
                self.assertEqual(validate_document(document), [])

    def test_invalid_readiness_status_is_reported(self) -> None:
        self.assert_error(
            replace_exact(
                VALID_DOCUMENT,
                "- **Status:** RESEARCH-DRAFT",
                "- **Status:** DRAFTISH",
            ),
            "DRAFTISH",
        )

    def test_claim_status_vocabulary_passes(self) -> None:
        for status in CLAIM_STATUSES:
            with self.subTest(status=status):
                record = replace_exact(
                    EVIDENCE_RECORD,
                    "- **Status:** VERIFIED",
                    f"- **Status:** {status}",
                )
                self.assertEqual(
                    validate_document(
                        replace_exact(VALID_DOCUMENT, EVIDENCE_RECORD, record)
                    ),
                    [],
                )

    def test_invalid_claim_status_is_reported(self) -> None:
        record = replace_exact(
            EVIDENCE_RECORD,
            "- **Status:** VERIFIED",
            "- **Status:** PROBABLY",
        )
        self.assert_error(
            replace_exact(VALID_DOCUMENT, EVIDENCE_RECORD, record),
            "PROBABLY",
        )

    def test_fixed_asset_status_vocabulary_passes(self) -> None:
        for status in FIXED_ASSET_STATUSES:
            with self.subTest(status=status):
                record = replace_exact(
                    ASSET_RECORD,
                    "- **Status:** CC-BY-4.0",
                    f"- **Status:** {status}",
                )
                self.assertEqual(
                    validate_document(replace_exact(VALID_DOCUMENT, ASSET_RECORD, record)),
                    [],
                )

    def test_versioned_cc_asset_statuses_pass(self) -> None:
        for status in ("CC-BY-4.0", "CC-BY-SA-3.0"):
            with self.subTest(status=status):
                record = replace_exact(
                    ASSET_RECORD,
                    "- **Status:** CC-BY-4.0",
                    f"- **Status:** {status}",
                )
                self.assertEqual(
                    validate_document(replace_exact(VALID_DOCUMENT, ASSET_RECORD, record)),
                    [],
                )

    def test_public_domain_with_basis_and_jurisdiction_passes(self) -> None:
        record = replace_exact(
            ASSET_RECORD,
            "- **Rights basis:** Article published open access under Creative Commons Attribution 4.0.",
            "- **Rights basis:** U.S. federal government work; jurisdiction: United States.",
        )
        record = replace_exact(
            record,
            "- **License and version:** CC BY 4.0",
            "- **License and version:** Public domain in the United States",
        )
        record = replace_exact(
            record,
            "- **Status:** CC-BY-4.0",
            "- **Status:** PUBLIC-DOMAIN",
        )
        self.assertEqual(
            validate_document(replace_exact(VALID_DOCUMENT, ASSET_RECORD, record)),
            [],
        )

    def test_public_domain_accepts_jurisdiction_before_basis(self) -> None:
        for rights_basis in (
            "Jurisdiction: United States; basis: U.S. federal government work.",
            "The basis is a U.S. federal government work under United States jurisdiction.",
        ):
            with self.subTest(rights_basis=rights_basis):
                record = replace_exact(
                    ASSET_RECORD,
                    "- **Rights basis:** Article published open access under Creative Commons Attribution 4.0.",
                    f"- **Rights basis:** {rights_basis}",
                )
                record = replace_exact(
                    record,
                    "- **License and version:** CC BY 4.0",
                    "- **License and version:** Public domain in the United States",
                )
                record = replace_exact(
                    record,
                    "- **Status:** CC-BY-4.0",
                    "- **Status:** PUBLIC-DOMAIN",
                )
                self.assertEqual(
                    validate_document(
                        replace_exact(VALID_DOCUMENT, ASSET_RECORD, record)
                    ),
                    [],
                )

    def test_public_domain_without_basis_or_jurisdiction_is_reported(self) -> None:
        for rights_basis in (
            "Believed to be in the public domain.",
            "Jurisdiction: United States.",
        ):
            with self.subTest(rights_basis=rights_basis):
                record = replace_exact(
                    ASSET_RECORD,
                    "- **Rights basis:** Article published open access under Creative Commons Attribution 4.0.",
                    f"- **Rights basis:** {rights_basis}",
                )
                record = replace_exact(
                    record,
                    "- **Status:** CC-BY-4.0",
                    "- **Status:** PUBLIC-DOMAIN",
                )
                self.assert_error(
                    replace_exact(VALID_DOCUMENT, ASSET_RECORD, record),
                    "PUBLIC-DOMAIN",
                )

    def test_invalid_asset_statuses_are_reported(self) -> None:
        for status in ("CC-BY", "PROBABLY"):
            with self.subTest(status=status):
                record = replace_exact(
                    ASSET_RECORD,
                    "- **Status:** CC-BY-4.0",
                    f"- **Status:** {status}",
                )
                self.assert_error(
                    replace_exact(VALID_DOCUMENT, ASSET_RECORD, record),
                    status,
                )

    def test_valid_record_ready_document_passes(self) -> None:
        ready = replace_exact(
            COMPLETED_DOCUMENT,
            "- **Status:** RESEARCH-DRAFT",
            "- **Status:** RECORD-READY",
        )
        self.assertEqual(validate_document(ready), [])

    def test_record_ready_rejects_rejected_claim(self) -> None:
        record = replace_exact(
            EVIDENCE_RECORD,
            "- **Status:** VERIFIED",
            "- **Status:** REJECTED",
        )
        ready = replace_exact(COMPLETED_DOCUMENT, EVIDENCE_RECORD, record)
        ready = replace_exact(
            ready,
            "- **Status:** RESEARCH-DRAFT",
            "- **Status:** RECORD-READY",
        )
        self.assert_error(ready, "RECORD-READY")

    def test_record_ready_rejects_each_blocked_referenced_asset_status(self) -> None:
        for status in BLOCKED_ASSET_STATUSES:
            with self.subTest(status=status):
                record = replace_exact(
                    ASSET_RECORD,
                    "- **Status:** CC-BY-4.0",
                    f"- **Status:** {status}",
                )
                ready = replace_exact(COMPLETED_DOCUMENT, ASSET_RECORD, record)
                ready = replace_exact(
                    ready,
                    "- **Status:** RESEARCH-DRAFT",
                    "- **Status:** RECORD-READY",
                )
                self.assert_error(ready, "RECORD-READY")

    def test_cli_valid_file_returns_0_and_states_limits(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            cwd = Path(directory)
            path = cwd / "valid.md"
            path.write_text(VALID_DOCUMENT, encoding="utf-8")
            result = self.run_cli(path, cwd)
        self.assert_cli_result(result, 0)

    def test_cli_structurally_invalid_file_returns_1_and_states_limits(self) -> None:
        invalid = replace_exact(
            VALID_DOCUMENT,
            "- **Viewer promise:**",
            "- **Removed:**",
        )
        with tempfile.TemporaryDirectory() as directory:
            cwd = Path(directory)
            path = cwd / "invalid.md"
            path.write_text(invalid, encoding="utf-8")
            result = self.run_cli(path, cwd)
        self.assert_cli_result(result, 1)

    def test_cli_nonexistent_or_unreadable_input_returns_2_and_states_limits(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            cwd = Path(directory)
            missing = cwd / "missing.md"
            unreadable = cwd / "directory-input"
            unreadable.mkdir()
            for path in (missing, unreadable):
                with self.subTest(path=path.name):
                    result = self.run_cli(path, cwd)
                    self.assert_cli_result(result, 2)


if __name__ == "__main__":
    unittest.main()
