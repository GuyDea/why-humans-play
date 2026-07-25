import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MODEL_PREFERENCE_STORAGE_KEY,
  ModelPreferenceService,
} from './model-preference';

describe('ModelPreferenceService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null when no preference has been stored', () => {
    const service = new ModelPreferenceService();
    expect(service.get('rewrite-selection')).toBeNull();
    expect(service.get('default')).toBeNull();
  });

  it('persists a choice and reads it back from a fresh instance', () => {
    const service = new ModelPreferenceService();
    service.set('default', { model: 'gpt-5.6-sol', effort: 'xhigh' });

    expect(service.get('default')).toEqual({
      model: 'gpt-5.6-sol',
      effort: 'xhigh',
    });
    const reloaded = new ModelPreferenceService();
    expect(reloaded.get('default')).toEqual({
      model: 'gpt-5.6-sol',
      effort: 'xhigh',
    });
  });

  it('falls back to the default key for an operation without its own choice', () => {
    const service = new ModelPreferenceService();
    service.set('default', { model: 'gpt-5.6-sol', effort: 'medium' });

    expect(service.get('review')).toEqual({
      model: 'gpt-5.6-sol',
      effort: 'medium',
    });
  });

  it('prefers a per-operation choice over the default key', () => {
    const service = new ModelPreferenceService();
    service.set('default', { model: 'gpt-5.6-sol', effort: 'medium' });
    service.set('review', { model: 'gpt-5.6-sol', effort: 'xhigh' });

    expect(service.get('review')).toEqual({
      model: 'gpt-5.6-sol',
      effort: 'xhigh',
    });
  });

  it('clears a stored choice when set with null', () => {
    const service = new ModelPreferenceService();
    service.set('default', { model: 'gpt-5.6-sol', effort: 'xhigh' });
    service.set('default', null);

    expect(service.get('default')).toBeNull();
  });

  it('tolerates corrupt stored JSON by returning null', () => {
    localStorage.setItem(MODEL_PREFERENCE_STORAGE_KEY, 'not json {');
    const service = new ModelPreferenceService();
    expect(service.get('default')).toBeNull();
  });

  it('ignores entries with no valid string fields', () => {
    localStorage.setItem(
      MODEL_PREFERENCE_STORAGE_KEY,
      JSON.stringify({ default: { model: 123 }, review: {} }),
    );
    const service = new ModelPreferenceService();
    expect(service.get('default')).toBeNull();
    expect(service.get('review')).toBeNull();
  });

  it('round-trips a model-only preference', () => {
    const service = new ModelPreferenceService();
    service.set('default', { model: 'gpt-5.6-sol' });

    expect(service.get('default')).toEqual({ model: 'gpt-5.6-sol' });
    expect(new ModelPreferenceService().get('default')).toEqual({
      model: 'gpt-5.6-sol',
    });
  });

  it('round-trips an effort-only preference', () => {
    const service = new ModelPreferenceService();
    service.set('default', { effort: 'medium' });

    expect(service.get('default')).toEqual({ effort: 'medium' });
    expect(new ModelPreferenceService().get('default')).toEqual({
      effort: 'medium',
    });
  });

  it('clears the entry when set with an empty choice', () => {
    const service = new ModelPreferenceService();
    service.set('default', { model: 'gpt-5.6-sol' });
    service.set('default', {});

    expect(service.get('default')).toBeNull();
  });
});
