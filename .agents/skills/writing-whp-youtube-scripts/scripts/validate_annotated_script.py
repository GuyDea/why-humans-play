#!/usr/bin/env python3
"""Validate the deterministic structure of an annotated YouTube script."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import re


READINESS_STATES = {
    "RESEARCH-DRAFT",
    "EDITORIAL-DRAFT",
    "RECORD-READY",
    "PICTURE-LOCKED",
}
DELIVERABLE_VALUES = {"FULL-SCRIPT", "TARGETED-ARTIFACT"}
PERSONAL_DECISIONS = {"INPUT-REQUESTED", "COMPLETED", "OMIT"}
CLAIM_STATUSES = {
    "VERIFIED",
    "CORROBORATED",
    "REPORTED",
    "UNVERIFIED-EXAMPLE",
    "DISPUTED",
    "REJECTED",
}
FIXED_ASSET_STATUSES = {
    "OWNED",
    "CC0",
    "PERMISSION-ON-FILE",
    "COMMERCIAL-LICENSE",
    "FAIR-USE-CANDIDATE-NOT-CLEARED",
    "REFERENCE-ONLY-RIGHTS-UNVERIFIED",
    "UNKNOWN-BLOCKED",
}
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

END_HEADINGS = (
    "Evidence references",
    "Visual and archival sources",
    "Unverified or disputed material",
    "Attribution copy",
)
BLOCKED_RECORD_READY_ASSET_STATUSES = {
    "UNKNOWN-BLOCKED",
    "REFERENCE-ONLY-RIGHTS-UNVERIFIED",
    "FAIR-USE-CANDIDATE-NOT-CLEARED",
}
LIMITATION_SENTENCE = (
    "Structural validation only: this does not verify factual truth, source "
    "trustworthiness, copyright ownership, fair use, or editorial quality."
)

BEAT_HEADING_RE = re.compile(r"^## Beat (\d{2})(?=[ \t]|$)", re.MULTILINE)
BEAT_CANDIDATE_RE = re.compile(r"^## Beat(?:[ \t].*)?$", re.MULTILINE)
REFERENCES_HEADING_RE = re.compile(
    r"^## References and source materials\s*$", re.MULTILINE
)
REFERENCE_ID_RE = re.compile(r"`([FA]-\d{3})`")
RECORD_HEADING_RE = re.compile(r"^#### ([FA]-\d{3})(?:\s|$)", re.MULTILINE)
LEVEL_THREE_HEADING_RE = re.compile(
    r"^### ([^#\r\n].*?)[ \t]*$", re.MULTILINE
)
FIELD_RE = re.compile(
    r"^[ \t]*-[ \t]+\*\*(.+?):\*\*[ \t]*(.*)$", re.MULTILINE
)
VERSIONED_CC_RE = re.compile(
    r"^CC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+(?:\.\d+)+$"
)
PERSONAL_ID_RE = re.compile(r"^PI-\d{3}$")
PERSONAL_MARKER_RE = re.compile(r"<!-- PI-(\d{3}): Martin input -->")
FENCE_LINE_RE = re.compile(
    r"^[ ]{0,3}(?P<quote>>[ \t]?[ ]{0,3})?"
    r"(?P<fence>`{3,}|~{3,})(?P<rest>.*)$"
)
APPENDIX_HEADING_RE = re.compile(r"^## Appendix[ \t]*$", re.MULTILINE)
NUMBERED_BEAT_HEADING_RE = re.compile(
    r"^## ([1-9]\d*)\. ([^\r\n]+?)[ \t]*$", re.MULTILINE
)
NUMBERED_BEAT_CANDIDATE_RE = re.compile(r"^## \d+\..*$", re.MULTILINE)
APPENDIX_LEVEL_THREE_RE = re.compile(
    r"^### ([^#\r\n].*?)[ \t]*$", re.MULTILINE
)
APPENDIX_BEAT_NAME_RE = re.compile(r"^Beat (\d{2}) — (\S.*)$")


@dataclass(frozen=True)
class Record:
    """One evidence or asset record parsed from a level-four heading."""

    record_id: str
    body: str
    heading_start: int


@dataclass(frozen=True)
class DocumentRegions:
    """Structural regions split around the document's references heading."""

    header: str
    beats: str
    before_references: str
    references: str
    reference_heading_count: int
    malformed_beat_headings: tuple[str, ...]
    post_reference_beat_ids: tuple[str, ...]


def _mask_fenced_blocks(text: str) -> str:
    """Mask fenced Markdown blocks while preserving character and line positions."""

    masked_lines: list[str] = []
    fence_character: str | None = None
    fence_length = 0
    fence_in_blockquote = False
    for line in text.splitlines(keepends=True):
        content = line.rstrip("\r\n")
        if fence_character is None:
            opening = FENCE_LINE_RE.match(content)
            if opening is None:
                masked_lines.append(line)
                continue
            marker = opening.group("fence")
            fence_character = marker[0]
            fence_length = len(marker)
            fence_in_blockquote = opening.group("quote") is not None
        else:
            closing = FENCE_LINE_RE.match(content)
            if closing is not None:
                marker = closing.group("fence")
                if (
                    (closing.group("quote") is not None) == fence_in_blockquote
                    and marker[0] == fence_character
                    and len(marker) >= fence_length
                    and not closing.group("rest").strip()
                ):
                    fence_character = None
                    fence_length = 0
                    fence_in_blockquote = False
        masked_lines.append(re.sub(r"[^\r\n]", " ", line))
    return "".join(masked_lines)


def _level_three_blocks(text: str, masked_text: str) -> list[tuple[str, str]]:
    """Return appendix level-three names and original bodies in document order."""

    matches = list(APPENDIX_LEVEL_THREE_RE.finditer(masked_text))
    blocks: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks.append((match.group(1).rstrip(), text[match.end() : end]))
    return blocks


def _promote_appendix_headings(body: str) -> str:
    """Convert appendix level-four/five headings to the legacy validator levels."""

    promoted: list[str] = []
    for line in body.splitlines(keepends=True):
        if line.startswith("##### "):
            promoted.append(line[1:])
        elif line.startswith("#### "):
            promoted.append(line[1:])
        else:
            promoted.append(line)
    return "".join(promoted)


def _normalize_appendix_document(text: str) -> tuple[str, list[str]]:
    """Translate the narration-first appendix format for the legacy rule engine."""

    masked = _mask_fenced_blocks(text)
    appendix_headings = list(APPENDIX_HEADING_RE.finditer(masked))
    errors: list[str] = []
    if len(appendix_headings) != 1:
        errors.append(
            f"Document must contain exactly one Appendix heading; found {len(appendix_headings)}."
        )
        return text, errors

    appendix_heading = appendix_headings[0]
    narration_text = text[: appendix_heading.start()]
    masked_narration = masked[: appendix_heading.start()]
    appendix_text = text[appendix_heading.end() :]
    masked_appendix = masked[appendix_heading.end() :]

    if re.search(r"^# [^#\r\n]", masked_appendix, re.MULTILINE):
        errors.append("Appendix may not contain an H1 heading.")
    if re.search(r"^## [^#\r\n]", masked_appendix, re.MULTILINE):
        errors.append("Appendix may not contain additional level-two headings.")
    first_appendix_section = APPENDIX_LEVEL_THREE_RE.search(masked_appendix)
    if (
        first_appendix_section is None
        or masked_appendix[: first_appendix_section.start()].strip()
    ):
        errors.append(
            "Appendix must begin directly with Script metadata; no heading or prose "
            "may precede it."
        )

    beat_matches = list(NUMBERED_BEAT_HEADING_RE.finditer(masked_narration))
    candidate_starts = {
        match.start() for match in NUMBERED_BEAT_CANDIDATE_RE.finditer(masked_narration)
    }
    valid_starts = {match.start() for match in beat_matches}
    for start in sorted(candidate_starts - valid_starts):
        line_end = masked_narration.find("\n", start)
        if line_end == -1:
            line_end = len(masked_narration)
        errors.append(
            "Malformed numbered beat heading: "
            + narration_text[start:line_end].strip()
            + "."
        )
    if not beat_matches:
        errors.append("At least one numbered narration beat is required before Appendix.")
        return text, errors

    preamble = narration_text[: beat_matches[0].start()]
    h1_matches = list(re.finditer(r"^# [^#\r\n]\S?.*$", preamble, re.MULTILINE))
    first_non_whitespace = re.search(r"\S", preamble)
    if (
        len(h1_matches) != 1
        or first_non_whitespace is None
        or h1_matches[0].start() != first_non_whitespace.start()
    ):
        errors.append("Document must begin with exactly one H1 episode heading.")
    preamble_without_h1 = (
        preamble[: h1_matches[0].start()] + preamble[h1_matches[0].end() :]
        if h1_matches
        else preamble
    )
    if preamble_without_h1.strip():
        errors.append(
            "Only the episode H1 may appear before the first numbered narration beat."
        )

    narration_beats: list[tuple[str, str, str]] = []
    narration_numbers: list[int] = []
    for index, match in enumerate(beat_matches):
        end = (
            beat_matches[index + 1].start()
            if index + 1 < len(beat_matches)
            else len(narration_text)
        )
        number = int(match.group(1))
        title = match.group(2).strip()
        body = narration_text[match.end() : end]
        if number > 99:
            errors.append(f"Narration beat {number} exceeds the two-digit appendix range.")
        narration_numbers.append(number)
        for line in body.splitlines():
            if line.strip() and re.match(r"^[ ]{0,3}>", line) is None:
                errors.append(
                    f"Beat {number:02d} narration body may contain only spoken "
                    "blockquotes and blank lines."
                )
                break
        if not any(
            re.match(r"^[ ]{0,3}>[ \t]?\S", line)
            for line in body.splitlines()
        ):
            errors.append(f"Beat {number:02d} narration must contain spoken blockquote text.")
        narration_beats.append((f"{number:02d}", title, body))

    if len(set(narration_numbers)) != len(narration_numbers):
        errors.append("Numbered narration beat IDs must be unique.")
    if any(
        current <= previous
        for previous, current in zip(narration_numbers, narration_numbers[1:])
    ):
        errors.append("Numbered narration beats must be strictly ascending.")

    appendix_blocks = _level_three_blocks(appendix_text, masked_appendix)
    appendix_names = [name for name, _ in appendix_blocks]
    if not appendix_names or appendix_names[0] != "Script metadata":
        errors.append("Script metadata must be the first appendix section.")
    if (
        "References and source materials" in appendix_names
        and appendix_names[-1] != "References and source materials"
    ):
        errors.append(
            "References and source materials must be the final appendix section."
        )
    metadata_blocks = [body for name, body in appendix_blocks if name == "Script metadata"]
    reference_blocks = [
        body for name, body in appendix_blocks if name == "References and source materials"
    ]
    if len(metadata_blocks) != 1:
        errors.append(
            "Appendix must contain exactly one Script metadata section; "
            f"found {len(metadata_blocks)}."
        )
    if len(reference_blocks) != 1:
        errors.append(
            "Appendix must contain exactly one References and source materials section; "
            f"found {len(reference_blocks)}."
        )

    appendix_beats: list[tuple[str, str, str]] = []
    for name, body in appendix_blocks:
        match = APPENDIX_BEAT_NAME_RE.fullmatch(name)
        if match is not None:
            appendix_beats.append((match.group(1), match.group(2).strip(), body))

    narration_keys = [(beat_id, title) for beat_id, title, _ in narration_beats]
    appendix_keys = [(beat_id, title) for beat_id, title, _ in appendix_beats]
    if narration_keys != appendix_keys:
        errors.append(
            "Appendix beat mappings must match the narration beat numbers and titles "
            "in the same order."
        )

    appendix_by_key = {
        (beat_id, title): body for beat_id, title, body in appendix_beats
    }
    legacy_beats: list[str] = []
    for beat_id, title, narration_body in narration_beats:
        appendix_body = appendix_by_key.get((beat_id, title), "")
        field_values = _field_values(appendix_body)
        time_values = field_values.get("Time", [])
        target_values = field_values.get("Target", [])
        if len(time_values) != 1 or not time_values[0]:
            errors.append(f"Appendix Beat {beat_id} requires exactly one non-empty Time field.")
        if len(target_values) != 1 or not target_values[0]:
            errors.append(f"Appendix Beat {beat_id} requires exactly one non-empty Target field.")
        if re.search(r"^#### Narration[ \t]*$", appendix_body, re.MULTILINE):
            errors.append(
                f"Appendix Beat {beat_id} must not repeat a Narration section."
            )
        production_body = re.sub(
            r"^[ \t]*-[ \t]+\*\*(?:Time|Target):\*\*[^\r\n]*(?:\r?\n)?",
            "",
            appendix_body,
            flags=re.MULTILINE,
        )
        legacy_beats.append(
            f"## Beat {beat_id} — {title}\n"
            f"_Time: {time_values[0] if time_values else ''} · "
            f"Target: {target_values[0] if target_values else ''}_\n\n"
            "### Narration\n"
            + narration_body.strip("\r\n")
            + "\n\n"
            + _promote_appendix_headings(production_body).strip()
            + "\n"
        )

    metadata = metadata_blocks[0].strip() if metadata_blocks else ""
    references = (
        _promote_appendix_headings(reference_blocks[0]).strip()
        if reference_blocks
        else ""
    )
    legacy = (
        preamble.rstrip()
        + "\n\n"
        + metadata
        + "\n\n"
        + "\n".join(legacy_beats)
        + "\n## References and source materials\n\n"
        + references
        + "\n"
    )
    return legacy, errors


def _document_regions(text: str) -> DocumentRegions:
    """Split masked text once so all parsers use the same document boundaries."""

    reference_headings = list(REFERENCES_HEADING_RE.finditer(text))
    if reference_headings:
        reference_heading = reference_headings[0]
        before_references = text[: reference_heading.start()]
        references = text[reference_heading.end() :]
    else:
        before_references = text
        references = ""

    first_beat = BEAT_HEADING_RE.search(before_references)
    if first_beat is None:
        header = before_references
        beats = ""
    else:
        header = before_references[: first_beat.start()]
        beats = before_references[first_beat.start() :]

    valid_beat_starts = {match.start() for match in BEAT_HEADING_RE.finditer(text)}
    malformed_beat_headings = tuple(
        match.group(0)
        for match in BEAT_CANDIDATE_RE.finditer(text)
        if match.start() not in valid_beat_starts
    )

    return DocumentRegions(
        header=header,
        beats=beats,
        before_references=before_references,
        references=references,
        reference_heading_count=len(reference_headings),
        malformed_beat_headings=malformed_beat_headings,
        post_reference_beat_ids=tuple(BEAT_HEADING_RE.findall(references)),
    )


def _field_values(text: str) -> dict[str, list[str]]:
    """Return every value found for each Markdown field in *text*."""

    fields: dict[str, list[str]] = {}
    for match in FIELD_RE.finditer(text):
        fields.setdefault(match.group(1), []).append(match.group(2).strip())
    return fields


def _parse_fields(text: str) -> dict[str, str]:
    """Return the first value found for each Markdown field in *text*."""

    return {field: values[0] for field, values in _field_values(text).items()}


def _beat_blocks(text: str) -> list[tuple[str, str]]:
    """Return beat IDs and their bodies in document order."""

    matches = list(BEAT_HEADING_RE.finditer(text))
    blocks: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks.append((match.group(1), text[match.start() : end]))
    return blocks


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


def _section_body(block: str, section: str) -> str | None:
    """Return the first exact beat section body, when present."""

    bodies = _section_bodies(block, section)
    return bodies[0] if bodies else None


def _extract_narration_from_masked(masked_text: str) -> str:
    """Extract narration from text whose fenced blocks are already masked."""

    regions = _document_regions(masked_text)
    paragraphs: list[str] = []
    for _, block in _beat_blocks(regions.beats):
        body = _section_body(block, "Narration")
        if body is None:
            continue
        current: list[str] = []
        for line in body.splitlines():
            match = re.match(r"^[ ]{0,3}>[ \t]?(.*)$", line)
            if match is None:
                if current:
                    paragraphs.append(" ".join(current))
                    current = []
                continue
            quoted = match.group(1)
            spoken = PERSONAL_MARKER_RE.sub("", quoted).strip()
            if spoken:
                current.append(spoken)
            elif not PERSONAL_MARKER_RE.search(quoted) and current:
                paragraphs.append(" ".join(current))
                current = []
        if current:
            paragraphs.append(" ".join(current))
    return "\n\n".join(paragraphs)


def extract_narration(text: str) -> str:
    """Return spoken blockquote copy under Narration headings, without input markers."""

    masked = _mask_fenced_blocks(text)
    if APPENDIX_HEADING_RE.search(masked):
        text, _ = _normalize_appendix_document(text)
        masked = _mask_fenced_blocks(text)
    return _extract_narration_from_masked(masked)


def count_narration_words(text: str) -> int:
    """Count whitespace-delimited spoken words after narration extraction."""

    return len(extract_narration(text).split())


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


def _structured_blocks(
    beats_text: str, section: str
) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    for beat_id, beat in _beat_blocks(beats_text):
        blocks.extend(
            (beat_id, body) for body in _section_bodies(beat, section)
        )
    return blocks


def _parse_records(references_text: str) -> list[Record]:
    """Parse level-four evidence and asset records below the references heading."""

    matches = list(RECORD_HEADING_RE.finditer(references_text))
    records: list[Record] = []
    for index, match in enumerate(matches):
        next_record = (
            matches[index + 1].start()
            if index + 1 < len(matches)
            else len(references_text)
        )
        next_section_match = re.search(
            r"^### [^#].*$", references_text[match.end() :], re.MULTILINE
        )
        next_section = (
            match.end() + next_section_match.start()
            if next_section_match is not None
            else len(references_text)
        )
        end = min(next_record, next_section)
        records.append(
            Record(match.group(1), references_text[match.end() : end], match.start())
        )
    return records


def _end_section_ranges(references_text: str) -> dict[str, tuple[int, int]]:
    """Return body ranges for required end sections found in the references region."""

    headings = list(LEVEL_THREE_HEADING_RE.finditer(references_text))
    ranges: dict[str, tuple[int, int]] = {}
    for index, heading in enumerate(headings):
        name = heading.group(1).rstrip()
        if name not in END_HEADINGS or name in ranges:
            continue
        end = (
            headings[index + 1].start()
            if index + 1 < len(headings)
            else len(references_text)
        )
        ranges[name] = (heading.end(), end)
    return ranges


def _has_web_url(value: str) -> bool:
    return value.startswith(("http://", "https://"))


def _has_public_domain_basis_and_jurisdiction(rights_basis: str) -> bool:
    """Check for separate basis and jurisdiction wording, not legal validity."""

    if not rights_basis.strip():
        return False
    jurisdiction_after = re.search(
        r"\bjurisdiction\b[ \t]*"
        r"(?:(?:is|of|in|for|under)\b[ \t]*|[:=-][ \t]*)?"
        r"([^;\n]+)",
        rights_basis,
        re.IGNORECASE,
    )
    jurisdiction_span: tuple[int, int] | None = None
    if jurisdiction_after is not None and jurisdiction_after.group(1).strip(
        " \t;,.:-"
    ):
        jurisdiction_span = jurisdiction_after.span()
    else:
        jurisdiction_before = re.search(
            r"\b(?:under|in|for|of)[ \t]+([^;\n]+?)[ \t]+jurisdiction\b",
            rights_basis,
            re.IGNORECASE,
        )
        if jurisdiction_before is not None and jurisdiction_before.group(1).strip(
            " \t;,.:-"
        ):
            jurisdiction_span = jurisdiction_before.span()

    if jurisdiction_span is None:
        return False
    basis_statement = (
        rights_basis[: jurisdiction_span[0]] + rights_basis[jurisdiction_span[1] :]
    ).strip(" \t;,.:-")
    return bool(basis_statement)


def _validate_headers(header_text: str, errors: list[str]) -> dict[str, str]:
    field_values = _field_values(header_text)
    fields = _parse_fields(header_text)
    for field in HEADER_FIELDS:
        values = field_values.get(field, [])
        if not values:
            errors.append(f"Missing required header field: {field}.")
        elif len(values) > 1:
            errors.append(f"Header repeats required field: {field}.")
        elif not values[0]:
            errors.append(
                f"Required header field {field} must have a non-whitespace value."
            )

    status = fields.get("Status")
    if status is not None and status not in READINESS_STATES:
        errors.append(f"Invalid readiness Status: {status!r}.")

    deliverable = fields.get("Deliverable")
    if deliverable is not None and deliverable not in DELIVERABLE_VALUES:
        errors.append(f"Invalid Deliverable: {deliverable!r}.")

    return fields


def _validate_beats(text: str, errors: list[str]) -> None:
    beats = _beat_blocks(text)
    if not beats:
        errors.append("At least one beat with a two-digit ID is required.")
        return

    ids = [beat_id for beat_id, _ in beats]
    seen: set[str] = set()
    for beat_id in ids:
        if beat_id in seen:
            errors.append(f"Duplicate beat ID: {beat_id}.")
        seen.add(beat_id)

    if any(int(current) <= int(previous) for previous, current in zip(ids, ids[1:])):
        errors.append("Beat IDs must be unique and strictly ascending.")

    for beat_id, block in beats:
        section_bodies: dict[str, str] = {}
        for section in BEAT_SECTIONS:
            body = _section_body(block, section)
            if body is None:
                errors.append(f"Beat {beat_id} is missing required section: {section}.")
            else:
                section_bodies[section] = body
                if not body.strip():
                    errors.append(
                        f"Beat {beat_id} section {section} must have non-whitespace content."
                    )

        motion = section_bodies.get("Motion / edit")
        if motion is None:
            continue
        purpose = re.search(
            r"^[ \t]*(?:-[ \t]+)?\*\*Animation purpose:\*\*[ \t]*(\S.*)$",
            motion,
            re.MULTILINE,
        )
        no_animation = re.search(
            r"^[ \t]*(?:-[ \t]+)?No animation\s+—\s*\S", motion, re.MULTILINE
        )
        if purpose is None and no_animation is None:
            errors.append(
                f"Beat {beat_id} Motion / edit requires a non-empty animation purpose "
                "or an explicit 'No animation —' explanation."
            )


def _validate_personal_and_application_blocks(
    beats_text: str,
    masked_text: str,
    deliverable: str | None,
    readiness_status: str | None,
    errors: list[str],
) -> None:
    personal_blocks = [
        (beat_id, beat, body)
        for beat_id, beat in _beat_blocks(beats_text)
        for body in _section_bodies(beat, "Personal input")
    ]
    application_blocks = _structured_blocks(beats_text, "Viewer application")
    personal_count = len(_section_bodies(masked_text, "Personal input"))
    application_count = len(_section_bodies(masked_text, "Viewer application"))
    personal_outside_beats = personal_count - len(personal_blocks)
    application_outside_beats = application_count - len(application_blocks)

    if deliverable == "FULL-SCRIPT" and personal_count != 1:
        errors.append(
            "FULL-SCRIPT requires exactly one Personal input block; "
            f"found {personal_count}."
        )
    if deliverable == "FULL-SCRIPT" and application_count != 1:
        errors.append(
            "FULL-SCRIPT requires exactly one Viewer application block; "
            f"found {application_count}."
        )
    if personal_outside_beats:
        errors.append(
            "Personal input block outside a beat: "
            f"found {personal_outside_beats}."
        )
    if application_outside_beats:
        errors.append(
            "Viewer application block outside a beat: "
            f"found {application_outside_beats}."
        )

    all_markers = [
        f"PI-{match.group(1)}" for match in PERSONAL_MARKER_RE.finditer(masked_text)
    ]
    consumed_markers: list[str] = []
    seen_personal_ids: set[str] = set()
    for beat_id, beat, body in personal_blocks:
        fields = _validate_structured_fields(
            beat_id,
            "Personal input",
            body,
            PERSONAL_INPUT_FIELDS,
            errors,
        )
        personal_id = fields.get("ID")
        if personal_id:
            if PERSONAL_ID_RE.fullmatch(personal_id) is None:
                errors.append(
                    f"Beat {beat_id} Personal input has invalid ID: {personal_id!r}."
                )
            if personal_id in seen_personal_ids:
                errors.append(f"Duplicate personal input ID: {personal_id}.")
            else:
                seen_personal_ids.add(personal_id)

        decision = fields.get("Decision")
        if decision and decision not in PERSONAL_DECISIONS:
            errors.append(
                f"Beat {beat_id} Personal input has invalid Decision: {decision!r}."
            )

        narration = _section_body(beat, "Narration") or ""
        narration_markers = [
            f"PI-{match.group(1)}"
            for match in PERSONAL_MARKER_RE.finditer(narration)
        ]
        if decision == "INPUT-REQUESTED":
            matching_count = narration_markers.count(personal_id)
            if matching_count != 1:
                errors.append(
                    f"Beat {beat_id} INPUT-REQUESTED requires exactly one matching "
                    f"narration marker for {personal_id}; found {matching_count}."
                )
            elif PERSONAL_ID_RE.fullmatch(personal_id or "") is not None:
                consumed_markers.append(personal_id)
            if readiness_status != "RESEARCH-DRAFT":
                errors.append(
                    f"Beat {beat_id} INPUT-REQUESTED is allowed only in "
                    "RESEARCH-DRAFT."
                )
        elif decision in {"COMPLETED", "OMIT"} and narration_markers:
            errors.append(
                f"Beat {beat_id} Decision {decision} must not retain a personal "
                "input marker."
            )

    remaining_markers = list(all_markers)
    for marker in consumed_markers:
        if marker in remaining_markers:
            remaining_markers.remove(marker)
    for marker in sorted(set(remaining_markers)):
        errors.append(f"Found orphan personal input marker: {marker}.")

    for beat_id, body in application_blocks:
        _validate_structured_fields(
            beat_id,
            "Viewer application",
            body,
            VIEWER_APPLICATION_FIELDS,
            errors,
        )


def _validate_word_count(
    masked_text: str,
    header_fields: dict[str, str],
    errors: list[str],
) -> None:
    stated = header_fields.get("Word count")
    if stated is None or not stated:
        return
    if re.fullmatch(r"\d+", stated) is None:
        errors.append("Word count must be a non-negative integer.")
        return
    actual = len(_extract_narration_from_masked(masked_text).split())
    normalized_stated = stated.lstrip("0") or "0"
    if normalized_stated != str(actual):
        errors.append(
            f"Word count metadata {stated} does not match extracted narration "
            f"count {actual}."
        )


def _validate_record_fields(record: Record, errors: list[str]) -> dict[str, str]:
    field_values = _field_values(record.body)
    fields = _parse_fields(record.body)
    required = EVIDENCE_FIELDS if record.record_id.startswith("F-") else ASSET_FIELDS
    for field in required:
        values = field_values.get(field, [])
        if not values:
            errors.append(f"Record {record.record_id} is missing required field: {field}.")
        elif len(values) > 1:
            errors.append(
                f"Record {record.record_id} repeats required field: {field}."
            )
        elif field != "Direct production file" and not values[0]:
            errors.append(
                f"Record {record.record_id} field {field} must have a "
                "non-whitespace value."
            )
    return fields


def _validate_evidence_record(
    record: Record, fields: dict[str, str], errors: list[str]
) -> None:
    original_url = fields.get("Original URL")
    if original_url is not None and not _has_web_url(original_url):
        errors.append(
            f"Record {record.record_id} Original URL must begin with http:// or https://."
        )

    status = fields.get("Status")
    if status is not None and status not in CLAIM_STATUSES:
        errors.append(f"Record {record.record_id} has invalid claim Status: {status!r}.")


def _valid_asset_status(status: str, rights_basis: str) -> bool:
    if status in FIXED_ASSET_STATUSES:
        return True
    if VERSIONED_CC_RE.fullmatch(status):
        return True
    if status == "PUBLIC-DOMAIN":
        return _has_public_domain_basis_and_jurisdiction(rights_basis)
    return False


def _validate_asset_record(
    record: Record, fields: dict[str, str], errors: list[str]
) -> None:
    for field in ("Original asset page", "Direct production file"):
        value = fields.get(field)
        if value is not None and (field != "Direct production file" or value):
            if not _has_web_url(value):
                errors.append(
                    f"Record {record.record_id} {field} must begin with "
                    "http:// or https://."
                )

    status = fields.get("Status")
    if status is None:
        return
    rights_basis = fields.get("Rights basis", "")
    if not _valid_asset_status(status, rights_basis):
        if status == "PUBLIC-DOMAIN":
            errors.append(
                f"Record {record.record_id} status PUBLIC-DOMAIN requires a "
                "non-empty public-domain basis and jurisdiction in Rights basis."
            )
        else:
            errors.append(f"Record {record.record_id} has invalid asset Status: {status!r}.")


def _validate_references(
    reference_text: str,
    references_text: str,
    readiness_status: str | None,
    errors: list[str],
) -> None:
    referenced_ids = set(REFERENCE_ID_RE.findall(reference_text))
    records = _parse_records(references_text)
    required_heading_order = tuple(
        match.group(1).rstrip()
        for match in LEVEL_THREE_HEADING_RE.finditer(references_text)
        if match.group(1).rstrip() in END_HEADINGS
    )
    if required_heading_order != END_HEADINGS:
        errors.append(
            "Required end headings must appear exactly once in this exact order: "
            + ", ".join(END_HEADINGS)
            + "."
        )

    section_ranges = _end_section_ranges(references_text)
    records_by_id: dict[str, list[Record]] = {}
    fields_by_record: dict[int, dict[str, str]] = {}
    for record in records:
        records_by_id.setdefault(record.record_id, []).append(record)
        expected_section = (
            "Evidence references"
            if record.record_id.startswith("F-")
            else "Visual and archival sources"
        )
        expected_range = section_ranges.get(expected_section)
        if expected_range is not None and not (
            expected_range[0] <= record.heading_start < expected_range[1]
        ):
            errors.append(
                f"Record {record.record_id} must be under {expected_section}."
            )
        fields = _validate_record_fields(record, errors)
        fields_by_record[id(record)] = fields
        if record.record_id.startswith("F-"):
            _validate_evidence_record(record, fields, errors)
        else:
            _validate_asset_record(record, fields, errors)

    for record_id in sorted(referenced_ids):
        count = len(records_by_id.get(record_id, []))
        if count == 0:
            errors.append(f"Missing record for referenced ID {record_id}.")
        elif count > 1:
            errors.append(f"Duplicate records for referenced ID {record_id}: found {count}.")

    for record_id in sorted(records_by_id):
        record_count = len(records_by_id[record_id])
        if record_id not in referenced_ids:
            errors.append(f"Orphan record {record_id} is not referenced above the references heading.")
            if record_count > 1:
                errors.append(f"Duplicate records for orphan ID {record_id}: found {record_count}.")

    for heading in END_HEADINGS:
        if not re.search(rf"^### {re.escape(heading)}[ \t]*$", references_text, re.MULTILINE):
            errors.append(f"Missing required end heading: {heading}.")

    if readiness_status != "RECORD-READY":
        return

    for record_id in sorted(referenced_ids):
        for record in records_by_id.get(record_id, []):
            status = fields_by_record[id(record)].get("Status")
            if record_id.startswith("F-") and status == "REJECTED":
                errors.append(
                    f"RECORD-READY cannot include claim {record_id} with status REJECTED."
                )
            elif (
                record_id.startswith("A-")
                and status in BLOCKED_RECORD_READY_ASSET_STATUSES
            ):
                errors.append(
                    f"RECORD-READY cannot use referenced asset {record_id} with "
                    f"status {status}."
                )


def _validate_legacy_document(text: str) -> list[str]:
    """Run the original rule engine against the normalized annotated document."""

    masked_text = _mask_fenced_blocks(text)
    regions = _document_regions(masked_text)
    errors: list[str] = []
    if regions.reference_heading_count != 1:
        errors.append(
            "Document must contain exactly one References and source materials "
            f"heading; found {regions.reference_heading_count}."
        )
    for heading in regions.malformed_beat_headings:
        errors.append(
            "Malformed beat heading must use exactly two digits followed by "
            f"whitespace or end of line: {heading!r}."
        )
    header_fields = _validate_headers(regions.header, errors)
    _validate_beats(regions.beats, errors)
    _validate_personal_and_application_blocks(
        regions.beats,
        masked_text,
        header_fields.get("Deliverable"),
        header_fields.get("Status"),
        errors,
    )
    _validate_word_count(masked_text, header_fields, errors)
    for beat_id in regions.post_reference_beat_ids:
        errors.append(f"Beat {beat_id} appears after the references heading.")
    _validate_references(
        regions.before_references,
        regions.references,
        header_fields.get("Status"),
        errors,
    )
    return errors


def validate_document(text: str) -> list[str]:
    """Return human-readable structural errors; an empty list means structurally valid."""

    masked_text = _mask_fenced_blocks(text)
    if APPENDIX_HEADING_RE.search(masked_text):
        normalized, format_errors = _normalize_appendix_document(text)
        return format_errors + _validate_legacy_document(normalized)
    return _validate_legacy_document(text)


def main(argv: list[str] | None = None) -> int:
    """Print every error and return 0 for valid, 1 for invalid, 2 for unreadable input."""

    parser = argparse.ArgumentParser(
        description="Validate an annotated Why Humans Play YouTube script."
    )
    parser.add_argument("input", nargs="?", help="UTF-8 Markdown file to validate")
    try:
        args = parser.parse_args(argv)
    except SystemExit as exc:
        print(LIMITATION_SENTENCE)
        return int(exc.code)

    if args.input is None:
        print("ERROR: no input file was provided.")
        print(LIMITATION_SENTENCE)
        return 2

    path = Path(args.input)
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        print(f"ERROR: cannot read input {str(path)!r}: {exc}")
        print(LIMITATION_SENTENCE)
        return 2

    errors = validate_document(text)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        result = 1
    else:
        print("PASS: annotated script is structurally valid")
        result = 0
    print(LIMITATION_SENTENCE)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
