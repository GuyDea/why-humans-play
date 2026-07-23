export interface TopicBrief {
  topic: string;
  factual_anchors: string[];
  unknowns: string[];
}

export interface OperationContext {
  selection: string;
  before: string;
  after: string;
  beatTitle: string;
  narrativeJob: string;
  brief: TopicBrief;
  creativeStatus: unknown;
  approvedLessons: string[];
  requestedScope: string;
}

export interface AlternativesOperation {
  kind: 'generate-alternatives';
  count: number;
}

export type OperationInputRequest =
  | 'rewrite-selection'
  | 'review'
  | AlternativesOperation;

export interface AlternativesScope {
  count: number;
  instruction: string;
}

export interface OperationInputs<
  RequestedScope = string | AlternativesScope,
> {
  topic_brief: TopicBrief;
  approved_lessons: string[];
  selection: string;
  surrounding_context: {
    before: string;
    after: string;
  };
  beat_title: string;
  narrative_job: string;
  creative_status: unknown;
  requested_scope: RequestedScope;
}

export function buildOperationInputs(
  context: OperationContext,
  operation: 'rewrite-selection' | 'review',
): OperationInputs<string>;
export function buildOperationInputs(
  context: OperationContext,
  operation: AlternativesOperation,
): OperationInputs<AlternativesScope>;
export function buildOperationInputs(
  context: OperationContext,
  operation: OperationInputRequest,
): OperationInputs;
export function buildOperationInputs(
  context: OperationContext,
  operation: OperationInputRequest,
): OperationInputs {
  const requestedScope = typeof operation === 'string'
    ? context.requestedScope
    : {
        count: operation.count,
        instruction: context.requestedScope,
      };

  return {
    topic_brief: context.brief,
    approved_lessons: context.approvedLessons,
    selection: context.selection,
    surrounding_context: {
      before: context.before,
      after: context.after,
    },
    beat_title: context.beatTitle,
    narrative_job: context.narrativeJob,
    creative_status: context.creativeStatus,
    requested_scope: requestedScope,
  };
}
