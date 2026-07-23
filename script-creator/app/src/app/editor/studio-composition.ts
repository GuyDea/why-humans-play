import {
  Decoration,
  DecorationSet,
  type EditorState,
  type EditorView,
  type Proposal,
} from '@whp/script-creator-editor-core';
import type {
  DaemonClient,
  DraftDocument,
} from '../api/client';
import {
  operationFailurePresentation,
  type OperationFailurePresentation,
} from '../ops/failure-presentation';
import {
  formatElapsed,
  formatTokens,
  type StudioConsoleEntry,
} from '../panels/agent-console';
import type {
  FindingLayer,
  GuardrailCallout,
} from './proposal-bridge';
import {
  SelectionRuntime,
  type SelectionRuntimeRecord,
} from './selection-runtime';

export interface StudioHostElements {
  editor: HTMLElement;
  failures: HTMLElement;
  guardrails: HTMLElement;
  console: HTMLElement;
  draftDocument(): DraftDocument;
  onFindings?: (findings: readonly FindingLayer[]) => void;
  onLaunch?: () => void;
  onError?: (error: unknown) => void;
}

export interface StudioComposition {
  readonly runtime: SelectionRuntime;
  handleEditorDispatch(): void;
  destroy(): void;
}

export function composeStudio(
  view: EditorView,
  client: DaemonClient,
  hosts: StudioHostElements,
): StudioComposition {
  const renderer = new StudioLifecycleRenderer(hosts);
  const previousDecorations = view.props.decorations;
  const onError = hosts.onError ?? (() => undefined);
  let activeRuntime: SelectionRuntime | null = null;
  const runtime = new SelectionRuntime({
    view,
    container: hosts.editor,
    client,
    draftDocument: hosts.draftDocument,
    onRecords: (records) => {
      if (activeRuntime) renderer.renderRecords(records, activeRuntime);
    },
    onOutcomes: ({ findings, guardrails, failures }) => {
      renderer.renderFailures(failures);
      renderer.renderGuardrails(guardrails);
      hosts.onFindings?.(findings);
    },
    onLaunch: hosts.onLaunch,
    onError: hosts.onError,
  });
  activeRuntime = runtime;

  view.setProps({
    decorations: (state) => proposalDecorations(
      state,
      runtime,
      onError,
    ),
  });
  renderer.renderRecords(runtime.tracker.history(), runtime);

  let destroyed = false;
  return {
    runtime,
    handleEditorDispatch(): void {
      if (destroyed) return;
      runtime.handleEditorDispatch();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      runtime.destroy();
      view.setProps({ decorations: previousDecorations });
      renderer.destroy();
    },
  };
}

class StudioLifecycleRenderer {
  private pending: HTMLElement | null = null;
  private readonly document: Document;
  private readonly onError: (error: unknown) => void;

  constructor(private readonly hosts: StudioHostElements) {
    this.document = hosts.editor.ownerDocument;
    this.onError = hosts.onError ?? (() => undefined);
    hosts.failures.setAttribute('aria-live', 'polite');
    hosts.guardrails.setAttribute('aria-live', 'polite');
    hosts.console.setAttribute('aria-live', 'polite');
  }

  renderRecords(
    records: readonly SelectionRuntimeRecord[],
    runtime: SelectionRuntime,
  ): void {
    this.renderPending(records, runtime);
    this.renderConsole(records, runtime);
  }

  renderFailures(
    failures: readonly OperationFailurePresentation[],
  ): void {
    this.hosts.failures.replaceChildren(
      ...failures.map((failure) => {
        const article = this.document.createElement('article');
        article.className = 'operation-failure-callout';
        article.dataset['testid'] = 'operation-failure';
        article.setAttribute('role', 'alert');
        const heading = this.document.createElement('strong');
        heading.textContent = `${failure.operation} · ${failure.state}`;
        const reason = this.document.createElement('p');
        reason.textContent = failure.reason;
        article.append(heading, reason);
        return article;
      }),
    );
  }

  renderGuardrails(guardrails: readonly GuardrailCallout[]): void {
    this.hosts.guardrails.replaceChildren(
      ...guardrails.map((guardrail) => {
        const article = this.document.createElement('article');
        article.className = 'guardrail-callout';
        article.dataset['testid'] = 'operation-guardrail';
        const heading = this.document.createElement('strong');
        heading.textContent = `${guardrail.operation} guardrail`;
        const message = this.document.createElement('p');
        message.textContent = guardrail.markdown;
        article.append(heading, message);
        return article;
      }),
    );
  }

  destroy(): void {
    this.pending?.remove();
    this.pending = null;
    this.hosts.failures.replaceChildren();
    this.hosts.guardrails.replaceChildren();
    this.hosts.console.replaceChildren();
  }

  private renderPending(
    records: readonly SelectionRuntimeRecord[],
    runtime: SelectionRuntime,
  ): void {
    this.pending?.remove();
    this.pending = null;
    const active = lastActiveRecord(records);
    if (!active) return;

    const pending = this.document.createElement('div');
    pending.className = 'selection-operation-pending';
    pending.dataset['testid'] = 'selection-operation-pending';
    pending.dataset['phase'] = active.phase();
    pending.setAttribute('role', 'status');
    pending.textContent =
      `${operationLabel(active.operation)} · ${active.phase()}…`;
    positionPending(pending, runtime.toolbar.element);
    this.hosts.editor.append(pending);
    this.pending = pending;
  }

  private renderConsole(
    records: readonly SelectionRuntimeRecord[],
    runtime: SelectionRuntime,
  ): void {
    const panel = this.document.createElement('section');
    panel.className = 'agent-console-panel';
    panel.setAttribute('aria-label', 'Agent console');

    const heading = this.document.createElement('header');
    const title = this.document.createElement('strong');
    title.textContent = 'Agent console';
    const count = this.document.createElement('span');
    count.textContent = String(records.length);
    heading.append(title, count);
    panel.append(heading);

    const operations = this.document.createElement('ol');
    operations.className = 'console-operation-list';
    if (records.length === 0) {
      const empty = this.document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'Operations will appear here when an agent starts.';
      operations.append(empty);
    } else {
      for (const record of records) {
        operations.append(this.consoleOperation(record, runtime));
      }
    }
    panel.append(operations);
    this.hosts.console.replaceChildren(panel);
  }

  private consoleOperation(
    record: SelectionRuntimeRecord,
    runtime: SelectionRuntime,
  ): HTMLLIElement {
    const item = this.document.createElement('li');
    item.className = 'console-operation';
    item.dataset['testid'] = 'console-operation';
    item.dataset['phase'] = record.phase();
    item.dataset['state'] = record.state() ?? '';

    const summary = this.document.createElement('div');
    summary.className = 'console-operation-summary';
    const label = this.document.createElement('strong');
    label.textContent = operationLabel(record.operation);
    const state = this.document.createElement('span');
    state.textContent =
      `${record.phase()} · ${record.state() ?? 'pending'}`;
    summary.append(label, state);

    const telemetry = this.document.createElement('span');
    telemetry.className = 'console-telemetry';
    telemetry.textContent = [
      `Tokens ${formatTokens(record.telemetry().tokens)}`,
      `Elapsed ${formatElapsed(record.telemetry().elapsed)}`,
      `Re-rolls ${record.remainingHops()}`,
    ].join(' · ');
    summary.append(telemetry);
    item.append(summary);

    const entries = this.document.createElement('ol');
    entries.className = 'console-entry-list';
    for (const entry of consoleEntries(record)) {
      entries.append(this.consoleEntry(entry));
    }
    if (entries.childElementCount === 0) {
      const empty = this.document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'Waiting for the first console event…';
      entries.append(empty);
    }
    item.append(entries);

    const actions = this.document.createElement('div');
    actions.className = 'console-actions';
    const operationId = record.id();
    const canCancel = operationId !== null
      && (
        record.phase() === 'submitting'
        || record.phase() === 'streaming'
      );
    actions.append(
      actionButton(
        this.document,
        'Cancel',
        () => {
          if (!operationId) return;
          void runtime.cancel(operationId).catch(this.onError);
        },
        !canCancel,
      ),
      actionButton(
        this.document,
        'Re-roll',
        () => {
          if (!operationId) return;
          try {
            runtime.reroll(operationId);
          } catch (error) {
            this.onError(error);
          }
        },
        operationId === null || !runtime.canReroll(operationId),
      ),
    );
    item.append(actions);
    return item;
  }

  private consoleEntry(entry: StudioConsoleEntry): HTMLLIElement {
    const item = this.document.createElement('li');
    item.dataset['testid'] = 'console-entry';
    item.dataset['kind'] = entry.kind;
    const kind = this.document.createElement('span');
    kind.textContent = entry.kind;
    const text = this.document.createElement('pre');
    text.textContent = entry.text;
    item.append(kind, text);
    return item;
  }
}

function proposalDecorations(
  state: EditorState,
  runtime: SelectionRuntime,
  onError: (error: unknown) => void,
): DecorationSet {
  const decorations: Decoration[] = [];
  for (const proposal of runtime.proposals()) {
    if (proposal.from < proposal.to) {
      const className = proposal.status === 'pending'
        ? 'proposal-pending'
        : proposal.status === 'conflicted'
          ? 'proposal-conflicted'
          : 'proposal-original';
      decorations.push(Decoration.inline(
        proposal.from,
        proposal.to,
        { class: className },
      ));
    }
    const widgetAt = Math.max(
      0,
      Math.min(proposal.to, state.doc.content.size),
    );
    decorations.push(Decoration.widget(
      widgetAt,
      () => proposalWidget(proposal, runtime, onError),
      {
        key: [
          'proposal',
          proposal.id,
          proposal.status,
          proposal.replacement ?? '',
        ].join('-'),
        side: 1,
      },
    ));
  }
  return DecorationSet.create(state.doc, decorations);
}

function proposalWidget(
  proposal: Proposal,
  runtime: SelectionRuntime,
  onError: (error: unknown) => void,
): HTMLElement {
  const document = runtime.toolbar.element.ownerDocument;
  const diff = document.createElement('span');
  diff.className = proposal.status === 'conflicted'
    ? 'proposal-diff is-conflicted'
    : 'proposal-diff';
  diff.contentEditable = 'false';

  if (proposal.status === 'conflicted') {
    diff.append(
      conflictValue(document, 'Base', proposal.fingerprint),
      conflictValue(document, 'Current', proposal.current ?? ''),
      conflictValue(document, 'Proposed', proposal.replacement ?? ''),
    );
  } else {
    const result = document.createElement('ins');
    result.textContent = proposal.status === 'pending'
      ? 'Agent drafting…'
      : proposal.replacement ?? 'No replacement returned';
    diff.append(result);
  }

  if (proposal.status !== 'pending') {
    diff.append(
      actionButton(
        document,
        'Accept',
        () => runtime.acceptProposal(proposal.id),
        proposal.status !== 'ready',
      ),
      actionButton(
        document,
        'Reject',
        () => runtime.rejectProposal(proposal.id),
      ),
      actionButton(
        document,
        'Re-roll',
        () => {
          try {
            runtime.rerollProposal(proposal.id);
          } catch (error) {
            onError(error);
          }
        },
        !runtime.canRerollProposal(proposal.id),
      ),
    );
  }
  return diff;
}

function conflictValue(
  document: Document,
  label: 'Base' | 'Current' | 'Proposed',
  value: string,
): HTMLElement {
  const row = document.createElement('span');
  row.className = 'proposal-conflict-value';
  const heading = document.createElement('strong');
  heading.textContent = label;
  const text = document.createElement('span');
  text.dataset['conflictValue'] = label;
  text.textContent = value;
  row.append(heading, text);
  return row;
}

function actionButton(
  document: Document,
  label: string,
  action: () => void,
  disabled = false,
): HTMLButtonElement {
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

function consoleEntries(
  record: SelectionRuntimeRecord,
): StudioConsoleEntry[] {
  const entries = [...record.consoleEntries()];
  const result = record.result();
  const failure = operationFailurePresentation({
    operation: record.operation,
    phase: record.phase(),
    state: record.state(),
    reason: result?.kind === 'failed' ? result.error : null,
    errorMessage: record.errorMessage(),
  });
  if (failure) {
    entries.push({
      seq: Math.max(0, ...entries.map(({ seq }) => seq)) + 1,
      ...failure.consoleEntry,
    });
  }
  return entries;
}

function operationLabel(operation: string): string {
  return operation
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function lastActiveRecord(
  records: readonly SelectionRuntimeRecord[],
): SelectionRuntimeRecord | undefined {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (
      record
      && (
        record.phase() === 'submitting'
        || record.phase() === 'streaming'
      )
    ) {
      return record;
    }
  }
  return undefined;
}

function positionPending(
  pending: HTMLElement,
  toolbar: HTMLElement,
): void {
  pending.style.position = 'absolute';
  pending.style.left = toolbar.style.left || '0.75rem';
  pending.style.top = toolbar.style.top
    ? `calc(${toolbar.style.top} + 2.4rem)`
    : '0.75rem';
}
