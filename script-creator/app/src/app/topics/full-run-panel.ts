import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import type {
  IdeaRecord,
  OperationName,
  OperationState,
  PackageDirection,
  PackageTestRecord,
  TopicGateName,
  TopicHandoffResult,
  TopicHandoffState,
  TopicRunSnapshot,
  TopicRunSummary,
  TopicScoreName,
  TopicSummary,
} from '../api/client';
import { createBlankNarrationDocument } from '../drafts/draft-manager';
import { HelpTargetDirective } from '../help/help-target.directive';
import { ModelPreferenceService } from '../ops/model-preference';
import { STUDIO_SESSION } from '../studio-session';
import { buildTopicOperationInputs } from './inputs';
import { renderTopicMarkdown } from './topic-markdown';

const POLL_INTERVAL_MS = 2_000;
const POLLING_STATES = new Set<OperationState>([
  'queued',
  'running',
  'cancelling',
]);

const SCORE_CRITERIA: ReadonlyArray<{
  key: TopicScoreName;
  label: string;
  maximum: number;
}> = [
  { key: 'demand', label: 'Demand', maximum: 25 },
  { key: 'opening', label: 'Opening', maximum: 15 },
  { key: 'package', label: 'Package', maximum: 20 },
  { key: 'satisfaction', label: 'Satisfaction', maximum: 15 },
  { key: 'whp', label: 'WHP', maximum: 10 },
  { key: 'evidence', label: 'Evidence', maximum: 10 },
  { key: 'feasibility', label: 'Feasibility', maximum: 5 },
];

type SortKey = 'total' | TopicScoreName;
type ShortlistEntry = TopicSummary['shortlist'][number];

interface HandoffBrief {
  topic: string;
  anchors: string[];
  unknowns: string[];
}

interface HandoffPreview {
  markdown: string;
  brief: HandoffBrief;
  idea: IdeaRecord;
  slug: string;
  title: string;
  selectedPackage: {
    testId: string;
    directionIndex: number;
    direction: PackageDirection;
  } | null;
}

interface OperationOutcome {
  operation: {
    state: OperationState;
    error: string | null;
  };
  result:
    | { kind: 'schema'; value: unknown; guardrail: string | null }
    | { kind: 'raw'; markdown: string }
    | { kind: 'failed'; error: string }
    | { kind: 'pending' };
}

@Component({
  selector: 'app-full-run-panel',
  standalone: true,
  imports: [HelpTargetDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="full-run-stage" aria-labelledby="full-run-heading">
      <header class="run-heading">
        <div class="run-title">
          <span class="stage-marker" aria-hidden="true">03</span>
          <div>
            <p class="stage-kicker">Decide</p>
            <h2 id="full-run-heading">Full topic run</h2>
          </div>
        </div>
        @if (snapshot(); as current) {
          <span class="run-state" [attr.data-state]="current.state">
            {{ stateLabel(current.state) }}
          </span>
        } @else {
          <span class="run-state" data-state="ready">Ready</span>
        }
      </header>

      <section class="run-history" aria-labelledby="recent-runs-heading">
        <header>
          <div>
            <p class="console-kicker">Durable history</p>
            <h3 id="recent-runs-heading">Recent runs</h3>
          </div>
          <button
            type="button"
            [disabled]="runListLoading()"
            (click)="reloadRuns()"
          >
            {{ runListLoading() ? 'Refreshing…' : 'Refresh runs' }}
          </button>
        </header>

        @if (runListError(); as listError) {
          <p class="run-list-error" data-testid="topic-run-list-error" role="alert">
            {{ listError }}
          </p>
        }

        @if (runs().length > 0) {
          <ol class="run-list" data-testid="topic-run-list">
            @for (run of runs(); track run.id) {
              <li
                data-testid="topic-run-row"
                [attr.data-selected]="selectedRunId() === run.id"
              >
                <div>
                  <strong>{{ stateLabel(run.state) }}</strong>
                  <time [attr.datetime]="run.createdAt">
                    {{ runCreatedLabel(run.createdAt) }}
                  </time>
                </div>
                <button
                  type="button"
                  [disabled]="selectingRunId() !== null
                    || (selectedRunId() === run.id && snapshot() !== null)"
                  (click)="selectRun(run)"
                >
                  {{
                    selectedRunId() === run.id && snapshot() !== null
                      ? 'Selected run'
                      : selectingRunId() === run.id
                        ? 'Loading run…'
                        : 'Select run'
                  }}
                </button>
              </li>
            }
          </ol>
        } @else if (!runListLoading() && !runListError()) {
          <p class="run-list-empty">No durable topic runs yet.</p>
        }
      </section>

      <form class="run-launcher" appHelpTarget="fullrun.launcher" (submit)="launch($event)">
        <div class="run-field">
          <label for="full-run-idea">Starting territory</label>
          <textarea
            id="full-run-idea"
            data-testid="full-run-idea"
            rows="3"
            placeholder="The question, behavior, or subject this run should investigate…"
            [value]="ideaText()"
            (input)="setIdeaText($event)"
          ></textarea>
        </div>
        <div class="run-field">
          <label for="full-run-constraints">
            Constraints
            <span>optional</span>
          </label>
          <textarea
            id="full-run-constraints"
            data-testid="full-run-constraints"
            rows="3"
            placeholder="Audience, production, timing, or portfolio constraints…"
            [value]="constraints()"
            (input)="setConstraints($event)"
          ></textarea>
        </div>
        <div class="run-launch-actions">
          <p>
            The topic-selection skill owns the research, gates, scoring, and
            recommendation. This surface only transports inputs and renders its work.
          </p>
          <button
            class="primary-action"
            type="submit"
            [disabled]="runBusy() || ideaText().trim() === ''"
          >
            {{ runBusy() ? 'Run in progress…' : 'Launch full run' }}
          </button>
        </div>
      </form>

      @if (runError()) {
        <article class="run-error" data-testid="run-error" role="alert">
          <strong>
            {{ pollRecovering() ? 'Live progress interrupted' : 'Full run could not continue' }}
          </strong>
          <p>{{ runError() }}</p>
        </article>
      }

      @if (snapshot(); as current) {
        <section class="run-console" aria-labelledby="checklist-heading">
          <header>
            <div>
              <p class="console-kicker">Live protocol</p>
              <h3 id="checklist-heading">
                {{ current.progress.length }}-step checklist
              </h3>
            </div>
            <span class="progress-count">
              {{ completedCount() }} / {{ current.progress.length }}
            </span>
          </header>
          <ol class="checklist" data-testid="run-checklist" aria-live="polite">
            @for (item of current.progress; track item.id) {
              <li
                data-testid="checklist-row"
                [attr.data-progress-id]="item.id"
                [attr.data-status]="item.status"
              >
                <span class="progress-mark" aria-hidden="true">
                  @switch (item.status) {
                    @case ('done') { ✓ }
                    @case ('active') { • }
                    @case ('unknown') { ? }
                    @default { }
                  }
                </span>
                <span class="progress-copy">
                  <strong>{{ item.id }}</strong>
                  <span>{{ item.text }}</span>
                </span>
                <span class="progress-status">{{ item.status }}</span>
              </li>
            }
          </ol>
        </section>

        @if (current.reportMd; as report) {
          <section class="report-shell" aria-labelledby="report-heading">
            <header class="section-label">
              <p>Skill output</p>
              <h3 id="report-heading">Research report</h3>
            </header>
            <article
              class="markdown-report"
              data-testid="topic-report"
              [innerHTML]="reportHtml()"
            ></article>
            <details class="raw-report" data-testid="raw-topic-report">
              <summary>Raw Markdown</summary>
              <pre>{{ report }}</pre>
            </details>
          </section>
        }

        @if (current.summaryError; as summaryError) {
          <article class="summary-error" data-testid="summary-error" role="alert">
            <strong>The structured candidate board is unavailable.</strong>
            <p>{{ summaryError }}</p>
            @if (current.reportMd) {
              <p>The raw report remains available above exactly as returned.</p>
            } @else {
              <p>No raw report was returned with this terminal response.</p>
            }
          </article>
        }

        @if (current.summary; as summary) {
          <section
            class="candidate-board"
            appHelpTarget="fullrun.shortlist"
            data-testid="candidate-board"
            aria-labelledby="candidate-board-heading"
          >
            <header class="board-heading">
              <div>
                <p class="console-kicker">Evidence board</p>
                <h3 id="candidate-board-heading">Shortlist</h3>
              </div>
              <p>Sort by the skill’s total or any scored criterion.</p>
            </header>

            <div class="score-table-scroll">
              <table class="score-table">
                <thead>
                  <tr>
                    <th scope="col">Candidate</th>
                    <th scope="col">
                      <button
                        type="button"
                        [attr.aria-pressed]="sortKey() === 'total'"
                        (click)="setSort('total')"
                      >
                        Total {{ sortIndicator('total') }}
                      </button>
                    </th>
                    @for (criterion of criteria; track criterion.key) {
                      <th scope="col">
                        <button
                          type="button"
                          [attr.aria-pressed]="sortKey() === criterion.key"
                          (click)="setSort(criterion.key)"
                        >
                          {{ criterion.label }}
                          {{ sortIndicator(criterion.key) }}
                        </button>
                        <small>/{{ criterion.maximum }}</small>
                      </th>
                    }
                    <th scope="col">Confidence & risk</th>
                  </tr>
                </thead>
                <tbody>
                  @for (entry of sortedShortlist(); track entry.subject) {
                    <tr data-testid="shortlist-row">
                      <th scope="row">
                        <span class="rank">#{{ entry.rank }}</span>
                        <strong data-testid="shortlist-subject">
                          {{ entry.subject }}
                        </strong>
                        <p>{{ entry.angle_markdown }}</p>
                        @if (candidateFor(summary, entry.subject); as candidate) {
                          <div
                            class="candidate-gates"
                            [attr.aria-label]="'Gate results for ' + entry.subject"
                          >
                            @for (gate of candidate.gates; track gate.gate) {
                              <details
                                class="candidate-gate"
                                data-testid="candidate-gate-chip"
                                [attr.data-verdict]="gate.verdict"
                              >
                                <summary>
                                  <span>{{ gateLabel(gate.gate) }}</span>
                                  <strong>{{ gate.verdict }}</strong>
                                </summary>
                                <p>{{ gate.reason_markdown }}</p>
                              </details>
                            }
                          </div>
                        }
                        <button
                          class="test-package-action"
                          type="button"
                          [disabled]="packageBusy() !== null"
                          (click)="testPackages(entry)"
                        >
                          {{
                            packageBusy() === entry.subject
                              ? 'Testing packages…'
                              : 'Test packages'
                          }}
                        </button>
                      </th>
                      <td class="total-score">
                        {{ scoreValue(entry.total) }}
                      </td>
                      @for (criterion of criteria; track criterion.key) {
                        <td>
                          <span class="score-value">
                            {{ scoreValue(entry.scores[criterion.key].score) }}
                          </span>
                          <span
                            class="evidence-grade"
                            [attr.data-grade]="entry.scores[criterion.key].grade"
                          >
                            {{ entry.scores[criterion.key].grade }}
                          </span>
                        </td>
                      }
                      <td class="risk-cell">
                        <strong>{{ entry.confidence }}</strong>
                        <p>{{ entry.decisive_risk_markdown }}</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <section
              class="packages"
              aria-labelledby="packages-heading"
              appHelpTarget="fullrun.packages"
            >
              <header class="section-label">
                <p>Promise test</p>
                <h3 id="packages-heading">Packaging directions</h3>
              </header>
              <div class="package-table-scroll">
                <table class="package-table">
                  <thead>
                    <tr>
                      <th scope="col">Direction</th>
                      <th scope="col">Working title</th>
                      <th scope="col">Intended viewer</th>
                      <th scope="col">Familiar → surprise</th>
                      <th scope="col">Visual promise → payoff</th>
                      <th scope="col">Survives honestly</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (packaging of summary.packages; track $index) {
                      <tr
                        data-testid="package-direction"
                        [attr.data-survives]="packaging.survives_honestly"
                      >
                        <th scope="row">
                          <small>{{ packaging.finalist }}</small>
                          <strong>{{ packaging.direction }}</strong>
                        </th>
                        <td>{{ packaging.working_title }}</td>
                        <td>{{ packaging.intended_viewer }}</td>
                        <td>
                          <span>{{ packaging.familiar_markdown }}</span>
                          <span class="table-arrow" aria-hidden="true">→</span>
                          <span>{{ packaging.surprise_markdown }}</span>
                        </td>
                        <td>
                          <span>{{ packaging.visual_promise_markdown }}</span>
                          <span class="table-arrow" aria-hidden="true">→</span>
                          <span>{{ packaging.delivered_payoff_markdown }}</span>
                        </td>
                        <td>
                          <strong class="survival-badge">
                            {{ packaging.survives_honestly ? 'Yes' : 'No' }}
                          </strong>
                          <p>{{ packaging.reason_markdown }}</p>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>

            @if (packageError()) {
              <article
                class="package-test-error"
                data-testid="package-test-error"
                role="alert"
              >
                <strong>Package test could not be saved.</strong>
                <p>{{ packageError() }}</p>
              </article>
            }

            @if (packageFinalist(); as finalist) {
              <section
                class="package-tester"
                data-testid="package-tester"
                aria-labelledby="package-tester-heading"
              >
                <header class="section-label package-tester-heading">
                  <div>
                    <p>Focused promise test</p>
                    <h3 id="package-tester-heading">{{ finalist.subject }}</h3>
                  </div>
                  <span data-testid="package-history">
                    {{ packageHistory().length }}
                    {{ packageHistory().length === 1 ? 'saved test' : 'saved tests' }}
                  </span>
                </header>

                @if (packageHistory().length > 0) {
                  <div class="package-table-scroll">
                    <table
                      class="package-test-table"
                      data-testid="package-test-table"
                    >
                      <thead>
                        <tr>
                          <th scope="col">Finalist</th>
                          <th scope="col">Direction</th>
                          <th scope="col">Working title</th>
                          <th scope="col">Intended viewer</th>
                          <th scope="col">Familiar element</th>
                          <th scope="col">Surprise / tension</th>
                          <th scope="col">Visual promise</th>
                          <th scope="col">Delivered payoff</th>
                          <th scope="col">Survives honestly?</th>
                          <th scope="col">Selection</th>
                        </tr>
                      </thead>
                      @for (test of packageHistory(); track test.id) {
                        <tbody>
                          <tr class="history-divider">
                            <th colspan="10" scope="rowgroup">
                              {{ packageTestLabel(test, $index) }}
                            </th>
                          </tr>
                          @for (direction of test.directions; track $index) {
                            <tr
                              data-testid="package-test-direction"
                              [attr.data-survives]="direction.survives_honestly"
                              [attr.data-selected]="test.selectedDirectionIndex === $index"
                            >
                              <td>{{ finalist.subject }}</td>
                              <th scope="row">Direction {{ $index + 1 }}</th>
                              <td>{{ direction.working_title }}</td>
                              <td>{{ direction.intended_viewer }}</td>
                              <td>{{ direction.familiar_markdown }}</td>
                              <td>{{ direction.surprise_markdown }}</td>
                              <td>{{ direction.visual_promise_markdown }}</td>
                              <td>{{ direction.delivered_payoff_markdown }}</td>
                              <td>
                                <strong class="survival-badge">
                                  {{ direction.survives_honestly ? 'Yes' : 'No' }}
                                </strong>
                                <p>{{ direction.reason_markdown }}</p>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  [disabled]="packageSelectionBusy() !== null
                                    || (test.selectedDirectionIndex !== null
                                      && test.selectedDirectionIndex !== undefined)"
                                  (click)="usePackage(test, $index)"
                                >
                                  {{
                                    test.selectedDirectionIndex === $index
                                      ? 'Selected package'
                                      : 'Use this package'
                                  }}
                                </button>
                              </td>
                            </tr>
                          }
                        </tbody>
                      }
                    </table>
                  </div>
                } @else if (packageBusy()) {
                  <p class="package-empty">Testing three distinct promises…</p>
                } @else {
                  <p class="package-empty">
                    No saved package test exists for this finalist yet.
                  </p>
                }
              </section>
            }

            <article
              class="winner-card"
              data-testid="winner-card"
              appHelpTarget="fullrun.handoff"
              [attr.data-status]="summary.winner.decision_status"
            >
              <div class="winner-seal" aria-hidden="true">W</div>
              <div class="winner-copy">
                <p>{{ decisionLabel(summary.winner.decision_status) }}</p>
                <h3>{{ summary.winner.subject ?? 'No responsible winner yet' }}</h3>
                @if (summary.winner.angle_markdown) {
                  <p class="winner-angle">{{ summary.winner.angle_markdown }}</p>
                }
              </div>
              <dl>
                <div>
                  <dt>Confidence</dt>
                  <dd>{{ summary.winner.confidence }}</dd>
                </div>
                <div>
                  <dt>Why now</dt>
                  <dd>{{ summary.winner.why_now_markdown }}</dd>
                </div>
                <div>
                  <dt>Strongest package</dt>
                  <dd>
                    {{ summary.winner.strongest_package_markdown ?? 'Not established' }}
                  </dd>
                </div>
              </dl>
              @if (summary.winner.subject && summary.winner.angle_markdown) {
                <button
                  class="handoff-action"
                  type="button"
                  [disabled]="handoffBusy()"
                  (click)="previewHandoff(summary)"
                >
                  {{ handoffBusy() ? 'Preparing handoff…' : 'Preview handoff' }}
                </button>
              }
            </article>

            @if (handoffError()) {
              <article
                class="handoff-error"
                data-testid="handoff-conflict"
                role="alert"
              >
                <strong>Handoff paused safely.</strong>
                <p>{{ handoffError() }}</p>
              </article>
            }

            @if (!handoffPreview()) {
              @if (visibleHandoff(); as handoff) {
                <section
                  class="handoff-preview"
                  data-testid="handoff-in-progress"
                  aria-labelledby="handoff-progress-heading"
                >
                  <header class="section-label">
                    <p>Durable handoff</p>
                    <h3 id="handoff-progress-heading">
                      {{
                        handoff.complete
                          ? 'Handoff complete'
                          : 'Handoff in progress'
                      }}
                    </h3>
                  </header>
                  <p>
                    {{ handoff.title }} · {{ handoff.episodeSlug }}
                  </p>
                  <ol class="handoff-steps" data-testid="handoff-steps">
                    <li>
                      <span>Draft created</span>
                      <strong>{{ handoff.steps.draftCreated }}</strong>
                    </li>
                    <li>
                      <span>Artifact written</span>
                      <strong>{{ handoff.steps.artifactWritten }}</strong>
                    </li>
                    <li>
                      <span>Pipeline upserted</span>
                      <strong>{{ handoff.steps.pipelineUpserted }}</strong>
                    </li>
                    <li>
                      <span>Idea promoted</span>
                      <strong>{{ handoff.steps.ideaPromoted }}</strong>
                    </li>
                  </ol>
                  @if (!handoff.complete) {
                    <div class="handoff-actions">
                      <p>
                        Resume uses the durable stored brief and draft payload.
                      </p>
                      <button
                        class="primary-action"
                        type="button"
                        [disabled]="handoffBusy()"
                        (click)="resumeHandoff(handoff)"
                      >
                        {{ handoffBusy() ? 'Resuming…' : 'Resume handoff' }}
                      </button>
                    </div>
                  }
                </section>
              }
            }

            @if (handoffPreview(); as preview) {
              <section
                class="handoff-preview"
                data-testid="handoff-preview"
                aria-labelledby="handoff-preview-heading"
              >
                <header class="section-label">
                  <p>Acceptance gate</p>
                  <h3 id="handoff-preview-heading">Selected-topic brief</h3>
                </header>
                <pre>{{ preview.markdown }}</pre>
                <dl>
                  <div>
                    <dt>Topic metadata</dt>
                    <dd>{{ preview.brief.topic }}</dd>
                  </div>
                  <div>
                    <dt>Factual anchors</dt>
                    <dd>{{ preview.brief.anchors.length }}</dd>
                  </div>
                  <div>
                    <dt>Open unknowns</dt>
                    <dd>{{ preview.brief.unknowns.length }}</dd>
                  </div>
                  <div>
                    <dt>Selected package</dt>
                    <dd>
                      {{
                        preview.selectedPackage?.direction?.working_title
                          ?? 'No package selected'
                      }}
                    </dd>
                  </div>
                  <div>
                    <dt>Starting phase</dt>
                    <dd>architecture</dd>
                  </div>
                </dl>
                <div class="handoff-actions">
                  <p>
                    Confirmation creates the draft, writes the brief through CAS,
                    records the selected pipeline milestone, and promotes the idea.
                  </p>
                  <button
                    class="primary-action"
                    type="button"
                    [disabled]="handoffBusy()"
                    (click)="confirmHandoff(preview)"
                  >
                    {{ handoffBusy() ? 'Confirming…' : 'Confirm handoff' }}
                  </button>
                </div>
                @if (handoffResult(); as result) {
                  <ol class="handoff-steps" data-testid="handoff-steps">
                    <li>
                      <span>Draft created</span>
                      <strong>{{ result.steps.draftCreated }}</strong>
                    </li>
                    <li>
                      <span>Artifact written</span>
                      <strong>{{ result.steps.artifactWritten }}</strong>
                    </li>
                    <li>
                      <span>Pipeline upserted</span>
                      <strong>{{ result.steps.pipelineUpserted }}</strong>
                    </li>
                    <li>
                      <span>Idea promoted</span>
                      <strong>{{ result.steps.ideaPromoted }}</strong>
                    </li>
                  </ol>
                }
              </section>
            }
          </section>
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .full-run-stage {
      border: 1px solid var(--whp-line);
      background: var(--whp-surface);
    }

    .run-heading,
    .run-title,
    .run-launch-actions,
    .run-console > header,
    .board-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .run-heading {
      border-bottom: 1px solid var(--whp-line);
      background: var(--whp-panel);
      padding: 0.85rem 1rem;
    }

    .run-title {
      justify-content: flex-start;
      gap: 0.8rem;
    }

    .stage-marker,
    .progress-count,
    .rank,
    .score-value,
    .evidence-grade,
    .run-state,
    .progress-copy strong,
    .progress-status {
      font-family: var(--whp-font-mono);
    }

    .stage-marker,
    .stage-kicker,
    .console-kicker,
    .section-label > p {
      color: var(--whp-accent);
      font-size: 0.65rem;
      font-weight: 850;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .stage-kicker,
    .console-kicker,
    .section-label > p {
      margin: 0;
    }

    .run-heading h2,
    .run-console h3,
    .board-heading h3,
    .section-label h3 {
      margin: 0.12rem 0 0;
      font-family: var(--whp-font-editor);
      font-weight: 550;
    }

    .run-heading h2 {
      font-size: 1.35rem;
    }

    .run-state {
      border: 1px solid var(--whp-line-strong);
      border-radius: 999px;
      padding: 0.3rem 0.6rem;
      color: var(--whp-muted);
      background: var(--whp-surface);
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .run-state[data-state='running'],
    .run-state[data-state='queued'],
    .run-state[data-state='cancelling'] {
      border-color: var(--whp-warning);
      color: var(--whp-warning);
    }

    .run-state[data-state='completed'] {
      border-color: var(--whp-success);
      color: var(--whp-success);
    }

    .run-state[data-state='failed'],
    .run-state[data-state='invalid-output'],
    .run-state[data-state='timed-out'] {
      border-color: var(--whp-accent);
      color: var(--whp-accent);
    }

    .run-launcher {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      border-bottom: 1px solid var(--whp-line);
      padding: 1rem;
    }

    .run-field {
      display: grid;
      gap: 0.45rem;
    }

    .run-field label {
      display: flex;
      justify-content: space-between;
      color: var(--whp-ink);
      font-size: 0.72rem;
      font-weight: 780;
    }

    .run-field label span {
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

    .run-launch-actions {
      grid-column: 1 / -1;
      align-items: end;
    }

    .run-launch-actions p,
    .board-heading > p {
      max-width: 68ch;
      margin: 0;
      color: var(--whp-muted);
      font-size: 0.72rem;
      line-height: 1.5;
    }

    button {
      border-radius: 0.12rem;
      cursor: pointer;
      font-size: 0.7rem;
      font-weight: 800;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.48;
    }

    .primary-action {
      flex: none;
      border: 1px solid var(--whp-accent);
      padding: 0.65rem 0.85rem;
      color: var(--whp-ground);
      background: var(--whp-accent);
    }

    .run-error,
    .summary-error {
      border-left: 3px solid var(--whp-accent);
      padding: 0.9rem 1rem;
      color: var(--whp-ink);
      background: var(--whp-accent-tint);
    }

    .run-error p,
    .summary-error p {
      margin: 0.3rem 0 0;
      color: var(--whp-muted);
      font-size: 0.75rem;
      line-height: 1.5;
    }

    .run-console {
      display: grid;
      grid-template-columns: minmax(15rem, 0.28fr) minmax(0, 0.72fr);
      border-bottom: 1px solid var(--whp-line);
    }

    .run-console > header {
      align-items: flex-start;
      border-right: 1px solid var(--whp-line);
      padding: 1rem;
    }

    .progress-count {
      color: var(--whp-accent);
      font-size: 0.72rem;
      font-weight: 850;
    }

    .checklist {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .checklist li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: start;
      gap: 0.6rem;
      border-right: 1px solid var(--whp-line-soft);
      border-bottom: 1px solid var(--whp-line-soft);
      padding: 0.75rem;
      color: var(--whp-muted);
      background: var(--whp-ground);
    }

    .checklist li:nth-child(3n) {
      border-right: 0;
    }

    .checklist li:nth-last-child(-n + 3) {
      border-bottom: 0;
    }

    .checklist li[data-status='active'] {
      box-shadow: inset 3px 0 var(--whp-warning);
      color: var(--whp-ink);
      background: var(--whp-panel);
    }

    .checklist li[data-status='done'] {
      color: var(--whp-ink);
    }

    .progress-mark {
      display: grid;
      width: 1.25rem;
      height: 1.25rem;
      border: 1px solid var(--whp-line-strong);
      border-radius: 50%;
      color: var(--whp-muted);
      font-size: 0.7rem;
      font-weight: 900;
      place-items: center;
    }

    [data-status='done'] .progress-mark {
      border-color: var(--whp-success);
      color: var(--whp-success);
    }

    [data-status='active'] .progress-mark {
      border-color: var(--whp-warning);
      color: var(--whp-warning);
    }

    .progress-copy {
      display: grid;
      gap: 0.22rem;
    }

    .progress-copy strong {
      color: inherit;
      font-size: 0.58rem;
    }

    .progress-copy > span {
      font-size: 0.68rem;
      line-height: 1.4;
    }

    .progress-status {
      font-size: 0.52rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .report-shell,
    .candidate-board {
      border-bottom: 1px solid var(--whp-line);
      padding: clamp(1rem, 2.5vw, 2rem);
    }

    .section-label {
      margin-bottom: 1rem;
    }

    .board-heading {
      align-items: end;
      margin-bottom: 1rem;
    }

    .score-table-scroll,
    .package-table-scroll {
      overflow-x: auto;
      border: 1px solid var(--whp-line);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      color: var(--whp-ink);
    }

    th,
    td {
      border-right: 1px solid var(--whp-line-soft);
      border-bottom: 1px solid var(--whp-line-soft);
      padding: 0.7rem;
      text-align: left;
      vertical-align: top;
    }

    th:last-child,
    td:last-child {
      border-right: 0;
    }

    tbody tr:last-child > * {
      border-bottom: 0;
    }

    thead th {
      color: var(--whp-muted);
      background: var(--whp-panel);
      font-size: 0.6rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    thead button {
      border: 0;
      padding: 0;
      color: inherit;
      background: transparent;
      text-transform: uppercase;
    }

    thead button[aria-pressed='true'] {
      color: var(--whp-accent);
    }

    thead small {
      display: block;
      margin-top: 0.15rem;
      font-size: 0.52rem;
    }

    .score-table {
      min-width: 78rem;
    }

    .score-table tbody th {
      width: 22rem;
      background: var(--whp-surface);
    }

    .score-table tbody th > strong {
      display: block;
      margin-top: 0.2rem;
      font-family: var(--whp-font-editor);
      font-size: 1rem;
      font-weight: 560;
    }

    .score-table tbody th > p,
    .risk-cell p,
    .package-table p {
      margin: 0.35rem 0 0;
      color: var(--whp-muted);
      font-size: 0.66rem;
      line-height: 1.45;
    }

    .rank {
      color: var(--whp-accent);
      font-size: 0.6rem;
    }

    .total-score,
    .score-value {
      font-size: 0.82rem;
      font-weight: 850;
    }

    .total-score {
      color: var(--whp-accent);
    }

    .evidence-grade {
      display: inline-grid;
      width: 1.2rem;
      height: 1.2rem;
      margin-left: 0.25rem;
      border: 1px solid var(--whp-line-strong);
      border-radius: 50%;
      color: var(--whp-muted);
      font-size: 0.55rem;
      place-items: center;
    }

    .candidate-gates {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.65rem;
    }

    .candidate-gate {
      border: 1px solid currentcolor;
      border-radius: 999px;
      font-size: 0.52rem;
      font-weight: 750;
    }

    .candidate-gate summary {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.38rem;
      cursor: pointer;
      list-style: none;
    }

    .candidate-gate summary::-webkit-details-marker {
      display: none;
    }

    .candidate-gate strong {
      text-transform: uppercase;
    }

    .candidate-gate p {
      max-width: 17rem;
      margin: 0;
      border-top: 1px solid currentcolor;
      padding: 0.4rem;
      color: var(--whp-ink);
      font-weight: 500;
      line-height: 1.4;
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

    .risk-cell {
      width: 15rem;
    }

    .risk-cell > strong {
      font-size: 0.62rem;
      text-transform: uppercase;
    }

    .packages {
      margin-top: 2rem;
    }

    .package-table {
      min-width: 76rem;
      font-size: 0.7rem;
      line-height: 1.45;
    }

    .package-table tbody tr[data-survives='true'] {
      box-shadow: inset 3px 0 var(--whp-success);
    }

    .package-table tbody tr[data-survives='false'] {
      box-shadow: inset 3px 0 var(--whp-accent);
      background: var(--whp-accent-tint);
    }

    .package-table tbody th {
      width: 11rem;
    }

    .package-table tbody th small,
    .package-table tbody th strong,
    .package-table td > span {
      display: block;
    }

    .package-table tbody th small {
      margin-bottom: 0.25rem;
      color: var(--whp-muted);
    }

    .table-arrow {
      margin-block: 0.22rem;
      color: var(--whp-accent);
    }

    .survival-badge {
      color: var(--whp-success);
      font-size: 0.64rem;
      text-transform: uppercase;
    }

    [data-survives='false'] .survival-badge {
      color: var(--whp-accent);
    }

  `,
})
export class FullRunPanel implements OnInit, OnDestroy {
  private readonly client = inject(STUDIO_SESSION).client;
  private readonly modelPreference = inject(ModelPreferenceService);
  private readonly router = inject(Router);

  private submitOpWithPreference(
    operation: OperationName,
    inputs: unknown,
  ): Promise<{ id: string }> {
    const choice = this.modelPreference.get(operation) ?? null;
    return choice
      ? this.client.submitOp(operation, inputs, choice)
      : this.client.submitOp(operation, inputs);
  }
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollGeneration = 0;

  protected readonly ideaText = signal('');
  protected readonly constraints = signal('');
  protected readonly runBusy = signal(false);
  protected readonly runError = signal<string | null>(null);
  protected readonly pollRecovering = signal(false);
  protected readonly snapshot = signal<TopicRunSnapshot | null>(null);
  protected readonly runs = signal<readonly TopicRunSummary[]>([]);
  protected readonly selectedRunId = signal<string | null>(null);
  protected readonly selectingRunId = signal<string | null>(null);
  protected readonly runListLoading = signal(false);
  protected readonly runListError = signal<string | null>(null);
  protected readonly sortKey = signal<SortKey>('total');
  protected readonly packageBusy = signal<string | null>(null);
  protected readonly packageError = signal<string | null>(null);
  protected readonly packageFinalist = signal<ShortlistEntry | null>(null);
  protected readonly packageHistory =
    signal<readonly PackageTestRecord[]>([]);
  protected readonly packageSelectionBusy = signal<string | null>(null);
  protected readonly handoffBusy = signal(false);
  protected readonly handoffError = signal<string | null>(null);
  protected readonly handoffPreview = signal<HandoffPreview | null>(null);
  protected readonly handoffResult = signal<TopicHandoffResult | null>(null);
  protected readonly visibleHandoff = computed<
    TopicHandoffState | null
  >(() => {
    const durable = this.snapshot()?.handoff;
    const result = this.handoffResult();
    if (!durable) return null;
    return result ? { ...durable, ...result } : durable;
  });
  protected readonly criteria = SCORE_CRITERIA;
  protected readonly completedCount = computed(
    () => this.snapshot()?.progress.filter((item) => item.status === 'done').length
      ?? 0,
  );
  protected readonly reportHtml = computed(() => {
    const report = this.snapshot()?.reportMd;
    return report ? renderTopicMarkdown(report) : '';
  });
  protected readonly sortedShortlist = computed(() => {
    const shortlist = this.snapshot()?.summary?.shortlist ?? [];
    const key = this.sortKey();
    return [...shortlist].sort((left, right) => {
      const leftValue = key === 'total'
        ? left.total
        : left.scores[key].score;
      const rightValue = key === 'total'
        ? right.total
        : right.scores[key].score;
      return compareNullableScoreDescending(leftValue, rightValue)
        || left.rank - right.rank;
    });
  });

  ngOnInit(): void {
    void this.refreshRuns();
  }

  ngOnDestroy(): void {
    this.pollGeneration += 1;
    this.clearPollTimer();
  }

  protected setIdeaText(event: Event): void {
    this.ideaText.set(textareaValue(event));
  }

  protected setConstraints(event: Event): void {
    this.constraints.set(textareaValue(event));
  }

  protected launch(event: Event): void {
    event.preventDefault();
    if (this.runBusy() || this.ideaText().trim() === '') return;
    void this.startFullRun();
  }

  protected setSort(key: SortKey): void {
    this.sortKey.set(key);
  }

  protected sortIndicator(key: SortKey): string {
    return this.sortKey() === key ? '↓' : '';
  }

  protected stateLabel(state: OperationState): string {
    return state.replace('-', ' ');
  }

  protected runCreatedLabel(createdAt: string): string {
    const date = new Date(createdAt);
    return Number.isNaN(date.valueOf())
      ? createdAt
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date);
  }

  protected reloadRuns(): void {
    if (this.runListLoading()) return;
    void this.refreshRuns();
  }

  protected selectRun(run: TopicRunSummary): void {
    if (
      this.selectingRunId() !== null
      || (this.selectedRunId() === run.id && this.snapshot() !== null)
    ) return;
    void this.loadRun(run);
  }

  protected scoreValue(value: number | null): string {
    return value === null ? '—' : String(value);
  }

  protected gateLabel(gate: TopicGateName): string {
    return gate.split('_').map(capitalize).join(' ');
  }

  protected candidateFor(
    summary: TopicSummary,
    subject: string,
  ): TopicSummary['candidates'][number] | null {
    return summary.candidates.find((candidate) => candidate.subject === subject)
      ?? null;
  }

  protected decisionLabel(
    status: TopicSummary['winner']['decision_status'],
  ): string {
    if (status === 'winner-selected') return 'Winner selected';
    if (status === 'provisional-winner') return 'Provisional winner';
    return 'Decision incomplete';
  }

  protected testPackages(finalist: ShortlistEntry): void {
    if (this.packageBusy() !== null) return;
    void this.runPackageTest(finalist);
  }

  protected packageTestLabel(
    test: PackageTestRecord,
    index: number,
  ): string {
    const date = new Date(test.createdAt);
    const timestamp = Number.isNaN(date.valueOf())
      ? test.createdAt
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date);
    return `Test ${this.packageHistory().length - index} · ${timestamp}`;
  }

  protected usePackage(
    test: PackageTestRecord,
    directionIndex: number,
  ): void {
    if (this.packageSelectionBusy() !== null) return;
    void this.pickPackage(test, directionIndex);
  }

  protected previewHandoff(summary: TopicSummary): void {
    if (this.handoffBusy()) return;
    void this.runHandoffPreview(summary);
  }

  protected confirmHandoff(preview: HandoffPreview): void {
    if (this.handoffBusy()) return;
    void this.acceptHandoff(preview);
  }

  protected resumeHandoff(handoff: TopicHandoffState): void {
    if (this.handoffBusy()) return;
    void this.resumeDurableHandoff(handoff);
  }

  private async startFullRun(): Promise<void> {
    const generation = ++this.pollGeneration;
    this.clearPollTimer();
    this.runBusy.set(true);
    this.runError.set(null);
    this.pollRecovering.set(false);
    this.snapshot.set(null);
    this.selectedRunId.set(null);
    this.selectingRunId.set(null);
    this.sortKey.set('total');
    this.resetPackageTest();
    this.resetHandoff();

    try {
      const notes = this.constraints().trim();
      const { id: opId } = await this.submitOpWithPreference(
        'full-topic-run',
        buildTopicOperationInputs({
          ideaText: this.ideaText().trim(),
          userConstraints: notes === '' ? {} : { notes },
          runArtifacts: null,
          selectedWinner: null,
        }, 'full-topic-run'),
      );
      if (generation !== this.pollGeneration) return;
      const run = await this.client.registerTopicRun(opId);
      if (generation !== this.pollGeneration) return;
      this.selectedRunId.set(run.id);
      await this.poll(run.id, generation);
    } catch (error) {
      if (generation !== this.pollGeneration) return;
      this.runBusy.set(false);
      this.pollRecovering.set(false);
      this.runError.set(errorMessage(error));
    }
  }

  private async runPackageTest(finalist: ShortlistEntry): Promise<void> {
    this.packageBusy.set(finalist.subject);
    this.packageError.set(null);
    this.packageFinalist.set(finalist);
    this.packageHistory.set([]);

    try {
      const idea = await this.resolveIdea(
        finalist.subject,
        finalist.angle_markdown,
      );
      this.packageHistory.set(
        await this.client.listPackageTests(idea.id),
      );
      const runArtifacts = this.currentRunArtifacts();
      const outcome = await this.executeOperation(
        'package-test',
        buildTopicOperationInputs({
          ideaText: finalistIdeaText(finalist),
          userConstraints: {},
          runArtifacts,
          selectedWinner: null,
        }, 'package-test'),
      );
      const directions = packageDirections(outcome);
      const saved = await this.client.createPackageTest(idea.id, {
        opId: operationId(outcome),
        directions,
      });
      this.packageHistory.update((history) => [saved, ...history]);
    } catch (error) {
      this.packageError.set(errorMessage(error));
    } finally {
      this.packageBusy.set(null);
    }
  }

  private async pickPackage(
    test: PackageTestRecord,
    directionIndex: number,
  ): Promise<void> {
    this.packageSelectionBusy.set(test.id);
    this.packageError.set(null);
    try {
      const selected = await this.client.pickPackageDirection(
        test.ideaId,
        test.id,
        directionIndex,
      );
      this.packageHistory.update((history) => history.map(
        (record) => record.id === selected.id ? selected : record,
      ));
    } catch (error) {
      this.packageError.set(errorMessage(error));
    } finally {
      this.packageSelectionBusy.set(null);
    }
  }

  private async runHandoffPreview(summary: TopicSummary): Promise<void> {
    const winner = summary.winner;
    if (!winner.subject || !winner.angle_markdown) return;
    this.handoffBusy.set(true);
    this.handoffError.set(null);
    this.handoffPreview.set(null);
    this.handoffResult.set(null);

    try {
      const idea = await this.resolveIdea(
        winner.subject,
        winner.angle_markdown,
      );
      const packageTests = await this.client.listPackageTests(idea.id);
      const selectedTest = packageTests.find(
        (test) =>
          test.selectedDirectionIndex !== null
          && test.selectedDirectionIndex !== undefined,
      );
      const selectedIndex = selectedTest?.selectedDirectionIndex;
      const selectedDirection = selectedIndex === null
        || selectedIndex === undefined
        ? undefined
        : selectedTest?.directions[selectedIndex];
      const outcome = await this.executeOperation(
        'handoff-preview',
        buildTopicOperationInputs({
          ideaText: '',
          userConstraints: null,
          runArtifacts: this.currentRunArtifacts(),
          selectedWinner: winner,
        }, 'handoff-preview'),
      );
      if (
        outcome.operation.state !== 'completed'
        || outcome.result.kind !== 'raw'
        || outcome.result.markdown.trim() === ''
      ) {
        throw new Error(operationFailure(outcome));
      }
      const markdown = outcome.result.markdown;
      this.handoffPreview.set({
        markdown,
        brief: parseHandoffBrief(markdown, winner),
        idea,
        slug: slugify(winner.subject),
        title: winner.subject,
        selectedPackage: selectedTest && selectedDirection
          ? {
              testId: selectedTest.id,
              directionIndex: selectedIndex!,
              direction: selectedDirection,
            }
          : null,
      });
    } catch (error) {
      this.handoffError.set(errorMessage(error));
    } finally {
      this.handoffBusy.set(false);
    }
  }

  private async acceptHandoff(preview: HandoffPreview): Promise<void> {
    this.handoffBusy.set(true);
    this.handoffError.set(null);

    try {
      const runId = this.selectedRunId();
      if (runId === null) {
        throw new Error('Select a durable topic run before confirming handoff.');
      }
      const blank = createBlankNarrationDocument('beat_topic_handoff');
      const result = await this.client.handoffTopicRun(runId, {
        ideaId: preview.idea.id,
        episodeSlug: preview.slug,
        title: preview.title,
        briefMarkdown: preview.markdown,
        draft: {
          format: 'narration',
          doc: {
            ...blank,
            metadata: {
              topic: preview.brief.topic,
              anchors: preview.brief.anchors,
              unknowns: preview.brief.unknowns,
              approvedLessons: [],
              creativeStatus: { phase: 'architecture' },
              directionApproved: false,
            },
          },
        },
      });
      this.handoffResult.set(result);
      if (!result.complete) {
        this.handoffError.set(
          result.error ?? 'The handoff is incomplete and can be retried safely.',
        );
        return;
      }
      await this.router.navigate(['/'], {
        queryParams: { draft: result.draftId },
      });
    } catch (error) {
      this.handoffError.set(errorMessage(error));
    } finally {
      this.handoffBusy.set(false);
    }
  }

  private async resumeDurableHandoff(
    handoff: TopicHandoffState,
  ): Promise<void> {
    this.handoffBusy.set(true);
    this.handoffError.set(null);

    try {
      const runId = this.selectedRunId();
      if (runId === null) {
        throw new Error('Select a durable topic run before resuming handoff.');
      }
      const result = await this.client.handoffTopicRun(runId, {
        resumeKey: handoff.resumeKey,
      });
      this.handoffResult.set(result);
      if (!result.complete) {
        this.handoffError.set(
          result.error ?? 'The durable handoff remains incomplete.',
        );
        return;
      }
      await this.router.navigate(['/'], {
        queryParams: { draft: result.draftId },
      });
    } catch (error) {
      this.handoffError.set(errorMessage(error));
    } finally {
      this.handoffBusy.set(false);
    }
  }

  private async resolveIdea(
    subject: string,
    angleMarkdown: string,
  ): Promise<IdeaRecord> {
    const text = `${subject}\n\n${angleMarkdown}`;
    const ideas = await this.client.listIdeas();
    return ideas.find((idea) => idea.text === text)
      ?? await this.client.createIdea({ text, source: 'ideate' });
  }

  private currentRunArtifacts(): {
    summary: TopicSummary;
    reportMd: string | undefined;
  } {
    const current = this.snapshot();
    if (!current?.summary) {
      throw new Error('Complete a topic run before testing its finalists.');
    }
    return {
      summary: current.summary,
      reportMd: current.reportMd,
    };
  }

  private async executeOperation(
    operation: 'package-test' | 'handoff-preview',
    inputs: unknown,
  ): Promise<OperationOutcome & { id: string }> {
    const { id } = await this.submitOpWithPreference(operation, inputs);
    await this.client.streamEvents(id, {
      onEvent: () => undefined,
      onDone: () => undefined,
      onError: () => undefined,
    });
    const [record, result] = await Promise.all([
      this.client.getOp(id),
      this.client.getResult(id),
    ]);
    return { id, operation: record, result };
  }

  private resetPackageTest(): void {
    this.packageBusy.set(null);
    this.packageError.set(null);
    this.packageFinalist.set(null);
    this.packageHistory.set([]);
    this.packageSelectionBusy.set(null);
  }

  private resetHandoff(): void {
    this.handoffBusy.set(false);
    this.handoffError.set(null);
    this.handoffPreview.set(null);
    this.handoffResult.set(null);
  }

  private async loadRun(run: TopicRunSummary): Promise<void> {
    const generation = ++this.pollGeneration;
    this.clearPollTimer();
    this.selectedRunId.set(run.id);
    this.selectingRunId.set(run.id);
    this.snapshot.set(null);
    this.runBusy.set(POLLING_STATES.has(run.state));
    this.runError.set(null);
    this.pollRecovering.set(false);
    this.sortKey.set('total');
    this.resetPackageTest();
    this.resetHandoff();

    await this.poll(run.id, generation);
    if (generation === this.pollGeneration) {
      this.selectingRunId.set(null);
    }
  }

  private async refreshRuns(): Promise<void> {
    this.runListLoading.set(true);
    this.runListError.set(null);
    try {
      const runs = await this.client.listTopicRuns();
      this.runs.set([...runs].sort(compareRunsNewestFirst));
    } catch (error) {
      this.runListError.set(
        `Recent runs could not be loaded. ${errorMessage(error)}`,
      );
    } finally {
      this.runListLoading.set(false);
    }
  }

  private async poll(runId: string, generation: number): Promise<void> {
    try {
      const next = await this.client.getTopicRun(runId);
      if (generation !== this.pollGeneration) return;
      this.snapshot.set(next);
      this.runError.set(null);
      this.pollRecovering.set(false);

      if (POLLING_STATES.has(next.state)) {
        this.runBusy.set(true);
        this.schedulePoll(runId, generation);
        return;
      }

      this.runBusy.set(false);
      await this.refreshRuns();
      if (generation !== this.pollGeneration) return;
      if (next.state !== 'completed' && !next.summaryError) {
        this.runError.set(
          `Run ended in ${this.stateLabel(next.state)} before a summary became available.`,
        );
      }
    } catch (error) {
      if (generation !== this.pollGeneration) return;
      this.pollRecovering.set(true);
      this.runError.set(
        `Live progress is temporarily unavailable. Retrying in 2 seconds. ${errorMessage(error)}`,
      );
      this.schedulePoll(runId, generation);
    }
  }

  private schedulePoll(runId: string, generation: number): void {
    this.clearPollTimer();
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      void this.poll(runId, generation);
    }, POLL_INTERVAL_MS);
  }

  private clearPollTimer(): void {
    if (this.pollTimer === null) return;
    clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }
}

function compareNullableScoreDescending(
  left: number | null,
  right: number | null,
): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}

function compareRunsNewestFirst(
  left: TopicRunSummary,
  right: TopicRunSummary,
): number {
  return right.createdAt.localeCompare(left.createdAt);
}

function finalistIdeaText(finalist: ShortlistEntry): string {
  return `${finalist.subject}\n\n${finalist.angle_markdown}`;
}

function operationId(outcome: OperationOutcome & { id: string }): string {
  return outcome.id;
}

function packageDirections(outcome: OperationOutcome): PackageDirection[] {
  if (
    outcome.operation.state !== 'completed'
    || outcome.result.kind !== 'schema'
  ) {
    throw new Error(operationFailure(outcome));
  }
  if (outcome.result.guardrail?.trim()) {
    throw new Error(outcome.result.guardrail);
  }
  const payload = record(outcome.result.value);
  if (
    payload?.['status'] !== 'complete'
    || !Array.isArray(payload['directions'])
  ) {
    throw new Error(
      'Package test did not return the required directions table.',
    );
  }
  return payload['directions'].map((candidate, index) => {
    const direction = record(candidate);
    if (!direction) {
      throw new Error(`Package direction ${index + 1} is not an object.`);
    }
    return {
      working_title: requiredResultString(
        direction,
        'working_title',
        index,
      ),
      intended_viewer: requiredResultString(
        direction,
        'intended_viewer',
        index,
      ),
      familiar_markdown: requiredResultString(
        direction,
        'familiar_markdown',
        index,
      ),
      surprise_markdown: requiredResultString(
        direction,
        'surprise_markdown',
        index,
      ),
      visual_promise_markdown: requiredResultString(
        direction,
        'visual_promise_markdown',
        index,
      ),
      delivered_payoff_markdown: requiredResultString(
        direction,
        'delivered_payoff_markdown',
        index,
      ),
      survives_honestly: requiredResultBoolean(direction, index),
      reason_markdown: requiredResultString(
        direction,
        'reason_markdown',
        index,
      ),
    };
  });
}

function requiredResultString(
  direction: Record<string, unknown>,
  field: keyof Omit<PackageDirection, 'survives_honestly'>,
  index: number,
): string {
  const value = direction[field];
  if (typeof value !== 'string') {
    throw new Error(
      `Package direction ${index + 1} is missing ${field}.`,
    );
  }
  return value;
}

function requiredResultBoolean(
  direction: Record<string, unknown>,
  index: number,
): boolean {
  const value = direction['survives_honestly'];
  if (typeof value !== 'boolean') {
    throw new Error(
      `Package direction ${index + 1} is missing survives_honestly.`,
    );
  }
  return value;
}

function operationFailure(outcome: OperationOutcome): string {
  if (outcome.result.kind === 'failed') return outcome.result.error;
  if (outcome.operation.error?.trim()) return outcome.operation.error;
  if (outcome.result.kind === 'pending') {
    return 'Operation ended before a result became available.';
  }
  return `Operation ended in ${outcome.operation.state}.`;
}

function parseHandoffBrief(
  markdown: string,
  winner: TopicSummary['winner'],
): HandoffBrief {
  const fallbackTopic = winner.subject && winner.angle_markdown
    ? `${winner.subject} — ${winner.angle_markdown}`
    : winner.subject ?? winner.angle_markdown ?? '';
  const topicMatch =
    /^\s*\*\*(?:selected )?topic(?: and angle)?:\*\*\s*(.+?)\s*$/imu
      .exec(markdown);
  const anchors: string[] = [];
  const unknowns: string[] = [];
  let section: 'anchors' | 'unknowns' | null = null;

  for (const line of markdown.split(/\r?\n/u)) {
    const heading = /^#{1,6}[ \t]+(.+?)\s*$/u.exec(line)?.[1]
      ?.toLowerCase();
    if (heading !== undefined) {
      section = heading.includes('anchor')
        ? 'anchors'
        : heading.includes('unknown')
          ? 'unknowns'
          : null;
      continue;
    }
    const item = /^[ \t]*[-*][ \t]+(.+?)\s*$/u.exec(line)?.[1];
    if (!item || section === null) continue;
    (section === 'anchors' ? anchors : unknowns).push(item);
  }

  return {
    topic: topicMatch?.[1]?.trim() || fallbackTopic,
    anchors,
    unknowns,
  };
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    || 'selected-topic';
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textareaValue(event: Event): string {
  return event.target instanceof HTMLTextAreaElement
    ? event.target.value
    : '';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Operation failed.';
}
