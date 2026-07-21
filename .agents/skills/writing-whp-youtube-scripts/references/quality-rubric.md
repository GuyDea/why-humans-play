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
  misleading, or the payoff does not resolve it.
- **1:** The components address the same topic, but the viewer promise is delayed,
  vague, overbroad, or only partially paid off.
- **2:** The title, thumbnail promise, opening question, central answer, and final
  payoff create one clear and explicitly resolved contract.

### 2. Factual precision and status-matched wording

- **0:** A material claim is unsupported, rejected, materially overstated, or voiced
  more confidently than its status permits. When a viewer application is in scope, it
  also scores 0 if it prescribes more than the evidence can establish.
- **1:** Core claims are supportable, but a scope term, denominator, causal boundary,
  caveat, attribution, or approved wording needs revision.
- **2:** Every material narration claim preserves scope and causality, uses approved
  or weaker wording, and audibly matches its confidence status. When a viewer
  application is in scope, its action, observation, or reflection audibly preserves
  the same population, causal, confidence, and applicability limits as its supporting
  evidence.

### 3. Story momentum without invented details

- **0:** The narrative depends on invented dialogue, motives, thoughts, feelings,
  weather, chronology, sensory detail, or misleading reconstruction. First-person
  material is invented, forced, or used as proof.
- **1:** The sequence is honest and usable, but includes a stalled beat, trivia
  detour, weak consequence, vague loop, or scene that needs clearer attribution.
- **2:** Each beat changes viewer understanding, causes the next question, and builds
  momentum without invention; reconstructions and reenactments are unmistakable. When
  personal input is in scope, the work makes one explicit personal decision, uses only
  authentic supplied material, and the sequence performs necessary narrative work or
  gives a specific reason for `OMIT`.

### 4. Spoken quality and credible runtime

- **0:** The narration is unperformable, substantially mistimed, or dominated by
  written-language constructions and uncontrolled density.
- **1:** An aloud read is understandable and near target, but stumbles, overloaded
  sentences, abrupt caveats, or runtime drift remain.
- **2:** The narration has been read aloud and honestly timed; it is conversational,
  pronounceable, paced, and credible for the stated runtime.

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

- **0:** The script uses hype, woo, fabricated shock, shallow self-help certainty,
  childish framing, or product promotion that displaces the inquiry. The useful viewer
  change is missing, generic, or unsupported; or an in-scope application is missing,
  generic, or unsupported.
- **1:** The piece is broadly on-brand but lacks a clear hidden-game/play lens,
  useful viewer change, steelmanned caveat, grounded tone, or Martin's natural voice.
- **2:** The script makes a hidden game or the nature of play legible, changes how the
  viewer can see or act, and stays rigorous, useful, grounded, human, and
  non-promotional. The declared change and WHP lens form one grounded payoff; when a
  viewer application is in scope, its voiced application, observable signal, boundary,
  and larger benefit form part of that same payoff.

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

Require the `EDITORIAL-DRAFT` gate and all of the following:

- renewed final approval by an authorized human editor after evidence, rights, and
  production dependencies are closed;
- complete readiness under
  [Annotated Script Format](annotated-script-format.md#record-ready-gate);
- completed evidence and rights review;
- substantive human confirmation that each planned Creative Commons use is
  compatible with its license terms;
- no `REJECTED` claims;
- no uncertainty voiced without the qualification required by its status;
- no `INPUT-REQUESTED` personal block or unresolved input marker;
- no blocked required asset; and
- no failed, missing, or unusable fallback for a required visual.

Treat these as two distinct approval moments. The first accepts narration and story
direction for `EDITORIAL-DRAFT` while unresolved work remains documented. The second
rechecks the final script only after evidence, rights, and production dependencies
are closed; never carry the earlier approval forward automatically.

A versioned `CC-*` status records a license, not clearance of the planned use. If NC
conflicts with monetized or commercial use, or SA/attribution obligations cannot be
met, change the treatment or require a usable fallback. Treat crop, excerpt, overlay,
animation, and similar modification under an ND license as mandatory human-review
triggers. When the planned treatment constitutes or may constitute Adapted Material
under the applicable ND license, prohibit `RECORD-READY` unless permission or a
non-adapted compliant treatment or usable fallback exists. Treat this as substantive
human review beyond structural validation. Refer license interpretation to an
authorized rights reviewer or counsel; this rubric does not provide legal advice and
the validator does not decide compatibility.

Treat human approval and substantive review as requirements, not score bonuses. A
total score never overrides a hard gate. A validator pass never promotes readiness;
it confirms structure only.

## Run separate final audit passes

Run each pass independently so one kind of fluency does not conceal another kind of
failure. Apply each pass only to the assigned or inherited scope; for a targeted
artifact, record parent-script issues without inserting or scoring out-of-scope content:

1. **Promise and payoff:** Compare title, thumbnail, first seconds, central question,
   useful viewer change, and final answer word for word. When application is in scope,
   also compare its voiced application, observable signal, boundary, and larger benefit.
2. **Factual wording and confidence:** Compare narration with each exact claim,
   approved wording, status, scope, and caveat. When application is in scope, confirm
   that its action, observation, or reflection preserves those evidence limits.
3. **Story and personal authenticity:** Challenge dialogue, chronology, motives,
   thoughts, feelings, weather, sensory detail, and reconstruction labels. When personal
   input is in scope, verify one explicit decision, supplied-and-approved material,
   necessary narrative work or a specific `OMIT` reason, and no invented first-person
   detail.
4. **Spoken flow and runtime:** Read aloud, time the narration, and revise density,
   pronunciation, transitions, and breaths.
5. **Visual relevance and identity accuracy:** Verify that each visual advances its
   claim and depicts or labels the correct person, species, item, place, and date.
6. **Animation purpose and feasibility:** Confirm explanatory purpose, one cued
   relationship, resolved state, production feasibility, and whether a still is
   clearer.
7. **Provenance and rights:** Trace every external asset to its original page,
   rightsholder, exact terms, intended changes, status, and fallback. When personal
   media is in scope, review it separately for ownership, releases, depicted works,
   privacy, component rights, and an ownable fallback.
8. **Complete references:** Check claim and asset IDs, required fields, locators,
   URLs, access dates, contradictions, attribution copy, and unresolved material.
9. **Accessibility:** Check captions, descriptive transcript notes, text density,
   contrast, color independence, pacing, and narration of essential relationships.
10. **Readiness label:** Reapply the score threshold, protected-dimension rules,
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
