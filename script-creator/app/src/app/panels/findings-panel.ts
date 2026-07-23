import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { FindingLayer } from '../editor/proposal-bridge';

export interface FindingRow extends FindingLayer {
  anchorStatus: 'anchored' | 'orphaned';
}

export function findingRows(
  findings: readonly FindingLayer[],
): FindingRow[] {
  return findings.map((finding) => ({
    ...finding,
    anchorStatus: finding.orphaned ? 'orphaned' : 'anchored',
  }));
}

@Component({
  selector: 'app-findings-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel studio-panel" aria-labelledby="findings-heading">
      <header>
        <div>
          <p>Review</p>
          <h2 id="findings-heading">Findings</h2>
        </div>
        <span>{{ rows().length }}</span>
      </header>

      <ol>
        @for (finding of rows(); track finding.annotationId) {
          <li [attr.data-severity]="finding.severity">
            <div class="finding-meta">
              <span class="severity">{{ finding.severity }}</span>
              @if (finding.anchorStatus === 'orphaned') {
                <span class="orphan" title="The original text was removed">
                  Orphaned
                </span>
              } @else {
                <span class="anchored">Anchored</span>
              }
            </div>
            <blockquote>{{ finding.anchor }}</blockquote>
            <p>{{ finding.findingMarkdown }}</p>
            @if (finding.optionalDirectionMarkdown) {
              <p class="direction">
                {{ finding.optionalDirectionMarkdown }}
              </p>
            }
          </li>
        } @empty {
          <li class="empty">
            Review findings will stay pinned here as the narration changes.
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
    .finding-meta {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 0.75rem;
    }

    header {
      padding: 0.85rem;
      border-bottom: 1px solid var(--whp-line);
    }

    h2,
    p,
    blockquote {
      margin: 0;
    }

    h2 {
      color: var(--whp-ink);
      font-size: 0.92rem;
    }

    header p,
    header span {
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

    li {
      display: grid;
      gap: 0.55rem;
      padding: 0.8rem 0.85rem;
      border-left: 3px solid var(--whp-line-strong);
      border-bottom: 1px solid var(--whp-line-soft);
    }

    li[data-severity='blocking'] {
      border-left-color: var(--whp-accent);
    }

    .severity,
    .orphan,
    .anchored {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .severity,
    .anchored {
      color: var(--whp-muted);
    }

    .orphan {
      color: var(--whp-accent);
    }

    blockquote {
      border-left: 2px solid var(--whp-line);
      padding-left: 0.6rem;
      color: var(--whp-muted);
      font-size: 0.7rem;
      font-style: italic;
    }

    li > p {
      color: var(--whp-ink);
      font-size: 0.76rem;
      line-height: 1.45;
    }

    li > p.direction {
      color: var(--whp-muted);
      font-size: 0.7rem;
    }

    li.empty {
      border-left-color: transparent;
      color: var(--whp-muted);
      font-size: 0.72rem;
    }
  `,
})
export class FindingsPanel {
  readonly findings = input.required<readonly FindingLayer[]>();
  readonly rows = computed(() => findingRows(this.findings()));
}
