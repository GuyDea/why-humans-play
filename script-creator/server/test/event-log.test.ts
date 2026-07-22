import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EventLog } from '../src/event-log.js';

describe('EventLog', () => {
  it('appends and reads incrementally with stable seq', () => {
    const log = new EventLog(join(mkdtempSync(join(tmpdir(), 'log-')), 'events.jsonl'));
    log.append('{"type":"turn.started"}');
    log.append('{broken');
    log.append('{"type":"turn.completed"}');
    expect(log.count()).toBe(3);
    const all = log.read();
    expect(all.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(all[0]!.parsed!.type).toBe('turn.started');
    expect(all[1]!.parsed).toBeUndefined();
    const tail = log.read(2);
    expect(tail.map((e) => e.seq)).toEqual([3]);
  });

  it('reads across separate instances (reattach)', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'log-')), 'events.jsonl');
    new EventLog(file).append('{"type":"turn.started"}');
    expect(new EventLog(file).read()[0]!.parsed!.type).toBe('turn.started');
  });
});
