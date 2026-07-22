import { Schema } from 'prosemirror-model';

export const schema = new Schema({
  nodes: {
    doc: {
      attrs: {
        format: { default: 'annotated' },
      },
      content: 'beat+',
    },
    beat: {
      attrs: {
        beatId: { default: null },
        title: { default: '' },
        timeTargetMs: { default: 30000 },
      },
      content: '(paragraph | variantSet | opaqueSection)+',
      toDOM: () => ['section', 0] as const,
    },
    paragraph: {
      content: 'inline*',
      toDOM: () => ['p', 0] as const,
    },
    text: {
      group: 'inline',
    },
    opaqueSection: {
      atom: true,
      attrs: {
        md: {},
      },
    },
    variantSet: {
      attrs: {
        variantId: {},
        activeIndex: {},
        settled: {},
      },
      content: 'variantOption+',
    },
    variantOption: {
      attrs: {
        label: { default: '' },
      },
      content: 'paragraph+',
    },
    inlineVariantSet: {
      inline: true,
      atom: true,
      group: 'inline',
      attrs: {
        variantId: {},
        activeIndex: {},
        settled: {},
        options: {},
      },
    },
  },
  marks: {
    lock: {
      attrs: {
        lockId: {},
      },
      inclusive: false,
      excludes: '',
    },
  },
});
