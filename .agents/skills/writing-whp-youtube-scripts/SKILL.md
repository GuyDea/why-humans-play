---
name: writing-whp-youtube-scripts
description: "Use when creating or substantially revising a long-form Why Humans Play YouTube episode script, especially when the assignment involves researched facts, a story-led opening, inline production notes, visual sourcing, animation direction, confidence caveats, or end references."
---

# Write Why Humans Play YouTube Scripts

## Overview

Use this Markdown skill as the source of truth for story-led, source-audited, production-annotated WHP long-form scripts. Put the viewer promise and honest inquiry before retention tricks.

Do not use this skill for unrelated ads, social posts, or general marketing copy.

## Required project context

Locate the repository root. Read `BRAND.md` first and `whp-youtube/STEERING.md` second. If either file is absent, report the missing canonical context instead of inventing policy.

Extract and state:

- the episode mode;
- the core and potential viewers;
- the recognizable problem or curiosity;
- the viewer promise;
- the title and thumbnail promise;
- the central question and answer;
- the useful viewer change;
- runtime and other constraints; and
- the final payoff.

Do not draft until the packaging, opening, and payoff describe the same video.

## Mandatory workflow

1. Write an assignment contract that fixes the episode mode, audience, promise, scope, deliverable, runtime, and constraints.
2. Build the evidence packet. Assign confidence to every material claim and approve only wording that its evidence supports.
3. Develop three eligible opening candidates. Recommend the strongest candidate, but do not force a micro-story when another opening better serves the promise and evidence.
4. Map a narrative spine in terms of how the viewer's understanding changes from opening question to final payoff.
5. Draft for spoken delivery. Read the narration aloud, revise it for speech, and time it against the runtime.
6. Add an adjacent treatment for visuals, candidate assets, motion, on-screen text, audio, and accessibility without contaminating the narration.
7. Run separate story, evidence, fact, rights, visual, animation, accessibility, and format audits, then run the deterministic validator.

## Non-negotiable rules

- Never invent factual scene details such as dialogue, weather, motives, thoughts, chronology, or sensory detail.
- Let confidence control narration. Omit rejected claims. Use an unverified example only when it is attributed, explicitly caveated, and non-load-bearing.
- Audit evidence sufficiency and asset rights separately.
- Give every important fact a visual decision; do not assume every fact needs a unique image.
- Provide actual candidate asset pages when practical. Record the rights status and an ownable fallback, and never call an asset cleared without a documented basis.
- State the explanatory purpose of each animation. If motion adds no understanding, choose a still or no animation.
- Keep production notes adjacent to the narration they support while keeping the narration itself clean.
- Complete the end evidence ledger, visual ledger, uncertainty register, and attribution or credits section.
- Never self-promote a script to `RECORD-READY` from a validator result or rubric score.

## Resource routing

- Read [the story and hook method](references/story-and-hook-method.md) before choosing an opening or restructuring a story.
- Read [the research and rights method](references/research-and-rights.md) before web research, claim approval, visual sourcing, or rights labeling.
- Read [the annotated script format](references/annotated-script-format.md) before drafting the deliverable.
- Use [the annotated script template](assets/annotated-script-template.md) as a worked shape, never as preverified episode content.
- Read [the quality rubric](references/quality-rubric.md) during the final editorial pass.

## Validation and completion

Resolve the skill directory from the loaded `SKILL.md`, change to that directory, and run:

```bash
python3 scripts/validate_annotated_script.py <script-path>
```

Do not hardcode an absolute path or a vendor-specific environment variable. Treat the validator as structural only; factual truth, rights clearance, editorial judgment, and production approval still require human review.

Report readiness honestly. List every unresolved fact, rights, and production item, and do not infer `RECORD-READY` from automated validation alone.
