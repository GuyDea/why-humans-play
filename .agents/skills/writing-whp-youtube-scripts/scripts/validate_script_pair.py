#!/usr/bin/env python3
"""Validate a raw/extended Why Humans Play script pair."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
from pathlib import Path
import re


EPISODE_RE = re.compile(r"^ep\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$")
STAGES = {"blueprint", "draft", "final"}
RAW_NAME = "script.raw.md"
EXTENDED_NAME = "script.extended.md"
PAIR_NAMES = {RAW_NAME, EXTENDED_NAME}
APPENDIX_SPLIT_RE = re.compile(
    r"\r?\n## Appendix[ \t]*(?:\r?\n|$)"
)
APPENDIX_HEADING_RE = re.compile(r"^## Appendix[ \t]*$")
H1_RE = re.compile(r"^# (?=\S).+$")
BEAT_HEADING_RE = re.compile(r"^## (?=\S).+$")
PURPOSE_CANDIDATE_RE = re.compile(
    r"^[ \t]*\[[^\r\n]*\][ \t]*$"
)
PURPOSE_RE = re.compile(
    r"^\[(?P<tags>[A-Z0-9](?:[A-Z0-9 .|-]*[A-Z0-9])?)"
    r" — (?P<explanation>\S(?:[^\]\r\n]*\S)?)\]$"
)
MAIN_TAG_RE = re.compile(
    r"^(?:MAIN HOOK|OBSTACLE|LOOP (?:OPEN|PAYOFF) L-\d{2})$"
)
ALLOWED_STATIC_TAGS = frozenset(
    {
        "MAIN HOOK",
        "OBSTACLE",
        "MINI-HOOK",
        "DEFENSE",
        "DISARM",
        "PROMISE",
        "TRANSITION",
        "REVERSAL",
        "AHA",
        "APPLICATION",
        "FINAL PAYOFF",
        "LOCKED WORDING",
    }
)
SUPPORTING_STYLE_TAGS = frozenset(
    {"MINI-HOOK", "TRANSITION", "REVERSAL", "AHA"}
)
EVIDENCE_RE = re.compile(
    r"(?<![ \t])[ \t]*\[F-\d{3}\]\([^)\r\n]+\)"
)
MARKDOWN_LINK_RE = re.compile(r"!?\[[^\]\r\n]*\]\([^)\r\n]*\)")
REFERENCE_LINK_RE = re.compile(
    r"!?\[[^\]\r\n]+\]\[[^\]\r\n]*\]"
)
FOOTNOTE_RE = re.compile(r"\[\^[^\]\r\n]+\]")
REFERENCE_DEFINITION_RE = re.compile(
    r"^[ \t]{0,3}\[[^\]\r\n]+\]:[ \t]*"
    r"(?:<[^>\r\n]+>|\S+)"
    r"(?:[ \t]+(?:\"[^\"]*\"|'[^']*'|\([^)]*\)))?"
    r"[ \t]*$"
)
UNSUPPORTED_MARKDOWN_RE = re.compile(
    r"`|~~|(?<!\w)_{1,3}(?=\S)|(?<=\S)_{1,3}(?!\w)"
)
NESTED_BLOCK_RE = re.compile(
    r"^(?:"
    r" {4}|\t|"
    r" {0,3}(?:"
    r"#{1,6}(?:[ \t]+|$)|"
    r"[*+-][ \t]+|"
    r"\d{1,9}[.)][ \t]+|"
    r">|"
    r"`{3,}|"
    r"~{3,}"
    r")"
    r")"
)
HORIZONTAL_RULE_RE = re.compile(
    r"^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|"
    r"(?:_[ \t]*){3,})$"
)
HTML_TAG_RE = re.compile(
    r"<!--.*?-->|</?[A-Za-z][^>\r\n]*>",
    re.DOTALL,
)
UNDERLINE_TAG_RE = re.compile(r"</?u>")
STORY_MARKER_RE = re.compile(r"</?u>|\*+")

DRIFT_ERROR = "extended narration does not exactly match raw"


@dataclass(frozen=True)
class PairPaths:
    """Resolved paths and identifiers for one active script stage."""

    stage_dir: Path
    raw: Path
    extended: Path
    episode_id: str
    stage: str


@dataclass(frozen=True)
class Purpose:
    """One standalone storytelling-purpose annotation."""

    tags: tuple[str, ...]
    explanation: str
    line: int


@dataclass(frozen=True)
class Passage:
    """One contiguous blockquoted passage and its optional purpose."""

    purpose: Purpose | None
    spoken: str
    line: int


@dataclass(frozen=True)
class StorytellingMarkup:
    """Storytelling styles found in one passage."""

    underlined: bool
    italic: bool
    bold: bool
    malformed: bool


def resolve_pair(target: Path) -> PairPaths:
    """Resolve a stage or pair-file target and enforce the active-stage layout."""

    is_pair_target = target.name in PAIR_NAMES
    stage_target = target.parent if is_pair_target else target
    try:
        stage_dir = stage_target.resolve()
    except RuntimeError as exc:
        raise ValueError(
            f"cannot resolve script stage {str(stage_target)!r}: symlink loop"
        ) from exc

    if not is_pair_target and (
        target.suffix == ".md" or stage_dir.is_file()
    ):
        raise ValueError(f"invalid pair filename: {target.name}")

    stage = stage_dir.name
    episode_id = stage_dir.parent.name
    if stage not in STAGES:
        raise ValueError(f"invalid script stage: {stage}")
    if EPISODE_RE.fullmatch(episode_id) is None:
        raise ValueError(f"invalid episode folder: {episode_id}")

    raw = stage_dir / RAW_NAME
    extended = stage_dir / EXTENDED_NAME
    for path in (raw, extended):
        if path.is_symlink():
            raise ValueError(f"pair file cannot be a symlink: {path.name}")
    missing = [str(path) for path in (raw, extended) if not path.is_file()]
    if missing:
        raise FileNotFoundError("missing pair file: " + ", ".join(missing))

    unexpected = sorted(
        child.name
        for child in stage_dir.iterdir()
        if child.name not in PAIR_NAMES
    )
    if unexpected:
        raise ValueError(
            "unexpected active-stage entries: " + ", ".join(unexpected)
        )

    return PairPaths(stage_dir, raw, extended, episode_id, stage)


def _is_blank_separator(line: str) -> bool:
    """Return whether a line contains only horizontal whitespace and its ending."""

    return line.rstrip("\r\n").strip(" \t") == ""


def _append_error(errors: list[str], message: str) -> None:
    """Append one deterministic diagnostic without duplicating it."""

    if message not in errors:
        errors.append(message)


def _before_appendix(markdown: str) -> str:
    """Return content before the first literal Appendix heading."""

    appendix_match = APPENDIX_SPLIT_RE.search(markdown)
    if appendix_match is None:
        return markdown
    return markdown[: appendix_match.start()]


def _blockquote_spoken(line: str) -> str:
    """Remove one blockquote marker and its optional formatting space."""

    spoken = line[1:]
    if spoken.startswith((" ", "\t")):
        return spoken[1:]
    return spoken


def _has_visible_content(markdown: str) -> bool:
    """Return whether markup encloses non-whitespace spoken content."""

    visible = EVIDENCE_RE.sub("", markdown)
    visible = UNDERLINE_TAG_RE.sub("", visible)
    visible = visible.replace("*", "")
    return bool(visible.strip())


def _storytelling_markup(spoken: str) -> StorytellingMarkup:
    """Inspect supported underline and asterisk spans in one passage."""

    surface = EVIDENCE_RE.sub("", spoken)
    malformed = False
    underlined = False
    italic = False
    bold = False
    marker_stack: list[tuple[str, int, int]] = []
    for match in STORY_MARKER_RE.finditer(surface):
        marker = match.group()
        if marker == "<u>":
            if any(kind == "underline" for kind, _, _ in marker_stack):
                malformed = True
            marker_stack.append(("underline", 0, match.end()))
            continue
        if marker == "</u>":
            if not marker_stack:
                malformed = True
                continue
            if marker_stack[-1][0] != "underline":
                malformed = True
                while (
                    marker_stack
                    and marker_stack[-1][0] != "underline"
                ):
                    marker_stack.pop()
            if not marker_stack:
                continue
            _, _, content_start = marker_stack.pop()
            content = surface[content_start : match.start()]
            if _has_visible_content(content):
                underlined = True
            else:
                malformed = True
            continue

        marker_width = len(marker)
        if marker_width not in {1, 2, 3}:
            malformed = True
            continue
        can_open = (
            match.end() < len(surface)
            and not surface[match.end()].isspace()
        )
        can_close = (
            match.start() > 0
            and not surface[match.start() - 1].isspace()
        )
        if (
            marker_stack
            and marker_stack[-1][:2] == ("emphasis", marker_width)
            and can_close
        ):
            _, _, content_start = marker_stack.pop()
            content = surface[content_start : match.start()]
            if not _has_visible_content(content):
                malformed = True
                continue
            if marker_width in {1, 3}:
                italic = True
            if marker_width in {2, 3}:
                bold = True
        elif any(
            kind == "emphasis" and width == marker_width
            for kind, width, _ in marker_stack
        ) and can_close:
            malformed = True
        elif can_open:
            marker_stack.append(
                ("emphasis", marker_width, match.end())
            )
        else:
            malformed = True
    if marker_stack:
        malformed = True

    return StorytellingMarkup(underlined, italic, bold, malformed)


def _raw_blockquote_passages(markdown: str) -> list[str]:
    """Collect contiguous raw blockquote lines for markup validation."""

    passages: list[str] = []
    current: list[str] = []
    for line in markdown.splitlines():
        if line.startswith(">"):
            current.append(_blockquote_spoken(line))
            continue
        if current:
            passages.append("\n".join(current))
            current = []
    if current:
        passages.append("\n".join(current))
    return passages


def _is_padded_emphasis(line: str) -> bool:
    """Return whether matching markers have inner boundary whitespace."""

    for width in (3, 2, 1):
        marker = "*" * width
        if (
            len(line) > 2 * width
            and line.startswith(marker)
            and line.endswith(marker)
            and (
                line[width] in " \t"
                or line[-width - 1] in " \t"
            )
        ):
            return True
    return False


def _has_nested_block_structure(passage: str) -> bool:
    """Return whether quoted content starts a nested Markdown block."""

    for line in passage.splitlines():
        if HORIZONTAL_RULE_RE.fullmatch(line):
            return True
        if _is_padded_emphasis(line):
            continue
        if NESTED_BLOCK_RE.match(line):
            return True
    return False


def _validate_raw(markdown: str) -> list[str]:
    """Validate the raw file's intentionally narrow authoring surface."""

    errors: list[str] = []
    lines = markdown.splitlines()
    appendix_index = next(
        (
            index
            for index, line in enumerate(lines)
            if APPENDIX_HEADING_RE.fullmatch(line)
        ),
        None,
    )
    body_lines = (
        lines[:appendix_index]
        if appendix_index is not None
        else lines
    )
    body = "\n".join(body_lines)

    if sum(bool(H1_RE.fullmatch(line)) for line in body_lines) != 1:
        _append_error(
            errors,
            "raw script requires exactly one H1 title",
        )

    if any(PURPOSE_CANDIDATE_RE.fullmatch(line) for line in body_lines):
        _append_error(
            errors,
            "raw script cannot contain purpose annotations",
        )
    if EVIDENCE_RE.search(body):
        _append_error(
            errors,
            "raw script cannot contain evidence indicators",
        )
    if appendix_index is not None:
        _append_error(errors, "raw script cannot contain an Appendix")

    for line in body_lines:
        if line.strip(" \t") == "":
            continue
        if PURPOSE_CANDIDATE_RE.fullmatch(line):
            continue
        if (
            H1_RE.fullmatch(line)
            or BEAT_HEADING_RE.fullmatch(line)
            or line.startswith(">")
        ):
            continue
        _append_error(
            errors,
            "raw script allows only title, beat headings, "
            "and blockquoted narration",
        )

    without_evidence = EVIDENCE_RE.sub("", body)
    has_reference_definition = any(
        REFERENCE_DEFINITION_RE.fullmatch(
            _blockquote_spoken(line)
            if line.startswith(">")
            else line
        )
        for line in body_lines
    )
    if (
        MARKDOWN_LINK_RE.search(without_evidence)
        or REFERENCE_LINK_RE.search(without_evidence)
        or FOOTNOTE_RE.search(without_evidence)
        or has_reference_definition
    ):
        _append_error(
            errors,
            "raw script cannot contain citations or Markdown links",
        )
    if UNSUPPORTED_MARKDOWN_RE.search(body):
        _append_error(
            errors,
            "raw script cannot contain unsupported Markdown markup",
        )

    without_underline = body.replace("<u>", "").replace("</u>", "")
    if HTML_TAG_RE.search(without_underline):
        _append_error(
            errors,
            "raw script cannot contain unsupported HTML tags",
        )

    raw_passages = _raw_blockquote_passages(body)
    if any(
        _has_nested_block_structure(passage)
        for passage in raw_passages
    ):
        _append_error(
            errors,
            "raw script cannot contain unsupported Markdown markup",
        )

    for passage in raw_passages:
        if _has_nested_block_structure(passage):
            continue
        if _storytelling_markup(passage).malformed:
            _append_error(
                errors,
                "malformed or empty storytelling markup",
            )

    return errors


def _parse_purpose(
    candidate: str,
    line_number: int,
    errors: list[str],
) -> Purpose:
    """Parse one candidate annotation while retaining valid known tags."""

    match = PURPOSE_RE.fullmatch(candidate)
    if match is None:
        _append_error(errors, "invalid or empty purpose annotation")
        return Purpose((), "", line_number)

    tag_text = match.group("tags")
    tags = tuple(tag_text.split(" | "))
    if (
        not tags
        or any(
            not tag or "|" in tag or tag != tag.strip()
            for tag in tags
        )
        or " | ".join(tags) != tag_text
    ):
        _append_error(errors, "invalid or empty purpose annotation")
        return Purpose((), match.group("explanation"), line_number)

    known_tags: list[str] = []
    for tag in tags:
        if (
            tag in ALLOWED_STATIC_TAGS
            or MAIN_TAG_RE.fullmatch(tag) is not None
        ):
            known_tags.append(tag)
        else:
            _append_error(errors, f"unknown purpose tag: {tag}")
    return Purpose(
        tuple(known_tags),
        match.group("explanation"),
        line_number,
    )


def _extended_passages(
    markdown: str,
    errors: list[str],
) -> list[Passage]:
    """Map annotations to immediately following blockquoted passages."""

    passages: list[Passage] = []
    pending: Purpose | None = None
    pending_blank_count = 0
    current_lines: list[str] = []
    current_purpose: Purpose | None = None
    current_line = 0

    def flush_current() -> None:
        nonlocal current_lines, current_purpose, current_line
        if not current_lines:
            return
        spoken = "\n".join(current_lines)
        if _has_visible_content(spoken):
            passages.append(
                Passage(current_purpose, spoken, current_line)
            )
        elif current_purpose is not None:
            _append_error(
                errors,
                "purpose annotation has no following passage",
            )
        current_lines = []
        current_purpose = None
        current_line = 0

    for line_number, line in enumerate(
        _before_appendix(markdown).splitlines(),
        start=1,
    ):
        if PURPOSE_CANDIDATE_RE.fullmatch(line):
            flush_current()
            if pending is not None:
                _append_error(
                    errors,
                    "purpose annotation has no following passage",
                )
            pending = _parse_purpose(line, line_number, errors)
            pending_blank_count = 0
            continue

        if line.startswith(">"):
            if not current_lines:
                current_purpose = pending
                pending = None
                pending_blank_count = 0
                current_line = line_number
            current_lines.append(_blockquote_spoken(line))
            continue

        flush_current()
        if line.strip(" \t") == "":
            if pending is not None:
                pending_blank_count += 1
                if pending_blank_count > 1:
                    _append_error(
                        errors,
                        "purpose annotation has no following passage",
                    )
                    pending = None
            continue

        if pending is not None:
            _append_error(
                errors,
                "purpose annotation has no following passage",
            )
            pending = None
            pending_blank_count = 0

    flush_current()
    if pending is not None:
        _append_error(
            errors,
            "purpose annotation has no following passage",
        )
    return passages


def _validate_extended(markdown: str) -> list[str]:
    """Validate purpose grammar, passage mapping, and storytelling styles."""

    errors: list[str] = []
    for passage in _extended_passages(markdown, errors):
        tags = (
            frozenset(passage.purpose.tags)
            if passage.purpose is not None
            else frozenset()
        )
        markup = _storytelling_markup(passage.spoken)
        if markup.malformed:
            _append_error(
                errors,
                "malformed or empty storytelling markup",
            )

        has_main_tag = any(
            MAIN_TAG_RE.fullmatch(tag) is not None for tag in tags
        )
        has_supporting_tag = bool(tags & SUPPORTING_STYLE_TAGS)
        has_mini_hook = "MINI-HOOK" in tags
        has_locked_wording = "LOCKED WORDING" in tags

        if markup.underlined and not has_main_tag:
            _append_error(
                errors,
                "underlined passage requires a main-story tag",
            )
        if has_main_tag and not markup.underlined:
            _append_error(
                errors,
                "main-story tag requires an underlined passage",
            )
        if markup.underlined and markup.italic:
            _append_error(
                errors,
                "passage cannot combine underline and italics",
            )
        if has_mini_hook and (
            not markup.italic or markup.underlined
        ):
            _append_error(
                errors,
                "MINI-HOOK passage must be italic and not underlined",
            )
        if markup.italic and not has_supporting_tag:
            _append_error(
                errors,
                "italic passage requires a supporting-story tag",
            )
        if markup.bold and not has_locked_wording:
            _append_error(
                errors,
                "bold passage requires LOCKED WORDING",
            )
        if has_locked_wording and not markup.bold:
            _append_error(
                errors,
                "LOCKED WORDING requires a bold passage",
            )
    return errors


def _extended_sync_surface(markdown: str) -> str:
    """Project only raw-owned content without normalizing its bytes-as-text form."""

    body = _before_appendix(markdown)

    projected: list[str] = []
    skip_annotation_separator = False
    for line in body.splitlines(keepends=True):
        if PURPOSE_CANDIDATE_RE.fullmatch(line.rstrip("\r\n")):
            skip_annotation_separator = True
            continue
        if skip_annotation_separator and _is_blank_separator(line):
            skip_annotation_separator = False
            continue
        skip_annotation_separator = False
        projected.append(EVIDENCE_RE.sub("", line))
    return "".join(projected)


def validate_pair(pair: PairPaths) -> list[str]:
    """Return raw, extended, and exact-synchronization validation errors."""

    raw = pair.raw.read_bytes().decode("utf-8")
    extended = pair.extended.read_bytes().decode("utf-8")
    raw_errors = _validate_raw(raw)
    errors = list(raw_errors)
    for error in _validate_extended(extended):
        _append_error(errors, error)
    if not raw_errors and raw != _extended_sync_surface(extended):
        _append_error(errors, DRIFT_ERROR)
    return errors


def _json_payload(errors: list[str]) -> dict[str, object]:
    return {
        "ok": not errors,
        "errors": [{"message": error, "line": None} for error in errors],
    }


def main(argv: list[str] | None = None) -> int:
    """Return 0 for valid, 1 for validation, and 2 for input errors."""

    parser = argparse.ArgumentParser(
        description="Validate an exact raw/extended WHP script pair."
    )
    parser.add_argument(
        "target",
        nargs="?",
        help="active stage directory or script.raw.md/script.extended.md",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="emit machine-readable JSON diagnostics",
    )
    args = parser.parse_args(argv)

    if args.target is None:
        errors = ["cannot validate input: no target was provided"]
        if args.json:
            print(json.dumps(_json_payload(errors)))
        else:
            print(f"ERROR: {errors[0]}")
        return 2

    target = Path(args.target)
    try:
        pair = resolve_pair(target)
        errors = validate_pair(pair)
    except (OSError, UnicodeError, ValueError) as exc:
        errors = [f"cannot validate input {str(target)!r}: {exc}"]
        if args.json:
            print(json.dumps(_json_payload(errors)))
        else:
            print(f"ERROR: {errors[0]}")
        return 2

    if args.json:
        print(json.dumps(_json_payload(errors)))
    elif errors:
        for error in errors:
            print(f"ERROR: {error}")
    else:
        print("PASS: script pair is exactly synchronized")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
