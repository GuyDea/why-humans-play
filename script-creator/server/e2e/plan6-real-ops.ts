import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  createDaemonContext,
  startDaemonContext,
  type RunningDaemon,
} from '../src/daemon.js';
import {
  OPERATIONS,
  type OperationName,
} from '../src/operations/registry.js';
import { validateAgainstSchema } from '../src/schema-validate.js';

interface OperationRecord {
  state: string;
  error: string | null;
}

type OperationResult =
  | {
    kind: 'raw';
    markdown: string;
  }
  | {
    kind: 'schema';
    value: unknown;
    guardrail: string | null;
  }
  | {
    kind: 'failed';
    error: string;
  }
  | {
    kind: 'pending';
  };

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
  console.log('SKIP — set RUN_REAL_CODEX=1 for Plan 6 real operations');
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
  temporaryRoot = mkdtempSync(join(tmpdir(), 'whp-plan6-real-'));
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

  const operationCountBeforeGate = (
    await request<{ operations: unknown[] }>(
      handshake,
      '/api/ops',
    )
  ).operations.length;
  const gateResponse = await requestRaw(
    handshake,
    '/api/ops',
    {
      method: 'POST',
      body: {
        operation: 'generate-episode',
        inputs: {
          creative_status: { phase: 'creative-approved' },
          approved_architecture_md: 'forged browser approval',
        },
      },
    },
  );
  assert(
    gateResponse.status === 400,
    `forged narration context returned HTTP ${gateResponse.status}`,
  );
  assert(
    gateResponse.value
      && typeof gateResponse.value === 'object'
      && 'error' in gateResponse.value
      && gateResponse.value.error ===
        'operation generate-episode requires a draft-scoped submission',
    'forged narration context did not hit the approved-context gate',
  );
  const operationCountAfterGate = (
    await request<{ operations: unknown[] }>(
      handshake,
      '/api/ops',
    )
  ).operations.length;
  assert(
    operationCountAfterGate === operationCountBeforeGate,
    'rejected narration gate created an operation',
  );

  const generated = await execute(
    handshake,
    'generate-architecture',
    {
      topic_brief: [
        '# Selected topic brief',
        '',
        'A familiar queue becomes a small game of prediction.',
      ].join('\n'),
      approved_lessons: [],
      user_constraints: 'Return the smallest useful episode architecture.',
    },
  );
  assert(
    generated.kind === 'raw'
      && generated.markdown.trim().length > 0
      && /^#{1,3}\s/m.test(generated.markdown),
    'Generate Architecture did not return non-empty raw Markdown',
  );

  const architectureMd = [
    '### Package and audience',
    '',
    'Curious adults who recognize choosing the apparently faster line.',
    '',
    '### Core answer',
    '',
    'A queue exposes how people predict and respond to other people.',
  ].join('\n');
  const reviewed = await execute(
    handshake,
    'review-architecture',
    {
      architecture_md: architectureMd,
      topic_brief: 'A queue turns waiting into a visible coordination game.',
    },
  );
  assertStrictResult('review-architecture', reviewed);

  const rewritten = await execute(
    handshake,
    'rewrite-architecture-section',
    {
      section_key: 'core-answer',
      section_markdown: [
        '### Core answer',
        '',
        'A queue exposes prediction.',
      ].join('\n'),
      architecture_md: architectureMd,
      topic_brief: 'A queue turns waiting into a visible coordination game.',
      user_instruction:
        'Make the causal step specific in no more than two sentences.',
    },
  );
  assertStrictResult('rewrite-architecture-section', rewritten);

  assert(
    git(['rev-parse', 'HEAD']) === initialHead,
    'real architecture operations changed repository HEAD',
  );
  assert(
    git([
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
    ]) === initialStatus,
    'real architecture operations changed repository files',
  );
}

async function execute(
  handshake: { port: number; nonce: string },
  operation: OperationName,
  inputs: unknown,
): Promise<OperationResult> {
  const submitted = await request<{ id: string }>(
    handshake,
    '/api/ops',
    {
      method: 'POST',
      body: { operation, inputs },
    },
  );
  const record = await waitForTerminal(handshake, submitted.id);
  assert(
    record.state === 'completed',
    `${operation} ended in ${record.state}: ${record.error ?? 'no error'}`,
  );
  return request<OperationResult>(
    handshake,
    `/api/ops/${encodeURIComponent(submitted.id)}/result`,
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

function assertStrictResult(
  operation: 'review-architecture' | 'rewrite-architecture-section',
  result: OperationResult,
): void {
  assert(result.kind === 'schema', `${operation} did not return strict JSON`);
  const definition = OPERATIONS[operation];
  assert(
    definition.result.kind === 'schema',
    `${operation} has no registered strict schema`,
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

async function request<T>(
  handshake: { port: number; nonce: string },
  path: string,
  options: {
    method?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const response = await requestRaw(handshake, path, options);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `${options.method ?? 'GET'} ${path} returned ${
        response.status
      }: ${JSON.stringify(response.value)}`,
    );
  }
  return response.value as T;
}

async function requestRaw(
  handshake: { port: number; nonce: string },
  path: string,
  options: {
    method?: string;
    body?: unknown;
  } = {},
): Promise<{ status: number; value: any }> {
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
  return { status: response.status, value };
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
  console.error('FAILED — Plan 6 real architecture operations');
  console.error(
    `DETAIL — ${failure instanceof Error ? failure.stack : String(failure)}`,
  );
  process.exitCode = 1;
} else {
  console.log('VERIFIED — Plan 6 real architecture operations');
}
