# Script Creator — Onboarding & Help Implementation Plan

**Date:** 2026-07-25
**Goal:** A first-run **Welcome route with a live checklist** that teaches the
pipeline mental model, and an always-available **Help drawer with a glossary**,
so a new (or returning-after-months) user can orient without reading the code.

## Design boundary (normative)

The onboarding and help copy explain **workbench mechanics only** — what each
stage/surface is, what an action does, where things persist, that nothing writes
to the repository without an explicit action. It must contain **no editorial
method**: never restate what makes a good topic, architecture, hook, or script.
Where editorial method is relevant, name the owning skill
(`choosing-whp-video-topic`, `writing-whp-youtube-scripts`) and its purpose, and
point the reader to it — do not duplicate its rules. This preserves the app's
standing law that the skills own all editorial doctrine and the app authors none.

No server changes. Progress is derived from existing read APIs; the dismissal
preference is a client localStorage flag (a per-browser UI preference, not
workflow or editorial state — mirrors the existing `sc.model-preference.v1`
pattern), so there is no schema migration.

## Task 1: Welcome route and live first-run checklist (app)

**Files:**
- Create `app/src/app/onboarding/welcome-page.ts`
- Create `app/src/app/onboarding/onboarding-state.ts` (derive progress; dismissal preference)
- Create `app/src/app/onboarding/welcome-content.ts` (workbench-mechanics copy + principles)
- Modify `app/src/app/app.routes.ts` (add `/welcome`)
- Modify `app/src/app/app.ts` + `app/src/app/app.html` (first-run auto-redirect)
- Tests: `app/src/app/onboarding/onboarding-state.spec.ts`, `app/src/app/onboarding/welcome-composition.spec.ts`

- [ ] `OnboardingState`: derive the five-step checklist from existing read APIs —
  a completed **topic run** (`listTopicRuns`), a **handed-off draft / selected
  episode** and **architecture approved** and **creative (narration) approved**
  and **production** milestones (`getPipeline` stage presence, with a draft's
  `getArchitecture`/promotion only if a stage needs confirming). Each step: label,
  done boolean, and a deep-link to the surface that advances it. Compute
  `isFreshInstall` = no drafts and no topic runs.
- [ ] Dismissal preference in localStorage (`sc.onboarding.v1`, `{dismissedAt}`),
  read/write via a small store like `ModelPreference`. `shouldAutoShow()` =
  `isFreshInstall && !dismissed`.
- [ ] `WelcomePage` (routed `/welcome`): the pipeline mental model
  (Topic → Architecture → Narration → Production → Milestone), the core
  principles (nothing commits without you; the skills own editorial rules; your
  decisions become lessons you approve), and the live checklist with each step's
  done state and a "Go" deep-link. A "Don't show this automatically" control sets
  dismissal. Reachable anytime via a masthead link.
- [ ] First-run behavior in the `App` shell: on initial load, if `shouldAutoShow()`
  resolves true and the current route is the default, navigate to `/welcome`
  once. Never redirect away from an explicit navigation; never loop.
- [ ] `onboarding-state.spec.ts`: fresh install → all steps pending, auto-show
  true; after a completed run + approvals (stubbed API) → steps flip done in
  order; dismissal suppresses auto-show; a populated install is never fresh.
- [ ] `welcome-composition.spec.ts` (composition-spec law — real router +
  WelcomePage + masthead link + stub client): render → checklist reflects stub
  progress → a step's Go link routes to its surface → dismiss control persists and
  suppresses auto-show → the masthead Welcome link returns to it.

**Commit:** `feat(script-creator): welcome route with a live first-run checklist`

## Task 2: Help drawer and glossary (app)

**Files:**
- Create `app/src/app/help/help-drawer.ts`
- Create `app/src/app/help/help-content.ts` (per-route topics, glossary, skill pointers)
- Modify `app/src/app/app.ts` + `app/src/app/app.html` (masthead Help button + drawer host)
- Modify `app/src/app/styles.scss`
- Tests: `app/src/app/help/help-content.spec.ts`, `app/src/app/help/help-composition.spec.ts`

- [ ] `help-content.ts`: for each route (`/`, `/welcome`, `/topics`, `/pipeline`,
  `/lessons`, `/console`) a short "On this page" explanation of the surface's
  mechanics; a **glossary** of workbench terms (beat, architecture, gate, package,
  candidate board, handoff, promote, milestone, decision, lesson, reconcile) —
  each defined as a tool concept; and an **editorial method** section that names
  the two skills and what they own, with their repo paths, and states explicitly
  that the app does not contain those rules. A `help-content.spec.ts` asserts
  every route has a topic and that the copy contains no editorial-rule phrasing
  (a denylist guard: e.g. no "you should"/"make sure to" imperatives aimed at
  script quality) so the boundary can't silently erode.
- [ ] `HelpDrawer`: an accessible, labelled non-modal slide-over positioned below
  the masthead. It moves focus inside on open, closes on Esc, restores focus to
  Help on close, and leaves the masthead and routed page interactive so the
  current route's topic can update while it remains open. It shows the glossary
  and editorial-method pointers and has no focus trap or full-page backdrop.
- [ ] Masthead: a **Help** button in `app.html` toggles the drawer via a signal
  in `App`; the drawer host lives in the shell so it overlays every route.
- [ ] `help-composition.spec.ts` (real router + App shell + HelpDrawer + stub):
  open from the masthead → the on-this-page topic matches the current route →
  click a real, unobscured masthead route link with the drawer open → topic
  updates → glossary and skill pointers render → Esc/close returns focus to the
  Help button. Keyboard order, labels, `aria-live`, and non-modal semantics
  covered.

**Commit:** `feat(script-creator): help drawer with per-page context and a glossary`

## Verification

- App `npx vitest run` ×2 + `npx tsc --noEmit` + `npx ng build`.
- Controller browser check (real daemon + real UI): first-run redirect to
  `/welcome`; checklist steps reflect real state after a fake full run + handoff;
  dismissal persists across reload; Help drawer opens from the masthead, shows the
  right page's topic on Studio/Topics/Pipeline/Lessons, renders the glossary and
  skill pointers, and closes on Esc.
- A fresh focused whole-diff review (proportionate to a UI-only, no-server change)
  with special attention to the editorial-boundary denylist; fix to
  PASS/APPROVED. The Plan 6/7 browser sweeps are re-run once to prove no
  regression to the shared masthead/app shell.

## Out of scope

Interactive coach-mark tour (deferred; the checklist + Help drawer cover
orientation); rendering skill reference files inline in Help (named + pointed to
only); any server-side onboarding/telemetry state.
