import { describe, expect, it } from 'vitest';
import { exportMarkdown } from '../src/markdown-codec.js';
import { schema } from '../src/schema.js';
import { beatNode, docOf, para } from './builders.js';

describe('exportMarkdown', () => {
  it('emits beats with narration blockquotes', () => {
    const res = exportMarkdown(docOf(
      beatNode('The wrong perfect score', para('One line.'), para('Two lines.')),
      beatNode('The exploit', para('Three.')),
    ));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.markdown).toContain('## Beat 01 — The wrong perfect score');
    expect(res.markdown).toContain('## Beat 02 — The exploit');
    expect(res.markdown).toContain('> One line.');
    expect(res.markdown.indexOf('> One line.')).toBeGreaterThan(res.markdown.indexOf('### Narration'));
  });

  it('round-trips opaque sections verbatim', () => {
    const opaque = schema.node('opaqueSection', { md: '### Claims\n\n- `F-001` — thing — VERIFIED.' });
    const beat = schema.node('beat', { beatId: 'beat_abcdefghij', title: 'X', timeTargetMs: 1000 },
      [schema.node('paragraph', null, [schema.text('Hi.')]), opaque]);
    const res = exportMarkdown(schema.node('doc', null, [beat]));
    expect(res.ok && res.markdown.includes('- `F-001` — thing — VERIFIED.')).toBe(true);
  });

  it('emits only the active option of a settled variant and blocks unsettled ones', () => {
    const opt = (label: string, text: string) =>
      schema.node('variantOption', { label }, [schema.node('paragraph', null, [schema.text(text)])]);
    const settled = schema.node('variantSet', { variantId: 'v1', activeIndex: 1, settled: true }, [opt('A', 'alpha'), opt('B', 'beta')]);
    const unsettled = schema.node('variantSet', { variantId: 'v2', activeIndex: 0, settled: false }, [opt('A', 'gamma'), opt('B', 'delta')]);
    const mk = (v: typeof settled) => schema.node('doc', null, [schema.node('beat', { beatId: 'beat_abcdefghij', title: 'T', timeTargetMs: 1 }, [v])]);
    const good = exportMarkdown(mk(settled));
    expect(good.ok && good.markdown.includes('> beta') && !good.markdown.includes('alpha')).toBe(true);
    const bad = exportMarkdown(mk(unsettled));
    expect(!bad.ok && bad.blocked.join()).toContain('v2');
  });

  it('blocks when pending proposals are reported', () => {
    const res = exportMarkdown(docOf(beatNode('T', para('x'))), ['p1']);
    expect(!res.ok && res.blocked.join()).toContain('p1');
  });
});
