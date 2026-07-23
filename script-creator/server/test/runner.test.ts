import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EventLog } from '../src/event-log.js';
import {
  parseWhpProgress,
  WHP_PROGRESS_IDS,
} from '../src/operations/progress.js';
import { jobPaths, readStatus } from '../src/runner-status.js';
import { extractTopicSummary } from '../src/topics/service.js';
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

  it('journals a complete full topic run and captures its fenced summary', async () => {
    const jobDir = makeJobDir({});
    const code = await runRunner(jobDir, 'full-topic-run');
    expect(code).toBe(0);

    const paths = jobPaths(jobDir);
    const events = new EventLog(paths.eventsFile).read();
    expect(parseWhpProgress(events).map(({ id, status }) => ({ id, status })))
      .toEqual(WHP_PROGRESS_IDS.map((id) => ({ id, status: 'done' })));

    const histories = new Map<string, string[]>();
    for (const event of events) {
      const item = event.parsed?.item;
      if (!item || typeof item !== 'object') continue;
      const message = item as Record<string, unknown>;
      if (
        message.type !== 'agent_message'
        || typeof message.text !== 'string'
      ) {
        continue;
      }
      for (const line of message.text.split(/\r?\n/)) {
        const match = /^WHP_PROGRESS\/2 (\S+) (\S+) :: /.exec(line);
        if (!match) continue;
        const [, id, status] = match;
        histories.set(id!, [...(histories.get(id!) ?? []), status!]);
      }
    }
    for (const id of WHP_PROGRESS_IDS) {
      expect(histories.get(id), id).toEqual(['pending', 'active', 'done']);
    }

    const reportMd = readFileSync(paths.finalMessageFile, 'utf8');
    const extracted = extractTopicSummary(reportMd);
    expect(extracted.summaryError).toBeNull();
    expect(extracted.summary).not.toBeNull();
    expect(extracted.summary!.candidates[0]!.gates).toHaveLength(6);
    expect(Object.keys(extracted.summary!.shortlist[0]!.scores)).toHaveLength(7);
    expect(extracted.summary!.packages).toHaveLength(9);
    expect(new Set(extracted.summary!.packages.map((row) => row.finalist)))
      .toEqual(new Set(
        extracted.summary!.shortlist.slice(0, 3).map((row) => row.subject),
      ));
    expect(extracted.summary!.winner).toMatchObject({
      decision_status: 'winner-selected',
      subject: expect.any(String),
    });
  }, 10_000);

  it('marks failed with unavailable usage in no-usage + nonzero-exit conditions', async () => {
    const jobDir = makeJobDir({});
    await runRunner(jobDir, 'no-usage');
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(status.state).toBe('completed'); // exit 0; usage simply absent
    expect(status.usage).toBeUndefined();
  });

  it('surfaces turn.failed distinctly with its error message', async () => {
    const jobDir = makeJobDir({});
    await runRunner(jobDir, 'turn-failed');
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(status.state).toBe('failed');
    expect(status.errorMessage).toContain('invalid_json_schema');
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
