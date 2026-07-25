import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HelpModeService } from './help-mode.service';
import { HelpPopover } from './help-popover';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch {
    // Persistent test environment across specs in a worker; ignore re-init.
  }
});

describe('HelpPopover', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the selected region explanation and closes to nothing', () => {
    const service = TestBed.inject(HelpModeService);
    service.activate();
    const fixture = TestBed.createComponent(HelpPopover);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    // Nothing selected → no popover.
    expect(el.querySelector('[data-testid="help-popover"]')).toBeNull();

    service.select('masthead.nav');
    fixture.detectChanges();
    const popover = el.querySelector('[data-testid="help-popover"]');
    expect(popover).not.toBeNull();
    expect(popover!.getAttribute('role')).toBe('dialog');
    expect(popover!.textContent).toContain('Workbench navigation');

    // The close control clears the selection and removes the popover.
    (el.querySelector('.help-popover-close') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="help-popover"]')).toBeNull();
    expect(service.selectedId()).toBeNull();
  });
});
