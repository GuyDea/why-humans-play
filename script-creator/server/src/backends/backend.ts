import type { JobEnvelope, RunnerPaths, RunnerUsage } from '../types.js';

/**
 * The result of interpreting one raw stdout line emitted by a runner backend.
 * The runner journals the raw line verbatim, then applies these fields:
 *   - sessionId: captured into status.json threadId (first non-empty wins).
 *   - usage: recorded as the run's token usage (absent → "unavailable").
 *   - failed: marks the run failed with this message.
 *   - finalMessage: captured final text; written to final-message.txt when the
 *     backend does not write that file itself (see writesFinalMessageFile).
 *   - translatedEvents: additional codex-shaped JSON lines to journal so the
 *     downstream progress/console parsers keep working across backends.
 */
export interface ParsedLine {
  sessionId?: string;
  usage?: RunnerUsage;
  failed?: string;
  finalMessage?: string;
  translatedEvents?: string[];
}

/**
 * A pluggable runner backend. The runner selects one from the envelope and
 * drives the child process through it, preserving the on-disk contract
 * (events.jsonl / status.json / final-message.txt) regardless of the CLI used.
 */
export interface RunnerBackend {
  /** Identifies the backend; also used in the generic "<name> exited N" error. */
  readonly name: 'codex' | 'claude';
  /**
   * Whether the CLI writes final-message.txt itself (codex via `-o`). When
   * false the runner writes it from the captured ParsedLine.finalMessage.
   */
  readonly writesFinalMessageFile: boolean;
  /** Build the child-process arguments (excluding the binary itself). */
  buildArgs(env: JobEnvelope, paths: RunnerPaths): string[];
  /** Rewrite the stdin prompt for the target CLI (codex = identity). */
  transformPrompt(prompt: string): string;
  /** Interpret one raw stdout line. May keep per-run state across calls. */
  parseLine(rawLine: string): ParsedLine;
}
