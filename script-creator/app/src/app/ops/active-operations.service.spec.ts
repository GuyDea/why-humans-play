import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import type {
  DaemonClient,
  OperationListResponse,
  StreamEventsOptions,
} from '../api/client';
import { StudioSession, STUDIO_SESSION } from '../studio-session';
import { ActiveOperationsService } from './active-operations.service';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch { /* re-init across workers is fine */ }
});

afterEach(() => {
  TestBed.resetTestingModule();
});

function client(list: OperationListResponse): DaemonClient {
  return {
    listOps: vi.fn(async () => list),
    // Never resolves: keeps an adopted op in the 'streaming' (active) phase for
    // the duration of the assertions instead of letting it settle.
    streamEvents: vi.fn((_id: string, _o: StreamEventsOptions) =>
      new Promise<void>(() => undefined)),
    getOp: vi.fn(async () => ({ state: 'running', error: null, stalled: false })),
    getResult: vi.fn(async () => ({ kind: 'pending' })),
    cancel: vi.fn(async (id: string) => ({ id })),
  } as unknown as DaemonClient;
}

function setup(list: OperationListResponse): ActiveOperationsService {
  const session = new StudioSession(client(list));
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: STUDIO_SESSION, useValue: session },
      ActiveOperationsService,
    ],
  });
  return TestBed.inject(ActiveOperationsService);
}

describe('ActiveOperationsService', () => {
  it('adopts non-terminal server ops and omits terminal ones', async () => {
    const service = setup({
      operations: [
        { id: 'a', operation: 'ideate', state: 'running', stalled: false,
          createdAt: '', finishedAt: null, usageAvailable: 0,
          inputTokens: null, cachedInputTokens: null, outputTokens: null,
          reasoningOutputTokens: null },
        { id: 'b', operation: 'review', state: 'completed', stalled: false,
          createdAt: '', finishedAt: null, usageAvailable: 0,
          inputTokens: null, cachedInputTokens: null, outputTokens: null,
          reasoningOutputTokens: null },
      ],
    });
    await service.pollOnce();
    const active = service.activeOperations();
    expect(active.map((o) => o.id)).toEqual(['a']);
    expect(active[0].name).toBe('ideate');
  });

  it('does not adopt the same id twice across polls', async () => {
    const service = setup({
      operations: [
        { id: 'a', operation: 'ideate', state: 'running', stalled: false,
          createdAt: '', finishedAt: null, usageAvailable: 0,
          inputTokens: null, cachedInputTokens: null, outputTokens: null,
          reasoningOutputTokens: null },
      ],
    });
    await service.pollOnce();
    await service.pollOnce();
    expect(service.activeOperations().filter((o) => o.id === 'a')).toHaveLength(1);
  });
});
