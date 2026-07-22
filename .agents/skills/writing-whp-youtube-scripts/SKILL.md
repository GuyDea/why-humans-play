---
name: writing-whp-youtube-scripts
description: "Use when ideating, drafting, reviewing, or revising Why Humans Play YouTube scripts and openings, or when turning an approved prototype into an evidence-backed, production-annotated episode."
---

# Write Why Humans Play YouTube Scripts

## Overview

Use one skill for two phases: rapid creative prototyping and evidence-backed production.
Default to the rapid phase and protect creative momentum; enter production only through the
explicit approval gate. Put the viewer promise and honest inquiry before retention tricks.

Do not use this skill for unrelated ads, social posts, or general marketing copy.

## Required project context

Locate the repository root. For a new topic, structure, narration, production promotion, or
policy-sensitive change, read `BRAND.md` first and `whp-youtube/STEERING.md` second. If either
required file is absent, report the missing canonical context instead of inventing policy.

When a scoped review, selection rewrite, or alternatives request supplies the artifact,
selection, surrounding context, and narrative job, use those inputs directly; do not reread
canonical project files unless the request changes channel policy or lacks needed context.

Use a supplied selected topic brief as the handoff from topic selection. Do not rerun topic
ideation unless Martin explicitly asks. Carry forward the available audience, packaging
promise, tension, by-end promise, payoff, factual anchors, and unknowns. Missing nonessential
fields must not block a useful prototype; ask only when a missing choice would materially
change the requested artifact.

## Choose the operation

Honor the requested scope before choosing a phase:

- **Generate:** return one requested structure, opening, passage, or narration.
- **Review:** return findings without rewriting the supplied text.
- **Rewrite selection:** replace only the selection and preserve its surrounding language
  and narrative job.
- **Generate alternatives:** return distinct labeled choices without changing or choosing
  among them.
- **Promote:** after explicit creative approval, preserve the voice baseline and enter
  Phase 2.

Use the visible topic brief, artifact or selection, surrounding context, requested operation,
and creative status. Do not make an operation depend on invisible chat history.

## Phase 1 — Rapid prototype

Default to Phase 1 for ideas, openings, hooks, rough drafts, short narration, humor or voice
passes, and scoped refinement.

Return the requested artifact directly. Do not perform web research, write an assignment
contract or evidence packet, force three opening candidates, create annotated-script
scaffolding, plan visuals or rights, run the production rubric, or invoke the validator
unless Martin explicitly asks for that work.

Use supplied facts and facts already available in current project materials. Never invent
specificity to make a draft sound authoritative. Preserve accepted language and revise only
the requested scope. Follow the rapid method for the hook, humor, examples, spoken rhythm,
factual boundary, and internal quality check.

## Creative approval gate

Remain in Phase 1 until Martin explicitly approves the premise, voice, hook, and story
direction or directly requests evidence-backed finalization. Positive feedback on one line
or passage does not approve the complete narration.

Preserve the approved prototype as the voice baseline; research may narrow claims but must
not silently replace its structure or personality.

## Phase 2 — Evidence and production

For evidence-backed finalization:

1. Write an assignment contract that fixes the episode mode, audience, promise,
   `Deliverable`, `Useful viewer change`, scope, runtime, constraints, and payoff.
2. Extract the material claims from the approved prototype. Build the evidence packet,
   assign confidence to every material claim, and approve only wording its evidence
   supports. Narrow or remove unsupported wording while preserving the approved voice.
3. Use the detailed story method to test promise and payoff. When a comparison is useful,
   develop and score three eligible opening candidates; do not force that exercise when
   Martin has approved an opening that survives the evidence audit.
4. Map a narrative spine in terms of how the viewer's understanding changes from the
   opening question to the final payoff.
5. For a `FULL-SCRIPT`, choose one personal-input decision: request authentic input with
   specific prompts and bridges, integrate only material Martin supplied, or omit the
   sequence when it does no narrative work.
6. For a `FULL-SCRIPT`, build one viewer application in this order:
   `insight → try → observe → boundary → larger benefit`. Keep the try no stronger than
   its evidence. Voice all five elements in narration—the insight; the low-risk action,
   observation, or reflection; the observable signal; the boundary; and the larger
   benefit—not only in the structured block.
7. Expand and draft for spoken delivery. Read the narration aloud, revise it for speech,
   and time it against the target runtime without sanding away the approved personality.
8. Add an adjacent treatment for visuals, candidate assets, motion, on-screen text, audio,
   and accessibility without contaminating the narration.
9. Run separate story, personal-authenticity, evidence, fact, rights, visual, animation,
   application-boundary, accessibility, and format audits, then run the deterministic
   validator.

## Production non-negotiables

- Never invent factual scene details such as dialogue, weather, motives, thoughts,
  chronology, or sensory detail.
- Let confidence control narration. Omit rejected claims. Use an unverified example only
  when it is attributed, explicitly caveated, and non-load-bearing.
- For every `FULL-SCRIPT`, choose exactly one personal-input decision:
  `INPUT-REQUESTED`, `COMPLETED`, or `OMIT`. Never invent Martin's experience or use it as
  proof of prevalence, causality, or mechanism.
- For every `FULL-SCRIPT`, voice all five viewer-application elements in narration:
  evidence-bounded insight; low-risk action, observation, or reflection; observable signal;
  real boundary; and larger benefit. The structured block does not substitute for spoken
  copy.
- Audit evidence sufficiency and asset rights separately.
- Give every important fact a visual decision; do not assume every fact needs a unique
  image.
- Provide actual candidate asset pages when practical. Record the rights status and an
  ownable fallback, and never call an asset cleared without a documented basis.
- State the explanatory purpose of each animation. If motion adds no understanding, choose
  a still or no animation.
- Keep production notes adjacent to the narration they support while keeping the narration
  itself clean.
- Complete the end evidence ledger, visual ledger, uncertainty register, and attribution or
  credits section.
- Never self-promote a script to `RECORD-READY` from a validator result or rubric score.

## Resource routing

- For Phase 1 and scoped operations, read [the rapid prototyping method](references/rapid-prototyping.md).
- In Phase 2, or when Martin explicitly requests opening comparison or story restructuring,
  read [the story and hook method](references/story-and-hook-method.md).
- Before web research, claim approval, visual sourcing, or rights labeling, read
  [the research and rights method](references/research-and-rights.md).
- Before drafting a Phase 2 deliverable, read
  [the annotated script format](references/annotated-script-format.md).
- Use [the annotated script template](assets/annotated-script-template.md) as a worked shape,
  never as preverified episode content.
- During the final Phase 2 editorial pass, read
  [the quality rubric](references/quality-rubric.md).

## Validation and completion

Validation applies to the annotated Phase 2 deliverable, not rapid prototypes.

Resolve the target script path to an absolute path at runtime before changing to the skill directory.
Resolve the skill directory from the loaded `SKILL.md`, change to it, and run:

```bash
python3 scripts/validate_annotated_script.py -- "<resolved-script-path>"
```

Do not hardcode the skill package path or use a vendor-specific environment variable.
The dynamically resolved target path may be absolute; pass it as one quoted argument after `--`.
Treat the validator as structural only; factual truth, rights clearance, editorial judgment,
and production approval still require human review.

Report readiness honestly. List every unresolved fact, rights, and production item, and do
not infer `RECORD-READY` from automated validation alone.
