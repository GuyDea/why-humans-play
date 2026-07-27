# Finish Throughline and Walking-Vlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the optional supporting-throughline feature, memory-first walking-vlog
gate, and Episode 1 medical-sidecar pre-draft into tested, owner-routed, reviewable commits.

**Architecture:** Keep structural throughline selection in
`references/story-and-hook-method.md` and detailed memory-first delivery in
`references/rapid-prototyping.md`. Core, steering, rubric, format, and template retain only
their local gates, routes, records, or outcome checks. Commit the Episode 1 artifact
separately with `PRE-DRAFT` status after primary-source and delivery review.

**Tech Stack:** Markdown skill guidance, Python 3 standard library, `unittest`, the existing
skill-package validator, and primary-source factual review.

---

## Working-tree contract

Implement on `fix/finish-throughline-walking-vlog`. The worktree already contains all
candidate changes across the two skill workstreams and the untracked Episode 1 pre-draft.
Do not discard or broadly stage them.

Before each commit:

```bash
git branch --show-current
git status --short
git diff --check
git diff --cached --check
git diff --cached
```

Stage only exact task-owned paths or hunks. Never use `git add -A`, `git add .`, stash,
reset, checkout-to-discard, or a broad formatter. When one file contains both workstreams,
use precise hunk staging or construct the intended index blob and inspect it completely.

The final implementation history after the design and plan commits must contain:

1. `feat(skill): add optional supporting narrative throughlines`
2. `fix(skill): enforce memory-first walking predrafts`
3. `content(youtube): add Episode 1 medical-sidecar predraft`

## File responsibility map

| File | Responsibility in this plan |
|---|---|
| `.agents/skills/writing-whp-youtube-scripts/SKILL.md` | Concise Phase 0 memory-first trigger and route; no formatting churn. |
| `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md` | Sole detailed supporting-throughline structural owner; route delivery to rapid. |
| `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md` | Draft-time throughline realization and sole detailed memory-first delivery owner. |
| `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md` | Compact `FOUND` / `NONE` throughline audit schema. |
| `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md` | Worked `NONE` throughline audit. |
| `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md` | Outcome-based throughline and walking-delivery scoring. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/check_spoken_readability.py` | Review findings for exact participant counts and substantial quotations. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/test_check_spoken_readability.py` | Deterministic checker regression coverage. |
| `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py` | Ownership, routing, steering, format, and stale-state contracts. |
| `whp-youtube/STEERING.md` | Concise permanent invariants and valid owner links only. |
| `DECISIONS.md` | Current-state records for throughline, memory-first delivery, and implemented progression planning. |
| `whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md` | Episode 1 pre-draft, medical sidecar, and transparent delivery audit. |

### Task 1: Pin the ownership and stale-state regressions

**Files:**
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Add a failing canonical-steering test**

Add
`test_canonical_steering_does_not_restore_detailed_story_owner`, which normalizes
`whp-youtube/STEERING.md` and asserts:

```python
self.assertNotIn(
    "Design the storytelling engine before writing the beat structure.",
    steering,
)
self.assertEqual(
    steering.count(
        "directly instructs drafting from the displayed complete plan"
    ),
    1,
)
self.assertNotIn(
    "The writing-skill implementation will follow the approved design",
    decisions,
)
```

Also retain the existing architecture → progression → beats/narration ordering assertions.

- [ ] **Step 2: Add a failing throughline-owner test**

Add `test_supporting_throughline_has_one_structural_owner`. Read the story owner, rapid
guidance, steering, format, and template. Assert that the story owner contains the
candidate shape and five structural gates:

```python
owner_anchors = (
    "person → ordinary goal → obstacle → consequential choice → outcome → changed meaning",
    "1. **Hook:**",
    "3. **Recurrence:**",
    "4. **Evidence boundary:**",
    "5. **Payoff:**",
)
```

Assert those detailed anchors are absent from rapid guidance and steering. Keep the existing
format/template checks for `### Narrative throughline audit`, `FOUND`, `NONE`, `Beat map`,
and `Absence reason`.

- [ ] **Step 3: Add a failing memory-owner test**

Add `test_memory_first_walking_pass_has_one_detailed_owner`. Require a declared rapid
owner heading and exact owner links:

```python
rapid_heading = "### Run the memory-first walking-vlog pass"
rapid_link = (
    "rapid-prototyping.md#run-the-memory-first-walking-vlog-pass"
)
```

Assert the detailed contracts below occur in rapid guidance and not verbatim in `SKILL.md`,
story guidance, the rubric, or steering:

```python
detailed_contracts = (
    "Classify each number as claim-carrying or texture.",
    "round texture sample sizes to a truthful conversational magnitude",
    "Use a verbatim quotation in narration only when its exact wording earns "
    "the memory cost.",
    "Replace research-admin wording and outline transitions with language "
    "Martin could reproduce naturally after one hearing.",
)
```

Assert core, story, rubric, and steering contain their concise local invariant or a valid
link instead of the copied procedure.

- [ ] **Step 4: Run the new tests and observe RED**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k canonical_steering -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k throughline_owner -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k memory_owner -v
```

Expected: failures expose the long steering mirror, repeated direct-instruction wording,
stale future-tense decision, duplicated throughline selection detail in rapid guidance, and
memory-first procedure copied across consumers. Test import or syntax errors are not an
acceptable RED result.

### Task 2: Reconcile the supporting-throughline feature

**Files:**
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Modify: `whp-youtube/STEERING.md`
- Modify: `DECISIONS.md`

- [ ] **Step 1: Keep one detailed structural owner**

Retain the complete `## Add a supporting narrative throughline` method in
`story-and-hook-method.md`, including:

```text
person → ordinary goal → obstacle → consequential choice → outcome → changed meaning
```

and the Hook, Identification, Recurrence, Evidence boundary, and Payoff gates. Keep the
anti-force rule and the requirement that every return adds information or changes meaning.

In rapid guidance, replace candidate reselection detail with draft-time consumption:

```markdown
When the approved Story Progression Plan selects a supporting narrative throughline,
realize only its mapped returns. Each return must perform its approved new-information,
reinterpretation, stakes, demonstration, application, or payoff job. Do not reselect the
sidecar during drafting or let its case stand in for separate mechanism evidence. If the
approved plan records `NONE`, keep the argument direct.
```

- [ ] **Step 2: Retain the compact production record**

Keep the format’s `### Narrative throughline audit` with:

```markdown
- **Status:** FOUND
- **Throughline:**
- **Audience connection:**
- **Opening hook / loop:**
- **Obstacle / tension:**
- **Payoff:**
- **Beat map:**
- **Absence reason:**
```

Keep `NONE` as the truthful result when no candidate earns the role. Keep the worked
template’s one-beat `NONE` example and the rubric’s outcome-based scoring. Do not expand the
structural validator’s scope.

- [ ] **Step 3: Remove stale steering detail and restore one gate**

Delete the uncommitted `Design the storytelling engine before writing the beat structure`
block. Preserve the committed concise story owner-routing invariant and add only the
concise supporting-throughline channel invariant.

Restore workflow step 4 and step 5 to the committed canonical wording so:

- the complete visible Story Progression Plan is returned once;
- the direct-instruction route is stated once;
- beat ordering and narration remain forbidden before whole-plan approval; and
- the next step consumes both approved baselines.

- [ ] **Step 4: Reconcile the decision ledger**

Keep the supporting-throughline decision entry. Change the story-progression record from:

```text
The writing-skill implementation will follow the approved design
```

to current-state language:

```text
The writing-skill implementation follows the approved design
```

Update its document list to name the implemented owner, consumers, tests, format, template,
rubric, and synthetic evidence rather than implying only steering and the design exist.

- [ ] **Step 5: Run focused GREEN checks**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k supporting_narrative_throughline -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k throughline_owner -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k canonical_steering -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k story_owner_cross_links -v
```

Expected: all selected tests pass.

- [ ] **Step 6: Commit the throughline feature**

Stage only the throughline, steering-owner, decision, and associated test hunks. Inspect the
complete cached diff, then commit:

```bash
git commit -m "feat(skill): add optional supporting narrative throughlines"
```

Do not stage memory-first guidance, checker changes, or the Episode 1 pre-draft in this
commit.

### Task 3: Reconcile the memory-first walking-vlog gate

**Files:**
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/scripts/check_spoken_readability.py`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_check_spoken_readability.py`
- Modify:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`
- Modify: `whp-youtube/STEERING.md`
- Modify: `DECISIONS.md`

- [ ] **Step 1: Restore the entrypoint’s focused diff**

Restore committed wrapping throughout `SKILL.md`, then add only a concise Phase 0 trigger:

```markdown
When Martin explicitly requests a walking-vlog, walk-and-talk, from-memory, or
no-teleprompter pre-draft, run the memory-first delivery pass before returning it. This is
a focused delivery check, not a production audit. Follow
[the rapid memory-first owner](references/rapid-prototyping.md#run-the-memory-first-walking-vlog-pass).
```

Do not copy the detailed number, quotation, trust-anchor, or wording procedure into the
entrypoint.

- [ ] **Step 2: Establish rapid as the detailed owner**

Add:

```markdown
### Run the memory-first walking-vlog pass
```

Retain the existing detailed procedure under that heading. In story guidance, replace the
copied procedure with a one-sentence route to this heading. In steering, keep a concise
permanent invariant plus the same owner link.

Rewrite the rubric as an outcome check:

```markdown
For an explicitly requested walking-vlog pre-draft, a top delivery score requires every
flagged number and quotation to have a deliberate, documented spoken treatment that
preserves the factual boundary and can be reproduced naturally from memory.
```

- [ ] **Step 3: Keep deterministic checker reviews**

Retain `EXACT_PARTICIPANT_COUNT_RE`, `SUBSTANTIAL_QUOTATION_RE`, and the review-only
classification. Remove the unused `word_count` argument from `_semantic_review_reason`:

```python
def _semantic_review_reason(text: str) -> str | None:
    ...

semantic_review_reason = _semantic_review_reason(sentence.text)
```

Keep the existing tests for `138 radiologists`, a substantial quoted medical question, and
a wrapped quotation. Add this short-quotation test proving a quotation under eight words
does not receive the semantic quotation review:

```python
def test_short_quotation_does_not_require_memory_delivery_review(self) -> None:
    finding = analyze_markdown(
        '> He said, “Check outside the chat.”\n'
    )[0]

    self.assertEqual(finding.level, "pass")
```

- [ ] **Step 4: Keep one current decision record**

Retain the walking-vlog decision entry with the explicit trigger, human-review semantics,
and affected documents. Ensure it points to rapid guidance as the detailed execution owner
instead of implying every consumer owns the full procedure.

- [ ] **Step 5: Run focused GREEN checks**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_check_spoken_readability.py
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k memory_owner -v
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py \
  -k explicit_walking_predraft -v
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/writing-whp-youtube-scripts
wc -l .agents/skills/writing-whp-youtube-scripts/SKILL.md
```

Expected: all tests pass, validation reports `Skill is valid!`, and `SKILL.md` remains at
or below 480 lines.

- [ ] **Step 6: Commit the memory-first gate**

Stage only memory-first, checker, decision, and associated test hunks. Inspect the complete
cached diff, then commit:

```bash
git commit -m "fix(skill): enforce memory-first walking predrafts"
```

Do not stage the Episode 1 pre-draft.

### Task 4: Finish the Episode 1 medical-sidecar pre-draft

**Files:**
- Create:
  `whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md`

- [ ] **Step 1: Audit the primary medical source**

Open the cited case report:

```text
https://pmc.ncbi.nlm.nih.gov/articles/PMC11006786/
```

Verify the narration and appendix against the primary report for the patient’s age range,
procedure, timing, recurrent double vision, prompt framing, response content, prior medical
instruction, delayed help-seeking, ambulance, diagnosis, hospital course, alternate prompt,
and counterfactual limits. Record only corrections required by the source; do not add
clinical detail that does no story job.

- [ ] **Step 2: Preserve the canonical Episode 1 evidence boundary**

Compare the pre-draft with:

```text
whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md
```

Keep the approved radiologist, sycophancy, processing-fluency, algorithm-appreciation,
anchoring, repeated-feedback, and viewer-tool claims within their canonical scopes. The
medical case illustrates the decision route; it does not prove those mechanisms.

- [ ] **Step 3: Resolve both quotation reviews**

Retain the medical prompt as an explicitly labeled faithful paraphrase and keep its exact
source wording in the delivery audit. Add a delivery-audit row for:

```text
“Should I buy this house, or keep throwing money away on rent?”
```

Classify it as an original illustrative line rather than a source quotation, and state
whether it remains locked for memory delivery or is shortened. Do not use `--reviewed`
until both review decisions are visible in the artifact.

- [ ] **Step 4: Run the pre-draft delivery gate**

Run:

```bash
cd .agents/skills/writing-whp-youtube-scripts
python3 scripts/check_spoken_readability.py -- \
  "/home/martin/work/projects/why-humans-play/why-humans-play_sources/whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md"
```

Expected before acknowledgement: exactly the deliberately retained review findings and no
`FAIL`.

After verifying their audit entries, run:

```bash
python3 scripts/check_spoken_readability.py --reviewed -- \
  "/home/martin/work/projects/why-humans-play/why-humans-play_sources/whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md"
```

Expected: exit zero.

- [ ] **Step 5: Commit the pre-draft**

Confirm the artifact still says `PRE-DRAFT`, stage only that file, inspect it, and commit:

```bash
git commit -m "content(youtube): add Episode 1 medical-sidecar predraft"
```

### Task 5: Verify and review the complete branch

**Files:**
- Test all files under:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_*.py`
- Validate:
  `.agents/skills/writing-whp-youtube-scripts/`
- Review:
  all commits after `main`

- [ ] **Step 1: Run focused and full live verification**

Run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
python3 -m unittest discover \
  -s .agents/skills/writing-whp-youtube-scripts/scripts \
  -p 'test_*.py'
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/writing-whp-youtube-scripts
git diff --check
git diff --cached --check
```

Expected: zero failures, `Skill is valid!`, and no whitespace errors.

- [ ] **Step 2: Run static ownership checks**

Confirm:

- the detailed throughline candidate gates occur only in the story owner;
- the detailed memory-first procedure occurs only in rapid guidance;
- every owner link targets a declared heading;
- steering has one progression approval route;
- the stale future-tense decision sentence is absent;
- `SKILL.md` has no unrelated paragraph-reflow diff; and
- the index is empty.

- [ ] **Step 3: Verify a clean committed snapshot**

Export `HEAD` to a temporary directory with `git archive HEAD`, then run the same package
tests, full discovery, validator, entrypoint line count, and static ownership searches from
that clean snapshot.

Expected: clean `HEAD` passes independently of any remaining worktree state.

- [ ] **Step 4: Request independent review**

Ask a reviewer to inspect the clean committed branch for:

- design/spec compliance;
- single-owner boundaries;
- factual and counterfactual safety in the medical case;
- focused commit scope;
- stale or duplicate steering;
- test quality; and
- explicit readiness for branch handoff.

Fix every Critical, Important, or Minor finding before completion.

- [ ] **Step 5: Report exact evidence**

Report commit hashes, live and clean test counts, validator results, pre-draft checker
result, review outcome, branch status, and whether any uncommitted files remain.
