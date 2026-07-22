import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { Plugin, PluginKey, type EditorState, type Transaction } from 'prosemirror-state';
import type { StepMap } from 'prosemirror-transform';
import { getLocks } from './lock-guard.js';
import { getRevision } from './revision.js';

export type ProposalStatus = 'pending' | 'ready' | 'conflicted';

export interface Proposal {
  id: string;
  from: number;
  to: number;
  status: ProposalStatus;
  fingerprint: string;
  replacement?: string;
  baseRevision: number;
  current?: string;
}

interface StoredProposal extends Omit<Proposal, 'current'> {}

type ProposalTransactionMeta =
  | { action: 'request'; proposal: StoredProposal }
  | { action: 'receive'; id: string; replacement: string };

type Dispatch = (transaction: Transaction) => void;

const proposalKey = new PluginKey<readonly StoredProposal[]>('proposals');

function mapRange(from: number, to: number, map: StepMap): { from: number; to: number } {
  const mappedFrom = map.map(from, 1);
  const mappedTo = map.map(to, -1);
  if (mappedFrom < mappedTo) return { from: mappedFrom, to: mappedTo };

  const deletionPoint = Math.min(mappedFrom, mappedTo);
  return { from: deletionPoint, to: deletionPoint };
}

function textForRange(doc: ProseMirrorNode, from: number, to: number): string {
  return from < to ? doc.textBetween(from, to) : '';
}

function mapProposal(proposal: StoredProposal, transaction: Transaction): StoredProposal {
  let { from, to } = proposal;
  let conflicted = proposal.status === 'conflicted';

  transaction.steps.forEach((step, index) => {
    const before = transaction.docs[index];
    const after = transaction.docs[index + 1] ?? transaction.doc;
    const mapped = mapRange(from, to, step.getMap());

    if (!conflicted && before !== undefined &&
        textForRange(before, from, to) !== textForRange(after, mapped.from, mapped.to)) {
      conflicted = true;
    }

    ({ from, to } = mapped);
  });

  return {
    ...proposal,
    from,
    to,
    status: conflicted ? 'conflicted' : proposal.status,
  };
}

function overlapsLock(state: EditorState, proposal: StoredProposal): boolean {
  return getLocks(state).some((lock) =>
    lock.from < proposal.to && lock.to > proposal.from);
}

export function proposalPlugin(): Plugin<readonly StoredProposal[]> {
  return new Plugin<readonly StoredProposal[]>({
    key: proposalKey,
    state: {
      init: () => [],
      apply(transaction, proposals, _oldState, newState) {
        const mapped = proposals.map((proposal) => {
          const next = mapProposal(proposal, transaction);
          return next.status !== 'conflicted' && overlapsLock(newState, next)
            ? { ...next, status: 'conflicted' as const }
            : next;
        });
        const meta = transaction.getMeta(proposalKey) as ProposalTransactionMeta | undefined;
        if (meta === undefined) return mapped;

        if (meta.action === 'request') return [...mapped, meta.proposal];
        return mapped.map((proposal) => proposal.id === meta.id
          ? {
              ...proposal,
              status: proposal.status === 'conflicted' ? 'conflicted' as const : 'ready' as const,
              replacement: meta.replacement,
            }
          : proposal);
      },
    },
  });
}

export function requestProposal(
  state: EditorState,
  dispatch: Dispatch | undefined,
  range: { id: string; from: number; to: number },
): boolean {
  if (range.from < 0 || range.from >= range.to || range.to > state.doc.content.size ||
      (proposalKey.getState(state) ?? []).some((proposal) => proposal.id === range.id)) return false;

  const proposal: StoredProposal = {
    ...range,
    status: 'pending',
    fingerprint: state.doc.textBetween(range.from, range.to),
    baseRevision: getRevision(state),
  };
  dispatch?.(state.tr
    .setMeta(proposalKey, { action: 'request', proposal } satisfies ProposalTransactionMeta)
    .setMeta('addToHistory', false));
  return true;
}

export function receiveProposal(
  state: EditorState,
  dispatch: Dispatch | undefined,
  result: { id: string; replacement: string },
): boolean {
  if (!(proposalKey.getState(state) ?? []).some((proposal) => proposal.id === result.id)) return false;

  dispatch?.(state.tr
    .setMeta(proposalKey, { action: 'receive', ...result } satisfies ProposalTransactionMeta)
    .setMeta('addToHistory', false));
  return true;
}

export function getProposals(state: EditorState): Proposal[] {
  return (proposalKey.getState(state) ?? []).map((proposal) => ({
    ...proposal,
    current: textForRange(state.doc, proposal.from, proposal.to),
  }));
}
