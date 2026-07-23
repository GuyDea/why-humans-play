import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Signal,
} from '@angular/core';
import {
  getParkingLot,
  pickActive as pickEditorActive,
  setActive as setEditorActive,
  type EditorState,
  type EditorView,
  type ParkingLotEntry,
} from '@whp/script-creator-editor-core';

export interface UnsettledVariantOption {
  index: number;
  label: string;
}

export interface UnsettledVariantSet {
  variantId: string;
  activeIndex: number;
  activeLabel: string;
  options: UnsettledVariantOption[];
}

export function parkingLotEntries(
  state: EditorState,
): ParkingLotEntry[] {
  return getParkingLot(state);
}

export function unsettledVariantSets(
  state: EditorState,
): UnsettledVariantSet[] {
  const variants: UnsettledVariantSet[] = [];
  state.doc.descendants((node) => {
    if (
      node.type.name !== 'variantSet'
      && node.type.name !== 'inlineVariantSet'
    ) {
      return true;
    }
    if (node.attrs['settled'] === true) return false;

    const options = node.type.name === 'inlineVariantSet'
      ? inlineOptions(node.attrs['options'])
      : Array.from({ length: node.childCount }, (_, index) => ({
          index,
          label: String(node.child(index).attrs['label'] ?? ''),
        }));
    const activeIndex = Number.isInteger(node.attrs['activeIndex'])
      ? Number(node.attrs['activeIndex'])
      : 0;
    variants.push({
      variantId: String(node.attrs['variantId'] ?? ''),
      activeIndex,
      activeLabel: options[activeIndex]?.label ?? '',
      options,
    });
    return false;
  });
  return variants;
}

export class ParkingLotModel {
  readonly entries: Signal<ParkingLotEntry[]>;
  readonly unsettled: Signal<UnsettledVariantSet[]>;

  constructor(
    private readonly state: Signal<EditorState | null>,
    private readonly dispatch: EditorView['dispatch'],
  ) {
    this.entries = computed(() => {
      const state = this.state();
      return state ? parkingLotEntries(state) : [];
    });
    this.unsettled = computed(() => {
      const state = this.state();
      return state ? unsettledVariantSets(state) : [];
    });
  }

  makeActive(variantId: string, index: number): boolean {
    const state = this.state();
    if (!state) return false;
    return setEditorActive(
      state,
      this.dispatch,
      variantId,
      index,
    );
  }

  pickActive(variantId: string): boolean {
    const state = this.state();
    if (!state) return false;
    return pickEditorActive(
      state,
      this.dispatch,
      variantId,
    );
  }
}

@Component({
  selector: 'app-parking-lot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel studio-panel" aria-labelledby="parking-lot-heading">
      <header>
        <div>
          <p>Variants</p>
          <h2 id="parking-lot-heading">Parking lot</h2>
        </div>
        <span>
          {{ model().unsettled().length }} open ·
          {{ model().entries().length }} parked
        </span>
      </header>

      <ol class="unsettled" aria-label="Unsettled variant sets">
        @for (variant of model().unsettled(); track variant.variantId) {
          <li class="variant-set" data-testid="unsettled-variant">
            <div class="variant-heading">
              <strong>{{ variant.variantId }}</strong>
              <span>Active: {{ variant.activeLabel }}</span>
            </div>
            <div class="variant-options" aria-label="Variant options">
              @for (option of variant.options; track option.index) {
                <button
                  type="button"
                  [class.active]="option.index === variant.activeIndex"
                  [attr.aria-pressed]="option.index === variant.activeIndex"
                  (click)="model().makeActive(variant.variantId, option.index)"
                >
                  {{ option.label }}
                  @if (option.index !== variant.activeIndex) {
                    <small>Make active</small>
                  }
                </button>
              }
            </div>
            <button
              type="button"
              class="pick-active"
              (click)="model().pickActive(variant.variantId)"
            >
              Pick active
            </button>
          </li>
        } @empty {
          <li class="empty">No unsettled variant sets.</li>
        }
      </ol>

      <ol aria-label="Parked variants">
        @for (
          entry of model().entries();
          track entry.variantId + '-' + entry.label + '-' + $index
        ) {
          <li>
            <div>
              <strong>{{ entry.label }}</strong>
              <span>{{ entry.variantId }}</span>
            </div>
            <p>{{ entry.text }}</p>
          </li>
        } @empty {
          <li class="empty">
            Losing variants stay recoverable here after a choice.
          </li>
        }
      </ol>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .panel {
      border: var(--whp-panel-border);
      background: var(--whp-panel-background);
    }

    header,
    li > div,
    .variant-heading {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 1rem;
    }

    header {
      padding: 0.85rem;
      border-bottom: 1px solid var(--whp-line);
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      color: var(--whp-ink);
      font-size: 0.92rem;
    }

    header p,
    header span,
    li span {
      color: var(--whp-muted-soft);
      font-size: 0.64rem;
    }

    header p {
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    ol {
      display: grid;
      gap: 0;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    ol + ol {
      border-top: 1px solid var(--whp-line);
    }

    li {
      display: grid;
      gap: 0.45rem;
      padding: 0.75rem 0.85rem;
      border-bottom: 1px solid var(--whp-line-soft);
    }

    li strong {
      color: var(--whp-accent);
      font-size: 0.74rem;
    }

    li p {
      color: var(--whp-ink);
      font-size: 0.76rem;
      line-height: 1.45;
    }

    .variant-options {
      display: flex;
      flex-wrap: wrap;
      justify-content: start;
      gap: 0.35rem;
    }

    .variant-options button,
    .pick-active {
      border: 1px solid var(--whp-line-strong);
      background: var(--whp-surface);
      padding: 0.38rem 0.5rem;
      color: var(--whp-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.68rem;
      font-weight: 750;
    }

    .variant-options button {
      display: grid;
      gap: 0.08rem;
      text-align: left;
    }

    .variant-options button.active {
      border-color: var(--whp-accent);
      color: var(--whp-ground);
      background: var(--whp-accent);
    }

    .variant-options small {
      color: var(--whp-muted);
      font-size: 0.55rem;
      font-weight: 600;
    }

    .pick-active {
      justify-self: start;
    }

    li.empty {
      color: var(--whp-muted);
      font-size: 0.72rem;
    }
  `,
})
export class ParkingLot {
  readonly model = input.required<ParkingLotModel>();
}

function inlineOptions(value: unknown): UnsettledVariantOption[] {
  if (!Array.isArray(value)) return [];
  return value.map((option, index) => ({
    index,
    label: option !== null
        && typeof option === 'object'
        && 'label' in option
      ? String(option.label ?? '')
      : '',
  }));
}
