import { EditorView } from 'prosemirror-view';
import { describe, expect, it } from 'vitest';
import { exportMarkdown } from '../src/markdown-codec.js';
import { variantNodeViews } from '../src/node-views.js';
import { getParkingLot, insertInlineVariantSet, pickActive, setActive } from '../src/variants.js';
import { beatNode, docOf, para, posOfText, stateOf } from './builders.js';

function withInline() {
  let state = stateOf(docOf(beatNode('B', para('the joke goes here'))));
  insertInlineVariantSet(state, (tr) => { state = state.apply(tr); }, {
    variantId: 'IV1', at: posOfText(state, 'here'),
    options: [{ label: 'A', text: 'flatly' }, { label: 'B', text: 'like furniture instructions' }],
  });
  return state;
}

describe('inline VariantSet', () => {
  it('blocks export until settled, picks to plain text, parks the loser', () => {
    let state = withInline();
    expect(exportMarkdown(state).ok).toBe(false);
    setActive(state, (tr) => { state = state.apply(tr); }, 'IV1', 1);
    pickActive(state, (tr) => { state = state.apply(tr); }, 'IV1');
    expect(state.doc.textContent).toContain('like furniture instructions');
    expect(getParkingLot(state)).toContainEqual({ variantId: 'IV1', label: 'A', text: 'flatly' });
    expect(exportMarkdown(state).ok).toBe(true);
  });

  it('renders the active text with a cycle control', () => {
    const state = withInline();
    const view = new EditorView(document.createElement('div'), { state, nodeViews: variantNodeViews });
    expect(view.dom.querySelectorAll('button.variant-cycle')).toHaveLength(1);
    expect(view.dom.textContent).toContain('flatly');
    view.destroy();
  });
});
