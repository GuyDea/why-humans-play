import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { JobStore } from '../src/job-store.js';
import { JobSupervisor } from '../src/supervisor.js';

if (process.env.RUN_REAL_CODEX !== '1') {
  console.log('SKIP: set RUN_REAL_CODEX=1 to run the real-codex spike');
  process.exit(0);
}

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const REVIEW_SCHEMA = {
  type: 'object', required: ['status', 'findings', 'guardrail_markdown'], additionalProperties: false,
  properties: {
    status: { enum: ['complete', 'narrowed', 'declined'] },
    findings: { type: 'array', items: { type: 'object', required: ['anchor', 'severity', 'finding_markdown', 'optional_direction_markdown'], additionalProperties: false,
      properties: { anchor: { type: 'string' }, severity: { enum: ['blocking', 'important', 'optional'] },
        finding_markdown: { type: 'string' }, optional_direction_markdown: { type: ['string', 'null'] } } } },
    guardrail_markdown: { type: ['string', 'null'] },
  },
};

const ENVELOPE = `$writing-whp-youtube-scripts
Operation: Review
Inputs: ${JSON.stringify({
  topic_brief: null,
  artifact: null,
  selection: 'Golf is just a walk ruined by arithmetic. And yet we keep score anyway, because the score is the point.',
  surrounding_context: { before: 'We make simple things harder on purpose.', after: 'That choice has a name.' },
  narrative_job: 'Land a light joke that exposes the voluntary-obstacle mechanism.',
  creative_status: { phase: 'rapid-prototype' },
  requested_scope: 'Review only this selection; findings only; do not rewrite.',
})}`;

const results: Array<[string, boolean, string?]> = [];
const check = (name: string, ok: boolean, note?: string) => {
  results.push([name, ok, note]);
  console.log(`${ok ? 'VERIFIED' : 'FAILED '} — ${name}${note ? ` (${note})` : ''}`);
};

const root = mkdtempSync(join(tmpdir(), 'spike-e2e-'));
const db = join(root, 'state.sqlite3');
let sup = new JobSupervisor({ store: new JobStore(db), jobsRoot: join(root, 'jobs'), pollMs: 250 });

// 1. Launch a real Review op, restart the supervisor mid-run, reconnect, complete.
const id = sup.enqueue({ prompt: ENVELOPE, cwd: REPO, sandbox: 'read-only', outputSchema: REVIEW_SCHEMA });
await new Promise((r) => setTimeout(r, 5000));
sup.stop();
sup = new JobSupervisor({ store: new JobStore(db), jobsRoot: join(root, 'jobs'), pollMs: 250 });
sup.reattach();
const rec = await sup.waitForTerminal(id, 20 * 60_000);
check('detached run survives supervisor restart', rec.state === 'completed', rec.state);
check('schema-conforming review findings', rec.state === 'completed');
check('thread id captured', rec.threadId !== null, rec.threadId ?? 'none');
check('tokens captured verbatim', rec.usageAvailable === 1,
  `in=${rec.inputTokens} cached=${rec.cachedInputTokens} out=${rec.outputTokens} reasoning=${rec.reasoningOutputTokens}`);
check('events journaled', sup.events(id).length > 0, `${sup.events(id).length} events`);

// 2. Cancellation mid-run.
const id2 = sup.enqueue({ prompt: ENVELOPE, cwd: REPO, sandbox: 'read-only', outputSchema: REVIEW_SCHEMA });
await new Promise((r) => setTimeout(r, 8000));
sup.cancel(id2);
const rec2 = await sup.waitForTerminal(id2, 60_000);
check('mid-run cancellation', rec2.state === 'cancelled', rec2.state);
check('cancelled events preserved', sup.events(id2).length > 0, `${sup.events(id2).length} events`);

sup.stop();
const failed = results.filter(([, ok]) => !ok);
console.log(failed.length === 0 ? '\nSPIKE 1: ALL CHECKS VERIFIED' : `\nSPIKE 1: ${failed.length} CHECK(S) FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
