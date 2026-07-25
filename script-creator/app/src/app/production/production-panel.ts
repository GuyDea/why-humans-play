import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  type OnInit,
  signal,
} from '@angular/core';
import type {
  DaemonClient,
  DraftRecord,
  NarrationProposalRecord,
  OperationName,
  OperationResult,
  PromotionRecord,
  ValidatorResult,
} from '../api/client';
import {
  ArchitectureModel,
  captureRoutedArchitectureConflict,
} from '../architecture/model';
import type { EditorHost } from '../editor/editor-host';
import { ModelPreferenceService } from '../ops/model-preference';
import { readDraftMetadata } from '../panels/brief-panel';
import {
  buildPersonalInputOperationInputs,
  buildProductionView,
  mapValidatorDiagnostics,
  type PersonalInputRequest,
} from './sections';

interface PersonalInputProposal {
  opId: string;
  request: PersonalInputRequest;
  replacement: string;
}

@Component({
  selector: 'app-production-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="production-panel"
      aria-labelledby="production-heading"
    >
      <header>
        <div>
          <p class="eyebrow">Phase 2</p>
          <h2 id="production-heading">Production document</h2>
        </div>
        @if (view().sections.length > 0) {
          <label class="clean-toggle">
            <input
              type="checkbox"
              aria-label="Clean narration"
              [checked]="cleanNarration()"
              (change)="toggleCleanNarration($event)"
            />
            Clean narration
          </label>
        }
      </header>

      <section class="promote-workflow" aria-labelledby="promote-heading">
        <header>
          <h3 id="promote-heading">Staged Promote</h3>
          <span>{{ promotion()?.state ?? 'not started' }}</span>
        </header>
        <div class="button-row">
          <button
            type="button"
            [disabled]="workflowBusy()
              || narrationApproved()
              || (editor()?.unsaved() ?? false)
              || promotion() !== null"
            (click)="approveCompleteNarration()"
          >
            Approve complete narration
          </button>
          <label class="target-field">
            Production target
            <input
              type="text"
              aria-label="Production target"
              [value]="productionTarget()"
              (input)="setProductionTarget($event)"
            />
          </label>
          <button
            type="button"
            [disabled]="workflowBusy()
              || !narrationApproved()
              || productionTarget().trim() === ''
              || promotion() !== null"
            (click)="promote()"
          >
            Promote to Phase 2
          </button>
          @if (promotion()?.state === 'output-ready') {
            <button
              type="button"
              [disabled]="workflowBusy()"
              (click)="resumeInterruptedPromote()"
            >
              Resume interrupted Promote
            </button>
          }
        </div>
        @if (workflowError()) {
          <p class="error" role="alert">{{ workflowError() }}</p>
        }
        @if (pendingNarrationProposals().length > 0) {
          <section
            class="proposal-recovery"
            data-testid="proposal-recovery"
            aria-labelledby="proposal-recovery-heading"
          >
            <h4 id="proposal-recovery-heading">
              Unresolved durable proposals
            </h4>
            @for (
              proposal of pendingNarrationProposals();
              track proposal.operationId
            ) {
              <div>
                <code>{{ proposal.operationId }}</code>
                <span>state: {{ proposal.state }}</span>
                <button
                  type="button"
                  [disabled]="workflowBusy()"
                  (click)="retryProposalSettlement(proposal)"
                >
                  {{
                    proposal.acceptedRevisionPresent
                      ? 'Retry accepted settlement'
                      : 'Reject durable proposal'
                  }}
                </button>
              </div>
            }
          </section>
        }

        @if (promotion()?.state === 'validation-required'
          || promotion()?.state === 'complete') {
          <div class="validator-actions">
            <button
              type="button"
              [disabled]="workflowBusy()"
              (click)="runValidator()"
            >
              {{ validatorResult() ? 'Re-run validator' : 'Run validator' }}
            </button>
            <span
              class="validator-badge"
              [attr.data-validator-status]="validatorBadge()"
            >
              {{ validatorBadge().toUpperCase() }}
            </span>
            @if (validatorResult(); as validation) {
              <span>
                {{ validation.errors.length }}
                {{ validation.errors.length === 1 ? 'diagnostic' : 'diagnostics' }}
              </span>
            }
            <button
              type="button"
              [disabled]="workflowBusy()
                || validatorBadge() !== 'pass'
                || promotion()?.state !== 'validation-required'"
              (click)="completePromote()"
            >
              Complete Promote
            </button>
          </div>
          @if (validatorBadge() === 'fail') {
            <p class="validator-fix-cycle" role="status">
              Fix cycle started — edit the draft, then re-run the validator.
              This failed attempt is evidence, not an editorial approval.
            </p>
          }
          @if (mappedValidatorDiagnostics().length > 0) {
            <ul class="validator-diagnostics">
              @for (
                diagnostic of mappedValidatorDiagnostics();
                track diagnostic.line + '-' + $index
              ) {
                <li>
                  @if (diagnostic.line !== null) {
                    <strong>Line {{ diagnostic.line }}</strong>
                  } @else {
                    <strong>Global</strong>
                  }
                  @if (diagnostic.owner) {
                    <span>{{ diagnostic.owner.label }}</span>
                  }
                  <p>{{ diagnostic.message }}</p>
                </li>
              }
            </ul>
          }
        }
      </section>

      @if (view().sections.length > 0) {
        <div class="production-cards">
          @for (section of view().sections; track section.id) {
            <details open data-testid="production-card">
              <summary>
                <span>{{ section.title }}</span>
                <small>{{ section.kind }}</small>
              </summary>
              <pre>{{ section.md }}</pre>
            </details>
          }
        </div>

        @if (view().diagnostics.length > 0) {
          <section class="diagnostics" aria-labelledby="structure-heading">
            <h3 id="structure-heading">Structural diagnostics</h3>
            <ul>
              @for (diagnostic of view().diagnostics; track $index) {
                <li>{{ diagnostic.message }}</li>
              }
            </ul>
          </section>
        }

        @if (view().personalInputs.length > 0) {
          <section class="pi-queue" aria-labelledby="pi-heading">
            <h3 id="pi-heading">Personal input queue</h3>
            @for (request of view().personalInputs; track request.id) {
              <article [attr.data-personal-input-id]="request.id">
                <header>
                  <strong>{{ request.id }}</strong>
                  <span>{{ request.decision }}</span>
                </header>
                <p>{{ request.primaryPrompt }}</p>
                <p>{{ request.followUpPrompts }}</p>
                @if (request.readOnly) {
                  <p class="read-only">This block is read-only in V1.</p>
                } @else {
                  <label>
                    Martin-supplied response
                    <textarea
                      rows="5"
                      [attr.aria-label]="'Response for ' + request.id"
                      [value]="responses()[request.id] ?? ''"
                      (input)="setResponse(request.id, $event)"
                    ></textarea>
                  </label>
                  <button
                    type="button"
                    [disabled]="busyIds().has(request.id)
                      || !(responses()[request.id] ?? '').trim()"
                    (click)="integrate(request)"
                  >
                    Integrate supplied response
                  </button>
                }

                @if (proposals()[request.id]; as proposal) {
                  <section class="pi-proposal" data-testid="pi-proposal">
                    <strong>Skill proposal</strong>
                    <pre>{{ proposal.replacement }}</pre>
                    <label>
                      Why? <span>(optional)</span>
                      <input
                        type="text"
                        [attr.aria-label]="'Why reject ' + request.id"
                        [value]="rejectionReasons()[request.id] ?? ''"
                        (input)="setRejectionReason(request.id, $event)"
                      />
                    </label>
                    <div class="button-row">
                      <button type="button" (click)="acceptProposal(proposal)">
                        Accept proposal
                      </button>
                      <button type="button" (click)="rejectProposal(request.id)">
                        Reject proposal
                      </button>
                    </div>
                  </section>
                }
                @if (errors()[request.id]; as error) {
                  <p class="error" role="alert">{{ error }}</p>
                }
              </article>
            }
          </section>
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      max-width: 86rem;
      margin: 1rem auto;
    }

    .production-panel,
    .promote-workflow,
    .pi-queue,
    article,
    .pi-proposal {
      display: grid;
      gap: 0.75rem;
    }

    .production-panel {
      border: 1px solid var(--whp-line);
      background: var(--whp-panel);
      padding: 1rem;
    }

    .promote-workflow {
      border: 1px solid var(--whp-line);
      background: var(--whp-surface);
      padding: 0.75rem;
    }

    header,
    summary,
    .button-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    h2,
    h3,
    p,
    pre,
    ul {
      margin: 0;
    }

    h2 {
      font-size: 1rem;
    }

    h3 {
      font-size: 0.82rem;
    }

    .eyebrow,
    summary small,
    article header span,
    .read-only {
      color: var(--whp-muted);
      font-size: 0.65rem;
    }

    .eyebrow,
    summary small {
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .clean-toggle,
    article label,
    .target-field {
      color: var(--whp-muted);
      font-size: 0.72rem;
    }

    .target-field {
      display: grid;
      flex: 1 1 22rem;
      gap: 0.25rem;
    }

    .target-field input {
      border: 1px solid var(--whp-line-strong);
      background: var(--whp-ground);
      padding: 0.45rem;
      color: var(--whp-ink);
      font: inherit;
    }

    .validator-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      color: var(--whp-muted);
      font-size: 0.7rem;
    }

    .validator-badge {
      border-radius: 999px;
      background: var(--whp-line-soft);
      padding: 0.2rem 0.5rem;
      font-weight: 800;
    }

    .validator-diagnostics {
      display: grid;
      gap: 0.45rem;
      padding: 0;
      list-style: none;
    }

    .validator-diagnostics li {
      display: grid;
      grid-template-columns: auto auto minmax(0, 1fr);
      gap: 0.4rem;
      border-left: 3px solid var(--whp-accent);
      padding: 0.45rem;
      color: var(--whp-muted);
      font-size: 0.7rem;
    }

    .production-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: 0.65rem;
    }

    details,
    article,
    .diagnostics {
      border: 1px solid var(--whp-line);
      background: var(--whp-surface);
      padding: 0.7rem;
    }

    summary {
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 800;
    }

    details pre {
      max-height: 18rem;
      overflow: auto;
      margin-top: 0.65rem;
      color: var(--whp-muted);
      font: 0.68rem/1.45 var(--whp-font-mono);
      white-space: pre-wrap;
    }

    .pi-queue article p {
      color: var(--whp-muted);
      font-size: 0.72rem;
      line-height: 1.45;
    }

    textarea {
      box-sizing: border-box;
      width: 100%;
      margin-top: 0.3rem;
      border: 1px solid var(--whp-line-strong);
      background: var(--whp-ground);
      padding: 0.55rem;
      color: var(--whp-ink);
      font: inherit;
    }

    button {
      justify-self: start;
      border: 1px solid var(--whp-line-strong);
      background: var(--whp-surface);
      padding: 0.45rem 0.65rem;
      color: var(--whp-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.7rem;
      font-weight: 800;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .pi-proposal {
      border-left: 3px solid var(--whp-warning);
      background: var(--whp-warning-tint);
      padding: 0.65rem;
    }

    .pi-proposal pre {
      white-space: pre-wrap;
    }

    .error,
    .diagnostics {
      color: var(--whp-accent);
      font-size: 0.72rem;
    }
  `,
})
export class ProductionPanel implements OnInit {
  private readonly modelPreference = inject(ModelPreferenceService);

  private submitDraftOpWithPreference(
    operation: OperationName,
    inputs: unknown,
  ): Promise<{ id: string }> {
    const choice = this.modelPreference.get(operation) ?? null;
    return choice
      ? this.client().submitDraftOp(this.draft().id, operation, inputs, choice)
      : this.client().submitDraftOp(this.draft().id, operation, inputs);
  }

  readonly draft = input.required<DraftRecord>();
  readonly client = input.required<DaemonClient>();
  readonly editor = input<EditorHost | null>(null);
  readonly architectureModel = input<ArchitectureModel | null>(null);
  readonly architectureConflict = output<unknown>();

  readonly cleanNarration = signal(false);
  readonly responses = signal<Partial<Record<string, string>>>({});
  readonly proposals = signal<Record<string, PersonalInputProposal>>({});
  readonly rejectionReasons =
    signal<Partial<Record<string, string>>>({});
  readonly errors = signal<Record<string, string>>({});
  readonly busyIds = signal<ReadonlySet<string>>(new Set());
  readonly productionTarget = signal('');
  readonly promotion = signal<PromotionRecord | null>(null);
  readonly currentRevisionSeq = signal<number | null>(null);
  readonly narrationApprovalVersion = signal(0);
  readonly validatorResult = signal<ValidatorResult | null>(null);
  readonly validatorSnapshotMarkdown = signal<string | null>(null);
  readonly workflowBusy = signal(false);
  readonly workflowError = signal<string | null>(null);
  readonly pendingNarrationProposals =
    signal<NarrationProposalRecord[]>([]);
  readonly view = computed(() => {
    const document = this.editor()?.doc() ?? this.draft().doc;
    return buildProductionView(document);
  });
  readonly narrationApproved = computed(() => {
    this.narrationApprovalVersion();
    const draft = this.draft();
    const knownRevisionSeq = Math.max(
      this.currentRevisionSeq() ?? 0,
      this.editor()?.latestRevision()?.seq ?? 0,
    );
    return typeof draft.approvedNarrationAt === 'string'
      && draft.approvedNarrationAt !== ''
      && typeof draft.approvedNarrationMd === 'string'
      && draft.approvedNarrationMd === this.view().markdown
      && draft.approvedNarrationRevisionSeq === knownRevisionSeq
      && readDraftMetadata(draft.doc).creativeStatus.phase
        === 'creative-approved';
  });
  readonly validatorBadge = computed<
    'not-run' | 'pass' | 'fail' | 'stale'
  >(() => {
    const result = this.validatorResult();
    if (!result) return 'not-run';
    if (this.validatorSnapshotMarkdown() !== this.view().markdown) {
      return 'stale';
    }
    return result.ok ? 'pass' : 'fail';
  });
  readonly mappedValidatorDiagnostics = computed(() => {
    const result = this.validatorResult();
    return result
      ? mapValidatorDiagnostics(this.view().markdown, result.errors)
      : [];
  });

  ngOnInit(): void {
    void this.loadWorkflowState();
  }

  protected setProductionTarget(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.productionTarget.set(target.value);
  }

  protected approveCompleteNarration(): void {
    if (
      this.workflowBusy()
      || this.narrationApproved()
      || this.editor()?.unsaved()
    ) {
      return;
    }
    void this.runNarrationApproval();
  }

  protected promote(): void {
    if (
      this.workflowBusy()
      || !this.narrationApproved()
      || this.productionTarget().trim() === ''
      || this.promotion() !== null
    ) {
      return;
    }
    void this.runPromote();
  }

  protected runValidator(): void {
    if (this.workflowBusy()) return;
    void this.runValidation();
  }

  protected resumeInterruptedPromote(): void {
    const promotion = this.promotion();
    if (this.workflowBusy() || promotion?.state !== 'output-ready') {
      return;
    }
    if (promotion.error === 'production synchronization in progress') {
      void this.runValidation();
    } else if (
      promotion.error === 'promotion completion in progress'
      || promotion.error === 'production pipeline rollback required'
    ) {
      void this.runCompletion();
    } else {
      void this.runStagedReconciliation(promotion.operationId);
    }
  }

  protected completePromote(): void {
    if (
      this.workflowBusy()
      || this.validatorBadge() !== 'pass'
      || this.promotion()?.state !== 'validation-required'
    ) {
      return;
    }
    void this.runCompletion();
  }

  protected retryProposalSettlement(
    proposal: NarrationProposalRecord,
  ): void {
    if (this.workflowBusy()) return;
    void this.resolveDurableProposal(proposal);
  }

  protected toggleCleanNarration(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.cleanNarration.set(target.checked);
    this.editor()?.setCleanNarration(target.checked);
  }

  protected setResponse(id: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    this.responses.update((responses) => ({
      ...responses,
      [id]: target.value,
    }));
  }

  protected integrate(request: PersonalInputRequest): void {
    const suppliedPersonalInput = this.responses()[request.id]?.trim() ?? '';
    if (
      suppliedPersonalInput === ''
      || request.readOnly
      || this.busyIds().has(request.id)
    ) {
      return;
    }
    void this.runIntegration(request, suppliedPersonalInput);
  }

  protected rejectProposal(id: string): void {
    const proposal = this.proposals()[id];
    if (!proposal) return;
    const enteredReason = this.rejectionReasons()[id] ?? '';
    void this.client().resolveNarrationProposal(
      this.draft().id,
      proposal.opId,
      'rejected',
      enteredReason === '' ? null : enteredReason,
    ).then(() => {
      this.proposals.update((proposals) => withoutKey(proposals, id));
      this.rejectionReasons.update((reasons) => withoutKey(reasons, id));
    }).catch((error: unknown) => {
      this.setError(id, errorMessage(error));
    });
  }

  protected setRejectionReason(id: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.rejectionReasons.update((reasons) => ({
      ...reasons,
      [id]: target.value,
    }));
  }

  protected acceptProposal(proposal: PersonalInputProposal): void {
    const accepted = this.editor()?.applyPersonalInputProposal({
      opId: proposal.opId,
      marker: proposal.request.marker,
      bodyMd: proposal.request.bodyMd,
      replacement: proposal.replacement,
    }) ?? false;
    if (!accepted) {
      this.setError(
        proposal.request.id,
        'The proposal no longer matches the current marker and block.',
      );
      return;
    }
    this.proposals.update((proposals) =>
      withoutKey(proposals, proposal.request.id));
  }

  private async runNarrationApproval(): Promise<void> {
    this.workflowBusy.set(true);
    this.workflowError.set(null);
    let releaseEditor = () => {};
    try {
      if (this.editor()) {
        releaseEditor = await this.editor()!.freezeForGateAction();
      }
      const expectedNarrationMd =
        this.editor()?.currentMarkdown() ?? this.view().markdown;
      const revisions = await this.client().listRevisions(this.draft().id);
      const expectedRevisionSeq = revisions.reduce(
        (latest, revision) => Math.max(latest, revision.seq),
        0,
      );
      const { settledExportToken } =
        await this.client().prepareNarrationApproval(
          this.draft().id,
          {
            expectedRevisionSeq,
            expectedNarrationMd,
          },
        );
      if (
        (this.editor()?.unresolvedProposalIds().length ?? 0) > 0
        || (this.editor()?.currentMarkdown() ?? this.view().markdown)
          !== expectedNarrationMd
      ) {
        throw new Error(
          'Narration changed after the settled export was prepared.',
        );
      }
      const approved = await this.client().approveNarration(
        this.draft().id,
        {
          expectedRevisionSeq,
          settledExportToken,
        },
      );
      Object.assign(this.draft(), approved);
      this.currentRevisionSeq.set(
        approved.approvedNarrationRevisionSeq ?? expectedRevisionSeq + 1,
      );
      this.narrationApprovalVersion.update((version) => version + 1);
      this.editor()?.refreshFromServer(approved);
    } catch (error) {
      this.captureArchitectureConflict(error);
      const approvalError = errorMessage(error);
      this.workflowError.set(approvalError);
      await this.loadNarrationProposals();
      const unsettled = this.pendingNarrationProposals();
      if (unsettled.length > 0) {
        const ledgerDetail = unsettled.map((proposal) =>
          `${proposal.operationId} (state: ${proposal.state})`).join(', ');
        if (!approvalError.includes(ledgerDetail)) {
          this.workflowError.set(
            `${approvalError}; unsettled ledger: ${ledgerDetail}`,
          );
        }
      }
    } finally {
      releaseEditor();
      this.workflowBusy.set(false);
    }
  }

  private async runPromote(): Promise<void> {
    this.workflowBusy.set(true);
    this.workflowError.set(null);
    this.validatorResult.set(null);
    this.validatorSnapshotMarkdown.set(null);
    try {
      const { id } = await this.submitDraftOpWithPreference(
        'promote',
        { target_path: this.productionTarget().trim() },
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
            : record.error ?? 'Promote did not complete.',
        );
      }
      const [{ promotion }, draft, revisions] = await Promise.all([
        this.client().getPromotion(this.draft().id),
        this.client().get(this.draft().id),
        this.client().listRevisions(this.draft().id),
      ]);
      this.promotion.set(promotion);
      this.recordCurrentRevision(revisions);
      Object.assign(this.draft(), draft);
      this.editor()?.refreshFromServer(draft);
    } catch (error) {
      this.captureArchitectureConflict(error);
      this.workflowError.set(errorMessage(error));
      await this.loadNarrationProposals();
    } finally {
      this.workflowBusy.set(false);
    }
  }

  private async runValidation(): Promise<void> {
    this.workflowBusy.set(true);
    this.workflowError.set(null);
    try {
      await this.editor()?.flushPendingChanges();
      const revisionsBeforeSync = await this.client().listRevisions(
        this.draft().id,
      );
      const expectedRevisionSeq = revisionsBeforeSync.reduce(
        (latest, revision) => Math.max(latest, revision.seq),
        0,
      );
      this.promotion.set(await this.client().syncProduction(
        this.draft().id,
        {
          expectedRevisionSeq,
        },
      ));
      this.recordCurrentRevision(revisionsBeforeSync);
      const result = await this.client().validateDraft(this.draft().id);
      const [draft, { promotion }, revisions] = await Promise.all([
        this.client().get(this.draft().id),
        this.client().getPromotion(this.draft().id),
        this.client().listRevisions(this.draft().id),
      ]);
      this.recordCurrentRevision(revisions);
      Object.assign(this.draft(), draft);
      this.editor()?.refreshFromServer(draft);
      this.validatorResult.set(result);
      this.validatorSnapshotMarkdown.set(this.view().markdown);
      this.promotion.set(promotion);
    } catch (error) {
      this.captureArchitectureConflict(error);
      this.workflowError.set(errorMessage(error));
      await this.loadNarrationProposals();
    } finally {
      this.workflowBusy.set(false);
    }
  }

  private async runCompletion(): Promise<void> {
    this.workflowBusy.set(true);
    this.workflowError.set(null);
    try {
      const promotion = await this.client().completePromote(
        this.draft().id,
      );
      this.promotion.set(promotion);
      const draft = await this.client().get(this.draft().id);
      Object.assign(this.draft(), draft);
      this.editor()?.refreshFromServer(draft);
    } catch (error) {
      this.captureArchitectureConflict(error);
      try {
        this.promotion.set(
          (await this.client().getPromotion(this.draft().id)).promotion,
        );
      } catch {
        // Preserve the completion error when state refresh also fails.
      }
      this.workflowError.set(errorMessage(error));
    } finally {
      this.workflowBusy.set(false);
    }
  }

  private async runStagedReconciliation(
    operationId: string,
  ): Promise<void> {
    this.workflowBusy.set(true);
    this.workflowError.set(null);
    try {
      await this.client().getResult(operationId);
      const [{ promotion }, draft, revisions] = await Promise.all([
        this.client().getPromotion(this.draft().id),
        this.client().get(this.draft().id),
        this.client().listRevisions(this.draft().id),
      ]);
      this.promotion.set(promotion);
      this.recordCurrentRevision(revisions);
      Object.assign(this.draft(), draft);
      this.editor()?.refreshFromServer(draft);
    } catch (error) {
      this.captureArchitectureConflict(error);
      this.workflowError.set(errorMessage(error));
    } finally {
      this.workflowBusy.set(false);
    }
  }

  private async loadWorkflowState(): Promise<void> {
    try {
      const [revisions, { promotion }, { proposals }] = await Promise.all([
        this.client().listRevisions(this.draft().id),
        this.client().getPromotion(this.draft().id),
        this.client().listNarrationProposals(this.draft().id),
      ]);
      this.recordCurrentRevision(revisions);
      this.promotion.set(promotion);
      this.pendingNarrationProposals.set(proposals);
      if (promotion) this.productionTarget.set(promotion.targetPath);
      if (
        promotion?.state === 'output-ready'
        && promotion.error === 'production synchronization in progress'
      ) {
        await this.runValidation();
      } else if (
        promotion?.state === 'output-ready'
        && (
          promotion.error === 'promotion completion in progress'
          || promotion.error === 'production pipeline rollback required'
        )
      ) {
        await this.runCompletion();
      } else if (promotion?.state === 'output-ready') {
        await this.runStagedReconciliation(promotion.operationId);
      }
    } catch (error) {
      this.workflowError.set(errorMessage(error));
    }
  }

  private async loadNarrationProposals(): Promise<void> {
    try {
      const { proposals } = await this.client().listNarrationProposals(
        this.draft().id,
      );
      this.pendingNarrationProposals.set(proposals);
    } catch {
      // Preserve the gate error; a later retry reloads the durable ledger.
    }
  }

  private async resolveDurableProposal(
    proposal: NarrationProposalRecord,
  ): Promise<void> {
    this.workflowBusy.set(true);
    this.workflowError.set(null);
    try {
      await this.client().resolveNarrationProposal(
        this.draft().id,
        proposal.operationId,
        proposal.acceptedRevisionPresent ? 'accepted' : 'rejected',
      );
      this.editor()?.clearProposalSettlementError();
      await this.loadNarrationProposals();
    } catch (error) {
      this.workflowError.set(errorMessage(error));
    } finally {
      this.workflowBusy.set(false);
    }
  }

  private recordCurrentRevision(
    revisions: readonly { seq: number }[],
  ): void {
    const latest = revisions.reduce(
      (current, revision) => Math.max(current, revision.seq),
      0,
    );
    this.currentRevisionSeq.update((current) =>
      Math.max(current ?? 0, latest));
  }

  private captureArchitectureConflict(error: unknown): void {
    if (
      captureRoutedArchitectureConflict(this.architectureModel(), error)
    ) {
      this.architectureConflict.emit(error);
    }
  }

  private async runIntegration(
    request: PersonalInputRequest,
    suppliedPersonalInput: string,
  ): Promise<void> {
    this.setBusy(request.id, true);
    this.setError(request.id, null);
    try {
      const metadata = readDraftMetadata(
        this.editor()?.brief()?.draft().doc ?? this.draft().doc,
      );
      const inputs = buildPersonalInputOperationInputs(request, {
        topicBrief: {
          topic: metadata.topic,
          factualAnchors: metadata.anchors,
          unknowns: metadata.unknowns,
        },
        approvedLessons: metadata.approvedLessons,
        creativeStatus: metadata.creativeStatus,
        suppliedPersonalInput,
      });
      const { id } = await this.submitDraftOpWithPreference(
        'rewrite-selection',
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
      const replacement = proposalReplacement(record.state, result);
      this.proposals.update((proposals) => ({
        ...proposals,
        [request.id]: { opId: id, request, replacement },
      }));
    } catch (error) {
      this.setError(request.id, errorMessage(error));
    } finally {
      this.setBusy(request.id, false);
    }
  }

  private setBusy(id: string, busy: boolean): void {
    this.busyIds.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  private setError(id: string, error: string | null): void {
    this.errors.update((errors) =>
      error === null
        ? withoutKey(errors, id)
        : { ...errors, [id]: error });
  }
}

function proposalReplacement(
  state: string,
  result: OperationResult,
): string {
  if (state !== 'completed') {
    throw new Error(
      result.kind === 'failed'
        ? result.error
        : 'Personal input operation did not complete.',
    );
  }
  if (result.kind === 'failed') throw new Error(result.error);
  if (result.kind !== 'schema') {
    throw new Error('Personal input operation did not return a proposal.');
  }
  const value = record(result.value);
  const replacement = value?.['replacement_markdown'];
  if (typeof replacement !== 'string') {
    throw new Error('Personal input proposal is missing replacement Markdown.');
  }
  return replacement;
}

function withoutKey<T>(
  recordValue: Record<string, T>,
  key: string,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(recordValue).filter(([candidate]) => candidate !== key),
  );
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'Personal input operation failed.';
}
