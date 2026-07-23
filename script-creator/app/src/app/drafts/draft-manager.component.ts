import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { DaemonClient } from '../api/client';
import { EditorHost } from '../editor/editor-host';
import { BriefPanel } from '../panels/brief-panel';
import { FindingsPanel } from '../panels/findings-panel';
import { ParkingLot } from '../panels/parking-lot';
import type { StudioSession } from '../studio-session';
import {
  DraftManager,
} from './draft-manager';
import { DraftTransfer } from './draft-transfer';
import { RevisionTimeline } from './revision-timeline';

@Component({
  selector: 'app-draft-manager',
  standalone: true,
  imports: [
    BriefPanel,
    DraftTransfer,
    EditorHost,
    FindingsPanel,
    ParkingLot,
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
              [session]="session()"
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

        @if (studio.activeDraft()) {
          <aside class="history-rail">
            @if (editorHost(); as activeEditor) {
              @if (activeEditor.brief(); as brief) {
                @if (activeEditor.approvalGate(); as approvalGate) {
                  <details open>
                    <summary>Brief &amp; approval</summary>
                    <app-brief-panel
                      [model]="brief"
                      [gate]="approvalGate"
                    />
                  </details>
                }
              }

              <details open>
                <summary>Review findings</summary>
                <app-findings-panel [findings]="activeEditor.findings()" />
              </details>

              <details open>
                <summary>Variants &amp; parking</summary>
                <app-parking-lot [model]="activeEditor.parkingLot" />
              </details>
            }

            <details>
              <summary>Revisions &amp; transfer</summary>
              <app-revision-timeline [manager]="studio" />
              <div class="rail-rule"></div>
              <app-draft-transfer [manager]="studio" />
            </details>
          </aside>
        } @else {
          <aside class="history-rail">
            <app-revision-timeline [manager]="studio" />
            <div class="rail-rule"></div>
            <app-draft-transfer [manager]="studio" />
          </aside>
        }
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
      min-height: calc(100vh - 3.75rem);
      border-top: 1px solid var(--whp-line);
    }

    .draft-rail,
    .history-rail {
      background: var(--whp-panel);
      padding: 1.25rem;
    }

    .draft-rail {
      border-right: 1px solid var(--whp-line);
    }

    .history-rail {
      border-left: 1px solid var(--whp-line);
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
      border: 1px solid var(--whp-line-strong);
      border-radius: 999px;
      padding: 0.22rem 0.5rem;
      color: var(--whp-muted);
      font-size: 0.68rem;
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    h1 {
      color: var(--whp-ink);
      font-size: clamp(1.35rem, 2vw, 2rem);
      letter-spacing: -0.025em;
    }

    h2 {
      color: var(--whp-ink);
      font-size: 1rem;
    }

    .eyebrow {
      margin-bottom: 0.22rem;
      color: var(--whp-muted-soft);
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
      border-bottom: 1px solid var(--whp-line);
    }

    .create-form label {
      color: var(--whp-muted);
      font-size: 0.72rem;
      font-weight: 750;
    }

    .create-form input {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid var(--whp-line-strong);
      border-radius: 0.25rem;
      background: var(--whp-surface);
      padding: 0.5rem 0.55rem;
      color: var(--whp-ink);
      font: inherit;
      font-size: 0.76rem;
    }

    .create-form button {
      justify-self: start;
      border: 1px solid var(--whp-accent);
      border-radius: 0.25rem;
      background: var(--whp-accent);
      padding: 0.48rem 0.7rem;
      color: var(--whp-ground);
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
      color: var(--whp-ink);
      cursor: pointer;
      font: inherit;
      text-align: left;
    }

    .draft-card:hover {
      background: color-mix(in srgb, var(--whp-ink) 7%, var(--whp-ground));
    }

    .draft-card.active {
      border-left-color: var(--whp-accent);
      background: var(--whp-surface);
    }

    .draft-card strong {
      font-size: 0.82rem;
    }

    .draft-card span,
    .draft-card small {
      overflow: hidden;
      color: var(--whp-muted-soft);
      font-size: 0.68rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .writing-surface {
      min-width: 0;
      background: var(--whp-ground);
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
      font-family: var(--whp-font-editor);
      font-size: clamp(2rem, 4vw, 4.5rem);
      font-weight: 500;
      line-height: 0.98;
    }

    .welcome > p:last-child {
      max-width: 48ch;
      margin-top: 1.25rem;
      color: var(--whp-muted);
      line-height: 1.55;
    }

    .history-rail {
      display: grid;
      align-content: start;
      gap: 0.75rem;
      max-height: calc(100vh - 3.75rem);
      overflow-y: auto;
    }

    details {
      border-bottom: 1px solid var(--whp-line);
      padding-bottom: 0.75rem;
    }

    summary {
      margin-bottom: 0.6rem;
      color: var(--whp-muted);
      cursor: pointer;
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    details:not([open]) summary {
      margin-bottom: 0;
    }

    .rail-rule {
      height: 1px;
      margin-block: 0.75rem;
      background: var(--whp-line);
    }

    .empty,
    .error {
      color: var(--whp-muted);
      font-size: 0.75rem;
      line-height: 1.45;
    }

    .error {
      background: var(--whp-accent-tint);
      padding: 0.6rem;
      color: var(--whp-accent);
    }

    input:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--whp-accent);
      outline-offset: 2px;
    }

    @media (max-width: 72rem) {
      .studio {
        grid-template-columns: 14rem minmax(0, 1fr);
      }

      .history-rail {
        grid-column: 1 / -1;
        max-height: none;
        border-top: 1px solid var(--whp-line);
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
        border-bottom: 1px solid var(--whp-line);
      }
    }
  `,
})
export class DraftManagerComponent implements OnInit {
  readonly client = input.required<DaemonClient>();
  readonly session = input.required<StudioSession>();
  readonly manager = signal<DraftManager | null>(null);
  readonly editorHost = viewChild(EditorHost);

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
