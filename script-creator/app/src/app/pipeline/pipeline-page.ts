import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { PipelineDiagnostic, PipelineItem } from '../api/client';
import { HelpTargetDirective } from '../help/help-target.directive';
import { STUDIO_SESSION } from '../studio-session';

const PIPELINE_COLUMNS = [
  { state: 'idea', label: 'Idea' },
  { state: 'candidate', label: 'Candidate' },
  { state: 'selected', label: 'Selected' },
  { state: 'architecture', label: 'Architecture' },
  { state: 'architecture-approved', label: 'Architecture approved' },
  { state: 'prototyping', label: 'Prototyping' },
  { state: 'creative-approved', label: 'Creative approved' },
  { state: 'production', label: 'Production' },
  { state: 'record-ready', label: 'Record ready' },
  { state: 'recorded', label: 'Recorded' },
  { state: 'published', label: 'Published' },
] as const;

const KNOWN_STATES = new Set<string>(
  PIPELINE_COLUMNS.map((column) => column.state),
);

@Component({
  selector: 'app-pipeline-page',
  standalone: true,
  imports: [HelpTargetDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="pipeline-page">
      <header class="pipeline-hero">
        <div>
          <p class="eyebrow">Episode lifecycle</p>
          <h1>Production pipeline</h1>
        </div>
        <p class="hero-copy">
          One read-only view of topic milestones and working drafts.
          Open a card to continue where the episode already lives.
        </p>
      </header>

      @if (error()) {
        <div class="pipeline-alert" role="alert">
          <div>
            <strong>Pipeline unavailable</strong>
            <span>{{ error() }}</span>
          </div>
          <button type="button" (click)="load()">Try again</button>
        </div>
      }

      @if (unmappedCount() > 0) {
        <p class="pipeline-alert" role="status">
          {{ unmappedCount() }}
          {{ unmappedCount() === 1 ? 'episode has' : 'episodes have' }}
          an unrecognized pipeline state and cannot be placed.
        </p>
      }

      @if (diagnostics().length > 0) {
        <section
          class="pipeline-alert diagnostic-alert"
          role="alert"
          appHelpTarget="pipeline.diagnostics"
        >
          <div>
            <strong>Pipeline file needs attention</strong>
            <ul>
              @for (diagnostic of diagnostics(); track diagnostic) {
                <li data-testid="pipeline-diagnostic">
                  @if (diagnostic.line !== null) {
                    <b>Row {{ diagnostic.line }}:</b>
                  }
                  {{ diagnostic.message }}
                </li>
              }
            </ul>
          </div>
        </section>
      }

      <section
        class="pipeline-board"
        data-testid="pipeline-board"
        aria-label="Episode production pipeline"
        appHelpTarget="pipeline.board"
        [attr.aria-busy]="loading()"
      >
        @for (column of columns; track column.state; let index = $index) {
          <section
            class="pipeline-column"
            data-testid="pipeline-column"
            [attr.data-pipeline-state]="column.state"
            [attr.aria-labelledby]="'pipeline-' + column.state"
          >
            <header>
              <span class="stage-index">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <h2 [id]="'pipeline-' + column.state">{{ column.label }}</h2>
              <span class="stage-count">{{ itemsFor(column.state).length }}</span>
            </header>

            <div class="card-stack">
              @for (item of itemsFor(column.state); track item.episodeSlug) {
                <button
                  class="pipeline-card"
                  type="button"
                  data-testid="pipeline-card"
                  [attr.data-episode-slug]="item.episodeSlug"
                  [attr.aria-label]="cardLabel(item)"
                  (click)="open(item)"
                >
                  <span class="card-state">{{ column.label }}</span>
                  <strong>{{ displayTitle(item) }}</strong>
                  <span class="card-slug">{{ item.episodeSlug }}</span>
                  <span class="card-source">{{ sourceLabel(item) }}</span>
                </button>
              } @empty {
                <p class="empty-column">
                  {{ loading() ? 'Loading…' : 'No episodes' }}
                </p>
              }
            </div>
          </section>
        }
      </section>
    </main>
  `,
  styles: `
    :host { display: block; }
    .pipeline-page {
      display: grid;
      width: min(100%, 112rem);
      min-height: calc(100vh - 3.75rem);
      margin-inline: auto;
      gap: 1.25rem;
      padding: clamp(1rem, 2.5vw, 2.4rem);
    }
    .pipeline-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(18rem, .85fr);
      align-items: end;
      gap: 2rem;
      border-bottom: 1px solid var(--whp-line-strong);
      padding-block: 1rem 1.6rem;
    }
    .eyebrow, h1, .hero-copy { margin: 0; }
    .eyebrow, .card-state {
      color: var(--whp-accent);
      font-size: .62rem;
      font-weight: 850;
      letter-spacing: .13em;
      text-transform: uppercase;
    }
    h1 {
      margin-top: .28rem;
      font-family: var(--whp-font-editor);
      font-size: clamp(2.2rem, 4.5vw, 4.4rem);
      font-weight: 500;
      letter-spacing: -.045em;
      line-height: .98;
    }
    .hero-copy {
      max-width: 46ch;
      color: var(--whp-muted);
      font-family: var(--whp-font-editor);
      font-size: 1.05rem;
      line-height: 1.55;
    }
    .pipeline-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
      border-left: 3px solid var(--whp-accent);
      padding: .75rem 1rem;
      color: var(--whp-ink);
      background: var(--whp-accent-tint);
      font-size: .75rem;
    }
    .pipeline-alert div { display: grid; gap: .18rem; }
    .diagnostic-alert { align-items: start; }
    .diagnostic-alert ul {
      display: grid;
      gap: .3rem;
      margin: .25rem 0 0;
      padding-left: 1.15rem;
    }
    .diagnostic-alert b { font-weight: 850; }
    .pipeline-alert button {
      border: 1px solid var(--whp-line-strong);
      padding: .4rem .65rem;
      color: var(--whp-ink);
      background: var(--whp-surface);
      cursor: pointer;
      font-weight: 800;
    }
    .pipeline-board {
      display: grid;
      grid-auto-columns: minmax(14.5rem, 1fr);
      grid-auto-flow: column;
      align-items: stretch;
      gap: .65rem;
      overflow-x: auto;
      padding: .7rem .15rem 1.25rem;
      scroll-snap-type: x proximity;
    }
    .pipeline-column {
      position: relative;
      min-height: 28rem;
      border: 1px solid var(--whp-line);
      background: var(--whp-panel);
      scroll-snap-align: start;
    }
    .pipeline-column::before {
      position: absolute;
      top: -.72rem;
      right: -.65rem;
      left: -.65rem;
      height: .16rem;
      background: var(--whp-accent);
      content: "";
    }
    .pipeline-column:first-child::before { left: 0; }
    .pipeline-column:last-child::before { right: 0; }
    .pipeline-column > header {
      display: grid;
      min-height: 4.4rem;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: .55rem;
      border-bottom: 1px solid var(--whp-line);
      padding: .75rem;
      background: var(--whp-surface);
    }
    .stage-index, .stage-count, .card-slug {
      font-family: var(--whp-font-mono);
    }
    .stage-index {
      color: var(--whp-accent);
      font-size: .62rem;
      font-weight: 850;
    }
    h2 {
      margin: 0;
      font-size: .76rem;
      font-weight: 820;
      line-height: 1.25;
    }
    .stage-count {
      display: grid;
      width: 1.7rem;
      height: 1.7rem;
      border: 1px solid var(--whp-line);
      border-radius: 50%;
      font-size: .62rem;
      place-items: center;
    }
    .card-stack { display: grid; gap: .55rem; padding: .65rem; }
    .pipeline-card {
      display: grid;
      width: 100%;
      gap: .4rem;
      border: 1px solid var(--whp-line);
      border-left: 3px solid var(--whp-ink);
      border-radius: .12rem;
      padding: .8rem;
      color: var(--whp-ink);
      background: var(--whp-surface);
      cursor: pointer;
      text-align: left;
      transition: border-color 120ms ease, transform 120ms ease;
    }
    .pipeline-card:hover {
      border-color: var(--whp-accent);
      transform: translateY(-2px);
    }
    .pipeline-card strong {
      font-family: var(--whp-font-editor);
      font-size: 1rem;
      font-weight: 580;
      line-height: 1.25;
    }
    .card-slug, .card-source {
      overflow: hidden;
      color: var(--whp-muted);
      font-size: .61rem;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .empty-column {
      margin: .5rem 0;
      color: var(--whp-muted);
      font-family: var(--whp-font-editor);
      font-size: .78rem;
      text-align: center;
    }
    @media (max-width: 44rem) {
      .pipeline-hero { grid-template-columns: 1fr; gap: 1rem; }
      .pipeline-page { min-height: calc(100vh - 6.5rem); }
    }
    @media (prefers-reduced-motion: reduce) {
      .pipeline-card { transition: none; }
    }
  `,
})
export class PipelinePage implements OnInit {
  protected readonly columns = PIPELINE_COLUMNS;
  protected readonly String = String;
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly items = signal<PipelineItem[]>([]);
  protected readonly diagnostics = signal<PipelineDiagnostic[]>([]);
  protected readonly unmappedCount = computed(() =>
    this.items().filter((item) => !KNOWN_STATES.has(item.state)).length);
  private readonly session = inject(STUDIO_SESSION);
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.diagnostics.set([]);
    try {
      const response = await this.session.client.getPipeline();
      this.items.set(response.rows);
      this.diagnostics.set(response.diagnostics);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected itemsFor(state: string): PipelineItem[] {
    return this.items().filter((item) => item.state === state);
  }

  protected open(item: PipelineItem): void {
    if (item.draftId) {
      void this.router.navigate(['/'], {
        queryParams: { draft: item.draftId },
      });
      return;
    }
    void this.router.navigate(['/topics'], {
      queryParams: {
        topic: item.episodeSlug,
        ref: item.ref,
      },
    });
  }

  protected displayTitle(item: PipelineItem): string {
    return item.title?.trim() || titleFromSlug(item.episodeSlug);
  }

  protected sourceLabel(item: PipelineItem): string {
    if (item.draftId) {
      return `Draft · ${item.creativePhase ?? item.state}`;
    }
    return `Repository · ${item.milestone ?? item.state}`;
  }

  protected cardLabel(item: PipelineItem): string {
    const destination = item.draftId ? 'Studio draft' : 'Topics';
    return `Open ${this.displayTitle(item)} in ${destination}`;
  }
}

function titleFromSlug(slug: string): string {
  return slug
    .split(/[-_]+/u)
    .filter(Boolean)
    .map((word) => {
      if (word.toLowerCase() === 'ai') return 'AI';
      if (word.toLowerCase() === 'whp') return 'WHP';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
