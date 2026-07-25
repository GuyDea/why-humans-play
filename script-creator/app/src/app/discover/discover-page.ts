import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type OnDestroy,
} from '@angular/core';
import type { OperationResult } from '../api/client';
import { ModelPreferenceService } from '../ops/model-preference';
import {
  OpTracker,
  type TrackedOperation,
} from '../ops/tracker';
import { STUDIO_SESSION } from '../studio-session';
import { HelpTargetDirective } from '../help/help-target.directive';
import { FullRunPanel } from '../topics/full-run-panel';
import {
  parseIdeateCards,
  type ParsedIdeateCard,
} from '../topics/ideate-cards';
import { buildTopicOperationInputs } from '../topics/inputs';
import { renderTopicMarkdown } from '../topics/topic-markdown';

interface IdeateMeta {
  remainingHops: 0;
}

/**
 * A rendered suggestion card. The angle HTML is rendered from Markdown once
 * when the cards land (mirroring how FullRunPanel memoizes `reportHtml`) so the
 * template never re-parses or re-sanitizes Markdown on every change-detection
 * cycle.
 */
interface SuggestionCard {
  subject: string;
  angleMarkdown: string;
  angleHtml: string;
  seed: string;
}

@Component({
  selector: 'app-discover-page',
  standalone: true,
  imports: [FullRunPanel, HelpTargetDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="discover-page" data-testid="discover-page">
      <header class="discover-hero">
        <div>
          <p class="eyebrow">Discover</p>
          <h1>Let the studio pitch your next video.</h1>
        </div>
        <p class="hero-copy">
          No seed required. Say who it is for and what to avoid, and the topic
          studio proposes subjects and angles — send the ones you like to the
          Topics inbox, or ask for a fully researched recommendation.
        </p>
      </header>

      <div class="discover-workbench">
        <section
          class="workbench-stage suggest-stage"
          aria-labelledby="suggest-heading"
          appHelpTarget="discover.suggest"
        >
          <header class="stage-heading">
            <span class="stage-marker" aria-hidden="true">AI</span>
            <div>
              <p class="stage-kicker">Spark</p>
              <h2 id="suggest-heading">Suggest ideas</h2>
            </div>
            <span class="stage-count">{{ cards().length }}</span>
          </header>

          <div class="suggest-launcher">
            <p>
              Optional guardrails shape the pitch. Leave the box empty for a
              true cold start — the studio will invent directions from scratch.
            </p>
            <label for="discover-constraints">
              Constraints <span>optional</span>
            </label>
            <textarea
              id="discover-constraints"
              data-testid="discover-constraints"
              rows="4"
              placeholder="Audience, timing, portfolio balance, topics to avoid…"
              [value]="constraints()"
              (input)="setConstraints($event)"
            ></textarea>
            <div class="launcher-actions">
              <span>No seed needed — this is the cold-start door.</span>
              <button
                class="primary-action"
                type="button"
                data-testid="suggest-ideas"
                [disabled]="ideateBusy()"
                (click)="suggestIdeas()"
              >
                {{ ideateBusy() ? 'Suggesting…' : 'Suggest ideas' }}
              </button>
            </div>
          </div>

          @if (error(); as message) {
            <article
              class="discover-error"
              data-testid="discover-error"
              role="alert"
            >
              <strong>The studio could not suggest ideas.</strong>
              <p>{{ message }}</p>
            </article>
          }

          <div class="suggestion-list" data-testid="discover-results">
            @for (card of cards(); track $index) {
              <article class="suggestion-card" data-testid="suggestion-card">
                <span class="angle-index">
                  {{ String($index + 1).padStart(2, '0') }}
                </span>
                <div>
                  <h3>{{ card.subject }}</h3>
                  <div
                    class="angle-body"
                    data-testid="suggestion-angle"
                    [innerHTML]="card.angleHtml"
                  ></div>
                  <small>Seed: {{ card.seed }}</small>
                  <div class="suggestion-actions">
                    <button
                      class="secondary-action"
                      type="button"
                      data-testid="send-to-inbox"
                      [disabled]="isSending($index) || isSent($index)"
                      (click)="sendToInbox($index)"
                    >
                      {{ sendLabel($index) }}
                    </button>
                  </div>
                  @if (sendError($index); as sendMessage) {
                    <p
                      class="send-error"
                      data-testid="send-error"
                      role="alert"
                    >
                      Could not send to inbox: {{ sendMessage }}
                    </p>
                  }
                </div>
              </article>
            } @empty {
              <div class="empty-state" data-testid="discover-empty">
                @if (ideateBusy()) {
                  <strong>Sketching subjects and angles…</strong>
                  <p>The studio is proposing directions for your next video.</p>
                } @else if (hasRun()) {
                  <strong>No angle cards came back.</strong>
                  <p>Adjust the constraints and suggest again.</p>
                } @else {
                  <strong>No suggestions yet.</strong>
                  <p>
                    Press “Suggest ideas” to let the studio propose your next
                    video.
                  </p>
                }
              </div>
            }
          </div>
        </section>

        <section
          class="workbench-stage deep-stage"
          aria-labelledby="deep-heading"
        >
          <header class="stage-heading">
            <span class="stage-marker" aria-hidden="true">→</span>
            <div>
              <p class="stage-kicker">Go deeper</p>
              <h2 id="deep-heading">Want a researched recommendation instead?</h2>
            </div>
          </header>
          <p class="deep-copy">
            Skip the shortlist and let the topic-selection skill run its full
            protocol cold — research, six gates, scoring, and a single
            responsible recommendation you can hand off to a draft.
          </p>
          <app-full-run-panel />
        </section>
      </div>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .discover-page {
      display: grid;
      width: min(100%, 96rem);
      margin-inline: auto;
      gap: 1rem;
      padding: clamp(1rem, 2.5vw, 2.4rem);
    }

    .discover-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(17rem, 0.8fr);
      align-items: end;
      gap: clamp(1.5rem, 4vw, 4rem);
      border-bottom: 1px solid var(--whp-line-strong);
      padding: clamp(1rem, 3vw, 2.5rem) 0 clamp(1.4rem, 3vw, 2.25rem);
    }

    .eyebrow,
    .stage-kicker {
      margin: 0;
      color: var(--whp-accent);
      font-size: 0.65rem;
      font-weight: 850;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 18ch;
      margin: 0.35rem 0 0;
      color: var(--whp-ink);
      font-family: var(--whp-font-editor);
      font-size: clamp(2.2rem, 5.4vw, 5.4rem);
      font-weight: 500;
      letter-spacing: -0.045em;
      line-height: 0.95;
      text-wrap: balance;
    }

    .hero-copy {
      max-width: 46ch;
      margin: 0;
      color: var(--whp-muted);
      font-family: var(--whp-font-editor);
      font-size: clamp(1rem, 1.8vw, 1.25rem);
      line-height: 1.55;
    }

    .discover-workbench {
      display: grid;
      gap: 1rem;
    }

    .workbench-stage {
      min-width: 0;
      border: 1px solid var(--whp-line);
      background: var(--whp-surface);
    }

    .stage-heading {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.8rem;
      border-bottom: 1px solid var(--whp-line);
      background: var(--whp-panel);
      padding: 0.85rem 1rem;
    }

    .stage-marker,
    .stage-count,
    .angle-index {
      font-family: var(--whp-font-mono);
    }

    .stage-marker {
      color: var(--whp-accent);
      font-size: 0.72rem;
      font-weight: 850;
    }

    .stage-heading h2 {
      margin: 0.12rem 0 0;
      font-family: var(--whp-font-editor);
      font-size: 1.35rem;
      font-weight: 550;
    }

    .stage-count {
      display: grid;
      min-width: 2rem;
      height: 2rem;
      border: 1px solid var(--whp-line-strong);
      border-radius: 50%;
      background: var(--whp-surface);
      font-size: 0.7rem;
      font-weight: 800;
      place-items: center;
    }

    .suggest-launcher {
      display: grid;
      gap: 0.75rem;
      border-bottom: 1px solid var(--whp-line);
      padding: 1rem;
    }

    .suggest-launcher > p,
    .deep-copy {
      margin: 0;
      color: var(--whp-muted);
      font-size: 0.78rem;
      line-height: 1.5;
    }

    .deep-copy {
      max-width: 68ch;
      padding: 1rem 1rem 0;
    }

    label {
      display: flex;
      justify-content: space-between;
      color: var(--whp-ink);
      font-size: 0.72rem;
      font-weight: 780;
    }

    label span {
      color: var(--whp-muted);
      font-weight: 500;
    }

    textarea {
      width: 100%;
      resize: vertical;
      border: 1px solid var(--whp-line-strong);
      border-radius: 0.12rem;
      padding: 0.75rem;
      color: var(--whp-ink);
      background: var(--whp-ground);
      font-family: var(--whp-font-editor);
      font-size: 1rem;
      line-height: 1.5;
    }

    textarea::placeholder {
      color: var(--whp-muted);
    }

    .launcher-actions,
    .suggestion-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .launcher-actions > span {
      color: var(--whp-muted);
      font-size: 0.68rem;
    }

    button {
      border-radius: 0.12rem;
      padding: 0.55rem 0.75rem;
      cursor: pointer;
      font-size: 0.7rem;
      font-weight: 800;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.48;
    }

    .primary-action {
      border: 1px solid var(--whp-accent);
      color: var(--whp-ground);
      background: var(--whp-accent);
    }

    .secondary-action {
      border: 1px solid var(--whp-line-strong);
      color: var(--whp-ink);
      background: var(--whp-surface);
    }

    .discover-error {
      display: grid;
      gap: 0.3rem;
      border-bottom: 1px solid var(--whp-line);
      border-left: 3px solid var(--whp-accent);
      padding: 0.9rem 1rem;
      color: var(--whp-ink);
      background: var(--whp-accent-tint);
    }

    .discover-error p {
      margin: 0;
      color: var(--whp-muted);
      font-size: 0.75rem;
      line-height: 1.5;
    }

    .suggestion-list {
      display: grid;
    }

    .suggestion-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.85rem;
      border-bottom: 1px solid var(--whp-line);
      padding: 1rem;
    }

    .suggestion-card:last-child {
      border-bottom: 0;
    }

    .angle-index {
      color: var(--whp-accent);
      font-size: 0.65rem;
      font-weight: 850;
    }

    .suggestion-card h3 {
      margin: 0;
      font-family: var(--whp-font-editor);
      font-size: 1.18rem;
      font-weight: 550;
    }

    .angle-body {
      margin: 0.4rem 0 0;
      color: var(--whp-ink);
      font-family: var(--whp-font-editor);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .angle-body :first-child {
      margin-top: 0;
    }

    .angle-body :last-child {
      margin-bottom: 0;
    }

    .suggestion-card small {
      display: block;
      margin-top: 0.6rem;
      color: var(--whp-muted);
      font-size: 0.62rem;
      line-height: 1.4;
    }

    .suggestion-actions {
      justify-content: flex-end;
      margin-top: 0.8rem;
    }

    .send-error {
      margin: 0.55rem 0 0;
      border-left: 3px solid var(--whp-accent);
      padding: 0.4rem 0.6rem;
      color: var(--whp-ink);
      background: var(--whp-accent-tint);
      font-size: 0.68rem;
      line-height: 1.45;
    }

    .empty-state {
      padding: 1.5rem 1rem;
      color: var(--whp-muted);
      text-align: center;
    }

    .empty-state strong {
      color: var(--whp-ink);
      font-family: var(--whp-font-editor);
      font-weight: 550;
    }

    .empty-state p {
      margin: 0.3rem 0 0;
      font-size: 0.72rem;
    }

    @media (max-width: 56rem) {
      .discover-hero {
        grid-template-columns: 1fr;
      }

      .hero-copy {
        max-width: 54ch;
      }
    }

    @media (max-width: 34rem) {
      .discover-page {
        padding-inline: 0.7rem;
      }

      .launcher-actions,
      .suggestion-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .launcher-actions > button,
      .suggestion-actions > button {
        width: 100%;
      }
    }
  `,
})
export class DiscoverPage implements OnDestroy {
  private readonly session = inject(STUDIO_SESSION);
  private readonly client = this.session.client;
  private readonly modelPreference = inject(ModelPreferenceService);
  private readonly ideateTracker = new OpTracker<IdeateMeta, unknown>(
    this.client,
    () => [],
    { modelPreference: this.modelPreference },
  );
  private activeIdeate: TrackedOperation<IdeateMeta> | null = null;
  private destroyed = false;

  protected readonly constraints = signal('');
  protected readonly ideateBusy = signal(false);
  protected readonly hasRun = signal(false);
  protected readonly cards = signal<readonly SuggestionCard[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly sending = signal<ReadonlySet<number>>(new Set());
  protected readonly sent = signal<ReadonlySet<number>>(new Set());
  protected readonly sendErrors = signal<ReadonlyMap<number, string>>(new Map());
  protected readonly String = String;

  ngOnDestroy(): void {
    this.destroyed = true;
    // Cancel any in-flight ideate so its OpTracker status-poll interval stops
    // and its post-completion callback writes nothing to a torn-down view.
    const id = this.activeIdeate?.id() ?? null;
    if (id !== null) {
      void this.ideateTracker.cancel(id).catch(() => undefined);
    }
    this.activeIdeate = null;
  }

  protected setConstraints(event: Event): void {
    this.constraints.set(
      event.target instanceof HTMLTextAreaElement ? event.target.value : '',
    );
  }

  protected suggestIdeas(): void {
    if (this.ideateBusy()) return;
    void this.runIdeate();
  }

  protected sendToInbox(index: number): void {
    if (this.isSending(index) || this.isSent(index)) return;
    const card = this.cards()[index];
    if (!card) return;
    void this.captureCard(index, card);
  }

  protected isSending(index: number): boolean {
    return this.sending().has(index);
  }

  protected isSent(index: number): boolean {
    return this.sent().has(index);
  }

  protected sendError(index: number): string | null {
    return this.sendErrors().get(index) ?? null;
  }

  protected sendLabel(index: number): string {
    if (this.isSent(index)) return 'Sent to inbox';
    return this.isSending(index) ? 'Sending…' : 'Send to inbox';
  }

  private async runIdeate(): Promise<void> {
    this.ideateBusy.set(true);
    this.error.set(null);
    this.cards.set([]);
    this.sending.set(new Set());
    this.sent.set(new Set());
    this.sendErrors.set(new Map());

    const notes = this.constraints().trim();
    const tracked = this.ideateTracker.launch(
      'ideate',
      buildTopicOperationInputs({
        // Cold start: no seed. The skill invents subjects from constraints
        // (or from nothing). Mirrors how the Topics ideate stage sends an
        // empty idea_text when the "Fresh thread" box is blank.
        ideaText: '',
        userConstraints: notes === '' ? {} : { notes },
        runArtifacts: null,
        selectedWinner: null,
      }, 'ideate'),
      { remainingHops: 0 },
    );
    this.activeIdeate = tracked;

    try {
      await tracked.completion;
      if (this.destroyed) return;
      this.settleIdeate(tracked);
    } catch (error) {
      if (this.destroyed) return;
      this.error.set(errorMessage(error));
    } finally {
      if (!this.destroyed) {
        this.ideateBusy.set(false);
        this.hasRun.set(true);
      }
      if (this.activeIdeate === tracked) this.activeIdeate = null;
    }
  }

  private settleIdeate(tracked: TrackedOperation<IdeateMeta>): void {
    const result = tracked.result();
    if (tracked.phase() === 'guardrail' && result !== null) {
      this.error.set(guardrailMessage(result));
      return;
    }
    if (tracked.phase() !== 'done' || result?.kind !== 'schema') {
      this.error.set(failureMessage(tracked));
      return;
    }
    const parsed = parseIdeateCards(result.value);
    if (parsed === null) {
      this.error.set(
        'The studio did not return usable subject and angle cards.',
      );
      return;
    }
    this.cards.set(parsed.map(toSuggestionCard));
  }

  private async captureCard(
    index: number,
    card: SuggestionCard,
  ): Promise<void> {
    this.sending.update((current) => new Set(current).add(index));
    this.clearSendError(index);
    try {
      // Match the Topics ideate funnel's inbox format (subject + angle,
      // source 'ideate') so a captured suggestion is indistinguishable from
      // one ideated inside the Topics page and dedupes on later full runs.
      await this.client.createIdea({
        text: `${card.subject}\n\n${card.angleMarkdown}`,
        source: 'ideate',
      });
      this.sent.update((current) => new Set(current).add(index));
    } catch (error) {
      // Per-card failure — kept separate from the suggest-launch error so it
      // never renders under the "could not suggest ideas" header.
      this.sendErrors.update(
        (current) => new Map(current).set(index, errorMessage(error)),
      );
    } finally {
      this.sending.update((current) => {
        const next = new Set(current);
        next.delete(index);
        return next;
      });
    }
  }

  private clearSendError(index: number): void {
    this.sendErrors.update((current) => {
      if (!current.has(index)) return current;
      const next = new Map(current);
      next.delete(index);
      return next;
    });
  }
}

function toSuggestionCard(card: ParsedIdeateCard): SuggestionCard {
  return {
    subject: card.subject,
    angleMarkdown: card.angleMarkdown,
    angleHtml: renderTopicMarkdown(card.angleMarkdown),
    seed: card.seed,
  };
}

function guardrailMessage(result: OperationResult): string {
  if (result.kind === 'schema') {
    if (typeof result.guardrail === 'string' && result.guardrail.trim() !== '') {
      return result.guardrail;
    }
    const value = result.value;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const markdown = (value as Record<string, unknown>)['guardrail_markdown'];
      if (typeof markdown === 'string' && markdown.trim() !== '') {
        return markdown;
      }
    }
  }
  return 'The studio narrowed or declined this request. Add or relax a '
    + 'constraint and try again.';
}

function failureMessage(tracked: TrackedOperation<IdeateMeta>): string {
  const result = tracked.result();
  if (result?.kind === 'failed') return result.error;
  return tracked.errorMessage()
    ?? 'The studio could not suggest ideas. Please try again.';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Operation failed.';
}
