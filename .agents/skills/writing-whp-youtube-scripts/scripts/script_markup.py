"""Shared narration-markup definitions for the paired-script tools.

Single source of truth for what counts as an inline evidence indicator,
where the appendix boundary is, and what counts as one spoken word.
The readability checker and both validators must import these instead of
declaring their own variants, so the three tools can never disagree on
narration semantics.
"""

from __future__ import annotations

import re

EVIDENCE_ID_PATTERN = r"F-\d{3}"
EVIDENCE_URL_PATTERN = r"[^)\s]+"
EVIDENCE_INDICATOR_PATTERN = (
    rf"\[{EVIDENCE_ID_PATTERN}\]\({EVIDENCE_URL_PATTERN}\)"
)

APPENDIX_HEADING_PATTERN = r"## Appendix[ \t]*"
APPENDIX_HEADING_RE = re.compile(rf"^{APPENDIX_HEADING_PATTERN}$", re.MULTILINE)

WORD_RE = re.compile(r"[^\W_]+(?:[’'-][^\W_]+)*", re.UNICODE)


def count_words(text: str) -> int:
    """Count spoken words; standalone punctuation tokens are not words."""

    return len(WORD_RE.findall(text))
