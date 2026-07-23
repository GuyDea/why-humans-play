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
  TopicRunSnapshot,
  TopicRunSummary,
  TopicSummary,
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

const PROGRESS = [
  ['01-frame', 'Record the decision frame and current WHP context.'],
  ['02-mode', 'Select and state the evidence mode.'],
  ['03-signals', 'Collect independent audience-demand, competitive-supply, and timing signals.'],
  ['04-pool', 'Record at least 30 distinct, diverse subjects before ranking.'],
  ['05-angles', 'Develop materially different angles for promising subjects.'],
  ['06-gates', 'Identify opening proof cases and audit every advancing angle against all six hard gates.'],
  ['07-shallow', 'Run a shallow scan and narrow to roughly 8–12 candidates.'],
  ['08-deep', 'Deeply research the finalists with multiple signals.'],
  ['09-shortlist', 'Rank a shortlist of roughly five with the required scorecard.'],
  ['10-packages', 'Test three package promises for each top-three finalist.'],
  ['11-winner', 'Resolve winner status using responsibly supported, winner-eligible finalists.'],
  ['12-audit', 'Complete the output and evidence audit.'],
] as const;

const SUMMARY: TopicSummary = {
  candidates: [
    candidate('Voluntary Obstacles'),
    candidate('The Queue Game'),
    candidate('Unscored Candidate'),
  ],
  shortlist: [
    shortlistEntry('Voluntary Obstacles', 1, 91, 18),
    shortlistEntry('The Queue Game', 2, 84, 24),
    shortlistEntry('Unscored Candidate', 3, null, null),
  ],
  packages: [
    {
      finalist: 'Voluntary Obstacles',
      direction: 'Harder on purpose',
      working_title: 'Why We Make Games Harder Than They Need to Be',
      intended_viewer: 'Players who choose self-imposed rules',
      familiar_markdown: 'A no-hit run.',
      surprise_markdown: 'Constraint can create meaning.',
      visual_promise_markdown: 'The same level under two rule sets.',
      delivered_payoff_markdown: 'Why chosen difficulty changes effort.',
      survives_honestly: true,
      reason_markdown: 'The episode can demonstrate the promise.',
    },
    {
      finalist: 'The Queue Game',
      direction: 'Fair waits',
      working_title: 'Can You Design a Fair Queue?',
      intended_viewer: 'People who hate choosing the wrong line',
      familiar_markdown: 'Two checkout lines.',
      surprise_markdown: 'Speed and fairness split.',
      visual_promise_markdown: 'Queues filling and draining.',
      delivered_payoff_markdown: 'How queue rules shape choice.',
      survives_honestly: false,
      reason_markdown: 'The promise is broader than the evidence.',
    },
  ],
  winner: {
    decision_status: 'winner-selected',
    subject: 'Voluntary Obstacles',
    angle_markdown: 'Why chosen constraints can make effort meaningful.',
    confidence: 'high',
    why_now_markdown: 'It opens a recognizable door into the channel thesis.',
    strongest_package_markdown: 'Why We Make Games Harder Than They Need to Be',
  },
};

interface Submission {
  id: string;
  operation: OperationName;
  inputs: unknown;
}

class TopicClientStub {
  private sequence = 0;
  private ideas: IdeaRecord[] = [];
  private topicRunSnapshots: Array<TopicRunSnapshot | Error> = [];
  private topicRunSnapshotIndex = 0;
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
  readonly registerTopicRun = vi.fn(async (
    opId: string,
  ): Promise<TopicRunSummary> => ({
    id: 'run-1',
    opId,
    state: 'running',
    createdAt: '2026-07-23T12:00:00.000Z',
  }));
  readonly getTopicRun = vi.fn(async (): Promise<TopicRunSnapshot> => {
    const snapshot = this.topicRunSnapshots[
      Math.min(
        this.topicRunSnapshotIndex,
        this.topicRunSnapshots.length - 1,
      )
    ];
    if (!snapshot) throw new Error('topic run snapshots were not configured');
    this.topicRunSnapshotIndex += 1;
    if (snapshot instanceof Error) throw snapshot;
    return snapshot;
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

  queueTopicRun(...snapshots: Array<TopicRunSnapshot | Error>): void {
    this.topicRunSnapshots = snapshots;
    this.topicRunSnapshotIndex = 0;
  }

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
  vi.useRealTimers();
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

  it('advances a full-run checklist and sorts the completed candidate board', async () => {
    const topics = await mountTopics();
    topics.client.queueTopicRun(
      snapshot('running', 'pending'),
      {
        ...snapshot('running', 'pending'),
        progress: PROGRESS.map(([id, text], index) => ({
          id,
          text,
          status: index === 0 ? 'done' : index === 1 ? 'active' : 'pending',
        })),
      },
      {
        ...snapshot('completed', 'done'),
        summary: SUMMARY,
        reportMd: [
          '# Topic report',
          '',
          'A complete evidence-backed recommendation.',
          '',
          '| Signal | Finding |',
          '| --- | --- |',
          '| Search | [Primary source](https://example.com/source) |',
        ].join('\n'),
      },
    );
    vi.useFakeTimers();

    enterText(
      topics.root.querySelector('[data-testid="full-run-idea"]'),
      'Why players choose voluntary obstacles',
    );
    enterText(
      topics.root.querySelector('[data-testid="full-run-constraints"]'),
      'Prefer a visually provable opening.',
    );
    topics.tick();
    findButton(topics.root, 'Launch full run').click();
    await flushAsync();
    topics.tick();

    expect(topics.client.submissions.at(-1)).toEqual({
      id: expect.any(String),
      operation: 'full-topic-run',
      inputs: {
        idea_text: 'Why players choose voluntary obstacles',
        user_constraints: {
          notes: 'Prefer a visually provable opening.',
        },
        progress_transport: 'WHP_PROGRESS/1',
        summary_transport: 'fenced-whp-summary',
      },
    });
    expect(topics.client.registerTopicRun).toHaveBeenCalledWith(
      topics.client.submissions.at(-1)?.id,
    );
    const checklist = topics.root.querySelector('[data-testid="run-checklist"]');
    expect(checklist?.querySelectorAll('[data-testid="checklist-row"]'))
      .toHaveLength(12);
    expect(checklist?.textContent).toContain(PROGRESS[5][1]);
    expect(topics.client.getTopicRun).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_999);
    expect(topics.client.getTopicRun).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    topics.tick();
    expect(topics.client.getTopicRun).toHaveBeenCalledTimes(2);
    expect(
      checklist?.querySelector('[data-progress-id="01-frame"]')
        ?.getAttribute('data-status'),
    ).toBe('done');
    expect(
      checklist?.querySelector('[data-progress-id="02-mode"]')
        ?.getAttribute('data-status'),
    ).toBe('active');

    await vi.advanceTimersByTimeAsync(2_000);
    topics.tick();
    expect(topics.client.getTopicRun).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(topics.client.getTopicRun).toHaveBeenCalledTimes(3);

    const report = topics.root.querySelector('[data-testid="topic-report"]');
    expect(report?.querySelector('h1')?.textContent).toContain('Topic report');
    expect(report?.textContent).toContain(
      'A complete evidence-backed recommendation.',
    );
    expect(report?.querySelectorAll('table tbody tr')).toHaveLength(1);
    expect(report?.querySelector<HTMLAnchorElement>('a')?.href)
      .toBe('https://example.com/source');
    expect(topics.root.querySelector('[data-testid="raw-topic-report"]')?.textContent)
      .toContain('# Topic report');

    const board = topics.root.querySelector('[data-testid="candidate-board"]');
    expect(board).not.toBeNull();
    expect(subjectOrder(board)).toEqual([
      'Voluntary Obstacles',
      'The Queue Game',
      'Unscored Candidate',
    ]);
    findButton(board, 'Demand').click();
    topics.tick();
    expect(subjectOrder(board)).toEqual([
      'The Queue Game',
      'Voluntary Obstacles',
      'Unscored Candidate',
    ]);
    expect(board?.querySelectorAll('[data-testid="candidate-gate-chip"]'))
      .toHaveLength(18);
    const firstCandidateGate = board?.querySelector<HTMLDetailsElement>(
      '[data-testid="candidate-gate-chip"]',
    );
    expect(firstCandidateGate).toBeInstanceOf(HTMLDetailsElement);
    if (firstCandidateGate) {
      firstCandidateGate.open = true;
      expect(firstCandidateGate.textContent).toContain('is supported');
    }

    const packages = topics.root.querySelectorAll<HTMLElement>(
      '[data-testid="package-direction"]',
    );
    expect(packages).toHaveLength(2);
    expect(packages[0]?.dataset['survives']).toBe('true');
    expect(packages[1]?.dataset['survives']).toBe('false');
    const winner = topics.root.querySelector('[data-testid="winner-card"]');
    expect(winner?.textContent).toContain('Voluntary Obstacles');
    expect(winner?.textContent).toContain(
      'Why We Make Games Harder Than They Need to Be',
    );
  });

  it('shows a summary error honestly while preserving the raw report', async () => {
    const topics = await mountTopics();
    topics.client.queueTopicRun({
      ...snapshot('completed', 'done'),
      summary: null,
      summaryError: 'whp-summary block contains malformed JSON',
      reportMd: '# Recoverable report\n\nThe narrative is still available.',
    });

    enterText(
      topics.root.querySelector('[data-testid="full-run-idea"]'),
      'A recoverable run',
    );
    topics.tick();
    findButton(topics.root, 'Launch full run').click();
    await flushAsync();
    topics.tick();

    const error = topics.root.querySelector('[data-testid="summary-error"]');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toContain(
      'whp-summary block contains malformed JSON',
    );
    expect(topics.root.querySelector('[data-testid="topic-report"]')?.textContent)
      .toContain('The narrative is still available.');
    expect(topics.root.querySelector('[data-testid="raw-topic-report"]')?.textContent)
      .toContain('# Recoverable report');
    expect(topics.root.querySelector('[data-testid="candidate-board"]')).toBeNull();
  });

  it('recovers polling after a transient snapshot failure without unlocking launch', async () => {
    const topics = await mountTopics();
    topics.client.queueTopicRun(
      snapshot('running', 'pending'),
      new Error('temporary connection drop'),
      {
        ...snapshot('completed', 'done'),
        summary: SUMMARY,
        reportMd: '# Recovered report',
      },
    );
    vi.useFakeTimers();

    enterText(
      topics.root.querySelector('[data-testid="full-run-idea"]'),
      'A run that outlives a connection drop',
    );
    topics.tick();
    findButton(topics.root, 'Launch full run').click();
    await flushAsync();
    topics.tick();

    await vi.advanceTimersByTimeAsync(2_000);
    topics.tick();
    expect(topics.root.querySelector('[data-testid="run-error"]')?.textContent)
      .toContain('Retrying');
    expect(findButton(topics.root, 'Run in progress').disabled).toBe(true);
    expect(topics.client.submitOp).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2_000);
    topics.tick();
    expect(topics.client.getTopicRun).toHaveBeenCalledTimes(3);
    expect(topics.root.querySelector('[data-testid="topic-report"]')?.textContent)
      .toContain('Recovered report');
    expect(topics.root.querySelector('[data-testid="run-error"]')).toBeNull();
  });

  it('states honestly when a summary error has no raw report', async () => {
    const topics = await mountTopics();
    topics.client.queueTopicRun({
      ...snapshot('completed', 'done'),
      summary: null,
      summaryError: 'whp-summary block is missing',
    });

    enterText(
      topics.root.querySelector('[data-testid="full-run-idea"]'),
      'A run without a report',
    );
    topics.tick();
    findButton(topics.root, 'Launch full run').click();
    await flushAsync();
    topics.tick();

    expect(topics.root.querySelector('[data-testid="summary-error"]')?.textContent)
      .toContain('No raw report was returned');
    expect(topics.root.querySelector('[data-testid="raw-topic-report"]')).toBeNull();
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

function snapshot(
  state: TopicRunSnapshot['state'],
  status: TopicRunSnapshot['progress'][number]['status'],
): TopicRunSnapshot {
  return {
    state,
    progress: PROGRESS.map(([id, text]) => ({ id, text, status })),
  };
}

function candidate(subject: string): TopicSummary['candidates'][number] {
  return {
    subject,
    angle_markdown: `${subject} reveals a human choice through play.`,
    gates: GATES.map((gate) => ({
      gate,
      verdict: 'pass',
      reason_markdown: `${gate} is supported.`,
    })),
    disposition: 'deep-research finalist',
  };
}

function shortlistEntry(
  subject: string,
  rank: number,
  total: number | null,
  demand: number | null,
): TopicSummary['shortlist'][number] {
  return {
    rank,
    subject,
    angle_markdown: `${subject} reveals a human choice through play.`,
    scores: {
      demand: { score: demand, grade: 'A' },
      opening: { score: 13, grade: 'A' },
      package: { score: 17, grade: 'B' },
      satisfaction: { score: 13, grade: 'A' },
      whp: { score: 9, grade: 'A' },
      evidence: { score: 8, grade: 'B' },
      feasibility: { score: 5, grade: 'A' },
    },
    total,
    confidence: 'high',
    decisive_risk_markdown: `${subject} still needs an opening proof case.`,
  };
}

function subjectOrder(board: Element | null): string[] {
  return Array.from(
    board?.querySelectorAll<HTMLElement>('[data-testid="shortlist-subject"]')
      ?? [],
  ).map((subject) => subject.textContent?.trim() ?? '');
}

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
