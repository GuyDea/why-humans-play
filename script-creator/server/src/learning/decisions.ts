import type {
  DocumentStore,
  RevisionRecord,
} from '../documents/store.js';
import type { TopicStore } from '../topics/store.js';
import type {
  DecisionEventRecord,
  DecisionKind,
  LearningStore,
} from './store.js';

const REVISION_DECISIONS = new Map<string, DecisionKind>([
  ['episode-generation-accepted', 'proposal-accepted'],
  ['architecture-proposal-accepted', 'proposal-accepted'],
  ['architecture-proposals-accepted', 'proposal-accepted'],
  ['selection-proposal-accepted', 'proposal-accepted'],
  ['personal-input-proposal-accepted', 'personal-input-integrated'],
  ['architecture-approved', 'gate-action'],
  ['architecture-reopened', 'gate-action'],
  ['narration-reconciled', 'gate-action'],
  ['narration-approved', 'gate-action'],
]);

const VARIANT_PICK_PREFIX = 'variant-picked/';

export interface OperationDecisionEvidence {
  operationId: string;
  draftId: string | null;
  operation: string;
  state: string;
  envelope: unknown;
  result: unknown;
}

export interface ResolvedDecisionContext {
  source: {
    type: string;
    id: string;
    disposition: string;
  };
  operation?: OperationDecisionEvidence | {
    operationId: string;
    missing: true;
  };
  revision?: RevisionRecord;
  beforeRevision?: RevisionRecord | null;
  diff?: {
    before: unknown | null;
    after: unknown;
  };
  proposal?: unknown;
  packageTest?: unknown;
  topicHandoff?: unknown;
  validatorAttempts?: unknown[];
  revisions?: RevisionRecord[];
  promotion?: unknown;
}

export interface ResolvedDecision
  extends Omit<DecisionEventRecord, 'sourceType' | 'sourceId'> {
  context: ResolvedDecisionContext;
}

export function decisionKindForRevisionDisposition(
  disposition: string,
): DecisionKind | null {
  if (decodeVariantPickedDisposition(disposition)) return 'variant-picked';
  return REVISION_DECISIONS.get(disposition) ?? null;
}

export function encodeVariantPickedDisposition(
  variantSetId: string,
  alternativeId: string,
): string {
  if (variantSetId === '' || alternativeId === '') {
    throw new Error('variant pick ids are required');
  }
  return `${VARIANT_PICK_PREFIX}${encodeURIComponent(variantSetId)}/${
    encodeURIComponent(alternativeId)
  }`;
}

export function decodeVariantPickedDisposition(
  disposition: string,
): { variantSetId: string; alternativeId: string } | null {
  if (!disposition.startsWith(VARIANT_PICK_PREFIX)) return null;
  const encoded = disposition.slice(VARIANT_PICK_PREFIX.length).split('/');
  if (encoded.length !== 2 || encoded.some((part) => part === '')) return null;
  try {
    return {
      variantSetId: decodeURIComponent(encoded[0]!),
      alternativeId: decodeURIComponent(encoded[1]!),
    };
  } catch {
    return null;
  }
}

export class DecisionProjector {
  private readonly learningStore: LearningStore;
  private readonly documentStore: DocumentStore;
  private readonly topicStore: TopicStore;
  private readonly operationEvidence: (
    operationId: string,
  ) => OperationDecisionEvidence | null;

  constructor(options: {
    learningStore: LearningStore;
    documentStore: DocumentStore;
    topicStore: TopicStore;
    operationEvidence: (
      operationId: string,
    ) => OperationDecisionEvidence | null;
  }) {
    this.learningStore = options.learningStore;
    this.documentStore = options.documentStore;
    this.topicStore = options.topicStore;
    this.operationEvidence = options.operationEvidence;
  }

  resolve(id: string): ResolvedDecision {
    const decision = this.learningStore.getDecision(id);
    if (!decision) throw new Error(`decision not found: ${id}`);
    const context: ResolvedDecisionContext = {
      source: {
        type: decision.sourceType,
        id: decision.sourceId,
        disposition: decision.disposition,
      },
    };

    if (decision.sourceType === 'revision') {
      const revision = this.documentStore.getRevision(decision.sourceId);
      if (revision) {
        const revisions = this.documentStore.listRevisions(
          decision.draftId,
        );
        const index = revisions.findIndex(({ id: revisionId }) =>
          revisionId === revision.id);
        const beforeRevision = index > 0 ? revisions[index - 1]! : null;
        context.revision = revision;
        context.beforeRevision = beforeRevision;
        context.diff = {
          before: beforeRevision?.doc ?? null,
          after: revision.doc,
        };
        if (revision.opId) {
          context.operation = this.resolveOperation(revision.opId);
          context.proposal = (
            revision.disposition === 'architecture-proposal-accepted'
            || revision.disposition === 'architecture-proposals-accepted'
          )
            ? this.documentStore.getArchitectureProposal(
                decision.draftId,
                revision.opId,
              )
            : this.documentStore.getNarrationProposal(
                decision.draftId,
                revision.opId,
              );
        }
      }
    } else if (
      decision.sourceType === 'narration-proposal'
      || decision.sourceType === 'architecture-proposal'
    ) {
      context.operation = this.resolveOperation(decision.sourceId);
      if (decision.sourceType === 'narration-proposal') {
        context.proposal = this.documentStore.getNarrationProposal(
          decision.draftId,
          decision.sourceId,
        );
        const revision = this.documentStore.getRevisionForOperation(
          decision.draftId,
          decision.sourceId,
        );
        if (revision) {
          context.revision = revision;
          const revisions = this.documentStore.listRevisions(
            decision.draftId,
          );
          const index = revisions.findIndex(({ id: revisionId }) =>
            revisionId === revision.id);
          const beforeRevision = index > 0 ? revisions[index - 1]! : null;
          context.beforeRevision = beforeRevision;
          context.diff = {
            before: beforeRevision?.doc ?? null,
            after: revision.doc,
          };
        }
      }
    } else if (decision.sourceType === 'package-test') {
      const packageTest = this.topicStore.getPackageTest(
        decision.sourceId,
      );
      context.packageTest = packageTest;
      if (packageTest) {
        context.operation = this.resolveOperation(packageTest.opId);
      }
    } else if (decision.sourceType === 'validator-fix-cycle') {
      const separator = decision.sourceId.indexOf(':');
      const first = separator < 0
        ? decision.sourceId
        : decision.sourceId.slice(0, separator);
      const second = separator < 0
        ? ''
        : decision.sourceId.slice(separator + 1);
      const failure = this.learningStore.getValidatorAttempt(first);
      const legacySuccess = this.learningStore.getValidatorAttempt(second);
      const success = legacySuccess ?? (
        failure
          ? this.learningStore.listValidatorAttempts(decision.draftId).find(
              (attempt) =>
                attempt.ok
                && attempt.path === failure.path
                && attempt.contentHash === second
                && attempt.createdAt === decision.sourceTimestamp,
            ) ?? null
          : null
      );
      const attempts = [failure, success].filter(
        (attempt) => attempt !== null,
      );
      context.validatorAttempts = attempts;
      if (attempts.length === 2) {
        context.revisions = this.documentStore.listRevisions(
          decision.draftId,
        ).filter((revision) =>
          revision.createdAt > attempts[0]!.createdAt
          && revision.createdAt <= attempts[1]!.createdAt);
      }
    } else if (decision.sourceType === 'topic-handoff') {
      const saga = this.topicStore.getHandoffSagaBySourceId(
        decision.sourceId,
      );
      const handoffInput = recordValue(saga?.input);
      const ideaId = handoffInput?.['ideaId'];
      const selectedPackage = typeof ideaId === 'string'
        ? this.topicStore.listPackageTests(ideaId).find(
            (test) => test.selectedDirectionIndex !== undefined,
          )
        : undefined;
      const selectedDirectionIndex =
        selectedPackage?.selectedDirectionIndex;
      context.topicHandoff = saga
        ? {
            ...saga,
            run: this.topicStore.getRun(saga.runId),
            chosenPackage: selectedPackage
              && selectedDirectionIndex !== undefined
              ? {
                  ...selectedPackage,
                  selectedDirection:
                    selectedPackage.directions[selectedDirectionIndex],
                }
              : null,
            resultingDraft: this.documentStore.getDraft(saga.draftId),
          }
        : null;
    } else if (decision.sourceType === 'promotion') {
      context.promotion = this.documentStore.getPromotionByOperation(
        decision.sourceId,
      );
    }

    const {
      sourceType: _sourceType,
      sourceId: _sourceId,
      ...resolved
    } = decision;
    return {
      ...resolved,
      context,
    };
  }

  private resolveOperation(
    operationId: string,
  ): ResolvedDecisionContext['operation'] {
    const evidence = this.operationEvidence(operationId);
    if (!evidence) return { operationId, missing: true };
    return redactTransportFields(evidence) as OperationDecisionEvidence;
  }
}

function redactTransportFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactTransportFields);
  if (typeof value !== 'object' || value === null) return value;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (
      key === 'cwd'
      || key === 'codexBin'
      || key === 'jobDir'
      || key.toLowerCase().includes('nonce')
    ) {
      continue;
    }
    result[key] = redactTransportFields(nested);
  }
  return result;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
