import { describe, expect, it } from 'vitest';
import { newBeatId } from '../src/ids.js';
import { schema } from '../src/schema.js';
import { beatNode, docOf, insertText, para, posOfText, stateOf } from './builders.js';

describe('schema', () => {
  it('builds a valid script document', () => {
    const doc = docOf(beatNode('Hook', para('An AI flipped a block.'), para('It got the reward.')));
    expect(doc.check()).toBeUndefined();
    expect(doc.childCount).toBe(1);
    expect(doc.child(0).attrs.beatId).toMatch(/^beat_[a-z2-7]{10}$/);
    expect(doc.child(0).attrs.timeTargetMs).toBe(30000);
  });

  it('rejects narration outside beats', () => {
    expect(() => schema.node('doc', null, [schema.node('paragraph')])).toThrow();
  });

  it('generates unique conforming beat ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newBeatId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^beat_[a-z2-7]{10}$/);
  });

  it('edit helpers insert and locate text', () => {
    let state = stateOf(docOf(beatNode('B', para('hello world'))));
    const pos = posOfText(state, 'world');
    state = insertText(state, pos, 'brave ');
    expect(state.doc.textContent).toContain('hello brave world');
  });
});
