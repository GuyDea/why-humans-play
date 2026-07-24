import { describe, expect, it } from 'vitest';
import {
  MODEL_OPTIONS,
  choiceForModelOption,
  modelOptionIndex,
  type ModelOption,
} from './model-options';

describe('choiceForModelOption', () => {
  it('returns null for the Default (no-field) option', () => {
    expect(choiceForModelOption({ label: 'Default' })).toBeNull();
    expect(choiceForModelOption(undefined)).toBeNull();
  });

  it('keeps both fields when the option sets both', () => {
    expect(
      choiceForModelOption({ label: 'Sol', model: 'gpt-5.6-sol', effort: 'xhigh' }),
    ).toEqual({ model: 'gpt-5.6-sol', effort: 'xhigh' });
  });

  it('keeps only the field a partial option sets', () => {
    expect(choiceForModelOption({ label: 'Model only', model: 'gpt-5.6-sol' }))
      .toEqual({ model: 'gpt-5.6-sol' });
    expect(choiceForModelOption({ label: 'Effort only', effort: 'medium' }))
      .toEqual({ effort: 'medium' });
  });
});

describe('modelOptionIndex', () => {
  const options: ModelOption[] = [
    { label: 'Default' },
    { label: 'Model only', model: 'gpt-5.6-sol' },
    { label: 'Effort only', effort: 'medium' },
    { label: 'Both', model: 'gpt-5.6-sol', effort: 'xhigh' },
  ];

  it('returns 0 for a null choice', () => {
    expect(modelOptionIndex(options, null)).toBe(0);
  });

  it('matches a partial choice on exactly the fields it sets', () => {
    expect(modelOptionIndex(options, { model: 'gpt-5.6-sol' })).toBe(1);
    expect(modelOptionIndex(options, { effort: 'medium' })).toBe(2);
    expect(modelOptionIndex(options, { model: 'gpt-5.6-sol', effort: 'xhigh' }))
      .toBe(3);
  });

  it('falls back to 0 when nothing matches', () => {
    expect(modelOptionIndex(options, { model: 'unknown-model' })).toBe(0);
  });

  it('round-trips every shipped option through choice and index', () => {
    MODEL_OPTIONS.forEach((option, index) => {
      expect(modelOptionIndex(MODEL_OPTIONS, choiceForModelOption(option)))
        .toBe(index);
    });
  });
});
