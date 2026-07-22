# WHP Script Creator — Business Requirements

**Date:** 2026-07-22
**Status:** Accepted — V1 scope decided; technical design deferred
**Scope:** Local script-ideation and editing app ("Script Creator") for the WHP editorial workflow

## 1. Purpose

A **local desktop UI over the local agent** that takes a WHP episode from "no idea" to an
approved, production-ready script without Martin hand-editing Markdown or driving
everything through raw chat. It orchestrates the two existing skills — topic selection
(`choosing-whp-video-topic`) and script writing (`writing-whp-youtube-scripts`) — and adds
what chat cannot give: visual selection-scoped editing, side-by-side variations, revision
history, pipeline state, and progress visibility over long agent runs.

**What it is not:** a second editorial brain. All editorial intelligence stays in the
skills; the app supplies UI state, selections, history, and orchestration (the boundary
`whp-youtube/STEERING.md` already mandates). It is an internal authoring tool, not a WHP
portfolio product.

## 2. Problem it solves (observed in the project record)

- The evidence-first pilot workflow was rigorous but slow and creatively flat; rapid
  line-level iteration produced the strong voice (per the rapid script prototyping
  design). Chat iteration works, but selections, alternatives, and "change only this
  passage" are clumsy to express in text.
- Topic selection is a heavy multi-stage research protocol (30+ subjects, six gates,
  100-point scorecard, packaging tests) with no progress visibility or browsable output
  today.
- Artifacts live as repo Markdown with strict formats (beats, `F-###`/`A-###` ledgers,
  `PI-###` blocks); editing them safely by hand is error-prone.
- Iteration telemetry (time and tokens per operation) is specified in the script skill but
  has nowhere to be captured.

## 3. User and context

Single user: Martin — solo creator, presenter, and developer. Runs entirely locally
inside this repository, using the already-authenticated local agent. The chat-based
workflow must keep working in parallel: the skills stay unchanged and independently
invocable.

## 4. Hard constraints (inherited from project doctrine)

1. **Skills own editorial rules; the app never duplicates them** into a second prompt
   system that can drift.
2. **The topic skill owns topic comparison and selection; the script skill owns narration
   onward**, receiving a selected topic brief.
3. **Approved artifacts are portable repo Markdown** — the source of truth. App-local
   state only for ephemeral UI (selections, in-flight variants, view state).
4. **Explicit human gates:** creative approval (premise, voice, hook, story direction)
   precedes Phase 2; `RECORD-READY` is never self-promoted by the app or agent.
5. **Rapid mode never fabricates facts** — the app must surface the factual boundary
   (supplied anchors versus unknowns), not hide it.
6. **Stack decisions deferred:** this document defines capabilities, not framework,
   persistence, transport, or data contracts.
7. **Lean scope** — must not displace Apexwit launch priorities.

## 5. Functional requirements

### FR-1 — Topic Studio (brainstorm and evaluate)

- **FR-1.1 Idea inbox.** Capture raw sparks (a sentence, a link, a fact) at any time;
  each becomes a candidate seed the agent can later expand into proper angles.
- **FR-1.2 Brainstorm canvas.** Free-form ideation session with the agent that yields
  structured subject/angle cards instead of a lost chat transcript.
- **FR-1.3 Quick gate-check.** Evaluate a single idea cheaply: run the six hard gates
  (game/play centrality, human revelation, recognized payoff, evidence path, production
  reality, portfolio fit) and return pass/fail/unknown with reasons — minutes, not hours.
- **FR-1.4 Full selection run.** Launch the complete `choosing-whp-video-topic` protocol
  with live progress against its required checklist (30+ subjects → gates → 8–12
  survivors → ~5 finalists → packaging tests → winner), running in the background with a
  completion notification.
- **FR-1.5 Candidate board.** Browse the run's output: sortable and filterable cards with
  gate chips, the seven scorecard criteria with evidence grades, confidence, and decisive
  risk; side-by-side finalist comparison.
- **FR-1.6 Package tester.** Workspace for title/thumbnail promises: generate and keep
  15–20 title candidates per episode (Law 1), the three-directions-per-finalist stress
  test, and the surviving direction — with history of what was tried.
- **FR-1.7 Topic brief handoff.** One click on the winner produces the structured
  selected-topic brief (topic and angle, audience, package promise, tension, by-end
  promise, payoff, factual anchors, unknowns) and opens the Script Studio with it — the
  handoff contract the skills already define.
- **FR-1.8 Pipeline board.** The episode backlog as a kanban: idea → candidate → selected
  → prototyping → creative-approved → production → record-ready → recorded → published;
  shows the accepted EP1–EP4 sequence and parked drafts.

### FR-2 — Script Studio (generate and refine)

- **FR-2.1 Structure first.** Generate and edit a beat outline before narration; reorder
  beats by drag; the agent re-stitches transitions on request.
- **FR-2.2 Rapid prototype generation.** One-click Phase 1 narration draft from the topic
  brief — fast, no research overhead, honoring the rapid-prototyping method.
- **FR-2.3 Scoped regeneration.** Regenerate any unit (hook, beat, transition, ending)
  without touching the rest — the skill's "change only the requested scope" rule made
  visible.
- **FR-2.4 Hook workbench.** A dedicated first-30-seconds mode showing the hook spine
  (`event → joke → paradox → meaning → consequential question → viewer relevance → by-end
  promise`), with per-element status and quick alternatives — because Law 2 says the
  video is won or lost here.
- **FR-2.5 Factual boundary panel.** Always-visible list of supplied factual anchors and
  open unknowns; Martin can drop new facts and links in mid-session ("fact inbox") for
  the agent to use; passages written *around* missing facts are markable for the evidence
  phase.
- **FR-2.6 Mechanical metrics (app-side).** Live word count, estimated runtime
  (configurable words per minute), per-beat time targets, and a pacing bar with retention
  checkpoints (0:15, 0:30, 60–90s loop cadence). Mechanical only — editorial judgment
  always goes through the skill's Review operation.
- **FR-2.7 Read-aloud support.** Local text-to-speech playback of clean narration to hear
  rhythm before recording; "write for speech" is a core tenet. *(Deferred beyond V1 —
  see §6.)*

### FR-3 — Selection-scoped editing (must-have)

Select any text → a popup offers actions, each mapping to a skill operation with the
selection, its surrounding context, and its narrative job passed explicitly:

- **FR-3.1 Quick transforms** (Rewrite selection): shorten / tighten · expand the
  explanation · add a concrete example · add humor (mechanism-derived) · simplify to
  plain speech · punch up · make it land aloud.
- **FR-3.2 Review this.** Findings only, no rewrite — diagnoses tied to the selection's
  narrative job, shown as margin annotations.
- **FR-3.3 Custom instruction.** Free-text instruction scoped to the selection.
- **FR-3.4 Generate alternatives.** N distinct labeled options for the selection's job
  (feeds FR-4).
- **FR-3.5 Approve / lock.** Mark a passage as accepted language — visually distinct and
  excluded from any later agent rewrite unless explicitly unlocked (enforces "preserve
  accepted language").
- **FR-3.6 Flag for evidence.** Mark a claim "verify in Phase 2" without breaking
  creative flow; lands in the unknowns list.
- **FR-3.7 Preset management.** Martin can add his own recurring instructions as popup
  presets; keyboard-first operation throughout.
- **FR-3.8 Proposed-edit review.** Every agent edit arrives as an inline proposal (diff
  against current text) that Martin accepts, rejects, or re-rolls — never a silent
  overwrite.

### FR-4 — Variations (must-have)

- **FR-4.1 Variant blocks are first-class.** A draft can contain passages with 2–3
  labeled variants (generated proactively by the agent or on demand); the UI renders them
  as switchable inline options.
- **FR-4.2 Compare and pick.** Toggle variants in place (see each in full context), view
  side-by-side, and pick the winner; a draft with unresolved variant blocks is visibly
  "not settled."
- **FR-4.3 Mix.** Take a line from variant B into variant A; ask the agent to merge the
  best of two.
- **FR-4.4 Nothing is lost.** Losing variants and cut passages go to a per-episode
  parking lot — recoverable, and a natural seed pool for Shorts hooks.
- **FR-4.5 Trade-off notes on request.** Ask the agent (Review) to explain what each
  variant does differently before choosing.

### FR-5 — Creative approval gate and promotion

- **FR-5.1 Explicit gate control.** A deliberate "approve premise / voice / hook / story
  direction" action — distinct from passage-level approval, mirroring the skill rule that
  liking one line approves nothing.
- **FR-5.2 Promote.** On approval: freeze the prototype as the voice baseline, snapshot
  it, and launch Phase 2 (claim extraction → evidence → production annotation) with
  progress visibility.
- **FR-5.3 Decision hygiene.** Definite decisions made in-app (topic selected, creative
  approval) prompt the `reconcile-whp` flow so `DECISIONS.md` and steering stay in sync.

### FR-6 — Production phase support (Phase 2)

- **FR-6.1 Annotated view.** Render the annotated script format properly: beats with
  collapsible production subsections, clean-narration toggle.
- **FR-6.2 Claims board.** Extracted `F-###` claims with status (VERIFIED / REPORTED /
  DISPUTED…); clicking a claim highlights the narration it supports and vice versa;
  unresolved claims counted, never hidden.
- **FR-6.3 Personal-input queue.** `PI-###` `INPUT-REQUESTED` blocks become a form for
  Martin (primary prompt plus follow-ups); answers integrate as `COMPLETED` — the app
  never lets the agent invent his experience.
- **FR-6.4 Validator integration.** Run `validate_annotated_script.py` from the UI;
  errors shown inline at the offending beat or field.
- **FR-6.5 Readiness dashboard.** RESEARCH-DRAFT → EDITORIAL-DRAFT → RECORD-READY with
  the full gate checklist (evidence, rights, personal input, application, validator);
  promotion is always a human action.
- **FR-6.6 Shorts planner.** Mark 3–5 golden-nugget cut points during scripting (Law 4),
  each with its own ≤3-second hook draft and self-containment check.
- **FR-6.7 Exports.** Teleprompter and table-read extraction (per the format's extraction
  rules, markers stripped), Shorts scripts, and clean episode Markdown into
  `whp-youtube/`.

### FR-7 — History, persistence, agent console

- **FR-7.1 Full revision history.** Every operation creates a revision; timeline with
  diffs, restore, and undo/redo of agent edits.
- **FR-7.2 Draft branching.** Fork a draft to try a different direction; compare forks;
  merge back the winner.
- **FR-7.3 Repo-native storage.** Approved artifacts written as portable Markdown in the
  repository (git-committed at milestones); session and UI state stays app-local.
- **FR-7.4 Agent console.** Live streaming of what the agent is doing, cancellable
  operations, an operation queue, and a per-episode operations log (the audit trail of
  how the script evolved).
- **FR-7.5 Telemetry.** Per-operation elapsed time and runtime-reported token usage
  (`unavailable` when not exposed — never estimated), with session totals; kept outside
  the artifacts, exactly as the skill spec prescribes.
- **FR-7.6 Guardrail transparency.** When the agent declines or narrows something for an
  editorial-rule reason (for example, it will not invent a mechanism), the reason is
  shown plainly instead of a silently different result.
- **FR-7.7 Search.** Search across episodes, topics, variants, and research. (Session
  resume is covered by the crash-safety requirement in §7.)

### Later-version candidates (not in any committed scope)

- **Retention loop-back:** import YouTube retention/CTR after publishing and map dips
  onto script beats — "the dips are your Episode 2 script notes" (Law 6). High value
  post-launch.
- **Thumbnail concepts:** integrate the existing `gen_thumbnails.py` pipeline for in-app
  concept previews.
- **Rehearsal mode:** delivery-cue scripts (the `[DEADPAN]`-style practice format),
  teleprompter with cues, timing a recorded read against targets.
- **Channel-aware topic mode:** import private analytics to upgrade topic runs from
  cold-start mode.
- **Comment mining** for future topic seeds.

## 6. V1 scope (decided 2026-07-22)

V1 is **prototyping-first**, amended in review: the topic-selection run receives its full
UI in V1 rather than a minimal launcher.

**In V1:**

- FR-1 Topic Studio — complete (FR-1.1–1.8), including the full selection-run progress UI
  and candidate board.
- FR-2 Script Studio — complete except FR-2.7 read-aloud (deferred).
- FR-3 Selection-scoped editing — complete (must-have).
- FR-4 Variations — complete (must-have).
- FR-5 Approval gate and promotion — complete.
- FR-6 Production support — FR-6.1 annotated view, FR-6.3 personal-input queue, and
  FR-6.4 validator integration only.
- FR-7 — FR-7.1 revision history, FR-7.3 repo-native storage, FR-7.4 agent console,
  FR-7.5 telemetry, FR-7.6 guardrail transparency.

**Deferred to v1.1+:** FR-2.7 read-aloud; FR-6.2 claims board; FR-6.5 readiness
dashboard; FR-6.6 Shorts planner; FR-6.7 exports; FR-7.2 draft branching; FR-7.7 search.
Until the deferred FR-6 items land, deep Phase 2 work (claims, rights, readiness,
exports) continues through chat and repo files; the app's Promote action still launches
that phase.

**Rationale:** line-level refinement is the demonstrated bottleneck (the EP1 replacement
narration is the immediate need), and topic selection is the immediate next need, so both
get first-class support; production-phase depth follows once prototyping proves out. A
full-pipeline V1 and an editor-only V1 were considered and rejected in review.

## 7. Non-functional requirements

- **Local-only and private.** No cloud backend, no separate credential store; uses the
  local agent's existing authentication. Repo data never leaves the machine except
  through the agent's own model calls.
- **Responsive under long runs.** All agent work is asynchronous and streamed; the editor
  never blocks; long runs survive app restarts or can be safely relaunched.
- **Crash-safe.** No lost variants or unsaved decisions; continuous autosave of session
  state; reopening the app restores where Martin was.
- **Instant editing surface.** The selection popup and variant switching feel immediate,
  even while agent calls run in the background.
- **Coexistence.** Skills remain unchanged and fully usable from plain chat; the app is
  an optional front-end, not a dependency.
- **Single user, no auth, English UI.**

## 8. Success criteria

1. The EP1 replacement narration and at least one more episode are developed
   start-to-finish in the app (real adoption).
2. Refinement throughput measurably up: many selection-scoped iterations per hour with
   zero "agent rewrote more than I asked" incidents (locked passages honored 100%).
3. Every approved artifact lands as valid repo Markdown (Phase 2 documents pass the
   validator on first run from the app).
4. Zero invented-fact incidents reaching an approved prototype (the factual boundary
   panel doing its job).
5. Topic decisions recorded with brief and reconciliation, with no hand-editing of ledger
   files.

## 9. Resolved decisions (2026-07-22)

1. **V1 scope:** prototyping-first with the amendment in §6.
2. **Topic runs:** full in-app run UI in V1.
3. **Read-aloud / TTS:** deferred beyond V1.
4. **This document** lives at
   `docs/superpowers/specs/2026-07-22-script-creator-requirements.md`. The technical
   design — framework, persistence, local-agent transport, exact data contract, UI
   design — remains deferred to its own design cycle, per the 2026-07-22 "Keep script
   workflows ready for a local editing workbench" ledger entry.

## 10. Next step

A separate technical design for the V1 scope: app framework, local-agent transport,
persistence, the operation data contract with the skills, and UI design. No application
code is scaffolded before that design is accepted.
