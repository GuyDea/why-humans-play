# Quality Rubric

## Contents

- [Use the score as editorial diagnosis](#use-the-score-as-editorial-diagnosis)
- [Apply the scoring scale](#apply-the-scoring-scale)
- [Score the ten dimensions](#score-the-ten-dimensions)
- [Enforce readiness gates](#enforce-readiness-gates)
- [Run separate final audit passes](#run-separate-final-audit-passes)
- [Maintain an issue ledger](#maintain-an-issue-ledger)
- [Reject recurring failure patterns](#reject-recurring-failure-patterns)

## Use the score as editorial diagnosis

Use this rubric to make editorial review consistent, expose weak production
decisions, and direct revision. Do not treat it as deterministic truth or as a
forecast of audience retention, click-through rate, reach, or virality. Record the
reviewer's reasoning and the version scored.

Score what the script and its ledgers actually contain. Do not award credit for
research, clearance, assets, or revisions that are merely intended.

For an active episode stage, run narration reads, aloud delivery, timing, and spoken
readability on `script.raw.md`. Run structural, annotation, evidence, appendix, and
production audits on `script.extended.md`, comparing its mirrored narration with raw
whenever the audit crosses both views. Pair synchronization and stage boundaries follow
the [script artifact pair owner](script-artifact-pair.md).

## Apply the scoring scale

Use the same scale on every dimension:

- **0 — Missing or misleading:** The requirement is absent, contradicted, materially
  deceptive, or unusable without rethinking the approach.
- **1 — Usable with revision:** The direction is viable, but a clear gap, ambiguity,
  mismatch, or production dependency remains.
- **2 — Clear and production-useful:** The decision is explicit, internally
  consistent, evidence-aware, and ready for the next production stage.

Choose the lowest anchor that accurately describes the work. Do not average across
multiple weaknesses within one dimension.

Apply personal-input and viewer-application requirements in full to a `FULL-SCRIPT`.
Review a `TARGETED-ARTIFACT` only against its assigned or inherited scope. The absence
of optional personal-input or viewer-application blocks is not itself a deficiency and
must not lower a score or trigger insertion of out-of-scope content. When a targeted
artifact includes either block, or is assigned to preserve an inherited personal-input
or viewer-application contract, evaluate the in-scope material against every applicable
anchor. A targeted artifact cannot promote the parent script's readiness.

## Score the ten dimensions

### 1. Title, thumbnail, opening, and payoff alignment

- **0:** The opening pursues a different question, the packaging promise is hidden or
  misleading, or the payoff does not resolve it. The work also scores 0 when it supplies
  either a familiar summary with no new model or an action list that does not follow from
  the episode's mechanism, or when its viewer relevance rests on a theory, analogy, or
  hypothetical instead of observed proof. A problem-led opening also scores 0 when it
  develops the proof case before stating the remedy promise.
- **1:** The components address the same topic, but the viewer promise is delayed,
  vague, overbroad, or only partially paid off.
- **2:** The title, thumbnail promise, opening question, central answer, and final
  payoff create one clear and explicitly resolved contract. The payoff teaches the
  approved non-obvious understanding and carries it into a concrete, observable, bounded
  viewer response. The opening promise names both that understanding and the concrete
  response rather than offering only a tool or only an explanation. Any load-bearing
  claim that informed or expert viewers remain
  vulnerable is earned with a documented observed case involving the claimed population.
  When an immunity defense is predictable, full credit requires
  [the five-move anti-skip sequence](rapid-prototyping.md#use-the-five-move-anti-skip-intro)
  and places the remedy promise before detailed case exposition.
  Full credit requires the finished script to preserve the approved situation, decision
  rule or sequence, observable result, boundary, and transfer case.

### 2. Factual precision and status-matched wording

- **0:** A material claim is unsupported, rejected, materially overstated, or voiced
  more confidently than its status permits. When a viewer application is in scope, it
  also scores 0 if it prescribes more than the evidence can establish. It also scores 0
  when an adjacent case silently substitutes a different population, behavior, mechanism,
  or outcome for the one narrated.
- **1:** Core claims are supportable, but a scope term, denominator, causal boundary,
  caveat, attribution, or approved wording needs revision.
- **2:** Every material narration claim preserves scope and causality, uses approved
  or weaker wording, and audibly matches its confidence status. When a viewer
  application is in scope, its action, observation, or reflection audibly preserves
  the same population, causal, confidence, and applicability limits as its supporting
  evidence. A hypothetical explains or rehearses only; it never serves as proof of
  prevalence, consequence, or viewer vulnerability.

### 3. Story momentum without invented details

- **0:** The narrative depends on invented dialogue, motives, thoughts, feelings,
  weather, chronology, sensory detail, or misleading reconstruction. First-person
  material is invented, forced, or used as proof. A load-bearing transition also scores
  0 when it says only what the previous case did not prove and leaves the next point
  logically disconnected.
- **1:** The sequence is honest and usable, but includes a stalled beat, trivia
  detour, weak consequence, vague loop, proof handoff, or scene that needs clearer
  attribution.
- **2:** Each beat changes viewer understanding, causes the next question, and builds
  momentum without invention; reconstructions and reenactments are unmistakable. When
  personal input is in scope, the work makes one explicit personal decision, uses only
  authentic supplied material, and the sequence performs necessary narrative work or
  gives a specific reason for `OMIT`. Adjacent cases state the first case's exact
  takeaway, why it matters, the remaining question, and why the next evidence is needed —
  voiced in plain words, never implied through a bare pivot such as “So:” plus a new
  question.
  Advice experiments make the case, advice, participant decision, label manipulation, and
  measured outcome understandable on first hearing. Each story uses the fewest distinct
  inputs, objects, roles, and counts that preserve its causal truth; source detail with no
  explanatory job is collapsed or omitted. A top-scoring story opens with a compact
  verified trust anchor, makes its essential stages audible through varied natural
  transitions rather than repeated outline labels, preserves every causal hinge and
  material boundary, and spends the saved attention on its surprising result, consequence,
  and AHA. Before the result, it introduces every actor, group, exact task, success
  criterion, metric, and comparator the listener needs. It reports the result in the same
  concrete vocabulary as the task, distinguishes an expressed attitude from effective
  behavior, and leaves no unresolved “judged what?”, “which group?”, “what accuracy?”, or
  “compared with whom?” question. It preserves the practical objective and scored success
  condition without reciting response controls that add no causal value. Its teaser does
  not carry details that belong in the developed case. Each entity keeps one stable spoken
  name, every role label helps the listener distinguish actors, and no new noun appears
  merely because the source used it. Measurements name both the established object and the
  measured property. A short joke strengthens that turn only when the result itself earns
  it and its concrete roles map directly to the mechanism. When an expectation is needed
  to make a reversal surprising, the story states it before the result and contrasts the
  result directly against it. The result resolves through no more than one
  mechanism-mapped punchline and one exact takeaway. Adjacent cases keep their proof jobs
  distinct before the narration synthesizes them, and each beat closes once instead of
  stacking equivalent analogies or thesis lines.

When the appendix identifies a supporting narrative throughline, a top score also requires
the argument to remain the spine, every mapped callback to add information or change
meaning, the case's proof job to stay bounded, and the opening loop to receive an earned
payoff. Do not penalize a script for using no throughline when the audit explains why no
candidate improved the episode. Penalize a forced or repetitive sidecar that competes with
the thesis.

When the appendix contains an approved Story Progression Plan, a top score also requires
the narration to preserve its causal chain, selected honest moves, proof handoffs, and
global loop/payoff closure. Penalize manufactured drama, quota-driven technique use, an
unreported load-bearing deviation, or a bridge that promises content the narration never
delivers.

When no approved progression is in scope, score intrinsic causal movement. Do not penalize
a legacy script or scoped `TARGETED-ARTIFACT` for the absence of a plan it was never
required to contain. Audit only visible document state; record any evidence-driven
plan-change tradeoff in the production appendix.

### 4. Spoken quality and credible runtime

- **0:** The narration is unperformable, substantially mistimed, or dominated by
  written-language constructions, paper-abstract phrasing, long explanatory punchlines,
  uncontrolled density, unresolved readability failures, or emotionally sterilized
  language that turns a human consequence into institutional copy.
- **1:** An aloud read is understandable and near target, but stumbles, overloaded
  sentences, abrupt caveats, sterile transitions, overlong jokes, or runtime drift
  remain.
- **2:** The narration has been read aloud and honestly timed; it is conversational,
  pronounceable, paced, and credible for the stated runtime. It sounds like a smart
  friend guiding the viewer from fact to reaction to meaning to the next question, and
  keeps standalone punchlines short and separate from their explanation. Precision
  controls what it claims; personality controls how it says it. The voice can use blunt
  judgment, emotionally loaded everyday words, and brutal humor without weakening factual
  support or turning a person's inherent worth or vulnerability into the punchline.
  Research-administration language gives way to ordinary spoken wording whenever the
  simpler wording preserves the same claim. Every factual sentence is a complete spoken
  clause the presenter could plausibly say unscripted while walking: no colon-label
  fragments, no line that depends on punctuation to be understood, and no idiom or
  compressed metaphor a non-native listener must decode. Jokes are earned, not quota-fed;
  a joke that sounds constructed rather than spontaneous costs this criterion its top
  score.

For an explicitly requested walking-vlog Script Blueprint, a top delivery score requires
every flagged number and quotation to have a deliberate, documented spoken treatment that
preserves the factual boundary and can be reproduced naturally from memory.

Spoken readability is a non-compensable delivery gate:

- No spoken sentence exceeds 25 words.
- Every 21–25-word sentence has passed a first-hearing review.
- Shorter sentences still fail when vocabulary, structure, or unclear relationships make
  them difficult to process.
- A sentence of any length fails when the listener cannot identify who did what, what
  changed, and why it matters after one hearing.
- The mechanical checker has no unresolved `FAIL` or `REVIEW` result.

Do not raise a script's score or readiness label until this gate passes. Splitting a
difficult sentence must preserve its evidence boundary, connective tissue, humor, and
personality.

### 5. Useful visual treatment and concrete candidates

- **0:** Important facts lack visual decisions, a concept is presented as an asset,
  or the treatment would misrepresent what the material shows.
- **1:** Treatments are relevant, but one or more candidates, identity checks,
  intended uses, or fallbacks remain abstract or incomplete.
- **2:** Important facts have purposeful treatments, concrete source candidates when
  practical, accurate identity/context, and ownable fallbacks for uncertain assets.

### 6. Explanatory animation purpose

- **0:** Motion is decorative, misleading, infeasible, or requested without an
  explanatory purpose.
- **1:** The intended relationship is useful, but the cue, synchronized change,
  resolved state, feasibility, or still-image comparison needs revision.
- **2:** Every animation states what temporal, causal, spatial, scale, comparison, or
  evidence relationship it clarifies, cues one relation, and pauses on a legible
  resolved state; beats that need no motion say so.

### 7. Evidence-reference completeness

- **0:** A material claim lacks a claim record, original source, required locator, or
  honest unresolved status; ledgers are missing or structurally disconnected.
- **1:** Records exist and trace to sources, but a locator, scope, contradiction,
  cross-check, caveat, access date, or approved wording needs substantive completion.
- **2:** Every referenced claim has one complete, traceable record with exact claim,
  origin, locator, scope, checks, status, caveat, and narration-safe wording.

### 8. Visual provenance and rights honesty

- **0:** An evidence URL, credit, search result, `free` label, or vague license is
  treated as permission; a required asset is blocked without a fallback.
- **1:** Asset records and statuses are candid, but a rightsholder, original asset
  page, direct file, versioned license, commercial/adaptation term, attribution, or
  fallback remains unresolved.
- **2:** Every external asset is traceable to a concrete original page and reviewed
  rights basis, uses an allowed exact status, records intended changes and terms,
  confirms that the planned use is compatible with those terms, and has a
  production-safe fallback when clearance is uncertain.

### 9. Accessibility of essential visual information

- **0:** The viewer must see an unlabeled visual, color distinction, text block, or
  motion to understand an essential claim.
- **1:** Essential information is partly narrated or described, but a label, caption,
  contrast choice, pacing decision, or descriptive-transcript note needs revision.
- **2:** Narration, labels, captions, contrast, timing, and descriptive notes make
  every essential visual relationship understandable without relying on sight,
  color, or rapid reading alone.

### 10. WHP brand fidelity

The WHP lens is satisfied at the mechanism level, not the vocabulary level. The episode
reveals a rule-system: who the players are, what the real goal is, what actually gets
scored, what strategies the scoring rewards, and what that does to the players. Game or
play vocabulary is never required to pass, and a game or play metaphor that does no
explanatory work is a defect, not a lens.

- **0:** The script uses hype, woo, fabricated shock, shallow self-help certainty,
  childish framing, or product promotion that displaces the inquiry. The useful viewer
  change is missing, generic, or unsupported; or an in-scope application is missing,
  generic, or unsupported.
- **1:** The piece is broadly on-brand but lacks a legible rule-system,
  useful viewer change, steelmanned caveat, grounded tone, or Martin's natural voice;
  or it decorates the episode with game or play vocabulary that explains nothing.
- **2:** The script makes the episode's rule-system legible — players, real goal,
  scored proxy, rewarded strategy, and consequence — changes how the
  viewer can see or act, and stays rigorous, useful, grounded, human, and
  non-promotional. The declared change and WHP lens form one grounded payoff; when a
  viewer application is in scope, its voiced application, observable signal, boundary,
  and larger benefit form part of that same payoff.

Across dimensions 1 and 10, `Be careful`, `think critically`, `ask better questions`, and
a loose checklist without a decision rule, sequence, or observable result do not pass.
Require both a non-obvious understanding that revises the viewer's prior model and a
concrete response that follows from the mechanism.

## Enforce readiness gates

Apply score and gate requirements separately. Use these promotion gates only for a
`FULL-SCRIPT`; a `TARGETED-ARTIFACT` may report findings but cannot promote the parent
script's readiness.

### `EDITORIAL-DRAFT`

Require all of the following:

- a score of at least **16/20**;
- no zero in dimension 1, 2, 7, or 8;
- no `INPUT-REQUESTED` personal block or unresolved input marker; and
- documented approval of the narration and story direction by an authorized human
  editor; and
- an honest record of every unresolved issue.

Do not promote a draft that reaches 16 by compensating for a zero in a protected
dimension.

### `RECORD-READY`

Require the `EDITORIAL-DRAFT` gate, this rubric's score requirements, and every
requirement in the
[record-ready gate](annotated-script-format.md#record-ready-gate), which owns the
approval, evidence, rights, personal-input, and asset conditions. This rubric adds only:

- no dimension scored 0 after re-scoring the revised script; and
- an honest unresolved-issue list carried forward from the audit passes.

License compatibility is decided by
[the research and rights method](research-and-rights.md#use-rights-statuses-exactly), not
here and not by the validator. Refer interpretation to an authorized rights reviewer or
counsel; this rubric does not provide legal advice.

Treat human approval and substantive review as requirements, not score bonuses. A
total score never overrides a hard gate. A validator pass never promotes readiness;
it confirms structure only.

## Run separate final audit passes

Run each pass independently so one kind of fluency does not conceal another kind of
failure. Apply each pass only to the assigned or inherited scope; for a targeted
artifact, record parent-script issues without inserting or scoring out-of-scope content:

Use raw for every narration read. Use extended for structural and production records,
evidence mapping, rights, visuals, accessibility planning, and readiness fields.

Across passes 2 and 8, reverse-audit narration against its claim cards and every
cross-check source: preserve limiting scope and modal terms, record every material
conflict in `Contradictions` and bound its consequences, re-evaluate dependent evidence
chains under the status thresholds, and require stable source-native locators.

1. **Promise and payoff:** Compare title, thumbnail, first seconds, central question,
   useful viewer change, and final answer word for word. When application is in scope,
   also compare its voiced application, observable signal, boundary, and larger benefit.
   Compare the finished payoff with the approved learning-and-action contract: preserve
   the named situation, decision rule or sequence, observable result, boundary, and
   transfer case.
2. **Factual wording and confidence:** Compare every narrated material claim word for
   word with its exact claim, approved wording, status, scope, and caveat. Retain every
   limiting scope or modal term, or weaken the narration. When application is in scope,
   confirm that its action, observation, or reflection preserves those evidence limits.
3. **Story and personal authenticity:** Challenge dialogue, chronology, motives,
   thoughts, feelings, weather, sensory detail, and reconstruction labels. When personal
   input is in scope, verify one explicit decision, supplied-and-approved material,
   necessary narrative work or a specific `OMIT` reason, and no invented first-person
   detail.
4. **Spoken flow and runtime:** Read aloud, time the narration, and revise density,
   pronunciation, transitions, breaths, friendly-conversation flow, every aside's exit
   seam (the resume line must re-name the referent it returns to), and any punchline
   that carries its own setup or explanation.
5. **Visual relevance and identity accuracy:** Verify that each visual advances its
   claim and depicts or labels the correct person, species, item, place, and date.
6. **Animation purpose and feasibility:** Confirm explanatory purpose, one cued
   relationship, resolved state, production feasibility, and whether a still is
   clearer.
7. **Provenance and rights:** Trace every external asset to its original page,
   rightsholder, exact terms, intended changes, status, and fallback. When personal
   media is in scope, review it separately for ownership, releases, depicted works,
   privacy, component rights, and an ownable fallback.
8. **Complete references:** Run
   [the reverse claim audit](research-and-rights.md#run-the-reverse-claim-audit) in full;
   it owns the per-source `COMPLETE`/`INCOMPLETE` outcome strings, the dependent-chain
   status re-evaluation, and the source-native locator rule. Then check claim and asset
   IDs, required fields, URLs, access dates, attribution copy, and unresolved material.
   Score the result: an unresolved conflict, a missing per-source outcome, or a status
   the chain cannot support is a dimension-7 deficiency.
9. **Accessibility:** Check captions, descriptive transcript notes, text density,
   contrast, color independence, pacing, and narration of essential relationships.
10. **Retention pacing:** Run this pass only after Martin has reviewed the complete
    narration; it is a diagnostic, never a drafting gate. Walk the script beat by beat
    and name any stretch that coasts on delivered information instead of advancing a
    question, contradiction, promised test, consequence, or payoff. Diagnose the missing
    progression before proposing another loop, following
    [the structural loop owner](story-and-hook-method.md#plan-loops-without-withholding-clarity).
    Confirm the title and thumbnail promise is explicitly paid off in narration, and that
    the runtime respects the 20-minute ceiling (STEERING Law 3, adopted 2026-08-05).
    Inside that ceiling, flag only stretches that fail to earn their time — never length
    itself — unless the assignment contract fixes a tighter target. Report each sag or overrun as a named passage with its
    tradeoff; do not cut setup, referents, causality, humor, or the learning promise to
    satisfy this pass without Martin's review.
11. **Readiness label:** Reapply the score threshold, protected-dimension rules,
    format gate, and substantive blockers. For a `FULL-SCRIPT`, also reapply
    personal-input resolution, absence of unresolved input markers, and both
    authorized-human approval moments; for a targeted artifact, verify that it does not
    claim to promote the parent script.

Do not combine these into a single “looks good” read. These are human editorial audits;
structural validation cannot judge personal authenticity, application quality, safety,
rights, or evidentiary fit.

## Maintain an issue ledger

Record every discovered issue with its beat or record ID, severity, required action,
owner, and status. Use explicit statuses such as open, in review, resolved, or
accepted by an authorized human reviewer. If no shared issue ledger exists, end the
review with an explicit unresolved list. Do not let silence imply resolution.

Re-score affected dimensions after material revision and record the new script
version. Preserve unresolved factual, rights, accessibility, and readiness findings
even when they do not change the total score.

## Reject recurring failure patterns

Reject or return for revision when any of these red flags appears:

- a denominator or event order changed in retelling;
- a source lacks the locator needed to support the wording;
- a visual concept lacks an actual asset page;
- rights are described only as `licensed`, `free`, or `royalty-free`;
- motion is decorative rather than explanatory;
- an evidence URL is treated as permission to publish;
- uncertainty is hidden in narration or editing;
- the claim or asset ledgers are missing; or
- a readiness label outruns the unresolved issue list.
