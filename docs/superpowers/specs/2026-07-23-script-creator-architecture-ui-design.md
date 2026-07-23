# Script Creator — Architecture Stage Design Amendment

**Date:** 2026-07-23
**Status:** Accepted 2026-07-23
**Scope:** The focused design amendment required by the technical design's
"Architecture-first amendment boundary" (2026-07-23): the app contract for the script
architecture stage — field schema, operations, editor model, persistence, approval
transition, codec, and canonical Markdown location. Implements the "Approve script
architecture before narration" decision inside the workbench. Implementation lands as
the first block of Plan 6.

## Decision

The draft lifecycle gains an **architecture phase** between topic handoff and rapid
prototyping. The architecture is a section-structured artifact (the skill's nine fixed
sections), edited per-section with agent operations at section grain, approved as a
whole by an explicit action that writes a canonical repo Markdown milestone and unlocks
episode-scale narration. The skill already owns all editorial rules for this stage
(`references/script-architecture.md`); the app adds only transport, storage, UI, and
the gate.

## Lifecycle and gating

- `creativeStatus.phase`: `architecture` → `rapid-prototype` → (existing flow). Topic
  handoff now creates drafts at phase `architecture`.
- While phase is `architecture`: episode-scale narration operations
  (`generate-episode`) and Promote are disabled with an explanatory callout; scoped
  narration operations remain available only for drafts that already contain narration
  (imported episodes), matching the skill's routing.
- **Approve architecture** is a distinct explicit action (like the narration approval
  gate, same doctrine style): it freezes the current architecture as the approved
  baseline, sets phase to `rapid-prototype`, writes the canonical milestone, and moves
  the pipeline row. The narration approval gate is unchanged and still separately
  required before Promote.
- After approval, every narration-generation envelope for the draft carries the
  approved architecture verbatim as supplied context (`approved_architecture_md`) — the
  skill expects it as the content baseline. Editing the architecture after approval
  requires an explicit "Reopen architecture" confirm that reverts the phase and marks
  existing narration as needing reconciliation (flag, not deletion).

## Artifact model

- Stored on the draft: `architecture: { sections: [{ key, title, md }], approvedMd:
  string | null, approvedAt: string | null }` in the existing drafts store (the next
  global schema version in the centralized migration sequence — v5 as of Plan 5,
  which took v4 for gate-check persistence); revisions of the architecture append to the existing revision history with a
  `kind: 'architecture'` discriminator.
- The nine section keys/titles are fixed constants mirroring the skill reference
  (package-and-audience, central-question, core-answer, belief-shift, insight-ladder,
  phenomenon-map, earned-reframe, evidence-map, practical-payoff, final-lesson — the
  reference's exact order; splitter is mechanical on the `###` headings the skill
  emits). Unrecognized extra sections round-trip opaquely, same philosophy as the
  narration codec.
- Canonical Markdown: `whp-youtube/architectures/<slug>.md` (new whitelisted CAS
  artifact path — repo-layout addition to record in the ledger on acceptance), written
  at approval: the joined sections verbatim plus a small header (title, date, approved
  status). Re-approval overwrites via CAS with conflict surfacing.

## Operations (registry additions; all read-only sandbox; skill unchanged)

| Operation | Class | Result | Inputs (provenance-pure) |
|---|---|---|---|
| `generate-architecture` | episode | raw Markdown artifact | topic brief, approved lessons, user constraints |
| `review-architecture` | scoped | schema findings `{section_key, severity, finding_markdown}` | full architecture md, brief |
| `rewrite-architecture-section` | scoped | schema `{replacement_markdown}` | section key+md, full architecture md as context, brief, user instruction |

`generate-architecture` results parse into sections (mechanical splitter) and land as a
reviewable proposal per section (accept-all or per-section accept), never a silent
overwrite. `review-architecture` findings pin to sections in the UI.
`rewrite-architecture-section` uses the same proposal accept/reject flow scoped to one
section. Resume rules follow the scoped class (≤3).

## UI

A third studio region on the draft page (before the narration editor in reading order):
the **Architecture panel** — section cards with rendered Markdown, per-section actions
(Refine with instruction, Review findings pin here), artifact-level actions (Generate
from brief, Review all, Approve architecture / Reopen), an approval status ribbon, and
the gating callout on narration actions while unapproved. Composition spec from day one
(Plan 4 F3 law): the real routed draft page with a stub client drives generate → section
proposals → accept → refine one section → approve → narration unlock → milestone write
call.

## Pipeline

New column `architecture` between `selected` and `prototyping`; handoff moves cards to
`architecture`; approval moves them to `prototyping` (the existing upsert covers it).

## Out of scope (unchanged from the boundary note)

Inline selection-grade editing inside sections (section grain is the V1 grain);
architecture-specific locks/variants; any editorial validation of section content
app-side (the skill reviews; the app only splits/joins mechanically).

## Reconciliation on acceptance

Requirements: the architecture stage is already required by the 2026-07-23 amendment;
this document supplies the deferred contract. Technical design: replace the boundary
note with a pointer here. Ledger: one entry recording acceptance and the
`whp-youtube/architectures/` layout addition. Plan 6 gains the implementation block as
its first tasks.
