import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  gitStatus,
  milestoneCommit,
} from '../../src/repo/git.js';

function git(repoRoot: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function makeRepo(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'git-milestone-'));
  git(repoRoot, ['init', '--initial-branch=main']);
  git(repoRoot, ['config', 'user.name', 'Script Creator Tests']);
  git(repoRoot, ['config', 'user.email', 'script-creator-tests@example.invalid']);
  writeFileSync(join(repoRoot, 'initial.md'), 'initial\n');
  git(repoRoot, ['add', '--', 'initial.md']);
  git(repoRoot, ['commit', '-m', 'initial']);
  return repoRoot;
}

describe('gitStatus', () => {
  it('reports the current branch, default branch, and whether the repo is clean', () => {
    const repoRoot = makeRepo();
    git(repoRoot, ['switch', '-c', 'episode/why-we-play']);

    expect(gitStatus(repoRoot)).toEqual({
      branch: 'episode/why-we-play',
      clean: true,
      defaultBranch: 'main',
    });

    writeFileSync(join(repoRoot, 'untracked.md'), 'untracked\n');

    expect(gitStatus(repoRoot)).toEqual({
      branch: 'episode/why-we-play',
      clean: false,
      defaultBranch: 'main',
    });
  });

  it('does not report a configured default name that is absent from the repo', () => {
    const repoRoot = makeRepo();
    git(repoRoot, ['config', 'init.defaultBranch', 'legacy']);
    git(repoRoot, ['switch', '-c', 'episode/why-we-play']);

    expect(gitStatus(repoRoot).defaultBranch).toBe('main');
  });
});

describe('milestoneCommit', () => {
  it('refuses on the default branch before changing the index or history', () => {
    const repoRoot = makeRepo();
    writeFileSync(join(repoRoot, 'initial.md'), 'milestone edit\n');

    expect(() => milestoneCommit(repoRoot, {
      files: ['initial.md'],
      message: 'milestone',
    })).toThrow(/default branch/i);

    expect(git(repoRoot, ['diff', '--cached', '--name-only'])).toBe('');
    expect(git(repoRoot, ['rev-list', '--count', 'HEAD'])).toBe('1');
  });

  it('commits only listed files with the message verbatim and returns the hash', () => {
    const repoRoot = makeRepo();
    writeFileSync(join(repoRoot, 'listed.md'), 'listed baseline\n');
    writeFileSync(join(repoRoot, 'staged-other.md'), 'staged baseline\n');
    writeFileSync(join(repoRoot, 'unstaged-other.md'), 'unstaged baseline\n');
    git(repoRoot, ['add', '--', 'listed.md', 'staged-other.md', 'unstaged-other.md']);
    git(repoRoot, ['commit', '-m', 'add fixtures']);
    git(repoRoot, ['switch', '-c', 'episode/why-we-play']);

    writeFileSync(join(repoRoot, 'listed.md'), 'listed milestone\n');
    writeFileSync(join(repoRoot, 'new-listed.md'), 'new milestone\n');
    writeFileSync(join(repoRoot, 'staged-other.md'), 'staged dirty\n');
    git(repoRoot, ['add', '--', 'staged-other.md']);
    writeFileSync(join(repoRoot, 'unstaged-other.md'), 'unstaged dirty\n');
    const message = [
      'feat(script-creator): milestone subject',
      '',
      'Milestone body exactly.  ',
      '# literal comment',
    ].join('\n');

    const hash = milestoneCommit(repoRoot, {
      files: ['listed.md', 'new-listed.md'],
      message,
    });

    expect(hash).toBe(git(repoRoot, ['rev-parse', 'HEAD']));
    expect(git(repoRoot, ['log', '-1', '--format=%B'])).toBe(message);
    expect(
      git(repoRoot, ['show', '--pretty=format:', '--name-only', 'HEAD'])
        .split('\n')
        .filter(Boolean)
        .sort(),
    ).toEqual(['listed.md', 'new-listed.md']);
    expect(git(repoRoot, ['diff', '--cached', '--name-only'])).toBe('staged-other.md');
    expect(git(repoRoot, ['diff', '--name-only'])).toBe('unstaged-other.md');
  });

  it('refuses before staging when any listed file has nothing to commit', () => {
    const repoRoot = makeRepo();
    writeFileSync(join(repoRoot, 'unchanged.md'), 'unchanged\n');
    git(repoRoot, ['add', '--', 'unchanged.md']);
    git(repoRoot, ['commit', '-m', 'add unchanged fixture']);
    git(repoRoot, ['switch', '-c', 'episode/why-we-play']);
    writeFileSync(join(repoRoot, 'initial.md'), 'milestone edit\n');

    expect(() => milestoneCommit(repoRoot, {
      files: ['initial.md', 'unchanged.md'],
      message: 'must refuse',
    })).toThrow(/nothing to commit.*unchanged\.md/i);

    expect(git(repoRoot, ['diff', '--cached', '--name-only'])).toBe('');
    expect(git(repoRoot, ['rev-list', '--count', 'HEAD'])).toBe('2');
  });

  it('runs the cached diff check and refuses whitespace errors', () => {
    const repoRoot = makeRepo();
    git(repoRoot, ['switch', '-c', 'episode/why-we-play']);
    writeFileSync(join(repoRoot, 'initial.md'), 'trailing whitespace   \n');

    expect(() => milestoneCommit(repoRoot, {
      files: ['initial.md'],
      message: 'must fail diff check',
    })).toThrow(/trailing whitespace/i);

    expect(git(repoRoot, ['rev-list', '--count', 'HEAD'])).toBe('1');
  });

  it('commits on the default branch only with the explicit override', () => {
    const repoRoot = makeRepo();
    writeFileSync(join(repoRoot, 'initial.md'), 'approved default-branch edit\n');

    const hash = milestoneCommit(repoRoot, {
      files: ['initial.md'],
      message: 'approved default milestone',
      allowDefault: true,
    });

    expect(hash).toBe(git(repoRoot, ['rev-parse', 'HEAD']));
    expect(git(repoRoot, ['rev-list', '--count', 'HEAD'])).toBe('2');
  });
});
