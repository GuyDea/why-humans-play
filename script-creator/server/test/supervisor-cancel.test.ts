import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JobStore } from '../src/job-store.js';
import { JobSupervisor } from '../src/supervisor.js';

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
    await new Promise((r) => setTimeout(r, 400));
    s.cancel(id);
    const rec = await s.waitForTerminal(id, 15000);
    expect(rec.state).toBe('cancelled');
    expect(s.events(id).length).toBeGreaterThan(0);
  });

  it('escalates to SIGKILL for a SIGINT-ignoring run', async () => {
    const s = makeSupervisor('ignore-sigint');
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE, graceMs: 300 });
    await new Promise((r) => setTimeout(r, 500));
    s.cancel(id);
    const rec = await s.waitForTerminal(id, 15000);
    expect(rec.state).toBe('cancelled');
  }, 20000);
});
