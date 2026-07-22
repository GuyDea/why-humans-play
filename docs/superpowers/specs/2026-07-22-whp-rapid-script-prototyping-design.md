# WHP Rapid Script Prototyping Design

**Date:** 2026-07-22
**Status:** Approved design; implementation pending
**Scope:** `.agents/skills/writing-whp-youtube-scripts`

## Decision

Keep one WHP script-writing skill with two explicit phases. Default to rapid creative
prototyping for ideas, openings, rough narration, and line-level refinement. Enter the
evidence and production phase only after Martin explicitly approves the premise, voice,
hook, and story direction.

## Problem

The current skill begins with assignment contracts, evidence packets, three scored
openings, annotated-script structure, production treatment, audits, and validation. That
workflow produced a defensible 1,117-word pilot, but Martin rejected the narration as a
boring experiment summary without enough humor, hooks, or AI–human connection. It also
took too long to generate.

Rapid unverified iteration produced much stronger voice and momentum. Baseline agent
evaluations without the target skill also drafted and refined quickly, but sometimes
invented mechanism details or made overbroad statements about AI conversations. The new
skill must preserve natural creative fluency while adding only the guardrails demonstrated
by those failures.

## Goals

- Produce one useful disposable narration immediately when rapid work is requested.
- Make hooks concrete, funny, consequential, and personally relevant.
- Support precise line-level collaboration without restarting the whole workflow.
- Prevent invented factual atoms even when verification is intentionally deferred.
- Preserve the approved voice when moving into research and production.
- Retain the existing evidence, rights, annotated-format, rubric, and validator system for
  final scripts.

## Non-goals

- Do not lower the factual or rights standard for a final script.
- Do not treat a prototype as record-ready or publication-ready.
- Do not require a prototype to carry production annotations or an evidence ledger.
- Do not split prototyping and production into separate discoverable skills.
- Do not rewrite the rejected Episode 1 narration as part of the skill refactor.

## Phase router

### Phase 1 — Rapid prototype

Use this phase by default for requests involving an idea, opening, hook, rough draft,
first pass, short narration, humor pass, voice pass, or refinement.

Return the requested artifact directly. Do not perform web research, build an assignment
contract or evidence packet, force three opening candidates, create annotated-script
scaffolding, plan visuals or rights, run the production rubric, or invoke the validator
unless Martin explicitly asks for that work.

Use facts Martin supplies or facts already available in current project materials. Never
invent a date, person, experiment, quotation, chronology, motive, or mechanism. When a
specific fact is unavailable, omit the specificity or write around it rather than filling
the gap. Deferred verification is permission to move quickly, not permission to fabricate.

When Martin gives line-level feedback, preserve accepted language and revise only the
requested scope. Do not replace a whole script when he asks for an opening, punchline,
transition, example, or single passage.

### Creative approval gate

Remain in Phase 1 until Martin explicitly approves the premise, voice, hook, and story
direction or directly asks to begin evidence-backed finalization. Positive feedback on one
line or passage does not approve the complete narration.

At the gate, preserve the approved prototype as the voice baseline. Do not silently replace
its structure or personality during research.

### Phase 2 — Evidence and production

Extract the material factual claims from the approved prototype, gather or refresh their
evidence, and let confidence control the final wording. Remove, narrow, or replace claims
that cannot be supported while preserving the approved rhythm and point whenever possible.

Then expand to the target runtime, add the annotated production structure, resolve personal
input and viewer application, plan visuals and rights, run the editorial audits, validate
the document, and report every remaining gate. The existing research, format, rubric,
template, and validator resources govern this phase.

## Core creative tenets

1. **Story and voice before verification.** Find a narration worth protecting before
   building its evidence and production package.
2. **Open with a real event.** State who did what and what unexpectedly happened with
   enough concrete detail to feel factual, but without a mechanism lecture.
3. **Build the complete hook.** Move through:
   `event → joke → paradox → meaning → consequential question → viewer relevance → by-end promise`.
4. **Promise an answer.** State what the viewer will understand, recognize, identify, or
   be able to do by the end. A generic tease is not a promise.
5. **Make the human connection early.** Do not postpone why the idea matters in ordinary
   behavior or AI use.
6. **Concretize every non-obvious claim.** Follow an abstraction with an example, image,
   or consequence the viewer can immediately picture.
7. **Use terminology as a reward.** Demonstrate the pattern first; name concepts such as
   specification gaming or Goodhart's law only after the viewer understands them.
8. **Make humor do explanatory work.** Build jokes from the mechanism, pursue the stronger
   second or third beat, and prefer specific consequences over cryptic cleverness.
9. **Escalate the stakes.** Move from the funny incident to ordinary experience and then
   to the larger system without abandoning the central idea.
10. **Write for speech.** Use short sentences, controlled density, contrast, repetition,
    callbacks, and recurring language that gives the narration a spine.
11. **Make every paragraph earn its place.** It must create curiosity, laughter, or
    insight; the strongest paragraphs do more than one.
12. **Let research support the story.** Evidence determines what may be claimed, not the
    order in which the viewer must hear the research process.

## Rapid quality check

Before returning a prototype or refinement, check only:

- Does the first sentence feel like a concrete event or irresistible proposition?
- Does the opening contain a sharp comic or surprising turn?
- Is the central paradox understandable without specialist language?
- Does the opening ask the big question and explain why the viewer should care?
- Does it promise what the viewer will gain by the end?
- Does each substantial abstraction receive a concrete example?
- Does the AI–human or game–human connection appear early enough?
- Would the copy sound natural aloud?
- Did any factual specificity get invented?
- Did the response stay inside the requested scope?

Do not turn this check into a visible audit unless Martin asks for one.

## Information architecture

- Keep `SKILL.md` as a concise phase router and statement of non-negotiable behavior.
- Add `references/rapid-prototyping.md` for the Phase 1 method, tenets, and one compact
  worked example.
- Revise `references/story-and-hook-method.md` so three-candidate scoring is a Phase 2 or
  explicitly requested comparison tool, not a rapid-mode prerequisite.
- Keep `references/research-and-rights.md`, `references/annotated-script-format.md`,
  `references/quality-rubric.md`, the template, and the validator as Phase 2 resources.
- Update `agents/openai.yaml` to describe both rapid narration and production finalization.

## Test strategy

Add tests before changing skill behavior. They must fail against the current package and
then pass after implementation.

### Structural regression tests

- The rapid-prototyping reference exists and is routed directly from `SKILL.md`.
- Rapid mode is the default for ideas, rough narration, hooks, and refinements.
- Rapid mode explicitly forbids mandatory research, three-candidate scoring, annotated
  scaffolding, production ledgers, rubric passes, and validation.
- Rapid mode forbids invented factual atoms while allowing verification to be deferred.
- Line-level requests preserve accepted language and change only the requested scope.
- The creative approval gate precedes evidence and production work.
- The complete hook includes the consequential question, viewer relevance, and explicit
  by-end promise.
- Phase 2 still routes every existing evidence, rights, format, rubric, and validation
  requirement.
- Existing validator behavior and all current package tests remain green.

### Forward evaluations

Re-run three fresh scenarios after implementation:

1. A time-pressured request for one funny three-minute narration with no verification.
2. A request to sharpen only an existing opening while preserving its factual spine.
3. An approved prototype moving into an evidence-backed eight-minute production script.

Success means the first two return immediate, scoped creative work without production
overhead or fabricated facts, while the third preserves the voice baseline and correctly
enters the existing rigorous workflow.

## Reconciliation

Record the two-phase workflow and complete-hook promise in `whp-youtube/STEERING.md` and
`DECISIONS.md`. `BRAND.md` already requires rigor, usefulness, humanity, and immediate
recognized value, so it needs no change. `CLAUDE.md` already points script work to channel
steering and needs no change.

Preserve `whp-youtube/episodes/01-why-ai-cheats.md` as an evidence and production reference,
but mark its v0.7 narration creatively superseded so it cannot be mistaken for the current
voice baseline.
