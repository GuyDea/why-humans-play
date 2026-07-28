# Run Progress Transport Manifest

This manifest is owned by the `choosing-whp-video-topic` skill and versions the
machine transport of the required progress checklist for callers that render a live
run (for example the local Script Creator workbench). It adds no editorial method: it
is a serialization of the checklist this skill already mandates.

When a caller's envelope requests `progress_transport: "WHP_PROGRESS/4"`, emit one
single-line agent message per state change:

```text
WHP_PROGRESS/4 <id> <pending|active|done|unknown> :: <skill-authored text>
```

At run start emit every row as `pending`. `unknown` must state its impact after `::`.
The `<skill-authored text>` is the checklist item's own wording; callers render it
verbatim and never rewrite, merge, or split rows.

## Version 4 row identities

One row per required checklist item, in the checklist's order. The count and order
are normative: when the checklist in `SKILL.md` changes, this manifest changes in the
same edit and the version increments.

| id | checklist item |
|---|---|
| 01-frame | Record the decision frame and current WHP context. |
| 02-mode | Select and state the evidence mode. |
| 03-signals | Collect independent audience-demand, competitive-supply, and timing signals. |
| 04-pool | Record at least 30 distinct, diverse subjects before ranking. |
| 05-angle-development | Complete the routed audience-language and subject-to-angle development for every promising raw subject. |
| 06-proof-cases | Identify a first-hearing opening proof case and any needed current echo for each finalist. |
| 07-gates | Audit every advancing angle against all six hard gates. |
| 08-shallow | Run a shallow scan and narrow to roughly 8–12 candidates. |
| 09-deep | Deeply research the finalists with multiple signals. |
| 10-shortlist | Rank a shortlist of roughly five with the required scorecard. |
| 11-packages | Test three package promises for each top-three finalist. |
| 12-winner | Resolve winner status: select exactly one final topic only with at least two responsibly supported, winner-eligible finalists; otherwise return the required incomplete result. |
| 13-audit | Complete the output and evidence audit. |

Versions 1 (twelve rows, caller-authored ids), 2 (thirteen rows, before the
painpoint-comparison step), and 3 (fourteen rows with separate painpoint and angle
development steps) are retired; callers must not emit or expect them.
