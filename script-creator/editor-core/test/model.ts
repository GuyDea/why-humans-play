export type ReferenceProposalStatus = 'pending' | 'ready' | 'conflicted';

export interface ReferenceModel {
  lockedTexts: Map<string, string>;
  proposalStatus: Map<string, ReferenceProposalStatus>;
  everConflicted: Set<string>;
}

export function createReferenceModel(
  lockedTexts: Map<string, string>,
  proposalStatus: Map<string, ReferenceProposalStatus>,
): ReferenceModel {
  return {
    lockedTexts: new Map(lockedTexts),
    proposalStatus: new Map(proposalStatus),
    everConflicted: new Set(),
  };
}

export function markProposalConflicted(model: ReferenceModel, id: string): void {
  if (!model.proposalStatus.has(id)) return;
  model.proposalStatus.set(id, 'conflicted');
  model.everConflicted.add(id);
}

export function receiveResultInModel(model: ReferenceModel, id: string): void {
  const status = model.proposalStatus.get(id);
  if (status === undefined || status === 'conflicted') return;
  model.proposalStatus.set(id, 'ready');
}

export function removeProposalFromModel(model: ReferenceModel, id: string): void {
  model.proposalStatus.delete(id);
}

export function restoreReadyProposal(model: ReferenceModel, id: string): void {
  model.proposalStatus.set(id, model.everConflicted.has(id) ? 'conflicted' : 'ready');
}
