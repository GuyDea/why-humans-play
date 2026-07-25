import { describe, expect, it, vi } from 'vitest';
import type {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
} from '@angular/router';
import {
  StudioRouteReuseStrategy,
  type OnReattach,
} from './studio-route-reuse-strategy';

function snapshot(
  path: string,
  keepAlive: boolean,
  draft: string | null = null,
): ActivatedRouteSnapshot {
  return {
    routeConfig: { path },
    data: keepAlive ? { keepAlive: true } : {},
    queryParamMap: { get: (k: string) => (k === 'draft' ? draft : null) },
  } as unknown as ActivatedRouteSnapshot;
}

function handleWith(instance: unknown): DetachedRouteHandle {
  return { componentRef: { instance } } as unknown as DetachedRouteHandle;
}

describe('StudioRouteReuseStrategy', () => {
  it('detaches keep-alive routes and not others', () => {
    const s = new StudioRouteReuseStrategy();
    expect(s.shouldDetach(snapshot('discover', true))).toBe(true);
    expect(s.shouldDetach(snapshot('welcome', false))).toBe(false);
  });

  it('stores and retrieves a handle by path', () => {
    const s = new StudioRouteReuseStrategy();
    const handle = handleWith({});
    s.store(snapshot('discover', true), handle);
    expect(s.shouldAttach(snapshot('discover', true))).toBe(true);
    expect(s.retrieve(snapshot('discover', true))).toBe(handle);
  });

  it('keys the Studio route by its draft query param', () => {
    const s = new StudioRouteReuseStrategy();
    const handleA = handleWith({});
    s.store(snapshot('', true, 'draft-A'), handleA);
    // A different draft on the same path must NOT retrieve draft-A's instance.
    expect(s.shouldAttach(snapshot('', true, 'draft-B'))).toBe(false);
    expect(s.retrieve(snapshot('', true, 'draft-B'))).toBeNull();
    expect(s.retrieve(snapshot('', true, 'draft-A'))).toBe(handleA);
  });

  it('clearing a stored handle removes it', () => {
    const s = new StudioRouteReuseStrategy();
    s.store(snapshot('topics', true), handleWith({}));
    s.store(snapshot('topics', true), null);
    expect(s.shouldAttach(snapshot('topics', true))).toBe(false);
  });

  it('calls onReattach on the reattached component instance', () => {
    const s = new StudioRouteReuseStrategy();
    const onReattach = vi.fn();
    const instance: OnReattach = { onReattach };
    s.store(snapshot('topics', true), handleWith(instance));
    s.retrieve(snapshot('topics', true));
    expect(onReattach).toHaveBeenCalledTimes(1);
  });

  it('reuses a route only when the routeConfig matches', () => {
    const s = new StudioRouteReuseStrategy();
    const a = snapshot('discover', true);
    const b = snapshot('topics', true);
    expect(s.shouldReuseRoute(a, a)).toBe(true);
    expect(s.shouldReuseRoute(a, b)).toBe(false);
  });
});
