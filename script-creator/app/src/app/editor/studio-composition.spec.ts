import {
  EditorState,
  EditorView,
  corePlugins,
  schema,
  variantNodeViews,
} from '@whp/script-creator-editor-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  DaemonClient,
  DraftDocument,
  OperationName,
  OperationRecord,
  OperationResult,
  StreamEventsOptions,
} from '../api/client';
import {
  composeStudio,
  type StudioComposition,
} from './studio-composition';

const SELECTED_TEXT = 'selected words';

interface ControlledOutcome {
  operation: OperationRecord;
  result: OperationResult;
}

class ControllableDaemonClient {
  private sequence = 0;
  private readonly finishes = new Map<string, () => void>();
  private readonly outcomes = new Map<string, ControlledOutcome>();

  readonly submitOp = vi.fn(async (_operation: OperationName, _inputs: unknown) => ({
    id: `op-${++this.sequence}`,
  }));

  readonly streamEvents = vi.fn(async (
    id: string,
    options: StreamEventsOptions,
  ) => {
    await options.onEvent({
      id: '1',
      event: 'codex',
      data: JSON.stringify({
        type: 'item.completed',
        item: {
          type: 'agent_message',
          text: `Working on ${id}.`,
        },
      }),
    });
    await new Promise<void>((resolve) => {
      this.finishes.set(id, resolve);
    });
    await options.onDone();
  });

  readonly getOp = vi.fn(async (id: string) => {
    const outcome = this.outcomes.get(id);
    if (!outcome) throw new Error(`operation ${id} has not resolved`);
    return outcome.operation;
  });

  readonly getResult = vi.fn(async (id: string) => {
    const outcome = this.outcomes.get(id);
    if (!outcome) throw new Error(`operation ${id} has not resolved`);
    return outcome.result;
  });

  readonly cancel = vi.fn(async (id: string) => ({ id }));
  readonly resume = vi.fn(async () => ({ id: `op-${++this.sequence}` }));

  resolve(id: string, outcome: ControlledOutcome): void {
    const finish = this.finishes.get(id);
    if (!finish) throw new Error(`operation ${id} is not streaming`);
    this.outcomes.set(id, outcome);
    finish();
  }
}

const mounted: Array<{
  composition: StudioComposition;
  view: EditorView;
  root: HTMLElement;
}> = [];

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.composition.destroy();
    entry.view.destroy();
    entry.root.remove();
  }
});

describe('studio composition', () => {
  it('renders pending, proposal, failure, and console state from toolbar operations', async () => {
    const { state, draftDocument, target } = selectedState();
    const root = document.createElement('section');
    const editor = document.createElement('div');
    const failures = document.createElement('div');
    const guardrails = document.createElement('div');
    const consolePanel = document.createElement('div');
    root.append(editor, failures, guardrails, consolePanel);
    document.body.append(root);

    let composition: StudioComposition | null = null;
    const view = new EditorView(editor, {
      state,
      nodeViews: variantNodeViews,
      dispatchTransaction(transaction) {
        view.updateState(view.state.apply(transaction));
        composition?.handleEditorDispatch();
      },
    });
    vi.spyOn(view, 'coordsAtPos').mockImplementation((position) => ({
      left: position === target.from ? 100 : 180,
      right: position === target.from ? 100 : 180,
      top: 80,
      bottom: 100,
    }));
    vi.spyOn(editor, 'getBoundingClientRect').mockReturnValue({
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

    const daemon = new ControllableDaemonClient();
    view.focus();
    composition = composeStudio(
      view,
      daemon as unknown as DaemonClient,
      {
        editor,
        failures,
        guardrails,
        console: consolePanel,
        draftDocument: () => draftDocument,
      },
    );
    mounted.push({ composition, view, root });

    clickRewrite(composition);

    await vi.waitFor(() => {
      expect(editor.querySelector(
        '[data-testid="selection-operation-pending"]',
      )).not.toBeNull();
    });
    await vi.waitFor(() => {
      expect(consolePanel.querySelector(
        '[data-testid="console-operation"]',
      )?.textContent).toContain('streaming');
    });

    daemon.resolve('op-1', {
      operation: completedOperation('op-1'),
      result: {
        kind: 'schema',
        value: {
          status: 'complete',
          replacement_markdown: 'Sharper words',
          guardrail_markdown: null,
        },
        guardrail: null,
      },
    });

    await vi.waitFor(() => {
      const proposal = view.dom.querySelector('.proposal-diff');
      expect(proposal?.textContent).toContain('Sharper words');
      expect(buttonLabels(proposal)).toEqual(
        expect.arrayContaining(['Accept', 'Reject']),
      );
    });
    expect(editor.querySelector(
      '[data-testid="selection-operation-pending"]',
    )).toBeNull();
    const reroll = vi.spyOn(composition.runtime, 'reroll')
      .mockReturnValue(null as never);
    findButton(
      consolePanel.querySelector('[data-testid="console-operation"]'),
      'Re-roll',
    ).click();
    expect(reroll).toHaveBeenCalledWith('op-1');
    reroll.mockRestore();

    clickRewrite(composition);
    await vi.waitFor(() => {
      expect(editor.querySelector(
        '[data-testid="selection-operation-pending"]',
      )).not.toBeNull();
    });
    await vi.waitFor(() => {
      expect(Array.from(consolePanel.querySelectorAll(
        '[data-testid="console-operation"]',
      )).at(-1)?.textContent).toContain('streaming');
    });
    const cancel = vi.spyOn(composition.runtime, 'cancel')
      .mockResolvedValueOnce();
    findButton(
      Array.from(consolePanel.querySelectorAll(
        '[data-testid="console-operation"]',
      )).at(-1) ?? null,
      'Cancel',
    ).click();
    expect(cancel).toHaveBeenCalledWith('op-2');
    cancel.mockRestore();
    daemon.resolve('op-2', {
      operation: completedOperation('op-2', {
        state: 'invalid-output',
        error: 'response failed schema validation',
      }),
      result: {
        kind: 'failed',
        error: 'invalid operation result',
      },
    });

    await vi.waitFor(() => {
      expect(failures.querySelector(
        '[data-testid="operation-failure"]',
      )?.textContent).toContain('invalid operation result');
    });
    expect(consolePanel.querySelectorAll(
      '[data-testid="console-operation"]',
    )).toHaveLength(2);
    expect(consolePanel.querySelector(
      '[data-testid="console-entry"]',
    )?.textContent).toContain('Working on op-1.');

    clickRewrite(composition);
    await vi.waitFor(() => {
      expect(Array.from(consolePanel.querySelectorAll(
        '[data-testid="console-operation"]',
      )).at(-1)?.textContent).toContain('streaming');
    });
    daemon.resolve('op-3', {
      operation: completedOperation('op-3'),
      result: {
        kind: 'schema',
        value: {
          status: 'declined',
          replacement_markdown: '',
          guardrail_markdown: 'The request crosses the approved scope.',
        },
        guardrail: 'The request crosses the approved scope.',
      },
    });
    await vi.waitFor(() => {
      expect(guardrails.querySelector(
        '[data-testid="operation-guardrail"]',
      )?.textContent).toContain('crosses the approved scope');
    });
  });
});

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
      schema.node('paragraph', null, schema.text(
        `Before ${SELECTED_TEXT} after.`,
      )),
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
  draftDocument['metadata'] = {
    topic: 'Why constraints create play',
    anchors: ['Players accept the rule.'],
    unknowns: [],
    approvedLessons: [],
    creativeStatus: { phase: 'rapid-prototype' },
    directionApproved: false,
  };
  return { state, draftDocument, target };
}

function completedOperation(
  id: string,
  overrides: Partial<OperationRecord> = {},
): OperationRecord {
  return {
    id,
    operation: 'rewrite-selection',
    state: 'completed',
    stalled: false,
    envelopeJson: '{}',
    jobDir: `/tmp/${id}`,
    threadId: `thread-${id}`,
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
    ...overrides,
  };
}

function clickRewrite(composition: StudioComposition): void {
  composition.runtime.toolbar.element
    .querySelector<HTMLButtonElement>('button[data-action="rewrite"]')!
    .click();
}

function buttonLabels(element: Element | null): string[] {
  return Array.from(
    element?.querySelectorAll('button') ?? [],
    (button) => button.textContent ?? '',
  );
}

function findButton(
  element: Element | null,
  label: string,
): HTMLButtonElement {
  const button = Array.from(
    element?.querySelectorAll<HTMLButtonElement>('button') ?? [],
  ).find((candidate) => candidate.textContent === label);
  if (!button) throw new Error(`button ${label} was not rendered`);
  return button;
}
