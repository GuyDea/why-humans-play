import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import type {
  DaemonClient,
  DraftRecord,
  OperationName,
  OperationResult,
} from '../api/client';
import {
  ArchitectureModel,
  joinArchitecture,
} from '../architecture/model';
import type { EditorHost } from '../editor/editor-host';
import { readDraftMetadata } from '../panels/brief-panel';

interface EpisodeProposal {
  opId: string;
  markdown: string;
}

@Component({
  selector: 'app-narration-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="narration-actions" aria-labelledby="narration-actions-heading">
      <header>
        <div>
          <p class="eyebrow">Episode narration</p>
          <h2 id="narration-actions-heading">Narration actions</h2>
        </div>
      </header>

      @if (gateMessage(); as message) {
        <p class="gate-callout" data-testid="narration-gate-callout">
          {{ message }}
        </p>
      }
      @if (model().state?.narrationReconciliationRequired) {
        <div class="reconciliation-callout" role="status">
          <p>Narration reconciliation is required before Promote.</p>
          <button
            type="button"
            [disabled]="busy() || !canGenerate()"
            (click)="markNarrationReconciled()"
          >
            Mark narration reconciled
          </button>
        </div>
      }

      <div class="button-row">
        <button
          type="button"
          [disabled]="busy() || !canGenerate()"
          (click)="generateEpisode()"
        >
          Generate episode
        </button>
        <button
          type="button"
          [disabled]="busy() || !canPromote()"
          (click)="promote()"
        >
          Promote
        </button>
      </div>

      <p class="operation-status" aria-live="polite">
        {{ status() }}
      </p>
      @if (failure(); as operationFailure) {
        <p class="operation-failure" role="alert">
          {{ operationFailure }}
        </p>
      }

      @if (proposal(); as episodeProposal) {
        <section
          class="episode-proposal"
          data-testid="episode-generation-proposal"
          aria-labelledby="episode-proposal-heading"
        >
          <h3 id="episode-proposal-heading">Whole-document proposal</h3>
          <pre>{{ episodeProposal.markdown }}</pre>
          <div class="button-row">
            <button
              type="button"
              [disabled]="busy() || editor() === null"
              (click)="acceptEpisodeProposal()"
            >
              Accept episode proposal
            </button>
            <button
              type="button"
              [disabled]="busy()"
              (click)="rejectEpisodeProposal()"
            >
              Reject episode proposal
            </button>
          </div>
        </section>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .narration-actions {
      display: grid;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      border: 1px solid var(--whp-line);
      background: var(--whp-surface);
      padding: 1rem;
    }

    h2,
    h3,
    p,
    pre {
      margin: 0;
    }

    h2 {
      color: var(--whp-ink);
      font-size: 1rem;
    }

    h3 {
      color: var(--whp-ink);
      font-size: 0.85rem;
    }

    .eyebrow {
      color: var(--whp-muted-soft);
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
    }

    button {
      border: 1px solid var(--whp-line-strong);
      background: var(--whp-surface);
      padding: 0.48rem 0.72rem;
      color: var(--whp-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 800;
    }

    button:first-child {
      border-color: var(--whp-accent);
      background: var(--whp-accent);
      color: var(--whp-ground);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.42;
    }

    .gate-callout,
    .reconciliation-callout,
    .operation-failure {
      border-left: 3px solid var(--whp-warning);
      background: var(--whp-warning-tint);
      padding: 0.65rem;
      color: var(--whp-warning);
      font-size: 0.75rem;
    }

    .operation-failure {
      border-left-color: var(--whp-accent);
      background: var(--whp-accent-tint);
      color: var(--whp-accent);
    }

    .operation-status {
      color: var(--whp-muted);
      font-size: 0.7rem;
    }

    .episode-proposal {
      display: grid;
      gap: 0.65rem;
      border: 1px solid var(--whp-warning);
      background: var(--whp-warning-tint);
      padding: 0.8rem;
    }

    pre {
      max-height: 18rem;
      overflow: auto;
      color: var(--whp-ink);
      font-family: var(--whp-font-mono);
      font-size: 0.72rem;
      white-space: pre-wrap;
    }

    button:focus-visible {
      outline: 2px solid var(--whp-accent);
      outline-offset: 2px;
    }
  `,
})
export class NarrationActions {
  readonly model = input.required<ArchitectureModel>();
  readonly draft = input.required<DraftRecord>();
  readonly client = input.required<DaemonClient>();
  readonly editor = input<EditorHost | null>(null);
  readonly version = input(0);
  readonly changed = output<void>();

  protected readonly busy = signal(false);
  protected readonly status = signal('Narration controls ready');
  protected readonly failure = signal<string | null>(null);
  protected readonly proposal = signal<EpisodeProposal | null>(null);

  protected canGenerate(): boolean {
    this.version();
    const state = this.model().state;
    return state?.approvedAt !== null
      && state?.approvedAt !== undefined
      && state.approvedMd !== null
      && state.approvalSaga === null
      && state.approvedMd === joinArchitecture(state.sections);
  }

  protected canPromote(): boolean {
    this.version();
    if (!this.canGenerate()) return false;
    if (this.model().state?.narrationReconciliationRequired) return false;
    return this.currentMetadata().directionApproved;
  }

  protected gateMessage(): string | null {
    this.version();
    if (!this.canGenerate()) {
      return 'Approve architecture to unlock Generate Episode.';
    }
    if (this.model().state?.narrationReconciliationRequired) {
      return 'Generate Episode can replace narration from the approved architecture; Promote remains locked.';
    }
    if (!this.currentMetadata().directionApproved) {
      return 'Approve complete narration before Promote.';
    }
    return null;
  }

  protected generateEpisode(): void {
    if (this.busy() || !this.canGenerate()) return;
    void this.runGenerate();
  }

  protected promote(): void {
    if (this.busy() || !this.canPromote()) return;
    void this.runSimpleOperation('promote');
  }

  protected markNarrationReconciled(): void {
    const state = this.model().state;
    if (
      this.busy()
      || !this.canGenerate()
      || !state?.narrationReconciliationRequired
    ) return;
    const confirmed = globalThis.confirm(
      'Mark narration reconciled at the current revision?',
    );
    if (!confirmed) return;
    void this.runMarkNarrationReconciled(state.revisionSeq);
  }

  protected rejectEpisodeProposal(): void {
    const proposal = this.proposal();
    if (!proposal || this.busy()) return;
    this.busy.set(true);
    this.failure.set(null);
    void this.client().resolveNarrationProposal(
      this.draft().id,
      proposal.opId,
      'rejected',
    ).then(() => {
      this.proposal.set(null);
      this.status.set('Episode proposal rejected');
    }).catch((error: unknown) => {
      this.failure.set(errorMessage(error));
      this.status.set('Episode proposal rejection failed');
    }).finally(() => {
      this.busy.set(false);
    });
  }

  protected acceptEpisodeProposal(): void {
    const proposal = this.proposal();
    const editor = this.editor();
    if (!proposal || !editor || this.busy()) return;
    void this.acceptProposal(proposal, editor);
  }

  private async runGenerate(): Promise<void> {
    this.busy.set(true);
    this.failure.set(null);
    this.proposal.set(null);
    this.status.set('Generating episode');
    try {
      const state = this.model().state;
      if (!state?.approvedMd) {
        throw new Error('Architecture approval is required.');
      }
      const result = await this.execute('generate-episode', generationInputs(
        this.currentMetadata(),
      ));
      if (result.result.kind !== 'raw') {
        throw new Error('Generate episode did not return Markdown.');
      }
      this.proposal.set({
        opId: result.id,
        markdown: result.result.markdown,
      });
      this.status.set('Episode proposal ready');
    } catch (error) {
      this.failure.set(errorMessage(error));
      this.status.set('Episode generation failed');
    } finally {
      this.busy.set(false);
    }
  }

  private async runSimpleOperation(operation: 'promote'): Promise<void> {
    this.busy.set(true);
    this.failure.set(null);
    this.status.set('Promoting episode');
    try {
      await this.execute(operation, generationInputs(this.currentMetadata()));
      this.status.set('Promote operation complete');
    } catch (error) {
      this.failure.set(errorMessage(error));
      this.status.set('Promote failed');
    } finally {
      this.busy.set(false);
    }
  }

  private async runMarkNarrationReconciled(
    expectedRevisionSeq: number,
  ): Promise<void> {
    this.busy.set(true);
    this.failure.set(null);
    this.status.set('Marking narration reconciled');
    try {
      this.model().state = await this.client().markNarrationReconciled(
        this.draft().id,
        {
          expectedRevisionSeq,
          confirmed: true,
        },
      );
      this.status.set('Narration reconciled');
      this.changed.emit();
    } catch (error) {
      this.failure.set(errorMessage(error));
      this.status.set('Narration reconciliation failed');
    } finally {
      this.busy.set(false);
    }
  }

  private async execute(
    operation: OperationName,
    inputs: unknown,
  ): Promise<{ id: string; result: OperationResult }> {
    const { id } = await this.client().submitDraftOp(
      this.draft().id,
      operation,
      inputs,
    );
    await this.client().streamEvents(id, {
      onEvent: () => undefined,
      onDone: () => undefined,
      onError: () => undefined,
    });
    const [record, result] = await Promise.all([
      this.client().getOp(id),
      this.client().getResult(id),
    ]);
    if (
      record.state !== 'completed'
      || result.kind === 'failed'
      || result.kind === 'pending'
    ) {
      throw new Error(
        result.kind === 'failed'
          ? result.error
          : record.error ?? `${operation} did not complete.`,
      );
    }
    return { id, result };
  }

  private async acceptProposal(
    proposal: EpisodeProposal,
    editor: EditorHost,
  ): Promise<void> {
    this.busy.set(true);
    this.failure.set(null);
    this.status.set('Accepting episode proposal');
    try {
      await editor.replaceNarrationFromMarkdown(
        proposal.markdown,
        proposal.opId,
      );
      await this.client().resolveNarrationProposal(
        this.draft().id,
        proposal.opId,
        'accepted',
      );
      await this.model().load();
      this.proposal.set(null);
      this.status.set('Episode proposal accepted');
      this.changed.emit();
    } catch (error) {
      this.failure.set(errorMessage(error));
      this.status.set('Episode proposal acceptance failed');
    } finally {
      this.busy.set(false);
    }
  }

  private currentMetadata() {
    return this.editor()?.brief()?.metadata()
      ?? readDraftMetadata(this.draft().doc);
  }
}

function generationInputs(
  metadata: ReturnType<typeof readDraftMetadata>,
): {
  topic_brief: {
    topic: string;
    factual_anchors: string[];
    unknowns: string[];
  };
  approved_lessons: string[];
  requested_scope: { kind: 'full-draft' };
} {
  return {
    topic_brief: {
      topic: metadata.topic,
      factual_anchors: metadata.anchors,
      unknowns: metadata.unknowns,
    },
    approved_lessons: metadata.approvedLessons,
    requested_scope: { kind: 'full-draft' },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'Narration operation failed.';
}
