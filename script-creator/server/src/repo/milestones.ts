import { createHash, randomUUID } from 'node:crypto';
import {
  lstatSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import {
  isAbsolute,
  relative,
  resolve,
  sep,
  win32,
} from 'node:path';
import Database from 'better-sqlite3';
import { migrateStateDatabase } from '../state-migrations.js';
import {
  assertWorkspaceIdentity,
  gitDirtyFiles,
  gitHead,
  gitStatus,
  isExactRecordedMilestoneCommit,
  milestoneCommit,
  milestoneDiffSummary,
  prepareManagedWorktree,
} from './git.js';

export type WorkspaceChoice = 'new-branch' | 'current-branch';

export type MilestoneKind =
  | 'topic-selection'
  | 'architecture-approval'
  | 'architecture-reopen'
  | 'creative-narration-approval'
  | 'production-promotion';

export interface EpisodeWorkspace {
  draftId: string;
  episodeSlug: string;
  choice: WorkspaceChoice;
  branch: string;
  worktreePath: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceRecommendation {
  defaultBranch: string;
  taskName: string;
  branch: string;
  worktreePath: string;
}

export interface MilestoneStatus {
  workspace: EpisodeWorkspace | null;
  recommendation: WorkspaceRecommendation;
  dirtyFiles: string[];
}

export interface PendingMilestone {
  id: string;
  draftId: string;
  episodeSlug: string;
  kind: MilestoneKind;
  files: string[];
  commitMessage: string;
  sourceHashes: Record<string, string>;
  baseCommitHash: string;
  reconciliationRequired: boolean;
  state: 'pending' | 'committed';
  resultingCommitHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingMilestoneView extends PendingMilestone {
  diffSummary: string;
}

export type ChooseWorkspaceInput =
  | { choice: 'new-branch'; taskName: string }
  | { choice: 'current-branch'; confirmed: boolean };

export interface RecordPendingInput {
  draftId: string;
  kind: MilestoneKind;
  files: string[];
  reconciliationRequired: boolean;
}

export interface CommitPendingInput {
  draftId: string;
  kind: MilestoneKind;
  pendingMilestoneId: string;
  confirmed: boolean;
}

export class WorkspaceChoiceRequiredError extends Error {
  readonly draftId: string;

  constructor(draftId: string) {
    super(`workspace choice required for draft ${draftId}`);
    this.name = 'WorkspaceChoiceRequiredError';
    this.draftId = draftId;
  }
}

export class MilestoneConflictError extends Error {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
    this.name = 'MilestoneConflictError';
  }
}

export class MilestoneCommitError extends Error {
  readonly pendingMilestoneId: string;

  constructor(pendingMilestoneId: string, error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    super(`milestone commit failed: ${detail}`, { cause: error });
    this.name = 'MilestoneCommitError';
    this.pendingMilestoneId = pendingMilestoneId;
  }
}

export class SerializedLane {
  private tail = Promise.resolve();
  private active = false;

  async run<T>(task: () => T | Promise<T>): Promise<T> {
    const previous = this.tail;
    let release = () => {};
    this.tail = new Promise<void>((resolveLane) => {
      release = resolveLane;
    });
    await previous;
    this.active = true;
    try {
      return await task();
    } finally {
      this.active = false;
      release();
    }
  }

  runSync<T>(task: () => T): T {
    if (this.active) {
      throw new Error('serialized git/validator lane is busy');
    }
    this.active = true;
    try {
      return task();
    } finally {
      this.active = false;
    }
  }
}

const SYSTEM_LANE = new SerializedLane();

export class MilestoneService {
  private readonly db: Database.Database;
  private readonly repoRoot: string;
  private readonly worktreesRoot: string;
  private readonly lane: SerializedLane;
  private readonly idFactory: () => string;
  private readonly now: () => string;
  private closed = false;

  constructor(options: {
    stateDbFile: string;
    repoRoot: string;
    worktreesRoot: string;
    lane?: SerializedLane;
    idFactory?: () => string;
    now?: () => string;
  }) {
    this.repoRoot = realpathSync(options.repoRoot);
    this.worktreesRoot = resolve(options.worktreesRoot);
    this.lane = options.lane ?? SYSTEM_LANE;
    this.idFactory = options.idFactory ?? randomUUID;
    this.now = options.now ?? (() => new Date().toISOString());
    this.db = new Database(options.stateDbFile);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');
    migrateStateDatabase(this.db);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.db.close();
  }

  hasWorkspace(draftId: string): boolean {
    return this.workspaceRow(draftId) !== undefined;
  }

  workspacePath(draftId: string): string {
    return this.lane.runSync(() => {
      const workspace = this.requireWorkspaceRow(draftId);
      this.assertIdentity(workspace);
      return workspace.worktreePath;
    });
  }

  async status(draftId: string): Promise<MilestoneStatus> {
    return this.lane.run(() => this.statusInLane(draftId));
  }

  async chooseWorkspace(
    draftId: string,
    input: ChooseWorkspaceInput,
  ): Promise<EpisodeWorkspace> {
    return this.lane.run(() => {
      const draft = this.requireDraft(draftId);
      const rootStatus = gitStatus(this.repoRoot);
      const existing = this.workspaceRow(draftId);
      const requested = requestedWorkspace(
        draft,
        input,
        rootStatus.branch,
        rootStatus.defaultBranch,
        this.repoRoot,
        this.worktreesRoot,
      );
      if (existing) {
        if (
          existing.choice !== requested.choice
          || existing.branch !== requested.branch
          || existing.worktreePath !== requested.worktreePath
          || existing.baseBranch !== requested.baseBranch
        ) {
          throw new MilestoneConflictError(
            `workspace choice conflict for draft ${draftId}`,
          );
        }
        this.assertIdentity(existing);
        return existing;
      }

      let worktreePath = requested.worktreePath;
      if (requested.choice === 'new-branch') {
        try {
          worktreePath = prepareManagedWorktree(this.repoRoot, {
            branch: requested.branch,
            worktreePath: requested.worktreePath,
            baseBranch: requested.baseBranch,
          }).worktreePath;
        } catch (error) {
          throw milestoneConflict('managed worktree conflict', error);
        }
      } else {
        this.assertIdentity(requested);
      }

      const timestamp = this.now();
      this.db.prepare(
        `INSERT INTO episode_workspaces (
          draft_id, episode_slug, choice, branch_name, worktree_path,
          base_branch, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        draft.id,
        draft.episodeSlug,
        requested.choice,
        requested.branch,
        worktreePath,
        requested.baseBranch,
        timestamp,
        timestamp,
      );
      return this.requireWorkspaceRow(draftId);
    });
  }

  async withWorkspace<T>(
    draftId: string,
    action: (workspace: EpisodeWorkspace) => T | Promise<T>,
  ): Promise<T> {
    return this.lane.run(async () => {
      const workspace = this.requireWorkspaceRow(draftId);
      this.assertIdentity(workspace);
      return action(workspace);
    });
  }

  async withWorkspaceForEpisode<T>(
    episodeSlug: string,
    action: (workspace: EpisodeWorkspace) => T | Promise<T>,
  ): Promise<T> {
    const draftId = this.requireDraftBySlug(episodeSlug).id;
    return this.withWorkspace(draftId, action);
  }

  async withWorkspaceForPath<T>(
    relPath: string,
    action: (workspace: EpisodeWorkspace) => T | Promise<T>,
  ): Promise<T> {
    const draftId = this.draftIdForPath(relPath);
    if (!draftId) {
      throw new WorkspaceChoiceRequiredError(`path:${relPath}`);
    }
    return this.withWorkspace(draftId, action);
  }

  async recordPending(input: RecordPendingInput): Promise<PendingMilestone> {
    return this.lane.run(() => {
      const workspace = this.requireWorkspaceRow(input.draftId);
      this.assertIdentity(workspace);
      const files = requireMilestoneFiles(input.files);
      const sourceHashes = hashFiles(workspace.worktreePath, files);
      const commitMessage = milestoneCommitMessage(
        input.kind,
        workspace.episodeSlug,
      );
      const baseCommitHash = gitHead(workspace.worktreePath);
      const existing = this.latestPending(input.draftId, input.kind);
      if (existing) {
        if (
          JSON.stringify(existing.files) === JSON.stringify(files)
          && existing.commitMessage === commitMessage
          && JSON.stringify(existing.sourceHashes)
            === JSON.stringify(sourceHashes)
          && existing.baseCommitHash === baseCommitHash
          && existing.reconciliationRequired
            === input.reconciliationRequired
        ) {
          return existing;
        }
        throw new MilestoneConflictError(
          `pending milestone source conflict for ${input.kind}`,
        );
      }

      const timestamp = this.now();
      const id = this.idFactory();
      this.db.prepare(
        `INSERT INTO pending_milestones (
          id, draft_id, episode_slug, kind, files_json, commit_message,
          source_hashes_json, base_commit_hash, reconciliation_required, state,
          resulting_commit_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?)`,
      ).run(
        id,
        workspace.draftId,
        workspace.episodeSlug,
        input.kind,
        JSON.stringify(files),
        commitMessage,
        JSON.stringify(sourceHashes),
        baseCommitHash,
        input.reconciliationRequired ? 1 : 0,
        timestamp,
        timestamp,
      );
      return this.requirePending(id);
    });
  }

  async pendingMilestones(
    draftId: string,
  ): Promise<PendingMilestoneView[]> {
    return this.lane.run(() => {
      this.requireDraft(draftId);
      const workspace = this.requireWorkspaceRow(draftId);
      this.assertIdentity(workspace);
      return this.db.prepare<[string], PendingRow>(
        `SELECT * FROM pending_milestones
         WHERE draft_id = ? AND state = 'pending'
         ORDER BY created_at, id`,
      ).all(draftId).map((row) => {
        const pending = pendingFromRow(row);
        return {
          ...pending,
          diffSummary: milestoneDiffSummary(
            workspace.worktreePath,
            pending.files,
          ),
        };
      });
    });
  }

  async commitPending(
    input: CommitPendingInput,
  ): Promise<PendingMilestone> {
    if (input.confirmed !== true) {
      throw new Error('milestone commit must be explicitly confirmed');
    }
    return this.lane.run(() => {
      const workspace = this.requireWorkspaceRow(input.draftId);
      this.assertIdentity(workspace);
      const pending = this.requirePending(input.pendingMilestoneId);
      if (
        pending.draftId !== input.draftId
        || pending.kind !== input.kind
      ) {
        throw new MilestoneConflictError(
          'pending milestone does not match the requested draft and kind',
        );
      }
      if (pending.state === 'committed') return pending;
      const currentHashes = hashFiles(
        workspace.worktreePath,
        pending.files,
      );
      if (
        JSON.stringify(currentHashes)
          !== JSON.stringify(pending.sourceHashes)
      ) {
        throw new MilestoneConflictError(
          `pending milestone source hash conflict for ${pending.id}`,
        );
      }
      const currentHead = gitHead(workspace.worktreePath);
      if (currentHead !== pending.baseCommitHash) {
        if (isExactRecordedMilestoneCommit(workspace.worktreePath, {
          commitHash: currentHead,
          baseCommitHash: pending.baseCommitHash,
          files: pending.files,
          message: pending.commitMessage,
          sourceHashes: pending.sourceHashes,
        })) {
          return this.markCommitted(pending.id, currentHead);
        }
        throw new MilestoneConflictError(
          `pending milestone base commit conflict for ${pending.id}`,
        );
      }

      let commitHash: string;
      try {
        commitHash = milestoneCommit(workspace.worktreePath, {
          files: pending.files,
          message: pending.commitMessage,
          allowDefault: workspace.choice === 'current-branch',
        });
      } catch (error) {
        throw new MilestoneCommitError(pending.id, error);
      }

      return this.markCommitted(pending.id, commitHash);
    });
  }

  private markCommitted(
    pendingMilestoneId: string,
    commitHash: string,
  ): PendingMilestone {
    this.db.prepare(
      `UPDATE pending_milestones
       SET state = 'committed',
           resulting_commit_hash = ?,
           updated_at = ?
       WHERE id = ? AND state = 'pending'`,
    ).run(commitHash, this.now(), pendingMilestoneId);
    return this.requirePending(pendingMilestoneId);
  }

  private statusInLane(draftId: string): MilestoneStatus {
    const draft = this.requireDraft(draftId);
    const rootStatus = gitStatus(this.repoRoot);
    const workspace = this.workspaceRow(draftId) ?? null;
    if (workspace) this.assertIdentity(workspace);
    const recommendedPath = safeWorktreePath(
      this.worktreesRoot,
      draft.episodeSlug,
    );
    return {
      workspace,
      recommendation: {
        defaultBranch: rootStatus.defaultBranch,
        taskName: draft.episodeSlug,
        branch: `episode/${draft.episodeSlug}`,
        worktreePath: recommendedPath,
      },
      dirtyFiles: workspace
        ? gitDirtyFiles(workspace.worktreePath)
        : gitDirtyFiles(this.repoRoot),
    };
  }

  private assertIdentity(workspace: Pick<
    EpisodeWorkspace,
    'branch' | 'worktreePath'
  >): void {
    try {
      assertWorkspaceIdentity({
        repoRoot: this.repoRoot,
        ...workspace,
      });
    } catch (error) {
      throw milestoneConflict('workspace identity conflict', error);
    }
  }

  private requireDraft(draftId: string): DraftIdentity {
    const row = this.db.prepare<[string], DraftRow>(
      'SELECT id, episode_slug FROM drafts WHERE id = ?',
    ).get(draftId);
    if (!row) throw new Error(`draft not found: ${draftId}`);
    return { id: row.id, episodeSlug: row.episode_slug };
  }

  private requireDraftBySlug(episodeSlug: string): DraftIdentity {
    const row = this.db.prepare<[string], DraftRow>(
      'SELECT id, episode_slug FROM drafts WHERE episode_slug = ?',
    ).get(episodeSlug);
    if (!row) throw new Error(`draft not found for episode: ${episodeSlug}`);
    return { id: row.id, episodeSlug: row.episode_slug };
  }

  private draftIdForPath(relPath: string): string | undefined {
    requireSafeRepoPath(relPath);
    const promotion = this.db.prepare<[string], { draft_id: string }>(
      `SELECT draft_id FROM promotions
       WHERE target_path = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    ).get(relPath);
    if (promotion) return promotion.draft_id;
    const matched = /^whp-youtube\/(?:topics|drafts|architectures)\/([^/]+)\.md$/u
      .exec(relPath);
    if (!matched) return undefined;
    return this.db.prepare<[string], { id: string }>(
      'SELECT id FROM drafts WHERE episode_slug = ?',
    ).get(matched[1]!)?.id;
  }

  private workspaceRow(draftId: string): EpisodeWorkspace | undefined {
    const row = this.db.prepare<[string], WorkspaceRow>(
      'SELECT * FROM episode_workspaces WHERE draft_id = ?',
    ).get(draftId);
    return row ? workspaceFromRow(row) : undefined;
  }

  private requireWorkspaceRow(draftId: string): EpisodeWorkspace {
    const workspace = this.workspaceRow(draftId);
    if (!workspace) throw new WorkspaceChoiceRequiredError(draftId);
    return workspace;
  }

  private latestPending(
    draftId: string,
    kind: MilestoneKind,
  ): PendingMilestone | undefined {
    const row = this.db.prepare<[string, string], PendingRow>(
      `SELECT * FROM pending_milestones
       WHERE draft_id = ? AND kind = ? AND state = 'pending'
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
    ).get(draftId, kind);
    return row ? pendingFromRow(row) : undefined;
  }

  private requirePending(id: string): PendingMilestone {
    const row = this.db.prepare<[string], PendingRow>(
      'SELECT * FROM pending_milestones WHERE id = ?',
    ).get(id);
    if (!row) throw new Error(`pending milestone not found: ${id}`);
    return pendingFromRow(row);
  }
}

interface DraftIdentity {
  id: string;
  episodeSlug: string;
}

interface DraftRow {
  id: string;
  episode_slug: string;
}

interface WorkspaceRow {
  draft_id: string;
  episode_slug: string;
  choice: WorkspaceChoice;
  branch_name: string;
  worktree_path: string;
  base_branch: string;
  created_at: string;
  updated_at: string;
}

interface PendingRow {
  id: string;
  draft_id: string;
  episode_slug: string;
  kind: MilestoneKind;
  files_json: string;
  commit_message: string;
  source_hashes_json: string;
  base_commit_hash: string;
  reconciliation_required: number;
  state: 'pending' | 'committed';
  resulting_commit_hash: string | null;
  created_at: string;
  updated_at: string;
}

function workspaceFromRow(row: WorkspaceRow): EpisodeWorkspace {
  return {
    draftId: row.draft_id,
    episodeSlug: row.episode_slug,
    choice: row.choice,
    branch: row.branch_name,
    worktreePath: row.worktree_path,
    baseBranch: row.base_branch,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function pendingFromRow(row: PendingRow): PendingMilestone {
  return {
    id: row.id,
    draftId: row.draft_id,
    episodeSlug: row.episode_slug,
    kind: row.kind,
    files: JSON.parse(row.files_json) as string[],
    commitMessage: row.commit_message,
    sourceHashes: JSON.parse(row.source_hashes_json) as Record<string, string>,
    baseCommitHash: row.base_commit_hash,
    reconciliationRequired: row.reconciliation_required === 1,
    state: row.state,
    resultingCommitHash: row.resulting_commit_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requestedWorkspace(
  draft: DraftIdentity,
  input: ChooseWorkspaceInput,
  currentBranch: string,
  defaultBranch: string,
  repoRoot: string,
  worktreesRoot: string,
): Pick<
  EpisodeWorkspace,
  | 'draftId'
  | 'episodeSlug'
  | 'choice'
  | 'branch'
  | 'worktreePath'
  | 'baseBranch'
> {
  if (input.choice === 'current-branch') {
    if (input.confirmed !== true) {
      throw new Error('current branch choice must be explicitly confirmed');
    }
    return {
      draftId: draft.id,
      episodeSlug: draft.episodeSlug,
      choice: input.choice,
      branch: currentBranch,
      worktreePath: realpathSync(repoRoot),
      baseBranch: defaultBranch,
    };
  }

  const taskSlug = taskNameSlug(input.taskName);
  return {
    draftId: draft.id,
    episodeSlug: draft.episodeSlug,
    choice: input.choice,
    branch: `episode/${taskSlug}`,
    worktreePath: safeWorktreePath(worktreesRoot, draft.episodeSlug),
    baseBranch: defaultBranch,
  };
}

function taskNameSlug(value: string): string {
  if (
    typeof value !== 'string'
    || value.trim() === ''
    || /[./\\\0]/u.test(value)
  ) {
    throw new Error('task name must contain only words, spaces, _ or -');
  }
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  if (!/^[a-z0-9][a-z0-9_-]*$/u.test(slug)) {
    throw new Error('task name must contain only words, spaces, _ or -');
  }
  return slug;
}

function safeWorktreePath(root: string, episodeSlug: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(episodeSlug)) {
    throw new Error(`unsafe episode slug for managed worktree: ${episodeSlug}`);
  }
  const absoluteRoot = resolve(root);
  const target = resolve(absoluteRoot, episodeSlug);
  if (!target.startsWith(`${absoluteRoot}${sep}`)) {
    throw new Error('managed worktree path escaped its root');
  }
  return target;
}

function requireMilestoneFiles(files: string[]): string[] {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('pending milestone files are required');
  }
  const normalized = files.map((file) => {
    requireSafeRepoPath(file);
    if (!file.startsWith('whp-youtube/')) {
      throw new Error(`invalid milestone file: ${file}`);
    }
    return file;
  });
  if (new Set(normalized).size !== normalized.length) {
    throw new Error('pending milestone files must be unique');
  }
  return normalized;
}

function requireSafeRepoPath(relPath: string): void {
  if (
    typeof relPath !== 'string'
    || relPath.length === 0
    || relPath.includes('\0')
    || relPath.includes('\\')
    || isAbsolute(relPath)
    || win32.isAbsolute(relPath)
    || relPath.split('/').some((part) => part === '..' || part === '')
  ) {
    throw new Error(`invalid repository path: ${relPath}`);
  }
}

function hashFiles(
  workspaceRoot: string,
  files: string[],
): Record<string, string> {
  const canonicalRoot = realpathSync(workspaceRoot);
  return Object.fromEntries(files.map((file) => {
    const target = resolve(canonicalRoot, file);
    const targetStat = lstatSync(target);
    if (targetStat.isSymbolicLink()) {
      throw new Error(`milestone file must not be a symlink: ${file}`);
    }
    if (!targetStat.isFile()) {
      throw new Error(`invalid milestone file: ${file}`);
    }
    const canonicalTarget = realpathSync(target);
    const targetRelative = relative(canonicalRoot, canonicalTarget);
    if (
      targetRelative === ''
      || targetRelative === '..'
      || targetRelative.startsWith(`..${sep}`)
      || isAbsolute(targetRelative)
    ) {
      throw new Error(`invalid milestone file: ${file}`);
    }
    return [
      file,
      createHash('sha256')
        .update(readFileSync(canonicalTarget))
        .digest('hex'),
    ];
  }));
}

function milestoneCommitMessage(
  kind: MilestoneKind,
  episodeSlug: string,
): string {
  const labels: Record<MilestoneKind, string> = {
    'topic-selection': 'topic selection',
    'architecture-approval': 'architecture approval',
    'architecture-reopen': 'architecture reopen',
    'creative-narration-approval': 'creative narration approval',
    'production-promotion': 'production promotion',
  };
  return `feat(${episodeSlug}): record ${labels[kind]} milestone`;
}

function milestoneConflict(
  prefix: string,
  error: unknown,
): MilestoneConflictError {
  const detail = error instanceof Error ? error.message : String(error);
  return new MilestoneConflictError(`${prefix}: ${detail}`, {
    cause: error,
  });
}
