# WHP Rapid Script Prototyping Design

**Date:** 2026-07-22
**Status:** Implemented and verified
**Scope:** `.agents/skills/writing-whp-youtube-scripts`

## Decision

Keep one WHP script-writing skill with two explicit phases. Default to rapid creative
prototyping for ideas, openings, rough narration, and line-level refinement. Enter the
evidence and production phase only after Martin explicitly approves the premise, voice,
hook, and story direction. Complete and show the narration as a whole before running
editorial, retention, or timing audits; audits then report concerns without silently
rewriting or shortening the creative baseline.

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
- Protect causal and explanatory context from premature timing cuts.
- Make the final script easy to read as narration before exposing production metadata.
- Retain the existing evidence, rights, annotated-format, rubric, and validator system for
  final scripts.
- Keep the workflow independently invocable by a future local script-ideation and editing
  app without duplicating editorial logic in the app.

## Non-goals

- Do not lower the factual or rights standard for a final script.
- Do not treat a prototype as record-ready or publication-ready.
- Do not require a prototype to carry production annotations or an evidence ledger.
- Do not split prototyping and production into separate discoverable skills.
- Do not rewrite the rejected Episode 1 narration as part of the skill refactor.
- Do not choose an application framework, persistence layer, local-agent transport, or UI
  design in this refactor.
- Do not scaffold placeholder application code before the workbench feature is designed.

## Phase router

### Phase 1 — Rapid prototype

Use this phase by default for requests involving an idea, opening, hook, rough draft,
first pass, short narration, humor pass, voice pass, or refinement.

Return the requested artifact directly. Do not perform web research, build an assignment
contract or evidence packet, force three opening candidates, create annotated-script
scaffolding, plan visuals or rights, run the production rubric, or invoke the validator
unless Martin explicitly asks for that work.

When the request is for a complete script, finish and show the whole narration before any
editorial, retention, or timing audit. Runtime is a post-draft diagnostic, not a drafting
gate. Do not remove setup, referents, causality, examples, humor, viewer relevance, or the
learning promise merely to satisfy an unseen clock.

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

After the complete narration has been shown, audits may identify concerns and tradeoffs.
Return those concerns separately before rewriting the script. Any cut or compression that
could cost context requires Martin's review; the audit does not authorize the rewrite.

### Phase 2 — Evidence and production

Extract the material factual claims from the approved prototype, gather or refresh their
evidence, and let confidence control the final wording. Remove, narrow, or replace claims
that cannot be supported while preserving the approved rhythm and point whenever possible.
Map every factual narration sentence or separable factual clause to an adjacent `F-###`
claim entry that quotes the supported wording. Keep these source markers outside spoken
narration and omit them from Phase 1 unless Martin explicitly requests them.

Then add the production structure, resolve personal input and viewer application, plan
visuals and rights, run the editorial audits, inspect runtime and retention, validate the
document, and report every remaining gate. The readable document begins with numbered
beats containing spoken narration only. Put all metadata and production annotations in a
final appendix. The existing research, format, rubric, template, and validator resources
govern this phase.

## Final document structure

The production document has two reading layers:

1. **Numbered beats:** one heading and the spoken narration for each beat, with no timing,
   claims, source markers, production notes, labels, or editorial commentary mixed into
   the beat text.
2. **Appendix:** script metadata plus beat-matched timing, targets, story functions,
   factual claims and sources, visuals, motion and edit direction, on-screen text, audio
   and accessibility notes, assets and rights, personal input, viewer application, audit
   results, and reference ledgers.

This preserves traceability without making Martin reconstruct the script from an audit
form. Every appendix beat entry uses the same number and title as its narration beat.

## Future local workbench compatibility

The planned script-ideation and editing app will run locally inside this repository and use
the local agent for LLM work. It will eventually support this path:

`initialize topic ideation → compare and select a topic → brainstorm structure → generate narration → review or rewrite a selection → request alternatives → approve creative direction → build the evidence-backed production script`

This refactor lays only the editorial and operation boundaries needed by that future app.
It does not implement the app.

### Responsibility boundaries

- The existing topic-selection skill owns topic discovery, comparison, package testing,
  and selection.
- The script-writing skill consumes a selected topic brief and owns structure, narration,
  refinement, creative approval, and evidence-backed finalization.
- The future app owns local interaction state, selection ranges, revision history, and UI.
- The local agent invokes the skills. The app must not copy their editorial rules into a
  second prompt system that can drift.
- Approved Markdown artifacts remain portable repository sources of truth. Temporary
  ideation state may remain app-local when that feature is designed.

### Selected topic brief handoff

The script skill must accept a selected topic brief without rerunning topic discovery. The
brief may be conversational or file-backed; no fixed serialization is required yet. When
available, carry these semantic fields forward:

- selected topic and angle;
- intended audience;
- title and thumbnail promise;
- core tension or open question;
- explicit by-end viewer promise;
- intended payoff;
- known factual anchors; and
- important unknowns still awaiting evidence.

Missing nonessential fields must not block a useful rapid prototype. Ask only when the
missing choice would materially change the requested artifact.

### Operation-shaped behavior

Write the revised skill so a caller can invoke each behavior independently, whether the
caller is Martin in chat or a future local UI:

- **Generate:** create one topic-informed structure, opening, passage, or narration at the
  requested scope.
- **Review:** analyze the supplied script or selection and return findings without
  rewriting it.
- **Rewrite selection:** return a replacement for only the supplied selection, preserving
  surrounding approved language and the selection's narrative job.
- **Generate alternatives:** only when requested, return clearly separated alternatives
  for the same selected job rather than silently choosing or replacing the script.
- **Promote:** after explicit creative approval, preserve the approved voice baseline and
  enter the evidence and production phase.

Do not make these behaviors depend on invisible conversational state. Accept the relevant
topic brief, artifact or selection, surrounding context, requested operation, and creative
status when they are supplied. In ordinary chat, infer those inputs from the conversation;
in the future app, its local state will supply them explicitly.

Do not define a JSON protocol or stable API in this refactor. Preserve semantic boundaries
now so the later app design can choose transport and storage without rewriting the
editorial workflow.

When Martin requests iteration telemetry, record each visible task's elapsed time and the
runtime-reported token usage. If the runtime exposes no token metadata, say `unavailable`;
never manufacture a precise count. Keep telemetry outside the narration so a future
workbench can capture it without contaminating the script artifact.

## Core creative tenets

1. **Story and voice before verification.** Find a narration worth protecting before
   building its evidence and production package.
2. **Use the strongest honest entry.** Open with either the real event or a precise
   viewer-level question the episode can answer, then ground a question-first opening
   immediately in the event. Keep the first two spoken sentences to one idea each, use
   everyday syntax, and avoid technical compound phrasing when simpler words preserve the
   meaning. Do not spend either sentence on a technical setup label: state the
   human-readable premise first, then hold experimental qualifiers and mechanism detail
   until after the hook. Do not use provocative terms as literal claims of intent unless
   the evidence establishes that state or the narration clearly marks the term as
   shorthand.
   When a research-event opening has a supplied or verified year and responsible
   institution or team, name them; do not substitute generic “scientists” or invent a
   university, city, lab, location, or affiliation.
3. **Build the complete hook.** Move through:
   `event → joke → paradox → meaning → consequential question → viewer relevance → by-end promise`
   or `question → event → joke → paradox → meaning → viewer relevance → by-end promise`.
4. **Promise an answer.** State what the viewer will understand, recognize, identify, or
   be able to do by the end. A generic tease is not a promise. Write the promise itself as
   a literal learning contract, with no joke, comic image, metaphor, or colorful callback
   inside that sentence; humor may surround it without complicating the takeaway.
5. **Make the human connection early.** Do not postpone why the idea matters in ordinary
   behavior or AI use.
6. **Concretize every non-obvious claim.** Follow an abstraction with an example, image,
   or consequence the viewer can immediately picture.
7. **Use terminology as a reward.** Demonstrate the pattern first; name concepts such as
   specification gaming or Goodhart's law only after the viewer understands them.
8. **Add useful informational rewards.** When a compact verified fact can deepen the
   concept without slowing the story, add one about its origin, scale, reversal, or
   consequence. Keep it connected to the next thought; omit decorative trivia.
9. **Make humor do explanatory work.** Build jokes from the mechanism, pursue the stronger
   second or third beat, and prefer specific consequences over cryptic cleverness.
10. **Escalate the stakes.** Move from the funny incident to ordinary experience and then
   to the larger system without abandoning the central idea.
11. **Write for speech.** Use short sentences, controlled density, contrast, repetition,
    callbacks, and recurring language that gives the narration a spine.
12. **Make every paragraph earn its place.** It must create curiosity, laughter, or
    insight; the strongest paragraphs do more than one.
13. **Let research support the story.** Evidence determines what may be claimed, not the
    order in which the viewer must hear the research process.

## Rapid quality check

Before returning a prototype or refinement, check only:

- Does the first sentence feel like a concrete event or irresistible proposition?
- If the opening starts with a question, can the episode answer it, and does the concrete
  event follow immediately?
- Do the first two spoken sentences each carry one idea in plain syntax?
- Are technical setup labels and mechanism detail held until after the hook?
- Does the opening contain a sharp comic or surprising turn?
- Is the central paradox understandable without specialist language?
- Does the opening ask the big question and explain why the viewer should care?
- Does it promise what the viewer will gain by the end?
- Is the by-end promise literal, specific, and free of jokes or metaphors?
- Does a research-event opening name the known year and institution without inventing a
  location or affiliation?
- Does each substantial abstraction receive a concrete example?
- When a compact origin, scale, reversal, or consequence fact would deepen the idea, is
  it included briefly and connected to the story rather than used as decorative trivia?
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
- Express rapid generation, review, selection rewrite, alternatives, and promotion as
  separable behaviors in the skill and rapid-prototyping reference.
- Treat a selected topic brief as the handoff from topic ideation; do not rerun topic
  selection inside the script skill unless explicitly asked.

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
- Review-only requests return findings without rewriting the supplied text.
- Alternative requests return distinct labeled choices for the same narrative job and do
  not mutate the source selection.
- The script skill accepts a selected topic brief without rerunning topic discovery.
- The creative approval gate precedes evidence and production work.
- A complete narration is shown before editorial, retention, or timing audits.
- Timing is a post-draft diagnostic that reports concerns without automatically rewriting
  or removing context.
- The final document uses numbered, narration-only beats followed by a metadata appendix
  whose beat entries match the narration beat numbers and titles.
- The complete hook includes the consequential question, viewer relevance, and explicit
  by-end promise.
- Question-first openings ask a supportable question, ground it immediately in the event,
  and keep the first two spoken sentences syntactically simple.
- Research-event openings use the supplied or verified year and responsible institution or
  team when available without inventing a location or affiliation.
- Phase 2 maps every factual narration statement to an adjacent, non-spoken `F-###` claim
  entry while Phase 1 remains free of source markup by default.
- The rapid method adds a compact verified informational tidbit when it deepens a concept
  without slowing the story and rejects decorative trivia.
- Requested iteration telemetry reports per-task elapsed time and runtime token usage when
  exposed, otherwise `unavailable`, without entering the narration.
- Phase 2 still routes every existing evidence, rights, format, rubric, and validation
  requirement.
- Existing validator behavior and all current package tests remain green.

### Forward evaluations

Run five fresh scenarios after implementation:

1. A time-pressured request for one funny three-minute narration with no verification.
2. A request to sharpen only an existing opening while preserving its factual spine.
3. An approved prototype moving into an evidence-backed eight-minute production script.
4. A local-workbench-style review request containing a selected passage, its surrounding
   context, and an instruction not to rewrite.
5. A local-workbench-style request for multiple replacement choices for one selected
   passage.

Success means the first two return immediate, scoped creative work without production
overhead or fabricated facts, while the third preserves the voice baseline and correctly
enters the existing rigorous workflow. The final two must respect the requested operation
and selection boundary without relying on hidden chat history.

## Reconciliation

Record the two-phase workflow and complete-hook promise in `whp-youtube/STEERING.md` and
`DECISIONS.md`. `BRAND.md` already requires rigor, usefulness, humanity, and immediate
recognized value, so it needs no change. `CLAUDE.md` already points script work to channel
steering and needs no change.

Record the future local-workbench boundary without selecting its stack or creating app
files. The workbench is a later feature with its own design cycle.

Preserve `whp-youtube/episodes/01-why-ai-cheats.md` as an evidence and production reference,
but mark its v0.7 narration creatively superseded so it cannot be mistaken for the current
voice baseline.

## Implementation evidence

- The [implementation plan](../plans/2026-07-22-whp-rapid-script-prototyping.md) records the
  documentation-TDD sequence, scope boundaries, and verification commands.
- The [evaluation record](../evidence/2026-07-22-whp-rapid-script-prototyping-evaluation.md)
  preserves three pre-change baselines, the superseded prompt-contaminated campaign, five
  matched control/skill pairs, observed failures, RED–GREEN refinements, and residual risks.
- Deterministic verification passes 34 skill-package tests and 81 annotated-script validator
  tests: 115 tests total.
- The skill-creator validator passes for both the canonical `.agents` package and its
  `.claude` discovery link. The annotated production template also passes structural
  validation.
- The matched semantic runs support factual and hook guardrails while making conservative
  compatibility—not superiority—claims for promotion, review, and alternatives. They are
  semantic evidence, not deterministic proof.
- Independent review found no remaining Critical or Important issue after the final factual
  inference and hook-order regressions were fixed test-first and rerun in a fresh thread.
- The implementation adds no app framework, transport, persistence contract, UI, or topic
  selection code; it preserves only the semantic boundaries needed by the future local
  workbench.
