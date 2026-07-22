import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JobStore } from '../src/job-store.js';
import { jobPaths, readStatus } from '../src/runner-status.js';
import { JobSupervisor } from '../src/supervisor.js';
import { waitFor } from './helpers.js';

const FAKE = `${process.execPath} ${join(import.meta.dirname, 'fake-codex.mjs')}`;
let sup: JobSupervisor;
afterEach(() => sup?.stop());

function makeSupervisor(mode: string): JobSupervisor {
  const root = mkdtempSync(join(tmpdir(), 'can-'));
  sup = new JobSupervisor({
    store: new JobStore(join(root, 'state.sqlite3')), jobsRoot: join(root, 'jobs'),
    pollMs: 50, env: { FAKE_CODEX_MODE: mode },
  });
  return sup;
}

describe('cancel', () => {
  it('cancels a cooperative run via SIGINT and preserves events', async () => {
    const s = makeSupervisor('slow');
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE, graceMs: 500 });
    await waitFor(() => s.events(id).length > 0);
    s.cancel(id);
    const rec = await s.waitForTerminal(id, 15000);
    expect(rec.state).toBe('cancelled');
    expect(s.events(id).length).toBeGreaterThan(0);
  });

  it('escalates to SIGKILL for a SIGINT-ignoring run', async () => {
    const s = makeSupervisor('ignore-sigint');
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE, graceMs: 300 });
    await waitFor(() => s.events(id).length > 0);
    const status = await waitFor(() => readStatus(jobPaths(s.store.get(id)!.jobDir).statusFile));
    s.cancel(id);
    const rec = await s.waitForTerminal(id, 15000);
    expect(rec.state).toBe('cancelled');
    expect(() => process.kill(-status.pgid, 0)).toThrow();
    expect(s.events(id).length).toBeGreaterThan(0);
  }, 20000);

  it('keeps cancelling until a surviving process-group descendant is dead', async () => {
    const s = makeSupervisor('surviving-descendant');
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE, graceMs: 100 });
    await waitFor(() => s.events(id).length > 0);
    const status = await waitFor(() => readStatus(jobPaths(s.store.get(id)!.jobDir).statusFile));
    let groupAliveAtTerminal = true;
    try {
      s.cancel(id);
      expect((await s.waitForTerminal(id, 15000)).state).toBe('cancelled');
      groupAliveAtTerminal = (() => {
        try { process.kill(-status.pgid, 0); return true; } catch { return false; }
      })();
    } finally {
      try { process.kill(-status.pgid, 'SIGKILL'); } catch { /* already dead */ }
    }
    expect(groupAliveAtTerminal).toBe(false);
    expect(s.events(id).length).toBeGreaterThan(0);
  }, 20000);
});
