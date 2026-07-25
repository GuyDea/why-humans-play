/**
 * Shared parser for the `ideate` operation result. Both the Topics workbench
 * and the AI-first Discover tab render the same subject/angle/seed cards, so
 * the schema-validation logic lives here to avoid duplication.
 */
export interface ParsedIdeateCard {
  subject: string;
  angleMarkdown: string;
  seed: string;
}

export function parseIdeateCards(value: unknown): ParsedIdeateCard[] | null {
  const result = record(value);
  if (
    result?.['status'] !== 'complete'
    || !Array.isArray(result['cards'])
  ) {
    return null;
  }

  const cards: ParsedIdeateCard[] = [];
  for (const candidate of result['cards']) {
    const card = record(candidate);
    const subject = nonEmptyString(card?.['subject']);
    const angleMarkdown = nonEmptyString(card?.['angle_markdown']);
    const seed = nonEmptyString(card?.['seed']);
    if (!subject || !angleMarkdown || !seed) return null;
    cards.push({ subject, angleMarkdown, seed });
  }
  return cards;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== ''
    ? value
    : null;
}
