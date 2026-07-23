# Script Creator — Plan 3: Daemon and Operation Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the two proven spikes into the application backend: a localhost Fastify daemon with nonce+origin security and reconnectable SSE, the full typed operation layer over the codex transport (strict schemas, guardrail surfacing, bounded resume, sandbox/timeout classes), progress and telemetry, repo artifact and git-milestone integration, the validator `--json` mode, and the document endpoints Plan 4's Angular app will consume.

**Architecture:** Everything extends `script-creator/server/` from Spike 1 (supervisor, runner, store, fake codex) and consumes `script-creator/editor-core/` from Spike 2 via a `file:` dependency for codec round-trips at the repo boundary. HTTP tests use `fastify.inject` (no sockets) so they run in any sandbox; the one real-network, real-codex verification is the env-gated E2E task.

**Tech Stack:** adds fastify ^5, @types/better-sqlite3; everything else as in Spike 1.

**Calibration (from Spike 1 + 2 evidence):** verbatim test code is provided for the invariant-bearing contracts (schema strictness, envelope purity, security rejection matrix, SSE resume, cancel-deadline persistence); remaining coverage is specified as named behaviors with exact API contracts — the implementer owns internals and mechanical test bodies. Deviations require a report entry, as before.

## Global Constraints

- Branch `script-creator-plan3-daemon`; commit after every task, scope `script-creator` (Task 15's commit uses scope `skill`).
- Operations carry **zero editorial instruction**: envelopes contain only the skill reference, operation name, and caller-supplied inputs (including approved `approved_lessons` riders). Editorial method lives in the skills.
- **Strict structured-output rule (Spike 1, verified live):** every schema property appears in `required`; optionality is expressed as nullable types. This is mechanically enforced by a meta-test (Task 6) — no schema may ship that violates it.
- Tokens verbatim or `unavailable` — never estimated. `error` items can be non-fatal; `turn.failed` is terminal and must surface distinctly (Spike 1 F6).
- Sandbox split (design): `read-only` for scoped ops (Generate, Review, Rewrite, Alternatives, Ideate, Quick gate-check, Package test, handoff preview, Distill); `workspace-write` only for Full topic-selection run, Promote, and approved reconcile/lesson application.
- Hard timeout classes (design): 15 min scoped / 30 min episode-scale Generate + handoff / 120 min full run + Promote; soft-stall flag after 120 s without an event.
- Repo writes only under `whp-youtube/` whitelisted paths; atomic; never clobber external edits (content-hash check). Git milestones: branch check, staged explicit files, `git diff --check`, deliberate commit only.
- Daemon binds `127.0.0.1` only; every request requires the per-launch nonce; non-loopback `Origin` values are rejected.
- Host `npx vitest run` + `npx tsc --noEmit` in `script-creator/server/` are the binding green. Editor-core suite must stay green (unchanged except its `package.json` gaining `"main"`).
- Authorized out-of-package edits, and nothing else outside `script-creator/server/`: `script-creator/editor-core/package.json` (add `"main": "src/index.ts"`, Task 1) and `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py` + its test file (Task 15, per accepted requirements decision 7).

## File Structure (new/modified under `script-creator/server/`)

```text
src/xdg.ts                 — resolveAppDirs(repoRoot, env): { dataDir, stateDir, jobsRoot, runtimeFile }
src/operations/registry.ts — OPERATIONS table: name, skill, sandbox, timeoutClass, result kind, resumePolicy
src/operations/schemas.ts  — strict JSON schemas (shared frame + per-op payloads)
src/operations/envelope.ts — buildEnvelopePrompt(op, inputs): string
src/operations/service.ts  — OperationService over JobSupervisor: submit/get/events/cancel/resume/result
src/operations/progress.ts — parseWhpProgress(events): ChecklistState; mapConsoleEvents(events): ConsoleEntry[]
src/documents/store.ts     — drafts + revisions + op-log tables (extends state DB, migrations v2)
src/documents/service.ts   — draft CRUD, revision append, codec import/export at repo boundary
src/repo/artifacts.ts      — whitelisted atomic writes, PIPELINE.md upsert, content-hash guard
src/repo/git.ts            — milestone commit flow against any repo path (tests use temp repos)
src/repo/validator.ts      — runValidatorJson(scriptPath): Diagnostics (shells to the skill script)
src/http/app.ts            — buildApp({nonce, service, …}): FastifyInstance (origin+nonce hooks, routes)
src/http/sse.ts            — SSE encoding with seq resume (Last-Event-ID / ?fromSeq)
src/daemon.ts              — launch entrypoint: port, nonce, runtime file, reattach, graceful stop
test/… mirrors src (named per task); e2e/daemon-spike.ts (env-gated real verification)
```

Supervisor/runner/store gain: persisted cancel deadlines, `turn.failed` extraction, XDG wiring, real better-sqlite3 types.

---

### Task 1 (controller): dependencies and cross-package link

- [ ] Add to `script-creator/server/package.json` dependencies: `"fastify": "^5.0.0"`, `"@whp/script-creator-editor-core": "file:../editor-core"`; devDependencies: `"@types/better-sqlite3": "^7.6.0"`. Add `"main": "src/index.ts"` to `script-creator/editor-core/package.json`. `npm install` in `script-creator/server/`. Both suites + typechecks green. Commit `feat(script-creator): wire daemon dependencies and editor-core link`.

### Task 2: real better-sqlite3 types (Spike 1 deferral)

**Files:** Delete `src/better-sqlite3.d.ts`; adjust `src/job-store.ts` typing to the real `Database` types (no `unknown`-returning shims). Tests unchanged.
**Contract:** `npx tsc --noEmit` clean with `@types/better-sqlite3`; all existing tests green; no behavioral change. Commit `feat(script-creator): adopt maintained better-sqlite3 types`.

### Task 3: real failure-event fixtures and turn.failed handling

**Files:** `test/fixtures/events-failed.jsonl` (constructed from the Spike 1 evidence shapes: `thread.started`, `turn.started`, non-fatal `item.completed` error item, top-level `{"type":"error","message":…}`, `{"type":"turn.failed","error":{…}}`); fake-codex mode `turn-failed`; `src/runner.ts` extracts the `turn.failed` error message into `status.errorMessage` (state `failed` even when the process exits 0); supervisor exposes it on the job record.
**Verbatim test (add to `test/runner.test.ts`):**

```ts
  it('surfaces turn.failed distinctly with its error message', async () => {
    const jobDir = makeJobDir({});
    await runRunner(jobDir, 'turn-failed');
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(status.state).toBe('failed');
    expect(status.errorMessage).toContain('invalid_json_schema');
    expect(status.usage).toBeUndefined();
  });
```

Commit `feat(script-creator): surface turn.failed with real failure fixtures`.

### Task 4: persisted cancellation deadlines (Spike 1 deferral)

**Files:** `src/job-store.ts` (columns `cancel_requested_at`, `cancel_deadline_at`), `src/supervisor.ts`.
**Contract:** `cancel()` persists the request and deadline; the escalation timer is derived from the persisted deadline; `reattach()` re-arms escalation for `cancelling` jobs from the stored deadline (fire immediately if past). Regression: cancel with `graceMs: 400`, stop the supervisor before escalation, recreate + reattach on the same DB against an `ignore-sigint` runner, assert the job still reaches `cancelled` and the process group dies. Commit `feat(script-creator): persist cancellation deadlines across restarts`.

### Task 5: XDG layout

**Files:** `src/xdg.ts` + test.
**Contract:** `resolveAppDirs(repoRoot, env)` → `dataDir = $XDG_DATA_HOME|~/.local/share` + `/whp-script-creator/<repo-id>/`, `stateDir = $XDG_STATE_HOME|~/.local/state` + …, `jobsRoot = stateDir + 'jobs/'`, `runtimeFile = stateDir + 'daemon.json'`; `<repo-id>` = 12-hex prefix of sha256(absolute repo root); dirs created; fully env-injectable for tests. Commit `feat(script-creator): xdg app directories keyed by repo`.

### Task 6: operation registry and strict schemas

**Files:** `src/operations/registry.ts`, `src/operations/schemas.ts` + tests.
**Registry (normative):** entries for `generate-scoped`, `generate-episode`, `review`, `rewrite-selection`, `generate-alternatives`, `promote`, `ideate`, `quick-gate-check`, `package-test`, `full-topic-run`, `handoff-preview`, `distill` — each `{ name, skill: 'writing-whp-youtube-scripts' | 'choosing-whp-video-topic', operationLabel, sandbox, timeoutClass: 'scoped' | 'episode' | 'long', result: { kind: 'schema', schema } | { kind: 'raw' }, resumable: boolean }` per the design table (scoped script ops resumable; everything else not).
**Schemas:** design-appendix core four plus `ideate`, `package_test`, `distill` shapes — ALL rewritten strict (every property required; optionality nullable). Shared frame `status`/`guardrail_markdown` everywhere.
**Verbatim meta-test (`test/operations/schemas.test.ts`):**

```ts
import { describe, expect, it } from 'vitest';
import { OPERATIONS } from '../../src/operations/registry.js';

function assertStrict(schema: Record<string, unknown>, path: string): void {
  if (schema.type === 'object' || schema.properties) {
    const props = Object.keys((schema.properties ?? {}) as Record<string, unknown>);
    const required = (schema.required ?? []) as string[];
    expect(schema.additionalProperties, `${path}.additionalProperties`).toBe(false);
    for (const p of props) expect(required, `${path}.required must include ${p}`).toContain(p);
    for (const p of props) assertStrict((schema.properties as Record<string, Record<string, unknown>>)[p]!, `${path}.${p}`);
  }
  if (schema.items) assertStrict(schema.items as Record<string, unknown>, `${path}[]`);
}

describe('operation schemas', () => {
  it('every schema operation is strict-mode compatible', () => {
    for (const op of Object.values(OPERATIONS)) {
      if (op.result.kind === 'schema') assertStrict(op.result.schema as Record<string, unknown>, op.name);
    }
  });

  it('every schema shares the status/guardrail frame', () => {
    for (const op of Object.values(OPERATIONS)) {
      if (op.result.kind !== 'schema') continue;
      const props = (op.result.schema as { properties: Record<string, unknown> }).properties;
      expect(Object.keys(props), op.name).toEqual(expect.arrayContaining(['status', 'guardrail_markdown']));
    }
  });
});
```

Plus behavior tests: registry completeness (all twelve names), sandbox/timeout assignments match the Global Constraints. Commit `feat(script-creator): operation registry with strict schemas`.

### Task 7: envelope builder

**Files:** `src/operations/envelope.ts` + test.
**Contract:** `buildEnvelopePrompt(op, inputs)` returns exactly `` `$${op.skill}\nOperation: ${op.operationLabel}\nInputs: ${JSON.stringify(inputs)}` `` — nothing else.
**Verbatim purity test:**

```ts
  it('contains only the skill reference, operation label, and verbatim inputs', () => {
    const op = OPERATIONS['rewrite-selection']!;
    const inputs = { topic_brief: null, approved_lessons: ['Keep hooks short.'], selection: 'x', surrounding_context: { before: 'a', after: 'b' }, narrative_job: 'j', creative_status: { phase: 'rapid-prototype' }, requested_scope: 'replace only' };
    const prompt = buildEnvelopePrompt(op, inputs);
    expect(prompt).toBe(`$writing-whp-youtube-scripts\nOperation: Rewrite selection\nInputs: ${JSON.stringify(inputs)}`);
  });
```

Commit `feat(script-creator): pure operation envelopes`.

### Task 8: operation service

**Files:** `src/operations/service.ts` + tests (fake codex).
**Contract:** `class OperationService { constructor({supervisor, store, clock?}) ; submit(opName, inputs, opts?: {resumeOf?: string}): string ; get(id): OperationRecord ; events(id, fromSeq?) ; cancel(id) ; result(id): {kind:'schema', value, guardrail} | {kind:'raw', markdown} | {kind:'failed', error} | {kind:'pending'} }`. Behaviors: schema file + sandbox + `-C` repo root from the registry; per-class hard timeouts cancel the job (timeout source injectable clock); soft-stall flag on the record after 120 s without events; `declined/narrowed` status and `guardrail_markdown` pass through as first-class result fields, never errors; resume allowed only for `resumable` ops, max 3 chained `resumeOf` hops (policy in DB), full inputs required again. Named tests: happy schema op; raw op; guardrail declined; timeout-cancel; stall flag; resume chain limit; non-resumable refusal. Commit `feat(script-creator): operation service over the job supervisor`.

### Task 9: progress parsing and console mapping

**Files:** `src/operations/progress.ts` + test.
**Contract:** `parseWhpProgress(events)` folds `agent_message` lines matching `WHP_PROGRESS/1 <id> <pending|active|done|unknown> :: <text>` into ordered checklist state (unknown ids appended; later lines win; `unknown` keeps its text); `mapConsoleEvents(events)` → `[{seq, kind: 'thread'|'turn'|'message'|'tool'|'warning'|'failure'|'other', text}]` with `turn.failed` → `failure`, non-fatal error items → `warning`, raw preserved for `other`. Verbatim grammar cases plus interleaving test. Commit `feat(script-creator): WHP_PROGRESS parser and console mapper`.

### Task 10: Fastify app factory and security

**Files:** `src/http/app.ts`, `src/http/sse.ts` + tests (all via `app.inject`).
**Contract:** `buildApp({nonce, operationService, documentService, artifactService, validatorService})` → Fastify instance. Hooks: every route requires header `x-sc-nonce: <nonce>` (SSE route also accepts `?nonce=`); requests with an `Origin` that is present and not `http://127.0.0.1:<any-port>`/`http://localhost:<any-port>` are rejected 403; no CORS headers are emitted.
**Verbatim rejection matrix:**

```ts
  const cases = [
    { name: 'missing nonce', headers: {}, expected: 401 },
    { name: 'wrong nonce', headers: { 'x-sc-nonce': 'nope' }, expected: 401 },
    { name: 'evil origin', headers: { 'x-sc-nonce': NONCE, origin: 'https://evil.example' }, expected: 403 },
    { name: 'loopback origin ok', headers: { 'x-sc-nonce': NONCE, origin: 'http://127.0.0.1:4310' }, expected: 200 },
    { name: 'no origin ok', headers: { 'x-sc-nonce': NONCE }, expected: 200 },
  ];
```

applied against `GET /api/health`. Commit `feat(script-creator): secured fastify app factory`.

### Task 11: operations HTTP API with reconnectable SSE

**Files:** routes in `src/http/app.ts` (+`sse.ts`) + tests.
**Contract:** `POST /api/ops {operation, inputs}` → `{id}`; `GET /api/ops/:id` → record incl. telemetry + stall flag; `GET /api/ops/:id/result`; `POST /api/ops/:id/cancel`; `POST /api/ops/:id/resume {inputs}`; `GET /api/ops/:id/events` → SSE (`id:` = seq, `event: codex`, `data:` = raw line; honors `Last-Event-ID` header and `?fromSeq=`; heartbeat comment every 15 s; closes on terminal + final `event: done`). Inject-based tests: submit→stream→terminal against fake codex; reconnect from mid-seq gets only the tail; cancel over HTTP. Commit `feat(script-creator): operations API with resumable SSE`.

### Task 12: document store and endpoints

**Files:** `src/documents/store.ts`, `src/documents/service.ts`, routes + tests.
**Contract:** migrations v2 add `drafts(id, episode_slug, title, format, doc_json, updated_at)`, `revisions(id, draft_id, seq, op_id NULL, disposition, doc_json, created_at)`; service: `createDraft/getDraft/saveDraft` (each save appends a revision, seq monotonic), `listRevisions`, `importMarkdown(md)` (via editor-core `parseMarkdown` → draft), `exportMarkdown(draftId)` (via editor-core codec; blocked reasons surface as 409 with the reasons list). HTTP: `POST/GET/PUT /api/drafts…`, `GET /api/drafts/:id/revisions`, `POST /api/drafts/import`, `GET /api/drafts/:id/export`. Tests include a real editor-core round-trip (narration format) through the HTTP layer. Commit `feat(script-creator): draft store with revision history and codec endpoints`.

### Task 13: repo artifact writes

**Files:** `src/repo/artifacts.ts` + test (temp dirs).
**Contract:** `writeArtifact(repoRoot, relPath, content)` — allowed only under `whp-youtube/topics/`, `whp-youtube/drafts/`, `whp-youtube/topic-runs/`, or exactly `whp-youtube/PIPELINE.md`; rejects traversal/absolute paths; atomic tmp+rename; `expectedHash` option: if the existing file's sha256 differs, refuse with `{conflict: true, currentHash}` (never clobber). `upsertPipelineRow(repoRoot, {episodeSlug, milestone, ref})` creates/updates a Markdown table row keyed by slug, preserving other rows. Commit `feat(script-creator): whitelisted atomic repo artifact writes`.

### Task 14: git milestone service

**Files:** `src/repo/git.ts` + tests (each against a freshly `git init`-ed temp repo with commits).
**Contract:** `gitStatus(repoRoot)` → `{branch, clean, defaultBranch}`; `milestoneCommit(repoRoot, {files, message})` — refuses when any listed file is unchanged-and-untracked-nothing-to-commit, stages ONLY the listed files, runs `git diff --check --cached`, commits with the message verbatim, returns the hash; never touches other dirty files; refuses entirely on the default branch unless `allowDefault: true` is passed (the daemon passes the user's recorded branch choice — wiring to the choice UI is Plan 4). Commit `feat(script-creator): explicit-files git milestone commits`.

### Task 15: validator --json mode (upstream, authorized)

**Files:** `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`, its test file in the same directory; `src/repo/validator.ts` + server test.
**Contract:** the Python validator gains `--json` (before `--`): machine output `{"ok": bool, "errors": [{"message": str, "line": int|null}]}` on stdout, exit code unchanged; default human output byte-identical to today (backward compatible — the existing tests must pass unmodified, plus new `--json` tests added test-first in ITS suite; run that suite from the skill's `scripts/` directory). Server side: `runValidatorJson(scriptPath)` resolves the skill dir (from repo root), runs `python3 scripts/validate_annotated_script.py --json -- <abs path>`, parses; route `POST /api/validate {path}` (path must be repo-relative under `whp-youtube/`). Commits: `feat(skill): add json diagnostics to annotated-script validator` then `feat(script-creator): validator endpoint`.

### Task 16: daemon entrypoint

**Files:** `src/daemon.ts`, package script `"daemon": "tsx src/daemon.ts"` + test of the factory pieces.
**Contract:** boots on `127.0.0.1` with port from `--port` or ephemeral; generates a 32-hex nonce; writes `{port, nonce, pid, startedAt}` atomically to the XDG `runtimeFile` (0600); constructs store/supervisor with XDG paths; calls `reattach()`; on SIGINT/SIGTERM stops the supervisor and removes the runtime file; logs one startup line with the URL. Testable pieces factored so vitest covers nonce/runtime-file/reattach wiring without listening. Commit `feat(script-creator): daemon entrypoint with runtime handshake`.

### Task 17 (controller): real E2E over HTTP

- [ ] `e2e/daemon-spike.ts` (env-gated `RUN_REAL_CODEX=1`): boot the daemon on an ephemeral port (real listen); via fetch+SSE with the nonce: (1) submit a real `rewrite-selection` op with a small envelope → stream events → schema-valid replacement in `/result`, tokens on the record; (2) kill the daemon process mid-op, restart, reconnect SSE with `Last-Event-ID`, receive only the tail, op completes; (3) submit `quick-gate-check` on a one-line idea → six gates verdict; (4) cancel a third op via HTTP → `cancelled` with events preserved. Prints VERIFIED/FAILED lines; nonzero exit on failure. Run it live; on failures, stop and treat as findings. Commit `test(script-creator): daemon verified against real codex over HTTP`.

### Task 18: evidence and close-out

- [ ] `docs/superpowers/evidence/2026-07-23-script-creator-plan3-daemon.md` from real outputs (suite totals, E2E transcript, findings, deferrals for Plan 4); commit. Final whole-branch review (fresh reviewer) per subagent-driven development; fix loop to PASS/APPROVED.

---

## Plan sequence reminder

Plan 4 (Script Studio: Angular + TipTap embedding editor-core, selection popup wired to
`rewrite-selection`/`review`/`generate-alternatives` over this daemon, revision timeline,
locks/variants UI), then Plan 5 (Topic Studio + pipeline board + full-run progress), Plan 6
(approval gate, Promote, milestone UI), Plan 7 (learning loop).
