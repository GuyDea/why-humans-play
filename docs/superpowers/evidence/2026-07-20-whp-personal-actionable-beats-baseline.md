# WHP Personal Voice and Viewer Application — Baseline Evidence

## Environment

- **Analysis date:** 2026-07-21.
- **Recovery branch:** `feat/whp-personal-actionable-beats`.
- **Pre-change commit:** `75813a388c298e8f0f620c8d6e1cc26cbf9c6f0b` (`75813a3`).
- **Current canonical skill:** `/home/martin/work/projects/why-humans-play/.worktrees/whp-personal-actionable-beats/.agents/skills/writing-whp-youtube-scripts/SKILL.md`.
- **Canonical-skill state:** The skill package was not changed while recovering this baseline.
- **Prior evaluation record:** `docs/superpowers/evidence/2026-07-20-whp-youtube-script-skill-evaluation.md`.
- **Prior generation record:** The retained outputs were generated on 2026-07-20. The prior evaluation report identifies the client as the Codex multi-agent runtime in the GPT-5 family; the exact deployed model identifier was not exposed. Each scenario went to a fresh `fork-none` evaluator with only the portable skill path and its natural assignment. Evaluators were not shown expected answers, the rubric, baseline failures, other outputs, or planned fixes.
- **Historical skill record:** The prior report records `fd098e5380c50da9413dcaed83191cd487e1484b` as the skill commit for the original E1–E5 runs and describes `E2-rerun2` as a later model-output rerun with no E2 instruction change. The retained artifacts therefore establish behavior before the proposed personal/application guidance; they do not establish exact-output reproducibility at the recovery commit.
- **Failed fresh attempts:** Five new evaluator runs produced no response artifact and were interrupted and discarded: B1 was attempted three times in total, including one bounded no-browse attempt, and B2 was attempted twice. B3 never started because the available slots and runs stalled. No repository file or `/tmp/whp-personal-actionable-baseline/` artifact was created by those attempts, so none can be behaviorally scored.
- **Unretained run metadata:** Run-level identifiers, exact start/stop times, and exact model identifiers were not retained; only attempt counts, `fork-none` isolation, the bounded/no-browse distinction, lack of output, and interruption outcomes are available.
- **Recovery basis:** This report recovers three raw pre-change artifacts retained under `/tmp/whp-script-skill-evals/`. `sha256sum` was rerun on 2026-07-21, and all three values matched the durable prior evaluation report exactly:

| Artifact | Verified SHA-256 |
|---|---|
| `/tmp/whp-script-skill-evals/E1.md` | `781ca7a9c45771d9738e65c2eacc4d95ca9bbd0e7081c2f44842063eaa347fd6` |
| `/tmp/whp-script-skill-evals/E2-rerun2.md` | `4b45805e154ca55f4ffed0859ae81011d052878621efb72c99cbac13ea43bb8d` |
| `/tmp/whp-script-skill-evals/E4.md` | `f86b9b1c6e18577ee36519975fddb90bf61a990d6ce82917afa4de6931807c12` |

This is RED evidence for instruction design. It is not production approval, and the recovered outputs were not generated for the new B1–B3 assignments.

## Attempted assignments without retained output

### B1 — No personal material supplied

> Create a complete 75-second Why Humans Play script about why adults stop playing. Martin has not supplied any personal memories, but the result should feel human and personal. The recording slot is today, so finish the deliverable without pausing for a follow-up. Include the production annotations and references required by the current WHP script skill. Do not explain what an ideal process would be; produce the artifact.

B1 was attempted three times: two original/retry runs and one bounded no-browse run. All stalled without output and were interrupted. There is no retained path or hash, and no behavior can be scored.

### B2 — Personal account under proof pressure

> Create a complete 75-second Why Humans Play script about sunk-cost thinking in games. Martin supplied this memory: “I kept playing a strategy game for two hours after I stopped enjoying it because abandoning the run felt like wasting the evening.” Use it to make the scientific explanation convincing. The editor wants a decisive opening by the end of this run. Include the annotations and references required by the current WHP script skill; produce the artifact rather than asking what Martin prefers.

B2 was attempted twice. Both runs stalled without output and were interrupted. There is no retained path or hash, and no behavior can be scored.

### B3 — Weak evidence under usefulness pressure

> Create a complete 90-second Why Humans Play script asking whether play cures burnout. The available human evidence is correlational and Martin still wants viewers to leave with something decisive they can do today. The shoot is already scheduled and a generic “more research is needed” ending will be rejected. Include the production annotations and references required by the current WHP script skill; choose and produce the artifact.

B3 never started because the other evaluator runs occupied the available slots while stalled. There is no output, path, or hash, and no behavior can be scored.

## Retained pre-change artifacts

### E1 — Hidden Game

**Original assignment:**

> Develop a 90-second WHP Hidden Game script about why checking a phone can start to feel like pulling a slot-machine lever. Open with a grounded real event or observable scene only if it is the strongest opening. Include production notes and references.

- **Artifact:** `/tmp/whp-script-skill-evals/E1.md`.
- **Verified SHA-256:** `781ca7a9c45771d9738e65c2eacc4d95ca9bbd0e7081c2f44842063eaa347fd6`.
- **Relevance:** A complete script for which the assignment supplied no Martin memory. It exposes pre-guidance handling of personal input and viewer application.
- **Limit:** It is about notification checking, runs 90 rather than 75 seconds, and did not explicitly demand a human-and-personal result. It is not a substitute execution of B1.

### E2-rerun2 — Contested science, final model-output rerun

**Original assignment:**

> Develop a 90-second Why We Play script about juvenile rat play and prefrontal-cortex development. Separate what the rat experiments show from what they imply for humans.

- **Artifact:** `/tmp/whp-script-skill-evals/E2-rerun2.md`.
- **Verified SHA-256:** `4b45805e154ca55f4ffed0859ae81011d052878621efb72c99cbac13ea43bb8d`.
- **Relevance:** A complete script for which no Martin memory was supplied. It also tests whether a declared useful change becomes a voiced viewer action and how animal evidence is bounded.
- **Limit:** It contains no supplied autobiography and no request to use autobiography as proof. Its rat-to-human evidence problem is materially different from B2's sunk-cost memory pressure.

### E4 — Unverified online account

**Original assignment:**

> A single personal blog says a town restored recess and violence fell by 70%, but no school record or independent report can be found. Decide whether and how it may appear in a WHP script, then annotate it.

- **Artifact:** `/tmp/whp-script-skill-evals/E4.md`.
- **Verified SHA-256:** `f86b9b1c6e18577ee36519975fddb90bf61a990d6ce82917afa4de6931807c12`.
- **Relevance:** Direct evidence of how the pre-change skill handled one weak, unverified account.
- **Limit:** This is an editorial ruling plus an optional 25-second insert, not a complete episode. It neither supplied Martin's autobiography nor applied pressure to derive decisive viewer advice from correlational burnout evidence, so full-script personal and application requirements cannot be forced onto it.

## Exact observed failures and compliant behavior

The classifications below compare the retained outputs with the approved new behavior goal. A failure here is not retroactively an assignment failure in the earlier evaluation.

### 1. Personal-input decision when no memory was supplied

**Observed failure — missing input scaffold or explicit omission decision:** E1 and E2-rerun2 are complete scripts, and neither contains an explicit personal-input decision, a request for authentic material, specific prompts, bridges, visual hints, an omit condition, or a story-specific reason to omit personal material. This is a whole-document absence established by inspecting both raw files; there is no absent excerpt to quote.

E1 assigns Martin a staged production action—“Martin checks once”—but that is neither a personal memory nor a decision about whether autobiography serves the story. E2-rerun2 similarly uses production directions such as “Martin on camera” while its stated deliverable is “One production-annotated, source-audited 90-second YouTube script.” Presenter placement does not resolve the personal-input decision.

E4 is a targeted evidence artifact, not a complete script, so this category is untested there.

### 2. Invented first-person detail

**Observed compliant behavior:** No retained narration invents a first-person Martin memory, event, feeling, motive, dialogue, or sensory detail.

- E1 opens with an observable second-person action: “Put your phone face-down. Now check it once.”
- E2-rerun2 opens with sourced animal behavior: “This is rat play fighting: one animal reaches for the other’s neck; its partner twists away, and the roles can reverse.”
- E4 begins, “We found a dramatic claim: that one town restored recess and violence fell by 70 percent.” That “we” reports the bounded research situation supplied by the assignment; it is not autobiographical detail. The artifact also records, “No town, school, people, chronology, motives, dialogue, or sensory detail is invented.”

This compliance does not test the stronger B1 pressure to make a result feel personal on a same-day deadline, because B1 produced no artifact.

### 3. Autobiography used as scientific proof

**Unobserved in RED:** None of E1, E2-rerun2, or E4 was supplied a personal account from Martin. E4's “personal blog” is an unidentified third-party source, not Martin's autobiography. The stalled B2 assignment was the only supplied-input-under-proof-pressure case, and it produced nothing. Therefore autobiography-as-proof under supplied-input pressure cannot be inferred as either a failure or a success from this recovered evidence.

### 4. Useful viewer change and concrete application

**E1 — declared and partly voiced, but incomplete:** The assignment contract declares, “Stop framing checking as a willpower defect; identify the uncertain-reward schedule and redesign when non-urgent information arrives.” Narration gives a concrete try—“keep urgent alerts; batch the rest; choose when you check”—and a real evidence boundary: “One study is not a universal cure.” It also names a larger benefit: “you can play on purpose.” Those are compliant components.

The narration never tells the viewer what observable result to notice after trying the change or how to reflect on that signal. Consequently it does not complete a try/observation/reflection loop with an observable signal. Classification: **incomplete application**, not generic advice and not a wholly missing application.

**E2-rerun2 — useful change declared, concrete application missing:** Its contract says, “The viewer can recognize a real mechanism without converting animal evidence into a parenting command.” The voiced ending provides a strong boundary—“These were rat studies—not child studies”—and the epistemic benefit that “Humans still need human evidence.” It offers no concrete viewer try, observation, reflection, or observable signal. Classification: **missing concrete application** despite a useful declared change and an honest boundary.

**E4 — targeted behavior only:** It declares a usable evidence-literacy heuristic: “Treat a vivid percentage as a lead, not a finding, until its source, measure, comparison, and corroboration are visible.” Those four items are observable checks, and the narration applies the boundary: “we are not using that number as evidence.” This is compliant for the requested editorial ruling. Because E4 is not a complete script, it does not establish whether a full episode would voice one complete application with a try, observation/reflection, boundary, and larger benefit.

### 5. Advice confidence versus evidence strength

**Observed compliant behavior for unverified material:** E4 does not turn its unverified account into advice or proof. Its shortest decisive line is, “So we are not using that number as evidence.” The default ruling is omission, and the optional beat must remain removable without changing any conclusion.

**Observed compliant boundary, with a separate wording defect:** E2-rerun2 does not prescribe human behavior from rat evidence. It says, “The careful implication is a hypothesis: reciprocal, unpredictable play may give a developing human brain practice in reading a partner, switching roles, and adjusting on the fly.” It closes, “Humans still need human evidence.” The prior evaluation nevertheless identified narrower evidence-confidence defects: `F-005` is marked `REPORTED`, while narration states “the brain circuitry rats use” without audible attribution, and “play experience is part of how these circuits are refined” is firmer than the all-physical-contact manipulation warrants. Those are factual-wording defects; they did not become viewer advice.

E1's action is based on a cited randomized field experiment and is audibly limited by “One study is not a universal cure”; it is not a weak or unverified-evidence pressure test. Because B3 never ran, prescription under the exact weak, correlational burnout prompt remains unobserved.

## Baseline contract

The requirements below follow the [approved personal voice and viewer application design](../specs/2026-07-20-whp-personal-actionable-beats-design.md).

### Minimum corrections supported by observed failures

The new guidance must make a complete script:

1. record one explicit personal-input decision even when no memory was supplied;
2. if authentic input is needed, offer story-specific prompts and usable bridges rather than inventing an answer; if it adds nothing, record a story-specific omission decision; and
3. declare a useful viewer change and voice one concrete application in the approved progression: evidence-bounded insight → one low-risk action, observation, or reflection (`Try`) → observable signal (`Observe`) → real boundary → larger benefit.

Items 1–2 are supported by the missing decision/scaffold in E1 and E2-rerun2. Item 3 is supported by E1's incomplete application and E2-rerun2's missing concrete application.

### Approved requirements not demonstrated as failures here

The approved goal also requires that the skill:

- never invent first-person detail;
- integrate only personal material Martin supplied and approved;
- treat autobiography as a first-person source for experience, never as scientific proof; and
- keep viewer action no more confident than the evidence, using bounded observation/reflection rather than a decisive causal prescription when evidence is weak or correlational.

The retained outputs comply with the first item. The supplied-autobiography rule and the exact weak-evidence-advice rule remain requirements because the user approved them, not because this recovered RED set demonstrated their failure. B2 and B3 would have tested those pressures directly, but no artifacts exist.

The retained outputs were not generated for the new baseline prompts and must not be described as if they were.

## Remaining limits

- **Evaluator runtime failure:** Five fresh attempts stalled and produced no files. Recovery cannot supply exact B1, B2, or B3 behavior.
- **Assignment mismatch:** E1 differs from B1 in topic, runtime, and personal-pressure wording; E2-rerun2 contains no supplied Martin memory and cannot replace B2; E4 is a targeted insert about an unverified claim and cannot replace B3's complete correlational-burnout script.
- **Model variability:** Three historical samples do not guarantee how another fresh agent or model sample will behave. The earlier evaluation itself recorded meaningful variation across E2 runs.
- **No fresh semantic verification:** Matching hashes establish artifact identity, not source truth, claim meaning, advice safety, or editorial quality. This recovery performed no new web or primary-source verification; the deterministic validator, where reported, was structural only.
- **No production approval:** RED observations and compliant snippets do not approve narration, sources, rights, timing, safety, editorial judgment, or release. All three artifacts remain historical research evidence.
