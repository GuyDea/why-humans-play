import { afterAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/http/app.js';
import type { ArtifactWriteResult } from '../../src/repo/artifacts.js';
import {
  UNUSED_DOCUMENT_SERVICE,
  UNUSED_VALIDATOR_SERVICE,
} from './stubs.js';

const NONCE = 'task-6-artifact-nonce';
const AUTH = { 'x-sc-nonce': NONCE };
const write = vi.fn(async (): Promise<ArtifactWriteResult> => ({
  conflict: false as const,
  hash: 'topic-hash',
}));
const upsertPipelineRow = vi.fn(
  async (): Promise<ArtifactWriteResult> => ({
  conflict: false as const,
  hash: 'pipeline-hash',
  }),
);
const app = buildApp({
  nonce: NONCE,
  operationService: {
    submit: () => 'op-1',
    list: () => [],
    get: () => {
      throw new Error('operation not found');
    },
    events: () => [],
    cancel: () => {},
    result: () => ({ kind: 'pending' }),
  },
  documentService: UNUSED_DOCUMENT_SERVICE,
  artifactService: { write, upsertPipelineRow },
  validatorService: UNUSED_VALIDATOR_SERVICE,
});

afterAll(async () => {
  await app.close();
});

describe('artifact HTTP API', () => {
  it('writes an accepted topic brief through the CAS service', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/artifacts',
      headers: AUTH,
      payload: {
        path: 'whp-youtube/topics/voluntary-obstacles.md',
        content: '# Selected topic brief',
        expectedState: { expectNew: true },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      conflict: false,
      hash: 'topic-hash',
    });
    expect(write).toHaveBeenCalledWith(
      'whp-youtube/topics/voluntary-obstacles.md',
      '# Selected topic brief',
      { expectNew: true },
    );
  });

  it('upserts a selected pipeline row through the CAS service', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/pipeline',
      headers: AUTH,
      payload: {
        episodeSlug: 'voluntary-obstacles',
        milestone: 'selected',
        ref: 'whp-youtube/topics/voluntary-obstacles.md',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      conflict: false,
      hash: 'pipeline-hash',
    });
    expect(upsertPipelineRow).toHaveBeenCalledWith({
      episodeSlug: 'voluntary-obstacles',
      milestone: 'selected',
      ref: 'whp-youtube/topics/voluntary-obstacles.md',
    });
  });

  it.each([
    ['POST', '/api/artifacts'],
    ['POST', '/api/pipeline'],
  ] as const)('rejects %s %s without the nonce', async (method, url) => {
    const response = await app.inject({ method, url });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'invalid nonce' });
  });

  it('surfaces CAS conflicts without losing their current hash', async () => {
    write.mockResolvedValueOnce({
      conflict: true,
      currentHash: 'someone-else-hash',
      parked: ['whp-youtube/topics/topic.md.sc-conflict-1'],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/artifacts',
      headers: AUTH,
      payload: {
        path: 'whp-youtube/topics/topic.md',
        content: '# Competing brief',
        expectedState: { expectNew: true },
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      conflict: true,
      currentHash: 'someone-else-hash',
      parked: ['whp-youtube/topics/topic.md.sc-conflict-1'],
    });
  });
});
