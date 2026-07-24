import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/http/app.js';
import type {
  EpisodeWorkspace,
  MilestoneStatus,
  PendingMilestone,
} from '../../src/repo/milestones.js';
import {
  UNUSED_DOCUMENT_SERVICE,
  UNUSED_VALIDATOR_SERVICE,
} from './stubs.js';

const NONCE = 'milestones-http-nonce';
const AUTH = { 'x-sc-nonce': NONCE };
const WORKSPACE: EpisodeWorkspace = {
  draftId: 'draft-1',
  episodeSlug: 'why-we-play',
  choice: 'new-branch',
  branch: 'episode/why-we-play',
  worktreePath: '/tmp/managed/why-we-play',
  baseBranch: 'main',
  createdAt: '2026-07-24T09:00:00.000Z',
  updatedAt: '2026-07-24T09:00:00.000Z',
};
const STATUS: MilestoneStatus = {
  workspace: null,
  recommendation: {
    defaultBranch: 'main',
    taskName: 'why-we-play',
    branch: 'episode/why-we-play',
    worktreePath: '/tmp/managed/why-we-play',
  },
  dirtyFiles: ['unrelated.md'],
};
const PENDING: PendingMilestone & { diffSummary: string } = {
  id: 'pending-1',
  draftId: 'draft-1',
  episodeSlug: 'why-we-play',
  kind: 'architecture-approval',
  files: [
    'whp-youtube/architectures/why-we-play.md',
    'whp-youtube/PIPELINE.md',
  ],
  commitMessage:
    'feat(why-we-play): record architecture approval milestone',
  sourceHashes: {
    'whp-youtube/architectures/why-we-play.md': 'architecture-hash',
    'whp-youtube/PIPELINE.md': 'pipeline-hash',
  },
  baseCommitHash: 'base-commit-hash',
  reconciliationRequired: true,
  state: 'pending',
  resultingCommitHash: null,
  createdAt: '2026-07-24T09:00:00.000Z',
  updatedAt: '2026-07-24T09:00:00.000Z',
  diffSummary: '2 files changed',
};

const apps: Array<ReturnType<typeof buildApp>> = [];

function fixture() {
  const status = vi.fn(async () => STATUS);
  const chooseWorkspace = vi.fn(async () => WORKSPACE);
  const pendingMilestones = vi.fn(async () => [PENDING]);
  const commitPending = vi.fn(async () => ({
    ...PENDING,
    state: 'committed' as const,
    resultingCommitHash: 'commit-hash',
  }));
  const app = buildApp({
    nonce: NONCE,
    operationService: {
      submit: () => 'unused-operation',
      list: () => [],
      get: () => {
        throw new Error('operation service is not configured in this test');
      },
      events: () => [],
      cancel: () => {},
      result: () => ({ kind: 'pending' as const }),
    },
    documentService: UNUSED_DOCUMENT_SERVICE,
    artifactService: {},
    validatorService: UNUSED_VALIDATOR_SERVICE,
    milestoneService: {
      status,
      chooseWorkspace,
      pendingMilestones,
      commitPending,
    },
  });
  apps.push(app);
  return {
    app,
    status,
    chooseWorkspace,
    pendingMilestones,
    commitPending,
  };
}

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
});

describe('milestone HTTP API', () => {
  it('exposes status, explicit workspace choice, and pending diff summaries', async () => {
    const {
      app,
      status,
      chooseWorkspace,
      pendingMilestones,
    } = fixture();

    const statusResponse = await app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1/milestones/status',
      headers: AUTH,
    });
    const workspaceResponse = await app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/milestones/workspace',
      headers: AUTH,
      payload: { choice: 'new-branch', taskName: 'Why We Play' },
    });
    const pendingResponse = await app.inject({
      method: 'GET',
      url: '/api/drafts/draft-1/milestones',
      headers: AUTH,
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toEqual(STATUS);
    expect(workspaceResponse.statusCode).toBe(200);
    expect(workspaceResponse.json()).toEqual(WORKSPACE);
    expect(pendingResponse.statusCode).toBe(200);
    expect(pendingResponse.json()).toEqual({ milestones: [PENDING] });
    expect(status).toHaveBeenCalledWith('draft-1');
    expect(chooseWorkspace).toHaveBeenCalledWith('draft-1', {
      choice: 'new-branch',
      taskName: 'Why We Play',
    });
    expect(pendingMilestones).toHaveBeenCalledWith('draft-1');
  });

  it('accepts only the pending id plus explicit confirmation on commit', async () => {
    const { app, commitPending } = fixture();

    const refused = await app.inject({
      method: 'POST',
      url:
        '/api/drafts/draft-1/milestones/architecture-approval/commit',
      headers: AUTH,
      payload: { pendingMilestoneId: 'pending-1', confirmed: false },
    });
    const committed = await app.inject({
      method: 'POST',
      url:
        '/api/drafts/draft-1/milestones/architecture-approval/commit',
      headers: AUTH,
      payload: {
        pendingMilestoneId: 'pending-1',
        confirmed: true,
        files: ['../../arbitrary.md'],
        message: 'browser controlled',
      },
    });

    expect(refused.statusCode).toBe(400);
    expect(commitPending).toHaveBeenCalledTimes(1);
    expect(commitPending).toHaveBeenCalledWith({
      draftId: 'draft-1',
      kind: 'architecture-approval',
      pendingMilestoneId: 'pending-1',
      confirmed: true,
    });
    expect(committed.statusCode).toBe(200);
    expect(committed.json()).toMatchObject({
      id: 'pending-1',
      state: 'committed',
      resultingCommitHash: 'commit-hash',
    });
  });

  it('requires the explicit current-branch confirmation', async () => {
    const { app, chooseWorkspace } = fixture();

    const response = await app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/milestones/workspace',
      headers: AUTH,
      payload: { choice: 'current-branch', confirmed: false },
    });

    expect(response.statusCode).toBe(400);
    expect(chooseWorkspace).not.toHaveBeenCalled();
  });
});
