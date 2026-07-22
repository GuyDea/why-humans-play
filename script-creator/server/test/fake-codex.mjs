#!/usr/bin/env node
import { readFileSync, writeFileSync, writeSync } from 'node:fs';
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

process.stdin.on('data', () => {});
process.stdin.resume();

const finalText = () => {
  const msgs = lines.filter((e) => e.type === 'item.completed' && e.item?.type === 'agent_message');
  return msgs.length ? msgs[msgs.length - 1].item.text : '';
};

if (mode === 'ignore-sigint') process.on('SIGINT', () => {});
const delay = mode === 'slow' ? 400 : 10;
let emitted = 0;
for (const e of lines) {
  writeSync(process.stdout.fd, JSON.stringify(e) + '\n');
  emitted += 1;
  if (mode === 'malformed-json' && emitted === 2) writeSync(process.stdout.fd, '{broken\n');
  if (mode === 'hang' && emitted === 2) { setInterval(() => {}, 60_000); await new Promise(() => {}); }
  await new Promise((r) => setTimeout(r, delay));
  if (mode === 'ignore-sigint' && emitted === 2) {
    await new Promise((r) => setTimeout(r, 60_000)); // survives SIGINT; SIGKILL only
  }
}
if (outFile) writeFileSync(outFile, finalText());
process.exit(0);
