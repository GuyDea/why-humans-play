from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from validate_annotated_script import validate_document


LIMITATION_SENTENCE = (
    "Structural validation only: this does not verify factual truth, source "
    "trustworthiness, copyright ownership, fair use, or editorial quality."
)

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


VALID_DOCUMENT = """# Why Bees Roll Balls

- **Status:** RESEARCH-DRAFT
- **Version:** 0.1
- **Target runtime:** 00:20
- **Word count:** 52
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
_Time: 00:00–00:20 · Target: ~52 words_

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
            if line.startswith("> ")
            for word in line.removeprefix("> ").split()
        ]
        self.assertEqual(len(words), 52)
        self.assertIn("- **Target runtime:** 00:20", HEADER_BLOCK)
        self.assertIn("- **Word count:** 52", HEADER_BLOCK)
        self.assertIn("_Time: 00:00–00:20 · Target: ~52 words_", BEAT_BLOCK)

    def test_valid_research_draft_passes(self) -> None:
        self.assertEqual(validate_document(VALID_DOCUMENT), [])

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

    def test_motion_requires_explanatory_purpose_or_explicit_none(self) -> None:
        self.assert_error(
            replace_exact(
                VALID_DOCUMENT,
                "- **Animation purpose:** Make the unnecessary detour and repeated choice spatially clear.",
                "- Add a cool zoom.",
            ),
            "animation purpose",
        )

    def test_explicit_no_animation_path_passes(self) -> None:
        without_animation = replace_exact(
            VALID_DOCUMENT,
            "- Trace the direct route to food, then reveal the bee's detour toward the balls.\n"
            "- **Animation purpose:** Make the unnecessary detour and repeated choice spatially clear.",
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
        record = replace_exact(
            ASSET_RECORD,
            "- **Direct production file:** https://oulurepo.oulu.fi/bitstream/handle/10024/43665/nbnfi-fe2023062057117.pdf",
            "- **Direct production file:**",
        )
        self.assertEqual(
            validate_document(replace_exact(VALID_DOCUMENT, ASSET_RECORD, record)),
            [],
        )

    def test_readiness_status_vocabulary_passes(self) -> None:
        for status in READINESS_STATES:
            with self.subTest(status=status):
                document = replace_exact(
                    VALID_DOCUMENT,
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

    def test_public_domain_without_jurisdiction_is_reported(self) -> None:
        record = replace_exact(
            ASSET_RECORD,
            "- **Rights basis:** Article published open access under Creative Commons Attribution 4.0.",
            "- **Rights basis:** Believed to be in the public domain.",
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
            VALID_DOCUMENT,
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
        ready = replace_exact(VALID_DOCUMENT, EVIDENCE_RECORD, record)
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
                ready = replace_exact(VALID_DOCUMENT, ASSET_RECORD, record)
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
