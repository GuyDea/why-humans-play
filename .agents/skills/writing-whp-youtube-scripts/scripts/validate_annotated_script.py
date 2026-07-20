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
FIELD_RE = re.compile(
    r"^[ \t]*-[ \t]+\*\*(.+?):\*\*[ \t]*(.*)$", re.MULTILINE
)
VERSIONED_CC_RE = re.compile(
    r"^CC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+(?:\.\d+)+$"
)


@dataclass(frozen=True)
class Record:
    """One evidence or asset record parsed from a level-four heading."""

    record_id: str
    body: str


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
    for line in text.splitlines(keepends=True):
        content = line.rstrip("\r\n")
        if fence_character is None:
            opening = re.match(r"^[ ]{0,3}(`{3,}|~{3,}).*$", content)
            if opening is None:
                masked_lines.append(line)
                continue
            marker = opening.group(1)
            fence_character = marker[0]
            fence_length = len(marker)
        else:
            candidate = content.lstrip(" ")
            if len(content) - len(candidate) <= 3:
                candidate = candidate.rstrip(" \t")
                if (
                    len(candidate) >= fence_length
                    and set(candidate) == {fence_character}
                ):
                    fence_character = None
                    fence_length = 0
        masked_lines.append(re.sub(r"[^\r\n]", " ", line))
    return "".join(masked_lines)


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


def _parse_fields(text: str) -> dict[str, str]:
    """Return the first value found for each Markdown field in *text*."""

    fields: dict[str, str] = {}
    for match in FIELD_RE.finditer(text):
        fields.setdefault(match.group(1), match.group(2).strip())
    return fields


def _beat_blocks(text: str) -> list[tuple[str, str]]:
    """Return beat IDs and their bodies in document order."""

    matches = list(BEAT_HEADING_RE.finditer(text))
    blocks: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks.append((match.group(1), text[match.start() : end]))
    return blocks


def _section_body(block: str, section: str) -> str | None:
    """Return a beat section body, excluding the next level-three heading."""

    heading = re.search(
        rf"^### {re.escape(section)}[ \t]*$", block, re.MULTILINE
    )
    if heading is None:
        return None
    next_heading = re.search(r"^### .+$", block[heading.end() :], re.MULTILINE)
    if next_heading is None:
        return block[heading.end() :]
    return block[heading.end() : heading.end() + next_heading.start()]


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
        records.append(Record(match.group(1), references_text[match.end() : end]))
    return records


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
    fields = _parse_fields(header_text)
    for field in HEADER_FIELDS:
        if field not in fields:
            errors.append(f"Missing required header field: {field}.")

    status = fields.get("Status")
    if status is not None and status not in READINESS_STATES:
        errors.append(f"Invalid readiness Status: {status!r}.")

    for field in ("Target runtime", "Word count"):
        if field in fields and not fields[field]:
            errors.append(f"Header field {field} must have a value.")
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


def _validate_record_fields(record: Record, errors: list[str]) -> dict[str, str]:
    fields = _parse_fields(record.body)
    required = EVIDENCE_FIELDS if record.record_id.startswith("F-") else ASSET_FIELDS
    for field in required:
        if field not in fields:
            errors.append(f"Record {record.record_id} is missing required field: {field}.")
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
    records_by_id: dict[str, list[Record]] = {}
    fields_by_record: dict[int, dict[str, str]] = {}
    for record in records:
        records_by_id.setdefault(record.record_id, []).append(record)
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


def validate_document(text: str) -> list[str]:
    """Return human-readable structural errors; an empty list means structurally valid."""

    regions = _document_regions(_mask_fenced_blocks(text))
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
    for beat_id in regions.post_reference_beat_ids:
        errors.append(f"Beat {beat_id} appears after the references heading.")
    _validate_references(
        regions.before_references,
        regions.references,
        header_fields.get("Status"),
        errors,
    )
    return errors


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
