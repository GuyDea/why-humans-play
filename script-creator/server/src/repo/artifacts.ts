import { createHash, randomBytes } from 'node:crypto';
import {
  closeSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
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
  expectedHash?: string;
}

export type ArtifactWriteResult =
  | { conflict: false; hash: string }
  | { conflict: true; currentHash: string };

export interface PipelineRow {
  episodeSlug: string;
  milestone: string;
  ref: string;
}

const ALLOWED_DIRECTORY_PREFIXES = [
  'whp-youtube/topics/',
  'whp-youtube/drafts/',
  'whp-youtube/topic-runs/',
] as const;
const PIPELINE_PATH = 'whp-youtube/PIPELINE.md';

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

function currentFileHash(target: string, relPath: string): string | undefined {
  try {
    const stat = lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw invalidArtifactPath(relPath);
    }
    return createHash('sha256').update(readFileSync(target)).digest('hex');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
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
  options: WriteArtifactOptions = {},
): ArtifactWriteResult {
  const resolved = resolveArtifactPath(repoRoot, relPath);
  ensureSafeParent(resolved.repoRoot, resolved.target, relPath);

  const currentHash = currentFileHash(resolved.target, relPath);
  if (
    options.expectedHash !== undefined
    && currentHash !== undefined
    && currentHash !== options.expectedHash
  ) {
    return { conflict: true, currentHash };
  }

  const tempPath = join(
    dirname(resolved.target),
    `.${basename(resolved.target)}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`,
  );
  let tempFd: number | undefined;
  try {
    tempFd = openSync(tempPath, 'wx', 0o666);
    writeFileSync(tempFd, content, 'utf8');
    fsyncSync(tempFd);
    closeSync(tempFd);
    tempFd = undefined;

    if (options.expectedHash !== undefined) {
      const latestHash = currentFileHash(resolved.target, relPath);
      if (latestHash !== undefined && latestHash !== options.expectedHash) {
        return { conflict: true, currentHash: latestHash };
      }
    }

    renameSync(tempPath, resolved.target);
    return { conflict: false, hash: contentHash(content) };
  } finally {
    if (tempFd !== undefined) closeSync(tempFd);
    rmSync(tempPath, { force: true });
  }
}

export function upsertPipelineRow(
  repoRoot: string,
  row: PipelineRow,
): ArtifactWriteResult {
  const resolved = resolveArtifactPath(repoRoot, PIPELINE_PATH);
  const existingHash = currentFileHash(resolved.target, PIPELINE_PATH);
  const existing = existingHash === undefined
    ? ''
    : readFileSync(resolved.target, 'utf8');
  const content = upsertPipelineContent(existing, row);

  return writeArtifact(
    repoRoot,
    PIPELINE_PATH,
    content,
    existingHash === undefined ? {} : { expectedHash: existingHash },
  );
}
