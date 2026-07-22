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

describe('resume', () => {
  it('resumes an interrupted job with the original envelope and prior thread id', async () => {
    const root = mkdtempSync(join(tmpdir(), 'res-'));
    const db = join(root, 'state.sqlite3');
    const s1 = new JobSupervisor({
      store: new JobStore(db), jobsRoot: join(root, 'jobs'), pollMs: 50,
      env: { FAKE_CODEX_MODE: 'hang' },
    });
    sups.push(s1);
    const id = s1.enqueue({ prompt: 'payload-original', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    const status = await waitFor(() => {
      const current = readStatus(jobPaths(s1.store.get(id)!.jobDir).statusFile);
      return current?.threadId ? current : undefined;
    });
    const originalThread = status.threadId!;
    expect(originalThread).toBeTruthy();
    process.kill(-status.pgid, 'SIGKILL');
    s1.stop();

    const s2 = new JobSupervisor({
      store: new JobStore(db), jobsRoot: join(root, 'jobs'), pollMs: 50,
      env: { FAKE_CODEX_MODE: 'happy' },
    });
    sups.push(s2);
    s2.reattach();
    await waitFor(() => s2.store.get(id)!.state === 'interrupted');
    expect(s2.store.get(id)!.state).toBe('interrupted');

    const resumedId = s2.resume(id);
    const rec = await s2.waitForTerminal(resumedId, 30000);
    expect(rec.state).toBe('completed');
    expect(rec.resumedFrom).toBe(id);
    expect(rec.threadId).toBe(originalThread); // fake echoes the resumed id
    const resumedEnv = JSON.parse(rec.envelopeJson);
    expect(resumedEnv.prompt).toBe('payload-original');
    expect(resumedEnv.resumeThreadId).toBe(originalThread);
  });

  it('refuses to resume a job without a thread id', async () => {
    const root = mkdtempSync(join(tmpdir(), 'res-'));
    const s = new JobSupervisor({
      store: new JobStore(join(root, 'state.sqlite3')), jobsRoot: join(root, 'jobs'), pollMs: 50,
    });
    sups.push(s);
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: `${process.execPath} -e process.exit(9)` });
    await s.waitForTerminal(id);
    expect(() => s.resume(id)).toThrow(/interrupted/);
  });
});
