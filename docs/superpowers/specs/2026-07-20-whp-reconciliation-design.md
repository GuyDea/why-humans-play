# WHP Reconciliation Workflow Design

**Status:** Approved on 2026-07-20

## Purpose

Why Humans Play is intended to evolve as discussions produce better decisions. Its
repository documents must therefore represent the latest agreed understanding rather
than preserve accidental assumptions indefinitely.

The current documents demonstrate the problem. `BRAND.md` makes exposing hidden games
WHP's single defining move. A later decision broadened WHP to include deep examinations
of explicit games with rich histories and intellectual substance, such as Sudoku. That
decision has not yet propagated through the repository.

The reconciliation workflow will make propagation a routine part of reaching a
decision. It will run immediately after every definite WHP decision, update all and
only the affected documents, preserve historical artifacts, and record why the project
changed.

## Approved Decisions

This design incorporates the following decisions from the discussion:

- Run reconciliation after every definite WHP decision rather than waiting for an
  ambiguous end-of-conversation event.
- Apply clearly agreed outcomes automatically. Ask for approval when an outcome or its
  downstream meaning is tentative or ambiguous.
- Always inspect canonical steering documents. Update active working documents only
  when affected.
- Do not rewrite historical, parked, or published artifacts. Add a superseded-status
  note only when needed to prevent an old artifact from being mistaken for current
  direction.
- Pair an always-loaded repository instruction with a reusable repository skill and an
  append-only decision ledger.
- Start without lifecycle hooks or deterministic reconciliation scripts. Add stronger
  enforcement only if real use shows that the workflow is being skipped.
- Broaden WHP beyond an exclusive hidden-games lens. WHP may also examine explicit
  games as historical, cultural, mathematical, social, and intellectual objects, while
  retaining its standards of depth, rigor, and usefulness.

## Repository Components

### `AGENTS.md`

Create a concise root-level `AGENTS.md` containing the durable trigger. It must require
the agent to invoke `$reconcile-whp` immediately after every definite WHP decision.

The instruction must distinguish definite decisions from recommendations, tentative
ideas, hypotheses, questions, and rejected alternatives. It must also make clear that
automatic content authority does not override branch-isolation, filesystem, approval,
or dirty-worktree safeguards.

`AGENTS.md` owns the trigger, not the reconciliation procedure. Keeping the workflow in
the skill avoids duplicating it in always-loaded context.

### `.agents/skills/reconcile-whp/`

Create a repository-scoped skill named `reconcile-whp` with:

- `SKILL.md`, containing the semantic reconciliation workflow and all trigger language
  in its frontmatter description;
- `agents/openai.yaml`, containing generated display metadata consistent with the
  skill.

The first version will be instruction-only. It will have no scripts, references, or
assets because document impact and meaning require contextual judgment. The skill will
discover relevant Markdown documents at runtime rather than rely on a static manifest
that can itself become stale.

### `DECISIONS.md`

Create a concise, append-only root-level decision ledger. Each entry will contain:

- the date;
- the definite decision in one precise sentence;
- brief rationale when the discussion supplied it;
- the documents changed, or an explicit statement that no steering or active document
  needed a content change;
- any artifact marked superseded.

The ledger records provenance; it is not a second source of current truth. Current
canonical doctrine continues to outrank historical ledger entries.

Closely related decisions accepted as one proposal may share an entry. Separate
decisions must remain separately identifiable.

### Existing Agent Guidance

Retain `BRAND.md` as the highest-priority source of current WHP doctrine. Lower-level
documents continue to inherit from it.

Add a short compatibility instruction to the existing `CLAUDE.md` that points to the
same `.agents/skills/reconcile-whp/SKILL.md` workflow. Do not duplicate the workflow in
`CLAUDE.md`. This allows another repository-aware agent to follow the same process even
if it does not discover Codex repository skills automatically.

Discussions held outside a repository-aware environment cannot update the repository
automatically. A user statement such as "We previously decided X" imports that outcome
as a definite decision and triggers reconciliation.

## Definite-Decision Test

A statement is a definite decision when either:

1. the user directly states a settled WHP direction; or
2. the user explicitly accepts a concrete proposal whose consequences are clear.

An agent recommendation alone is never a decision. Neither are exploration,
brainstorming, partial agreement with unresolved details, or silence.

When only part of a proposal is accepted, reconcile only the accepted part. When the
accepted words permit materially different document changes, ask one focused question
before editing.

## Document Classification

At each run, discover the repository's Markdown documents and classify the relevant
ones from their content and context:

- **Canonical steering:** current doctrine, vision, strategy, operating rules, and
  declared sources of authority. Always inspect these.
- **Active working material:** current plans, backlogs, briefs, synopses, and drafts
  still guiding work. Update only when the decision changes them.
- **Historical, parked, or published material:** records of an earlier state or fixed
  outputs. Preserve their contents. Add a concise status note only if readers could
  otherwise mistake them for current direction.

If classification is genuinely unclear and changes would differ by classification,
ask before writing. Do not label an artifact historical merely to avoid reconciling it.

## Reconciliation Flow

Immediately after a definite decision:

1. Restate the accepted decision internally in one precise sentence and retain any
   rationale supplied in the conversation.
2. Separate the decision from tentative ideas, unresolved questions, and rejected
   alternatives.
3. Inspect repository guidance, discover Markdown documents, and classify the relevant
   documents.
4. Build an impact map from the highest-authority document downward. A new decision may
   revise current doctrine; existing doctrine must not silently nullify a later explicit
   decision.
5. Resolve branch placement and other required write safeguards before the first edit.
6. Make minimal edits to every affected canonical document and only the affected active
   documents.
7. Preserve historical, parked, and published content, adding a status note only when
   needed.
8. Append the decision to `DECISIONS.md`. Do not duplicate an already-recorded decision.
9. Review the complete diff and search for stale claims, broken authority chains, and
   contradictory downstream language.
10. Report the decision captured, files changed, files deliberately left unchanged,
    artifacts marked superseded, and any unresolved matter.

A wrap-up consistency pass may run at the end of a larger discussion. It should usually
be a no-op because each decision was already reconciled. A duplicate decision or a
consistency pass requiring no changes is a successful no-op and must be reported as
such.

## Authority and Editing Rules

- Treat explicit agreement as authorization for the content change; do not request a
  second content-approval round.
- Preserve document voice, useful detail, citations, confidence labels, and factual
  caveats.
- Prefer small coordinated edits over wholesale rewrites.
- Do not alter research or factual claims unless the decision concerns them and the
  claims have been verified to the standard required by the repository.
- Never invent downstream policy, names, formats, or implications merely to make a
  document look complete.
- Never auto-commit reconciliation changes. Let them accumulate on the appropriate
  branch and follow the encompassing task's commit instructions.
- Preserve unrelated user changes. If a required edit overlaps unresolved worktree
  changes, stop and ask how to proceed.
- A higher-priority existing document is normally authoritative, but a later explicit
  user decision may intentionally revise it. Update it first, then cascade the result.

## Failure Handling

Pause reconciliation and ask one focused question when:

- it is unclear whether the conversation produced a definite decision;
- the decision has two materially different plausible meanings;
- two accepted decisions conflict and the conversation did not resolve the conflict;
- document classification affects whether content may be rewritten;
- an affected file contains overlapping user changes;
- correct branch placement or write authority is unresolved.

If a file cannot be read or written, report the exact missing part and complete any safe,
independent checks without claiming the repository is reconciled. If no content changes
are needed, say so explicitly rather than manufacturing edits.

## Initial Reconciliation

Implementation must not merely add the mechanism. After the skill and trigger exist,
run the workflow against the definite decisions captured in this design.

The first pass must, at minimum:

- revise `BRAND.md` so making hidden games visible remains an important WHP lens but is
  no longer an exclusive boundary;
- state that WHP may deeply examine explicit games such as Sudoku through their history,
  design, mathematics, culture, psychology, and effects on human thought;
- reconcile affected channel strategy in `whp-youtube/STEERING.md` without inventing an
  unapproved series or format name;
- update top-level agent guidance where its summary would otherwise preserve the old
  restriction;
- create initial `DECISIONS.md` entries for the scope change and the reconciliation
  operating model;
- leave parked, historical, published, and unrelated working artifacts intact.

The existing untracked `whp-youtube/EP1-SYNOPSIS.md` is user-owned work and must not be
included or modified unless a later explicit request places it in scope.

## Validation

Validate the implementation at four levels:

1. **Structure:** run the skill creator's `quick_validate.py` against
   `.agents/skills/reconcile-whp` and confirm `agents/openai.yaml` matches `SKILL.md`.
2. **Repository consistency:** inspect the full diff, verify document authority remains
   clear, search for stale exclusive hidden-game claims, and confirm historical artifacts
   were preserved.
3. **Scenario behavior:** exercise the workflow with isolated test copies for:
   - a definite decision that changes canonical doctrine;
   - a tentative proposal that must not be written;
   - a decision that affects an active plan but not a historical artifact;
   - a definite decision requiring only a ledger entry;
   - a duplicate decision or wrap-up pass producing a no-op.
4. **Fresh-agent discovery:** verify that a fresh repository-aware agent receives the
   root trigger, discovers the skill, and describes the correct action after a definite
   WHP decision.

Forward tests must use disposable copies or read-only scenarios so validation does not
contaminate live project documents.

## Success Criteria

The work is complete when a fresh repository-aware agent can:

- identify a definite WHP decision without promoting tentative discussion;
- invoke `reconcile-whp` immediately;
- update all affected canonical and active documents without requesting redundant
  content approval;
- preserve historical and unrelated material;
- record the decision without creating a competing source of truth;
- detect contradictions and ambiguous consequences;
- respect branch and worktree safeguards;
- clearly report both changes and intentional no-ops.

## Deferred Complexity

Do not add lifecycle hooks, automatic commits, semantic scripts, or a static document
registry in the first version. Reconsider hooks only if observed use shows that agents
skip the `AGENTS.md` trigger. Add scripts only if a repeated deterministic validation
step emerges from real usage.
