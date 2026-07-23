import {
  EditorState,
  EditorView,
  corePlugins,
  getProposals,
  schema,
  variantNodeViews,
} from '@whp/script-creator-editor-core';
import { describe, expect, it, vi } from 'vitest';
import type {
  DaemonClient,
  DraftDocument,
  OperationRecord,
} from '../api/client';
import {
  SelectionRuntime,
  selectionSnapshot,
} from './selection-runtime';

const SELECTED_TEXT = 'selected words';

function selectedState(): {
  state: EditorState;
  draftDocument: DraftDocument;
  target: { from: number; to: number };
} {
  const doc = schema.node('doc', { format: 'narration', preamble: '' }, [
    schema.node('beat', {
      beatId: 'beat-1',
      title: 'The test beat',
      timeTargetMs: 30_000,
    }, [
      schema.node('paragraph', null, schema.text('Lead paragraph.')),
      schema.node('paragraph', null, schema.text(
        `Before ${SELECTED_TEXT} after.`,
      )),
      schema.node('paragraph', null, schema.text('Following paragraph.')),
    ]),
  ]);
  let from = -1;
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const offset = node.text.indexOf(SELECTED_TEXT);
    if (offset >= 0) from = pos + offset;
  });
  const target = { from, to: from + SELECTED_TEXT.length };
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
  const draftDocument = doc.toJSON() as DraftDocument;
  const content = draftDocument['content'] as Array<Record<string, unknown>>;
  const beatAttrs = content[0]?.['attrs'] as Record<string, unknown>;
  beatAttrs['narrativeJob'] = 'Turn the example into the larger question.';
  draftDocument['metadata'] = {
    topic: 'Why constraints create play',
    anchors: ['Players accept the rule.'],
    unknowns: ['Which example is strongest?'],
    approvedLessons: ['Keep the language concrete.'],
    creativeStatus: { phase: 'rapid-prototype' },
    directionApproved: false,
  };
  return { state, draftDocument, target };
}

function completedOperation(id: string): OperationRecord {
  return {
    id,
    operation: 'rewrite-selection',
    state: 'completed',
    stalled: false,
    envelopeJson: '{}',
    jobDir: '/tmp/job',
    threadId: null,
    retryOf: null,
    resumedFrom: null,
    createdAt: '2026-07-23T12:00:00.000Z',
    startedAt: '2026-07-23T12:00:00.000Z',
    finishedAt: '2026-07-23T12:00:01.000Z',
    inputTokens: 10,
    cachedInputTokens: 0,
    outputTokens: 5,
    reasoningOutputTokens: 0,
    usageAvailable: 1,
    error: null,
  };
}

describe('selectionSnapshot', () => {
  it('maps a non-empty editor selection and draft metadata to live operation context', () => {
    const { state, draftDocument, target } = selectedState();

    expect(selectionSnapshot(
      state,
      draftDocument,
      'Change only the selected passage.',
    )).toEqual({
      visible: true,
      target,
      context: {
        selection: SELECTED_TEXT,
        before: 'Lead paragraph.\n\nBefore ',
        after: ' after.\n\nFollowing paragraph.',
        beatTitle: 'The test beat',
        narrativeJob: 'Turn the example into the larger question.',
        brief: {
          topic: 'Why constraints create play',
          factual_anchors: ['Players accept the rule.'],
          unknowns: ['Which example is strongest?'],
        },
        creativeStatus: { phase: 'rapid-prototype' },
        approvedLessons: ['Keep the language concrete.'],
        requestedScope: 'Change only the selected passage.',
      },
    });
  });

  it('hides and omits context for an empty editor selection', () => {
    const { state, draftDocument, target } = selectedState();
    const collapsed = EditorState.fromJSON(
      { schema, plugins: corePlugins() },
      {
        doc: state.doc.toJSON(),
        selection: {
          type: 'text',
          anchor: target.from,
          head: target.from,
        },
      },
    );

    expect(selectionSnapshot(
      collapsed,
      draftDocument,
      'Change only the selected passage.',
    )).toEqual({
      visible: false,
      target: null,
      context: null,
    });
  });

  it('uses the selected beat id when beat titles are duplicated', () => {
    const doc = schema.node('doc', { format: 'narration', preamble: '' }, [
      schema.node('beat', {
        beatId: 'beat-a',
        title: 'Repeated title',
        timeTargetMs: 30_000,
      }, [
        schema.node('paragraph', null, schema.text('First beat.')),
      ]),
      schema.node('beat', {
        beatId: 'beat-b',
        title: 'Repeated title',
        timeTargetMs: 30_000,
      }, [
        schema.node('paragraph', null, schema.text(SELECTED_TEXT)),
      ]),
    ]);
    let from = -1;
    doc.descendants((node, pos) => {
      if (node.isText && node.text === SELECTED_TEXT) from = pos;
    });
    const state = EditorState.fromJSON(
      { schema, plugins: corePlugins() },
      {
        doc: doc.toJSON(),
        selection: {
          type: 'text',
          anchor: from,
          head: from + SELECTED_TEXT.length,
        },
      },
    );
    const draftDocument = doc.toJSON() as DraftDocument;
    const beats = draftDocument['content'] as Array<Record<string, unknown>>;
    (beats[0]?.['attrs'] as Record<string, unknown>)['narrativeJob'] =
      'Job A';
    (beats[1]?.['attrs'] as Record<string, unknown>)['narrativeJob'] =
      'Job B';

    expect(
      selectionSnapshot(state, draftDocument).context?.narrativeJob,
    ).toBe('Job B');
  });
});

describe('SelectionRuntime', () => {
  it('mounts the toolbar and launches a rewrite through context, tracker, and bridge', async () => {
    const { state, draftDocument, target } = selectedState();
    const container = document.createElement('div');
    const mount = document.createElement('div');
    container.append(mount);
    document.body.append(container);
    let afterDispatch = (): void => undefined;
    const view = new EditorView(mount, {
      state,
      nodeViews: variantNodeViews,
      dispatchTransaction(transaction) {
        view.updateState(view.state.apply(transaction));
        afterDispatch();
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
    const submitOp = vi.fn(async () => ({ id: 'op-1' }));
    const client = {
      submitOp,
      streamEvents: vi.fn(async (
        _id: string,
        options: { onDone(): void },
      ) => options.onDone()),
      getOp: vi.fn(async () => completedOperation('op-1')),
      getResult: vi.fn(async () => ({
        kind: 'schema' as const,
        value: {
          status: 'complete',
          replacement_markdown: 'Sharper words',
          guardrail_markdown: null,
        },
        guardrail: null,
      })),
    } as unknown as DaemonClient;
    view.focus();
    const onLaunch = vi.fn();
    const runtime = new SelectionRuntime({
      view,
      container,
      client,
      draftDocument: () => draftDocument,
      onLaunch,
    });
    afterDispatch = () => runtime.handleEditorDispatch();

    expect(runtime.toolbar.element.parentElement).toBe(container);
    expect(runtime.toolbar.element.hidden).toBe(false);

    runtime.toolbar.element.querySelector<HTMLButtonElement>(
      'button[data-action="rewrite"]',
    )!.click();

    await vi.waitFor(() => {
      expect(getProposals(view.state)[0]?.replacement).toBe('Sharper words');
    });
    expect(onLaunch).toHaveBeenCalledOnce();
    expect(submitOp).toHaveBeenCalledWith(
      'rewrite-selection',
      expect.objectContaining({
        selection: SELECTED_TEXT,
        surrounding_context: {
          before: 'Lead paragraph.\n\nBefore ',
          after: ' after.\n\nFollowing paragraph.',
        },
        beat_title: 'The test beat',
        narrative_job: 'Turn the example into the larger question.',
        topic_brief: {
          topic: 'Why constraints create play',
          factual_anchors: ['Players accept the rule.'],
          unknowns: ['Which example is strongest?'],
        },
      }),
    );

    view.dispatch(view.state.tr.setSelection(
      EditorState.create({ doc: view.state.doc }).selection,
    ));
    expect(runtime.toolbar.element.hidden).toBe(true);

    runtime.destroy();
    view.destroy();
    container.remove();
  });

  it('emits a structured terminal failure with a console entry', async () => {
    const { state, draftDocument, target } = selectedState();
    const container = document.createElement('div');
    const mount = document.createElement('div');
    container.append(mount);
    document.body.append(container);
    let afterDispatch = (): void => undefined;
    const view = new EditorView(mount, {
      state,
      nodeViews: variantNodeViews,
      dispatchTransaction(transaction) {
        view.updateState(view.state.apply(transaction));
        afterDispatch();
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
    const client = {
      submitOp: vi.fn(async () => ({ id: 'op-failed' })),
      streamEvents: vi.fn(async (
        _id: string,
        options: { onDone(): void },
      ) => options.onDone()),
      getOp: vi.fn(async () => ({
        ...completedOperation('op-failed'),
        state: 'invalid-output' as const,
        error: 'response failed schema validation',
      })),
      getResult: vi.fn(async () => ({
        kind: 'failed' as const,
        error: 'invalid operation result',
      })),
    } as unknown as DaemonClient;
    const onOutcomes = vi.fn();
    const onError = vi.fn();
    const runtime = new SelectionRuntime({
      view,
      container,
      client,
      draftDocument: () => draftDocument,
      onOutcomes,
      onError,
    });
    afterDispatch = () => runtime.handleEditorDispatch();

    runtime.toolbar.element.querySelector<HTMLButtonElement>(
      'button[data-action="rewrite"]',
    )!.click();

    await vi.waitFor(() => {
      expect(onOutcomes).toHaveBeenLastCalledWith({
        findings: [],
        guardrails: [],
        failures: [{
          operation: 'rewrite-selection',
          state: 'invalid-output',
          reason: 'invalid operation result',
          consoleEntry: {
            kind: 'failure',
            text: 'rewrite-selection [invalid-output] invalid operation result',
          },
        }],
      });
    });
    expect(onError).not.toHaveBeenCalled();
    expect(getProposals(view.state)).toEqual([]);

    runtime.destroy();
    view.destroy();
    container.remove();
  });
});
