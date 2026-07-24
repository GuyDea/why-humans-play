export interface DraftDocumentJson {
  [key: string]: unknown;
  type?: string;
  attrs?: Record<string, unknown>;
  content?: DraftDocumentJson[];
}

export function preserveDraftDocument(
  editorDocument: DraftDocumentJson,
  source: Record<string, unknown>,
): DraftDocumentJson {
  const preserved = preservedProperties(source);
  const sourceAttrs = record(source['attrs']);
  const sourceContent = Array.isArray(source['content'])
    ? source['content']
    : [];
  const content = editorDocument.content?.map((node) => {
    if (node.type !== 'beat') return node;
    const sourceBeat = matchingBeat(node, sourceContent);
    if (sourceBeat?.['type'] !== 'beat') return node;
    return {
      ...preservedProperties(sourceBeat),
      ...node,
      attrs: {
        ...(record(sourceBeat['attrs']) ?? {}),
        ...(node.attrs ?? {}),
      },
    };
  });

  return {
    ...preserved,
    ...editorDocument,
    attrs: {
      ...(sourceAttrs ?? {}),
      ...(editorDocument.attrs ?? {}),
    },
    ...(content ? { content } : {}),
  };
}

function matchingBeat(
  editorBeat: DraftDocumentJson,
  sourceContent: unknown[],
): Record<string, unknown> | null {
  const attrs = editorBeat.attrs ?? {};
  const beatId = stringValue(attrs['beatId']);
  const title = stringValue(attrs['title']);
  const beats = sourceContent
    .map(record)
    .filter((beat): beat is Record<string, unknown> =>
      beat?.['type'] === 'beat');
  if (beatId !== '') {
    return beats.find((beat) =>
      stringValue(record(beat['attrs'])?.['beatId']) === beatId)
      ?? null;
  }
  if (title === '') return null;
  const titleMatches = beats.filter((beat) =>
    stringValue(record(beat['attrs'])?.['title']) === title);
  return titleMatches.length === 1 ? titleMatches[0]! : null;
}

function preservedProperties(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) =>
      key !== 'type' && key !== 'attrs' && key !== 'content'),
  );
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
