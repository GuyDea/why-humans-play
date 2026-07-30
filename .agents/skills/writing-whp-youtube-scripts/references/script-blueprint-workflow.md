# Script Blueprint Workflow

## Purpose and ownership

This file owns the editorial design of the polished intro and bullet-only body logic map,
plus the intro-readiness approval gate. The
[script artifact pair](script-artifact-pair.md) is the only authority for paired
filenames, episode paths, raw/extended synchronization, storytelling markup, purpose
annotations, literal appendix structure and required sections, validation order, and
promotion mechanics.
The [story and hook method](story-and-hook-method.md) owns the storytelling-technique
inventory and progression logic. The
[rapid drafting method](rapid-prototyping.md) owns sentence-level hook, transition,
mini-hook, walking-vlog, and spoken-readability execution. Other documents should link
here instead of restating this workflow.

Apply [the rapid natural-package owner](rapid-prototyping.md#keep-story-devices-inside-the-conversation)
to line-level devices and
[the structural loop owner](story-and-hook-method.md#plan-loops-without-withholding-clarity)
to loop selection and payoff.

## Build the exact blueprint pair

After the complete architecture and Story Progression Plan are visible and approved,
create:

- `whp-youtube/episodes/epNNN-stable-name/blueprint/script.raw.md`, containing the
  polished spoken intro only; and
- `whp-youtube/episodes/epNNN-stable-name/blueprint/script.extended.md`, mirroring that
  complete intro, adding grouped purpose annotations, and holding the BLUEPRINT appendix.

Do not write body narration in either blueprint file. Place the editorial outputs below
in the owner-defined `BLUEPRINT` appendix; follow the pair owner for its literal heading
and required sections.

Construct the intro design record by identifying the specific human nerve and title
promise, the intro jobs selected, the evidence-earned techniques used, and any
high-value technique considered but rejected because it would duplicate another move,
sound forced, exceed the evidence, or open a loop the body cannot pay.

Construct the bullet-only body logic map as one block per planned beat. In each block,
answer these editorial questions:

- **What the viewer learns**
- **Why this beat comes here**
- **Evidence or story job and boundary**
- **Incoming transition**
- **Outgoing transition or mini-hook**
- **Promise or loop payoff**

The raw intro's first sentence must survive the story owner's
[first-sentence gate](story-and-hook-method.md#gate-the-first-sentence) before polish.
The complete intro must already pass the rapid method's natural-transition,
walking-vlog, sentence-function, and spoken-readability checks.

Do not add body dialogue, polished body paragraphs, body jokes, or presenter-ready body
prose. Those belong to the later complete-draft stage.

## Design the intro before writing it

Do not draft a generic opening and decorate it afterward. Before prose, check the
channel canon's opening-shape ledger (`whp-youtube/canon.md`, STEERING Law 7) and vary
at least one axis from the previous episode's intro shape. Then consider the
complete applicable technique inventory in the approved Story Progression Plan and its
two method owners. Select every evidence-earned, non-conflicting move that materially
strengthens immediate viewer value; do not treat techniques as a quota.

The intro must make a precise, topic-specific choice about how to:

- expose the concrete problem, paradox, or personal pain quickly;
- anticipate the viewer's strongest reasonable defense and disarm it with the strongest
  available observed case, result, or other earned reversal;
- introduce a stakes-carrying example through a natural conversational bridge;
- offer a literal, useful remedy or learning promise early enough to justify staying;
- raise the stakes as far as the approved evidence and mechanism honestly allow;
- use hooks, mini-hooks, and loops only through their natural-package and payoff owners;
  and
- move like one walking conversation, with every transition stating why the previous
  point creates the next question.

These are required jobs, not a fixed sentence order. The topic decides whether the best
route is question-first, event-first, personal, study-led, paradox-led, or another
approved structure. Compress stories to the minimum details needed for trust, causal
clarity, emotion, and consequence. Never invent a defense, emotion, chronology,
investigation struggle, or escalation merely to satisfy the shape.

Run a sentence-function pass before handoff. Every intro sentence must hook, ground,
connect, disarm, escalate, promise, or pay off. Cut sentences that only repeat tone or
delay value.

## Design the packaging with the intro

Packaging is decided at the Blueprint stage, before any body narration exists —
STEERING's packaging law calls packaging the product, and the blueprint gate is its
last honest checkpoint. Record the work in the appendix's `### Packaging` section.

- **The unit of packaging is the package**: one title and one thumbnail concept
  conceived together as the two halves of a single promise. The thumbnail shows the
  tension; the title tells it; they must not repeat each other; together they open
  exactly one question. Never generate, score, or select a title without its thumbnail
  half or a thumbnail without its title half — the viewer only ever meets them
  together in the feed.
- Write fifteen to twenty package candidates and never ship the first one. When a
  packaging-patterns brief from competitor and outlier research is supplied, ground
  candidate structures in its clustered patterns; remix structures, never copy
  surfaces.
- Score each package as a unit and record each score with its dead tests named:
  - **Title half — the feed-adapted gate.** The story owner's
    [first-sentence gate](story-and-hook-method.md#gate-the-first-sentence) applies
    with T2 (unclosable gap) and T3 (edge placement) unchanged. T1 adapts to the feed:
    the stake must be one the target viewer recognizes as their own, but literal
    second-person phrasing is not required and earns no extra credit — a first-person
    narrator title may carry the stake. T4 applies unchanged. Keep the title specific
    but incomplete: a title that fully answers itself kills the click, and a vague one
    never earns it.
  - **Title half — feed constraints.** At most ~60 characters with the decisive words
    in the first ~40; the mobile feed truncates the rest.
  - **Thumbnail half — the one-glance read.** State the route (face-led, pure-concept,
    brand-anchor, or pattern-reveal), the visual, an overlay of one to three words
    that never repeats the title, and what a viewer reads at phone size in one glance,
    in both the light and dark feed.
  - **The pair — complementarity.** Each half must carry weight the other cannot;
    a pair whose halves restate each other fails.
- Select **three winning packages** spanning distinct thumbnail routes. These three
  are the Test & Compare trio for publish; YouTube decides such tests by watch-time
  share, not raw clicks, so an honest package is also the winning strategy.
- Every question the packaging opens must be answered in the video. A package the
  episode cannot honestly pay is clickbait and fails the gate, exactly as an unmapped
  intro promise does.
- The final package choice is Martin's. The record may carry `final choice pending`
  through the gate, but the candidates and winning packages may not be empty.

## Bind every promise to delivery

Every promise, question, and open loop in the intro must point to a named payoff in the
body logic map. Record the destination beat and the exact delivery job. If the approved
body cannot support that payoff, narrow or remove the opening promise before polishing it.
An exciting intro with no mapped delivery is clickbait and fails the Script Blueprint
gate.

## Keep the approval gate human

No independent AI review is required during this stage. Do not invoke another model or add a
reviewer record unless Martin explicitly requests one for the current artifact. Contract
checks establish Script Blueprint readiness; only Martin's explicit approval advances the
intro and body logic map.

## Advance to complete narration

Only explicit approval of both the polished intro and body logic map authorizes expansion.
Preserve the approved intro, expand the map into one complete narration in the episode's
`draft/` pair, then run the complete-narration creative approval gate. Do not move body
prose backward into `blueprint/`.
