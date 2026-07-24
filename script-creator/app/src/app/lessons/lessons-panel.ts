import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import type { LessonDetail } from '../api/client';
import { LessonsModel } from './model';

type ConfirmAction = 'approve' | 'reject' | 'retire' | 'supersede';

@Component({
  selector: 'app-lessons-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="learning-grid">
      <aside class="decision-rail" aria-labelledby="sessions-heading">
        <section>
          <header class="section-heading">
            <p>Decision windows</p>
            <h2 id="sessions-heading">Sessions</h2>
          </header>
          <ol class="session-list">
            @for (session of model().sessions(); track session.id) {
              <li>
                <strong>{{ session.endCursor === null ? 'Open' : 'Closed' }}</strong>
                <span>Decisions {{ session.startCursor + 1 }}–{{
                  session.endCursor ?? 'now'
                }}</span>
                <code>{{ session.id }}</code>
              </li>
            } @empty {
              <li class="empty">The first decision will open a session.</li>
            }
          </ol>
        </section>

        <section>
          <header class="section-heading">
            <p>Exact provenance</p>
            <h2>Decision feed</h2>
          </header>
          <ol class="decision-list">
            @for (decision of model().decisions(); track decision.id) {
              <li [id]="'decision-' + decision.id">
                <a [href]="'#decision-' + decision.id">
                  Decision {{ decision.seq }} · {{ decision.kind }}
                </a>
                <span>{{ decision.context.source.type }} · {{
                  decision.context.source.id
                }}</span>
                <small>{{ decision.disposition }}</small>
              </li>
            } @empty {
              <li class="empty">No explicit decisions in this draft yet.</li>
            }
          </ol>
        </section>
      </aside>

      <div class="review-column">
        <section class="distill-console" aria-labelledby="distill-heading">
          <div>
            <p class="eyebrow">Read-only skill run</p>
            <h2 id="distill-heading">Distill the decision window</h2>
            <p>
              Distill now snapshots the open window. Ending a session closes
              its current cursor; neither action runs on navigation or unload.
            </p>
          </div>
          <div class="distill-actions">
            <button
              type="button"
              [disabled]="model().busy() || !model().selectedDraftId()"
              (click)="model().distill('on-demand')"
            >
              Distill now
            </button>
            <button
              type="button"
              [disabled]="model().busy() || !model().selectedDraftId()"
              (click)="model().distill('session-end')"
            >
              End session &amp; distill
            </button>
          </div>
          <p
            class="operation-state"
            data-testid="distillation-state"
            aria-live="polite"
          >
            {{ model().announcement() }}
          </p>
          @if (model().distillation(); as run) {
            <dl>
              <div><dt>Run</dt><dd><code>{{ run.id }}</code></dd></div>
              <div><dt>State</dt><dd>{{ run.state }}</dd></div>
              <div>
                <dt>Operation</dt>
                <dd>{{ run.operationId ?? 'No operation launched' }}</dd>
              </div>
            </dl>
            @if (run.guardrailMarkdown) {
              <p class="guardrail" role="status">
                <strong>Guardrail</strong>
                {{ run.guardrailMarkdown }}
              </p>
            }
            @if (run.error) {
              <p class="error" role="alert">{{ run.error }}</p>
            }
          }
        </section>

        @if (model().error()) {
          <div class="error page-error" role="alert">
            <span>{{ model().error() }}</span>
            <button type="button" (click)="model().clearError()">Dismiss</button>
          </div>
        }

        <section class="review-queue" aria-labelledby="review-heading">
          <header class="queue-heading">
            <div>
              <p class="eyebrow">Martin-reviewed context</p>
              <h2 id="review-heading">Lesson review queue</h2>
            </div>
            <span>{{ model().lessons().length }} records</span>
          </header>

          @for (lesson of model().lessons(); track lesson.id) {
            <article
              class="lesson-card"
              [id]="'lesson-' + lesson.id"
              [attr.data-state]="lesson.state"
              [attr.data-classification]="lesson.classification"
            >
              <header>
                <div>
                  <span class="classification">{{ classification(lesson) }}</span>
                  <h3>{{ stateLabel(lesson) }}</h3>
                </div>
                <code>v{{ lesson.version }}</code>
              </header>

              @if (lesson.state === 'approved' && lesson.classification === 'episode-local') {
                <p class="active-banner">
                  <strong>Active</strong>
                  Supplied only to future operations for
                  {{ model().selectedDraft()?.title ?? lesson.draftId }}.
                </p>
              }
              @if (
                lesson.state === 'approved-pending-reconcile'
                || lesson.state === 'retirement-pending'
                || lesson.state === 'supersession-pending'
              ) {
                <p class="pending-banner">
                  Repository change pending. Current doctrine remains in force.
                </p>
              }

              <section class="proposal-block">
                <h4>Agent proposal</h4>
                <p>{{ lesson.proposedMarkdown ?? 'Stored in repository provenance.' }}</p>
              </section>

              @if (lesson.state === 'proposed') {
                <label [for]="'lesson-editor-' + lesson.id">
                  <span>Reviewed lesson text</span>
                  <textarea
                    [id]="'lesson-editor-' + lesson.id"
                    rows="5"
                    [value]="reviewText(lesson)"
                    (input)="setReviewText(lesson, $event)"
                  ></textarea>
                </label>
                <button
                  class="secondary"
                  type="button"
                  [disabled]="model().busy()"
                  (click)="saveReview(lesson)"
                >
                  Save review
                </button>
                <p class="edit-law">Saving text does not approve it.</p>
              } @else if (lesson.currentMarkdown) {
                <section class="current-block">
                  <h4>{{
                    lesson.classification === 'durable' && lesson.state === 'applied'
                      ? 'Repository-native current doctrine'
                      : 'Reviewed lesson'
                  }}</h4>
                  <p>{{ lesson.currentMarkdown }}</p>
                </section>
              }

              <dl class="lesson-meta">
                <div>
                  <dt>Rationale</dt>
                  <dd>{{ lesson.rationaleMarkdown }}</dd>
                </div>
                <div>
                  <dt>Target hint</dt>
                  <dd>{{ lesson.proposedTarget ?? 'No target proposed' }}</dd>
                </div>
                <div>
                  <dt>Supersedes</dt>
                  <dd>{{ lesson.supersedesLessonId ?? 'None' }}</dd>
                </div>
              </dl>

              <section class="evidence">
                <h4>Evidence</h4>
                <ul>
                  @for (evidence of lesson.evidence; track evidence.id) {
                    <li [class.stale]="evidence.status === 'stale'">
                      @if (evidence.decision; as decision) {
                        <a [href]="'#decision-' + evidence.id">
                          Decision {{ decision.seq }} · {{ decision.kind }}
                        </a>
                        <span>{{ decision.context.source.type }} {{
                          decision.context.source.id
                        }}</span>
                      } @else {
                        <span role="alert">
                          Stale evidence link · {{ evidence.id }}
                        </span>
                      }
                    </li>
                  }
                </ul>
              </section>

              @if (
                lesson.repositoryProvenance?.status === 'unresolved'
              ) {
                <p class="stale-pointer" role="alert">
                  <strong>Blocking stale repository pointer.</strong>
                  {{ unresolvedReason(lesson) }}
                  Reconciliation cannot safely proceed until provenance is repaired.
                </p>
              }
              @if (lesson.repositoryProvenance?.status === 'resolved') {
                <p class="repository-pointer">
                  Repository source:
                  <code>{{ resolvedPath(lesson) }}</code>
                  · {{ resolvedAnchor(lesson) }}
                </p>
              }

              @if (lesson.reconciliation; as reconciliation) {
                <section class="handoff" aria-label="Durable reconciliation handoff">
                  <header>
                    <div>
                      <p class="eyebrow">External reconcile-whp handoff</p>
                      <h4>{{ reconciliation.kind }} · {{ reconciliation.state }}</h4>
                    </div>
                    @if (reconciliation.repositoryCommit) {
                      <code>{{ reconciliation.repositoryCommit }}</code>
                    }
                  </header>
                  @if (reconciliation.state !== 'verified') {
                    <p class="doctrine-law">
                      Script Creator does not edit or commit doctrine. Copy this proposal,
                      run it in the selected repository controller, invoke
                      <code>$reconcile-whp</code>, review the diff, and commit separately.
                    </p>
                    <pre>{{ reconciliation.preparedMarkdown }}</pre>
                    <div class="handoff-actions">
                      <button
                        type="button"
                        (click)="copyHandoff(reconciliation.preparedMarkdown)"
                      >
                        Copy handoff
                      </button>
                      @if (reconciliation.state === 'prepared') {
                        <button type="button" (click)="model().markAwaiting(lesson)">
                          I started external reconciliation
                        </button>
                      }
                    </div>
                  } @else {
                    <p class="doctrine-law">
                      Verified history is retained from repository provenance only.
                    </p>
                  }
                  @if (copyMessage()) {
                    <p
                      [class.error]="copyFailed()"
                      [attr.role]="copyFailed() ? 'alert' : 'status'"
                    >
                      {{ copyMessage() }}
                    </p>
                  }
                  @if (reconciliation.state !== 'verified') {
                    <form (submit)="verifyCommit(lesson, $event)">
                      <label [for]="'commit-' + lesson.id">
                        Resulting external commit
                      </label>
                      <input
                        [id]="'commit-' + lesson.id"
                        type="text"
                        autocomplete="off"
                        placeholder="Commit hash after reviewed reconciliation"
                        [value]="commitValue(lesson.id)"
                        (input)="setCommitValue(lesson.id, $event)"
                      />
                      <button type="submit">Verify external commit</button>
                    </form>
                  }
                </section>
              }

              @if (lesson.state === 'proposed') {
                <div class="card-actions">
                  <button
                    type="button"
                    [disabled]="model().busy()"
                    (click)="requestConfirmation(lesson, 'approve')"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    [disabled]="model().busy()"
                    (click)="requestConfirmation(lesson, 'reject')"
                  >
                    Reject
                  </button>
                  <label class="supersede-control">
                    <span>Predecessor lesson ID</span>
                    <input
                      type="text"
                      [attr.aria-label]="'Predecessor lesson ID for ' + lesson.id"
                      [value]="predecessorValue(lesson)"
                      (input)="setPredecessorValue(lesson.id, $event)"
                    />
                  </label>
                  <button
                    type="button"
                    [disabled]="model().busy() || !predecessorValue(lesson)"
                    (click)="requestConfirmation(lesson, 'supersede')"
                  >
                    Supersede
                  </button>
                </div>
              } @else if (
                lesson.state === 'approved'
                || lesson.state === 'applied'
              ) {
                <div class="card-actions">
                  <button
                    type="button"
                    [disabled]="model().busy() || staleRepository(lesson)"
                    (click)="requestConfirmation(lesson, 'retire')"
                  >
                    Retire
                  </button>
                </div>
              }

              @if (confirmationFor(lesson); as action) {
                <div class="confirmation" role="group" aria-label="Confirm lesson action">
                  <strong>Confirm {{ action }}</strong>
                  <span>{{ confirmationWarning(lesson, action) }}</span>
                  <button type="button" (click)="confirm(lesson, action)">
                    Confirm {{ action }}
                  </button>
                  <button type="button" (click)="cancelConfirmation()">
                    Cancel
                  </button>
                </div>
              }
            </article>
          } @empty {
            <p class="empty queue-empty">
              No lesson proposals yet. Distillation only proposes; Martin approves.
            </p>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    p, h2, h3, h4, pre, dl, dd { margin: 0; }
    button, textarea, input { font: inherit; }
    button { cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .48; }
    .learning-grid {
      display: grid;
      grid-template-columns: minmax(15rem, 19rem) minmax(0, 1fr);
      align-items: start;
      gap: clamp(1rem, 2vw, 2rem);
    }
    .decision-rail {
      position: sticky;
      top: 4.8rem;
      display: grid;
      max-height: calc(100vh - 6rem);
      gap: 1.2rem;
      overflow: auto;
      border: 1px solid var(--whp-line);
      padding: 1rem;
      background: var(--whp-panel);
    }
    .section-heading, .queue-heading, .lesson-card > header,
    .handoff > header, .distill-actions, .card-actions, .handoff-actions,
    .confirmation, .page-error {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .7rem;
    }
    .section-heading p, .eyebrow, .classification {
      color: var(--whp-accent);
      font-size: .62rem;
      font-weight: 850;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .section-heading { align-items: end; }
    .section-heading h2 { font-size: .92rem; }
    .session-list, .decision-list, .evidence ul {
      display: grid;
      gap: .65rem;
      margin: .8rem 0 0;
      padding: 0;
      list-style: none;
    }
    .session-list li, .decision-list li {
      display: grid;
      gap: .18rem;
      border-top: 1px solid var(--whp-line);
      padding-top: .6rem;
      font-size: .72rem;
    }
    a { color: var(--whp-ink); font-weight: 780; text-underline-offset: .16em; }
    code { overflow-wrap: anywhere; font-family: var(--whp-font-mono); font-size: .67rem; }
    .review-column, .review-queue { display: grid; gap: 1rem; min-width: 0; }
    .distill-console {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1rem;
      border-top: 3px solid var(--whp-accent);
      padding: 1rem;
      background: var(--whp-ink);
      color: var(--whp-surface);
    }
    .distill-console h2 { margin: .2rem 0 .4rem; font-family: var(--whp-font-editor); }
    .distill-console > div > p:not(.eyebrow) { max-width: 62ch; color: #c7c2b9; line-height: 1.45; }
    .distill-actions { align-self: start; }
    .distill-actions button, .handoff-actions button, .card-actions button,
    .secondary, .confirmation button, form button, .page-error button {
      border: 1px solid currentColor;
      padding: .5rem .72rem;
      background: transparent;
      color: inherit;
      font-size: .73rem;
      font-weight: 800;
    }
    .operation-state, .distill-console dl, .guardrail, .distill-console .error {
      grid-column: 1 / -1;
    }
    .operation-state { border-top: 1px solid #45423d; padding-top: .75rem; font-size: .78rem; }
    .distill-console dl { display: flex; flex-wrap: wrap; gap: 1rem; font-size: .7rem; }
    .distill-console dl div { display: grid; gap: .15rem; }
    dt { color: var(--whp-muted); font-size: .62rem; font-weight: 800; text-transform: uppercase; }
    .guardrail, .error, .active-banner, .pending-banner, .stale-pointer {
      border-left: 3px solid var(--whp-accent);
      padding: .65rem .8rem;
      background: var(--whp-accent-tint);
      color: var(--whp-ink);
      font-size: .76rem;
      line-height: 1.45;
    }
    .page-error { border: 1px solid var(--whp-accent); }
    .queue-heading { border-bottom: 1px solid var(--whp-line-strong); padding: .8rem 0; }
    .queue-heading h2 { margin-top: .2rem; font-family: var(--whp-font-editor); font-size: 1.7rem; font-weight: 500; }
    .queue-heading > span { color: var(--whp-muted); font-size: .72rem; }
    .lesson-card {
      display: grid;
      gap: 1rem;
      border: 1px solid var(--whp-line);
      padding: clamp(.9rem, 2vw, 1.35rem);
      background: var(--whp-surface);
    }
    .lesson-card[data-state="proposed"] { border-top: 3px solid var(--whp-accent); }
    .lesson-card h3 { margin-top: .2rem; font-family: var(--whp-font-editor); font-size: 1.3rem; font-weight: 540; }
    .proposal-block, .current-block { display: grid; gap: .35rem; }
    .proposal-block p, .current-block p, .lesson-meta dd, .doctrine-law {
      font-family: var(--whp-font-editor);
      line-height: 1.55;
      white-space: pre-wrap;
    }
    .lesson-card label, .supersede-control { display: grid; gap: .35rem; font-size: .7rem; font-weight: 780; }
    textarea, input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--whp-line-strong);
      padding: .65rem;
      background: var(--whp-panel);
      color: var(--whp-ink);
    }
    textarea { resize: vertical; font-family: var(--whp-font-editor); line-height: 1.45; }
    .secondary { justify-self: start; color: var(--whp-ink); }
    .edit-law { color: var(--whp-muted); font-size: .7rem; }
    .lesson-meta { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: .7rem; }
    .lesson-meta div { display: grid; gap: .25rem; border-top: 1px solid var(--whp-line); padding-top: .55rem; }
    .lesson-meta dd { font-size: .78rem; }
    .evidence { display: grid; gap: .35rem; }
    .evidence li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .4rem; font-size: .72rem; }
    .evidence li.stale { color: var(--whp-accent); }
    .repository-pointer { font-size: .72rem; }
    .handoff { display: grid; gap: .8rem; border: 1px solid var(--whp-line-strong); padding: .9rem; background: var(--whp-panel); }
    .handoff pre { max-height: 18rem; overflow: auto; border: 1px solid var(--whp-line); padding: .75rem; background: var(--whp-surface); font-size: .68rem; line-height: 1.45; white-space: pre-wrap; }
    .handoff form { display: grid; grid-template-columns: minmax(10rem, 1fr) auto; gap: .5rem; align-items: end; }
    .handoff form label { grid-column: 1 / -1; }
    .card-actions { justify-content: flex-start; flex-wrap: wrap; border-top: 1px solid var(--whp-line); padding-top: .8rem; }
    .card-actions button { color: var(--whp-ink); }
    .supersede-control { min-width: min(100%, 17rem); margin-inline-start: auto; }
    .confirmation { align-items: start; flex-wrap: wrap; border: 1px solid var(--whp-accent); padding: .7rem; background: var(--whp-accent-tint); font-size: .74rem; }
    .confirmation span { flex: 1 1 20rem; }
    .empty { color: var(--whp-muted); font-size: .72rem; }
    .queue-empty { padding: 2rem; text-align: center; }
    @media (max-width: 54rem) {
      .learning-grid { grid-template-columns: 1fr; }
      .decision-rail { position: static; max-height: none; grid-template-columns: 1fr 1fr; }
      .distill-console { grid-template-columns: 1fr; }
      .distill-actions { justify-content: flex-start; flex-wrap: wrap; }
    }
    @media (max-width: 36rem) {
      .decision-rail, .lesson-meta { grid-template-columns: 1fr; }
      .handoff form { grid-template-columns: 1fr; }
      .handoff form label { grid-column: auto; }
      .supersede-control { margin-inline-start: 0; width: 100%; }
    }
  `,
})
export class LessonsPanel {
  readonly model = input.required<LessonsModel>();
  protected readonly copyMessage = signal<string | null>(null);
  protected readonly copyFailed = signal(false);
  private readonly reviewValues = signal<Record<string, string>>({});
  private readonly predecessorValues = signal<Record<string, string>>({});
  private readonly commitValues = signal<Record<string, string>>({});
  private readonly confirmation = signal<{
    lessonId: string;
    action: ConfirmAction;
  } | null>(null);

  protected classification(lesson: LessonDetail): string {
    return lesson.classification === 'episode-local'
      ? 'Episode-local context'
      : 'Durable doctrine candidate';
  }

  protected stateLabel(lesson: LessonDetail): string {
    return lesson.state.split('-').map((part) =>
      part.slice(0, 1).toUpperCase() + part.slice(1)).join(' ');
  }

  protected reviewText(lesson: LessonDetail): string {
    return this.reviewValues()[lesson.id]
      ?? lesson.reviewedMarkdown
      ?? lesson.proposedMarkdown
      ?? '';
  }

  protected setReviewText(lesson: LessonDetail, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.reviewValues.update((values) => ({ ...values, [lesson.id]: value }));
  }

  protected saveReview(lesson: LessonDetail): void {
    void this.model().editLesson(lesson, this.reviewText(lesson));
  }

  protected predecessorValue(lesson: LessonDetail): string {
    return this.predecessorValues()[lesson.id]
      ?? lesson.supersedesLessonId
      ?? '';
  }

  protected setPredecessorValue(lessonId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.predecessorValues.update((values) => ({
      ...values,
      [lessonId]: value,
    }));
  }

  protected commitValue(lessonId: string): string {
    return this.commitValues()[lessonId] ?? '';
  }

  protected setCommitValue(lessonId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.commitValues.update((values) => ({ ...values, [lessonId]: value }));
  }

  protected verifyCommit(lesson: LessonDetail, event: Event): void {
    event.preventDefault();
    const commit = this.commitValue(lesson.id).trim();
    if (commit) void this.model().verifyReconciliation(lesson, commit);
  }

  protected requestConfirmation(
    lesson: LessonDetail,
    action: ConfirmAction,
  ): void {
    this.confirmation.set({ lessonId: lesson.id, action });
  }

  protected confirmationFor(lesson: LessonDetail): ConfirmAction | null {
    const value = this.confirmation();
    return value?.lessonId === lesson.id ? value.action : null;
  }

  protected confirmationWarning(
    lesson: LessonDetail,
    action: ConfirmAction,
  ): string {
    if (action === 'approve' && lesson.classification === 'durable') {
      return 'This prepares an external reconcile handoff; it does not change doctrine.';
    }
    if (action === 'retire' && lesson.classification === 'durable') {
      return 'Doctrine remains active until an external reconciliation commit verifies.';
    }
    return `This explicitly records Martin’s ${action} decision.`;
  }

  protected confirm(lesson: LessonDetail, action: ConfirmAction): void {
    this.confirmation.set(null);
    if (action === 'approve') void this.model().approveLesson(lesson);
    if (action === 'reject') void this.model().rejectLesson(lesson);
    if (action === 'retire') void this.model().retireLesson(lesson);
    if (action === 'supersede') {
      void this.model().supersedeLesson(
        lesson,
        this.predecessorValue(lesson),
      );
    }
  }

  protected cancelConfirmation(): void {
    this.confirmation.set(null);
  }

  protected async copyHandoff(markdown: string): Promise<void> {
    try {
      if (!globalThis.navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable');
      }
      await globalThis.navigator.clipboard.writeText(markdown);
      this.copyFailed.set(false);
      this.copyMessage.set('Handoff copied.');
    } catch {
      this.copyFailed.set(true);
      this.copyMessage.set(
        'Copy failed. Select the handoff text and copy it manually.',
      );
    }
  }

  protected staleRepository(lesson: LessonDetail): boolean {
    return lesson.repositoryProvenance?.status === 'unresolved';
  }

  protected unresolvedReason(lesson: LessonDetail): string {
    const provenance = lesson.repositoryProvenance;
    return provenance?.status === 'unresolved' ? provenance.reason : '';
  }

  protected resolvedPath(lesson: LessonDetail): string {
    const provenance = lesson.repositoryProvenance;
    return provenance?.status === 'resolved' ? provenance.path : '';
  }

  protected resolvedAnchor(lesson: LessonDetail): string {
    const provenance = lesson.repositoryProvenance;
    return provenance?.status === 'resolved' ? provenance.anchor : '';
  }
}
