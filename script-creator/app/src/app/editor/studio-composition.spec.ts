import '@angular/compiler';
import {
  createComponent,
  getDebugNode,
  provideZonelessChangeDetection,
  ɵgetComponentDef,
  ɵresolveComponentResources,
  ɵɵviewQuerySignal,
  type ApplicationRef,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import {
  provideRouter,
  Router,
} from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  exportMarkdown,
  parseMarkdown,
  schema,
} from '@whp/script-creator-editor-core';
import { DaemonClientError } from '../api/client';
import type {
  ArchitectureActionResult,
  ArchitectureSection,
  ArchitectureState,
  DaemonClient,
  DraftDocument,
  DraftRecord,
  DistillationRunRecord,
  EpisodeWorkspace,
  LearningDecision,
  LearningSessionRecord,
  LessonDetail,
  LessonReconciliation,
  MilestoneKind,
  MilestoneStatus,
  OperationName,
  OperationRecord,
  OperationResult,
  OperationSummary,
  PendingMilestone,
  RevisionRecord,
  SavedDraft,
  StreamEventsOptions,
} from '../api/client';
import {
  ARCHITECTURE_SECTIONS,
  joinArchitecture,
} from '../architecture/model';
import { ArchitecturePanel } from '../architecture/architecture-panel';
import { NarrationActions } from '../narration/narration-actions';
import { MilestonePanel } from '../milestones/milestone-panel';
import { ProductionPanel } from '../production/production-panel';
import { App } from '../app';
import { routes } from '../app.routes';
import appTemplate from '../app.html?raw';
import appStyles from '../app.scss?raw';
import {
  DebouncedAutosave,
  EditorHost,
} from './editor-host';
import { DraftManagerComponent } from '../drafts/draft-manager.component';
import { BriefPanel } from '../panels/brief-panel';
import { FindingsPanel } from '../panels/findings-panel';
import { ParkingLot } from '../panels/parking-lot';
import { RevisionTimeline } from '../drafts/revision-timeline';
import { DraftTransfer } from '../drafts/draft-transfer';
import { AgentConsole } from '../panels/agent-console';
import { LessonsPanel } from '../lessons/lessons-panel';
import {
  STUDIO_SESSION,
  StudioSession,
} from '../studio-session';

interface ControlledOutcome {
  operation: OperationRecord;
  result: OperationResult;
}

interface ControlledPromotion {
  draftId: string;
  operationId: string;
  state:
    | 'running'
    | 'output-ready'
    | 'validation-required'
    | 'complete'
    | 'failed';
  targetPath: string;
  targetHash: string | null;
  validationHash: string | null;
  error: string | null;
}

class ControllableDaemonClient {
  private sequence = 0;
  private revisionSequence = 0;
  private milestoneSequence = 0;
  private readonly revisionHistory: RevisionRecord[] = [];
  private readonly finishes = new Map<string, () => void>();
  private readonly outcomes = new Map<string, ControlledOutcome>();
  readonly submissions: Array<{
    id: string;
    operation: OperationName;
    inputs: unknown;
  }> = [];
  readonly draftSubmissions: Array<{
    draftId: string;
    id: string;
    operation: OperationName;
    inputs: unknown;
    approvedArchitectureMd: string | null;
  }> = [];
  readonly canonicalArchitectureWrites: string[] = [];
  readonly pipelineMilestones: string[] = [];
  readonly milestoneCommitRequests: Array<{
    draftId: string;
    kind: MilestoneKind;
    input: { pendingMilestoneId: string; confirmed: true };
  }> = [];
  milestoneWorkspace: EpisodeWorkspace | null;
  milestoneDirtyFiles: string[] = [];
  pendingMilestones: PendingMilestone[] = [];
  failNextMilestoneCommit = false;
  pauseNextArchitectureApproval = false;
  pauseNextArchitectureMilestone = false;
  pauseNextArchitectureReopen = false;
  readonly architectureSagaResumes: string[] = [];
  readonly narrationApprovals: Array<{
    draftId: string;
    expectedRevisionSeq: number;
    settledExportToken: string;
  }> = [];
  readonly narrationSettledExports: Array<{
    draftId: string;
    expectedRevisionSeq: number;
    expectedNarrationMd: string;
  }> = [];
  readonly productionSyncs: Array<{
    draftId: string;
    expectedRevisionSeq: number;
  }> = [];
  readonly narrationProposalResolutions: Array<{
    draftId: string;
    operationId: string;
    decision: 'accepted' | 'rejected';
    reason?: string | null;
  }> = [];
  readonly narrationReconciliations: Array<{
    draftId: string;
    expectedRevisionSeq: number;
    confirmed: true;
  }> = [];
  pendingNarrationProposals: Array<{
    draftId: string;
    operationId: string;
    state: 'pending';
    createdAt: string;
    resolvedAt: null;
    acceptedRevisionPresent: boolean;
  }> = [];
  promotion: ControlledPromotion | null = null;
  validatorResults: Array<{
    ok: boolean;
    errors: Array<{ message: string; line: number | null }>;
    path: string;
    hash: string;
  }> = [];
  architectureState: ArchitectureState = {
    sections: [],
    approvedMd: null,
    approvedAt: null,
    revisionSeq: 0,
    narrationReconciliationRequired: false,
    pendingSaga: null,
  };
  learningSessions: LearningSessionRecord[] = [{
    id: 'session-1',
    draftId: 'draft-1',
    startCursor: 0,
    endCursor: null,
    createdAt: '2026-07-24T09:00:00.000Z',
    closedAt: null,
  }];
  learningDecisions: LearningDecision[] = [];
  learningLessons: LessonDetail[] = [];
  lastDistillation: DistillationRunRecord | null = null;

  constructor(readonly storedDraft: DraftRecord) {
    this.learningSessions[0]!.draftId = storedDraft.id;
    this.learningDecisions = [learningDecisionFixture(storedDraft.id)];
    this.milestoneWorkspace = {
      draftId: storedDraft.id,
      episodeSlug: storedDraft.episodeSlug,
      choice: 'new-branch',
      branch: `episode/${storedDraft.episodeSlug}`,
      worktreePath: `/tmp/script-creator-worktrees/${
        storedDraft.episodeSlug
      }`,
      baseBranch: 'main',
      createdAt: '2026-07-24T11:00:00.000Z',
      updatedAt: '2026-07-24T11:00:00.000Z',
    };
  }

  readonly list = vi.fn(async () => [draftSummary(this.storedDraft)]);
  readonly get = vi.fn(async (_id: string) => this.storedDraft);
  readonly listRevisions = vi.fn(async () =>
    this.revisionHistory.map((revision) => ({ ...revision })));
  readonly create = vi.fn(async () => this.storedDraft);
  readonly import = vi.fn(async () => this.storedDraft);
  readonly export = vi.fn(async () => ({ markdown: '# Exported' }));
  readonly writeArtifact = vi.fn(async () => ({
    conflict: false as const,
    hash: 'artifact-hash',
  }));
  readonly validate = vi.fn(async () => ({ ok: true, errors: [] }));
  readonly listLearningSessions = vi.fn(async () => ({
    sessions: this.learningSessions.map((session) => ({ ...session })),
  }));
  readonly listDecisions = vi.fn(async () => ({
    decisions: this.learningDecisions.map((decision) => ({
      ...decision,
      context: {
        ...decision.context,
        source: { ...decision.context.source },
      },
    })),
    nextCursor: null,
  }));
  readonly listLessons = vi.fn(async () => ({
    lessons: this.learningLessons.map(cloneLesson),
  }));
  readonly distill = vi.fn(async (
    draftId: string,
    trigger: 'on-demand' | 'session-end',
  ): Promise<DistillationRunRecord> => {
    if (trigger === 'session-end') {
      this.learningSessions[0] = {
        ...this.learningSessions[0]!,
        endCursor: 1,
        closedAt: '2026-07-24T10:05:00.000Z',
      };
    }
    this.learningLessons = learningLessonFixtures(draftId);
    this.lastDistillation = {
      id: 'distillation-1',
      draftId,
      sessionId: 'session-1',
      trigger,
      state: 'ingested',
      operationId: 'distill-op-1',
      resumeKey: 'opaque-distillation-key',
      guardrailMarkdown: 'One candidate remains deliberately narrow.',
      error: null,
      createdAt: '2026-07-24T10:05:00.000Z',
      updatedAt: '2026-07-24T10:05:01.000Z',
      decisions: [{
        decisionId: 'decision-1',
        snapshot: learningDecisionFixture(draftId),
      }],
      lessons: [],
    };
    return { ...this.lastDistillation };
  });
  readonly reconcileDistillation = vi.fn(async () => {
    if (!this.lastDistillation) throw new Error('distillation missing');
    return { ...this.lastDistillation };
  });
  readonly editLesson = vi.fn(async (
    _draftId: string,
    lessonId: string,
    expectedVersion: number,
    reviewedMarkdown: string,
  ) => this.updateLearningLesson(lessonId, expectedVersion, (lesson) => ({
    ...lesson,
    reviewedMarkdown,
    version: lesson.version + 1,
  })));
  readonly approveLesson = vi.fn(async (
    _draftId: string,
    lessonId: string,
    expectedVersion: number,
  ) => this.updateLearningLesson(lessonId, expectedVersion, (lesson) => {
    if (lesson.classification === 'episode-local') {
      const approved = {
        ...lesson,
        state: 'approved' as const,
        version: lesson.version + 1,
      };
      const operation = completedOperation('lesson-context-op', {
        operation: 'review',
        inputs: {
          selection: 'A later review.',
          approved_lessons: [approved.reviewedMarkdown],
        },
        operationLessons: [{
          operationId: 'lesson-context-op',
          lessonId: approved.id,
          lessonVersion: approved.version,
          contentHash: 'local-reviewed-hash',
          createdAt: '2026-07-24T10:10:00.000Z',
        }],
      });
      if (!this.submissions.some(({ id }) => id === operation.id)) {
        this.submissions.push({
          id: operation.id,
          operation: operation.operation,
          inputs: operation.inputs,
        });
      }
      this.outcomes.set(operation.id, {
        operation,
        result: { kind: 'schema', value: {}, guardrail: null },
      });
      return approved;
    }
    return {
      ...lesson,
      state: 'approved-pending-reconcile' as const,
      version: lesson.version + 1,
      reconciliation: reconciliationFixture(lesson.id, 'apply'),
      reconciliationHistory: [reconciliationFixture(lesson.id, 'apply')],
    };
  }));
  readonly rejectLesson = vi.fn(async (
    _draftId: string,
    lessonId: string,
    expectedVersion: number,
  ) => this.updateLearningLesson(lessonId, expectedVersion, (lesson) => ({
    ...lesson,
    state: 'rejected' as const,
    version: lesson.version + 1,
  })));
  readonly retireLesson = vi.fn(async (
    _draftId: string,
    lessonId: string,
    expectedVersion: number,
  ) => this.updateLearningLesson(lessonId, expectedVersion, (lesson) => {
    if (lesson.classification === 'episode-local') {
      return {
        ...lesson,
        state: 'retired' as const,
        version: lesson.version + 1,
      };
    }
    const reconciliation = reconciliationFixture(lesson.id, 'retire');
    return {
      ...lesson,
      state: 'retirement-pending' as const,
      version: lesson.version + 1,
      reconciliation,
      reconciliationHistory: [
        ...lesson.reconciliationHistory,
        reconciliation,
      ],
    };
  }));
  readonly supersedeLesson = vi.fn(async (
    _draftId: string,
    lessonId: string,
    expectedVersion: number,
    predecessorLessonId: string,
  ) => this.updateLearningLesson(lessonId, expectedVersion, (lesson) => ({
    ...lesson,
    supersedesLessonId: predecessorLessonId,
    version: lesson.version + 1,
    state: lesson.classification === 'episode-local'
      ? 'approved' as const
      : 'approved-pending-reconcile' as const,
  })));
  readonly markLessonReconciliationAwaiting = vi.fn(async (
    resumeKey: string,
  ): Promise<LessonReconciliation> => {
    const lesson = this.learningLessons.find(
      (candidate) => candidate.reconciliation?.resumeKey === resumeKey,
    );
    if (!lesson?.reconciliation) throw new Error('reconciliation missing');
    lesson.reconciliation = {
      ...lesson.reconciliation,
      state: 'awaiting-reconciliation',
    };
    lesson.reconciliationHistory = lesson.reconciliationHistory.map(
      (record) => record.resumeKey === resumeKey
        ? { ...record, state: 'awaiting-reconciliation' }
        : record,
    );
    return { ...lesson.reconciliation };
  });
  readonly verifyLessonReconciliation = vi.fn(async (
    resumeKey: string,
    commit: string,
  ): Promise<LessonDetail> => {
    const lesson = this.learningLessons.find(
      (candidate) => candidate.reconciliation?.resumeKey === resumeKey,
    );
    if (!lesson?.reconciliation) throw new Error('reconciliation missing');
    const verified = {
      ...lesson.reconciliation,
      state: 'verified' as const,
      repositoryCommit: commit,
      paths: ['DECISIONS.md', '.agents/skills/writing-whp-youtube-scripts/SKILL.md'],
      anchors: ['## Review concrete reveals'],
      contentHashes: ['repository-content-hash'],
      verifiedAt: '2026-07-24T10:20:00.000Z',
    };
    const next: LessonDetail = lesson.state === 'retirement-pending'
      ? {
          ...lesson,
          state: 'retired',
          version: lesson.version + 1,
          reconciliation: verified,
          reconciliationHistory: [
            ...lesson.reconciliationHistory.slice(0, -1),
            verified,
          ],
        }
      : {
          ...lesson,
          state: 'applied',
          reviewedMarkdown: null,
          currentMarkdown: 'Repository rule: keep the reveal concrete.',
          repositoryCommit: commit,
          repositoryPath:
            '.agents/skills/writing-whp-youtube-scripts/SKILL.md',
          repositoryAnchor: '## Review concrete reveals',
          repositoryContentHash: 'repository-content-hash',
          repositoryProvenance: {
            status: 'resolved',
            lesson_markdown: 'Repository rule: keep the reveal concrete.',
            path: '.agents/skills/writing-whp-youtube-scripts/SKILL.md',
            anchor: '## Review concrete reveals',
            content_hash: 'repository-content-hash',
          },
          version: lesson.version + 1,
          reconciliation: verified,
          reconciliationHistory: [verified],
        };
    this.learningLessons = this.learningLessons.map((candidate) =>
      candidate.id === lesson.id ? next : candidate);
    return cloneLesson(next);
  });
  readonly prepareNarrationApproval = vi.fn(async (
    draftId: string,
    input: {
      expectedRevisionSeq: number;
      expectedNarrationMd: string;
    },
  ) => {
    this.narrationSettledExports.push({ draftId, ...input });
    if (input.expectedNarrationMd !== this.currentMarkdown()) {
      throw new Error('editor export mismatch');
    }
    return { settledExportToken: 'settled-export-token' };
  });
  readonly approveNarration = vi.fn(async (
    draftId: string,
    input: {
      expectedRevisionSeq: number;
      settledExportToken: string;
    },
  ) => {
    this.narrationApprovals.push({ draftId, ...input });
    const markdown = this.currentMarkdown();
    if (input.settledExportToken !== 'settled-export-token') {
      throw new Error('settled export token mismatch');
    }
    const record = this.storedDraft as DraftRecord & {
      approvedNarrationMd?: string | null;
      approvedNarrationAt?: string | null;
      approvedNarrationRevisionSeq?: number | null;
      narrationArtifactHash?: string | null;
    };
    record.approvedNarrationMd = markdown;
    record.approvedNarrationAt = '2026-07-24T13:00:00.000Z';
    const revision = this.appendRevision(
      'narration-approved',
      this.storedDraft.doc,
    );
    record.approvedNarrationRevisionSeq = revision.seq;
    record.narrationArtifactHash = 'narration-hash';
    setDraftPhase(this.storedDraft, 'creative-approved');
    this.recordPendingMilestone(
      'creative-narration-approval',
      [
        `whp-youtube/drafts/${this.storedDraft.episodeSlug}.md`,
        'whp-youtube/PIPELINE.md',
      ],
    );
    return this.storedDraft;
  });
  readonly resolveNarrationProposal = vi.fn(async (
    draftId: string,
    operationId: string,
    decision: 'accepted' | 'rejected',
    reason?: string | null,
  ) => {
    if (
      decision === 'accepted'
      && !this.revisionHistory.some(
        (revision) => revision.opId === operationId,
      )
    ) {
      throw new DaemonClientError(409, {
        error:
          'accepted narration proposal requires a persisted operation revision',
      });
    }
    this.narrationProposalResolutions.push({
      draftId,
      operationId,
      decision,
      ...(reason === undefined ? {} : { reason }),
    });
    this.pendingNarrationProposals =
      this.pendingNarrationProposals.filter(
        (proposal) => proposal.operationId !== operationId,
      );
    const submission = this.submissions.find(({ id }) => id === operationId);
    if (
      decision === 'accepted'
      && submission?.operation === 'generate-episode'
    ) {
      this.architectureState = {
        ...this.architectureState,
        narrationReconciliationRequired: false,
      };
    }
    return {
      draftId,
      operationId,
      state: decision,
    };
  });
  readonly markNarrationReconciled = vi.fn(async (
    draftId: string,
    input: { expectedRevisionSeq: number; confirmed: true },
  ) => {
    this.narrationReconciliations.push({ draftId, ...input });
    this.architectureState = {
      ...this.architectureState,
      narrationReconciliationRequired: false,
    };
    return cloneArchitectureState(this.architectureState);
  });
  readonly listNarrationProposals = vi.fn(async () => ({
    proposals: this.pendingNarrationProposals.map(
      (proposal) => ({ ...proposal }),
    ),
  }));
  readonly getPromotion = vi.fn(async () => ({
    promotion: this.promotion,
  }));
  readonly syncProduction = vi.fn(async (
    draftId: string,
    input: {
      expectedRevisionSeq: number;
    },
  ) => {
    this.productionSyncs.push({ draftId, ...input });
    if (!this.promotion) throw new Error('promotion missing');
    this.promotion = {
      ...this.promotion,
      state: 'validation-required',
      targetHash: 'production-hash',
      validationHash: null,
    };
    return this.promotion;
  });
  readonly validateDraft = vi.fn(async () =>
    this.validatorResults.shift() ?? {
      ok: true,
      errors: [],
      path: 'whp-youtube/episodes/01-composition-net.md',
      hash: 'production-hash',
    });
  readonly completePromote = vi.fn(async () => {
    if (!this.promotion) throw new Error('promotion missing');
    this.promotion = {
      ...this.promotion,
      state: 'complete',
      validationHash: 'production-hash',
    };
    setDraftPhase(this.storedDraft, 'production');
    this.pipelineMilestones.push('production');
    this.recordPendingMilestone(
      'production-promotion',
      [
        this.promotion.targetPath,
        'whp-youtube/PIPELINE.md',
      ],
    );
    return this.promotion;
  });

  readonly getMilestoneStatus = vi.fn(async (): Promise<MilestoneStatus> => ({
    workspace: this.milestoneWorkspace
      ? { ...this.milestoneWorkspace }
      : null,
    recommendation: {
      defaultBranch: 'main',
      taskName: this.storedDraft.episodeSlug,
      branch: `episode/${this.storedDraft.episodeSlug}`,
      worktreePath:
        `/tmp/script-creator-worktrees/${this.storedDraft.episodeSlug}`,
    },
    dirtyFiles: [...this.milestoneDirtyFiles],
  }));
  readonly chooseMilestoneWorkspace = vi.fn(async (
    draftId: string,
    input:
      | { choice: 'new-branch'; taskName: string }
      | { choice: 'current-branch'; confirmed: true },
  ): Promise<EpisodeWorkspace> => {
    this.milestoneWorkspace = input.choice === 'new-branch'
      ? {
        draftId,
        episodeSlug: this.storedDraft.episodeSlug,
        choice: input.choice,
        branch: `episode/${input.taskName}`,
        worktreePath: `/tmp/script-creator-worktrees/${input.taskName}`,
        baseBranch: 'main',
        createdAt: '2026-07-24T11:00:00.000Z',
        updatedAt: '2026-07-24T11:00:00.000Z',
      }
      : {
        draftId,
        episodeSlug: this.storedDraft.episodeSlug,
        choice: input.choice,
        branch: 'script-creator-plan6-architecture',
        worktreePath: '/tmp/current-repository',
        baseBranch: 'main',
        createdAt: '2026-07-24T11:00:00.000Z',
        updatedAt: '2026-07-24T11:00:00.000Z',
      };
    return { ...this.milestoneWorkspace };
  });
  readonly listPendingMilestones = vi.fn(async () => ({
    milestones: this.pendingMilestones.map((milestone) => ({
      ...milestone,
      files: [...milestone.files],
      sourceHashes: { ...milestone.sourceHashes },
    })),
  }));
  readonly commitMilestone = vi.fn(async (
    draftId: string,
    kind: MilestoneKind,
    input: { pendingMilestoneId: string; confirmed: true },
  ): Promise<PendingMilestone> => {
    this.milestoneCommitRequests.push({ draftId, kind, input });
    const pending = this.pendingMilestones.find(
      (milestone) =>
        milestone.id === input.pendingMilestoneId
        && milestone.kind === kind,
    );
    if (!pending) throw new Error('pending milestone missing');
    if (this.failNextMilestoneCommit) {
      this.failNextMilestoneCommit = false;
      throw new Error('simulated milestone commit failure');
    }
    this.pendingMilestones = this.pendingMilestones.filter(
      ({ id }) => id !== pending.id,
    );
    return {
      ...pending,
      state: 'committed',
      resultingCommitHash: 'milestone-commit-hash',
      updatedAt: '2026-07-24T14:00:00.000Z',
    };
  });

  readonly save = vi.fn(async (
    _id: string,
    input: {
      doc: DraftDocument;
      opId?: string | null;
      disposition?: string;
    },
  ): Promise<SavedDraft> => {
    this.storedDraft.doc = input.doc;
    const revision = this.appendRevision(
      input.disposition ?? 'edit',
      input.doc,
      input.opId ?? null,
    );
    return {
      draft: this.storedDraft,
      revision,
    };
  });

  readonly getArchitecture = vi.fn(async () =>
    cloneArchitectureState(this.architectureState));
  readonly saveArchitecture = vi.fn(async (
    _id: string,
    input: {
      expectedRevisionSeq: number;
      sections: ArchitectureSection[];
      opId: string | null;
      disposition: string;
    },
  ) => {
    if (input.expectedRevisionSeq !== this.architectureState.revisionSeq) {
      throw new DaemonClientError(409, {
        error: 'architecture revision conflict',
        current: cloneArchitectureState(this.architectureState),
      });
    }
    this.architectureState = {
      ...this.architectureState,
      sections: input.sections.map((section) => ({ ...section })),
      revisionSeq: this.architectureState.revisionSeq + 1,
    };
    return {
      state: cloneArchitectureState(this.architectureState),
      revision: {
        id: `architecture-revision-${this.architectureState.revisionSeq}`,
        draftId: this.storedDraft.id,
        seq: this.architectureState.revisionSeq,
        opId: input.opId,
        disposition: input.disposition,
        doc: {},
        createdAt: '2026-07-24T12:00:00.000Z',
      },
    };
  });
  readonly rejectArchitectureProposal = vi.fn(async (
    _draftId: string,
    _operationId: string,
    _reason: string | null,
  ) => ({ rejected: true as const }));
  readonly approveArchitecture = vi.fn(async (
    _id: string,
    input: { expectedRevisionSeq: number },
  ): Promise<ArchitectureActionResult> => {
    if (input.expectedRevisionSeq !== this.architectureState.revisionSeq) {
      throw new DaemonClientError(409, {
        error: 'architecture revision conflict',
        current: cloneArchitectureState(this.architectureState),
      });
    }
    this.architectureState = {
      ...this.architectureState,
      approvedMd: joinArchitecture(this.architectureState.sections),
      approvedAt: '2026-07-24T12:00:00.000Z',
      revisionSeq: this.architectureState.revisionSeq + 1,
      pendingSaga: (
        this.pauseNextArchitectureApproval
        || this.pauseNextArchitectureMilestone
      )
        ? {
            kind: 'approve',
            resumeKey: 'approval-resume-key',
            steps: {
              revisionAppended: 'completed',
              artifactWritten: 'pending',
              pipelineUpserted: 'pending',
              draftUpdated: 'pending',
            },
            createdAt: '2026-07-24T12:00:00.000Z',
            updatedAt: '2026-07-24T12:00:00.000Z',
          }
        : null,
    };
    if (this.pauseNextArchitectureApproval) {
      this.pauseNextArchitectureApproval = false;
      throw new DaemonClientError(409, {
        error: 'architecture artifact conflict',
        currentHash: 'pre-planted-conflict-hash',
        steps: this.architectureState.pendingSaga!.steps,
        state: cloneArchitectureState(this.architectureState),
      });
    }
    if (this.pauseNextArchitectureMilestone) {
      this.pauseNextArchitectureMilestone = false;
      this.architectureState.pendingSaga!.steps = {
        revisionAppended: 'completed',
        artifactWritten: 'completed',
        pipelineUpserted: 'completed',
        draftUpdated: 'pending',
      };
      throw new DaemonClientError(409, {
        error:
          'pending milestone source conflict for architecture-approval',
        recoverable: true,
        state: cloneArchitectureState(this.architectureState),
      });
    }
    setDraftPhase(this.storedDraft, 'rapid-prototype');
    this.canonicalArchitectureWrites.push(
      `whp-youtube/architectures/${this.storedDraft.episodeSlug}.md`,
    );
    this.pipelineMilestones.push('prototyping');
    this.recordPendingMilestone(
      'architecture-approval',
      [
        `whp-youtube/architectures/${this.storedDraft.episodeSlug}.md`,
        'whp-youtube/PIPELINE.md',
      ],
    );
    return completedArchitectureAction(this.architectureState);
  });
  readonly resumeArchitectureSaga = vi.fn(async (
    _id: string,
    input: { resumeKey: string },
  ): Promise<ArchitectureActionResult> => {
    const saga = this.architectureState.pendingSaga;
    if (input.resumeKey !== saga?.resumeKey) {
      throw new Error('architecture saga resume key mismatch');
    }
    this.architectureSagaResumes.push(input.resumeKey);
    this.architectureState = {
      ...this.architectureState,
      pendingSaga: null,
    };
    if (saga.kind === 'approve') {
      setDraftPhase(this.storedDraft, 'rapid-prototype');
      this.canonicalArchitectureWrites.push(
        `whp-youtube/architectures/${this.storedDraft.episodeSlug}.md`,
      );
      this.pipelineMilestones.push('prototyping');
      this.recordPendingMilestone(
        'architecture-approval',
        [
          `whp-youtube/architectures/${this.storedDraft.episodeSlug}.md`,
          'whp-youtube/PIPELINE.md',
        ],
      );
    } else {
      setDraftPhase(this.storedDraft, 'architecture');
      this.pipelineMilestones.push('architecture');
      this.recordPendingMilestone(
        'architecture-reopen',
        ['whp-youtube/PIPELINE.md'],
      );
    }
    return completedArchitectureAction(this.architectureState);
  });
  readonly reopenArchitecture = vi.fn(async (
    _id: string,
    input: { expectedRevisionSeq: number; confirmed: true },
  ): Promise<ArchitectureActionResult> => {
    if (
      input.confirmed !== true
      || input.expectedRevisionSeq !== this.architectureState.revisionSeq
    ) {
      throw new DaemonClientError(409, {
        error: 'architecture revision conflict',
        current: cloneArchitectureState(this.architectureState),
      });
    }
    this.architectureState = {
      ...this.architectureState,
      approvedMd: null,
      approvedAt: null,
      revisionSeq: this.architectureState.revisionSeq + 1,
      narrationReconciliationRequired: true,
      pendingSaga: this.pauseNextArchitectureReopen
        ? {
            kind: 'reopen',
            resumeKey: 'reopen-resume-key',
            steps: {
              revisionAppended: 'completed',
              artifactWritten: 'completed',
              pipelineUpserted: 'pending',
              draftUpdated: 'pending',
            },
            createdAt: '2026-07-24T12:00:00.000Z',
            updatedAt: '2026-07-24T12:00:00.000Z',
          }
        : null,
    };
    if (this.pauseNextArchitectureReopen) {
      this.pauseNextArchitectureReopen = false;
      throw new DaemonClientError(409, {
        error: 'architecture pipeline conflict',
        currentHash: 'pre-planted-pipeline-conflict-hash',
        steps: this.architectureState.pendingSaga!.steps,
        state: cloneArchitectureState(this.architectureState),
      });
    }
    setDraftPhase(this.storedDraft, 'architecture');
    this.pipelineMilestones.push('architecture');
    this.recordPendingMilestone(
      'architecture-reopen',
      ['whp-youtube/PIPELINE.md'],
    );
    return completedArchitectureAction(this.architectureState);
  });

  readonly submitOp = vi.fn(async (
    operation: OperationName,
    inputs: unknown,
  ) => {
    const id = `op-${++this.sequence}`;
    this.submissions.push({ id, operation, inputs });
    return { id };
  });
  readonly submitDraftOp = vi.fn(async (
    draftId: string,
    operation: OperationName,
    inputs: unknown,
  ) => {
    const result = await this.submitOp(operation, inputs);
    this.draftSubmissions.push({
      draftId,
      id: result.id,
      operation,
      inputs,
      approvedArchitectureMd: this.architectureState.approvedMd,
    });
    if (operation === 'promote') {
      const targetPath = (
        inputs as Record<string, unknown>
      )['target_path'] as string;
      this.promotion = {
        draftId,
        operationId: result.id,
        state: 'running',
        targetPath,
        targetHash: null,
        validationHash: null,
        error: null,
      };
    }
    return result;
  });
  readonly resumeDraftOp = vi.fn(async (
    draftId: string,
    operationId: string,
    inputs: unknown,
    _reason?: string | null,
  ) => this.submitDraftOp(
    draftId,
    this.submissions.find(({ id }) => id === operationId)?.operation
      ?? 'review-architecture',
    inputs,
  ));

  readonly streamEvents = vi.fn(async (
    id: string,
    options: StreamEventsOptions,
  ) => {
    await options.onEvent({
      id: '1',
      event: 'codex',
      data: JSON.stringify({
        type: 'item.completed',
        item: {
          type: 'agent_message',
          text: `Working on ${id}.`,
        },
      }),
    });
    await new Promise<void>((resolve) => {
      this.finishes.set(id, resolve);
    });
    await options.onDone();
  });

  readonly getOp = vi.fn(async (id: string) => {
    const outcome = this.outcomes.get(id);
    if (!outcome) throw new Error(`operation ${id} has not resolved`);
    return outcome.operation;
  });

  readonly getResult = vi.fn(async (id: string) => {
    const outcome = this.outcomes.get(id);
    if (!outcome) throw new Error(`operation ${id} has not resolved`);
    return outcome.result;
  });

  readonly cancel = vi.fn(async (id: string) => ({ id }));
  readonly resume = vi.fn(async () => ({ id: `op-${++this.sequence}` }));
  readonly listOps = vi.fn(async () => ({
    operations: this.submissions
      .map(({ id, operation }) =>
        operationSummary(
          this.outcomes.get(id)?.operation
          ?? completedOperation(id, {
            operation,
            state: 'running',
            finishedAt: null,
          }),
        ))
      .reverse(),
  }));

  resolve(
    id: string,
    result: OperationResult,
    overrides: Partial<OperationRecord> = {},
  ): void {
    const submission = this.submissions.find((item) => item.id === id);
    const finish = this.finishes.get(id);
    if (!submission || !finish) {
      throw new Error(`operation ${id} is not streaming`);
    }
    this.outcomes.set(id, {
      operation: completedOperation(id, {
        operation: submission.operation,
        ...overrides,
      }),
      result,
    });
    if (submission.operation === 'promote' && result.kind === 'raw') {
      const currentMetadata = this.storedDraft.doc['metadata'];
      this.storedDraft.doc = {
        ...parseProductionFixture(),
        metadata: currentMetadata,
      };
      this.promotion = this.promotion
        ? {
            ...this.promotion,
            state: 'validation-required',
            targetHash: 'production-hash',
          }
        : null;
      this.appendRevision(
        'production-import',
        this.storedDraft.doc,
        submission.id,
      );
    }
    finish();
  }

  private updateLearningLesson(
    lessonId: string,
    expectedVersion: number,
    update: (lesson: LessonDetail) => LessonDetail,
  ): LessonDetail {
    const lesson = this.learningLessons.find(({ id }) => id === lessonId);
    if (!lesson) throw new Error(`lesson missing: ${lessonId}`);
    if (lesson.version !== expectedVersion) {
      throw new DaemonClientError(409, {
        error: `lesson version conflict: ${lessonId}`,
      });
    }
    const updated = update(cloneLesson(lesson));
    this.learningLessons = this.learningLessons.map((candidate) =>
      candidate.id === lessonId ? updated : candidate);
    return cloneLesson(updated);
  }

  private currentMarkdown(): string {
    const result = exportMarkdown(schema.nodeFromJSON(this.storedDraft.doc));
    if (!result.ok) throw new Error('fixture export is unsettled');
    return result.markdown;
  }

  private appendRevision(
    disposition: string,
    doc: DraftDocument,
    opId: string | null = null,
  ): RevisionRecord {
    const seq = ++this.revisionSequence;
    const revision = {
      id: `revision-${seq}`,
      draftId: this.storedDraft.id,
      seq,
      opId,
      disposition,
      doc: structuredClone(doc),
      createdAt:
        `2026-07-23T12:00:${String(seq).padStart(2, '0')}.000Z`,
    };
    this.revisionHistory.push(revision);
    return revision;
  }

  private recordPendingMilestone(
    kind: MilestoneKind,
    files: string[],
  ): PendingMilestone {
    const existing = this.pendingMilestones.find((milestone) =>
      milestone.kind === kind
      && JSON.stringify(milestone.files) === JSON.stringify(files));
    if (existing) return existing;
    const id = `milestone-${++this.milestoneSequence}`;
    const timestamp = '2026-07-24T13:30:00.000Z';
    const labels: Record<MilestoneKind, string> = {
      'topic-selection': 'topic selection',
      'architecture-approval': 'architecture approval',
      'architecture-reopen': 'architecture reopen',
      'creative-narration-approval': 'creative narration approval',
      'production-promotion': 'production promotion',
    };
    const milestone: PendingMilestone = {
      id,
      draftId: this.storedDraft.id,
      episodeSlug: this.storedDraft.episodeSlug,
      kind,
      files: [...files],
      commitMessage:
        `feat(${this.storedDraft.episodeSlug}): record ${
          labels[kind]
        } milestone`,
      sourceHashes: Object.fromEntries(files.map((file) => [
        file,
        `hash-${file}`,
      ])),
      baseCommitHash: 'base-commit-hash',
      reconciliationRequired: true,
      state: 'pending',
      resultingCommitHash: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      diffSummary: files.map((file) => ` ${file} | 2 ++`).join('\n'),
    };
    this.pendingMilestones.push(milestone);
    return milestone;
  }
}

interface MountedStudio {
  application: ApplicationRef;
  component: ComponentRef<App>;
  root: HTMLElement;
  router: Router;
  client: ControllableDaemonClient;
  session: StudioSession;
  tick(): void;
  destroy(): void;
}

const mounted: MountedStudio[] = [];
let appResourcesResolved = false;
let signalInputsHydrated = false;

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => domRectList();
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => domRect();
}
globalThis.scrollBy = () => undefined;

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.destroy();
  document.body.replaceChildren();
  globalThis.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('mounted Script Studio composition', () => {
  it('refreshes milestone state when the routed active draft changes', async () => {
    const first = studioDraft();
    const second = studioDraft();
    second.id = 'draft-2';
    second.episodeSlug = 'second-episode';
    second.title = 'Second episode';
    second.updatedAt = '2026-07-22T12:00:00.000Z';
    const pendingByDraft = new Map([
      [first.id, pendingMilestoneFixture(
        first,
        'pending-first',
        'first milestone message',
      )],
      [second.id, pendingMilestoneFixture(
        second,
        'pending-second',
        'second milestone message',
      )],
    ]);
    const studio = await mountStudio(first, (client) => {
      client.list.mockImplementation(async () => [
        draftSummary(first),
        draftSummary(second),
      ]);
      client.get.mockImplementation(async (id: string) =>
        id === second.id ? second : first);
      client.getMilestoneStatus.mockImplementation(async (id: string) => ({
        workspace: {
          draftId: id,
          episodeSlug: id === second.id
            ? second.episodeSlug
            : first.episodeSlug,
          choice: 'new-branch',
          branch: `episode/${
            id === second.id ? second.episodeSlug : first.episodeSlug
          }`,
          worktreePath: `/tmp/script-creator-worktrees/${
            id === second.id ? second.episodeSlug : first.episodeSlug
          }`,
          baseBranch: 'main',
          createdAt: '2026-07-24T11:00:00.000Z',
          updatedAt: '2026-07-24T11:00:00.000Z',
        },
        recommendation: {
          defaultBranch: 'main',
          taskName: id === second.id
            ? second.episodeSlug
            : first.episodeSlug,
          branch: `episode/${
            id === second.id ? second.episodeSlug : first.episodeSlug
          }`,
          worktreePath: `/tmp/script-creator-worktrees/${
            id === second.id ? second.episodeSlug : first.episodeSlug
          }`,
        },
        dirtyFiles: [],
      }));
      client.listPendingMilestones.mockImplementation(async (id: string) => ({
        milestones: [pendingByDraft.get(id)!],
      }));
    });
    const milestonePanel = studio.root.querySelector(
      'app-milestone-panel',
    );
    await vi.waitFor(() => {
      studio.tick();
      expect(milestonePanel?.textContent).toContain(
        'first milestone message',
      );
    });

    const secondCard = Array.from(
      studio.root.querySelectorAll<HTMLButtonElement>('.draft-card'),
    ).find((card) => card.textContent?.includes('Second episode'));
    expect(secondCard).not.toBeUndefined();
    secondCard!.click();

    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.get).toHaveBeenCalledWith(second.id);
      expect(studio.client.listPendingMilestones).toHaveBeenCalledWith(
        second.id,
      );
      expect(milestonePanel?.textContent).toContain(
        'second milestone message',
      );
      expect(milestonePanel?.textContent).not.toContain(
        'first milestone message',
      );
    });
  });

  it('keeps complete-narration approval disabled while an editor save is pending', async () => {
    const studio = await mountStudio(productionDraft());
    const panel = studio.root.querySelector('app-production-panel')!;

    await replaceRenderedText(
      studio,
      'Opening narration.',
      'Unsaved opening narration.',
    );
    studio.tick();

    expect(findButton(panel, 'Approve complete narration').disabled).toBe(true);
    expect(studio.client.approveNarration).not.toHaveBeenCalled();
  });

  it('resumes an interrupted narration approval reservation from the routed controls', async () => {
    const draft = productionDraft();
    setDraftPhase(draft, 'rapid-prototype');
    const markdown = exportMarkdown(schema.nodeFromJSON(draft.doc));
    if (!markdown.ok) throw new Error('fixture export is unsettled');
    draft.approvedNarrationMd = markdown.markdown;
    draft.approvedNarrationAt = '2026-07-24T13:00:00.000Z';
    draft.approvedNarrationRevisionSeq = 0;
    const studio = await mountStudio(draft);
    const panel = studio.root.querySelector('app-production-panel')!;

    expect(findButton(panel, 'Approve complete narration').disabled)
      .toBe(false);
    findButton(panel, 'Approve complete narration').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.approveNarration).toHaveBeenCalledOnce();
      expect(readDraftPhase(studio.client.storedDraft))
        .toBe('creative-approved');
    });
  });

  it('automatically resumes persisted production synchronization and completion reservations', async () => {
    const targetPath =
      'whp-youtube/episodes/01-composition-net.md';
    const synchronization = await mountStudio(
      productionDraft(),
      (client) => {
        client.promotion = {
          draftId: client.storedDraft.id,
          operationId: 'promote-sync',
          state: 'output-ready',
          targetPath,
          targetHash: 'production-hash',
          validationHash: null,
          error: 'production synchronization in progress',
        };
      },
    );
    await vi.waitFor(() => {
      synchronization.tick();
      expect(synchronization.client.syncProduction).toHaveBeenCalledOnce();
      expect(synchronization.client.validateDraft).toHaveBeenCalledOnce();
    });
    synchronization.destroy();
    mounted.splice(mounted.indexOf(synchronization), 1);

    const completion = await mountStudio(
      productionDraft(),
      (client) => {
        client.promotion = {
          draftId: client.storedDraft.id,
          operationId: 'promote-complete',
          state: 'output-ready',
          targetPath,
          targetHash: 'production-hash',
          validationHash: 'production-hash',
          error: 'promotion completion in progress',
        };
      },
    );
    await vi.waitFor(() => {
      completion.tick();
      expect(completion.client.completePromote).toHaveBeenCalledOnce();
      expect(readDraftPhase(completion.client.storedDraft))
        .toBe('production');
    });
  });

  it('routes a narration-approval reservation into routed Reopen recovery', async () => {
    const studio = await mountStudio(
      productionDraft(),
      (client) => {
        client.architectureState = approvedArchitectureState(
          client.architectureState,
        );
        client.approveNarration.mockImplementationOnce(async () => {
          const paused = pausedReopenArchitectureState(
            client.architectureState,
          );
          client.architectureState = paused;
          throw architectureReservationError(paused);
        });
      },
    );
    const architecturePanel = studio.root.querySelector(
      'app-architecture-panel',
    );
    const productionPanel = studio.root.querySelector(
      'app-production-panel',
    );
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );

    expect(findButton(architecturePanel, 'Resume Reopen', true)).toBeNull();
    findButton(productionPanel, 'Approve complete narration').click();

    await expectRoutedReopenRecovery(
      studio,
      architecturePanel,
      editorHostElement,
    );
  });

  it('routes Promote-result import refusal into routed Reopen recovery', async () => {
    const draft = productionDraft();
    const markdown = exportMarkdown(schema.nodeFromJSON(draft.doc));
    if (!markdown.ok) throw new Error('fixture export is unsettled');
    draft.approvedNarrationMd = markdown.markdown;
    draft.approvedNarrationAt = '2026-07-24T13:00:00.000Z';
    draft.approvedNarrationRevisionSeq = 0;
    const studio = await mountStudio(draft, (client) => {
      client.architectureState = approvedArchitectureState(
        client.architectureState,
      );
      client.getResult.mockImplementationOnce(async () => {
        const paused = pausedReopenArchitectureState(
          client.architectureState,
        );
        client.architectureState = paused;
        throw architectureReservationError(paused);
      });
    });
    const architecturePanel = studio.root.querySelector(
      'app-architecture-panel',
    );
    const productionPanel = studio.root.querySelector(
      'app-production-panel',
    );
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    setInputValue(
      productionPanel?.querySelector('input[aria-label="Production target"]')
        ?? null,
      'whp-youtube/episodes/01-composition-net.md',
    );
    studio.tick();

    findButton(productionPanel, 'Promote to Phase 2').click();
    await expectDraftSubmission(studio, 'promote', 1);
    studio.client.resolve('op-1', {
      kind: 'raw',
      markdown: 'Promote output ready.',
    });

    await expectRoutedReopenRecovery(
      studio,
      architecturePanel,
      editorHostElement,
    );
  });

  it('routes production synchronization refusal into routed Reopen recovery', async () => {
    const studio = await mountStudio(productionDraft(), (client) => {
      client.architectureState = approvedArchitectureState(
        client.architectureState,
      );
      client.promotion = {
        draftId: client.storedDraft.id,
        operationId: 'promote-sync-conflict',
        state: 'validation-required',
        targetPath: 'whp-youtube/episodes/01-composition-net.md',
        targetHash: 'production-hash',
        validationHash: null,
        error: null,
      };
      client.syncProduction.mockImplementationOnce(async () => {
        const paused = pausedReopenArchitectureState(
          client.architectureState,
        );
        client.architectureState = paused;
        throw architectureReservationError(paused);
      });
    });
    const architecturePanel = studio.root.querySelector(
      'app-architecture-panel',
    );
    const productionPanel = studio.root.querySelector(
      'app-production-panel',
    );
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );

    await vi.waitFor(() => {
      studio.tick();
      expect(findButton(productionPanel, 'Run validator').disabled).toBe(false);
    });
    findButton(productionPanel, 'Run validator').click();

    await expectRoutedReopenRecovery(
      studio,
      architecturePanel,
      editorHostElement,
    );
  });

  it('routes persisted Promote reconciliation refusal into routed Reopen recovery', async () => {
    let rejectReconciliation:
      ((error: DaemonClientError) => void) | undefined;
    const studio = await mountStudio(productionDraft(), (client) => {
      client.architectureState = approvedArchitectureState(
        client.architectureState,
      );
      client.promotion = {
        draftId: client.storedDraft.id,
        operationId: 'promote-reconciliation-conflict',
        state: 'output-ready',
        targetPath: 'whp-youtube/episodes/01-composition-net.md',
        targetHash: 'production-hash',
        validationHash: null,
        error: null,
      };
      client.getResult.mockImplementationOnce(() =>
        new Promise((_resolve, reject) => {
          rejectReconciliation = reject;
        }));
    });
    const architecturePanel = studio.root.querySelector(
      'app-architecture-panel',
    );
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    const narrationActions = studio.root.querySelector(
      'app-narration-actions',
    );
    const narrationComponent = getDebugNode(narrationActions!)
      ?.componentInstance as NarrationActions | undefined;

    await vi.waitFor(() => {
      studio.tick();
      expect(rejectReconciliation).toBeTypeOf('function');
      expect(narrationComponent?.model().state?.pendingSaga).toBeNull();
      expect(findButton(architecturePanel, 'Resume Reopen', true)).toBeNull();
    });
    const paused = pausedReopenArchitectureState(
      studio.client.architectureState,
    );
    studio.client.architectureState = paused;
    rejectReconciliation!(architectureReservationError(paused));

    await expectRoutedReopenRecovery(
      studio,
      architecturePanel,
      editorHostElement,
    );
  });

  it('surfaces a durable pending proposal after reload and lets Martin retry settlement', async () => {
    const studio = await mountStudio(studioDraft(), (client) => {
      client.pendingNarrationProposals = [{
        draftId: 'draft-1',
        operationId: 'orphaned-proposal-op',
        state: 'pending',
        createdAt: '2026-07-24T13:00:00.000Z',
        resolvedAt: null,
        acceptedRevisionPresent: false,
      }];
    });
    const panel = studio.root.querySelector('app-production-panel');
    const editorElement = studio.root.querySelector('app-editor-host');
    const editor = editorElement
      ? getDebugNode(editorElement)?.componentInstance as EditorHost
      : null;
    expect(editor).not.toBeNull();
    const clearSettlementError = vi.spyOn(
      editor!,
      'clearProposalSettlementError',
    );
    const recovery = await waitForElement(
      studio,
      '[data-testid="proposal-recovery"]',
    );
    expect(recovery.textContent).toContain('orphaned-proposal-op');
    expect(recovery.textContent).toContain('state: pending');

    findButton(panel, 'Reject durable proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'orphaned-proposal-op',
        decision: 'rejected',
      });
      expect(clearSettlementError).toHaveBeenCalledOnce();
      expect(studio.root.querySelector(
        '[data-testid="proposal-recovery"]',
      )).toBeNull();
    });
  });

  it('surfaces the exact unsettled ledger operation and state when narration approval is refused', async () => {
    const studio = await mountStudio(productionDraft(), (client) => {
      client.pendingNarrationProposals = [{
        draftId: 'draft-1',
        operationId: 'alternatives-op',
        state: 'pending',
        createdAt: '2026-07-24T13:00:00.000Z',
        resolvedAt: null,
        acceptedRevisionPresent: false,
      }];
      client.prepareNarrationApproval.mockRejectedValueOnce(
        new DaemonClientError(409, {
          error: 'narration approval refused: unresolved proposals',
        }),
      );
    });
    const panel = studio.root.querySelector('app-production-panel');
    await waitForElement(studio, '[data-testid="proposal-recovery"]');

    findButton(panel, 'Approve complete narration').click();

    await vi.waitFor(() => {
      studio.tick();
      expect(panel?.querySelector('[role="alert"]')?.textContent).toContain(
        'alternatives-op (state: pending)',
      );
    });
    expect(studio.client.approveNarration).not.toHaveBeenCalled();
  });

  it('settles reject then reroll then accepted successor before narration approval', async () => {
    const prompt = vi.fn()
      .mockReturnValueOnce('The first rewrite was too generic.')
      .mockReturnValueOnce('Try a more concrete line.');
    vi.stubGlobal('prompt', prompt);
    const studio = await mountStudio(productionDraft());
    const productionPanel = studio.root.querySelector(
      'app-production-panel',
    );

    await selectText(studio, 'Opening narration.');
    clickToolbar(studio, 'rewrite');
    await expectDraftSubmission(studio, 'rewrite-selection', 1);
    studio.client.pendingNarrationProposals = [
      pendingNarrationProposal('op-1'),
    ];
    studio.client.resolve('op-1', rewriteResult('First rewrite candidate.'));
    let proposal: Element | null = null;
    await vi.waitFor(() => {
      studio.tick();
      proposal = studio.root.querySelector('.proposal-diff');
      expect(proposal?.textContent).toContain('First rewrite candidate.');
      expect(findButton(proposal, 'Reject', true)).not.toBeNull();
    });
    findButton(proposal, 'Reject').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-1',
        decision: 'rejected',
        reason: 'The first rewrite was too generic.',
      });
      expect(studio.client.pendingNarrationProposals).toEqual([]);
      expect(studio.root.querySelector('.proposal-diff')).toBeNull();
    });

    await selectText(studio, 'Opening narration.');
    clickToolbar(studio, 'rewrite');
    await expectDraftSubmission(studio, 'rewrite-selection', 2);
    studio.client.pendingNarrationProposals = [
      pendingNarrationProposal('op-2'),
    ];
    studio.client.resolve('op-2', rewriteResult('First reroll candidate.'));
    await vi.waitFor(() => {
      studio.tick();
      proposal = studio.root.querySelector('.proposal-diff');
      expect(proposal?.textContent).toContain('First reroll candidate.');
      expect(findButton(proposal, 'Re-roll', true)).not.toBeNull();
    });
    findButton(proposal, 'Re-roll').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.resumeDraftOp).toHaveBeenCalledWith(
        'draft-1',
        'op-2',
        expect.anything(),
        'Try a more concrete line.',
      );
    });
    studio.client.pendingNarrationProposals = [
      pendingNarrationProposal('op-3'),
    ];
    await expectEmbeddedConsole(studio, 'Working on op-3.');
    studio.client.resolve('op-3', rewriteResult('Accepted reroll candidate.'));
    await vi.waitFor(() => {
      studio.tick();
      proposal = studio.root.querySelector('.proposal-diff');
      expect(proposal?.textContent).toContain('Accepted reroll candidate.');
    });
    findButton(proposal, 'Accept').click();

    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.save).toHaveBeenCalledWith(
        'draft-1',
        expect.objectContaining({
          opId: 'op-3',
          disposition: 'selection-proposal-accepted',
        }),
      );
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-3',
        decision: 'accepted',
      });
      expect(studio.client.pendingNarrationProposals).toEqual([]);
    });

    await selectText(studio, 'Closing narration.');
    clickToolbar(studio, 'alternatives');
    await expectDraftSubmission(studio, 'generate-alternatives', 1);
    await expectEmbeddedConsole(studio, 'Working on op-4.');
    studio.client.resolve('op-4', {
      kind: 'schema',
      value: {
        status: 'complete',
        options: [
          { label: 'Direct', markdown: 'Close on the concrete rule.' },
          { label: 'Playful', markdown: 'Close by turning the rule into play.' },
        ],
        guardrail_markdown: null,
      },
      guardrail: null,
    });
    const alternatives = await waitForElement(
      studio,
      '[data-testid="unsettled-variant"]',
    );
    findButton(alternatives, 'Pick active').click();
    const editor = getDebugNode(
      studio.root.querySelector('app-editor-host')!,
    )?.componentInstance as EditorHost;
    await editor.flushPendingChanges();
    expect(studio.client.save).toHaveBeenCalledWith(
      'draft-1',
      expect.objectContaining({
        opId: 'op-4',
        disposition: expect.stringContaining('variant-picked/'),
      }),
    );
    expect(studio.client.pendingNarrationProposals).toEqual([]);

    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector(
        '[data-testid="unsettled-variant"]',
      )).toBeNull();
      expect(findButton(
        productionPanel,
        'Approve complete narration',
      ).disabled).toBe(false);
    });
    findButton(productionPanel, 'Approve complete narration').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.prepareNarrationApproval).toHaveBeenCalledOnce();
      expect(studio.client.approveNarration).toHaveBeenCalledOnce();
    });
    expect(prompt).toHaveBeenCalledTimes(2);
  });

  it('keeps a rejected proposal visible and announces durable settlement failure', async () => {
    vi.stubGlobal('prompt', vi.fn(() => 'The rewrite lost the concrete beat.'));
    const studio = await mountStudio(productionDraft(), (client) => {
      client.resolveNarrationProposal.mockRejectedValueOnce(
        new Error('ledger write failed'),
      );
    });

    await selectText(studio, 'Opening narration.');
    clickToolbar(studio, 'rewrite');
    await expectDraftSubmission(studio, 'rewrite-selection', 1);
    studio.client.pendingNarrationProposals = [
      pendingNarrationProposal('op-1'),
    ];
    studio.client.resolve('op-1', rewriteResult('Rejected rewrite candidate.'));
    let proposal: Element | null = null;
    await vi.waitFor(() => {
      studio.tick();
      proposal = studio.root.querySelector('.proposal-diff');
      expect(proposal?.textContent).toContain('Rejected rewrite candidate.');
    });
    findButton(proposal, 'Reject').click();

    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector(
        'app-editor-host [role="alert"]',
      )?.textContent).toContain(
        'Proposal settlement failed: ledger write failed',
      );
      expect(studio.root.querySelector('.proposal-diff')?.textContent)
        .toContain('Rejected rewrite candidate.');
      expect(studio.client.pendingNarrationProposals)
        .toEqual([pendingNarrationProposal('op-1')]);
    });
  });

  it('gates Promote completion on pinned exact-hash validator diagnostics', async () => {
    const studio = await mountStudio(productionDraft(), (client) => {
      client.milestoneDirtyFiles = ['unrelated-notes.md'];
    });
    const panel = studio.root.querySelector('app-production-panel')!;
    studio.client.validatorResults.push(
      {
        ok: false,
        errors: [{
          message: 'Personal input must be completed.',
          line: 24,
        }],
        path: 'whp-youtube/episodes/01-composition-net.md',
        hash: 'production-hash',
      },
      {
        ok: true,
        errors: [],
        path: 'whp-youtube/episodes/01-composition-net.md',
        hash: 'production-hash',
      },
    );

    findButton(panel, 'Approve complete narration').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.approveNarration).toHaveBeenCalledOnce();
      expect(readDraftPhase(studio.client.storedDraft)).toBe(
        'creative-approved',
      );
    });
    const target = panel.querySelector<HTMLInputElement>(
      'input[aria-label="Production target"]',
    )!;
    target.value = 'whp-youtube/episodes/01-composition-net.md';
    target.dispatchEvent(new Event('input', { bubbles: true }));
    studio.tick();
    findButton(panel, 'Promote to Phase 2').click();
    await expectDraftSubmission(studio, 'promote', 1);
    studio.client.resolve('op-1', {
      kind: 'raw',
      markdown: 'Promotion output written.',
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain('validation-required');
      expect(readDraftPhase(studio.client.storedDraft))
        .toBe('creative-approved');
    });

    findButton(panel, 'Run validator').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain('FAIL');
      expect(panel.textContent).toContain('1 diagnostic');
      expect(panel.textContent).toContain('Line 24');
      expect(panel.textContent).toContain(
        'Personal input must be completed.',
      );
      expect(panel.textContent).toContain(
        'Fix cycle started — edit the draft, then re-run the validator.',
      );
      expect(panel.textContent).toContain(
        'evidence, not an editorial approval',
      );
    });
    expect(readDraftReadiness(studio.client.storedDraft))
      .toBe('EDITORIAL-DRAFT');
    expect(findButton(panel, 'Complete Promote').disabled).toBe(true);

    const metadata = studio.client.storedDraft.doc['metadata'];
    studio.client.storedDraft.doc = {
      ...parseProductionFixture(true),
      metadata,
    };
    findButton(panel, 'Re-run validator').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain('PASS');
      expect(panel.textContent).toContain('COMPLETED');
      expect(findButton(panel, 'Complete Promote').disabled).toBe(false);
    });
    expect(readDraftPhase(studio.client.storedDraft))
      .toBe('creative-approved');
    expect(readDraftReadiness(studio.client.storedDraft))
      .toBe('EDITORIAL-DRAFT');

    await replaceRenderedText(
      studio,
      'Opening narration.',
      'Edited after validator pass.',
    );
    studio.tick();
    expect(panel.textContent).toContain('STALE');
    expect(findButton(panel, 'Complete Promote').disabled).toBe(true);
    findButton(panel, 'Re-run validator').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain('PASS');
      expect(findButton(panel, 'Complete Promote').disabled).toBe(false);
    });

    findButton(panel, 'Complete Promote').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain('complete');
      expect(readDraftPhase(studio.client.storedDraft)).toBe('production');
      expect(studio.client.pipelineMilestones).toContain('production');
    });
    expect(readDraftReadiness(studio.client.storedDraft))
      .toBe('EDITORIAL-DRAFT');
    expect(studio.client.productionSyncs).toHaveLength(3);
    expect(studio.client.productionSyncs.map(
      ({ expectedRevisionSeq }) => expectedRevisionSeq,
    )).toEqual([2, 2, 3]);

    const milestonePanel = studio.root.querySelector(
      'app-milestone-panel',
    );
    expect(milestonePanel).not.toBeNull();
    findButton(milestonePanel, 'Refresh milestones').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.pendingMilestones.map(({ kind }) => kind))
        .toEqual([
          'creative-narration-approval',
          'production-promotion',
        ]);
      expect(milestonePanel?.querySelectorAll(
        '[data-milestone-id]',
      )).toHaveLength(2);
    });
    expect(new Set(
      studio.client.pendingMilestones.map(({ id }) => id),
    ).size).toBe(2);
    expect(studio.client.pendingMilestones.every(
      ({ files }) => !files.includes('unrelated-notes.md'),
    )).toBe(true);
    expect(milestonePanel?.textContent).toContain('unrelated-notes.md');

    const narrationMilestone = studio.client.pendingMilestones.find(
      ({ kind }) => kind === 'creative-narration-approval',
    )!;
    const narrationCard = milestonePanel?.querySelector(
      `[data-milestone-id="${narrationMilestone.id}"]`,
    ) ?? null;
    const narrationConfirmation =
      narrationCard?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(narrationConfirmation).not.toBeNull();
    narrationConfirmation!.checked = true;
    narrationConfirmation!.dispatchEvent(
      new Event('change', { bubbles: true }),
    );
    studio.tick();
    studio.client.failNextMilestoneCommit = true;
    findButton(narrationCard, 'Commit milestone').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.commitMilestone).toHaveBeenCalledOnce();
      expect(milestonePanel?.textContent).toContain(
        'simulated milestone commit failure',
      );
      expect(studio.client.pendingMilestones).toContain(narrationMilestone);
    });

    findButton(narrationCard, 'Commit milestone').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.commitMilestone).toHaveBeenCalledTimes(2);
      expect(studio.client.pendingMilestones).not.toContain(
        narrationMilestone,
      );
      expect(milestonePanel?.querySelector(
        `[data-milestone-id="${narrationMilestone.id}"]`,
      )).toBeNull();
    });
  });

  it('integrates Phase-2 cards, clean narration, and PI proposals on the routed draft page', async () => {
    const studio = await mountStudio(productionDraft());
    const panel = studio.root.querySelector('app-production-panel');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('Script metadata');
    expect(panel?.textContent).toContain('Beat 01 — Opening');
    expect(panel?.textContent).toContain('Unrecognized production note');

    const cards = panel!.querySelectorAll<HTMLDetailsElement>(
      '[data-testid="production-card"]',
    );
    expect(cards.length).toBeGreaterThan(2);
    cards[1]!.open = false;
    cards[1]!.dispatchEvent(new Event('toggle'));
    studio.tick();
    expect(cards[1]!.open).toBe(false);
    cards[1]!.open = true;
    cards[1]!.dispatchEvent(new Event('toggle'));
    studio.tick();
    expect(cards[1]!.open).toBe(true);

    const editorElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    )!;
    const editor = getDebugNode(editorElement)?.componentInstance as EditorHost;
    const beforeToggle = editor.currentMarkdown();
    const cleanToggle = panel!.querySelector<HTMLInputElement>(
      'input[aria-label="Clean narration"]',
    )!;
    cleanToggle.click();
    studio.tick();
    expect(editorElement.querySelector('.editor')?.classList)
      .toContain('clean-narration');
    cleanToggle.click();
    studio.tick();
    expect(editor.currentMarkdown()).toBe(beforeToggle);

    const response = panel!.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Response for PI-001"]',
    )!;
    response.value = 'I noticed it while teaching a friend.';
    response.dispatchEvent(new Event('input', { bubbles: true }));
    studio.tick();
    findButton(panel, 'Integrate supplied response').click();
    await expectDraftSubmission(studio, 'rewrite-selection', 1);
    expect(studio.client.draftSubmissions.at(-1)?.inputs).toEqual({
      topic_brief: {
        topic: 'Why constraints create play',
        factual_anchors: ['Players accept the rule.'],
        unknowns: ['Which example survives?'],
      },
      approved_lessons: ['Keep it concrete.'],
      selection: '<!-- PI-001: Martin input -->',
      surrounding_context: {
        before: 'Opening narration.',
        after: 'Closing narration.',
      },
      beat_title: '1. Opening',
      narrative_job: '',
      creative_status: {
        phase: 'creative-approved',
        readiness: 'EDITORIAL-DRAFT',
      },
      requested_scope: {
        kind: 'personal-input',
        personal_input_id: 'PI-001',
      },
      supplied_personal_input: 'I noticed it while teaching a friend.',
      personal_input_block: expect.stringContaining(
        '- **Decision:** INPUT-REQUESTED',
      ),
    });
    studio.client.resolve('op-1', rewriteResult(
      'Martin supplied first paragraph.\n\n'
        + 'Martin supplied **exact** second paragraph.',
    ));
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain(
        'Martin supplied first paragraph.',
      );
    });
    setInputValue(
      panel.querySelector('input[aria-label="Why reject PI-001"]'),
      'The personal detail lands before the setup.',
    );
    findButton(panel, 'Reject proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-1',
        decision: 'rejected',
        reason: 'The personal detail lands before the setup.',
      });
    });
    expect(editor.currentMarkdown()).toContain(
      '<!-- PI-001: Martin input -->',
    );
    expect(editor.currentMarkdown()).toContain(
      '- **Decision:** INPUT-REQUESTED',
    );

    findButton(panel, 'Integrate supplied response').click();
    await expectDraftSubmission(studio, 'rewrite-selection', 2);
    studio.client.resolve('op-2', rewriteResult(
      'Martin supplied first paragraph.\n\n'
        + 'Martin supplied **exact** second paragraph.',
    ));
    await vi.waitFor(() => {
      studio.tick();
      expect(panel.textContent).toContain(
        'Martin supplied first paragraph.',
      );
    });
    findButton(panel, 'Accept proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editor.currentMarkdown()).toContain(
        '> Opening narration. Martin supplied first paragraph.\n\n'
          + '> Martin supplied **exact** second paragraph. Closing narration.',
      );
      expect(editor.currentMarkdown()).not.toContain(
        '<!-- PI-001: Martin input -->',
      );
      expect(editor.currentMarkdown()).toContain(
        '- **Decision:** COMPLETED',
      );
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-2',
        decision: 'accepted',
      });
    });
    expect(editor.undoPersonalInputAcceptance()).toBe(true);
    studio.tick();
    expect(editor.currentMarkdown()).toContain(
      '<!-- PI-001: Martin input -->',
    );
    expect(editor.currentMarkdown()).toContain(
      '- **Decision:** INPUT-REQUESTED',
    );
  });

  it('drives architecture approval, reopen, and episode reconciliation through production controls', async () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal('confirm', confirm);
    const studio = await mountStudio(architectureDraft(), (client) => {
      client.milestoneWorkspace = null;
      client.milestoneDirtyFiles = ['unrelated-notes.md'];
    });

    const architecturePanel = studio.root.querySelector(
      'app-architecture-panel',
    );
    const narrationActions = studio.root.querySelector(
      'app-narration-actions',
    );
    const editorHost = studio.root.querySelector('app-editor-host');
    expect(architecturePanel).not.toBeNull();
    expect(narrationActions).not.toBeNull();
    expect(editorHost).not.toBeNull();
    const milestonePanel = studio.root.querySelector(
      'app-milestone-panel',
    );
    expect(milestonePanel).not.toBeNull();
    expect(milestonePanel?.textContent).toContain('Recommended new branch');
    expect(milestonePanel?.textContent).toContain('Use current branch');
    findButton(milestonePanel, 'Use recommended branch').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.chooseMilestoneWorkspace).toHaveBeenCalledWith(
        'draft-1',
        {
          choice: 'new-branch',
          taskName: 'composition-net',
        },
      );
      expect(milestonePanel?.textContent).toContain(
        'episode/composition-net',
      );
    });
    expect(
      architecturePanel!.compareDocumentPosition(editorHost!)
        & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(studio.root.querySelector('app-brief-panel')).not.toBeNull();

    findButton(architecturePanel, 'Generate architecture').click();
    await expectDraftSubmission(studio, 'generate-architecture', 1);
    studio.client.resolve('op-1', {
      kind: 'raw',
      markdown: generatedArchitectureMarkdown(),
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelectorAll(
        '[data-testid="architecture-proposal"]',
      )).toHaveLength(14);
    });
    const unsafeProposal = Array.from(studio.root.querySelectorAll(
      '[data-testid="architecture-proposal"]',
    )).find((element) => element.textContent?.includes('Optional comparison'));
    expect(unsafeProposal).not.toBeNull();
    expect(unsafeProposal?.querySelector('img')).toBeNull();
    expect(unsafeProposal?.innerHTML).not.toContain('onerror=');
    setInputValue(
      unsafeProposal?.querySelector('input[aria-label^="Why reject"]'),
      'It repeats the core answer.',
    );
    findButton(unsafeProposal ?? null, 'Reject proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.rejectArchitectureProposal).toHaveBeenCalledWith(
        'draft-1',
        'op-1',
        'It repeats the core answer.',
      );
      expect(unsafeProposal?.isConnected).toBe(false);
    });
    findButton(architecturePanel, 'Accept all proposals').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.saveArchitecture).toHaveBeenCalledOnce();
      expect(studio.root.querySelectorAll(
        '[data-testid="architecture-proposal"]',
      )).toHaveLength(0);
      expect(studio.client.architectureState.sections).toHaveLength(13);
    });

    const coreAnswer = studio.root.querySelector<HTMLElement>(
      '[data-section-key="core-answer"]',
    )!;
    setInputValue(
      coreAnswer.querySelector('input[aria-label="Refine Core answer"]'),
      'Make the causal step explicit.',
    );
    studio.tick();
    findButton(coreAnswer, 'Refine section').click();
    await expectDraftSubmission(
      studio,
      'rewrite-architecture-section',
      1,
    );
    studio.client.resolve('op-2', {
      kind: 'schema',
      value: {
        status: 'complete',
        section_key: 'core-answer',
        replacement_markdown:
          '### Core answer\n\nThe refined causal answer.\n',
        guardrail_markdown: null,
      },
      guardrail: null,
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(coreAnswer.textContent).toContain('The refined causal answer.');
    });
    findButton(coreAnswer, 'Accept proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.architectureState.sections.find(
        ({ key }) => key === 'core-answer',
      )?.md).toContain('The refined causal answer.');
      expect(findButton(architecturePanel, 'Review architecture').disabled)
        .toBe(false);
    });

    findButton(architecturePanel, 'Review architecture').click();
    await expectDraftSubmission(studio, 'review-architecture', 1);
    studio.client.resolve('op-3', {
      kind: 'schema',
      value: {
        status: 'complete',
        findings: [{
          section_key: 'core-answer',
          severity: 'important',
          finding_markdown: 'Pin this finding to the core answer.',
        }],
        guardrail_markdown: null,
      },
      guardrail: null,
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(coreAnswer.textContent).toContain(
        'Pin this finding to the core answer.',
      );
    });

    findButton(architecturePanel, 'Approve architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(architecturePanel.textContent).toContain('Approved Jul 24, 2026');
      expect(
        studio.root.querySelector<HTMLInputElement>(
          'app-brief-panel input[type="text"]',
        )?.value,
      ).toBe('rapid-prototype');
      expect(studio.client.canonicalArchitectureWrites).toEqual([
        'whp-youtube/architectures/composition-net.md',
      ]);
      expect(studio.client.pipelineMilestones).toEqual(['prototyping']);
    });
    expect(
      architecturePanel.querySelector<HTMLInputElement>(
        'input[aria-label="Architecture generation constraints"]',
      )?.disabled,
    ).toBe(true);
    expect(findButton(architecturePanel, 'Generate architecture').disabled)
      .toBe(true);
    expect(findButton(architecturePanel, 'Review architecture').disabled)
      .toBe(true);
    expect(
      coreAnswer.querySelector<HTMLInputElement>(
        'input[aria-label="Refine Core answer"]',
      )?.disabled,
    ).toBe(true);
    expect(findButton(coreAnswer, 'Refine section').disabled).toBe(true);
    expect(studio.client.commitMilestone).not.toHaveBeenCalled();
    findButton(milestonePanel, 'Refresh milestones').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(milestonePanel?.querySelector(
        '[data-milestone-id="milestone-1"]',
      )).not.toBeNull();
      expect(milestonePanel?.textContent).toContain(
        'feat(composition-net): record architecture approval milestone',
      );
    });
    const architectureMilestone = milestonePanel?.querySelector(
      '[data-milestone-id="milestone-1"]',
    ) ?? null;
    const architectureConfirmation =
      architectureMilestone?.querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      );
    expect(architectureConfirmation).not.toBeNull();
    architectureConfirmation!.checked = true;
    architectureConfirmation!.dispatchEvent(
      new Event('change', { bubbles: true }),
    );
    studio.tick();
    findButton(architectureMilestone, 'Commit milestone').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.commitMilestone).toHaveBeenCalledOnce();
      expect(studio.client.milestoneCommitRequests).toEqual([{
        draftId: 'draft-1',
        kind: 'architecture-approval',
        input: {
          pendingMilestoneId: 'milestone-1',
          confirmed: true,
        },
      }]);
    });
    const narrationComponent = getDebugNode(narrationActions!)
      ?.componentInstance as NarrationActions | undefined;
    const generateEpisode = findButton(narrationActions, 'Generate episode');
    expect(
      generateEpisode.disabled,
      `narration actions: ${narrationActions?.textContent}; state: ${
        JSON.stringify(narrationComponent?.model().state)
      }`,
    ).toBe(false);

    const narrationBeforeReopen = editorText(studio);
    findButton(architecturePanel, 'Reopen architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(confirm).toHaveBeenCalledWith(
        'Reopen architecture? Existing narration is preserved but must be reconciled.',
      );
      expect(architecturePanel.textContent).toContain(
        'Reopened — narration reconciliation required',
      );
      expect(editorText(studio)).toBe(narrationBeforeReopen);
      expect(findButton(narrationActions, 'Generate episode').disabled)
        .toBe(true);
      expect(findButton(narrationActions, 'Promote').disabled).toBe(true);
    });

    findButton(architecturePanel, 'Approve architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(findButton(narrationActions, 'Generate episode').disabled)
        .toBe(false);
      expect(narrationActions.textContent).toContain(
        'Narration reconciliation is required before Promote.',
      );
    });

    findButton(narrationActions, 'Mark narration reconciled').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(confirm).toHaveBeenCalledWith(
        'Mark narration reconciled at the current revision?',
      );
      expect(studio.client.narrationReconciliations).toEqual([{
        draftId: 'draft-1',
        expectedRevisionSeq: studio.client.architectureState.revisionSeq,
        confirmed: true,
      }]);
      expect(studio.client.architectureState
        .narrationReconciliationRequired).toBe(false);
      expect(narrationActions.textContent).not.toContain(
        'Narration reconciliation is required before Promote.',
      );
    });

    findButton(narrationActions, 'Generate episode').click();
    await expectDraftSubmission(studio, 'generate-episode', 1);
    const approvedAtGeneration =
      studio.client.draftSubmissions.at(-1)?.approvedArchitectureMd;
    expect(approvedAtGeneration).toBe(
      studio.client.architectureState.approvedMd,
    );
    expect(studio.client.draftSubmissions.at(-1)?.inputs).not.toHaveProperty(
      'approved_architecture_md',
    );
    studio.client.resolve('op-4', {
      kind: 'raw',
      markdown: generatedNarrationMarkdown('Rejected fresh narration.'),
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(narrationActions.textContent).toContain(
        'Rejected fresh narration.',
      );
    });
    findButton(narrationActions, 'Reject episode proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(findButton(narrationActions, 'Generate episode').disabled)
        .toBe(false);
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-4',
        decision: 'rejected',
      });
    });
    expect(editorText(studio)).toBe(narrationBeforeReopen);

    findButton(narrationActions, 'Generate episode').click();
    await expectDraftSubmission(studio, 'generate-episode', 2);
    studio.client.resolve('op-5', {
      kind: 'raw',
      markdown: generatedNarrationMarkdown('Accepted fresh narration.'),
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(narrationActions.textContent).toContain(
        'Accepted fresh narration.',
      );
    });
    const architectureLoadsBeforeAccept =
      studio.client.getArchitecture.mock.calls.length;
    findButton(narrationActions, 'Accept episode proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorText(studio)).toContain('Accepted fresh narration.');
      expect(editorText(studio)).not.toContain('rewrite target');
      expect(studio.client.save).toHaveBeenCalledWith(
        'draft-1',
        expect.objectContaining({
          opId: 'op-5',
          disposition: 'episode-generation-accepted',
        }),
      );
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-5',
        decision: 'accepted',
      });
      expect(studio.client.architectureState
        .narrationReconciliationRequired).toBe(false);
      expect(studio.client.getArchitecture).toHaveBeenCalledTimes(
        architectureLoadsBeforeAccept + 1,
      );
      expect(narrationActions.textContent).not.toContain(
        'Narration reconciliation is required before Promote.',
      );
    });
  });

  it('shows a paused approval after conflict and resumes it from production controls', async () => {
    const studio = await mountStudio(architectureDraft(), (client) => {
      client.architectureState = {
        ...client.architectureState,
        sections: ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
          key,
          title,
          md: `### ${title}\n\nApproved ${key}.\n`,
        })),
      };
      client.pauseNextArchitectureApproval = true;
    });
    const panel = studio.root.querySelector('app-architecture-panel');
    expect(panel).not.toBeNull();
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    if (!editorHostElement) throw new Error('EditorHost was not mounted');
    const editorHost = getDebugNode(editorHostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!editorHost) throw new Error('EditorHost instance was not discoverable');

    findButton(panel, 'Approve architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(panel?.textContent).toContain(
        'Approval paused — resume required',
      );
      expect(findButton(panel, 'Resume approval').disabled).toBe(false);
      expect(Array.from(panel?.querySelectorAll('button') ?? [])
        .some((button) => button.textContent?.includes('Reopen architecture')))
        .toBe(false);
      expect(findButton(panel, 'Generate architecture').disabled).toBe(true);
      expect(findButton(panel, 'Review architecture').disabled).toBe(true);
      expect(editorHostElement.textContent).toContain(
        'Architecture action paused — resume or resolve first.',
      );
      expect(editorHostElement.querySelector('.ProseMirror')
        ?.getAttribute('contenteditable')).toBe('false');
    });
    const savesBeforeBlockedAttempt = studio.client.save.mock.calls.length;
    await expect(editorHost.replaceNarrationFromMarkdown(
      generatedNarrationMarkdown('Blocked narration replacement.'),
      'blocked-proposal',
    )).rejects.toThrow(
      'Architecture action paused — resume or resolve first.',
    );
    expect(studio.client.save).toHaveBeenCalledTimes(
      savesBeforeBlockedAttempt,
    );

    findButton(panel, 'Resume approval').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.architectureSagaResumes)
        .toEqual(['approval-resume-key']);
      expect(panel?.textContent).toContain('Approved Jul 24, 2026');
      expect(studio.client.architectureState.pendingSaga).toBeNull();
      expect(readDraftPhase(studio.client.storedDraft))
        .toBe('rapid-prototype');
      expect(studio.client.pipelineMilestones).toEqual(['prototyping']);
      expect(studio.client.pendingMilestones).toEqual([
        expect.objectContaining({ kind: 'architecture-approval' }),
      ]);
      expect(editorHostElement.textContent).not.toContain(
        'Architecture action paused — resume or resolve first.',
      );
      expect(editorHostElement.querySelector('.ProseMirror')
        ?.getAttribute('contenteditable')).toBe('true');
    });

    await replaceRenderedText(
      studio,
      'rewrite target',
      'resumed editor target',
    );
    await editorHost.flushPendingChanges();
    expect(studio.client.save).toHaveBeenCalledTimes(
      savesBeforeBlockedAttempt + 1,
    );
    expect(editorText(studio)).toContain('resumed editor target');
  });

  it('adopts milestone-conflict state immediately so the routed editor blocks and exposes Resume', async () => {
    const studio = await mountStudio(architectureDraft(), (client) => {
      client.architectureState = {
        ...client.architectureState,
        sections: ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
          key,
          title,
          md: `### ${title}\n\nApproved ${key}.\n`,
        })),
      };
      client.pauseNextArchitectureMilestone = true;
    });
    const panel = studio.root.querySelector('app-architecture-panel');
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    if (!editorHostElement) throw new Error('EditorHost was not mounted');
    const editorHost = getDebugNode(editorHostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!editorHost) throw new Error('EditorHost instance was not discoverable');

    findButton(panel, 'Approve architecture').click();

    await vi.waitFor(() => {
      studio.tick();
      expect(panel?.textContent).toContain(
        'pending milestone source conflict for architecture-approval',
      );
      expect(panel?.textContent).toContain(
        'Approval paused — resume required',
      );
      expect(findButton(panel, 'Resume approval').disabled).toBe(false);
      expect(editorHost.narrationBlocked()).toBe(true);
      expect(editorHostElement.querySelector('.ProseMirror')
        ?.getAttribute('contenteditable')).toBe('false');
    });
  });

  it('shows a paused Reopen saga and resumes it through the shared routed surface', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const studio = await mountStudio(architectureDraft(), (client) => {
      const approvedSections = ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
        key,
        title,
        md: `### ${title}\n\nApproved ${key}.\n`,
      }));
      client.architectureState = {
        ...client.architectureState,
        sections: approvedSections,
        approvedMd: joinArchitecture(approvedSections),
        approvedAt: '2026-07-24T12:00:00.000Z',
      };
      client.pauseNextArchitectureReopen = true;
    });
    const panel = studio.root.querySelector('app-architecture-panel');
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    if (!editorHostElement) throw new Error('EditorHost was not mounted');
    const editorHost = getDebugNode(editorHostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!editorHost) throw new Error('EditorHost instance was not discoverable');

    findButton(panel, 'Reopen architecture').click();

    await vi.waitFor(() => {
      studio.tick();
      expect(panel?.textContent).toContain('Reopen paused — resume required');
      expect(findButton(panel, 'Resume Reopen').disabled).toBe(false);
      expect(editorHost.narrationBlocked()).toBe(true);
      expect(editorHostElement.querySelector('.ProseMirror')
        ?.getAttribute('contenteditable')).toBe('false');
    });

    findButton(panel, 'Resume Reopen').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.architectureSagaResumes)
        .toEqual(['reopen-resume-key']);
      expect(studio.client.architectureState.pendingSaga).toBeNull();
      expect(readDraftPhase(studio.client.storedDraft)).toBe('architecture');
      expect(editorHost.narrationBlocked()).toBe(false);
      expect(editorHostElement.querySelector('.ProseMirror')
        ?.getAttribute('contenteditable')).toBe('true');
    });
  });

  it('surfaces a recoverable autosave refusal that races with paused approval', async () => {
    let rejectRacingSave:
      ((error: DaemonClientError) => void) | undefined;
    const studio = await mountStudio(architectureDraft(), (client) => {
      client.architectureState = {
        ...client.architectureState,
        sections: ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
          key,
          title,
          md: `### ${title}\n\nApproved ${key}.\n`,
        })),
      };
      client.pauseNextArchitectureApproval = true;
      client.save.mockImplementationOnce(() =>
        new Promise((_resolve, reject) => {
          rejectRacingSave = reject;
        }));
    });
    const panel = studio.root.querySelector('app-architecture-panel');
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    if (!editorHostElement) throw new Error('EditorHost was not mounted');
    const editorHost = getDebugNode(editorHostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!editorHost) throw new Error('EditorHost instance was not discoverable');

    await replaceRenderedText(
      studio,
      'rewrite target',
      'racing autosave target',
    );
    const flush = editorHost.flushPendingChanges();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.save).toHaveBeenCalledOnce();
      expect(rejectRacingSave).toBeTypeOf('function');
    });

    findButton(panel, 'Approve architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHost.narrationBlocked()).toBe(true);
    });
    rejectRacingSave!(new DaemonClientError(409, {
      error:
        'draft write refused: an architecture saga is paused; resume or resolve it first',
      code: 'draft-write-reserved',
      reservation: 'architecture-saga',
      sagaKind: 'approve',
      recoverable: true,
    }));
    await expect(flush).rejects.toThrow('Narration remains unsaved.');
    studio.tick();
    expect(editorHostElement.textContent).toContain(
      'Unsaved — Architecture action paused — resume or resolve first. Narration remains unsaved.',
    );

    findButton(panel, 'Resume approval').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHost.narrationBlocked()).toBe(false);
    });
    await editorHost.flushPendingChanges();
    studio.tick();
    expect(studio.client.save).toHaveBeenCalledTimes(2);
    expect(editorHostElement.querySelector(
      '[data-testid="unsaved-badge"]',
    )).toBeNull();
  });

  it('adopts a reservation response state and blocks the routed editor without a reload', async () => {
    const studio = await mountStudio(architectureDraft(), (client) => {
      client.save.mockImplementationOnce(async () => {
        client.architectureState = {
          ...client.architectureState,
          pendingSaga: {
            kind: 'reopen',
            resumeKey: 'remote-reopen-resume-key',
            steps: {
              revisionAppended: 'completed',
              artifactWritten: 'completed',
              pipelineUpserted: 'pending',
              draftUpdated: 'pending',
            },
            createdAt: '2026-07-24T12:00:00.000Z',
            updatedAt: '2026-07-24T12:00:00.000Z',
          },
        };
        throw new DaemonClientError(409, {
          error:
            'draft write refused: an architecture saga is paused; resume or resolve it first',
          code: 'draft-write-reserved',
          reservation: 'architecture-saga',
          sagaKind: 'reopen',
          recoverable: true,
          state: cloneArchitectureState(client.architectureState),
        });
      });
    });
    const panel = studio.root.querySelector('app-architecture-panel');
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    if (!editorHostElement) throw new Error('EditorHost was not mounted');
    const editorHost = getDebugNode(editorHostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!editorHost) throw new Error('EditorHost instance was not discoverable');

    await replaceRenderedText(
      studio,
      'rewrite target',
      'remote saga race target',
    );
    await expect(editorHost.flushPendingChanges()).rejects.toThrow(
      'Narration remains unsaved.',
    );

    await vi.waitFor(() => {
      studio.tick();
      expect(panel?.textContent).toContain('Reopen paused — resume required');
      expect(findButton(panel, 'Resume Reopen').disabled).toBe(false);
      expect(editorHost.narrationBlocked()).toBe(true);
      expect(editorHostElement.querySelector('.ProseMirror')
        ?.getAttribute('contenteditable')).toBe('false');
    });
  });

  it('blocks on a stale-model direct whole-episode save refusal without autosave or reload', async () => {
    const studio = await mountStudio(studioDraft(), (client) => {
      client.architectureState = approvedArchitectureState(
        client.architectureState,
      );
      client.save.mockImplementationOnce(async () => {
        const paused = pausedReopenArchitectureState(
          client.architectureState,
        );
        client.architectureState = paused;
        throw architectureReservationError(paused);
      });
    });
    const architecturePanel = studio.root.querySelector(
      'app-architecture-panel',
    );
    const narrationActions = studio.root.querySelector(
      'app-narration-actions',
    );
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    const narrationComponent = getDebugNode(narrationActions!)
      ?.componentInstance as NarrationActions | undefined;
    const architectureLoadsBeforeAcceptance =
      studio.client.getArchitecture.mock.calls.length;

    expect(narrationComponent?.model().state?.pendingSaga).toBeNull();
    expect(findButton(architecturePanel, 'Resume Reopen', true)).toBeNull();
    expect(studio.client.save).not.toHaveBeenCalled();
    findButton(narrationActions, 'Generate episode').click();
    await expectDraftSubmission(studio, 'generate-episode', 1);
    studio.client.resolve('op-1', {
      kind: 'raw',
      markdown: generatedNarrationMarkdown('Refused direct replacement.'),
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(narrationActions?.textContent).toContain(
        'Refused direct replacement.',
      );
    });
    findButton(narrationActions, 'Accept episode proposal').click();

    await expectRoutedReopenRecovery(
      studio,
      architecturePanel,
      editorHostElement,
    );
    expect(studio.client.save).toHaveBeenCalledOnce();
    expect(studio.client.save).toHaveBeenCalledWith(
      'draft-1',
      expect.objectContaining({
        opId: 'op-1',
        disposition: 'episode-generation-accepted',
      }),
    );
    expect(studio.client.save.mock.calls.some(([, input]) =>
      input.disposition === 'autosave')).toBe(false);
    expect(studio.client.getArchitecture).toHaveBeenCalledTimes(
      architectureLoadsBeforeAcceptance,
    );
    expect(editorText(studio)).not.toContain('Refused direct replacement.');
  });

  it('rolls back a proposal replacement refused by a racing approval pause', async () => {
    let rejectRacingSave:
      ((error: DaemonClientError) => void) | undefined;
    const studio = await mountStudio(architectureDraft(), (client) => {
      client.architectureState = {
        ...client.architectureState,
        sections: ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
          key,
          title,
          md: `### ${title}\n\nApproved ${key}.\n`,
        })),
      };
      client.pauseNextArchitectureApproval = true;
      client.save.mockImplementationOnce(() =>
        new Promise((_resolve, reject) => {
          rejectRacingSave = reject;
        }));
    });
    const panel = studio.root.querySelector('app-architecture-panel');
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    if (!editorHostElement) throw new Error('EditorHost was not mounted');
    const editorHost = getDebugNode(editorHostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!editorHost) throw new Error('EditorHost instance was not discoverable');

    await replaceRenderedText(
      studio,
      'rewrite target',
      'dirty before replacement',
    );
    expect(editorHost.unsaved()).toBe(true);
    expect(studio.client.save).not.toHaveBeenCalled();
    const narrationBeforeReplacement = editorText(studio);

    const replacement = editorHost.replaceNarrationFromMarkdown(
      generatedNarrationMarkdown('Racing proposal replacement.'),
      'racing-proposal',
    );
    await vi.waitFor(() => {
      studio.tick();
      expect(editorText(studio)).toContain('Racing proposal replacement.');
      expect(studio.client.save).toHaveBeenCalledOnce();
      expect(rejectRacingSave).toBeTypeOf('function');
    });

    findButton(panel, 'Approve architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHost.narrationBlocked()).toBe(true);
    });
    rejectRacingSave!(new DaemonClientError(409, {
      error:
        'draft write refused: an architecture saga is paused; resume or resolve it first',
      code: 'draft-write-reserved',
      reservation: 'architecture-saga',
      sagaKind: 'approve',
      recoverable: true,
    }));

    await expect(replacement).rejects.toThrow(
      'draft write refused: an architecture saga is paused; resume or resolve it first',
    );
    studio.tick();
    expect(editorText(studio)).toBe(narrationBeforeReplacement);
    expect(editorHost.editorState()?.doc.textContent).toContain(
      'dirty before replacement',
    );
    expect(editorHost.unsaved()).toBe(true);

    findButton(panel, 'Resume approval').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHost.narrationBlocked()).toBe(false);
    });
    await editorHost.flushPendingChanges();
    expect(editorHost.unsaved()).toBe(false);
    expect(studio.client.save).toHaveBeenCalledTimes(2);
    await editorHost.replaceNarrationFromMarkdown(
      generatedNarrationMarkdown('Racing proposal replacement.'),
      'racing-proposal',
    );
    studio.tick();
    expect(editorText(studio)).toContain('Racing proposal replacement.');
    expect(studio.client.save).toHaveBeenCalledTimes(3);
  });

  it('preserves inline-acceptance provenance across a saga pause and settles after Resume', async () => {
    let rejectRacingSave:
      ((error: DaemonClientError) => void) | undefined;
    const studio = await mountStudio(architectureDraft(), (client) => {
      client.architectureState = {
        ...client.architectureState,
        sections: ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
          key,
          title,
          md: `### ${title}\n\nApproved ${key}.\n`,
        })),
      };
      client.pauseNextArchitectureApproval = true;
      client.save.mockImplementationOnce(() =>
        new Promise((_resolve, reject) => {
          rejectRacingSave = reject;
        }));
    });
    const panel = studio.root.querySelector('app-architecture-panel');
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    if (!editorHostElement) throw new Error('EditorHost was not mounted');
    const editorHost = getDebugNode(editorHostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!editorHost) throw new Error('EditorHost instance was not discoverable');

    await selectText(studio, 'rewrite target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-1.');
    studio.client.resolve('op-1', rewriteResult('accepted inline target'));
    let proposal: Element | null = null;
    await vi.waitFor(() => {
      studio.tick();
      proposal = studio.root.querySelector('.proposal-diff');
      expect(proposal?.textContent).toContain('accepted inline target');
    });
    findButton(proposal, 'Accept').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.save).toHaveBeenCalledOnce();
      expect(rejectRacingSave).toBeTypeOf('function');
    });

    findButton(panel, 'Approve architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHost.narrationBlocked()).toBe(true);
    });
    rejectRacingSave!(new DaemonClientError(409, {
      error:
        'draft write refused: an architecture saga is paused; resume or resolve it first',
      code: 'draft-write-reserved',
      reservation: 'architecture-saga',
      sagaKind: 'approve',
      recoverable: true,
    }));
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHostElement.textContent).toContain(
        'Proposal settlement failed: accepted narration proposal requires a persisted operation revision',
      );
    });

    findButton(panel, 'Resume approval').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHost.narrationBlocked()).toBe(false);
    });
    await editorHost.flushPendingChanges();

    expect(studio.client.save).toHaveBeenLastCalledWith(
      'draft-1',
      expect.objectContaining({
        opId: 'op-1',
        disposition: 'selection-proposal-accepted',
      }),
    );
    expect(studio.client.narrationProposalResolutions).toContainEqual({
      draftId: 'draft-1',
      operationId: 'op-1',
      decision: 'accepted',
    });
    expect(studio.client.save.mock.calls.some(([, input]) =>
      input.disposition === 'autosave' && input.opId === null)).toBe(false);
  });

  it('queues every overlapping accepted provenance across one saga pause', async () => {
    let rejectRacingSave:
      ((error: DaemonClientError) => void) | undefined;
    const studio = await mountStudio(architectureDraft(), (client) => {
      client.architectureState = {
        ...client.architectureState,
        sections: ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
          key,
          title,
          md: `### ${title}\n\nApproved ${key}.\n`,
        })),
      };
      client.pauseNextArchitectureApproval = true;
      client.save.mockImplementationOnce(() =>
        new Promise((_resolve, reject) => {
          rejectRacingSave = reject;
        }));
    });
    const panel = studio.root.querySelector('app-architecture-panel');
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    if (!editorHostElement) throw new Error('EditorHost was not mounted');
    const editorHost = getDebugNode(editorHostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!editorHost) throw new Error('EditorHost instance was not discoverable');

    await selectText(studio, 'rewrite target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-1.');
    studio.client.resolve('op-1', rewriteResult('first accepted target'));
    let firstProposal: Element | null = null;
    await vi.waitFor(() => {
      studio.tick();
      firstProposal = studio.root.querySelector('.proposal-diff');
      expect(firstProposal?.textContent).toContain('first accepted target');
    });
    findButton(firstProposal, 'Accept').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.save).toHaveBeenCalledOnce();
      expect(rejectRacingSave).toBeTypeOf('function');
    });

    await selectText(studio, 'failure target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-2.');
    studio.client.resolve('op-2', rewriteResult('second accepted target'));
    let secondProposal: Element | null = null;
    await vi.waitFor(() => {
      studio.tick();
      secondProposal = studio.root.querySelector('.proposal-diff');
      expect(secondProposal?.textContent).toContain('second accepted target');
    });
    findButton(secondProposal, 'Accept').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorText(studio)).toContain('second accepted target');
    });

    findButton(panel, 'Approve architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHost.narrationBlocked()).toBe(true);
    });
    rejectRacingSave!(new DaemonClientError(409, {
      error:
        'draft write refused: an architecture saga is paused; resume or resolve it first',
      code: 'draft-write-reserved',
      reservation: 'architecture-saga',
      sagaKind: 'approve',
      recoverable: true,
    }));
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHostElement.textContent).toContain(
        'Proposal settlement failed: accepted narration proposal requires a persisted operation revision',
      );
    });

    findButton(panel, 'Resume approval').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHost.narrationBlocked()).toBe(false);
    });
    await editorHost.flushPendingChanges();

    const acceptedRevisions = studio.client.revisionHistory.filter(
      (revision) => revision.disposition === 'selection-proposal-accepted',
    );
    expect(acceptedRevisions.map(({ opId }) => opId)).toEqual([
      'op-1',
      'op-2',
    ]);
    expect(studio.client.narrationProposalResolutions).toEqual(
      expect.arrayContaining([
        {
          draftId: 'draft-1',
          operationId: 'op-1',
          decision: 'accepted',
        },
        {
          draftId: 'draft-1',
          operationId: 'op-2',
          decision: 'accepted',
        },
      ]),
    );
  });

  it('preserves PI-acceptance provenance across a Reopen pause and settles after Resume', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    let rejectRacingSave:
      ((error: DaemonClientError) => void) | undefined;
    const studio = await mountStudio(productionDraft(), (client) => {
      const approvedSections = ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
        key,
        title,
        md: `### ${title}\n\nApproved ${key}.\n`,
      }));
      client.architectureState = {
        ...client.architectureState,
        sections: approvedSections,
        approvedMd: joinArchitecture(approvedSections),
        approvedAt: '2026-07-24T12:00:00.000Z',
      };
      client.pauseNextArchitectureReopen = true;
      client.save.mockImplementationOnce(() =>
        new Promise((_resolve, reject) => {
          rejectRacingSave = reject;
        }));
    });
    const architecturePanel = studio.root.querySelector(
      'app-architecture-panel',
    );
    const productionPanel = studio.root.querySelector('app-production-panel');
    const editorHostElement = studio.root.querySelector<HTMLElement>(
      'app-editor-host',
    );
    if (!editorHostElement) throw new Error('EditorHost was not mounted');
    const editorHost = getDebugNode(editorHostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!editorHost) throw new Error('EditorHost instance was not discoverable');

    const response = productionPanel!.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Response for PI-001"]',
    )!;
    response.value = 'I noticed it while teaching a friend.';
    response.dispatchEvent(new Event('input', { bubbles: true }));
    studio.tick();
    findButton(productionPanel, 'Integrate supplied response').click();
    await expectDraftSubmission(studio, 'rewrite-selection', 1);
    studio.client.resolve('op-1', rewriteResult('Accepted supplied detail.'));
    await vi.waitFor(() => {
      studio.tick();
      expect(productionPanel?.textContent).toContain(
        'Accepted supplied detail.',
      );
    });
    findButton(productionPanel, 'Accept proposal').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.save).toHaveBeenCalledOnce();
      expect(rejectRacingSave).toBeTypeOf('function');
    });

    findButton(architecturePanel, 'Reopen architecture').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHost.narrationBlocked()).toBe(true);
      expect(architecturePanel?.textContent).toContain(
        'Reopen paused — resume required',
      );
    });
    rejectRacingSave!(new DaemonClientError(409, {
      error:
        'draft write refused: an architecture saga is paused; resume or resolve it first',
      code: 'draft-write-reserved',
      reservation: 'architecture-saga',
      sagaKind: 'reopen',
      recoverable: true,
    }));
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHostElement.textContent).toContain(
        'Proposal settlement failed: accepted narration proposal requires a persisted operation revision',
      );
    });

    findButton(architecturePanel, 'Resume Reopen').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(editorHost.narrationBlocked()).toBe(false);
    });
    await editorHost.flushPendingChanges();

    expect(studio.client.save).toHaveBeenLastCalledWith(
      'draft-1',
      expect.objectContaining({
        opId: 'op-1',
        disposition: 'personal-input-proposal-accepted',
      }),
    );
    expect(studio.client.narrationProposalResolutions).toContainEqual({
      draftId: 'draft-1',
      operationId: 'op-1',
      decision: 'accepted',
    });
    expect(studio.client.save.mock.calls.some(([, input]) =>
      input.disposition === 'autosave' && input.opId === null)).toBe(false);
  });

  it('drives the routed Lessons lifecycle and inspects exact supplied envelope context', async () => {
    const studio = await mountStudio();
    const lessonsLink = Array.from(
      studio.root.querySelectorAll<HTMLAnchorElement>('.masthead a'),
    ).find((link) => link.textContent?.trim() === 'Lessons') ?? null;
    expect(lessonsLink).not.toBeNull();
    lessonsLink!.click();

    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector('app-lessons-page')).not.toBeNull();
      expect(studio.root.textContent).toContain('Decision 1 · proposal-accepted');
    });
    expect(studio.client.distill).not.toHaveBeenCalled();
    const draftSelect = studio.root.querySelector('#lesson-draft');
    const distillButton = findButton(studio.root, 'Distill now');
    expect(
      (draftSelect?.compareDocumentPosition(distillButton) ?? 0)
      & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);

    findButton(studio.root, 'Distill now').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.distill).toHaveBeenCalledWith(
        'draft-1',
        'on-demand',
      );
      expect(studio.root.querySelectorAll('.lesson-card')).toHaveLength(3);
      expect(studio.root.querySelector(
        '[data-testid="distillation-state"]',
      )?.textContent).toContain('Review the proposed lessons');
      expect(studio.root.textContent).toContain(
        'One candidate remains deliberately narrow.',
      );
    });

    const local = studio.root.querySelector('#lesson-lesson-local');
    const localEditor = local?.querySelector<HTMLTextAreaElement>('textarea');
    expect(localEditor?.labels?.[0]?.textContent).toContain(
      'Reviewed lesson text',
    );
    expect(local?.querySelector('a[href="#decision-decision-1"]'))
      .not.toBeNull();
    if (!localEditor) throw new Error('local lesson editor missing');
    localEditor.value = 'Keep every reveal attached to one visible action.';
    localEditor.dispatchEvent(new Event('input', { bubbles: true }));
    findButton(local, 'Save review').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.editLesson).toHaveBeenCalledWith(
        'draft-1',
        'lesson-local',
        1,
        'Keep every reveal attached to one visible action.',
      );
      expect(local?.textContent).toContain('Proposed');
      expect(local?.textContent).toContain('does not approve');
    });
    let localApprove!: HTMLButtonElement;
    await vi.waitFor(() => {
      studio.tick();
      localApprove = findButton(
        studio.root.querySelector('#lesson-lesson-local'),
        'Approve',
      );
      expect(localApprove.disabled).toBe(false);
    });
    localApprove.click();
    studio.tick();
    const localConfirmation = studio.root.querySelector(
      '#lesson-lesson-local',
    );
    expect(localConfirmation?.textContent).toContain('Confirm approve');
    findButton(localConfirmation, 'Confirm approve').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector('#lesson-lesson-local')?.textContent)
        .toContain('Active');
    });

    let rejected = studio.root.querySelector('#lesson-lesson-reject');
    findButton(rejected, 'Reject').click();
    studio.tick();
    rejected = studio.root.querySelector('#lesson-lesson-reject');
    expect(rejected?.textContent).toContain('Confirm reject');
    findButton(rejected, 'Confirm reject').click();
    await vi.waitFor(() => {
      studio.tick();
      rejected = studio.root.querySelector('#lesson-lesson-reject');
      expect(rejected?.getAttribute('data-state')).toBe('rejected');
    });

    let durable = studio.root.querySelector('#lesson-lesson-durable');
    findButton(durable, 'Approve').click();
    studio.tick();
    durable = studio.root.querySelector('#lesson-lesson-durable');
    findButton(durable, 'Confirm approve').click();
    await vi.waitFor(() => {
      studio.tick();
      durable = studio.root.querySelector('#lesson-lesson-durable');
      expect(durable?.textContent).toContain('External reconcile-whp handoff');
      expect(durable?.textContent).toContain(
        'Script Creator does not edit or commit doctrine',
      );
    });
    findButton(durable, 'Copy handoff').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(durable?.textContent).toContain(
        'Copy failed. Select the handoff text and copy it manually.',
      );
    });
    findButton(durable, 'I started external reconciliation').click();
    await vi.waitFor(() => {
      studio.tick();
      durable = studio.root.querySelector('#lesson-lesson-durable');
      expect(durable?.textContent).toContain('awaiting-reconciliation');
    });
    const commit = durable?.querySelector<HTMLInputElement>(
      '#commit-lesson-durable',
    );
    if (!commit) throw new Error('durable verification input missing');
    commit.value = 'external-reconcile-commit';
    commit.dispatchEvent(new Event('input', { bubbles: true }));
    findButton(durable, 'Verify external commit').click();
    await vi.waitFor(() => {
      studio.tick();
      durable = studio.root.querySelector('#lesson-lesson-durable');
      expect(durable?.getAttribute('data-state')).toBe('applied');
      expect(durable?.textContent).toContain(
        'Repository-native current doctrine',
      );
      expect(durable?.textContent).toContain(
        'Repository rule: keep the reveal concrete.',
      );
    });

    const activeLocal = studio.root.querySelector('#lesson-lesson-local');
    findButton(activeLocal, 'Retire').click();
    studio.tick();
    findButton(
      studio.root.querySelector('#lesson-lesson-local'),
      'Confirm retire',
    ).click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector('#lesson-lesson-local')
        ?.getAttribute('data-state')).toBe('retired');
    });

    durable = studio.root.querySelector('#lesson-lesson-durable');
    findButton(durable, 'Retire').click();
    studio.tick();
    durable = studio.root.querySelector('#lesson-lesson-durable');
    findButton(durable, 'Confirm retire').click();
    await vi.waitFor(() => {
      studio.tick();
      durable = studio.root.querySelector('#lesson-lesson-durable');
      expect(durable?.getAttribute('data-state')).toBe('retirement-pending');
      expect(durable?.textContent).toContain(
        'Repository change pending. Current doctrine remains in force.',
      );
    });

    const consoleLink = Array.from(
      studio.root.querySelectorAll<HTMLAnchorElement>('.masthead a'),
    ).find((link) => link.textContent?.trim() === 'Console') ?? null;
    consoleLink!.click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector('app-agent-console')).not.toBeNull();
      expect(studio.root.textContent).toContain('Supplied lessons');
      expect(studio.root.textContent).toContain(
        'Keep every reveal attached to one visible action.',
      );
      expect(studio.root.textContent).toContain(
        'lesson-local · version 3',
      );
      expect(studio.root.textContent).toContain('repository-native');
    });
  });

  it('drives the full production Studio and routed Console surface', async () => {
    const cancelAutosave = vi.spyOn(
      DebouncedAutosave.prototype,
      'cancel',
    );
    const studio = await mountStudio();

    expect(studio.root.querySelector('app-studio-page')).not.toBeNull();
    expect(studio.root.querySelector('app-draft-manager')).not.toBeNull();
    expect(studio.root.querySelector('app-editor-host')).not.toBeNull();
    expect(studio.root.querySelector('app-brief-panel')).not.toBeNull();
    expect(studio.root.querySelector('app-findings-panel')).not.toBeNull();
    expect(studio.root.querySelector('app-parking-lot')).not.toBeNull();

    const editorHost = studio.root.querySelector('app-editor-host');
    expect(
      editorHost?.querySelector('.selection-toolbar'),
      'EditorHost must invoke composeStudio and mount its runtime toolbar',
    ).not.toBeNull();
    expect(
      editorHost?.querySelector('.agent-console-panel'),
      'EditorHost must retain the runtime-created console host',
    ).not.toBeNull();

    await selectText(studio, 'rewrite target');
    expect(toolbar(studio).hidden).toBe(false);
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-1.');

    studio.client.resolve('op-1', rewriteResult('rewritten target'));
    let readyProposal: Element | null = null;
    await vi.waitFor(() => {
      studio.tick();
      readyProposal = studio.root.querySelector('.proposal-diff');
      expect(readyProposal?.textContent).toContain('rewritten target');
    });
    findButton(readyProposal, 'Accept').click();
    studio.tick();
    await vi.waitFor(() => {
      expect(editorText(studio)).toContain('rewritten target');
      expect(editorText(studio)).not.toContain('rewrite target');
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-1',
        decision: 'accepted',
      });
    });

    await selectText(studio, 'failure target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-2.');
    studio.client.resolve('op-2', {
      kind: 'failed',
      error: 'invalid operation result',
    }, {
      state: 'invalid-output',
      error: 'response failed schema validation',
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector(
        '[data-testid="operation-failure"]',
      )?.textContent).toContain('invalid operation result');
    });

    await selectText(studio, 'guardrail target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-3.');
    studio.client.resolve('op-3', {
      kind: 'schema',
      value: {
        status: 'declined',
        replacement_markdown: '',
        guardrail_markdown: 'The request crosses the approved scope.',
      },
      guardrail: 'The request crosses the approved scope.',
    });
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector(
        '[data-testid="operation-guardrail"]',
      )?.textContent).toContain('crosses the approved scope');
    });

    await selectText(studio, 'alternatives target');
    clickToolbar(studio, 'alternatives');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-4.');
    expect(studio.root.querySelector('.proposal-diff')).toBeNull();
    studio.client.resolve('op-4', {
      kind: 'schema',
      value: {
        status: 'complete',
        options: [
          { label: 'Direct', markdown: 'State the rule plainly.' },
          { label: 'Playful', markdown: 'Turn the rule into a toy.' },
        ],
        guardrail_markdown: null,
      },
      guardrail: null,
    });
    const unsettled = await waitForElement(
      studio,
      '[data-testid="unsettled-variant"]',
    );
    const variantId = unsettled.querySelector('strong')?.textContent?.trim();
    expect(variantId).toBeTruthy();
    expect(unsettled.textContent).toContain('Direct');
    expect(unsettled.textContent).toContain('Playful');
    findButton(unsettled, 'Playful').click();
    studio.tick();
    findButton(
      studio.root.querySelector('[data-testid="unsettled-variant"]'),
      'Pick active',
    ).click();
    studio.tick();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector(
        '[data-testid="unsettled-variant"]',
      )).toBeNull();
      expect(studio.root.querySelector(
        'ol[aria-label="Parked variants"]',
      )?.textContent).toContain('State the rule plainly.');
    });
    const editor = getDebugNode(
      studio.root.querySelector('app-editor-host')!,
    )?.componentInstance as EditorHost;
    await editor.flushPendingChanges();
    expect(studio.client.save).toHaveBeenCalledWith(
      'draft-1',
      expect.objectContaining({
        opId: 'op-4',
        disposition: `variant-picked/${
          encodeURIComponent(variantId!)
        }/alternative%3A1`,
      }),
    );

    await selectText(studio, 'review target');
    clickToolbar(studio, 'review');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-5.');
    studio.client.resolve('op-5', {
      kind: 'schema',
      value: {
        status: 'complete',
        findings: [{
          anchor: 'review target',
          severity: 'important',
          finding_markdown: 'Ground this claim in the supplied anchor.',
          optional_direction_markdown: 'Name the concrete rule.',
        }],
        guardrail_markdown: null,
      },
      guardrail: null,
    });
    await vi.waitFor(() => {
      studio.tick();
      const findings = studio.root.querySelector('app-findings-panel');
      expect(findings?.textContent).toContain(
        'Ground this claim in the supplied anchor.',
      );
      expect(findings?.textContent).toContain('Anchored');
    });

    expect(
      Array.from(
        studio.root.querySelectorAll<HTMLButtonElement>(
          'app-brief-panel button',
        ),
      ).some((button) => button.textContent?.trim() === 'Promote'),
    ).toBe(false);

    await selectText(studio, 'reroll target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-6.');
    studio.client.resolve('op-6', rewriteResult('rerolled target'));
    let dispositionProposal: Element | null = null;
    await vi.waitFor(() => {
      studio.tick();
      dispositionProposal = studio.root.querySelector('.proposal-diff');
      expect(dispositionProposal?.textContent).toContain('rerolled target');
      expect(findButton(dispositionProposal, 'Reject', true)).not.toBeNull();
    });
    const prompt = vi.spyOn(globalThis, 'prompt')
      .mockReturnValueOnce('The cadence is too abrupt.')
      .mockReturnValueOnce(null);
    findButton(dispositionProposal, 'Reject').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.narrationProposalResolutions).toContainEqual({
        draftId: 'draft-1',
        operationId: 'op-6',
        decision: 'rejected',
        reason: 'The cadence is too abrupt.',
      });
    });

    await selectText(studio, 'reroll target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-7.');
    studio.client.resolve('op-7', rewriteResult('first reroll candidate'));
    await vi.waitFor(() => {
      studio.tick();
      dispositionProposal = studio.root.querySelector('.proposal-diff');
      expect(dispositionProposal?.textContent).toContain(
        'first reroll candidate',
      );
      expect(findButton(dispositionProposal, 'Re-roll').disabled).toBe(false);
    });
    findButton(dispositionProposal, 'Re-roll').click();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.client.resumeDraftOp).toHaveBeenCalledWith(
        'draft-1',
        'op-7',
        expect.anything(),
        null,
      );
    });
    expect(prompt).toHaveBeenCalledTimes(2);
    await expectEmbeddedConsole(studio, 'Working on op-8.');
    studio.client.resolve('op-8', rewriteResult('second reroll candidate'));
    await waitForElement(studio, '.proposal-diff');

    const cancelsBeforeDetach = cancelAutosave.mock.calls.length;
    await studio.router.navigateByUrl('/console');
    studio.tick();
    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector('app-agent-console-page')).not.toBeNull();
      expect(studio.root.textContent).toContain('op-8');
      expect(studio.root.textContent).toContain('Working on op-8.');
    });
    const routedReroll = findButton(
      studio.root.querySelector('app-agent-console .actions'),
      'Re-roll',
    );
    expect(routedReroll.disabled).toBe(true);
    expect(cancelAutosave.mock.calls.length)
      .toBeGreaterThan(cancelsBeforeDetach);
    expect(studio.client.resume).not.toHaveBeenCalled();
    expect(studio.root.querySelectorAll(
      'app-agent-console nav button',
    ).length).toBeGreaterThanOrEqual(6);
  });

  it('renders verbatim Base, Current, and Proposed for an intervening-edit conflict', async () => {
    const studio = await mountStudio();
    await selectText(studio, 'conflict target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);

    await replaceRenderedText(
      studio,
      'conflict target',
      'current edited target',
    );
    studio.client.resolve('op-1', rewriteResult('proposed target'));

    let conflict: Element | null = null;
    await vi.waitFor(() => {
      studio.tick();
      conflict = studio.root.querySelector('.proposal-diff.is-conflicted');
      expect(labeledConflictValues(conflict!)).toEqual({
        Base: 'conflict target',
        Current: 'current edited target',
        Proposed: 'proposed target',
      });
    });
    expect(labeledConflictValues(conflict)).toEqual({
      Base: 'conflict target',
      Current: 'current edited target',
      Proposed: 'proposed target',
    });
    expect(findButton(conflict, 'Accept').disabled).toBe(true);
  });

  it('renders the same three-way conflict when a lock overlaps the proposal', async () => {
    const studio = await mountStudio();
    await selectText(studio, 'lock target');
    clickToolbar(studio, 'lock');
    await selectText(studio, 'lock target');
    clickToolbar(studio, 'rewrite');
    await expectPending(studio, true);
    await expectEmbeddedConsole(studio, 'Working on op-1.');
    studio.client.resolve('op-1', rewriteResult('locked proposal'));

    const conflict = await waitForElement(
      studio,
      '.proposal-diff.is-conflicted',
    );
    expect(labeledConflictValues(conflict)).toEqual({
      Base: 'lock target',
      Current: 'lock target',
      Proposed: 'locked proposal',
    });
    expect(findButton(conflict, 'Accept').disabled).toBe(true);
  });

  it('shows a launch callout when an opened draft has no stored phase', async () => {
    const draft = studioDraft();
    draft.doc['metadata'] = {
      ...(draft.doc['metadata'] as Record<string, unknown>),
      creativeStatus: {},
    };
    const studio = await mountStudio(draft);
    await selectText(studio, 'rewrite target');
    clickToolbar(studio, 'rewrite');

    await vi.waitFor(() => {
      studio.tick();
      expect(studio.root.querySelector('[role="alert"]')?.textContent)
        .toContain(
          'Set the creative phase in Episode brief before launching an operation.',
        );
    });
    expect(studio.client.submitOp).not.toHaveBeenCalled();
  });

  it('clears the unsaved badge only after a superseding retry persists', async () => {
    const studio = await mountStudio();
    vi.useFakeTimers();
    const persist = studio.client.save.getMockImplementation();
    if (!persist) throw new Error('the controllable save implementation is unavailable');
    const attempts: string[] = [];
    let persistNewestRetry!: () => void;
    studio.client.save.mockImplementation(async (id, input) => {
      const serialized = JSON.stringify(input.doc);
      const snapshot = serialized.includes('newest autosave target')
        ? 'newest'
        : 'first';
      attempts.push(snapshot);
      if (attempts.length <= 2) {
        throw new DaemonClientError(503, { error: 'daemon unavailable' });
      }
      await new Promise<void>((resolve) => {
        persistNewestRetry = resolve;
      });
      return persist(id, input);
    });

    await replaceRenderedText(
      studio,
      'rewrite target',
      'first autosave target',
    );
    studio.tick();
    const hostElement = studio.root.querySelector<HTMLElement>('app-editor-host');
    if (!hostElement) throw new Error('EditorHost was not mounted');
    const host = getDebugNode(hostElement)?.componentInstance as
      | EditorHost
      | undefined;
    if (!host) throw new Error('EditorHost instance was not discoverable');
    expect(host.unsaved()).toBe(true);
    expect(hostElement.querySelector('[data-testid="unsaved-badge"]')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(1_000);
    studio.tick();
    expect(attempts).toEqual(['first']);
    expect(host.saving()).toBe(true);
    expect(host.unsaved()).toBe(true);

    await replaceRenderedText(
      studio,
      'first autosave target',
      'newest autosave target',
    );
    await vi.advanceTimersByTimeAsync(0);
    studio.tick();
    expect(attempts).toEqual(['first', 'newest']);
    expect(host.saving()).toBe(true);
    expect(host.unsaved()).toBe(true);
    expect(hostElement.querySelector('[data-testid="unsaved-badge"]')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(1_000);
    studio.tick();
    expect(attempts).toEqual(['first', 'newest', 'newest']);
    expect(host.saving()).toBe(true);
    expect(host.unsaved()).toBe(true);
    expect(hostElement.querySelector('[data-testid="unsaved-badge"]')).not.toBeNull();

    persistNewestRetry();
    await vi.waitFor(() => {
      studio.tick();
      expect(host.saving()).toBe(false);
      expect(host.unsaved()).toBe(false);
      expect(hostElement.querySelector('[data-testid="unsaved-badge"]')).toBeNull();
    });
  });
});

async function mountStudio(
  draft = studioDraft(),
  configureClient: (client: ControllableDaemonClient) => void =
    () => {},
): Promise<MountedStudio> {
  if (!appResourcesResolved) {
    await ɵresolveComponentResources(async (url) =>
      url.endsWith('app.html') ? appTemplate : appStyles);
    appResourcesResolved = true;
  }
  if (!signalInputsHydrated) {
    // Vitest transpiles TypeScript without Angular's AOT input transform. Hydrate
    // only the signal-input metadata so the real production component tree can
    // bind and run under JIT in jsdom.
    hydrateSignalInputs(BriefPanel, ['model', 'gate', 'showPromote']);
    hydrateSignalInputs(FindingsPanel, ['findings']);
    hydrateSignalInputs(ParkingLot, ['model']);
    hydrateSignalInputs(RevisionTimeline, ['manager']);
    hydrateSignalInputs(DraftTransfer, ['manager']);
    hydrateSignalInputs(EditorHost, [
      'draft',
      'client',
      'session',
      'wpm',
      'narrationBlocked',
      'architectureModel',
    ]);
    hydrateSignalOutputs(EditorHost, ['architectureConflict']);
    hydrateSignalInputs(AgentConsole, ['model', 'client']);
    hydrateSignalInputs(LessonsPanel, ['model']);
    hydrateSignalInputs(MilestonePanel, ['draft', 'client']);
    hydrateSignalInputs(ArchitecturePanel, ['model', 'draft', 'version']);
    hydrateSignalInputs(NarrationActions, [
      'model',
      'draft',
      'client',
      'editor',
      'version',
    ]);
    hydrateSignalInputs(ProductionPanel, [
      'draft',
      'client',
      'editor',
      'architectureModel',
    ]);
    hydrateSignalOutputs(ProductionPanel, ['architectureConflict']);
    hydrateSignalOutputs(ArchitecturePanel, ['changed', 'workflowChanged']);
    hydrateSignalOutputs(NarrationActions, ['changed']);
    hydrateSignalInputs(DraftManagerComponent, ['client', 'session']);
    const draftManagerDefinition = ɵgetComponentDef(DraftManagerComponent);
    if (!draftManagerDefinition) {
      throw new Error('DraftManager component definition is unavailable');
    }
    draftManagerDefinition.viewQuery = (
      renderFlags: number,
      instance: DraftManagerComponent,
    ) => {
      if (renderFlags & 1) {
        ɵɵviewQuerySignal(instance.editorHost, EditorHost, 5);
      }
    };
    signalInputsHydrated = true;
  }
  globalThis.history.replaceState(null, '', '/');
  const client = new ControllableDaemonClient(draft);
  configureClient(client);
  const session = new StudioSession(client as unknown as DaemonClient);
  const application = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      { provide: STUDIO_SESSION, useValue: session },
    ],
  });
  const root = document.createElement('app-root');
  document.body.append(root);
  const component = createComponent(App, {
    environmentInjector: application.injector,
    hostElement: root,
  });
  application.attachView(component.hostView);
  const router = application.injector.get(Router);
  const studio: MountedStudio = {
    application,
    component,
    root,
    router,
    client,
    session,
    tick: () => {
      application.tick();
      component.changeDetectorRef.detectChanges();
    },
    destroy: () => {
      application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      root.remove();
    },
  };
  mounted.push(studio);
  await router.navigateByUrl('/');
  studio.tick();
  await vi.waitFor(() => {
    studio.tick();
    expect(client.list).toHaveBeenCalled();
    expect(root.querySelector('.draft-card')).not.toBeNull();
  });
  root.querySelector<HTMLButtonElement>('.draft-card')!.click();
  await vi.waitFor(() => {
    studio.tick();
    expect(client.get).toHaveBeenCalledWith(draft.id);
    expect(root.querySelector('app-editor-host .ProseMirror')).not.toBeNull();
    expect(root.querySelector('app-architecture-panel')).not.toBeNull();
    expect(root.querySelector('app-narration-actions')).not.toBeNull();
    expect(root.querySelector('app-brief-panel')).not.toBeNull();
    expect(root.querySelector('app-findings-panel')).not.toBeNull();
    expect(root.querySelector('app-parking-lot')).not.toBeNull();
  });
  return studio;
}

function hydrateSignalInputs(
  component: object,
  names: string[],
): void {
  const definition = ɵgetComponentDef(component as never);
  if (!definition) throw new Error('Angular component definition is unavailable');
  const inputs = { ...definition.inputs };
  const declaredInputs = { ...definition.declaredInputs };
  for (const name of names) {
    inputs[name] = [name, 1, null];
    declaredInputs[name] = name;
  }
  definition.inputs = inputs;
  definition.declaredInputs = declaredInputs;
}

function hydrateSignalOutputs(
  component: object,
  names: string[],
): void {
  const definition = ɵgetComponentDef(component as never);
  if (!definition) throw new Error('Angular component definition is unavailable');
  const outputs = { ...definition.outputs };
  for (const name of names) outputs[name] = name;
  definition.outputs = outputs;
}

async function selectText(
  studio: MountedStudio,
  text: string,
): Promise<void> {
  const editor = studio.root.querySelector<HTMLElement>('.ProseMirror');
  if (!editor) throw new Error('the production ProseMirror surface was not mounted');
  const match = findTextNode(editor, text);
  if (!match) throw new Error(`text "${text}" was not found in the editor`);
  const range = document.createRange();
  range.setStart(match.node, match.offset);
  range.setEnd(match.node, match.offset + text.length);
  editor.focus();
  const selection = globalThis.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
  editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

  await vi.waitFor(() => {
    studio.tick();
    expect(toolbar(studio).hidden).toBe(false);
  });
}

async function replaceRenderedText(
  studio: MountedStudio,
  current: string,
  replacement: string,
): Promise<void> {
  const editor = studio.root.querySelector<HTMLElement>('.ProseMirror')!;
  const match = findTextNode(editor, current);
  if (!match) throw new Error(`text "${current}" was not found in the editor`);
  match.node.data = [
    match.node.data.slice(0, match.offset),
    replacement,
    match.node.data.slice(match.offset + current.length),
  ].join('');
  editor.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: replacement,
  }));
  await vi.waitFor(() => {
    studio.tick();
    expect(editorText(studio)).toContain(replacement);
    expect(editorText(studio)).not.toContain(current);
  });
}

function toolbar(studio: MountedStudio): HTMLDivElement {
  const element = studio.root.querySelector<HTMLDivElement>(
    'app-editor-host .selection-toolbar',
  );
  if (!element) throw new Error('composeStudio did not mount the selection toolbar');
  return element;
}

function clickToolbar(
  studio: MountedStudio,
  action: string,
): void {
  const button = toolbar(studio).querySelector<HTMLButtonElement>(
    `button[data-action="${action}"]`,
  );
  if (!button) throw new Error(`toolbar action ${action} was not rendered`);
  button.click();
  studio.tick();
}

async function expectPending(
  studio: MountedStudio,
  expected: boolean,
): Promise<void> {
  await vi.waitFor(() => {
    studio.tick();
    expect(Boolean(studio.root.querySelector(
      '[data-testid="selection-operation-pending"]',
    ))).toBe(expected);
  });
}

async function expectEmbeddedConsole(
  studio: MountedStudio,
  text: string,
): Promise<void> {
  await vi.waitFor(() => {
    studio.tick();
    expect(Array.from(studio.root.querySelectorAll(
      '[data-testid="console-operation"]',
    )).some((entry) => entry.textContent?.includes(text))).toBe(true);
  });
}

async function waitForElement(
  studio: MountedStudio,
  selector: string,
): Promise<Element> {
  let element: Element | null = null;
  await vi.waitFor(() => {
    studio.tick();
    element = studio.root.querySelector(selector);
    expect(element).not.toBeNull();
  });
  return element!;
}

function findTextNode(
  root: Node,
  text: string,
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (
    let node = walker.nextNode();
    node !== null;
    node = walker.nextNode()
  ) {
    const offset = node.textContent?.indexOf(text) ?? -1;
    if (node instanceof Text && offset >= 0) return { node, offset };
  }
  return null;
}

function findButton(
  element: Element | null,
  label: string,
): HTMLButtonElement;
function findButton(
  element: Element | null,
  label: string,
  optional: true,
): HTMLButtonElement | null;
function findButton(
  element: Element | null,
  label: string,
  optional = false,
): HTMLButtonElement | null {
  const button = Array.from(
    element?.querySelectorAll<HTMLButtonElement>('button') ?? [],
  ).find((candidate) =>
    candidate.textContent?.replace(/\s+/gu, ' ').trim().startsWith(label));
  if (optional) return button ?? null;
  if (!button) throw new Error(`button ${label} was not rendered`);
  return button;
}

function labeledConflictValues(
  conflict: Element,
): Record<string, string> {
  return Object.fromEntries(
    Array.from(conflict.querySelectorAll<HTMLElement>('[data-conflict-value]'))
      .map((element) => [
        element.dataset['conflictValue'] ?? '',
        element.textContent ?? '',
      ]),
  );
}

function editorText(studio: MountedStudio): string {
  return studio.root.querySelector('.ProseMirror')?.textContent ?? '';
}

function rewriteResult(replacement: string): OperationResult {
  return {
    kind: 'schema',
    value: {
      status: 'complete',
      replacement_markdown: replacement,
      guardrail_markdown: null,
    },
    guardrail: null,
  };
}

function studioDraft(): DraftRecord {
  return {
    id: 'draft-1',
    episodeSlug: 'composition-net',
    title: 'Composition net',
    format: 'narration',
    updatedAt: '2026-07-23T12:00:00.000Z',
    doc: {
      type: 'doc',
      attrs: { format: 'narration', preamble: '' },
      metadata: {
        topic: 'Why constraints create play',
        anchors: ['Players accept the rule.'],
        unknowns: ['Which example survives review?'],
        approvedLessons: ['Keep the language concrete.'],
        creativeStatus: { phase: 'rapid-prototype' },
        directionApproved: false,
      },
      content: [{
        type: 'beat',
        attrs: {
          beatId: 'beat-1',
          title: 'The test beat',
          timeTargetMs: 30_000,
          narrativeJob: 'Turn the example into the larger question.',
        },
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: [
              'rewrite target',
              'failure target',
              'guardrail target',
              'alternatives target',
              'review target',
              'reroll target',
              'conflict target',
              'lock target',
            ].join('. ') + '.',
          }],
        }],
      }],
    },
  };
}

function learningDecisionFixture(draftId: string): LearningDecision {
  return {
    id: 'decision-1',
    draftId,
    seq: 1,
    kind: 'proposal-accepted',
    disposition: 'selection-proposal-accepted',
    sourceTimestamp: '2026-07-24T09:30:00.000Z',
    createdAt: '2026-07-24T09:30:00.000Z',
    note: 'The concrete reveal survived.',
    context: {
      source: {
        type: 'revision',
        id: 'revision-accepted-1',
        disposition: 'selection-proposal-accepted',
      },
    },
  };
}

function learningLessonFixtures(draftId: string): LessonDetail[] {
  const decision = learningDecisionFixture(draftId);
  const base = {
    draftId,
    distillationRunId: 'distillation-1',
    state: 'proposed' as const,
    proposedTarget: null,
    supersedesLessonId: null,
    version: 1,
    repositoryCommit: null,
    repositoryPath: null,
    repositoryAnchor: null,
    repositoryContentHash: null,
    createdAt: '2026-07-24T10:05:01.000Z',
    updatedAt: '2026-07-24T10:05:01.000Z',
    evidenceIds: [decision.id],
    evidence: [{
      id: decision.id,
      status: 'resolved' as const,
      decision,
    }],
    reconciliation: null,
    reconciliationHistory: [],
    repositoryProvenance: null,
  };
  return [
    {
      ...base,
      id: 'lesson-local',
      classification: 'episode-local',
      proposedMarkdown: 'Keep the reveal attached to a visible action.',
      reviewedMarkdown: 'Keep the reveal attached to a visible action.',
      rationaleMarkdown: 'The accepted revision became clearer through action.',
      currentMarkdown: 'Keep the reveal attached to a visible action.',
    },
    {
      ...base,
      id: 'lesson-reject',
      classification: 'episode-local',
      proposedMarkdown: 'Always begin with a question.',
      reviewedMarkdown: 'Always begin with a question.',
      rationaleMarkdown: 'One opening happened to use a question.',
      currentMarkdown: 'Always begin with a question.',
    },
    {
      ...base,
      id: 'lesson-durable',
      classification: 'durable',
      proposedMarkdown: 'Test abstract reveals against one concrete action.',
      reviewedMarkdown: 'Test abstract reveals against one concrete action.',
      rationaleMarkdown: 'This pattern may apply across future episodes.',
      proposedTarget:
        '.agents/skills/writing-whp-youtube-scripts/SKILL.md',
      currentMarkdown: 'Test abstract reveals against one concrete action.',
    },
  ];
}

function reconciliationFixture(
  lessonId: string,
  kind: 'apply' | 'retire' | 'supersede',
): LessonReconciliation {
  return {
    id: `reconciliation-${lessonId}-${kind}`,
    lessonId,
    kind,
    state: 'prepared',
    resumeKey: `opaque-${lessonId}-${kind}`,
    preparedMarkdown: [
      '# Proposed WHP lesson reconciliation',
      '',
      'This is a proposal supported by decision-1.',
      'Run `$reconcile-whp`; Script Creator has not edited or committed doctrine.',
    ].join('\n'),
    repositoryCommit: null,
    paths: [],
    anchors: [],
    contentHashes: [],
    createdAt: '2026-07-24T10:10:00.000Z',
    updatedAt: '2026-07-24T10:10:00.000Z',
    verifiedAt: null,
  };
}

function cloneLesson(lesson: LessonDetail): LessonDetail {
  return {
    ...lesson,
    evidenceIds: [...lesson.evidenceIds],
    evidence: lesson.evidence.map((evidence) => ({
      ...evidence,
      decision: evidence.decision
        ? {
            ...evidence.decision,
            context: {
              ...evidence.decision.context,
              source: { ...evidence.decision.context.source },
            },
          }
        : null,
    })),
    reconciliation: lesson.reconciliation
      ? {
          ...lesson.reconciliation,
          paths: [...lesson.reconciliation.paths],
          anchors: [...lesson.reconciliation.anchors],
          contentHashes: [...lesson.reconciliation.contentHashes],
        }
      : null,
    reconciliationHistory: lesson.reconciliationHistory.map(
      (record) => ({
        ...record,
        paths: [...record.paths],
        anchors: [...record.anchors],
        contentHashes: [...record.contentHashes],
      }),
    ),
    repositoryProvenance: lesson.repositoryProvenance
      ? { ...lesson.repositoryProvenance }
      : null,
  };
}

function draftSummary(draft: DraftRecord): Omit<DraftRecord, 'doc'> {
  const { doc: _doc, ...summary } = draft;
  return summary;
}

function pendingMilestoneFixture(
  draft: DraftRecord,
  id: string,
  commitMessage: string,
): PendingMilestone {
  const file = `whp-youtube/architectures/${draft.episodeSlug}.md`;
  return {
    id,
    draftId: draft.id,
    episodeSlug: draft.episodeSlug,
    kind: 'architecture-approval',
    files: [file],
    commitMessage,
    sourceHashes: { [file]: `hash-${id}` },
    baseCommitHash: `base-${id}`,
    reconciliationRequired: true,
    state: 'pending',
    resultingCommitHash: null,
    createdAt: '2026-07-24T09:00:00.000Z',
    updatedAt: '2026-07-24T09:00:00.000Z',
    diffSummary: `${file} | 1 +`,
  };
}

function completedOperation(
  id: string,
  overrides: Partial<OperationRecord> = {},
): OperationRecord {
  return {
    id,
    operation: 'rewrite-selection',
    state: 'completed',
    stalled: false,
    envelopeJson: '{}',
    jobDir: `/tmp/${id}`,
    threadId: `thread-${id}`,
    retryOf: null,
    resumedFrom: null,
    createdAt: '2026-07-23T12:00:00.000Z',
    startedAt: '2026-07-23T12:00:00.000Z',
    finishedAt: '2026-07-23T12:00:01.000Z',
    inputTokens: 10,
    cachedInputTokens: 0,
    outputTokens: 5,
    reasoningOutputTokens: 0,
    usageAvailable: 1,
    error: null,
    ...overrides,
  };
}

function operationSummary(operation: OperationRecord): OperationSummary {
  return {
    id: operation.id,
    operation: operation.operation,
    state: operation.state,
    createdAt: operation.createdAt,
    finishedAt: operation.finishedAt,
    stalled: operation.stalled,
    usageAvailable: operation.usageAvailable,
    inputTokens: operation.inputTokens,
    cachedInputTokens: operation.cachedInputTokens,
    outputTokens: operation.outputTokens,
    reasoningOutputTokens: operation.reasoningOutputTokens,
  };
}

function generatedArchitectureMarkdown(): string {
  return [
    ...ARCHITECTURE_SECTIONS.map(({ key, title }) =>
      `### ${title}\n\nGenerated ${key}.\n`),
    [
      '### Optional comparison',
      '',
      '<img src=x onerror="globalThis.__unsafe = true">',
      '',
    ].join('\n'),
  ].join('');
}

function generatedNarrationMarkdown(narration: string): string {
  return [
    '# Generated episode',
    '',
    '## 1. Opening',
    '',
    `> ${narration}`,
    '',
  ].join('\n');
}

function architectureDraft(): DraftRecord {
  const draft = studioDraft();
  setDraftPhase(draft, 'architecture');
  return draft;
}

function productionDraft(): DraftRecord {
  const draft = studioDraft();
  draft.format = 'narration';
  draft.doc = {
    ...parseProductionFixture(),
    metadata: {
      topic: 'Why constraints create play',
      anchors: ['Players accept the rule.'],
      unknowns: ['Which example survives?'],
      approvedLessons: ['Keep it concrete.'],
      creativeStatus: {
        phase: 'creative-approved',
        readiness: 'EDITORIAL-DRAFT',
      },
      directionApproved: false,
    },
  };
  return draft;
}

function pendingNarrationProposal(operationId: string): {
  draftId: string;
  operationId: string;
  state: 'pending';
  createdAt: string;
  resolvedAt: null;
  acceptedRevisionPresent: boolean;
} {
  return {
    draftId: 'draft-1',
    operationId,
    state: 'pending',
    createdAt: '2026-07-24T13:00:00.000Z',
    resolvedAt: null,
    acceptedRevisionPresent: false,
  };
}

function approvedArchitectureState(
  state: ArchitectureState,
): ArchitectureState {
  const sections = ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
    key,
    title,
    md: `### ${title}\n\nApproved ${key}.\n`,
  }));
  return {
    ...state,
    sections,
    approvedMd: joinArchitecture(sections),
    approvedAt: '2026-07-24T12:00:00.000Z',
    pendingSaga: null,
  };
}

function pausedReopenArchitectureState(
  state: ArchitectureState,
): ArchitectureState {
  return {
    ...state,
    approvedMd: null,
    approvedAt: null,
    revisionSeq: state.revisionSeq + 1,
    narrationReconciliationRequired: true,
    pendingSaga: {
      kind: 'reopen',
      resumeKey: 'remote-reopen-resume-key',
      steps: {
        revisionAppended: 'completed',
        artifactWritten: 'completed',
        pipelineUpserted: 'pending',
        draftUpdated: 'pending',
      },
      createdAt: '2026-07-24T15:00:00.000Z',
      updatedAt: '2026-07-24T15:00:00.000Z',
    },
  };
}

function architectureReservationError(
  state: ArchitectureState,
): DaemonClientError {
  return new DaemonClientError(409, {
    error:
      'draft write refused: an architecture saga is paused; resume or resolve it first',
    code: 'draft-write-reserved',
    reservation: 'architecture-saga',
    sagaKind: state.pendingSaga?.kind,
    recoverable: true,
    state: cloneArchitectureState(state),
  });
}

async function expectRoutedReopenRecovery(
  studio: MountedStudio,
  architecturePanel: Element | null,
  editorHostElement: HTMLElement | null,
): Promise<void> {
  await vi.waitFor(() => {
    studio.tick();
    expect(architecturePanel?.textContent).toContain(
      'Reopen paused — resume required',
    );
    expect(findButton(architecturePanel, 'Resume Reopen').disabled).toBe(false);
    expect(editorHostElement?.textContent).toContain(
      'Architecture action paused — resume or resolve first.',
    );
    expect(editorHostElement?.querySelector('.ProseMirror')
      ?.getAttribute('contenteditable')).toBe('false');
  });
}

function parseProductionFixture(
  personalInputCompleted = false,
): DraftDocument {
  const markdown = [
    '# Production fixture',
    '',
    '## 1. Opening',
    '',
    '> Opening narration.',
    ...(personalInputCompleted
      ? ['> Martin supplied exact narration.']
      : ['> <!-- PI-001: Martin input -->']),
    '> Closing narration.',
    '',
    '## Appendix',
    '',
    '### Script metadata',
    '',
    '- **Status:** RESEARCH-DRAFT',
    '- **Title:** Production fixture',
    '',
    '### Beat 01 — Opening',
    '',
    '- **Time:** 00:00–00:30',
    '',
    '#### Story function',
    '',
    'Open the question.',
    '',
    '#### Personal input',
    '',
    '- **ID:** PI-001',
    `- **Decision:** ${
      personalInputCompleted ? 'COMPLETED' : 'INPUT-REQUESTED'
    }`,
    '- **Story purpose:** Ground the question in a truthful moment.',
    '- **Primary prompt:** What exact moment changed your view?',
    '- **Follow-up prompts:** What did you see; what did you assume?',
    '- **Bridge in:** Exact stored bridge in.',
    '- **Bridge out:** Exact stored bridge out.',
    '- **Personal visuals:** Exact stored visual note.',
    '- **Omit when:** Exact stored omit condition.',
    '',
    '#### Viewer application',
    '',
    '- **Insight:** A bounded insight.',
    '',
    '### Editorial audit',
    '',
    '- Exact audit text.',
    '',
    '### References and source materials',
    '',
    '#### Evidence references',
    '',
    '##### F-001 — Source',
    '',
    '- **Status:** VERIFIED',
    '',
    '### Unrecognized production note',
    '',
    'Preserve this unknown section exactly.',
  ].join('\n');
  return parseMarkdown(markdown).toJSON() as DraftDocument;
}

function setDraftPhase(draft: DraftRecord, phase: string): void {
  const metadata = draft.doc['metadata'] as Record<string, unknown>;
  metadata['creativeStatus'] = {
    ...metadata['creativeStatus'] as Record<string, unknown>,
    phase,
  };
}

function readDraftPhase(draft: DraftRecord): unknown {
  return ((draft.doc['metadata'] as Record<string, unknown>)
    ['creativeStatus'] as Record<string, unknown>)['phase'];
}

function readDraftReadiness(draft: DraftRecord): unknown {
  return ((draft.doc['metadata'] as Record<string, unknown>)
    ['creativeStatus'] as Record<string, unknown>)['readiness'];
}

function cloneArchitectureState(
  state: ArchitectureState,
): ArchitectureState {
  return {
    ...state,
    sections: state.sections.map((section) => ({ ...section })),
    pendingSaga: state.pendingSaga
      ? {
          ...state.pendingSaga,
          steps: { ...state.pendingSaga.steps },
        }
      : null,
  };
}

function completedArchitectureAction(
  state: ArchitectureState,
): ArchitectureActionResult {
  return {
    complete: true,
    steps: {
      revisionAppended: 'completed',
      artifactWritten: 'completed',
      pipelineUpserted: 'completed',
      draftUpdated: 'completed',
    },
    state: cloneArchitectureState(state),
  };
}

async function expectDraftSubmission(
  studio: MountedStudio,
  operation: OperationName,
  count: number,
): Promise<void> {
  await vi.waitFor(() => {
    studio.tick();
    expect(
      studio.client.draftSubmissions.filter(
        (submission) => submission.operation === operation,
      ),
      `${operation} draft submissions; panel text: ${
        studio.root.querySelector('app-architecture-panel')?.textContent
      }`,
    ).toHaveLength(count);
  });
}

function setInputValue(
  element: Element | null,
  value: string,
): void {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error('input was not rendered');
  }
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function domRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    top: 0,
    right: 1,
    bottom: 1,
    left: 0,
    toJSON: () => ({}),
  };
}

function domRectList(): DOMRectList {
  const rect = domRect();
  return {
    0: rect,
    length: 1,
    item: (index: number) => index === 0 ? rect : null,
    [Symbol.iterator]: function* () {
      yield rect;
    },
  };
}
