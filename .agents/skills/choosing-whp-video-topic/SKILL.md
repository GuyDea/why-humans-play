---
name: choosing-whp-video-topic
description: Researches and selects the best next Why Humans Play YouTube video topic and angle using current audience signals, a reach-weighted scorecard, WHP eligibility gates, packaging tests, and evidence confidence. Use when deciding what WHP video to make next, evaluating or comparing WHP episode ideas, researching games/play/humanity subjects, or building a research-backed video shortlist.
---

# Choosing WHP Video Topics

## Outcome

Return one cited decision for WHP's next video: a specific subject, filmable angle, package direction, and research brief when a winner is responsibly supportable, or an explicit incomplete result when it is not. Never guarantee performance.

## Operations

This skill serves several caller-invoked operations. The caller supplies the operation label, the inputs, and the exact structured output shape to return. Honor the requested scope: do not expand a bounded operation into the full pipeline described in the rest of this document.

- **Full topic-selection run** — the complete pipeline below: read WHP context, generate
  30+ subjects, gate, score, package, and decide. The required progress checklist and
  complete reads of both reference files apply only to this operation.
- **Ideate subjects/angles** — run the bounded audience-language and subject-to-angle scan
  in [the subject-to-angle owner](references/research-method.md#subject-to-angle-development)
  for each promising raw subject, then return diverse candidate subjects and exact angle
  proposals only — each proposal typed with one declared primary script goal and its
  qualifying artifact per that owner; do not gate, score, package, read the episode
  backlog, collect the full signal set, or pick a winner.
- **Quick gate-check** — judge only the single supplied idea against the six named hard gates in "Apply hard gates at angle level", using only `BRAND.md` and `whp-youtube/STEERING.md` as doctrine. Read nothing else, run no signal scan, generate no alternatives, and do not score or package. Return the caller-supplied structured shape (an overall status, an overall verdict, the six gate verdicts with one-line reasons, and an optional guardrail note). The output schema is always supplied by the caller — never search for, reconstruct, or reverse-engineer it.
- **Package test** — test the supplied title/thumbnail directions only.
- **Topic-brief handoff (preview)** — prepare the handoff for an already-selected topic.

For every operation, research means WHP brand and channel doctrine plus web and topic evidence — never this repository's application code.

### Operation boundaries

These apply to every operation of this skill, including the full run:

- **Never read repository source code.** Do not run `rg`, `grep`, `sed`, `cat`, or any other search over `script-creator/` or other application source, and never hunt for schemas, registries, prompts, or operation definitions. The output shape is always supplied by the caller; when an input or instruction is unclear, judge it from WHP doctrine rather than investigating the application that invoked you.
- **Stay inside the requested scope.** A scoped operation (Quick gate-check, Ideate, Package test) returns its bounded result directly; it does not run the full pipeline, read the episode backlog, or collect the full signal set.

### Quick gate-check fast-fail

Quick gate-check needs one specific candidate topic — a subject plus an angle — to judge. If the input is empty, meta, or not a specific topic (for example "tell me what to make", "give me ideas", or any request for ideas rather than a named subject and angle), return immediately without exploring anything:

- `status`: `declined`;
- `verdict`: `unknown`;
- all six gates (`game_play_centrality`, `human_revelation`, `recognized_payoff`, `evidence_path`, `production_reality`, `portfolio_fit`): each `verdict` `unknown` with a one-line `reason_markdown` that the input is a request for ideas, not a specific topic to gate-check;
- `guardrail_markdown`: one line stating that a gate-check needs a specific candidate topic and pointing the user to ideation or a full topic-selection run to generate ideas.

## Required progress checklist

Track this checklist during the run. Do not compose the recommendation until every item is complete or an unavailable input is explicitly recorded as unknown with reduced confidence.

- [ ] Record the decision frame and current WHP context.
- [ ] Select and state the evidence mode.
- [ ] Collect independent audience-demand, competitive-supply, and timing signals.
- [ ] Record at least 30 distinct, diverse subjects before ranking.
- [ ] Complete the routed audience-language and subject-to-angle development for every promising raw subject.
- [ ] Identify a first-hearing opening proof case and any needed current echo for each finalist.
- [ ] Audit every advancing angle against all six hard gates.
- [ ] Run a shallow scan and narrow to roughly 8–12 candidates.
- [ ] Deeply research the finalists with multiple signals.
- [ ] Rank a shortlist of roughly five with the required scorecard.
- [ ] Test three package promises for each top-three finalist.
- [ ] Resolve winner status: select exactly one final topic only with at least two responsibly supported, winner-eligible finalists; otherwise return the required incomplete result.
- [ ] Complete the output and evidence audit.

## Read current WHP context

Before generating candidates, locate and read:

1. `BRAND.md` as the highest-priority brand doctrine;
2. `whp-youtube/STEERING.md` as the channel doctrine;
3. published episode records, current episode records or synopses, drafts, and backlog files; and
4. the user's market, language, timing, production, format, and subject constraints.

Keep canonical doctrine in those files; do not reproduce or silently revise it here. Record the files read, already-covered or committed subjects, current sequence, target viewer market, publication window, and immovable constraints in a decision frame. If a required file or state is missing, list it as missing instead of inventing it.

## Choose evidence mode

State one mode before collecting signals:

- Use **channel-aware mode** when the user supplies meaningful private YouTube data. Use only private analytics supplied for the run, treat them as private, and combine them with current public and repository evidence.
- Use **cold-start mode** when private data is absent, too sparse, or not decision-useful. Rely on current public and repository evidence and lower confidence where audience-specific evidence is missing.

Never request credentials, require authenticated access, or block solely because analytics are unavailable.

## Read references

Read [references/research-method.md](references/research-method.md) completely **before research or scoring**. It governs signal collection, comparisons, evidence records, the exact 100-point scorecard, packaging tests, and confidence.

Read [references/output-contract.md](references/output-contract.md) completely **before composing the answer**. It governs the report structure, tables, research trail, and completeness audit.

When a caller's envelope requests machine progress transport, follow
[references/run-progress-transport.md](references/run-progress-transport.md); its row
identities mirror this checklist and change with it.

Do not substitute an improvised rubric or ad hoc report for either reference.

## Generate before judging

Collect multiple independent audience-demand, competitive-supply, and timing signals appropriate to the evidence mode. Use them to seed at least 30 distinct subjects before ranking or pruning. Deliberately span WHP's broad eligible universe:

- actual games such as Sudoku, puzzles, sports, and other play forms;
- game history, rules, design, strategy, and culture;
- psychology, evolution, biology, and anthropology of play;
- learning, memory, intelligence, mastery, and education;
- incentives, game theory, status, work, money, politics, and institutions;
- AI, simulation, agents, and games as learning environments;
- communities, virtual worlds, game economies, and digital culture; and
- philosophy, ethics, meaning, cooperation, competition, and the future of play.

Actual games and their histories are first-class candidates. Intelligence is one WHP pillar, not the whole brand. Avoid semantic duplicates and continue beyond the first fashionable cluster.

Treat each raw subject as territory to investigate, not as a ready angle. Route every
promising subject through the linked subject-to-angle owner before it advances. In a full
run, continue from its exact angle proposals into the gates and research below. In the
bounded ideation operation, stop after those proposals and return them without running the
rest of the pipeline.

Carry each advancing finalist forward with the owner's documented opening proof case and
any applicable current echo.

## Apply hard gates at angle level

Audit each advancing angle with an explicit pass/fail/unknown and rationale for all six gates:

1. **Game/play centrality** — games or play are the subject or explanatory mechanism, not decoration.
2. **Human revelation** — the angle reveals something meaningful about human behavior, learning, culture, intelligence, relationships, or institutions.
3. **Recognized payoff** — the intended viewer can state what they will understand, see, or do differently.
4. **Evidence path** — credible sources can support the load-bearing claims and necessary caveats.
5. **Production reality** — WHP can execute the idea credibly within the stated resources and window.
6. **Portfolio fit** — the angle does not merely duplicate a published, committed, or current episode.

Do not score an angle that fails a gate; treat `unknown` as not yet passed. A failed angle may be reframed without disqualifying its subject, but the reframed angle must pass a fresh six-gate audit.

## Narrow in stages

Run a shallow evidence scan across the eligible angles, then narrow to roughly 8–12 candidates. Deeply research the finalists using multiple independent signals and preserve a cited, dated research trail that distinguishes observation, estimate, and inference. No candidate may advance or win from one metric or source alone.

After deep research, produce a ranked shortlist of roughly five exact angles. Keep contradictory evidence, limitations, production implications, and the largest uncertainty visible rather than smoothing them away.

## Score and stress-test

Apply the exact 100-point weights and anchors in `references/research-method.md`; do not invent or rebalance a rubric. For every shortlisted candidate, attach criterion rationales, evidence grades, cited observations, confidence, and uncertainty. A numeric score structures editorial judgment and is not a performance forecast; no score can override a failed hard gate.

If an actual numeric criterion value is absent or unavailable, record it as `not scored/unknown`, never as zero, and do not compute a total from missing components. Preserve a supplied aggregate only as explicitly supplied; it does not verify missing component arithmetic.

For each of the top three finalists, create three materially distinct title/thumbnail package promises. Every promise makes the finalist's declared primary script-goal bet; directions vary the entry point, tension, and visual, never the bet (the research method owns the mistype signal and retype rule). Test who each attracts, what is familiar and surprising, the open tension and visual promise, and whether the video can honestly deliver the promised payoff. Reject bait whose attracted audience would not be satisfied by the episode.

Do not invent package contents when a supplied decision state says only that an honest package exists. If a completed package-test count is known but row contents are absent, preserve the known package-test row count with placeholders such as `Recorded direction 1 — details unavailable`. Mark every unsupplied package field as `unavailable`; retain a supplied aggregate survival fact without mapping it to a direction, and do not infer which placeholder survived. Only create new package contents when the task asks for package development from available facts, and never present them as evidence of an earlier test.

## Decide

Select exactly one final topic only when at least two responsibly supported, gate-passing, winner-eligible finalists remain. Winner eligibility also requires the finalist's declared primary script goal with its qualifying artifact and a stated provisional transformation contract, both owned by the research method. Lead with the exact topic and angle, strongest package direction, and confidence. Explain why it is the best next episode now, which evidence is decisive, why it can reach beyond current followers, and why it is recognizably WHP.

If two or more supported finalists remain tied after package rescoring, select one provisional winner and name the smallest decisive test that could reverse it. If fewer than two supported finalists remain, return an incomplete result with the exact line `**Winner:** No winner responsibly supportable`. When exactly one supported finalist exists, identify it separately as the supported finalist, but do not promote it to winner without a responsibly supported comparison. Never invent a runner-up to force a decision.

Compare the winner against the same-frame runner-up and state directly why the runner-up loses. Name the recommendation's most important falsifier and the smallest pre-script verification or decisive test still needed. End with two adjacent follow-up episodes that strengthen a coherent sequence.

## Failure handling

Mark missing, ambiguous, conflicting, or inaccessible data as `unknown`, state its decision impact, and lower confidence. Never fabricate files, analytics, metrics, dates, sources, quotes, or certainty.

If live research is unavailable, use accessible public and repository evidence as a reduced-confidence fallback, disclose which required signals could not be checked, and keep the research trail auditable. If the remaining evidence cannot support the required winner-eligible pair, label the run incomplete instead of manufacturing a winner or comparison.

## Boundaries

Stop at the topic, exact angle, package directions, and research brief. Do not write the full script, produce a thumbnail, request private-account access, alter canonical WHP doctrine, or promise reach or view counts.
