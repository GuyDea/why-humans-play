import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import type { DraftManager } from './draft-manager';

@Component({
  selector: 'app-revision-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="timeline" aria-labelledby="revision-heading">
      <header>
        <div>
          <p class="eyebrow">History</p>
          <h2 id="revision-heading">Revisions</h2>
        </div>
        <button
          type="button"
          class="quiet-action"
          [disabled]="!manager().activeDraft()"
          (click)="refresh()"
        >
          Refresh
        </button>
      </header>

      @if (manager().revisions().length === 0) {
        <p class="empty">
          Saved revisions appear here. Select two to compare their narration.
        </p>
      } @else {
        <ol class="revision-list">
          @for (revision of manager().revisions(); track revision.id) {
            <li>
              <label>
                <input
                  type="checkbox"
                  [checked]="isSelected(revision.id)"
                  [disabled]="selectionFull() && !isSelected(revision.id)"
                  (change)="toggle(revision.id, $event)"
                />
                <span>
                  <strong>Revision {{ revision.seq }}</strong>
                  <small>
                    {{ revision.disposition }} ·
                    {{ revisionTime(revision.createdAt) }}
                  </small>
                </span>
              </label>
              <button
                type="button"
                class="restore"
                (click)="restore(revision.id)"
              >
                Restore
              </button>
            </li>
          }
        </ol>
      }

      @if (manager().selectedRevisions().length === 2) {
        <div class="diff-heading">
          <span>
            Revision {{ manager().selectedRevisions()[0]!.seq }}
          </span>
          <span aria-hidden="true">→</span>
          <span>
            Revision {{ manager().selectedRevisions()[1]!.seq }}
          </span>
        </div>
        <div class="diff" aria-label="Narration changes">
          @for (segment of manager().revisionDiff(); track $index) {
            <span
              [class.deleted]="segment.kind === 'delete'"
              [class.inserted]="segment.kind === 'insert'"
            >{{ segment.text }}</span>
          }
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .timeline {
      display: grid;
      gap: 1rem;
    }

    header,
    .diff-heading,
    .revision-list li,
    .revision-list label {
      display: flex;
      align-items: center;
    }

    header,
    .revision-list li {
      justify-content: space-between;
      gap: 0.75rem;
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      color: var(--whp-ink);
      font-size: 1rem;
    }

    .eyebrow {
      margin-bottom: 0.2rem;
      color: var(--whp-muted-soft);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .quiet-action,
    .restore {
      border: 0;
      background: transparent;
      color: var(--whp-muted);
      cursor: pointer;
      font: inherit;
      font-size: 0.75rem;
      text-decoration: underline;
      text-underline-offset: 0.18rem;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .empty {
      color: var(--whp-muted);
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .revision-list {
      display: grid;
      gap: 0.35rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .revision-list li {
      padding: 0.55rem 0;
      border-top: 1px solid var(--whp-line-soft);
    }

    .revision-list label {
      gap: 0.55rem;
      min-width: 0;
      cursor: pointer;
    }

    .revision-list label span {
      display: grid;
      gap: 0.12rem;
      min-width: 0;
    }

    .revision-list strong {
      color: var(--whp-ink);
      font-size: 0.78rem;
    }

    .revision-list small {
      overflow: hidden;
      color: var(--whp-muted-soft);
      font-size: 0.68rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .diff-heading {
      gap: 0.45rem;
      color: var(--whp-muted);
      font-size: 0.7rem;
      font-weight: 700;
    }

    .diff {
      max-height: 16rem;
      overflow: auto;
      border: 1px solid var(--whp-line);
      border-left: 3px solid var(--whp-ink);
      background: var(--whp-surface);
      padding: 0.85rem;
      color: var(--whp-ink);
      font-family: var(--whp-font-mono);
      font-size: 0.75rem;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .deleted {
      background: var(--whp-accent-tint);
      color: var(--whp-accent);
      text-decoration: line-through;
    }

    .inserted {
      background: var(--whp-success-tint);
      color: var(--whp-success);
    }

    input:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--whp-accent);
      outline-offset: 2px;
    }
  `,
})
export class RevisionTimeline {
  readonly manager = input.required<DraftManager>();

  protected isSelected(id: string): boolean {
    return this.manager().selectedRevisionIds().includes(id);
  }

  protected selectionFull(): boolean {
    return this.manager().selectedRevisionIds().length >= 2;
  }

  protected toggle(id: string, event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    this.manager().toggleRevision(id, input.checked);
  }

  protected refresh(): void {
    void this.manager().refreshRevisions();
  }

  protected restore(id: string): void {
    void this.manager().restoreRevision(id);
  }

  protected revisionTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? value
      : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
  }
}
