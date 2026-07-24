from __future__ import annotations

import contextlib
import io
import tempfile
import unittest
from pathlib import Path

from check_spoken_readability import analyze_markdown, extract_spoken_sentences, main


class SpokenReadabilityTests(unittest.TestCase):
    def test_extracts_only_spoken_narration_and_removes_evidence_links(self) -> None:
        markdown = """
# Title

Metadata does not count.

> A short factual sentence. [F-001](https://example.com/source)

## Appendix

> This appendix sentence must not count.
"""

        sentences = extract_spoken_sentences(markdown)

        self.assertEqual(
            [sentence.text for sentence in sentences],
            ["A short factual sentence."],
        )

    def test_splits_multiple_spoken_sentences_from_one_blockquote_line(self) -> None:
        sentences = extract_spoken_sentences(
            '> First sentence. “Second sentence?” Third sentence!\n'
        )

        self.assertEqual(
            [sentence.text for sentence in sentences],
            ["First sentence.", "“Second sentence?”", "Third sentence!"],
        )

    def test_twenty_six_words_is_a_failure(self) -> None:
        sentence = " ".join(f"word{index}" for index in range(26)) + "."

        finding = analyze_markdown(f"> {sentence}")[0]

        self.assertEqual(finding.level, "fail")
        self.assertEqual(finding.reason, "26 spoken words exceeds the maximum of 25")

    def test_twenty_one_through_twenty_five_words_require_review(self) -> None:
        sentence = " ".join(f"word{index}" for index in range(21)) + "."

        finding = analyze_markdown(f"> {sentence}")[0]

        self.assertEqual(finding.level, "review")
        self.assertEqual(finding.reason, "21 spoken words requires first-hearing review")

    def test_twenty_words_pass_the_mechanical_gate(self) -> None:
        sentence = " ".join(f"word{index}" for index in range(20)) + "."

        finding = analyze_markdown(f"> {sentence}")[0]

        self.assertEqual(finding.level, "pass")

    def test_user_supplied_short_dense_sentences_fail(self) -> None:
        difficult_sentences = (
            "It isolated the human half of the trap: the AI label raised suspicion, "
            "but suspicion alone did not help the radiologists catch the errors.",
            "Those assistants often shifted their answers toward users' stated beliefs—"
            "even when those beliefs were wrong.",
            "That is how a dumb idea becomes dangerous: it stops sounding like your idea "
            "and starts sounding independently confirmed.",
        )

        for sentence in difficult_sentences:
            with self.subTest(sentence=sentence):
                finding = analyze_markdown(f"> {sentence}")[0]
                self.assertEqual(finding.level, "fail")
                self.assertIn("structurally difficult", finding.reason)

    def test_plain_sentence_with_necessary_names_does_not_fail_on_score_alone(
        self,
    ) -> None:
        sentence = (
            "In 2023, Anthropic researchers tested five leading AI assistants "
            "across four tasks."
        )

        finding = analyze_markdown(f"> {sentence}")[0]

        self.assertEqual(finding.level, "pass")

    def test_cli_blocks_review_items_until_they_are_marked_reviewed(self) -> None:
        sentence = " ".join(f"word{index}" for index in range(21)) + "."
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "script.md"
            path.write_text(f"> {sentence}\n", encoding="utf-8")

            with contextlib.redirect_stdout(io.StringIO()):
                unresolved_result = main([str(path)])
                reviewed_result = main(["--reviewed", str(path)])

        self.assertEqual(unresolved_result, 1)
        self.assertEqual(reviewed_result, 0)


if __name__ == "__main__":
    unittest.main()
