import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

if (process.env.RUN_REAL_CODEX !== '1') {
  console.log('SKIP: set RUN_REAL_CODEX=1 to run the daemon spike');
  process.exit(0);
}

const SERVER_DIR = resolve(import.meta.dirname, '..');
const ROOT = mkdtempSync(join(tmpdir(), 'daemon-e2e-'));
const ENV = {
  ...process.env,
  XDG_DATA_HOME: join(ROOT, 'data'),
  XDG_STATE_HOME: join(ROOT, 'state'),
};

const results: Array<[string, boolean, string?]> = [];
const check = (name: string, ok: boolean, note?: string) => {
  results.push([name, ok, note]);
  console.log(`${ok ? 'VERIFIED' : 'FAILED '} — ${name}${note ? ` (${note})` : ''}`);
};

function findRuntimeFile(): string | null {
  const base = join(ENV.XDG_STATE_HOME!, 'whp-script-creator');
  if (!existsSync(base)) return null;
  for (const dir of readdirSync(base)) {
    const f = join(base, dir, 'daemon.json');
    if (existsSync(f)) return f;
  }
  return null;
}

interface Handshake { port: number; nonce: string; pid: number }

async function bootDaemon(): Promise<{ child: ChildProcess; hs: Handshake }> {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/daemon.ts'], {
    cwd: SERVER_DIR, env: ENV, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', () => {});
  child.stderr?.on('data', (d: Buffer) => process.stderr.write(`[daemon] ${d}`));
  const deadline = Date.now() + 30_000;
  for (;;) {
    const f = findRuntimeFile();
    if (f) {
      try {
        const hs = JSON.parse(readFileSync(f, 'utf8')) as Handshake;
        if (hs.pid === child.pid) return { child, hs };
      } catch { /* partial write; retry */ }
    }
    if (Date.now() > deadline) throw new Error('daemon did not publish runtime handshake');
    await new Promise((r) => setTimeout(r, 200));
  }
}

const api = (hs: Handshake) => ({
  async post(path: string, body: unknown): Promise<{ status: number; json: any }> {
    const res = await fetch(`http://127.0.0.1:${hs.port}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sc-nonce': hs.nonce },
      body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  },
  async get(path: string): Promise<{ status: number; json: any }> {
    const res = await fetch(`http://127.0.0.1:${hs.port}${path}`, {
      headers: { 'x-sc-nonce': hs.nonce },
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  },
  async sse(path: string, opts: { lastEventId?: string; collectMs: number }): Promise<Array<{ id: string; data: string; event: string }>> {
    const headers: Record<string, string> = { 'x-sc-nonce': hs.nonce };
    if (opts.lastEventId) headers['last-event-id'] = opts.lastEventId;
    const res = await fetch(`http://127.0.0.1:${hs.port}${path}`, { headers });
    if (!res.ok || !res.body) throw new Error(`sse status ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const events: Array<{ id: string; data: string; event: string }> = [];
    let buffer = '';
    const stop = Date.now() + opts.collectMs;
    for (;;) {
      const race = await Promise.race([
        reader.read(),
        new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), Math.max(0, stop - Date.now()))),
      ]);
      if (race === 'timeout') { await reader.cancel().catch(() => {}); break; }
      const { done, value } = race;
      if (value) buffer += decoder.decode(value, { stream: true });
      let sep;
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, sep); buffer = buffer.slice(sep + 2);
        const ev = { id: '', data: '', event: 'message' };
        for (const line of chunk.split('\n')) {
          if (line.startsWith('id:')) ev.id = line.slice(3).trim();
          if (line.startsWith('event:')) ev.event = line.slice(6).trim();
          if (line.startsWith('data:')) ev.data += line.slice(5).trim();
        }
        if (ev.id || ev.data || ev.event !== 'message') events.push(ev);
        if (ev.event === 'done') { await reader.cancel().catch(() => {}); return events; }
      }
      if (done) break;
    }
    return events;
  },
});

const REWRITE_INPUTS = {
  topic_brief: null,
  approved_lessons: [],
  selection: 'Golf is just a walk ruined by arithmetic.',
  surrounding_context: { before: 'We make simple things harder on purpose.', after: 'That choice has a name.' },
  narrative_job: 'Sharpen the joke without changing the claim.',
  creative_status: { phase: 'rapid-prototype' },
  requested_scope: 'Replace only the selection; at most 20 spoken words.',
};

async function waitTerminal(a: ReturnType<typeof api>, id: string, timeoutMs: number): Promise<any> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const { json } = await a.get(`/api/ops/${id}`);
    if (json && !['queued', 'running', 'cancelling'].includes(json.state)) return json;
    if (Date.now() > end) throw new Error(`timeout waiting for op ${id}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

let { child, hs } = await bootDaemon();
let a = api(hs);

// 1. Real rewrite over HTTP with SSE, then restart mid-op and reconnect.
const submit = await a.post('/api/ops', { operation: 'rewrite-selection', inputs: REWRITE_INPUTS });
check('submit accepted', submit.status === 200 && typeof submit.json?.id === 'string', `status ${submit.status}`);
const opId = submit.json.id as string;

const firstEvents = await a.sse(`/api/ops/${opId}/events`, { collectMs: 6000 });
const lastId = firstEvents.filter((e) => e.id).at(-1)?.id;
check('SSE streamed initial events', firstEvents.length > 0 && !!lastId, `${firstEvents.length} events, lastId ${lastId}`);

child.kill('SIGKILL');
await new Promise((r) => setTimeout(r, 500));
({ child, hs } = await bootDaemon());
a = api(hs);
check('daemon restarted with fresh handshake', hs.port > 0 && hs.nonce.length >= 16);

const tail = await a.sse(`/api/ops/${opId}/events`, { lastEventId: lastId, collectMs: 20 * 60_000 });
const tailIds = tail.filter((e) => e.id).map((e) => Number(e.id));
check('SSE reconnect resumes after Last-Event-ID', tailIds.length === 0 || tailIds[0]! > Number(lastId), `first tail id ${tailIds[0]}`);

const rec = await waitTerminal(a, opId, 20 * 60_000);
check('op survived daemon restart to completion', rec.state === 'completed', rec.state);
const result = await a.get(`/api/ops/${opId}/result`);
check('schema-valid rewrite result', result.json?.kind === 'schema' && typeof result.json?.value?.replacement_markdown === 'string',
  JSON.stringify(result.json?.value?.status));
check('tokens on record', rec.usageAvailable === 1 && rec.inputTokens > 0,
  `in=${rec.inputTokens} out=${rec.outputTokens} reasoning=${rec.reasoningOutputTokens}`);

// 2. Quick gate-check.
const gate = await a.post('/api/ops', { operation: 'quick-gate-check', inputs: {
  idea: 'Why speedrunners understand games better than their designers',
  known_evidence: null, production_constraints: 'solo presenter, no budget', episode_state: null,
  requested_scope: 'gate check only',
} });
const gateRec = await waitTerminal(a, gate.json.id, 20 * 60_000);
const gateResult = await a.get(`/api/ops/${gate.json.id}/result`);
check('gate-check six gates', gateResult.json?.kind === 'schema' && gateResult.json?.value?.gates?.length === 6,
  `verdict ${gateResult.json?.value?.verdict}`);

// 3. Cancel over HTTP.
const c = await a.post('/api/ops', { operation: 'rewrite-selection', inputs: REWRITE_INPUTS });
await new Promise((r) => setTimeout(r, 5000));
const cancelRes = await a.post(`/api/ops/${c.json.id}/cancel`, {});
check('cancel accepted', cancelRes.status === 200, `status ${cancelRes.status}`);
const cRec = await waitTerminal(a, c.json.id, 120_000);
const cEvents = await a.get(`/api/ops/${c.json.id}`);
check('cancelled with events preserved', cRec.state === 'cancelled', cRec.state);

child.kill('SIGTERM');
const failed = results.filter(([, ok]) => !ok);
console.log(failed.length === 0 ? '\nPLAN 3 E2E: ALL CHECKS VERIFIED' : `\nPLAN 3 E2E: ${failed.length} CHECK(S) FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
