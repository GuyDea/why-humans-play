import { PassThrough } from 'node:stream';
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
} from 'fastify';
import type { OperationName } from '../operations/registry.js';
import type { OperationService } from '../operations/service.js';
import {
  hasSseQueryNonce,
  parseFromSeq,
  pumpOperationEvents,
} from './sse.js';

type OperationHttpService = Pick<
  OperationService,
  'submit' | 'get' | 'events' | 'cancel' | 'result'
>;

export interface BuildAppOptions {
  nonce: string;
  operationService: OperationHttpService;
  documentService: unknown;
  artifactService: unknown;
  validatorService: unknown;
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

interface EventsQuery {
  fromSeq?: string;
  nonce?: string;
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

  return app;
}

function hasOwn(value: unknown, key: string): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && Object.prototype.hasOwnProperty.call(value, key);
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
