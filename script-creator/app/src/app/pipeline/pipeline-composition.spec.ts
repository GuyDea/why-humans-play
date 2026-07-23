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
  readonly getPipeline = vi.fn(async () => ({
    rows: PIPELINE,
    diagnostics: this.diagnostics,
  }));
  readonly getTopicBrief = vi.fn(async (ref: string) => ({
    ref,
    markdown: ref.includes('/episodes/')
      ? '# Why AI Cheats\n\nRepository episode content.'
      : '# The Queue Game\n\nRepository topic brief.',
  }));
  readonly listIdeas = vi.fn(async () => []);
  readonly listTopicRuns = vi.fn(async () => []);

  constructor(readonly diagnostics: Array<{
    code: 'bad-header' | 'bad-row' | 'empty-required-cell' | 'duplicate-slug';
    line: number | null;
    message: string;
  }> = []) {}
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

  it('opens draft-backed cards in Studio', async () => {
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
  });

  it('opens repo-only cards at the selected Topics brief', async () => {
    const pipeline = await mountPipeline();
    findCard(pipeline.root, 'the-queue-game').click();

    await vi.waitFor(() => {
      pipeline.tick();
      expect(pipeline.root.querySelector('app-topics-page')).not.toBeNull();
      const brief = pipeline.root.querySelector<HTMLElement>(
        '[data-testid="selected-topic-brief"]',
      );
      expect(brief?.textContent).toContain('The Queue Game');
      expect(brief?.textContent).toContain('Repository topic brief.');
      expect(pipeline.client.getTopicBrief).toHaveBeenCalledWith(
        'whp-youtube/topics/the-queue-game.md',
      );
      expect(pipeline.router.url).toContain('topic=the-queue-game');
      expect(pipeline.router.url).toContain(
        'ref=whp-youtube%2Ftopics%2Fthe-queue-game.md',
      );
    });
  });

  it('opens a draft-less episode ref and renders its repository content', async () => {
    const pipeline = await mountPipeline();
    findCard(pipeline.root, 'why-ai-cheats').click();

    await vi.waitFor(() => {
      pipeline.tick();
      const brief = pipeline.root.querySelector<HTMLElement>(
        '[data-testid="selected-topic-brief"]',
      );
      expect(brief?.textContent).toContain('Why AI Cheats');
      expect(brief?.textContent).toContain('Repository episode content.');
      expect(pipeline.client.getTopicBrief).toHaveBeenCalledWith(
        'whp-youtube/episodes/01-why-ai-cheats.md',
      );
      expect(pipeline.router.url).toContain('topic=why-ai-cheats');
      expect(pipeline.router.url).toContain(
        'ref=whp-youtube%2Fepisodes%2F01-why-ai-cheats.md',
      );
    });
  });

  it('renders malformed pipeline diagnostics with their row numbers', async () => {
    const pipeline = await mountPipeline([{
      code: 'duplicate-slug',
      line: 8,
      message: 'Duplicate pipeline episode slug "the-queue-game".',
    }]);

    const diagnostic = pipeline.root.querySelector<HTMLElement>(
      '[data-testid="pipeline-diagnostic"]',
    );
    expect(diagnostic?.textContent).toContain('Row 8');
    expect(diagnostic?.textContent).toContain(
      'Duplicate pipeline episode slug "the-queue-game".',
    );
  });
});

async function mountPipeline(
  diagnostics: ConstructorParameters<typeof PipelineClientStub>[0] = [],
): Promise<MountedPipeline> {
  await ɵresolveComponentResources(async (url) =>
    url.endsWith('app.html') ? appTemplate : appStyles);
  globalThis.history.replaceState(null, '', '/pipeline');
  const client = new PipelineClientStub(diagnostics);
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
