import { describe, expect, it } from 'vitest';
import { operationFailurePresentation } from './failure-presentation';

describe('operationFailurePresentation', () => {
  it.each([
    {
      operation: 'rewrite-selection' as const,
      state: 'failed' as const,
      reason: 'Codex exited before producing a result.',
      errorMessage: 'runner failed',
    },
    {
      operation: 'review' as const,
      state: 'invalid-output' as const,
      reason: 'response failed schema validation',
      errorMessage: 'invalid_json_schema',
    },
    {
      operation: 'generate-alternatives' as const,
      state: 'timed-out' as const,
      reason: null,
      errorMessage: 'operation exceeded its deadline',
    },
  ])('maps $operation $state to a callout and console failure', (input) => {
    expect(operationFailurePresentation({
      ...input,
      phase: 'failed',
    })).toEqual({
      operation: input.operation,
      state: input.state,
      reason: input.reason ?? input.errorMessage,
      consoleEntry: {
        kind: 'failure',
        text: `${input.operation} [${input.state}] ${
          input.reason ?? input.errorMessage
        }`,
      },
    });
  });

  it('maps cancellation with a stable fallback reason', () => {
    expect(operationFailurePresentation({
      operation: 'rewrite-selection',
      phase: 'cancelled',
      state: 'cancelled',
      reason: null,
      errorMessage: null,
    })).toEqual({
      operation: 'rewrite-selection',
      state: 'cancelled',
      reason: 'Operation ended without completing.',
      consoleEntry: {
        kind: 'failure',
        text: 'rewrite-selection [cancelled] Operation ended without completing.',
      },
    });
  });

  it.each(['submitting', 'streaming', 'done', 'guardrail'] as const)(
    'does not present the %s phase as a failure',
    (phase) => {
      expect(operationFailurePresentation({
        operation: 'review',
        phase,
        state: phase === 'done' || phase === 'guardrail'
          ? 'completed'
          : 'running',
        reason: null,
        errorMessage: null,
      })).toBeNull();
    },
  );
});
