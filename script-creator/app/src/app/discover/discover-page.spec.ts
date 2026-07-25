import '@angular/compiler';
import {
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type ApplicationRef,
  type ComponentRef,
  type Provider,
  type Signal,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateIdeaInput,
  DaemonClient,
  IdeaRecord,
  OperationName,
  OperationRecord,
  OperationResult,
  OperationState,
  StreamEventsOptions,
} from '../api/client';
import { MODEL_PREFERENCE_STORAGE_KEY } from '../ops/model-preference';
import {
  ActiveOperationsService,
  type ActiveOp,
} from '../ops/active-operations.service';
import { STUDIO_SESSION, StudioSession } from '../studio-session';
import { DiscoverPage } from './discover-page';

interface Submission {
  id: string;
  operation: OperationName;
  inputs: unknown;
  choice: unknown;
}

const DEFAULT_CARD = {
  subject: 'Voluntary obstacles',
  angle_markdown: 'Why harder rules can make effort feel meaningful.',
  seed: 'Why players choose harsher rules',
} as const;

class DiscoverClientStub {
  private sequence = 0;
  private blockedStream: Promise<void> | null = null;
  private ideateState: OperationState = 'completed';
  private ideateResult: OperationResult = schemaResult([DEFAULT_CARD]);
  readonly submissions: Submission[] = [];

  readonly listTopicRuns = vi.fn(async () => []);
  readonly submitOp = vi.fn(async (
    operation: OperationName,
    inputs: unknown,
    choice?: unknown,
  ) => {
    const id = `op-${++this.sequence}`;
    this.submissions.push({ id, operation, inputs, choice });
    return { id };
  });
  readonly streamEvents = vi.fn(async (
    _id: string,
    options: StreamEventsOptions,
  ) => {
    const blocked = this.blockedStream;
    this.blockedStream = null;
    if (blocked) await blocked;
    await options.onDone();
  });
  readonly getOp = vi.fn(async (id: string): Promise<OperationRecord> => ({
    id,
    operation: 'ideate',
    state: this.ideateState,
    stalled: false,
    envelopeJson: '{}',
    jobDir: `/tmp/${id}`,
    threadId: `thread-${id}`,
    retryOf: null,
    resumedFrom: null,
    createdAt: '2026-07-24T12:00:00.000Z',
    startedAt: '2026-07-24T12:00:00.000Z',
    finishedAt: '2026-07-24T12:00:01.000Z',
    inputTokens: 10,
    cachedInputTokens: 0,
    outputTokens: 5,
    reasoningOutputTokens: 0,
    usageAvailable: 1,
    error: this.ideateState === 'completed' ? null : 'operation failed',
  }));
  readonly getResult = vi.fn(async (): Promise<OperationResult> =>
    this.ideateResult);
  readonly createIdea = vi.fn(async (
    input: CreateIdeaInput,
  ): Promise<IdeaRecord> => ({
    id: `idea-${++this.sequence}`,
    text: input.text,
    source: input.source,
    status: input.status ?? 'open',
    latestCheck: null,
    createdAt: '2026-07-24T12:05:00.000Z',
  }));
  readonly cancel = vi.fn(async (id: string) => ({ id }));

  setIdeateOutcome(state: OperationState, result: OperationResult): void {
    this.ideateState = state;
    this.ideateResult = result;
  }

  pauseNextStream(): () => void {
    let release = (): void => undefined;
    this.blockedStream = new Promise<void>((resolve) => {
      release = resolve;
    });
    return release;
  }
}

class ActiveOpsStub {
  readonly active = signal<readonly ActiveOp[]>([]);
  readonly activeOperations: Signal<readonly ActiveOp[]> = this.active;
  ensureStarted(): void { /* no-op */ }
}

interface Mounted {
  application: ApplicationRef;
  component: ComponentRef<DiscoverPage>;
  root: HTMLElement;
  client: DiscoverClientStub;
  tick(): void;
  destroy(): void;
}

const mounted: Mounted[] = [];

afterEach(() => {
  vi.useRealTimers();
  while (mounted.length > 0) mounted.pop()?.destroy();
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('DiscoverPage', () => {
  it('renders the AI-first cold-start front door with an empty state', async () => {
    const view = await mountDiscover();

    expect(view.root.querySelector('[data-testid="discover-page"]'))
      .not.toBeNull();
    expect(view.root.querySelector('h1')?.textContent)
      .toContain('Let the studio pitch your next video');
    expect(view.root.querySelector('[data-testid="discover-empty"]')?.textContent)
      .toContain('No suggestions yet');
    expect(view.root.querySelector('[data-testid="suggest-ideas"]')?.textContent)
      .toContain('Suggest ideas');
    // The deep path embeds the shared full-run panel, run cold.
    expect(view.root.querySelector('app-full-run-panel')).not.toBeNull();
    expect(view.root.querySelector('[data-testid="full-run-idea"]'))
      .not.toBeNull();
  });

  it('launches a cold ideate with empty idea_text through the OpTracker and renders cards', async () => {
    const view = await mountDiscover();

    enterText(
      view.root.querySelector('[data-testid="discover-constraints"]'),
      'Audience: curious adults. Avoid: hardware reviews.',
    );
    view.tick();
    clickTestId(view.root, 'suggest-ideas');

    await vi.waitFor(() => {
      view.tick();
      const results = view.root.querySelector('[data-testid="discover-results"]');
      expect(results?.textContent).toContain('Voluntary obstacles');
      expect(results?.textContent).toContain(
        'Why harder rules can make effort feel meaningful.',
      );
    });

    expect(view.client.submissions).toHaveLength(1);
    expect(view.client.submissions[0]).toMatchObject({
      operation: 'ideate',
      inputs: {
        idea_text: '',
        user_constraints: {
          notes: 'Audience: curious adults. Avoid: hardware reviews.',
        },
      },
    });
    // The angle is rendered from Markdown into HTML (not raw text).
    expect(
      view.root.querySelector('[data-testid="suggestion-angle"] p'),
    ).not.toBeNull();
    expect(
      view.root.querySelectorAll('[data-testid="suggestion-card"]'),
    ).toHaveLength(1);
  });

  it('sends an empty user_constraints object on a true cold start', async () => {
    const view = await mountDiscover();

    clickTestId(view.root, 'suggest-ideas');
    await vi.waitFor(() => {
      view.tick();
      expect(view.client.submissions).toHaveLength(1);
    });

    expect(view.client.submissions[0]).toMatchObject({
      operation: 'ideate',
      inputs: { idea_text: '', user_constraints: {} },
    });
  });

  it('carries the persisted model preference into the ideate submit', async () => {
    localStorage.setItem(
      MODEL_PREFERENCE_STORAGE_KEY,
      JSON.stringify({ default: { model: 'gpt-5.6-sol', effort: 'xhigh' } }),
    );
    const view = await mountDiscover();

    clickTestId(view.root, 'suggest-ideas');
    await vi.waitFor(() => {
      view.tick();
      expect(view.client.submitOp).toHaveBeenCalledWith(
        'ideate',
        expect.anything(),
        { model: 'gpt-5.6-sol', effort: 'xhigh' },
      );
    });
  });

  it('captures a suggestion into the Topics inbox as an ideated idea', async () => {
    const view = await mountDiscover();

    clickTestId(view.root, 'suggest-ideas');
    await vi.waitFor(() => {
      view.tick();
      expect(view.root.querySelector('[data-testid="suggestion-card"]'))
        .not.toBeNull();
    });

    const card = view.root.querySelector('[data-testid="suggestion-card"]');
    clickTestId(card, 'send-to-inbox');
    await vi.waitFor(() => {
      view.tick();
      expect(view.client.createIdea).toHaveBeenCalledWith({
        text: 'Voluntary obstacles\n\nWhy harder rules can make effort feel meaningful.',
        source: 'ideate',
      });
      expect(
        card?.querySelector('[data-testid="send-to-inbox"]')?.textContent,
      ).toContain('Sent to inbox');
    });
    expect(
      card?.querySelector<HTMLButtonElement>('[data-testid="send-to-inbox"]')
        ?.disabled,
    ).toBe(true);
  });

  it('shows a busy state while the studio is thinking', async () => {
    const view = await mountDiscover();
    const release = view.client.pauseNextStream();

    clickTestId(view.root, 'suggest-ideas');
    await vi.waitFor(() => {
      view.tick();
      expect(view.client.submitOp).toHaveBeenCalledOnce();
    });

    const button = view.root.querySelector<HTMLButtonElement>(
      '[data-testid="suggest-ideas"]',
    );
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Suggesting…');
    expect(view.root.querySelector('[data-testid="discover-empty"]')?.textContent)
      .toContain('Sketching subjects and angles');

    release();
    await vi.waitFor(() => {
      view.tick();
      expect(view.root.querySelector('[data-testid="suggestion-card"]'))
        .not.toBeNull();
      expect(
        view.root.querySelector<HTMLButtonElement>(
          '[data-testid="suggest-ideas"]',
        )?.disabled,
      ).toBe(false);
    });
  });

  it('surfaces a failed ideate as a clear error state', async () => {
    const view = await mountDiscover();
    view.client.setIdeateOutcome('failed', {
      kind: 'failed',
      error: 'the studio could not reach the topic skill',
    });

    clickTestId(view.root, 'suggest-ideas');
    await vi.waitFor(() => {
      view.tick();
      expect(view.root.querySelector('[data-testid="discover-error"]')?.textContent)
        .toContain('the studio could not reach the topic skill');
    });
    expect(view.root.querySelector('[data-testid="suggestion-card"]')).toBeNull();
    expect(view.root.querySelector('[data-testid="discover-empty"]')?.textContent)
      .toContain('No angle cards came back');
  });

  it('surfaces a guardrail decline with the skill guidance', async () => {
    const view = await mountDiscover();
    view.client.setIdeateOutcome('completed', {
      kind: 'schema',
      value: {
        status: 'declined',
        guardrail_markdown: 'Give the studio at least a rough audience to aim at.',
      },
      guardrail: null,
    });

    clickTestId(view.root, 'suggest-ideas');
    await vi.waitFor(() => {
      view.tick();
      expect(view.root.querySelector('[data-testid="discover-error"]')?.textContent)
        .toContain('Give the studio at least a rough audience to aim at.');
    });
    expect(view.root.querySelector('[data-testid="suggestion-card"]')).toBeNull();
  });

  it('shows a send failure on the card, not under the suggest header', async () => {
    const view = await mountDiscover();

    clickTestId(view.root, 'suggest-ideas');
    await vi.waitFor(() => {
      view.tick();
      expect(view.root.querySelector('[data-testid="suggestion-card"]'))
        .not.toBeNull();
    });

    view.client.createIdea.mockRejectedValueOnce(new Error('inbox is offline'));
    const card = view.root.querySelector('[data-testid="suggestion-card"]');
    clickTestId(card, 'send-to-inbox');

    await vi.waitFor(() => {
      view.tick();
      expect(card?.querySelector('[data-testid="send-error"]')?.textContent)
        .toContain('inbox is offline');
    });
    // The per-card failure must NOT surface under the suggest-launch header.
    expect(view.root.querySelector('[data-testid="discover-error"]')).toBeNull();
    const sendButton = card?.querySelector<HTMLButtonElement>(
      '[data-testid="send-to-inbox"]',
    );
    expect(sendButton?.textContent).toContain('Send to inbox');
    expect(sendButton?.disabled).toBe(false);
  });

  it('cancels an in-flight ideate when the view is destroyed', async () => {
    const view = await mountDiscover();
    const release = view.client.pauseNextStream();

    clickTestId(view.root, 'suggest-ideas');
    // streamEvents is called only after the tracker assigns the op id, so
    // waiting on it guarantees a cancellable id exists on destroy.
    await vi.waitFor(() => {
      view.tick();
      expect(view.client.streamEvents).toHaveBeenCalledOnce();
    });

    const opId = view.client.submissions[0]?.id;
    view.destroy();

    expect(view.client.cancel).toHaveBeenCalledWith(opId);
    release();
  });
});

describe('Discover inline processing chip', () => {
  it('renders the chip in the launcher while an ideate op runs', async () => {
    const activeOps = new ActiveOpsStub();
    activeOps.active.set([
      { id: 'op-5', name: 'ideate', state: 'running', stalled: false },
    ]);
    const view = await mountDiscover(new DiscoverClientStub(), [
      { provide: ActiveOperationsService, useValue: activeOps },
    ]);
    view.tick();

    const chip = view.root.querySelector(
      '.suggest-launcher sc-processing-chip [data-testid="processing-chip"]',
    );
    expect(chip).toBeTruthy();
    expect(chip?.textContent).toContain('In Processing');

    view.destroy();
  });
});

async function mountDiscover(
  client = new DiscoverClientStub(),
  extraProviders: Provider[] = [],
): Promise<Mounted> {
  const session = new StudioSession(client as unknown as DaemonClient);
  const application = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: STUDIO_SESSION, useValue: session },
      ...extraProviders,
    ],
  });
  const root = document.createElement('div');
  document.body.append(root);
  const component = createComponent(DiscoverPage, {
    environmentInjector: application.injector,
    hostElement: root,
  });
  application.attachView(component.hostView);
  let torn = false;
  const view: Mounted = {
    application,
    component,
    root,
    client,
    tick: () => {
      application.tick();
      component.changeDetectorRef.detectChanges();
    },
    destroy: () => {
      if (torn) return;
      torn = true;
      application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      root.remove();
    },
  };
  view.tick();
  await vi.waitFor(() => {
    view.tick();
    expect(client.listTopicRuns).toHaveBeenCalled();
  });
  mounted.push(view);
  return view;
}

function schemaResult(
  cards: ReadonlyArray<{
    subject: string;
    angle_markdown: string;
    seed: string;
  }>,
): OperationResult {
  return {
    kind: 'schema',
    value: { status: 'complete', cards, guardrail_markdown: null },
    guardrail: null,
  };
}

function enterText(element: Element | null, value: string): void {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error('expected a textarea');
  }
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickTestId(root: Element | null, testId: string): void {
  const button = root?.querySelector<HTMLButtonElement>(
    `[data-testid="${testId}"]`,
  );
  if (!button) throw new Error(`button "${testId}" was not rendered`);
  button.click();
}
