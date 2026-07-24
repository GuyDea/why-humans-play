import { Schema } from 'prosemirror-model';

export const schema = new Schema({
  nodes: {
    doc: {
      attrs: {
        format: { default: 'annotated' },
        preamble: { default: '' },
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
      toDOM: (node) => [
        'pre',
        { class: 'opaque-section' },
        String(node.attrs.md),
      ] as const,
    },
    variantSet: {
      attrs: {
        variantId: {},
        originOperationId: { default: null },
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
        originOperationId: { default: null },
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
      parseDOM: [{
        tag: 'span.locked[data-lock-id]',
        getAttrs: (element) => ({ lockId: element.getAttribute('data-lock-id') }),
      }],
      toDOM: (mark) => [
        'span',
        { class: 'locked', 'data-lock-id': mark.attrs.lockId },
        0,
      ] as const,
    },
  },
});
