import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HELP_MASTHEAD } from './help-content';
import { HelpModeService } from './help-mode.service';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch {
    // The test environment persists across specs in a worker; ignore re-init.
  }
});

describe('HelpModeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('activates and deactivates help mode', () => {
    const service = TestBed.inject(HelpModeService);
    expect(service.active()).toBe(false);
    service.activate();
    expect(service.active()).toBe(true);
    service.deactivate();
    expect(service.active()).toBe(false);
  });

  it('selects a known id and resolves the component, ignoring unknown ids', () => {
    const service = TestBed.inject(HelpModeService);
    const known = HELP_MASTHEAD[0].id; // 'masthead.nav', authored in Task 1
    service.select('nope.nope');
    expect(service.selectedId()).toBeNull();
    service.select(known);
    expect(service.selectedId()).toBe(known);
    expect(service.selected()?.id).toBe(known);
  });

  it('clears selection and clears on deactivate', () => {
    const service = TestBed.inject(HelpModeService);
    service.activate();
    service.select('masthead.nav'); // resolves once masthead content exists (Task 1)
    service.clear();
    expect(service.selectedId()).toBeNull();
    service.select('masthead.nav');
    service.deactivate();
    expect(service.selectedId()).toBeNull();
    expect(service.active()).toBe(false);
  });

  it('clears selection when the route changes', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
    const service = TestBed.inject(HelpModeService);
    const router = TestBed.inject(Router);
    service.activate();
    service.select('masthead.nav');
    await router.navigateByUrl('/topics');
    expect(service.selectedId()).toBeNull();
  });
});
