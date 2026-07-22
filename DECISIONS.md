# WHP Decision Ledger

This append-only ledger records why WHP changed. It is historical provenance, not a
source of current doctrine. Current canonical steering documents—presently
[`BRAND.md`](BRAND.md)—win whenever wording differs.

## 2026-07-20 — Editorial scope includes explicit games

**Decision:** WHP is not limited to hidden games; it may also examine explicit games
such as Sudoku in depth as historical, cultural, mathematical, social, and intellectual
objects.

**Rationale:** Rich real games provide another rigorous route into why humans play and
what play reveals about human thought.

**Documents:** `BRAND.md`, `CLAUDE.md`, `whp-youtube/STEERING.md`, and this ledger.

## 2026-07-20 — Reconcile every definite decision immediately

**Decision:** After every definite WHP decision, reconcile affected repository documents
immediately; clearly agreed outcomes apply without a second content-approval round,
while ambiguous consequences require one focused question.

**Rationale:** WHP should behave as a living body of work whose documents track settled
understanding as it evolves.

**Documents:** `AGENTS.md`, `.agents/skills/reconcile-whp/SKILL.md`, `CLAUDE.md`, and this
ledger.

## 2026-07-20 — Reconcile by document lifecycle

**Decision:** Always inspect canonical steering documents, update only affected active
working documents, and preserve historical, parked, and published artifacts except for
a necessary superseded-status note.

**Rationale:** Current direction must stay coherent without rewriting the history of how
WHP developed.

**Documents:** `.agents/skills/reconcile-whp/SKILL.md` and this ledger. No historical or
parked artifact was changed.

## 2026-07-20 — Start with instructions, a skill, and a ledger

**Decision:** Enforce reconciliation with `AGENTS.md`, the repository-scoped
`reconcile-whp` skill, and this ledger; defer lifecycle hooks, automatic commits,
semantic scripts, and a static document registry until real usage demonstrates a need.

**Rationale:** This is the smallest design that supplies a durable trigger, one shared
workflow, and auditability without premature mechanical enforcement.

**Documents:** `AGENTS.md`, `.agents/skills/reconcile-whp/SKILL.md`,
`.agents/skills/reconcile-whp/agents/openai.yaml`, and this ledger.

## 2026-07-20 — Make personal voice deliberate and insights actionable

**Decision:** Every complete WHP script must explicitly request, use, or omit an
authentic personal-experience sequence and must include one specific,
evidence-bounded viewer application with an observable signal, a limitation, and a
larger benefit.

**Rationale:** Personal material should feel like part of the story rather than filler,
and each episode should help viewers use its knowledge without inventing Martin's
experience or drifting into unsupported self-help certainty.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-20-whp-personal-actionable-beats-design.md`, and this
ledger. `BRAND.md` already requires useful, evidence-aware viewer change and needed no
content change.

## 2026-07-21 — Select the launch sequence afresh

**Decision:** Treat existing episode proposals, drafts, and backlog ordering as historical
inputs, and select WHP's pilot and opening sequence afresh with the current topic-selection
process.

**Rationale:** The earlier material consists of old proposals and drafts, while the current
topic-selection skill provides a richer basis for deciding what best serves the first few
episodes.

**Documents:** `BRAND.md`, `CLAUDE.md`, `whp-youtube/STEERING.md`,
`whp-youtube/drafts/evolutionary-paradox-of-play.md`, and this ledger. The parked draft's
content remains unchanged apart from a superseded-context note.

## 2026-07-21 — Lead with AI reward hacking and establish breadth

**Decision:** Launch WHP with an episode about AI reward hacking as a hidden incentive
game, followed by episodes on job-interview signaling, chess and cognitive transfer, and
an honest brain-games evidence audit.

**Rationale:** This breadth-first sequence was accepted as the strongest way to show the
range of the current WHP field across AI and incentives, hidden institutional games,
explicit games, and rigorous play science.

**Documents:** `BRAND.md`, `CLAUDE.md`, `whp-youtube/STEERING.md`,
`whp-youtube/drafts/evolutionary-paradox-of-play.md`, and this ledger. The parked draft
remains unchanged apart from its current-status note.

## 2026-07-22 — Lock the AI pilot package and story contract

**Decision:** Episode 1 uses the verified block-flip reconstruction as its opening and
the exact package *Why AI Cheats—Even When It Follows Every Rule* with
**100% WRONG**; it closes with a conditional inspection of one everyday score, without
changing the accepted launch order.

**Rationale:** The selected opening, original-only visual route, and bounded application
keep the title, thumbnail, central score-versus-goal question, and final payoff aligned
without presenting the conceptual perfect score or a viewer-observed pattern as an
empirical result.

**Documents:** `whp-youtube/STEERING.md` and this ledger. `BRAND.md`, `CLAUDE.md`, and
`whp-youtube/drafts/evolutionary-paradox-of-play.md` already state the correct doctrine,
authority chain, launch order, and parked status and needed no content change. The active
script at `whp-youtube/episodes/01-why-ai-cheats.md` is authoritative for its current
working state.

## 2026-07-22 — Prototype WHP narration before evidence production

**Decision:** Develop WHP scripts through a rapid narration prototype and line-level
creative refinement first; every opening must turn its concrete surprise into a
consequential question, explain why it can matter to the viewer, and promise what the
viewer will understand, recognize, or be able to do by the end. Begin evidence gathering,
runtime expansion, production annotation, rights work, and final validation only after
Martin explicitly approves the premise, voice, hook, and story direction.

**Rationale:** The evidence-first pilot was rigorous but slow, summary-driven, short on
humor, and weak in its early AI–human connection. Rapid refinement produced a stronger
hook and voice; rigor remains essential after the story earns approval rather than before
the creative direction is proven.

**Documents:** `whp-youtube/STEERING.md`,
`whp-youtube/episodes/01-why-ai-cheats.md`,
`docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md`, and this
ledger. `BRAND.md` and `CLAUDE.md` already state the correct brand doctrine and authority
chain and needed no content change.

## 2026-07-22 — Keep script workflows ready for a local editing workbench

**Decision:** Plan a future local script-ideation and editing app inside this repository
that uses the local agent to orchestrate topic ideation and selection, script generation,
selection-scoped review and rewriting, alternative generation, and later production
finalization. Shape the current script-skill refactor as independently invocable editorial
operations, but defer the app's framework, persistence, agent transport, exact data
contract, UI, and implementation to a separate future design.

**Rationale:** Martin wants to prototype and select topics quickly, brainstorm script
structure, highlight passages, request reviews or alternative wording, and iterate locally
without duplicating the editorial workflow outside the skills.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md`, and this
ledger. No application files were created. `BRAND.md` and `CLAUDE.md` needed no change
because this is an internal authoring workflow, not a new portfolio product or a change to
the repository authority chain.
