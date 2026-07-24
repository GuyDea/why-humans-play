import {
  type ArchitectureActionResult,
  type ArchitectureOperationName,
  type ArchitectureSection,
  type ArchitectureState,
  type OperationRecord,
  type OperationResult,
  type SaveArchitectureInput,
  type SavedArchitecture,
  type StreamEventsOptions,
} from '../api/client';
import {
  buildGenerateArchitectureInputs,
  buildReviewArchitectureInputs,
  buildRewriteArchitectureInputs,
  type GenerateArchitectureContext,
} from './inputs';

export const ARCHITECTURE_SECTIONS = [
  { key: 'package-and-audience', title: 'Package and audience' },
  { key: 'central-question', title: 'Central question' },
  { key: 'core-answer', title: 'Core answer' },
  { key: 'viewer-belief-shift', title: 'Viewer belief shift' },
  { key: 'insight-ladder', title: 'Insight ladder' },
  {
    key: 'phenomenon-and-paradox-map',
    title: 'Phenomenon and paradox map',
  },
  { key: 'earned-reframe', title: 'Earned reframe' },
  { key: 'real-world-evidence-map', title: 'Real-world evidence map' },
  { key: 'practical-payoff', title: 'Practical payoff' },
  { key: 'final-lesson', title: 'Final lesson' },
  { key: 'scope-boundary', title: 'Scope boundary' },
] as const;

export type ArchitectureSectionKey =
  typeof ARCHITECTURE_SECTIONS[number]['key'];

export interface ArchitectureProposalConflict {
  base: string;
  current: string;
  proposed: string;
}

export interface ArchitectureProposal {
  id: string;
  key: string;
  title: string;
  section: ArchitectureSection;
  baseRevisionSeq: number;
  baseMd: string;
  sourceOpId: string;
  kind: 'generate' | 'rewrite';
  conflict: ArchitectureProposalConflict | null;
}

export interface ArchitectureFinding {
  sectionKey: string;
  severity: string;
  findingMarkdown: string;
}

export interface ArchitectureConflictBody {
  error: string;
  current?: ArchitectureState;
  currentHash?: string | 'absent';
  parked?: string[];
  steps?: ArchitectureActionResult['steps'];
  state?: ArchitectureState;
}

export interface ArchitectureModelClient {
  getArchitecture(draftId: string): Promise<ArchitectureState>;
  saveArchitecture(
    draftId: string,
    input: SaveArchitectureInput,
  ): Promise<SavedArchitecture>;
  approveArchitecture(
    draftId: string,
    input: { expectedRevisionSeq: number },
  ): Promise<ArchitectureActionResult>;
  resumeArchitectureSaga(
    draftId: string,
    input: { resumeKey: string },
  ): Promise<ArchitectureActionResult>;
  reopenArchitecture(
    draftId: string,
    input: { expectedRevisionSeq: number; confirmed: true },
  ): Promise<ArchitectureActionResult>;
  submitDraftOp(
    draftId: string,
    operation: ArchitectureOperationName,
    inputs: unknown,
  ): Promise<{ id: string }>;
  streamEvents(
    id: string,
    options: StreamEventsOptions,
  ): Promise<void>;
  getOp(id: string): Promise<OperationRecord>;
  getResult(id: string): Promise<OperationResult>;
}

interface CompletedOperation {
  id: string;
  operation: OperationRecord;
  result: OperationResult;
}

export class ArchitectureModel {
  state: ArchitectureState | null = null;
  proposals: ArchitectureProposal[] = [];
  findings: ArchitectureFinding[] = [];
  guardrails: string[] = [];
  failure: string | null = null;
  actionConflict: ArchitectureConflictBody | null = null;
  operationStatus = 'idle';

  constructor(
    readonly draftId: string,
    private readonly client: ArchitectureModelClient,
  ) {}

  async load(): Promise<void> {
    this.failure = null;
    try {
      this.state = cloneState(
        await this.client.getArchitecture(this.draftId),
      );
    } catch (error) {
      this.failure = errorMessage(error);
    }
  }

  private async refreshRevisionState(): Promise<ArchitectureState> {
    const fresh = cloneState(
      await this.client.getArchitecture(this.draftId),
    );
    this.state = fresh;
    return fresh;
  }

  async generate<TopicBrief, ApprovedLessons, UserConstraints>(
    context: GenerateArchitectureContext<
      TopicBrief,
      ApprovedLessons,
      UserConstraints
    >,
  ): Promise<void> {
    this.proposals = [];
    const completed = await this.execute(
      'generate-architecture',
      buildGenerateArchitectureInputs(context),
    );
    if (!completed) return;
    if (completed.result.kind !== 'raw') {
      this.failure = 'Generate architecture did not return Markdown.';
      return;
    }
    const state = this.requireState();
    const sections = splitArchitecture(completed.result.markdown);
    this.proposals = sections.map((section, index) =>
      this.proposal(
        completed.id,
        'generate',
        section,
        state,
        index,
      ));
  }

  async review<TopicBrief>(
    context: { topicBrief: TopicBrief },
  ): Promise<void> {
    this.findings = [];
    const state = this.requireState();
    const completed = await this.execute(
      'review-architecture',
      buildReviewArchitectureInputs({
        architectureMd: joinArchitecture(state.sections),
        topicBrief: context.topicBrief,
      }),
    );
    if (!completed) return;
    const frame = schemaFrame(completed.result);
    if (!frame) {
      this.failure = 'Review architecture returned an invalid result.';
      return;
    }
    if (this.captureGuardrail(frame)) return;
    const findings = frame['findings'];
    if (!Array.isArray(findings)) {
      this.failure = 'Review architecture did not return findings.';
      return;
    }
    const parsed = findings.map(parseFinding);
    if (parsed.some((finding) => finding === null)) {
      this.failure = 'Review architecture returned an invalid finding.';
      return;
    }
    this.findings = parsed as ArchitectureFinding[];
  }

  async refine<TopicBrief>(
    sectionKey: string,
    context: {
      topicBrief: TopicBrief;
      userInstruction: string;
    },
  ): Promise<void> {
    const state = this.requireState();
    const section = state.sections.find(({ key }) => key === sectionKey);
    if (!section) {
      this.failure = `Architecture section not found: ${sectionKey}`;
      return;
    }
    const completed = await this.execute(
      'rewrite-architecture-section',
      buildRewriteArchitectureInputs({
        sectionKey,
        sectionMarkdown: section.md,
        architectureMd: joinArchitecture(state.sections),
        topicBrief: context.topicBrief,
        userInstruction: context.userInstruction,
      }),
    );
    if (!completed) return;
    const frame = schemaFrame(completed.result);
    if (!frame) {
      this.failure = 'Rewrite architecture section returned an invalid result.';
      return;
    }
    if (this.captureGuardrail(frame)) return;
    const replacement = frame['replacement_markdown'];
    if (typeof replacement !== 'string') {
      this.failure = 'Rewrite architecture section did not return Markdown.';
      return;
    }
    const parsed = splitArchitecture(replacement);
    if (parsed.length !== 1 || parsed[0]?.key !== sectionKey) {
      this.failure =
        'Rewrite result must contain exactly the requested architecture section.';
      return;
    }
    this.proposals = [
      ...this.proposals.filter(({ key }) => key !== sectionKey),
      this.proposal(completed.id, 'rewrite', parsed[0], state, 0),
    ];
  }

  async accept(idOrKey: string): Promise<void> {
    const proposal = this.findProposal(idOrKey);
    if (!proposal) return;
    const state = this.requireState();
    const sections = replaceOrAppend(state.sections, proposal.section);
    try {
      const saved = await this.client.saveArchitecture(this.draftId, {
        expectedRevisionSeq: proposal.baseRevisionSeq,
        sections,
        opId: proposal.sourceOpId,
        disposition: 'architecture-proposal-accepted',
      });
      this.applySavedState(saved.state);
      this.proposals = this.proposals.filter(
        ({ id }) => id !== proposal.id,
      );
      this.rebaseProposals();
    } catch (error) {
      this.captureSaveConflict(error, [proposal]);
    }
  }

  async acceptAll(): Promise<void> {
    if (this.proposals.length === 0) return;
    const state = this.requireState();
    const sections = this.proposals.reduce(
      (current, proposal) => replaceOrAppend(current, proposal.section),
      state.sections.map((section) => ({ ...section })),
    );
    const sourceIds = new Set(
      this.proposals.map(({ sourceOpId }) => sourceOpId),
    );
    try {
      const saved = await this.client.saveArchitecture(this.draftId, {
        expectedRevisionSeq: state.revisionSeq,
        sections,
        opId: sourceIds.size === 1 ? [...sourceIds][0]! : null,
        disposition: 'architecture-proposals-accepted',
      });
      this.applySavedState(saved.state);
      this.proposals = [];
    } catch (error) {
      this.captureSaveConflict(error, this.proposals);
    }
  }

  reject(idOrKey: string): void {
    const proposal = this.findProposal(idOrKey);
    if (!proposal) return;
    this.proposals = this.proposals.filter(({ id }) => id !== proposal.id);
  }

  findingsFor(sectionKey: string): ArchitectureFinding[] {
    return this.findings.filter(
      ({ sectionKey: key }) => key === sectionKey,
    );
  }

  async approve(): Promise<void> {
    this.requireState();
    this.actionConflict = null;
    this.failure = null;
    try {
      const state = await this.refreshRevisionState();
      const result = await this.client.approveArchitecture(this.draftId, {
        expectedRevisionSeq: state.revisionSeq,
      });
      this.state = cloneState(result.state);
    } catch (error) {
      this.captureActionConflict(error);
    }
  }

  async reopen(confirmed: boolean): Promise<void> {
    if (!confirmed) return;
    this.requireState();
    this.actionConflict = null;
    this.failure = null;
    try {
      const state = await this.refreshRevisionState();
      const result = await this.client.reopenArchitecture(this.draftId, {
        expectedRevisionSeq: state.revisionSeq,
        confirmed: true,
      });
      this.state = cloneState(result.state);
    } catch (error) {
      this.captureActionConflict(error);
    }
  }

  async resumeSaga(): Promise<void> {
    const saga = this.requireState().pendingSaga;
    if (!saga) return;
    this.actionConflict = null;
    this.failure = null;
    try {
      const result = await this.client.resumeArchitectureSaga(
        this.draftId,
        { resumeKey: saga.resumeKey },
      );
      this.state = cloneState(result.state);
    } catch (error) {
      this.captureActionConflict(error);
    }
  }

  private async execute(
    operation: ArchitectureOperationName,
    inputs: unknown,
  ): Promise<CompletedOperation | null> {
    this.failure = null;
    this.guardrails = [];
    this.operationStatus = `Running ${operation}`;
    try {
      const { id } = await this.client.submitDraftOp(
        this.draftId,
        operation,
        inputs,
      );
      await this.client.streamEvents(id, {
        onEvent: () => undefined,
        onDone: () => undefined,
        onError: () => undefined,
      });
      const [operationRecord, result] = await Promise.all([
        this.client.getOp(id),
        this.client.getResult(id),
      ]);
      if (result.kind === 'failed') {
        this.failure = result.error;
        return null;
      }
      if (
        operationRecord.state !== 'completed'
        || result.kind === 'pending'
      ) {
        this.failure = operationRecord.error
          ?? `${operation} did not complete.`;
        return null;
      }
      return { id, operation: operationRecord, result };
    } catch (error) {
      this.failure = errorMessage(error);
      return null;
    } finally {
      this.operationStatus = this.failure ? 'Operation failed' : 'Ready';
    }
  }

  private proposal(
    sourceOpId: string,
    kind: ArchitectureProposal['kind'],
    section: ArchitectureSection,
    state: ArchitectureState,
    index: number,
  ): ArchitectureProposal {
    return {
      id: `${sourceOpId}:${section.key}:${index}`,
      key: section.key,
      title: section.title,
      section: { ...section },
      baseRevisionSeq: state.revisionSeq,
      baseMd: state.sections.find(({ key }) => key === section.key)?.md ?? '',
      sourceOpId,
      kind,
      conflict: null,
    };
  }

  private findProposal(idOrKey: string): ArchitectureProposal | undefined {
    return this.proposals.find(({ id }) => id === idOrKey)
      ?? this.proposals.find(({ key }) => key === idOrKey);
  }

  private requireState(): ArchitectureState {
    if (!this.state) throw new Error('Architecture state is not loaded.');
    return this.state;
  }

  private captureGuardrail(frame: Record<string, unknown>): boolean {
    const status = frame['status'];
    if (status !== 'declined' && status !== 'narrowed') return false;
    const markdown = frame['guardrail_markdown'];
    if (typeof markdown === 'string' && markdown.trim() !== '') {
      this.guardrails = [markdown];
    }
    return true;
  }

  private captureSaveConflict(
    error: unknown,
    affected: readonly ArchitectureProposal[],
  ): void {
    const body = conflictBody(error);
    const current = body?.current;
    if (!current) {
      this.failure = errorMessage(error);
      return;
    }
    this.state = cloneState(current);
    const ids = new Set(affected.map(({ id }) => id));
    this.proposals = this.proposals.map((proposal) =>
      ids.has(proposal.id)
        ? {
            ...proposal,
            conflict: {
              base: proposal.baseMd,
              current: current.sections.find(
                ({ key }) => key === proposal.key,
              )?.md ?? '',
              proposed: proposal.section.md,
            },
          }
        : proposal);
  }

  captureActionConflict(error: unknown): boolean {
    const body = conflictBody(error);
    if (!body) {
      this.failure = errorMessage(error);
      return false;
    }
    this.actionConflict = body;
    const current = body.current ?? body.state;
    if (current) this.state = cloneState(current);
    return current !== undefined;
  }

  private applySavedState(state: ArchitectureState): void {
    this.state = cloneState(state);
    this.failure = null;
    this.actionConflict = null;
  }

  private rebaseProposals(): void {
    const state = this.requireState();
    this.proposals = this.proposals.map((proposal) => ({
      ...proposal,
      baseRevisionSeq: state.revisionSeq,
      baseMd: state.sections.find(({ key }) => key === proposal.key)?.md ?? '',
      conflict: null,
    }));
  }
}

export function splitArchitecture(markdown: string): ArchitectureSection[] {
  if (markdown === '') return [];
  const headings = [...markdown.matchAll(/^### ([^\r\n]+)(?:\r?\n|$)/gmu)];
  const slices: Array<{ title: string; md: string }> = [];
  const firstHeading = headings[0]?.index;
  if (firstHeading === undefined || firstHeading > 0) {
    slices.push({
      title: '',
      md: markdown.slice(0, firstHeading),
    });
  }
  for (const [index, heading] of headings.entries()) {
    const start = heading.index;
    const end = headings[index + 1]?.index ?? markdown.length;
    slices.push({
      title: heading[1]!,
      md: markdown.slice(start, end),
    });
  }

  const fixedByTitle = new Map<string, ArchitectureSectionKey>(
    ARCHITECTURE_SECTIONS.map(({ key, title }) => [title, key]),
  );
  const seen = new Set<string>();
  const opaqueOccurrences = new Map<string, number>();
  return slices.map(({ title, md }) => {
    const fixedKey = fixedByTitle.get(title);
    if (fixedKey && !seen.has(fixedKey)) {
      seen.add(fixedKey);
      return { key: fixedKey, title, md };
    }
    return {
      key: opaqueKey(title, opaqueOccurrences),
      title,
      md,
    };
  });
}

export function joinArchitecture(
  sections: readonly ArchitectureSection[],
): string {
  return sections.map(({ md }) => md).join('');
}

function replaceOrAppend(
  sections: readonly ArchitectureSection[],
  replacement: ArchitectureSection,
): ArchitectureSection[] {
  const index = sections.findIndex(({ key }) => key === replacement.key);
  if (index === -1) {
    return [...sections.map((section) => ({ ...section })), {
      ...replacement,
    }];
  }
  return sections.map((section, sectionIndex) =>
    sectionIndex === index ? { ...replacement } : { ...section });
}

function parseFinding(value: unknown): ArchitectureFinding | null {
  if (!record(value)) return null;
  const sectionKey = value['section_key'];
  const severity = value['severity'];
  const findingMarkdown = value['finding_markdown'];
  return typeof sectionKey === 'string'
      && typeof severity === 'string'
      && typeof findingMarkdown === 'string'
    ? { sectionKey, severity, findingMarkdown }
    : null;
}

function schemaFrame(result: OperationResult): Record<string, unknown> | null {
  return result.kind === 'schema' && record(result.value)
    ? result.value
    : null;
}

function conflictBody(error: unknown): ArchitectureConflictBody | null {
  if (!record(error) || typeof error['status'] !== 'number') return null;
  const body = error['body'];
  return record(body)
      && typeof body['error'] === 'string'
      && (
        error['status'] === 409
        || record(body['state'])
        || record(body['current'])
      )
    ? body as unknown as ArchitectureConflictBody
    : null;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneState(state: ArchitectureState): ArchitectureState {
  return {
    ...state,
    sections: state.sections.map((section) => ({ ...section })),
    pendingSaga: state.pendingSaga
      ? {
          ...state.pendingSaga,
          steps: { ...state.pendingSaga.steps },
        }
      : null,
  };
}

function opaqueKey(
  title: string,
  occurrences: Map<string, number>,
): string {
  let hash = 2_166_136_261;
  for (const character of title) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  const digest = (hash >>> 0).toString(16).padStart(8, '0');
  const occurrence = (occurrences.get(digest) ?? 0) + 1;
  occurrences.set(digest, occurrence);
  return occurrence === 1
    ? `opaque-${digest}`
    : `opaque-${digest}-${occurrence}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'Architecture request failed.';
}
