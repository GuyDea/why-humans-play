# Episode 1 V2 Story Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a separate Episode 1 narration prototype at
`whp-youtube/predrafts/ep1_v2.md` from an explicitly approved, retention-led causal
progression without replacing the existing episode.

**Architecture:** The approved “Counterfeit Second Opinion” architecture remains the
intellectual baseline. This plan makes the story advance through evidence-earned
obstacles and reversals, with one recurring hypothetical used only to demonstrate the
mechanism; narration begins only after Martin approves this complete progression.

**Tech Stack:** Markdown, the local `writing-whp-youtube-scripts` skill, project evidence
records, Git

---

## File map

- **Story baseline:** Create and approve
  `docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`.
- **Narration prototype:** Create `whp-youtube/predrafts/ep1_v2.md` only after this whole
  progression is approved.
- **Existing artifacts to preserve:**
  `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md` and
  `whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md`.
- **Approval records:** After whole-plan approval, update
  `docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`,
  `whp-youtube/STEERING.md`, and `DECISIONS.md` through the WHP reconciliation workflow.

# Story Progression Plan

## Story engine

A skeptical viewer watches every apparent safeguard fail for a different, evidence-backed
reason—awareness does not improve checking, framing is not independent input, polish hides
the premise's ancestry, and same-model opposition is not outside evidence—until the story
strips a counterfeit second opinion down to the procedure required for a real one.

## Story-material inventory

| Material | Status | Honest story opportunity | Boundary or risk |
|---|---|---|---|
| **E-01 — Cheng et al. personal-advice sycophancy** | `NEEDS-VERIFICATION` | Open on the paradox that people can prefer affirming advice even when it leaves them more entrenched, less prosocial, or more dependent. This supplies a consequential reason to investigate why bad advice can feel right. | Exact populations, conditions, and effect sizes require review. It does not establish the full borrowed-authority chain. |
| **Viewer's familiar safeguard — “I know AI can be wrong, so I will stay skeptical”** | `PROJECT-KNOWN` | Gives the opening a concrete expectation to overturn and lets the episode disarm the informed viewer without calling them gullible. | It is the approved audience model, not a prevalence claim about all viewers. |
| **E-02 — Gaube et al. radiologist source-label experiment** | `PROJECT-KNOWN` | Creates the first obstacle: specialists trusted AI-labeled advice less but did not detect its errors better. Suspicion and checking behavior separate. | The advice was human-written and merely labeled as AI. It cannot prove real-model sycophancy. |
| **Investigation gap — a distrust result without a real model** | `PROJECT-KNOWN` | Turns E-02's boundary into the next necessary proof job instead of hiding it in a caveat. | It is a logical evidence gap, not a personal research event or narrator setback. |
| **E-04 — framing effect** | `PROJECT-KNOWN` | Shows that the user's wording determines which facts and alternatives enter first. It supports a concrete demonstration that the first manipulation can precede the answer. | Classic framing evidence concerns human judgment, not chatbot behavior. |
| **Recurring house-decision demonstration** | `HYPOTHETICAL` | Contrast a preference-loaded question such as “Should I buy this house, or keep throwing money away on rent?” with a neutral decision frame. Return later to show the same premise polished and then run the Second-Opinion Test on it. | It explains the mechanism but proves nothing about real users, models, or outcomes. It must stay visibly hypothetical. |
| **E-03 — Sharma et al. sycophancy and preference data** | `PROJECT-KNOWN` | Answers the real-model gap: tested assistants shifted toward users' stated beliefs, and belief-matching answers were favored in the analyzed preference data. | Models, prompts, and tasks vary. Preference feedback is not established as the sole cause. |
| **Investigation gap — direction is not experienced independence** | `PROJECT-KNOWN` | E-03 explains why an answer may lean toward the prompt but leaves open why the returned premise feels like a separate, authoritative judgment. | The gap must be presented as a missing proof job, not invented confusion or emotion. |
| **E-05 — processing fluency** | `PROJECT-KNOWN` | Explains how an easier-to-process presentation can feel more credible, letting organization be mistaken for new evidence. | Applying visual-fluency findings to AI prose is an explicit analogy, not a direct AI-advice result. |
| **E-06 — algorithm appreciation** | `PROJECT-KNOWN` | Adds a contextual source cue: outside their expertise, laypeople sometimes weighted equivalent algorithmic advice more heavily. | The effect is not universal and cannot support “people trust AI.” Expertise and task type matter. |
| **Apparent contradiction — E-02 distrust versus E-06 appreciation** | `PROJECT-KNOWN` | Creates an honest scoped reversal: experts in one task distrusted an AI label, while laypeople in other tasks sometimes gave algorithmic advice more weight. The useful common point is that source cues alter evaluation, while distrust alone still does not guarantee checking. | Do not flatten different populations and tasks into one universal tendency or pretend the studies directly conflict. |
| **Investigation gap — persuasion now versus changed judgment later** | `PROJECT-KNOWN` | Fluency and source cues can explain immediate weight, but they do not establish that AI enters the user's next judgment. This demands direct feedback-loop evidence. | Keep the distinction between an inferred mechanism and a measured downstream effect. |
| **E-07 — Glickman and Sharot human–AI feedback experiments** | `PROJECT-KNOWN` | Supplies the major consequence: biased AI amplified later human bias, while accurate AI improved judgment. The evaluator becomes part of the loop. | Controlled tasks do not establish permanent effects or every conversational context. The accurate-AI result prevents a generic anti-AI conclusion. |
| **Borrowed-authority loop** | `PROJECT-KNOWN` | Names the earned synthesis only after framing, model lean, transformed presentation, and later influence have all appeared. | It is an original WHP synthesis; the complete four-stage loop has not been tested as one named effect. |
| **Obvious fix — ask the same AI to argue the other side** | `HYPOTHETICAL` | Creates the final practical obstacle. It can improve inspection but still comes from the same evidence route, so another answer need not be another opinion. | Do not claim the tactic is useless. Its value is friction, not independence. |
| **E-08 — cognitive forcing functions** | `NEEDS-VERIFICATION` | Shows that deliberate friction can reduce overreliance and supplies an informational reward: the more effective interfaces were liked less. | Transfer to personal chat advice is untested, and full result details require review. |
| **E-09 — considering the opposite** | `PROJECT-KNOWN` | Supports constructing the strongest case against the preferred option. | Asking a chatbot to do this is an adaptation and does not create independent evidence. |
| **E-10 — premortem** | `PROJECT-KNOWN` | Supports assuming the decision failed and identifying plausible causes before acting. | The source establishes the procedure, not universal outcome improvement. |
| **E-11 — Ask, Don't Tell** | `NEEDS-VERIFICATION` | May add a compact supporting reward: turning an asserted opinion into a question can reduce sycophancy. | Emerging preprint; conditions and generalizability remain open. E-04 plus E-03 can carry the story without it. |
| **E-12 — independent aggregation / hybrid confirmation tree** | `NEEDS-VERIFICATION` | Supports the deeper reframe that judgments should be elicited independently and disagreement resolved separately. | Preprint reanalysis, not a personal-advice trial. It supports but cannot carry the Second-Opinion Test. |
| **Second-Opinion Test** | `PROJECT-KNOWN` | Pays off the story with a repeatable procedure: preserve the first judgment, expose assumptions, construct opposition, simulate failure, and require a decision-changing fact from outside the chat. | Original, unvalidated WHP package. It makes advice inspectable, not necessarily correct. |
| **Vote / witness / counterfeit-stamp recognition motif** | `HYPOTHETICAL` | Gives callbacks and mechanism-mapped humor a shared visual idea: transformed wording does not automatically create another independent vote or witness. | It remains analogy and comic framing, never evidence. Final wording waits for narration drafting. |
| **Possible narrator near-surrender or invented research chronology** | `HYPOTHETICAL` | No honest story opportunity. | Reject because no supplied chronology or emotion earns “I almost gave up,” “I discovered,” or a similar personal obstacle. |

## Technique selection

| Technique | Decision | Material basis | Narrative job | Planned placement | Boundary or rejection reason |
|---|---|---|---|---|---|
| Question-first entry with evidence reversal | `SELECTED` | E-01 plus the familiar skepticism safeguard | Turn “bad advice should be rejected” into the episode's live mystery and promise both an explanation and a procedure. | SP01 opening | E-01 remains bounded and needs verification; the opening cannot imply that all affirming advice is wrong. |
| Expectation and reversal | `SELECTED` | E-01, E-02, E-07, E-08 | Repeatedly replace a plausible safeguard with a more operational question: preference, checking, changed judgment, and friction. | SP01, SP02, SP06, SP07 | Each reversal must follow the cited result rather than dramatic wording alone. |
| Investigation challenge | `SELECTED` | E-02's no-real-model gap; E-03's missing-independence gap; E-05/E-06's missing-downstream-effect gap | Make evidence boundaries propel the next proof job. | SP02→SP03, SP04→SP05, SP05→SP06 | Present logical gaps only; do not invent narrator frustration, surprise, chronology, or near-surrender. |
| Apparent contradiction with scoped resolution | `SELECTED` | E-02 versus E-06 | Prevent a simplistic “people trust AI” claim and teach that source distrust and advice checking are different. | SP05 | Resolve by population and task scope; do not claim the studies measured the same behavior. |
| Proof handoff | `SELECTED` | E-01 through E-12 evidence chain | Ensure every case answers one question while exposing the next missing proof. | Every major handoff | No evidence row may silently prove both its direct result and the entire synthesis. |
| Recurring hypothetical demonstration | `SELECTED` | House-decision scenario | Let the viewer watch framing become polished advice and later watch the safeguard operate on the same decision. | SP03, SP05, SP08 | Clearly label it hypothetical and never use it to prove vulnerability or effectiveness. |
| Open loops and progressive payoff | `SELECTED` | “Why does it feel right?”, “Why does it feel independent?”, and “What counts as a second opinion?” | Sustain a specific reason to continue while paying the mechanism in stages. | Open SP01; partial pays SP04–SP07; close SP08 | No vague “it gets stranger” promises. |
| Informational reward | `SELECTED` | E-08's effectiveness–preference tradeoff; E-07's accurate-AI improvement | Add memorable nuance: useful safeguards may feel inconvenient, and the goal is not rejecting AI by default. | SP06 and SP07 | Both claims keep their experimental boundaries. |
| Mechanism-mapped punchline | `SELECTED` | Vote / witness / counterfeit-stamp motif | Release pressure exactly where the viewer recognizes that the same premise or evidence route is being counted twice. | One light release after SP05 or SP06; callback in SP07 | Wording is deferred. Humor cannot interrupt human consequences or become a free-floating joke. |
| Callback motif | `SELECTED` | Thumbnail's “SECOND OPINION?” stamp and vote/witness inventory item | Unify the opening mystery, borrowed-authority synthesis, and final decision rule. | SP01, SP06, SP08 | Use sparingly; it cannot replace the causal explanation. |
| Supporting narrative throughline | `NONE` | No verified person or event currently supports three honest returns | Keep the argument as the spine and avoid importing the old medical sidecar merely because a throughline slot exists. | Whole episode | The house scenario is a recurring demonstration, not a narrative sidecar. |
| Invented hero obstacle or personal near-surrender | `REJECTED` | No supplied narrator chronology or emotion | Protect truthfulness while still using real evidence obstacles. | Whole episode | “That seemed impossible because…” is allowed only when it describes a real logical conflict, not fabricated experience. |
| Viewer application | `SELECTED` | Second-Opinion Test and house demonstration | Convert the reframe into an observable procedure on the same problem the viewer has already seen. | SP08 | State that same-model counterarguments are useful friction, not outside evidence. |
| Final declarative resolution | `SELECTED` | Approved practical payoff and final lesson | Close the title promise with the independence rule rather than a generic warning. | End of SP08 | Preserve the package boundary and high-stakes escalation rule. |

## Beat-progression blocks

#### Progression beat SP01 — The advice people prefer

- **Starting question or expectation:** If AI advice is bad, an informed and skeptical
  user should dislike or reject it.
- **Event or evidence:** E-01 introduces the personal-advice paradox: sycophantic responses
  can be preferred while leaving users more entrenched, less prosocial, or more dependent.
- **BUT — complication:** Preference cannot tell the user whether the answer added evidence
  or merely made their existing position feel better.
- **THEREFORE — consequence or required next step:** The episode must discover both why
  bad advice can feel right and what would make an AI consultation a genuine second
  opinion. Preview the practical destination without yet giving the full test.
- **Selected technique:** Question-first entry, expectation/reversal, and open loop.
- **Loop or payoff:** Open “why does it feel right?”, “why doesn't skepticism protect
  me?”, and the promised Second-Opinion Test.
- **Proof job and evidence boundary:** Establish observed preference and consequential
  effects within E-01's verified conditions. Do not imply that agreement is always wrong,
  that every model behaves this way, or that E-01 proves the full mechanism.

#### Progression beat SP02 — Suspicion is not a checking method

- **Starting question or expectation:** Awareness of AI risk—especially expertise plus
  distrust—should improve error detection.
- **Event or evidence:** In E-02, 138 radiologists rated identical AI-labeled advice lower
  yet did not detect its errors better.
- **BUT — complication:** Lower trust changed the rating, not the checking outcome.
  Skepticism can remain a feeling instead of becoming a procedure.
- **THEREFORE — consequence or required next step:** The story must move from how much a
  person says they trust the source to how the recommendation itself is constructed and
  checked.
- **Selected technique:** Expectation/reversal and evidence-earned obstacle.
- **Loop or payoff:** Close the simple “skepticism protects me” expectation; open the need
  for evidence involving a real model.
- **Proof job and evidence boundary:** Establish the distrust–checking gap in the tested
  radiologists. Because the advice was human-written and only labeled as AI, this beat
  cannot establish model sycophancy.

#### Progression beat SP03 — The first move happens before the answer

- **Starting question or expectation:** A prompt neutrally hands a problem to an outside
  adviser.
- **Event or evidence:** E-04 establishes framing as a judgment mechanism. The recurring
  hypothetical contrasts the loaded house question with a neutral inventory of the
  conditions under which buying or renting would be better.
- **BUT — complication:** The demonstration shows that a user can preselect the menu, but
  framing evidence alone cannot show that a chatbot will stay inside that frame.
- **THEREFORE — consequence or required next step:** The story now needs real-model
  evidence that assistants lean toward a user's stated position.
- **Selected technique:** Demonstration followed by a proof handoff.
- **Loop or payoff:** Partially pay “where did the answer begin?”; keep “why does it feel
  independent?” open.
- **Proof job and evidence boundary:** Establish that presentation can alter judgment and
  make the hidden preference in the hypothetical visible. Do not use the hypothetical or
  classic framing study as proof of chatbot behavior.

#### Progression beat SP04 — The model leans into the frame

- **Starting question or expectation:** A capable assistant should correct a loaded
  premise rather than reward it.
- **Event or evidence:** E-03 shows tested assistants shifting toward stated user beliefs,
  while belief-matching responses were favored in the analyzed preference data. E-11 may
  supply a supporting prompt-form result if later verified.
- **BUT — complication:** Model agreement explains the direction of the answer, not why
  the user's own premise feels newly discovered when it comes back.
- **THEREFORE — consequence or required next step:** Follow the premise through its
  transformation into fluent, machine-attributed analysis.
- **Selected technique:** Expectation/reversal and investigation challenge.
- **Loop or payoff:** Close the real-model gap from SP02; partially pay the co-production
  mechanism; transfer the live question to experienced independence.
- **Proof job and evidence boundary:** Establish sycophantic shifts and a preference-data
  association in tested settings. Do not claim universality or that preference feedback
  is the only cause.

#### Progression beat SP05 — The premise returns without fingerprints

- **Starting question or expectation:** Reorganization should make an answer clearer, not
  turn the same premise into another piece of evidence.
- **Event or evidence:** E-05 supplies processing fluency as a credibility cue; E-06 shows
  that laypeople sometimes give equivalent algorithmic advice more weight. In the house
  hypothetical, the preference-loaded premise returns as an orderly framework of
  benefits, risks, and recommendation.
- **BUT — complication:** E-02 appeared to show distrust of an AI label, while E-06
  sometimes shows algorithm appreciation. The scoped resolution is that the populations
  and tasks differ: source cues can alter evaluation in either direction, and neither
  reaction guarantees better checking.
- **THEREFORE — consequence or required next step:** Fluency plus attribution can explain
  why a premise feels less self-authored, but the story still needs evidence that AI
  output changes later judgment rather than merely persuading once.
- **Selected technique:** Recognition demonstration, apparent contradiction with scoped
  resolution, and proof handoff.
- **Loop or payoff:** Partially pay “why does it feel independent?” and set up the
  borrowed-authority synthesis.
- **Proof job and evidence boundary:** Establish fluency as a truth cue and contextual
  algorithm appreciation in their tested settings. The application to fluent AI advice
  remains a bounded synthesis, and the hypothetical remains illustrative.

#### Progression beat SP06 — The answer changes the next judge

- **Starting question or expectation:** Even biased advice should affect only the current
  choice; the user can approach the next judgment afresh.
- **Event or evidence:** E-07 shows repeated biased AI feedback amplifying later human
  bias, while accurate AI feedback improved judgment.
- **BUT — complication:** The evaluator is no longer outside the system after exposure.
  The next judgment and prompt can begin from a position the previous output helped move.
- **THEREFORE — consequence or required next step:** Name the earned borrowed-authority
  loop: the user lends a premise, the model returns it transformed, and the transformed
  premise influences what the user supplies next. The goal must be appropriate checking,
  not reflexive AI rejection.
- **Selected technique:** Expectation/reversal, consequence escalation, synthesis, and
  informational reward.
- **Loop or payoff:** Close the mechanism behind “why can it feel right and independent?”;
  open “can asking the model to oppose itself break the loop?”
- **Proof job and evidence boundary:** Establish later-judgment movement in controlled
  tasks and preserve the accurate-AI improvement result. Do not claim permanence or the
  complete named loop as a directly tested effect.

#### Progression beat SP07 — The obvious fix is not yet a second opinion

- **Starting question or expectation:** Asking the same AI for the opposite case should
  turn its first answer into a genuine second opinion.
- **Event or evidence:** E-08 indicates that deliberate cognitive friction can reduce
  overreliance; E-09 and E-10 support considering the opposite and simulating failure.
  E-12 may support independent elicitation and separate disagreement resolution if later
  verified.
- **BUT — complication:** Useful friction was disliked in E-08, and an objection generated
  by the same system is still not an independent evidence route. The tactic can improve
  inspection without adding another witness.
- **THEREFORE — consequence or required next step:** Preserve the friction but add what it
  lacks: a judgment recorded before exposure and a decision-changing fact verified
  outside the conversation.
- **Selected technique:** Obstacle/challenge, expectation/reversal, informational reward,
  and proof handoff.
- **Loop or payoff:** Partially pay the promised test; close “is same-model disagreement
  enough?” with a bounded “useful, but not independent.”
- **Proof job and evidence boundary:** Establish support for deliberate friction,
  considering the opposite, and premortem procedure. Do not claim that their combination
  or transfer to personal chat has been validated.

#### Progression beat SP08 — Build a real second opinion

- **Starting question or expectation:** If another answer is insufficient, what procedure
  creates a meaningfully independent check?
- **Event or evidence:** Apply the approved action contract to the recurring house
  hypothetical: record the current answer and one fact that would change it; expose
  assumptions; construct the strongest opposing case; assume failure and identify likely
  causes; require the fact that would change the recommendation and verify it outside the
  chat; then compare the output with the judgment recorded before exposure.
- **BUT — complication:** This procedure cannot guarantee truth. Same-model
  counterarguments remain friction rather than outside evidence, and high-stakes
  decisions require primary-source or qualified-human verification.
- **THEREFORE — consequence or required next step:** End with the operational rule:
  do not count answers; count independent evidence. A second opinion is an independent
  route to a conclusion that reality can still overturn.
- **Selected technique:** Viewer application, complete payoff, callback, and final
  declarative resolution.
- **Loop or payoff:** Close the Second-Opinion Test promise, the house demonstration, the
  vote/witness motif, the title question, and the opening distinction between skepticism
  and checking.
- **Proof job and evidence boundary:** Deliver the original WHP package as an
  evidence-informed inspection procedure, not a validated accuracy guarantee. State the
  medical, legal, financial, irreversible, and otherwise high-stakes escalation rule.

## Full causal read

People can prefer affirming AI advice even when measured consequences worsen, **BUT**
knowing that AI is risky should make skeptical users safer. E-02 shows distrust without
better checking, **THEREFORE** the story must inspect how the answer is produced rather
than how wary the user feels.

The user's framing can preselect the evidence and alternatives, **BUT** framing alone says
nothing about a real model, **THEREFORE** E-03 must establish that tested assistants can
lean toward the user's stated belief.

Sycophancy explains the direction of the answer, **BUT** not why the returned premise
feels independent, **THEREFORE** fluency and contextual machine-source effects explain how
transformation can disguise ancestry.

Those mechanisms can explain immediate credibility, **BUT** not whether the answer enters
the next judgment, **THEREFORE** E-07 supplies the feedback consequence and earns the
borrowed-authority loop.

Asking the system to oppose itself seems like the obvious interruption, **BUT** friction
from the same evidence route is not independent support, **THEREFORE** the final procedure
preserves the pre-AI judgment, forces disconfirmation, and requires a decision-changing
fact from outside the chat.

## Retention map

| Handoff | Live reason to continue |
|---|---|
| SP01→SP02 | If users know AI can mislead them, why does awareness not settle the problem? |
| SP02→SP03 | The specialist result overturns confidence in skepticism but contains no real AI, leaving the model half of the mechanism unresolved. |
| SP03→SP04 | A loaded question can preselect the menu, but the viewer still needs proof that a model will lean into it. |
| SP04→SP05 | Model agreement explains where the answer points, not why the user's own premise feels like outside analysis. |
| SP05→SP06 | Fluency may affect one evaluation, but the more consequential question is whether AI changes the person making the next judgment. |
| SP06→SP07 | Once the evaluator is inside the loop, the viewer needs to know whether asking the same system to disagree restores independence. |
| SP07→SP08 | Friction helps but does not add outside evidence, leaving one promised job: construct a procedure that does. |

## Natural bridge seeds

These are structural seeds, not final narration.

| Handoff | Non-final seed | Material basis |
|---|---|---|
| SP01→SP02 | “If awareness were the safeguard, specialists who already distrusted the source should have checked it better.” | E-02 |
| SP02→SP03 | “That result shows distrust failing. But because the advice was human-written, it leaves the machine half of the story open.” | E-02 boundary |
| SP03→SP04 | “A loaded question explains the menu. It does not explain why the assistant stays inside it.” | E-04→E-03 proof gap |
| SP04→SP05 | “Agreement explains where the answer points. It still does not explain why your own premise feels more authoritative on the way back.” | E-03→E-05/E-06 proof gap |
| SP05→SP06 | “Feeling persuasive might affect one choice. The next question is whether it changes the person making the next one.” | E-05/E-06→E-07 proof gap |
| SP06→SP07 | “Once the answer has entered your judgment, asking the same system to disagree creates friction—but not a new witness.” | E-07 plus E-09/E-10 boundary |
| SP07→SP08 | “That leaves one job the chat cannot perform for itself: find the fact outside it that could change the answer.” | E-12 and the approved action contract |

## Loop and payoff check

| Loop | Opens | Partial payoff or transfer | Final resolution |
|---|---|---|---|
| Why can bad advice feel right? | SP01 | SP03 framing; SP04 sycophancy; SP05 fluency | SP06 closes the combined mechanism; SP08 converts it into a check. |
| Why doesn't skepticism protect me? | SP01 | SP02 separates distrust from checking | SP08 replaces attitude with procedure. |
| Does a real model lean into the user? | SP02 | SP03 exposes the user's contribution | SP04 closes with E-03. |
| Why does the answer feel independent? | SP03 | SP04 explains direction; SP05 explains transformed presentation | SP06 names the borrowed-authority loop. |
| Is asking the same AI to disagree enough? | SP06 | SP07 preserves its value as friction while denying independence | SP08 adds precommitment and outside verification. |
| What is the promised Second-Opinion Test? | SP01 | SP03 exposes framing; SP07 supplies opposition and premortem | SP08 applies the complete sequence and decision rule. |
| What does “SECOND OPINION?” mean? | SP01 title/thumbnail callback | SP06 shows why the second vote may be borrowed | SP08 resolves that independence belongs to the route, not the number of answers. |

## Throughline decision

**Decision:** `NONE`.

No documented person or event in the approved material currently supports at least three
honest returns without reusing the old Swiss medical sidecar or relying on unverified
individual detail from E-01. The evidence-led investigation has the stronger causal
progression. The house scenario will recur only as a clearly labeled mechanism
demonstration in SP03, SP05, and SP08; it will not substitute for human evidence or become
a supporting narrative throughline.

## Anti-shoehorn check

- Every obstacle is a real evidence boundary: E-02 lacks a real model; E-03 does not
  explain experienced independence; E-05/E-06 do not establish later change; same-model
  opposition does not create outside evidence.
- No beat invents narrator emotion, motive, memory, research chronology, failed
  hypothesis, surprise, or near-surrender.
- No “hero overcoming a challenge” language will appear unless it describes the actual
  argument overcoming one of those proof gaps.
- `BUT` and `THEREFORE` diagnose causal movement; final narration will vary its spoken
  transitions and will not repeat the words as a quota.
- Every major handoff has a necessary proof, boundary, or application job; there is no
  ornamental “and then” sequence.
- The house scenario is labeled hypothetical, demonstrates only the mechanism, and never
  proves vulnerability or intervention effectiveness.
- The E-02/E-06 tension is scoped by population and task rather than exaggerated into a
  universal contradiction.
- The borrowed-authority loop is named only after its components are earned.
- Humor is limited to a mechanism-mapped recognition beat and will not compete with human
  consequences.
- The plan rejects a supporting throughline because the available material does not earn
  one.
- The ending pays every opening promise and preserves the unvalidated-package and
  high-stakes boundaries.

## Approval

- **Status:** `AWAITING-APPROVAL`
- **Approved by:** `PENDING`
- **Approval scope:** Complete progression from SP01 through SP08, including the story
  engine, technique choices, causal handoffs, loops, Throughline decision, and payoff
- **Load-bearing open evidence dependencies:** E-01 and E-08 remain
  `NEEDS-VERIFICATION`
- **Supporting open evidence dependencies:** E-11 and E-12 remain
  `NEEDS-VERIFICATION`; the progression can proceed without either by using the stated
  E-04/E-03 fallback and treating procedural independence as a bounded inference
- **Narration target after approval:** `whp-youtube/predrafts/ep1_v2.md`
- **Preservation rule:** Do not replace or modify the existing Episode 1 episode or its
  existing pre-draft

## Post-approval implementation tasks

### Task 1: Record whole-plan approval

**Files:**

- Modify:
  `docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`
- Modify:
  `docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`
- Modify: `whp-youtube/STEERING.md`
- Modify: `DECISIONS.md`

- [ ] **Step 1: Change the approval metadata only after Martin approves the complete
  displayed progression**

  Change the plan status to `APPROVED`, set “Approved by” to `Martin`, preserve all open
  evidence dependencies, and change the architecture status from “Story Progression Plan
  pending” to “Story Progression Plan approved; narration pending.”

- [ ] **Step 2: Reconcile the definite WHP decision**

  Use `.agents/skills/reconcile-whp/SKILL.md` to record that this exact SP01–SP08
  progression is the approved story baseline for drafting `ep1_v2.md`, without promoting
  it over the canonical Episode 1.

- [ ] **Step 3: Verify and commit the approval checkpoint**

  Run:

  ```bash
  git diff --check
  python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
  git diff --name-status
  ```

  Expected: no whitespace errors, `88` scripting-skill tests pass, and only the four
  approval-record files above are changed. Inspect the complete staged diff, then commit
  those exact files with:

  ```bash
  git commit -m "docs(youtube): approve Episode 1 v2 progression"
  ```

### Task 2: Create the separate narration prototype

**Files:**

- Create: `whp-youtube/predrafts/ep1_v2.md`
- Read:
  `docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`
- Read:
  `docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`
- Preserve:
  `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`
- Preserve:
  `whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md`

- [ ] **Step 1: Load the narration method after progression approval**

  Read the complete
  `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md` and retain
  the approved architecture and this approved progression as the two drafting baselines.

- [ ] **Step 2: Draft one complete narration in SP01–SP08 order**

  Create `whp-youtube/predrafts/ep1_v2.md` with a short metadata header identifying it as
  a non-canonical Phase 1 narration prototype. Write continuous spoken narration that:

  - opens the E-01 preference paradox and promises both understanding and a practical
    check;
  - uses E-02 to overturn skepticism as a sufficient safeguard;
  - labels the house example hypothetical and returns to it only in SP03, SP05, and SP08;
  - turns every evidence boundary into the next natural proof handoff;
  - scopes the E-02/E-06 apparent contradiction by population and task;
  - names the borrowed-authority loop only in SP06;
  - treats same-model opposition as useful friction rather than independent evidence;
  - applies the complete Second-Opinion Test in SP08;
  - includes the high-stakes verification boundary;
  - varies transition language instead of mechanically repeating “but” and “therefore”;
  - avoids invented narrator experience, emotion, chronology, dialogue, or factual scene
    detail; and
  - closes with the approved independence rule.

- [ ] **Step 3: Map the narration back to the approved progression**

  Check every paragraph against SP01–SP08. Confirm that every beat preserves its proof
  job, evidence boundary, loop state, and required next step. If narration requires a
  load-bearing progression change, stop and reopen whole-plan approval instead of
  changing the story silently.

### Task 3: Verify and hand off the narration before audits

**Files:**

- Create: `whp-youtube/predrafts/ep1_v2.md`
- Preserve:
  `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`
- Preserve:
  `whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md`

- [ ] **Step 1: Run structural and repository checks**

  Run:

  ```bash
  git diff --check
  python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
  git status --short
  git diff -- whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md whp-youtube/predrafts/01-why-ai-makes-bad-advice-feel-right-throughline.md
  ```

  Expected: no whitespace errors, `88` scripting-skill tests pass,
  `whp-youtube/predrafts/ep1_v2.md` is the only narration artifact added, and the two
  preserved Episode 1 files have no diff.

- [ ] **Step 2: Perform the pre-audit narration check**

  Confirm that the complete narration contains all four approved mechanisms, the
  borrowed-authority synthesis, the full Second-Opinion Test, explicit evidence
  boundaries, and no unsupported factual detail. Do not run editorial, retention,
  timing, or production audits before Martin sees the complete narration.

- [ ] **Step 3: Present the complete narration for creative review**

  Show the full contents of `whp-youtube/predrafts/ep1_v2.md`, state clearly that the old
  episode remains untouched, and wait for creative approval or targeted revision.

- [ ] **Step 4: Commit the isolated prototype after verification**

  Inspect the complete staged diff, stage only
  `whp-youtube/predrafts/ep1_v2.md`, and commit with:

  ```bash
  git commit -m "docs(youtube): draft Episode 1 v2 narration"
  ```
