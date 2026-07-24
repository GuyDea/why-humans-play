# Script Creator — Plan 6: Architecture, Production, and Milestones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Script Creator V1 path from a selected topic through an explicitly approved script architecture, approved rapid narration, validated Phase-2 production document, and deliberate repository milestone commits.

**Architecture:** Extend the existing document store rather than create a second editor model: narration remains ProseMirror JSON, while the architecture is a section-structured sibling artifact with its own revisions and whole-artifact approval state. Draft-scoped server actions enforce phase gates and inject the exact approved architecture into narration operations; Angular renders a real routed Architecture panel before the narration editor and treats every agent result as a proposal. Promote becomes a staged flow whose Phase-2 output is incomplete until the exact output hash passes the skill-owned validator, and repository writes are routed through a per-episode milestone workspace whose commits always require a separate explicit user action.

**Tech Stack:** Node 24, Fastify 5, better-sqlite3, Angular 20 standalone components and signals, framework-agnostic ProseMirror editor-core, Vitest, the existing Python validator, git worktrees, and Playwright for the scripted browser sweep.

## Contract decisions

- Architecture approval and Reopen are kinds of one persisted architecture-saga
  contract. Any pending kind reserves generic narration revision writes, is exposed
  with its kind and opaque resume key, resumes through the same route, and returns the
  current architecture state on recoverable pauses so the routed editor blocks without
  a reload. Cancelling a racing accepted-proposal save preserves its operation
  provenance with the pending dirty state for the post-resume save and settlement.
- The accepted [architecture-stage amendment](../specs/2026-07-23-script-creator-architecture-ui-design.md) is normative for Block A. The app copies its nine fixed sections and their key/title/order contract, then performs only mechanical split, join, storage, rendering, and gating. It does not encode architecture quality, required insight counts, evidence judgments, or any other editorial rule from the script skill.
- Architecture section `md` retains the complete `###` section slice, including its heading and separators. This lets fixed and unrecognized sections round-trip byte-for-byte; `key` and `title` are routing metadata, not a second serialization. A rewrite result must mechanically parse to one section with the requested key before it can become a proposal.
- Architecture approval stores `approvedMd` as the exact joined architecture without the repository header. The canonical `whp-youtube/architectures/<slug>.md` file is a mechanical header containing title, approval date, and approved status followed by that exact `approvedMd`. Narration envelopes receive `approved_architecture_md: approvedMd`, not the header and not text reconstructed by the app.
- Generate and Promote are draft-scoped submissions. The client supplies a draft ID outside the codex envelope; the server loads the authoritative draft, enforces the phase gate, and adds only stored supplied context. A caller cannot unlock either operation by forging `creative_status` or `approved_architecture_md`.
- Promote is necessarily staged: architecture approval and complete-narration approval unlock the Phase-2 agent run; the resulting episode file must then pass `validator --json` at its exact content hash before the Promote workflow may complete, write its production milestone, or move the pipeline to `production`. This satisfies the three Promote gates without requiring a Phase-2 validator result before a Phase-2 document exists.
- Validator success is structural only. It never changes the script to `RECORD-READY`, approves evidence or rights, or substitutes for human editorial judgment.
- CAS claims stay bounded to the guarantee implemented by `repo/artifacts.ts`: no silent overwrite across the checked content identity and human-timescale concurrent edits, with both versions parked on a detected race; no claim is made about the documented irreducible sub-millisecond rename window.
- The Plan 4 F3 law applies to every UI task: the production routed draft page is composed in the same task as its real components, and `studio-composition.spec.ts` drives rendered controls. No detached component is allowed to stand in for integration evidence.
- All operation envelopes remain provenance-pure: skill reference + operation label + explicit stored/user inputs. The app contributes no hook advice, architecture method, evidence rule, production rubric, or other editorial prose.
- `WHP_PROGRESS/2` remains the only topic-run progress contract. Plan 6 does not add, rename, or reinterpret any of its thirteen IDs or skill-authored texts.
- Product milestone commits and the conventional implementation commits named below are separate concerns. The implemented app never auto-commits; each product milestone exposes a distinct **Commit milestone** action.

## Functional-requirement coverage

| Requirement | Plan 6 result |
|---|---|
| FR-1.8 | Closes the remaining selected → architecture → prototyping → creative-approved → production pipeline transitions. |
| FR-2.1 | Closes generation, review, section-grain refinement, persistence, and whole-artifact approval for message architecture. The post-approval draggable beat-outline/re-stitch clause is not claimed by this plan. |
| FR-2.2 | Closes the architecture gate and authoritative approved-architecture context injection for episode-scale narration. |
| FR-5.1–FR-5.3 | Closes explicit complete-narration approval, staged Promote, milestone/reconciliation prompting, and human-controlled transitions. |
| FR-6.1 | Closes the annotated production view with collapsible production sections and a clean-narration toggle. |
| FR-6.3 | Closes the personal-input queue and proposal-based integration of material Martin actually supplies. |
| FR-6.4 | Closes validator execution and line/beat/field diagnostic presentation on the routed draft page. |
| FR-7.1 | Extends the existing revision history to architecture changes and gate actions; it does not reopen the already-closed narration-history work. |
| FR-7.3 | Closes canonical architecture/draft/episode milestone writes and explicit git milestone commits. |

## Global constraints

- Implementation branch: `script-creator-plan6-architecture`. Commit once per task with the exact conventional message named by that task.
- Migration v6 replaces the existing reserved placeholder. Existing v5 databases upgrade in place, and existing draft `doc_json` bytes remain untouched. Block B takes v7 for durable narration approval/promotion state; Block C takes v8 for milestone workspaces.
- The architecture stage has one fixed ordered section contract from the accepted amendment. Unrecognized extra `###` sections remain opaque and retain their relative position. The app never rejects architecture because of its editorial content.
- All three architecture operations are read-only sandbox operations. `generate-architecture` is the amendment’s raw-Markdown episode result; `review-architecture` and `rewrite-architecture-section` use recursively strict schemas with the shared `status` / `guardrail_markdown` frame. Registry and schema meta-tests cover all three additions.
- Generate/rewrite outputs never overwrite stored sections. They create per-section proposals with Accept / Reject; accepting is an architecture revision, and stale base revisions surface as conflicts.
- Scoped architecture operations inherit the daemon’s bounded resume policy (at most three immediate continuations with the complete current envelope); generation is a fresh episode operation and is not resumable.
- Approve and Reopen are synchronous gate actions. They append revisions immediately, never delete narration, and never infer approval from praise, operation completion, or validator success.
- The canonical architecture path is exactly `whp-youtube/architectures/<slug>.md`. The canonical rapid baseline remains `whp-youtube/drafts/<slug>.md`; the Phase-2 document remains `whp-youtube/episodes/<NN>-<slug>.md`.
- Existing app-local proposals, rejected output, variants, telemetry, findings, and validation snapshots never enter repository Markdown.
- Full host suites and typechecks stay green for every touched package. The architecture composition spec is binding for app integration; the scripted browser sweep is binding for the built app.

## File structure

```text
server:
  src/architecture/codec.ts       — fixed-section constants; mechanical split/join;
                                     canonical milestone header rendering
  src/architecture/service.ts     — architecture revisions, approval/reopen sagas,
                                     draft-scoped phase policy
  src/documents/{store,service}.ts
                                   — architecture sibling state, revision kind,
                                     narration-reconciliation and production state
  src/state-migrations.ts         — real v6 architecture migration; later v7
                                     promotion and v8 milestone-workspace bookkeeping
  src/operations/{registry,schemas}.ts
                                   — three architecture operations and strict schemas
  src/repo/{artifacts,git,milestones}.ts
                                   — architecture whitelist, worktree preparation,
                                     explicit-files milestone commits
  src/http/app.ts, src/daemon.ts  — draft-scoped actions and service wiring
  test/fake-codex.mjs             — architecture generate/review/rewrite and Promote
                                     fixtures selected from the submitted operation

app:
  src/app/architecture/inputs.ts  — provenance-pure input builders
  src/app/architecture/model.ts   — section proposals, findings, approval/reopen state
  src/app/architecture/architecture-panel.ts
                                   — section cards and artifact actions
  src/app/narration/narration-actions.ts
                                   — architecture gate callout and episode Generate
  src/app/production/sections.ts — mechanical appendix/PI/diagnostic view model
  src/app/production/production-panel.ts
                                   — annotated sections, PI queue, validator surface
  src/app/milestones/milestone-panel.ts
                                   — workspace choice, pending files, explicit commit
  src/app/drafts/draft-manager.component.ts
                                   — real routed reading order: Architecture → Narration
  src/app/editor/studio-composition.spec.ts
                                   — production-component integration net
  e2e/plan6-browser-sweep.ts      — built-app fake-codex sweep in a temporary local clone
```

---

## Block A — Architecture stage

### Task 1: Architecture codec and migration v6

**Files:**

- Create `script-creator/server/src/architecture/codec.ts`
- Modify `script-creator/server/src/state-migrations.ts`
- Modify `script-creator/server/src/documents/store.ts`
- Modify `script-creator/server/src/documents/service.ts`
- Test `script-creator/server/test/architecture/codec.test.ts`
- Test `script-creator/server/test/state-migrations.test.ts`
- Test `script-creator/server/test/documents/store.test.ts`
- Test `script-creator/server/test/documents/service.test.ts`

- [ ] Replace the v6 placeholder with columns/tables that persist `architecture: {sections, approvedMd, approvedAt}`, the last canonical artifact hash used for later CAS replacement, `narrationReconciliationRequired`, approval/reopen saga steps, and `revisions.kind` (`narration | architecture`). Existing revisions migrate as `narration`; existing drafts receive an empty, unapproved architecture and retain their document JSON exactly.
- [ ] Implement the amendment-owned section definitions and a heading-only codec. The fixed contract is the skill reference's "Architecture artifact" heading list — **eleven** sections in its exact order (package-and-audience … scope-boundary, per the corrected amendment). `splitArchitecture(md)` slices on level-three headings without parsing bodies, records fixed keys by exact title, assigns stable opaque keys to unrecognized sections, and retains any preamble as an opaque slice. `joinArchitecture(sections)` concatenates the stored slices exactly.
- [ ] Add a source-sync test that parses `### ` headings under `## Architecture artifact` in `.agents/skills/writing-whp-youtube-scripts/references/script-architecture.md` and asserts the fixed constants match count, order, and exact titles — skill drift must fail the server suite (same doctrine as the `WHP_PROGRESS/2` sync test).
- [ ] Implement `renderApprovedArchitecture({title, approvedDate, approvedMd})` as only the three-field mechanical header plus the exact joined body. No section presence, quality, insight-count, or evidence check belongs here.
- [ ] Add migration tests from fresh, v5 populated, and already-v6 databases; codec tests cover all fixed sections in order, CRLF, missing fixed sections, duplicated/unrecognized headings, opaque preamble, and byte-identical split → join.

**Binding suite:** `cd script-creator/server && npx vitest run test/architecture/codec.test.ts test/state-migrations.test.ts test/documents/store.test.ts test/documents/service.test.ts`

**Commit:** `feat(script-creator): persist sectioned architecture drafts`

### Task 2: Three architecture operation contracts

**Files:**

- Modify `script-creator/server/src/operations/registry.ts`
- Modify `script-creator/server/src/operations/schemas.ts`
- Modify `script-creator/server/test/operations/registry.test.ts`
- Modify `script-creator/server/test/operations/schemas.test.ts`
- Modify `script-creator/server/test/operations/envelope.test.ts`

- [ ] Register `generate-architecture` (`episode`, raw Markdown, read-only, fresh), `review-architecture` (`scoped`, read-only, resumable), and `rewrite-architecture-section` (`scoped`, read-only, resumable).
- [ ] Add the strict review result `{status, findings: [{section_key, severity, finding_markdown}], guardrail_markdown}` and strict rewrite result `{status, replacement_markdown, guardrail_markdown}`. `section_key` uses the fixed key enum; every object recursively has `additionalProperties: false`, every property is required, and optional semantics remain nullable.
- [ ] Extend the existing meta-tests so registry completeness, sandbox, timeout, result kind, resume policy, shared frame, recursive strictness, and fixed section-key enum fail mechanically on drift.
- [ ] Preserve the exact envelope builder. Tests prove the new prompts remain only `$writing-whp-youtube-scripts`, the registered operation label, and verbatim JSON inputs.

**Binding suite:** `cd script-creator/server && npx vitest run test/operations/registry.test.ts test/operations/schemas.test.ts test/operations/envelope.test.ts`

**Commit:** `feat(script-creator): register architecture skill operations`

### Task 3: Architecture revisions and draft-scoped phase policy

**Files:**

- Create `script-creator/server/src/architecture/service.ts`
- Modify `script-creator/server/src/documents/store.ts`
- Modify `script-creator/server/src/documents/service.ts`
- Modify `script-creator/server/src/http/app.ts`
- Modify `script-creator/server/src/daemon.ts`
- Test `script-creator/server/test/architecture/service.test.ts`
- Modify `script-creator/server/test/http/documents.test.ts`
- Modify `script-creator/server/test/http/operations.test.ts`

- [ ] Add `GET /api/drafts/:id/architecture` and revision-checked `PUT /api/drafts/:id/architecture`. A save accepts `{expectedRevisionSeq, sections, opId, disposition}`; mismatch returns 409 with current state, and success appends one `kind: architecture` revision synchronously.
- [ ] Add draft-scoped operation submission. The HTTP-only `draftId` never enters the codex inputs. `generate-episode` is refused unless the current phase is `rapid-prototype` and the architecture has `approvedMd` and `approvedAt`; the server then injects the stored `approved_architecture_md` verbatim. A reconciliation flag does not block generating a fresh whole narration from the newly approved architecture, but it continues to block narration approval and Promote until that result is accepted or reconciliation is explicitly confirmed.
- [ ] Refuse Promote while phase is `architecture`, architecture approval is absent/stale, narration reconciliation is required, or complete narration approval is absent. Keep scoped narration Review/Rewrite/Alternatives available in architecture phase only when the imported draft actually contains narration.
- [ ] Unit-test forged client phase/approval inputs, approved-context injection, imported narration routing, no-narration scoped refusal, reopen refusal, and the unchanged ≤3 resume policy.

**Binding suite:** `cd script-creator/server && npx vitest run test/architecture/service.test.ts test/http/documents.test.ts test/http/operations.test.ts`

**Commit:** `feat(script-creator): enforce draft-scoped architecture gates`

### Task 4: Architecture approval, canonical CAS milestone, and Reopen

**Files:**

- Modify `script-creator/server/src/architecture/service.ts`
- Modify `script-creator/server/src/repo/artifacts.ts`
- Modify `script-creator/server/src/topics/service.ts`
- Modify `script-creator/server/src/http/app.ts`
- Modify `script-creator/server/src/daemon.ts`
- Test `script-creator/server/test/repo/artifacts.test.ts`
- Test `script-creator/server/test/http/architecture.test.ts`
- Modify `script-creator/server/test/http/handoff.test.ts`
- Modify `script-creator/server/test/topics/service.test.ts`

- [ ] Whitelist only nonempty descendants of `whp-youtube/architectures/`, preserving traversal, symlink, identity, conflict parking, and atomic-write protections.
- [ ] Make topic handoff create phase `architecture` drafts and move `PIPELINE.md` to milestone `architecture`, not `selected`; retain the topic brief as the row ref until architecture approval.
- [ ] Add revision-checked `POST /api/drafts/:id/architecture/approve`. It freezes `approvedMd`, sets `approvedAt`, writes `whp-youtube/architectures/<slug>.md` with create-or-last-known-hash CAS, upserts pipeline milestone `prototyping` with that canonical ref, sets phase `rapid-prototype`, and records a resumable step state so retry after any boundary is idempotent. A CAS conflict stops before phase/pipeline advancement and surfaces current hash plus parked paths.
- [ ] Add `POST /api/drafts/:id/architecture/reopen` requiring `{confirmed: true, expectedRevisionSeq}`. It clears current approval, returns phase to `architecture`, moves the pipeline row back to `architecture`, preserves narration bytes, and sets `narrationReconciliationRequired` when narration exists. Reopen and later re-approval never clear that flag silently.
- [ ] Require exactly one mechanically recognized instance of every fixed section before approval, without inspecting any section body. Test first approval, missing/duplicate fixed-section refusal, re-approval against the recorded hash, external-edit conflict, retry after architecture write, retry after pipeline write, simultaneous approval serialization, Reopen with/without narration, and the bounded CAS race hooks.

**Binding suite:** `cd script-creator/server && npx vitest run test/repo/artifacts.test.ts test/http/architecture.test.ts test/http/handoff.test.ts test/topics/service.test.ts`

**Commit:** `feat(script-creator): approve and reopen architecture milestones`

### Task 5: Schema-aware fake codex architecture modes

**Files:**

- Modify `script-creator/server/test/fake-codex.mjs`
- Modify `script-creator/server/test/fake-codex.test.ts`
- Modify `script-creator/server/test/operations/service.test.ts`
- Modify `script-creator/server/test/http/operations.test.ts`

- [ ] Add deterministic modes for Generate Architecture, Review Architecture, and Rewrite Architecture Section plus one `plan6-flow` dispatcher that reads the submitted operation label and emits the matching result. Generate returns a complete heading-structured Markdown artifact with one opaque extra section; Review and Rewrite synthesize from the actual output schema.
- [ ] Keep generic schema synthesis enum-aware: array item index cycles every enum (especially `section_key` and `severity`) instead of returning the first enum value for every finding. `status` still selects `complete` unless a guardrail mode explicitly overrides it.
- [ ] Test raw result-file behavior, strict-schema output, section/severity cycling, narrowed/declined guardrails, and resume keeping the same rewrite target.

**Binding suite:** `cd script-creator/server && npx vitest run test/fake-codex.test.ts test/operations/service.test.ts test/http/operations.test.ts`

**Commit:** `test(script-creator): add schema-aware architecture agent fixtures`

### Task 6: Provenance-pure Architecture client and model

**Files:**

- Modify `script-creator/app/src/app/api/client.ts`
- Create `script-creator/app/src/app/architecture/inputs.ts`
- Create `script-creator/app/src/app/architecture/model.ts`
- Test `script-creator/app/src/app/architecture/inputs.spec.ts`
- Test `script-creator/app/src/app/architecture/model.spec.ts`
- Modify `script-creator/app/src/app/api/client.spec.ts`

- [ ] Add typed draft architecture read/save/approve/reopen and draft-scoped operation methods. Transport errors preserve 409 conflict bodies so section revision and repository CAS conflicts render distinctly.
- [ ] Build exact inputs from explicit state: Generate `{topic_brief, approved_lessons, user_constraints}`; Review `{architecture_md, topic_brief}`; Rewrite `{section_key, section_markdown, architecture_md, topic_brief, user_instruction}`. Deep key/value assertions prove every field comes verbatim from stored brief/architecture/lessons or the user action and that no extra key exists.
- [ ] Implement an Angular-free `ArchitectureModel`: load state; launch raw Generate and split to per-section proposals; Accept All or accept/reject one; launch Review and pin findings by `section_key`; launch Rewrite with base revision and create one replacement proposal; surface guardrails/failures; preserve proposal base/current/proposed on a stale save; invoke approve/reopen without optimistic phase changes.
- [ ] Model tests cover generated fixed/opaque proposals, partial acceptance, one-revision Accept All, reject without mutation, stale refine conflict, review findings, guardrail, approve conflict, and reopen confirmation.

**Binding suite:** `cd script-creator/app && npx vitest run src/app/architecture/inputs.spec.ts src/app/architecture/model.spec.ts src/app/api/client.spec.ts`

**Commit:** `feat(script-creator): add provenance-pure architecture state`

### Task 7: Real routed Architecture panel and narration unlock

**Files:**

- Create `script-creator/app/src/app/architecture/architecture-panel.ts`
- Create `script-creator/app/src/app/narration/narration-actions.ts`
- Modify `script-creator/app/src/app/drafts/draft-manager.component.ts`
- Modify `script-creator/app/src/app/editor/editor-host.ts`
- Modify `script-creator/app/src/app/panels/brief-panel.ts`
- Modify `script-creator/app/src/app/editor/studio-composition.spec.ts`
- Modify `script-creator/app/src/styles.scss`

- [ ] Mount `<app-architecture-panel>` on the production routed draft page before `<app-editor-host>` in reading and DOM order. The panel uses section cards with rendered Markdown; Generate from brief, Review all, Refine with an explicit instruction, per-section proposal Accept/Reject, Accept All, pinned findings, operation/guardrail callouts, and no freeform section editor.
- [ ] Render an approval ribbon (`Needs architecture`, `Approved <date>`, or `Reopened — narration reconciliation required`), explicit Approve action, CAS conflict detail, and a Reopen confirmation that states narration is preserved but must be reconciled.
- [ ] Add narration actions to the real draft page. Generate Episode and Promote callouts name the missing gate mechanically; architecture approval enables episode-scale narration. After Reopen and re-approval, a fresh Generate Episode remains available as a reconciliation path while Promote remains disabled. Every narration-generation submission uses the server’s stored `approved_architecture_md`.
- [ ] Treat raw episode generation as a whole-document proposal: preview the returned Markdown, Accept to parse/replace only the narration document while preserving architecture/brief metadata, or Reject with no mutation. Accepting a result generated from the current approved architecture clears `narrationReconciliationRequired`; otherwise only a separate revision-checked **Mark narration reconciled** confirmation may clear it.
- [ ] Extend the existing production composition spec in this same task. With the real router, DraftManager, ArchitecturePanel, NarrationActions, EditorHost, BriefPanel, and a stub client, drive: Generate → per-section proposals → reject one and Accept All remaining → Refine one section → accept replacement → Review finding pinned to that card → Approve → ribbon changes → Generate Episode unlocks → canonical architecture and pipeline calls observed → Reopen confirm → narration unchanged, reconciliation callout visible, Generate and Promote disabled.
- [ ] In a companion path in that same composition spec, click Generate Episode, Reject once without mutation, rerun and Accept, then assert narration replacement and reconciliation-flag clearing against the approved architecture hash.
- [ ] Add keyboard focus, button labels, `aria-live` operation status, narrow-screen stacking, and rendered-Markdown sanitization coverage. The test must query production controls; direct model calls are not accepted as composition evidence.

**Binding suite:** `cd script-creator/app && npx vitest run src/app/editor/studio-composition.spec.ts`

**Commit:** `feat(script-creator): compose the architecture approval studio`

---

## Block B — Promote depth and validator UI

### Task 8: Complete-narration approval and staged Promote service

**Files:**

- Modify `script-creator/server/src/documents/store.ts`
- Modify `script-creator/server/src/documents/service.ts`
- Modify `script-creator/server/src/architecture/service.ts`
- Modify `script-creator/server/src/state-migrations.ts`
- Modify `script-creator/server/src/http/app.ts`
- Modify `script-creator/server/src/daemon.ts`
- Modify `script-creator/server/src/repo/artifacts.ts`
- Modify `script-creator/server/test/state-migrations.test.ts`
- Test `script-creator/server/test/http/narration-approval.test.ts`
- Test `script-creator/server/test/http/promote.test.ts`
- Modify `script-creator/server/test/documents/service.test.ts`

- [ ] Add migration v7 for durable narration approval and staged promotion records. Replace the editable `directionApproved` checkbox as the gate of record with an explicit server action that freezes the exported complete narration as `approvedNarrationMd` / `approvedNarrationAt`. It requires current architecture approval, no reconciliation flag, settled variants/proposals, and revision identity; it writes the canonical `whp-youtube/drafts/<slug>.md` via CAS and moves the pipeline to `creative-approved`.
- [ ] Promote submission requires both approved baselines and builds a provenance-pure envelope from topic brief, approved lessons, `approved_architecture_md`, `approved_narration_md`, creative status, and the user-selected `whp-youtube/episodes/<NN>-<slug>.md` target. Promote remains fresh, `workspace-write`, and long-timeout.
- [ ] Persist a staged promotion record (`running | output-ready | validation-required | complete | failed`) keyed to draft and operation. On successful agent completion, verify the exact whitelisted target exists, capture its hash, import its annotated Markdown into the existing draft as a new revision while preserving architecture/approval metadata, and stop at `validation-required`.
- [ ] Keep the pipeline and durable production milestone at `creative-approved` until final validation. A raw completion/guardrail report never becomes editorial text and never advances the phase by itself.
- [ ] Test every missing gate, stale narration revision, unsettled export, architecture/reconciliation refusal, exact envelope provenance, target-path validation, missing output, guardrail, imported annotated output, retry idempotence, and no pipeline production move before validation.

**Binding suite:** `cd script-creator/server && npx vitest run test/state-migrations.test.ts test/http/narration-approval.test.ts test/http/promote.test.ts test/documents/service.test.ts`

**Commit:** `feat(script-creator): stage approved narration promotion`

### Task 9: Phase-2 production sections and personal-input queue

**Files:**

- Create `script-creator/app/src/app/production/sections.ts`
- Create `script-creator/app/src/app/production/production-panel.ts`
- Modify `script-creator/app/src/app/editor/editor-host.ts`
- Modify `script-creator/app/src/app/drafts/draft-manager.component.ts`
- Modify `script-creator/app/src/app/editor/studio-composition.spec.ts`
- Test `script-creator/app/src/app/production/sections.spec.ts`

- [ ] Build a mechanical view over existing `opaqueSection.md` nodes: identify Script metadata, beat-matched appendix entries, their named level-four subsections, Personal input blocks, Viewer application blocks, audits, and end references without judging their content. Unknown headings remain opaque and visible.
- [ ] Render annotated production sections as collapsible cards matched to narration beats. The clean-narration toggle hides production nodes visually without deleting or reserializing them; toggling back proves byte-identical export.
- [ ] Turn each `PI-###` `INPUT-REQUESTED` block into a form containing the skill-authored primary and follow-up prompts. Martin’s response is explicit supplied context for a scoped skill operation targeting the matching narration marker. The returned narration is a proposal; only Accept replaces the marker and mechanically changes that exact block’s Decision to `COMPLETED` in the same editor transaction. Reject preserves both marker and block. The app never invents, summarizes, or silently edits Martin’s material.
- [ ] Keep `OMIT` and already-`COMPLETED` blocks read-only in this V1 queue. Invalid/duplicate IDs and unmatched markers surface as structural diagnostics; they do not trigger app-authored repair.
- [ ] Extend the real composition spec with promoted annotated Markdown: collapse/expand production cards, clean narration round-trip, submit supplied PI text, inspect the exact provenance input, reject once, re-run and accept, then verify marker removal + Decision change are atomic and undoable.

**Binding suites:** `cd script-creator/app && npx vitest run src/app/production/sections.spec.ts src/app/editor/studio-composition.spec.ts`; `cd script-creator/editor-core && npx vitest run test/codec-roundtrip.test.ts test/codec-export.test.ts test/proposals-accept.test.ts`

**Commit:** `feat(script-creator): render phase-two production sections`

### Task 10: Validator surface and Promote completion gate

**Files:**

- Modify `script-creator/server/src/repo/validator.ts`
- Modify `script-creator/server/src/http/app.ts`
- Modify `script-creator/server/src/documents/service.ts`
- Modify `script-creator/server/test/repo/validator.test.ts`
- Modify `script-creator/server/test/http/validator.test.ts`
- Modify `script-creator/server/test/http/promote.test.ts`
- Modify `script-creator/server/test/fake-codex.mjs`
- Modify `script-creator/server/test/fake-codex.test.ts`
- Modify `script-creator/app/src/app/api/client.ts`
- Modify `script-creator/app/src/app/production/sections.ts`
- Modify `script-creator/app/src/app/production/production-panel.ts`
- Modify `script-creator/app/src/app/panels/brief-panel.ts`
- Modify `script-creator/app/src/app/editor/studio-composition.spec.ts`

- [ ] Return validator diagnostics with the validated repo-relative path and SHA-256 hash while preserving the validator’s existing `{ok, errors[{message,line}]}` contract and invocation: resolve the skill from the repo, set cwd to its directory, and pass the absolute script path after `--json --` with argument arrays.
- [ ] Map line numbers mechanically to the nearest narration beat, appendix beat, or named field using the exact exported Markdown. Show global diagnostics when no local owner exists; do not reproduce or reinterpret validator rules in TypeScript.
- [ ] Add `POST /api/drafts/:id/promote/complete`. It re-reads the target, reruns validation server-side, requires `ok` at the current hash, records the production milestone, sets phase `production`, and moves the pipeline to `production`. Any edit after a displayed pass makes the UI badge stale and forces a fresh pass.
- [ ] Surface validator Run / Re-run, pass/fail/stale badge, diagnostic count, line number, matched beat/field, and raw message on the real draft page. Promote remains visibly incomplete until the server completion action succeeds.
- [ ] Add a fake Promote mode that reads its submitted target path, writes a deterministic annotated production fixture in the isolated repo, and emits a raw completion report. Add invalid-production and guardrail modes for failure coverage.
- [ ] Extend the composition spec through narration approval → Promote → production section import → validator failures pinned → fixture correction/re-run → exact-hash pass → explicit Complete Promote → pipeline production. Assert that neither operation completion nor validator pass changes `RECORD-READY`.

**Binding suites:** `cd script-creator/server && npx vitest run test/repo/validator.test.ts test/http/validator.test.ts test/http/promote.test.ts test/fake-codex.test.ts`; `cd script-creator/app && npx vitest run src/app/editor/studio-composition.spec.ts`

**Commit:** `feat(script-creator): gate promotion on validator diagnostics`

---

## Block C — Milestone git flow

### Task 11: Managed episode workspaces and pending milestones

**Files:**

- Modify `script-creator/server/src/state-migrations.ts`
- Create `script-creator/server/src/repo/milestones.ts`
- Modify `script-creator/server/src/repo/git.ts`
- Modify `script-creator/server/src/topics/service.ts`
- Modify `script-creator/server/src/architecture/service.ts`
- Modify `script-creator/server/src/documents/service.ts`
- Modify `script-creator/server/src/operations/service.ts`
- Modify `script-creator/server/src/daemon.ts`
- Test `script-creator/server/test/repo/milestones.test.ts`
- Modify `script-creator/server/test/repo/git.test.ts`
- Modify `script-creator/server/test/state-migrations.test.ts`

- [ ] Add migration v8 for per-episode workspace choice and pending milestone records: draft/slug, chosen branch, worktree path, milestone kind, exact files, proposed commit message, source hashes, state, and resulting commit hash. No editorial content is stored.
- [ ] Implement the blocking first-write choice: recommended new branch off the detected local default branch with editable task name, or current branch only after explicit selection. New-branch choice creates/reuses one managed git worktree per episode; current-branch choice records the exact current branch and root. Dirty unrelated files are reported and never staged.
- [ ] Route topic handoff, architecture approval/reopen, complete-narration approval, Promote, validator, pipeline writes, and draft-scoped codex `-C` through the recorded episode workspace. A draft with no workspace choice cannot perform its first repo write.
- [ ] Record pending milestones after successful writes: topic selection, architecture approval/reopen, creative narration approval, and production promotion. Reconciliation-required decisions surface that state but do not auto-launch or auto-apply reconciliation.
- [ ] Keep git/validator work in the design’s separate serialized lane. Worktree creation and milestone recording are idempotent across daemon restart; a changed branch/path or changed file hash surfaces a conflict rather than silently adopting it.
- [ ] Test default-branch detection, recommended branch creation off the local default, explicit current-branch choice, dirty unrelated files, existing worktree resume, same-name branch conflict, path safety, operation cwd routing, restart recovery, and no repository write before choice.

**Binding suite:** `cd script-creator/server && npx vitest run test/repo/milestones.test.ts test/repo/git.test.ts test/state-migrations.test.ts`

**Commit:** `feat(script-creator): prepare managed episode milestone worktrees`

### Task 12: Explicit milestone commit API and routed UI

**Files:**

- Modify `script-creator/server/src/repo/milestones.ts`
- Modify `script-creator/server/src/repo/git.ts`
- Modify `script-creator/server/src/http/app.ts`
- Modify `script-creator/server/src/daemon.ts`
- Test `script-creator/server/test/http/milestones.test.ts`
- Modify `script-creator/server/test/repo/milestones.test.ts`
- Modify `script-creator/app/src/app/api/client.ts`
- Create `script-creator/app/src/app/milestones/milestone-panel.ts`
- Modify `script-creator/app/src/app/drafts/draft-manager.component.ts`
- Modify `script-creator/app/src/app/editor/studio-composition.spec.ts`

- [ ] Add status/workspace/pending-milestone endpoints and `POST /api/drafts/:id/milestones/:kind/commit`. The commit route accepts only the pending milestone ID and an explicit confirmation; files and message come from the durable record, not arbitrary browser paths.
- [ ] On commit, recheck branch/worktree identity and recorded file hashes, stage only the explicit files, run `git diff --check --cached -- <files>`, commit with the recorded message, save the hash, and leave unrelated staged/unstaged/untracked files untouched. Nothing calls this endpoint as a side effect of Approve, Reopen, Validate, or Promote.
- [ ] Mount a Milestone panel on the real draft route. Before the first repo write it blocks on the two branch-location choices; afterward it shows branch/worktree, dirty-file warning, pending milestone files and diff summary, reconciliation prompt where applicable, and a distinct **Commit milestone** confirmation.
- [ ] Extend the composition spec to prove Approve Architecture writes but does not commit; Commit milestone calls once with the pending ID; Narration approval and Promote each create separate pending milestones; a dirty unrelated file remains out of every requested file list; commit failure remains pending and recoverable.
- [ ] Keep implementation task commit messages conventional while product milestone messages are derived mechanically from milestone kind and episode slug, shown before confirmation, and immutable once the pending record is created.

**Binding suites:** `cd script-creator/server && npx vitest run test/http/milestones.test.ts test/repo/milestones.test.ts test/repo/git.test.ts`; `cd script-creator/app && npx vitest run src/app/editor/studio-composition.spec.ts`

**Commit:** `feat(script-creator): add explicit milestone commit controls`

---

### Task 13: Scripted browser sweep and real-codex spot operations

**Files:**

- Modify `script-creator/app/package.json`
- Modify `script-creator/app/package-lock.json`
- Create `script-creator/app/e2e/plan6-browser-sweep.ts`
- Create `script-creator/server/e2e/plan6-real-ops.ts`
- Modify `script-creator/server/package.json`

- [ ] Add a Playwright sweep that builds/starts the actual daemon and routed Angular app against `FAKE_CODEX_MODE=plan6-flow` in a temporary local clone and isolated XDG directories. It must never write milestones or commits into the developer checkout.
- [ ] Drive topic handoff → architecture Generate → per-section accepts → Review pins → one section Refine/accept → Approve → narration unlock → architecture file/pipeline verification → Reopen flag → re-approval → complete-narration approval → fake Promote → production sections → PI proposal → validator fail/pass → Complete Promote → pending milestone → explicit commit. Assert no earlier action creates a commit.
- [ ] Add an env-gated real-codex script (`RUN_REAL_CODEX=1`) that submits one small Generate Architecture, one Review Architecture, and one Rewrite Architecture Section operation using provenance-pure inputs, verifies raw/strict results and approved-context narration gating, and performs no approval, repository write, Promote, or commit.
- [ ] Give both scripts deterministic VERIFIED/FAILED output and nonzero exit on failure; always shut down the daemon and remove temporary state.

**Binding commands:** `cd script-creator/app && npm run e2e:plan6`; `cd script-creator/server && RUN_REAL_CODEX=1 npm run e2e:plan6-real`

**Commit:** `test(script-creator): automate the plan 6 browser and real-op sweep`

### Task 14: Evidence and close-out

**Files:**

- Create `docs/superpowers/evidence/2026-07-24-script-creator-plan6-architecture.md`

- [ ] Record two consecutive host-suite totals, typechecks, Angular build, Python validator suite, browser-sweep transcript, real-codex spot results, migration fixtures, canonical/CAS conflict evidence, explicit git file lists and hashes, and all deviations or residual risks.
- [ ] Run a fresh whole-branch review against the accepted amendment, technical design, requirements, and this plan. Fix every blocker and rerun the affected binding suite twice.
- [ ] Confirm the diff contains no app-authored editorial prompt text, no changed skill editorial rules, no `WHP_PROGRESS/2` drift, no auto-commit path, no hidden `RECORD-READY` transition, and no unrequested files in milestone commits.

**Binding command:** `git diff --check`

**Commit:** `docs(script-creator): record plan 6 verification evidence`

## Verification

Run the following from a clean `script-creator-plan6-architecture` implementation worktree. A single green run is diagnostic; the final evidence records two consecutive green host runs.

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
npm run e2e:plan6

cd ../../.agents/skills/writing-whp-youtube-scripts/scripts
python3 -m unittest test_validate_annotated_script.py

cd ../../../../script-creator/server
RUN_REAL_CODEX=1 npm run e2e:plan6-real

cd ../..
git diff --check
git status --short
```

The browser sweep is binding for the complete fake-mode lifecycle. The real-codex spot script is intentionally limited to the three new read-only architecture operations; the 30–120 minute Promote operation, human approvals, milestone writes, and git commits are deliberately excluded from real-agent automation.

## Out of scope

- The FR-8 learning loop—decision capture, lesson distillation, review queue, durable-doctrine application, and retirement—remains Plan 7. Plan 6 only surfaces reconciliation-required milestone prompts.
- Read-aloud / TTS remains deferred beyond V1 (FR-2.7).
- Architecture editing remains section-grain. Inline selection-grade architecture editing, architecture locks, and architecture variants are not added.
- The post-approval draggable beat-outline/re-stitch clause of FR-2.1 is not implemented or claimed closed here.
- Claims board, readiness dashboard, Shorts planner, teleprompter/table-read/export UI, draft branching, search, retention analytics, thumbnail generation, and guyditor integration remain in their recorded later-version scopes.
- The app does not gain architecture editorial validators, evidence/rights judgment, automatic readiness promotion, or any copy of the script skill’s architecture or Phase-2 rules.
