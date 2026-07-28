from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from validate_script_pair import (
    EVIDENCE_RE,
    _has_raw_citation,
    _has_nested_block_structure,
    resolve_pair,
    validate_pair,
)


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

DRIFT_ERROR = "extended narration does not exactly match raw"


class ScriptPairTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def make_pair(
        self,
        raw: str = RAW,
        extended: str = EXTENDED,
        *,
        stage: str = "blueprint",
    ) -> Path:
        stage_dir = (
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep001-example"
            / stage
        )
        stage_dir.mkdir(parents=True, exist_ok=True)
        (stage_dir / "script.raw.md").write_text(raw, encoding="utf-8")
        (stage_dir / "script.extended.md").write_text(
            extended,
            encoding="utf-8",
        )
        return stage_dir

    def run_cli(
        self,
        target: Path,
        *flags: str,
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT_DIR / "validate_script_pair.py"),
                *flags,
                str(target),
            ],
            cwd=self.tempdir.name,
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )

    def make_symlink(
        self,
        link: Path,
        target: Path,
        *,
        target_is_directory: bool = False,
    ) -> None:
        try:
            link.symlink_to(target, target_is_directory=target_is_directory)
        except (NotImplementedError, OSError) as exc:
            self.skipTest(f"symlink creation is unavailable: {exc}")

    def validation_errors(
        self,
        *,
        raw: str = RAW,
        extended: str = EXTENDED,
    ) -> list[str]:
        stage_dir = self.make_pair(raw=raw, extended=extended)
        return validate_pair(resolve_pair(stage_dir))

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
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "episode-1-example"
            / "blueprint",
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep001-example"
            / "predraft",
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep001-example"
            / "blueprint"
            / "other.md",
        )
        for target in invalid:
            with self.subTest(target=target):
                with self.assertRaises(ValueError):
                    resolve_pair(target)

    def test_reports_either_missing_pair_half(self) -> None:
        stage_dir = self.make_pair()
        contents = {
            "script.raw.md": RAW,
            "script.extended.md": EXTENDED,
        }
        for filename in contents:
            with self.subTest(filename=filename):
                path = stage_dir / filename
                path.unlink()
                with self.assertRaises(FileNotFoundError):
                    resolve_pair(stage_dir)
                path.write_text(contents[filename], encoding="utf-8")

    def test_rejects_extra_entries_in_an_active_stage(self) -> None:
        stage_dir = self.make_pair()
        (stage_dir / "notes.md").write_text("No sidecars.", encoding="utf-8")

        with self.assertRaises(ValueError):
            resolve_pair(stage_dir)

    def test_stage_symlink_loop_is_a_cli_input_error(self) -> None:
        episode_dir = (
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep001-example"
        )
        episode_dir.mkdir(parents=True)
        stage_dir = episode_dir / "blueprint"
        self.make_symlink(stage_dir, stage_dir, target_is_directory=True)

        result = self.run_cli(stage_dir, "--json")

        self.assertEqual(result.returncode, 2, result.stderr)
        payload = json.loads(result.stdout)
        self.assertFalse(payload["ok"])
        self.assertEqual(len(payload["errors"]), 1)
        self.assertIn("cannot validate input", payload["errors"][0]["message"])
        self.assertNotIn("Traceback", result.stderr)

    def test_pair_halves_may_not_be_symlinks(self) -> None:
        stage_dir = self.make_pair()
        contents = {
            "script.raw.md": RAW,
            "script.extended.md": EXTENDED,
        }
        counterparts = {
            "script.raw.md": "script.extended.md",
            "script.extended.md": "script.raw.md",
        }
        for filename, counterpart in counterparts.items():
            with self.subTest(filename=filename):
                path = stage_dir / filename
                path.unlink()
                self.make_symlink(path, stage_dir / counterpart)
                try:
                    with self.assertRaisesRegex(
                        ValueError,
                        "pair file cannot be a symlink",
                    ):
                        resolve_pair(stage_dir)
                finally:
                    path.unlink(missing_ok=True)
                    path.write_text(contents[filename], encoding="utf-8")

    def test_stage_symlink_and_file_target_resolve_to_same_pair(self) -> None:
        stage_dir = self.make_pair()
        alias_episode = (
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep002-alias"
        )
        alias_episode.mkdir(parents=True)
        alias_stage = alias_episode / "blueprint"
        self.make_symlink(alias_stage, stage_dir, target_is_directory=True)

        from_stage = resolve_pair(alias_stage)
        from_file = resolve_pair(alias_stage / "script.raw.md")

        self.assertEqual(from_stage, from_file)
        self.assertEqual(from_stage.stage_dir, stage_dir.resolve())
        self.assertEqual(from_stage.episode_id, "ep001-example")

    def test_non_pair_symlink_cannot_redirect_to_a_pair_file(self) -> None:
        stage_dir = self.make_pair()
        other = Path(self.tempdir.name) / "other.md"
        self.make_symlink(other, stage_dir / "script.raw.md")

        with self.assertRaises(ValueError):
            resolve_pair(other)

    def test_accepts_annotations_and_evidence_without_narration_drift(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace(
                "Could this happen to you?",
                "Could this happen to you? [F-001](https://example.com)",
            )
        )

        self.assertEqual(validate_pair(resolve_pair(stage_dir)), [])

    def test_raw_purity_rejects_standalone_purpose_annotations(self) -> None:
        raw = RAW.replace(
            "> <u>**Could this happen to you?**</u>",
            "[DEFENSE — Names the objection before answering it.]\n\n"
            "> <u>**Could this happen to you?**</u>",
        )

        self.assertEqual(
            self.validation_errors(raw=raw),
            ["raw script cannot contain purpose annotations"],
        )

    def test_raw_purity_rejects_inline_evidence_indicators(self) -> None:
        raw = RAW.replace(
            "Could this happen to you?",
            "Could this happen to you? [F-001](https://example.com)",
        )

        self.assertEqual(
            self.validation_errors(raw=raw),
            ["raw script cannot contain evidence indicators"],
        )

    def test_raw_purity_rejects_appendix(self) -> None:
        raw = RAW + "\n## Appendix\n\n- **Status:** BLUEPRINT\n"

        self.assertEqual(
            self.validation_errors(raw=raw),
            ["raw script cannot contain an Appendix"],
        )

    def test_raw_purity_rejects_nonspoken_structure(self) -> None:
        for nonspoken_line in (
            "- **Status:** BLUEPRINT",
            "This production note is not spoken narration.",
        ):
            with self.subTest(nonspoken_line=nonspoken_line):
                raw = RAW.replace(
                    "## 1. Opening\n",
                    f"## 1. Opening\n\n{nonspoken_line}\n",
                )

                self.assertEqual(
                    self.validation_errors(raw=raw),
                    [
                        "raw script allows only title, beat headings, "
                        "and blockquoted narration"
                    ],
                )

    def test_raw_purity_rejects_soft_wrapped_reference_definitions(
        self,
    ) -> None:
        for case, definition in (
            (
                "wrapped reference label",
                "[study\n> source]: https://example.com/source",
            ),
            (
                "indented wrapped reference label",
                "   [study\n> source]: https://example.com/source",
            ),
            (
                "wrapped label and continued destination",
                "[study\n> source]:\n> https://example.com/source",
            ),
            (
                "wrapped footnote label",
                "[^study\n> source]: Supporting source details.",
            ),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "> *But the next result changed the question.*",
                    f"> {definition}",
                )

                self.assertEqual(
                    self.validation_errors(raw=raw),
                    [
                        "raw script cannot contain citations or "
                        "Markdown links"
                    ],
                )

    def test_raw_purity_rejects_definitions_before_quoted_narration(
        self,
    ) -> None:
        for case, definition_and_narration in (
            (
                "same-line destination",
                "[study]: https://example.com/source\n"
                "> This is narration.",
            ),
            (
                "soft-wrapped label",
                "[study\n"
                "> source]: https://example.com/source\n"
                "> This is narration.",
            ),
            (
                "continued destination",
                "[study\n"
                "> source]:\n"
                "> https://example.com/source\n"
                "> This is narration.",
            ),
            (
                "same-line optional title",
                '[study]: https://example.com/source "Study title"\n'
                "> This is narration.",
            ),
            (
                "continued optional title",
                "[study]: https://example.com/source\n"
                '> "Study title"\n'
                "> This is narration.",
            ),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "> *But the next result changed the question.*",
                    f"> {definition_and_narration}",
                )

                self.assertEqual(
                    self.validation_errors(raw=raw),
                    [
                        "raw script cannot contain citations or "
                        "Markdown links"
                    ],
                )

    def test_raw_purity_requires_exactly_one_h1_title(self) -> None:
        raw_variants = {
            "missing": RAW.replace("# Episode\n\n", "", 1),
            "second": RAW.replace(
                "# Episode\n\n",
                "# Episode\n\n# Another Episode\n\n",
                1,
            ),
        }
        for case, raw in raw_variants.items():
            with self.subTest(case=case):
                self.assertEqual(
                    self.validation_errors(raw=raw),
                    ["raw script requires exactly one H1 title"],
                )

    def test_raw_purity_rejects_links_and_unsupported_html(self) -> None:
        cases = {
            "citation link": (
                RAW.replace(
                    "Could this happen to you?",
                    "Could [this](https://example.com/source) happen to you?",
                ),
                "raw script cannot contain citations or Markdown links",
            ),
            "unsupported HTML": (
                RAW.replace(
                    "Could this happen to you?",
                    "<em>Could this happen to you?</em>",
                ),
                "raw script cannot contain unsupported HTML tags",
            ),
        }
        for case, (raw, expected) in cases.items():
            with self.subTest(case=case):
                self.assertEqual(self.validation_errors(raw=raw), [expected])

    def test_raw_purity_rejects_all_nonunderline_html_forms(self) -> None:
        for case, markup in (
            ("comment", "<!-- hidden -->"),
            (
                "multiline comment",
                "<!-- hidden\n> continued -->",
            ),
            ("element", "<em>Hidden emphasis</em>"),
            (
                "multiline element",
                '<em\n> class="aside">Hidden emphasis',
            ),
            ("processing instruction", "<?draft value?>"),
            (
                "multiline processing instruction",
                "<?draft\n> value?>",
            ),
            ("declaration", "<!DOCTYPE html>"),
            (
                "multiline declaration",
                "<!DOCTYPE\n> html>",
            ),
            ("CDATA", "<![CDATA[hidden value]]>"),
            (
                "multiline CDATA",
                "<![CDATA[hidden\n> value]]>",
            ),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "> *But the next result changed the question.*",
                    f"> {markup}",
                )
                self.assertEqual(
                    self.validation_errors(raw=raw),
                    ["raw script cannot contain unsupported HTML tags"],
                )

    def test_raw_purity_allows_exact_underline_tags(self) -> None:
        self.assertEqual(self.validation_errors(), [])

    def test_raw_purity_rejects_reference_links_and_footnotes(self) -> None:
        for case, citation in (
            (
                "nested-label inline link",
                "See [the [primary] source](https://example.com).",
            ),
            (
                "nested-label inline image",
                "See ![the [primary] chart](https://example.com/chart.png).",
            ),
            (
                "nested inline destination",
                "See [the source](https://example.com/a(nested)).",
            ),
            ("full reference link", "See [the source][study]."),
            (
                "nested-label reference link",
                "See [the [primary] source][study].",
            ),
            ("collapsed reference link", "See [the source][]."),
            ("reference image", "See ![the chart][asset]."),
            (
                "nested-label reference image",
                "See ![the [primary] chart][asset].",
            ),
            (
                "even-backslash closing bracket",
                r"See [the source\\](https://example.com).",
            ),
            ("footnote citation", "This is supported.[^1]"),
            (
                "reference definition",
                "[study]: https://example.com/source",
            ),
            ("footnote definition", "[^1]: The supporting source."),
            ("bare reference definition", "[study]:"),
            ("bare footnote definition", "[^1]:"),
            (
                "continued reference definition",
                "[study]:\n> https://example.com/source",
            ),
            (
                "continued footnote definition",
                "[^1]:\n> Supporting source details.",
            ),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "> *But the next result changed the question.*",
                    f"> {citation}",
                )
                self.assertEqual(
                    self.validation_errors(raw=raw),
                    [
                        "raw script cannot contain citations or "
                        "Markdown links"
                    ],
                )

    def test_raw_purity_rejects_complete_links_across_supported_surfaces(
        self,
    ) -> None:
        raw_variants = {
            "title": RAW.replace(
                "# Episode",
                "# [Episode](https://example.com/source)",
            ),
            "beat heading": RAW.replace(
                "## 1. Opening",
                "## [Opening][study]",
            ),
            "soft-wrapped blockquote label": RAW.replace(
                "> *But the next result changed the question.*",
                "> See [the primary\n"
                "> source](https://example.com/a(nested)).",
            ),
        }
        for case, raw in raw_variants.items():
            with self.subTest(case=case):
                self.assertEqual(
                    self.validation_errors(raw=raw),
                    [
                        "raw script cannot contain citations or "
                        "Markdown links"
                    ],
                )

    def test_raw_purity_allows_ordinary_spoken_bracket_text(self) -> None:
        for case, spoken in (
            ("ordinary brackets", "But I chose [the safer option]."),
            ("ordinary parentheses", "But I chose (the safer option)."),
            (
                "separate brackets and parentheses",
                "But [the safer option] (really) worked.",
            ),
            (
                "escaped closing bracket",
                r"But [the safer option\](really) worked.",
            ),
            (
                "escaped opening bracket",
                r"But \[not a link](literally) stayed punctuation.",
            ),
            (
                "unmatched destination suffix",
                "But ](literally) stayed punctuation.",
            ),
            (
                "unmatched reference suffix",
                "But ][reference] stayed punctuation.",
            ),
            (
                "incomplete inline suffix",
                "But [text]( stayed punctuation.",
            ),
            (
                "incomplete nested inline suffix",
                "But [text](outer(inner) stayed punctuation.",
            ),
            (
                "escaped inline suffix closer",
                r"But [text](literal\) stayed punctuation.",
            ),
            (
                "incomplete reference suffix",
                "But [text][ stayed punctuation.",
            ),
            (
                "escaped reference suffix closer",
                r"But [text][reference\] stayed punctuation.",
            ),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "> *But the next result changed the question.*",
                    f"> {spoken}",
                )
                extended = EXTENDED.replace(
                    "[MINI-HOOK — Turns the opening into the next evidence need.]\n\n"
                    "> *But the next result changed the question.*",
                    f"> {spoken}",
                )

                self.assertEqual(
                    self.validation_errors(raw=raw, extended=extended),
                    [],
                )

    def test_raw_purity_resets_citation_state_at_paragraph_boundaries(
        self,
    ) -> None:
        for case, quoted_passages in (
            (
                "blank quoted line",
                "> But [the phrase\n>\n> ](literally) stayed punctuation.",
            ),
            (
                "whitespace-only quoted line",
                "> But [the phrase\n>   \n> ](literally) stayed punctuation.",
            ),
            (
                "separate blockquote passages",
                "> But [the phrase\n\n> ](literally) stayed punctuation.",
            ),
            (
                "non-blockquote boundary",
                "> But [the phrase\n"
                "## 2. Boundary\n"
                "> ](literally) stayed punctuation.",
            ),
            (
                "definition split by blank quoted line",
                "> [study\n>\n"
                "> source]: https://example.com/source",
            ),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "> *But the next result changed the question.*",
                    quoted_passages,
                )
                extended = EXTENDED.replace(
                    "[MINI-HOOK — Turns the opening into the next evidence need.]\n\n"
                    "> *But the next result changed the question.*",
                    quoted_passages,
                )

                self.assertEqual(
                    self.validation_errors(raw=raw, extended=extended),
                    [],
                )

    def test_raw_purity_allows_nondefinition_bracketed_speech(
        self,
    ) -> None:
        for case, spoken in (
            (
                "paragraph-start colon prose",
                "[the safer option]: I chose it.",
            ),
            (
                "mid-sentence bracket colon",
                "I chose [the safer option]: honestly.",
            ),
            (
                "paragraph-start bracketed speech without colon",
                "[the safer option] was still mine.",
            ),
            (
                "multiline paragraph-start colon prose",
                "[speech]: This is ordinary narration.\n"
                "> It remains spoken punctuation.",
            ),
            (
                "URL-shaped colon prose with trailing speech",
                "[speech]: https://example.com/source was only an example.\n"
                "> It remains spoken punctuation.",
            ),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "> *But the next result changed the question.*",
                    f"> {spoken}",
                )
                extended = EXTENDED.replace(
                    "[MINI-HOOK — Turns the opening into the next evidence need.]\n\n"
                    "> *But the next result changed the question.*",
                    f"> {spoken}",
                )

                self.assertEqual(
                    self.validation_errors(raw=raw, extended=extended),
                    [],
                )

    def test_raw_purity_rejects_other_markdown_presentation_markup(self) -> None:
        for case, replacement in (
            ("underscore emphasis", "_Could this happen to you?_"),
            ("strikethrough", "~~Could this happen to you?~~"),
            ("inline code", "`Could this happen to you?`"),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "<u>**Could this happen to you?**</u>",
                    replacement,
                )
                self.assertEqual(
                    self.validation_errors(raw=raw),
                    [
                        "raw script cannot contain unsupported "
                        "Markdown markup"
                    ],
                )

    def test_raw_purity_rejects_nested_markdown_block_structures(self) -> None:
        for case, nested_block in (
            ("ATX heading", "# Hidden heading"),
            ("dash list item", "- Hidden list item"),
            ("plus list item", "+ Hidden list item"),
            ("asterisk list item", "* Hidden list item"),
            ("numbered list item", "1. Hidden list item"),
            ("task list item", "- [ ] Hidden task"),
            ("empty dash list item", "-"),
            ("empty plus list item", "+"),
            ("empty asterisk list item", "*"),
            ("empty dot list item", "1."),
            ("empty parenthesis list item", "1)"),
            ("spaced empty dash list item", "-   "),
            ("spaced empty plus list item", "+\t"),
            ("spaced empty asterisk list item", "*   "),
            ("spaced empty dot list item", "1.   "),
            ("spaced empty parenthesis list item", "1)\t"),
            ("nested quote", "> Hidden quote"),
            ("backtick fence", "```python"),
            ("tilde fence", "~~~"),
            ("setext equals heading", "Hidden heading\n> ==="),
            ("setext dash heading", "Hidden heading\n> ---"),
            ("horizontal rule", "---"),
            ("spaced asterisk horizontal rule", "* * *"),
            ("indented code", "    hidden_code()"),
            ("tab-indented code", "\thidden_code()"),
            (
                "one space plus tab indented code",
                " \thidden_code()",
            ),
            (
                "two spaces plus tab indented code",
                "  \thidden_code()",
            ),
            (
                "three spaces plus tab indented code",
                "   \thidden_code()",
            ),
            ("GFM alert", "[!NOTE]"),
            ("GFM table delimiter", "| :--- | ---: |"),
            ("one-hyphen GFM table delimiter", "| - | - |"),
            ("two-hyphen GFM table delimiter", "-- | --"),
            (
                "aligned short GFM table delimiter",
                "| :- | -: |",
            ),
            (
                "GFM table with outer pipes",
                "| Finding | Meaning |\n"
                "> | :--- | ---: |\n"
                "> | Result | Consequence |",
            ),
            (
                "GFM table without outer pipes",
                "Finding | Meaning\n"
                "> --- | ---\n"
                "> Result | Consequence",
            ),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "> *But the next result changed the question.*",
                    f"> {nested_block}",
                )
                self.assertEqual(
                    self.validation_errors(raw=raw),
                    [
                        "raw script cannot contain unsupported "
                        "Markdown markup"
                    ],
                )

    def test_raw_purity_does_not_treat_italic_narration_as_a_list(self) -> None:
        self.assertEqual(self.validation_errors(), [])

    def test_raw_purity_allows_quote_padding_and_subcode_indentation(
        self,
    ) -> None:
        for case, quoted_line in (
            (
                "no quote padding",
                ">Ordinary narration without quote padding.",
            ),
            (
                "single space quote padding",
                "> Ordinary narration with space quote padding.",
            ),
            (
                "single tab quote padding",
                ">\tOrdinary narration with tab quote padding.",
            ),
            (
                "three remaining spaces",
                ">    Ordinary narration below code indentation.",
            ),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "> *But the next result changed the question.*",
                    quoted_line,
                )
                extended = EXTENDED.replace(
                    "[MINI-HOOK — Turns the opening into the next evidence need.]\n\n"
                    "> *But the next result changed the question.*",
                    quoted_line,
                )

                self.assertEqual(
                    self.validation_errors(raw=raw, extended=extended),
                    [],
                )

    def test_raw_purity_allows_blocklike_punctuation_inside_sentences(
        self,
    ) -> None:
        for case, spoken in (
            (
                "equals",
                "The result was A === B, not a hidden heading.",
            ),
            (
                "dashes",
                "The score moved from 3-2 -- then stopped.",
            ),
            (
                "list punctuation",
                "I could choose - this, + that, or 1. neither.",
            ),
            (
                "alert text",
                "I wrote [!NOTE] in the margin.",
            ),
            (
                "pipes",
                "The choice | consequence | still felt personal.",
            ),
            (
                "leading pipe punctuation",
                "| meant “or” | in the handwritten note.",
            ),
            (
                "trailing pipe punctuation",
                "The handwritten | mark meant “or” |",
            ),
            (
                "pipe-wrapped sentence",
                "| This sentence uses | pipes as spoken punctuation |",
            ),
            (
                "standalone pipe row",
                "| Finding | Meaning |",
            ),
            (
                "multi-pipe sentence",
                "This sentence | uses pipes | as spoken punctuation.",
            ),
            (
                "non-delimiter dash cells",
                "| - Finding | Meaning - |",
            ),
        ):
            with self.subTest(case=case):
                raw = RAW.replace(
                    "> *But the next result changed the question.*",
                    f"> {spoken}",
                )
                extended = EXTENDED.replace(
                    "[MINI-HOOK — Turns the opening into the next evidence need.]\n\n"
                    "> *But the next result changed the question.*",
                    f"> {spoken}",
                )

                self.assertEqual(
                    self.validation_errors(raw=raw, extended=extended),
                    [],
                )

    def test_raw_purity_allows_ordinary_spoken_brackets_and_punctuation(self) -> None:
        spoken = "Could [this] happen—to player_one (really)?"
        raw = RAW.replace("Could this happen to you?", spoken)
        extended = EXTENDED.replace("Could this happen to you?", spoken)

        self.assertEqual(
            self.validation_errors(raw=raw, extended=extended),
            [],
        )

    def test_storytelling_markup_recognizes_inline_and_triple_spans(self) -> None:
        inline_raw = RAW.replace(
            "<u>**Could this happen to you?**</u>",
            "**Could <u>this happen</u> to you?**",
        )
        inline_extended = EXTENDED.replace(
            "<u>**Could this happen to you?**</u>",
            "**Could <u>this happen</u> to you?**",
        )
        triple_raw = RAW.replace(
            "*But the next result changed the question.*",
            "***But the next result changed the question.***",
        )
        triple_extended = EXTENDED.replace(
            "*But the next result changed the question.*",
            "***But the next result changed the question.***",
        ).replace(
            "[MINI-HOOK — Turns the opening into the next evidence need.]",
            "[MINI-HOOK | LOCKED WORDING — "
            "Turns the opening into the next evidence need.]",
        )

        for case, raw, extended in (
            ("tight single and double markers", RAW, EXTENDED),
            ("inline", inline_raw, inline_extended),
            ("triple", triple_raw, triple_extended),
        ):
            with self.subTest(case=case):
                self.assertEqual(
                    self.validation_errors(raw=raw, extended=extended),
                    [],
                )

    def test_storytelling_markup_rejects_unbalanced_or_empty_spans(self) -> None:
        raw_variants = {
            "empty underline": RAW.replace(
                "<u>**Could this happen to you?**</u>",
                "<u></u>",
            ),
            "unbalanced italics": RAW.replace(
                "*But the next result changed the question.*",
                "*But the next result changed the question.",
            ),
            "empty italics": RAW.replace(
                "*But the next result changed the question.*",
                "* *",
            ),
            "crossed underline and bold": RAW.replace(
                "<u>**Could this happen to you?**</u>",
                "<u>**Could this happen to you?</u>**",
            ),
        }
        for case, raw in raw_variants.items():
            with self.subTest(case=case):
                self.assertEqual(
                    self.validation_errors(raw=raw),
                    ["malformed or empty storytelling markup"],
                )

    def test_storytelling_markup_requires_nonwhitespace_flanking(self) -> None:
        padded_italic_raw = RAW.replace(
            "*But the next result changed the question.*",
            "* malformed italic *",
        )
        padded_italic_extended = EXTENDED.replace(
            "*But the next result changed the question.*",
            "* malformed italic *",
        )
        padded_bold_raw = RAW.replace(
            "<u>**Could this happen to you?**</u>",
            "<u>** malformed bold **</u>",
        )
        padded_bold_extended = EXTENDED.replace(
            "<u>**Could this happen to you?**</u>",
            "<u>** malformed bold **</u>",
        )

        cases = (
            (
                "padded italic",
                padded_italic_raw,
                padded_italic_extended,
                "MINI-HOOK passage must be italic and not underlined",
            ),
            (
                "padded bold",
                padded_bold_raw,
                padded_bold_extended,
                "LOCKED WORDING requires a bold passage",
            ),
        )
        for case, raw, extended, mapping_error in cases:
            with self.subTest(case=case):
                errors = self.validation_errors(
                    raw=raw,
                    extended=extended,
                )
                self.assertEqual(
                    set(errors),
                    {
                        "malformed or empty storytelling markup",
                        mapping_error,
                    },
                )
                self.assertEqual(len(errors), 2)

    def test_raw_purity_rejects_escaped_story_markers(self) -> None:
        unsupported_error = (
            "raw script cannot contain unsupported Markdown markup"
        )
        cases = (
            (
                "escaped italics",
                RAW.replace(
                    "*But the next result changed the question.*",
                    r"\*But the next result changed the question.\*",
                ),
                EXTENDED.replace(
                    "*But the next result changed the question.*",
                    r"\*But the next result changed the question.\*",
                ),
                [
                    unsupported_error,
                    "MINI-HOOK passage must be italic and not underlined",
                ],
            ),
            (
                "escaped underline",
                RAW.replace(
                    "<u>**Could this happen to you?**</u>",
                    r"\<u>**Could this happen to you?**\</u>",
                ),
                EXTENDED.replace(
                    "<u>**Could this happen to you?**</u>",
                    r"\<u>**Could this happen to you?**\</u>",
                ),
                [
                    unsupported_error,
                    "main-story tag requires an underlined passage",
                ],
            ),
            (
                "escaped underscores",
                RAW.replace(
                    "<u>**Could this happen to you?**</u>",
                    r"\_Could this happen to you?\_",
                ),
                EXTENDED.replace(
                    "<u>**Could this happen to you?**</u>",
                    r"\_Could this happen to you?\_",
                ),
                [
                    unsupported_error,
                    "main-story tag requires an underlined passage",
                    "LOCKED WORDING requires a bold passage",
                ],
            ),
        )
        for case, raw, extended, expected in cases:
            with self.subTest(case=case):
                self.assertEqual(
                    self.validation_errors(
                        raw=raw,
                        extended=extended,
                    ),
                    expected,
                )

    def test_storytelling_markup_ignores_evidence_url_punctuation(self) -> None:
        extended = EXTENDED.replace(
            "Could this happen to you?",
            "Could this happen to you? "
            "[F-001](https://example.com/evidence/*path*)",
        )

        self.assertEqual(self.validation_errors(extended=extended), [])

    def test_underlined_mini_hook_reports_both_mapping_errors(self) -> None:
        extended = EXTENDED.replace(
            "[MAIN HOOK | LOCKED WORDING — "
            "Opens the central personal-risk question.]",
            "[MINI-HOOK | LOCKED WORDING — "
            "Opens the central personal-risk question.]",
        )

        errors = self.validation_errors(extended=extended)

        self.assertEqual(
            set(errors),
            {
                "underlined passage requires a main-story tag",
                "MINI-HOOK passage must be italic and not underlined",
            },
        )
        self.assertEqual(len(errors), 2)

    def test_main_story_tags_require_an_underlined_passage(self) -> None:
        raw = RAW.replace(
            "<u>**Could this happen to you?**</u>",
            "**Could this happen to you?**",
        )
        extended_without_underline = EXTENDED.replace(
            "<u>**Could this happen to you?**</u>",
            "**Could this happen to you?**",
        )
        for tag in (
            "MAIN HOOK",
            "OBSTACLE",
            "LOOP OPEN L-01",
            "LOOP PAYOFF L-01",
        ):
            with self.subTest(tag=tag):
                extended = extended_without_underline.replace(
                    "MAIN HOOK | LOCKED WORDING",
                    f"{tag} | LOCKED WORDING",
                )
                self.assertEqual(
                    self.validation_errors(raw=raw, extended=extended),
                    ["main-story tag requires an underlined passage"],
                )

    def test_italic_passage_requires_a_supporting_story_tag(self) -> None:
        extended = EXTENDED.replace(
            "[MINI-HOOK — Turns the opening into the next evidence need.]",
            "[DEFENSE — Answers the opening objection.]",
        )

        self.assertEqual(
            self.validation_errors(extended=extended),
            ["italic passage requires a supporting-story tag"],
        )

    def test_mini_hook_requires_italics_even_without_underline(self) -> None:
        raw = RAW.replace(
            "*But the next result changed the question.*",
            "But the next result changed the question.",
        )
        extended = EXTENDED.replace(
            "*But the next result changed the question.*",
            "But the next result changed the question.",
        )

        self.assertEqual(
            self.validation_errors(raw=raw, extended=extended),
            ["MINI-HOOK passage must be italic and not underlined"],
        )

    def test_bold_and_locked_wording_require_each_other(self) -> None:
        without_locked = EXTENDED.replace(
            "[MAIN HOOK | LOCKED WORDING — "
            "Opens the central personal-risk question.]",
            "[MAIN HOOK — Opens the central personal-risk question.]",
        )
        raw_without_bold = RAW.replace(
            "<u>**Could this happen to you?**</u>",
            "<u>Could this happen to you?</u>",
        )
        extended_without_bold = EXTENDED.replace(
            "<u>**Could this happen to you?**</u>",
            "<u>Could this happen to you?</u>",
        )

        cases = (
            (
                "bold without tag",
                RAW,
                without_locked,
                "bold passage requires LOCKED WORDING",
            ),
            (
                "tag without bold",
                raw_without_bold,
                extended_without_bold,
                "LOCKED WORDING requires a bold passage",
            ),
        )
        for case, raw, extended, expected in cases:
            with self.subTest(case=case):
                self.assertEqual(
                    self.validation_errors(raw=raw, extended=extended),
                    [expected],
                )

    def test_passage_cannot_combine_underline_and_italics(self) -> None:
        raw = RAW.replace(
            "<u>**Could this happen to you?**</u>",
            "<u>***Could this happen to you?***</u>",
        )
        extended = EXTENDED.replace(
            "<u>**Could this happen to you?**</u>",
            "<u>***Could this happen to you?***</u>",
        ).replace(
            "[MAIN HOOK | LOCKED WORDING — "
            "Opens the central personal-risk question.]",
            "[MAIN HOOK | TRANSITION | LOCKED WORDING — "
            "Opens the central personal-risk question.]",
        )

        self.assertEqual(
            self.validation_errors(raw=raw, extended=extended),
            ["passage cannot combine underline and italics"],
        )

    def test_invalid_or_empty_purpose_annotation_is_not_sync_drift(self) -> None:
        raw = RAW.replace(
            "*But the next result changed the question.*",
            "But the next result changed the question.",
        )
        extended = EXTENDED.replace(
            "*But the next result changed the question.*",
            "But the next result changed the question.",
        ).replace(
            "[MINI-HOOK — Turns the opening into the next evidence need.]",
            "[MINI-HOOK — ]",
        )

        errors = self.validation_errors(raw=raw, extended=extended)

        self.assertEqual(errors, ["invalid or empty purpose annotation"])
        self.assertNotIn(DRIFT_ERROR, errors)

    def test_purpose_annotation_requires_exact_multi_tag_spacing(self) -> None:
        raw = RAW.replace(
            "*But the next result changed the question.*",
            "But the next result changed the question.",
        )
        extended = EXTENDED.replace(
            "*But the next result changed the question.*",
            "But the next result changed the question.",
        ).replace(
            "[MINI-HOOK — Turns the opening into the next evidence need.]",
            "[DEFENSE |  DISARM — Names and answers the objection.]",
        )

        self.assertEqual(
            self.validation_errors(raw=raw, extended=extended),
            ["invalid or empty purpose annotation"],
        )

    def test_unknown_purpose_tag_is_reported(self) -> None:
        raw = RAW.replace(
            "*But the next result changed the question.*",
            "But the next result changed the question.",
        )
        extended = EXTENDED.replace(
            "*But the next result changed the question.*",
            "But the next result changed the question.",
        ).replace(
            "[MINI-HOOK — Turns the opening into the next evidence need.]",
            "[SURPRISE — Reveals the unexpected result.]",
        )

        self.assertEqual(
            self.validation_errors(raw=raw, extended=extended),
            ["unknown purpose tag: SURPRISE"],
        )

    def test_orphan_and_adjacent_purpose_annotations_are_reported(self) -> None:
        orphan = EXTENDED.replace(
            "\n## Appendix",
            "[DEFENSE — Names a defense with no narration.]\n\n## Appendix",
        )
        adjacent = EXTENDED.replace(
            "[MINI-HOOK — Turns the opening into the next evidence need.]",
            "[DEFENSE — Names a defense with no narration.]\n"
            "[MINI-HOOK — Turns the opening into the next evidence need.]",
        )

        for case, extended in (
            ("end of narration", orphan),
            ("adjacent annotations", adjacent),
        ):
            with self.subTest(case=case):
                self.assertEqual(
                    self.validation_errors(extended=extended),
                    ["purpose annotation has no following passage"],
                )

    def test_unstyled_nonstructural_purpose_tags_are_allowed(self) -> None:
        raw = RAW.replace(
            "*But the next result changed the question.*",
            "But the next result changed the question.",
        )
        extended = EXTENDED.replace(
            "*But the next result changed the question.*",
            "But the next result changed the question.",
        ).replace(
            "[MINI-HOOK — Turns the opening into the next evidence need.]",
            "[DEFENSE | DISARM — Names and answers the viewer's objection.]",
        )

        self.assertEqual(
            self.validation_errors(raw=raw, extended=extended),
            [],
        )

    def test_evidence_scan_is_linear_on_a_long_non_indicator_line(self) -> None:
        line = " " * 50_000 + "not-an-indicator\r\n"

        started = time.perf_counter()
        projected = EVIDENCE_RE.sub("", line)
        elapsed = time.perf_counter() - started

        self.assertEqual(projected, line)
        self.assertLess(
            elapsed,
            1.0,
            f"evidence scan took {elapsed:.3f}s for 50,000 spaces",
        )

    def test_nested_markup_scan_is_linear_on_a_long_list_line(self) -> None:
        passage = "*" + " " * 20_000 + "not-emphasis"

        started = time.perf_counter()
        is_nested = _has_nested_block_structure(passage)
        elapsed = time.perf_counter() - started

        self.assertTrue(is_nested)
        self.assertLess(
            elapsed,
            0.5,
            f"nested markup scan took {elapsed:.3f}s",
        )

    def test_citation_scan_is_linear_on_incomplete_suffixes(self) -> None:
        passage = "](" * 200_000

        started = time.perf_counter()
        has_citation = _has_raw_citation(passage)
        elapsed = time.perf_counter() - started

        self.assertFalse(has_citation)
        self.assertLess(
            elapsed,
            0.5,
            f"citation scan took {elapsed:.3f}s",
        )

    def test_citation_scan_is_linear_on_complete_labels_with_open_suffixes(
        self,
    ) -> None:
        passage = "[x](" * 50_000

        started = time.perf_counter()
        has_citation = _has_raw_citation(passage)
        elapsed = time.perf_counter() - started

        self.assertFalse(has_citation)
        self.assertLess(
            elapsed,
            0.5,
            f"citation scan took {elapsed:.3f}s",
        )

    def test_evidence_removal_keeps_line_endings(self) -> None:
        for line_ending in ("\n", "\r\n"):
            with self.subTest(line_ending=repr(line_ending)):
                line = (
                    "Evidence-backed words \t"
                    "[F-001](https://example.com)"
                    f"{line_ending}"
                )
                self.assertEqual(
                    EVIDENCE_RE.sub("", line),
                    f"Evidence-backed words{line_ending}",
                )

    def test_reports_spoken_or_formatting_drift(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace("next result", "later result")
        )

        self.assertEqual(validate_pair(resolve_pair(stage_dir)), [DRIFT_ERROR])

    def test_reports_paragraph_spacing_drift(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace(
                "> *But the next result",
                "\n> *But the next result",
            )
        )

        self.assertEqual(
            validate_pair(resolve_pair(stage_dir)),
            [
                "purpose annotation has no following passage",
                "italic passage requires a supporting-story tag",
                DRIFT_ERROR,
            ],
        )

    def test_cli_accepts_stage_or_either_pair_file(self) -> None:
        stage_dir = self.make_pair()
        for target in (
            stage_dir,
            stage_dir / "script.raw.md",
            stage_dir / "script.extended.md",
        ):
            with self.subTest(target=target):
                result = self.run_cli(target)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(
                    result.stdout,
                    "PASS: script pair is exactly synchronized\n",
                )

    def test_cli_json_accepts_separator_before_target(self) -> None:
        stage_dir = self.make_pair()

        result = self.run_cli(stage_dir / "script.raw.md", "--json", "--")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            json.loads(result.stdout),
            {"ok": True, "errors": []},
        )

    def test_cli_validation_errors_return_1(self) -> None:
        stage_dir = self.make_pair(
            extended=EXTENDED.replace("next result", "later result")
        )

        result = self.run_cli(stage_dir, "--json")

        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(
            json.loads(result.stdout),
            {
                "ok": False,
                "errors": [{"message": DRIFT_ERROR, "line": None}],
            },
        )

    def test_cli_raw_validation_errors_return_1(self) -> None:
        raw = RAW.replace(
            "Could this happen to you?",
            "Could this happen to you? [F-001](https://example.com)",
        )
        stage_dir = self.make_pair(raw=raw)

        result = self.run_cli(stage_dir, "--json")

        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(
            json.loads(result.stdout),
            {
                "ok": False,
                "errors": [
                    {
                        "message": (
                            "raw script cannot contain evidence indicators"
                        ),
                        "line": None,
                    }
                ],
            },
        )

    def test_cli_missing_pair_returns_2(self) -> None:
        target = (
            Path(self.tempdir.name)
            / "whp-youtube"
            / "episodes"
            / "ep001-example"
            / "blueprint"
        )

        result = self.run_cli(target, "--json")

        self.assertEqual(result.returncode, 2, result.stderr)
        payload = json.loads(result.stdout)
        self.assertFalse(payload["ok"])
        self.assertEqual(len(payload["errors"]), 1)
        self.assertIn("cannot validate input", payload["errors"][0]["message"])
        self.assertIsNone(payload["errors"][0]["line"])

    def test_cli_invalid_utf8_pair_half_returns_2(self) -> None:
        stage_dir = self.make_pair()
        (stage_dir / "script.extended.md").write_bytes(b"\xff")

        result = self.run_cli(stage_dir, "--json")

        self.assertEqual(result.returncode, 2, result.stderr)
        payload = json.loads(result.stdout)
        self.assertFalse(payload["ok"])
        self.assertEqual(len(payload["errors"]), 1)
        self.assertIn("cannot validate input", payload["errors"][0]["message"])
        self.assertIsNone(payload["errors"][0]["line"])
        self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
