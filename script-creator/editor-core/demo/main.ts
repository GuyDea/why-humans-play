import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState, type Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { addAnnotation, getAnnotations } from '../src/annotations.js';
import { corePlugins } from '../src/core.js';
import { getLocks, lockRange } from '../src/lock-guard.js';
import { exportMarkdown } from '../src/markdown-codec.js';
import { variantNodeViews } from '../src/node-views.js';
import {
  acceptProposal,
  getProposals,
  type Proposal,
  receiveProposal,
  rejectProposal,
  requestProposal,
} from '../src/proposals.js';
import { getRevision } from '../src/revision.js';
import { schema } from '../src/schema.js';
import { getParkingLot, pickActive } from '../src/variants.js';

const BLOCK_VARIANT_ID = 'demo-block-variant';
const INLINE_VARIANT_ID = 'demo-inline-variant';
const AGENT_DELAY_MS = 2500;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Missing demo element: ${selector}`);
  return element;
}

function paragraph(...content: ProseMirrorNode[]): ProseMirrorNode {
  return schema.node('paragraph', null, content);
}

function variantOption(label: string, text: string): ProseMirrorNode {
  return schema.node('variantOption', { label }, [paragraph(schema.text(text))]);
}

function sampleDocument(): ProseMirrorNode {
  const lockType = schema.marks.lock;
  if (lockType === undefined) throw new Error('Demo schema has no lock mark');
  const locked = lockType.create({ lockId: 'demo-seed-lock' });
  const inlineVariant = schema.node('inlineVariantSet', {
    variantId: INLINE_VARIANT_ID,
    activeIndex: 0,
    settled: false,
    options: [
      { label: 'Clue', text: 'a clue' },
      { label: 'Tell', text: 'a tiny tell' },
    ],
  });
  const blockVariant = schema.node('variantSet', {
    variantId: BLOCK_VARIANT_ID,
    activeIndex: 0,
    settled: false,
  }, [
    variantOption('Observation', 'The delight was not in winning. It was in discovering that the rule could bend.'),
    variantOption('Turn', 'The rule stopped being a wall and became something the players could push against.'),
  ]);

  const beat = schema.node('beat', {
    beatId: 'beat_demo000001',
    title: 'The edge of the rule',
    timeTargetMs: 30000,
  }, [
    paragraph(
      schema.text('The rules looked stable—until '),
      schema.text('one player found the edge', [locked]),
      schema.text('. Everyone at the table leaned closer.'),
    ),
    paragraph(
      schema.text('A tiny hesitation became '),
      inlineVariant,
      schema.text(' everyone could hear, and suddenly the whole room understood the move.'),
    ),
    blockVariant,
    paragraph(schema.text('That is the useful pressure of play: it lets us test a possibility before we have to live with it.')),
  ]);

  return schema.node('doc', { format: 'annotated' }, [beat]);
}

function textRange(doc: ProseMirrorNode, needle: string): { from: number; to: number } {
  let range: { from: number; to: number } | undefined;
  doc.descendants((node, pos) => {
    if (range !== undefined || !node.isText) return;
    const offset = node.text?.indexOf(needle) ?? -1;
    if (offset >= 0) range = { from: pos + offset, to: pos + offset + needle.length };
  });
  if (range === undefined) throw new Error(`Text not found in demo document: ${needle}`);
  return range;
}

const editorMount = requiredElement<HTMLElement>('#editor');
const workspace = requiredElement<HTMLElement>('#workspace');
const bubbleMenu = requiredElement<HTMLElement>('#bubble-menu');
const revisionStatus = requiredElement<HTMLElement>('#revision-status');
const proposalStatus = requiredElement<HTMLElement>('#proposal-status');
const parkingStatus = requiredElement<HTMLElement>('#parking-status');
const exportButton = requiredElement<HTMLButtonElement>('#export-button');
const liveRegion = requiredElement<HTMLElement>('#live-region');

let proposalSequence = 0;
let rewriteSequence = 0;
let annotationSequence = 0;
let lockSequence = 0;
let view: EditorView;

function dispatch(transaction: Transaction): void {
  view.dispatch(transaction);
}

function announce(message: string): void {
  liveRegion.textContent = message;
}

function actionButton(label: string, action: () => void, disabled = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  });
  return button;
}

function rerollProposal(id: string): void {
  const proposal = getProposals(view.state).find((candidate) => candidate.id === id);
  if (proposal === undefined) return;
  const range = { from: proposal.from, to: proposal.to };
  rejectProposal(view.state, dispatch, id);
  if (!startRewrite(range)) announce('The changed range is too small to re-roll.');
}

function proposalWidget(proposal: Proposal): HTMLElement {
  const diff = document.createElement('span');
  diff.className = proposal.status === 'conflicted'
    ? 'proposal-diff is-conflicted'
    : 'proposal-diff';
  diff.contentEditable = 'false';

  const result = document.createElement('ins');
  result.textContent = proposal.status === 'pending'
    ? 'Agent drafting…'
    : proposal.replacement ?? 'No replacement returned';
  diff.append(result);

  if (proposal.status !== 'pending') {
    diff.append(
      actionButton('Accept', () => {
        if (acceptProposal(view.state, dispatch, proposal.id)) {
          announce('Rewrite accepted.');
        } else {
          announce('Rewrite cannot be accepted because its source changed or became locked.');
        }
      }, proposal.status !== 'ready'),
      actionButton('Reject', () => {
        rejectProposal(view.state, dispatch, proposal.id);
        announce('Rewrite rejected.');
      }),
      actionButton('Re-roll', () => rerollProposal(proposal.id)),
    );
  }

  return diff;
}

function visualDecorations(state: EditorState): DecorationSet {
  const decorations: Decoration[] = [];

  for (const lock of getLocks(state)) {
    decorations.push(Decoration.inline(lock.from, lock.to, {
      class: 'locked',
      title: `Locked passage (${lock.lockId})`,
    }));
  }

  for (const annotation of getAnnotations(state)) {
    if (!annotation.orphaned && annotation.from < annotation.to) {
      decorations.push(Decoration.inline(annotation.from, annotation.to, {
        class: 'annotation-range',
      }));
    }
    const pinAt = Math.max(0, Math.min(annotation.to, state.doc.content.size));
    decorations.push(Decoration.widget(pinAt, () => {
      const pin = document.createElement('span');
      pin.className = 'annotation-pin';
      pin.contentEditable = 'false';
      pin.textContent = annotation.orphaned ? '!' : String(annotation.id.split('-').at(-1));
      pin.title = annotation.orphaned
        ? `Orphaned annotation: ${annotation.message}`
        : annotation.message;
      pin.setAttribute('aria-label', pin.title);
      return pin;
    }, { key: `annotation-${annotation.id}-${annotation.orphaned ? 'orphaned' : 'anchored'}`, side: 1 }));
  }

  for (const proposal of getProposals(state)) {
    if (proposal.from < proposal.to) {
      const className = proposal.status === 'pending'
        ? 'proposal-pending'
        : proposal.status === 'conflicted'
          ? 'proposal-conflicted'
          : 'proposal-original';
      decorations.push(Decoration.inline(proposal.from, proposal.to, { class: className }));
    }
    const widgetAt = Math.max(0, Math.min(proposal.to, state.doc.content.size));
    decorations.push(Decoration.widget(widgetAt, () => proposalWidget(proposal), {
      key: `proposal-${proposal.id}-${proposal.status}-${proposal.replacement ?? ''}`,
      side: 1,
    }));
  }

  return DecorationSet.create(state.doc, decorations);
}

function updateStatus(): void {
  revisionStatus.textContent = String(getRevision(view.state));

  const proposals = getProposals(view.state);
  proposalStatus.textContent = proposals.length === 0
    ? 'None'
    : proposals.map((proposal) => `${proposal.id}: ${proposal.status}`).join(' · ');
  proposalStatus.title = proposalStatus.textContent;

  const parkingLot = getParkingLot(view.state);
  parkingStatus.textContent = parkingLot.length === 0
    ? 'Empty'
    : parkingLot.map((entry) => `${entry.label} (${entry.variantId})`).join(' · ');
  parkingStatus.title = parkingStatus.textContent;
}

function selectionRange(): { from: number; to: number } | undefined {
  const { from, to, empty } = view.state.selection;
  return empty || from >= to ? undefined : { from, to };
}

function updateBubbleMenu(): void {
  const range = selectionRange();
  if (range === undefined || !view.hasFocus()) {
    bubbleMenu.hidden = true;
    return;
  }

  bubbleMenu.hidden = false;
  const start = view.coordsAtPos(range.from);
  const end = view.coordsAtPos(range.to);
  const workspaceRect = workspace.getBoundingClientRect();
  const width = bubbleMenu.offsetWidth;
  const center = (start.left + end.right) / 2 - workspaceRect.left;
  const left = Math.max(8, Math.min(center - width / 2, workspaceRect.width - width - 8));
  const preferredTop = Math.min(start.top, end.top) - workspaceRect.top - bubbleMenu.offsetHeight - 12;
  bubbleMenu.style.left = `${left}px`;
  bubbleMenu.style.top = `${Math.max(8, preferredTop)}px`;
}

function attachVariantPicker(selector: string, variantId: string): void {
  const variant = view.dom.querySelector<HTMLElement>(selector);
  if (variant === null || variant.querySelector('.variant-pick') !== null) return;

  const actions = document.createElement(selector === '.variant-set' ? 'div' : 'span');
  actions.className = 'variant-actions';
  const pick = actionButton('Pick active', () => {
    if (pickActive(view.state, dispatch, variantId)) announce('Variant picked; unused option moved to the parking lot.');
  });
  pick.className = 'variant-pick';
  actions.append(pick);
  variant.append(actions);
}

function syncVariantPickers(): void {
  attachVariantPicker('.variant-set', BLOCK_VARIANT_ID);
  attachVariantPicker('.inline-variant-set', INLINE_VARIANT_ID);
}

function renderChrome(): void {
  updateStatus();
  updateBubbleMenu();
  queueMicrotask(syncVariantPickers);
}

view = new EditorView(editorMount, {
  state: EditorState.create({
    doc: sampleDocument(),
    plugins: corePlugins(),
  }),
  nodeViews: variantNodeViews,
  decorations: visualDecorations,
  attributes: {
    'aria-label': 'Working narration editor',
    spellcheck: 'true',
  },
  dispatchTransaction(transaction) {
    view.updateState(view.state.apply(transaction));
    renderChrome();
  },
  handleDOMEvents: {
    keyup: () => {
      queueMicrotask(updateBubbleMenu);
      return false;
    },
    mouseup: () => {
      queueMicrotask(updateBubbleMenu);
      return false;
    },
    blur: (_view, event) => {
      const next = event.relatedTarget;
      if (!(next instanceof Node && bubbleMenu.contains(next))) bubbleMenu.hidden = true;
      return false;
    },
  },
});

function cannedReplacement(sequence: number): string {
  const replacements = [
    'the rule became an invitation to test the edge',
    'play made the hidden possibility safe to try',
    'the room recognized the move before anyone named it',
  ];
  return replacements[sequence % replacements.length] ?? replacements[0]!;
}

function startRewrite(range: { from: number; to: number }): boolean {
  const id = `rewrite-${++proposalSequence}`;
  if (!requestProposal(view.state, dispatch, { id, ...range })) return false;

  const result = cannedReplacement(rewriteSequence++);
  window.setTimeout(() => {
    if (receiveProposal(view.state, dispatch, { id, replacement: result })) {
      announce(`Rewrite ${id} is ready.`);
    }
  }, AGENT_DELAY_MS);
  announce(`Rewrite ${id} requested. The fake agent will answer in 2.5 seconds.`);
  return true;
}

bubbleMenu.addEventListener('mousedown', (event) => event.preventDefault());
bubbleMenu.addEventListener('click', (event) => {
  const button = event.target instanceof Element
    ? event.target.closest<HTMLButtonElement>('button[data-action]')
    : null;
  const range = selectionRange();
  if (button === null || range === undefined) return;

  if (button.dataset.action === 'lock') {
    const id = `selection-lock-${++lockSequence}`;
    if (lockRange(view.state, dispatch, { lockId: id, ...range })) announce('Selection locked.');
  } else if (button.dataset.action === 'annotate') {
    const id = `annotation-${++annotationSequence}`;
    if (addAnnotation(view.state, dispatch, {
      id,
      kind: 'reviewFinding',
      ...range,
      message: 'Demo review finding: test the rhythm of this phrase.',
    })) announce('Annotation added.');
  } else if (button.dataset.action === 'rewrite') {
    startRewrite(range);
  }

  view.focus();
  updateBubbleMenu();
});

exportButton.addEventListener('click', () => {
  const result = exportMarkdown(view.state);
  if (!result.ok) {
    window.alert(`Export blocked:\n\n${result.blocked.map((reason) => `• ${reason}`).join('\n')}`);
    announce('Export blocked. Settle the items listed in the alert.');
    return;
  }

  const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const download = document.createElement('a');
  download.href = url;
  download.download = 'why-humans-play-draft.md';
  download.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  announce('Markdown exported.');
});

window.addEventListener('resize', updateBubbleMenu);
window.addEventListener('scroll', updateBubbleMenu, true);

const initialAnnotation = textRange(view.state.doc, 'tiny hesitation');
addAnnotation(view.state, dispatch, {
  id: 'annotation-0',
  kind: 'evidenceFlag',
  ...initialAnnotation,
  message: 'Seed annotation: is this hesitation visible enough?',
});

renderChrome();
