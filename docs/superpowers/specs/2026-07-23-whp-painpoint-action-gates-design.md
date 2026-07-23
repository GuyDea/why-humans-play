# WHP Painpoint and Learning/Action Gates — Design

- **Status:** Accepted for implementation
- **Date:** 2026-07-23
- **Target:** WHP topic-selection and script-writing skills
- **Branch:** `skill/painpoint-action-gates`

## Purpose

Make WHP topic selection begin from the audience problem rather than an interesting
technical mechanism, and make every approved script architecture guarantee both a new
understanding and a concrete viewer response before narration begins.

The change addresses two failure modes discovered while revisiting Episode 1:

1. a technically interesting subject can be narrower than the pain viewers actually feel;
2. a script can explain a topic competently yet leave the viewer with no memorable,
   actionable change.

## Accepted decisions

### Problem-led topics start from pain

For episodes competing on an existing viewer problem, candidate generation begins by
identifying specific lived painpoints and evidence of their breadth. The skill compares:

- the target viewer;
- the exact moment in which the problem appears;
- the human cost;
- evidence of reach, recognition, frequency, and consequence;
- whether the problem remains unresolved;
- the familiar surface explanation;
- the hidden game or mechanism that makes the problem legible;
- the new understanding; and
- the usable response.

“Widest” means widest specific, recognizable pain—not the broadest possible label.
“AI is changing everything” and “reward hacking” do not qualify as pain statements.
The technical mechanism is selected after the audience problem, as the explanation that
best earns the WHP reframe.

Wonder-, history-, and explicit-game-led episodes may begin from a shared mystery, desire,
or tension rather than suffering. They retain the same requirements for a recognizable
human stake, a new understanding, and a useful payoff.

### Every architecture guarantees learning and action

The script architecture gains a mandatory learning-and-action contract:

- **New understanding:** the non-obvious model or reframe the viewer gains.
- **Prior model revised:** the familiar belief it corrects or deepens.
- **Concrete response:** the action, observation, or reflection to use in a named
  situation.
- **Decision rule or sequence:** enough specificity to perform the response.
- **Observable result:** what the viewer should notice if it helps.
- **Boundary:** what the response does not prove or solve.
- **Transfer:** at least one other situation where the lesson applies.

The compact acceptance test is:

> Before, I thought X. Now, I understand Y. Next time, I will do Z. I will know it helped
> when I observe W.

An architecture fails if either the new understanding or the concrete response is
missing. “Be careful,” “think critically,” “ask better questions,” and loose checklists
without a decision rule, sequence, or observable result do not pass.

## Architecture and data flow

```text
audience signals
    -> specific painpoints or shared tensions
    -> WHP mechanism and angle
    -> topic gates, evidence, packaging, winner
    -> script architecture
    -> non-obvious insight + concrete response + observable boundary
    -> approval
    -> narration prototype
```

The topic skill continues to own comparison and selection. The script skill continues to
own architecture onward. No app schema, runtime, validator, episode selection, or current
launch-sequence change is part of this work.

## Files and interfaces

### Canonical doctrine

- `BRAND.md` — state the double-payoff editorial bar.
- `whp-youtube/STEERING.md` — add the problem-led topic rule and architecture gate.
- `docs/steering/whp-video-topic-skill.md` — record the updated selection decision.
- `DECISIONS.md` — record both definite decisions separately.

### Topic-selection package

- `SKILL.md` — require painpoint-first generation for problem-led candidates.
- `references/research-method.md` — define the evidence and comparison contract.
- `references/output-contract.md` — expose the audience tension in candidate and winner
  records.
- `scripts/test_skill_package.py` — guard the distributed contract.

The six existing WHP eligibility gates and 100-point score remain intact. The new rule
changes candidate construction and the evidence needed to support demand and payoff; it
does not add fake numeric precision or turn suffering into a universal requirement.

### Script-writing package

- `SKILL.md` — make the double payoff a non-negotiable architecture gate.
- `references/script-architecture.md` — add the exact learning-and-action artifact.
- `references/rapid-prototyping.md` — preserve the approved contract in the opening,
  narration, application, and ending.
- `references/quality-rubric.md` — reject vague or non-observable payoffs during review.
- `scripts/test_skill_package.py` — guard the distributed contract.

The production script's existing viewer-application block remains valid. This design moves
the key decision earlier, so the later application implements an approved payload rather
than attempting to invent usefulness after the narration exists.

## Verification

1. Run both skill-package tests before changes.
2. Add deterministic tests that fail while the new contracts are absent.
3. Implement the minimum distributed documentation changes.
4. Run both package suites, repository skill validation where available, and
   `git diff --check`.
5. Apply the updated architecture template to the current AI/human-interaction candidate.
6. Review the generated architecture against the painpoint, insight, action, observable
   result, boundary, and transfer gates before presenting it.

## Boundaries

- Do not claim that the current AI/life-advice candidate has won a fresh topic-selection
  run; the regenerated architecture is an editorial candidate, not a new launch-sequence
  decision.
- Do not replace Episode 1, its current script, or the accepted launch sequence in this
  change.
- Do not perform web research or source verification while regenerating the prototype
  architecture.
- Do not add narration, jokes, hooks, or production metadata to the architecture.
