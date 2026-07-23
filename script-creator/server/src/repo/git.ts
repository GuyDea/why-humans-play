import { execFileSync } from 'node:child_process';

export interface GitStatus {
  branch: string;
  clean: boolean;
  defaultBranch: string;
}

export interface MilestoneCommitOptions {
  files: string[];
  message: string;
  allowDefault?: boolean;
}

function runGit(repoRoot: string, args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const failure = error as Error & { stderr?: string; stdout?: string };
    const detail = failure.stderr?.trim() || failure.stdout?.trim();
    if (!detail) throw error;
    throw new Error(`${failure.message}\n${detail}`, { cause: error });
  }
}

function tryGit(repoRoot: string, args: string[]): string | undefined {
  try {
    return runGit(repoRoot, args) || undefined;
  } catch {
    return undefined;
  }
}

function resolveDefaultBranch(repoRoot: string, currentBranch: string): string {
  const remoteHead = tryGit(repoRoot, [
    'symbolic-ref',
    '--quiet',
    '--short',
    'refs/remotes/origin/HEAD',
  ]);
  if (remoteHead?.startsWith('origin/')) return remoteHead.slice('origin/'.length);

  const configured = tryGit(repoRoot, ['config', '--get', 'init.defaultBranch']);
  if (
    configured
    && tryGit(repoRoot, ['show-ref', '--verify', '--hash', `refs/heads/${configured}`])
  ) {
    return configured;
  }

  for (const candidate of ['main', 'master', 'trunk']) {
    if (tryGit(repoRoot, ['show-ref', '--verify', '--hash', `refs/heads/${candidate}`])) {
      return candidate;
    }
  }

  const branches = runGit(repoRoot, ['for-each-ref', '--format=%(refname:short)', 'refs/heads'])
    .split('\n')
    .filter(Boolean);
  return branches.find((branch) => branch !== currentBranch) ?? currentBranch;
}

export function gitStatus(repoRoot: string): GitStatus {
  const branch = runGit(repoRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  const dirty = runGit(repoRoot, ['status', '--porcelain=v1', '--untracked-files=normal']);
  return {
    branch,
    clean: dirty.length === 0,
    defaultBranch: resolveDefaultBranch(repoRoot, branch),
  };
}

export function milestoneCommit(
  repoRoot: string,
  options: MilestoneCommitOptions,
): string {
  const status = gitStatus(repoRoot);
  if (status.branch === status.defaultBranch && options.allowDefault !== true) {
    throw new Error(`refusing milestone commit on default branch ${status.defaultBranch}`);
  }

  if (options.files.length === 0) {
    throw new Error('refusing milestone commit with no files');
  }

  for (const file of options.files) {
    const fileStatus = runGit(repoRoot, [
      '--literal-pathspecs',
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
      '--',
      file,
    ]);
    if (fileStatus.length === 0) {
      throw new Error(`nothing to commit for listed file: ${file}`);
    }
  }

  runGit(repoRoot, ['--literal-pathspecs', 'add', '--', ...options.files]);
  runGit(repoRoot, [
    '--literal-pathspecs',
    'diff',
    '--check',
    '--cached',
    '--',
    ...options.files,
  ]);
  runGit(repoRoot, [
    '--literal-pathspecs',
    'commit',
    '--only',
    '--cleanup=verbatim',
    '-m',
    options.message,
    '--',
    ...options.files,
  ]);
  return runGit(repoRoot, ['rev-parse', 'HEAD']);
}
