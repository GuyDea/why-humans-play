# Steering Decision: Evidence-led WHP video topic selection skill

- **Status:** Accepted
- **Date:** 2026-07-20
- **Owners:** Why Humans Play
- **Related:** [`BRAND.md`](../../BRAND.md), [`whp-youtube/STEERING.md`](../../whp-youtube/STEERING.md), [`2026-07-20-whp-video-topic-skill-design.md`](../superpowers/specs/2026-07-20-whp-video-topic-skill-design.md)

## Context

WHP needs a repeatable way to choose the next YouTube video topic. The eligible subject
space is intentionally broad: actual games and puzzles, game history and culture, the
science of play, game theory, hidden games in human systems, learning, AI, and other
subjects where games or play reveal something meaningful about humans.

The choice must favor reach without reducing the channel to trend chasing. A candidate
must remain recognizably WHP, support an honest evidence-backed payoff, and be feasible
for a solo presenter-led production. The channel is still too young for private analytics
to be a mandatory input, while future runs should benefit from those analytics once they
become useful.

## Constraints

- `BRAND.md` is the highest-priority doctrine; `whp-youtube/STEERING.md` supplies the
  permanent channel rules.
- Reach is a major ranking factor, but WHP relevance, rigor, payoff, and feasibility are
  eligibility gates.
- The process must work in both cold-start and channel-aware conditions.
- Dynamic or authenticated data may be unavailable. Missing evidence must lower
  confidence rather than be invented.
- Public view totals, search trends, and AI-generated ideas are clues, not standalone
  proof of opportunity.
- The result must name one winner and explain why it beat the runner-up.

## Decision

Create a project-local skill at `.agents/skills/choosing-whp-video-topic/` using an
evidence-funnel workflow:

1. Read current WHP doctrine, episode history, backlog, and production constraints.
2. Generate a deliberately diverse subject pool from independent internal and external
   signals.
3. Turn subjects into specific video angles with a human stake and an earned payoff.
4. Apply WHP, rigor, payoff, duplication, and feasibility gates.
5. Research surviving candidates through multiple independent signals.
6. Rank them with a reach-weighted scorecard and explicit evidence confidence.
7. Stress-test the top three as title/thumbnail promises before choosing one winner.
8. Return a dated, cited recommendation with risks, runner-up comparison, and follow-ups.

Keep the core procedure in `SKILL.md`. Put the detailed research protocol and output
contract in directly linked reference files. Read canonical WHP documents at run time
instead of copying their doctrine into the skill.

## Alternatives

### Analytics-first automation

Rejected as the default because it would be weak during channel cold start, require
authenticated data or exports, and become brittle as YouTube surfaces change. Private
analytics remain a preferred signal when available.

### Lightweight editorial scorecard

Rejected because a small intuition-led shortlist is prone to anchoring on the first trend
or familiar topic. It remains an optional reduced-confidence fallback when live research
is genuinely constrained.

### Trend-first outlier hunting

Rejected because outliers confound subject, package, execution, channel history, and
timing. Relative outperformance is useful for discovering hypotheses, not selecting a
winner by itself.

## Consequences

- Topic selection takes longer than casual brainstorming but produces an auditable
  recommendation.
- Broad subjects such as Sudoku can compete fairly without weakening channel identity.
- Numeric scores improve consistency but do not remove editorial judgment; evidence
  quality and uncertainty remain visible.
- The skill can improve as WHP accumulates analytics without needing a new architecture.
- The procedure ends at topic and packaging direction, leaving full scripting to a
  separate workflow.

## Boundaries / Interfaces

- **Inputs:** repository doctrine and episode files; optional YouTube Studio observations
  or exports; current public web evidence; stated geography, language, timing, and
  production constraints.
- **Output:** one topic-and-angle winner, a ranked shortlist, packaging stress test,
  evidence trail, confidence, and follow-up topics.
- **Not included:** full script, thumbnail production, unverifiable performance forecast,
  automated access to private accounts, or changes to canonical brand/channel doctrine.

## Data / Migrations

No persistent data model or migration is required. A future topic ledger may be added if
WHP needs structured longitudinal tracking; current repository episode files are the
source of truth for duplication and sequencing checks.

## Security / Scale

Do not request, store, or expose YouTube credentials. Treat user-provided analytics as
private. Cite public sources directly and distinguish observations from inferences. The
research workload is bounded by progressively narrowing a broad candidate pool before
deep research.

## Verification / Rollout

- Establish baseline behavior on realistic prompts without the new skill.
- Run the same prompts with the skill and compare evidence use, diversity, decisiveness,
  and resistance to misleading signals.
- Cover cold start, an actual-game subject, trend bait, noisy metrics, and close finalists.
- Run the standard skill validator and inspect all generated interface metadata.
- Roll back by removing the self-contained skill directory; no product runtime is affected.

## Follow-ups

- Revisit weights after WHP has enough published videos for meaningful pillar-level
  analytics.
- Consider a structured topic ledger only after repeated runs demonstrate a real need.
