# WHP Video Topic Selection Skill — Design

- **Status:** Approved for written-spec review
- **Date:** 2026-07-20
- **Target:** `.agents/skills/choosing-whp-video-topic/`
- **Research summary:** [`2026-07-20-youtube-topic-selection.md`](../../research/2026-07-20-youtube-topic-selection.md)

## Purpose

Create a project-local Codex skill that performs fresh research and recommends the single
best topic and angle for WHP's next YouTube video. Optimize strongly for reachable audience
while preserving the channel's identity, rigor, useful payoff, and solo-production reality.

The skill must work now, when WHP has little or no useful channel history, and later, when
private YouTube Analytics can become the strongest audience-specific signal.

## Success contract

A successful run:

1. searches a broad, current, and independently seeded topic space;
2. distinguishes a subject from a filmable video angle;
3. rejects candidates that are popular but not recognizably WHP;
4. evaluates reach through several signals rather than one proxy;
5. tests whether finalists can support an honest, compelling package and payoff;
6. names one winner with a clear comparison against the runner-up; and
7. cites evidence, dates volatile observations, and states uncertainty.

## Non-goals

- Write the full narration or shooting script.
- Produce thumbnails.
- Guarantee views or claim to reverse-engineer YouTube's recommendation system.
- Treat search volume as the whole reachable audience.
- Copy the canonical brand doctrine into the skill.
- Require paid tools, API keys, or authenticated browser access.

## WHP eligibility

The eligible universe is deliberately broad. A subject may come from:

- actual games, puzzles, sports, and play forms;
- game and puzzle history, rules, design, strategy, and culture;
- evolution, biology, anthropology, and psychology of play;
- intelligence, learning, memory, mastery, and education;
- hidden games, incentives, game theory, status, money, work, politics, and institutions;
- AI, simulation, agents, and games as learning environments;
- communities, virtual worlds, game economies, and digital culture; or
- philosophy, ethics, meaning, constraints, competition, cooperation, and the future of
  play.

A candidate must pass all of these gates:

1. **Game/play centrality:** games or play are the subject or explanatory mechanism, not a
   decorative metaphor.
2. **Human revelation:** the angle reveals something meaningful about human behavior,
   learning, culture, intelligence, relationships, or institutions.
3. **Recognized payoff:** a viewer can state what they will understand, see differently,
   or do differently after watching.
4. **Evidence path:** credible sources exist for the load-bearing claims and caveats.
5. **Production reality:** the idea can be executed credibly within current WHP resources.
6. **Portfolio fit:** it does not merely duplicate a published, committed, or current
   episode unless the new angle is materially distinct.

For example, `Sudoku` is a subject. `How Sudoku conquered the world—and what its nearly
perfect rules reveal about human puzzle hunger` is a candidate angle that can be researched
and packaged.

## Core editorial model

WHP is an ideas channel where games and play are a lens for explaining humanity. Broadness
therefore comes from the range of objects examined, while coherence comes from the lens and
payoff.

Use this bridge to develop angles:

```text
familiar game, event, person, institution, or trend
    + game/play mechanism
    + recognizable human stakes
    + evidence-backed surprise, use, or reframe
```

Do not mistake a bold sentence for an established thesis. Statements such as “games are the
operating system of intelligence” may be useful hypotheses or packaging directions, but they
must be earned, scoped, and verified before they become a recommendation.

## Workflow and data flow

```text
WHP doctrine + episode state + production constraints
                       |
                       v
          independent signal collection
                       |
                       v
       >=30 diverse subjects across WHP lanes
                       |
                       v
          subjects -> multiple specific angles
                       |
                       v
           hard eligibility and duplication gates
                       |
                       v
          shallow evidence scan and shortlist
                       |
                       v
       deep multi-signal research on finalists
                       |
                       v
       reach-weighted score + evidence confidence
                       |
                       v
       top-three packaging and payoff stress test
                       |
                       v
       one winner + runner-up comparison + sources
```

### 1. Establish the decision frame

Read, in priority order:

1. `BRAND.md`;
2. `whp-youtube/STEERING.md`;
3. published episode records, current synopses/drafts, and backlog files; and
4. production or timing constraints supplied for the run.

Record the target viewer market, language, desired publication window, already-covered
subjects, current series promises, and any immovable constraints. Do not let a stale backlog
override current live evidence or a newer approved episode decision.

### 2. Choose the evidence mode

Use **channel-aware mode** when meaningful YouTube Studio data is available. Prefer:

- Trends-tab top searches, audience interest, breakout videos, recent watched videos, and
  Shorts content-gap clues (used as adjacent demand evidence, not a long-form guarantee);
- Audience-tab “what your audience watches” and adjacent channels;
- Advanced Mode comparisons of consistent topic/format groups over equal lifespan windows;
- comments, polls, and repeated viewer questions; and
- the observed appeal, engagement, satisfaction, traffic source, and viewer-acquisition
  patterns of prior WHP episodes.

Use **cold-start mode** when private data is missing or too sparse. Build evidence from:

- public YouTube search/results and recent videos;
- same-format, age-aware outliers relative to each channel's normal performance;
- Google Trends set to YouTube Search, with consistent geography and comparison windows;
- adjacent creators and audience overlaps;
- audience language and recurring questions in forums, comments, communities, and search
  suggestions;
- news, research, anniversaries, releases, competitions, and seasonal timing; and
- the historical durability of evergreen subjects.

Never block solely because private analytics are absent. Switch modes, state the limitation,
and lower confidence.

### 3. Generate a diverse subject pool

Generate at least 30 subjects before ranking. Seed the pool from multiple external and
internal sources rather than asking the model to improvise one long list from memory. Cover
the WHP lanes deliberately; do not produce twenty semantic variations of one fashionable
theme.

Continue past the first obvious ideas. Separate divergence from evaluation so early scoring
does not collapse the search space.

### 4. Turn subjects into angles

For promising subjects, create at least two materially different angles using the editorial
bridge. Each angle must state:

- the familiar entry point;
- the tension, puzzle, or misconception;
- the human stake;
- the earned payoff;
- the likely evidence backbone; and
- the intended viewer beyond existing WHP followers.

Apply eligibility and duplication gates at the angle level. A weak angle does not disqualify
the underlying subject from being reframed.

### 5. Run a shallow scan, then deep research

Use a shallow evidence scan to reduce the eligible pool to roughly 8–12 candidates. Deeply
research only the finalists. For each finalist, seek independent evidence for:

- audience interest and trajectory;
- competitive supply and quality;
- comparable breakout performance;
- recognizable viewer language and questions;
- packaging possibilities;
- evidence strength and caveats;
- production requirements; and
- relationship to the current episode sequence.

No candidate may win on a single signal. Distinguish observed facts, third-party estimates,
and editorial inference.

### 6. Score candidates

Apply the hard gates before scoring. Score remaining candidates on a 100-point rubric:

| Criterion | Weight | Core question |
|---|---:|---|
| Audience demand and reachable market | 25 | Is there evidence that a meaningful audience cares now or reliably over time? |
| Competitive opening or content gap | 15 | Is there room for this specific angle and quality level? |
| Packaging strength and immediate appeal | 20 | Can a stranger understand and want the promise in one glance? |
| Likely satisfaction, usefulness, and shareability | 15 | Will the delivered payoff justify the click and prompt recommendation or sharing? |
| Strength of the WHP lens | 10 | Does the angle clearly use games/play to reveal something human? |
| Evidence quality and defensibility | 10 | Can WHP support the central claim rigorously and honestly? |
| Production feasibility and sequence | 5 | Can it be made well now, and does it strengthen the next-video path? |

Demand, opportunity, and packaging together control 60 points, making reach a major
determinant without allowing off-brand or indefensible subjects through the gates.

For every criterion, attach:

- a score with a one-sentence rationale;
- an evidence grade (`A` direct/strong, `B` useful but incomplete, `C` weak/inferred);
- source links and observation dates; and
- the most important uncertainty.

Scores structure editorial judgment; they are not performance forecasts. Do not use decimal
precision unsupported by the evidence.

### 7. Stress-test the top three

For each of the top three candidates, develop three genuinely different title/thumbnail
promises. Each package must specify:

- the intended viewer;
- what is familiar;
- what is unexpected;
- the open question or tension;
- the visual promise; and
- the payoff the video must deliver.

Reject packages that attract a different audience than the video satisfies. A topic with
good demand but no honest package cannot win.

Require a one-sentence earned reframe and at least two plausible follow-up episodes. Series
potential is a tiebreaker and coherence check, not permission to recommend a weaker video.

### 8. Make the decision

Choose exactly one winner. Explain:

- why it is the best next episode now;
- which evidence matters most;
- why the package can reach beyond existing followers;
- what makes it unmistakably WHP;
- what could falsify the recommendation;
- what must be verified before scripting; and
- why the runner-up lost.

If the evidence is genuinely tied, still make a provisional choice and name the smallest
decisive test or missing datum. Do not return an unordered menu as the answer.

## Output contract

Every complete run must include:

1. **Decision frame** — date, market, mode, constraints, and files read.
2. **Candidate landscape** — broad subjects by lane and the angles surviving the gates.
3. **Ranked shortlist** — roughly five finalists with scores, grades, confidence, risks,
   and concise rationale.
4. **Packaging stress test** — three package directions for each top-three finalist.
5. **Winner brief** — exact topic/angle, working logline, intended viewer, why now, human
   payoff, WHP fit, reach evidence, production implications, evidence risks, runner-up
   comparison, and two follow-ups.
6. **Research trail** — direct links, dates, observed metrics, inferences, unavailable data,
   and claims needing deeper verification.

## Evidence and error handling

- Timestamp all volatile observations and record geography, language, format, and window.
- Treat Google Trends values as normalized relative interest, not absolute volume.
- Compare public outliers within the same format and an appropriate age/channel baseline.
- Do not infer that a breakout proves the subject alone caused success; topic, package,
  execution, timing, and audience can be confounded.
- Prefer primary and official sources for platform behavior and factual claims.
- Treat YouTube Inspiration suggestions as leads because YouTube warns that their generated
  content may be inaccurate or variable.
- Mark unavailable or ambiguous evidence as unknown rather than zero.
- Separate evergreen demand, sustained growth, seasonality, and short news spikes.
- Downgrade confidence when personalized data, comparable videos, or factual sources are
  sparse.
- Do not recommend a topic whose central promise depends on a claim that cannot survive a
  reasonable verification pass.

## Skill artifacts

```text
.agents/skills/choosing-whp-video-topic/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── research-method.md
    └── output-contract.md
```

`SKILL.md` will hold the trigger, core workflow, gates, and resource-routing instructions.
`research-method.md` will hold source priorities, query patterns, comparison rules, rubric
details, and uncertainty handling. `output-contract.md` will provide the reusable report
structure and completeness checks. No script or asset is justified initially.

## Verification design

Follow documentation TDD:

1. Run realistic baseline scenarios without the skill and capture failures.
2. Write the smallest skill that directly closes observed gaps.
3. Run the same scenarios with the skill.
4. Identify new loopholes, revise, and re-run.
5. Validate the skill folder and UI metadata mechanically.

Scenarios must cover:

- cold start with no private analytics;
- an actual-game subject such as Sudoku;
- a fashionable subject with a weak or cosmetic WHP connection;
- misleading raw views or a noisy search spike;
- missing or conflicting evidence; and
- two close finalists that require a decisive recommendation.

Review outputs for diversity, evidence provenance, appropriate uncertainty, correct gating,
score consistency, package/payoff alignment, and a genuine single winner.

## Acceptance criteria

- The skill is discoverable from prompts asking what WHP video should be made next.
- It reads current doctrine and episode state rather than relying on frozen summaries.
- It treats actual games and their histories as first-class WHP subjects.
- Reach has decisive weight while WHP identity and rigor remain hard gates.
- A complete run uses multiple independent signals or clearly reports reduced confidence.
- No unsupported performance, search-volume, or factual claims appear as observations.
- The output names one winner and explains why it beat the runner-up.
- The skill passes structural validation and all forward-test scenarios.
