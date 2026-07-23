import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  input,
  signal,
} from '@angular/core';
import { EditorHost } from '../editor/editor-host';
import {
  DraftManager,
  type DraftManagerClient,
} from './draft-manager';
import { DraftTransfer } from './draft-transfer';
import { RevisionTimeline } from './revision-timeline';

@Component({
  selector: 'app-draft-manager',
  standalone: true,
  imports: [
    DraftTransfer,
    EditorHost,
    RevisionTimeline,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (manager(); as studio) {
      <div class="studio">
        <aside class="draft-rail" aria-labelledby="drafts-heading">
          <div class="rail-heading">
            <div>
              <p class="eyebrow">Library</p>
              <h2 id="drafts-heading">Drafts</h2>
            </div>
            <span>{{ studio.drafts().length }}</span>
          </div>

          <form
            class="create-form"
            (submit)="create($event, title, slug)"
          >
            <label for="draft-title">New narration draft</label>
            <input
              #title
              id="draft-title"
              type="text"
              placeholder="Episode title"
              autocomplete="off"
            />
            <input
              #slug
              type="text"
              aria-label="Episode slug"
              placeholder="episode-slug (optional)"
              autocomplete="off"
              spellcheck="false"
            />
            <button type="submit">Create draft</button>
          </form>

          @if (studio.actionError()) {
            <p class="error" role="alert">{{ studio.actionError() }}</p>
          }

          @if (studio.loading()) {
            <p class="empty">Loading drafts…</p>
          } @else if (studio.drafts().length === 0) {
            <p class="empty">
              No drafts yet. Create a blank narration draft or import one.
            </p>
          } @else {
            <nav aria-label="Drafts">
              @for (draft of studio.drafts(); track draft.id) {
                <button
                  type="button"
                  class="draft-card"
                  [class.active]="studio.activeDraft()?.id === draft.id"
                  (click)="open(draft.id)"
                >
                  <strong>{{ draft.title }}</strong>
                  <span>{{ draft.episodeSlug }}</span>
                  <small>
                    {{ draft.format }} · {{ updatedDate(draft.updatedAt) }}
                  </small>
                </button>
              }
            </nav>
          }
        </aside>

        <main class="writing-surface">
          @if (studio.activeDraft(); as activeDraft) {
            <header class="draft-heading">
              <div>
                <p class="eyebrow">Active draft</p>
                <h1>{{ activeDraft.title }}</h1>
              </div>
              <span>{{ activeDraft.episodeSlug }}</span>
            </header>
            <app-editor-host
              [draft]="activeDraft"
              [client]="client()"
            />
          } @else {
            <section class="welcome">
              <p class="eyebrow">Script Studio</p>
              <h1>Open the page where the episode starts moving.</h1>
              <p>
                Choose a draft, create a blank narration, or import an existing
                script. The editor keeps each change in revision history.
              </p>
            </section>
          }
        </main>

        <aside class="history-rail">
          <app-revision-timeline [manager]="studio" />
          <div class="rail-rule"></div>
          <app-draft-transfer [manager]="studio" />
        </aside>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .studio {
      display: grid;
      grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr) minmax(16rem, 20rem);
      min-height: calc(100vh - 5.5rem);
      border-top: 1px solid #d8d2cc;
    }

    .draft-rail,
    .history-rail {
      background: #f3f1ee;
      padding: 1.25rem;
    }

    .draft-rail {
      border-right: 1px solid #d8d2cc;
    }

    .history-rail {
      border-left: 1px solid #d8d2cc;
    }

    .rail-heading,
    .draft-heading {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 1rem;
    }

    .rail-heading > span,
    .draft-heading > span {
      border: 1px solid #c9c2bb;
      border-radius: 999px;
      padding: 0.22rem 0.5rem;
      color: #6e6761;
      font-size: 0.68rem;
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    h1 {
      color: #323232;
      font-size: clamp(1.35rem, 2vw, 2rem);
      letter-spacing: -0.025em;
    }

    h2 {
      color: #323232;
      font-size: 1rem;
    }

    .eyebrow {
      margin-bottom: 0.22rem;
      color: #8c8580;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .create-form {
      display: grid;
      gap: 0.5rem;
      margin: 1.1rem 0;
      padding-bottom: 1rem;
      border-bottom: 1px solid #d8d2cc;
    }

    .create-form label {
      color: #5b544f;
      font-size: 0.72rem;
      font-weight: 750;
    }

    .create-form input {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid #cbc4bd;
      border-radius: 0.25rem;
      background: #fff;
      padding: 0.5rem 0.55rem;
      color: #323232;
      font: inherit;
      font-size: 0.76rem;
    }

    .create-form button {
      justify-self: start;
      border: 1px solid #aa0a0a;
      border-radius: 0.25rem;
      background: #aa0a0a;
      padding: 0.48rem 0.7rem;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-size: 0.73rem;
      font-weight: 750;
    }

    nav {
      display: grid;
      gap: 0.35rem;
    }

    .draft-card {
      display: grid;
      gap: 0.2rem;
      width: 100%;
      border: 0;
      border-left: 3px solid transparent;
      background: transparent;
      padding: 0.7rem 0.65rem;
      color: #323232;
      cursor: pointer;
      font: inherit;
      text-align: left;
    }

    .draft-card:hover {
      background: #ebe7e2;
    }

    .draft-card.active {
      border-left-color: #aa0a0a;
      background: #fff;
    }

    .draft-card strong {
      font-size: 0.82rem;
    }

    .draft-card span,
    .draft-card small {
      overflow: hidden;
      color: #7a726c;
      font-size: 0.68rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .writing-surface {
      min-width: 0;
      background: #f8f8f8;
      padding: clamp(1.25rem, 3vw, 2.75rem);
    }

    .draft-heading {
      max-width: 68ch;
      margin: 0 auto 1.25rem;
    }

    app-editor-host {
      display: block;
      max-width: 68ch;
      margin: 0 auto;
    }

    .welcome {
      display: grid;
      align-content: center;
      max-width: 38rem;
      min-height: 65vh;
      margin: auto;
    }

    .welcome h1 {
      max-width: 18ch;
      font-size: clamp(2rem, 4vw, 4.5rem);
      line-height: 0.98;
    }

    .welcome > p:last-child {
      max-width: 48ch;
      margin-top: 1.25rem;
      color: #6f6761;
      line-height: 1.55;
    }

    .history-rail {
      display: grid;
      align-content: start;
      gap: 1.25rem;
      max-height: calc(100vh - 5.5rem);
      overflow-y: auto;
    }

    .rail-rule {
      height: 1px;
      background: #d8d2cc;
    }

    .empty,
    .error {
      color: #776f69;
      font-size: 0.75rem;
      line-height: 1.45;
    }

    .error {
      background: #f7e4e1;
      padding: 0.6rem;
      color: #681515;
    }

    input:focus-visible,
    button:focus-visible {
      outline: 2px solid #aa0a0a;
      outline-offset: 2px;
    }

    @media (max-width: 72rem) {
      .studio {
        grid-template-columns: 14rem minmax(0, 1fr);
      }

      .history-rail {
        grid-column: 1 / -1;
        max-height: none;
        border-top: 1px solid #d8d2cc;
        border-left: 0;
      }
    }

    @media (max-width: 46rem) {
      .studio {
        display: block;
      }

      .draft-rail,
      .history-rail {
        border: 0;
        border-bottom: 1px solid #d8d2cc;
      }
    }
  `,
})
export class DraftManagerComponent implements OnInit {
  readonly client = input.required<DraftManagerClient>();
  readonly manager = signal<DraftManager | null>(null);

  ngOnInit(): void {
    const manager = new DraftManager(this.client());
    this.manager.set(manager);
    void manager.loadDrafts();
  }

  protected create(
    event: SubmitEvent,
    title: HTMLInputElement,
    slug: HTMLInputElement,
  ): void {
    event.preventDefault();
    const manager = this.manager();
    if (!manager) return;
    void manager.createDraft(title.value, slug.value).then(() => {
      if (!manager.actionError()) {
        title.value = '';
        slug.value = '';
      }
    });
  }

  protected open(id: string): void {
    const manager = this.manager();
    if (manager?.activeDraft()?.id !== id) void manager?.openDraft(id);
  }

  protected updatedDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? value
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }
}
