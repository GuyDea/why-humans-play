import { Schema } from 'prosemirror-model';

export const schema = new Schema({
  nodes: {
    doc: {
      content: 'beat+',
    },
    beat: {
      attrs: {
        beatId: { default: null },
        title: { default: '' },
        timeTargetMs: { default: 30000 },
      },
      content: '(paragraph | variantSet | opaqueSection)+',
    },
    paragraph: {
      content: 'inline*',
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
