import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { resolveAppDirs } from '../src/xdg.js';

function expectedRepoId(repoRoot: string): string {
  return createHash('sha256').update(resolve(repoRoot)).digest('hex').slice(0, 12);
}

describe('resolveAppDirs', () => {
  it('keys injected XDG directories by the absolute repository root and creates them', () => {
    const root = mkdtempSync(join(tmpdir(), 'xdg-'));
    const repoRoot = join(root, 'repo');
    const dataHome = join(root, 'xdg-data');
    const stateHome = join(root, 'xdg-state');
    mkdirSync(repoRoot);

    const dirs = resolveAppDirs(repoRoot, {
      XDG_DATA_HOME: dataHome,
      XDG_STATE_HOME: stateHome,
    });
    const repoId = expectedRepoId(repoRoot);

    expect(dirs).toEqual({
      dataDir: join(dataHome, 'whp-script-creator', repoId) + sep,
      stateDir: join(stateHome, 'whp-script-creator', repoId) + sep,
      jobsRoot: join(stateHome, 'whp-script-creator', repoId, 'jobs') + sep,
      runtimeFile: join(stateHome, 'whp-script-creator', repoId, 'daemon.json'),
    });
    for (const dir of [dirs.dataDir, dirs.stateDir, dirs.jobsRoot]) {
      expect(statSync(dir).isDirectory()).toBe(true);
    }
    expect(existsSync(dirs.runtimeFile)).toBe(false);
  });

  it('uses injected HOME fallbacks without consulting the process environment', () => {
    const root = mkdtempSync(join(tmpdir(), 'xdg-home-'));
    const home = join(root, 'home');
    const repoRoot = `${root}${sep}nested${sep}..${sep}repo`;
    mkdirSync(home);
    mkdirSync(join(root, 'repo'));
    vi.stubEnv('XDG_DATA_HOME', join(root, 'ambient-data'));
    vi.stubEnv('XDG_STATE_HOME', join(root, 'ambient-state'));

    try {
      const dirs = resolveAppDirs(repoRoot, { HOME: home });
      const repoId = expectedRepoId(repoRoot);

      expect(dirs.dataDir).toBe(join(home, '.local', 'share', 'whp-script-creator', repoId) + sep);
      expect(dirs.stateDir).toBe(join(home, '.local', 'state', 'whp-script-creator', repoId) + sep);
      expect(dirs.jobsRoot).toBe(join(dirs.stateDir, 'jobs') + sep);
      expect(dirs.runtimeFile).toBe(join(dirs.stateDir, 'daemon.json'));
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
