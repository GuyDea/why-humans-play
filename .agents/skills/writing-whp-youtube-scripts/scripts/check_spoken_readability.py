#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from script_markup import (
    APPENDIX_HEADING_RE,
    EVIDENCE_INDICATOR_PATTERN,
    WORD_RE,
)


HARD_MAX_WORDS = 25
REVIEW_MIN_WORDS = 21
STRUCTURAL_GRADE_FLOOR = 12.0

BLOCKQUOTE_RE = re.compile(r"^\s*>\s?(.*)$")
EVIDENCE_LINK_RE = re.compile(r"\s*" + EVIDENCE_INDICATOR_PATTERN)
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
BARE_URL_RE = re.compile(r"https?://\S+", re.IGNORECASE)
STORYTELLING_MARKUP_RE = re.compile(
    r"</?u>|(?<!\*)\*{1,3}(?!\*)"
)
SENTENCE_END_RE = re.compile(r"[.!?]+[”\"’']*(?=\s+|$)")
RELATIONSHIP_RE = re.compile(
    r"\b(?:but|because|although|though|whereas|unless|until|while|which|who|"
    r"whose|if|even\s+when|when)\b",
    re.IGNORECASE,
)
EXACT_PARTICIPANT_COUNT_RE = re.compile(
    r"\b(?:\d{2,3}|\d{1,3},\d{3})\s+"
    r"(?!(?:percent(?:age)?|per(?:\s+|-)cent)\b)"
    r"(?:[^\W\d_]+(?:[’'-][^\W\d_]+)*\s+){0,2}"
    r"(?:radiologists|participants|physicians|doctors|users|people|students|"
    r"undergraduates|subjects|experts|patients|nurses|clinicians)\b",
    re.IGNORECASE,
)
SUBSTANTIAL_QUOTATION_RE = re.compile(r"[“\"](?P<quotation>[^”\"]+)[”\"]")
SUBSTANTIAL_QUOTATION_REVIEW_REASON = (
    "substantial quotation requires verbatim-or-paraphrase memory review"
)
COMMON_ABBREVIATIONS = {
    "dr",
    "e.g",
    "i.e",
    "jr",
    "mr",
    "mrs",
    "ms",
    "prof",
    "sr",
    "st",
    "vs",
}
TERMINAL_ABBREVIATIONS = {
    "approx",
    "etc",
}


@dataclass(frozen=True)
class SpokenSentence:
    line: int
    text: str
    semantic_review_reason: str | None = None


@dataclass(frozen=True)
class ReadabilityFinding:
    line: int
    text: str
    word_count: int
    automated_readability_index: float
    relationship_count: int
    level: str
    reason: str


def _strip_non_spoken_annotations(text: str) -> str:
    text = HTML_COMMENT_RE.sub("", text)
    text = EVIDENCE_LINK_RE.sub("", text)
    text = MARKDOWN_LINK_RE.sub(r"\1", text)
    text = BARE_URL_RE.sub("", text)
    text = STORYTELLING_MARKUP_RE.sub("", text)
    return " ".join(text.split())


def _looks_like_abbreviation(text: str, end: int) -> bool:
    candidate = text[:end].rstrip("”\"’'")
    if not candidate.endswith("."):
        return False

    token_match = re.search(r"([A-Za-z](?:[A-Za-z.]*)?)\.$", candidate)
    if token_match is None:
        return False

    token = token_match.group(1)
    normalized = token.lower()
    if normalized in COMMON_ABBREVIATIONS:
        return True
    if normalized in TERMINAL_ABBREVIATIONS:
        remainder = text[end:].lstrip()
        return bool(remainder) and remainder[0].islower()
    if len(token) == 1 and token.isalpha():
        return True
    return bool(re.fullmatch(r"(?:[A-Za-z]\.)+[A-Za-z]?", token))


def _split_sentence_spans(text: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    start = 0
    for match in SENTENCE_END_RE.finditer(text):
        if _looks_like_abbreviation(text, match.end()):
            continue
        sentence_start = start
        sentence_end = match.end()
        while sentence_start < sentence_end and text[sentence_start].isspace():
            sentence_start += 1
        while sentence_end > sentence_start and text[sentence_end - 1].isspace():
            sentence_end -= 1
        if sentence_start < sentence_end:
            spans.append((sentence_start, sentence_end))
        start = match.end()

    sentence_start = start
    sentence_end = len(text)
    while sentence_start < sentence_end and text[sentence_start].isspace():
        sentence_start += 1
    while sentence_end > sentence_start and text[sentence_end - 1].isspace():
        sentence_end -= 1
    if sentence_start < sentence_end:
        spans.append((sentence_start, sentence_end))
    return spans


def _substantial_quotation_spans(text: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    for match in SUBSTANTIAL_QUOTATION_RE.finditer(text):
        if len(WORD_RE.findall(match.group("quotation"))) >= 8:
            spans.append(match.span("quotation"))
    return spans


def extract_spoken_sentences(markdown: str) -> list[SpokenSentence]:
    """Return spoken blockquote sentences before the document appendix."""

    paragraphs: list[tuple[int, str]] = []
    current: list[str] = []
    current_line = 0

    def flush() -> None:
        nonlocal current, current_line
        if current:
            paragraphs.append((current_line, " ".join(current)))
            current = []
            current_line = 0

    for line_number, raw_line in enumerate(markdown.splitlines(), start=1):
        if APPENDIX_HEADING_RE.fullmatch(raw_line):
            flush()
            break

        match = BLOCKQUOTE_RE.match(raw_line)
        if match is None:
            flush()
            continue

        spoken = _strip_non_spoken_annotations(match.group(1))
        if not spoken:
            flush()
            continue

        if not current:
            current_line = line_number
        current.append(spoken)

    flush()

    sentences: list[SpokenSentence] = []
    for line_number, paragraph in paragraphs:
        quotation_spans = _substantial_quotation_spans(paragraph)
        for sentence_start, sentence_end in _split_sentence_spans(paragraph):
            semantic_review_reason = None
            if any(
                sentence_start < quotation_end
                and quotation_start < sentence_end
                for quotation_start, quotation_end in quotation_spans
            ):
                semantic_review_reason = SUBSTANTIAL_QUOTATION_REVIEW_REASON
            sentences.append(
                SpokenSentence(
                    line=line_number,
                    text=paragraph[sentence_start:sentence_end],
                    semantic_review_reason=semantic_review_reason,
                )
            )
    return sentences


def _word_stats(text: str) -> tuple[int, int]:
    words = WORD_RE.findall(text)
    character_count = sum(
        character.isalnum() for word in words for character in word
    )
    return len(words), character_count


def _automated_readability_index(word_count: int, character_count: int) -> float:
    if word_count == 0:
        return 0.0
    return (
        4.71 * (character_count / word_count)
        + 0.5 * word_count
        - 21.43
    )


def _relationship_count(text: str) -> int:
    punctuation_count = sum(text.count(mark) for mark in (":", ";", "—", "–"))
    connective_count = len(RELATIONSHIP_RE.findall(text))
    return punctuation_count + connective_count


def _semantic_review_reason(text: str) -> str | None:
    if EXACT_PARTICIPANT_COUNT_RE.search(text):
        return "exact participant count requires spoken-number review"
    for match in SUBSTANTIAL_QUOTATION_RE.finditer(text):
        quotation_word_count, _ = _word_stats(match.group("quotation"))
        if quotation_word_count >= 8:
            return SUBSTANTIAL_QUOTATION_REVIEW_REASON
    return None


def analyze_markdown(markdown: str) -> list[ReadabilityFinding]:
    """Classify spoken sentences by length and structural readability."""

    findings: list[ReadabilityFinding] = []
    for sentence in extract_spoken_sentences(markdown):
        word_count, character_count = _word_stats(sentence.text)
        readability_index = _automated_readability_index(
            word_count,
            character_count,
        )
        relationship_count = _relationship_count(sentence.text)
        semantic_review_reason = (
            sentence.semantic_review_reason
            or _semantic_review_reason(sentence.text)
        )

        if word_count > HARD_MAX_WORDS:
            level = "fail"
            reason = (
                f"{word_count} spoken words exceeds the maximum of "
                f"{HARD_MAX_WORDS}"
            )
        elif (
            word_count >= 12
            and readability_index >= STRUCTURAL_GRADE_FLOOR
            and relationship_count >= 1
        ):
            level = "fail"
            reason = (
                "structurally difficult "
                f"(ARI {readability_index:.1f}; "
                f"{relationship_count} relationship marker"
                f"{'' if relationship_count == 1 else 's'})"
            )
        elif semantic_review_reason is not None:
            level = "review"
            reason = semantic_review_reason
        elif word_count >= REVIEW_MIN_WORDS:
            level = "review"
            reason = (
                f"{word_count} spoken words requires first-hearing review"
            )
        else:
            level = "pass"
            reason = "passes mechanical checks"

        findings.append(
            ReadabilityFinding(
                line=sentence.line,
                text=sentence.text,
                word_count=word_count,
                automated_readability_index=readability_index,
                relationship_count=relationship_count,
                level=level,
                reason=reason,
            )
        )
    return findings


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Check spoken WHP narration for difficult sentences.",
    )
    parser.add_argument(
        "--reviewed",
        action="store_true",
        help=(
            "Confirm that every length, spoken-number, and quotation review item "
            "passed a manual first-hearing and memory-delivery check."
        ),
    )
    parser.add_argument("script", type=Path, help="Markdown script to check.")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        markdown = args.script.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        print(f"Unable to read {args.script}: {error}", file=sys.stderr)
        return 2

    findings = analyze_markdown(markdown)
    if not findings:
        print(
            f"No spoken narration found in {args.script}.",
            file=sys.stderr,
        )
        return 2

    failures = [finding for finding in findings if finding.level == "fail"]
    reviews = [finding for finding in findings if finding.level == "review"]

    for finding in failures:
        print(
            f"FAIL line {finding.line}: {finding.reason}\n"
            f"  {finding.text}"
        )
    for finding in reviews:
        label = "REVIEWED" if args.reviewed else "REVIEW"
        print(
            f"{label} line {finding.line}: {finding.reason}\n"
            f"  {finding.text}"
        )

    if failures:
        print(
            f"Readability gate failed: {len(failures)} difficult sentence(s), "
            f"{len(reviews)} review item(s)."
        )
        return 1
    if reviews and not args.reviewed:
        print(
            "Readability gate blocked: first-hearing review is still required "
            f"for {len(reviews)} sentence(s)."
        )
        return 1

    print(
        "Readability gate passed: "
        f"{len(findings)} spoken sentence(s), no unresolved items."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
