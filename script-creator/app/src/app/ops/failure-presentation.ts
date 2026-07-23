import type {
  OperationName,
  OperationState,
} from '../api/client';
import type { OperationPhase } from './tracker';

export interface OperationFailureInput {
  operation: OperationName;
  phase: OperationPhase;
  state: OperationState | null;
  reason: string | null;
  errorMessage: string | null;
}

export interface OperationFailurePresentation {
  operation: OperationName;
  state: OperationState;
  reason: string;
  consoleEntry: {
    kind: 'failure';
    text: string;
  };
}

export function operationFailurePresentation(
  input: OperationFailureInput,
): OperationFailurePresentation | null {
  if (input.phase !== 'failed' && input.phase !== 'cancelled') {
    return null;
  }

  const state = input.state ?? input.phase;
  const reason = nonEmpty(input.reason)
    ?? nonEmpty(input.errorMessage)
    ?? 'Operation ended without completing.';

  return {
    operation: input.operation,
    state,
    reason,
    consoleEntry: {
      kind: 'failure',
      text: `${input.operation} [${state}] ${reason}`,
    },
  };
}

function nonEmpty(value: string | null): string | null {
  return value?.trim() || null;
}
