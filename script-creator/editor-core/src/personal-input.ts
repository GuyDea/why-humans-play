import {
  Fragment,
  type Node as ProseMirrorNode,
} from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';
import { schema } from './schema.js';

export interface PersonalInputAcceptance {
  marker: string;
  bodyMd: string;
  replacement: string;
}

export function personalInputAcceptanceTransaction(
  state: EditorState,
  input: PersonalInputAcceptance,
): Transaction | null {
  let markerCount = 0;
  let markerParagraphCount = 0;
  let markerParagraphPosition: number | null = null;
  let markerParagraphSize: number | null = null;
  let markerFromInParagraph: number | null = null;
  let markerParagraph: ProseMirrorNode | null = null;
  let bodyCount = 0;
  let bodyPosition: number | null = null;
  let bodyNode: ProseMirrorNode | null = null;
  state.doc.descendants((node, position) => {
    if (node.type.name === 'paragraph') {
      let paragraphOccurrences = 0;
      for (
        let offset = node.textContent.indexOf(input.marker);
        offset >= 0;
        offset = node.textContent.indexOf(
          input.marker,
          offset + input.marker.length,
        )
      ) {
        paragraphOccurrences += 1;
      }
      markerCount += paragraphOccurrences;
      if (paragraphOccurrences > 0) {
        markerParagraphCount += 1;
        markerParagraphPosition = position;
        markerParagraphSize = node.nodeSize;
        markerParagraph = node;
        node.descendants((inline, inlinePosition) => {
          if (
            markerFromInParagraph === null
            && inline.isText
          ) {
            const offset = (inline.text ?? '').indexOf(input.marker);
            if (offset >= 0) {
              markerFromInParagraph = inlinePosition + offset;
            }
          }
          return true;
        });
      }
    }
    if (
      node.type.name === 'opaqueSection'
      && String(node.attrs['md']).trimEnd() === input.bodyMd.trimEnd()
    ) {
      bodyCount += 1;
      bodyPosition = position;
      bodyNode = node;
    }
    return true;
  });
  if (
    markerCount !== 1
    || markerParagraphCount !== 1
    || markerParagraphPosition === null
    || markerParagraphSize === null
    || markerFromInParagraph === null
    || markerParagraph === null
    || bodyCount !== 1
    || bodyPosition === null
    || bodyNode === null
  ) {
    return null;
  }
  const replacementTexts = narrationReplacementParagraphs(
    input.replacement,
  );
  if (replacementTexts.length === 0) return null;
  const matchedParagraph = markerParagraph as unknown as ProseMirrorNode;
  const markerFrom = markerFromInParagraph as unknown as number;
  const beforeMarker = matchedParagraph.content.cut(0, markerFrom);
  const afterMarker = matchedParagraph.content.cut(
    markerFrom + input.marker.length,
  );
  const replacementParagraphs = replacementTexts.map((text, index) => {
    let content = Fragment.from(schema.text(text));
    if (index === 0) content = beforeMarker.append(content);
    if (index === replacementTexts.length - 1) {
      content = content.append(afterMarker);
    }
    return matchedParagraph.type.create(
      matchedParagraph.attrs,
      content,
      matchedParagraph.marks,
    );
  });
  const matchedBodyNode = bodyNode as unknown as ProseMirrorNode;
  const bodyAttrs = matchedBodyNode.attrs as Record<string, unknown>;
  const currentBody = String(bodyAttrs['md']);
  const completedBody = currentBody.replace(
    /^(- \*\*Decision:\*\* )INPUT-REQUESTED$/mu,
    '$1COMPLETED',
  );
  if (completedBody === currentBody) return null;

  let transaction = state.tr.replaceWith(
    markerParagraphPosition,
    markerParagraphPosition + markerParagraphSize,
    replacementParagraphs,
  );
  transaction = transaction.setNodeMarkup(
    transaction.mapping.map(bodyPosition),
    undefined,
    {
      ...bodyAttrs,
      md: completedBody,
    },
  );
  return transaction;
}

function narrationReplacementParagraphs(markdown: string): string[] {
  const blocks = markdown
    .replace(/\r\n?/gu, '\n')
    .trim()
    .split(/\n\s*\n/gu)
    .filter((block) => block.trim() !== '');
  return blocks.flatMap((block) => {
    const lines = block.split('\n');
    const quoted = lines.every((line) =>
      line === '>' || line.startsWith('> '));
    const text = lines
      .map((line) => quoted ? line.replace(/^> ?/u, '') : line)
      .join(' ')
      .trim();
    return text === '' ? [] : [text];
  });
}
