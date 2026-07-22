import { undo } from 'prosemirror-history';
import { describe, expect, it } from 'vitest';
import { exportMarkdown } from '../src/markdown-codec.js';
import { acceptProposal, getProposals, receiveProposal, rejectProposal, requestProposal } from '../src/proposals.js';
import { beatNode, docOf, insertText, para, posOfText, stateOf } from './builders.js';

function ready() {
  let state = stateOf(docOf(beatNode('B', para('alpha beta gamma delta'))));
  const from = posOfText(state, 'beta');
  requestProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', from, to: from + 'beta gamma'.length });
  receiveProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', replacement: 'REPLACED TEXT' });
  return state;
}

describe('accept/reject', () => {
  it('blocks export while unresolved, applies atomically, unblocks after', () => {
    let state = ready();
    expect(exportMarkdown(state).ok).toBe(false);
    expect(acceptProposal(state, (tr) => { state = state.apply(tr); }, 'P1')).toBe(true);
    expect(state.doc.textContent).toContain('alpha REPLACED TEXT delta');
    expect(getProposals(state)).toHaveLength(0);
    expect(exportMarkdown(state).ok).toBe(true);
  });

  it('one undo restores the pre-accept document', () => {
    let state = ready();
    const before = state.doc;
    acceptProposal(state, (tr) => { state = state.apply(tr); }, 'P1');
    undo(state, (tr) => { state = state.apply(tr); });
    expect(state.doc.eq(before)).toBe(true);
  });

  it('refuses to accept a conflicted proposal and leaves the doc unchanged', () => {
    let state = ready();
    state = insertText(state, posOfText(state, 'gamma'), 'XX');
    const snapshot = state.doc;
    expect(acceptProposal(state, (tr) => { state = state.apply(tr); }, 'P1')).toBe(false);
    expect(state.doc.eq(snapshot)).toBe(true);
  });

  it('reject clears without touching the doc and unblocks export', () => {
    let state = ready();
    const snapshot = state.doc;
    rejectProposal(state, (tr) => { state = state.apply(tr); }, 'P1');
    expect(state.doc.eq(snapshot)).toBe(true);
    expect(getProposals(state)).toHaveLength(0);
    expect(exportMarkdown(state).ok).toBe(true);
  });

  it('ignores forged reject metadata and keeps export blocked', () => {
    const state = ready();
    const plugin = state.plugins.find((candidate) => {
      const pluginState: unknown = candidate.spec.key?.getState(state);
      return typeof pluginState === 'object' && pluginState !== null && 'proposals' in pluginState;
    });
    expect(plugin).toBeDefined();
    if (plugin === undefined) return;

    const after = state.apply(state.tr.setMeta(plugin, { action: 'reject', id: 'P1' }));

    expect(after.doc.eq(state.doc)).toBe(true);
    expect(getProposals(after)).toHaveLength(1);
    expect(exportMarkdown(after).ok).toBe(false);
  });
});
