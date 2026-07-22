import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EventLog } from '../src/event-log.js';
import { jobPaths, readStatus } from '../src/runner-status.js';
import type { JobEnvelope } from '../src/types.js';

const RUNNER = join(import.meta.dirname, '..', 'src', 'runner.ts');
const FAKE = join(import.meta.dirname, 'fake-codex.mjs');

export function makeJobDir(envelope: Partial<JobEnvelope>): string {
  const jobDir = mkdtempSync(join(tmpdir(), 'job-'));
  const env: JobEnvelope = {
    jobId: 'j1', prompt: 'payload', cwd: jobDir, sandbox: 'read-only',
    codexBin: `${process.execPath} ${FAKE}`, ...envelope,
  };
  writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(env));
  return jobDir;
}

export function runRunner(jobDir: string, mode = 'happy'): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', 'tsx', RUNNER, jobDir], {
      env: { ...process.env, FAKE_CODEX_MODE: mode },
      stdio: 'ignore',
    });
    child.on('exit', (code) => resolve(code ?? -1));
  });
}

describe('runner', () => {
  it('journals events, captures thread id and usage, completes', async () => {
    const jobDir = makeJobDir({});
    const code = await runRunner(jobDir);
    expect(code).toBe(0);
    const p = jobPaths(jobDir);
    const events = new EventLog(p.eventsFile).read();
    expect(events[0]!.parsed!.type).toBe('thread.started');
    expect(events.at(-1)!.parsed!.type).toBe('turn.completed');
    const status = readStatus(p.statusFile)!;
    expect(status.state).toBe('completed');
    expect(status.threadId).toBeTruthy();
    expect(status.usage!.input_tokens).toBeGreaterThan(0);
    expect(readFileSync(p.finalMessageFile, 'utf8')).toBe('OK');
  });

  it('marks failed with unavailable usage in no-usage + nonzero-exit conditions', async () => {
    const jobDir = makeJobDir({});
    await runRunner(jobDir, 'no-usage');
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(status.state).toBe('completed'); // exit 0; usage simply absent
    expect(status.usage).toBeUndefined();
  });
});
