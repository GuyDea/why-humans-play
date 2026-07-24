import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertWorkspaceIdentity,
  gitDirtyFiles,
  gitStatus,
  milestoneCommit,
  prepareManagedWorktree,
  verifyExistingDoctrinePointer,
  verifyReconciliationCommit,
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

  it('does not adopt a remote default name with no matching local branch', () => {
    const repoRoot = makeRepo();
    git(repoRoot, ['switch', '-c', 'trunk']);
    git(repoRoot, ['branch', '-D', 'main']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(repoRoot, [
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      'refs/remotes/origin/main',
    ]);

    expect(gitStatus(repoRoot).defaultBranch).toBe('trunk');
  });
});

describe('managed episode worktrees', () => {
  it('creates the recommended branch from the detected local default branch', () => {
    const repoRoot = makeRepo();
    git(repoRoot, ['switch', '-c', 'controller-feature']);
    writeFileSync(join(repoRoot, 'feature-only.md'), 'feature\n');
    git(repoRoot, ['add', '--', 'feature-only.md']);
    git(repoRoot, ['commit', '-m', 'feature-only']);
    const managedRoot = mkdtempSync(join(tmpdir(), 'git-worktrees-'));
    const worktreePath = join(managedRoot, 'episode-one');

    const prepared = prepareManagedWorktree(repoRoot, {
      branch: 'episode/episode-one',
      worktreePath,
      baseBranch: 'main',
    });

    expect(prepared).toEqual({
      branch: 'episode/episode-one',
      worktreePath: realpathSync(worktreePath),
      baseBranch: 'main',
      reused: false,
    });
    expect(git(worktreePath, ['rev-parse', 'HEAD'])).toBe(
      git(repoRoot, ['rev-parse', 'main']),
    );
    expect(() => git(worktreePath, ['show', 'HEAD:feature-only.md'])).toThrow();
  });

  it('reuses only the exact recorded worktree identity', () => {
    const repoRoot = makeRepo();
    const managedRoot = mkdtempSync(join(tmpdir(), 'git-worktrees-resume-'));
    const worktreePath = join(managedRoot, 'episode-one');
    prepareManagedWorktree(repoRoot, {
      branch: 'episode/episode-one',
      worktreePath,
      baseBranch: 'main',
    });

    expect(prepareManagedWorktree(repoRoot, {
      branch: 'episode/episode-one',
      worktreePath,
      baseBranch: 'main',
    })).toMatchObject({ reused: true });

    git(worktreePath, ['switch', '-c', 'episode/changed']);
    expect(() => assertWorkspaceIdentity({
      repoRoot,
      branch: 'episode/episode-one',
      worktreePath,
    })).toThrow(/workspace identity conflict/i);
  });

  it('refuses a different repository at a recorded branch and path', () => {
    const repoRoot = makeRepo();
    const replacementRoot = makeRepo();
    git(replacementRoot, ['switch', '-c', 'episode/episode-one']);

    expect(() => assertWorkspaceIdentity({
      repoRoot,
      branch: 'episode/episode-one',
      worktreePath: replacementRoot,
    })).toThrow(/workspace identity conflict/i);
  });

  it('refuses a same-name branch checked out at a different path', () => {
    const repoRoot = makeRepo();
    git(repoRoot, ['branch', 'episode/taken', 'main']);
    const managedRoot = mkdtempSync(join(tmpdir(), 'git-worktrees-taken-'));

    expect(() => prepareManagedWorktree(repoRoot, {
      branch: 'episode/taken',
      worktreePath: join(managedRoot, 'episode-one'),
      baseBranch: 'main',
    })).toThrow(/branch conflict/i);
  });

  it('reports dirty staged, unstaged, and untracked paths without changing them', () => {
    const repoRoot = makeRepo();
    writeFileSync(join(repoRoot, 'staged.md'), 'baseline\n');
    writeFileSync(join(repoRoot, 'unstaged.md'), 'baseline\n');
    git(repoRoot, ['add', '--', 'staged.md', 'unstaged.md']);
    git(repoRoot, ['commit', '-m', 'fixtures']);
    writeFileSync(join(repoRoot, 'staged.md'), 'staged\n');
    git(repoRoot, ['add', '--', 'staged.md']);
    writeFileSync(join(repoRoot, 'unstaged.md'), 'unstaged\n');
    mkdirSync(join(repoRoot, 'untracked'));
    writeFileSync(join(repoRoot, 'untracked', 'file.md'), 'untracked\n');

    expect(gitDirtyFiles(repoRoot)).toEqual([
      'staged.md',
      'unstaged.md',
      'untracked/file.md',
    ]);
    expect(git(repoRoot, ['diff', '--cached', '--name-only'])).toBe(
      'staged.md',
    );
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

describe('reconciliation commit verification', () => {
  it('accepts an ancestor commit with ledger and doctrine changes and captures pointers', () => {
    const repoRoot = makeRepo();
    mkdirSync(join(repoRoot, 'whp-youtube'));
    writeFileSync(join(repoRoot, 'DECISIONS.md'), '# Decisions\n');
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n',
    );
    git(repoRoot, [
      'add',
      '--',
      'DECISIONS.md',
      'whp-youtube/STEERING.md',
    ]);
    git(repoRoot, ['commit', '-m', 'seed doctrine']);
    writeFileSync(
      join(repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n- Prefer concrete stakes.\n',
    );
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n\n## Openings\n\nPrefer concrete stakes.\n',
    );
    git(repoRoot, [
      'add',
      '--',
      'DECISIONS.md',
      'whp-youtube/STEERING.md',
    ]);
    git(repoRoot, ['commit', '-m', 'reconcile lesson']);
    const commit = git(repoRoot, ['rev-parse', 'HEAD']);

    expect(verifyReconciliationCommit(repoRoot, commit)).toEqual({
      commit,
      changedPaths: [
        'DECISIONS.md',
        'whp-youtube/STEERING.md',
      ],
      doctrinePointers: [
        expect.objectContaining({
          path: 'whp-youtube/STEERING.md',
          anchor: expect.stringMatching(/^lines:\d+-\d+$/u),
          content: expect.stringContaining('Prefer concrete stakes.'),
          contentHash: expect.stringMatching(/^sha256:/u),
        }),
      ],
    });
  });

  it('rejects commits without both the ledger and a canonical doctrine surface', () => {
    const repoRoot = makeRepo();
    writeFileSync(join(repoRoot, 'DECISIONS.md'), '# Decisions\n');
    git(repoRoot, ['add', '--', 'DECISIONS.md']);
    git(repoRoot, ['commit', '-m', 'ledger only']);

    expect(() => verifyReconciliationCommit(
      repoRoot,
      git(repoRoot, ['rev-parse', 'HEAD']),
    )).toThrow(/reconciliation commit.+canonical doctrine path/i);
    expect(() => verifyReconciliationCommit(repoRoot, 'not-a-commit'))
      .toThrow(/reconciliation commit.+does not exist/i);
  });

  it('validates explicitly supplied existing-doctrine provenance read-only', () => {
    const repoRoot = makeRepo();
    mkdirSync(join(repoRoot, 'whp-youtube'));
    writeFileSync(
      join(repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n- Existing doctrine.\n',
    );
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n\nExisting doctrine.\n',
    );
    git(repoRoot, [
      'add',
      '--',
      'DECISIONS.md',
      'whp-youtube/STEERING.md',
    ]);
    git(repoRoot, ['commit', '-m', 'existing doctrine provenance']);
    const commit = git(repoRoot, ['rev-parse', 'HEAD']);
    const verified = verifyReconciliationCommit(repoRoot, commit);
    const pointer = verified.doctrinePointers[0]!;

    expect(verifyExistingDoctrinePointer(repoRoot, {
      commit,
      path: pointer.path,
      anchor: pointer.anchor,
      contentHash: pointer.contentHash,
    })).toEqual(pointer);
    expect(() => verifyExistingDoctrinePointer(repoRoot, {
      commit,
      path: pointer.path,
      anchor: pointer.anchor,
      contentHash: 'sha256:wrong',
    })).toThrow(/content hash/i);
  });

  it('refuses an older reconciliation commit and a newer wrong-lesson commit', () => {
    const repoRoot = makeRepo();
    mkdirSync(join(repoRoot, 'whp-youtube'));
    writeFileSync(join(repoRoot, 'DECISIONS.md'), '# Decisions\n');
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n',
    );
    git(repoRoot, ['add', '--', 'DECISIONS.md', 'whp-youtube/STEERING.md']);
    git(repoRoot, ['commit', '-m', 'seed doctrine']);
    writeFileSync(
      join(repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n- Older unrelated lesson.\n',
    );
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n\nOlder unrelated lesson.\n',
    );
    git(repoRoot, ['add', '--', 'DECISIONS.md', 'whp-youtube/STEERING.md']);
    git(repoRoot, ['commit', '-m', 'older unrelated reconciliation']);
    const olderCommit = git(repoRoot, ['rev-parse', 'HEAD']);
    const preparedHead = olderCommit;

    expect(() => verifyReconciliationCommit(repoRoot, olderCommit, {
      kind: 'apply',
      preparedAt: '2026-07-24T09:00:00.000Z',
      preparedHead,
      candidateMarkdown: 'This lesson belongs to the current handoff.',
      priorPointer: null,
    })).toThrow(/reconciliation commit.+predates.+handoff/iu);

    writeFileSync(
      join(repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n- Older unrelated lesson.\n- Another wrong lesson.\n',
    );
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n\nOlder unrelated lesson.\nAnother wrong lesson.\n',
    );
    git(repoRoot, ['add', '--', 'DECISIONS.md', 'whp-youtube/STEERING.md']);
    git(repoRoot, ['commit', '-m', 'newer wrong reconciliation']);
    const wrongCommit = git(repoRoot, ['rev-parse', 'HEAD']);

    expect(() => verifyReconciliationCommit(repoRoot, wrongCommit, {
      kind: 'apply',
      preparedAt: '2026-07-24T09:00:00.000Z',
      preparedHead,
      candidateMarkdown: 'This lesson belongs to the current handoff.',
      priorPointer: null,
    })).toThrow(/reconciliation commit.+current lesson.+added doctrine/iu);
  });

  it('selects the apply pointer from the lesson-matched hunk, not path order', () => {
    const repoRoot = makeRepo();
    mkdirSync(join(repoRoot, '.agents', 'skills', 'a-unrelated'), {
      recursive: true,
    });
    mkdirSync(join(repoRoot, 'whp-youtube'));
    writeFileSync(join(repoRoot, 'DECISIONS.md'), '# Decisions\n');
    writeFileSync(
      join(repoRoot, '.agents', 'skills', 'a-unrelated', 'SKILL.md'),
      '# Unrelated\n',
    );
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n',
    );
    git(repoRoot, ['add', '--', 'DECISIONS.md', '.agents', 'whp-youtube']);
    git(repoRoot, ['commit', '-m', 'seed doctrine']);
    const preparedHead = git(repoRoot, ['rev-parse', 'HEAD']);
    writeFileSync(
      join(repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n- Prefer the lesson-matched hunk.\n',
    );
    writeFileSync(
      join(repoRoot, '.agents', 'skills', 'a-unrelated', 'SKILL.md'),
      '# Unrelated\n\nAlphabetically first but unrelated.\n',
    );
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n\nPrefer the lesson-matched hunk.\n',
    );
    git(repoRoot, ['add', '--', 'DECISIONS.md', '.agents', 'whp-youtube']);
    git(repoRoot, ['commit', '-m', 'apply current lesson']);
    const commit = git(repoRoot, ['rev-parse', 'HEAD']);

    const verified = verifyReconciliationCommit(repoRoot, commit, {
      kind: 'apply',
      preparedAt: '2026-07-24T09:00:00.000Z',
      preparedHead,
      candidateMarkdown: 'Prefer the lesson-matched hunk.',
      priorPointer: null,
    });

    expect(verified.doctrinePointers).toEqual([
      expect.objectContaining({
        path: 'whp-youtube/STEERING.md',
        content: 'Prefer the lesson-matched hunk.',
      }),
    ]);
  });

  it('requires the recorded predecessor removal for retire and supersede', () => {
    const repoRoot = makeRepo();
    mkdirSync(join(repoRoot, '.agents', 'skills', 'unrelated'), {
      recursive: true,
    });
    mkdirSync(join(repoRoot, 'whp-youtube'));
    writeFileSync(join(repoRoot, 'DECISIONS.md'), '# Decisions\n');
    writeFileSync(
      join(repoRoot, '.agents', 'skills', 'unrelated', 'SKILL.md'),
      '# Unrelated\n',
    );
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n\nPrior durable doctrine.\n',
    );
    git(repoRoot, ['add', '--', 'DECISIONS.md', '.agents', 'whp-youtube']);
    git(repoRoot, ['commit', '-m', 'seed prior doctrine']);
    const preparedHead = git(repoRoot, ['rev-parse', 'HEAD']);
    const priorPointer = {
      path: 'whp-youtube/STEERING.md',
      anchor: 'lines:3-3',
      contentHash: `sha256:${
        createHash('sha256').update('Prior durable doctrine.').digest('hex')
      }`,
    };
    writeFileSync(
      join(repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n- Unrelated change only.\n',
    );
    writeFileSync(
      join(repoRoot, '.agents', 'skills', 'unrelated', 'SKILL.md'),
      '# Unrelated\n\nChanged, but not the predecessor.\n',
    );
    git(repoRoot, ['add', '--', 'DECISIONS.md', '.agents']);
    git(repoRoot, ['commit', '-m', 'unrelated doctrine change']);
    const unrelatedCommit = git(repoRoot, ['rev-parse', 'HEAD']);

    for (const kind of ['retire', 'supersede'] as const) {
      expect(() => verifyReconciliationCommit(repoRoot, unrelatedCommit, {
        kind,
        preparedAt: '2026-07-24T09:00:00.000Z',
        preparedHead,
        candidateMarkdown: kind === 'supersede'
          ? 'Replacement durable doctrine.'
          : null,
        priorPointer,
      })).toThrow(/reconciliation commit.+recorded predecessor.+removed/iu);
    }

    writeFileSync(
      join(repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n- Unrelated change only.\n- Supersede prior doctrine.\n',
    );
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n\nReplacement durable doctrine.\n',
    );
    git(repoRoot, ['add', '--', 'DECISIONS.md', 'whp-youtube/STEERING.md']);
    git(repoRoot, ['commit', '-m', 'supersede current lesson']);
    const supersedeCommit = git(repoRoot, ['rev-parse', 'HEAD']);
    expect(verifyReconciliationCommit(repoRoot, supersedeCommit, {
      kind: 'supersede',
      preparedAt: '2026-07-24T09:00:00.000Z',
      preparedHead,
      candidateMarkdown: 'Replacement durable doctrine.',
      priorPointer,
    }).doctrinePointers).toEqual([
      expect.objectContaining({
        path: 'whp-youtube/STEERING.md',
        content: 'Replacement durable doctrine.',
      }),
    ]);

    const retirePreparedHead = supersedeCommit;
    writeFileSync(
      join(repoRoot, 'DECISIONS.md'),
      '# Decisions\n\n- Unrelated change only.\n- Supersede prior doctrine.\n- Retire replacement.\n',
    );
    writeFileSync(
      join(repoRoot, 'whp-youtube', 'STEERING.md'),
      '# Steering\n',
    );
    git(repoRoot, ['add', '--', 'DECISIONS.md', 'whp-youtube/STEERING.md']);
    git(repoRoot, ['commit', '-m', 'retire current doctrine']);
    const retireCommit = git(repoRoot, ['rev-parse', 'HEAD']);
    const replacementPointer = {
      path: 'whp-youtube/STEERING.md',
      anchor: 'lines:3-3',
      contentHash: `sha256:${
        createHash('sha256').update('Replacement durable doctrine.')
          .digest('hex')
      }`,
    };
    expect(verifyReconciliationCommit(repoRoot, retireCommit, {
      kind: 'retire',
      preparedAt: '2026-07-24T09:00:00.000Z',
      preparedHead: retirePreparedHead,
      candidateMarkdown: null,
      priorPointer: replacementPointer,
    }).doctrinePointers).toEqual([{
      ...replacementPointer,
      content: 'Replacement durable doctrine.',
    }]);
  });
});
