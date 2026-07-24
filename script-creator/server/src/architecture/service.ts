import { createHash, randomUUID } from 'node:crypto';
import {
  ARCHITECTURE_SECTIONS,
  joinArchitecture,
  renderApprovedArchitecture,
  splitArchitecture,
  type ArchitectureSection,
} from './codec.js';
import {
  ExportBlockedError,
  exportDocumentMarkdown,
  hasNarration,
  importProductionMarkdown,
  readCreativePhase,
  readCreativeStatus,
  withCreativePhase,
} from '../documents/service.js';
import {
  DraftWriteReservationError,
  type ArchitectureSagaAction,
  type ArchitectureSagaRecord,
  type DocumentStore,
  type DraftArchitecture,
  type DraftRecord,
  type NarrationProposalRecord,
  type PromotionRecord,
  type RevisionRecord,
} from '../documents/store.js';
import type { OperationName } from '../operations/registry.js';
import type { OperationServiceResult } from '../operations/service.js';
import type {
  ArtifactExpectedState,
  ArtifactReadResult,
  ArtifactWriteResult,
  PipelineRow,
} from '../repo/artifacts.js';
import type {
  MilestoneKind,
  PendingMilestone,
} from '../repo/milestones.js';

export interface ArchitectureState extends DraftArchitecture {
  revisionSeq: number;
  narrationReconciliationRequired: boolean;
  pendingSaga: ArchitectureSagaState | null;
}

export interface ArchitectureSagaState {
  kind: ArchitectureSagaAction;
  resumeKey: string;
  steps: ArchitectureActionSteps;
  createdAt: string;
  updatedAt: string;
}

export interface SaveArchitectureInput {
  expectedRevisionSeq: number;
  sections: ArchitectureSection[];
  opId: string | null;
  disposition: string;
}

export interface SavedArchitecture {
  state: ArchitectureState;
  revision: RevisionRecord;
}

export interface ArchitectureActionSteps {
  revisionAppended: 'pending' | 'completed';
  artifactWritten: 'pending' | 'completed';
  pipelineUpserted: 'pending' | 'completed';
  draftUpdated: 'pending' | 'completed';
}

export interface ArchitectureActionResult {
  complete: boolean;
  steps: ArchitectureActionSteps;
  state: ArchitectureState;
}

interface ArchitectureOperationService {
  submit(
    operation: OperationName,
    inputs: unknown,
    options?: { resumeOf?: string; cwd?: string },
  ): string;
  submitDraftScoped?(
    operation: OperationName,
    inputs: unknown,
    approvedLessons: string[],
    options?: { resumeOf?: string; cwd?: string },
  ): string;
  get(id: string): { operation: OperationName };
  result?(id: string): OperationServiceResult;
}

interface ArchitectureWorkspaceService {
  workspacePath(draftId: string): string;
  recordPending(input: {
    draftId: string;
    kind: MilestoneKind;
    files: string[];
    reconciliationRequired: boolean;
  }): Promise<PendingMilestone>;
}

interface ArchitectureLearningService {
  captureRevision(revision: RevisionRecord): unknown;
  captureProposalDisposition(input: {
    draftId: string;
    operationId: string;
    decision: 'accepted' | 'rejected' | 'rerolled';
    reason: string | null;
    successorOperationId: string | null;
    resolvedAt: string;
  }): unknown;
  captureArchitectureRejection(input: {
    draftId: string;
    operationId: string;
    reason: string | null;
    resolvedAt: string;
  }): unknown;
  activeEpisodeLessons?(draftId: string): Array<{
    id: string;
    version: number;
    markdown: string;
    contentHash: string;
  }>;
  recordOperationLessons?(
    operationId: string,
    lessons: Array<{
      id: string;
      version: number;
      markdown: string;
      contentHash: string;
    }>,
  ): unknown;
}

interface ArchitectureArtifactService {
  write(
    path: string,
    content: string,
    expectedState: ArtifactExpectedState,
  ): Promise<ArtifactWriteResult>;
  upsertPipelineRow(row: PipelineRow): Promise<ArtifactWriteResult>;
  read?(path: string): Promise<ArtifactReadResult> | ArtifactReadResult;
  writeProduction?(
    path: string,
    content: string,
    expectedState: ArtifactExpectedState,
  ): Promise<ArtifactWriteResult>;
}

export class ArchitectureRevisionConflictError extends Error {
  readonly current: ArchitectureState;

  constructor(current: ArchitectureState) {
    super('architecture revision conflict');
    this.name = 'ArchitectureRevisionConflictError';
    this.current = current;
  }
}

export class ArchitectureGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchitectureGateError';
  }
}

export class NarrationRevisionConflictError extends Error {
  readonly current: DraftRecord;

  constructor(current: DraftRecord) {
    super('narration revision conflict');
    this.name = 'NarrationRevisionConflictError';
    this.current = current;
  }
}

export class ProductionSyncConflictError extends Error {
  readonly currentHash: string | 'absent';
  readonly parked?: string[];

  constructor(
    conflict: Extract<ArtifactWriteResult, { conflict: true }>,
  ) {
    super('production synchronization conflict');
    this.name = 'ProductionSyncConflictError';
    this.currentHash = conflict.currentHash;
    this.parked = conflict.parked;
  }
}

export class ArchitectureArtifactConflictError extends Error {
  readonly currentHash: string | 'absent';
  readonly parked?: string[];
  readonly steps: ArchitectureActionSteps;
  readonly state: ArchitectureState;

  constructor(
    message: string,
    conflict: Extract<ArtifactWriteResult, { conflict: true }>,
    result: ArchitectureActionResult,
  ) {
    super(message);
    this.name = 'ArchitectureArtifactConflictError';
    this.currentHash = conflict.currentHash;
    this.parked = conflict.parked;
    this.steps = result.steps;
    this.state = result.state;
  }
}

const SCOPED_NARRATION_OPERATIONS = new Set<OperationName>([
  'generate-scoped',
  'review',
  'rewrite-selection',
  'generate-alternatives',
]);

const NARRATION_OPERATIONS = new Set<OperationName>([
  ...SCOPED_NARRATION_OPERATIONS,
  'generate-episode',
  'promote',
]);

const NARRATION_PROPOSAL_OPERATIONS = new Set<OperationName>([
  'rewrite-selection',
  'generate-episode',
]);

const DRAFT_WRITING_OPERATIONS = new Set<OperationName>([
  ...NARRATION_OPERATIONS,
  'generate-architecture',
  'review-architecture',
  'rewrite-architecture-section',
]);

export class ArchitectureService {
  private readonly store: DocumentStore;
  private readonly operationService: ArchitectureOperationService;
  private readonly artifactService: ArchitectureArtifactService | null;
  private readonly workspaceService: ArchitectureWorkspaceService | null;
  private readonly learningService: ArchitectureLearningService | null;
  private readonly idFactory: () => string;
  private readonly now: () => string;
  private readonly actionLocks = new Map<string, Promise<void>>();

  constructor(options: {
    store: DocumentStore;
    operationService: ArchitectureOperationService;
    artifactService?: ArchitectureArtifactService;
    workspaceService?: ArchitectureWorkspaceService;
    learningService?: ArchitectureLearningService;
    idFactory?: () => string;
    now?: () => string;
  }) {
    this.store = options.store;
    this.operationService = options.operationService;
    this.artifactService = options.artifactService ?? null;
    this.workspaceService = options.workspaceService ?? null;
    this.learningService = options.learningService ?? null;
    this.idFactory = options.idFactory ?? randomUUID;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  get(draftId: string): ArchitectureState {
    const draft = this.requireDraft(draftId);
    const saga = this.store.getPendingArchitectureSaga(draftId);
    return architectureState(
      draft,
      this.store.currentRevisionSeq(draftId),
      saga ? pendingSagaState(saga) : null,
    );
  }

  save(draftId: string, input: SaveArchitectureInput): SavedArchitecture {
    requireRevisionSeq(input.expectedRevisionSeq);
    const sections = requireSections(input.sections);
    const opId = requireOptionalString(input.opId, 'opId');
    const disposition = requireNonEmpty(input.disposition, 'disposition');
    const draft = this.requireDraft(draftId);
    const architecture = requireArchitecture(draft);
    if (this.store.getPendingArchitectureSaga(draftId)) {
      throw new ArchitectureGateError(
        'architecture save refused: an architecture saga is paused; use Resume first',
      );
    }
    if (
      (
        architecture.approvedMd !== null
        || architecture.approvedAt !== null
      )
      && JSON.stringify(sections) !== JSON.stringify(architecture.sections)
    ) {
      throw new ArchitectureGateError(
        'architecture save refused: Reopen architecture before changing approved sections',
      );
    }
    const timestamp = this.now();
    const result = this.store.saveArchitecture(draftId, {
      expectedRevisionSeq: input.expectedRevisionSeq,
      architecture: {
        sections,
        approvedMd: architecture.approvedMd,
        approvedAt: architecture.approvedAt,
      },
      updatedAt: timestamp,
      revision: {
        idFactory: this.idFactory,
        opId,
        disposition,
        createdAt: timestamp,
      },
    });
    if (!result) {
      throw new ArchitectureRevisionConflictError(this.get(draftId));
    }
    this.learningService?.captureRevision(result.revision);
    return {
      state: architectureState(result.draft, result.revision.seq, null),
      revision: result.revision,
    };
  }

  submitOperation(
    draftId: string,
    operation: OperationName,
    inputs: unknown,
  ): string {
    return this.submit(draftId, operation, inputs);
  }

  resumeOperation(
    draftId: string,
    operationId: string,
    inputs: unknown,
    reason: string | null = null,
  ): string {
    const operation = this.operationService.get(operationId).operation;
    const proposal = this.store.getNarrationProposal(
      draftId,
      operationId,
    );
    if (proposal && proposal.state !== 'pending') {
      const successorOperationId = proposal.successorOperationId;
      if (
        proposal.state !== 'rerolled'
        || successorOperationId == null
      ) {
        throw new ArchitectureGateError(
          'operation resume refused: predecessor proposal is already resolved',
        );
      }
      if (this.learningService) {
        this.learningService.captureProposalDisposition({
          draftId,
          operationId,
          decision: 'rerolled',
          reason,
          successorOperationId,
          resolvedAt: proposal.resolvedAt ?? this.now(),
        });
      } else if (proposal.reasonNote !== reason) {
        throw new ArchitectureGateError(
          'operation resume refused: predecessor disposition conflicts',
        );
      }
      return successorOperationId;
    }
    if (proposal?.state === 'pending') {
      const result = this.operationService.result?.(operationId)
        ?? { kind: 'pending' };
      if (this.operationHasNarrationProposal(operationId)) {
        const childId = this.submit(draftId, operation, inputs, {
          resumeOf: operationId,
        });
        const resolvedAt = this.now();
        if (this.learningService) {
          this.learningService.captureProposalDisposition({
            draftId,
            operationId,
            decision: 'rerolled',
            reason,
            successorOperationId: childId,
            resolvedAt,
          });
        } else {
          this.store.resolveNarrationProposal(
            draftId,
            operationId,
            'rerolled',
            resolvedAt,
            {
              reasonNote: reason,
              successorOperationId: childId,
            },
          );
        }
        return childId;
      } else if (result.kind !== 'pending') {
        this.store.resolveNarrationProposal(
          draftId,
          operationId,
          'dismissed',
          this.now(),
        );
      } else {
        throw new ArchitectureGateError(
          'operation resume refused: predecessor proposal is not settled',
        );
      }
    }
    return this.submit(draftId, operation, inputs, {
      resumeOf: operationId,
    });
  }

  async approve(
    draftId: string,
    expectedRevisionSeq: number,
  ): Promise<ArchitectureActionResult> {
    requireRevisionSeq(expectedRevisionSeq);
    const result = await this.withActionLock(draftId, () =>
      this.resumeApprove(draftId, expectedRevisionSeq));
    if (result.complete) {
      this.captureLatestDecisionRevision(draftId);
    }
    return result;
  }

  async resumeArchitectureSaga(
    draftId: string,
    resumeKey: string,
  ): Promise<ArchitectureActionResult> {
    requireNonEmpty(resumeKey, 'resumeKey');
    const result = await this.withActionLock(draftId, () => {
      const saga = this.store.getPendingArchitectureSaga(draftId);
      if (
        !saga
        || resumeKey !== architectureSagaResumeKey(saga)
      ) {
        throw new ArchitectureGateError(
          'architecture resume refused: resume key does not match a paused saga',
        );
      }
      switch (saga.action) {
        case 'approve':
          return this.resumeApprove(draftId, saga.expectedRevisionSeq);
        case 'reopen':
          return this.resumeReopen(draftId, saga.expectedRevisionSeq);
        default:
          return assertNeverArchitectureSaga(saga.action);
      }
    });
    if (result.complete) {
      this.captureLatestDecisionRevision(draftId);
    }
    return result;
  }

  async reopen(
    draftId: string,
    input: { confirmed: boolean; expectedRevisionSeq: number },
  ): Promise<ArchitectureActionResult> {
    if (input.confirmed !== true) throw new Error('confirmed must be true');
    requireRevisionSeq(input.expectedRevisionSeq);
    const result = await this.withActionLock(draftId, () =>
      this.resumeReopen(draftId, input.expectedRevisionSeq));
    if (result.complete) {
      this.captureLatestDecisionRevision(draftId);
    }
    return result;
  }

  markNarrationReconciled(
    draftId: string,
    input: { confirmed: boolean; expectedRevisionSeq: number },
  ): ArchitectureState {
    if (input.confirmed !== true) throw new Error('confirmed must be true');
    requireRevisionSeq(input.expectedRevisionSeq);
    const draft = this.requireExpectedNarrationRevision(
      draftId,
      input.expectedRevisionSeq,
    );
    const architecture = requireArchitecture(draft);
    if (
      architecture.approvedMd === null
      || architecture.approvedAt === null
      || architecture.approvedMd !== joinArchitecture(architecture.sections)
      || readCreativePhase(draft.doc) !== 'rapid-prototype'
    ) {
      throw new ArchitectureGateError(
        'narration reconciliation refused: current architecture approval is required',
      );
    }
    if (draft.narrationReconciliationRequired === true) {
      const reconciled = this.store.markNarrationReconciled(draftId, {
        expectedRevisionSeq: input.expectedRevisionSeq,
        revisionId: this.idFactory(),
        updatedAt: this.now(),
      });
      if (!reconciled) {
        throw new NarrationRevisionConflictError(
          this.requireDraft(draftId),
        );
      }
      this.learningService?.captureRevision(reconciled.revision);
    }
    return this.get(draftId);
  }

  async approveNarration(
    draftId: string,
    input: {
      expectedRevisionSeq: number;
      settledExportToken: string;
    },
  ): Promise<DraftRecord> {
    requireRevisionSeq(input.expectedRevisionSeq);
    requireNonEmpty(input.settledExportToken, 'settledExportToken');
    return this.withActionLock(draftId, async () => {
      let draft = this.requireExpectedNarrationRevision(
        draftId,
        input.expectedRevisionSeq,
      );
      const settledExport = this.store.getNarrationSettledExport(
        input.settledExportToken,
      );
      if (
        !settledExport
        || settledExport.draftId !== draftId
        || settledExport.revisionSeq !== input.expectedRevisionSeq
      ) {
        throw new ArchitectureGateError(
          'narration approval refused: settled export token is stale or invalid',
        );
      }
      this.requireSettledNarrationProposals(draftId);
      const architecture = requireArchitecture(draft);
      if (
        architecture.approvedMd === null
        || architecture.approvedAt === null
      ) {
        throw new ArchitectureGateError(
          'narration approval refused: architecture approval is required',
        );
      }
      if (architecture.approvedMd !== joinArchitecture(architecture.sections)) {
        throw new ArchitectureGateError(
          'narration approval refused: architecture approval is stale',
        );
      }
      if (draft.narrationReconciliationRequired === true) {
        throw new ArchitectureGateError(
          'narration approval refused: narration reconciliation is required',
        );
      }
      if (readCreativePhase(draft.doc) !== 'rapid-prototype') {
        throw new ArchitectureGateError(
          'narration approval refused: rapid-prototype phase is required',
        );
      }

      let approvedNarrationMd: string;
      try {
        approvedNarrationMd = exportDocumentMarkdown(draft.doc);
      } catch (error) {
        if (error instanceof ExportBlockedError) {
          throw new ArchitectureGateError(
            `narration approval refused: unsettled export: ${
              error.reasons.join('; ')
            }`,
          );
        }
        throw error;
      }
      if (approvedNarrationMd !== settledExport.narrationMd) {
        throw new ArchitectureGateError(
          'narration approval refused: settled export token does not match the stored revision',
        );
      }
      const resumingReservedApproval =
        draft.approvedNarrationMd === approvedNarrationMd
        && typeof draft.approvedNarrationAt === 'string'
        && draft.approvedNarrationRevisionSeq === input.expectedRevisionSeq;
      const approvedNarrationAt = resumingReservedApproval
        ? draft.approvedNarrationAt!
        : this.now();
      let approvalRevisionSeq = input.expectedRevisionSeq;
      if (!resumingReservedApproval) {
        const reserved = this.store.approveNarration(draftId, {
          expectedRevisionSeq: input.expectedRevisionSeq,
          approvedNarrationMd,
          approvedNarrationAt,
          narrationArtifactHash: draft.narrationArtifactHash ?? null,
          doc: draft.doc,
          updatedAt: approvedNarrationAt,
          revision: {
            id: this.idFactory(),
            createdAt: approvedNarrationAt,
          },
        });
        if (!reserved) {
          throw new NarrationRevisionConflictError(
            this.requireDraft(draftId),
          );
        }
        draft = reserved.draft;
        approvalRevisionSeq = reserved.revision.seq;
      }
      this.requireNarrationApprovalRevision(
        draftId,
        approvalRevisionSeq,
        approvedNarrationMd,
      );
      const artifactPath =
        `whp-youtube/drafts/${draft.episodeSlug}.md`;
      const artifactService = this.requireArtifactService();
      const writeResult = await artifactService.write(
        artifactPath,
        approvedNarrationMd,
        draft.narrationArtifactHash
          ? { expectedHash: draft.narrationArtifactHash }
          : { expectNew: true },
      );
      const intendedHash = sha256(approvedNarrationMd);
      if (
        writeResult.conflict
        && (
          writeResult.currentHash !== intendedHash
          || (writeResult.parked?.length ?? 0) > 0
        )
      ) {
        throw new ArchitectureArtifactConflictError(
          'narration artifact conflict',
          writeResult,
          this.syntheticActionResult(draftId),
        );
      }
      this.store.replaceNarrationArtifactHash(
        draftId,
        writeResult.conflict ? intendedHash : writeResult.hash,
      );
      this.requireNarrationApprovalRevision(
        draftId,
        approvalRevisionSeq,
        approvedNarrationMd,
      );
      const pipeline = await artifactService.upsertPipelineRow({
        episodeSlug: draft.episodeSlug,
        milestone: 'creative-approved',
        ref: artifactPath,
      });
      if (pipeline.conflict) {
        throw new ArchitectureArtifactConflictError(
          'narration pipeline conflict',
          pipeline,
          this.syntheticActionResult(draftId),
        );
      }
      await this.recordPendingMilestone(
        draftId,
        'creative-narration-approval',
        [artifactPath, 'whp-youtube/PIPELINE.md'],
      );
      const current = this.requireNarrationApprovalRevision(
        draftId,
        approvalRevisionSeq,
        approvedNarrationMd,
      );
      const approved = this.store.replaceDraftWorkflowState(draftId, {
        doc: withCreativePhase(current.doc, 'creative-approved'),
        architecture: requireArchitecture(current),
        architectureArtifactHash:
          current.architectureArtifactHash ?? null,
        narrationReconciliationRequired:
          current.narrationReconciliationRequired === true,
        updatedAt: this.now(),
      });
      this.store.deleteNarrationSettledExports(draftId);
      this.captureLatestDecisionRevision(draftId);
      return approved;
    });
  }

  prepareNarrationApproval(
    draftId: string,
    input: {
      expectedRevisionSeq: number;
      expectedNarrationMd: string;
    },
  ): { settledExportToken: string } {
    requireRevisionSeq(input.expectedRevisionSeq);
    requireNonEmpty(input.expectedNarrationMd, 'expectedNarrationMd');
    const draft = this.requireExpectedNarrationRevision(
      draftId,
      input.expectedRevisionSeq,
    );
    this.requireSettledNarrationProposals(draftId);
    let narrationMd: string;
    try {
      narrationMd = exportDocumentMarkdown(draft.doc);
    } catch (error) {
      if (error instanceof ExportBlockedError) {
        throw new ArchitectureGateError(
          `narration approval refused: unsettled export: ${
            error.reasons.join('; ')
          }`,
        );
      }
      throw error;
    }
    if (narrationMd !== input.expectedNarrationMd) {
      throw new ArchitectureGateError(
        'narration approval refused: editor export does not match the stored revision',
      );
    }
    const settledExportToken = randomUUID();
    this.store.createNarrationSettledExport({
      token: settledExportToken,
      draftId,
      revisionSeq: input.expectedRevisionSeq,
      narrationMd,
      createdAt: this.now(),
    });
    return { settledExportToken };
  }

  narrationProposals(draftId: string): Array<
    NarrationProposalRecord & { acceptedRevisionPresent: boolean }
  > {
    this.requireDraft(draftId);
    return this.store.listPendingNarrationProposals(draftId).map(
      (proposal) => ({
        ...proposal,
        acceptedRevisionPresent: this.store.hasRevisionForOperation(
          draftId,
          proposal.operationId,
        ),
      }),
    );
  }

  resolveNarrationProposal(
    draftId: string,
    operationId: string,
    decision: 'accepted' | 'rejected',
    reason: string | null = null,
  ): NarrationProposalRecord {
    const draft = this.requireDraft(draftId);
    requireNonEmpty(operationId, 'operationId');
    if (decision !== 'accepted' && decision !== 'rejected') {
      throw new Error('decision must be accepted or rejected');
    }
    const proposal = this.store.getNarrationProposal(
      draftId,
      operationId,
    );
    if (!proposal) {
      throw new ArchitectureGateError(
        'narration proposal resolution refused: operation is not registered for this draft',
      );
    }
    if (proposal.state !== 'pending') {
      if (this.learningService) {
        this.learningService.captureProposalDisposition({
          draftId,
          operationId,
          decision,
          reason,
          successorOperationId: null,
          resolvedAt: proposal.resolvedAt ?? this.now(),
        });
      }
      if (decision === 'accepted' && proposal.state === 'accepted') {
        this.clearNarrationReconciliationIfEligible(
          draft,
          proposal,
          this.now(),
        );
      }
      return proposal;
    }
    if (!this.operationHasNarrationProposal(operationId)) {
      throw new ArchitectureGateError(
        'narration proposal resolution refused: operation has no proposal result',
      );
    }
    if (
      decision === 'accepted'
      && !this.store.hasRevisionForOperation(draftId, operationId)
    ) {
      throw new ArchitectureGateError(
        'narration proposal resolution refused: accepted proposal revision is missing',
      );
    }
    const resolvedAt = this.now();
    let resolved: NarrationProposalRecord;
    if (this.learningService) {
      this.learningService.captureProposalDisposition({
          draftId,
          operationId,
          decision,
          reason,
          successorOperationId: null,
          resolvedAt,
        });
      resolved = this.store.getNarrationProposal(draftId, operationId)!;
    } else {
      resolved = this.store.resolveNarrationProposal(
        draftId,
        operationId,
        decision,
        resolvedAt,
        { reasonNote: reason },
      );
    }
    if (decision === 'accepted') {
      this.clearNarrationReconciliationIfEligible(
        draft,
        proposal,
        resolvedAt,
      );
    }
    return resolved;
  }

  rejectArchitectureProposal(
    draftId: string,
    operationId: string,
    reason: string | null = null,
  ): void {
    this.requireDraft(draftId);
    requireNonEmpty(operationId, 'operationId');
    if (!this.learningService) {
      throw new Error('learning capture is not configured');
    }
    this.learningService.captureArchitectureRejection({
      draftId,
      operationId,
      reason,
      resolvedAt: this.now(),
    });
  }

  private clearNarrationReconciliationIfEligible(
    draft: DraftRecord,
    proposal: NarrationProposalRecord,
    updatedAt: string,
  ): void {
    const architecture = requireArchitecture(draft);
    const approvedCurrent = architecture.approvedMd !== null
      && architecture.approvedAt !== null
      && architecture.approvedMd === joinArchitecture(architecture.sections);
    if (
      this.operationService.get(proposal.operationId).operation
        === 'generate-episode'
      && approvedCurrent
      && proposal.createdAt >= architecture.approvedAt!
      && draft.narrationReconciliationRequired === true
    ) {
      this.store.setNarrationReconciliationRequired(
        draft.id,
        false,
        updatedAt,
      );
    }
  }

  promotion(draftId: string): PromotionRecord | null {
    this.requireDraft(draftId);
    return this.store.getLatestPromotion(draftId);
  }

  async syncProductionDraft(
    draftId: string,
    input: {
      expectedRevisionSeq: number;
    },
  ): Promise<PromotionRecord> {
    requireRevisionSeq(input.expectedRevisionSeq);
    return this.withActionLock(draftId, async () => {
      const draft = this.requireExpectedNarrationRevision(
        draftId,
        input.expectedRevisionSeq,
      );
      this.requireSettledNarrationProposals(
        draftId,
        'production synchronization',
      );
      const promotion = this.store.getLatestPromotion(draftId);
      const resumingSynchronization =
        promotion?.state === 'output-ready'
        && promotion.error === 'production synchronization in progress'
        && promotion.targetHash !== null;
      if (
        !promotion
        || (
          promotion.state !== 'validation-required'
          && !resumingSynchronization
        )
        || !promotion.targetHash
      ) {
        throw new ArchitectureGateError(
          'production synchronization refused: validation-required promotion is required',
        );
      }
      let markdown: string;
      try {
        markdown = exportDocumentMarkdown(draft.doc);
      } catch (error) {
        if (error instanceof ExportBlockedError) {
          throw new ArchitectureGateError(
            `production synchronization refused: unsettled export: ${
              error.reasons.join('; ')
            }`,
          );
        }
        throw error;
      }
      const writeProduction =
        this.requireArtifactService().writeProduction;
      if (!writeProduction) {
        throw new Error(
          'production artifact writer is not configured',
        );
      }
      let reserved = resumingSynchronization
        ? promotion
        : this.updatePromotion(promotion, {
            state: 'output-ready',
            validationHash: null,
            error: 'production synchronization in progress',
          });
      try {
        const result = await writeProduction(
          promotion.targetPath,
          markdown,
          { expectedHash: promotion.targetHash },
        );
        const intendedHash = sha256(markdown);
        if (
          result.conflict
          && (
            result.currentHash !== intendedHash
            || (result.parked?.length ?? 0) > 0
          )
        ) {
          throw new ProductionSyncConflictError(result);
        }
        this.requireExpectedNarrationRevision(
          draftId,
          input.expectedRevisionSeq,
        );
        reserved = this.updatePromotion(reserved, {
          state: 'validation-required',
          targetHash: result.conflict ? intendedHash : result.hash,
          validationHash: null,
          error: null,
        });
        return reserved;
      } catch (error) {
        if (reserved.state === 'output-ready') {
          this.updatePromotion(reserved, {
            state: 'validation-required',
            validationHash: null,
            error: null,
          });
        }
        throw error;
      }
    });
  }

  async reconcilePromotionResult(
    operationId: string,
    result:
      | { kind: 'raw'; markdown: string }
      | { kind: 'failed'; error: string }
      | { kind: 'pending' }
      | { kind: 'schema'; value: unknown; guardrail: string | null },
  ): Promise<PromotionRecord | null> {
    let promotion = this.store.getPromotionByOperation(operationId);
    if (!promotion) return null;
    if (
      promotion.state === 'validation-required'
      || promotion.state === 'complete'
      || promotion.state === 'failed'
      || (
        promotion.state === 'output-ready'
        && (
          promotion.error === 'production synchronization in progress'
          || promotion.validationHash !== null
        )
      )
    ) {
      return promotion;
    }
    if (result.kind === 'pending') return promotion;
    if (result.kind !== 'raw') {
      return this.failPromotion(
        promotion,
        result.kind === 'failed'
          ? result.error
          : 'Promote returned an unexpected structured result',
      );
    }

    if (promotion.state === 'running') {
      try {
        const read = this.requireArtifactReader();
        const output = await read(promotion.targetPath);
        if (output.path !== promotion.targetPath) {
          throw new Error('Promote output path did not match its staged target');
        }
        promotion = this.updatePromotion(promotion, {
          state: 'output-ready',
          targetHash: output.hash,
          error: null,
        });
      } catch (error) {
        return this.failPromotion(promotion, errorMessage(error));
      }
    }

    try {
      const output = await this.requireArtifactReader()(
        promotion.targetPath,
      );
      if (output.hash !== promotion.targetHash) {
        throw new Error('Promote output changed during staged import');
      }
      const draft = this.requireDraft(promotion.draftId);
      const imported = importProductionMarkdown(output.content, draft.doc);
      this.store.importPromotion(promotion.draftId, {
        doc: imported.doc,
        format: imported.format,
        updatedAt: this.now(),
        revision: {
          id: promotion.importRevisionId,
          opId: promotion.operationId,
          createdAt: this.now(),
        },
      });
      return this.updatePromotion(promotion, {
        state: 'validation-required',
        error: null,
      });
    } catch (error) {
      if (error instanceof DraftWriteReservationError) throw error;
      return this.failPromotion(promotion, errorMessage(error));
    }
  }

  private async resumeApprove(
    draftId: string,
    expectedRevisionSeq: number,
  ): Promise<ArchitectureActionResult> {
    const artifactService = this.requireArtifactService();
    let saga = this.store.getArchitectureSaga(
      draftId,
      'approve',
      expectedRevisionSeq,
    );
    if (!saga) {
      const pendingSaga = this.store.getPendingArchitectureSaga(draftId);
      if (pendingSaga) {
        throw new ArchitectureGateError(
          `approval refused: ${pendingSaga.action} is paused; use Resume`,
        );
      }
      const draft = this.requireExpectedRevision(draftId, expectedRevisionSeq);
      const architecture = requireArchitecture(draft);
      if (
        architecture.approvedMd !== null
        || architecture.approvedAt !== null
      ) {
        if (
          architecture.approvedMd !== null
          && architecture.approvedAt !== null
          && architecture.approvedMd
            === joinArchitecture(architecture.sections)
          && readCreativePhase(draft.doc) === 'rapid-prototype'
        ) {
          return this.completedActionResult(draftId);
        }
        throw new ArchitectureGateError(
          'approval refused: Reopen architecture before changing approval',
        );
      }
      if (readCreativePhase(draft.doc) !== 'architecture') {
        throw new ArchitectureGateError(
          'approval refused: architecture phase is required',
        );
      }
      requireExactlyOneFixedSection(architecture.sections);
      const approvedMd = joinArchitecture(architecture.sections);
      const approvedAt = this.now();
      const artifactPath =
        `whp-youtube/architectures/${draft.episodeSlug}.md`;
      const timestamp = approvedAt;
      saga = this.store.createArchitectureSaga({
        draftId,
        action: 'approve',
        expectedRevisionSeq,
        input: {
          revisionId: this.idFactory(),
          approvedMd,
          approvedAt,
          artifactPath,
          artifactContent: renderApprovedArchitecture({
            title: draft.title,
            approvedDate: approvedAt.slice(0, 10),
            approvedMd,
          }),
        } satisfies ApproveSagaInput,
        revisionAppended: false,
        artifactWritten: false,
        pipelineUpserted: false,
        draftUpdated: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    const sagaInput = approveSagaInput(saga.input);

    if (!saga.revisionAppended) {
      const current = this.requireDraft(draftId);
      const currentArchitecture = requireArchitecture(current);
      const saved = this.store.saveArchitecture(draftId, {
        expectedRevisionSeq,
        architecture: {
          sections: currentArchitecture.sections,
          approvedMd: sagaInput.approvedMd,
          approvedAt: sagaInput.approvedAt,
        },
        updatedAt: this.now(),
        revision: {
          idFactory: () => sagaInput.revisionId,
          opId: null,
          disposition: 'architecture-approved',
          createdAt: sagaInput.approvedAt,
        },
      });
      if (!saved && !this.store.getRevision(sagaInput.revisionId)) {
        throw new ArchitectureRevisionConflictError(this.get(draftId));
      }
      saga = this.advanceSaga(saga, { revisionAppended: true });
    }
    this.requireSagaRevisionCurrent(
      saga,
      sagaInput.revisionId,
      (architecture) =>
        architecture.approvedMd === sagaInput.approvedMd
        && architecture.approvedAt === sagaInput.approvedAt
        && joinArchitecture(architecture.sections) === sagaInput.approvedMd,
    );

    if (!saga.artifactWritten) {
      const draft = this.requireDraft(draftId);
      const expectedState: ArtifactExpectedState =
        draft.architectureArtifactHash
          ? { expectedHash: draft.architectureArtifactHash }
          : { expectNew: true };
      const writeResult = await artifactService.write(
        sagaInput.artifactPath,
        sagaInput.artifactContent,
        expectedState,
      );
      const intendedHash = sha256(sagaInput.artifactContent);
      if (
        writeResult.conflict
        && (
          writeResult.currentHash !== intendedHash
          || (writeResult.parked?.length ?? 0) > 0
        )
      ) {
        throw new ArchitectureArtifactConflictError(
          'architecture artifact conflict',
          writeResult,
          this.actionResult(saga),
        );
      }
      this.store.replaceArchitectureState(
        draftId,
        requireArchitecture(this.requireDraft(draftId)),
        writeResult.conflict ? intendedHash : writeResult.hash,
      );
      saga = this.advanceSaga(saga, { artifactWritten: true });
    }

    if (!saga.pipelineUpserted) {
      const draft = this.requireDraft(draftId);
      const pipelineResult = await artifactService.upsertPipelineRow({
        episodeSlug: draft.episodeSlug,
        milestone: 'prototyping',
        ref: sagaInput.artifactPath,
      });
      if (pipelineResult.conflict) {
        throw new ArchitectureArtifactConflictError(
          'architecture pipeline conflict',
          pipelineResult,
          this.actionResult(saga),
        );
      }
      saga = this.advanceSaga(saga, { pipelineUpserted: true });
    }

    if (!saga.draftUpdated) {
      await this.recordPendingMilestone(
        draftId,
        'architecture-approval',
        [sagaInput.artifactPath, 'whp-youtube/PIPELINE.md'],
      );
      const draft = this.requireDraft(draftId);
      this.store.replaceDraftWorkflowState(draftId, {
        doc: withCreativePhase(draft.doc, 'rapid-prototype'),
        architecture: requireArchitecture(draft),
        architectureArtifactHash: draft.architectureArtifactHash ?? null,
        narrationReconciliationRequired:
          draft.narrationReconciliationRequired === true,
        updatedAt: this.now(),
      });
      saga = this.advanceSaga(saga, { draftUpdated: true });
    }

    return this.actionResult(saga);
  }

  private async resumeReopen(
    draftId: string,
    expectedRevisionSeq: number,
  ): Promise<ArchitectureActionResult> {
    const artifactService = this.requireArtifactService();
    let saga = this.store.getArchitectureSaga(
      draftId,
      'reopen',
      expectedRevisionSeq,
    );
    if (!saga) {
      const pendingSaga = this.store.getPendingArchitectureSaga(draftId);
      if (pendingSaga) {
        throw new ArchitectureGateError(
          `reopen refused: ${pendingSaga.action} is paused; use Resume`,
        );
      }
      const draft = this.requireExpectedRevision(draftId, expectedRevisionSeq);
      const architecture = requireArchitecture(draft);
      if (architecture.approvedMd === null || architecture.approvedAt === null) {
        throw new ArchitectureGateError(
          'reopen refused: architecture approval is required',
        );
      }
      const timestamp = this.now();
      saga = this.store.createArchitectureSaga({
        draftId,
        action: 'reopen',
        expectedRevisionSeq,
        input: {
          revisionId: this.idFactory(),
          topicRef: `whp-youtube/topics/${draft.episodeSlug}.md`,
        } satisfies ReopenSagaInput,
        revisionAppended: false,
        artifactWritten: false,
        pipelineUpserted: false,
        draftUpdated: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    const sagaInput = reopenSagaInput(saga.input);

    if (!saga.revisionAppended) {
      const draft = this.requireDraft(draftId);
      const architecture = requireArchitecture(draft);
      const saved = this.store.saveArchitecture(draftId, {
        expectedRevisionSeq,
        architecture: {
          sections: architecture.sections,
          approvedMd: null,
          approvedAt: null,
        },
        updatedAt: this.now(),
        revision: {
          idFactory: () => sagaInput.revisionId,
          opId: null,
          disposition: 'architecture-reopened',
          createdAt: saga.createdAt,
        },
      });
      if (!saved && !this.store.getRevision(sagaInput.revisionId)) {
        throw new ArchitectureRevisionConflictError(this.get(draftId));
      }
      saga = this.advanceSaga(saga, {
        revisionAppended: true,
        artifactWritten: true,
      });
    }
    this.requireSagaRevisionCurrent(
      saga,
      sagaInput.revisionId,
      (architecture) =>
        architecture.approvedMd === null
        && architecture.approvedAt === null,
    );

    if (!saga.pipelineUpserted) {
      const draft = this.requireDraft(draftId);
      const pipelineResult = await artifactService.upsertPipelineRow({
        episodeSlug: draft.episodeSlug,
        milestone: 'architecture',
        ref: sagaInput.topicRef,
      });
      if (pipelineResult.conflict) {
        throw new ArchitectureArtifactConflictError(
          'architecture pipeline conflict',
          pipelineResult,
          this.actionResult(saga),
        );
      }
      saga = this.advanceSaga(saga, { pipelineUpserted: true });
    }

    if (!saga.draftUpdated) {
      await this.recordPendingMilestone(
        draftId,
        'architecture-reopen',
        ['whp-youtube/PIPELINE.md'],
      );
      const draft = this.requireDraft(draftId);
      this.store.replaceDraftWorkflowState(draftId, {
        doc: withCreativePhase(draft.doc, 'architecture'),
        architecture: requireArchitecture(draft),
        architectureArtifactHash: draft.architectureArtifactHash ?? null,
        narrationReconciliationRequired:
          draft.narrationReconciliationRequired === true
          || hasNarration(draft.doc),
        updatedAt: this.now(),
      });
      saga = this.advanceSaga(saga, { draftUpdated: true });
    }

    return this.actionResult(saga);
  }

  private requireExpectedRevision(
    draftId: string,
    expectedRevisionSeq: number,
  ): DraftRecord {
    const draft = this.requireDraft(draftId);
    if (this.store.currentRevisionSeq(draftId) !== expectedRevisionSeq) {
      throw new ArchitectureRevisionConflictError(this.get(draftId));
    }
    return draft;
  }

  private requireExpectedNarrationRevision(
    draftId: string,
    expectedRevisionSeq: number,
  ): DraftRecord {
    const draft = this.requireDraft(draftId);
    if (this.store.currentRevisionSeq(draftId) !== expectedRevisionSeq) {
      throw new NarrationRevisionConflictError(draft);
    }
    return draft;
  }

  private requireNarrationApprovalRevision(
    draftId: string,
    revisionSeq: number,
    approvedNarrationMd: string,
  ): DraftRecord {
    const draft = this.requireDraft(draftId);
    if (
      this.store.currentRevisionSeq(draftId) !== revisionSeq
      || draft.approvedNarrationRevisionSeq !== revisionSeq
      || draft.approvedNarrationMd !== approvedNarrationMd
    ) {
      throw new NarrationRevisionConflictError(draft);
    }
    return draft;
  }

  private requireSagaRevisionCurrent(
    saga: ArchitectureSagaRecord,
    revisionId: string,
    architectureMatches: (architecture: DraftArchitecture) => boolean,
  ): void {
    const revision = this.store.getRevision(revisionId);
    const draft = this.requireDraft(saga.draftId);
    if (
      !revision
      || revision.seq !== saga.expectedRevisionSeq + 1
      || this.store.currentRevisionSeq(saga.draftId) !== revision.seq
      || !architectureMatches(requireArchitecture(draft))
    ) {
      throw new ArchitectureRevisionConflictError(this.get(saga.draftId));
    }
  }

  private advanceSaga(
    saga: ArchitectureSagaRecord,
    update: Partial<ArchitectureSagaRecord>,
  ): ArchitectureSagaRecord {
    return this.store.updateArchitectureSaga({
      ...saga,
      ...update,
      updatedAt: this.now(),
    });
  }

  private actionResult(
    saga: ArchitectureSagaRecord,
  ): ArchitectureActionResult {
    const steps = sagaSteps(saga);
    return {
      complete: Object.values(steps).every(
        (status) => status === 'completed',
      ),
      steps,
      state: this.get(saga.draftId),
    };
  }

  private requireArtifactService(): ArchitectureArtifactService {
    if (!this.artifactService) {
      throw new Error('architecture artifact service is not configured');
    }
    return this.artifactService;
  }

  private requireArtifactReader(): (
    path: string,
  ) => Promise<ArtifactReadResult> {
    const read = this.requireArtifactService().read;
    if (!read) throw new Error('artifact reader is not configured');
    return async (path) => await read(path);
  }

  private syntheticActionResult(
    draftId: string,
  ): ArchitectureActionResult {
    return {
      complete: false,
      steps: {
        revisionAppended: 'pending',
        artifactWritten: 'pending',
        pipelineUpserted: 'pending',
        draftUpdated: 'pending',
      },
      state: this.get(draftId),
    };
  }

  private completedActionResult(
    draftId: string,
  ): ArchitectureActionResult {
    return {
      complete: true,
      steps: {
        revisionAppended: 'completed',
        artifactWritten: 'completed',
        pipelineUpserted: 'completed',
        draftUpdated: 'completed',
      },
      state: this.get(draftId),
    };
  }

  private async withActionLock<T>(
    draftId: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const previous = this.actionLocks.get(draftId) ?? Promise.resolve();
    let release = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.actionLocks.set(draftId, current);
    await previous;
    try {
      return await action();
    } finally {
      release();
      if (this.actionLocks.get(draftId) === current) {
        this.actionLocks.delete(draftId);
      }
    }
  }

  private submit(
    draftId: string,
    operation: OperationName,
    inputs: unknown,
    options: { resumeOf?: string; cwd?: string } = {},
  ): string {
    const draft = this.requireDraft(draftId);
    const phase = readCreativePhase(draft.doc);
    const architecture = requireArchitecture(draft);
    const approvedCurrent = architecture.approvedMd !== null
      && architecture.approvedAt !== null
      && architecture.approvedMd === joinArchitecture(architecture.sections);
    if (
      NARRATION_PROPOSAL_OPERATIONS.has(operation)
      && phase === 'rapid-prototype'
      && draft.approvedNarrationMd !== null
      && draft.approvedNarrationMd !== undefined
    ) {
      throw new ArchitectureGateError(
        `${operation} refused: narration approval is in progress`,
      );
    }

    if (operation === 'generate-episode') {
      if (phase !== 'rapid-prototype') {
        throw new ArchitectureGateError(
          'generate-episode refused: architecture is not approved',
        );
      }
      if (!approvedCurrent) {
        throw new ArchitectureGateError(
          architecture.approvedMd === null || architecture.approvedAt === null
            ? 'generate-episode refused: architecture approval is required'
            : 'generate-episode refused: architecture approval is stale',
        );
      }
    }

    if (
      phase === 'architecture'
      && SCOPED_NARRATION_OPERATIONS.has(operation)
      && !hasNarration(draft.doc)
    ) {
      throw new ArchitectureGateError(
        `${operation} requires existing narration in architecture phase`,
      );
    }

    if (operation === 'promote') {
      if (phase === 'architecture') {
        throw new ArchitectureGateError(
          'promote refused: architecture is not approved',
        );
      }
      if (architecture.approvedMd === null || architecture.approvedAt === null) {
        throw new ArchitectureGateError(
          'promote refused: architecture approval is required',
        );
      }
      if (!approvedCurrent) {
        throw new ArchitectureGateError(
          'promote refused: architecture approval is stale',
        );
      }
      if (draft.narrationReconciliationRequired === true) {
        throw new ArchitectureGateError(
          'promote refused: narration reconciliation is required',
        );
      }
      if (
        draft.approvedNarrationMd === null
        || draft.approvedNarrationMd === undefined
        || draft.approvedNarrationAt === null
        || draft.approvedNarrationAt === undefined
        || draft.approvedNarrationRevisionSeq === null
        || draft.approvedNarrationRevisionSeq === undefined
      ) {
        throw new ArchitectureGateError(
          'promote refused: complete narration approval is required',
        );
      }
      if (
        phase !== 'creative-approved'
        || draft.approvedNarrationRevisionSeq
          !== this.store.currentRevisionSeq(draftId)
      ) {
        throw new ArchitectureGateError(
          'promote refused: complete narration approval is stale',
        );
      }
      let currentNarration: string;
      try {
        currentNarration = exportDocumentMarkdown(draft.doc);
      } catch {
        throw new ArchitectureGateError(
          'promote refused: narration export is unsettled',
        );
      }
      if (currentNarration !== draft.approvedNarrationMd) {
        throw new ArchitectureGateError(
          'promote refused: complete narration approval is stale',
        );
      }
    }

    const supplied = requireInputs(inputs);
    let authoritativeInputs = { ...supplied };
    delete authoritativeInputs['draftId'];
    if (NARRATION_OPERATIONS.has(operation)) {
      delete authoritativeInputs['creative_status'];
      delete authoritativeInputs['approved_architecture_md'];
      const creativeStatus = readCreativeStatus(draft.doc);
      if (creativeStatus !== null) {
        authoritativeInputs['creative_status'] = creativeStatus;
      }
      if (architecture.approvedMd !== null) {
        authoritativeInputs['approved_architecture_md'] =
          architecture.approvedMd;
      }
    }
    if (operation === 'promote') {
      const targetPath = requireProductionTarget(
        authoritativeInputs['target_path'],
        draft.episodeSlug,
      );
      const metadata = recordValue(draft.doc['metadata']) ?? {};
      authoritativeInputs = {
        topic_brief: {
          topic: stringValue(metadata['topic']),
          factual_anchors: stringArray(metadata['anchors']),
          unknowns: stringArray(metadata['unknowns']),
        },
        approved_lessons: stringArray(metadata['approvedLessons']),
        approved_architecture_md: architecture.approvedMd!,
        approved_narration_md: draft.approvedNarrationMd!,
        creative_status: readCreativeStatus(draft.doc) ?? {},
        target_path: targetPath,
      };
    }
    const appliedLessons = DRAFT_WRITING_OPERATIONS.has(operation)
      ? this.learningService?.activeEpisodeLessons?.(draftId) ?? []
      : [];
    if (DRAFT_WRITING_OPERATIONS.has(operation)) {
      delete authoritativeInputs['approved_lessons'];
      authoritativeInputs['approved_lessons'] = appliedLessons.map(
        ({ markdown }) => markdown,
      );
    }
    const submitOptions = this.workspaceService
      ? {
          ...options,
          cwd: this.workspaceService.workspacePath(draftId),
        }
      : options;
    const id = this.operationService.submitDraftScoped
      && DRAFT_WRITING_OPERATIONS.has(operation)
      ? this.operationService.submitDraftScoped(
          operation,
          authoritativeInputs,
          appliedLessons.map(({ markdown }) => markdown),
          submitOptions,
        )
      : this.operationService.submit(
          operation,
          authoritativeInputs,
          submitOptions,
        );
    if (DRAFT_WRITING_OPERATIONS.has(operation)) {
      this.learningService?.recordOperationLessons?.(id, appliedLessons);
    }
    if (NARRATION_PROPOSAL_OPERATIONS.has(operation)) {
      this.store.createNarrationProposal({
        draftId,
        operationId: id,
        state: 'pending',
        createdAt: this.now(),
        resolvedAt: null,
        reasonNote: null,
        successorOperationId: null,
      });
    }
    if (operation === 'promote') {
      const timestamp = this.now();
      this.store.createPromotion({
        draftId,
        operationId: id,
        state: 'running',
        targetPath: authoritativeInputs['target_path'] as string,
        targetHash: null,
        importRevisionId: this.idFactory(),
        validationHash: null,
        error: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    return id;
  }

  private async recordPendingMilestone(
    draftId: string,
    kind: MilestoneKind,
    files: string[],
  ): Promise<void> {
    if (!this.workspaceService) return;
    await this.workspaceService.recordPending({
      draftId,
      kind,
      files,
      reconciliationRequired: true,
    });
  }

  private requireSettledNarrationProposals(
    draftId: string,
    action = 'narration approval',
  ): void {
    let unresolved = false;
    for (const proposal of this.store.listPendingNarrationProposals(draftId)) {
      if (this.operationHasNarrationProposal(proposal.operationId)) {
        if (
          this.store.hasRevisionForOperation(
            draftId,
            proposal.operationId,
          )
        ) {
          const resolvedAt = this.now();
          if (this.learningService) {
            this.learningService.captureProposalDisposition({
              draftId,
              operationId: proposal.operationId,
              decision: 'accepted',
              reason: null,
              successorOperationId: null,
              resolvedAt,
            });
          } else {
            this.store.resolveNarrationProposal(
              draftId,
              proposal.operationId,
              'accepted',
              resolvedAt,
            );
          }
          this.clearNarrationReconciliationIfEligible(
            this.requireDraft(draftId),
            proposal,
            resolvedAt,
          );
          continue;
        }
        unresolved = true;
        continue;
      }
      const result = this.operationService.result?.(proposal.operationId)
        ?? { kind: 'pending' };
      if (result.kind === 'pending') {
        unresolved = true;
        continue;
      }
      this.store.resolveNarrationProposal(
        draftId,
        proposal.operationId,
        'dismissed',
        this.now(),
      );
    }
    if (unresolved) {
      throw new ArchitectureGateError(
        `${action} refused: unresolved proposals`,
      );
    }
  }

  private operationHasNarrationProposal(operationId: string): boolean {
    const operation = this.operationService.get(operationId).operation;
    const result = this.operationService.result?.(operationId)
      ?? { kind: 'pending' };
    if (operation === 'generate-episode') {
      return result.kind === 'raw' && result.markdown.trim() !== '';
    }
    if (operation !== 'rewrite-selection') return false;
    return result.kind === 'schema'
      && result.guardrail === null
      && recordValue(result.value) !== null
      && typeof recordValue(result.value)?.['replacement_markdown'] === 'string';
  }

  private captureLatestDecisionRevision(draftId: string): void {
    const revision = this.store.listRevisions(draftId).at(-1);
    if (revision) this.learningService?.captureRevision(revision);
  }

  private requireDraft(draftId: string): DraftRecord {
    const draft = this.store.getDraft(draftId);
    if (!draft) throw new Error(`draft not found: ${draftId}`);
    return draft;
  }

  private updatePromotion(
    promotion: PromotionRecord,
    update: Partial<PromotionRecord>,
  ): PromotionRecord {
    return this.store.updatePromotion({
      ...promotion,
      ...update,
      updatedAt: this.now(),
    });
  }

  private failPromotion(
    promotion: PromotionRecord,
    error: string,
  ): PromotionRecord {
    return this.updatePromotion(promotion, {
      state: 'failed',
      error,
    });
  }
}

interface ApproveSagaInput {
  revisionId: string;
  approvedMd: string;
  approvedAt: string;
  artifactPath: string;
  artifactContent: string;
}

interface ReopenSagaInput {
  revisionId: string;
  topicRef: string;
}

function approveSagaInput(value: unknown): ApproveSagaInput {
  const input = requireInputs(value);
  return {
    revisionId: requireNonEmpty(input['revisionId'], 'revisionId'),
    approvedMd: requiredStringValue(input['approvedMd'], 'approvedMd'),
    approvedAt: requireNonEmpty(input['approvedAt'], 'approvedAt'),
    artifactPath: requireNonEmpty(input['artifactPath'], 'artifactPath'),
    artifactContent: requiredStringValue(
      input['artifactContent'],
      'artifactContent',
    ),
  };
}

function reopenSagaInput(value: unknown): ReopenSagaInput {
  const input = requireInputs(value);
  return {
    revisionId: requireNonEmpty(input['revisionId'], 'revisionId'),
    topicRef: requireNonEmpty(input['topicRef'], 'topicRef'),
  };
}

function requireExactlyOneFixedSection(
  sections: readonly ArchitectureSection[],
): void {
  const mechanicallyParsed = splitArchitecture(joinArchitecture(sections));
  const invalid = ARCHITECTURE_SECTIONS.filter(({ title }) =>
    mechanicallyParsed.filter((section) => section.title === title).length !== 1
  );
  if (invalid.length > 0) {
    throw new ArchitectureGateError(
      'approval requires exactly one mechanically recognized instance of every fixed architecture section',
    );
  }
}

function sagaSteps(saga: ArchitectureSagaRecord): ArchitectureActionSteps {
  return {
    revisionAppended: stepStatus(saga.revisionAppended),
    artifactWritten: stepStatus(saga.artifactWritten),
    pipelineUpserted: stepStatus(saga.pipelineUpserted),
    draftUpdated: stepStatus(saga.draftUpdated),
  };
}

function stepStatus(done: boolean): 'pending' | 'completed' {
  return done ? 'completed' : 'pending';
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function architectureState(
  draft: DraftRecord,
  revisionSeq: number,
  pendingSaga: ArchitectureSagaState | null,
): ArchitectureState {
  const architecture = requireArchitecture(draft);
  return {
    sections: architecture.sections.map((section) => ({ ...section })),
    approvedMd: architecture.approvedMd,
    approvedAt: architecture.approvedAt,
    revisionSeq,
    narrationReconciliationRequired:
      draft.narrationReconciliationRequired === true,
    pendingSaga,
  };
}

function pendingSagaState(
  saga: ArchitectureSagaRecord,
): ArchitectureSagaState {
  return {
    kind: saga.action,
    resumeKey: architectureSagaResumeKey(saga),
    steps: sagaSteps(saga),
    createdAt: saga.createdAt,
    updatedAt: saga.updatedAt,
  };
}

function architectureSagaResumeKey(saga: ArchitectureSagaRecord): string {
  return sha256([
    'architecture-saga',
    saga.draftId,
    saga.action,
    String(saga.expectedRevisionSeq),
  ].join('\u0000'));
}

function assertNeverArchitectureSaga(value: never): never {
  throw new Error(`unsupported architecture saga kind: ${String(value)}`);
}

function requireArchitecture(draft: DraftRecord): DraftArchitecture {
  return draft.architecture ?? {
    sections: [],
    approvedMd: null,
    approvedAt: null,
  };
}

function requireRevisionSeq(value: unknown): asserts value is number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new Error('expectedRevisionSeq must be a non-negative integer');
  }
}

function requireSections(value: unknown): ArchitectureSection[] {
  if (!Array.isArray(value)) throw new Error('sections must be an array');
  return value.map((section, index) => {
    if (
      typeof section !== 'object'
      || section === null
      || Array.isArray(section)
    ) {
      throw new Error(`sections[${index}] must be an object`);
    }
    const candidate = section as Record<string, unknown>;
    return {
      key: requireNonEmpty(candidate['key'], `sections[${index}].key`),
      title: typeof candidate['title'] === 'string'
        ? candidate['title']
        : invalidString(`sections[${index}].title`),
      md: typeof candidate['md'] === 'string'
        ? candidate['md']
        : invalidString(`sections[${index}].md`),
    };
  });
}

function requireOptionalString(
  value: unknown,
  field: string,
): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string or null`);
  }
  return value;
}

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} is required`);
  }
  return value;
}

function requiredStringValue(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
  return value;
}

function invalidString(field: string): never {
  throw new Error(`${field} must be a string`);
}

function requireInputs(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('inputs must be an object');
  }
  return value as Record<string, unknown>;
}

function requireProductionTarget(
  value: unknown,
  episodeSlug: string,
): string {
  if (typeof value !== 'string') {
    throw new Error('target_path is required');
  }
  const escapedSlug = episodeSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(
    `^whp-youtube/episodes/\\d{2}-${escapedSlug}\\.md$`,
  ).test(value)) {
    throw new Error(`invalid production target: ${value}`);
  }
  return value;
}

function recordValue(
  value: unknown,
): Record<string, unknown> | null {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
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

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'promotion failed';
}
