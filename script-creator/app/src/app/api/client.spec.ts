import { afterEach, describe, expect, it, vi } from 'vitest';
import { DaemonClient, type SseFrame } from './client';

const BASE_URL = 'http://127.0.0.1:4310';
const NONCE = 'task-3-nonce';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    },
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DaemonClient', () => {
  it('lists durable operation summaries with the nonce', async () => {
    const response = {
      operations: [
        {
          id: 'op-2',
          operation: 'review',
          state: 'completed',
          createdAt: '2026-07-23T11:00:00.000Z',
          finishedAt: '2026-07-23T11:00:05.000Z',
          stalled: false,
          usageAvailable: 1,
          inputTokens: 120,
          cachedInputTokens: 40,
          outputTokens: 30,
          reasoningOutputTokens: 12,
        },
      ],
    };
    const fetchMock = vi.fn(async () => jsonResponse(response));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);

    const listOps = (
      client as DaemonClient & {
        listOps?: () => Promise<typeof response>;
      }
    ).listOps;
    expect(listOps).toBeTypeOf('function');
    if (!listOps) return;
    await expect(listOps.call(client)).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/ops`,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('x-sc-nonce'))
      .toBe(NONCE);
  });

  it('maps operation, draft, and validator calls and authenticates every request', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(`${BASE_URL}/`, () => NONCE);
    const doc = { type: 'doc', attrs: { format: 'narration' }, content: [] };

    await client.submitOp('review', { selection: 'A passage.' });
    await client.getOp('op-1');
    await client.getResult('op-1');
    await client.cancel('op-1');
    await client.resume('op-1', { selection: 'A tighter passage.' });
    await client.list();
    await client.create({
      episodeSlug: 'episode',
      title: 'Episode',
      format: 'narration',
      doc,
    });
    await client.get('draft-1');
    await client.save('draft-1', {
      doc,
      opId: 'op-1',
      disposition: 'accepted',
    });
    await client.listRevisions('draft-1');
    await client.import('# Imported episode');
    await client.export('draft-1');
    await client.writeArtifact(
      'whp-youtube/drafts/episode.md',
      '# Exported episode',
      { expectNew: true },
    );
    await client.validate('whp-youtube/episodes/episode.md');

    expect(fetchMock).toHaveBeenCalledTimes(14);
    expect(fetchMock.mock.calls.map(([input, init]) => ({
      url: input,
      method: init?.method ?? 'GET',
      nonce: new Headers(init?.headers).get('x-sc-nonce'),
      body: init?.body,
    }))).toEqual([
      {
        url: `${BASE_URL}/api/ops`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          operation: 'review',
          inputs: { selection: 'A passage.' },
        }),
      },
      {
        url: `${BASE_URL}/api/ops/op-1`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/ops/op-1/result`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/ops/op-1/cancel`,
        method: 'POST',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/ops/op-1/resume`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ inputs: { selection: 'A tighter passage.' } }),
      },
      {
        url: `${BASE_URL}/api/drafts`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          episodeSlug: 'episode',
          title: 'Episode',
          format: 'narration',
          doc,
        }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft-1`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/draft-1`,
        method: 'PUT',
        nonce: NONCE,
        body: JSON.stringify({
          doc,
          opId: 'op-1',
          disposition: 'accepted',
        }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft-1/revisions`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/drafts/import`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ markdown: '# Imported episode' }),
      },
      {
        url: `${BASE_URL}/api/drafts/draft-1/export`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/artifacts`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          path: 'whp-youtube/drafts/episode.md',
          content: '# Exported episode',
          expectedState: { expectNew: true },
        }),
      },
      {
        url: `${BASE_URL}/api/validate`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({ path: 'whp-youtube/episodes/episode.md' }),
      },
    ]);
  });

  it('maps idea inbox calls and authenticates every request', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);

    await client.listIdeas();
    await client.createIdea({
      text: 'Why players choose harsher rules',
      source: 'inbox',
    });
    await client.updateIdea('idea/one', { status: 'discarded' });
    await client.deleteIdea('idea/one');

    expect(fetchMock.mock.calls.map(([input, init]) => ({
      url: input,
      method: init?.method ?? 'GET',
      nonce: new Headers(init?.headers).get('x-sc-nonce'),
      body: init?.body,
    }))).toEqual([
      {
        url: `${BASE_URL}/api/ideas`,
        method: 'GET',
        nonce: NONCE,
        body: undefined,
      },
      {
        url: `${BASE_URL}/api/ideas`,
        method: 'POST',
        nonce: NONCE,
        body: JSON.stringify({
          text: 'Why players choose harsher rules',
          source: 'inbox',
        }),
      },
      {
        url: `${BASE_URL}/api/ideas/idea%2Fone`,
        method: 'PATCH',
        nonce: NONCE,
        body: JSON.stringify({ status: 'discarded' }),
      },
      {
        url: `${BASE_URL}/api/ideas/idea%2Fone`,
        method: 'DELETE',
        nonce: NONCE,
        body: undefined,
      },
    ]);
  });

  it('parses split SSE frames exactly and reconnects with the latest event id after a drop', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(sseResponse([
        'id: 17\nevent: cod',
        'ex\ndata: {"type":"turn.started"}\n',
        '\n',
      ]))
      .mockResolvedValueOnce(sseResponse([
        'id: 18\nevent: codex\ndata: first line\nda',
        'ta: second line\n\nevent: done\ndata: {}\n\n',
        'id: 19\nevent: codex\ndata: after done\n\n',
      ]));
    vi.stubGlobal('fetch', fetchMock);
    const client = new DaemonClient(BASE_URL, () => NONCE);
    const frames: SseFrame[] = [];
    const onDone = vi.fn();
    const onError = vi.fn();

    const streaming = client.streamEvents('op-1', {
      lastEventId: '16',
      onEvent: (frame) => frames.push(frame),
      onDone,
      onError,
    });
    await vi.runAllTimersAsync();
    await streaming;

    expect(frames).toEqual([
      {
        id: '17',
        event: 'codex',
        data: '{"type":"turn.started"}',
      },
      {
        id: '18',
        event: 'codex',
        data: 'first line\nsecond line',
      },
    ]);
    expect(onDone).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('last-event-id'))
      .toBe('16');
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('last-event-id'))
      .toBe('17');
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get('x-sc-nonce')).toBe(NONCE);
    }
  });
});
