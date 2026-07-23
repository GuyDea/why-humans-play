# WHP Script Creator — V1 Technical Design

**Date:** 2026-07-22
**Status:** Accepted
**Scope:** Technical design for the V1 scope of
[the accepted business requirements](2026-07-22-script-creator-requirements.md); includes
the FR-8 learning loop added on acceptance day

## Decision

Build Script Creator as a localhost web application: an Angular frontend over a local
Node daemon that drives the headless codex CLI through stateless, schema-constrained
skill operations, stores working state in app-local SQLite, and writes durable milestones
as repository Markdown. The editor is TipTap on ProseMirror with four custom extensions
that make locks, proposals, annotations, and variants first-class. Session decisions are
captured, distilled by the agent into proposed lessons, and applied only after Martin's
approval — episode-local lessons as envelope context, durable lessons through the
existing reconcile flow into the skill and steering files, so the repository remains the
single editorial memory.

```text
Browser UI (Angular)  ⇄  HTTP + SSE  ⇄  local Node daemon  ⇄  durable job runners
                                          ↙        ↓        ↘
                                      SQLite   codex CLI   python3 validator / git
                                                    ↓
                                          repo Markdown + commits
```

## Application shell and stack

- **Shell:** localhost web app. One `npm` launch command starts the daemon and opens the
  browser. No Electron/Tauri packaging in V1 (the frontend remains wrappable later); a
  VS Code extension was rejected because webview constraints fight the custom selection,
  variant, and pipeline UX.
- **Backend:** Node 24 + Fastify. Commands over HTTP; streaming over Server-Sent Events.
- **Frontend:** Angular (current major, matching `quizloo-ui` and `apexwit-ui`) built
  with the Angular CLI. TipTap core and ProseMirror are used directly — no framework
  bindings. NodeViews render via plain DOM so editor internals stay framework-portable;
  Angular owns everything outside the editor surface (boards, panels, consoles, queues).
- **App location:** `script-creator/` inside this repository, per the 2026-07-22
  workbench ledger entry.
- **Security:** bind `127.0.0.1` only; validate `Origin`; require a per-launch nonce on
  every request so arbitrary web pages cannot reach process-spawning endpoints. No stored
  credentials — codex uses its own existing authentication.

## Editing surface and document model

**Editor: ProseMirror directly (editor-core).** ProseMirror's transaction and
step-mapping model is the decisive fit: ranges survive concurrent edits, which is the
central problem of asynchronous agent results landing in a document Martin kept editing.
CodeMirror 6 was rejected for the main surface (structured inline variants fight a
text-document model; possibly useful later for a raw-Markdown view), Lexical as second
choice (more bespoke machinery for range rebasing), `contentEditable` outright.
*(Amended 2026-07-23: the original design named TipTap 3 as a convenience wrapper.
Spike 2 delivered a complete framework-agnostic ProseMirror core — plugins, NodeViews,
selection toolbar — leaving TipTap nothing to provide, so the Studio embeds editor-core
directly.)*

Four custom extensions:

- **LockGuard** — approved-passage marks carrying a `lockId`; the plugin mechanically
  rejects any transaction (typing, paste, accepted agent edit) that would change locked
  content. Unlocking is a separate explicit command. Locks are enforced by the editor,
  never by trusting the agent.
- **ProposalLayer** — non-serialized decorations rendering every agent edit as an inline
  deletion/insertion diff with Accept / Reject / Re-roll. The document is unchanged until
  Accept, which applies one atomic transaction that must still pass LockGuard.
- **AnnotationLayer** — margin pins (Review findings, evidence flags) anchored to ranges
  by block IDs + offsets + text fingerprint, position-mapped through every transaction.
  Deleted anchors orphan visibly; they never silently reattach elsewhere.
- **VariantSet** — inline and block custom nodes holding 2–3 labeled alternatives with an
  active selection, rendered through NodeViews as switchable in-context options with
  side-by-side compare. Pick replaces atomically; losing options go to the parking lot;
  Mix launches a new scoped skill operation.

**Document model: schema-constrained JSON is the working model; Markdown is the export
codec, not live storage.**

```text
ScriptDocument
  metadata: id, schemaVersion, creativeStatus, topicBrief, format (annotated | narration)
  beats[]
    id (beat_[a-z2-7]{10}), ordinal, title, timeTargetMs, narrativeJob
    narration[]: paragraph(id, inline content) | variantSet(id, alternatives[], activeId, settled)
    productionSections[] (Phase 2; opaque pass-through where unrecognized)
```

A deterministic codec auto-detects and preserves both repository script formats per
document. Annotated scripts use beat headings with blockquoted narration under
`### Narration`; narration-first scripts use the full verbatim `## …` beat heading and
place blockquoted narration directly beneath it, with production material in an opaque
appendix. Wrapped blockquote lines join into narration paragraphs and blockquote-only
blank lines separate them. The detected `annotated | narration` format is stored on the
document and controls emission. Unrecognized production Markdown round-trips as opaque
nodes. Locks, proposals, annotations, unresolved variants, history, and parking-lot
content never contaminate exported Markdown; export is blocked until variants are
settled and proposals resolved. External file edits are detected by content hash and
imported as a new revision — never silently overwritten.

**Safe agent merge.** Every request freezes `baseRevision`, the selected slice, stable
endpoint IDs, and a text fingerprint. On result: validate the typed response (never
accept a whole returned document); map the original endpoints through all transactions
since `baseRevision`; re-anchor when surrounding edits do not touch the selection; mark
the proposal stale/conflicted (showing base/current/proposed) when the selected text
changed, split, or now intersects a lock. Never fuzzy-apply.

**History: two tiers.** Native ProseMirror undo/redo handles typing; accepting a
proposal is one undo step. Separately, every agent invocation creates an immutable
operation revision (base document hash, request envelope, result, diff, timing, tokens,
disposition) — this is both FR-7.1 revision history and the FR-7.5 telemetry store, and
the raw evidence for the FR-8 learning loop. Restore creates a new head and resets the
native undo stack; it never deletes later history.

## Operation contract

Every operation is a headless run:

```bash
codex exec --json -C <repo> -s <sandbox> [--output-schema <schema>] [-o <result-file>] -
```

The prompt (stdin) is an **envelope carrying zero editorial instruction**: the skill
reference, the operation name, and explicit JSON inputs — topic brief, artifact or
selection, surrounding context, narrative job, creative status, requested scope. All
editorial method lives in the skills. Example:

```text
$writing-whp-youtube-scripts
Operation: Rewrite selection
Inputs: {
  "topic_brief": {"topic": "...", "factual_anchors": [...], "unknowns": [...]},
  "approved_lessons": ["Keep hook sentences under twelve words for this episode."],
  "selection": "The AI found a loophole in the score and declared victory.",
  "surrounding_context": {"before": "...", "after": "..."},
  "narrative_job": "Turn the incident into the larger question without asserting an unknown reward mechanism.",
  "creative_status": {"phase": "rapid-prototype", "locked_surrounding_text": true},
  "requested_scope": "Replace only the selection; 15–30 spoken words; sharpen the humor."
}
```

`approved_lessons` is a typed input carrying only episode-local lessons Martin approved
through the FR-8 review queue. It is supplied context — Martin-approved data the skills
are designed to accept — and remains distinct from app-authored editorial instruction,
which stays forbidden.

Operations and their results:

| Operation | Skill | Result | Repo side effect |
|---|---|---|---|
| Generate (scoped) | script | schema (rewrite shape) | none |
| Generate (episode-scale) | script | raw Markdown via `-o` | none (app writes `drafts/` on approval) |
| Review | script | schema (findings) | none |
| Rewrite selection | script | schema (replacement) | none |
| Generate alternatives | script | schema (options) | none |
| Promote | script | raw completion/guardrail report | writes `episodes/<NN>-<slug>.md` |
| Ideate subjects/angles (brainstorm canvas) | topic | schema (subject/angle cards) | none |
| Quick gate-check | topic | schema (verdict + six gates) | none |
| Package test | topic | schema (directions + survival) | none |
| Full topic-selection run | topic | raw report + structured summary | writes `topic-runs/…` report + summary sidecar |
| Topic-brief handoff (preview) | topic | raw Markdown brief | none (app writes `topics/<slug>.md` on acceptance) |
| Distill session lessons | app-initiated, script | schema (lessons) | none |
| Reconcile / durable-lesson application | reconcile-whp | diff for review | steering/skill/`DECISIONS.md` edits on approval |

The full run's envelope also requests a **structured summary sidecar** (JSON next to the
report): a serialization of the tables its output contract already mandates — candidate
pool with gate outcomes, ranked shortlist with criterion scores and grades, packaging
directions, winner block. Like `WHP_PROGRESS/1`, this transports what the skill already
must produce and adds no editorial method; the candidate board (FR-1.5) and package
tester history (FR-1.6) read it, while the Markdown report stays canonical for reading.

**Hybrid outputs.** `--output-schema` constrains every schema-result operation in the
table above. Schemas keep creative prose in single Markdown strings (constrain transport
shape, never writing) and share three fields: `status` (`complete | narrowed |
declined`), the payload, and `guardrail_markdown` — the skill's own explanation when it
declines or narrows for an editorial-rule reason, rendered as first-class UI (FR-7.6),
never a generic error. The appendix below is normative: production schemas use those
required fields with `additionalProperties: false` applied recursively. Long-form
artifacts (episode-scale Generate, the full topic run and its report, the topic-brief
handoff, Promote's canonical episode document) are raw Markdown; their rich structure
must not be flattened into app-owned JSON.

**Stateless by default; bounded resume.** Every operation defaults to a fresh one-shot
with the complete envelope. Review, Rewrite, Alternatives, and narrowly scoped Generate
may use `codex exec resume <thread_id>` for up to three immediate iterations on the same
passage — but the resumed prompt still repeats the full current envelope; session history
is an optimization, never an input. Fresh runs are mandatory after acceptance, selection
movement, operation change, or creative-status change, and always for gate-checks, full
runs, handoff, and Promote.

**Live progress.** The full topic run's envelope requests
`progress_transport: "WHP_PROGRESS/1"` — a serialization of the checklist the topic skill
already mandates, adding no editorial method:

```text
WHP_PROGRESS/1 <id> <pending|active|done|unknown> :: <skill-authored text>
ids: 01-frame 02-mode 03-signals 04-pool 05-angles 06-gates
     07-shallow 08-deep 09-shortlist 10-packages 11-winner 12-audit
```

The app keys rows by ID and renders the skill's text verbatim. For every operation the
generic agent console renders `thread.started`, `turn.started`, agent messages,
tool/command summaries, errors, and `turn.completed`, preserving unknown event types in
the log and never exposing hidden reasoning.

**Sandbox and file placement.**

- `read-only`: Generate, Review, Rewrite, Alternatives, Ideate, Quick gate-check,
  Package test, handoff preview, Distill. Artifacts accepted from these operations
  (briefs, approved drafts, `PIPELINE.md` milestones) are written by the app itself,
  which is not sandboxed.
- `workspace-write`: Full topic-selection run, Promote, and approved reconcile/lesson
  application runs only.
- Full run reports → `whp-youtube/topic-runs/YYYY-MM-DD-<run-id>.md`; accepted briefs →
  `whp-youtube/topics/<slug>.md`; creative-approved baselines →
  `whp-youtube/drafts/<slug>.md`; Phase 2 scripts →
  `whp-youtube/episodes/<NN>-<slug>.md`; durable pipeline milestones →
  `whp-youtube/PIPELINE.md`. Schema results, variants, selections, telemetry, and
  rejected drafts stay app-local.

## Background jobs and durability

Durable per-job runner processes with a SQLite-backed FIFO queue. Before launch, the
daemon persists the immutable input envelope, schema, model configuration, and job
record; the runner owns the codex process, captures the session ID, and appends every
JSONL event to an append-only log with atomic result/status files. The UI reconnects via
SSE using persisted event sequence numbers; a daemon restart re-tails running jobs.
After a machine reboot, interrupted jobs offer explicit continuation via
`codex exec resume` (saved session ID + complete original envelope) or a fresh idempotent
relaunch. One codex job runs at a time in V1 (alternatives arrive in one call, so
parallelism pressure is low); validator and git run in a separate serialized lane.
Cancellation records `cancelling`, interrupts the runner's verified process group, waits
five seconds, then terminates — preserving events and partial files as recoverable
evidence, never auto-applying them.

## Persistence and repository layout

- **App-local:** SQLite via `better-sqlite3` (WAL, `synchronous=FULL`, migrations) at
  `$XDG_DATA_HOME/whp-script-creator/<repo-id>/state.sqlite3`, with per-job logs under
  `$XDG_STATE_HOME/whp-script-creator/<repo-id>/jobs/`. Stores working drafts, TipTap
  documents, variants, parking lot, locks, annotations, revisions, proposals,
  idea/candidate cards, lessons, telemetry, UI state, and the job queue. Semantic edits
  journal immediately; typing batches flush within 250 ms; gate actions, variant
  choices, and agent results commit synchronously. Outside the repo by design: durable
  across branches and worktrees, impossible to commit accidentally.
- **Repository Markdown holds durable milestones only** (paths above, plus reconciled
  steering and `DECISIONS.md`). Ideas through active prototyping stay app-local;
  selection onward becomes repo-backed.

## Validator and git integration

Subprocess adapters with argument arrays — no shell interpolation. The validator runs
exactly as the skill specifies (resolve the skill directory from `SKILL.md`, cwd there,
absolute target path after `--`). A **backward-compatible `--json` diagnostic mode is
added to `validate_annotated_script.py` itself** (test-first against its existing suite)
so the app gets structured diagnostics without reproducing validation rules in
TypeScript.

Git flow honors standing rules: check branch and status before the first repo write and
present the blocking branch choice; create a managed worktree per episode off the local
default branch; stage only explicit files; run `git diff --check`; commit only on
deliberate milestone actions (topic selected, creative approval, promotion, lesson
application), prompting the reconcile flow at decision milestones. Validator success
never changes readiness automatically.

## Learning loop (FR-8)

The repository is already WHP's learning system — line-level feedback became durable
skill rules through `DECISIONS.md` and reference edits all week. The app automates that
loop and adds no second memory:

1. **Capture (automatic).** The operation log already records every envelope, result,
   and disposition — accepted, rejected, re-rolled, variant picked — plus an optional
   one-keystroke "why" note on reject/re-roll.
2. **Distill (agent operation).** At session end or on demand, `Distill session lessons`
   sends the session's decision log plus all previously approved lessons to the agent.
   Schema-constrained result: proposed lessons, each with evidence pointers to the
   supporting decisions and a classification — `episode-local` (taste scoped to this
   episode) or `durable-doctrine` (a channel-level editorial rule candidate). Including
   prior lessons prevents re-proposal and contradiction. The distillation prompt carries
   no editorial method; judgment about what constitutes a lesson belongs to the agent
   and skills.
3. **Review queue (human gate).** Nothing applies silently. Martin approves, edits,
   rejects, or later retires each lesson in a lessons view.
4. **Apply.** Approved episode-local lessons attach automatically to that episode's
   future envelopes as supplied context — data, not method, which the skills are
   designed to accept. Approved durable lessons become a proposed diff to the skill
   references or steering plus a `DECISIONS.md` entry, routed through the existing
   reconcile flow with diff preview and a deliberate milestone commit; the skills then
   read them natively in every future session, in-app or in plain chat.

The app stores the raw decision log (evidence), lesson workflow metadata (proposals,
approvals, rejections, retirements — bookkeeping, not editorial content), and approved
episode-local context riders. Durable lesson content lives only in the repository files
once applied; retiring a durable lesson is itself a reconcile-flow edit to those files,
tracked by the same workflow metadata. The app never maintains an editorial prompt layer
of its own — preventing exactly the shadow-doctrine drift the workbench boundary
forbids.

## Guyditor boundary constraints

Guyditor (Martin's agent-native video editor; Electron/React/TS, internal alpha) is the
downstream consumer of recorded episodes. Script Creator adopts three cheap constraints
now and defers all actual integration until guyditor's first real-episode dogfood:

1. Beat IDs are immutable and use guyditor's `beat_[a-z2-7]{10}` format, so no
   remapping is ever needed. Planned Shorts carry their own immutable IDs
   (`short_[a-z2-7]{10}`) and are defined as beat ranges plus hook text; only the beat
   pattern is guyditor's.
2. Planned timings are integer milliseconds. `{frames,fps}` belongs to post-recording
   alignment; planned timings are never presented as final captions.
3. The production script stays serializable to a versioned JSON handoff — beat IDs,
   narration, production notes, target durations, Shorts as beat ranges plus hook text —
   which a future guyditor importer reconciles against the recorded transcript. No code
   is shared now; later, only the handoff schema/types become a tiny shared package.

## Failure policy and telemetry

Soft-stall warning after 120 s without an event; hard limits of 15 min for scoped
operations, 30 min for episode-scale Generate and handoff, 120 min for full runs and
Promote. On schema-validation failure: retain the raw JSONL, apply nothing, retry once
as a fresh identical run. Editorial narrowing or refusal is never retried — the
`guardrail_markdown` (or, for raw operations, the complete agent response marked "not
applied") is shown. Retries reuse the same immutable input revision and create no
duplicate revisions. Telemetry per operation: elapsed time from a monotonic clock
between `turn.started` and the terminal event; token counts persisted verbatim from
`turn.completed.usage`; `unavailable` when absent — never estimated.

## Risks and de-risking spikes

**Spike 1 — transport durability (biggest risk).** The codex JSONL CLI is a transport,
not a stable job API. Before any feature work: run a real skill operation through a
detached runner; kill and restart the daemon mid-run; reconnect and replay events;
cancel another run; resume an interrupted session; verify token capture and
`--output-schema` enforcement on a scoped edit.

**Spike 2 — editor range identity.** One beat: lock a cross-paragraph passage, dispatch
a deliberately slow rewrite, apply edits before, inside, and after the target while it
runs. Property-test with fast-check: locked bytes never change; non-overlapping edits
rebase; overlapping edits always conflict; proposals never alter exported Markdown;
acceptance and undo are atomic. The spike must also demonstrate inline and block variant
NodeViews.

Both spikes precede the editor and pipeline build-out.

## Rejected alternatives

Electron/Tauri shell and VS Code extension (packaging or UX constraints without V1
capability gain); React and SvelteKit frontends (Angular is the maintained stack; the
editor core is framework-agnostic ProseMirror either way); Rust backend (cost without
need); CodeMirror 6 and Lexical for the main editor; gitignored in-repo SQLite and JSON
files for state; permanent OS service with external queue; app-side learned-preferences
prompt layer (shadow doctrine); immediate guyditor code sharing (unpublished alpha,
React vs Angular, post-production data model).

## Appendix — normative operation result schemas

Production schemas apply `additionalProperties: false` recursively. Prose stays in
single Markdown strings. **Strict structured-output rule (verified against the live
backend in Spike 1):** every key in `properties` must also appear in `required`;
optional semantics are expressed as nullable types (`"type": ["string", "null"]`),
never by omission from `required` — a schema violating this is rejected with
`invalid_json_schema` before the model runs. Core four:

```json
{
  "review": {
    "type": "object", "required": ["status", "findings", "guardrail_markdown"],
    "properties": {
      "status": {"enum": ["complete", "narrowed", "declined"]},
      "findings": {"type": "array", "items": {"type": "object",
        "required": ["anchor", "severity", "finding_markdown", "optional_direction_markdown"],
        "properties": {"anchor": {"type": "string"},
          "severity": {"enum": ["blocking", "important", "optional"]},
          "finding_markdown": {"type": "string"},
          "optional_direction_markdown": {"type": ["string", "null"]}}}},
      "guardrail_markdown": {"type": ["string", "null"]}
    }
  },
  "alternatives": {
    "type": "object", "required": ["status", "options", "guardrail_markdown"],
    "properties": {"status": {"enum": ["complete", "narrowed", "declined"]},
      "options": {"type": "array", "items": {"type": "object",
        "required": ["label", "markdown"],
        "properties": {"label": {"type": "string"}, "markdown": {"type": "string"}}}},
      "guardrail_markdown": {"type": ["string", "null"]}}
  },
  "gate_check": {
    "type": "object", "required": ["status", "verdict", "gates", "guardrail_markdown"],
    "properties": {"status": {"enum": ["complete", "narrowed", "declined"]},
      "verdict": {"enum": ["pass", "fail", "unknown"]},
      "gates": {"type": "array", "items": {"type": "object",
        "required": ["gate", "verdict", "reason_markdown"],
        "properties": {"gate": {"enum": ["game_play_centrality", "human_revelation",
            "recognized_payoff", "evidence_path", "production_reality", "portfolio_fit"]},
          "verdict": {"enum": ["pass", "fail", "unknown"]},
          "reason_markdown": {"type": "string"}}}},
      "guardrail_markdown": {"type": ["string", "null"]}}
  },
  "rewrite": {
    "type": "object", "required": ["status", "replacement_markdown", "guardrail_markdown"],
    "properties": {"status": {"enum": ["complete", "narrowed", "declined"]},
      "replacement_markdown": {"type": "string"},
      "guardrail_markdown": {"type": ["string", "null"]}}
  }
}
```

Remaining shapes (same `status`/`guardrail_markdown` frame; exact JSON fixed during
implementation, field sets normative here):

- **ideate:** `cards[] {subject, angle_markdown, seed}`.
- **package_test:** `directions[] {working_title, intended_viewer, familiar_markdown,
  surprise_markdown, visual_promise_markdown, delivered_payoff_markdown,
  survives_honestly, reason_markdown}` — mirroring the topic skill's packaging
  stress-test columns.
- **distill:** `lessons[] {classification: "episode-local"|"durable-doctrine",
  lesson_markdown, evidence[] (decision ids), proposed_target}`.
- **full-run structured summary sidecar:** arrays mirroring the output contract's
  mandated tables — candidate pool with six gate outcomes, ranked shortlist with the
  seven criterion `score/grade` pairs, packaging directions with survival, and the
  winner block fields.

## Reconciliation

The business requirements gain FR-8 (learning loop) in V1, the guyditor deferral in
later-version candidates, and resolved decisions 5–9; `DECISIONS.md` records the design
acceptance. `BRAND.md`, `CLAUDE.md`, and `whp-youtube/STEERING.md` need no content
change: the design conforms to the recorded workbench boundary, and the app remains an
internal authoring tool.
