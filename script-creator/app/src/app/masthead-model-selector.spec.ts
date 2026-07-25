import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MastheadModelSelector } from './masthead-model-selector';
import { MODEL_OPTIONS } from './ops/model-options';
import {
  DEFAULT_PREFERENCE_KEY,
  ModelPreferenceService,
  type ModelChoice,
} from './ops/model-preference';

beforeAll(() => {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch {
    // The test environment persists across specs in a worker; ignore re-init.
  }
});

describe('MastheadModelSelector', () => {
  let preference: ModelPreferenceService;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  function setup(
    seed?: ModelChoice | null,
  ): ComponentFixture<MastheadModelSelector> {
    TestBed.configureTestingModule({
      imports: [MastheadModelSelector],
      providers: [provideZonelessChangeDetection()],
    });
    preference = TestBed.inject(ModelPreferenceService);
    if (seed !== undefined) preference.set(DEFAULT_PREFERENCE_KEY, seed);
    const fixture = TestBed.createComponent(MastheadModelSelector);
    fixture.detectChanges();
    return fixture;
  }

  function selectOf(
    fixture: ComponentFixture<MastheadModelSelector>,
  ): HTMLSelectElement {
    return fixture.nativeElement.querySelector('select') as HTMLSelectElement;
  }

  it('renders every model option from the shared MODEL_OPTIONS list', () => {
    const select = selectOf(setup());
    const labels = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(labels).toEqual(MODEL_OPTIONS.map((option) => option.label));
    expect(labels).toContain('Sol · xhigh');
  });

  it('shows the Default option (index 0) when no preference is stored', () => {
    const select = selectOf(setup());
    expect(select.selectedIndex).toBe(0);
  });

  it('reflects a pre-seeded default preference on init', () => {
    const select = selectOf(setup({ model: 'gpt-5.6-sol', effort: 'xhigh' }));
    // 'Sol · xhigh' is index 1 in MODEL_OPTIONS.
    expect(select.selectedIndex).toBe(1);
  });

  it('writes the default preference when an option is selected', () => {
    const fixture = setup();
    const select = selectOf(fixture);
    select.selectedIndex = 2; // 'Sol · medium'
    select.dispatchEvent(new Event('change'));

    expect(preference.get(DEFAULT_PREFERENCE_KEY)).toEqual({
      model: 'gpt-5.6-sol',
      effort: 'medium',
    });
  });

  it('clears the default preference when "Default" is selected', () => {
    const fixture = setup({ model: 'gpt-5.6-sol', effort: 'xhigh' });
    const select = selectOf(fixture);
    select.selectedIndex = 0; // 'Default'
    select.dispatchEvent(new Event('change'));

    expect(preference.get(DEFAULT_PREFERENCE_KEY)).toBeNull();
  });

  it('reactively reflects a default change made elsewhere (e.g. the editor toolbar)', () => {
    const fixture = setup();
    const select = selectOf(fixture);
    expect(select.selectedIndex).toBe(0);

    // Simulate the selection toolbar writing the shared 'default' key.
    preference.set(DEFAULT_PREFERENCE_KEY, {
      model: 'gpt-5.6-sol',
      effort: 'xhigh',
    });
    fixture.detectChanges();

    expect(select.selectedIndex).toBe(1);
  });
});
