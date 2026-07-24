import Database from 'better-sqlite3';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentStore } from '../src/documents/store.js';
import {
  LATEST_STATE_SCHEMA_VERSION,
  STATE_MIGRATIONS,
} from '../src/state-migrations.js';
import { TopicStore } from '../src/topics/store.js';
import { LearningStore } from '../src/learning/store.js';
import { LearningService } from '../src/learning/service.js';
import { JobStore } from '../src/job-store.js';

const roots: string[] = [];
const documentStores: DocumentStore[] = [];
const topicStores: TopicStore[] = [];
const learningStores: LearningStore[] = [];

afterEach(() => {
  for (const store of topicStores.splice(0)) store.close();
  for (const store of learningStores.splice(0)) store.close();
  for (const store of documentStores.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

describe('shared state migration registry', () => {
  it('owns one documented global sequence through the learning lifecycle', () => {
    expect(STATE_MIGRATIONS.map(({ version, owner, name }) => ({
      version,
      owner,
      name,
    }))).toEqual([
      { version: 1, owner: 'documents', name: 'legacy-state-baseline' },
      { version: 2, owner: 'documents', name: 'drafts-and-revisions' },
      { version: 3, owner: 'topics', name: 'topic-workbench' },
      { version: 4, owner: 'topics', name: 'gate-check-persistence' },
      { version: 5, owner: 'topics', name: 'topic-handoff-saga' },
      { version: 6, owner: 'architecture', name: 'architecture-stage' },
      { version: 7, owner: 'architecture', name: 'staged-promotion' },
      { version: 8, owner: 'milestones', name: 'episode-milestones' },
      { version: 9, owner: 'milestones', name: 'milestone-supersession' },
      { version: 10, owner: 'learning', name: 'learning-lifecycle' },
      {
        version: 11,
        owner: 'learning',
        name: 'handoff-binding-and-shadow-cleanup',
      },
      {
        version: 12,
        owner: 'learning',
        name: 'causal-binding-and-backfill-repair',
      },
    ]);
    expect(LATEST_STATE_SCHEMA_VERSION).toBe(12);
  });

  it('migrates a populated v5 database without changing document JSON bytes', () => {
    const dbFile = simulatedV5Database();
    const before = new Database(dbFile);
    const docJson = '{\n  "type": "doc", "attrs": {"format":"narration"}\n}';
    before.prepare(
      `INSERT INTO drafts (
        id, episode_slug, title, format, doc_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'draft-v5',
      'draft-v5',
      'Draft V5',
      'narration',
      docJson,
      '2026-07-24T08:00:00.000Z',
    );
    before.prepare(
      `INSERT INTO revisions (
        id, draft_id, seq, op_id, disposition, doc_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'revision-v5',
      'draft-v5',
      1,
      null,
      'manual-save',
      docJson,
      '2026-07-24T08:01:00.000Z',
    );
    before.close();

    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    const migratedDraft = inspected.prepare<[string], {
      doc_json: string;
      architecture_json: string;
      architecture_artifact_hash: string | null;
      narration_reconciliation_required: number;
    }>(
      `SELECT doc_json, architecture_json, architecture_artifact_hash,
              narration_reconciliation_required
       FROM drafts WHERE id = ?`,
    ).get('draft-v5')!;
    const migratedRevision = inspected.prepare<[string], {
      doc_json: string;
      kind: string;
    }>(
      'SELECT doc_json, kind FROM revisions WHERE id = ?',
    ).get('revision-v5')!;
    inspected.close();

    expect(migratedDraft).toEqual({
      doc_json: docJson,
      architecture_json: JSON.stringify({
        sections: [],
        approvedMd: null,
        approvedAt: null,
      }),
      architecture_artifact_hash: null,
      narration_reconciliation_required: 0,
    });
    expect(migratedRevision).toEqual({
      doc_json: docJson,
      kind: 'narration',
    });
  });

  it('creates the complete v12 schema for a fresh database', () => {
    const dbFile = join(
      roots[roots.push(mkdtempSync(join(tmpdir(), 'state-fresh-'))) - 1]!,
      'state.sqlite3',
    );
    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    expect(columns(inspected, 'drafts')).toEqual([
      'id',
      'episode_slug',
      'title',
      'format',
      'doc_json',
      'updated_at',
      'architecture_json',
      'architecture_artifact_hash',
      'narration_reconciliation_required',
      'approved_narration_md',
      'approved_narration_at',
      'approved_narration_revision_seq',
      'narration_artifact_hash',
    ]);
    expect(columns(inspected, 'revisions')).toEqual([
      'id',
      'draft_id',
      'seq',
      'op_id',
      'disposition',
      'doc_json',
      'created_at',
      'kind',
    ]);
    expect(columns(inspected, 'architecture_sagas')).toEqual([
      'draft_id',
      'action',
      'expected_revision_seq',
      'input_json',
      'revision_appended',
      'artifact_written',
      'pipeline_upserted',
      'draft_updated',
      'created_at',
      'updated_at',
    ]);
    expect(columns(inspected, 'promotions')).toEqual([
      'draft_id',
      'operation_id',
      'state',
      'target_path',
      'target_hash',
      'import_revision_id',
      'validation_hash',
      'error',
      'created_at',
      'updated_at',
    ]);
    expect(columns(inspected, 'narration_settled_exports')).toEqual([
      'token',
      'draft_id',
      'revision_seq',
      'narration_md',
      'created_at',
    ]);
    expect(columns(inspected, 'narration_proposals')).toEqual([
      'draft_id',
      'operation_id',
      'state',
      'created_at',
      'resolved_at',
      'reason_note',
      'successor_operation_id',
      'accepted_revision_id',
    ]);
    expect(columns(inspected, 'architecture_proposals')).toEqual([
      'draft_id',
      'operation_id',
      'state',
      'revision_id',
      'reason_note',
      'created_at',
      'resolved_at',
    ]);
    expect(columns(inspected, 'lesson_reconciliations')).toContain(
      'prepared_head',
    );
    expect(columns(inspected, 'package_tests')).toEqual([
      'id',
      'idea_id',
      'op_id',
      'directions_json',
      'created_at',
      'selected_direction_index',
      'selected_at',
    ]);
    expect(columns(inspected, 'episode_workspaces')).toEqual([
      'draft_id',
      'episode_slug',
      'choice',
      'branch_name',
      'worktree_path',
      'base_branch',
      'created_at',
      'updated_at',
    ]);
    expect(columns(inspected, 'pending_milestones')).toEqual([
      'id',
      'draft_id',
      'episode_slug',
      'kind',
      'files_json',
      'commit_message',
      'source_hashes_json',
      'base_commit_hash',
      'reconciliation_required',
      'state',
      'resulting_commit_hash',
      'created_at',
      'updated_at',
    ]);
    const milestoneSql = inspected.prepare<[string], { sql: string }>(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`,
    ).get('pending_milestones')!.sql;
    expect(milestoneSql).toContain("'superseded'");
    inspected.close();
  });

  it('applies v10 once to populated v9 without changing document bytes', () => {
    const dbFile = simulatedV9Database();
    const before = new Database(dbFile);
    const docJson = '{"type":"doc","attrs":{"format":"narration"},"content":[]}';
    before.prepare(
      `INSERT INTO drafts (
        id, episode_slug, title, format, doc_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'draft-v9',
      'draft-v9',
      'Draft V9',
      'narration',
      docJson,
      '2026-07-24T08:00:00.000Z',
    );
    before.prepare(
      `INSERT INTO revisions (
        id, draft_id, seq, op_id, disposition, doc_json, created_at, kind
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'revision-v9',
      'draft-v9',
      1,
      'operation-accepted',
      'selection-proposal-accepted',
      docJson,
      '2026-07-24T08:01:00.000Z',
      'narration',
    );
    before.prepare(
      `INSERT INTO revisions (
        id, draft_id, seq, op_id, disposition, doc_json, created_at, kind
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'revision-v9-forged-variant',
      'draft-v9',
      2,
      'operation-alternatives',
      'variant-picked/set-1/alternative%3A0',
      docJson,
      '2026-07-24T08:01:30.000Z',
      'narration',
    );
    before.prepare(
      `INSERT INTO narration_proposals (
        draft_id, operation_id, state, created_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      'draft-v9',
      'operation-accepted',
      'accepted',
      '2026-07-24T08:00:30.000Z',
      '2026-07-24T08:01:00.000Z',
    );
    before.prepare(
      `INSERT INTO narration_proposals (
        draft_id, operation_id, state, created_at, resolved_at
      ) VALUES
        (?, ?, ?, ?, ?), (?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
    ).run(
      'draft-v9',
      'operation-rejected',
      'rejected',
      '2026-07-24T08:01:30.000Z',
      '2026-07-24T08:02:00.000Z',
      'draft-v9',
      'operation-dismissed',
      'dismissed',
      '2026-07-24T08:02:30.000Z',
      '2026-07-24T08:03:00.000Z',
      'draft-v9',
      'operation-rejected-provable',
      'rejected',
      '2026-07-24T08:03:30.000Z',
      '2026-07-24T08:04:00.000Z',
      'draft-v9',
      'operation-rejected-no-result',
      'rejected',
      '2026-07-24T08:04:30.000Z',
      '2026-07-24T08:05:00.000Z',
    );
    before.close();
    persistCompletedNarrationOperationEvidence(
      dbFile,
      'draft-v9',
      'operation-rejected-provable',
    );
    persistCompletedNarrationOperationEvidence(
      dbFile,
      'draft-v9',
      'operation-rejected-no-result',
      { writeResult: false },
    );

    const migration = STATE_MIGRATIONS.find(({ version }) => version === 10)!;
    const apply = vi.spyOn(migration, 'apply');
    documentStores.push(new DocumentStore(dbFile));
    topicStores.push(new TopicStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    expect(inspected.prepare<[], { doc_json: string }>(
      `SELECT doc_json FROM drafts WHERE id = 'draft-v9'`,
    ).get()!.doc_json).toBe(docJson);
    expect(inspected.prepare<[], { doc_json: string }>(
      `SELECT doc_json FROM revisions WHERE id = 'revision-v9'`,
    ).get()!.doc_json).toBe(docJson);
    expect(inspected.prepare<[], { state: string }>(
      `SELECT state FROM narration_proposals
       WHERE operation_id = 'operation-accepted'`,
    ).get()!.state).toBe('accepted');
    expect(inspected.prepare<[], { state: string }>(
      `SELECT state FROM narration_proposals
       WHERE operation_id = 'operation-rejected'`,
    ).get()!.state).toBe('rejected');
    expect(inspected.prepare<[], { state: string }>(
      `SELECT state FROM narration_proposals
       WHERE operation_id = 'operation-dismissed'`,
    ).get()!.state).toBe('dismissed');
    expect(inspected.prepare<[], { count: number }>(
      `SELECT COUNT(*) AS count FROM decision_events
       WHERE draft_id = 'draft-v9'`,
    ).get()!.count).toBe(1);
    expect(inspected.prepare<[], { count: number }>(
      `SELECT COUNT(*) AS count FROM decision_events
       WHERE source_type = 'revision'`,
    ).get()!.count).toBe(0);
    expect(inspected.prepare<[], { count: number }>(
      `SELECT COUNT(*) AS count FROM decision_events
       WHERE source_id = 'operation-dismissed'`,
    ).get()!.count).toBe(0);
    expect(inspected.prepare<[], { count: number }>(
      `SELECT COUNT(*) AS count FROM decision_events
       WHERE source_id = 'operation-rejected'`,
    ).get()!.count).toBe(0);
    expect(inspected.prepare<[], { count: number }>(
      `SELECT COUNT(*) AS count FROM decision_events
       WHERE source_id = 'operation-rejected-no-result'`,
    ).get()!.count).toBe(0);
    inspected.close();
    expect(apply).toHaveBeenCalledOnce();

    const documentStore = documentStores[0]!;
    const topicStore = topicStores[0]!;
    const learningStore = new LearningStore(dbFile);
    learningStores.push(learningStore);
    let frozenInput: unknown = null;
    const learningService = new LearningService({
      store: learningStore,
      documentStore,
      topicStore,
      operationEvidence: () => null,
      operationService: {
        submit: (_operation, inputs) => {
          frozenInput = inputs;
          return 'distill-v9-backfill';
        },
        get: () => ({
          operation: 'distill',
          state: 'running',
        }),
        result: () => ({ kind: 'pending' }),
      },
      idFactory: () => 'first-post-upgrade-distillation',
      resumeKeyFactory: () => 'first-post-upgrade-resume',
      now: () => '2026-07-24T09:00:00.000Z',
    });
    const run = learningService.startDistillation('draft-v9', 'on-demand');
    expect(run.state).toBe('queued');
    expect(run.decisions.map(({ decisionId }) => decisionId)).toEqual([
      'v10:narration-proposal:operation-rejected-provable:rejected',
    ]);
    expect(frozenInput).toMatchObject({
      session: {
        draft_id: 'draft-v9',
        decisions: expect.arrayContaining([
          expect.objectContaining({
            id:
              'v10:narration-proposal:operation-rejected-provable:rejected',
          }),
        ]),
      },
    });
  });

  it('does not reapply v10, v11, or v12 to an already-v12 database', () => {
    const dbFile = simulatedV9Database();
    documentStores.push(new DocumentStore(dbFile));
    documentStores.pop()!.close();
    const migration = STATE_MIGRATIONS.find(({ version }) => version === 10)!;
    const apply = vi.spyOn(migration, 'apply');
    const v11 = STATE_MIGRATIONS.find(({ version }) => version === 11)!;
    const applyV11 = vi.spyOn(v11, 'apply');
    const v12 = STATE_MIGRATIONS.find(({ version }) => version === 12)!;
    const applyV12 = vi.spyOn(v12, 'apply');

    documentStores.push(new DocumentStore(dbFile));
    topicStores.push(new TopicStore(dbFile));

    expect(apply).not.toHaveBeenCalled();
    expect(applyV11).not.toHaveBeenCalled();
    expect(applyV12).not.toHaveBeenCalled();
  });

  it('repairs a closed stranded v10 session and distills its unfrozen backfill', () => {
    const dbFile = simulatedV9Database();
    const db = new Database(dbFile);
    const docJson =
      '{"type":"doc","attrs":{"format":"narration"},"content":[]}';
    db.prepare(
      `INSERT INTO drafts (
        id, episode_slug, title, format, doc_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'draft-stranded',
      'draft-stranded',
      'Draft Stranded',
      'narration',
      docJson,
      '2026-07-24T08:00:00.000Z',
    );
    db.prepare(
      `INSERT INTO revisions (
        id, draft_id, seq, op_id, disposition, doc_json, created_at, kind
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'revision-stranded',
      'draft-stranded',
      1,
      'operation-stranded',
      'selection-proposal-accepted',
      docJson,
      '2026-07-24T08:01:00.000Z',
      'narration',
    );
    db.prepare(
      `INSERT INTO narration_proposals (
        draft_id, operation_id, state, created_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      'draft-stranded',
      'operation-rejected-stranded',
      'rejected',
      '2026-07-24T08:01:30.000Z',
      '2026-07-24T08:02:00.000Z',
    );
    db.close();
    persistCompletedNarrationOperationEvidence(
      dbFile,
      'draft-stranded',
      'operation-rejected-stranded',
    );
    const migrationDb = new Database(dbFile);
    const v10 = STATE_MIGRATIONS.find(({ version }) => version === 10)!;
    v10.apply(migrationDb);
    migrationDb.pragma('user_version = 10');
    migrationDb.prepare(
      `UPDATE learning_sessions
       SET start_cursor = 1, end_cursor = 1,
           closed_at = '2026-07-24T08:03:00.000Z'
       WHERE draft_id = 'draft-stranded'`,
    ).run();
    migrationDb.close();

    const v11 = STATE_MIGRATIONS.find(({ version }) => version === 11)!;
    const applyV11 = vi.spyOn(v11, 'apply');
    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    expect(inspected.pragma('user_version', { simple: true })).toBe(12);
    expect(inspected.prepare<[], { start_cursor: number }>(
      `SELECT start_cursor
       FROM learning_sessions
       WHERE draft_id = 'draft-stranded' AND closed_at IS NULL`,
    ).get()!.start_cursor).toBe(0);
    inspected.close();
    expect(applyV11).toHaveBeenCalledOnce();

    const topicStore = new TopicStore(dbFile);
    topicStores.push(topicStore);
    const learningStore = new LearningStore(dbFile);
    learningStores.push(learningStore);
    const service = new LearningService({
      store: learningStore,
      documentStore: documentStores[0]!,
      topicStore,
      operationEvidence: () => null,
      operationService: {
        submit: () => 'closed-repair-distill-operation',
        get: () => ({ operation: 'distill', state: 'running' }),
        result: () => ({ kind: 'pending' }),
      },
      idFactory: () => 'closed-repair-distill-run',
      resumeKeyFactory: () => 'closed-repair-distill-resume',
      now: () => '2026-07-24T09:00:00.000Z',
    });
    expect(
      service.startDistillation('draft-stranded', 'on-demand').decisions
        .map(({ decisionId }) => decisionId),
    ).toEqual([
      'v10:narration-proposal:operation-rejected-stranded:rejected',
    ]);

    documentStores.push(new DocumentStore(dbFile));
    expect(applyV11).toHaveBeenCalledOnce();
  });

  it('does not reapply migration v6 to an already-v6 database', () => {
    const dbFile = simulatedV5Database();
    documentStores.push(new DocumentStore(dbFile));
    documentStores.pop()!.close();

    const db = new Database(dbFile);
    db.prepare(
      `INSERT INTO drafts (
        id, episode_slug, title, format, doc_json, updated_at,
        architecture_json, architecture_artifact_hash,
        narration_reconciliation_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'draft-v6',
      'draft-v6',
      'Draft V6',
      'narration',
      '{}',
      '2026-07-24T08:00:00.000Z',
      '{"sections":[{"key":"x","title":"X","md":"### X"}],"approvedMd":null,"approvedAt":null}',
      'sha256:last-known',
      1,
    );
    db.close();

    const migration = STATE_MIGRATIONS.find(({ version }) => version === 6)!;
    const apply = vi.spyOn(migration, 'apply');
    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    const row = inspected.prepare<[], {
      architecture_json: string;
      architecture_artifact_hash: string;
      narration_reconciliation_required: number;
    }>(
      `SELECT architecture_json, architecture_artifact_hash,
              narration_reconciliation_required
       FROM drafts WHERE id = 'draft-v6'`,
    ).get()!;
    inspected.close();

    expect(apply).not.toHaveBeenCalled();
    expect(row).toEqual({
      architecture_json: '{"sections":[{"key":"x","title":"X","md":"### X"}],"approvedMd":null,"approvedAt":null}',
      architecture_artifact_hash: 'sha256:last-known',
      narration_reconciliation_required: 1,
    });
  });

  it('applies migration v7 once without changing existing document JSON bytes', () => {
    const dbFile = simulatedV5Database();
    const first = new DocumentStore(dbFile);
    first.close();
    const db = new Database(dbFile);
    const docJson = '{"type":"doc","attrs":{"format":"narration"},"content":[]}';
    db.prepare(
      `INSERT INTO drafts (
        id, episode_slug, title, format, doc_json, updated_at,
        architecture_json, architecture_artifact_hash,
        narration_reconciliation_required, approved_narration_md,
        approved_narration_at, approved_narration_revision_seq,
        narration_artifact_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'draft-v7',
      'draft-v7',
      'Draft V7',
      'narration',
      docJson,
      '2026-07-24T08:00:00.000Z',
      '{"sections":[],"approvedMd":null,"approvedAt":null}',
      null,
      0,
      'approved bytes',
      '2026-07-24T08:01:00.000Z',
      3,
      'draft-hash',
    );
    db.close();

    const migration = STATE_MIGRATIONS.find(({ version }) => version === 7)!;
    const apply = vi.spyOn(migration, 'apply');
    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    const row = inspected.prepare<[], {
      doc_json: string;
      approved_narration_md: string;
      approved_narration_revision_seq: number;
      narration_artifact_hash: string;
    }>(
      `SELECT doc_json, approved_narration_md,
              approved_narration_revision_seq, narration_artifact_hash
       FROM drafts WHERE id = 'draft-v7'`,
    ).get()!;
    inspected.close();

    expect(apply).not.toHaveBeenCalled();
    expect(row).toEqual({
      doc_json: docJson,
      approved_narration_md: 'approved bytes',
      approved_narration_revision_seq: 3,
      narration_artifact_hash: 'draft-hash',
    });
  });

  it('applies migration v8 exactly once without storing editorial content', () => {
    const dbFile = simulatedV7Database();
    const migration = STATE_MIGRATIONS.find(({ version }) => version === 8)!;
    const apply = vi.spyOn(migration, 'apply');
    documentStores.push(new DocumentStore(dbFile));
    documentStores.push(new DocumentStore(dbFile));

    const inspected = new Database(dbFile, { readonly: true });
    const workspaceSql = inspected.prepare<[string], { sql: string }>(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`,
    ).get('episode_workspaces')!.sql;
    const milestoneSql = inspected.prepare<[string], { sql: string }>(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`,
    ).get('pending_milestones')!.sql;
    inspected.close();

    expect(apply).toHaveBeenCalledOnce();
    expect(`${workspaceSql}\n${milestoneSql}`).not.toMatch(
      /(?:markdown|content|doc_json|approved_md)/i,
    );
  });

  it.each([2, 3, 4] as const)(
    'applies only pending migrations to a genuine v%s database exactly once',
    (version) => {
      const dbFile = simulatedDatabase(version);
      const before = new Database(dbFile, { readonly: true });
      expect(before.pragma('user_version', { simple: true })).toBe(version);
      expect(tableExists(before, 'topic_handoff_sagas')).toBe(false);
      before.close();

      const applications: Array<{
        version: number;
        previousVersion: number;
      }> = [];
      for (const migration of STATE_MIGRATIONS) {
        const apply = migration.apply;
        vi.spyOn(migration, 'apply').mockImplementation((db) => {
          applications.push({
            version: migration.version,
            previousVersion: db.pragma(
              'user_version',
              { simple: true },
            ) as number,
          });
          apply(db);
        });
      }

      documentStores.push(new DocumentStore(dbFile));
      topicStores.push(new TopicStore(dbFile));
      documentStores.push(new DocumentStore(dbFile));
      topicStores.push(new TopicStore(dbFile));

      const inspected = new Database(dbFile, { readonly: true });
      const userVersion = inspected.pragma('user_version', { simple: true });
      const ideaColumns = columns(inspected, 'ideas');
      const handoffColumns = columns(inspected, 'topic_handoff_sagas');
      inspected.close();

      expect(applications).toEqual(
        Array.from(
          { length: LATEST_STATE_SCHEMA_VERSION - version },
          (_, index) => ({
            version: version + index + 1,
            previousVersion: version + index,
          }),
        ),
      );
      expect(userVersion).toBe(LATEST_STATE_SCHEMA_VERSION);
      expect(ideaColumns).toContain('latest_check_json');
      expect(handoffColumns).toEqual([
        'run_id',
        'winner_subject',
        'input_json',
        'draft_id',
        'draft_created',
        'artifact_written',
        'pipeline_upserted',
        'idea_promoted',
        'created_at',
        'updated_at',
      ]);
    },
  );
});

function simulatedDatabase(version: 2 | 3 | 4): string {
  const root = mkdtempSync(join(tmpdir(), `state-v${version}-`));
  roots.push(root);
  const dbFile = join(root, 'state.sqlite3');
  const db = new Database(dbFile);
  db.exec(`
    CREATE TABLE drafts (
      id TEXT PRIMARY KEY,
      episode_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      format TEXT NOT NULL CHECK (format IN ('annotated', 'narration')),
      doc_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE revisions (
      id TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
      seq INTEGER NOT NULL,
      op_id TEXT,
      disposition TEXT NOT NULL,
      doc_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (draft_id, seq)
    );
    CREATE INDEX revisions_draft_seq ON revisions (draft_id, seq);
  `);
  if (version >= 3) {
    db.exec(`
      CREATE TABLE ideas (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('inbox', 'ideate')),
        status TEXT NOT NULL CHECK (status IN ('open', 'promoted', 'discarded')),
        created_at TEXT NOT NULL
      );
      CREATE TABLE topic_runs (
        id TEXT PRIMARY KEY,
        op_id TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL,
        report_md TEXT,
        summary_json TEXT,
        summary_error TEXT,
        result_extracted INTEGER NOT NULL DEFAULT 0
          CHECK (result_extracted IN (0, 1)),
        created_at TEXT NOT NULL
      );
      CREATE INDEX topic_runs_created_at ON topic_runs (created_at);
      CREATE TABLE package_tests (
        id TEXT PRIMARY KEY,
        idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
        op_id TEXT NOT NULL,
        directions_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX package_tests_idea_created
        ON package_tests (idea_id, created_at DESC);
    `);
  }
  if (version >= 4) {
    db.exec('ALTER TABLE ideas ADD COLUMN latest_check_json TEXT');
  }
  db.pragma(`user_version = ${version}`);
  db.close();
  return dbFile;
}

function simulatedV5Database(): string {
  const root = mkdtempSync(join(tmpdir(), 'state-v5-'));
  roots.push(root);
  const dbFile = join(root, 'state.sqlite3');
  const db = new Database(dbFile);
  for (const migration of STATE_MIGRATIONS) {
    if (migration.version > 5) break;
    migration.apply(db);
    db.pragma(`user_version = ${migration.version}`);
  }
  db.close();
  return dbFile;
}

function simulatedV7Database(): string {
  const root = mkdtempSync(join(tmpdir(), 'state-v7-'));
  roots.push(root);
  const dbFile = join(root, 'state.sqlite3');
  const db = new Database(dbFile);
  for (const migration of STATE_MIGRATIONS) {
    if (migration.version > 7) break;
    migration.apply(db);
    db.pragma(`user_version = ${migration.version}`);
  }
  db.close();
  return dbFile;
}

function simulatedV9Database(): string {
  const root = mkdtempSync(join(tmpdir(), 'state-v9-'));
  roots.push(root);
  const dbFile = join(root, 'state.sqlite3');
  const db = new Database(dbFile);
  for (const migration of STATE_MIGRATIONS) {
    if (migration.version > 9) break;
    migration.apply(db);
    db.pragma(`user_version = ${migration.version}`);
  }
  db.close();
  return dbFile;
}

function persistCompletedNarrationOperationEvidence(
  dbFile: string,
  draftId: string,
  operationId: string,
  options: { writeResult?: boolean } = {},
): void {
  const jobDir = join(
    dirname(dbFile),
    `${operationId}-job`,
  );
  mkdirSync(jobDir);
  const envelope = {
    jobId: `${operationId}-attempt`,
    prompt:
      '$writing-whp-youtube-scripts\n'
      + 'Operation: Rewrite selection\n'
      + 'Inputs: {"selection":"Original line."}',
    cwd: jobDir,
    sandbox: 'read-only' as const,
  };
  writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(envelope));
  if (options.writeResult !== false) {
    writeFileSync(
      join(jobDir, 'final-message.txt'),
      JSON.stringify({ replacement_markdown: 'Replacement line.' }),
    );
  }
  const store = new JobStore(dbFile);
  store.createOperationWithJob({
    id: operationId,
    name: 'rewrite-selection',
    draftId,
    deadlineAt: '2026-07-24T09:00:00.000Z',
    createdAt: '2026-07-24T08:01:00.000Z',
  }, envelope, jobDir);
  store.setState(envelope.jobId, 'completed');
  store.close();
}

function columns(db: Database.Database, table: string): string[] {
  return db.prepare<[], { name: string }>(`PRAGMA table_info(${table})`)
    .all()
    .map(({ name }) => name);
}

function tableExists(db: Database.Database, table: string): boolean {
  return db.prepare<[string], { count: number }>(
    `SELECT COUNT(*) AS count
     FROM sqlite_master
     WHERE type = 'table' AND name = ?`,
  ).get(table)!.count === 1;
}
