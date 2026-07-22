# Script Creator — Spike 1: Transport Durability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the codex CLI can serve as Script Creator's durable job transport: detached runners that survive daemon restarts, reconnectable event streams, cancellation with escalation, schema-enforced outputs, session resume, and verbatim token capture.

**Architecture:** A detached runner process per job owns one `codex exec --json` child and journals every JSONL event to an append-only log with an atomically updated status file; a `JobSupervisor` (no HTTP yet) launches runners, tails their logs into a SQLite `JobStore`, and implements reattach, FIFO, cancel, schema validation with retry-once, and resume. Deterministic tests run against a fixture-driven fake codex; one env-gated E2E script verifies against the real CLI.

**Tech Stack:** Node 24, TypeScript strict ESM, vitest, better-sqlite3 (WAL), ajv, tsx. No frontend, no Fastify in this spike.

## Global Constraints

- Plan sequence context: this is Plan 1 of the V1 sequence from
  [the technical design](../specs/2026-07-22-script-creator-technical-design.md); Spike 2
  (editor range identity) and feature phases follow in later plans.
- All work on branch `script-creator-requirements`; commit after every task with scope
  `script-creator`.
- App code lives in `script-creator/server/` (design: app location `script-creator/`).
- Verified codex CLI facts (v0.144.5) — the fake codex and all parsers MUST match:
  - Events: `{"type":"thread.started","thread_id":"<uuid>"}`, `{"type":"turn.started"}`,
    `{"type":"item.completed","item":{"id":"item_N","type":"agent_message"|"error"|…,"text":…,"message":…}}`,
    `{"type":"turn.completed","usage":{"input_tokens":N,"cached_input_tokens":N,"output_tokens":N,"reasoning_output_tokens":N}}`.
  - `error` items can be non-fatal (e.g. skills-context warnings) — never treat one as terminal.
  - `--output-schema <file>` makes the final `agent_message` text the conforming JSON; `-o <file>` receives exactly that text.
  - Resume: `codex exec resume <thread_id> [PROMPT]`; thread id comes from `thread.started`.
- Tokens are persisted verbatim from `turn.completed.usage` (all four fields) or recorded
  as unavailable — never estimated (design: Failure policy and telemetry).
- One codex job runs at a time (FIFO); cancellation is SIGINT → grace → SIGKILL with
  events preserved and nothing auto-applied.
- Envelope prompts carry zero editorial instruction (not exercised here beyond payload
  passthrough — the E2E task uses a real skill operation envelope verbatim).
- Tests never call the real codex; only `e2e/real-codex-spike.ts` does, gated behind
  `RUN_REAL_CODEX=1`.

## File Structure

```text
script-creator/server/
  package.json / tsconfig.json / vitest.config.ts
  src/types.ts           — JobEnvelope, RunnerStatus, CodexEvent, JobRecord types
  src/codex-args.ts      — buildCodexArgs(envelope, paths) → argv array (pure)
  src/event-log.ts       — EventLog: append(raw), read(fromSeq), size()
  src/runner-status.ts   — readStatus/writeStatus (atomic tmp+rename)
  src/runner.ts          — detached runner entrypoint (argv: <jobDir>)
  src/job-store.ts       — JobStore over better-sqlite3 (jobs table, WAL)
  src/schema-validate.ts — validateAgainstSchema(schema, text)
  src/supervisor.ts      — JobSupervisor: enqueue/watch/reattach/cancel/resume/waitForTerminal
  test/fake-codex.mjs    — fixture-replaying fake codex with failure modes
  test/fixtures/events-plain.jsonl / events-schema.jsonl (captured real streams)
  test/*.test.ts         — per-module tests (paths in tasks)
  e2e/real-codex-spike.ts — env-gated real-CLI verification
```

---

### Task 1: Package scaffold and captured fixtures

**Files:**
- Create: `script-creator/server/package.json`
- Create: `script-creator/server/tsconfig.json`
- Create: `script-creator/server/vitest.config.ts`
- Create: `script-creator/server/test/fixtures/events-plain.jsonl`
- Create: `script-creator/server/test/fixtures/events-schema.jsonl`
- Create: `script-creator/server/.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: a workspace where `npx vitest run` executes; fixtures every later task's
  fake codex replays.

- [ ] **Step 1: Create the package files**

`script-creator/server/package.json`:

```json
{
  "name": "@whp/script-creator-server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "spike:e2e": "tsx e2e/real-codex-spike.ts"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  },
  "dependencies": {
    "ajv": "^8.17.0",
    "better-sqlite3": "^12.0.0"
  }
}
```

`script-creator/server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "test", "e2e"]
}
```

`script-creator/server/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'], testTimeout: 20000, hookTimeout: 20000 },
});
```

`script-creator/server/.gitignore`:

```text
node_modules/
dist/
```

- [ ] **Step 2: Install dependencies**

Run: `cd script-creator/server && npm install`
Expected: lockfile created, no errors (better-sqlite3 builds natively on Node 24).

- [ ] **Step 3: Capture the two real fixtures**

Run (each completes in under two minutes):

```bash
cd script-creator/server
codex exec --json "Reply with exactly: OK" > test/fixtures/events-plain.jsonl
printf '{"type":"object","required":["status","message_markdown"],"additionalProperties":false,"properties":{"status":{"enum":["complete","narrowed","declined"]},"message_markdown":{"type":"string"}}}' > /tmp/spike-schema.json
codex exec --json --output-schema /tmp/spike-schema.json "Report a complete status with the message: schema transport works" > test/fixtures/events-schema.jsonl
```

Expected: `events-plain.jsonl` contains 4–6 lines beginning with a `thread.started` line
and ending with a `turn.completed` line carrying a `usage` object; `events-schema.jsonl`
ends with `turn.completed` and its last `agent_message` item's `text` is a JSON string
with `status` and `message_markdown` fields. (These were already captured once during
design verification; recapture pins them in-repo.)

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run: `npx vitest run`
Expected: "No test files found" exit path — command exits without crash.

- [ ] **Step 5: Commit**

```bash
git add script-creator/server
git commit -m "feat(script-creator): scaffold transport spike package with codex fixtures"
```

### Task 2: Types and codex argv builder

**Files:**
- Create: `script-creator/server/src/types.ts`
- Create: `script-creator/server/src/codex-args.ts`
- Test: `script-creator/server/test/codex-args.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `JobEnvelope`, `RunnerStatus`, `RunnerUsage`, `CodexEvent`, `JobState`,
  `JobRecord` types; `buildCodexArgs(envelope: JobEnvelope, paths: RunnerPaths): string[]`.

- [ ] **Step 1: Write the types (no test — types only)**

`script-creator/server/src/types.ts`:

```ts
export interface JobEnvelope {
  jobId: string;
  prompt: string;
  cwd: string;
  sandbox: 'read-only' | 'workspace-write';
  outputSchema?: Record<string, unknown>;
  resumeThreadId?: string;
  codexBin?: string;   // test override; default 'codex'
  graceMs?: number;    // cancel escalation grace; default 5000
}

export interface RunnerPaths {
  jobDir: string;
  eventsFile: string;      // <jobDir>/events.jsonl
  statusFile: string;      // <jobDir>/status.json
  finalMessageFile: string; // <jobDir>/final-message.txt
  schemaFile: string;      // <jobDir>/schema.json (written only when outputSchema set)
}

export interface RunnerUsage {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens?: number;
}

export type RunnerState = 'running' | 'completed' | 'failed' | 'cancelled';

export interface RunnerStatus {
  state: RunnerState;
  pid: number;
  pgid: number;
  threadId?: string;
  exitCode?: number;
  startedAt: string;
  finishedAt?: string;
  usage?: RunnerUsage;        // absent → persist as unavailable
  errorMessage?: string;
}

export interface CodexEvent {
  seq: number;
  raw: string;
  parsed?: { type: string } & Record<string, unknown>;
}

export type JobState =
  | 'queued' | 'running' | 'interrupted' | 'cancelling' | 'cancelled'
  | 'completed' | 'failed' | 'invalid-output';

export interface JobRecord {
  id: string;
  state: JobState;
  envelopeJson: string;
  jobDir: string;
  threadId: string | null;
  retryOf: string | null;
  resumedFrom: string | null;
  createdAt: string;
  finishedAt: string | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningOutputTokens: number | null;
  usageAvailable: 0 | 1;
  error: string | null;
}
```

- [ ] **Step 2: Write the failing argv-builder test**

`script-creator/server/test/codex-args.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCodexArgs } from '../src/codex-args.js';
import type { JobEnvelope, RunnerPaths } from '../src/types.js';

const paths: RunnerPaths = {
  jobDir: '/tmp/j', eventsFile: '/tmp/j/events.jsonl', statusFile: '/tmp/j/status.json',
  finalMessageFile: '/tmp/j/final-message.txt', schemaFile: '/tmp/j/schema.json',
};

const base: JobEnvelope = {
  jobId: 'job1', prompt: 'P', cwd: '/repo', sandbox: 'read-only',
};

describe('buildCodexArgs', () => {
  it('builds a one-shot read-only exec reading stdin', () => {
    expect(buildCodexArgs(base, paths)).toEqual([
      'exec', '--json', '-C', '/repo', '-s', 'read-only',
      '-o', '/tmp/j/final-message.txt', '-',
    ]);
  });

  it('adds --output-schema when a schema is present', () => {
    const args = buildCodexArgs({ ...base, outputSchema: { type: 'object' } }, paths);
    expect(args).toContain('--output-schema');
    expect(args[args.indexOf('--output-schema') + 1]).toBe('/tmp/j/schema.json');
    expect(args[args.length - 1]).toBe('-');
  });

  it('builds a resume invocation with the thread id before flags', () => {
    const args = buildCodexArgs({ ...base, resumeThreadId: 'abc-123' }, paths);
    expect(args.slice(0, 3)).toEqual(['exec', 'resume', 'abc-123']);
    expect(args).toContain('--json');
    expect(args[args.length - 1]).toBe('-');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run test/codex-args.test.ts`
Expected: FAIL — cannot find module `../src/codex-args.js`.

- [ ] **Step 4: Implement the builder**

`script-creator/server/src/codex-args.ts`:

```ts
import type { JobEnvelope, RunnerPaths } from './types.js';

export function buildCodexArgs(env: JobEnvelope, paths: RunnerPaths): string[] {
  const args = env.resumeThreadId
    ? ['exec', 'resume', env.resumeThreadId]
    : ['exec'];
  args.push('--json', '-C', env.cwd, '-s', env.sandbox, '-o', paths.finalMessageFile);
  if (env.outputSchema) args.push('--output-schema', paths.schemaFile);
  args.push('-');
  return args;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run test/codex-args.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/codex-args.ts test/codex-args.test.ts
git commit -m "feat(script-creator): add transport types and codex argv builder"
```

### Task 3: Fixture-driven fake codex

**Files:**
- Create: `script-creator/server/test/fake-codex.mjs`
- Test: `script-creator/server/test/fake-codex.test.ts`

**Interfaces:**
- Consumes: `test/fixtures/events-plain.jsonl`, `test/fixtures/events-schema.jsonl`.
- Produces: an executable Node script used as `codexBin` in every later test. Modes via
  env `FAKE_CODEX_MODE`: `happy` (default), `slow`, `ignore-sigint`, `malformed-json`,
  `no-usage`, `bad-schema-output`, `hang`. Behavior contract: reads stdin fully; replays
  fixture events line by line to stdout; honors `-o <file>` by writing the final
  agent_message text; on `exec resume <id>` argv, emits `thread.started` with that id
  then completes; `ignore-sigint` traps SIGINT and keeps running (killable only by
  SIGKILL); `hang` emits the first two events then sleeps forever.

- [ ] **Step 1: Write the failing test**

`script-creator/server/test/fake-codex.test.ts`:

```ts
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/fake-codex.test.ts`
Expected: FAIL — fake-codex.mjs does not exist.

- [ ] **Step 3: Implement the fake**

`script-creator/server/test/fake-codex.mjs`:

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const mode = process.env.FAKE_CODEX_MODE ?? 'happy';
const argv = process.argv.slice(2);
const oIdx = argv.indexOf('-o');
const outFile = oIdx >= 0 ? argv[oIdx + 1] : null;
const resumeIdx = argv.indexOf('resume');
const resumeId = resumeIdx >= 0 ? argv[resumeIdx + 1] : null;
const schemaIdx = argv.indexOf('--output-schema');
const hasSchema = schemaIdx >= 0;

const fixture = join(import.meta.dirname, 'fixtures',
  hasSchema ? 'events-schema.jsonl' : 'events-plain.jsonl');
let lines = readFileSync(fixture, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

if (resumeId) lines = lines.map((e) => e.type === 'thread.started' ? { ...e, thread_id: resumeId } : e);
if (mode === 'no-usage') lines = lines.map((e) => e.type === 'turn.completed' ? { type: 'turn.completed' } : e);
if (mode === 'bad-schema-output') {
  lines = lines.map((e) =>
    e.type === 'item.completed' && e.item?.type === 'agent_message'
      ? { ...e, item: { ...e.item, text: '{"unexpected":true}' } } : e);
}

let stdinData = '';
process.stdin.on('data', (c) => { stdinData += c; });

const finalText = () => {
  const msgs = lines.filter((e) => e.type === 'item.completed' && e.item?.type === 'agent_message');
  return msgs.length ? msgs[msgs.length - 1].item.text : '';
};

process.stdin.on('end', async () => {
  if (stdinData.length === 0) { process.stderr.write('no stdin\n'); process.exit(2); }
  if (mode === 'ignore-sigint') process.on('SIGINT', () => {});
  const delay = mode === 'slow' ? 400 : 10;
  let emitted = 0;
  for (const e of lines) {
    process.stdout.write(JSON.stringify(e) + '\n');
    emitted += 1;
    if (mode === 'malformed-json' && emitted === 2) process.stdout.write('{broken\n');
    if (mode === 'hang' && emitted === 2) { await new Promise(() => {}); }
    await new Promise((r) => setTimeout(r, delay));
    if (mode === 'ignore-sigint' && emitted === 2) {
      await new Promise((r) => setTimeout(r, 60_000)); // survives SIGINT; SIGKILL only
    }
  }
  if (outFile) writeFileSync(outFile, finalText());
  process.exit(0);
});
process.stdin.resume();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/fake-codex.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add test/fake-codex.mjs test/fake-codex.test.ts
git commit -m "test(script-creator): add fixture-driven fake codex with failure modes"
```

### Task 4: Append-only event log

**Files:**
- Create: `script-creator/server/src/event-log.ts`
- Test: `script-creator/server/test/event-log.test.ts`

**Interfaces:**
- Consumes: `CodexEvent` from `src/types.ts`.
- Produces: `class EventLog { constructor(file: string); append(raw: string): void;
  read(fromSeq?: number): CodexEvent[]; count(): number }` — `seq` is 1-based line
  number; `parsed` is undefined for malformed JSON lines (they are preserved raw).

- [ ] **Step 1: Write the failing test**

`script-creator/server/test/event-log.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/event-log.test.ts`
Expected: FAIL — cannot find module `../src/event-log.js`.

- [ ] **Step 3: Implement**

`script-creator/server/src/event-log.ts`:

```ts
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import type { CodexEvent } from './types.js';

export class EventLog {
  constructor(private readonly file: string) {}

  append(raw: string): void {
    appendFileSync(this.file, raw.endsWith('\n') ? raw : raw + '\n');
  }

  read(fromSeq = 0): CodexEvent[] {
    if (!existsSync(this.file)) return [];
    const lines = readFileSync(this.file, 'utf8').split('\n').filter((l) => l.length > 0);
    return lines.map((rawLine, i): CodexEvent => {
      let parsed: CodexEvent['parsed'];
      try {
        const p = JSON.parse(rawLine);
        if (p && typeof p.type === 'string') parsed = p;
      } catch { /* malformed lines stay raw */ }
      return { seq: i + 1, raw: rawLine, parsed };
    }).filter((e) => e.seq > fromSeq);
  }

  count(): number {
    return this.read().length;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/event-log.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/event-log.ts test/event-log.test.ts
git commit -m "feat(script-creator): add append-only event log with incremental reads"
```

### Task 5: Atomic runner status file

**Files:**
- Create: `script-creator/server/src/runner-status.ts`
- Test: `script-creator/server/test/runner-status.test.ts`

**Interfaces:**
- Consumes: `RunnerStatus` from `src/types.ts`.
- Produces: `writeStatus(file: string, status: RunnerStatus): void` (tmp+rename atomic),
  `readStatus(file: string): RunnerStatus | null` (null when missing or unparsable),
  `jobPaths(jobDir: string): RunnerPaths`.

- [ ] **Step 1: Write the failing test**

`script-creator/server/test/runner-status.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/runner-status.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`script-creator/server/src/runner-status.ts`:

```ts
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RunnerPaths, RunnerStatus } from './types.js';

export function jobPaths(jobDir: string): RunnerPaths {
  return {
    jobDir,
    eventsFile: join(jobDir, 'events.jsonl'),
    statusFile: join(jobDir, 'status.json'),
    finalMessageFile: join(jobDir, 'final-message.txt'),
    schemaFile: join(jobDir, 'schema.json'),
  };
}

export function writeStatus(file: string, status: RunnerStatus): void {
  const tmp = file + '.tmp';
  writeFileSync(tmp, JSON.stringify(status, null, 2));
  renameSync(tmp, file);
}

export function readStatus(file: string): RunnerStatus | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as RunnerStatus;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/runner-status.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/runner-status.ts test/runner-status.test.ts
git commit -m "feat(script-creator): add atomic runner status file"
```

### Task 6: Runner happy path

**Files:**
- Create: `script-creator/server/src/runner.ts`
- Test: `script-creator/server/test/runner.test.ts`

**Interfaces:**
- Consumes: `buildCodexArgs`, `EventLog`, `jobPaths`/`writeStatus`/`readStatus`, types.
- Produces: runner entrypoint contract used by the supervisor: invoked as
  `tsx src/runner.ts <jobDir>` where `<jobDir>/envelope.json` holds a `JobEnvelope`.
  Lifecycle: writes `status.json` `running` (pid/pgid/startedAt) → spawns
  `env.codexBin ?? 'codex'` with built argv → pipes `envelope.prompt` to stdin → appends
  every stdout line to `events.jsonl` → records `threadId` when `thread.started` arrives
  → on child exit writes terminal status: `completed` (exit 0, with `usage` from
  `turn.completed` if present) or `failed` (nonzero, `errorMessage`). SIGINT handling is
  Task 8's scope (cancellation) but the trap is installed here.

- [ ] **Step 1: Write the failing test**

`script-creator/server/test/runner.test.ts`:

```ts
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EventLog } from '../src/event-log.js';
import { jobPaths, readStatus } from '../src/runner-status.js';
import type { JobEnvelope } from '../src/types.js';

const TSX = join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx');
const RUNNER = join(import.meta.dirname, '..', 'src', 'runner.ts');
const FAKE = join(import.meta.dirname, 'fake-codex.mjs');

export function makeJobDir(envelope: Partial<JobEnvelope>): string {
  const jobDir = mkdtempSync(join(tmpdir(), 'job-'));
  const env: JobEnvelope = {
    jobId: 'j1', prompt: 'payload', cwd: jobDir, sandbox: 'read-only',
    codexBin: `${process.execPath} ${FAKE}`, ...envelope,
  };
  writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(env));
  return jobDir;
}

export function runRunner(jobDir: string, mode = 'happy'): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(TSX, [RUNNER, jobDir], {
      env: { ...process.env, FAKE_CODEX_MODE: mode },
      stdio: 'ignore',
    });
    child.on('exit', (code) => resolve(code ?? -1));
  });
}

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
    expect(status.usage!.input_tokens).toBeGreaterThan(0);
    expect(readFileSync(p.finalMessageFile, 'utf8')).toBe('OK');
  });

  it('marks failed with unavailable usage in no-usage + nonzero-exit conditions', async () => {
    const jobDir = makeJobDir({}, 'no-usage');
    await runRunner(jobDir, 'no-usage');
    const status = readStatus(jobPaths(jobDir).statusFile)!;
    expect(status.state).toBe('completed'); // exit 0; usage simply absent
    expect(status.usage).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/runner.test.ts`
Expected: FAIL — `src/runner.ts` does not exist (spawn exits nonzero).

- [ ] **Step 3: Implement the runner**

`script-creator/server/src/runner.ts`:

```ts
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { buildCodexArgs } from './codex-args.js';
import { EventLog } from './event-log.js';
import { jobPaths, readStatus, writeStatus } from './runner-status.js';
import type { JobEnvelope, RunnerStatus, RunnerUsage } from './types.js';

const jobDir = process.argv[2];
if (!jobDir) { console.error('usage: runner <jobDir>'); process.exit(2); }

const envelope = JSON.parse(readFileSync(`${jobDir}/envelope.json`, 'utf8')) as JobEnvelope;
const paths = jobPaths(jobDir);
const log = new EventLog(paths.eventsFile);

if (envelope.outputSchema) writeFileSync(paths.schemaFile, JSON.stringify(envelope.outputSchema));

const [bin, ...binPre] = (envelope.codexBin ?? 'codex').split(' ');
const args = [...binPre, ...buildCodexArgs(envelope, paths)];

const status: RunnerStatus = {
  state: 'running', pid: process.pid, pgid: process.pid,
  startedAt: new Date().toISOString(),
};
writeStatus(paths.statusFile, status);

const child = spawn(bin!, args, { stdio: ['pipe', 'pipe', 'pipe'] });
child.stdin.write(envelope.prompt);
child.stdin.end();

let usage: RunnerUsage | undefined;
const rl = createInterface({ input: child.stdout });
rl.on('line', (line) => {
  log.append(line);
  try {
    const e = JSON.parse(line);
    if (e.type === 'thread.started' && typeof e.thread_id === 'string') {
      status.threadId = e.thread_id;
      writeStatus(paths.statusFile, status);
    }
    if (e.type === 'turn.completed' && e.usage) usage = e.usage as RunnerUsage;
  } catch { /* malformed line already journaled raw */ }
});

let stderrTail = '';
child.stderr.on('data', (d: Buffer) => { stderrTail = (stderrTail + d.toString()).slice(-2000); });

let cancelling = false;
process.on('SIGINT', () => {
  cancelling = true;
  child.kill('SIGINT');
  const grace = envelope.graceMs ?? 5000;
  setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, grace).unref();
});

child.on('exit', (code) => {
  const final: RunnerStatus = {
    ...(readStatus(paths.statusFile) ?? status),
    state: cancelling ? 'cancelled' : code === 0 ? 'completed' : 'failed',
    exitCode: code ?? -1,
    finishedAt: new Date().toISOString(),
    usage,
    errorMessage: code === 0 || cancelling ? undefined : stderrTail || `codex exited ${code}`,
  };
  writeStatus(paths.statusFile, final);
  process.exit(cancelling ? 0 : code ?? 1);
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/runner.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/runner.ts test/runner.test.ts
git commit -m "feat(script-creator): add job runner journaling codex events"
```

### Task 7: Runner detachment survival

**Files:**
- Create: `script-creator/server/test/runner-detach.test.ts`
- Create: `script-creator/server/test/launch-helper.mjs`

**Interfaces:**
- Consumes: runner contract from Task 6.
- Produces: the verified detached-launch recipe the supervisor uses in Task 9:
  `spawn(tsxBin, [runnerTs, jobDir], { detached: true, stdio: 'ignore' }).unref()` —
  runner survives its launcher's death and finalizes status.

- [ ] **Step 1: Write the launcher helper (launches runner detached, then exits immediately)**

`script-creator/server/test/launch-helper.mjs`:

```js
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const jobDir = process.argv[2];
const mode = process.argv[3] ?? 'slow';
const tsx = join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx');
const runner = join(import.meta.dirname, '..', 'src', 'runner.ts');
const child = spawn(tsx, [runner, jobDir], {
  detached: true, stdio: 'ignore',
  env: { ...process.env, FAKE_CODEX_MODE: mode },
});
console.log(String(child.pid));
child.unref();
process.exit(0); // launcher dies; runner must live on
```

- [ ] **Step 2: Write the failing survival test**

`script-creator/server/test/runner-detach.test.ts`:

```ts
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { jobPaths, readStatus } from '../src/runner-status.js';
import { makeJobDir } from './runner.test.js';

const run = promisify(execFile);

async function waitFor(pred: () => boolean, ms = 15000): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (pred()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('condition not reached');
}

describe('runner detachment', () => {
  it('completes after its launcher process has exited', async () => {
    const jobDir = makeJobDir({});
    const { stdout } = await run(process.execPath,
      [join(import.meta.dirname, 'launch-helper.mjs'), jobDir, 'slow']);
    const runnerPid = Number(stdout.trim());
    expect(runnerPid).toBeGreaterThan(0);
    // launcher already exited (execFile resolved); runner must finish on its own
    await waitFor(() => readStatus(jobPaths(jobDir).statusFile)?.state === 'completed');
    expect(readStatus(jobPaths(jobDir).statusFile)!.state).toBe('completed');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails or passes honestly**

Run: `npx vitest run test/runner-detach.test.ts`
Expected: PASS if Task 6's runner needs no change; if it FAILS (runner dying with
launcher), fix by confirming the launcher uses `detached: true` + `stdio: 'ignore'` +
`unref()` exactly as above — no runner code change should be needed. Record the outcome.

- [ ] **Step 4: Run the whole suite**

Run: `npx vitest run`
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add test/launch-helper.mjs test/runner-detach.test.ts
git commit -m "test(script-creator): prove runner survives launcher death"
```

### Task 8: Job store (SQLite)

**Files:**
- Create: `script-creator/server/src/job-store.ts`
- Test: `script-creator/server/test/job-store.test.ts`

**Interfaces:**
- Consumes: `JobEnvelope`, `JobRecord`, `JobState`, `RunnerUsage` types.
- Produces:
  `class JobStore { constructor(dbFile: string); create(env: JobEnvelope, jobDir: string, opts?: {retryOf?: string; resumedFrom?: string}): JobRecord;
  get(id: string): JobRecord | null; setState(id: string, state: JobState, error?: string): void;
  setThreadId(id: string, threadId: string): void;
  recordUsage(id: string, usage: RunnerUsage | undefined): void;
  nextQueued(): JobRecord | null; runningJobs(): JobRecord[]; close(): void }`
  — `recordUsage(undefined)` sets `usageAvailable = 0` and null token columns.

- [ ] **Step 1: Write the failing test**

`script-creator/server/test/job-store.test.ts`:

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JobStore } from '../src/job-store.js';
import type { JobEnvelope } from '../src/types.js';

const env: JobEnvelope = { jobId: 'j1', prompt: 'p', cwd: '/r', sandbox: 'read-only' };

function freshStore(): JobStore {
  return new JobStore(join(mkdtempSync(join(tmpdir(), 'db-')), 'state.sqlite3'));
}

describe('JobStore', () => {
  it('creates, transitions, and records verbatim usage', () => {
    const s = freshStore();
    const rec = s.create(env, '/jobs/j1');
    expect(rec.state).toBe('queued');
    s.setState('j1', 'running');
    s.setThreadId('j1', 'tid-1');
    s.recordUsage('j1', { input_tokens: 10, cached_input_tokens: 5, output_tokens: 3, reasoning_output_tokens: 2 });
    s.setState('j1', 'completed');
    const done = s.get('j1')!;
    expect(done.threadId).toBe('tid-1');
    expect(done.inputTokens).toBe(10);
    expect(done.reasoningOutputTokens).toBe(2);
    expect(done.usageAvailable).toBe(1);
  });

  it('records unavailable usage as nulls, never estimates', () => {
    const s = freshStore();
    s.create(env, '/jobs/j1');
    s.recordUsage('j1', undefined);
    const rec = s.get('j1')!;
    expect(rec.usageAvailable).toBe(0);
    expect(rec.inputTokens).toBeNull();
  });

  it('serves FIFO queued order and lists running jobs', () => {
    const s = freshStore();
    s.create({ ...env, jobId: 'a' }, '/jobs/a');
    s.create({ ...env, jobId: 'b' }, '/jobs/b');
    expect(s.nextQueued()!.id).toBe('a');
    s.setState('a', 'running');
    expect(s.nextQueued()!.id).toBe('b');
    expect(s.runningJobs().map((j) => j.id)).toEqual(['a']);
  });

  it('links retries and resumes', () => {
    const s = freshStore();
    s.create(env, '/jobs/j1');
    const retry = s.create({ ...env, jobId: 'j2' }, '/jobs/j2', { retryOf: 'j1' });
    const resumed = s.create({ ...env, jobId: 'j3' }, '/jobs/j3', { resumedFrom: 'j1' });
    expect(retry.retryOf).toBe('j1');
    expect(resumed.resumedFrom).toBe('j1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/job-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`script-creator/server/src/job-store.ts`:

```ts
import Database from 'better-sqlite3';
import type { JobEnvelope, JobRecord, JobState, RunnerUsage } from './types.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  envelope_json TEXT NOT NULL,
  job_dir TEXT NOT NULL,
  thread_id TEXT,
  retry_of TEXT,
  resumed_from TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT,
  input_tokens INTEGER,
  cached_input_tokens INTEGER,
  output_tokens INTEGER,
  reasoning_output_tokens INTEGER,
  usage_available INTEGER NOT NULL DEFAULT 0,
  error TEXT
);`;

function toRecord(row: Record<string, unknown>): JobRecord {
  return {
    id: row.id as string,
    state: row.state as JobState,
    envelopeJson: row.envelope_json as string,
    jobDir: row.job_dir as string,
    threadId: (row.thread_id as string) ?? null,
    retryOf: (row.retry_of as string) ?? null,
    resumedFrom: (row.resumed_from as string) ?? null,
    createdAt: row.created_at as string,
    finishedAt: (row.finished_at as string) ?? null,
    inputTokens: (row.input_tokens as number) ?? null,
    cachedInputTokens: (row.cached_input_tokens as number) ?? null,
    outputTokens: (row.output_tokens as number) ?? null,
    reasoningOutputTokens: (row.reasoning_output_tokens as number) ?? null,
    usageAvailable: (row.usage_available as 0 | 1) ?? 0,
    error: (row.error as string) ?? null,
  };
}

export class JobStore {
  private readonly db: Database.Database;

  constructor(dbFile: string) {
    this.db = new Database(dbFile);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');
    this.db.exec(SCHEMA);
  }

  create(env: JobEnvelope, jobDir: string, opts: { retryOf?: string; resumedFrom?: string } = {}): JobRecord {
    this.db.prepare(
      `INSERT INTO jobs (id, state, envelope_json, job_dir, retry_of, resumed_from, created_at)
       VALUES (?, 'queued', ?, ?, ?, ?, ?)`,
    ).run(env.jobId, JSON.stringify(env), jobDir, opts.retryOf ?? null, opts.resumedFrom ?? null, new Date().toISOString());
    return this.get(env.jobId)!;
  }

  get(id: string): JobRecord | null {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? toRecord(row) : null;
  }

  setState(id: string, state: JobState, error?: string): void {
    const finished = ['completed', 'failed', 'cancelled', 'invalid-output', 'interrupted'].includes(state);
    this.db.prepare('UPDATE jobs SET state = ?, error = COALESCE(?, error), finished_at = COALESCE(?, finished_at) WHERE id = ?')
      .run(state, error ?? null, finished ? new Date().toISOString() : null, id);
  }

  setThreadId(id: string, threadId: string): void {
    this.db.prepare('UPDATE jobs SET thread_id = ? WHERE id = ?').run(threadId, id);
  }

  recordUsage(id: string, usage: RunnerUsage | undefined): void {
    if (!usage) {
      this.db.prepare('UPDATE jobs SET usage_available = 0 WHERE id = ?').run(id);
      return;
    }
    this.db.prepare(
      `UPDATE jobs SET usage_available = 1, input_tokens = ?, cached_input_tokens = ?,
       output_tokens = ?, reasoning_output_tokens = ? WHERE id = ?`,
    ).run(usage.input_tokens, usage.cached_input_tokens, usage.output_tokens, usage.reasoning_output_tokens ?? null, id);
  }

  nextQueued(): JobRecord | null {
    const row = this.db.prepare("SELECT * FROM jobs WHERE state = 'queued' ORDER BY created_at, id LIMIT 1")
      .get() as Record<string, unknown> | undefined;
    return row ? toRecord(row) : null;
  }

  runningJobs(): JobRecord[] {
    return (this.db.prepare("SELECT * FROM jobs WHERE state IN ('running','cancelling') ORDER BY created_at")
      .all() as Record<string, unknown>[]).map(toRecord);
  }

  close(): void {
    this.db.close();
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/job-store.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/job-store.ts test/job-store.test.ts
git commit -m "feat(script-creator): add sqlite job store with verbatim usage"
```

### Task 9: Supervisor — launch, watch, FIFO, terminal reconciliation

**Files:**
- Create: `script-creator/server/src/supervisor.ts`
- Test: `script-creator/server/test/supervisor.test.ts`

**Interfaces:**
- Consumes: `JobStore`, `EventLog`, `jobPaths`/`readStatus`, runner detached-launch
  recipe (Task 7), `JobEnvelope`.
- Produces:
  `class JobSupervisor { constructor(opts: { store: JobStore; jobsRoot: string; pollMs?: number; env?: Record<string,string> });
  enqueue(env: Omit<JobEnvelope,'jobId'> & { jobId?: string }): string;
  events(jobId: string, fromSeq?: number): CodexEvent[];
  waitForTerminal(jobId: string, timeoutMs?: number): Promise<JobRecord>;
  reattach(): void; cancel(jobId: string): void; resume(interruptedJobId: string): string;
  stop(): void }` — Task 9 delivers enqueue/events/waitForTerminal/stop + FIFO;
  reattach/cancel/resume land in Tasks 10–13 but the signatures exist from this task
  (throwing `new Error('not implemented')`).

- [ ] **Step 1: Write the failing test**

`script-creator/server/test/supervisor.test.ts`:

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JobStore } from '../src/job-store.js';
import { JobSupervisor } from '../src/supervisor.js';

const FAKE = `${process.execPath} ${join(import.meta.dirname, 'fake-codex.mjs')}`;

let sup: JobSupervisor;
afterEach(() => sup?.stop());

function makeSupervisor(mode = 'happy'): JobSupervisor {
  const root = mkdtempSync(join(tmpdir(), 'sup-'));
  sup = new JobSupervisor({
    store: new JobStore(join(root, 'state.sqlite3')),
    jobsRoot: join(root, 'jobs'),
    pollMs: 50,
    env: { FAKE_CODEX_MODE: mode },
  });
  return sup;
}

describe('JobSupervisor', () => {
  it('runs a job to completion with events, thread id, and tokens', async () => {
    const s = makeSupervisor();
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    const rec = await s.waitForTerminal(id);
    expect(rec.state).toBe('completed');
    expect(rec.threadId).toBeTruthy();
    expect(rec.usageAvailable).toBe(1);
    expect(rec.inputTokens).toBeGreaterThan(0);
    expect(s.events(id).at(-1)!.parsed!.type).toBe('turn.completed');
  });

  it('runs jobs one at a time in FIFO order', async () => {
    const s = makeSupervisor('slow');
    const a = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    const b = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    // While a runs, b must still be queued
    await new Promise((r) => setTimeout(r, 300));
    expect(s.store.get(b)!.state).toBe('queued');
    expect(s.store.get(a)!.state).toBe('running');
    const recB = await s.waitForTerminal(b, 30000);
    expect(recB.state).toBe('completed');
    expect(Date.parse(s.store.get(a)!.finishedAt!)).toBeLessThanOrEqual(Date.parse(recB.finishedAt!));
  });

  it('marks a nonzero-exit run failed with the stderr tail as error', async () => {
    const s = makeSupervisor('happy');
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: `${process.execPath} -e process.exit(3)` });
    const rec = await s.waitForTerminal(id);
    expect(rec.state).toBe('failed');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/supervisor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the supervisor core**

`script-creator/server/src/supervisor.ts`:

```ts
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EventLog } from './event-log.js';
import type { JobStore } from './job-store.js';
import { jobPaths, readStatus } from './runner-status.js';
import type { CodexEvent, JobEnvelope, JobRecord } from './types.js';

const TSX = join(import.meta.dirname, '..', 'node_modules', '.bin', 'tsx');
const RUNNER = join(import.meta.dirname, 'runner.ts');

export class JobSupervisor {
  readonly store: JobStore;
  private readonly jobsRoot: string;
  private readonly pollMs: number;
  private readonly extraEnv: Record<string, string>;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(opts: { store: JobStore; jobsRoot: string; pollMs?: number; env?: Record<string, string> }) {
    this.store = opts.store;
    this.jobsRoot = opts.jobsRoot;
    this.pollMs = opts.pollMs ?? 500;
    this.extraEnv = opts.env ?? {};
    mkdirSync(this.jobsRoot, { recursive: true });
    this.timer = setInterval(() => this.tick(), this.pollMs);
    this.timer.unref?.();
  }

  enqueue(env: Omit<JobEnvelope, 'jobId'> & { jobId?: string }): string {
    const jobId = env.jobId ?? randomUUID();
    const jobDir = join(this.jobsRoot, jobId);
    mkdirSync(jobDir, { recursive: true });
    const full: JobEnvelope = { ...env, jobId };
    writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(full));
    this.store.create(full, jobDir);
    this.tick();
    return jobId;
  }

  events(jobId: string, fromSeq = 0): CodexEvent[] {
    const rec = this.store.get(jobId);
    if (!rec) return [];
    return new EventLog(jobPaths(rec.jobDir).eventsFile).read(fromSeq);
  }

  async waitForTerminal(jobId: string, timeoutMs = 20000): Promise<JobRecord> {
    const end = Date.now() + timeoutMs;
    for (;;) {
      const rec = this.store.get(jobId);
      if (rec && !['queued', 'running', 'cancelling'].includes(rec.state)) return rec;
      if (Date.now() > end) throw new Error(`timeout waiting for ${jobId}`);
      await new Promise((r) => setTimeout(r, this.pollMs));
    }
  }

  reattach(): void { throw new Error('not implemented'); }
  cancel(_jobId: string): void { throw new Error('not implemented'); }
  resume(_interruptedJobId: string): string { throw new Error('not implemented'); }

  stop(): void {
    clearInterval(this.timer);
    this.store.close();
  }

  private tick(): void {
    this.reconcileRunning();
    if (this.store.runningJobs().length === 0) this.launchNext();
  }

  private launchNext(): void {
    const next = this.store.nextQueued();
    if (!next) return;
    const child = spawn(TSX, [RUNNER, next.jobDir], {
      detached: true, stdio: 'ignore',
      env: { ...process.env, ...this.extraEnv },
    });
    child.unref();
    this.store.setState(next.id, 'running');
  }

  private reconcileRunning(): void {
    for (const job of this.store.runningJobs()) {
      const status = readStatus(jobPaths(job.jobDir).statusFile);
      if (!status) continue;
      if (status.threadId && !job.threadId) this.store.setThreadId(job.id, status.threadId);
      if (status.state === 'running') continue;
      this.store.recordUsage(job.id, status.usage);
      if (status.state === 'completed') this.store.setState(job.id, 'completed');
      else if (status.state === 'cancelled') this.store.setState(job.id, 'cancelled');
      else this.store.setState(job.id, 'failed', status.errorMessage);
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/supervisor.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the whole suite and commit**

Run: `npx vitest run` — all green, then:

```bash
git add src/supervisor.ts test/supervisor.test.ts
git commit -m "feat(script-creator): add job supervisor with FIFO and reconciliation"
```

### Task 10: Reattach after supervisor death, interrupted detection

**Files:**
- Modify: `script-creator/server/src/supervisor.ts` (replace the `reattach()` stub)
- Test: `script-creator/server/test/supervisor-reattach.test.ts`

**Interfaces:**
- Consumes: Task 9 supervisor.
- Produces: `reattach(): void` — for each DB-`running` job: runner pid alive (per
  `status.json` + `process.kill(pid, 0)`) → keep watching (reconciliation resumes via
  tick); pid dead with non-terminal status → state `interrupted`. Constructor never
  auto-reattaches; the daemon phase decides when to call it.

- [ ] **Step 1: Write the failing test**

`script-creator/server/test/supervisor-reattach.test.ts`:

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JobStore } from '../src/job-store.js';
import { JobSupervisor } from '../src/supervisor.js';

const FAKE = `${process.execPath} ${join(import.meta.dirname, 'fake-codex.mjs')}`;
const sups: JobSupervisor[] = [];
afterEach(() => sups.forEach((s) => { try { s.stop(); } catch { /* closed */ } }));

function supervisorAt(root: string, dbShared: string, mode: string): JobSupervisor {
  const s = new JobSupervisor({
    store: new JobStore(dbShared), jobsRoot: join(root, 'jobs'),
    pollMs: 50, env: { FAKE_CODEX_MODE: mode },
  });
  sups.push(s);
  return s;
}

describe('reattach', () => {
  it('a second supervisor finishes bookkeeping for a job launched by a dead first one', async () => {
    const root = mkdtempSync(join(tmpdir(), 'reat-'));
    const db = join(root, 'state.sqlite3');
    const s1 = supervisorAt(root, db, 'slow');
    const id = s1.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    await new Promise((r) => setTimeout(r, 300)); // runner detached and running
    s1.stop(); // daemon "dies"; runner keeps going
    const s2 = supervisorAt(root, db, 'slow');
    s2.reattach();
    const rec = await s2.waitForTerminal(id, 30000);
    expect(rec.state).toBe('completed');
    expect(rec.usageAvailable).toBe(1);
    expect(s2.events(id).at(-1)!.parsed!.type).toBe('turn.completed');
  });

  it('marks a dead-runner job interrupted', async () => {
    const root = mkdtempSync(join(tmpdir(), 'reat-'));
    const db = join(root, 'state.sqlite3');
    const s1 = supervisorAt(root, db, 'hang');
    const id = s1.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    await new Promise((r) => setTimeout(r, 500));
    // Kill the hung runner process group outright
    const status = JSON.parse(
      require('node:fs').readFileSync(join(s1.store.get(id)!.jobDir, 'status.json'), 'utf8'));
    process.kill(-status.pgid, 'SIGKILL');
    s1.stop();
    const s2 = supervisorAt(root, db, 'hang');
    s2.reattach();
    await new Promise((r) => setTimeout(r, 300));
    expect(s2.store.get(id)!.state).toBe('interrupted');
  });
});
```

Note: `require` inside ESM vitest — replace with a top-level
`import { readFileSync } from 'node:fs'` when writing the file; shown inline here for
brevity of the diff. The implementer writes the import form.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/supervisor-reattach.test.ts`
Expected: FAIL — `reattach` throws `not implemented`.

- [ ] **Step 3: Implement reattach**

In `script-creator/server/src/supervisor.ts`, replace the stub:

```ts
  reattach(): void {
    for (const job of this.store.runningJobs()) {
      const status = readStatus(jobPaths(job.jobDir).statusFile);
      if (!status) { this.store.setState(job.id, 'interrupted', 'no status file'); continue; }
      if (status.state !== 'running') continue; // next tick reconciles terminal states
      if (!isPidAlive(status.pid)) this.store.setState(job.id, 'interrupted', 'runner died');
      // alive → periodic tick keeps tailing; nothing else to do
    }
  }
```

And add at module scope:

```ts
function isPidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/supervisor-reattach.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/supervisor.ts test/supervisor-reattach.test.ts
git commit -m "feat(script-creator): reattach to live runners and mark dead ones interrupted"
```

### Task 11: Cancellation with escalation

**Files:**
- Modify: `script-creator/server/src/supervisor.ts` (replace the `cancel()` stub)
- Test: `script-creator/server/test/supervisor-cancel.test.ts`

**Interfaces:**
- Consumes: runner SIGINT trap (Task 6), `ignore-sigint` fake mode.
- Produces: `cancel(jobId): void` — sets state `cancelling`, sends SIGINT to the
  runner's process group; if the group is still alive after `graceMs * 2` (default
  10 s, test-tunable via envelope `graceMs`), sends SIGKILL to the group and the next
  reconcile marks `cancelled` (preserving journaled events).

- [ ] **Step 1: Write the failing test**

`script-creator/server/test/supervisor-cancel.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/supervisor-cancel.test.ts`
Expected: FAIL — `cancel` throws `not implemented`.

- [ ] **Step 3: Implement cancel**

In `script-creator/server/src/supervisor.ts`, replace the stub:

```ts
  cancel(jobId: string): void {
    const job = this.store.get(jobId);
    if (!job || !['running', 'queued'].includes(job.state)) return;
    if (job.state === 'queued') { this.store.setState(jobId, 'cancelled', 'cancelled before start'); return; }
    const status = readStatus(jobPaths(job.jobDir).statusFile);
    if (!status) { this.store.setState(jobId, 'cancelled', 'no runner status'); return; }
    this.store.setState(jobId, 'cancelling');
    const env = JSON.parse(job.envelopeJson) as JobEnvelope;
    const grace = (env.graceMs ?? 5000) * 2;
    try { process.kill(-status.pgid, 'SIGINT'); } catch { /* group already gone */ }
    setTimeout(() => {
      const rec = this.store.get(jobId);
      if (rec && rec.state === 'cancelling') {
        try { process.kill(-status.pgid, 'SIGKILL'); } catch { /* gone */ }
        this.store.setState(jobId, 'cancelled', 'escalated to SIGKILL');
      }
    }, grace).unref?.();
  }
```

Also extend `reconcileRunning()` so a `cancelling` job whose runner finalized as
`cancelled` transitions cleanly (the `runningJobs()` query already includes
`cancelling`; the existing status-mapping needs no change).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/supervisor-cancel.test.ts`
Expected: PASS (2 tests). The escalation test relies on SIGKILLing the process group,
which also kills the fake codex sleeping child.

- [ ] **Step 5: Commit**

```bash
git add src/supervisor.ts test/supervisor-cancel.test.ts
git commit -m "feat(script-creator): cancellation with SIGINT grace and SIGKILL escalation"
```

### Task 12: Output schema validation and retry-once

**Files:**
- Create: `script-creator/server/src/schema-validate.ts`
- Modify: `script-creator/server/src/supervisor.ts` (post-completion validation hook)
- Test: `script-creator/server/test/supervisor-retry.test.ts`

**Interfaces:**
- Consumes: `final-message.txt`, envelope `outputSchema`, ajv.
- Produces: `validateAgainstSchema(schema: Record<string, unknown>, text: string):
  { ok: true; value: unknown } | { ok: false; reason: string }`; supervisor behavior —
  a `completed` job with an `outputSchema` whose final message fails validation becomes
  `invalid-output` and is retried exactly once as a fresh identical job (`retryOf`
  linked); a second failure stays `invalid-output` with no further retry. Raw events
  are never deleted.

- [ ] **Step 1: Write the failing validator test (inside the retry test file)**

`script-creator/server/test/supervisor-retry.test.ts`:

```ts
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
```

Add to `JobStore` (same task): `jobsRetriedFrom(id: string): JobRecord[]` —
`SELECT * FROM jobs WHERE retry_of = ?`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/supervisor-retry.test.ts`
Expected: FAIL — `schema-validate.js` not found.

- [ ] **Step 3: Implement validator and supervisor hook**

`script-creator/server/src/schema-validate.ts`:

```ts
import { Ajv } from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

export function validateAgainstSchema(
  schema: Record<string, unknown>, text: string,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  let value: unknown;
  try { value = JSON.parse(text); } catch (e) { return { ok: false, reason: `not JSON: ${String(e)}` }; }
  const validate = ajv.compile(schema);
  if (validate(value)) return { ok: true, value };
  return { ok: false, reason: ajv.errorsText(validate.errors) };
}
```

In `supervisor.ts` `reconcileRunning()`, replace the completed-branch with:

```ts
      if (status.state === 'completed') {
        const env = JSON.parse(job.envelopeJson) as JobEnvelope;
        if (env.outputSchema) {
          const text = readFinalMessage(job.jobDir);
          const result = validateAgainstSchema(env.outputSchema, text);
          if (!result.ok) {
            this.store.setState(job.id, 'invalid-output', result.reason);
            if (!job.retryOf) this.retryFresh(job);
            continue;
          }
        }
        this.store.setState(job.id, 'completed');
      }
```

With module additions:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { validateAgainstSchema } from './schema-validate.js';

function readFinalMessage(jobDir: string): string {
  const f = jobPaths(jobDir).finalMessageFile;
  return existsSync(f) ? readFileSync(f, 'utf8') : '';
}
```

And a private method:

```ts
  private retryFresh(job: JobRecord): void {
    const env = JSON.parse(job.envelopeJson) as JobEnvelope;
    const retryId = randomUUID();
    const jobDir = join(this.jobsRoot, retryId);
    mkdirSync(jobDir, { recursive: true });
    const fresh: JobEnvelope = { ...env, jobId: retryId, resumeThreadId: undefined };
    writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(fresh));
    this.store.create(fresh, jobDir, { retryOf: job.id });
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/supervisor-retry.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the whole suite and commit**

Run: `npx vitest run` — all green, then:

```bash
git add src/schema-validate.ts src/supervisor.ts src/job-store.ts test/supervisor-retry.test.ts
git commit -m "feat(script-creator): schema validation with single fresh retry"
```

### Task 13: Resume of interrupted jobs

**Files:**
- Modify: `script-creator/server/src/supervisor.ts` (replace the `resume()` stub)
- Test: `script-creator/server/test/supervisor-resume.test.ts`

**Interfaces:**
- Consumes: `interrupted` detection (Task 10), `buildCodexArgs` resume path (Task 2),
  fake codex resume behavior (Task 3).
- Produces: `resume(interruptedJobId): string` — requires state `interrupted` and a
  recorded `threadId` (throws otherwise); enqueues a new job whose envelope is the
  complete original envelope plus `resumeThreadId`, linked via `resumedFrom`. Session
  history is an optimization only: the full prompt is resent.

- [ ] **Step 1: Write the failing test**

`script-creator/server/test/supervisor-resume.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JobStore } from '../src/job-store.js';
import { jobPaths } from '../src/runner-status.js';
import { JobSupervisor } from '../src/supervisor.js';

const FAKE = `${process.execPath} ${join(import.meta.dirname, 'fake-codex.mjs')}`;
const sups: JobSupervisor[] = [];
afterEach(() => sups.forEach((s) => { try { s.stop(); } catch { /* closed */ } }));

describe('resume', () => {
  it('resumes an interrupted job with the original envelope and prior thread id', async () => {
    const root = mkdtempSync(join(tmpdir(), 'res-'));
    const db = join(root, 'state.sqlite3');
    const s1 = new JobSupervisor({
      store: new JobStore(db), jobsRoot: join(root, 'jobs'), pollMs: 50,
      env: { FAKE_CODEX_MODE: 'hang' },
    });
    sups.push(s1);
    const id = s1.enqueue({ prompt: 'payload-original', cwd: tmpdir(), sandbox: 'read-only', codexBin: FAKE });
    await new Promise((r) => setTimeout(r, 600)); // thread.started journaled, then hangs
    const status = JSON.parse(readFileSync(jobPaths(s1.store.get(id)!.jobDir).statusFile, 'utf8'));
    const originalThread = status.threadId as string;
    expect(originalThread).toBeTruthy();
    process.kill(-status.pgid, 'SIGKILL');
    s1.stop();

    const s2 = new JobSupervisor({
      store: new JobStore(db), jobsRoot: join(root, 'jobs'), pollMs: 50,
      env: { FAKE_CODEX_MODE: 'happy' },
    });
    sups.push(s2);
    s2.reattach();
    await new Promise((r) => setTimeout(r, 300));
    expect(s2.store.get(id)!.state).toBe('interrupted');

    const resumedId = s2.resume(id);
    const rec = await s2.waitForTerminal(resumedId, 30000);
    expect(rec.state).toBe('completed');
    expect(rec.resumedFrom).toBe(id);
    expect(rec.threadId).toBe(originalThread); // fake echoes the resumed id
    const resumedEnv = JSON.parse(rec.envelopeJson);
    expect(resumedEnv.prompt).toBe('payload-original');
    expect(resumedEnv.resumeThreadId).toBe(originalThread);
  });

  it('refuses to resume a job without a thread id', async () => {
    const root = mkdtempSync(join(tmpdir(), 'res-'));
    const s = new JobSupervisor({
      store: new JobStore(join(root, 'state.sqlite3')), jobsRoot: join(root, 'jobs'), pollMs: 50,
    });
    sups.push(s);
    const id = s.enqueue({ prompt: 'p', cwd: tmpdir(), sandbox: 'read-only', codexBin: `${process.execPath} -e process.exit(9)` });
    await s.waitForTerminal(id);
    expect(() => s.resume(id)).toThrow(/interrupted/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/supervisor-resume.test.ts`
Expected: FAIL — `resume` throws `not implemented`.

- [ ] **Step 3: Implement resume**

In `script-creator/server/src/supervisor.ts`, replace the stub:

```ts
  resume(interruptedJobId: string): string {
    const job = this.store.get(interruptedJobId);
    if (!job || job.state !== 'interrupted') throw new Error('only interrupted jobs can be resumed');
    if (!job.threadId) throw new Error('interrupted job has no thread id; relaunch fresh instead');
    const env = JSON.parse(job.envelopeJson) as JobEnvelope;
    const resumedId = randomUUID();
    const jobDir = join(this.jobsRoot, resumedId);
    mkdirSync(jobDir, { recursive: true });
    const resumedEnv: JobEnvelope = { ...env, jobId: resumedId, resumeThreadId: job.threadId };
    writeFileSync(join(jobDir, 'envelope.json'), JSON.stringify(resumedEnv));
    this.store.create(resumedEnv, jobDir, { resumedFrom: job.id });
    this.tick();
    return resumedId;
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/supervisor-resume.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the whole suite and commit**

```bash
npx vitest run
git add src/supervisor.ts test/supervisor-resume.test.ts
git commit -m "feat(script-creator): resume interrupted jobs with original envelope"
```

### Task 14: Real-codex E2E verification and spike verdict

**Files:**
- Create: `script-creator/server/e2e/real-codex-spike.ts`
- Create: `docs/superpowers/evidence/2026-07-22-script-creator-spike1-transport.md`

**Interfaces:**
- Consumes: the full supervisor stack; the real codex CLI and the
  `$writing-whp-youtube-scripts` Review operation.
- Produces: an env-gated script printing a VERIFIED/FAILED checklist, and the committed
  evidence document recording the spike verdict for the next plan.

- [ ] **Step 1: Write the E2E script**

`script-creator/server/e2e/real-codex-spike.ts`:

```ts
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
    findings: { type: 'array', items: { type: 'object', required: ['anchor', 'severity', 'finding_markdown'], additionalProperties: false,
      properties: { anchor: { type: 'string' }, severity: { enum: ['blocking', 'important', 'optional'] },
        finding_markdown: { type: 'string' }, optional_direction_markdown: { type: 'string' } } } },
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
```

- [ ] **Step 2: Run it for real**

Run: `cd script-creator/server && RUN_REAL_CODEX=1 npm run spike:e2e`
Expected: every line `VERIFIED`, final line `SPIKE 1: ALL CHECKS VERIFIED`. This spends
real tokens on two Review operations and takes several minutes. If any check fails,
STOP — the failure is a design-level finding; record it in the evidence document and
raise it before continuing the plan sequence.

- [ ] **Step 3: Write the evidence document**

`docs/superpowers/evidence/2026-07-22-script-creator-spike1-transport.md` — record: the
date and codex CLI version; each checklist line's outcome pasted verbatim; observed
timings and token counts for both runs; any surprises (event types not in fixtures,
resume quirks, cancellation latency); and the verdict sentence: whether the transport
design is confirmed for the daemon phase or what must change. Use the actual run
output — do not write this document from memory.

- [ ] **Step 4: Full suite green**

Run: `npx vitest run`
Expected: all tests pass (E2E script is not part of vitest).

- [ ] **Step 5: Commit**

```bash
git add e2e/real-codex-spike.ts ../../docs/superpowers/evidence/2026-07-22-script-creator-spike1-transport.md
git commit -m "test(script-creator): verify transport durability against real codex"
```

---

## Plan sequence after this spike

Written as separate plans once Spike 1's evidence is committed (each depends on its
predecessor's findings): **Plan 2** Spike 2 — editor range identity (ProseMirror doc
model, LockGuard, ProposalLayer, VariantSet, fast-check invariants); **Plan 3** daemon +
operation layer (Fastify, SSE, envelopes, operation schemas, XDG wiring, security
nonce); **Plan 4** Script Studio (Angular shell, editor integration, selection popup,
variants UI, revision timeline); **Plan 5** Topic Studio + pipeline board +
`WHP_PROGRESS/1`; **Plan 6** approval gate, Promote, validator `--json` mode, git
milestones; **Plan 7** learning loop (capture → distill → review queue → application).
