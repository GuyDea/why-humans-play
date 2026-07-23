export interface JobEnvelope {
  jobId: string;
  prompt: string;
  cwd: string;
  sandbox: 'read-only' | 'workspace-write';
  outputSchema?: Record<string, unknown>;
  resumeThreadId?: string;
  codexBin?: string;   // test override; default 'codex'
  graceMs?: number;    // cancel escalation grace; default 5000
}

export interface RunnerPaths {
  jobDir: string;
  eventsFile: string;      // <jobDir>/events.jsonl
  statusFile: string;      // <jobDir>/status.json
  finalMessageFile: string; // <jobDir>/final-message.txt
  schemaFile: string;      // <jobDir>/schema.json (written only when outputSchema set)
}

export interface RunnerUsage {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
}

export type RunnerState = 'running' | 'completed' | 'failed' | 'cancelled';

export interface RunnerStatus {
  state: RunnerState;
  pid: number;
  pgid: number;
  threadId?: string;
  exitCode?: number;
  startedAt: string;
  finishedAt?: string;
  usage?: RunnerUsage;        // absent → persist as unavailable
  errorMessage?: string;
}

export interface CodexEvent {
  seq: number;
  raw: string;
  parsed?: { type: string } & Record<string, unknown>;
}

export type JobState =
  | 'queued' | 'running' | 'interrupted' | 'cancelling' | 'cancelled'
  | 'completed' | 'failed' | 'invalid-output';

export type OperationState = JobState | 'timed-out';

export interface JobRecord {
  id: string;
  operationId: string | null;
  state: JobState;
  envelopeJson: string;
  jobDir: string;
  threadId: string | null;
  retryOf: string | null;
  resumedFrom: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningOutputTokens: number | null;
  usageAvailable: 0 | 1;
  error: string | null;
}

export interface StoredOperation {
  id: string;
  name: string;
  deadlineAt: string;
  createdAt: string;
  state: OperationState;
}
