import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { jobPaths, readStatus } from '../src/runner-status.js';
import { makeJobDir } from './runner.test.js';

const run = promisify(execFile);

async function waitFor(pred: () => boolean, ms = 15000): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (pred()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('condition not reached');
}

describe('runner detachment', () => {
  it('completes after its launcher process has exited', async () => {
    const jobDir = makeJobDir({});
    const { stdout } = await run(process.execPath,
      [join(import.meta.dirname, 'launch-helper.mjs'), jobDir, 'slow']);
    const runnerPid = Number(stdout.trim());
    expect(runnerPid).toBeGreaterThan(0);
    // launcher already exited (execFile resolved); runner must finish on its own
    await waitFor(() => readStatus(jobPaths(jobDir).statusFile)?.state === 'completed');
    expect(readStatus(jobPaths(jobDir).statusFile)!.state).toBe('completed');
  });
});
