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

if (process.env['RUN_REAL_CODEX'] !== '1') {
  console.log('SKIP — set RUN_REAL_CODEX=1 for Plan 7 real Distill');
  process.exit(0);
}

let temporaryRoot: string | null = null;
let daemon: RunningDaemon | null = null;

async function main(): Promise<void> {
  const initialHead = git(['rev-parse', 'HEAD']);
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

  const decisionIds = [
    'synthetic-decision-accepted',
    'synthetic-decision-rejected',
  ];
  const inputs = {
    session: {
      id: 'synthetic-session-plan7-spot',
      draft_id: 'synthetic-draft-plan7-spot',
      trigger: 'on-demand',
      decisions: [
        {
          id: decisionIds[0],
          draftId: 'synthetic-draft-plan7-spot',
          seq: 1,
          kind: 'proposal-accepted',
          disposition: 'selection-proposal-accepted',
          sourceTimestamp: '2026-07-24T08:00:00.000Z',
          createdAt: '2026-07-24T08:00:00.000Z',
          note: null,
          context: {
            source: {
              type: 'revision',
              id: 'synthetic-revision-accepted',
              disposition: 'selection-proposal-accepted',
            },
            diff: {
              before: 'The choice is abstract.',
              after: 'The player chooses the visibly riskier queue.',
            },
          },
        },
        {
          id: decisionIds[1],
          draftId: 'synthetic-draft-plan7-spot',
          seq: 2,
          kind: 'proposal-rejected',
          disposition: 'rejected',
          sourceTimestamp: '2026-07-24T08:05:00.000Z',
          createdAt: '2026-07-24T08:05:00.000Z',
          note: 'The proposed claim outruns this episode’s evidence.',
          context: {
            source: {
              type: 'narration-proposal',
              id: 'synthetic-operation-rejected',
              disposition: 'rejected',
            },
            proposal: {
              base: 'This queue changes what everyone values.',
              proposed: 'All games reveal universal human values.',
            },
          },
        },
      ],
    },
    existing_lessons: [{
      id: 'synthetic-prior-lesson',
      draft_id: 'synthetic-draft-plan7-spot',
      classification: 'episode-local',
      state: 'approved',
      lesson_markdown:
        'Keep the queue choice visible when explaining the causal turn.',
      rationale_markdown:
        'A previously reviewed episode-local lesson.',
      proposed_target: null,
      supersedes_lesson_id: null,
      evidence: ['synthetic-prior-decision'],
      repository_provenance: null,
    }],
  };

  const submitted = await request<{ id: string }>(
    handshake,
    '/api/ops',
    {
      method: 'POST',
      body: { operation: 'distill', inputs },
    },
  );
  const operation = await waitForTerminal(handshake, submitted.id);
  assert(
    operation.state === 'completed',
    `Distill ended in ${operation.state}: ${operation.error ?? 'no error'}`,
  );
  assert(
    JSON.stringify(operation.inputs) === JSON.stringify(inputs),
    'real Distill did not preserve the submitted frozen inputs',
  );

  const result = await request<OperationResult>(
    handshake,
    `/api/ops/${encodeURIComponent(submitted.id)}/result`,
  );
  assert(result.kind === 'schema', 'real Distill did not return strict JSON');
  const definition = OPERATIONS.distill;
  assert(
    definition.result.kind === 'schema',
    'Distill has no registered strict result schema',
  );
  const validation = validateAgainstSchema(
    definition.result.schema,
    JSON.stringify(result.value),
  );
  assert(
    validation.ok,
    `real Distill result failed its registered schema: ${
      validation.ok ? '' : validation.reason
    }`,
  );
  const value = result.value as DistillationResult;
  const submittedEvidence = new Set(decisionIds);
  for (const lesson of value.lessons) {
    assert(
      lesson.evidence.length > 0
      && lesson.evidence.every((id) => submittedEvidence.has(id)),
      `real Distill cited evidence outside the frozen session: ${
        JSON.stringify(lesson.evidence)
      }`,
    );
    if (lesson.supersedes_lesson_id !== null) {
      assert(
        lesson.supersedes_lesson_id === 'synthetic-prior-lesson',
        'real Distill superseded a lesson absent from frozen prior context',
      );
    }
  }

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
        'content-type': 'application/json',
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
