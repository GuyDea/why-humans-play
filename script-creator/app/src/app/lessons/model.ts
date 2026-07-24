import { computed, signal } from '@angular/core';
import {
  DaemonClientError,
  type DecisionPage,
  type DistillationRunRecord,
  type DraftSummary,
  type LearningSessionRecord,
  type LessonDetail,
  type LessonReconciliation,
} from '../api/client';

export interface LessonsClient {
  list(): Promise<DraftSummary[]>;
  listLearningSessions(
    draftId: string,
  ): Promise<{ sessions: LearningSessionRecord[] }>;
  listDecisions(draftId: string): Promise<DecisionPage>;
  listLessons(draftId: string): Promise<{ lessons: LessonDetail[] }>;
  distill(
    draftId: string,
    trigger: 'on-demand' | 'session-end',
  ): Promise<DistillationRunRecord>;
  reconcileDistillation(runId: string): Promise<DistillationRunRecord>;
  editLesson(
    draftId: string,
    lessonId: string,
    expectedVersion: number,
    reviewedMarkdown: string,
  ): Promise<LessonDetail>;
  approveLesson(
    draftId: string,
    lessonId: string,
    expectedVersion: number,
  ): Promise<LessonDetail>;
  rejectLesson(
    draftId: string,
    lessonId: string,
    expectedVersion: number,
  ): Promise<LessonDetail>;
  retireLesson(
    draftId: string,
    lessonId: string,
    expectedVersion: number,
  ): Promise<LessonDetail>;
  supersedeLesson(
    draftId: string,
    lessonId: string,
    expectedVersion: number,
    predecessorLessonId: string,
  ): Promise<LessonDetail>;
  markLessonReconciliationAwaiting(
    resumeKey: string,
  ): Promise<LessonReconciliation>;
  verifyLessonReconciliation(
    resumeKey: string,
    commit: string,
  ): Promise<LessonDetail>;
}

const TERMINAL_DISTILLATION = new Set([
  'ingested',
  'no-op',
  'failed',
  'cancelled',
  'interrupted',
]);

export class LessonsModel {
  readonly drafts = signal<readonly DraftSummary[]>([]);
  readonly selectedDraftId = signal<string | null>(null);
  readonly sessions = signal<readonly LearningSessionRecord[]>([]);
  readonly decisions = signal<readonly DecisionPage['decisions'][number][]>([]);
  readonly lessons = signal<readonly LessonDetail[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly announcement = signal('Select a draft to review learning.');
  readonly distillation = signal<DistillationRunRecord | null>(null);
  readonly selectedDraft = computed(() =>
    this.drafts().find(({ id }) => id === this.selectedDraftId()) ?? null);
  readonly distillationActive = computed(() => {
    const run = this.distillation();
    return run !== null && !TERMINAL_DISTILLATION.has(run.state);
  });
  readonly distillationStatus = computed(() => {
    const run = this.distillation();
    if (!run) return 'No distillation is running.';
    if (run.state === 'no-op') {
      return 'No decisions in this session window; nothing was launched.';
    }
    if (run.state === 'ingested') {
      return 'Distillation ingested. Review the proposed lessons below.';
    }
    return `Distillation ${run.state}${
      run.operationId ? ` · operation ${run.operationId}` : ''
    }.`;
  });

  private loadGeneration = 0;

  constructor(private readonly client: LessonsClient) {}

  async initialize(): Promise<void> {
    this.loading.set(true);
    try {
      const drafts = await this.client.list();
      this.drafts.set(drafts);
      if (drafts.length > 0) {
        await this.selectDraft(drafts[0]!.id);
      } else {
        this.announcement.set('No drafts are available.');
      }
    } catch (error) {
      this.setError(error, 'Unable to load drafts.');
    } finally {
      this.loading.set(false);
    }
  }

  async selectDraft(draftId: string): Promise<void> {
    const generation = ++this.loadGeneration;
    this.selectedDraftId.set(draftId);
    this.loading.set(true);
    this.error.set(null);
    try {
      const [sessionResponse, decisionPage, lessonResponse] =
        await Promise.all([
          this.client.listLearningSessions(draftId),
          this.client.listDecisions(draftId),
          this.client.listLessons(draftId),
        ]);
      if (generation !== this.loadGeneration) return;
      this.sessions.set(sessionResponse.sessions);
      this.decisions.set(decisionPage.decisions);
      this.lessons.set(lessonResponse.lessons);
      this.announcement.set(
        `Loaded ${lessonResponse.lessons.length} lesson records.`,
      );
    } catch (error) {
      if (generation === this.loadGeneration) {
        this.setError(error, 'Unable to load the learning workspace.');
      }
    } finally {
      if (generation === this.loadGeneration) this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    const draftId = this.requireDraft();
    await this.selectDraft(draftId);
  }

  async distill(trigger: 'on-demand' | 'session-end'): Promise<void> {
    const draftId = this.requireDraft();
    this.busy.set(true);
    this.error.set(null);
    this.announcement.set(
      trigger === 'on-demand'
        ? 'Starting Distill now…'
        : 'Ending the session and starting distillation…',
    );
    try {
      const run = await this.client.distill(draftId, trigger);
      this.distillation.set(run);
      this.announcement.set(this.distillationStatus());
      if (TERMINAL_DISTILLATION.has(run.state)) {
        await this.refresh();
        this.announcement.set(this.distillationStatus());
      }
    } catch (error) {
      this.setError(error, 'Distillation could not start.');
    } finally {
      this.busy.set(false);
    }
  }

  async pollDistillation(): Promise<void> {
    const run = this.distillation();
    if (!run || TERMINAL_DISTILLATION.has(run.state)) return;
    try {
      const current = await this.client.reconcileDistillation(run.id);
      this.distillation.set(current);
      this.announcement.set(this.distillationStatus());
      if (TERMINAL_DISTILLATION.has(current.state)) {
        await this.refresh();
        this.announcement.set(this.distillationStatus());
      }
    } catch (error) {
      this.setError(error, 'Distillation status could not be refreshed.');
    }
  }

  async editLesson(
    lesson: LessonDetail,
    reviewedMarkdown: string,
  ): Promise<void> {
    await this.mutateLesson(
      () => this.client.editLesson(
        lesson.draftId,
        lesson.id,
        lesson.version,
        reviewedMarkdown,
      ),
      'Lesson text saved. It is still awaiting explicit approval.',
    );
  }

  async approveLesson(lesson: LessonDetail): Promise<void> {
    await this.mutateLesson(
      () => this.client.approveLesson(
        lesson.draftId,
        lesson.id,
        lesson.version,
      ),
      lesson.classification === 'episode-local'
        ? 'Episode lesson approved and active.'
        : 'Durable proposal approved. Reconciliation is still external.',
    );
  }

  async rejectLesson(lesson: LessonDetail): Promise<void> {
    await this.mutateLesson(
      () => this.client.rejectLesson(
        lesson.draftId,
        lesson.id,
        lesson.version,
      ),
      'Lesson rejected.',
    );
  }

  async retireLesson(lesson: LessonDetail): Promise<void> {
    await this.mutateLesson(
      () => this.client.retireLesson(
        lesson.draftId,
        lesson.id,
        lesson.version,
      ),
      lesson.classification === 'episode-local'
        ? 'Episode lesson retired and removed from future envelopes.'
        : 'Durable retirement prepared; repository doctrine is unchanged.',
    );
  }

  async supersedeLesson(
    lesson: LessonDetail,
    predecessorLessonId: string,
  ): Promise<void> {
    await this.mutateLesson(
      () => this.client.supersedeLesson(
        lesson.draftId,
        lesson.id,
        lesson.version,
        predecessorLessonId,
      ),
      lesson.classification === 'episode-local'
        ? 'Replacement approved and predecessor superseded.'
        : 'Durable supersession prepared; repository doctrine is unchanged.',
    );
  }

  async markAwaiting(lesson: LessonDetail): Promise<void> {
    const reconciliation = lesson.reconciliation;
    if (!reconciliation) return;
    this.busy.set(true);
    try {
      await this.client.markLessonReconciliationAwaiting(
        reconciliation.resumeKey,
      );
      await this.refreshLessons();
      this.announcement.set(
        'Handoff marked awaiting reconciliation. The repository is unchanged.',
      );
    } catch (error) {
      this.setError(error, 'Unable to update the reconciliation handoff.');
    } finally {
      this.busy.set(false);
    }
  }

  async verifyReconciliation(
    lesson: LessonDetail,
    commit: string,
  ): Promise<void> {
    const reconciliation = lesson.reconciliation;
    if (!reconciliation) return;
    await this.mutateLesson(
      () => this.client.verifyLessonReconciliation(
        reconciliation.resumeKey,
        commit,
      ),
      'External reconciliation commit verified.',
    );
  }

  clearError(): void {
    this.error.set(null);
  }

  private async mutateLesson(
    mutation: () => Promise<LessonDetail>,
    success: string,
  ): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.replaceLesson(await mutation());
      this.announcement.set(success);
    } catch (error) {
      if (
        error instanceof DaemonClientError
        && error.status === 409
        && !isReconciliationVerificationRefusal(error.body)
      ) {
        await this.refreshLessons().catch(() => undefined);
        this.error.set(
          'This lesson changed elsewhere. The latest version is shown; review it before trying again.',
        );
      } else {
        this.setError(error, 'The lesson action failed.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  private async refreshLessons(): Promise<void> {
    const response = await this.client.listLessons(this.requireDraft());
    this.lessons.set(response.lessons);
  }

  private replaceLesson(updated: LessonDetail): void {
    this.lessons.update((lessons) =>
      lessons.map((lesson) => lesson.id === updated.id ? updated : lesson));
  }

  private requireDraft(): string {
    const draftId = this.selectedDraftId();
    if (!draftId) throw new Error('Select a draft first.');
    return draftId;
  }

  private setError(error: unknown, fallback: string): void {
    this.error.set(error instanceof Error ? error.message : fallback);
    this.announcement.set(this.error() ?? fallback);
  }
}

function isReconciliationVerificationRefusal(body: unknown): boolean {
  return Boolean(
    body
    && typeof body === 'object'
    && (body as { code?: unknown }).code
      === 'reconciliation-verification-refused'
    && (body as { recoverable?: unknown }).recoverable === true,
  );
}
