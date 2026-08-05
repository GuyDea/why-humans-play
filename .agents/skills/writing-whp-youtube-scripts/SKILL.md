---
name: writing-whp-youtube-scripts
description: "Use when ideating, drafting, reviewing, or revising Why Humans Play YouTube scripts and openings, or when turning an approved prototype into an evidence-backed, production-annotated episode."
---

# Write Why Humans Play YouTube Scripts

## Overview

Use one skill for rapid creative development and evidence-backed production. For
episode-scale work, approve the intellectual architecture, then approve the story
progression, then approve an intro-first Script Blueprint, then expand and approve the
complete narration. Enter production only after that separate creative approval. Put the
viewer promise and honest inquiry before retention tricks.

Do not use this skill for unrelated ads, social posts, or general marketing copy.

## Required project context

Locate the repository root. For a new topic, structure, narration, production promotion, or
policy-sensitive change, read `BRAND.md` first and `whp-youtube/STEERING.md` second. If either
required file is absent, report the missing canonical context instead of inventing policy.

When a scoped review, selection rewrite, or alternatives request supplies the artifact,
selection, surrounding context, and narrative job, use those inputs directly; do not reread
canonical project files unless the request changes channel policy or lacks needed context.

A raw subject alone is not a selected topic brief. For a new episode supplied only as a raw
subject, invoke the bounded `choosing-whp-video-topic` `Ideate subjects/angles` operation
and return multiple exact angle proposals without choosing a winner. Stop after returning
the proposals; do not begin architecture until Martin supplies or approves one exact angle.
**REQUIRED SUB-SKILL:** Use `choosing-whp-video-topic` for that bounded operation and follow
its [subject-to-angle development method](../choosing-whp-video-topic/references/research-method.md#subject-to-angle-development).
Preserve a supplied or approved angle without reopening selection.

Use a supplied selected topic brief as the handoff from topic selection. Do not rerun topic
ideation unless Martin explicitly asks. Carry forward the available audience, packaging
promise, tension, by-end promise, payoff, factual anchors, and unknowns. Missing nonessential
fields must not block a useful prototype; ask only when a missing choice would materially
change the requested artifact.

## Choose the operation

**Central-progression work** means a request that would set or materially change the causal
route from the opening tension, through the insight ladder, to the final payoff. Use this
same trigger in every stage.

Honor the requested scope before choosing a stage:

- **Generate:** return one requested architecture, structure, opening, passage, or narration,
  routed through the applicable approval gate.
- **Review:** return findings without rewriting the supplied text.
- **Rewrite selection:** replace only the selection and preserve its surrounding language
  and narrative job.
- **Generate alternatives:** return distinct labeled choices without changing or choosing
  among them.
- **Promote:** after explicit creative approval, preserve the voice baseline and advance to
  the next stage.

Use the visible topic brief, artifact or selection, surrounding context, requested
operation, and creative status. Do not make an operation depend on invisible chat history.

## The episode pipeline

Episode-scale work moves through five named stages in this order. Each stage ends at a human
approval gate, and each gate authorizes only the next stage. The last three stages are named
after the directories they write under `whp-youtube/episodes/epNNN-stable-name/`; the
Architecture and Progression artifacts are returned in the conversation, not as files.

```dot
digraph episode_pipeline {
    rankdir=LR; node [shape=box];
    Architecture -> Progression -> Blueprint -> Draft -> Final [label="approved"];
}
```

| Stage | Produces | Gate that ends it |
|---|---|---|
| Architecture | The episode's intellectual payload | Architecture approval |
| Progression | The causal route from tension to payoff | Story progression approval |
| Blueprint | `blueprint/` — one polished intro plus a bullet-only body logic map | Blueprint approval |
| Draft | `draft/` — one complete narration | Creative approval |
| Final | `final/` — evidence-backed, production-annotated episode | [Readiness review](#validation-and-completion) |

Enter at the earliest stage the request has not yet approved. A new episode or thesis-level
rethink starts at Architecture. Scoped work on existing material stays where it is unless it
crosses the central-progression trigger, which reopens Progression.

Work that is not episode-scale — an idea, an opening, a hook, a short passage, a humor or
voice pass, a scoped refinement — does not enter the pipeline at all. Use
[scoped and rapid work](#scoped-and-rapid-work) instead. An episode enters a stage when its
architecture is approved, not when its files appear: an opening for an episode with an
approved architecture takes that episode's next gate; a standalone opening is scoped work.

## Scoped and rapid work

Default to this mode for ideas, openings, hooks, rough drafts, short narration, humor or
voice passes, and scoped refinement. For a script under an episode's stage directory, the
matching pipeline stage applies instead.

Return the requested artifact directly. Outside the bounded architecture
concept-discovery scan and the targeted viewer-vulnerability proof-case lookup below, do
not perform web research, write an assignment contract or evidence packet, force three
opening candidates, create annotated-script scaffolding, plan visuals or rights, run the
production rubric, or invoke final-format validation unless Martin explicitly asks for
that work. Episode-stage pairs still require pair validation before review.

Use supplied facts and facts already available in current project materials. Never invent
specificity to make a draft sound authoritative. Preserve accepted language and revise only
the requested scope. Follow the rapid method for the hook, humor, examples, spoken rhythm,
factual boundary, and internal quality check. That method's quality check runs in three
moments — gates before drafting, line-level questions while writing, and one sweep over the
finished text — so carry only the current moment's questions.

Prefer a documented real-world case for each substantial point and make its damaged goal
and human cost explicit. When the available factual boundary does not contain a suitable
case, label a hypothetical clearly instead of making one sound historical.
Do not ask the viewer to accept a material vulnerability claim on theory, analogy, or a
hypothetical alone. A hypothetical may explain how a demonstrated mechanism works; it
cannot prove that the mechanism affects real people. Treat any statement or implication
that knowledge, intelligence, expertise, training, or skepticism fails to protect someone
as a material vulnerability claim, even when phrased as a modest observation, question, or
transition. When the opening makes that claim, require a documented observed case involving
the claimed population. First use supplied or project-known facts; if none exist, run one
targeted primary-source proof-case lookup. If no matching case is found, narrow or omit the
claim rather than drafting around the gap. Match the case's population, behavior,
mechanism, and outcome to the narration; state any gap and use separate evidence for the
episode mechanism rather than allowing one adjacent finding to imply both.
For a problem-led opening where the viewer may claim immunity, use concise anti-skip doctrine.
Keep the narrator stance inside the persona license (stance is free; events,
memories, and chronology need Martin), ground the disarm in observed behavior rather
than attributed inner states, and place a literal remedy before detailed case exposition. Never
invent the narrator's research process or chronology. Follow
[the rapid drafting method](references/rapid-prototyping.md) for the exact anti-skip
sequence, proof interpretation, and line-level execution.

Do not add evidence source markers to scoped prototypes unless Martin explicitly asks.

## Architecture stage

For a new episode or a thesis-level rethink, produce and refine the script architecture
before writing any opening or narration. Put the sourced concept inventory first in the
artifact. Stop after returning the architecture. Do not draft the hook, beats, or narration
until Martin explicitly approves it.
Use [the script architecture method](references/script-architecture.md) for this stage.

Before presenting a new or thesis-level architecture, run a bounded primary-source
concept-discovery scan even in scoped mode. Inventory explanatory mechanisms, consequences,
named laws or effects, interventions, and countermeasures before deciding which concepts
belong in the episode. Use the method's fixed search-batch budget so discovery cannot absorb
the full production workflow. Use the discovery source only to establish the concept and
its meaning; defer episode-claim and example verification to the final stage. Then mine candidate
connections from the inventory and kill-test them adversarially; build the reframe only
from survivors, with bridges verified and kills registered.

An architecture cannot be approved unless it contains both a non-obvious understanding
and a concrete, evidence-bounded viewer response with an observable result. Check the
complete transformation explicitly: `Before, I thought X. Now, I understand Y. Next time,
I will do Z. I will know it helped when I observe W.` Preserve that approved
learning-and-action contract when drafting the opening promise, explanation, viewer
application, and final lesson.
A complete-episode promise must name both the understanding the viewer will gain and the
concrete response they will be able to use.

### Architecture approval gate

For episode-scale work without an approved architecture, return only the architecture
artifact and wait. Refine it at the field level until Martin explicitly approves the whole.
Positive feedback on one insight, example, phenomenon, or reframe does not approve the
complete architecture. Approval of a topic, title, isolated insight, or earlier script does
not approve the architecture.

Do not present an architecture as approval-ready until its concept-discovery scan is
complete. If source access is unavailable or Martin explicitly requests an offline pass,
mark the inventory provisional exactly as required by the architecture method and surface
the resulting omission risk.

When the episode explains a common human behavior, an architecture is also not
approval-ready until Layer 0 of
[adversarial claim verification](references/research-and-rights.md#adversarial-claim-verification)
has run against its central question, core answer, and earned reframe, and the
architecture's coverage-and-rivals record answers every challenge it raised.

Do not approve a familiar summary with generic advice attached. The non-obvious
understanding must revise the viewer's prior model, and the response must name a relevant
situation, a concrete decision rule or sequence, an observable result, a real boundary,
and at least one transfer case.

Architecture approval authorizes story planning, not beat ordering or narration. Preserve
the approved architecture as the intellectual baseline while planning.

## Story progression stage

Once Martin approves the architecture, return one visible Story Progression Plan and stop.
Do not order beats or draft narration until Martin explicitly approves the complete plan or
directly instructs you to build the Script Blueprint from that displayed complete plan.
Preserve the approved architecture as the intellectual baseline and the approved
progression as the story baseline. Scoped work on existing narration does not rebuild
either artifact unless it changes the central message or crosses the central-progression
trigger.

For the detailed progression schema and structural story rules, follow the story and hook
method. Route: [the story and hook method](references/story-and-hook-method.md).

### Story progression approval gate

For central-progression work with an approved architecture but no approved progression,
return only the complete Story Progression Plan and wait. Load-bearing evidence rows
must pass Layer 1 of [adversarial claim verification](references/research-and-rights.md#adversarial-claim-verification)
before the plan is presented as approvable. Positive feedback on one
obstacle, transition, case, technique, or loop does not approve the whole artifact.

Explicit approval—or a direct instruction to build the Script Blueprint from that displayed
complete plan—records that plan as `APPROVED` by Martin and authorizes the polished intro
and bullet-only body logic map only. It does not authorize body narration or approve the
complete narration or direction. When Martin requests a targeted revision, change only the
addressed progression beat or field and name every downstream causal consequence instead
of silently rewriting later beats. Return the complete revised plan with
`AWAITING-APPROVAL` and `PENDING`, then stop. Prior approval does not carry across a
progression revision. Re-entry requires renewed whole-plan approval or a direct
instruction to build the Script Blueprint from that newly displayed complete revised
plan; the revision request itself does not count as renewed approval.

Keep the approved plan visible as supplied context. If no visible approved plan is
supplied, treat the progression as unapproved. Story-progression approval precedes and does
not replace creative approval of the complete narration and direction.

### Preserve the approved progression while drafting

For central-progression work, read the detailed story owner before planning. After approval,
preserve the Story engine, causal chain, selected moves, proof jobs, evidence boundaries,
loops, payoff, and Throughline decision. Reopen the gate instead of silently changing a
load-bearing choice.

Always-loaded invariants:

- Use only story moves the real material earns. Never invent a roadblock, contradiction,
  motive, chronology, failed hypothesis, research event, or near-surrender; performed
  no-event narrator reactions follow the rapid voice owner's persona license. The
  no-invention rule under [Production non-negotiables](#production-non-negotiables)
  applies from the first draft onward, not only in production.
- But / Therefore diagnoses causal movement; it is not a literal-word or per-beat quota.
- Keep adjacent proof jobs distinct and make the remaining question create the next
  evidence need.
- Prefer a well-supported Western case when one can perform the same proof job clearly.
  Use the strongest non-Western case when no Western candidate passes the evidence,
  causal-fit, consequence, and spoken-clarity gates.
- The argument remains the spine. A supporting narrative throughline is optional and never
  substitutes for mechanism evidence.
- Apply selected humor, callbacks, loops, and payoffs without turning the approved plan into
  formulaic phrasing.
- Keep every story device subordinate to conversational causality. Route line-level hooks
  and mini-hooks through
  [the rapid natural-package owner](references/rapid-prototyping.md#keep-story-devices-inside-the-conversation),
  and route loop selection and payoff through
  [the structural loop owner](references/story-and-hook-method.md#plan-loops-without-withholding-clarity).

## Blueprint stage

An episode-scale Script Blueprint lives in
`whp-youtube/episodes/epNNN-stable-name/blueprint/` as
`blueprint/script.raw.md` and `blueprint/script.extended.md`. Follow
[the script artifact pair](references/script-artifact-pair.md) for the episode path,
paired views, markup, validation, and promotion contract, then follow
[the Script Blueprint workflow](references/script-blueprint-workflow.md) for the exact
stage contents and approval gate.

A Script Blueprint is not a rough full script. Its raw view contains one polished spoken
intro. Its extended view mirrors that intro and owns one bullet-only body logic map and
the episode's packaging record in its appendix. Do not draft body narration in a Script
Blueprint.

Reach this stage only with both the architecture and the Story Progression Plan approved.
Scoped Blueprint work returns directly until it crosses the central-progression trigger,
which reopens the earlier stage. Design and polish the intro before expanding any body
prose. A Script Blueprint is a visible creative baseline, not a definite WHP decision;
advancement remains the reconcilable decision.

- Run the spoken-readability and walking-conversation checks on `blueprint/script.raw.md`
  only. Do not run body word counts, timing or cut ledgers, editorial, retention,
  production audits, final-format validation, or production scaffolding unless Martin
  asks for that specific work by name. Validate the pair as the pair owner requires.
- Treat Script Blueprint edits as exploratory; do not reconcile or ledger them. Validated
  promotion into `draft/` is the decision.
- The factual boundary applies unchanged: use supplied or project-known facts, never
  invent specificity, and label hypotheticals. The architecture approval gate also
  applies unchanged for a new episode or thesis-level rethink.
- No independent AI review is required during this stage. Do not call another model or add
  a reviewer record unless Martin explicitly requests that review for the current artifact.

When Martin explicitly requests a walking-vlog, walk-and-talk, from-memory, or
no-teleprompter Script Blueprint, run the memory-first delivery pass before returning it.
This is a focused delivery check, not a production audit. Follow
[the rapid memory-first owner](references/rapid-prototyping.md#run-the-memory-first-walking-vlog-pass).

### Blueprint approval gate

Advance only after Martin explicitly approves both the polished intro and body logic map.
That approval authorizes the Draft stage below and nothing further. Reconcile the promotion
into `draft/` as one definite decision.

## Draft stage

For episode-scale work advancing from the Blueprint stage, preserve the approved intro and
use the approved body logic map to write one complete narration in the episode's `draft/`
pair. Draft narration changes begin in `draft/script.raw.md`; keep annotations and the stage
appendix in `draft/script.extended.md`. Do not quietly redesign the intro or causal route
while expanding the body.

Do not write narration as a way to discover what the episode means. For line-level case
narration, spoken compression, hook, humor, and factual-boundary application, follow
[the rapid drafting method](references/rapid-prototyping.md).

When the request is for a complete script, follow the full-script review order below.
Complete and show Martin the whole narration before running any editorial, retention, or
timing audit. Treat timing as a post-draft diagnostic, not a drafting gate. Report audit
concerns and tradeoffs separately before rewriting the narration; never silently cut
context to satisfy an audit.

### Cold-viewer retention evaluation

Before presenting a complete draft narration for creative approval, dispatch the
`whp-retention-reviewer` brief (`.claude/agents/whp-retention-reviewer.md`) as a
fresh-context reviewer given only the draft `script.raw.md` — never baselines,
appendices, approvals, or the drafting rationale — returning findings without
rewriting. Report the findings alongside the draft and apply them only with Martin's
direction. It re-runs during the final audit battery. A finding flagged by two
independent evaluator runs — substantially the same finding on substantially the same
passage, across runs at any stage — is presented as adopted-unless-overruled: the
default recommendation is to apply it, but nothing is applied before Martin's gate
response, and his overrule keeps the wording. Evidence-mandated wording outranks any
retention finding; see
[the gate-precedence rule](references/research-and-rights.md#gate-precedence). Run the Layer 2 consistency
check of [adversarial claim verification](references/research-and-rights.md#adversarial-claim-verification)
on the same draft: every narration number, name, and attribution against its evidence
row.

### Creative approval gate

Remain in the Draft stage until Martin explicitly approves the premise, voice, hook, story
direction, and complete narration or directly requests evidence-backed finalization.
Positive feedback on one line or passage does not approve the complete narration.

Preserve the approved prototype as the voice baseline; research may narrow claims but must
not silently replace its structure or personality.

## Delivery requirements for every narration

These apply to the Blueprint intro, the Draft narration, and the Final narration alike.

### Mark locked lines for memory delivery

No line is locked before it passes the spoken-readability gate. After locking, a gate
failure on a locked line — readability, Layer 2 or 3 verification, retention, or any
audit — reopens the lock explicitly: report the line to Martin by name with the
failing gate and the proposed change, and wait. Never silently rewrite locked
wording; a lock is Martin's approval of exact delivery, and only Martin closes it
again.

Martin delivers from memory while walking — there is no teleprompter on a walk. In a
complete script, mark **locked lines** bold inside the blockquote: the opening question,
the learning promise, the reframe's retell sentence, each beat's punchline and
exact-lesson line, and any sentence whose evidence-bounded wording a paraphrase could
break. Deliver locked lines word-perfect and keep them memorizable — a handful per beat,
each a single sentence. Everything unmarked is flexible tissue: Martin may say it his own
way, because the written line fixes the meaning, facts, locked story nouns, and evidence
boundary, not the exact words. Apply the pair owner's markup and synchronization contract
after selecting these lines. Strip markup from word counts and readability checks. Mark
locked lines in complete draft or final narration; for a Script Blueprint, mark only intro
wording whose exact delivery has already been selected.

### Scope every universal verdict

A locked line that diagnoses the viewer's own case universally in the second person
("you weren't X — you were Y") is a coverage claim, not a stylistic choice. Use one only
when the architecture's coverage-and-rivals record shows the mechanism is the
phenomenon's dominant account; otherwise write the verdict conditionally or name the
covered case aloud. Material the episode's own appendix marks as an editorial bridge or
lists under `Unverified or disputed material` may not appear in locked universal wording
anywhere in the script. A ledger caveat or a single hedge line elsewhere does not
license a universal verdict: the wording that carries the diagnosis carries the
boundary.

### Enforce spoken readability before delivery

Spoken readability is mandatory before returning the Script Blueprint intro, draft
narration, or final narration. Run it on each stage's `script.raw.md`. Use 25 spoken
words as a hard ceiling. Send every 21–25-word line through first-hearing review, and
reject shorter lines when actor, action, relationship, or consequence remains unclear.
Preserve evidence boundaries and personality during every rewrite.

> Detailed line-level owner: [the rapid drafting method](references/rapid-prototyping.md).

For narration stored in a file, resolve the target to an absolute path, change to the skill
directory, and run:

```bash
python3 scripts/check_spoken_readability.py -- "<resolved-script-path>"
```

The checker is not the gate's end: Martin's read-aloud remains the irreplaceable referent
check — a line pointing at something the listener no longer holds fails delivery.

Rewrite every `FAIL`. Read every `REVIEW` aloud; use `--reviewed` only after a
21–25-word line is clear, never to waive difficulty. Apply the same semantic gate to
chat-only narration before returning it, counting words the way the checker does: a word is
a run of letters or digits, hyphens and apostrophes keep a word whole, and a standalone dash
or bracket is not a word.

## Final stage — evidence and production

For evidence-backed finalization, promote the approved draft into
`whp-youtube/episodes/epNNN-stable-name/final/` without overwriting the draft pair:

1. Write an assignment contract that fixes the episode mode, audience, promise,
   `Deliverable`, `Useful viewer change`, scope, runtime, constraints, and payoff.
2. Extract the material claims from the approved prototype. Build the evidence packet,
   assign confidence to every material claim, and approve only wording its evidence
   supports. Run Layer 3 of the adversarial claim-verification sweep before any audit
   sign-off. Narrow or remove unsupported wording while preserving the approved voice. Map
   every factual narration sentence or separable factual clause to at least one `F-###` ID
   in the matching appendix beat's `#### Claims` section. Append a visible
   `[F-###](Original URL)` indicator immediately after every mapped factual narration
   sentence or separable factual clause. Put these indicators only in
   `final/script.extended.md`. Treat inline evidence indicators as review annotations, not
   spoken words; exclude them from narration extraction, word count, table reads, and
   teleprompter output. Keep the full evidence record in the extended appendix.
3. Use the detailed story method to test promise and payoff. When a comparison is useful,
   develop and score three eligible opening candidates; do not force that exercise when
   Martin has approved an opening that survives the evidence audit.
4. Confirm the approved story progression as the narrative-spine baseline. Evidence may
   narrow wording; if it breaks a load-bearing obstacle, reversal, proof handoff, or causal
   link, surface the conflict and reopen progression approval.
5. For a `FULL-SCRIPT`, choose one personal-input decision: request authentic input with
   specific prompts and bridges, integrate only material Martin supplied, or omit the
   sequence when it does no narrative work.
6. For a `FULL-SCRIPT`, build one viewer application in this order:
   `insight → try → observe → boundary → larger benefit`. Keep the try no stronger than
   its evidence. Voice all five elements in narration—the insight; the low-risk action,
   observation, or reflection; the observable signal; the boundary; and the larger
   benefit—not only in the structured block. Then widen the application with up to
   three adjacent-audience transfers that existing evidence rows already support.
7. Complete `final/script.raw.md` for spoken delivery, pass the spoken-readability
   delivery gate on raw, and show it to Martin before auditing it. Read it aloud and revise
   for speech without imposing a runtime cut first.
8. Build `final/script.extended.md` as the synchronized editorial and production view.
   Keep purpose and evidence annotations plus all metadata and production material there,
   with a final appendix whose beat entries match the raw narration beat numbers and titles.
   For a `FULL-SCRIPT` episode, include the appendix `Shorts plan`
   section required by the annotated script format: three to five golden-nugget
   candidates with beat references, standalone three-second hooks, and cut boundaries,
   planned while the long-form exists as beats rather than after production.
9. After Martin reviews the complete narration, run separate story, personal-authenticity,
   evidence, fact, rights, visual, animation, application-boundary, accessibility, timing,
   retention, and format audits. The retention audit includes a re-run of the cold-viewer
   retention evaluation on the final raw narration. Report concerns and tradeoffs before proposing any rewrite,
   then validate the pair and run the annotated-script validator on the final extended
   document.

## Production non-negotiables

- Never invent factual scene details such as dialogue, weather, motives, thoughts,
  chronology, or sensory detail.
- Let confidence control narration. Omit rejected claims. Use an unverified example only
  when it is attributed, explicitly caveated, and non-load-bearing.
- The material-vulnerability evidence rule under
  [Scoped and rapid work](#scoped-and-rapid-work) applies unchanged in production: no
  theory, analogy, anecdote, or hypothetical may stand as proof that a vulnerability
  affects real people.
- For incentive-failure examples, show the intended goal, the measure or target, the changed
  behavior, the number that improved, and the damaged goal and human cost. Direct humor at
  the mechanism or institution, then say plainly what got worse and who paid.
- For every `FULL-SCRIPT`, choose exactly one personal-input decision:
  `INPUT-REQUESTED`, `COMPLETED`, or `OMIT`. Never invent Martin's experience or use it as
  proof of prevalence, causality, or mechanism. Performed narrator reactions that claim
  no event, memory, or biography follow the voice owner's persona license and need no
  input decision; invented experience remains banned.
- For every `FULL-SCRIPT`, voice all five viewer-application elements in narration:
  evidence-bounded insight; low-risk action, observation, or reflection; observable signal;
  real boundary; and larger benefit. The structured block does not substitute for spoken
  copy.
- Preserve the approved learning-and-action contract from architecture through the
  opening promise, explanation, viewer application, and final lesson; do not replace it
  with generic caution or an unrelated checklist.
- Pass the spoken-readability delivery gate before showing any narration. A later
  editorial, retention, timing, or validator pass does not substitute for it.
- Audit evidence sufficiency and asset rights separately.
- Give every important fact a visual decision; do not assume every fact needs a unique
  image.
- Provide actual candidate asset pages when practical. Record the rights status and an
  ownable fallback, and never call an asset cleared without a documented basis.
- State the explanatory purpose of each animation. If motion adds no understanding, choose
  a still or no animation.
- Keep raw narration free of evidence indicators and production annotations; keep the
  matching editorial annotations and production notes in extended.
- Keep production notes in the matching extended appendix beat so their relationship to
  narration remains explicit without interrupting the readable raw script.
- Complete the end evidence ledger, visual ledger, uncertainty register, and attribution or
  credits section.
- Never self-promote a script to `RECORD-READY` from a validator result or rubric score.

## Resource routing

- Before web research, claim approval, visual sourcing, or rights labeling, read
  [the research and rights method](references/research-and-rights.md).
- Before building a final extended deliverable, read
  [the annotated script format](references/annotated-script-format.md).
- Use [the annotated script template](assets/annotated-script-template.md) as a worked shape,
  never as preverified episode content.
- During the final editorial pass, read
  [the quality rubric](references/quality-rubric.md).
- For a **Distill session lessons** operation — and only for that operation — read
  [the lesson distillation method](references/lesson-distillation.md).

## Validation and completion

Validate every episode-stage pair before review or promotion. For final, run the
annotated-script validator on `final/script.extended.md` only after pair validation and the
raw spoken-readability check succeed.

Resolve the target script path to an absolute path at runtime before changing to the skill directory.
Resolve the skill directory from the loaded `SKILL.md`, change to it, and run:

```bash
python3 scripts/validate_annotated_script.py -- "<resolved-script-path>"
```

Do not hardcode the skill package path or use a vendor-specific environment variable.
The dynamically resolved target path may be absolute; pass it as one quoted argument after `--`.
Treat the validator as structural only; factual truth, rights clearance, editorial judgment,
and production approval still require human review.

Report readiness honestly. List every unresolved fact, rights, and production item, and do
not infer `RECORD-READY` from automated validation alone.
