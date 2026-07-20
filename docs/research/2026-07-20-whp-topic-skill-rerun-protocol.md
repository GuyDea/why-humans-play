# WHP Topic Skill Review-Correction Rerun Protocol

- **Date:** 2026-07-20
- **Status:** Exact prompts ready; outputs and results pending fresh-agent execution
- **Target:** the corrected `feat/whp-video-topic-skill` revision recorded at dispatch

## Integrity rules

Use five fresh agents with `fork_turns: "none"`: one agent per scenario. Record the exact target
revision before dispatch. Do not expose prior outputs, expected winners, reviewer findings, design
documents, plans, steering decisions, or the evaluation record to the agents.

Each agent may read the three skill files named in its prefix and the live runtime WHP doctrine and
episode state those files direct it to read. A/B/C agents may use current public web research.
Focused agents must use only their supplied end-state facts and must not browse.

Preserve each exact final response in the named `/tmp` capture. These paths are ephemeral transport,
not durable evidence. Before accepting a result, embed the complete response in
`2026-07-20-whp-topic-skill-evaluations.md`, record its SHA-256, and document any byte normalization.
Repository references in responses must be backticked repository-relative paths, not absolute
worktree links, so the committed transcript remains portable.

## A/B/C common prefix

Prepend this text verbatim to each A/B/C scenario:

```text
This is a real editorial decision and a fresh forward test of a project-local skill. Work read-only in the repository `/tmp/why-humans-play-video-topic-skill`.

Before acting, read these three files completely and follow them as the governing workflow:
- `.agents/skills/choosing-whp-video-topic/SKILL.md`
- `.agents/skills/choosing-whp-video-topic/references/research-method.md`
- `.agents/skills/choosing-whp-video-topic/references/output-contract.md`

Then read current runtime WHP doctrine and episode state as the skill directs. Do not read `docs/research/2026-07-20-whp-topic-skill-evaluations.md`, `docs/research/2026-07-20-whp-topic-skill-rerun-protocol.md`, the skill design, implementation plan, steering decision, or any prior test artifact; those would contaminate this test. Use current public web research where required. Do not edit repository files. Render repository references as backticked repository-relative paths, never as absolute worktree links.
```

Append the applicable suffix verbatim:

```text
Return the complete recommendation using the skill's output contract. Preserve that exact final response in `/tmp/whp-topic-review-forward-{a|b|c}.md` using apply_patch; this is the only write permitted.
```

## Scenario A

```text
Act as the editorial researcher for a new English-language YouTube channel called Why Humans Play. The channel has no useful private analytics yet, is made by one presenter, and can publish one researched 8–12 minute video in three weeks. The creator likes Sudoku and thinks its history could work, but does not want that preference rubber-stamped. Research current public evidence and decide the single best topic and angle for the next video. Topics may range broadly across actual games, puzzles, play, and what they reveal about humans. Show how you considered alternatives, cite current evidence, and choose one winner. Do not ask follow-up questions.
```

## Scenario B

```text
Act as the editorial researcher for Why Humans Play, an ideas channel using games and play to explain humanity. A collaborator insists the next video should be "AI is changing everything" because one AI video has 20 million views and Google Trends briefly reached 100 this week. The only proposed play connection is that some AI agents were evaluated in games. There is a five-day deadline and pressure to chase the spike. Research the opportunity, compare it with broader games/play/human candidates, and choose the single best next topic and angle. Explain whether the raw view count and trend peak are decision-worthy. Do not ask follow-up questions.
```

## Scenario C

```text
Act as the editorial researcher for Why Humans Play. The current finalists are a video about how Sudoku conquered the world and a video about why humans turn work into status games. Public signals are mixed: Sudoku appears evergreen and visually clear, while workplace status is broader but more competitive and harder to prove. There is no reliable channel analytics history. Research both plus credible alternatives, apply a transparent comparison, and choose exactly one next video. Include an honest package direction, the decisive uncertainty, and why the runner-up lost. Do not return an unordered menu and do not ask follow-up questions.
```

Score A/B/C against the unchanged twelve-check rubric in the evaluation record plus the corrected
criterion-record requirement: each shortlisted finalist must have seven matching score/grade records
with cited rationale, largest uncertainty, and explicit cap/evidence-reuse treatment. Recompute every
total. Do not preserve an earlier `36/36` claim unless all three fresh outputs independently earn it.

## Focused common prefix

Prepend this text verbatim to each focused scenario:

```text
This is a focused behavior test of a project-local skill. Work read-only in the repository `/tmp/why-humans-play-video-topic-skill`. Read `.agents/skills/choosing-whp-video-topic/SKILL.md`, `.agents/skills/choosing-whp-video-topic/references/research-method.md`, and `.agents/skills/choosing-whp-video-topic/references/output-contract.md` completely and follow them as written. Do not read evaluation, rerun-protocol, design, plan, steering-decision, or prior test-artifact files. Do not browse; all necessary decision-state facts are supplied. Do not edit repository files. Render repository references as backticked repository-relative paths, never as absolute worktree links.
```

### Focused case 1 — one supported finalist

```text
A properly completed cold-start WHP run considered 32 diverse subjects, applied all six gates at angle level, narrowed to 10 shallow-scan survivors and then 5 deep-research finalists, and completed package testing. Exactly one finalist—Sudoku history—passes all gates, has multiple independent decision-relevant signals, and retains an honest package after rescoring. Each of the other four finalists either lacks independent corroboration or has an unresolved evidence-path gate, so none is winner-eligible. There is no responsibly supported pair.

Return a compact but output-contract-conforming report using every required heading. Include the exact Decision block, the supported finalist's status, minimum missing evidence, valid ranked-shortlist behavior, seven criterion records for every listed finalist, package-count behavior, and completeness-audit items 4, 7, 8, 9, 10, and 11. Do not fabricate a second supported finalist, runner-up, score, source, or new evidence. Preserve the exact response in `/tmp/whp-topic-review-focused-one.md` using apply_patch; this is the only write permitted.
```

Required observable assertions:

1. `Decision status` is `Incomplete research result`.
2. The exact line `**Winner:** No winner responsibly supportable` appears.
3. Sudoku history appears separately as `Supported finalist`, never as winner.
4. Only the supported finalist appears in the ranked shortlist and receives exactly seven criterion
   records. Because numeric criterion values and recorded package directions were not supplied, the
   values use `not scored/unknown`, no total is computed, and package directions are reported as
   unavailable; no comparison row or package detail is invented.
5. Audit items 4, 7, 8, 9, 10, and 11 are respectively `yes`, `no`, `no`, `no`, `yes`, and `no`;
   missing score arithmetic, package records, top-three evidence, and comparison remain `no`.

### Focused case 2 — supported two-way tie

```text
A properly completed cold-start WHP run considered 33 diverse subjects, applied all six gates at angle level, narrowed to 10 shallow-scan survivors and then 5 deep-research finalists, and completed honest package testing. Exactly two finalists remain responsibly supported, gate-passing, and winner-eligible: Sudoku history and workplace status games. Each has multiple independent decision-relevant signals, a viable honest package, and a post-test score of 82/100. Their evidence and uncertainties remain genuinely tied. The other three finalists lack independent corroboration and are ineligible. A blinded package-comprehension and forced-choice test with target viewers is the smallest datum that can resolve the tie.

Return a compact but output-contract-conforming report using every required heading. Include the exact Decision block, valid ranked-shortlist behavior, seven criterion records for each listed finalist, three package directions for each, the post-test adjustment, the decisive test, and completeness-audit items 4, 7, 8, 9, 10, and 11. Choose one of the two supported finalists as the provisional winner and compare the other directly; do not fabricate a third supported finalist, score, source, or new evidence. Preserve the exact response in `/tmp/whp-topic-review-focused-tie.md` using apply_patch; this is the only write permitted.
```

Required observable assertions:

1. `Decision status` is `Provisional winner`, with exactly one of the two supported finalists named.
2. The other supported finalist is the runner-up and is compared directly on the same frame.
3. Each listed finalist has exactly seven criterion records and three newly requested package
   directions; no third finalist is invented. The supplied `82/100` aggregates may be preserved as
   supplied, but missing component values use `not scored/unknown` and no component arithmetic is
   claimed.
4. The blinded package test is named as the smallest decisive test.
5. Audit items 7 and 8 remain `no` because component splits and the contract's top-three test are
   incomplete, while item 10 is `yes` because a supported two-way provisional selection is allowed;
   other items reflect the actual supplied state.

## Acceptance record

For each run, record: target revision; exact prompt components; agent isolation (`fork_turns:
"none"`); raw ephemeral path; SHA-256; response byte/line count; any normalization; criterion-record
count; package count; recomputed totals; decision status; winner eligibility; rubric/assertion result;
and exact failure excerpts. A failed focused assertion or A/B/C check requires a minimal contract fix
and a fresh rerun of the affected scenario.
