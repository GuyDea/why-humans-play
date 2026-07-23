import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('extractNonce', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.resetModules();
  });

  it('uses a fragment nonce instead of stale session storage', async () => {
    window.sessionStorage.setItem(
      'whp-script-creator.nonce',
      'stale123',
    );
    window.history.replaceState(
      { navigation: 'state' },
      '',
      '/studio?draft=draft-1#nonce=fresh456',
    );
    const { extractNonce, NONCE_STORAGE_KEY } = await import('./nonce');

    expect(extractNonce(window.location)).toBe('fresh456');
    expect(window.sessionStorage.getItem(NONCE_STORAGE_KEY)).toBe('fresh456');
  });

  it('scrubs the URL when it consumes a fragment nonce', async () => {
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

  it('falls back to sessionStorage only when no fragment nonce exists', async () => {
    window.sessionStorage.setItem(
      'whp-script-creator.nonce',
      'persisted123',
    );
    window.history.replaceState(null, '', '/studio?draft=draft-1');
    const { extractNonce } = await import('./nonce');

    expect(extractNonce(window.location)).toBe('persisted123');
    expect(window.location.href).toContain('/studio?draft=draft-1');
  });

  it('does not reuse storage when an empty nonce fragment is present', async () => {
    window.sessionStorage.setItem(
      'whp-script-creator.nonce',
      'stale123',
    );
    window.history.replaceState(null, '', '/studio#nonce=');
    const { extractNonce, NONCE_STORAGE_KEY } = await import('./nonce');

    expect(extractNonce(window.location)).toBe('');
    expect(window.sessionStorage.getItem(NONCE_STORAGE_KEY)).toBe('');
    expect(window.location.hash).toBe('');
  });

  it('returns null when neither the fragment nor sessionStorage has a nonce', async () => {
    const { extractNonce } = await import('./nonce');

    expect(extractNonce(window.location)).toBeNull();
  });
});
