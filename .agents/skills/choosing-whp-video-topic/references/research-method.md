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

1. YouTube Studio Trends evidence, including supplied search signals relevant to the target market and language;
2. Audience tab evidence, including supplied watched content, channels, formats, and viewer characteristics;
3. Advanced Mode comparisons using consistent groups and equal-lifespan windows across video, format, geography, traffic source, and time where supplied;
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

A subject is search territory, not an angle. An angle begins with a specific **human
nerve**: a personally recognizable fear, desire, dilemma, identity stake, or fascination
that credible evidence shows people encounter and that an episode can honestly explain.
The nerve is the viewer's tension, not a dramatic label pasted onto an interesting
mechanism.

### Find the specific human nerve

Run a bounded audience-language scan before selecting the nerve. Start with three
materially different query families from the practical patterns above—for example a
problem or fear, a desire or identity stake, and a question or misconception. Inspect
current search wording, comments, forums, Q&A pages, polls, and supplied audience material
where available. Add no more than two targeted follow-up passes for unresolved candidates,
then stop and record what remains unknown. For a bounded ideation operation, this scan
replaces the full demand, supply, timing, scoring, and packaging pipeline; apply it only to
the promising subjects being turned into exact angle proposals.

Preserve recurring wording closely enough to show how people describe the moment and
stake, while protecting private material. Separate an audience's wording from the truth of
its premise: a repeated phrase can reveal a felt concern without proving the condition it
describes. Date volatile observations, compare independent contexts, and treat one query,
comment, post, poll, or autocomplete phrase as a lead rather than proof of breadth.

Before choosing a mechanism for a problem-led candidate, generate and compare the specific
lived painpoints first. Prioritize the widest specific, recognizable, recurring pain that
credible evidence supports, not the broadest subject label. Do not begin with a technical
mechanism and manufacture human relevance afterward.

For wonder-, history-, and explicit-game-led candidates, use a widely shared mystery,
desire, or tension instead of requiring suffering. A mystery may be why a rule works, a
desire may be mastery or discovery, and an identity stake may concern the kind of player
or culture a game creates. Never invent suffering merely to intensify a subject. These
candidates still need a recognizable moment, a personal reason to care, and evidence that
the fascination is shared.

Generate at least three materially different candidate nerves when the available evidence
supports them. They are materially different only when the first-person concern, lived
moment, primal stake, evidence path, or earned payoff changes—not when one abstract noun is
replaced with another. If the scan supports fewer than three, show the limitation instead
of fabricating alternatives.

Write every candidate as a concrete first-person concern or dilemma. Use this diagnostic
form before turning it into audience-facing language:

```text
In [specific moment], I fear/want/wonder [specific concern], because [human stake].
```

For a consequential dilemma that does not fit `fear`, `want`, or `wonder`, state both
choices and what the person risks by each. Keep the person, moment, object, and consequence
visible. Run the `Choose what?` test. If a viewer can still ask what is being chosen,
compared, lost, wanted, feared, or understood, the concern is not specific enough.

Apply all of these specificity tests:

- **recognizable-moment test** — could the intended viewer picture the situation, the
  relevant person or group, the concrete object, and what happens next without an
  explanatory paragraph?
- **personal-stake test** — does the concern name why this matters to the person, such as
  belonging, status, autonomy, safety, competence, fairness, loss, mastery, or meaning?
  Treat this as a primal stake only when the evidence earns that interpretation; do not
  turn an editorial description into an evolutionary or psychological fact.
- **evidence-breadth test** — do multiple independent signals support meaningful reach or
  recurrence in the intended audience? Distinguish repeated wording from audience size and
  record contrary or missing evidence.

For each problem-led candidate, record:

- **target viewer** — the person beyond existing followers who experiences the problem;
- **audience language** — the recurring first-person or conversational wording found;
- **lived moment** — the exact situation, person, object, and consequence;
- **human cost** — what the problem wastes, damages, delays, threatens, or makes harder;
- **reach or recurrence** — the independent evidence that the concern is broad, repeated,
  or both; and
- **first-person concern or dilemma** — the concrete diagnostic statement that survives
  the specificity tests.

Then record the bridge the episode would need to earn:

- **surface explanation** — the familiar story or misconception people use now;
- **hidden game or mechanism** — the prospective WHP explanation to verify after the nerve
  is selected;
- **new understanding** — the non-obvious model the episode could earn; and
- **usable response** — the evidence-bounded action, observation, or reflection the viewer
  could apply afterward.

For non-problem-led candidates, use the same fields with **shared tension or fascination**
in place of pain and **human stake** in place of a manufactured cost.

Compare **reach**, **recognition**, **frequency**, **consequence**, and
**unresolvedness**. Treat these as separate evidence-backed dimensions; do not multiply
them into a fabricated market-size number. A large subject category does not rescue a
vague nerve, a frequent annoyance does not automatically outrank a rarer serious
consequence, and emotional force does not lower the evidence bar. Choose the strongest
supported nerve, not the most dramatic one. If evidence does not distinguish the leading
nerves, keep the choice provisional or return the supported alternatives instead of
forcing certainty.

For every promising subject, develop at least **two materially different angles** across
the supported nerves. A materially different angle changes the central tension, human
stake, evidence spine, or payoff—not merely the title wording. For each angle, identify:

- the familiar entry point;
- the audience pain or shared tension;
- one documented opening proof case that is legible on first hearing;
- the tension, puzzle, or misconception;
- the recognizable human stake;
- the earned payoff or reframe;
- the likely evidence backbone; and
- the intended viewer beyond existing followers.

Use this canonical distinction:

- **Subject:** `Sudoku`
- **Angle:** `How Sudoku conquered the world—and what its nearly perfect rules reveal about human puzzle hunger`

This is an example of subject-to-angle specificity, not a default winner or recommendation.

Build each angle through this editorial bridge:

```text
familiar game, event, person, institution, or trend
    + game/play mechanism
    + recognizable human stakes
    + evidence-backed surprise, use, or reframe
```

A weak angle does not automatically disqualify its subject. Reframe it through a different
tension, stake, or evidence path, then apply all six hard gates again to the new angle.

### Prove mechanism and promise fit

Only after selecting an evidence-supported nerve, choose a mechanism. Run the
**mechanism-fit test**: the mechanism must explain the selected concern in the stated
person, context, and evidence boundary, and the evidence must support the link from
mechanism to recognizable consequence. An interesting mechanism that merely touches the
subject fails. Use the mechanism as the explanation of a supported human problem or shared
tension, not as a substitute for one.

When the angle explains a common human behavior, also run the **coverage check** before
handoff: search the phenomenon's own field-level causal map — meta-analyses, systematic
reviews, and consensus accounts found by the behavior's name, not the chosen mechanism's —
and record what share of the recognizable moment the mechanism plausibly owns, alongside
the strongest rival explanations, always including the viewer's most likely true
self-explanation. A mechanism that owns a minority of the moment may still carry the
episode, but the handoff must say so, and the working title and opening promise must not
diagnose the whole moment with it. Fidelity of individual claims cannot substitute for
this check: every sentence can verify while the composition overclaims.

Draft one honest working title and one literal opening promise for each advancing angle.
This is a fidelity check, not the later three-direction packaging stress test. Name the
object and personal tension plainly; reject vague referents, generic relevance, and titles
whose importance needs a paragraph of explanation. Use `feel` or `seem` when the evidence
explains an appearance rather than an objective condition. Do not turn a correlation, an
average tendency, or a bounded mechanism into a universal claim.

Run the **title-to-payoff test** in both directions:

1. title to evidence — can the factual backbone and mechanism honestly answer every
   load-bearing implication in the title and opening promise?
2. evidence to payoff — will the earned understanding and usable response resolve the
   exact first-person concern without claiming more than the evidence supports?

If either direction fails, narrow the title and opening promise, change the mechanism, or
reject the angle. Never preserve a strong click by handing scripting an undeliverable
promise.

Hand off the exact subject and angle, selected human nerve, intended viewer, lived moment
and human stake, audience-language and breadth evidence, mechanism and evidence boundary,
the coverage-check finding with its rival explanations where the angle explains a common
behavior, working title and opening promise, earned understanding, usable response,
caveats, and unresolved verification. The handoff must bound both the payoff and its limits. Scripting
may develop the approved promise but must not silently broaden it or rerun nerve selection.

### Test the opening proof case

Before an angle becomes a finalist, identify one documented opening proof case whose
intended goal, visible measure, shortcut, and absurd outcome can be told in a few plain
sentences. If a first-hearing listener would still ask why the measure improved, find a
clearer case or lower the angle's opening potential; do not rescue a weak hook with a
technical lecture. A technically exact case is not a strong opening merely because it is
well sourced; causal clarity and visual legibility are part of production reality.

For a long-lived mechanism, identify one compact current echo that shows the pattern still
matters without opening a second full story or claiming that every system behaves the same
way. Verify that both examples instantiate the same bounded mechanism. Use the historical
case for story and the current echo for continuity rather than building two competing
hooks.

### Worked example: Popularity

The vague route starts with the broad subject `Popularity`, reaches first for a generic
social-proof mechanism, and invents an abstract taste-autonomy concern such as “Am I
choosing for myself?” That leaves the object, lived moment, and personal consequence
unclear.

A stronger candidate route is:

```text
nerve: Am I less wanted than everyone around me?
title: Why Does It Feel Like Everyone Has More Friends Than You?
mechanism: highly connected people are overrepresented in comparison sets
payoff: popular people appear in more people's worlds
```

Here the title uses perception language, the mechanism can explain the appearance, and the
payoff can return the comparison to its evidence boundary rather than claiming that the
viewer objectively has fewer friends. This is a method illustration, not a selected
episode or a verified factual package. Its audience breadth, mechanism, title, and claims
still require verification in a real topic run; do not reuse the answer when current
evidence supports a different nerve.

## Shallow and deep research

Use staged research so breadth is preserved before costly investigation.

### Shallow scan

Apply all six hard gates—game/play centrality, human revelation, recognized payoff, evidence path, production reality, and portfolio fit—to every advancing angle. Record `pass`, `fail`, or `unknown` with a brief rationale for each gate. Do not score an angle with a failed gate; treat an unknown gate as not yet passed.

Use quick, independent checks of demand, competitive supply, timing, evidence availability, production reality, and repository duplication. Reduce the eligible pool to roughly **8–12 candidates**. The shallow scan removes clearly weak angles; it must not crown a winner from superficial signals.

### Deep research

Deeply research only the finalists. Seek independent evidence for:

- audience interest, reachable market, and trajectory;
- competitive supply, existing angle quality, and a credible opening;
- a first-hearing causal spine for the opening proof case and, when relevant, a current echo;
- comparable relative breakouts within valid cohorts;
- audience language, recurring questions, and misconceptions;
- multiple honest packaging directions;
- factual support, contradictory evidence, and necessary caveats;
- production needs, access, visuals, expertise, and timing; and
- a coherent episode sequence and plausible follow-ups.

After deep research, re-audit the gates and rank a shortlist of roughly **five exact angles** with the scorecard below. Preserve contradictions and uncertainty rather than forcing all observations to agree.

## Evidence ledger

For every decision-relevant observation, capture one ledger row:

```text
claim or signal | source URL/file | observed value | observation date
geography | language | format | comparison window | fact/estimate/inference
counterevidence | caveat | unavailable evidence | claim-to-verify | supported score criterion
```

Record observation date, geography, language, format, and comparison window wherever they affect interpretation, especially for volatile observations. Mark a field `not applicable` or `unknown` rather than inventing it. Timestamp the research run and every volatile metric or result sufficiently to make later checking possible. Do not omit durable, contradictory, or unavailable evidence when it affects the decision.

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

### Criterion calibration

Calibrate the criteria independently:

| Criterion | Core question | Qualifying evidence | Exclusions and double-counting boundary | Cap or gate boundary |
|---|---|---|---|---|
| Audience demand and reachable market | Will people in the target market choose this exact angle, and can WHP plausibly reach them? | Current channel signals, audience language, search trajectory, and comparable cohorts that support credible audience transfer to the angle. | General subject demand alone cannot earn full points; do not reuse topic popularity as packaging or competitive-opening evidence. | Without credible reachability or audience-transfer evidence, cap at **Mixed (13)**. |
| Competitive opening or content gap | Is there demonstrated demand that existing supply serves poorly for this audience and angle? | Demand plus a documented quality, angle, freshness, format, or audience mismatch in existing coverage. | Absent supply alone is not an opening; do not count the popularity already scored under demand. | Without both demand and a documented mismatch, award no opening points. |
| Packaging strength and immediate appeal | Does a tested, honest promise communicate clear tension and a compelling visual idea immediately? | Distinct title/thumbnail directions whose familiar element, surprise, open question, and visual promise are clear and whose promised payoff is honest. | Judge communication of the promise, clarity, tension, and visual—not topic popularity or the payoff's post-view value. | A finalist with no viable honest package is ineligible to win; package changes to the thesis trigger a fresh gate audit. |
| Likely satisfaction, usefulness, and shareability | Will the delivered episode provide a useful payoff and an earned reframe worth remembering or sharing? | Evidence-backed payoff, practical or explanatory use, earned reframe, and a credible reason to share after viewing. | Do not score click appeal, title tension, or thumbnail clarity here; those belong to packaging. | An unrecognizable or undeliverable payoff fails the recognized-payoff gate and is not scored. |
| Strength of the WHP lens | After minimum WHP eligibility, how distinctive and central is the game/play mechanism in explaining humanity? | A specific, non-interchangeable play mechanism that produces a recognizably WHP human insight. | Do not score popularity, demand, or a decorative game reference. | The hard gate is the binary minimum; score distinctiveness and centrality only after it passes. |
| Evidence quality and defensibility | How defensible are the load-bearing thesis, claim scope, and caveat coverage overall? | Directly relevant primary or first-party evidence, corroboration, counterevidence, appropriate comparisons, and explicit caveats. | Per-criterion grades describe support for that criterion; do not count the same fact twice merely because it is primary. | An unsupported central promise fails the evidence-path gate; provenance alone cannot rescue it. |
| Production feasibility and sequence | After basic feasibility, how reliably and efficiently can WHP execute this episode now and place it in the portfolio? | Confirmed access, visuals, expertise, schedule, rights, production simplicity, timing, and sequence value. | Do not count demand, popularity, or mere follow-up appeal as feasibility evidence. | The gate rejects impossible or currently irresponsible work; score execution ease, access, timing, and portfolio sequence only after it passes. |

Assign each observation to the question it actually answers. Cross-cite one ledger row across criteria only when it provides distinct criterion-specific evidence and explain the distinction; never multiply points merely because one fact is popular, primary, or convenient.

Use an intermediate integer only when the rationale explains why the evidence falls between two anchors. Do not use decimals or adjust the weights for a preferred candidate.

Grade evidence independently from score:

- **A:** directly relevant evidence—first-party or primary, or several strong convergent observations—that is current where necessary, appropriately comparable, and adequately corroborated wherever audience transfer or causality is inferred;
- **B:** credible indirect evidence with a meaningful limitation;
- **C:** weak proxy, sparse evidence, unresolved conflict, or editorial inference; and
- **unknown:** unavailable evidence, never silently converted to zero.

Provenance alone does not establish strength. A single first-party or primary metric can still be graded `B` or `C` when it is indirect, stale, poorly comparable, or uncorroborated for the claim.

For every finalist and every one of the seven criteria, create one compact criterion record containing:

```text
finalist | criterion | integer score/weight | A/B/C/unknown grade
cited rationale or evidence-ledger pointer | largest uncertainty
cap/boundary applied | reused evidence and distinct criterion-specific use, or none
```

Keep each record to one concise row and point to ledger identifiers instead of repeating source detail. State `none` when no cap applies or no evidence is reused. These records must make every criterion score and grade traceable, show whether an evidence cap or hard boundary constrained the score, and expose any cross-criterion reuse so the anti-double-counting rule can be audited. A high editorial score can carry a weak evidence grade; expose that difference instead of using the score as a confidence proxy.

If evidence is unknown in a criterion being scored during the current run, award no unsupported points. Mark the missing evidence and grade explicitly as `unknown`, lower overall confidence, and distinguish an actual rubric score of zero from observed evidence that the opportunity is absent. Use `0/unknown` only when the current run actually applied the rubric and scored the criterion zero; it is not a placeholder for a missing numeric value. If a criterion has both supported and unknown evidence, score only the supported case and state how the unknown limits the result.

If an actual numeric criterion value is absent or unavailable—especially when rendering a supplied end-state record—use `not scored/unknown`, never zero. Do not compute a total from missing component values or hide them inside a precise-looking total. A supplied aggregate total without component splits may be preserved only as explicitly supplied, for example `82/100 — supplied aggregate; components unavailable`; do not reverse-engineer component values or claim its arithmetic verified, and completeness item 7 must be `no`.

The three reach-facing criteria—audience demand and reachable market, competitive opening or content gap, and packaging strength and immediate appeal—total **60 points**. This reach emphasis structures editorial judgment; it does not forecast views, and it can never override a failed hard gate.

## Packaging stress test

For each of the top-three finalists, create **three genuinely different title/thumbnail promises**. Do not count synonym swaps or cosmetic thumbnail variations as different directions.

Create directions from the available facts when the task asks for package development. When a supplied decision state confirms a completed package test and its row count but omits the contents, preserve that count with numbered `details unavailable` records. Mark titles, thumbnails, audiences, tensions, payoffs, and direction-level outcomes `unavailable` rather than inventing them. If the supplied state says one honest package survived but does not identify it, retain that as a finalist-level fact and do not map it to a placeholder direction. If the task separately asks for new directions from the supplied facts, label them as new editorial proposals rather than evidence of the earlier package test.

For every direction, state:

- the intended viewer;
- the familiar element that earns recognition;
- the unexpected element;
- the open question or tension;
- the visual promise made by the title/thumbnail pair; and
- the payoff the finished episode will actually deliver.

Reject bait that would attract a materially different audience from the episode's real thesis or leave the intended viewer unsatisfied. The most clickable promise is ineligible if the central evidence cannot honestly deliver it.

For each top-three finalist, also write a one-sentence **earned reframe** and at least **two plausible follow-up episodes**. Use series potential only as a tiebreaker and coherence check; it cannot rescue weaker reach evidence, failed gates, or an undeliverable package.

After stress testing, rescore packaging and satisfaction using each finalist's strongest honest direction, then rerank the finalists. If package development changes the thesis, intended audience, evidence path, or payoff, rerun all six hard gates before scoring it. A finalist with no viable honest package is ineligible to win.

## Error handling and confidence

Assign confidence as `high`, `medium`, or `low` from evidence convergence and availability, not from total score:

- **High:** multiple independent, current, appropriately comparable signals converge across reach, factual support, and execution, with no unresolved conflict that threatens the central promise.
- **Medium:** the main case is supported, but one meaningful source is indirect, sparse, older, weakly comparable, or in tension with another observation.
- **Low:** evidence is unavailable, heavily personalized, sparse, poorly comparable, dominated by inference, or materially conflicting.

Timestamp volatile data, display conflicts, and reduce confidence when evidence depends on personalized results, a small comparable cohort, third-party estimates, or uncertain audience transfer. Do not inflate confidence because a candidate has the highest score.

When two or more gate-passing, responsibly supported finalists remain tied after package rescoring, choose one **provisional winner** and name the smallest decisive test or missing datum that could reverse the decision, such as a targeted audience poll, a broader comparable cohort, a factual-source check, or a package test.

When fewer than two responsibly supported, gate-passing, winner-eligible finalists remain, return an incomplete, reduced-confidence research result and list the evidence needed to finish the decision. Use `**Winner:** No winner responsibly supportable`; if exactly one supported finalist remains, identify it separately without promoting it to winner. Do not manufacture a comparison candidate. This is different from a supported tie among two or more viable finalists.

The central title-and-thesis promise must survive reasonable verification before scripting. Do not guarantee views, imply causal certainty from correlations, or use false precision in reach, performance, or confidence claims.

If live research is unavailable, use supplied evidence and repository evidence as a reduced-confidence fallback. Disclose which current signals could not be checked, explain the likely decision impact, and list the evidence that must be gathered before scripting.
