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