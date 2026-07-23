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
import type {
  DaemonClient,
  CreateIdeaInput,
  IdeaRecord,
  OperationName,
  OperationRecord,
  OperationResult,
  StreamEventsOptions,
  UpdateIdeaInput,
} from '../api/client';
import { App } from '../app';
import appTemplate from '../app.html?raw';
import appStyles from '../app.scss?raw';
import { routes } from '../app.routes';
import { STUDIO_SESSION, StudioSession } from '../studio-session';

const GATES = [
  'game_play_centrality',
  'human_revelation',
  'recognized_payoff',
  'evidence_path',
  'production_reality',
  'portfolio_fit',
] as const;

interface Submission {
  id: string;
  operation: OperationName;
  inputs: unknown;
}

class TopicClientStub {
  private sequence = 0;
  private ideas: IdeaRecord[] = [];
  readonly submissions: Submission[] = [];

  readonly listIdeas = vi.fn(async () => [...this.ideas]);
  readonly createIdea = vi.fn(async (
    input: CreateIdeaInput,
  ): Promise<IdeaRecord> => {
    const idea: IdeaRecord = {
      id: `idea-${++this.sequence}`,
      text: input.text,
      source: input.source,
      status: input.status ?? 'open',
      createdAt: `2026-07-23T12:00:${String(this.sequence).padStart(2, '0')}.000Z`,
    };
    this.ideas = [idea, ...this.ideas];
    return idea;
  });
  readonly updateIdea = vi.fn(async (
    id: string,
    input: UpdateIdeaInput,
  ): Promise<IdeaRecord> => {
    const current = this.ideas.find((idea) => idea.id === id);
    if (!current) throw new Error(`idea not found: ${id}`);
    const updated = { ...current, ...input };
    this.ideas = this.ideas.map((idea) => idea.id === id ? updated : idea);
    return updated;
  });
  readonly deleteIdea = vi.fn(async (id: string) => {
    this.ideas = this.ideas.filter((idea) => idea.id !== id);
  });
  readonly submitOp = vi.fn(async (
    operation: OperationName,
    inputs: unknown,
  ) => {
    const id = `op-${++this.sequence}`;
    this.submissions.push({ id, operation, inputs });
    return { id };
  });
  readonly streamEvents = vi.fn(async (
    _id: string,
    options: StreamEventsOptions,
  ) => {
    await options.onDone();
  });
  readonly getOp = vi.fn(async (id: string): Promise<OperationRecord> => ({
    id,
    operation: this.submission(id).operation,
    state: 'completed',
    stalled: false,
    envelopeJson: '{}',
    jobDir: `/tmp/${id}`,
    threadId: `thread-${id}`,
    retryOf: null,
    resumedFrom: null,
    createdAt: '2026-07-23T12:00:00.000Z',
    startedAt: '2026-07-23T12:00:00.000Z',
    finishedAt: '2026-07-23T12:00:01.000Z',
    inputTokens: 10,
    cachedInputTokens: 0,
    outputTokens: 5,
    reasoningOutputTokens: 0,
    usageAvailable: 1,
    error: null,
  }));
  readonly getResult = vi.fn(async (id: string): Promise<OperationResult> => {
    const { operation } = this.submission(id);
    if (operation === 'ideate') {
      return {
        kind: 'schema',
        value: {
          status: 'complete',
          cards: [{
            subject: 'Voluntary obstacles',
            angle_markdown: 'Why harder rules can make effort feel meaningful.',
            seed: 'Why players choose harsher rules',
          }],
          guardrail_markdown: null,
        },
        guardrail: null,
      };
    }
    if (operation === 'quick-gate-check') {
      return {
        kind: 'schema',
        value: {
          status: 'complete',
          verdict: 'pass',
          gates: GATES.map((gate) => ({
            gate,
            verdict: 'pass',
            reason_markdown: `${gate} has a clear path.`,
          })),
          guardrail_markdown: null,
        },
        guardrail: null,
      };
    }
    throw new Error(`unexpected operation: ${operation}`);
  });

  private submission(id: string): Submission {
    const submission = this.submissions.find((item) => item.id === id);
    if (!submission) throw new Error(`submission not found: ${id}`);
    return submission;
  }
}

interface MountedTopics {
  application: ApplicationRef;
  component: ComponentRef<App>;
  root: HTMLElement;
  router: Router;
  client: TopicClientStub;
  tick(): void;
  destroy(): void;
}

const mounted: MountedTopics[] = [];

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.destroy();
  document.body.replaceChildren();
  globalThis.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('routed Topics composition', () => {
  it('captures an idea, ideates cards, changes status, and gate-checks all six gates', async () => {
    const topics = await mountTopics();

    expect(topics.root.querySelector('app-topics-page')).not.toBeNull();

    enterText(
      topics.root.querySelector('[data-testid="idea-capture-input"]'),
      'Why players choose harsher rules',
    );
    topics.tick();
    findButton(topics.root, 'Capture idea').click();
    await vi.waitFor(() => {
      topics.tick();
      expect(topics.root.querySelector('[data-testid="idea-list"]')?.textContent)
        .toContain('Why players choose harsher rules');
    });
    expect(topics.client.createIdea).toHaveBeenCalledWith({
      text: 'Why players choose harsher rules',
      source: 'inbox',
    });

    const capturedCard = findCard(
      topics.root,
      'Why players choose harsher rules',
    );
    const status = capturedCard.querySelector<HTMLSelectElement>(
      'select[aria-label^="Status for"]',
    );
    if (!status) throw new Error('idea status control was not rendered');
    status.value = 'promoted';
    status.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => {
      topics.tick();
      expect(topics.client.updateIdea).toHaveBeenCalledWith(
        'idea-1',
        { status: 'promoted' },
      );
    });

    const selected = capturedCard.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    if (!selected) throw new Error('idea selection control was not rendered');
    selected.checked = true;
    selected.dispatchEvent(new Event('change', { bubbles: true }));
    enterText(
      topics.root.querySelector('[data-testid="ideate-free-text"]'),
      'Look for the human meaning of chosen difficulty.',
    );
    topics.tick();
    findButton(topics.root, 'Ideate angles').click();

    await vi.waitFor(() => {
      topics.tick();
      const results = topics.root.querySelector(
        '[data-testid="ideate-results"]',
      );
      expect(results?.textContent).toContain('Voluntary obstacles');
      expect(results?.textContent).toContain(
        'Why harder rules can make effort feel meaningful.',
      );
    });
    expect(topics.client.submissions[0]).toMatchObject({
      operation: 'ideate',
      inputs: {
        idea_text: expect.stringContaining('Why players choose harsher rules'),
        user_constraints: {},
      },
    });
    expect(topics.client.createIdea).toHaveBeenCalledWith({
      text: 'Voluntary obstacles\n\nWhy harder rules can make effort feel meaningful.',
      source: 'ideate',
    });

    findButton(capturedCard, 'Gate-check').click();
    await vi.waitFor(() => {
      topics.tick();
      const result = capturedCard.querySelector(
        '[data-testid="gate-check-result"]',
      );
      expect(result?.querySelectorAll('[data-testid="gate-chip"]')).toHaveLength(6);
      expect(result?.querySelector('[data-testid="gate-verdict"]')?.textContent)
        .toContain('pass');
    });
    const firstGate = capturedCard.querySelector<HTMLDetailsElement>(
      '[data-testid="gate-chip"]',
    );
    if (!firstGate) throw new Error('gate chip was not rendered');
    firstGate.open = true;
    expect(firstGate.textContent).toContain('has a clear path');
    expect(topics.client.submissions[1]).toMatchObject({
      operation: 'quick-gate-check',
      inputs: {
        idea_text: 'Why players choose harsher rules',
        user_constraints: {},
      },
    });
  });
});

async function mountTopics(): Promise<MountedTopics> {
  await ɵresolveComponentResources(async (url) =>
    url.endsWith('app.html') ? appTemplate : appStyles);
  globalThis.history.replaceState(null, '', '/topics');
  const client = new TopicClientStub();
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
  const topics: MountedTopics = {
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
  mounted.push(topics);
  await router.navigateByUrl('/topics');
  topics.tick();
  await vi.waitFor(() => {
    topics.tick();
    expect(client.listIdeas).toHaveBeenCalledOnce();
  });
  return topics;
}

function enterText(element: Element | null, value: string): void {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error('expected a textarea');
  }
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function findCard(root: Element, text: string): HTMLElement {
  const card = Array.from(
    root.querySelectorAll<HTMLElement>('[data-testid="idea-card"]'),
  ).find((candidate) => candidate.textContent?.includes(text));
  if (!card) throw new Error(`idea card "${text}" was not rendered`);
  return card;
}

function findButton(
  element: Element | null,
  label: string,
): HTMLButtonElement {
  const button = Array.from(
    element?.querySelectorAll<HTMLButtonElement>('button') ?? [],
  ).find((candidate) =>
    candidate.textContent?.replace(/\s+/gu, ' ').trim().startsWith(label));
  if (!button) throw new Error(`button ${label} was not rendered`);
  return button;
}
