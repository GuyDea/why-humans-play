import { describe, expect, it } from 'vitest';
import {
  diffNarration,
  extractNarration,
} from './revision-diff';

const earlier = {
  type: 'doc',
  attrs: { format: 'narration', preamble: 'Production notes stay out.' },
  content: [
    {
      type: 'beat',
      attrs: {
        beatId: 'beat_aaaaaaaaaa',
        title: 'Cold open',
        timeTargetMs: 30_000,
      },
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Play looks unnecessary.' },
          ],
        },
        {
          type: 'opaqueSection',
          attrs: { md: '<!-- direction, not narration -->' },
        },
      ],
    },
    {
      type: 'beat',
      attrs: {
        beatId: 'beat_bbbbbbbbbb',
        title: 'Turn',
        timeTargetMs: 45_000,
      },
      content: [
        {
          type: 'variantSet',
          attrs: {
            variantId: 'variant-1',
            activeIndex: 1,
            settled: true,
          },
          content: [
            {
              type: 'variantOption',
              attrs: { label: 'A' },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'The unused take.' }],
                },
              ],
            },
            {
              type: 'variantOption',
              attrs: { label: 'B' },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Then learning begins.' }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const later = structuredClone(earlier);
const laterFirstText = later.content[0]?.content[0]?.content?.[0];
if (laterFirstText?.type === 'text') {
  laterFirstText.text = 'Play looks essential.';
}

describe('revision narration diff', () => {
  it('extracts only visible narration in document order', () => {
    expect(extractNarration(earlier)).toBe([
      'Play looks unnecessary.',
      '',
      'Then learning begins.',
    ].join('\n'));
  });

  it('returns a stable text diff between extracted revisions', () => {
    expect(diffNarration(earlier, later)).toEqual([
      { kind: 'equal', text: 'Play looks ' },
      { kind: 'delete', text: 'unnecessary.' },
      { kind: 'insert', text: 'essential.' },
      { kind: 'equal', text: '\n\nThen learning begins.' },
    ]);
  });
});
