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

Select and record one mode before collecting signals:

- Use **channel-aware mode** when the user supplies meaningful private YouTube data for the decision. Combine that supplied private analytics with current public evidence and current repository evidence; none is sufficient alone.
- Use **cold-start mode** when private YouTube data is absent, sparse, stale, or not decision-useful. Continue with current public and repository evidence, and lower confidence where channel-specific evidence is missing.

Never request credentials or authenticated account access. Do not store, commit, quote unnecessarily, or otherwise retain private analytics beyond the run. Never invent missing analytics, audience traits, baselines, or repository state.

If a relevant source or datum is unavailable, record it as `unknown`, state the limitation and its decision impact, and continue in reduced-confidence mode. Do not block solely because private or live data is unavailable.

## Signal collection order

Recommendations are time-sensitive. Research current conditions, record the research date, and distinguish fresh observations from older durable evidence.

In **channel-aware mode**, prioritize supplied evidence in this order:

1. YouTube Studio Trends signals relevant to the target market and language;
2. Audience tab evidence, including what the supplied audience watches and searches for;
3. Advanced Mode comparisons by video, format, geography, traffic source, and time where supplied;
4. comments, community polls, and repeated audience questions in the supplied material; and
5. prior WHP patterns in appeal, engagement, and satisfaction, interpreted in the context of topic, package, format, age, and distribution.

Then test those channel signals against current public YouTube, public trend, factual, timing, competitive, and repository evidence. Private analytics inform the reachable audience; they do not excuse weak public validation or a weak WHP angle.

In **cold-start mode**, prioritize:

1. public YouTube results for the subject and exact angle family;
2. relative outliers within same-format, reasonable-age, and reasonable-channel cohorts;
3. Google Trends in **YouTube Search** mode;
4. adjacent creators and neighboring audience interests;
5. audience language, recurring questions, misconceptions, and unmet explanations;
6. current events, releases, anniversaries, competitions, and other timing hooks; and
7. evidence of evergreen durability after any immediate hook passes.

Use first-party platform documentation to interpret platform metrics and primary factual sources for load-bearing claims in the human thesis. Use high-quality secondary sources to orient the search or establish context, not to replace an available primary source. Treat YouTube Inspiration, personalized recommendations, autocomplete, and other AI-generated suggestions as leads that require independent verification.

### Practical query patterns

Adapt vocabulary, spelling, market, and language to the decision frame. Search synonyms and the audience's wording, not only the researcher's preferred terms.

| Research need | Practical query patterns and checks |
|---|---|
| Audience wording and questions | Search `why does <subject>`, `how does <subject> work`, `<subject> explained`, `<subject> makes no sense`, `is <common belief> true`, and repeated phrases from comments, polls, forums, Q&A pages, and supplied audience material. Preserve exact recurring wording as audience language, but verify any factual premise separately. |
| Public YouTube demand and comparable videos | Search YouTube for `<subject>`, `why <subject>`, `history of <subject>`, `<mechanism> explained`, and several exact-promise variants. Separate long-form from Shorts; record upload age, format, channel baseline, promise, and visible outcome for a cohort rather than selecting only the largest result. |
| Competitive supply and angle saturation | Search exact and synonymous title promises, then inspect whether recent credible videos already deliver the same thesis, viewer payoff, and visual promise. Distinguish a crowded subject from a saturated angle; note quality gaps, stale coverage, missing evidence, and misleading packages. |
| Relative outlier cohorts | Build a cohort of same-format videos of comparable age from each channel. Compare each video with a reasonable baseline such as that channel's recent same-format median, and repeat across multiple relevant channels. Investigate package, timing, distribution, and creator effects before attributing the breakout to the subject. |
| Google Trends comparisons | Compare a small set of stable terms or Topics in **YouTube Search** while keeping geography, language interpretation, category, and time window consistent. Re-run ambiguous terms and separate evergreen level, sustained growth, recurring seasonality, and a one-off spike. Record whether the query is a Search term or Topic. |
| Primary sources for the human thesis | Combine `<claim> study`, `<claim> review`, author/title/DOI searches, and searches of relevant universities, journals, official rules bodies, museums, archives, public agencies, event organizers, or original datasets. Trace summaries back to the underlying paper, record, rules, or data. |
| Timing, news, and seasonality | Search `<subject> <current year>`, official schedules, releases, rule changes, tournaments, anniversaries, calendars, and recent primary announcements. Verify the event date and target-market relevance, then ask whether the angle remains useful after the hook. |
| Adjacent follow-up and series potential | Search the subject's neighboring mechanism, history, community, institution, and consequence; inspect credible related questions and adjacent videos. Identify follow-ups that deepen the WHP lens rather than repeat the same premise with a new noun. |

### Comparison rules

- Google Trends values are normalized **relative interest**, not absolute search volume.
- A Google Trends value of `100` is a local peak within the selected geography, window, and comparison; it is not “maximum demand.”
- Raw public view counts are outcomes for particular videos, channels, packages, and distribution contexts—not cross-channel demand estimates.
- Compare outliers within the same format and a reasonable video-age and channel baseline.
- Treat a breakout as a research lead, not causal proof that the subject caused the views.
- Treat Shorts content gaps as adjacent clues, not a guarantee for long-form demand or performance.
- Treat personalized and AI-generated suggestions as leads, not evidence by themselves.
- Separate evergreen demand, sustained growth, recurring seasonality, and short-lived news spikes.
- Never present a third-party estimate or editorial inference as an observed fact.
- No candidate advances or wins on one signal, source, breakout, metric, or anecdote.

## Candidate lane map

Generate at least **30 distinct subjects** before ranking or pruning. Deliberately span multiple lanes rather than filling the pool with semantic variants of one fashionable idea:

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

Do not require every lane in every run or use lane coverage as a mechanical quota. Require deliberate range, multiple independent seeds, and continued generation past the first obvious cluster. Merge synonyms and near-duplicates before counting. Keep intelligence as one lane in the candidate universe, not the definition of the WHP brand.

## Subject-to-angle development

For every promising subject, develop at least **two materially different angles**. A materially different angle changes the central tension, human stake, evidence spine, or payoff—not merely the title wording.

For each angle, identify:

- the familiar entry point;
- the tension, puzzle, or misconception;
- the recognizable human stake;
- the earned payoff or reframe;
- the likely evidence backbone; and
- the intended viewer beyond existing followers.

Use this canonical distinction:

- **Subject:** `Sudoku`
- **Angle:** `How Sudoku conquered the world—and what its nearly perfect rules reveal about human puzzle hunger`

This is an example of subject-to-angle specificity, not a default winner or recommendation.

Build each angle through the editorial bridge defined in the core skill:

```text
familiar game, event, person, institution, or trend
    + game/play mechanism
    + recognizable human stakes
    + evidence-backed surprise, use, or reframe
```

A weak angle does not automatically disqualify its subject. Reframe it through a different tension, stake, or evidence path, then apply all six hard gates again to the new angle.

## Shallow and deep research

Use staged research so breadth is preserved before costly investigation.

### Shallow scan

Apply all six hard gates—game/play centrality, human revelation, recognized payoff, evidence path, production reality, and portfolio fit—to every advancing angle. Record `pass`, `fail`, or `unknown` with a brief rationale for each gate. Do not score an angle with a failed gate; treat an unknown gate as not yet passed.

Use quick, independent checks of demand, competitive supply, timing, evidence availability, production reality, and repository duplication. Reduce the eligible pool to roughly **8–12 candidates**. The shallow scan removes clearly weak angles; it must not crown a winner from superficial signals.

### Deep research

Deeply research only the finalists. Seek independent evidence for:

- audience interest, reachable market, and trajectory;
- competitive supply, existing angle quality, and a credible opening;
- comparable relative breakouts within valid cohorts;
- audience language, recurring questions, and misconceptions;
- multiple honest packaging directions;
- factual support, contradictory evidence, and necessary caveats;
- production needs, access, visuals, expertise, and timing; and
- a coherent episode sequence and plausible follow-ups.

After deep research, re-audit the gates and rank a shortlist of roughly **five exact angles** with the scorecard below. Preserve contradictions and uncertainty rather than forcing all observations to agree.

## Evidence ledger

For every volatile observation, capture:

```text
claim or signal | source URL/file | observed value | observation date
geography | language | format | comparison window | fact/estimate/inference
```

Also record the observation's contradiction or counterevidence, caveat, unavailable evidence, `claim-to-verify`, and the score criterion it supports. Timestamp the research run and every volatile metric or result sufficiently to make later checking possible.

Keep **observation** separate from **interpretation**. For example, record the visible count, upload date, and channel cohort as observations; record “possible demand for this angle” as an inference. Label estimates and editorial judgments explicitly.

Link to the direct video, platform page, primary record, paper, dataset, repository file, or official announcement whenever one exists. Do not cite a search-results page as support when a direct source is available. Preserve unavailable and conflicting evidence in the ledger instead of omitting it.

## Reach-weighted scorecard

Score only angles that pass all six hard gates. Use these exact weights:

| Criterion | Weight |
|---|---:|
| Audience demand and reachable market | 25 |
| Competitive opening or content gap | 15 |
| Packaging strength and immediate appeal | 20 |
| Likely satisfaction, usefulness, and shareability | 15 |
| Strength of the WHP lens | 10 |
| Evidence quality and defensibility | 10 |
| Production feasibility and sequence | 5 |

Use these exact integer anchors:

| Weight | Unsupported | Weak | Mixed | Strong | Exceptional |
|---:|---:|---:|---:|---:|---:|
| 25 | 0 | 6 | 13 | 19 | 25 |
| 20 | 0 | 5 | 10 | 15 | 20 |
| 15 | 0 | 4 | 8 | 11 | 15 |
| 10 | 0 | 3 | 5 | 8 | 10 |
| 5 | 0 | 1 | 3 | 4 | 5 |

Use an intermediate integer only when the rationale explains why the evidence falls between two anchors. Do not use decimals or adjust the weights for a preferred candidate.

Grade evidence independently from score:

- **A:** direct first-party or primary evidence, or several strong convergent observations;
- **B:** credible indirect evidence with a meaningful limitation;
- **C:** weak proxy, sparse evidence, unresolved conflict, or editorial inference; and
- **unknown:** unavailable evidence, never silently converted to zero.

For every criterion, record the integer score, evidence grade, one-sentence rationale, cited ledger observations, and largest uncertainty. A high editorial score can carry a weak evidence grade; expose that difference instead of using the score as a confidence proxy.

If evidence is unknown, award no unsupported points. Mark the missing component and grade explicitly as `unknown`, lower overall confidence, and distinguish “zero points awarded pending evidence” from observed evidence that the opportunity is absent. If a criterion has both supported and unknown components, score only the supported case and state how the unknown limits the result. Never hide unknown inputs inside a precise-looking total.

The three reach-facing criteria—audience demand and reachable market, competitive opening or content gap, and packaging strength and immediate appeal—total **60 points**. This reach emphasis structures editorial judgment; it does not forecast views, and it can never override a failed hard gate.

## Packaging stress test

For each of the top-three finalists, create **three genuinely different title/thumbnail promises**. Do not count synonym swaps or cosmetic thumbnail variations as different directions.

For every direction, state:

- the intended viewer;
- the familiar element that earns recognition;
- the unexpected element;
- the open question or tension;
- the visual promise made by the title/thumbnail pair; and
- the payoff the finished episode will actually deliver.

Reject bait that would attract a materially different audience from the episode's real thesis or leave the intended viewer unsatisfied. The most clickable promise is ineligible if the central evidence cannot honestly deliver it.

For each top-three finalist, also write a one-sentence **earned reframe** and at least **two plausible follow-up episodes**. Use series potential only as a tiebreaker and coherence check; it cannot rescue weaker reach evidence, failed gates, or an undeliverable package.

## Error handling and confidence

Assign confidence as `high`, `medium`, or `low` from evidence convergence and availability, not from total score:

- **High:** multiple independent, current, appropriately comparable signals converge across reach, factual support, and execution, with no unresolved conflict that threatens the central promise.
- **Medium:** the main case is supported, but one meaningful source is indirect, sparse, older, weakly comparable, or in tension with another observation.
- **Low:** evidence is unavailable, heavily personalized, sparse, poorly comparable, dominated by inference, or materially conflicting.

Timestamp volatile data, display conflicts, and reduce confidence when evidence depends on personalized results, a small comparable cohort, third-party estimates, or uncertain audience transfer. Do not inflate confidence because a candidate has the highest score.

If finalists tie or the evidence is inconclusive, still choose one **provisional winner**. Name the smallest decisive test or missing datum that could reverse the decision, such as a targeted audience poll, a broader comparable cohort, a factual-source check, or a package test.

The central title-and-thesis promise must survive reasonable verification before scripting. Do not guarantee views, imply causal certainty from correlations, or use false precision in reach, performance, or confidence claims.

If live research is unavailable, use supplied evidence and repository evidence as a reduced-confidence fallback. Disclose which current signals could not be checked, explain the likely decision impact, and list the evidence that must be gathered before scripting.
