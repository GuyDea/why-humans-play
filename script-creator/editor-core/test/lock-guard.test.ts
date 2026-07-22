import { undo } from 'prosemirror-history';
import { EditorView } from 'prosemirror-view';
import { describe, expect, it } from 'vitest';
import { getLocks, lockRange, lockedText, unlockRange } from '../src/lock-guard.js';
import { variantNodeViews } from '../src/node-views.js';
import { getRevision } from '../src/revision.js';
import { beatNode, docOf, deleteRange, insertText, para, posOfText, stateOf } from './builders.js';

function locked(stateDoc = docOf(beatNode('B', para('alpha beta gamma'), para('delta epsilon')))) {
  let state = stateOf(stateDoc);
  const from = posOfText(state, 'beta');
  const to = posOfText(state, 'delta') + 'delta'.length;
  lockRange(state, (tr) => { state = state.apply(tr); }, { lockId: 'L1', from, to });
  return { state, from, to };
}

describe('LockGuard', () => {
  it('renders a locked range with its lock id', () => {
    const { state } = locked();
    const view = new EditorView(document.createElement('div'), { state, nodeViews: variantNodeViews });
    const lock = view.dom.querySelector('span.locked');
    expect(lock).not.toBeNull();
    expect(lock?.getAttribute('data-lock-id')).toBe('L1');
    view.destroy();
  });

  it('locks a cross-paragraph range and rejects edits inside it', () => {
    let { state } = locked();
    const before = lockedText(state, 'L1');
    const inside = posOfText(state, 'gamma');
    const attempt = insertText(state, inside, 'XX');
    expect(attempt.doc.eq(state.doc)).toBe(true);           // rejected
    expect(lockedText(attempt, 'L1')).toBe(before);
  });

  it('rejects deletions overlapping the lock boundary', () => {
    let { state, from } = locked();
    const attempt = deleteRange(state, from - 2, from + 2);
    expect(attempt.doc.eq(state.doc)).toBe(true);
  });

  it('allows edits before and after, and ranges map through them', () => {
    let { state } = locked();
    const before = lockedText(state, 'L1');
    state = insertText(state, posOfText(state, 'alpha'), 'zero ');
    expect(state.doc.textContent).toContain('zero alpha');
    expect(lockedText(state, 'L1')).toBe(before);
    state = insertText(state, posOfText(state, 'epsilon') + 'epsilon'.length, ' zeta');
    expect(lockedText(state, 'L1')).toBe(before);
    expect(getLocks(state)).toHaveLength(1);
  });

  it('unlock then edit succeeds; plain removeMark does not unlock', () => {
    let { state, from, to } = locked();
    const sneaky = state.apply(state.tr.removeMark(from, to, state.schema.marks.lock!.create({ lockId: 'L1' })));
    expect(lockedText(sneaky, 'L1')).not.toBe('');           // rejected removal
    unlockRange(state, (tr) => { state = state.apply(tr); }, 'L1');
    expect(getLocks(state)).toHaveLength(0);
    const edited = insertText(state, posOfText(state, 'gamma'), 'XX');
    expect(edited.doc.textContent).toContain('XXgamma');
  });

  it('rejects raw removeMark even with forged unlock metadata', () => {
    const { state, from, to } = locked();
    const plugin = state.plugins.find((candidate) => candidate.spec.filterTransaction !== undefined);
    expect(plugin).toBeDefined();
    if (plugin === undefined) return;

    const forged = state.tr
      .removeMark(from, to, state.schema.marks.lock!.create({ lockId: 'L1' }))
      .setMeta(plugin, { action: 'unlock', lockId: 'L1' });
    const after = state.apply(forged);

    expect(after.doc.eq(state.doc)).toBe(true);
    expect(lockedText(after, 'L1')).toBe(lockedText(state, 'L1'));
  });

  it('blocks undo that would mutate a later-locked range, and counts revisions', () => {
    let state = stateOf(docOf(beatNode('B', para('one two three'))));
    const r0 = getRevision(state);
    state = insertText(state, posOfText(state, 'two'), 'X');
    expect(getRevision(state)).toBe(r0 + 1);
    const from = posOfText(state, 'Xtwo');
    lockRange(state, (tr) => { state = state.apply(tr); }, { lockId: 'L2', from, to: from + 4 });
    const lockedBefore = lockedText(state, 'L2');
    let after = state;
    undo(after, (tr) => { after = after.apply(tr); });
    expect(lockedText(after, 'L2')).toBe(lockedBefore);      // undo rejected or lock intact
  });
});
