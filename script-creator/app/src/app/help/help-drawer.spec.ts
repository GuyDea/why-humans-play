import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HelpDrawer } from './help-drawer';
import { HelpModeService } from './help-mode.service';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch {
    // The test environment persists across specs in a worker; ignore re-init.
  }
});

describe('HelpDrawer component section', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows the page overview when nothing is selected', () => {
    const fixture = TestBed.createComponent(HelpDrawer);
    fixture.detectChanges();
    const topic = fixture.nativeElement.querySelector('[data-testid="help-topic"]');
    expect(topic.textContent).toContain('On this page');
    expect(fixture.nativeElement.querySelector('[data-testid="help-component"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.help-overview-link')).toBeNull();
  });

  it('shows the selected component and clears back to overview', () => {
    const service = TestBed.inject(HelpModeService);
    const fixture = TestBed.createComponent(HelpDrawer);
    fixture.detectChanges();

    service.select('masthead.nav'); // resolves to authored content (Task 1)
    fixture.detectChanges();
    const component = fixture.nativeElement.querySelector('[data-testid="help-component"]');
    expect(component.textContent).toContain('This component');
    expect(component.textContent).toContain('Workbench navigation');

    const overviewLink = fixture.nativeElement.querySelector('.help-overview-link') as HTMLButtonElement;
    expect(overviewLink).not.toBeNull();
    overviewLink.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="help-component"]')).toBeNull();
    expect(service.selectedId()).toBeNull();
  });
});
