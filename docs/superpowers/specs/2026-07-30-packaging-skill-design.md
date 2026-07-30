# Packaging Skill (`packaging-whp-videos`) — Design

**Date:** 2026-07-30 · **Status:** Approved in conversation by Martin (scope parameters
reconciled in `DECISIONS.md`); this document records the accepted design.

## Purpose

A standalone skill that owns Why Humans Play title+thumbnail packaging end to end:
per-topic competitor/outlier packaging research, package generation and scoring,
thumbnail rendering and evaluation, trio recommendation, and post-publish CTR reading
and repackaging. Research basis:
[`docs/research/2026-07-30-packaging-ctr-research.md`](../../research/2026-07-30-packaging-ctr-research.md).

## Settled constraints

1. Standalone skill at `.agents/skills/packaging-whp-videos/` (with the standard
   `.claude/skills/` symlink), not an extension of `writing-whp-youtube-scripts`.
2. **The package is the unit**: one title + one thumbnail concept conceived, scored,
   evaluated, and selected together. No stage handles a half alone; a half moves alone
   only as a controlled post-publish experiment.
3. Thumbnail proposals: **3 winning packages max**, each rendered **5× from the same
   prompt** (15 renders). The 3 winners are the Test & Compare trio.
4. Per-topic competitor/outlier packaging research is a pipeline stage.
5. Post-publish doctrine (per-surface CTR reading, Test & Compare, repackaging) is in
   scope.
6. Evaluation rigor unconstrained by setup cost (includes DeepGaze saliency scoring).

## Pipeline (per episode)

1. **Outlier sweep** → packaging-patterns brief (same-topic + adjacent videos; ≥3x
   channel-baseline outliers; patterns clustered by title syntax and thumbnail
   framing; structures remixed, never copied).
2. **Package ideation** → 15–20 package candidates, each a title half + thumbnail half
   conceived together as one promise.
3. **Package scoring** → feed-adapted title gate (T1 feed-adapted, T2/T3 unchanged,
   T4; ~60/40-char truncation), thumbnail one-glance lint (route, ≤3 elements, ≤3
   overlay words, light+dark feed), pair complementarity. Narrow to 3 winners on
   distinct routes.
4. **Render** → 5 renders per winner via the generator (Nano Banana Pro, reference
   images for brand marks/face), best render chosen per concept.
5. **Evaluate** → mechanical lint (contact sheet at 160×90, grayscale), feed mockups
   (light+dark, among the sweep's competitor thumbnails), simulated cold-viewer panel
   (personas judge the package as the feed renders it: stop? click? expected payoff?),
   optional saliency map. Expected-payoff answers feed the honesty check.
6. **Verdict** → ranked trio with evidence; final choice is Martin's; summary recorded
   in the blueprint appendix `### Packaging`, full working set in the episode's
   `packaging/` directory.
7. **Post-publish** → per-surface CTR reading windows (24–48h), Test & Compare
   (3 variants, watch-share winner, diverse-not-similar), repackaging triggers; every
   outcome appended to the packaging record so doctrine learns per episode.

## Components

- `SKILL.md` — operations router and gates.
- `references/craft-doctrine.md` — evidence-graded levers + folklore list.
- `references/outlier-research.md` — sweep method and patterns-brief contract.
- `references/package-method.md` — ideation, scoring, selection.
- `references/thumbnail-production.md` — briefs, prompt authoring, render workflow.
- `references/evaluation.md` — lint, mockups, panel protocol, saliency.
- `references/post-publish.md` — live-metric doctrine and repackaging.
- `assets/packaging-record-template.md` — the per-episode record shape.
- `scripts/gen_thumbnails.py` (evolved from `whp-youtube/thumbnails/`, adds
  `--variants`, reference images), `scripts/contact_sheet.py`,
  `scripts/feed_mockup.py`, `scripts/saliency_score.py`,
  `scripts/test_skill_package.py`.

## Integration

- `script-blueprint-workflow.md` packaging section routes deep work to this skill;
  the blueprint appendix `### Packaging` remains the gate record.
- `choosing-whp-video-topic`'s packaging stress test stays (eligibility only).
- STEERING Law 1 already carries the package-as-unit doctrine and the accepted-skill
  bullet; the bullet updates to name the landed skill.

## Validation

- Structural: the skill's own package test + the scripting skill's 360-test suite stay
  green.
- Scripts validated against the tracked EP1 prototype renders.
- Behavioral: dry-run against ep002's hand-made packaging on request (recommended
  before first production use).
