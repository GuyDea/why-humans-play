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

**Status:** Opening case and thumbnail superseded later on 2026-07-22 by “Prefer
first-hearing proof cases and connect them to the present.” The title, central question, and
launch-order decision remain current.

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

## 2026-07-22 — Permit a plain question-first opening

**Decision:** A WHP episode may begin with a precise viewer-level question when it states
the exact paradox the episode can answer, then ground that question immediately in a
concrete event; its first two spoken sentences use simple, one-idea syntax, and provocative
terms do not imply an unsupported mental state. Neither opening sentence should be spent on
a technical setup label: state the human-readable premise first, then hold experimental
qualifiers and mechanism detail until after the hook.

**Rationale:** “How can an AI follow every rule—and still give you exactly the wrong
result?” created immediate viewer stakes more cleanly than technical setup language while
remaining supportable by the episode's score-versus-goal argument.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`, and this
ledger. `BRAND.md` and `CLAUDE.md` already state the correct doctrine and authority chain.
The active Episode 1 production scaffold remains unchanged because its narration is
creatively superseded.

## 2026-07-22 — Keep the viewer promise literal

**Decision:** The by-end learning promise in a WHP opening must state plainly and
specifically what the viewer will learn; jokes, comic images, metaphors, and colorful
callbacks stay outside the promise sentence even when humor surrounds it.

**Rationale:** A comic phrase such as “before fluent nonsense walks out wearing a tie”
made the learning pitch less direct. The pitch must be clear without convolution.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`, and this
ledger. `BRAND.md`, `CLAUDE.md`, and the superseded Episode 1 production scaffold remain
unchanged because this decision concerns rapid-script phrasing rather than brand doctrine,
the authority chain, or the old production narration.

## 2026-07-22 — Make research events specific and final facts traceable

**Decision:** A research-event opening names the supplied or verified year and responsible
institution or team when available, without inventing a university, location, or
affiliation; Phase 2 maps every factual narration statement to an adjacent, non-spoken
`F-###` source entry, while initial rapid prototypes remain free of citation markup unless
explicitly requested.

**Rationale:** A dated, attributed event sounds like something that actually happened, and
every factual statement in the final production script should be directly traceable without
turning the narration into a citation readout.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md`,
`.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`, and
this ledger. `BRAND.md`, `CLAUDE.md`, and the superseded Episode 1 production scaffold remain
unchanged because the decision refines script attribution and evidence annotation without
changing brand doctrine, repository authority, or the old production narration.

## 2026-07-22 — Add compact informational rewards

**Decision:** When a short verified fact about a concept's origin, scale, reversal, or
consequence can deepen a WHP script without slowing it, include it as an informational
reward after the viewer understands the pattern; omit decorative trivia.

**Rationale:** A quick fact such as the original context of Goodhart's law can make an idea
more memorable and useful while preserving the narration's momentum.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md`, and this ledger.
`BRAND.md` and `CLAUDE.md` already state the correct doctrine and authority chain and needed
no content change. The Episode 1 production scaffold will be rebuilt separately from the
approved rapid prototype during evidence-backed finalization.

## 2026-07-22 — Finish the narration before auditing it

**Decision:** Complete and show Martin the whole narration before running editorial,
retention, or timing audits. After that review, audits report concerns and tradeoffs
separately; they do not silently shorten or rewrite the creative baseline. Runtime remains
a post-draft production constraint, not a reason to remove context from an unseen script.
The final production document begins with numbered beats containing spoken narration only;
all metadata, evidence, production direction, and audit material belongs in an appendix at
the end, matched back to the beat numbers and titles.

**Rationale:** A premature timing pass removed the causal setup, clear referents, and
viewer stakes that made the Episode 1 opening work. Martin needs to judge the complete
story first, while the production team still needs a traceable evidence and execution
layer after the readable script.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`,
`.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`,
`whp-youtube/episodes/01-why-ai-cheats.md`, and this ledger. `BRAND.md` and `CLAUDE.md`
need no change because this is an authoring-order and document-presentation decision, not
a brand or repository-authority change.
## 2026-07-22 — Accept Script Creator business requirements

**Decision:** Accept the Script Creator business requirements at
`docs/superpowers/specs/2026-07-22-script-creator-requirements.md`: V1 is prototyping-first
with a full topic-selection run UI, complete selection-scoped editing, first-class passage
variations, and the creative approval gate with promotion; read-aloud support and the
deeper production-phase UI are deferred, and the app's framework, persistence, agent
transport, exact data contract, and UI design remain deferred to a separate technical
design.

**Rationale:** Line-level refinement is the demonstrated bottleneck for the EP1
replacement narration and topic selection is the immediate next need, so both receive
first-class V1 support; production-phase depth follows once prototyping proves out, and
the requirements stay inside the recorded local-workbench boundary so the skills keep
owning the editorial rules.

**Documents:** `docs/superpowers/specs/2026-07-22-script-creator-requirements.md` and this
ledger. `BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` needed no content change
because the requirements conform to the recorded workbench boundary and the app remains an
internal authoring tool, not a portfolio product.

## 2026-07-22 — Accept Script Creator technical design and learning loop

**Decision:** Accept the Script Creator V1 technical design at
`docs/superpowers/specs/2026-07-22-script-creator-technical-design.md` — an Angular +
TipTap/ProseMirror localhost web app in `script-creator/` over a Node daemon that drives
headless codex through stateless, schema-constrained skill operations with durable job
runners, XDG SQLite working state, and repository Markdown milestones including
`whp-youtube/topics/`, `whp-youtube/topic-runs/`, and `whp-youtube/PIPELINE.md` — and add
requirement FR-8: the app retains each session's decisions, distills them into proposed
lessons, and applies them only after approval, episode-local lessons as envelope context
and durable lessons through the existing reconcile flow into skill and steering files;
adopt guyditor-compatible beat IDs, millisecond planned timings, and a versioned JSON
production handoff as boundary constraints while deferring actual guyditor integration.

**Rationale:** Angular matches the stack Martin already maintains while the editor core is
framework-agnostic ProseMirror; routing learned lessons through the repository's canonical
steering and skill files keeps one editorial memory and prevents an app-owned prompt layer
from drifting; guyditor is an internal alpha whose integration is premature, but immutable
IDs, millisecond timings, and a serializable handoff are nearly free now and avoid
remapping later.

**Documents:** `docs/superpowers/specs/2026-07-22-script-creator-technical-design.md`,
`docs/superpowers/specs/2026-07-22-script-creator-requirements.md`, and this ledger.
`BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` needed no content change because
the design conforms to the recorded workbench boundary and the app remains an internal
authoring tool.

## 2026-07-22 — Support both Script Creator episode formats

**Decision:** The Script Creator V1 Markdown codec auto-detects, stores, and emits both
the annotated beat format with a `### Narration` subsection and the Phase-1 narration
format with full verbatim `## …` beat headings, direct blockquotes, and an opaque
production appendix; wrapped blockquote lines form one narration paragraph, while a
blockquote-only blank line separates paragraphs.

**Rationale:** The live Episode 1 source now uses the Phase-1 narration format, while
the existing constructed round-trip and production workflow still require annotated
format compatibility.

**Documents:** `docs/superpowers/specs/2026-07-22-script-creator-technical-design.md`,
`docs/superpowers/plans/2026-07-22-script-creator-spike2-editor.md`, and this ledger.
`BRAND.md`, `CLAUDE.md`, `whp-youtube/STEERING.md`, the accepted requirements, and the
live episode needed no content change because they already state the correct brand,
authority, narration-first, and opaque-appendix direction.

## 2026-07-23 — Embed the editor core directly without TipTap

**Decision:** The Script Creator Studio embeds the Spike 2 editor core's ProseMirror
schema, plugins, and plain-DOM node views directly inside the Angular app, dropping the
technical design's TipTap 3 wrapper.

**Rationale:** Spike 2 produced a complete framework-agnostic editor core — including the
selection toolbar and node views TipTap would have supplied — so the wrapper would add a
conversion layer and integration risk without providing any needed feature.

**Documents:** `docs/superpowers/specs/2026-07-22-script-creator-technical-design.md`,
`docs/superpowers/plans/2026-07-23-script-creator-plan4-studio.md`, and this ledger.
`BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` needed no content change because
the choice is internal to the workbench implementation.

## 2026-07-22 — Ground substantial points in real-world consequences

**Decision:** For each non-obvious WHP point, prefer a compact documented real-world case
told with mechanism-derived humor, then state which number improved, which real goal was
damaged, and who absorbed the cost; use a clearly labeled hypothetical only when a real
case is unavailable, unverified, or would obscure the story.

**Rationale:** A joke or abstract example can demonstrate how someone games a measure while
still leaving the viewer asking why the gap matters. The negative implication must be part
of the explanation rather than metadata the viewer has to infer.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`, and this
ledger. `BRAND.md` and `CLAUDE.md` already require useful, rigorous, human storytelling and
need no change.

## 2026-07-22 — Make the AI check conversational and close the lesson

**Decision:** Episode 1 promises four questions viewers can ask an AI to check whether its
answer solved their real problem, integrates Goodhart's and Campbell's laws through funny
examples with explicit human consequences, and ends on a declarative lesson rather than an
unresolved question.

**Rationale:** The check should be directly usable inside an AI conversation, and the
episode's last sentence should put a clear period behind the insight the story earned.

**Documents:** `whp-youtube/STEERING.md`,
`whp-youtube/episodes/01-why-ai-cheats.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`, and this
ledger. Historical proposals and parked drafts remain unchanged.

## 2026-07-22 — Start Episode 1's human bridge with real cases

**Decision:** Remove the hypothetical school and customer-service warm-ups from Episode 1
and begin its human bridge directly with attributed real-world cases.

**Rationale:** Not separately stated; the settled direction is to skip the hypothetical
section completely and start with real-world examples.

**Documents:** `whp-youtube/STEERING.md`,
`whp-youtube/episodes/01-why-ai-cheats.md`,
`docs/superpowers/plans/2026-07-22-episode-1-real-world-examples.md`, and this ledger.
`BRAND.md` and `CLAUDE.md` remain unchanged because this is an episode-level story choice.

## 2026-07-22 — Prefer high-profile examples from across the world

**Status:** Superseded later on 2026-07-22 by “Use novelty for developed cases and
recognition for the global montage.”

**Decision:** When multiple documented cases are comparably strong, WHP scripts prefer the
more widely recognized, high-profile case and vary the countries or regions represented
across their examples.

**Rationale:** Martin wants examples drawn from different parts of the world when possible
and considers higher-profile cases preferable.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/evidence/2026-07-22-whp-rapid-script-prototyping-evaluation.md`, and this
ledger. `BRAND.md`, `CLAUDE.md`, and historical topic research remain unchanged because the
decision refines example selection rather than brand scope or past findings.

## 2026-07-22 — Make conceptual jokes explicit enough to travel

**Decision:** WHP jokes that personify a law, metric, or institution must state enough of
the causal connection that an international viewer will not mistake the joke for a literal
factual claim.

**Rationale:** Subtle wording such as a law finding “a second career reviewing performance
dashboards” may leave non-native English speakers unsure whether it describes a real second
use rather than a joke.

**Documents:** `whp-youtube/STEERING.md` and this ledger. `BRAND.md` and `CLAUDE.md` need no
change because this refines channel-level delivery rather than brand scope or repository
authority. The script skill already requires humor to remain legible, so no additional skill
text was necessary.

## 2026-07-22 — Prepare unfamiliar names before first mention

**Decision:** Before any unfamiliar person, institution, place, or concept is first named in
WHP narration, prepare why it is entering, identify it in plain language, and explain its
immediate relevance.

**Rationale:** Dropping in “Donald Campbell warned” without first introducing Campbell's
law can make viewers wonder who he is or whether they missed an earlier reference.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/evidence/2026-07-22-whp-rapid-script-prototyping-evaluation.md`, and this
ledger. `BRAND.md`, `CLAUDE.md`, historical plans, and the unapproved Episode 1 preview remain
unchanged because this is a reusable delivery rule recorded in current channel doctrine and
the script skill.

## 2026-07-22 — Use novelty for developed cases and recognition for the global montage

**Decision:** For a worldwide pattern, WHP develops a strong lesser-known case when it
offers useful surprise, then uses one compact montage of roughly three familiar, dated cases
from different regions when possible to demonstrate the pattern's global scale.

**Rationale:** A familiar case can bore viewers when the same mechanism has a less-known,
equally useful example; recognizable cases still work as fast proof that the behavior is
widespread.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/evidence/2026-07-22-whp-rapid-script-prototyping-evaluation.md`, and this
ledger. `BRAND.md`, `CLAUDE.md`, and historical topic research remain unchanged because the
decision refines example selection rather than brand scope or past findings.

## 2026-07-22 — Prefer first-hearing proof cases and connect them to the present

**Decision:** A WHP factual hook must make its goal, visible measure, shortcut, and absurd
outcome understandable on first hearing; replace an example that needs a technical repair,
and when persistence is part of the point, pair one vivid early warning with one compact
current echo of the same bounded mechanism.

**Rationale:** The block-flip case sounded like an unexplained bug until its geometry was
unpacked. OpenAI's CoastRunners case makes the race, scoring loophole, behavior, and failure
immediately visible, while the 2025 coding-test example shows that the same class of failure
still matters in current AI systems. The punchline works only after the causal link is clear.

**Documents:** `BRAND.md`, `whp-youtube/STEERING.md`,
`.agents/skills/choosing-whp-video-topic/SKILL.md`,
`.agents/skills/choosing-whp-video-topic/references/research-method.md`,
`.agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`whp-youtube/episodes/01-why-ai-cheats.md`,
`docs/superpowers/plans/2026-07-22-episode-1-real-world-examples.md`,
`docs/superpowers/evidence/2026-07-22-whp-rapid-script-prototyping-evaluation.md`, and this
ledger. Historical evaluation examples remain preserved as records of the behavior that was
tested; `CLAUDE.md` and parked episode drafts are unchanged because the decision affects
current editorial doctrine and Episode 1 rather than repository authority or historical work.

## 2026-07-23 — Put clickable evidence indicators beside production claims

**Decision:** Every factual sentence or separable factual clause in an evidence-backed WHP
production script carries a visible `[F-###](Original URL)` indicator beside the claim;
the indicator is review metadata and is excluded from spoken narration and word count.

**Rationale:** Martin could not readily locate the source for Episode 1's opening OpenAI
claim because the URL was buried in the appendix evidence ledger. The source relationship
must be visible where the claim is read.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md`,
`.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`,
`.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`whp-youtube/episodes/01-why-ai-cheats.md`, and this ledger. `BRAND.md` remains unchanged
because this refines evidence-review presentation rather than brand scope or identity.

## 2026-07-23 — Approve script architecture before narration

**Decision:** Every new WHP episode or thesis-level rethink begins with a separately
reviewed script architecture—central question and answer, viewer belief shift, insight
ladder, phenomenon and paradox map, earned reframe, real-world evidence map, practical
payoff, final lesson, and scope boundary—and no episode-scale opening, beat outline, or
narration begins until Martin explicitly approves that complete intellectual payload.

**Rationale:** Drafting polished narration first made Martin discover shallow, redundant,
or disconnected ideas inside expensive prose. Refining the payload first is faster and
creates room for a defensible deeper insight rather than a summary of familiar material.
Mapping established phenomena also lets the episode connect its examples to useful known
ideas without becoming a list of terminology.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/agents/openai.yaml`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/specs/2026-07-22-whp-rapid-script-prototyping-design.md`,
`docs/superpowers/specs/2026-07-22-script-creator-requirements.md`,
`docs/superpowers/specs/2026-07-22-script-creator-technical-design.md`,
`docs/superpowers/evidence/2026-07-23-whp-script-architecture-baseline.md`,
`docs/superpowers/evidence/2026-07-23-whp-script-architecture-forward-evaluation.md`,
`docs/superpowers/evidence/2026-07-23-whp-script-architecture-evaluation.md`, and this
ledger. `BRAND.md`, `CLAUDE.md`, historical research, Episode 1, and app implementation
remain unchanged because this is an authoring-order decision consistent with existing
brand doctrine and the local app is being changed separately on another branch.

## 2026-07-23 — Complete the Script Creator draft-list contract

**Decision:** Script Creator exposes a nonce-guarded `GET /api/drafts` endpoint returning
body-free draft summaries ordered by most recent update so the Studio library can list
saved drafts without loading each document.

**Rationale:** The Studio already calls the collection endpoint, but the daemon registered
only draft creation and per-ID reads and writes, leaving the library request to fail with a
404.

**Documents:** This ledger. `BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` need no
content change because this is an internal workbench transport contract. The active Script
Creator Plan 4 already requires draft listing, while Plan 3 is preserved as the historical
implementation plan whose endpoint wording left the collection read ambiguous.

## 2026-07-23 — Make durable operations authoritative in Script Creator Console

**Decision:** Script Creator exposes a nonce-guarded `GET /api/ops` endpoint for the 100
most recent durable operations, newest first, and the routed Console polls that list every
five seconds as its source of truth while retaining live Studio runtime events only as
supplemental in-flight detail.

**Rationale:** Navigating to `/console` unmounts the Studio and its runtime, so in-memory
tracker history cannot survive the route change even though the daemon already persists
operations and attempts durably.

**Documents:** `docs/superpowers/plans/2026-07-23-script-creator-plan4-studio.md` and this
ledger. `BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` need no content change
because this is an internal workbench runtime and transport contract. The Fix 5 report is
preserved as a historical verification record; Fix 6 will record the implementation.

## 2026-07-23 — Make durable topic runs authoritative in Script Creator Topics

**Decision:** Script Creator's Topics Decide section lists recent durable topic runs newest
first, hydrates the selected run's checklist, report, and structured summary through the
same renderer used for a live launch, auto-selects newly launched runs, refreshes the list
when they finish, and runs package-test and handoff actions from the selected durable
summary.

**Rationale:** A completed full topic run already survives server-side, but the Topics page
held its rendered board and downstream actions only in the mounted launch component's
memory, so reloading the page hid durable work.

**Documents:** `docs/superpowers/plans/2026-07-23-script-creator-plan5-topics.md` and this
ledger. `BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` need no content change
because this is an internal workbench runtime and transport contract. The Task 8 report
records the implementation and verification under Fix 5.

## 2026-07-23 — Close Script Studio provenance and live-runtime gaps before merge

**Decision:** Script Studio operation inputs contain only explicit stored draft state, live
editor state, structural daemon-defined scope, or user-entered text; every asynchronous
range operation resolves an editor-core-managed live anchor before applying a result; the
mounted production surface exposes proposal conflicts verbatim; console re-roll requires a
live owning runtime; editor-core symbols are consumed through its public package root; and
autosave retries are bounded, supersedable, and cancelled with their owning draft runtime.

**Rationale:** Final review found app-authored editorial fallbacks in submitted envelopes,
raw coordinates that could drift onto unrelated text, a composition test that bypassed the
production components, incomplete conflict presentation, detached re-rolls that could
produce headless results, a private dependency import, and a retry queue that could block
newer draft state or survive editor teardown.

**Documents:** `docs/superpowers/plans/2026-07-23-script-creator-plan4-studio.md` and this
ledger. `BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` need no content change
because this decision tightens an internal workbench implementation without changing WHP
brand or channel doctrine. The final-review report remains the detailed fix-wave record.

## 2026-07-23 — Accept the Script Creator architecture stage contract

**Decision:** Accept the architecture stage design amendment at
`docs/superpowers/specs/2026-07-23-script-creator-architecture-ui-design.md`: drafts gain
an architecture phase gating episode-scale narration behind explicit whole-architecture
approval; the artifact is stored as the skill's nine fixed sections with section-grain
operations (`generate-architecture`, `review-architecture`,
`rewrite-architecture-section`) and a canonical milestone written to the new whitelisted
path `whp-youtube/architectures/<slug>.md`; implementation is Plan 6's first block.

**Rationale:** The 2026-07-23 architecture-first amendment required a focused app design
before implementation; this contract adds only transport, storage, UI, and the gate while
the skill keeps every editorial rule.

**Documents:** `docs/superpowers/specs/2026-07-23-script-creator-architecture-ui-design.md`,
`docs/superpowers/specs/2026-07-22-script-creator-technical-design.md`, and this ledger.
`BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` needed no content change because
the amendment implements the recorded editorial decision inside the workbench boundary.

## 2026-07-23 — Close Plan 5 persistence and transport gaps before merge

**Decision:** Script Creator Plan 5 adopts the skill-owned `WHP_PROGRESS/2` thirteen-row
transport; validates complete topic summaries across finalists, packages, winner, and all
seven score/grade pairs; performs topic handoff as one durable idempotent server saga;
uses one centralized state-database migration sequence; persists gate checks within their
per-idea operation generation; deep-links repository-only pipeline cards to their topic
briefs; and surfaces malformed pipeline diagnostics instead of treating them as no data.

**Rationale:** The Plan 5 final review found protocol drift, retry-unsafe partial writes, a
shared migration-version collision, stale-result races, incomplete navigation, and hidden
repository parse failures.

**Documents:** `docs/superpowers/specs/2026-07-22-script-creator-technical-design.md`,
`docs/superpowers/plans/2026-07-23-script-creator-plan5-topics.md`, and this ledger.
`BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` remain unchanged because these
decisions tighten the internal workbench contract without changing WHP doctrine.

## 2026-07-23 — Start problem-led topic selection from the widest specific pain

**Decision:** For problem-led WHP episodes, generate and compare specific recognizable
viewer painpoints before choosing the explanatory mechanism, prioritizing the widest
evidence-supported pain rather than the broadest subject label.

**Rationale:** Topic generation should address the widest painpoint that most people
recognize and suffer from instead of beginning with a technical topic and adding relevance
afterward.

**Documents:** `whp-youtube/STEERING.md`,
`docs/steering/whp-video-topic-skill.md`,
`docs/superpowers/specs/2026-07-23-whp-painpoint-action-gates-design.md`,
`docs/superpowers/plans/2026-07-23-whp-painpoint-action-gates.md`,
`.agents/skills/choosing-whp-video-topic/SKILL.md`,
`.agents/skills/choosing-whp-video-topic/references/research-method.md`,
`.agents/skills/choosing-whp-video-topic/references/output-contract.md`,
`.agents/skills/choosing-whp-video-topic/scripts/test_skill_package.py`, and this ledger.
`BRAND.md` remains unchanged by this decision because wonder-, history-, and
explicit-game-led episodes remain part of the brand and may begin from a shared mystery,
desire, or tension rather than suffering.

## 2026-07-23 — Require a new-learning and concrete-action contract

**Decision:** Every WHP episode architecture must state both the non-obvious understanding
the viewer will gain and the concrete, evidence-bounded action, observation, or reflection
they can use, including an observable result and a real boundary, before narration begins.

**Rationale:** Every episode should leave people feeling that they learned something new
and something actionable, rather than delivering a familiar summary surrounded by
examples and prose.

**Documents:** `BRAND.md`, `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-23-whp-painpoint-action-gates-design.md`,
`docs/superpowers/plans/2026-07-23-whp-painpoint-action-gates.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`, and this
ledger.
The current Episode 1 script and launch sequence remain unchanged because this decision
changes the authoring gate, not an approved episode topic or narration.

## 2026-07-23 — Start every episode architecture with a sourced concept inventory

**Decision:** Before presenting a new or thesis-level WHP script architecture, run a
bounded primary- or authoritative-source concept-discovery scan and put its exact candidate
inventory first. Search explanatory mechanisms, consequences, named laws and effects,
authority and trust effects, interventions and countermeasures, and imprecise
near-neighbors; record sources and inclusion or exclusion reasons; distinguish established
terms from original synthesis; and stop only after materially different searches reach the
documented saturation rule. Cap rapid discovery at three broad batches plus two targeted
saturation batches—five grouped research round trips total—and mark unresolved work
incomplete rather than letting concept discovery become a production evidence pass.
Distill the smaller narration-facing phenomenon map only after that inventory exists.

**Rationale:** A recall-based phenomenon map omitted premortem because it searched mainly
for explanations of the problem and had no required category for interventions or decision
methods. Gathering the related laws, rules, paradoxes, effects, and countermeasures at the
start makes omissions visible before prose or a thesis hardens.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`, and this
ledger. `BRAND.md` remains unchanged because this is an authoring and discovery control,
not a change to the channel promise. Existing design and implementation plans remain
historical records of the earlier learning-and-action gate.

## 2026-07-24 — Reserve narration writes during paused architecture approval

**Decision:** While a Script Creator draft has a pending architecture-approval saga,
reserve every generic narration revision write—including autosaves,
proposal-acceptance replacement saves, and imports—with a structured recoverable
conflict; keep the routed narration editor and autosave blocked until the approval is
resumed or resolved, without weakening the saga's latest-revision requirement.

**Rationale:** Any narration revision appended after the saga's approval revision made
every Resume conflict while save, approve, and Reopen were also unavailable, permanently
stranding the draft.

**Documents:** `.superpowers/sdd/p6-final-review-report.md`,
`.superpowers/sdd/progress.md`, and this ledger. `BRAND.md`, `CLAUDE.md`, and
`whp-youtube/STEERING.md` remain unchanged because this is an internal workbench
concurrency and recovery contract, not a change to WHP doctrine.

## 2026-07-24 — Generalize persisted architecture-saga recovery across kinds

**Decision:** Treat approval, Reopen, and any future persisted architecture-saga kind
through one recovery contract: every pending kind reserves generic narration revision
writes, is exposed with its kind and opaque resume key, resumes through one route, and
returns current architecture state on recoverable pauses; if a pause cancels a racing
accepted-proposal save, preserve its operation provenance with the pending dirty state
for the post-resume save and settlement.

**Rationale:** Approval-specific reservation, exposure, and resume machinery left the
same permanent revision strand available to Reopen, while state-less pause responses and
cancelled-save-only provenance prevented immediate routed recovery and accepted-proposal
settlement.

**Documents:** `docs/superpowers/plans/2026-07-24-script-creator-plan6-architecture.md`,
`.superpowers/sdd/p6-final-review-report.md`, `.superpowers/sdd/progress.md`, and
this ledger. `BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` remain
unchanged because this is an internal Script Creator concurrency and recovery
contract.

## 2026-07-24 — Route every recoverable architecture conflict through shared state

**Decision:** Every routed Script Creator write catch that can receive a state-bearing
recoverable architecture reservation or conflict must pass the caught error through one
shared conflict router before local failure handling, so a stale client immediately
adopts the pending saga, blocks narration editing, and exposes the correct Resume action
without an autosave or reload.

**Rationale:** Only the debounced autosave catch adopted reservation state; direct
whole-episode saves, Promote-result reconciliation, and production synchronization could
discard the same server state and leave a stale client writable with no Resume action.

**Documents:** `.superpowers/sdd/p6-final-review-report.md`,
`.superpowers/sdd/progress.md`, and this ledger. `BRAND.md`, `CLAUDE.md`, and
`whp-youtube/STEERING.md` remain unchanged because this is an internal Script Creator
client recovery contract.

## 2026-07-24 — Recognize genuine validator fix revisions

**Decision:** Script Creator's validator-fix-cycle proof accepts any interposed narration
revision that actually changes document content—including accepted proposals,
`production-import` revisions, and content-changing autosaves/manual editor edits—between
a failed exact-hash attempt and a passing attempt at a new hash; excludes restores,
architecture revisions, and content-unchanged saves; and records at most one decision for
each unique failure-attempt-ID plus fixed-hash cycle.

**Rationale:** The live Plan 7 sweep's manual editor fix was persisted as an ordinary
autosave, so categorically excluding autosaves made the genuine cycle impossible to
capture. Re-validation synchronizes the production export from the draft before validating,
so an out-of-band target change cannot produce a pass without a qualifying draft revision;
a validator rerun without a content-changing narration revision must remain refused.

**Documents:** `docs/superpowers/evidence/2026-07-24-script-creator-plan7-learning.md`,
`docs/superpowers/plans/2026-07-24-script-creator-plan7-learning.md`, and this ledger.
`BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` remain unchanged because this
decision corrects internal proof calibration without changing WHP doctrine or Plan 7
architecture.

## 2026-07-24 — Replay the editor transform for episode acceptance proof

**Decision:** Script Creator's whole-episode proposal-acceptance proof replays the
editor's real Markdown parse and draft-preservation transform, compares narration
content while ignoring metadata and attributes legitimately preserved from the stored
draft, and returns a structured refusal rather than a server error whenever
correspondence cannot be proved.

**Rationale:** The live Plan 7 sweep's genuine two-beat episode proposal was parsed and
merged by the editor before saving, so comparing the saved document directly with the
raw operation result made the hardened proof throw a raw 500 on a valid acceptance.
Forged narration content must remain refused.

**Documents:** `docs/superpowers/evidence/2026-07-24-script-creator-plan7-learning.md`
and this ledger. `BRAND.md`, `CLAUDE.md`, `whp-youtube/STEERING.md`, and the Plan 7
implementation plan remain unchanged because this corrects internal proof calibration
without changing WHP doctrine or Plan 7 architecture.

## 2026-07-24 — Baseline first narration acceptance on the handoff draft

**Decision:** When whole-episode proposal acceptance creates a handoff draft's first
narration revision, Script Creator uses the draft's stored creation document as the
baseline for both the content-change proof and the draft-preservation replay; accepting
unchanged narration remains refused.

**Rationale:** A fresh handoff draft has only architecture-kind revisions before its
first narration acceptance, so requiring an earlier narration revision incorrectly
refused the live episode acceptance as unequal to the operation proposal.

**Documents:** `docs/superpowers/evidence/2026-07-24-script-creator-plan7-learning.md`
and this ledger. `BRAND.md`, `CLAUDE.md`, `whp-youtube/STEERING.md`, and the Plan 7
implementation plan remain unchanged because this corrects internal proof calibration
without changing WHP doctrine or Plan 7 architecture.

## 2026-07-24 — Replay the atomic personal-input acceptance transaction

**Decision:** Script Creator's personal-input acceptance proof replays the real editor
transaction: replace the matching narration marker with the operation's returned text and
mechanically flip that PI block's `Decision:` to `COMPLETED` inside the opaque production
appendix in the same saved revision, while preserving surrounding narration content and
inline evidence-indicator links exactly; any additional content change remains refused.

**Rationale:** The live Plan 7 sweep refused a genuine Plan 6 Task 9 acceptance because
the proof did not accommodate the complete atomic editor transaction represented by the
real imported annotated-script template.

**Documents:** `docs/superpowers/evidence/2026-07-24-script-creator-plan7-learning.md`
and this ledger. `BRAND.md`, `CLAUDE.md`, `whp-youtube/STEERING.md`, and the Plan 6 and
Plan 7 implementation plans remain unchanged because they already state the governing
contract and this corrects only its internal proof calibration.

## 2026-07-24 — Exercise Plan 7 distillation from genuine draft evidence

**Decision:** The Plan 7 real-operation spot creates its distillation evidence through a
real draft-scoped `rewrite-selection` operation whose narration proposal is durably
rejected with a why-note, then submits Distill only through the draft-scoped route so the
server freezes that genuine decision and zero lessons.

**Rationale:** Generic operation submission now correctly refuses Distill, and
draft-scoped Distill deliberately prevents callers from supplying synthetic frozen
decisions or lessons.

**Documents:** `.superpowers/sdd/p7-final-review-report.md` and this ledger.
`BRAND.md`, `CLAUDE.md`, `whp-youtube/STEERING.md`, and the Plan 7 implementation plan
remain unchanged because this corrects the real-operation verification flow without
changing WHP doctrine or the approved Plan 7 architecture.

## 2026-07-24 — Close Plan 7 operation-storage and proof boundaries

**Decision:** Once a durable lesson's reconciliation is verified, Script Creator retains
only deterministic repository provenance and content hashes throughout app storage,
including the proposing operation's envelope and result, and later Distill inputs supply
repository references that the read-only skill resolves itself; generic draft saves
preserve every server-owned non-narration metadata field, and v10 backfills a rejected
narration proposal only when its operation envelope and result prove that proposal for
the draft.

**Rationale:** Applied durable doctrine must live only in repository steering and skill
files, while every captured acceptance or rejection must be limited to the state change
proved by its originating operation.

**Documents:** `.superpowers/sdd/p7-final-review-report.md` and this ledger. `BRAND.md`,
`CLAUDE.md`, `whp-youtube/STEERING.md`, the Plan 7 implementation plan, and the
controller-owned lesson-distillation reference remain unchanged because they already
permit repository-native durable doctrine and server-owned proof boundaries; this fix
closes implementation and verification gaps without changing that architecture.

## 2026-07-24 — Close Plan 7 confirmation-review-3 proof boundaries

**Decision:** Script Creator removes verified durable candidate bytes from the
distillation run guardrail and frozen decision snapshots as well as every existing
app-local artifact; selection acceptance replays only the operation replacement against
the complete stored ProseMirror document and refuses every other structural change;
reconciliation verification transitions learning state before artifact redaction and
compensates the learning transition if redaction fails.

**Rationale:** A verified candidate must not survive in app-local storage, accepted
revisions must contain only the operation-proposed selection change, and learning and
artifact state must remain consistent across either transition failure.

**Documents:** `.superpowers/sdd/p7-final-review-report.md` and this ledger. `BRAND.md`,
`CLAUDE.md`, `whp-youtube/STEERING.md`, the Plan 7 implementation plan, and `.agents/`
remain unchanged because the approved architecture already requires repository-native
durable doctrine and mechanically proved proposal correspondence; this closes
implementation and failure-atomicity gaps.

## 2026-07-24 — Make Plan 7 redaction durable across every freezing run

**Decision:** When a durable lesson is verified, Script Creator atomically records a
pending redaction step covering every distillation run that froze the lesson and each
linked operation, scrubs candidate bytes from all of those runs and artifacts, and marks
redaction done only after completion; restart recovery and verification retries resume
any verified reconciliation whose redaction remains pending.

**Rationale:** A later Distill run can freeze and echo a still-pending durable candidate,
and a process stop after learning verification but before operation-artifact redaction
must not leave verified shadow doctrine permanently stored.

**Documents:** `.superpowers/sdd/p7-final-review-report.md` and this ledger. `BRAND.md`,
`CLAUDE.md`, `whp-youtube/STEERING.md`, the accepted Plan 7 implementation plan, and
`.agents/` remain unchanged because this closes storage coverage and restart-recovery
gaps within the existing repository-native durable-doctrine contract.
## 2026-07-24 — Expand the AI-advice episode to eight minutes through one recurring decision

**Decision:** Expand `Why AI Makes Bad Advice Feel Right` to approximately eight minutes
and about 1,350 spoken words by carrying one explicitly hypothetical quitting decision
through framing, agreement, persuasive presentation, the borrowed-authority loop, and a
worked application of all four Second-Opinion Test questions.

**Rationale:** The 784-word evidence-backed draft is only a four-and-a-half- to five-minute
narrative core. The added runtime should produce deeper insight, consequence, and a visible
practical demonstration rather than more terminology, disconnected studies, or filler.

**Documents:** `docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md`,
`whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`, and this ledger.
`BRAND.md` and `whp-youtube/STEERING.md` remain unchanged because eight minutes already
fits the channel's six-to-ten-minute rule, and this decision does not settle the separate
canonical Episode 1 launch-sequence conflict.

## 2026-07-24 — Prove viewer vulnerability before explaining it

**Decision:** Do not ask viewers to accept a material real-world vulnerability or
consequence from theory, analogy, warning, or a hypothetical alone. Use a documented
observed case matching the claimed population and outcome; when the case is adjacent to
the episode's exact mechanism, state that boundary and introduce separate evidence for the
mechanism. Hypotheticals may explain or rehearse a demonstrated pattern, but they cannot
prove that real people are affected.

**Rationale:** A viewer who already recognizes an AI bias can dismiss a theory-only
warning as familiar caution. Showing that the effect has already changed the judgments of
informed or expert people defeats that immunity assumption with evidence instead of asking
the viewer to believe another assertion.

**Documents:** `BRAND.md`, `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md`,
`whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`, and this
ledger. The production episode remains unchanged until the full prototype clears creative
review and enters the separate evidence-and-production pass.

## 2026-07-24 — Make proof handoffs conversational and explicit

**Decision:** Narration must connect adjacent proof cases as
`case → exact takeaway → why it matters here → remaining question → next evidence`.
A scope boundary cannot serve as the transition by itself. WHP narration uses a friendly
conversation format—fact, plain reaction, meaning, next question—and keeps each standalone
punchline to one short spoken sentence, normally no more than 12 words. Factual setup and
causal explanation stay outside the joke. Lead every proof handoff with the case's positive
takeaway; a sentence beginning “this study did not…” cannot introduce the bridge.

For this Western-oriented English-language launch, prefer a well-supported Western case
when it can perform the same proof job clearly. Use the strongest non-Western case when no
Western candidate passes the evidence, causal-fit, consequence, and spoken-clarity gates;
never weaken evidence or misstate geography to satisfy audience proximity.

**Episode 1 application:** Replace the 2026 Pakistan physician trial in the opening with
the 2021 US-and-Canada physician study. The Western study is a closer match for the
specific anti-skip claim: radiologists rated supposedly AI-sourced advice lower, yet that
expressed skepticism did not reduce reliance. State that all advice was expert-written and
only labeled by source. Use it solely to establish over-reliance on advice; then make the
remaining question—where conversational AI points that influence—lead directly to the
separate Anthropic sycophancy evidence.

**Rationale:** The prior intro ended the doctors' story with what it did not prove, so the
caveat severed the logic instead of advancing it. It also buried a small joke inside a long
explanatory clause and sounded more like a research summary than a person guiding another
person through a surprising result.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md`,
`whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`, and this
ledger. The production episode remains unchanged pending creative approval of the complete
prototype.

## 2026-07-24 — Put the remedy before the detailed anti-skip case

**Decision:** When a problem-led opening invites an informed viewer to think “this cannot
happen to me,” use:
`intriguing question → anticipated defense → evidence-backed disarm → early remedy promise → real case`.
Complete the first four moves before developing the proof case. A short sourced result may
tease the case during the disarm, but the literal, joke-free remedy promise must give the
viewer a reason to hear the full story.

Measured skepticism, lower trust ratings, expertise, training, or prior warning is enough
observable resistance for the comparison. Narration may say “If you think this cannot
happen to me…” and then show a case involving such resistance. That compares the viewer's
defense with the case; it does not claim that participants held or voiced the viewer's exact
thought. Do not invent their thoughts, motives, or quotations.

**Rationale:** Baseline rewrites repeatedly treated the by-end promise as the final line of
the opening. That forced the viewer through the entire evidence setup before explaining why
the method would be useful. The revised order defeats the skip response quickly, offers the
practical payoff, and then earns the full example without weakening the evidence boundary.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md`,
`whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`, and this
ledger. The production episode remains unchanged pending creative approval of the complete
prototype.

## 2026-07-24 — Keep precise claims emotionally alive

**Decision:** WHP uses the voice principle “Precision controls what we claim. Personality
controls how we say it.” Narration should sound like a well-educated best friend with a
brutal sense of humor. It may use blunt judgment, emotionally loaded everyday words, and
controlled hyperbole—including calling a choice “stupid” or “the dumbest decision of your
life”—when the line targets the decision rather than the person's inherent worth and the
episode supports the underlying stakes. Serious subject matter does not automatically
require clinical or euphemistic wording. Emotional force never lowers the evidence bar,
and vulnerable people do not become the punchline.

**Rationale:** Polished, defensive vocabulary drained the channel's personality and made
friendly speech sound like an institutional disclaimer. A knowledgeable friend can call a
catastrophically self-defeating choice stupid while remaining humane toward the person who
made it. The channel needs that emotional honesty and brutal humor to feel authentic.

**Documents:** `BRAND.md`, `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md`,
`whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`, and this
ledger. Historical and unrelated documents remain unchanged.

## 2026-07-24 — Make manipulated-advice experiments visible

**Decision:** Explain an advice experiment as a visible
`case or question → advice → participant decision or outcome` chain. When researchers use
human-written advice carrying a false AI label, state immediately what was real, what was
only a label, and what human behavior the label tested. Attach every accuracy count to the
specific thing that was correct or wrong, and separate conclusions about human response
from conclusions about actual AI behavior.

**Rationale:** The physician story named eight X-rays, six correct items, two wrong items,
diagnostic advice, and an AI label without first explaining how those pieces fit together.
That made real X-rays sound possibly fake and made a label-manipulation study sound
irrelevant to AI.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md`,
`whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`, and this
ledger. `BRAND.md` remains unchanged because this is a channel-level story-clarity rule,
not a change to the umbrella brand doctrine.

## 2026-07-24 — Tell the smallest magnetic truthful story

**Decision:** Tell the smallest story that preserves trust, causal clarity, and surprise.
Every element must increase trust, first-hearing clarity, or magnetism; otherwise remove or
collapse it. Prefix documented stories with a compact verified date-and-place anchor and a
relevant person, team, or institution when useful. Make setup, experiment or action, result,
and meaning audible through varied natural connective language rather than repeated
“Here was…” outline labels. Each transition should explain what changes next. Never
simplify past the causal hinge, material caveat, or evidence boundary, and spend the saved
attention on the surprising turn, consequence, and AHA that carry the lesson. Add one short
joke when the result creates a clean comic opening and the joke sharpens rather than delays
the lesson.

Compression removes clutter, never connective tissue. Before a result, introduce every
actor, group, exact task, success criterion, metric, and comparator it needs. Preserve the
sequence `participants → exact task → group split → changed variable → measured result →
meaning`; report the result in the same concrete vocabulary as the task; and name both
sides of every comparison. Never replace a defined noun with an unexplained abstraction
such as “accuracy.” Distinguish a changed attitude from an effective behavioral response,
and make any analogy map its concrete roles and action directly to that mechanism.

Preserve the causal minimum, not the procedural maximum. The disarm teaser and developed
case have different detail budgets: the teaser states only the relevant qualification or
resistance and its failure to protect, while the case supplies the task, groups, measured
property, and comparator. Describe a participant's audience-facing objective and success
condition, not the study's response controls. A purpose-level paraphrase is allowed only
when it preserves the scored objective without inventing a different instruction. Before
drafting, lock one spoken name for every entity. Use the broadest truthful role labels that
keep actors distinct, state the changed variable with established nouns, and express a
measurement as object plus property. Every new noun must perform necessary causal work.
Every learning promise names its container explicitly, such as “By the end of this video.”

For the radiologist experiment, collapse the X-rays and diagnostic advice into one
narrative element: diagnoses. Preserve the date, location, experienced participant group,
the practical task of catching the wrong diagnoses, the correct-versus-wrong diagnosis
mix, the doctor-versus-AI origin label, the trustworthiness rating, the wrong-diagnosis
comparison, and the lesson that distrust is not the same as protection. Refer to the
purported human source as another doctor so it cannot be confused with the participating
radiologists. Do not introduce “advice,” “proposals,” “cases,” or “accuracy” into this
compressed version.

**Rationale:** A story should remain as fascinating and trustworthy as possible while
becoming as simple and easy to understand as possible—but not simpler. The X-rays were
medically accurate but added another relationship without changing the lesson. Dates,
places, natural connective language, and the surprising result increase trust, orientation,
and interest, so they remain. Repeated explicit labels make the structure sound mechanical,
while a result-derived joke can increase retention without adding another factual element.
The earlier compressed draft failed because it deleted relationships the listener needed
to understand the task, groups, comparison, and AHA; logical specificity is itself a trust
signal. The next draft failed in the opposite direction: it preserved source procedure and
synonyms that were accurate but did no story work. Causal completeness and procedural
completeness are not the same thing.

**Documents:** `BRAND.md`, `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md`,
`whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`, and this
ledger. Historical and published scripts remain unchanged.

## 2026-07-24 — Resolve every story result once

**Decision:** Apply the story-construction rules to every beat and developed example in a
complete script, not only to the intro. When a surprising result depends on a violated
expectation, state the expected outcome first and reveal the result against it. Resolve the
result with at most one mechanism-mapped punchline and one precise takeaway, then move
forward instead of stacking equivalent analogies or thesis lines. Give consecutive cases
distinct proof jobs before synthesizing them, prefer ordinary spoken language when it
preserves the claim, and end each beat once. A complete-episode promise must state both the
understanding the viewer will gain and the concrete response they can use.

**Rationale:** The revised radiologist story was causally understandable, but the audience
was not told what skepticism should have changed before hearing that it changed nothing.
The result was then explained repeatedly through an analogy, paraphrases, and thesis lines.
The opening promise offered the four questions while leaving the new understanding
implicit, and phrases such as “label of origin” sounded like research administration rather
than a well-educated friend telling the story.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md`,
`whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`, and this
ledger. `BRAND.md` remains unchanged because its smallest-magnetic-story rule already
applies to the complete piece; this decision clarifies the channel-level scripting method.

## 2026-07-24 — Make spoken readability a delivery gate

**Decision:** Before any WHP narration is shown, remove non-spoken annotations and reject
every sentence above 25 spoken words. Require a first-hearing clarity review for every
21–25-word sentence, and reject a sentence of any length when it carries multiple new
relationships, unclear actors or references, stacked conditions or caveats, or unexplained
abstractions. A sentence passes only when a listener can identify who did what, what
changed, and why it matters after hearing it once.

**Rationale:** Readability checkers exposed sentences in the Episode 1 prototype that were
grammatically valid but difficult to process in one hearing. A spoken script cannot rely on
the viewer rereading a dense sentence. The fixed ceiling catches measurable overload, while
the first-hearing review prevents a word-count formula from approving short but tangled
language or flattening clear rhythmic speech.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/check_spoken_readability.py`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_check_spoken_readability.py`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`docs/superpowers/plans/2026-07-24-spoken-readability-gate.md`,
`docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md`,
`whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`, and this
ledger. `BRAND.md` remains unchanged because its existing first-hearing clarity doctrine
already supports this channel-level delivery gate. Historical and published scripts
remain unchanged.

## 2026-07-24 — Define the WHP lens at the mechanism level, not the vocabulary level

**Decision:** An episode satisfies the WHP brand lens when it makes a rule-system
legible — players, real goal, scored proxy, rewarded strategies, and consequences for
the players. Game or play vocabulary is never required, and a game or play metaphor
that does no explanatory work is a defect to cut, not brand fidelity.

**Rationale:** Martin questioned whether the rubric's "hidden game or the nature of
play" requirement would force game framing onto strong topics such as human–technology
intersections. Review of a generated Episode 1 script showed exactly that failure: a
decorative goalkeeper metaphor bolted on to satisfy the lens. `BRAND.md` already
defines hidden games through players, goals, rules, incentives, and strategies, so the
mechanism-level reading is a clarification of existing doctrine, and it preserves the
channel's differentiation against generic human-and-technology commentary.

**Documents:** `whp-youtube/STEERING.md` (Law 5),
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`
(dimension 10), and
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
(rapid quality check). `BRAND.md` remains unchanged because its existing lens
definition already operates at the mechanism level.

## 2026-07-24 — Close skill gaps: retention audit, Shorts-by-design, humor floor

**Decision:** The scripting skill defines the previously unspecified retention audit
(open-loop cadence roughly every 60–90 seconds of spoken time, explicit
thumbnail-promise payoff, 6–10 minute early-episode band, post-review diagnostic
only); every `FULL-SCRIPT` appendix includes a `Shorts plan` section with three to
five golden-nugget candidates carrying beat references, standalone three-second hooks,
and cut boundaries planned during scripting; and complete narrations sustain a humor
floor — each major beat lands at least one earned comic or surprising turn, with any
two-beat dry stretch reworked or reported as a deliberate sobriety exception.

**Rationale:** A skill review found the Phase 2 audit list naming a retention audit no
reference defined, Law 3 and Law 4 retention and Shorts mechanics living only in
STEERING where scoped operations never reread them, and humor governed entirely by
ceilings with the only comic requirement in the opening — biasing generated bodies
toward dry rigor exactly where retention sags. Martin accepted the proposed closures.

**Documents:** `.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`,
`.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`, and
this ledger. Validator enforcement of the `Shorts plan` section is deliberately
deferred; the structural validator continues to permit additional appendix sections.

## 2026-07-24 — Adopt the full best-friend register via concrete conversational moves

**Decision:** WHP narration uses the full best-friend register: a present first-person
narrator who reacts to the material, direct-address check-ins with immediate payoffs,
present-tense storytelling for documented cases, spoken transitions instead of outline
labels, everyday diction wherever the claim's scope survives, and natural rhythm with
fragments — composed as required per-beat moves, with invented autobiography still
forbidden and all evidence boundaries unchanged.

**Rationale:** Martin reviewed the regenerated Episode 1 prototype and found it did not
feel best-friend casual most of the time. Diagnosis: the draft was composed almost
entirely of polished aphorisms with no narrator presence, lecture-style transitions,
and research-register phrasing — the voice doctrine named the register but supplied no
concrete moves, while the readability gate pushed drafts toward compressed epigrams.
Martin chose the full best-friend option over a warm-conversational middle ground from
previewed alternatives.

**Documents:** `.agents/skills/writing-whp-youtube-scripts/SKILL.md` (conversational
moves recipe), `whp-youtube/STEERING.md` (Law 2 voice bullets),
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md` (rapid
quality check), and
`whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`
(narration rewritten in the adopted register).

## 2026-07-25 — Natural-spoken-register doctrine for narration

**Decision:** Narration is written for spoken delivery by a non-native presenter recording
while walking, for an audience including non-native listeners: every factual sentence is a
complete spoken clause (no colon-label fragments, no punctuation-dependent lines); clarity
and referent completeness outrank rhythm, compression, and humor; diction is plain
international English where widely understood conversational structures (e.g. "Yeah… no.")
remain allowed but decoding-heavy idioms and compressed metaphors do not; transitions
between evidence pieces voice the logical link in plain words; already-mainstream terms are
acknowledged rather than unveiled; the per-beat humor floor is replaced by an earned-humor
gate; claimed behaviors (people ask) are shown verbatim in that form.

**Rationale:** Martin reviewed beat 1 of the full prototype and found it unnatural for his
delivery context: over-compressed fragments dropped referents, "only the name changes"
misdescribed the manipulation, native-slang constructions excluded non-natives, a bare
"So:" pivot connected two studies without logic, sycophancy was unveiled as news despite
being mainstream (and already voiced in the script's own defense line), the doctorate
aphorism read as forced, and "we ask AI real things" showed no actual question. He
explicitly calibrated that widely understood conversational structures stay allowed.

**Documents:** `.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`references/rapid-prototyping.md`, `references/story-and-hook-method.md`,
`references/quality-rubric.md` (branch `feat/skill-natural-spoken-register`).

## 2026-07-25 — Episode 1 rebuilt on the four-moves architecture

**Decision:** Episode 1 ("Why AI Makes Bad Advice Feel Right") uses the rev-2
architecture: four explicitly named moves of one hidden game — menu (framing), agreement
(sycophancy), costume (fluency + algorithm appreciation), loop (anchoring + feedback) —
each section opening with its name card and closing with its counter-question; the promise
is identifying and countering the four moves; the Second-Opinion Test assembles the four
counters; the moves are framed as a co-produced game (first move is the viewer's), not as
AI techniques.

**Rationale:** Martin proposed using the four-phenomena division as the episode premise
with explicit per-section names for structure and hooks; the framing was adjusted from
"techniques" to "moves of a game" to avoid implying machine intent, since stage one is the
user's own move. Anchoring entered the architecture after the Gaube 2021 discussion
section (verified 2026-07-25) explained the radiologists' rating–performance dissociation.

**Documents:**
`whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md` (full
rewrite). Older beat structure in the same file superseded; architecture recorded in
conversation and the draft's planning notes.

## 2026-07-25 — Episode 1 exempt from the runtime window

**Decision:** Episode 1 carries no word or runtime constraint; the current 1,890-word
(~11–12 minute) narration stands, and the cut ledger becomes optional polish rather than
a required trim.

**Rationale:** Martin explicitly removed the constraint for this episode after reviewing
the four-moves rewrite. Scoped to Episode 1 only; the STEERING "target 6–10 minutes for
early episodes" law is unchanged as channel doctrine.

**Documents:** `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`
(planning notes updated); `whp-youtube/STEERING.md` deliberately unchanged.

## 2026-07-25 — Keep Script Creator Help alongside the active app

**Decision:** Script Creator Help is a labelled non-modal slide-over below the masthead
that moves focus inside on open, closes on Escape, restores focus to the Help button on
close, and leaves the masthead and routed page interactive without a focus trap or
full-page backdrop so its route-aware context can update during navigation.

**Rationale:** The modal drawer covered the right-aligned masthead navigation and trapped
focus, preventing the alongside-app navigation that the route-aware “On this page”
content is meant to support.

**Documents:** `docs/superpowers/plans/2026-07-25-script-creator-onboarding.md` and this
ledger. `BRAND.md`, `whp-youtube/STEERING.md`, and the accepted Script Creator
requirements and technical design remain unchanged because this decision corrects the
interaction contract of an existing internal workbench aid without changing brand,
editorial, or application architecture.

## 2026-07-25 — Script Studio favicon and page title

**Decision:** Script Studio's browser icon is a charcoal app-tile bearing three off-white
script lines cut by the WHP red editorial slash, shipped as a scalable `favicon.svg`
(preferred) with a multi-resolution `favicon.ico` (16/32/48) fallback and a 180px
`apple-touch-icon.png`; the app document title is set to "Script Studio".

**Rationale:** Martin asked for a distinctive Script Studio favicon. The accepted concept
reuses the established WHP mark language — charcoal bars / off-white ground / red slash,
palette `#323232` / `#f8f8f8` / `#aa0a0a` — rather than a generic default, and stays
legible at 16px where the previewed alternatives (umbrella-logo bars; a clapperboard)
were less specific or muddy at that size.

**Documents:** `script-creator/app/public/favicon.svg`, `favicon.ico`,
`apple-touch-icon.png`, and `script-creator/app/src/index.html` (committed separately).
`BRAND.md` and other steering remain unchanged because this applies existing brand
palette and mark doctrine to one app surface and sets no new brand rule.

## 2026-07-25 — Episode 1 beat 1 closes on its own lesson

**Decision:** In the Episode 1 prototype, beat 1 keeps the developed radiologist case but
acknowledges the hook's already-revealed result instead of re-revealing it, cuts the
goalkeeper plant sentence, voices the explicit lesson in place — suspicion by itself does
not change what you do; it needs a prepared question, and the four counter-questions are
those prepared questions — and leaves the real-AI question open; the Anthropic finding and
the sycophancy acknowledgment move into Move two, which now answers that question.

**Rationale:** Martin reviewed beat 1 as a long prelude with no tangible lesson at its
point of delivery, whose Anthropic passage instantly paid off the open question with a
fact the target viewer already owns. The rework keeps the radiologist case where the
anti-skip intro contract requires it and where three later callbacks depend on it, but
states its lesson explicitly inside beat 1 and relocates the Anthropic evidence to the
move it actually supports. A "Trick" rename for "Move" was discussed and not adopted; the
four-moves game naming stands.

**Documents:** `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`
(narration and planning notes, branch `episode-01-beat1-rework`) and this ledger.
`BRAND.md` and `whp-youtube/STEERING.md` remain unchanged because this applies existing
narration doctrine inside one episode artifact and sets no channel rule; the separate
canonical Episode 1 launch-sequence conflict noted on 2026-07-24 stays open.

## 2026-07-25 — Pre-draft phase for fast script iteration

**Decision:** Scripts under `whp-youtube/predrafts/` are pre-drafts: creative iteration
there runs without the spoken-readability gate, word counts, planning-notes upkeep,
editorial audits, or per-edit reconciliation, while the factual boundary and the
architecture approval gate still apply; a pre-draft is promoted when Martin says it is
ready, by running the readability gate, refreshing the planning-notes appendix, moving
the file to `whp-youtube/drafts/`, and reconciling the promotion as one definite
decision. The phase is marked by the directory path, not an in-file status marker, and
the Episode 1 prototype is demoted to pre-draft for its remaining creative review.

**Rationale:** Martin reviewed the beat-1 rework turnaround and found per-edit gates and
reconciliation too slow for creative iteration; he asked for a phase where iteration is
fast and checks run once at the boundary, and chose the directory mechanism and the
immediate Episode 1 demotion from presented options.

**Documents:** `.agents/skills/writing-whp-youtube-scripts/SKILL.md` (Phase 0 and gate
conditional), `.agents/skills/reconcile-whp/SKILL.md` (decision-trigger exclusion),
`CLAUDE.md`, `AGENTS.md`, and this ledger (branch `process/pre-draft-phase`).
`BRAND.md` and `whp-youtube/STEERING.md` remain unchanged because the phase is workflow
mechanics inside the script skill, not brand or channel doctrine. The Episode 1 file
move happens on branch `episode-01-beat1-rework`, where its current content lives.

## 2026-07-25 — Episode 1 pre-draft round merged and promoted back to draft

**Decision:** The Episode 1 prototype absorbs the inline-approved pre-draft round — the
rate-my-plan cameo and a two-answers-one-pick training-loop explainer in Move two; the
Osorno color-contrast stimulus example in Move three; the algorithm-appreciation
boundary stated up front on unfamiliar-topic questions, replacing the radiologist
objection check-in; a marketing price-tag anchor with the "AI's answer is your first
price tag" bridge in Move four; a face-loop passage rewritten to voice the loop
closing; and a beat-7 transfer montage of human players (politicians, salespeople, an
insurance agent) without a best-friend line — and the file is promoted from
`whp-youtube/predrafts/` back to `whp-youtube/drafts/` after passing the
spoken-readability gate (264 sentences; approximately 2,270 spoken words).

**Rationale:** Martin approved each passage inline during pre-draft iteration and
requested the merge and promotion. He dropped the friend line to keep the outro warm,
and declined the RLHF name-drop and a residual radiologist nod in favor of plain
description; the montage judges behaviors rather than calling professions scams, and
the boundary front-loading prevents the radiologist contradiction instead of defusing
it.

**Documents:** `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`
(content, planning notes, and the move from `predrafts/`) and this ledger. `BRAND.md`
and `whp-youtube/STEERING.md` remain unchanged because every change is episode-internal
narration under existing doctrine. New Phase 2 verification items are recorded in the
draft's status notes (Osorno stimulus check; F-001 mapping for the training-loop and
cameo passages).

## 2026-07-25 — Episode 1 promoted to evidence-backed full episode (Phase 2)

**Decision:** The approved Episode 1 prototype is finalized as the Phase 2 annotated
full episode at `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`
(version 2.0, EDITORIAL-DRAFT, 2,276 spoken words, ≈13:45): rev-2 four-moves narration
with eight verified evidence records — a new F-009 record for the Gaube 2021 radiologist
study, F-001 extended to cover the RLHF/pairwise-preference training description and the
feedback-sycophancy support for the rate-my-plan cameo, and F-004 extended with the
verified "Osorno is in Chile" stimulus — plus per-beat claims maps, original-graphics
visual treatments, a Shorts plan, and an issue ledger. Personal input is OMIT (Martin,
2026-07-25). Two evidence-driven narration narrowings: the radiologists are now said to
come "from hospitals in the US and Canada" (the research team was international; the
participants were recruited in those countries), and the framing-effect line restores
"can change." F-002 (GPT-4o rollback) is unused by this narration and its record is not
carried; the ID stays retired.

**Rationale:** Martin explicitly requested promotion to the full episode, which the
skill treats as directly requesting evidence-backed finalization. He chose OMIT for the
personal sequence. All structural gates pass (validator; spoken-readability, 264
sentences); the post-review audits deliberately wait for Martin's review of the complete
deliverable per the skill's ordering.

**Documents:** `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`
(overwritten from the superseded pre-rev-2 v0.9, preserved in git history) and this
ledger. `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`
remains as the prototype record. `BRAND.md` and `whp-youtube/STEERING.md` unchanged; the
canonical Episode 1 launch-sequence conflict (2026-07-24) remains open and is carried in
the episode's issue ledger.

## 2026-07-26 — Walking-vlog chat register and locked-line delivery format

**Decision:** WHP narration adopts the walking-vlog peer-investigator register: the
five-move anti-skip intro voices the defense as the narrator's own former position
(`intriguing question → narrator's former defense → evidence that overturned it → early
remedy promise → real case`); narration threads varied mini-hook connectives roughly
every ten to twenty spoken seconds; texture quantities are spoken as truthful
conversational magnitudes while claim-carrying numbers, small counts, dates, places, and
institutions stay exact (precise figures remain in the claim record); the learning
promise is voiced as sharing while staying literal, specific, and evidence-bounded;
narrator research-process claims are allowed when the work actually happened for the
episode; the narrator is never smarter than the viewer (self-mockery targets his own
former take); and complete scripts mark locked lines in bold (word-perfect delivery —
opening question, promise, punchlines, exact lessons, paraphrase-fragile evidence
wording) with everything unmarked as flexible tissue Martin may say his own way, because
he delivers from memory while walking.

**Rationale:** Martin judged the prior register too polished-presenter for the walking
format after reviewing narrator-coaching advice: the script must sound like a
super-knowledgeable friend — "one of you, I just did more digging" — never arrogant,
with the facts kept but delivered jovially; and since there is no teleprompter on a
walk, a fully verbatim script would sound recited, so only load-bearing lines are locked.

**Documents:** `.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`references/rapid-prototyping.md`, `references/story-and-hook-method.md`,
`references/annotated-script-format.md`, `scripts/check_spoken_readability.py` (+ its
test), `scripts/test_skill_package.py` (contract pins), `whp-youtube/STEERING.md`, and
this ledger. `BRAND.md` unchanged (its mode "registers" concern content form, not
delivery voice). Episode scripts are not restyled by this entry; the Episode 1 register
reformat is tracked as its own follow-on work.

## 2026-07-26 — Reward-hacking EP1 retired; four-moves episode is canonical Episode 1

**Decision:** Martin removed the reward-hacking Episode 1 ("Why AI cheats even when it
follows every rule"): `whp-youtube/episodes/01-why-ai-cheats.md` is deleted (preserved in
git history), and `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md` is the
canonical Episode 1 in the launch sequence. This closes the canonical Episode 1
launch-sequence conflict opened on 2026-07-24.

**Rationale:** Direct instruction from Martin while merging the walking-vlog register
work; the four-moves episode is the promoted, evidence-backed script actually in
refinement.

**Documents:** `whp-youtube/STEERING.md` (launch-sequence slot 1 and the Episode 1
working-state note), `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`
(issue ledger entry closed), `whp-youtube/episodes/01-why-ai-cheats.md` (deleted), and
this ledger. Dated planning and spec docs under `docs/superpowers/` that reference the
retired concept stay unchanged as historical records; earlier ledger entries noting the
conflict as open remain historical.

## 2026-07-26 — Investigation-challenge bridges become a standard storytelling move

**Decision:** WHP scripts may voice an evidence handoff as an investigation challenge —
an obstacle the narrator hit while digging, resolved by the next evidence — and must
name an apparent contradiction between findings as a challenge resolved inside the
evidence scopes rather than sailing past it. The challenge must be epistemically real,
never manufactured drama or an invented personal event; the move is reserved for bridges
where the gap genuinely threatens the emerging story, phrasings vary within a script,
and every use is named in the production appendix's story-function entry so placement
stays traceable.

**Rationale:** Martin heard about the present-a-challenge storytelling technique and
approved three concrete Episode 1 examples; the move compounds with the walking-vlog
peer-investigator register (the but/therefore rule on the evidence chain) while the
honesty guardrail keeps it inside the rigor covenant.

**Documents:** `.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`references/rapid-prototyping.md`, `references/annotated-script-format.md`,
`scripts/test_skill_package.py` (new contract pin), `whp-youtube/STEERING.md`, and this
ledger. Episode 1's three approved bridge passages are applied in a separate content
commit.

## 2026-07-27 — Supporting narrative throughlines are optional story sidecars

**Decision:** WHP calls a recurring relatable case a **supporting narrative
throughline**, not a core thread: the episode's argument remains the spine while the
throughline runs beside it as an optional sidecar. Use one only when a person or situation
offers an understandable goal, a real obstacle, at least three non-repetitive returns, and
an earned payoff. Every return must add information or change meaning, the case may not
stand in for separate mechanism evidence, and the production appendix records its status
and beat-by-beat roles or explains why no candidate earned the role.

**Rationale:** Martin clarified that the recurring case is not the center of the story.
“Narrative throughline” is therefore more accurate than “core thread,” and making it
optional prevents the sidecar from displacing the episode's explanatory argument.

**Documents:** `whp-youtube/STEERING.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`references/story-and-hook-method.md`, `references/rapid-prototyping.md`,
`references/annotated-script-format.md`, `references/quality-rubric.md`,
`assets/annotated-script-template.md`, `scripts/test_skill_package.py`, and this ledger.
`BRAND.md` remains unchanged because this is YouTube story-construction doctrine, not a
change to the umbrella brand. Episode 1's pre-draft implementation remains brainstorming
until promotion.

## 2026-07-27 — Explicit walking-vlog pre-drafts get a memory-first delivery gate

**Decision:** When Martin explicitly requests a walking-vlog, walk-and-talk,
from-memory, or no-teleprompter pre-draft, WHP runs a focused memory-first delivery pass
before presenting it instead of waiting for draft promotion. Source accuracy and spoken
reproducibility remain separate decisions. Mechanical findings for exact participant
counts and substantial quotations are review-only prompts: a deliberate, documented
spoken treatment remains a human editorial judgment, never an automatic rewrite or
factual approval. Detailed execution lives only in [the rapid memory-first
owner](.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md#run-the-memory-first-walking-vlog-pass).

**Rationale:** Martin identified two regressions in an Episode 1 pre-draft: the narration
said `138 radiologists` while dropping the easier and more credible 2021 US-and-Canada
anchor, and it reproduced a documented technical medical question that would be hard to
recall naturally on a walk. Predraft status can defer production audits, but it cannot
defer an explicitly requested delivery format.

**Documents:** `.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/check_spoken_readability.py` and its
tests, `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`whp-youtube/STEERING.md`, and this ledger. `BRAND.md` remains unchanged because this is
YouTube delivery doctrine. The Episode 1 pre-draft remains brainstorming until promotion.

## 2026-07-27 — Storytelling techniques shape structure before narration

**Decision:** WHP treats storytelling-technique selection as the default visible
story-structure gate after intellectual architecture approval and before beat ordering or
narration. One effect-based trigger applies across pre-draft, rapid-prototype, and
production work: a new episode, thesis-level rethink, or any request that would set or
materially change the causal route from opening tension through the insight ladder to the
final payoff must pass the gate. Scoped work returns directly until it crosses that trigger.
For an episode-scale pre-draft, the workflow stops first at architecture and then at
progression; the approved plan is a creative baseline, while promotion remains the
reconcilable pre-draft decision.

The plan inventories the moves genuinely available in the material—such as obstacles,
reversals, contradictions, investigation challenges, causal consequences, proof handoffs,
loops and payoffs, callbacks, humor, and an optional supporting throughline—then uses them
to shape the progression. Major handoffs are tested with But / Therefore rather than
accepted as an “and then” sequence; this is a causal planning test, not a requirement to say
those exact words or to force a technique. Technique rows cover selected moves and only
notable rejections, with `NONE` when no move or throughline is earned. The plan reuses
architecture evidence rows instead of creating a second evidence record, and any new
load-bearing material or architecture defect returns to architecture approval.

`references/story-and-hook-method.md` is the single detailed owner of this method. The core
skill owns the trigger, gate, and routing; the architecture method hands off to it; the
rapid method consumes the approved plan; the annotated format preserves a compact approved
record; and the rubric audits the result without penalizing legacy or scoped artifacts that
have no plan in scope. Package tests verify ownership and phase consumption instead of
requiring verbatim copies of detailed guidance. The visible artifact contains a
one-sentence story engine, a story-material inventory, selected techniques and notable
rejections, addressable beat-progression blocks with But and Therefore fields, a full
causal-chain read, beat-referenced retention and global loop/payoff checks, short non-final
bridge seeds, evidence boundaries, an anti-shoehorn check, and approval metadata.

Positive feedback on one move does not approve the whole artifact. Explicit approval—or a
direct instruction to draft from the displayed complete plan—makes it the visible story
baseline. A missing visible plan means the progression is unapproved; later evidence may
narrow a claim but may not silently replace the progression. Story-progression approval
precedes and does not replace approval of the complete narration and creative direction.

**Rationale:** Martin wants retention-bearing story progression designed beforehand,
instead of adding storytelling devices to completed prose. A real research obstacle may
be voiced naturally—for example, “But that seemed impossible, because…”—without inventing
an “I almost gave up” event or shoehorning drama where the material does not support it.
Keeping one detailed owner fixes the observed maintenance drift without adding another
overlapping story reference.

**Documents:** The writing-skill implementation follows the approved design in
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`,
`.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`whp-youtube/STEERING.md`, and the synthetic dry-run record at
`docs/superpowers/evidence/2026-07-27-whp-story-progression-gate.md`. The accepted design
and implementation plan remain at
`docs/superpowers/specs/2026-07-27-whp-story-progression-planning-design.md` and
`docs/superpowers/plans/2026-07-27-whp-story-progression-planning.md`. `BRAND.md` remains
unchanged because this refines YouTube story-planning workflow rather than umbrella
doctrine. The current Episode 1 pre-draft and walking-vlog regression plan remain separate.

## 2026-07-27 — Rebuild Episode 1 around a counterfeit second opinion

**Decision:** Episode 1 will be rebuilt from an approved intellectual architecture that
retains framing, sycophantic agreement, fluent machine authority, anchoring or feedback,
the borrowed-authority loop, and the Second-Opinion Test while treating the prior story
order, examples, evidence sequence, and supporting throughline as replaceable; its earned
reframe is that a second opinion requires an independent route to a checkable conclusion,
and the architecture's listed search-budget gaps are deferred to the later evidence phase.

**Rationale:** Martin asked to recreate Episode 1 with the new storytelling-first workflow,
chose to preserve only the intellectual core, selected the counterfeit-second-opinion
direction, and approved the complete architecture and its deferred discovery boundary.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`,
`docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md` (marked superseded for
future story development), and this ledger. `BRAND.md` remains unchanged because the
decision refines one episode rather than umbrella doctrine. The canonical Episode 1 and
its medical-sidecar pre-draft remain unchanged because no replacement progression or
narration has been approved.

## 2026-07-27 — Keep the Episode 1 rebuild in a separate v2 file

**Decision:** The rebuilt Episode 1 narration will be created at
`whp-youtube/predrafts/ep1_v2.md` and will not replace the existing canonical Episode 1
file.

**Rationale:** Martin explicitly requested an `ep1_v2` file and asked to preserve the old
episode.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`, and this ledger.
The existing canonical Episode 1 and medical-sidecar pre-draft remain unchanged.

## 2026-07-28 — Require a specific human nerve before mechanism and packaging

**Decision:** Treat every raw WHP subject as search territory rather than an angle; select
the strongest evidence-supported specific human nerve or shared tension before choosing
the mechanism, title, opening, or story, and require the delivered evidence and payoff to
fully satisfy that personal promise without clickbait. Keep the complete method in one
subject-to-angle owner and make every other active workflow route to or consume it instead
of duplicating it.

**Rationale:** The existing painpoint-first language still allowed `Popularity` to become
an abstract taste-autonomy title built around social proof. Martin identified the missing
standard: research what people are most fascinated or troubled by, find the deepest
specific fear, desire, dilemma, identity stake, or fascination, and make the concrete nerve
drive the angle. A second pass succeeded by framing popularity around the belonging fear
“Am I less wanted than everyone around me?” The recent story-guidance cleanup also
established that one detailed owner is necessary to prevent future drift.

**Documents:** `whp-youtube/STEERING.md`,
`docs/steering/whp-video-topic-skill.md`,
`.agents/skills/choosing-whp-video-topic/SKILL.md`,
`.agents/skills/choosing-whp-video-topic/references/research-method.md`,
`.agents/skills/choosing-whp-video-topic/references/run-progress-transport.md`,
`.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`script-creator/server/src/operations/progress.ts`,
`script-creator/app/src/app/topics/inputs.ts`,
`docs/superpowers/specs/2026-07-28-whp-human-nerve-angle-gate-design.md`,
`docs/superpowers/plans/2026-07-28-whp-human-nerve-angle-gate.md`, and the RED/GREEN record
at `docs/superpowers/evidence/2026-07-28-whp-human-nerve-angle-gate.md`. `BRAND.md` remains
unchanged because this refines YouTube angle-selection workflow rather than umbrella
doctrine. Episode 1 files remain unchanged.

## 2026-07-28 — Build Episode 1 V2 around the medical decision nerve

**Decision:** Draft `whp-youtube/predrafts/ep1_v2.md` under the title *Could AI Talk You
Into the Dumbest Decision of Your Life?* from the approved medical-case-first SP01–SP08
progression. The documented Swiss TIA case carries the personal stakes and recurring
meaning, while separate studies retain the proof jobs for framing, sycophancy, fluent
authority, and feedback. The existing Episode 1 remains canonical and untouched.

**Rationale:** Martin approved the specific fear that a calm, intelligent answer can make
a dangerous preferred choice feel rational, accepted the medical-case-first architecture,
and then approved the complete progression for drafting. This corrects the earlier
abstract-study-first drift without turning the case into proof of the broader mechanism or
making a clickbait promise the evidence cannot fulfill.

**Documents:** `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`,
`docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`, and this ledger.
`BRAND.md` remains unchanged because this is one episode's packaging and story route.
The canonical Episode 1 and the earlier medical-sidecar pre-draft remain unchanged; the
new V2 narration is still a non-canonical pre-draft until separately promoted.

## 2026-07-28 — Make WHP pre-drafts intro-first

**Decision:** An episode-scale file under `whp-youtube/predrafts/` now contains a polished
spoken intro and a bullet-only body logic map, not complete body narration. Intro design
must consider every applicable evidence-earned storytelling and hook method before prose,
map every opening promise and loop to a named body payoff, and reconcile a read-only
review from the strongest callable local AI independent of the drafting model. Failure to
reach an independent reviewer leaves the artifact `REVIEW-BLOCKED`. Complete narration
moves to `whp-youtube/drafts/` only after Martin explicitly approves both the intro and
body map.

**Rationale:** The Episode 1 training pass showed that the opening needs disproportionate
creative effort: immediate personal value, a natural problem-to-case bridge, anticipated
defense, evidence-backed disarm, early remedy, earned stake escalation, mini-hooks, and
walking-conversation flow. Drafting the whole episode too early hid weak intro choices and
encouraged techniques to be added after the structure rather than shaping it. A single
detailed owner plus regression tests prevents the pre-draft shape, reviewer selection, or
promise-delivery boundary from drifting across workflow documents.

**Documents:** `.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/predraft-intro-workflow.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`,
`docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`, and this ledger.
The RED/GREEN and independent-review record is
`docs/superpowers/evidence/2026-07-28-whp-intro-first-predraft-gate.md`.
`BRAND.md` remains unchanged because this is a YouTube drafting-stage workflow decision,
not umbrella brand doctrine. The existing `predrafts/ep1_v2.md` full narration remains
preserved and explicitly migration-pending as pre-workflow working material; the new
Episode 1 Phase 0 artifact will use `predrafts/ep1_v2-intro-first.md`, preventing the
workflow from overwriting or blessing the legacy narration.

## 2026-07-28 — Retire the mandatory AI review from WHP pre-drafts

**Decision:** Phase 0 no longer requires an independent local-AI review, reviewer record,
or `REVIEW-BLOCKED` state. Do not call another model for a pre-draft unless Martin
explicitly requests it for that artifact. The polished intro, bullet-only body logic map,
deterministic contract checks, and Martin's explicit approval remain the pre-draft gate.
This decision supersedes only the reviewer requirement in the earlier intro-first
decision; the intro-first artifact shape and approval boundary remain active.

**Rationale:** The required Opus pass did not catch the rushed, disconnected transitions
in the Episode 1 intro and added a process step without useful editorial signal. The same
iteration clarified the actual pacing rule: move through the opening jobs as soon as the
conversation logically allows, but never faster than the referents and transitions that
make each next beat feel earned.

**Documents:** `.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/predraft-intro-workflow.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`,
`docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`,
`docs/superpowers/evidence/2026-07-28-whp-intro-first-predraft-gate.md`,
`whp-youtube/predrafts/ep1_v2-intro-first.md`, and this ledger. `BRAND.md` remains
unchanged because this is a drafting-stage workflow correction, not umbrella brand
doctrine.

## 2026-07-28 — Put every retention device inside natural conversation

**Decision:** Natural conversational causality is the governing gate for WHP narration;
story structure, hooks, mini-hooks, loops, and other retention devices remain subordinate
to it. Mini-hooks may appear in either the intro or body when they truthfully connect the
current thought to content paid off immediately, but they are never inserted to meet a
cadence. Longer loops have no fixed count or timing quota: use only trackable,
evidence-earned questions with exact mapped payoffs, and never withhold prerequisite
clarity to manufacture suspense.

The rapid drafting reference is the sole detailed owner for line-level natural-package,
hook, and mini-hook execution. The story-and-hook reference is the sole detailed owner for
loop selection, tracking, and payoff. The core skill, intro-first workflow, quality rubric,
and STEERING route to those owners instead of restating their detailed contracts. This
supersedes the fixed mini-hook and open-loop cadence requirements in the 2026-07-24
retention-audit decision and the temporary instruction to reserve most mini-hooks for the
body. It preserves the post-review retention audit, anti-skip intro jobs, intro-first
workflow, and promise-to-payoff requirement.

**Rationale:** The Episode 1 training pass showed that a script can satisfy every selected
hook job and still sound like a rushed advertisement when referents or causal transitions
are removed. It also showed that mini-hooks themselves are not the problem: a specific
mini-hook can be the most natural conversational bridge. Fixed cadence rules encouraged
generic curiosity language and made agents optimize device frequency instead of the
progression of thought. Separating line-level and structural ownership prevents the new
rule from being copied into conflicting variants later.

**Documents:** `.agents/skills/writing-whp-youtube-scripts/SKILL.md`,
`.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`,
`.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`,
`.agents/skills/writing-whp-youtube-scripts/references/predraft-intro-workflow.md`,
`.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`,
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`,
`whp-youtube/STEERING.md`, `whp-youtube/predrafts/ep1_v2-intro-first.md`,
`docs/superpowers/evidence/2026-07-28-whp-intro-first-predraft-gate.md`, and this
ledger. `BRAND.md` remains unchanged because this is YouTube narration workflow doctrine,
not an umbrella-brand change.

## 2026-07-28 — Store active episode stages as paired artifacts

**Decision:** Every active numbered episode lives under
`whp-youtube/episodes/epNNN-name/`, with each reached `blueprint/`, `draft/`, or `final/`
stage represented by a paired `script.raw.md` and `script.extended.md`. The raw file is
the source of truth for spoken wording, paragraph and beat order, and storytelling
markup. The extended file mirrors that script exactly, adding grouped purpose annotations
and the appendix required by its stage. Underline marks main hooks, major loops, and
central obstacles; italics mark supporting storytelling devices, including mini-hooks;
bold marks locked wording.

This entry supersedes active pre-draft terminology and loose episode paths. It does not
rewrite historical decisions, specs, plans, evidence records, or archived artifacts that
accurately record the workflow in effect when they were created.

**Rationale:** A stable episode-first directory keeps each production stage, its
annotation view, and its historical inputs together. One raw source of truth prevents
spoken wording or storytelling markup from drifting between editorial and production
views, while stage-specific appendices preserve the planning and validation context
without polluting the narration.

**Documents:** The detailed owner is
`.agents/skills/writing-whp-youtube-scripts/references/script-artifact-pair.md`. The
validators are
`.agents/skills/writing-whp-youtube-scripts/scripts/validate_script_pair.py`,
`.agents/skills/writing-whp-youtube-scripts/scripts/validate_spoken_readability.py`, and
`.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`, with
regressions in
`.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`. Episode 1
uses `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/` for its current Script
Blueprint pair,
`whp-youtube/episodes/ep001-ai-dangerous-advice/final/` for its canonical production
pair, and `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/` for superseded loose
artifacts. Active routing and baselines live in `whp-youtube/STEERING.md`,
`docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`, and
`docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`. The historical
RED/GREEN record plus later migration note remains at
`docs/superpowers/evidence/2026-07-28-whp-intro-first-predraft-gate.md`. `BRAND.md`
remains unchanged because this is a YouTube script-artifact contract, not umbrella-brand
doctrine.

## 2026-07-29 — EP2 job-interviews premise rejected; slot reopened

**Decision:** The accepted launch sequence's EP2 episode (*What job interviews actually
test*) is rejected and the EP2 slot reopened.

**Rationale:** During hook development Martin judged the premise too weak and vague for
the target audience: the intended viewers already hold the settled cynical model
("interviews are theater"), so the episode's reversal carried no unclosable curiosity
gap. The session also produced a four-test first-sentence rubric (viewer in the
sentence; unclosable gap; edge placement against the held belief; in-sentence stakes,
no hedges) that the premise's best openings failed.

**Documents:** `whp-youtube/STEERING.md` (launch sequence EP2 entry), `BRAND.md`
(downstream sequence note). Historical research and proposals remain unchanged as
historical inputs.

## 2026-07-29 — Sports-betting episode parked with architecture preserved

**Decision:** The developed premise *The book that bets on you* (sportsbook as sorting
machine) is parked at Martin's request; its complete unapproved Architecture artifact is
preserved at `whp-youtube/drafts/parked-betting-on-you-architecture.md`.

**Rationale:** Martin liked the premise but identified the topic as personally
sensitive; parked rather than rejected so the material stays available for future
re-ranking.

**Documents:** `whp-youtube/drafts/parked-betting-on-you-architecture.md` (new, parked),
`whp-youtube/STEERING.md` (EP2 entry notes the parking), `whp-youtube/topic-backlog.md`
(listed under recently closed).

## 2026-07-29 — Ten-candidate topic backlog adopted; self-handicapping front-runner

**Decision:** A ten-candidate topic backlog is adopted as active working material at
`whp-youtube/topic-backlog.md`; *Why you didn't study* (self-handicapping, Berglas &
Jones 1978) is recorded as the front-runner for the open EP2 slot, explicitly not yet
selected.

**Rationale:** Candidates were developed under the four-test hook rubric with verified
proof-case source leads (search-verified at ideation depth; full verification remains
Final-stage work). Martin accepted the whole list ("I like them all") and named the
self-handicapping candidate as the one he liked most.

**Documents:** `whp-youtube/topic-backlog.md` (new), `whp-youtube/STEERING.md` (EP2
entry points at the backlog and front-runner), `BRAND.md` (sequence note points at the
backlog).

## 2026-07-29 — EP2 selected: Why you didn't study (self-handicapping)

**Decision:** *Why you didn't study* (self-handicapping, anchored in Berglas & Jones
1978) is selected as EP2 and enters the episode pipeline at the Architecture stage.

**Rationale:** Martin's explicit selection from the adopted ten-candidate backlog; it
was already the recorded front-runner. The Architecture run doubles as the field test
for the proposed mine-and-kill-test connection process before any skill amendment.

**Documents:** `whp-youtube/STEERING.md` (EP2 entry), `whp-youtube/topic-backlog.md`
(candidate marked selected).
