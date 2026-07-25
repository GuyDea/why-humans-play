import { randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fchmodSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { ArchitectureService } from './architecture/service.js';
import { DocumentService } from './documents/service.js';
import { DocumentStore } from './documents/store.js';
import { buildApp } from './http/app.js';
import { JobStore } from './job-store.js';
import { LearningService } from './learning/service.js';
import { LearningStore } from './learning/store.js';
import {
  isValidEffort,
  isValidModel,
  MODEL_ERROR,
  EFFORT_ERROR,
} from './operations/model-config.js';
import {
  OperationService,
  type OperationClock,
} from './operations/service.js';
import {
  readArtifact,
  upsertPipelineRow,
  writeArtifact,
  writeEpisodeArtifact,
} from './repo/artifacts.js';
import {
  MilestoneService,
  SerializedLane,
} from './repo/milestones.js';
import { runValidatorJson } from './repo/validator.js';
import { JobSupervisor } from './supervisor.js';
import { TopicService } from './topics/service.js';
import { TopicStore } from './topics/store.js';
import {
  type AppDirEnvironment,
  type AppDirs,
  resolveAppDirs,
} from './xdg.js';

export interface RuntimeHandshake {
  port: number;
  nonce: string;
  pid: number;
  startedAt: string;
}

export interface DaemonContext {
  app: FastifyInstance;
  dirs: AppDirs;
  nonce: string;
  stateDbFile: string;
  supervisor: JobSupervisor;
  close(): Promise<void>;
}

export interface DaemonEnvironment extends AppDirEnvironment {
  SC_CODEX_BIN?: string;
  SC_CLAUDE_BIN?: string;
  SC_CODEX_MODEL?: string;
  SC_CODEX_EFFORT?: string;
}

export interface CreateDaemonContextOptions {
  repoRoot: string;
  env: DaemonEnvironment;
  clock?: OperationClock;
}

type DaemonSignal = 'SIGINT' | 'SIGTERM';

export interface DaemonSignalTarget {
  once(signal: DaemonSignal, listener: () => void): void;
  removeListener(signal: DaemonSignal, listener: () => void): void;
}

export interface StartDaemonContextOptions {
  port: number;
  pid?: number;
  now?: () => Date;
  log?: (line: string) => void;
  signalTarget?: DaemonSignalTarget | null;
  onSignalError?: (error: unknown) => void;
}

export interface RunningDaemon {
  port: number;
  nonce: string;
  url: string;
  runtimeFile: string;
  shutdown(): Promise<void>;
}

export interface StartDaemonOptions {
  port?: number;
  repoRoot?: string;
  env?: DaemonEnvironment;
}

const PROCESS_SIGNALS: DaemonSignalTarget = {
  once(signal, listener) {
    process.once(signal, listener);
  },
  removeListener(signal, listener) {
    process.removeListener(signal, listener);
  },
};

export function generateNonce(): string {
  return randomBytes(16).toString('hex');
}

function validateEnvModel(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (!isValidModel(value)) {
    throw new Error(`SC_CODEX_MODEL is invalid: ${MODEL_ERROR}`);
  }
  return value;
}

function validateEnvEffort(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (!isValidEffort(value)) {
    throw new Error(`SC_CODEX_EFFORT is invalid: ${EFFORT_ERROR}`);
  }
  return value;
}

export function parsePort(args: readonly string[]): number {
  if (args.length === 0) return 0;
  if (args.length === 2 && args[0] === '--port') {
    const rawPort = args[1]!;
    const port = Number(rawPort);
    if (
      rawPort.trim() === ''
      || !Number.isInteger(port)
      || port < 0
      || port > 65_535
    ) {
      throw new Error(`invalid port: ${rawPort}`);
    }
    return port;
  }
  throw new Error('usage: daemon [--port <port>]');
}

export function createDaemonContext(
  options: CreateDaemonContextOptions,
): DaemonContext {
  const repoRoot = resolve(options.repoRoot);
  const dirs = resolveAppDirs(repoRoot, options.env);
  const stateDbFile = join(dirs.stateDir, 'state.sqlite3');
  const nonce = generateNonce();
  const jobStore = new JobStore(stateDbFile);
  let documentStore: DocumentStore | undefined;
  let topicStore: TopicStore | undefined;
  let learningStore: LearningStore | undefined;
  let supervisor: JobSupervisor | undefined;
  let operationService: OperationService | undefined;
  let milestoneService: MilestoneService | undefined;

  try {
    documentStore = new DocumentStore(stateDbFile);
    topicStore = new TopicStore(stateDbFile);
    learningStore = new LearningStore(stateDbFile);
    const gitValidatorLane = new SerializedLane();
    milestoneService = new MilestoneService({
      stateDbFile,
      repoRoot,
      worktreesRoot: join(dirs.dataDir, 'worktrees'),
      lane: gitValidatorLane,
    });
    supervisor = new JobSupervisor({
      store: jobStore,
      jobsRoot: dirs.jobsRoot,
    });
    const modelFallback = validateEnvModel(options.env.SC_CODEX_MODEL);
    const effortFallback = validateEnvEffort(options.env.SC_CODEX_EFFORT);
    operationService = new OperationService({
      supervisor,
      store: jobStore,
      clock: options.clock,
      codexBin: options.env.SC_CODEX_BIN,
      claudeBin: options.env.SC_CLAUDE_BIN,
      model: modelFallback,
      effort: effortFallback,
    });
    operationService.enforceDeadlinesAtBoot();
    supervisor.reattach();
    operationService.reconcileTimedOutAttempts();
    const activeOperationService = operationService;
    const learningService = new LearningService({
      store: learningStore,
      documentStore,
      topicStore,
      operationService: activeOperationService,
      repositoryRootForDraft: (draftId) =>
        milestoneService!.hasWorkspace(draftId)
          ? milestoneService!.workspacePath(draftId)
          : repoRoot,
      operationEvidence: (operationId) => {
        const envelope = jobStore.operationEnvelope(operationId);
        if (!envelope) return null;
        const operation = activeOperationService.get(operationId);
        return {
          operationId,
          draftId: operation.draftId,
          operation: operation.operation,
          state: operation.state,
          envelope,
          inputs: activeOperationService.inputs(operationId),
          result: activeOperationService.result(operationId),
        };
      },
    });
    learningService.recoverDistillations();
    learningService.recoverPendingRedactions();
    for (const operation of activeOperationService.list()) {
      try {
        learningService.recoverOperationLessons(
          operation.id,
          activeOperationService.inputs(operation.id),
          operation.draftId,
        );
      } catch {
        // A malformed historical envelope remains inspectable but cannot be
        // guessed into an operation-lesson provenance record.
      }
    }
    const activeMilestoneService = milestoneService;
    const workspaceArtifacts = {
      write: (
        relPath: string,
        content: string,
        expectedState: Parameters<typeof writeArtifact>[3],
      ) => activeMilestoneService.withWorkspaceForPath(
        relPath,
        ({ worktreePath }) =>
          writeArtifact(worktreePath, relPath, content, expectedState),
      ),
      upsertPipelineRow: (
        row: Parameters<typeof upsertPipelineRow>[1],
      ) => activeMilestoneService.withWorkspaceForEpisode(
        row.episodeSlug,
        ({ worktreePath }) => upsertPipelineRow(worktreePath, row),
      ),
      read: (relPath: string) =>
        activeMilestoneService.withWorkspaceForPath(
          relPath,
          ({ worktreePath }) => readArtifact(worktreePath, relPath),
        ),
      writeProduction: (
        relPath: string,
        content: string,
        expectedState: Parameters<typeof writeEpisodeArtifact>[3],
      ) => activeMilestoneService.withWorkspaceForPath(
        relPath,
        ({ worktreePath }) => writeEpisodeArtifact(
          worktreePath,
          relPath,
          content,
          expectedState,
        ),
      ),
    };
    const documentService = new DocumentService({
      store: documentStore,
      milestoneService: activeMilestoneService,
      learningService,
    });
    const architectureService = new ArchitectureService({
      store: documentStore,
      operationService,
      artifactService: workspaceArtifacts,
      workspaceService: activeMilestoneService,
      learningService,
    });
    const topicService = new TopicService({
      store: topicStore,
      operationService,
      documentService,
      repoRoot,
      artifactService: workspaceArtifacts,
      workspaceService: activeMilestoneService,
      learningService,
    });
    const app = buildApp({
      nonce,
      staticRoot: findStaticRoot(repoRoot),
      operationService,
      documentService,
      architectureService,
      topicService,
      artifactService: workspaceArtifacts,
      validatorService: {
        validate: (scriptRelPath) =>
          activeMilestoneService.withWorkspaceForPath(
            scriptRelPath,
            ({ worktreePath }) =>
              runValidatorJson(worktreePath, scriptRelPath),
          ),
      },
      milestoneService: activeMilestoneService,
      learningService,
    });
    const activeSupervisor = supervisor;
    const activeDocumentStore = documentStore;
    const activeTopicStore = topicStore;
    const activeLearningStore = learningStore;
    const daemonMilestoneService = milestoneService;

    let closed = false;
    return {
      app,
      dirs,
      nonce,
      stateDbFile,
      supervisor: activeSupervisor,
      async close() {
        if (closed) return;
        closed = true;
        try {
          activeOperationService.dispose();
          activeSupervisor.stop();
        } finally {
          try {
            await app.close();
          } finally {
            try {
              activeTopicStore.close();
            } finally {
              try {
                activeLearningStore.close();
              } finally {
                try {
                  activeDocumentStore.close();
                } finally {
                  daemonMilestoneService.close();
                }
              }
            }
          }
        }
      },
    };
  } catch (error) {
    operationService?.dispose();
    if (supervisor) supervisor.stop();
    else jobStore.close();
    topicStore?.close();
    learningStore?.close();
    documentStore?.close();
    milestoneService?.close();
    throw error;
  }
}

export async function startDaemonContext(
  context: DaemonContext,
  options: StartDaemonContextOptions,
): Promise<RunningDaemon> {
  let unregisterSignals = () => {};
  let runtimePublished = false;
  try {
    const address = await context.app.listen({
      host: '127.0.0.1',
      port: options.port,
    });
    const addressMatch = /^http:\/\/127\.0\.0\.1:(\d{1,5})\/?$/.exec(address);
    const port = Number(addressMatch?.[1]);
    if (
      !addressMatch
      || !Number.isInteger(port)
      || port < 1
      || port > 65_535
    ) {
      throw new Error(`daemon returned an invalid listen address: ${address}`);
    }

    const url = `http://127.0.0.1:${port}`;
    let shutdownPromise: Promise<void> | undefined;
    const shutdown = (): Promise<void> => {
      shutdownPromise ??= (async () => {
        unregisterSignals();
        try {
          removeRuntimeFile(context.dirs.runtimeFile);
        } finally {
          await context.close();
        }
      })();
      return shutdownPromise;
    };

    const signalTarget = options.signalTarget === undefined
      ? PROCESS_SIGNALS
      : options.signalTarget;
    if (signalTarget) {
      const handleSignal = () => {
        void shutdown().catch(
          options.onSignalError ?? ((error: unknown) => {
            console.error('Script Creator daemon shutdown failed:', error);
            process.exitCode = 1;
          }),
        );
      };
      signalTarget.once('SIGINT', handleSignal);
      signalTarget.once('SIGTERM', handleSignal);
      unregisterSignals = () => {
        signalTarget.removeListener('SIGINT', handleSignal);
        signalTarget.removeListener('SIGTERM', handleSignal);
      };
    }

    writeRuntimeFile(context.dirs.runtimeFile, {
      port,
      nonce: context.nonce,
      pid: options.pid ?? process.pid,
      startedAt: (options.now ?? (() => new Date()))().toISOString(),
    });
    runtimePublished = true;

    const launchUrl = `${url}/#nonce=${context.nonce}`;
    (options.log ?? console.log)(
      `Script Creator daemon listening at ${launchUrl}`,
    );
    return {
      port,
      nonce: context.nonce,
      url,
      runtimeFile: context.dirs.runtimeFile,
      shutdown,
    };
  } catch (error) {
    unregisterSignals();
    if (runtimePublished) removeRuntimeFile(context.dirs.runtimeFile);
    await context.close();
    throw error;
  }
}

export async function startDaemon(
  options: StartDaemonOptions = {},
): Promise<RunningDaemon> {
  const repoRoot = options.repoRoot
    ?? resolve(import.meta.dirname, '../../..');
  const env = options.env ?? {
    HOME: process.env.HOME,
    XDG_DATA_HOME: process.env.XDG_DATA_HOME,
    XDG_STATE_HOME: process.env.XDG_STATE_HOME,
    SC_CODEX_BIN: process.env.SC_CODEX_BIN,
    SC_CLAUDE_BIN: process.env.SC_CLAUDE_BIN,
    SC_CODEX_MODEL: process.env.SC_CODEX_MODEL,
    SC_CODEX_EFFORT: process.env.SC_CODEX_EFFORT,
  };
  const context = createDaemonContext({ repoRoot, env });
  return startDaemonContext(context, { port: options.port ?? 0 });
}

export function writeRuntimeFile(
  runtimeFile: string,
  handshake: RuntimeHandshake,
): void {
  mkdirSync(dirname(runtimeFile), { recursive: true });
  const tempFile = join(
    dirname(runtimeFile),
    `.${basename(runtimeFile)}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`,
  );
  let fd: number | undefined;
  try {
    fd = openSync(tempFile, 'wx', 0o600);
    writeFileSync(fd, JSON.stringify(handshake), 'utf8');
    fchmodSync(fd, 0o600);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(tempFile, runtimeFile);
  } finally {
    if (fd !== undefined) closeSync(fd);
    rmSync(tempFile, { force: true });
  }
}

export function removeRuntimeFile(runtimeFile: string): void {
  rmSync(runtimeFile, { force: true });
}

function findStaticRoot(repoRoot: string): string | undefined {
  const distRoot = join(repoRoot, 'script-creator', 'app', 'dist');
  if (!existsSync(distRoot)) return undefined;

  for (const entry of readdirSync(distRoot, { withFileTypes: true })
    .filter((candidate) => candidate.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const browserRoot = join(distRoot, entry.name, 'browser');
    if (existsSync(browserRoot) && statSync(browserRoot).isDirectory()) {
      return browserRoot;
    }
  }
  return undefined;
}

async function main(): Promise<void> {
  await startDaemon({ port: parsePort(process.argv.slice(2)) });
}

const entrypoint = process.argv[1];
if (
  entrypoint !== undefined
  && resolve(entrypoint) === fileURLToPath(import.meta.url)
) {
  void main().catch((error: unknown) => {
    console.error('Script Creator daemon failed to start:', error);
    process.exitCode = 1;
  });
}
