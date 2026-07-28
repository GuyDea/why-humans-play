import '@angular/compiler';
import {
  createComponent,
  provideZonelessChangeDetection,
  signal,
  ɵresolveComponentResources,
  type ApplicationRef,
  type ComponentRef,
  type Provider,
  type Signal,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ArtifactExpectedState,
  ArtifactWriteResult,
  CreateDraftInput,
  DaemonClient,
  CreateIdeaInput,
  DraftRecord,
  IdeaRecord,
  OperationName,
  OperationRecord,
  OperationResult,
  PackageDirection,
  StreamEventsOptions,
  TopicHandoffInput,
  TopicHandoffResult,
  TopicRunSnapshot,
  TopicRunSummary,
  TopicSummary,
  UpdateIdeaInput,
} from '../api/client';
import { App } from '../app';
import appTemplate from '../app.html?raw';
import appStyles from '../app.scss?raw';
import { routes } from '../app.routes';
import {
  ActiveOperationsService,
  type ActiveOp,
} from '../ops/active-operations.service';
import { MODEL_PREFERENCE_STORAGE_KEY } from '../ops/model-preference';
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
  ['05-angle-development', 'Complete the routed audience-language and subject-to-angle development for every promising raw subject.'],
  ['06-proof-cases', 'Identify a first-hearing opening proof case and any needed current echo for each finalist.'],
  ['07-gates', 'Audit every advancing angle against all six hard gates.'],
  ['08-shallow', 'Run a shallow scan and narrow to roughly 8–12 candidates.'],
  ['09-deep', 'Deeply research the finalists with multiple signals.'],
  ['10-shortlist', 'Rank a shortlist of roughly five with the required scorecard.'],
  ['11-packages', 'Test three package promises for each top-three finalist.'],
  ['12-winner', 'Resolve winner status: select exactly one final topic only with at least two responsibly supported, winner-eligible finalists; otherwise return the required incomplete result.'],
  ['13-audit', 'Complete the output and evidence audit.'],
] as const;

const SUMMARY: TopicSummary = {
  candidates: [
    candidate('Voluntary Obstacles'),
    candidate('The Queue Game'),
    candidate('Unscored Candidate'),
  ],
  shortlist: [
    {
      ...shortlistEntry('Voluntary Obstacles', 1, 91, 18),
      angle_markdown: 'Why chosen constraints can make effort meaningful.',
    },
    shortlistEntry('The Queue Game', 2, 84, 24),
    shortlistEntry('Unscored Candidate', 3, null, null),
  ],
  packages: [
    ...summaryPackageDirections(
      'Voluntary Obstacles',
      'Why We Make Games Harder Than They Need to Be',
    ),
    ...summaryPackageDirections(
      'The Queue Game',
      'Can You Design a Fair Queue?',
    ),
    ...summaryPackageDirections(
      'Unscored Candidate',
      'The Candidate We Cannot Score Yet',
    ),
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

interface PersistedGateCheck {
  verdict: 'pass' | 'fail' | 'unknown';
  gates: Array<{
    gate: typeof GATES[number];
    verdict: 'pass' | 'fail' | 'unknown';
    reasonMarkdown: string;
  }>;
}

class TopicClientStub {
  private sequence = 0;
  private ideas: Array<
    IdeaRecord & { latestCheck?: PersistedGateCheck | null }
  > = [];
  private packageTests: Array<{
    id: string;
    ideaId: string;
    opId: string;
    directions: PackageDirection[];
    createdAt: string;
    selectedDirectionIndex?: number | null;
    selectedAt?: string | null;
  }> = [];
  private drafts: DraftRecord[] = [];
  private handoffResults: TopicHandoffResult[] = [{
    draftId: 'draft-handoff-1',
    complete: true,
    steps: {
      draftCreated: 'completed',
      artifactWritten: 'completed',
      pipelineUpserted: 'completed',
      ideaPromoted: 'completed',
    },
    error: null,
  }];
  private topicRuns: TopicRunSummary[] = [];
  private topicRunSnapshots: Array<TopicRunSnapshot | Error> = [];
  private topicRunSnapshotIndex = 0;
  private gateState: OperationRecord['state'] = 'completed';
  private gateOutcome: OperationResult | null = null;
  private blockedStream: {
    operation: OperationName;
    promise: Promise<void>;
  } | null = null;
  private blockedIdeaUpdate: Promise<void> | null = null;
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
      latestCheck: null,
      createdAt: `2026-07-23T12:00:${String(this.sequence).padStart(2, '0')}.000Z`,
    };
    this.ideas = [idea, ...this.ideas];
    return idea;
  });
  readonly updateIdea = vi.fn(async (
    id: string,
    input: UpdateIdeaInput,
  ): Promise<IdeaRecord> => {
    const blocked = this.blockedIdeaUpdate;
    this.blockedIdeaUpdate = null;
    if (blocked) await blocked;
    const current = this.ideas.find((idea) => idea.id === id);
    if (!current) throw new Error(`idea not found: ${id}`);
    const updated = { ...current, ...input };
    this.ideas = this.ideas.map((idea) => idea.id === id ? updated : idea);
    return updated;
  });
  readonly deleteIdea = vi.fn(async (id: string) => {
    this.ideas = this.ideas.filter((idea) => idea.id !== id);
  });
  readonly listPackageTests = vi.fn(async (ideaId: string) =>
    this.packageTests.filter((test) => test.ideaId === ideaId));
  readonly createPackageTest = vi.fn(async (
    ideaId: string,
    input: {
      opId: string;
      directions: PackageDirection[];
    },
  ) => {
    const record = {
      id: `package-test-${this.packageTests.length + 1}`,
      ideaId,
      opId: input.opId,
      directions: input.directions,
      createdAt: '2026-07-23T12:10:00.000Z',
    };
    this.packageTests.push(record);
    return record;
  });
  readonly pickPackageDirection = vi.fn(async (
    ideaId: string,
    packageTestId: string,
    directionIndex: number,
  ) => {
    const current = this.packageTests.find(
      (test) => test.ideaId === ideaId && test.id === packageTestId,
    );
    if (!current) throw new Error('package test not found');
    current.selectedDirectionIndex = directionIndex;
    current.selectedAt = '2026-07-23T12:11:00.000Z';
    return { ...current };
  });
  readonly registerTopicRun = vi.fn(async (
    opId: string,
  ): Promise<TopicRunSummary> => {
    const run: TopicRunSummary = {
      id: 'run-1',
      opId,
      state: 'running',
      createdAt: '2026-07-23T12:00:00.000Z',
    };
    this.topicRuns = [run, ...this.topicRuns];
    return run;
  });
  readonly listTopicRuns = vi.fn(async (): Promise<TopicRunSummary[]> =>
    [...this.topicRuns]);
  readonly getTopicRun = vi.fn(async (
    id: string,
  ): Promise<TopicRunSnapshot> => {
    const snapshot = this.topicRunSnapshots[
      Math.min(
        this.topicRunSnapshotIndex,
        this.topicRunSnapshots.length - 1,
      )
    ];
    if (!snapshot) throw new Error('topic run snapshots were not configured');
    this.topicRunSnapshotIndex += 1;
    if (snapshot instanceof Error) throw snapshot;
    this.topicRuns = this.topicRuns.map((run) =>
      run.id === id ? { ...run, state: snapshot.state } : run);
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
    id: string,
    options: StreamEventsOptions,
  ) => {
    const blocked = this.blockedStream;
    if (blocked?.operation === this.submission(id).operation) {
      this.blockedStream = null;
      await blocked.promise;
    }
    await options.onDone();
  });
  readonly getOp = vi.fn(async (id: string): Promise<OperationRecord> => {
    const operation = this.submission(id).operation;
    return {
      id,
      operation,
      state: operation === 'quick-gate-check'
        ? this.gateState
        : 'completed',
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
    };
  });
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
      if (this.gateOutcome !== null) return this.gateOutcome;
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
    if (operation === 'package-test') {
      return {
        kind: 'schema',
        value: {
          status: 'complete',
          directions: [
            {
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
              working_title: 'The Rules Nobody Forced You to Follow',
              intended_viewer: 'People curious about difficult hobbies',
              familiar_markdown: 'A hard-mode menu.',
              surprise_markdown: 'The harder route changes identity.',
              visual_promise_markdown: 'Easy and hard paths split on screen.',
              delivered_payoff_markdown: 'Why effort alone is not the whole story.',
              survives_honestly: false,
              reason_markdown: 'The identity claim outruns the current evidence.',
            },
          ],
          guardrail_markdown: null,
        },
        guardrail: null,
      };
    }
    if (operation === 'handoff-preview') {
      return {
        kind: 'raw',
        markdown: [
          '# Selected topic brief',
          '',
          '**Topic:** Voluntary Obstacles — Why chosen constraints can make effort meaningful.',
          '',
          '## Factual anchors',
          '',
          '- Players voluntarily accept harder rules.',
          '- A no-hit run makes failure legible.',
          '',
          '## Important unknowns',
          '',
          '- Which opening proof case is strongest?',
        ].join('\n'),
      };
    }
    throw new Error(`unexpected operation: ${operation}`);
  });
  readonly list = vi.fn(async () => this.drafts.map((draft) => ({
    id: draft.id,
    episodeSlug: draft.episodeSlug,
    title: draft.title,
    format: draft.format,
    updatedAt: draft.updatedAt,
  })));
  readonly create = vi.fn(async (
    input: CreateDraftInput,
  ): Promise<DraftRecord> => {
    const draft: DraftRecord = {
      id: 'draft-handoff-1',
      ...input,
      updatedAt: '2026-07-23T12:15:00.000Z',
    };
    this.drafts = [draft, ...this.drafts];
    return draft;
  });
  readonly get = vi.fn(async (id: string): Promise<DraftRecord> => {
    const draft = this.drafts.find((candidate) => candidate.id === id);
    if (!draft) throw new Error(`draft not found: ${id}`);
    return draft;
  });
  readonly listRevisions = vi.fn(async () => []);
  readonly writeArtifact = vi.fn(async (
    _path: string,
    _content: string,
    _expectedState: ArtifactExpectedState,
  ): Promise<ArtifactWriteResult> => ({
    conflict: false,
    hash: 'topic-brief-hash',
  }));
  readonly upsertPipelineRow = vi.fn(async () => ({
    conflict: false as const,
    hash: 'pipeline-hash',
  }));
  readonly handoffTopicRun = vi.fn(async (
    _runId: string,
    _input: TopicHandoffInput,
  ): Promise<TopicHandoffResult> =>
    this.handoffResults.shift() ?? {
      draftId: 'draft-handoff-1',
      complete: true,
      steps: {
        draftCreated: 'completed',
        artifactWritten: 'completed',
        pipelineUpserted: 'completed',
        ideaPromoted: 'completed',
      },
      error: null,
    });

  queueTopicRun(...snapshots: Array<TopicRunSnapshot | Error>): void {
    this.topicRunSnapshots = snapshots;
    this.topicRunSnapshotIndex = 0;
  }

  seedTopicRun(
    run: TopicRunSummary,
    snapshot: TopicRunSnapshot,
  ): void {
    this.topicRuns = [run];
    this.queueTopicRun(snapshot);
  }

  seedTopicRuns(...runs: TopicRunSummary[]): void {
    this.topicRuns = runs;
  }

  queueHandoffResults(...results: TopicHandoffResult[]): void {
    this.handoffResults = results;
  }

  seedIdea(idea: IdeaRecord & {
    latestCheck?: PersistedGateCheck | null;
  }): void {
    this.ideas = [idea, ...this.ideas];
  }

  pauseNextStream(operation: OperationName): () => void {
    let release = () => undefined;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.blockedStream = { operation, promise };
    return release;
  }

  pauseNextIdeaUpdate(): () => void {
    let release = () => undefined;
    this.blockedIdeaUpdate = new Promise<void>((resolve) => {
      release = resolve;
    });
    return release;
  }

  setGateOutcome(
    state: OperationRecord['state'],
    result: OperationResult,
  ): void {
    this.gateState = state;
    this.gateOutcome = result;
  }

  private submission(id: string): Submission {
    const submission = this.submissions.find((item) => item.id === id);
    if (!submission) throw new Error(`submission not found: ${id}`);
    return submission;
  }
}

class ActiveOpsStub {
  readonly active = signal<readonly ActiveOp[]>([]);
  readonly activeOperations: Signal<readonly ActiveOp[]> = this.active;
  ensureStarted(): void { /* no-op */ }
}

interface MountedTopics {
  application: ApplicationRef;
  component: ComponentRef<App>;
  root: HTMLElement;
  router: Router;
  client: TopicClientStub;
  session: StudioSession;
  tick(): void;
  destroy(): void;
}

const mounted: MountedTopics[] = [];

afterEach(() => {
  vi.useRealTimers();
  while (mounted.length > 0) mounted.pop()?.destroy();
  document.body.replaceChildren();
  globalThis.history.replaceState(null, '', '/');
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('routed Topics composition', () => {
  it('hydrates a selected durable topic run after a fresh mount', async () => {
    const client = new TopicClientStub();
    client.seedTopicRun(
      {
        id: 'run-durable-1',
        opId: 'op-durable-1',
        state: 'completed',
        createdAt: '2026-07-23T10:30:00.000Z',
      },
      {
        ...snapshot('completed', 'done'),
        summary: SUMMARY,
        reportMd: '# Durable topic report\n\nStill here after reload.',
      },
    );

    const topics = await mountTopics(client);

    await vi.waitFor(() => {
      topics.tick();
      expect(client.listTopicRuns).toHaveBeenCalledOnce();
      expect(topics.root.querySelectorAll(
        '[data-testid="topic-run-row"]',
      )).toHaveLength(1);
    });
    const runRow = topics.root.querySelector('[data-testid="topic-run-row"]');
    expect(runRow?.textContent?.toLowerCase()).toContain('completed');
    expect(runRow?.querySelector('time')?.dateTime)
      .toBe('2026-07-23T10:30:00.000Z');

    findButton(runRow, 'Select run').click();
    await vi.waitFor(() => {
      topics.tick();
      expect(client.getTopicRun).toHaveBeenCalledWith('run-durable-1');
      expect(topics.root.querySelectorAll(
        '[data-testid="shortlist-row"]',
      )).toHaveLength(SUMMARY.shortlist.length);
    });

    expect(topics.root.querySelector('[data-testid="topic-report"]')?.textContent)
      .toContain('Still here after reload.');
    const packageAction = findButton(
      topics.root.querySelector('[data-testid="shortlist-row"]'),
      'Test packages',
    );
    const handoffAction = findButton(
      topics.root.querySelector('[data-testid="winner-card"]'),
      'Preview handoff',
    );
    expect(packageAction.disabled).toBe(false);
    expect(handoffAction.disabled).toBe(false);

    packageAction.click();
    await vi.waitFor(() => {
      topics.tick();
      expect(client.submissions.at(-1)).toMatchObject({
        operation: 'package-test',
        inputs: {
          run_artifacts: {
            summary: SUMMARY,
            reportMd: '# Durable topic report\n\nStill here after reload.',
          },
        },
      });
    });

    handoffAction.click();
    await vi.waitFor(() => {
      topics.tick();
      expect(client.submissions.at(-1)).toMatchObject({
        operation: 'handoff-preview',
        inputs: {
          selected_winner: SUMMARY.winner,
          run_artifacts: {
            summary: SUMMARY,
            reportMd: '# Durable topic report\n\nStill here after reload.',
          },
        },
      });
    });
  });

  it('resumes a durable incomplete handoff after reload without a preview', async () => {
    const client = new TopicClientStub();
    client.seedTopicRun(
      {
        id: 'run-durable-1',
        opId: 'op-durable-1',
        state: 'completed',
        createdAt: '2026-07-23T10:30:00.000Z',
      },
      {
        ...snapshot('completed', 'done'),
        summary: SUMMARY,
        reportMd: '# Durable topic report',
        handoff: {
          resumeKey: 'resume-durable-1',
          ideaId: 'idea-1',
          episodeSlug: 'voluntary-obstacles',
          title: 'Voluntary Obstacles',
          draftId: 'draft-handoff-1',
          complete: false,
          steps: {
            draftCreated: 'completed',
            artifactWritten: 'completed',
            pipelineUpserted: 'pending',
            ideaPromoted: 'pending',
          },
        },
      },
    );
    client.queueHandoffResults({
      draftId: 'draft-handoff-1',
      complete: true,
      steps: {
        draftCreated: 'completed',
        artifactWritten: 'completed',
        pipelineUpserted: 'completed',
        ideaPromoted: 'completed',
      },
      error: null,
    });
    const topics = await mountTopics(client);
    await vi.waitFor(() => {
      topics.tick();
      expect(topics.root.querySelectorAll(
        '[data-testid="topic-run-row"]',
      )).toHaveLength(1);
    });

    findButton(
      topics.root.querySelector('[data-testid="topic-run-row"]'),
      'Select run',
    ).click();
    await vi.waitFor(() => {
      topics.tick();
      expect(topics.root.querySelector(
        '[data-testid="handoff-in-progress"]',
      )?.textContent).toContain('Handoff in progress');
      expect(topics.root.querySelector(
        '[data-testid="handoff-steps"]',
      )?.textContent?.replace(/\s+/gu, ' '))
        .toContain('Pipeline upsertedpending');
    });

    const navigate = vi.spyOn(topics.router, 'navigate')
      .mockResolvedValue(true);
    findButton(
      topics.root.querySelector('[data-testid="handoff-in-progress"]'),
      'Resume',
    ).click();
    await vi.waitFor(() => {
      topics.tick();
      expect(client.handoffTopicRun).toHaveBeenCalledWith(
        'run-durable-1',
        { resumeKey: 'resume-durable-1' },
      );
      expect(topics.root.querySelector(
        '[data-testid="handoff-steps"]',
      )?.textContent?.replace(/\s+/gu, ' '))
        .toContain('Idea promotedcompleted');
    });
    expect(client.submissions).not.toContainEqual(
      expect.objectContaining({ operation: 'handoff-preview' }),
    );
    expect(navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { draft: 'draft-handoff-1' },
    });
  });

  it('lists durable topic runs newest first', async () => {
    const client = new TopicClientStub();
    client.seedTopicRuns(
      {
        id: 'run-older',
        opId: 'op-older',
        state: 'completed',
        createdAt: '2026-07-23T09:00:00.000Z',
      },
      {
        id: 'run-newer',
        opId: 'op-newer',
        state: 'running',
        createdAt: '2026-07-23T11:00:00.000Z',
      },
    );

    const topics = await mountTopics(client);
    await vi.waitFor(() => {
      topics.tick();
      expect(topics.root.querySelectorAll(
        '[data-testid="topic-run-row"]',
      )).toHaveLength(2);
    });

    expect(Array.from(
      topics.root.querySelectorAll<HTMLTimeElement>(
        '[data-testid="topic-run-row"] time',
      ),
    ).map((time) => time.dateTime)).toEqual([
      '2026-07-23T11:00:00.000Z',
      '2026-07-23T09:00:00.000Z',
    ]);
  });

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

    const releaseInboxGate = topics.client.pauseNextStream('quick-gate-check');
    findButton(capturedCard, 'Gate-check').click();
    topics.tick();
    expect(capturedCard.querySelector(
      '[data-testid="gate-check-pending"]',
    )).not.toBeNull();
    expect(topics.session.history()).toHaveLength(1);
    expect(topics.session.history()[0]?.operation).toBe('quick-gate-check');
    await vi.waitFor(() => {
      topics.tick();
      expect(topics.session.history()[0]?.phase()).toBe('streaming');
    });
    releaseInboxGate();
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
    expect(topics.client.updateIdea).toHaveBeenCalledWith(
      'idea-1',
      {
        latestCheckOpId: 'op-4',
        latestCheck: {
          verdict: 'pass',
          gates: GATES.map((gate) => ({
            gate,
            verdict: 'pass',
            reasonMarkdown: `${gate} has a clear path.`,
          })),
        },
      },
    );

    const angleCard = Array.from(
      topics.root.querySelectorAll<HTMLElement>('[data-testid="angle-card"]'),
    ).find((card) => card.textContent?.includes('Voluntary obstacles'));
    if (!angleCard) throw new Error('production ideate angle card was not rendered');
    const releaseAngleGate = topics.client.pauseNextStream('quick-gate-check');
    findButton(angleCard, 'Gate-check').click();
    topics.tick();
    expect(angleCard.querySelector(
      '[data-testid="gate-check-pending"]',
    )).not.toBeNull();
    expect(topics.session.history()).toHaveLength(2);
    releaseAngleGate();
    await vi.waitFor(() => {
      topics.tick();
      expect(angleCard.querySelector(
        '[data-testid="gate-check-result"] [data-testid="gate-verdict"]',
      )?.textContent).toContain('pass');
    });
    expect(topics.client.submissions[2]).toMatchObject({
      operation: 'quick-gate-check',
      inputs: {
        idea_text: [
          'Voluntary obstacles',
          'Why harder rules can make effort feel meaningful.',
        ].join('\n\n'),
        user_constraints: {},
      },
    });
  });

  it('renders and persists a completed gate-check from its rendered button', async () => {
    const client = new TopicClientStub();
    client.seedIdea({
      id: 'idea-rendered-gate',
      text: 'Why chosen difficulty changes effort',
      source: 'inbox',
      status: 'open',
      latestCheck: null,
      createdAt: '2026-07-23T12:00:00.000Z',
    });
    const topics = await mountTopics(client);
    const card = await waitForCard(
      topics,
      'Why chosen difficulty changes effort',
    );
    client.updateIdea.mockClear();
    const releasePersistence = client.pauseNextIdeaUpdate();

    findButton(card, 'Gate-check').click();

    try {
      await vi.waitFor(() => {
        topics.tick();
        const result = card.querySelector(
          '[data-testid="gate-check-result"]',
        );
        expect(result).not.toBeNull();
        expect(result?.querySelectorAll('[data-testid="gate-chip"]'))
          .toHaveLength(6);
        expect(
          result?.querySelector('[data-testid="gate-verdict"]')?.textContent,
        ).toContain('pass');
        expect(client.updateIdea).toHaveBeenCalledTimes(1);
        expect(client.updateIdea).toHaveBeenCalledWith(
          'idea-rendered-gate',
          {
            latestCheckOpId: 'op-1',
            latestCheck: {
              verdict: 'pass',
              gates: GATES.map((gate) => ({
                gate,
                verdict: 'pass',
                reasonMarkdown: `${gate} has a clear path.`,
              })),
            },
          },
        );
        const relaunch = findButton(card, 'Checking');
        expect(relaunch.disabled).toBe(true);
        relaunch.click();
        expect(client.submissions.filter(
          ({ operation }) => operation === 'quick-gate-check',
        )).toHaveLength(1);
      });
    } finally {
      releasePersistence();
    }
    await vi.waitFor(() => {
      topics.tick();
      expect(findButton(card, 'Gate-check').disabled).toBe(false);
    });
  });

  it('hydrates the latest persisted gate-check when ideas reload', async () => {
    const client = new TopicClientStub();
    client.seedIdea({
      id: 'idea-persisted',
      text: 'Why voluntary obstacles change effort',
      source: 'inbox',
      status: 'open',
      createdAt: '2026-07-23T12:00:00.000Z',
      latestCheck: {
        verdict: 'fail',
        gates: GATES.map((gate) => ({
          gate,
          verdict: 'fail',
          reasonMarkdown: `${gate} needs more evidence.`,
        })),
      },
    });

    const topics = await mountTopics(client);
    let card: HTMLElement | null = null;
    await vi.waitFor(() => {
      topics.tick();
      card = Array.from(
        topics.root.querySelectorAll<HTMLElement>(
          '[data-testid="idea-card"]',
        ),
      ).find((candidate) =>
        candidate.textContent?.includes(
          'Why voluntary obstacles change effort',
        )) ?? null;
      expect(card).not.toBeNull();
    });
    if (!card) throw new Error('persisted idea card was not rendered');
    expect(card.querySelector(
      '[data-testid="gate-check-result"] [data-testid="gate-verdict"]',
    )?.textContent).toContain('fail');
    expect(card.querySelectorAll('[data-testid="gate-chip"]')).toHaveLength(6);
  });

  it('renders tracked gate-check guardrail and failure callouts', async () => {
    const guardrailClient = new TopicClientStub();
    guardrailClient.seedIdea({
      id: 'idea-guardrail',
      text: 'A guarded topic',
      source: 'inbox',
      status: 'open',
      latestCheck: null,
      createdAt: '2026-07-23T12:00:00.000Z',
    });
    guardrailClient.setGateOutcome('completed', {
      kind: 'schema',
      value: {
        status: 'declined',
        verdict: 'unknown',
        gates: [],
        guardrail_markdown: 'Narrow the topic before checking it.',
      },
      guardrail: null,
    });
    const guarded = await mountTopics(guardrailClient);
    const guardedCard = await waitForCard(guarded, 'A guarded topic');
    findButton(guardedCard, 'Gate-check').click();
    await vi.waitFor(() => {
      guarded.tick();
      expect(guarded.root.querySelector(
        '[data-testid="operation-guardrail"]',
      )?.textContent).toContain('Narrow the topic before checking it.');
    });

    const failureClient = new TopicClientStub();
    failureClient.seedIdea({
      id: 'idea-failure',
      text: 'A failing topic',
      source: 'inbox',
      status: 'open',
      latestCheck: null,
      createdAt: '2026-07-23T12:00:00.000Z',
    });
    failureClient.setGateOutcome('invalid-output', {
      kind: 'failed',
      error: 'invalid operation result',
    });
    const failed = await mountTopics(failureClient);
    const failedCard = await waitForCard(failed, 'A failing topic');
    findButton(failedCard, 'Gate-check').click();
    await vi.waitFor(() => {
      failed.tick();
      expect(failed.root.querySelector(
        '[data-testid="operation-failure"]',
      )?.textContent).toContain('invalid operation result');
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
        progress_transport: 'WHP_PROGRESS/4',
        summary_transport: 'fenced-whp-summary',
      },
    });
    expect(topics.client.registerTopicRun).toHaveBeenCalledWith(
      topics.client.submissions.at(-1)?.id,
    );
    const checklist = topics.root.querySelector('[data-testid="run-checklist"]');
    expect(checklist?.querySelectorAll('[data-testid="checklist-row"]'))
      .toHaveLength(13);
    expect(checklist?.closest('section')?.textContent)
      .toContain('13-step checklist');
    expect(checklist?.textContent).toContain(PROGRESS[4][1]);
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
    expect(packages).toHaveLength(9);
    expect(packages[0]?.dataset['survives']).toBe('true');
    expect(packages[1]?.dataset['survives']).toBe('false');
    const winner = topics.root.querySelector('[data-testid="winner-card"]');
    expect(winner?.textContent).toContain('Voluntary Obstacles');
    expect(winner?.textContent).toContain(
      'Why We Make Games Harder Than They Need to Be',
    );
    expect(topics.client.listTopicRuns).toHaveBeenCalledTimes(2);
    const launchedRun = topics.root.querySelector(
      '[data-testid="topic-run-row"]',
    );
    expect(launchedRun?.getAttribute('data-selected')).toBe('true');
    expect(launchedRun?.textContent?.toLowerCase()).toContain('completed');
  });

  it('keeps package-test history and confirms a winner handoff into an architecture draft', async () => {
    const topics = await mountTopics();
    const reportMd = '# Completed topic run\n\nThe winner is ready for handoff.';
    topics.client.queueTopicRun({
      ...snapshot('completed', 'done'),
      summary: SUMMARY,
      reportMd,
    });

    enterText(
      topics.root.querySelector('[data-testid="full-run-idea"]'),
      'Why players choose voluntary obstacles',
    );
    topics.tick();
    findButton(topics.root, 'Launch full run').click();
    await flushAsync();
    topics.tick();

    const voluntaryRow = Array.from(
      topics.root.querySelectorAll<HTMLTableRowElement>(
        '[data-testid="shortlist-row"]',
      ),
    ).find((row) => row.textContent?.includes('Voluntary Obstacles'));
    if (!voluntaryRow) throw new Error('winner shortlist row was not rendered');
    findButton(voluntaryRow, 'Test packages').click();

    await vi.waitFor(() => {
      topics.tick();
      expect(topics.root.querySelectorAll(
        '[data-testid="package-test-direction"]',
      )).toHaveLength(2);
    });
    const packageTable = topics.root.querySelector(
      '[data-testid="package-test-table"]',
    );
    expect(Array.from(packageTable?.querySelectorAll('thead th') ?? [])
      .map((header) => header.textContent?.replace(/\s+/gu, ' ').trim()))
      .toEqual([
        'Finalist',
        'Direction',
        'Working title',
        'Intended viewer',
        'Familiar element',
        'Surprise / tension',
        'Visual promise',
        'Delivered payoff',
        'Survives honestly?',
        'Selection',
      ]);
    const testedDirections = packageTable?.querySelectorAll<HTMLElement>(
      '[data-testid="package-test-direction"]',
    );
    expect(testedDirections?.[0]?.dataset['survives']).toBe('true');
    expect(testedDirections?.[1]?.dataset['survives']).toBe('false');
    expect(topics.root.querySelector('[data-testid="package-history"]')?.textContent)
      .toContain('1 saved test');
    findButton(testedDirections?.[1] ?? null, 'Use this package').click();
    await vi.waitFor(() => {
      topics.tick();
      expect(topics.client.pickPackageDirection).toHaveBeenCalledWith(
        'idea-2',
        'package-test-1',
        1,
      );
      expect(testedDirections?.[1]?.dataset['selected']).toBe('true');
    });
    expect(testedDirections?.[0]?.dataset['survives']).toBe('true');
    expect(testedDirections?.[0]?.dataset['selected']).toBe('false');

    expect(topics.client.submissions.at(-1)).toEqual({
      id: expect.any(String),
      operation: 'package-test',
      inputs: {
        idea_text: [
          'Voluntary Obstacles',
          'Why chosen constraints can make effort meaningful.',
        ].join('\n\n'),
        user_constraints: {},
        run_artifacts: {
          summary: SUMMARY,
          reportMd,
        },
      },
    });
    expect(topics.client.createPackageTest).toHaveBeenCalledWith(
      'idea-2',
      {
        opId: topics.client.submissions.at(-1)?.id,
        directions: expect.arrayContaining([
          expect.objectContaining({
            working_title: 'Why We Make Games Harder Than They Need to Be',
            survives_honestly: true,
          }),
        ]),
      },
    );

    findButton(
      topics.root.querySelector('[data-testid="winner-card"]'),
      'Preview handoff',
    ).click();
    await vi.waitFor(() => {
      topics.tick();
      expect(topics.root.querySelector('[data-testid="handoff-preview"]')?.textContent)
        .toContain('Which opening proof case is strongest?');
      expect(topics.root.querySelector('[data-testid="handoff-preview"]')?.textContent)
        .toContain('The Rules Nobody Forced You to Follow');
    });
    expect(topics.client.submissions.at(-1)).toEqual({
      id: expect.any(String),
      operation: 'handoff-preview',
      inputs: {
        selected_winner: SUMMARY.winner,
        run_artifacts: {
          summary: SUMMARY,
          reportMd,
        },
      },
    });

    const navigate = vi.spyOn(topics.router, 'navigate')
      .mockResolvedValue(true);
    findButton(
      topics.root.querySelector('[data-testid="handoff-preview"]'),
      'Confirm handoff',
    ).click();
    await vi.waitFor(() => {
      topics.tick();
      expect(navigate).toHaveBeenCalledWith(['/'], {
        queryParams: { draft: 'draft-handoff-1' },
      });
    });

    expect(topics.client.handoffTopicRun).toHaveBeenCalledWith('run-1', {
      ideaId: 'idea-2',
      episodeSlug: 'voluntary-obstacles',
      title: 'Voluntary Obstacles',
      briefMarkdown: expect.stringContaining('# Selected topic brief'),
      draft: {
        format: 'narration',
        doc: expect.objectContaining({
          metadata: {
            topic: 'Voluntary Obstacles — Why chosen constraints can make effort meaningful.',
            anchors: [
              'Players voluntarily accept harder rules.',
              'A no-hit run makes failure legible.',
            ],
            unknowns: ['Which opening proof case is strongest?'],
            approvedLessons: [],
            creativeStatus: { phase: 'architecture' },
            directionApproved: false,
          },
        }),
      },
    });
    expect(topics.client.create).not.toHaveBeenCalled();
    expect(topics.client.writeArtifact).not.toHaveBeenCalled();
    expect(topics.client.upsertPipelineRow).not.toHaveBeenCalled();
    expect(topics.root.querySelector('[data-testid="handoff-steps"]')?.textContent
      ?.replace(/\s+/gu, ' '))
      .toContain('Idea promotedcompleted');
  });

  it('surfaces a handoff CAS conflict and stops before pipeline promotion', async () => {
    const topics = await mountTopics();
    topics.client.queueTopicRun({
      ...snapshot('completed', 'done'),
      summary: SUMMARY,
      reportMd: '# Completed topic run',
    });
    topics.client.queueHandoffResults({
      draftId: 'draft-handoff-1',
      complete: false,
      steps: {
        draftCreated: 'completed',
        artifactWritten: 'pending',
        pipelineUpserted: 'pending',
        ideaPromoted: 'pending',
      },
      error: 'topic brief conflicts with someone-else-hash. Parked: whp-youtube/topics/topic.md.sc-conflict-1.',
    });

    enterText(
      topics.root.querySelector('[data-testid="full-run-idea"]'),
      'Why players choose voluntary obstacles',
    );
    topics.tick();
    findButton(topics.root, 'Launch full run').click();
    await flushAsync();
    topics.tick();
    findButton(
      topics.root.querySelector('[data-testid="winner-card"]'),
      'Preview handoff',
    ).click();
    await vi.waitFor(() => {
      topics.tick();
      expect(topics.root.querySelector('[data-testid="handoff-preview"]'))
        .not.toBeNull();
    });

    const navigate = vi.spyOn(topics.router, 'navigate')
      .mockResolvedValue(true);
    findButton(
      topics.root.querySelector('[data-testid="handoff-preview"]'),
      'Confirm handoff',
    ).click();
    await vi.waitFor(() => {
      topics.tick();
      const conflict = topics.root.querySelector(
        '[data-testid="handoff-conflict"]',
      );
      expect(conflict?.getAttribute('role')).toBe('alert');
      expect(conflict?.textContent).toContain('someone-else-hash');
      expect(conflict?.textContent).toContain('sc-conflict-1');
    });

    expect(topics.client.handoffTopicRun).toHaveBeenCalledOnce();
    expect(topics.client.create).not.toHaveBeenCalled();
    expect(topics.client.writeArtifact).not.toHaveBeenCalled();
    expect(topics.client.upsertPipelineRow).not.toHaveBeenCalled();
    expect(topics.root.querySelector('[data-testid="handoff-steps"]')?.textContent
      ?.replace(/\s+/gu, ' '))
      .toContain('Draft createdcompleted');
    expect(topics.root.querySelector('[data-testid="handoff-steps"]')?.textContent
      ?.replace(/\s+/gu, ' '))
      .toContain('Artifact writtenpending');
    expect(navigate).not.toHaveBeenCalled();
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

  it('carries the persisted model preference into the full-run submit', async () => {
    localStorage.setItem(
      MODEL_PREFERENCE_STORAGE_KEY,
      JSON.stringify({ default: { model: 'gpt-5.6-sol', effort: 'xhigh' } }),
    );
    const topics = await mountTopics();
    topics.client.queueTopicRun({
      ...snapshot('completed', 'done'),
      summary: null,
      summaryError: 'whp-summary block is missing',
    });

    enterText(
      topics.root.querySelector('[data-testid="full-run-idea"]'),
      'A run that honors the model preference',
    );
    topics.tick();
    findButton(topics.root, 'Launch full run').click();
    await flushAsync();
    topics.tick();

    expect(topics.client.submitOp).toHaveBeenCalledWith(
      'full-topic-run',
      expect.anything(),
      { model: 'gpt-5.6-sol', effort: 'xhigh' },
    );
  });
});

describe('Topics inline processing chip', () => {
  it('shows an inline processing chip in the hero while a topic op runs', async () => {
    const activeOps = new ActiveOpsStub();
    activeOps.active.set([
      { id: 'op-8', name: 'quick-gate-check', state: 'running', stalled: false },
    ]);
    const topics = await mountTopics(new TopicClientStub(), [
      { provide: ActiveOperationsService, useValue: activeOps },
    ]);
    topics.tick();

    const chip = topics.root.querySelector(
      '.topics-hero sc-processing-chip [data-testid="processing-chip"]',
    );
    expect(chip).toBeTruthy();
    expect(chip?.textContent).toContain('In Processing');
  });
});

async function mountTopics(
  client = new TopicClientStub(),
  extraProviders: Provider[] = [],
): Promise<MountedTopics> {
  await ɵresolveComponentResources(async (url) =>
    url.endsWith('app.html') ? appTemplate : appStyles);
  globalThis.history.replaceState(null, '', '/topics');
  const session = new StudioSession(client as unknown as DaemonClient);
  const application = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      { provide: STUDIO_SESSION, useValue: session },
      ...extraProviders,
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
    session,
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

async function waitForCard(
  topics: MountedTopics,
  text: string,
): Promise<HTMLElement> {
  let card: HTMLElement | null = null;
  await vi.waitFor(() => {
    topics.tick();
    card = Array.from(
      topics.root.querySelectorAll<HTMLElement>('[data-testid="idea-card"]'),
    ).find((candidate) => candidate.textContent?.includes(text)) ?? null;
    expect(card).not.toBeNull();
  });
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

function summaryPackageDirections(
  finalist: string,
  title: string,
): TopicSummary['packages'] {
  return Array.from({ length: 3 }, (_, index) => ({
    finalist,
    direction: `Direction ${index + 1}`,
    working_title: index === 0 ? title : `${title} · ${index + 1}`,
    intended_viewer: 'Curious players',
    familiar_markdown: 'A recognizable play situation.',
    surprise_markdown: 'The rules reveal a less obvious human tradeoff.',
    visual_promise_markdown: 'A concrete before-and-after comparison.',
    delivered_payoff_markdown: 'Why the chosen rule changes behavior.',
    survives_honestly: index !== 1,
    reason_markdown: index === 1
      ? 'The promise is broader than the evidence.'
      : 'The episode can demonstrate the promise.',
  }));
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
