import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorView, NodeView, NodeViewConstructor } from 'prosemirror-view';
import { setActive } from './variants.js';

class BlockVariantSetView implements NodeView {
  readonly dom: HTMLElement;

  private node: ProseMirrorNode;
  private readonly view: EditorView;

  constructor(node: ProseMirrorNode, view: EditorView) {
    this.node = node;
    this.view = view;
    this.dom = view.dom.ownerDocument.createElement('div');
    this.dom.className = 'variant-set';
    this.render();
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.render();
    return true;
  }

  stopEvent(event: Event): boolean {
    return event.target instanceof HTMLElement && event.target.closest('button.variant-tab') !== null;
  }

  private render(): void {
    this.dom.replaceChildren();
    const document = this.dom.ownerDocument;
    const tabStrip = document.createElement('div');
    tabStrip.className = 'variant-tabs';
    const activeIndex = Number.isInteger(this.node.attrs.activeIndex)
      ? this.node.attrs.activeIndex as number
      : 0;

    this.node.forEach((option, _offset, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = index === activeIndex ? 'variant-tab active' : 'variant-tab';
      tab.textContent = String(option.attrs.label ?? '');
      tab.addEventListener('click', () => {
        setActive(this.view.state, this.view.dispatch, String(this.node.attrs.variantId), index);
      });
      tabStrip.append(tab);
    });
    this.dom.append(tabStrip);

    const option = activeIndex >= 0 && activeIndex < this.node.childCount
      ? this.node.child(activeIndex)
      : undefined;
    if (option === undefined) return;

    const content = document.createElement('div');
    content.className = 'variant-active-option';
    option.forEach((paragraph) => {
      const element = document.createElement('p');
      element.textContent = paragraph.textContent;
      content.append(element);
    });
    this.dom.append(content);
  }
}

const blockVariantSetNodeView: NodeViewConstructor = (node, view) =>
  new BlockVariantSetView(node, view);

export const variantNodeViews = {
  variantSet: blockVariantSetNodeView,
};
