import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { PassThrough } from 'node:stream';
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from 'fastify';
import {
  ExportBlockedError,
  type CreateDraftInput,
  type DocumentService,
  type SaveDraftInput,
} from '../documents/service.js';
import type { OperationName } from '../operations/registry.js';
import type { OperationService } from '../operations/service.js';
import {
  assertValidatorScriptPath,
  InvalidValidatorPathError,
  type ValidatorResult,
} from '../repo/validator.js';
import type { TopicService } from '../topics/service.js';
import type {
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
>;

export type DocumentHttpService = Pick<
  DocumentService,
  | 'createDraft'
  | 'getDraft'
  | 'listDrafts'
  | 'saveDraft'
  | 'listRevisions'
  | 'importMarkdown'
  | 'exportMarkdown'
>;

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
  | 'registerRun'
  | 'listRuns'
  | 'getRun'
  | 'pipeline'
>;

export interface ArtifactHttpService {
  write?(
    path: string,
    content: string,
    expectedState: ArtifactExpectedState,
  ): Promise<ArtifactWriteResult>;
  upsertPipelineRow?(row: PipelineRow): Promise<ArtifactWriteResult>;
}

export interface BuildAppOptions {
  nonce: string;
  staticRoot?: string;
  operationService: OperationHttpService;
  documentService: DocumentHttpService;
  topicService?: TopicHttpService;
  artifactService: ArtifactHttpService;
  validatorService: ValidatorHttpService;
}

interface SubmitBody {
  operation?: unknown;
  inputs?: unknown;
}

interface ResumeBody {
  inputs?: unknown;
}

interface OperationParams {
  id: string;
}

interface DraftParams {
  id: string;
}

interface IdeaParams {
  id: string;
}

interface TopicRunParams {
  id: string;
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
}

interface RegisterTopicRunBody {
  opId?: unknown;
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
        return sendDocumentError(reply, error);
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
      const id = options.operationService.submit(
        request.body.operation as OperationName,
        request.body.inputs,
      );
      return { id };
    } catch (error) {
      return sendOperationError(reply, error);
    }
  });

  app.get('/api/ops', () => ({
    operations: options.operationService.list(),
  }));

  app.get<{ Params: OperationParams }>('/api/ops/:id', async (request, reply) => {
    try {
      return options.operationService.get(request.params.id);
    } catch (error) {
      return sendOperationError(reply, error);
    }
  });

  app.get<{ Params: OperationParams }>(
    '/api/ops/:id/result',
    async (request, reply) => {
      try {
        return options.operationService.result(request.params.id);
      } catch (error) {
        return sendOperationError(reply, error);
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

  app.patch<{ Params: IdeaParams; Body: UpdateIdeaBody }>(
    '/api/ideas/:id',
    async (request, reply) => {
      try {
        const update: {
          text?: string;
          source?: 'inbox' | 'ideate';
          status?: 'open' | 'promoted' | 'discarded';
          latestCheck?: unknown;
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

  app.get('/api/pipeline', async (_request, reply) => {
    try {
      return await topicService.pipeline();
    } catch (error) {
      return sendTopicError(reply, error);
    }
  });

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
) {
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
  if (isDocumentClientError(message)) {
    return reply.code(400).send({ error: message });
  }

  reply.log.error({ err: error }, 'document request failed');
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

function sendTopicError(
  reply: FastifyReply,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : 'topic request failed';
  if (/^(?:idea|topic run|operation) not found:/i.test(message)) {
    return reply.code(404).send({ error: message });
  }
  if (isTopicClientError(message)) {
    return reply.code(400).send({ error: message });
  }

  reply.log.error({ err: error }, 'topic request failed');
  return reply.code(500).send({ error: 'internal server error' });
}

function isTopicClientError(message: string): boolean {
  return [
    /^(?:text|opId) is required$/,
    /^directions must be an array$/,
    /^directions\[\d+\]/,
    /^source must be inbox or ideate$/,
    /^status must be open, promoted, or discarded$/,
    /^latestCheck\./,
    /^idea update is required$/,
    /^operation .+ is not a full-topic-run$/,
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

const UNCONFIGURED_TOPIC_SERVICE: TopicHttpService = {
  createIdea: topicNotConfigured,
  getIdea: topicNotConfigured,
  listIdeas: topicNotConfigured,
  updateIdea: topicNotConfigured,
  deleteIdea: topicNotConfigured,
  createPackageTest: topicNotConfigured,
  listPackageTests: topicNotConfigured,
  registerRun: topicNotConfigured,
  listRuns: topicNotConfigured,
  getRun: topicNotConfigured,
  pipeline: topicNotConfigured,
};
