import { signal } from '@angular/core';
import {
  EditorState,
  EditorView,
  corePlugins,
  getAnnotations,
  getProposals,
  schema,
  variantNodeViews,
  type Proposal,
} from '@whp/script-creator-editor-core';
import { describe, expect, it, vi } from 'vitest';
import type {
  OperationName,
  OperationResult,
} from '../api/client';
import type {
  OperationPhase,
  TrackedOperation,
} from '../ops/tracker';
import {
  ProposalBridge,
  bridgeDecision,
  type BridgeEffect,
  type BridgeOperation,
  type BridgeResultKind,
  type OperationLauncher,
  type ProposalLaunchMeta,
} from './proposal-bridge';

interface LauncherFixture {
  launcher: OperationLauncher;
  launch: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
}

const rewriteResult: OperationResult = {
  kind: 'schema',
  value: {
    status: 'complete',
    replacement_markdown: 'A tighter passage.',
    guardrail_markdown: null,
  },
  guardrail: null,
};

function trackedOperation(
  id: string,
  result: OperationResult,
  meta: ProposalLaunchMeta,
  phase: OperationPhase = 'done',
): TrackedOperation<ProposalLaunchMeta> {
  return {
    id: signal<string | null>(id),
    phase: signal(phase),
    events: signal([]),
    consoleEntries: signal([]),
    result: signal(result),
    telemetry: signal({ tokens: null, elapsed: null }),
    stallFlag: signal(false),
    remainingHops: signal(3),
    canResume: signal(true),
    meta,
  };
}

function launcherFixture(
  results: OperationResult[],
  phases: OperationPhase[] = [],
): LauncherFixture {
  let sequence = 0;
  let latestMeta: ProposalLaunchMeta | undefined;
  const take = (
    meta: ProposalLaunchMeta,
  ): TrackedOperation<ProposalLaunchMeta> => {
    latestMeta = meta;
    const index = sequence++;
    return trackedOperation(
      `op-${index + 1}`,
      results[index]!,
      meta,
      phases[index],
    );
  };
  const launch = vi.fn((
    _operation: OperationName,
    _inputs: unknown,
    meta: ProposalLaunchMeta,
  ) => take(meta));
  const resume = vi.fn((_id: string) => take(latestMeta!));

  return {
    launcher: { launch, resume },
    launch,
    resume,
  };
}

function editorWithText(text = 'Before selected words after.'): {
  view: EditorView;
  target: { from: number; to: number };
} {
  const doc = schema.node('doc', { format: 'narration', preamble: '' }, [
    schema.node('beat', {
      beatId: 'beat-1',
      title: 'The test beat',
      timeTargetMs: 30_000,
    }, [
      schema.node('paragraph', null, schema.text(text)),
    ]),
  ]);
  const state = EditorState.create({ doc, plugins: corePlugins() });
  let from = -1;
  state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const offset = node.text.indexOf('selected words');
      if (offset >= 0) from = pos + offset;
    }
  });
  const target = { from, to: from + 'selected words'.length };
  const view = new EditorView(document.createElement('div'), {
    state,
    nodeViews: variantNodeViews,
    dispatchTransaction(transaction) {
      view.updateState(view.state.apply(transaction));
    },
  });
  return { view, target };
}

function idFactory(ids: string[]): () => string {
  return () => ids.shift()!;
}

describe('bridgeDecision', () => {
  it.each<[
    BridgeOperation,
    'submit' | 'result',
    BridgeResultKind | undefined,
    BridgeEffect[],
  ]>([
    ['rewrite', 'submit', undefined, ['requestProposal', 'launchOperation']],
    ['rewrite', 'result', 'schema', ['receiveProposal']],
    ['reroll', 'submit', undefined, [
      'rejectProposal',
      'requestProposal',
      'resumeOperation',
    ]],
    ['reroll', 'result', 'schema', ['receiveProposal']],
    ['alternatives', 'submit', undefined, [
      'requestProposal',
      'launchOperation',
    ]],
    ['alternatives', 'result', 'schema', ['insertVariantSet']],
    ['review', 'submit', undefined, [
      'requestProposal',
      'launchOperation',
    ]],
    ['review', 'result', 'schema', ['addAnnotations']],
    ['rewrite', 'result', 'guardrail', ['showGuardrail']],
    ['reroll', 'result', 'guardrail', ['showGuardrail']],
    ['alternatives', 'result', 'guardrail', ['showGuardrail']],
    ['review', 'result', 'guardrail', ['showGuardrail']],
  ])(
    '%s at %s with %s yields only the expected effects',
    (operation, stage, result, effects) => {
      expect(bridgeDecision({ operation, stage, result })).toEqual(effects);
    },
  );
});

describe('ProposalBridge', () => {
  it('requests and receives a rewrite through editor-core, then accepts it', async () => {
    const { view, target } = editorWithText();
    const fixture = launcherFixture([rewriteResult]);
    const bridge = new ProposalBridge(view, fixture.launcher, {
      nextId: idFactory(['proposal-1']),
    });

    const launch = bridge.launchRewrite({ selection: 'selected words' }, target);

    expect(getProposals(view.state)).toEqual([
      expect.objectContaining({
        id: 'proposal-1',
        ...target,
        status: 'pending',
        fingerprint: 'selected words',
      }),
    ]);
    expect(fixture.launch).toHaveBeenCalledWith(
      'rewrite-selection',
      { selection: 'selected words' },
      expect.objectContaining({
        operation: 'rewrite',
        proposalId: 'proposal-1',
        target,
      }),
    );

    await launch.settled;

    expect(bridge.proposalLayers()).toEqual([{
      id: 'proposal-1',
      ...target,
      status: 'ready',
      base: 'selected words',
      current: 'selected words',
      proposed: 'A tighter passage.',
    }]);
    expect(bridge.accept('proposal-1')).toBe(true);
    expect(view.state.doc.textContent).toContain('A tighter passage.');
    expect(view.state.doc.textContent).not.toContain('selected words');
    view.destroy();
  });

  it('rerolls by rejecting first and keeping the same mapped target', async () => {
    const { view, target } = editorWithText();
    const fixture = launcherFixture([rewriteResult, {
      ...rewriteResult,
      value: {
        status: 'complete',
        replacement_markdown: 'A second take.',
        guardrail_markdown: null,
      },
    }]);
    const bridge = new ProposalBridge(view, fixture.launcher, {
      nextId: idFactory(['proposal-1', 'proposal-2']),
    });
    const first = bridge.launchRewrite({}, target);
    await first.settled;

    const rerolled = bridge.reroll(first);

    expect(getProposals(view.state)).toEqual([
      expect.objectContaining({
        id: 'proposal-2',
        ...target,
        status: 'pending',
      }),
    ]);
    expect(fixture.resume).toHaveBeenCalledWith('op-1');

    await rerolled.settled;

    expect(bridge.proposalLayers()).toEqual([
      expect.objectContaining({
        id: 'proposal-2',
        ...target,
        base: 'selected words',
        current: 'selected words',
        proposed: 'A second take.',
      }),
    ]);
    view.destroy();
  });

  it('inserts labeled alternatives as an editor-core variant set', async () => {
    const { view, target } = editorWithText();
    const fixture = launcherFixture([{
      kind: 'schema',
      value: {
        status: 'complete',
        options: [
          { label: 'Direct', markdown: '**Say it plainly.**' },
          { label: 'Playful', markdown: 'Make the rule feel like a toy.' },
        ],
        guardrail_markdown: null,
      },
      guardrail: null,
    }]);
    const bridge = new ProposalBridge(view, fixture.launcher, {
      nextId: idFactory(['alternatives-anchor', 'variant-1']),
    });

    const launch = bridge.launchAlternatives({}, target, 2);
    await launch.settled;

    let variant: { attrs: Record<string, unknown> } | undefined;
    view.state.doc.descendants((node) => {
      if (node.type.name === 'inlineVariantSet') {
        variant = node as unknown as { attrs: Record<string, unknown> };
      }
    });
    expect(variant?.attrs).toEqual({
      variantId: 'variant-1',
      activeIndex: 0,
      settled: false,
      options: [
        { label: 'Direct', text: 'Say it plainly.' },
        { label: 'Playful', text: 'Make the rule feel like a toy.' },
      ],
    });
    expect(fixture.launch).toHaveBeenCalledWith(
      'generate-alternatives',
      {},
      {
        operation: 'alternatives',
        anchorId: 'alternatives-anchor',
        count: 2,
      },
    );
    view.destroy();
  });

  it('maps an alternatives anchor across an edit before the in-flight range', async () => {
    const { view, target } = editorWithText();
    const fixture = launcherFixture([{
      kind: 'schema',
      value: {
        status: 'complete',
        options: [
          { label: 'Direct', markdown: 'Say it plainly.' },
          { label: 'Playful', markdown: 'Make the rule feel like a toy.' },
        ],
        guardrail_markdown: null,
      },
      guardrail: null,
    }]);
    const bridge = new ProposalBridge(view, fixture.launcher, {
      nextId: idFactory(['alternatives-anchor', 'variant-1']),
    });

    const launch = bridge.launchAlternatives({}, target, 2);
    const prefix = 'Earlier: ';
    view.dispatch(view.state.tr.insertText(
      prefix,
      target.from - 'Before '.length,
    ));
    await launch.settled;

    let variantPosition = -1;
    view.state.doc.descendants((node, position) => {
      if (node.type.name === 'inlineVariantSet') {
        variantPosition = position;
      }
    });
    expect(variantPosition).toBe(target.from + prefix.length);
    expect(fixture.launch).toHaveBeenCalledWith(
      'generate-alternatives',
      {},
      {
        operation: 'alternatives',
        anchorId: 'alternatives-anchor',
        count: 2,
      },
    );
    expect(getProposals(view.state)).toEqual([]);
    view.destroy();
  });

  it('anchors review findings by text and falls back to the selection', async () => {
    const { view, target } = editorWithText();
    const fixture = launcherFixture([{
      kind: 'schema',
      value: {
        status: 'complete',
        findings: [
          {
            anchor: 'words',
            severity: 'important',
            finding_markdown: 'This phrase is vague.',
            optional_direction_markdown: 'Name the specific action.',
          },
          {
            anchor: 'missing phrase',
            severity: 'optional',
            finding_markdown: 'Check the surrounding rhythm.',
            optional_direction_markdown: null,
          },
        ],
        guardrail_markdown: null,
      },
      guardrail: null,
    }]);
    const bridge = new ProposalBridge(view, fixture.launcher, {
      nextId: idFactory(['review-anchor', 'finding-1', 'finding-2']),
    });

    const launch = bridge.launchReview({}, target);
    await launch.settled;

    expect(getAnnotations(view.state)).toEqual([
      {
        id: 'finding-1',
        kind: 'reviewFinding',
        from: target.from + 'selected '.length,
        to: target.to,
        message: 'This phrase is vague.',
        orphaned: false,
      },
      {
        id: 'finding-2',
        kind: 'reviewFinding',
        ...target,
        message: 'Check the surrounding rhythm.',
        orphaned: false,
      },
    ]);
    expect(bridge.findings()).toEqual([
      expect.objectContaining({
        annotationId: 'finding-1',
        anchor: 'words',
        severity: 'important',
        from: target.from + 'selected '.length,
        to: target.to,
      }),
      expect.objectContaining({
        annotationId: 'finding-2',
        anchor: 'missing phrase',
        ...target,
      }),
    ]);
    view.destroy();
  });

  it('maps a review anchor across an edit before the in-flight range', async () => {
    const { view, target } = editorWithText();
    const fixture = launcherFixture([{
      kind: 'schema',
      value: {
        status: 'complete',
        findings: [{
          anchor: 'words',
          severity: 'important',
          finding_markdown: 'This phrase is vague.',
          optional_direction_markdown: null,
        }],
        guardrail_markdown: null,
      },
      guardrail: null,
    }]);
    const bridge = new ProposalBridge(view, fixture.launcher, {
      nextId: idFactory(['review-anchor', 'finding-1']),
    });

    const launch = bridge.launchReview({}, target);
    const prefix = 'Earlier: ';
    view.dispatch(view.state.tr.insertText(
      prefix,
      target.from - 'Before '.length,
    ));
    await launch.settled;

    expect(getAnnotations(view.state)).toEqual([
      expect.objectContaining({
        id: 'finding-1',
        from: target.from + prefix.length + 'selected '.length,
        to: target.to + prefix.length,
        orphaned: false,
      }),
    ]);
    expect(fixture.launch).toHaveBeenCalledWith(
      'review',
      {},
      {
        operation: 'review',
        anchorId: 'review-anchor',
      },
    );
    expect(getProposals(view.state)).toEqual([]);
    view.destroy();
  });

  it('surfaces a guardrail callout and leaves the document untouched', async () => {
    const { view, target } = editorWithText();
    const before = view.state.doc;
    const fixture = launcherFixture([{
      kind: 'schema',
      value: {
        status: 'declined',
        replacement_markdown: '',
        guardrail_markdown: 'The requested change crosses the approved scope.',
      },
      guardrail: 'The requested change crosses the approved scope.',
    }], ['guardrail']);
    const bridge = new ProposalBridge(view, fixture.launcher, {
      nextId: idFactory(['proposal-1']),
    });

    const launch = bridge.launchRewrite({}, target);
    await launch.settled;

    expect(view.state.doc.eq(before)).toBe(true);
    expect(getProposals(view.state)).toEqual([]);
    expect(bridge.guardrails()).toEqual([{
      operationId: 'op-1',
      operation: 'rewrite',
      markdown: 'The requested change crosses the approved scope.',
    }]);
    view.destroy();
  });

  it('surfaces conflicted base, current, and proposed text without rewriting them', async () => {
    const { view, target } = editorWithText();
    const fixture = launcherFixture([rewriteResult]);
    const bridge = new ProposalBridge(view, fixture.launcher, {
      nextId: idFactory(['proposal-1']),
    });
    const launch = bridge.launchRewrite({}, target);

    view.dispatch(view.state.tr.insertText('changed words', target.from, target.to));
    await launch.settled;

    const editorCoreProposal = getProposals(view.state)[0] as Proposal;
    expect(bridge.proposalLayers()).toEqual([{
      id: editorCoreProposal.id,
      from: editorCoreProposal.from,
      to: editorCoreProposal.to,
      status: editorCoreProposal.status,
      base: editorCoreProposal.fingerprint,
      current: editorCoreProposal.current,
      proposed: editorCoreProposal.replacement,
    }]);
    view.destroy();
  });

  it('does not apply a late result after the bridge becomes inactive', async () => {
    const { view, target } = editorWithText();
    const phase = signal<OperationPhase>('streaming');
    const tracked = {
      ...trackedOperation(
        'op-1',
        rewriteResult,
        {
          operation: 'rewrite' as const,
          target,
          proposalId: 'proposal-1',
        },
      ),
      phase,
    };
    const launcher: OperationLauncher = {
      launch: () => tracked,
      resume: () => tracked,
    };
    let active = true;
    const bridge = new ProposalBridge(view, launcher, {
      nextId: idFactory(['proposal-1']),
      isActive: () => active,
      pollMs: 1,
    });
    const launch = bridge.launchRewrite({}, target);

    active = false;

    await expect(launch.settled).resolves.toEqual({
      status: 'failed',
      error: 'proposal bridge is no longer active',
    });
    expect(getProposals(view.state)).toEqual([
      expect.objectContaining({
        id: 'proposal-1',
        status: 'pending',
      }),
    ]);
    expect(view.state.doc.textContent).toContain('selected words');
    expect(view.state.doc.textContent).not.toContain('A tighter passage.');
    view.destroy();
  });
});
