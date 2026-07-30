---
name: packaging-whp-videos
description: "Use when creating, scoring, rendering, or revising Why Humans Play video packaging — title+thumbnail packages — including competitor/outlier packaging research for a topic, pre-publish package evaluation or thumbnail generation, and post-publish CTR reading, Test & Compare, or repackaging decisions."
---

# Package Why Humans Play Videos

## Overview

The package is the unit: one title and one thumbnail concept conceived, scored,
evaluated, and selected **together** as two halves of a single promise. The thumbnail
shows the tension; the title tells it; they never repeat each other; together they
open exactly one question the episode honestly answers. Never generate, score, or
select a half alone — the viewer only ever meets them together in the feed. A half
moves alone only as a controlled post-publish experiment.

The objective is **honest CTR**: YouTube ranks on watch-time per impression and
satisfaction, and its native A/B tool crowns watch-share winners, so packaging that
over-promises is throttled by design. Maximum curiosity, zero deception.

Do not use this skill for app-store assets, social posts, or ads.

## Required project context

Locate the repository root. Read `BRAND.md` and `whp-youtube/STEERING.md` Law 1 before
any packaging generation or policy-sensitive change. If either is absent, report the
missing canonical context instead of inventing policy. Ground every claim-level
judgment in [the craft doctrine](references/craft-doctrine.md); when doctrine and a
hunch disagree, doctrine wins unless Martin overrides.

## Choose the operation

- **Sweep the competition:** research the topic's packaging landscape and return a
  packaging-patterns brief. Follow
  [the outlier research method](references/outlier-research.md).
- **Generate packages:** ideate 15–20 package candidates, score them as units, and
  select three winners on distinct thumbnail routes. Requires the episode's topic
  brief or approved architecture/intro and, when available, a packaging-patterns
  brief — run the sweep first for a new topic unless Martin says otherwise. Follow
  [the package method](references/package-method.md).
- **Render thumbnails:** turn the three winners into briefs, prompts, and 5 renders
  each (15 total), then contact sheets and feed mockups. Follow
  [the thumbnail production method](references/thumbnail-production.md).
- **Evaluate packages:** run mechanical lint, feed mockups, the cold-viewer panel,
  and saliency on supplied or rendered packages. Follow
  [the evaluation method](references/evaluation.md).
- **Read live results / repackage:** interpret per-surface CTR, run or read a
  Test & Compare, or repackage an underperformer. Follow
  [the post-publish method](references/post-publish.md).

A full pre-publish pass for an episode runs sweep → generate → render → evaluate and
ends with a ranked trio. Stop at any operation boundary Martin names.

## Gates that bind every operation

- **Honesty gate:** every question a package opens must be answered in the episode. A
  package the episode cannot honestly pay is clickbait and fails, whatever its scores.
  Record each winning package's expected-payoff mapping to the episode's actual
  delivery.
- **Package-unit gate:** no artifact may present titles and thumbnails as separate
  pools. Candidates, scores, panel verdicts, and recommendations are always pairs.
- **Cap gate:** at most 3 winning packages advance to rendering; each renders 5
  variants from the same prompt. The three winners are the Test & Compare trio.
- **Decision gate:** the final package choice is Martin's. Recommendations rank; they
  never decide. Reconciliation follows the repository's normal decision flow.

## The packaging record

Each episode's full working set lives in
`whp-youtube/episodes/epNNN-stable-name/packaging/`:

- `record.md` — from [the template](assets/packaging-record-template.md): patterns
  brief, all candidates with scores, winners, briefs and prompts, evaluation results,
  trio ranking, Martin's choice, and the post-publish log.
- `renders/` — generated images; `mockups/` — contact sheets and feed mockups.

The Script Blueprint appendix's `### Packaging` section carries the gate summary and
links here; this directory carries the working evidence. Append every post-publish
outcome to `record.md` — the record is how packaging knowledge compounds per episode.
Distill any durable lesson into doctrine through the repository's reconciliation flow.

## Scripts

Run from the skill directory; all scripts support `--help`.

```bash
python3 scripts/gen_thumbnails.py --concepts <concepts.json> --out <dir> --variants 5
python3 scripts/contact_sheet.py <renders-dir> --out <sheet.png>
python3 scripts/feed_mockup.py --package <thumb.png> "<title>" --competitors <dir> --out <dir>
python3 scripts/saliency_score.py <thumb.png> --out <heatmap.png>
```

`gen_thumbnails.py` needs `GEMINI_API_KEY` (env or
`/home/martin/env-secrets/gemini.properties`). `saliency_score.py` needs the optional
DeepGaze IIE stack and degrades to a clear install message without it. Treat every
script as structural tooling: scores and maps inform judgment; they never approve a
package.

## Validation

Run `python3 scripts/test_skill_package.py` after any edit to this skill. Keep the
episode packaging record consistent with the blueprint appendix summary before the
blueprint gate.
