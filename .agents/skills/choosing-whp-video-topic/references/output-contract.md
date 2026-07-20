# WHP Recommendation Output Contract

## Contents

- [Output rules](#output-rules)
- [Required recommendation heading order](#required-recommendation-heading-order)
- [Decision](#decision)
- [Decision frame](#decision-frame)
- [Candidate landscape](#candidate-landscape)
- [Ranked shortlist](#ranked-shortlist)
- [Packaging stress test](#packaging-stress-test)
- [Winner brief](#winner-brief)
- [Why the runner-up lost](#why-the-runner-up-lost)
- [Research trail](#research-trail)
- [Pre-script verification](#pre-script-verification)
- [Completeness audit](#completeness-audit)
- [Boundaries](#boundaries)

## Output rules

Use this contract only to compose and audit the user-facing recommendation. Use
[research-method.md](research-method.md) for research procedure, source and query rules, hard-gate
application, score calibration, packaging evaluation, and evidence confidence. Keep canonical WHP
doctrine in the repository files that own it.

Make the answer decision-first and scannable. Put the decision before method, tables, or caveats,
then retain enough provenance for a reader to inspect every load-bearing judgment. Use the required
fields strictly while adapting prose length to the available evidence. Use these terms consistently:
**subject**, **angle**, **gate**, **finalist**, **package direction**, **winner**, **evidence grade**,
and **confidence**.

Do not promise performance. Do not fabricate an observation, fill an unknown with an assumption, or
hide contradictory evidence. Do not expose sensitive private analytics beyond the minimum aggregate
observation needed to explain the decision.

## Required recommendation heading order

Use these headings verbatim and in this exact order for every complete recommendation. Put no
executive summary, method note, or preamble before `## Decision`.

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

Use the same structure when the evidence cannot responsibly support a winner. Label the first
section **Incomplete research result**, do not fabricate a winner, state the minimum missing
evidence, and mark the affected audit items `no`. If evidence supports two or more viable finalists
but does not separate them, name one provisional winner and the smallest decisive test; a supported
tie is not an incomplete result.

## Decision

Lead with a compact decision block containing every field below:

```markdown
**Decision status:** Winner selected | Provisional winner | Incomplete research result
**Winner:** [exact subject — exact angle] | None responsibly supported
**Confidence:** high | medium | low
**Why it wins now:** [one sentence]
**Strongest honest title/thumbnail promise:** [working title + visual promise]
**Mode:** cold-start | channel-aware
```

For an incomplete result, replace the winning reason and package promise with the reason no
gate-passing winner can yet be supported. Add **Minimum missing evidence** immediately below the
block. Keep the limitation specific enough to resolve.

## Decision frame

Use one compact table. Record `unknown`, `not supplied`, or `unavailable` instead of omitting a
field.

| Field | Required value |
|---|---|
| Research and decision date | Date of the run and, if different, the decision date |
| Target market and language | Intended viewer market, geography, and language |
| Desired publication window | Target date/window and any timing dependency |
| Evidence mode | `cold-start` or `channel-aware`, with a one-line reason |
| Production, timing, and format constraints | Budget, access, presenter, duration/format, schedule, and immovable constraints |
| WHP files read | Direct repository paths and relevant revision/date where useful |
| Episode state checked | Published, current, drafted, parked, and committed subjects or episodes checked |
| Supplied private analytics used | Decision-relevant aggregate observations only; state `none` when none were supplied |
| Unavailable private analytics | Missing channel evidence and its decision impact; never request credentials |
| Public evidence scope | Observation window, geography, language, platform, and format |
| Research/tool limitations | Inaccessible tools, personalized results, missing sources, and other unavailable evidence |

## Candidate landscape

State the pool count visibly before any collapsible content. Consider at least **30 deliberately
diverse subjects**, grouped by WHP lane or signal seed, and identify the source or seed for each.
Do not present an ungrounded brainstorm as a candidate pool. Keep conspicuous but rejected trend
bait in the record so the decision does not look selectively curated.

For every promising subject, show at least two materially different angles. Keep gate decisions at
the angle level: record all six gate outcomes and a concise reason for any `fail` or `unknown`.
Identify the **8–12 shallow-scan survivors** and the roughly **five deep-research finalists**.

Use this compact row shape; create separate rows for materially different angles:

```text
# | WHP lane or signal seed | subject | source/seed | exact angle
all-six gate results + concise rejection reason | disposition
```

Use `disposition` values such as `rejected`, `shallow-scan survivor`, and `deep-research finalist`.
If the table is long, place the full pool in a `<details>` block, but keep the total count, lane/seed
summary, survivor count, finalist count, and rejected-trend-bait count visible above it. Never use
collapsing to hide a short pool or missing rejections.

## Ranked shortlist

Rank roughly five gate-passing finalists **after** package-driven rescoring and reranking. Use these
exact columns:

```text
rank | subject | exact angle | demand /25 | opening /15 | package /20
satisfaction /15 | WHP /10 | evidence /10 | feasibility /5
total /100 | overall confidence | decisive risk
```

In the rendered Markdown table, keep all thirteen columns in that order. Show every criterion as
`integer score/evidence grade`, for example `19/B`, so all seven criterion-level grades remain
visible. Use `0/unknown` for a wholly unsupported component; for a partly supported criterion, score
only the supported case and name the unknown component in the cell or rationale.

Check every `/100` total arithmetically against its seven component scores. Do not average letter
grades, convert them to numbers, or imply fake precision. Put one concise, cited rationale for each
finalist immediately below the table, naming the decisive support and largest uncertainty. Point to
research-trail rows rather than repeating the underlying evidence.

## Packaging stress test

Provide exactly three genuinely different title/thumbnail directions for each of the top-three
finalists: **nine directions total**. Use these exact columns:

```text
finalist | direction | working title | intended viewer | familiar element
surprise/tension | visual promise | delivered payoff | survives honestly?
```

Mark `survives honestly?` as `yes` or `no`, explain a `no` briefly, and visibly identify the
strongest surviving direction for each finalist. Synonym swaps and cosmetic thumbnail changes do
not count as different directions.

Immediately after the nine-row table, expose the post-test adjustment in a compact table:

```text
finalist | strongest surviving direction | thesis changed? / gate rerun result
package score before -> after | satisfaction score before -> after
post-test rank | winner-eligible?
```

If a package changes the thesis, intended audience, evidence path, or payoff, rerun all gates before
rescoring it. Rescore package and satisfaction from the strongest honest surviving direction, then
rerank. A finalist with no viable honest package is ineligible to win. Never silently preserve its
pre-test score or rank.

For each top-three finalist, add one sentence stating the earned reframe and at least two plausible
adjacent follow-up episodes. Treat series potential only as a tiebreaker and coherence check, never
as a score override.

## Winner brief

Use a compact field/value table or equally scannable labeled blocks. Include every field:

| Field | Required content |
|---|---|
| Exact subject and angle | The same winner named in `## Decision` |
| Working logline | One sentence serving the whole episode |
| Intended viewer | A concrete viewer beyond existing followers |
| Why now | Classify as evergreen, growth, seasonal, or news-driven and explain the timing |
| Familiar entry point and central tension | What earns recognition and opens the question |
| Game/play mechanism | The mechanism central to the angle |
| Human revelation and stakes | What the mechanism reveals and why a person should care |
| Useful or earned payoff | What the viewer can understand, see, or do differently |
| Why unmistakably WHP | A concise fit explanation with repository pointer; do not copy doctrine |
| Strongest reach evidence and competitive opening | The decisive demand/reach and supply-gap observations with ledger pointers |
| Factual evidence backbone and caveats | Load-bearing factual sources, counterevidence, and claim limits |
| Strongest honest package direction | Working title, thumbnail/visual promise, and delivered payoff |
| Production approach and feasibility | Access, visuals, rights, format, timing, and execution constraints |
| Evidence confidence and largest uncertainty | `high`, `medium`, or `low`, plus the uncertainty most likely to matter |
| Falsifier | The condition or observation that would change the recommendation |
| Claims/data to verify before scripting | Only unresolved load-bearing checks, linked to the verification checklist |
| Adjacent follow-ups | Two specific episode subjects and angles that extend the sequence |

For an incomplete result, keep the table but mark unsupported winner-dependent fields `not
applicable—no responsible winner`; use the remaining fields to explain the evidence gap and the
minimum path to a decision.

## Why the runner-up lost

Compare the runner-up directly with the winner on the same decision frame. Do not substitute a
generic weakness list. Cover:

- the decisive score and evidence-grade differences;
- the strongest-package and delivered-payoff difference;
- the WHP, evidence, and feasibility tradeoff;
- why the runner-up is not the best **next** episode now; and
- the new evidence, timing change, or reframe that could reverse the decision.

Prefer a small `dimension | winner | runner-up | why decisive now` table followed by the reversal
condition. For an incomplete result with no responsibly supported pair, state that no valid
winner/runner-up comparison exists and identify the missing evidence that prevents it; do not invent
relative weaknesses.

## Research trail

List every decision-relevant observation used in a gate, score, package judgment, winner claim, or
runner-up comparison. Give rows stable identifiers such as `R1`, `R2`, and `R3` within the first
column so other sections can point back without duplicating evidence. Use these exact columns:

```text
candidate/criterion | claim or signal | direct source URL/repository file
observed value | observation date | geography/language/format/window
fact/estimate/inference | counterevidence/caveat | claim to verify
```

Link direct videos, papers, datasets, official pages, or repository files rather than search-result
pages. Tag each `claim or signal` as `[public evidence]`, `[supplied private observation]`,
`[repository fact]`, `[third-party estimate]`, or `[editorial inference]`. For private observations,
describe only the aggregate signal required for the decision and use `supplied privately—raw data
not retained` instead of exposing or linking sensitive material.

Separate observed values from interpretation. Date and contextualize volatile observations. Label
third-party estimates and editorial inferences explicitly. Include contradictory evidence,
unavailable evidence that affected confidence, and every load-bearing claim still requiring
verification. For an unavailable observation, use `unknown/unavailable` rather than manufacturing a
value and state its decision impact in the caveat column.

## Pre-script verification

Create an actionable checklist containing only unresolved, decision-relevant work in these
categories: load-bearing claims; rights, access, or visuals; current metrics or timing; and
production assumptions. This is not a script outline.

Use one row per action:

```text
status | unresolved item and category | owner | evidence needed
how the result could change the recommendation
```

Start each item with a concrete verification verb. Assign an owner or explicitly mark one
`unassigned`. Specify the document, observation, permission, test, or confirmation needed—not
merely “research more.” Explain whether failure would lower confidence, change the angle/package,
move timing, promote the runner-up, or force an incomplete result. If no unresolved item remains,
state `None` and point to the research-trail evidence that closed the checks.

## Completeness audit

Finish with an explicit audit table using `yes` or `no`—never `partial`—and a precise section,
table, row, source, or calculation pointer for every check.

| # | Check | yes/no | Pointer/evidence |
|---:|---|---|---|
| 1 | At least 30 diverse subjects considered |  |  |
| 2 | Subjects converted into materially different angles |  |  |
| 3 | All six hard gates applied at angle level |  |  |
| 4 | Multiple independent signals used per finalist, or reduced confidence disclosed |  |  |
| 5 | Volatile evidence dated and contextualized |  |  |
| 6 | Trends, raw views, outliers, and missing data interpreted correctly |  |  |
| 7 | Scores total correctly and include grades plus uncertainty |  |  |
| 8 | Three packages supplied for each top-three finalist |  |  |
| 9 | Package promise matches delivered payoff and post-test reranking occurred |  |  |
| 10 | One winner named before analysis, unless responsibly insufficient evidence is explicitly marked incomplete |  |  |
| 11 | Runner-up loss explained directly |  |  |
| 12 | No fabricated observation, guarantee, or unsupported load-bearing claim |  |  |

Correct every `no` before delivery unless genuinely unavailable evidence makes correction
impossible. In that exception, disclose the limitation, lower confidence, list the minimum evidence
needed, and leave the affected item `no`. If the remaining evidence cannot support any responsible
winner, return an incomplete research result rather than weakening the audit or fabricating a
decision.

## Boundaries

Stop at the recommendation, exact angle, working package directions, evidence-backed winner brief,
and verification actions. Do not provide a full script, scene outline, finished thumbnail, view
forecast, performance guarantee, paid-tool requirement, or request for credentials. Keep this
contract free of current metrics and fixed candidate recommendations.
