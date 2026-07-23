# Script Creator — Plan 3 Daemon and Operation Layer: Evidence

**Date:** 2026-07-23
**Package:** `script-creator/server/` (extends Spike 1; consumes `editor-core` via file: link)
**Plan:** [2026-07-23-script-creator-plan3-daemon.md](../plans/2026-07-23-script-creator-plan3-daemon.md)
**Deterministic suite at verdict:** 30 test files / 160 tests green on the host;
`tsc --noEmit` clean; skill validator suite 94/94 (90 baseline + 4 new `--json` tests);
editor-core suite unaffected (44/44).

## Real E2E over HTTP (verbatim output)

Three real codex operations through the full daemon stack (Fastify + nonce + SSE +
supervisor + detached runners), with a SIGKILL restart mid-operation:

```text
VERIFIED — submit accepted (status 200)
VERIFIED — SSE streamed initial events (3 events, lastId 3)
VERIFIED — daemon restarted with fresh handshake
VERIFIED — SSE reconnect resumes after Last-Event-ID (first tail id 4)
VERIFIED — op survived daemon restart to completion (completed)
VERIFIED — schema-valid rewrite result ("complete")
VERIFIED — tokens on record (in=49573 out=921 reasoning=664)
VERIFIED — gate-check six gates (verdict fail)
VERIFIED — cancel accepted (status 200)
VERIFIED — cancelled with events preserved (cancelled)

PLAN 3 E2E: ALL CHECKS VERIFIED
```

The gate-check verdict (`fail`, on a deliberately mediocre test idea) is the topic
skill exercising real editorial judgment through the wire — exactly the transparency
the contract requires: the result arrived as a first-class schema payload, not an error.

## What Plan 3 delivered

- **Daemon:** loopback-only Fastify with per-launch nonce (header, SSE query fallback)
  and Origin rejection; runtime handshake file (0600) under XDG state; startup
  `reattach()`; graceful shutdown. Security matrix (missing/wrong nonce → 401, foreign
  Origin → 403, loopback/no Origin → 200) covered by inject tests.
- **Operation layer:** twelve-operation registry matching the design table (sandbox and
  timeout classes verified against Global Constraints); strict schemas with a
  meta-test that mechanically enforces the Spike 1 rule (every property required,
  nullable optionality, `additionalProperties: false` recursively); pure envelopes
  (`$skill` + operation + verbatim inputs, nothing else — proven byte-exact);
  OperationService with injectable-clock hard timeouts, 120 s soft-stall flag,
  `guardrail_markdown`/`declined`/`narrowed` as first-class results, and resume
  restricted to resumable operations with a max-3 chain enforced in the store.
- **Progress:** `WHP_PROGRESS/1` checklist folding and console event mapping with
  `turn.failed` → `failure` and non-fatal error items → `warning` (fixtures now include
  the real failure shapes from Spike 1 F6).
- **Spike 1 deferrals closed:** maintained `@types/better-sqlite3` (shim deleted);
  persisted cancellation deadlines re-armed across daemon restarts (regression kills
  the daemon between SIGINT and escalation against an ignore-SIGINT runner).
- **Documents:** drafts + revisions (monotonic seq per save) in the XDG SQLite DB;
  import/export through the editor-core dual-format codec over HTTP, with blocked
  exports surfacing their reasons as 409s.
- **Repo integration:** whitelisted atomic artifact writes with content-hash conflict
  refusal and `PIPELINE.md` row upsert; explicit-files git milestone commits (staged
  listed files only, `git diff --check --cached`, default-branch refusal) tested
  against temp repos; the annotated-script validator gained a backward-compatible
  `--json` mode upstream (default output byte-identical; its own suite extended
  test-first) and a guarded `POST /api/validate` endpoint that runs the real script.

## Findings

- **F1 — the codex sandbox protects `.agents/`.** The implementer could not write the
  validator files (read-only policy on agent-instruction directories), so the upstream
  Python change was executed by the controller per the approved fallback. Plan 4+
  should assume: anything under `.agents/` is controller-side work.
- **F2 — brief-extraction reviewed as suspicious, was fine.** A 5-line task brief
  turned out to be the plan's genuinely compact Task 8; the worker implemented the
  full contract. No process change needed beyond the extra review pass it triggered.

## Post-review hardening

The final whole-branch review (fresh reviewer) raised six findings — three High: schema
retries orphaned the public operation id (SSE could say `done` while the contracted
retry ran invisibly); hard timeouts were in-memory only (daemon restarts and
supervisor retries escaped the binding limits); artifact writes were atomic-for-readers
but not compare-and-swap. One fix wave resolved all of them: durable `operations` rows
with attempt chains (`jobs.operation_id`, retries inherited, all public reads resolve
the active attempt, one terminal `done`), persisted deadlines re-armed or fired on
boot and inherited by retries. Artifact replacement detects human-timescale concurrent
edits, never silently overwrites, and ensures both versions survive any detected
conflict, with an accepted irreducible sub-millisecond window between the final identity
check and rename because OS-level locks are out of scope for this single-user local tool.
The hardening also added no-follow symlink-rejecting validator path containment, a
fail-closed E2E, and the progress-ledger corrections. Suite grew to 30 files / 170
tests, green three consecutive host runs, typecheck clean. The real E2E was rerun with
the strengthened assertions and again returned ALL CHECKS VERIFIED — active pre-kill state with zero
early `done`, five resumed codex events after `Last-Event-ID`, tokens
in=49424/out=932/reasoning=690, and the cancelled stream showing two codex events plus
exactly one terminal `done`.

## Verdict

**The backend is real.** The full path — HTTP request → nonce gate → envelope →
detached codex runner → journaled SSE with resumable sequence ids → schema-validated
editorial result with verbatim telemetry — held against the live CLI, including a
SIGKILL daemon restart mid-operation. Plan 4 (Script Studio: Angular + TipTap over
this API) has its foundation; the remaining backend work in later plans is additive
(lesson application in Plan 7, richer pipeline writes in Plans 5–6).
