import { ARCHITECTURE_SECTION_KEYS } from '../architecture/codec.js';

export type JsonSchema = Record<string, unknown>;

function strictObject<const Properties extends Record<string, JsonSchema>>(
  properties: Properties,
): JsonSchema & {
  type: 'object';
  required: string[];
  additionalProperties: false;
  properties: Properties;
} {
  return {
    type: 'object',
    required: Object.keys(properties),
    additionalProperties: false,
    properties,
  };
}

const STATUS = {
  enum: ['complete', 'narrowed', 'declined'],
};

const GUARDRAIL_MARKDOWN = {
  type: ['string', 'null'],
};

export const TOPIC_GATE_NAMES = [
  'game_play_centrality',
  'human_revelation',
  'recognized_payoff',
  'evidence_path',
  'production_reality',
  'portfolio_fit',
] as const;

export const TOPIC_SCORE_NAMES = [
  'demand',
  'opening',
  'package',
  'satisfaction',
  'whp',
  'evidence',
  'feasibility',
] as const;

function scoreSchema(maximum: number): JsonSchema {
  return strictObject({
    score: { type: ['integer', 'null'], minimum: 0, maximum },
    grade: { enum: ['A', 'B', 'C', 'unknown'] },
  });
}

export const REVIEW_SCHEMA = strictObject({
  status: STATUS,
  findings: {
    type: 'array',
    items: strictObject({
      anchor: { type: 'string' },
      severity: { enum: ['blocking', 'important', 'optional'] },
      finding_markdown: { type: 'string' },
      optional_direction_markdown: { type: ['string', 'null'] },
    }),
  },
  guardrail_markdown: GUARDRAIL_MARKDOWN,
});

export const ARCHITECTURE_REVIEW_SCHEMA = strictObject({
  status: STATUS,
  findings: {
    type: 'array',
    items: strictObject({
      section_key: { enum: ARCHITECTURE_SECTION_KEYS },
      severity: { enum: ['blocking', 'important', 'optional'] },
      finding_markdown: { type: 'string' },
    }),
  },
  guardrail_markdown: GUARDRAIL_MARKDOWN,
});

export const ALTERNATIVES_SCHEMA = strictObject({
  status: STATUS,
  options: {
    type: 'array',
    items: strictObject({
      label: { type: 'string' },
      markdown: { type: 'string' },
    }),
  },
  guardrail_markdown: GUARDRAIL_MARKDOWN,
});

export const GATE_CHECK_SCHEMA = strictObject({
  status: STATUS,
  verdict: {
    enum: ['pass', 'fail', 'unknown'],
  },
  gates: {
    type: 'array',
    minItems: 6,
    maxItems: 6,
    items: strictObject({
      gate: {
        enum: [
          'game_play_centrality',
          'human_revelation',
          'recognized_payoff',
          'evidence_path',
          'production_reality',
          'portfolio_fit',
        ],
      },
      verdict: {
        enum: ['pass', 'fail', 'unknown'],
      },
      reason_markdown: { type: 'string' },
    }),
  },
  guardrail_markdown: GUARDRAIL_MARKDOWN,
});

export const REWRITE_SCHEMA = strictObject({
  status: STATUS,
  replacement_markdown: { type: 'string' },
  guardrail_markdown: GUARDRAIL_MARKDOWN,
});

export const ARCHITECTURE_REWRITE_SCHEMA = strictObject({
  status: STATUS,
  section_key: { enum: ARCHITECTURE_SECTION_KEYS },
  replacement_markdown: { type: 'string' },
  guardrail_markdown: GUARDRAIL_MARKDOWN,
});

export const IDEATE_SCHEMA = strictObject({
  status: STATUS,
  cards: {
    type: 'array',
    items: strictObject({
      subject: { type: 'string' },
      angle_markdown: { type: 'string' },
      seed: { type: 'string' },
    }),
  },
  guardrail_markdown: GUARDRAIL_MARKDOWN,
});

export const PACKAGE_TEST_SCHEMA = strictObject({
  status: STATUS,
  directions: {
    type: 'array',
    items: strictObject({
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
  guardrail_markdown: GUARDRAIL_MARKDOWN,
});

export const DISTILL_SCHEMA = strictObject({
  status: STATUS,
  lessons: {
    type: 'array',
    items: strictObject({
      classification: {
        enum: ['episode-local', 'durable-doctrine'],
      },
      lesson_markdown: { type: 'string' },
      evidence: {
        type: 'array',
        items: { type: 'string' },
      },
      proposed_target: { type: ['string', 'null'] },
    }),
  },
  guardrail_markdown: GUARDRAIL_MARKDOWN,
});

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
          gate: { enum: TOPIC_GATE_NAMES },
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
