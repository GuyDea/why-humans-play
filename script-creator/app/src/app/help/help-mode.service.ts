import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { HelpComponent, findHelpComponent } from './help-content';

@Injectable({ providedIn: 'root' })
export class HelpModeService {
  private readonly _active = signal(false);
  private readonly _selectedId = signal<string | null>(null);

  readonly active: Signal<boolean> = this._active.asReadonly();
  readonly selectedId: Signal<string | null> = this._selectedId.asReadonly();
  readonly selected: Signal<HelpComponent | null> = computed(() => {
    const id = this._selectedId();
    return id ? findHelpComponent(id) ?? null : null;
  });

  constructor() {
    inject(Router).events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this._selectedId.set(null));
  }

  activate(): void {
    this._active.set(true);
  }

  deactivate(): void {
    this._active.set(false);
    this._selectedId.set(null);
  }

  select(id: string): void {
    if (findHelpComponent(id)) this._selectedId.set(id);
  }

  clear(): void {
    this._selectedId.set(null);
  }
}
