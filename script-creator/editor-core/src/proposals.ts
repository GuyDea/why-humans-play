import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { closeHistory, isHistoryTransaction } from 'prosemirror-history';
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

interface AcceptedProposal {
  proposal: StoredProposal;
  from: number;
  to: number;
}

interface ProposalPluginState {
  proposals: readonly StoredProposal[];
  accepted: readonly AcceptedProposal[];
}

type ProposalTransactionMeta =
  | { action: 'request'; proposal: StoredProposal }
  | { action: 'receive'; id: string; replacement: string }
  | { action: 'accept'; id: string }
  | { action: 'reject'; id: string };

type Dispatch = (transaction: Transaction) => void;

const proposalKey = new PluginKey<ProposalPluginState>('proposals');
const authorizedProposalTransactions = new WeakSet<Transaction>();

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

function mapTransactionRange(
  from: number,
  to: number,
  transaction: Transaction,
): { from: number; to: number } {
  return transaction.mapping.maps.reduce(
    (range, map) => mapRange(range.from, range.to, map),
    { from, to },
  );
}

function exactReplacementRange(
  transaction: Transaction,
  initialFrom: number,
  initialTo: number,
): { from: number; to: number } | undefined {
  let range = { from: initialFrom, to: initialTo };
  let replaced = false;

  for (const step of transaction.steps) {
    let replacement: { from: number; to: number } | undefined;
    const map = step.getMap();
    map.forEach((oldFrom, oldTo, newFrom, newTo) => {
      if (oldFrom === range.from && oldTo === range.to) {
        replacement = { from: newFrom, to: newTo };
      }
    });
    range = replacement ?? mapRange(range.from, range.to, map);
    if (replacement !== undefined) replaced = true;
  }

  return replaced ? range : undefined;
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

function validAuthorizedAction(
  transaction: Transaction,
  meta: ProposalTransactionMeta,
  pluginState: ProposalPluginState,
  oldState: EditorState,
  newState: EditorState,
): boolean {
  if (!authorizedProposalTransactions.has(transaction) || !transaction.before.eq(oldState.doc)) {
    return false;
  }

  const existing = pluginState.proposals.find((proposal) => proposal.id === (
    meta.action === 'request' ? meta.proposal.id : meta.id
  ));
  if (meta.action === 'request') {
    const { proposal } = meta;
    return transaction.steps.length === 0 && existing === undefined &&
      proposal.status === 'pending' && proposal.replacement === undefined &&
      proposal.from >= 0 && proposal.from < proposal.to && proposal.to <= oldState.doc.content.size &&
      proposal.fingerprint === textForRange(oldState.doc, proposal.from, proposal.to) &&
      proposal.baseRevision === getRevision(oldState);
  }
  if (meta.action === 'receive') {
    return transaction.steps.length === 0 && existing !== undefined;
  }
  if (meta.action === 'reject') {
    return transaction.steps.length === 0 && existing !== undefined;
  }
  if (existing?.status !== 'ready' || existing.replacement === undefined ||
      transaction.steps.length !== 1 || overlapsLock(oldState, existing) ||
      textForRange(oldState.doc, existing.from, existing.to) !== existing.fingerprint) {
    return false;
  }
  const range = exactReplacementRange(transaction, existing.from, existing.to);
  return range !== undefined &&
    textForRange(newState.doc, range.from, range.to) === existing.replacement;
}

function dispatchAuthorized(
  transaction: Transaction,
  dispatch: Dispatch | undefined,
): void {
  if (dispatch === undefined) return;
  authorizedProposalTransactions.add(transaction);
  dispatch(transaction);
}

export function proposalPlugin(): Plugin<ProposalPluginState> {
  return new Plugin<ProposalPluginState>({
    key: proposalKey,
    state: {
      init: () => ({ proposals: [], accepted: [] }),
      apply(transaction, pluginState, oldState, newState) {
        let accepted: AcceptedProposal[] = [];
        let proposals = pluginState.proposals.flatMap((proposal) => {
          const range = exactReplacementRange(transaction, proposal.from, proposal.to);
          if (isHistoryTransaction(transaction) && proposal.status === 'ready' &&
              proposal.replacement !== undefined && range !== undefined &&
              textForRange(oldState.doc, proposal.from, proposal.to) === proposal.fingerprint &&
              textForRange(newState.doc, range.from, range.to) === proposal.replacement) {
            accepted.push({ proposal, ...range });
            return [];
          }

          const next = mapProposal(proposal, transaction);
          return [next.status !== 'conflicted' && overlapsLock(newState, next)
            ? { ...next, status: 'conflicted' as const }
            : next];
        });
        const restored: StoredProposal[] = [];
        for (const entry of pluginState.accepted) {
          const range = exactReplacementRange(transaction, entry.from, entry.to);
          if (isHistoryTransaction(transaction) && range !== undefined &&
              textForRange(oldState.doc, entry.from, entry.to) === entry.proposal.replacement &&
              textForRange(newState.doc, range.from, range.to) === entry.proposal.fingerprint) {
            restored.push({
              ...entry.proposal,
              from: range.from,
              to: range.to,
              status: 'ready',
            });
          } else {
            accepted.push({
              ...entry,
              ...mapTransactionRange(entry.from, entry.to, transaction),
            });
          }
        }
        proposals.push(...restored);

        const candidateMeta = transaction.getMeta(proposalKey) as ProposalTransactionMeta | undefined;
        const meta = candidateMeta !== undefined && validAuthorizedAction(
          transaction,
          candidateMeta,
          pluginState,
          oldState,
          newState,
        ) ? candidateMeta : undefined;
        if (meta === undefined) return { proposals, accepted };

        if (meta.action === 'request') {
          return { proposals: [...proposals, meta.proposal], accepted };
        }
        if (meta.action === 'receive') {
          return {
            proposals: proposals.map((proposal) => proposal.id === meta.id
              ? {
                  ...proposal,
                  status: proposal.status === 'conflicted' ? 'conflicted' as const : 'ready' as const,
                  replacement: meta.replacement,
                }
              : proposal),
            accepted,
          };
        }
        if (meta.action === 'accept') {
          const acceptedProposal = pluginState.proposals.find((proposal) => proposal.id === meta.id);
          if (acceptedProposal !== undefined) {
            const range = mapTransactionRange(acceptedProposal.from, acceptedProposal.to, transaction);
            accepted = [...accepted, { proposal: acceptedProposal, ...range }];
          }
        }
        return {
          proposals: proposals.filter((proposal) => proposal.id !== meta.id),
          accepted,
        };
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
      (proposalKey.getState(state)?.proposals ?? []).some((proposal) => proposal.id === range.id)) return false;

  const proposal: StoredProposal = {
    ...range,
    status: 'pending',
    fingerprint: state.doc.textBetween(range.from, range.to),
    baseRevision: getRevision(state),
  };
  const transaction = state.tr
    .setMeta(proposalKey, { action: 'request', proposal } satisfies ProposalTransactionMeta)
    .setMeta('addToHistory', false);
  dispatchAuthorized(transaction, dispatch);
  return true;
}

export function receiveProposal(
  state: EditorState,
  dispatch: Dispatch | undefined,
  result: { id: string; replacement: string },
): boolean {
  if (!(proposalKey.getState(state)?.proposals ?? []).some((proposal) => proposal.id === result.id)) return false;

  const transaction = state.tr
    .setMeta(proposalKey, { action: 'receive', ...result } satisfies ProposalTransactionMeta)
    .setMeta('addToHistory', false);
  dispatchAuthorized(transaction, dispatch);
  return true;
}

export function acceptProposal(
  state: EditorState,
  dispatch: Dispatch | undefined,
  id: string,
): boolean {
  const proposal = proposalKey.getState(state)?.proposals.find((candidate) => candidate.id === id);
  if (proposal?.status !== 'ready' || proposal.replacement === undefined ||
      textForRange(state.doc, proposal.from, proposal.to) !== proposal.fingerprint ||
      overlapsLock(state, proposal)) return false;

  // Isolate acceptance from history events on both sides while dispatching only one transaction.
  const transaction = closeHistory(state.tr
    .insertText(proposal.replacement, proposal.from, proposal.to)
    .setMeta(proposalKey, { action: 'accept', id } satisfies ProposalTransactionMeta)
    .setTime(0));
  dispatchAuthorized(transaction, dispatch);
  return true;
}

export function rejectProposal(
  state: EditorState,
  dispatch: Dispatch | undefined,
  id: string,
): boolean {
  if (!(proposalKey.getState(state)?.proposals ?? []).some((proposal) => proposal.id === id)) return false;

  const transaction = state.tr
    .setMeta(proposalKey, { action: 'reject', id } satisfies ProposalTransactionMeta)
    .setMeta('addToHistory', false);
  dispatchAuthorized(transaction, dispatch);
  return true;
}

export function pendingProposalIds(state: EditorState): string[] {
  return (proposalKey.getState(state)?.proposals ?? []).map((proposal) => proposal.id);
}

export function getProposals(state: EditorState): Proposal[] {
  return (proposalKey.getState(state)?.proposals ?? []).map((proposal) => ({
    ...proposal,
    current: textForRange(state.doc, proposal.from, proposal.to),
  }));
}
