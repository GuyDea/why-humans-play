export interface NonceLocation {
  hash: string;
  pathname: string;
  search: string;
}

export const NONCE_STORAGE_KEY = 'whp-script-creator.nonce';

let memoryNonce: string | null = null;

export function extractNonce(location: NonceLocation): string | null {
  const fragment = location.hash.startsWith('#')
    ? location.hash.slice(1)
    : location.hash;
  const fragmentNonce = new URLSearchParams(fragment).get('nonce');

  if (fragmentNonce !== null) {
    memoryNonce = fragmentNonce;
    storeNonce(fragmentNonce);
    history.replaceState(
      history.state,
      '',
      `${location.pathname}${location.search}`,
    );
    return fragmentNonce;
  }

  if (memoryNonce) return memoryNonce;
  memoryNonce = storedNonce();
  return memoryNonce;
}

function storeNonce(nonce: string): void {
  try {
    sessionStorage.setItem(NONCE_STORAGE_KEY, nonce);
  } catch {
    // In-memory authentication still works when storage is unavailable.
  }
}

function storedNonce(): string | null {
  try {
    return sessionStorage.getItem(NONCE_STORAGE_KEY);
  } catch {
    return null;
  }
}
