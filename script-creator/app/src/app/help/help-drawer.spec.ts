import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HelpDrawer } from './help-drawer';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch {
    // The test environment persists across specs in a worker; ignore re-init.
  }
});

describe('HelpDrawer reference panel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('is a pure glossary and editorial-method reference', () => {
    const fixture = TestBed.createComponent(HelpDrawer);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    // Glossary + method owners are present.
    expect(el.querySelector('#glossary-heading')?.textContent).toContain(
      'Glossary',
    );
    expect(el.querySelector('#method-heading')?.textContent).toContain(
      'Editorial method',
    );
    expect(el.textContent).toContain('choosing-whp-video-topic');
    expect(el.textContent).toContain('writing-whp-youtube-scripts');
    expect(el.textContent).toContain('.agents/skills/');

    // Per-region / on-this-page content and help-mode wiring have moved out of
    // the reference panel — those live in the anchored Help-mode popover now.
    expect(el.querySelector('[data-testid="help-topic"]')).toBeNull();
    expect(el.querySelector('[data-testid="help-component"]')).toBeNull();
    expect(el.querySelector('.help-mode-hint')).toBeNull();
    expect(el.textContent).not.toContain('On this page');
  });
});
