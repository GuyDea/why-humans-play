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

  it('omits model and effort flags when unset', () => {
    const args = buildCodexArgs(base, paths);
    expect(args).not.toContain('-m');
    expect(args.some((arg) => arg.startsWith('model_reasoning_effort='))).toBe(
      false,
    );
  });

  it('appends model and effort flags after --json group, before the trailing -', () => {
    const args = buildCodexArgs(
      { ...base, outputSchema: { type: 'object' }, model: 'gpt-5.6-sol', effort: 'xhigh' },
      paths,
    );
    expect(args).toEqual([
      'exec', '--json', '-C', '/repo', '-s', 'read-only',
      '-o', '/tmp/j/final-message.txt', '--output-schema', '/tmp/j/schema.json',
      '-m', 'gpt-5.6-sol', '-c', 'model_reasoning_effort=xhigh', '-',
    ]);
  });

  it('emits only the model flag when effort is unset', () => {
    const args = buildCodexArgs({ ...base, model: 'gpt-5.6-sol' }, paths);
    expect(args[args.indexOf('-m') + 1]).toBe('gpt-5.6-sol');
    expect(args.some((arg) => arg.startsWith('model_reasoning_effort='))).toBe(
      false,
    );
    expect(args[args.length - 1]).toBe('-');
  });
});
