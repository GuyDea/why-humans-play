import '@angular/compiler';
import {
  createComponent,
  provideZonelessChangeDetection,
  ɵresolveComponentResources,
  type ApplicationRef,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DaemonClient } from '../api/client';
import { App } from '../app';
import appTemplate from '../app.html?raw';
import appStyles from '../app.scss?raw';
import { routes } from '../app.routes';
import { STUDIO_SESSION, StudioSession } from '../studio-session';

class HelpClientStub {
  readonly getPipeline = vi.fn(async () => ({
    rows: [],
    diagnostics: [],
  }));
  readonly listIdeas = vi.fn(async () => []);
  readonly listTopicRuns = vi.fn(async () => []);
  readonly list = vi.fn(async () => []);
}

interface MountedHelp {
  application: ApplicationRef;
  component: ComponentRef<App>;
  root: HTMLElement;
  router: Router;
  client: HelpClientStub;
  tick(): void;
  destroy(): void;
}

const mounted: MountedHelp[] = [];

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.destroy();
  document.body.replaceChildren();
  globalThis.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('routed Help composition', () => {
  it('opens a non-modal glossary/method reference without activating Help mode', async () => {
    const help = await mountHelp();
    const trigger = findButton(help.root, 'Help');

    expect(trigger.getAttribute('aria-label')).toBe('Open help');
    expect(trigger.getAttribute('aria-controls')).toBe('script-creator-help');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.focus();
    trigger.click();
    help.tick();

    const drawer = await renderedDrawer(help);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // Non-modal complementary panel: not a modal dialog, no full-page backdrop.
    expect(drawer.tagName).toBe('ASIDE');
    expect(drawer.getAttribute('role')).not.toBe('dialog');
    expect(drawer.getAttribute('aria-modal')).toBeNull();
    expect(drawer.getAttribute('aria-labelledby')).toBe('help-title');
    expect(help.root.querySelector('.help-backdrop')).toBeNull();
    expect(help.root.querySelector('.help-layer')).toBeNull();

    // The reference panel is a pure glossary + method reference. Per-page /
    // per-region explanation has moved to the Help-mode popover.
    expect(drawer.querySelector('[data-testid="help-topic"]')).toBeNull();
    expect(drawer.textContent).not.toContain('On this page');
    expect(
      Array.from(drawer.querySelectorAll('dt')).map(
        (entry) => entry.textContent?.trim(),
      ),
    ).toEqual(expect.arrayContaining([
      'beat',
      'architecture',
      'gate',
      'package',
      'candidate board',
      'handoff',
      'promote',
      'milestone',
      'decision',
      'lesson',
      'reconcile',
    ]));
    expect(drawer.textContent).toContain(
      '.agents/skills/choosing-whp-video-topic/SKILL.md',
    );
    expect(drawer.textContent).toContain(
      '.agents/skills/writing-whp-youtube-scripts/SKILL.md',
    );

    // Opening the reference must NOT turn on Help mode: no region cues appear.
    expect(help.root.querySelector('.help-target-cue')).toBeNull();

    // Focus moves into the panel; the masthead stays interactive (non-modal).
    const close = findButton(drawer, 'Close help');
    await vi.waitFor(() => expect(document.activeElement).toBe(close));
    mastheadLink(help.root, 'Topics').click();
    help.tick();
    await vi.waitFor(() => {
      help.tick();
      expect(help.router.url).toBe('/topics');
      expect(help.root.querySelector('#script-creator-help')).not.toBeNull();
    });

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    }));
    help.tick();
    await vi.waitFor(() => {
      help.tick();
      expect(help.root.querySelector('#script-creator-help')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('Explain regions toggles Help mode with anchored popovers, independent of the drawer', async () => {
    const help = await mountHelp();
    const toggle = findButton(help.root, 'Explain regions');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    // Turn on Help mode WITHOUT opening the reference panel.
    toggle.click();
    help.tick();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(help.root.querySelector('#script-creator-help')).toBeNull();

    // Region cues appear; the drawer never covers them because it isn't open.
    let navCue: HTMLButtonElement | null = null;
    await vi.waitFor(() => {
      help.tick();
      navCue = help.root.querySelector<HTMLButtonElement>(
        '.masthead nav .help-target-cue[data-help-cue="masthead.nav"]',
      );
      expect(navCue).not.toBeNull();
    });

    // Clicking a cue shows the explanation in an anchored popover (not the panel).
    navCue!.click();
    let popover: HTMLElement | null = null;
    await vi.waitFor(() => {
      help.tick();
      popover = help.root.querySelector<HTMLElement>(
        '[data-testid="help-popover"]',
      );
      expect(popover).not.toBeNull();
      expect(popover!.textContent).toContain('Workbench navigation');
    });
    expect(popover!.getAttribute('role')).toBe('dialog');

    // Escape dismisses the popover but leaves Help mode on.
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    }));
    await vi.waitFor(() => {
      help.tick();
      expect(help.root.querySelector('[data-testid="help-popover"]')).toBeNull();
    });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    // Toggling off removes the cues.
    toggle.click();
    await vi.waitFor(() => {
      help.tick();
      expect(help.root.querySelector('.help-target-cue')).toBeNull();
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
    });
  });

  it('returns focus to Help when the labelled close control is used', async () => {
    const help = await mountHelp();
    const trigger = findButton(help.root, 'Help');
    trigger.focus();
    trigger.click();
    help.tick();
    const drawer = await renderedDrawer(help);
    const close = findButton(drawer, 'Close help');

    expect(close.getAttribute('aria-label')).toBe('Close help');
    close.click();
    help.tick();

    await vi.waitFor(() => {
      help.tick();
      expect(help.root.querySelector('#script-creator-help')).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });
  });
});

async function mountHelp(): Promise<MountedHelp> {
  await ɵresolveComponentResources(async (url) =>
    url.endsWith('app.html') ? appTemplate : appStyles);
  globalThis.history.replaceState(null, '', '/pipeline');
  const client = new HelpClientStub();
  const session = new StudioSession(client as unknown as DaemonClient);
  const application = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      { provide: STUDIO_SESSION, useValue: session },
    ],
  });
  const root = document.createElement('app-root');
  document.body.append(root);
  const component = createComponent(App, {
    environmentInjector: application.injector,
    hostElement: root,
  });
  application.attachView(component.hostView);
  const router = application.injector.get(Router);
  const help: MountedHelp = {
    application,
    component,
    root,
    router,
    client,
    tick: () => {
      application.tick();
      component.changeDetectorRef.detectChanges();
    },
    destroy: () => {
      application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      root.remove();
    },
  };
  mounted.push(help);
  await router.navigateByUrl('/pipeline');
  help.tick();
  await vi.waitFor(() => {
    help.tick();
    expect(root.querySelector('app-pipeline-page')).not.toBeNull();
    expect(client.getPipeline).toHaveBeenCalledOnce();
  });
  return help;
}

async function renderedDrawer(help: MountedHelp): Promise<HTMLElement> {
  let drawer: HTMLElement | null = null;
  await vi.waitFor(() => {
    help.tick();
    drawer = help.root.querySelector<HTMLElement>('#script-creator-help');
    expect(drawer).not.toBeNull();
  });
  return drawer!;
}

function mastheadLink(root: Element, label: string): HTMLAnchorElement {
  const link = Array.from(root.querySelectorAll('.masthead nav a')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!(link instanceof HTMLAnchorElement)) {
    throw new Error(`masthead link "${label}" was not rendered`);
  }
  return link;
}

function findButton(root: Element, label: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label
      || candidate.getAttribute('aria-label') === label,
  );
  if (!button) throw new Error(`button "${label}" was not rendered`);
  return button;
}
