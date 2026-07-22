import { describe, expect, it } from 'vitest';
import { addAnnotation, getAnnotations } from '../src/annotations.js';
import { beatNode, deleteRange, docOf, insertText, para, posOfText, stateOf } from './builders.js';

function annotated() {
  let state = stateOf(docOf(beatNode('B', para('alpha beta gamma'))));
  const from = posOfText(state, 'beta');
  addAnnotation(state, (tr) => { state = state.apply(tr); },
    { id: 'A1', kind: 'reviewFinding', from, to: from + 4, message: 'flat joke' });
  return state;
}

describe('AnnotationLayer', () => {
  it('anchors and maps through preceding edits', () => {
    let state = annotated();
    state = insertText(state, posOfText(state, 'alpha'), 'zero ');
    const a = getAnnotations(state)[0]!;
    expect(state.doc.textBetween(a.from, a.to)).toBe('beta');
    expect(a.orphaned).toBe(false);
  });

  it('orphans when its range is deleted and never reattaches', () => {
    let state = annotated();
    const a0 = getAnnotations(state)[0]!;
    state = deleteRange(state, a0.from - 1, a0.to + 1);
    expect(getAnnotations(state)[0]!.orphaned).toBe(true);
    state = insertText(state, posOfText(state, 'alpha'), 'beta ');
    expect(getAnnotations(state)[0]!.orphaned).toBe(true);
  });

  it('keeps multiple annotations independent', () => {
    let state = annotated();
    const from = posOfText(state, 'gamma');
    addAnnotation(state, (tr) => { state = state.apply(tr); },
      { id: 'A2', kind: 'evidenceFlag', from, to: from + 5, message: 'verify' });
    state = deleteRange(state, posOfText(state, 'beta'), posOfText(state, 'beta') + 4);
    const [a1, a2] = getAnnotations(state);
    expect(a1!.orphaned).toBe(true);
    expect(a2!.orphaned).toBe(false);
    expect(state.doc.textBetween(a2!.from, a2!.to)).toBe('gamma');
  });
});
