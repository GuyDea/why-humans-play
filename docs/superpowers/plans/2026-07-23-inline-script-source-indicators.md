# Inline Script Source Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every factual claim in an evidence-backed WHP narration display a direct,
clickable `F-###` source link without adding the marker to spoken copy or word count.

**Architecture:** Extend the existing annotated-script parser with one narrowly scoped
Markdown-link recognizer for `[F-###](https://...)`. Narration extraction removes only
those markers, while a new validator pass checks each marker against the matching beat's
claim mappings and the evidence record's `Original URL`. Keep semantic source evaluation in
the existing human evidence audit.

**Tech Stack:** Python 3 standard library (`re`, `unittest`), Markdown, the existing WHP
annotated-script validator and skill-package tests.

---

## File structure

- `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`
  owns marker recognition, narration stripping, and deterministic relationship checks.
- `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`
  owns extraction and validation regression coverage.
- `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py` locks the
  user-facing skill contract.
- `.agents/skills/writing-whp-youtube-scripts/SKILL.md` routes Phase 1 versus Phase 2
  source-indicator behavior.
- `.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md` defines
  semantic claim-to-marker mapping during evidence review.
- `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md` is the
  normative production-format reference.
- `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`
  demonstrates the required visible marker.
- `whp-youtube/episodes/01-why-ai-cheats.md` receives direct links for every mapped
  factual claim.
- `whp-youtube/STEERING.md` records the channel-wide Phase 2 rule.
- `DECISIONS.md` records the accepted WHP decision once.

### Task 1: Exclude evidence indicators from spoken narration

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`

- [ ] **Step 1: Add a source marker to the canonical validator fixture**

In `VALID_DOCUMENT`, append the marker to the final sourced sentence before the personal
input marker:

```markdown
> does not tell us what a bee feels—but makes the detour hard to dismiss. [F-001](https://doi.org/10.1016/j.anbehav.2022.08.013)
> <!-- PI-001: Martin input -->
```

Do not change `- **Word count:** 80`; the marker is non-spoken.

- [ ] **Step 2: Make the fixture's count assertion use the public extractor**

In `test_fixture_narration_count_matches_metadata`, replace the raw blockquote token loop:

```python
narration = extract_exact(BEAT_BLOCK, "### Narration\n", "\n### Story function")
words = [
    word
    for line in narration.splitlines()
    if line.startswith("> ") and "<!--" not in line
    for word in line.removeprefix("> ").split()
]
self.assertEqual(len(words), 80)
```

with:

```python
self.assertEqual(validator.count_narration_words(VALID_DOCUMENT), 80)
```

The fixture must measure the same narration representation used by production validation.

- [ ] **Step 3: Write failing extraction tests**

Add these methods to `ValidatorTests` beside
`test_personal_marker_is_excluded_from_extraction_and_word_count`:

```python
def test_inline_evidence_indicator_is_excluded_from_narration_and_word_count(
    self,
) -> None:
    narration = validator.extract_narration(VALID_DOCUMENT)
    self.assertNotIn("[F-001]", narration)
    self.assertNotIn("10.1016/j.anbehav.2022.08.013", narration)
    self.assertEqual(validator.count_narration_words(VALID_DOCUMENT), 80)

def test_ordinary_markdown_link_is_not_removed_as_evidence_metadata(self) -> None:
    document = replace_exact(
        COMPLETED_DOCUMENT,
        "Those clues can sharpen the question",
        "See [the ordinary link](https://example.org/guide). Those clues can sharpen the question",
    )
    narration = validator.extract_narration(document)
    self.assertIn("[the ordinary link](https://example.org/guide)", narration)
```

- [ ] **Step 4: Run the extraction tests and verify RED**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  test_validate_annotated_script.ValidatorTests.test_inline_evidence_indicator_is_excluded_from_narration_and_word_count \
  test_validate_annotated_script.ValidatorTests.test_ordinary_markdown_link_is_not_removed_as_evidence_metadata
```

Expected: the evidence-marker test fails because the link appears in extracted narration
and raises the count above 80; the ordinary-link assertion passes.

- [ ] **Step 5: Add the narrow marker recognizer**

Near `REFERENCE_ID_RE` in `validate_annotated_script.py`, add:

```python
INLINE_EVIDENCE_LINK_RE = re.compile(
    r"[ \t]*\[(?P<record_id>F-\d{3})\]"
    r"\((?P<url>https?://[^)\s]+)\)"
)
```

The exact `F-###` label and required web URL prevent arbitrary Markdown links from being
treated as metadata.

- [ ] **Step 6: Strip markers during narration extraction**

In `_extract_narration_from_masked`, replace:

```python
spoken = PERSONAL_MARKER_RE.sub("", quoted).strip()
```

with:

```python
spoken = PERSONAL_MARKER_RE.sub("", quoted)
spoken = INLINE_EVIDENCE_LINK_RE.sub("", spoken).strip()
```

Do not alter the fenced-block masking or personal-marker lifecycle.

- [ ] **Step 7: Run focused and full validator tests**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  test_validate_annotated_script.ValidatorTests.test_inline_evidence_indicator_is_excluded_from_narration_and_word_count \
  test_validate_annotated_script.ValidatorTests.test_ordinary_markdown_link_is_not_removed_as_evidence_metadata
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest test_validate_annotated_script.py
```

Expected: focused tests pass; the full validator suite passes with the fixture still
reporting exactly 80 spoken words.

- [ ] **Step 8: Commit extraction support**

```bash
git add \
  .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py
git commit -m "feat: exclude evidence links from spoken narration"
```

### Task 2: Validate marker ownership and destination

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`

- [ ] **Step 1: Add failing validator relationship tests**

Add the following methods to `ValidatorTests`:

```python
def test_claim_mapping_requires_inline_evidence_indicator(self) -> None:
    marker = " [F-001](https://doi.org/10.1016/j.anbehav.2022.08.013)"
    document = replace_exact(APPENDIX_DOCUMENT, marker, "")
    self.assert_error(
        document,
        "Beat 01 Claims references F-001 but narration has no inline evidence indicator",
    )

def test_inline_evidence_indicator_must_be_mapped_in_same_beat(self) -> None:
    document = replace_exact(
        APPENDIX_DOCUMENT,
        "[F-001](https://doi.org/10.1016/j.anbehav.2022.08.013)",
        "[F-002](https://doi.org/10.1016/j.anbehav.2022.08.013)",
        expected_count=1,
    )
    self.assert_error(
        document,
        "Beat 01 inline evidence indicator F-002 is not mapped in Claims",
    )

def test_inline_evidence_indicator_requires_one_record(self) -> None:
    document = replace_exact(
        APPENDIX_DOCUMENT,
        "[F-001](https://doi.org/10.1016/j.anbehav.2022.08.013)",
        "[F-777](https://example.org/missing)",
        expected_count=1,
    )
    self.assert_error(
        document,
        "Beat 01 inline evidence indicator F-777 has no matching evidence record",
    )

def test_inline_evidence_indicator_url_must_match_original_url(self) -> None:
    document = replace_exact(
        APPENDIX_DOCUMENT,
        "[F-001](https://doi.org/10.1016/j.anbehav.2022.08.013)",
        "[F-001](https://example.org/wrong-source)",
        expected_count=1,
    )
    self.assert_error(
        document,
        "Beat 01 inline evidence indicator F-001 URL does not match its Original URL",
    )
```

The same-beat test covers ownership directly: the marker exists in narration but its ID is
absent from that beat's `Claims` section.

- [ ] **Step 2: Run the relationship tests and verify RED**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  test_validate_annotated_script.ValidatorTests.test_claim_mapping_requires_inline_evidence_indicator \
  test_validate_annotated_script.ValidatorTests.test_inline_evidence_indicator_must_be_mapped_in_same_beat \
  test_validate_annotated_script.ValidatorTests.test_inline_evidence_indicator_requires_one_record \
  test_validate_annotated_script.ValidatorTests.test_inline_evidence_indicator_url_must_match_original_url
```

Expected: all four tests fail because no relationship validator exists.

- [ ] **Step 3: Implement the relationship helper**

Add this helper before `_validate_references`:

```python
def _validate_inline_evidence_indicators(
    beats_text: str,
    records_by_id: dict[str, list[Record]],
    fields_by_record: dict[int, dict[str, str]],
    errors: list[str],
) -> None:
    for beat_id, beat in _beat_blocks(beats_text):
        narration = _section_body(beat, "Narration") or ""
        claims = _section_body(beat, "Claims") or ""
        claim_ids = {
            record_id
            for record_id in REFERENCE_ID_RE.findall(claims)
            if record_id.startswith("F-")
        }
        indicators = list(INLINE_EVIDENCE_LINK_RE.finditer(narration))
        indicator_ids = {match.group("record_id") for match in indicators}

        for record_id in sorted(claim_ids - indicator_ids):
            errors.append(
                f"Beat {beat_id} Claims references {record_id} but narration has no "
                "inline evidence indicator."
            )

        for match in indicators:
            record_id = match.group("record_id")
            url = match.group("url")
            if record_id not in claim_ids:
                errors.append(
                    f"Beat {beat_id} inline evidence indicator {record_id} is not "
                    "mapped in Claims."
                )

            records = records_by_id.get(record_id, [])
            if not records:
                errors.append(
                    f"Beat {beat_id} inline evidence indicator {record_id} has no "
                    "matching evidence record."
                )
                continue
            if len(records) != 1:
                errors.append(
                    f"Beat {beat_id} inline evidence indicator {record_id} requires "
                    f"exactly one evidence record; found {len(records)}."
                )
                continue

            expected_url = fields_by_record[id(records[0])].get("Original URL")
            if expected_url and url != expected_url:
                errors.append(
                    f"Beat {beat_id} inline evidence indicator {record_id} URL does "
                    f"not match its Original URL: {expected_url}."
                )
```

- [ ] **Step 4: Invoke the helper after evidence records are parsed**

In `_validate_references`, after the record loop has populated `records_by_id` and
`fields_by_record`, call:

```python
_validate_inline_evidence_indicators(
    reference_text,
    records_by_id,
    fields_by_record,
    errors,
)
```

Keep the existing missing-record, duplicate-record, orphan-record, and record-ready checks.

- [ ] **Step 5: Run focused and full validator tests**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts/scripts
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  test_validate_annotated_script.ValidatorTests.test_claim_mapping_requires_inline_evidence_indicator \
  test_validate_annotated_script.ValidatorTests.test_inline_evidence_indicator_must_be_mapped_in_same_beat \
  test_validate_annotated_script.ValidatorTests.test_inline_evidence_indicator_requires_one_record \
  test_validate_annotated_script.ValidatorTests.test_inline_evidence_indicator_url_must_match_original_url
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest test_validate_annotated_script.py
```

Expected: all focused tests and the full validator suite pass.

- [ ] **Step 6: Commit marker validation**

```bash
git add \
  .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py
git commit -m "feat: validate inline evidence source links"
```

### Task 3: Encode the format in the script skill

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`

- [ ] **Step 1: Read the skill-editing instructions**

Before changing the skill package, read
`superpowers:writing-skills` completely and follow its test-first and evaluation rules.

- [ ] **Step 2: Add a failing skill-package contract test**

Add this method to `SkillPackageTests`:

```python
def test_phase_two_factual_claims_have_clickable_inline_source_indicators(
    self,
) -> None:
    sources = {
        "skill": " ".join(SKILL_MD.read_text(encoding="utf-8").split()),
        "research": " ".join(
            (SKILL_ROOT / "references/research-and-rights.md")
            .read_text(encoding="utf-8")
            .split()
        ),
        "format": " ".join(
            (SKILL_ROOT / "references/annotated-script-format.md")
            .read_text(encoding="utf-8")
            .split()
        ),
        "template": (
            SKILL_ROOT / "assets/annotated-script-template.md"
        ).read_text(encoding="utf-8"),
    }
    core_contract = (
        "Append a visible `[F-###](Original URL)` indicator immediately after every "
        "mapped factual narration sentence or separable factual clause."
    )
    non_spoken_contract = (
        "Treat inline evidence indicators as review annotations, not spoken words; "
        "exclude them from narration extraction, word count, table reads, and "
        "teleprompter output."
    )
    for source_name in ("skill", "research", "format"):
        with self.subTest(source=source_name, contract="core"):
            self.assertIn(core_contract, sources[source_name])
        with self.subTest(source=source_name, contract="non-spoken"):
            self.assertIn(non_spoken_contract, sources[source_name])
    self.assertIn(
        "[F-001](https://doi.org/10.1016/j.anbehav.2022.08.013)",
        sources["template"],
    )
```

- [ ] **Step 3: Run the package test and verify RED**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  SkillPackageTests.test_phase_two_factual_claims_have_clickable_inline_source_indicators
```

Expected: failure because the exact Phase 2 contracts and template marker are absent.

- [ ] **Step 4: Update `SKILL.md`**

In Phase 2 step 2, immediately after the existing `F-###` mapping requirement, add:

```markdown
Append a visible `[F-###](Original URL)` indicator immediately after every mapped factual
narration sentence or separable factual clause. Treat inline evidence indicators as review
annotations, not spoken words; exclude them from narration extraction, word count, table
reads, and teleprompter output. Keep the full evidence record in the appendix.
```

Update Phase 2 step 8 and the production non-negotiables so “narration only” explicitly
allows these visible non-spoken evidence indicators. Preserve:

```markdown
Do not add these source markers to Phase 1 prototypes unless Martin explicitly asks.
```

- [ ] **Step 5: Update the research workflow**

After the existing claim-mapping paragraph in `research-and-rights.md`, add the exact two
contract sentences from Step 2, followed by:

```markdown
Each indicator must use the mapped record's stable ID and exact `Original URL`. Repeat the
indicator when the same record supports another materially separate factual sentence.
Do not create indicators for jokes, opinions, transitions, clearly labeled hypotheticals,
or guidance that makes no empirical efficacy claim.
```

Add an inline-indicator check to the reverse claim audit before its word-for-word evidence
comparison.

- [ ] **Step 6: Update the annotated format**

Revise “Numbered narration-only beats” to allow spoken blockquotes containing inline
non-spoken markers. Add this normative example:

```markdown
## 1. Descriptive name

> In 2016, OpenAI reported the experiment. [F-010](https://example.org/original)
>
> This sentence is interpretation, not a new factual claim.
```

Add the exact two contract sentences from Step 2. Specify:

```markdown
The visible label must exactly match `F-\d{3}`, the target must equal that record's
`Original URL`, and the same ID must appear in the matching appendix beat's `Claims`
section. Multiple indicators may follow one clause.
```

Update “Narration-only extraction,” “Validation,” and “Common format errors” to state that
the markers are stripped and structurally checked.

- [ ] **Step 7: Update the worked template**

Append the direct marker to the end of the sourced experimental paragraph:

```markdown
> food reward. [F-001](https://doi.org/10.1016/j.anbehav.2022.08.013)
```

Keep the template's stated word count at 80.

- [ ] **Step 8: Run skill and validator package tests**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s .agents/skills/writing-whp-youtube-scripts/scripts -p 'test_*.py'
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/writing-whp-youtube-scripts
```

Expected: the focused skill package, complete test suite, and skill structure all pass.

- [ ] **Step 9: Commit the skill contract**

```bash
git add \
  .agents/skills/writing-whp-youtube-scripts/SKILL.md \
  .agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md \
  .agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md \
  .agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md \
  .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
git commit -m "docs: require clickable production claim sources"
```

### Task 4: Add direct source indicators to Episode 1

**Files:**
- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`
- Modify: `whp-youtube/STEERING.md`
- Modify: `DECISIONS.md`

- [ ] **Step 1: Record the current narration count**

Run:

```bash
python3 -c "from pathlib import Path; import sys; sys.path.insert(0, '.agents/skills/writing-whp-youtube-scripts/scripts'); from validate_annotated_script import count_narration_words; print(count_narration_words(Path('whp-youtube/episodes/01-why-ai-cheats.md').read_text()))"
```

Expected: `1027`.

- [ ] **Step 2: Add markers to Beats 1 and 2**

Use the exact evidence-record URLs:

```markdown
[F-010](https://openai.com/index/faulty-reward-functions/)
[F-011](https://openai.com/index/chain-of-thought-monitoring/)
[F-002](https://deepmind.google/blog/specification-gaming-the-flip-side-of-ai-ingenuity/)
```

Place `F-010` after the CoastRunners setup, observed looping behavior, higher-score result,
and Beat 2 score-mechanism explanation. Place `F-011` after the 2025 coding exploit,
present-relevance statement, coding evaluation explanation, and “reward hacking”
terminology. Place `F-002` after the specification-gaming definition.

Update the Beat 2 appendix claim entry for `F-011` so it also quotes:

```text
Researchers call this reward hacking.
```

- [ ] **Step 3: Add markers to Beats 3 and 4**

Use:

```markdown
[F-012](https://www.police.vic.gov.au/sites/default/files/2019-04/Taskforce%20Deliver%202018%20-%20Executive%20Summary%20and%20Recommendations.pdf)
[F-006](https://doi.org/10.1007/978-1-349-17295-5_4)
[F-009](https://files.consumerfinance.gov/f/documents/092016_cfpb_WFBconsentorder.pdf)
[F-007](https://jmde.com/index.php/jmde_1/article/view/297/)
[F-008](https://www.edweek.org/teaching-learning/report-details-culture-of-cheating-in-atlanta-schools/2011/07)
[F-014](https://www.cftc.gov/PressRoom/PressReleases/6289-12)
[F-013](https://www.epa.gov/vw/learn-about-volkswagen-violations)
```

Repeat `F-012` after each materially separate Victoria Police fact group and `F-006` after
the law definition and 1975 origin. In Beat 4, place the relevant indicator after each
Wells Fargo, Campbell, Atlanta, Barclays, and Volkswagen factual group. Do not mark the
mechanism-derived jokes or montage conclusion.

- [ ] **Step 4: Update script metadata without changing narration**

Change:

```markdown
- **Version:** 2.0
```

to:

```markdown
- **Version:** 2.1
```

Update `Evidence review` to say that each mapped factual claim now carries a direct inline
link to its evidence record's original source. Change the Editorial audit version to `2.1`
while retaining `Status: Not run`.

- [ ] **Step 5: Reconcile channel doctrine**

In the `STEERING.md` rigor-covenant bullet “Keep facts traceable inside the production
script,” add:

```markdown
In the evidence-backed production version, append a clickable `[F-###](Original URL)`
review indicator immediately after each mapped factual sentence or separable clause. These
markers are visible for review but excluded from spoken narration and word count.
```

Append one entry to `DECISIONS.md`:

```markdown
## 2026-07-23 — Put clickable evidence indicators beside production claims

**Decision:** Every factual sentence or separable factual clause in an evidence-backed WHP
production script carries a visible `[F-###](Original URL)` indicator beside the claim;
the indicator is review metadata and is excluded from spoken narration and word count.

**Rationale:** Martin could not readily locate the source for Episode 1's opening OpenAI
claim because the URL was buried in the appendix evidence ledger. The source relationship
must be visible where the claim is read.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md`,
`.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`,
`.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`whp-youtube/episodes/01-why-ai-cheats.md`, and this ledger. `BRAND.md` remains unchanged
because this refines evidence-review presentation rather than brand scope or identity.
```

- [ ] **Step 6: Validate Episode 1 and confirm count stability**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py \
  whp-youtube/episodes/01-why-ai-cheats.md
python3 -c "from pathlib import Path; import sys; sys.path.insert(0, '.agents/skills/writing-whp-youtube-scripts/scripts'); from validate_annotated_script import count_narration_words; print(count_narration_words(Path('whp-youtube/episodes/01-why-ai-cheats.md').read_text()))"
```

Expected: structural `PASS`; narration count remains `1027`.

- [ ] **Step 7: Review source-marker coverage manually**

Read only the numbered narration beats and check every factual sentence or separable clause
against the matching appendix `Claims` section. Confirm:

- no factual marker points to a secondary URL when its evidence record has a primary
  `Original URL`;
- no joke, transition, hypothetical email, or viewer question gained a fake citation;
- audible attribution remains intact for `REPORTED` and regulator-attributed cases; and
- Beat 5 and Beat 6 remain free of markers because they contain hypothetical illustration
  and bounded guidance rather than sourced factual claims.

- [ ] **Step 8: Commit Episode 1 and doctrine**

```bash
git add \
  whp-youtube/episodes/01-why-ai-cheats.md \
  whp-youtube/STEERING.md \
  DECISIONS.md
git commit -m "docs: link episode one claims to original sources"
```

### Task 5: Run the final verification gate

**Files:**
- Verify only; no planned file changes.

- [ ] **Step 1: Run the complete test suites**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s .agents/skills/choosing-whp-video-topic/scripts -p 'test_*.py'
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s .agents/skills/writing-whp-youtube-scripts/scripts -p 'test_*.py'
```

Expected: both suites pass with zero failures.

- [ ] **Step 2: Validate both skill packages**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/choosing-whp-video-topic
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/writing-whp-youtube-scripts
```

Expected: `Skill is valid!` twice.

- [ ] **Step 3: Validate the episode and narration count**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py \
  whp-youtube/episodes/01-why-ai-cheats.md
python3 -c "from pathlib import Path; import sys; sys.path.insert(0, '.agents/skills/writing-whp-youtube-scripts/scripts'); from validate_annotated_script import count_narration_words; print(count_narration_words(Path('whp-youtube/episodes/01-why-ai-cheats.md').read_text()))"
```

Expected: structural `PASS` and `1027`.

- [ ] **Step 4: Check repository hygiene and the final commit range**

Run:

```bash
git diff --check a6535bb..HEAD
git status --short
git log --oneline --decorate a6535bb..HEAD
```

Expected: no diff-check output, clean status, and the four implementation commits from
Tasks 1–4 (Task 1 and Task 2 are separate validator commits; Task 3 is the skill contract;
Task 4 is Episode 1 and doctrine).

- [ ] **Step 5: Report boundaries honestly**

Report that structural validation checks marker IDs, beat ownership, URLs, extraction, and
word count. Repeat that it does not prove factual truth or source quality. State that the
deferred editorial, retention, and timing audits remain unrun.
