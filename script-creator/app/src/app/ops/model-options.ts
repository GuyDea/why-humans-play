import { type ModelChoice } from './model-preference';

export interface ModelOption {
  label: string;
  model?: string;
  effort?: string;
}

// This is the single place to edit when adding a selectable model/effort.
// A Claude model id (Opus/Fable) routes the run onto the Claude Code CLI
// backend; the gpt-* entries run on codex. Effort values must be accepted by
// both the server validator and the target CLI (high/xhigh satisfy both).
export const MODEL_OPTIONS: ModelOption[] = [
  { label: 'Default' }, // no override — codex uses its global configuration
  { label: 'Sol · xhigh', model: 'gpt-5.6-sol', effort: 'xhigh' },
  { label: 'Sol · medium', model: 'gpt-5.6-sol', effort: 'medium' },
  { label: 'Opus 4.8', model: 'claude-opus-4-8', effort: 'high' },
  { label: 'Fable 5', model: 'claude-fable-5', effort: 'high' },
];

/**
 * The stored choice for an option: whichever of model/effort it sets, or null
 * when it sets neither (the 'Default' entry, which clears any preference).
 */
export function choiceForModelOption(
  option: ModelOption | undefined,
): ModelChoice | null {
  if (!option) return null;
  const choice: ModelChoice = {};
  if (option.model !== undefined) choice.model = option.model;
  if (option.effort !== undefined) choice.effort = option.effort;
  return choice.model === undefined && choice.effort === undefined
    ? null
    : choice;
}

/**
 * The dropdown index reflecting a stored choice, matching on exactly the
 * fields each option sets; falls back to 0 (Default) when nothing matches.
 */
export function modelOptionIndex(
  options: readonly ModelOption[],
  choice: ModelChoice | null,
): number {
  if (!choice) return 0;
  const index = options.findIndex(
    (option) =>
      option.model === choice.model && option.effort === choice.effort,
  );
  return index >= 0 ? index : 0;
}
