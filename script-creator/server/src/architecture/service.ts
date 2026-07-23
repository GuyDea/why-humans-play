import { createHash, randomUUID } from 'node:crypto';
import {
  ARCHITECTURE_SECTIONS,
  joinArchitecture,
  renderApprovedArchitecture,
  splitArchitecture,
  type ArchitectureSection,
} from './codec.js';
import {
  hasCompleteNarrationApproval,
  hasNarration,
  readCreativePhase,
  readCreativeStatus,
  withCreativePhase,
} from '../documents/service.js';
import {
  type ArchitectureSagaAction,
  type ArchitectureSagaRecord,
  type DocumentStore,
  type DraftArchitecture,
  type DraftRecord,
  type RevisionRecord,
} from '../documents/store.js';
import type { OperationName } from '../operations/registry.js';
import type {
  ArtifactExpectedState,
  ArtifactWriteResult,
  PipelineRow,
} from '../repo/artifacts.js';

export interface ArchitectureState extends DraftArchitecture {
  revisionSeq: number;
  narrationReconciliationRequired: boolean;
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
    options?: { resumeOf?: string },
  ): string;
  get(id: string): { operation: OperationName };
}

interface ArchitectureArtifactService {
  write(
    path: string,
    content: string,
    expectedState: ArtifactExpectedState,
  ): Promise<ArtifactWriteResult>;
  upsertPipelineRow(row: PipelineRow): Promise<ArtifactWriteResult>;
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

export class ArchitectureService {
  private readonly store: DocumentStore;
  private readonly operationService: ArchitectureOperationService;
  private readonly artifactService: ArchitectureArtifactService | null;
  private readonly idFactory: () => string;
  private readonly now: () => string;
  private readonly actionLocks = new Map<string, Promise<void>>();

  constructor(options: {
    store: DocumentStore;
    operationService: ArchitectureOperationService;
    artifactService?: ArchitectureArtifactService;
    idFactory?: () => string;
    now?: () => string;
  }) {
    this.store = options.store;
    this.operationService = options.operationService;
    this.artifactService = options.artifactService ?? null;
    this.idFactory = options.idFactory ?? randomUUID;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  get(draftId: string): ArchitectureState {
    const draft = this.requireDraft(draftId);
    return architectureState(draft, this.store.currentRevisionSeq(draftId));
  }

  save(draftId: string, input: SaveArchitectureInput): SavedArchitecture {
    requireRevisionSeq(input.expectedRevisionSeq);
    const sections = requireSections(input.sections);
    const opId = requireOptionalString(input.opId, 'opId');
    const disposition = requireNonEmpty(input.disposition, 'disposition');
    const draft = this.requireDraft(draftId);
    const architecture = requireArchitecture(draft);
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
    return {
      state: architectureState(result.draft, result.revision.seq),
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
  ): string {
    const operation = this.operationService.get(operationId).operation;
    return this.submit(draftId, operation, inputs, {
      resumeOf: operationId,
    });
  }

  async approve(
    draftId: string,
    expectedRevisionSeq: number,
  ): Promise<ArchitectureActionResult> {
    requireRevisionSeq(expectedRevisionSeq);
    return this.withActionLock(draftId, () =>
      this.resumeApprove(draftId, expectedRevisionSeq));
  }

  async reopen(
    draftId: string,
    input: { confirmed: boolean; expectedRevisionSeq: number },
  ): Promise<ArchitectureActionResult> {
    if (input.confirmed !== true) throw new Error('confirmed must be true');
    requireRevisionSeq(input.expectedRevisionSeq);
    return this.withActionLock(draftId, () =>
      this.resumeReopen(draftId, input.expectedRevisionSeq));
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
      const draft = this.requireExpectedRevision(draftId, expectedRevisionSeq);
      const architecture = requireArchitecture(draft);
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
    options: { resumeOf?: string } = {},
  ): string {
    const draft = this.requireDraft(draftId);
    const phase = readCreativePhase(draft.doc);
    const architecture = requireArchitecture(draft);
    const approvedCurrent = architecture.approvedMd !== null
      && architecture.approvedAt !== null
      && architecture.approvedMd === joinArchitecture(architecture.sections);

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
      if (!hasCompleteNarrationApproval(draft.doc)) {
        throw new ArchitectureGateError(
          'promote refused: complete narration approval is required',
        );
      }
    }

    const supplied = requireInputs(inputs);
    const authoritativeInputs = { ...supplied };
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
    return this.operationService.submit(
      operation,
      authoritativeInputs,
      options,
    );
  }

  private requireDraft(draftId: string): DraftRecord {
    const draft = this.store.getDraft(draftId);
    if (!draft) throw new Error(`draft not found: ${draftId}`);
    return draft;
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
): ArchitectureState {
  const architecture = requireArchitecture(draft);
  return {
    sections: architecture.sections.map((section) => ({ ...section })),
    approvedMd: architecture.approvedMd,
    approvedAt: architecture.approvedAt,
    revisionSeq,
    narrationReconciliationRequired:
      draft.narrationReconciliationRequired === true,
  };
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
