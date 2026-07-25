import { Fragment, type Node as ProseMirrorNode } from 'prosemirror-model';
import { closeHistory, isHistoryTransaction } from 'prosemirror-history';
import { Plugin, PluginKey, type EditorState, type Transaction } from 'prosemirror-state';

export interface ParkingLotEntry {
  variantId: string;
  label: string;
  text: string;
}

interface BlockVariantOptionInput {
  label: string;
  paragraphs: string[];
}

interface InsertBlockVariantSetOptions {
  variantId: string;
  originOperationId?: string | null;
  at: number;
  options: BlockVariantOptionInput[];
}

interface InlineVariantOptionInput {
  label: string;
  text: string;
}

interface InsertInlineVariantSetOptions {
  variantId: string;
  originOperationId?: string | null;
  at: number;
  options: InlineVariantOptionInput[];
}

interface LocatedVariantSet {
  node: ProseMirrorNode;
  pos: number;
}

interface ParkingLotTransactionMeta {
  action: 'pick';
  variantId: string;
  entries: ParkingLotEntry[];
  from: number;
  to: number;
}

interface PickHistoryEntry {
  variantId: string;
  entries: readonly ParkingLotEntry[];
  original: ProseMirrorNode;
  chosen: Fragment;
  from: number;
  to: number;
}

interface VariantPluginState {
  entries: readonly ParkingLotEntry[];
  picked: readonly PickHistoryEntry[];
  undone: readonly PickHistoryEntry[];
}

type Dispatch = (transaction: Transaction) => void;

const parkingLotKey = new PluginKey<VariantPluginState>('variantParkingLot');

function mapRange(
  from: number,
  to: number,
  transaction: Transaction,
): { from: number; to: number } {
  return {
    from: transaction.mapping.map(from, 1),
    to: transaction.mapping.map(to, -1),
  };
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
    if (replacement !== undefined) {
      range = replacement;
      replaced = true;
    } else {
      range = {
        from: map.map(range.from, 1),
        to: map.map(range.to, -1),
      };
    }
  }

  return replaced ? range : undefined;
}

function sliceEquals(
  doc: ProseMirrorNode,
  from: number,
  to: number,
  expected: Fragment,
): boolean {
  return from <= to && doc.slice(from, to).content.eq(expected);
}

function mappedEntry(entry: PickHistoryEntry, transaction: Transaction): PickHistoryEntry {
  return { ...entry, ...mapRange(entry.from, entry.to, transaction) };
}

function replaceVariantEntries(
  current: readonly ParkingLotEntry[],
  variantId: string,
  replacements: readonly ParkingLotEntry[],
): ParkingLotEntry[] {
  return [
    ...current.filter((entry) => entry.variantId !== variantId),
    ...replacements,
  ];
}

function findVariantSet(state: EditorState, variantId: string): LocatedVariantSet | undefined {
  let found: LocatedVariantSet | undefined;

  state.doc.descendants((node, pos) => {
    if (found !== undefined) return false;
    if (
      (node.type.name === 'variantSet' || node.type.name === 'inlineVariantSet')
      && node.attrs.variantId === variantId
    ) {
      found = { node, pos };
      return false;
    }
    return true;
  });

  return found;
}

function inlineOptions(node: ProseMirrorNode): InlineVariantOptionInput[] | undefined {
  const options: unknown = node.attrs.options;
  if (!Array.isArray(options) || !options.every((option) => (
    typeof option === 'object' && option !== null
    && 'label' in option && typeof option.label === 'string'
    && 'text' in option && typeof option.text === 'string'
  ))) return undefined;
  return options;
}

function optionCount(node: ProseMirrorNode): number {
  return node.type.name === 'inlineVariantSet'
    ? inlineOptions(node)?.length ?? 0
    : node.childCount;
}

function activeIndex(node: ProseMirrorNode): number | undefined {
  const activeIndex = node.attrs.activeIndex;
  return Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex < optionCount(node)
    ? activeIndex as number
    : undefined;
}

export function variantPlugin(): Plugin<VariantPluginState> {
  return new Plugin<VariantPluginState>({
    key: parkingLotKey,
    state: {
      init: () => ({ entries: [], picked: [], undone: [] }),
      apply(transaction, pluginState, oldState, newState) {
        let entries = [...pluginState.entries];
        const picked: PickHistoryEntry[] = [];
        const undone: PickHistoryEntry[] = [];

        for (const entry of pluginState.picked) {
          const replacement = exactReplacementRange(transaction, entry.from, entry.to);
          if (isHistoryTransaction(transaction) && replacement !== undefined &&
              sliceEquals(oldState.doc, entry.from, entry.to, entry.chosen) &&
              sliceEquals(newState.doc, replacement.from, replacement.to, Fragment.from(entry.original))) {
            entries = replaceVariantEntries(entries, entry.variantId, []);
            undone.push({ ...entry, ...replacement });
          } else {
            picked.push(mappedEntry(entry, transaction));
          }
        }

        for (const entry of pluginState.undone) {
          const replacement = exactReplacementRange(transaction, entry.from, entry.to);
          if (isHistoryTransaction(transaction) && replacement !== undefined &&
              sliceEquals(oldState.doc, entry.from, entry.to, Fragment.from(entry.original)) &&
              sliceEquals(newState.doc, replacement.from, replacement.to, entry.chosen)) {
            entries = replaceVariantEntries(entries, entry.variantId, entry.entries);
            picked.push({ ...entry, ...replacement });
          } else {
            undone.push(mappedEntry(entry, transaction));
          }
        }

        const meta = transaction.getMeta(parkingLotKey) as ParkingLotTransactionMeta | undefined;
        if (meta?.action === 'pick') {
          const original = oldState.doc.nodeAt(meta.from);
          const replacement = exactReplacementRange(transaction, meta.from, meta.to);
          if (original !== null && replacement !== undefined &&
              (original.type.name === 'variantSet' || original.type.name === 'inlineVariantSet') &&
              original.attrs.variantId === meta.variantId) {
            entries = replaceVariantEntries(entries, meta.variantId, meta.entries);
            picked.push({
              variantId: meta.variantId,
              entries: meta.entries.map((entry) => ({ ...entry })),
              original,
              chosen: newState.doc.slice(replacement.from, replacement.to).content,
              ...replacement,
            });
            return {
              entries,
              picked,
              undone: undone.filter((entry) => entry.variantId !== meta.variantId),
            };
          }
        }
        return { entries, picked, undone };
      },
    },
  });
}

export function insertBlockVariantSet(
  state: EditorState,
  dispatch: Dispatch | undefined,
  input: InsertBlockVariantSetOptions,
): boolean {
  const variantSetType = state.schema.nodes.variantSet;
  const variantOptionType = state.schema.nodes.variantOption;
  const paragraphType = state.schema.nodes.paragraph;
  if (variantSetType === undefined || variantOptionType === undefined || paragraphType === undefined ||
      input.at < 0 || input.at > state.doc.content.size || input.options.length === 0 ||
      input.options.some((option) => option.paragraphs.length === 0)) return false;

  const $at = state.doc.resolve(input.at);
  if (!$at.parent.canReplaceWith($at.index(), $at.index(), variantSetType)) return false;

  const options = input.options.map((option) => variantOptionType.createChecked(
    { label: option.label },
    option.paragraphs.map((text) => paragraphType.createChecked(
      null,
      text ? state.schema.text(text) : undefined,
    )),
  ));
  const variantSet = variantSetType.createChecked(
    {
      variantId: input.variantId,
      originOperationId: input.originOperationId ?? null,
      activeIndex: 0,
      settled: false,
    },
    options,
  );

  dispatch?.(state.tr.insert(input.at, variantSet));
  return true;
}

export function insertInlineVariantSet(
  state: EditorState,
  dispatch: Dispatch | undefined,
  input: InsertInlineVariantSetOptions,
): boolean {
  const inlineVariantSetType = state.schema.nodes.inlineVariantSet;
  if (inlineVariantSetType === undefined || input.at < 0 || input.at > state.doc.content.size ||
      input.options.length === 0) return false;

  const $at = state.doc.resolve(input.at);
  if (!$at.parent.canReplaceWith($at.index(), $at.index(), inlineVariantSetType)) return false;

  const inlineVariantSet = inlineVariantSetType.createChecked({
    variantId: input.variantId,
    originOperationId: input.originOperationId ?? null,
    activeIndex: 0,
    settled: false,
    options: input.options.map((option) => ({ ...option })),
  });

  dispatch?.(state.tr.insert(input.at, inlineVariantSet));
  return true;
}

export function setActive(
  state: EditorState,
  dispatch: Dispatch | undefined,
  variantId: string,
  index: number,
): boolean {
  const variant = findVariantSet(state, variantId);
  if (variant === undefined || !Number.isInteger(index) || index < 0 ||
      index >= optionCount(variant.node)) return false;

  if (variant.node.attrs.activeIndex !== index) {
    dispatch?.(state.tr.setNodeMarkup(variant.pos, undefined, {
      ...variant.node.attrs,
      activeIndex: index,
    }));
  }
  return true;
}

export function pickActive(
  state: EditorState,
  dispatch: Dispatch | undefined,
  variantId: string,
): boolean {
  const variant = findVariantSet(state, variantId);
  if (variant === undefined) return false;

  const selectedIndex = activeIndex(variant.node);
  if (selectedIndex === undefined) return false;

  const entries: ParkingLotEntry[] = [];
  let replacement: ProseMirrorNode | ProseMirrorNode['content'] | readonly ProseMirrorNode[];

  if (variant.node.type.name === 'inlineVariantSet') {
    const options = inlineOptions(variant.node);
    const chosen = options?.[selectedIndex];
    if (options === undefined || chosen === undefined) return false;

    options.forEach((option, index) => {
      if (index !== selectedIndex) {
        entries.push({ variantId, label: option.label, text: option.text });
      }
    });
    replacement = chosen.text === '' ? [] : state.schema.text(chosen.text);
  } else {
    const chosen = variant.node.maybeChild(selectedIndex);
    if (chosen === null) return false;

    variant.node.forEach((
      option: ProseMirrorNode,
      _offset: number,
      index: number,
    ) => {
      if (index !== selectedIndex) {
        entries.push({
          variantId,
          label: String(option.attrs.label ?? ''),
          text: option.textContent,
        });
      }
    });
    replacement = chosen.content;
  }

  const transaction = closeHistory(state.tr
    .replaceWith(variant.pos, variant.pos + variant.node.nodeSize, replacement)
    .setMeta(parkingLotKey, {
      action: 'pick',
      variantId,
      entries,
      from: variant.pos,
      to: variant.pos + variant.node.nodeSize,
    } satisfies ParkingLotTransactionMeta)
    .setTime(0));
  dispatch?.(transaction);
  return true;
}

export function getParkingLot(state: EditorState): ParkingLotEntry[] {
  return (parkingLotKey.getState(state)?.entries ?? []).map(
    (entry: ParkingLotEntry) => ({ ...entry }),
  );
}
