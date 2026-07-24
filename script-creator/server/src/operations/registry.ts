import {
  ALTERNATIVES_SCHEMA,
  ARCHITECTURE_REVIEW_SCHEMA,
  ARCHITECTURE_REWRITE_SCHEMA,
  DISTILL_SCHEMA,
  GATE_CHECK_SCHEMA,
  IDEATE_SCHEMA,
  PACKAGE_TEST_SCHEMA,
  REVIEW_SCHEMA,
  REWRITE_SCHEMA,
  TOPIC_SUMMARY_SCHEMA,
  type JsonSchema,
} from './schemas.js';

export type OperationSkill =
  | 'writing-whp-youtube-scripts'
  | 'choosing-whp-video-topic';

export type OperationSandbox = 'read-only' | 'workspace-write';
export type OperationTimeoutClass = 'scoped' | 'episode' | 'long';

export type OperationResult =
  | { kind: 'schema'; schema: JsonSchema }
  | { kind: 'raw'; summarySchema?: JsonSchema };

export interface OperationDefinition {
  name: string;
  skill: OperationSkill;
  operationLabel: string;
  sandbox: OperationSandbox;
  timeoutClass: OperationTimeoutClass;
  result: OperationResult;
  resumable: boolean;
}

export const OPERATIONS = {
  'generate-scoped': {
    name: 'generate-scoped',
    skill: 'writing-whp-youtube-scripts',
    operationLabel: 'Generate (scoped)',
    sandbox: 'read-only',
    timeoutClass: 'scoped',
    result: { kind: 'schema', schema: REWRITE_SCHEMA },
    resumable: true,
  },
  'generate-episode': {
    name: 'generate-episode',
    skill: 'writing-whp-youtube-scripts',
    operationLabel: 'Generate (episode-scale)',
    sandbox: 'read-only',
    timeoutClass: 'episode',
    result: { kind: 'raw' },
    resumable: false,
  },
  'generate-architecture': {
    name: 'generate-architecture',
    skill: 'writing-whp-youtube-scripts',
    operationLabel: 'Generate architecture',
    sandbox: 'read-only',
    timeoutClass: 'episode',
    result: { kind: 'raw' },
    resumable: false,
  },
  review: {
    name: 'review',
    skill: 'writing-whp-youtube-scripts',
    operationLabel: 'Review',
    sandbox: 'read-only',
    timeoutClass: 'scoped',
    result: { kind: 'schema', schema: REVIEW_SCHEMA },
    resumable: true,
  },
  'review-architecture': {
    name: 'review-architecture',
    skill: 'writing-whp-youtube-scripts',
    operationLabel: 'Review architecture',
    sandbox: 'read-only',
    timeoutClass: 'scoped',
    result: { kind: 'schema', schema: ARCHITECTURE_REVIEW_SCHEMA },
    resumable: true,
  },
  'rewrite-selection': {
    name: 'rewrite-selection',
    skill: 'writing-whp-youtube-scripts',
    operationLabel: 'Rewrite selection',
    sandbox: 'read-only',
    timeoutClass: 'scoped',
    result: { kind: 'schema', schema: REWRITE_SCHEMA },
    resumable: true,
  },
  'rewrite-architecture-section': {
    name: 'rewrite-architecture-section',
    skill: 'writing-whp-youtube-scripts',
    operationLabel: 'Rewrite architecture section',
    sandbox: 'read-only',
    timeoutClass: 'scoped',
    result: { kind: 'schema', schema: ARCHITECTURE_REWRITE_SCHEMA },
    resumable: true,
  },
  'generate-alternatives': {
    name: 'generate-alternatives',
    skill: 'writing-whp-youtube-scripts',
    operationLabel: 'Generate alternatives',
    sandbox: 'read-only',
    timeoutClass: 'scoped',
    result: { kind: 'schema', schema: ALTERNATIVES_SCHEMA },
    resumable: true,
  },
  promote: {
    name: 'promote',
    skill: 'writing-whp-youtube-scripts',
    operationLabel: 'Promote',
    sandbox: 'workspace-write',
    timeoutClass: 'long',
    result: { kind: 'raw' },
    resumable: false,
  },
  ideate: {
    name: 'ideate',
    skill: 'choosing-whp-video-topic',
    operationLabel: 'Ideate subjects/angles',
    sandbox: 'read-only',
    timeoutClass: 'scoped',
    result: { kind: 'schema', schema: IDEATE_SCHEMA },
    resumable: false,
  },
  'quick-gate-check': {
    name: 'quick-gate-check',
    skill: 'choosing-whp-video-topic',
    operationLabel: 'Quick gate-check',
    sandbox: 'read-only',
    timeoutClass: 'scoped',
    result: { kind: 'schema', schema: GATE_CHECK_SCHEMA },
    resumable: false,
  },
  'package-test': {
    name: 'package-test',
    skill: 'choosing-whp-video-topic',
    operationLabel: 'Package test',
    sandbox: 'read-only',
    timeoutClass: 'scoped',
    result: { kind: 'schema', schema: PACKAGE_TEST_SCHEMA },
    resumable: false,
  },
  'full-topic-run': {
    name: 'full-topic-run',
    skill: 'choosing-whp-video-topic',
    operationLabel: 'Full topic-selection run',
    sandbox: 'workspace-write',
    timeoutClass: 'long',
    result: {
      kind: 'raw',
      summarySchema: TOPIC_SUMMARY_SCHEMA,
    },
    resumable: false,
  },
  'handoff-preview': {
    name: 'handoff-preview',
    skill: 'choosing-whp-video-topic',
    operationLabel: 'Topic-brief handoff (preview)',
    sandbox: 'read-only',
    timeoutClass: 'episode',
    result: { kind: 'raw' },
    resumable: false,
  },
  distill: {
    name: 'distill',
    skill: 'writing-whp-youtube-scripts',
    operationLabel: 'Distill session lessons',
    sandbox: 'read-only',
    timeoutClass: 'scoped',
    result: { kind: 'schema', schema: DISTILL_SCHEMA },
    resumable: false,
  },
} as const satisfies Record<string, OperationDefinition>;

export type OperationName = keyof typeof OPERATIONS;

export const DRAFT_WRITING_OPERATIONS = new Set<OperationName>([
  'generate-scoped',
  'generate-episode',
  'generate-architecture',
  'review',
  'review-architecture',
  'rewrite-selection',
  'rewrite-architecture-section',
  'generate-alternatives',
  'promote',
]);
