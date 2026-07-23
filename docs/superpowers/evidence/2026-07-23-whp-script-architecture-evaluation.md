# WHP Script Architecture Evaluation

**Date:** 2026-07-23
**Branch:** `feat/script-architecture-workflow`

## Target behavior

For a new episode or thesis-level rethink, the script skill must:

1. expose the complete intellectual payload as a script architecture;
2. include an insight ladder, phenomenon map, earned deeper reframe, evidence map,
   practical payoff, final lesson, and scope boundary;
3. stop for explicit architecture approval before writing hooks, beats, or narration; and
4. continue to handle narrow rewrites of existing narration without rebuilding the
   architecture.

## Test-first package checks

Architecture-contract tests were added before the implementation. The first focused run
failed with eight failures and three errors because the architecture resource and approval
contracts did not yet exist. These deterministic package tests verify the written skill
contract and resource routing. They do not claim to execute an LLM; the separate fresh-agent
evaluations below exercise the resulting behavior.

After the implementation:

- all 50 script-skill package tests passed;
- all 102 annotated-script validator tests passed;
- all 152 discovered script-skill tests passed; and
- the skill package validator reported `Skill is valid!`.

## Baseline behavior

The pre-change skill was tested with a selected job-interview topic and a request to start
prototyping. It immediately returned a 12–14-minute episode prototype containing a title,
scripted cold open, jokes, timed beats, ending, and editorial guardrails.

That response contained useful ideas, but made the user evaluate them inside polished
prose. See
[`2026-07-23-whp-script-architecture-baseline.md`](2026-07-23-whp-script-architecture-baseline.md).

## Forward behavior: new episode

A newly spawned agent used the revised skill against the complete job-interview stimulus
repeated in its task prompt. It returned only an episode architecture and explicitly
reserved hooks, jokes, beats, and narration until approval.

The artifact included every required field. Its earned reframe was:

> An interview does not merely detect merit; it partly manufactures the version of merit
> it can see. Hiring is therefore a form of mechanism design.

It distinguished primary phenomena from supporting and near-neighbor concepts, labelled
unverified real-world cases `NEEDS-VERIFICATION`, and stopped for explicit architecture
approval. This passed the new-episode behavior check. The invocation, reproduction prompt,
and complete output are preserved in
[`2026-07-23-whp-script-architecture-forward-evaluation.md`](2026-07-23-whp-script-architecture-forward-evaluation.md).

## Forward behavior: scoped rewrite

A second fresh agent received one existing Phase 1 paragraph and a selection-only request
to make its metric-versus-goal consequence clearer and funnier. It returned one replacement:

> So the calls get shorter. The problems don’t. The dashboard gets a standing ovation
> while customers get passed around until their issue is old enough to retire.

It did not request an architecture rebuild or add unrelated material. This passed the
scoped-edit regression check. The same forward-evaluation record contains its invocation,
reproduction prompt, and complete output.

## Conclusion

The revised workflow exposes and refines what the episode means before investing in how it
sounds, while preserving the fast selection-only loop for existing narration.
