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

export interface BuildAppOptions {
  nonce: string;
  staticRoot?: string;
  operationService: OperationHttpService;
  documentService: DocumentHttpService;
  artifactService: unknown;
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
