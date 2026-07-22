import { history } from 'prosemirror-history';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState, type Plugin, type Transaction } from 'prosemirror-state';
import { newBeatId } from '../src/ids.js';
import { schema } from '../src/schema.js';

function corePlugins(): Plugin[] {
  return [history()];
}

export function para(text: string): ProseMirrorNode {
  return schema.node('paragraph', null, text ? schema.text(text) : undefined);
}

export function beatNode(title: string, ...children: ProseMirrorNode[]): ProseMirrorNode {
  return schema.node(
    'beat',
    { beatId: newBeatId(), title, timeTargetMs: 30000 },
    children,
  );
}

export function docOf(...beats: ProseMirrorNode[]): ProseMirrorNode {
  return schema.node('doc', null, beats);
}

export function stateOf(doc: ProseMirrorNode): EditorState {
  return EditorState.create({ doc, plugins: corePlugins() });
}

export function apply(state: EditorState, tr: Transaction): EditorState {
  return state.apply(tr);
}

export function insertText(state: EditorState, pos: number, text: string): EditorState {
  return apply(state, state.tr.insertText(text, pos));
}

export function deleteRange(state: EditorState, from: number, to: number): EditorState {
  return apply(state, state.tr.delete(from, to));
}

export function docText(state: EditorState): string {
  return state.doc.textContent;
}

export function posOfText(state: EditorState, needle: string): number {
  let found: number | undefined;

  state.doc.descendants((node, pos) => {
    if (found !== undefined || !node.isText) return;

    const offset = node.text?.indexOf(needle) ?? -1;
    if (offset >= 0) found = pos + offset;
  });

  if (found === undefined) throw new Error(`Text not found: ${needle}`);
  return found;
}
