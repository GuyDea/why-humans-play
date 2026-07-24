import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentStore } from '../../src/documents/store.js';
import {
  MilestoneConflictError,
  MilestoneService,
  SerializedLane,
  WorkspaceChoiceRequiredError,
} from '../../src/repo/milestones.js';

const roots: string[] = [];
const services: MilestoneService[] = [];
const stores: DocumentStore[] = [];

afterEach(() => {
  for (const service of services.splice(0)) service.close();
  for (const store of stores.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function git(repoRoot: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'milestone-service-'));
  roots.push(root);
  const repoRoot = join(root, 'repo');
  const worktreesRoot = join(root, 'worktrees');
  const stateDbFile = join(root, 'state.sqlite3');
  mkdirSync(repoRoot);
  git(repoRoot, ['init', '--initial-branch=main']);
  git(repoRoot, ['config', 'user.name', 'Script Creator Tests']);
  git(repoRoot, ['config', 'user.email', 'script-creator-tests@example.invalid']);
  writeFileSync(join(repoRoot, 'initial.md'), 'initial\n');
  git(repoRoot, ['add', '--', 'initial.md']);
  git(repoRoot, ['commit', '-m', 'initial']);

  const store = new DocumentStore(stateDbFile);
  stores.push(store);
  store.createDraft({
    id: 'draft-1',
    episodeSlug: 'why-we-play',
    title: 'Why We Play',
    format: 'narration',
    doc: {
      type: 'doc',
      attrs: { format: 'narration' },
      content: [],
    },
    architecture: {
      sections: [],
      approvedMd: null,
      approvedAt: null,
    },
    architectureArtifactHash: null,
    narrationReconciliationRequired: false,
    approvedNarrationMd: null,
    approvedNarrationAt: null,
    approvedNarrationRevisionSeq: null,
    narrationArtifactHash: null,
    updatedAt: '2026-07-24T08:00:00.000Z',
  });

  const service = new MilestoneService({
    stateDbFile,
    repoRoot,
    worktreesRoot,
    idFactory: () => 'pending-1',
    now: () => '2026-07-24T09:00:00.000Z',
  });
  services.push(service);
  return { root, repoRoot, worktreesRoot, stateDbFile, service };
}

describe('MilestoneService episode workspace choice', () => {
  it('blocks repository work until a branch location is explicitly chosen', async () => {
    const { service } = fixture();
    let called = false;

    await expect(service.withWorkspace('draft-1', async () => {
      called = true;
    })).rejects.toBeInstanceOf(WorkspaceChoiceRequiredError);

    expect(called).toBe(false);
    expect(await service.status('draft-1')).toMatchObject({
      workspace: null,
      recommendation: {
        defaultBranch: 'main',
        taskName: 'why-we-play',
        branch: 'episode/why-we-play',
      },
    });
  });

  it('creates one managed worktree per episode off the local default and resumes it after restart', async () => {
    const {
      repoRoot,
      stateDbFile,
      worktreesRoot,
      service,
    } = fixture();
    git(repoRoot, ['switch', '-c', 'controller-feature']);
    writeFileSync(join(repoRoot, 'controller.md'), 'controller\n');
    git(repoRoot, ['add', '--', 'controller.md']);
    git(repoRoot, ['commit', '-m', 'controller']);

    const chosen = await service.chooseWorkspace('draft-1', {
      choice: 'new-branch',
      taskName: 'Why We Play',
    });
    expect(chosen).toMatchObject({
      draftId: 'draft-1',
      episodeSlug: 'why-we-play',
      choice: 'new-branch',
      branch: 'episode/why-we-play',
      baseBranch: 'main',
    });
    expect(chosen.worktreePath).toBe(
      realpathSync(join(worktreesRoot, 'why-we-play')),
    );
    expect(git(chosen.worktreePath, ['rev-parse', 'HEAD'])).toBe(
      git(repoRoot, ['rev-parse', 'main']),
    );

    service.close();
    services.splice(services.indexOf(service), 1);
    const restarted = new MilestoneService({
      stateDbFile,
      repoRoot,
      worktreesRoot,
    });
    services.push(restarted);

    expect(await restarted.chooseWorkspace('draft-1', {
      choice: 'new-branch',
      taskName: 'Why We Play',
    })).toEqual(chosen);
  });

  it('records the current branch/root only after explicit confirmation and reports unrelated dirt', async () => {
    const { repoRoot, service } = fixture();
    git(repoRoot, ['switch', '-c', 'episode/current']);
    writeFileSync(join(repoRoot, 'unrelated.md'), 'dirty\n');

    await expect(service.chooseWorkspace('draft-1', {
      choice: 'current-branch',
      confirmed: false,
    })).rejects.toThrow(/confirmed/i);

    const chosen = await service.chooseWorkspace('draft-1', {
      choice: 'current-branch',
      confirmed: true,
    });
    expect(chosen).toMatchObject({
      choice: 'current-branch',
      branch: 'episode/current',
      worktreePath: realpathSync(repoRoot),
      baseBranch: 'main',
    });
    expect((await service.status('draft-1')).dirtyFiles).toEqual([
      'unrelated.md',
    ]);
    expect(git(repoRoot, ['status', '--porcelain'])).toContain(
      '?? unrelated.md',
    );
  });

  it('refuses changed choices, unsafe task names, and changed recorded identities', async () => {
    const { repoRoot, service } = fixture();
    const chosen = await service.chooseWorkspace('draft-1', {
      choice: 'new-branch',
      taskName: 'Why We Play',
    });

    await expect(service.chooseWorkspace('draft-1', {
      choice: 'current-branch',
      confirmed: true,
    })).rejects.toBeInstanceOf(MilestoneConflictError);
    await expect(service.chooseWorkspace('draft-1', {
      choice: 'new-branch',
      taskName: '../escape',
    })).rejects.toThrow(/task name/i);

    git(chosen.worktreePath, ['switch', '-c', 'episode/changed']);
    expect(() => service.workspacePath('draft-1')).toThrow(
      MilestoneConflictError,
    );
    await expect(
      service.withWorkspace('draft-1', async () => undefined),
    ).rejects.toBeInstanceOf(MilestoneConflictError);
    expect(realpathSync(repoRoot)).not.toBe(chosen.worktreePath);
  });
});

describe('MilestoneService pending records', () => {
  it('records only mechanical metadata and exact source hashes after successful writes', async () => {
    const { stateDbFile, service } = fixture();
    const workspace = await service.chooseWorkspace('draft-1', {
      choice: 'new-branch',
      taskName: 'Why We Play',
    });
    const files = [
      'whp-youtube/architectures/why-we-play.md',
      'whp-youtube/PIPELINE.md',
    ];
    await service.withWorkspace('draft-1', async ({ worktreePath }) => {
      mkdirSync(
        join(worktreePath, 'whp-youtube', 'architectures'),
        { recursive: true },
      );
      writeFileSync(join(worktreePath, files[0]!), 'architecture bytes\n');
      writeFileSync(join(worktreePath, files[1]!), 'pipeline bytes\n');
    });

    const pending = await service.recordPending({
      draftId: 'draft-1',
      kind: 'architecture-approval',
      files,
      reconciliationRequired: true,
    });

    expect(pending).toEqual({
      id: 'pending-1',
      draftId: 'draft-1',
      episodeSlug: 'why-we-play',
      kind: 'architecture-approval',
      files,
      commitMessage:
        'feat(why-we-play): record architecture approval milestone',
      sourceHashes: {
        [files[0]!]: createHash('sha256')
          .update('architecture bytes\n')
          .digest('hex'),
        [files[1]!]: createHash('sha256')
          .update('pipeline bytes\n')
          .digest('hex'),
      },
      baseCommitHash: git(workspace.worktreePath, ['rev-parse', 'HEAD']),
      reconciliationRequired: true,
      state: 'pending',
      resultingCommitHash: null,
      createdAt: '2026-07-24T09:00:00.000Z',
      updatedAt: '2026-07-24T09:00:00.000Z',
    });
    expect(pending.commitMessage).not.toContain('architecture bytes');
    expect(workspace.worktreePath).not.toBe('');

    const inspected = new Database(stateDbFile, { readonly: true });
    const row = inspected.prepare(
      'SELECT * FROM pending_milestones WHERE id = ?',
    ).get('pending-1') as Record<string, unknown>;
    inspected.close();
    expect(JSON.stringify(row)).not.toContain('architecture bytes');
    expect(JSON.stringify(row)).not.toContain('pipeline bytes');
  });

  it('is idempotent for the same hashes and conflicts if a pending source changes', async () => {
    const { service } = fixture();
    const workspace = await service.chooseWorkspace('draft-1', {
      choice: 'new-branch',
      taskName: 'Why We Play',
    });
    const file = 'whp-youtube/PIPELINE.md';
    mkdirSync(join(workspace.worktreePath, 'whp-youtube'), {
      recursive: true,
    });
    writeFileSync(join(workspace.worktreePath, file), 'first\n');
    const input = {
      draftId: 'draft-1',
      kind: 'architecture-reopen' as const,
      files: [file],
      reconciliationRequired: true,
    };

    const first = await service.recordPending(input);
    expect(await service.recordPending(input)).toEqual(first);

    writeFileSync(join(workspace.worktreePath, file), 'changed\n');
    await expect(service.recordPending(input)).rejects.toBeInstanceOf(
      MilestoneConflictError,
    );
  });

  it('commits only the immutable pending files/message after explicit confirmation and preserves unrelated dirt', async () => {
    const { repoRoot, service } = fixture();
    writeFileSync(join(repoRoot, 'staged-other.md'), 'baseline\n');
    writeFileSync(join(repoRoot, 'unstaged-other.md'), 'baseline\n');
    git(repoRoot, ['add', '--', 'staged-other.md', 'unstaged-other.md']);
    git(repoRoot, ['commit', '-m', 'unrelated fixtures']);
    const workspace = await service.chooseWorkspace('draft-1', {
      choice: 'current-branch',
      confirmed: true,
    });
    mkdirSync(join(workspace.worktreePath, 'whp-youtube'), {
      recursive: true,
    });
    const milestoneFile = 'whp-youtube/PIPELINE.md';
    writeFileSync(
      join(workspace.worktreePath, milestoneFile),
      'pipeline milestone\n',
    );
    writeFileSync(join(repoRoot, 'staged-other.md'), 'staged dirty\n');
    git(repoRoot, ['add', '--', 'staged-other.md']);
    writeFileSync(join(repoRoot, 'unstaged-other.md'), 'unstaged dirty\n');
    writeFileSync(join(repoRoot, 'untracked-other.md'), 'untracked dirty\n');
    const pending = await service.recordPending({
      draftId: 'draft-1',
      kind: 'architecture-reopen',
      files: [milestoneFile],
      reconciliationRequired: true,
    });

    await expect(service.commitPending({
      draftId: 'draft-1',
      kind: 'architecture-reopen',
      pendingMilestoneId: pending.id,
      confirmed: false,
    })).rejects.toThrow(/confirmed/i);

    const committed = await service.commitPending({
      draftId: 'draft-1',
      kind: 'architecture-reopen',
      pendingMilestoneId: pending.id,
      confirmed: true,
    });

    expect(committed).toMatchObject({
      ...pending,
      state: 'committed',
      resultingCommitHash: git(repoRoot, ['rev-parse', 'HEAD']),
    });
    expect(git(repoRoot, ['log', '-1', '--format=%B'])).toBe(
      pending.commitMessage,
    );
    expect(git(repoRoot, [
      'show',
      '--pretty=format:',
      '--name-only',
      'HEAD',
    ])).toBe(milestoneFile);
    expect(git(repoRoot, ['diff', '--cached', '--name-only'])).toBe(
      'staged-other.md',
    );
    expect(git(repoRoot, ['diff', '--name-only'])).toBe(
      'unstaged-other.md',
    );
    expect(git(repoRoot, ['status', '--porcelain'])).toContain(
      '?? untracked-other.md',
    );
  });

  it('leaves a failed commit pending and retries it without accepting browser-supplied files or messages', async () => {
    const { repoRoot, service } = fixture();
    git(repoRoot, ['switch', '-c', 'episode/current']);
    await service.chooseWorkspace('draft-1', {
      choice: 'current-branch',
      confirmed: true,
    });
    mkdirSync(join(repoRoot, 'whp-youtube'), { recursive: true });
    const file = 'whp-youtube/PIPELINE.md';
    writeFileSync(join(repoRoot, file), 'recoverable\n');
    const pending = await service.recordPending({
      draftId: 'draft-1',
      kind: 'topic-selection',
      files: [file],
      reconciliationRequired: true,
    });
    const hook = join(repoRoot, '.git', 'hooks', 'pre-commit');
    writeFileSync(hook, '#!/bin/sh\nrm -- "$0"\nexit 1\n');
    chmodSync(hook, 0o755);

    await expect(service.commitPending({
      draftId: 'draft-1',
      kind: 'topic-selection',
      pendingMilestoneId: pending.id,
      confirmed: true,
    })).rejects.toThrow();
    expect((await service.pendingMilestones('draft-1'))[0]).toMatchObject({
      id: pending.id,
      state: 'pending',
    });

    const committed = await service.commitPending({
      draftId: 'draft-1',
      kind: 'topic-selection',
      pendingMilestoneId: pending.id,
      confirmed: true,
    });
    expect(committed.state).toBe('committed');
    expect(git(repoRoot, ['log', '-1', '--format=%B'])).toBe(
      'feat(why-we-play): record topic selection milestone',
    );
  });

  it('reconciles an exact commit after restart when git succeeded before the database update', async () => {
    const {
      repoRoot,
      stateDbFile,
      worktreesRoot,
      service,
    } = fixture();
    git(repoRoot, ['switch', '-c', 'episode/current']);
    await service.chooseWorkspace('draft-1', {
      choice: 'current-branch',
      confirmed: true,
    });
    mkdirSync(join(repoRoot, 'whp-youtube'), { recursive: true });
    const file = 'whp-youtube/PIPELINE.md';
    writeFileSync(join(repoRoot, file), 'committed before crash\n');
    const pending = await service.recordPending({
      draftId: 'draft-1',
      kind: 'topic-selection',
      files: [file],
      reconciliationRequired: true,
    });
    git(repoRoot, ['add', '--', file]);
    git(repoRoot, ['commit', '-m', pending.commitMessage, '--', file]);
    const existingCommit = git(repoRoot, ['rev-parse', 'HEAD']);

    service.close();
    services.splice(services.indexOf(service), 1);
    const restarted = new MilestoneService({
      stateDbFile,
      repoRoot,
      worktreesRoot,
    });
    services.push(restarted);

    await expect(restarted.commitPending({
      draftId: 'draft-1',
      kind: 'topic-selection',
      pendingMilestoneId: pending.id,
      confirmed: true,
    })).resolves.toMatchObject({
      id: pending.id,
      state: 'committed',
      resultingCommitHash: existingCommit,
    });
    expect(git(repoRoot, ['rev-list', '--count', 'HEAD'])).toBe('2');
  });

  it('does not reconcile a same-message commit with different recorded blobs', async () => {
    const { repoRoot, service } = fixture();
    git(repoRoot, ['switch', '-c', 'episode/current']);
    await service.chooseWorkspace('draft-1', {
      choice: 'current-branch',
      confirmed: true,
    });
    mkdirSync(join(repoRoot, 'whp-youtube'), { recursive: true });
    const file = 'whp-youtube/PIPELINE.md';
    writeFileSync(join(repoRoot, file), 'recorded bytes\n');
    const pending = await service.recordPending({
      draftId: 'draft-1',
      kind: 'topic-selection',
      files: [file],
      reconciliationRequired: true,
    });
    writeFileSync(join(repoRoot, file), 'different staged bytes\n');
    git(repoRoot, ['add', '--', file]);
    writeFileSync(join(repoRoot, file), 'recorded bytes\n');
    git(repoRoot, ['commit', '-m', pending.commitMessage]);

    await expect(service.commitPending({
      draftId: 'draft-1',
      kind: 'topic-selection',
      pendingMilestoneId: pending.id,
      confirmed: true,
    })).rejects.toBeInstanceOf(MilestoneConflictError);
    expect((await service.pendingMilestones('draft-1'))[0]?.state).toBe(
      'pending',
    );
  });

  it('refuses commit when any recorded source hash changed', async () => {
    const { repoRoot, service } = fixture();
    git(repoRoot, ['switch', '-c', 'episode/current']);
    await service.chooseWorkspace('draft-1', {
      choice: 'current-branch',
      confirmed: true,
    });
    mkdirSync(join(repoRoot, 'whp-youtube'), { recursive: true });
    const file = 'whp-youtube/PIPELINE.md';
    writeFileSync(join(repoRoot, file), 'recorded\n');
    const pending = await service.recordPending({
      draftId: 'draft-1',
      kind: 'production-promotion',
      files: [file],
      reconciliationRequired: true,
    });
    writeFileSync(join(repoRoot, file), 'changed after record\n');

    await expect(service.commitPending({
      draftId: 'draft-1',
      kind: 'production-promotion',
      pendingMilestoneId: pending.id,
      confirmed: true,
    })).rejects.toBeInstanceOf(MilestoneConflictError);
    expect(git(repoRoot, ['rev-list', '--count', 'HEAD'])).toBe('1');
  });

  it('refuses symlink milestone paths whose git blob differs from target bytes', async () => {
    const { repoRoot, service } = fixture();
    git(repoRoot, ['switch', '-c', 'episode/current']);
    await service.chooseWorkspace('draft-1', {
      choice: 'current-branch',
      confirmed: true,
    });
    mkdirSync(join(repoRoot, 'whp-youtube'), { recursive: true });
    writeFileSync(join(repoRoot, 'actual-pipeline.md'), 'target bytes\n');
    symlinkSync(
      '../actual-pipeline.md',
      join(repoRoot, 'whp-youtube', 'PIPELINE.md'),
    );

    await expect(service.recordPending({
      draftId: 'draft-1',
      kind: 'topic-selection',
      files: ['whp-youtube/PIPELINE.md'],
      reconciliationRequired: true,
    })).rejects.toThrow(/symlink/i);
  });
});

describe('SerializedLane', () => {
  it('never overlaps git or validator tasks', async () => {
    const lane = new SerializedLane();
    let active = 0;
    let maximum = 0;
    const task = () => lane.run(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
    });

    await Promise.all([task(), task(), task()]);

    expect(maximum).toBe(1);
  });
});
