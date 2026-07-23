const SSE_ROUTE = /^\/api\/ops\/[^/]+\/events$/;

export function hasSseQueryNonce(
  method: string,
  requestUrl: string,
  expectedNonce: string,
): boolean {
  if (method !== 'GET') return false;

  const url = new URL(requestUrl, 'http://localhost');
  return SSE_ROUTE.test(url.pathname)
    && url.searchParams.get('nonce') === expectedNonce;
}
