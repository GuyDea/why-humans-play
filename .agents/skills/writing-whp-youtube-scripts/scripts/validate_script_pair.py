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
EMAIL_AUTOLINK_RE = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$"
)
REFERENCE_TITLE_CLOSERS = {'"': '"', "'": "'", "(": ")"}
HTML_LITERAL_BLOCK_TAGS = frozenset(
    {"pre", "script", "style", "textarea"}
)
HTML_BLOCK_TAGS = frozenset(
    """
    address article aside base basefont blockquote body caption center col
    colgroup dd details dialog dir div dl dt fieldset figcaption figure
    footer form frame frameset h1 h2 h3 h4 h5 h6 head header hr html
    iframe legend li link main menu menuitem nav noframes ol optgroup
    option p param search section source summary table tbody td tfoot th
    thead title tr track ul
    """.split()
)
UNSUPPORTED_MARKDOWN_RE = re.compile(
    r"`|~~|(?<!\w)_{1,3}(?=\S)|(?<=\S)_{1,3}(?!\w)"
)
ATX_HEADING_RE = re.compile(r"^ {0,3}#{1,6}(?:[ \t]+|$)")
LIST_MARKER_RE = re.compile(
    r"^ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]+|$)"
)
NESTED_QUOTE_RE = re.compile(r"^ {0,3}>")
FENCE_RE = re.compile(r"^ {0,3}(?:`{3,}|~{3,})")
SETEXT_UNDERLINE_RE = re.compile(r"^ {0,3}(?:=+|-+)[ \t]*$")
GFM_ALERT_RE = re.compile(
    r"^ {0,3}\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$"
)
HORIZONTAL_RULE_RE = re.compile(
    r"^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|"
    r"(?:_[ \t]*){3,})$"
)
TABLE_DELIMITER_CELL_RE = re.compile(r"^:?-+:?$")
UNDERLINE_TAG_RE = re.compile(r"</?u>")
STORY_MARKER_RE = re.compile(r"</?u>|\*+")
ESCAPABLE_STORY_MARKER_RE = re.compile(r"</?u>|\*+|_+")

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


def _is_escaped(text: str, index: int) -> bool:
    """Return whether the character at index has odd backslash parity."""

    backslashes = 0
    cursor = index - 1
    while cursor >= 0 and text[cursor] == "\\":
        backslashes += 1
        cursor -= 1
    return backslashes % 2 == 1


def _citation_surfaces(markdown: str) -> list[tuple[str, bool]]:
    """Split raw Markdown into independently scanned paragraph surfaces."""

    surfaces: list[tuple[str, bool]] = []
    quoted_paragraph: list[str] = []

    def flush_quoted_paragraph() -> None:
        if quoted_paragraph:
            surfaces.append(("\n".join(quoted_paragraph), True))
            quoted_paragraph.clear()

    for line in markdown.splitlines():
        if line.startswith(">"):
            spoken = _blockquote_spoken(line)
            if spoken.strip(" \t") == "":
                flush_quoted_paragraph()
            else:
                quoted_paragraph.append(spoken)
            continue

        flush_quoted_paragraph()
        if line.strip(" \t"):
            surfaces.append((line, False))

    flush_quoted_paragraph()
    return surfaces


def _balanced_delimiter_pairs(
    surface: str,
) -> tuple[dict[int, int], dict[int, int]]:
    """Map unescaped balanced bracket and parenthesis openers to closers."""

    bracket_openers: list[int] = []
    parenthesis_openers: list[int] = []
    bracket_pairs: dict[int, int] = {}
    parenthesis_pairs: dict[int, int] = {}
    escaped = False

    for index, character in enumerate(surface):
        if character == "\\":
            escaped = not escaped
            continue
        if escaped:
            escaped = False
            continue

        if character == "[":
            bracket_openers.append(index)
        elif character == "]" and bracket_openers:
            bracket_pairs[bracket_openers.pop()] = index
        elif character == "(":
            parenthesis_openers.append(index)
        elif character == ")" and parenthesis_openers:
            parenthesis_pairs[parenthesis_openers.pop()] = index

    return bracket_pairs, parenthesis_pairs


def _skip_horizontal_space(text: str, start: int) -> int:
    """Return the first index at or after start that is not a space or tab."""

    cursor = start
    while cursor < len(text) and text[cursor] in " \t":
        cursor += 1
    return cursor


def _reference_destination_end(tail: str, start: int) -> int | None:
    """Return the end of one CommonMark link destination, if complete."""

    if start >= len(tail):
        return None

    if tail[start] == "<":
        cursor = start + 1
        escaped = False
        while cursor < len(tail):
            character = tail[cursor]
            if character == "\n" or ord(character) < 32:
                return None
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == "<":
                return None
            elif character == ">":
                return cursor + 1
            cursor += 1
        return None

    cursor = start
    parenthesis_depth = 0
    escaped = False
    while cursor < len(tail):
        character = tail[cursor]
        if character in " \t\n":
            break
        if ord(character) < 32 or ord(character) == 127:
            return None
        if escaped:
            escaped = False
        elif character == "\\":
            escaped = True
        elif character == "(":
            parenthesis_depth += 1
        elif character == ")":
            if parenthesis_depth == 0:
                return None
            parenthesis_depth -= 1
        cursor += 1

    if cursor == start or parenthesis_depth:
        return None
    return cursor


def _reference_title_is_valid(tail: str, start: int) -> bool:
    """Consume one escape-aware title through its definition-ending line."""

    opener = tail[start]
    closer = REFERENCE_TITLE_CLOSERS[opener]
    cursor = start + 1
    escaped = False

    while cursor < len(tail):
        character = tail[cursor]
        if escaped:
            escaped = False
        elif character == "\\":
            escaped = True
        elif opener == "(" and character == "(":
            return False
        elif character == closer:
            cursor = _skip_horizontal_space(tail, cursor + 1)
            return cursor == len(tail) or tail[cursor] == "\n"
        cursor += 1

    return False


def _reference_definition_tail_is_valid(tail: str) -> bool:
    """Parse one bounded definition tail without consuming later narration."""

    cursor = _skip_horizontal_space(tail, 0)
    if cursor == len(tail):
        # Raw rejects even a bare reference-definition marker.
        return True
    if tail[cursor] == "\n":
        cursor = _skip_horizontal_space(tail, cursor + 1)
        if cursor == len(tail):
            return True
        if tail[cursor] == "\n":
            return False

    destination_end = _reference_destination_end(tail, cursor)
    if destination_end is None:
        return False
    if destination_end == len(tail) or tail[destination_end] == "\n":
        return True
    if tail[destination_end] not in " \t":
        return False

    cursor = _skip_horizontal_space(tail, destination_end)
    if cursor == len(tail) or tail[cursor] == "\n":
        return True
    if tail[cursor] not in REFERENCE_TITLE_CLOSERS:
        return False
    return _reference_title_is_valid(tail, cursor)


def _is_uri_autolink(candidate: str) -> bool:
    """Return whether candidate is a CommonMark absolute URI."""

    colon = candidate.find(":")
    if colon == -1:
        return False

    scheme = candidate[:colon]
    if (
        not 2 <= len(scheme) <= 32
        or not _is_ascii_letter(scheme[0])
        or any(
            not (
                character.isascii()
                and (
                    character.isalnum()
                    or character in "+.-"
                )
            )
            for character in scheme[1:]
        )
    ):
        return False

    return all(
        ord(character) > 32
        and ord(character) != 127
        and character not in "<>"
        for character in candidate[colon + 1 :]
    )


def _surface_has_autolink(surface: str) -> bool:
    """Detect URI or email autolinks in one forward surface scan."""

    opener: int | None = None
    backslashes = 0
    for index, character in enumerate(surface):
        if character == "\\":
            backslashes += 1
            continue

        escaped = backslashes % 2 == 1
        backslashes = 0
        if character == "<":
            opener = None if escaped else index
            continue
        if character != ">" or opener is None:
            continue

        candidate = surface[opener + 1 : index]
        if (
            _is_uri_autolink(candidate)
            or EMAIL_AUTOLINK_RE.fullmatch(candidate) is not None
        ):
            return True
        opener = None

    return False


def _surface_has_raw_citation(
    surface: str,
    *,
    allow_reference_definition: bool,
) -> bool:
    """Detect complete citations on one logical Markdown surface."""

    bracket_pairs, parenthesis_pairs = _balanced_delimiter_pairs(surface)
    definition_opener: int | None = None
    if allow_reference_definition:
        indentation = 0
        while (
            indentation < len(surface)
            and surface[indentation] == " "
        ):
            indentation += 1
        if indentation <= 3:
            definition_opener = indentation

    for opener, closer in bracket_pairs.items():
        if surface.startswith("[^", opener):
            return True

        suffix = closer + 1
        if suffix >= len(surface):
            continue
        if (
            opener == definition_opener
            and surface[suffix] == ":"
            and _reference_definition_tail_is_valid(
                surface[suffix + 1 :]
            )
        ):
            return True
        if (
            surface[suffix] == "("
            and suffix in parenthesis_pairs
        ) or (
            surface[suffix] == "["
            and suffix in bracket_pairs
        ):
            return True
    return False


def _has_raw_citation(markdown: str) -> bool:
    """Detect complete citations without crossing paragraph boundaries."""

    return any(
        _surface_has_autolink(surface)
        or _surface_has_raw_citation(
            surface,
            allow_reference_definition=is_blockquote,
        )
        for surface, is_blockquote in _citation_surfaces(markdown)
    )


def _has_escaped_story_marker(markdown: str) -> bool:
    """Return whether raw uses a backslash-escaped story delimiter."""

    return any(
        _is_escaped(markdown, match.start())
        for match in ESCAPABLE_STORY_MARKER_RE.finditer(markdown)
    )


def _is_ascii_letter(character: str) -> bool:
    """Return whether character is an ASCII letter."""

    return character.isascii() and character.isalpha()


def _line_starts_commonmark_html_block(line: str) -> bool:
    """Detect incomplete-capable CommonMark HTML block starts on one line."""

    cursor = 0
    while cursor < min(3, len(line)) and line[cursor] == " ":
        cursor += 1
    if cursor >= len(line) or line[cursor] != "<":
        return False

    cursor += 1
    closing = cursor < len(line) and line[cursor] == "/"
    if closing:
        cursor += 1
    name_start = cursor
    while (
        cursor < len(line)
        and line[cursor].isascii()
        and (line[cursor].isalnum() or line[cursor] == "-")
    ):
        cursor += 1
    if cursor == name_start or not _is_ascii_letter(line[name_start]):
        return False

    name = line[name_start:cursor].lower()
    if (
        not closing
        and name in HTML_LITERAL_BLOCK_TAGS
        and (
            cursor == len(line)
            or line[cursor] in " \t>"
        )
    ):
        return True
    if name not in HTML_BLOCK_TAGS:
        return False
    return (
        cursor == len(line)
        or line[cursor] in " \t>"
        or line.startswith("/>", cursor)
    )


def _skip_html_space(text: str, start: int) -> int:
    """Return the next index after CommonMark tag whitespace."""

    cursor = start
    while cursor < len(text) and text[cursor] in " \t\n":
        cursor += 1
    return cursor


def _html_scan_resume(text: str, cursor: int, start: int) -> int:
    """Advance a failed tag scan without skipping a new angle opener."""

    if cursor < len(text) and text[cursor] == "<":
        return cursor
    return max(start + 1, min(cursor + 1, len(text)))


def _complete_html_tag_scan(
    text: str,
    start: int,
) -> tuple[bool, int]:
    """Parse one CommonMark open or closing tag in a forward-only scan."""

    cursor = start + 1
    closing = cursor < len(text) and text[cursor] == "/"
    if closing:
        cursor += 1
    if cursor >= len(text) or not _is_ascii_letter(text[cursor]):
        return False, start + 1

    cursor += 1
    while (
        cursor < len(text)
        and text[cursor].isascii()
        and (text[cursor].isalnum() or text[cursor] == "-")
    ):
        cursor += 1

    if closing:
        cursor = _skip_html_space(text, cursor)
        if cursor < len(text) and text[cursor] == ">":
            return True, cursor + 1
        return False, _html_scan_resume(text, cursor, start)

    while cursor < len(text):
        whitespace_start = cursor
        cursor = _skip_html_space(text, cursor)
        if cursor >= len(text):
            return False, len(text)
        if text[cursor] == ">":
            return True, cursor + 1
        if text.startswith("/>", cursor):
            return True, cursor + 2
        if cursor == whitespace_start:
            return False, _html_scan_resume(text, cursor, start)

        character = text[cursor]
        if not (
            _is_ascii_letter(character)
            or character in "_:"
        ):
            return False, _html_scan_resume(text, cursor, start)
        cursor += 1
        while cursor < len(text):
            character = text[cursor]
            if (
                character.isascii()
                and (
                    character.isalnum()
                    or character in "_.:-"
                )
            ):
                cursor += 1
                continue
            break

        equals = _skip_html_space(text, cursor)
        if equals >= len(text) or text[equals] != "=":
            continue

        cursor = _skip_html_space(text, equals + 1)
        if cursor >= len(text):
            return False, len(text)
        quote = text[cursor] if text[cursor] in "\"'" else None
        if quote is not None:
            cursor += 1
            closing_quote = text.find(quote, cursor)
            if closing_quote == -1:
                next_opener = text.find("<", cursor)
                return False, (
                    len(text)
                    if next_opener == -1
                    else next_opener
                )
            cursor = closing_quote + 1
            continue

        value_start = cursor
        while (
            cursor < len(text)
            and text[cursor] not in " \t\n\"'=<>`"
        ):
            cursor += 1
        if cursor == value_start:
            return False, _html_scan_resume(text, cursor, start)

    return False, len(text)


def _surface_has_complete_html_tag(surface: str) -> bool:
    """Detect complete raw HTML tags on one bounded Markdown surface."""

    cursor = surface.find("<")
    while cursor != -1:
        if surface.startswith("<u>", cursor):
            cursor = surface.find("<", cursor + len("<u>"))
            continue
        if surface.startswith("</u>", cursor):
            cursor = surface.find("<", cursor + len("</u>"))
            continue
        if surface.startswith(("<!--", "<?", "<!"), cursor):
            return True

        complete, resume = _complete_html_tag_scan(surface, cursor)
        if complete:
            return True
        cursor = surface.find("<", resume)
    return False


def _has_unsupported_html(markdown: str) -> bool:
    """Detect raw HTML forms while allowing only exact underline tags."""

    for surface, _ in _citation_surfaces(markdown):
        if any(
            _line_starts_commonmark_html_block(line)
            for line in surface.split("\n")
        ):
            return True
        if _surface_has_complete_html_tag(surface):
            return True
    return False


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
        if _is_escaped(surface, match.start()):
            continue
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


def _is_indented_code(line: str) -> bool:
    """Return whether leading whitespace reaches four visual columns."""

    column = 0
    for character in line:
        if character == " ":
            column += 1
        elif character == "\t":
            column += 4 - column % 4
        else:
            break
        if column >= 4:
            return True
    return False


def _unescaped_pipe_positions(line: str) -> list[int]:
    """Return unescaped pipe positions for GFM table checks."""

    return [
        index
        for index, character in enumerate(line)
        if character == "|" and not _is_escaped(line, index)
    ]


def _is_gfm_table_delimiter(line: str) -> bool:
    """Return whether a line is a GFM table delimiter row."""

    stripped = line.strip(" \t")
    pipe_positions = _unescaped_pipe_positions(stripped)
    if not pipe_positions:
        return False

    cells: list[str] = []
    cell_start = 0
    for position in pipe_positions:
        cells.append(stripped[cell_start:position].strip(" \t"))
        cell_start = position + 1
    cells.append(stripped[cell_start:].strip(" \t"))
    if pipe_positions[0] == 0:
        cells = cells[1:]
    if pipe_positions[-1] == len(stripped) - 1:
        cells = cells[:-1]
    return bool(cells) and all(
        TABLE_DELIMITER_CELL_RE.fullmatch(cell) is not None
        for cell in cells
    )


def _is_nested_block_line(line: str) -> bool:
    """Return whether one spoken line starts denied block markup."""

    if (
        _is_indented_code(line)
        or HORIZONTAL_RULE_RE.fullmatch(line)
        or SETEXT_UNDERLINE_RE.fullmatch(line)
        or _is_gfm_table_delimiter(line)
        or GFM_ALERT_RE.fullmatch(line)
    ):
        return True
    if _is_padded_emphasis(line):
        return False
    return any(
        pattern.match(line) is not None
        for pattern in (
            ATX_HEADING_RE,
            LIST_MARKER_RE,
            NESTED_QUOTE_RE,
            FENCE_RE,
        )
    )


def _has_nested_block_structure(passage: str) -> bool:
    """Return whether quoted content starts a nested Markdown block."""

    return any(
        _is_nested_block_line(line)
        for line in passage.splitlines()
    )


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
    if _has_raw_citation(without_evidence):
        _append_error(
            errors,
            "raw script cannot contain citations or Markdown links",
        )
    if (
        UNSUPPORTED_MARKDOWN_RE.search(body)
        or _has_escaped_story_marker(body)
    ):
        _append_error(
            errors,
            "raw script cannot contain unsupported Markdown markup",
        )

    if _has_unsupported_html(body):
        _append_error(
            errors,
            "raw script cannot contain unsupported HTML tags",
        )

    raw_passages = _raw_blockquote_passages(body)
    nested_structure = [
        _has_nested_block_structure(passage)
        for passage in raw_passages
    ]
    if any(nested_structure):
        _append_error(
            errors,
            "raw script cannot contain unsupported Markdown markup",
        )

    for passage, is_nested in zip(
        raw_passages,
        nested_structure,
        strict=True,
    ):
        if is_nested:
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
