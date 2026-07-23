import { describe, expect, it } from 'vitest';
import { computeMetrics } from './metrics';

const fixtureDoc = {
  type: 'doc',
  attrs: { format: 'narration', preamble: '' },
  content: [
    {
      type: 'beat',
      attrs: {
        beatId: 'beat-1',
        title: 'Opening',
        timeTargetMs: 4_000,
      },
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'One two three four five.' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Six seven eight nine ten.' },
          ],
        },
      ],
    },
    {
      type: 'beat',
      attrs: {
        beatId: 'beat-2',
        title: 'Turn',
        timeTargetMs: 4_000,
      },
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Eleven twelve thirteen fourteen fifteen.',
            },
          ],
        },
      ],
    },
  ],
};

describe('computeMetrics', () => {
  it('computes total words, estimated runtime, and target ratio per beat', () => {
    expect(computeMetrics(fixtureDoc)).toEqual({
      totalWords: 15,
      beats: [
        {
          words: 10,
          estimatedMs: 4_000,
          targetMs: 4_000,
          ratio: 1,
        },
        {
          words: 5,
          estimatedMs: 2_000,
          targetMs: 4_000,
          ratio: 0.5,
        },
      ],
    });
  });

  it('uses the supplied words-per-minute rate', () => {
    expect(computeMetrics(fixtureDoc, 120).beats.map((beat) => beat.estimatedMs))
      .toEqual([5_000, 2_500]);
  });

  it('counts only the visible active block and inline variant options', () => {
    const docWithVariants = {
      type: 'doc',
      attrs: { format: 'narration', preamble: '' },
      content: [
        {
          type: 'beat',
          attrs: {
            beatId: 'beat-variants',
            title: 'Variants',
            timeTargetMs: 3_600,
          },
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Visible intro ' },
                {
                  type: 'inlineVariantSet',
                  attrs: {
                    variantId: 'inline-1',
                    activeIndex: 1,
                    settled: false,
                    options: [
                      { label: 'A', text: 'unused' },
                      { label: 'B', text: 'active inline' },
                    ],
                  },
                },
                { type: 'text', text: ' end' },
              ],
            },
            {
              type: 'variantSet',
              attrs: {
                variantId: 'block-1',
                activeIndex: 1,
                settled: false,
              },
              content: [
                {
                  type: 'variantOption',
                  attrs: { label: 'A' },
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'losing words should not count',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'variantOption',
                  attrs: { label: 'B' },
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', text: 'active block' },
                      ],
                    },
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', text: 'second line' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(computeMetrics(docWithVariants)).toEqual({
      totalWords: 9,
      beats: [
        {
          words: 9,
          estimatedMs: 3_600,
          targetMs: 3_600,
          ratio: 1,
        },
      ],
    });
  });
});
