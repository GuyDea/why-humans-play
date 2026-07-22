# Script Creator — Spike 1 Transport Durability: Evidence

**Date:** 2026-07-22
**Codex CLI:** codex-cli 0.144.5 (model `gpt-5.6-sol`, reasoning `xhigh`, repo trusted)
**Host:** Linux 6.8.0, Node v24.10.0
**Plan:** [2026-07-22-script-creator-spike1-transport.md](../plans/2026-07-22-script-creator-spike1-transport.md)
**Deterministic suite at verdict:** 12 test files / 31 tests, green on repeated host runs
(6× after Task 12's fix, 3× after Task 13); `tsc --noEmit` clean.

## Real-codex E2E checklist (verbatim output)

First attempt failed 4/7 checks — that failure is itself the spike's most valuable
finding (F5 below):

```text
FAILED  — detached run survives supervisor restart (failed)
FAILED  — schema-conforming review findings
VERIFIED — thread id captured (019f8af2-84c5-75b1-be90-e21a6bb1559e)
FAILED  — tokens captured verbatim (in=null cached=null out=null reasoning=null)
VERIFIED — events journaled (5 events)
FAILED  — mid-run cancellation (failed)
VERIFIED — cancelled events preserved (5 events)
```

After correcting the review schema to the strict structured-output form, the rerun
verified everything:

```text
VERIFIED — detached run survives supervisor restart (completed)
VERIFIED — schema-conforming review findings
VERIFIED — thread id captured (019f8af4-0516-76e3-86c9-4a70a1fae0e8)
VERIFIED — tokens captured verbatim (in=41720 cached=19200 out=851 reasoning=473)
VERIFIED — events journaled (8 events)
VERIFIED — mid-run cancellation (cancelled)
VERIFIED — cancelled events preserved (3 events)

SPIKE 1: ALL CHECKS VERIFIED
```

Observed run data: the real `$writing-whp-youtube-scripts` Review operation ran
2026-07-22T17:51:15–17:51:42 (**~27 s** wall clock) and returned schema-valid JSON —
`status: complete`, 2 findings, `guardrail_markdown: null` — through a supervisor that
was stopped and recreated 5 s into the run. The second, cancelled run was interrupted
~8 s in and reached `cancelled` with its journaled events intact. Token counts above
are persisted verbatim from `turn.completed.usage`; the failed first-attempt jobs
correctly recorded usage as unavailable (`null` columns, `usage_available = 0`).

## Spike findings (design deltas already applied)

- **F1 — tsx CLI wrapper breaks process-group assumptions.** `node_modules/.bin/tsx`
  runs the script in a child process, so the runner's `pgid = process.pid` pointed at a
  non-leader and `kill(-pgid)` raised ESRCH — which would have made cancellation a
  silent no-op. Runners are now spawned `process.execPath ['--import','tsx', …]` with
  `detached: true`, restoring pid == pgid (live-verified). This also removed the tsx
  CLI's IPC socket, which had been blocking subprocess tests in the codex sandbox.
- **F2 — a bare unresolved top-level await exits Node.** The fake's `hang` mode died
  with exit 13 instead of hanging; it now holds a keep-alive interval. (General lesson
  for the daemon phase: "hangs forever" must hold an event-loop handle.)
- **F3 — liveness must be re-checked periodically, not once.** A one-shot `reattach()`
  raced zombie reaping (`kill(pid, 0)` succeeds for unreaped corpses); dead-runner
  detection now also runs every supervisor tick.
- **F4 — "no status file" ≠ dead.** Under CPU contention a freshly spawned runner can
  take >300 ms before writing `status.json`; instant interruption marked live jobs
  terminally interrupted. Missing-status interruption is now gated by
  `startupGraceMs` (default 10 s). Related: the detach launcher must flush stdout via
  the write callback before `process.exit`.
- **F5 — strict structured-output schema rule (live backend).** `--output-schema`
  schemas must list **every** property in `required` and express optionality as
  nullable types (`"type": ["string","null"]`); omission from `required` is rejected
  with `invalid_json_schema` (HTTP 400) before the model runs, surfacing as top-level
  `error` + `turn.failed` events and exit 1. The technical design's normative appendix
  and the review schema were corrected accordingly.
- **F6 — real event stream extras.** The live stream produced two event types absent
  from the captured fixtures — top-level `{"type":"error"}` and `{"type":"turn.failed"}`
  — and non-fatal `item.completed` items with `type: "error"` (skills-context warning).
  The runner journals and survives all of them; the daemon phase should add them to the
  fake's fixtures and surface `turn.failed` distinctly in the operation log.

## Known limitations accepted for the spike

- `kill(pid, 0)` liveness can be fooled by PID reuse (rare; acceptable until the daemon
  phase, which can also match process start time).
- The codex sandbox differs from the host for subprocess-heavy tests (stdin defaults,
  process-group lifecycle); the host suite is the binding green for this package.
- Cancellation escalation deferred by a daemon stop during the grace window is
  reconciled at next boot rather than immediately.

## Post-review hardening

The final whole-branch review (fresh reviewer) raised nine findings; two fix waves
resolved all of them: launch-time startup grace via a persisted `started_at`; durable
`launch.json` process identity so supervisor restarts can never terminalize a live
pre-status runner by age (the review's reproduced `groupAlive:true` case); cancellation
that terminalizes only on confirmed process-group death, with per-instance re-signal
and re-armed escalation; strict rowid FIFO; close-based runner finalization with spawn
error handling; all-or-nothing four-field token capture; token columns nulled on
unavailable usage; synchronous launcher pid handoff; and test helpers extracted from
test modules. Suite grew to 13 files / 40 tests, green five consecutive host runs after
each wave, typecheck clean. The real-codex E2E was rerun on the final code and again
returned ALL CHECKS VERIFIED (review run `019f8b28-750f-7d72-aee2-dbd0fc3e4baa`,
tokens in=43710 cached=19200 out=1574 reasoning=1132). Deferred to Plan 3, as recorded
by the reviewer: the maintained `better-sqlite3` types package and persisted
cancellation deadlines surviving simultaneous runner and supervisor failure.

## Verdict

**The transport design is confirmed for the daemon phase.** Detached runners with an
append-only JSONL journal and atomic status files survive supervisor restarts;
reattach, FIFO, cancellation with escalation, schema enforcement with retry-once,
interrupted-job resume, and verbatim token telemetry all hold against the real CLI,
with a ~27 s scoped skill operation demonstrating interactive-grade latency. Proceed
to Plan 2 (editor range-identity spike); fold F5/F6 into Plan 3's daemon and
operation-schema work.
