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

interface InlineVariantOptionInput {
  label: string;
  text: string;
}

interface InsertInlineVariantSetOptions {
  variantId: string;
  at: number;
  options: InlineVariantOptionInput[];
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

    variant.node.forEach((option, _offset, index) => {
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
