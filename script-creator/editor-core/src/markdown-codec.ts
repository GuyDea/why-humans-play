import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';

export type MarkdownExportResult =
  | { ok: true; markdown: string }
  | { ok: false; blocked: string[] };

function documentFrom(source: EditorState | ProseMirrorNode): ProseMirrorNode {
  return 'doc' in source ? source.doc : source;
}

function activeIndex(node: ProseMirrorNode): number | undefined {
  const index = node.attrs.activeIndex;
  return typeof index === 'number' && Number.isInteger(index) ? index : undefined;
}

function activeInlineText(node: ProseMirrorNode): string {
  const index = activeIndex(node);
  const options: unknown = node.attrs.options;
  if (index === undefined || !Array.isArray(options)) return '';

  const option: unknown = options[index];
  if (typeof option !== 'object' || option === null || !('text' in option)) return '';
  return typeof option.text === 'string' ? option.text : '';
}

function paragraphText(paragraph: ProseMirrorNode): string {
  let text = '';

  paragraph.forEach((node) => {
    if (node.isText) {
      text += node.text ?? '';
    } else if (node.type.name === 'inlineVariantSet') {
      text += activeInlineText(node);
    } else if (node.childCount > 0) {
      text += paragraphText(node);
    }
  });

  return text;
}

function quoteParagraphs(container: ProseMirrorNode): string[] {
  const paragraphs: string[] = [];

  container.forEach((node) => {
    if (node.type.name === 'paragraph') paragraphs.push(`> ${paragraphText(node)}`);
  });

  return paragraphs;
}

function renderBeat(beat: ProseMirrorNode, ordinal: number): string {
  const blocks = [
    `## Beat ${String(ordinal).padStart(2, '0')} — ${String(beat.attrs.title)}`,
    '### Narration',
  ];

  beat.forEach((node) => {
    if (node.type.name === 'paragraph') {
      blocks.push(`> ${paragraphText(node)}`);
      return;
    }

    if (node.type.name === 'variantSet') {
      const index = activeIndex(node);
      const option = index === undefined ? null : node.maybeChild(index);
      if (option) blocks.push(...quoteParagraphs(option));
      return;
    }

    if (node.type.name === 'opaqueSection') blocks.push(String(node.attrs.md));
  });

  return blocks.join('\n\n');
}

export function exportMarkdown(
  source: EditorState | ProseMirrorNode,
  pendingProposals: string[] = [],
): MarkdownExportResult {
  const doc = documentFrom(source);
  const blocked: string[] = [];

  doc.descendants((node) => {
    if (
      (node.type.name === 'variantSet' || node.type.name === 'inlineVariantSet')
      && node.attrs.settled === false
    ) {
      blocked.push(`variant ${String(node.attrs.variantId)} unsettled`);
    }
  });

  blocked.push(...pendingProposals.map((id) => `proposal ${id} unresolved`));
  if (blocked.length > 0) return { ok: false, blocked };

  const beats: string[] = [];
  doc.forEach((beat, _offset, index) => beats.push(renderBeat(beat, index + 1)));
  return { ok: true, markdown: beats.join('\n\n') };
}
