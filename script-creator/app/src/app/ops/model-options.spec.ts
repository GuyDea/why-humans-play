import { describe, expect, it } from 'vitest';
import {
  MODEL_OPTIONS,
  choiceForModelOption,
  modelOptionIndex,
  type ModelOption,
} from './model-options';

describe('MODEL_OPTIONS', () => {
  it('keeps the Default entry first with no override', () => {
    expect(MODEL_OPTIONS[0]).toEqual({ label: 'Default' });
  });

  it('exposes the Claude Opus and Fable models with server- and CLI-accepted effort', () => {
    const claudeEntries = MODEL_OPTIONS.filter(
      (option) => option.model?.startsWith('claude'),
    );
    expect(claudeEntries).toEqual([
      { label: 'Opus 4.8', model: 'claude-opus-4-8', effort: 'high' },
      { label: 'Fable 5', model: 'claude-fable-5', effort: 'high' },
    ]);
    // high/xhigh are accepted by both the server validator and the Claude CLI.
    for (const entry of claudeEntries) {
      expect(['high', 'xhigh']).toContain(entry.effort);
    }
  });

  it('retains the existing Sol codex entries', () => {
    expect(MODEL_OPTIONS).toEqual(expect.arrayContaining([
      { label: 'Sol · xhigh', model: 'gpt-5.6-sol', effort: 'xhigh' },
      { label: 'Sol · medium', model: 'gpt-5.6-sol', effort: 'medium' },
    ]));
  });
});

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
