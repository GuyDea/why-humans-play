import { describe, expect, it } from 'vitest';
import {
  ClaudeBackend,
  mapClaudeSandbox,
  mapClaudeUsage,
  transformClaudePrompt,
} from '../../src/backends/index.js';
import type { JobEnvelope } from '../../src/types.js';

const base: JobEnvelope = {
  jobId: 'jc1', prompt: 'P', cwd: '/repo', sandbox: 'read-only', backend: 'claude',
};

describe('ClaudeBackend.buildArgs', () => {
  it('builds a base read-only print run reading stdin (no trailing dash)', () => {
    expect(new ClaudeBackend().buildArgs(base)).toEqual([
      '-p', '--output-format', 'stream-json', '--verbose',
      '--permission-mode', 'plan',
    ]);
  });

  it('adds model, claude-set effort, inline json-schema, resume, and the sandbox flags', () => {
    const args = new ClaudeBackend().buildArgs({
      ...base,
      sandbox: 'workspace-write',
      model: 'claude-opus-4-8',
      effort: 'high',
      outputSchema: { type: 'object' },
      resumeThreadId: 'sess-1',
    });
    expect(args).toEqual([
      '-p', '--output-format', 'stream-json', '--verbose',
      '--model', 'claude-opus-4-8',
      '--effort', 'high',
      '--json-schema', '{"type":"object"}',
      '--resume', 'sess-1',
      '--permission-mode', 'acceptEdits',
    ]);
  });

  it('passes the output schema through as a stringified inline argument', () => {
    const schema = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] };
    const args = new ClaudeBackend().buildArgs({ ...base, outputSchema: schema });
    expect(args[args.indexOf('--json-schema') + 1]).toBe(JSON.stringify(schema));
  });

  it('forwards effort only when the value is in the claude accepted set', () => {
    expect(new ClaudeBackend().buildArgs({ ...base, effort: 'xhigh' }))
      .toContain('--effort');
    // `minimal` is a codex-only level Claude rejects; it must be dropped.
    expect(new ClaudeBackend().buildArgs({ ...base, effort: 'minimal' }))
      .not.toContain('--effort');
  });

  it('maps sandbox intent onto permission modes', () => {
    expect(mapClaudeSandbox('read-only')).toEqual(['--permission-mode', 'plan']);
    expect(mapClaudeSandbox('workspace-write'))
      .toEqual(['--permission-mode', 'acceptEdits']);
  });
});

describe('transformClaudePrompt', () => {
  it('rewrites only the leading $skill line into an explicit instruction', () => {
    expect(transformClaudePrompt(
      '$writing-whp-youtube-scripts\nOperation: Review\nInputs: {"a":1}',
    )).toBe(
      'Use the "writing-whp-youtube-scripts" skill.\nOperation: Review\nInputs: {"a":1}',
    );
  });

  it('leaves a prompt without a leading $skill line untouched', () => {
    expect(transformClaudePrompt('Operation: Review\nInputs: {}'))
      .toBe('Operation: Review\nInputs: {}');
  });
});

describe('ClaudeBackend.parseLine translation', () => {
  const init = '{"type":"system","subtype":"init","session_id":"sess-9"}';

  it('captures the session id and emits a single thread.started', () => {
    const backend = new ClaudeBackend();
    const first = backend.parseLine(init);
    expect(first.sessionId).toBe('sess-9');
    expect(first.translatedEvents).toEqual([
      JSON.stringify({ type: 'thread.started', thread_id: 'sess-9' }),
    ]);
    // A later event carrying the same session id must not re-emit thread.started.
    const second = backend.parseLine(
      '{"type":"assistant","session_id":"sess-9","message":{"content":[]}}',
    );
    expect(second.sessionId).toBe('sess-9');
    expect(second.translatedEvents).toBeUndefined();
  });

  it('translates a success result into turn.completed with mapped usage and captures the final text', () => {
    const backend = new ClaudeBackend();
    backend.parseLine(init);
    const result = backend.parseLine(JSON.stringify({
      type: 'result', subtype: 'success', is_error: false, result: 'HELLO',
      session_id: 'sess-9',
      usage: { input_tokens: 10, cache_read_input_tokens: 3, output_tokens: 5 },
    }));
    expect(result.finalMessage).toBe('HELLO');
    expect(result.usage).toEqual({
      input_tokens: 10, cached_input_tokens: 3, output_tokens: 5,
      reasoning_output_tokens: 0,
    });
    expect(result.translatedEvents).toEqual([
      JSON.stringify({
        type: 'turn.completed',
        usage: {
          input_tokens: 10, cached_input_tokens: 3, output_tokens: 5,
          reasoning_output_tokens: 0,
        },
      }),
    ]);
  });

  it('translates an is_error result into turn.failed with its message', () => {
    const backend = new ClaudeBackend();
    backend.parseLine(init);
    const failed = backend.parseLine(JSON.stringify({
      type: 'result', is_error: true, subtype: 'api_error', result: 'boom',
      session_id: 'sess-9',
    }));
    expect(failed.failed).toBe('boom');
    expect(failed.usage).toBeUndefined();
    expect(failed.translatedEvents).toEqual([
      JSON.stringify({ type: 'turn.failed', error: { message: 'boom' } }),
    ]);
  });

  it('falls back to the subtype when an errored result carries no message', () => {
    const backend = new ClaudeBackend();
    backend.parseLine(init);
    expect(backend.parseLine(
      '{"type":"result","is_error":true,"subtype":"api_error","session_id":"sess-9"}',
    ).failed).toBe('api_error');
  });

  it('emits turn.completed without usage when the result lacks usage', () => {
    const backend = new ClaudeBackend();
    backend.parseLine(init);
    const result = backend.parseLine(
      '{"type":"result","is_error":false,"result":"X","session_id":"sess-9"}',
    );
    expect(result.usage).toBeUndefined();
    expect(result.translatedEvents).toEqual([
      JSON.stringify({ type: 'turn.completed' }),
    ]);
  });

  it('returns an empty result for a malformed line', () => {
    expect(new ClaudeBackend().parseLine('{broken')).toEqual({});
  });
});

describe('mapClaudeUsage', () => {
  it('maps cache_read_input_tokens and fixes reasoning at zero', () => {
    expect(mapClaudeUsage({
      input_tokens: 7, cache_read_input_tokens: 4,
      cache_creation_input_tokens: 99, output_tokens: 2,
    })).toEqual({
      input_tokens: 7, cached_input_tokens: 4, output_tokens: 2,
      reasoning_output_tokens: 0,
    });
  });

  it('defaults cached tokens to zero when cache_read is absent', () => {
    expect(mapClaudeUsage({ input_tokens: 7, output_tokens: 2 })).toEqual({
      input_tokens: 7, cached_input_tokens: 0, output_tokens: 2,
      reasoning_output_tokens: 0,
    });
  });

  it('treats missing or non-numeric input/output counts as unavailable', () => {
    expect(mapClaudeUsage({ output_tokens: 2 })).toBeUndefined();
    expect(mapClaudeUsage({ input_tokens: 'x', output_tokens: 2 })).toBeUndefined();
    expect(mapClaudeUsage(undefined)).toBeUndefined();
  });
});
