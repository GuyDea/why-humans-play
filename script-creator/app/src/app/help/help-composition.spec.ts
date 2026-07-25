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

describe('routed Help drawer composition', () => {
  it('tracks the active route and exposes the glossary and skill owners', async () => {
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
    // Non-modal complementary panel: it must NOT be a modal dialog, and it
    // must not lay a full-page backdrop over the masthead/page — that is what
    // let the modal version silently block the nav links.
    expect(drawer.tagName).toBe('ASIDE');
    expect(drawer.getAttribute('role')).not.toBe('dialog');
    expect(drawer.getAttribute('aria-modal')).toBeNull();
    expect(drawer.getAttribute('aria-labelledby')).toBe('help-title');
    expect(help.root.querySelector('.help-backdrop')).toBeNull();
    expect(help.root.querySelector('.help-layer')).toBeNull();
    expect(
      drawer.querySelector('[data-testid="help-topic"]')?.textContent,
    ).toContain('Pipeline');
    expect(
      drawer.querySelector('[data-testid="help-topic"]')
        ?.getAttribute('aria-live'),
    ).toBe('polite');

    // Focus moves into the panel on open, but it does not trap: the Help
    // trigger and every masthead link stay reachable while it is open.
    const close = findButton(drawer, 'Close help');
    await vi.waitFor(() => expect(document.activeElement).toBe(close));

    // Navigate by CLICKING the real masthead link (not the router API) while
    // the drawer is open, and confirm the route-aware topic updates. A modal
    // that covered the masthead would defeat this in the real UI.
    const topicsLink = mastheadLink(help.root, 'Topics');
    topicsLink.click();
    help.tick();
    await vi.waitFor(() => {
      help.tick();
      expect(help.router.url).toBe('/topics');
      expect(
        drawer.querySelector('[data-testid="help-topic"]')?.textContent,
      ).toContain('Topics');
    });

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
    expect(drawer.textContent).toContain('choosing-whp-video-topic');
    expect(drawer.textContent).toContain(
      '.agents/skills/choosing-whp-video-topic/SKILL.md',
    );
    expect(drawer.textContent).toContain('writing-whp-youtube-scripts');
    expect(drawer.textContent).toContain(
      '.agents/skills/writing-whp-youtube-scripts/SKILL.md',
    );

    // Help mode annotates the masthead: a cue on the nav explains that region.
    let navCue: HTMLButtonElement | null = null;
    await vi.waitFor(() => {
      help.tick();
      navCue = help.root.querySelector<HTMLButtonElement>(
        '.masthead nav .help-target-cue[data-help-cue="masthead.nav"]',
      );
      expect(navCue).not.toBeNull();
    });
    navCue!.click();
    await vi.waitFor(() => {
      help.tick();
      expect(
        drawer.querySelector('[data-testid="help-component"]')?.textContent,
      ).toContain('Workbench navigation');
    });

    // "Page overview" clears the selection and restores the page goal.
    findButton(drawer, '← Page overview').click();
    await vi.waitFor(() => {
      help.tick();
      expect(drawer.querySelector('[data-testid="help-component"]')).toBeNull();
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
