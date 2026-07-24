import { randomUUID } from 'node:crypto';
import type {
  DocumentStore,
  PromotionRecord,
  RevisionRecord,
} from '../documents/store.js';
import type { TopicStore } from '../topics/store.js';
import {
  DecisionProjector,
  decisionKindForRevisionDisposition,
  type OperationDecisionEvidence,
  type ResolvedDecision,
} from './decisions.js';
import type {
  DecisionEventRecord,
  DecisionKind,
  LearningStore,
  ValidatorAttemptRecord,
} from './store.js';

export interface DecisionPage {
  decisions: ResolvedDecision[];
  nextCursor: number | null;
}

export class LearningService {
  private readonly store: LearningStore;
  private readonly documentStore: DocumentStore;
  private readonly topicStore: TopicStore;
  private readonly projector: DecisionProjector;
  private readonly idFactory: () => string;
  private readonly now: () => string;

  constructor(options: {
    store: LearningStore;
    documentStore: DocumentStore;
    topicStore: TopicStore;
    operationEvidence: (
      operationId: string,
    ) => OperationDecisionEvidence | null;
    idFactory?: () => string;
    now?: () => string;
  }) {
    this.store = options.store;
    this.documentStore = options.documentStore;
    this.topicStore = options.topicStore;
    this.idFactory = options.idFactory ?? randomUUID;
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
  ): DecisionEventRecord | null {
    const kind = decisionKindForRevisionDisposition(
      revision.disposition,
    );
    if (!kind) return null;
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
    if (proposal.state === 'pending') {
      this.documentStore.resolveNarrationProposal(
        input.draftId,
        input.operationId,
        input.decision,
        input.resolvedAt,
        {
          reasonNote: input.reason,
          successorOperationId: input.successorOperationId,
        },
      );
    } else if (
      proposal.state !== input.decision
      || proposal.reasonNote !== input.reason
      || proposal.successorOperationId !== input.successorOperationId
    ) {
      throw new Error(
        `narration proposal disposition conflict: ${input.operationId}`,
      );
    }

    if (input.decision === 'accepted') {
      const revision = this.documentStore.getRevisionForOperation(
        input.draftId,
        input.operationId,
      );
      if (!revision) {
        throw new Error(
          `accepted proposal revision missing: ${input.operationId}`,
        );
      }
      const decision = this.captureRevision(revision);
      if (!decision) {
        throw new Error(
          `accepted proposal disposition is not recognized: ${
            revision.disposition
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
    const revisions = this.documentStore.listRevisions(input.draftId)
      .filter((revision) =>
        revision.createdAt > previousFailure.createdAt
        && revision.createdAt < attempt.createdAt);
    if (revisions.length === 0) return { attempt, decision: null };
    const decision = this.capture({
      draftId: input.draftId,
      kind: 'validator-fix-cycle-accepted',
      sourceType: 'validator-fix-cycle',
      sourceId: `${previousFailure.id}:${attempt.id}`,
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
