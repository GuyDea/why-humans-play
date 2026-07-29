# Annotated Script Format

## Contents

- [Purpose and source of truth](#purpose-and-source-of-truth)
- [Document layers](#document-layers)
- [Numbered narration-only beats](#numbered-narration-only-beats)
- [Beat-matched production appendix](#beat-matched-production-appendix)
- [Personal input and viewer application](#personal-input-and-viewer-application)
- [Stable IDs](#stable-ids)
- [Evidence and asset records](#evidence-and-asset-records)
- [End-reference sections](#end-reference-sections)
- [Shorts plan](#shorts-plan)
- [Optional appendix sections](#optional-appendix-sections)
- [Readiness states](#readiness-states)
- [Record-ready gate](#record-ready-gate)
- [Narration-only extraction](#narration-only-extraction)
- [Validation](#validation)
- [Common format errors](#common-format-errors)

## Purpose and source of truth

This reference owns only the complete `final/script.extended.md` appendix. The
[Script Artifact Pair](script-artifact-pair.md) reference owns the paired files, exact
synchronization, storytelling markup, purpose annotations, and stage promotion.
`final/script.raw.md` owns every spoken word and all storytelling markup.
`final/script.extended.md` mirrors that raw narration exactly, then adds purpose
annotations, inline evidence indicators, and the production appendix defined here.

Validate the raw/extended pair first. For a final pair, pair validation delegates the
complete extended document to the annotated-script validator, which itself sets aside
standalone purpose annotations before the appendix and preserves inline evidence — so the
pair-side check and a direct validator run always agree. This keeps raw authoritative
while retaining one review and production view that cannot silently drift from it.

## Document layers

Use this top-level order in `final/script.extended.md`:

1. H1 episode heading.
2. Numbered narration-only beats.
3. One `## Appendix` heading containing script metadata, production notes, editorial audit
   results, and references.

The extended narration layer may add grouped standalone purpose annotations immediately
before the passages they explain. Do not put header fields, timestamps, targets,
story-function labels, claims, citations other than required inline evidence indicators,
visuals, edit instructions, on-screen text, audio notes, accessibility notes, assets,
personal-input fields, viewer-application fields, or editorial commentary in that layer.

## Numbered narration-only beats

Use ordinary ascending numbers and a descriptive title. In the final extended view, the
beat body may contain only grouped standalone purpose annotations, spoken blockquotes,
blank lines, unresolved personal-input markers inside blockquotes, inline evidence
indicators appended to mapped factual narration inside those blockquotes, and the
storytelling markup mirrored from raw:

```markdown
## 1. Descriptive name

> In 2016, OpenAI reported the experiment. [F-010](https://example.org/original)
>
> This sentence is interpretation, not a new factual claim.
>
> **This locked punchline is delivered word-perfect.**
```

Append a visible `[F-###](Original URL)` indicator immediately after every mapped factual
narration sentence or separable factual clause. Treat inline evidence indicators as review
annotations, not spoken words; exclude them from narration extraction, word count, table
reads, and teleprompter output. Treat locked-line bolding the same way for word counts and
readability checks — the asterisks are annotation, not speech — but keep the bolding
visible in teleprompter and rehearsal copy, where it tells Martin which lines are
word-perfect and which he may say his own way. The visible label must exactly match `F-\d{3}`, the target
must equal that record's `Original URL`, and the same ID must appear in the matching appendix
beat's `Claims` section. Multiple indicators may follow one clause.

Each numbered beat must have exactly one matching appendix beat entry. Its number and title
must match exactly; narration beat `## 1. Descriptive name` maps to appendix beat
`### Beat 01 — Descriptive name`.

When a beat's narration uses a named storytelling move such as an investigation-challenge
bridge, name that move and the real evidence gap it voices in the beat's `Story function`
entry, so every use of the technique stays traceable from the appendix.

## Beat-matched production appendix

Begin the appendix with `### Script metadata`. Place these 16 fields beneath it, using the
exact labels and order shown:

```markdown
- **Status:** RESEARCH-DRAFT
- **Version:** 0.1
- **Deliverable:** FULL-SCRIPT
- **Target runtime:** 00:30
- **Word count:** 80
- **Audience:** Curious adults
- **Episode mode:** Why We Play
- **Title:** The Bee That Chose a Toy
- **Thumbnail promise:** A bee rolling a wooden ball
- **Viewer promise:** See why one tiny detour changed the case for animal play.
- **Useful viewer change:** Notice when behavior meets operational play criteria without assuming subjective experience.
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
3. **Deliverable:** Use exactly `FULL-SCRIPT` or `TARGETED-ARTIFACT` as defined below.
4. **Target runtime:** State the intended total duration in a clear time format.
5. **Word count:** State the current number of extracted spoken narration words only.
6. **Audience:** Name the people the episode is written to serve.
7. **Episode mode:** Name the applicable channel format or editorial mode.
8. **Title:** Record the proposed public title whose promise the script must fulfill.
9. **Thumbnail promise:** State what the thumbnail leads the viewer to expect.
10. **Viewer promise:** State the useful experience, understanding, or change the
   episode delivers.
11. **Useful viewer change:** State the specific evidence-bounded change in what the
    viewer can notice, ask, choose, or do.
12. **Central question:** State the main question the narration investigates.
13. **Thesis:** State the bounded answer the evidence supports.
14. **Payoff:** State the final resolution delivered to the viewer.
15. **Evidence review:** Summarize the current factual-review state and unresolved
    evidence limits.
16. **Rights review:** Summarize the current asset-rights review and unresolved
    production dependencies.

Use `FULL-SCRIPT` for a complete episode or Short. It requires exactly one
`#### Personal input` block and exactly one `#### Viewer application` block across the
document. Use `TARGETED-ARTIFACT` for an audit, isolated beat, visual plan, or revision
excerpt. It need not add either block, but every personal-input or viewer-application
block that appears must follow the complete schema below.

Require a non-empty `Useful viewer change` for both deliverable values. A targeted
artifact may name the inherited change it serves or state that it does not alter the
parent script's approved change.

Keep metadata inside the appendix rather than above or inside the narration beats. Update
the word count, runtime, version, and review summaries whenever the script changes
materially.

When the scope below requires it, add this compact record immediately after metadata:

```markdown
### Approved story progression

- **Plan status:** APPROVED
- **Approved by:** Martin
- **Story engine:** One sentence describing the opening-to-payoff route.
- **Full causal read:** A compact end-to-end `BUT` / `THEREFORE` diagnostic.
- **Selected techniques:** The chosen moves and their `SP` beat IDs.
- **Global loop / payoff closure:** Opening and final `SP` IDs for every important loop.
- **Throughline decision:** `NONE` with a reason, or the selected sidecar and its job.
- **Open evidence dependencies:** `NONE`, or every load-bearing provisional item.
- **Plan-change tradeoffs:** `NONE`, or the evidence-driven change and preserved cost.

#### Progression beat SP01 — Descriptive name
- **Starting question or expectation:** The viewer's starting state.
- **Event or evidence:** The material entering the story.
- **BUT — complication:** `NOT APPLICABLE` — orientation beat with a stated job.
- **THEREFORE — consequence or required next step:** The next logical need.
- **Selected technique:** `NONE` when direct explanation is strongest.
- **Loop or payoff:** The loop state.
- **Proof job and evidence boundary:** What the beat proves and where it stops.
```

Only `Status` in `### Script metadata` records document readiness. Every other status-like
field states what it governs — `Plan status`, `Throughline status`, and the `Status` inside
an `F-###` or `A-###` record — so no two vocabularies share a label.

Populate the Narrative throughline audit from the approved plan's Throughline decision;
do not make production choose a second throughline. A `TARGETED-ARTIFACT` includes or
updates the progression record only when its assigned scope sets or changes central
progression. Require the record for a `FULL-SCRIPT` entering production with an approved
progression. Do not fabricate or backfill a plan for a legacy script unless its central
progression is being set or changed; the rubric evaluates intrinsic causality when no plan
is in scope. This record is enforced by the format, template, and package tests; the
structural validator does not check it.

After metadata, add this transparent story-structure record for every `FULL-SCRIPT`
entering the Final stage through the plan gate:

```markdown
### Narrative throughline audit

- **Throughline status:** FOUND
- **Throughline:** The person, situation, or documented case that runs beside the argument.
- **Audience connection:** Why the target viewer recognizes the goal, temptation, or stakes.
- **Opening hook / loop:** The exact unresolved turn opened near the beginning.
- **Obstacle / tension:** The goal and real obstacle that keep the sidecar moving.
- **Payoff:** How the outcome sharpens the final lesson.
- **Beat map:** Beat 01 — hook; Beat 02 — setup; Beat 04 — reinterpretation; Beat 07 — payoff.
- **Absence reason:** Not applicable — a supporting narrative throughline was found.
```

Use `FOUND` only when the story recurs with distinct jobs and earns an explicit payoff.
The episode's argument remains the spine; the supporting narrative throughline is a
sidecar. In each matching appendix beat's `Story function`, name the throughline role and
the new information or changed meaning delivered there. Do not use the case as proof for a
mechanism established by separate evidence.

When no candidate earns the role, use `NONE` and explain why in `Absence reason`. Keep the
other fields explicit about the absence instead of inventing a story, scattering unrelated
examples, or forcing a callback. For a `TARGETED-ARTIFACT`, include or update this audit
only when the assigned scope creates, removes, or changes the parent script's throughline.

After script metadata, add one production entry for every narration beat. Use two-digit
beat numbers in unique, strictly ascending order and repeat the exact narration title:

```markdown
### Beat 01 — Descriptive name
- **Time:** 00:00–00:18
- **Target:** ~42 words

#### Story function
What changes for the viewer and which promise or question this serves.

#### Claims
- `F-001` — Supports narration: “Exact factual wording from this beat.” — confidence status.

#### Visual
- Treatment and `A-001` asset reference.
- Fallback if the preferred material cannot be used.

#### Motion / edit
- Exact reveal, transition, comparison, or movement.
- **Animation purpose:** What motion makes easier to understand.

#### On-screen text
- Minimal labels, numbers, quotation, and compact citation.

#### Audio / accessibility
- Music or sound cue.
- Essential visual information needed in a descriptive transcript.

#### Assets
- `A-001` — Intended use and rights status.
```

Keep all seven level-four production subsections in the order listed above, even when a
subsection records an intentional choice to use no additional element. Place the optional
`#### Personal input` and `#### Viewer application` blocks after `#### Assets`, so the
required production record of a beat always reads in one fixed order. Narration exists only in the numbered
beat layer and is not repeated in the appendix. Under `Motion / edit`, include either a
non-empty `**Animation purpose:**` field or an explicit `No animation — ...`
explanation. State what motion clarifies; do not use animation as an unsupported
decorative instruction.

Map every factual narration sentence or separable factual clause to at least one `F-###` ID
in the matching appendix beat's `#### Claims` section. Quote the supported narration wording
in each claim entry so the source mapping stays visible outside the spoken narration. One
entry may quote multiple nearby statements only when its evidence record supports all of
them. Do not assign source markers to jokes, opinions, transitions, clearly signaled
hypotheticals, or guidance that makes no empirical efficacy claim, merely to make the
section look complete. This semantic coverage remains a
human audit; the structural validator does not prove it.

Place each optional structured block in the beat where it performs its narrative job, at
that beat's fixed position above. Use these exact schemas:

```markdown
#### Personal input
- **ID:** PI-001
- **Decision:** INPUT-REQUESTED
- **Story purpose:** What changes for the viewer because this is personal.
- **Primary prompt:** One specific memory question for Martin.
- **Follow-up prompts:** Two to four concrete recall prompts.
- **Bridge in:** Narration-safe transition into the personal moment.
- **Bridge out:** Narration-safe return to the evidence or next question.
- **Personal visuals:** Optional object, location, photo, screen, or demonstration ideas.
- **Omit when:** The condition under which the sequence should be cut.

#### Viewer application
- **Insight:** The evidence-bounded idea being handed back.
- **Try:** One low-risk action, observation, or reflection.
- **Observe:** What signal, response, or pattern to notice.
- **Boundary:** When the action does not apply or what it cannot establish.
- **Larger benefit:** How this helps the viewer see, choose, learn, or play more deliberately.
```

These are additional structured beat sections governed by the deliverable-level
cardinality above. Keep every listed field exactly once and non-empty whenever either
block appears. `Personal visuals` may explicitly decline a separate visual, but the
field itself must not be blank.

## Personal input and viewer application

For a personal-input block, use an ID in exact `PI-###` form and choose exactly one
decision: `INPUT-REQUESTED`, `COMPLETED`, or `OMIT`. Apply the removal test: if deleting
the sequence changes nothing for the viewer, choose `OMIT` and give the story-specific
reason in `Omit when`. Never invent Martin's experience.

Use this exact unresolved annotation in the numbered personal beat's narration, changing
only the three-digit ID to match the appendix block:

```markdown
> <!-- PI-001: Martin input -->
```

`INPUT-REQUESTED` requires exactly one matching marker in the same beat's narration
and is allowed only while `Status` is `RESEARCH-DRAFT`. Use `COMPLETED` only for
material Martin supplied and approved, and remove the marker.

For `OMIT`, keep every field non-empty. In `Primary prompt`, `Follow-up prompts`,
`Bridge in`, `Bridge out`, and `Personal visuals`, give a concise, story-specific
explanation of why that field is not applicable. Do not use generic `N/A` or placeholder
copy, invent a memory, or write a transition that will be narrated.

Remove the marker for `OMIT`. Do not leave orphaned, duplicate, or mismatched
personal-input markers.

Build the viewer application as `insight → try → observe → boundary → larger benefit`.
Voice all five application elements in narration: insight; action, observation, or
reflection; observable signal; boundary; and larger benefit. The structured block is
the production contract, not a substitute for spoken copy. Determining whether the
application is useful, evidence-bounded, safe, or editorially strong remains a human
review task.

Personal-input markers are annotations, not spoken copy. Exclude them from table-read
and teleprompter extraction and from `Word count`. Set `Word count` to the exact number
of spoken words remaining after narration extraction and marker removal, counted the way
the validator counts: a word is a run of letters or digits, hyphens and apostrophes keep
a word whole, and a standalone dash or other punctuation token is not a word.

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

Create one level-five record under `#### Evidence references` for each referenced
`F-###` ID. Include all 12 fields with the exact labels below:

```markdown
##### F-001 — Short claim name
- **Exact claim:** The smallest factual statement the script needs.
- **Original URL:** https://example.org/original-source
- **Source / author:** Author or originating institution and publication
- **Date:** Publication or event date
- **Locator:** Precise page, table, figure, section, paragraph, or timestamp
- **Accessed:** YYYY-MM-DD
- **Scope:** Population, context, denominator, limits, and relevant applicability
- **Cross-checks:** Independent source URLs or an explicit record that none were found
- **Contradictions:** Named `COMPLETE` or `INCOMPLETE` outcomes for the `Original URL` and every listed `Cross-checks` source
- **Status:** VERIFIED
- **Caveat:** Limitation the script must preserve
- **Approved wording:** Exact narration-safe wording supported by this record
```

In `Contradictions`, name every source and use exactly one outcome per source:

- `{source} — COMPLETE — [coverage or source-native locator checked; concrete material support/conflict findings; consequence for wording/status]`
- `{source} — INCOMPLETE — [reason; portions/locators checked; unresolved consequence]`

Blanket statements such as `none found` or `all sources agree` do not substitute for
named per-source outcomes. Record every material conflict discovered anywhere in a
source and its consequence for narration wording or status. Any material `Original
URL` or cross-check marked `INCOMPLETE` keeps the conflict review unresolved and
forbids a no-conflict assertion.

Set `Status` to one of `VERIFIED`, `CORROBORATED`, `REPORTED`,
`UNVERIFIED-EXAMPLE`, `DISPUTED`, or `REJECTED`. Use an `http://` or `https://` URL
for `Original URL`. Keep the record descriptive; apply the separate research method
when deciding source quality, status, or wording.

### Asset records

Create one level-five record under `#### Visual and archival sources` for each
referenced `A-###` ID. Include all 11 fields with the exact labels below:

```markdown
##### A-001 — Short asset name
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

End the appendix with one `### References and source materials` heading. Place these
four level-four sections under it in this exact order:

Apply this structure even when the requested artifact is only a targeted beat,
insert, audit, or revision excerpt; use an explicit none-needed statement in any
section that has no records.

1. `#### Evidence references`
2. `#### Visual and archival sources`
3. `#### Unverified or disputed material`
4. `#### Attribution copy`

Put every `F-###` record in the first section and every `A-###` record in the second.
Use the third section to identify unresolved or conflicting material and the checks
already performed; write an explicit none-used statement when it is empty. Put the
exact publication-ready credits required by asset records in the fourth section;
write an explicit none-required statement when it is empty.

## Shorts plan

Every `FULL-SCRIPT` episode appendix contains one `### Shorts plan` section placed
after the last beat entry and before any editorial-audit or issue-ledger material.
Plan the Shorts while the long-form exists as beats, not after production.

List three to five golden-nugget candidates; the structural validator counts the
`**Short hook:**` fields and rejects a section outside that range. The fields are fixed;
their line layout is not — one numbered line per candidate and nested bullets both pass.
Each entry names:

- **Beat:** the narration beat the nugget lifts from.
- **Nugget:** the self-contained thought — a clean statistic, one-line paradox, single
  vivid example, or complete comic turn that survives without surrounding context.
- **Short hook:** a Short-specific opening line that lands its question, surprising
  fact, or striking visual within the first three seconds; do not reuse the long-form
  opening unless it already does that job standalone.
- **Cut boundaries:** where the lift starts and ends so no referent dangles, plus any
  line that must be re-recorded or re-cut so the Short opens on its own hook.

A Short must be enjoyable on its own; reject a candidate that only makes sense after
the main video. While drafting narration, write these candidate lines as complete
thoughts in isolation so they lift cleanly. For a `TARGETED-ARTIFACT`, include the
section only when the assignment asks for it.

## Optional appendix sections

Two further level-three sections may appear after the beat entries. Neither is required,
and the structural validator does not check either:

- `### Editorial audit` — the rubric pass results for this version, or an explicit
  statement that the audit has not run yet. Place it after `### Shorts plan`.
- `### Template note` — worked-example provenance only. Use it in a template or sample
  document to say that the content is illustrative and must be replaced; never add it to
  a real episode.

## Readiness states

Use exactly one of these header states:

- `RESEARCH-DRAFT`: Use while claims, wording, visual candidates, or rights remain
  under investigation, or while authentic personal input is still requested.
- `EDITORIAL-DRAFT`: Use after the narration and story direction receive editorial
  approval, with no `INPUT-REQUESTED` personal block or unresolved input marker,
  while clearly recording any remaining evidence, rights, or production work. The
  [quality rubric](quality-rubric.md#editorial-draft) owns the score threshold and the
  protected dimensions this state also requires.
- `RECORD-READY`: Use only after the gate below is satisfied.
- `PICTURE-LOCKED`: Treat this state as outside v1; do not use this format workflow to
  certify it.

Treat every unresolved dependency as unresolved regardless of the current label.
Require an authorized human reviewer to promote readiness; do not infer approval from
document completeness.

## Record-ready gate

This gate is the single owner of every `RECORD-READY` requirement except the rubric's
score threshold and protected dimensions, which the
[quality rubric](quality-rubric.md#record-ready) owns. Satisfy both. Require:

- the `EDITORIAL-DRAFT` state and its requirements;
- renewed final approval by an authorized human editor, given after evidence, rights,
  and production dependencies are closed — never the earlier narration approval carried
  forward;
- completed evidence and rights review, with one complete record for every referenced
  claim and asset;
- substantive human confirmation that each planned Creative Commons use is compatible
  with its license terms, resolving every blocking conflict named by
  [the research and rights method](research-and-rights.md#use-rights-statuses-exactly);
- no `REJECTED` claim, and no uncertainty voiced without the qualification its status
  requires;
- a resolved personal-input decision with no `INPUT-REQUESTED` block and no unresolved
  input marker;
- a usable treatment or an explicit production fallback for every required visual, and
  no blocked required asset; and
- a reference-only asset kept only when the planned final cut does not require it.

Treat the two approval moments as distinct: the first accepts narration and story
direction for `EDITORIAL-DRAFT` while unresolved work remains documented; the second
rechecks the final script after dependencies close. A passing validator is necessary but
never sufficient. Do not self-promote a draft merely because its structure passes.

## Narration-only extraction

Build table-read and teleprompter copy by concatenating only the blockquotes in numbered
beats before `## Appendix`, in beat order. Preserve the spoken words and paragraph order,
but strip personal-input marker annotations and inline evidence indicators. Keep
locked-line bolding in teleprompter and rehearsal copy; exclude the asterisks themselves
from the word count. Never include appendix material in the narration-only copy. Count
only the extracted spoken words after those review annotations are removed when updating
`Word count`.

## Validation

Validate the raw/extended pair first through the mandatory command owned by
[Script Artifact Pair](script-artifact-pair.md). For a final pair, that validator
delegates the complete extended document to this appendix schema; purpose annotations are
set aside by the schema itself and inline evidence is preserved.

The annotated-script validator remains the lower-level structural engine. To diagnose a
final extended document directly, follow this lower-level procedure.
Resolve the target script path to an absolute path at runtime before changing to the skill directory. Resolve the skill directory from
the loaded `SKILL.md`, change to it, and run:

```bash
python3 scripts/validate_annotated_script.py -- "<resolved-script-path>"
```

Do not hardcode the skill package path or use a vendor-specific environment variable. The dynamically resolved target path may be absolute; pass it as one quoted argument after `--`.

Use the validator to check that required metadata fields and end sections exist; narration
and appendix beat IDs and titles match, are well formed, unique, and ascending; narration
beats contain only spoken blockquotes and the allowed review annotations; inline evidence
indicators are stripped from narration extraction and structurally match the same beat's
`Claims` IDs and each evidence record's `Original URL`; every appendix beat contains all
required production subsections; deliverable-specific personal-input and viewer-application
blocks have the required cardinality, fields, decision vocabulary, and marker lifecycle;
a Shorts plan section carries three to five candidates;
stated word count matches extracted narration; motion notes state an animation purpose or
explicitly decline animation; referenced fact and asset IDs have exactly one record; records
contain their required fields; required URLs and status values have valid forms; and a
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

- Putting production notes, directions, or citations other than required inline evidence
  indicators inside narration blockquotes.
- Putting metadata or production headings anywhere in the numbered narration layer.
- Leaving inline evidence indicators in narration-only output, counting them as speech, or
  using a label, URL, or beat mapping that does not match its evidence record.
- Letting a narration beat number or title drift from its appendix entry.
- Inventing first-person material instead of requesting, integrating, or omitting it.
- Leaving an input marker unresolved after `RESEARCH-DRAFT`, or counting it as speech.
- Keeping a generic viewer application only in production notes instead of voicing its
  action or lens and boundary.
- Changing or recycling `F-###` or `A-###` IDs during revision.
- Treating a source URL as permission to publish an asset.
- Naming a preferred visual without a production fallback.
- Requesting animation without stating its explanatory purpose.
- Omitting any of the four required end ledgers.
- Labeling a document `RECORD-READY` while an evidence, rights, editorial, or required
  production dependency remains unresolved.
