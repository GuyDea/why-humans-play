import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
} from '@angular/core';
import {
  EDITORIAL_METHOD,
  HELP_GLOSSARY,
} from './help-content';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

@Component({
  selector: 'app-help-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      id="script-creator-help"
      class="help-drawer"
      aria-labelledby="help-title"
    >
        <header class="help-drawer-header">
          <div>
            <p>Script Creator reference</p>
            <h2 id="help-title">Help</h2>
            <p class="help-drawer-lede">
              Workbench glossary and the skills that own editorial method. To
              explain a specific region, use “Explain regions”.
            </p>
          </div>
          <button
            class="help-close"
            type="button"
            aria-label="Close help"
            (click)="requestClose()"
          >
            <span aria-hidden="true">×</span>
            <span class="help-close-label">Close help</span>
          </button>
        </header>

        <div class="help-drawer-scroll">
          <section class="help-glossary" aria-labelledby="glossary-heading">
            <div class="help-section-heading">
              <p>Workbench language</p>
              <h3 id="glossary-heading">Glossary</h3>
            </div>
            <dl>
              @for (entry of glossary; track entry.term) {
                <div>
                  <dt>{{ entry.term }}</dt>
                  <dd>{{ entry.definition }}</dd>
                </div>
              }
            </dl>
          </section>

          <section class="help-method" aria-labelledby="method-heading">
            <div class="help-section-heading">
              <p>Method owners</p>
              <h3 id="method-heading">Editorial method</h3>
            </div>
            <p>{{ editorialMethod.summary }}</p>
            <dl>
              @for (skill of editorialMethod.skills; track skill.name) {
                <div>
                  <dt>{{ skill.name }}</dt>
                  <dd>
                    <span>{{ skill.owns }}</span>
                    <code>{{ skill.path }}</code>
                  </dd>
                </div>
              }
            </dl>
          </section>
        </div>
    </aside>
  `,
})
export class HelpDrawer implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly glossary = HELP_GLOSSARY;
  protected readonly editorialMethod = EDITORIAL_METHOD;

  ngAfterViewInit(): void {
    queueMicrotask(() => this.focusableElements()[0]?.focus());
  }

  ngOnDestroy(): void {
    // No subscriptions to release; kept for symmetry with the shell lifecycle.
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
    }
  }

  protected requestClose(): void {
    this.host.nativeElement.dispatchEvent(new CustomEvent('helpClose', {
      bubbles: true,
    }));
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTOR,
      ),
    ).filter((element) => element.getAttribute('aria-hidden') !== 'true');
  }
}
