import { Plugin, PluginKey, type EditorState } from 'prosemirror-state';

const revisionKey = new PluginKey<number>('revision');

export function revisionPlugin(): Plugin<number> {
  return new Plugin<number>({
    key: revisionKey,
    state: {
      init: () => 0,
      apply: (transaction, revision) => transaction.docChanged ? revision + 1 : revision,
    },
  });
}

export function getRevision(state: EditorState): number {
  return revisionKey.getState(state) ?? 0;
}
