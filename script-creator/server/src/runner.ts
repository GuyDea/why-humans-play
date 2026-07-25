import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { selectBackend } from './backends/index.js';
import { EventLog } from './event-log.js';
import { jobPaths, readStatus, writeStatus } from './runner-status.js';
import type { JobEnvelope, RunnerStatus, RunnerUsage } from './types.js';

const jobDir = process.argv[2];
if (!jobDir) { console.error('usage: runner <jobDir>'); process.exit(2); }

const envelope = JSON.parse(readFileSync(`${jobDir}/envelope.json`, 'utf8')) as JobEnvelope;
const paths = jobPaths(jobDir);
const log = new EventLog(paths.eventsFile);

if (envelope.outputSchema) writeFileSync(paths.schemaFile, JSON.stringify(envelope.outputSchema));

const backend = selectBackend(envelope.backend);
const binSpec = backend.name === 'claude'
  ? (envelope.claudeBin ?? 'claude')
  : (envelope.codexBin ?? 'codex');
const [bin, ...binPre] = binSpec.split(' ');
const args = [...binPre, ...backend.buildArgs(envelope, paths)];

const status: RunnerStatus = {
  state: 'running', pid: process.pid, pgid: process.pid,
  startedAt: new Date().toISOString(),
};
// Test-only hook for exercising the interval before the initial status exists.
const requestedStatusDelayMs = Number(process.env.RUNNER_STATUS_DELAY_MS ?? 0);
const statusDelayMs = Number.isInteger(requestedStatusDelayMs) && requestedStatusDelayMs > 0
  ? requestedStatusDelayMs
  : 0;
if (statusDelayMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, statusDelayMs));
writeStatus(paths.statusFile, status);

const child = spawn(bin!, args, { cwd: envelope.cwd, stdio: ['pipe', 'pipe', 'pipe'] });

let usage: RunnerUsage | undefined;
let turnFailedError: string | undefined;
let finalMessage: string | undefined;
const rl = createInterface({ input: child.stdout });
rl.on('line', (rawLine) => {
  log.append(rawLine);
  const parsed = backend.parseLine(rawLine);
  // Journal any codex-shaped events the backend translated so the downstream
  // progress/console parsers keep working across backends.
  if (parsed.translatedEvents) {
    for (const translated of parsed.translatedEvents) log.append(translated);
  }
  if (parsed.sessionId && !status.threadId) {
    status.threadId = parsed.sessionId;
    writeStatus(paths.statusFile, status);
  }
  if (parsed.usage) usage = parsed.usage;
  if (parsed.failed) turnFailedError = parsed.failed;
  if (parsed.finalMessage !== undefined) finalMessage = parsed.finalMessage;
});

let stderrTail = '';
child.stderr.on('data', (d: Buffer) => { stderrTail = (stderrTail + d.toString()).slice(-2000); });

let spawnError: Error | undefined;
child.on('error', (error) => { spawnError = error; });
child.stdin.on('error', (error) => { spawnError ??= error; });

child.stdin.write(backend.transformPrompt(envelope.prompt));
child.stdin.end();

let cancelling = false;
process.on('SIGINT', () => {
  cancelling = true;
  child.kill('SIGINT');
  const grace = envelope.graceMs ?? 5000;
  setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, grace).unref();
});

let exitCode: number | null = null;
child.on('exit', (code) => { exitCode = code; });

child.on('close', (code) => {
  const finalCode = exitCode ?? code;
  // Backends without an `-o` equivalent (claude) hand us the captured final
  // text; persist it to the final-message.txt the rest of the system reads.
  if (!backend.writesFinalMessageFile && finalMessage !== undefined) {
    writeFileSync(paths.finalMessageFile, finalMessage);
  }
  const final: RunnerStatus = {
    ...(readStatus(paths.statusFile) ?? status),
    state: cancelling
      ? 'cancelled'
      : !turnFailedError && !spawnError && finalCode === 0 ? 'completed' : 'failed',
    exitCode: finalCode ?? -1,
    finishedAt: new Date().toISOString(),
    usage,
    errorMessage: cancelling
      ? undefined
      : turnFailedError
        ?? spawnError?.message
        ?? (finalCode === 0 ? undefined : stderrTail || `${backend.name} exited ${finalCode}`),
  };
  writeStatus(paths.statusFile, final);
  process.exit(cancelling ? 0 : finalCode ?? 1);
});
