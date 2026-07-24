import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { PassThrough } from 'node:stream';
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from 'fastify';
import {
  ArchitectureArtifactConflictError,
  ArchitectureGateError,
  ArchitectureRevisionConflictError,
  NarrationRevisionConflictError,
  ProductionSyncConflictError,
  type ArchitectureService,
  type SaveArchitectureInput,
} from '../architecture/service.js';
import {
  ExportBlockedError,
  type CreateDraftInput,
  type DocumentService,
  type SaveDraftInput,
} from '../documents/service.js';
import { DraftWriteReservationError } from '../documents/store.js';
import type { OperationName } from '../operations/registry.js';
import type { OperationService } from '../operations/service.js';
import {
  ReconciliationVerificationRefusal,
  type LearningService,
} from '../learning/service.js';
import {
  MilestoneCommitError,
  MilestoneConflictError,
  WorkspaceChoiceRequiredError,
  type MilestoneKind,
  type MilestoneService,
} from '../repo/milestones.js';
import {
  assertValidatorScriptPath,
  InvalidValidatorPathError,
  type ValidatorResult,
} from '../repo/validator.js';
import type { TopicService } from '../topics/service.js';
import type {
  ArtifactReadResult,
  ArtifactExpectedState,
  ArtifactWriteResult,
  PipelineRow,
} from '../repo/artifacts.js';
import type { PackageDirection } from '../topics/store.js';
import {
  hasSseQueryNonce,
  parseFromSeq,
  pumpOperationEvents,
} from './sse.js';

type OperationHttpService = Pick<
  OperationService,
  'submit' | 'list' | 'get' | 'events' | 'cancel' | 'result'
> & Partial<Pick<OperationService, 'inputs'>>;

export interface ArchitectureHttpService extends Pick<
  ArchitectureService,
  'get' | 'save' | 'submitOperation' | 'resumeOperation'
> {
  approve?: ArchitectureService['approve'];
  resumeArchitectureSaga?: ArchitectureService['resumeArchitectureSaga'];
  reopen?: ArchitectureService['reopen'];
  prepareNarrationApproval?: ArchitectureService['prepareNarrationApproval'];
  approveNarration?: ArchitectureService['approveNarration'];
  markNarrationReconciled?: ArchitectureService['markNarrationReconciled'];
  narrationProposals?: ArchitectureService['narrationProposals'];
  resolveNarrationProposal?:
    ArchitectureService['resolveNarrationProposal'];
  rejectArchitectureProposal?:
    ArchitectureService['rejectArchitectureProposal'];
  syncProductionDraft?: ArchitectureService['syncProductionDraft'];
  promotion?: ArchitectureService['promotion'];
  reconcilePromotionResult?: ArchitectureService['reconcilePromotionResult'];
}

export type DocumentHttpService = Pick<
  DocumentService,
  | 'createDraft'
  | 'getDraft'
  | 'listDrafts'
  | 'saveDraft'
  | 'listRevisions'
  | 'importMarkdown'
  | 'exportMarkdown'
> & Partial<Pick<
  DocumentService,
  | 'syncPromotionOutput'
  | 'recordPromotionValidation'
  | 'reservePromotionCompletion'
  | 'releasePromotionCompletion'
  | 'markPromotionRollbackRequired'
  | 'completePromotion'
>>;

export interface ValidatorHttpService {
  validate(path: string): Promise<ValidatorResult>;
}

export type TopicHttpService = Pick<
  TopicService,
  | 'createIdea'
  | 'getIdea'
  | 'listIdeas'
  | 'updateIdea'
  | 'deleteIdea'
  | 'createPackageTest'
  | 'listPackageTests'
  | 'pickPackageDirection'
  | 'registerRun'
  | 'listRuns'
  | 'getRun'
  | 'handoff'
  | 'pipeline'
  | 'topicBrief'
>;

export interface ArtifactHttpService {
  write?(
    path: string,
    content: string,
    expectedState: ArtifactExpectedState,
  ): Promise<ArtifactWriteResult>;
  upsertPipelineRow?(row: PipelineRow): Promise<ArtifactWriteResult>;
  read?(path: string): Promise<ArtifactReadResult> | ArtifactReadResult;
}

export interface BuildAppOptions {
  nonce: string;
  staticRoot?: string;
  operationService: OperationHttpService;
  documentService: DocumentHttpService;
  architectureService?: ArchitectureHttpService;
  topicService?: TopicHttpService;
  artifactService: ArtifactHttpService;
  validatorService: ValidatorHttpService;
  milestoneService?: MilestoneHttpService;
  learningService?: LearningHttpService;
}

export type LearningHttpService = Pick<
  LearningService,
  | 'list'
  | 'setNote'
  | 'recordValidatorAttempt'
> & Partial<Pick<
  LearningService,
  | 'startDistillation'
  | 'listSessions'
  | 'getDistillationRun'
  | 'reconcileDistillation'
  | 'listLessons'
  | 'getLesson'
  | 'editLesson'
  | 'approveLesson'
  | 'rejectLesson'
  | 'retireLesson'
  | 'supersedeLesson'
  | 'markReconciliationAwaiting'
  | 'verifyReconciliation'
  | 'verifyExistingDoctrine'
  | 'operationLessons'
>>;

export type MilestoneHttpService = Pick<
  MilestoneService,
  | 'status'
  | 'chooseWorkspace'
  | 'pendingMilestones'
  | 'commitPending'
>;

interface SubmitBody {
  operation?: unknown;
  inputs?: unknown;
}

interface ResumeBody {
  inputs?: unknown;
  reason?: unknown;
}

interface OperationParams {
  id: string;
}

interface DraftParams {
  id: string;
}

interface DistillationParams {
  runId: string;
}

interface LessonParams extends DraftParams {
  lessonId: string;
}

interface ReconciliationParams {
  resumeKey: string;
}

interface LessonVersionBody {
  expectedVersion?: unknown;
}

interface EditLessonBody extends LessonVersionBody {
  reviewedMarkdown?: unknown;
}

interface SupersedeLessonBody extends LessonVersionBody {
  predecessorLessonId?: unknown;
}

interface VerifyReconciliationBody {
  commit?: unknown;
}

interface VerifyExistingDoctrineBody extends VerifyReconciliationBody {
  path?: unknown;
  anchor?: unknown;
  contentHash?: unknown;
}

interface MilestoneParams extends DraftParams {
  kind: string;
}

interface WorkspaceChoiceBody {
  choice?: unknown;
  taskName?: unknown;
  confirmed?: unknown;
}

interface CommitMilestoneBody {
  pendingMilestoneId?: unknown;
  confirmed?: unknown;
}

interface IdeaParams {
  id: string;
}

interface TopicRunParams {
  id: string;
}

interface TopicBriefQuery {
  ref?: string;
}

interface CreateIdeaBody {
  text?: unknown;
  source?: unknown;
  status?: unknown;
}

interface UpdateIdeaBody {
  text?: unknown;
  source?: unknown;
  status?: unknown;
  latestCheck?: unknown;
  latestCheckOpId?: unknown;
}

interface RegisterTopicRunBody {
  opId?: unknown;
}

interface TopicHandoffBody {
  resumeKey?: unknown;
  ideaId?: unknown;
  episodeSlug?: unknown;
  title?: unknown;
  briefMarkdown?: unknown;
  draft?: unknown;
}

interface CreatePackageTestBody {
  opId?: unknown;
  directions?: unknown;
}

interface WriteArtifactBody {
  path?: unknown;
  content?: unknown;
  expectedState?: unknown;
}

interface UpsertPipelineBody {
  episodeSlug?: unknown;
  milestone?: unknown;
  ref?: unknown;
}

interface CreateDraftBody {
  episodeSlug?: unknown;
  title?: unknown;
  format?: unknown;
  doc?: unknown;
}

interface SaveDraftBody {
  title?: unknown;
  format?: unknown;
  doc?: unknown;
  opId?: unknown;
  disposition?: unknown;
}

interface SaveArchitectureBody {
  expectedRevisionSeq?: unknown;
  sections?: unknown;
  opId?: unknown;
  disposition?: unknown;
}

interface ApproveArchitectureBody {
  expectedRevisionSeq?: unknown;
}

interface ResumeArchitectureSagaBody {
  resumeKey?: unknown;
}

interface ReopenArchitectureBody {
  expectedRevisionSeq?: unknown;
  confirmed?: unknown;
}

interface ApproveNarrationBody {
  expectedRevisionSeq?: unknown;
  settledExportToken?: unknown;
}

interface PrepareNarrationApprovalBody {
  expectedRevisionSeq?: unknown;
  expectedNarrationMd?: unknown;
}

interface ReconcileNarrationBody {
  expectedRevisionSeq?: unknown;
  confirmed?: unknown;
}

interface SyncProductionBody {
  expectedRevisionSeq?: unknown;
}

interface ResolveNarrationProposalBody {
  decision?: unknown;
  reason?: unknown;
}

interface RejectArchitectureProposalBody {
  reason?: unknown;
}

interface DecisionParams extends DraftParams {
  decisionId: string;
}

interface DecisionQuery {
  after?: string;
  limit?: string;
}

interface DecisionNoteBody {
  note?: unknown;
}

interface PickPackageBody {
  directionIndex?: unknown;
}

interface ImportDraftBody {
  markdown?: unknown;
}

interface ValidateBody {
  path?: unknown;
}

interface EventsQuery {
  fromSeq?: string;
  nonce?: string;
}

interface StaticParams {
  '*': string;
}

const LOOPBACK_ORIGIN =
  /^http:\/\/(?:127\.0\.0\.1|localhost):(?:0|[1-9]\d{0,4})$/;

function isAllowedOrigin(origin: string): boolean {
  const match = LOOPBACK_ORIGIN.exec(origin);
  if (!match) return false;

  const port = Number(origin.slice(origin.lastIndexOf(':') + 1));
  return port <= 65_535;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify();
  const topicService = options.topicService ?? UNCONFIGURED_TOPIC_SERVICE;
  const architectureService = options.architectureService
    ?? UNCONFIGURED_ARCHITECTURE_SERVICE;

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin !== undefined && !isAllowedOrigin(origin)) {
      return reply.code(403).send({ error: 'forbidden origin' });
    }

    if (!isApiPath(request.raw.url ?? '')) return;

    const hasHeaderNonce = request.headers['x-sc-nonce'] === options.nonce;
    const hasQueryNonce = hasSseQueryNonce(
      request.method,
      request.raw.url ?? '',
      options.nonce,
    );
    if (!hasHeaderNonce && !hasQueryNonce) {
      return reply.code(401).send({ error: 'invalid nonce' });
    }
  });

  app.get('/api/health', async () => ({ ok: true }));

  app.get<{ Params: DraftParams }>(
    '/api/drafts/:id/milestones/status',
    async (request, reply) => {
      try {
        const service = requireMilestoneService(options.milestoneService);
        return await service.status(request.params.id);
      } catch (error) {
        return sendMilestoneError(reply, error);
      }
    },
  );

  app.post<{ Params: DraftParams; Body: WorkspaceChoiceBody }>(
    '/api/drafts/:id/milestones/workspace',
    async (request, reply) => {
      try {
        const service = requireMilestoneService(options.milestoneService);
        const choice = request.body?.choice;
        if (choice === 'new-branch') {
          return await service.chooseWorkspace(request.params.id, {
            choice,
            taskName: requiredString(request.body?.taskName, 'taskName'),
          });
        }
        if (choice === 'current-branch') {
          return await service.chooseWorkspace(request.params.id, {
            choice,
            confirmed: requiredTrue(
              request.body?.confirmed,
              'confirmed',
            ),
          });
        }
        throw new Error(
          'choice must be new-branch or current-branch',
        );
      } catch (error) {
        return sendMilestoneError(reply, error);
      }
    },
  );

  app.get<{ Params: DraftParams }>(
    '/api/drafts/:id/milestones',
    async (request, reply) => {
      try {
        const service = requireMilestoneService(options.milestoneService);
        return {
          milestones: await service.pendingMilestones(request.params.id),
        };
      } catch (error) {
        return sendMilestoneError(reply, error);
      }
    },
  );

  app.post<{
    Params: MilestoneParams;
    Body: CommitMilestoneBody;
  }>(
    '/api/drafts/:id/milestones/:kind/commit',
    async (request, reply) => {
      try {
        const service = requireMilestoneService(options.milestoneService);
        return await service.commitPending({
          draftId: request.params.id,
          kind: requiredMilestoneKind(request.params.kind),
          pendingMilestoneId: requiredString(
            request.body?.pendingMilestoneId,
            'pendingMilestoneId',
          ),
          confirmed: requiredTrue(
            request.body?.confirmed,
            'confirmed',
          ),
        });
      } catch (error) {
        return sendMilestoneError(reply, error);
      }
    },
  );

  app.post<{
    Params: ReconciliationParams;
    Body: VerifyExistingDoctrineBody;
  }>(
    '/api/lesson-reconciliations/:resumeKey/verify-existing',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.verifyExistingDoctrine!(
          request.params.resumeKey,
          {
            commit: requiredString(request.body?.commit, 'commit'),
            path: requiredString(request.body?.path, 'path'),
            anchor: requiredString(request.body?.anchor, 'anchor'),
            contentHash: requiredString(
              request.body?.contentHash,
              'contentHash',
            ),
          },
        );
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.post<{ Body: ValidateBody }>(
    '/api/validate',
    async (request, reply) => {
      try {
        const path = requiredString(request.body?.path, 'path');
        assertValidatorScriptPath(path);
        return await options.validatorService.validate(path);
      } catch (error) {
        return sendValidatorError(reply, error);
      }
    },
  );

  const validatePromotion = async (draftId: string) => {
    if (
      !architectureService.promotion
      || !options.artifactService.read
      || !options.documentService.syncPromotionOutput
      || !options.documentService.recordPromotionValidation
    ) {
      throw new Error('promotion validation is not configured');
    }
    const promotion = architectureService.promotion(draftId);
    if (!promotion || promotion.state !== 'validation-required') {
      throw new Error(
        'promote validation refused: validation-required promotion is required',
      );
    }
    const validation = await options.validatorService.validate(
      promotion.targetPath,
    );
    options.learningService?.recordValidatorAttempt({
      draftId,
      path: validation.path,
      hash: validation.hash,
      ok: validation.ok,
      diagnostics: validation.errors,
    });
    const output = await options.artifactService.read(
      promotion.targetPath,
    );
    if (
      output.path !== validation.path
      || output.hash !== validation.hash
    ) {
      throw new Error(
        'promote validation refused: target changed during validation',
      );
    }
    options.documentService.syncPromotionOutput(draftId, output);
    options.documentService.recordPromotionValidation(draftId, validation);
    return validation;
  };

  app.post<{ Params: DraftParams }>(
    '/api/drafts/:id/validate',
    async (request, reply) => {
      try {
        return await validatePromotion(request.params.id);
      } catch (error) {
        return sendPromotionError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{ Params: DraftParams; Body: SyncProductionBody }>(
    '/api/drafts/:id/production/sync',
    async (request, reply) => {
      try {
        if (!architectureService.syncProductionDraft) {
          throw new Error(
            'production synchronization is not configured',
          );
        }
        return await architectureService.syncProductionDraft(
          request.params.id,
          {
            expectedRevisionSeq: requiredRevisionSeq(
              request.body?.expectedRevisionSeq,
            ),
          },
        );
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{ Params: DraftParams }>(
    '/api/drafts/:id/promote/complete',
    async (request, reply) => {
      try {
        if (
          !architectureService.promotion
          || !options.documentService.completePromotion
          || !options.documentService.reservePromotionCompletion
          || !options.documentService.releasePromotionCompletion
          || !options.documentService.markPromotionRollbackRequired
          || !options.artifactService.upsertPipelineRow
          || !options.artifactService.read
        ) {
          throw new Error('promotion completion is not configured');
        }
        let existingPromotion = architectureService.promotion(
          request.params.id,
        );
        if (
          existingPromotion?.state === 'output-ready'
          && existingPromotion.error ===
            'production pipeline rollback required'
        ) {
          const recoveryDraft = options.documentService.getDraft(
            request.params.id,
          );
          let rollback;
          try {
            rollback = await options.artifactService.upsertPipelineRow({
              episodeSlug: recoveryDraft.episodeSlug,
              milestone: 'creative-approved',
              ref:
                `whp-youtube/drafts/${recoveryDraft.episodeSlug}.md`,
            });
          } catch {
            return reply.code(409).send({
              error:
                'promote completion refused: production pipeline rollback required',
            });
          }
          if (rollback.conflict) {
            return reply.code(409).send({
              error:
                'promote completion refused: production pipeline rollback required',
              ...rollback,
            });
          }
          existingPromotion =
            options.documentService.releasePromotionCompletion(
              request.params.id,
            );
          return reply.code(409).send({
            error:
              'promote completion refused: production pipeline rollback completed; rerun validator',
            promotion: existingPromotion,
          });
        }
        const completionReservation = existingPromotion;
        const resumingCompletion =
          completionReservation?.state === 'output-ready'
          && completionReservation.error ===
            'promotion completion in progress'
          && completionReservation.targetHash !== null
          && completionReservation.validationHash ===
            completionReservation.targetHash;
        let validation: ValidatorResult;
        if (resumingCompletion) {
          try {
            validation = await options.validatorService.validate(
              completionReservation.targetPath,
            );
            options.learningService?.recordValidatorAttempt({
              draftId: request.params.id,
              path: validation.path,
              hash: validation.hash,
              ok: validation.ok,
              diagnostics: validation.errors,
            });
            const output = await options.artifactService.read(
              completionReservation.targetPath,
            );
            if (
              output.path !== validation.path
              || output.hash !== validation.hash
              || validation.path !== completionReservation.targetPath
              || validation.hash !== completionReservation.targetHash
            ) {
              throw new Error(
                'promote completion refused: target changed during resumed validation',
              );
            }
          } catch (error) {
            options.documentService.releasePromotionCompletion(
              request.params.id,
            );
            throw error;
          }
        } else {
          validation = await validatePromotion(request.params.id);
        }
        if (!validation.ok) {
          if (resumingCompletion) {
            options.documentService.releasePromotionCompletion(
              request.params.id,
            );
          }
          return reply.code(409).send({
            error: 'promote completion refused: validator failed',
            validation,
          });
        }
        const draft = options.documentService.getDraft(request.params.id);
        const promotion = architectureService.promotion(request.params.id);
        if (!promotion) {
          throw new Error(
            'promote completion refused: promotion is required',
          );
        }
        if (!resumingCompletion) {
          options.documentService.reservePromotionCompletion(
            request.params.id,
            validation,
          );
        }
        let pipelineAdvanced = false;
        let releaseReservation = true;
        try {
          const pipeline = await options.artifactService.upsertPipelineRow({
            episodeSlug: draft.episodeSlug,
            milestone: 'production',
            ref: promotion.targetPath,
          });
          if (pipeline.conflict) {
            return reply.code(409).send({
              error: 'production pipeline conflict',
              ...pipeline,
            });
          }
          pipelineAdvanced = true;
          const finalTarget = await options.artifactService.read(
            promotion.targetPath,
          );
          if (
            finalTarget.path !== validation.path
            || finalTarget.hash !== validation.hash
          ) {
            throw new Error(
              'promote completion refused: target changed after validation',
            );
          }
          return await options.documentService.completePromotion(
            request.params.id,
            validation,
          );
        } catch (error) {
          if (pipelineAdvanced) {
            try {
              const rollback =
                await options.artifactService.upsertPipelineRow({
                  episodeSlug: draft.episodeSlug,
                  milestone: 'creative-approved',
                  ref: `whp-youtube/drafts/${draft.episodeSlug}.md`,
                });
              if (rollback.conflict) {
                options.documentService.markPromotionRollbackRequired(
                  request.params.id,
                );
                releaseReservation = false;
                return reply.code(409).send({
                  error:
                    'promote completion refused: production pipeline rollback required',
                  ...rollback,
                });
              }
            } catch {
              options.documentService.markPromotionRollbackRequired(
                request.params.id,
              );
              releaseReservation = false;
              return reply.code(409).send({
                error:
                  'promote completion refused: production pipeline rollback required',
              });
            }
          }
          throw error;
        } finally {
          if (releaseReservation) {
            options.documentService.releasePromotionCompletion(
              request.params.id,
            );
          }
        }
      } catch (error) {
        return sendPromotionError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{ Body: CreateDraftBody }>(
    '/api/drafts',
    async (request, reply) => {
      try {
        const input: CreateDraftInput = {
          episodeSlug: requiredString(request.body?.episodeSlug, 'episodeSlug'),
          title: requiredString(request.body?.title, 'title'),
          format: requiredFormat(request.body?.format),
          doc: requiredDocument(request.body?.doc),
        };
        return reply.code(201).send(
          options.documentService.createDraft(input),
        );
      } catch (error) {
        return sendDocumentError(reply, error);
      }
    },
  );

  app.get('/api/drafts', () => options.documentService.listDrafts());

  app.post<{ Body: ImportDraftBody }>(
    '/api/drafts/import',
    async (request, reply) => {
      try {
        const markdown = requiredString(request.body?.markdown, 'markdown');
        return reply.code(201).send(
          options.documentService.importMarkdown(markdown),
        );
      } catch (error) {
        return sendDocumentError(reply, error);
      }
    },
  );

  app.get<{ Params: DraftParams }>(
    '/api/drafts/:id',
    async (request, reply) => {
      try {
        return options.documentService.getDraft(request.params.id);
      } catch (error) {
        return sendDocumentError(reply, error);
      }
    },
  );

  app.get<{ Params: DraftParams; Querystring: DecisionQuery }>(
    '/api/drafts/:id/decisions',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.list(request.params.id, {
          after: optionalNonNegativeInteger(
            request.query.after,
            'after',
          ),
          limit: optionalPositiveInteger(request.query.limit, 'limit'),
        });
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.put<{ Params: DecisionParams; Body: DecisionNoteBody }>(
    '/api/drafts/:id/decisions/:decisionId/note',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.setNote(
          request.params.id,
          request.params.decisionId,
          optionalOneLineNote(request.body?.note),
        );
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.get<{ Params: DraftParams }>(
    '/api/drafts/:id/learning-sessions',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return {
          sessions: service.listSessions!(request.params.id),
        };
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.post<{ Params: DraftParams }>(
    '/api/drafts/:id/distill',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.startDistillation!(request.params.id, 'on-demand');
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.post<{ Params: DraftParams }>(
    '/api/drafts/:id/distill/end-session',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.startDistillation!(request.params.id, 'session-end');
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.get<{ Params: DistillationParams }>(
    '/api/distillations/:runId',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.getDistillationRun!(request.params.runId);
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.post<{ Params: DistillationParams }>(
    '/api/distillations/:runId/reconcile',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.reconcileDistillation!(request.params.runId);
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.get<{ Params: DraftParams }>(
    '/api/drafts/:id/lessons',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return { lessons: service.listLessons!(request.params.id) };
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.get<{ Params: LessonParams }>(
    '/api/drafts/:id/lessons/:lessonId',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.getLesson!(
          request.params.id,
          request.params.lessonId,
        );
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.put<{ Params: LessonParams; Body: EditLessonBody }>(
    '/api/drafts/:id/lessons/:lessonId',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.editLesson!(
          request.params.id,
          request.params.lessonId,
          {
            expectedVersion: requiredPositiveInteger(
              request.body?.expectedVersion,
              'expectedVersion',
            ),
            reviewedMarkdown: requiredStringValue(
              request.body?.reviewedMarkdown,
              'reviewedMarkdown',
            ),
          },
        );
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  for (const action of ['approve', 'reject', 'retire'] as const) {
    app.post<{ Params: LessonParams; Body: LessonVersionBody }>(
      `/api/drafts/:id/lessons/:lessonId/${action}`,
      async (request, reply) => {
        try {
          const service = requireLearningService(
            options.learningService,
          );
          const input = {
            expectedVersion: requiredPositiveInteger(
              request.body?.expectedVersion,
              'expectedVersion',
            ),
          };
          return action === 'approve'
            ? service.approveLesson!(
                request.params.id,
                request.params.lessonId,
                input,
              )
            : action === 'reject'
            ? service.rejectLesson!(
                request.params.id,
                request.params.lessonId,
                input,
              )
            : service.retireLesson!(
                request.params.id,
                request.params.lessonId,
                input,
              );
        } catch (error) {
          return sendLearningError(reply, error);
        }
      },
    );
  }

  app.post<{ Params: LessonParams; Body: SupersedeLessonBody }>(
    '/api/drafts/:id/lessons/:lessonId/supersede',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.supersedeLesson!(
          request.params.id,
          request.params.lessonId,
          {
            expectedVersion: requiredPositiveInteger(
              request.body?.expectedVersion,
              'expectedVersion',
            ),
            predecessorLessonId: requiredString(
              request.body?.predecessorLessonId,
              'predecessorLessonId',
            ),
          },
        );
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.post<{ Params: ReconciliationParams }>(
    '/api/lesson-reconciliations/:resumeKey/awaiting',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.markReconciliationAwaiting!(
          request.params.resumeKey,
        );
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.post<{
    Params: ReconciliationParams;
    Body: VerifyReconciliationBody;
  }>(
    '/api/lesson-reconciliations/:resumeKey/verify',
    async (request, reply) => {
      try {
        const service = requireLearningService(options.learningService);
        return service.verifyReconciliation!(
          request.params.resumeKey,
          requiredString(request.body?.commit, 'commit'),
        );
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.get<{ Params: DraftParams }>(
    '/api/drafts/:id/architecture',
    async (request, reply) => {
      try {
        return architectureService.get(request.params.id);
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.put<{ Params: DraftParams; Body: SaveArchitectureBody }>(
    '/api/drafts/:id/architecture',
    async (request, reply) => {
      try {
        const input: SaveArchitectureInput = {
          expectedRevisionSeq: requiredRevisionSeq(
            request.body?.expectedRevisionSeq,
          ),
          sections: requiredArchitectureSections(request.body?.sections),
          opId: optionalString(request.body?.opId, 'opId'),
          disposition: requiredString(
            request.body?.disposition,
            'disposition',
          ),
        };
        return architectureService.save(request.params.id, input);
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{ Params: DraftParams; Body: ApproveArchitectureBody }>(
    '/api/drafts/:id/architecture/approve',
    async (request, reply) => {
      try {
        if (!architectureService.approve) {
          throw new Error('architecture approval is not configured');
        }
        return await architectureService.approve(
          request.params.id,
          requiredRevisionSeq(request.body?.expectedRevisionSeq),
        );
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{
    Params: DraftParams;
    Body: ResumeArchitectureSagaBody;
  }>(
    '/api/drafts/:id/architecture/resume',
    async (request, reply) => {
      try {
        if (!architectureService.resumeArchitectureSaga) {
          throw new Error('architecture saga resume is not configured');
        }
        return await architectureService.resumeArchitectureSaga(
          request.params.id,
          requiredString(request.body?.resumeKey, 'resumeKey'),
        );
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{ Params: DraftParams; Body: ReopenArchitectureBody }>(
    '/api/drafts/:id/architecture/reopen',
    async (request, reply) => {
      try {
        if (!architectureService.reopen) {
          throw new Error('architecture reopen is not configured');
        }
        return await architectureService.reopen(request.params.id, {
          confirmed: requiredTrue(request.body?.confirmed, 'confirmed'),
          expectedRevisionSeq: requiredRevisionSeq(
            request.body?.expectedRevisionSeq,
          ),
        });
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{
    Params: DraftParams;
    Body: PrepareNarrationApprovalBody;
  }>(
    '/api/drafts/:id/narration/settled-export',
    async (request, reply) => {
      try {
        if (!architectureService.prepareNarrationApproval) {
          throw new Error(
            'narration approval preparation is not configured',
          );
        }
        return architectureService.prepareNarrationApproval(
          request.params.id,
          {
            expectedRevisionSeq: requiredRevisionSeq(
              request.body?.expectedRevisionSeq,
            ),
            expectedNarrationMd: requiredString(
              request.body?.expectedNarrationMd,
              'expectedNarrationMd',
            ),
          },
        );
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{
    Params: DraftParams;
    Body: ReconcileNarrationBody;
  }>(
    '/api/drafts/:id/narration/reconcile',
    async (request, reply) => {
      try {
        if (!architectureService.markNarrationReconciled) {
          throw new Error(
            'narration reconciliation is not configured',
          );
        }
        return architectureService.markNarrationReconciled(
          request.params.id,
          {
            expectedRevisionSeq: requiredRevisionSeq(
              request.body?.expectedRevisionSeq,
            ),
            confirmed: requiredTrue(request.body?.confirmed, 'confirmed'),
          },
        );
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.get<{ Params: DraftParams }>(
    '/api/drafts/:id/narration/proposals',
    async (request, reply) => {
      try {
        if (!architectureService.narrationProposals) {
          throw new Error('narration proposal listing is not configured');
        }
        return {
          proposals: architectureService.narrationProposals(
            request.params.id,
          ),
        };
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{
    Params: { id: string; operationId: string };
    Body: ResolveNarrationProposalBody;
  }>(
    '/api/drafts/:id/narration/proposals/:operationId/resolve',
    async (request, reply) => {
      try {
        if (!architectureService.resolveNarrationProposal) {
          throw new Error(
            'narration proposal resolution is not configured',
          );
        }
        const decision = request.body?.decision;
        if (decision !== 'accepted' && decision !== 'rejected') {
          throw new Error('decision must be accepted or rejected');
        }
        const reason = optionalOneLineNote(request.body?.reason);
        return hasOwn(request.body, 'reason')
          ? architectureService.resolveNarrationProposal(
              request.params.id,
              request.params.operationId,
              decision,
              reason,
            )
          : architectureService.resolveNarrationProposal(
              request.params.id,
              request.params.operationId,
              decision,
            );
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{
    Params: { id: string; operationId: string };
    Body: RejectArchitectureProposalBody;
  }>(
    '/api/drafts/:id/architecture/proposals/:operationId/reject',
    async (request, reply) => {
      try {
        if (!architectureService.rejectArchitectureProposal) {
          throw new Error('learning capture is not configured');
        }
        architectureService.rejectArchitectureProposal(
          request.params.id,
          request.params.operationId,
          optionalOneLineNote(request.body?.reason),
        );
        return { rejected: true };
      } catch (error) {
        return sendLearningError(reply, error);
      }
    },
  );

  app.post<{ Params: DraftParams; Body: ApproveNarrationBody }>(
    '/api/drafts/:id/narration/approve',
    async (request, reply) => {
      try {
        if (!architectureService.approveNarration) {
          throw new Error('narration approval is not configured');
        }
        return await architectureService.approveNarration(
          request.params.id,
          {
            expectedRevisionSeq: requiredRevisionSeq(
              request.body?.expectedRevisionSeq,
            ),
            settledExportToken: requiredString(
              request.body?.settledExportToken,
              'settledExportToken',
            ),
          },
        );
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.get<{ Params: DraftParams }>(
    '/api/drafts/:id/promote',
    async (request, reply) => {
      try {
        if (!architectureService.promotion) {
          throw new Error('promotion service is not configured');
        }
        return { promotion: architectureService.promotion(request.params.id) };
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.put<{ Params: DraftParams; Body: SaveDraftBody }>(
    '/api/drafts/:id',
    async (request, reply) => {
      try {
        const input: SaveDraftInput = {
          doc: requiredDocument(request.body?.doc),
        };
        if (hasOwn(request.body, 'title')) {
          input.title = requiredString(request.body.title, 'title');
        }
        if (hasOwn(request.body, 'format')) {
          input.format = requiredFormat(request.body.format);
        }
        if (hasOwn(request.body, 'opId')) {
          input.opId = optionalString(request.body.opId, 'opId');
        }
        if (hasOwn(request.body, 'disposition')) {
          input.disposition = requiredString(
            request.body.disposition,
            'disposition',
          );
        }
        return options.documentService.saveDraft(request.params.id, input);
      } catch (error) {
        return sendDocumentError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.get<{ Params: DraftParams }>(
    '/api/drafts/:id/revisions',
    async (request, reply) => {
      try {
        return options.documentService.listRevisions(request.params.id);
      } catch (error) {
        return sendDocumentError(reply, error);
      }
    },
  );

  app.get<{ Params: DraftParams }>(
    '/api/drafts/:id/export',
    async (request, reply) => {
      try {
        return {
          markdown: options.documentService.exportMarkdown(request.params.id),
        };
      } catch (error) {
        return sendDocumentError(reply, error);
      }
    },
  );

  app.post<{ Body: SubmitBody }>('/api/ops', async (request, reply) => {
    try {
      if (typeof request.body?.operation !== 'string') {
        throw new Error('operation is required');
      }
      if (!hasOwn(request.body, 'inputs')) {
        throw new Error('inputs are required');
      }
      if (
        request.body.operation === 'generate-episode'
        || request.body.operation === 'promote'
      ) {
        throw new Error(
          `operation ${request.body.operation} requires a draft-scoped submission`,
        );
      }
      const id = options.operationService.submit(
        request.body.operation as OperationName,
        request.body.inputs,
      );
      return { id };
    } catch (error) {
      return sendOperationError(reply, error);
    }
  });

  app.post<{ Params: DraftParams; Body: SubmitBody }>(
    '/api/drafts/:id/ops',
    async (request, reply) => {
      try {
        if (typeof request.body?.operation !== 'string') {
          throw new Error('operation is required');
        }
        if (!hasOwn(request.body, 'inputs')) {
          throw new Error('inputs are required');
        }
        return {
          id: architectureService.submitOperation(
            request.params.id,
            request.body.operation as OperationName,
            request.body.inputs,
          ),
        };
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.post<{
    Params: { id: string; operationId: string };
    Body: ResumeBody;
  }>(
    '/api/drafts/:id/ops/:operationId/resume',
    async (request, reply) => {
      try {
        if (!hasOwn(request.body, 'inputs')) {
          throw new Error('inputs are required');
        }
        const inputs = request.body.inputs;
        const reason = optionalOneLineNote(request.body?.reason);
        return {
          id: hasOwn(request.body, 'reason')
            ? architectureService.resumeOperation(
                request.params.id,
                request.params.operationId,
                inputs,
                reason,
              )
            : architectureService.resumeOperation(
                request.params.id,
                request.params.operationId,
                inputs,
              ),
        };
      } catch (error) {
        return sendArchitectureError(
          reply,
          error,
          architectureService,
          request.params.id,
        );
      }
    },
  );

  app.get('/api/ops', () => ({
    operations: options.operationService.list(),
  }));

  app.get<{ Params: OperationParams }>('/api/ops/:id', async (request, reply) => {
    try {
      return {
        ...options.operationService.get(request.params.id),
        inputs: options.operationService.inputs?.(request.params.id) ?? null,
        operationLessons:
          options.learningService?.operationLessons?.(request.params.id) ?? [],
      };
    } catch (error) {
      return sendOperationError(reply, error);
    }
  });

  app.get<{ Params: OperationParams }>(
    '/api/ops/:id/result',
    async (request, reply) => {
      try {
        const result = options.operationService.result(request.params.id);
        if (architectureService.reconcilePromotionResult) {
          await architectureService.reconcilePromotionResult(
            request.params.id,
            result,
          );
        }
        return result;
      } catch (error) {
        return sendArchitectureError(reply, error, architectureService);
      }
    },
  );

  app.post<{ Params: OperationParams }>(
    '/api/ops/:id/cancel',
    async (request, reply) => {
      try {
        options.operationService.cancel(request.params.id);
        return { id: request.params.id };
      } catch (error) {
        return sendOperationError(reply, error);
      }
    },
  );

  app.post<{ Params: OperationParams; Body: ResumeBody }>(
    '/api/ops/:id/resume',
    async (request, reply) => {
      try {
        if (!hasOwn(request.body, 'inputs')) {
          throw new Error('inputs are required');
        }
        const parent = options.operationService.get(request.params.id);
        const id = options.operationService.submit(
          parent.operation,
          request.body.inputs,
          { resumeOf: request.params.id },
        );
        return { id };
      } catch (error) {
        return sendOperationError(reply, error);
      }
    },
  );

  app.get<{ Params: OperationParams; Querystring: EventsQuery }>(
    '/api/ops/:id/events',
    async (request, reply) => {
      try {
        options.operationService.get(request.params.id);
        const fromSeq = parseFromSeq(
          request.query.fromSeq,
          request.headers['last-event-id'],
        );
        const stream = new PassThrough();
        void pumpOperationEvents(
          options.operationService,
          request.params.id,
          fromSeq,
          {
            write: (chunk) => stream.write(chunk),
            waitForDrain: () => waitForStreamDrain(stream),
            isClosed: () => stream.destroyed,
          },
        ).then(
          () => stream.end(),
          (error: unknown) => stream.destroy(
            error instanceof Error ? error : new Error('SSE stream failed'),
          ),
        );

        return reply
          .headers({
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          })
          .type('text/event-stream')
          .send(stream);
      } catch (error) {
        return sendOperationError(reply, error);
      }
    },
  );

  app.post<{ Body: CreateIdeaBody }>(
    '/api/ideas',
    async (request, reply) => {
      try {
        return reply.code(201).send(topicService.createIdea({
          text: requiredString(request.body?.text, 'text'),
          source: requiredIdeaSource(request.body?.source),
          status: request.body?.status === undefined
            ? undefined
            : requiredIdeaStatus(request.body.status),
        }));
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.get('/api/ideas', async (_request, reply) => {
    try {
      return topicService.listIdeas();
    } catch (error) {
      return sendTopicError(reply, error);
    }
  });

  app.get<{ Params: IdeaParams }>(
    '/api/ideas/:id',
    async (request, reply) => {
      try {
        return topicService.getIdea(request.params.id);
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.post<{
    Params: { id: string; packageTestId: string };
    Body: PickPackageBody;
  }>(
    '/api/ideas/:id/package-tests/:packageTestId/pick',
    async (request, reply) => {
      try {
        return topicService.pickPackageDirection(
          request.params.id,
          request.params.packageTestId,
          requiredNonNegativeInteger(
            request.body?.directionIndex,
            'directionIndex',
          ),
        );
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.patch<{ Params: IdeaParams; Body: UpdateIdeaBody }>(
    '/api/ideas/:id',
    async (request, reply) => {
      try {
        const update: {
          text?: string;
          source?: 'inbox' | 'ideate';
          status?: 'open' | 'promoted' | 'discarded';
          latestCheck?: unknown;
          latestCheckOpId?: string;
        } = {};
        if (hasOwn(request.body, 'text')) {
          update.text = requiredString(request.body.text, 'text');
        }
        if (hasOwn(request.body, 'source')) {
          update.source = requiredIdeaSource(request.body.source);
        }
        if (hasOwn(request.body, 'status')) {
          update.status = requiredIdeaStatus(request.body.status);
        }
        if (hasOwn(request.body, 'latestCheck')) {
          update.latestCheck = request.body.latestCheck;
        }
        if (hasOwn(request.body, 'latestCheckOpId')) {
          update.latestCheckOpId = requiredString(
            request.body.latestCheckOpId,
            'latestCheckOpId',
          );
        }
        return topicService.updateIdea(request.params.id, update);
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.delete<{ Params: IdeaParams }>(
    '/api/ideas/:id',
    async (request, reply) => {
      try {
        topicService.deleteIdea(request.params.id);
        return reply.code(204).send();
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.post<{ Params: IdeaParams; Body: CreatePackageTestBody }>(
    '/api/ideas/:id/package-tests',
    async (request, reply) => {
      try {
        return reply.code(201).send(topicService.createPackageTest(
          request.params.id,
          {
            opId: requiredString(request.body?.opId, 'opId'),
            directions: requiredArray(
              request.body?.directions,
              'directions',
            ) as PackageDirection[],
          },
        ));
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.get<{ Params: IdeaParams }>(
    '/api/ideas/:id/package-tests',
    async (request, reply) => {
      try {
        return topicService.listPackageTests(request.params.id);
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.post<{ Body: RegisterTopicRunBody }>(
    '/api/topic-runs',
    async (request, reply) => {
      try {
        return reply.code(201).send(
          topicService.registerRun(
            requiredString(request.body?.opId, 'opId'),
          ),
        );
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.get('/api/topic-runs', async (_request, reply) => {
    try {
      return topicService.listRuns();
    } catch (error) {
      return sendTopicError(reply, error);
    }
  });

  app.get<{ Params: TopicRunParams }>(
    '/api/topic-runs/:id',
    async (request, reply) => {
      try {
        return topicService.getRun(request.params.id);
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.post<{ Params: TopicRunParams; Body: TopicHandoffBody }>(
    '/api/topic-runs/:id/handoff',
    async (request, reply) => {
      try {
        return await topicService.handoff(request.params.id, request.body);
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.get('/api/pipeline', async (_request, reply) => {
    try {
      return await topicService.pipeline();
    } catch (error) {
      return sendTopicError(reply, error);
    }
  });

  app.get<{ Querystring: TopicBriefQuery }>(
    '/api/topic-brief',
    async (request, reply) => {
      try {
        return await topicService.topicBrief(
          requiredString(request.query.ref, 'ref'),
        );
      } catch (error) {
        return sendTopicError(reply, error);
      }
    },
  );

  app.post<{ Body: WriteArtifactBody }>(
    '/api/artifacts',
    async (request, reply) => {
      try {
        const write = options.artifactService.write;
        if (!write) throw new Error('artifact service is not configured');
        const result = await write(
          requiredString(request.body?.path, 'path'),
          requiredStringValue(request.body?.content, 'content'),
          requiredArtifactExpectedState(request.body?.expectedState),
        );
        return result.conflict
          ? reply.code(409).send(result)
          : reply.send(result);
      } catch (error) {
        return sendArtifactError(reply, error);
      }
    },
  );

  app.post<{ Body: UpsertPipelineBody }>(
    '/api/pipeline',
    async (request, reply) => {
      try {
        const upsert = options.artifactService.upsertPipelineRow;
        if (!upsert) throw new Error('artifact service is not configured');
        const result = await upsert({
          episodeSlug: requiredString(
            request.body?.episodeSlug,
            'episodeSlug',
          ),
          milestone: requiredString(request.body?.milestone, 'milestone'),
          ref: requiredString(request.body?.ref, 'ref'),
        });
        return result.conflict
          ? reply.code(409).send(result)
          : reply.send(result);
      } catch (error) {
        return sendArtifactError(reply, error);
      }
    },
  );

  if (options.staticRoot !== undefined) {
    const staticRoot = resolve(options.staticRoot);
    const serveStatic = (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => serveStaticFile(staticRoot, request, reply);
    app.get('/', serveStatic);
    app.get<{ Params: StaticParams }>('/*', serveStatic);
  }

  return app;
}

function isApiPath(rawUrl: string): boolean {
  const path = rawUrl.split('?', 1)[0] ?? '';
  return path === '/api' || path.startsWith('/api/');
}

async function serveStaticFile(
  staticRoot: string,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const rawPath = (request.raw.url ?? '/').split('?', 1)[0] ?? '/';
  if (isApiPath(rawPath)) {
    return reply.code(404).send({ error: 'not found' });
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    return reply.code(400).send({ error: 'invalid path' });
  }
  const relativePath = pathname.replace(/^\/+/, '');
  const file = extname(pathname) === ''
    ? resolve(staticRoot, 'index.html')
    : resolve(staticRoot, relativePath);
  if (file !== staticRoot && !file.startsWith(`${staticRoot}${sep}`)) {
    return reply.code(404).send({ error: 'not found' });
  }

  try {
    const contents = await readFile(file);
    return reply.type(contentType(file)).send(contents);
  } catch (error) {
    if (
      error instanceof Error
      && 'code' in error
      && ['ENOENT', 'EISDIR', 'ENOTDIR'].includes(String(error.code))
    ) {
      return reply.code(404).send({ error: 'not found' });
    }
    throw error;
  }
}

function contentType(file: string): string {
  switch (extname(file).toLowerCase()) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js':
    case '.mjs': return 'application/javascript; charset=utf-8';
    case '.json':
    case '.map': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.ico': return 'image/x-icon';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    case '.txt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function hasOwn(value: unknown, key: string): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && Object.prototype.hasOwnProperty.call(value, key);
}

function requiredString(value: unknown, field: string): string {
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

function requiredArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }
  return value;
}

function requiredStringArray(value: unknown, field: string): string[] {
  if (
    !Array.isArray(value)
    || value.some((item) => typeof item !== 'string' || item.trim() === '')
  ) {
    throw new Error(`${field} must be an array of non-empty strings`);
  }
  return value;
}

function requiredArchitectureSections(
  value: unknown,
): SaveArchitectureInput['sections'] {
  if (!Array.isArray(value)) throw new Error('sections must be an array');
  return value as SaveArchitectureInput['sections'];
}

function requiredRevisionSeq(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new Error('expectedRevisionSeq must be a non-negative integer');
  }
  return value as number;
}

function requiredTrue(value: unknown, field: string): true {
  if (value !== true) throw new Error(`${field} must be true`);
  return true;
}

function requiredMilestoneKind(value: string): MilestoneKind {
  const kinds: MilestoneKind[] = [
    'topic-selection',
    'architecture-approval',
    'architecture-reopen',
    'creative-narration-approval',
    'production-promotion',
  ];
  if (!kinds.includes(value as MilestoneKind)) {
    throw new Error('invalid milestone kind');
  }
  return value as MilestoneKind;
}

function requireMilestoneService(
  service: MilestoneHttpService | undefined,
): MilestoneHttpService {
  if (!service) throw new Error('milestone service is not configured');
  return service;
}

function requiredArtifactExpectedState(
  value: unknown,
): ArtifactExpectedState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('expectedState is required');
  }
  const state = value as Record<string, unknown>;
  const hasExpectNew = Object.prototype.hasOwnProperty.call(
    state,
    'expectNew',
  );
  const hasExpectedHash = Object.prototype.hasOwnProperty.call(
    state,
    'expectedHash',
  );
  if (
    hasExpectNew
    && state['expectNew'] === true
    && !hasExpectedHash
  ) {
    return { expectNew: true };
  }
  if (
    hasExpectedHash
    && typeof state['expectedHash'] === 'string'
    && state['expectedHash'].trim() !== ''
    && !hasExpectNew
  ) {
    return { expectedHash: state['expectedHash'] };
  }
  throw new Error(
    'expectedState must contain exactly expectNew or expectedHash',
  );
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string or null`);
  }
  return value;
}

function optionalOneLineNote(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || /[\r\n]/u.test(value)) {
    throw new Error('reason must be a single-line string or null');
  }
  return value;
}

function optionalNonNegativeInteger(
  value: string | undefined,
  field: string,
): number | undefined {
  if (value === undefined) return undefined;
  return requiredNonNegativeInteger(Number(value), field);
}

function optionalPositiveInteger(
  value: string | undefined,
  field: string,
): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return parsed;
}

function requiredPositiveInteger(
  value: unknown,
  field: string,
): number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value as number;
}

function requiredNonNegativeInteger(
  value: unknown,
  field: string,
): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return value as number;
}

function requiredFormat(value: unknown): 'annotated' | 'narration' {
  if (value !== 'annotated' && value !== 'narration') {
    throw new Error('format must be annotated or narration');
  }
  return value;
}

function requiredDocument(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('doc is required');
  }
  return value as Record<string, unknown>;
}

function requiredIdeaSource(value: unknown): 'inbox' | 'ideate' {
  if (value !== 'inbox' && value !== 'ideate') {
    throw new Error('source must be inbox or ideate');
  }
  return value;
}

function requiredIdeaStatus(
  value: unknown,
): 'open' | 'promoted' | 'discarded' {
  if (!['open', 'promoted', 'discarded'].includes(String(value))) {
    throw new Error('status must be open, promoted, or discarded');
  }
  return value as 'open' | 'promoted' | 'discarded';
}

function waitForStreamDrain(stream: PassThrough): Promise<void> {
  return new Promise((resolve) => {
    if (stream.destroyed) {
      resolve();
      return;
    }
    const finish = () => {
      stream.off('drain', finish);
      stream.off('close', finish);
      stream.off('error', finish);
      resolve();
    };
    stream.once('drain', finish);
    stream.once('close', finish);
    stream.once('error', finish);
  });
}

function sendDocumentError(
  reply: FastifyReply,
  error: unknown,
  architectureService?: ArchitectureHttpService,
  draftId?: string,
) {
  const effectiveDraftId = draftId
    ?? (
      error instanceof DraftWriteReservationError
        ? error.draftId
        : undefined
    );
  const pausedState = architectureService && effectiveDraftId
    ? currentPausedArchitectureState(architectureService, effectiveDraftId)
    : null;
  if (error instanceof DraftWriteReservationError) {
    return sendDraftWriteReservationError(reply, error, pausedState);
  }
  if (error instanceof ExportBlockedError) {
    return reply.code(409).send({
      error: error.message,
      reasons: error.reasons,
    });
  }

  const message = error instanceof Error ? error.message : 'document failed';
  if (/^draft not found:/i.test(message)) {
    return reply.code(404).send({ error: message });
  }
  if (/^draft write deferred:/u.test(message)) {
    return reply.code(425).send({ error: message });
  }
  if (isDocumentClientError(message)) {
    return reply.code(400).send({ error: message });
  }

  reply.log.error({ err: error }, 'document request failed');
  return reply.code(500).send({ error: 'internal server error' });
}

function sendMilestoneError(
  reply: FastifyReply,
  error: unknown,
) {
  const message = error instanceof Error
    ? error.message
    : 'milestone request failed';
  if (
    error instanceof MilestoneConflictError
    || error instanceof MilestoneCommitError
  ) {
    return reply.code(409).send({ error: message });
  }
  if (error instanceof WorkspaceChoiceRequiredError) {
    return reply.code(428).send({ error: message });
  }
  if (/^(?:draft|pending milestone) not found:/i.test(message)) {
    return reply.code(404).send({ error: message });
  }
  if (
    [
      /^choice must be /,
      / is required$/,
      / must be true$/,
      /^invalid milestone kind$/,
      /^current branch choice must be explicitly confirmed$/,
      /^milestone commit must be explicitly confirmed$/,
      /^task name must /,
    ].some((pattern) => pattern.test(message))
  ) {
    return reply.code(400).send({ error: message });
  }
  if (message === 'milestone service is not configured') {
    reply.log.error({ err: error }, message);
    return reply.code(500).send({ error: 'internal server error' });
  }
  reply.log.error({ err: error }, 'milestone request failed');
  return reply.code(500).send({ error: 'internal server error' });
}

function isDocumentClientError(message: string): boolean {
  return [
    /^(?:episodeSlug|title|markdown|disposition) is required$/,
    /^format must be annotated or narration$/,
    /^doc is required$/,
    /^opId must be a string or null$/,
    /^invalid draft document:/,
    /^draft format .+ does not match document format /,
    /^Markdown contains no beat headers$/,
  ].some((pattern) => pattern.test(message));
}

function sendOperationError(
  reply: FastifyReply,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : 'operation failed';
  if (/^operation not found:/i.test(message)) {
    return reply.code(404).send({ error: message });
  }
  if (isOperationClientError(message)) {
    return reply.code(400).send({ error: message });
  }

  reply.log.error({ err: error }, 'operation request failed');
  return reply.code(500).send({ error: 'internal server error' });
}

function sendArchitectureError(
  reply: FastifyReply,
  error: unknown,
  architectureService?: ArchitectureHttpService,
  draftId?: string,
) {
  const effectiveDraftId = draftId
    ?? (
      error instanceof DraftWriteReservationError
        ? error.draftId
        : undefined
    );
  const pausedState = architectureService && effectiveDraftId
    ? currentPausedArchitectureState(architectureService, effectiveDraftId)
    : null;
  if (error instanceof DraftWriteReservationError) {
    return sendDraftWriteReservationError(reply, error, pausedState);
  }
  if (error instanceof ArchitectureRevisionConflictError) {
    return reply.code(409).send({
      error: error.message,
      current: error.current,
    });
  }
  if (error instanceof NarrationRevisionConflictError) {
    return reply.code(409).send({
      error: error.message,
      current: error.current,
    });
  }
  if (error instanceof ArchitectureArtifactConflictError) {
    return reply.code(409).send({
      error: error.message,
      currentHash: error.currentHash,
      ...(error.parked ? { parked: error.parked } : {}),
      steps: error.steps,
      state: error.state,
    });
  }
  if (error instanceof ProductionSyncConflictError) {
    return reply.code(409).send({
      error: error.message,
      currentHash: error.currentHash,
      ...(error.parked ? { parked: error.parked } : {}),
    });
  }
  if (error instanceof ArchitectureGateError) {
    return reply.code(409).send({
      error: error.message,
      ...(pausedState ? { state: pausedState } : {}),
    });
  }
  if (error instanceof MilestoneConflictError) {
    return reply.code(409).send({
      error: error.message,
      recoverable: true,
      ...(pausedState ? { state: pausedState } : {}),
    });
  }
  const message = error instanceof Error
    ? error.message
    : 'architecture request failed';
  if (/^(?:draft|operation) not found:/i.test(message)) {
    return reply.code(404).send({ error: message });
  }
  if ([
    /^operation is required$/,
    /^inputs (?:are required|must be an object)$/,
    /^sections(?:\[| must be an array)/,
    /^expectedRevisionSeq must be a non-negative integer$/,
    /^opId must be a string or null$/,
    /^disposition is required$/,
    /^confirmed must be true$/,
    /^resumeKey is required$/,
    /^expectedNarrationMd is required$/,
    /^settledExportToken is required$/,
    /^target_path is required$/,
    /^invalid production target:/,
    /^unknown operation:/,
    /^cannot resume .+ as .+$/,
    /^operation .+ is not resumable$/,
    /^maximum resume chain length is 3$/,
    /^operation cannot be resumed without a thread id$/,
  ].some((pattern) => pattern.test(message))) {
    return reply.code(400).send({ error: message });
  }
  reply.log.error({ err: error }, 'architecture request failed');
  return reply.code(500).send({
    error: 'internal server error',
    ...(pausedState ? { state: pausedState } : {}),
  });
}

function currentPausedArchitectureState(
  architectureService: ArchitectureHttpService,
  draftId: string,
) {
  try {
    const state = architectureService.get(draftId);
    return state.pendingSaga ? state : null;
  } catch {
    return null;
  }
}

function isOperationClientError(message: string): boolean {
  return [
    /^operation is required$/,
    /^inputs are required$/,
    /^unknown operation:/,
    /^full inputs are required$/,
    /^cannot resume .+ as .+$/,
    /^operation .+ is not resumable$/,
    /^maximum resume chain length is 3$/,
    /^operation cannot be resumed without a thread id$/,
    /^operation (?:generate-episode|promote) requires a draft-scoped submission$/,
    /^fromSeq and Last-Event-ID must be /,
  ].some((pattern) => pattern.test(message));
}

function sendValidatorError(
  reply: FastifyReply,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : 'validation failed';
  if (
    error instanceof InvalidValidatorPathError
    || message === 'path is required'
  ) {
    return reply.code(400).send({ error: message });
  }

  reply.log.error({ err: error }, 'validator request failed');
  return reply.code(500).send({ error: 'internal server error' });
}

function sendPromotionError(
  reply: FastifyReply,
  error: unknown,
  architectureService?: ArchitectureHttpService,
  draftId?: string,
) {
  const effectiveDraftId = draftId
    ?? (
      error instanceof DraftWriteReservationError
        ? error.draftId
        : undefined
    );
  const pausedState = architectureService && effectiveDraftId
    ? currentPausedArchitectureState(architectureService, effectiveDraftId)
    : null;
  if (error instanceof DraftWriteReservationError) {
    return sendDraftWriteReservationError(reply, error, pausedState);
  }
  const message = error instanceof Error
    ? error.message
    : 'promotion failed';
  if (/^draft not found:/iu.test(message)) {
    return reply.code(404).send({ error: message });
  }
  if (/^promote (?:validation|completion) refused:/u.test(message)) {
    return reply.code(409).send({ error: message });
  }
  reply.log.error({ err: error }, 'promotion request failed');
  return reply.code(500).send({ error: 'internal server error' });
}

function sendDraftWriteReservationError(
  reply: FastifyReply,
  error: DraftWriteReservationError,
  state: ReturnType<ArchitectureHttpService['get']> | null = null,
) {
  return reply.code(409).send({
    error: error.message,
    code: error.code,
    reservation: error.reservation,
    sagaKind: error.sagaKind,
    recoverable: error.recoverable,
    ...(state ? { state } : {}),
  });
}

function sendTopicError(
  reply: FastifyReply,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : 'topic request failed';
  if (/^(?:idea|topic run|topic brief|operation) not found:/i.test(message)) {
    return reply.code(404).send({ error: message });
  }
  if (isTopicClientError(message)) {
    return reply.code(400).send({ error: message });
  }

  reply.log.error({ err: error }, 'topic request failed');
  return reply.code(500).send({ error: 'internal server error' });
}

function requireLearningService(
  service: LearningHttpService | undefined,
): LearningHttpService {
  if (!service) throw new Error('learning service is not configured');
  return service;
}

function sendLearningError(
  reply: FastifyReply,
  error: unknown,
) {
  if (error instanceof ReconciliationVerificationRefusal) {
    return reply.code(409).send({
      error: error.message,
      code: error.code,
      recoverable: error.recoverable,
      checked: error.checked,
    });
  }
  const message = error instanceof Error
    ? error.message
    : 'learning request failed';
  if (
    /^(?:draft|decision|distillation run|lesson|lesson reconciliation) not found:/iu
      .test(message)
  ) {
    return reply.code(404).send({ error: message });
  }
  if (
    /^(?:after|limit|directionIndex) must /u.test(message)
    || message === 'reason must be a single-line string or null'
    || /^(?:expectedVersion|reviewedMarkdown) must /u.test(message)
    || /^(?:commit|path|anchor|contentHash|predecessorLessonId) is required$/u
      .test(message)
  ) {
    return reply.code(400).send({ error: message });
  }
  if (
    / conflict:/u.test(message)
    || / resolution refused:/u.test(message)
  ) {
    return reply.code(409).send({ error: message });
  }
  reply.log.error({ err: error }, 'learning request failed');
  return reply.code(500).send({ error: 'internal server error' });
}

function isTopicClientError(message: string): boolean {
  return [
    /^(?:text|opId|latestCheckOpId) is required$/,
    /^directions must be an array$/,
    /^directions\[\d+\]/,
    /^directionIndex (?:must be|is out of range)/,
    /^package test selection conflict:/,
    /^source must be inbox or ideate$/,
    /^status must be open, promoted, or discarded$/,
    /^latestCheck\./,
    /^latestCheck is required with latestCheckOpId$/,
    /^idea update is required$/,
    /^operation .+ is not a full-topic-run$/,
    /^topic run has no selected winner to hand off$/,
    /^topic handoff /,
    /^(?:ideaId|episodeSlug|title|briefMarkdown) is required$/,
    /^draft\.(?:doc is required|format must be narration)$/,
    /^ref is required$/,
    /^invalid topic brief ref:/,
  ].some((pattern) => pattern.test(message));
}

function sendArtifactError(
  reply: FastifyReply,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : 'artifact failed';
  if ([
    /^(?:path|episodeSlug|milestone|ref) is required$/,
    /^content must be a string$/,
    /^expectedState /,
    /^invalid or non-whitelisted artifact path:/,
  ].some((pattern) => pattern.test(message))) {
    return reply.code(400).send({ error: message });
  }

  reply.log.error({ err: error }, 'artifact request failed');
  return reply.code(500).send({ error: 'internal server error' });
}

const topicNotConfigured = (): never => {
  throw new Error('topic service is not configured');
};

const architectureNotConfigured = (): never => {
  throw new Error('architecture service is not configured');
};

const UNCONFIGURED_ARCHITECTURE_SERVICE: ArchitectureHttpService = {
  get: architectureNotConfigured,
  save: architectureNotConfigured,
  submitOperation: architectureNotConfigured,
  resumeOperation: architectureNotConfigured,
  prepareNarrationApproval: architectureNotConfigured,
  approveNarration: architectureNotConfigured,
  markNarrationReconciled: architectureNotConfigured,
  promotion: architectureNotConfigured,
  approve: architectureNotConfigured,
  resumeArchitectureSaga: architectureNotConfigured,
  reopen: architectureNotConfigured,
};

const UNCONFIGURED_TOPIC_SERVICE: TopicHttpService = {
  createIdea: topicNotConfigured,
  getIdea: topicNotConfigured,
  listIdeas: topicNotConfigured,
  updateIdea: topicNotConfigured,
  deleteIdea: topicNotConfigured,
  createPackageTest: topicNotConfigured,
  listPackageTests: topicNotConfigured,
  pickPackageDirection: topicNotConfigured,
  registerRun: topicNotConfigured,
  listRuns: topicNotConfigured,
  getRun: topicNotConfigured,
  handoff: topicNotConfigured,
  pipeline: topicNotConfigured,
  topicBrief: topicNotConfigured,
};
