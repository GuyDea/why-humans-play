# WHP Script Architecture Forward Evaluation

**Date:** 2026-07-23
**Skill state:** After the architecture-first revision
**Invocation:** Two newly spawned child-agent threads, each run once against the revised
local skill with the complete evaluation stimulus repeated in its task prompt. Both were
prohibited from browsing and modifying files. The first was instructed to load and obey the
revised script skill; the second was given the same skill plus a scoped
existing-narration operation.

## Case 1 — New episode generation

### Reproduction prompt

> Use the revised local `writing-whp-youtube-scripts` skill. You are assisting with a
> YouTube episode. The topic has already been selected: job interviews as a signaling game
> that can reward interview performance rather than job performance. The user says:
> “Okay, job interviews it is. Let’s start prototyping. Make the episode insightful,
> humorous, and grounded in real-world happenings.” Produce the first artifact you would
> return to the user. Do not browse the web and do not modify any files.

### Output — complete

~~~markdown
## Episode architecture — *What Job Interviews Actually Test*

This is the intellectual architecture only. Actual hooks, jokes, beats, and narration wait until the architecture is approved. Real-world cases are marked for later verification because this is a no-research prototype.

### Package and audience

- **Intended viewer:** Anyone who has wondered why someone brilliant at a job can be terrible at getting one—plus hiring managers who suspect their process rewards polish over performance.
- **Working title:** *What Job Interviews Actually Test*
- **Provisional thumbnail promise:** One candidate, two scoreboards: **INTERVIEW: A+ / JOB: ?** Overlay: **WRONG TEST?**
- **Familiar entry point:** Rehearsed “authentic” answers, whiteboard puzzles, confidence rituals, and questions everyone pretends they have never heard before.
- **Honest tension:** Employers genuinely need a fast way to predict future performance. Candidates genuinely need to prepare. The problem is not that either side is dishonest; it is that both adapt to a compressed, imperfect test.
- **Comic engine:** The ritualized mismatch between interview behavior and ordinary work, plus the escalating arms race between predictable questions and increasingly polished answers. Humor targets the mechanism and institution, never nervous applicants.

### Central question

Why can the person most likely to win a job interview be different from the person most likely to succeed in the job—and what determines how large that gap becomes?

### Core answer

An interview turns hidden future performance into a short, visible score, so candidates rationally optimize whatever raises that score; when those rewarded signals resemble the work, preparation reveals useful ability, but when they do not, the process selects for interview skill, coaching access, and interviewer preference.

### Viewer belief shift

- **Before:** Interviews are imperfect but basically direct samples of candidate quality; stronger candidates should usually interview better.
- **After:** An interview is a designed signaling game. Its result reflects ability, interview-specific preparation, the evaluator, and the rules—and changing those rules changes who appears to be “the best candidate.”

### Insight ladder

#### 1. An interview observes a proxy, not the future employee

- **Claim:** Employers cannot observe future job performance directly, so they substitute a short staged interaction.
- **Why it is surprising:** Face-to-face conversation feels richer and more truthful than a résumé score, but vivid information is not necessarily predictive information.
- **Mechanism:** The candidate knows more about their ability than the employer. The employer interprets speech, confidence, stories, puzzles, and credentials as signals. Every result therefore mixes job ability with interview skill, context, and noise.
- **Real-world case:** Google’s reported move away from celebrated brainteaser questions after internal analysis questioned their predictive value.
- **Human consequence:** Strong workers can be rejected for failing an unrelated proxy; engaging interview performers can advance without equivalent evidence of job performance.
- **Boundary:** Communication, composure, and reasoning aloud are genuinely job-relevant in some roles. The issue is alignment, not the mere existence of an interview.

#### 2. A visible selection rule creates a preparation game

- **Claim:** Once candidates understand what scores well, interview performance becomes trainable independently of job performance.
- **Why it is surprising:** A polished answer may demonstrate conscientious preparation—or merely familiarity with the test’s script.
- **Mechanism:** Repeated formats create coaching markets, answer templates, question banks, and specialized practice. A supposedly costly signal may separate candidates by free time, money, insider knowledge, or prior interview volume rather than productive ability.
- **Real-world case:** The coding-interview preparation economy built around recurring algorithm problems and platforms such as LeetCode; a broader echo is STAR-answer coaching for behavioral interviews.
- **Human consequence:** Candidates spend substantial time training for a temporary gate, while people with less access to coaching can look weaker despite comparable job ability. Employers respond by making the gate stranger or harder, creating an arms race.
- **Boundary:** Preparation is not cheating. It can reveal effort and sometimes improve relevant skills. The key question is whether getting better at the test also makes someone better at the work.

#### 3. In an ambiguous interview, the interviewer becomes part of the test

- **Claim:** When questions and scoring criteria are loose, the outcome increasingly reflects the evaluator’s impressions rather than a shared standard.
- **Why it is surprising:** An informal conversation can feel more humane and individualized while producing more room for confidence, familiarity, and narrative fluency to masquerade as evidence.
- **Mechanism:** Without common prompts and anchored scoring, interviewers fill uncertainty with coherent stories: “leadership presence,” “culture fit,” or chemistry. Early positive impressions can color later answers, and different interviewers can interpret the same behavior differently.
- **Real-world case:** A published experiment reportedly found that unstructured interviewers asking randomly generated questions became more confident while making worse predictions than a no-interview baseline.
- **Human consequence:** Candidates are rewarded for resembling an interviewer’s intuitive picture of competence. Employers can become more certain while learning less.
- **Boundary:** Structure cannot remove judgment, and “fit” sometimes contains real role requirements. The problem is using an undefined feeling as if it were a stable measurement.

#### 4. Gameability is not the flaw; misaligned gameability is

- **Claim:** The goal is not to create an interview nobody can prepare for. It is to make the winning preparation resemble useful work.
- **Why it is surprising:** A transparent, gameable process can be fairer and more informative than a supposedly spontaneous one.
- **Mechanism:** Common questions, job-linked criteria, anchored ratings, independent scoring, and work samples reduce irrelevant routes to a high score. Candidates still optimize—but the rules steer that effort toward evidence closer to the job.
- **Real-world case:** Structured public-sector interview systems using common prompts and rating anchors; blind orchestral auditions offer a useful contrast because they make the work product visible while suppressing unrelated identity cues.
- **Human consequence:** Candidates know what evidence matters, evaluators have fewer opportunities to invent criteria after meeting someone, and preparation can become productive rather than ceremonial.
- **Boundary:** Work samples can be burdensome, inaccessible, or exploitative; structured interviews can become rigid; no short assessment captures an entire job.

### Phenomenon and paradox map

| Concept | Plain-language meaning | Clarifies | Role | Narration use |
|---|---|---|---|---|
| **Signaling under asymmetric information** | One side has hidden qualities, so the other judges visible clues | Insights 1–2 | Primary mechanism | Name after demonstrating the hiring problem |
| **Costly signaling** | A signal may be credible when it is difficult to produce, but its cost may reflect resources rather than ability | Insight 2 | Supporting concept | Name only if the preparation example earns it |
| **Impression management** | Candidates strategically shape how evaluators perceive them | Insights 2–3 | Supporting mechanism | Likely useful in narration |
| **Goodhart’s law** | Once a proxy becomes a target, behavior shifts toward the proxy | Insight 2 and the reframe | Supporting concept; bridge from Episode 1 | Demonstrate first; name briefly at most |
| **Halo effect** | One positive cue colors unrelated judgments | Insight 3 | Supporting bias | Background unless a case makes it essential |
| **Similarity attraction** | Familiarity or resemblance can feel like merit or “fit” | Insight 3 | Supporting bias | Prefer plain language over terminology |
| **Construct-irrelevant variance** | A score changes because of traits the test was not meant to measure | Insights 1–3 | Technical background | Keep out of narration |
| **Mechanism design** | The rule-maker shapes which strategies become rewarding | Insight 4 and earned reframe | Primary mechanism for the conclusion | Name if it sharpens the game lens |
| **Adverse selection / principal–agent framing** | Nearby models of hidden information and conflicting incentives | Whole episode | Near-neighbors, less precise here | Keep out |

### Earned reframe

1. **Conventional explanation:** Interviews are imperfect measurement tools; better questions and better-prepared candidates should improve them.
2. **Hidden assumption:** Candidate merit exists independently, and the interview merely reveals more or less of it.
3. **Mechanism that breaks it:** Candidates adapt to the scoring rule, while interviewer discretion determines which signals count. The process changes the behavior it observes.
4. **Surprising conclusion:** **Inference:** An interview does not merely detect merit; it partly manufactures the version of merit it can see. Hiring is therefore a form of mechanism design: the employer chooses the game, and the game helps choose the winner.
5. **What it predicts:** Any gatekeeping system with recognizable scripts—promotions, admissions interviews, funding pitches—will develop specialized performers. Organizations will then either escalate novelty or move the test closer to the underlying work.
6. **Where it stops:** This does not make outcomes arbitrary or imply that interview skill never matters. For sales, leadership, negotiation, and client-facing roles, parts of the interview performance may closely resemble the job. The strength of the reframe depends on evidence that the chosen score diverges from later performance.

### Real-world evidence map

| Argument job | Primary case | Affected people and consequence | Status | Backup |
|---|---|---|---|---|
| Show a prestigious proxy being abandoned | Google’s use and later rejection of brainteasers | Applicants trained for puzzles; the employer risked selecting on an unhelpful signal | `NEEDS-VERIFICATION` | Research comparing structured and unstructured interview validity |
| Show the score creating a prep economy | Coding-interview preparation around recurring algorithm problems | Candidates with time, coaching, or insider familiarity gain an advantage; firms receive increasingly optimized performances | `NEEDS-VERIFICATION` | Behavioral-interview and STAR-response coaching |
| Show that conversation can increase confidence without accuracy | The random-question unstructured-interview experiment | Evaluators become more certain; applicants are judged through coherent but potentially uninformative stories | `NEEDS-VERIFICATION` | Research on interviewer effects and rating reliability |
| Show rules improving signal alignment | A documented public-sector structured-interview implementation | Applicants receive a common test; agencies reduce discretionary scoring | `NEEDS-VERIFICATION` | A documented employer using scored work samples |
| Demonstrate the reframe through a changed rule | Blind orchestral auditions as a job-sample contrast | Changing what evaluators can observe changes the competition and potentially who advances | `NEEDS-VERIFICATION` | Employer outcome data comparing interview scores with later performance |

The evidence pass should treat claims about predictive validity and demographic effects separately; neither should be inferred merely because a practice sounds fairer.

### Practical payoff

The viewer gets an **interview-alignment test** for either side of the table:

1. What real on-the-job outcome is this question or task meant to predict?
2. What visible behavior raises the interview score?
3. Could someone improve that score without improving the real outcome?
4. If candidates prepare successfully, will that practice make them better at the job—or only better at passing the gate?

A candidate can use this to separate necessary gate fluency from meaningful evidence of ability, and avoid treating one rejection as a complete verdict on competence. A hiring manager can use it to identify one interview step whose easiest winning strategy is unrelated to the work.

**Boundary:** One awkward question does not prove an entire hiring process is invalid. Proper validation requires comparing selection evidence with later outcomes, while accounting for role differences and fairness.

### Final lesson

**Job interviews test whatever winning strategy their rules reward; a good interview is one where getting better at winning also means getting better at the job.**

### Scope boundary

This episode will deliberately exclude:

- A comprehensive history of hiring or psychometrics.
- A claim that every interview is useless or biased.
- A list of manipulation tactics for candidates.
- Detailed legal guidance about hiring discrimination.
- A full comparison of résumés, referrals, credentials, personality tests, and automated screening.
- Exact predictive-validity rankings before the evidence phase.
- A broad AI-interviewing detour, except perhaps as a compact current echo after verification.

Please explicitly approve the complete architecture—or identify the field to refine—before we move to the hook, beat order, or narration.
~~~

### Result

Pass. The agent returned the complete architecture, did not write episode prose, marked
unverified cases, and stopped at the explicit architecture gate.

## Case 2 — Scoped existing-narration rewrite

### Reproduction prompt

> Use the revised local `writing-whp-youtube-scripts` skill. This is existing Phase 1
> narration and the requested operation is `Rewrite selection`. Replace only this
> selection: “Calls closed: beautiful. The dashboard gets a promotion. The customer gets
> transferred until their problem qualifies for a pension.” Surrounding context: a company
> says “Help customers,” then rewards short calls. Narrative job: make the
> metric-versus-goal consequence clear and funny. Return one replacement only. Do not
> browse the web and do not modify files.

### Output — complete

> So the calls get shorter. The problems don’t. The dashboard gets a standing ovation while
> customers get passed around until their issue is old enough to retire.

### Result

Pass. The agent returned one replacement and did not request an architecture rebuild.
