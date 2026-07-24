export type OperationName =
  | 'generate-scoped'
  | 'generate-episode'
  | 'generate-architecture'
  | 'review'
  | 'review-architecture'
  | 'rewrite-selection'
  | 'rewrite-architecture-section'
  | 'generate-alternatives'
  | 'promote'
  | 'ideate'
  | 'quick-gate-check'
  | 'package-test'
  | 'full-topic-run'
  | 'handoff-preview'
  | 'distill';

export type OperationState =
  | 'queued'
  | 'running'
  | 'interrupted'
  | 'cancelling'
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'invalid-output'
  | 'timed-out';

export interface OperationRecord {
  id: string;
  operation: OperationName;
  state: OperationState;
  stalled: boolean;
  envelopeJson: string;
  jobDir: string;
  threadId: string | null;
  retryOf: string | null;
  resumedFrom: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningOutputTokens: number | null;
  usageAvailable: 0 | 1;
  error: string | null;
  inputs?: unknown;
  operationLessons?: OperationLessonLink[];
}

export interface OperationLessonLink {
  operationId: string;
  lessonId: string;
  lessonVersion: number;
  contentHash: string;
  createdAt: string;
}

export interface OperationSummary {
  id: string;
  operation: OperationName;
  state: OperationState;
  createdAt: string;
  finishedAt: string | null;
  stalled: boolean;
  usageAvailable: 0 | 1;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningOutputTokens: number | null;
}

export interface OperationListResponse {
  operations: OperationSummary[];
}

export type IdeaSource = 'inbox' | 'ideate';
export type IdeaStatus = 'open' | 'promoted' | 'discarded';

export interface GateCheckResult {
  verdict: 'pass' | 'fail' | 'unknown';
  gates: Array<{
    gate: TopicGateName;
    verdict: 'pass' | 'fail' | 'unknown';
    reasonMarkdown: string;
  }>;
}

export interface IdeaRecord {
  id: string;
  text: string;
  source: IdeaSource;
  status: IdeaStatus;
  latestCheck: GateCheckResult | null;
  createdAt: string;
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
  latestCheck?: GateCheckResult | null;
  latestCheckOpId?: string;
}

export interface PackageDirection {
  working_title: string;
  intended_viewer: string;
  familiar_markdown: string;
  surprise_markdown: string;
  visual_promise_markdown: string;
  delivered_payoff_markdown: string;
  survives_honestly: boolean;
  reason_markdown: string;
}

export interface PackageTestRecord {
  id: string;
  ideaId: string;
  opId: string;
  directions: PackageDirection[];
  createdAt: string;
  selectedDirectionIndex?: number | null;
  selectedAt?: string | null;
}

export interface CreatePackageTestInput {
  opId: string;
  directions: PackageDirection[];
}

export type TopicGateName =
  | 'game_play_centrality'
  | 'human_revelation'
  | 'recognized_payoff'
  | 'evidence_path'
  | 'production_reality'
  | 'portfolio_fit';

export type TopicScoreName =
  | 'demand'
  | 'opening'
  | 'package'
  | 'satisfaction'
  | 'whp'
  | 'evidence'
  | 'feasibility';

export type TopicEvidenceGrade = 'A' | 'B' | 'C' | 'unknown';

export interface TopicSummary {
  candidates: Array<{
    subject: string;
    angle_markdown: string;
    gates: Array<{
      gate: TopicGateName;
      verdict: 'pass' | 'fail' | 'unknown';
      reason_markdown: string;
    }>;
    disposition: string;
  }>;
  shortlist: Array<{
    rank: number;
    subject: string;
    angle_markdown: string;
    scores: Record<TopicScoreName, {
      score: number | null;
      grade: TopicEvidenceGrade;
    }>;
    total: number | null;
    confidence: 'high' | 'medium' | 'low';
    decisive_risk_markdown: string;
  }>;
  packages: Array<PackageDirection & {
    finalist: string;
    direction: string;
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

export interface TopicRunSummary {
  id: string;
  opId: string;
  state: OperationState;
  createdAt: string;
}

export interface TopicRunSnapshot {
  state: OperationState;
  progress: Array<{
    id: string;
    status: 'pending' | 'active' | 'done' | 'unknown';
    text: string;
  }>;
  summary?: TopicSummary | null;
  summaryError?: string;
  reportMd?: string;
  handoff?: TopicHandoffState;
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

export type TopicHandoffCommand =
  | TopicHandoffInput
  | TopicHandoffResumeInput;

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

export type OperationResult =
  | { kind: 'schema'; value: unknown; guardrail: string | null }
  | { kind: 'raw'; markdown: string }
  | { kind: 'failed'; error: string }
  | { kind: 'pending' };

export interface DraftDocument {
  [key: string]: unknown;
}

export type DraftFormat = 'annotated' | 'narration';

export type ArchitectureOperationName =
  | 'generate-architecture'
  | 'review-architecture'
  | 'rewrite-architecture-section';

export interface ArchitectureSection {
  key: string;
  title: string;
  md: string;
}

export interface ArchitectureState {
  sections: ArchitectureSection[];
  approvedMd: string | null;
  approvedAt: string | null;
  revisionSeq: number;
  narrationReconciliationRequired: boolean;
  pendingSaga: ArchitectureSagaState | null;
}

export interface ArchitectureSagaState {
  kind: 'approve' | 'reopen';
  resumeKey: string;
  steps: ArchitectureActionSteps;
  createdAt: string;
  updatedAt: string;
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

export interface DraftSummary {
  id: string;
  episodeSlug: string;
  title: string;
  format: DraftFormat;
  updatedAt: string;
}

export interface DraftRecord extends DraftSummary {
  doc: DraftDocument;
  approvedNarrationMd?: string | null;
  approvedNarrationAt?: string | null;
  approvedNarrationRevisionSeq?: number | null;
  narrationArtifactHash?: string | null;
}

export interface RevisionRecord {
  id: string;
  draftId: string;
  seq: number;
  opId: string | null;
  disposition: string;
  doc: DraftDocument;
  createdAt: string;
}

export interface NarrationProposalRecord {
  draftId: string;
  operationId: string;
  state: 'pending';
  createdAt: string;
  resolvedAt: null;
  acceptedRevisionPresent: boolean;
}

export interface CreateDraftInput {
  episodeSlug: string;
  title: string;
  format: DraftFormat;
  doc: DraftDocument;
}

export interface SaveDraftInput {
  title?: string;
  format?: DraftFormat;
  doc: DraftDocument;
  opId?: string | null;
  disposition?: string;
}

export interface SavedDraft {
  draft: DraftRecord;
  revision: RevisionRecord;
}

export type ArtifactExpectedState =
  | { expectNew: true }
  | { expectedHash: string };

export type ArtifactWriteResult =
  | { conflict: false; hash: string }
  | {
    conflict: true;
    currentHash: string | 'absent';
    parked?: string[];
  };

export interface PipelineRowInput {
  episodeSlug: string;
  milestone: string;
  ref: string;
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

export interface PipelineDiagnostic {
  code:
    | 'bad-header'
    | 'bad-row'
    | 'empty-required-cell'
    | 'duplicate-slug';
  line: number | null;
  message: string;
}

export interface PipelineResponse {
  rows: PipelineItem[];
  diagnostics: PipelineDiagnostic[];
}

export interface TopicBrief {
  ref: string;
  markdown: string;
}

export interface ValidatorDiagnostic {
  message: string;
  line: number | null;
}

export interface ValidatorResult {
  ok: boolean;
  errors: ValidatorDiagnostic[];
  path: string;
  hash: string;
}

export type PromotionState =
  | 'running'
  | 'output-ready'
  | 'validation-required'
  | 'complete'
  | 'failed';

export interface PromotionRecord {
  draftId: string;
  operationId: string;
  state: PromotionState;
  targetPath: string;
  targetHash: string | null;
  importRevisionId?: string;
  validationHash: string | null;
  error: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type WorkspaceChoice = 'new-branch' | 'current-branch';

export type MilestoneKind =
  | 'topic-selection'
  | 'architecture-approval'
  | 'architecture-reopen'
  | 'creative-narration-approval'
  | 'production-promotion';

export interface EpisodeWorkspace {
  draftId: string;
  episodeSlug: string;
  choice: WorkspaceChoice;
  branch: string;
  worktreePath: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceRecommendation {
  defaultBranch: string;
  taskName: string;
  branch: string;
  worktreePath: string;
}

export interface MilestoneStatus {
  workspace: EpisodeWorkspace | null;
  recommendation: WorkspaceRecommendation;
  dirtyFiles: string[];
}

export interface MilestoneRecord {
  id: string;
  draftId: string;
  episodeSlug: string;
  kind: MilestoneKind;
  files: string[];
  commitMessage: string;
  sourceHashes: Record<string, string>;
  baseCommitHash: string;
  reconciliationRequired: boolean;
  state: 'pending' | 'committed' | 'superseded';
  resultingCommitHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingMilestone extends MilestoneRecord {
  diffSummary: string;
}

export interface LearningSessionRecord {
  id: string;
  draftId: string;
  startCursor: number;
  endCursor: number | null;
  createdAt: string;
  closedAt: string | null;
}

export interface LearningDecision {
  id: string;
  draftId: string;
  seq: number;
  kind: string;
  disposition: string;
  sourceTimestamp: string;
  createdAt: string;
  note: string | null;
  context: {
    source: {
      type: string;
      id: string;
      disposition: string;
    };
    [key: string]: unknown;
  };
}

export interface DecisionPage {
  decisions: LearningDecision[];
  nextCursor: number | null;
}

export type DistillationRunState =
  | 'frozen'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted'
  | 'ingested'
  | 'no-op';

export interface DistillationRunRecord {
  id: string;
  draftId: string;
  sessionId: string;
  trigger: 'on-demand' | 'session-end';
  state: DistillationRunState;
  operationId: string | null;
  resumeKey: string;
  guardrailMarkdown: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  decisions: Array<{ decisionId: string; snapshot: unknown }>;
  lessons: Array<{ lessonId: string; snapshot: unknown }>;
}

export type LessonClassification = 'episode-local' | 'durable';
export type LessonState =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'retired'
  | 'superseded'
  | 'approved-pending-reconcile'
  | 'applied'
  | 'retirement-pending'
  | 'supersession-pending';

export interface LessonEvidenceView {
  id: string;
  status: 'resolved' | 'stale';
  decision: LearningDecision | null;
}

export interface LessonReconciliation {
  id: string;
  lessonId: string;
  kind: 'apply' | 'retire' | 'supersede';
  state: 'prepared' | 'awaiting-reconciliation' | 'verified';
  resumeKey: string;
  preparedMarkdown: string;
  repositoryCommit: string | null;
  paths: string[];
  anchors: string[];
  contentHashes: string[];
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
}

export type LessonRepositoryProvenance = {
  status: 'resolved';
  lesson_markdown: string;
  path: string;
  anchor: string;
  content_hash: string;
} | {
  status: 'unresolved';
  reason: string;
  path: string | null;
  anchor: string | null;
  content_hash: string | null;
};

export interface LessonDetail {
  id: string;
  draftId: string;
  distillationRunId: string | null;
  classification: LessonClassification;
  state: LessonState;
  proposedMarkdown: string | null;
  reviewedMarkdown: string | null;
  rationaleMarkdown: string;
  proposedTarget: string | null;
  supersedesLessonId: string | null;
  version: number;
  repositoryCommit: string | null;
  repositoryPath: string | null;
  repositoryAnchor: string | null;
  repositoryContentHash: string | null;
  createdAt: string;
  updatedAt: string;
  evidenceIds: string[];
  evidence: LessonEvidenceView[];
  reconciliation: LessonReconciliation | null;
  reconciliationHistory: LessonReconciliation[];
  currentMarkdown: string | null;
  repositoryProvenance: LessonRepositoryProvenance | null;
}

export type ChooseWorkspaceInput =
  | { choice: 'new-branch'; taskName: string }
  | { choice: 'current-branch'; confirmed: true };

export interface SseFrame {
  id: string;
  event: string;
  data: string;
}

export interface StreamEventsOptions {
  lastEventId?: string;
  onEvent(frame: SseFrame): void | Promise<void>;
  onDone(): void | Promise<void>;
  onError(error: unknown): void | Promise<void>;
}

export type NonceProvider = () => string | null;

export class DaemonClientError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(errorMessage(status, body));
    this.name = 'DaemonClientError';
  }
}

const INITIAL_RECONNECT_MS = 250;
const MAX_RECONNECT_MS = 5_000;

export class DaemonClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly nonceProvider: NonceProvider,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async submitOp(
    operation: OperationName,
    inputs: unknown,
  ): Promise<{ id: string }> {
    return this.request('/api/ops', {
      method: 'POST',
      body: JSON.stringify({ operation, inputs }),
    });
  }

  async listOps(): Promise<OperationListResponse> {
    return this.request('/api/ops');
  }

  async getOp(id: string): Promise<OperationRecord> {
    return this.request(`/api/ops/${encodeURIComponent(id)}`);
  }

  async getResult(id: string): Promise<OperationResult> {
    return this.request(`/api/ops/${encodeURIComponent(id)}/result`);
  }

  async cancel(id: string): Promise<{ id: string }> {
    return this.request(`/api/ops/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
  }

  async resume(id: string, inputs: unknown): Promise<{ id: string }> {
    return this.request(`/api/ops/${encodeURIComponent(id)}/resume`, {
      method: 'POST',
      body: JSON.stringify({ inputs }),
    });
  }

  async listIdeas(): Promise<IdeaRecord[]> {
    return this.request('/api/ideas');
  }

  async createIdea(input: CreateIdeaInput): Promise<IdeaRecord> {
    return this.request('/api/ideas', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateIdea(
    id: string,
    input: UpdateIdeaInput,
  ): Promise<IdeaRecord> {
    return this.request(`/api/ideas/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteIdea(id: string): Promise<void> {
    await this.request(`/api/ideas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async listPackageTests(id: string): Promise<PackageTestRecord[]> {
    return this.request(
      `/api/ideas/${encodeURIComponent(id)}/package-tests`,
    );
  }

  async createPackageTest(
    id: string,
    input: CreatePackageTestInput,
  ): Promise<PackageTestRecord> {
    return this.request(
      `/api/ideas/${encodeURIComponent(id)}/package-tests`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async pickPackageDirection(
    ideaId: string,
    packageTestId: string,
    directionIndex: number,
  ): Promise<PackageTestRecord> {
    return this.request(
      `/api/ideas/${encodeURIComponent(
        ideaId,
      )}/package-tests/${encodeURIComponent(packageTestId)}/pick`,
      {
        method: 'POST',
        body: JSON.stringify({ directionIndex }),
      },
    );
  }

  async registerTopicRun(opId: string): Promise<TopicRunSummary> {
    return this.request('/api/topic-runs', {
      method: 'POST',
      body: JSON.stringify({ opId }),
    });
  }

  async listTopicRuns(): Promise<TopicRunSummary[]> {
    return this.request('/api/topic-runs');
  }

  async getTopicRun(id: string): Promise<TopicRunSnapshot> {
    return this.request(`/api/topic-runs/${encodeURIComponent(id)}`);
  }

  async handoffTopicRun(
    id: string,
    input: TopicHandoffCommand,
  ): Promise<TopicHandoffResult> {
    return this.request(
      `/api/topic-runs/${encodeURIComponent(id)}/handoff`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async streamEvents(
    id: string,
    options: StreamEventsOptions,
  ): Promise<void> {
    let lastEventId = options.lastEventId;
    let reconnectMs = INITIAL_RECONNECT_MS;

    for (;;) {
      try {
        const headers = this.authHeaders();
        headers.set('accept', 'text/event-stream');
        if (lastEventId) headers.set('last-event-id', lastEventId);

        const response = await fetch(
          `${this.baseUrl}/api/ops/${encodeURIComponent(id)}/events`,
          { headers },
        );
        if (!response.ok) throw await responseError(response);
        if (!response.body) {
          throw new Error('SSE response did not include a readable body');
        }

        const outcome = await consumeSse(response.body, async (frame) => {
          if (frame.id) lastEventId = frame.id;
          if (frame.event === 'done') {
            await options.onDone();
            return false;
          }
          await options.onEvent(frame);
          return true;
        });
        if (outcome === 'stopped') return;
        throw new Error('SSE stream ended before done');
      } catch (error) {
        await options.onError(error);
        await delay(reconnectMs);
        reconnectMs = Math.min(reconnectMs * 2, MAX_RECONNECT_MS);
      }
    }
  }

  async list(): Promise<DraftSummary[]> {
    return this.request('/api/drafts');
  }

  async create(input: CreateDraftInput): Promise<DraftRecord> {
    return this.request('/api/drafts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async get(id: string): Promise<DraftRecord> {
    return this.request(`/api/drafts/${encodeURIComponent(id)}`);
  }

  async save(id: string, input: SaveDraftInput): Promise<SavedDraft> {
    return this.request(`/api/drafts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async getArchitecture(id: string): Promise<ArchitectureState> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/architecture`,
    );
  }

  async saveArchitecture(
    id: string,
    input: SaveArchitectureInput,
  ): Promise<SavedArchitecture> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/architecture`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
    );
  }

  async approveArchitecture(
    id: string,
    input: { expectedRevisionSeq: number },
  ): Promise<ArchitectureActionResult> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/architecture/approve`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async resumeArchitectureSaga(
    id: string,
    input: { resumeKey: string },
  ): Promise<ArchitectureActionResult> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/architecture/resume`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async reopenArchitecture(
    id: string,
    input: { expectedRevisionSeq: number; confirmed: true },
  ): Promise<ArchitectureActionResult> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/architecture/reopen`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async getMilestoneStatus(id: string): Promise<MilestoneStatus> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/milestones/status`,
    );
  }

  async chooseMilestoneWorkspace(
    id: string,
    input: ChooseWorkspaceInput,
  ): Promise<EpisodeWorkspace> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/milestones/workspace`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async listPendingMilestones(
    id: string,
  ): Promise<{ milestones: PendingMilestone[] }> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/milestones`,
    );
  }

  async commitMilestone(
    id: string,
    kind: MilestoneKind,
    input: { pendingMilestoneId: string; confirmed: true },
  ): Promise<MilestoneRecord> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/milestones/${
        encodeURIComponent(kind)
      }/commit`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async prepareNarrationApproval(
    id: string,
    input: {
      expectedRevisionSeq: number;
      expectedNarrationMd: string;
    },
  ): Promise<{ settledExportToken: string }> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/narration/settled-export`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async markNarrationReconciled(
    id: string,
    input: { expectedRevisionSeq: number; confirmed: true },
  ): Promise<ArchitectureState> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/narration/reconcile`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async resolveNarrationProposal(
    draftId: string,
    operationId: string,
    decision: 'accepted' | 'rejected',
    reason?: string | null,
  ): Promise<{
    draftId: string;
    operationId: string;
    state: 'accepted' | 'rejected' | 'dismissed';
  }> {
    return this.request(
      `/api/drafts/${encodeURIComponent(
        draftId,
      )}/narration/proposals/${encodeURIComponent(
        operationId,
      )}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(
          reason === undefined ? { decision } : { decision, reason },
        ),
      },
    );
  }

  async rejectArchitectureProposal(
    draftId: string,
    operationId: string,
    reason: string | null,
  ): Promise<{ rejected: true }> {
    return this.request(
      `/api/drafts/${encodeURIComponent(
        draftId,
      )}/architecture/proposals/${encodeURIComponent(
        operationId,
      )}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
    );
  }

  async listNarrationProposals(
    draftId: string,
  ): Promise<{ proposals: NarrationProposalRecord[] }> {
    return this.request(
      `/api/drafts/${encodeURIComponent(
        draftId,
      )}/narration/proposals`,
    );
  }

  async approveNarration(
    id: string,
    input: {
      expectedRevisionSeq: number;
      settledExportToken: string;
    },
  ): Promise<DraftRecord> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/narration/approve`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async getPromotion(
    id: string,
  ): Promise<{ promotion: PromotionRecord | null }> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/promote`,
    );
  }

  async syncProduction(
    id: string,
    input: {
      expectedRevisionSeq: number;
    },
  ): Promise<PromotionRecord> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/production/sync`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async validateDraft(id: string): Promise<ValidatorResult> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/validate`,
      { method: 'POST' },
    );
  }

  async completePromote(id: string): Promise<PromotionRecord> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/promote/complete`,
      { method: 'POST' },
    );
  }

  async submitDraftOp(
    draftId: string,
    operation: OperationName,
    inputs: unknown,
  ): Promise<{ id: string }> {
    return this.request(
      `/api/drafts/${encodeURIComponent(draftId)}/ops`,
      {
        method: 'POST',
        body: JSON.stringify({ operation, inputs }),
      },
    );
  }

  async resumeDraftOp(
    draftId: string,
    operationId: string,
    inputs: unknown,
    reason?: string | null,
  ): Promise<{ id: string }> {
    return this.request(
      `/api/drafts/${encodeURIComponent(draftId)}/ops/${
        encodeURIComponent(operationId)
      }/resume`,
      {
        method: 'POST',
        body: JSON.stringify(
          reason === undefined ? { inputs } : { inputs, reason },
        ),
      },
    );
  }

  async listRevisions(id: string): Promise<RevisionRecord[]> {
    return this.request(
      `/api/drafts/${encodeURIComponent(id)}/revisions`,
    );
  }

  async import(markdown: string): Promise<DraftRecord> {
    return this.request('/api/drafts/import', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    });
  }

  async export(id: string): Promise<{ markdown: string }> {
    return this.request(`/api/drafts/${encodeURIComponent(id)}/export`);
  }

  async listLearningSessions(
    draftId: string,
  ): Promise<{ sessions: LearningSessionRecord[] }> {
    return this.request(
      `/api/drafts/${encodeURIComponent(draftId)}/learning-sessions`,
    );
  }

  async listDecisions(draftId: string): Promise<DecisionPage> {
    return this.request(
      `/api/drafts/${encodeURIComponent(draftId)}/decisions`,
    );
  }

  async listLessons(
    draftId: string,
  ): Promise<{ lessons: LessonDetail[] }> {
    return this.request(
      `/api/drafts/${encodeURIComponent(draftId)}/lessons`,
    );
  }

  async distill(
    draftId: string,
    trigger: 'on-demand' | 'session-end',
  ): Promise<DistillationRunRecord> {
    const suffix = trigger === 'session-end' ? '/end-session' : '';
    return this.request(
      `/api/drafts/${encodeURIComponent(draftId)}/distill${suffix}`,
      { method: 'POST' },
    );
  }

  async getDistillation(runId: string): Promise<DistillationRunRecord> {
    return this.request(
      `/api/distillations/${encodeURIComponent(runId)}`,
    );
  }

  async reconcileDistillation(
    runId: string,
  ): Promise<DistillationRunRecord> {
    return this.request(
      `/api/distillations/${encodeURIComponent(runId)}/reconcile`,
      { method: 'POST' },
    );
  }

  async editLesson(
    draftId: string,
    lessonId: string,
    expectedVersion: number,
    reviewedMarkdown: string,
  ): Promise<LessonDetail> {
    return this.request(this.lessonPath(draftId, lessonId), {
      method: 'PUT',
      body: JSON.stringify({ expectedVersion, reviewedMarkdown }),
    });
  }

  async approveLesson(
    draftId: string,
    lessonId: string,
    expectedVersion: number,
  ): Promise<LessonDetail> {
    return this.lessonAction(draftId, lessonId, 'approve', expectedVersion);
  }

  async rejectLesson(
    draftId: string,
    lessonId: string,
    expectedVersion: number,
  ): Promise<LessonDetail> {
    return this.lessonAction(draftId, lessonId, 'reject', expectedVersion);
  }

  async retireLesson(
    draftId: string,
    lessonId: string,
    expectedVersion: number,
  ): Promise<LessonDetail> {
    return this.lessonAction(draftId, lessonId, 'retire', expectedVersion);
  }

  async supersedeLesson(
    draftId: string,
    lessonId: string,
    expectedVersion: number,
    predecessorLessonId: string,
  ): Promise<LessonDetail> {
    return this.request(
      `${this.lessonPath(draftId, lessonId)}/supersede`,
      {
        method: 'POST',
        body: JSON.stringify({ expectedVersion, predecessorLessonId }),
      },
    );
  }

  async markLessonReconciliationAwaiting(
    resumeKey: string,
  ): Promise<LessonReconciliation> {
    return this.request(
      `/api/lesson-reconciliations/${
        encodeURIComponent(resumeKey)
      }/awaiting`,
      { method: 'POST' },
    );
  }

  async verifyLessonReconciliation(
    resumeKey: string,
    commit: string,
  ): Promise<LessonDetail> {
    return this.request(
      `/api/lesson-reconciliations/${
        encodeURIComponent(resumeKey)
      }/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ commit }),
      },
    );
  }

  async writeArtifact(
    path: string,
    content: string,
    expectedState: ArtifactExpectedState,
  ): Promise<ArtifactWriteResult> {
    return this.request('/api/artifacts', {
      method: 'POST',
      body: JSON.stringify({ path, content, expectedState }),
    });
  }

  async upsertPipelineRow(
    row: PipelineRowInput,
  ): Promise<ArtifactWriteResult> {
    return this.request('/api/pipeline', {
      method: 'POST',
      body: JSON.stringify(row),
    });
  }

  async getPipeline(): Promise<PipelineResponse> {
    return this.request('/api/pipeline');
  }

  async getTopicBrief(ref: string): Promise<TopicBrief> {
    return this.request(
      `/api/topic-brief?ref=${encodeURIComponent(ref)}`,
    );
  }

  async validate(path: string): Promise<ValidatorResult> {
    return this.request('/api/validate', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const headers = this.authHeaders(init.headers);
    if (init.body !== undefined) {
      headers.set('content-type', 'application/json');
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
    if (!response.ok) throw await responseError(response);
    return await readResponseBody(response) as T;
  }

  private lessonPath(draftId: string, lessonId: string): string {
    return `/api/drafts/${encodeURIComponent(draftId)}/lessons/${
      encodeURIComponent(lessonId)
    }`;
  }

  private lessonAction(
    draftId: string,
    lessonId: string,
    action: 'approve' | 'reject' | 'retire',
    expectedVersion: number,
  ): Promise<LessonDetail> {
    return this.request(
      `${this.lessonPath(draftId, lessonId)}/${action}`,
      {
        method: 'POST',
        body: JSON.stringify({ expectedVersion }),
      },
    );
  }

  private authHeaders(existing?: HeadersInit): Headers {
    const nonce = this.nonceProvider();
    if (!nonce) throw new Error('daemon nonce is unavailable');
    const headers = new Headers(existing);
    headers.set('x-sc-nonce', nonce);
    return headers;
  }
}

async function consumeSse(
  stream: ReadableStream<Uint8Array>,
  onFrame: (frame: SseFrame) => boolean | Promise<boolean>,
): Promise<'eof' | 'stopped'> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      if (done) buffer += decoder.decode();

      for (;;) {
        const boundary = /\r?\n\r?\n/.exec(buffer);
        if (!boundary || boundary.index === undefined) break;
        const rawFrame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const frame = parseSseFrame(rawFrame);
        if (frame && !await onFrame(frame)) {
          await reader.cancel().catch(() => undefined);
          return 'stopped';
        }
      }

      if (done) return 'eof';
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSseFrame(rawFrame: string): SseFrame | null {
  const frame: SseFrame = { id: '', event: 'message', data: '' };
  const data: string[] = [];

  for (const line of rawFrame.split(/\r?\n/)) {
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'id' && !value.includes('\0')) frame.id = value;
    if (field === 'event') frame.event = value;
    if (field === 'data') data.push(value);
  }

  frame.data = data.join('\n');
  return frame.id || frame.data || frame.event !== 'message' ? frame : null;
}

async function responseError(response: Response): Promise<DaemonClientError> {
  return new DaemonClientError(
    response.status,
    await readResponseBody(response),
  );
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(status: number, body: unknown): string {
  if (
    body
    && typeof body === 'object'
    && typeof (body as { error?: unknown }).error === 'string'
  ) {
    return (body as { error: string }).error;
  }
  return `daemon request failed with status ${status}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
