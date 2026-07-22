import { EditorView } from 'prosemirror-view';
import { undo } from 'prosemirror-history';
import { describe, expect, it } from 'vitest';
import { variantNodeViews } from '../src/node-views.js';
import { getParkingLot, insertBlockVariantSet, pickActive, setActive } from '../src/variants.js';
import { beatNode, docOf, para, stateOf } from './builders.js';

function withVariant() {
  let state = stateOf(docOf(beatNode('B', para('intro'))));
  insertBlockVariantSet(state, (tr) => { state = state.apply(tr); }, {
    variantId: 'V1', at: state.doc.content.size - 1,
    options: [
      { label: 'A', paragraphs: ['alpha take'] },
      { label: 'B', paragraphs: ['beta take', 'beta second'] },
    ],
  });
  return state;
}

describe('block VariantSet', () => {
  it('picks the active option atomically and parks the losers', () => {
    let state = withVariant();
    setActive(state, (tr) => { state = state.apply(tr); }, 'V1', 1);
    const before = state.doc;
    pickActive(state, (tr) => { state = state.apply(tr); }, 'V1');
    expect(state.doc.textContent).toContain('beta take');
    expect(state.doc.textContent).not.toContain('alpha take');
    expect(getParkingLot(state)).toEqual([{ variantId: 'V1', label: 'A', text: 'alpha take' }]);
    undo(state, (tr) => { state = state.apply(tr); });
    expect(state.doc.eq(before)).toBe(true);
  });

  it('renders only the active option with a tab strip', () => {
    const state = withVariant();
    const view = new EditorView(document.createElement('div'), { state, nodeViews: variantNodeViews });
    const tabs = view.dom.querySelectorAll('button.variant-tab');
    expect(tabs).toHaveLength(2);
    expect(view.dom.textContent).toContain('alpha take');
    expect(view.dom.textContent).not.toContain('beta take');
    view.destroy();
  });
});
