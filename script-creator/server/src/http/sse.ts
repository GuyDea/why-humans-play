import {
  closeSync,
  existsSync,
  fstatSync,
  openSync,
  readSync,
} from 'node:fs';
import { StringDecoder } from 'node:string_decoder';
import type { CodexEvent, OperationState } from '../types.js';
import type { OperationService } from '../operations/service.js';

const SSE_ROUTE = /^\/api\/ops\/[^/]+\/events$/;
const DEFAULT_POLL_MS = 250;
const HEARTBEAT_MS = 15_000;

type OperationEventSource =
  & Pick<OperationService, 'events' | 'get'>
  & Partial<
    Pick<OperationService, 'state' | 'isTerminal' | 'eventFiles'>
  >;

export interface SseSink {
  write(chunk: string): boolean | void;
  waitForDrain?(): Promise<void>;
  isClosed?(): boolean;
}

export function hasSseQueryNonce(
  method: string,
  requestUrl: string,
  expectedNonce: string,
): boolean {
  if (method !== 'GET') return false;

  const url = new URL(requestUrl, 'http://localhost');
  return SSE_ROUTE.test(url.pathname)
    && url.searchParams.get('nonce') === expectedNonce;
}

export function parseFromSeq(
  queryValue: string | undefined,
  lastEventId: string | string[] | undefined,
): number {
  const value = queryValue
    ?? (Array.isArray(lastEventId) ? lastEventId[0] : lastEventId);
  if (value === undefined || value === '') return 0;
  if (!/^\d+$/.test(value)) {
    throw new Error('fromSeq and Last-Event-ID must be non-negative integers');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error('fromSeq and Last-Event-ID must be safe integers');
  }
  return parsed;
}

export async function pumpOperationEvents(
  source: OperationEventSource,
  operationId: string,
  fromSeq: number,
  sink: SseSink,
): Promise<void> {
  let cursor = fromSeq;
  let nextHeartbeatAt = Date.now() + HEARTBEAT_MS;
  source.get(operationId);
  const fileCursor = source.eventFiles
    ? new OperationEventFileCursor(fromSeq)
    : undefined;

  while (!sink.isClosed?.()) {
    const events = fileCursor && source.eventFiles
      ? fileCursor.read(source.eventFiles(operationId))
      : source.events(operationId, cursor);
    for (const event of events) {
      if (!await writeChunk(sink, formatCodexEvent(event))) return;
      cursor = Math.max(cursor, event.seq);
    }

    const terminal = source.isTerminal
      ? source.isTerminal(operationId)
      : isTerminal(
        source.state
          ? source.state(operationId)
          : source.get(operationId).state,
      );
    if (terminal) {
      await writeChunk(sink, 'event: done\ndata: {}\n\n');
      return;
    }

    const now = Date.now();
    if (now >= nextHeartbeatAt) {
      if (!await writeChunk(sink, ': heartbeat\n\n')) return;
      do {
        nextHeartbeatAt += HEARTBEAT_MS;
      } while (nextHeartbeatAt <= now);
    }

    await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_MS));
  }
}

class OperationEventFileCursor {
  private readonly attempts: Array<{
    file: string;
    publicOffset: number;
    cursor: EventFileCursor;
  }> = [];

  constructor(private readonly fromSeq: number) {}

  read(files: string[]): CodexEvent[] {
    const events: CodexEvent[] = [];
    for (const file of files) {
      let attempt = this.attempts.find((candidate) => candidate.file === file);
      if (!attempt) {
        const previous = this.attempts.at(-1);
        attempt = {
          file,
          publicOffset: previous
            ? previous.publicOffset + previous.cursor.sequence
            : 0,
          cursor: new EventFileCursor(file),
        };
        this.attempts.push(attempt);
      }
      for (const event of attempt.cursor.read()) {
        const publicEvent = {
          ...event,
          seq: attempt.publicOffset + event.seq,
        };
        if (publicEvent.seq > this.fromSeq) events.push(publicEvent);
      }
    }
    return events;
  }
}

class EventFileCursor {
  offset = 0;
  sequence = 0;
  private carry = '';
  private readonly decoder = new StringDecoder('utf8');

  constructor(private readonly file: string) {}

  read(): CodexEvent[] {
    const bytes = this.readAppendedBytes();
    if (bytes.length === 0) return [];

    const lines = (this.carry + this.decoder.write(bytes)).split('\n');
    this.carry = lines.pop() ?? '';
    const events: CodexEvent[] = [];
    for (const raw of lines) {
      if (raw.length === 0) continue;
      this.sequence += 1;
      events.push(parseEvent(this.sequence, raw));
    }
    return events;
  }

  private readAppendedBytes(): Buffer {
    if (!existsSync(this.file)) return Buffer.alloc(0);

    const descriptor = openSync(this.file, 'r');
    try {
      const size = fstatSync(descriptor).size;
      if (size <= this.offset) return Buffer.alloc(0);
      const bytes = Buffer.alloc(size - this.offset);
      let read = 0;
      while (read < bytes.length) {
        const count = readSync(
          descriptor,
          bytes,
          read,
          bytes.length - read,
          this.offset + read,
        );
        if (count === 0) break;
        read += count;
      }
      this.offset += read;
      return read === bytes.length ? bytes : bytes.subarray(0, read);
    } finally {
      closeSync(descriptor);
    }
  }
}

function parseEvent(sequence: number, raw: string): CodexEvent {
  let parsed: CodexEvent['parsed'];
  try {
    const value = JSON.parse(raw) as unknown;
    if (
      value
      && typeof value === 'object'
      && typeof (value as { type?: unknown }).type === 'string'
    ) {
      parsed = value as CodexEvent['parsed'];
    }
  } catch {
    // Malformed lines remain available as raw SSE data.
  }
  return { seq: sequence, raw, parsed };
}

async function writeChunk(sink: SseSink, chunk: string): Promise<boolean> {
  const canContinue = sink.write(chunk);
  if (canContinue === false && sink.waitForDrain) {
    await sink.waitForDrain();
  }
  return !sink.isClosed?.();
}

function formatCodexEvent(event: CodexEvent): string {
  return `id: ${event.seq}\nevent: codex\ndata: ${event.raw}\n\n`;
}

function isTerminal(state: OperationState): boolean {
  return !['queued', 'running', 'cancelling'].includes(state);
}
