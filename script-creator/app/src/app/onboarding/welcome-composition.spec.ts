import '@angular/compiler';
import {
  createComponent,
  provideZonelessChangeDetection,
  ɵgetComponentDef,
  ɵresolveComponentResources,
  type ApplicationRef,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DaemonClient,
  DraftSummary,
  PipelineItem,
  TopicRunSummary,
} from '../api/client';
import { App } from '../app';
import appTemplate from '../app.html?raw';
import appStyles from '../app.scss?raw';
import { routes } from '../app.routes';
import { DraftTransfer } from '../drafts/draft-transfer';
import { DraftManagerComponent } from '../drafts/draft-manager.component';
import { RevisionTimeline } from '../drafts/revision-timeline';
import { STUDIO_SESSION, StudioSession } from '../studio-session';
import {
  ONBOARDING_STORAGE_KEY,
  OnboardingState,
} from './onboarding-state';

class WelcomeClientStub {
  topicRuns: TopicRunSummary[] = [];
  drafts: DraftSummary[] = [];
  rows: PipelineItem[] = [];

  readonly listTopicRuns = vi.fn(async () => [...this.topicRuns]);
  readonly list = vi.fn(async () => [...this.drafts]);
  readonly getPipeline = vi.fn(async () => ({
    rows: [...this.rows],
    diagnostics: [],
  }));
  readonly listIdeas = vi.fn(async () => []);
}

interface MountedWelcome {
  application: ApplicationRef;
  component: ComponentRef<App>;
  root: HTMLElement;
  router: Router;
  client: WelcomeClientStub;
  tick(): void;
  destroy(): void;
}

const mounted: MountedWelcome[] = [];

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.destroy();
  document.body.replaceChildren();
  globalThis.history.replaceState(null, '', '/');
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('routed Welcome composition', () => {
  it('renders live progress, routes a Go link, and returns through the masthead', async () => {
    const client = progressedClient();
    const welcome = await mountWelcome('/welcome', client);

    await vi.waitFor(() => {
      welcome.tick();
      expect(welcome.root.querySelector('app-welcome-page')).not.toBeNull();
      expect(checklistStates(welcome.root)).toEqual([
        'done',
        'done',
        'done',
        'pending',
        'pending',
      ]);
    });

    findLink(welcome.root, 'Complete a topic run', 'Go').click();
    await vi.waitFor(() => {
      welcome.tick();
      expect(welcome.router.url).toBe('/topics');
      expect(welcome.root.querySelector('app-topics-page')).not.toBeNull();
    });

    findLink(welcome.root, 'Welcome').click();
    await vi.waitFor(() => {
      welcome.tick();
      expect(welcome.router.url).toBe('/welcome');
      expect(welcome.root.querySelector('app-welcome-page')).not.toBeNull();
    });
  });

  it('persists the rendered dismissal control and suppresses auto-show', async () => {
    const welcome = await mountWelcome('/welcome', new WelcomeClientStub());

    findButton(welcome.root, "Don't show this automatically").click();
    welcome.tick();

    expect(JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? 'null'))
      .toEqual({ dismissedAt: expect.any(String) });
    expect(
      await welcome.application.injector.get(OnboardingState).shouldAutoShow(),
    ).toBe(false);
    expect(welcome.root.textContent).toContain(
      'Welcome will stay available in the masthead.',
    );
  });

  it('auto-routes a fresh default load to Welcome exactly once', async () => {
    const welcome = await mountWelcome(
      '/#nonce=launch-key',
      new WelcomeClientStub(),
    );

    await vi.waitFor(() => {
      welcome.tick();
      expect(welcome.router.url).toBe('/welcome');
    });

    await welcome.router.navigateByUrl('/');
    welcome.tick();
    await Promise.resolve();
    welcome.tick();
    expect(welcome.router.url).toBe('/');
  });

  it('never redirects an explicit non-default navigation', async () => {
    const welcome = await mountWelcome('/topics', new WelcomeClientStub());

    await vi.waitFor(() => {
      welcome.tick();
      expect(welcome.router.url).toBe('/topics');
      expect(welcome.root.querySelector('app-topics-page')).not.toBeNull();
    });
  });
});

async function mountWelcome(
  path: string,
  client: WelcomeClientStub,
): Promise<MountedWelcome> {
  hydrateSignalInputs(DraftManagerComponent, ['client', 'session']);
  hydrateSignalInputs(DraftTransfer, ['manager']);
  hydrateSignalInputs(RevisionTimeline, ['manager']);
  await ɵresolveComponentResources(async (url) =>
    url.endsWith('app.html') ? appTemplate : appStyles);
  globalThis.history.replaceState(null, '', path);
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
  const welcome: MountedWelcome = {
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
  mounted.push(welcome);
  await router.navigateByUrl(path);
  welcome.tick();
  return welcome;
}

function hydrateSignalInputs(component: object, names: string[]): void {
  const definition = ɵgetComponentDef(component as never);
  if (!definition) throw new Error('Angular component definition is unavailable');
  const inputs = { ...definition.inputs };
  const declaredInputs = { ...definition.declaredInputs };
  for (const name of names) {
    inputs[name] = [name, 1, null];
    declaredInputs[name] = name;
  }
  definition.inputs = inputs;
  definition.declaredInputs = declaredInputs;
}

function progressedClient(): WelcomeClientStub {
  const client = new WelcomeClientStub();
  client.topicRuns = [{
    id: 'topic-run-1',
    opId: 'op-1',
    state: 'completed',
    createdAt: '2026-07-25T08:00:00.000Z',
  }];
  client.drafts = [{
    id: 'draft-1',
    episodeSlug: 'voluntary-obstacles',
    title: 'Voluntary Obstacles',
    format: 'narration',
    updatedAt: '2026-07-25T08:10:00.000Z',
  }];
  client.rows = [pipelineRow('architecture-approved')];
  return client;
}

function pipelineRow(state: string): PipelineItem {
  return {
    episodeSlug: 'voluntary-obstacles',
    state,
    milestone: state,
    ref: 'whp-youtube/topics/voluntary-obstacles.md',
    draftId: 'draft-1',
    title: 'Voluntary Obstacles',
    creativePhase: state,
  };
}

function checklistStates(root: Element): string[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>('[data-testid="onboarding-step"]'),
  ).map((step) => step.dataset['state'] ?? '');
}

function findButton(root: Element, label: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`button "${label}" was not rendered`);
  return button;
}

function findLink(
  root: Element,
  label: string,
  nestedLabel?: string,
): HTMLAnchorElement {
  const candidates = Array.from(root.querySelectorAll<HTMLAnchorElement>('a'));
  const link = candidates.find((candidate) => {
    const text = candidate.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const accessibleText = `${text} ${candidate.getAttribute('aria-label') ?? ''}`;
    return accessibleText.includes(label)
      && (nestedLabel === undefined || accessibleText.includes(nestedLabel));
  });
  if (!link) throw new Error(`link "${label}" was not rendered`);
  return link;
}
