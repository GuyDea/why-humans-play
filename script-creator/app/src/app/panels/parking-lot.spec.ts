import {
  EditorState,
  corePlugins,
  pickActive,
  schema,
} from '@whp/script-creator-editor-core';
import { describe, expect, it } from 'vitest';
import { parkingLotEntries } from './parking-lot';

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
});
