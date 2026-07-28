# WHP Paired Script Artifacts and Episode Folders

- **Status:** APPROVED
- **Date:** 2026-07-28
- **Branch:** `episode1-story-rebuild`
- **Scope:** WHP episode organization and script artifacts at blueprint, draft, and final
  stages

## Goal

Give Martin one clean script for reading and delivery while preserving a second,
fully annotated editorial and production view. Keep the two views synchronized, make
their visual storytelling marks unambiguous, and keep every episode's stages and legacy
material inside one stable episode folder.

## Episode-first directory contract

Every episode lives under one folder whose name matches:

`ep[three digits]-[stable lowercase kebab-case name]`

Example:

```text
whp-youtube/episodes/ep001-ai-dangerous-advice/
├── blueprint/
│   ├── script.raw.md
│   └── script.extended.md
├── draft/
│   ├── script.raw.md
│   └── script.extended.md
├── final/
│   ├── script.raw.md
│   └── script.extended.md
└── archive/
    └── preserved legacy material
```

Create a stage directory only when the episode reaches that stage. Do not scaffold empty
stage directories. The numeric ID never changes. Treat the kebab-case name as a stable
internal identifier; a later packaging-title change updates metadata, not the folder path.

Use **Script Blueprint** as the first scripted stage, `blueprint/` as its directory, and
`BLUEPRINT` as its status vocabulary. Retire `pre-draft` and `predraft` from active
workflow language. Historical records may retain the former term when describing the
workflow that existed at that time.

The `archive/` directory is optional. Use it only for pre-workflow or superseded material
that must remain accessible but must not be mistaken for the active paired artifact.
Archived files retain explicit historical or migration-pending labels and do not acquire
compliant status merely because they moved.

## Pair ownership

At every active stage, `script.raw.md` is the source of truth for:

- every spoken word;
- paragraph order;
- beat titles and order; and
- bold, italic, and underline storytelling markup.

`script.extended.md` must reproduce that complete raw narration and formatting exactly.
It may add only:

- standalone square-bracket purpose annotations;
- inline evidence indicators where the stage requires them; and
- the stage-appropriate appendix.

Do not edit spoken wording only in the extended file. Make narration changes in raw first,
then reconcile the extended mirror. The pair is not ready for review, approval, or
promotion while the validator reports drift.

## Raw script contract

Raw is the clean reading and delivery surface. It contains:

1. one H1 episode title;
2. descriptive beat headings when the stage has multiple beats; and
3. spoken narration in blockquotes.

It contains no status banner, design record, square-bracket purpose annotation, evidence
indicator, citation, metadata field, body logic map, production note, audit, or appendix.
A blueprint raw file contains only the polished spoken intro because body narration does
not yet exist.

### Storytelling markup

Markup communicates three independent editorial properties:

- `<u>Underline</u>` marks only a main storytelling block: a main hook, a major loop
  opening or payoff, or a genuine obstacle in the central progression.
- `*Italics*` mark a supporting storytelling block, including a mini-hook, local teaser,
  small reversal, or other secondary connective device.
- `**Bold**` marks wording that Martin must deliver exactly.

Underline and italics express different structural tiers; do not apply both to the same
passage. Bold is independent and may combine with either tier:

```markdown
> <u>**A locked main hook.**</u>
>
> ***A locked mini-hook or other supporting device.***
```

Do not underline a mini-hook. Do not style ordinary connective prose merely to make the
page look active. Mark the smallest complete passage that performs the named job.

## Extended script contract

Extended is the editorial, evidence, and production surface. Preserve the raw script's
title, beat headings, blockquotes, wording, order, and storytelling markup. Place each
purpose annotation on its own non-blockquoted line immediately before the sentence or
passage it explains.

Group adjacent sentences under one annotation when they perform the same narrative job.
Do not annotate every sentence separately when that would repeat the same explanation.

Use this grammar:

```markdown
[MAIN HOOK | LOCKED WORDING — Poses the episode's personal-risk question in the title's exact language.]

> <u>**Could AI talk you into the dumbest decision of your life?**</u>

[MINI-HOOK — Turns the case result into the next causal question.]

> *But one detail made that explanation much harder.*
```

Allowed purpose tags include:

- `MAIN HOOK`
- `LOOP OPEN L-##`
- `LOOP PAYOFF L-##`
- `OBSTACLE`
- `MINI-HOOK`
- `DEFENSE`
- `DISARM`
- `PROMISE`
- `TRANSITION`
- `REVERSAL`
- `AHA`
- `APPLICATION`
- `FINAL PAYOFF`
- `LOCKED WORDING`

Use only tags that describe real work performed by the mapped passage. Multiple tags may
share one annotation when one passage genuinely performs multiple jobs. The explanation
after the em dash must state the episode-specific purpose; a tag alone is insufficient.
Inline evidence indicators remain review annotations rather than spoken copy and are
distinct from these standalone purpose annotations.

## Stage appendices

Every extended file ends with one `## Appendix`. The appendix owns non-spoken material
and never repeats the narration.

### Blueprint appendix

Include:

- stage metadata and approved architecture/progression references;
- factual boundary and unresolved dependencies;
- intro design record;
- bullet-only body logic map;
- promise and loop payoff destinations; and
- approval state.

The paired blueprint remains one polished intro plus a body logic map, not a hidden full
draft. Raw holds the intro; extended holds the annotated intro and the body map appendix.

### Draft appendix

Include:

- stage metadata and approved baselines;
- story progression and payoff audit;
- claim/evidence boundaries and open verification dependencies;
- spoken-readability result;
- unresolved personal-input decision; and
- current creative-approval state.

Do not force final production, rights, visual, or accessibility scaffolding into a rapid
draft unless that work has actually begun.

### Final appendix

Use the complete evidence-backed production appendix: metadata, beat-matched story
functions, claims, visuals, motion/edit direction, on-screen text, audio/accessibility,
assets, personal input, viewer application, editorial audits, evidence records, asset
rights records, and references.

The existing annotated-script format remains the detailed owner of final-stage appendix
content after it is revised to operate on the extended half of a validated pair.

## Validation

Add one deterministic pair validator used at all three stages. It must:

1. resolve the episode folder and stage from either pair path;
2. require both `script.raw.md` and `script.extended.md`;
3. extract extended narration by removing standalone purpose annotations, inline evidence
   indicators, and the appendix;
4. compare the extracted title, headings, narration, paragraph order, and bold/italic/
   underline markup byte-for-byte with raw;
5. reject square-bracket purpose annotations, evidence indicators, or an appendix in raw;
6. require every underlined passage to map to `MAIN HOOK`, `LOOP OPEN`, `LOOP PAYOFF`, or
   `OBSTACLE`;
7. reject `MINI-HOOK` on an underlined passage and require its mapped passage to be italic;
8. require italic supporting passages and bold locked passages to have matching purpose
   tags in extended;
9. require every purpose annotation to explain a following non-empty passage;
10. apply the appendix schema for the detected stage; and
11. report path, pair, markup, annotation, and appendix failures separately.

The existing spoken-readability checker reads raw. The final annotated-script validator
reads `final/script.extended.md` after pair validation. Word counts and spoken extraction
exclude HTML underline tags, Markdown emphasis markers, purpose annotations, evidence
indicators, and appendix content.

## Promotion

Promotion creates the next stage's pair from the approved current raw narration and the
approved structural baselines. It does not overwrite the earlier stage.

- Blueprint approval authorizes creating `draft/`.
- Complete-narration approval authorizes production work and eventual `final/`.
- Promotion copies accepted narration into the next raw file, then builds and validates
  the next extended file with its richer appendix.
- Earlier stage pairs become review snapshots. Later factual corrections must be recorded
  in the active stage and reconciled according to the existing decision workflow.

Approval applies to the validated pair: Martin reads the raw storytelling surface and may
inspect the extended rationale and appendix. Neither half may claim readiness alone.

## Episode 1 migration

Create `whp-youtube/episodes/ep001-ai-dangerous-advice/`.

- Convert the active Episode 1 V2 intro-first work into the `blueprint/` raw/extended pair.
- Keep the existing canonical evidence-backed Episode 1 available while converting its
  active production form into the `final/` raw/extended pair.
- Place superseded throughline experiments, the pre-workflow full narration, and other
  non-compliant historical artifacts under `archive/` with their existing caution labels;
  do not silently promote or rewrite them.
- Update active links in STEERING, decisions, plans, and tests to the episode-first paths.
- Do not delete historical content as part of migration.

Future episodes begin directly in their episode-first folder and need no loose top-level
script files.

## Ownership and drift prevention

Keep one detailed owner for the pair, markup, annotation, folder, validation, and promotion
contract. The scripting skill, blueprint workflow, annotated final format, STEERING, and
templates link to that owner and contain only their stage-specific invariants.

Regression coverage must lock:

- episode-folder naming;
- fixed pair filenames;
- raw source-of-truth direction;
- raw purity;
- exact narration/format synchronization;
- underline versus italic storytelling tiers;
- bold locked-wording semantics;
- grouped purpose-annotation grammar;
- stage appendix boundaries;
- legacy archive non-promotion; and
- blueprint, draft, and final promotion paths.

This owner split prevents later workflow documents from redefining markup or quietly
returning to a single mixed script file.

## Out of scope

- Changing Episode 1's approved thesis, story progression, factual claims, or packaging.
- Rewriting historical narration merely to modernize its formatting.
- Creating empty stage folders for episodes that have not reached those stages.
- Building UI for switching between raw and extended views.
- Making purpose annotations part of spoken delivery.
