import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EditorView } from 'prosemirror-view';
import { describe, expect, it } from 'vitest';
import { exportMarkdown, parseMarkdown } from '../src/markdown-codec.js';
import { beatNode, docOf, para, stateOf } from './builders.js';

describe('parseMarkdown round-trip', () => {
  it('is byte-identical on a constructed exportable document', () => {
    const first = exportMarkdown(docOf(
      beatNode('Hook', para('An AI flipped a block.'), para('Reward arrived anyway.')),
      beatNode('Turn', para('What did it optimize?')),
    ));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = exportMarkdown(parseMarkdown(first.markdown));
    expect(second.ok && second.markdown).toBe(first.markdown);
  });

  it('preserves unknown production sections opaquely', () => {
    const md = ['## Beat 01 — T', '', '### Narration', '', '> Line.', '',
      '### Claims', '', '- `F-001` — x — VERIFIED.', ''].join('\n');
    const reEmitted = exportMarkdown(parseMarkdown(md));
    expect(reEmitted.ok && reEmitted.markdown.includes('- `F-001` — x — VERIFIED.')).toBe(true);
  });

  it('mounts parsed opaque production markdown as text, never HTML', () => {
    const production = '<img src="x" onerror="globalThis.pwned = true">';
    const md = ['## Beat 01 — T', '', '### Narration', '', '> Line.', '',
      '### Production', '', production].join('\n');
    const view = new EditorView(document.createElement('div'), { state: stateOf(parseMarkdown(md)) });

    const opaque = [...view.dom.querySelectorAll<HTMLElement>('.opaque-section')]
      .find((element) => element.textContent === production);
    expect(opaque).toBeDefined();
    expect(opaque?.querySelector('img')).toBeNull();
    view.destroy();
  });

  it.each([
    ['annotated', '## Beat 01 — T\n\n### Narration\n\n> Line.'],
    ['narration', '## 1. T\n\n> Line.'],
  ])('preserves pre-beat bytes verbatim in %s format', (_format, beats) => {
    const preamble = '# Exact title\r\n<!-- production preamble -->\r\n\r\n';
    const doc = parseMarkdown(`${preamble}${beats}`);
    const out = exportMarkdown(doc);

    expect(doc.attrs.preamble).toBe(preamble);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.markdown.startsWith(preamble)).toBe(true);
  });

  it('round-trips the narration format preserving content and format', () => {
    const md = ['## 1. The hook', '', '> First line joined', '> across wraps.', '>', '> Second paragraph.', ''].join('\n');
    const doc = parseMarkdown(md);
    expect(doc.attrs.format).toBe('narration');
    const out = exportMarkdown(doc);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.markdown).toContain('## 1. The hook');
      expect(out.markdown).toContain('> First line joined across wraps.');
      expect(out.markdown).toContain('> Second paragraph.');
      expect(out.markdown).not.toContain('### Narration');
    }
  });

  it('keeps an appendix blockquote opaque instead of opening another beat', () => {
    const md = ['## 1. The hook', '', '> Spoken.', '', '## Appendix', '', '> Production note.'].join('\n');
    const doc = parseMarkdown(md);
    expect(doc.childCount).toBe(1);
    const opaques: string[] = [];
    doc.descendants((node) => {
      if (node.type.name === 'opaqueSection') opaques.push(String(node.attrs.md));
    });
    expect(opaques).toContain('## Appendix');
    expect(opaques).toContain('> Production note.');
  });

  it('parses direct narration per beat when another beat is annotated', () => {
    const md = ['## Beat 01 — One', '', '### Narration', '', '> Marked.', '',
      '## Beat 02 — Two', '', '> Direct.'].join('\n');
    const doc = parseMarkdown(md);
    expect(doc.attrs.format).toBe('annotated');
    const paragraphs: string[] = [];
    doc.descendants((node) => {
      if (node.type.name === 'paragraph') paragraphs.push(node.textContent);
    });
    expect(paragraphs).toEqual(['Marked.', 'Direct.']);
  });

  it('smoke-parses the real episode scaffold', () => {
    const md = readFileSync(join(import.meta.dirname, '..', '..', '..', 'whp-youtube', 'episodes', '01-why-ai-cheats.md'), 'utf8');
    const doc = parseMarkdown(md);
    expect(doc.childCount).toBeGreaterThanOrEqual(5);
    const out = exportMarkdown(doc);
    expect(out.ok).toBe(true);
    if (out.ok) {
      const titleLine = md.match(/^# [^\r\n]+/m)?.[0];
      expect(titleLine).toBeDefined();
      expect(String(doc.attrs.preamble)).toContain(titleLine);
      expect(out.markdown.startsWith(String(doc.attrs.preamble))).toBe(true);
      expect(out.markdown).toContain(titleLine);
      let firstNarration = '';
      const opaques: string[] = [];
      doc.descendants((n) => {
        if (!firstNarration && n.type.name === 'paragraph' && n.textContent.trim()) {
          firstNarration = n.textContent.trim();
        }
        if (n.type.name === 'opaqueSection') opaques.push(String(n.attrs.md));
        return true;
      });
      expect(firstNarration.length).toBeGreaterThan(0);
      expect(out.markdown).toContain(firstNarration);
      for (const md of opaques) expect(out.markdown).toContain(md);
    }
  });
});
