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
