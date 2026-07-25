import '@angular/compiler';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { provideZonelessChangeDetection, signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { ActiveOperationsService, type ActiveOp } from './active-operations.service';
import { ProcessingChip } from './processing-chip';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch { /* re-init across workers is fine */ }
});

afterEach(() => TestBed.resetTestingModule());

class StubService {
  readonly active = signal<readonly ActiveOp[]>([]);
  readonly activeOperations: Signal<readonly ActiveOp[]> = this.active;
  ensureStarted(): void { /* no-op in tests */ }
}

function setup(active: readonly ActiveOp[], operations?: string[]) {
  const stub = new StubService();
  stub.active.set(active);
  TestBed.configureTestingModule({
    imports: [ProcessingChip],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ActiveOperationsService, useValue: stub },
    ],
  });
  const fixture = TestBed.createComponent(ProcessingChip);
  if (operations) fixture.componentRef.setInput('operations', operations);
  fixture.detectChanges();
  return fixture;
}

const runningIdeate: ActiveOp =
  { id: 'op-9', name: 'ideate', state: 'running', stalled: false };

describe('ProcessingChip', () => {
  it('is empty when nothing matches', () => {
    const fixture = setup([]);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('shows "In Processing" and links to the Console trace', () => {
    const fixture = setup([runningIdeate]);
    const link = fixture.nativeElement.querySelector('a');
    expect(fixture.nativeElement.textContent).toContain('In Processing');
    expect(link.getAttribute('href')).toContain('/console');
    expect(link.getAttribute('href')).toContain('op=op-9');
  });

  it('honours the operations filter', () => {
    const fixture = setup([runningIdeate], ['review']);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
});
