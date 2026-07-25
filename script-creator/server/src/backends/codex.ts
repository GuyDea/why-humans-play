import { buildCodexArgs } from '../codex-args.js';
import type { JobEnvelope, RunnerPaths, RunnerUsage } from '../types.js';
import type { ParsedLine, RunnerBackend } from './backend.js';

/**
 * Validate a codex `turn.completed` usage object. All four fields must be
 * finite numbers or the usage is treated as unavailable.
 */
export function validCodexUsage(value: unknown): RunnerUsage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const fields = [
    candidate.input_tokens,
    candidate.cached_input_tokens,
    candidate.output_tokens,
    candidate.reasoning_output_tokens,
  ];
  if (!fields.every((field) => typeof field === 'number' && Number.isFinite(field))) {
    return undefined;
  }
  return {
    input_tokens: candidate.input_tokens as number,
    cached_input_tokens: candidate.cached_input_tokens as number,
    output_tokens: candidate.output_tokens as number,
    reasoning_output_tokens: candidate.reasoning_output_tokens as number,
  };
}

/**
 * The codex backend. Its stdout is already the codex event vocabulary the rest
 * of the system consumes, so it emits no translated events and writes
 * final-message.txt itself via codex's `-o` flag.
 */
export class CodexBackend implements RunnerBackend {
  readonly name = 'codex' as const;
  readonly writesFinalMessageFile = true;

  buildArgs(env: JobEnvelope, paths: RunnerPaths): string[] {
    return buildCodexArgs(env, paths);
  }

  transformPrompt(prompt: string): string {
    return prompt;
  }

  parseLine(rawLine: string): ParsedLine {
    let event: Record<string, unknown> & { error?: { message?: unknown } };
    try {
      event = JSON.parse(rawLine);
    } catch {
      return {};
    }
    if (!event || typeof event !== 'object') return {};
    const out: ParsedLine = {};
    if (event.type === 'thread.started' && typeof event.thread_id === 'string') {
      out.sessionId = event.thread_id;
    }
    if (event.type === 'turn.completed') {
      const usage = validCodexUsage(event.usage);
      if (usage) out.usage = usage;
    }
    if (event.type === 'turn.failed') {
      out.failed = typeof event.error?.message === 'string'
        ? event.error.message
        : 'turn failed';
    }
    return out;
  }
}
