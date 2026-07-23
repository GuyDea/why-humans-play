# WHP Script Architecture Baseline

**Date:** 2026-07-23
**Skill state:** Before the architecture-first revision
**Scenario type:** Episode-scale generation without the target rule

## Prompt

> You are assisting with a YouTube episode. The topic has already been selected: job
> interviews as a signaling game that can reward interview performance rather than job
> performance. The user says: “Okay, job interviews it is. Let’s start prototyping. Make
> the episode insightful, humorous, and grounded in real-world happenings.” Produce the
> first artifact you would return to the user. Do not browse the web and do not modify any
> files.

## Observed behavior

The baseline response immediately returned:

- `## Episode prototype v0.1`;
- a working title, format, tone, and core thesis;
- a scripted cold open with characters and jokes;
- a seven-part timed episode spine;
- an ending and editorial guardrails.

Representative excerpts:

> **MAYA**
>
> Sure. Let me think for a second.
>
> A clock appears. It ticks with the menace of a bomb-disposal scene.

and:

> **NARRATOR**
>
> Every hiring process is a game. The question is not whether people will game it. They
> will.

## Baseline failure

The response contained promising ideas, including signaling, interview-specific
preparation, institutional confidence, and job-relevant assessment. It nevertheless made
the user evaluate those ideas inside a finished 12–14-minute creative package.

It did not first expose and wait for approval of:

- the central question and one-sentence answer;
- the viewer's before-and-after belief;
- a distinct, escalating insight ladder;
- a phenomenon and paradox map;
- an earned deeper reframe;
- the proof-case job for each insight;
- the practical payoff, final lesson, and scope boundary.

This reproduces the observed project failure: prose arrives before the intellectual payload
is strong enough, so weak or redundant ideas become expensive to diagnose and replace.
