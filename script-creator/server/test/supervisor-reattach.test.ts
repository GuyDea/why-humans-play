import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JobStore } from '../src/job-store.js';
import { JobSupervisor } from '../src/supervisor.js';

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
    await new Promise((r) => setTimeout(r, 300)); // runner detached and running
    s1.stop(); // daemon "dies"; runner keeps going
    const s2 = supervisorAt(root, db, 'slow');
    s2.reattach();
    const rec = await s2.waitForTerminal(id, 30000);
    expect(rec.state).toBe('completed');
    expect(rec.usageAvailable).toBe(1);
    expect(s2.events(id).at(-1)!.parsed!.type).toBe('turn.completed');
  });

  it('marks a dead-runner job interrupted', async () => {
    const root = mkdtempSync(join(tmpdir(), 'reat-'));
    const db = join(root, 'state.sqlite3');
    const s1 = supervisorAt(root, db, 'hang');
    const id = s1.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    await new Promise((r) => setTimeout(r, 500));
    // Kill the hung runner process group outright
    const status = JSON.parse(
      readFileSync(join(s1.store.get(id)!.jobDir, 'status.json'), 'utf8'));
    process.kill(-status.pgid, 'SIGKILL');
    s1.stop();
    const s2 = supervisorAt(root, db, 'hang');
    s2.reattach();
    await new Promise((r) => setTimeout(r, 300));
    expect(s2.store.get(id)!.state).toBe('interrupted');
  });
});
