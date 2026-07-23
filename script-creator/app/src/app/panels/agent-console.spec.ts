import '@angular/compiler';
import {
  createComponent,
  provideZonelessChangeDetection,
  signal,
  ɵSIGNAL,
  type ɵInputSignalNode,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import type { TrackedOperation } from '../ops/tracker';
import {
  AgentConsole,
  AgentConsoleModel,
  formatElapsed,
  formatTokens,
  type AgentConsoleTracker,
  type StudioConsoleEntry,
} from './agent-console';

interface Meta {
  operation: string;
}

function tracked(
  id: string,
  overrides: Partial<{
    phase: 'streaming' | 'done';
    canResume: boolean;
    entries: StudioConsoleEntry[];
    tokens: number | null;
    elapsed: number | null;
  }> = {},
): TrackedOperation<Meta, StudioConsoleEntry> {
  return {
    id: signal<string | null>(id),
    phase: signal(overrides.phase ?? 'done'),
    events: signal([]),
    consoleEntries: signal(overrides.entries ?? []),
    result: signal(null),
    telemetry: signal({
      tokens: overrides.tokens ?? null,
      elapsed: overrides.elapsed ?? null,
    }),
    stallFlag: signal(false),
    remainingHops: signal(overrides.canResume ? 1 : 0),
    canResume: signal(overrides.canResume ?? false),
    meta: { operation: 'review' },
  };
}

describe('AgentConsoleModel', () => {
  it('lists tracker history and defaults to the newest operation stream', () => {
    const first = tracked('op-1');
    const latest = tracked('op-2', {
      phase: 'streaming',
      entries: [{ seq: 1, kind: 'message', text: 'Working on the hook.' }],
      tokens: 84,
      elapsed: 1_250,
    });
    const history = signal([first, latest] as const);
    const tracker: AgentConsoleTracker<Meta> = {
      history,
      cancel: vi.fn(),
      resume: vi.fn(),
    };

    const model = new AgentConsoleModel(tracker);

    expect(model.operations()).toEqual([first, latest]);
    expect(model.selected()).toBe(latest);
    expect(model.selected()?.consoleEntries()).toEqual([
      { seq: 1, kind: 'message', text: 'Working on the hook.' },
    ]);
  });

  it('cancels the selected streaming operation through the tracker', async () => {
    const operation = tracked('op-1', { phase: 'streaming' });
    const cancel = vi.fn(async () => undefined);
    const tracker: AgentConsoleTracker<Meta> = {
      history: signal([operation]),
      cancel,
      resume: vi.fn(),
    };
    const model = new AgentConsoleModel(tracker);

    await expect(model.cancelSelected()).resolves.toBe(true);
    expect(cancel).toHaveBeenCalledWith('op-1');
  });

  it('resumes an eligible operation and selects the new stream', () => {
    const operation = tracked('op-1', { canResume: true });
    const resumed = tracked('op-2', { phase: 'streaming' });
    const resume = vi.fn(() => resumed);
    const tracker: AgentConsoleTracker<Meta> = {
      history: signal([operation]),
      cancel: vi.fn(),
      resume,
    };
    const model = new AgentConsoleModel(tracker);

    expect(model.resumeSelected()).toBe(resumed);
    expect(resume).toHaveBeenCalledWith('op-1');
    expect(model.selected()).toBe(resumed);
  });

  it('renders tracker records with working Cancel and Re-roll controls', async () => {
    const operation = tracked('op-1', {
      phase: 'streaming',
      entries: [{ seq: 1, kind: 'message', text: 'Checking the hook.' }],
    });
    const cancel = vi.fn(async () => undefined);
    const tracker: AgentConsoleTracker<Meta> = {
      history: signal([operation]),
      cancel,
      resume: vi.fn(),
    };
    const model = new AgentConsoleModel(tracker);
    const application = await createApplication({
      providers: [provideZonelessChangeDetection()],
    });
    const host = document.createElement('app-agent-console');
    document.body.append(host);
    const component = createComponent(AgentConsole, {
      environmentInjector: application.injector,
      hostElement: host,
    });
    const modelNode = component.instance.model[ɵSIGNAL] as
      ɵInputSignalNode<AgentConsoleModel<unknown>, AgentConsoleModel<unknown>>;
    modelNode.applyValueToInputSignal(modelNode, model);
    application.attachView(component.hostView);
    component.changeDetectorRef.detectChanges();

    try {
      expect(host.textContent).toContain('Checking the hook.');
      const controls = Array.from(
        host.querySelectorAll<HTMLButtonElement>('.actions button'),
      );
      expect(controls.map(({ textContent }) => textContent?.trim())).toEqual([
        'Cancel',
        'Re-roll',
      ]);
      controls[0]!.click();
      await vi.waitFor(() => expect(cancel).toHaveBeenCalledWith('op-1'));
    } finally {
      application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      host.remove();
    }
  });
});

describe('console telemetry labels', () => {
  it('uses unavailable instead of estimating absent usage', () => {
    expect(formatTokens(null)).toBe('unavailable');
    expect(formatElapsed(null)).toBe('unavailable');
  });

  it('formats reported token usage and elapsed time', () => {
    expect(formatTokens(12_450)).toBe('12,450');
    expect(formatElapsed(65_400)).toBe('1m 5s');
  });
});
