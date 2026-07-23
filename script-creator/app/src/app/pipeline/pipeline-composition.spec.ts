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

const PIPELINE_STATES = [
  'idea',
  'candidate',
  'selected',
  'architecture',
  'architecture-approved',
  'prototyping',
  'creative-approved',
  'production',
  'record-ready',
  'recorded',
  'published',
] as const;

const PIPELINE = [
  {
    episodeSlug: 'voluntary-obstacles',
    state: 'architecture',
    milestone: 'selected',
    ref: 'whp-youtube/topics/voluntary-obstacles.md',
    draftId: 'draft-architecture-1',
    title: 'Why We Make Games Harder',
    creativePhase: 'architecture',
  },
  {
    episodeSlug: 'the-queue-game',
    state: 'candidate',
    milestone: 'candidate',
    ref: 'whp-youtube/topics/the-queue-game.md',
    draftId: null,
    title: null,
    creativePhase: null,
  },
  {
    episodeSlug: 'why-ai-cheats',
    state: 'published',
    milestone: 'published',
    ref: 'whp-youtube/episodes/01-why-ai-cheats.md',
    draftId: null,
    title: null,
    creativePhase: null,
  },
];

class PipelineClientStub {
  readonly getPipeline = vi.fn(async () => PIPELINE);
}

interface MountedPipeline {
  application: ApplicationRef;
  component: ComponentRef<App>;
  root: HTMLElement;
  router: Router;
  client: PipelineClientStub;
  tick(): void;
  destroy(): void;
}

const mounted: MountedPipeline[] = [];

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.destroy();
  document.body.replaceChildren();
  globalThis.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('routed Pipeline composition', () => {
  it('renders every lifecycle column and places merged pipeline cards', async () => {
    const pipeline = await mountPipeline();

    expect(pipeline.root.querySelector('app-pipeline-page')).not.toBeNull();
    expect(pipeline.client.getPipeline).toHaveBeenCalledOnce();
    expect(
      Array.from(
        pipeline.root.querySelectorAll<HTMLElement>(
          '[data-testid="pipeline-column"]',
        ),
      ).map((column) => column.dataset['pipelineState']),
    ).toEqual(PIPELINE_STATES);

    const architecture = findColumn(pipeline.root, 'architecture');
    expect(architecture.textContent).toContain('Why We Make Games Harder');
    expect(architecture.textContent).toContain('Draft · architecture');
    expect(findColumn(pipeline.root, 'candidate').textContent)
      .toContain('The Queue Game');
    expect(findColumn(pipeline.root, 'published').textContent)
      .toContain('Why AI Cheats');
    expect(
      pipeline.root.querySelectorAll('[data-testid="pipeline-card"]'),
    ).toHaveLength(3);
  });

  it('opens draft-backed cards in Studio and repo-only cards in Topics', async () => {
    const pipeline = await mountPipeline();
    const navigate = vi.spyOn(pipeline.router, 'navigate')
      .mockResolvedValue(true);

    findCard(pipeline.root, 'voluntary-obstacles').click();
    await vi.waitFor(() => {
      pipeline.tick();
      expect(navigate).toHaveBeenCalledWith(['/'], {
        queryParams: { draft: 'draft-architecture-1' },
      });
    });

    navigate.mockClear();
    findCard(pipeline.root, 'the-queue-game').click();
    await vi.waitFor(() => {
      pipeline.tick();
      expect(navigate).toHaveBeenCalledWith(['/topics']);
    });
  });
});

async function mountPipeline(): Promise<MountedPipeline> {
  await ɵresolveComponentResources(async (url) =>
    url.endsWith('app.html') ? appTemplate : appStyles);
  globalThis.history.replaceState(null, '', '/pipeline');
  const client = new PipelineClientStub();
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
  const pipeline: MountedPipeline = {
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
  mounted.push(pipeline);
  await router.navigateByUrl('/pipeline');
  pipeline.tick();
  await vi.waitFor(() => {
    pipeline.tick();
    expect(client.getPipeline).toHaveBeenCalledOnce();
    expect(root.querySelectorAll('[data-testid="pipeline-card"]'))
      .toHaveLength(PIPELINE.length);
  });
  return pipeline;
}

function findColumn(root: Element, state: string): HTMLElement {
  const column = root.querySelector<HTMLElement>(
    `[data-pipeline-state="${state}"]`,
  );
  if (!column) throw new Error(`pipeline column "${state}" was not rendered`);
  return column;
}

function findCard(root: Element, episodeSlug: string): HTMLButtonElement {
  const card = root.querySelector<HTMLButtonElement>(
    `[data-episode-slug="${episodeSlug}"]`,
  );
  if (!card) throw new Error(`pipeline card "${episodeSlug}" was not rendered`);
  return card;
}
