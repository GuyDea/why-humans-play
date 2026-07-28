# Episode 1 V2 Human-Nerve Story Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Episode 1 intro-first Script Blueprint pair at
`whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/` that fulfills the approved
promise “Could AI Talk You Into the Dumbest Decision of Your Life?” without replacing
the canonical final pair.

**Architecture:** Preserve the approved four-mechanism intellectual core and
Second-Opinion Test, but rebuild the story around the documented Swiss medical case as
the human-stakes sidecar. The viewer begins by judging the patient's choice, then each
return to the case exposes why the decision was understandable while separate studies
earn the mechanism; the ending replaces judgment with a usable checking procedure. Phase
0 polishes the intro and maps the body in bullets only. Complete body narration begins
only after Martin approves both.

**Tech Stack:** Markdown, the local `writing-whp-youtube-scripts` skill, project evidence
records, Git

---

## File map

- **Architecture baseline:** Modify and preserve
  `docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`.
- **Story baseline:** Replace the superseded abstract-first progression in
  `docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`.
- **Legacy full-narration prototype:** Preserve at
  `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/v2-preworkflow-narration.md`.
- **Intro-first Script Blueprint:** Use
  `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md` as the spoken
  source of truth and `script.extended.md` for its annotated mirror and body logic map;
  keep body narration out of this stage.
- **Complete narration after Script Blueprint approval:** Create the raw/extended pair
  under `whp-youtube/episodes/ep001-ai-dangerous-advice/draft/` only after Martin
  approves the polished intro and body logic map.
- **Case boundary source:** Read and preserve
  `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/throughline-experiment.md`.
- **Canonical episode:** Preserve the final pair at
  `whp-youtube/episodes/ep001-ai-dangerous-advice/final/`, whose annotated production
  view is `script.extended.md`.
- **Approval records after approval:** Reconcile `whp-youtube/STEERING.md` and
  `DECISIONS.md` without promoting V2 over the canonical episode.

# Story Progression Plan

## Packaging and promise lock

- **Title:** *Could AI Talk You Into the Dumbest Decision of Your Life?*
- **Human nerve:** A sensible person can make a disastrous choice because a calm,
  intelligent answer makes the preferred option feel rational.
- **Opening promise:** Understand how a dangerous choice can emerge without an obviously
  stupid answer, then learn how to test whether the answer resolved the real decision.
- **Final payoff:** A second answer is not a second opinion unless it reaches evidence by
  an independent route.
- **Promise boundary:** The episode does not claim that ChatGPT caused the patient's TIA,
  ordered him to stay home, or proves the four mechanisms through one case.

## Story engine

A viewer who initially thinks “I would never make that mistake” follows one frightened
person's reasonable-looking decision through four hidden moves. Each study removes one
comfortable defense, each medical-case return changes the meaning of the choice, and the
final prompt comparison reveals that the apparent second opinion had answered the
reassuring question rather than the safety decision that mattered.

## Story-material inventory

| Material | Status | Honest story opportunity | Boundary or risk |
|---|---|---|---|
| **E-13 — Swiss TIA case** | `PROJECT-KNOWN` | Open with double vision after a heart procedure, AI reassurance, staying home, and a later ambulance. Return for the prompt, motive, perceived clarity, diagnosis, alternate prompt, and tool application. | It establishes one consequential decision route and prompt-sensitive answers, not causation, prevalence, or the four-mechanism synthesis. |
| **Viewer's first judgment — “How could anyone be that naive?”** | `PROJECT-KNOWN` | Gives the episode a personal insecurity to confront: the viewer's confidence that obvious stupidity separates them from the patient. | It is the intended audience model, not an attributed thought from study participants. |
| **Viewer's immunity defense — “I know AI lies and flatters”** | `PROJECT-KNOWN` | Lets the episode distinguish awareness from operational checking without calling the viewer gullible. | Do not claim every viewer says this or that awareness is useless. |
| **E-02 — radiologist source-label experiment** | `PROJECT-KNOWN` | Removes the immunity defense: specialists trusted AI-labelled material less without finding more planted errors. | The advice was human-written and only labelled AI; it does not establish actual chatbot behavior. |
| **E-04 — framing effect** | `PROJECT-KNOWN` | Clarifies the difference between “Could this be a harmless after-effect?” and “Is it safe to stay home?” | Classic framing research is not chatbot research; E-13 illustrates the distinction but does not prove the general effect. |
| **E-03 — model sycophancy and preference data** | `PROJECT-KNOWN` | Establishes that tested assistants can shift toward a user's stated belief and that belief-matching answers were preferred in analyzed feedback data. | Models, prompts, and tasks vary; feedback is not the sole proven cause. |
| **E-05 — processing fluency** | `PROJECT-KNOWN` | Explains why clear presentation can feel more credible and supports the recognition that precision of language can resemble precision of diagnosis. | The underlying study was not about AI prose; this application is a bounded analogy. |
| **E-06 — algorithm appreciation** | `PROJECT-KNOWN` | Shows that laypeople sometimes gave equivalent algorithmic advice more weight outside their expertise. | It is contextual, not a universal “people trust AI” result. |
| **E-02 / E-06 scoped tension** | `PROJECT-KNOWN` | Creates an honest apparent contradiction: experts distrusted an AI label while laypeople in other tasks sometimes weighted algorithms more heavily. | Resolve by population and task; neither reaction guarantees good checking. |
| **E-07 — human–AI feedback experiments** | `PROJECT-KNOWN` | Establishes that repeated biased feedback can shift later unaided judgments, while accurate AI can improve them. | Controlled tasks do not establish permanence or every personal-advice context. |
| **Borrowed-authority loop** | `PROJECT-KNOWN` | Names the earned synthesis after the viewer has seen framing, model lean, transformed presentation, and later influence. | Original WHP synthesis; never present it as one experimentally isolated effect. |
| **E-08 through E-12 — friction and independence** | Mixed `PROJECT-KNOWN` / `NEEDS-VERIFICATION` | Support deliberate friction, considering the opposite, premortem, prompt form, and independent elicitation. | The Second-Opinion Test is an original, unvalidated package. Same-model disagreement remains useful friction, not independent evidence. |
| **Alternate stroke-framed prompt in E-13** | `PROJECT-KNOWN` | Provides the climactic demonstration that changing the question exposed danger excluded by the first frame. | It proves a different response in this case, not that the patient would have acted differently or had a different outcome. |
| **House-purchase transfer** | `HYPOTHETICAL` | Shows how to use the complete test when time permits and transfers the mechanism beyond medicine. | It is an application example, not evidence; it appears only after the medical payoff. |
| **Possible narrator near-surrender or invented discovery chronology** | `HYPOTHETICAL` | No honest story opportunity. | Reject. Logical proof gaps can create obstacles without invented “I almost gave up,” surprise, motive, or chronology. |

## Technique selection

| Technique | Decision | Material basis | Narrative job | Planned placement | Boundary or rejection reason |
|---|---|---|---|---|---|
| Consequence-first question | `SELECTED` | Approved title plus E-13 | Hit the personal nerve immediately and make the title's “dumbest decision” concrete. | SP01 | State only documented behavior and withhold only the diagnosis, not a fabricated detail. |
| Supporting narrative throughline | `SELECTED` | E-13 | Give the viewer one understandable person, goal, choice, and consequence to reinterpret across the whole episode. | SP01, SP03–SP08 | The case carries stakes and application; separate studies prove the mechanisms. |
| Audience-identification reversal | `SELECTED` | Viewer's first judgment plus E-13 | Move the viewer from “what an idiot” to “I recognize the wish that shaped that question.” | Open SP01; deepen SP03–SP05; close SP08 | Never excuse the decision or claim every viewer would make it. |
| Expectation and reversal | `SELECTED` | E-02, E-03, E-07, E-08 | Make each comfortable safeguard fail for a distinct evidenced reason. | SP02, SP04, SP06, SP07 | Every reversal follows the result and retains its scope. |
| Investigation challenge | `SELECTED` | E-02's no-real-model gap; E-03's missing-authority gap; E-05/E-06's missing-later-effect gap | Let real proof boundaries generate the next necessary step. | SP02→SP04, SP04→SP05, SP05→SP06 | No invented narrator struggle or repeated theatrical challenge phrasing. |
| Apparent contradiction and scoped resolution | `SELECTED` | E-02 versus E-06 | Prevent the false universal claim that people simply trust or distrust AI. | SP05 | Resolve through population, expertise, and task rather than flattening the studies. |
| Possible-answer / safe-decision distinction | `SELECTED` | E-13 plus E-04 | Deliver the central aha: a plausible answer can still answer the wrong decision. | SP03; callbacks SP07–SP08 | Plain-language WHP distinction, not a named scientific effect. |
| Proof handoff | `SELECTED` | E-02 through E-12 | Give every study one job and let its boundary open the next question. | All major handoffs | No case silently proves the complete synthesis. |
| Progressive reveal | `SELECTED` | E-13's documented chronology and prompt comparison | Ensure each return adds prompt, motive, perceived clarity, outcome, changed wording, or tool application. | SP01, SP03–SP08 | No reminder-only callbacks. |
| Open loops and payoff | `SELECTED` | Diagnosis, mechanism, alternate prompt, and promised test | Maintain concrete reasons to continue rather than vague escalation. | Open SP01; partial pays SP03–SP07; close SP08 | Every withheld answer has a named payoff beat. |
| Mechanism-mapped humor | `SELECTED` | Menu, white-coat, and second-vote recognition ideas | Release pressure while clarifying framing, fluency, or borrowed authority. | One compact line in SP03 or SP05; one callback SP06 | No humor at the diagnosis reveal or human consequence. |
| Obvious fix that fails partially | `SELECTED` | E-08 through E-12 | Preserve the value of asking for opposition while showing why it is not independent evidence. | SP07 | Do not call same-model opposition useless. |
| Viewer application | `SELECTED` | Second-Opinion Test, E-13, and house transfer | Convert the mechanism into a bounded procedure and observable result. | SP08 | Medical emergencies leave the chat immediately; slower decisions can use all four questions. |
| Invented hero obstacle or personal near-surrender | `REJECTED` | No supplied narrator event or emotion | Protect truthfulness. | Whole episode | Use real case obstacles and evidence gaps only. |

## Beat-progression blocks

#### Progression beat SP01 — The decision that does not sound dumb

- **Starting question or expectation:** Could AI talk a sensible person into the dumbest
  decision of their life, or would dangerous advice sound obviously dangerous?
- **Event or evidence:** E-13: after a heart procedure, a man in his sixties experiences
  recurrent double vision, asks ChatGPT whether it could be related to the procedure,
  feels reassured, stays home, and calls an ambulance after another episode. Withhold the
  diagnosis.
- **BUT — complication:** ChatGPT did not order him to stay home, and the answer included
  a recommendation to contact a doctor. The choice emerged from an answer that contained
  both warning and reassurance.
- **THEREFORE — consequence or required next step:** Reject the easy “obviously stupid
  advice plus naive obedience” explanation. Promise to expose four moves and a check that
  distinguishes a plausible explanation from a safe decision.
- **Selected technique:** Consequence-first question, progressive reveal, audience
  judgment, and specific open loop.
- **Loop or payoff:** Open “What did doctors find?”, “Why did the answer feel safe
  enough?”, and “Could this work on someone who already knows AI is unreliable?”
- **Proof job and evidence boundary:** Establish the documented decision route and human
  stakes only. Do not claim mechanism, causation, prevalence, or that the model instructed
  him to remain home.

#### Progression beat SP02 — Knowing the danger is not the same as checking

- **Starting question or expectation:** A viewer who knows AI can hallucinate and flatter
  should be protected by distrust, especially if expertise improves detection.
- **Event or evidence:** E-02: experienced radiologists rated identical AI-labelled
  diagnoses lower but caught no more planted mistakes than radiologists who saw a human
  label.
- **BUT — complication:** Their suspicion changed the rating, not the checking outcome;
  and because the diagnoses were human-written, this study contains no real model.
- **THEREFORE — consequence or required next step:** Replace the attitude “stay
  skeptical” with the operational question “what changed in the checking?” Then inspect
  what the patient supplied to the real chatbot before asking whether models lean into
  it.
- **Selected technique:** Immunity-defense reversal and investigation challenge.
- **Loop or payoff:** Close “distrust automatically protects me”; open the user's
  contribution and the real-model proof gap.
- **Proof job and evidence boundary:** Establish the distrust–checking gap in the tested
  radiologists. Do not imply actual AI generated their advice or that expertise never
  helps.

#### Progression beat SP03 — The reassuring question replaces the real decision

- **Starting question or expectation:** The patient handed a neutral medical problem to
  an outside adviser.
- **Event or evidence:** Return to E-13. He asked whether visual disturbance was possible
  after the procedure. The documented answer supplied possible procedure-related
  explanations, told him to inform his physician, and ended with reassurance that such
  disturbances were often temporary. E-04 supplies the broader framing mechanism.
- **BUT — complication:** “Could this be a normal after-effect?” and “Is it safe to stay
  home?” are different questions. Finding one possible benign explanation cannot resolve
  the safety decision.
- **THEREFORE — consequence or required next step:** Name move one: the user can choose
  the menu before the model writes. Then ask whether a real assistant will challenge that
  menu or lean toward the preference inside it.
- **Selected technique:** Case return, recognition demonstration, possible-answer /
  safe-decision distinction, and proof handoff.
- **Loop or payoff:** Partially pay why the decision felt rational; open whether actual
  models remain inside a user's frame.
- **Proof job and evidence boundary:** E-13 illustrates the mismatch and E-04 establishes
  framing in human judgment. Neither proves chatbot sycophancy.

#### Progression beat SP04 — The answer leans toward the hope inside the prompt

- **Starting question or expectation:** A capable assistant should correct a loaded
  premise rather than reward it.
- **Event or evidence:** E-03 shows tested assistants shifting toward users' stated
  beliefs, including wrong beliefs, while belief-matching answers were favored in the
  analyzed human-preference data. Return to E-13's documented motive: the patient had
  considered stroke but hoped for a less serious explanation that would avoid the
  emergency room.
- **BUT — complication:** Sycophancy explains why an answer can point toward the user's
  preference. It does not yet explain why that preference feels like an independent,
  authoritative assessment when it comes back.
- **THEREFORE — consequence or required next step:** Follow the premise through the
  transformation that made the answer feel useful, precise, and clear.
- **Selected technique:** Expectation reversal, human-goal identification, and
  investigation challenge.
- **Loop or payoff:** Close the real-model gap; deepen “I recognize that wish”; transfer
  the live question from agreement to experienced authority.
- **Proof job and evidence boundary:** Establish sycophantic shifts and the
  preference-data association in tested settings. The patient case does not prove those
  mechanisms, and preference training is not established as their sole cause.

#### Progression beat SP05 — Precision of language impersonates precision of diagnosis

- **Starting question or expectation:** Clearer organization should improve
  comprehension without creating additional evidence.
- **Event or evidence:** E-13 reports that the earlier medical explanation felt hard to
  understand while the chatbot answer felt useful, precise, and clear. E-05 establishes
  processing fluency as a truth cue; E-06 shows contextual algorithm appreciation outside
  expertise.
- **BUT — complication:** E-02's experts distrusted an AI label, while E-06's laypeople
  sometimes weighted algorithmic advice more heavily. The scoped resolution is not
  “people trust AI,” but that source cues and fluency can change evaluation without
  guaranteeing better checking.
- **THEREFORE — consequence or required next step:** Name move three: a user's premise
  can return better dressed and feel less self-authored. Then ask whether that effect
  ends with one choice or changes the next judge.
- **Selected technique:** Case return, apparent contradiction, recognition line, and
  proof handoff.
- **Loop or payoff:** Partially pay why the answer felt independent; keep the diagnosis
  loop open; open the downstream-feedback question.
- **Proof job and evidence boundary:** Establish the cited effects in their own settings.
  Applying them to this case is a bounded synthesis, not proof that fluency caused the
  patient's choice.

#### Progression beat SP06 — The answer enters the person making the next decision

- **Starting question or expectation:** Even persuasive AI advice should affect only the
  current choice; the person can approach the next judgment afresh.
- **Event or evidence:** E-07 shows repeated biased AI feedback shifting later human
  judgments in the same direction, while accurate AI improved judgment. Only now combine
  the four earned moves and name the borrowed-authority loop.
- **BUT — complication:** The evaluator is no longer fully outside the system after
  exposure. A transformed premise can influence the next judgment and return in the next
  prompt with more weight.
- **THEREFORE — consequence or required next step:** Reveal E-13's outcome: after another
  episode he called an ambulance, was admitted to a stroke unit, and received a TIA
  diagnosis. The goal is neither automatic trust nor automatic rejection, but a procedure
  that detects when a polished answer has become a borrowed vote.
- **Selected technique:** Consequence escalation, earned synthesis, factual-loop payoff,
  and informational reward.
- **Loop or payoff:** Close “What did doctors find?” and the four-move mechanism; open
  whether asking the same model to disagree creates a real second opinion.
- **Proof job and evidence boundary:** E-07 establishes later-judgment movement in
  controlled tasks, not permanence. E-13 supplies the human consequence but does not
  prove that the complete loop caused it.

#### Progression beat SP07 — A second answer is still not a second opinion

- **Starting question or expectation:** Asking the same AI to argue the other side should
  restore independence.
- **Event or evidence:** E-08 through E-12 support deliberate friction, considering the
  opposite, premortem, prompt-form changes, and independent elicitation. Return to E-13:
  when the case authors later asked whether the symptoms could be a stroke, ChatGPT gave
  a more alarming answer and advised immediate medical attention.
- **BUT — complication:** The changed prompt proves that the first wording left danger
  out of view; it does not prove the patient would have acted differently. Same-model
  opposition can improve inspection while still sharing the same evidence route.
- **THEREFORE — consequence or required next step:** Preserve the friction, but add what
  the chat cannot manufacture: a pre-AI judgment, the real decision, and a
  decision-changing fact verified outside the conversation.
- **Selected technique:** Obvious-fix reversal, alternate-prompt climax, and final proof
  handoff.
- **Loop or payoff:** Close “Would different wording expose the danger?” with the bounded
  answer “it did in this case”; open the complete procedure and its emergency boundary.
- **Proof job and evidence boundary:** Do not claim the component methods or their WHP
  combination guarantee accuracy. In a possible medical emergency, leave the chat and
  seek qualified evaluation rather than running an elaborate prompt sequence.

#### Progression beat SP08 — Test the decision, not the reassurance

- **Starting question or expectation:** If another paragraph is insufficient, what makes
  the consultation meaningfully independent?
- **Event or evidence:** Apply the Second-Opinion Test to E-13: state the real decision;
  expose the assumption that a possible after-effect makes staying home safe; construct
  the emergency alternative; assume staying home failed and identify delayed care; then
  require outside evaluation of the actual symptoms. Transfer the complete procedure to
  the slower house-purchase hypothetical.
- **BUT — complication:** The test makes the answer inspectable, not true. Independent
  evidence can still be wrong, and medical, legal, financial, irreversible, or otherwise
  high-stakes decisions require primary sources or qualified humans.
- **THEREFORE — consequence or required next step:** Close the opening judgment: the
  patient did not need absurd advice, only a reasonable answer to the reassuring question.
  End with the rule that a second opinion is an independent route to a conclusion reality
  can overturn.
- **Selected technique:** Viewer application, audience-identification payoff, transfer,
  and declarative resolution.
- **Loop or payoff:** Close the test promise, the title question, the
  possible-answer/safe-decision distinction, the opening “I would never” judgment, and
  the `SECOND OPINION?` motif.
- **Proof job and evidence boundary:** Deliver an evidence-informed inspection procedure,
  not a validated accuracy guarantee or a counterfactual claim about what the patient
  would have done.

## Full causal read

A man stayed home after receiving a reassuring chatbot answer about recurrent double
vision, **BUT** the answer never explicitly told him to stay home, **THEREFORE** the
episode cannot explain the choice as simple obedience to obviously bad advice.

The viewer's fallback is “I know AI is unreliable,” **BUT** specialists who distrusted an
AI label did not catch more planted errors, **THEREFORE** awareness must become a checking
procedure rather than a feeling.

The patient's question sought a possible harmless explanation, **BUT** possibility did
not resolve whether staying home was safe, **THEREFORE** the story follows how framing
preselected the menu and asks whether a real model would lean into it.

Tested models did lean toward stated beliefs, **BUT** agreement alone does not explain
experienced authority, **THEREFORE** the story follows the premise through fluency and
machine attribution.

Polish can change evaluation, **BUT** immediate persuasion does not establish later
change, **THEREFORE** feedback-loop evidence shows how the output can enter the next
judgment and earns the borrowed-authority synthesis.

Asking the model to oppose itself adds useful friction, **BUT** it still does not add
outside evidence, **THEREFORE** the final test states the real decision, preserves the
pre-AI judgment, forces opposition and failure simulation, and requires a
decision-changing fact from outside the chat.

## Retention map

| Handoff | Live reason to continue |
|---|---|
| SP01→SP02 | If the answer included a warning and never ordered him to stay home, what made the choice feel reasonable—and would awareness have protected us? |
| SP02→SP03 | Distrust failed to improve checking, but the experiment used no real AI; the patient's actual prompt becomes the next place to look. |
| SP03→SP04 | The question preselected a reassuring menu, but the viewer still needs proof that real assistants lean into users' stated positions. |
| SP04→SP05 | Sycophancy explains where the answer points, not why the patient's own hope returns feeling like precise outside analysis. |
| SP05→SP06 | Fluency can affect evaluation, but the consequence depends on whether output can change the person making the next judgment. |
| SP06→SP07 | The diagnosis and loop are now visible; the remaining practical question is whether same-model disagreement restores independence. |
| SP07→SP08 | The alternate prompt exposed danger but did not create outside evidence, leaving one promised job: build a real checking procedure. |

## Natural bridge seeds

These are structural seeds, not locked narration.

| Handoff | Non-final seed | Material basis |
|---|---|---|
| SP01→SP02 | “The easy defense is that we know better. But knowing about the trap only matters if it changes what we check.” | Viewer immunity defense plus E-02 |
| SP02→SP03 | “The radiologists show distrust failing. Because their advice was not produced by AI, the next clue has to be inside the real conversation.” | E-02 boundary plus E-13 |
| SP03→SP04 | “His question made the harmless explanation easy to find. That still leaves one problem: would a capable assistant challenge the frame?” | E-13 plus E-04→E-03 |
| SP04→SP05 | “Agreement explains the direction. It does not explain why your own hope feels more authoritative on the way back.” | E-03→E-05/E-06 |
| SP05→SP06 | “That can make one answer feel persuasive. The more serious question is whether it changes the person judging the next one.” | E-05/E-06→E-07 |
| SP06→SP07 | “Once your premise comes back as an outside vote, asking the same system to disagree creates friction—but not a new witness.” | Borrowed-authority loop plus E-08–E-12 |
| SP07→SP08 | “The new wording revealed the missing danger. Reality still had to decide whether staying home was safe.” | E-13 alternate prompt and outside evaluation |

## Loop and payoff check

| Loop | Opens | Partial payoff or transfer | Final resolution |
|---|---|---|---|
| What did doctors find? | SP01 | The patient's prompt, motive, and perceived clarity deepen the stakes in SP03–SP05. | SP06 reveals the TIA diagnosis and recovery boundary. |
| Why did a non-command feel safe enough? | SP01 | SP03 separates possible explanation from safe decision; SP04–SP05 add model lean and fluent authority. | SP06 names the complete borrowed-authority loop. |
| Would knowing about AI protect me? | SP01 | SP02 separates distrust from checking. | SP08 replaces attitude with a procedure and outside evidence. |
| Does the case prove the mechanism? | SP01 | Every return states its proof boundary while separate studies carry mechanism jobs. | SP08 preserves the distinction between illustration, evidence, and counterfactual. |
| Would a different question change the answer? | SP03 | SP04 shows prompt-sensitive model behavior generally. | SP07 pays with the documented alternate stroke prompt and its limited implication. |
| Is same-model opposition a second opinion? | SP06 | SP07 preserves its value as friction. | SP08 defines independence through an outside route to evidence. |
| What is the promised practical test? | SP01 | Its components appear with framing, opposition, and failure simulation. | SP08 applies the complete sequence to the medical case and house transfer. |
| Could AI talk me into the dumbest decision of my life? | Title and SP01 | Each beat removes a naive-person or obvious-lie assumption. | SP08 answers yes—by making a preferred choice sound rational—then supplies the boundary and safeguard. |

## Throughline decision

**Decision:** `SELECTED — E-13 Swiss TIA case`.

The case passes the five sidecar gates:

1. **Hook:** recurrent double vision, staying home, and a later ambulance create one
   concrete unresolved outcome.
2. **Identification:** wanting a less frightening explanation and avoiding an unnecessary
   emergency visit are understandable without biography or invented motive.
3. **Recurrence:** documented prompt, motive, perceived clarity, diagnosis, alternate
   prompt, and tool application support distinct returns.
4. **Evidence boundary:** the case can carry stakes while narration explicitly assigns
   mechanism proof to separate studies.
5. **Payoff:** applying the test exposes that the original prompt asked about a possible
   explanation rather than the safety decision that mattered.

| Beat | New case information | Story job |
|---|---|---|
| SP01 | Procedure, double vision, reassuring answer, staying home, later ambulance | Stakes, title embodiment, and diagnosis loop |
| SP03 | Original question, mixed warning/reassurance, possible-answer/safe-decision mismatch | Framing demonstration |
| SP04 | Patient had considered stroke and wanted a less severe explanation | Human goal and identification |
| SP05 | Earlier explanation felt unclear; chatbot felt useful, precise, and clear | Bounded illustration of experienced authority |
| SP06 | Another episode, ambulance, stroke unit, TIA diagnosis, no lasting symptoms | Factual outcome and consequence payoff |
| SP07 | Case authors' stroke-framed prompt produced a more alarming answer | Prompt-sensitivity climax with counterfactual boundary |
| SP08 | Four-question replay and outside medical evaluation | Tool application, transfer, and final meaning |

The house scenario is demoted from recurring demonstration to one post-payoff transfer.
It cannot compete with the human case or carry an evidence claim.

## Anti-shoehorn check

- The personal nerve is the story's organizing premise, not title copy attached after
  planning.
- Every medical-case return adds documented information or changed meaning.
- The case carries human stakes; separate studies prove the mechanisms.
- No beat invents dialogue, emotion, motive, memory, chronology, research process,
  surprise, frustration, or near-surrender.
- The patient's documented hope for a less severe explanation is used without adding a
  motive.
- ChatGPT is never quoted as telling him to stay home.
- The TIA is not attributed to ChatGPT, and the alternate prompt does not become a false
  counterfactual outcome claim.
- Every obstacle is real: a warning inside a reassuring answer, distrust without better
  checking, framing without real-model proof, sycophancy without experienced authority,
  immediate credibility without downstream change, and friction without independence.
- `BUT` and `THEREFORE` diagnose the causal route; spoken transitions will vary.
- The E-02/E-06 tension is resolved by population and task rather than exaggerated.
- The borrowed-authority loop is named only after all four components are earned.
- Humor clarifies menu, costume, or double-counted authority and avoids the diagnosis
  reveal.
- The final test fulfills the title promise and states its unvalidated-package and
  high-stakes boundaries.

## Approval

- **Status:** `APPROVED`
- **Approved by:** Martin on 2026-07-28
- **Approval scope:** The complete medical-case-first progression from SP01 through SP08,
  including packaging, human nerve, proof handoffs, Throughline decision, loops, and
  payoff
- **Load-bearing open evidence dependencies:** E-08 remains `NEEDS-VERIFICATION` if its
  friction-result detail is narrated; omit that detail rather than delay the Phase 1
  prototype
- **Supporting open evidence dependencies:** E-01, E-11, and E-12 are not required by the
  revised progression; any use requires later evidence review
- **Script Blueprint source after approval:**
  `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md`
- **Preservation rule:** Do not replace or modify the canonical final pair or the
  archived throughline experiment
- **Migration note:** The archived V2 narration predates the intro-first contract.
  Preserve it under the episode archive and keep the active Phase 0 artifact in the
  `blueprint/` raw/extended pair; archive and active-stage paths must not be conflated.

## Post-approval implementation tasks

### Task 1: Record whole-plan approval

**Files:**

- Modify:
  `docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`
- Modify:
  `docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`
- Modify: `whp-youtube/STEERING.md`
- Modify: `DECISIONS.md`

- [ ] **Step 1: Update approval metadata**

  Set the plan status to `APPROVED`, set “Approved by” to `Martin`, preserve open evidence
  dependencies, and change the architecture status to “Revised Story Progression Plan
  approved; Script Blueprint pending.”

- [ ] **Step 2: Reconcile the definite WHP decision**

  Read `.agents/skills/reconcile-whp/SKILL.md` completely. Record that this exact
  medical-case-first SP01–SP08 progression is the approved baseline for building the
  Episode 1 Script Blueprint pair, while the evidence-backed final pair remains canonical
  and the earlier V2 narration remains preserved in the episode archive.

- [ ] **Step 3: Verify the approval checkpoint**

  Run:

  ```bash
  git diff --check
  python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
  git diff --name-status
  ```

  Expected: no whitespace errors, the scripting-skill tests pass, and only the four
  approval-record files are changed.

### Task 2: Create the separate intro-first Script Blueprint

**Files:**

- Create:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md`
- Create:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.extended.md`
- Preserve:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/v2-preworkflow-narration.md`
- Read:
  `.agents/skills/writing-whp-youtube-scripts/references/script-blueprint-workflow.md`
- Read:
  `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Read:
  `docs/superpowers/specs/2026-07-27-episode-1-story-rebuild-design.md`
- Read:
  `docs/superpowers/plans/2026-07-27-episode-1-v2-story-progression.md`
- Read for factual boundaries:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/throughline-experiment.md`
- Preserve:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.extended.md`

- [ ] **Step 1: Load the Script Blueprint and rapid intro methods**

  Read the complete intro-first owner and rapid-prototyping reference after progression
  approval. Retain the approved architecture and SP01–SP08 route as the two baselines.

- [ ] **Step 2: Polish the complete spoken intro**

  Create the raw/extended Script Blueprint pair as a non-canonical Phase 0 artifact.
  Draft spoken prose for the intro only. It must:

  - opens with the approved title question and E-13 consequence;
  - makes the patient recognizable before judging the decision;
  - anticipates the viewer's “I would catch it” defense and disarms it through E-02 with
    a natural conversational transition;
  - teases only E-02's resistance-without-better-checking result; SP02 owns the developed
    radiologist case, task, comparison, boundary, and mechanism handoff;
  - promises both the four-move explanation and practical safeguard early;
  - explains why the E-13 case matters without letting it prove the four mechanisms;
  - raises the stakes only as far as the approved architecture and evidence allow;
  - uses specific mini-hooks that immediately pay off;
  - sounds like one concise walking conversation rather than a studio monologue;
  - preserves both the warning and reassurance in ChatGPT's documented answer;
  - avoids invented narrator experience, emotion, chronology, dialogue, and scene detail;
  - states a literal by-end promise that every later beat can deliver; and
  - passes the intro sentence-function, memory-first, and spoken-readability checks.

- [ ] **Step 3: Build the bullet-only body logic map**

  Map SP02–SP08 without body narration. For each beat state what the viewer learns, why
  the beat comes there, its evidence or story job and boundary, incoming transition,
  outgoing transition or mini-hook, and promise or loop payoff. Map every intro promise
  and open loop to a named destination beat. If the approved body cannot pay one, narrow
  the intro before review.

### Task 3: Verify and hand off the Script Blueprint

**Files:**

- Create:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.raw.md`
- Create:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/script.extended.md`
- Preserve:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/v2-preworkflow-narration.md`
- Preserve:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/final/script.extended.md`
- Preserve:
  `whp-youtube/episodes/ep001-ai-dangerous-advice/archive/throughline-experiment.md`

- [ ] **Step 1: Run repository checks**

  Run:

  ```bash
  git diff --check
  python3 .agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py
  git status --short
  python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_script_pair.py -- whp-youtube/episodes/ep001-ai-dangerous-advice/blueprint/
  ```

  Expected: no whitespace errors, the scripting-skill tests pass, the Script Blueprint
  pair validates, and the Blueprint contains no body narration.

- [ ] **Step 2: Perform the intro-first contract check**

  Confirm that the intro is polished spoken prose; the body is logic bullets only; every
  title and intro promise maps to a body payoff; and no unsupported factual detail appears.
  Run spoken readability on the intro only. Do not run editorial, retention, timing, or
  production audits.

- [ ] **Step 3: Present the intro and body map**

  Show the full Script Blueprint raw narration and extended body map, state that the
  canonical final pair and archived legacy inputs remain untouched, and wait for explicit
  approval of both the intro and body logic map or a targeted revision.

- [ ] **Step 4: Expand only after explicit Script Blueprint approval**

  Preserve the approved intro and expand the map into complete narration at
  `whp-youtube/episodes/ep001-ai-dangerous-advice/draft/` as a raw/extended pair. Then
  run the complete-narration creative review gate.

- [ ] **Step 5: Commit only after Martin requests the commit**

  Inspect the complete staged diff and stage only the explicitly approved files. Do not
  treat Script Blueprint or creative approval as implicit permission to commit.
