export type OperationName =
  | 'generate-scoped'
  | 'generate-episode'
  | 'review'
  | 'rewrite-selection'
  | 'generate-alternatives'
  | 'promote'
  | 'ideate'
  | 'quick-gate-check'
  | 'package-test'
  | 'full-topic-run'
  | 'handoff-preview'
  | 'distill';

export type OperationState =
  | 'queued'
  | 'running'
  | 'interrupted'
  | 'cancelling'
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'invalid-output'
  | 'timed-out';

export interface OperationRecord {
  id: string;
  operation: OperationName;
  state: OperationState;
  stalled: boolean;
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

export type OperationResult =
  | { kind: 'schema'; value: unknown; guardrail: string | null }
  | { kind: 'raw'; markdown: string }
  | { kind: 'failed'; error: string }
  | { kind: 'pending' };

export interface DraftDocument {
  [key: string]: unknown;
}

export type DraftFormat = 'annotated' | 'narration';

export interface DraftRecord {
  id: string;
  episodeSlug: string;
  title: string;
  format: DraftFormat;
  doc: DraftDocument;
  updatedAt: string;
}

export interface RevisionRecord {
  id: string;
  draftId: string;
  seq: number;
  opId: string | null;
  disposition: string;
  doc: DraftDocument;
  createdAt: string;
}

export interface CreateDraftInput {
  episodeSlug: string;
  title: string;
  format: DraftFormat;
  doc: DraftDocument;
}

export interface SaveDraftInput {
  title?: string;
  format?: DraftFormat;
  doc: DraftDocument;
  opId?: string | null;
  disposition?: string;
}

export interface SavedDraft {
  draft: DraftRecord;
  revision: RevisionRecord;
}

export interface ValidatorDiagnostic {
  message: string;
  line: number | null;
}

export interface ValidatorResult {
  ok: boolean;
  errors: ValidatorDiagnostic[];
}

export interface SseFrame {
  id: string;
  event: string;
  data: string;
}

export interface StreamEventsOptions {
  lastEventId?: string;
  onEvent(frame: SseFrame): void | Promise<void>;
  onDone(): void | Promise<void>;
  onError(error: unknown): void | Promise<void>;
}

export type NonceProvider = () => string | null;

export class DaemonClientError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(errorMessage(status, body));
    this.name = 'DaemonClientError';
  }
}

const INITIAL_RECONNECT_MS = 250;
const MAX_RECONNECT_MS = 5_000;

export class DaemonClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly nonceProvider: NonceProvider,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async submitOp(
    operation: OperationName,
    inputs: unknown,
  ): Promise<{ id: string }> {
    return this.request('/api/ops', {
      method: 'POST',
      body: JSON.stringify({ operation, inputs }),
    });
  }

  async getOp(id: string): Promise<OperationRecord> {
    return this.request(`/api/ops/${encodeURIComponent(id)}`);
  }

  async getResult(id: string): Promise<OperationResult> {
    return this.request(`/api/ops/${encodeURIComponent(id)}/result`);
  }

  async cancel(id: string): Promise<{ id: string }> {
    return this.request(`/api/ops/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
  }

  async resume(id: string, inputs: unknown): Promise<{ id: string }> {
    return this.request(`/api/ops/${encodeURIComponent(id)}/resume`, {
      method: 'POST',
      body: JSON.stringify({ inputs }),
    });
  }

  async streamEvents(
    id: string,
    options: StreamEventsOptions,
  ): Promise<void> {
    let lastEventId = options.lastEventId;
    let reconnectMs = INITIAL_RECONNECT_MS;

    for (;;) {
      try {
        const headers = this.authHeaders();
        headers.set('accept', 'text/event-stream');
        if (lastEventId) headers.set('last-event-id', lastEventId);

        const response = await fetch(
          `${this.baseUrl}/api/ops/${encodeURIComponent(id)}/events`,
          { headers },
        );
        if (!response.ok) throw await responseError(response);
        if (!response.body) {
          throw new Error('SSE response did not include a readable body');
        }

        const outcome = await consumeSse(response.body, async (frame) => {
          if (frame.id) lastEventId = frame.id;
          if (frame.event === 'done') {
            await options.onDone();
            return false;
          }
          await options.onEvent(frame);
          return true;
        });
        if (outcome === 'stopped') return;
        throw new Error('SSE stream ended before done');
      } catch (error) {
        await options.onError(error);
        await delay(reconnectMs);
        reconnectMs = Math.min(reconnectMs * 2, MAX_RECONNECT_MS);
      }
    }
  }

  async list(): Promise<DraftRecord[]> {
    return this.request('/api/drafts');
  }

  async create(input: CreateDraftInput): Promise<DraftRecord> {
    return this.request('/api/drafts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async get(id: string): Promise<DraftRecord> {
    return this.request(`/api/drafts/${encodeURIComponent(id)}`);
  }

  async save(id: string, input: SaveDraftInput): Promise<SavedDraft> {
    return this.request(`/api/drafts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async import(markdown: string): Promise<DraftRecord> {
    return this.request('/api/drafts/import', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    });
  }

  async export(id: string): Promise<{ markdown: string }> {
    return this.request(`/api/drafts/${encodeURIComponent(id)}/export`);
  }

  async validate(path: string): Promise<ValidatorResult> {
    return this.request('/api/validate', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const headers = this.authHeaders(init.headers);
    if (init.body !== undefined) {
      headers.set('content-type', 'application/json');
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
    if (!response.ok) throw await responseError(response);
    return await readResponseBody(response) as T;
  }

  private authHeaders(existing?: HeadersInit): Headers {
    const nonce = this.nonceProvider();
    if (!nonce) throw new Error('daemon nonce is unavailable');
    const headers = new Headers(existing);
    headers.set('x-sc-nonce', nonce);
    return headers;
  }
}

async function consumeSse(
  stream: ReadableStream<Uint8Array>,
  onFrame: (frame: SseFrame) => boolean | Promise<boolean>,
): Promise<'eof' | 'stopped'> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      if (done) buffer += decoder.decode();

      for (;;) {
        const boundary = /\r?\n\r?\n/.exec(buffer);
        if (!boundary || boundary.index === undefined) break;
        const rawFrame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const frame = parseSseFrame(rawFrame);
        if (frame && !await onFrame(frame)) {
          await reader.cancel().catch(() => undefined);
          return 'stopped';
        }
      }

      if (done) return 'eof';
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSseFrame(rawFrame: string): SseFrame | null {
  const frame: SseFrame = { id: '', event: 'message', data: '' };
  const data: string[] = [];

  for (const line of rawFrame.split(/\r?\n/)) {
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'id' && !value.includes('\0')) frame.id = value;
    if (field === 'event') frame.event = value;
    if (field === 'data') data.push(value);
  }

  frame.data = data.join('\n');
  return frame.id || frame.data || frame.event !== 'message' ? frame : null;
}

async function responseError(response: Response): Promise<DaemonClientError> {
  return new DaemonClientError(
    response.status,
    await readResponseBody(response),
  );
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(status: number, body: unknown): string {
  if (
    body
    && typeof body === 'object'
    && typeof (body as { error?: unknown }).error === 'string'
  ) {
    return (body as { error: string }).error;
  }
  return `daemon request failed with status ${status}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
