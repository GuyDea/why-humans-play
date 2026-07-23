import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { REVIEW_SCHEMA } from '../src/operations/schemas.js';

const run = promisify(execFile);
const FAKE = join(import.meta.dirname, 'fake-codex.mjs');

describe('fake codex', () => {
  it('replays the plain fixture and honors -o', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fake-'));
    const out = join(dir, 'final.txt');
    const { stdout } = await run(process.execPath, [FAKE, 'exec', '--json', '-o', out, '-'], {
      env: { ...process.env, FAKE_CODEX_MODE: 'happy' },
    });
    const lines = stdout.trim().split('\n').map((l) => JSON.parse(l));
    expect(lines[0].type).toBe('thread.started');
    expect(lines.at(-1).type).toBe('turn.completed');
    expect(lines.at(-1).usage.input_tokens).toBeGreaterThan(0);
    expect(readFileSync(out, 'utf8')).toBe('OK');
  });

  it('emits the resumed thread id on exec resume', async () => {
    const { stdout } = await run(process.execPath, [FAKE, 'exec', 'resume', 'tid-9', '--json', '-'], {
      env: { ...process.env, FAKE_CODEX_MODE: 'happy' },
    });
    expect(JSON.parse(stdout.trim().split('\n')[0]!).thread_id).toBe('tid-9');
  });

  it('omits usage in no-usage mode', async () => {
    const { stdout } = await run(process.execPath, [FAKE, 'exec', '--json', '-'], {
      env: { ...process.env, FAKE_CODEX_MODE: 'no-usage' },
    });
    const last = JSON.parse(stdout.trim().split('\n').at(-1)!);
    expect(last.type).toBe('turn.completed');
    expect(last.usage).toBeUndefined();
  });

  it('synthesizes a conforming review result from the output schema', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fake-review-'));
    const schema = join(dir, 'review.schema.json');
    const out = join(dir, 'final.json');
    writeFileSync(schema, JSON.stringify(REVIEW_SCHEMA));

    await run(process.execPath, [
      FAKE,
      'exec',
      '--json',
      '--output-schema',
      schema,
      '-o',
      out,
      '-',
    ], {
      env: { ...process.env, FAKE_CODEX_MODE: 'operation-schema' },
    });

    expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual({
      status: 'complete',
      findings: [{
        anchor: 'Fake anchor.',
        severity: 'blocking',
        finding_markdown: 'Fake finding_markdown.',
        optional_direction_markdown: null,
      }],
      guardrail_markdown: null,
    });
  });
});
