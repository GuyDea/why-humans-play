# Inline Script Source Indicators Design

**Date:** 2026-07-23
**Status:** Approved design; implementation pending written-spec review
**Scope:** Evidence-backed WHP production scripts and the annotated-script format

## Decision

Show a direct, clickable evidence indicator immediately after every factual narration
sentence or separable factual clause in an evidence-backed WHP script. Use the stable
evidence ID as the visible label and the evidence record's `Original URL` as its link:

```markdown
> In 2016, OpenAI trained an AI to play a boat-racing game. [F-010](https://openai.com/index/faulty-reward-functions/)
```

The indicator is a visible review annotation, not spoken narration. Narration extraction,
word count, table-read output, and future teleprompter output must remove it. The complete
evidence record remains in the appendix for source context, locators, scope, caveats,
cross-checks, and approved wording.

## Problem

The current production format maps factual narration to `F-###` IDs in each appendix beat
and stores a source URL in the final evidence ledger. That is structurally traceable, but a
reader evaluating the narration must search the appendix twice: first for the beat mapping
and then for the corresponding evidence record. This made the source for the opening
CoastRunners claim appear missing even though it existed under `F-010`.

The review layer needs to expose the source relationship where the claim is read, without
turning URLs or evidence IDs into words Martin is expected to narrate.

## Goals

- Make every factual narration claim visibly and immediately traceable.
- Give Martin a directly clickable original-source URL beside the relevant sentence.
- Preserve stable `F-###` IDs across revisions.
- Keep citation indicators out of spoken narration and word counts.
- Retain the detailed appendix evidence ledger as the authoritative claim record.
- Make citation integrity structurally checkable where deterministic checks are possible.
- Keep the format usable by the planned local script-editing workbench.

## Non-goals

- Do not speak evidence IDs or URLs in the recorded narration.
- Do not replace the detailed evidence records with inline links.
- Do not add source markers to ordinary rapid prototypes unless Martin requests them.
- Do not treat a clickable URL as proof that the source supports the wording.
- Do not change Episode 1's approved narration, factual wording, timing, or editorial status.
- Do not run the deferred editorial, retention, or timing audits as part of this change.

## Marker format

Use a Markdown link whose visible label is exactly one stable evidence ID:

```markdown
[F-010](https://openai.com/index/faulty-reward-functions/)
```

Place it immediately after the factual sentence or clause it supports. When a sentence
requires multiple records, place the indicators consecutively:

```markdown
[F-010](https://example.org/source-one) [F-011](https://example.org/source-two)
```

Use one marker again when the same record supports another materially separate sentence.
Do not add markers to jokes, opinions, transitions, clearly labeled hypotheticals, or
viewer instructions that make no empirical efficacy claim.

Each inline link must:

1. use an `F-###` ID defined by exactly one evidence record;
2. appear in the same numbered beat whose appendix `#### Claims` section maps that ID;
3. link to the exact `Original URL` stored in that evidence record; and
4. retain the claim's audible attribution and caveat where the evidence status requires it.

## Reading layers

The production document will still have two conceptual reading layers:

1. **Review narration:** numbered beats containing spoken blockquotes plus visible,
   non-spoken `F-###` source indicators.
2. **Production appendix:** beat-matched claim mappings and complete evidence records.

The narration extractor must remove only Markdown links whose visible label exactly matches
`F-\d{3}`. It must not strip ordinary Markdown links or arbitrary bracketed text. Removing a
marker must not join adjacent words or alter punctuation.

The extracted narration and metadata `Word count` must therefore remain unchanged when
source indicators are added.

## Structural validation

Extend the annotated-script validator to check the relationships that syntax can establish:

- every inline `F-###` indicator resolves to one evidence record;
- every indicator's target equals that record's `Original URL`;
- every indicator is mapped in the matching appendix beat's `#### Claims` section;
- every factual ID mapped by a beat's claim entries appears as an inline indicator in that
  narration beat; and
- indicators are ignored during narration extraction and word counting.

The validator cannot determine whether every natural-language factual clause has been
identified or whether a source substantively supports it. The existing human reverse-claim
audit remains responsible for semantic coverage, evidence quality, and wording accuracy.

## Episode 1 application

Add inline indicators throughout
`whp-youtube/episodes/01-why-ai-cheats.md`. The opening claim will become directly
checkable from the narration:

```markdown
> In 2016, OpenAI trained an AI to play a boat-racing game. [F-010](https://openai.com/index/faulty-reward-functions/)
```

Apply the same treatment to the 2025 coding-agent example, specification-gaming
definition, Victoria Police case, Goodhart's law, Wells Fargo case, Campbell's law,
Atlanta investigation, Barclays enforcement action, and Volkswagen enforcement account.
Do not mark the hypothetical email or the four viewer questions as factual evidence claims.

## Skill and doctrine updates

Update the WHP script-writing skill, annotated format, research method, template, and
channel steering so Phase 2 requires visible linked evidence indicators. Preserve the
existing Phase 1 rule: rapid prototypes omit evidence scaffolding unless Martin explicitly
requests it.

Record the accepted decision once in `DECISIONS.md`. No brand-scope change is required:
the decision strengthens the existing rigor covenant but does not change what WHP is.

## Test strategy

Use test-first implementation:

1. Add failing extraction tests proving valid `F-###` links are excluded from spoken text
   and word count.
2. Add failing validator tests for a missing inline indicator, unknown ID, beat mismatch,
   and URL mismatch.
3. Add skill-package contract tests for direct clickable Phase 2 indicators.
4. Implement the smallest parser, validator, documentation, and template changes.
5. Add indicators to Episode 1 and confirm its narration word count remains unchanged.
6. Run the complete script-skill suite, skill-package validation, annotated-script
   validation, and `git diff --check`.

## Expected files

- `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- `.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md`
- `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`
- `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`
- `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`
- `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`
- `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- `whp-youtube/episodes/01-why-ai-cheats.md`
- `whp-youtube/STEERING.md`
- `DECISIONS.md`

`BRAND.md` remains unchanged because this decision refines evidence-review presentation,
not brand identity, editorial scope, or the launch sequence.
