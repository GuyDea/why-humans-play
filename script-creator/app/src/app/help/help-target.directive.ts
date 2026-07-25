import {
  Directive,
  ElementRef,
  HostAttributeToken,
  OnDestroy,
  Renderer2,
  effect,
  inject,
} from '@angular/core';
import { findHelpComponent } from './help-content';
import { HelpModeService } from './help-mode.service';

/**
 * Marks a region as documented in Help mode. Applied as a static attribute
 * (`appHelpTarget="scope.name"`) so the id is greppable for the coverage test
 * and readable under both AOT and the JIT test pipeline via HostAttributeToken.
 * While Help mode is active the host gains a dashed outline and a corner "?" cue;
 * clicking the cue selects the region and never triggers the region's controls.
 */
@Directive({
  selector: '[appHelpTarget]',
  standalone: true,
})
export class HelpTargetDirective implements OnDestroy {
  private readonly id =
    inject(new HostAttributeToken('appHelpTarget'), { optional: true }) ?? '';
  private readonly help = inject(HelpModeService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private cue: HTMLButtonElement | null = null;
  private unlistenClick: (() => void) | null = null;

  constructor() {
    effect(() => {
      const active = this.help.active();
      const selected = this.help.selectedId() === this.id;
      if (active && this.id) this.render(selected);
      else this.teardown();
    });
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  private render(selected: boolean): void {
    const el = this.host.nativeElement;
    this.renderer.addClass(el, 'help-target');
    if (selected) this.renderer.addClass(el, 'help-target--selected');
    else this.renderer.removeClass(el, 'help-target--selected');
    if (this.cue) return;

    const title = findHelpComponent(this.id)?.title ?? this.id;
    const cue = this.renderer.createElement('button') as HTMLButtonElement;
    this.renderer.setAttribute(cue, 'type', 'button');
    this.renderer.setAttribute(cue, 'aria-label', `Explain ${title}`);
    this.renderer.setAttribute(cue, 'data-help-cue', this.id);
    this.renderer.addClass(cue, 'help-target-cue');
    this.renderer.appendChild(cue, this.renderer.createText('?'));
    this.unlistenClick = this.renderer.listen(cue, 'click', (event: Event) => {
      event.stopPropagation();
      event.preventDefault();
      this.help.select(this.id);
    });
    this.renderer.appendChild(el, cue);
    this.cue = cue;
  }

  private teardown(): void {
    const el = this.host.nativeElement;
    this.renderer.removeClass(el, 'help-target');
    this.renderer.removeClass(el, 'help-target--selected');
    this.unlistenClick?.();
    this.unlistenClick = null;
    if (this.cue) {
      this.renderer.removeChild(el, this.cue);
      this.cue = null;
    }
  }
}
