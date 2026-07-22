import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobStore } from '../src/job-store.js';
import { jobPaths } from '../src/runner-status.js';
import { JobSupervisor } from '../src/supervisor.js';
import type { JobEnvelope } from '../src/types.js';
import { waitFor } from './helpers.js';

const FAKE = `${process.execPath} ${join(import.meta.dirname, 'fake-codex.mjs')}`;
let sup: JobSupervisor;

afterEach(() => {
  vi.useRealTimers();
  sup?.stop();
});

function makeSupervisor(opts: {
  mode?: string;
  pollMs?: number;
  startupGraceMs?: number;
  runnerBin?: string;
} = {}): JobSupervisor {
  const root = mkdtempSync(join(tmpdir(), 'hard-'));
  sup = new JobSupervisor({
    store: new JobStore(join(root, 'state.sqlite3')),
    jobsRoot: join(root, 'jobs'),
    pollMs: opts.pollMs ?? 20,
    startupGraceMs: opts.startupGraceMs,
    env: { FAKE_CODEX_MODE: opts.mode ?? 'happy' },
    runnerBin: opts.runnerBin,
  });
  return sup;
}

function isGroupAlive(pgid: number): boolean {
  try { process.kill(-pgid, 0); return true; } catch { return false; }
}

describe('supervisor hardening', () => {
  it('measures startup grace from launch time for a job queued longer than the grace window', async () => {
    const s = makeSupervisor({ mode: 'slow', pollMs: 10, startupGraceMs: 500 });
    const first = s.enqueue({ jobId: 'first', prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    const second = s.enqueue({ jobId: 'second', prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });

    await s.waitForTerminal(first, 20000);
    expect(Date.now() - Date.parse(s.store.get(second)!.createdAt)).toBeGreaterThan(500);
    expect((await s.waitForTerminal(second, 20000)).state).toBe('completed');
  }, 30000);

  it('keeps an early-cancelled runner exclusive until the runner is dead', async () => {
    const s = makeSupervisor({ mode: 'slow', pollMs: 10 });
    const first = s.enqueue({ jobId: 'cancel-first', prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE, graceMs: 100 });
    const second = s.enqueue({ jobId: 'run-second', prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    const runnerPid = (s as unknown as { spawnedPids: Map<string, number> }).spawnedPids.get(first)!;
    expect(runnerPid).toBeGreaterThan(0);
    process.kill(-runnerPid, 'SIGSTOP');

    let secondStartedWhileFirstAlive = false;
    let groupAliveAtTerminal = true;
    try {
      await new Promise((r) => setTimeout(r, 50));
      expect(existsSync(jobPaths(s.store.get(first)!.jobDir).statusFile)).toBe(false);
      s.cancel(first);

      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const firstRec = s.store.get(first)!;
        const secondRec = s.store.get(second)!;
        const groupAlive = isGroupAlive(runnerPid);
        if (groupAlive && secondRec.state !== 'queued') secondStartedWhileFirstAlive = true;
        if (firstRec.state === 'cancelled' && !groupAlive) break;
        await new Promise((r) => setTimeout(r, 10));
      }

      expect((await s.waitForTerminal(first, 5000)).state).toBe('cancelled');
      groupAliveAtTerminal = isGroupAlive(runnerPid);
      expect((await s.waitForTerminal(second, 20000)).state).toBe('completed');
    } finally {
      try { process.kill(-runnerPid, 'SIGKILL'); } catch { /* already dead */ }
    }

    expect(groupAliveAtTerminal).toBe(false);
    expect(secondStartedWhileFirstAlive).toBe(false);
  }, 30000);

  it('keeps a pre-status cancellation exclusive across supervisor restart until the process group dies', async () => {
    const root = mkdtempSync(join(tmpdir(), 'hard-cancel-restart-'));
    const db = join(root, 'state.sqlite3');
    const jobsRoot = join(root, 'jobs');
    const options = {
      jobsRoot,
      pollMs: 10,
      startupGraceMs: 300,
      env: { FAKE_CODEX_MODE: 'happy', RUNNER_STATUS_DELAY_MS: '3000' },
    };
    const s1 = new JobSupervisor({ store: new JobStore(db), ...options });
    const first = s1.enqueue({
      jobId: 'restart-cancel-first', prompt: 'p', cwd: tmpdir(), sandbox: 'read-only',
      codexBin: FAKE, graceMs: 100,
    });
    const second = s1.enqueue({
      jobId: 'restart-cancel-second', prompt: 'p', cwd: tmpdir(), sandbox: 'read-only',
      codexBin: FAKE,
    });
    const runnerPid = (s1 as unknown as { spawnedPids: Map<string, number> }).spawnedPids.get(first)!;
    expect(runnerPid).toBeGreaterThan(0);
    process.kill(-runnerPid, 'SIGSTOP');

    let s2: JobSupervisor | undefined;
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(existsSync(jobPaths(s1.store.get(first)!.jobDir).statusFile)).toBe(false);
      s1.cancel(first);
      expect(s1.store.get(first)!.state).toBe('cancelling');
      s1.stop();

      s2 = new JobSupervisor({ store: new JobStore(db), ...options });
      sup = s2;
      s2.reattach();

      let observedAliveCancellation = false;
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const groupAlive = isGroupAlive(runnerPid);
        const firstState = s2.store.get(first)!.state;
        const secondState = s2.store.get(second)!.state;
        if (groupAlive) {
          observedAliveCancellation = true;
          expect(firstState).toBe('cancelling');
          expect(secondState).toBe('queued');
        }
        if (!groupAlive && firstState === 'cancelled') break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      expect(observedAliveCancellation).toBe(true);
      expect((await s2.waitForTerminal(first, 5000)).state).toBe('cancelled');
      expect(isGroupAlive(runnerPid)).toBe(false);
    } finally {
      try { process.kill(-runnerPid, 'SIGKILL'); } catch { /* already dead */ }
      const secondPid = s2
        ? (s2 as unknown as { spawnedPids: Map<string, number> }).spawnedPids.get(second)
        : undefined;
      if (secondPid !== undefined) {
        try { process.kill(-secondPid, 'SIGKILL'); } catch { /* already dead */ }
      }
    }
  }, 15000);

  it('keeps a pre-status running job attached across supervisor restart while its launch pid is alive', async () => {
    const root = mkdtempSync(join(tmpdir(), 'hard-running-restart-'));
    const db = join(root, 'state.sqlite3');
    const jobsRoot = join(root, 'jobs');
    const options = {
      jobsRoot,
      pollMs: 10,
      startupGraceMs: 300,
      env: { FAKE_CODEX_MODE: 'happy', RUNNER_STATUS_DELAY_MS: '3000' },
    };
    const s1 = new JobSupervisor({ store: new JobStore(db), ...options });
    const id = s1.enqueue({
      jobId: 'restart-running', prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE,
    });
    const runnerPid = (s1 as unknown as { spawnedPids: Map<string, number> }).spawnedPids.get(id)!;
    expect(runnerPid).toBeGreaterThan(0);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(existsSync(jobPaths(s1.store.get(id)!.jobDir).statusFile)).toBe(false);
      s1.stop();

      const s2 = new JobSupervisor({ store: new JobStore(db), ...options });
      sup = s2;
      s2.reattach();
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(isGroupAlive(runnerPid)).toBe(true);
      expect(existsSync(jobPaths(s2.store.get(id)!.jobDir).statusFile)).toBe(false);
      expect(s2.store.get(id)!.state).toBe('running');
      expect((await s2.waitForTerminal(id, 10000)).state).toBe('completed');
    } finally {
      try { process.kill(-runnerPid, 'SIGKILL'); } catch { /* already dead */ }
    }
  }, 15000);

  it('persists partial turn usage as wholly unavailable', async () => {
    const s = makeSupervisor({ mode: 'partial-usage' });
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    const rec = await s.waitForTerminal(id);
    expect(rec.usageAvailable).toBe(0);
    expect(rec.inputTokens).toBeNull();
    expect(rec.cachedInputTokens).toBeNull();
    expect(rec.outputTokens).toBeNull();
    expect(rec.reasoningOutputTokens).toBeNull();
  });

  it('launches reverse-lexical queued ids in database insertion order', async () => {
    const root = mkdtempSync(join(tmpdir(), 'hard-fifo-'));
    const jobsRoot = join(root, 'jobs');
    const store = new JobStore(join(root, 'state.sqlite3'));
    mkdirSync(jobsRoot, { recursive: true });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T12:00:00.000Z'));
    for (const jobId of ['z-first', 'a-second']) {
      const jobDir = join(jobsRoot, jobId);
      const envelope: JobEnvelope = {
        jobId, prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE,
      };
      mkdirSync(jobDir);
      writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(envelope));
      store.create(envelope, jobDir);
    }
    vi.useRealTimers();

    sup = new JobSupervisor({
      store, jobsRoot, pollMs: 10, env: { FAKE_CODEX_MODE: 'slow' },
    });
    await waitFor(() => store.get('z-first')!.state === 'running');
    expect(store.get('a-second')!.state).toBe('queued');
    expect((await sup.waitForTerminal('z-first', 20000)).state).toBe('completed');
    expect((await sup.waitForTerminal('a-second', 20000)).state).toBe('completed');
  }, 30000);

  it('marks a detached runner spawn error failed', async () => {
    const missing = join(tmpdir(), `missing-node-${process.pid}-${Date.now()}`);
    const s = makeSupervisor({ runnerBin: missing });
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    const rec = await s.waitForTerminal(id);
    expect(rec.state).toBe('failed');
    expect(rec.error).toContain('ENOENT');
  });

  it('does not handle a detached runner spawn error through a closed store', async () => {
    const missing = join(tmpdir(), `missing-node-stop-${process.pid}-${Date.now()}`);
    const s = makeSupervisor({ runnerBin: missing });
    s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    s.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
