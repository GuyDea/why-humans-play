import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  InvalidValidatorPathError,
  runValidatorJson,
} from '../../src/repo/validator.js';

const fixtures: string[] = [];
const REAL_SCRIPTS_DIR = resolve(
  import.meta.dirname,
  '../../../..',
  '.agents/skills/writing-whp-youtube-scripts/scripts',
);

function makeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'validator-json-'));
  fixtures.push(root);
  return root;
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('runValidatorJson', () => {
  it.each([
    '/tmp/bad.md',
    'C:\\temp\\bad.md',
    '../whp-youtube/episodes/bad.md',
    'whp-youtube/episodes/../bad.md',
    'notes/bad.md',
    'whp-youtube',
  ])('rejects non-whitelisted script path %s', async (scriptRelPath) => {
    await expect(
      runValidatorJson('/unused/repo', scriptRelPath),
    ).rejects.toBeInstanceOf(InvalidValidatorPathError);
  });

  it('returns diagnostics from the real validator for an invalid temp script', async () => {
    const repoRoot = makeFixture();
    const scriptRelPath = 'whp-youtube/episodes/bad.md';
    const target = join(repoRoot, scriptRelPath);
    mkdirSync(join(repoRoot, 'whp-youtube', 'episodes'), { recursive: true });
    writeFileSync(target, '# Invalid annotated script\n', 'utf8');

    const result = await runValidatorJson(repoRoot, scriptRelPath, {
      scriptsDir: REAL_SCRIPTS_DIR,
      absoluteTargetForTests: target,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          message: expect.any(String),
          line: null,
        },
      ]),
    );
  });
});
