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
