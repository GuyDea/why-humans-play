import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import {
  EditorState,
  pickActive as pickEditorVariant,
  schema as editorSchema,
} from '@whp/script-creator-editor-core';
import {
  splitArchitecture,
  type ArchitectureSection,
} from '../architecture/codec.js';
import type {
  DocumentStore,
  DraftArchitecture,
  PromotionRecord,
  RevisionRecord,
} from '../documents/store.js';
import type { OperationName } from '../operations/registry.js';
import type {
  OperationServiceResult,
} from '../operations/service.js';
import {
  gitHead,
  ReconciliationCommitMismatchError,
  verifyExistingDoctrinePointer,
  verifyReconciliationCommit,
} from '../repo/git.js';
import type {
  ReconciliationCommitCheck,
  ReconciliationVerificationExpectation,
  VerifiedReconciliationCommit,
} from '../repo/git.js';
import type { OperationState } from '../types.js';
import type { TopicStore } from '../topics/store.js';
import {
  DecisionProjector,
  decodeVariantPickedDisposition,
  decisionKindForRevisionDisposition,
  type OperationDecisionEvidence,
  type ResolvedDecision,
} from './decisions.js';
import type {
  DecisionEventRecord,
  DecisionKind,
  DistillationRunRecord,
  DistillationTrigger,
  LearningStore,
  LearningSessionRecord,
  LessonClassification,
  LessonReconciliationRecord,
  LessonRecord,
  ReconciliationKind,
  ValidatorAttemptRecord,
} from './store.js';

export interface DecisionPage {
  decisions: ResolvedDecision[];
  nextCursor: number | null;
}

export interface LearningOperationService {
  submit(
    operation: OperationName,
    inputs: unknown,
    options?: { cwd?: string },
  ): string;
  get(id: string): {
    operation: OperationName;
    state: OperationState;
  };
  result(id: string): OperationServiceResult;
}

interface DistilledLesson {
  classification: LessonClassification;
  lesson_markdown: string;
  rationale_markdown: string;
  evidence: string[];
  proposed_target: string | null;
  supersedes_lesson_id: string | null;
}

interface DistillationResult {
  status: 'complete' | 'narrowed' | 'declined';
  lessons: DistilledLesson[];
  guardrail_markdown: string | null;
}

export interface LessonEvidenceView {
  id: string;
  status: 'resolved' | 'stale';
  decision: ResolvedDecision | null;
}

export interface LessonDetail extends LessonRecord {
  evidenceIds: string[];
  evidence: LessonEvidenceView[];
  reconciliation: LessonReconciliationRecord | null;
  reconciliationHistory: LessonReconciliationRecord[];
  currentMarkdown: string | null;
  repositoryProvenance: {
    status: 'resolved';
    lesson_markdown: string;
    path: string;
    anchor: string;
    content_hash: string;
  } | {
    status: 'unresolved';
    reason: string;
    path: string | null;
    anchor: string | null;
    content_hash: string | null;
  } | null;
}

export interface ActiveEpisodeLesson {
  id: string;
  version: number;
  markdown: string;
  contentHash: string;
}

export class ReconciliationVerificationRefusal extends Error {
  readonly code = 'reconciliation-verification-refused';
  readonly recoverable = true;

  constructor(
    message: string,
    readonly checked: ReconciliationCommitCheck,
  ) {
    super(message);
    this.name = 'ReconciliationVerificationRefusal';
  }
}

export class LearningService {
  private readonly store: LearningStore;
  private readonly documentStore: DocumentStore;
  private readonly topicStore: TopicStore;
  private readonly operationEvidence: (
    operationId: string,
  ) => OperationDecisionEvidence | null;
  private readonly projector: DecisionProjector;
  private readonly operationService: LearningOperationService | null;
  private readonly repositoryRootForDraft:
    ((draftId: string) => string) | null;
  private readonly idFactory: () => string;
  private readonly resumeKeyFactory: () => string;
  private readonly now: () => string;

  constructor(options: {
    store: LearningStore;
    documentStore: DocumentStore;
    topicStore: TopicStore;
    operationEvidence: (
      operationId: string,
    ) => OperationDecisionEvidence | null;
    operationService?: LearningOperationService;
    repositoryRootForDraft?: (draftId: string) => string;
    idFactory?: () => string;
    resumeKeyFactory?: () => string;
    now?: () => string;
  }) {
    this.store = options.store;
    this.documentStore = options.documentStore;
    this.topicStore = options.topicStore;
    this.operationEvidence = options.operationEvidence;
    this.operationService = options.operationService ?? null;
    this.repositoryRootForDraft = options.repositoryRootForDraft ?? null;
    this.idFactory = options.idFactory ?? randomUUID;
    this.resumeKeyFactory = options.resumeKeyFactory ?? randomUUID;
    this.now = options.now ?? (() => new Date().toISOString());
    this.projector = new DecisionProjector({
      learningStore: options.store,
      documentStore: options.documentStore,
      topicStore: options.topicStore,
      operationEvidence: options.operationEvidence,
    });
  }

  captureRevision(
    revision: RevisionRecord,
    proof: { gateCompleted?: boolean } = {},
  ): DecisionEventRecord | null {
    const kind = decisionKindForRevisionDisposition(
      revision.disposition,
    );
    if (!kind) return null;
    if (!this.revisionHasNormativeProof(revision, kind, proof)) {
      return null;
    }
    return this.capture({
      draftId: revision.draftId,
      kind,
      sourceType: 'revision',
      sourceId: revision.id,
      disposition: revision.disposition,
      sourceTimestamp: revision.createdAt,
      note: null,
    });
  }

  captureProposalDisposition(input: {
    draftId: string;
    operationId: string;
    decision: 'accepted' | 'rejected' | 'rerolled';
    reason: string | null;
    successorOperationId: string | null;
    resolvedAt: string;
  }): DecisionEventRecord {
    const proposal = this.documentStore.getNarrationProposal(
      input.draftId,
      input.operationId,
    );
    if (!proposal) {
      throw new Error(
        `narration proposal not found: ${input.operationId}`,
      );
    }
    if (input.decision === 'rerolled' && !input.successorOperationId) {
      throw new Error('successorOperationId is required for rerolled');
    }
    this.requireCompletedDraftOperation(
      input.operationId,
      input.draftId,
    );
    const acceptedRevision = input.decision === 'accepted'
      ? this.documentStore.getRevisionForOperation(
          input.draftId,
          input.operationId,
        )
      : null;
    if (input.decision === 'accepted' && !acceptedRevision) {
      throw new Error(
        `accepted proposal revision missing: ${input.operationId}`,
      );
    }
    if (proposal.state === 'pending') {
      this.documentStore.resolveNarrationProposal(
        input.draftId,
        input.operationId,
        input.decision,
        input.resolvedAt,
        {
          reasonNote: input.reason,
          successorOperationId: input.successorOperationId,
          acceptedRevisionId: acceptedRevision?.id ?? null,
        },
      );
    } else if (
      proposal.state !== input.decision
      || proposal.reasonNote !== input.reason
      || proposal.successorOperationId !== input.successorOperationId
      || proposal.acceptedRevisionId !== (acceptedRevision?.id ?? null)
    ) {
      throw new Error(
        `narration proposal disposition conflict: ${input.operationId}`,
      );
    }

    if (input.decision === 'accepted') {
      const decision = this.captureRevision(acceptedRevision!);
      if (!decision) {
        throw new Error(
          `accepted proposal disposition is not recognized: ${
            acceptedRevision!.disposition
          }`,
        );
      }
      return input.reason === null
        ? decision
        : this.store.setDecisionNote(
            decision.id,
            input.reason,
            input.resolvedAt,
          );
    }

    return this.capture({
      draftId: input.draftId,
      kind: input.decision === 'rejected'
        ? 'proposal-rejected'
        : 'proposal-rerolled',
      sourceType: 'narration-proposal',
      sourceId: input.operationId,
      disposition: input.decision,
      sourceTimestamp: input.resolvedAt,
      note: input.reason,
    });
  }

  captureArchitectureRejection(input: {
    draftId: string;
    operationId: string;
    reason: string | null;
    resolvedAt: string;
  }): DecisionEventRecord {
    if (!this.documentStore.getDraft(input.draftId)) {
      throw new Error(`draft not found: ${input.draftId}`);
    }
    const proposal = this.documentStore.getArchitectureProposal(
      input.draftId,
      input.operationId,
    );
    if (!proposal || proposal.state !== 'pending') {
      throw new Error(
        `architecture rejection refused: pending architecture proposal not found for draft ${input.draftId}`,
      );
    }
    const operation = this.requireCompletedDraftOperation(
      input.operationId,
      input.draftId,
    );
    if (![
      'generate-architecture',
      'review-architecture',
      'rewrite-architecture-section',
    ].includes(operation.operation)) {
      throw new Error(
        'architecture rejection refused: operation is not an architecture proposal',
      );
    }
    this.documentStore.resolveArchitectureProposal(
      input.draftId,
      input.operationId,
      {
        state: 'rejected',
        revisionId: null,
        reasonNote: input.reason,
        resolvedAt: input.resolvedAt,
      },
    );
    return this.capture({
      draftId: input.draftId,
      kind: 'proposal-rejected',
      sourceType: 'architecture-proposal',
      sourceId: input.operationId,
      disposition: 'rejected',
      sourceTimestamp: input.resolvedAt,
      note: input.reason,
    });
  }

  capturePackagePick(input: {
    draftId: string;
    packageTestId: string;
    selectedAt: string;
  }): DecisionEventRecord {
    const record = this.topicStore.getPackageTest(input.packageTestId);
    if (
      !record
      || record.selectedDirectionIndex == null
      || record.selectedAt == null
    ) {
      throw new Error(`package pick not found: ${input.packageTestId}`);
    }
    return this.capture({
      draftId: input.draftId,
      kind: 'package-picked',
      sourceType: 'package-test',
      sourceId: input.packageTestId,
      disposition: `package-picked:${record.selectedDirectionIndex}`,
      sourceTimestamp: input.selectedAt,
      note: null,
    });
  }

  captureWinnerHandoff(input: {
    draftId: string;
    runId: string;
    winnerSubject: string;
    completedAt: string;
  }): DecisionEventRecord {
    return this.capture({
      draftId: input.draftId,
      kind: 'winner-handed-off',
      sourceType: 'topic-handoff',
      sourceId: `${input.runId}:${input.winnerSubject}`,
      disposition: 'winner-handed-off',
      sourceTimestamp: input.completedAt,
      note: null,
    });
  }

  capturePromotionCompletion(
    promotion: PromotionRecord,
  ): DecisionEventRecord {
    if (promotion.state !== 'complete') {
      throw new Error('promotion must be complete');
    }
    return this.capture({
      draftId: promotion.draftId,
      kind: 'gate-action',
      sourceType: 'promotion',
      sourceId: promotion.operationId,
      disposition: 'promotion-completed',
      sourceTimestamp: promotion.updatedAt,
      note: null,
    });
  }

  recordValidatorAttempt(input: {
    draftId: string;
    path: string;
    hash: string;
    ok: boolean;
    diagnostics: unknown;
    createdAt?: string;
  }): {
    attempt: ValidatorAttemptRecord;
    decision: DecisionEventRecord | null;
  } {
    if (!this.documentStore.getDraft(input.draftId)) {
      throw new Error(`draft not found: ${input.draftId}`);
    }
    const createdAt = input.createdAt ?? this.now();
    const attempt = this.store.recordValidatorAttempt({
      id: this.idFactory(),
      draftId: input.draftId,
      path: input.path,
      contentHash: input.hash,
      ok: input.ok,
      diagnostics: input.diagnostics,
      createdAt,
    });
    if (!attempt.ok) return { attempt, decision: null };
    const previousFailure = this.store.listValidatorAttempts(input.draftId)
      .filter((candidate) =>
        !candidate.ok
        && candidate.path === attempt.path
        && candidate.contentHash !== attempt.contentHash
        && candidate.createdAt < attempt.createdAt)
      .at(-1);
    if (!previousFailure) return { attempt, decision: null };
    const documentRevisions = this.documentStore.listRevisions(input.draftId);
    const revisions = documentRevisions
      .filter((revision) =>
        revision.createdAt > previousFailure.createdAt
        && revision.createdAt <= attempt.createdAt)
      .filter((revision) =>
        isQualifyingValidatorFixRevision(documentRevisions, revision));
    if (revisions.length === 0) return { attempt, decision: null };
    const cycleSourceId =
      `${previousFailure.id}:${attempt.contentHash}`;
    if (this.store.getDecisionBySource(
      'validator-fix-cycle',
      cycleSourceId,
      'validator-fix-cycle',
    )) {
      return { attempt, decision: null };
    }
    const decision = this.capture({
      draftId: input.draftId,
      kind: 'validator-fix-cycle-accepted',
      sourceType: 'validator-fix-cycle',
      sourceId: cycleSourceId,
      disposition: 'validator-fix-cycle',
      sourceTimestamp: attempt.createdAt,
      note: null,
    });
    return { attempt, decision };
  }

  list(
    draftId: string,
    options: { after?: number; limit?: number } = {},
  ): DecisionPage {
    if (!this.documentStore.getDraft(draftId)) {
      throw new Error(`draft not found: ${draftId}`);
    }
    const limit = options.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('limit must be an integer from 1 to 100');
    }
    const after = options.after ?? 0;
    if (!Number.isInteger(after) || after < 0) {
      throw new Error('after must be a non-negative integer');
    }
    const records = this.store.listDecisions(draftId, {
      afterSeq: after,
      limit: limit + 1,
    });
    const page = records.slice(0, limit);
    return {
      decisions: page.map(({ id }) => this.projector.resolve(id)),
      nextCursor: records.length > limit
        ? page.at(-1)!.seq
        : null,
    };
  }

  setNote(
    draftId: string,
    decisionId: string,
    note: string | null,
  ): ResolvedDecision {
    const decision = this.store.getDecision(decisionId);
    if (!decision || decision.draftId !== draftId) {
      throw new Error(`decision not found: ${decisionId}`);
    }
    this.store.setDecisionNote(decisionId, note, this.now());
    return this.projector.resolve(decisionId);
  }

  listLessons(draftId: string): LessonDetail[] {
    this.requireDraft(draftId);
    return this.store.listLessons(draftId).map((lesson) =>
      this.lessonDetail(lesson));
  }

  getLesson(draftId: string, lessonId: string): LessonDetail {
    this.requireDraft(draftId);
    const lesson = this.store.getLesson(lessonId);
    if (!lesson || lesson.draftId !== draftId) {
      throw new Error(`lesson not found: ${lessonId}`);
    }
    return this.lessonDetail(lesson);
  }

  editLesson(
    draftId: string,
    lessonId: string,
    input: {
      expectedVersion: number;
      reviewedMarkdown: string;
    },
  ): LessonDetail {
    this.getLesson(draftId, lessonId);
    requireLessonVersion(input.expectedVersion);
    if (typeof input.reviewedMarkdown !== 'string') {
      throw new Error('reviewedMarkdown must be a string');
    }
    return this.lessonDetail(this.store.editLesson(lessonId, {
      expectedVersion: input.expectedVersion,
      reviewedMarkdown: input.reviewedMarkdown,
      updatedAt: this.now(),
    }));
  }

  approveLesson(
    draftId: string,
    lessonId: string,
    input: { expectedVersion: number },
  ): LessonDetail {
    const detail = this.getLesson(draftId, lessonId);
    requireLessonVersion(input.expectedVersion);
    if (
      detail.state === 'approved'
      || detail.state === 'approved-pending-reconcile'
      || detail.state === 'applied'
    ) {
      return detail;
    }
    if (detail.reviewedMarkdown === null) {
      throw new Error(`lesson approval conflict: ${lessonId}`);
    }
    const timestamp = this.now();
    if (detail.classification === 'episode-local') {
      return this.lessonDetail(
        this.store.approveEpisodeLesson(lessonId, {
          expectedVersion: input.expectedVersion,
          updatedAt: timestamp,
        }),
      );
    }
    const kind: ReconciliationKind = detail.supersedesLessonId
      ? 'supersede'
      : 'apply';
    const reconciliation = this.newReconciliation(
      detail,
      kind,
      this.prepareReconciliationHandoff(detail, kind),
      timestamp,
    );
    const approved = this.store.approveDurableLesson(lessonId, {
      expectedVersion: input.expectedVersion,
      reconciliation,
      updatedAt: timestamp,
    });
    return this.lessonDetail(approved.lesson);
  }

  rejectLesson(
    draftId: string,
    lessonId: string,
    input: { expectedVersion: number },
  ): LessonDetail {
    this.getLesson(draftId, lessonId);
    requireLessonVersion(input.expectedVersion);
    return this.lessonDetail(this.store.rejectLesson(lessonId, {
      expectedVersion: input.expectedVersion,
      updatedAt: this.now(),
    }));
  }

  retireLesson(
    draftId: string,
    lessonId: string,
    input: { expectedVersion: number },
  ): LessonDetail {
    const detail = this.getLesson(draftId, lessonId);
    requireLessonVersion(input.expectedVersion);
    const timestamp = this.now();
    if (detail.state === 'retired' || detail.state === 'retirement-pending') {
      return detail;
    }
    if (detail.classification === 'episode-local') {
      return this.lessonDetail(
        this.store.retireEpisodeLesson(lessonId, {
          expectedVersion: input.expectedVersion,
          updatedAt: timestamp,
        }),
      );
    }
    const repository = this.resolveAppliedDurableLesson(detail);
    if (repository.status !== 'resolved') {
      throw new Error(
        `lesson retirement conflict: repository provenance is stale: ${
          repository.reason
        }`,
      );
    }
    const reconciliation = this.newReconciliation(
      detail,
      'retire',
      this.prepareReconciliationHandoff(detail, 'retire'),
      timestamp,
    );
    const prepared = this.store.prepareDurableRetirement(lessonId, {
      expectedVersion: input.expectedVersion,
      reconciliation,
      updatedAt: timestamp,
    });
    return this.lessonDetail(prepared.lesson);
  }

  supersedeLesson(
    draftId: string,
    lessonId: string,
    input: {
      expectedVersion: number;
      predecessorLessonId: string;
    },
  ): LessonDetail {
    this.getLesson(draftId, lessonId);
    const predecessor = this.getLesson(
      draftId,
      input.predecessorLessonId,
    );
    requireLessonVersion(input.expectedVersion);
    if (predecessor.id === lessonId) {
      throw new Error(`lesson supersession cycle: ${lessonId}`);
    }
    const linked = this.store.setLessonSupersedes(lessonId, {
      expectedVersion: input.expectedVersion,
      predecessorLessonId: input.predecessorLessonId,
      updatedAt: this.now(),
    });
    return this.approveLesson(draftId, lessonId, {
      expectedVersion: linked.version,
    });
  }

  markReconciliationAwaiting(
    resumeKey: string,
  ): LessonReconciliationRecord {
    return this.store.markReconciliationAwaiting(
      resumeKey,
      this.now(),
    );
  }

  verifyReconciliation(
    resumeKey: string,
    commit: string,
  ): LessonDetail {
    if (typeof commit !== 'string' || commit.trim() === '') {
      throw new Error('commit is required');
    }
    const reconciliation = this.store.getReconciliationByResumeKey(
      resumeKey,
    );
    if (!reconciliation) {
      throw new Error(`lesson reconciliation not found: ${resumeKey}`);
    }
    const lesson = this.store.getLesson(reconciliation.lessonId);
    if (!lesson) throw new Error(`lesson not found: ${reconciliation.lessonId}`);
    if (reconciliation.state === 'verified') {
      if (reconciliation.repositoryCommit !== commit) {
        throw new Error(
          `lesson reconciliation verification conflict: ${resumeKey}`,
        );
      }
      return this.lessonDetail(lesson);
    }
    if (!this.repositoryRootForDraft) {
      throw new Error('selected repository workspace is unavailable');
    }
    const repoRoot = this.repositoryRootForDraft(lesson.draftId);
    const verified = this.verifyReconciliationCommit(
      repoRoot,
      commit,
      this.reconciliationExpectation(lesson, reconciliation),
    );
    const pointer = verified.doctrinePointers[0] ?? null;
    if (reconciliation.kind !== 'retire' && pointer === null) {
      throw new ReconciliationVerificationRefusal(
        `reconciliation commit verification refused: checked commit ${
          verified.commit
        } and changed paths ${formatCheckedPaths(verified.changedPaths)}, but no non-empty doctrine anchor was found at that commit.`,
        {
          commit: verified.commit,
          repositoryRoot: repoRoot,
          changedPaths: verified.changedPaths,
        },
      );
    }
    const result = this.store.verifyReconciliation(resumeKey, {
      repositoryCommit: verified.commit,
      paths: verified.changedPaths,
      anchors: verified.doctrinePointers.map(({ anchor }) => anchor),
      contentHashes: verified.doctrinePointers.map(
        ({ contentHash }) => contentHash,
      ),
      repositoryPath: pointer?.path ?? null,
      repositoryAnchor: pointer?.anchor ?? null,
      repositoryContentHash: pointer?.contentHash ?? null,
      updatedAt: this.now(),
    });
    return this.lessonDetail(result.lesson);
  }

  verifyExistingDoctrine(
    resumeKey: string,
    input: {
      commit: string;
      path: string;
      anchor: string;
      contentHash: string;
    },
  ): LessonDetail {
    const reconciliation = this.store.getReconciliationByResumeKey(
      resumeKey,
    );
    if (!reconciliation) {
      throw new Error(`lesson reconciliation not found: ${resumeKey}`);
    }
    if (reconciliation.kind === 'retire') {
      throw new Error(
        'existing doctrine provenance cannot verify retirement',
      );
    }
    const lesson = this.store.getLesson(reconciliation.lessonId);
    if (!lesson) throw new Error(`lesson not found: ${reconciliation.lessonId}`);
    if (!this.repositoryRootForDraft) {
      throw new Error('selected repository workspace is unavailable');
    }
    const repoRoot = this.repositoryRootForDraft(lesson.draftId);
    const verified = this.verifyReconciliationCommit(
      repoRoot,
      input.commit,
      this.reconciliationExpectation(lesson, reconciliation),
    );
    const pointer = this.runReconciliationCheck(
      () => verifyExistingDoctrinePointer(repoRoot, input),
    );
    const matched = verified.doctrinePointers[0];
    if (
      !matched
      || matched.path !== pointer.path
      || matched.anchor !== pointer.anchor
      || matched.contentHash !== pointer.contentHash
    ) {
      throw new ReconciliationVerificationRefusal(
        `reconciliation commit verification refused: checked doctrine pointer ${
          pointer.path
        } ${pointer.anchor}, but it is not the hunk matched to the current lesson handoff.`,
        {
          commit: verified.commit,
          repositoryRoot: repoRoot,
          changedPaths: verified.changedPaths,
        },
      );
    }
    const result = this.store.verifyReconciliation(resumeKey, {
      repositoryCommit: verified.commit,
      paths: verified.changedPaths,
      anchors: [pointer.anchor],
      contentHashes: [pointer.contentHash],
      repositoryPath: pointer.path,
      repositoryAnchor: pointer.anchor,
      repositoryContentHash: pointer.contentHash,
      updatedAt: this.now(),
    });
    return this.lessonDetail(result.lesson);
  }

  activeEpisodeLessons(draftId: string): ActiveEpisodeLesson[] {
    this.requireDraft(draftId);
    return this.store.listActiveEpisodeLessons(draftId).map((lesson) => {
      if (lesson.reviewedMarkdown === null) {
        throw new Error(
          `approved episode lesson has no reviewed text: ${lesson.id}`,
        );
      }
      return {
        id: lesson.id,
        version: lesson.version,
        markdown: lesson.reviewedMarkdown,
        contentHash: hashMarkdown(lesson.reviewedMarkdown),
      };
    });
  }

  recordOperationLessons(
    operationId: string,
    lessons: ActiveEpisodeLesson[],
  ) {
    const timestamp = this.now();
    for (const snapshot of lessons) {
      const lesson = this.store.getLesson(snapshot.id);
      if (
        !lesson
        || lesson.classification !== 'episode-local'
        || lesson.state !== 'approved'
        || lesson.version !== snapshot.version
        || lesson.reviewedMarkdown !== snapshot.markdown
        || hashMarkdown(snapshot.markdown) !== snapshot.contentHash
      ) {
        throw new Error(
          `operation lesson snapshot conflict: ${operationId}`,
        );
      }
    }
    return this.store.recordOperationLessons(lessons.map((lesson) => ({
      operationId,
      lessonId: lesson.id,
      lessonVersion: lesson.version,
      contentHash: lesson.contentHash,
      createdAt: timestamp,
    })));
  }

  operationLessons(operationId: string) {
    return this.store.listOperationLessons(operationId);
  }

  private verifyReconciliationCommit(
    repoRoot: string,
    commit: string,
    expectation: ReconciliationVerificationExpectation,
  ): VerifiedReconciliationCommit {
    return this.runReconciliationCheck(
      () => verifyReconciliationCommit(repoRoot, commit, expectation),
    );
  }

  private reconciliationExpectation(
    lesson: LessonRecord,
    reconciliation: LessonReconciliationRecord,
  ): ReconciliationVerificationExpectation {
    let prior = lesson;
    if (
      reconciliation.kind === 'supersede'
      && lesson.supersedesLessonId
    ) {
      const predecessor = this.store.getLesson(lesson.supersedesLessonId);
      if (!predecessor) {
        throw new Error(
          `lesson not found: ${lesson.supersedesLessonId}`,
        );
      }
      prior = predecessor;
    }
    return {
      kind: reconciliation.kind,
      preparedAt: reconciliation.createdAt,
      preparedHead: reconciliation.preparedHead,
      candidateMarkdown: reconciliation.kind === 'retire'
        ? null
        : lesson.reviewedMarkdown,
      priorPointer: reconciliation.kind === 'apply'
        || !prior.repositoryPath
        || !prior.repositoryAnchor
        || !prior.repositoryContentHash
        ? null
        : {
            path: prior.repositoryPath,
            anchor: prior.repositoryAnchor,
            contentHash: prior.repositoryContentHash,
          },
    };
  }

  private runReconciliationCheck<T>(check: () => T): T {
    try {
      return check();
    } catch (error) {
      if (error instanceof ReconciliationCommitMismatchError) {
        throw new ReconciliationVerificationRefusal(
          error.message,
          error.checked,
        );
      }
      throw error;
    }
  }

  recoverOperationLessons(
    operationId: string,
    inputs: unknown,
    draftId: string | null = null,
  ) {
    const existing = this.store.listOperationLessons(operationId);
    if (existing.length > 0) return existing;
    const record = recordValue(inputs);
    const supplied = record?.['approved_lessons'];
    if (
      !Array.isArray(supplied)
      || supplied.length === 0
      || !supplied.every((lesson) => typeof lesson === 'string')
    ) {
      return [];
    }
    if (!draftId) return [];
    const lessons = this.activeEpisodeLessons(draftId);
    if (
      JSON.stringify(lessons.map(({ markdown }) => markdown))
      !== JSON.stringify(supplied)
    ) {
      return [];
    }
    return this.recordOperationLessons(operationId, lessons);
  }

  listSessions(draftId: string): LearningSessionRecord[] {
    this.requireDraft(draftId);
    return this.store.listSessions(draftId);
  }

  startDistillation(
    draftId: string,
    trigger: DistillationTrigger,
  ): DistillationRunRecord {
    this.requireDraft(draftId);
    if (trigger !== 'on-demand' && trigger !== 'session-end') {
      throw new Error('distillation trigger must be on-demand or session-end');
    }
    const active = this.store.getActiveDistillationRun(draftId, trigger);
    if (active) return this.reconcileDistillation(active.id);

    const timestamp = this.now();
    const session = this.ensureOpenSession(draftId, timestamp);
    const selectedCursor = this.store.latestDecisionSeq(draftId);
    const decisions = this.store.listDecisions(draftId, {
      afterSeq: session.startCursor,
      limit: 1_000_000,
    }).filter(({ seq }) => seq <= selectedCursor).map(({ id }) => ({
      decisionId: id,
      snapshot: this.projector.resolve(id),
    }));
    const lessons = this.store.listLessons(draftId).map((lesson) => ({
      lessonId: lesson.id,
      snapshot: this.freezeLesson(lesson),
    }));
    const run = this.store.createDistillationRun({
      id: this.idFactory(),
      draftId,
      sessionId: session.id,
      trigger,
      state: decisions.length === 0 ? 'no-op' : 'frozen',
      operationId: null,
      resumeKey: this.resumeKeyFactory(),
      guardrailMarkdown: null,
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      decisions,
      lessons,
    }, trigger === 'session-end'
      ? { closeSessionAt: selectedCursor }
      : {});
    return run.state === 'no-op' ? run : this.launchDistillation(run);
  }

  getDistillationRun(id: string): DistillationRunRecord {
    const run = this.store.getDistillationRun(id);
    if (!run) throw new Error(`distillation run not found: ${id}`);
    return run;
  }

  reconcileDistillation(id: string): DistillationRunRecord {
    const run = this.getDistillationRun(id);
    if (
      run.state === 'ingested'
      || run.state === 'no-op'
      || run.state === 'failed'
      || run.state === 'cancelled'
      || run.state === 'interrupted'
    ) {
      return run;
    }
    if (run.state === 'frozen' || run.operationId === null) {
      return this.launchDistillation(run);
    }
    const operationService = this.requireOperationService();
    const result = operationService.result(run.operationId);
    if (result.kind === 'pending') {
      const state = operationService.get(run.operationId).state;
      return this.store.updateDistillationRun(run.id, {
        state: state === 'running' ? 'running' : 'queued',
        error: null,
        updatedAt: this.now(),
      });
    }
    if (result.kind === 'failed') {
      const operationState = operationService.get(run.operationId).state;
      return this.store.updateDistillationRun(run.id, {
        state: operationState === 'cancelled'
          ? 'cancelled'
          : operationState === 'interrupted'
          ? 'interrupted'
          : 'failed',
        error: result.error,
        updatedAt: this.now(),
      });
    }
    if (result.kind !== 'schema') {
      return this.failDistillation(run.id, 'distillation returned raw output');
    }

    try {
      const value = validateDistillationResult(result.value);
      if (value.status !== 'complete') {
        return this.store.ingestDistillationRun(
          run.id,
          [],
          value.guardrail_markdown,
          this.now(),
        );
      }
      const decisionIds = new Set(
        run.decisions.map(({ decisionId }) => decisionId),
      );
      const lessonIds = new Set(
        run.lessons.map(({ lessonId }) => lessonId),
      );
      const timestamp = this.now();
      const lessons = value.lessons.map((lesson) => {
        validateDistilledLessonEvidence(lesson, decisionIds, lessonIds);
        const id = this.idFactory();
        return {
          record: {
            id,
            draftId: run.draftId,
            distillationRunId: run.id,
            classification: lesson.classification,
            state: 'proposed' as const,
            proposedMarkdown: lesson.lesson_markdown,
            reviewedMarkdown: lesson.lesson_markdown,
            rationaleMarkdown: lesson.rationale_markdown,
            proposedTarget: lesson.proposed_target,
            supersedesLessonId: lesson.supersedes_lesson_id,
            version: 1,
            repositoryCommit: null,
            repositoryPath: null,
            repositoryAnchor: null,
            repositoryContentHash: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          evidenceIds: lesson.evidence,
        };
      });
      return this.store.ingestDistillationRun(
        run.id,
        lessons,
        value.guardrail_markdown,
        timestamp,
      );
    } catch (error) {
      return this.failDistillation(
        run.id,
        error instanceof Error
          ? error.message
          : 'invalid distillation result',
      );
    }
  }

  recoverDistillations(): DistillationRunRecord[] {
    return this.store.listRecoverableDistillationRuns().map((run) =>
      this.reconcileDistillation(run.id));
  }

  private lessonDetail(lesson: LessonRecord): LessonDetail {
    const evidenceIds = this.store.listLessonEvidence(lesson.id);
    const evidence = evidenceIds.map((id): LessonEvidenceView => {
      try {
        return {
          id,
          status: 'resolved',
          decision: this.projector.resolve(id),
        };
      } catch {
        return { id, status: 'stale', decision: null };
      }
    });
    const reconciliationHistory =
      this.store.listLessonReconciliations(lesson.id);
    const reconciliation = reconciliationHistory.at(-1) ?? null;
    const repositoryProvenance =
      lesson.classification === 'durable' && (
        lesson.state === 'applied'
        || lesson.state === 'retirement-pending'
        || lesson.state === 'supersession-pending'
        || lesson.state === 'retired'
        || lesson.state === 'superseded'
      )
        ? this.resolveAppliedDurableLesson(lesson)
        : null;
    return {
      ...lesson,
      evidenceIds,
      evidence,
      reconciliation,
      reconciliationHistory,
      currentMarkdown: repositoryProvenance?.status === 'resolved'
        ? repositoryProvenance.lesson_markdown
        : lesson.reviewedMarkdown ?? lesson.proposedMarkdown,
      repositoryProvenance,
    };
  }

  private newReconciliation(
    lesson: LessonRecord,
    kind: ReconciliationKind,
    preparedMarkdown: string,
    timestamp: string,
  ): LessonReconciliationRecord {
    let preparedHead: string | null = null;
    try {
      const root = this.repositoryRootForDraft?.(lesson.draftId);
      if (root) preparedHead = gitHead(root);
    } catch {
      preparedHead = null;
    }
    return {
      id: this.idFactory(),
      lessonId: lesson.id,
      kind,
      state: 'prepared',
      resumeKey: this.resumeKeyFactory(),
      preparedMarkdown,
      preparedHead,
      repositoryCommit: null,
      paths: [],
      anchors: [],
      contentHashes: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      verifiedAt: null,
    };
  }

  private prepareReconciliationHandoff(
    lesson: LessonDetail,
    kind: ReconciliationKind,
  ): string {
    const action = kind === 'apply'
      ? 'apply this durable doctrine candidate'
      : kind === 'retire'
      ? 'retire this applied durable doctrine'
      : 'supersede the prior applied durable doctrine with this candidate';
    const candidate = lesson.reviewedMarkdown
      ?? lesson.currentMarkdown
      ?? '[repository pointer unresolved]';
    const evidence = lesson.evidence.map(({ id, status, decision }) => ({
      decision_id: id,
      status,
      decision,
    }));
    return [
      '# Prepared Why Humans Play reconciliation handoff',
      '',
      `Requested action: ${action}.`,
      '',
      'This is a candidate proposal for Martin’s review, not an app-authored instruction.',
      '',
      '## Reviewed candidate',
      '',
      candidate,
      '',
      '## Rationale',
      '',
      lesson.rationaleMarkdown,
      '',
      '## Provenance',
      '',
      `- Lesson ID: ${lesson.id}`,
      `- Draft ID: ${lesson.draftId}`,
      `- Classification: ${lesson.classification}`,
      `- Proposed target hint: ${lesson.proposedTarget ?? 'none'}`,
      `- Supersedes lesson: ${lesson.supersedesLessonId ?? 'none'}`,
      '',
      '```json',
      JSON.stringify(evidence, null, 2),
      '```',
      '',
      'Run `$reconcile-whp` in the selected repository controller. The reconcile skill—not Script Creator—chooses and edits the affected steering or skill files and `DECISIONS.md`. Review that diff and make the deliberate repository commit outside Script Creator.',
      '',
      'Script Creator has not edited or committed doctrine.',
    ].join('\n');
  }

  private launchDistillation(
    run: DistillationRunRecord,
  ): DistillationRunRecord {
    const operationService = this.requireOperationService();
    const inputs = {
      session: {
        id: run.sessionId,
        draft_id: run.draftId,
        trigger: run.trigger,
        decisions: run.decisions.map(({ snapshot }) => snapshot),
      },
      existing_lessons: run.lessons.map(({ snapshot }) => snapshot),
    };
    try {
      let cwd: string | undefined;
      try {
        cwd = this.repositoryRootForDraft?.(run.draftId);
      } catch {
        cwd = undefined;
      }
      const operationId = operationService.submit(
        'distill',
        inputs,
        cwd ? { cwd } : undefined,
      );
      return this.store.updateDistillationRun(run.id, {
        state: 'queued',
        operationId,
        error: null,
        updatedAt: this.now(),
      });
    } catch (error) {
      return this.store.updateDistillationRun(run.id, {
        state: 'frozen',
        error: error instanceof Error
          ? error.message
          : 'distillation launch failed',
        updatedAt: this.now(),
      });
    }
  }

  private failDistillation(
    runId: string,
    error: string,
  ): DistillationRunRecord {
    return this.store.updateDistillationRun(runId, {
      state: 'failed',
      error,
      updatedAt: this.now(),
    });
  }

  private ensureOpenSession(
    draftId: string,
    createdAt = this.now(),
  ): LearningSessionRecord {
    const existing = this.store.getOpenSession(draftId);
    if (existing) return existing;
    return this.store.openSession({
      id: this.idFactory(),
      draftId,
      startCursor: this.store.latestDecisionSeq(draftId),
      endCursor: null,
      createdAt,
      closedAt: null,
    });
  }

  private freezeLesson(lesson: LessonRecord): unknown {
    let lessonMarkdown = lesson.reviewedMarkdown
      ?? lesson.proposedMarkdown;
    let repositoryProvenance: unknown = null;
    if (lesson.classification === 'durable' && lesson.state === 'applied') {
      const resolved = this.resolveAppliedDurableLesson(lesson);
      lessonMarkdown = resolved.status === 'resolved'
        ? resolved.lesson_markdown
        : null;
      repositoryProvenance = resolved;
    }
    return {
      id: lesson.id,
      draft_id: lesson.draftId,
      classification: lesson.classification,
      state: lesson.state,
      lesson_markdown: lessonMarkdown,
      rationale_markdown: lesson.rationaleMarkdown,
      proposed_target: lesson.proposedTarget,
      supersedes_lesson_id: lesson.supersedesLessonId,
      evidence: this.store.listLessonEvidence(lesson.id),
      repository_provenance: repositoryProvenance,
    };
  }

  private resolveAppliedDurableLesson(lesson: LessonRecord): {
    status: 'resolved';
    lesson_markdown: string;
    path: string;
    anchor: string;
    content_hash: string;
  } | {
    status: 'unresolved';
    reason: string;
    path: string | null;
    anchor: string | null;
    content_hash: string | null;
  } {
    const unresolved = (reason: string) => ({
      status: 'unresolved' as const,
      reason,
      path: lesson.repositoryPath,
      anchor: lesson.repositoryAnchor,
      content_hash: lesson.repositoryContentHash,
    });
    if (
      !lesson.repositoryPath
      || !lesson.repositoryAnchor
      || !lesson.repositoryContentHash
    ) {
      return unresolved('verified repository pointer is incomplete');
    }
    if (!this.repositoryRootForDraft) {
      return unresolved('selected repository workspace is unavailable');
    }
    try {
      const root = resolve(this.repositoryRootForDraft(lesson.draftId));
      const path = resolve(root, lesson.repositoryPath);
      if (path !== root && !path.startsWith(`${root}${sep}`)) {
        return unresolved('repository path escapes the selected workspace');
      }
      const match = /^lines:(\d+)-(\d+)$/u.exec(
        lesson.repositoryAnchor,
      );
      if (!match) return unresolved('repository anchor is invalid');
      const start = Number(match[1]);
      const end = Number(match[2]);
      const lines = readFileSync(path, 'utf8').split('\n');
      if (start < 1 || end < start || end > lines.length) {
        return unresolved('repository anchor no longer resolves');
      }
      const lessonMarkdown = lines.slice(start - 1, end).join('\n');
      if (hashMarkdown(lessonMarkdown) !== lesson.repositoryContentHash) {
        return unresolved('repository doctrine content hash is stale');
      }
      return {
        status: 'resolved',
        lesson_markdown: lessonMarkdown,
        path: lesson.repositoryPath,
        anchor: lesson.repositoryAnchor,
        content_hash: lesson.repositoryContentHash,
      };
    } catch {
      return unresolved('repository doctrine pointer cannot be read');
    }
  }

  private requireOperationService(): LearningOperationService {
    if (!this.operationService) {
      throw new Error('distillation operation service is not configured');
    }
    return this.operationService;
  }

  private requireDraft(draftId: string): void {
    if (!this.documentStore.getDraft(draftId)) {
      throw new Error(`draft not found: ${draftId}`);
    }
  }

  private revisionHasNormativeProof(
    revision: RevisionRecord,
    kind: DecisionKind,
    proof: { gateCompleted?: boolean },
  ): boolean {
    if (
      kind === 'proposal-accepted'
      || kind === 'personal-input-integrated'
    ) {
      if (!revision.opId) return false;
      const operation = this.completedDraftOperation(
        revision.opId,
        revision.draftId,
      );
      if (!operation) return false;
      if (
        revision.disposition === 'architecture-proposal-accepted'
        || revision.disposition === 'architecture-proposals-accepted'
      ) {
        const proposal = this.documentStore.getArchitectureProposal(
          revision.draftId,
          revision.opId,
        );
        return proposal?.state === 'accepted'
          && proposal.resolvedAt !== null
          && proposal.revisionId !== null
          && architectureAcceptanceMatchesOperation(
            revision,
            operation,
            this.documentStore.listRevisions(revision.draftId),
          );
      }
      const proposal = this.documentStore.getNarrationProposal(
        revision.draftId,
        revision.opId,
      );
      return proposal?.state === 'accepted'
        && proposal.resolvedAt !== null
        && proposal.acceptedRevisionId === revision.id;
    }
    if (kind === 'variant-picked') {
      return this.variantPickHasNormativeProof(revision);
    }
    if (kind !== 'gate-action') return true;
    if (
      revision.disposition === 'architecture-approved'
      || revision.disposition === 'architecture-reopened'
    ) {
      const action = revision.disposition === 'architecture-approved'
        ? 'approve'
        : 'reopen';
      const saga = this.documentStore.getArchitectureSaga(
        revision.draftId,
        action,
        revision.seq - 1,
      );
      return Boolean(
        saga
        && saga.revisionAppended
        && saga.artifactWritten
        && saga.pipelineUpserted
        && saga.draftUpdated,
      );
    }
    if (!proof.gateCompleted) return false;
    const draft = this.documentStore.getDraft(revision.draftId);
    if (!draft) return false;
    if (revision.disposition === 'narration-approved') {
      return draft.approvedNarrationRevisionSeq === revision.seq
        && draft.approvedNarrationAt === revision.createdAt
        && draft.approvedNarrationMd !== null
        && draft.narrationArtifactHash !== null;
    }
    return revision.disposition === 'narration-reconciled'
      && draft.narrationReconciliationRequired === false;
  }

  private variantPickHasNormativeProof(
    revision: RevisionRecord,
  ): boolean {
    const picked = decodeVariantPickedDisposition(revision.disposition);
    if (!picked || !revision.opId) return false;
    const operation = this.completedDraftOperation(
      revision.opId,
      revision.draftId,
    );
    if (!operation || operation.operation !== 'generate-alternatives') {
      return false;
    }
    const revisions = this.documentStore.listRevisions(revision.draftId);
    const index = revisions.findIndex(({ id }) => id === revision.id);
    const before = index > 0 ? revisions[index - 1] : null;
    if (!before || JSON.stringify(before.doc) === JSON.stringify(revision.doc)) {
      return false;
    }
    const variant = findVariantSet(before.doc, picked.variantSetId);
    const selectedIndex = variant
      ? variantAlternativeIndex(variant, picked.alternativeId)
      : null;
    if (
      !variant
      || variant.originOperationId !== revision.opId
      || selectedIndex === null
      || variant.activeIndex !== selectedIndex
    ) {
      return false;
    }
    return editorPickMatchesTransition(
      before.doc,
      revision.doc,
      picked.variantSetId,
    );
  }

  private completedDraftOperation(
    operationId: string,
    draftId: string,
  ): OperationDecisionEvidence | null {
    const evidence = this.operationEvidence(operationId);
    if (
      !evidence
      || evidence.draftId !== draftId
      || evidence.state !== 'completed'
      || !isCompletedOperationResult(evidence.result)
    ) {
      return null;
    }
    return evidence;
  }

  private requireCompletedDraftOperation(
    operationId: string,
    draftId: string,
  ): OperationDecisionEvidence {
    const evidence = this.completedDraftOperation(operationId, draftId);
    if (!evidence) {
      throw new Error(
        `proposal resolution refused: operation ${operationId} has no completed result for draft ${draftId}`,
      );
    }
    return evidence;
  }

  private capture(input: {
    draftId: string;
    kind: DecisionKind;
    sourceType: string;
    sourceId: string;
    disposition: string;
    sourceTimestamp: string;
    note: string | null;
  }): DecisionEventRecord {
    const existing = this.store.getDecisionBySource(
      input.sourceType,
      input.sourceId,
      input.disposition,
    );
    if (existing) {
      return input.note === null || existing.note === input.note
        ? existing
        : this.store.setDecisionNote(
            existing.id,
            input.note,
            input.sourceTimestamp,
          );
    }
    this.ensureOpenSession(input.draftId, input.sourceTimestamp);
    const record = this.store.captureDecision({
      id: this.idFactory(),
      draftId: input.draftId,
      seq: this.store.nextDecisionSeq(input.draftId),
      kind: input.kind,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      disposition: input.disposition,
      sourceTimestamp: input.sourceTimestamp,
      createdAt: this.now(),
      note: null,
    });
    return input.note === null
      ? record
      : this.store.setDecisionNote(
          record.id,
          input.note,
          input.sourceTimestamp,
        );
  }
}

function isCompletedOperationResult(value: unknown): boolean {
  const result = recordValue(value);
  return result?.['kind'] === 'schema' || result?.['kind'] === 'raw';
}

function architectureAcceptanceMatchesOperation(
  revision: RevisionRecord,
  operation: OperationDecisionEvidence,
  revisions: RevisionRecord[],
): boolean {
  if (revision.kind !== 'architecture') return false;
  const proposals = architectureProposalsFromOperation(operation);
  if (proposals.length === 0) return false;
  const after = architectureFromRevision(revision);
  if (!after || hasDuplicateSectionKeys(after.sections)) return false;

  const index = revisions.findIndex(({ id }) => id === revision.id);
  if (index < 0) return false;
  const beforeRevision = revisions
    .slice(0, index)
    .reverse()
    .find(({ kind }) => kind === 'architecture');
  const before = beforeRevision
    ? architectureFromRevision(beforeRevision)
    : null;
  if (beforeRevision && !before) return false;

  const changed = before
    ? changedArchitectureSections(before, after)
    : after.sections.filter((section) =>
        proposals.some((proposal) => sameSection(proposal, section)));
  if (
    changed === null
    || changed.length === 0
    || (
      revision.disposition === 'architecture-proposal-accepted'
      && changed.length !== 1
    )
  ) {
    return false;
  }
  if (!changed.every((section) =>
    proposals.some((proposal) => sameSection(proposal, section)))) {
    return false;
  }
  const previouslyAccepted = acceptedArchitectureProposalsBefore(
    revisions,
    index,
    revision.opId!,
    proposals,
  );
  return previouslyAccepted !== null
    && !changed.some((section) =>
      previouslyAccepted.some((accepted) =>
        sameSection(accepted, section)));
}

function architectureProposalsFromOperation(
  operation: OperationDecisionEvidence,
): ArchitectureSection[] {
  const result = recordValue(operation.result);
  if (
    operation.operation === 'generate-architecture'
    && result?.['kind'] === 'raw'
    && typeof result['markdown'] === 'string'
  ) {
    return splitArchitecture(result['markdown']);
  }
  if (
    operation.operation === 'rewrite-architecture-section'
    && result?.['kind'] === 'schema'
  ) {
    const value = recordValue(result['value']);
    const replacement = value?.['replacement_markdown'];
    return typeof replacement === 'string'
      ? splitArchitecture(replacement)
      : [];
  }
  return [];
}

function acceptedArchitectureProposalsBefore(
  revisions: RevisionRecord[],
  endIndex: number,
  operationId: string,
  proposals: readonly ArchitectureSection[],
): ArchitectureSection[] | null {
  const accepted: ArchitectureSection[] = [];
  let before: DraftArchitecture | null = null;
  for (const revision of revisions.slice(0, endIndex)) {
    if (revision.kind !== 'architecture') continue;
    const after = architectureFromRevision(revision);
    if (!after) return null;
    if (
      revision.opId === operationId
      && (
        revision.disposition === 'architecture-proposal-accepted'
        || revision.disposition === 'architecture-proposals-accepted'
      )
    ) {
      const changed = before
        ? changedArchitectureSections(before, after)
        : after.sections.filter((section) =>
            proposals.some((proposal) => sameSection(proposal, section)));
      if (changed === null) return null;
      accepted.push(...changed.filter((section) =>
        proposals.some((proposal) => sameSection(proposal, section))));
    }
    before = after;
  }
  return accepted;
}

function architectureFromRevision(
  revision: RevisionRecord,
): DraftArchitecture | null {
  const value = recordValue(revision.doc);
  if (!value || !Array.isArray(value['sections'])) return null;
  const sections: ArchitectureSection[] = [];
  for (const section of value['sections']) {
    const candidate = recordValue(section);
    if (
      !candidate
      || typeof candidate['key'] !== 'string'
      || typeof candidate['title'] !== 'string'
      || typeof candidate['md'] !== 'string'
    ) {
      return null;
    }
    sections.push({
      key: candidate['key'],
      title: candidate['title'],
      md: candidate['md'],
    });
  }
  const approvedMd = value['approvedMd'];
  const approvedAt = value['approvedAt'];
  if (
    (approvedMd !== null && typeof approvedMd !== 'string')
    || (approvedAt !== null && typeof approvedAt !== 'string')
  ) {
    return null;
  }
  return {
    sections,
    approvedMd,
    approvedAt,
  };
}

function changedArchitectureSections(
  before: DraftArchitecture,
  after: DraftArchitecture,
): ArchitectureSection[] | null {
  if (
    before.approvedMd !== after.approvedMd
    || before.approvedAt !== after.approvedAt
    || hasDuplicateSectionKeys(before.sections)
  ) {
    return null;
  }
  const afterByKey = new Map(
    after.sections.map((section) => [section.key, section]),
  );
  if (before.sections.some(({ key }) => !afterByKey.has(key))) return null;
  const beforeByKey = new Map(
    before.sections.map((section) => [section.key, section]),
  );
  return after.sections.filter((section) => {
    const previous = beforeByKey.get(section.key);
    return !previous || !sameSection(previous, section);
  });
}

function hasDuplicateSectionKeys(
  sections: readonly ArchitectureSection[],
): boolean {
  return new Set(sections.map(({ key }) => key)).size !== sections.length;
}

function sameSection(
  left: ArchitectureSection,
  right: ArchitectureSection,
): boolean {
  return left.key === right.key
    && left.title === right.title
    && left.md === right.md;
}

function isQualifyingValidatorFixRevision(
  revisions: RevisionRecord[],
  revision: RevisionRecord,
): boolean {
  return revision.kind === 'narration'
    && revision.disposition !== 'restore'
    && !revision.disposition.startsWith('restore-')
    && revisionChangesDocument(revisions, revision);
}

function revisionChangesDocument(
  revisions: RevisionRecord[],
  revision: RevisionRecord,
): boolean {
  const index = revisions.findIndex(({ id }) => id === revision.id);
  if (index <= 0) return false;
  const previousNarration = revisions
    .slice(0, index)
    .reverse()
    .find(({ kind }) => kind === 'narration');
  return previousNarration !== undefined
    && JSON.stringify(previousNarration.doc) !== JSON.stringify(revision.doc);
}

interface VariantSetProof {
  originOperationId: string | null;
  activeIndex: number | null;
  optionCount: number;
}

function findVariantSet(
  value: unknown,
  variantSetId: string,
): VariantSetProof | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findVariantSet(item, variantSetId);
      if (found) return found;
    }
    return null;
  }
  const record = recordValue(value);
  if (!record) return null;
  const attrs = recordValue(record['attrs']);
  if (
    (record['type'] === 'variantSet' || record['type'] === 'inlineVariantSet')
    && attrs?.['variantId'] === variantSetId
  ) {
    const origin = attrs['originOperationId'];
    const activeIndex = attrs['activeIndex'];
    const options = record['type'] === 'inlineVariantSet'
      ? attrs['options']
      : record['content'];
    return {
      originOperationId: typeof origin === 'string' ? origin : null,
      activeIndex: Number.isInteger(activeIndex)
        ? Number(activeIndex)
        : null,
      optionCount: Array.isArray(options) ? options.length : 0,
    };
  }
  for (const nested of Object.values(record)) {
    const found = findVariantSet(nested, variantSetId);
    if (found) return found;
  }
  return null;
}

function variantAlternativeIndex(
  variant: VariantSetProof,
  alternativeId: string,
): number | null {
  const match = /^alternative:(\d+)$/u.exec(alternativeId);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isInteger(index)
    && index >= 0
    && index < variant.optionCount
    ? index
    : null;
}

function editorPickMatchesTransition(
  before: unknown,
  after: unknown,
  variantSetId: string,
): boolean {
  try {
    let state = EditorState.create({
      doc: editorSchema.nodeFromJSON(before),
    });
    const picked = pickEditorVariant(
      state,
      (transaction) => {
        state = state.apply(transaction);
      },
      variantSetId,
    );
    return picked && state.doc.eq(editorSchema.nodeFromJSON(after));
  } catch {
    return false;
  }
}

function validateDistillationResult(value: unknown): DistillationResult {
  const result = recordValue(value);
  if (!result) throw new Error('distillation result must be an object');
  requireExactKeys(result, [
    'status',
    'lessons',
    'guardrail_markdown',
  ], 'distillation result');
  if (
    result['status'] !== 'complete'
    && result['status'] !== 'narrowed'
    && result['status'] !== 'declined'
  ) {
    throw new Error('distillation status is invalid');
  }
  if (!Array.isArray(result['lessons'])) {
    throw new Error('distillation lessons must be an array');
  }
  if (
    result['guardrail_markdown'] !== null
    && typeof result['guardrail_markdown'] !== 'string'
  ) {
    throw new Error('distillation guardrail must be a string or null');
  }
  const lessons = result['lessons'].map((value, index) => {
    const lesson = recordValue(value);
    if (!lesson) {
      throw new Error(`distillation lesson ${index} must be an object`);
    }
    requireExactKeys(lesson, [
      'classification',
      'lesson_markdown',
      'rationale_markdown',
      'evidence',
      'proposed_target',
      'supersedes_lesson_id',
    ], `distillation lesson ${index}`);
    if (
      lesson['classification'] !== 'episode-local'
      && lesson['classification'] !== 'durable'
    ) {
      throw new Error(
        `distillation lesson ${index} classification is invalid`,
      );
    }
    if (typeof lesson['lesson_markdown'] !== 'string') {
      throw new Error(
        `distillation lesson ${index} lesson_markdown is required`,
      );
    }
    if (typeof lesson['rationale_markdown'] !== 'string') {
      throw new Error(
        `distillation lesson ${index} rationale_markdown is required`,
      );
    }
    if (
      !Array.isArray(lesson['evidence'])
      || !lesson['evidence'].every((id) => typeof id === 'string')
    ) {
      throw new Error(
        `distillation lesson ${index} evidence must be string IDs`,
      );
    }
    if (
      lesson['proposed_target'] !== null
      && typeof lesson['proposed_target'] !== 'string'
    ) {
      throw new Error(
        `distillation lesson ${index} proposed_target is invalid`,
      );
    }
    if (
      lesson['supersedes_lesson_id'] !== null
      && typeof lesson['supersedes_lesson_id'] !== 'string'
    ) {
      throw new Error(
        `distillation lesson ${index} supersedes_lesson_id is invalid`,
      );
    }
    return lesson as unknown as DistilledLesson;
  });
  return {
    status: result['status'],
    lessons,
    guardrail_markdown: result['guardrail_markdown'],
  };
}

function validateDistilledLessonEvidence(
  lesson: DistilledLesson,
  frozenDecisionIds: Set<string>,
  frozenLessonIds: Set<string>,
): void {
  if (lesson.evidence.length === 0) {
    throw new Error('distilled lesson evidence must not be empty');
  }
  if (new Set(lesson.evidence).size !== lesson.evidence.length) {
    throw new Error('distilled lesson evidence contains duplicate IDs');
  }
  for (const decisionId of lesson.evidence) {
    if (!frozenDecisionIds.has(decisionId)) {
      throw new Error(
        `distilled lesson evidence is not a frozen decision: ${decisionId}`,
      );
    }
  }
  if (
    lesson.supersedes_lesson_id !== null
    && !frozenLessonIds.has(lesson.supersedes_lesson_id)
  ) {
    throw new Error(
      `distilled lesson supersession is not a frozen lesson: ${
        lesson.supersedes_lesson_id
      }`,
    );
  }
  if (
    lesson.classification === 'episode-local'
    && lesson.proposed_target !== null
  ) {
    throw new Error(
      'episode-local distilled lessons must have a null proposed target',
    );
  }
}

function requireExactKeys(
  record: Record<string, unknown>,
  keys: string[],
  label: string,
): void {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} has unexpected or missing fields`);
  }
}

function hashMarkdown(markdown: string): string {
  return `sha256:${createHash('sha256').update(markdown).digest('hex')}`;
}

function formatCheckedPaths(paths: string[]): string {
  return `[${paths.join(', ')}]`;
}

function requireLessonVersion(value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('expectedVersion must be a positive integer');
  }
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
