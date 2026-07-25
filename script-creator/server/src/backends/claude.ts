import type { JobEnvelope, RunnerUsage } from '../types.js';
import type { ParsedLine, RunnerBackend } from './backend.js';

/**
 * Effort levels the Claude CLI accepts (`--effort`). The server's effort set
 * additionally allows `minimal`, which Claude rejects, so it is dropped here.
 */
export const CLAUDE_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);

/**
 * Map an operation's sandbox intent onto Claude's `--permission-mode`:
 *   - read-only     → plan: the built-in read-only mode. Allows reading files
 *     and read-only shell but blocks every file write/edit. Never prompts.
 *   - workspace-write → acceptEdits: auto-accepts file edits/writes without
 *     prompting. Non-edit tools stay gated (auto-denied in headless, never
 *     hang), so it grants exactly the write capability the mode is named for.
 */
export function mapClaudeSandbox(
  sandbox: 'read-only' | 'workspace-write',
): string[] {
  return sandbox === 'workspace-write'
    ? ['--permission-mode', 'acceptEdits']
    : ['--permission-mode', 'plan'];
}

/**
 * Rewrite only the leading `$<skill>` line (codex's skill-invocation syntax,
 * which Claude does not interpret) into an explicit instruction. The remaining
 * `Operation:` / `Inputs:` lines are preserved verbatim.
 */
export function transformClaudePrompt(prompt: string): string {
  const newlineIndex = prompt.indexOf('\n');
  const firstLine = newlineIndex === -1 ? prompt : prompt.slice(0, newlineIndex);
  const rest = newlineIndex === -1 ? '' : prompt.slice(newlineIndex);
  const match = /^\$(\S+)$/.exec(firstLine);
  if (!match) return prompt;
  return `Use the "${match[1]}" skill.${rest}`;
}

/**
 * Map a Claude result-event usage object onto the codex-shaped RunnerUsage.
 * cache_read_input_tokens → cached_input_tokens; reasoning is not reported by
 * Claude so it is fixed at 0. When input/output counts are missing the usage
 * is treated as unavailable (returns undefined), matching the codex path.
 */
export function mapClaudeUsage(usage: unknown): RunnerUsage | undefined {
  if (!usage || typeof usage !== 'object') return undefined;
  const candidate = usage as Record<string, unknown>;
  const input = candidate.input_tokens;
  const output = candidate.output_tokens;
  if (typeof input !== 'number' || !Number.isFinite(input)) return undefined;
  if (typeof output !== 'number' || !Number.isFinite(output)) return undefined;
  const cacheRead = candidate.cache_read_input_tokens;
  return {
    input_tokens: input,
    cached_input_tokens: typeof cacheRead === 'number' && Number.isFinite(cacheRead)
      ? cacheRead
      : 0,
    output_tokens: output,
    reasoning_output_tokens: 0,
  };
}

/**
 * The Claude Code CLI backend. It reads Claude's stream-json stdout and
 * translates it into the codex event vocabulary the rest of the system needs,
 * captures the final result text (Claude has no `-o`), and maps token usage.
 */
export class ClaudeBackend implements RunnerBackend {
  readonly name = 'claude' as const;
  readonly writesFinalMessageFile = false;
  private threadStartedEmitted = false;

  buildArgs(env: JobEnvelope): string[] {
    const args = ['-p', '--output-format', 'stream-json', '--verbose'];
    if (env.model) args.push('--model', env.model);
    if (env.effort && CLAUDE_EFFORTS.has(env.effort)) {
      args.push('--effort', env.effort);
    }
    if (env.outputSchema) {
      args.push('--json-schema', JSON.stringify(env.outputSchema));
    }
    if (env.resumeThreadId) args.push('--resume', env.resumeThreadId);
    args.push(...mapClaudeSandbox(env.sandbox));
    return args;
  }

  transformPrompt(prompt: string): string {
    return transformClaudePrompt(prompt);
  }

  parseLine(rawLine: string): ParsedLine {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawLine);
    } catch {
      return {};
    }
    if (!event || typeof event !== 'object') return {};

    const out: ParsedLine = {};
    const translated: string[] = [];

    // Every Claude event carries the session id; the first non-empty one seeds
    // the thread id (for status.json + resume) and a single thread.started.
    if (typeof event.session_id === 'string' && event.session_id) {
      out.sessionId = event.session_id;
      if (!this.threadStartedEmitted) {
        this.threadStartedEmitted = true;
        translated.push(JSON.stringify({
          type: 'thread.started',
          thread_id: event.session_id,
        }));
      }
    }

    if (event.type === 'result') {
      const resultText = typeof event.result === 'string'
        ? event.result
        : undefined;
      if (event.is_error === true) {
        const message = resultText && resultText.length > 0
          ? resultText
          : typeof event.subtype === 'string' ? event.subtype : 'turn failed';
        out.failed = message;
        translated.push(JSON.stringify({
          type: 'turn.failed',
          error: { message },
        }));
      } else {
        out.finalMessage = resultText ?? '';
        const usage = mapClaudeUsage(event.usage);
        if (usage) out.usage = usage;
        translated.push(JSON.stringify(
          usage ? { type: 'turn.completed', usage } : { type: 'turn.completed' },
        ));
      }
    }

    if (translated.length > 0) out.translatedEvents = translated;
    return out;
  }
}
