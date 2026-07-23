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
    <section class="panel" aria-labelledby="findings-heading">
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
      border: 1px solid #d8d2cc;
      background: #f8f8f8;
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
      border-bottom: 1px solid #d8d2cc;
    }

    h2,
    p,
    blockquote {
      margin: 0;
    }

    h2 {
      color: #323232;
      font-size: 0.92rem;
    }

    header p,
    header span {
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
      gap: 0.55rem;
      padding: 0.8rem 0.85rem;
      border-left: 3px solid #9a938d;
      border-bottom: 1px solid #ece8e4;
    }

    li[data-severity='blocking'] {
      border-left-color: #aa0a0a;
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
      color: #706963;
    }

    .orphan {
      color: #aa0a0a;
    }

    blockquote {
      border-left: 2px solid #d8d2cc;
      padding-left: 0.6rem;
      color: #706963;
      font-size: 0.7rem;
      font-style: italic;
    }

    li > p {
      color: #323232;
      font-size: 0.76rem;
      line-height: 1.45;
    }

    li > p.direction {
      color: #706963;
      font-size: 0.7rem;
    }

    li.empty {
      border-left-color: transparent;
      color: #706963;
      font-size: 0.72rem;
    }
  `,
})
export class FindingsPanel {
  readonly findings = input.required<readonly FindingLayer[]>();
  readonly rows = computed(() => findingRows(this.findings()));
}
