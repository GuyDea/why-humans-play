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
