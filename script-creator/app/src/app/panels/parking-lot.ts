import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  getParkingLot,
  type EditorState,
  type ParkingLotEntry,
} from '@whp/script-creator-editor-core';

export function parkingLotEntries(
  state: EditorState,
): ParkingLotEntry[] {
  return getParkingLot(state);
}

@Component({
  selector: 'app-parking-lot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" aria-labelledby="parking-lot-heading">
      <header>
        <div>
          <p>Variants</p>
          <h2 id="parking-lot-heading">Parking lot</h2>
        </div>
        <span>{{ entries().length }}</span>
      </header>

      <ol>
        @for (
          entry of entries();
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
      border: 1px solid #d8d2cc;
      background: #f8f8f8;
    }

    header,
    li > div {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 1rem;
    }

    header {
      padding: 0.85rem;
      border-bottom: 1px solid #d8d2cc;
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      color: #323232;
      font-size: 0.92rem;
    }

    header p,
    header span,
    li span {
      color: #817a74;
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

    li {
      display: grid;
      gap: 0.45rem;
      padding: 0.75rem 0.85rem;
      border-bottom: 1px solid #ece8e4;
    }

    li strong {
      color: #aa0a0a;
      font-size: 0.74rem;
    }

    li p {
      color: #323232;
      font-size: 0.76rem;
      line-height: 1.45;
    }

    li.empty {
      color: #706963;
      font-size: 0.72rem;
    }
  `,
})
export class ParkingLot {
  readonly state = input.required<EditorState>();
  readonly entries = computed(() => parkingLotEntries(this.state()));
}
