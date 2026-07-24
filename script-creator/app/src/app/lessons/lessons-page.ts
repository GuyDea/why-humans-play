import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { STUDIO_SESSION } from '../studio-session';
import { LessonsModel } from './model';
import { LessonsPanel } from './lessons-panel';

@Component({
  selector: 'app-lessons-page',
  standalone: true,
  imports: [LessonsPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="lessons-page" data-testid="lessons-page">
      <header class="lessons-hero">
        <div>
          <p>Editorial memory</p>
          <h1>Lessons remain proposals until Martin decides.</h1>
        </div>
        <label for="lesson-draft">
          <span>Episode draft</span>
          <select
            id="lesson-draft"
            [value]="model.selectedDraftId() ?? ''"
            [disabled]="model.loading()"
            (change)="selectDraft($event)"
          >
            @for (draft of model.drafts(); track draft.id) {
              <option [value]="draft.id">{{ draft.title }}</option>
            }
          </select>
        </label>
      </header>
      <app-lessons-panel [model]="model" />
    </main>
  `,
  styles: `
    :host { display: block; }
    .lessons-page {
      display: grid;
      width: min(100%, 92rem);
      min-height: calc(100vh - 3.75rem);
      margin-inline: auto;
      gap: clamp(1rem, 2.5vw, 2rem);
      padding: clamp(1rem, 2.5vw, 2.4rem);
    }
    .lessons-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(14rem, 22rem);
      align-items: end;
      gap: 2rem;
      border-bottom: 1px solid var(--whp-line-strong);
      padding-block: 1rem 1.5rem;
    }
    .lessons-hero p, h1 { margin: 0; }
    .lessons-hero p, label span {
      color: var(--whp-accent);
      font-size: .64rem;
      font-weight: 850;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    h1 {
      max-width: 18ch;
      margin-top: .25rem;
      font-family: var(--whp-font-editor);
      font-size: clamp(2rem, 4vw, 4rem);
      font-weight: 500;
      letter-spacing: -.04em;
      line-height: 1;
    }
    label { display: grid; gap: .45rem; }
    select {
      width: 100%;
      border: 1px solid var(--whp-line-strong);
      padding: .7rem;
      background: var(--whp-surface);
      color: var(--whp-ink);
      font: inherit;
    }
    @media (max-width: 42rem) {
      .lessons-hero { grid-template-columns: 1fr; align-items: start; }
    }
  `,
})
export class LessonsPage implements OnInit, OnDestroy {
  private readonly session = inject(STUDIO_SESSION);
  protected readonly model = new LessonsModel(this.session.client);
  private pollTimer: ReturnType<typeof globalThis.setInterval> | null = null;

  ngOnInit(): void {
    void this.model.initialize();
    this.pollTimer = globalThis.setInterval(() => {
      if (this.model.distillationActive()) {
        void this.model.pollDistillation();
      }
    }, 1_000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer !== null) {
      globalThis.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  protected selectDraft(event: Event): void {
    const draftId = (event.target as HTMLSelectElement).value;
    if (draftId) void this.model.selectDraft(draftId);
  }
}
