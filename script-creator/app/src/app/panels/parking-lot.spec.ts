import '@angular/compiler';
import {
  EditorState,
  corePlugins,
  pickActive,
  schema,
} from '@whp/script-creator-editor-core';
import {
  createComponent,
  provideZonelessChangeDetection,
  signal,
  ɵSIGNAL,
  type ɵInputSignalNode,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import {
  ParkingLot,
  ParkingLotModel,
  parkingLotEntries,
} from './parking-lot';

describe('parkingLotEntries', () => {
  it('reads losing variants from editor-core state', () => {
    const variant = schema.node('inlineVariantSet', {
      variantId: 'variant-1',
      activeIndex: 0,
      settled: false,
      options: [
        { label: 'A', text: 'Keep this line.' },
        { label: 'B', text: 'Park this line.' },
      ],
    });
    const doc = schema.node('doc', {
      format: 'narration',
      preamble: '',
    }, [
      schema.node('beat', {
        beatId: 'beat_aaaaaaaaaa',
        title: 'Opening',
        timeTargetMs: 30_000,
      }, [
        schema.node('paragraph', null, [variant]),
      ]),
    ]);
    let state = EditorState.create({ doc, plugins: corePlugins() });

    expect(pickActive(
      state,
      (transaction) => {
        state = state.apply(transaction);
      },
      'variant-1',
    )).toBe(true);

    expect(parkingLotEntries(state)).toEqual([
      {
        variantId: 'variant-1',
        label: 'B',
        text: 'Park this line.',
      },
    ]);
  });

  it('lists an unsettled set and settles its selected option through panel controls', async () => {
    const variant = schema.node('inlineVariantSet', {
      variantId: 'variant-unsettled',
      activeIndex: 0,
      settled: false,
      options: [
        { label: 'A', text: 'First line.' },
        { label: 'B', text: 'Chosen line.' },
        { label: 'C', text: 'Third line.' },
      ],
    });
    const doc = schema.node('doc', {
      format: 'narration',
      preamble: '',
    }, [
      schema.node('beat', {
        beatId: 'beat_bbbbbbbbbb',
        title: 'Opening',
        timeTargetMs: 30_000,
      }, [
        schema.node('paragraph', null, [variant]),
      ]),
    ]);
    const state = signal(
      EditorState.create({ doc, plugins: corePlugins() }),
    );
    const model = new ParkingLotModel(
      state.asReadonly(),
      (transaction) => state.set(state().apply(transaction)),
    );

    expect(model.unsettled()).toEqual([{
      variantId: 'variant-unsettled',
      activeIndex: 0,
      activeLabel: 'A',
      options: [
        { index: 0, label: 'A' },
        { index: 1, label: 'B' },
        { index: 2, label: 'C' },
      ],
    }]);

    const application = await createApplication({
      providers: [provideZonelessChangeDetection()],
    });
    const host = document.createElement('app-parking-lot');
    document.body.append(host);
    const component = createComponent(ParkingLot, {
      environmentInjector: application.injector,
      hostElement: host,
    });
    const modelNode = component.instance.model[ɵSIGNAL] as
      ɵInputSignalNode<ParkingLotModel, ParkingLotModel>;
    modelNode.applyValueToInputSignal(modelNode, model);
    application.attachView(component.hostView);
    component.changeDetectorRef.detectChanges();

    const unsettled = host.querySelector(
      '[data-testid="unsettled-variant"]',
    );
    expect(unsettled?.textContent).toContain('variant-unsettled');
    expect(unsettled?.textContent).toContain('Active: A');
    expect(unsettled?.textContent).toContain('B');

    findButton(unsettled, 'B').click();
    component.changeDetectorRef.detectChanges();
    expect(model.unsettled()[0]?.activeLabel).toBe('B');
    findButton(unsettled, 'Pick active').click();
    component.changeDetectorRef.detectChanges();
    expect(model.unsettled()).toEqual([]);
    expect(model.entries()).toEqual([
      {
        variantId: 'variant-unsettled',
        label: 'A',
        text: 'First line.',
      },
      {
        variantId: 'variant-unsettled',
        label: 'C',
        text: 'Third line.',
      },
    ]);
    expect(state().doc.textContent).toBe('Chosen line.');

    application.detachView(component.hostView);
    component.destroy();
    application.destroy();
    host.remove();
  });
});

function findButton(
  element: Element | null,
  label: string,
): HTMLButtonElement {
  const button = Array.from(
    element?.querySelectorAll<HTMLButtonElement>('button') ?? [],
  ).find((candidate) =>
    candidate.textContent?.replace(/\s+/gu, ' ').trim().startsWith(label));
  if (!button) throw new Error(`button ${label} was not rendered`);
  return button;
}
