import type Database from 'better-sqlite3';

export interface StateMigration {
  version: number;
  owner:
    | 'documents'
    | 'topics'
    | 'architecture'
    | 'milestones'
    | 'learning';
  name: string;
  apply(db: Database.Database): void;
}

const DOCUMENTS_V2 = `
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  episode_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('annotated', 'narration')),
  doc_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  op_id TEXT,
  disposition TEXT NOT NULL,
  doc_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (draft_id, seq)
);

CREATE INDEX IF NOT EXISTS revisions_draft_seq
  ON revisions (draft_id, seq);
`;

const TOPICS_V3 = `
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('inbox', 'ideate')),
  status TEXT NOT NULL CHECK (status IN ('open', 'promoted', 'discarded')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topic_runs (
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

CREATE INDEX IF NOT EXISTS topic_runs_created_at
  ON topic_runs (created_at);

CREATE TABLE IF NOT EXISTS package_tests (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  op_id TEXT NOT NULL,
  directions_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS package_tests_idea_created
  ON package_tests (idea_id, created_at DESC);
`;

const TOPIC_HANDOFF_V5 = `
CREATE TABLE IF NOT EXISTS topic_handoff_sagas (
  run_id TEXT NOT NULL,
  winner_subject TEXT NOT NULL,
  input_json TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  draft_created INTEGER NOT NULL DEFAULT 0
    CHECK (draft_created IN (0, 1)),
  artifact_written INTEGER NOT NULL DEFAULT 0
    CHECK (artifact_written IN (0, 1)),
  pipeline_upserted INTEGER NOT NULL DEFAULT 0
    CHECK (pipeline_upserted IN (0, 1)),
  idea_promoted INTEGER NOT NULL DEFAULT 0
    CHECK (idea_promoted IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (run_id, winner_subject)
);
`;

const EMPTY_ARCHITECTURE_JSON = JSON.stringify({
  sections: [],
  approvedMd: null,
  approvedAt: null,
});

const ARCHITECTURE_V6 = `
CREATE TABLE IF NOT EXISTS architecture_sagas (
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reopen')),
  expected_revision_seq INTEGER NOT NULL,
  input_json TEXT NOT NULL,
  revision_appended INTEGER NOT NULL DEFAULT 0
    CHECK (revision_appended IN (0, 1)),
  artifact_written INTEGER NOT NULL DEFAULT 0
    CHECK (artifact_written IN (0, 1)),
  pipeline_upserted INTEGER NOT NULL DEFAULT 0
    CHECK (pipeline_upserted IN (0, 1)),
  draft_updated INTEGER NOT NULL DEFAULT 0
    CHECK (draft_updated IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (draft_id, action, expected_revision_seq)
);
`;

const STAGED_PROMOTION_V7 = `
CREATE TABLE IF NOT EXISTS promotions (
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  operation_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL
    CHECK (state IN (
      'running', 'output-ready', 'validation-required', 'complete', 'failed'
    )),
  target_path TEXT NOT NULL,
  target_hash TEXT,
  import_revision_id TEXT NOT NULL,
  validation_hash TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (draft_id, operation_id)
);

CREATE INDEX IF NOT EXISTS promotions_draft_created
  ON promotions (draft_id, created_at DESC);

CREATE TABLE IF NOT EXISTS narration_settled_exports (
  token TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  revision_seq INTEGER NOT NULL,
  narration_md TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS narration_settled_exports_draft
  ON narration_settled_exports (draft_id, revision_seq);

CREATE TABLE IF NOT EXISTS narration_proposals (
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  operation_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL
    CHECK (state IN ('pending', 'accepted', 'rejected', 'dismissed')),
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  PRIMARY KEY (draft_id, operation_id)
);

CREATE INDEX IF NOT EXISTS narration_proposals_draft_state
  ON narration_proposals (draft_id, state);
`;

const EPISODE_MILESTONES_V8 = `
CREATE TABLE IF NOT EXISTS episode_workspaces (
  draft_id TEXT PRIMARY KEY REFERENCES drafts(id) ON DELETE CASCADE,
  episode_slug TEXT NOT NULL UNIQUE,
  choice TEXT NOT NULL
    CHECK (choice IN ('new-branch', 'current-branch')),
  branch_name TEXT NOT NULL,
  worktree_path TEXT NOT NULL,
  base_branch TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pending_milestones (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  episode_slug TEXT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN (
      'topic-selection',
      'architecture-approval',
      'architecture-reopen',
      'creative-narration-approval',
      'production-promotion'
    )),
  files_json TEXT NOT NULL,
  commit_message TEXT NOT NULL,
  source_hashes_json TEXT NOT NULL,
  base_commit_hash TEXT NOT NULL,
  reconciliation_required INTEGER NOT NULL DEFAULT 0
    CHECK (reconciliation_required IN (0, 1)),
  state TEXT NOT NULL
    CHECK (state IN ('pending', 'committed')),
  resulting_commit_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS pending_milestones_draft_state
  ON pending_milestones (draft_id, state, created_at DESC);
`;

const MILESTONE_SUPERSESSION_V9 = `
ALTER TABLE pending_milestones RENAME TO pending_milestones_v8;

CREATE TABLE pending_milestones (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  episode_slug TEXT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN (
      'topic-selection',
      'architecture-approval',
      'architecture-reopen',
      'creative-narration-approval',
      'production-promotion'
    )),
  files_json TEXT NOT NULL,
  commit_message TEXT NOT NULL,
  source_hashes_json TEXT NOT NULL,
  base_commit_hash TEXT NOT NULL,
  reconciliation_required INTEGER NOT NULL DEFAULT 0
    CHECK (reconciliation_required IN (0, 1)),
  state TEXT NOT NULL
    CHECK (state IN ('pending', 'committed', 'superseded')),
  resulting_commit_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO pending_milestones (
  id, draft_id, episode_slug, kind, files_json, commit_message,
  source_hashes_json, base_commit_hash, reconciliation_required, state,
  resulting_commit_hash, created_at, updated_at
)
SELECT
  id, draft_id, episode_slug, kind, files_json, commit_message,
  source_hashes_json, base_commit_hash, reconciliation_required, state,
  resulting_commit_hash, created_at, updated_at
FROM pending_milestones_v8;

DROP TABLE pending_milestones_v8;

CREATE INDEX pending_milestones_draft_state
  ON pending_milestones (draft_id, state, created_at DESC);
`;

const LEARNING_LIFECYCLE_V10 = `
ALTER TABLE narration_proposals RENAME TO narration_proposals_v9;

CREATE TABLE narration_proposals (
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  operation_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL
    CHECK (state IN (
      'pending', 'accepted', 'rejected', 'rerolled', 'dismissed'
    )),
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  reason_note TEXT,
  successor_operation_id TEXT,
  PRIMARY KEY (draft_id, operation_id)
);

INSERT INTO narration_proposals (
  draft_id, operation_id, state, created_at, resolved_at,
  reason_note, successor_operation_id
)
SELECT
  draft_id, operation_id, state, created_at, resolved_at, NULL, NULL
FROM narration_proposals_v9;

DROP TABLE narration_proposals_v9;

CREATE INDEX narration_proposals_draft_state
  ON narration_proposals (draft_id, state);

ALTER TABLE package_tests
  ADD COLUMN selected_direction_index INTEGER;
ALTER TABLE package_tests
  ADD COLUMN selected_at TEXT;

CREATE TABLE learning_sessions (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  start_cursor INTEGER NOT NULL DEFAULT 0,
  end_cursor INTEGER,
  created_at TEXT NOT NULL,
  closed_at TEXT,
  CHECK (end_cursor IS NULL OR end_cursor >= start_cursor)
);

CREATE UNIQUE INDEX learning_sessions_open_draft
  ON learning_sessions (draft_id)
  WHERE closed_at IS NULL;

CREATE TABLE decision_events (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  disposition TEXT NOT NULL,
  source_timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (draft_id, seq),
  UNIQUE (source_type, source_id, disposition)
);

CREATE INDEX decision_events_draft_seq
  ON decision_events (draft_id, seq);

CREATE TABLE decision_notes (
  decision_id TEXT PRIMARY KEY
    REFERENCES decision_events(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE distillation_runs (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL CHECK (trigger IN ('on-demand', 'session-end')),
  state TEXT NOT NULL CHECK (state IN (
    'frozen', 'queued', 'running', 'completed', 'failed',
    'cancelled', 'interrupted', 'ingested', 'no-op'
  )),
  operation_id TEXT,
  resume_key TEXT NOT NULL UNIQUE,
  guardrail_markdown TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  distillation_run_id TEXT
    REFERENCES distillation_runs(id) ON DELETE SET NULL,
  classification TEXT NOT NULL
    CHECK (classification IN ('episode-local', 'durable')),
  state TEXT NOT NULL CHECK (state IN (
    'proposed', 'approved', 'rejected', 'retired', 'superseded',
    'approved-pending-reconcile', 'applied',
    'retirement-pending', 'supersession-pending'
  )),
  proposed_markdown TEXT,
  reviewed_markdown TEXT,
  rationale_markdown TEXT NOT NULL,
  proposed_target TEXT,
  supersedes_lesson_id TEXT REFERENCES lessons(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  repository_commit TEXT,
  repository_path TEXT,
  repository_anchor TEXT,
  repository_content_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX lessons_draft_state
  ON lessons (draft_id, state, created_at);

CREATE TABLE distillation_run_decisions (
  run_id TEXT NOT NULL REFERENCES distillation_runs(id) ON DELETE CASCADE,
  decision_id TEXT NOT NULL REFERENCES decision_events(id) ON DELETE RESTRICT,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  snapshot_json TEXT NOT NULL,
  PRIMARY KEY (run_id, decision_id),
  UNIQUE (run_id, ordinal)
);

CREATE TABLE distillation_run_lessons (
  run_id TEXT NOT NULL REFERENCES distillation_runs(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  snapshot_json TEXT NOT NULL,
  PRIMARY KEY (run_id, lesson_id),
  UNIQUE (run_id, ordinal)
);

CREATE TABLE lesson_evidence (
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  decision_id TEXT NOT NULL REFERENCES decision_events(id) ON DELETE RESTRICT,
  PRIMARY KEY (lesson_id, decision_id)
);

CREATE TABLE lesson_reconciliations (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('apply', 'retire', 'supersede')),
  state TEXT NOT NULL
    CHECK (state IN ('prepared', 'awaiting-reconciliation', 'verified')),
  resume_key TEXT NOT NULL UNIQUE,
  prepared_markdown TEXT NOT NULL,
  repository_commit TEXT,
  paths_json TEXT NOT NULL,
  anchors_json TEXT NOT NULL,
  content_hashes_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  verified_at TEXT
);

CREATE UNIQUE INDEX lesson_reconciliations_active_lesson
  ON lesson_reconciliations (lesson_id)
  WHERE state != 'verified';

CREATE TABLE validator_attempts (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  ok INTEGER NOT NULL CHECK (ok IN (0, 1)),
  diagnostics_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX validator_attempts_draft_created
  ON validator_attempts (draft_id, created_at, id);

CREATE TABLE operation_lessons (
  operation_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  lesson_version INTEGER NOT NULL CHECK (lesson_version > 0),
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (operation_id, lesson_id)
);
`;

const LEARNING_HANDOFF_BINDING_V11 = `
ALTER TABLE lesson_reconciliations
  ADD COLUMN prepared_head TEXT;

ALTER TABLE narration_proposals
  ADD COLUMN accepted_revision_id TEXT;

UPDATE narration_proposals
SET accepted_revision_id = (
  SELECT revisions.id
  FROM revisions
  WHERE revisions.draft_id = narration_proposals.draft_id
    AND revisions.op_id = narration_proposals.operation_id
  ORDER BY revisions.seq DESC
  LIMIT 1
)
WHERE state = 'accepted';

UPDATE lesson_reconciliations
SET prepared_markdown = ''
WHERE state = 'verified';

CREATE TABLE architecture_proposals (
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  operation_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'accepted', 'rejected')),
  revision_id TEXT,
  reason_note TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  PRIMARY KEY (draft_id, operation_id)
);
`;

export const STATE_MIGRATIONS: readonly StateMigration[] = [
  {
    version: 1,
    owner: 'documents',
    name: 'legacy-state-baseline',
    apply: () => {},
  },
  {
    version: 2,
    owner: 'documents',
    name: 'drafts-and-revisions',
    apply: (db) => db.exec(DOCUMENTS_V2),
  },
  {
    version: 3,
    owner: 'topics',
    name: 'topic-workbench',
    apply: (db) => db.exec(TOPICS_V3),
  },
  {
    version: 4,
    owner: 'topics',
    name: 'gate-check-persistence',
    apply: (db) => ensureColumn(
      db,
      'ideas',
      'latest_check_json',
      'ALTER TABLE ideas ADD COLUMN latest_check_json TEXT',
    ),
  },
  {
    version: 5,
    owner: 'topics',
    name: 'topic-handoff-saga',
    apply: (db) => db.exec(TOPIC_HANDOFF_V5),
  },
  {
    version: 6,
    owner: 'architecture',
    name: 'architecture-stage',
    apply: (db) => {
      ensureColumn(
        db,
        'drafts',
        'architecture_json',
        `ALTER TABLE drafts ADD COLUMN architecture_json TEXT NOT NULL DEFAULT '${EMPTY_ARCHITECTURE_JSON}'`,
      );
      ensureColumn(
        db,
        'drafts',
        'architecture_artifact_hash',
        'ALTER TABLE drafts ADD COLUMN architecture_artifact_hash TEXT',
      );
      ensureColumn(
        db,
        'drafts',
        'narration_reconciliation_required',
        `ALTER TABLE drafts
         ADD COLUMN narration_reconciliation_required INTEGER NOT NULL DEFAULT 0
         CHECK (narration_reconciliation_required IN (0, 1))`,
      );
      ensureColumn(
        db,
        'revisions',
        'kind',
        `ALTER TABLE revisions
         ADD COLUMN kind TEXT NOT NULL DEFAULT 'narration'
         CHECK (kind IN ('narration', 'architecture'))`,
      );
      db.exec(ARCHITECTURE_V6);
    },
  },
  {
    version: 7,
    owner: 'architecture',
    name: 'staged-promotion',
    apply: (db) => {
      ensureColumn(
        db,
        'drafts',
        'approved_narration_md',
        'ALTER TABLE drafts ADD COLUMN approved_narration_md TEXT',
      );
      ensureColumn(
        db,
        'drafts',
        'approved_narration_at',
        'ALTER TABLE drafts ADD COLUMN approved_narration_at TEXT',
      );
      ensureColumn(
        db,
        'drafts',
        'approved_narration_revision_seq',
        'ALTER TABLE drafts ADD COLUMN approved_narration_revision_seq INTEGER',
      );
      ensureColumn(
        db,
        'drafts',
        'narration_artifact_hash',
        'ALTER TABLE drafts ADD COLUMN narration_artifact_hash TEXT',
      );
      db.exec(STAGED_PROMOTION_V7);
    },
  },
  {
    version: 8,
    owner: 'milestones',
    name: 'episode-milestones',
    apply: (db) => db.exec(EPISODE_MILESTONES_V8),
  },
  {
    version: 9,
    owner: 'milestones',
    name: 'milestone-supersession',
    apply: (db) => db.exec(MILESTONE_SUPERSESSION_V9),
  },
  {
    version: 10,
    owner: 'learning',
    name: 'learning-lifecycle',
    apply: (db) => {
      db.exec(LEARNING_LIFECYCLE_V10);
      backfillProvableV9Decisions(db);
      seedBackfilledLearningSessions(db, 'v10');
    },
  },
  {
    version: 11,
    owner: 'learning',
    name: 'handoff-binding-and-shadow-cleanup',
    apply: (db) => {
      db.exec(LEARNING_HANDOFF_BINDING_V11);
      scrubVerifiedDurableLessonSnapshots(db);
      seedBackfilledLearningSessions(db, 'v11');
    },
  },
  {
    version: 12,
    owner: 'learning',
    name: 'causal-binding-and-backfill-repair',
    apply: (db) => {
      db.exec(
        `CREATE INDEX IF NOT EXISTS
           lesson_reconciliations_repository_commit_idx
         ON lesson_reconciliations(repository_commit)`,
      );
      scrubVerifiedDurableLessonSnapshots(db);
      seedBackfilledLearningSessions(db, 'v12');
    },
  },
];

export const LATEST_STATE_SCHEMA_VERSION =
  STATE_MIGRATIONS.at(-1)!.version;

export function migrateStateDatabase(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number;
  if (version > LATEST_STATE_SCHEMA_VERSION) {
    throw new Error(
      `state database schema version ${version} is newer than supported version ${LATEST_STATE_SCHEMA_VERSION}`,
    );
  }

  for (const migration of STATE_MIGRATIONS) {
    if (version >= migration.version) continue;
    db.transaction(() => {
      migration.apply(db);
      db.pragma(`user_version = ${migration.version}`);
    })();
  }
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  sql: string,
): void {
  const columns = new Set(
    db.prepare<[], { name: string }>(`PRAGMA table_info(${table})`)
      .all()
      .map(({ name }) => name),
  );
  if (!columns.has(column)) db.exec(sql);
}

function backfillProvableV9Decisions(db: Database.Database): void {
  const revisions = db.prepare<[], {
    id: string;
    draft_id: string;
    seq: number;
    disposition: string;
    created_at: string;
  }>(
    `SELECT id, draft_id, seq, disposition, created_at
     FROM revisions
     WHERE disposition IN (
       'episode-generation-accepted',
       'architecture-proposal-accepted',
       'architecture-proposals-accepted',
       'selection-proposal-accepted',
       'personal-input-proposal-accepted',
       'architecture-approved',
       'architecture-reopened',
       'narration-reconciled',
       'narration-approved'
     )
       OR disposition LIKE 'variant-picked/%'
     ORDER BY draft_id, created_at, seq, id`,
  ).all();
  const handoffs = db.prepare<[], {
    run_id: string;
    winner_subject: string;
    draft_id: string;
    updated_at: string;
  }>(
    `SELECT run_id, winner_subject, draft_id, updated_at
     FROM topic_handoff_sagas
     WHERE draft_created = 1
       AND artifact_written = 1
       AND pipeline_upserted = 1
       AND idea_promoted = 1
     ORDER BY draft_id, updated_at, run_id, winner_subject`,
  ).all();
  const rejectedProposals = db.prepare<[], {
    operation_id: string;
    draft_id: string;
    resolved_at: string;
  }>(
    `SELECT operation_id, draft_id, resolved_at
     FROM narration_proposals
     WHERE state = 'rejected' AND resolved_at IS NOT NULL
     ORDER BY draft_id, resolved_at, operation_id`,
  ).all();
  const promotions = db.prepare<[], {
    operation_id: string;
    draft_id: string;
    updated_at: string;
  }>(
    `SELECT operation_id, draft_id, updated_at
     FROM promotions
     WHERE state = 'complete'
     ORDER BY draft_id, updated_at, operation_id`,
  ).all();
  const seqByDraft = new Map<string, number>();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO decision_events (
      id, draft_id, seq, kind, source_type, source_id, disposition,
      source_timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const nextSeq = (draftId: string): number => {
    const seq = (seqByDraft.get(draftId) ?? 0) + 1;
    seqByDraft.set(draftId, seq);
    return seq;
  };
  for (const revision of revisions) {
    if (!isProvableV9Revision(db, revision)) continue;
    const kind = revision.disposition.startsWith('variant-picked/')
      ? 'variant-picked'
      : [
          'architecture-approved',
          'architecture-reopened',
          'narration-reconciled',
          'narration-approved',
        ].includes(revision.disposition)
        ? 'gate-action'
        : revision.disposition === 'personal-input-proposal-accepted'
          ? 'personal-input-integrated'
          : 'proposal-accepted';
    insert.run(
      `v10:revision:${revision.id}`,
      revision.draft_id,
      nextSeq(revision.draft_id),
      kind,
      'revision',
      revision.id,
      revision.disposition,
      revision.created_at,
      revision.created_at,
    );
  }
  for (const proposal of rejectedProposals) {
    insert.run(
      `v10:narration-proposal:${proposal.operation_id}:rejected`,
      proposal.draft_id,
      nextSeq(proposal.draft_id),
      'proposal-rejected',
      'narration-proposal',
      proposal.operation_id,
      'rejected',
      proposal.resolved_at,
      proposal.resolved_at,
    );
  }
  for (const handoff of handoffs) {
    insert.run(
      `v10:topic-handoff:${handoff.run_id}:${handoff.winner_subject}`,
      handoff.draft_id,
      nextSeq(handoff.draft_id),
      'winner-handed-off',
      'topic-handoff',
      `${handoff.run_id}:${handoff.winner_subject}`,
      'winner-handed-off',
      handoff.updated_at,
      handoff.updated_at,
    );
  }
  for (const promotion of promotions) {
    insert.run(
      `v10:promotion:${promotion.operation_id}`,
      promotion.draft_id,
      nextSeq(promotion.draft_id),
      'gate-action',
      'promotion',
      promotion.operation_id,
      'promotion-completed',
      promotion.updated_at,
      promotion.updated_at,
    );
  }
}

function isProvableV9Revision(
  db: Database.Database,
  revision: {
    draft_id: string;
    seq: number;
    disposition: string;
    created_at: string;
  },
): boolean {
  if (
    revision.disposition === 'architecture-approved'
    || revision.disposition === 'architecture-reopened'
  ) {
    const action = revision.disposition === 'architecture-approved'
      ? 'approve'
      : 'reopen';
    return db.prepare<[string, string, number], { count: number }>(
      `SELECT COUNT(*) AS count
       FROM architecture_sagas
       WHERE draft_id = ?
         AND action = ?
         AND expected_revision_seq = ?
         AND revision_appended = 1
         AND artifact_written = 1
         AND pipeline_upserted = 1
         AND draft_updated = 1`,
    ).get(revision.draft_id, action, revision.seq - 1)!.count === 1;
  }
  if (revision.disposition === 'narration-approved') {
    return db.prepare<[string, number, string], { count: number }>(
      `SELECT COUNT(*) AS count
       FROM drafts
       WHERE id = ?
         AND approved_narration_revision_seq = ?
         AND approved_narration_at = ?
         AND approved_narration_md IS NOT NULL
         AND narration_artifact_hash IS NOT NULL`,
    ).get(
      revision.draft_id,
      revision.seq,
      revision.created_at,
    )!.count === 1;
  }
  // V9 does not persist completed operation results or accepted proposal
  // revision bindings, so accepted content and variant revisions cannot
  // prove that their bytes came from the named operation.
  return false;
}

function seedBackfilledLearningSessions(
  db: Database.Database,
  migrationPrefix: 'v10' | 'v11' | 'v12',
): void {
  const drafts = db.prepare<[], {
    draft_id: string;
    first_seq: number;
    first_created_at: string;
  }>(
    `SELECT draft_id, MIN(seq) AS first_seq, MIN(created_at) AS first_created_at
     FROM decision_events
     WHERE id LIKE 'v10:%'
       AND NOT EXISTS (
         SELECT 1
         FROM distillation_run_decisions AS snapshots
         WHERE snapshots.decision_id = decision_events.id
       )
     GROUP BY draft_id`,
  ).all();
  const openSession = db.prepare<[string], {
    id: string;
    start_cursor: number;
  }>(
    `SELECT id, start_cursor
     FROM learning_sessions
     WHERE draft_id = ? AND closed_at IS NULL`,
  );
  const repair = db.prepare(
    `UPDATE learning_sessions
     SET start_cursor = ?
     WHERE id = ? AND start_cursor > ?`,
  );
  const insert = db.prepare(
    `INSERT INTO learning_sessions (
      id, draft_id, start_cursor, end_cursor, created_at, closed_at
    )
    SELECT ?, ?, ?, NULL, ?, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM learning_sessions
      WHERE draft_id = ? AND closed_at IS NULL
    )`,
  );
  for (const draft of drafts) {
    const startCursor = Math.max(0, draft.first_seq - 1);
    const current = openSession.get(draft.draft_id);
    if (current) {
      repair.run(startCursor, current.id, startCursor);
      continue;
    }
    insert.run(
      `${migrationPrefix}:session:${draft.draft_id}`,
      draft.draft_id,
      startCursor,
      draft.first_created_at,
      draft.draft_id,
    );
  }
}

function scrubVerifiedDurableLessonSnapshots(
  db: Database.Database,
): void {
  const snapshots = db.prepare<[], {
    run_id: string;
    lesson_id: string;
    snapshot_json: string;
    repository_commit: string;
    repository_path: string | null;
    repository_anchor: string | null;
    repository_content_hash: string | null;
  }>(
    `SELECT snapshots.run_id, snapshots.lesson_id, snapshots.snapshot_json,
            lessons.repository_commit, lessons.repository_path,
            lessons.repository_anchor, lessons.repository_content_hash
     FROM distillation_run_lessons AS snapshots
     JOIN lessons ON lessons.id = snapshots.lesson_id
     WHERE lessons.classification = 'durable'
       AND lessons.state IN ('applied', 'retired', 'superseded')`,
  ).all();
  const update = db.prepare(
    `UPDATE distillation_run_lessons
     SET snapshot_json = ?
     WHERE run_id = ? AND lesson_id = ?`,
  );
  for (const row of snapshots) {
    const snapshot = JSON.parse(row.snapshot_json) as unknown;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      continue;
    }
    update.run(JSON.stringify({
      ...Object.fromEntries(
        Object.entries(snapshot as Record<string, unknown>)
          .filter(([key]) => key !== 'lesson_markdown'),
      ),
      repository_provenance: {
        status: 'resolved',
        commit: row.repository_commit,
        path: row.repository_path,
        anchor: row.repository_anchor,
        content_hash: row.repository_content_hash,
      },
    }), row.run_id, row.lesson_id);
  }
}
