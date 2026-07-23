import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  upsertPipelineRow,
  writeArtifact,
} from '../../src/repo/artifacts.js';

function makeRepo(): string {
  return mkdtempSync(join(tmpdir(), 'repo-artifacts-'));
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

describe('writeArtifact', () => {
  it.each([
    'whp-youtube/topics/example.md',
    'whp-youtube/drafts/example.md',
    'whp-youtube/topic-runs/example.md',
    'whp-youtube/PIPELINE.md',
  ])('writes %s and creates its parent directories', async (relPath) => {
    const repoRoot = makeRepo();

    const result = await writeArtifact(
      repoRoot,
      relPath,
      'approved content\n',
      { expectNew: true },
    );

    expect(readFileSync(join(repoRoot, relPath), 'utf8')).toBe('approved content\n');
    expect(result).toEqual({
      conflict: false,
      hash: sha256('approved content\n'),
    });
  });

  it.each([
    '/tmp/outside.md',
    'C:\\outside.md',
    '../outside.md',
    'whp-youtube/topics/../../outside.md',
    'whp-youtube/episodes/example.md',
    'whp-youtube/topics',
    'whp-youtube/PIPELINE.md/child.md',
  ])('rejects non-whitelisted or unsafe path %s', async (relPath) => {
    const repoRoot = makeRepo();

    await expect(writeArtifact(
      repoRoot,
      relPath,
      'nope',
      { expectNew: true },
    )).rejects.toThrow(
      /artifact path/i,
    );
  });

  it('rejects a whitelisted path whose parent escapes through a symlink', async () => {
    const repoRoot = makeRepo();
    const outside = mkdtempSync(join(tmpdir(), 'repo-artifacts-outside-'));
    mkdirSync(join(repoRoot, 'whp-youtube'), { recursive: true });
    symlinkSync(outside, join(repoRoot, 'whp-youtube', 'topics'));

    await expect(writeArtifact(
      repoRoot,
      'whp-youtube/topics/escaped.md',
      'nope',
      { expectNew: true },
    )).rejects.toThrow(/artifact path/i);
    expect(readdirSync(outside)).toEqual([]);
  });

  it('replaces an existing artifact through a same-directory rename', async () => {
    const repoRoot = makeRepo();
    const relPath = 'whp-youtube/drafts/example.md';
    const target = join(repoRoot, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'old');
    const oldInode = statSync(target).ino;

    await writeArtifact(repoRoot, relPath, 'new', {
      expectedHash: sha256('old'),
    });

    expect(readFileSync(target, 'utf8')).toBe('new');
    expect(statSync(target).ino).not.toBe(oldInode);
    expect(readdirSync(dirname(target))).toEqual(['example.md']);
  });

  it('refuses a stale expected hash without clobbering the current file', async () => {
    const repoRoot = makeRepo();
    const relPath = 'whp-youtube/topics/example.md';
    const target = join(repoRoot, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'external edit');

    const result = await writeArtifact(repoRoot, relPath, 'our edit', {
      expectedHash: sha256('stale content'),
    });

    expect(result).toEqual({
      conflict: true,
      currentHash: sha256('external edit'),
    });
    expect(readFileSync(target, 'utf8')).toBe('external edit');
    expect(readdirSync(dirname(target))).toEqual(['example.md']);
  });

  it('writes when the expected hash matches the current file', async () => {
    const repoRoot = makeRepo();
    const relPath = 'whp-youtube/topics/example.md';
    const target = join(repoRoot, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'expected content');

    const result = await writeArtifact(repoRoot, relPath, 'replacement', {
      expectedHash: sha256('expected content'),
    });

    expect(result).toEqual({
      conflict: false,
      hash: sha256('replacement'),
    });
    expect(readFileSync(target, 'utf8')).toBe('replacement');
  });

  it('conflicts when an existing file has no expected state', async () => {
    const repoRoot = makeRepo();
    const relPath = 'whp-youtube/topics/example.md';
    const target = join(repoRoot, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'external edit');

    const result = await writeArtifact(
      repoRoot,
      relPath,
      'our edit',
      undefined as never,
    );

    expect(result).toEqual({
      conflict: true,
      currentHash: sha256('external edit'),
    });
    expect(readFileSync(target, 'utf8')).toBe('external edit');
  });

  it('conflicts when a replacement target was unexpectedly deleted', async () => {
    const repoRoot = makeRepo();

    const result = await writeArtifact(
      repoRoot,
      'whp-youtube/topics/missing.md',
      'replacement',
      { expectedHash: sha256('expected content') },
    );

    expect(result).toEqual({ conflict: true, currentHash: 'absent' });
  });

  it('conflicts when a creation target is unexpectedly present', async () => {
    const repoRoot = makeRepo();
    const relPath = 'whp-youtube/topics/example.md';
    const target = join(repoRoot, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'external file');

    const result = await writeArtifact(
      repoRoot,
      relPath,
      'new file',
      { expectNew: true },
    );

    expect(result).toEqual({
      conflict: true,
      currentHash: sha256('external file'),
    });
    expect(readFileSync(target, 'utf8')).toBe('external file');
  });

  it('preserves an external mutation at the final replacement boundary', async () => {
    const repoRoot = makeRepo();
    const relPath = 'whp-youtube/topics/example.md';
    const target = join(repoRoot, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'expected content');

    const result = await writeArtifact(
      repoRoot,
      relPath,
      'our replacement',
      { expectedHash: sha256('expected content') },
      {
        afterSnapshotCreated: () => {
          writeFileSync(target, 'external mutation');
        },
      },
    );

    expect(result).toEqual({
      conflict: true,
      currentHash: sha256('external mutation'),
    });
    expect(readFileSync(target, 'utf8')).toBe('external mutation');
    expect(readdirSync(dirname(target))).toEqual(['example.md']);
  });

  it('preserves an external deletion at the final replacement boundary', async () => {
    const repoRoot = makeRepo();
    const relPath = 'whp-youtube/topics/example.md';
    const target = join(repoRoot, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'expected content');

    const result = await writeArtifact(
      repoRoot,
      relPath,
      'our replacement',
      { expectedHash: sha256('expected content') },
      {
        afterSnapshotCreated: () => {
          rmSync(target);
        },
      },
    );

    expect(result).toEqual({ conflict: true, currentHash: 'absent' });
    expect(readdirSync(dirname(target))).toEqual([]);
  });

  it('restores the snapshot when an external rename displaces our replacement', async () => {
    const repoRoot = makeRepo();
    const relPath = 'whp-youtube/topics/example.md';
    const target = join(repoRoot, relPath);
    const external = join(dirname(target), 'external.md');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'expected content');

    const result = await writeArtifact(
      repoRoot,
      relPath,
      'our replacement',
      { expectedHash: sha256('expected content') },
      {
        afterRename: () => {
          writeFileSync(external, 'external displacement');
          renameSync(external, target);
        },
      },
    );

    expect(result).toEqual({
      conflict: true,
      currentHash: sha256('external displacement'),
    });
    expect(readFileSync(target, 'utf8')).toBe('expected content');
    expect(readdirSync(dirname(target))).toEqual(['example.md']);
  });
});

describe('upsertPipelineRow', () => {
  it('creates PIPELINE.md with a Markdown table and the keyed row', async () => {
    const repoRoot = makeRepo();

    await upsertPipelineRow(repoRoot, {
      episodeSlug: 'why-we-play',
      milestone: 'creative-approved',
      ref: 'whp-youtube/drafts/why-we-play.md',
    });

    expect(readFileSync(join(repoRoot, 'whp-youtube', 'PIPELINE.md'), 'utf8'))
      .toBe([
        '| Episode | Milestone | Ref |',
        '| --- | --- | --- |',
        '| why-we-play | creative-approved | whp-youtube/drafts/why-we-play.md |',
        '',
      ].join('\n'));
  });

  it('updates the row keyed by episode slug while preserving all other content', async () => {
    const repoRoot = makeRepo();
    const pipelinePath = join(repoRoot, 'whp-youtube', 'PIPELINE.md');
    mkdirSync(dirname(pipelinePath), { recursive: true });
    writeFileSync(pipelinePath, [
      '# Production pipeline',
      '',
      '| Episode | Milestone | Ref |',
      '| --- | --- | --- |',
      '| why-we-play | topic-approved | whp-youtube/topics/why-we-play.md |',
      '| another-episode | draft | whp-youtube/drafts/another-episode.md |',
      '',
      'Keep this note.',
      '',
    ].join('\n'));

    await upsertPipelineRow(repoRoot, {
      episodeSlug: 'why-we-play',
      milestone: 'creative-approved',
      ref: 'whp-youtube/drafts/why-we-play.md',
    });

    expect(readFileSync(pipelinePath, 'utf8')).toBe([
      '# Production pipeline',
      '',
      '| Episode | Milestone | Ref |',
      '| --- | --- | --- |',
      '| why-we-play | creative-approved | whp-youtube/drafts/why-we-play.md |',
      '| another-episode | draft | whp-youtube/drafts/another-episode.md |',
      '',
      'Keep this note.',
      '',
    ].join('\n'));
  });

  it('appends a new keyed row to the existing table without changing other rows', async () => {
    const repoRoot = makeRepo();
    const pipelinePath = join(repoRoot, 'whp-youtube', 'PIPELINE.md');
    mkdirSync(dirname(pipelinePath), { recursive: true });
    writeFileSync(pipelinePath, [
      '| Episode | Milestone | Ref |',
      '| --- | --- | --- |',
      '| another-episode | draft | whp-youtube/drafts/another-episode.md |',
      '',
    ].join('\n'));

    await upsertPipelineRow(repoRoot, {
      episodeSlug: 'why-we-play',
      milestone: 'topic-approved',
      ref: 'whp-youtube/topics/why-we-play.md',
    });

    expect(readFileSync(pipelinePath, 'utf8')).toBe([
      '| Episode | Milestone | Ref |',
      '| --- | --- | --- |',
      '| another-episode | draft | whp-youtube/drafts/another-episode.md |',
      '| why-we-play | topic-approved | whp-youtube/topics/why-we-play.md |',
      '',
    ].join('\n'));
  });

  it('preserves an external PIPELINE mutation after its snapshot is created', async () => {
    const repoRoot = makeRepo();
    const pipelinePath = join(repoRoot, 'whp-youtube', 'PIPELINE.md');
    mkdirSync(dirname(pipelinePath), { recursive: true });
    writeFileSync(pipelinePath, [
      '| Episode | Milestone | Ref |',
      '| --- | --- | --- |',
      '| existing | draft | whp-youtube/drafts/existing.md |',
      '',
    ].join('\n'));

    const result = await upsertPipelineRow(
      repoRoot,
      {
        episodeSlug: 'why-we-play',
        milestone: 'topic-approved',
        ref: 'whp-youtube/topics/why-we-play.md',
      },
      {
        afterSnapshotCreated: () => {
          writeFileSync(pipelinePath, 'external pipeline edit\n');
        },
      },
    );

    expect(result).toEqual({
      conflict: true,
      currentHash: sha256('external pipeline edit\n'),
    });
    expect(readFileSync(pipelinePath, 'utf8')).toBe('external pipeline edit\n');
    expect(readdirSync(dirname(pipelinePath))).toEqual(['PIPELINE.md']);
  });
});
