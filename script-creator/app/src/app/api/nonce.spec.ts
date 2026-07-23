import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('extractNonce', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.resetModules();
  });

  it('stores a fragment nonce and scrubs it from the visible URL', async () => {
    window.history.replaceState(
      { navigation: 'state' },
      '',
      '/studio?draft=draft-1#nonce=abc123',
    );
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const { extractNonce } = await import('./nonce');

    expect(extractNonce(window.location)).toBe('abc123');
    expect(window.location.pathname).toBe('/studio');
    expect(window.location.search).toBe('?draft=draft-1');
    expect(window.location.hash).toBe('');
    expect(replaceState).toHaveBeenCalledOnce();
    expect(replaceState.mock.calls[0]?.[2]).toBe('/studio?draft=draft-1');
  });

  it('falls back to sessionStorage after an app reload', async () => {
    window.history.replaceState(null, '', '/studio#nonce=persisted123');
    const firstLoad = await import('./nonce');
    expect(firstLoad.extractNonce(window.location)).toBe('persisted123');

    vi.resetModules();
    const reloaded = await import('./nonce');

    expect(reloaded.extractNonce(window.location)).toBe('persisted123');
  });

  it('returns null when neither the fragment nor sessionStorage has a nonce', async () => {
    const { extractNonce } = await import('./nonce');

    expect(extractNonce(window.location)).toBeNull();
  });
});
