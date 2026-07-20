---
name: reconcile-whp
description: Reconcile definite Why Humans Play (WHP) decisions across repository steering and active documents immediately after the user directly settles a direction or explicitly accepts a concrete proposal. Use after every definite WHP decision and when the user imports a decision made in another conversation; do not treat brainstorming, recommendations, questions, silence, rejected alternatives, or unresolved proposals as decisions.
---

# Reconcile WHP

Keep the repository's current doctrine and active work aligned with each definite WHP
decision while preserving history and unrelated user work.

## Establish the decision

1. State the accepted decision internally in one precise sentence.
2. Retain only rationale supplied by the conversation; do not invent rationale.
3. Separate the decision from tentative ideas, unresolved questions, and rejected
   alternatives.
4. Treat a direct user statement of settled direction or explicit acceptance of a
   concrete proposal as definite.
5. Treat an imported statement such as "We previously decided X" as a definite user
   decision.

If the decision or its material consequences have two plausible meanings, ask one
focused question and stop. Do not write partial reconciliation changes while blocked.

## Protect the worktree

1. Read the applicable repository instructions.
2. Check the current branch and `git status` before the first write.
3. Resolve any required branch-placement question before editing.
4. Preserve unrelated and untracked user files.
5. If a required edit overlaps unresolved user changes, ask how to proceed.

Explicit agreement authorizes content updates, but never bypasses branch, approval,
filesystem, or worktree safeguards. Do not commit unless the encompassing task
explicitly calls for a commit.

## Discover and classify documents

Discover Markdown documents with:

```bash
rg --files --hidden -g '*.md' -g '!.git/**'
```

Read repository guidance and documents that declare authority or status. Classify each
relevant document as:

- **Canonical steering:** current doctrine, vision, strategy, operating rules, or a
  declared source of authority. Inspect every canonical document.
- **Active working material:** a current plan, backlog, brief, synopsis, or draft still
  guiding work. Update only when affected.
- **Historical, parked, or published material:** a record of an earlier state or a fixed
  output. Preserve its content; add a short superseded-status note only when readers
  could otherwise mistake it for current direction.

`BRAND.md` is currently the highest-priority WHP doctrine. A later explicit decision may
revise it; update it first and then cascade the result downstream. If classification is
unclear and would change the allowed edit, ask before writing.

## Build the impact map

For each relevant document, decide whether the decision:

- changes current doctrine;
- changes downstream strategy or active work;
- makes an older artifact misleading without changing its historical content; or
- has no effect.

Scan all canonical steering documents. Update every affected canonical document and
only affected active documents. Never manufacture edits so every file changes.

## Apply the decision

1. Edit the highest-authority affected document first.
2. Cascade the new direction into affected lower-level and active documents.
3. Preserve voice, useful detail, citations, confidence labels, and factual caveats.
4. Prefer small coordinated edits over wholesale rewrites.
5. Do not change research or factual claims unless the decision concerns them and they
   have been verified to the repository's required standard.
6. Do not invent downstream policy, names, formats, or implications.
7. Leave historical, parked, published, and unrelated artifacts unchanged except for a
   necessary status note.
8. Append the decision to `DECISIONS.md`; do not duplicate an existing entry.

Use this ledger entry shape:

```markdown
## YYYY-MM-DD — Concise decision title

**Decision:** One precise sentence.

**Rationale:** Only rationale established in the discussion.

**Documents:** Paths changed, or a statement that no steering or active document needed
a content change. Name any artifact marked superseded.
```

The ledger records provenance and never outranks current canonical doctrine. Closely
related decisions accepted as one proposal may share an entry; separate decisions must
remain separately identifiable.

## Validate the reconciliation

1. Review the complete diff for only the files changed by this reconciliation.
2. Run `git diff --check`.
3. Search for stale claims, contradictions, broken authority chains, and outdated scope
   language related to the decision.
4. Confirm protected historical and unrelated files are unchanged.
5. Confirm the ledger records the decision once.

A duplicate decision or wrap-up consistency pass may require no changes. Treat that as
a successful no-op and report it rather than manufacturing a diff.

## Report the result

Report concisely:

- the definite decision captured;
- files updated;
- relevant files deliberately left unchanged and why;
- artifacts marked superseded;
- unresolved matters, or that none remain.

Never claim the repository is reconciled when a required file could not be inspected or
updated.
