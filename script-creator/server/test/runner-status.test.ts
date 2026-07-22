import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { jobPaths, readStatus, writeStatus } from '../src/runner-status.js';
import type { RunnerStatus } from '../src/types.js';

const status: RunnerStatus = {
  state: 'running', pid: 123, pgid: 123, startedAt: new Date(0).toISOString(),
};

describe('runner status', () => {
  it('round-trips atomically without leaving tmp files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'st-'));
    const file = join(dir, 'status.json');
    writeStatus(file, status);
    writeStatus(file, { ...status, state: 'completed', exitCode: 0 });
    expect(readStatus(file)!.state).toBe('completed');
    expect(readdirSync(dir)).toEqual(['status.json']);
  });

  it('returns null for a missing file', () => {
    expect(readStatus(join(tmpdir(), 'nope', 'status.json'))).toBeNull();
  });

  it('derives job paths', () => {
    const p = jobPaths('/x/j1');
    expect(p.eventsFile).toBe('/x/j1/events.jsonl');
    expect(p.statusFile).toBe('/x/j1/status.json');
    expect(p.finalMessageFile).toBe('/x/j1/final-message.txt');
    expect(p.schemaFile).toBe('/x/j1/schema.json');
  });
});
