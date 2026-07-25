import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DraftSummary,
  PipelineItem,
  TopicRunSummary,
} from '../api/client';
import {
  ONBOARDING_STORAGE_KEY,
  OnboardingPreferenceService,
  OnboardingState,
} from './onboarding-state';

class OnboardingClientStub {
  topicRuns: TopicRunSummary[] = [];
  drafts: DraftSummary[] = [];
  rows: PipelineItem[] = [];

  readonly listTopicRuns = vi.fn(async () => [...this.topicRuns]);
  readonly list = vi.fn(async () => [...this.drafts]);
  readonly getPipeline = vi.fn(async () => ({
    rows: [...this.rows],
    diagnostics: [],
  }));
}

describe('OnboardingState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('marks a fresh install pending and eligible for automatic Welcome', async () => {
    const client = new OnboardingClientStub();
    const state = createState(client);

    const snapshot = await state.load();

    expect(snapshot.isFreshInstall).toBe(true);
    expect(snapshot.steps.map((step) => step.done)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(await state.shouldAutoShow()).toBe(true);
  });

  it('flips completed-run, handoff, approval, and production steps in order', async () => {
    const client = new OnboardingClientStub();
    const state = createState(client);
    client.topicRuns = [topicRun('completed')];

    await expectDone(state, [true, false, false, false, false]);

    client.drafts = [draft()];
    client.rows = [pipelineRow('selected')];
    await expectDone(state, [true, true, false, false, false]);

    client.rows = [pipelineRow('architecture-approved')];
    await expectDone(state, [true, true, true, false, false]);

    client.rows = [pipelineRow('creative-approved')];
    await expectDone(state, [true, true, true, true, false]);

    client.rows = [pipelineRow('production')];
    await expectDone(state, [true, true, true, true, true]);
    expect(client.getPipeline).toHaveBeenCalledTimes(5);
  });

  it('persists dismissal and suppresses automatic Welcome in a fresh store', async () => {
    const client = new OnboardingClientStub();
    const state = createState(client);
    expect(await state.shouldAutoShow()).toBe(true);

    state.dismiss();

    expect(JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? 'null'))
      .toEqual({ dismissedAt: expect.any(String) });
    const reloaded = createState(
      client,
      new OnboardingPreferenceService(),
    );
    expect(await reloaded.shouldAutoShow()).toBe(false);
  });

  it('tolerates malformed stored JSON as an undismissed preference', async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '{not-json');
    const preference = new OnboardingPreferenceService();
    const state = createState(new OnboardingClientStub(), preference);

    expect(preference.isDismissed()).toBe(false);
    expect(await state.shouldAutoShow()).toBe(true);
  });

  it('never classifies an install with a draft or topic run as fresh', async () => {
    const draftClient = new OnboardingClientStub();
    draftClient.drafts = [draft()];
    const draftState = createState(draftClient);
    expect((await draftState.load()).isFreshInstall).toBe(false);
    expect(await draftState.shouldAutoShow()).toBe(false);

    const runClient = new OnboardingClientStub();
    runClient.topicRuns = [topicRun('running')];
    const runState = createState(runClient);
    expect((await runState.load()).isFreshInstall).toBe(false);
    expect(await runState.shouldAutoShow()).toBe(false);
  });
});

function createState(
  client: OnboardingClientStub,
  preference = new OnboardingPreferenceService(),
): OnboardingState {
  return new OnboardingState(client, preference);
}

async function expectDone(
  state: OnboardingState,
  expected: boolean[],
): Promise<void> {
  expect((await state.load()).steps.map((step) => step.done)).toEqual(expected);
}

function topicRun(state: TopicRunSummary['state']): TopicRunSummary {
  return {
    id: 'topic-run-1',
    opId: 'op-1',
    state,
    createdAt: '2026-07-25T08:00:00.000Z',
  };
}

function draft(): DraftSummary {
  return {
    id: 'draft-1',
    episodeSlug: 'voluntary-obstacles',
    title: 'Voluntary Obstacles',
    format: 'narration',
    updatedAt: '2026-07-25T08:10:00.000Z',
  };
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
