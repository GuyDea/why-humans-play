import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  provideZonelessChangeDetection,
  ɵresolveComponentResources,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import type { DaemonClient, StreamEventsOptions } from './api/client';
import { StudioSession, STUDIO_SESSION } from './studio-session';
import { ActiveOperationsService } from './ops/active-operations.service';
import { App } from './app';
import appTemplate from './app.html?raw';
import appStyles from './app.scss?raw';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch { /* re-init across workers is fine */ }
});

function daemon(): DaemonClient {
  return {
    listOps: vi.fn(async () => ({
      operations: [{
        id: 'op-3', operation: 'ideate', state: 'running', stalled: false,
        createdAt: '', finishedAt: null, usageAvailable: 0, inputTokens: null,
        cachedInputTokens: null, outputTokens: null, reasoningOutputTokens: null,
      }],
    })),
    streamEvents: vi.fn((_id: string, _o: StreamEventsOptions) =>
      new Promise<void>(() => undefined)),
    getOp: vi.fn(async () => ({ state: 'running', error: null, stalled: false })),
    getResult: vi.fn(async () => ({ kind: 'pending' })),
    cancel: vi.fn(async (id: string) => ({ id })),
  } as unknown as DaemonClient;
}

describe('App masthead processing chip', () => {
  it('renders the chip in the masthead and reflects an active op', async () => {
    await ɵresolveComponentResources(async (url) =>
      url.endsWith('app.html') ? appTemplate : appStyles);
    const session = new StudioSession(daemon());
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: STUDIO_SESSION, useValue: session },
      ],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(ActiveOperationsService).pollOnce();
    fixture.detectChanges();

    const tools = fixture.nativeElement.querySelector('.masthead-tools');
    expect(tools.querySelector('sc-processing-chip')).toBeTruthy();
    expect(tools.textContent).toContain('In Processing');
  });
});
