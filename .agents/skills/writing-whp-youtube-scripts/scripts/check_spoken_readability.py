#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


HARD_MAX_WORDS = 25
REVIEW_MIN_WORDS = 21
STRUCTURAL_GRADE_FLOOR = 12.0

APPENDIX_RE = re.compile(r"^##\s+Appendix\b", re.IGNORECASE)
BLOCKQUOTE_RE = re.compile(r"^\s*>\s?(.*)$")
EVIDENCE_LINK_RE = re.compile(
    r"\s*\[F-\d{3}\]\(\s*[^)]+\s*\)",
    re.IGNORECASE,
)
EVIDENCE_MARKER_RE = re.compile(r"\s*\[?F-\d{3}\]?", re.IGNORECASE)
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
WORD_RE = re.compile(r"[A-Za-z0-9]+(?:[’'-][A-Za-z0-9]+)*")
SENTENCE_END_RE = re.compile(r"[.!?]+[”\"’']*(?=\s+|$)")
RELATIONSHIP_RE = re.compile(
    r"\b(?:but|because|although|though|whereas|unless|until|while|which|who|"
    r"whose|if|even\s+when|when)\b",
    re.IGNORECASE,
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


@dataclass(frozen=True)
class SpokenSentence:
    line: int
    text: str


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
    text = EVIDENCE_MARKER_RE.sub("", text)
    text = MARKDOWN_LINK_RE.sub(r"\1", text)
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
    if len(token) == 1 and token.isalpha():
        return True
    return bool(re.fullmatch(r"(?:[A-Za-z]\.)+[A-Za-z]?", token))


def _split_sentences(text: str) -> list[str]:
    sentences: list[str] = []
    start = 0
    for match in SENTENCE_END_RE.finditer(text):
        if _looks_like_abbreviation(text, match.end()):
            continue
        sentence = text[start : match.end()].strip()
        if sentence:
            sentences.append(sentence)
        start = match.end()

    remainder = text[start:].strip()
    if remainder:
        sentences.append(remainder)
    return sentences


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
        if APPENDIX_RE.match(raw_line):
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
        for sentence in _split_sentences(paragraph):
            sentences.append(SpokenSentence(line=line_number, text=sentence))
    return sentences


def _word_stats(text: str) -> tuple[int, int]:
    words = WORD_RE.findall(text)
    character_count = sum(
        len(re.sub(r"[^A-Za-z0-9]", "", word)) for word in words
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
            "Confirm that every 21-25-word review item passed a manual "
            "first-hearing check."
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
