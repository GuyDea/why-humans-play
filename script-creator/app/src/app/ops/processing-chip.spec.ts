import '@angular/compiler';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type ɵInputSignalNode,
  ɵSIGNAL,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { OperationName } from '../api/client';
import { ActiveOperationsService, type ActiveOp } from './active-operations.service';
import { ProcessingChip } from './processing-chip';

class StubService {
  readonly active = signal<readonly ActiveOp[]>([]);
  readonly activeOperations = this.active;
  ensureStarted(): void {
    /* no-op in tests */
  }
}

async function setup(
  active: readonly ActiveOp[],
  operations?: readonly string[],
) {
  const stub = new StubService();
  stub.active.set(active);
  const application = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ActiveOperationsService, useValue: stub },
    ],
  });

  const host = document.createElement('sc-processing-chip');
  document.body.append(host);

  const component = createComponent(ProcessingChip, {
    environmentInjector: application.injector,
    hostElement: host,
  });

  if (operations) {
    const node = (
      component.instance.operations as unknown as {
        [ɵSIGNAL]: ɵInputSignalNode<
          readonly OperationName[] | null,
          readonly OperationName[] | null
        >;
      }
    )[ɵSIGNAL];
    node.applyValueToInputSignal(node, operations as readonly OperationName[]);
  }

  application.attachView(component.hostView);
  component.changeDetectorRef.detectChanges();

  return { host, component, application };
}

const runningIdeate: ActiveOp = {
  id: 'op-9',
  name: 'ideate',
  state: 'running',
  stalled: false,
};

describe('ProcessingChip', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is empty when nothing matches', async () => {
    const { host } = await setup([]);
    expect(host.textContent?.trim()).toBe('');
  });

  it('shows "In Processing" and links to the Console trace', async () => {
    const { host } = await setup([runningIdeate]);
    const link = host.querySelector('a');
    expect(host.textContent).toContain('In Processing');
    expect(link?.getAttribute('href')).toContain('/console');
    expect(link?.getAttribute('href')).toContain('op=op-9');
  });

  it('honours the operations filter', async () => {
    const { host } = await setup([runningIdeate], ['review']);
    expect(host.textContent?.trim()).toBe('');
  });
});
