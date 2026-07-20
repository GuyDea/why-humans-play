# WHP Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repository workflow that immediately propagates every definite WHP decision through affected documents, preserves historical artifacts, and records the decision's provenance.

**Architecture:** A root `AGENTS.md` supplies the always-loaded trigger, while a repository-scoped `reconcile-whp` skill owns the semantic workflow. `DECISIONS.md` is an append-only history rather than a competing source of truth; `BRAND.md` remains canonical and downstream guidance is reconciled from it.

**Tech Stack:** Markdown, Codex repository skills (`.agents/skills`), YAML skill metadata, Git, `rg`, and the bundled Python skill validator.

---

## File Map

- Create `AGENTS.md`: durable trigger for immediate reconciliation after a definite WHP decision.
- Create `.agents/skills/reconcile-whp/SKILL.md`: decision test, document classification, impact analysis, editing rules, validation, and report contract.
- Create `.agents/skills/reconcile-whp/agents/openai.yaml`: discoverable UI metadata for the skill.
- Create `DECISIONS.md`: append-only provenance for definite WHP decisions.
- Modify `CLAUDE.md`: broaden the top-level scope summary and point other repository-aware agents to the shared workflow.
- Modify `BRAND.md`: make hidden games a defining lens rather than an exclusive boundary and explicitly include deep studies of real games.
- Modify `whp-youtube/STEERING.md`: admit explicit-game deep dives to channel scope without inventing a series name or unsupported competitive evidence.
- Preserve `whp-youtube/drafts/evolutionary-paradox-of-play.md`: parked historical artifact.
- Preserve `whp-youtube/EP1-SYNOPSIS.md`: pre-existing, untracked user work that is outside this task.

### Task 1: Establish the protected baseline

**Files:**
- Inspect: `whp-youtube/drafts/evolutionary-paradox-of-play.md`
- Inspect: `whp-youtube/EP1-SYNOPSIS.md`

- [ ] **Step 1: Verify branch and worktree state**

Run:

```bash
test "$(git branch --show-current)" = "feat/whp-reconciliation"
git status --short
```

Expected: the branch assertion exits `0`; status shows only the pre-existing
`?? whp-youtube/EP1-SYNOPSIS.md`.

- [ ] **Step 2: Record preservation hashes outside the repository**

Run:

```bash
sha256sum \
  whp-youtube/drafts/evolutionary-paradox-of-play.md \
  whp-youtube/EP1-SYNOPSIS.md \
  > /tmp/whp-reconciliation-preserved.sha256
wc -l /tmp/whp-reconciliation-preserved.sha256
```

Expected: `2 /tmp/whp-reconciliation-preserved.sha256`.

- [ ] **Step 3: Run the discovery acceptance check before implementation**

Run:

```bash
test -f AGENTS.md \
  && test -f .agents/skills/reconcile-whp/SKILL.md \
  && test -f .agents/skills/reconcile-whp/agents/openai.yaml \
  && test -f DECISIONS.md
```

Expected: exit status `1` because the workflow files do not exist yet.

### Task 2: Add the repository trigger and reconciliation skill

**Files:**
- Create: `AGENTS.md`
- Create: `.agents/skills/reconcile-whp/SKILL.md`
- Create: `.agents/skills/reconcile-whp/agents/openai.yaml`

- [ ] **Step 1: Initialize the repository skill with generated metadata**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  reconcile-whp \
  --path .agents/skills \
  --interface 'display_name=Reconcile WHP' \
  --interface 'short_description=Keep WHP docs aligned after definite decisions' \
  --interface 'default_prompt=Use $reconcile-whp to propagate the latest definite WHP decision across the repository.'
```

Expected: the initializer reports creation of `SKILL.md` and
`agents/openai.yaml` under `.agents/skills/reconcile-whp`.

- [ ] **Step 2: Create the always-loaded trigger**

Create `AGENTS.md` with exactly:

```markdown
# WHP repository instructions

## Reconcile definite decisions

- Immediately after every definite Why Humans Play (WHP) decision, invoke
  `$reconcile-whp` before continuing with the conversation or task.
- A definite decision is either a direction the user states as settled or the user's
  explicit acceptance of a concrete proposal whose consequences are clear.
- Recommendations, brainstorming, questions, rejected alternatives, silence, and
  partially resolved proposals are not decisions.
- Explicit agreement authorizes the resulting content updates. If the accepted outcome
  or its downstream meaning is ambiguous, ask one focused question before editing.
- Reconciliation never overrides branch-isolation, approval, filesystem, or
  dirty-worktree safeguards already in force.
```

- [ ] **Step 3: Replace the generated skill template with the complete workflow**

Replace `.agents/skills/reconcile-whp/SKILL.md` with exactly:

```markdown
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
```

- [ ] **Step 4: Confirm the generated metadata is exact**

Ensure `.agents/skills/reconcile-whp/agents/openai.yaml` contains exactly:

```yaml
interface:
  display_name: "Reconcile WHP"
  short_description: "Keep WHP docs aligned after definite decisions"
  default_prompt: "Use $reconcile-whp to propagate the latest definite WHP decision across the repository."
```

- [ ] **Step 5: Validate structure and trigger language**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/reconcile-whp
rg -n 'Immediately after every definite|\$reconcile-whp' AGENTS.md
rg -n 'name: reconcile-whp|after every definite WHP decision|Do not commit' \
  .agents/skills/reconcile-whp/SKILL.md
```

Expected: `Skill is valid!`; both `rg` commands print matching lines.

- [ ] **Step 6: Commit the trigger and skill**

Run:

```bash
git add AGENTS.md .agents/skills/reconcile-whp/SKILL.md \
  .agents/skills/reconcile-whp/agents/openai.yaml
git commit -m "feat: add WHP reconciliation skill"
```

Expected: one commit containing only the three listed files.

### Task 3: Add the append-only decision ledger

**Files:**
- Create: `DECISIONS.md`

- [ ] **Step 1: Verify the ledger is absent**

Run:

```bash
test ! -e DECISIONS.md
```

Expected: exit status `0`.

- [ ] **Step 2: Create the ledger and bootstrap decisions**

Create `DECISIONS.md` with exactly:

```markdown
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
```

- [ ] **Step 3: Verify entry structure and uniqueness**

Run:

```bash
test "$(rg -c '^## 2026-07-20 —' DECISIONS.md)" = "4"
test "$(rg -c '^\*\*Decision:\*\*' DECISIONS.md)" = "4"
test "$(rg -c '^\*\*Rationale:\*\*' DECISIONS.md)" = "4"
test "$(rg -c '^\*\*Documents:\*\*' DECISIONS.md)" = "4"
```

Expected: every assertion exits `0`.

- [ ] **Step 4: Commit the ledger**

Run:

```bash
git add DECISIONS.md
git commit -m "docs: record WHP reconciliation decisions"
```

Expected: one commit containing only `DECISIONS.md`.

### Task 4: Reconcile canonical doctrine and top-level guidance

**Files:**
- Modify: `BRAND.md:10-139`
- Modify: `CLAUDE.md:19-24,52-59`

- [ ] **Step 1: Demonstrate the stale exclusive doctrine**

Run:

```bash
rg -n 'one move, applied everywhere|The name works on two levels|Same word, two doors' BRAND.md
! rg -q 'Sudoku' BRAND.md
```

Expected: the first command prints the three stale claims; the second assertion exits
`0` because `Sudoku` is absent.

- [ ] **Step 2: Record the doctrine expansion at the top of `BRAND.md`**

After the existing committed note in the opening blockquote, add:

```markdown
>
> *Expanded 2026-07-20: hidden games remain a defining lens, not an exclusive boundary;
> explicit games are also in scope when examined with WHP depth and rigor.*
```

- [ ] **Step 3: Replace the exclusive core-lens block**

Replace the block beginning `**Human life is made of games` and ending `without losing
its identity.` with:

```markdown
**Human life is made of games — some hidden, some explicit.** Hidden games operate through
players, goals, rules, incentives, and strategies we rarely see: money, status, dating,
careers, attention, politics, even morality. Explicit games put their rules in the open,
then accumulate histories, cultures, design traditions, mathematics, and distinctive ways
of thinking.

Making the hidden game visible remains **one of WHP's defining moves.** The instant you can
see the rules, two things happen — you understand *why people (and you) do what they do*,
and you get to *play on purpose instead of being played.* But visibility is not the brand's
boundary: WHP also asks why real games endure, how their systems work, and what humans reveal
through making and playing them.

The name opens three doors, and we use all three:
- ***Why humans play*** — the deep science of play (play as nature's learning engine).
- ***The games humans are always playing*** — the hidden rules of real life.
- ***The games humans made*** — explicit games examined through history, design,
  mathematics, culture, psychology, and their effects on thought.

Same word, three doors. The brand is the **field of inquiry**, not any single format — so it
can flex in register (rigorous explainer, life-philosophy essay, game↔life metaphor,
explicit-game deep dive, playable challenge) without losing its identity.
```

- [ ] **Step 4: Connect the play definition to explicit-game study**

After the paragraph ending `playing on purpose — or stepping out.`, insert:

```markdown
This frame-based definition does not exclude soccer, chess, Sudoku, or video games from
study. It lets WHP ask two layers of an explicit game at once: how its formal system works,
and what play-frame humans build around it.
```

- [ ] **Step 5: Broaden vision, mission, and recognized value**

Replace the current Vision block with:

```markdown
> **A world where people can see the games shaping their lives, understand the games
> humans have made, and choose how they play.**
>
> *(Where reading rules, systems, players, and play itself is common literacy, not a hidden
> advantage.)*
```

Replace the current Mission block with:

```markdown
> **We make games legible — exposing the hidden games of human life, investigating the
> explicit games humans create, and exploring why play matters — so people can understand
> the rules, the players, and their own choices.** Across video, shorts, and playable tools.
```

Replace the numbered value list and its following explanatory paragraph with:

```markdown
1. **See a hidden game they're in** — the invisible rules of a real situation (work, money,
   status, relationships, the products they use), named and mapped.
2. **Understand why people do what they do** — their own and others' behavior made legible.
3. **Understand an explicit game in depth** — where it came from, why its rules work, how
   people shaped it, and what playing it asks of the mind.

Not abstract theory ("here's the Prisoner's Dilemma"), shallow life-hacks, or trivia recaps.
Every piece must use a rigorous lens on a recognizable hidden game, the human fact of play,
or a real game worth understanding — then hand the insight back so the viewer can see or act
differently.
```

Replace `**One lens, many registers.** The range is a feature; the lens keeps it coherent.`
with:

```markdown
- **One field, several lenses.** Hidden games, the science of play, and explicit games all
  serve the same inquiry into how humans think, learn, choose, and play.
```

- [ ] **Step 6: Clarify that current format names are non-exhaustive**

After the existing format table, add:

```markdown
These modes are not an exhaustive boundary. WHP may also publish deep examinations of
explicit games — for example, how Sudoku emerged, why its constraint system is compelling,
how cultures shaped it, and what solving it demands of the mind. A recurring label for that
work remains deliberately unset until the format is proven.
```

At the start of `## What this changes downstream`, add:

```markdown
- **Hidden Game is a pillar, not the full editorial boundary.** Deep, rigorously framed
  studies of explicit games are also on-brand; each still has to meet the useful, human,
  evidence-aware bar above.
```

- [ ] **Step 7: Broaden `CLAUDE.md` and add cross-agent compatibility**

Replace the Thesis paragraph with:

```markdown
Humans learn by playing. WHP investigates the human condition, intellect, and growth
through hidden games, game theory, the science of play, and explicit games with rich
histories and systems of their own. A real game such as Sudoku is in scope when treated
with depth — history, design, mathematics, culture, psychology, and what it asks of the
mind — rather than as trivia. Rigor is the differentiator; keep the framing literal and
grounded and avoid "woo" / consciousness drift.
```

Append this section after `## Working principles` and its list:

```markdown

## Decision reconciliation

After every definite WHP decision, read and follow
[`reconcile-whp`](.agents/skills/reconcile-whp/SKILL.md) immediately. A definite decision
is a settled user direction or explicit acceptance of a concrete proposal, not
brainstorming or an unresolved suggestion.
```

- [ ] **Step 8: Verify canonical coherence**

Run:

```bash
! rg -q 'one move, applied everywhere|The name works on two levels|Same word, two doors' BRAND.md
rg -n 'some hidden, some explicit|Sudoku|field of inquiry|pillar, not the full' BRAND.md
rg -n 'hidden games, game theory|Sudoku|reconcile-whp' CLAUDE.md
git diff --check
```

Expected: the negative assertion exits `0`; positive searches print the new scope and
workflow lines; `git diff --check` prints nothing.

- [ ] **Step 9: Commit canonical reconciliation**

Run:

```bash
git add BRAND.md CLAUDE.md
git commit -m "docs: broaden WHP editorial scope"
```

Expected: one commit containing only `BRAND.md` and `CLAUDE.md`.

### Task 5: Reconcile the YouTube channel scope

**Files:**
- Modify: `whp-youtube/STEERING.md:19-42,165-191,350-366,final line`
- Preserve: `whp-youtube/drafts/evolutionary-paradox-of-play.md`
- Preserve: `whp-youtube/EP1-SYNOPSIS.md`

- [ ] **Step 1: Demonstrate that the channel document lacks the new scope**

Run:

```bash
! rg -q 'explicit games such as Sudoku|Explicit-game candidates' whp-youtube/STEERING.md
```

Expected: exit status `0` because neither scope marker exists.

- [ ] **Step 2: Add the broader editorial territory without changing the current pilot**

After the first paragraph under `## The bet`, add:

```markdown
The channel's editorial territory is broader than that opening thesis. It includes hidden
games in ordinary life, the science of why humans play, and explicit games whose histories,
systems, cultures, and cognitive demands reward deep examination. A game such as Sudoku is
eligible because of the richer human story inside it, not merely because it is a game.
```

- [ ] **Step 3: Bound the dated competitive map honestly**

After the opening sentence under `# PART 2 — The competitive map`, add:

```markdown
**Scope note (2026-07-20):** this research maps the launch lanes studied on 2026-07-13; it
does not define WHP's full editorial boundary. Deep dives into explicit games such as
Sudoku are in scope, but each needs current topic-specific competitive research before a
packaging or sequencing verdict.
```

Do not add an evidence row for Sudoku because no Sudoku-specific competitive research was
approved or performed in this task.

- [ ] **Step 4: Add an unsequenced explicit-game seed without inventing a format name**

After the numbered backlog, before the horizontal rule, add:

```markdown
**Explicit-game candidates (unsequenced):** a deep examination of Sudoku — its emergence,
constraint design, global spread, solving psychology, and what its popularity reveals about
human play. Research its competitive lane and packaging before assigning an episode number.
This is a scope seed, not a locked title or series name.
```

- [ ] **Step 5: Separate research freshness from editorial reconciliation**

Replace the final line with:

```markdown
*Research and tooling data last updated: 2026-07-13. Editorial scope reconciled: 2026-07-20.*
```

- [ ] **Step 6: Verify channel scope and protected artifacts**

Run:

```bash
rg -n 'editorial territory is broader|Scope note \(2026-07-20\)|Explicit-game candidates|not a locked title or series name' \
  whp-youtube/STEERING.md
sha256sum -c /tmp/whp-reconciliation-preserved.sha256
git diff --check
```

Expected: all four scope markers print; both protected files report `OK`; diff check is
silent.

- [ ] **Step 7: Commit channel reconciliation**

Run:

```bash
git add whp-youtube/STEERING.md
git commit -m "docs: add explicit games to channel scope"
```

Expected: one commit containing only `whp-youtube/STEERING.md`.

### Task 6: Forward-test decision semantics in disposable clones

**Files:**
- Test copy: a fresh clone under `/tmp` for each scenario
- Do not modify: live repository documents

- [ ] **Step 1: Test implicit discovery with a definite doctrine decision**

Create a disposable clone:

```bash
scenario_root="$(mktemp -d /tmp/whp-reconcile-definite.XXXXXX)"
git clone --quiet --no-hardlinks . "$scenario_root/repo"
```

Dispatch a fresh agent with the resolved clone path and exactly this task, without
mentioning the expected files:

```text
Work only in the repository at the supplied absolute path. The user says: "We have
definitely decided that WHP will examine playground games as social systems as well as
formal rule sets." Handle this decision according to the repository instructions. Do
not commit.
```

Inspect:

```bash
git -C "$scenario_root/repo" diff --name-only
git -C "$scenario_root/repo" diff --check
git -C "$scenario_root/repo" diff -- DECISIONS.md BRAND.md
```

Expected: `DECISIONS.md` and `BRAND.md` are changed, any additional file is materially
affected, and diff check is silent. The agent's report identifies a definite decision and
does not request redundant content approval.

- [ ] **Step 2: Test that a tentative idea produces no writes**

Create another disposable clone and dispatch a fresh agent:

```bash
scenario_root_tentative="$(mktemp -d /tmp/whp-reconcile-tentative.XXXXXX)"
git clone --quiet --no-hardlinks . "$scenario_root_tentative/repo"
```

```text
Work only in the repository at the supplied absolute path. The user says: "I'm wondering
whether WHP might cover gambling someday, but I have not decided that." Explore what this
could mean. Do not commit.
```

Inspect:

```bash
git -C "$scenario_root_tentative/repo" status --short
```

Expected: no output. The agent may discuss the idea but must not edit or append a decision.

- [ ] **Step 3: Test active-versus-historical handling**

Create another disposable clone and record the parked draft hash:

```bash
scenario_root_lifecycle="$(mktemp -d /tmp/whp-reconcile-lifecycle.XXXXXX)"
git clone --quiet --no-hardlinks . "$scenario_root_lifecycle/repo"
sha256sum "$scenario_root_lifecycle/repo/whp-youtube/drafts/evolutionary-paradox-of-play.md" \
  > "$scenario_root_lifecycle/parked.sha256"
```

Dispatch a fresh agent:

```text
Work only in the repository at the supplied absolute path. The user says: "We have
definitely decided that every active episode plan must include one experiment the viewer
can try." Reconcile this decision according to the repository instructions. Do not
commit.
```

Inspect:

```bash
git -C "$scenario_root_lifecycle/repo" diff --name-only
sha256sum -c "$scenario_root_lifecycle/parked.sha256"
git -C "$scenario_root_lifecycle/repo" diff --check
```

Expected: current steering and the ledger change; the parked draft reports `OK`; diff
check is silent. A status note is acceptable only if needed to prevent misuse.

- [ ] **Step 4: Test a ledger-only decision and duplicate no-op**

Create another disposable clone:

```bash
scenario_root_ledger="$(mktemp -d /tmp/whp-reconcile-ledger.XXXXXX)"
git clone --quiet --no-hardlinks . "$scenario_root_ledger/repo"
```

Dispatch a fresh agent with:

```text
Work only in the repository at the supplied absolute path. The user says: "We have
definitely decided to retain the existing WHP color palette unchanged." Reconcile this
decision according to the repository instructions. Do not commit.
```

Inspect and checkpoint the disposable result:

```bash
test "$(git -C "$scenario_root_ledger/repo" diff --name-only)" = "DECISIONS.md"
git -C "$scenario_root_ledger/repo" add DECISIONS.md
git -C "$scenario_root_ledger/repo" \
  -c user.name='WHP Skill Test' \
  -c user.email='whp-skill-test@example.invalid' \
  commit -m 'test: checkpoint ledger decision'
```

Dispatch a second fresh agent with the same decision and clone path. Then run:

```bash
git -C "$scenario_root_ledger/repo" status --short
```

Expected: no output after the duplicate run; the second agent reports a successful no-op.

### Task 7: Run final repository validation

**Files:**
- Verify: all files changed since `main`
- Preserve: `whp-youtube/drafts/evolutionary-paradox-of-play.md`
- Preserve: `whp-youtube/EP1-SYNOPSIS.md`

- [ ] **Step 1: Validate the skill and metadata one final time**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/reconcile-whp
sed -n '1,20p' .agents/skills/reconcile-whp/agents/openai.yaml
```

Expected: `Skill is valid!` and exactly the three approved interface fields.

- [ ] **Step 2: Scan for incomplete instructions and stale exclusivity**

Run:

```bash
! rg -n 'TB[D]|TO[D]O|PLACEHOLD[E]R|implement lat[e]r|fill in detai[l]s' \
  AGENTS.md DECISIONS.md .agents/skills/reconcile-whp docs/superpowers \
  BRAND.md CLAUDE.md whp-youtube/STEERING.md
! rg -n 'one move, applied everywhere|The name works on two levels|Same word, two doors' \
  BRAND.md CLAUDE.md whp-youtube/STEERING.md
rg -n 'Sudoku' BRAND.md CLAUDE.md whp-youtube/STEERING.md DECISIONS.md
```

Expected: both negative scans are silent with exit status `0`; the positive scan finds
the explicit-game scope in all four documents.

- [ ] **Step 3: Verify diffs, history, and user-owned work**

Run:

```bash
git diff --check main...HEAD
git diff --name-status main...HEAD
sha256sum -c /tmp/whp-reconciliation-preserved.sha256
! git diff --name-only main...HEAD | rg 'whp-youtube/EP1-SYNOPSIS.md|whp-youtube/drafts/evolutionary-paradox-of-play.md'
git status --short
```

Expected:

- diff check is silent;
- changed paths are limited to the design, plan, trigger, skill, ledger, and three current
  guidance documents;
- both preservation hashes report `OK`;
- neither protected path appears in the branch diff;
- status shows only `?? whp-youtube/EP1-SYNOPSIS.md`.

- [ ] **Step 4: Review commit boundaries**

Run:

```bash
git log --oneline --decorate main..HEAD
git show --stat --oneline HEAD
git status --short
```

Expected: focused commits for the design, plan, skill, ledger, canonical scope, and channel
scope; the live worktree still contains only the pre-existing untracked synopsis.

- [ ] **Step 5: Commit validation fixes only when validation changed tracked files**

If and only if a validation failure required a tracked-file correction, stage the exact
corrected paths and run:

```bash
git commit -m "fix: tighten WHP reconciliation workflow"
```

Expected: no extra commit when all checks pass; otherwise one focused fix commit followed
by a clean rerun of Steps 1–4.
