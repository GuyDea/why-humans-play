import {
  EditorState,
  EditorView,
  corePlugins,
  getAnnotations,
  getLocks,
  schema,
  variantNodeViews,
} from '@whp/script-creator-editor-core';
import { describe, expect, it, vi } from 'vitest';
import type { OperationContext } from '../ops/context';
import {
  SelectionToolbar,
  type SelectionOperationBridge,
  type ToolbarPromptKind,
} from './selection-toolbar';

const context: OperationContext = {
  selection: 'selected words',
  before: 'Before',
  after: 'after.',
  beatTitle: 'The test beat',
  narrativeJob: 'Make the idea concrete.',
  brief: {
    topic: 'Why constraints create play',
    factual_anchors: ['Players accept the rule.'],
    unknowns: ['Which example is strongest?'],
  },
  creativeStatus: { phase: 'rapid-prototype' },
  approvedLessons: ['Keep the language concrete.'],
  requestedScope: 'Change only this selection.',
};

function selectedEditor(): {
  view: EditorView;
  target: { from: number; to: number };
  container: HTMLDivElement;
} {
  const doc = schema.node('doc', { format: 'narration', preamble: '' }, [
    schema.node('beat', {
      beatId: 'beat-1',
      title: 'The test beat',
      timeTargetMs: 30_000,
    }, [
      schema.node('paragraph', null, schema.text(
        'Before selected words after.',
      )),
    ]),
  ]);
  let from = -1;
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const offset = node.text.indexOf('selected words');
      if (offset >= 0) from = pos + offset;
    }
  });
  const target = { from, to: from + 'selected words'.length };
  const state = EditorState.fromJSON(
    { schema, plugins: corePlugins() },
    {
      doc: doc.toJSON(),
      selection: {
        type: 'text',
        anchor: target.from,
        head: target.to,
      },
    },
  );
  const container = document.createElement('div');
  const mount = document.createElement('div');
  container.append(mount);
  document.body.append(container);
  const view = new EditorView(mount, {
    state,
    nodeViews: variantNodeViews,
    dispatchTransaction(transaction) {
      view.updateState(view.state.apply(transaction));
    },
  });
  vi.spyOn(view, 'coordsAtPos').mockImplementation((position) => ({
    left: position === target.from ? 100 : 180,
    right: position === target.from ? 100 : 180,
    top: 80,
    bottom: 100,
  }));
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
    x: 20,
    y: 10,
    left: 20,
    right: 420,
    top: 10,
    bottom: 310,
    width: 400,
    height: 300,
    toJSON: () => ({}),
  });
  view.focus();
  return { view, target, container };
}

function bridgeFixture(): {
  bridge: SelectionOperationBridge;
  launchRewrite: ReturnType<typeof vi.fn>;
  launchAlternatives: ReturnType<typeof vi.fn>;
  launchReview: ReturnType<typeof vi.fn>;
} {
  const launchRewrite = vi.fn();
  const launchAlternatives = vi.fn();
  const launchReview = vi.fn();
  return {
    bridge: {
      launchRewrite,
      launchAlternatives,
      launchReview,
    },
    launchRewrite,
    launchAlternatives,
    launchReview,
  };
}

function button(
  toolbar: SelectionToolbar,
  action: string,
): HTMLButtonElement {
  return toolbar.element.querySelector<HTMLButtonElement>(
    `button[data-action="${action}"]`,
  )!;
}

describe('SelectionToolbar', () => {
  it('shows and positions every action for a non-empty selection', () => {
    const { view, container } = selectedEditor();
    const { bridge } = bridgeFixture();
    const toolbar = new SelectionToolbar({
      view,
      container,
      bridge,
      contextForSelection: () => context,
    });

    toolbar.update();

    expect(toolbar.element.hidden).toBe(false);
    expect(toolbar.element.style.left).toBe('120px');
    expect(toolbar.element.style.top).toBe('58px');
    expect(toolbar.element.textContent).toContain('Review');
    expect(toolbar.element.textContent).toContain('Rewrite');
    expect(toolbar.element.textContent).toContain('Alternatives');
    expect(toolbar.element.textContent).toContain('Custom instruction');
    expect(toolbar.element.textContent).toContain('Lock');
    expect(toolbar.element.textContent).toContain('Annotate');
    expect(toolbar.element.textContent).toContain('Flag for evidence');

    view.dispatch(view.state.tr.setSelection(
      EditorState.create({ doc: view.state.doc }).selection,
    ));
    toolbar.update();
    expect(toolbar.element.hidden).toBe(true);

    toolbar.destroy();
    view.destroy();
    container.remove();
  });

  it('places the toolbar below a top-of-editor selection with no room above', () => {
    const { view, container } = selectedEditor();
    const { bridge } = bridgeFixture();
    // A top-of-editor selection: too little room above for a tall toolbar.
    (view.coordsAtPos as unknown as ReturnType<typeof vi.fn>)
      .mockImplementation(() => ({ left: 100, right: 100, top: 15, bottom: 35 }));
    const toolbar = new SelectionToolbar({
      view,
      container,
      bridge,
      contextForSelection: () => context,
    });
    Object.defineProperty(toolbar.element, 'offsetHeight', {
      value: 44,
      configurable: true,
    });

    toolbar.update();

    // selectionTop = 5, aboveTop = 5 - 44 - 12 = -51 < 8, so flip below:
    // selectionBottom (25) + 12 = 37.
    expect(toolbar.element.hidden).toBe(false);
    expect(toolbar.element.style.top).toBe('37px');

    toolbar.destroy();
    view.destroy();
    container.remove();
  });

  it('restores a non-empty selection toolbar when the editor regains focus', async () => {
    const { view, container } = selectedEditor();
    const { bridge } = bridgeFixture();
    const toolbar = new SelectionToolbar({
      view,
      container,
      bridge,
      contextForSelection: () => context,
    });

    view.dom.blur();
    expect(toolbar.element.hidden).toBe(true);

    view.dom.focus();
    await Promise.resolve();
    expect(toolbar.element.hidden).toBe(false);

    toolbar.destroy();
    view.destroy();
    container.remove();
  });

  it('launches review, rewrite, custom rewrite, and counted alternatives', () => {
    const { view, target, container } = selectedEditor();
    const fixture = bridgeFixture();
    const prompts: Partial<Record<ToolbarPromptKind, string>> = {
      customInstruction: 'Make it funnier without changing the claim.',
    };
    const toolbar = new SelectionToolbar({
      view,
      container,
      bridge: fixture.bridge,
      contextForSelection: () => context,
      requestText: (kind) => prompts[kind] ?? null,
    });
    toolbar.update();

    button(toolbar, 'review').click();
    button(toolbar, 'rewrite').click();
    button(toolbar, 'custom').click();
    const count = toolbar.element.querySelector<HTMLSelectElement>(
      'select[data-alternative-count]',
    )!;
    count.value = '3';
    count.dispatchEvent(new Event('change', { bubbles: true }));
    button(toolbar, 'alternatives').click();

    expect(fixture.launchReview).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: context.selection,
        requested_scope: context.requestedScope,
      }),
      target,
    );
    expect(fixture.launchRewrite).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        selection: context.selection,
        requested_scope: context.requestedScope,
      }),
      target,
    );
    expect(fixture.launchRewrite).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        selection: context.selection,
        requested_scope: 'Make it funnier without changing the claim.',
      }),
      target,
    );
    expect(fixture.launchAlternatives).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: context.selection,
        requested_scope: {
          count: 3,
          instruction: context.requestedScope,
        },
      }),
      target,
      3,
    );

    toolbar.destroy();
    view.destroy();
    container.remove();
  });

  it('locks, annotates, and evidence-flags the selected range', () => {
    const { view, target, container } = selectedEditor();
    const { bridge } = bridgeFixture();
    const prompts: Partial<Record<ToolbarPromptKind, string>> = {
      annotation: 'Check the rhythm.',
      evidenceFlag: 'Verify this precise claim.',
    };
    const ids = ['lock-1', 'annotation-1', 'evidence-1'];
    const toolbar = new SelectionToolbar({
      view,
      container,
      bridge,
      contextForSelection: () => context,
      requestText: (kind) => prompts[kind] ?? null,
      nextId: () => ids.shift()!,
    });
    toolbar.update();

    button(toolbar, 'lock').click();
    button(toolbar, 'annotate').click();
    button(toolbar, 'evidence').click();

    expect(getLocks(view.state)).toEqual([{
      lockId: 'lock-1',
      ...target,
    }]);
    expect(getAnnotations(view.state)).toEqual([
      {
        id: 'annotation-1',
        kind: 'reviewFinding',
        ...target,
        message: 'Check the rhythm.',
        orphaned: false,
      },
      {
        id: 'evidence-1',
        kind: 'evidenceFlag',
        ...target,
        message: 'Verify this precise claim.',
        orphaned: false,
      },
    ]);

    toolbar.destroy();
    view.destroy();
    container.remove();
  });

  it('renders the model dropdown, persists a choice, and clears on Default', () => {
    const { view, container } = selectedEditor();
    const { bridge } = bridgeFixture();
    const store = {
      value: null as { model: string; effort: string } | null,
      get: vi.fn(() => store.value),
      set: vi.fn((_operation: string, choice: { model: string; effort: string } | null) => {
        store.value = choice;
      }),
    };
    const toolbar = new SelectionToolbar({
      view,
      container,
      bridge,
      contextForSelection: () => context,
      modelPreference: store,
    });

    const select = toolbar.element.querySelector<HTMLSelectElement>(
      'select[data-model-select]',
    )!;
    expect(select).not.toBeNull();
    expect(Array.from(select.options).map((option) => option.textContent))
      .toEqual(['Default', 'Sol · xhigh', 'Sol · medium', 'Opus 4.8', 'Fable 5']);
    expect(select.selectedIndex).toBe(0);

    select.value = '1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(store.set).toHaveBeenLastCalledWith('default', {
      model: 'gpt-5.6-sol',
      effort: 'xhigh',
    });

    select.value = '0';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(store.set).toHaveBeenLastCalledWith('default', null);

    toolbar.destroy();
    view.destroy();
    container.remove();
  });

  it('reflects the persisted model choice on init', () => {
    const { view, container } = selectedEditor();
    const { bridge } = bridgeFixture();
    const store = {
      get: vi.fn(() => ({ model: 'gpt-5.6-sol', effort: 'medium' })),
      set: vi.fn(),
    };
    const toolbar = new SelectionToolbar({
      view,
      container,
      bridge,
      contextForSelection: () => context,
      modelPreference: store,
    });

    const select = toolbar.element.querySelector<HTMLSelectElement>(
      'select[data-model-select]',
    )!;
    expect(select.selectedIndex).toBe(2);

    toolbar.destroy();
    view.destroy();
    container.remove();
  });

  it('keeps the selection when interacting with its controls', () => {
    const { view, target, container } = selectedEditor();
    const { bridge } = bridgeFixture();
    const toolbar = new SelectionToolbar({
      view,
      container,
      bridge,
      contextForSelection: () => context,
    });
    toolbar.update();

    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    button(toolbar, 'rewrite').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(view.state.selection.from).toBe(target.from);
    expect(view.state.selection.to).toBe(target.to);

    const selectEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    toolbar.element.querySelector<HTMLSelectElement>(
      'select[data-alternative-count]',
    )!.dispatchEvent(selectEvent);
    expect(selectEvent.defaultPrevented).toBe(false);

    toolbar.destroy();
    view.destroy();
    container.remove();
  });
});
