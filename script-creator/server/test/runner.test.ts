import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EventLog } from '../src/event-log.js';
import { jobPaths, readStatus } from '../src/runner-status.js';
import { makeJobDir, runRunner } from './helpers.js';

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
    expect(status.usage).toEqual({
      input_tokens: 17766,
      cached_input_tokens: 6912,
      output_tokens: 46,
      reasoning_output_tokens: 39,
    });
    expect(readFileSync(p.finalMessageFile, 'utf8')).toBe('OK');
  });

  it('marks failed with unavailable usage in no-usage + nonzero-exit conditions', async () => {
    const jobDir = makeJobDir({});
    await runRunner(jobDir, 'no-usage');
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(status.state).toBe('completed'); // exit 0; usage simply absent
    expect(status.usage).toBeUndefined();
  });

  it('waits for stdout close and captures usage written after the codex process exits', async () => {
    const jobDir = makeJobDir({});
    const code = await runRunner(jobDir, 'late-usage');
    expect(code).toBe(0);
    expect(readStatus(jobPaths(jobDir).statusFile)!.usage).toEqual({
      input_tokens: 17766,
      cached_input_tokens: 6912,
      output_tokens: 46,
      reasoning_output_tokens: 39,
    });
  });

  it('records a missing codex executable as an explicit spawn failure', async () => {
    const missing = join(tmpdir(), `missing-codex-${process.pid}-${Date.now()}`);
    const jobDir = makeJobDir({ codexBin: missing });
    const code = await runRunner(jobDir);
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(code).not.toBe(0);
    expect(status.state).toBe('failed');
    expect(status.errorMessage).toContain('ENOENT');
  });
});
