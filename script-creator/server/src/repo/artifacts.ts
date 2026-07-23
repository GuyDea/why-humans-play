import { createHash, randomBytes } from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
  win32,
} from 'node:path';

export interface WriteArtifactOptions {
  expectedHash: string;
}

export interface WriteNewArtifactOptions {
  expectNew: true;
}

export type ArtifactExpectedState =
  | WriteArtifactOptions
  | WriteNewArtifactOptions;

export interface ArtifactWriteHooks {
  beforeExchange?(): void;
  afterExchange?(): void;
}

export type ArtifactWriteResult =
  | { conflict: false; hash: string }
  | {
    conflict: true;
    currentHash: string | 'absent';
    parked?: string[];
  };

export interface PipelineRow {
  episodeSlug: string;
  milestone: string;
  ref: string;
}

const ALLOWED_DIRECTORY_PREFIXES = [
  'whp-youtube/topics/',
  'whp-youtube/drafts/',
  'whp-youtube/architectures/',
  'whp-youtube/topic-runs/',
] as const;
const PIPELINE_PATH = 'whp-youtube/PIPELINE.md';

class AsyncMutex {
  private tail = Promise.resolve();

  async run<T>(task: () => T | Promise<T>): Promise<T> {
    const previous = this.tail;
    let release = () => {};
    this.tail = new Promise<void>((resolveLock) => {
      release = resolveLock;
    });
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  }
}

const WRITE_MUTEX = new AsyncMutex();

interface FileIdentity {
  bytes: Buffer;
  hash: string;
  dev: bigint;
  ino: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
}

interface IdentityRead {
  identity: FileIdentity | 'absent';
  stable: boolean;
}

function invalidArtifactPath(relPath: string): Error {
  return new Error(`invalid or non-whitelisted artifact path: ${relPath}`);
}

function resolveArtifactPath(repoRoot: string, relPath: string): {
  repoRoot: string;
  target: string;
} {
  if (
    relPath.length === 0
    || relPath.includes('\0')
    || relPath.includes('\\')
    || isAbsolute(relPath)
    || win32.isAbsolute(relPath)
    || relPath.split('/').some((part) => part === '..')
  ) {
    throw invalidArtifactPath(relPath);
  }

  const allowed = relPath === PIPELINE_PATH
    || ALLOWED_DIRECTORY_PREFIXES.some(
      (prefix) => relPath.startsWith(prefix) && relPath.length > prefix.length,
    );
  if (!allowed) throw invalidArtifactPath(relPath);

  const absoluteRepoRoot = realpathSync(repoRoot);
  const target = resolve(absoluteRepoRoot, relPath);
  if (!target.startsWith(`${absoluteRepoRoot}${sep}`)) {
    throw invalidArtifactPath(relPath);
  }
  return { repoRoot: absoluteRepoRoot, target };
}

function ensureSafeParent(repoRoot: string, target: string, relPath: string): void {
  const relativeParent = relative(repoRoot, dirname(target));
  let current = repoRoot;

  for (const segment of relativeParent.split(sep)) {
    current = join(current, segment);
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw invalidArtifactPath(relPath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      mkdirSync(current);
    }
  }
}

function readIdentity(target: string, relPath: string): IdentityRead {
  let descriptor: number | undefined;
  try {
    const pathStat = lstatSync(target, { bigint: true });
    if (pathStat.isSymbolicLink() || !pathStat.isFile()) {
      throw invalidArtifactPath(relPath);
    }
    descriptor = openSync(
      target,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
    );
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile()) throw invalidArtifactPath(relPath);
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    closeSync(descriptor);
    descriptor = undefined;
    const latestPath = lstatSync(target, { bigint: true });
    if (latestPath.isSymbolicLink() || !latestPath.isFile()) {
      throw invalidArtifactPath(relPath);
    }
    return {
      identity: {
        bytes,
        hash: createHash('sha256').update(bytes).digest('hex'),
        dev: after.dev,
        ino: after.ino,
        size: after.size,
        mtimeNs: after.mtimeNs,
        ctimeNs: after.ctimeNs,
      },
      stable: sameStat(pathStat, before)
        && sameStat(before, after)
        && sameStat(after, latestPath),
    };
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { identity: 'absent', stable: true };
    }
    throw error;
  }
}

function sameStat(
  left: ReturnType<typeof lstatSync>,
  right: ReturnType<typeof lstatSync>,
): boolean {
  const a = left as unknown as {
    dev: bigint;
    ino: bigint;
    size: bigint;
    mtimeNs: bigint;
    ctimeNs: bigint;
  };
  const b = right as unknown as typeof a;
  return a.dev === b.dev
    && a.ino === b.ino
    && a.size === b.size
    && a.mtimeNs === b.mtimeNs
    && a.ctimeNs === b.ctimeNs;
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs
    && left.hash === right.hash;
}

function sameIdentityStat(
  identity: FileIdentity,
  stat: ReturnType<typeof lstatSync>,
): boolean {
  const candidate = stat as unknown as {
    dev: bigint;
    ino: bigint;
    size: bigint;
    mtimeNs: bigint;
    ctimeNs: bigint;
  };
  return identity.dev === candidate.dev
    && identity.ino === candidate.ino
    && identity.size === candidate.size
    && identity.mtimeNs === candidate.mtimeNs
    && identity.ctimeNs === candidate.ctimeNs;
}

function stateHash(read: IdentityRead): string | 'absent' {
  return read.identity === 'absent' ? 'absent' : read.identity.hash;
}

function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function createParkedPath(
  target: string,
  kind: 'conflict' | 'displaced',
  create: (path: string) => void,
): string {
  let timestamp = Date.now();
  for (;;) {
    const path = `${target}.sc-${kind}-${timestamp}`;
    try {
      create(path);
      return path;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      timestamp += 1;
    }
  }
}

function parkContent(
  target: string,
  kind: 'conflict' | 'displaced',
  content: string | Buffer,
): string {
  return createParkedPath(target, kind, (path) => {
    let descriptor: number | undefined;
    let created = false;
    try {
      descriptor = openSync(path, 'wx', 0o666);
      created = true;
      writeFileSync(descriptor, content);
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = undefined;
    } catch (error) {
      if (descriptor !== undefined) closeSync(descriptor);
      if (created) rmSync(path, { force: true });
      throw error;
    }
  });
}

function parseTableRow(line: string): string[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return undefined;

  const cells: string[] = [];
  let cell = '';
  for (let index = 1; index < trimmed.length - 1; index += 1) {
    const character = trimmed[index]!;
    if (character === '\\' && trimmed[index + 1] === '|') {
      cell += '|';
      index += 1;
    } else if (character === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function isPipelineHeader(line: string): boolean {
  const cells = parseTableRow(line)?.map((cell) => cell.toLowerCase());
  return cells?.[0] === 'episode'
    && cells[1] === 'milestone'
    && cells[2] === 'ref';
}

function isTableSeparator(line: string): boolean {
  const cells = parseTableRow(line);
  return cells !== undefined
    && cells.length >= 3
    && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function formatCell(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function formatPipelineRow(row: PipelineRow): string {
  return `| ${formatCell(row.episodeSlug)} | ${formatCell(row.milestone)} | ${formatCell(row.ref)} |`;
}

function upsertPipelineContent(existing: string, row: PipelineRow): string {
  const rowLine = formatPipelineRow(row);
  if (existing.length === 0) {
    return [
      '| Episode | Milestone | Ref |',
      '| --- | --- | --- |',
      rowLine,
      '',
    ].join('\n');
  }

  const lines = existing.split('\n');
  const headerIndex = lines.findIndex(
    (line, index) => isPipelineHeader(line)
      && lines[index + 1] !== undefined
      && isTableSeparator(lines[index + 1]!),
  );

  if (headerIndex === -1) {
    const separator = existing.endsWith('\n\n')
      ? ''
      : existing.endsWith('\n') ? '\n' : '\n\n';
    return `${existing}${separator}${[
      '| Episode | Milestone | Ref |',
      '| --- | --- | --- |',
      rowLine,
      '',
    ].join('\n')}`;
  }

  let insertionIndex = headerIndex + 2;
  while (insertionIndex < lines.length) {
    const cells = parseTableRow(lines[insertionIndex]!);
    if (!cells) break;
    if (cells[0] === row.episodeSlug) {
      lines[insertionIndex] = rowLine;
      return lines.join('\n');
    }
    insertionIndex += 1;
  }

  lines.splice(insertionIndex, 0, rowLine);
  return lines.join('\n');
}

export function writeArtifact(
  repoRoot: string,
  relPath: string,
  content: string,
  expectedState: ArtifactExpectedState,
  hooks: ArtifactWriteHooks = {},
): Promise<ArtifactWriteResult> {
  return WRITE_MUTEX.run(() => writeArtifactLocked(
    repoRoot,
    relPath,
    content,
    expectedState,
    hooks,
  ));
}

async function writeArtifactLocked(
  repoRoot: string,
  relPath: string,
  content: string,
  expectedState: ArtifactExpectedState | undefined,
  hooks: ArtifactWriteHooks,
): Promise<ArtifactWriteResult> {
  const resolved = resolveArtifactPath(repoRoot, relPath);
  ensureSafeParent(resolved.repoRoot, resolved.target, relPath);

  const initial = readIdentity(resolved.target, relPath);
  const replacing = expectedState !== undefined
    && 'expectedHash' in expectedState;
  const expectedHash = replacing
    ? expectedState.expectedHash
    : undefined;
  const creating = expectedState !== undefined
    && 'expectNew' in expectedState
    && expectedState.expectNew === true;
  if (!replacing && !creating) {
    return { conflict: true, currentHash: stateHash(initial) };
  }
  if (replacing) {
    if (
      initial.identity === 'absent'
      || !initial.stable
      || initial.identity.hash !== expectedState.expectedHash
    ) {
      return { conflict: true, currentHash: stateHash(initial) };
    }
  } else if (initial.identity !== 'absent') {
    return { conflict: true, currentHash: stateHash(initial) };
  }

  /*
   * Detects human-timescale concurrent edits; never silently overwrites; on any detected conflict both versions survive. A sub-millisecond window between the final identity check and rename is irreducible without OS-level locks and is accepted for this single-user local tool.
   */
  const tempPath = join(
    dirname(resolved.target),
    `.${basename(resolved.target)}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`,
  );
  const snapshotPath = join(
    dirname(resolved.target),
    `.${basename(resolved.target)}.${process.pid}.${randomBytes(8).toString('hex')}.snapshot`,
  );
  let tempFd: number | undefined;
  let snapshotCreated = false;
  try {
    tempFd = openSync(tempPath, 'wx', 0o666);
    writeFileSync(tempFd, content, 'utf8');
    fsyncSync(tempFd);
    const tempIdentity = fstatSync(tempFd, { bigint: true });
    const intendedHash = contentHash(content);

    if (creating) {
      try {
        linkSync(tempPath, resolved.target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          return {
            conflict: true,
            currentHash: stateHash(readIdentity(resolved.target, relPath)),
          };
        }
        throw error;
      }
      const targetIdentity = lstatSync(resolved.target, { bigint: true });
      if (
        !targetIdentity.isFile()
        || targetIdentity.dev !== tempIdentity.dev
        || targetIdentity.ino !== tempIdentity.ino
      ) {
        return {
          conflict: true,
          currentHash: stateHash(readIdentity(resolved.target, relPath)),
        };
      }
      return { conflict: false, hash: intendedHash };
    }

    try {
      linkSync(resolved.target, snapshotPath);
      snapshotCreated = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { conflict: true, currentHash: 'absent' };
      }
      throw error;
    }

    const snapshot = readIdentity(snapshotPath, relPath);
    const current = readIdentity(resolved.target, relPath);
    if (
      snapshot.identity === 'absent'
      || !snapshot.stable
      || snapshot.identity.hash !== expectedHash
      || current.identity === 'absent'
      || !current.stable
      || !sameIdentity(snapshot.identity, current.identity)
    ) {
      const currentHash = stateHash(current);
      unlinkSync(snapshotPath);
      snapshotCreated = false;
      return { conflict: true, currentHash };
    }

    const recoverConflict = (
      winner: IdentityRead,
    ): ArtifactWriteResult => {
      const parked = [
        parkContent(resolved.target, 'conflict', content),
      ];
      const displaced = readIdentity(snapshotPath, relPath);
      if (
        displaced.identity !== 'absent'
        && displaced.stable
        && displaced.identity.hash !== stateHash(winner)
      ) {
        parked.push(parkContent(
          resolved.target,
          'displaced',
          displaced.identity.bytes,
        ));
      }
      unlinkSync(snapshotPath);
      snapshotCreated = false;
      return {
        conflict: true,
        currentHash: stateHash(winner),
        parked,
      };
    };

    hooks.beforeExchange?.();
    let exchangeIdentity: ReturnType<typeof lstatSync>;
    try {
      exchangeIdentity = lstatSync(resolved.target, { bigint: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return recoverConflict({ identity: 'absent', stable: true });
      }
      throw error;
    }
    if (
      !exchangeIdentity.isFile()
      || !sameIdentityStat(snapshot.identity, exchangeIdentity)
    ) {
      return recoverConflict(readIdentity(resolved.target, relPath));
    }

    renameSync(tempPath, resolved.target);
    hooks.afterExchange?.();
    const installed = readIdentity(resolved.target, relPath);
    if (
      installed.identity === 'absent'
      || !installed.stable
      || installed.identity.dev !== tempIdentity.dev
      || installed.identity.ino !== tempIdentity.ino
      || installed.identity.hash !== intendedHash
    ) {
      return recoverConflict(installed);
    }

    unlinkSync(snapshotPath);
    snapshotCreated = false;
    return { conflict: false, hash: intendedHash };
  } catch (error) {
    if (snapshotCreated) {
      unlinkSync(snapshotPath);
      snapshotCreated = false;
    }
    throw error;
  } finally {
    if (tempFd !== undefined) closeSync(tempFd);
    rmSync(tempPath, { force: true });
    rmSync(snapshotPath, { force: true });
  }
}

export function upsertPipelineRow(
  repoRoot: string,
  row: PipelineRow,
  hooks: ArtifactWriteHooks = {},
): Promise<ArtifactWriteResult> {
  return WRITE_MUTEX.run(async () => {
    const resolved = resolveArtifactPath(repoRoot, PIPELINE_PATH);
    ensureSafeParent(resolved.repoRoot, resolved.target, PIPELINE_PATH);
    const existing = readIdentity(resolved.target, PIPELINE_PATH);
    if (!existing.stable) {
      return { conflict: true, currentHash: stateHash(existing) };
    }
    const content = upsertPipelineContent(
      existing.identity === 'absent'
        ? ''
        : existing.identity.bytes.toString('utf8'),
      row,
    );
    const expectedState: ArtifactExpectedState =
      existing.identity === 'absent'
        ? { expectNew: true }
        : { expectedHash: existing.identity.hash };
    return writeArtifactLocked(
      repoRoot,
      PIPELINE_PATH,
      content,
      expectedState,
      hooks,
    );
  });
}
