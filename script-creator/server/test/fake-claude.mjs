#!/usr/bin/env node
// Deterministic stand-in for the Claude Code CLI (`claude -p`). It never calls
// real claude. It parses the argv the ClaudeBackend builds, reads the prompt
// from stdin, and emits Claude-shaped stream-json lines. FAKE_CLAUDE_MODE
// selects the scenario: happy | turn-failed | no-usage | schema-output.
import { writeSync } from 'node:fs';

const mode = process.env.FAKE_CLAUDE_MODE ?? 'happy';
const argv = process.argv.slice(2);

function flagValue(name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
}

const resumeId = flagValue('--resume');
const model = flagValue('--model') ?? 'claude-opus-4-8';
const schemaArg = flagValue('--json-schema');
const outputFormat = flagValue('--output-format');
const permissionMode = flagValue('--permission-mode');

if (outputFormat !== 'stream-json') {
  process.stderr.write(`fake-claude expects --output-format stream-json, got ${outputFormat}\n`);
  process.exit(2);
}
if (!argv.includes('--verbose')) {
  process.stderr.write('fake-claude expects --verbose with stream-json\n');
  process.exit(2);
}

// Drain stdin so the runner's stdin.end() resolves; the prompt content is not
// needed to produce deterministic output.
await new Promise((resolve) => {
  const chunks = [];
  process.stdin.on('data', (chunk) => chunks.push(chunk));
  process.stdin.on('end', resolve);
  process.stdin.on('error', resolve);
});

const sessionId = resumeId ?? '11111111-2222-4333-8444-555555555555';

const emit = (event) => writeSync(process.stdout.fd, JSON.stringify(event) + '\n');

const usage = {
  input_tokens: 4321,
  cache_creation_input_tokens: 100,
  cache_read_input_tokens: 2048,
  output_tokens: 128,
};

// A leading non-init event (like the real CLI's SessionStart hooks) that still
// carries the session id, to exercise "first event carrying session_id".
emit({
  type: 'system',
  subtype: 'hook_started',
  hook_name: 'SessionStart:startup',
  session_id: sessionId,
});
emit({
  type: 'system',
  subtype: 'init',
  session_id: sessionId,
  cwd: process.cwd(),
  model,
  permissionMode,
});

if (mode === 'turn-failed') {
  emit({
    type: 'result',
    subtype: 'api_error',
    is_error: true,
    result: 'Invalid schema for response_format: invalid_json_schema',
    session_id: sessionId,
    terminal_reason: 'api_error',
  });
  process.exit(0);
}

const finalText = mode === 'schema-output'
  ? JSON.stringify({ received_schema: schemaArg !== null })
  : 'OK-CLAUDE';

emit({
  type: 'assistant',
  message: {
    model,
    content: [{ type: 'text', text: finalText }],
    usage,
  },
  session_id: sessionId,
});

// A trailing unknown event type the parser must tolerate (journal-raw only).
emit({ type: 'rate_limit_event', session_id: sessionId });

const resultEvent = {
  type: 'result',
  subtype: 'success',
  is_error: false,
  result: finalText,
  session_id: sessionId,
  total_cost_usd: 0.01,
  terminal_reason: 'completed',
};
if (mode !== 'no-usage') resultEvent.usage = usage;
emit(resultEvent);

process.exit(0);
