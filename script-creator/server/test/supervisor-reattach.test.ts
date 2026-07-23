import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JobStore } from '../src/job-store.js';
import { jobPaths, readStatus } from '../src/runner-status.js';
import { JobSupervisor } from '../src/supervisor.js';
import { waitFor } from './helpers.js';

const FAKE = `${process.execPath} ${join(import.meta.dirname, 'fake-codex.mjs')}`;
const sups: JobSupervisor[] = [];
afterEach(() => sups.forEach((s) => { try { s.stop(); } catch { /* closed */ } }));

function supervisorAt(root: string, dbShared: string, mode: string): JobSupervisor {
  const s = new JobSupervisor({
    store: new JobStore(dbShared), jobsRoot: join(root, 'jobs'),
    pollMs: 50, env: { FAKE_CODEX_MODE: mode },
  });
  sups.push(s);
  return s;
}

describe('reattach', () => {
  it('a second supervisor finishes bookkeeping for a job launched by a dead first one', async () => {
    const root = mkdtempSync(join(tmpdir(), 'reat-'));
    const db = join(root, 'state.sqlite3');
    const s1 = supervisorAt(root, db, 'slow');
    const id = s1.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    await waitFor(() => readStatus(jobPaths(s1.store.get(id)!.jobDir).statusFile)?.state === 'running');
    s1.stop(); // daemon "dies"; runner keeps going
    const s2 = supervisorAt(root, db, 'slow');
    s2.reattach();
    const rec = await s2.waitForTerminal(id, 30000);
    expect(rec.state).toBe('completed');
    expect(rec.usageAvailable).toBe(1);
    expect(s2.events(id).at(-1)!.parsed!.type).toBe('turn.completed');
  });

  it('re-arms cancellation escalation from the persisted deadline', async () => {
    const root = mkdtempSync(join(tmpdir(), 'reat-cancel-'));
    const db = join(root, 'state.sqlite3');
    const s1 = supervisorAt(root, db, 'ignore-sigint');
    const id = s1.enqueue({
      prompt: 'p',
      cwd: tmpdir(),
      sandbox: 'read-only',
      codexBin: FAKE,
      graceMs: 400,
    });
    await waitFor(() => s1.events(id).length >= 2);
    const status = await waitFor(() => readStatus(jobPaths(s1.store.get(id)!.jobDir).statusFile));

    try {
      process.kill(-status.pgid, 'SIGSTOP');
      s1.cancel(id);
      expect(s1.store.get(id)!.state).toBe('cancelling');
      const cancellation = s1.store.getCancellation(id)!;
      expect(cancellation.requestedAt).not.toBeNull();
      expect(cancellation.deadlineAt).not.toBeNull();
      expect(Date.parse(cancellation.deadlineAt!) - Date.parse(cancellation.requestedAt!)).toBe(800);
      s1.stop();

      await new Promise((resolve) => setTimeout(resolve, 900));
      const s2 = supervisorAt(root, db, 'ignore-sigint');
      s2.reattach();

      await waitFor(() => {
        try {
          process.kill(-status.pgid, 0);
          return false;
        } catch {
          return true;
        }
      }, 300);
      expect((await s2.waitForTerminal(id, 5000)).state).toBe('cancelled');
    } finally {
      try { process.kill(-status.pgid, 'SIGKILL'); } catch { /* already dead */ }
    }
  });

  it('marks a dead-runner job interrupted', async () => {
    const root = mkdtempSync(join(tmpdir(), 'reat-'));
    const db = join(root, 'state.sqlite3');
    const s1 = supervisorAt(root, db, 'hang');
    const id = s1.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    // Kill the hung runner process group outright
    const status = await waitFor(() => readStatus(jobPaths(s1.store.get(id)!.jobDir).statusFile));
    process.kill(-status.pgid, 'SIGKILL');
    s1.stop();
    const s2 = supervisorAt(root, db, 'hang');
    s2.reattach();
    await waitFor(() => s2.store.get(id)!.state === 'interrupted');
    expect(s2.store.get(id)!.state).toBe('interrupted');
  });
});
