# Script Creator — Plan 7: Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close FR-8 by retaining Martin's explicit Script Creator decisions, distilling them into evidence-linked lesson proposals, applying only Martin-approved episode-local lessons to later episode operations, and routing durable doctrine through the repository's existing `reconcile-whp` flow.

**Architecture:** Treat the durable operation/revision/topic/promotion records already produced by Plans 3–6 as the evidence, then add a small v10 learning store for stable decision links, optional rejection reasons, distillation runs, lesson review state, lesson provenance, and applied-operation snapshots. The reserved read-only `distill` registry entry becomes a skill-owned operation; the server—not browser metadata—injects active episode-local lessons into draft-scoped envelopes. Durable candidates never become an app prompt layer: the app prepares an evidence-rich `reconcile-whp` handoff, Martin runs that flow in the repository and reviews/commits its diff, and the app records only verified repository provenance afterward.

**Tech Stack:** Node 24, Fastify 5, better-sqlite3, Angular 20 standalone components and signals, framework-agnostic ProseMirror editor-core, Vitest, git read adapters, and Playwright for the scripted browser sweep.

## Normative FR-8 scope

Plan 7 implements these accepted subrequirements exactly:

> - **FR-8.1 Decision capture.** Every operation disposition (accepted, rejected,
>   re-rolled, variant picked) is recorded automatically with its full context; rejecting
>   or re-rolling offers an optional one-keystroke "why" note.
> - **FR-8.2 Session distillation.** At session end or on demand, an agent operation
>   reviews the session's decision log and proposes lessons, each with evidence pointers
>   to the supporting decisions and a classification: episode-local taste versus durable
>   editorial doctrine. Previously approved lessons are supplied so distillation never
>   re-proposes or contradicts them.
> - **FR-8.3 Review queue.** No lesson applies without Martin's approval; a lessons view
>   supports approve, edit, reject, and later retire.
> - **FR-8.4 Application.** Approved episode-local lessons attach automatically to that
>   episode's future operation envelopes as supplied context. Approved durable lessons are
>   routed into the repository's canonical steering and skill files through the existing
>   reconcile flow (diff preview, deliberate milestone commit), so the skills read them
>   natively in every future session — in-app or in plain chat.
> - **FR-8.5 No shadow doctrine.** The app never maintains its own editorial prompt layer;
>   the learned state it stores is limited to the raw decision log, lesson workflow
>   metadata (proposals, dispositions, retirements), and approved episode-local context
>   riders. Durable lesson content lives in the repository's steering and skill files once
>   applied, and retiring a durable lesson is itself a reconcile-flow edit to those files.

## Contract decisions

- **Existing records are the evidence.** A normalized decision contains a stable ID and
  links to its source records; it does not copy an operation envelope, result, document
  snapshot, or diff into a second log. `learning/decisions.ts` resolves the full context
  from the immutable job envelope/result, proposal disposition, adjacent revisions,
  topic record, saga record, promotion, or validator attempt when listing or freezing a
  distillation input.
- **Only explicit human dispositions count as decisions.** An agent completing an
  operation, producing a gate result, proposing a package, or passing the validator is
  evidence but not a Martin decision. Autosaves, manual saves, restores, operation
  cancellation, and product milestone commits are also not learning decisions.
- **Migration v10 is genuinely required.** Schema v9 cannot represent lesson proposals,
  approvals, rejections, retirement/supersession, evidence links, immutable
  distillation inputs, optional "why" notes, or which approved lesson version an
  operation received. V10 adds only that workflow/evidence bookkeeping. It does not add
  editorial rules, and it does not rewrite existing draft `doc_json`.
- **The existing `distill` reservation is activated, not duplicated.** Registry key
  `distill`, label `Distill session lessons`, the writing skill, `read-only` sandbox,
  strict schema output, a fresh run, and no repository side effect remain one operation
  contract.
- **The script skill owns distillation judgment.** The current
  `writing-whp-youtube-scripts` skill has no Distill routing or lesson method, so Plan 7
  requires one small reference under that existing skill plus a SKILL routing entry.
  Because `.agents` is controller-owned, that work is an explicitly marked
  **CONTROLLER task**. The application contributes no rule about what makes a good
  lesson, how many decisions suffice, or which doctrine file should change.
- **Schemas remain strict.** The distill result is
  `{status, lessons, guardrail_markdown}`. Every lesson has required
  `classification`, `lesson_markdown`, `rationale_markdown`, `evidence`,
  `proposed_target`, and `supersedes_lesson_id`; nullable semantics use nullable types,
  every object has `additionalProperties: false`, and every property is required.
- **Episode-local context is server-authoritative.** The browser may not unlock or alter
  learning context by supplying `approved_lessons`. For every draft-scoped script
  operation, the server deletes that client field, loads active approved episode-local
  lessons for the draft, injects their exact reviewed text as `approved_lessons`, and
  records the lesson IDs and content hashes alongside the operation. Durable candidates
  are never injected; after reconciliation the skill reads durable doctrine natively
  from repository files.
- **Applied context remains provenance-pure.** An envelope remains only the skill
  reference, registered operation label, and explicit stored/user inputs.
  `approved_lessons` is Martin-approved stored context, not app-authored instruction.
  The operation console shows the immutable array and links it back to the reviewed
  lesson records used for that operation.
- **No durable doctrine write originates in the app.** For an approved durable
  candidate the app prepares Markdown containing the candidate, rationale, source
  decision IDs, resolved evidence, prior/superseded lesson provenance, and the request
  to run `$reconcile-whp`. Martin runs reconciliation in a repository controller,
  reviews the diff, and performs a separate deliberate commit. The app does not invoke
  the skill, edit `.agents`, edit steering, edit `DECISIONS.md`, stage files, or commit.
- **Repository content replaces app content after durable application.** While a
  durable candidate is proposed or awaiting reconciliation, its reviewed candidate text
  is lesson workflow metadata. Once a reconciliation commit is verified, the app stores
  the commit, affected paths, anchors/content hashes, and decision ledger provenance,
  clears its applied durable text copy, and resolves current text from the repository
  when needed. If a pointer no longer resolves, the lesson is shown as stale; the app
  never guesses or silently recreates doctrine.
- **Retirement and supersession are scoped.** Retiring an episode-local lesson
  immediately removes it from later envelopes. Approving an episode-local replacement
  can atomically supersede the active predecessor. Retiring or superseding applied
  durable doctrine first creates a prepared reconciliation handoff; the prior
  repository rule remains in force until Martin completes and commits that reconcile
  edit.
- **Long transitions use persisted workflow state.** A distillation run freezes ordered
  decision IDs and existing-lesson snapshots before launch and can ingest its result
  idempotently after restart. A durable apply/retire/supersede handoff has one opaque
  resume key and persisted `prepared → awaiting-reconciliation → verified` state.
  Recoverable retries return current state instead of creating duplicate proposals.
- **The composition-spec law remains binding.** The routed `/lessons` production page,
  its real panels, API client, navigation, and operation-envelope inspection are
  composed in the same task. `studio-composition.spec.ts` must navigate through and
  drive rendered controls; a detached component spec is not integration evidence.
- **Commits stay explicit.** The conventional implementation commits named below are
  one per task. In the implemented product, lesson review never commits; durable
  application uses the external `reconcile-whp` diff/commit gate and no endpoint
  side-effect calls git commit.

## Mechanical decision-capture contract

| Human event that counts | Existing durable source and normalized proof | What does not count |
|---|---|---|
| Proposal accepted | Operation envelope/result + proposal record + accepted revision with matching `op_id`; the adjacent revision pair supplies the diff. Applies to selection rewrites, episode generation, architecture sections, and PI integration. | Merely receiving or previewing the proposal. |
| Proposal rejected | Operation envelope/result + durable proposal disposition; architecture rejection gets a pointer-only disposition record because it has no content revision. Optional `why` is stored against the decision ID. | Closing a panel without an explicit Reject action. |
| Proposal re-rolled | Predecessor proposal disposition `rerolled` + child operation's persisted resume link; optional `why` belongs to the predecessor decision. The replacement remains a separate proposal. | A fresh unrelated operation with similar inputs. |
| Variant picked | The narration revision produced by the atomic pick, with typed `variant-picked` disposition carrying variant-set and selected-alternative IDs; before/after revisions supply full context and losing options remain in the parking lot. | Toggling a variant for preview or opening side-by-side compare. |
| Gate action | Existing architecture approve/reopen revisions and sagas, narration reconciliation/approval revisions, and explicit Promote completion record. | Praise, an operation finishing, validator success, or a milestone commit. |
| Package picked | The existing package-test record plus its explicit selected-direction index/time and source operation. | Generating directions or `survives_honestly` being true. |
| Winner handed off | A completed topic-handoff saga linked to its run summary, winner block, accepted brief, and created draft. | An agent naming a provisional winner before Martin confirms handoff. |
| PI material integrated | The `personal-input-proposal-accepted` revision, proposal disposition, operation envelope/result, PI ID, supplied input, and atomic marker/block diff. | Submitting personal material or previewing the returned rewrite. |
| Validator-fix cycle accepted | An append-only failed validator attempt, the next accepted/manual production revision(s), and the later attempt at a new exact hash; the normalized cycle links diagnostics and diff without treating a pass as editorial approval. | A validator pass by itself or a fix proposal Martin rejected. |

The projector also recognizes existing `episode-generation-accepted`,
`architecture-proposal-accepted`, `architecture-proposals-accepted`,
`selection-proposal-accepted`, `personal-input-proposal-accepted`,
`architecture-approved`, `architecture-reopened`, and `narration-approved`
dispositions exactly. Unknown dispositions remain visible in revision history but do not
become lesson evidence until a later plan explicitly maps them.

## Functional-requirement coverage

| Requirement | Plan 7 result |
|---|---|
| FR-8.1 | Closes automatic capture for accepted/rejected/re-rolled proposals, variant/package picks, explicit gates, winner handoffs, PI integrations, validator-fix cycles, and optional rejection/re-roll reasons. |
| FR-8.2 | Closes durable session snapshots and on-demand/session-end read-only distillation with prior lesson context, strict results, rationale, evidence IDs, duplicate/contradiction prevention, and crash recovery. |
| FR-8.3 | Closes the routed human review queue: approve, edit-before-approve, reject, retire, and supersede, with provenance always visible. |
| FR-8.4 | Closes authoritative episode-local envelope injection and prepared durable reconciliation handoffs with external diff review and explicit commit verification. |
| FR-8.5 | Closes the no-shadow-doctrine boundary: app-local evidence/workflow only, repository-native durable rules, and reconcile-based durable retirement. |

## Global constraints

- Implementation branch: `script-creator-plan7-learning`. Commit once per task with the
  exact conventional message named by that task.
- State schema starts at v9. Plan 7 has exactly one new migration, v10; there are no
  reserved placeholders or follow-on v11 migrations in this plan.
- V10 upgrades fresh and populated v9 databases in place, is safe when already at v10,
  leaves existing document JSON bytes unchanged, and only backfills decisions that v9
  can prove. Historical architecture rejects, rejection reasons, package picks, and
  failed validator diagnostics that v9 never persisted cannot be reconstructed.
- A learning session is a durable decision window for one draft. **Distill now**
  snapshots the open window without closing it; **End session & distill** closes the
  window at a persisted cursor and opens the next window on the next decision. Browser
  unload never silently ends a session or launches Codex.
- Frozen distillation input contains ordered resolved decisions and existing lesson
  records. Previously approved episode-local text comes from SQLite; applied durable
  text is read from its verified repository pointer. Proposed, rejected, retired, and
  superseded records are supplied with their state so the skill can avoid shallow
  re-proposals; unresolved durable content is reported instead of invented.
- Mechanical result validation requires every evidence ID to belong to the frozen
  decision set, rejects duplicate evidence IDs, requires at least one evidence pointer,
  validates `supersedes_lesson_id` against the supplied lesson set, and deduplicates an
  idempotently re-ingested result. It does not score lesson quality or rewrite prose.
- Lesson state machines are explicit. Episode-local:
  `proposed → approved → retired|superseded` or `proposed → rejected`. Durable:
  `proposed → approved-pending-reconcile → applied →
  retirement-pending|supersession-pending → retired|superseded`, or
  `proposed → rejected`.
- Edit-before-approve preserves both the agent's `proposedMarkdown` and Martin's exact
  `reviewedMarkdown`; only the latter can become active context or prepared reconcile
  material. Editing is not approval.
- Existing operation, architecture, promotion, milestone, and topic sagas keep their
  Plan 6 idempotency and reservation behavior. Learning capture observes completed
  boundaries and must not broaden or weaken those workflows.
- `WHP_PROGRESS/3`, architecture section contracts, validator rules, milestone file
  whitelists, and `RECORD-READY` behavior do not change.
- Full host suites and typechecks stay green for every touched package. The real routed
  composition spec is binding for UI integration; the built-app browser sweep is
  binding for the complete fake-mode lifecycle.

## File structure

```text
controller-owned skill:
  .agents/skills/writing-whp-youtube-scripts/SKILL.md
                                  — route Distill without embedding its method
  .agents/skills/writing-whp-youtube-scripts/references/
    lesson-distillation.md        — decision-to-lesson judgment and result contract

server:
  src/learning/store.ts           — v10 session, decision-link, lesson, evidence,
                                     reconciliation, validation-attempt, and
                                     operation-lesson records
  src/learning/decisions.ts       — deterministic projection/resolution from existing
                                     operation, revision, topic, saga, and promotion data
  src/learning/service.ts         — session snapshots, distill ingestion, review/lifecycle,
                                     authoritative context, and reconcile handoffs
  src/state-migrations.ts         — once-only v10 learning workflow/evidence migration
  src/operations/{registry,schemas,service}.ts
                                  — activated Distill contract and immutable inputs/results
  src/documents/{store,service}.ts
                                  — revision/validator sources and lesson-aware draft reads
  src/architecture/service.ts     — typed proposal/gate capture and server lesson injection
  src/topics/{store,service}.ts   — package picks and winner-handoff provenance
  src/repo/git.ts                 — read-only reconciliation-commit verification
  src/http/app.ts, src/daemon.ts  — learning routes and service wiring
  test/fake-codex.mjs             — deterministic distillation result modes

app:
  src/app/lessons/model.ts        — decision, session, lesson, provenance, and lifecycle state
  src/app/lessons/lessons-panel.ts
                                  — review queue, evidence, distill actions, handoff review
  src/app/lessons/lessons-page.ts — production `/lessons` route composition
  src/app/api/client.ts           — learning/session/review/reconcile APIs
  src/app/editor/editor-host.ts   — proposal reason/reroll and variant-pick dispositions
  src/app/architecture/{model,architecture-panel}.ts
                                  — durable architecture proposal dispositions
  src/app/topics/full-run-panel.ts
                                  — explicit package pick capture
  src/app/production/production-panel.ts
                                  — PI/validator-cycle capture surfaces
  src/app/panels/{brief-panel,agent-console}.ts
                                  — remove freeform lesson editing; show applied context
  src/app/{app.routes.ts,app.html}
                                  — real Lessons navigation
  src/app/editor/studio-composition.spec.ts
                                  — production-route integration net
  e2e/plan7-browser-sweep.ts      — built-app learning lifecycle in a temporary clone
```

---

## Block A — Skill contract and durable evidence

### Task 1 (CONTROLLER): Skill-owned lesson distillation method

**Ownership:** `.agents` is controller-owned. The controller must execute this task and
use the skill-editing workflow required by the repository; a delegated app/server worker
must not edit these files.

**Files:**

- Modify `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Create `.agents/skills/writing-whp-youtube-scripts/references/lesson-distillation.md`
- Test `script-creator/server/test/operations/distillation-skill-contract.test.ts`

- [ ] Add **Distill session lessons** to the skill's operation routing and route only
  that operation to the new reference. Existing Generate, Review, Rewrite,
  Alternatives, and Promote behavior remains unchanged.
- [ ] Define the skill-owned method over supplied decision records: distinguish an
  explicit preference from an agent outcome, use exact evidence IDs, explain the
  rationale, separate episode-local taste from channel-level durable-doctrine
  candidates, consult prior lesson states, avoid duplicate or contradictory proposals,
  and use `supersedes_lesson_id` when new evidence genuinely replaces an earlier lesson.
  A proposed target is a nonbinding routing hint; the later `reconcile-whp` impact map is
  authoritative.
- [ ] Require the strict output vocabulary used by `DISTILL_SCHEMA` and require a
  narrowed/declined guardrail instead of fabricating a lesson when evidence is weak.
  The reference must not instruct the app to edit a skill, steering file, or decision
  ledger.
- [ ] Add a source-sync test that reads the skill and reference from the repository and
  proves Distill is routed, both classification values and all six lesson fields match
  the server contract, and durable application is explicitly assigned to
  `reconcile-whp`.

**Binding suite:** `cd script-creator/server && npx vitest run test/operations/distillation-skill-contract.test.ts test/operations/schemas.test.ts`

**Commit:** `feat(skill): define WHP lesson distillation`

### Task 2: Learning store and state migration v10

**Files:**

- Create `script-creator/server/src/learning/store.ts`
- Modify `script-creator/server/src/state-migrations.ts`
- Modify `script-creator/server/src/documents/store.ts`
- Modify `script-creator/server/src/topics/store.ts`
- Test `script-creator/server/test/learning/store.test.ts`
- Modify `script-creator/server/test/state-migrations.test.ts`
- Modify `script-creator/server/test/documents/store.test.ts`
- Modify `script-creator/server/test/topics/store.test.ts`

- [ ] Add the single v10 migration. Persist `learning_sessions`; pointer-only
  `decision_events` and optional `decision_notes`; immutable `distillation_runs` plus
  their ordered decision/prior-lesson joins; `lessons` with proposed/reviewed text,
  classification, explicit state, rationale, target hint, supersession pointer and
  optimistic version; `lesson_evidence`; durable `lesson_reconciliations`;
  append-only `validator_attempts`; and `operation_lessons` with lesson ID and exact
  applied content hash.
- [ ] Use foreign keys where the source is app-local and retain namespaced source IDs
  where evidence is projected from multiple tables. Add uniqueness constraints for one
  normalized decision per source/disposition, one evidence link per lesson/decision,
  one operation/lesson application, and one active reconciliation workflow per lesson.
- [ ] Preserve durable candidate text only through
  `approved-pending-reconcile`. On verified application, atomically replace local text
  with repository commit/path/anchor/hash provenance. Keep agent rationale and source
  decision IDs as workflow metadata.
- [ ] Rebuild `narration_proposals` in v10 to add the explicit `rerolled` terminal state,
  optional reason note, and successor operation ID without losing v9 accepted,
  rejected, dismissed, pending, or timestamps. Do not overload `rejected` to mean
  re-rolled.
- [ ] Add migration fixtures for fresh, populated v9, and already-v10 databases. Prove
  all store constructors converge on v10, existing `drafts.doc_json` and revision
  snapshots are byte-identical, retained v9 proposal states survive, and only facts
  provable from v9 are backfilled.

**Binding suite:** `cd script-creator/server && npx vitest run test/learning/store.test.ts test/state-migrations.test.ts test/documents/store.test.ts test/topics/store.test.ts`

**Commit:** `feat(script-creator): persist learning lifecycle provenance`

### Task 3: Mechanical decision projection and capture

**Files:**

- Create `script-creator/server/src/learning/decisions.ts`
- Create `script-creator/server/src/learning/service.ts`
- Modify `script-creator/server/src/job-store.ts`
- Modify `script-creator/server/src/documents/store.ts`
- Modify `script-creator/server/src/documents/service.ts`
- Modify `script-creator/server/src/architecture/service.ts`
- Modify `script-creator/server/src/topics/store.ts`
- Modify `script-creator/server/src/topics/service.ts`
- Modify `script-creator/server/src/http/app.ts`
- Modify `script-creator/server/src/daemon.ts`
- Test `script-creator/server/test/learning/decisions.test.ts`
- Test `script-creator/server/test/learning/service.test.ts`
- Modify `script-creator/server/test/architecture/service.test.ts`
- Modify `script-creator/server/test/topics/service.test.ts`
- Modify `script-creator/server/test/http/operations.test.ts`
- Modify `script-creator/server/test/http/topics.test.ts`
- Modify `script-creator/server/test/http/validator.test.ts`

- [ ] Implement the decision table above as a deterministic projector. Resolve full
  context only on read/freeze: immutable envelope, structured/raw result or retained
  failure, disposition, optional reason, base/current/proposed text, adjacent revision
  diff, artifact/section/variant/PI IDs, and source timestamps. Redact only process-local
  paths and nonce-like transport fields; never summarize or editorialize evidence.
- [ ] Add idempotent typed capture at the existing service boundary for every new
  action. Proposal resolution accepts `accepted | rejected | rerolled`; resume records
  the successor operation. Architecture rejection records a source pointer without
  inventing a no-op content revision. Variant picks use a fixed disposition codec.
  Gate actions are observed only after their existing saga/revision boundary completes.
- [ ] Persist a package direction selection on its existing `package_tests` row and
  expose an idempotent pick action. Capture the winner only when the topic-handoff saga
  completes; its decision resolves the run summary, chosen package when present,
  accepted brief, and resulting draft.
- [ ] Make PI integration resolve as an accepted proposal only after the atomic
  narration/PI-block save succeeds. A PI reject/re-roll records that disposition but
  never treats Martin's supplied text as accepted material.
- [ ] Append every validator result before returning it to the UI. Build a
  `validator-fix-cycle` decision only when a failed exact-hash attempt is followed by a
  persisted production-document change and a later attempt at a new hash. Keep raw
  diagnostics and revision links; never translate structural validation into approval,
  evidence quality, rights clearance, or `RECORD-READY`.
- [ ] Add `GET /api/drafts/:id/decisions` with stable ordering/cursor pagination and a
  typed endpoint for optional reject/re-roll notes. Test every counted and excluded
  event, restart/idempotent replay, missing result files, stale proposal resolution,
  duplicate package picks, saga pause/resume, validator pass-without-fix exclusion, and
  exact context resolution.

**Binding suite:** `cd script-creator/server && npx vitest run test/learning/decisions.test.ts test/learning/service.test.ts test/architecture/service.test.ts test/topics/service.test.ts test/http/operations.test.ts test/http/topics.test.ts test/http/validator.test.ts`

**Commit:** `feat(script-creator): capture explicit editorial decisions`

### Task 4: Capture dispositions from production controls

**Files:**

- Modify `script-creator/app/src/app/api/client.ts`
- Modify `script-creator/app/src/app/api/client.spec.ts`
- Modify `script-creator/app/src/app/editor/editor-host.ts`
- Modify `script-creator/app/src/app/editor/editor-host.spec.ts`
- Modify `script-creator/app/src/app/architecture/model.ts`
- Modify `script-creator/app/src/app/architecture/model.spec.ts`
- Modify `script-creator/app/src/app/architecture/architecture-panel.ts`
- Modify `script-creator/app/src/app/topics/full-run-panel.ts`
- Modify `script-creator/app/src/app/topics/topics-composition.spec.ts`
- Modify `script-creator/app/src/app/production/production-panel.ts`
- Modify `script-creator/app/src/app/editor/studio-composition.spec.ts`

- [ ] Route Accept, Reject, and Re-roll through the typed durable disposition APIs.
  Reject and Re-roll expose a keyboard-reachable optional one-line **Why?** affordance;
  submitting it is one action, skipping it remains one keystroke, and the note is sent
  verbatim without client interpretation.
- [ ] Wrap the real variant Pick command so its atomic autosave carries the fixed
  variant-set/alternative disposition. Preview toggles, compare, Mix submission, and
  parking-lot browsing do not emit a pick.
- [ ] Persist architecture proposal rejection before removing its card. Keep a failed
  capture visible/retryable, and preserve the proposal until the server confirms.
  Architecture acceptance continues through the existing revision-checked save.
- [ ] Add an explicit **Use this package** action to stored package-test directions;
  show the selected direction in handoff preview and preserve the selection across
  reload. `survives_honestly` remains an agent result, never an automatic pick.
- [ ] Keep PI acceptance settlement after the editor transaction/autosave boundary, and
  show failed validator attempts as the start of a visible fix cycle without calling
  them editorial decisions or approvals.
- [ ] Extend the real routed composition specs to drive one accept, reject with reason,
  re-roll without reason, variant preview then pick, architecture reject, package pick,
  confirmed winner handoff, PI reject then accept, and validator fail/edit/pass cycle.
  Assert the typed calls and exact IDs/notes, not direct model callbacks.

**Binding suites:** `cd script-creator/app && npx vitest run src/app/api/client.spec.ts src/app/editor/editor-host.spec.ts src/app/architecture/model.spec.ts src/app/topics/topics-composition.spec.ts src/app/editor/studio-composition.spec.ts`

**Commit:** `feat(script-creator): record learning dispositions from the UI`

---

## Block B — Distillation, review, and application

### Task 5: Strict read-only distillation runs

**Files:**

- Modify `script-creator/server/src/operations/registry.ts`
- Modify `script-creator/server/src/operations/schemas.ts`
- Modify `script-creator/server/src/operations/service.ts`
- Modify `script-creator/server/src/learning/store.ts`
- Modify `script-creator/server/src/learning/decisions.ts`
- Modify `script-creator/server/src/learning/service.ts`
- Modify `script-creator/server/src/http/app.ts`
- Modify `script-creator/server/src/daemon.ts`
- Modify `script-creator/server/test/operations/registry.test.ts`
- Modify `script-creator/server/test/operations/schemas.test.ts`
- Modify `script-creator/server/test/operations/envelope.test.ts`
- Test `script-creator/server/test/http/lessons.test.ts`
- Modify `script-creator/server/test/learning/service.test.ts`

- [ ] Finalize `DISTILL_SCHEMA` with the shared strict
  `status`/`guardrail_markdown` frame and the six required lesson fields from the
  contract. Meta-tests prove recursive strictness, both classifications, nullable
  target/supersession fields, read-only sandbox, fresh-only policy, scoped timeout, and
  exact operation label.
- [ ] Add on-demand and session-end distillation routes. Before submitting Codex,
  transactionally freeze one run containing trigger, draft/session IDs, the ordered
  decision IDs through the selected cursor, resolved decision snapshots, and existing
  lesson snapshots. Session-end closes the current durable window; on-demand leaves it
  open. Empty decision windows return a typed no-op and launch nothing.
- [ ] Build the immutable input as exactly
  `{session: {id, draft_id, trigger, decisions}, existing_lessons}`. The prompt remains
  `$writing-whp-youtube-scripts`, `Operation: Distill session lessons`, and verbatim
  JSON. No app-authored definition, heuristic, example lesson, target advice, or
  reconciliation instruction enters the envelope.
- [ ] Resolve applied durable prior lessons from their verified current repository
  pointers. If a path/anchor/hash is stale, include a typed unresolved prior record and
  surface the problem to Martin; do not fall back to cached durable text.
- [ ] On result, mechanically require evidence to be a nonempty subset of the frozen
  decision IDs, validate supersession IDs, preserve agent Markdown verbatim, and insert
  proposed lessons plus evidence in one idempotent transaction. Narrowed/declined,
  invalid schema, invalid evidence, interruption, or cancellation creates no lesson.
- [ ] Expose distillation run state and opaque resume/recovery information. Test daemon
  restart before launch, while running, after result but before ingestion, repeated
  ingestion, two simultaneous requests, session cursor boundaries, prior lesson
  resolution, guardrails, and malformed evidence.

**Binding suite:** `cd script-creator/server && npx vitest run test/operations/registry.test.ts test/operations/schemas.test.ts test/operations/envelope.test.ts test/learning/service.test.ts test/http/lessons.test.ts`

**Commit:** `feat(script-creator): distill decision sessions into proposals`

### Task 6: Lesson review, retirement, supersession, and reconcile handoffs

**Files:**

- Modify `script-creator/server/src/learning/store.ts`
- Modify `script-creator/server/src/learning/service.ts`
- Modify `script-creator/server/src/repo/git.ts`
- Modify `script-creator/server/src/http/app.ts`
- Modify `script-creator/server/src/daemon.ts`
- Modify `script-creator/server/test/learning/store.test.ts`
- Modify `script-creator/server/test/learning/service.test.ts`
- Modify `script-creator/server/test/repo/git.test.ts`
- Modify `script-creator/server/test/http/lessons.test.ts`

- [ ] Add list/detail APIs that always return proposal text, reviewed text, rationale,
  classification, state, evidence IDs with resolved provenance, target hint,
  supersession relationship, optimistic version, and application/reconciliation
  provenance. Missing evidence is an explicit stale link, not silently omitted.
- [ ] Add revision-checked actions for edit, approve, reject, retire, and supersede.
  Editing preserves the original proposal and remains `proposed`; approval freezes
  Martin's exact reviewed text. Reject is terminal but stays visible in history.
- [ ] For episode-local approval, atomically activate the lesson for exactly one draft.
  Retire removes it immediately from active context. Approving a replacement with a
  valid predecessor activates the replacement and marks the predecessor superseded in
  one transaction; cycles and cross-draft supersession are refused.
- [ ] For durable approval, create an idempotent reconciliation workflow and prepared
  Markdown handoff. It must identify the candidate as a proposal, include exact evidence
  and rationale, request `$reconcile-whp`, and state that the reconcile skill—not the
  app—chooses and edits affected steering/skill files and `DECISIONS.md`. Returning or
  copying the handoff performs no repository write.
- [ ] Add read-only confirmation of a completed reconciliation commit. Validate that the
  commit exists in the selected repository/worktree history, records a
  `DECISIONS.md` change and at least one reconcile-selected skill/steering change, and
  capture exact paths/content anchors/hashes. Do not stage or commit. On success,
  atomically clear the app's durable text copy and mark the lesson `applied`.
- [ ] Durable retire/supersede creates another prepared reconcile handoff and remains
  pending until an independently committed repository edit verifies. Test wrong commit,
  commit without ledger change, moved/edited doctrine pointers, retry after verification,
  a reconcile no-op remaining unapplied until Martin rejects it as duplicate or supplies
  valid existing-doctrine provenance, episode-local instant retirement, durable pending
  retirement, and no filesystem mutation from any lesson API.

**Binding suite:** `cd script-creator/server && npx vitest run test/learning/store.test.ts test/learning/service.test.ts test/repo/git.test.ts test/http/lessons.test.ts`

**Commit:** `feat(script-creator): review and reconcile approved lessons`

### Task 7: Authoritative episode-local envelope context

**Files:**

- Modify `script-creator/server/src/learning/store.ts`
- Modify `script-creator/server/src/learning/service.ts`
- Modify `script-creator/server/src/architecture/service.ts`
- Modify `script-creator/server/src/operations/service.ts`
- Modify `script-creator/server/src/http/app.ts`
- Modify `script-creator/server/src/daemon.ts`
- Modify `script-creator/server/test/learning/service.test.ts`
- Modify `script-creator/server/test/architecture/service.test.ts`
- Modify `script-creator/server/test/http/operations.test.ts`
- Modify `script-creator/server/test/operations/envelope.test.ts`
- Modify `script-creator/app/src/app/panels/brief-panel.ts`
- Modify `script-creator/app/src/app/panels/brief-panel.spec.ts`
- Modify `script-creator/app/src/app/ops/context.spec.ts`
- Modify `script-creator/app/src/app/architecture/inputs.spec.ts`
- Modify `script-creator/app/src/app/production/sections.spec.ts`

- [ ] For every draft-scoped writing operation—architecture Generate/Review/Rewrite,
  narration Generate/Review/Rewrite/Alternatives, PI integration, and Promote—strip
  client `approved_lessons` and inject the ordered active episode-local reviewed texts
  loaded for that draft. Keep creative status and approved architecture/narration
  authority from Plan 6 unchanged.
- [ ] Record `operation_lessons` only after the durable operation exists, with lesson
  IDs, optimistic versions, and hashes matching the exact strings in the immutable
  envelope. Reconcile a crash between operation creation and application recording by
  comparing the persisted envelope and active lesson snapshot; never mutate an existing
  envelope.
- [ ] Exclude proposed, rejected, retired, superseded, durable-pending, and durable-applied
  records from `approved_lessons`. Durable-applied doctrine is already read by the
  loaded skill and must not be double-supplied.
- [ ] Remove the freeform `approvedLessons` editor from BriefPanel. Preserve legacy
  document bytes but treat any `metadata.approvedLessons` value as nonauthoritative and
  visibly legacy if encountered; v10 has no real data to backfill because this field is
  empty in current use.
- [ ] Add forged-client, wrong-draft, post-retirement, supersession, ordered-multiple,
  operation-resume, Promote, legacy-metadata, and restart tests. Deep envelope assertions
  prove every applied string comes from one approved episode-local record and no extra
  editorial key or prose appears.

**Binding suites:** `cd script-creator/server && npx vitest run test/learning/service.test.ts test/architecture/service.test.ts test/http/operations.test.ts test/operations/envelope.test.ts`; `cd script-creator/app && npx vitest run src/app/panels/brief-panel.spec.ts src/app/ops/context.spec.ts src/app/architecture/inputs.spec.ts src/app/production/sections.spec.ts`

**Commit:** `feat(script-creator): supply approved episode lessons authoritatively`

### Task 8: Routed Lessons review queue and envelope visibility

**Files:**

- Create `script-creator/app/src/app/lessons/model.ts`
- Create `script-creator/app/src/app/lessons/lessons-panel.ts`
- Create `script-creator/app/src/app/lessons/lessons-page.ts`
- Modify `script-creator/app/src/app/api/client.ts`
- Modify `script-creator/app/src/app/api/client.spec.ts`
- Modify `script-creator/app/src/app/app.routes.ts`
- Modify `script-creator/app/src/app/app.routes.spec.ts`
- Modify `script-creator/app/src/app/app.html`
- Modify `script-creator/app/src/app/panels/agent-console.ts`
- Modify `script-creator/app/src/app/panels/agent-console.spec.ts`
- Modify `script-creator/app/src/app/editor/studio-composition.spec.ts`
- Test `script-creator/app/src/app/lessons/model.spec.ts`

- [ ] Add a production `/lessons` route and masthead link. The page selects a draft,
  shows its open/closed session windows and decision feed, and offers **Distill now** and
  **End session & distill** with live operation/guardrail/error state. It never launches
  automatically on navigation or unload.
- [ ] Render proposed lessons as review cards with classification, proposed text,
  rationale, exact evidence links, target hint, supersession, and stale-provenance
  warnings. Support edit-before-approve, explicit Approve, Reject, Retire, and
  Supersede with optimistic-conflict recovery. No toggle or edit silently approves.
- [ ] For approved episode-local lessons, show Active and the affected draft. For durable
  candidates, show the prepared reconcile handoff, a Copy action, external-run
  instructions, and a separate confirmation form for the resulting commit. The UI must
  say plainly that Script Creator does not edit or commit doctrine.
- [ ] Show pending/verified durable retirement and supersession without pretending the
  repository changed early. Resolve applied durable text from repository provenance and
  show stale pointers as blocking reconciliation work.
- [ ] Extend Agent Console selection to fetch the immutable operation record and render
  a **Supplied lessons** section from its envelope. Link every row through
  `operation_lessons` to the exact lesson/version; show `None` for an empty array and
  distinguish repository-native durable doctrine from supplied episode-local context.
- [ ] Extend `studio-composition.spec.ts` with the real App/router, LessonsPage,
  LessonsPanel, AgentConsole, and stub client. Navigate via the masthead; capture
  decisions; run Distill; open evidence; edit then approve one local lesson; reject one;
  approve one durable candidate; inspect/copy its handoff; confirm a simulated external
  commit; retire the local lesson; request durable retirement; then inspect an operation
  envelope. Assertions must query rendered production controls.
- [ ] Cover keyboard order, labelled textareas, approval/rejection confirmation,
  `aria-live` distillation state, readable provenance links, copy failure, and
  narrow-screen stacking.

**Binding suite:** `cd script-creator/app && npx vitest run src/app/api/client.spec.ts src/app/app.routes.spec.ts src/app/lessons/model.spec.ts src/app/panels/agent-console.spec.ts src/app/editor/studio-composition.spec.ts`

**Commit:** `feat(script-creator): compose the routed lessons review queue`

---

## Block C — End-to-end proof

### Task 9: Fake modes, browser sweep, and real Distill spot operation

**Files:**

- Modify `script-creator/server/test/fake-codex.mjs`
- Modify `script-creator/server/test/fake-codex.test.ts`
- Modify `script-creator/app/package.json`
- Modify `script-creator/app/package-lock.json`
- Create `script-creator/app/e2e/plan7-browser-sweep.ts`
- Create `script-creator/server/e2e/plan7-real-ops.ts`
- Modify `script-creator/server/package.json`

- [ ] Add deterministic Distill fake modes selected from the submitted operation and
  actual strict schema: complete mixed-scope proposals, duplicate prior lesson,
  valid supersession, invalid evidence ID, narrowed, declined, and `plan7-flow`.
  Results cite decision IDs received in the envelope; fixtures may not hard-code IDs
  absent from the submitted session.
- [ ] Extend the built-app sweep pattern using `FAKE_CODEX_MODE=plan7-flow`, a temporary
  local clone, and isolated XDG data/state directories. Seed nothing in the developer
  checkout and always remove the clone and daemon state.
- [ ] Drive proposal accept/reject/re-roll with reason, variant pick, architecture gate,
  package pick, winner handoff, PI integration, validator fail/edit/pass, session-end
  Distill, evidence review, edit-before-approve, episode-local approval, later operation
  envelope inspection, local retirement, durable approval, prepared handoff, externally
  simulated reconcile commit in the temporary clone, verified apply, and durable
  retirement handoff. Assert no app request edits or commits skill/steering files.
- [ ] Restart the daemon once after the Distill result and before ingestion, and once
  while a durable handoff awaits external reconciliation. Prove proposals, session
  cursors, lesson states, provenance, and active envelope context recover without
  duplication.
- [ ] Add an env-gated real-codex script (`RUN_REAL_CODEX=1`) that submits one small
  read-only Distill operation with two synthetic but explicit decision records and one
  prior lesson, verifies the raw strict result/evidence subset, and performs no lesson
  approval, repository write, reconciliation, or commit.
- [ ] Give both scripts deterministic VERIFIED/FAILED output and nonzero exit on
  failure. The browser sweep is binding; the real operation is a transport/schema spot
  check, not evidence that Martin approved its lesson.

**Binding commands:** `cd script-creator/app && npm run e2e:plan7`; `cd script-creator/server && RUN_REAL_CODEX=1 npm run e2e:plan7-real`

**Commit:** `test(script-creator): automate the plan 7 learning sweep`

### Task 10: Evidence and close-out

**Files:**

- Create `docs/superpowers/evidence/2026-07-24-script-creator-plan7-learning.md`

- [ ] Record two consecutive host-suite totals, typechecks, Angular build,
  distillation skill-contract sync, v9→v10 and already-v10 fixtures, the counted/excluded
  decision matrix, session/restart recovery, strict schema failures, applied-operation
  lesson IDs/hashes, browser-sweep transcript, and real-codex Distill spot result.
- [ ] Record durable-boundary evidence from the temporary clone: prepared handoff bytes,
  zero repository diff before external reconciliation, externally created reconciliation
  commit/path/hash provenance, successful read-only confirmation, cleared local durable
  text, and zero app-originated skill/steering/ledger writes or commits.
- [ ] Run a fresh whole-branch review against FR-8, the accepted technical design, the
  Plan 6 standing contracts, `reconcile-whp`, the Distill skill reference, and this
  plan. Fix every blocker and rerun each affected binding suite twice.
- [ ] Confirm the complete diff contains no app-authored lesson heuristics, no duplicate
  prompt layer, no injected durable doctrine, no automatic reconciliation or git commit,
  no validator-to-approval transition, no changed `WHP_PROGRESS/3` contract, no hidden
  `RECORD-READY` transition, and no migration above v10.

**Binding command:** `git diff --check`

**Commit:** `docs(script-creator): record plan 7 verification evidence`

## Verification

Run the following from a clean `script-creator-plan7-learning`
implementation worktree. A single green run is diagnostic; the final evidence records
two consecutive green host runs.

```bash
cd script-creator/server
npx vitest run
npx vitest run
npx tsc --noEmit

cd ../editor-core
npx vitest run
npx vitest run
npx tsc --noEmit

cd ../app
npx vitest run
npx vitest run
npx tsc --noEmit
npx ng build
npm run e2e:plan7

cd ../../.agents/skills/writing-whp-youtube-scripts/scripts
python3 -m unittest test_validate_annotated_script.py

cd ../../../../script-creator/server
RUN_REAL_CODEX=1 npm run e2e:plan7-real

cd ../..
git diff --check
git status --short
```

The browser sweep is binding for decision capture, session distillation, human review,
episode-local application, durable handoff, external reconciliation verification, and
retirement recovery. The real-codex spot script is intentionally limited to the new
read-only Distill operation. Human lesson approval, repository reconciliation, doctrine
edits, and commits are deliberately excluded from real-agent automation.

## Out of scope

- Script Creator does not invoke `reconcile-whp`, edit `.agents` or steering files,
  append `DECISIONS.md`, preview a repository diff of its own making, stage files, or
  commit durable doctrine. It only prepares the handoff and verifies provenance after
  Martin completes the existing repository flow.
- Plan 7 does not invent or backfill events v9 never retained. Historical architecture
  rejects, old optional reasons, unselected package directions, and overwritten failed
  validator diagnostics remain unknowable.
- Agent outputs, quick gate-check verdicts, `survives_honestly`, validator passes,
  autosaves, restores, and milestone commits do not become lessons without an explicit
  Martin disposition.
- Durable-applied lessons are not copied into `approved_lessons`; they apply through the
  repository-loaded skill/steering doctrine. Episode-local lessons do not leak to other
  drafts or plain-chat sessions.
- There is no app-owned learned-preference prompt, hidden instruction synthesis,
  semantic/vector memory, automatic clustering, model fine-tuning, or retention/CTR
  feedback import.
- Sessions are explicit durable decision windows. The app does not infer "session end"
  from inactivity, browser close, daemon shutdown, or a date boundary.
- Plan 7 does not change topic scoring/gates, architecture quality rules, narration
  methods, Phase-2 evidence/rights judgment, validator rules, product milestone git
  flow, readiness promotion, or `WHP_PROGRESS/3`.
- Read-aloud/TTS, claims board, readiness dashboard, Shorts planner,
  teleprompter/table-read/export UI, draft branching, search, retention analytics,
  thumbnail generation, and guyditor integration remain in their recorded later-version
  scopes.
