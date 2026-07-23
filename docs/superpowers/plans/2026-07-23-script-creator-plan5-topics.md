# Script Creator — Plan 5: Topic Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FR-1 complete in the running app: capture ideas, brainstorm angles, gate-check cheaply, run the full topic-selection protocol with its mandated checklist live on screen, browse candidates on a sortable board, test packages, and hand a selected topic off as a studio draft plus a repo brief — with the pipeline board showing where every episode stands.

**Architecture:** extends the three existing packages. Server: ideas/candidates/lessons-free topic store tables, a progress endpoint over the existing `WHP_PROGRESS/1` parser, structured-summary extraction, and a pipeline read API. App: two new routes (`/topics`, `/pipeline`) composed from day one with a real-component composition spec (the Plan 4 F3 rule is now law). Fake codex gains a full-run mode emitting progress markers and a fenced summary so the whole surface is deterministic in the browser.

**Contract decision (recorded here, consistent with the design's intent):** the design's "structured summary sidecar" for the full run is transported as a fenced ```whp-summary JSON block at the end of the run's final report message — a serialization of the tables the topic skill's output contract already mandates (same legitimacy argument as `WHP_PROGRESS/1`). The server extracts it on completion into the store; the canonical Markdown report still lands in `whp-youtube/topic-runs/` in real runs. No filesystem coupling for the board.

**Sequence note:** the merged architecture-first amendment (approve script architecture before episode-scale narration) does not gate this plan — topic selection precedes architecture. The focused architecture-UI design is now a prerequisite inserted before Plan 6's Promote depth.

## Global Constraints

- Branch `script-creator-plan5-topics`; commit per task, scope `script-creator`.
- Envelope purity as in Plans 3–4 (structural inputs only; provenance style tests for the new topic operations' input builders).
- The topic skill owns the protocol; the app renders its checklist and tables verbatim — no editorial or research logic app-side. Idea/candidate records are Martin's text plus skill outputs, never app-synthesized judgments.
- Every UI task lands composed: the topic composition spec mounts the real routed components and drives rendered controls (Plan 4's net pattern), extended in the same task that adds the surface.
- Repo writes only through the existing CAS artifact service (`whp-youtube/topics/<slug>.md`, `PIPELINE.md` upsert).
- Binding green per touched package: full `npx vitest run` + `npx tsc --noEmit` (+ `ng build` for the app). Browser verification is the controller's.
- Full-run real execution is NOT part of E2E (30–120 min, heavy tokens — deliberate exclusion recorded in evidence); the deterministic fake full-run plus one real quick-gate-check and one real ideate cover the live-skill path.

## File Structure

```text
server: src/topics/store.ts        — ideas(id, text, source, createdAt, status),
                                     runs(id, opId, state, reportMd, summaryJson, createdAt),
                                     migrations v3
        src/topics/service.ts      — idea CRUD; run registration; summary extraction
                                     (fenced whp-summary parse, ajv-validated vs a strict schema);
                                     progress snapshot via parseWhpProgress
        routes: /api/ideas CRUD, /api/topic-runs (list/register/get incl. progress+summary),
                /api/pipeline (parse PIPELINE.md + draft states)
        test/fake-codex.mjs        — mode full-topic-run: N progress marker messages
                                     (pending→active→done across the twelve ids), report final
                                     message ending with a fenced whp-summary block
app:    src/app/topics/…           — TopicsPage (idea inbox, ideate cards, gate-check chips,
                                     package table, run console with live checklist, candidate
                                     board, handoff dialog), composed + routed
        src/app/pipeline/…         — PipelinePage kanban (idea → candidate → selected →
                                     prototyping → creative-approved → production …)
        src/app/topics/inputs.ts   — provenance-pure input builders for ideate / gate-check /
                                     package-test / full-run / handoff
```

---

### Task 1: topic store and endpoints (server)

Ideas CRUD (text + source tag `inbox|ideate`, status `open|promoted|discarded`); run registration keyed to an operation id; `GET /api/topic-runs/:id` returns `{state, progress: ChecklistState, summary?: object, reportMd?: string}` — progress computed from the operation's journaled events via the existing parser, summary extracted once at terminal completion from the fenced block (strict-schema validated; absent/invalid summary → `summary: null` plus a `summaryError` string, never a crash). `/api/pipeline` merges `PIPELINE.md` rows with draft creative states. Inject tests per route incl. 401s; extraction unit tests (valid, absent, malformed JSON, schema-violating).
Commit `feat(script-creator): topic store, run progress, and pipeline endpoints`.

### Task 2: fake full-run mode + summary schema (server)

`full-topic-run` fake mode: emits the twelve checklist ids transitioning to done as agent messages interleaved with generic events, then a final report markdown ending with a valid fenced `whp-summary` block (candidates with six gates, shortlist rows with seven `score/grade` pairs, three package directions, winner block). The strict summary schema joins the registry (meta-test covers it). Unit test: runner + fake → journaled markers parse to a complete checklist; extraction yields the summary.
Commit `feat(script-creator): deterministic full-run fixtures with fenced summary`.

### Task 3: topic input builders (app)

`src/app/topics/inputs.ts` — pure builders for the five topic operations from explicit state (idea text, user constraints, run artifacts, selected winner), provenance-spec'd like Plan 4's (start from stored state + user action; assert every key/value origin; no extra keys).
Commit `feat(script-creator): provenance-pure topic operation inputs`.

### Task 4: Topics page — inbox, ideate, gate-check (app)

Routed `/topics` page composed from day one. Idea inbox: capture box + list with status controls. Ideate: launch from selected ideas/free text → result cards (subject/angle) appended as `ideate`-sourced ideas. Gate-check: per-idea launch → six gate chips (pass/fail/unknown with reasons on expand) + verdict badge; guardrail/failure callouts reuse Plan 4 components. Composition spec extension mounts the real routed page with a stub client: capture → list; ideate result → cards; gate-check result → chips.
Commit `feat(script-creator): topics page with inbox, ideate, and gate checks`.

### Task 5: full-run console and candidate board (app)

Launch full run (constraints form → inputs builder); live checklist renders the twelve rows from `/api/topic-runs/:id` polling (2 s while running) with the skill's verbatim texts; on completion: report rendered (markdown), candidate board from the summary — sortable by total and per-criterion, gate chips, packaging directions table with survival highlighting, winner card. `summaryError` renders honestly with the raw report still available. Composition spec: run lifecycle against stub client with progress snapshots → rows advance; summary → board sorts.
Commit `feat(script-creator): live full-run checklist and candidate board`.

### Task 6: package tester and handoff (app)

Package tester: for a chosen finalist, launch package-test → directions table (columns per the skill's stress-test), survival highlighting, history kept per idea in the store. Handoff: from the winner card → handoff-preview op → brief preview → on Martin's confirm: create a studio draft carrying the brief metadata (topic, anchors, unknowns, phase explicitly set), write `whp-youtube/topics/<slug>.md` via the CAS artifact endpoint surfacing conflicts, upsert the pipeline row to `selected`, mark the idea `promoted`, navigate to the studio draft. Composition spec covers the confirm path with stub client (draft created, artifact called, pipeline updated).
Commit `feat(script-creator): package tester and topic-to-draft handoff`.

### Task 7: pipeline board (app)

`/pipeline` kanban: columns from the design's state list; cards merge PIPELINE.md rows + draft states; clicking a card opens its draft/topic. Read-only in V1 beyond what real actions already move. Composition spec: stub pipeline payload renders columns/cards; navigation wired.
Commit `feat(script-creator): pipeline board`.

### Task 8 (controller): browser E2E + real ops

Deterministic sweep (daemon + fake codex): capture idea → ideate cards → gate-check chips → full run with live checklist advancing → board sorting → package directions → handoff confirm → draft exists with brief + topics/ artifact + pipeline card moved. Then real codex: one quick-gate-check and one small ideate through the UI (full run deliberately excluded — recorded). Fix loops as needed (composition net should make them rare).

**Live finding — durable topic runs are authoritative:** the Decide section lists recent
runs from `GET /api/topic-runs`, newest first. Selecting a run hydrates its checklist,
report, and structured summary through the same renderer used during a live launch. A new
run auto-selects and refreshes the list when it becomes terminal. Package testing and
handoff consume the selected run's durable summary rather than launch-local memory.

### Task 9: evidence + close-out

Evidence doc from real outputs; final whole-branch review (fresh reviewer); fix loops to PASS/APPROVED.

## Plan sequence reminder

Next: the **focused architecture-UI design** (required by the 2026-07-23 architecture-first amendment) → Plan 6 (architecture stage + Promote/Phase 2 depth + validator UI + milestone git flow) → Plan 7 (learning loop).
