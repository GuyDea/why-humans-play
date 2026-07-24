import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/http/app.js';
import {
  runValidatorJson,
  type ValidatorResult,
} from '../../src/repo/validator.js';
import { UNUSED_DOCUMENT_SERVICE } from './stubs.js';

const NONCE = 'task-15-validator-nonce';
const AUTH = { 'x-sc-nonce': NONCE };
const apps: Array<ReturnType<typeof buildApp>> = [];
const fixtures: string[] = [];
const REAL_SCRIPTS_DIR = resolve(
  import.meta.dirname,
  '../../../..',
  '.agents/skills/writing-whp-youtube-scripts/scripts',
);

function makeApp(validate: (path: string) => Promise<ValidatorResult>) {
  const app = buildApp({
    nonce: NONCE,
    operationService: {
      submit: () => 'operation-1',
      list: () => [],
      get: () => {
        throw new Error('operation not found: operation-1');
      },
      events: () => [],
      cancel: () => {},
      result: () => ({ kind: 'pending' }),
    },
    documentService: UNUSED_DOCUMENT_SERVICE,
    artifactService: {},
    validatorService: { validate },
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true });
  }
});

describe('validator HTTP API', () => {
  it('returns validator diagnostics for a whitelisted repo-relative path', async () => {
    const result: ValidatorResult = {
      ok: false,
      errors: [{ message: 'Missing Status field.', line: 3 }],
      path: 'whp-youtube/episodes/bad.md',
      hash: 'bad-hash',
    };
    const validate = vi.fn(async () => result);
    const app = makeApp(validate);

    const response = await app.inject({
      method: 'POST',
      url: '/api/validate',
      headers: AUTH,
      payload: { path: 'whp-youtube/episodes/bad.md' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(result);
    expect(validate).toHaveBeenCalledWith('whp-youtube/episodes/bad.md');
  });

  it('returns 400 for a rejected script path', async () => {
    const validate = vi.fn(async () => ({
      ok: true,
      errors: [],
      path: 'whp-youtube/episodes/bad.md',
      hash: 'valid-hash',
    }));
    const app = makeApp(validate);

    const response = await app.inject({
      method: 'POST',
      url: '/api/validate',
      headers: AUTH,
      payload: { path: '../secret.md' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'invalid or non-whitelisted validator path: ../secret.md',
    });
    expect(validate).not.toHaveBeenCalled();
  });

  it('returns 400 when an in-repo path escapes through a symlink', async () => {
    const fixture = mkdtempSync(join(tmpdir(), 'validator-http-symlink-'));
    fixtures.push(fixture);
    const repoRoot = join(fixture, 'repo');
    const outside = join(fixture, 'outside');
    mkdirSync(join(repoRoot, 'whp-youtube'), { recursive: true });
    mkdirSync(outside);
    writeFileSync(join(outside, 'script.md'), '# Outside\n', 'utf8');
    symlinkSync(outside, join(repoRoot, 'whp-youtube', 'linked'));
    const app = makeApp((path) => runValidatorJson(repoRoot, path, {
      scriptsDir: REAL_SCRIPTS_DIR,
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/validate',
      headers: AUTH,
      payload: { path: 'whp-youtube/linked/script.md' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'invalid or non-whitelisted validator path: whp-youtube/linked/script.md',
    });
  });

  it('requires a string path', async () => {
    const validate = vi.fn();
    const app = makeApp(validate);

    const response = await app.inject({
      method: 'POST',
      url: '/api/validate',
      headers: AUTH,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'path is required' });
    expect(validate).not.toHaveBeenCalled();
  });

  it('is protected by the shared nonce and origin guards', async () => {
    const validate = vi.fn();
    const app = makeApp(validate);

    const missingNonce = await app.inject({
      method: 'POST',
      url: '/api/validate',
      payload: { path: 'whp-youtube/episodes/bad.md' },
    });
    const forbiddenOrigin = await app.inject({
      method: 'POST',
      url: '/api/validate',
      headers: { ...AUTH, origin: 'https://evil.example' },
      payload: { path: 'whp-youtube/episodes/bad.md' },
    });

    expect(missingNonce.statusCode).toBe(401);
    expect(forbiddenOrigin.statusCode).toBe(403);
    expect(validate).not.toHaveBeenCalled();
  });

  it('re-imports the exact production target before appending its validator attempt', async () => {
    const result: ValidatorResult = {
      ok: false,
      errors: [{ message: 'Missing Status field.', line: 3 }],
      path: 'whp-youtube/episodes/bad.md',
      hash: 'bad-hash',
    };
    const recordValidatorAttempt = vi.fn();
    const syncPromotionOutput = vi.fn();
    const app = buildApp({
      nonce: NONCE,
      operationService: {
        submit: () => 'operation-1',
        list: () => [],
        get: () => {
          throw new Error('operation not found: operation-1');
        },
        events: () => [],
        cancel: () => {},
        result: () => ({ kind: 'pending' }),
      },
      documentService: {
        ...UNUSED_DOCUMENT_SERVICE,
        syncPromotionOutput,
        recordPromotionValidation: vi.fn(),
      },
      architectureService: {
        get: () => {
          throw new Error('unused');
        },
        save: () => {
          throw new Error('unused');
        },
        submitOperation: () => 'unused',
        resumeOperation: () => 'unused',
        promotion: () => ({
          draftId: 'draft-1',
          operationId: 'promote-1',
          state: 'validation-required',
          targetPath: result.path,
          targetHash: result.hash,
          importRevisionId: 'revision-1',
          validationHash: null,
          error: null,
          createdAt: '2026-07-24T08:00:00.000Z',
          updatedAt: '2026-07-24T08:00:00.000Z',
        }),
      },
      learningService: {
        list: vi.fn(),
        setNote: vi.fn(),
        recordValidatorAttempt,
      },
      artifactService: {
        read: async () => ({
          path: result.path,
          content: '# Script',
          hash: result.hash,
        }),
      },
      validatorService: { validate: async () => result },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/validate',
      headers: AUTH,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(result);
    expect(syncPromotionOutput).toHaveBeenCalledWith('draft-1', {
      path: result.path,
      content: '# Script',
      hash: result.hash,
    });
    expect(recordValidatorAttempt).toHaveBeenCalledWith({
      draftId: 'draft-1',
      path: result.path,
      hash: result.hash,
      ok: false,
      diagnostics: result.errors,
    });
    expect(syncPromotionOutput.mock.invocationCallOrder[0])
      .toBeLessThan(recordValidatorAttempt.mock.invocationCallOrder[0]!);
  });
});
