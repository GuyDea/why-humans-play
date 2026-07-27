# WHP Human-Nerve Angle Gate — Design

- **Status:** Accepted for implementation
- **Date:** 2026-07-28
- **Target:** WHP topic selection and the raw-topic handoff into script writing
- **Branch:** `episode1-story-rebuild`

## Purpose

Make every raw subject earn a specific, personally recognizable angle before mechanism
selection, packaging, story planning, or narration. The workflow must find the human nerve
people already feel, verify that it is broad enough to matter, and choose an explanatory
mechanism that fully pays the resulting title promise.

This tightens the existing painpoint-first rule after a live failure. Given `Popularity`,
the current skill produced an abstract taste-autonomy concern and a social-proof mechanism.
The output was plausible, but its title left the object and personal stakes vague. A
stronger pass found the concrete belonging fear beneath the topic: “Am I less wanted than
everyone around me?”

## Accepted behavior

Treat a subject as search territory, never as an angle. Before choosing a technical
mechanism or drafting a title:

1. inspect current audience language and evidence for recurring questions, fascinations,
   fears, desires, identity threats, and dilemmas around the subject;
2. compare several specific candidate nerves rather than accepting the first relevant
   concern;
3. anchor each candidate in a recognizable person, moment, object, and consequence;
4. express the strongest supported candidate as a concrete first-person concern or
   dilemma;
5. reject vague referents, generic relevance, and titles whose personal importance needs
   a paragraph of explanation;
6. select an evidence-backed mechanism only when it explains that nerve;
7. build an honest title and opening promise around the nerve; and
8. verify that the episode's evidence and payoff can completely satisfy the promise.

For problem-led subjects, the nerve may be a fear, pain, insecurity, loss of control,
status threat, or consequential dilemma. Wonder-, history-, and explicit-game-led subjects
may instead use a specific mystery, desire, identity tension, or fascination. Never invent
suffering merely to intensify a topic.

## Ownership and handoff

Use one detailed owner:

- `.agents/skills/choosing-whp-video-topic/references/research-method.md`, section
  `Subject-to-angle development`, owns audience-language discovery, nerve comparison,
  specificity tests, mechanism fit, title-promise fidelity, the worked example, and the
  angle handoff.

Every other active surface stays deliberately thinner:

- `.agents/skills/choosing-whp-video-topic/SKILL.md` owns the trigger, operation boundary,
  checklist item, and route to the detailed owner.
- `.agents/skills/choosing-whp-video-topic/references/output-contract.md` owns report
  fields, not the discovery method.
- `whp-youtube/STEERING.md` owns the permanent editorial invariant and links to the
  detailed owner.
- `docs/steering/whp-video-topic-skill.md` records the architectural ownership decision.
- `.agents/skills/writing-whp-youtube-scripts/SKILL.md` consumes a selected angle. When
  given only a raw subject, it invokes the bounded topic-angle operation instead of
  recreating the method.
- The script architecture and story-progression methods consume the approved promise,
  evidence boundary, and payoff. They do not select the audience nerve again.
- `DECISIONS.md` preserves provenance and is not an operational owner.

Package tests must assert both sides of this contract: the detailed method exists in its
owner, and owner-only anchors do not appear in consumers. Cross-links must target the
declared owner heading.

## Verification

1. Preserve the live `Popularity` miss as the baseline RED case.
2. Add a package test that fails because the nerve, specificity, promise-fidelity, and
   single-owner contracts are absent.
3. Implement the minimum owner and routing changes.
4. Run the topic and script package suites.
5. Forward-test unfamiliar raw subjects without leaking expected answers.
6. Search active operational documents for mirrored owner anchors.
7. Run repository skill validation, `git diff --check`, and a complete diff review.

## Boundaries

- Do not change an episode topic, package, architecture, progression, or narration.
- Do not turn every subject into fear-based packaging.
- Do not promise that one audience signal proves broad demand.
- Do not let emotional force lower the evidence bar.
- Do not copy the detailed gate into script architecture, story progression, rapid
  drafting, output formatting, or canonical steering.
