import { parseMarkdown } from '@whp/script-creator-editor-core';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  createDaemonContext,
  startDaemonContext,
  type RunningDaemon,
} from '../src/daemon.js';
import { OPERATIONS } from '../src/operations/registry.js';
import { validateAgainstSchema } from '../src/schema-validate.js';

interface OperationRecord {
  state: string;
  error: string | null;
  inputs: unknown;
}

interface DraftRecord {
  id: string;
  episodeSlug: string;
}

interface EpisodeWorkspace {
  choice: 'current-branch' | 'new-branch';
  branch: string;
  worktreePath: string;
}

interface NarrationProposal {
  draftId: string;
  operationId: string;
  state: string;
  reasonNote: string | null;
}

interface LearningDecision {
  id: string;
  draftId: string;
  kind: string;
  disposition: string;
  note: string | null;
  context: {
    source: {
      type: string;
      id: string;
      disposition: string;
    };
  };
}

interface DecisionPage {
  decisions: LearningDecision[];
  nextCursor: number | null;
}

interface DistillationRun {
  id: string;
  draftId: string;
  state: string;
  operationId: string | null;
  guardrailMarkdown: string | null;
  error: string | null;
  decisions: Array<{
    decisionId: string;
    snapshot: unknown;
  }>;
  lessons: Array<{
    lessonId: string;
    snapshot: unknown;
  }>;
}

type OperationResult =
  | {
    kind: 'schema';
    value: unknown;
    guardrail: string | null;
  }
  | {
    kind: 'raw';
    markdown: string;
  }
  | {
    kind: 'failed';
    error: string;
  }
  | {
    kind: 'pending';
  };

interface DistillationResult {
  status: 'complete' | 'narrowed' | 'declined';
  lessons: Array<{
    classification: 'episode-local' | 'durable';
    lesson_markdown: string;
    rationale_markdown: string;
    evidence: string[];
    proposed_target: string | null;
    supersedes_lesson_id: string | null;
  }>;
  guardrail_markdown: string | null;
}

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const TERMINAL_STATES = new Set([
  'cancelled',
  'completed',
  'failed',
  'invalid-output',
  'interrupted',
  'timed-out',
]);
const REJECTION_NOTE =
  'The rewrite adds emphasis that this thin example does not support.';
const DISTILLATION_RESULT_KEYS = [
  'guardrail_markdown',
  'lessons',
  'status',
] as const;
const DISTILLED_LESSON_KEYS = [
  'classification',
  'evidence',
  'lesson_markdown',
  'proposed_target',
  'rationale_markdown',
  'supersedes_lesson_id',
] as const;

if (process.env['RUN_REAL_CODEX'] !== '1') {
  console.log('SKIP — set RUN_REAL_CODEX=1 for Plan 7 real Distill');
  process.exit(0);
}

let temporaryRoot: string | null = null;
let daemon: RunningDaemon | null = null;

async function main(): Promise<void> {
  const initialHead = git(['rev-parse', 'HEAD']);
  const initialBranch = git(['branch', '--show-current']);
  const initialStatus = git([
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
  ]);
  temporaryRoot = mkdtempSync(join(tmpdir(), 'whp-plan7-real-'));
  const context = createDaemonContext({
    repoRoot: REPO_ROOT,
    env: {
      HOME: process.env['HOME'],
      XDG_DATA_HOME: join(temporaryRoot, 'xdg-data'),
      XDG_STATE_HOME: join(temporaryRoot, 'xdg-state'),
      SC_CODEX_BIN: process.env['SC_CODEX_BIN'],
    },
  });
  daemon = await startDaemonContext(context, {
    port: 0,
    log: () => undefined,
  });
  const handshake = {
    port: daemon.port,
    nonce: daemon.nonce,
  };

  const draft = await request<DraftRecord>(
    handshake,
    '/api/drafts',
    {
      method: 'POST',
      body: {
        episodeSlug: 'plan7-real-distill-spot',
        title: 'Plan 7 real Distill spot',
        format: 'narration',
        doc: parseMarkdown([
          '## 1. Opening',
          '',
          '> A queue turns waiting into a small prediction game.',
        ].join('\n')).toJSON(),
      },
    },
  );
  assert(
    draft.episodeSlug === 'plan7-real-distill-spot',
    'draft API returned the wrong episode identity',
  );

  const workspace = await request<EpisodeWorkspace>(
    handshake,
    `/api/drafts/${encodeURIComponent(draft.id)}/milestones/workspace`,
    {
      method: 'POST',
      body: {
        choice: 'current-branch',
        confirmed: true,
      },
    },
  );
  assert(
    workspace.choice === 'current-branch'
      && workspace.branch === initialBranch,
    'milestones API did not record the explicit current-branch choice',
  );

  const rewrite = await request<{ id: string }>(
    handshake,
    `/api/drafts/${encodeURIComponent(draft.id)}/ops`,
    {
      method: 'POST',
      body: {
        operation: 'rewrite-selection',
        inputs: {
          selection: 'A queue turns waiting into a small prediction game.',
          requested_scope:
            'Rewrite this as one clear sentence without adding claims.',
        },
      },
    },
  );
  const rewriteOperation = await waitForTerminal(handshake, rewrite.id);
  assert(
    rewriteOperation.state === 'completed',
    `rewrite-selection ended in ${rewriteOperation.state}: ${
      rewriteOperation.error ?? 'no error'
    }`,
  );
  const rewriteResult = await request<OperationResult>(
    handshake,
    `/api/ops/${encodeURIComponent(rewrite.id)}/result`,
  );
  assertRegisteredSchema('rewrite-selection', rewriteResult);
  assert(
    rewriteResult.kind === 'schema'
      && isRecord(rewriteResult.value)
      && rewriteResult.value['status'] === 'complete'
      && rewriteResult.guardrail === null
      && typeof rewriteResult.value['replacement_markdown'] === 'string'
      && rewriteResult.value['replacement_markdown'].trim() !== '',
    'real rewrite-selection did not produce a rejectable proposal',
  );

  const rejected = await request<NarrationProposal>(
    handshake,
    `/api/drafts/${encodeURIComponent(
      draft.id
    )}/narration/proposals/${encodeURIComponent(rewrite.id)}/resolve`,
    {
      method: 'POST',
      body: {
        decision: 'rejected',
        reason: REJECTION_NOTE,
      },
    },
  );
  assert(
    rejected.draftId === draft.id
      && rejected.operationId === rewrite.id
      && rejected.state === 'rejected'
      && rejected.reasonNote === REJECTION_NOTE,
    'narration proposal rejection was not durably recorded with its why-note',
  );

  const decisionPage = await request<DecisionPage>(
    handshake,
    `/api/drafts/${encodeURIComponent(draft.id)}/decisions?limit=100`,
  );
  assert(
    decisionPage.decisions.length === 1,
    `expected exactly one decision before Distill, found ${
      decisionPage.decisions.length
    }`,
  );
  const decision = decisionPage.decisions[0]!;
  assertRejectionDecision(decision, draft.id, rewrite.id);

  const run = await request<DistillationRun>(
    handshake,
    `/api/drafts/${encodeURIComponent(draft.id)}/distill`,
    {
      method: 'POST',
      body: {},
    },
  );
  assert(
    run.draftId === draft.id
      && run.operationId !== null
      && run.decisions.length === 1
      && run.decisions[0]?.decisionId === decision.id
      && JSON.stringify(run.decisions[0]?.snapshot) ===
        JSON.stringify(decision)
      && run.lessons.length === 0,
    'draft-scoped Distill did not freeze the genuine decision and zero lessons',
  );

  const operation = await waitForTerminal(handshake, run.operationId);
  assert(
    operation.state === 'completed',
    `Distill ended in ${operation.state}: ${operation.error ?? 'no error'}`,
  );
  assertFrozenDistillationInputs(operation.inputs, draft.id, decision);

  const result = await request<OperationResult>(
    handshake,
    `/api/ops/${encodeURIComponent(run.operationId)}/result`,
  );
  assertDistillationFrame(result, decision.id);

  const reconciled = await request<DistillationRun>(
    handshake,
    `/api/distillations/${encodeURIComponent(run.id)}/reconcile`,
    { method: 'POST' },
  );
  assert(
    reconciled.id === run.id
      && reconciled.state === 'ingested'
      && reconciled.operationId === run.operationId
      && reconciled.decisions.length === 1
      && reconciled.decisions[0]?.decisionId === decision.id
      && reconciled.lessons.length === 0,
    `Distill run did not ingest its frozen frame: ${
      reconciled.error ?? reconciled.state
    }`,
  );

  const finalDecisionPage = await request<DecisionPage>(
    handshake,
    `/api/drafts/${encodeURIComponent(draft.id)}/decisions?limit=100`,
  );
  assert(
    finalDecisionPage.decisions.length === 1,
    `expected exactly one final decision, found ${
      finalDecisionPage.decisions.length
    }`,
  );
  assertRejectionDecision(
    finalDecisionPage.decisions[0]!,
    draft.id,
    rewrite.id,
  );

  assert(
    git(['rev-parse', 'HEAD']) === initialHead,
    'real Distill changed repository HEAD',
  );
  assert(
    git([
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
    ]) === initialStatus,
    'real Distill changed repository files',
  );
}

function assertRegisteredSchema(
  operation: 'rewrite-selection' | 'distill',
  result: OperationResult,
): asserts result is Extract<OperationResult, { kind: 'schema' }> {
  assert(result.kind === 'schema', `${operation} did not return strict JSON`);
  const definition = OPERATIONS[operation];
  assert(
    definition.result.kind === 'schema',
    `${operation} has no registered strict result schema`,
  );
  const validation = validateAgainstSchema(
    definition.result.schema,
    JSON.stringify(result.value),
  );
  assert(
    validation.ok,
    `${operation} result failed its registered schema: ${
      validation.ok ? '' : validation.reason
    }`,
  );
}

function assertDistillationFrame(
  result: OperationResult,
  decisionId: string,
): void {
  assertRegisteredSchema('distill', result);
  assert(isRecord(result.value), 'Distill result frame is not an object');
  assertExactKeys(
    result.value,
    DISTILLATION_RESULT_KEYS,
    'Distill result frame',
  );
  const value = result.value as unknown as DistillationResult;
  for (const [index, lesson] of value.lessons.entries()) {
    assertExactKeys(
      lesson as unknown as Record<string, unknown>,
      DISTILLED_LESSON_KEYS,
      `Distill lesson ${index}`,
    );
    assert(
      lesson.evidence.length > 0
        && lesson.evidence.every((id) => id === decisionId),
      `Distill lesson ${index} cited evidence outside the frozen decision`,
    );
    assert(
      lesson.supersedes_lesson_id === null,
      `Distill lesson ${index} superseded a lesson absent from frozen context`,
    );
  }
  if (value.status !== 'complete') {
    assert(
      value.lessons.length === 0
        && typeof value.guardrail_markdown === 'string'
        && value.guardrail_markdown.trim() !== '',
      `${value.status} Distill result did not return an empty lesson frame with a guardrail`,
    );
  }
}

function assertRejectionDecision(
  decision: LearningDecision,
  draftId: string,
  operationId: string,
): void {
  assert(
    decision.draftId === draftId
      && decision.kind === 'proposal-rejected'
      && decision.disposition === 'rejected'
      && decision.note === REJECTION_NOTE
      && decision.context.source.type === 'narration-proposal'
      && decision.context.source.id === operationId
      && decision.context.source.disposition === 'rejected',
    'decisions API did not return exactly the genuine rejection with its why-note',
  );
}

function assertFrozenDistillationInputs(
  value: unknown,
  draftId: string,
  decision: LearningDecision,
): void {
  assert(isRecord(value), 'Distill operation inputs are not an object');
  const session = value['session'];
  const lessons = value['existing_lessons'];
  assert(
    isRecord(session)
      && session['draft_id'] === draftId
      && session['trigger'] === 'on-demand'
      && Array.isArray(session['decisions'])
      && JSON.stringify(session['decisions']) ===
        JSON.stringify([decision])
      && Array.isArray(lessons)
      && lessons.length === 0,
    'real Distill inputs did not preserve the server-frozen decision and zero lessons',
  );
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(sortedExpected),
    `${label} keys were ${JSON.stringify(actual)}, expected ${
      JSON.stringify(sortedExpected)
    }`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function waitForTerminal(
  handshake: { port: number; nonce: string },
  id: string,
): Promise<OperationRecord> {
  const deadline = Date.now() + 30 * 60_000;
  for (;;) {
    const record = await request<OperationRecord>(
      handshake,
      `/api/ops/${encodeURIComponent(id)}`,
    );
    if (TERMINAL_STATES.has(record.state)) return record;
    if (Date.now() >= deadline) {
      throw new Error(`operation ${id} exceeded the 30-minute real-op limit`);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_000));
  }
}

async function request<T>(
  handshake: { port: number; nonce: string },
  path: string,
  options: {
    method?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const response = await fetch(
    `http://127.0.0.1:${handshake.port}${path}`,
    {
      method: options.method,
      headers: {
        ...(options.body === undefined
          ? {}
          : { 'content-type': 'application/json' }),
        'x-sc-nonce': handshake.nonce,
      },
      body: options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    },
  );
  const text = await response.text();
  let value: unknown = null;
  if (text !== '') {
    try {
      value = JSON.parse(text);
    } catch {
      value = text;
    }
  }
  if (!response.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${path} returned ${
        response.status
      }: ${JSON.stringify(value)}`,
    );
  }
  return value as T;
}

function git(args: string[]): string {
  const result = spawnSync('git', ['-C', REPO_ROOT, ...args], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr.trim()}`,
    );
  }
  return result.stdout.trim();
}

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

let failure: unknown = null;
try {
  await main();
} catch (error) {
  failure = error;
} finally {
  try {
    await (daemon as RunningDaemon | null)?.shutdown();
  } catch (error) {
    failure ??= error;
  }
  try {
    if (temporaryRoot) {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  } catch (error) {
    failure ??= error;
  }
}

if (failure) {
  console.error('FAILED — Plan 7 real Distill operation');
  console.error(
    `DETAIL — ${failure instanceof Error ? failure.stack : String(failure)}`,
  );
  process.exitCode = 1;
} else {
  console.log('VERIFIED — Plan 7 real Distill operation');
}
