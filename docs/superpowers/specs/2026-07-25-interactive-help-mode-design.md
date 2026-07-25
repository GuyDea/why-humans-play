# Interactive Help Mode Design

**Date:** 2026-07-25
**Status:** Approved design; implementation pending written-spec review
**Scope:** Script Creator Angular app — the Help drawer and per-page contextual help

## Decision

Extend the existing Help drawer from a static, page-level blurb plus a shared glossary
into an **interactive Help mode**. Opening Help puts the current page into Help mode:
every documented region gains a subtle dashed outline and a `?` affordance on its header.
Clicking a region's header switches the drawer's top section from **Page overview** to
**This component**, which explains what the region is, what it does, each control it
holds, and what unlocks it (its gate). Closing Help exits Help mode and removes the
annotations.

The Help button is the single on/off control — opening Help *is* entering Help mode. The
click target is the region's **header**, never the region's live controls, so Help mode
can never trigger a real action (e.g. it can never commit a milestone).

Help content is authored at the **region level** (one entry per functional panel), not
per individual button. Each region entry describes its own buttons and gates in prose.
The shared **Glossary** and **Editorial method** drawer sections are retained.

## Problem

The Help drawer today ([`app/src/app/help/help-content.ts`](../../../script-creator/app/src/app/help/help-content.ts))
offers three things per page: a one-paragraph "On this page" blurb, a shared glossary,
and method-owner skill pointers. This tells the reader the *goal* of a page but never
what a specific on-screen control is or how to operate it.

The concrete failure: on Studio, the blurb mentions "pending milestones" and the glossary
defines the word "milestone" tersely ("A pending, hash-pinned repository change that
becomes a commit only after explicit confirmation"), but nothing explains what the
Milestones panel does, what produces a milestone, or the exact two-step confirm-then-commit
gesture. A user standing on the page cannot point at the thing in front of them and learn
what it is. The same gap exists on every page.

## Goals

- Let the user point at any documented on-screen region and read what it is, what it does,
  each control it holds, and what unlocks it.
- Keep the page-goal summary that the drawer already provides.
- Cover every surface: Studio, Discover, Topics, Pipeline, Lessons, Console, Welcome, and
  the shared masthead (nav, model selector, Help).
- Make Help mode safe: exploring a region must never fire that region's real action.
- Make the help content structurally checkable so it cannot silently drift from the UI.
- Reuse the existing accessible drawer (focus handling, Escape-to-close, focus return).

## Non-goals

- Do not add a `?` affordance to every individual button; region-level granularity only.
- Do not move any editorial method or workflow rules into the app — those stay owned by
  the repository skills, and the drawer keeps pointing at them.
- Do not build an in-place popover / coach-mark overlay system; the explanation appears in
  the existing side drawer.
- Do not add a separate always-on tooltip layer; annotations appear only while Help is open.
- Do not change any page's actual behavior, controls, gates, or copy outside the Help layer.
- Do not add a `/help` route; Help remains an overlay drawer.

## Interaction model

1. **Enter.** The masthead **Help** button (`#help-trigger`) opens the drawer and, at the
   same time, activates Help mode for whatever page is showing. Documented regions render a
   dashed outline and a small `?` cue button appended to the region's top corner.
2. **Inspect.** Clicking a region's `?` cue selects that region. The drawer's top section
   shows **This component** for the selected region. A "← Page overview" link clears the
   selection and returns the top section to the page goal.
3. **Operate.** The region's own controls remain fully interactive while Help is open. Help
   mode adds only the corner `?` cue as a click target, so the user can read help and act
   without toggling anything off — Help mode never fires a region's real controls.
4. **Change page.** Navigating with Help open keeps Help mode active and resets the
   selection to the new page's overview (mirrors today's route-driven drawer refresh).
5. **Exit.** Closing Help (× button, Escape, or the Help toggle) removes all annotations
   and returns focus to `#help-trigger` (existing behavior).

The drawer's lower sections — **Glossary** and **Editorial method** — are unchanged and
always visible below the top section.

## Content model

Extend [`help-content.ts`](../../../script-creator/app/src/app/help/help-content.ts).
Each route gains an ordered list of component entries alongside its goal blurb:

```ts
export interface HelpComponent {
  id: string;          // stable key, unique app-wide, e.g. 'studio.milestones'
  title: string;       // 'Milestones'
  summary: string;     // what it is and what it does, in plain language
  controls: string[];  // one line per control: label + what it does + any gate
  unlockedBy?: string; // the gate that governs the whole region, if any
}

export interface HelpPage {
  title: string;
  goal: string;               // today's 'description', lightly refreshed
  components: HelpComponent[];
}

export const HELP_PAGES: Record<HelpRoute, HelpPage> = { /* ... */ };

// The masthead is persistent across every route, so its targets are a shared scope,
// not tied to one page. They resolve regardless of the current route.
export const HELP_MASTHEAD: readonly HelpComponent[] = [ /* ... */ ];

// The Full topic run panel is one shared child component embedded on BOTH Topics and
// Discover, so its targets are a shared scope too (ids prefixed `fullrun.`).
export const HELP_FULLRUN: readonly HelpComponent[] = [ /* ... */ ];
```

`HELP_GLOSSARY` and `EDITORIAL_METHOD` are kept as-is.

Selection resolves by id against every scope (page `components`, `HELP_MASTHEAD`,
`HELP_FULLRUN`); every id is unique app-wide, so a single `findHelpComponent(id)` lookup
suffices regardless of the current route.

**Composition test.** A spec asserts a two-way match between authored content and the UI:
every `HelpComponent.id` in `HELP_PAGES` and `HELP_MASTHEAD` is applied to exactly one
`appHelpTarget` in a template, and every `appHelpTarget` id used in a template has exactly
one matching `HelpComponent`. Page ids are matched within their page's template; masthead
ids are matched in the shell template and may appear on every route at runtime. This keeps
the help text from drifting as the UI changes. (Extends the existing
`help-composition.spec.ts` pattern.)

## Mechanism (Angular)

- **`HelpModeService`** — signal-backed shared state: `active` (Help mode on/off, driven by
  the drawer open state) and `selectedId` (currently inspected region, or null). Provides
  `select(id)`, `clear()`, and a registry of target ids present on the current page.
- **`appHelpTarget="<id>"` directive** — applied to each region's root element (a child
  component host or a wrapping `<details>`/`<aside>`). While `active`, it adds a dashed
  outline class to the host and appends a corner `?` cue button; clicking the cue calls
  `service.select(id)` (and stops propagation so the region's own controls never fire). It
  registers/unregisters its id on the service for the "unknown id" guard, and gives the cue
  an accessible name ("Explain <title>") resolved from the matching content entry.
- **Drawer changes** ([`help-drawer.ts`](../../../script-creator/app/src/app/help/help-drawer.ts)) —
  the top section renders **This component** (title, summary, controls list, unlocked-by)
  when `selectedId` is set, otherwise the **Page overview** (goal). Glossary and method
  sections stay below.
- **Masthead coupling** ([`app.ts`](../../../script-creator/app/src/app/app.ts)) —
  `openHelp()` sets `active = true`; `closeHelp()` sets `active = false` and clears the
  selection. Route changes reset selection to null.

## Help-target inventory

The regions to annotate on each surface, with the source component that owns each. Copy is
authored during implementation from the functionality already mapped; the ids below are the
authoritative scope.

**Masthead** (`app.html` / `masthead-model-selector.ts`)
- `masthead.nav` — the surface switcher (Studio / Discover / Topics / Pipeline / Lessons /
  Console / Welcome); what each surface is for.
- `masthead.model` — global default model/effort selector and what the options mean.
- Help itself is explained by a static one-line hint in the drawer header when Help mode is
  on (not a `?` cue — the Help button can't nest a cue button inside itself).

**Studio** (`drafts/draft-manager.component.ts` and its panels)
- `studio.drafts` — Drafts library (create / open / import).
- `studio.milestones` — Milestones (workspace choice gate; confirm-then-commit; no discard).
- `studio.architecture` — Architecture (generate / review / refine / approve; approval lock).
- `studio.narration` — Narration actions (Generate episode gate; Promote; reconcile).
- `studio.editor` — Editor + selection toolbar + agent console + pacing rail; blocked state.
- `studio.production` — Production document (approve narration, promote, validator, queue).
- `studio.brief` — Brief & approval (factual boundary; creative phase gate).
- `studio.findings` — Review findings (anchored vs orphaned; read-only).
- `studio.parking` — Variants & parking (unsettled variant sets; parked losers).
- `studio.revisions` — Revisions & transfer (timeline/diff/restore; import/export gates).

**Full topic run — shared scope** (`topics/full-run-panel.ts`, embedded on Topics and Discover)
- `fullrun.launcher` — Recent runs, run launcher, live protocol checklist, research report.
- `fullrun.shortlist` — Candidate board / shortlist (sortable scores, gate chips).
- `fullrun.packages` — Packaging directions + focused package tester (pick winner).
- `fullrun.handoff` — Winner card + handoff preview → Confirm handoff (creates draft).

**Discover** (`discover/discover-page.ts`) — plus the shared Full topic run scope
- `discover.suggest` — Suggest ideas (cold start; send-to-inbox).

**Topics** (`topics/topics-page.ts`) — plus the shared Full topic run scope
- `topics.brief` — Repository selection brief (read-only, conditional).
- `topics.inbox` — Idea inbox (capture; status Open/Promoted/Discarded; gate-check).
- `topics.ideate` — Ideate angles (combine ideas + fresh thread).

**Pipeline** (`pipeline/pipeline-page.ts`)
- `pipeline.board` — the read-only lifecycle board: the 11 states and the count badges.
- `pipeline.card` — what a card shows and what clicking it opens (Studio draft vs Topics).
- `pipeline.diagnostics` — unmapped-state notice and pipeline-file diagnostics.

**Lessons** (`lessons/lessons-page.ts`, `lessons/lessons-panel.ts`)
- `lessons.draftpicker` — Episode-draft selector.
- `lessons.decisions` — Decision windows / sessions and the decision feed.
- `lessons.distillation` — Distill now / End session & distill; run detail.
- `lessons.queue` — Lesson review queue: approve/reject/supersede/retire, confirmation step.
- `lessons.reconcile` — External reconcile-whp handoff (copy / mark awaiting / verify).

**Console** (`studio-pages.ts` `AgentConsolePage`, `panels/agent-console.ts`)
- `console.list` — durable operation history list and state chips.
- `console.detail` — telemetry, supplied lessons provenance, console entries.
- `console.recovery` — Cancel and Re-roll (when each is available).

**Welcome** (`onboarding/welcome-page.ts`, `welcome-content.ts`)
- `welcome.mentalmodel` — the one-episode / five-surfaces map.
- `welcome.checklist` — first-episode checklist and the "Go" links; dismiss control.
- `welcome.boundaries` — "How this workbench behaves" principles + method pointers.

## Styling / accessibility

- Annotations use the WHP palette: a dashed outline in charcoal at low opacity, and a `?`
  control marked in accent red on the region header. Outlines appear only while `active`.
- The `?` is a real `<button>` with an accessible name ("Explain <title>") and is keyboard
  focusable; region headers are reachable by keyboard when Help mode is on.
- The selected region gets a stronger outline and the drawer scrolls its **This component**
  section into view; drawer keeps its current focus-trap and Escape behavior.
- Desktop-first (local `127.0.0.1` workbench); the drawer keeps its existing width. No new
  mobile layout work.

## Test strategy

Test-first, matching the app's vitest setup:

1. `HelpModeService` unit tests: activate/deactivate, select/clear, route change resets
   selection, unknown-id select is a no-op.
2. `appHelpTarget` directive tests: renders outline + `?` only when active; click selects;
   registers/unregisters id; `?` has an accessible name; region controls are not triggered
   by the header click.
3. Drawer tests: shows Page overview by default, This component when selected, and the
   "← Page overview" link clears selection; Glossary and Editorial method remain.
4. Composition test: every `HELP_PAGES` component id maps to exactly one `appHelpTarget`
   template usage and vice-versa (two-way, per route).
5. Content tests: every component entry has non-empty `title`, `summary`, and at least the
   controls/gate lines its region warrants; the Milestones entry names the confirm checkbox
   and Commit milestone step and that there is no discard.
6. Full `vitest run` green; `git diff --check`.

## Implementation sequencing

Build the mechanism once, then author content page-by-page. **Studio first** (the reported
milestone confusion), then Masthead, then Discover, Topics, Pipeline, Lessons, Console,
Welcome. Each page is: apply `appHelpTarget` to its regions + author the matching
`HelpComponent` entries + keep the composition test green.

## Expected files

Changed / added under `script-creator/app/src/app/`:

- `help/help-content.ts` — new `HelpComponent` / `HelpPage` types and `HELP_PAGES`.
- `help/help-drawer.ts` — Page overview vs This component top section.
- `help/help-mode.service.ts` (new) — Help mode signal state + target registry.
- `help/help-target.directive.ts` (new) — `appHelpTarget`.
- `help/help-composition.spec.ts` — extend for two-way id/target matching.
- `help/help-mode.service.spec.ts`, `help/help-target.directive.spec.ts` (new).
- `app.ts` / `app.html` — couple Help open to Help mode; apply masthead targets.
- Each page/panel component listed in the inventory — apply `appHelpTarget` to its regions.
- `styles.scss` / component styles — outline + `?` affordance styling.

No repository skills, `BRAND.md`, `STEERING.md`, or `DECISIONS.md` changes: this is an
in-app help-presentation change, not a brand, editorial-method, or workflow change.
