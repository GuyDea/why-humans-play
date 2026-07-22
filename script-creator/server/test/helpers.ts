import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

export async function waitFor<T>(
  condition: () => T | undefined | null | false,
  timeoutMs = 15000,
): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const result = condition();
    if (result) return result;
    if (Date.now() > end) throw new Error(`condition not reached within ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
