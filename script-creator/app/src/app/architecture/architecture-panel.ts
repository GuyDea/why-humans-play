import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import type {
  ArchitectureSection,
  DraftRecord,
} from '../api/client';
import {
  ArchitectureModel,
  type ArchitectureProposal,
} from './model';

interface ArchitectureCard {
  key: string;
  title: string;
  section: ArchitectureSection | null;
  proposal: ArchitectureProposal | null;
}

@Component({
  selector: 'app-architecture-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="architecture-panel"
      aria-labelledby="architecture-heading"
    >
      <header class="architecture-heading">
        <div>
          <p class="eyebrow">Episode structure</p>
          <h2 id="architecture-heading">Architecture</h2>
        </div>
        <strong
          class="approval-ribbon"
          [attr.data-state]="ribbonState()"
          data-testid="architecture-ribbon"
        >
          {{ ribbonLabel() }}
        </strong>
      </header>

      <div class="architecture-actions">
        <label>
          Generate constraints
          <input
            type="text"
            aria-label="Architecture generation constraints"
            placeholder="Optional supplied constraints"
            [disabled]="approvalLocked()"
            [value]="generationConstraints()"
            (input)="setGenerationConstraints($event)"
          />
        </label>
        <div class="button-row">
          <button
            type="button"
            [disabled]="busy() || approvalLocked()"
            (click)="generate()"
          >
            Generate architecture
          </button>
          <button
            type="button"
            [disabled]="busy() || approvalLocked() || !hasSections()"
            (click)="review()"
          >
            Review architecture
          </button>
          @if (model().proposals.length > 0) {
            <button
              type="button"
              [disabled]="busy() || approvalLocked()"
              (click)="acceptAll()"
            >
              Accept all proposals
            </button>
          }
        </div>
      </div>

      <p class="operation-status" aria-live="polite">
        {{ operationStatus() }}
      </p>

      @if (model().failure; as failure) {
        <p class="callout error" role="alert">
          {{ failure }}
        </p>
      }
      @for (guardrail of model().guardrails; track guardrail) {
        <p class="callout guardrail" data-testid="architecture-guardrail">
          {{ guardrail }}
        </p>
      }
      @if (model().actionConflict; as conflict) {
        <aside class="callout conflict" role="alert">
          <strong>{{ conflict.error }}</strong>
          @if (conflict.currentHash) {
            <span>Current repository hash: {{ conflict.currentHash }}</span>
          }
          @if (conflict.parked?.length) {
            <span>Parked versions: {{ conflict.parked?.join(', ') }}</span>
          }
        </aside>
      }

      <div class="architecture-cards">
        @for (card of cards(); track card.key) {
          <article
            class="architecture-card"
            [attr.data-section-key]="card.key"
          >
            <header>
              <div>
                <span>{{ card.key }}</span>
                <h3>{{ card.title || 'Preamble' }}</h3>
              </div>
            </header>

            @if (card.section) {
              <div
                class="rendered-markdown"
                [innerHTML]="render(card.section.md)"
              ></div>
            } @else {
              <p class="empty-section">No accepted section yet.</p>
            }

            @for (
              finding of findingsFor(card.key);
              track finding.findingMarkdown + '-' + $index
            ) {
              <aside
                class="section-finding"
                data-testid="architecture-finding"
                [attr.data-severity]="finding.severity"
              >
                <strong>{{ finding.severity }}</strong>
                <p>{{ finding.findingMarkdown }}</p>
              </aside>
            }

            @if (card.proposal; as proposal) {
              <section
                class="section-proposal"
                data-testid="architecture-proposal"
              >
                <strong>Proposed {{ proposal.kind }}</strong>
                <div
                  class="rendered-markdown"
                  [innerHTML]="render(proposal.section.md)"
                ></div>
                @if (proposal.conflict; as conflict) {
                  <dl class="proposal-conflict">
                    <div>
                      <dt>Base</dt>
                      <dd>{{ conflict.base }}</dd>
                    </div>
                    <div>
                      <dt>Current</dt>
                      <dd>{{ conflict.current }}</dd>
                    </div>
                    <div>
                      <dt>Proposed</dt>
                      <dd>{{ conflict.proposed }}</dd>
                    </div>
                  </dl>
                }
                <div class="button-row">
                  <button
                    type="button"
                    [disabled]="busy() || approvalLocked() || proposal.conflict !== null"
                    (click)="accept(proposal.id)"
                  >
                    Accept proposal
                  </button>
                  <button
                    type="button"
                    [disabled]="busy()"
                    (click)="reject(proposal.id)"
                  >
                    Reject proposal
                  </button>
                </div>
              </section>
            }

            @if (card.section) {
              <form
                class="refine-form"
                (submit)="refine($event, card)"
              >
                <label>
                  Refine instruction
                  <input
                    type="text"
                    [attr.aria-label]="'Refine ' + (card.title || 'Preamble')"
                    [disabled]="approvalLocked()"
                    [value]="refineInstruction(card.key)"
                    (input)="setRefineInstruction(card.key, $event)"
                  />
                </label>
                <button
                  type="submit"
                  [disabled]="busy() || approvalLocked() || refineInstruction(card.key).trim() === ''"
                >
                  Refine section
                </button>
              </form>
            }
          </article>
        } @empty {
          <p class="empty-architecture">
            Generate architecture from the stored episode brief.
          </p>
        }
      </div>

      <footer class="approval-actions">
        @if (sagaPaused()) {
          <button
            type="button"
            class="approve"
            [disabled]="busy()"
            (click)="resumeSaga()"
          >
            {{ resumeLabel() }}
          </button>
        } @else if (isApproved()) {
          <button
            type="button"
            class="reopen"
            [disabled]="busy()"
            (click)="reopen()"
          >
            Reopen architecture
          </button>
        } @else {
          <button
            type="button"
            class="approve"
            [disabled]="busy() || !hasSections() || model().proposals.length > 0"
            (click)="approve()"
          >
            Approve architecture
          </button>
        }
      </footer>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .architecture-panel {
      display: grid;
      gap: 1rem;
      margin-bottom: 1.25rem;
      border: 1px solid var(--whp-line);
      background: var(--whp-panel);
      padding: clamp(1rem, 2vw, 1.4rem);
    }

    .architecture-heading,
    .architecture-card > header,
    .button-row,
    .approval-actions {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 0.75rem;
    }

    h2,
    h3,
    p,
    dl,
    dd {
      margin: 0;
    }

    h2 {
      color: var(--whp-ink);
      font-size: 1.15rem;
    }

    h3 {
      color: var(--whp-ink);
      font-family: var(--whp-font-editor);
      font-size: 1.05rem;
      font-weight: 600;
    }

    .eyebrow,
    .architecture-card header span {
      color: var(--whp-muted-soft);
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .approval-ribbon {
      border: 1px solid var(--whp-line-strong);
      padding: 0.35rem 0.55rem;
      color: var(--whp-muted);
      font-size: 0.7rem;
    }

    .approval-ribbon[data-state='approved'] {
      border-color: var(--whp-success);
      color: var(--whp-success);
    }

    .approval-ribbon[data-state='reopened'] {
      border-color: var(--whp-warning);
      color: var(--whp-warning);
    }

    .architecture-actions,
    .refine-form {
      display: grid;
      gap: 0.65rem;
    }

    label {
      display: grid;
      gap: 0.3rem;
      color: var(--whp-muted);
      font-size: 0.7rem;
      font-weight: 750;
    }

    input {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid var(--whp-line-strong);
      background: var(--whp-surface);
      padding: 0.5rem;
      color: var(--whp-ink);
      font: inherit;
      font-weight: 400;
    }

    .button-row {
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    button {
      border: 1px solid var(--whp-line-strong);
      background: var(--whp-surface);
      padding: 0.46rem 0.68rem;
      color: var(--whp-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.7rem;
      font-weight: 800;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.42;
    }

    .architecture-cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .architecture-card {
      display: grid;
      align-content: start;
      gap: 0.75rem;
      min-width: 0;
      border: 1px solid var(--whp-line);
      background: var(--whp-surface);
      padding: 0.85rem;
    }

    .rendered-markdown {
      overflow-wrap: anywhere;
      color: var(--whp-ink);
      font-family: var(--whp-font-editor);
      font-size: 0.86rem;
      line-height: 1.5;
    }

    .rendered-markdown :where(h3, p, ul, ol, blockquote) {
      margin: 0 0 0.55rem;
    }

    .section-proposal,
    .section-finding,
    .callout {
      display: grid;
      gap: 0.5rem;
      border-left: 3px solid var(--whp-warning);
      background: var(--whp-warning-tint);
      padding: 0.7rem;
    }

    .section-finding {
      border-left-color: var(--whp-ink);
      background: var(--whp-line-soft);
      font-size: 0.75rem;
    }

    .callout.error,
    .callout.conflict {
      border-left-color: var(--whp-accent);
      background: var(--whp-accent-tint);
      color: var(--whp-accent);
    }

    .proposal-conflict {
      display: grid;
      gap: 0.45rem;
    }

    .proposal-conflict div {
      display: grid;
      gap: 0.2rem;
    }

    .proposal-conflict dt {
      color: var(--whp-muted);
      font-size: 0.62rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .proposal-conflict dd {
      white-space: pre-wrap;
    }

    .operation-status,
    .empty-section,
    .empty-architecture {
      color: var(--whp-muted);
      font-size: 0.72rem;
    }

    .approve {
      border-color: var(--whp-accent);
      background: var(--whp-accent);
      color: var(--whp-ground);
    }

    button:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--whp-accent);
      outline-offset: 2px;
    }

    @media (max-width: 48rem) {
      .architecture-cards {
        grid-template-columns: 1fr;
      }

      .architecture-heading {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `,
})
export class ArchitecturePanel {
  readonly model = input.required<ArchitectureModel>();
  readonly version = input(0);
  readonly draft = input.required<DraftRecord>();
  readonly changed = output<void>();
  readonly workflowChanged = output<void>();

  protected readonly generationConstraints = signal('');
  protected readonly busy = signal(false);
  private readonly instructions = signal<Record<string, string>>({});
  private readonly viewVersion = signal(0);

  protected cards(): ArchitectureCard[] {
    this.viewVersion();
    this.version();
    const state = this.model().state;
    const proposals = this.model().proposals;
    const keys = [
      ...(state?.sections.map(({ key }) => key) ?? []),
      ...proposals.map(({ key }) => key),
    ].filter((key, index, all) => all.indexOf(key) === index);
    return keys.map((key) => {
      const section = state?.sections.find(
        (candidate) => candidate.key === key,
      ) ?? null;
      const proposal = proposals.find(
        (candidate) => candidate.key === key,
      ) ?? null;
      return {
        key,
        title: section?.title ?? proposal?.title ?? '',
        section,
        proposal,
      };
    });
  }

  protected findingsFor(key: string) {
    this.viewVersion();
    this.version();
    return this.model().findingsFor(key);
  }

  protected hasSections(): boolean {
    this.viewVersion();
    this.version();
    return (this.model().state?.sections.length ?? 0) > 0;
  }

  protected isApproved(): boolean {
    this.viewVersion();
    this.version();
    return !this.sagaPaused()
      && this.model().state?.approvedAt !== null
      && this.model().state?.approvedAt !== undefined;
  }

  protected sagaPaused(): boolean {
    this.viewVersion();
    this.version();
    return this.model().state?.pendingSaga !== null
      && this.model().state?.pendingSaga !== undefined;
  }

  protected approvalLocked(): boolean {
    return this.isApproved() || this.sagaPaused();
  }

  protected ribbonState(): 'needed' | 'approved' | 'reopened' | 'paused' {
    this.viewVersion();
    this.version();
    const state = this.model().state;
    if (state?.pendingSaga) return 'paused';
    if (state?.narrationReconciliationRequired) return 'reopened';
    return state?.approvedAt ? 'approved' : 'needed';
  }

  protected ribbonLabel(): string {
    const state = this.ribbonState();
    if (state === 'paused') {
      return this.model().state?.pendingSaga?.kind === 'reopen'
        ? 'Reopen paused — resume required'
        : 'Approval paused — resume required';
    }
    if (state === 'reopened') {
      return 'Reopened — narration reconciliation required';
    }
    const approvedAt = this.model().state?.approvedAt;
    return state === 'approved' && approvedAt
      ? `Approved ${formatDate(approvedAt)}`
      : 'Needs architecture';
  }

  protected resumeLabel(): string {
    return this.model().state?.pendingSaga?.kind === 'reopen'
      ? 'Resume Reopen'
      : 'Resume approval';
  }

  protected operationStatus(): string {
    this.viewVersion();
    this.version();
    return this.busy()
      ? this.model().operationStatus
      : this.model().failure
        ? 'Architecture operation failed'
        : 'Architecture controls ready';
  }

  protected render(markdown: string): string {
    return renderArchitectureMarkdown(markdown);
  }

  protected setGenerationConstraints(event: Event): void {
    this.generationConstraints.set(controlValue(event));
  }

  protected setRefineInstruction(key: string, event: Event): void {
    const value = controlValue(event);
    this.instructions.update((current) => ({ ...current, [key]: value }));
  }

  protected refineInstruction(key: string): string {
    return this.instructions()[key] ?? '';
  }

  protected generate(): void {
    if (this.busy() || this.approvalLocked()) return;
    void this.run(async () => {
      const metadata = draftMetadata(this.draft());
      const notes = this.generationConstraints();
      await this.model().generate({
        topicBrief: metadata.topicBrief,
        approvedLessons: metadata.approvedLessons,
        userConstraints: notes.trim() === '' ? {} : { notes },
      });
    });
  }

  protected review(): void {
    if (this.busy() || this.approvalLocked()) return;
    void this.run(() => this.model().review({
      topicBrief: draftMetadata(this.draft()).topicBrief,
    }));
  }

  protected refine(event: Event, card: ArchitectureCard): void {
    event.preventDefault();
    const userInstruction = this.refineInstruction(card.key);
    if (
      this.busy()
      || this.approvalLocked()
      || userInstruction.trim() === ''
    ) return;
    void this.run(async () => {
      await this.model().refine(card.key, {
        topicBrief: draftMetadata(this.draft()).topicBrief,
        userInstruction,
      });
      this.instructions.update((current) => ({
        ...current,
        [card.key]: '',
      }));
    });
  }

  protected accept(id: string): void {
    if (this.busy() || this.approvalLocked()) return;
    void this.run(() => this.model().accept(id));
  }

  protected reject(id: string): void {
    this.model().reject(id);
    this.touch();
  }

  protected acceptAll(): void {
    if (this.busy() || this.approvalLocked()) return;
    void this.run(() => this.model().acceptAll());
  }

  protected approve(): void {
    if (this.busy()) return;
    void this.run(() => this.runWorkflowAction(() => this.model().approve()));
  }

  protected reopen(): void {
    if (this.busy()) return;
    const confirmed = globalThis.confirm(
      'Reopen architecture? Existing narration is preserved but must be reconciled.',
    );
    if (!confirmed) return;
    void this.run(() =>
      this.runWorkflowAction(() => this.model().reopen(true)));
  }

  protected resumeSaga(): void {
    if (this.busy() || !this.sagaPaused()) return;
    void this.run(() =>
      this.runWorkflowAction(() => this.model().resumeSaga()));
  }

  private async runWorkflowAction(action: () => Promise<void>): Promise<void> {
    await action();
    if (!this.model().failure && !this.model().actionConflict) {
      this.workflowChanged.emit();
    }
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.touch(false);
    try {
      await action();
    } finally {
      this.busy.set(false);
      this.touch();
    }
  }

  private touch(emit = true): void {
    this.viewVersion.update((version) => version + 1);
    if (emit) this.changed.emit();
  }
}

export function renderArchitectureMarkdown(markdown: string): string {
  const withoutHtml = markdown.replace(/<[^>]*>/gu, '');
  return withoutHtml
    .trim()
    .split(/\r?\n\r?\n+/u)
    .map((block) => {
      const heading = /^(#{1,3})[ \t]+(.+)$/u.exec(block);
      if (heading) {
        const level = heading[1]!.length;
        return `<h${level}>${inlineMarkdown(heading[2]!)}</h${level}>`;
      }
      const lines = block.split(/\r?\n/u);
      if (lines.every((line) => /^[-*][ \t]+/u.test(line))) {
        return `<ul>${lines.map((line) =>
          `<li>${inlineMarkdown(line.replace(/^[-*][ \t]+/u, ''))}</li>`)
          .join('')}</ul>`;
      }
      return `<p>${lines.map(inlineMarkdown).join('<br>')}</p>`;
    })
    .join('');
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/gu, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/gu, '<em>$1</em>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#039;');
}

function draftMetadata(draft: DraftRecord): {
  topicBrief: {
    topic: string;
    factual_anchors: string[];
    unknowns: string[];
  };
  approvedLessons: string[];
} {
  const metadata = record(draft.doc['metadata']);
  return {
    topicBrief: {
      topic: stringValue(metadata?.['topic']),
      factual_anchors: stringArray(metadata?.['anchors']),
      unknowns: stringArray(metadata?.['unknowns']),
    },
    approvedLessons: stringArray(metadata?.['approvedLessons']),
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }).format(date);
}

function controlValue(event: Event): string {
  const target = event.target;
  return target instanceof HTMLInputElement ? target.value : '';
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
