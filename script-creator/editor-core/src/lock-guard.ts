import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { Plugin, PluginKey, type EditorState, type Transaction } from 'prosemirror-state';

export interface LockRange {
  lockId: string;
  from: number;
  to: number;
}

interface LockTransactionMeta {
  action: 'lock' | 'unlock';
  lockId: string;
}

type Dispatch = (transaction: Transaction) => void;

const lockGuardKey = new PluginKey('lockGuard');

function locksInDocument(doc: ProseMirrorNode): LockRange[] {
  const locks = new Map<string, LockRange>();

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    for (const mark of node.marks) {
      if (mark.type.name !== 'lock' || typeof mark.attrs.lockId !== 'string') continue;

      const lockId = mark.attrs.lockId;
      const existing = locks.get(lockId);
      const to = pos + node.nodeSize;
      if (existing) {
        existing.from = Math.min(existing.from, pos);
        existing.to = Math.max(existing.to, to);
      } else {
        locks.set(lockId, { lockId, from: pos, to });
      }
    }
  });

  return [...locks.values()].sort((left, right) =>
    left.from - right.from || left.to - right.to || left.lockId.localeCompare(right.lockId));
}

function sameLocks(left: readonly LockRange[], right: readonly LockRange[]): boolean {
  return left.length === right.length && left.every((lock, index) => {
    const other = right[index];
    return other !== undefined && lock.lockId === other.lockId &&
      lock.from === other.from && lock.to === other.to;
  });
}

function mappedLocks(state: EditorState, transaction: Transaction): LockRange[] {
  return locksInDocument(state.doc).map((lock) => ({
    lockId: lock.lockId,
    from: transaction.mapping.map(lock.from, 1),
    to: transaction.mapping.map(lock.to, -1),
  })).filter((lock) => lock.from < lock.to).sort((left, right) =>
    left.from - right.from || left.to - right.to || left.lockId.localeCompare(right.lockId));
}

function changesLockedContent(transaction: Transaction): boolean {
  return transaction.steps.some((step, index) => {
    const beforeStep = transaction.docs[index];
    if (beforeStep === undefined) return false;
    const locks = locksInDocument(beforeStep);
    let overlaps = false;

    step.getMap().forEach((oldStart, oldEnd) => {
      if (overlaps) return;
      overlaps = locks.some((lock) => oldStart === oldEnd
        ? oldStart > lock.from && oldStart < lock.to
        : oldStart < lock.to && oldEnd > lock.from);
    });

    return overlaps;
  });
}

function hasAuthorizedLockMeta(transaction: Transaction): boolean {
  const meta = transaction.getMeta(lockGuardKey) as LockTransactionMeta | undefined;
  return meta?.action === 'lock' || meta?.action === 'unlock';
}

export function lockGuardPlugin(): Plugin {
  return new Plugin({
    key: lockGuardKey,
    filterTransaction(transaction, state) {
      if (changesLockedContent(transaction)) return false;
      if (hasAuthorizedLockMeta(transaction)) return true;
      return sameLocks(mappedLocks(state, transaction), locksInDocument(transaction.doc));
    },
  });
}

export function lockRange(
  state: EditorState,
  dispatch: Dispatch | undefined,
  range: LockRange,
): boolean {
  const lockMark = state.schema.marks.lock;
  if (lockMark === undefined || range.from < 0 || range.from >= range.to ||
      range.to > state.doc.content.size) return false;

  const transaction = state.tr
    .addMark(range.from, range.to, lockMark.create({ lockId: range.lockId }))
    .setMeta(lockGuardKey, { action: 'lock', lockId: range.lockId } satisfies LockTransactionMeta)
    .setMeta('addToHistory', false);
  if (transaction.steps.length === 0) return false;
  dispatch?.(transaction);
  return true;
}

export function unlockRange(
  state: EditorState,
  dispatch: Dispatch | undefined,
  lockId: string,
): boolean {
  const lockMark = state.schema.marks.lock;
  const ranges = getLocks(state).filter((lock) => lock.lockId === lockId);
  if (lockMark === undefined || ranges.length === 0) return false;

  const transaction = ranges.reduce(
    (current, range) => current.removeMark(
      range.from,
      range.to,
      lockMark.create({ lockId }),
    ),
    state.tr,
  ).setMeta(lockGuardKey, { action: 'unlock', lockId } satisfies LockTransactionMeta)
    .setMeta('addToHistory', false);
  dispatch?.(transaction);
  return true;
}

export function getLocks(state: EditorState): LockRange[] {
  return locksInDocument(state.doc);
}

export function lockedText(state: EditorState, lockId: string): string {
  return getLocks(state)
    .filter((lock) => lock.lockId === lockId)
    .map((lock) => state.doc.textBetween(lock.from, lock.to))
    .join('');
}
