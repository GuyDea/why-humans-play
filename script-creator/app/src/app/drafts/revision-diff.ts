export type NarrationDiffKind = 'equal' | 'delete' | 'insert';

export interface NarrationDiffSegment {
  kind: NarrationDiffKind;
  text: string;
}

interface DocumentNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: DocumentNode[];
  text?: string;
}

export function extractNarration(doc: unknown): string {
  if (!isDocumentNode(doc)) return '';

  return (doc.content ?? [])
    .filter((node) => node.type === 'beat')
    .map((beat) => narrationBlocks(beat).join('\n'))
    .join('\n\n');
}

export function diffNarration(
  earlier: unknown,
  later: unknown,
): NarrationDiffSegment[] {
  const left = tokenize(extractNarration(earlier));
  const right = tokenize(extractNarration(later));
  const width = right.length + 1;
  const common = new Uint32Array((left.length + 1) * width);

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (
      let rightIndex = right.length - 1;
      rightIndex >= 0;
      rightIndex -= 1
    ) {
      const offset = leftIndex * width + rightIndex;
      common[offset] = left[leftIndex] === right[rightIndex]
        ? common[(leftIndex + 1) * width + rightIndex + 1]! + 1
        : Math.max(
          common[(leftIndex + 1) * width + rightIndex]!,
          common[leftIndex * width + rightIndex + 1]!,
        );
    }
  }

  const segments: NarrationDiffSegment[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length || rightIndex < right.length) {
    if (
      leftIndex < left.length
      && rightIndex < right.length
      && left[leftIndex] === right[rightIndex]
    ) {
      appendSegment(segments, 'equal', left[leftIndex]!);
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    const deleteScore = leftIndex < left.length
      ? common[(leftIndex + 1) * width + rightIndex]!
      : -1;
    const insertScore = rightIndex < right.length
      ? common[leftIndex * width + rightIndex + 1]!
      : -1;
    if (leftIndex < left.length && deleteScore >= insertScore) {
      appendSegment(segments, 'delete', left[leftIndex]!);
      leftIndex += 1;
    } else if (rightIndex < right.length) {
      appendSegment(segments, 'insert', right[rightIndex]!);
      rightIndex += 1;
    }
  }

  return segments;
}

function narrationBlocks(node: DocumentNode): string[] {
  if (node.type === 'paragraph') return [inlineText(node)];
  if (node.type === 'variantSet') {
    const selected = activeBlockOption(node);
    return selected
      ? (selected.content ?? []).flatMap(narrationBlocks)
      : [];
  }
  return (node.content ?? []).flatMap((child) =>
    child.type === 'opaqueSection' ? [] : narrationBlocks(child));
}

function inlineText(node: DocumentNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'inlineVariantSet') return activeInlineText(node);
  return (node.content ?? []).map(inlineText).join('');
}

function activeBlockOption(node: DocumentNode): DocumentNode | undefined {
  const options = node.content ?? [];
  const index = activeIndex(node.attrs?.['activeIndex'], options.length);
  return index === undefined ? undefined : options[index];
}

function activeInlineText(node: DocumentNode): string {
  const options = node.attrs?.['options'];
  if (!Array.isArray(options)) return '';
  const index = activeIndex(node.attrs?.['activeIndex'], options.length);
  if (index === undefined) return '';
  const option = options[index];
  if (!option || typeof option !== 'object') return '';
  const text = (option as Record<string, unknown>)['text'];
  return typeof text === 'string' ? text : '';
}

function activeIndex(value: unknown, length: number): number | undefined {
  const index = Number.isInteger(value) ? value as number : 0;
  return index >= 0 && index < length ? index : undefined;
}

function tokenize(value: string): string[] {
  return value.match(/\s+|[^\s]+/gu) ?? [];
}

function appendSegment(
  segments: NarrationDiffSegment[],
  kind: NarrationDiffKind,
  text: string,
): void {
  const previous = segments.at(-1);
  if (previous?.kind === kind) {
    previous.text += text;
  } else {
    segments.push({ kind, text });
  }
}

function isDocumentNode(value: unknown): value is DocumentNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
