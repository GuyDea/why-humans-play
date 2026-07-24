import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
  type OnChanges,
  type OnInit,
  type SimpleChanges,
} from '@angular/core';
import type {
  DaemonClient,
  DraftRecord,
  MilestoneStatus,
  PendingMilestone,
} from '../api/client';

@Component({
  selector: 'app-milestone-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="milestone-panel" aria-labelledby="milestone-heading">
      <header>
        <div>
          <p class="eyebrow">Repository control</p>
          <h2 id="milestone-heading">Milestones</h2>
        </div>
        @if (status()?.workspace; as workspace) {
          <span class="branch">{{ workspace.branch }}</span>
        }
      </header>

      @if (loading()) {
        <p class="muted" aria-live="polite">Loading repository status…</p>
      }

      @if (status(); as currentStatus) {
        @if (currentStatus.dirtyFiles.length > 0) {
          <aside class="warning" role="status">
            <strong>Dirty files remain outside milestone staging.</strong>
            <ul>
              @for (file of currentStatus.dirtyFiles; track file) {
                <li><code>{{ file }}</code></li>
              }
            </ul>
          </aside>
        }

        @if (currentStatus.workspace; as workspace) {
          <dl class="workspace">
            <div>
              <dt>Branch</dt>
              <dd><code>{{ workspace.branch }}</code></dd>
            </div>
            <div>
              <dt>Worktree</dt>
              <dd><code>{{ workspace.worktreePath }}</code></dd>
            </div>
          </dl>

          <button
            type="button"
            class="secondary"
            [disabled]="loading()"
            (click)="refresh()"
          >
            Refresh milestones
          </button>

          <div class="pending-list">
            @for (milestone of milestones(); track milestone.id) {
              <article
                class="pending"
                [attr.data-milestone-id]="milestone.id"
              >
                <header>
                  <div>
                    <p class="kind">{{ milestone.kind }}</p>
                    <h3>Pending milestone</h3>
                  </div>
                  <span>{{ milestone.files.length }} files</span>
                </header>

                <p class="commit-message">
                  <code>{{ milestone.commitMessage }}</code>
                </p>
                <ul class="files">
                  @for (file of milestone.files; track file) {
                    <li><code>{{ file }}</code></li>
                  }
                </ul>
                <pre class="diff">{{ milestone.diffSummary }}</pre>

                @if (milestone.reconciliationRequired) {
                  <p class="reconciliation" role="status">
                    Reconciliation is required after this decision. It is not
                    launched or applied automatically.
                  </p>
                }

                <label class="confirmation">
                  <input
                    type="checkbox"
                    [checked]="isConfirmed(milestone.id)"
                    [disabled]="committingId() === milestone.id"
                    (change)="setConfirmed(milestone.id, $event)"
                  />
                  Confirm this exact file list and immutable commit message
                </label>
                <button
                  type="button"
                  [disabled]="
                    !isConfirmed(milestone.id)
                    || committingId() === milestone.id
                  "
                  (click)="commit(milestone)"
                >
                  Commit milestone
                </button>
              </article>
            } @empty {
              <p class="muted">No pending repository milestones.</p>
            }
          </div>
        } @else {
          <section class="workspace-choice">
            <p class="blocking">
              Repository work is blocked until you choose where this episode
              lives.
            </p>

            <article>
              <h3>Recommended new branch</h3>
              <p>
                Start from
                <code>{{ currentStatus.recommendation.defaultBranch }}</code>
                in a managed worktree.
              </p>
              <label>
                Editable task name
                <input
                  type="text"
                  aria-label="Milestone task name"
                  [value]="taskName()"
                  (input)="setTaskName($event)"
                />
              </label>
              <p class="preview">
                {{ recommendedBranch(currentStatus) }}
              </p>
              <button
                type="button"
                [disabled]="loading() || !validTaskName()"
                (click)="chooseRecommended()"
              >
                Use recommended branch
              </button>
            </article>

            <article>
              <h3>Use current branch</h3>
              <p>
                Record the exact current checkout. This is never selected
                implicitly.
              </p>
              <label class="confirmation">
                <input
                  type="checkbox"
                  [checked]="currentBranchConfirmed()"
                  [disabled]="loading()"
                  (change)="setCurrentBranchConfirmed($event)"
                />
                I explicitly choose the current branch
              </label>
              <button
                type="button"
                class="secondary"
                [disabled]="loading() || !currentBranchConfirmed()"
                (click)="chooseCurrent()"
              >
                Use current branch
              </button>
            </article>
          </section>
        }
      }

      @if (actionError(); as error) {
        <p class="error" role="alert">{{ error }}</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .milestone-panel {
      display: grid;
      gap: 0.8rem;
      margin-bottom: 1.25rem;
      border: 1px solid var(--whp-line);
      background: var(--whp-surface);
      padding: 1rem;
    }

    header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 1rem;
    }

    h2,
    h3,
    p,
    pre,
    dl {
      margin: 0;
    }

    h2 {
      color: var(--whp-ink);
      font-size: 1rem;
    }

    h3 {
      color: var(--whp-ink);
      font-size: 0.82rem;
    }

    .eyebrow,
    .kind {
      color: var(--whp-muted-soft);
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .branch,
    .pending header > span {
      color: var(--whp-muted);
      font-size: 0.68rem;
    }

    .warning,
    .reconciliation,
    .error,
    .blocking {
      border-left: 3px solid var(--whp-warning);
      background: var(--whp-warning-tint);
      padding: 0.65rem;
      color: var(--whp-warning);
      font-size: 0.73rem;
      line-height: 1.45;
    }

    .warning ul,
    .files {
      margin: 0.4rem 0 0;
      padding-left: 1.2rem;
    }

    .workspace {
      display: grid;
      gap: 0.45rem;
      font-size: 0.72rem;
    }

    .workspace div {
      display: grid;
      grid-template-columns: 5rem minmax(0, 1fr);
      gap: 0.5rem;
    }

    dt {
      color: var(--whp-muted);
      font-weight: 800;
    }

    dd {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
    }

    .workspace-choice,
    .pending-list {
      display: grid;
      gap: 0.7rem;
    }

    .workspace-choice article,
    .pending {
      display: grid;
      gap: 0.6rem;
      border: 1px solid var(--whp-line);
      padding: 0.75rem;
    }

    .workspace-choice article > p,
    .muted,
    .preview {
      color: var(--whp-muted);
      font-size: 0.72rem;
      line-height: 1.45;
    }

    label {
      display: grid;
      gap: 0.3rem;
      color: var(--whp-muted);
      font-size: 0.7rem;
      font-weight: 750;
    }

    label input[type='text'] {
      border: 1px solid var(--whp-line-strong);
      background: var(--whp-ground);
      padding: 0.45rem;
      color: var(--whp-ink);
      font: inherit;
    }

    .confirmation {
      display: flex;
      align-items: start;
      gap: 0.45rem;
      font-weight: 650;
    }

    button {
      justify-self: start;
      border: 1px solid var(--whp-accent);
      background: var(--whp-accent);
      padding: 0.48rem 0.72rem;
      color: var(--whp-ground);
      cursor: pointer;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 800;
    }

    button.secondary {
      border-color: var(--whp-line-strong);
      background: var(--whp-surface);
      color: var(--whp-ink);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.42;
    }

    .commit-message {
      border: 1px solid var(--whp-line);
      background: var(--whp-ground);
      padding: 0.55rem;
      color: var(--whp-ink);
      font-size: 0.72rem;
    }

    .files {
      color: var(--whp-ink);
      font-size: 0.7rem;
    }

    .diff {
      max-height: 10rem;
      overflow: auto;
      border: 1px solid var(--whp-line);
      background: var(--whp-ground);
      padding: 0.55rem;
      color: var(--whp-muted);
      font-family: var(--whp-font-mono);
      font-size: 0.68rem;
      white-space: pre-wrap;
    }

    .reconciliation {
      border-left-color: var(--whp-accent);
      background: var(--whp-accent-tint);
      color: var(--whp-accent);
    }

    .error {
      border-left-color: var(--whp-accent);
      background: var(--whp-accent-tint);
      color: var(--whp-accent);
    }

    code {
      font-family: var(--whp-font-mono);
    }

    input:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--whp-accent);
      outline-offset: 2px;
    }
  `,
})
export class MilestonePanel implements OnInit, OnChanges {
  readonly draft = input.required<DraftRecord>();
  readonly client = input.required<DaemonClient>();

  protected readonly status = signal<MilestoneStatus | null>(null);
  protected readonly milestones = signal<PendingMilestone[]>([]);
  protected readonly loading = signal(false);
  protected readonly committingId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly taskName = signal('');
  protected readonly currentBranchConfirmed = signal(false);
  private readonly confirmedIds = signal<ReadonlySet<string>>(new Set());
  private initialized = false;
  private draftGeneration = 0;
  private refreshSequence = 0;

  ngOnInit(): void {
    this.initialized = true;
    void this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized || !changes['draft']) return;
    this.resetForDraft();
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    const draftId = this.draft().id;
    const generation = this.draftGeneration;
    const requestId = ++this.refreshSequence;
    this.loading.set(true);
    this.actionError.set(null);
    try {
      const status = await this.client().getMilestoneStatus(draftId);
      if (!this.isCurrentRequest(draftId, generation, requestId)) return;
      this.status.set(status);
      if (this.taskName() === '') {
        this.taskName.set(status.recommendation.taskName);
      }
      if (status.workspace) {
        const response = await this.client().listPendingMilestones(
          draftId,
        );
        if (!this.isCurrentRequest(draftId, generation, requestId)) return;
        this.milestones.set(response.milestones);
        const pendingIds = new Set(response.milestones.map(({ id }) => id));
        this.confirmedIds.update((confirmed) =>
          new Set([...confirmed].filter((id) => pendingIds.has(id))));
      } else {
        this.milestones.set([]);
      }
    } catch (error) {
      if (this.isCurrentRequest(draftId, generation, requestId)) {
        this.actionError.set(errorMessage(error));
      }
    } finally {
      if (this.isCurrentRequest(draftId, generation, requestId)) {
        this.loading.set(false);
      }
    }
  }

  protected setTaskName(event: Event): void {
    this.taskName.set((event.target as HTMLInputElement).value);
  }

  protected setCurrentBranchConfirmed(event: Event): void {
    this.currentBranchConfirmed.set(
      (event.target as HTMLInputElement).checked,
    );
  }

  protected async chooseRecommended(): Promise<void> {
    const taskName = this.taskName().trim();
    if (this.loading() || taskName === '') return;
    const draftId = this.draft().id;
    const generation = this.draftGeneration;
    this.loading.set(true);
    this.actionError.set(null);
    try {
      await this.client().chooseMilestoneWorkspace(draftId, {
        choice: 'new-branch',
        taskName,
      });
      if (this.isCurrentDraft(draftId, generation)) await this.refresh();
    } catch (error) {
      if (this.isCurrentDraft(draftId, generation)) {
        this.actionError.set(errorMessage(error));
        this.loading.set(false);
      }
    }
  }

  protected async chooseCurrent(): Promise<void> {
    if (this.loading() || !this.currentBranchConfirmed()) return;
    const draftId = this.draft().id;
    const generation = this.draftGeneration;
    this.loading.set(true);
    this.actionError.set(null);
    try {
      await this.client().chooseMilestoneWorkspace(draftId, {
        choice: 'current-branch',
        confirmed: true,
      });
      if (this.isCurrentDraft(draftId, generation)) await this.refresh();
    } catch (error) {
      if (this.isCurrentDraft(draftId, generation)) {
        this.actionError.set(errorMessage(error));
        this.loading.set(false);
      }
    }
  }

  protected recommendedBranch(status: MilestoneStatus): string {
    const taskName = this.taskName().trim();
    const slug = milestoneTaskSlug(taskName);
    if (!slug) return 'Invalid task name';
    return taskName === status.recommendation.taskName
      ? status.recommendation.branch
      : `episode/${slug}`;
  }

  protected validTaskName(): boolean {
    return milestoneTaskSlug(this.taskName()) !== null;
  }

  protected isConfirmed(id: string): boolean {
    return this.confirmedIds().has(id);
  }

  protected setConfirmed(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.confirmedIds.update((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected async commit(milestone: PendingMilestone): Promise<void> {
    if (!this.isConfirmed(milestone.id) || this.committingId()) return;
    const draftId = this.draft().id;
    const generation = this.draftGeneration;
    this.committingId.set(milestone.id);
    this.actionError.set(null);
    try {
      await this.client().commitMilestone(
        draftId,
        milestone.kind,
        {
          pendingMilestoneId: milestone.id,
          confirmed: true,
        },
      );
      if (this.isCurrentDraft(draftId, generation)) await this.refresh();
    } catch (error) {
      if (this.isCurrentDraft(draftId, generation)) {
        this.actionError.set(errorMessage(error));
      }
    } finally {
      if (this.isCurrentDraft(draftId, generation)) {
        this.committingId.set(null);
      }
    }
  }

  private resetForDraft(): void {
    this.draftGeneration += 1;
    this.refreshSequence += 1;
    this.status.set(null);
    this.milestones.set([]);
    this.loading.set(false);
    this.committingId.set(null);
    this.actionError.set(null);
    this.taskName.set('');
    this.currentBranchConfirmed.set(false);
    this.confirmedIds.set(new Set());
  }

  private isCurrentDraft(
    draftId: string,
    generation: number,
  ): boolean {
    return this.draftGeneration === generation
      && this.draft().id === draftId;
  }

  private isCurrentRequest(
    draftId: string,
    generation: number,
    requestId: number,
  ): boolean {
    return this.refreshSequence === requestId
      && this.isCurrentDraft(draftId, generation);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function milestoneTaskSlug(value: string): string | null {
  if (value.trim() === '' || /[./\\\0]/u.test(value)) return null;
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return /^[a-z0-9][a-z0-9_-]*$/u.test(slug) ? slug : null;
}
