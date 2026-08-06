# Script Artifact Pair

This file is the single detailed owner for episode directories, paired script files,
storytelling markup, purpose annotations, stage appendices, pair validation, and stage
promotion. Stage workflows and other consumers link here and state only their local
invariants.

## Episode-first directory contract

Keep every active episode stage under:

`whp-youtube/episodes/epNNN-stable-name/{blueprint,draft,final}/`

Create only the stage directories the episode has reached. Each active stage contains
exactly:

- `script.raw.md`
- `script.extended.md`

Use a three-digit numeric episode ID and a stable lowercase kebab-case name. The numeric
ID never changes. Treat the stable name as an internal identifier: later packaging-title
changes update metadata, not the episode folder.

An episode may also have `archive/`, but only for pre-workflow or superseded material
that must remain accessible without being mistaken for an active pair. Keep explicit
historical or migration-pending labels on archived files. Archiving does not promote an
artifact or make it compliant.

## Raw script contract

`script.raw.md` is the source of truth for every spoken word; paragraph order; beat
titles, headings, and their order; and bold, italic, and underline storytelling markup.

Raw permits only:

- one H1 episode title;
- descriptive beat headings when the stage has multiple beats;
- spoken narration in blockquotes;
- blank lines; and
- `<u>...</u>`, `*...*`, and `**...**` storytelling markup.

Raw contains no purpose annotation, evidence indicator, citation, metadata field, body
logic map, production note, audit, or appendix.

## Extended script contract

`script.extended.md` mirrors the raw title, beat headings, blockquoted narration, wording,
order, and storytelling markup exactly. It may add only:

- grouped standalone `[TAG — episode-specific purpose]` or
  `[TAG | TAG — episode-specific purpose]` annotations immediately before the passage
  they explain;
- inline evidence indicators when the current stage requires them; and
- one stage-appropriate appendix.

Edit spoken wording in raw first, then reconcile the extended mirror.

Use only these purpose tags:

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

Multiple tags may share an annotation when one passage genuinely performs multiple
jobs. Use the literal multi-tag grammar
`[TAG | TAG — episode-specific purpose]`. For example:
`[MAIN HOOK | LOCKED WORDING — Opens the episode's central question in wording that must
be delivered exactly.]`

Group adjacent sentences only when they perform the same job. The explanation after the
em dash must name that passage's episode-specific purpose; a generic tag is not enough.

## Storytelling markup

- Underline marks only a main hook, major loop opening or payoff, or genuine obstacle
  in the central progression.
- Italics mark a supporting device such as a mini-hook, local teaser, small reversal,
  or other secondary connective.
- Bold marks wording that must be delivered exactly and may combine with either
  structural tier.
- Underline and italics are mutually exclusive on the same passage.

Do not underline a mini-hook.

Bold's lock carries a lifecycle: no line is locked before it passes the
spoken-readability gate, and after locking, any gate failure on the line —
readability, Layer 2 or 3 verification, retention, or an audit — reopens the lock
explicitly. Report the line to Martin by name with the failing gate and the proposed
change, and wait; never silently rewrite locked wording. A lock is Martin's approval
of exact delivery, and only Martin closes it again.

Mark the smallest complete passage that performs the named job. Do not style ordinary
connective prose merely to make the page look active.

## Martin's inline review comments

Martin reviews a stage by writing comments in curly braces directly inside the
narration — `{this feels slow}`, `{do we have a source for this?}`, `{cut?}` — usually
in `script.raw.md`. Braces are a review channel, never spoken narration.

Processing contract, in order:

1. Sweep the file and answer every comment in conversation — quote the comment, explain
   or react, and state the proposed disposition (apply, propose alternative, or push
   back with the reason).
2. Apply what the comment clearly directs; where it asks a question or the response
   changes locked wording, evidence-bounded wording, or the approved progression, the
   matching gate rules apply unchanged (a comment on a locked line reopens its lock; a
   comment against mandated wording converts per gate precedence).
3. Remove the braces once processed — the comment's disposition is recorded in the
   conversation and, when material, in the stage appendix.
4. Re-run pair validation and the readability gate after the sweep.

The pair validator fails fast on any remaining `{…}` so an unprocessed comment can
never reach approval, promotion, word counts, or the teleprompter surface.

## Stage appendices

Every extended file ends with exactly one literal `## Appendix`. The appendix owns
non-spoken material and never repeats narration.

### BLUEPRINT

Include stage metadata, approved baselines, the factual boundary and unresolved
dependencies, the intro design record, the packaging record, a bullet-only body logic
map, promise and loop payoff destinations, and the approval state.

### DRAFT

Include stage metadata, approved baselines, the story-progression and payoff audit,
evidence boundaries and open verification dependencies, the spoken-readability result,
the unresolved personal-input decision, and the creative-approval state.

### Final

Use the complete final extended appendix owned by the annotated-script format. Follow
[that format](annotated-script-format.md) for its evidence-backed production, rights,
accessibility, and editorial records.

## Validate the pair before review or promotion

Run this mandatory first command:

```bash
python3 scripts/validate_script_pair.py -- "<stage-or-pair-path>"
```

Only after it succeeds, run the spoken-readability checker on `script.raw.md`. For
`final/`, also run the annotated-script validator on `script.extended.md` after pair
validation succeeds. A stage is not ready for review, approval, or promotion while any
required check fails.

## Promote without overwriting

Blueprint approval creates `draft/`. Approval of the complete narration permits final
production and eventual creation of `final/`. Copy the accepted raw narration forward,
then build the new stage-specific extended mirror and appendix. Never overwrite or
silently upgrade the earlier pair; earlier stages remain review snapshots.
