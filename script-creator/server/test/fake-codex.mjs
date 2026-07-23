#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mode = process.env.FAKE_CODEX_MODE ?? 'happy';
const argv = process.argv.slice(2);
const oIdx = argv.indexOf('-o');
const outFile = oIdx >= 0 ? argv[oIdx + 1] : null;
const resumeIdx = argv.indexOf('resume');
const resumeId = resumeIdx >= 0 ? argv[resumeIdx + 1] : null;
const schemaIdx = argv.indexOf('--output-schema');
const hasSchema = schemaIdx >= 0;
const schemaFile = hasSchema ? argv[schemaIdx + 1] : null;
let attemptMode = mode;
if (mode === 'slow-operation-schema') attemptMode = 'operation-schema';
if (
  mode === 'invalid-schema-once'
  || mode === 'invalid-schema-then-hang'
) {
  const marker = process.env.FAKE_CODEX_ATTEMPT_FILE;
  if (!marker) throw new Error(`${mode} requires FAKE_CODEX_ATTEMPT_FILE`);
  if (existsSync(marker)) {
    attemptMode = mode === 'invalid-schema-once'
      ? 'operation-schema'
      : 'hang';
  } else {
    writeFileSync(marker, 'first attempt failed schema validation');
    attemptMode = 'bad-schema-output';
  }
}

const fixture = join(import.meta.dirname, 'fixtures',
  mode === 'turn-failed'
    ? 'events-failed.jsonl'
    : hasSchema ? 'events-schema.jsonl' : 'events-plain.jsonl');
let lines = readFileSync(fixture, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

if (resumeId) lines = lines.map((e) => e.type === 'thread.started' ? { ...e, thread_id: resumeId } : e);
if (mode === 'no-usage') lines = lines.map((e) => e.type === 'turn.completed' ? { type: 'turn.completed' } : e);
if (mode === 'partial-usage') {
  lines = lines.map((e) => e.type === 'turn.completed'
    ? { type: 'turn.completed', usage: { input_tokens: e.usage.input_tokens } }
    : e);
}
if (attemptMode === 'bad-schema-output') {
  lines = lines.map((e) =>
    e.type === 'item.completed' && e.item?.type === 'agent_message'
      ? { ...e, item: { ...e.item, text: '{"unexpected":true}' } } : e);
}
if (hasSchema && attemptMode !== 'bad-schema-output') {
  if (!schemaFile) throw new Error('--output-schema requires a schema file');
  const schema = JSON.parse(readFileSync(schemaFile, 'utf8'));
  const output = synthesizeSchema(schema);
  if (attemptMode === 'operation-guardrail') {
    output.status = process.env.FAKE_OPERATION_STATUS ?? 'declined';
    output.guardrail_markdown = 'This request crosses the approved scope.';
    if ('replacement_markdown' in output) output.replacement_markdown = '';
  }
  lines = lines.map((e) =>
    e.type === 'item.completed' && e.item?.type === 'agent_message'
      ? {
          ...e,
          item: {
            ...e.item,
            text: JSON.stringify(output),
          },
        }
      : e);
}

process.stdin.on('data', () => {});
process.stdin.resume();

if (mode === 'surviving-descendant') {
  const readyFile = join(tmpdir(), `fake-descendant-${process.pid}-${Date.now()}`);
  const descendant = spawn(process.execPath, [
    '--input-type=module',
    '-e',
    "import { writeFileSync } from 'node:fs'; process.on('SIGINT', () => {}); writeFileSync(process.argv[1], 'ready'); setInterval(() => {}, 60000)",
    readyFile,
  ], { stdio: 'ignore' });
  const readyDeadline = Date.now() + 5000;
  while (!existsSync(readyFile)) {
    if (Date.now() > readyDeadline) throw new Error('descendant did not become ready');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  unlinkSync(readyFile);
  descendant.unref();
}

const finalText = () => {
  const msgs = lines.filter((e) => e.type === 'item.completed' && e.item?.type === 'agent_message');
  return msgs.length ? msgs[msgs.length - 1].item.text : '';
};

const lateUsage = mode === 'late-usage'
  ? lines.find((e) => e.type === 'turn.completed')
  : undefined;
if (lateUsage) lines = lines.filter((e) => e !== lateUsage);

if (mode === 'ignore-sigint') process.on('SIGINT', () => {});
const delay = mode === 'slow' || mode === 'slow-operation-schema' ? 400 : 10;
let emitted = 0;
for (const e of lines) {
  writeSync(process.stdout.fd, JSON.stringify(e) + '\n');
  emitted += 1;
  if (mode === 'malformed-json' && emitted === 2) writeSync(process.stdout.fd, '{broken\n');
  if (attemptMode === 'hang' && emitted === 2) { setInterval(() => {}, 60_000); await new Promise(() => {}); }
  await new Promise((r) => setTimeout(r, delay));
  if (mode === 'ignore-sigint' && emitted === 2) {
    await new Promise((r) => setTimeout(r, 60_000)); // survives SIGINT; SIGKILL only
  }
  if (mode === 'surviving-descendant' && emitted === 2) {
    await new Promise((r) => setTimeout(r, 60_000)); // parent exits on SIGINT; descendant does not
  }
}
if (outFile) writeFileSync(outFile, finalText());
if (lateUsage) {
  const writer = spawn(process.execPath, [
    '--input-type=module',
    '-e',
    "import { writeSync } from 'node:fs'; setTimeout(() => writeSync(1, process.argv[1] + '\\n'), 300)",
    JSON.stringify(lateUsage),
  ], { detached: true, stdio: ['ignore', process.stdout, 'ignore'] });
  writer.unref();
}
process.exit(0);

function synthesizeSchema(schema, propertyName = '') {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error(`cannot synthesize schema property ${propertyName || '<root>'}`);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    if (propertyName === 'status' && schema.enum.includes('complete')) {
      return 'complete';
    }
    return schema.enum[0];
  }

  if (
    Array.isArray(schema.type)
    && schema.type.length === 2
    && schema.type.includes('string')
    && schema.type.includes('null')
  ) {
    return null;
  }

  switch (schema.type) {
    case 'object': {
      const properties = schema.properties;
      const required = Array.isArray(schema.required) ? schema.required : [];
      if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
        throw new Error(`object schema property ${propertyName || '<root>'} has no properties`);
      }
      return Object.fromEntries(required.map((name) => [
        name,
        synthesizeSchema(properties[name], name),
      ]));
    }
    case 'array':
      return [synthesizeSchema(schema.items, propertyName)];
    case 'string':
      return propertyName === 'replacement_markdown'
        ? 'Rewritten passage.'
        : `Fake ${propertyName}.`;
    case 'number':
    case 'integer':
      return 1;
    case 'boolean':
      return false;
    case 'null':
      return null;
    default:
      throw new Error(
        `unsupported schema type for property ${propertyName || '<root>'}`,
      );
  }
}
