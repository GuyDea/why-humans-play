import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/http/app.js';
import {
  UNUSED_DOCUMENT_SERVICE,
  UNUSED_VALIDATOR_SERVICE,
} from './stubs.js';

const NONCE = 'test-launch-nonce';
const app = buildApp({
  nonce: NONCE,
  operationService: {
    submit: () => 'job-1',
    get: () => {
      throw new Error('operation not found: job-1');
    },
    events: () => [],
    cancel: () => {},
    result: () => ({ kind: 'pending' }),
  },
  documentService: UNUSED_DOCUMENT_SERVICE,
  artifactService: {},
  validatorService: UNUSED_VALIDATOR_SERVICE,
});

afterAll(async () => {
  await app.close();
});

describe('buildApp security', () => {
  const cases = [
    { name: 'missing nonce', headers: {}, expected: 401 },
    { name: 'wrong nonce', headers: { 'x-sc-nonce': 'nope' }, expected: 401 },
    { name: 'evil origin', headers: { 'x-sc-nonce': NONCE, origin: 'https://evil.example' }, expected: 403 },
    { name: 'loopback origin ok', headers: { 'x-sc-nonce': NONCE, origin: 'http://127.0.0.1:4310' }, expected: 200 },
    { name: 'no origin ok', headers: { 'x-sc-nonce': NONCE }, expected: 200 },
  ];

  it.each(cases)('$name', async ({ headers, expected }) => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: headers as Record<string, string>,
    });

    expect(response.statusCode).toBe(expected);
    expect(
      Object.keys(response.headers)
        .filter((header) => header.startsWith('access-control-')),
    ).toEqual([]);
  });

  it('accepts the query nonce only for the SSE route', async () => {
    const sseResponse = await app.inject({
      method: 'GET',
      url: `/api/ops/job-1/events?nonce=${NONCE}`,
    });
    const wrongSseResponse = await app.inject({
      method: 'GET',
      url: '/api/ops/job-1/events?nonce=nope',
    });
    const nonGetSseResponse = await app.inject({
      method: 'POST',
      url: `/api/ops/job-1/events?nonce=${NONCE}`,
    });
    const ordinaryResponse = await app.inject({
      method: 'GET',
      url: `/api/health?nonce=${NONCE}`,
    });

    expect(sseResponse.statusCode).toBe(404);
    expect(wrongSseResponse.statusCode).toBe(401);
    expect(nonGetSseResponse.statusCode).toBe(401);
    expect(ordinaryResponse.statusCode).toBe(401);
  });

  it('accepts an HTTP localhost origin with an explicit port', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: {
        'x-sc-nonce': NONCE,
        origin: 'http://localhost:4310',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it.each([
    'https://localhost:4310',
    'http://localhost',
    'http://localhost.evil.example:4310',
    'http://127.0.0.1:65536',
  ])('rejects non-loopback origin %s', async (origin) => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { 'x-sc-nonce': NONCE, origin },
    });

    expect(response.statusCode).toBe(403);
  });
});
