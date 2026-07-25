import { Injectable } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type DetachedRouteHandle,
  type RouteReuseStrategy,
} from '@angular/router';

/**
 * Implemented by a routed page component that must re-sync server-derived
 * state when the keep-alive strategy reattaches it (its `ngOnInit` does not
 * run again on reattach). Optional: pages whose timers keep running while
 * detached, or whose state is purely local, do not implement it.
 */
export interface OnReattach {
  onReattach(): void;
}

function keepAlive(route: ActivatedRouteSnapshot): boolean {
  return route.data?.['keepAlive'] === true;
}

function storeKey(route: ActivatedRouteSnapshot): string | null {
  if (!keepAlive(route)) return null;
  const path = route.routeConfig?.path ?? '';
  const draft = route.queryParamMap.get('draft');
  return draft ? `${path}?draft=${draft}` : path;
}

function componentInstance(handle: DetachedRouteHandle): unknown {
  // DetachedRouteHandle is opaque public-API but is internally a
  // `{ componentRef: ComponentRef<unknown> }`. Read defensively.
  const ref = (handle as { componentRef?: { instance?: unknown } })
    .componentRef;
  return ref?.instance ?? null;
}

function notifyReattach(handle: DetachedRouteHandle): void {
  const instance = componentInstance(handle);
  const candidate = instance as Partial<OnReattach> | null;
  if (candidate && typeof candidate.onReattach === 'function') {
    candidate.onReattach();
  }
}

/**
 * Keeps routes flagged `data: { keepAlive: true }` alive across navigation:
 * their component subtree is detached and stored on leave, then reattached on
 * return instead of destroyed and rebuilt. The Studio route is keyed by its
 * `?draft=` param so opening a different draft yields a different instance.
 */
@Injectable()
export class StudioRouteReuseStrategy implements RouteReuseStrategy {
  private readonly storedHandles = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return keepAlive(route);
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const key = storeKey(route);
    if (!key) return;
    if (handle) this.storedHandles.set(key, handle);
    else this.storedHandles.delete(key);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = storeKey(route);
    return key !== null && this.storedHandles.has(key);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = storeKey(route);
    if (!key) return null;
    const handle = this.storedHandles.get(key) ?? null;
    if (handle) notifyReattach(handle);
    return handle;
  }

  shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot,
  ): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}
