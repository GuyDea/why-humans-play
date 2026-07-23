import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JobStore } from '../src/job-store.js';
import { JobSupervisor } from '../src/supervisor.js';

const FAKE = `${process.execPath} ${join(import.meta.dirname, 'fake-codex.mjs')}`;

let sup: JobSupervisor;
afterEach(() => sup?.stop());

function makeSupervisor(mode = 'happy'): JobSupervisor {
  const root = mkdtempSync(join(tmpdir(), 'sup-'));
  sup = new JobSupervisor({
    store: new JobStore(join(root, 'state.sqlite3')),
    jobsRoot: join(root, 'jobs'),
    pollMs: 50,
    env: { FAKE_CODEX_MODE: mode },
  });
  return sup;
}

describe('JobSupervisor', () => {
  it('runs a job to completion with events, thread id, and tokens', async () => {
    const s = makeSupervisor();
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    const rec = await s.waitForTerminal(id);
    expect(rec.state).toBe('completed');
    expect(rec.threadId).toBeTruthy();
    expect(rec.usageAvailable).toBe(1);
    expect(rec.inputTokens).toBe(17766);
    expect(rec.cachedInputTokens).toBe(6912);
    expect(rec.outputTokens).toBe(46);
    expect(rec.reasoningOutputTokens).toBe(39);
    expect(s.events(id).at(-1)!.parsed!.type).toBe('turn.completed');
  });

  it('runs jobs one at a time in FIFO order', async () => {
    const s = makeSupervisor('slow');
    const a = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    const b = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    // While a runs, b must still be queued
    await new Promise((r) => setTimeout(r, 300));
    expect(s.store.get(b)!.state).toBe('queued');
    expect(s.store.get(a)!.state).toBe('running');
    const recB = await s.waitForTerminal(b, 30000);
    expect(recB.state).toBe('completed');
    expect(Date.parse(s.store.get(a)!.finishedAt!)).toBeLessThanOrEqual(Date.parse(recB.finishedAt!));
  });

  it('marks a nonzero-exit run failed with the stderr tail as error', async () => {
    const s = makeSupervisor('happy');
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: `${process.execPath} -e process.exit(3)` });
    const rec = await s.waitForTerminal(id);
    expect(rec.state).toBe('failed');
  });

  it('exposes the turn.failed error message on the job record', async () => {
    const s = makeSupervisor('turn-failed');
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    const rec = await s.waitForTerminal(id);
    expect(rec.state).toBe('failed');
    expect(rec.error).toContain('invalid_json_schema');
    expect(rec.usageAvailable).toBe(0);
  });
});
