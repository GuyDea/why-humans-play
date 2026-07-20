# Annotated Script Format

## Contents

- [Purpose and source of truth](#purpose-and-source-of-truth)
- [Header](#header)
- [Beat blocks](#beat-blocks)
- [Stable IDs](#stable-ids)
- [Evidence and asset records](#evidence-and-asset-records)
- [End-reference sections](#end-reference-sections)
- [Readiness states](#readiness-states)
- [Record-ready gate](#record-ready-gate)
- [Narration-only extraction](#narration-only-extraction)
- [Validation](#validation)
- [Common format errors](#common-format-errors)

## Purpose and source of truth

Keep one Markdown document as the source of truth for each script. Put clean spoken
narration in blockquotes and keep the production notes for that narration in the same
beat, directly beside it. Do not maintain separate editable narration and production
documents that can drift out of sync.

## Header

Place the H1 episode heading first. Follow it with these 14 fields, using the exact
labels and order shown:

```markdown
- **Status:** RESEARCH-DRAFT
- **Version:** 0.1
- **Target runtime:** 00:20
- **Word count:** 52
- **Audience:** Curious adults
- **Episode mode:** Why We Play
- **Title:** The Bee That Chose a Toy
- **Thumbnail promise:** A bee rolling a wooden ball
- **Viewer promise:** See why one tiny detour changed the case for animal play.
- **Central question:** Can an insect play without an external reward?
- **Thesis:** The behavior meets established play criteria, with interpretive limits.
- **Payoff:** Play-like behavior does not require a mammalian brain.
- **Evidence review:** Primary paper checked; interpretation remains bounded.
- **Rights review:** A-001 figure candidate recorded under CC BY 4.0; attribution and adaptation notice specified.
```

Give every field a non-empty, assignment-specific value:

1. **Status:** Set the document's current readiness state using the exact vocabulary
   defined below.
2. **Version:** Record a revision identifier that changes when the document changes.
3. **Target runtime:** State the intended total duration in a clear time format.
4. **Word count:** State the current number of spoken narration words only.
5. **Audience:** Name the people the episode is written to serve.
6. **Episode mode:** Name the applicable channel format or editorial mode.
7. **Title:** Record the proposed public title whose promise the script must fulfill.
8. **Thumbnail promise:** State what the thumbnail leads the viewer to expect.
9. **Viewer promise:** State the useful experience, understanding, or change the
   episode delivers.
10. **Central question:** State the main question the narration investigates.
11. **Thesis:** State the bounded answer the evidence supports.
12. **Payoff:** State the final resolution delivered to the viewer.
13. **Evidence review:** Summarize the current factual-review state and unresolved
    evidence limits.
14. **Rights review:** Summarize the current asset-rights review and unresolved
    production dependencies.

Keep header metadata above the first beat. Update the word count, runtime, version,
and review summaries whenever the script changes materially.

## Beat blocks

Use two-digit beat numbers in unique, strictly ascending order. Repeat this exact
stacked structure for every beat:

```markdown
## Beat 01 — Descriptive name
_Time: 00:00–00:18 · Target: ~42 words_

### Narration
> Clean spoken copy.

### Story function
What changes for the viewer and which promise or question this serves.

### Claims
- `F-001` — Short claim label and confidence status.

### Visual
- Treatment and `A-001` asset reference.
- Fallback if the preferred material cannot be used.

### Motion / edit
- Exact reveal, transition, comparison, or movement.
- **Animation purpose:** What motion makes easier to understand.

### On-screen text
- Minimal labels, numbers, quotation, and compact citation.

### Audio / accessibility
- Music or sound cue.
- Essential visual information needed in a descriptive transcript.

### Assets
- `A-001` — Intended use and rights status.
```

Keep all eight level-three subsections, even when a subsection records an intentional
choice to use no additional element. Under `Motion / edit`, include either a
non-empty `**Animation purpose:**` field or an explicit `No animation — ...`
explanation. State what motion clarifies; do not use animation as an unsupported
decorative instruction.

## Stable IDs

Use `F-###` for evidence claims and `A-###` for visual or archival assets. Use exactly
three digits, starting with forms such as `F-001` and `A-001`. Keep every ID unique
within its type. Never reuse an ID for a different claim or asset, including after
deletion. Preserve IDs while revising the same claim's wording, evidence, locators,
or cross-checks, and while revising the same asset's treatment or beat placement.
Assign a new `F-###` ID for a new factual claim and a new `A-###` ID for a new asset.

Reference each ID in a beat before defining its single matching record in the end
ledgers. Make every beat-level claim or asset status exactly match the status in its
ledger record. Do not leave orphan records or references without records.

## Evidence and asset records

Keep claim evidence and visual-asset permissions separate. Use an `F-###` record to
show why narration wording is supportable. Use an `A-###` record to show where visual
material came from and what, if anything, permits publication. Do not treat a source
that supports a claim as permission to reproduce an asset, and do not treat an asset
page as evidence for a factual claim.

### Evidence records

Create one level-four record under `### Evidence references` for each referenced
`F-###` ID. Include all 12 fields with the exact labels below:

```markdown
#### F-001 — Short claim name
- **Exact claim:** The smallest factual statement the script needs.
- **Original URL:** https://example.org/original-source
- **Source / author:** Author or originating institution and publication
- **Date:** Publication or event date
- **Locator:** Precise page, table, figure, section, paragraph, or timestamp
- **Accessed:** YYYY-MM-DD
- **Scope:** Population, context, denominator, limits, and relevant applicability
- **Cross-checks:** Independent source URLs or an explicit record that none were found
- **Contradictions:** Conflicting evidence or an explicit record that none was found
- **Status:** VERIFIED
- **Caveat:** Limitation the script must preserve
- **Approved wording:** Exact narration-safe wording supported by this record
```

Set `Status` to one of `VERIFIED`, `CORROBORATED`, `REPORTED`,
`UNVERIFIED-EXAMPLE`, `DISPUTED`, or `REJECTED`. Use an `http://` or `https://` URL
for `Original URL`. Keep the record descriptive; apply the separate research method
when deciding source quality, status, or wording.

### Asset records

Create one level-four record under `### Visual and archival sources` for each
referenced `A-###` ID. Include all 11 fields with the exact labels below:

```markdown
#### A-001 — Short asset name
- **Original asset page:** https://example.org/asset-page
- **Direct production file:** https://example.org/production-file
- **Creator / rightsholder:** Named creator or rightsholder
- **Rights basis:** Specific license, ownership, permission, or review basis
- **License and version:** Exact license and version, or an explicit not-applicable value
- **Commercial use / adaptation:** Recorded terms or unresolved limits
- **Planned changes:** Crop, edit, overlay, excerpt, or other intended treatment
- **Required attribution:** Publication-ready credit or an explicit none-required value
- **Intended beat:** Beat 01
- **Accessed:** YYYY-MM-DD
- **Status:** CC-BY-4.0
```

Use an `http://` or `https://` URL for `Original asset page` and for every non-empty
`Direct production file`. Leave `Direct production file` empty only when no direct
file is known; do not omit the field.

Set `Status` to `OWNED`, a versioned `CC-*` value, `CC0`, `PUBLIC-DOMAIN`,
`PERMISSION-ON-FILE`, `COMMERCIAL-LICENSE`,
`FAIR-USE-CANDIDATE-NOT-CLEARED`, `REFERENCE-ONLY-RIGHTS-UNVERIFIED`, or
`UNKNOWN-BLOCKED`. For a `PUBLIC-DOMAIN` record, state both the public-domain basis
and its jurisdiction in `Rights basis`. Prefer
`Basis: ...; Jurisdiction: ...` for deterministic clarity; equivalent natural wording
is allowed when it still states both elements explicitly.

## End-reference sections

End the document with one `## References and source materials` heading. Place these
four level-three sections under it in this exact order:

Apply this structure even when the requested artifact is only a targeted beat,
insert, audit, or revision excerpt; use an explicit none-needed statement in any
section that has no records.

1. `### Evidence references`
2. `### Visual and archival sources`
3. `### Unverified or disputed material`
4. `### Attribution copy`

Put every `F-###` record in the first section and every `A-###` record in the second.
Use the third section to identify unresolved or conflicting material and the checks
already performed; write an explicit none-used statement when it is empty. Put the
exact publication-ready credits required by asset records in the fourth section;
write an explicit none-required statement when it is empty.

## Readiness states

Use exactly one of these header states:

- `RESEARCH-DRAFT`: Use while claims, wording, visual candidates, or rights remain
  under investigation.
- `EDITORIAL-DRAFT`: Use after the narration and story direction receive editorial
  approval while clearly recording any remaining evidence, rights, or production
  work.
- `RECORD-READY`: Use only after the gate below is satisfied. Require complete
  evidence records, no rejected or unqualified unverified claims, and either a usable
  treatment or an explicit production fallback for every required visual. Keep a
  reference-only asset only when it is not required for the planned final cut.
- `PICTURE-LOCKED`: Treat this state as outside v1; do not use this format workflow to
  certify it.

Treat every unresolved dependency as unresolved regardless of the current label.
Require an authorized human reviewer to promote readiness; do not infer approval from
document completeness.

## Record-ready gate

`RECORD-READY` requires human editorial approval plus complete evidence and rights
review. A passing validator is necessary but never sufficient. Do not self-promote a
draft merely because its structure passes.

## Narration-only extraction

Build table-read and teleprompter copy by concatenating only the blockquotes directly
under each `### Narration`, in beat order. Preserve the spoken words and paragraph
order. Never include story, claim, visual, motion, on-screen, audio, accessibility,
asset, header, or end-ledger notes in the narration-only copy.

## Validation

Resolve the target script path to an absolute path at runtime before changing to the skill directory. Resolve the skill directory from the loaded `SKILL.md`, change to it, and run:

```bash
python3 scripts/validate_annotated_script.py -- "<resolved-script-path>"
```

Do not hardcode the skill package path or use a vendor-specific environment variable. The dynamically resolved target path may be absolute; pass it as one quoted argument after `--`.

Use the validator to check that required header fields and end sections exist; beat
IDs are well formed, unique, and ascending; every beat contains all required
subsections; motion notes state an animation purpose or explicitly decline
animation; referenced fact and asset IDs have exactly one record; records contain
their required fields; required URLs and status values have valid forms; and a
`RECORD-READY` document has no structurally blocked referenced dependencies.

Treat the validator as a structural check only. Preserve its limitation exactly:

```text
Structural validation only: this does not verify factual truth, source trustworthiness, copyright ownership, fair use, or editorial quality.
```

The validator does not compare narration with `Approved wording`, verify beat-level
and ledger status consistency, or assess whether records are substantively complete.
Check those requirements separately.

Do not use a passing result as evidence that facts, sources, rights, fair use,
storytelling, visuals, or editorial judgment are sound.

## Common format errors

Avoid these errors:

- Putting production notes, citations, or directions inside narration blockquotes.
- Changing or recycling `F-###` or `A-###` IDs during revision.
- Treating a source URL as permission to publish an asset.
- Naming a preferred visual without a production fallback.
- Requesting animation without stating its explanatory purpose.
- Omitting any of the four required end ledgers.
- Labeling a document `RECORD-READY` while an evidence, rights, editorial, or required
  production dependency remains unresolved.
