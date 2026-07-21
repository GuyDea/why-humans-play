# WHP Personal Voice and Viewer Application Design

- **Status:** Approved
- **Approved:** 2026-07-20
- **Date:** 2026-07-20
- **Owner:** Why Humans Play
- **Branch:** `feat/whp-personal-actionable-beats`
- **Related:** `BRAND.md`, `whp-youtube/STEERING.md`,
  `docs/superpowers/specs/2026-07-20-whp-youtube-script-skill-design.md`

## Context

The WHP script skill already requires a useful viewer change, a bounded payoff, and
Martin's natural voice. It does not yet give Martin a reliable place to add an
authentic personal experience, and it does not structurally require a concrete way
for viewers to use the episode's insight.

That leaves two avoidable failure modes:

1. a generated script can sound researched but impersonal, or invent a first-person
   anecdote when no real experience was supplied; and
2. a script can explain something interesting without handing it back to the viewer
   as a safe, evidence-matched way to see or act differently.

The change must solve both problems without forcing autobiographical filler or
turning WHP into generic self-help.

## Goals

1. Give every script one explicit decision about a personal-experience sequence.
2. When personal material is not supplied, generate useful prompts and transitions
   without inventing Martin's experience.
3. Keep personal experience illustrative rather than using it to prove prevalence,
   causality, or a scientific mechanism.
4. Require every script to state a useful viewer change and translate it into one
   evidence-bounded application sequence.
5. Support observation, reflection, or a low-risk experiment when prescriptive
   advice would exceed the evidence.
6. Keep narration extraction, runtime accounting, validator behavior, and the
   portable Agent Skills package deterministic.

## Non-goals

This change will not:

- fabricate, ghostwrite, or infer a personal memory Martin has not supplied;
- require a personal anecdote in the final cut when it does not serve the story;
- treat personal testimony as independent scientific evidence;
- force a behavioral life hack into historical or explanatory topics;
- provide medical, legal, financial, or therapeutic prescriptions;
- require personal photos or other private media; or
- change the skill's name, trigger description, evidence statuses, rights statuses,
  or portable Claude discovery adapter.

## Approaches considered

### 1. Require a finished personal anecdote and action beat in every script

This would make output consistent, but it would pressure the model to fabricate a
memory or force irrelevant autobiography. It also makes an action sound more certain
than the evidence may allow. Reject this approach.

### 2. Require a personal-sequence decision and an evidence-bounded application

Every script carries one structured personal-input block. It is either
`INPUT-REQUESTED`, `COMPLETED`, or `OMIT`. An unresolved block supplies prompts,
bridges, and visual ideas but no invented memory. The final script may omit the
sequence with a story-specific reason.

Every script also carries one structured viewer-application block. Its action can be
a practical experiment, an observation lens, or a reflection question, depending on
what the evidence supports.

This is the selected approach because it makes both decisions explicit without
forcing weak material.

### 3. Add loose prose guidance only

This would be the smallest documentation change, but agents could continue omitting
the sections and the validator could not distinguish a deliberate omission from a
forgotten requirement. Reject this approach.

## Decision

### Make deliverable scope and useful viewer change required headers

Add a `Deliverable` field with exactly two allowed values:

- `FULL-SCRIPT` — a complete episode or complete short script; the personal-input
  and viewer-application contracts apply.
- `TARGETED-ARTIFACT` — an audit, isolated beat, visual plan, or revision excerpt;
  the new blocks are optional unless the assignment includes them, but any block
  that appears must use the exact schema.

This prevents a full-script requirement from being forced into a narrowly requested
asset plan or audit while making assignment scope visible to the validator.

Add a non-empty `Useful viewer change` field to the document header. It must state
what the viewer will be able to notice, understand, decide, or do differently. It is
not a slogan and cannot merely repeat the topic. A targeted artifact may state the
specific inherited viewer change it serves or explicitly say that it does not alter
the parent script's approved change.

The title, thumbnail, viewer promise, useful viewer change, central question,
thesis, application, and payoff must describe one coherent video.

### Require one personal-input block per full script

Exactly one beat must contain this additional subsection:

```markdown
### Personal input
- **ID:** PI-001
- **Decision:** INPUT-REQUESTED
- **Story purpose:** What changes for the viewer because this is personal.
- **Primary prompt:** One specific memory question for Martin.
- **Follow-up prompts:** Two to four concrete recall prompts.
- **Bridge in:** Narration-safe transition into the personal moment.
- **Bridge out:** Narration-safe return to the evidence or next question.
- **Personal visuals:** Optional object, location, photo, screen, or demonstration ideas.
- **Omit when:** The condition under which the sequence should be cut.
```

Use only these decisions:

- `INPUT-REQUESTED` — Martin has not supplied the experience. Provide prompts and
  transitions, but do not write first-person factual content. The beat's narration
  may contain one HTML comment marker such as `<!-- PI-001: Martin input -->`; the
  marker is excluded from narration word counts and extraction.
- `COMPLETED` — Martin supplied and approved the personal material. Integrate the
  actual spoken copy into narration, remove the marker, and update runtime.
- `OMIT` — No authentic personal sequence improves the story. Remove any marker and
  give a story-specific omission reason in `Story purpose` or `Omit when`.

Use one primary personal-sequence decision per full script. Combine competing
memories or omit the weaker option rather than adding more blocks.
`INPUT-REQUESTED` is allowed only in `RESEARCH-DRAFT`; it blocks `EDITORIAL-DRAFT`
and `RECORD-READY`. For `OMIT`, keep every field non-empty and state why the prompts
are not applicable instead of leaving placeholder values.

The block is not filler. It must do at least one real job: create stakes, reveal why
Martin cared, test the episode's claim against experience, surface a misconception,
or show how the insight changed a choice. If removing it changes nothing, mark it
`OMIT`.

### Require one viewer-application block per full script

Exactly one beat, normally the payoff beat, must contain:

```markdown
### Viewer application
- **Insight:** The evidence-bounded idea being handed back.
- **Try:** One low-risk action, observation, or reflection.
- **Observe:** What signal, response, or pattern to notice.
- **Boundary:** When the action does not apply or what it cannot establish.
- **Larger benefit:** How this helps the viewer see, choose, learn, or play more deliberately.
```

The narration must voice the essential application; the subsection is its editorial
contract. The `Try` field does not have to prescribe behavior. For an explanatory or
sensitive topic it may ask the viewer to notice a rule, map incentives, compare two
interpretations, or pose a better question.

Use this progression:

`insight → practical experiment or lens → observable signal → boundary → larger benefit`

An action must not be more confident than its supporting evidence. Do not turn an
animal study, personal anecdote, correlational result, or unverified example into a
human prescription. High-stakes topics require appropriately qualified guidance and
may use an observation-only application.

## Editorial behavior

### Personal experience remains a first-person source

Martin is the source for his own experience. Ask him to confirm names, dates,
chronology, quoted speech, and other externally checkable details that matter to the
story. Label reconstructions. Do not use a personal memory as proof that an effect is
common or causal.

Personal photos, recordings, screenshots, or objects remain separate asset
decisions. Mark them `OWNED` only after ownership, releases, depicted works, private
information, and other component rights are checked. Always offer a presenter-only
or newly created fallback.

### Application remains useful without becoming self-help certainty

The application must connect directly to the episode's supported thesis and final
payoff. It should be specific enough to try or notice, modest enough to be honest,
and meaningful enough to produce the declared useful viewer change.

Avoid generic endings such as “be more mindful,” “use this knowledge,” or “try it
yourself.” Name the situation, the action or lens, and the signal the viewer should
observe. Preserve limitations in spoken copy rather than hiding them in production
notes.

## Format and validator changes

Update the canonical package without adding vendor-specific syntax:

- `SKILL.md` — add personal-input and viewer-application decisions to the mandatory
  workflow and non-negotiable rules.
- `references/story-and-hook-method.md` — define the narrative tests, prompt method,
  and application progression.
- `references/research-and-rights.md` — define personal testimony, factual checks,
  private media, and evidence-matched action boundaries.
- `references/annotated-script-format.md` — add the header and both exact subsection
  schemas.
- `references/quality-rubric.md` — score personal voice and application within the
  existing ten dimensions and add readiness gates; do not create an eleventh score.
- `assets/annotated-script-template.md` — demonstrate an unresolved personal-input
  scaffold and a bounded viewer application without counting annotation text as
  narration.
- `scripts/validate_annotated_script.py` — enforce the new structural contract.
- `scripts/test_validate_annotated_script.py` and package tests — cover the expanded
  contract and portability.

The validator must:

1. require `Deliverable` with the exact `FULL-SCRIPT` or `TARGETED-ARTIFACT` value and
   require non-empty `Useful viewer change` metadata;
2. for `FULL-SCRIPT`, require exactly one `### Personal input` block with all fields
   and an allowed decision; for `TARGETED-ARTIFACT`, validate any block that appears
   without requiring one;
3. require one matching HTML marker for `INPUT-REQUESTED`, exclude it from narration
   extraction and word counts, and reject that decision above `RESEARCH-DRAFT`;
4. reject markers for `COMPLETED` and `OMIT`;
5. for `FULL-SCRIPT`, require exactly one `### Viewer application` block with all
   five non-empty fields; for `TARGETED-ARTIFACT`, validate any block that appears
   without requiring one;
6. preserve all existing header, beat, record, ledger, readiness, CLI, and
   structural-only behavior; and
7. avoid attempting to judge whether a personal memory is true or an application is
   wise, legal, safe, or editorially strong.

## Testing strategy

### RED behavioral baselines

Before editing the skill, run fresh natural assignments that reveal whether the
current package:

1. omits a personal scaffold when no personal story is supplied;
2. invents first-person material instead of requesting input;
3. ends with information but no usable viewer application; or
4. gives advice more confidently than the evidence allows.

Retain exact raw outputs or compact hashes and score them without showing evaluators
the intended fix.

### Deterministic RED/GREEN tests

Add failing mutations for:

- missing, blank, or invalid `Deliverable` and valid targeted-artifact paths;
- missing or blank `Useful viewer change`;
- missing, duplicate, malformed, or empty personal-input fields;
- invalid personal decisions;
- missing or mismatched `INPUT-REQUESTED` markers;
- an unresolved personal marker in `EDITORIAL-DRAFT` or `RECORD-READY`;
- a marker remaining after `COMPLETED` or `OMIT`;
- missing, duplicate, malformed, or empty viewer-application fields; and
- narration extraction and word-count behavior around HTML markers.

Keep valid fixtures for all three personal decisions. Re-run schema validation, the
worked asset, Claude symlink tests, content scans, and the complete suite.

### Forward evaluation

After GREEN, use fresh agents on at least these cases:

1. no personal details supplied — request authentic input and provide useful hints;
2. a supplied personal experience — integrate it without treating it as scientific
   proof;
3. a topic where autobiography adds nothing — choose `OMIT` with a real reason;
4. an ordinary WHP topic — give a concrete, bounded action;
5. a sensitive or weak-evidence topic — use an observation-only application; and
6. unrelated copywriting — do not activate the skill.

Every applicable output must preserve the existing evidence, visual, rights,
animation, reference, runtime, and assignment-adherence gates.

## Acceptance criteria

The change is complete when:

- every `FULL-SCRIPT` produces one explicit personal-sequence decision without
  inventing Martin's experience, while a `TARGETED-ARTIFACT` is not forced to add
  out-of-scope material;
- an unresolved personal insert provides specific prompts, bridges, and visual hints;
- every document states a useful viewer change and every `FULL-SCRIPT` includes one
  evidence-bounded viewer application;
- the worked template demonstrates both structures;
- the validator enforces their syntax and readiness implications while disclaiming
  semantic judgment;
- deterministic tests pass after a demonstrated RED phase;
- fresh behavioral evaluations pass without leaked expected answers;
- Claude continues to resolve the same canonical package through the relative
  symlink; and
- no unrelated repository or worktree content changes.
