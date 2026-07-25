import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EventLog } from '../src/event-log.js';
import { jobPaths, readStatus } from '../src/runner-status.js';
import type { JobEnvelope } from '../src/types.js';

const RUNNER = join(import.meta.dirname, '..', 'src', 'runner.ts');
const FAKE_CLAUDE = join(import.meta.dirname, 'fake-claude.mjs');
const SESSION_ID = '11111111-2222-4333-8444-555555555555';
const MAPPED_USAGE = {
  input_tokens: 4321,
  cached_input_tokens: 2048,
  output_tokens: 128,
  reasoning_output_tokens: 0,
};

function makeClaudeJobDir(envelope: Partial<JobEnvelope> = {}): string {
  const jobDir = mkdtempSync(join(tmpdir(), 'claude-job-'));
  const env: JobEnvelope = {
    jobId: 'jc1',
    prompt: '$writing-whp-youtube-scripts\nOperation: Review\nInputs: {}',
    cwd: jobDir,
    sandbox: 'read-only',
    backend: 'claude',
    claudeBin: `${process.execPath} ${FAKE_CLAUDE}`,
    ...envelope,
  };
  writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(env));
  return jobDir;
}

function runClaudeRunner(jobDir: string, mode = 'happy'): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', 'tsx', RUNNER, jobDir], {
      env: { ...process.env, FAKE_CLAUDE_MODE: mode },
      stdio: 'ignore',
    });
    child.on('exit', (code) => resolve(code ?? -1));
  });
}

describe('runner (claude backend)', () => {
  it('journals raw + translated events, captures session id and mapped usage, writes final message', async () => {
    const jobDir = makeClaudeJobDir();
    const code = await runClaudeRunner(jobDir);
    expect(code).toBe(0);

    const paths = jobPaths(jobDir);
    const events = new EventLog(paths.eventsFile).read();
    const types = events.map((event) => event.parsed?.type);
    // Raw Claude events are journaled verbatim...
    expect(types).toContain('system');
    expect(types).toContain('assistant');
    expect(types).toContain('result');
    // ...alongside the translated codex-shaped events downstream parsers read.
    const threadStarted = events.find((e) => e.parsed?.type === 'thread.started');
    expect(threadStarted?.parsed?.thread_id).toBe(SESSION_ID);
    const turnCompleted = events.find((e) => e.parsed?.type === 'turn.completed');
    expect(turnCompleted?.parsed?.usage).toEqual(MAPPED_USAGE);

    const status = readStatus(paths.statusFile)!;
    expect(status.state).toBe('completed');
    expect(status.threadId).toBe(SESSION_ID);
    expect(status.usage).toEqual(MAPPED_USAGE);
    expect(readFileSync(paths.finalMessageFile, 'utf8')).toBe('OK-CLAUDE');
  });

  it('captures the resumed session id from --resume', async () => {
    const jobDir = makeClaudeJobDir({ resumeThreadId: 'resumed-session-7' });
    await runClaudeRunner(jobDir);
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(status.threadId).toBe('resumed-session-7');
    expect(status.state).toBe('completed');
  });

  it('surfaces an is_error result as a failure with its message and unavailable usage', async () => {
    const jobDir = makeClaudeJobDir();
    await runClaudeRunner(jobDir, 'turn-failed');
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(status.state).toBe('failed');
    expect(status.errorMessage).toContain('invalid_json_schema');
    expect(status.usage).toBeUndefined();
    const events = new EventLog(jobPaths(jobDir).eventsFile).read();
    expect(events.some((e) => e.parsed?.type === 'turn.failed')).toBe(true);
  });

  it('completes with unavailable usage when the result omits usage', async () => {
    const jobDir = makeClaudeJobDir();
    const code = await runClaudeRunner(jobDir, 'no-usage');
    expect(code).toBe(0);
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(status.state).toBe('completed');
    expect(status.usage).toBeUndefined();
    expect(readFileSync(jobPaths(jobDir).finalMessageFile, 'utf8')).toBe('OK-CLAUDE');
  });

  it('passes the output schema inline and captures the structured result text', async () => {
    const jobDir = makeClaudeJobDir({ outputSchema: { type: 'object' } });
    await runClaudeRunner(jobDir, 'schema-output');
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(status.state).toBe('completed');
    // fake-claude echoes that it received a --json-schema argument.
    expect(readFileSync(jobPaths(jobDir).finalMessageFile, 'utf8'))
      .toBe('{"received_schema":true}');
  });

  it('records a missing claude executable as an explicit spawn failure', async () => {
    const missing = join(tmpdir(), `missing-claude-${process.pid}-${Date.now()}`);
    const jobDir = makeClaudeJobDir({ claudeBin: missing });
    const code = await runClaudeRunner(jobDir);
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(code).not.toBe(0);
    expect(status.state).toBe('failed');
    expect(status.errorMessage).toContain('ENOENT');
  });
});
