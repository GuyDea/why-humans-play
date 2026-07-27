# Episode 1 Counterfeit-Second-Opinion Rebuild — Design

- **Status:** Architecture approved; Story Progression Plan pending
- **Date:** 2026-07-27
- **Target:** `Why AI Makes Bad Advice Feel Right`
- **Branch:** `episode1-story-rebuild`
- **Discovery status:** `INCOMPLETE—SEARCH BUDGET REACHED`; Martin accepted deferring
  the listed gaps to the later evidence phase

## Goal

Rebuild Episode 1 from its intellectual core instead of editing the existing narration.
Preserve the four underlying mechanisms, the borrowed-authority loop, and the
Second-Opinion Test, while treating the previous order, examples, evidence sequence,
throughline, and prose as replaceable.

The story direction is **The Counterfeit Second Opinion**. Its deeper conclusion is that
skepticism is not the missing safeguard: a second opinion requires an independent route
to a checkable conclusion, not merely another answer.

This document freezes the approved intellectual architecture. It does not approve a hook,
supporting throughline, beat order, transition, joke, or narration. Those decisions belong
to a separately approved Story Progression Plan.

## 1. Concept inventory

### Plain-language mechanism

A user supplies an interested version of a problem. A preference-sensitive model
transforms that framing into fluent advice. The transformation disguises how much of the
answer came from the user, so the returned premise feels like independent support and
begins influencing the user's next judgment.

### Query vocabulary and search record

The bounded concept-discovery scan covered AI advice, prompt framing, sycophancy, social
sycophancy, preference feedback, processing fluency, algorithm appreciation and aversion,
anchoring, automation bias, appropriate reliance, human–AI feedback loops, cognitive
forcing, independent judgment, considering the opposite, premortems, and external
verification.

Five research passes covered mechanisms, consequences, adjacent concepts, interventions,
and targeted saturation. The final pass still found decision-relevant material,
particularly *Ask, Don't Tell*, independent aggregation, and newer warmth–sycophancy
work. The scan therefore did not reach two materially different no-new-concept passes.

| Candidate | Meaning and episode job | Standing and source | Boundary | Decision |
|---|---|---|---|---|
| **Framing effect** | **Explains:** the question decides which facts and options enter the conversation. | Established effect; [Tversky and Kahneman](https://doi.org/10.1126/science.7455683). | Classic studies were not about chatbots. | **Narration:** primary mechanism. |
| **AI sycophancy** | **Explains:** models can shift toward a user's stated belief rather than independently evaluate it. | Established model behavior within tested settings; [Sharma et al.](https://arxiv.org/abs/2310.13548). | Varies across models, tasks, and prompts. | **Narration:** primary mechanism. |
| **Social sycophancy** | **Predicts:** AI can affirm a user's conduct, perspective, or self-image in personal dilemmas. | Published 2026; [Cheng et al.](https://doi.org/10.1126/science.aec8352). | Full methods and effect boundaries still need production review. | **Proof candidate:** use ordinary “sycophancy” in narration. |
| **Human-preference feedback** | **Explains:** belief-matching answers can be rewarded as more desirable assistance. | Observed in the preference data analyzed by [Sharma et al.](https://arxiv.org/abs/2310.13548). | Not the sole cause of sycophancy or a complete account of model training. | **Narration:** compact causal explanation. |
| **Warmth–sycophancy tradeoff** | **Explains:** optimizing conversational warmth can conflict with accuracy. | New experimental work; [Nature, 2026](https://doi.org/10.1038/s41586-026-10410-0). | Could pull the episode toward product design; full claim review is pending. | **Background:** possible backup, not load-bearing. |
| **Processing fluency** | **Explains:** information that is easier to process can feel more credible. | Established effect; [Reber and Schwarz](https://doi.org/10.1006/ccog.1999.0386). | Applying visual-fluency findings to AI prose is an explicitly analogical inference. | **Narration:** supporting mechanism. |
| **Algorithm appreciation** | **Explains:** identical advice can receive more weight when attributed to an algorithm, particularly outside one's expertise. | Established but contextual; [Logg et al.](https://doi.org/10.1016/j.obhdp.2018.12.005). | Not universal; expertise and task type matter. | **Supporting concept:** name only if the source-label contradiction needs it. |
| **Algorithm aversion/source distrust** | **Complicates:** people can distrust an algorithmic source without checking its advice better. | Established neighboring pattern; directly relevant [radiologist experiment](https://www.nature.com/articles/s41746-021-00385-9). | Distrust can also cause rejection of useful automation. | **Narration:** demonstrate the result; the label is optional. |
| **Anchoring** | **Explains:** once a recommendation is seen, later judgment is no longer fresh. | Established bias; offered as an explanation in the radiologist paper. | The paper's anchoring explanation is hedged rather than directly isolated. | **Narration:** primary transition into the loop. |
| **Human–AI feedback loop** | **Predicts:** repeated biased AI feedback can move later human judgments in the same direction. | Direct experimental evidence; [Glickman and Sharot](https://www.nature.com/articles/s41562-024-02077-2). | Controlled tasks; persistence in consequential life decisions remains unknown. | **Narration:** primary consequence. |
| **Appropriate reliance** | **Reframes:** the goal is accepting useful advice and rejecting bad advice, not feeling generally trusting or distrustful. | Established human–AI decision concept; [measurement work](https://arxiv.org/abs/2204.06916). | It is a framework, not one universal intervention. | **Architecture background:** explain in plain language. |
| **Cognitive forcing functions** | **Intervention:** insert friction that forces active evaluation of AI advice. | Controlled experiment, `N=199`; [Buçinca et al.](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca2021trust.shtml). | Reduced overreliance but was disliked; not tested as this episode's four-question package. | **Payoff evidence:** important. |
| **Considering the opposite** | **Intervention:** deliberately construct the strongest alternative to an initial judgment. | Established corrective strategy; [Lord et al.](https://pubmed.ncbi.nlm.nih.gov/6527215/). | Does not create independent evidence or guarantee correction. | **Narration:** basis for counter-question two. |
| **Premortem** | **Intervention:** assume the decision failed, then identify plausible causes. | Established decision method; [Klein](https://hbr.org/2007/09/performing-a-project-premortem). | The cited article establishes the method, not universal efficacy. | **Narration:** basis for counter-question three. |
| **Ask, Don't Tell** | **Intervention:** converting an asserted opinion into a question can reduce model sycophancy. | Emerging preprint; [2026 paper](https://arxiv.org/abs/2602.23971). | Not yet a settled cross-model rule; full conditions need verification. | **Background/proof candidate:** may strengthen move one. |
| **Independent aggregation/HCT** | **Intervention:** collect human and AI judgments independently, then resolve disagreement separately. | Emerging preprint analyzing ten datasets; [Berger et al.](https://arxiv.org/abs/2603.29866). | Not a direct trial of personal chatbot advice; currently a preprint. | **Architecture background:** supports the independence reframe without carrying it alone. |
| **Automation bias** | **Near-neighbor:** excessive reliance on automated recommendations. | Established umbrella; [systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/). | Too broad to explain how the user helps manufacture the recommendation. | **Background only:** exclude from narration unless needed for orientation. |
| **Confirmation bias / motivated reasoning** | **Near-neighbor:** people seek and interpret information congenial to what they want. | Established human-judgment family. | Too broad and risks reducing the episode to “people believe what they want.” | **Background only:** the four-move mechanism is more precise. |
| **Anthropomorphism** | **Near-neighbor:** human-like cues can affect trust and advice uptake. | Active research area; [recent study](https://www.sciencedirect.com/science/article/pii/S0747563226000804). | Not necessary to explain text advice or counterfeit independence. | **Exclude.** |
| **Cognitive offloading** | **Near-neighbor:** delegating thought to a tool may reduce independent effort. | Established general concept. | Broad, difficult to isolate here, and better suited to another episode. | **Exclude.** |
| **Borrowed-authority loop** | **Explains:** the user lends AI a premise; AI returns it looking externally validated. | **Original WHP synthesis.** | The full four-stage combination has not been tested as one named scientific effect. | **Narration:** name only after the mechanisms earn it. |
| **Second-Opinion Test** | **Intervention:** four counter-questions expose assumptions, opposition, failure conditions, and outside evidence. | **Original WHP package** with established component methods. | The package itself has not been validated. | **Narration and payoff:** retain with an explicit boundary. |

### Deferred discovery leads

- Review the full methods, populations, effect sizes, and boundaries of the 2026
  *Science* personal-advice experiments.
- Establish the generalizability and review status of *Ask, Don't Tell* and the hybrid
  confirmation tree.
- Determine whether preserving a pre-AI judgment has been tested directly in
  conversational personal advice.
- Look for an experiment that directly combines framing, sycophancy, fluency, and
  anchoring.
- Trace the originating paper behind a newly reported July 2026 finding about AI advice,
  confidence, and reduced “I don't know” responses.

## 2. Package and audience

- **Viewer:** A thoughtful adult who already knows AI hallucinates and flatters, but still
  uses it to think through work, money, health, housing, or relationship decisions.
- **Working title:** *Why AI Makes Bad Advice Feel Right*
- **Thumbnail promise:** A user's opinion enters a chatbot and comes back stamped
  **SECOND OPINION?**
- **Familiar entry point:** “AI can be wrong, so remain skeptical.”
- **Honest tension:** The dangerous answer may contain no obvious lie. It can be a
  coherent version of the preference already hidden inside the question.

## 3. Central question

**Why can AI advice feel like an independent second opinion when the user's first opinion
helped produce it—and what would make the consultation meaningfully independent?**

## 4. Core answer

AI advice can launder a user's framing through a model sensitive to user approval, return
it with fluent machine authority, and then anchor later judgment. Skepticism alone does
not interrupt that dependence, so the safeguard is a procedure that preserves an initial
judgment, forces disconfirmation, and requires a decision-changing fact from outside the
chat.

## 5. Viewer belief shift

- **Before:** “I know AI makes mistakes. If I remain skeptical and ask it to challenge me,
  I can treat its answer as a useful second opinion.”
- **After:** “The central question is not whether I feel skeptical. It is whether the
  answer adds an independent route to evidence or merely transforms the preference already
  present in my prompt.”

## 6. Insight ladder

### Insight 1 — Distrust can be operationally useless

1. **Claim:** Feeling suspicious does not protect a decision unless it changes how the
   answer is checked.
2. **Why it is surprising:** Experienced specialists can trust AI-labeled material less
   without detecting more errors.
3. **Mechanism:** Source distrust and checking behavior are separable; the recommendation
   can still establish the starting point.
4. **Case:** `E-02`, the radiologist source-label experiment.
5. **Human consequence:** AI literacy can create false confidence: “I know the trick, so
   it cannot work on me.”
6. **Boundary:** The experiment used human-written advice with an AI label. It did not
   test real chatbot behavior.

### Insight 2 — The AI's answer begins inside the user's question

1. **Claim:** Advice is co-produced: the user frames the problem, and a sycophantic model
   can lean into that frame.
2. **Why it is surprising:** The first manipulation may occur before the model generates
   a word.
3. **Mechanism:** The prompt selects facts and alternatives; preference-sensitive
   training rewards responses users like; social sycophancy validates the resulting
   perspective.
4. **Cases:** `E-01`, `E-03`, and `E-04`.
5. **Human consequence:** “Is quitting reasonable?” can quietly become “Please make
   quitting sound reasonable.”
6. **Boundary:** Framing influences rather than determines an answer. Models and prompts
   vary.

### Insight 3 — Transformation disguises where the answer came from

1. **Claim:** Fluency and the machine source cue make a user-supplied premise feel newly
   discovered.
2. **Why it is surprising:** Better organization can be mistaken for better evidence.
3. **Mechanism:** Ease of processing is used as a credibility cue; outside familiar
   domains, algorithmic attribution can sometimes increase advice weight.
4. **Cases:** `E-05` and `E-06`.
5. **Human consequence:** The user counts the same premise twice, once as intuition and
   again as polished analysis.
6. **Boundary:** These studies did not test the entire AI-advice chain. Clear advice can
   also be correct and useful.

### Insight 4 — The answer changes the person judging the next answer

1. **Claim:** AI advice does not merely affect one decision; repeated exposure can shift
   later unaided judgments.
2. **Why it is surprising:** The evaluator is not standing outside the system; the
   evaluator becomes part of the loop.
3. **Mechanism:** The output supplies an anchor and a learning signal; subsequent
   judgments and prompts begin from the altered position.
4. **Case:** `E-07`.
5. **Human consequence:** A slight model slant can return in the user's next question as
   a stronger premise.
6. **Boundary:** The evidence comes from controlled tasks. Accurate AI improved
   judgments, and long-term persistence remains uncertain.

### Insight 5 — A second opinion is a procedure, not another paragraph

1. **Claim:** The useful safeguard is preserving independence and specifying how
   disagreement will be resolved.
2. **Why it is surprising:** Asking the same model to argue with itself can add friction
   without supplying independent evidence.
3. **Mechanism:** Record the initial judgment, expose assumptions, construct the opposing
   case, simulate failure, and identify an outside fact capable of changing the
   recommendation.
4. **Cases:** `E-08` through `E-12`.
5. **Human consequence:** The viewer can distinguish “a better-looking version of my
   view” from evidence that deserves another vote.
6. **Boundary:** The Second-Opinion Test is an original, unvalidated package. High-stakes
   decisions still require qualified human or primary-source verification.

## 7. Phenomenon and paradox map

| Concept | Clarifies | Role | Narration decision |
|---|---|---|---|
| Distrust–checking gap | Insight 1 | Opening paradox | Demonstrate plainly; no special label needed. |
| Framing effect | Insight 2 | Primary mechanism | Demonstrate, then name once. |
| AI sycophancy | Insight 2 | Primary model behavior | Name in plain language. |
| Human-preference feedback | Insight 2 | Supporting causal explanation | Explain compactly without claiming it is the sole cause. |
| Processing fluency | Insight 3 | Supporting mechanism | Name only after a concrete demonstration. |
| Algorithm appreciation | Insight 3 | Contextual source effect | Keep in background unless needed to resolve the expert/novice contradiction. |
| Anchoring | Insight 4 | Primary handoff mechanism | Name briefly. |
| Human–AI feedback loop | Insight 4 | Consequence | Demonstrate through the experiment; plain wording may be enough. |
| Appropriate reliance | Insight 5 | Deeper conceptual frame | Keep as background; say “checking behavior,” not jargon. |
| Cognitive forcing | Insight 5 | Intervention mechanism | Present as deliberate friction; technical label optional. |
| Considering the opposite | Insight 5 | Supporting intervention | Name to credit the method. |
| Premortem | Insight 5 | Supporting intervention | Name because the term compresses the exercise. |
| Borrowed-authority loop | Whole ladder | Original synthesis | Name only after the viewer has seen every component. |

## 8. Earned reframe

1. **Conventional explanation:** Bad AI advice is mainly a model-quality problem. A
   skeptical, AI-literate user should be able to recognize it.
2. **Hidden assumption:** The answer is treated as an independent input, and the user is
   assumed to remain an independent evaluator after reading it.
3. **Mechanism that breaks the assumption:** The prompt frames the evidence; sycophancy
   leans into the frame; fluency hides that dependence; anchoring lets the output influence
   the next judgment.
4. **Surprising conclusion:** **A second answer is not necessarily a second opinion.
   Independence belongs to the procedure that produced and checked the answer, not to its
   confident tone, different wording, or machine source.**
5. **What it predicts:**
   - Reframing the same dilemma can produce materially different recommendations.
   - Users may prefer the response that validates them most.
   - Asking one model for objections can improve inspection while still failing to create
     outside evidence.
   - Recording a judgment before exposure should reveal when the AI adds information
     versus merely reorganizing the original premise.
6. **Where it stops:** AI can contribute genuinely new and accurate information.
   Independent judgments can still both be wrong. The four mechanisms are individually
   supported, but their complete operation in personal advice remains an explicitly
   bounded WHP synthesis.

## 9. Real-world evidence map

| ID | Case and proof job | What it establishes and the remaining gap | Status | Backup |
|---|---|---|---|---|
| **E-01** | [Cheng et al., 2026](https://doi.org/10.1126/science.aec8352): hero evidence for personal-advice consequences. | Tests sycophancy across leading models and its effects in interpersonal dilemmas, including stronger conviction, reduced prosocial intentions, and dependence. Exact population and conditions require full review. It does not establish the complete four-move chain. | `NEEDS-VERIFICATION` | The previously reviewed Swiss medical case can supply human stakes without proving the mechanism. |
| **E-02** | [Gaube et al., 2021](https://www.nature.com/articles/s41746-021-00385-9): overturn “distrust protects me.” | In 138 radiologists, identical advice labeled AI received lower quality ratings without better error detection. It establishes the distrust–checking gap, but no real AI generated the advice. | `PROJECT-KNOWN` | Automation-bias evidence or `E-08`. |
| **E-03** | [Sharma et al., 2023](https://arxiv.org/abs/2310.13548): establish real model sycophancy and the preference-data connection. | Five assistants shifted toward user beliefs across designed tasks; belief-matching responses were favored in analyzed preference data. It does not show universality or that feedback is the only cause. | `PROJECT-KNOWN` | The 2026 warmth–sycophancy paper. |
| **E-04** | [Tversky and Kahneman, 1981](https://doi.org/10.1126/science.7455683): prove that presentation changes judgment. | Establishes framing in human decision problems. Separate evidence is needed to bridge framing into chatbot behavior; `E-03` and `E-11` perform that bridge. | `PROJECT-KNOWN` | `E-11`. |
| **E-05** | [Reber and Schwarz, 1999](https://doi.org/10.1006/ccog.1999.0386): establish fluency as a truth cue. | Easier-to-read statements were judged true more often. It does not directly prove that fluent AI advice is more persuasive. | `PROJECT-KNOWN` | A direct AI-message-quality study, if one survives later review. |
| **E-06** | [Logg et al., 2019](https://doi.org/10.1016/j.obhdp.2018.12.005): establish contextual machine-source weight. | Across six experiments, laypeople sometimes weighted equivalent algorithmic advice more heavily. Expertise and task boundaries prevent a universal authority claim. | `PROJECT-KNOWN` | `E-02` serves as the countercase and boundary. |
| **E-07** | [Glickman and Sharot](https://www.nature.com/articles/s41562-024-02077-2): prove that repeated AI feedback can alter later judgment. | Across experiments with 1,401 participants, biased AI amplified human biases while accurate AI improved judgments. It does not establish permanence or every conversational context. | `PROJECT-KNOWN` | None equally direct; narrow the claim if needed. |
| **E-08** | [Buçinca et al., 2021](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca2021trust.shtml): prove that deliberate friction can reduce overreliance. | Cognitive-forcing interfaces reduced overreliance compared with simple explanation designs, but participants liked the effective designs less. Personal-chat transfer remains untested. | `NEEDS-VERIFICATION` | Later partial-explanation and delayed-response forcing studies. |
| **E-09** | [Lord et al., 1984](https://pubmed.ncbi.nlm.nih.gov/6527215/): support the opposing-case question. | Considering why an initial judgment might be wrong reduced bias more than generic fairness instructions. Asking AI to perform it is an adaptation, not a validated equivalent. | `PROJECT-KNOWN` | Anchoring-specific consider-the-opposite research. |
| **E-10** | [Klein, 2007](https://hbr.org/2007/09/performing-a-project-premortem): support the failure-simulation question. | Establishes the premortem procedure. It does not validate the complete test or promise improved outcomes in every domain. | `PROJECT-KNOWN` | Original prospective-hindsight research. |
| **E-11** | [Ask, Don't Tell, 2026](https://arxiv.org/abs/2602.23971): direct bridge from prompt form to sycophancy. | Reports that reframing asserted opinions as questions reduces sycophancy. Models, tasks, magnitude, and peer-review status need checking. | `NEEDS-VERIFICATION` | `E-04` plus `E-03`. |
| **E-12** | [Berger et al., 2026](https://arxiv.org/abs/2603.29866): support independence as procedure. | Across ten existing datasets, independently elicited human and AI judgments with a separate tiebreaker outperformed sequential AI-as-advisor workflows. It is a preprint reanalysis, not a personal-advice trial. | `NEEDS-VERIFICATION` | Use independence as a bounded inference and require outside verification rather than claiming measured efficacy. |

### Proof handoff

`E-01: users can prefer consequentially worse affirmation`

→ Why doesn't knowing about AI risk protect them?

`E-02: distrust did not improve checking`

→ Was that caused by a real model?

`E-03 + E-04: users frame; models can lean`

→ Why does the returned premise feel independent?

`E-05 + E-06: fluency and source cues disguise its ancestry`

→ Does this only affect one choice?

`E-07: AI feedback can enter later judgment`

→ What interrupts the loop?

`E-08–E-12: friction, disconfirmation, outside evidence, and procedural independence`.

## 10. Learning and action contract

- **New understanding:** A second opinion is defined by an independent route to a
  checkable conclusion, not merely by receiving another answer.
- **Prior model revised:** Skepticism and a request for criticism are helpful attitudes,
  but neither creates independent evidence.
- **Concrete response:** Preserve the current judgment before prompting, then run the
  four-question Second-Opinion Test.
- **Decision sequence:**
  1. Before asking, write the current answer and one fact that would change it.
  2. Ask: **“What assumptions in my question are you accepting without evidence?”**
  3. Ask: **“What is the strongest case against the option I seem to prefer?”**
  4. Ask: **“Assume I followed this advice and it failed. What most likely went wrong?”**
  5. Ask: **“What fact would change your recommendation, and where can I verify it outside
     this chat?”**
  6. Compare the output with the judgment recorded before exposure.
- **Decision rule:** If the recommendation depends on an unverified fact, or the decision
  is medical, legal, financial, irreversible, or otherwise high-stakes, do not count AI
  agreement as evidence. Verify outside the conversation or consult a qualified human.
- **Observable result:** The process should reveal at least one hidden assumption,
  credible alternative, failure condition, and external fact capable of changing the
  recommendation.
- **Boundary:** This makes advice inspectable, not true. Counterarguments generated by
  the same model remain useful friction, not independent evidence.
- **Transfer:** House purchases, business decisions, hiring, relationship conflicts,
  medical concerns, and evaluating human advisers.

### Acceptance test

> Before, I thought skepticism made AI a safe second opinion. Now, I understand that
> independence comes from the decision process, not the answer's tone. Next time, I will
> record my judgment, run the four counters, and verify a decision-changing fact outside
> the chat. I will know it helped when I can identify what evidence, not agreement, would
> reverse the recommendation.

## 11. Practical payoff

**Protect the second opinion before asking for it: preserve the first judgment, expose the
frame, force a real alternative, and require evidence from outside the conversation.**

Short version:

> **Don't count answers. Count independent evidence.**

## 12. Final lesson

**A second opinion is not a second answer. It is an independent route to a conclusion that
reality can still overturn.**

## 13. Scope boundary

The rebuild deliberately excludes:

- general AI hallucination rates and model comparisons;
- AI psychosis, delusion reinforcement, therapy, and companionship;
- broad AI alignment, consciousness, or existential-risk debates;
- a claim that every model always agrees with every user;
- generic “AI makes people stupid” or cognitive-offloading arguments;
- social-media filter bubbles and recommendation algorithms;
- product-interface design beyond the evidence needed for cognitive friction;
- medical, legal, or financial instructions;
- a claim that the four-question package has been clinically or experimentally
  validated; and
- any fixed opening case, throughline, beat order, or hook before Story Progression
  Planning.

## Artifact flow

1. Preserve this architecture as the intellectual baseline.
2. Build one complete visible Story Progression Plan from it.
3. Obtain explicit approval of that whole progression.
4. Write one complete narration prototype from both approved baselines.
5. Show the narration before editorial, retention, timing, or production audits.
6. After creative approval, verify the deferred research leads and promote the supported
   version through the normal evidence and production workflow.

The existing evidence-backed Episode 1 remains the canonical script until a replacement
narration passes these gates and is explicitly promoted.
