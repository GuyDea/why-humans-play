import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import { newBeatId } from './ids.js';
import { pendingProposalIds } from './proposals.js';
import { schema } from './schema.js';

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

type MarkdownFormat = 'annotated' | 'narration';

function annotatedHeading(title: string, ordinal: number): string {
  if (/^Beat \d+ — /.test(title)) return `## ${title}`;
  return `## Beat ${String(ordinal).padStart(2, '0')} — ${title}`;
}

function renderBeat(
  beat: ProseMirrorNode,
  ordinal: number,
  format: MarkdownFormat,
): string {
  const title = String(beat.attrs.title);
  const blocks = format === 'narration'
    ? [`## ${title}`]
    : [annotatedHeading(title, ordinal), '### Narration'];

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

  const unresolved = 'doc' in source
    ? [...pendingProposalIds(source), ...pendingProposals]
    : pendingProposals;
  blocked.push(...unresolved.map((id) => `proposal ${id} unresolved`));
  if (blocked.length > 0) return { ok: false, blocked };

  const format: MarkdownFormat = doc.attrs.format === 'narration' ? 'narration' : 'annotated';
  const beats: string[] = [];
  doc.forEach((beat, _offset, index) => beats.push(renderBeat(beat, index + 1, format)));
  const preamble = typeof doc.attrs.preamble === 'string' ? doc.attrs.preamble : '';
  return { ok: true, markdown: `${preamble}${beats.join('\n\n')}` };
}

interface BeatHeader {
  from: number;
  to: number;
  title: string;
}

function beatHeaders(markdown: string): BeatHeader[] {
  const primary = candidateHeaders(markdown, /^## ([^\r\n]+)$/gm);
  const appendixIndex = primary.findIndex((header) => /^(?:Production )?Appendix(?:\s|$)/i.test(header.title));
  const primaryBeforeAppendix = appendixIndex < 0 ? primary : primary.slice(0, appendixIndex);
  const headers = primaryBeforeAppendix.filter((header, index) => {
    const next = primary[index + 1];
    return startsWithNarration(markdown.slice(header.to, next?.from ?? markdown.length));
  });
  if (headers.length > 0) return headers;

  const compatible = candidateHeaders(markdown, /^### (Beat \d+ — [^\r\n]*)$/gm);
  const appendixFrom = appendixIndex < 0 ? markdown.length : primary[appendixIndex]?.from ?? markdown.length;
  const compatibleBeforeAppendix = compatible.filter((header) => header.from < appendixFrom);
  return compatibleBeforeAppendix.filter((header, index) => {
    const next = compatible[index + 1];
    return startsWithNarration(markdown.slice(header.to, next?.from ?? markdown.length));
  });
}

function candidateHeaders(markdown: string, pattern: RegExp): BeatHeader[] {
  const headers: BeatHeader[] = [];

  for (const match of markdown.matchAll(pattern)) {
    if (match.index === undefined) continue;
    headers.push({
      from: match.index,
      to: match.index + match[0].length,
      title: match[1] ?? '',
    });
  }

  return headers;
}

function startsWithNarration(markdown: string): boolean {
  const body = removeLeadingSeparator(markdown);
  return body === '### Narration'
    || body.startsWith('### Narration\n')
    || body.startsWith('### Narration\r\n')
    || body === '>'
    || body.startsWith('> ')
    || body.startsWith('>\n')
    || body.startsWith('>\r\n');
}

function hasNarrationMarker(markdown: string): boolean {
  return /(?:^|\r?\n)### Narration(?:\r?\n|$)/.test(markdown);
}

function removeLeadingSeparator(markdown: string): string {
  if (markdown.startsWith('\r\n\r\n')) return markdown.slice(4);
  if (markdown.startsWith('\n\n')) return markdown.slice(2);
  return markdown;
}

function removeTrailingSeparator(markdown: string): string {
  if (markdown.endsWith('\r\n\r\n')) return markdown.slice(0, -4);
  if (markdown.endsWith('\n\n')) return markdown.slice(0, -2);
  return markdown;
}

function blockquoteLines(block: string): string[] | null {
  const lines = block.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  return lines.length > 0 && lines.every((line) => line === '>' || line.startsWith('> '))
    ? lines
    : null;
}

function blockquoteParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let wrapped: string[] = [];

  const flush = () => {
    if (wrapped.length > 0) paragraphs.push(wrapped.join(' '));
    wrapped = [];
  };

  for (const line of lines) {
    if (line === '>') {
      flush();
    } else {
      wrapped.push(line.slice(2));
    }
  }
  flush();

  return paragraphs;
}

function parseBeatBody(markdown: string, format: MarkdownFormat): ProseMirrorNode[] {
  const children: ProseMirrorNode[] = [];
  let inNarration = format === 'narration';

  for (const block of markdown.split(/\r?\n\r?\n/)) {
    if (block === '### Narration') {
      inNarration = true;
      continue;
    }

    const quoteLines = blockquoteLines(block);
    if (inNarration && quoteLines) {
      for (const text of blockquoteParagraphs(quoteLines)) {
        children.push(schema.node('paragraph', null, schema.text(text)));
      }
      continue;
    }

    inNarration = false;
    children.push(schema.node('opaqueSection', { md: block }));
  }

  return children;
}

export function parseMarkdown(markdown: string): ProseMirrorNode {
  const headers = beatHeaders(markdown);
  if (headers.length === 0) throw new RangeError('Markdown contains no beat headers');

  const annotated = headers.some((header, index) => {
    const nextHeader = headers[index + 1];
    const body = markdown.slice(header.to, nextHeader?.from ?? markdown.length);
    return hasNarrationMarker(body);
  });
  const format: MarkdownFormat = annotated ? 'annotated' : 'narration';

  const beats = headers.map((header, index) => {
    const nextHeader = headers[index + 1];
    const bodyEnd = nextHeader?.from ?? markdown.length;
    let body = removeLeadingSeparator(markdown.slice(header.to, bodyEnd));
    if (nextHeader) body = removeTrailingSeparator(body);

    return schema.node(
      'beat',
      { beatId: newBeatId(), title: header.title, timeTargetMs: 30000 },
      parseBeatBody(body, hasNarrationMarker(body) ? 'annotated' : 'narration'),
    );
  });

  const preamble = markdown.slice(0, headers[0]!.from);
  return schema.node('doc', { format, preamble }, beats);
}
