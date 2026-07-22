import { Plugin, PluginKey, type EditorState, type Transaction } from 'prosemirror-state';

export type AnnotationKind = 'reviewFinding' | 'evidenceFlag';

export interface Annotation {
  id: string;
  kind: AnnotationKind;
  from: number;
  to: number;
  message: string;
  orphaned: boolean;
}

export type AnnotationInput = Omit<Annotation, 'orphaned'>;

interface AnnotationTransactionMeta {
  annotation: AnnotationInput;
}

type Dispatch = (transaction: Transaction) => void;

const annotationKey = new PluginKey<readonly Annotation[]>('annotations');

function mapAnnotation(annotation: Annotation, transaction: Transaction): Annotation {
  if (annotation.orphaned || !transaction.docChanged) return annotation;

  const from = transaction.mapping.map(annotation.from, 1);
  const to = transaction.mapping.map(annotation.to, -1);
  if (from >= to) {
    const deletionPoint = Math.min(from, to);
    return { ...annotation, from: deletionPoint, to: deletionPoint, orphaned: true };
  }

  return { ...annotation, from, to };
}

export function annotationPlugin(): Plugin<readonly Annotation[]> {
  return new Plugin<readonly Annotation[]>({
    key: annotationKey,
    state: {
      init: () => [],
      apply(transaction, annotations) {
        const mapped = annotations.map((annotation) => mapAnnotation(annotation, transaction));
        const meta = transaction.getMeta(annotationKey) as AnnotationTransactionMeta | undefined;
        if (meta === undefined) return mapped;
        return [...mapped, { ...meta.annotation, orphaned: false }];
      },
    },
  });
}

export function addAnnotation(
  state: EditorState,
  dispatch: Dispatch | undefined,
  annotation: AnnotationInput,
): boolean {
  if (annotation.from < 0 || annotation.from >= annotation.to ||
      annotation.to > state.doc.content.size) return false;

  dispatch?.(state.tr
    .setMeta(annotationKey, { annotation } satisfies AnnotationTransactionMeta)
    .setMeta('addToHistory', false));
  return true;
}

export function getAnnotations(state: EditorState): Annotation[] {
  return (annotationKey.getState(state) ?? []).map((annotation) => ({ ...annotation }));
}
