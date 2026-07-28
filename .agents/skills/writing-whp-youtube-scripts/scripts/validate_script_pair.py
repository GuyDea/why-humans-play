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
PURPOSE_RE = re.compile(
    r"^\[(?P<tags>[A-Z0-9 |.-]+) — (?P<explanation>[^\]\r\n]+)\]$"
)
EVIDENCE_RE = re.compile(
    r"(?<![ \t])[ \t]*\[F-\d{3}\]\([^)\r\n]+\)"
)

DRIFT_ERROR = "extended narration does not exactly match raw"


@dataclass(frozen=True)
class PairPaths:
    """Resolved paths and identifiers for one active script stage."""

    stage_dir: Path
    raw: Path
    extended: Path
    episode_id: str
    stage: str


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


def _extended_sync_surface(markdown: str) -> str:
    """Project only raw-owned content without normalizing its bytes-as-text form."""

    appendix_match = APPENDIX_SPLIT_RE.search(markdown)
    body = (
        markdown[: appendix_match.start()]
        if appendix_match is not None
        else markdown
    )

    projected: list[str] = []
    skip_annotation_separator = False
    for line in body.splitlines(keepends=True):
        if PURPOSE_RE.fullmatch(line.rstrip("\r\n")):
            skip_annotation_separator = True
            continue
        if skip_annotation_separator and _is_blank_separator(line):
            skip_annotation_separator = False
            continue
        skip_annotation_separator = False
        projected.append(EVIDENCE_RE.sub("", line))
    return "".join(projected)


def validate_pair(pair: PairPaths) -> list[str]:
    """Return exact-synchronization errors for a resolved script pair."""

    raw = pair.raw.read_bytes().decode("utf-8")
    extended = pair.extended.read_bytes().decode("utf-8")
    if raw != _extended_sync_surface(extended):
        return [DRIFT_ERROR]
    return []


def _json_payload(errors: list[str]) -> dict[str, object]:
    return {
        "ok": not errors,
        "errors": [{"message": error, "line": None} for error in errors],
    }


def main(argv: list[str] | None = None) -> int:
    """Return 0 for valid, 1 for drift, and 2 for invalid or unreadable input."""

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
