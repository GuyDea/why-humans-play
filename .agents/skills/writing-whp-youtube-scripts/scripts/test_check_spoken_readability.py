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

> A short factual sentence. [F-001](https://example.com/source) <!-- PI-001: Martin input -->
>
> Another spoken sentence. F-002

## Appendix

> This appendix sentence must not count.
"""

        sentences = extract_spoken_sentences(markdown)

        # Only the canonical [F-###](URL) indicator is an annotation; a bare
        # F-### token is spoken text, exactly as the validators count it.
        self.assertEqual(
            [sentence.text for sentence in sentences],
            ["A short factual sentence.", "Another spoken sentence.", "F-002"],
        )

    def test_locked_line_bolding_is_stripped_before_the_word_count(self) -> None:
        sentences = extract_spoken_sentences(
            "> **This locked punchline is delivered word-perfect.**\n"
        )

        self.assertEqual(
            [sentence.text for sentence in sentences],
            ["This locked punchline is delivered word-perfect."],
        )

    def test_storytelling_markup_is_not_extracted_as_spoken_text(self) -> None:
        sentences = extract_spoken_sentences(
            "> <u>**This main hook stays locked.**</u>\n"
            "\n"
            "> ***But this mini-hook is also locked.***\n"
        )

        self.assertEqual(
            [sentence.text for sentence in sentences],
            [
                "This main hook stays locked.",
                "But this mini-hook is also locked.",
            ],
        )

    def test_arbitrary_html_is_not_stripped_as_storytelling_markup(self) -> None:
        sentences = extract_spoken_sentences(
            "> <mark>This tag remains visible.</mark>\n"
        )

        self.assertEqual(
            [sentence.text for sentence in sentences],
            ["<mark>This tag remains visible.</mark>"],
        )

    def test_splits_multiple_spoken_sentences_from_one_blockquote_line(self) -> None:
        sentences = extract_spoken_sentences(
            '> First sentence. “Second sentence?” Third sentence!\n'
        )

        self.assertEqual(
            [sentence.text for sentence in sentences],
            ["First sentence.", "“Second sentence?”", "Third sentence!"],
        )

    def test_connective_resume_after_aside_requires_review(self) -> None:
        markdown = (
            "> *Hold that thought. It gets its place.*\n"
            "\n"
            "> Then researchers pooled results. More text here.\n"
        )
        findings = analyze_markdown(markdown)
        resume = findings[2]
        self.assertEqual(resume.level, "review")
        self.assertIn("resume line after an aside", resume.reason)
        self.assertEqual(findings[3].level, "pass")

    def test_named_referent_resume_after_aside_passes(self) -> None:
        markdown = (
            "> *Hold that thought. It gets its place.*\n"
            "\n"
            "> Back to those verdicts. Researchers tested them.\n"
        )
        findings = analyze_markdown(markdown)
        self.assertTrue(all(f.level == "pass" for f in findings))

    def test_twenty_six_words_is_a_failure(self) -> None:
        sentence = " ".join(f"word{index}" for index in range(26)) + "."

        finding = analyze_markdown(f"> {sentence}")[0]

        self.assertEqual(finding.level, "fail")
        self.assertEqual(finding.reason, "26 spoken words exceeds the maximum of 25")

    def test_twenty_one_through_twenty_five_words_require_review(self) -> None:
        for word_count in range(21, 26):
            sentence = " ".join(
                f"word{index}" for index in range(word_count)
            ) + "."

            with self.subTest(word_count=word_count):
                finding = analyze_markdown(f"> {sentence}")[0]

                self.assertEqual(finding.level, "review")
                self.assertEqual(
                    finding.reason,
                    (
                        f"{word_count} spoken words requires "
                        "first-hearing review"
                    ),
                )

    def test_twenty_words_pass_the_mechanical_gate(self) -> None:
        sentence = " ".join(f"word{index}" for index in range(20)) + "."

        finding = analyze_markdown(f"> {sentence}")[0]

        self.assertEqual(finding.level, "pass")

    def test_bare_url_is_removed_before_the_word_count(self) -> None:
        sentence = " ".join(f"word{index}" for index in range(24))

        finding = analyze_markdown(
            f"> {sentence} https://example.com/a-long-source-name"
        )[0]

        self.assertEqual(finding.word_count, 24)
        self.assertEqual(finding.level, "review")

    def test_accented_word_counts_as_one_spoken_word(self) -> None:
        sentence = " ".join(["résumé", *(["word"] * 19)]) + "."

        finding = analyze_markdown(f"> {sentence}")[0]

        self.assertEqual(finding.word_count, 20)
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

    def test_user_supplied_long_list_fails_the_word_ceiling(self) -> None:
        sentence = (
            "Ask AI whether to quit your job, end a relationship, dismiss a health "
            "concern, or bet your savings on a business idea, and you may think you "
            "received a second opinion."
        )

        finding = analyze_markdown(f"> {sentence}")[0]

        self.assertEqual(finding.level, "fail")
        self.assertEqual(
            finding.reason,
            "31 spoken words exceeds the maximum of 25",
        )

    def test_plain_sentence_with_necessary_names_does_not_fail_on_score_alone(
        self,
    ) -> None:
        sentence = (
            "In 2023, Anthropic researchers tested five leading AI assistants "
            "across four tasks."
        )

        finding = analyze_markdown(f"> {sentence}")[0]

        self.assertEqual(finding.level, "pass")

    def test_exact_participant_count_requires_spoken_number_review(self) -> None:
        finding = analyze_markdown(
            "> Then I found a study involving 138 radiologists.\n"
        )[0]

        self.assertEqual(finding.level, "review")
        self.assertEqual(
            finding.reason,
            "exact participant count requires spoken-number review",
        )

    def test_common_participant_roles_require_spoken_number_review(self) -> None:
        for role in ("patients", "nurses", "clinicians"):
            with self.subTest(role=role):
                finding = analyze_markdown(
                    f"> The study included 138 {role}.\n"
                )[0]

                self.assertEqual(finding.level, "review")
                self.assertEqual(
                    finding.reason,
                    "exact participant count requires spoken-number review",
                )

    def test_percentage_of_participants_is_not_an_exact_headcount(self) -> None:
        percentage_phrases = (
            "95 percent of participants",
            "95 percentage of participants",
            "95 per cent of participants",
            "95 per-cent of participants",
        )

        for phrase in percentage_phrases:
            with self.subTest(phrase=phrase):
                finding = analyze_markdown(
                    f"> The result applied to {phrase}.\n"
                )[0]

                self.assertEqual(finding.level, "pass")

    def test_substantial_quotation_requires_memory_delivery_review(self) -> None:
        finding = analyze_markdown(
            "> “Is it possible to have visual disturbance after catheter ablation?”\n"
        )[0]

        self.assertEqual(finding.level, "review")
        self.assertEqual(
            finding.reason,
            "substantial quotation requires verbatim-or-paraphrase memory review",
        )

    def test_split_substantial_quotation_requires_review_for_each_piece(
        self,
    ) -> None:
        findings = analyze_markdown(
            '> She said, “The scan looks normal. You can safely wait until tomorrow.”\n'
        )

        self.assertEqual(len(findings), 2)
        self.assertEqual(
            [finding.level for finding in findings],
            ["review", "review"],
        )
        self.assertEqual(
            [finding.reason for finding in findings],
            [
                "substantial quotation requires "
                "verbatim-or-paraphrase memory review",
                "substantial quotation requires "
                "verbatim-or-paraphrase memory review",
            ],
        )

    def test_short_quotation_does_not_require_memory_delivery_review(self) -> None:
        finding = analyze_markdown(
            '> He said, “Check outside the chat.”\n'
        )[0]

        self.assertEqual(finding.level, "pass")

    def test_embedded_wrapped_quotation_requires_memory_delivery_review(
        self,
    ) -> None:
        findings = analyze_markdown(
            "> He asked ChatGPT something like, **“Could these vision problems be "
            "from the heart\n"
            "> procedure I just had?”**\n"
        )

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].level, "review")
        self.assertEqual(
            findings[0].reason,
            "substantial quotation requires verbatim-or-paraphrase memory review",
        )

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

    def test_reviewed_flag_does_not_clear_structural_failure(self) -> None:
        sentence = (
            "Those assistants often shifted their answers toward users' stated "
            "beliefs—even when those beliefs were wrong."
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "script.md"
            path.write_text(f"> {sentence}\n", encoding="utf-8")

            with contextlib.redirect_stdout(io.StringIO()):
                result = main(["--reviewed", str(path)])

        self.assertEqual(result, 1)

    def test_cli_rejects_a_file_without_spoken_narration(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "script.md"
            path.write_text(
                "# Script\n\nThis is metadata, not narration.\n",
                encoding="utf-8",
            )

            with (
                contextlib.redirect_stdout(io.StringIO()),
                contextlib.redirect_stderr(io.StringIO()) as stderr,
            ):
                result = main([str(path)])

        self.assertEqual(result, 2)
        self.assertIn("No spoken narration found", stderr.getvalue())


class NarrationMarkupBoundaryTests(unittest.TestCase):
    def test_prose_nouns_resembling_evidence_ids_are_not_corrupted(self) -> None:
        sentences = extract_spoken_sentences(
            "> The F-150 pickup and shelf-101 rack carried the gear.\n"
        )

        self.assertEqual(
            [sentence.text for sentence in sentences],
            ["The F-150 pickup and shelf-101 rack carried the gear."],
        )

    def test_lowercase_evidence_link_is_spoken_link_text(self) -> None:
        sentences = extract_spoken_sentences(
            "> A short sentence. [f-001](https://example.com/source)\n"
        )

        self.assertIn(
            "f-001",
            " ".join(sentence.text for sentence in sentences),
        )

    def test_scanning_stops_only_at_the_exact_appendix_heading(self) -> None:
        long_sentence = " ".join(["word"] * 26) + "."
        markdown = f"## Appendix — the hidden game\n\n> {long_sentence}\n"

        findings = analyze_markdown(markdown)

        self.assertEqual([finding.level for finding in findings], ["fail"])


class SentenceBoundaryAbbreviationTests(unittest.TestCase):
    def test_terminal_abbreviation_before_lowercase_does_not_split(self) -> None:
        sentences = extract_spoken_sentences(
            "> They tested boats, cars, etc. and then kept talking calmly.\n"
        )

        self.assertEqual(len(sentences), 1)

    def test_terminal_abbreviation_before_capital_still_splits(self) -> None:
        sentences = extract_spoken_sentences(
            "> It worked, etc. Then everything changed.\n"
        )

        self.assertEqual(len(sentences), 2)

    def test_terminal_abbreviation_before_digit_does_not_split(self) -> None:
        sentences = extract_spoken_sentences(
            "> They measured approx. 10 boats near the dock.\n"
        )

        self.assertEqual(len(sentences), 1)

    def test_terminal_abbreviation_before_currency_does_not_split(self) -> None:
        sentences = extract_spoken_sentences(
            "> The repair cost approx. $40 in parts.\n"
        )

        self.assertEqual(len(sentences), 1)

    def test_split_around_terminal_abbreviation_cannot_hide_a_long_sentence(
        self,
    ) -> None:
        long_sentence = (
            "> The survey team recorded approx. 30 separate readings across the "
            "northern ridge before sunset and then confirmed every single anomaly "
            "against the previous printed chart of the whole region.\n"
        )

        findings = analyze_markdown(long_sentence)

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].level, "fail")

    def test_title_abbreviation_before_capitalized_name_does_not_split(
        self,
    ) -> None:
        sentences = extract_spoken_sentences("> Dr. Smith agreed to help.\n")

        self.assertEqual(len(sentences), 1)


if __name__ == "__main__":
    unittest.main()
