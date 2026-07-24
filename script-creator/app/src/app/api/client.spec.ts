import { afterEach, describe, expect, it, vi } from 'vitest';
import { DaemonClient, type SseFrame } from './client';

const BASE_URL = 'http://127.0.0.1:4310';
const NONCE = 'task-3-nonce';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    },
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DaemonClient', () => {
  it('loads the merged pipeline with the nonce', async () => {
    const response = {
      diagnostics: [],
      rows: [{
        episodeSlug: 'voluntary-obstacles',
        state: 'architecture',
        milestone: 'selected',
        ref: 'whp-youtube/topics/voluntary-obstacles.md',
        draftId: 'draft-1',
        title: 'Why We Make Games Harder',
        creativePhase: 'architecture',
      }],
    };
    const fetchMock = vi.fn(async () => jsonResponse(response));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);
    const getPipeline = (
      client as DaemonClient & {
        getPipeline?: () => Promise<typeof response>;
      }
    ).getPipeline;

    expect(getPipeline).toBeTypeOf('function');
    if (!getPipeline) return;
    await expect(getPipeline.call(client)).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/pipeline`,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('x-sc-nonce'))
      .toBe(NONCE);
  });

  it('loads a repository topic brief by its encoded ref', async () => {
    const response = {
      ref: 'whp-youtube/topics/the-queue-game.md',
      markdown: '# The Queue Game\n\nRepository topic brief.',
    };
    const fetchMock = vi.fn(async () => jsonResponse(response));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);

    await expect(client.getTopicBrief(response.ref)).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/topic-brief?ref=${
        encodeURIComponent(response.ref)
      }`,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it('lists durable operation summaries with the nonce', async () => {
    const response = {
      operations: [
        {
          id: 'op-2',
          operation: 'review',
          state: 'completed',
          createdAt: '2026-07-23T11:00:00.000Z',
          finishedAt: '2026-07-23T11:00:05.000Z',
          stalled: false,
          usageAvailable: 1,
          inputTokens: 120,
          cachedInputTokens: 40,
          outputTokens: 30,
          reasoningOutputTokens: 12,
        },
      ],
    };
    const fetchMock = vi.fn(async () => jsonResponse(response));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);

    const listOps = (
      client as DaemonClient & {
        listOps?: () => Promise<typeof response>;
      }
    ).listOps;
    expect(listOps).toBeTypeOf('function');
    if (!listOps) return;
    await expect(listOps.call(client)).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/ops`,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('x-sc-nonce'))
      .toBe(NONCE);
  });

  it('maps operation, draft, and validator calls and authenticates every request', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(`${BASE_URL}/`, () => NONCE);
    const doc = { type: 'doc', attrs: { format: 'narration' }, content: [] };

    await client.submitOp('review', { selection: 'A passage.' });
    await client.getOp('op-1');
    await client.getResult('op-1');
    await client.cancel('op-1');
    await client.resume('op-1', { selection: 'A tighter passage.' });
    await client.list();
    await client.create({
      episodeSlug: 'episode',
      title: 'Episode',
      format: 'narration',
      doc,
    });
    await client.get('draft-1');
    await client.save('draft-1', {
      doc,
      opId: 'op-1',
      disposition: 'accepted',
    });
    await client.listRevisions('draft-1');
    await client.import('# Imported episode');
    await client.export('draft-1');
    await client.writeArtifact(
      'whp-youtube/drafts/episode.md',
      '# Exported episode',
      { expectNew: true },
    );
    await client.validate('whp-youtube/episodes/episode.md');

    expect(fetchMock).toHaveBeenCalledTimes(14);
    expect(fetchMock.mock.calls.map(([input, init]) => ({
      url: input,
      method: init?.method ?? 'GET',
      nonce: new Headers(init?.headers).get('x-sc-nonce'),
      body: init?.body,
    }))).toEqual([
      {
        url: `${BASE_URL}/api/ops`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          operation: 'review',
          inputs: { selection: 'A passage.' },
        }),
      },
      {
        url: `${BASE_URL}/api/ops/op-1`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/ops/op-1/result`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/ops/op-1/cancel`,
        method: 'POST',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/ops/op-1/resume`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ inputs: { selection: 'A tighter passage.' } }),
      },
      {
        url: `${BASE_URL}/api/drafts`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          episodeSlug: 'episode',
          title: 'Episode',
          format: 'narration',
          doc,
        }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft-1`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/draft-1`,
        method: 'PUT',
        nonce: NONCE,
        body: JSON.stringify({
          doc,
          opId: 'op-1',
          disposition: 'accepted',
        }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft-1/revisions`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/import`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ markdown: '# Imported episode' }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft-1/export`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/artifacts`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          path: 'whp-youtube/drafts/episode.md',
          content: '# Exported episode',
          expectedState: { expectNew: true },
        }),
      },
      {
        url: `${BASE_URL}/api/validate`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ path: 'whp-youtube/episodes/episode.md' }),
      },
    ]);
  });

  it('maps the complete learning review and reconciliation API', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);

    await client.listLearningSessions('draft/one');
    await client.listDecisions('draft/one');
    await client.listLessons('draft/one');
    await client.distill('draft/one', 'on-demand');
    await client.distill('draft/one', 'session-end');
    await client.getDistillation('run/one');
    await client.reconcileDistillation('run/one');
    await client.editLesson('draft/one', 'lesson/one', 2, 'Reviewed text.');
    await client.approveLesson('draft/one', 'lesson/one', 3);
    await client.rejectLesson('draft/one', 'lesson/two', 1);
    await client.retireLesson('draft/one', 'lesson/three', 4);
    await client.supersedeLesson(
      'draft/one',
      'lesson/four',
      2,
      'lesson/three',
    );
    await client.markLessonReconciliationAwaiting('resume/one');
    await client.verifyLessonReconciliation('resume/one', 'abc123');

    expect(fetchMock.mock.calls.map(([input, init]) => ({
      url: input,
      method: init?.method ?? 'GET',
      body: init?.body,
    }))).toEqual([
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/learning-sessions`,
        method: 'GET',
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/decisions`,
        method: 'GET',
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/lessons`,
        method: 'GET',
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/distill`,
        method: 'POST',
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/distill/end-session`,
        method: 'POST',
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/distillations/run%2Fone`,
        method: 'GET',
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/distillations/run%2Fone/reconcile`,
        method: 'POST',
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/lessons/lesson%2Fone`,
        method: 'PUT',
        body: JSON.stringify({
          expectedVersion: 2,
          reviewedMarkdown: 'Reviewed text.',
        }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/lessons/lesson%2Fone/approve`,
        method: 'POST',
        body: JSON.stringify({ expectedVersion: 3 }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/lessons/lesson%2Ftwo/reject`,
        method: 'POST',
        body: JSON.stringify({ expectedVersion: 1 }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/lessons/lesson%2Fthree/retire`,
        method: 'POST',
        body: JSON.stringify({ expectedVersion: 4 }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/lessons/lesson%2Ffour/supersede`,
        method: 'POST',
        body: JSON.stringify({
          expectedVersion: 2,
          predecessorLessonId: 'lesson/three',
        }),
      },
      {
        url: `${BASE_URL}/api/lesson-reconciliations/resume%2Fone/awaiting`,
        method: 'POST',
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/lesson-reconciliations/resume%2Fone/verify`,
        method: 'POST',
        body: JSON.stringify({ commit: 'abc123' }),
      },
    ]);
  });

  it('maps idea inbox calls and authenticates every request', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);

    await client.listIdeas();
    await client.createIdea({
      text: 'Why players choose harsher rules',
      source: 'inbox',
    });
    await client.updateIdea('idea/one', { status: 'discarded' });
    await client.deleteIdea('idea/one');

    expect(fetchMock.mock.calls.map(([input, init]) => ({
      url: input,
      method: init?.method ?? 'GET',
      nonce: new Headers(init?.headers).get('x-sc-nonce'),
      body: init?.body,
    }))).toEqual([
      {
        url: `${BASE_URL}/api/ideas`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/ideas`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          text: 'Why players choose harsher rules',
          source: 'inbox',
        }),
      },
      {
        url: `${BASE_URL}/api/ideas/idea%2Fone`,
        method: 'PATCH',
        nonce: NONCE,
        body: JSON.stringify({ status: 'discarded' }),
      },
      {
        url: `${BASE_URL}/api/ideas/idea%2Fone`,
        method: 'DELETE',
        nonce: NONCE,
        body: undefined,
      },
    ]);
  });

  it('maps package-test history and the single topic-handoff command', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);
    const direction = {
      working_title: 'Why We Make Games Harder',
      intended_viewer: 'Players who choose harder rules',
      familiar_markdown: 'A no-hit run.',
      surprise_markdown: 'Constraint can create meaning.',
      visual_promise_markdown: 'One level under two rule sets.',
      delivered_payoff_markdown: 'Why chosen difficulty changes effort.',
      survives_honestly: true,
      reason_markdown: 'The episode can deliver the promise.',
    };

    await client.listPackageTests('idea/one');
    await client.createPackageTest('idea/one', {
      opId: 'op-package-1',
      directions: [direction],
    });
    await client.pickPackageDirection('idea/one', 'package/test-1', 0);
    await client.handoffTopicRun('run/one', {
      ideaId: 'idea/one',
      episodeSlug: 'voluntary-obstacles',
      title: 'Voluntary Obstacles',
      briefMarkdown: '# Selected topic brief',
      draft: {
        format: 'narration',
        doc: { type: 'doc' },
      },
    });

    expect(fetchMock.mock.calls.map(([input, init]) => ({
      url: input,
      method: init?.method ?? 'GET',
      nonce: new Headers(init?.headers).get('x-sc-nonce'),
      body: init?.body,
    }))).toEqual([
      {
        url: `${BASE_URL}/api/ideas/idea%2Fone/package-tests`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/ideas/idea%2Fone/package-tests`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          opId: 'op-package-1',
          directions: [direction],
        }),
      },
      {
        url:
          `${BASE_URL}/api/ideas/idea%2Fone/package-tests/package%2Ftest-1/pick`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ directionIndex: 0 }),
      },
      {
        url: `${BASE_URL}/api/topic-runs/run%2Fone/handoff`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          ideaId: 'idea/one',
          episodeSlug: 'voluntary-obstacles',
          title: 'Voluntary Obstacles',
          briefMarkdown: '# Selected topic brief',
          draft: {
            format: 'narration',
            doc: { type: 'doc' },
          },
        }),
      },
    ]);
  });

  it('lists, registers, and polls topic runs with authenticated requests', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([{
        id: 'run-2',
        opId: 'op-2',
        state: 'completed',
        createdAt: '2026-07-23T12:30:00.000Z',
      }]))
      .mockResolvedValueOnce(jsonResponse({
        id: 'run-1',
        opId: 'op-1',
        state: 'running',
        createdAt: '2026-07-23T12:00:00.000Z',
      }))
      .mockResolvedValueOnce(jsonResponse({
        state: 'running',
        progress: [{
          id: '01-frame',
          status: 'active',
          text: 'Record the decision frame and current WHP context.',
        }],
      }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);
    const topicClient = client as DaemonClient & {
      listTopicRuns?: () => Promise<unknown>;
      registerTopicRun?: (opId: string) => Promise<unknown>;
      getTopicRun?: (id: string) => Promise<unknown>;
    };

    expect(topicClient.listTopicRuns).toBeTypeOf('function');
    expect(topicClient.registerTopicRun).toBeTypeOf('function');
    expect(topicClient.getTopicRun).toBeTypeOf('function');
    if (
      !topicClient.listTopicRuns
      || !topicClient.registerTopicRun
      || !topicClient.getTopicRun
    ) return;

    await topicClient.listTopicRuns();
    await topicClient.registerTopicRun('op/one');
    await topicClient.getTopicRun('run/one');

    expect(fetchMock.mock.calls.map(([input, init]) => ({
      url: input,
      method: init?.method ?? 'GET',
      nonce: new Headers(init?.headers).get('x-sc-nonce'),
      body: init?.body,
    }))).toEqual([
      {
        url: `${BASE_URL}/api/topic-runs`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/topic-runs`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ opId: 'op/one' }),
      },
      {
        url: `${BASE_URL}/api/topic-runs/run%2Fone`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
    ]);
  });

  it('maps architecture and draft-scoped operation routes with exact bodies', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);
    const sections = [{
      key: 'core-answer',
      title: 'Core answer',
      md: '### Core answer\n\nThe answer.\n',
    }];

    await client.getArchitecture('draft/one');
    await client.saveArchitecture('draft/one', {
      expectedRevisionSeq: 4,
      sections,
      opId: 'op/save',
      disposition: 'architecture-proposals-accepted',
    });
    await client.approveArchitecture('draft/one', {
      expectedRevisionSeq: 5,
    });
    await client.resumeArchitectureSaga('draft/one', {
      resumeKey: 'approval/key',
    });
    await client.reopenArchitecture('draft/one', {
      expectedRevisionSeq: 6,
      confirmed: true,
    });
    await client.rejectArchitectureProposal(
      'draft/one',
      'op/reject',
      'The proof arrives too late.',
    );
    await client.markNarrationReconciled('draft/one', {
      expectedRevisionSeq: 6,
      confirmed: true,
    });
    await client.submitDraftOp(
      'draft/one',
      'generate-architecture',
      { topic_brief: { topic: 'Supplied topic' } },
    );
    await client.resumeDraftOp(
      'draft/one',
      'op/one',
      { architecture_md: 'Supplied architecture.' },
      null,
    );
    await client.resolveNarrationProposal(
      'draft/one',
      'op/rewrite',
      'rejected',
      'Too broad — keep the smaller claim.',
    );

    expect(fetchMock.mock.calls.map(([input, init]) => ({
      url: input,
      method: init?.method ?? 'GET',
      nonce: new Headers(init?.headers).get('x-sc-nonce'),
      body: init?.body,
    }))).toEqual([
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/architecture`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/architecture`,
        method: 'PUT',
        nonce: NONCE,
        body: JSON.stringify({
          expectedRevisionSeq: 4,
          sections,
          opId: 'op/save',
          disposition: 'architecture-proposals-accepted',
        }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/architecture/approve`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ expectedRevisionSeq: 5 }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/architecture/resume`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ resumeKey: 'approval/key' }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/architecture/reopen`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          expectedRevisionSeq: 6,
          confirmed: true,
        }),
      },
      {
        url:
          `${BASE_URL}/api/drafts/draft%2Fone/architecture/proposals/op%2Freject/reject`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ reason: 'The proof arrives too late.' }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/narration/reconcile`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          expectedRevisionSeq: 6,
          confirmed: true,
        }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/ops`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          operation: 'generate-architecture',
          inputs: { topic_brief: { topic: 'Supplied topic' } },
        }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/ops/op%2Fone/resume`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          inputs: { architecture_md: 'Supplied architecture.' },
          reason: null,
        }),
      },
      {
        url:
          `${BASE_URL}/api/drafts/draft%2Fone/narration/proposals/op%2Frewrite/resolve`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          decision: 'rejected',
          reason: 'Too broad — keep the smaller claim.',
        }),
      },
    ]);
  });

  it('maps milestone workspace, pending-list, and explicit commit routes', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);
    const milestoneClient = client as DaemonClient & {
      getMilestoneStatus?: (id: string) => Promise<unknown>;
      chooseMilestoneWorkspace?: (
        id: string,
        input:
          | { choice: 'new-branch'; taskName: string }
          | { choice: 'current-branch'; confirmed: true },
      ) => Promise<unknown>;
      listPendingMilestones?: (id: string) => Promise<unknown>;
      commitMilestone?: (
        id: string,
        kind: 'architecture-approval',
        input: { pendingMilestoneId: string; confirmed: true },
      ) => Promise<unknown>;
    };

    expect(milestoneClient.getMilestoneStatus).toBeTypeOf('function');
    expect(milestoneClient.chooseMilestoneWorkspace).toBeTypeOf('function');
    expect(milestoneClient.listPendingMilestones).toBeTypeOf('function');
    expect(milestoneClient.commitMilestone).toBeTypeOf('function');
    if (
      !milestoneClient.getMilestoneStatus
      || !milestoneClient.chooseMilestoneWorkspace
      || !milestoneClient.listPendingMilestones
      || !milestoneClient.commitMilestone
    ) return;

    await milestoneClient.getMilestoneStatus('draft/one');
    await milestoneClient.chooseMilestoneWorkspace('draft/one', {
      choice: 'new-branch',
      taskName: 'composition-net',
    });
    await milestoneClient.listPendingMilestones('draft/one');
    await milestoneClient.commitMilestone(
      'draft/one',
      'architecture-approval',
      {
        pendingMilestoneId: 'milestone/one',
        confirmed: true,
      },
    );

    expect(fetchMock.mock.calls.map(([input, init]) => ({
      url: input,
      method: init?.method ?? 'GET',
      nonce: new Headers(init?.headers).get('x-sc-nonce'),
      body: init?.body,
    }))).toEqual([
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/milestones/status`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/milestones/workspace`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          choice: 'new-branch',
          taskName: 'composition-net',
        }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/milestones`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/draft%2Fone/milestones/architecture-approval/commit`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          pendingMilestoneId: 'milestone/one',
          confirmed: true,
        }),
      },
    ]);
  });

  it('preserves architecture revision and repository CAS conflict bodies', async () => {
    const revisionBody = {
      error: 'architecture revision conflict',
      current: {
        sections: [],
        approvedMd: null,
        approvedAt: null,
        revisionSeq: 8,
        narrationReconciliationRequired: false,
      },
    };
    const artifactBody = {
      error: 'architecture artifact conflict',
      currentHash: 'external-hash',
      parked: ['mine.md', 'theirs.md'],
      steps: {
        revisionAppended: 'completed',
        artifactWritten: 'pending',
        pipelineUpserted: 'pending',
        draftUpdated: 'pending',
      },
      state: revisionBody.current,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(revisionBody, 409))
      .mockResolvedValueOnce(jsonResponse(artifactBody, 409));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);

    await expect(client.saveArchitecture('draft-1', {
      expectedRevisionSeq: 7,
      sections: [],
      opId: null,
      disposition: 'architecture-proposals-accepted',
    })).rejects.toMatchObject({
      status: 409,
      body: revisionBody,
    });
    await expect(client.approveArchitecture('draft-1', {
      expectedRevisionSeq: 8,
    })).rejects.toMatchObject({
      status: 409,
      body: artifactBody,
    });
  });

  it('parses split SSE frames exactly and reconnects with the latest event id after a drop', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(sseResponse([
        'id: 17\nevent: cod',
        'ex\ndata: {"type":"turn.started"}\n',
        '\n',
      ]))
      .mockResolvedValueOnce(sseResponse([
        'id: 18\nevent: codex\ndata: first line\nda',
        'ta: second line\n\nevent: done\ndata: {}\n\n',
        'id: 19\nevent: codex\ndata: after done\n\n',
      ]));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);
    const frames: SseFrame[] = [];
    const onDone = vi.fn();
    const onError = vi.fn();

    const streaming = client.streamEvents('op-1', {
      lastEventId: '16',
      onEvent: (frame) => frames.push(frame),
      onDone,
      onError,
    });
    await vi.runAllTimersAsync();
    await streaming;

    expect(frames).toEqual([
      {
        id: '17',
        event: 'codex',
        data: '{"type":"turn.started"}',
      },
      {
        id: '18',
        event: 'codex',
        data: 'first line\nsecond line',
      },
    ]);
    expect(onDone).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('last-event-id'))
      .toBe('16');
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('last-event-id'))
      .toBe('17');
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get('x-sc-nonce')).toBe(NONCE);
    }
  });
});
