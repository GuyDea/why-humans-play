import { describe, expect, it } from 'vitest';
import { lockRange } from '../src/lock-guard.js';
import { getProposals, receiveProposal, requestProposal } from '../src/proposals.js';
import { beatNode, deleteRange, docOf, insertText, para, posOfText, stateOf } from './builders.js';

function withProposal() {
  let state = stateOf(docOf(beatNode('B', para('alpha beta gamma delta'))));
  const from = posOfText(state, 'beta');
  requestProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', from, to: from + 'beta gamma'.length });
  return state;
}

describe('ProposalLayer tracking', () => {
  it('re-anchors through edits before the target', () => {
    let state = withProposal();
    state = insertText(state, posOfText(state, 'alpha'), 'zero ');
    receiveProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', replacement: 'REPL' });
    const p = getProposals(state)[0]!;
    expect(p.status).toBe('ready');
    expect(state.doc.textBetween(p.from, p.to)).toBe('beta gamma');
  });

  it('conflicts on edits inside the target and stays conflicted', () => {
    let state = withProposal();
    state = insertText(state, posOfText(state, 'gamma'), 'XX');
    expect(getProposals(state)[0]!.status).toBe('conflicted');
    receiveProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', replacement: 'REPL' });
    const p = getProposals(state)[0]!;
    expect(p.status).toBe('conflicted');
    expect(p.fingerprint).toBe('beta gamma');
    expect(p.current).toContain('XX');
  });

  it('conflicts when the target is deleted', () => {
    let state = withProposal();
    const p0 = getProposals(state)[0]!;
    state = deleteRange(state, p0.from - 1, p0.to + 1);
    expect(getProposals(state)[0]!.status).toBe('conflicted');
  });

  it('conflicts when a lock later covers the target', () => {
    let state = withProposal();
    const p0 = getProposals(state)[0]!;
    lockRange(state, (tr) => { state = state.apply(tr); }, { lockId: 'L1', from: p0.from, to: p0.to });
    expect(getProposals(state)[0]!.status).toBe('conflicted');
  });

  it('edits after the target leave it ready', () => {
    let state = withProposal();
    state = insertText(state, posOfText(state, 'delta') + 5, ' end');
    receiveProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', replacement: 'REPL' });
    expect(getProposals(state)[0]!.status).toBe('ready');
  });
});
