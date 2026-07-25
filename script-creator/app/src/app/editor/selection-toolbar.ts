import {
  addAnnotation,
  getLocks,
  lockRange,
  unlockRange,
  type EditorView,
} from '@whp/script-creator-editor-core';
import {
  buildOperationInputs,
  type OperationContext,
} from '../ops/context';
import {
  MODEL_OPTIONS,
  choiceForModelOption,
  modelOptionIndex,
} from '../ops/model-options';
import {
  DEFAULT_PREFERENCE_KEY,
  type ModelPreferenceStore,
} from '../ops/model-preference';
import type {
  BridgeLaunch,
  SelectionTarget,
} from './proposal-bridge';

export interface SelectionOperationBridge {
  launchRewrite(
    inputs: unknown,
    target: SelectionTarget,
  ): BridgeLaunch | unknown;
  launchAlternatives(
    inputs: unknown,
    target: SelectionTarget,
    count: 2 | 3,
  ): BridgeLaunch | unknown;
  launchReview(
    inputs: unknown,
    target: SelectionTarget,
  ): BridgeLaunch | unknown;
}

export type ToolbarPromptKind =
  | 'customInstruction'
  | 'annotation'
  | 'evidenceFlag';

export type ToolbarAction =
  | 'review'
  | 'rewrite'
  | 'alternatives'
  | 'custom'
  | 'lock'
  | 'unlock'
  | 'annotate'
  | 'evidence';

export interface SelectionToolbarOptions {
  view: EditorView;
  container: HTMLElement;
  bridge: SelectionOperationBridge;
  contextForSelection(target: SelectionTarget): OperationContext;
  requestText?: (kind: ToolbarPromptKind) => string | null;
  nextId?: () => string;
  onLaunch?: (launch: unknown) => void;
  onError?: (error: unknown) => void;
  modelPreference?: ModelPreferenceStore;
}

const PROMPTS: Record<ToolbarPromptKind, string> = {
  customInstruction: 'What should the rewrite do?',
  annotation: 'Annotation',
  evidenceFlag: 'What evidence needs verification?',
};

export class SelectionToolbar {
  readonly element: HTMLDivElement;

  private idSequence = 0;
  private readonly view: EditorView;
  private readonly container: HTMLElement;
  private readonly bridge: SelectionOperationBridge;
  private readonly contextForSelection:
    (target: SelectionTarget) => OperationContext;
  private readonly requestText: (kind: ToolbarPromptKind) => string | null;
  private readonly nextId: () => string;
  private readonly onLaunch: (launch: unknown) => void;
  private readonly onError: (error: unknown) => void;
  private readonly modelPreference: ModelPreferenceStore | undefined;
  private alternativeCount: 2 | 3 = 2;
  private lockButton!: HTMLButtonElement;

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (
      event.target instanceof Element
      && event.target.closest('select')
    ) {
      return;
    }
    event.preventDefault();
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const button = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('button[data-action]')
      : null;
    if (!button) return;
    const action = button.dataset['action'] as ToolbarAction | undefined;
    if (!action) return;
    this.runAction(action);
  };

  private readonly handleChange = (event: Event): void => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    if (select.dataset['modelSelect'] !== undefined) {
      this.applyModelChoice(select.selectedIndex);
      return;
    }
    this.alternativeCount = select.value === '3' ? 3 : 2;
  };

  private readonly queueUpdate = (): void => {
    queueMicrotask(() => this.update());
  };

  private readonly handleBlur = (event: FocusEvent): void => {
    const next = event.relatedTarget;
    if (!(next instanceof Node && this.element.contains(next))) {
      this.element.hidden = true;
    }
  };

  constructor(options: SelectionToolbarOptions) {
    this.view = options.view;
    this.container = options.container;
    this.bridge = options.bridge;
    this.contextForSelection = options.contextForSelection;
    this.requestText = options.requestText ?? ((kind) =>
      globalThis.window.prompt(PROMPTS[kind]));
    this.nextId = options.nextId
      ?? (() => `selection-${++this.idSequence}`);
    this.onLaunch = options.onLaunch ?? (() => undefined);
    this.onError = options.onError ?? (() => undefined);
    this.modelPreference = options.modelPreference;

    this.element = this.createElement();
    this.container.append(this.element);
    this.addListeners();
    this.update();
  }

  update(): void {
    const target = this.selectionTarget();
    const toolbarFocused = this.element.contains(document.activeElement);
    if (!target || (!this.view.hasFocus() && !toolbarFocused)) {
      this.element.hidden = true;
      return;
    }

    this.element.hidden = false;
    this.updateLockButton(target);
    const start = this.view.coordsAtPos(target.from);
    const end = this.view.coordsAtPos(target.to);
    const containerRect = this.container.getBoundingClientRect();
    const center =
      (start.left + end.right) / 2 - containerRect.left;
    const left = Math.max(
      8,
      Math.min(
        center - this.element.offsetWidth / 2,
        containerRect.width - this.element.offsetWidth - 8,
      ),
    );
    // Prefer placing the toolbar above the selection. When there is no room
    // above (a top-of-editor selection), place it below the selection instead
    // of clamping it on top of the very text it acts on — otherwise the toolbar
    // covers that paragraph and blocks re-selecting it.
    const selectionTop = Math.min(start.top, end.top) - containerRect.top;
    const selectionBottom = Math.max(start.bottom, end.bottom) - containerRect.top;
    const aboveTop = selectionTop - this.element.offsetHeight - 12;
    const preferredTop = aboveTop >= 8
      ? aboveTop
      : selectionBottom + 12;
    this.element.style.left = `${left}px`;
    this.element.style.top = `${preferredTop}px`;
  }

  destroy(): void {
    this.view.dom.removeEventListener('focus', this.queueUpdate);
    this.view.dom.removeEventListener('blur', this.handleBlur);
    globalThis.window.removeEventListener('resize', this.queueUpdate);
    globalThis.window.removeEventListener('scroll', this.queueUpdate, true);
    this.element.removeEventListener('mousedown', this.handleMouseDown);
    this.element.removeEventListener('click', this.handleClick);
    this.element.removeEventListener('change', this.handleChange);
    this.element.remove();
  }

  private createElement(): HTMLDivElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'selection-toolbar';
    toolbar.hidden = true;
    toolbar.style.position = 'absolute';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Selected text actions');

    this.lockButton = actionButton('lock', 'Lock');
    toolbar.append(
      toolbarGroup('actions', [
        actionButton('review', 'Review'),
        actionButton('rewrite', 'Rewrite'),
        actionButton('alternatives', 'Alternatives'),
      ]),
      toolbarDivider(),
      toolbarGroup('annotations', [
        actionButton('custom', 'Custom instruction'),
        this.lockButton,
        actionButton('annotate', 'Annotate'),
        actionButton('evidence', 'Flag for evidence'),
      ]),
      toolbarDivider(),
      toolbarGroup('settings', [
        alternativeCountSelect(),
        modelSelect(this.currentModelIndex()),
      ]),
    );
    return toolbar;
  }

  private addListeners(): void {
    this.view.dom.addEventListener('focus', this.queueUpdate);
    this.view.dom.addEventListener('blur', this.handleBlur);
    globalThis.window.addEventListener('resize', this.queueUpdate);
    globalThis.window.addEventListener('scroll', this.queueUpdate, true);
    this.element.addEventListener('mousedown', this.handleMouseDown);
    this.element.addEventListener('click', this.handleClick);
    this.element.addEventListener('change', this.handleChange);
  }

  private runAction(action: ToolbarAction): void {
    const target = this.selectionTarget();
    if (!target) {
      this.element.hidden = true;
      return;
    }

    try {
      switch (action) {
        case 'review':
          this.launchReview(target);
          break;
        case 'rewrite':
          this.launchRewrite(target);
          break;
        case 'alternatives':
          this.launchAlternatives(target);
          break;
        case 'custom':
          this.launchCustomRewrite(target);
          break;
        case 'lock':
          this.lock(target);
          break;
        case 'unlock':
          this.unlock(target);
          break;
        case 'annotate':
          this.annotate(target, 'reviewFinding', 'annotation');
          break;
        case 'evidence':
          this.annotate(target, 'evidenceFlag', 'evidenceFlag');
          break;
      }
    } catch (error) {
      this.onError(error);
    } finally {
      this.view.focus();
      this.update();
    }
  }

  private launchReview(target: SelectionTarget): void {
    const context = this.currentContext(target);
    this.onLaunch(this.bridge.launchReview(
      buildOperationInputs(context, 'review'),
      target,
    ));
  }

  private launchRewrite(target: SelectionTarget): void {
    const context = this.currentContext(target);
    this.onLaunch(this.bridge.launchRewrite(
      buildOperationInputs(context, 'rewrite-selection'),
      target,
    ));
  }

  private launchAlternatives(target: SelectionTarget): void {
    const context = this.currentContext(target);
    const count = this.alternativeCount;
    this.onLaunch(this.bridge.launchAlternatives(
      buildOperationInputs(context, {
        kind: 'generate-alternatives',
        count,
      }),
      target,
      count,
    ));
  }

  private launchCustomRewrite(target: SelectionTarget): void {
    const instruction = requestedText(
      this.requestText('customInstruction'),
    );
    if (!instruction) return;
    const context = {
      ...this.currentContext(target),
      requestedScope: instruction,
    };
    this.onLaunch(this.bridge.launchRewrite(
      buildOperationInputs(context, 'rewrite-selection'),
      target,
    ));
  }

  private lock(target: SelectionTarget): void {
    lockRange(
      this.view.state,
      (transaction) => this.view.dispatch(transaction),
      { lockId: this.nextId(), ...target },
    );
  }

  private unlock(target: SelectionTarget): void {
    const lockIds = new Set(
      this.locksOverlapping(target).map((lock) => lock.lockId),
    );
    for (const lockId of lockIds) {
      unlockRange(
        this.view.state,
        (transaction) => this.view.dispatch(transaction),
        lockId,
      );
    }
  }

  private locksOverlapping(
    target: SelectionTarget,
  ): ReturnType<typeof getLocks> {
    return getLocks(this.view.state).filter(
      (lock) => lock.from < target.to && lock.to > target.from,
    );
  }

  private updateLockButton(target: SelectionTarget): void {
    const locked = this.locksOverlapping(target).length > 0;
    this.lockButton.dataset['action'] = locked ? 'unlock' : 'lock';
    this.lockButton.textContent = locked ? 'Unlock' : 'Lock';
    this.lockButton.setAttribute(
      'aria-label',
      locked ? 'Unlock selected passage' : 'Lock selected passage',
    );
  }

  private annotate(
    target: SelectionTarget,
    kind: 'reviewFinding' | 'evidenceFlag',
    prompt: 'annotation' | 'evidenceFlag',
  ): void {
    const message = requestedText(this.requestText(prompt));
    if (!message) return;
    addAnnotation(
      this.view.state,
      (transaction) => this.view.dispatch(transaction),
      {
        id: this.nextId(),
        kind,
        ...target,
        message,
      },
    );
  }

  private currentContext(
    target: SelectionTarget,
  ): OperationContext {
    return {
      ...this.contextForSelection(target),
      selection: this.view.state.doc.textBetween(
        target.from,
        target.to,
        '\n\n',
      ),
    };
  }

  private selectionTarget(): SelectionTarget | null {
    const { from, to, empty } = this.view.state.selection;
    return empty || from >= to ? null : { from, to };
  }

  private currentModelIndex(): number {
    return modelOptionIndex(
      MODEL_OPTIONS,
      this.modelPreference?.get(DEFAULT_PREFERENCE_KEY) ?? null,
    );
  }

  private applyModelChoice(index: number): void {
    if (!this.modelPreference) return;
    this.modelPreference.set(
      DEFAULT_PREFERENCE_KEY,
      choiceForModelOption(MODEL_OPTIONS[index]),
    );
  }
}

function toolbarGroup(
  name: 'actions' | 'annotations' | 'settings',
  children: HTMLElement[],
): HTMLDivElement {
  const group = document.createElement('div');
  group.className = `toolbar-group toolbar-${name}`;
  group.dataset['group'] = name;
  group.append(...children);
  return group;
}

function toolbarDivider(): HTMLSpanElement {
  const divider = document.createElement('span');
  divider.className = 'toolbar-divider';
  divider.setAttribute('aria-hidden', 'true');
  return divider;
}

function actionButton(
  action: ToolbarAction,
  label: string,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset['action'] = action;
  button.textContent = label;
  return button;
}

function alternativeCountSelect(): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'alternative-count';
  const text = document.createElement('span');
  text.textContent = 'Count';
  const select = document.createElement('select');
  select.dataset['alternativeCount'] = '';
  select.setAttribute('aria-label', 'Alternative count');
  for (const count of [2, 3]) {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = String(count);
    select.append(option);
  }
  label.append(text, select);
  return label;
}

function modelSelect(selectedIndex: number): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'model-select';
  const text = document.createElement('span');
  text.textContent = 'Model';
  const select = document.createElement('select');
  select.dataset['modelSelect'] = '';
  select.setAttribute('aria-label', 'Model and effort');
  MODEL_OPTIONS.forEach((option, index) => {
    const element = document.createElement('option');
    element.value = String(index);
    element.textContent = option.label;
    select.append(element);
  });
  select.selectedIndex = selectedIndex;
  label.append(text, select);
  return label;
}

function requestedText(value: string | null): string | null {
  const text = value?.trim() ?? '';
  return text === '' ? null : text;
}
