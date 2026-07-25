import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type {
  GateCheckResult,
  IdeaRecord,
  IdeaStatus,
  OperationName,
  OperationRecord,
  OperationResult,
  TopicGateName,
  TopicBrief,
} from '../api/client';
import {
  operationFailurePresentation,
  type OperationFailurePresentation,
} from '../ops/failure-presentation';
import { ModelPreferenceService } from '../ops/model-preference';
import {
  OpTracker,
  type TrackedOperation,
} from '../ops/tracker';
import {
  mapStudioConsoleEvents,
  type StudioConsoleEntry,
} from '../panels/agent-console';
import {
  STUDIO_SESSION,
  type StudioRuntimeHandle,
} from '../studio-session';
import { HelpTargetDirective } from '../help/help-target.directive';
import { ProcessingChip } from '../ops/processing-chip';
import { FullRunPanel } from './full-run-panel';
import { parseIdeateCards, type ParsedIdeateCard } from './ideate-cards';
import { buildTopicOperationInputs } from './inputs';

const TOPIC_GATE_NAMES = [
  'game_play_centrality',
  'human_revelation',
  'recognized_payoff',
  'evidence_path',
  'production_reality',
  'portfolio_fit',
] as const;

type TopicVerdict = 'pass' | 'fail' | 'unknown';

interface IdeateCard extends ParsedIdeateCard {
  ideaId: string;
}

interface GateCheckMeta {
  ideaId: string;
  remainingHops: 0;
}

type GateTrackedOperation = TrackedOperation<
  GateCheckMeta,
  StudioConsoleEntry
>;

interface OperationOutcome {
  operation: OperationRecord;
  result: OperationResult;
}

interface GuardrailPresentation {
  id: number;
  operation: OperationName;
  markdown: string;
}

@Component({
  selector: 'app-topics-page',
  standalone: true,
  imports: [FullRunPanel, HelpTargetDirective, ProcessingChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="topics-page" data-testid="topics-page">
      <header class="topics-hero">
        <div>
          <p class="eyebrow">Topic studio</p>
          <h1>Work the question before the script.</h1>
        </div>
        <p class="hero-copy">
          Catch a hunch, open it into angles, then test whether the strongest
          idea belongs on Why Humans Play.
        </p>
        <sc-processing-chip
          [operations]="[
            'ideate', 'quick-gate-check', 'package-test',
            'full-topic-run', 'handoff-preview'
          ]"
        />
      </header>

      @if (selectedTopicSlug()) {
        <section
          class="selected-topic-brief"
          data-testid="selected-topic-brief"
          aria-labelledby="selected-topic-heading"
          appHelpTarget="topics.brief"
        >
          <header>
            <div>
              <p class="stage-kicker">Repository selection</p>
              <h2 id="selected-topic-heading">{{ selectedTopicSlug() }}</h2>
            </div>
            @if (selectedTopicRef()) {
              <code>{{ selectedTopicRef() }}</code>
            }
          </header>
          @if (selectedTopicLoading()) {
            <p role="status">Loading repository topic brief…</p>
          } @else if (selectedTopicError()) {
            <p role="alert">{{ selectedTopicError() }}</p>
          } @else if (selectedTopicBrief(); as brief) {
            <pre>{{ brief.markdown }}</pre>
          }
        </section>
      }

      @if (loadError()) {
        <article
          class="operation-failure-callout page-callout"
          data-testid="operation-failure"
          role="alert"
        >
          <strong>Idea inbox</strong>
          <p>{{ loadError() }}</p>
        </article>
      }

      <div class="callout-stack" aria-live="polite">
        @for (failure of failures(); track failure) {
          <article
            class="operation-failure-callout"
            data-testid="operation-failure"
            role="alert"
          >
            <strong>{{ failure.operation }} · {{ failure.state }}</strong>
            <p>{{ failure.reason }}</p>
          </article>
        }
        @for (guardrail of guardrails(); track guardrail.id) {
          <article
            class="guardrail-callout"
            data-testid="operation-guardrail"
          >
            <strong>{{ guardrail.operation }} guardrail</strong>
            <p>{{ guardrail.markdown }}</p>
          </article>
        }
      </div>

      <div class="topic-workbench">
        <section
          class="workbench-stage inbox-stage"
          aria-labelledby="inbox-heading"
          appHelpTarget="topics.inbox"
        >
          <header class="stage-heading">
            <span class="stage-marker" aria-hidden="true">01</span>
            <div>
              <p class="stage-kicker">Catch</p>
              <h2 id="inbox-heading">Idea inbox</h2>
            </div>
            <span class="stage-count">{{ ideas().length }}</span>
          </header>

          <form class="capture-box" (submit)="captureIdea($event)">
            <label for="idea-capture">What keeps tugging at you?</label>
            <textarea
              id="idea-capture"
              data-testid="idea-capture-input"
              rows="3"
              placeholder="A behavior, contradiction, game, or question…"
              [value]="captureText()"
              (input)="setCaptureText($event)"
            ></textarea>
            <div class="form-actions">
              <span>Stored as an inbox idea</span>
              <button
                class="primary-action"
                type="submit"
                [disabled]="captureBusy() || captureText().trim() === ''"
              >
                {{ captureBusy() ? 'Capturing…' : 'Capture idea' }}
              </button>
            </div>
          </form>

          <div class="idea-list" data-testid="idea-list">
            @for (idea of ideas(); track idea.id) {
              <article
                class="idea-card"
                data-testid="idea-card"
                [attr.data-status]="idea.status"
                [attr.data-source]="idea.source"
              >
                <div class="idea-meta">
                  <span class="source-tag">{{ sourceLabel(idea) }}</span>
                  <label class="selection-control">
                    <input
                      type="checkbox"
                      [checked]="isSelected(idea.id)"
                      (change)="toggleSelected(idea.id, $event)"
                    />
                    Use for ideation
                  </label>
                </div>
                <p class="idea-text">{{ idea.text }}</p>
                <div class="idea-actions">
                  <label>
                    <span>Status</span>
                    <select
                      [attr.aria-label]="'Status for ' + idea.text"
                      [value]="idea.status"
                      (change)="changeStatus(idea, $event)"
                    >
                      <option value="open">Open</option>
                      <option value="promoted">Promoted</option>
                      <option value="discarded">Discarded</option>
                    </select>
                  </label>
                  <button
                    class="secondary-action"
                    data-testid="gate-check-button"
                    type="button"
                    [disabled]="gatePending(idea.id)"
                    (click)="gateCheck(idea.id)"
                  >
                    {{ gatePending(idea.id) ? 'Checking…' : 'Gate-check' }}
                  </button>
                </div>

                @if (gatePending(idea.id)) {
                  <div
                    class="gate-pending"
                    data-testid="gate-check-pending"
                    [attr.data-phase]="gatePhase(idea.id)"
                    role="status"
                  >
                    Gate-check · {{ gatePhase(idea.id) }}…
                  </div>
                }

                @if (gateChecks()[idea.id]; as check) {
                  <section
                    class="gate-result"
                    data-testid="gate-check-result"
                    [attr.aria-label]="'Gate-check for ' + idea.text"
                  >
                    <header>
                      <span>Six-gate read</span>
                      <strong
                        class="verdict-badge"
                        data-testid="gate-verdict"
                        [attr.data-verdict]="check.verdict"
                      >
                        {{ check.verdict }}
                      </strong>
                    </header>
                    <div class="gate-grid">
                      @for (gate of check.gates; track gate.gate) {
                        <details
                          class="gate-chip"
                          data-testid="gate-chip"
                          [attr.data-verdict]="gate.verdict"
                        >
                          <summary>
                            <span>{{ gateLabel(gate.gate) }}</span>
                            <strong>{{ gate.verdict }}</strong>
                          </summary>
                          <p>{{ gate.reasonMarkdown }}</p>
                        </details>
                      }
                    </div>
                  </section>
                }
              </article>
            } @empty {
              <div class="empty-state">
                <strong>The inbox is clear.</strong>
                <p>Capture the first question you cannot leave alone.</p>
              </div>
            }
          </div>
        </section>

        <section
          class="workbench-stage ideate-stage"
          aria-labelledby="ideate-heading"
          appHelpTarget="topics.ideate"
        >
          <header class="stage-heading">
            <span class="stage-marker" aria-hidden="true">02</span>
            <div>
              <p class="stage-kicker">Open</p>
              <h2 id="ideate-heading">Ideate angles</h2>
            </div>
            <span class="stage-count">{{ selectedIdeaIds().length }}</span>
          </header>

          <div class="ideate-launcher">
            <p>
              Combine checked inbox ideas with an optional fresh thread.
              The topic skill returns subjects and angles without ranking them.
            </p>
            <label for="ideate-free-text">Fresh thread <span>optional</span></label>
            <textarea
              id="ideate-free-text"
              data-testid="ideate-free-text"
              rows="4"
              placeholder="Add another question or constraint for this pass…"
              [value]="ideateFreeText()"
              (input)="setIdeateFreeText($event)"
            ></textarea>
            <div class="selected-readout">
              <span>{{ selectedIdeaIds().length }} inbox ideas selected</span>
              <button
                class="primary-action"
                type="button"
                [disabled]="ideateBusy() || !canIdeate()"
                (click)="ideate()"
              >
                {{ ideateBusy() ? 'Ideating…' : 'Ideate angles' }}
              </button>
            </div>
          </div>

          <div class="ideate-results" data-testid="ideate-results">
            @for (card of ideateCards(); track $index) {
              <article class="angle-card" data-testid="angle-card">
                <span class="angle-index">
                  {{ String($index + 1).padStart(2, '0') }}
                </span>
                <div>
                  <h3>{{ card.subject }}</h3>
                  <p>{{ card.angleMarkdown }}</p>
                  <small>Seed: {{ card.seed }}</small>
                  <div class="angle-actions">
                    <button
                      class="secondary-action"
                      data-testid="gate-check-button"
                      type="button"
                      [disabled]="gatePending(card.ideaId)"
                      (click)="gateCheck(card.ideaId)"
                    >
                      {{ gatePending(card.ideaId) ? 'Checking…' : 'Gate-check' }}
                    </button>
                  </div>

                  @if (gatePending(card.ideaId)) {
                    <div
                      class="gate-pending"
                      data-testid="gate-check-pending"
                      [attr.data-phase]="gatePhase(card.ideaId)"
                      role="status"
                    >
                      Gate-check · {{ gatePhase(card.ideaId) }}…
                    </div>
                  }

                  @if (gateChecks()[card.ideaId]; as check) {
                    <section
                      class="gate-result"
                      data-testid="gate-check-result"
                      [attr.aria-label]="'Gate-check for ' + card.subject"
                    >
                      <header>
                        <span>Six-gate read</span>
                        <strong
                          class="verdict-badge"
                          data-testid="gate-verdict"
                          [attr.data-verdict]="check.verdict"
                        >
                          {{ check.verdict }}
                        </strong>
                      </header>
                      <div class="gate-grid">
                        @for (gate of check.gates; track gate.gate) {
                          <details
                            class="gate-chip"
                            data-testid="gate-chip"
                            [attr.data-verdict]="gate.verdict"
                          >
                            <summary>
                              <span>{{ gateLabel(gate.gate) }}</span>
                              <strong>{{ gate.verdict }}</strong>
                            </summary>
                            <p>{{ gate.reasonMarkdown }}</p>
                          </details>
                        }
                      </div>
                    </section>
                  }
                </div>
              </article>
            } @empty {
              <div class="empty-state ideate-empty">
                <strong>No angle cards yet.</strong>
                <p>Select an inbox idea or write a fresh thread to begin.</p>
              </div>
            }
          </div>
        </section>
      </div>

      <app-full-run-panel />
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .topics-page {
      display: grid;
      width: min(100%, 96rem);
      margin-inline: auto;
      gap: 1rem;
      padding: clamp(1rem, 2.5vw, 2.4rem);
    }

    .topics-hero {
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
      max-width: 17ch;
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
      max-width: 44ch;
      margin: 0;
      color: var(--whp-muted);
      font-family: var(--whp-font-editor);
      font-size: clamp(1rem, 1.8vw, 1.25rem);
      line-height: 1.55;
    }

    .callout-stack {
      display: grid;
      gap: 0.5rem;
    }

    .callout-stack:empty {
      display: none;
    }

    .page-callout {
      margin: 0;
    }

    .topic-workbench {
      display: grid;
      grid-template-columns: minmax(25rem, 1.18fr) minmax(22rem, 0.82fr);
      align-items: start;
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

    .capture-box,
    .ideate-launcher {
      display: grid;
      gap: 0.75rem;
      border-bottom: 1px solid var(--whp-line);
      padding: 1rem;
    }

    label {
      color: var(--whp-ink);
      font-size: 0.72rem;
      font-weight: 780;
    }

    textarea,
    select {
      border: 1px solid var(--whp-line-strong);
      border-radius: 0.12rem;
      color: var(--whp-ink);
      background: var(--whp-ground);
    }

    textarea {
      width: 100%;
      resize: vertical;
      padding: 0.75rem;
      font-family: var(--whp-font-editor);
      font-size: 1rem;
      line-height: 1.5;
    }

    textarea::placeholder {
      color: var(--whp-muted);
    }

    .form-actions,
    .selected-readout,
    .idea-actions,
    .idea-meta,
    .gate-result > header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .form-actions > span,
    .selected-readout > span {
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

    .idea-list,
    .ideate-results {
      display: grid;
    }

    .selected-topic-brief {
      display: grid;
      gap: .8rem;
      border: 1px solid var(--whp-line-strong);
      border-left: 3px solid var(--whp-accent);
      padding: 1rem;
      background: var(--whp-surface);
    }

    .selected-topic-brief > header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 1rem;
    }

    .selected-topic-brief h2,
    .selected-topic-brief p {
      margin: 0;
    }

    .selected-topic-brief code {
      color: var(--whp-muted);
      font-size: .62rem;
    }

    .selected-topic-brief pre {
      overflow-x: auto;
      margin: 0;
      border-top: 1px solid var(--whp-line);
      padding-top: .8rem;
      font-family: var(--whp-font-editor);
      font-size: .92rem;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .idea-card {
      display: grid;
      gap: 0.85rem;
      border-bottom: 1px solid var(--whp-line);
      padding: 1rem;
    }

    .idea-card:last-child {
      border-bottom: 0;
    }

    .idea-card[data-status='discarded'] {
      opacity: 0.64;
    }

    .idea-card[data-status='promoted'] {
      border-left: 3px solid var(--whp-success);
    }

    .source-tag {
      color: var(--whp-muted);
      font-family: var(--whp-font-mono);
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .selection-control {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--whp-muted);
      cursor: pointer;
      font-size: 0.66rem;
    }

    .selection-control input {
      accent-color: var(--whp-accent);
    }

    .idea-text {
      margin: 0;
      font-family: var(--whp-font-editor);
      font-size: 1.08rem;
      line-height: 1.48;
      white-space: pre-wrap;
    }

    .idea-actions > label {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      color: var(--whp-muted);
      font-size: 0.64rem;
    }

    select {
      padding: 0.42rem 1.8rem 0.42rem 0.5rem;
      font-size: 0.7rem;
    }

    .gate-pending {
      border-top: 1px solid var(--whp-line-soft);
      padding-top: 0.75rem;
      color: var(--whp-muted);
      font-family: var(--whp-font-mono);
      font-size: 0.64rem;
      text-transform: capitalize;
    }

    .gate-result {
      display: grid;
      gap: 0.65rem;
      border-top: 1px solid var(--whp-line-soft);
      padding-top: 0.85rem;
    }

    .gate-result > header > span {
      color: var(--whp-muted);
      font-size: 0.62rem;
      font-weight: 850;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .verdict-badge {
      border: 1px solid currentcolor;
      border-radius: 999px;
      padding: 0.2rem 0.5rem;
      font-size: 0.62rem;
      text-transform: uppercase;
    }

    [data-verdict='pass'] {
      color: var(--whp-success);
    }

    [data-verdict='fail'] {
      color: var(--whp-accent);
    }

    [data-verdict='unknown'] {
      color: var(--whp-warning);
    }

    .gate-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.4rem;
    }

    .gate-chip {
      border: 1px solid var(--whp-line);
      border-left: 3px solid currentcolor;
      background: var(--whp-ground);
    }

    .gate-chip summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5rem;
      cursor: pointer;
      list-style: none;
    }

    .gate-chip summary::-webkit-details-marker {
      display: none;
    }

    .gate-chip summary span {
      color: var(--whp-ink);
      font-size: 0.65rem;
      font-weight: 750;
    }

    .gate-chip summary strong {
      font-size: 0.58rem;
      text-transform: uppercase;
    }

    .gate-chip p {
      margin: 0;
      border-top: 1px solid var(--whp-line-soft);
      padding: 0.55rem;
      color: var(--whp-muted);
      font-size: 0.7rem;
      line-height: 1.45;
    }

    .ideate-launcher > p {
      margin: 0;
      color: var(--whp-muted);
      font-size: 0.78rem;
      line-height: 1.5;
    }

    .ideate-launcher label {
      display: flex;
      justify-content: space-between;
    }

    .ideate-launcher label span {
      color: var(--whp-muted);
      font-weight: 500;
    }

    .angle-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.85rem;
      border-bottom: 1px solid var(--whp-line);
      padding: 1rem;
    }

    .angle-card:last-child {
      border-bottom: 0;
    }

    .angle-index {
      color: var(--whp-accent);
      font-size: 0.65rem;
      font-weight: 850;
    }

    .angle-card h3 {
      margin: 0;
      font-family: var(--whp-font-editor);
      font-size: 1.18rem;
      font-weight: 550;
    }

    .angle-card p {
      margin: 0.4rem 0 0;
      color: var(--whp-ink);
      font-family: var(--whp-font-editor);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .angle-card small {
      display: block;
      margin-top: 0.6rem;
      color: var(--whp-muted);
      font-size: 0.62rem;
      line-height: 1.4;
    }

    .angle-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.8rem;
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
      .topics-hero,
      .topic-workbench {
        grid-template-columns: 1fr;
      }

      .hero-copy {
        max-width: 54ch;
      }
    }

    @media (max-width: 34rem) {
      .topics-page {
        padding-inline: 0.7rem;
      }

      .form-actions,
      .selected-readout,
      .idea-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .form-actions > button,
      .selected-readout > button,
      .idea-actions > button {
        width: 100%;
      }

      .idea-actions > label {
        justify-content: space-between;
      }

      .gate-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class TopicsPage implements OnInit, OnDestroy {
  private readonly session = inject(STUDIO_SESSION);
  private readonly client = this.session.client;
  private readonly modelPreference = inject(ModelPreferenceService);
  private readonly route = inject(ActivatedRoute);
  private readonly gateTracker = new OpTracker<
    GateCheckMeta,
    StudioConsoleEntry
  >(
    this.client,
    mapStudioConsoleEvents,
    { modelPreference: this.modelPreference },
  );
  private detachGateRuntime: (() => void) | null = null;
  private calloutSequence = 0;
  private readonly activeGateLifecycles = signal<ReadonlySet<string>>(
    new Set(),
  );

  protected readonly ideas = signal<readonly IdeaRecord[]>([]);
  protected readonly captureText = signal('');
  protected readonly captureBusy = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly selectedTopicSlug = signal<string | null>(null);
  protected readonly selectedTopicRef = signal<string | null>(null);
  protected readonly selectedTopicBrief = signal<TopicBrief | null>(null);
  protected readonly selectedTopicLoading = signal(false);
  protected readonly selectedTopicError = signal<string | null>(null);
  protected readonly selectedIdeaIds = signal<readonly string[]>([]);
  protected readonly ideateFreeText = signal('');
  protected readonly ideateBusy = signal(false);
  protected readonly ideateCards = signal<readonly IdeateCard[]>([]);
  protected readonly gateOperations =
    signal<Readonly<Record<string, GateTrackedOperation>>>({});
  protected readonly gateChecks =
    signal<Readonly<Record<string, GateCheckResult>>>({});
  protected readonly failures =
    signal<readonly OperationFailurePresentation[]>([]);
  protected readonly guardrails =
    signal<readonly GuardrailPresentation[]>([]);
  protected readonly canIdeate = computed(
    () => this.selectedIdeaIds().length > 0
      || this.ideateFreeText().trim() !== '',
  );
  protected readonly String = String;

  ngOnInit(): void {
    const runtime: StudioRuntimeHandle = {
      tracker: this.gateTracker,
      cancel: (id) => this.gateTracker.cancel(id),
      canReroll: () => false,
      reroll: () => {
        throw new Error('topic gate-check operations cannot be re-rolled');
      },
    };
    this.detachGateRuntime = this.session.attachRuntime(runtime);
    const selectedTopic = this.route.snapshot.queryParamMap.get('topic');
    const selectedRef = this.route.snapshot.queryParamMap.get('ref');
    this.selectedTopicSlug.set(selectedTopic?.trim() || null);
    this.selectedTopicRef.set(selectedRef?.trim() || null);
    if (selectedRef?.trim()) {
      void this.loadSelectedTopicBrief(selectedRef.trim());
    }
    void this.loadIdeas();
  }

  ngOnDestroy(): void {
    this.detachGateRuntime?.();
    this.detachGateRuntime = null;
  }

  protected setCaptureText(event: Event): void {
    this.captureText.set(textareaValue(event));
  }

  private async loadSelectedTopicBrief(ref: string): Promise<void> {
    this.selectedTopicLoading.set(true);
    this.selectedTopicError.set(null);
    try {
      this.selectedTopicBrief.set(await this.client.getTopicBrief(ref));
    } catch (error) {
      this.selectedTopicBrief.set(null);
      this.selectedTopicError.set(errorMessage(error));
    } finally {
      this.selectedTopicLoading.set(false);
    }
  }

  protected setIdeateFreeText(event: Event): void {
    this.ideateFreeText.set(textareaValue(event));
  }

  protected captureIdea(event: Event): void {
    event.preventDefault();
    const text = this.captureText().trim();
    if (text === '' || this.captureBusy()) return;
    void this.createInboxIdea(text);
  }

  protected toggleSelected(id: string, event: Event): void {
    const checked = checkboxValue(event);
    this.selectedIdeaIds.update((selected) => checked
      ? selected.includes(id) ? selected : [...selected, id]
      : selected.filter((candidate) => candidate !== id));
  }

  protected isSelected(id: string): boolean {
    return this.selectedIdeaIds().includes(id);
  }

  protected changeStatus(idea: IdeaRecord, event: Event): void {
    const status = ideaStatusValue(event);
    if (status === null || status === idea.status) return;
    void this.persistStatus(idea.id, status);
  }

  protected sourceLabel(idea: IdeaRecord): string {
    return idea.source === 'inbox' ? 'Inbox' : 'Ideated';
  }

  protected ideate(): void {
    if (!this.canIdeate() || this.ideateBusy()) return;
    void this.runIdeate();
  }

  protected gateCheck(ideaId: string): void {
    if (this.gatePending(ideaId)) return;
    const idea = this.ideas().find((candidate) => candidate.id === ideaId);
    if (!idea) {
      this.addThrownFailure(
        'quick-gate-check',
        new Error(`idea not found: ${ideaId}`),
      );
      return;
    }
    const tracked = this.gateTracker.launch(
      'quick-gate-check',
      buildTopicOperationInputs({
        ideaText: idea.text,
        userConstraints: {},
        runArtifacts: null,
        selectedWinner: null,
      }, 'quick-gate-check'),
      { ideaId, remainingHops: 0 },
    );
    this.gateOperations.update((operations) => ({
      ...operations,
      [ideaId]: tracked,
    }));
    this.activeGateLifecycles.update((active) =>
      new Set([...active, ideaId]));
    void tracked.completion
      .then(() => this.settleGateCheck(ideaId, tracked))
      .finally(() => {
        this.activeGateLifecycles.update((active) => {
          const next = new Set(active);
          next.delete(ideaId);
          return next;
        });
      });
  }

  protected gatePending(ideaId: string): boolean {
    return this.activeGateLifecycles().has(ideaId);
  }

  protected gatePhase(ideaId: string): string {
    const phase = this.gateOperations()[ideaId]?.phase() ?? 'submitting';
    return this.activeGateLifecycles().has(ideaId)
        && phase !== 'submitting'
        && phase !== 'streaming'
      ? 'saving'
      : phase;
  }

  protected gateLabel(gate: TopicGateName): string {
    return gate.split('_').map(capitalize).join(' ');
  }

  private async loadIdeas(): Promise<void> {
    try {
      const ideas = await this.client.listIdeas();
      this.ideas.set(ideas);
      this.gateChecks.set(Object.fromEntries(
        ideas.flatMap((idea) =>
          idea.latestCheck === null
            ? []
            : [[idea.id, idea.latestCheck] as const]),
      ));
      this.loadError.set(null);
    } catch (error) {
      this.loadError.set(errorMessage(error));
    }
  }

  private async createInboxIdea(text: string): Promise<void> {
    this.captureBusy.set(true);
    try {
      const idea = await this.client.createIdea({
        text,
        source: 'inbox',
      });
      this.ideas.update((ideas) => [idea, ...ideas]);
      this.captureText.set('');
      this.loadError.set(null);
    } catch (error) {
      this.loadError.set(errorMessage(error));
    } finally {
      this.captureBusy.set(false);
    }
  }

  private async persistStatus(
    id: string,
    status: IdeaStatus,
  ): Promise<void> {
    try {
      const updated = await this.client.updateIdea(id, { status });
      this.ideas.update((ideas) => ideas.map((idea) =>
        idea.id === id ? updated : idea));
    } catch (error) {
      this.loadError.set(errorMessage(error));
    }
  }

  private async runIdeate(): Promise<void> {
    this.ideateBusy.set(true);
    try {
      const ideaText = this.ideateSeedText();
      const outcome = await this.executeOperation(
        'ideate',
        buildTopicOperationInputs({
          ideaText,
          userConstraints: {},
          runArtifacts: null,
          selectedWinner: null,
        }, 'ideate'),
      );
      const guardrail = resultGuardrail(outcome.result);
      if (guardrail !== null) {
        this.addGuardrail('ideate', guardrail);
        return;
      }
      if (!isSuccessfulSchemaOutcome(outcome)) {
        this.addFailure(outcome, resultFailure(outcome.result));
        return;
      }
      const cards = parseIdeateCards(outcome.result.value);
      if (cards === null) {
        this.addFailure(
          outcome,
          'Ideate result did not contain valid subject and angle cards.',
        );
        return;
      }

      const created: IdeaRecord[] = [];
      const persistedCards: IdeateCard[] = [];
      for (const card of cards) {
        const idea = await this.client.createIdea({
          text: `${card.subject}\n\n${card.angleMarkdown}`,
          source: 'ideate',
        });
        created.push(idea);
        persistedCards.push({ ...card, ideaId: idea.id });
      }
      this.ideateCards.update(
        (current) => [...current, ...persistedCards],
      );
      this.ideas.update((ideas) => [...created].reverse().concat(ideas));
      this.ideateFreeText.set('');
    } catch (error) {
      this.addThrownFailure('ideate', error);
    } finally {
      this.ideateBusy.set(false);
    }
  }

  private async settleGateCheck(
    ideaId: string,
    tracked: GateTrackedOperation,
  ): Promise<void> {
    const result = tracked.result();
    if (tracked.phase() === 'guardrail' && result !== null) {
      this.addGuardrail(
        tracked.operation,
        resultGuardrail(result)
          ?? 'The topic skill narrowed or declined this request without guidance.',
      );
      return;
    }
    if (tracked.phase() !== 'done' || result?.kind !== 'schema') {
      this.addTrackedFailure(tracked);
      return;
    }

    const check = parseGateResult(result.value);
    if (check === null) {
      this.addTrackedFailure(
        tracked,
        'Gate-check result did not contain each of the six required gates.',
      );
      return;
    }
    this.gateChecks.update((checks) => ({
      ...checks,
      [ideaId]: check,
    }));

    try {
      const opId = tracked.id();
      if (opId === null) {
        throw new Error('Gate-check completed without an operation id.');
      }
      const updated = await this.client.updateIdea(ideaId, {
        latestCheck: check,
        latestCheckOpId: opId,
      });
      this.ideas.update((ideas) => ideas.map((idea) =>
        idea.id === ideaId ? updated : idea));
    } catch (error) {
      this.addThrownFailure(
        'quick-gate-check',
        new Error(
          `Gate-check completed but its latest result could not be saved: ${
            errorMessage(error)
          }`,
        ),
      );
    }
  }

  private addTrackedFailure(
    tracked: GateTrackedOperation,
    reason: string | null = null,
  ): void {
    const result = tracked.result();
    const presentation = operationFailurePresentation({
      operation: tracked.operation,
      phase: tracked.phase() === 'done' ? 'failed' : tracked.phase(),
      state: tracked.state(),
      reason: reason
        ?? (result?.kind === 'failed' ? result.error : null),
      errorMessage: tracked.errorMessage(),
    });
    if (presentation) {
      this.failures.update((failures) => [...failures, presentation]);
    }
  }

  private ideateSeedText(): string {
    const selected = new Set(this.selectedIdeaIds());
    const parts = this.ideas()
      .filter((idea) => selected.has(idea.id))
      .map((idea) => idea.text);
    const freeText = this.ideateFreeText().trim();
    if (freeText !== '') parts.push(freeText);
    return parts.join('\n\n');
  }

  private async executeOperation(
    operation: OperationName,
    inputs: unknown,
  ): Promise<OperationOutcome> {
    const choice = this.modelPreference.get(operation) ?? null;
    const { id } = choice
      ? await this.client.submitOp(operation, inputs, choice)
      : await this.client.submitOp(operation, inputs);
    await this.client.streamEvents(id, {
      onEvent: () => undefined,
      onDone: () => undefined,
      onError: () => undefined,
    });
    const [record, result] = await Promise.all([
      this.client.getOp(id),
      this.client.getResult(id),
    ]);
    return { operation: record, result };
  }

  private addFailure(outcome: OperationOutcome, reason: string): void {
    const presentation = operationFailurePresentation({
      operation: outcome.operation.operation,
      phase: 'failed',
      state: outcome.operation.state,
      reason,
      errorMessage: outcome.operation.error,
    });
    if (presentation) {
      this.failures.update((failures) => [...failures, presentation]);
    }
  }

  private addThrownFailure(
    operation: OperationName,
    error: unknown,
  ): void {
    const presentation = operationFailurePresentation({
      operation,
      phase: 'failed',
      state: 'failed',
      reason: errorMessage(error),
      errorMessage: null,
    });
    if (presentation) {
      this.failures.update((failures) => [...failures, presentation]);
    }
  }

  private addGuardrail(
    operation: OperationName,
    markdown: string,
  ): void {
    this.guardrails.update((guardrails) => [
      ...guardrails,
      {
        id: ++this.calloutSequence,
        operation,
        markdown,
      },
    ]);
  }
}

function parseGateResult(value: unknown): GateCheckResult | null {
  const result = record(value);
  const verdict = topicVerdict(result?.['verdict']);
  if (
    result?.['status'] !== 'complete'
    || verdict === null
    || !Array.isArray(result['gates'])
    || result['gates'].length !== TOPIC_GATE_NAMES.length
  ) {
    return null;
  }

  const gates: GateCheckResult['gates'] = [];
  const found = new Set<TopicGateName>();
  for (const candidate of result['gates']) {
    const gate = record(candidate);
    const name = topicGateName(gate?.['gate']);
    const gateVerdict = topicVerdict(gate?.['verdict']);
    const reasonMarkdown = nonEmptyString(gate?.['reason_markdown']);
    if (
      name === null
      || found.has(name)
      || gateVerdict === null
      || reasonMarkdown === null
    ) {
      return null;
    }
    found.add(name);
    gates.push({
      gate: name,
      verdict: gateVerdict,
      reasonMarkdown,
    });
  }
  if (TOPIC_GATE_NAMES.some((name) => !found.has(name))) return null;
  return { verdict, gates };
}

function resultGuardrail(result: OperationResult): string | null {
  if (result.kind !== 'schema') return null;
  if (nonEmptyString(result.guardrail)) return result.guardrail;
  const value = record(result.value);
  const status = value?.['status'];
  if (status !== 'declined' && status !== 'narrowed') return null;
  return nonEmptyString(value?.['guardrail_markdown'])
    ?? 'The topic skill narrowed or declined this request without guidance.';
}

function isSuccessfulSchemaOutcome(
  outcome: OperationOutcome,
): outcome is OperationOutcome & {
  result: Extract<OperationResult, { kind: 'schema' }>;
} {
  return outcome.operation.state === 'completed'
    && outcome.result.kind === 'schema';
}

function resultFailure(result: OperationResult): string {
  if (result.kind === 'failed') return result.error;
  if (result.kind === 'pending') {
    return 'Operation ended before a result became available.';
  }
  if (result.kind === 'raw') {
    return 'Operation returned Markdown instead of the required structured result.';
  }
  return 'Operation did not complete successfully.';
}

function topicGateName(value: unknown): TopicGateName | null {
  return typeof value === 'string'
      && TOPIC_GATE_NAMES.includes(value as TopicGateName)
    ? value as TopicGateName
    : null;
}

function topicVerdict(value: unknown): TopicVerdict | null {
  return value === 'pass' || value === 'fail' || value === 'unknown'
    ? value
    : null;
}

function ideaStatusValue(event: Event): IdeaStatus | null {
  const value = event.target instanceof HTMLSelectElement
    ? event.target.value
    : '';
  return value === 'open' || value === 'promoted' || value === 'discarded'
    ? value
    : null;
}

function textareaValue(event: Event): string {
  return event.target instanceof HTMLTextAreaElement
    ? event.target.value
    : '';
}

function checkboxValue(event: Event): boolean {
  return event.target instanceof HTMLInputElement
    && event.target.checked;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== ''
    ? value
    : null;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Operation failed.';
}
