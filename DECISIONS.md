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
