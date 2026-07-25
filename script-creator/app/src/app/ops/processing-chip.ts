import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { OperationName } from '../api/client';
import { ActiveOperationsService, type ActiveOp } from './active-operations.service';

@Component({
  selector: 'sc-processing-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (primary(); as op) {
      @if (op.id; as id) {
        <a
          class="processing-chip"
          data-testid="processing-chip"
          [routerLink]="['/console']"
          [queryParams]="{ op: id }"
          [class.stalled]="op.stalled"
          [attr.title]="'Open the ' + op.name + ' trace in the Console'"
        >
          <span class="pulse" aria-hidden="true"></span>
          <span>In Processing</span>
        </a>
      } @else {
        <span class="processing-chip pending" data-testid="processing-chip">
          <span class="pulse" aria-hidden="true"></span>
          <span>In Processing</span>
        </span>
      }
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; }
    .processing-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      border: 1px solid var(--whp-accent);
      border-radius: 999px;
      padding: 0.22rem 0.6rem;
      color: var(--whp-accent);
      background: var(--whp-accent-tint);
      font-size: 0.62rem;
      font-weight: 850;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-decoration: none;
    }
    .processing-chip.pending { opacity: 0.7; cursor: default; }
    .processing-chip.stalled { border-style: dashed; }
    .pulse {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--whp-accent);
      animation: sc-pulse 1.2s ease-in-out infinite;
    }
    @keyframes sc-pulse { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
  `,
})
export class ProcessingChip {
  private readonly active = inject(ActiveOperationsService);
  @Input() readonly operations: readonly OperationName[] | null = null;

  constructor() {
    // Any placement of the chip boots the shared poll (masthead is always
    // mounted, so this starts at app load and after every reload).
    this.active.ensureStarted();
  }

  protected readonly primary = computed<ActiveOp | null>(() => {
    const filter = this.operations as readonly OperationName[] | null;
    const ops = this.active.activeOperations();
    const matches = filter
      ? ops.filter((op) => filter.includes(op.name))
      : ops;
    // Prefer one that already has an id (clickable) and is running.
    return matches.find((op) => op.id && op.state === 'running')
      ?? matches.find((op) => op.id)
      ?? matches.at(-1)
      ?? null;
  });
}
