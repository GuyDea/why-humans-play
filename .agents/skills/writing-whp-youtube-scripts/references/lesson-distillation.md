# Lesson Distillation Method

This reference governs the **Distill session lessons** operation only. It turns a
supplied log of Martin's explicit decisions into proposed lessons for his review. It
adds no scripting method, and no other operation may borrow from it.

## What you receive

- `decisions`: an ordered array of decision records. Each carries a stable decision ID,
  the kind of explicit human disposition (proposal accepted / rejected / re-rolled,
  variant picked, gate action, package picked, winner handed off, personal input
  integrated, validator-fix cycle accepted), the resolved context (operation inputs and
  result, before/after diff where one exists), and Martin's optional "why" note.
- `existing_lessons`: every prior lesson with its current state (proposed, approved,
  rejected, retired, superseded) and scope. Never re-propose, duplicate, or contradict a
  lesson in this list; if new evidence genuinely replaces an approved lesson, propose a
  replacement that names it in `supersedes_lesson_id`.

## Judgment rules

- **Only Martin's explicit dispositions are preferences.** An agent completing an
  operation, a gate result, a generated package direction, or a validator pass is
  surrounding evidence, never a preference by itself.
- **A lesson must be earned by the evidence.** Cite the exact supporting decision IDs in
  `evidence`; do not cite decisions that merely occurred nearby. One decision may
  justify a narrow taste note; a durable-doctrine candidate needs a repeated,
  consistent pattern across decisions. When the evidence is thin, contradictory, or
  explainable by circumstance, propose nothing for it — respond with a narrowed or
  declined guardrail rather than fabricating a lesson.
- **Classify by reach, not confidence.** `episode-local` marks taste bound to the
  episode at hand (its voice, this topic's framing, a one-off constraint).
  `durable` marks a channel-level editorial doctrine candidate that should outlive the
  episode. When genuinely unsure, prefer `episode-local`; durable doctrine is the
  costlier claim.
- **Write lessons as observations of Martin's preference, in plain declarative
  prose** (`lesson_markdown`), with the reasoning that connects the cited decisions to
  the lesson (`rationale_markdown`). Do not write imperatives aimed at the app, and do
  not restate rules that already exist in the skills or steering files.
- `proposed_target` is a nonbinding routing hint naming the repository doctrine surface
  a durable candidate most plausibly belongs to (or null, and always null for
  episode-local lessons). The `reconcile-whp` impact map remains authoritative for
  where durable doctrine actually lands.

## Output contract

Return the strict result frame `{status, lessons, guardrail_markdown}`. Each lesson
carries exactly these six fields:

| field | meaning |
|---|---|
| `classification` | `episode-local` or `durable` — the only two values. |
| `lesson_markdown` | The proposed lesson, self-contained prose. |
| `rationale_markdown` | Why the cited decisions support it. |
| `evidence` | Array of the exact supporting decision IDs supplied to you. |
| `proposed_target` | Nonbinding doctrine-surface hint for durable candidates; null otherwise. |
| `supersedes_lesson_id` | The existing lesson this replaces, or null. |

## Boundaries

- Propose; never apply. Lessons take effect only after Martin approves them in review.
- Durable application belongs exclusively to the `reconcile-whp` flow — never instruct
  the application, and never attempt yourself, to edit a skill file, a steering file,
  or the decision ledger from this operation.
- This operation is read-only: no repository write, no document edit, no side effect.
