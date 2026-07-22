import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { closeHistory } from 'prosemirror-history';
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
  at: number;
  options: BlockVariantOptionInput[];
}

interface LocatedVariantSet {
  node: ProseMirrorNode;
  pos: number;
}

interface ParkingLotTransactionMeta {
  variantId: string;
  entries: ParkingLotEntry[];
}

type Dispatch = (transaction: Transaction) => void;

const parkingLotKey = new PluginKey<readonly ParkingLotEntry[]>('variantParkingLot');

function findBlockVariantSet(state: EditorState, variantId: string): LocatedVariantSet | undefined {
  let found: LocatedVariantSet | undefined;

  state.doc.descendants((node, pos) => {
    if (found !== undefined) return false;
    if (node.type.name === 'variantSet' && node.attrs.variantId === variantId) {
      found = { node, pos };
      return false;
    }
    return true;
  });

  return found;
}

function activeOption(node: ProseMirrorNode): ProseMirrorNode | undefined {
  const activeIndex = node.attrs.activeIndex;
  return Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex < node.childCount
    ? node.child(activeIndex)
    : undefined;
}

export function variantPlugin(): Plugin<readonly ParkingLotEntry[]> {
  return new Plugin<readonly ParkingLotEntry[]>({
    key: parkingLotKey,
    state: {
      init: () => [],
      apply(transaction, entries) {
        const meta = transaction.getMeta(parkingLotKey) as ParkingLotTransactionMeta | undefined;
        if (meta === undefined) return entries;
        return [
          ...entries.filter((entry) => entry.variantId !== meta.variantId),
          ...meta.entries,
        ];
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
    { variantId: input.variantId, activeIndex: 0, settled: false },
    options,
  );

  dispatch?.(state.tr.insert(input.at, variantSet));
  return true;
}

export function setActive(
  state: EditorState,
  dispatch: Dispatch | undefined,
  variantId: string,
  index: number,
): boolean {
  const variant = findBlockVariantSet(state, variantId);
  if (variant === undefined || !Number.isInteger(index) || index < 0 ||
      index >= variant.node.childCount) return false;

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
  const variant = findBlockVariantSet(state, variantId);
  if (variant === undefined) return false;

  const chosen = activeOption(variant.node);
  if (chosen === undefined) return false;

  const activeIndex = variant.node.attrs.activeIndex as number;
  const entries: ParkingLotEntry[] = [];
  variant.node.forEach((option, _offset, index) => {
    if (index !== activeIndex) {
      entries.push({
        variantId,
        label: String(option.attrs.label ?? ''),
        text: option.textContent,
      });
    }
  });

  const transaction = closeHistory(state.tr
    .replaceWith(variant.pos, variant.pos + variant.node.nodeSize, chosen.content)
    .setMeta(parkingLotKey, {
      variantId,
      entries,
    } satisfies ParkingLotTransactionMeta)
    .setTime(0));
  dispatch?.(transaction);
  return true;
}

export function getParkingLot(state: EditorState): ParkingLotEntry[] {
  return (parkingLotKey.getState(state) ?? []).map((entry) => ({ ...entry }));
}
