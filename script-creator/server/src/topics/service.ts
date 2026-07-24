import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  lstat,
  open,
  readFile,
  realpath,
} from 'node:fs/promises';
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { withCreativePhase } from '../documents/service.js';
import type {
  DraftDocument,
  DraftFormat,
  DraftRecord,
  DraftSummary,
} from '../documents/store.js';
import { parseWhpProgress, type ChecklistState } from '../operations/progress.js';
import type {
  OperationRecord,
  OperationService,
  OperationServiceResult,
} from '../operations/service.js';
import {
  TOPIC_GATE_NAMES,
  TOPIC_SCORE_NAMES,
  TOPIC_SUMMARY_SCHEMA,
} from '../operations/schemas.js';
import { validateAgainstSchema } from '../schema-validate.js';
import type { CodexEvent, OperationState } from '../types.js';
import type {
  ArtifactExpectedState,
  ArtifactWriteResult,
  PipelineRow,
} from '../repo/artifacts.js';
import type {
  MilestoneKind,
  PendingMilestone,
} from '../repo/milestones.js';
import {
  type GateCheckResult,
  type IdeaRecord,
  type IdeaSource,
  type IdeaStatus,
  type PackageDirection,
  type PackageTestRecord,
  type TopicGateName,
  type TopicHandoffSagaRecord,
  type TopicRunRecord,
  type TopicStore,
} from './store.js';

export { TOPIC_SUMMARY_SCHEMA } from '../operations/schemas.js';

const GATE_NAMES = TOPIC_GATE_NAMES;
const SCORE_NAMES = TOPIC_SCORE_NAMES;

export type GateName = typeof GATE_NAMES[number];
export type ScoreName = typeof SCORE_NAMES[number];
export type EvidenceGrade = 'A' | 'B' | 'C' | 'unknown';

export interface TopicSummary {
  candidates: Array<{
    subject: string;
    angle_markdown: string;
    gates: Array<{
      gate: GateName;
      verdict: 'pass' | 'fail' | 'unknown';
      reason_markdown: string;
    }>;
    disposition: string;
  }>;
  shortlist: Array<{
    rank: number;
    subject: string;
    angle_markdown: string;
    scores: Record<ScoreName, {
      score: number | null;
      grade: EvidenceGrade;
    }>;
    total: number | null;
    confidence: 'high' | 'medium' | 'low';
    decisive_risk_markdown: string;
  }>;
  packages: Array<{
    finalist: string;
    direction: string;
    working_title: string;
    intended_viewer: string;
    familiar_markdown: string;
    surprise_markdown: string;
    visual_promise_markdown: string;
    delivered_payoff_markdown: string;
    survives_honestly: boolean;
    reason_markdown: string;
  }>;
  winner: {
    decision_status:
      | 'winner-selected'
      | 'provisional-winner'
      | 'incomplete';
    subject: string | null;
    angle_markdown: string | null;
    confidence: 'high' | 'medium' | 'low';
    why_now_markdown: string;
    strongest_package_markdown: string | null;
  };
}

export interface TopicSummaryExtraction {
  summary: TopicSummary | null;
  summaryError: string | null;
}

export function extractTopicSummary(
  reportMd: string,
): TopicSummaryExtraction {
  const match = /```whp-summary[^\S\r\n]*\r?\n([\s\S]*?)\r?\n```[^\S\r\n]*(?:\r?\n[^\S\r\n]*)*$/
    .exec(reportMd);
  if (!match) {
    return {
      summary: null,
      summaryError: 'whp-summary block is missing',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]!);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      summary: null,
      summaryError:
        `whp-summary block contains malformed JSON: ${message}`,
    };
  }

  const validation = validateAgainstSchema(
    TOPIC_SUMMARY_SCHEMA,
    JSON.stringify(parsed),
  );
  if (!validation.ok) {
    return {
      summary: null,
      summaryError:
        `whp-summary block violates schema: ${validation.reason}`,
    };
  }
  const summary = validation.value as TopicSummary;
  if (summary.candidates.some((candidate) => {
    const gates = new Set(candidate.gates.map((gate) => gate.gate));
    return gates.size !== GATE_NAMES.length
      || GATE_NAMES.some((gate) => !gates.has(gate));
  })) {
    return {
      summary: null,
      summaryError:
        'whp-summary block violates schema: each candidate must contain each of the six gates exactly once',
    };
  }
  if (summary.shortlist.some((row) => {
    const scoreNames = Object.keys(row.scores);
    return scoreNames.length !== SCORE_NAMES.length
      || SCORE_NAMES.some((name) => !scoreNames.includes(name));
  })) {
    return {
      summary: null,
      summaryError:
        'whp-summary block violates schema: each shortlist row must contain all seven score and grade pairs',
    };
  }
  for (const row of summary.shortlist) {
    const scores = SCORE_NAMES.map((name) => row.scores[name].score);
    if (scores.some((score) => score === null)) {
      if (row.total !== null) {
        return {
          summary: null,
          summaryError:
            'whp-summary block violates schema: shortlist total must be null when any component score is null',
        };
      }
      continue;
    }
    const expectedTotal = scores.reduce<number>(
      (total, score) => total + (score ?? 0),
      0,
    );
    if (row.total !== expectedTotal) {
      return {
        summary: null,
        summaryError:
          'whp-summary block violates schema: shortlist total must equal the sum of its seven component scores',
      };
    }
  }

  const finalistRows = [...summary.shortlist]
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 3);
  const finalists = finalistRows.map((row) => row.subject);
  const packageCounts = new Map<string, number>();
  for (const row of summary.packages) {
    packageCounts.set(row.finalist, (packageCounts.get(row.finalist) ?? 0) + 1);
  }
  if (
    summary.packages.length !== finalists.length * 3
    || finalists.some((finalist) => packageCounts.get(finalist) !== 3)
    || [...packageCounts.keys()].some((finalist) => !finalists.includes(finalist))
  ) {
    return {
      summary: null,
      summaryError:
        'whp-summary block violates schema: exactly three package directions are required per top-three finalist',
    };
  }

  const winner = summary.winner;
  if (
    winner.decision_status !== 'incomplete'
    && finalistRows.length < 2
  ) {
    return {
      summary: null,
      summaryError:
        'whp-summary block violates schema: winner-selected and provisional-winner decisions require at least two winner-eligible finalists',
    };
  }
  if (
    (winner.subject !== null && !finalists.includes(winner.subject))
    || (winner.decision_status !== 'incomplete' && winner.subject === null)
  ) {
    return {
      summary: null,
      summaryError:
        'whp-summary block violates schema: winner must be one of the finalists',
    };
  }
  const winnerRow = finalistRows.find(
    (row) => row.subject === winner.subject,
  );
  if (
    winnerRow
    && winner.angle_markdown !== winnerRow.angle_markdown
  ) {
    return {
      summary: null,
      summaryError:
        'whp-summary block violates schema: winner angle must match its shortlist row',
    };
  }
  return {
    summary,
    summaryError: null,
  };
}

export interface CreateIdeaInput {
  text: string;
  source: IdeaSource;
  status?: IdeaStatus;
}

export interface UpdateIdeaInput {
  text?: string;
  source?: IdeaSource;
  status?: IdeaStatus;
  latestCheck?: unknown;
  latestCheckOpId?: string;
}

export interface CreatePackageTestInput {
  opId: string;
  directions: PackageDirection[];
}

export interface TopicRunSummary {
  id: string;
  opId: string;
  state: OperationState;
  createdAt: string;
}

export interface TopicRunSnapshot {
  state: OperationState;
  progress: ChecklistState;
  summary?: TopicSummary | null;
  summaryError?: string;
  reportMd?: string;
  handoff?: TopicHandoffState;
}

export interface PipelineItem {
  episodeSlug: string;
  state: string;
  milestone: string | null;
  ref: string | null;
  draftId: string | null;
  title: string | null;
  creativePhase: string | null;
}

export type PipelineDiagnosticCode =
  | 'bad-header'
  | 'bad-row'
  | 'empty-required-cell'
  | 'duplicate-slug';

export interface PipelineDiagnostic {
  code: PipelineDiagnosticCode;
  line: number | null;
  message: string;
}

interface ParsedPipelineRow {
  episodeSlug: string;
  milestone: string;
  ref: string;
}

export interface PipelineParseResult {
  rows: ParsedPipelineRow[];
  diagnostics: PipelineDiagnostic[];
}

export interface PipelineSnapshot {
  rows: PipelineItem[];
  diagnostics: PipelineDiagnostic[];
}

export interface TopicBrief {
  ref: string;
  markdown: string;
}

type TopicOperationService = Pick<
  OperationService,
  'get' | 'events' | 'result'
>;

interface TopicDocumentService {
  listDrafts(): DraftSummary[];
  getDraft(id: string): DraftRecord;
  createDraftWithId?(
    id: string,
    input: {
      episodeSlug: string;
      title: string;
      format: DraftFormat;
      doc: DraftDocument;
    },
  ): DraftRecord;
}

interface TopicArtifactService {
  write(
    path: string,
    content: string,
    expectedState: ArtifactExpectedState,
  ): Promise<ArtifactWriteResult>;
  upsertPipelineRow(row: PipelineRow): Promise<ArtifactWriteResult>;
}

interface TopicWorkspaceService {
  hasWorkspace(draftId: string): boolean;
  recordPending(input: {
    draftId: string;
    kind: MilestoneKind;
    files: string[];
    reconciliationRequired: boolean;
  }): Promise<PendingMilestone | void>;
}

export interface TopicHandoffInput {
  ideaId: string;
  episodeSlug: string;
  title: string;
  briefMarkdown: string;
  draft: {
    format: DraftFormat;
    doc: DraftDocument;
  };
}

export interface TopicHandoffResumeInput {
  resumeKey: string;
}

type TopicHandoffCommand = TopicHandoffInput | TopicHandoffResumeInput;

export interface TopicHandoffResult {
  draftId: string;
  complete: boolean;
  steps: {
    draftCreated: 'pending' | 'completed';
    artifactWritten: 'pending' | 'completed';
    pipelineUpserted: 'pending' | 'completed';
    ideaPromoted: 'pending' | 'completed';
  };
  error: string | null;
}

export interface TopicHandoffState extends TopicHandoffResult {
  resumeKey: string;
  ideaId: string;
  episodeSlug: string;
  title: string;
}

const TERMINAL_STATES = new Set<OperationState>([
  'completed',
  'failed',
  'cancelled',
  'invalid-output',
  'interrupted',
  'timed-out',
]);

export class TopicService {
  private readonly store: TopicStore;
  private readonly operationService: TopicOperationService;
  private readonly documentService: TopicDocumentService;
  private readonly artifactService: TopicArtifactService | null;
  private readonly workspaceService: TopicWorkspaceService | null;
  private readonly repoRoot: string;
  private readonly idFactory: () => string;
  private readonly now: () => string;
  private readonly handoffLocks = new Map<string, Promise<void>>();

  constructor(options: {
    store: TopicStore;
    operationService: TopicOperationService;
    documentService: TopicDocumentService;
    artifactService?: TopicArtifactService;
    workspaceService?: TopicWorkspaceService;
    repoRoot: string;
    idFactory?: () => string;
    now?: () => string;
  }) {
    this.store = options.store;
    this.operationService = options.operationService;
    this.documentService = options.documentService;
    this.artifactService = options.artifactService ?? null;
    this.workspaceService = options.workspaceService ?? null;
    this.repoRoot = options.repoRoot;
    this.idFactory = options.idFactory ?? randomUUID;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  createIdea(input: CreateIdeaInput): IdeaRecord {
    return this.store.createIdea({
      id: this.idFactory(),
      text: requireText(input.text),
      source: requireIdeaSource(input.source),
      status: requireIdeaStatus(input.status ?? 'open'),
      latestCheck: null,
      createdAt: this.now(),
    });
  }

  getIdea(id: string): IdeaRecord {
    const record = this.store.getIdea(id);
    if (!record) throw new Error(`idea not found: ${id}`);
    return record;
  }

  listIdeas(): IdeaRecord[] {
    return this.store.listIdeas();
  }

  updateIdea(id: string, input: UpdateIdeaInput): IdeaRecord {
    if (
      input.text === undefined
      && input.source === undefined
      && input.status === undefined
      && input.latestCheck === undefined
      && input.latestCheckOpId === undefined
    ) {
      throw new Error('idea update is required');
    }
    const current = this.getIdea(id);
    if (input.latestCheck === undefined && input.latestCheckOpId !== undefined) {
      throw new Error('latestCheck is required with latestCheckOpId');
    }
    const nextCheck = input.latestCheck === undefined
      ? current.latestCheck
      : requireGateCheck(input.latestCheck);
    if (input.latestCheck !== undefined) {
      const incomingOpId = requireNonEmpty(
        input.latestCheckOpId as string,
        'latestCheckOpId',
      );
      const currentOpId = this.store.getIdeaLatestCheckOpId(id);
      if (
        currentOpId !== null
        && currentOpId !== incomingOpId
        && !isNewerOperation(
          this.operationService.get(incomingOpId),
          this.operationService.get(currentOpId),
        )
      ) {
        return current;
      }
      return this.store.updateIdea({
        ...current,
        text: input.text === undefined ? current.text : requireText(input.text),
        source: input.source === undefined
          ? current.source
          : requireIdeaSource(input.source),
        status: input.status === undefined
          ? current.status
          : requireIdeaStatus(input.status),
        latestCheck: nextCheck,
      }, { latestCheckOpId: incomingOpId });
    }
    return this.store.updateIdea({
      ...current,
      text: input.text === undefined ? current.text : requireText(input.text),
      source: input.source === undefined
        ? current.source
        : requireIdeaSource(input.source),
      status: input.status === undefined
        ? current.status
        : requireIdeaStatus(input.status),
      latestCheck: nextCheck,
    }, { preserveLatestCheck: true });
  }

  deleteIdea(id: string): void {
    if (!this.store.deleteIdea(id)) {
      throw new Error(`idea not found: ${id}`);
    }
  }

  createPackageTest(
    ideaId: string,
    input: CreatePackageTestInput,
  ): PackageTestRecord {
    this.getIdea(ideaId);
    return this.store.createPackageTest({
      id: this.idFactory(),
      ideaId,
      opId: requireNonEmpty(input.opId, 'opId'),
      directions: requirePackageDirections(input.directions),
      createdAt: this.now(),
    });
  }

  listPackageTests(ideaId: string): PackageTestRecord[] {
    this.getIdea(ideaId);
    return this.store.listPackageTests(ideaId);
  }

  registerRun(opId: string): TopicRunSummary {
    const normalizedOpId = requireNonEmpty(opId, 'opId');
    const existing = this.store.getRunByOpId(normalizedOpId);
    if (existing) return runSummary(existing);

    const operation = this.operationService.get(normalizedOpId);
    if (operation.operation !== 'full-topic-run') {
      throw new Error(
        `operation ${normalizedOpId} is not a full-topic-run`,
      );
    }
    return runSummary(this.store.createRun({
      id: this.idFactory(),
      opId: normalizedOpId,
      state: operation.state,
      reportMd: null,
      summary: null,
      summaryError: null,
      resultExtracted: false,
      createdAt: this.now(),
    }));
  }

  listRuns(): TopicRunSummary[] {
    return this.store.listRuns().map((record) => {
      const state = this.operationService.get(record.opId).state;
      if (state === record.state) return runSummary(record);
      return runSummary(this.store.updateRun({ ...record, state }));
    });
  }

  getRun(id: string): TopicRunSnapshot {
    let record = this.store.getRun(id);
    if (!record) throw new Error(`topic run not found: ${id}`);

    const operation = this.operationService.get(record.opId);
    if (operation.state !== record.state) {
      record = this.store.updateRun({
        ...record,
        state: operation.state,
      });
    }
    if (TERMINAL_STATES.has(operation.state) && !record.resultExtracted) {
      record = this.finalizeRun(record, operation);
    }

    const snapshot: TopicRunSnapshot = {
      state: record.state,
      progress: parseWhpProgress(
        this.operationService.events(record.opId),
      ),
    };
    if (record.resultExtracted) {
      snapshot.summary = record.summary as TopicSummary | null;
      if (record.summaryError !== null) {
        snapshot.summaryError = record.summaryError;
      }
      if (record.reportMd !== null) snapshot.reportMd = record.reportMd;
    }
    const winnerSubject = (record.summary as TopicSummary | null)
      ?.winner.subject;
    if (winnerSubject !== null && winnerSubject !== undefined) {
      const saga = this.store.getHandoffSaga(record.id, winnerSubject);
      if (saga) snapshot.handoff = durableHandoffState(saga);
    }
    return snapshot;
  }

  async pipeline(): Promise<PipelineSnapshot> {
    const parsed = await readPipelineRows(
      join(this.repoRoot, 'whp-youtube', 'PIPELINE.md'),
    );
    const records = new Map<string, PipelineItem>();
    for (const row of parsed.rows) {
      records.set(row.episodeSlug, {
        episodeSlug: row.episodeSlug,
        state: normalizePipelineState(row.milestone),
        milestone: row.milestone,
        ref: row.ref,
        draftId: null,
        title: null,
        creativePhase: null,
      });
    }

    for (const draft of this.documentService.listDrafts()) {
      const existing = records.get(draft.episodeSlug);
      if (existing?.draftId !== null && existing?.draftId !== undefined) {
        continue;
      }
      const full = this.documentService.getDraft(draft.id);
      const creativePhase = readCreativePhase(full.doc);
      const draftState = creativePhase === null
        ? 'prototyping'
        : normalizePipelineState(creativePhase);
      records.set(draft.episodeSlug, {
        episodeSlug: draft.episodeSlug,
        state: existing === undefined
          ? draftState
          : furthestPipelineState(existing.state, draftState),
        milestone: existing?.milestone ?? null,
        ref: existing?.ref ?? null,
        draftId: draft.id,
        title: draft.title,
        creativePhase,
      });
    }

    return {
      rows: [...records.values()].sort(
        (left, right) => left.episodeSlug.localeCompare(right.episodeSlug),
      ),
      diagnostics: parsed.diagnostics,
    };
  }

  async topicBrief(ref: string): Promise<TopicBrief> {
    const normalized = requireNonEmpty(ref, 'ref');
    if (
      !/^whp-youtube\/(?:topics|episodes)\/[a-z0-9][a-z0-9._-]*\.md$/u
        .test(normalized)
    ) {
      throw new Error(`invalid topic brief ref: ${normalized}`);
    }
    try {
      return {
        ref: normalized,
        markdown: await readPipelineContractMarkdown(
          this.repoRoot,
          normalized,
        ),
      };
    } catch (error) {
      if (
        error instanceof Error
        && 'code' in error
        && error.code === 'ENOENT'
      ) {
        throw new Error(`topic brief not found: ${normalized}`);
      }
      if (
        error instanceof Error
        && 'code' in error
        && error.code === 'ELOOP'
      ) {
        throw new Error(`invalid topic brief ref: ${normalized}`);
      }
      throw error;
    }
  }

  async handoff(
    runId: string,
    value: unknown,
  ): Promise<TopicHandoffResult> {
    const command = requireHandoffCommand(value);
    this.getRun(runId);
    const run = this.store.getRun(runId);
    if (!run) throw new Error(`topic run not found: ${runId}`);
    const summary = run.summary as TopicSummary | null;
    const winnerSubject = summary?.winner.subject;
    if (!summary || winnerSubject == null) {
      throw new Error('topic run has no selected winner to hand off');
    }
    const key = `${runId}\u0000${winnerSubject}`;
    return this.withHandoffLock(key, () =>
      this.resumeHandoff(runId, winnerSubject, command));
  }

  private async resumeHandoff(
    runId: string,
    winnerSubject: string,
    command: TopicHandoffCommand,
  ): Promise<TopicHandoffResult> {
    if (!this.artifactService) {
      throw new Error('topic handoff artifact service is not configured');
    }
    let saga = this.store.getHandoffSaga(runId, winnerSubject);
    let input: TopicHandoffInput;
    if (isHandoffResumeInput(command)) {
      if (
        !saga
        || command.resumeKey !== handoffResumeKey(runId, winnerSubject)
      ) {
        throw new Error(
          'topic handoff resume key does not match a durable saga',
        );
      }
      input = requireHandoffInput(saga.input);
    } else {
      input = command;
      if (saga && JSON.stringify(saga.input) !== JSON.stringify(input)) {
        throw new Error(
          'topic handoff payload does not match the durable run and winner saga',
        );
      }
    }
    this.getIdea(input.ideaId);
    if (!saga) {
      const timestamp = this.now();
      saga = this.store.createHandoffSaga({
        runId,
        winnerSubject,
        input,
        draftId: this.idFactory(),
        draftCreated: false,
        artifactWritten: false,
        pipelineUpserted: false,
        ideaPromoted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    if (!saga.draftCreated) {
      const createDraftWithId = this.documentService.createDraftWithId;
      if (!createDraftWithId) {
        throw new Error('topic handoff document service is not configured');
      }
      createDraftWithId.call(this.documentService, saga.draftId, {
        episodeSlug: input.episodeSlug,
        title: input.title,
        format: input.draft.format,
        doc: withCreativePhase(input.draft.doc, 'architecture'),
      });
      saga = this.advanceHandoff(saga, { draftCreated: true });
    }

    if (
      this.workspaceService
      && !this.workspaceService.hasWorkspace(saga.draftId)
    ) {
      return handoffResult(
        saga,
        `workspace choice required for draft ${saga.draftId}`,
      );
    }

    const artifactPath = `whp-youtube/topics/${input.episodeSlug}.md`;
    if (!saga.artifactWritten) {
      const result = await this.artifactService.write(
        artifactPath,
        input.briefMarkdown,
        { expectNew: true },
      );
      const intendedHash = createHash('sha256')
        .update(input.briefMarkdown)
        .digest('hex');
      if (result.conflict && result.currentHash !== intendedHash) {
        return handoffResult(
          saga,
          artifactConflictMessage('topic brief', result),
        );
      }
      saga = this.advanceHandoff(saga, { artifactWritten: true });
    }

    if (!saga.pipelineUpserted) {
      const result = await this.artifactService.upsertPipelineRow({
        episodeSlug: input.episodeSlug,
        milestone: 'architecture',
        ref: artifactPath,
      });
      if (result.conflict) {
        return handoffResult(
          saga,
          artifactConflictMessage('pipeline', result),
        );
      }
      saga = this.advanceHandoff(saga, { pipelineUpserted: true });
    }

    if (!saga.ideaPromoted) {
      if (this.workspaceService) {
        await this.workspaceService.recordPending({
          draftId: saga.draftId,
          kind: 'topic-selection',
          files: [artifactPath, 'whp-youtube/PIPELINE.md'],
          reconciliationRequired: true,
        });
      }
      this.updateIdea(input.ideaId, { status: 'promoted' });
      saga = this.advanceHandoff(saga, { ideaPromoted: true });
    }
    return handoffResult(saga, null);
  }

  private advanceHandoff(
    saga: TopicHandoffSagaRecord,
    update: Partial<TopicHandoffSagaRecord>,
  ): TopicHandoffSagaRecord {
    return this.store.updateHandoffSaga({
      ...saga,
      ...update,
      updatedAt: this.now(),
    });
  }

  private async withHandoffLock<T>(
    key: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const previous = this.handoffLocks.get(key) ?? Promise.resolve();
    let release = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.handoffLocks.set(key, current);
    await previous;
    try {
      return await action();
    } finally {
      release();
      if (this.handoffLocks.get(key) === current) {
        this.handoffLocks.delete(key);
      }
    }
  }

  private finalizeRun(
    record: TopicRunRecord,
    operation: OperationRecord,
  ): TopicRunRecord {
    const result = this.operationService.result(record.opId);
    if (operation.state === 'completed' && result.kind === 'raw') {
      const extracted = extractTopicSummary(result.markdown);
      return this.store.updateRun({
        ...record,
        state: operation.state,
        reportMd: result.markdown,
        summary: extracted.summary,
        summaryError: extracted.summaryError,
        resultExtracted: true,
      });
    }

    return this.store.updateRun({
      ...record,
      state: operation.state,
      summary: null,
      summaryError: resultError(operation.state, result),
      resultExtracted: true,
    });
  }
}

function isNewerOperation(
  incoming: OperationRecord,
  current: OperationRecord,
): boolean {
  return incoming.createdAt > current.createdAt;
}

function requireHandoffInput(value: unknown): TopicHandoffInput {
  const input = asRecord(value);
  const draft = asRecord(input?.['draft']);
  const doc = asRecord(draft?.['doc']);
  const format = draft?.['format'];
  if (!input) throw new Error('topic handoff body is required');
  if (!doc) throw new Error('draft.doc is required');
  if (format !== 'narration') {
    throw new Error('draft.format must be narration');
  }
  return {
    ideaId: requireNonEmpty(
      input['ideaId'] as string,
      'ideaId',
    ),
    episodeSlug: requireNonEmpty(
      input['episodeSlug'] as string,
      'episodeSlug',
    ),
    title: requireNonEmpty(input['title'] as string, 'title'),
    briefMarkdown: requireNonEmpty(
      input['briefMarkdown'] as string,
      'briefMarkdown',
    ),
    draft: {
      format,
      doc,
    },
  };
}

function requireHandoffCommand(value: unknown): TopicHandoffCommand {
  const input = asRecord(value);
  if (input && 'resumeKey' in input) {
    return {
      resumeKey: requireNonEmpty(
        input['resumeKey'] as string,
        'resumeKey',
      ),
    };
  }
  return requireHandoffInput(value);
}

function isHandoffResumeInput(
  command: TopicHandoffCommand,
): command is TopicHandoffResumeInput {
  return 'resumeKey' in command;
}

function handoffResult(
  saga: TopicHandoffSagaRecord,
  error: string | null,
): TopicHandoffResult {
  const steps = {
    draftCreated: stepStatus(saga.draftCreated),
    artifactWritten: stepStatus(saga.artifactWritten),
    pipelineUpserted: stepStatus(saga.pipelineUpserted),
    ideaPromoted: stepStatus(saga.ideaPromoted),
  };
  return {
    draftId: saga.draftId,
    complete: Object.values(steps).every((step) => step === 'completed'),
    steps,
    error,
  };
}

function durableHandoffState(
  saga: TopicHandoffSagaRecord,
): TopicHandoffState {
  const input = requireHandoffInput(saga.input);
  return {
    ...handoffResult(saga, null),
    resumeKey: handoffResumeKey(saga.runId, saga.winnerSubject),
    ideaId: input.ideaId,
    episodeSlug: input.episodeSlug,
    title: input.title,
  };
}

function handoffResumeKey(
  runId: string,
  winnerSubject: string,
): string {
  return createHash('sha256')
    .update(`topic-handoff\u0000${runId}\u0000${winnerSubject}`)
    .digest('hex');
}

async function readPipelineContractMarkdown(
  repoRoot: string,
  ref: string,
): Promise<string> {
  const canonicalRoot = await realpath(repoRoot);
  const target = resolve(canonicalRoot, ref);
  const relativeTarget = relative(canonicalRoot, target);
  if (
    relativeTarget === ''
    || relativeTarget.startsWith('..')
    || isAbsolute(relativeTarget)
  ) {
    throw new Error(`invalid topic brief ref: ${ref}`);
  }

  let current = canonicalRoot;
  for (const segment of ref.split('/').slice(0, -1)) {
    current = join(current, segment);
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`invalid topic brief ref: ${ref}`);
    }
  }
  const canonicalParent = await realpath(dirname(target));
  const relativeParent = relative(canonicalRoot, canonicalParent);
  if (relativeParent.startsWith('..') || isAbsolute(relativeParent)) {
    throw new Error(`invalid topic brief ref: ${ref}`);
  }

  const targetStat = await lstat(target);
  if (targetStat.isSymbolicLink() || !targetStat.isFile()) {
    throw new Error(`invalid topic brief ref: ${ref}`);
  }
  const handle = await open(
    target,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const openedStat = await handle.stat();
    if (!openedStat.isFile()) {
      throw new Error(`invalid topic brief ref: ${ref}`);
    }
    return await handle.readFile('utf8');
  } finally {
    await handle.close();
  }
}

function stepStatus(done: boolean): 'pending' | 'completed' {
  return done ? 'completed' : 'pending';
}

function artifactConflictMessage(
  label: string,
  result: Extract<ArtifactWriteResult, { conflict: true }>,
): string {
  const parked = result.parked?.length
    ? ` Parked: ${result.parked.join(', ')}.`
    : '';
  return `${label} conflicts with ${result.currentHash}.${parked}`;
}

function runSummary(record: TopicRunRecord): TopicRunSummary {
  return {
    id: record.id,
    opId: record.opId,
    state: record.state,
    createdAt: record.createdAt,
  };
}

function requireNonEmpty(value: string, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function requireText(value: string): string {
  return requireNonEmpty(value, 'text');
}

function requireIdeaSource(value: IdeaSource): IdeaSource {
  if (value !== 'inbox' && value !== 'ideate') {
    throw new Error('source must be inbox or ideate');
  }
  return value;
}

function requireIdeaStatus(value: IdeaStatus): IdeaStatus {
  if (!['open', 'promoted', 'discarded'].includes(value)) {
    throw new Error('status must be open, promoted, or discarded');
  }
  return value;
}

function requireGateCheck(value: unknown): GateCheckResult | null {
  if (value === null) return null;
  const check = asRecord(value);
  const verdict = requireGateVerdict(check?.['verdict'], 'latestCheck.verdict');
  const candidates = check?.['gates'];
  if (!Array.isArray(candidates) || candidates.length !== GATE_NAMES.length) {
    throw new Error('latestCheck.gates must contain exactly six gates');
  }

  const found = new Set<TopicGateName>();
  const gates: GateCheckResult['gates'] = candidates.map((candidate, index) => {
    const gate = asRecord(candidate);
    const name = requireGateName(
      gate?.['gate'],
      `latestCheck.gates[${index}].gate`,
    );
    if (found.has(name)) {
      throw new Error(`latestCheck.gates[${index}].gate must be unique`);
    }
    found.add(name);
    return {
      gate: name,
      verdict: requireGateVerdict(
        gate?.['verdict'],
        `latestCheck.gates[${index}].verdict`,
      ),
      reasonMarkdown: requireGateReason(
        gate?.['reasonMarkdown'],
        index,
      ),
    };
  });
  if (GATE_NAMES.some((name) => !found.has(name))) {
    throw new Error('latestCheck.gates must contain each fixed gate');
  }
  return { verdict, gates };
}

function requireGateName(value: unknown, field: string): TopicGateName {
  if (
    typeof value !== 'string'
    || !GATE_NAMES.includes(value as TopicGateName)
  ) {
    throw new Error(`${field} is invalid`);
  }
  return value as TopicGateName;
}

function requireGateVerdict(
  value: unknown,
  field: string,
): GateCheckResult['verdict'] {
  if (value !== 'pass' && value !== 'fail' && value !== 'unknown') {
    throw new Error(`${field} must be pass, fail, or unknown`);
  }
  return value;
}

function requireGateReason(value: unknown, index: number): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `latestCheck.gates[${index}].reasonMarkdown is required`,
    );
  }
  return value;
}

function requirePackageDirections(value: unknown): PackageDirection[] {
  if (!Array.isArray(value)) throw new Error('directions must be an array');
  return value.map((candidate, index) => {
    const direction = asRecord(candidate);
    if (!direction) {
      throw new Error(`directions[${index}] must be an object`);
    }
    return {
      working_title: requiredPackageString(
        direction['working_title'],
        index,
        'working_title',
      ),
      intended_viewer: requiredPackageString(
        direction['intended_viewer'],
        index,
        'intended_viewer',
      ),
      familiar_markdown: requiredPackageString(
        direction['familiar_markdown'],
        index,
        'familiar_markdown',
      ),
      surprise_markdown: requiredPackageString(
        direction['surprise_markdown'],
        index,
        'surprise_markdown',
      ),
      visual_promise_markdown: requiredPackageString(
        direction['visual_promise_markdown'],
        index,
        'visual_promise_markdown',
      ),
      delivered_payoff_markdown: requiredPackageString(
        direction['delivered_payoff_markdown'],
        index,
        'delivered_payoff_markdown',
      ),
      survives_honestly: requiredPackageBoolean(
        direction['survives_honestly'],
        index,
      ),
      reason_markdown: requiredPackageString(
        direction['reason_markdown'],
        index,
        'reason_markdown',
      ),
    };
  });
}

function requiredPackageString(
  value: unknown,
  index: number,
  field: string,
): string {
  if (typeof value !== 'string') {
    throw new Error(`directions[${index}].${field} must be a string`);
  }
  return value;
}

function requiredPackageBoolean(value: unknown, index: number): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(
      `directions[${index}].survives_honestly must be a boolean`,
    );
  }
  return value;
}

function resultError(
  state: OperationState,
  result: OperationServiceResult,
): string {
  if (result.kind === 'failed') {
    return `operation result unavailable: ${result.error}`;
  }
  return `operation ended in ${state} without a topic summary`;
}

async function readPipelineRows(path: string): Promise<PipelineParseResult> {
  let markdown: string;
  try {
    markdown = await readFile(path, 'utf8');
  } catch (error) {
    if (
      error instanceof Error
      && 'code' in error
      && error.code === 'ENOENT'
    ) {
      return { rows: [], diagnostics: [] };
    }
    throw error;
  }
  return parsePipelineMarkdown(markdown);
}

export function parsePipelineMarkdown(
  markdown: string,
): PipelineParseResult {
  if (markdown.trim() === '') return { rows: [], diagnostics: [] };
  const lines = markdown.split(/\r?\n/);
  const header = lines.findIndex((line) => parseTableRow(line) !== undefined);
  const diagnosticLine = header === -1
    ? lines.findIndex((line) => line.trim() !== '')
    : header;
  const headerCells = header === -1
    ? undefined
    : parseTableRow(lines[header]!)
      ?.map((cell) => cell.toLowerCase());
  if (
    header === -1
    || headerCells?.length !== 3
    || headerCells[0] !== 'episode'
    || headerCells[1] !== 'milestone'
    || headerCells[2] !== 'ref'
    || !isTableSeparator(lines[header + 1] ?? '')
  ) {
    return {
      rows: [],
      diagnostics: [{
        code: 'bad-header',
        line: diagnosticLine === -1 ? null : diagnosticLine + 1,
        message:
          'Expected pipeline header "| Episode | Milestone | Ref |".',
      }],
    };
  }

  const rows: ParsedPipelineRow[] = [];
  const diagnostics: PipelineDiagnostic[] = [];
  const seenSlugs = new Set<string>();
  for (let index = header + 2; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (line.trim() === '') break;
    const cells = parseTableRow(line);
    if (!cells || cells.length !== 3) {
      diagnostics.push({
        code: 'bad-row',
        line: index + 1,
        message: 'Pipeline row must be a three-cell Markdown table row.',
      });
      continue;
    }
    if (cells.some((cell) => cell === '')) {
      diagnostics.push({
        code: 'empty-required-cell',
        line: index + 1,
        message: 'Pipeline row has an empty required cell.',
      });
      continue;
    }
    const episodeSlug = cells[0]!;
    if (seenSlugs.has(episodeSlug)) {
      diagnostics.push({
        code: 'duplicate-slug',
        line: index + 1,
        message: `Duplicate pipeline episode slug "${episodeSlug}".`,
      });
      continue;
    }
    seenSlugs.add(episodeSlug);
    rows.push({
      episodeSlug,
      milestone: cells[1]!,
      ref: cells[2]!,
    });
  }
  return { rows, diagnostics };
}

function parseTableRow(line: string): string[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return undefined;
  const cells: string[] = [];
  let cell = '';
  for (let index = 1; index < trimmed.length - 1; index += 1) {
    const character = trimmed[index]!;
    if (character === '\\' && trimmed[index + 1] === '|') {
      cell += '|';
      index += 1;
    } else if (character === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function isTableSeparator(line: string): boolean {
  const cells = parseTableRow(line);
  return cells !== undefined
    && cells.length === 3
    && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function readCreativePhase(doc: Record<string, unknown>): string | null {
  const metadata = asRecord(doc['metadata']);
  const creativeStatus = asRecord(metadata?.['creativeStatus']);
  const phase = creativeStatus?.['phase'];
  return typeof phase === 'string' && phase.trim() !== ''
    ? phase.trim()
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

const PIPELINE_STATES = [
  'idea',
  'candidate',
  'selected',
  'architecture',
  'architecture-approved',
  'prototyping',
  'creative-approved',
  'production',
  'record-ready',
  'recorded',
  'published',
] as const;

function normalizePipelineState(value: string): string {
  switch (value.trim().toLowerCase()) {
    case 'rapid-prototype':
    case 'rapid-prototyping':
    case 'prototype':
      return 'prototyping';
    case 'topic-approved':
      return 'selected';
    default:
      return value.trim().toLowerCase();
  }
}

function furthestPipelineState(left: string, right: string): string {
  const leftIndex = PIPELINE_STATES.indexOf(
    left as typeof PIPELINE_STATES[number],
  );
  const rightIndex = PIPELINE_STATES.indexOf(
    right as typeof PIPELINE_STATES[number],
  );
  if (leftIndex === -1) return right;
  if (rightIndex === -1) return left;
  return rightIndex > leftIndex ? right : left;
}
