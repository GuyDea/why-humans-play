# WHP YouTube Script Skill Design

- **Status:** Accepted
- **Date:** 2026-07-20
- **Owner:** Why Humans Play
- **Branch:** `feat/whp-youtube-script-skill`
- **Related:** `BRAND.md`, `whp-youtube/STEERING.md`

## Context

Why Humans Play needs a repeatable way to turn a video idea into a rigorous,
story-led, production-ready YouTube script. Existing channel documents establish
the brand and editorial strategy, but they do not provide an executable workflow
that consistently:

- embeds real-world facts in narrative scenes instead of stating isolated trivia;
- verifies claims without discarding every useful but imperfect online account;
- pairs important claims with concrete visual evidence or an explanatory visual;
- distinguishes evidence links from visual-asset links and publication rights;
- gives animation and edit direction at the point where it is needed; and
- leaves a complete reference trail after the script.

A baseline generation without a dedicated skill produced appealing narration and
motion ideas, but it altered the meaning of a seal-mortality statistic, supplied
visual concepts rather than usable asset links, and did not record rights status.
The skill must close those gaps without turning the script into a legal memo or an
academic paper.

## Goals

Create a repository-scoped, Agent Skills-compatible skill that can:

1. Generate or substantially revise long-form WHP YouTube scripts.
2. Read and obey the canonical brand and channel steering documents.
3. Research claims before drafting and record confidence, caveats, and approved
   wording.
4. Prefer a source-grounded real-world micro-story as the opening when it is the
   strongest way to fulfill the title and thumbnail promise.
5. Produce one Markdown source of truth containing clean narration and adjacent
   production notes for visuals, source materials, animation, editing, audio, and
   accessibility.
6. End every script with complete evidence and visual-source ledgers.
7. Validate the document structure and readiness claims deterministically.
8. Improve through before/after evaluations on realistic WHP assignments.
9. Run from Codex, Claude Code, and other compatible agent clients without changing
   its editorial workflow or maintaining divergent copies.

## Non-goals

The first version will not:

- render animation or edit finished video;
- download, archive, or license third-party assets;
- provide legal advice or declare fair use legally settled;
- mechanically predict a retention curve or promise virality;
- require a different picture for every sentence;
- replace human fact, rights, or editorial review; or
- guarantee identical output or tool access across different models and clients; or
- generate unrelated social posts, thumbnails, or general-purpose marketing copy.

It may propose actual source materials and direct links, but asset acquisition and
rendering remain production steps outside this skill.

## Constraints and Premise Audit

### Viewer outcome over retention tricks

YouTube describes content performance through appeal, engagement, and satisfaction
and recommends that an opening immediately fulfill the title and thumbnail promise.
The skill will optimize for a clear viewer promise, sustained value, and a satisfying
payoff rather than fixed re-hook intervals or universal retention thresholds.

Sources:

- [YouTube content-performance guidance](https://support.google.com/youtube/answer/16559650?hl=en)
- [YouTube recommendation-system guidance](https://support.google.com/youtube/answer/16533387?hl=en)
- [YouTube audience-retention guidance](https://support.google.com/youtube/answer/9314415?hl=en)

### Real-world fact as narrative, not formula

Narrative presentation can improve comprehension and recall, but no evidence proves
that every YouTube video must open with a micro-story. The skill will actively seek
real events, observations, experiments, or recognizable situations and score them for
relevance, surprise, stakes, visuality, evidence, and payoff. It will use a fact-led
micro-story only when it directly creates the episode's central question and fulfills
the packaging promise. A direct demonstration or direct explanation remains valid
when stronger.

Every factual scene detail must be sourced. The skill must not invent weather,
dialogue, motives, thoughts, chronology, or sensory detail to make a true claim feel
cinematic.

Research basis:

- [Mar et al., narrative versus expository comprehension meta-analysis](https://doi.org/10.3758/s13423-020-01853-1)

### Visual support is conditional, not compulsory decoration

Important facts need a visual decision, not necessarily a unique third-party asset.
The allowed treatments are authentic evidence, archival material, diagram, example,
reenactment, on-camera demonstration, restrained text, or intentionally no added
visual. Representational and organizational visuals are useful; irrelevant or merely
decorative detail can distract.

Animation must state what motion reveals: temporal change, causality, spatial
transformation, scale, comparison, or an evidence trail. If a still communicates the
same relationship as well, use the still.

Research basis:

- [Schneider et al., signaling meta-analysis](https://www.sciencedirect.com/science/article/pii/S1747938X17300581)
- [Hoffler and Leutner, animation meta-analysis](https://doi.org/10.1016/j.learninstruc.2007.09.013)
- [Sundararajan and Adesope, seductive-details meta-analysis](https://eric.ed.gov/?id=EJ1263249)

### Online discovery is allowed; confidence controls wording

Search engines, social posts, news articles, archives, personal pages, and reposts may
surface useful material. Google is a discovery mechanism, not the final source. The
skill must trace material to the earliest practical originating page, identify who
made the claim, cross-check it, and assign a confidence status.

Absence of obvious fabrication is not enough to present an account as established
fact. It is enough to retain the material as an attributed, explicitly unverified
example when it is relevant and not contradicted.

### Evidence and publication rights are separate

A paper may verify a claim without granting the right to reproduce its figure. An
online photograph may illustrate a story without being reliable evidence for it.
Credit alone does not grant publication rights. The skill must maintain separate
claim and asset records and use explicit rights statuses rather than `free`,
`royalty-free`, `found online`, or `from Google`.

Sources:

- [Creative Commons attribution guidance](https://wiki.creativecommons.org/wiki/Best_practices_for_attribution)
- [Wikimedia Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)
- [YouTube fair-use guidance](https://support.google.com/youtube/answer/9783148?hl=en)

### Production notes stay adjacent to clean narration

Professional shooting-script guidance aligns what viewers hear with what they see and
may add a third animation/editor column. Raw Markdown tables become brittle with long
narration, links, caveats, and rights metadata. The canonical format will therefore
use stacked beat blocks with stable IDs. Narration remains clean enough to extract for
a table read or teleprompter, while production notes remain inside the same document.

Source:

- [AHRQ shooting-script guidance](https://www.ahrq.gov/sites/default/files/wysiwyg/research/publications/pubcomguide/Shooting-Script-How-to.pdf)

## Decision

### Portable core and discovery adapters

The skill itself will follow the open Agent Skills specification: a portable folder
with a standards-compliant `SKILL.md`, relative resource links, and optional
`scripts/`, `references/`, and `assets/`. Instructions will describe capabilities
such as searching, reading project files, and running a validator rather than naming
Codex-only or Claude-only tools. Vendor extensions must not be required to execute
the editorial workflow.

Keep the single canonical package at:

```text
.agents/skills/writing-whp-youtube-scripts/
```

Expose that same directory to Claude Code with a committed relative directory
symlink at:

```text
.claude/skills/writing-whp-youtube-scripts
```

Claude Code officially follows project-skill directory symlinks in version 2.1.203
and later. On a filesystem or Git checkout that cannot preserve symlinks, copying
the canonical directory into the client's project skill location is the documented
installation fallback; the repository will not maintain two editable copies.

Other Agent Skills-compatible clients can consume the canonical folder through
their own discovery path. A raw language-model API does not discover filesystem
skills by itself; its agent host must load `SKILL.md` and make the required research
and file capabilities available.

Sources:

- [Agent Skills specification](https://agentskills.io/specification)
- [Claude Code skills documentation](https://code.claude.com/docs/en/slash-commands)
- [OpenAI build-skills documentation](https://learn.chatgpt.com/docs/build-skills)

### Package structure

Use this structure for the canonical package:

```text
writing-whp-youtube-scripts/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── assets/
│   └── annotated-script-template.md
├── references/
│   ├── annotated-script-format.md
│   ├── quality-rubric.md
│   ├── research-and-rights.md
│   └── story-and-hook-method.md
└── scripts/
    └── validate_annotated_script.py
```

`SKILL.md` will contain the concise mandatory workflow and routing instructions.
Detailed methods will load only when needed. The Markdown template is an output asset.
The validator exists only for deterministic structural checks.

`agents/openai.yaml` is optional OpenAI presentation metadata. It may improve the
Codex experience, but the core `SKILL.md`, assets, references, scripts, and workflow
must remain complete without it. Claude Code and other clients may ignore it.

## Workflow

### 1. Establish the assignment

Read `BRAND.md` first and `whp-youtube/STEERING.md` second. Identify:

- episode mode;
- core and potential viewer;
- recognizable human problem or curiosity;
- one-sentence viewer promise;
- proposed title and thumbnail promise;
- central question and answer;
- useful change in how the viewer sees or acts;
- target runtime and production constraints; and
- final payoff.

Do not draft until the title, thumbnail promise, opening, and payoff describe the same
video.

### 2. Build the evidence packet

Extract candidate claims and research each one. Prefer original studies, datasets,
official records, and direct statements. Search for corroboration, contradiction,
scope, date, and context. Preserve the exact wording the evidence supports.

Assign one status:

- `VERIFIED`: primary source or authoritative record supports the wording.
- `CORROBORATED`: multiple independent credible sources agree.
- `REPORTED`: one identifiable and plausible source; attribute in narration.
- `UNVERIFIED-EXAMPLE`: provenance or corroboration is incomplete; use only as an
  explicitly qualified illustration, not evidence of prevalence or causality.
- `DISPUTED`: credible sources conflict; present the conflict or omit the claim.
- `REJECTED`: fabricated, materially misleading, or contradicted; do not use.

Natural narration must match status:

- `VERIFIED`: `The experiment found...`
- `CORROBORATED`: `Multiple investigations found...`
- `REPORTED`: `According to a 2019 report...`
- `UNVERIFIED-EXAMPLE`: `There is an unconfirmed account that...`
- `DISPUTED`: `Researchers disagree about...`

### 3. Choose the opening

Generate three candidate openings. For each, identify the scene, action, disruption,
fact reveal, contradiction, driving question, evidence status, visual anchor, and
payoff connection. Recommend the strongest candidate, but do not force a micro-story
when it delays or obscures the promise.

### 4. Build the narrative spine

Outline beats as changes in understanding, not topic headings. Each beat must state:

- what the viewer now understands;
- what changed from the previous beat;
- which question it pays off;
- which question or consequence naturally follows; and
- why it is necessary to the final answer.

Open loops must be specific and paid off. Caveats should advance the inquiry rather
than appear as defensive footnotes.

### 5. Write for speech

Write conversational, pronounceable narration with controlled information density.
Read aloud, time, and revise it. Preserve Martin's voice and WHP's rigor instead of
imitating another creator.

### 6. Add production treatment

For each beat, specify visual treatment, asset IDs, motion/edit purpose, on-screen
text, source display, audio, and essential accessibility information. Locate actual
candidate source materials when practical. Never call an asset cleared without an
identified rights basis.

### 7. Audit and validate

Run separate passes for:

- title/thumbnail promise and final payoff;
- factual wording and confidence status;
- invented narrative detail;
- spoken-language flow and runtime;
- visual relevance and species/person/item accuracy;
- animation purpose and feasibility;
- asset provenance and rights status;
- complete end references; and
- structure through the validator.

## Annotated Script Contract

Every generated script must contain:

### Header

- status and version;
- target runtime and word count;
- audience and episode mode;
- title and thumbnail promise;
- viewer promise;
- central question, thesis, and payoff;
- evidence-review status; and
- rights-review status.

### Beat blocks

Each beat must have a stable ID and contain:

```md
## Beat 01 — Descriptive name
_Time: 00:00–00:18 · Target: ~42 words_

### Narration
> Clean spoken copy.

### Story function
What changes for the viewer and which promise or question this serves.

### Claims
- `F-001` — Short claim label and confidence status.

### Visual
- Treatment and `A-001` asset reference.
- Fallback if the preferred material cannot be used.

### Motion / edit
- Exact reveal, transition, comparison, or movement.
- Animation purpose: what motion makes easier to understand.

### On-screen text
- Minimal labels, numbers, quotation, and compact citation.

### Audio / accessibility
- Music or sound cue.
- Essential visual information needed in a descriptive transcript.

### Assets
- `A-001` — Intended use and rights status.
```

### End references

The same document must end with `References and source materials`, containing:

1. **Evidence references** keyed by fact ID.
2. **Visual and archival sources** keyed by asset ID.
3. **Unverified or disputed material** with checks performed and remaining limits.
4. **Attribution copy** for assets that require it.

A claim record must include exact claim, original URL, source/author, date, precise
page/table/timestamp locator when available, accessed date, scope, cross-checks,
contradictions, status, caveat, and approved wording.

An asset record must include original asset page, direct production file when known,
creator/rightsholder, rights basis, license and version, commercial-use and adaptation
terms, planned changes, required attribution, intended beat, accessed date, and status.

Allowed asset statuses include:

- `OWNED`
- exact `CC-*` license and version
- `CC0`
- `PUBLIC-DOMAIN` with stated basis and jurisdiction
- `PERMISSION-ON-FILE`
- `COMMERCIAL-LICENSE`
- `FAIR-USE-CANDIDATE-NOT-CLEARED`
- `REFERENCE-ONLY-RIGHTS-UNVERIFIED`
- `UNKNOWN-BLOCKED`

## Readiness States

- `RESEARCH-DRAFT`: may contain unresolved claims and asset candidates.
- `EDITORIAL-DRAFT`: narration and story approved; unresolved items are explicit.
- `RECORD-READY`: no rejected claims, no unqualified unverified claims, complete
  evidence records, and every required visual has either a usable treatment or an
  explicit production fallback. `REFERENCE-ONLY` assets may remain only when they are
  not required for the planned final cut.
- `PICTURE-LOCKED`: outside the skill's first-version responsibility.

The skill must never promote its own output to `RECORD-READY` solely because the
validator passes.

## Deterministic Validator

`validate_annotated_script.py` will check only what a program can establish reliably:

- required header fields and end sections exist;
- beat IDs are unique and ordered;
- each beat contains narration, story function, visual, and motion/edit sections;
- every referenced fact ID has one evidence record;
- every referenced asset ID has one asset record;
- each animation note states an explanatory purpose or explicitly chooses no
  animation;
- required URLs use `http://` or `https://`;
- statuses use the allowed vocabulary;
- word-count and runtime estimates are present; and
- a document labeled `RECORD-READY` contains no structurally unresolved or blocked
  dependencies.

It will not verify factual truth, source trustworthiness, copyright ownership, fair
use, or whether a visual is aesthetically effective. Its output must say so.

## Alternatives Considered

### Two- or three-column Markdown A/V table

This mirrors conventional production scripts but is hard to edit in raw Markdown when
narration, links, caveats, animation direction, and rights metadata grow. It may be an
export format later, not the canonical source.

### Clean script plus separate production bible

This protects narration readability but makes synchronization fragile and invites
source or rights notes to drift away from the exact line they support.

### Unstructured inline parentheticals

This is fast for ideation but pollutes table reads, prevents reliable validation, and
mixes evidence, visuals, rights, and editor direction.

The stacked beat format preserves synchronization without sacrificing clean spoken
copy.

## Verification Strategy

Skill development will follow baseline, implementation, and forward-test cycles.

### Baseline failures to correct

The no-skill baseline must be treated as evidence of these failure modes:

- a statistic changed meaning during narrative compression;
- evidence citations were supplied without precise claim locators;
- visual concepts were supplied without actual asset-page links;
- rights were described vaguely as `licensed` rather than recorded; and
- animation was attractive but not consistently tied to explanatory purpose.

### Forward-test scenarios

Test at least:

1. A new `Hidden Game` episode based on an everyday human situation.
2. A `Why We Play` science episode containing contested or qualified evidence.
3. A revision of the existing evolutionary-paradox draft.
4. An online anecdote that cannot be fully corroborated.
5. An asset found through image search with unclear rights.
6. A request for unrelated copy that should not implicitly trigger the skill.

Evaluate triggering, brand fidelity, promise alignment, factual precision, narrative
momentum, spoken quality, visual usefulness, animation purpose, reference completeness,
rights honesty, and readiness labeling.

Run the same representative generation and revision prompts through every locally
available compatible client. At minimum, perform a static portability audit that
rejects required vendor-specific commands, absolute skill paths, unsupported
frontmatter, and references that escape the canonical package. If Claude Code is
installed at a version that supports directory symlinks, verify discovery and one
end-to-end prompt there. Record unavailable clients as untested rather than claiming
behavior that was not observed.

### Automated checks

- Run the skill creator's `quick_validate.py`.
- Test the annotated-script validator first against failing fixtures, then passing and
  edge-case fixtures.
- Run Markdown link and placeholder scans where tooling permits.
- Confirm `agents/openai.yaml` matches the final skill and declares no unavailable
  dependencies.
- Validate the canonical package against the Agent Skills schema.
- Resolve the Claude Code discovery symlink and confirm it reaches the canonical
  package without duplicating files.
- Scan the core workflow for required Codex- or Claude-specific tool names and
  absolute local paths.

## Security, Legal, and Operational Consequences

- The skill may send research queries to the public web; it must not upload private or
  licensed project materials without authorization.
- Online discovery can surface misinformation, manipulated media, or license
  laundering. Provenance and confidence fields expose rather than eliminate that risk.
- Rights statuses are production tracking, not legal conclusions.
- Detailed annotated scripts cost more research and production time. Classification of
  hero, supporting, and incidental facts will keep treatment proportional.
- The repository owns channel-specific doctrine; the skill reads canonical documents
  instead of duplicating them, limiting drift.

## Acceptance Criteria

The design is implemented when current branch evidence proves all of the following:

1. The repo-scoped skill exists at the decided path and passes schema validation.
2. The canonical package follows the Agent Skills specification, uses portable core
   instructions, and is exposed to Claude Code without a second editable copy.
3. Its trigger description covers WHP long-form scripting and revision without claiming
   unrelated writing tasks.
4. It reads brand and channel steering in the required order.
5. It implements the confidence ladder and status-matched narration.
6. It distinguishes evidence, visual provenance, and publication rights.
7. It produces stacked annotated beat blocks and complete end references.
8. It includes a realistic output template showing the intended final format.
9. Its validator was developed test-first and correctly handles valid, invalid, and
   record-ready documents.
10. Independent before/after tests show material improvement over the captured baseline
   on the stated failure modes.
11. Portability checks pass, and any client not exercised end to end is explicitly
    recorded as untested.
12. All required checks pass, diffs are reviewed, and no unrelated user work changes.

## Deferred Follow-ups

- Actual asset downloading and rights-document archiving.
- Automatic narration-only or two-column PDF exports.
- Programmatic animation rendering.
- Integration with audience-retention analytics after the channel has published enough
  videos to provide meaningful first-party data.
