# Interactive Help Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Script Creator Help drawer into an interactive Help mode where every documented on-screen region carries a `?` cue that explains what it is, what it does, its controls, and its gate — for all seven surfaces plus the masthead.

**Architecture:** A root `HelpModeService` (signals) is activated whenever the Help drawer opens. An `appHelpTarget="<id>"` directive on each region host draws a dashed outline and appends a corner `?` cue while Help mode is active; clicking the cue selects that region. The drawer renders the selected region's entry (**This component**) or the page goal (**Page overview**). Region content lives in `help-content.ts` keyed by the same ids; a static coverage test regexes `appHelpTarget` ids out of template source (`?raw`) and asserts a two-way match with content so help can't drift from the UI.

**Tech Stack:** Angular 20.3 standalone components, signals + `effect()`, zoneless change detection, control flow (`@if`/`@for`), Renderer2 for the injected cue, Vitest + jsdom.

## Global Constraints

- Angular standalone components only; signal inputs (`input()`), `ChangeDetectionStrategy.OnPush`, and `@if`/`@for` control flow — match existing files.
- Tests run from `script-creator/app` with `npx vitest run <path>`; they use `provideZonelessChangeDetection()` and mount via `createApplication` (see `help/help-composition.spec.ts`).
- Prettier: `printWidth: 100`, `singleQuote: true`. Two-space indent.
- `appHelpTarget` MUST be written as a static string attribute (`appHelpTarget="studio.milestones"`), never a binding (`[appHelpTarget]="…"`) — the coverage test regexes the literal, and static attributes keep ids greppable.
- Every help id is globally unique and lowercase `scope.name` (e.g. `studio.milestones`, `masthead.nav`, `fullrun.handoff`).
- Help copy describes **mechanics only**. It must not match the editorial-rule denylist enforced by `help-content.spec.ts`: `\byou should\b`, `\bmake sure to\b`, `\bthe (topic|hook|architecture|script) (should|must)\b`, `\b(write|choose|make) (a|the|your) (good|better|strong) (topic|hook|architecture|script)\b`.
- Do NOT change any page's real behavior, controls, gates, or copy outside the help layer. Adding `appHelpTarget` to an existing element and importing the directive into that component's `imports` array is the only allowed page-component change.
- Every page/panel component that uses `appHelpTarget` must add `HelpTargetDirective` to its standalone `imports: [...]`.
- Commit after each task. After the final task, merge `feat/interactive-help-mode` into `main`.
- All paths below are relative to `script-creator/app/src/app/` unless noted.

---

### Task 1: Content model — `HelpComponent` / `HelpPage`, `HELP_PAGES`, shared scopes, `findHelpComponent`

Refactor `help-content.ts` from route→`{title,description}` into route→`{title,goal,components[]}`, add the two shared scopes (masthead content authored; full-run empty for now) and a global id lookup. Behavior-preserving: the drawer still shows the page goal by default. Authoring the masthead entries here — before their `appHelpTarget` is applied (Task 5) — gives Tasks 3–4 a resolvable id to test against; the coverage test that enforces content↔target parity is not created until Task 5, so the interim gap is safe.

**Files:**
- Modify: `help/help-content.ts`
- Modify: `help/help-content.spec.ts`
- Modify: `help/help-drawer.ts` (read `HELP_PAGES` + `.goal`)

**Interfaces:**
- Produces: `HelpComponent { id: string; title: string; summary: string; controls: string[]; unlockedBy?: string }`; `HelpPage { title: string; goal: string; components: HelpComponent[] }`; `HELP_PAGES: Record<HelpRoute, HelpPage>`; `HELP_MASTHEAD: readonly HelpComponent[]`; `HELP_FULLRUN: readonly HelpComponent[]`; `findHelpComponent(id: string): HelpComponent | undefined`.
- Keeps: `HELP_ROUTES`, `HelpRoute`, `HELP_GLOSSARY`, `EDITORIAL_METHOD`, `helpRoute()`.

- [ ] **Step 1: Write the failing test** — replace the first `it` in `help/help-content.spec.ts` and add lookup/uniqueness tests. Change the imports from `HELP_TOPICS` to `HELP_PAGES` and add `HELP_MASTHEAD, HELP_FULLRUN, findHelpComponent`.

```ts
import {
  EDITORIAL_METHOD,
  HELP_FULLRUN,
  HELP_GLOSSARY,
  HELP_MASTHEAD,
  HELP_PAGES,
  HELP_ROUTES,
  findHelpComponent,
  type HelpComponent,
} from './help-content';

function allComponents(): HelpComponent[] {
  return [
    ...HELP_ROUTES.flatMap((route) => HELP_PAGES[route].components),
    ...HELP_MASTHEAD,
    ...HELP_FULLRUN,
  ];
}

it('provides a titled goal for every application route', () => {
  expect(Object.keys(HELP_PAGES)).toEqual(HELP_ROUTES);
  for (const route of HELP_ROUTES) {
    expect(HELP_PAGES[route].title.trim()).not.toBe('');
    expect(HELP_PAGES[route].goal.trim()).not.toBe('');
  }
});

it('gives every help component a unique id, title and summary', () => {
  const components = allComponents();
  const ids = components.map((component) => component.id);
  expect(new Set(ids).size).toBe(ids.length); // globally unique
  for (const component of components) {
    expect(component.id).toMatch(/^[a-z]+\.[a-z]+$/u);
    expect(component.title.trim()).not.toBe('');
    expect(component.summary.trim()).not.toBe('');
    expect(Array.isArray(component.controls)).toBe(true);
  }
});

it('resolves any component by id and rejects unknown ids', () => {
  const components = allComponents();
  if (components.length > 0) {
    expect(findHelpComponent(components[0].id)).toBe(components[0]);
  }
  expect(findHelpComponent('does.notexist')).toBeUndefined();
});
```

Also update the existing `guards all Help and Welcome copy` test's `copy` object: replace `topics: HELP_TOPICS` with `pages: HELP_PAGES, masthead: HELP_MASTHEAD, fullRun: HELP_FULLRUN`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/help/help-content.spec.ts`
Expected: FAIL — `HELP_PAGES` / `findHelpComponent` not exported.

- [ ] **Step 3: Rewrite `help-content.ts`** — keep `HELP_ROUTES`, `HelpRoute`, `HELP_GLOSSARY`, `EDITORIAL_METHOD`, `helpRoute()` exactly. Replace `HelpTopic`/`HELP_TOPICS` with:

```ts
export interface HelpComponent {
  id: string;
  title: string;
  summary: string;
  controls: string[];
  unlockedBy?: string;
}

export interface HelpPage {
  title: string;
  goal: string;
  components: HelpComponent[];
}

export const HELP_PAGES: Record<HelpRoute, HelpPage> = {
  '/': {
    title: 'Studio',
    goal:
      'Studio opens working drafts. Its rails expose draft selection, revisions, ' +
      'architecture, narration controls, findings, production state, and pending ' +
      'milestones for the active draft.',
    components: [],
  },
  '/welcome': {
    title: 'Welcome',
    goal:
      'Welcome explains the workbench surfaces and reads existing topic-run, ' +
      'pipeline, and draft state to show live first-episode progress.',
    components: [],
  },
  '/discover': {
    title: 'Discover',
    goal:
      'Discover is a cold-start ideation surface that needs no seed idea. Supply ' +
      'audience and constraints, and the topic skill proposes subject-and-angle ' +
      'suggestions. Send ones you want to the Topics inbox, or launch a full ' +
      'researched run to hand off to a draft.',
    components: [],
  },
  '/topics': {
    title: 'Topics',
    goal:
      'Topics stores captured ideas, topic operations, candidate boards, package ' +
      'tests, durable run history, and the explicit handoff that creates a Studio draft.',
    components: [],
  },
  '/pipeline': {
    title: 'Pipeline',
    goal:
      'Pipeline is a read-only lifecycle board. Each card opens the working draft ' +
      'in Studio or the repository-backed topic material in Topics.',
    components: [],
  },
  '/lessons': {
    title: 'Lessons',
    goal:
      'Lessons shows captured decisions, distillation runs, reviewable lesson ' +
      'proposals, episode-local activation, and durable reconciliation handoffs.',
    components: [],
  },
  '/console': {
    title: 'Console',
    goal:
      'Console lists durable operations and their state, events, usage, inputs, ' +
      'recovery controls, and supplied lesson provenance across the workbench.',
    components: [],
  },
};

export const HELP_MASTHEAD: readonly HelpComponent[] = [
  {
    id: 'masthead.nav',
    title: 'Workbench navigation',
    summary:
      'The row of surfaces that make up the workbench. Each link opens one surface; ' +
      'the active surface is underlined.',
    controls: [
      'Studio — the working draft: architecture, narration, production, and repository milestones.',
      'Discover — cold-start ideation with no seed; proposes subjects and angles.',
      'Topics — captured ideas, topic runs, candidate boards, package tests, and the handoff that creates a draft.',
      'Pipeline — a read-only board of every episode’s lifecycle stage.',
      'Lessons — captured decisions and the lesson proposals distilled from them.',
      'Console — durable operation history, telemetry, and recovery controls.',
      'Welcome — orientation and a live first-episode checklist.',
    ],
  },
  {
    id: 'masthead.model',
    title: 'Default model',
    summary:
      'Sets the default model and effort that operations use across the workbench. It ' +
      'writes the shared default preference the editor’s per-selection picker also reads.',
    controls: [
      'Default — no override; codex uses its global configuration.',
      'Sol · xhigh — gpt-5.6-sol at xhigh effort.',
      'Sol · medium — gpt-5.6-sol at medium effort.',
    ],
  },
];

export const HELP_FULLRUN: readonly HelpComponent[] = [];

export function findHelpComponent(id: string): HelpComponent | undefined {
  for (const route of HELP_ROUTES) {
    const hit = HELP_PAGES[route].components.find((component) => component.id === id);
    if (hit) return hit;
  }
  return (
    HELP_MASTHEAD.find((component) => component.id === id)
    ?? HELP_FULLRUN.find((component) => component.id === id)
  );
}
```

- [ ] **Step 4: Update `help-drawer.ts`** — swap `HELP_TOPICS` for `HELP_PAGES` and render `.goal`:

Change the import line `HELP_TOPICS,` → `HELP_PAGES,`. Change `protected readonly topic = computed(() => HELP_TOPICS[this.routeState()]);` → `protected readonly page = computed(() => HELP_PAGES[this.routeState()]);`. In the `help-topic` section template, replace `{{ topic().title }}` → `{{ page().title }}` and `{{ topic().description }}` → `{{ page().goal }}`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/app/help/help-content.spec.ts src/app/help/help-composition.spec.ts`
Expected: PASS (drawer still shows the page title/goal; the composition spec's `help-topic` still contains 'Pipeline' / 'Topics').

- [ ] **Step 6: Commit**

```bash
git add src/app/help/help-content.ts src/app/help/help-content.spec.ts src/app/help/help-drawer.ts
git commit -m "feat(script-creator): help content model, page goals, and masthead entries"
```

---

### Task 2: `HelpModeService`

Root signal service holding Help-mode active state and the selected region; clears selection on navigation.

**Files:**
- Create: `help/help-mode.service.ts`
- Test: `help/help-mode.service.spec.ts`

**Interfaces:**
- Produces: `HelpModeService` with `active: Signal<boolean>`, `selectedId: Signal<string | null>`, `selected: Signal<HelpComponent | null>`, `activate(): void`, `deactivate(): void`, `select(id: string): void`, `clear(): void`.
- Consumes: `findHelpComponent` (Task 1); Angular `Router` for navigation reset.

- [ ] **Step 1: Write the failing test**

```ts
import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { HelpModeService } from './help-mode.service';
import { HELP_MASTHEAD } from './help-content';

describe('HelpModeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('activates and deactivates help mode', () => {
    const service = TestBed.inject(HelpModeService);
    expect(service.active()).toBe(false);
    service.activate();
    expect(service.active()).toBe(true);
    service.deactivate();
    expect(service.active()).toBe(false);
  });

  it('selects a known id and resolves the component, ignoring unknown ids', () => {
    const service = TestBed.inject(HelpModeService);
    const known = HELP_MASTHEAD[0].id; // 'masthead.nav', authored in Task 1
    service.select('nope.nope');
    expect(service.selectedId()).toBeNull();
    service.select(known);
    expect(service.selectedId()).toBe(known);
    expect(service.selected()?.id).toBe(known);
  });

  it('clears selection and clears on deactivate', () => {
    const service = TestBed.inject(HelpModeService);
    service.activate();
    service.select('masthead.nav'); // resolves once masthead content exists (Task 1)
    service.clear();
    expect(service.selectedId()).toBeNull();
    service.select('masthead.nav');
    service.deactivate();
    expect(service.selectedId()).toBeNull();
    expect(service.active()).toBe(false);
  });

  it('clears selection when the route changes', async () => {
    const service = TestBed.inject(HelpModeService);
    const router = TestBed.inject(Router);
    service.activate();
    await router.navigateByUrl('/topics');
    expect(service.selectedId()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/help/help-mode.service.spec.ts`
Expected: FAIL — `HelpModeService` not found.

- [ ] **Step 3: Implement `help-mode.service.ts`**

```ts
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { HelpComponent, findHelpComponent } from './help-content';

@Injectable({ providedIn: 'root' })
export class HelpModeService {
  private readonly _active = signal(false);
  private readonly _selectedId = signal<string | null>(null);

  readonly active: Signal<boolean> = this._active.asReadonly();
  readonly selectedId: Signal<string | null> = this._selectedId.asReadonly();
  readonly selected: Signal<HelpComponent | null> = computed(() => {
    const id = this._selectedId();
    return id ? findHelpComponent(id) ?? null : null;
  });

  constructor() {
    inject(Router).events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this._selectedId.set(null));
  }

  activate(): void {
    this._active.set(true);
  }

  deactivate(): void {
    this._active.set(false);
    this._selectedId.set(null);
  }

  select(id: string): void {
    if (findHelpComponent(id)) this._selectedId.set(id);
  }

  clear(): void {
    this._selectedId.set(null);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/help/help-mode.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/help/help-mode.service.ts src/app/help/help-mode.service.spec.ts
git commit -m "feat(script-creator): HelpModeService signal state for help mode"
```

---

### Task 3: `appHelpTarget` directive + cue styling

Directive that, while Help mode is active, adds a dashed outline to its host and appends a corner `?` cue button; clicking the cue selects the region (and never triggers the host's own controls). Global styles for the outline + cue.

**Files:**
- Create: `help/help-target.directive.ts`
- Test: `help/help-target.directive.spec.ts`
- Modify: `styles.scss` (append `.help-target` / `.help-target-cue` rules)

**Interfaces:**
- Produces: `HelpTargetDirective` (selector `[appHelpTarget]`, standalone), signal input `appHelpTarget: InputSignal<string>`.
- Consumes: `HelpModeService` (Task 2), `findHelpComponent` (Task 1).

- [ ] **Step 1: Write the failing test** — a tiny standalone host component using the directive.

```ts
import '@angular/compiler';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelpModeService } from './help-mode.service';
import { HelpTargetDirective } from './help-target.directive';

@Component({
  standalone: true,
  imports: [HelpTargetDirective],
  template: `<section appHelpTarget="masthead.nav"><button>Real control</button></section>`,
})
class HostComponent {}

describe('HelpTargetDirective', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('shows no cue until help mode is active', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.help-target-cue')).toBeNull();
    expect(fixture.nativeElement.querySelector('.help-target')).toBeNull();
  });

  it('adds an outline and a labelled cue when active, and selects on cue click', () => {
    const service = TestBed.inject(HelpModeService);
    const selectSpy = vi.spyOn(service, 'select');
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    service.activate();
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(host.classList.contains('help-target')).toBe(true);
    const cue = host.querySelector<HTMLButtonElement>('.help-target-cue')!;
    expect(cue).not.toBeNull();
    expect(cue.getAttribute('type')).toBe('button');
    // masthead.nav content exists from Task 1, so the label resolves the title.
    expect(cue.getAttribute('aria-label')).toBe('Explain Workbench navigation');

    // Clicking the cue routes to the service (and never to the real control).
    cue.click();
    expect(selectSpy).toHaveBeenCalledWith('masthead.nav');
  });

  it('reflects the selected id with a stronger outline class', () => {
    const service = TestBed.inject(HelpModeService);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    service.activate();
    service.select('masthead.nav');
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(host.classList.contains('help-target--selected')).toBe(true);
  });

  it('removes the cue and classes when help mode turns off', () => {
    const service = TestBed.inject(HelpModeService);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    service.activate();
    fixture.detectChanges();
    service.deactivate();
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(host.querySelector('.help-target-cue')).toBeNull();
    expect(host.classList.contains('help-target')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/help/help-target.directive.spec.ts`
Expected: FAIL — `HelpTargetDirective` not found.

- [ ] **Step 3: Implement `help-target.directive.ts`**

```ts
import {
  Directive,
  ElementRef,
  OnDestroy,
  Renderer2,
  effect,
  inject,
  input,
} from '@angular/core';
import { findHelpComponent } from './help-content';
import { HelpModeService } from './help-mode.service';

@Directive({
  selector: '[appHelpTarget]',
  standalone: true,
})
export class HelpTargetDirective implements OnDestroy {
  readonly appHelpTarget = input.required<string>();

  private readonly help = inject(HelpModeService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private cue: HTMLButtonElement | null = null;
  private unlistenClick: (() => void) | null = null;

  constructor() {
    effect(() => {
      const active = this.help.active();
      const selected = this.help.selectedId() === this.appHelpTarget();
      if (active) this.render(selected);
      else this.teardown();
    });
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  private render(selected: boolean): void {
    const el = this.host.nativeElement;
    this.renderer.addClass(el, 'help-target');
    if (selected) this.renderer.addClass(el, 'help-target--selected');
    else this.renderer.removeClass(el, 'help-target--selected');
    if (this.cue) return;

    const id = this.appHelpTarget();
    const title = findHelpComponent(id)?.title ?? id;
    const cue = this.renderer.createElement('button') as HTMLButtonElement;
    this.renderer.setAttribute(cue, 'type', 'button');
    this.renderer.setAttribute(cue, 'aria-label', `Explain ${title}`);
    this.renderer.setAttribute(cue, 'data-help-cue', id);
    this.renderer.addClass(cue, 'help-target-cue');
    this.renderer.appendChild(cue, this.renderer.createText('?'));
    this.unlistenClick = this.renderer.listen(cue, 'click', (event: Event) => {
      event.stopPropagation();
      event.preventDefault();
      this.help.select(id);
    });
    this.renderer.appendChild(el, cue);
    this.cue = cue;
  }

  private teardown(): void {
    const el = this.host.nativeElement;
    this.renderer.removeClass(el, 'help-target');
    this.renderer.removeClass(el, 'help-target--selected');
    this.unlistenClick?.();
    this.unlistenClick = null;
    if (this.cue) {
      this.renderer.removeChild(el, this.cue);
      this.cue = null;
    }
  }
}
```

- [ ] **Step 4: Append cue styling to `styles.scss`** (use the WHP palette: charcoal `#3b3b3b`, accent `#aa0a0a`):

```scss
.help-target {
  position: relative;
  outline: 1px dashed rgba(59, 59, 59, 0.45);
  outline-offset: 2px;
}

.help-target--selected {
  outline: 2px solid #aa0a0a;
}

.help-target-cue {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 5;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #aa0a0a;
  border-radius: 50%;
  background: #f8f8f8;
  color: #aa0a0a;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: help;
}

.help-target-cue:hover,
.help-target-cue:focus-visible {
  background: #aa0a0a;
  color: #f8f8f8;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/app/help/help-target.directive.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/help/help-target.directive.ts src/app/help/help-target.directive.spec.ts src/styles.scss
git commit -m "feat(script-creator): appHelpTarget directive with corner cue"
```

---

### Task 4: Drawer shows "This component" vs "Page overview"

The drawer renders the selected region entry when one is selected, else the page goal, plus a "← Page overview" control and a Help-mode hint in the header.

**Files:**
- Modify: `help/help-drawer.ts`
- Test: `help/help-drawer.spec.ts` (new, focused unit test with a stub service)

**Interfaces:**
- Consumes: `HelpModeService` (Task 2).

- [ ] **Step 1: Write the failing test** — mount the drawer with a router and drive the service.

```ts
import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { HelpDrawer } from './help-drawer';
import { HelpModeService } from './help-mode.service';

describe('HelpDrawer component section', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('shows the page overview when nothing is selected', () => {
    const fixture = TestBed.createComponent(HelpDrawer);
    fixture.detectChanges();
    const topic = fixture.nativeElement.querySelector('[data-testid="help-topic"]');
    expect(topic.textContent).toContain('On this page');
    expect(fixture.nativeElement.querySelector('[data-testid="help-component"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.help-overview-link')).toBeNull();
  });

  it('shows the selected component and clears back to overview', () => {
    const service = TestBed.inject(HelpModeService);
    const fixture = TestBed.createComponent(HelpDrawer);
    fixture.detectChanges();

    service.select('masthead.nav'); // resolves to authored content (Task 1)
    fixture.detectChanges();
    const component = fixture.nativeElement.querySelector('[data-testid="help-component"]');
    expect(component.textContent).toContain('This component');
    expect(component.textContent).toContain('Workbench navigation');

    const overviewLink = fixture.nativeElement.querySelector('.help-overview-link');
    expect(overviewLink).not.toBeNull();
    overviewLink.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="help-component"]')).toBeNull();
    expect(service.selectedId()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/help/help-drawer.spec.ts`
Expected: FAIL — the `[data-testid="help-component"]` block and `.help-overview-link` do not exist until Step 3 adds the template branch.

- [ ] **Step 3: Update `help-drawer.ts`** — inject the service, add a `selected` computed, split the `help-topic` section, and add a header hint.

Add to imports: `computed` is already imported; add `import { HelpModeService } from './help-mode.service';`. In the class:

```ts
protected readonly help = inject(HelpModeService);
protected readonly selectedComponent = this.help.selected;
```

Replace the `help-topic` `<section>` body with:

```html
<section
  class="help-topic"
  data-testid="help-topic"
  aria-live="polite"
  aria-atomic="true"
>
  @if (selectedComponent(); as component) {
    <div data-testid="help-component">
      <p>This component</p>
      <h3>{{ component.title }}</h3>
      <p>{{ component.summary }}</p>
      @if (component.controls.length > 0) {
        <ul class="help-controls">
          @for (line of component.controls; track line) {
            <li>{{ line }}</li>
          }
        </ul>
      }
      @if (component.unlockedBy) {
        <p class="help-gate">
          <span>Unlocked by</span> {{ component.unlockedBy }}
        </p>
      }
      <button
        type="button"
        class="help-overview-link"
        (click)="help.clear()"
      >
        ← Page overview
      </button>
    </div>
  } @else {
    <p>On this page</p>
    <h3>{{ page().title }}</h3>
    <p>{{ page().goal }}</p>
  }
</section>
```

In the drawer header, add a hint under the `<h2 id="help-title">Help</h2>` block (inside the existing `<div>`):

```html
<p class="help-mode-hint">Help mode is on — click any ? to explain a region.</p>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/help/help-drawer.spec.ts src/app/help/help-composition.spec.ts`
Expected: PASS (default overview branch intact; composition spec still finds page title).

- [ ] **Step 5: Commit**

```bash
git add src/app/help/help-drawer.ts src/app/help/help-drawer.spec.ts
git commit -m "feat(script-creator): drawer renders selected component vs page overview"
```

---

### Task 5: Couple Help open to Help mode + masthead targets + coverage test

Wire `openHelp`/`closeHelp` to the service, apply `appHelpTarget` to the masthead nav and model tools (content already authored in Task 1), and add the two-way coverage test (written once for all scopes).

**Files:**
- Modify: `app.ts`, `app.html`
- Create: `help/help-target-coverage.spec.ts`
- Modify: `help/help-composition.spec.ts` (assert a masthead cue appears + selecting it shows the component)

**Interfaces:**
- Consumes: `HelpModeService` (Task 2), `HelpTargetDirective` (Task 3).

- [ ] **Step 1: Write the failing coverage test** — `help/help-target-coverage.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import draftManagerRaw from '../drafts/draft-manager.component.ts?raw';
import discoverRaw from '../discover/discover-page.ts?raw';
import topicsRaw from '../topics/topics-page.ts?raw';
import fullRunRaw from '../topics/full-run-panel.ts?raw';
import pipelineRaw from '../pipeline/pipeline-page.ts?raw';
import lessonsPageRaw from '../lessons/lessons-page.ts?raw';
import lessonsPanelRaw from '../lessons/lessons-panel.ts?raw';
import agentConsoleRaw from '../panels/agent-console.ts?raw';
import welcomeRaw from '../onboarding/welcome-page.ts?raw';
import appHtmlRaw from '../app.html?raw';
import { HELP_FULLRUN, HELP_MASTHEAD, HELP_PAGES } from './help-content';

function templateIds(...raws: string[]): Set<string> {
  const ids = new Set<string>();
  for (const raw of raws) {
    for (const match of raw.matchAll(/appHelpTarget="([^"]+)"/gu)) ids.add(match[1]);
  }
  return ids;
}

const scopes = [
  { name: 'studio', ids: HELP_PAGES['/'].components.map((c) => c.id), raws: [draftManagerRaw] },
  { name: 'discover', ids: HELP_PAGES['/discover'].components.map((c) => c.id), raws: [discoverRaw] },
  { name: 'topics', ids: HELP_PAGES['/topics'].components.map((c) => c.id), raws: [topicsRaw] },
  { name: 'pipeline', ids: HELP_PAGES['/pipeline'].components.map((c) => c.id), raws: [pipelineRaw] },
  { name: 'lessons', ids: HELP_PAGES['/lessons'].components.map((c) => c.id), raws: [lessonsPageRaw, lessonsPanelRaw] },
  { name: 'console', ids: HELP_PAGES['/console'].components.map((c) => c.id), raws: [agentConsoleRaw] },
  { name: 'welcome', ids: HELP_PAGES['/welcome'].components.map((c) => c.id), raws: [welcomeRaw] },
  { name: 'masthead', ids: [...HELP_MASTHEAD].map((c) => c.id), raws: [appHtmlRaw] },
  { name: 'fullrun', ids: [...HELP_FULLRUN].map((c) => c.id), raws: [fullRunRaw] },
];

describe('help target coverage', () => {
  for (const scope of scopes) {
    it(`matches content ids to template targets for ${scope.name}`, () => {
      const contentIds = new Set(scope.ids);
      expect(new Set(scope.ids).size).toBe(scope.ids.length); // unique within scope
      expect(templateIds(...scope.raws)).toEqual(contentIds); // two-way
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/help/help-target-coverage.spec.ts`
Expected: FAIL on the `masthead` scope — its content exists (Task 1) but no `appHelpTarget` is applied yet, so `templateIds` is empty and the two sets differ. Every other scope passes (content empty == targets empty). Step 4 applies the masthead targets to turn it green. This spec is the guardrail for every later task.

- [ ] **Step 3: Couple Help mode in `app.ts`** — inject the service and update the handlers:

```ts
import { HelpModeService } from './help/help-mode.service';
// ...
private readonly helpMode = inject(HelpModeService);
// ...
protected openHelp(): void {
  this.helpOpen.set(true);
  this.helpMode.activate();
}

protected closeHelp(): void {
  this.helpOpen.set(false);
  this.helpMode.deactivate();
  queueMicrotask(() => {
    document.querySelector<HTMLButtonElement>('#help-trigger')?.focus();
  });
}
```

- [ ] **Step 4: Apply masthead targets.**

In `app.ts`, add `HelpTargetDirective` to `imports: [...]` (`import { HelpTargetDirective } from './help/help-target.directive';`).

In `app.html`, add the static attribute to the nav and the tools wrapper (the `HELP_MASTHEAD` content is already authored in Task 1):
- On `<nav aria-label="Script Creator">` add `appHelpTarget="masthead.nav"`.
- On `<div class="masthead-tools">` add `appHelpTarget="masthead.model"`.

- [ ] **Step 5: Extend `help-composition.spec.ts`** — after the drawer opens on `/pipeline`, assert a masthead cue exists and selecting it shows the component block. Add inside the first `it`, after the glossary assertions:

```ts
// Help mode annotates the masthead: a cue explains the navigation region.
const navCue = help.root.querySelector<HTMLButtonElement>(
  '.masthead nav .help-target-cue[data-help-cue="masthead.nav"]',
);
expect(navCue).not.toBeNull();
navCue!.click();
await vi.waitFor(() => {
  help.tick();
  const component = drawer.querySelector('[data-testid="help-component"]');
  expect(component?.textContent).toContain('Workbench navigation');
});
// Back to overview clears the selection.
findButton(drawer, '← Page overview').click();
await vi.waitFor(() => {
  help.tick();
  expect(drawer.querySelector('[data-testid="help-component"]')).toBeNull();
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/app/help/help-target-coverage.spec.ts src/app/help/help-composition.spec.ts src/app/help/help-content.spec.ts`
Expected: PASS — masthead coverage two-way match; composition shows/clears the component.

- [ ] **Step 7: Commit**

```bash
git add src/app/app.ts src/app/app.html src/app/help/help-target-coverage.spec.ts src/app/help/help-composition.spec.ts
git commit -m "feat(script-creator): couple help mode to drawer + masthead help targets"
```

---

### Tasks 6–13: author content + apply targets, one scope per task

Each task follows the SAME shape. For scope S:

1. Add `HelpTargetDirective` to the `imports: [...]` of every component whose template carries an S target.
2. Add `appHelpTarget="<id>"` (static attribute) to each region host listed for S.
3. Fill the S content array in `help-content.ts` with the entries listed for S.
4. Run: `npx vitest run src/app/help/help-target-coverage.spec.ts` — the S scope must go from empty→matched, all others stay matched. Then run the full suite.
5. Commit: `git commit -m "feat(script-creator): help content for <scope>"`.

The coverage test (Task 5) already lists every scope's raw files, so no test edits are needed in Tasks 6–13 — each just makes its scope's two sets equal.

---

### Task 6: Studio content + targets

**Files:** Modify `drafts/draft-manager.component.ts`; modify `help/help-content.ts` (`HELP_PAGES['/'].components`).

**Target placements in `drafts/draft-manager.component.ts`** (add `HelpTargetDirective` to its `imports`):
- `<aside class="draft-rail" …>` → `appHelpTarget="studio.drafts"`
- `<app-milestone-panel …>` → `appHelpTarget="studio.milestones"`
- `<app-architecture-panel …>` → `appHelpTarget="studio.architecture"`
- `<app-narration-actions …>` → `appHelpTarget="studio.narration"`
- `<app-editor-host …>` → `appHelpTarget="studio.editor"`
- `<app-production-panel …>` → `appHelpTarget="studio.production"`
- The `<details open>` wrapping `<summary>Brief &amp; approval</summary>` → `appHelpTarget="studio.brief"`
- The `<details open>` wrapping `<summary>Review findings</summary>` → `appHelpTarget="studio.findings"`
- The `<details open>` wrapping `<summary>Variants &amp; parking</summary>` → `appHelpTarget="studio.parking"`
- The `<details>` wrapping `<summary>Revisions &amp; transfer</summary>` (the active-draft branch, line ~199) → `appHelpTarget="studio.revisions"`

**Content — `HELP_PAGES['/'].components`:**

```ts
components: [
  {
    id: 'studio.drafts',
    title: 'Drafts library',
    summary:
      'Lists narration drafts and opens one into the writing surface. Opening a ' +
      'draft loads its architecture and populates the page.',
    controls: [
      'Create draft — makes a blank narration draft from a title and optional slug; an empty title is rejected.',
      'Draft card — opens that draft; the active card is highlighted.',
      'Import — brings in existing Markdown from the Revisions & transfer rail.',
    ],
  },
  {
    id: 'studio.milestones',
    title: 'Milestones',
    summary:
      'Staged Git commits for this episode’s repository, prepared by the daemon. Each ' +
      'pending milestone carries an immutable commit message, a fixed file list, and a ' +
      'diff. Nothing is committed until you confirm.',
    controls: [
      'Choose where this episode lives — repository work is blocked until a workspace exists. Pick the recommended managed branch (using the editable task name), or explicitly tick and confirm the current branch.',
      'Refresh milestones — re-fetches repository status and the pending list.',
      'Confirm this exact file list and immutable commit message — the per-milestone checkbox that arms its commit.',
      'Commit milestone — commits the staged change; enabled only after that milestone’s confirm checkbox is ticked. There is no discard button — an unconfirmed milestone simply stays pending.',
    ],
    unlockedBy:
      'A chosen workspace. Commit milestone additionally requires that milestone’s confirmation checkbox.',
  },
  {
    id: 'studio.architecture',
    title: 'Architecture',
    summary:
      'Generates, reviews, refines, and approves the episode’s section cards from the ' +
      'stored brief. A status ribbon shows whether it needs architecture, is approved, ' +
      'or is paused.',
    controls: [
      'Generate architecture — builds sections from the brief plus any supplied constraints.',
      'Review architecture — runs a review pass; needs at least one section.',
      'Accept proposal / Reject proposal — resolve a proposed section change; an optional reason can accompany it.',
      'Refine section — applies an instruction to one section.',
      'Approve architecture — locks the structure; enabled only with sections and no pending proposals.',
      'Reopen / Resume — reopen an approved architecture (narration is preserved but must be reconciled) or resume a paused approval.',
    ],
    unlockedBy:
      'Editing is disabled while an approval is locked or a saga is paused — Reopen or Resume first.',
  },
  {
    id: 'studio.narration',
    title: 'Narration actions',
    summary:
      'Turns approved architecture into whole-episode narration and moves it toward Promote.',
    controls: [
      'Generate episode — produces a whole-document proposal you accept or reject into the editor.',
      'Mark narration reconciled — clears the reconciliation requirement left by a reopen.',
      'Promote — hands the approved narration to production.',
    ],
    unlockedBy:
      'Generate episode unlocks when architecture is approved. Promote additionally needs approved narration and no pending reconciliation.',
  },
  {
    id: 'studio.editor',
    title: 'Editor',
    summary:
      'The narration editor plus its floating tools, inline agent proposals, the agent ' +
      'console, and a per-beat pacing rail. It autosaves shortly after edits.',
    controls: [
      'Selection toolbar — on a text selection: Review, Rewrite, Alternatives, a count and model picker, custom instruction, Lock, Annotate, and Flag for evidence.',
      'Inline proposal — Accept, Reject, or Re-roll a drafted replacement; conflicts show base, current, and proposed.',
      'Agent console — per-operation phase and telemetry, with Cancel and Re-roll.',
      'Pacing rail — words against target for each beat.',
    ],
    unlockedBy:
      'Editing and autosave are blocked while an architecture saga is pending (“Architecture action paused — resume or resolve first”).',
  },
  {
    id: 'studio.production',
    title: 'Production document',
    summary:
      'The staged Promote workflow: approve the complete narration, promote to Phase 2, ' +
      'and run the validator before completing.',
    controls: [
      'Clean narration — hides production-only sections in the editor.',
      'Approve complete narration — freezes the current narration; blocked by unsaved changes or an existing promotion.',
      'Production target + Promote to Phase 2 — stages the production document; needs approved narration and a non-empty target.',
      'Run validator / Complete Promote — validate the staged document; Complete unlocks only on a passing validator.',
      'Personal input queue — integrate a supplied response, then accept or reject the resulting proposal.',
    ],
    unlockedBy:
      'Each step gates the next: approve narration, then promote, then a passing validator, then complete.',
  },
  {
    id: 'studio.brief',
    title: 'Brief & approval',
    summary:
      'The factual boundary that feeds generation: topic, supplied facts, and claims the ' +
      'draft must not invent. It autosaves on change.',
    controls: [
      'Topic, Factual anchors, Open unknowns — the editable boundary fields.',
      'Creative phase — read-only here; it is set before an operation launches.',
      'Legacy direction approval — read-only; complete-narration approval lives in the Production document panel.',
    ],
  },
  {
    id: 'studio.findings',
    title: 'Review findings',
    summary:
      'A read-only, pinned list of review findings. Each shows a severity, the quoted ' +
      'anchor text, and whether it is still anchored or orphaned (its original text was ' +
      'removed). Blocking findings carry an accent border.',
    controls: [],
  },
  {
    id: 'studio.parking',
    title: 'Variants & parking',
    summary:
      'Manages unresolved alternative-variant sets and keeps discarded (parked) variants ' +
      'recoverable.',
    controls: [
      'Option button / Make active — choose which variant is active in a set.',
      'Pick active — resolves the set to the active choice; the losers move to the parked list.',
    ],
    unlockedBy: 'Variant edits route through the editor and are ignored while narration is blocked.',
  },
  {
    id: 'studio.revisions',
    title: 'Revisions & transfer',
    summary:
      'The revision timeline with compare and restore, and the repository import/export bridge.',
    controls: [
      'Refresh — reloads the revision list; needs an active draft.',
      'Compare checkboxes — select up to two revisions to see a word-level narration diff.',
      'Restore — saves a past revision’s document as a new revision.',
      'Import draft / Choose file — load Markdown into a draft.',
      'Export active draft / Write artifact — export narration; artifact writes are limited to whp-youtube/topics/ or whp-youtube/drafts/.',
    ],
  },
],
```

Run: `npx vitest run src/app/help/help-target-coverage.spec.ts && npx vitest run`
Commit: `git commit -m "feat(script-creator): help content for Studio regions"`

---

### Task 7: Full topic run (shared) content + targets

**Files:** Modify `topics/full-run-panel.ts`; modify `help/help-content.ts` (`HELP_FULLRUN`).

**Placement:** add `HelpTargetDirective` to `full-run-panel.ts` `imports`, then add `appHelpTarget` to the region hosts. Locate each by its heading (grep `full-run-panel.ts` for the headings and put the attribute on the nearest enclosing region element — a `<section>`/`<div>` that wraps the whole area, not an inner control):
- The run console/launcher region (kicker "Durable history"/"Recent runs" through the launcher, checklist, and "Research report") → `appHelpTarget="fullrun.launcher"`. If these are separate sibling sections, put the attribute on the outermost wrapper that contains them; if there is no single wrapper, wrap them in one `<div appHelpTarget="fullrun.launcher">`.
- The "Shortlist" / evidence board region → `appHelpTarget="fullrun.shortlist"`.
- The "Packaging directions" + focused package tester region → `appHelpTarget="fullrun.packages"`.
- The winner card + handoff region → `appHelpTarget="fullrun.handoff"`.

> Grep first: `grep -nE "Recent runs|Shortlist|Packaging directions|winner-card|Acceptance gate|Full topic run" src/app/topics/full-run-panel.ts` to find the exact wrapper elements. Each id must appear exactly once in the file.

**Content — `HELP_FULLRUN`:**

```ts
export const HELP_FULLRUN: readonly HelpComponent[] = [
  {
    id: 'fullrun.launcher',
    title: 'Full topic run',
    summary:
      'Runs the topic-selection skill’s full protocol and renders its work; durable runs ' +
      'are re-selectable. The skill owns the research, gates, scoring, and recommendation — ' +
      'this surface only transports inputs and shows output.',
    controls: [
      'Refresh runs / Select run — reload durable run history and load a saved run’s snapshot; a still-running run resumes polling.',
      'Starting territory + Constraints — the run inputs; Starting territory is required.',
      'Launch full run — starts the run and polls until it finishes.',
      'Checklist and Research report — the live protocol steps and the returned report (read-only).',
    ],
  },
  {
    id: 'fullrun.shortlist',
    title: 'Shortlist',
    summary:
      'The scored candidate board from a completed run. Sort by total or any criterion; ' +
      'each candidate can carry six-gate chips.',
    controls: [
      'Column-header buttons — sort by Total, Demand, Opening, Package, Satisfaction, WHP, Evidence, or Feasibility.',
      'Test packages — start a focused package test for that candidate, one at a time.',
    ],
    unlockedBy: 'Appears only when the run produced a structured summary.',
  },
  {
    id: 'fullrun.packages',
    title: 'Packaging directions',
    summary:
      'The run’s packaging table plus the focused package tester for a finalist. Each ' +
      'saved test lists three promises and whether they survive honestly.',
    controls: [
      'Use this package — selects a winning direction from a saved test; one selection per test.',
    ],
    unlockedBy: 'The focused tester appears after Test packages is pressed on a candidate.',
  },
  {
    id: 'fullrun.handoff',
    title: 'Winner & handoff',
    summary:
      'The winner card and the acceptance-gate handoff that creates a Studio draft. ' +
      'Handoffs are durable and resumable.',
    controls: [
      'Preview handoff — prepares the selected-topic brief; needs a winner with subject and angle.',
      'Confirm handoff — creates the draft, writes the brief, records the pipeline milestone, promotes the idea, and opens the draft in Studio.',
      'Resume handoff — continues an incomplete handoff from its stored state.',
    ],
    unlockedBy: 'Requires a selected durable run before confirming.',
  },
];
```

Run: `npx vitest run src/app/help/help-target-coverage.spec.ts && npx vitest run`
Commit: `git commit -m "feat(script-creator): help content for the full topic run panel"`

---

### Task 8: Discover content + targets

**Files:** Modify `discover/discover-page.ts`; modify `help/help-content.ts` (`HELP_PAGES['/discover'].components`).

**Placement:** add `HelpTargetDirective` to imports; add `appHelpTarget="discover.suggest"` to the "Suggest ideas" stage wrapper (grep `grep -nE "Suggest ideas|discover-results|Spark" src/app/discover/discover-page.ts` and place it on the enclosing `<section>`). The embedded `<app-full-run-panel>` needs NO attribute — its targets live in `full-run-panel.ts` (Task 7).

**Content:**

```ts
components: [
  {
    id: 'discover.suggest',
    title: 'Suggest ideas',
    summary:
      'Cold-start ideation: proposes subjects and angles from optional constraints, with ' +
      'no seed required. Leaving the box empty is a valid cold start.',
    controls: [
      'Constraints — optional guardrails such as audience, timing, or topics to avoid.',
      'Suggest ideas — asks the topic studio for subject-and-angle cards.',
      'Send to inbox — copies a suggestion into the Topics idea inbox.',
    ],
  },
],
```

Run: `npx vitest run src/app/help/help-target-coverage.spec.ts && npx vitest run`
Commit: `git commit -m "feat(script-creator): help content for Discover"`

---

### Task 9: Topics content + targets

**Files:** Modify `topics/topics-page.ts`; modify `help/help-content.ts` (`HELP_PAGES['/topics'].components`).

**Placement:** add `HelpTargetDirective` to imports; grep `grep -nE "Repository selection|Idea inbox|Ideate angles|Stage 0" src/app/topics/topics-page.ts` and add:
- Repository selection brief section → `appHelpTarget="topics.brief"`
- Idea inbox (Stage 01) section → `appHelpTarget="topics.inbox"`
- Ideate angles (Stage 02) section → `appHelpTarget="topics.ideate"`
The embedded `<app-full-run-panel>` (Stage 03) needs NO attribute.

**Content:**

```ts
components: [
  {
    id: 'topics.brief',
    title: 'Repository selection brief',
    summary:
      'A read-only Markdown brief for a topic already in the repository, shown when the ' +
      'page is opened for a specific topic reference.',
    controls: [],
    unlockedBy: 'Shown only when a topic and ref are supplied in the page address.',
  },
  {
    id: 'topics.inbox',
    title: 'Idea inbox',
    summary:
      'The captured-ideas store. Capture raw hunches, mark their status, select them for ' +
      'ideation, and run a quick six-gate read.',
    controls: [
      'Capture idea — stores a hunch as an inbox card.',
      'Use for ideation — the checkbox that feeds a card into the ideate stage.',
      'Status — Open, Promoted, or Discarded (Discarded parks a card).',
      'Gate-check — runs a six-gate read for one idea and pins the verdict to the card.',
    ],
  },
  {
    id: 'topics.ideate',
    title: 'Ideate angles',
    summary:
      'Combines the checked inbox ideas with an optional fresh thread and asks the topic ' +
      'skill for subjects and angles. Each returned angle is also saved back to the inbox.',
    controls: [
      'Fresh thread — an optional extra question or constraint for this pass.',
      'Ideate angles — returns angle cards; enabled with at least one checked idea or some fresh-thread text.',
    ],
  },
],
```

Run: `npx vitest run src/app/help/help-target-coverage.spec.ts && npx vitest run`
Commit: `git commit -m "feat(script-creator): help content for Topics"`

---

### Task 10: Pipeline content + targets

**Files:** Modify `pipeline/pipeline-page.ts`; modify `help/help-content.ts` (`HELP_PAGES['/pipeline'].components`).

**Placement:** add `HelpTargetDirective` to imports; grep `grep -nE "pipeline-board|pipeline-card|diagnostic|Try again" src/app/pipeline/pipeline-page.ts` and add:
- The board element (`data-testid="pipeline-board"`) → `appHelpTarget="pipeline.board"`
- The card element (`data-testid="pipeline-card"`) → `appHelpTarget="pipeline.card"`. It is inside an `@for`, so it would render one cue per card — instead place the attribute on the FIRST card only is not possible generically; put it on a stable single wrapper around the card grid if one exists, otherwise on the column template’s wrapping element that appears once. If the only single-occurrence host is the board, merge card guidance into `pipeline.board` and DROP `pipeline.card` (update content to 2 entries). Decide by inspection: pick the element that appears exactly once in source.
- The diagnostics/alert region → `appHelpTarget="pipeline.diagnostics"`

> The coverage test requires each id to appear exactly once in `pipeline-page.ts`. If `pipeline-card` cannot be placed on a single-occurrence element, remove that entry from the content array below.

**Content:**

```ts
components: [
  {
    id: 'pipeline.board',
    title: 'Production pipeline',
    summary:
      'A read-only board of every episode’s lifecycle stage across eleven columns ' +
      '(Idea, Candidate, Selected, Architecture, Architecture approved, Prototyping, ' +
      'Creative approved, Production, Record ready, Recorded, Published). Each column ' +
      'shows a live count, and the board never changes the pipeline.',
    controls: [],
  },
  {
    id: 'pipeline.card',
    title: 'Pipeline card',
    summary:
      'One episode on the board. It shows the stage, title, slug, and source — a working ' +
      'Draft or repository Topic material.',
    controls: [
      'Open card — opens the working draft in Studio, or the topic material in Topics, depending on the card’s source.',
    ],
  },
  {
    id: 'pipeline.diagnostics',
    title: 'Pipeline diagnostics',
    summary:
      'Notices about the pipeline file: episodes in an unrecognized state that cannot be ' +
      'placed, and per-row problems that need attention.',
    controls: [
      'Try again — reloads the pipeline after a load error.',
    ],
    unlockedBy: 'Shown only when the pipeline reports unmapped states or diagnostics.',
  },
],
```

Run: `npx vitest run src/app/help/help-target-coverage.spec.ts && npx vitest run`
Commit: `git commit -m "feat(script-creator): help content for Pipeline"`

---

### Task 11: Lessons content + targets

**Files:** Modify `lessons/lessons-page.ts` and `lessons/lessons-panel.ts`; modify `help/help-content.ts` (`HELP_PAGES['/lessons'].components`).

**Placement:** add `HelpTargetDirective` to the imports of BOTH components. Grep both files:
- In `lessons-page.ts` (grep `Episode draft`): the draft-picker control’s enclosing element → `appHelpTarget="lessons.draftpicker"`.
- In `lessons-panel.ts` (grep `Decision windows|Decision feed|Distill|Lesson review queue|reconcile-whp`):
  - decision rail (sessions + decision feed) → `appHelpTarget="lessons.decisions"`
  - distillation console → `appHelpTarget="lessons.distillation"`
  - lesson review queue → `appHelpTarget="lessons.queue"`
  - the reconciliation handoff region → `appHelpTarget="lessons.reconcile"`. This is inside a per-lesson `@for`; place it on the single wrapper that renders once, or on the queue section if no single host exists. If it cannot be a single-occurrence host, fold reconcile guidance into `lessons.queue` and DROP `lessons.reconcile` (content becomes 4 entries).

**Content:**

```ts
components: [
  {
    id: 'lessons.draftpicker',
    title: 'Episode draft',
    summary:
      'Chooses which episode draft’s decisions, sessions, and lessons the page shows.',
    controls: [
      'Episode draft — selects the draft; loading its data is disabled while a load is in flight.',
    ],
  },
  {
    id: 'lessons.decisions',
    title: 'Decisions & sessions',
    summary:
      'The decision windows (sessions) and the exact decision feed for the selected draft. ' +
      'Read-only provenance.',
    controls: [],
  },
  {
    id: 'lessons.distillation',
    title: 'Distillation',
    summary:
      'Runs the read-only distillation skill over the open decision window to propose ' +
      'lessons. Neither action runs on navigation or unload.',
    controls: [
      'Distill now — snapshots the open window and proposes lessons.',
      'End session & distill — closes the current session’s cursor, then distills.',
    ],
    unlockedBy: 'Both need a selected draft and no run already in flight.',
  },
  {
    id: 'lessons.queue',
    title: 'Lesson review queue',
    summary:
      'Lesson proposals stay proposals until explicitly decided. Each card shows its ' +
      'classification (episode-local or durable), state, evidence, and provenance. Saving ' +
      'reviewed text does not approve it.',
    controls: [
      'Save review — stores edited lesson text without approving it.',
      'Approve / Reject — record the decision; each routes through a confirmation step.',
      'Predecessor lesson ID + Supersede — replace an existing lesson.',
      'Retire — retire an approved lesson; blocked while repository provenance is unresolved.',
    ],
    unlockedBy: 'Available actions depend on the card’s state, and every action confirms first.',
  },
  {
    id: 'lessons.reconcile',
    title: 'Reconcile-whp handoff',
    summary:
      'For durable lessons, the external handoff to apply doctrine in the repository. ' +
      'Script Creator does not edit or commit doctrine.',
    controls: [
      'Copy handoff — copies the prepared proposal to run externally.',
      'I started external reconciliation — marks the handoff awaiting; the repository is unchanged.',
      'Verify external commit — records the reviewed reconciliation commit hash.',
    ],
    unlockedBy: 'Appears on durable lessons that carry a reconciliation record.',
  },
],
```

Run: `npx vitest run src/app/help/help-target-coverage.spec.ts && npx vitest run`
Commit: `git commit -m "feat(script-creator): help content for Lessons"`

---

### Task 12: Console content + targets

**Files:** Modify `panels/agent-console.ts`; modify `help/help-content.ts` (`HELP_PAGES['/console'].components`).

**Placement:** add `HelpTargetDirective` to imports; grep `grep -nE "Operation history|Operation telemetry|Supplied lessons|actions|Cancel|Re-roll" src/app/panels/agent-console.ts` and add:
- operation history nav/list → `appHelpTarget="console.list"`
- the stream detail region (telemetry + supplied lessons + entries) → `appHelpTarget="console.detail"`
- the recovery `.actions` bar → `appHelpTarget="console.recovery"`

**Content:**

```ts
components: [
  {
    id: 'console.list',
    title: 'Operation history',
    summary:
      'Durable operations, newest activity first, each with a state chip. The list ' +
      'refreshes every few seconds, and selecting one loads its full record.',
    controls: [
      'Operation button — selects an operation to inspect its stream.',
    ],
  },
  {
    id: 'console.detail',
    title: 'Operation detail',
    summary:
      'The selected operation’s telemetry (input, cached, output, and reasoning tokens ' +
      'and usage), the immutable supplied-lessons envelope, and its console entries. ' +
      'Durable doctrine is repository-native, not supplied as envelope context.',
    controls: [],
    unlockedBy: 'Shown once an operation is selected.',
  },
  {
    id: 'console.recovery',
    title: 'Recovery controls',
    summary:
      'Cancel a live operation or re-roll a resumable one.',
    controls: [
      'Cancel — cancels an operation that is queued, running, or cancelling.',
      'Re-roll — replays a resumable operation (done or guardrail phase) with one fewer hop; unavailable once the resume budget is spent.',
    ],
    unlockedBy: 'Each control is enabled only when the selected operation’s state allows it.',
  },
],
```

Run: `npx vitest run src/app/help/help-target-coverage.spec.ts && npx vitest run`
Commit: `git commit -m "feat(script-creator): help content for Console"`

---

### Task 13: Welcome content + targets

**Files:** Modify `onboarding/welcome-page.ts`; modify `help/help-content.ts` (`HELP_PAGES['/welcome'].components`).

**Placement:** add `HelpTargetDirective` to imports; grep `grep -nE "mental model|First episode checklist|How this workbench behaves" src/app/onboarding/welcome-page.ts` and add:
- pipeline mental-model section → `appHelpTarget="welcome.mentalmodel"`
- first-episode checklist section → `appHelpTarget="welcome.checklist"`
- "How this workbench behaves" section → `appHelpTarget="welcome.boundaries"`

**Content:**

```ts
components: [
  {
    id: 'welcome.mentalmodel',
    title: 'Pipeline mental model',
    summary:
      'The one-episode, five-surfaces map: Topic, Architecture, Narration, Production, ' +
      'and Milestone. Static orientation.',
    controls: [],
  },
  {
    id: 'welcome.checklist',
    title: 'First episode checklist',
    summary:
      'A live checklist of the first episode’s progress — complete a topic run, hand off, ' +
      'approve architecture, approve narration, reach production — each with a link to the ' +
      'right surface.',
    controls: [
      'Go — jumps to the surface for that step.',
      'Don’t show this automatically — stops Welcome from auto-opening on a fresh launch; it stays available in the masthead.',
    ],
  },
  {
    id: 'welcome.boundaries',
    title: 'How this workbench behaves',
    summary:
      'The control boundaries: nothing commits without you, editorial method stays in the ' +
      'skills, and decisions become lessons you approve. It also points to the ' +
      'method-owning skills.',
    controls: [],
  },
],
```

Run: `npx vitest run src/app/help/help-target-coverage.spec.ts && npx vitest run`
Commit: `git commit -m "feat(script-creator): help content for Welcome"`

---

### Task 14: Full verification, manual smoke, and merge to main

**Files:** none (verification + integration).

- [ ] **Step 1: Full suite green**

Run: `npx vitest run`
Expected: all files pass (baseline was 36 files / 274 tests; this adds the help specs and grows counts).

- [ ] **Step 2: Diff hygiene**

Run: `git diff --check` (from `script-creator/app`) — no whitespace errors. Confirm no page behavior changed: `git diff main -- src/app | grep -nE "^\+" | grep -viE "appHelpTarget|HelpTargetDirective|import|^\+\+\+" | head` should show only help-layer additions.

- [ ] **Step 3: Manual smoke** (optional but recommended)

From `script-creator/`: `npm start`, open the printed URL, click **Help** on each surface, confirm every documented region shows a dashed outline + `?`, clicking a `?` shows its **This component** entry, and **← Page overview** returns to the goal. Confirm clicking a `?` never triggers the region’s real control (e.g. the Milestones `?` does not commit).

- [ ] **Step 4: Merge to main**

```bash
cd /home/martin/work/projects/why-humans-play/why-humans-play_sources
git checkout main
git merge --no-ff feat/interactive-help-mode -m "Merge feat/interactive-help-mode: interactive per-page Help mode"
```

Then report the merge and remove the worktree if desired: `git worktree remove ../.worktrees/interactive-help-mode`.

## Self-review notes

- **Spec coverage:** interaction model (Tasks 3–5), content model + shared scopes (Task 1), mechanism service/directive/drawer (Tasks 2–4), masthead + all seven surfaces (Tasks 5–13), composition/coverage test (Task 5), styling/a11y (Task 3), test strategy (every task). The full help-target inventory maps one-to-one to Tasks 6–13.
- **Placeholder scan:** all content arrays are authored in full; the only conditional instructions are the explicit "if the id cannot sit on a single-occurrence element, drop it" fallbacks for `pipeline.card` and `lessons.reconcile`, which are decisions the implementer makes by inspection, not deferred work.
- **Type consistency:** `HelpComponent`/`HelpPage`, `HELP_PAGES`/`HELP_MASTHEAD`/`HELP_FULLRUN`, `findHelpComponent`, `HelpModeService.{active,selectedId,selected,activate,deactivate,select,clear}`, and `HelpTargetDirective` (input `appHelpTarget`) are used consistently across tasks.
