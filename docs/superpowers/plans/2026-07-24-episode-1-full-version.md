# Episode 1 Eight-Minute Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce, review, and then promote an approximately 1,350-word narration for
`Why AI Makes Bad Advice Feel Right`, using one recurring hypothetical quitting decision
to demonstrate the episode's mechanism and four-question payoff.

**Architecture:** Keep the existing evidence-backed production document stable while
creative work happens in a narration-only prototype. Build that prototype in three
cohesive narrative checkpoints, show the complete narration to Martin before any audit,
and promote it into the annotated episode only after explicit creative approval.

**Tech Stack:** Markdown, the repository's `writing-whp-youtube-scripts` workflow, existing
`F-001`–`F-008` evidence records, Python 3 for the existing structural validator and skill
tests, and Git for isolated reviewable checkpoints.

---

## File map

- Create
  `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`:
  narration-only creative artifact with eight numbered beats.
- Modify
  `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md` only after Martin
  approves the complete prototype: replace narration and update its production appendix.
- Modify
  `docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md` only if execution
  reveals a material departure from the accepted design.
- Keep `BRAND.md` and `whp-youtube/STEERING.md` unchanged: neither the accepted runtime nor
  this prototype settles the separate canonical-pilot conflict.

### Task 1: Build the hook and recurring-decision setup

**Files:**

- Create:
  `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`
- Reference:
  `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`
- Reference:
  `docs/superpowers/specs/2026-07-24-episode-1-full-version-design.md`

- [ ] **Step 1: Create the narration-only artifact with its fixed shape**

Create one H1 followed by these exact eight H2 headings:

```markdown
# Why AI Makes Bad Advice Feel Right

## 1. The answer you wanted
## 2. Your question has a cast
## 3. Trained to agree
## 4. Confidence gets a costume
## 5. The borrowed-authority loop
## 6. The Second-Opinion Test
## 7. Where the method stops
## 8. Do not count your vote twice
```

Place spoken copy only in blockquotes below each heading. Do not add metadata, production
notes, an appendix, or an audit.

- [ ] **Step 2: Draft Beat 1 at 110–130 spoken words**

Preserve the opening question, the 2023 Anthropic five-assistant anchor, the software-update
joke, the term sycophancy, ordinary decision stakes, and the literal four-question promise.
Keep each of the first two sentences to one plain-language idea. Keep all humor outside the
promise sentence.

- [ ] **Step 3: Draft Beat 2 at 160–200 spoken words**

Label the quitting decision hypothetical before presenting it. Give the sample AI answer
enough reasonable content to sound useful while visibly accepting three unsupported
premises:

1. the ideas are brilliant;
2. the boss is ignoring them rather than disagreeing, delaying, or lacking context;
3. quitting is the decision rather than one option among several.

Demonstrate the frame before naming the framing effect. Preserve:

> AI receives one side's court filing—and produces a verdict in bullet points.

End by opening the next question: why would a system trained to help inherit that framing?

- [ ] **Step 4: Check the opening checkpoint**

Run:

```bash
rg -n "^## [12]\\.|software update|court filing|By the end" \
  whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md
```

Expected: both numbered headings and all three approved anchors appear once.

- [ ] **Step 5: Review and commit the opening checkpoint**

Run:

```bash
git diff --check
git status --short
```

Stage only the prototype, review the complete staged diff, and commit:

```bash
git add whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md
git diff --cached --check
git diff --cached
git commit -m "content(youtube): expand episode one opening and framing"
```

### Task 2: Deepen the mechanism and earn the reframe

**Files:**

- Modify:
  `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`
- Reference:
  `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`

- [ ] **Step 1: Draft Beat 3 at 175–205 spoken words**

Explain the human-preference mechanism without claiming that the model wants approval.
Preserve the Anthropic preference finding, the crooked-helpfulness signal, the
“Absolutely” joke, OpenAI's 2025 rollback, and “professional accomplice.”

Return briefly to the hypothetical: an agreeable answer can receive the social signal of
helpfulness even when it has not tested the user's premise. Do not present a fictional
model response as a measured result.

- [ ] **Step 2: Draft Beat 4 at 165–195 spoken words**

Explain the 1999 processing-fluency result and the six-experiment algorithm-appreciation
result. Then transform the same quitting hunch from an anxious sentence into a polished
three-part framework without adding a new fact.

Preserve:

> Your hunch enters the chat wearing sweatpants.

and:

> Nothing necessarily became more correct. It just received headings and institutional
> lighting.

End by asking what happens when that polished answer influences the user's next judgment.

- [ ] **Step 3: Draft Beat 5 at 205–235 spoken words**

Define the borrowed-authority loop exactly as approved. Explain the
`Nature Human Behaviour` face-judgment task concretely: participants judged sets of faces,
saw AI feedback, could revise, became more biased with systematically biased AI over
repeated interactions, and improved with accurate AI.

State the boundary immediately: the lesson is not that AI always makes people worse. The
lesson is that model error can enter the human's next judgment.

Return to the quitting scenario. Show the user treating the polished recommendation as a
second vote even though the user supplied its central premise. Preserve the photocopied
ballot joke and end on the danger of a perfectly answered, carefully edited problem.

- [ ] **Step 4: Check the mechanism checkpoint**

Run:

```bash
rg -n "^## [345]\\.|professional accomplice|wearing sweatpants|institutional lighting|borrowed-authority loop|photocopied the first ballot" \
  whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md
```

Expected: Beats 3–5 and every approved mechanism anchor appear.

- [ ] **Step 5: Review and commit the mechanism checkpoint**

Run:

```bash
git diff --check
git diff
```

Stage only the prototype and commit:

```bash
git add whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md
git diff --cached --check
git diff --cached
git commit -m "content(youtube): deepen the AI advice feedback loop"
```

### Task 3: Demonstrate the Second-Opinion Test and close the episode

**Files:**

- Modify:
  `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`

- [ ] **Step 1: Draft Beat 6 at 310–350 spoken words**

Preserve all four approved questions verbatim and apply each to the same quitting decision:

1. The assumptions question must reveal that “brilliant,” “ignoring,” and the forced
   quit/stay choice lack evidence.
2. The strongest-opposition question must produce a credible case that the boss lacks
   context, the proposal needs revision, or another internal move exists; it must not force
   the user to stay.
3. The premortem question must expose a plausible failure path such as quitting without
   savings, misreading the labor market, or carrying the same communication problem into
   the next job.
4. The deciding-fact question must identify facts to verify outside the chat: documented
   feedback, financial runway, available roles, and evidence about how the ideas were
   received.

Explain considering the opposite and the premortem at their current evidence-bounded
strength. Show the observable improvement: the recommendation becomes conditional and
would change if a deciding fact changes. State that the questions are not a truth machine.

- [ ] **Step 2: Draft Beat 7 at 80–110 spoken words**

Transfer the method briefly to two contexts:

- a relationship question that casts one person as obviously unreasonable;
- a business decision that assumes customers want a proposed feature.

Do not open new stories or add factual claims. Preserve the boundary that an AI-generated
objection is useful friction but still one system changing chairs. Keep primary-source or
qualified-human verification for medical, legal, financial, or irreversible decisions.

- [ ] **Step 3: Draft Beat 8 at 30–50 spoken words**

Resolve the opening question without adding a forward tease. Preserve both closing moves:

> The goal isn't to make AI disagree with you. The goal is to expose what your first
> question made invisible.

> Fluent agreement is not a second opinion—especially when your first opinion wrote the
> prompt.

- [ ] **Step 4: Check structure, anchors, and spoken length**

Run:

```bash
rg -n "^## [1-8]\\." \
  whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md
```

Expected: exactly eight numbered headings in ascending order.

Run:

```bash
perl -pe 's/\\[F-\\d{3}\\]\\(https?:\\/\\/[^)]+\\)//g; s/^>\\s?//' \
  whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md \
  | sed '/^#/d; /^$/d' | wc -w
```

Expected: approximately 1,250–1,450 spoken words, with a working target near 1,350. This is
a density check, not a runtime audit.

- [ ] **Step 5: Run the pre-handoff content checks**

Confirm from the full narration:

- the recurring scenario is explicitly hypothetical;
- every return to it advances the causal chain;
- the first answer is plausible rather than cartoonishly wrong;
- the four questions reveal four distinct omissions;
- the resulting recommendation is conditional rather than reversed by authorial force;
- the boundary and two transfer contexts are voiced;
- no new named fact, date, institution, quotation, or study appears;
- the final line remains the approved declarative close.

Do not run timing, retention, visual, rights, or production audits yet.

- [ ] **Step 6: Review and commit the complete prototype**

Run:

```bash
git diff --check
git diff
```

Stage only the prototype and commit:

```bash
git add whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md
git diff --cached --check
git diff --cached
git commit -m "content(youtube): complete eight-minute episode prototype"
```

### Task 4: Present the complete narration for creative review

**Files:**

- Read:
  `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`

- [ ] **Step 1: Return the complete narration**

Show all eight numbered beats in order. Do not prepend an audit, timing diagnosis, retention
score, or proposed cuts.

- [ ] **Step 2: Record Martin's targeted revisions**

Treat every requested change as scoped unless it alters the thesis or accepted expansion
architecture. Preserve accepted surrounding language. If a request changes the central
question, core answer, practical test, or final lesson, return to architecture review before
rewriting.

- [ ] **Step 3: Stop at the creative approval gate**

Do not promote the prototype, refresh evidence, or rewrite the production appendix until
Martin explicitly approves the complete narration and creative direction.

### Task 5: Promote the approved narration into production

**Gate:** Execute this task only after explicit approval of the complete narration.

**Files:**

- Modify:
  `whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md`
- Reference:
  `whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md`
- Test:
  `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`
- Test:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`
- Test:
  `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

- [ ] **Step 1: Replace the production narration**

Copy the approved eight numbered beats into the production document. Add a visible
`[F-###](Original URL)` immediately after every factual sentence or separable factual
clause. Keep hypothetical and original-synthesis language clearly distinguished.

- [ ] **Step 2: Rebuild matching appendix beats**

Make all appendix beat numbers and titles match the narration. Update:

- time ranges and word targets;
- story functions;
- claim mappings;
- visuals and animation purposes;
- on-screen text;
- audio and accessibility notes;
- asset decisions;
- the single personal-input decision;
- the single viewer-application block.

Keep the application sequence `insight → try → observe → boundary → larger benefit`.

- [ ] **Step 3: Refresh metadata and ledgers**

Set the exact extracted narration word count, retain target runtime `08:00`, and update the
version. Refresh the narrative spine, timing section, evidence audit, issue ledger,
unverified-material notes, and rights review. Do not call the script `RECORD-READY`.

- [ ] **Step 4: Run separate post-review audits**

Audit story, personal authenticity, evidence, facts, rights, visuals, animation,
application boundary, accessibility, timing, retention, and format. Record concerns in the
appendix rather than silently cutting approved context.

- [ ] **Step 5: Run structural validation**

Resolve the production path, then run:

```bash
python3 .agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py \
  -- "$(pwd)/whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md"
```

Expected:

```text
PASS: annotated script is structurally valid
```

- [ ] **Step 6: Run the script-skill suite**

Run:

```bash
python3 -m unittest discover \
  -s .agents/skills/writing-whp-youtube-scripts/scripts \
  -p 'test_*.py'
```

Expected: all tests pass with zero failures.

- [ ] **Step 7: Review and commit the production promotion**

Run:

```bash
git diff --check
git status --short
```

Stage only the approved prototype and production episode paths, review the staged diff, and
commit:

```bash
git add \
  whp-youtube/drafts/01-why-ai-makes-bad-advice-feel-right-full-prototype.md \
  whp-youtube/episodes/01-why-ai-makes-bad-advice-feel-right.md
git diff --cached --check
git diff --cached
git commit -m "content(youtube): promote full Episode 1 narration"
```
