import * as fc from 'fast-check';
import { closeHistory, redo, undo } from 'prosemirror-history';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import { addAnnotation } from '../src/annotations.js';
import { getLocks, lockRange, lockedText } from '../src/lock-guard.js';
import { exportMarkdown } from '../src/markdown-codec.js';
import {
  acceptProposal,
  getProposals,
  receiveProposal,
  rejectProposal,
  requestProposal,
} from '../src/proposals.js';
import { schema } from '../src/schema.js';
import { getParkingLot, pickActive, setActive } from '../src/variants.js';
import { beatNode, docOf, para, posOfText, stateOf } from './builders.js';
import {
  createReferenceModel,
  markProposalConflicted,
  receiveResultInModel,
  removeProposalFromModel,
  restoreReadyProposal,
  type ReferenceModel,
} from './model.js';

const LOCK_ID = 'lock_cross';
const PROPOSAL_ID = 'proposal_main';
const VARIANT_ID = 'variant_main';
const REPLACEMENT = 'rewritten middle';
const VARIANT_TEXTS = ['bright variant ending', 'quiet variant ending'] as const;
const ANNOTATION_SENTINEL = 'ANNOTATION_SENTINEL_MUST_NEVER_EXPORT';
const EXPECTED_GUIDED_CLEAN_EXPORT = [
  '## Beat 01 — Opening',
  '',
  '### Narration',
  '',
  '> alpha beta gamma delta',
  '',
  '> epsilon zeta eta theta',
  '',
  '## Beat 02 — Middle',
  '',
  '### Narration',
  '',
  '> iota kappa lambda mu',
  '',
  '## Beat 03 — Ending',
  '',
  '### Narration',
  '',
  '> nu xi omicron pi',
  '',
  '> quiet variant ending',
].join('\n');

type Operation =
  | { kind: 'insertOutside'; index: number; text: string }
  | { kind: 'insertInsideLock'; index: number; text: string }
  | { kind: 'insertInsideProposal'; index: number; text: string }
  | { kind: 'deleteSpan'; zone: 'outside' | 'lock' | 'proposal'; index: number; length: number }
  | { kind: 'receiveResult' }
  | { kind: 'tryAccept' }
  | { kind: 'reject' }
  | { kind: 'setActive'; index: number }
  | { kind: 'pick' }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'tryExport' };

type HistoryEffect = 'accept' | 'other';

const indexArbitrary = fc.integer({ min: 0, max: 100 });
const editTextArbitrary = fc.constantFrom('x', 'yy', 'zzz');
const opArbitrary: fc.Arbitrary<Operation> = fc.oneof(
  fc.record({
    kind: fc.constant('insertOutside' as const),
    index: indexArbitrary,
    text: editTextArbitrary,
  }),
  fc.record({
    kind: fc.constant('insertInsideLock' as const),
    index: indexArbitrary,
    text: editTextArbitrary,
  }),
  fc.record({
    kind: fc.constant('insertInsideProposal' as const),
    index: indexArbitrary,
    text: editTextArbitrary,
  }),
  fc.record({
    kind: fc.constant('deleteSpan' as const),
    zone: fc.constantFrom('outside' as const, 'lock' as const, 'proposal' as const),
    index: indexArbitrary,
    length: fc.integer({ min: 1, max: 3 }),
  }),
  fc.constant({ kind: 'receiveResult' as const }),
  fc.constant({ kind: 'tryAccept' as const }),
  fc.constant({ kind: 'reject' as const }),
  fc.record({ kind: fc.constant('setActive' as const), index: indexArbitrary }),
  fc.constant({ kind: 'pick' as const }),
  fc.constant({ kind: 'undo' as const }),
  fc.constant({ kind: 'redo' as const }),
  fc.constant({ kind: 'tryExport' as const }),
);

function blockVariant(): ProseMirrorNode {
  const option = (label: string, text: string) => schema.node(
    'variantOption',
    { label },
    [para(text)],
  );

  return schema.node(
    'variantSet',
    { variantId: VARIANT_ID, activeIndex: 0, settled: false },
    [option('Bright', VARIANT_TEXTS[0]), option('Quiet', VARIANT_TEXTS[1])],
  );
}

function createBaseState(): { state: EditorState; model: ReferenceModel } {
  let state = stateOf(docOf(
    beatNode('Opening', para('alpha beta gamma delta'), para('epsilon zeta eta theta')),
    beatNode('Middle', para('iota kappa lambda mu')),
    beatNode('Ending', para('nu xi omicron pi'), blockVariant()),
  ));

  const lockFrom = posOfText(state, 'gamma');
  const lockTo = posOfText(state, 'zeta') + 'zeta'.length;
  expect(lockRange(
    state,
    (transaction) => { state = state.apply(transaction); },
    { lockId: LOCK_ID, from: lockFrom, to: lockTo },
  )).toBe(true);

  const proposalFrom = posOfText(state, 'kappa');
  expect(requestProposal(
    state,
    (transaction) => { state = state.apply(transaction); },
    { id: PROPOSAL_ID, from: proposalFrom, to: proposalFrom + 'kappa lambda'.length },
  )).toBe(true);

  const annotationFrom = posOfText(state, 'alpha');
  expect(addAnnotation(
    state,
    (transaction) => { state = state.apply(transaction); },
    {
      id: 'annotation_sentinel',
      kind: 'reviewFinding',
      from: annotationFrom,
      to: annotationFrom + 'alpha'.length,
      message: ANNOTATION_SENTINEL,
    },
  )).toBe(true);

  return {
    state,
    model: createReferenceModel(
      new Map([[LOCK_ID, lockedText(state, LOCK_ID)]]),
      new Map([[PROPOSAL_ID, 'pending']]),
    ),
  };
}

function insideVariant(state: EditorState, pos: number): boolean {
  const $pos = state.doc.resolve(pos);
  for (let depth = 0; depth <= $pos.depth; depth += 1) {
    const name = $pos.node(depth).type.name;
    if (name === 'variantSet' || name === 'variantOption') return true;
  }
  return false;
}

function textInsertionPositions(
  state: EditorState,
  predicate: (pos: number) => boolean,
): number[] {
  const positions: number[] = [];

  state.doc.descendants((node, pos) => {
    if (!node.isText || insideVariant(state, pos)) return;
    for (let offset = 1; offset < node.nodeSize; offset += 1) {
      const candidate = pos + offset;
      if (predicate(candidate)) positions.push(candidate);
    }
  });

  return positions;
}

function textDeletionSpans(
  state: EditorState,
  predicate: (from: number, to: number) => boolean,
): Array<{ from: number; to: number }> {
  const spans: Array<{ from: number; to: number }> = [];

  state.doc.descendants((node, pos) => {
    if (!node.isText || insideVariant(state, pos)) return;
    for (let offset = 0; offset < node.nodeSize; offset += 1) {
      const from = pos + offset;
      const to = from + 1;
      if (predicate(from, to)) spans.push({ from, to });
    }
  });

  return spans;
}

function pickAt<T>(items: readonly T[], index: number): T | undefined {
  return items.length === 0 ? undefined : items[index % items.length];
}

function knownVariantTextRanges(state: EditorState): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText || insideVariant(state, pos)) return;
    for (const text of VARIANT_TEXTS) {
      const offset = node.text?.indexOf(text) ?? -1;
      if (offset >= 0) ranges.push({ from: pos + offset, to: pos + offset + text.length });
    }
  });
  return ranges;
}

function hasUnsettledVariant(state: EditorState): boolean {
  let unsettled = false;
  state.doc.descendants((node) => {
    if (
      (node.type.name === 'variantSet' || node.type.name === 'inlineVariantSet')
      && node.attrs.settled === false
    ) unsettled = true;
  });
  return unsettled;
}

class PropertyHarness {
  state: EditorState;
  readonly model: ReferenceModel;
  private readonly done: HistoryEffect[] = [];
  private readonly undone: HistoryEffect[] = [];

  constructor() {
    const base = createBaseState();
    this.state = base.state;
    this.model = base.model;
  }

  run(operation: Operation): void {
    switch (operation.kind) {
      case 'insertOutside':
        this.insertOutside(operation.index, operation.text);
        break;
      case 'insertInsideLock':
        this.insertInsideLock(operation.index, operation.text);
        break;
      case 'insertInsideProposal':
        this.insertInsideProposal(operation.index, operation.text);
        break;
      case 'deleteSpan':
        this.deleteSpan(operation.zone, operation.index, operation.length);
        break;
      case 'receiveResult':
        this.receiveResult();
        break;
      case 'tryAccept':
        this.tryAccept();
        break;
      case 'reject':
        this.reject();
        break;
      case 'setActive':
        this.runCommand(
          (dispatch) => setActive(this.state, dispatch, VARIANT_ID, operation.index % 2),
          'other',
        );
        break;
      case 'pick':
        this.runCommand((dispatch) => pickActive(this.state, dispatch, VARIANT_ID), 'other');
        break;
      case 'undo':
        this.undo();
        break;
      case 'redo':
        this.redo();
        break;
      case 'tryExport':
        this.assertExportInvariant();
        break;
    }

    this.assertInvariants();
  }

  assertInvariants(): void {
    for (const [lockId, expected] of this.model.lockedTexts) {
      expect(lockedText(this.state, lockId)).toBe(expected);
    }

    const actualStatuses = new Map(
      getProposals(this.state).map((proposal) => [proposal.id, proposal.status]),
    );
    expect(actualStatuses).toEqual(this.model.proposalStatus);
    this.assertExportInvariant();
  }

  assertGuidedCleanExport(): void {
    const result = exportMarkdown(this.state);
    expect(result).toEqual({ ok: true, markdown: EXPECTED_GUIDED_CLEAN_EXPORT });
  }

  private apply(transaction: Transaction, effect: HistoryEffect): boolean {
    const before = this.state.doc;
    const isolated = transaction.docChanged ? closeHistory(transaction) : transaction;
    this.state = this.state.apply(isolated);
    const changed = !this.state.doc.eq(before);
    if (changed) this.recordHistory(effect);
    return changed;
  }

  private runCommand(
    command: (dispatch: ((transaction: Transaction) => void) | undefined) => boolean,
    effect: HistoryEffect,
  ): boolean {
    let dispatched = false;
    const result = command((transaction) => {
      dispatched = true;
      this.apply(transaction, effect);
    });
    expect(result || !dispatched).toBe(true);
    return result;
  }

  private recordHistory(effect: HistoryEffect): void {
    this.done.push(effect);
    this.undone.length = 0;
  }

  private insertOutside(index: number, text: string): void {
    const locks = getLocks(this.state);
    const proposals = getProposals(this.state);
    const variantTexts = knownVariantTextRanges(this.state);
    const positions = textInsertionPositions(this.state, (pos) =>
      !locks.some((lock) => pos > lock.from && pos < lock.to)
      && !proposals.some((proposal) => pos > proposal.from && pos < proposal.to)
      && !variantTexts.some((range) => pos > range.from && pos < range.to));
    const pos = pickAt(positions, index);
    if (pos !== undefined) {
      expect(this.apply(this.state.tr.insertText(text, pos), 'other')).toBe(true);
    }
  }

  private insertInsideLock(index: number, text: string): void {
    const positions = textInsertionPositions(this.state, (pos) =>
      getLocks(this.state).some((lock) => pos > lock.from && pos < lock.to));
    const pos = pickAt(positions, index);
    if (pos === undefined) return;

    const before = this.state.doc;
    expect(this.apply(this.state.tr.insertText(text, pos), 'other')).toBe(false);
    expect(this.state.doc.eq(before)).toBe(true);
  }

  private insertInsideProposal(index: number, text: string): void {
    const proposal = getProposals(this.state).find((candidate) => candidate.id === PROPOSAL_ID);
    if (proposal === undefined) return;

    const positions = textInsertionPositions(
      this.state,
      (pos) => pos > proposal.from && pos < proposal.to,
    );
    const pos = pickAt(positions, index);
    if (pos !== undefined) {
      expect(this.apply(this.state.tr.insertText(text, pos), 'other')).toBe(true);
      markProposalConflicted(this.model, PROPOSAL_ID);
    }
  }

  private deleteSpan(
    zone: 'outside' | 'lock' | 'proposal',
    index: number,
    length: number,
  ): void {
    const locks = getLocks(this.state);
    const proposal = getProposals(this.state).find((candidate) => candidate.id === PROPOSAL_ID);
    const variantTexts = knownVariantTextRanges(this.state);
    let spans: Array<{ from: number; to: number }>;

    if (zone === 'lock') {
      spans = textDeletionSpans(this.state, (from, to) =>
        locks.some((lock) => from < lock.to && to > lock.from));
    } else if (zone === 'proposal' && proposal !== undefined) {
      spans = textDeletionSpans(this.state, (from, to) =>
        from >= proposal.from && to <= proposal.to);
    } else if (zone === 'proposal') {
      return;
    } else {
      spans = textDeletionSpans(this.state, (from, to) =>
        !locks.some((lock) => from < lock.to && to > lock.from)
        && (proposal === undefined || from >= proposal.to || to <= proposal.from)
        && !variantTexts.some((range) => from < range.to && to > range.from));
    }

    const start = pickAt(spans, index);
    if (start === undefined) return;
    let last = start;
    for (const span of spans) {
      if (span.from === last.to && span.from < start.from + length) last = span;
    }
    const before = this.state.doc;
    const changed = this.apply(this.state.tr.delete(start.from, last.to), 'other');

    if (zone === 'lock') {
      expect(changed).toBe(false);
      expect(this.state.doc.eq(before)).toBe(true);
    } else {
      expect(changed).toBe(true);
      if (zone === 'proposal') markProposalConflicted(this.model, PROPOSAL_ID);
    }
  }

  private receiveResult(): void {
    const exists = this.model.proposalStatus.has(PROPOSAL_ID);
    const result = this.runCommand(
      (dispatch) => receiveProposal(
        this.state,
        dispatch,
        { id: PROPOSAL_ID, replacement: REPLACEMENT },
      ),
      'other',
    );
    expect(result).toBe(exists);
    receiveResultInModel(this.model, PROPOSAL_ID);
  }

  private tryAccept(): void {
    const proposal = getProposals(this.state).find((candidate) => candidate.id === PROPOSAL_ID);
    const before = this.state.doc;
    const everConflicted = this.model.everConflicted.has(PROPOSAL_ID);
    const expected = proposal?.status === 'ready' && !everConflicted;
    const accepted = this.runCommand(
      (dispatch) => acceptProposal(this.state, dispatch, PROPOSAL_ID),
      'accept',
    );

    expect(accepted).toBe(expected);
    if (everConflicted) {
      expect(accepted).toBe(false);
      expect(this.state.doc.eq(before)).toBe(true);
    }
    if (!accepted || proposal === undefined) return;

    expect(this.state.doc.textBetween(
      proposal.from,
      proposal.from + REPLACEMENT.length,
    )).toBe(REPLACEMENT);
    removeProposalFromModel(this.model, PROPOSAL_ID);

    let afterUndo = this.state;
    expect(undo(afterUndo, (transaction) => { afterUndo = afterUndo.apply(transaction); })).toBe(true);
    expect(afterUndo.doc.eq(before)).toBe(true);
    const restored = getProposals(afterUndo).find((candidate) => candidate.id === PROPOSAL_ID);
    expect(restored?.status).toBe('ready');
    expect(restored?.current).toBe(restored?.fingerprint);
  }

  private reject(): void {
    const exists = this.model.proposalStatus.has(PROPOSAL_ID);
    const before = this.state.doc;
    const rejected = this.runCommand(
      (dispatch) => rejectProposal(this.state, dispatch, PROPOSAL_ID),
      'other',
    );
    expect(rejected).toBe(exists);
    expect(this.state.doc.eq(before)).toBe(true);
    removeProposalFromModel(this.model, PROPOSAL_ID);
  }

  private undo(): void {
    const before = this.state.doc;
    let next = this.state;
    undo(this.state, (transaction) => { next = this.state.apply(transaction); });
    if (next.doc.eq(before)) return;

    const effect = this.done.pop();
    expect(effect).toBeDefined();
    if (effect === undefined) return;
    this.undone.push(effect);
    this.state = next;
    if (effect === 'accept') restoreReadyProposal(this.model, PROPOSAL_ID);
  }

  private redo(): void {
    const before = this.state.doc;
    let next = this.state;
    redo(this.state, (transaction) => { next = this.state.apply(transaction); });
    if (next.doc.eq(before)) return;

    const effect = this.undone.pop();
    expect(effect).toBeDefined();
    if (effect === undefined) return;
    this.done.push(effect);
    this.state = next;
    if (effect === 'accept') removeProposalFromModel(this.model, PROPOSAL_ID);
  }

  private assertExportInvariant(): void {
    const result = exportMarkdown(this.state);
    const blocked = this.model.proposalStatus.size > 0 || hasUnsettledVariant(this.state);
    if (blocked) {
      expect(result.ok).toBe(false);
      return;
    }

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.markdown).not.toContain('variant-tab');
    expect(result.markdown).not.toContain(LOCK_ID);
    expect(result.markdown).not.toContain(PROPOSAL_ID);
    expect(result.markdown).not.toContain('annotation');
    expect(result.markdown).not.toContain(ANNOTATION_SENTINEL);

    const parked = getParkingLot(this.state).filter((entry) => entry.variantId === VARIANT_ID);
    for (const losing of parked) {
      expect(result.markdown).not.toContain(losing.text);
    }
    if (parked.length > 0) {
      const active = VARIANT_TEXTS.find((text) => !parked.some((entry) => entry.text === text));
      expect(active).toBeDefined();
      if (active !== undefined) expect(result.markdown).toContain(`> ${active}`);
    }
  }
}

describe('property harness invariants', () => {
  for (const seed of [20260722, 20260723]) {
    it(`preserves I1-I5 across generated operations (seed ${seed})`, () => {
      fc.assert(fc.property(
        fc.array(opArbitrary, { maxLength: 40 }),
        (operations) => {
          const successfulAccept = new PropertyHarness();
          successfulAccept.run({ kind: 'receiveResult' });
          successfulAccept.run({ kind: 'tryAccept' });

          const conflictedAccept = new PropertyHarness();
          conflictedAccept.run({ kind: 'insertInsideProposal', index: 0, text: 'x' });
          conflictedAccept.run({ kind: 'receiveResult' });
          conflictedAccept.run({ kind: 'tryAccept' });

          const cleanExport = new PropertyHarness();
          cleanExport.run({ kind: 'reject' });
          cleanExport.run({ kind: 'setActive', index: 1 });
          cleanExport.run({ kind: 'pick' });
          cleanExport.run({ kind: 'tryExport' });
          cleanExport.assertGuidedCleanExport();

          for (const operation of operations) {
            successfulAccept.run(operation);
            conflictedAccept.run(operation);
            cleanExport.run(operation);
          }
        },
      ), { numRuns: 250, seed });
    });
  }
});
