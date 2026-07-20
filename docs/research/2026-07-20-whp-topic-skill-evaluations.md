# WHP Topic Skill Evaluations

- **Date:** 2026-07-20
- **Branch:** `feat/whp-video-topic-skill`
- **Current acceptance status:** Corrected-tree campaign captured and mechanically checked; independent final review pending

## Corrected-tree campaign capture

The original 13 task commits were rebased without patch changes from stale merge-base `b579f43`
onto current `main` at `2a30c83`; `git range-diff` matched all 13 patches. Final review then exposed
two contract gaps: criterion-level score evidence was not compactly required in the rendered report,
and the core skill's unconditional-winner wording conflicted with its incomplete-result contract.

The corrected contract requires seven criterion records per finalist and permits a final selected
topic only when at least two responsibly supported, gate-passing, winner-eligible finalists remain.
With fewer than two, the exact result is `Winner: No winner responsibly supportable`; a sole
supported finalist is identified separately. A supported two-way tie may still produce a provisional
winner and decisive test.

The earlier A/B/C results below are retained as a complete historical test record, but they do not
validate the corrected current-main tree. Their `36/36` result is superseded as a current acceptance
claim. The five accepted corrected-tree outputs are now preserved byte-for-byte under
[`artifacts/2026-07-20-whp-topic-skill/`](artifacts/2026-07-20-whp-topic-skill/) and follow the exact
prompts in [`2026-07-20-whp-topic-skill-rerun-protocol.md`](2026-07-20-whp-topic-skill-rerun-protocol.md).
The committed files have the same SHA-256 as their `/tmp` transport captures; no byte normalization
was applied. This record reports mechanical observations and focused assertions, not a new `36/36`
rubric award. Independent final review remains pending, so do not mark the design `Implemented and
verified` yet.

### Dispatch integrity and discarded runs

- The first attempted Scenario A was discarded because that agent also received the Scenario B and
  C prompts after dispatch. It is contaminated and is not linked, hashed, or counted here. The
  accepted A is a new exact-prompt-only run at final skill revision `28f52fa`; it received no
  post-dispatch messages or other scenarios. Its artifact became complete and stable, but the child
  terminal handoff lagged, so the root independently validated the finished file and then interrupted
  the child.
- Accepted B and C were fresh `fork_turns: "none"` runs at `51403c1`. Each received only neutral
  progress/finalization coordination after dispatch—no other scenario, output, reviewer finding, or
  expected winner. Both artifacts and self-audits were complete before terminal-handoff lag led to
  interruption.
- The first focused-one run at `51403c1` exposed fabricated zero components and package content. A
  pristine rerun at `9267890` corrected the scores but emitted zero package rows. Both RED iterations
  were discarded and overwritten; no discarded transcript or hash is retained or implied here.
  Accepted focused-one and focused-tie are fresh exact-prompt-only `fork_turns: "none"` runs at
  `28f52fa`, received no post-dispatch contact, and completed terminal handoff normally.

### Exact accepted-artifact record

| Run | Target revision | Fresh-agent and coordination record | Durable artifact | SHA-256 | Lines / words / bytes | Normalization |
|---|---|---|---|---|---:|---|
| A | `28f52faf7f9d20bb480c3c780adbc69e75b5ce10` | `fork_turns: "none"`; `/root/.../scenario_a_forward`; exact prompt only; no post-dispatch contact; stable artifact independently checked before terminal-lag interruption | [forward-a.md](artifacts/2026-07-20-whp-topic-skill/forward-a.md) | `f8ebb916dec917ab78cf11a0eb9c4f6b7c8f0973e7b823d74ab765cf8e01503a` | 274 / 11,044 / 74,644 | none; byte-identical to transport |
| B | `51403c1f7b979a8f36fb36c9ac7e36745369031d` | `fork_turns: "none"`; `/root/rerun_a/scenario_b_forward`; neutral progress/finalization only; complete before terminal-lag interruption | [forward-b.md](artifacts/2026-07-20-whp-topic-skill/forward-b.md) | `7fab6f53f30c399baecec65f2b8fa59082400a77e171fb9e2a59472f49092c09` | 275 / 9,933 / 65,048 | none; byte-identical to transport |
| C | `51403c1f7b979a8f36fb36c9ac7e36745369031d` | `fork_turns: "none"`; `/root/forward_b/scenario_c_forward`; neutral progress/finalization only; complete before terminal-lag interruption | [forward-c.md](artifacts/2026-07-20-whp-topic-skill/forward-c.md) | `74e0d5025573bce7f4f124405d82a9f37d30f23723875ea1252413eecc7036e4` | 273 / 9,473 / 63,490 | none; byte-identical to transport |
| Focused one | `28f52faf7f9d20bb480c3c780adbc69e75b5ce10` | `fork_turns: "none"`; exact prompt only; no post-dispatch contact; terminal completed; canonical child path was not supplied in the capture handoff | [focused-one.md](artifacts/2026-07-20-whp-topic-skill/focused-one.md) | `252597daccc8cd5c99c09b7c40ed631c0bd51422a8704dbd0b4209ca54485ee6` | 144 / 2,699 / 18,861 | none; byte-identical to transport |
| Focused tie | `28f52faf7f9d20bb480c3c780adbc69e75b5ce10` | `fork_turns: "none"`; exact prompt only; no post-dispatch contact; terminal completed; canonical child path was not supplied in the capture handoff | [focused-tie.md](artifacts/2026-07-20-whp-topic-skill/focused-tie.md) | `3af722a40a2b8ed13ef7d60d4f1cfe1887031cd1bfdf7cc19447365860bf27bf` | 172 / 3,679 / 25,540 | none; byte-identical to transport |

`/tmp/whp-topic-review-*.md` paths are transport only. The linked committed files, not duplicated
transcripts in this evaluation document, are the durable evidence.

### Revision coverage and impact analysis

A and both focused cases ran at final skill revision `28f52fa`. B and C ran at `51403c1`, before the
two edge-case fixes in `9267890` and `28f52fa`. Those later patches govern supplied end states where
numeric criterion splits or package-direction contents are absent: they require nonnumeric score
markers, block unverified totals, and preserve known package counts with unavailable-detail rows.
B and C instead contain all 35 numeric criterion records, recomputable totals, and nine fully
specified package directions. It is therefore a scoped inference from the patch content and artifact
shape that those two outputs do not exercise the later missing-detail branches. This is not a claim
that B or C ran at final HEAD. Final-head A exercises the complete-data path, while final-head focused
one and focused tie exercise the two corrected absent-detail paths.

### Mechanically observed results

| Run | Decision observation | Structure and arithmetic observation |
|---|---|---|
| A | App streaks selected at 88; Sudoku runner-up at 81 | 39 subjects; 5 scored finalists; 35 criterion records; 9 package rows; 12 audit rows; all five shortlist totals recompute |
| B | App streaks selected at 89 | 36 subjects; 5 scored finalists; 35 criterion records; 9 package rows; 12 audit rows; all five shortlist totals recompute |
| C | Workplace status selected at 82 | 40 subjects; 5 scored finalists; 35 criterion records; 9 package rows; 12 audit rows; all five shortlist totals recompute; Sudoku is the strongest non-advancer because of the current Hidden Game pilot sequence, explicitly not because it is outside WHP scope |
| Focused one | Exact incomplete result; no winner; sole supported finalist is Sudoku | 7 `not scored` criterion records; no total; 3 unavailable-detail package placeholders; audit items 7, 8, 9, and 11 are `no`, item 10 is `yes` |
| Focused tie | Sudoku provisional winner; workplace status runner-up; supplied totals remain 82 | 14 unknown-component criterion records; 6 unavailable-detail package placeholders; blinded package test named; audit items 4, 10, and 11 are `yes`, items 7, 8, and 9 are `no` |

These are deterministic structure, content-presence, and arithmetic observations. An independent
reviewer must still map A/B/C to the unchanged twelve-check rubric and recheck the focused assertions
against the durable files. Until that review is recorded, there is no final corrected-tree aggregate
score or final verified-design status.

### Review-correction static RED/GREEN

At rebased pre-fix revision `21f125b`, the focused contract checks failed for the intended reasons:

- searching `output-contract.md` for a per-finalist seven-criterion record returned exit `1` with no
  match;
- searching the core/output files for `Winner: No winner responsibly supportable` or a separate
  supported-finalist instruction returned exit `1` with no match; and
- the contradiction check returned exit `0` with `SKILL.md` lines 26 and 110 requiring exactly one
  winner unconditionally, while `output-contract.md` separately allowed an incomplete result.

After the minimal contract edit, fresh static checks find the seven-record schema, cap/boundary and
evidence-reuse fields, exact no-winner value, separate supported-finalist behavior, and supported
two-way provisional rule. A negative check for `Name exactly one winner`, `Name one winner, even`,
and `None responsibly supported` under the skill directory returns no matches. These are structural
GREEN checks only. The accepted artifacts above now exercise the corrected contract; independent
rubric review remains pending.

The exact-prompt focused-one RED at revision `51403c1` exposed a second ambiguity without being
accepted as campaign evidence: seven unavailable numeric criterion values were rendered as
`0/unknown`, combined into a fabricated `0/100`, and then used to mark audit item 7 `yes`; three
package titles were also synthesized even though only package viability, not the recorded
directions, was supplied. Before the fix, exact `rg -F` searches of the three governing skill files
for `not scored/unknown`, `Do not compute a total`, `item 7 must be \`no\``, `supplied aggregate
total`, and `Do not invent package details` each returned exit `1`. The minimal contract edit makes
those five static assertions GREEN. The `9267890` focused rerun confirmed the score correction but
was discarded after exposing the separate package-count ambiguity described next.

The pristine focused-one rerun at revision `9267890` corrected the score behavior but exposed the
remaining package-count ambiguity: it rendered zero package rows because the contract forbade
invented content without separately requiring known completed-test row identities. Before this fix,
exact searches for `preserve the known package-test row count`, `Recorded direction 1 — details
unavailable`, `Mark every unsupplied package field as \`unavailable\``, `Do not infer which
placeholder survived`, and `placeholder records do not make completeness items 8 or 9 \`yes\`` each
returned exit `1`. The minimal clarification makes those structural assertions GREEN and
updates the focused cases to require three and six unavailable-detail placeholder records
respectively. The accepted final-head focused artifacts linked above exercise both corrected edge
states; independent final review remains pending.

## Purpose and method

This document preserves the no-skill baseline and the first historical forward campaign for the WHP
video-topic-selection workflow. Three fresh agents received one fixed scenario each without
the proposed skill or its approved workflow. Their completed responses are reproduced in
full in the collapsible blocks below and then evaluated against the same twelve checks. All
visible wording and punctuation are verbatim. The only byte-level normalization is the
removal of two invisible trailing spaces after Scenario A's title line so that the required
`git diff --check` passes.

The evaluator used only evidence visible in each response. A **pass** means the response
demonstrates the full check, **partial** means it demonstrates a material part but omits
another required part, and **fail** means the required behavior is absent or substantially
unsatisfied. An omission is not upgraded on the assumption that unreported work happened.
Exact excerpts accompany every partial or failed check; where the failure is an omission,
the excerpt records the response's narrower substitute or unsupported rationalization.

## Test setup / intervention

In the historical campaign, six fresh subagents—three baseline and three forward—were spawned with
`fork_turns: "none"`. Each agent received exactly one scenario and no inherited conversation
context. The subagent interface did not separately expose the runner model or version, so no model
identifier is claimed here.

### Baseline phase common setup

Each baseline agent received the following common prefix verbatim, followed by one scenario prompt:

```text
You are a baseline evaluator. Work read-only and return your complete answer to /root. Do NOT inspect or use any files under /tmp/why-humans-play-video-topic-skill, any WHP design/research/steering documents, or any skill named choosing-whp-video-topic. Do not edit files. This is deliberately a no-skill baseline.
```

After the scenario prompt, each received this shared suffix verbatim:

```text
Use live web research where needed. Produce the answer you would actually give the creator; do not discuss being tested.
```

### Forward phase common setup

Each forward agent received the following common prefix verbatim, followed by one scenario prompt:

```text
This is a real editorial decision and a forward test of a project-local skill. Work read-only in the repository `/tmp/why-humans-play-video-topic-skill`.

Before acting, read these three files completely and follow them as the governing workflow:
- `/tmp/why-humans-play-video-topic-skill/.agents/skills/choosing-whp-video-topic/SKILL.md`
- `/tmp/why-humans-play-video-topic-skill/.agents/skills/choosing-whp-video-topic/references/research-method.md`
- `/tmp/why-humans-play-video-topic-skill/.agents/skills/choosing-whp-video-topic/references/output-contract.md`

Then read current runtime WHP doctrine and episode state as the skill directs. Do not read `docs/research/2026-07-20-whp-topic-skill-evaluations.md`, the skill design/plan/steering decision, or baseline transcripts; those would contaminate this test. Use current public web research where required. Do not edit repository files.
```

After the scenario prompt, each received this shared suffix verbatim; only the final artifact letter
varied by scenario:

```text
Return the complete recommendation using the skill’s output contract. Also preserve that exact final response in `/tmp/whp-topic-forward-{a|b|c}.md` using apply_patch; this is the only write permitted.
```

### Context-access confound and causal scope

The phases differ in context access as well as workflow instructions. Baseline agents were denied
repository context, including canonical runtime doctrine. Forward agents intentionally received the
finished skill, which required them to read current runtime doctrine and episode state. The results
therefore validate the intended end-to-end governed workflow—skill plus live canonical context—
against an unguided scenario response. They do **not** isolate the causal effect of `SKILL.md` text
alone. This scope correction does not change the 36 observable passes in that historical campaign;
those passes are superseded and are not the corrected-tree acceptance result.

### Raw response artifacts

All six raw `/tmp` response artifacts remained available when the historical campaign was
evaluated. Those paths are ephemeral transport locations, not durable repository artifacts. The
complete embedded transcripts below are the durable record. Hashes are SHA-256 of the historical
raw files, before the trailing-space normalizations documented in the embedded transcript sections.

| Phase | Scenario | Raw artifact | SHA-256 |
|---|:---:|---|---|
| Baseline | A | `/tmp/whp-topic-baseline-a.md` | `4f25f774af3d601ae7532eb78c81ed5cd4743d7831f8bd77af31ddfe77ee06e9` |
| Baseline | B | `/tmp/whp-topic-baseline-b.md` | `ae53f7712367bb36c97c0479438b12e9fe296039c59831cdb89cbe4766770612` |
| Baseline | C | `/tmp/whp-topic-baseline-c.md` | `615ce519b8f860831e2679faabdcc0617818063209d3798b2078062bfc47efc2` |
| Forward | A | `/tmp/whp-topic-forward-a.md` | `ff027ee22e1e95253614dc0f3adfcaffa28450955f7bc2387ef4a2454ba4435f` |
| Forward | B | `/tmp/whp-topic-forward-b.md` | `f08e67cab0c7a5d6826547be3fb2cca0bc53803fb82d4ead5b4717ac85bed148` |
| Forward | C | `/tmp/whp-topic-forward-c.md` | `b33a925faeaf73e4469f44a8d9763ab026803a3c7cbcac1fbdaede64a5ef6143` |

## Fixed twelve-check rubric

| # | Check |
|---:|---|
| 1 | Establishes date, market, constraints, and cold-start/channel-aware mode. |
| 2 | Reads or requests current WHP doctrine and episode state without inventing them. |
| 3 | Explores at least 30 diverse subjects before narrowing. |
| 4 | Separates broad subjects from specific, filmable angles. |
| 5 | Treats actual games and game history as first-class candidates. |
| 6 | Applies game/play centrality, human revelation, payoff, evidence, feasibility, and duplication gates. |
| 7 | Uses multiple independent demand and competition signals. |
| 8 | Handles normalized Trends values, raw views, spikes, and missing analytics correctly. |
| 9 | Separates observed facts, estimates, and editorial inference with dates and links. |
| 10 | Applies a reach-heavy comparison without letting trend bait bypass WHP rigor. |
| 11 | Tests package/payoff alignment for the top candidates. |
| 12 | Chooses one winner and directly explains why the runner-up lost. |

## Scenario A — cold start and actual games

### Prompt

```text
Act as the editorial researcher for a new English-language YouTube channel called Why Humans Play. The channel has no useful private analytics yet, is made by one presenter, and can publish one researched 8–12 minute video in three weeks. The creator likes Sudoku and thinks its history could work, but does not want that preference rubber-stamped. Research current public evidence and decide the single best topic and angle for the next video. Topics may range broadly across actual games, puzzles, play, and what they reveal about humans. Show how you considered alternatives, cite current evidence, and choose one winner. Do not ask follow-up questions.
```

### Complete baseline response

<details>
<summary>Scenario A response (verbatim)</summary>

```markdown
My pick is **mahjong**, not Sudoku.

## The winner

**Title:** *Why America Is Playing Mahjong Again*
**Angle:** Mahjong keeps returning because it is more than a strategy game: it gives people a structured, low-pressure reason to gather. Its current revival reveals how games become social infrastructure and carriers of identity.

This is the strongest cold-start topic as of July 20, 2026 because it combines a recognizable visual object, a fresh public-interest spike, a surprising history, and a distinctly “Why Humans Play” conclusion.

The current signals are unusually strong:

- Eventbrite reported a **179% increase in U.S. mahjong events from 2023 to 2024**. A San Francisco club now draws as many as 200 people to mahjong nights in bars and restaurants. [Associated Press](https://apnews.com/article/b0dea60bce21804756c0d5c241571056)
- Data published July 19, 2026, from Mahjong 4 Friends counted **nearly 1.8 million U.S. players over the preceding year**, with particularly fast growth in several Southern and Midwestern cities. That is platform data, not a national census, but it is a strong additional behavioral signal. [Axios](https://www.axios.com/2026/07/19/online-mahjong-players-city)
- The wider social context fits the story. Eventbrite’s 2026 survey found 74% of surveyed 18-to-35-year-olds considered in-person experiences more important than digital ones, while 58% preferred social situations where socializing was not the sole focus; its U.S. puzzle-competition attendance also doubled. This is commercial survey data, so it should be presented as context rather than proof of causation. [Eventbrite methodology and results](https://www.eventbrite.com/blog/press/newsroom/eventbrites-inaugural-social-study-report-reveals-the-reset-to-real/)
- The need is real beyond trend reports: the WHO estimates loneliness is most common among adolescents and young adults, affecting roughly one in five. Mahjong is not a “cure,” but its revival fits a documented appetite for regular, embodied connection. [WHO Commission on Social Connection](https://www.who.int/groups/commission-on-social-connection)

The deeper story is richer than “Gen Z discovered grandma’s game.” Modern mahjong developed around China’s Yangtze River Delta in the mid-to-late 1800s—not in an ancient imperial court—and became a huge American craze in the 1920s. It subsequently carried different meanings within Chinese-American communities and among Jewish-American women. Historian Annelise Heinz describes it as a game that acquired meanings around modernity, Chinese-American heritage, and Jewish-American women’s culture. [Oxford University Press](https://academic.oup.com/book/39551), [The Strong Museum’s oral-history archive](https://archives.museumofplay.org/repositories/3/resources/246)

That history creates the real payoff: games survive not because their rules remain frozen, but because communities continually remake them.

## Why it beats the alternatives

| Candidate | Evidence for it | Why it is not the next video |
|---|---|---|
| **Sudoku’s real history** | It contains a good reveal: Nikoli says it found the puzzle as the American “Number Place” and introduced it to Japan in 1984. [Nikoli](https://www.nikoli.co.jp/en/puzzles/sudoku/) | Strong evergreen second episode, but there is no comparably fresh public trigger. A straight history risks becoming a timeline rather than a human thesis. Creator enthusiasm helps execution, but does not outweigh mahjong’s current opportunity. |
| **Why Wordle allows only one game a day** | Demand remains enormous: Wordle was played 4.2 billion times in 2025, within 11.2 billion total NYT Games plays. [Associated Press](https://apnews.com/article/4ab76097d6155a022f089d03e94807c3) | Excellent evergreen concept and easiest production, but the Wordle origin/design story has been covered heavily since 2022. Mahjong supplies a newer development and more distinctive visual world. |
| **The chess boom** | Chess.com reports more than six billion games played on its platform in 2025. [Chess.com year in review](https://www.chess.com/article/view/year-in-review-2025) | The audience is proven, but chess is intensely served by specialist creators. A broad boom explainer offers a new channel little whitespace without a sharper event-driven conflict. |
| **Why puzzle boxes are satisfying to watch** | Videos related to puzzle boxes received more than 60 million YouTube views in the first half of 2025. [YouTube Culture & Trends](https://blog.youtube/culture-and-trends/puzzle-yoodle/) | Very platform-native, but the best versions rely on acquiring and demonstrating elaborate objects. That is a worse fit for one researched presenter and a three-week deadline. |

Sudoku should remain on the slate with the sharper eventual premise **“Sudoku Wasn’t Invented in Japan—So Why Does the World Think It Was?”** It simply should not displace the more timely first choice.

## The 8–12 minute story

- **0:00–0:40 — Cold open:** Tile clacks, four hands, a busy modern club. “A game developed in 19th-century China is filling American bars in 2026. Why this game, and why now?”
- **0:40–1:30 — Just enough rules:** Four players draw and discard tiles to construct a hand. Do not attempt a full tutorial; establish how the turn rhythm keeps everyone involved.
- **1:30–3:10 — Break the ancient-game myth:** Trace the game to the Yangtze River Delta and show how exporters marketed it as older and more exotic than it was.
- **3:10–5:10 — America’s first craze:** The 1920s boom, including the contradiction of Americans embracing an exoticized Chinese product during a period of severe anti-Chinese discrimination.
- **5:10–6:50 — A game becomes identity:** Show its continuing, distinct roles in Chinese-American families and Jewish-American women’s communities. Explain that “mahjong” is a family of variants, not one universal ruleset.
- **6:50–8:50 — Why now:** Use the event and player data, then examine the game’s tactile rhythm and “soft socializing”: people have a shared task, conversation does not need to carry the entire encounter, and regular play can turn strangers into familiar faces.
- **8:50–10:15 — Payoff:** Mahjong’s endurance is not about unchanged rules. Humans use games to make meetings repeatable, preserve identity, and lower the awkwardness of belonging.
- **Closing line:** “Sometimes we do not gather because we already belong. We play until we do.”

## Packaging and production

Use an overhead image of four hands around vivid tiles, with only **“AGAIN?”** as thumbnail text. The tile shapes and colors are much more legible than a Sudoku grid at thumbnail size.

Production is realistic in three weeks: shoot original close-ups and sound from one borrowed or inexpensive set; animate a simple China-to-America timeline; and use rights-cleared archives such as the Library of Congress’s striking 1924 photograph of people playing mahjong at a bathing beach. [Library of Congress](https://www.loc.gov/pictures/item/2016837879/)

The main editorial guardrails are important:

- Do not call mahjong ancient.
- Do not imply it vanished; Chinese and Jewish communities maintained continuous traditions.
- Distinguish Chinese regional forms, Japanese riichi, and American mah-jongg rather than treating them as interchangeable.
- Present loneliness as context, not claim that playing a board game clinically fixes it.
- Include the 1920s exoticism and appropriation history; that complication makes the video stronger, not less clickable.

This is the video I would green-light.
```

</details>

### Rubric result

| # | Result | Basis |
|---:|:---:|---|
| 1 | pass | It dates the decision to July 20, 2026, explicitly calls it a cold-start choice, focuses on the U.S./America and an English-language channel, and addresses the one-presenter, three-week, 8–12 minute production constraint. |
| 2 | fail | It names no WHP doctrine or episode-state file, does not mark either unavailable, and assumes a future episode sequence. |
| 3 | fail | It visibly considers five subjects—mahjong, Sudoku, Wordle, chess, and puzzle boxes—not at least 30 diverse subjects. |
| 4 | pass | It distinguishes subjects from filmable premises, including a specific mahjong thesis and a sharper history premise for Sudoku. |
| 5 | pass | Mahjong and its history win; Sudoku, Wordle, chess, and puzzle boxes are treated as substantive alternatives. |
| 6 | partial | The answer addresses centrality, human meaning, payoff, evidence, and feasibility, but does not apply the six named gates consistently at angle level and never checks current-episode duplication/portfolio fit. |
| 7 | partial | It triangulates several public demand/context signals, but provides no direct competition or comparable-video analysis for the winning mahjong angle. |
| 8 | pass | It explicitly uses cold-start mode, qualifies platform data and related-video views, and does not turn a spike or public metric into a view forecast. No Google Trends value is used. |
| 9 | partial | Many facts are dated, linked, and caveated, but fact/estimate/inference is not tracked consistently and material competitive inferences are uncited. |
| 10 | partial | Reach and timeliness influence the choice and no obvious trend bait bypasses fit, but the comparison has no reach-heavy weights or common scorecard. |
| 11 | partial | The winner receives a title, thumbnail, structure, and payoff; the other leading candidates do not receive package/payoff stress tests. |
| 12 | pass | It chooses mahjong, treats Sudoku as the next-best later episode, and directly says why Sudoku should not displace the winner. |

**Scenario A total:** 5 pass, 5 partial, 2 fail.

### Exact failure excerpts

- **Check 2 — no current doctrine or episode-state read; sequence assumed:**

  > This is the strongest cold-start topic as of July 20, 2026 because it combines a recognizable visual object, a fresh public-interest spike, a surprising history, and a distinctly “Why Humans Play” conclusion.

  > Sudoku should remain on the slate with the sharper eventual premise **“Sudoku Wasn’t Invented in Japan—So Why Does the World Think It Was?”**

  The response claims a distinctly WHP conclusion and places Sudoku on a future slate without
  naming doctrine, published/current episode records, or unavailable files.

- **Check 3 — five visible subjects substitute for the required pool:**

  > My pick is **mahjong**, not Sudoku.

  > **Sudoku’s real history**

  > **Why Wordle allows only one game a day**

  > **The chess boom**

  > **Why puzzle boxes are satisfying to watch**

- **Check 6 — an ad hoc alternative screen and winner-only guardrails substitute for all six gates:**

  > | Candidate | Evidence for it | Why it is not the next video |

  > The main editorial guardrails are important:

  The response never records a duplication/portfolio-fit check and does not show all six gates
  being applied to each angle.

- **Check 7 — demand evidence is offered, but the winning angle's competitive opening is asserted rather than researched:**

  > The current signals are unusually strong:

  > Mahjong supplies a newer development and more distinctive visual world.

  There is no linked public YouTube-results set, comparable-video cohort, or other
  competition/supply signal for the mahjong package.

- **Check 9 — material competitive claims are editorial inference without their own dated evidence:**

  > Excellent evergreen concept and easiest production, but the Wordle origin/design story has been covered heavily since 2022.

  > The audience is proven, but chess is intensely served by specialist creators.

- **Check 10 — the decision invokes opportunity without a common reach-heavy comparison:**

  > This is the strongest cold-start topic as of July 20, 2026 because it combines a recognizable visual object, a fresh public-interest spike, a surprising history, and a distinctly “Why Humans Play” conclusion.

  > | Candidate | Evidence for it | Why it is not the next video |

- **Check 11 — only the winner receives a complete package/payoff treatment:**

  > Use an overhead image of four hands around vivid tiles, with only **“AGAIN?”** as thumbnail text.

  > Sudoku should remain on the slate with the sharper eventual premise **“Sudoku Wasn’t Invented in Japan—So Why Does the World Think It Was?”**

  The Sudoku line is a premise, not a package/payoff stress test, and the remaining alternatives
  receive neither.

## Scenario B — trend bait and misleading metrics

### Prompt

```text
Act as the editorial researcher for Why Humans Play, an ideas channel using games and play to explain humanity. A collaborator insists the next video should be "AI is changing everything" because one AI video has 20 million views and Google Trends briefly reached 100 this week. The only proposed play connection is that some AI agents were evaluated in games. There is a five-day deadline and pressure to chase the spike. Research the opportunity, compare it with broader games/play/human candidates, and choose the single best next topic and angle. Explain whether the raw view count and trend peak are decision-worthy. Do not ask follow-up questions.
```

### Complete baseline response

<details>
<summary>Scenario B response (verbatim)</summary>

```markdown
My recommendation: do not make “AI Is Changing Everything.” Make the next video about **how games turn strangers into a temporary “we,” using the just-finished World Cup as the opening case**.

A strong working title is **“Why Crowds Feel Like One Body.”** The angle is:

> A match is a machine for human synchrony. Shared rules, uncertainty, chants, gestures and emotional peaks align our attention and even aspects of our physiology. That alignment produces belonging—but the same machinery can also produce exclusion and hostility.

This is both timely and unmistakably Why Humans Play. The World Cup final was yesterday, July 19, concluding a record 104-match tournament. Before the quarterfinals, FIFA was already reporting more than 6.25 million stadium spectators and 20 billion video views across its platforms; those are promotional figures, so I would use them only to establish scale, not forecast our views. ([AP](https://apnews.com/article/world-cup-final-spain-argentina-e45fd30932bb9885812805cafa99ca33), [FIFA](https://inside.fifa.com/organisation/media-releases/packed-stadiums-record-digital-reach-world-cup-2026-numbers-unprecedented-scale))

More importantly, there is unusually fresh science behind the story. A study published July 8 monitored 60 spectators through a live basketball game using repeated saliva samples and continuous heart-rate recordings. Heart-rate synchrony increased during and after the game, and stronger synchrony and oxytocin measures were associated with reported unity, enjoyment and intent to return. The study is small and observational, so the script must say “associated with,” not “watching sports releases a bonding hormone.” ([Translational Psychiatry/PubMed](https://pubmed.ncbi.nlm.nih.gov/42420254/))

That finding triangulates well with two stronger story beats:

- A 2025 field study of Brazilian football supporters found their ritualized pregame gathering produced even greater emotional synchrony than key moments of the match itself. ([PNAS/PubMed](https://pubmed.ncbi.nlm.nih.gov/40489616/))
- A 2022 study comparing stadium spectators with small groups watching remotely found greater autonomic synchrony in the stadium, associated with more transformative experiences and stronger identity fusion. ([Scientific Reports/PubMed](https://pubmed.ncbi.nlm.nih.gov/35022461/))

That gives us a clean progression: **shared attention → ritualized movement → physiological synchrony → a felt sense of “us” → belonging and its darker mirror, out-group hostility.** The conclusion can widen from football to concerts, worship, rallies and protests: humans use collectively witnessed games as socially acceptable engines for becoming a group.

### Candidate comparison

| Candidate | Channel fit | Timeliness | Distinctive human question | Five-day feasibility | Verdict |
|---|---:|---:|---:|---:|---|
| World Cup, synchrony and belonging | Excellent | Excellent | Excellent | High | **Make now** |
| “AI is changing everything,” with game benchmarks | Weak–medium | High but unstable | Weak as pitched | Medium | Reject |
| Why betting makes fandom more intense | Strong | High | Strong, but narrower | Medium | Runner-up |
| How video games became psychology laboratories | Excellent | Modest | Strong | High | Evergreen backlog |
| Esports as state power/sportswashing | Strong | High | Strong | Low; geopolitical reporting burden | Future investigation |

The betting candidate has real heat: AP reported that the share of Brazilians placing bets rose from 11% before the World Cup to about 35% by late June, based on a fintech sample of 1.2 million people. But it is geographically specific, harm-sensitive and would require more careful causal and regulatory reporting than five days comfortably allows. ([AP](https://apnews.com/article/brazil-world-cup-gambling-bets-sports-soccer-f68b603d355ac250da11d183f5cd71db))

“Games as cognitive laboratories” is deeply on-brand; a recent review describes projects such as *Sea Hero Quest* using play to gather large-scale behavioral data outside conventional labs. It lacks the World Cup candidate’s immediate cultural doorway, so I would keep it evergreen. ([2026 review](https://arxiv.org/abs/2604.24321))

### Why the AI evidence does not justify a greenlight

The 20-million-view video and Trends peak are useful scouting clues, not decision-grade evidence.

A public view count is an outcome with almost all causal context removed. We do not know the video’s channel size, normal baseline, age, view velocity, traffic sources, audience geography, format, paid or external distribution, retention, or whether viewers subsequently watched more from that creator. YouTube itself separates views from impressions, click-through rate, watch time, retention and unique viewers because those metrics answer different questions. ([YouTube reach documentation](https://support.google.com/youtube/answer/9314355), [YouTube performance documentation](https://support.google.com/youtube/answer/12220281))

One 20-million-view outlier therefore demonstrates that **that package, creator and distribution event** reached 20 million views—not that our audience wants a generic AI essay. A useful public benchmark would be a cohort of comparable long-form videos across adjacent, similarly sized channels, measured by early view velocity and performance relative to each channel’s median, not by the largest absolute number.

A Google Trends value of 100 is also not raw search volume. Google scales the highest relative-interest point within the selected geography and time range to 100. Changing the range or location can change what “100” means. Google explicitly warns that isolated spikes can reflect statistical noise on smaller queries and that a spike does not mean a topic is “popular” or “winning.” ([Google Trends FAQ](https://support.google.com/trends/answer/4365533?hl=en))

There is an additional relevance problem: searches for broad “AI” may be driven by a product release, jobs, regulation or a news controversy. They say nothing about demand for AI agents playing games. The viral view and Trends spike may also be two consequences of the same news event, not independent confirmation.

The AI idea becomes channel-worthy only after inversion: **“Why Do We Test Intelligence With Games?”** Recent Battleship and game-benchmark work could support that question, because play would then be the explanatory engine rather than a decorative example. ([MIT](https://news.mit.edu/2026/teaching-ai-agents-ask-better-questions-playing-battleship-0603)) That is worth developing later, but it is a different and more specific video than “AI is changing everything.”

For the five-day production, I would open on the World Cup crowd rather than the winning goal: thousands of strangers moving, chanting and reacting together. Ask, “Why does watching other people play make us feel more alive—and more connected to people we have never met?” Then move through the three studies, widen to collective ritual, acknowledge the belonging/exclusion tradeoff, and end with the central idea: **perhaps the deepest function of a public game is not determining a winner; it is briefly turning many people into one.**
```

</details>

### Rubric result

| # | Result | Basis |
|---:|:---:|---|
| 1 | partial | It implies a current date immediately after July 19 and establishes the five-day constraint, but does not explicitly record the full decision date, target market/language, or cold-start/channel-aware mode. |
| 2 | fail | It reads or requests no current WHP doctrine or episode state, yet makes definitive WHP-fit judgments. |
| 3 | fail | Its comparison contains five candidates, not at least 30 diverse subjects. |
| 4 | pass | It turns the World Cup into a specific synchrony/belonging angle and correctly reframes broad AI into the filmable question “Why Do We Test Intelligence With Games?” |
| 5 | partial | A football event and video-game research are first-class candidates, but the narrow pool includes no specific game-history lane and little breadth among actual games or puzzles. |
| 6 | partial | It strongly tests centrality, human revelation, evidence, payoff, and five-day feasibility, but does not apply all six gates consistently and omits episode duplication/portfolio fit. |
| 7 | partial | It uses independent scale and research signals for the winner, but does not research competitive supply or comparable public videos for that angle. |
| 8 | pass | It correctly explains that 20 million views lack causal/comparable context, that Trends 100 is normalized to a local peak, that spikes can be noise, and that neither metric greenlights the broad AI pitch. |
| 9 | partial | It dates and links many observations and explicitly labels promotional/observational limitations, but does not consistently classify facts, estimates, and editorial inferences or date every volatile observation. |
| 10 | partial | It prevents trend bait from bypassing centrality and evidence, but its five-column comparison is unweighted and does not establish a reach-heavy decision model. |
| 11 | partial | The winner has a title, angle, opening, progression, and payoff; no top-three set receives multiple honest package/payoff tests. |
| 12 | pass | It chooses World Cup crowd synchrony, explicitly labels betting the runner-up, and directly explains that reporting sensitivity and the deadline make it lose. |

**Scenario B total:** 3 pass, 7 partial, 2 fail.

### Exact failure excerpts

- **Check 1 — a partial date and deadline appear, but the full date, market, and evidence mode do not:**

  > The World Cup final was yesterday, July 19, concluding a record 104-match tournament.

  > For the five-day production, I would open on the World Cup crowd rather than the winning goal

  Neither excerpt, nor the rest of the response, records the full decision date, sets a target
  market/language, or declares cold-start versus channel-aware mode.

- **Check 2 — WHP fit is asserted without current doctrine or episode state:**

  > This is both timely and unmistakably Why Humans Play.

- **Check 3 — the full visible pool is five candidates:**

  > World Cup, synchrony and belonging

  > “AI is changing everything,” with game benchmarks

  > Why betting makes fandom more intense

  > How video games became psychology laboratories

  > Esports as state power/sportswashing

- **Check 5 — actual play is present, but the candidate pool supplies no game-history candidate:**

  > | World Cup, synchrony and belonging | Excellent | Excellent | Excellent | High | **Make now** |

  > | How video games became psychology laboratories | Excellent | Modest | Strong | High | Evergreen backlog |

- **Check 6 — five editorial columns substitute for the complete six-gate screen:**

  > | Candidate | Channel fit | Timeliness | Distinctive human question | Five-day feasibility | Verdict |

  > The AI idea becomes channel-worthy only after inversion: **“Why Do We Test Intelligence With Games?”**

  The centrality correction is sound, but no duplication/portfolio-fit check appears and the
  same complete gate set is not shown for every angle.

- **Check 7 — scale and science are researched, while competitive supply is absent:**

  > Before the quarterfinals, FIFA was already reporting more than 6.25 million stadium spectators and 20 billion video views across its platforms; those are promotional figures, so I would use them only to establish scale, not forecast our views.

  > More importantly, there is unusually fresh science behind the story.

  Neither is a competition/content-gap signal for the proposed long-form package.

- **Check 9 — useful caveats coexist with unclassified editorial judgments:**

  > It lacks the World Cup candidate’s immediate cultural doorway, so I would keep it evergreen.

  > | Esports as state power/sportswashing | Strong | High | Strong | Low; geopolitical reporting burden | Future investigation |

  These are editorial inferences without an attached observation date or cited competitive
  evidence.

- **Check 10 — trend bait is rejected, but the comparison is not reach-weighted:**

  > | Candidate | Channel fit | Timeliness | Distinctive human question | Five-day feasibility | Verdict |

  > The 20-million-view video and Trends peak are useful scouting clues, not decision-grade evidence.

- **Check 11 — a single winner package substitutes for top-candidate package/payoff testing:**

  > A strong working title is **“Why Crowds Feel Like One Body.”**

  > For the five-day production, I would open on the World Cup crowd rather than the winning goal

  No runner-up or third-place candidate receives a comparable title/thumbnail promise and
  delivered-payoff test.

## Scenario C — conflicting evidence and forced choice

### Prompt

```text
Act as the editorial researcher for Why Humans Play. The current finalists are a video about how Sudoku conquered the world and a video about why humans turn work into status games. Public signals are mixed: Sudoku appears evergreen and visually clear, while workplace status is broader but more competitive and harder to prove. There is no reliable channel analytics history. Research both plus credible alternatives, apply a transparent comparison, and choose exactly one next video. Include an honest package direction, the decisive uncertainty, and why the runner-up lost. Do not return an unordered menu and do not ask follow-up questions.
```

### Complete baseline response

<details>
<summary>Scenario C response (verbatim)</summary>

```markdown
Make **How Sudoku Conquered the World** next.

With no trustworthy channel history, I would optimize for a topic with low research risk, a strong visual engine, and an instantly legible promise. Sudoku wins on all three. It also has durable public demand: the World Puzzle Federation is running eight international Sudoku Grand Prix rounds in 2026, while the specialist Cracking the Cryptic channel sits around 700,000 subscribers and 309 million views. Those signals do not predict views for a history video, but they show this is a living interest, not pure 2005 nostalgia. [WPF 2026 schedule](https://gp.worldpuzzle.org/), [current channel count](https://socialcounts.org/youtube-live-subscriber-count/UCC-UOdK8-mIjxBQm_ot1T-Q).

### Comparison

Scores are 1–5 editorial judgments, not faux performance forecasts. I weighted what matters most without analytics: package clarity 25%, channel fit 20%, proof/story spine 20%, visuals 15%, competitive whitespace 10%, and evergreen/production safety 10%.

| Topic | Package | Fit | Proof | Visuals | Whitespace | Durable | Weighted |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Sudoku conquers the world** | 4.5 | 5 | 5 | 5 | 4 | 5 | **95.5** |
| Workplace status games | 4.5 | 5 | 3.5 | 2.5 | 3 | 4.5 | **79.0** |
| Why Tetris follows you into sleep | 3.5 | 4.5 | 4 | 5 | 2 | 3.5 | **77.5** |
| Why humans collect things | 4 | 4 | 3 | 5 | 2 | 4 | **75.0** |

The Sudoku story is unusually well documented. Nikoli openly says it imported the American “Number Place” in 1984, shortened the Japanese name to Sudoku, and made the symmetrical-clue convention that helped it take off. [Nikoli’s history](https://www.nikoli.co.jp/en/puzzles/sudoku/). Then Wayne Gould built a generator, persuaded *The Times* to publish the puzzle in November 2004, and supplied newspapers for free. By May 2005, six other British nationals had followed; *The Times*’ first book had already sold more than 100,000 copies. [Contemporary Guardian report](https://www.theguardian.com/media/2005/may/10/pressandpublishing.uknews). Will Shortz later reported that Gould’s puzzles reached more than 400 newspapers and his books passed four million sales. [TIME profile](https://time.com/collection_hub_item/wayne-gould/).

That gives the episode a supported causal thesis: Sudoku combined three simple, language-independent rules with effectively unlimited supply and a newspaper industry primed to copy a successful daily habit. It is a story about design and distribution, not a vague claim that the puzzle “hacked the brain.”

The credible alternatives did not overturn the result:

- Tetris has excellent visuals and a memorable experiment: players reported intrusive game imagery as they fell asleep. But the core finding is narrow, while “the Tetris effect” has already received extensive documentary and news treatment. Expanding it into a sweeping brain claim would be risky. [Original Science study](https://pubmed.ncbi.nlm.nih.gov/11030656/), [ABC’s 2024 deep dive](https://www.abc.net.au/news/health/2024-08-04/tetris-unlock-dreams-treat-trauma-and-ptsd/103799818).

- Collecting is broad and visual, and a recent six-study paper makes a good case that desire for control can motivate completion of collections. It does not establish one universal explanation for collecting, which also involves identity, nostalgia, community, investment, and preservation. The clean title therefore overpromises, and a TED talk already occupies the exact “why we collect things” package. [Journal of Consumer Research study](https://martinreimann.com/pdf/Cao%2C%20Brucks%2C%20Reimann.%20Seeking%20Structure%20in%20Collections.pdf), [existing TED talk](https://www.ted.com/talks/daniel_krawczyk_why_we_collect_things).

### Why the runner-up lost

Workplace status is a real and important mechanism. A major review supports status as a fundamental human motive, and organizational research shows that status competition can sometimes increase effort. [Psychological Bulletin review](https://pubmed.ncbi.nlm.nih.gov/25774679/), [work-group research](https://www.sciencedirect.com/science/article/pii/S0167268100001074).

But the proposed claim—“humans turn work into status games”—bundles status, power, hierarchy, competition, and office politics into one universal explanation. The findings are context-dependent: one experiment found competition increased cheating only among lower-performing participants, while a newer experiment found no overall honesty effect. [Earlier experiment](https://www.sciencedirect.com/science/article/pii/S0167487009000336), [2024 experiment](https://www.frontiersin.org/journals/behavioral-economics/articles/10.3389/frbhe.2024.1455686/full). The territory is also crowded with career-advice and management framing; HBR alone maintains an entire office-politics topic stream. [HBR topic page](https://hbr.org/topic/subject/office-politics).

An honest version would need to narrow to a particular scoreboard—promotion tournaments, forced rankings, visible performance metrics—and secure concrete workplace cases. Without that, it risks becoming an abstract voiceover laid over generic office footage. It lost because its audience ceiling is higher but its evidentiary and production variance are much worse.

### Package direction

**Title:** *How Sudoku Conquered the World*

**Thumbnail:** One stark 9×9 grid spreading across a globe or wall of newspaper front pages, with the short line: **9 NUMBERS. EVERYWHERE.**

**Cold open:** In November 2004, almost nobody in Britain knew this grid. Six months later, national newspapers were fighting over it. The supposed Japanese craze had actually begun with an American architect—and required a retired judge to go global.

The episode spine should be:

1. Howard Garns and *Number Place* in 1979.
2. Nikoli’s Japanese naming and refinement.
3. Gould’s six-year generator, *Times* pitch, and free-distribution model.
4. The British newspaper arms race and global spread.
5. Why the format endured: simple rules, no language barrier, daily repeatability, and endless variation.

The decisive uncertainty is whether Sudoku’s large play audience has any appetite for its history. Current signals mostly measure people solving puzzles, not clicking documentaries about them; non-solvers may also read the grid as homework and scroll past. That is a genuine package risk. The cross-cultural relay and newspaper takeover—not solving technique—should therefore dominate the title, thumbnail, and first minute.

Even with that uncertainty, Sudoku is the best next bet: the promise is cleaner, the evidence is firmer, the visuals are native to the subject, and the downside is lower.
```

</details>

### Rubric result

| # | Result | Basis |
|---:|:---:|---|
| 1 | fail | It acknowledges the absence of trustworthy channel history but gives no decision date, target market/language, supplied-versus-missing production constraints, or named cold-start mode. |
| 2 | fail | It reads or requests no WHP doctrine or episode state and nevertheless assigns exact channel-fit scores. |
| 3 | fail | It visibly compares four subjects, not at least 30 diverse subjects. |
| 4 | pass | It uses specific, filmable angles and explicitly says the broad workplace subject would need a narrower scoreboard and cases. |
| 5 | pass | A game-history video wins, with Tetris as another first-class actual-game candidate. |
| 6 | partial | The bespoke score touches fit, proof, visuals, whitespace, and production, but does not transparently apply all six gates at angle level and omits duplication/portfolio fit. |
| 7 | partial | It supplies multiple public interest/supply clues, but the winner's competitive-whitespace score lacks direct angle-level competition evidence or a comparable-video cohort. |
| 8 | pass | It treats missing channel history as a limitation and explicitly says public play/channel counts do not predict the history video's views. It does not misuse Trends or a spike. |
| 9 | partial | It links factual sources and labels scores as editorial judgments, but does not date the current channel metric or consistently distinguish each observation from estimate and inference. |
| 10 | partial | It uses a transparent weighted comparison and does not chase a spike, but the rubric has no explicit audience-demand criterion and is not demonstrably reach-heavy. |
| 11 | partial | Only Sudoku receives a full title, thumbnail, cold open, story spine, and payoff alignment test; the other top candidates do not. |
| 12 | pass | It chooses Sudoku and directly explains why workplace status—the named runner-up—loses on claim scope, evidence, production, and competitive variance. |

**Scenario C total:** 4 pass, 5 partial, 3 fail.

### Exact failure excerpts

- **Check 1 — missing analytics are acknowledged, but the rest of the decision frame is absent:**

  > With no trustworthy channel history, I would optimize for a topic with low research risk, a strong visual engine, and an instantly legible promise.

- **Check 2 — exact fit scores are assigned without current doctrine or episode state:**

  > | **Sudoku conquers the world** | 4.5 | 5 | 5 | 5 | 4 | 5 | **95.5** |

  > | Workplace status games | 4.5 | 5 | 3.5 | 2.5 | 3 | 4.5 | **79.0** |

- **Check 3 — the visible candidate landscape contains four subjects:**

  > | **Sudoku conquers the world** | 4.5 | 5 | 5 | 5 | 4 | 5 | **95.5** |

  > | Workplace status games | 4.5 | 5 | 3.5 | 2.5 | 3 | 4.5 | **79.0** |

  > | Why Tetris follows you into sleep | 3.5 | 4.5 | 4 | 5 | 2 | 3.5 | **77.5** |

  > | Why humans collect things | 4 | 4 | 3 | 5 | 2 | 4 | **75.0** |

- **Check 6 — the custom score is not the complete six-gate screen:**

  > Scores are 1–5 editorial judgments, not faux performance forecasts. I weighted what matters most without analytics: package clarity 25%, channel fit 20%, proof/story spine 20%, visuals 15%, competitive whitespace 10%, and evergreen/production safety 10%.

  Game/play centrality and human payoff are compressed into an unexplained fit score, while
  duplication/portfolio fit is absent.

- **Check 7 — demand signals do not validate the exact history package's competitive opening:**

  > It also has durable public demand: the World Puzzle Federation is running eight international Sudoku Grand Prix rounds in 2026, while the specialist Cracking the Cryptic channel sits around 700,000 subscribers and 309 million views.

  > | **Sudoku conquers the world** | 4.5 | 5 | 5 | 5 | 4 | 5 | **95.5** |

  The response assigns whitespace 4/5 without showing current results or comparable
  documentary performance for this angle.

- **Check 9 — a volatile public metric is called current without a dated observation:**

  > [current channel count](https://socialcounts.org/youtube-live-subscriber-count/UCC-UOdK8-mIjxBQm_ot1T-Q).

  > The territory is also crowded with career-advice and management framing; HBR alone maintains an entire office-politics topic stream.

  The first observation lacks an observation date; the second is an editorial competition
  inference rather than a classified market observation.

- **Check 10 — transparent weights omit explicit demand and do not make reach decisive:**

  > I weighted what matters most without analytics: package clarity 25%, channel fit 20%, proof/story spine 20%, visuals 15%, competitive whitespace 10%, and evergreen/production safety 10%.

- **Check 11 — complete packaging is limited to the winner:**

  > **Title:** *How Sudoku Conquered the World*

  > **Thumbnail:** One stark 9×9 grid spreading across a globe or wall of newspaper front pages, with the short line: **9 NUMBERS. EVERYWHERE.**

  > **Cold open:** In November 2004, almost nobody in Britain knew this grid.

  No corresponding package/payoff test is supplied for workplace status, Tetris, or
  collecting.

## Cross-scenario baseline failure patterns

- **The search space collapsed early.** Scenario A and B each expose five subjects, while
  Scenario C exposes four. None records the required 30-subject, multi-lane divergence
  before narrowing.
- **Current WHP state was not consulted.** No response names current doctrine, steering,
  published episodes, committed work, drafts, or backlog state. Each still makes WHP-fit
  judgments, and none performs a reliable duplication/portfolio-fit gate.
- **Eligibility screening was incomplete and implicit.** All three reason about several
  useful dimensions, but none applies the same six hard gates at angle level.
- **Demand research outweighed competition research.** Each response brings multiple public
  demand, scale, historical, or research signals, but none establishes the winning angle's
  competitive opening through current result sets or age/format/channel-aware comparables.
- **Evidence provenance was uneven.** Links and caveats are common strengths, especially in
  Scenario B, but no response maintains a dated fact/estimate/inference trail. Material
  competitive judgments remain uncited or unclassified.
- **Comparison models were improvised.** Scenario A uses an unweighted evidence/rejection
  table, Scenario B an unweighted five-column comparison, and Scenario C a bespoke score
  without an explicit demand criterion. None demonstrates the fixed reach-heavy model.
- **Packaging stopped after selection.** Every winner receives a plausible package and
  payoff, but no response stress-tests packages across the leading candidates before the
  decision.
- **The baseline did show useful decision discipline.** All three select exactly one winner
  and explain why the nearest alternative loses. Scenario B also rejects both the raw
  20-million-view count and normalized Trends peak as sufficient decision evidence.

## Historical forward-test results — superseded by corrected-tree campaign

Three fresh agents received the same fixed prompts under the governed forward intervention at
repository revision `d33e106`. The evaluator read each full response and rechecked observable
behavior rather than accepting its completeness audit. Candidate counts, angle rows, six-gate
records, independent signals, source classifications, score weights and arithmetic, package counts
and differences, post-package rescoring, confidence, uncertainty, and winner/runner-up language
were all checked directly.

All three source artifacts ended with a newline. To satisfy `git diff --check`, the embedded copies
remove the two trailing ASCII spaces used for Markdown hard breaks after each of the first five
decision fields (artifact lines 5–9): **15 lines and 30 space bytes total**. No visible character,
wording, punctuation, link, table row, or other byte was changed.

| Scenario | Baseline | Forward | Change |
|---|---:|---:|---:|
| A — cold start and actual games | 5 pass, 5 partial, 2 fail | **12 pass, 0 partial, 0 fail** | +7 pass; all partial/fail behavior eliminated |
| B — trend bait and misleading metrics | 3 pass, 7 partial, 2 fail | **12 pass, 0 partial, 0 fail** | +9 pass; all partial/fail behavior eliminated |
| C — conflicting evidence and forced choice | 4 pass, 5 partial, 3 fail | **12 pass, 0 partial, 0 fail** | +8 pass; all partial/fail behavior eliminated |
| **Total** | **12 pass, 17 partial, 7 fail** | **36 pass, 0 partial, 0 fail** | **+24 pass** |

### Scenario A — cold start and actual games

#### Scenario prompt

```text
Act as the editorial researcher for a new English-language YouTube channel called Why Humans Play. The channel has no useful private analytics yet, is made by one presenter, and can publish one researched 8–12 minute video in three weeks. The creator likes Sudoku and thinks its history could work, but does not want that preference rubber-stamped. Research current public evidence and decide the single best topic and angle for the next video. Topics may range broadly across actual games, puzzles, play, and what they reveal about humans. Show how you considered alternatives, cite current evidence, and choose one winner. Do not ask follow-up questions.
```

#### Complete forward response

<details>
<summary>Scenario A forward response (complete; trailing-space normalization documented above)</summary>

```markdown
# WHP Next-Video Recommendation

## Decision

**Decision status:** Winner selected
**Winner:** Airplane boarding — why passengers crowd the gate even with assigned seats: scarce overhead-bin space and sold boarding priority turn boarding into a game that makes apparently bad behaviour rational
**Confidence:** medium
**Why it wins now:** It combines a nearly universal irritation, fresh 2026 airline-policy evidence, demonstrated cross-register YouTube interest, a still-open incentive angle, and the useful Hidden Game payoff the WHP pilot requires.
**Strongest honest title/thumbnail promise:** **“Why Everyone Crowds the Gate (Even With Assigned Seats)”** — a Group 8 boarding pass and one carry-on racing toward the last open bin
**Mode:** cold-start

## Decision frame

| Field | Required value |
|---|---|
| Research and decision date | 2026-07-20 |
| Target market and language | English-language viewers; geography was not supplied. Public YouTube evidence was gathered from English queries with no deliberate geographic restriction, while the freshest policy evidence is mainly US-based. International transfer is therefore an uncertainty. |
| Desired publication window | About 2026-08-10: one researched video in three weeks. The winner has a northern-hemisphere summer-travel tail but is evergreen and does not depend on one airline announcement. |
| Evidence mode | `cold-start` — the channel has no decision-useful private analytics. |
| Production, timing, and format constraints | One presenter; 8–12 minutes; research, make, and publish in three weeks. Budget, airport access, and stock-library access were not supplied. The recommendation assumes a presenter-led shoot, simple diagrams/props, and properly licensed or public-domain B-roll—not airport filming. The user’s 8–12-minute requirement overrides the repository’s earlier 6–10-minute default. |
| WHP files read | [`BRAND.md`](/tmp/why-humans-play-video-topic-skill/BRAND.md); [`whp-youtube/STEERING.md`](/tmp/why-humans-play-video-topic-skill/whp-youtube/STEERING.md); [`evolutionary-paradox-of-play.md`](/tmp/why-humans-play-video-topic-skill/whp-youtube/drafts/evolutionary-paradox-of-play.md); [`thumbnails/README.md`](/tmp/why-humans-play-video-topic-skill/whp-youtube/thumbnails/README.md). |
| Episode state checked | Pre-launch: zero subscribers and zero published videos. “Evolutionary paradox of play” is a parked, substantially developed draft, not the pilot. The channel backlog contains game theory, brain games, adult play, and game-addiction seeds, but no boarding, Sudoku, streak, tipping, or Pokémon episode is committed. Highest-priority doctrine says the pilot should be a maximally recognizable, useful **Hidden Game**. |
| Supplied private analytics used | None. |
| Unavailable private analytics | No audience tab, Trends tab, traffic-source, geography, retention, CTR, comment, or equal-lifespan channel data exists yet. This prevents a channel-specific reach estimate and keeps confidence at medium. Credentials are neither needed nor requested. |
| Public evidence scope | Public English-language YouTube search/video metadata observed 2026-07-20; direct videos from 2013–2026; current official event/company pages; primary or first-party factual sources; relevant research from 2003–2026. Long-form was separated from Shorts where metadata allowed. |
| Research/tool limitations | Google Trends in **YouTube Search** mode was inaccessible, so no Trends value or absolute-search claim is used. Public YouTube results can vary by time/location; several channel-cohort comparisons lack perfectly equal ages. Raw views are treated as outcomes, not demand estimates. No target geography, budget, rights library, or airport access was supplied. |

## Candidate landscape

**Pool:** 34 distinct subjects across eight WHP lanes, generated before ranking. **Shallow-scan survivors:** 10 subjects/lead angles. **Deep-research finalists:** 5. **Conspicuous trend bait retained then rejected:** two—2026 World Cup penalties (the event ended before the production window) and International Chess Day/current chess events (high attention, no sufficiently open exact angle). Sudoku was advanced on its evidence, not on the creator’s preference.

Gate order below is **GC/HR/RP/EP/PR/PF**: game/play centrality, human revelation, recognized payoff, evidence path, production reality, and portfolio fit. `P` = pass, `F` = fail, `U` = unknown. Every advancing lead angle was re-audited; alternatives for all promising subjects are shown as lettered rows.

<details>
<summary>Full grounded pool and angle-level gate audit</summary>

| # | WHP lane or signal seed | Subject | Source/seed | Exact angle | Six gates + concise reason for F/U | Disposition |
|---:|---|---|---|---|---|---|
| 1 | Actual puzzle/history | Sudoku | User preference plus R7–R11 | How an American “Number Place,” refined and named in Japan, became a wordless global ritual—and what its portable constraints reveal about puzzle hunger | P/P/P/P/P/P | **Deep-research finalist** |
| 1a | Puzzle design/cognition | Sudoku | R8, R10–R11 | Why expert Sudoku looks like magic: repeated constraints teach people to see deductions that novices cannot yet see | P/P/P/P/P/P | Rejected after shallow scan: narrower and more instructional than the history/humanity promise |
| 2 | Daily puzzles/learning | Wordle | R19 | Why one puzzle a day can be harder to quit than an unlimited game: scarcity turns play into a shared ritual | P/P/P/P/P/P | **Shallow-scan survivor** |
| 2a | Game history/culture | Wordle | R19 | How a private gift became a four-billion-play public ritual—and why shareable failure mattered | P/P/P/P/P/P | Rejected after shallow scan: familiar story and heavy existing coverage |
| 3 | Daily puzzles/classification | Connections | R19 | Why Connections manufactures the “I knew that” feeling: ambiguity makes categorization social | P/P/P/P/P/P | Rejected: payoff less universal and close to the stronger daily-ritual candidate |
| 4 | Daily puzzles/social play | Crossplay/Scrabble-like play | R19 | Why the New York Times made its first designed two-player game now—and what solo puzzles were missing | P/P/P/P/P/P | Rejected: product-news gravity and weak evergreen opening |
| 5 | Strategy/culture | Chess | R22 | Why chess ratings turn improvement into a status game long after the board is closed | P/P/P/P/P/P | Rejected: crowded shelf; current event attention did not reveal a clean content gap |
| 6 | Sport/game theory | Football penalty kicks | R20 | Penalties are not a lottery: what mixed strategies can—and cannot—tell us about choosing a side under pressure | P/P/P/P/P/P | **Shallow-scan survivor**; rejected before deep final because publication trails the World Cup final by three weeks and current coverage is dense |
| 6a | Sport/current event | 2026 World Cup penalties | R20 | Why so many 2026 World Cup penalties were missed | P/P/P/U/P/P — a complete, verified tournament dataset was unavailable | Rejected trend bait; evidence gate not passed |
| 7 | Collecting/game economy | Pokémon | R17–R18 | Thirty years of “catch ’em all”: how a finite checklist turns collecting into identity, status, and a market | P/P/P/P/P/P | **Deep-research finalist** |
| 7a | Rules/design/history | Pokémon | R17–R18 | The tiny Game Boy constraints that made trading—not just collecting—the real Pokémon game | P/P/P/P/P/P | Rejected after shallow scan: stronger franchise-history competition and greater footage burden |
| 8 | Arcade/incentives | Claw machines | R21 | The machine decides when the claw is strong: how a game sells the feeling that the next try is skill | P/P/P/P/P/P | Rejected: exact “rigged claw” promise is already saturated by large explainers |
| 9 | Perception/puzzle | Tetris | Public actual-game seed; R19 | Why falling blocks keep appearing after play—and what the Tetris effect reveals about a prediction-hungry mind | P/P/P/P/P/P | Rejected: well-covered effect; trauma-treatment framing would require much heavier caveating |
| 10 | Board-game history | Monopoly | Brand actual-game lane; R1 | The anti-monopoly lesson that became a celebration of monopoly—and what rule changes do to ideology | P/P/P/P/P/P | Rejected: famous origin story and saturated angle |
| 11 | Strategy/psychology | Rock–paper–scissors | Brand game-theory lane; R1–R2 | Humans cannot randomize on command—and a playground game exposes the patterns we leak | P/P/P/P/P/P | Rejected: plentiful existing explainers and limited fresh timing |
| 12 | Development/play | Hide-and-seek | Brand play-science lane; R1 | Hide-and-seek as a theory-of-mind laboratory: to hide well, a child must model another mind | P/P/P/U/P/P — direct evidence for the broad causal wording was not established | Rejected; evidence gate not passed |
| 13 | Digital game culture | Speedrunning | Public adjacent-creator/game-culture seed | Why people turn finished games into new games: communities invent rules that restore uncertainty | P/P/P/P/P/P | Rejected: footage/access burden and smaller immediate non-gamer payoff |
| 14 | Role-play/community | Dungeons & Dragons | Brand play-frame doctrine; R1 | Why voluntary rules let adults rehearse identities they cannot safely try in ordinary life | P/P/P/P/P/P | Rejected: evidence and participant-access needs exceed the three-week opportunity |
| 15 | Digital geography/play | GeoGuessr | Public game-culture seed | How GeoGuessr turns tiny environmental clues into a playable form of expertise | P/P/P/P/U/P — game-footage permission and a credible expert demonstration were unconfirmed | Rejected; production gate not passed |
| 16 | Hidden Game/travel | Airplane boarding | R4–R6 | Why passengers crowd the gate even with assigned seats: scarce bin space and sold priority make “bad” behaviour rational | P/P/P/P/P/P | **Deep-research finalist and winner** |
| 16a | Operations/game design | Airplane boarding | R4, R6 | Why the mathematically fastest boarding method feels slow—and why airlines rarely use it | P/P/P/P/P/P | Rejected after shallow scan: CGP Grey and Vox already own the efficiency promise |
| 17 | Hidden Game/social norms | Tipping screens | R15–R16 | The tip screen is a one-move social game: why being watched changes what “voluntary” feels like | P/P/P/P/P/P | **Deep-research finalist** |
| 17a | Institutions/history | Tipping | R15–R16 | How a voluntary reward became part of the wage system—and why no diner can change the norm alone | P/P/P/P/P/P | Rejected after shallow scan: heavily covered US-policy story |
| 18 | Hidden Game/apps | Daily streaks | R12–R14 | Your streak is playing you: when a counter meant to support a habit becomes the goal | P/P/P/P/P/P | **Deep-research finalist** |
| 18a | Learning/game design | Duolingo streaks | R12–R14 | Why a streak can keep you practising yet make one missed day feel like losing everything | P/P/P/P/P/P | Rejected after shallow scan: single-brand framing narrows reach and invites unsupported learning claims |
| 19 | Hidden Game/work | Salary negotiation | Brand’s explicit salary-talk seed; R1 | The first number changes the game: how anchoring and information asymmetry shape a salary conversation | P/P/P/P/P/P | **Shallow-scan survivor** |
| 19a | Cooperation/institutions | Salary transparency | Brand Hidden Game lane; R1 | Why secrecy makes coworkers play against one another instead of the employer | P/P/P/P/P/P | Rejected after shallow scan: legal/geographic variation complicates a three-week global-English episode |
| 20 | Hidden Game/signalling | Job interviews | Brand work/status seed; R1 | The interview is a signalling game in which both sides reward confidence they know can be performed | P/P/P/P/P/P | **Shallow-scan survivor** |
| 20a | Incentive design | Hiring take-home tasks | Brand work seed; R1 | When a “test” becomes unpaid work: the hidden incentive game behind take-home assignments | P/P/P/P/P/P | Rejected after shallow scan: narrower audience and evidence fragmented by occupation |
| 21 | Matching/incentives | Dating apps | Brand’s explicit dating seed; R1 | Why more matches can make matching worse: app and dater incentives point at different goals | P/P/P/P/P/P | Rejected: saturated, sensitive, and platform-specific evidence burden |
| 22 | Money/loyalty | Supermarket loyalty pricing | Brand money/institutions lane; R1 | The “discount” is the rule: loyalty prices turn shopping into a data-for-access game | P/P/P/P/P/P | Rejected: jurisdiction and retailer variation weakens one global promise |
| 23 | Status/work | Office visibility | Brand status seed; R1 | Why useful work can lose to visible work when promotion rules are hidden | P/P/U/P/P/P — the payoff remained too broad to recognize in one sentence | Rejected; recognized-payoff gate not passed |
| 24 | Attention/game design | Social feeds | Brand’s explicit social-feed seed; R1–R2 | The feed’s real game is prediction, not pleasure—and every scroll trains the opposing player | P/P/P/P/P/P | Rejected: highly saturated “addictive algorithm” shelf |
| 25 | Auctions/incentives | Online auctions | Brand money/game-theory lane; R1 | Why the winner can be the person who made the biggest mistake: the winner’s curse in everyday bidding | P/P/P/P/P/P | Rejected: useful but less immediate and visually weaker than the finalists |
| 26 | Cooperation | Group projects/public goods | Brand institutions lane; R1 | Why helpful people get punished in group work: effort is private but the grade is shared | P/P/P/P/P/P | Rejected: familiar mechanism, weaker timely/public reach signal |
| 27 | Learning/evidence audit | Brain-training games | Repository backlog; R2 | Do brain games work? The honest answer from someone who builds them | P/P/P/P/P/P | **Shallow-scan survivor** |
| 27a | Transfer/learning | Brain games | Repository backlog; R2 | Why getting better at a game is not the same as getting smarter outside it | P/P/P/P/P/P | Rejected after shallow scan: stronger as a later credibility episode after channel trust exists |
| 28 | Evolution/biology of play | Animal play | R1–R3 | Evolution should have deleted risky, useless-looking play—so why did it survive? | P/P/P/P/P/F — substantially duplicates the parked, production-developed episode | Rejected; portfolio-fit gate failed |
| 29 | Adult play/creativity | Adult play | Repository backlog; R2–R3 | Why adults stop playing just when uncertainty could make them more adaptable | P/P/P/P/P/P | Rejected: adjacent to parked/backlog material and weaker pilot utility |
| 30 | Development/ethics | Play deprivation | Parked-draft forward hook; R3 | What happens when a developing mind is deprived of play? | P/P/P/P/P/F — directly overlaps the parked draft’s next-episode hook and evidence programme | Rejected; portfolio-fit gate failed |
| 31 | AI/simulation | Game-playing agents | Brand AI lane plus R22 | Why games train capable AI—and what their failures reveal about the difference between score and understanding | P/U/P/P/P/P — the human revelation was not yet central enough | Rejected; human-revelation gate not passed |
| 32 | Virtual worlds/community | Roblox | R22 | The game behind Roblox is making games: how creator incentives concentrate attention in a world of empty experiences | P/P/P/P/P/P | Rejected: child-safety/context and platform-data scope exceed the window |
| 33 | Virtual economies | Cosmetic items/skins | Brand digital-economy lane; R1 | How a valueless skin becomes valuable once a community can see it | P/P/P/P/P/P | Rejected: broad, saturated, and rights/footage-heavy |
| 34 | Philosophy/play | Finite vs. infinite games | Brand Playable Idea mode; R1 | What changes when you play a career to stay in the game rather than to “win” it | P/P/P/P/P/P | Rejected: useful essay, but less concrete and less evidence-led for the pilot |

</details>

## Ranked shortlist

Scores are editorial judgments after package testing, not view forecasts. Each component is `integer/evidence grade`.

| rank | subject | exact angle | demand /25 | opening /15 | package /20 | satisfaction /15 | WHP /10 | evidence /10 | feasibility /5 | total /100 | overall confidence | decisive risk |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| 1 | Airplane boarding | Why passengers crowd the gate even with assigned seats: scarce bin space and sold priority make apparently bad behaviour rational | 19/B | 11/B | 18/A | 14/B | 10/A | 8/B | 5/A | **85** | medium | Exact-angle audience transfer is unproven, and the freshest incentive evidence is US-heavy |
| 2 | Sudoku | How an American puzzle, refined and named in Japan, became a wordless global ritual—and what its constraints reveal about puzzle hunger | 19/B | 11/B | 16/B | 13/B | 8/A | 9/A | 5/A | **81** | medium | Sudoku demand is clear, but available history-promise videos are weak outcomes; history may be admired rather than chosen |
| 3 | Daily streaks | When a counter meant to support a habit becomes the goal: how apps turn consistency into a game | 13/B | 11/B | 18/A | 13/B | 10/A | 9/A | 5/A | **79** | medium | Exact streak explainers underperform broader app-psychology content in the accessible cohorts |
| 4 | Tipping screens | The one-move social game that makes a “voluntary” payment feel compulsory | 19/B | 4/B | 15/B | 13/B | 10/A | 8/A | 5/A | **74** | medium | Demonstrated demand comes with a densely supplied, US-centric shelf |
| 5 | Pokémon collecting | Thirty years of “catch ’em all”: how a finite checklist turns collecting into identity, status, and a market | 19/B | 8/B | 18/A | 11/B | 8/B | 6/C | 3/B | **73** | low | Existing 2026 coverage, slippery causal psychology, and licensed-visual dependence |

1. **Airplane boarding:** Multiple old but very large educational/comedy outcomes establish broad recognition, while July 2026 reporting and airline policy expose the current incentive mechanism; the uncertainty is transfer from “boarding is absurd/inefficient” to this exact hidden-game thesis (R4–R6, R25).
2. **Sudoku:** High public recognition, active 2026 competition, a major how-to outlier lead, and first-party history make it robust; exact history videos’ modest outcomes keep the opening and package below the winner (R7–R11, R26).
3. **Daily streaks:** A fresh field experiment, peer-reviewed supporting work, and a broad app-psychology outlier create a defensible opening, but two exact 2026 streak videos sit below their channels’ accessible recent cohorts (R12–R14, R27).
4. **Tipping screens:** CNBC’s 5.78M outcome and continuing coverage prove recognition, but a current Phil Edwards treatment plus many near-identical explainers leave little opening; the geographic fit is also unknown (R15–R16).
5. **Pokémon collecting:** The 30th anniversary and a 1.36M card-market outlier show current reach, but an exact “predatory collecting” treatment already exists and the central human-psychology claims are less direct than the top four (R17–R18).

Arithmetic check: 85 = 19+11+18+14+10+8+5; 81 = 19+11+16+13+8+9+5; 79 = 13+11+18+13+10+9+5; 74 = 19+4+15+13+10+8+5; 73 = 19+8+18+11+8+6+3.

## Packaging stress test

Exactly three materially different directions were tested for each top-three finalist.

| finalist | direction | working title | intended viewer | familiar element | surprise/tension | visual promise | delivered payoff | survives honestly? |
|---|---|---|---|---|---|---|---|---|
| Airplane boarding | **A — strongest** | **Why Everyone Crowds the Gate (Even With Assigned Seats)** | Anyone who flies or has mocked the boarding scrum | Assigned seat, boarding group, carry-on | If the seat is safe, why does everyone stand up? | A Group 8 pass and one carry-on aimed at the last visibly open bin | The line is an equilibrium produced by scarce bin space, sequential advantage, status, and paid priority; viewers learn when the incentive applies and when it does not | **yes** |
| Airplane boarding | B — pay-to-win | Airlines Turned Boarding Into a Pay-to-Win Game | Travellers frustrated by fare tiers and airport status rituals | Priority groups and premium lane | “Efficient” boarding rules also sell rank and access | Eight group signs become a game ladder; bin space sits at the top | How airlines bundle seat, loyalty, and boarding priority, and why efficiency is not the only objective | yes, if localized examples are labelled and intent is not overclaimed |
| Airplane boarding | C — optimization bait | The Fastest Way to Board a Plane | Aviation/operations viewers | Cabin diagram and queues | The obvious method loses to a strange one | Animated race between boarding methods | That payoff belongs to an efficiency episode, not the selected crowding/incentive thesis | **no — wrong promised episode and already well served** |
| Sudoku | **A — strongest** | **Sudoku Wasn’t Invented in Japan** | Casual puzzle players and people who recognize the grid | Sudoku’s Japanese name | Its modern form began in an American magazine, then Japan changed its fate | A grid travelling US → Japan → world newspapers | A sourced, non-nationalist chain of invention, refinement, naming, software distribution, and global adoption | **yes** |
| Sudoku | B — universal rules | Why Sudoku Needs No Translation | Puzzle-curious viewers, including non-experts | Nine digits and a 9×9 grid | A game with almost no language crossed cultures unusually well | The same grid over newspapers in several scripts | How simple rules, no calculation, scalable difficulty, and human construction made it portable; “language-free caused success” remains a bounded inference | yes |
| Sudoku | C — brain benefit | Sudoku Makes You Smarter | Self-improvement/brain-health viewers | Familiar “brain workout” belief | A recreational puzzle allegedly transfers to general intelligence | A Sudoku grid lighting up a brain | The planned history/design episode cannot establish that causal benefit | **no — unsupported load-bearing promise and wrong audience** |
| Daily streaks | **A — strongest** | **Your Streak Is Playing You** | Anyone with a Duolingo, Snapchat, fitness, reading, or habit counter | Flame icon and a large day count | The tool that tracks the goal can replace the goal | A 1,247-day flame pulling puppet strings attached to a phone | Why streak frames exploit accumulated progress, when that helps, when it backfires, and how to track the underlying behaviour instead | **yes** |
| Daily streaks | B — habit/score split | You Built a Score, Not a Habit | Productivity and learning viewers | Habit tracker calendar | Perfect continuity can conceal weak progress | A perfect flame chain beside an almost-empty progress bar | A nuanced distinction between continuity, actual practice quality, and durable behaviour | yes |
| Daily streaks | C — anti-Duolingo bait | Your Duolingo Streak Taught You Nothing | Angry or anxious Duolingo users | Duo/flame and long streak | Years of work were supposedly worthless | A 1,000-day counter stamped “0” | Evidence does not show that streak-supported practice teaches nothing; the episode is about metric substitution, not language efficacy | **no — absolute claim is false/unsupported** |

| finalist | strongest surviving direction | thesis changed? / gate rerun result | package score before -> after | satisfaction score before -> after | post-test rank | winner-eligible? |
|---|---|---|---:|---:|---:|---|
| Airplane boarding | Why Everyone Crowds the Gate (Even With Assigned Seats) | No; all six gates remain P | 15 -> **18** | 13 -> **14** | **1** | yes |
| Sudoku | Sudoku Wasn’t Invented in Japan | No; all six gates remain P | 15 -> **16** | 12 -> **13** | **2** | yes |
| Daily streaks | Your Streak Is Playing You | No; all six gates remain P | 15 -> **18** | 12 -> **13** | **3** | yes |

- **Airplane boarding earned reframe:** The gate crowd is not best explained as mass stupidity; it is a predictable equilibrium when the rules make a scarce shared resource first-come and sell earlier moves. Follow-ups: **“The Tip Screen Is Watching You”** (social norms at checkout) and **“Why Airline Status Feels Like Progress”** (loyalty tiers as a game).
- **Sudoku earned reframe:** Sudoku is neither simply ancient mathematics nor simply Japanese invention; its global form emerged from a relay of rule design, naming, hand-crafting, software, and newspapers. Follow-ups: **“Why Wordle Gives You Only One Game a Day”** and **“Why Chess Ratings Change How You Play.”**
- **Daily streaks earned reframe:** A streak is not inherently good or bad—it is a play-frame around continuity that can support the real goal or quietly replace it. Follow-ups: **“Why Loyalty Points Expire”** and **“What Leaderboards Do to Good Work.”**

## Winner brief

| Field | Required content |
|---|---|
| Exact subject and angle | **Airplane boarding — why passengers crowd the gate even with assigned seats: scarce overhead-bin space and sold boarding priority turn boarding into a game that makes apparently bad behaviour rational.** |
| Working logline | An assigned seat looks like permission to relax, yet the rules leave one valuable resource unassigned; once airlines sell earlier moves in that race, the chaotic gate crowd becomes a rational outcome of the game. |
| Intended viewer | An English-speaking occasional or frequent flyer who has stood in, complained about, or laughed at the boarding scrum—not an aviation specialist. |
| Why now | **Evergreen with a current/seasonal lift.** Southwest replaced open seating with eight assigned-seat boarding groups in January 2026, July 2026 reporting shows airlines intensifying premium segmentation, and the proposed publication lands in the summer-travel window. The thesis remains useful after that hook passes (R5). |
| Familiar entry point and central tension | “Your seat is assigned. Why are you standing up 25 minutes early?” The obvious moral answer—people are rude or irrational—collides with the remaining race for bin space and priority. |
| Game/play mechanism | A sequential game over a scarce, imperfectly assigned common resource: boarding order changes access to overhead bins; status/fare purchases alter move order; seeing a crowd changes perceived urgency. The airline has objectives besides pure boarding speed, including premium differentiation. |
| Human revelation and stakes | Rules can manufacture the behaviour they appear merely to manage. Judging players without mapping incentives mistakes an equilibrium for a personality flaw; the same lens travels to queues, tipping, status, and apps. |
| Useful or earned payoff | Viewers can distinguish three motives—bin risk, uncertainty/social proof, and purchased/status priority—then decide deliberately: if they need bin access, order matters; if they have only an under-seat item and an assigned seat, joining the crowd often buys little. Policies vary, so this is a lens rather than universal travel advice. |
| Why unmistakably WHP | It makes a hidden everyday game visible, explains players through rules rather than contempt, and hands back a usable choice—the central pilot requirement in [`BRAND.md`](/tmp/why-humans-play-video-topic-skill/BRAND.md) (R1–R2). |
| Strongest reach evidence and competitive opening | Public YouTube has a 36.90M boarding-method explainer and 14.06M boarding comedy, demonstrating recognition across education and entertainment; July 2026 airline coverage keeps the situation current. Existing large explainers mainly promise **faster boarding**. The exact promise here is **why rational passengers crowd despite assigned seats, and how monetized priority helps create that behaviour** (R4–R6). |
| Factual evidence backbone and caveats | Official Southwest policy documents the 2026 switch to assigned seats/eight groups. AP documents current premium segmentation and late-group concern about bin space. Boarding research supports bin limits/interference and the distinction between mathematical efficiency and passenger/airline objectives. The causal weight of bin scarcity versus anxiety, ambiguity, and conformity is not cleanly isolated, so the episode must present a mechanism stack, not “one weird cause” (R5–R6). |
| Strongest honest package direction | **Title:** “Why Everyone Crowds the Gate (Even With Assigned Seats).” **Thumbnail:** a clear Group 8 pass/call, a carry-on, and one last open overhead-bin slot; no generic airplane beauty shot. **Delivered payoff:** why the seat is assigned but the resource people fear losing is not. |
| Production approach and feasibility | Presenter cold-open with a chair labelled 22A and one shelf/bin; simple top-down cabin/queue animation; generic boarding-group cards; properly licensed airport/cabin B-roll; screen captures only where permitted. No airport access or airline cooperation is required. One mechanism, three player motives, one current case, and one caveat fit 8–12 minutes in three weeks. |
| Evidence confidence and largest uncertainty | **Medium.** Reach, timing, WHP fit, and factual mechanism converge, but no private audience data or Google Trends YouTube comparison exists, and public demand is proven more strongly for boarding absurdity/efficiency than for this exact incentive promise. |
| Falsifier | A current equal-age English YouTube scan or a small target-viewer package test showing that viewers only want the speed/engineering answer—and do not understand or choose the passenger-incentive promise—while the Sudoku origin package clearly wins would reverse the recommendation. |
| Claims/data to verify before scripting | V1: quantify and source bin-space constraints without claiming one universal capacity; V2: compare current boarding/priority rules across representative US and non-US airlines; V3: verify how directly research supports each proposed motive; V4: clear all visual rights; V5: rerun exact-angle supply and package comprehension before script lock. |
| Adjacent follow-ups | **Tipping screens — “The Tip Screen Is Watching You”:** how a private payment became a public social move. **Daily streaks — “Your Streak Is Playing You”:** how a counter around a habit can become the objective. |

## Why the runner-up lost

| dimension | winner: airplane boarding | runner-up: Sudoku | why decisive now |
|---|---|---|---|
| Demand/reach | 19/B: large outcomes in both explanatory (36.90M) and comedy (14.06M) forms plus current travel reporting | 19/B: 89% US fame/47% popularity, a 382.6K how-to lead, a large specialist ecosystem, and active 2026 competition | Numerically tied. Boarding’s evidence spans people seeking explanation and people recognizing the behaviour; Sudoku’s strongest public outcome supports solving, not choosing a history video (R4, R7–R9). |
| Competitive opening | 11/B: big incumbents answer “what boards fastest,” leaving a narrower opening around crowding, bin scarcity, and sold move order | 11/B: no strong modern long-form history incumbent, but available direct history videos have mostly modest outcomes | Both have an opening; Sudoku’s gap may reflect weak demand for the promise, while boarding’s gap sits beside proven mass recognition. |
| Strongest package/payoff | 18/A and 14/B: one glance poses a lived contradiction, then the episode changes how viewers judge and act in that situation | 16/B and 13/B: the origin reversal is honest and attractive, but the immediate value is chiefly historical/design understanding | For a pilot, “I will see this situation differently next flight” is more immediately recognizable than “I will know the true relay of Sudoku’s origin.” |
| WHP lens | 10/A: a literal Hidden Game with visible players, scarce resource, move order, incentives, and deliberate choice | 8/A: an actual game with a strong human/cultural reframe | [`BRAND.md`](/tmp/why-humans-play-video-topic-skill/BRAND.md) explicitly requires the pilot to be a useful Hidden Game; this is a sequence decision, not a demotion of actual games. |
| Evidence/feasibility | 8/B and 5/A: excellent production fit, but individual motive weights need caveating | 9/A and 5/A: stronger first-party history and equally easy production | Sudoku wins this tradeoff, but its one-point evidence advantage does not overcome boarding’s package and pilot-fit advantages. |
| Timing | July 2026 premium-airline coverage; publication during summer travel; evergreen after the hook | WPF Sudoku GP round runs 7–12 August and the world championship is in October | Both are timely. Boarding’s event relevance reaches ordinary travellers; Sudoku’s competition hook primarily reaches an existing puzzle audience. |

**Why Sudoku is not the best next episode:** it is a responsible, filmable runner-up—not a rubber stamp. Its subject demand is real and its source spine is excellent, but the accessible public evidence says people strongly choose **solving revelations**, while direct **history** promises have not demonstrated comparable appeal. It should follow once WHP has established its Hidden Game lens.

**Reversal condition:** promote Sudoku if a comprehension/choice test among target English viewers gives **“Sudoku Wasn’t Invented in Japan”** a clear, repeatable advantage over the boarding package, or if a fresh exact-angle scan finds that a credible new boarding video already delivers the same incentive thesis. The Sudoku script should then anchor in Nikoli’s first-person account and avoid claiming that being wordless alone caused global adoption.

## Research trail

| candidate/criterion | claim or signal | direct source URL/repository file | observed value | observation date | geography/language/format/window | fact/estimate/inference | counterevidence/caveat | claim to verify |
|---|---|---|---|---|---|---|---|---|
| R1 — Frame/WHP | [repository fact] Pilot and value doctrine | [`BRAND.md`](/tmp/why-humans-play-video-topic-skill/BRAND.md) | Pre-launch pilot must be a maximally recognizable, useful Hidden Game; actual games remain eligible across the brand | 2026-07-20 (file committed 2026-07-13) | Repository / English / current doctrine | fact | This prioritizes sequence fit, not a permanent ban on actual-game episodes | None |
| R2 — Frame/portfolio | [repository fact] Channel state, operating rules, and backlog | [`whp-youtube/STEERING.md`](/tmp/why-humans-play-video-topic-skill/whp-youtube/STEERING.md) | Zero videos/subscribers; solo presenter; packaging-first; game theory, brain games, adult play, and addiction seeds recorded | 2026-07-20 (file updated 2026-07-13) | Repository / English | fact | Parts of the old pilot plan are explicitly being revised under R1 | Reconfirm no episode became committed before script lock |
| R3 — Portfolio | [repository fact] Parked play episode | [`evolutionary-paradox-of-play.md`](/tmp/why-humans-play-video-topic-skill/whp-youtube/drafts/evolutionary-paradox-of-play.md), [`thumbnails/README.md`](/tmp/why-humans-play-video-topic-skill/whp-youtube/thumbnails/README.md) | A roughly nine-minute evolutionary-play script and extensive packages already exist; status says parked, not pilot | 2026-07-20 | Repository / English / draft | fact | Strong work, but selecting it would duplicate current portfolio work and violate pilot direction | Listed scientific figures remain pre-recording checks if revived |
| R4 — Boarding demand | [public evidence] Public YouTube outcomes across explanation and comedy | [CGP Grey](https://www.youtube.com/watch?v=oAHbLRjF0vo), [Key & Peele](https://www.youtube.com/watch?v=qhxlZC8BZJ4), [Julie Nolke](https://www.youtube.com/watch?v=Ai6I3cE74b0), [Vox](https://www.youtube.com/watch?v=cMgarcFkXz4) | 36,902,024 views (2019; 7.03M-subscriber channel; 8:27); 14,064,457 (2020; 7.25M; 3:54); 105,350 (2024; 1.08M; 4:32); 2,434,211 (2014; 12.7M; 2:35) | 2026-07-20 | Public global YouTube / English / long-form / uploads 2014–2024 | fact (visible public metadata) | Raw views reflect channel, age, title changes, comedy/education, and distribution; they prove neither causal topic demand nor a view forecast. The most exact recent behaviour sketch is not an outlier. | Recheck counts, titles, and first-page exact-angle supply before lock |
| R5 — Boarding timing/incentives | [public evidence] Current rules sell/assign move order while bin concern persists | [Southwest assigned seating FAQ](https://mobile.southwest.com/customer-enhancements/assigned-seating/), [Southwest newsroom](https://www.swamedia.com/news-and-stories/news-release/southwest-airlines-introduces-assigned-seating-and-more-offerings-for-customers-MC5YXLS6T3CVGSVEAME7UF2TLVRU), [AP premium-airline report](https://apnews.com/article/b1ac3b9c05ca942dec213679ab21a62b), [AP Southwest explainer](https://apnews.com/article/0f131c413349a14072f78288e5c056b2) | Southwest moved to assigned seats and Groups 1–8 on 2026-01-27; AP on 2026-07-07 described late-group passengers hoping for bin room and airlines prioritizing premium customers | 2026-07-20 | Primarily US / English / current policy and news / 2026 | fact | One carrier and US premium trends are not universal airline rules; “airlines created crowding on purpose” is too strong | Verify a representative current airline-policy comparison and localize claims |
| R6 — Boarding evidence/opening | [public evidence] Bins, passenger experience, and efficiency are separate constraints | [2025 overhead-bin paper](https://saemobilus.sae.org/papers/approach-optimize-airplane-boarding-process-using-image-recognition-stochastic-simulation-predict-overhead-bin-fill-levels-2025-01-0164), [2024 agent-based study](https://www.sciencedirect.com/science/article/pii/S2214716024000058), [Steffen experiment](https://arxiv.org/abs/1108.5211), [current gate-crowding explainer](https://www.washingtonpost.com/travel/2023/12/13/gate-lice-plane-boarding-line/) | Full flights can have insufficient bin space; models treat limited bins and passenger satisfaction explicitly; optimized methods can beat conventional methods; reporting identifies bin risk and uncertainty among motives | 2026-07-20 | Research 2011–2025 plus US English reporting / aircraft boarding | fact for study findings; inference for combined hidden-game thesis | No cited field experiment cleanly estimates how much each motive causes gate crowding; optimized laboratory boarding is not ordinary operations | Verify motive wording with direct passenger/airport research or an expert; present multiple causes |
| R7 — Sudoku demand | [public evidence] Broad recognition | [YouGov Sudoku](https://yougov.com/en-us/topics/activity/Sudoku) | 89% fame and 47% popularity on the public US tracker | 2026-07-20 | US / public tracker / current page | fact | Opinion-panel values are not YouTube choice intent and geography is US only | Capture tracker date/sample methodology if used on screen |
| R8 — Sudoku YouTube | [public evidence] Strong solving interest but weak history outcomes | [Smart Hobbies how-to](https://www.youtube.com/watch?v=rz4r5ZNwX5o), [Numberphile](https://www.youtube.com/watch?v=pezlnN4X52g), [Use Whatcha Got history](https://www.youtube.com/watch?v=QqucajNKrN8), [The Hindu history](https://www.youtube.com/watch?v=3ipNVbxj74s), [HowStuffWorks origin](https://www.youtube.com/watch?v=Hku_zGTIOn0) | 382,578 views (2025; 44.1K subscribers; 19:33); 3,675,063 (2024; 4.76M; 6:08); direct history examples 3,196, 37,613, and 24,559 views | 2026-07-20 | Public global YouTube / English / 1:51–19:33 / uploads 2013–2025 | fact | Smart Hobbies’ accessible 15 latest videos had a ~3.4K raw median, but their ages differ, so the ~112× ratio is a lead, not a valid equal-lifespan causal outlier. Large Numberphile result promises a secret, not history. | Build an equal-age history/solving cohort before scripting if Sudoku is promoted |
| R9 — Sudoku timing/community | [public evidence] Active 2026 competitive ecosystem | [WPF Grand Prix](https://gp.worldpuzzle.org/), [WSPC 2026](https://wspc2026.logicmastersindia.com/), [UK Puzzle Association](https://www.ukpuzzles.org/) | Sudoku GP Round 8 is 2026-08-07–12; 19th World Sudoku Championship is 2026-10-11–18; UK/European events posted current 2026 results | 2026-07-20 | International / English official pages / 2026 season | fact | Competition interest is a niche timing hook, not broad-audience demand | Confirm event dates shortly before publication |
| R10 — Sudoku thesis/history | [public evidence] First-party origin/refinement record | [Nikoli Sudoku history](https://www.nikoli.co.jp/en/puzzles/sudoku/), [Maki Kaji first-person account](https://www.japanpolicyforum.jp/culture/pt201505281000504929.html), [first WSC archive](https://www.wsc2006.com/) | Nikoli says it found American “Number Place,” introduced it in Japan in 1984, shortened the name, and added symmetric clues in 1986; Kaji says he could solve it without reading English; first WSC site dates the championship lineage to 2006 | 2026-07-20 | Japan/international / English / durable history | fact | “Not Japanese” is an attention line requiring nuance: Japan’s naming, refinement, hand-construction culture, and global relay are central | Verify Howard Garns/Dell and Wayne Gould/newspaper stages against archival sources |
| R11 — Sudoku human claim | [public evidence] Deduction is learned; “wordless caused virality” remains inference | [Sudoku cognition overview](https://www.sciencedirect.com/topics/psychology/sudoku), [Nikoli current site](https://www.nikoli.co.jp/en/) | Overview describes experienced solvers developing more advanced deductive strategies; Nikoli says the puzzle needs no calculation and is enjoyed in 120+ countries | 2026-07-20 | Research/durable; company statement/current | fact for reported study/company reach; inference for causal global-success thesis | Company popularity language is self-interested; universality does not prove why the craze spread | Trace Lee, Goodwin & Johnson-Laird study directly; phrase portability as supported inference, not sole cause |
| R12 — Streak demand/supply | [public evidence] Exact streak videos are modest; adjacent app psychology can break out | [Mobbin](https://www.youtube.com/watch?v=ARq1bx3Sfg8), [Berrohn](https://www.youtube.com/watch?v=HJE_KAnQtiM), [uxpeak](https://www.youtube.com/watch?v=2TlIg3VokY8), [Tarek Reslan](https://www.youtube.com/watch?v=cCWYiCMEQDk) | 6,929 views (2026-05-26; 23.2K subscribers; 9:00); 20,563 (2026-04-15; 12.9K; 9:26); broader UX psychology 279,703 (2026-07-02; 107K; 11:34); Duolingo-streak short 4,562 (2024; 740; 3:28) | 2026-07-20 | Public global YouTube / English / mostly long-form / 2024–2026 | fact | Accessible recent-channel raw medians were ~71K for Mobbin, ~51K for Berrohn, and ~98K for uxpeak, but upload ages are not fully normalized. Exact-angle outcomes are counterevidence, not proof of no demand. | Rebuild equal-lifespan cohorts before elevating streaks to winner |
| R13 — Streak reachable market | [public evidence] Streak mechanics touch a very large adjacent audience | [Duolingo FY2025 results](https://investors.duolingo.com/node/11641/pdf), [Duolingo streak explanation](https://blog.duolingo.com/improving-the-streak/) | Duolingo reported more than 50M DAUs for 2025; company data says users reaching seven days were 2.4× more likely to return the next day | 2026-07-20 | Global company users / first-party report and blog | fact for company observations | DAUs and retention association do not establish that people will click a streak explainer or that streaks caused learning; selection effects are possible | Use as familiarity/mechanism context only, not causal learning evidence |
| R14 — Streak factual opening | [public evidence] Fresh counterintuitive evidence with meaningful caveats | [2025/2026 field experiment preprint](https://papers.ssrn.com/sol3/Delivery.cfm/5934555.pdf?abstractid=5934555&mirid=1), [Journal of Consumer Research](https://academic.oup.com/jcr/article/49/6/1095/6623414), [Ofcom persuasive-design report](https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/online-research/childrens-online-experiences/exploring-the-relationship-between-persuasive-design-on-online-platforms-and-the-time-that-children-spend-on-them/exploring-the-relationship-between-persuasive-design-on-online-platforms-and-the-time-that-children-spend-on-them.pdf?v=418215) | A preprint revised 2026-05-19 reports that highlighting “resist social media” streaks unexpectedly increased social-media use while improving attitudes/retention; peer-reviewed work finds intact vs broken streaks change engagement; Ofcom reports emotional pressure among children | 2026-07-20 | US experiments plus UK child research / 2022–2026 | fact for study findings | Preprint is not yet peer reviewed; tasks/populations differ; streaks can motivate as well as backfire. Do not generalize to “all streaks are harmful.” | Obtain final paper/status and extract effect sizes/method before scripting |
| R15 — Tipping demand/saturation | [public evidence] Proven but crowded YouTube shelf | [CNBC](https://www.youtube.com/watch?v=q_fMkXHYh6c), [Phil Edwards](https://www.youtube.com/watch?v=TmNH2aTAi2U), [Zac Rios](https://www.youtube.com/watch?v=QWzxZBpA1_Q), [WSJ](https://www.youtube.com/watch?v=zqHKMovMWaQ) | 5,779,741 views (2023; 4.16M subscribers); 182,502 (2026; 499K); 292,069 (2025; 434K); 186,506 (2023; 6.64M) | 2026-07-20 | Public YouTube / English / US framing / 5:24–24:03 | fact | Outcomes mix news, commentary, and explainers; saturation is clear, but channel/age effects prevent direct comparison | Check whether a non-US or exact social-pressure package opens a distinct cohort |
| R16 — Tipping evidence | [public evidence] Tipping is sustained by more than simple self-interest | [Azar on tipping norms](https://www.sciencedirect.com/science/article/pii/S016726810300221X), [2025 Management Science model](https://pubsonline.informs.org/doi/abs/10.1287/mnsc.2021.03422), [nationwide field experiment](https://www.nber.org/papers/w26380) | Research models social pressure, gratitude, generosity, impression, and evolving norms; a nationwide platform field experiment found heterogeneous tipping behaviour | 2026-07-20 | Primarily US/market contexts / research 2003–2025 | fact for findings | Restaurant, ride-share, and counter-screen tipping are not interchangeable; “being watched” needs a directly relevant screen study | Source point-of-sale default/visibility evidence before scripting this candidate |
| R17 — Pokémon demand/timing | [public evidence] Major current anniversary plus collecting-market outcomes | [Pokémon 30 official](https://30.pokemon.com/en-us/), [official anniversary video](https://www.youtube.com/watch?v=J3O4ymaZ41Q), [Zackary Smigel](https://www.youtube.com/watch?v=Mpkq9sJIWJQ), [Modern MBA](https://www.youtube.com/watch?v=DU4tPoV7HMk) | Official video 40,392,307 views (2026; 7.08M subscribers); collecting-market videos 1,355,434 (2026; 338K) and 402,195 (2025; 809K) | 2026-07-20 | Global/English YouTube and official campaign / 2025–2026 | fact | Official ad attention is franchise marketing, not evidence for a WHP essay; the 1.36M video already occupies a critical collecting angle | Recheck 30th-anniversary release calendar and exact competing essays |
| R18 — Pokémon evidence/feasibility | [editorial inference] Human thesis and rights are weaker than reach | [Pokémon’s official history/timing](https://www.pokemon.co.jp/info/2026/01/260109_gm01.html), [Pokémon GO anniversary](https://pokemongo.com/news/pokemon-30th-anniversary?hl=en) | Franchise began 1996 and is actively running 2026 anniversary events; collection, rank tracks, trading, and social play are visible mechanics | 2026-07-20 | Global franchise / official pages | inference from first-party mechanics | Collecting psychology is multi-causal; fair-use analysis and a visual plan are unresolved; official materials cannot carry critical claims | Find direct collecting research and clear footage/image rights before scripting |
| R19 — Pool/daily games | [public evidence] Daily puzzle play is enormous and current | [AP on NYT Crossplay/Games](https://apnews.com/article/4ab76097d6155a022f089d03e94807c3) | NYT puzzles were played more than 11.2B times in 2025; Wordle 4.2B; Crossplay launched 2026-01-21 | 2026-07-20 | Primarily NYT/global digital audience / English / 2025–2026 | fact | Plays are sessions, not unique people or YouTube demand; one company’s ecosystem | Verify company primary figures if used in a future episode |
| R20 — Penalty timing/trend bait | [public evidence] Huge current hook ends before publication and exact coverage is active | [FIFA final date](https://www.fifa.com/en/articles/date-set-for-2026-world-cup-final-canada-mexico-usa), [2025 penalty analysis](https://ideas.repec.org/a/bpj/jqsprt/v21y2025i2p159-175n1002.html), [current Planet Money treatment](https://podcastrex.com/shows/planet-money/how-to-win-a-penalty-shootout-with-game-theory) | World Cup final was 2026-07-19; a fresh game-theory episode appeared two weeks before research; 2025 work warns standard game-theory models depend on strong assumptions | 2026-07-20 | Global sport / English / event and research | fact | Three-week production misses peak attention; reported tournament miss counts were not fully verified | None unless topic is reconsidered for a future tournament |
| R21 — Rejected saturation | [public evidence] Exact claw-machine angle is already owned | [Vox](https://www.youtube.com/watch?v=KnMKCHqXLow), [bigclivedotcom](https://www.youtube.com/watch?v=X2kyek_P644), [Inside Edition](https://www.youtube.com/watch?v=IZjqx3YnbwU) | About 10.03M, 1.57M, and 8.09M views on “rigged/how it plays you” promises | 2026-07-20 | Public global YouTube / English / mixed long-form | fact | Raw outcomes do not forecast demand, but three close high-outcome promises document saturation | None; reject for this run |
| R22 — Pool breadth/current seeds | [public evidence] Current chess and virtual-world activity broadened generation | [FIDE 2026–27 Circuit](https://www.fide.com/fide-circuit-2026-2027/), [FIDE International Chess Day](https://www.fide.com/international-chess-day-2026-celebrate-create-and-make-a-difference/), [Roblox investor results](https://ir.roblox.com/overview/) | Chess events surround the window; International Chess Day is 2026-07-20; Roblox published Q1 2026 results and frames itself as a human co-experience platform | 2026-07-20 | International/current official sources | fact | Activity does not establish an open WHP video angle | None for rejected pool subjects |
| R23 — Missing channel evidence | [supplied private observation] No useful private analytics supplied | User brief—no raw data retained | None; channel is new | 2026-07-20 | Channel / English / pre-launch | fact | Reachability, geography, and package response remain unknown, lowering all confidence | Gather only after publishing; do not block this decision |
| R24 — Missing Trends evidence | [public evidence] Google Trends YouTube Search comparison unavailable | [Google Trends](https://trends.google.com/trends/) | unknown/unavailable; no values used | 2026-07-20 | Intended: global/English/YouTube Search/5-year and 12-month windows | fact about availability | Removes a normalized trajectory/seasonality check; YouTube and first-party signals carry more weight but confidence remains medium | Re-run boarding/Sudoku/streak/tipping/Pokémon as Topics or carefully disambiguated terms if access becomes available |
| R25 — Boarding package | [editorial inference] Assigned seat versus unassigned bin is an immediate, filmable contradiction | R4–R6 plus package table | Three distinct directions produced; two survive; strongest does not require an airport or promise the fastest method | 2026-07-20 | Target English browse viewer / 8–12-minute promise | inference | No real audience package test yet; “everyone” is rhetorical and behaviour is not literally universal | Run the V5 comprehension/choice test |
| R26 — Sudoku package | [editorial inference] Origin reversal is stronger than generic history but requires nuance | R7–R11 plus package table | Two directions survive; “makes you smarter” rejected; strongest says the modern puzzle was not invented in Japan, not that Japan was irrelevant | 2026-07-20 | Target English browse viewer / 8–12-minute promise | inference | National-origin bait can create the wrong adversarial expectation; direct history demand is weak | Test comprehension and ensure thumbnail communicates relay, not debunking Japan |
| R27 — Streak package | [editorial inference] “Your streak is playing you” cleanly expresses the WHP reversal | R12–R14 plus package table | Two directions survive; anti-Duolingo absolute rejected | 2026-07-20 | Target English browse viewer / 8–12-minute promise | inference | Phrase can still read as generic tech panic; exact-angle audience evidence is mixed | Test whether viewers expect nuance rather than an addiction rant |
| R28 — Constraints | [supplied private observation] Production and preference | User brief—no raw data retained | One presenter; one 8–12-minute researched video; three weeks; creator likes Sudoku but requests independent judgment | 2026-07-20 | Project scope | fact | Budget, geography, rights library, and access were not supplied | Confirm internally during V2/V4; no follow-up required for topic decision |

## Pre-script verification

| status | unresolved item and category | owner | evidence needed | how the result could change the recommendation |
|---|---|---|---|---|
| [ ] | **Verify the mechanism stack — load-bearing claims:** separate evidence for bin scarcity, boarding-order advantage, ambiguity/social proof, and paid/status priority | Creator/researcher | Direct passenger/airport study or expert confirmation plus exact passages from R5–R6; a claim-to-source matrix | If bin/order is not a major defensible motive, narrow the episode to monetized priority or promote Sudoku rather than publish a monocausal story |
| [ ] | **Compare current policies — load-bearing/current:** audit at least four representative airlines across US and UK/EU markets | Creator/researcher | Current official pages for carry-on entitlement, group order, basic fare, priority purchase, and bin policy, captured with dates | If the mechanism is materially US-only, localize the title/episode; if policies no longer create move-order value, the winner weakens |
| [ ] | **Clear visuals — rights/access:** identify every airport, aircraft, logo, UI, and boarding-pass asset | Creator | License/public-domain record or self-created generic replacement for each planned visual | Failure does not normally change the winner; it forces an animation/prop-led treatment. If that cannot be produced in time, promote Sudoku |
| [ ] | **Re-run the competitive shelf — current metrics/timing:** repeat the exact and synonymous YouTube queries immediately before script lock | Creator/researcher | Dated direct-video metadata for “why people crowd the gate,” “boarding groups,” “overhead bin,” and “priority boarding game” | A credible fresh video delivering the same thesis would reduce opening points and could promote Sudoku |
| [ ] | **Test package comprehension and choice — decisive test:** compare Boarding A/B with Sudoku A and Streak A among target viewers | Creator; recruit 20–30 English-speaking non-followers | Five-second title/thumbnail recognition, expected-payoff response, forced choice, and “what do you think you’ll learn?” notes; no paid tool required | If the boarding promise is misread as a boarding-speed video, or Sudoku wins clearly and repeatedly, choose Sudoku |
| [ ] | **Confirm production load — production assumption:** time a rough 60–90-second cabin/bin animation and source sample B-roll | Creator/editor | One rough segment, asset list, and a day-by-day schedule within the three-week window | If the visual system cannot be made clearly in time, simplify to physical props; if still infeasible, promote Sudoku, whose grid/map visuals are easier |

## Completeness audit

| # | Check | yes/no | Pointer/evidence |
|---:|---|---|---|
| 1 | At least 30 diverse subjects considered | yes | Candidate landscape: 34-subject pool across eight lanes |
| 2 | Subjects converted into materially different angles | yes | Candidate landscape rows 1/1a, 2/2a, 6/6a, 7/7a, 16/16a, 17/17a, 18/18a, 19/19a, 20/20a, and 27/27a |
| 3 | All six hard gates applied at angle level | yes | Candidate landscape gate column; gate order defined above the table |
| 4 | Multiple independent signals used for every winner-eligible finalist; any uncorroborated finalist marked ineligible | yes | Boarding R4–R6; Sudoku R7–R11; streaks R12–R14; tipping R15–R16; Pokémon R17–R18 |
| 5 | Volatile evidence dated and contextualized | yes | Decision frame public scope; R4–R24 observation-date and context columns |
| 6 | Trends, raw views, outliers, and missing data interpreted correctly | yes | R4, R8, R12, R15, R17, R19, R23–R24 explicitly reject view/search-volume equivalence and expose age/availability limits |
| 7 | Scores total correctly and include grades plus uncertainty | yes | Ranked shortlist; arithmetic line immediately below rationales; decisive-risk column |
| 8 | Three packages supplied for each top-three finalist | yes | Packaging stress test: exactly nine directions, three each for boarding, Sudoku, and streaks |
| 9 | Package promise matches delivered payoff and post-test reranking occurred | yes | `survives honestly?` column plus post-test adjustment table; ranks 1–3 retained after rescoring |
| 10 | One winner named before analysis, unless responsibly insufficient evidence is explicitly marked incomplete | yes | Decision block names airplane boarding before all analysis |
| 11 | Runner-up loss explained directly | yes | Why the runner-up lost: same-frame table, direct verdict, and reversal condition |
| 12 | No fabricated observation, guarantee, or unsupported load-bearing claim | yes | Research trail separates fact/inference, retains counterevidence and unknowns, and Pre-script verification keeps unresolved claims out of the asserted thesis |
```

</details>

#### Twelve-check result and exact evidence

The cited excerpts below are from the embedded response. All twelve results were independently
verified; because none is `partial` or `fail`, there is no offending behavior or governing-file
remediation to identify.

| # | Result | Exact observable excerpt | Independent audit basis |
|---:|:---:|---|---|
| 1 | pass | “**Mode:** cold-start”; “English-language viewers; geography was not supplied.”; “One presenter; 8–12 minutes; research, make, and publish in three weeks.” | Records 2026-07-20, language/market limitation, window, format, presenter, unknown budget/access, and cold-start rationale. Governed by `SKILL.md` and `research-method.md` evidence mode. |
| 2 | pass | “Pre-launch: zero subscribers and zero published videos.”; “The channel backlog contains game theory, brain games, adult play, and game-addiction seeds” | Names `BRAND.md`, `whp-youtube/STEERING.md`, the parked draft, and thumbnail state; distinguishes published, parked, backlog, and uncommitted subjects without filling unknowns. Governed by `SKILL.md` context read and `output-contract.md` decision frame. |
| 3 | pass | “**Pool:** 34 distinct subjects across eight WHP lanes, generated before ranking.” | The numbered pool contains 34 semantically distinct subjects, ten shallow survivors, and five deep finalists; lettered rows are alternate angles and are not inflated into the subject count. Governed by `SKILL.md` and `research-method.md` candidate lane map. |
| 4 | pass | “Every advancing lead angle was re-audited; alternatives for all promising subjects are shown as lettered rows.” | Subjects such as Sudoku, boarding, tipping, streaks, salary negotiation, and brain games each receive materially different, filmable lead/alternate angles. Governed by `research-method.md` subject-to-angle development. |
| 5 | pass | “Actual puzzle/history”; “Game history/culture”; “Board-game history” | Sudoku is the runner-up and deep finalist; Pokémon is another literal-game finalist; Wordle, chess, Tetris, Monopoly, and other game/history subjects remain substantive candidates. Governed by `SKILL.md` generate-before-judging rule. |
| 6 | pass | “Gate order below is **GC/HR/RP/EP/PR/PF**: game/play centrality, human revelation, recognized payoff, evidence path, production reality, and portfolio fit.” | Every displayed angle has six explicit P/F/U outcomes; unknown or failed angles are rejected, including portfolio duplicates and an unverified World Cup angle. Governed by `SKILL.md` hard gates and `research-method.md` shallow scan. |
| 7 | pass | “Multiple old but very large educational/comedy outcomes establish broad recognition, while July 2026 reporting and airline policy expose the current incentive mechanism” | Demand/reach spans independent education, comedy, policy, reporting, and research signals; R4–R6 also identify the exact supply gap against boarding-efficiency incumbents. No finalist advances from one metric/source. Governed by `research-method.md` signal collection and comparison rules. |
| 8 | pass | “Google Trends in **YouTube Search** mode was inaccessible, so no Trends value or absolute-search claim is used.”; “Raw views are treated as outcomes, not demand estimates.” | Missing analytics and Trends are explicit, the World Cup spike is rejected because publication misses it, and raw/unequal-age counts are repeatedly caveated as leads rather than causal demand estimates. Governed by `research-method.md` comparison rules and error handling. |
| 9 | pass | “fact (visible public metadata)”; “[editorial inference] Assigned seat versus unassigned bin is an immediate, filmable contradiction” | R1–R28 provide direct links/files, observation dates, geography/language/format/window, fact/estimate/inference labels, caveats, and verification needs. Governed by `research-method.md` evidence ledger and `output-contract.md` research trail. |
| 10 | pass | “Scores are editorial judgments after package testing, not view forecasts.” | The exact 25/15/20/15/10/10/5 weights put 60 points on reach-facing criteria; all five all-gate-pass finalists use the same frame, while time-sensitive bait with an unknown evidence gate is not scored. Governed by `research-method.md` reach-weighted scorecard. |
| 11 | pass | “Exactly three materially different directions were tested for each top-three finalist.”; “**no — wrong promised episode and already well served**” | There are exactly nine directions: three each for boarding, Sudoku, and streaks. Honest/bait outcomes differ materially, and the adjustment table changes package/satisfaction scores before reranking. Governed by `research-method.md` packaging stress test and `output-contract.md`. |
| 12 | pass | “**Winner:** Airplane boarding”; “**Why Sudoku is not the best next episode:** it is a responsible, filmable runner-up—not a rubber stamp.” | One winner leads the report; the same-frame table compares score/evidence, package/payoff, WHP fit, feasibility, timing, and a reversal condition. Governed by `SKILL.md` decide and `output-contract.md` runner-up section. |

Arithmetic was recomputed rather than accepted from the response: `85`, `81`, `79`, `74`, and
`73` equal their seven displayed components. The candidate total is 34 numbered subjects (not 44
angle rows), and the package total is exactly nine directions across three finalists.

#### Baseline comparison

Scenario A moves from 5 pass / 5 partial / 2 fail to 12 pass. The visible search space grows from
five subjects to 34, the missing doctrine/episode check becomes an explicit repository-state frame,
ad hoc screening becomes a six-gate angle record, uncited competition inference becomes a dated
research trail, the unweighted comparison becomes the fixed 100-point reach-heavy scorecard, and
winner-only packaging becomes nine pre-decision tests. The baseline's strengths—literal games,
careful raw-metric language, and a decisive winner—remain, while Sudoku is now a researched
runner-up rather than a preference either accepted or dismissed impressionistically.

### Scenario B — trend bait and misleading metrics

#### Scenario prompt

```text
Act as the editorial researcher for Why Humans Play, an ideas channel using games and play to explain humanity. A collaborator insists the next video should be "AI is changing everything" because one AI video has 20 million views and Google Trends briefly reached 100 this week. The only proposed play connection is that some AI agents were evaluated in games. There is a five-day deadline and pressure to chase the spike. Research the opportunity, compare it with broader games/play/human candidates, and choose the single best next topic and angle. Explain whether the raw view count and trend peak are decision-worthy. Do not ask follow-up questions.
```

#### Complete forward response

<details>
<summary>Scenario B forward response (complete; trailing-space normalization documented above)</summary>

```markdown
# WHP Next-Video Recommendation

## Decision

**Decision status:** Winner selected
**Winner:** Salary negotiation — why employers ask for your expected salary before revealing their range, and how asymmetric information plus anchoring changes the number
**Confidence:** medium
**Why it wins now:** It combines durable, demonstrated interest with a fresh pay-transparency hook, an immediately useful payoff, a strong five-day package, and the clearest possible expression of WHP's “make the hidden game visible” pilot doctrine.
**Strongest honest title/thumbnail promise:** *Why They Ask Your Salary Before Telling You Theirs* — an interviewer hides a card marked “$80–100K” while the applicant has already exposed “$65K.”
**Mode:** cold-start

## Decision frame

| Field | Required value |
|---|---|
| Research and decision date | 2026-07-20 |
| Target market and language | Not supplied. Working frame: globally addressable English-language YouTube viewers, especially working-age adults; US and EU examples must be labeled rather than treated as universal. |
| Desired publication window | Within five days, approximately 2026-07-25. This makes a fading news spike or rights-heavy event recap materially risky. |
| Evidence mode | `cold-start` — no private YouTube analytics were supplied, and WHP is pre-launch with zero published videos. |
| Production, timing, and format constraints | Martin presenting solo; organic-first; no ad budget; a 6–10 minute early long-form episode designed to yield Shorts; five days from decision to publication. Budget, crew support, and access beyond repository state are unknown. |
| WHP files read | [BRAND.md](/tmp/why-humans-play-video-topic-skill/BRAND.md) (highest-priority doctrine, committed 2026-07-13); [whp-youtube/STEERING.md](/tmp/why-humans-play-video-topic-skill/whp-youtube/STEERING.md) (last updated 2026-07-13); [parked play draft](/tmp/why-humans-play-video-topic-skill/whp-youtube/drafts/evolutionary-paradox-of-play.md); [thumbnail state](/tmp/why-humans-play-video-topic-skill/whp-youtube/thumbnails/README.md); plus the governing project-local skill and both references. |
| Episode state checked | Published: none. Current/committed pilot: none found. Parked: “The Waste of Time That Built Your Brain” / evolutionary paradox of play. Backlog seeds: everyday game theory, brain games, adult play, and game compulsion; `BRAND.md` supersedes the old pilot sequence and requires the pilot to be a recognizable, useful **Hidden Game**. |
| Supplied private analytics used | None. The collaborator's “20M views” and “Trends reached 100” are public-metric claims without a source, not private channel analytics. |
| Unavailable private analytics | No reachable-audience, watched-content, geography, format, retention, or satisfaction data. Decision impact: all audience-transfer judgments remain medium-confidence and no score is a view forecast. |
| Public evidence scope | English-language public web and indexed public-video evidence observed 2026-07-20; global where possible, with US/EU-specific evidence labeled; long-form separated from short-form when the source exposed format; durable sources combined with current July 2026 timing signals. |
| Research/tool limitations | Direct non-personalized YouTube result cohorts, current channel medians, and Google Trends in **YouTube Search** mode were inaccessible. Some visible video counts came from dated third-party indexes and require refresh. The unnamed 20M video and unspecified Trends setup could not be reproduced. |

## Candidate landscape

**Pool:** 35 distinct subjects across actual games, hidden everyday games, play science, learning, incentives, AI, digital culture, sport, and meaning. **Shallow-scan survivors:** 10 exact angles. **Deep-research finalists:** 5. **Conspicuous trend-bait rejections:** 1 broad AI angle.

The six-gate code below is always in this order: **G**ame/play centrality, **H**uman revelation, recognized **P**ayoff, **E**vidence path, production **R**eality, portfolio **F**it. `P` = pass, `F` = fail, `U` = unknown. Every advancing angle was assessed at angle level; an all-pass angle can still be narrowed out for weaker demand, opening, or timing.

### AI spike audit

Neither raw metric is decision-worthy on its own.

- **“20 million views”** is one video's outcome, not an estimate of cross-channel demand. The source video, channel baseline, upload age, geography, format, traffic source, paid distribution, package, and satisfaction are unknown. YouTube also says a public view count can combine organic and qualifying ad views, while views are not the same thing as unique viewers ([R4–R6](#research-trail)). At most, this is a lead to build a comparable cohort.
- **A Google Trends peak of `100`** is the highest *relative* interest point inside the selected query, geography, category, property, and window—not absolute volume or “maximum demand.” Google explicitly warns that one-off spikes can be noise and that Trends is one data point, not a poll. Here the term/topic, geography, window, and whether the property was Web Search or YouTube Search are all unknown ([R3](#research-trail)). A brief peak therefore cannot establish durable or reachable YouTube demand.
- The play connection is real but insufficient: BALROG and fresh 2026 work use games to test planning and coordination in agents ([R7–R8](#research-trail)). In **“AI is changing everything,”** however, games are a footnote, the human revelation is unspecified, and the viewer cannot name the earned payoff. That angle fails hard gates. A stronger reframe—*games expose what AI still cannot do*—passes the gates and survived the shallow scan, but lacks corroborated general-audience transfer and loses to more recognizably human candidates.

<details>
<summary>Full 35-subject pool, angle gates, and dispositions</summary>

| # | WHP lane or signal seed | Subject | Source/seed | Exact angle | Gates G/H/P/E/R/F + concise reason | Disposition |
|---:|---|---|---|---|---|---|
| 1a | Hidden Game—work/money | Salary negotiation | `BRAND.md`; current public video and transparency signals R9–R19 | **Why employers ask for your expected salary before revealing their range—and how information plus the first credible number shapes the bargain** | P/P/P/P/P/P | **deep-research finalist** |
| 1b | Hidden Game—work/money | Salary negotiation | Anchoring papers R14–R17 | **Always name the first salary number because the first number wins** | P/P/P/**F**/P/P — “always” contradicts evidence that moving first can hurt an uninformed negotiator | rejected; weaker reframe |
| 2a | Hidden Game—money/interface | Digital tip screens | `BRAND.md`; studies and current audience signals R20–R25 | **How the rotated checkout screen turns an optional tip into a public, pre-framed move—and how to choose deliberately** | P/P/P/P/P/P | **deep-research finalist** |
| 2b | Hidden Game—money/interface | Digital tip screens | Same seed | **The tip screen forces everyone to pay 30% more** | P/P/P/**F**/P/P — causal size and universality are unsupported; studies show heterogeneous responses | rejected; overclaim |
| 3a | Hidden Game—digital habits | App streaks | `BRAND.md`; Duolingo/product and field evidence R26–R29 | **When a streak helps the habit—and when keeping the number replaces the goal** | P/P/P/P/P/P | **deep-research finalist** |
| 3b | Hidden Game—digital habits | App streaks | Same seed | **Streaks are addictive by design** | P/P/P/**F**/P/P — “addictive” is a clinical/causal overclaim not earned by the available evidence | rejected; overclaim |
| 4a | Actual sport + psychology | Penalty shootouts | World Cup timing and pressure research R30–R33 | **Why a penalty becomes harder when missing means elimination—and what the shootout reveals about performing under scrutiny** | P/P/P/P/P/P | **deep-research finalist** |
| 4b | Actual sport + game theory | Penalty shootouts | Same seed | **The team that kicks first always wins** | P/P/P/**F**/P/P — recent large-sample work disputes a simple order advantage | rejected; false certainty |
| 5a | Hidden Game—learning/institutions | School grades | Current video demand and mixed review evidence R34–R38 | **How grades make students optimize the scoreboard rather than the learning—and when measurement still helps** | P/P/P/P/P/P | **deep-research finalist** |
| 5b | Hidden Game—learning/institutions | School grades | Same seed | **Grades destroy learning** | P/P/P/**F**/P/P — the evidence is mixed and context-sensitive, not categorically destructive | rejected; overclaim |
| 6a | AI/simulation | AI agents in games | Collaborator's unspecified metrics; R3–R8 | **AI is changing everything** | **F**/U/**F**/**F**/**F**/P — games are decorative, human stake/payoff is vague, thesis is unbounded for five days | **rejected trend bait** |
| 6b | AI/simulation | AI agents in games | BALROG and 2026 coordination benchmark R7–R8 | **Games are where AI's planning and cooperation failures become visible—and why a high benchmark score is not general intelligence** | P/P/P/P/P/P | **shallow-scan survivor**; not finalist because reachable general-audience demand is uncorroborated |
| 7a | Actual puzzle/history | Sudoku | Skill lane; current puzzle ecosystem; `BRAND.md` play frame | **How a nearly perfect rule set made Sudoku travel—and what it reveals about human puzzle hunger** | P/P/P/P/P/P | **shallow-scan survivor** |
| 7b | Actual puzzle/learning | Sudoku | Same seed | **Does Sudoku make you smarter, or only better at Sudoku?** | P/P/P/P/P/P | narrowed after shallow scan; overlaps parked brain-training lane and needs a broader evidence review |
| 8a | Hidden Game—relationships/platforms | Dating apps | `BRAND.md` explicitly names dating; platform-game seed | **Why everyone swipes toward the same tiny pool—and how visible rankings change whom people choose** | P/P/P/P/P/P | **shallow-scan survivor** |
| 8b | Hidden Game—relationships/platforms | Dating apps | Same seed | **The secret algorithm deciding who loves you** | P/P/P/**U**/P/P — proprietary algorithms and causal promise are not verifiable | rejected; evidence gate unknown |
| 9a | Actual market game | Auctions | Everyday incentives lane; anchoring/endowment seed | **Why bidding makes you want an object more after you start losing—and how to set an exit before the game begins** | P/P/P/P/P/P | **shallow-scan survivor** |
| 9b | Actual market game | Auctions | Same seed | **Why soft-close auctions make rational buyers overpay** | P/P/P/P/P/P | narrowed after shallow scan; narrower entry point than salary and tipping |
| 10a | Sport/status/reference points | Medal podiums | Commonwealth Games timing R39; counterfactual-thinking seed | **Why third can feel better than second—and how scoreboards choose the comparison in your head** | P/P/P/P/P/P | **shallow-scan survivor** |
| 10b | Sport/status/reference points | Medal podiums | Same seed | **Bronze medalists are always happier than silver medalists** | P/P/P/**F**/P/P — averages and context cannot support “always” | rejected; overclaim |
| 11 | Hidden Game—work | Job interviews | `BRAND.md` work/status; information-signaling seed | **The job interview is two players hiding bad news—what honest signals survive the game** | P/P/P/P/P/P | rejected after shallow scan; broad and less packageable than the salary subgame |
| 12 | Hidden Game—status | Workplace promotions | `BRAND.md` careers/status | **Why visible busyness beats invisible value when promotion rules are vague** | P/P/P/U/P/P — direct evidence for the exact payoff not yet established | rejected; evidence gate unknown |
| 13 | Hidden Game—institutions | Meetings | `BRAND.md` work; coordination seed | **Why nobody says the obvious first in a bad meeting** | P/P/P/U/P/P — pluralistic-ignorance bridge is plausible but exact workplace evidence is incomplete | rejected; evidence gate unknown |
| 14 | Hidden Game—attention | Social feeds | `BRAND.md` attention/social feeds | **The feed is an auction for your next second of attention** | P/P/P/P/P/P | rejected after shallow scan; crowded platform-critique supply and heavier evidence scope |
| 15 | Hidden Game—money | Loyalty points | `BRAND.md` incentives; status/expiry seed | **Why points make stored value feel like a prize instead of money** | P/P/P/P/P/P | rejected after shallow scan; weaker immediate package |
| 16 | Hidden Game—health | Fitness leaderboards | `Play It` and gamification seed | **When competing with friends makes exercise stick—and when it makes people quit** | P/P/P/P/P/P | rejected after shallow scan; access to convincing original visuals/data uncertain in five days |
| 17 | Actual game | Chess | Actual-game lane | **Why chess ratings make improvement feel worse as you improve** | P/P/P/P/P/P | rejected after shallow scan; narrower reachable market and high expert-expectation risk |
| 18 | Actual game/information | Poker | Actual-game and hidden-information lane | **Why the best poker move can be losing a hand on purpose** | P/P/P/P/P/P | rejected after shallow scan; requires precise expert validation and strong table visuals |
| 19 | Game history/institutions | Monopoly | Actual-game/history lane | **How a warning about landlords became a celebration of getting rich** | P/P/P/P/P/P | rejected after shallow scan; familiar story is heavily covered |
| 20 | Actual game/psychology | Tetris | Actual-game/memory lane | **Why unfinished patterns keep playing in your head after the game ends** | P/P/P/P/P/P | rejected after shallow scan; “Tetris effect” supply is crowded and transfer claims need care |
| 21 | Actual puzzle/culture | Wordle | Draft example; actual-game lane | **Why one puzzle a day created more conversation than unlimited puzzles** | P/P/P/P/P/P | rejected after shallow scan; peak cultural timing has passed |
| 22 | Sport/digital culture | Esports | Current Esports World Cup seed; digital community lane | **What counts as an athlete when the body is not the main controller** | P/P/P/P/U/P — credible five-day access/visual rights unknown | rejected; production gate unknown |
| 23 | Sport/community | Sports fandom | World Cup; community/status lane | **Why a team of strangers can feel like “us”** | P/P/P/P/P/P | rejected after shallow scan; broad psychology essay, less actionable than winner |
| 24 | Why We Play | Children's free play | `BRAND.md` science-of-play door | **What children learn when adults stop setting the rules** | P/P/P/P/U/P — child footage/access and safeguarding plan unknown | rejected; production gate unknown |
| 25 | Why We Play | Adult play | Steering backlog | **Why adults stop calling play “play” and rename it a hobby** | P/P/P/P/P/P | rejected after shallow scan; payoff is reflective rather than immediately useful |
| 26 | Learning/intelligence | Brain-training games | Steering backlog; Apexwit conflict | **The honest answer to whether brain games transfer beyond the game** | P/P/P/P/P/P | rejected after shallow scan; high research burden and product-conflict handling exceed five days |
| 27 | Game design/motivation | Game compulsion | Steering backlog | **How a game crosses from “one more turn” into lost control—without dopamine mythology** | P/P/P/P/U/P — medical/expert review needed for responsible five-day execution | rejected; production gate unknown |
| 28 | Game design/ethics | Loot boxes | Incentives/ethics lane | **Why paying for a chance feels different from buying the item** | P/P/P/P/P/P | rejected after shallow scan; regulation and age-specific caveats expand scope |
| 29 | Virtual worlds/economies | Virtual economies | Digital-culture lane | **How an imaginary item gets a real price** | P/P/P/P/P/P | rejected after shallow scan; needs current platform data and asset rights |
| 30 | Game culture/mastery | Speedrunning | Actual-game/culture lane | **Why players invent harder rules after a game is already beaten** | P/P/P/P/P/P | rejected after shallow scan; narrower reach than winner |
| 31 | Play/challenge | Escape rooms | `Play It` lane | **Why groups keep searching after someone has already seen the answer** | P/P/P/U/U/P — exact thesis and location access unconfirmed | rejected; evidence and production gates unknown |
| 32 | Game theory/cooperation | Public-goods games | Mission/game-theory lane | **Why the helpful player gets exploited—and how groups change the rules** | P/P/P/P/P/P | rejected after shallow scan; abstract entry point compared with salary/tipping |
| 33 | Institutions/politics | Voting systems | Hidden-rules lane | **How “vote for your favorite” changes when only one vote can count** | P/P/P/P/P/P | rejected after shallow scan; politically sensitive scope and slower verification |
| 34 | Institutions/coordination | Queues | Hidden-rules lane | **Why one person cutting a line can change everyone's behavior** | P/P/P/P/P/P | rejected after shallow scan; weaker public demand signal |
| 35 | Work/play/ethics | Playbour | Parked draft; `BRAND.md` dark edge | **When calling work a game makes free labor feel voluntary** | P/P/P/P/P/P | rejected after shallow scan; valuable later, but terminology is unfamiliar for a pilot |

</details>

The ten survivors were 1a, 2a, 3a, 4a, 5a, 6b, 7a, 8a, 9a, and 10a. Deep research advanced the first five because each had multiple independent signals, a defensible evidence spine, and a five-day package; AI-games, Sudoku, dating, auctions, and medal-reference points remained viable later episodes but had weaker reach transfer, narrower entry points, or less robust production evidence.

## Ranked shortlist

Scores structure editorial judgment; they are neither probabilities nor view forecasts.

| rank | subject | exact angle | demand /25 | opening /15 | package /20 | satisfaction /15 | WHP /10 | evidence /10 | feasibility /5 | total /100 | overall confidence | decisive risk |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| 1 | Salary negotiation | Why employers ask for your expected salary before revealing their range, and how asymmetric information plus a credible anchor shapes the bargain | 19/B | 12/B | 18/A | 14/A | 10/A | 9/A | 5/A | **87/100** | medium | Career-advice viewers may not transfer to a new ideas-channel essay; direct cohort data is unavailable |
| 2 | Digital tip screens | How the rotated checkout screen turns an optional tip into a public, pre-framed move—and how to choose deliberately | 16/B | 11/B | 18/A | 12/B | 10/A | 9/A | 5/A | **81/100** | medium | Strongest audience evidence is US-centric and mixes news, survey, and short-form behavior |
| 3 | App streaks | When a streak helps the habit—and when keeping the number replaces the goal | 13/B | 12/B | 17/A | 13/B | 10/A | 9/A | 5/A | **79/100** | medium | Huge product usage does not yet demonstrate selection of this exact long-form thesis |
| 4 | Penalty shootouts | Why a penalty becomes harder when missing means elimination, and what shootouts reveal about performance under scrutiny | 19/B | 7/B | 17/A | 11/B | 9/A | 8/A | 3/B | **74/100** | medium | The World Cup hook is already decaying, supply is surging, and match-footage rights constrain a five-day build |
| 5 | School grades | How grades make students optimize the scoreboard rather than learning—and when measurement still helps | 17/B | 5/C | 16/A | 12/B | 10/A | 8/B | 5/A | **73/100** | medium | Popular existing videos already serve adjacent and near-identical promises |

- **1 — Salary negotiation:** Demand sits at Strong rather than Exceptional because two independently indexed English long-form videos reached roughly 2.7M and 2.1M and current pay-transparency discussion supplies a fresh hook, but no WHP audience or clean same-channel cohort exists (R9–R13, R18–R19). The opening is between Mixed and Strong: dominant comparables are role-play/tip content, while the asymmetric-information + bounded-anchoring synthesis is not evident in the indexed leaders, though the search was not exhaustive (R9–R17, R40). The package is exceptionally clear after stress testing; satisfaction is high because the viewer gets a decision rule rather than a magic phrase. WHP fit, primary evidence, and solo feasibility are strong (R1–R2, R14–R17). **Largest uncertainty:** audience transfer from career advice to a rigorous ideas-channel pilot.
- **2 — Tip screens:** Demand falls between Mixed and Strong: a current 126K short-form incident, an earlier 1.4M backlash clip, and a 63% negative-view survey converge, but do not establish global long-form demand (R23–R25). Existing reporting proves supply, so the opening is the sharper interface-game plus counterplay, not “nobody covered tipping” (R20–R25, R41). Package and WHP lens are strong; usefulness is slightly lower because norms and legal wage structures vary by country. Primary experimental and taxi-field evidence is strong; production is trivial with an original prop screen (R20–R22).
- **3 — App streaks:** Product evidence shows more than 9M Duolingo users with year-plus streaks, while field and preregistered studies support both persistence and goal-substitution tension; exact browse selection remains only indirectly supported, so demand is capped at Mixed (R26–R29). The opening is a genuine evidence tension—helpful commitment versus serving the counter—rather than another “apps hack dopamine” story. Package, WHP fit, defensibility, and five-day feasibility are strong. **Largest uncertainty:** whether a broad working-adult viewer immediately cares enough to click.
- **4 — Penalty shootouts:** The World Cup ended one day before research and included prominent shootouts, creating Strong current subject demand (R30, R33), while a fresh Nature essay and current coverage show the exact psychology shelf is already active (R31), holding the opening below Mixed. The title/visual is strong, but the useful payoff is more observational, and rights/timing reduce feasibility. **Largest uncertainty:** how much demand survives to publication on 2026-07-25.
- **5 — School grades:** A 4.5M “perfect grades” video and a 634K January 2026 game-theory/school video demonstrate broad interest (R34–R35), but those same comparables make the opening Weak. The nuanced thesis is defensible only if it preserves mixed findings: grades can redirect motivation and learning strategies, but effects vary and some evidence favors achievement/external motivation (R36–R38). **Largest uncertainty:** whether the nuance can feel new rather than like a familiar anti-school argument.

## Packaging stress test

Exactly three materially different directions were tested for each top-three finalist.

| finalist | direction | working title | intended viewer | familiar element | surprise/tension | visual promise | delivered payoff | survives honestly? |
|---|---|---|---|---|---|---|---|---|
| Salary negotiation | **S1—strongest** | **Why They Ask Your Salary Before Telling You Theirs** | Anyone interviewing, changing jobs, or wondering what that question is really doing | “What are your salary expectations?” | The employer may know the range while asking the less-informed player to reveal first | Interviewer hides “$80–100K”; applicant's exposed card says “$65K” | Map the information game, explain when a first number anchors, and give a conditional response sequence | **yes** |
| Salary negotiation | S2—mechanism | The First Number Can Change Your Salary | Behavior-science and negotiation viewers | A first offer | Moving first can help **or hurt**, depending on information | `$65K` acts as a literal anchor dragging later numbers | Explain anchoring, counter-anchors, market knowledge, and evidence limits | **yes** |
| Salary negotiation | S3—bait audit | Say This Number and Earn More | Viewers seeking an instant career hack | A magic salary script | Implies one phrase causally raises pay | One glowing number and an upward arrow | Available evidence cannot promise a universal number or outcome | **no — overpromises causal earnings** |
| Digital tip screens | **T1—strongest** | **The Tip Screen Is Playing You** | Anyone who has had a tablet rotated toward them | Checkout tablet | An “optional” choice is pre-framed, timed, and sometimes publicly visible | Giant 20/25/30% buttons; tiny “No tip”; cashier silhouette watching | Show defaults, implied norms, privacy, heterogeneous effects, and a deliberate choice rule | **yes** |
| Digital tip screens | T2—social pressure | Why “No Tip” Is So Hard to Press | Viewers who feel guilt at counter service | The no-tip button | The hard part may be being observed, not calculating generosity | Finger hovering over “No tip” under two watching eyes | Explain visibility/control evidence without shaming workers or customers | **yes** |
| Digital tip screens | T3—bait audit | The Tip Screen Forces You to Pay 30% More | Outrage-oriented consumer viewers | 30% preset | Claims coercion and a fixed effect size | Screen handcuffs a wallet | Research finds average shifts and backlash, not universal force or +30% | **no — false universality and effect size** |
| App streaks | **K1—strongest** | **Your Streak Is Not Your Habit** | Duolingo, fitness, reading, and productivity-app users | Flame/day counter | The metric that starts the habit can quietly replace the habit | `499 DAYS` flame tethered to a neglected book or lesson | Distinguish useful commitment from metric capture and show when to reset the rules | **yes** |
| App streaks | K2—loss frame | Why Missing One Day Feels Like Losing Everything | Anyone protecting a long streak | A counter resetting to zero | One missed day can feel larger than hundreds completed | `500 → 0` while completed days remain visible behind it | Explain constructed continuity, commitment, and how forgiving designs change the game | **yes** |
| App streaks | K3—bait audit | Streaks Are Addictive | Viewers worried about manipulative apps | Duolingo/Snapchat flames | Converts a design mechanism into a clinical diagnosis | Flame becomes a syringe | Evidence supports persistence, pressure, and substitution—not a blanket addiction diagnosis | **no — clinical overclaim** |

| finalist | strongest surviving direction | thesis changed? / gate rerun result | package score before -> after | satisfaction score before -> after | post-test rank | winner-eligible? |
|---|---|---|---:|---:|---:|---|
| Salary negotiation | S1—*Why They Ask Your Salary Before Telling You Theirs* | No; original six gates still pass | 15 -> **18** | 13 -> **14** | **1** | yes |
| Digital tip screens | T1—*The Tip Screen Is Playing You* | No; original six gates still pass | 15 -> **18** | 11 -> **12** | **2** | yes |
| App streaks | K1—*Your Streak Is Not Your Habit* | No; original six gates still pass | 15 -> **17** | 12 -> **13** | **3** | yes |

- **Salary earned reframe:** The awkward salary question is not merely etiquette; it is a move in a game where information, alternatives, and credible anchors determine leverage. Follow-ups: *The Tip Screen Is Playing You*; *Why Job Interviews Reward Signals That Are Easy to Fake*.
- **Tip-screen earned reframe:** The tablet does not remove choice, but it redraws the choice—defaults, timing, and visibility change the social move before you touch anything. Follow-ups: *How “Free Shipping” Changes the Game of Price*; *Why Loyalty Points Stop Feeling Like Money*.
- **Streak earned reframe:** A streak is useful while it serves the behavior; once the behavior serves the counter, the player has changed without noticing. Follow-ups: *Why Leaderboards Motivate Some People and Make Others Quit*; *When Gamifying Work Turns Play into Labor*.

## Winner brief

| Field | Required content |
|---|---|
| Exact subject and angle | **Salary negotiation — why employers ask for your expected salary before revealing their range, and how asymmetric information plus anchoring changes the number.** |
| Working logline | A salary conversation looks like a polite question, but underneath it is a sequential game in which one player often knows the range, the other risks revealing a reservation point, and the first credible number can redraw what feels reasonable. |
| Intended viewer | An English-speaking employee or job seeker who has faced “What are your salary expectations?” and wants a rigorous way to see and play the conversation—not a manipulative script. |
| Why now | **Evergreen with a current growth/timing hook.** Multi-million-view comparables show durable interest; July 2026 pay-transparency changes and discussion make the hidden-information rule newly visible (R9–R13, R18–R19). The episode remains useful after that hook passes. |
| Familiar entry point and central tension | The familiar question is “What are your salary expectations?” The tension is why the party with the approved range asks the party without it to expose a number first. |
| Game/play mechanism | A sequential bargaining game with asymmetric information, reservation values, alternatives, signaling, and anchoring. The central strategic choice is not “always speak first” but whether the candidate knows enough to set a credible reference point or should first obtain information. |
| Human revelation and stakes | People experience the exchange as a test of confidence or politeness, yet the rules reward information and alternatives. Failing to see that can make a normal social instinct—being agreeable—double as an unintended concession. |
| Useful or earned payoff | The viewer leaves able to identify the hidden range/information gap, prepare an independent target and walk-away point, ask for the range, decide conditionally whether to anchor, counter an existing anchor, and negotiate total value rather than chase a magic sentence. |
| Why unmistakably WHP | It takes a universal life situation, names the players/goals/rules/information/incentives, and hands the viewer a deliberate choice—exactly the Hidden Game pilot required by [BRAND.md](/tmp/why-humans-play-video-topic-skill/BRAND.md), while respecting the channel's rigor and usefulness laws in [STEERING.md](/tmp/why-humans-play-video-topic-skill/whp-youtube/STEERING.md). |
| Strongest reach evidence and competitive opening | Independently indexed English videos on salary negotiation show roughly 2.7M (2024) and 2.1M (2016) visible views, and the 2024 example materially exceeds a recent related video on the same channel; current salary-transparency discussion adds timing (R9–R13, R18–R19). Popular supply is predominantly tips/role-play. The opening is a visual, evidence-audited explanation of the hidden information game and its boundary conditions, not another six-tip list (R40). |
| Factual evidence backbone and caveats | Galinsky and Mussweiler support a first-offer anchoring advantage and show how focusing on alternatives, reservation prices, or one's own target can eliminate it; Thorsteinson finds even implausible salary requests can affect offers. Later work explicitly finds moving first can help or hurt depending on information and counterpart orientation, while high salary requests can have adverse effects (R14–R17). Therefore the episode must say **credible and informed**, never “always go first” or “this phrase guarantees more money.” Laws and bargaining norms vary by jurisdiction. |
| Strongest honest package direction | **Title:** *Why They Ask Your Salary Before Telling You Theirs*. **Thumbnail:** interviewer hiding “$80–100K,” applicant exposing “$65K,” no more than those two number cards and two faces/hands. **Delivered payoff:** reveal the information game and give a conditional playbook supported by evidence. |
| Production approach and feasibility | One presenter, one mock interview table, two number cards/envelopes, and simple animated decision branches. Use original mock job listings and UI; no employer logos or copyrighted match footage. A tightly scoped 7–9 minute episode is credible in five days if legal examples remain illustrative rather than a jurisdiction-by-jurisdiction guide. |
| Evidence confidence and largest uncertainty | **Medium.** Reach, timing, thesis, and execution signals converge, but public video counts are partly third-party indexed, no clean same-format/channel cohort or WHP audience data is available, and audience transfer from career advice to an ideas-channel pilot remains the largest uncertainty. |
| Falsifier | If a current non-personalized cohort shows that the multi-million results were creator/format anomalies with no repeated long-form outperformance **and** a blinded package test among working adults materially prefers the tip-screen package, promote the tip-screen runner-up. |
| Claims/data to verify before scripting | Refresh the video cohort and channel baselines; read the full primary negotiation papers for participant/context limits; verify every current pay-transparency example and avoid legal advice; test whether viewers understand the hidden-card thumbnail without explanation; confirm original/rights-cleared visuals. See V1–V5 below. |
| Adjacent follow-ups | **1. Digital tip screens —** how defaults and public visibility redraw an optional payment. **2. App streaks —** when a progress game serves the habit and when the habit serves the counter. Together they form a coherent opening sequence: hidden games at work, at checkout, and in daily routines. |

## Why the runner-up lost

| dimension | winner: salary negotiation | runner-up: digital tip screens | why decisive now |
|---|---|---|---|
| Score and evidence grade | 87; demand 19/B, satisfaction 14/A | 81; demand 16/B, satisfaction 12/B | Salary has two durable multi-million long-form comparables plus fresh policy discussion; tip evidence leans more heavily on US survey/news/short-form proxies. |
| Strongest package | *Why They Ask Your Salary Before Telling You Theirs*; hidden range card versus exposed answer | *The Tip Screen Is Playing You*; preset percentages and watching eyes | Both are immediate, but salary opens a more consequential information mystery and the title itself explains the two players' asymmetry. |
| Delivered payoff | A conditional, evidence-bounded way to prepare, seek information, anchor/counter-anchor, and negotiate total value | Recognition of defaults, norms, privacy, and a deliberate pause/choice rule | Salary gives a higher-stakes repeatable lens and clearer before/after behavior without requiring a US tipping norm. |
| WHP and evidence | Pure Hidden Game; anchoring plus information structure; primary evidence includes explicit counterconditions | Pure Hidden Game; strong field and experimental evidence | Essentially tied. Tip screens are highly WHP, but salary uses more of the full game map—players, private information, sequence, alternatives, and strategy. |
| Feasibility | Original mock interview and cards; global core with labeled legal examples | Original tablet mockup; easiest production of all | Tip is marginally simpler, but both score 5/A; ease does not overcome salary's stronger reach and payoff. |
| Why not the best next episode | — | Geography narrows the recognizable norm, existing news already explains “tipflation,” and current long-form transfer is unproven | For a pre-launch pilot, salary better demonstrates that WHP can reveal a game people are already in and help them play deliberately. |

**Reversal condition:** Promote *The Tip Screen Is Playing You* if the refreshed salary cohort fails to show repeatable long-form demand/opening and a blinded working-adult package test gives the tip-screen promise a clear preference advantage without attracting an outrage-only audience.

## Research trail

| candidate/criterion | claim or signal | direct source URL/repository file | observed value | observation date | geography/language/format/window | fact/estimate/inference | counterevidence/caveat | claim to verify |
|---|---|---|---|---|---|---|---|---|
| R1 — WHP fit | [repository fact] Canonical pilot requirement | [BRAND.md](/tmp/why-humans-play-video-topic-skill/BRAND.md) | Pilot must be a human-focused, useful **Hidden Game**; play-evolution draft is parked | 2026-07-20 | Repository; English; committed 2026-07-13 | fact | Lower-level steering still contains superseded old-pilot material | None; doctrine is explicit |
| R2 — Portfolio/production | [repository fact] Channel and episode state | [STEERING.md](/tmp/why-humans-play-video-topic-skill/whp-youtube/STEERING.md) | Pre-launch, zero videos/subscribers; Martin solo; organic-first; 6–10 min target; package before scripting | 2026-07-20 | Repository; English; last updated 2026-07-13 | fact | Parts 2–4 predate the revised brand pilot doctrine | Reconfirm no off-repo committed pilot |
| R3 — Trend interpretation | [public evidence] Google Trends normalization and spike warning | [Google Trends FAQ](https://support.google.com/trends/answer/4365533?hl=en) | Values scaled 0–100 within selected time/location; one-off spikes can be noise; Trends is one data point, not a poll | 2026-07-20 | Global documentation; all Search properties | fact | Does not reveal the collaborator's missing query setup | Re-run supplied term as Topic and Search term in target geography and YouTube Search |
| R4 — Raw views | [public evidence] What public YouTube views can contain | [YouTube ads and view metrics](https://support.google.com/youtube/answer/2375431?hl=en) | Public view count can include organic views and qualifying ad public views | 2026-07-20 | YouTube documentation; global | fact | Does not imply the unnamed 20M video used ads | Obtain video URL and traffic context |
| R5 — Raw views | [public evidence] Views are not unique viewers | [YouTube unique viewers help](https://support.google.com/youtube/answer/7577916?hl=en) | YouTube distinguishes views from estimated unique viewers and repeat viewing | 2026-07-20 | YouTube documentation; global | fact | Public pages do not expose unique viewers | Obtain creator-supplied unique reach only if voluntarily available; not required |
| R6 — AI claim | [third-party estimate] Collaborator's unverified viral/trend metrics | No direct URL supplied | “One AI video has 20M views”; “Google Trends briefly reached 100 this week” | 2026-07-20 | Query, geography, mode, format, age, and channel unknown | unknown/unavailable | Cannot cohort, reproduce, or separate subject from creator/package/distribution | Direct video URL plus Trends term/topic, geography, window, category, property |
| R7 — AI/play evidence | [public evidence] Games genuinely evaluate agents | [BALROG paper](https://arxiv.org/abs/2411.13543) and [official benchmark](https://balrogai.com/) | Game environments test long-horizon planning, spatial reasoning, exploration, and action | 2026-07-20 | Research; English; ICLR 2025 | fact | Benchmark relevance does not establish mass audience demand or human payoff | Use exact benchmark version/results if scripting later |
| R8 — AI/play evidence | [public evidence] Current coordination limitation | [OpenReview, 2026](https://openreview.net/forum?id=kNZ8EbK0CK) | 2026 game-world benchmark reports coordination as a bottleneck distinct from single-agent capability | 2026-07-20 | Research; English; workshop paper published 2026-06-14 | fact | Workshop evidence is recent and narrower than a settled field conclusion | Peer-review status and exact task generalizability |
| R9 — Salary demand | [third-party estimate] Current indexed public-video outcome | [Direct YouTube video](https://www.youtube.com/watch?v=kBIN2h16Rc4); [indexed snapshot](https://glasp.co/youtube/kBIN2h16Rc4) | ~2.7M visible views; uploaded 2024-09-24; acted “watch and learn” salary negotiation | 2026-07-20 | English long-form; India/global; ~22 months | estimate | Third-party index, not a clean channel cohort; creator/package effects remain | Refresh count, duration, traffic context if available, and recent same-format channel median |
| R10 — Salary demand | [third-party estimate] Independent older public-video outcome | [Direct YouTube video](https://www.youtube.com/watch?v=iUAcoetDgH4) | ~2.1M indexed views; uploaded 2016-12-21; “6 tips” format | 2026-07-20 | English long-form; global; ~9.6 years | estimate | Old result; durability signal, not current trajectory | Refresh current count and channel baseline |
| R11 — Salary reach | [third-party estimate] Channel scale for R9 | [SocialCounts channel snapshot](https://socialcounts.org/youtube-live-subscriber-count/UCf_XYgupvdx7rA44Ap3uI5w) | ~450K subscribers, 484 videos, 55.7M total views | 2026-07-20 | Public channel estimate; current snapshot | estimate | Third-party live counter may be noisy; subscriber ratio is not a causal baseline | Official channel page and same-format median |
| R12 — Salary relative outlier | [third-party estimate] Related video on same channel | [Indexed “Will Middle Managers Exist Next Year?”](https://glasp.co/youtube/hA98C-6rATk) | ~109.9K views; uploaded 2025-10-15 versus R9's ~2.7M | 2026-07-20 | English long-form; same channel; unequal ages | estimate | One related comparison, age/package not matched | Build 10–15 video same-format/equal-lifespan cohort |
| R13 — Salary audience language | [public evidence] Current confusion about salary transparency | [Current UK discussion](https://www.reddit.com/r/unitedkingdom/comments/1uxihv4/salary_information_to_be_shown_on_job_ads_under/) | ~5.1K upvotes surfaced four days before research; comments repeatedly debate hidden ranges and gaming | 2026-07-20 | UK/English/community thread; posted 2026-07-15 | fact | Reddit is not representative and the post concerns policy, not video choice | Preserve exact recurring questions in a broader audience-language sample |
| R14 — Salary evidence | [public evidence] First offers can anchor outcomes; counter-focus can eliminate advantage | [Columbia paper page](https://business.columbia.edu/faculty/research/first-offers-anchors-role-perspective-taking-and-negotiator-focus); [paper PDF](https://business.columbia.edu/sites/default/files-efs/pubfiles/11691/first_offers.pdf) | Experiments find first-offer advantage; focusing on opponent alternatives/reservation price or one's own target negated it | 2026-07-20 | Negotiation experiments; English; durable | fact | Experimental bargaining is not every labor market; does not imply “always go first” | Read full methods/effects and use only supported scope |
| R15 — Salary evidence | [public evidence] Salary-specific anchoring | [Thorsteinson, 2011](https://onlinelibrary.wiley.com/doi/10.1111/j.1559-1816.2011.00779.x) | Relevant and implausibly high candidate requests influenced initial salary offers in reported studies | 2026-07-20 | Experimental salary evaluation; English | fact | Initial offers are not completed negotiations; implausible anchors may carry social costs | Full sample, effect sizes, and outcome wording |
| R16 — Salary caveat | [public evidence] Moving first can help or hurt | [Information-anchoring model](https://www.insead.edu/faculty-research/publications/journal-articles/information-anchoring-model-first-offers-when-and) | Model and studies reconcile first-mover advantage/disadvantage based on priority information and recipient orientation | 2026-07-20 | Negotiation research; English | fact | Contextual model; needs translation without oversimplifying | Conditions closest to employment negotiations |
| R17 — Salary caveat | [public evidence] High requests can have adverse effects | [Organizational Behavior and Human Decision Processes](https://www.sciencedirect.com/science/article/pii/S0001879122001142) | Four experiments and a pilot examine psychological/economic downsides of high but non-extreme salary demands | 2026-07-20 | Salary-negotiation experiments; English | fact | Abstract-level review in this run | Full results, practical boundaries, and effect sizes |
| R18 — Salary timing | [public evidence] Fresh pay-range rule | [Virginia Department of Labor and Industry](https://doli.virginia.gov/author/ksubach/) | Beginning 2026-07-01, covered Virginia job postings/ads must include a wage or salary range | 2026-07-20 | Virginia, US; English; current | fact | One jurisdiction; not a universal rule or the video's central thesis | Covered-employer scope and exact statutory wording before mention |
| R19 — Salary timing | [public evidence] Broader transparency change | [EU Directive 2023/970](https://eur-lex.europa.eu/eli/dir/2023/970/oj/eng) | Directive creates pre-employment pay-information and pay-history protections; national implementation varies | 2026-07-20 | EU; multilingual law; current implementation window | fact | A directive's transposition/implementation differs by member state; do not say every listing must already show a range | Examples only after jurisdiction-specific verification |
| R20 — Tip evidence | [public evidence] Suggestions change tips and experience | [Fan, Wu & Liu](https://journals.sagepub.com/doi/full/10.1177/10963480221076467) | In one experiment, suggestions raised mean tip from 4.25 to 5.08 and dissatisfaction from 1.94 to 2.50; further studies varied layout/context | 2026-07-20 | US adults; simulated digital ordering; multiple studies | fact | Scenario/MTurk evidence is not all real checkouts; effects are not “forced” | Exact currency/stimuli and which findings replicated across studies |
| R21 — Tip evidence | [public evidence] Field defaults and heterogeneous response | [NYC taxi study](https://www.sciencedirect.com/science/article/pii/S0167487022000484) | Natural vendor change from 15/20/25% to 20/25/30% altered default selection/manual tipping; late-night and tourist responses differed | 2026-07-20 | NYC taxis; ride-level data 2010–2013 | fact | Old, location- and taxi-specific; norms differ | Exact average tip effect and identification limits |
| R22 — Tip evidence | [public evidence] Visibility/control mechanism | [Tipping privacy study](https://www.sciencedirect.com/science/article/pii/S0148296324005125) | Field study plus four experiments find lower privacy reduced perceived control and downstream responses; effects on tip amount were mixed through competing mechanisms | 2026-07-20 | Primarily US consumer contexts; 2024 paper | fact | Does not support a single “watching always raises tips” claim | Full field setting and measured effect sizes |
| R23 — Tip demand | [third-party estimate] Broad current sentiment | [Bankrate survey release](https://www.bankrate.com/f/102997/x/62789f9f80/tipping-survey-press-release-final.pdf) | 63% of US adults reported at least one negative view about tipping; 41% said businesses should pay employees better rather than rely on tips | 2026-07-20 | US survey; English; released 2025 | estimate | Survey wording/sample and US-only norms; attitude is not video selection | Methodology, sample size, field dates |
| R24 — Tip demand | [third-party estimate] Short-form breakout | [Retail Brew report](https://www.retailbrew.com/stories/2024/05/31/a-tiktok-user-takes-aim-at-tipflation-with-his-new-guideline) | Tipflation TikTok reported at ~1.4M views by 2024-05-31 | 2026-07-20 | US/English short-form; 2024 | estimate | Short-form outrage does not guarantee long-form essay demand | Direct clip, final count, creator baseline |
| R25 — Tip timing | [third-party estimate] Recent incident clip | [BroBible report](https://brobible.com/culture/article/self-serve-frozen-yogurt-tip/) | Self-serve tip-screen TikTok reported above 126K views on 2026-05-25 | 2026-07-20 | US/English short-form; ~8 weeks | estimate | Single anecdote and secondary report | Direct clip and creator baseline |
| R26 — Streak reach | [third-party estimate] Product adoption and public-video signal | [Direct YouTube interview](https://www.youtube.com/watch?v=_CCwoQZH5hI); [indexed snapshot](https://glasp.co/youtube/_CCwoQZH5hI) | Duolingo product lead said >9M users had a year-plus streak; interview indexed at ~29.9K views | 2026-07-20 | English long-form/product audience; uploaded 2024-12-15 | estimate | Company claim and niche interview; users are not guaranteed viewers | Current Duolingo first-party figure and exact wording |
| R27 — Streak evidence | [public evidence] Streak incentives can increase persistence | [Journal of Experimental Social Psychology](https://www.sciencedirect.com/science/article/pii/S0749597825000032) | Six preregistered studies, total N=4,493, report greater persistence via streak incentives and goal commitment | 2026-07-20 | Experimental work tasks; English; 2025 | fact | Escalating paid-task streaks are not app counters in every context | Generalization and effect sizes |
| R28 — Streak caveat | [public evidence] Large educational field test | [Economics of Education Review](https://www.sciencedirect.com/science/article/pii/S0272775725001013) | Eight-week randomized field experiment with ~60,000 Peruvian students examines highlighted streaks, effort, and learning; notes Khan Academy retired streaks over motivation concerns | 2026-07-20 | Peru; education app; 2025 | fact | Children/learning context; outcomes need full-paper reading before scripting | Exact treatment effects and heterogeneity |
| R29 — Streak audience/context | [public evidence] Streaks span many mainstream apps | [Le Monde overview](https://www.lemonde.fr/en/pixels/article/2025/07/25/from-facebook-games-to-a-llama-reminding-you-to-drink-water-the-rise-of-streaks-the-rewards-that-keep-you-hooked_6743699_13.html) | Apple Fitness, Duolingo, Snapchat, BeReal, Kindle and others use streaks; article documents “leisure to obligation” tension | 2026-07-20 | International/English article; 2025 | fact | Secondary reporting includes expert interpretation, not causal proof | Current app examples and first-party mechanics |
| R30 — Penalty timing | [public evidence] World Cup window | [FIFA final report](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/spain-argentina-final-report-highlights) | 2026 World Cup final occurred 2026-07-19; Spain beat Argentina 1–0 after extra time | 2026-07-20 | Global sport; event just ended | fact | Final itself did not go to penalties; interest will decay before publication | Current YouTube-search trajectory on publication date |
| R31 — Penalty supply/evidence | [public evidence] Exact current psychology coverage | [Nature, 2026](https://www.nature.com/articles/d41586-026-02043-0) | Fresh essay frames shootouts as a real-world laboratory for performance under pressure | 2026-07-20 | Global/English article; published ~3 weeks earlier | fact | Demonstrates both evidence interest and active supply | Full source studies behind any scripted claim |
| R32 — Penalty evidence | [public evidence] Large penalty dataset | [Alternating order paper](https://arxiv.org/abs/2310.04797) | Roughly 50,000 penalties, including >1,500 shootouts; reports lower shootout conversion due to shooters rather than better keepers and finds alternating order fair | 2026-07-20 | European men's football; 11 seasons | fact | Preprint/context limits; does not explain every individual miss | Latest peer-reviewed status and effect sizes |
| R33 — Penalty current demand | [public evidence] Prominent 2026 shootout | [AP report](https://apnews.com/article/819ffc6e897f8be74f48d6b9d3e76e9b) | Paraguay eliminated Germany 4–3 on penalties; Germany missed three of six in a major upset | 2026-07-20 | Global news/English; 2026-06-29 | fact | One match does not establish exact-angle demand | Current video cohort and rights-safe examples |
| R34 — Grades demand/supply | [public evidence] Major adjacent video | [TED-Ed/Atlantic video page](https://ed.ted.com/best_of_web/ltryN5j7) | “Why perfect grades don't matter” page shows 4,511,670 views | 2026-07-20 | English educational video; durable | fact | Near-identical payoff increases demand evidence but reduces opening | Upload date, direct channel baseline, current count |
| R35 — Grades demand/supply | [third-party estimate] Current game-theory school video | [Direct YouTube video](https://www.youtube.com/watch?v=kS-muAuq62E); [indexed snapshot](https://glasp.co/youtube/kS-muAuq62E) | ~634.1K views; uploaded 2026-01-08; “Game Theory #2: Why Schools Suck” | 2026-07-20 | English long-form; ~6 months | estimate | Strong adjacent competitor; channel baseline unavailable | Current count and same-format median |
| R36 — Grades evidence | [public evidence] Meta-analysis | [ERIC record](https://eric.ed.gov/?id=EJ1308363) | Meta-analysis reports that grade/comment effects vary by motivation type, context, students, and method | 2026-07-20 | Education research; 2021 | fact | Abstract does not justify “grades destroy learning” | Full effect directions and quality assessment |
| R37 — Grades counterevidence | [public evidence] Fresh mixed review/trial | [Educational Psychology Review, 2026](https://link.springer.com/article/10.1007/s10648-026-10156-1) | Notes concerns about motivation/well-being but also meta-analytic evidence of positive achievement and external-motivation associations; analyzes trial/control schools | 2026-07-20 | School research; English; published 2026 | fact | Context and implementation matter | Full trial results and causal scope |
| R38 — Learning market | [public evidence] Broad platform demand | [YouTube official blog](https://blog.youtube/news-and-events/youtube-empowering-learning-tools/) | More than 5.5B US views on learning/how-to content in June (reported by YouTube) | 2026-07-20 | US; all learning/how-to video formats; June 2025/2026 wording on page | fact | Far too broad to score exact grades demand; used only as lane seed | Confirm referenced June year before citing in a script |
| R39 — Medal timing | [public evidence] Near-term sports event | [Glasgow 2026 official sports page](https://www.glasgow2026.com/sports) | Commonwealth Games run 2026-07-23 to 2026-08-02 with ten sports | 2026-07-20 | Commonwealth markets; current event | fact | Smaller global demand than World Cup and exact bronze/silver outcome unknown | Event-specific footage rights and emergent medal moments |
| R40 — Salary opening | [editorial inference] Indexed leaders teach tips/role-play, not the full hidden-information game | R9–R17 direct video/paper links | Targeted English lookup surfaced million-scale tips/role-play plus abundant anchoring articles, but no indexed long-form leader combining the salary question, asymmetric information, boundary conditions, and deliberate counterplay | 2026-07-20 | English public web/video index; current lookup | inference | Search index is incomplete; absence from results is not absence from YouTube | Run non-personalized YouTube exact/synonym searches and document 15–20 results |
| R41 — Tip opening | [editorial inference] Subject is covered; mechanism synthesis is the opening | R20–R25; [CBS overview](https://www.cbsnews.com/amp/news/tipping-culture-etiquette-evolving-with-gratuity-screens-everywhere/) | News supply already explains ubiquitous screens/tipflation; finalist must instead deliver defaults + norms + privacy + counterplay | 2026-07-20 | Primarily US/English | inference | A current creator may already have this exact synthesis | Refresh exact-promise YouTube cohort |
| R42 — Missing audience evidence | [repository fact] No private channel evidence exists yet | [STEERING.md](/tmp/why-humans-play-video-topic-skill/whp-youtube/STEERING.md) | Zero subscribers and zero published videos; no private analytics supplied | 2026-07-20 | WHP channel | fact | Cold-start is expected, not a blocker | Learn from first published cohort rather than inventing an audience |

## Pre-script verification

| status | unresolved item and category | owner | evidence needed | how the result could change the recommendation |
|---|---|---|---|---|
| open | **V1 — Build a current public-video cohort** (`current metrics/opening`): verify 15–20 English long-form results for salary negotiation, “salary expectations,” first offer, anchoring, and hidden salary range; capture upload date, duration, visible views, channel size, and recent same-format median | Editorial researcher | Non-personalized YouTube Search/YouTube Data API observation dated within 24 hours of scripting | If the million-view examples are isolated creator/format effects or the exact thesis is already well served, lower demand/opening and potentially promote tip screens |
| open | **V2 — Read and extract the primary negotiation studies** (`load-bearing claims`): verify effect direction, sample, task, effect sizes, and boundary conditions for R14–R17 | Researcher/script writer | Full Galinsky–Mussweiler, Thorsteinson, information-anchoring, and high-request papers with a one-page claim/caveat matrix | Failure to support the informed/credible conditional rule forces a narrower angle; a contradiction can remove the winner |
| open | **V3 — Verify current pay-transparency examples** (`current timing/legal`): confirm exact pre-employment rights in every jurisdiction named | Researcher; legal reviewer if the episode gives advice | Current official statute/regulator text for Virginia and any EU member-state example; no secondary-only legal claims | If implementation is not current or comparable, remove the policy hook; the evergreen thesis can remain |
| open | **V4 — Run a blinded package comprehension/preference test** (`package/current metrics`): compare S1 with T1 and K1 among English-speaking working adults | Producer; unassigned panel recruiter | At least a small qualified panel with title/thumbnail shown without explanation; record “what video do you expect?” and first choice, not only click intent | If S1 is misunderstood or clearly loses to T1 while T1 promises the correct episode, promote the runner-up |
| open | **V5 — Confirm a five-day rights-safe production plan** (`rights/access/visuals`): storyboard only original interview, number-card, and decision-tree visuals | Martin/producer | Shot list, prop list, graphics ownership, and edit schedule; confirmation that no employer UI/logos or unlicensed footage is needed | If the mock-interview package cannot be made legible in time, simplify the package; if timing fails, tip screens is the easiest substitute |

## Completeness audit

| # | Check | yes/no | Pointer/evidence |
|---:|---|---|---|
| 1 | At least 30 diverse subjects considered | yes | Candidate landscape: 35 numbered subjects across eight broad lanes |
| 2 | Subjects converted into materially different angles | yes | Candidate rows 1a–10b show two tension/evidence/payoff-distinct angles for every promising subject |
| 3 | All six hard gates applied at angle level | yes | Candidate landscape gate-code definition and every angle row |
| 4 | Multiple independent signals used for every winner-eligible finalist; any uncorroborated finalist marked ineligible | yes | Salary R9–R19; tip R20–R25; streak R26–R29; penalty R30–R33; grades R34–R38. AI reframe was not advanced because audience transfer lacked corroboration |
| 5 | Volatile evidence dated and contextualized | yes | Decision frame public scope; every Research trail row includes observation date/window/geography/format |
| 6 | Trends, raw views, outliers, and missing data interpreted correctly | yes | Candidate landscape “AI spike audit”; R3–R6; score rationales cap unsupported transfer |
| 7 | Scores total correctly and include grades plus uncertainty | yes | Ranked shortlist totals: 87, 81, 79, 74, 73; seven criterion grades and decisive risk in every row |
| 8 | Three packages supplied for each top-three finalist | yes | Packaging stress test: exactly nine rows, S1–S3, T1–T3, K1–K3 |
| 9 | Package promise matches delivered payoff and post-test reranking occurred | yes | “Survives honestly?” column rejects three bait promises; adjustment table shows rescoring/ranks |
| 10 | One winner named before analysis, unless responsibly insufficient evidence is explicitly marked incomplete | yes | Decision names salary negotiation before the decision frame |
| 11 | Runner-up loss explained directly | yes | “Why the runner-up lost” same-frame comparison and reversal condition |
| 12 | No fabricated observation, guarantee, or unsupported load-bearing claim | yes | Unknown collaborator metrics remain unknown; third-party counts are labeled estimates; confidence is medium; no performance forecast |
```

</details>

#### Twelve-check result and exact evidence

| # | Result | Exact observable excerpt | Independent audit basis |
|---:|:---:|---|---|
| 1 | pass | “**Mode:** cold-start”; “Not supplied. Working frame: globally addressable English-language YouTube viewers”; “Within five days, approximately 2026-07-25.” | Records 2026-07-20, supplied and unknown market/production details, five-day window, format, and mode without presenting the working geography as user-supplied. |
| 2 | pass | “Published: none.”; “Current/committed pilot: none found.”; “Parked” | Names and links doctrine, steering, parked draft, and thumbnail state; separates current, parked, and backlog state and records old-vs-current doctrine. |
| 3 | pass | “**Pool:** 35 distinct subjects across actual games, hidden everyday games, play science, learning, incentives, AI, digital culture, sport, and meaning.” | Numbers 35 distinct subjects before narrowing to ten survivor angles and five deep finalists; 1a–10b are alternate angles and do not inflate the subject count. |
| 4 | pass | “A stronger reframe—*games expose what AI still cannot do*—passes the gates”; “Why employers ask for your expected salary before revealing their range” | Broad AI, salary negotiation, tipping, streaks, penalties, grades, and other subjects are converted into concrete tensions, mechanisms, viewers, and payoffs; promising subjects have materially different `a`/`b` angles. |
| 5 | pass | “Actual game”; “Game history/institutions”; “Actual puzzle/culture” | Chess, poker, Tetris, Wordle, sport, and Monopoly's game history are substantive numbered candidates, not token mentions. |
| 6 | pass | “The six-gate code below is always in this order: **G**ame/play centrality, **H**uman revelation, recognized **P**ayoff, **E**vidence path, production **R**eality, portfolio **F**it.” | Every candidate angle shows six outcomes; the broad AI pitch explicitly fails centrality, payoff, evidence, and production, and no failed/unknown angle is scored. |
| 7 | pass | “~2.7M visible views”; “~2.1M indexed views”; “Indexed leaders teach tips/role-play, not the full hidden-information game” | Salary demand uses independent videos, a same-channel comparison, current audience language/timing, and primary evidence; R40 separately labels the supply/opening inference and its incomplete-index caveat. Every finalist has multiple sources. |
| 8 | pass | “**A Google Trends peak of `100`**”; “is the highest *relative* interest point inside the selected query, geography, category, property, and window”; “A brief peak therefore cannot establish durable or reachable YouTube demand.” | The report also explains why 20M raw views lack channel/age/format/distribution/satisfaction context, exposes the unspecified metrics as unavailable, and refuses to treat correlated spike clues as a greenlight. |
| 9 | pass | “[third-party estimate] Collaborator's unverified viral/trend metrics”; “unknown/unavailable”; “[editorial inference] Indexed leaders teach tips/role-play, not the full hidden-information game” | R1–R42 date and link observations, label repository/public/third-party/inference provenance, expose unknowns and counterevidence, and distinguish observed values from interpretation. |
| 10 | pass | “Scores structure editorial judgment; they are neither probabilities nor view forecasts.”; “**rejected trend bait**” | The exact reach-heavy 100-point weights are used consistently; broad AI cannot enter scoring after hard-gate failures despite the alleged spike. |
| 11 | pass | “Exactly three materially different directions were tested for each top-three finalist.”; “**no — overpromises causal earnings**” | Salary, tip screens, and streaks receive exactly three distinct directions each; three bait promises are rejected and the post-test table shows score changes and final ranks. |
| 12 | pass | “**Winner:** Salary negotiation”; “For a pre-launch pilot, salary better demonstrates that WHP can reveal a game people are already in and help them play deliberately.” | One winner is named first; a same-frame table directly compares the tip-screen runner-up, and a concrete reversal condition states what could promote it. |

Independent arithmetic yields `87`, `81`, `79`, `74`, and `73` for the five rows. The landscape has
35 numbered subjects and 45 angle rows; the packaging table has nine directions and its adjustment
table has exactly the same top three.

#### Baseline comparison

Scenario B moves from 3 pass / 7 partial / 2 fail to 12 pass. The baseline already rejected the
20M view and Trends-100 claims, but it lacked a full decision frame, doctrine/episode state, breadth,
game-history coverage, competition research, fixed gates, a reach-weighted score, and comparative
packaging. The forward response preserves the metric discipline while making the broad AI pitch
fail four named gates, retaining its narrower game-benchmark reframe only as an uncorroborated
shallow survivor, and selecting salary negotiation from a 35-subject pool through independently
cited demand, supply, evidence, feasibility, and package tests.

### Scenario C — conflicting evidence and forced choice

#### Scenario prompt

```text
Act as the editorial researcher for Why Humans Play. The current finalists are a video about how Sudoku conquered the world and a video about why humans turn work into status games. Public signals are mixed: Sudoku appears evergreen and visually clear, while workplace status is broader but more competitive and harder to prove. There is no reliable channel analytics history. Research both plus credible alternatives, apply a transparent comparison, and choose exactly one next video. Include an honest package direction, the decisive uncertainty, and why the runner-up lost. Do not return an unordered menu and do not ask follow-up questions.
```

#### Complete forward response

<details>
<summary>Scenario C forward response (complete; trailing-space normalization documented above)</summary>

```markdown
# WHP Next-Video Recommendation

## Decision

**Decision status:** Winner selected
**Winner:** Workplace status — why work becomes a status game, and how its second scoreboard changes what people do
**Confidence:** medium
**Why it wins now:** It combines the strongest transferable public click signal with the exact useful “Hidden Game” the pre-launch channel needs, provided the episode treats status as a bounded explanatory lens rather than claiming that all workplace behavior is status-seeking.
**Strongest honest title/thumbnail promise:** **Your Job Has a Second Scoreboard** — a performance review split into `WORK` and `STATUS`, with the promotion marker moving toward the status side
**Mode:** cold-start

The recommendation is not a view forecast. Its decisive uncertainty is whether a new general-interest audience reads “second scoreboard” as a fresh, useful explanation or merely another office-politics/self-help promise. The smallest test that could reverse the choice is a blind package-and-payoff test against the Sudoku runner-up with target viewers before scripting.

## Decision frame

| Field | Required value |
|---|---|
| Research and decision date | 2026-07-20 |
| Target market and language | Global English-language, general-interest browse audience; a narrower geography was not supplied. |
| Desired publication window | Next publishable video and intended pilot; exact date unknown. The winner is evergreen and does not depend on a calendar event. |
| Evidence mode | `cold-start` — the channel is pre-launch and no decision-useful private analytics exist. |
| Production, timing, and format constraints | Martin presents on camera; solo production; organic-first; no ad budget; early long-form target 6–10 minutes; clear 1–3-element packaging; exact budget, shoot date, and access beyond ordinary office/stock/graphic assets are unknown. |
| WHP files read | Repository revision `d33e106`: [BRAND.md](/tmp/why-humans-play-video-topic-skill/BRAND.md), [whp-youtube/STEERING.md](/tmp/why-humans-play-video-topic-skill/whp-youtube/STEERING.md), [parked play draft](/tmp/why-humans-play-video-topic-skill/whp-youtube/drafts/evolutionary-paradox-of-play.md), [thumbnail state](/tmp/why-humans-play-video-topic-skill/whp-youtube/thumbnails/README.md), [topic-selection research](/tmp/why-humans-play-video-topic-skill/docs/research/2026-07-20-youtube-topic-selection.md), and the governing skill/reference files. |
| Episode state checked | Zero published videos and zero subscribers; no locked current episode; the evolutionary paradox of play is a parked, later `Why We Play` draft; channel backlog includes game theory, brain training, adult play, and game design/addiction seeds. Sudoku and workplace status are not committed. |
| Supplied private analytics used | none |
| Unavailable private analytics | No impressions, CTR, retention, audience affinity, watched-content, geography, or equal-lifespan WHP comparisons. This limits audience-transfer confidence and keeps the decision at `medium`. |
| Public evidence scope | Unauthenticated English YouTube search and visible long-form/channel cohorts observed 2026-07-20; global/unspecified geography; durable primary or first-party factual sources plus current official timing through 2026-07-20. |
| Research/tool limitations | Google Trends in YouTube Search mode was unavailable in an auditable form; public YouTube views are lifetime outcomes, search can vary by locale/personalization, recent-channel cohorts were not age-normalized, and public pages expose no CTR, retention, impressions, or satisfaction. Absence from a query was not treated as absence of demand. |

## Candidate landscape

**Pool:** 34 distinct subjects across actual games/design (12), play/learning (6), work/institutions (7), AI/digital culture (6), and philosophy/future (3). **Promising subjects developed into multiple angles:** 11. **Shallow-scan survivors:** 10 exact angles. **Deep-research finalists:** 5. **Conspicuous trend-bait subjects retained and rejected:** 2.

Gate key: `G` game/play centrality; `H` human revelation; `Pay` recognized payoff; `E` evidence path; `Prod` production reality; `Port` portfolio fit. Every result below is explicitly `pass`, `fail`, or `unknown`; a failed or unknown gate is not scored.

<details>
<summary>Full 34-subject, angle-level gate record</summary>

| # | WHP lane or signal seed | subject | source/seed | exact angle | all-six gate results + concise reason | disposition |
|---:|---|---|---|---|---|---|
| 1a | Actual puzzle / current finalist | Sudoku | R13–R16 | How Sudoku conquered the world—and what its language-light, three-rule grid teaches about portable games | G pass; H pass; Pay pass; E pass; Prod pass; Port pass | **deep-research finalist** |
| 1b | Actual puzzle / health claim | Sudoku | R16, R21 | Does Sudoku make your brain younger? | G pass; H pass; Pay pass; **E fail**—near-task engagement does not establish broad cognitive or anti-aging transfer; Prod pass; Port pass | rejected |
| 2a | Actual puzzle / current durable use | Wordle | R22–R24 | How one puzzle a day became a global ritual—and why scarcity plus shareable feedback beat endless play | G pass; H pass; Pay pass; E pass; Prod pass; Port pass | **deep-research finalist** |
| 2b | Actual puzzle / optimization | Wordle | R24 | The mathematically perfect opening word | G pass; **H fail**—optimization does not yet reveal a meaningful human mechanism; Pay pass; E pass; Prod pass; Port pass | rejected |
| 3a | Actual game / public breakout | Chess | R25 | Why chess became an internet spectator sport—and what streaming changed about mastery and status | G pass; H pass; Pay pass; E pass; Prod pass; Port pass | shallow-scan survivor |
| 3b | Actual game / cognition | Chess | R21 | Why chess makes you smarter | G pass; H pass; Pay pass; **E fail**—far-transfer promise is too broad; Prod pass; Port pass | rejected |
| 4 | Puzzle culture | Crosswords | R3, R23 | How crossword clues became cultural gatekeepers—and who gets to belong | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—no corroborated current reach signal in this run | rejected |
| 5 | Actual game / cognition | Tetris | R3 | Why Tetris can linger in perception after play | G pass; H pass; Pay pass; E pass; **Prod unknown**—rights/visual capture plan not checked; Port pass | rejected |
| 6 | Game history / institutions | Monopoly | R1, R3 | How an anti-landlord warning became a celebration of winning property | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—crowded, familiar thesis without a current opening signal | rejected |
| 7 | Strategy / cooperation | Poker | R3 | Why bluffing works only because honesty usually does | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—no current reach corroboration | rejected |
| 8 | Rules/design/sport | Football offside | R1, R3 | Why games need unfair-looking rules to remain games | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—audience transfer unknown | rejected |
| 9 | Social play | Escape rooms | R3 | Why strangers appear to cooperate faster when a room invents a clock | G pass; H pass; Pay pass; **E unknown**—the causal claim needs direct evidence; Prod pass; Port pass | rejected |
| 10 | Game culture | Speedrunning | R3 | Why players break games without cheating—and what self-made rules reveal about mastery | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—narrower reachable market than survivors | rejected |
| 11 | Role-play / identity | Dungeons & Dragons | R3 | What pretending together can reveal about identity | G pass; H pass; Pay pass; **E unknown**—scope and causal claims not yet bounded; **Prod unknown**—rights/access not checked; Port pass | rejected |
| 12a | Game design / current public signal | Hard games | R25 | Why hard games feel meaningful when easier versions would be more efficient | G pass; H pass; Pay pass; E pass; Prod pass; Port pass | shallow-scan survivor |
| 12b | Philosophy of play | Hard games | R3 | Why humans invent unnecessary obstacles | G pass; H pass; Pay pass; E pass; Prod pass; **Port fail**—the parked play draft already uses this Suits-based payoff | rejected |
| 13a | Evolution of play | Animal play | R2–R3 | Why evolution kept a costly, dangerous behavior that appears useless | G pass; H pass; Pay pass; E pass; Prod pass; **Port fail**—already developed as the parked later episode | rejected |
| 13b | Play mechanism | Animal play | R3 | Play as training for losing control safely | G pass; H pass; Pay pass; E pass; Prod pass; **Port fail**—same evidence spine and payoff as the parked draft | rejected |
| 14 | Psychology of play | Adult play | R1–R3 | Why adults stop playing even when play remains useful | G pass; H pass; Pay pass; **E unknown**—“stop” and “useful” are too broad across cultures and activities; Prod pass; Port pass | rejected |
| 15 | Development / risk | Risky play | R3 | What children learn from chosen risk | G pass; H pass; Pay pass; **E unknown**—high-stakes developmental claim not deeply checked; **Prod unknown**—child filming/access; Port pass | rejected |
| 16a | Learning / current research | Brain training | R19–R21 | Do brain games work? The honest answer after a 2026 result complicated the old “no transfer” story | G pass; H pass; Pay pass; E pass; Prod pass; Port pass | **deep-research finalist** |
| 16b | App-adjacent learning | Brain training | R1–R2 | How to build the best brain-training game | G pass; H pass; Pay pass; E pass; Prod pass; **Port fail**—too likely to read as an Apexwit commercial | rejected |
| 17 | Learning / quizzes | Testing effect | R1, R3 | Why a quiz can teach more than another reread | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—current public demand not corroborated | rejected |
| 18 | Mastery / education | Deliberate practice vs play | R3 | When playful exploration beats structured practice | G pass; H pass; Pay pass; **E unknown**—boundary conditions not researched; Prod pass; Port pass | rejected |
| 19a | Hidden Game / current finalist | Workplace status | R5–R12 | Why work becomes a status game—and how its second scoreboard changes what people do | G pass; H pass; Pay pass; E pass; Prod pass; Port pass | **deep-research finalist** |
| 19b | Career advice | Workplace status | R5–R12 | Why the best worker does not get promoted | G pass; H pass; Pay pass; **E fail**—performance-to-promotion causality is organization-specific and unsupported as a universal promise; Prod pass; Port pass | rejected |
| 20a | Hidden Game / current timing | Salary secrecy | R17–R18 | Salary secrecy as an information rule: how hidden pay changes bargaining and what transparency changes | G pass; H pass; Pay pass; E pass; Prod pass; Port pass | **deep-research finalist** |
| 20b | Work / overclaim | Salary transparency | R18 | Why salary transparency always raises pay | G pass; H pass; Pay pass; **E fail**—the law establishes rights, not a universal wage effect; Prod pass; Port pass | rejected |
| 21a | Gamified institution | Workplace leaderboards | R1, R11 | When the dashboard becomes the game and the metric starts replacing the work | G pass; H pass; Pay pass; E pass; Prod pass; Port pass | shallow-scan survivor |
| 21b | Gamified institution | Workplace leaderboards | R11 | Why every leaderboard makes people cheat | G pass; H pass; Pay pass; **E fail**—universal behavioral claim; Prod pass; Port pass | rejected |
| 22 | Hidden norm | Tipping | R1 | The repeated coordination game hidden inside a tip screen | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—no independent reach signal collected | rejected |
| 23 | Hidden norm | Queues | R1 | Why people police a line with no official referee | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—no independent reach signal collected | rejected |
| 24 | Matching market | Dating apps | R1 | The incentives that turn dating profiles into strategies | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—highly competitive shelf, no documented opening in this run | rejected |
| 25 | Institutions / game theory | Strategic voting | R1–R2 | Why an honest vote can produce the outcome you least want | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—publication geography/timing unknown | rejected |
| 26 | AI / incentives | Reward hacking | R3 | When an AI wins the wrong game: what reward hacking reveals about human goals | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—reachable general-interest audience not corroborated | rejected |
| 27a | AI / games as learning | Game-playing AI | R3 | How AI learned by playing—and what games can and cannot teach about intelligence | G pass; H pass; Pay pass; E pass; Prod pass; Port pass | shallow-scan survivor |
| 27b | AI / overclaim | Game-playing AI | R3 | Why game-playing AI does not understand anything | G pass; H pass; Pay pass; **E unknown**—“understand” is undefined and contested; Prod pass; **Port fail**—risks consciousness drift | rejected |
| 28a | Digital Hidden Game | Social-media scoreboards | R1, R24 | How likes and follower counts turn identity into a status game | G pass; H pass; Pay pass; E pass; Prod pass; Port pass | shallow-scan survivor |
| 28b | Digital intervention | Hidden like counts | R24 | Why removing like counts improves mental health | G pass; H pass; Pay pass; **E fail**—effects are mixed and platform/context dependent; Prod pass; Port pass | rejected |
| 29 | Virtual worlds | Virtual economies | R3 | Why pixels acquire real value when a community accepts the rules | G pass; H pass; Pay pass; E pass; **Prod unknown**—capture/access/rights not checked; Port pass | rejected |
| 30 | Digital community | Esports team rank | R3, R10 | Prestige versus dominance inside elite game teams | G pass; H pass; Pay pass; **E unknown**—no esports-specific evidence collected; **Prod unknown**—access; Port pass | rejected |
| 31 | Everyday game theory | Prisoner’s Dilemma | R2 | Why cooperation changes when players expect to meet again | G pass; H pass; Pay pass; E pass; Prod pass; Port pass—top explainer shelf is already saturated in channel research | rejected |
| 32 | Playable Idea | Finite/infinite careers | R1 | What changes when you stop treating a career like a game with a final score | G pass; H pass; Pay pass; **E unknown**—primarily philosophical; Prod pass; Port pass | rejected |
| 33 | Rejected trend bait | Gaming dopamine/addiction | R2 | Games “hijack your dopamine” | G pass; H pass; Pay pass; **E fail**—reductive mechanism; Prod pass; **Port fail**—saturated and off-thesis as a lead | rejected |
| 34 | Rejected trend bait | AI consciousness through games | R1–R3 | Games made AI conscious | G pass; H pass; **Pay unknown**; **E fail**—unsupported load-bearing claim; Prod pass; **Port fail**—woo/consciousness drift | rejected |

</details>

The ten shallow-scan survivors were workplace status, Sudoku, salary secrecy, brain training, Wordle, chess’s streaming/status turn, hard-game difficulty, workplace leaderboards, game-playing AI, and social-media scoreboards. Deep research narrowed these to the first five because each had at least two independent signals and a defensible 6–10 minute evidence spine.

## Ranked shortlist

Scores are editorial structure, not forecasts. Letter grades assess evidence independently from the integer score.

| rank | subject | exact angle | demand /25 | opening /15 | package /20 | satisfaction /15 | WHP /10 | evidence /10 | feasibility /5 | total /100 | overall confidence | decisive risk |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| 1 | Workplace status | Why work becomes a status game—and how its second scoreboard changes what people do | 22/B | 8/B | 17/B | 13/B | 10/A | 8/B | 5/A | **83/100** | medium | “Second scoreboard” may read as generic office-politics advice; broad causality must stay bounded. |
| 2 | Sudoku | How Sudoku conquered the world—and what its language-light, three-rule grid teaches about portable games | 16/B | 11/B | 17/B | 11/B | 8/A | 9/A | 5/A | **77/100** | medium | The strongest Sudoku breakout evidence supports secrets/solving, not the history-and-design promise. |
| 3 | Salary secrecy | Salary secrecy as an information rule: how hidden pay changes bargaining and what transparency changes | 16/B | 8/B | 17/B | 13/B | 9/A | 9/A | 4/B | **76/100** | medium | Timely EU evidence narrows geography, and legal implementation varies by country. |
| 4 | Brain training | Do brain games work? The honest answer after a 2026 result complicated the old “no transfer” story | 16/B | 9/B | 15/B | 13/B | 8/A | 9/A | 4/B | **74/100** | medium | View demand is supported mainly by older videos; the 2026 result applies to a specific speed-training intervention, not brain games generally. |
| 5 | Wordle | How one puzzle a day became a global ritual—and why scarcity plus shareable feedback beat endless play | 19/A | 8/B | 15/B | 11/B | 8/A | 8/B | 4/B | **73/100** | medium | Huge current play does not automatically transfer to a retrospective explainer, and the cultural-origin moment was 2022. |

- **Workplace status:** Three independently operated career channels produced exact office-politics/rules videos roughly 84×, 118×, and 224× their respective current 15-upload medians, while primary research supports a narrower status-mechanism story (R5–R12). The largest uncertainty is whether that observed demand transfers from advice channels to a rigorous general-interest essay.
- **Sudoku:** Two different channel contexts show Sudoku can break out, but one is a small-channel history video and the other is a Numberphile “secret” rather than a conquest story; Nikoli and reasoning research make the factual spine unusually defensible (R13–R16). The missing piece is direct demand for this exact promise.
- **Salary secrecy:** A large general-business explainer, a 2026 practitioner video, and the June 2026 EU implementation window converge on relevance, but the strongest current hook is European rather than global (R17–R18).
- **Brain training:** Public explainers establish durable interest, and 2026 NIH evidence creates a genuine evidence-audit update; older reviews prevent an easy yes/no claim and make the caveat the episode (R19–R21).
- **Wordle:** NYT reported 4.2 billion Wordle plays in 2025, yet public “why it became popular” videos are modest; the opening is a stronger mechanism treatment, not another origin recap (R22–R24).

Arithmetic audit: `22+8+17+13+10+8+5=83`; `16+11+17+11+8+9+5=77`; `16+8+17+13+9+9+4=76`; `16+9+15+13+8+9+4=74`; `19+8+15+11+8+8+4=73`.

## Packaging stress test

Exactly three materially different directions were tested for each top-three finalist.

| finalist | direction | working title | intended viewer | familiar element | surprise/tension | visual promise | delivered payoff | survives honestly? |
|---|---|---|---|---|---|---|---|---|
| Workplace status | **W1 — strongest** | **Your Job Has a Second Scoreboard** | Knowledge workers who have seen effort and recognition diverge | Performance review / scoreboard | Work output and social rank are scored separately | Review sheet split into `WORK` and `STATUS`; promotion marker moves toward status | A bounded map of relative status, prestige/dominance, ambiguous scoring, and status conflict—plus how to identify which game is operating | **yes** |
| Workplace status | W2 — promotion reversal | Why the Best Worker Doesn’t Always Get Promoted | Ambitious employees | Promotion ladder | Competence may not determine advancement | Highest-output worker watches another token rise | Would require a general causal account of promotion outcomes that the evidence does not establish | **no — overpromises promotion causality** |
| Workplace status | W3 — office board | The Office Politics Game Nobody Opts Out Of | Anyone who dislikes office politics | Meeting table | Even nonplayers affect and are affected by rank signals | Meeting table rendered as a game board, with airtime/credit/access tokens | Shows office politics as status allocation, then distinguishes prestige from domination | **yes** |
| Sudoku | S1 — conquest history | How Sudoku Conquered the World | Puzzle-curious general viewers | Familiar 9×9 grid | An American “Number Place” became a Japanese-named global ritual | One grid spreads across newspaper front pages and a world map | The documented Dell→Nikoli→newspaper story and the production/design features that aided travel | **yes** |
| Sudoku | **S2 — strongest** | **The Puzzle That Doesn’t Need Language** | Viewers interested in design, culture, or puzzles | Instantly recognizable Sudoku grid | Digits look mathematical, but calculation and translation are unnecessary | Digits transform into symbols across newspapers in different scripts | Explains how simple constraints, language-light rules, graded depth, and reproducible supply supported portability; does not claim those features alone caused adoption | **yes** |
| Sudoku | S3 — misconception | Sudoku Is Not a Numbers Game | People intimidated by maths or curious about logic | Digits 1–9 | Numbers are merely symbols; deduction is the game | Numbers peel off the grid and are replaced with nine icons | A reasoning demonstration tied to the game’s history and accessibility | **yes** |
| Salary secrecy | P1 — intent accusation | Your Salary Is a Guessing Game—By Design | Employees and job seekers | Payslip / offer | Employers deliberately hide the score | Two identical desks with censored pay cards | Evidence supports information asymmetry and legal responses, not a universal claim of deliberate employer design | **no — imputes intent too broadly** |
| Salary secrecy | **P2 — strongest** | **What Happens When Everyone Knows Everyone’s Salary?** | Workers, managers, and job seekers | Coworker salaries | A taboo becomes visible and changes bargaining rules | Identical pay cards flip face-up around a table | Separates what transparency rules change from what they do not guarantee, using current EU rights and caveats | **yes** |
| Salary secrecy | P3 — hidden rule | Salary Secrecy Changes the Game | General workplace audience | Negotiation table | Withholding one variable changes every player’s strategy | Two negotiators; only one can see the pay range | Maps information asymmetry, bargaining, and current transparency interventions without promising automatic raises | **yes** |

| finalist | strongest surviving direction | thesis changed? / gate rerun result | package score before -> after | satisfaction score before -> after | post-test rank | winner-eligible? |
|---|---|---|---|---|---:|---|
| Workplace status | W1 — *Your Job Has a Second Scoreboard* | Clarified, not changed; all six gates remain pass | 15 -> 17 | 11 -> 13 | 1 | yes |
| Sudoku | S2 — *The Puzzle That Doesn’t Need Language* | Refocused conquest through portability; all six gates rerun and pass, with causal caveat | 15 -> 17 | 11 -> 11 | 2 | yes |
| Salary secrecy | P2 — *What Happens When Everyone Knows Everyone’s Salary?* | Clarified from wage outcome to rule change; all six gates remain pass | 15 -> 17 | 11 -> 13 | 3 | yes |

- **Workplace-status earned reframe:** Office politics is not merely a dirty side activity; it emerges when relative respect becomes a second reward system and its scoring rule is opaque. Adjacent follow-ups: salary secrecy as an information game; why meeting airtime and idea credit become status tokens.
- **Sudoku earned reframe:** Sudoku’s portability comes less from “numbers” than from a language-light constraint system with immediate rules and deep mastery. Adjacent follow-ups: Wordle’s once-a-day social ritual; how crossword clues encode culture.
- **Salary-secrecy earned reframe:** Pay secrecy is an information rule that changes bargaining positions, not just etiquette. Adjacent follow-ups: the workplace’s second status scoreboard; tipping as a repeated norm-enforcement game.

## Winner brief

| Field | Required content |
|---|---|
| Exact subject and angle | **Workplace status — why work becomes a status game, and how its second scoreboard changes what people do.** |
| Working logline | Every workplace pays in at least two currencies—material rewards and relative respect—and seeing the second scoreboard explains why visibility, credit, deference, and politics can redirect effort away from the work itself. |
| Intended viewer | An English-speaking employee or manager who has watched recognition, influence, and contribution diverge but does not want cynical “power hacks.” |
| Why now | **Evergreen**, with current audience evidence: exact “rules nobody tells you” and promotion/office-politics packages broke far above three creators’ visible baselines in 2025–2026 (R5–R8). It does not require a news peg. |
| Familiar entry point and central tension | Familiar: a performance review, meeting, promotion, or colleague who gets heard. Tension: the formal task says “do good work,” while the social system also ranks who is respected and deferred to. |
| Game/play mechanism | A repeated, multiplayer, relative-ranking game with partly hidden scoring: players send signals, grant or withhold deference, compete for scarce rank, and can pursue prestige through useful expertise or dominance through pressure. |
| Human revelation and stakes | Status is distinct from pay and power yet strongly motivates behavior; status disagreement can reduce contribution and information sharing. The stake is not “how to manipulate coworkers,” but how to recognize when the status game is distorting cooperation or one’s own choices (R9–R12). |
| Useful or earned payoff | The viewer can separate contribution, power, pay, and status; identify the local status tokens being rewarded; favor prestige-producing moves such as useful expertise and credit-sharing; and ask for explicit evaluation rules rather than treating every interaction as a dominance contest. These are episode reframes, not guaranteed career outcomes. |
| Why unmistakably WHP | It executes the canonical move—make an invisible real-life game visible—and fits the required useful `Hidden Game` pilot mode in [BRAND.md](/tmp/why-humans-play-video-topic-skill/BRAND.md) (R1), while obeying the channel’s packaging and rigor rules (R2). |
| Strongest reach evidence and competitive opening | Repeated relative breakouts across Ginny Clarke, Donald vs The System, and Bash’s Leadership Breakdown support reachable interest (R5–R8). The shelf is crowded with tactical office-politics advice; the opening is an evidence-led model of **status as the mechanism**, with explicit limits, not another “five tricks to win.” |
| Factual evidence backbone and caveats | Backbone: status-motive review; dominance/prestige studies; mixed-method status-conflict work; status-disagreement research (R9–R11). Caveats: status is not pay or power; much evidence is general group/organizational research rather than causal promotion research; hierarchy can coordinate; under some conditions status conflict clarifies an unsettled hierarchy (R12). Do not claim all work is a status game or that prestige guarantees promotion. |
| Strongest honest package direction | **Title:** *Your Job Has a Second Scoreboard*. **Thumbnail:** a familiar performance-review sheet split into `WORK` and `STATUS`, one red promotion marker moving toward `STATUS`. **Delivered payoff:** reveal and map the second reward system without promising a promotion hack. |
| Production approach and feasibility | 7–9 minute presenter-led explainer; ownable two-scoreboard motion graphic; staged meeting/performance-review inserts; licensed generic office B-roll; simple tokens for airtime, access, credit, and title. No interview, proprietary workplace footage, or expensive animation is required. |
| Evidence confidence and largest uncertainty | **medium.** Factual mechanisms and public click signals are supported, but audience transfer to a new general-interest channel is unknown. The largest uncertainty is whether the strongest package differentiates itself from saturated career advice while accurately signaling a rigorous human-behavior essay. |
| Falsifier | If a blind target-viewer test shows that W1 is primarily interpreted as generic promotion advice or draws materially weaker click-and-payoff interest than Sudoku S2—and a tighter status package cannot fix that—promote Sudoku. Failure to substantiate the two-scoreboard mechanism after full-paper review would also reverse the decision. |
| Claims/data to verify before scripting | Complete V1–V4 below: full-paper claim audit and counterexamples; blind work-vs-Sudoku package test; current visible-metric refresh; office-visual/right confirmation. |
| Adjacent follow-ups | 1. **Salary secrecy:** how hidden pay changes the bargaining game and what transparency changes. 2. **Meeting status:** how airtime, interruption, and idea credit become tokens in an informal rank system. |

## Why the runner-up lost

| dimension | winner: workplace status | runner-up: Sudoku | why decisive now |
|---|---|---|---|
| Audience demand / reach | 22/B; three exact office-politics/rules videos were repeated, very large within-channel outliers (R5–R8) | 16/B; history was a small-channel outlier, but the multi-million result was a Sudoku **secret**, not history (R13–R14) | The winner has stronger repeated transfer evidence for its exact problem/promise family. |
| Competitive opening | 8/B; crowded, but most high-performing supply is tactical or power-oriented rather than a caveated status-mechanism explainer | 11/B; exact history/design coverage is visibly thinner | Sudoku wins this dimension, but thin supply plus modest exact-angle outcomes may indicate limited demand as well as opportunity. |
| Strongest package | 17/B; “second scoreboard” joins a universal workplace object to an unseen rule | 17/B; “doesn’t need language” is visual, clear, and honest | Equal package scores; the work package attaches the surprise to a more immediate personal stake. |
| Delivered payoff | 13/B; viewers can distinguish work/status and see a recurring game they already inhabit | 11/B; viewers gain an elegant history-and-design reframe | The winner more directly changes how a stranger sees and acts, which the pilot doctrine prioritizes. |
| WHP / portfolio | 10/A; canonical `Hidden Game`, recognizably human and useful for the required pilot | 8/A; actual games are first-class WHP subjects, but this is more wonder/history than immediate life utility | Sequence matters: Sudoku is a strong later proof that WHP can cover literal games, but the first episode must establish the hidden-life-game promise. |
| Evidence and feasibility | 8/B and 5/A; easy to film, but thesis requires strict boundaries and counterexamples | 9/A and 5/A; cleaner primary history, rules, and visuals | Sudoku wins defensibility. It still loses the next-slot decision because the six-point overall gap comes from exact reach transfer, payoff, and pilot fit—not from ignoring its evidence advantage. |

**Reversal condition:** Sudoku becomes the recommendation if the blind package test shows S2 has materially stronger click intent **and** clearer unaided payoff recall, or if full-paper review cannot support the bounded second-scoreboard thesis without collapsing it into generic office advice. A major, verified Sudoku timing hook could also reverse the order.

## Research trail

| candidate/criterion | claim or signal | direct source URL/repository file | observed value | observation date | geography/language/format/window | fact/estimate/inference | counterevidence/caveat | claim to verify |
|---|---|---|---|---|---|---|---|---|
| R1 — WHP/portfolio | [repository fact] Canonical brand move and pilot requirement | [BRAND.md](/tmp/why-humans-play-video-topic-skill/BRAND.md) | Make hidden games visible; pilot must be a recognizable, useful `Hidden Game` | 2026-07-20; file committed 2026-07-13 | Repository / English / current doctrine | fact | Actual games remain first-class across WHP; pilot requirement affects sequence, not subject eligibility forever | Confirm doctrine has not changed before scripting |
| R2 — format/competition | [repository fact] Channel state and operating rules | [STEERING.md](/tmp/why-humans-play-video-topic-skill/whp-youtube/STEERING.md) | Pre-launch, zero videos/subscribers; solo presenter; 6–10 min; game theory top shelf saturated; rigor and package-first rules | 2026-07-20; file updated 2026-07-13 | Repository / English / current channel state | fact | Parts 2–4 contain older pilot assumptions and are subordinate to BRAND.md | Recheck episode commitments at script start |
| R3 — portfolio/candidate seeds | [repository fact] Parked play episode and candidate lane diversity | [parked draft](/tmp/why-humans-play-video-topic-skill/whp-youtube/drafts/evolutionary-paradox-of-play.md); [research method](/tmp/why-humans-play-video-topic-skill/.agents/skills/choosing-whp-video-topic/references/research-method.md) | Evolutionary paradox/Suits “unnecessary obstacles” already developed; lane map requires broad generation | 2026-07-20 | Repository / English | fact | Parked does not mean abandoned, only not next | Verify no new script overlaps winner |
| R4 — unavailable demand | [public evidence] Google Trends YouTube Search comparison | [Google Trends](https://trends.google.com/explore) | unknown/unavailable in an auditable query series | 2026-07-20 | Intended global / English terms / 5-year YouTube Search | fact about unavailability | Removes a preferred independent trajectory signal; no index was invented | Run consistent global and main-market YouTube Search comparisons before scripting if accessible |
| R5 — work demand | [public evidence] Exact office-politics promise repeats across independent creators | [Ginny Clarke](https://www.youtube.com/watch?v=4aml7vn020U); [Donald vs The System](https://www.youtube.com/watch?v=gAz6QRrCf_I); [Bash’s Leadership Breakdown](https://www.youtube.com/watch?v=uqgEruWF-fU) | 403,170 views (2025-01-20); 294,914 (2026-01-16); 104,044 (2025-09-23) | Visible 2026-07-20 | Global/unspecified; English; long-form 9–15 min; lifetime | fact | Raw views confound channel, age, package, execution, and distribution | Refresh counts and verify durations/dates before final deck |
| R6 — work relative outlier | [public evidence] Ginny Clarke same-channel context | [topic video](https://www.youtube.com/watch?v=4aml7vn020U); [channel videos](https://www.youtube.com/channel/UC5tOCbeLgn6G069fupd10yw/videos) | 403,170 vs median 4,800 across 15 most-recent visible uploads: ~84× | 2026-07-20 | English; long-form; current 15-upload visible cohort, not equal-age | estimate from public counts | Upload ages and formats are not perfectly matched; topic video is older than current cohort | Build an equal-age cohort if historical snapshots become available |
| R7 — work relative outlier | [public evidence] Donald vs The System same-channel context | [topic video](https://www.youtube.com/watch?v=gAz6QRrCf_I); [channel videos](https://www.youtube.com/channel/UCBql4fTP5-7cEFN4506uRvw/videos) | 294,914 vs median 2,500 across 15 most-recent visible uploads: ~118× | 2026-07-20 | English; long-form; current 15-upload visible cohort, not equal-age | estimate from public counts | One current upload had 47,000; the topic result is still exceptional, but age normalization is missing | Refresh and age-match if possible |
| R8 — work relative outlier | [public evidence] Bash’s Leadership Breakdown same-channel context | [topic video](https://www.youtube.com/watch?v=uqgEruWF-fU); [channel videos](https://www.youtube.com/channel/UCTx4RKNTz11kkt7B8nS2ftw/videos) | 104,044 vs median 465 across 15 most-recent visible uploads: ~224× | 2026-07-20 | English; long-form; current 15-upload visible cohort, not equal-age | estimate from public counts | Career-advice audience may not transfer to a science/ideas channel; package may be the breakout cause | Blind-test intended viewer and payoff |
| R9 — work thesis | [public evidence] Status motive and construct boundaries | [Anderson, Hildreth & Howland, 2015](https://pubmed.ncbi.nlm.nih.gov/25774679/) | Review supports status as respect/admiration/voluntary deference, distinct from power, money, and belonging | Durable source checked 2026-07-20 | Cross-cultural literature review / humans | fact from review | Review-level conclusion does not prove every workplace action is status-motivated | Verify which claims and populations support the episode wording |
| R10 — work mechanism | [public evidence] Two routes to rank | [Cheng et al., 2013](https://henrich.fas.harvard.edu/publications/two-ways-top-evidence-dominance-and-prestige-are-distinct-yet-viable-avenues) | Dominance and prestige were distinct viable routes to social rank/influence in two studies | Durable source checked 2026-07-20 | English paper / group studies | fact | Not a universal two-type taxonomy for every organization; dominance/prestige can coexist | Read full methods and constrain workplace application |
| R11 — work stakes | [public evidence] Status conflict and disagreement can harm group functioning | [Bendersky & Hays, 2012](https://pubsonline.informs.org/doi/10.1287/orsc.1110.0734); [Kilduff, Willer & Anderson, 2016](https://www.gsb.stanford.edu/faculty-research/publications/hierarchy-its-discontents-status-disagreement-leads-withdrawal) | Mixed-method status conflict linked to lower performance/information sharing; upward status disagreement linked to reduced contributions | Durable sources checked 2026-07-20 | Group/organizational studies | fact | These findings do not establish a simple individual promotion recipe | Verify effect descriptions and avoid causal overreach beyond designs |
| R12 — work counterevidence | [public evidence] Hierarchy/status conflict effects are conditional | [Bendersky & Hays, 2017](https://journals.sagepub.com/doi/10.1177/1948550616667614); [hierarchy-steepness field study](https://www.tandfonline.com/doi/full/10.1080/1359432X.2016.1148030) | Status conflict sometimes clarified low-agreement hierarchies; hierarchy steepness effects varied with task complexity | Durable sources checked 2026-07-20 | Longitudinal surveys / field study | fact | Prevents “hierarchy bad” or “status conflict always harmful” framing | Include at least one conditional counterexample in script |
| R13 — Sudoku exact-angle demand | [public evidence] History/conquest packages have modest totals, with one small-channel outlier | [Use Whatcha Got](https://www.youtube.com/watch?v=QqucajNKrN8); [The Hindu](https://www.youtube.com/watch?v=3ipNVbxj74s) | 3,196 views (2024-08-23; ~24× its current 15-upload median 134); 37,613 (2020-07-16; channel 2.08M subscribers) | 2026-07-20 | English; 3–6 min; lifetime | fact + relative-outlier estimate | Small cohort and unequal age; The Hindu result is not an outlier for its large channel | Test current history/design package directly |
| R14 — Sudoku adjacent demand | [public evidence] Sudoku secrets and puzzle-brain content can travel | [Numberphile](https://www.youtube.com/watch?v=pezlnN4X52g); [Brut America](https://www.youtube.com/watch?v=7vRxB54SRHs) | Numberphile: 3,675,063 views (2024-01-04), ~27× current 15-upload median 134,000; Brut puzzle-neurology video: 1,044,106 (2020-05-16) | 2026-07-20 | English; 4–6 min; lifetime | fact + relative-outlier estimate | Both promises differ from history/conquest; cannot transfer their totals directly | Verify whether S2 attracts both puzzle and design/history viewers |
| R15 — Sudoku facts/timing | [public evidence] First-party history, rules, portability, and current activity | [Nikoli Sudoku](https://www.nikoli.co.jp/en/puzzles/sudoku/); [Nikoli home](https://www.nikoli.co.jp/en/) | Nikoli says it introduced American “Number Place” in 1984, shortened the name, added symmetry in 1986, and the puzzle is enjoyed in 120+ countries; April 2026 Sudoku reprint listed | Checked 2026-07-20 | Japan/global; English first-party site; durable history/current catalogue | fact as company account | “120+ countries” and popularity are Nikoli’s own claims; Wayne Gould/newspaper spread needs independent primary confirmation | Confirm Dell original, Times launch, and syndication chain from archival sources |
| R16 — Sudoku evidence/caveat | [public evidence] Deductive learning is supported; broad brain benefit is not the angle | [Lee, Goodwin & Johnson-Laird, 2008](https://www.tandfonline.com/doi/abs/10.1080/13546780802236308); [2026 systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC13136012/) | Three experiments supported spontaneously acquired deductive tactics; 2026 review synthesizes neural engagement but does not prove broad life transfer | Checked 2026-07-20 | Academic studies / English | fact | Avoid “Sudoku makes you smarter/younger” | Verify S2 uses reasoning findings only as mechanism, not health promise |
| R17 — salary demand | [public evidence] Pay-transparency explanations reach broad and timely audiences | [CNBC](https://www.youtube.com/watch?v=DWWvCPGkvvU); [Terry Gorry](https://www.youtube.com/watch?v=VMMOSuwlowE) | 592,849 views (2023-01-24); 24,031 (2026-01-11) | 2026-07-20 | English; 7–11 min; lifetime; US/general and Ireland/EU contexts | fact | Raw views are not equal cohorts; legal relevance varies by market | Decide target geography before scripting |
| R18 — salary timing/facts | [public evidence] Current EU transparency rules | [European Commission, 2026-06-05](https://commission.europa.eu/news-and-media/news/new-eu-rules-pay-transparency-explained-2026-06-05_en); [Directive 2023/970](https://eur-lex.europa.eu/eli/dir/2023/970/oj/eng) | EU transposition deadline 2026-06-07; rights include pre-interview pay information and employee information requests; reporting phases vary | 2026-07-20 | EU / English / current law and official explanation | fact | Does not prove transparency automatically raises individual pay; national transposition varies | Check chosen countries’ implementation and legal wording |
| R19 — brain-games demand/opening | [public evidence] Durable but aging explainer supply | [Seeker](https://www.youtube.com/watch?v=O0ArI4EuniE); [SciShow](https://www.youtube.com/watch?v=ADLPNnld_nk); [Dr Jack Close](https://www.youtube.com/watch?v=jj3peBs5GF8) | 222,149 (2013); 586,896 (2015); 14,161 (2022) | 2026-07-20 | English; 2–7 min; lifetime | fact | Older supply supports evergreen interest but not current reachable demand | Run fresh package search/test around the 2026 result |
| R20 — brain-games timing | [public evidence] Specific 2026 cognitive-speed result | [NIH, 2026-02-10](https://www.nih.gov/news-events/news-releases/cognitive-speed-training-over-weeks-may-delay-diagnosis-dementia-over-decades) | NIH reports long-term ACTIVE follow-up in which a specific speed-training condition was associated with delayed dementia diagnosis over 20 years | 2026-07-20 | US older adults / randomized original intervention with long follow-up | fact as NIH summary | Not generic commercial brain games; claims-based diagnosis and intervention specificity matter | Read full 2026 paper and statistical caveats |
| R21 — brain-games counterevidence | [public evidence] General transfer remains contested | [Simons et al., 2016](https://pubmed.ncbi.nlm.nih.gov/27697851/); [commercial-program meta-analysis](https://pubmed.ncbi.nlm.nih.gov/34251578/) | Reviews find limited/uneven evidence for broad transfer and call the commercial evidence base immature | Checked 2026-07-20 | Reviews / English | fact | Makes an honest update compelling but rules out a simple “brain games work” title | Define intervention, outcome, age group, and transfer level precisely |
| R22 — Wordle supply | [public evidence] Exact popularity explainers are modest | [How It Happened](https://www.youtube.com/watch?v=2mBKMA4-AsU); [CBS Sunday Morning](https://www.youtube.com/watch?v=G0MQcgcv6wg) | 21,468 views (2022-02-11); 47,229 (2024-05-19) | 2026-07-20 | English; 3–5 min; lifetime | fact | Modest totals may reflect package/channel/timing, not lack of interest | Test mechanism-led rather than origin-led title |
| R23 — Wordle current demand | [public evidence] Current first-party usage reported by AP | [Associated Press, 2026-01-21](https://apnews.com/article/4ab76097d6155a022f089d03e94807c3) | NYT said Wordle was played 4.2B times and its games 11.2B times in 2025 | 2026-07-20 | Global NYT product / English article / 2025 usage | fact reported by AP from company | Product plays are not video demand; user geography and unique-player count are not given | Confirm first-party annual-report figure and current player distribution |
| R24 — Wordle mechanism | [public evidence] Goal gradient and near-miss responses tested in Wordle | [Dixon et al., 2024](https://www.nature.com/articles/s41598-024-74450-0) | Experimental Wordle task found affect/motivation patterns around progress and near misses | Checked 2026-07-20 | Experimental psychology / English | fact | Does not by itself explain viral adoption or sharing | Keep as one mechanism, not the whole causal story |
| R25 — alternatives/competition | [public evidence] Hard-game and chess packages have current reach, but strong incumbents | [Game Maker’s Toolkit](https://www.youtube.com/watch?v=Ip5pYl-MuYs); [RookMoves Chess](https://www.youtube.com/watch?v=wrMLHPj3Uuo) | Hard-games video: 691,761 views, 2025-09-16; chess-popularity video: 323,308 visible views | 2026-07-20 | English; gaming/chess channels; lifetime | fact | Audience transfer is niche-adjacent and exact shelves already have credible coverage | Build matched cohorts before reconsidering |
| R26 — analytics limitation | [repository fact] No reliable channel history | [STEERING.md](/tmp/why-humans-play-video-topic-skill/whp-youtube/STEERING.md) | Pre-launch; no appeal, engagement, satisfaction, or audience adjacency observations | 2026-07-20 | WHP private analytics | fact | This is the principal reason confidence is medium rather than high | Replace with equal-lifespan WHP comparisons after several uploads |
| R27 — final judgment | [editorial inference] Work status outranks Sudoku as the **next** episode | R1, R5–R16 and score/package tables above | Six-point score gap after package reranking; work wins demand transfer, satisfaction, and pilot fit; Sudoku wins opening, evidence, and ease | 2026-07-20 | Cold-start editorial comparison | inference | A blind package test could reverse it; no performance guarantee | Run V2 before committing the script |

## Pre-script verification

| status | unresolved item and category | owner | evidence needed | how the result could change the recommendation |
|---|---|---|---|---|
| open | **V1 — Verify the bounded “second scoreboard” claims (load-bearing claims).** | Editorial researcher | Read the full methods/results for R9–R12; produce a claim-to-source sheet distinguishing status, power, pay, prestige, dominance, status conflict, and status disagreement; include at least one coordination benefit/counterexample. | If the episode cannot support the mechanism without implying universal promotion causality, narrow the thesis or promote Sudoku. |
| open | **V2 — Blind-test W1 against Sudoku S2 (package/current audience).** | Producer/researcher | Show title/thumbnail mockups plus one-sentence payoff—without channel labels—to a small but relevant sample of English-speaking workers/general-interest viewers; record forced choice, unaided expected payoff, and “generic self-help?” interpretation. | This is the decisive test. Clear Sudoku superiority or persistent misclassification of W1 promotes Sudoku; a close result leaves the evidence-based winner unchanged. |
| open | **V3 — Refresh the public comparison (current metrics/timing).** | Editorial researcher | Recheck R5–R8 and R13–R14 counts, dates, direct competitors, and any accessible equal-age cohorts; run Google Trends YouTube Search consistently if it becomes auditable. | A broader cohort that removes the apparent work-status outliers, or strong exact-angle Sudoku trajectory, can reverse the order. |
| open | **V4 — Confirm the visual and rights plan (rights/access/production).** | Producer | Confirm licensed office B-roll, ability to stage a performance-review/meeting, and legibility of the two-scoreboard thumbnail at phone size; avoid real employer logos/data. | Failure lowers feasibility/package scores; if the core visual cannot read instantly, retest W3 or move to Sudoku’s simpler grid package. |

## Completeness audit

| # | Check | yes/no | Pointer/evidence |
|---:|---|---|---|
| 1 | At least 30 diverse subjects considered | yes | Candidate landscape: 34 subjects across five lane groups; rows 1–34. |
| 2 | Subjects converted into materially different angles | yes | Candidate rows `a/b` for 11 promising subjects; differences change stakes, evidence, or payoff. |
| 3 | All six hard gates applied at angle level | yes | Every candidate row lists G, H, Pay, E, Prod, and Port as pass/fail/unknown. |
| 4 | Multiple independent signals used for every winner-eligible finalist; any uncorroborated finalist marked ineligible | yes | Finalists use R5–R12, R13–R16, R17–R18, R19–R21, and R22–R24 respectively; uncorroborated ideas do not enter the shortlist. |
| 5 | Volatile evidence dated and contextualized | yes | R4–R8, R13–R14, R17, R19, R22–R23, R25 include 2026-07-20 observation date, upload dates where available, format/window, and geography limits. |
| 6 | Trends, raw views, outliers, and missing data interpreted correctly | yes | Decision frame limitations; R4 unavailable Trends; R5–R8/R13–R14 raw-view and unequal-age caveats; no absolute search-volume claim. |
| 7 | Scores total correctly and include grades plus uncertainty | yes | Ranked-shortlist arithmetic line verifies all five totals; every criterion has a letter grade and every row names a decisive risk. |
| 8 | Three packages supplied for each top-three finalist | yes | Packaging table contains exactly W1–W3, S1–S3, and P1–P3: nine directions. |
| 9 | Package promise matches delivered payoff and post-test reranking occurred | yes | `survives honestly?` column rejects W2/P1; post-test adjustment table shows rescoring and ranks 1–3. |
| 10 | One winner named before analysis, unless responsibly insufficient evidence is explicitly marked incomplete | yes | Decision block names workplace status before all analysis. |
| 11 | Runner-up loss explained directly | yes | Same-frame workplace-status vs Sudoku table plus reversal condition. |
| 12 | No fabricated observation, guarantee, or unsupported load-bearing claim | yes | Unknown analytics/Trends are explicit; observations, estimates, and inference are labeled in R1–R27; decision is medium-confidence and contains no view forecast. |
```

</details>

#### Twelve-check result and exact evidence

| # | Result | Exact observable excerpt | Independent audit basis |
|---:|:---:|---|---|
| 1 | pass | “**Mode:** cold-start”; “Global English-language, general-interest browse audience; a narrower geography was not supplied.”; “exact budget, shoot date, and access beyond ordinary office/stock/graphic assets are unknown.” | Records 2026-07-20, user-supplied and unknown frame fields, solo/format constraints, missing publication date, and mode. |
| 2 | pass | “Zero published videos and zero subscribers; no locked current episode”; “the evolutionary paradox of play is a parked, later `Why We Play` draft” | Names revision and direct doctrine/state paths, checks published/current/parked/backlog subjects, and records that neither supplied finalist is committed. |
| 3 | pass | “**Pool:** 34 distinct subjects across actual games/design (12), play/learning (6), work/institutions (7), AI/digital culture (6), and philosophy/future (3).” | The group counts sum to 34; numbered subjects remain distinct while 11 `a`/`b` pairs are counted as multiple angles, not extra subjects. Ten survive shallow scan and five reach deep research. |
| 4 | pass | “**Promising subjects developed into multiple angles:** 11.” | The `a`/`b` pairs change evidence, payoff, or central tension—for example Sudoku portability versus an unsupported health claim, and bounded workplace status versus universal promotion causality. |
| 5 | pass | “Actual puzzle / current finalist”; “Game history / institutions”; “Actual game / public breakout” | Sudoku is the runner-up and deep finalist; Wordle is another finalist; chess, Tetris, Monopoly history, poker, offside, speedrunning, and D&D receive substantive angle records. |
| 6 | pass | “Gate key: `G` game/play centrality; `H` human revelation; `Pay` recognized payoff; `E` evidence path; `Prod` production reality; `Port` portfolio fit.” | All rows explicitly spell pass/fail/unknown for all six gates; unverified, overclaiming, off-doctrine, duplicated, and production-unknown angles do not advance to scoring. |
| 7 | pass | “Three independently operated career channels produced exact office-politics/rules videos roughly 84×, 118×, and 224× their respective current 15-upload medians” | R5–R12 combine three creator cohorts with primary research and counterevidence; R13–R24 separately corroborate each other finalist's demand, supply, thesis, and limitations. |
| 8 | pass | “Google Trends in YouTube Search mode was unavailable in an auditable form”; “public YouTube views are lifetime outcomes”; “recent-channel cohorts were not age-normalized” | No normalized index is fabricated, raw views and relative-outlier estimates remain distinct, unequal-age caveats stay visible, and missing private analytics lowers confidence rather than becoming zero evidence. |
| 9 | pass | “fact + relative-outlier estimate”; “[editorial inference] Work status outranks Sudoku as the **next** episode” | R1–R27 include direct links/files, dates, scope, fact/estimate/inference classification, counterevidence, and claim-to-verify fields; volatile counts are dated 2026-07-20. |
| 10 | pass | “Scores are editorial structure, not forecasts.”; “**E fail**—reductive mechanism”; “**E fail**—unsupported load-bearing claim” | The exact 60/40 reach-to-rigor scorecard is applied only after gates; dopamine and AI-consciousness bait remain visible but cannot bypass evidence or portfolio rigor. |
| 11 | pass | “Exactly three materially different directions were tested for each top-three finalist.”; “**no — overpromises promotion causality**” | Workplace status, Sudoku, and salary secrecy have nine distinct directions; bait is rejected, a changed Sudoku package triggers all-six-gate rerun, and scores/ranks are exposed after testing. |
| 12 | pass | “**Winner:** Workplace status”; “Sudoku wins defensibility. It still loses the next-slot decision because the six-point overall gap comes from exact reach transfer, payoff, and pilot fit” | One winner leads; the runner-up comparison uses the same frame and states the evidence/feasibility tradeoff plus multiple precise reversal conditions. |

The five totals independently recompute to `83`, `77`, `76`, `74`, and `73`. The candidate lane
counts independently sum to 34, and the package table contains exactly W1–W3, S1–S3, and P1–P3.

#### Baseline comparison

Scenario C moves from 4 pass / 5 partial / 3 fail to 12 pass. The baseline's four-subject bespoke
model becomes a 34-subject, gate-first search with five fixed-weight finalists. It now reads current
WHP state, explicitly uses cold-start mode, dates and classifies observations, separates raw views
from imperfect cohort estimates, and tests nine honest packages before reranking. The winner changes
from Sudoku to workplace status, but the reason is observable rather than doctrinal favoritism:
workplace status wins exact-promise reach transfer, delivered usefulness, and required pilot
sequence, while the response openly gives Sudoku the better opening, evidence, and equal feasibility
and names the blind package test that could reverse the choice.

## Cross-scenario before/after

| Dimension | No-skill baseline | Governed-workflow forward tests | Observable change |
|---|---|---|---|
| Candidate breadth | A: 5 subjects; B: 5; C: 4 | A: 34; B: 35; C: 34, with 10 shallow survivors and 5 deep finalists each | All runs diverge beyond 30 across literal games, history, hidden games, play/learning, institutions, AI/digital culture, and philosophy before narrowing. |
| Decision frame / mode | A partly implied cold start; B and C omitted the named mode; market, constraints, or dates were incomplete | All record 2026-07-20, target language/market or its absence, publication/production constraints, unavailable inputs, and `cold-start` rationale | Missing context becomes explicit `unknown` rather than an assumption. |
| Angle development / gates | Filmable winner angles, but no consistent six-gate audit and no reliable portfolio-duplication check | Material alternate angles for promising subjects; every displayed angle has centrality, revelation, payoff, evidence, production, and portfolio outcomes | Failed/unknown angles are visibly excluded before scores; parked/current work is checked. |
| Evidence provenance | Useful links and caveats, but volatile observations and competitive inferences were inconsistently dated/classified | Stable R-ledgers link direct sources/files and record date, geography/language/format/window, fact/estimate/inference, counterevidence, caveat, and verification need | Competition and uncertainty are auditable rather than implied. |
| Score consistency | A and B unweighted; C bespoke 1–5 weights with no explicit demand criterion | Every run uses 25/15/20/15/10/10/5; independently recomputed totals are A 85/81/79/74/73, B 87/81/79/74/73, C 83/77/76/74/73 | Reach-facing criteria remain 60/100 without overriding hard gates; arithmetic and grades are visible. |
| Package testing | One developed winner package per baseline response; no comparable top-candidate stress test | Nine directions per run, exactly three for each top-three finalist; honest/bait judgment, delivered payoff, pre/post package and satisfaction scores, and post-test ranks shown | Packaging becomes decision evidence rather than decoration after selection. |
| Uncertainty | Caveats appeared, but unknown analytics and material competitive uncertainty were not systematically carried through the decision | All three use medium confidence, list missing private/Trends/cohort data, expose decisive risk and counterevidence, and name falsifiers plus pre-script checks | Missing evidence lowers confidence and creates a test; it is never converted into invented precision. |
| Decisiveness | All baseline runs selected one winner and explained a nearest alternative, their strongest shared behavior | All forward runs lead with one winner, compare the runner-up on the same score/evidence/package frame, and give a concrete reversal condition | Decisiveness is preserved while the reason becomes reproducible and testable. |

## Historical refinements and verdict

**No Task 5 skill refinement was made in the historical campaign.** Behavioral testing produced 36 passes, 0 partials, and
0 failures on the unchanged twelve-check rubric. The independently checked counts, arithmetic,
packages, provenance, uncertainty handling, and winner/runner-up language matched the artifacts;
therefore no observable failure justified changing `SKILL.md`, `references/research-method.md`,
`references/output-contract.md`, or `agents/openai.yaml`. Making a speculative change without a
behavioral failure would weaken the test-driven boundary rather than refine it.

| Skill change caused by behavioral testing | Failure addressed | Affected-scenario rerun outcome |
|---|---|---|
| **None** | No material partial or fail appeared in A, B, or C | No rerun was required; the original fresh runs all scored 12/12 |

**Historical verdict: pass but superseded; corrected-tree campaign captured; independent final
review pending.** The first governed workflow
produced consistent observable breadth, context, gate, competition, provenance, scoring, and
package-testing behavior across all three adversarial scenarios, relative to the context-denied
unguided baseline. This historical verdict covers the first end-to-end workflow and the decision
quality visible in those reports; it neither isolates the causal effect of `SKILL.md` text alone nor
claims that any selected topic will achieve a particular performance result. It must not be used as
final acceptance evidence for the rebased and corrected skill. The current evidence is the five
durable artifacts linked in the corrected-tree capture section; no final `36/36` or
`Implemented and verified` status is assigned until their independent rubric review is recorded.
