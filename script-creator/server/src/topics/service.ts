import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  DraftRecord,
  DraftSummary,
} from '../documents/store.js';
import { parseWhpProgress, type ChecklistState } from '../operations/progress.js';
import type {
  OperationRecord,
  OperationService,
  OperationServiceResult,
} from '../operations/service.js';
import { validateAgainstSchema } from '../schema-validate.js';
import type { CodexEvent, OperationState } from '../types.js';
import {
  type IdeaRecord,
  type IdeaSource,
  type IdeaStatus,
  type TopicRunRecord,
  type TopicStore,
} from './store.js';

const GATE_NAMES = [
  'game_play_centrality',
  'human_revelation',
  'recognized_payoff',
  'evidence_path',
  'production_reality',
  'portfolio_fit',
] as const;

const SCORE_NAMES = [
  'demand',
  'opening',
  'package',
  'satisfaction',
  'whp',
  'evidence',
  'feasibility',
] as const;

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

type JsonSchema = Record<string, unknown>;

function strictObject(
  properties: Record<string, JsonSchema>,
): JsonSchema {
  return {
    type: 'object',
    required: Object.keys(properties),
    additionalProperties: false,
    properties,
  };
}

function scoreSchema(maximum: number): JsonSchema {
  return strictObject({
    score: { type: ['integer', 'null'], minimum: 0, maximum },
    grade: { enum: ['A', 'B', 'C', 'unknown'] },
  });
}

export const TOPIC_SUMMARY_SCHEMA = strictObject({
  candidates: {
    type: 'array',
    items: strictObject({
      subject: { type: 'string' },
      angle_markdown: { type: 'string' },
      gates: {
        type: 'array',
        minItems: 6,
        maxItems: 6,
        items: strictObject({
          gate: { enum: GATE_NAMES },
          verdict: { enum: ['pass', 'fail', 'unknown'] },
          reason_markdown: { type: 'string' },
        }),
      },
      disposition: { type: 'string' },
    }),
  },
  shortlist: {
    type: 'array',
    items: strictObject({
      rank: { type: 'integer', minimum: 1 },
      subject: { type: 'string' },
      angle_markdown: { type: 'string' },
      scores: strictObject({
        demand: scoreSchema(25),
        opening: scoreSchema(15),
        package: scoreSchema(20),
        satisfaction: scoreSchema(15),
        whp: scoreSchema(10),
        evidence: scoreSchema(10),
        feasibility: scoreSchema(5),
      }),
      total: { type: ['integer', 'null'], minimum: 0, maximum: 100 },
      confidence: { enum: ['high', 'medium', 'low'] },
      decisive_risk_markdown: { type: 'string' },
    }),
  },
  packages: {
    type: 'array',
    items: strictObject({
      finalist: { type: 'string' },
      direction: { type: 'string' },
      working_title: { type: 'string' },
      intended_viewer: { type: 'string' },
      familiar_markdown: { type: 'string' },
      surprise_markdown: { type: 'string' },
      visual_promise_markdown: { type: 'string' },
      delivered_payoff_markdown: { type: 'string' },
      survives_honestly: { type: 'boolean' },
      reason_markdown: { type: 'string' },
    }),
  },
  winner: strictObject({
    decision_status: {
      enum: ['winner-selected', 'provisional-winner', 'incomplete'],
    },
    subject: { type: ['string', 'null'] },
    angle_markdown: { type: ['string', 'null'] },
    confidence: { enum: ['high', 'medium', 'low'] },
    why_now_markdown: { type: 'string' },
    strongest_package_markdown: { type: ['string', 'null'] },
  }),
});

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

type TopicOperationService = Pick<
  OperationService,
  'get' | 'events' | 'result'
>;

interface TopicDocumentService {
  listDrafts(): DraftSummary[];
  getDraft(id: string): DraftRecord;
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
  private readonly repoRoot: string;
  private readonly idFactory: () => string;
  private readonly now: () => string;

  constructor(options: {
    store: TopicStore;
    operationService: TopicOperationService;
    documentService: TopicDocumentService;
    repoRoot: string;
    idFactory?: () => string;
    now?: () => string;
  }) {
    this.store = options.store;
    this.operationService = options.operationService;
    this.documentService = options.documentService;
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
    ) {
      throw new Error('idea update is required');
    }
    const current = this.getIdea(id);
    return this.store.updateIdea({
      ...current,
      text: input.text === undefined ? current.text : requireText(input.text),
      source: input.source === undefined
        ? current.source
        : requireIdeaSource(input.source),
      status: input.status === undefined
        ? current.status
        : requireIdeaStatus(input.status),
    });
  }

  deleteIdea(id: string): void {
    if (!this.store.deleteIdea(id)) {
      throw new Error(`idea not found: ${id}`);
    }
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
    return snapshot;
  }

  async pipeline(): Promise<PipelineItem[]> {
    const rows = await readPipelineRows(
      join(this.repoRoot, 'whp-youtube', 'PIPELINE.md'),
    );
    const records = new Map<string, PipelineItem>();
    for (const row of rows) {
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

    return [...records.values()].sort(
      (left, right) => left.episodeSlug.localeCompare(right.episodeSlug),
    );
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

function resultError(
  state: OperationState,
  result: OperationServiceResult,
): string {
  if (result.kind === 'failed') {
    return `operation result unavailable: ${result.error}`;
  }
  return `operation ended in ${state} without a topic summary`;
}

interface PipelineRow {
  episodeSlug: string;
  milestone: string;
  ref: string;
}

async function readPipelineRows(path: string): Promise<PipelineRow[]> {
  let markdown: string;
  try {
    markdown = await readFile(path, 'utf8');
  } catch (error) {
    if (
      error instanceof Error
      && 'code' in error
      && error.code === 'ENOENT'
    ) {
      return [];
    }
    throw error;
  }

  const lines = markdown.split(/\r?\n/);
  const header = lines.findIndex((line, index) => {
    const cells = parseTableRow(line)?.map((cell) => cell.toLowerCase());
    return cells?.[0] === 'episode'
      && cells[1] === 'milestone'
      && cells[2] === 'ref'
      && isTableSeparator(lines[index + 1] ?? '');
  });
  if (header === -1) return [];

  const rows: PipelineRow[] = [];
  for (const line of lines.slice(header + 2)) {
    const cells = parseTableRow(line);
    if (!cells || cells.length < 3) break;
    if (cells[0] === '') continue;
    rows.push({
      episodeSlug: cells[0]!,
      milestone: cells[1]!,
      ref: cells[2]!,
    });
  }
  return rows;
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
    && cells.length >= 3
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
