import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';
import { HelpModeService } from './help-mode.service';

/**
 * The Help-mode explanation popover. While Help mode is active and a region's
 * "?" cue is selected, this renders a small callout anchored to that region so
 * the explanation appears in place — no full-screen panel that could cover the
 * cues. It is independent of the reference drawer.
 */
@Component({
  selector: 'app-help-popover',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (component(); as component) {
      <div
        class="help-popover"
        role="dialog"
        aria-labelledby="help-popover-title"
        data-testid="help-popover"
      >
        <header>
          <div>
            <p>Help</p>
            <h3 id="help-popover-title">{{ component.title }}</h3>
          </div>
          <button
            type="button"
            class="help-popover-close"
            aria-label="Close explanation"
            (click)="close()"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <p class="help-popover-summary">{{ component.summary }}</p>
        @if (component.controls.length > 0) {
          <ul class="help-popover-controls">
            @for (line of component.controls; track line) {
              <li>{{ line }}</li>
            }
          </ul>
        }
        @if (component.unlockedBy) {
          <p class="help-popover-gate">
            <span>Unlocked by</span> {{ component.unlockedBy }}
          </p>
        }
      </div>
    }
  `,
})
export class HelpPopover {
  private readonly help = inject(HelpModeService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly component = this.help.selected;

  constructor() {
    // Reposition against the selected region's cue whenever the selection
    // changes and the popover has rendered.
    effect(() => {
      const id = this.help.selectedId();
      if (!id) return;
      queueMicrotask(() => this.position(id));
    });
  }

  protected close(): void {
    this.help.clear();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.help.selectedId()) this.help.clear();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.help.selectedId()) return;
    const target = event.target as Element | null;
    if (!target) return;
    // Clicks inside the popover, or on any "?" cue (which switches regions),
    // must not dismiss it.
    if (target.closest('.help-popover')) return;
    if (target.closest('[data-help-cue]')) return;
    this.help.clear();
  }

  private position(id: string): void {
    const popover = this.host.nativeElement
      .querySelector<HTMLElement>('.help-popover');
    const cue = document.querySelector<HTMLElement>(
      `[data-help-cue="${CSS.escape(id)}"]`,
    );
    if (!popover || !cue) return;
    const cueRect = cue.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const margin = 8;
    // Prefer below-and-left-aligned to the cue; clamp inside the viewport.
    let left = cueRect.right - width;
    left = Math.max(
      margin,
      Math.min(left, globalThis.innerWidth - width - margin),
    );
    let top = cueRect.bottom + margin;
    if (top + height > globalThis.innerHeight - margin) {
      const above = cueRect.top - height - margin;
      top = above >= margin ? above : Math.max(margin, top);
    }
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  }
}
