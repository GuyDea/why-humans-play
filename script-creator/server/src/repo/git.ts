import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  realpathSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

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

export interface ManagedWorktreeOptions {
  branch: string;
  worktreePath: string;
  baseBranch: string;
}

export interface ManagedWorktreeResult extends ManagedWorktreeOptions {
  reused: boolean;
}

export interface WorkspaceIdentity {
  repoRoot: string;
  branch: string;
  worktreePath: string;
}

export interface RecordedMilestoneCommit {
  commitHash: string;
  baseCommitHash: string;
  files: string[];
  message: string;
  sourceHashes: Record<string, string>;
}

export interface ReconciliationDoctrinePointer {
  path: string;
  anchor: string;
  content: string;
  contentHash: string;
}

export interface VerifiedReconciliationCommit {
  commit: string;
  changedPaths: string[];
  doctrinePointers: ReconciliationDoctrinePointer[];
}

export interface ReconciliationVerificationExpectation {
  kind: 'apply' | 'retire' | 'supersede';
  preparedAt: string;
  preparedHead: string | null;
  candidateMarkdown: string | null;
  priorPointer: {
    path: string;
    anchor: string;
    contentHash: string;
  } | null;
}

export interface ReconciliationCommitCheck {
  commit: string;
  repositoryRoot: string;
  changedPaths: string[] | null;
}

export class ReconciliationCommitMismatchError extends Error {
  constructor(
    message: string,
    readonly checked: ReconciliationCommitCheck,
  ) {
    super(message);
    this.name = 'ReconciliationCommitMismatchError';
  }
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

function runGitBytes(repoRoot: string, args: string[]): Buffer {
  return execFileSync('git', args, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function resolveDefaultBranch(repoRoot: string, currentBranch: string): string {
  const remoteHead = tryGit(repoRoot, [
    'symbolic-ref',
    '--quiet',
    '--short',
    'refs/remotes/origin/HEAD',
  ]);
  if (remoteHead?.startsWith('origin/')) {
    const localName = remoteHead.slice('origin/'.length);
    if (localBranchExists(repoRoot, localName)) return localName;
  }

  const configured = tryGit(repoRoot, ['config', '--get', 'init.defaultBranch']);
  if (configured && localBranchExists(repoRoot, configured)) {
    return configured;
  }

  for (const candidate of ['main', 'master', 'trunk']) {
    if (localBranchExists(repoRoot, candidate)) {
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

export function gitDirtyFiles(repoRoot: string): string[] {
  const status = runGit(repoRoot, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
  ]);
  if (status.length === 0) return [];
  const paths: string[] = [];
  const entries = status.split('\0').filter(Boolean);
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (entry.length >= 4 && entry[2] === ' ') {
      paths.push(entry.slice(3));
      if (entry[0] === 'R' || entry[1] === 'R') index += 1;
    }
  }
  return [...new Set(paths)].sort();
}

export function milestoneDiffSummary(
  repoRoot: string,
  files: string[],
): string {
  const status = runGit(repoRoot, [
    '--literal-pathspecs',
    'status',
    '--short',
    '--untracked-files=all',
    '--',
    ...files,
  ]);
  const stat = runGit(repoRoot, [
    '--literal-pathspecs',
    'diff',
    '--stat',
    'HEAD',
    '--',
    ...files,
  ]);
  return [status, stat].filter(Boolean).join('\n');
}

export function gitHead(repoRoot: string): string {
  return runGit(repoRoot, ['rev-parse', 'HEAD']);
}

export function isExactRecordedMilestoneCommit(
  repoRoot: string,
  recorded: RecordedMilestoneCommit,
): boolean {
  if (gitHead(repoRoot) !== recorded.commitHash) return false;
  if (
    tryGit(repoRoot, ['rev-parse', `${recorded.commitHash}^`])
      !== recorded.baseCommitHash
  ) {
    return false;
  }
  if (
    runGit(repoRoot, [
      'log',
      '-1',
      '--format=%B',
      recorded.commitHash,
    ]) !== recorded.message
  ) {
    return false;
  }
  const committedFiles = runGit(repoRoot, [
    '--literal-pathspecs',
    'diff-tree',
    '--no-commit-id',
    '--name-only',
    '-r',
    '-z',
    recorded.commitHash,
  ]).split('\0').filter(Boolean).sort();
  if (
    JSON.stringify(committedFiles)
      !== JSON.stringify([...recorded.files].sort())
  ) {
    return false;
  }
  return recorded.files.every((file) =>
    createHash('sha256')
      .update(runGitBytes(repoRoot, [
        'show',
        `${recorded.commitHash}:${file}`,
      ]))
      .digest('hex') === recorded.sourceHashes[file]);
}

export function verifyReconciliationCommit(
  repoRoot: string,
  requestedCommit: string,
  expectation?: ReconciliationVerificationExpectation,
): VerifiedReconciliationCommit {
  runGit(repoRoot, ['rev-parse', '--git-dir']);
  let commit: string;
  try {
    commit = runGit(repoRoot, [
      'rev-parse',
      '--verify',
      `${requestedCommit}^{commit}`,
    ]);
  } catch {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: checked commit ${
        requestedCommit
      } in the selected repository; it does not exist there.`,
      repoRoot,
      requestedCommit,
      null,
    );
  }
  try {
    runGit(repoRoot, ['merge-base', '--is-ancestor', commit, 'HEAD']);
  } catch (error) {
    if (gitExitStatus(error) !== 1) throw error;
    throw reconciliationMismatch(
      `reconciliation commit verification refused: checked commit ${
        commit
      } in the selected repository; it is not reachable from HEAD.`,
      repoRoot,
      commit,
      null,
    );
  }
  const changedPaths = runGit(repoRoot, [
    '--literal-pathspecs',
    'diff-tree',
    '--no-commit-id',
    '--name-only',
    '-r',
    '-z',
    commit,
  ]).split('\0').filter(Boolean).sort();
  if (expectation) {
    verifyCommitAfterHandoff(
      repoRoot,
      commit,
      changedPaths,
      expectation,
    );
  }
  const doctrinePaths = changedPaths.filter(isDoctrinePath);
  const missing = [
    ...(!changedPaths.includes('DECISIONS.md')
      ? ['DECISIONS.md']
      : []),
    ...(doctrinePaths.length === 0
      ? ['at least one canonical doctrine path']
      : []),
  ];
  if (missing.length > 0) {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: checked commit ${
        commit
      }; changed paths were ${formatPaths(changedPaths)}, but expected ${
        joinExpectedChecks(missing)
      }.`,
      repoRoot,
      commit,
      changedPaths,
    );
  }
  const doctrinePointers = expectation
    ? matchExpectedReconciliationHunks(
        repoRoot,
        commit,
        doctrinePaths,
        changedPaths,
        expectation,
      )
    : doctrinePaths.flatMap((path) => {
        const pointer = changedContentPointer(repoRoot, commit, path);
        return pointer ? [pointer] : [];
      });
  return {
    commit,
    changedPaths,
    doctrinePointers,
  };
}

export function verifyExistingDoctrinePointer(
  repoRoot: string,
  input: {
    commit: string;
    path: string;
    anchor: string;
    contentHash: string;
  },
): ReconciliationDoctrinePointer {
  const verified = verifyReconciliationCommit(repoRoot, input.commit);
  if (!isDoctrinePath(input.path) || !verified.changedPaths.includes(input.path)) {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: checked doctrine path ${
        input.path
      } at commit ${verified.commit}; it is not a changed canonical doctrine path.`,
      repoRoot,
      verified.commit,
      verified.changedPaths,
    );
  }
  const match = /^lines:(\d+)-(\d+)$/u.exec(input.anchor);
  if (!match) {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: checked doctrine anchor ${
        input.anchor
      } in ${input.path} at commit ${verified.commit}; the anchor format is invalid.`,
      repoRoot,
      verified.commit,
      verified.changedPaths,
    );
  }
  const start = Number(match[1]);
  const end = Number(match[2]);
  let lines: string[];
  try {
    lines = runGitBytes(repoRoot, [
      'show',
      `${verified.commit}:${input.path}`,
    ]).toString('utf8').split('\n');
  } catch {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: checked doctrine path ${
        input.path
      } at commit ${verified.commit}; the path does not exist at that commit.`,
      repoRoot,
      verified.commit,
      verified.changedPaths,
    );
  }
  if (start < 1 || end < start || end > lines.length) {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: checked doctrine anchor ${
        input.anchor
      } in ${input.path}; it does not resolve at commit ${verified.commit}.`,
      repoRoot,
      verified.commit,
      verified.changedPaths,
    );
  }
  const content = lines.slice(start - 1, end).join('\n');
  const contentHash = `sha256:${
    createHash('sha256').update(content).digest('hex')
  }`;
  if (contentHash !== input.contentHash) {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: checked doctrine anchor ${
        input.anchor
      } in ${input.path} at commit ${verified.commit}; its content hash does not match.`,
      repoRoot,
      verified.commit,
      verified.changedPaths,
    );
  }
  return {
    path: input.path,
    anchor: input.anchor,
    content,
    contentHash,
  };
}

export function prepareManagedWorktree(
  repoRoot: string,
  options: ManagedWorktreeOptions,
): ManagedWorktreeResult {
  requireLocalBranch(repoRoot, options.baseBranch, 'base branch');
  assertBranchName(repoRoot, options.branch);
  const requestedPath = resolve(options.worktreePath);
  const worktrees = listWorktrees(repoRoot);
  const existingAtPath = worktrees.find(
    ({ path }) => resolve(path) === requestedPath,
  );
  if (existingAtPath) {
    if (existingAtPath.branch !== options.branch) {
      throw new Error(
        `workspace identity conflict: ${requestedPath} is on branch ${
          existingAtPath.branch ?? '<detached>'
        }, expected ${options.branch}`,
      );
    }
    assertWorkspaceIdentity({
      repoRoot,
      branch: options.branch,
      worktreePath: requestedPath,
    });
    return {
      ...options,
      worktreePath: realpathSync(requestedPath),
      reused: true,
    };
  }

  if (tryGit(repoRoot, [
    'show-ref',
    '--verify',
    '--hash',
    `refs/heads/${options.branch}`,
  ])) {
    throw new Error(
      `managed worktree branch conflict: ${options.branch} already exists`,
    );
  }

  mkdirSync(dirname(requestedPath), { recursive: true });
  runGit(repoRoot, [
    'worktree',
    'add',
    '-b',
    options.branch,
    requestedPath,
    options.baseBranch,
  ]);
  return {
    ...options,
    worktreePath: realpathSync(requestedPath),
    reused: false,
  };
}

export function assertWorkspaceIdentity(
  identity: WorkspaceIdentity,
): void {
  try {
    const expectedCommonDir = gitCommonDir(identity.repoRoot);
    const canonicalPath = realpathSync(identity.worktreePath);
    const root = realpathSync(runGit(canonicalPath, [
      'rev-parse',
      '--show-toplevel',
    ]));
    const commonDir = gitCommonDir(canonicalPath);
    const branch = runGit(canonicalPath, [
      'symbolic-ref',
      '--quiet',
      '--short',
      'HEAD',
    ]);
    const registered = listWorktrees(identity.repoRoot).some(
      (worktree) =>
        resolve(worktree.path) === canonicalPath
        && worktree.branch === identity.branch,
    );
    if (
      root !== canonicalPath
      || commonDir !== expectedCommonDir
      || branch !== identity.branch
      || !registered
    ) {
      throw new Error(
        `workspace identity conflict: expected ${identity.branch} at ${
          identity.worktreePath
        }, found ${branch} at ${root}`,
      );
    }
  } catch (error) {
    if (
      error instanceof Error
      && /workspace identity conflict/i.test(error.message)
    ) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `workspace identity conflict: expected ${identity.branch} at ${
        identity.worktreePath
      }; ${detail}`,
      { cause: error },
    );
  }
}

function gitCommonDir(repoRoot: string): string {
  return realpathSync(resolve(
    repoRoot,
    runGit(repoRoot, ['rev-parse', '--git-common-dir']),
  ));
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

interface WorktreeEntry {
  path: string;
  branch: string | null;
}

function listWorktrees(repoRoot: string): WorktreeEntry[] {
  const output = runGit(repoRoot, ['worktree', 'list', '--porcelain']);
  if (output.length === 0) return [];
  return output.split(/\n\n+/).map((block) => {
    const lines = block.split('\n');
    const path = lines.find((line) => line.startsWith('worktree '))?.slice(9);
    if (!path) throw new Error('git worktree list returned an invalid entry');
    const branchRef = lines.find((line) => line.startsWith('branch '))?.slice(7);
    return {
      path,
      branch: branchRef?.startsWith('refs/heads/')
        ? branchRef.slice('refs/heads/'.length)
        : null,
    };
  });
}

function assertBranchName(repoRoot: string, branch: string): void {
  if (branch.trim() !== branch || branch.length === 0) {
    throw new Error('managed worktree branch name is invalid');
  }
  runGit(repoRoot, ['check-ref-format', '--branch', branch]);
}

function requireLocalBranch(
  repoRoot: string,
  branch: string,
  label: string,
): void {
  if (!localBranchExists(repoRoot, branch)) {
    throw new Error(`${label} does not exist locally: ${branch}`);
  }
}

function localBranchExists(repoRoot: string, branch: string): boolean {
  return Boolean(tryGit(repoRoot, [
    'show-ref',
    '--verify',
    '--hash',
    `refs/heads/${branch}`,
  ]));
}

function isDoctrinePath(path: string): boolean {
  return path.startsWith('.agents/skills/')
    || path === 'BRAND.md'
    || path.endsWith('/STEERING.md')
    || path === 'STEERING.md';
}

function changedContentPointer(
  repoRoot: string,
  commit: string,
  path: string,
): ReconciliationDoctrinePointer | null {
  const parent = tryGit(repoRoot, ['rev-parse', `${commit}^`]);
  if (!parent) return null;
  const diff = runGit(repoRoot, [
    '--literal-pathspecs',
    'diff',
    '--unified=0',
    parent,
    commit,
    '--',
    path,
  ]);
  const pathAtCommit = runGit(repoRoot, [
    'ls-tree',
    '--name-only',
    commit,
    '--',
    path,
  ]);
  if (pathAtCommit !== path) return null;
  const fileLines = runGitBytes(repoRoot, [
    'show',
    `${commit}:${path}`,
  ]).toString('utf8').split('\n');
  for (const line of diff.split('\n')) {
    const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/u.exec(line);
    if (!match) continue;
    const start = Number(match[1]);
    const count = Number(match[2] ?? '1');
    if (count < 1) continue;
    const content = fileLines.slice(start - 1, start - 1 + count).join('\n');
    if (content.trim() === '') continue;
    return {
      path,
      anchor: `lines:${start}-${start + count - 1}`,
      content,
      contentHash: `sha256:${
        createHash('sha256').update(content).digest('hex')
      }`,
    };
  }
  return null;
}

interface ChangedDoctrineHunk {
  path: string;
  oldStart: number;
  newStart: number;
  removed: string[];
  added: string[];
}

function verifyCommitAfterHandoff(
  repoRoot: string,
  commit: string,
  changedPaths: string[],
  expectation: ReconciliationVerificationExpectation,
): void {
  if (expectation.preparedHead) {
    const preparedHead = tryGit(repoRoot, [
      'rev-parse',
      '--verify',
      `${expectation.preparedHead}^{commit}`,
    ]);
    const followsPreparedHead = preparedHead !== undefined
      && preparedHead !== commit
      && isAncestor(repoRoot, preparedHead, commit);
    if (!followsPreparedHead) {
      throw reconciliationMismatch(
        `reconciliation commit verification refused: checked commit ${
          commit
        } predates this lesson handoff; expected a descendant after prepared HEAD ${
          expectation.preparedHead
        }.`,
        repoRoot,
        commit,
        changedPaths,
      );
    }
    return;
  }

  const commitTimestamp = Date.parse(
    runGit(repoRoot, ['show', '-s', '--format=%cI', commit]),
  );
  const preparedTimestamp = Date.parse(expectation.preparedAt);
  if (
    !Number.isFinite(commitTimestamp)
    || !Number.isFinite(preparedTimestamp)
    || commitTimestamp <= preparedTimestamp
  ) {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: checked commit ${
        commit
      } predates this lesson handoff prepared at ${expectation.preparedAt}.`,
      repoRoot,
      commit,
      changedPaths,
    );
  }
}

function isAncestor(
  repoRoot: string,
  ancestor: string,
  descendant: string,
): boolean {
  try {
    runGit(repoRoot, [
      'merge-base',
      '--is-ancestor',
      ancestor,
      descendant,
    ]);
    return true;
  } catch (error) {
    if (gitExitStatus(error) === 1) return false;
    throw error;
  }
}

function matchExpectedReconciliationHunks(
  repoRoot: string,
  commit: string,
  doctrinePaths: string[],
  changedPaths: string[],
  expectation: ReconciliationVerificationExpectation,
): ReconciliationDoctrinePointer[] {
  const hunks = doctrinePaths.flatMap((path) =>
    changedDoctrineHunks(repoRoot, commit, path));
  let matchedPrior: {
    pointer: NonNullable<
      ReconciliationVerificationExpectation['priorPointer']
    >;
    lines: string[];
  } | null = null;
  if (expectation.kind !== 'apply') {
    const prior = expectation.priorPointer;
    if (!prior) {
      throw reconciliationMismatch(
        `reconciliation commit verification refused: checked commit ${
          commit
        } for the current lesson, but no recorded predecessor anchor was available.`,
        repoRoot,
        commit,
        changedPaths,
      );
    }
    const priorLines = pointerLinesAtCommit(
      repoRoot,
      expectation.preparedHead ?? `${commit}^`,
      prior,
      commit,
      changedPaths,
    );
    const removed = hunks.some((hunk) =>
      hunk.path === prior.path
      && findLineSequence(hunk.removed, priorLines) >= 0);
    if (!removed) {
      throw reconciliationMismatch(
        `reconciliation commit verification refused: checked commit ${
          commit
        } for the current lesson; the recorded predecessor anchor ${
          prior.anchor
        } in ${prior.path} was not removed.`,
        repoRoot,
        commit,
        changedPaths,
      );
    }
    matchedPrior = { pointer: prior, lines: priorLines };
  }

  if (expectation.kind === 'retire') {
    const prior = matchedPrior!.pointer;
    const content = matchedPrior!.lines.join('\n');
    return [{
      path: prior.path,
      anchor: prior.anchor,
      content,
      contentHash: prior.contentHash,
    }];
  }
  const candidateLines = markdownAnchorLines(expectation.candidateMarkdown);
  if (candidateLines.length === 0) {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: checked commit ${
        commit
      } for the current lesson, but its reviewed candidate anchor is empty.`,
      repoRoot,
      commit,
      changedPaths,
    );
  }
  for (const hunk of hunks) {
    const offset = findLineSequence(hunk.added, candidateLines);
    if (offset < 0) continue;
    const start = hunk.newStart + offset;
    const content = candidateLines.join('\n');
    return [{
      path: hunk.path,
      anchor: `lines:${start}-${start + candidateLines.length - 1}`,
      content,
      contentHash: `sha256:${
        createHash('sha256').update(content).digest('hex')
      }`,
    }];
  }
  throw reconciliationMismatch(
    `reconciliation commit verification refused: checked commit ${
      commit
    } for the current lesson; its reviewed candidate anchor was not found in added doctrine content.`,
    repoRoot,
    commit,
    changedPaths,
  );
}

function changedDoctrineHunks(
  repoRoot: string,
  commit: string,
  path: string,
): ChangedDoctrineHunk[] {
  const parent = tryGit(repoRoot, ['rev-parse', `${commit}^`]);
  if (!parent) return [];
  const diff = runGit(repoRoot, [
    '--literal-pathspecs',
    'diff',
    '--unified=0',
    parent,
    commit,
    '--',
    path,
  ]);
  const hunks: ChangedDoctrineHunk[] = [];
  let current: ChangedDoctrineHunk | null = null;
  for (const line of diff.split('\n')) {
    const header =
      /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(line);
    if (header) {
      current = {
        path,
        oldStart: Number(header[1]),
        newStart: Number(header[2]),
        removed: [],
        added: [],
      };
      hunks.push(current);
      continue;
    }
    if (!current || line.startsWith('+++') || line.startsWith('---')) {
      continue;
    }
    if (line.startsWith('+')) current.added.push(line.slice(1));
    if (line.startsWith('-')) current.removed.push(line.slice(1));
  }
  return hunks;
}

function pointerLinesAtCommit(
  repoRoot: string,
  pointerCommit: string,
  pointer: {
    path: string;
    anchor: string;
    contentHash: string;
  },
  checkedCommit: string,
  changedPaths: string[],
): string[] {
  const match = /^lines:(\d+)-(\d+)$/u.exec(pointer.anchor);
  if (!match) {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: recorded predecessor anchor ${
        pointer.anchor
      } in ${pointer.path} is invalid.`,
      repoRoot,
      checkedCommit,
      changedPaths,
    );
  }
  const lines = runGitBytes(repoRoot, [
    'show',
    `${pointerCommit}:${pointer.path}`,
  ]).toString('utf8').split('\n');
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (start < 1 || end < start || end > lines.length) {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: recorded predecessor anchor ${
        pointer.anchor
      } in ${pointer.path} does not resolve at the prepared repository boundary.`,
      repoRoot,
      checkedCommit,
      changedPaths,
    );
  }
  const content = lines.slice(start - 1, end).join('\n');
  const contentHash = `sha256:${
    createHash('sha256').update(content).digest('hex')
  }`;
  if (contentHash !== pointer.contentHash) {
    throw reconciliationMismatch(
      `reconciliation commit verification refused: recorded predecessor anchor ${
        pointer.anchor
      } in ${pointer.path} does not match its prepared content hash.`,
      repoRoot,
      checkedCommit,
      changedPaths,
    );
  }
  return content.split('\n');
}

function markdownAnchorLines(markdown: string | null): string[] {
  if (markdown === null) return [];
  const lines = markdown.replace(/\r\n?/gu, '\n').split('\n');
  while (lines[0]?.trim() === '') lines.shift();
  while (lines.at(-1)?.trim() === '') lines.pop();
  return lines;
}

function findLineSequence(
  haystack: string[],
  needle: string[],
): number {
  if (needle.length === 0 || needle.length > haystack.length) return -1;
  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    if (needle.every((line, offset) => haystack[index + offset] === line)) {
      return index;
    }
  }
  return -1;
}

function reconciliationMismatch(
  message: string,
  repositoryRoot: string,
  commit: string,
  changedPaths: string[] | null,
): ReconciliationCommitMismatchError {
  return new ReconciliationCommitMismatchError(message, {
    commit,
    repositoryRoot,
    changedPaths,
  });
}

function formatPaths(paths: string[]): string {
  return `[${paths.join(', ')}]`;
}

function joinExpectedChecks(checks: string[]): string {
  return checks.length === 1
    ? checks[0]!
    : `${checks.slice(0, -1).join(', ')} and ${checks.at(-1)}`;
}

function gitExitStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  if (typeof status === 'number') return status;
  return gitExitStatus((error as { cause?: unknown }).cause);
}
