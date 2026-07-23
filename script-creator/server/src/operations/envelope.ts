import type { OperationDefinition } from './registry.js';

export function buildEnvelopePrompt(
  op: OperationDefinition,
  inputs: unknown,
): string {
  return `$${op.skill}\nOperation: ${op.operationLabel}\nInputs: ${JSON.stringify(inputs)}`;
}
