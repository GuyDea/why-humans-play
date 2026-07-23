export interface DocumentJson {
  [key: string]: unknown;
  type?: string;
  attrs?: Record<string, unknown>;
  content?: DocumentJson[];
  text?: string;
}

export interface BeatMetrics {
  words: number;
  estimatedMs: number;
  targetMs: number;
  ratio: number;
}

export interface DocumentMetrics {
  totalWords: number;
  beats: BeatMetrics[];
}

export function computeMetrics(
  docJson: DocumentJson,
  wpm = 150,
): DocumentMetrics {
  if (!Number.isFinite(wpm) || wpm <= 0) {
    throw new RangeError('words per minute must be greater than zero');
  }

  const beats = (docJson.content ?? [])
    .filter((node) => node.type === 'beat')
    .map((beat) => {
      const words = countWords(textContent(beat));
      const estimatedMs = words * 60_000 / wpm;
      const target = beat.attrs?.['timeTargetMs'];
      const targetMs = typeof target === 'number' && Number.isFinite(target)
        ? target
        : 0;

      return {
        words,
        estimatedMs,
        targetMs,
        ratio: targetMs > 0 ? estimatedMs / targetMs : 0,
      };
    });

  return {
    totalWords: beats.reduce((sum, beat) => sum + beat.words, 0),
    beats,
  };
}

function textContent(node: DocumentJson): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'variantSet') {
    const option = activeOption(node);
    return option ? textContent(option) : '';
  }
  if (node.type === 'inlineVariantSet') return activeInlineText(node);
  const separator = node.type === 'paragraph' ? '' : '\n';
  return (node.content ?? []).map(textContent).join(separator);
}

function activeOption(node: DocumentJson): DocumentJson | undefined {
  const options = node.content ?? [];
  const index = activeIndex(node, options.length);
  return index === undefined ? undefined : options[index];
}

function activeInlineText(node: DocumentJson): string {
  const options = node.attrs?.['options'];
  if (!Array.isArray(options)) return '';
  const index = activeIndex(node, options.length);
  if (index === undefined) return '';
  const option = options[index];
  if (!option || typeof option !== 'object') return '';
  const text = (option as Record<string, unknown>)['text'];
  return typeof text === 'string' ? text : '';
}

function activeIndex(node: DocumentJson, optionCount: number): number | undefined {
  const value = node.attrs?.['activeIndex'];
  const index = Number.isInteger(value) ? value as number : 0;
  return index >= 0 && index < optionCount ? index : undefined;
}

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/u).length;
}
