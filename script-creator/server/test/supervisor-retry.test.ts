import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JobStore } from '../src/job-store.js';
import { validateAgainstSchema } from '../src/schema-validate.js';
import { JobSupervisor } from '../src/supervisor.js';

const FAKE = `${process.execPath} ${join(import.meta.dirname, 'fake-codex.mjs')}`;
const SCHEMA = {
  type: 'object', required: ['status', 'message_markdown'], additionalProperties: false,
  properties: { status: { enum: ['complete', 'narrowed', 'declined'] }, message_markdown: { type: 'string' } },
};

let sup: JobSupervisor;
afterEach(() => sup?.stop());

describe('validateAgainstSchema', () => {
  it('accepts conforming JSON and rejects non-conforming', () => {
    expect(validateAgainstSchema(SCHEMA, '{"status":"complete","message_markdown":"x"}').ok).toBe(true);
    expect(validateAgainstSchema(SCHEMA, '{"unexpected":true}').ok).toBe(false);
    expect(validateAgainstSchema(SCHEMA, 'not json').ok).toBe(false);
  });
});

describe('retry-once on invalid output', () => {
  it('retries a bad-schema job exactly once, then stops', async () => {
    const root = mkdtempSync(join(tmpdir(), 'retry-'));
    sup = new JobSupervisor({
      store: new JobStore(join(root, 'state.sqlite3')), jobsRoot: join(root, 'jobs'),
      pollMs: 50, env: { FAKE_CODEX_MODE: 'bad-schema-output' },
    });
    const id = sup.enqueue({
      prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE, outputSchema: SCHEMA,
    });
    const rec = await sup.waitForTerminal(id, 30000);
    expect(rec.state).toBe('invalid-output');
    // one retry was spawned, linked, and also ended invalid with no third attempt
    const retry = sup.store.jobsRetriedFrom(id);
    expect(retry).toHaveLength(1);
    const retryRec = await sup.waitForTerminal(retry[0]!.id, 30000);
    expect(retryRec.state).toBe('invalid-output');
    expect(sup.store.jobsRetriedFrom(retry[0]!.id)).toHaveLength(0);
  });
});
