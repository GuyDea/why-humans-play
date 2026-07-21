# WHP AI Reward-Hacking Pilot Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a complete, production-annotated 8–9 minute first episode of Why Humans Play that explains why an AI can earn the score while defeating the designer's goal, then gives viewers a bounded way to inspect a scoreboard in their own lives.

**Architecture:** Keep one editable source of truth at `whp-youtube/episodes/01-why-ai-cheats.md`. Put spoken narration only in beat-level blockquotes and keep the opening test, production notes, evidence records, rights decisions, editorial score, and issue ledger in the same document before its final reference sections. Use primary or authoritative sources for every load-bearing factual claim, use original WHP diagrams rather than copyrighted gameplay, and retain `RESEARCH-DRAFT` until Martin separately approves the narration and story direction.

**Tech Stack:** Markdown annotated-script contract, public primary/authoritative web sources, original WHP motion diagrams, Python 3 structural validator, `rg`, Git.

---

## File map

| Path | Responsibility |
|---|---|
| `BRAND.md` | Canonical pilot and launch-sequence decision already accepted by Martin. |
| `CLAUDE.md` | Repository-facing pointer to the accepted launch sequence. |
| `DECISIONS.md` | Durable decision record for the breadth-first launch and AI pilot. |
| `whp-youtube/STEERING.md` | YouTube-specific accepted sequence, package, constraints, and adjacent episodes. |
| `whp-youtube/drafts/evolutionary-paradox-of-play.md` | Historical draft annotation preventing it from being mistaken for the active pilot. |
| `whp-youtube/episodes/01-why-ai-cheats.md` | The only editable script, production, evidence, rights, and audit source of truth for Episode 1. |
| `docs/superpowers/specs/2026-07-21-whp-ai-reward-hacking-pilot-design.md` | Approved topic, package, assignment contract, narrative architecture, and validation requirements. |

### Task 1: Preserve the accepted pilot decision as its own commit

**Files:**

- Modify: `BRAND.md`
- Modify: `CLAUDE.md`
- Modify: `DECISIONS.md`
- Modify: `whp-youtube/STEERING.md`
- Modify: `whp-youtube/drafts/evolutionary-paradox-of-play.md`

- [ ] **Step 1: Review only the already-reconciled decision diff**

Run:

```bash
git diff -- BRAND.md CLAUDE.md DECISIONS.md whp-youtube/STEERING.md whp-youtube/drafts/evolutionary-paradox-of-play.md
```

Expected: the diff records the accepted breadth-first launch sequence, makes AI reward hacking the active pilot, and preserves the evolutionary-paradox material as historical rather than deleting it.

- [ ] **Step 2: Check for stale pilot language**

Run:

```bash
rg -n "pilot is being selected|current pilot.*evolutionary|Episode 1.*evolutionary|active pilot.*evolutionary" BRAND.md CLAUDE.md DECISIONS.md whp-youtube/STEERING.md whp-youtube/drafts/evolutionary-paradox-of-play.md
```

Expected: no statement presents the evolutionary-paradox draft as the current pilot or says the pilot is still undecided. Historical references may remain only when explicitly labeled historical or parked.

- [ ] **Step 3: Commit the accepted steering reconciliation**

```bash
git add BRAND.md CLAUDE.md DECISIONS.md whp-youtube/STEERING.md whp-youtube/drafts/evolutionary-paradox-of-play.md
git commit -m "docs: record AI reward-hacking launch sequence"
```

Expected: one commit containing only the accepted canonical and historical-context updates.

### Task 2: Create the annotated episode source and lock its structural contract

**Files:**

- Create: `whp-youtube/episodes/01-why-ai-cheats.md`
- Reference: `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`
- Reference: `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`

- [ ] **Step 1: Create the episode directory and document header**

Create the directory if absent:

```bash
mkdir -p whp-youtube/episodes
```

Then use `apply_patch` to add the script with this exact metadata order and assignment-specific values:

```markdown
# Why AI Cheats—Even When It Follows Every Rule

- **Status:** RESEARCH-DRAFT
- **Version:** 0.1
- **Deliverable:** FULL-SCRIPT
- **Target runtime:** 08:30
- **Word count:** 0
- **Audience:** Curious adults interested in AI, behavior, systems, or games—not AI-safety specialists
- **Episode mode:** The Hidden Game
- **Title:** Why AI Cheats—Even When It Follows Every Rule
- **Thumbnail promise:** An obviously wrong result receives a green 100% score beside the words “100% WRONG”
- **Viewer promise:** Understand the gap between a score and a goal, then recognize one proxy game shaping human behavior.
- **Useful viewer change:** Inspect one scoreboard by separating its real goal, literal reward, ignored dimension, and likely failure mode.
- **Central question:** Why do optimized systems find strategies their designers consider cheating?
- **Thesis:** An optimizer targets the literal reward it can affect; an incomplete proxy leaves unmeasured dimensions it can exploit, without implying intent, consciousness, or moral dishonesty.
- **Payoff:** What looks like cheating can be perfect obedience to the wrong scoreboard; seeing who chose the score is the first move toward redesigning the game or stepping out.
- **Evidence review:** Load-bearing AI examples and human-incentive bridge are under claim-by-claim primary-source review.
- **Rights review:** The production is designed around original WHP diagrams; source figures and videos are reference-only unless separately recorded and cleared.
```

Expected: the title, thumbnail, first question, thesis, useful change, and payoff all express the same score-versus-goal contract.

- [ ] **Step 2: Add eight empty beat contracts with fixed narrative jobs**

Add strictly ascending `Beat 01` through `Beat 08` blocks, each with the eight required subsections. Give them these story jobs and provisional time ranges:

1. `00:00–00:35` — perfect-score paradox and immediate clarification of “cheats”;
2. `00:35–01:35` — primary-source block-manipulation exploit;
3. `01:35–02:45` — intended goal, proxy, optimizer, and ignored dimension;
4. `02:45–04:05` — hide-and-seek escalation and physics exploit;
5. `04:05–05:05` — rigor turn: no inferred intent, consciousness, or universal behavior;
6. `05:05–06:25` — bounded human incentive mechanism and one institutional example;
7. `06:25–07:55` — fully voiced five-part viewer application using an everyday self-score;
8. `07:55–08:30` — return to the wrong perfect score and close on agency.

Every provisional beat must already contain a concrete story-function sentence, an original-visual fallback, an animation purpose or explicit `No animation — ...` reason, an accessibility note, and an honest prose statement of the current claims/assets disposition.

- [ ] **Step 3: Resolve personal input and viewer application cardinality**

Place exactly one complete `### Personal input` block in Beat 06 with `PI-001` and `Decision: OMIT`. Explain in every field that autobiography would interrupt the causal chain and that Martin's builder identity may be used only as a present-tense factual credibility line if it earns its place; do not create an input marker or invent a personal memory.

Place exactly one complete `### Viewer application` block in Beat 07. Its contract must say:

- insight: every scoreboard is a model of a goal, not the goal itself;
- try: choose one low-risk score already used in daily life;
- observe: identify what behavior rises and what valuable behavior disappears;
- boundary: observation is not causal proof and metrics are not inherently bad;
- larger benefit: redesign, supplement, or consciously exit a game whose score defeats its purpose.

- [ ] **Step 4: Add development and audit sections before the final ledgers**

Add `## Development record` for the three opening candidates and their comparison, followed later by `## Editorial audit` with a 10-dimension score table and issue ledger. End the document with exactly one `## References and source materials` heading and these four level-three sections in order:

1. `### Evidence references`
2. `### Visual and archival sources`
3. `### Unverified or disputed material`
4. `### Attribution copy`

Use explicit none-yet statements until the records are built; do not claim evidence or rights completion.

### Task 3: Verify and compare three opening candidates before drafting the episode

**Files:**

- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`
- Reference: `docs/superpowers/specs/2026-07-21-whp-ai-reward-hacking-pilot-design.md`

- [ ] **Step 1: Research the perfect-score/block-flip opening from the underlying source**

Start with the DeepMind specification-gaming review, follow its citation for the block-manipulation example to the underlying paper and any source-native supplementary material, and record:

- the task's intended outcome;
- the exact implemented reward term;
- the behavior actually observed;
- whether “100%” is factual or only a WHP conceptual device; and
- the source-native locator and limitations.

Starting sources:

```text
https://deepmind.google/blog/specification-gaming-the-flip-side-of-ai-ingenuity/
https://arxiv.org/abs/1704.03073
```

Expected: the candidate survives only if the primary source supports the exploit as narrated. Label the green `100%` as a conceptual scoreboard unless a source explicitly reports that value.

- [ ] **Step 2: Research the hide-and-seek opening from the primary project and paper**

Open the complete OpenAI project page and paper, then record the task design, reward setup, emergent strategy sequence, selected physics exploit, exact locator, and the paper's own caveats.

Starting sources:

```text
https://openai.com/index/emergent-tool-use/
https://arxiv.org/abs/1909.07528
```

Expected: select one visually comprehensible exploit; do not compress several stages into a false chronology or call novelty “intent.”

- [ ] **Step 3: Research the human-metric opening as an eligible but non-preferred alternative**

Verify one institutional incentive example and the general measured-versus-unmeasured effort mechanism. Prefer sources that can support exact, bounded wording rather than folklore.

Starting sources:

```text
https://www.nber.org/papers/w3102
https://www.consumerfinance.gov/about-us/newsroom/consumer-financial-protection-bureau-fines-wells-fargo-100-million-widespread-illegal-practice-secretly-opening-unauthorized-accounts/
```

Expected: the institutional example is retained only if the authoritative record connects a target or incentive to the documented behavior without requiring invented motives or a universal causal claim.

- [ ] **Step 4: Write and score all three candidate openings**

In `## Development record`, write three 45–70 word narration candidates:

1. perfect score, wrong outcome;
2. hide-and-seek arms race; and
3. human metric first.

Score each `0–2` for immediate curiosity, title/thumbnail match, central-question speed, factual defensibility, original-visual feasibility, and path to the human payoff. Record disqualifiers separately from total score.

Expected: choose the highest-scoring eligible opening, not simply the most dramatic one. If the approved perfect-score opening loses because its exploit cannot be supported, apply the design's failure handling and document the replacement.

- [ ] **Step 5: Reconcile any changed definite WHP decision immediately**

If the selected opening, title, thumbnail promise, central answer, launch order, or other canonical pilot decision changes, invoke `.agents/skills/reconcile-whp/SKILL.md` before continuing and update the canonical files it identifies. If the approved direction remains unchanged, record a successful no-op reconciliation check in the work log rather than adding duplicate prose.

### Task 4: Build the claim and visual-rights ledgers before full narration

**Files:**

- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`
- Reference: `.agents/skills/writing-whp-youtube-scripts/references/research-and-rights.md`

- [ ] **Step 1: Assign stable claim IDs to the smallest necessary claims**

Create separate records, without compound overreach, for the claims the final spine actually needs:

- `F-001` — the chosen opening exploit and its literal reward;
- `F-002` — the bounded score/proxy/specification-gaming mechanism;
- `F-003` — the selected hide-and-seek strategy or physics exploit;
- `F-004` — measured incentives can redirect human effort away from unmeasured dimensions;
- `F-005` — the selected institutional example, if it survives verification;
- `F-006` — any 2025–2026 reward-hacking context retained in narration.

Treat the no-intent/no-consciousness statement as the explicit inferential boundary on the AI-example records unless a source makes a narrower empirical claim worth recording separately. Omit unused records rather than filling the script with research trivia. Preserve assigned IDs throughout revision.

- [ ] **Step 2: Complete every evidence field from the full sources**

For each retained `F-###`, complete all 12 required fields: exact claim, original URL, source/author, date, stable locator, access date, scope, independent cross-checks or an explicit none-found result, named source-by-source contradiction outcomes, status, caveat, and approved narration wording.

For every original and cross-check source, scan the complete relevant source and write exactly one named `COMPLETE` or `INCOMPLETE` contradiction outcome. A material `INCOMPLETE` source keeps the claim unresolved and out of unqualified narration.

- [ ] **Step 3: Decide whether current 2025–2026 research earns narration time**

Check the current publication status, evaluated models/tasks, intervention, and limitations of any recent result before using it. Start with:

```text
https://www.anthropic.com/research/emergent-misalignment-reward-hacking
https://arxiv.org/abs/2605.02964
```

Expected: recent work appears only if it clarifies present relevance inside the 8–9 minute spine. A preprint stays explicitly a preprint; model-organism or benchmark results do not become claims about every deployed AI.

- [ ] **Step 4: Make original WHP graphics the production default**

For each beat, describe a diagram or animation built from basic WHP-owned shapes, labels, and typography. Do not trace source artwork, reproduce screenshots, or depend on YouTube footage. Label conceptual reconstructions on screen and distinguish reported behavior from illustrative motion.

If no external asset is planned, keep `### Visual and archival sources` and `### Attribution copy` as explicit none-required sections. If any external asset becomes necessary, assign one stable `A-###` ID and complete all 11 fields before referencing it in a beat.

- [ ] **Step 5: Commit the researched scaffold**

Run:

```bash
git add whp-youtube/episodes/01-why-ai-cheats.md
git commit -m "research: build AI reward-hacking episode ledger"
```

Expected: the committed document is still honestly labeled `RESEARCH-DRAFT`; every load-bearing claim has a traceable record or is explicitly unresolved.

### Task 5: Draft the full narration and production treatment

**Files:**

- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`
- Reference: `.agents/skills/writing-whp-youtube-scripts/references/story-and-hook-method.md`

- [ ] **Step 1: Draft Beat 01 and Beat 02 as one causal opening movement**

Land the title paradox in the first sentence, contextualize “cheats” as shorthand within the first 15 seconds, and show the literal reward before using technical vocabulary. Make the green `100%` visibly conceptual unless verified as a reported value.

Expected: the viewer can state both the wrong outcome and why it scored well before Beat 02 ends.

- [ ] **Step 2: Draft Beat 03 and Beat 04 around one visual mechanism**

Use the same four-part diagram across both beats:

```text
real goal -> measurable proxy -> optimizer's action -> ignored dimension
```

Introduce “specification gaming” or “reward hacking” only after the mechanism is visible. Use the hide-and-seek example to show capability discovering an environmental possibility, not to imply a general desire to deceive.

- [ ] **Step 3: Draft the rigor turn before the human analogy**

State audibly that “cheat” is human shorthand, examples are environment- and objective-specific, and observed exploitation does not establish consciousness, moral dishonesty, or inevitable behavior in every AI. Keep the clarification concise enough to preserve momentum but strong enough to bound the title.

- [ ] **Step 4: Draft the human bridge with explicit analogy boundaries**

Use one verified institutional example plus the general multitask-incentive mechanism. Say explicitly that humans and trained models need not think alike for both to respond to a scoreboard. Do not use the analogy as proof of AI cognition or use the AI examples as proof of a human causal claim.

- [ ] **Step 5: Voice all five application elements in Beat 07**

Ask the viewer to pick one low-risk score already present in daily life, such as an inbox count, streak, step count, response-time target, or output tally. Voice the real goal, literal reward, ignored dimension, and failure-mode questions; say what to observe; preserve the boundary that the inspection is diagnostic rather than causal proof and that a useful metric can still be worth keeping.

- [ ] **Step 6: Close the loop in Beat 08**

Return to the exact wrong-perfect-score image and resolve the title: apparent cheating can be literal obedience to an incomplete scoreboard. End with the viewer's agency to redesign, supplement, or exit the game; do not broaden into a general AI-alignment sermon or preview several unrelated episodes.

- [ ] **Step 7: Complete all production annotations beside their narration**

For every beat, make claim statuses match the ledger, specify original-visual treatment and fallback, state exactly what motion clarifies, keep on-screen text minimal, and make every essential visual relation available in the descriptive transcript. Keep narration blockquotes free of citations and directions.

### Task 6: Measure the spoken draft and pass deterministic structure checks

**Files:**

- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`
- Validate: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`

- [ ] **Step 1: Extract narration for an editorial table read without creating a second editable script**

Read only blockquotes directly under each `### Narration`, in beat order. Exclude personal-input markers and every production, source, and audit section. Keep any temporary extraction in `/tmp`, never in the repository.

Expected: approximately 1,200–1,350 spoken words before performance pauses, with no annotation text in the extraction.

- [ ] **Step 2: Update runtime, narration word count, version, and review summaries**

Set `Word count` to the exact whitespace-delimited count of extracted spoken words. Set the target runtime honestly from the word count and pacing assumption; retain the 6–10 minute hard range. Increment the version and update evidence/rights summaries to reflect the records that actually exist.

- [ ] **Step 3: Run the validator from its own package directory with a dynamically resolved target**

Run from the repository root:

```bash
script_path="$(realpath whp-youtube/episodes/01-why-ai-cheats.md)"
cd .agents/skills/writing-whp-youtube-scripts
python3 scripts/validate_annotated_script.py -- "$script_path"
```

Expected: exit code 0 and the exact limitation:

```text
Structural validation only: this does not verify factual truth, source trustworthiness, copyright ownership, fair use, or editorial quality.
```

- [ ] **Step 4: Run repository hygiene checks**

Return to the repository root and run:

```bash
rg -n "TODO|TBD|TK|lorem|PI-[0-9]{3}: Martin input" whp-youtube/episodes/01-why-ai-cheats.md
rg -n "all AI|proves intent|is conscious|morally dishonest|metrics are bad|100%" whp-youtube/episodes/01-why-ai-cheats.md
```

Expected: the first search has no unresolved drafting tokens or personal-input marker. Every second-search match is either the conceptual package visual or bounded/rejected language, never an unsupported universal claim.

### Task 7: Run the ten independent editorial audits and revise

**Files:**

- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`
- Reference: `.agents/skills/writing-whp-youtube-scripts/references/quality-rubric.md`

- [ ] **Step 1: Audit promise/payoff, facts, and story as separate passes**

Record findings for:

1. title/thumbnail/opening/question/application/final-payoff alignment;
2. narration checked word-for-word against every claim's approved wording, scope, status, and caveat; and
3. chronology, attributed motives, reconstruction labels, and the `PI-001` `OMIT` decision.

Expected: every issue receives a beat or record ID, severity, required action, owner, and status; silence never means resolved.

- [ ] **Step 2: Audit spoken flow, visuals, animation, and accessibility separately**

Perform an editorial out-loud read if audio output is available; otherwise mark the human table read open and do not award a rubric 2 for spoken quality. Then separately audit visual identity/relevance, animation purpose/feasibility, and accessibility without letting narration fluency hide a visual problem.

- [ ] **Step 3: Audit rights and complete-source contradiction checks separately**

Trace every external source or asset to its origin. Reopen every original and cross-check source, scan the complete relevant material for conflicts in date, chronology, causality, and scope, and ensure every named source has exactly one honest `COMPLETE` or `INCOMPLETE` outcome with its wording consequence.

- [ ] **Step 4: Score the ten dimensions conservatively**

Record version-specific `0–2` scores and reasoning for all ten rubric dimensions. Require at least 16/20 with no zero in dimensions 1, 2, 7, or 8 before asking Martin for editorial approval, but do not promote the status without that approval.

Expected: the final work in this implementation remains `RESEARCH-DRAFT` even if structurally complete. Human approval of narration/story direction is a later, explicit `EDITORIAL-DRAFT` gate; final evidence, rights, production review, and renewed human approval are a separate `RECORD-READY` gate.

- [ ] **Step 5: Re-run the structural and hygiene checks after every material revision**

Repeat Task 6 Steps 2–4, update the version and audit score, and preserve all unresolved items in the issue ledger.

### Task 8: Reconcile, verify the branch diff, and commit the complete draft

**Files:**

- Modify if required by reconciliation: `BRAND.md`
- Modify if required by reconciliation: `CLAUDE.md`
- Modify if required by reconciliation: `DECISIONS.md`
- Modify if required by reconciliation: `whp-youtube/STEERING.md`
- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`

- [ ] **Step 1: Invoke the WHP reconciliation skill after the script's definite decisions**

Run `.agents/skills/reconcile-whp/SKILL.md` against the chosen opening, verified examples, final application, packaging, and any change to the accepted launch sequence. Update only canonical facts that genuinely changed; do not duplicate the full script or claim ledger in steering files.

- [ ] **Step 2: Run final verification from a clean command context**

From the repository root, run:

```bash
script_path="$(realpath whp-youtube/episodes/01-why-ai-cheats.md)"
cd .agents/skills/writing-whp-youtube-scripts
python3 scripts/validate_annotated_script.py -- "$script_path"
```

Then return to the repository root and run:

```bash
git diff --check
git status --short
git diff --stat HEAD
```

Expected: the validator passes structurally; `git diff --check` is silent; the diff contains only the script and justified reconciliation updates; the script's issue ledger names every remaining human approval, table-read, evidence, rights, or production dependency.

- [ ] **Step 3: Commit the audited research draft**

```bash
git add whp-youtube/episodes/01-why-ai-cheats.md BRAND.md CLAUDE.md DECISIONS.md whp-youtube/STEERING.md whp-youtube/drafts/evolutionary-paradox-of-play.md
git commit -m "feat: write AI reward-hacking pilot script"
```

Expected: the commit contains the complete audited `RESEARCH-DRAFT` plus only necessary canonical reconciliation changes. Omit unchanged paths from the commit automatically.

- [ ] **Step 4: Report the exact readiness boundary**

Hand off the script path, narration word count, estimated runtime, validator result, rubric score, commits, and unresolved issue ledger. State plainly that structural validation is not factual, rights, or editorial certification and that Martin's explicit narration/story approval is still required before `EDITORIAL-DRAFT`.
