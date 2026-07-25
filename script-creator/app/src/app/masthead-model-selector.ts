import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  MODEL_OPTIONS,
  choiceForModelOption,
  modelOptionIndex,
} from './ops/model-options';
import {
  DEFAULT_PREFERENCE_KEY,
  ModelPreferenceService,
} from './ops/model-preference';

/**
 * A persistent, always-visible control in the masthead for the global default
 * model/effort. It reads and writes the SAME shared 'default' key of
 * {@link ModelPreferenceService} that the editor selection toolbar uses, so the
 * two controls stay consistent, and it reflects store changes reactively via
 * {@link ModelPreferenceService.watch}.
 */
@Component({
  selector: 'app-masthead-model-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="masthead-model">
      <span class="masthead-model__label">Model</span>
      <select
        class="masthead-model__select"
        aria-label="Default model and effort"
        (change)="onChange($event)"
      >
        @for (option of options; track option.label; let i = $index) {
          <option [value]="i" [selected]="i === selectedIndex()">
            {{ option.label }}
          </option>
        }
      </select>
    </label>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
    }
    .masthead-model {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .masthead-model__label {
      color: color-mix(in srgb, var(--whp-ground) 72%, transparent);
      font-size: 0.62rem;
      font-weight: 850;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .masthead-model__select {
      border: 1px solid color-mix(in srgb, var(--whp-ground) 34%, transparent);
      padding: 0.3rem 0.45rem;
      color: var(--whp-ground);
      background: transparent;
      cursor: pointer;
      font-size: 0.72rem;
      font-weight: 750;
    }
    .masthead-model__select:hover,
    .masthead-model__select:focus-visible {
      border-color: var(--whp-accent);
    }
    .masthead-model__select option {
      color: var(--whp-ink);
    }
  `,
})
export class MastheadModelSelector {
  private readonly modelPreference = inject(ModelPreferenceService);
  private readonly choice = this.modelPreference.watch(DEFAULT_PREFERENCE_KEY);

  protected readonly options = MODEL_OPTIONS;
  protected readonly selectedIndex = computed(() =>
    modelOptionIndex(MODEL_OPTIONS, this.choice()),
  );

  protected onChange(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    this.modelPreference.set(
      DEFAULT_PREFERENCE_KEY,
      choiceForModelOption(MODEL_OPTIONS[select.selectedIndex]),
    );
  }
}
