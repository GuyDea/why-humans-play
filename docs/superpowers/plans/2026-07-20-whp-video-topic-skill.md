# WHP Video Topic Selection Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a project-local skill that researches current audience opportunity and selects one evidence-backed, reach-weighted topic and angle for WHP's next YouTube video.

**Architecture:** Keep discovery and orchestration in `SKILL.md`, detailed evidence collection and scoring rules in `references/research-method.md`, and the reusable decision report in `references/output-contract.md`. Establish a no-skill baseline first, scaffold with the system skill creator, then forward-test fresh agents against the same scenarios and refine only where observed failures justify it.

**Tech Stack:** Markdown Agent Skill files, YAML interface metadata, live web research, Git, Python 3 skill-creator validation scripts, and fresh Codex subagents for documentation TDD.

---

## File map

| Path | Responsibility |
|---|---|
| `docs/research/2026-07-20-whp-topic-skill-evaluations.md` | Preserve baseline and forward-test scenarios, exact failure excerpts, scored results, refinements, and final acceptance evidence. |
| `.agents/skills/choosing-whp-video-topic/SKILL.md` | Trigger the skill, read current WHP context, enforce the decision funnel and hard gates, route to references, and require one winner. |
| `.agents/skills/choosing-whp-video-topic/agents/openai.yaml` | Supply concise UI metadata and a default invocation prompt. |
| `.agents/skills/choosing-whp-video-topic/references/research-method.md` | Define evidence modes, research queries, comparison rules, scoring anchors, confidence, and error handling. |
| `.agents/skills/choosing-whp-video-topic/references/output-contract.md` | Define the complete recommendation report and final completeness audit. |
| `docs/superpowers/specs/2026-07-20-whp-video-topic-skill-design.md` | Change design status to implemented only after structural and behavioral verification passes. |

No script, asset, persistent topic ledger, paid data source, or API integration is part of this implementation.

### Task 1: Capture the no-skill baseline

**Files:**

- Create: `docs/research/2026-07-20-whp-topic-skill-evaluations.md`

- [ ] **Step 1: Confirm the task branch and clean starting state**

Run:

```bash
git branch --show-current
git status --short
```

Expected: branch `feat/whp-video-topic-skill`; only the committed design package is present and there are no uncommitted skill files.

- [ ] **Step 2: Dispatch three fresh baseline agents without the proposed skill**

Use fresh agents with no forked conversation context. Tell each agent not to read the approved design, research, steering record, or any future `choosing-whp-video-topic` skill. Give each one exactly one scenario and require a final answer rather than questions.

Scenario A — cold-start and actual games:

```text
Act as the editorial researcher for a new English-language YouTube channel called Why Humans Play. The channel has no useful private analytics yet, is made by one presenter, and can publish one researched 8–12 minute video in three weeks. The creator likes Sudoku and thinks its history could work, but does not want that preference rubber-stamped. Research current public evidence and decide the single best topic and angle for the next video. Topics may range broadly across actual games, puzzles, play, and what they reveal about humans. Show how you considered alternatives, cite current evidence, and choose one winner. Do not ask follow-up questions.
```

Scenario B — trend bait and misleading metrics:

```text
Act as the editorial researcher for Why Humans Play, an ideas channel using games and play to explain humanity. A collaborator insists the next video should be "AI is changing everything" because one AI video has 20 million views and Google Trends briefly reached 100 this week. The only proposed play connection is that some AI agents were evaluated in games. There is a five-day deadline and pressure to chase the spike. Research the opportunity, compare it with broader games/play/human candidates, and choose the single best next topic and angle. Explain whether the raw view count and trend peak are decision-worthy. Do not ask follow-up questions.
```

Scenario C — conflicting evidence and forced choice:

```text
Act as the editorial researcher for Why Humans Play. The current finalists are a video about how Sudoku conquered the world and a video about why humans turn work into status games. Public signals are mixed: Sudoku appears evergreen and visually clear, while workplace status is broader but more competitive and harder to prove. There is no reliable channel analytics history. Research both plus credible alternatives, apply a transparent comparison, and choose exactly one next video. Include an honest package direction, the decisive uncertainty, and why the runner-up lost. Do not return an unordered menu and do not ask follow-up questions.
```

- [ ] **Step 3: Evaluate baseline outputs against one fixed rubric**

For each response, record `pass`, `partial`, or `fail` for all twelve checks:

1. establishes date, market, constraints, and cold-start/channel-aware mode;
2. reads or requests current WHP doctrine and episode state without inventing them;
3. explores at least 30 diverse subjects before narrowing;
4. separates broad subjects from specific, filmable angles;
5. treats actual games and game history as first-class candidates;
6. applies game/play centrality, human revelation, payoff, evidence, feasibility, and duplication gates;
7. uses multiple independent demand and competition signals;
8. handles normalized Trends values, raw views, spikes, and missing analytics correctly;
9. separates observed facts, estimates, and editorial inference with dates and links;
10. applies a reach-heavy comparison without letting trend bait bypass WHP rigor;
11. tests package/payoff alignment for the top candidates; and
12. chooses one winner and directly explains why the runner-up lost.

Capture exact excerpts for each meaningful failure or rationalization. Do not summarize a failure more favorably than the agent's actual response.

- [ ] **Step 4: Write the baseline evaluation record**

Create the evaluation document with these concrete sections:

```markdown
# WHP Topic Skill Evaluations

- Date and branch
- Purpose and method
- Fixed twelve-check rubric
- Scenario A: prompt, complete baseline response, rubric result, exact failure excerpts
- Scenario B: prompt, complete baseline response, rubric result, exact failure excerpts
- Scenario C: prompt, complete baseline response, rubric result, exact failure excerpts
- Cross-scenario baseline failure patterns
- Forward-test results
- Refinements and final verdict
```

The last two sections initially state that forward testing follows implementation; they must be replaced with actual results before final handoff.

- [ ] **Step 5: Verify and commit the baseline evidence**

Run:

```bash
git diff --check
```

Expected: no output.

Run:

```bash
git add docs/research/2026-07-20-whp-topic-skill-evaluations.md
git commit -m "test(skill): capture WHP topic selection baseline"
```

Expected: one commit containing only the evaluation record.

### Task 2: Scaffold the skill and write the orchestration workflow

**Files:**

- Create: `.agents/skills/choosing-whp-video-topic/SKILL.md`
- Create: `.agents/skills/choosing-whp-video-topic/agents/openai.yaml`
- Create directory: `.agents/skills/choosing-whp-video-topic/references/`

- [ ] **Step 1: Scaffold with the system skill creator**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/init_skill.py choosing-whp-video-topic --path .agents/skills --resources references --interface display_name="Choosing WHP Video Topics" --interface short_description="Find WHP's best next video topic" --interface default_prompt='Use $choosing-whp-video-topic to research and recommend the single best topic and angle for WHP's next YouTube video.'
```

Expected: a new skill directory containing `SKILL.md`, `agents/openai.yaml`, and an empty `references/` directory, with no scripts or assets.

- [ ] **Step 2: Inspect the generated files before replacement**

Run:

```bash
find .agents/skills/choosing-whp-video-topic -maxdepth 3 -type f -print
sed -n '1,240p' .agents/skills/choosing-whp-video-topic/SKILL.md
sed -n '1,120p' .agents/skills/choosing-whp-video-topic/agents/openai.yaml
```

Expected: only generated scaffolding; confirm the interface strings before editing.

- [ ] **Step 3: Replace `SKILL.md` with the discovery and decision workflow**

Use this exact frontmatter:

```yaml
---
name: choosing-whp-video-topic
description: Researches and selects the best next Why Humans Play YouTube video topic and angle using current audience signals, a reach-weighted scorecard, WHP eligibility gates, packaging tests, and evidence confidence. Use when deciding what WHP video to make next, evaluating or comparing WHP episode ideas, researching games/play/humanity subjects, or building a research-backed video shortlist.
---
```

The body must remain under 500 lines and implement these sections in this order:

1. **Outcome** — state that a complete run returns one cited winner, not brainstorming alone or a performance guarantee.
2. **Required progress checklist** — frame, mode, signals, 30 subjects, angles, gates, shortlist, deep research, score, packages, winner, audit.
3. **Read current WHP context** — require `BRAND.md`, `whp-youtube/STEERING.md`, episode records/drafts/backlog, and user constraints; document missing files rather than inventing state.
4. **Choose evidence mode** — channel-aware when meaningful private data is supplied, otherwise cold-start; never request credentials or block on absent analytics.
5. **Read the references** — require `references/research-method.md` before research/scoring and `references/output-contract.md` before composing the answer.
6. **Generate before judging** — at least 30 diverse subjects seeded from independent signals and WHP lanes, then at least two materially different angles for promising subjects.
7. **Apply hard gates at angle level** — game/play centrality, human revelation, recognized payoff, evidence path, production reality, and portfolio fit; a failed angle may be reframed.
8. **Narrow in stages** — shallow scan to roughly 8–12, deep multi-signal research on finalists, then a ranked shortlist of roughly five.
9. **Score and stress-test** — use the exact 100-point weights from the research reference, attach evidence grades and uncertainty, and create three distinct package promises for every top-three finalist.
10. **Decide** — choose exactly one winner, explain why it wins now and why the runner-up loses, name a falsifier/pre-script verification need, and give two adjacent follow-ups.
11. **Failure handling** — mark missing/ambiguous data unknown, lower confidence, use a reduced-confidence public-evidence fallback when live research is unavailable, and never fabricate metrics or sources.
12. **Boundaries** — stop at topic, angle, packaging direction, and research brief; do not write a full script or claim guaranteed reach.

Prominently include this editorial bridge:

```text
familiar game, event, person, institution, or trend
    + game/play mechanism
    + recognizable human stakes
    + evidence-backed surprise, use, or reframe
```

Also include the specific warning that a broad sentence such as “AI is changing everything” or one viral view count is not a filmable, evidenced WHP angle.

- [ ] **Step 4: Normalize `agents/openai.yaml`**

Ensure the generated file contains exactly this metadata and no nonexistent dependencies or icons:

```yaml
interface:
  display_name: "Choosing WHP Video Topics"
  short_description: "Find WHP's best next video topic"
  default_prompt: "Use $choosing-whp-video-topic to research and recommend the single best topic and angle for WHP's next YouTube video."

policy:
  allow_implicit_invocation: true
```

- [ ] **Step 5: Run the first structural check and commit**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/choosing-whp-video-topic
```

Expected: `Skill is valid!`

Run:

```bash
git diff --check
git add .agents/skills/choosing-whp-video-topic/SKILL.md .agents/skills/choosing-whp-video-topic/agents/openai.yaml
git commit -m "feat(skill): add WHP topic selection workflow"
```

Expected: the core skill and UI metadata are committed; the reference directory remains ready for its focused files.

### Task 3: Add the evidence and reach-scoring research method

**Files:**

- Create: `.agents/skills/choosing-whp-video-topic/references/research-method.md`

- [ ] **Step 1: Write the research method with direct navigation**

Start with a contents list because this reference will exceed 100 lines. Use these top-level sections:

```markdown
# Research Method

## Contents
- Evidence mode
- Signal collection order
- Candidate lane map
- Subject-to-angle development
- Shallow and deep research
- Evidence ledger
- Reach-weighted scorecard
- Packaging stress test
- Error handling and confidence

## Evidence mode
## Signal collection order
## Candidate lane map
## Subject-to-angle development
## Shallow and deep research
## Evidence ledger
## Reach-weighted scorecard
## Packaging stress test
## Error handling and confidence
```

- [ ] **Step 2: Specify source priorities and comparison rules**

Require current research because recommendations are time-sensitive. Define channel-aware sources as supplied YouTube Studio Trends, Audience, Advanced Mode, comments/polls, and prior WHP appeal/engagement/satisfaction patterns. Define cold-start sources as public YouTube results, age- and format-aware relative outliers, Google Trends in YouTube Search mode, adjacent creators, audience-language evidence, current events/releases/anniversaries, and evergreen durability.

For each observation, require:

```text
claim or signal | source URL/file | observed value | observation date
geography | language | format | comparison window | fact/estimate/inference
```

Encode these non-negotiable comparison rules:

- Google Trends values are normalized relative interest, not absolute search volume.
- A value of 100 is a local peak in the selected comparison, not “maximum demand.”
- Raw public views are not cross-channel demand estimates.
- Compare outliers within the same format and a reasonable age/channel baseline.
- A breakout is a lead, not causal proof that the subject generated the views.
- Shorts content gaps are adjacent evidence, not a long-form guarantee.
- Personalized or AI-generated suggestions are leads that require independent verification.
- Separate evergreen demand, sustained growth, seasonality, and short-lived news spikes.
- Prefer first-party platform documentation and primary factual sources for load-bearing claims.
- Never present a third-party estimate or editorial inference as an observed fact.

- [ ] **Step 3: Define deliberate breadth and angle formation**

Require the initial pool to cover multiple lanes rather than quota-filling one theme:

```text
actual games, puzzles, sports, and play forms
history, rules, design, strategy, and game culture
evolution, biology, anthropology, and psychology of play
learning, memory, intelligence, mastery, and education
incentives, game theory, status, work, money, politics, and institutions
AI, simulation, agents, and games as learning environments
communities, virtual worlds, game economies, and digital culture
philosophy, ethics, meaning, cooperation, competition, and the future of play
```

For each promising subject, require at least two angles that each identify familiar entry point, tension or misconception, human stake, earned payoff, evidence backbone, and intended viewer beyond current followers. Include Sudoku as the canonical example of subject versus angle, while explicitly preventing it from becoming a default recommendation.

- [ ] **Step 4: Encode the 100-point scorecard and evidence grades**

Use the exact weights:

| Criterion | Weight |
|---|---:|
| Audience demand and reachable market | 25 |
| Competitive opening or content gap | 15 |
| Packaging strength and immediate appeal | 20 |
| Likely satisfaction, usefulness, and shareability | 15 |
| Strength of the WHP lens | 10 |
| Evidence quality and defensibility | 10 |
| Production feasibility and sequence | 5 |

Define integer anchor scores so repeated runs do not imply fake precision:

| Weight | Unsupported | Weak | Mixed | Strong | Exceptional |
|---:|---:|---:|---:|---:|---:|
| 25 | 0 | 6 | 13 | 19 | 25 |
| 20 | 0 | 5 | 10 | 15 | 20 |
| 15 | 0 | 4 | 8 | 11 | 15 |
| 10 | 0 | 3 | 5 | 8 | 10 |
| 5 | 0 | 1 | 3 | 4 | 5 |

Permit an intermediate integer only when the rationale explains why it falls between anchors. Define grades independently from score:

- `A`: direct first-party/primary evidence or several strong convergent observations;
- `B`: credible indirect evidence with a meaningful limitation;
- `C`: weak proxy, sparse evidence, unresolved conflict, or editorial inference; and
- `unknown`: unavailable evidence, never silently converted to zero.

Every criterion must have score, grade, one-sentence rationale, cited observations, and largest uncertainty. The three reach-facing criteria total 60 points, but none can override a failed hard gate.

- [ ] **Step 5: Define packaging and confidence tests**

For every top-three finalist, require three materially different title/thumbnail promises. Each direction identifies intended viewer, familiar element, unexpected element, open question, visual promise, and delivered payoff. Reject bait that attracts a different audience from the finished video.

Define confidence as `high`, `medium`, or `low` based on evidence convergence and availability, not score alone. When evidence is tied, require a provisional winner plus the smallest decisive test; never return only a menu.

- [ ] **Step 6: Validate reference links and commit**

Run:

```bash
rg -n "research-method.md|output-contract.md" .agents/skills/choosing-whp-video-topic/SKILL.md
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/choosing-whp-video-topic
git diff --check
```

Expected: both direct reference routes appear in `SKILL.md`, validation succeeds, and the diff check has no output.

Run:

```bash
git add .agents/skills/choosing-whp-video-topic/references/research-method.md
git commit -m "feat(skill): add WHP topic research method"
```

### Task 4: Add the reusable decision report and audit

**Files:**

- Create: `.agents/skills/choosing-whp-video-topic/references/output-contract.md`

- [ ] **Step 1: Write the exact report structure**

Start with a contents list and require these sections in every complete run:

```markdown
# WHP Next-Video Recommendation

## Decision
## Decision frame
## Candidate landscape
## Ranked shortlist
## Packaging stress test
## Winner brief
## Why the runner-up lost
## Research trail
## Pre-script verification
## Completeness audit
```

The `Decision` section leads with one topic-and-angle winner, confidence, one-sentence reason, and the strongest package direction.

- [ ] **Step 2: Define exact tables and fields**

Require the decision-frame table to include date, target market/language, publication window, mode, constraints, WHP files read, analytics supplied/unavailable, and research limitations.

Require the ranked-shortlist table to include:

```text
rank | subject | exact angle | demand /25 | opening /15 | package /20
satisfaction /15 | WHP /10 | evidence /10 | feasibility /5
total /100 | evidence grade | confidence | decisive risk
```

Require the packaging table to include finalist, direction, working title, intended viewer, familiar element, surprise/tension, visual promise, and delivered payoff. There must be three rows for each top-three finalist.

Require the winner brief to include exact angle, logline, intended viewer, why now, human revelation, useful or earned payoff, WHP fit, reach evidence, evidence backbone, production implications, falsifier, pre-script checks, and two adjacent follow-ups.

Require the research trail to list direct links/files, observation dates, metrics with context, whether each item is fact/estimate/inference, contradictory evidence, unavailable evidence, and claims requiring deeper verification.

- [ ] **Step 3: Add a strict completeness audit**

The final audit must answer yes or no to all of these:

1. at least 30 diverse subjects considered;
2. subjects converted into materially different angles;
3. all six hard gates applied at angle level;
4. multiple independent signals used per finalist or reduced confidence disclosed;
5. volatile evidence dated and contextualized;
6. Trends, raw views, outliers, and missing data interpreted correctly;
7. scores total correctly and include grades plus uncertainty;
8. three packages supplied for each top-three finalist;
9. package promise matches delivered payoff;
10. one winner named before the analysis;
11. runner-up loss explained directly; and
12. no fabricated observation, guarantee, or unsupported load-bearing claim.

Any `no` must be corrected before delivery unless it reflects genuinely unavailable evidence; in that case disclose the limitation and lower confidence.

- [ ] **Step 4: Validate the complete skill and commit**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/choosing-whp-video-topic
find .agents/skills/choosing-whp-video-topic -maxdepth 3 -type f -print
git diff --check
```

Expected: `Skill is valid!`, exactly four skill files, and no diff errors.

Run:

```bash
git add .agents/skills/choosing-whp-video-topic/references/output-contract.md
git commit -m "feat(skill): add WHP topic decision report"
```

### Task 5: Forward-test the skill and close observed gaps

**Files:**

- Modify: `docs/research/2026-07-20-whp-topic-skill-evaluations.md`
- Modify when justified by a failed check: `.agents/skills/choosing-whp-video-topic/SKILL.md`
- Modify when justified by a failed check: `.agents/skills/choosing-whp-video-topic/references/research-method.md`
- Modify when justified by a failed check: `.agents/skills/choosing-whp-video-topic/references/output-contract.md`

- [ ] **Step 1: Dispatch three fresh forward-test agents**

Use new agents with no forked conversation context. Give them the same Scenario A, B, and C prompts from Task 1, preceded by this instruction:

```text
This is a real editorial decision. Before acting, read all of the following files completely and follow them as the governing workflow:
/tmp/why-humans-play-video-topic-skill/.agents/skills/choosing-whp-video-topic/SKILL.md
/tmp/why-humans-play-video-topic-skill/.agents/skills/choosing-whp-video-topic/references/research-method.md
/tmp/why-humans-play-video-topic-skill/.agents/skills/choosing-whp-video-topic/references/output-contract.md

Work read-only. Use current public research where the workflow requires it. Return the complete recommendation and do not edit repository files.
```

- [ ] **Step 2: Score forward outputs with the unchanged rubric**

Apply the same twelve checks from Task 1. Record complete outputs, pass/partial/fail results, exact failure excerpts, and comparison with baseline. A forward pass requires all hard-gate, evidence-integrity, scoring, package-alignment, and single-winner checks to pass; formatting omissions may be repaired, but they are still recorded.

- [ ] **Step 3: Refactor only against observed failures**

For each failed or partial check:

1. identify the exact agent wording or skipped action;
2. map it to one governing file;
3. add the smallest explicit instruction, warning, example, or audit item that closes it;
4. preserve the approved weights and hard gates; and
5. rerun the affected scenario with a fresh agent.

Continue until the affected scenario passes or the remaining limitation is external and explicitly lowers confidence. Do not expand the skill for hypothetical edge cases that did not appear.

- [ ] **Step 4: Finish the evaluation record**

Replace the initial forward-test note with actual outputs and results. In `Refinements and final verdict`, list every skill change caused by testing, the failure it addressed, the rerun outcome, and whether all acceptance checks passed.

- [ ] **Step 5: Validate and commit the tested behavior**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/choosing-whp-video-topic
git diff --check
```

Expected: structural validation succeeds and no whitespace errors remain.

Run:

```bash
git add docs/research/2026-07-20-whp-topic-skill-evaluations.md .agents/skills/choosing-whp-video-topic/SKILL.md .agents/skills/choosing-whp-video-topic/references/research-method.md .agents/skills/choosing-whp-video-topic/references/output-contract.md
git commit -m "test(skill): verify WHP topic selection workflow"
```

Expected: evaluation evidence and only test-driven refinements are committed.

### Task 6: Final verification, review, and implementation status

**Files:**

- Modify: `docs/superpowers/specs/2026-07-20-whp-video-topic-skill-design.md`

- [ ] **Step 1: Run mechanical verification from a clean index**

Run:

```bash
python3 /home/martin/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/choosing-whp-video-topic
```

Expected: `Skill is valid!`

Run:

```bash
find .agents/skills/choosing-whp-video-topic -maxdepth 3 -type f -print
```

Expected paths:

```text
.agents/skills/choosing-whp-video-topic/SKILL.md
.agents/skills/choosing-whp-video-topic/agents/openai.yaml
.agents/skills/choosing-whp-video-topic/references/research-method.md
.agents/skills/choosing-whp-video-topic/references/output-contract.md
```

Run:

```bash
wc -l .agents/skills/choosing-whp-video-topic/SKILL.md
```

Expected: fewer than 500 lines.

Run:

```bash
git diff main...HEAD --check
git status --short --branch
```

Expected: no diff-check output and a clean `feat/whp-video-topic-skill` branch.

- [ ] **Step 2: Review against the approved specification**

Check every acceptance criterion in `docs/superpowers/specs/2026-07-20-whp-video-topic-skill-design.md` against a concrete skill section or evaluation result. Verify especially broad actual-game eligibility, 60 reach-facing points, current research, missing-data honesty, top-three package testing, and one decisive winner.

- [ ] **Step 3: Request an independent code/documentation review**

Use the `superpowers:requesting-code-review` skill. Give the reviewer the diff from `main`, the design specification, the evaluation record, and the four skill artifacts. Resolve any correctness issue and rerun the mechanical checks plus the affected behavioral scenario.

- [ ] **Step 4: Mark the design implemented and commit**

Change only the design status line from:

```markdown
- **Status:** Approved for written-spec review
```

to:

```markdown
- **Status:** Implemented and verified
```

Run:

```bash
git add docs/superpowers/specs/2026-07-20-whp-video-topic-skill-design.md
git commit -m "docs(skill): mark WHP topic skill verified"
```

- [ ] **Step 5: Perform final branch and original-checkout audit**

Run in the task worktree:

```bash
git log --oneline --decorate -8
git status --short --branch
```

Expected: the task branch is clean and shows the design, plan, baseline, implementation, evaluation, and status commits.

Run in `/home/martin/work/projects/why-humans-play/why-humans-play_sources`:

```bash
git status --short --branch
```

Expected: `main` remains checked out and the pre-existing untracked `whp-youtube/EP1-SYNOPSIS.md` remains untouched.

- [ ] **Step 6: Use the branch-finishing workflow**

Use `superpowers:finishing-a-development-branch` only after every command above passes. Present the user with the verified branch outcome and the supported integration choices without mutating `main` automatically.
